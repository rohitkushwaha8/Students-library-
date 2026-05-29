// settings.js — A.R. Library Settings Route
const express = require('express');
const router  = express.Router();
const db      = require('./config/db');
const { verifyAdmin } = require('./middleware/auth');

// GET all settings
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT `key`, `value` FROM settings');
    const settings = {};
    rows.forEach(r => {
      try { settings[r.key] = JSON.parse(r.value); }
      catch(e) { settings[r.key] = r.value; }
    });
    res.json({ success: true, data: settings });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// PUT update a setting (admin only)
router.put('/:key', verifyAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    const val = typeof value === 'object' ? JSON.stringify(value) : String(value);
    await db.query(
      'INSERT INTO settings (`key`, `value`) VALUES (?,?) ON DUPLICATE KEY UPDATE `value`=?',
      [key, val, val]
    );
    res.json({ success: true, message: 'Setting updated' });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// PUT bulk update settings (admin only)
router.put('/', verifyAdmin, async (req, res) => {
  try {
    const settings = req.body; // { key: value, ... }
    for (const [key, value] of Object.entries(settings)) {
      const val = typeof value === 'object' ? JSON.stringify(value) : String(value);
      await db.query(
        'INSERT INTO settings (`key`, `value`) VALUES (?,?) ON DUPLICATE KEY UPDATE `value`=?',
        [key, val, val]
      );
    }
    res.json({ success: true, message: 'Settings saved' });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
