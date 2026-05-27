const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const MAX_QUERIES = 50;

// GET /api/saved-queries
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, question, sql, snapshot_ids, created_at
       FROM saved_queries
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [req.userId, MAX_QUERIES]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/saved-queries
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { question, sql, snapshotIds } = req.body;
    if (!question || typeof question !== 'string' || !sql || typeof sql !== 'string') {
      return res.status(400).json({ error: 'question and sql are required' });
    }

    // Dedup: replace any existing entry for the same question
    await pool.query(
      'DELETE FROM saved_queries WHERE user_id = $1 AND question = $2',
      [req.userId, question]
    );

    // Enforce per-user limit by evicting oldest
    const { rows: [{ count }] } = await pool.query(
      'SELECT COUNT(*) FROM saved_queries WHERE user_id = $1',
      [req.userId]
    );
    if (parseInt(count, 10) >= MAX_QUERIES) {
      await pool.query(
        `DELETE FROM saved_queries
         WHERE id = (SELECT id FROM saved_queries WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1)`,
        [req.userId]
      );
    }

    const { rows: [entry] } = await pool.query(
      `INSERT INTO saved_queries (user_id, question, sql, snapshot_ids)
       VALUES ($1, $2, $3, $4)
       RETURNING id, question, sql, snapshot_ids, created_at`,
      [req.userId, question, sql, snapshotIds || []]
    );
    res.status(201).json(entry);
  } catch (err) { next(err); }
});

// DELETE /api/saved-queries/:id
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows: [entry] } = await pool.query(
      'DELETE FROM saved_queries WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (!entry) return res.status(404).json({ error: 'Query not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

// DELETE /api/saved-queries — clear all for this user
router.delete('/', requireAuth, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM saved_queries WHERE user_id = $1', [req.userId]);
    res.json({ message: 'All queries cleared' });
  } catch (err) { next(err); }
});

module.exports = router;
