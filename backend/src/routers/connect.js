const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const { Pool: PgPool } = require('pg');
const mysql = require('mysql2/promise');
const { requireAuth } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { parseCSV, parseExcel } = require('../adapters/csv');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (['csv', 'json', 'xlsx', 'xls'].includes(ext)) return cb(null, true);
    cb(Object.assign(new Error('Only CSV, JSON, and Excel files are supported'), { status: 400 }));
  },
});

// AES-256-CBC encryption helpers for connection strings
const ALGORITHM = 'aes-256-cbc';

function getEncKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error('ENCRYPTION_KEY is not set in environment');
  return Buffer.from(key, 'hex');
}

function encryptConnectionString(plaintext) {
  const key = getEncKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return { enc: encrypted.toString('hex'), iv: iv.toString('hex') };
}

function decryptConnectionString(enc, ivHex) {
  const key = getEncKey();
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  const decrypted = Buffer.concat([decipher.update(Buffer.from(enc, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}

function parseFile(file) {
  const ext = file.originalname.split('.').pop().toLowerCase();
  if (ext === 'csv') {
    return { tables: parseCSV(file.buffer, file.originalname), source_type: 'csv' };
  }
  if (['xlsx', 'xls'].includes(ext)) {
    return { tables: parseExcel(file.buffer), source_type: 'csv' };
  }
  if (ext === 'json') {
    const parsed = JSON.parse(file.buffer.toString());
    const raw = Array.isArray(parsed)
      ? parsed
      : Object.values(parsed).find((v) => Array.isArray(v)) ?? [parsed];
    if (!Array.isArray(raw) || raw.length === 0)
      throw new Error('JSON must contain an array of objects');
    const columns = Object.keys(raw[0]).map((key) => ({
      name: key,
      type: typeof raw[0][key] === 'number' ? 'number' : typeof raw[0][key] === 'boolean' ? 'boolean' : 'string',
      nullable: raw.some((row) => row[key] == null),
      null_percent: +((raw.filter((row) => row[key] == null).length / raw.length) * 100).toFixed(1),
    }));
    return {
      tables: [{
        name: file.originalname.replace(/\.json$/i, ''),
        row_count: raw.length,
        duplicate_count: 0,
        columns,
        sample_rows: raw.slice(0, 500),
      }],
      source_type: 'json',
    };
  }
  throw new Error('Unsupported file type');
}

async function fetchPostgresSchema(connectionString) {
  const pool = new PgPool({ connectionString, connectionTimeoutMillis: 5000, max: 1 });
  try {
    const { rows: colRows } = await pool.query(`
      SELECT
        t.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.ordinal_position
      FROM information_schema.tables t
      JOIN information_schema.columns c
        ON c.table_name = t.table_name AND c.table_schema = t.table_schema
      WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name, c.ordinal_position
    `);

    const { rows: countRows } = await pool.query(`
      SELECT schemaname, tablename,
             n_live_tup AS estimate
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
    `);

    const countMap = Object.fromEntries(countRows.map(r => [r.tablename, Number(r.estimate)]));
    const tableMap = {};

    for (const row of colRows) {
      if (!tableMap[row.table_name]) {
        tableMap[row.table_name] = { name: row.table_name, columns: [], row_count: countMap[row.table_name] ?? 0, duplicate_count: 0 };
      }
      tableMap[row.table_name].columns.push({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES',
        null_percent: 0,
      });
    }

    return Object.values(tableMap);
  } finally {
    await pool.end();
  }
}

async function fetchMysqlSchema(connectionString) {
  // Expect format: mysql://user:pass@host:port/dbname
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
    const dbName = url.pathname.slice(1);
    const [colRows] = await conn.execute(`
      SELECT table_name, column_name, data_type, is_nullable, ordinal_position
      FROM information_schema.columns
      WHERE table_schema = ?
      ORDER BY table_name, ordinal_position
    `, [dbName]);

    const [countRows] = await conn.execute(`
      SELECT table_name, table_rows
      FROM information_schema.tables
      WHERE table_schema = ?
    `, [dbName]);

    const countMap = Object.fromEntries(countRows.map(r => [r.table_name, Number(r.table_rows)]));
    const tableMap = {};

    for (const row of colRows) {
      if (!tableMap[row.table_name]) {
        tableMap[row.table_name] = { name: row.table_name, columns: [], row_count: countMap[row.table_name] ?? 0, duplicate_count: 0 };
      }
      tableMap[row.table_name].columns.push({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES',
        null_percent: 0,
      });
    }

    return Object.values(tableMap);
  } finally {
    await conn.end();
  }
}

// POST /api/connect/upload — accepts one or multiple files
router.post('/upload', requireAuth, uploadLimiter, upload.array('files', 10), async (req, res, next) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) return res.status(400).json({ error: 'No files provided' });

    const allTables = [];
    const types = new Set();

    for (const file of files) {
      try {
        const { tables, source_type } = parseFile(file);
        allTables.push(...tables);
        types.add(source_type);
      } catch (e) {
        return res.status(400).json({ error: `Error parsing "${file.originalname}": ${e.message}` });
      }
    }

    const source_type = types.size === 1 ? [...types][0] : 'mixed';
    res.json({ tables: allTables, relationships: [], source_type });
  } catch (err) { next(err); }
});

