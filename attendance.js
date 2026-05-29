// routes/attendance.js
const express = require('express');
const router  = express.Router();
const db      = require('./config/db');

// GET attendance by date
router.get('/', async (req, res) => {
  try {
    const { date, memberId } = req.query;
    let sql = `SELECT id, DATE_FORMAT(date,'%Y-%m-%d') AS date, member_id AS memberId,
                      member_name AS memberName, shift, seat,
                      TIME_FORMAT(check_in,'%H:%i') AS \`in\`,
                      TIME_FORMAT(check_out,'%H:%i') AS \`out\`, present
               FROM attendance WHERE 1=1`;
    const params = [];
    if (date)     { sql += ' AND date = ?';       params.push(date); }
    if (memberId) { sql += ' AND member_id = ?';  params.push(memberId); }
    sql += ' ORDER BY date DESC, check_in ASC';
    const [rows] = await db.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST check-in
router.post('/checkin', async (req, res) => {
  try {
    const { memberId, memberName, shift, seat, date } = req.body;
    const today = date || new Date().toISOString().slice(0, 10);
    const now = new Date().toTimeString().slice(0, 5);

    await db.query(
      `INSERT INTO attendance (date, member_id, member_name, shift, seat, check_in, present)
       VALUES (?,?,?,?,?,?,1)
       ON DUPLICATE KEY UPDATE check_in=?, present=1`,
      [today, memberId, memberName, shift, seat || null, now, now]
    );
    res.json({ success: true, message: '✅ Checked in', time: now });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST check-out
router.post('/checkout', async (req, res) => {
  try {
    const { memberId, date } = req.body;
    const today = date || new Date().toISOString().slice(0, 10);
    const now = new Date().toTimeString().slice(0, 5);

    await db.query(
      `UPDATE attendance SET check_out=? WHERE member_id=? AND date=?`,
      [now, memberId, today]
    );
    res.json({ success: true, message: '✅ Checked out', time: now });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// DELETE attendance record
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM attendance WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Record deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
