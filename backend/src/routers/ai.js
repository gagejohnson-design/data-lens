const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');

const router = express.Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

    const systemPrompt = `You are a SQL expert. Given a schema derived from uploaded CSV, JSON, or database files, write a single SQL query that answers the user's question.
Rules:
- Return ONLY the SQL query, no explanation, no markdown fences, no backticks
- Use standard SQL syntax
- Use proper JOINs based on any relationships provided
- Be concise and correct

Schema:
${schemaContext}${relationships ? `\n\nRelationships:\n${relationships}` : ''}`;

    let sql;
    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: question }],
      });
      sql = response.content[0]?.text?.trim() || '';
    } catch (aiErr) {
      const status = aiErr.status || aiErr.statusCode;
      if (status === 401) {
        return res.status(500).json({ error: 'AI service is not configured. Contact the administrator.' });
      }
      if (status === 429) {
        return res.status(429).json({
          error: 'AI quota exceeded — please try again shortly.',
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
