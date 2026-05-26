const express = require('express');
const crypto = require('crypto');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const MAX_SNAPSHOTS = 10;

function hashSnapshot(data) {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

// GET /api/snapshots
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, description, source_type, hash, created_at, updated_at
       FROM snapshots WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.userId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/snapshots/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows: [snapshot] } = await pool.query(
      'SELECT * FROM snapshots WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (!snapshot) return res.status(404).json({ error: 'Snapshot not found' });

    await pool.query(
      'INSERT INTO audit_log (user_id, snapshot_id, action) VALUES ($1, $2, $3)',
      [req.userId, snapshot.id, 'loaded_snapshot']
    );

    res.json(snapshot);
  } catch (err) { next(err); }
});

// GET /api/snapshots/:id/export
router.get('/:id/export', requireAuth, async (req, res, next) => {
  try {
    const { rows: [snapshot] } = await pool.query(
      'SELECT * FROM snapshots WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (!snapshot) return res.status(404).json({ error: 'Snapshot not found' });

    await pool.query(
      'INSERT INTO audit_log (user_id, snapshot_id, action) VALUES ($1, $2, $3)',
      [req.userId, snapshot.id, 'exported']
    );

    res.setHeader('Content-Disposition', `attachment; filename="${snapshot.name}.json"`);
    res.json({ ...snapshot.snapshot_data, _hash: snapshot.hash });
  } catch (err) { next(err); }
});

// POST /api/snapshots
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { name, description, source_type, snapshot_data } = req.body;
    if (!name || !source_type || !snapshot_data) {
      return res.status(400).json({ error: 'name, source_type, and snapshot_data are required' });
    }
    if (JSON.stringify(snapshot_data).length > 5 * 1024 * 1024) {
      return res.status(413).json({ error: 'Snapshot data exceeds the 5 MB limit' });
    }

    const { rows: [{ count }] } = await pool.query(
      'SELECT COUNT(*) FROM snapshots WHERE user_id = $1',
      [req.userId]
    );

    if (parseInt(count, 10) >= MAX_SNAPSHOTS) {
      const { rows: [oldest] } = await pool.query(
        'SELECT id, name FROM snapshots WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1',
        [req.userId]
      );
      return res.status(409).json({ error: 'Snapshot limit reached', oldest });
    }

    const hash = hashSnapshot(snapshot_data);
    const { rows: [snapshot] } = await pool.query(
      `INSERT INTO snapshots (user_id, name, description, source_type, snapshot_data, hash)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.userId, name, description || null, source_type, JSON.stringify(snapshot_data), hash]
    );

    await pool.query(
      'INSERT INTO audit_log (user_id, snapshot_id, action) VALUES ($1, $2, $3)',
      [req.userId, snapshot.id, 'connected']
    );

    res.status(201).json(snapshot);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A snapshot with that name already exists' });
    next(err);
  }
});

// PUT /api/snapshots/:id
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const { rows: [snapshot] } = await pool.query(
      `UPDATE snapshots SET name = $1, description = COALESCE($2, description), updated_at = NOW()
       WHERE id = $3 AND user_id = $4
       RETURNING id, name, description, updated_at`,
      [name, description !== undefined ? (description || null) : undefined, req.params.id, req.userId]
    );
    if (!snapshot) return res.status(404).json({ error: 'Snapshot not found' });
    res.json(snapshot);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A snapshot with that name already exists' });
    next(err);
  }
});

// PATCH /api/snapshots/:id/data — update snapshot_data (e.g. to persist table notes)
router.patch('/:id/data', requireAuth, async (req, res, next) => {
  try {
    const { snapshot_data } = req.body;
    if (!snapshot_data) return res.status(400).json({ error: 'snapshot_data is required' });

    const hash = hashSnapshot(snapshot_data);
    const { rows: [snapshot] } = await pool.query(
      `UPDATE snapshots SET snapshot_data = $1, hash = $2, updated_at = NOW()
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [JSON.stringify(snapshot_data), hash, req.params.id, req.userId]
    );
    if (!snapshot) return res.status(404).json({ error: 'Snapshot not found' });
    res.json(snapshot);
  } catch (err) { next(err); }
});

