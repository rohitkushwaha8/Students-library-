// routes/salary.js
const express = require('express');
const router  = express.Router();
const db      = require('./config/db');
const { verifyAdmin } = require('./middleware/auth');

// GET all employees
router.get('/employees', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, name, role, phone, salary,
              DATE_FORMAT(join_date,'%Y-%m-%d') AS join_date, addr
       FROM employees ORDER BY created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST add employee
router.post('/employees', async (req, res) => {
  try {
    const { id, name, role, phone, salary, joinDate, addr } = req.body;
    const empId = id || ('EMP-' + Date.now());
    await db.query(
      'INSERT INTO employees (id, name, role, phone, salary, join_date, addr) VALUES (?,?,?,?,?,?,?)',
      [empId, name, role || 'Staff', phone || null, salary || 0, joinDate || null, addr || null]
    );
    res.json({ success: true, id: empId, message: '✅ Employee added' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// DELETE employee
router.delete('/employees/:id', verifyAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM employees WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Employee removed' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET salary records
router.get('/records', async (req, res) => {
  try {
    const { month } = req.query;
    let sql = `SELECT id, emp_id AS empId, emp_name AS empName, month, amount,
                      DATE_FORMAT(date,'%Y-%m-%d') AS date, mode, notes
               FROM salary_records WHERE 1=1`;
    const params = [];
    if (month) { sql += ' AND month = ?'; params.push(month); }
    sql += ' ORDER BY created_at DESC';
    const [rows] = await db.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST pay salary
router.post('/pay', async (req, res) => {
  try {
    const { empId, empName, month, amount, date, mode, notes } = req.body;
    const id = 'SAL-' + Date.now();
    await db.query(
      'INSERT INTO salary_records (id, emp_id, emp_name, month, amount, date, mode, notes) VALUES (?,?,?,?,?,?,?,?)',
      [id, empId, empName, month, amount, date, mode || 'Cash', notes || '']
    );
    res.json({ success: true, id, message: '💰 Salary paid!' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
