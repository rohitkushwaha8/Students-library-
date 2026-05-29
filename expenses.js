// routes/expenses.js
const express = require('express');
const router  = express.Router();
const db      = require('./config/db');
const { verifyAdmin } = require('./middleware/auth');

router.get('/', async (req, res) => {
  try {
    const { month, cat } = req.query;
    let sql = `SELECT id, cat, description, amount,
                      DATE_FORMAT(date,'%Y-%m-%d') AS date, mode, notes
               FROM expenses WHERE 1=1`;
    const params = [];
    if (month) { sql += ` AND DATE_FORMAT(date,'%M %Y') = ?`; params.push(month); }
    if (cat)   { sql += ' AND cat = ?'; params.push(cat); }
    sql += ' ORDER BY date DESC';
    const [rows] = await db.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { cat, description, desc, amount, date, mode, notes } = req.body;
    const id = 'EXP-' + Date.now();
    await db.query(
      'INSERT INTO expenses (id, cat, description, amount, date, mode, notes) VALUES (?,?,?,?,?,?,?)',
      [id, cat || 'other', description || desc || '', amount, date, mode || 'Cash', notes || '']
    );
    res.json({ success: true, id, message: '✅ Expense added' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM expenses WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Expense deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Monthly expense summary
router.get('/summary/monthly', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT DATE_FORMAT(date,'%M %Y') AS month,
              SUM(amount) AS total, cat, COUNT(*) AS count
       FROM expenses GROUP BY month, cat ORDER BY MIN(date) DESC LIMIT 24`
    );
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
