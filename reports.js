// routes/reports.js
const express = require('express');
const router  = express.Router();
const db      = require('./config/db');

// GET dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const thisMonth = new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' });

    const [[memberStats]] = await db.query(`
      SELECT
        COUNT(*) AS total,
        SUM(fee_status = 'Paid') AS paid,
        SUM(fee_status = 'Due') AS due,
        SUM(fee_status = 'Expired') AS expired
      FROM members
    `);

    const [[attendanceToday]] = await db.query(
      `SELECT COUNT(*) AS present FROM attendance WHERE date = ? AND present = 1`, [today]
    );

    const [[monthRevenue]] = await db.query(
      `SELECT COALESCE(SUM(amount),0) AS total FROM fee_records WHERE month = ?`, [thisMonth]
    );

    const [[monthExpenses]] = await db.query(
      `SELECT COALESCE(SUM(amount),0) AS total FROM expenses
       WHERE DATE_FORMAT(date,'%M %Y') = ?`, [thisMonth]
    );

    const [[monthSalary]] = await db.query(
      `SELECT COALESCE(SUM(amount),0) AS total FROM salary_records WHERE month = ?`, [thisMonth]
    );

    const [[seatsOccupied]] = await db.query(
      `SELECT COUNT(*) AS occupied FROM members WHERE seat IS NOT NULL`
    );

    res.json({
      success: true,
      data: {
        members: memberStats,
        attendanceToday: attendanceToday.present,
        monthRevenue: Number(monthRevenue.total),
        monthExpenses: Number(monthExpenses.total) + Number(monthSalary.total),
        netProfit: Number(monthRevenue.total) - Number(monthExpenses.total) - Number(monthSalary.total),
        seatsOccupied: seatsOccupied.occupied,
        totalSeats: 79
      }
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET P&L monthly report
router.get('/pl', async (req, res) => {
  try {
    const { month } = req.query;
    let feeWhere = '', expWhere = '', salWhere = '';
    const p1 = [], p2 = [], p3 = [];

    if (month) {
      feeWhere = ' WHERE month = ?'; p1.push(month);
      expWhere = " WHERE DATE_FORMAT(date,'%M %Y') = ?"; p2.push(month);
      salWhere = ' WHERE month = ?'; p3.push(month);
    }

    const [feeRows]  = await db.query(`SELECT month, SUM(amount) AS total FROM fee_records${feeWhere} GROUP BY month ORDER BY MIN(date) DESC`, p1);
    const [expRows]  = await db.query(`SELECT DATE_FORMAT(date,'%M %Y') AS month, cat, SUM(amount) AS total FROM expenses${expWhere} GROUP BY month, cat ORDER BY MIN(date) DESC`, p2);
    const [salRows]  = await db.query(`SELECT month, SUM(amount) AS total FROM salary_records${salWhere} GROUP BY month ORDER BY MIN(date) DESC`, p3);

    res.json({ success: true, data: { fees: feeRows, expenses: expRows, salaries: salRows } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET backup — all data
router.get('/backup', async (req, res) => {
  try {
    const [members]       = await db.query('SELECT * FROM members');
    const [feeRecords]    = await db.query('SELECT * FROM fee_records');
    const [attendance]    = await db.query('SELECT * FROM attendance');
    const [notices]       = await db.query('SELECT * FROM notices');
    const [expenses]      = await db.query('SELECT * FROM expenses');
    const [employees]     = await db.query('SELECT * FROM employees');
    const [salaryRecords] = await db.query('SELECT * FROM salary_records');
    const [feeStructure]  = await db.query('SELECT * FROM fee_structure');

    res.json({
      success: true,
      data: {
        _meta: { exportedAt: new Date().toISOString(), version: '2.6' },
        members, feeRecords, attendance, notices,
        expenses, employees, salaryRecords, feeStructure
      }
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST restore backup
router.post('/restore', async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { members, feeRecords, attendance, notices, expenses, employees, salaryRecords, feeStructure } = req.body;
    await conn.beginTransaction();

    // Clear tables
    await conn.query('SET FOREIGN_KEY_CHECKS=0');
    for (const t of ['salary_records','attendance','fee_records','notices','expenses','employees','fee_structure','members']) {
      await conn.query(`DELETE FROM ${t}`);
    }
    await conn.query('SET FOREIGN_KEY_CHECKS=1');

    // Re-insert
    if (members?.length)       for (const m of members) await conn.query('INSERT IGNORE INTO members SET ?', [m]);
    if (feeRecords?.length)    for (const r of feeRecords) await conn.query('INSERT IGNORE INTO fee_records SET ?', [r]);
    if (attendance?.length)    for (const a of attendance) await conn.query('INSERT IGNORE INTO attendance SET ?', [a]);
    if (notices?.length)       for (const n of notices) await conn.query('INSERT IGNORE INTO notices SET ?', [n]);
    if (expenses?.length)      for (const e of expenses) await conn.query('INSERT IGNORE INTO expenses SET ?', [e]);
    if (employees?.length)     for (const e of employees) await conn.query('INSERT IGNORE INTO employees SET ?', [e]);
    if (salaryRecords?.length) for (const s of salaryRecords) await conn.query('INSERT IGNORE INTO salary_records SET ?', [s]);
    if (feeStructure?.length)  for (const f of feeStructure) await conn.query('INSERT IGNORE INTO fee_structure SET ?', [f]);

    await conn.commit();
    res.json({ success: true, message: '✅ Backup restored successfully!' });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ success: false, message: e.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
