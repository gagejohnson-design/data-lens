const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
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
        sample_rows: raw.slice(0, 10),
      }],
      source_type: 'json',
    };
  }
  throw new Error('Unsupported file type');
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

module.exports = router;
