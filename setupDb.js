// config/setupDb.js
// Run once: node config/setupDb.js
require('dotenv').config();
const mysql = require('mysql2/promise');

const SQL = `
-- ══════════════════════════════════════════════
--   A.R. Library — Database Schema
-- ══════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS ar_library
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE ar_library;

-- ── Fee Structure ─────────────────────────────
CREATE TABLE IF NOT EXISTS fee_structure (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  plan_name   VARCHAR(100) NOT NULL,
  shift       VARCHAR(50)  NOT NULL,
  amount      DECIMAL(10,2) NOT NULL DEFAULT 0,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_plan_shift (plan_name, shift)
);

-- ── Members ───────────────────────────────────
CREATE TABLE IF NOT EXISTS members (
  id          VARCHAR(20)  PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  phone       VARCHAR(15),
  guardian    VARCHAR(100),
  gphone      VARCHAR(15),
  cls         VARCHAR(50),
  shift       VARCHAR(60),
  plan        VARCHAR(80),
  seat        INT,
  addr        TEXT,
  aadhar      VARCHAR(20),
  aadhar_img  TEXT,
  photo       TEXT,
  color       VARCHAR(20)  DEFAULT '#3b82f6',
  fee_status  ENUM('Paid','Due','Expired') DEFAULT 'Due',
  join_date   DATE,
  valid_till  DATE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Fee Records ───────────────────────────────
CREATE TABLE IF NOT EXISTS fee_records (
  id           VARCHAR(20)  PRIMARY KEY,
  member_id    VARCHAR(20),
  member_name  VARCHAR(100),
  plan         VARCHAR(80),
  shift        VARCHAR(60),
  amount       DECIMAL(10,2) NOT NULL,
  paid_amount  DECIMAL(10,2),
  due_amount   DECIMAL(10,2) DEFAULT 0,
  date         DATE,
  month        VARCHAR(30),
  mode         VARCHAR(20)  DEFAULT 'Cash',
  status       ENUM('Paid','Partial','Due') DEFAULT 'Paid',
  notes        TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL
);

-- ── Attendance ────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  date        DATE NOT NULL,
  member_id   VARCHAR(20),
  member_name VARCHAR(100),
  shift       VARCHAR(60),
  seat        INT,
  check_in    TIME,
  check_out   TIME,
  present     TINYINT(1) DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_att (date, member_id),
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

-- ── Notices ───────────────────────────────────
CREATE TABLE IF NOT EXISTS notices (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  type        ENUM('info','warn','success','danger') DEFAULT 'info',
  body        TEXT,
  date        DATE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Expenses ──────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id          VARCHAR(20)  PRIMARY KEY,
  cat         ENUM('rent','utility','maintenance','salary','other') DEFAULT 'other',
  description TEXT,
  amount      DECIMAL(10,2) NOT NULL,
  date        DATE,
  mode        VARCHAR(20)  DEFAULT 'Cash',
  notes       TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Employees ─────────────────────────────────
CREATE TABLE IF NOT EXISTS employees (
  id          VARCHAR(20)  PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  role        VARCHAR(80),
  phone       VARCHAR(15),
  salary      DECIMAL(10,2) DEFAULT 0,
  join_date   DATE,
  addr        TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Salary Records ────────────────────────────
CREATE TABLE IF NOT EXISTS salary_records (
  id          VARCHAR(20)  PRIMARY KEY,
  emp_id      VARCHAR(20),
  emp_name    VARCHAR(100),
  month       VARCHAR(30),
  amount      DECIMAL(10,2) NOT NULL,
  date        DATE,
  mode        VARCHAR(20)  DEFAULT 'Cash',
  notes       TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (emp_id) REFERENCES employees(id) ON DELETE SET NULL
);

-- ── Default Fee Structure ─────────────────────
INSERT IGNORE INTO fee_structure (plan_name, shift, amount) VALUES
  ('Half Day', 'Morning', 600),
  ('Half Day', 'Evening', 600),
  ('Half Day + Reserved Seat', 'Morning', 800),
  ('Half Day + Reserved Seat', 'Evening', 800),
  ('Full Day', 'Full Day', 1100),
  ('Full Day + Reserved Seat', 'Full Day', 1300),
  ('Silver Plan (3 Month)', 'Morning', 1500),
  ('Silver Plan (3 Month)', 'Evening', 1500),
  ('Silver Plan (3 Month)', 'Full Day', 2800),
  ('Gold Plan (6 Month)', 'Morning', 2500),
  ('Gold Plan (6 Month)', 'Evening', 2500),
  ('Gold Plan (6 Month)', 'Full Day', 5000);

-- ── Default Notice ────────────────────────────
INSERT IGNORE INTO notices (id, title, type, body, date) VALUES
  (1, 'Library Timing Notice', 'info',
   'Morning Shift 6:00 AM – 1:00 PM | Evening Shift 1:00 PM – 8:00 PM | Full Day 6:00 AM – 8:00 PM.',
   CURDATE());
`;

async function setup() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host:     process.env.DB_HOST     || 'localhost',
      port:     process.env.DB_PORT     || 3306,
      user:     process.env.DB_USER     || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    });

    console.log('✅ Connected to MySQL');
    await conn.query(SQL);
    console.log('✅ Database & tables created successfully!');
    console.log('✅ Default data inserted');
    console.log('\n🚀 Now run: npm start');
  } catch (err) {
    console.error('❌ Setup error:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

setup();
