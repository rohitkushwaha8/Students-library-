// routes/notices.js
const express = require('express');
const router  = express.Router();
const db      = require('./config/db');
const { verifyAdmin } = require('./middleware/auth');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, title, type, body, DATE_FORMAT(date,'%Y-%m-%d') AS date
       FROM notices ORDER BY created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { title, type, body, date } = req.body;
    const [result] = await db.query(
      'INSERT INTO notices (title, type, body, date) VALUES (?,?,?,?)',
      [title, type || 'info', body, date || new Date().toISOString().slice(0, 10)]
    );
    res.json({ success: true, id: result.insertId, message: '📢 Notice posted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM notices WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Notice deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
