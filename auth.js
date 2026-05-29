// middleware/auth.js
require('dotenv')config();

function verifyAdmin(req, res, next) {
  const pwd = req.headers['x-admin-password'] || req.body?.adminPassword;
  if (!pwd || pwd !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: '❌ Wrong admin password' });
  }
  next();
}

module.exports = { verifyAdmin };
