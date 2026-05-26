const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// POST /api/ai/query
// Accepts { question, snapshotId } or { question, snapshotIds: [id, ...] } for multi-source sessions
router.post('/query', requireAuth, aiLimiter, async (req, res, next) => {
  try {
    const { question, snapshotId, snapshotIds } = req.body;

    if (!question || typeof question !== 'string' || question.length > 500) {
      return res.status(400).json({ error: 'question is required and must be 500 characters or fewer' });
    }

    const ids = snapshotIds?.length ? snapshotIds : (snapshotId ? [snapshotId] : []);
    if (ids.length === 0) {
      return res.status(400).json({ error: 'snapshotId or snapshotIds is required' });
    }

    const { rows: [user] } = await pool.query(
      'SELECT gemini_api_key FROM users WHERE id = $1',
      [req.userId]
    );
    if (!user?.gemini_api_key) {
      return res.status(400).json({
        error: 'No AI API key configured. Add your Gemini API key in Account Settings.',
        missingKey: true,
      });
    }

    const { rows: snapshots } = await pool.query(
      'SELECT snapshot_data FROM snapshots WHERE id = ANY($1) AND user_id = $2',
      [ids, req.userId]
    );
    if (snapshots.length === 0) return res.status(404).json({ error: 'Snapshot not found' });

    const allTables = snapshots.flatMap(s => s.snapshot_data.tables || []);
    const schemaContext = allTables.map(t => {
      const cols = (t.columns || []).map(c =>
        `  ${c.name} ${c.type}${c.nullable ? '' : ' NOT NULL'}`
      ).join(',\n');
      return `-- ${t.name} (${t.row_count} rows)\nCREATE TABLE ${t.name} (\n${cols}\n);`;
    }).join('\n\n');

    const allRelationships = snapshots.flatMap(s => s.snapshot_data.relationships || []);
    const relationships = allRelationships.map(r =>
      `-- ${r.from_table}.${r.from_column} → ${r.to_table}.${r.to_column}`
    ).join('\n');

    const genAI = new GoogleGenerativeAI(user.gemini_api_key);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are a SQL expert. Given a schema derived from uploaded CSV or JSON files, write a single SQL query that answers the user's question.
Rules:
- Return ONLY the SQL query, no explanation, no markdown fences, no backticks
- Use standard SQL syntax
- Use proper JOINs based on any relationships provided
- Be concise and correct

Schema:
${schemaContext}

${relationships ? `Relationships:\n${relationships}\n` : ''}
Question: ${question}`;

    let sql;
    try {
      const result = await model.generateContent(prompt);
      sql = result.response.text().trim();
    } catch (aiErr) {
      const msg = aiErr.message || '';
      if (msg.includes('API_KEY_INVALID') || msg.includes('INVALID_ARGUMENT') || aiErr.status === 400) {
        return res.status(400).json({ error: 'Invalid Gemini API key — check it in Account Settings.', invalidKey: true });
      }
      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota') || aiErr.status === 429) {
        return res.status(429).json({
          error: 'Gemini quota exceeded — free tier resets daily. Visit aistudio.google.com to upgrade or try again later.',
          quotaExceeded: true,
        });
      }
      throw aiErr;
    }

    sql = sql.replace(/^```sql\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    res.json({ sql, question });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
