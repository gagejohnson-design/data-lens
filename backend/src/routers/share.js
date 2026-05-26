const express = require('express');
const pool = require('../db');
const router = express.Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/share/:token
router.get('/:token', async (req, res, next) => {
  try {
    if (!UUID_RE.test(req.params.token)) {
      return res.status(404).json({ error: 'Shared snapshot not found or link has been revoked' });
    }
    const { rows: [snapshot] } = await pool.query(
      'SELECT id, name, source_type, snapshot_data, created_at FROM snapshots WHERE share_token = $1',
      [req.params.token]
    );
    if (!snapshot) return res.status(404).json({ error: 'Shared snapshot not found or link has been revoked' });
    res.json(snapshot);
  } catch (err) { next(err); }
});

module.exports = router;
