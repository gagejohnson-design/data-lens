const express = require('express');
const { Pool: PgPool } = require('pg');
const mysql = require('mysql2/promise');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { decryptConnectionString } = require('./connect');

const router = express.Router();

async function runPostgres(connectionString, sql) {
  const client = new PgPool({ connectionString, connectionTimeoutMillis: 5000, max: 1 });
  try {
    const result = await client.query(sql);
    return { rows: result.rows, fields: result.fields.map(f => f.name) };
  } finally {
    await client.end();
  }
}

async function runMysql(connectionString, sql) {
  const url = new URL(connectionString);
  const conn = await mysql.createConnection({
    host: url.hostname,
    port: url.port ? parseInt(url.port) : 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    connectTimeout: 5000,
  });
  try {
    const [rows, fields] = await conn.execute(sql);
    // Non-SELECT queries (INSERT/UPDATE/DELETE) return an OkPacket, not a row array
    const rowArray = Array.isArray(rows) ? rows : [];
    const fieldNames = Array.isArray(fields) ? fields.map(f => f.name) : [];
    return { rows: rowArray, fields: fieldNames };
  } finally {
    await conn.end();
  }
}

// POST /api/query/run
router.post('/run', requireAuth, uploadLimiter, async (req, res, next) => {
  try {
    const { sql, snapshotId } = req.body;
    if (!sql || typeof sql !== 'string' || sql.trim().length === 0) {
      return res.status(400).json({ error: 'sql is required' });
    }
    if (!snapshotId) {
      return res.status(400).json({ error: 'snapshotId is required' });
    }

    const { rows: [snap] } = await pool.query(
      'SELECT source_type, connection_string_enc, connection_iv FROM snapshots WHERE id = $1 AND user_id = $2',
      [snapshotId, req.userId]
    );
    if (!snap) return res.status(404).json({ error: 'Snapshot not found' });

    if (!snap.connection_string_enc) {
      return res.status(400).json({
        error: 'This snapshot is file-based. Use the Query tab\'s built-in runner for file-based data.',
        fileBased: true,
      });
    }

    const connectionString = decryptConnectionString(snap.connection_string_enc, snap.connection_iv);

    let result;
    const lc = connectionString.toLowerCase();
    if (lc.startsWith('postgres://') || lc.startsWith('postgresql://')) {
      result = await runPostgres(connectionString, sql);
    } else if (lc.startsWith('mysql://')) {
      result = await runMysql(connectionString, sql);
    } else {
      return res.status(400).json({ error: 'Unsupported database type' });
    }

    res.json({ rows: result.rows, fields: result.fields, rowCount: result.rows.length });
  } catch (err) {
    const msg = err.message || '';
    if (msg.includes('syntax error') || msg.includes('You have an error in your SQL')) {
      return res.status(400).json({ error: `SQL error: ${msg}` });
    }
    if (msg.includes('permission denied') || msg.includes('Access denied')) {
      return res.status(403).json({ error: 'Permission denied — the database user lacks SELECT access.' });
    }
    next(err);
  }
});

module.exports = router;
