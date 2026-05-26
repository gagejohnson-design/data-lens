const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const { requireAuth } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { parseCSV, parseExcel } = require('../adapters/csv');

const router = express.Router();

const ALLOWED_MIMES = new Set([
  'text/csv',
  'text/plain',
  'application/json',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (['csv', 'json', 'xlsx', 'xls'].includes(ext)) return cb(null, true);
    cb(Object.assign(new Error('Only CSV, JSON, and Excel files are supported'), { status: 400 }));
  },
});

// POST /api/connect/upload
router.post('/upload', requireAuth, uploadLimiter, upload.single('file'), async (req, res, next) => {
  try {
    const { file } = req;
    if (!file) return res.status(400).json({ error: 'No file provided' });

    const ext = file.originalname.split('.').pop().toLowerCase();
    let tables;
    let source_type;

    if (ext === 'csv') {
      tables = parseCSV(file.buffer, file.originalname);
      source_type = 'csv';
    } else if (['xlsx', 'xls'].includes(ext)) {
      tables = parseExcel(file.buffer);
      source_type = 'csv';
    } else if (ext === 'json') {
      try {
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
        tables = [{
          name: file.originalname.replace(/\.json$/i, ''),
          row_count: raw.length,
          duplicate_count: 0,
          columns,
          sample_rows: raw.slice(0, 10),
        }];
        source_type = 'json';
      } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON: ' + e.message });
      }
    } else {
      return res.status(400).json({ error: 'Only CSV, Excel (.xlsx/.xls), and JSON files are supported' });
    }

    res.json({ tables, relationships: [], source_type });
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
