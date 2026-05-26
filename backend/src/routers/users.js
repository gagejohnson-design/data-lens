const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/me
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { rows: [user] } = await pool.query(
      'SELECT id, name, email, created_at FROM users WHERE id = $1',
      [req.userId]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) { next(err); }
});

// PUT /api/users/me
router.put('/me', requireAuth, async (req, res, next) => {
  try {
    const { name, email } = req.body;
    const { rows: [user] } = await pool.query(
      `UPDATE users
       SET name = COALESCE($1, name), email = COALESCE($2, email), updated_at = NOW()
       WHERE id = $3
       RETURNING id, name, email`,
      [name, email, req.userId]
    );
    res.json(user);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already in use' });
    next(err);
  }
});

// PUT /api/users/me/password
router.put('/me/password', requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword are required' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const { rows: [user] } = await pool.query('SELECT * FROM users WHERE id = $1', [req.userId]);
    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hash, req.userId]
    );
    res.json({ message: 'Password updated' });
  } catch (err) { next(err); }
});

// GET /api/users/me/ai-key — returns whether a key is stored (never the key itself)
router.get('/me/ai-key', requireAuth, async (req, res, next) => {
  try {
    const { rows: [user] } = await pool.query(
      'SELECT gemini_api_key IS NOT NULL AS has_key FROM users WHERE id = $1',
      [req.userId]
    );
    res.json({ hasKey: user?.has_key || false });
  } catch (err) { next(err); }
});

// PUT /api/users/me/ai-key — save or clear the Gemini API key
router.put('/me/ai-key', requireAuth, async (req, res, next) => {
  try {
    const { key } = req.body;
    if (key !== null && key !== undefined && (typeof key !== 'string' || key.trim().length === 0)) {
      return res.status(400).json({ error: 'key must be a non-empty string, or null to clear' });
    }
    const value = (key && key.trim()) || null;
    await pool.query(
      'UPDATE users SET gemini_api_key = $1, updated_at = NOW() WHERE id = $2',
      [value, req.userId]
    );
    res.json({ hasKey: value !== null });
  } catch (err) { next(err); }
});

// DELETE /api/users/me
router.delete('/me', requireAuth, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.userId]);
    res.clearCookie('refreshToken');
    res.json({ message: 'Account deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