// POST /api/connect/db — connect to a live database and pull schema
router.post('/db', requireAuth, uploadLimiter, async (req, res, next) => {
  try {
    const { connectionString, name } = req.body;
    if (!connectionString || typeof connectionString !== 'string') {
      return res.status(400).json({ error: 'connectionString is required' });
    }

    let source_type;
    let tables;
    const lc = connectionString.toLowerCase();
    if (lc.startsWith('postgres://') || lc.startsWith('postgresql://')) {
      source_type = 'postgres';
      tables = await fetchPostgresSchema(connectionString);
    } else if (lc.startsWith('mysql://')) {
      source_type = 'mysql';
      tables = await fetchMysqlSchema(connectionString);
    } else {
      return res.status(400).json({ error: 'Unsupported database type. Use a postgres:// or mysql:// connection string.' });
    }

    if (tables.length === 0) {
      return res.status(400).json({ error: 'No tables found in the database. Make sure the user has SELECT access.' });
    }

    // Encrypt the connection string before returning so the client can pass it back for saving
    const { enc, iv } = encryptConnectionString(connectionString);

    res.json({
      tables,
      relationships: [],
      source_type,
      connection: { enc, iv, name: name || connectionString.replace(/:[^@]+@/, ':***@') },
    });
  } catch (err) {
    const msg = err.message || '';
    if (msg.includes('ECONNREFUSED') || msg.includes('ETIMEDOUT') || msg.includes('ENOTFOUND') || msg.includes('timeout')) {
      return res.status(400).json({ error: 'Could not reach the database. Check the host, port, and network access.' });
    }
    if (msg.includes('password authentication') || msg.includes('Access denied')) {
      return res.status(400).json({ error: 'Authentication failed. Check your username and password.' });
    }
    if (msg.includes('does not exist') || msg.includes("Unknown database")) {
      return res.status(400).json({ error: 'Database not found. Check the database name in your connection string.' });
    }
    next(err);
  }
});

// POST /api/connect/snapshot — import a previously exported snapshot JSON
router.post('/snapshot', requireAuth, async (req, res, next) => {
  try {
    const { snapshot } = req.body;
    if (!snapshot || !snapshot._hash) {
      return res.status(400).json({ error: 'Invalid snapshot file' });
    }

    const { _hash, ...data } = snapshot;
    const computed = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    if (computed !== _hash) {
      return res.status(400).json({ error: 'Snapshot integrity check failed — file may be corrupted or tampered with' });
    }

    res.json(data);
  } catch (err) { next(err); }
});

module.exports = { router, decryptConnectionString };
