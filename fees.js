// routes/fees.js
const express = require('express');
const router  = express.Router();
const db      = require('./config/db');
const { verifyAdmin } = require('./middleware/auth');

// GET all fee records
router.get('/', async (req, res) => {
  try {
    const { month, mode, memberId } = req.query;
    let sql = `SELECT id, member_id AS memberId, member_name AS memberName, plan, shift,
                      amount, paid_amount AS paidAmount, due_amount AS dueAmount,
                      DATE_FORMAT(date,'%Y-%m-%d') AS date, month, mode, status, notes
               FROM fee_records WHERE 1=1`;
    const params = [];
    if (month)    { sql += ' AND month = ?';     params.push(month); }
    if (mode)     { sql += ' AND mode = ?';      params.push(mode); }
    if (memberId) { sql += ' AND member_id = ?'; params.push(memberId); }
    sql += ' ORDER BY created_at DESC';
    const [rows] = await db.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST collect fee
router.post('/', async (req, res) => {
  try {
    const { memberId, memberName, plan, shift, amount, paidAmount, dueAmount,
            date, month, mode, status, notes } = req.body;

    if (!memberId || !amount) return res.status(400).json({ success: false, message: 'memberId and amount are required' });

    const id = 'REC-' + Date.now();
    await db.query(
      `INSERT INTO fee_records (id, member_id, member_name, plan, shift, amount,
        paid_amount, due_amount, date, month, mode, status, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, memberId, memberName, plan, shift, amount,
       paidAmount || amount, dueAmount || 0,
       date, month, mode || 'Cash', status || 'Paid', notes || '']
    );

    // Update member fee_status
    await db.query('UPDATE members SET fee_status=? WHERE id=?',
      [status === 'Partial' ? 'Due' : 'Paid', memberId]);

    res.json({ success: true, message: '💰 Fee collected!', id });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// DELETE fee record (admin only)
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM fee_records WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Fee record deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET fee structure
router.get('/structure/all', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT plan_name AS plan, shift, amount FROM fee_structure');
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// PUT update fee structure
router.put('/structure/update', async (req, res) => {
  try {
    const { plan, shift, amount } = req.body;
    await db.query(
      `INSERT INTO fee_structure (plan_name, shift, amount)
       VALUES (?,?,?)
       ON DUPLICATE KEY UPDATE amount=?`,
      [plan, shift, amount, amount]
    );
    res.json({ success: true, message: '✅ Fee structure updated' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET dues list
router.get('/dues/list', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, name, phone, shift, plan, seat,
              DATE_FORMAT(valid_till,'%Y-%m-%d') AS validTill, fee_status AS feeStatus
       FROM members WHERE fee_status IN ('Due','Expired') ORDER BY valid_till ASC`
    );
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET monthly summary for P&L
router.get('/summary/monthly', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT month, SUM(amount) AS total, COUNT(*) AS count
       FROM fee_records GROUP BY month ORDER BY MIN(date) DESC LIMIT 12`
    );
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
