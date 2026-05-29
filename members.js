// routes/members.js
const express = require('express');
const router  = express.Router();
const db      = require('./config/db');
const { verifyAdmin } = require('./middleware/auth');

// GET all members
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, name, phone, guardian, gphone, cls, shift, plan, seat, addr,
              aadhar, aadhar_img, photo, color, fee_status AS feeStatus,
              DATE_FORMAT(join_date,'%Y-%m-%d') AS \`from\`,
              DATE_FORMAT(valid_till,'%Y-%m-%d') AS \`to\`
       FROM members ORDER BY created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET single member
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, name, phone, guardian, gphone, cls, shift, plan, seat, addr,
              aadhar, aadhar_img, photo, color, fee_status AS feeStatus,
              DATE_FORMAT(join_date,'%Y-%m-%d') AS \`from\`,
              DATE_FORMAT(valid_till,'%Y-%m-%d') AS \`to\`
       FROM members WHERE id = ?`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Member not found' });
    res.json({ success: true, data: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST create member
router.post('/', async (req, res) => {
  try {
    const { id, name, phone, guardian, gphone, cls, shift, plan, seat, addr,
            aadhar, aadharImg, photo, color, feeStatus, from: joinDate, to: validTill } = req.body;

    if (!id || !name) return res.status(400).json({ success: false, message: 'ID and Name are required' });

    // Check duplicate ID
    const [exist] = await db.query('SELECT id FROM members WHERE id = ?', [id]);
    if (exist.length) return res.status(409).json({ success: false, message: `Member ID "${id}" already exists` });

    // Check seat conflict
    if (seat) {
      const [seatCheck] = await db.query('SELECT id, name FROM members WHERE seat = ?', [seat]);
      if (seatCheck.length) {
        return res.status(409).json({ success: false, message: `Seat ${seat} is already taken by ${seatCheck[0].name}` });
      }
    }

    await db.query(
      `INSERT INTO members (id, name, phone, guardian, gphone, cls, shift, plan, seat, addr,
        aadhar, aadhar_img, photo, color, fee_status, join_date, valid_till)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, name, phone||null, guardian||null, gphone||null, cls||null, shift||null,
       plan||null, seat||null, addr||null, aadhar||null, aadharImg||null,
       photo||null, color||'#3b82f6', feeStatus||'Due', joinDate||null, validTill||null]
    );

    res.json({ success: true, message: '✅ Member registered successfully', id });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// PUT update member
router.put('/:id', async (req, res) => {
  try {
    const { name, phone, guardian, gphone, cls, shift, plan, seat, addr,
            aadhar, aadharImg, photo, color, feeStatus, from: joinDate, to: validTill } = req.body;

    // Check seat conflict (excluding self)
    if (seat) {
      const [seatCheck] = await db.query(
        'SELECT id, name FROM members WHERE seat = ? AND id != ?', [seat, req.params.id]
      );
      if (seatCheck.length) {
        return res.status(409).json({ success: false, message: `Seat ${seat} is taken by ${seatCheck[0].name}` });
      }
    }

    await db.query(
      `UPDATE members SET name=?, phone=?, guardian=?, gphone=?, cls=?, shift=?, plan=?,
        seat=?, addr=?, aadhar=?, aadhar_img=?, photo=?, color=?, fee_status=?,
        join_date=?, valid_till=? WHERE id=?`,
      [name, phone||null, guardian||null, gphone||null, cls||null, shift||null, plan||null,
       seat||null, addr||null, aadhar||null, aadharImg||null, photo||null,
       color||'#3b82f6', feeStatus||'Due', joinDate||null, validTill||null, req.params.id]
    );

    res.json({ success: true, message: '✅ Member updated' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// PATCH update fee status only
router.patch('/:id/status', async (req, res) => {
  try {
    const { feeStatus } = req.body;
    await db.query('UPDATE members SET fee_status=? WHERE id=?', [feeStatus, req.params.id]);
    res.json({ success: true, message: 'Status updated' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// DELETE member (admin only)
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM members WHERE id=?', [req.params.id]);
    res.json({ success: true, message: '🗑️ Member deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET seats map
router.get('/seats/map', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT seat, id, name, shift, plan, fee_status AS feeStatus FROM members WHERE seat IS NOT NULL`
    );
    const seats = Array.from({ length: 79 }, (_, i) => {
      const m = rows.find(r => r.seat === i + 1);
      return { no: i + 1, occupied: !!m, member: m || null };
    });
    res.json({ success: true, data: seats });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Auto-expire members
router.post('/auto-expire', async (req, res) => {
  try {
    const [result] = await db.query(
      `UPDATE members SET fee_status='Expired'
       WHERE valid_till < CURDATE() AND fee_status != 'Expired'`
    );
    res.json({ success: true, updated: result.affectedRows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