// DELETE /api/snapshots/:id
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows: [snapshot] } = await pool.query(
      'DELETE FROM snapshots WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (!snapshot) return res.status(404).json({ error: 'Snapshot not found' });

    await pool.query(
      'INSERT INTO audit_log (user_id, snapshot_id, action) VALUES ($1, $2, $3)',
      [req.userId, null, 'deleted_snapshot']
    );

    res.json({ message: 'Snapshot deleted' });
  } catch (err) { next(err); }
});

// GET /api/snapshots/:id/diff/:otherId
router.get('/:id/diff/:otherId', requireAuth, async (req, res, next) => {
  try {
    const [{ rows: [a] }, { rows: [b] }] = await Promise.all([
      pool.query('SELECT * FROM snapshots WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]),
      pool.query('SELECT * FROM snapshots WHERE id = $1 AND user_id = $2', [req.params.otherId, req.userId]),
    ]);
    if (!a || !b) return res.status(404).json({ error: 'One or both snapshots not found' });

    const tablesA = Object.fromEntries((a.snapshot_data.tables || []).map(t => [t.name, t]));
    const tablesB = Object.fromEntries((b.snapshot_data.tables || []).map(t => [t.name, t]));
    const allNames = new Set([...Object.keys(tablesA), ...Object.keys(tablesB)]);

    const diff = [];
    for (const name of allNames) {
      const inA = tablesA[name];
      const inB = tablesB[name];
      if (!inA) { diff.push({ table: name, status: 'added' }); continue; }
      if (!inB) { diff.push({ table: name, status: 'removed' }); continue; }

      const colsA = Object.fromEntries((inA.columns || []).map(c => [c.name, c]));
      const colsB = Object.fromEntries((inB.columns || []).map(c => [c.name, c]));
      const allCols = new Set([...Object.keys(colsA), ...Object.keys(colsB)]);
      const colChanges = [];

      for (const col of allCols) {
        if (!colsA[col]) colChanges.push({ column: col, status: 'added' });
        else if (!colsB[col]) colChanges.push({ column: col, status: 'removed' });
        else {
          const nullDiff = (colsB[col].null_percent || 0) - (colsA[col].null_percent || 0);
          if (Math.abs(nullDiff) > 1) colChanges.push({ column: col, status: 'changed', null_percent_delta: +nullDiff.toFixed(1) });
        }
      }

      const rowDiff = (inB.row_count || 0) - (inA.row_count || 0);
      if (colChanges.length || rowDiff !== 0) {
        diff.push({ table: name, status: 'changed', row_count_delta: rowDiff, column_changes: colChanges });
      } else {
        diff.push({ table: name, status: 'unchanged' });
      }
    }

    res.json({
      snapshot_a: { id: a.id, name: a.name, created_at: a.created_at },
      snapshot_b: { id: b.id, name: b.name, created_at: b.created_at },
      diff,
    });
  } catch (err) { next(err); }
});

// POST /api/snapshots/:id/share — generate or return existing share token
router.post('/:id/share', requireAuth, async (req, res, next) => {
  try {
    const { rows: [snapshot] } = await pool.query(
      `UPDATE snapshots SET share_token = COALESCE(share_token, gen_random_uuid())
       WHERE id = $1 AND user_id = $2 RETURNING id, share_token`,
      [req.params.id, req.userId]
    );
    if (!snapshot) return res.status(404).json({ error: 'Snapshot not found' });
    res.json({ share_token: snapshot.share_token });
  } catch (err) { next(err); }
});

// DELETE /api/snapshots/:id/share — revoke share token
router.delete('/:id/share', requireAuth, async (req, res, next) => {
  try {
    await pool.query(
      'UPDATE snapshots SET share_token = NULL WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    res.json({ message: 'Share link revoked' });
  } catch (err) { next(err); }
});

module.exports = router;
