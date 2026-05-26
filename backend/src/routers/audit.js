const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/audit
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT al.id, al.action, al.created_at, s.name AS snapshot_name
       FROM audit_log al
       LEFT JOIN snapshots s ON al.snapshot_id = s.id
       WHERE al.user_id = $1
       ORDER BY al.created_at DESC
       LIMIT 100`,
      [req.userId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
