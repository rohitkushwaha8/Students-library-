// api.js — A.R. Library Frontend API Layer
// Place this file in your project folder and include it BEFORE the main script
//
// ⚠️  SERVER CONFIG REQUIRED FOR IMAGES (Aadhar / Member Photo):
//     In your Express server (server.js / app.js), set body size limit:
//       app.use(express.json({ limit: '5mb' }));
//       app.use(express.urlencoded({ extended: true, limit: '5mb' }));
//     Without this, uploading Aadhar/photo images will silently fail (413 error).

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : '/api'; // same server in production

// ══ Generic fetch wrapper ══════════════════════════════════════
async function apiFetch(path, options = {}) {
  try {
    // Serialise body first so we can check size
    const bodyStr = options.body ? JSON.stringify(options.body) : undefined;

    // Warn if payload is very large (images) — server may need body-size limit raised
    if (bodyStr && bodyStr.length > 500_000) {
      console.warn(`⚠️ Large API payload: ${(bodyStr.length/1024).toFixed(0)} KB to ${path}. Ensure server body-size limit is ≥ 5MB (express.json({ limit: '5mb' })).`);
    }

    const res = await fetch(API_BASE + path, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
      body: bodyStr
    });

    // Handle non-JSON error responses (e.g. 413 Payload Too Large from nginx/express)
    const contentType = res.headers.get('content-type') || '';
    let data;
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      if (!res.ok) throw new Error(res.status === 413 ? 'Image too large — ask server admin to increase body-size limit (5MB)' : text || 'Server error ' + res.status);
      data = {};
    }

    if (!res.ok) throw new Error(data.message || data.error || 'Server error ' + res.status);
    return data;
  } catch (err) {
    console.error('API Error [' + path + ']:', err.message);
    throw err;
  }
}

// ══ MEMBERS ═══════════════════════════════════════════════════
const API = {

  // Health check
  async health() {
    return apiFetch('/health');
  },

  // Members
  async getMembers() {
    const r = await apiFetch('/members');
    return r.data || [];
  },
  async getMember(id) {
    const r = await apiFetch('/members/' + id);
    return r.data;
  },
  async addMember(data) {
    return apiFetch('/members', { method: 'POST', body: data });
  },
  async updateMember(id, data) {
    return apiFetch('/members/' + id, { method: 'PUT', body: data });
  },
  async deleteMember(id, adminPassword) {
    return apiFetch('/members/' + id, {
      method: 'DELETE',
      headers: { 'x-admin-password': adminPassword }
    });
  },
  async getSeatsMap() {
    const r = await apiFetch('/members/seats/map');
    return r.data || [];
  },
  async autoExpire() {
    return apiFetch('/members/auto-expire', { method: 'POST' });
  },

  // Fee Structure
  async getFeeStructure() {
    const r = await apiFetch('/fees/structure/all');
    // Convert array to object format expected by frontend
    const fs = {};
    (r.data || []).forEach(row => {
      if (!fs[row.plan]) fs[row.plan] = {};
      fs[row.plan][row.shift] = Number(row.amount);
    });
    return fs;
  },
  // updateFeeStructure — 2 ways: (plan, shift, amount) single row ya (fullObj) pure object
  async updateFeeStructure(planOrObj, shift, amount) {
    // Agar pehla argument object hai (backup restore) to sab rows ek-ek update karo
    if(planOrObj && typeof planOrObj === 'object' && !shift){
      const results = [];
      for(const [plan, shifts] of Object.entries(planOrObj)){
        for(const [sh, amt] of Object.entries(shifts)){
          try {
            const r = await apiFetch('/fees/structure/update', {
              method: 'PUT',
              body: { plan, shift: sh, amount: amt }
            });
            results.push(r);
          } catch(_){}
        }
      }
      return { success: true, updated: results.length };
    }
    // Normal single-row update
    return apiFetch('/fees/structure/update', {
      method: 'PUT',
      body: { plan: planOrObj, shift, amount }
    });
  },

  // Fee Records
  async getFeeRecords(filters = {}) {
    const q = new URLSearchParams(filters).toString();
    const r = await apiFetch('/fees' + (q ? '?' + q : ''));
    return r.data || [];
  },
  async collectFee(data) {
    return apiFetch('/fees', { method: 'POST', body: data });
  },
  async deleteFeeRecord(id, adminPassword) {
    return apiFetch('/fees/' + id, {
      method: 'DELETE',
      headers: { 'x-admin-password': adminPassword }
    });
  },
  async getDues() {
    const r = await apiFetch('/fees/dues/list');
    return r.data || [];
  },

  // Attendance
  async getAttendance(filters = {}) {
    const q = new URLSearchParams(filters).toString();
    const r = await apiFetch('/attendance' + (q ? '?' + q : ''));
    return r.data || [];
  },
  async checkIn(data) {
    return apiFetch('/attendance/checkin', { method: 'POST', body: data });
  },
  async checkOut(data) {
    return apiFetch('/attendance/checkout', { method: 'POST', body: data });
  },
  async deleteAttendance(id) {
    return apiFetch('/attendance/' + id, { method: 'DELETE' });
  },

  // Notices
  async getNotices() {
    const r = await apiFetch('/notices');
    return r.data || [];
  },
  async addNotice(data) {
    return apiFetch('/notices', { method: 'POST', body: data });
  },
  async deleteNotice(id, adminPassword) {
    return apiFetch('/notices/' + id, {
      method: 'DELETE',
      headers: { 'x-admin-password': adminPassword }
    });
  },

  // Expenses
  async getExpenses(filters = {}) {
    const q = new URLSearchParams(filters).toString();
    const r = await apiFetch('/expenses' + (q ? '?' + q : ''));
    return r.data || [];
  },
  async addExpense(data) {
    return apiFetch('/expenses', { method: 'POST', body: data });
  },
  async deleteExpense(id, adminPassword) {
    return apiFetch('/expenses/' + id, {
      method: 'DELETE',
      headers: { 'x-admin-password': adminPassword }
    });
  },

  // Employees & Salary
  async getEmployees() {
    const r = await apiFetch('/salary/employees');
    return r.data || [];
  },
  async addEmployee(data) {
    return apiFetch('/salary/employees', { method: 'POST', body: data });
  },
  async deleteEmployee(id, adminPassword) {
    return apiFetch('/salary/employees/' + id, {
      method: 'DELETE',
      headers: { 'x-admin-password': adminPassword }
    });
  },
  async getSalaryRecords(filters = {}) {
    const q = new URLSearchParams(filters).toString();
    const r = await apiFetch('/salary/records' + (q ? '?' + q : ''));
    return r.data || [];
  },
  async paySalary(data) {
    return apiFetch('/salary/pay', { method: 'POST', body: data });
  },

  // Employee Login Credentials (cross-browser / cross-device sync)
  async getEmpCreds() {
    const r = await apiFetch('/salary/emp-creds');
    return r.data || [];
  },
  async saveEmpCreds(creds) {
    return apiFetch('/salary/emp-creds', { method: 'POST', body: { creds } });
  },

  // Dashboard & Reports
  async getDashboard() {
    const r = await apiFetch('/reports/dashboard');
    return r.data || {};
  },
  async getPL(month) {
    const q = month ? '?month=' + encodeURIComponent(month) : '';
    const r = await apiFetch('/reports/pl' + q);
    return r.data || {};
  },

  // Backup & Restore
  async getBackup() {
    const r = await apiFetch('/reports/backup');
    return r.data || {};
  },
  async restoreBackup(data, adminPassword) {
    return apiFetch('/reports/restore', {
      method: 'POST',
      body: data,
      headers: { 'x-admin-password': adminPassword }
    });
  }
};

window.AR_API = API;
console.log('✅ A.R. Library API layer loaded — connected to', API_BASE);
                                 

// ══ SETTINGS ══════════════════════════════════════════════════
Object.assign(window.AR_API, {
  async getSettings() {
    const r = await apiFetch('/settings');
    return r.data || {};
  },
  async saveSetting(key, value, adminPassword) {
    return apiFetch('/settings/' + key, {
      method: 'PUT',
      body: { value },
      headers: { 'x-admin-password': adminPassword }
    });
  },
  async saveSettings(settings, adminPassword) {
    return apiFetch('/settings', {
      method: 'PUT',
      body: settings,
      headers: { 'x-admin-password': adminPassword }
    });
  }
});

// ══ LOCKERS ════════════════════════════════════════════════════
Object.assign(window.AR_API, {
  async getLockers() {
    try {
      const r = await apiFetch('/lockers');
      return r.data || [];
    } catch(e) {
      console.warn('Locker server unavailable, using localStorage');
      try { return JSON.parse(localStorage.getItem('arlib_lockers') || '[]'); } catch(_){ return []; }
    }
  },
  async saveLocker(data) {
    try {
      return await apiFetch('/lockers', { method: 'POST', body: data });
    } catch(e) {
      let arr = [];
      try { arr = JSON.parse(localStorage.getItem('arlib_lockers') || '[]'); } catch(_){}
      const idx = arr.findIndex(x => x.no === data.no);
      if(idx > -1) arr[idx] = data; else arr.push(data);
      localStorage.setItem('arlib_lockers', JSON.stringify(arr));
      return { success: true, offline: true };
    }
  },
  async releaseLocker(no) {
    try {
      return await apiFetch('/lockers/' + no, { method: 'DELETE' });
    } catch(e) {
      let arr = [];
      try { arr = JSON.parse(localStorage.getItem('arlib_lockers') || '[]'); } catch(_){}
      arr = arr.filter(x => x.no !== no);
      localStorage.setItem('arlib_lockers', JSON.stringify(arr));
      return { success: true, offline: true };
    }
  }
});

// ══ ENQUIRY ════════════════════════════════════════════════════
Object.assign(window.AR_API, {
  async getEnquiries() {
    try {
      const r = await apiFetch('/enquiries');
      return r.data || [];
    } catch(e) {
      console.warn('Enquiry server unavailable, using localStorage');
      try { return JSON.parse(localStorage.getItem('arlib_enquiries') || '[]'); } catch(_){ return []; }
    }
  },
  async addEnquiry(data) {
    try {
      return await apiFetch('/enquiries', { method: 'POST', body: data });
    } catch(e) {
      let arr = [];
      try { arr = JSON.parse(localStorage.getItem('arlib_enquiries') || '[]'); } catch(_){}
      data.id = data.id || ('ENQ-' + Date.now());
      arr.unshift(data);
      localStorage.setItem('arlib_enquiries', JSON.stringify(arr));
      return { success: true, offline: true, id: data.id };
    }
  },
  async updateEnquiry(id, data) {
    try {
      return await apiFetch('/enquiries/' + id, { method: 'PUT', body: data });
    } catch(e) {
      let arr = [];
      try { arr = JSON.parse(localStorage.getItem('arlib_enquiries') || '[]'); } catch(_){}
      const idx = arr.findIndex(x => x.id === id);
      if(idx > -1) arr[idx] = { ...arr[idx], ...data };
      localStorage.setItem('arlib_enquiries', JSON.stringify(arr));
      return { success: true, offline: true };
    }
  },
  async deleteEnquiry(id) {
    try {
      return await apiFetch('/enquiries/' + id, { method: 'DELETE' });
    } catch(e) {
      let arr = [];
      try { arr = JSON.parse(localStorage.getItem('arlib_enquiries') || '[]'); } catch(_){}
      arr = arr.filter(x => x.id !== id);
      localStorage.setItem('arlib_enquiries', JSON.stringify(arr));
      return { success: true, offline: true };
    }
  }
});

// AR_API alias
const AR_API = window.AR_API;

/*
════════════════════════════════════════════════════════════════
  SERVER-SIDE ROUTES — server.js mein ye tables aur routes add karo
════════════════════════════════════════════════════════════════

-- LOCKERS TABLE
CREATE TABLE IF NOT EXISTS lockers (
  no INTEGER PRIMARY KEY,
  memberId TEXT,
  memberName TEXT,
  fee REAL DEFAULT 0,
  fromDate TEXT,
  toDate TEXT,
  notes TEXT,
  assignedAt TEXT
);

-- ENQUIRIES TABLE
CREATE TABLE IF NOT EXISTS enquiries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  shift TEXT,
  cls TEXT,
  date TEXT,
  status TEXT DEFAULT 'Pending',
  notes TEXT,
  createdAt INTEGER
);

-- EXPRESS ROUTES --

// GET all lockers
app.get('/api/lockers', (req, res) => {
  db.all('SELECT * FROM lockers ORDER BY no', [], (err, rows) =>
    err ? res.status(500).json({ error: err.message }) : res.json({ data: rows })
  );
});
// POST assign locker
app.post('/api/lockers', (req, res) => {
  const { no, memberId, memberName, fee, from, to, notes } = req.body;
  db.run('INSERT OR REPLACE INTO lockers (no,memberId,memberName,fee,fromDate,toDate,notes,assignedAt) VALUES (?,?,?,?,?,?,?,?)',
    [no, memberId, memberName, fee||0, from||'', to||'', notes||'', new Date().toISOString()],
    err => err ? res.status(500).json({ error: err.message }) : res.json({ success: true })
  );
});
// DELETE release locker
app.delete('/api/lockers/:no', (req, res) => {
  db.run('DELETE FROM lockers WHERE no=?', [req.params.no],
    err => err ? res.status(500).json({ error: err.message }) : res.json({ success: true })
  );
});

// GET all enquiries
app.get('/api/enquiries', (req, res) => {
  db.all('SELECT * FROM enquiries ORDER BY createdAt DESC', [], (err, rows) =>
    err ? res.status(500).json({ error: err.message }) : res.json({ data: rows })
  );
});
// POST new enquiry
app.post('/api/enquiries', (req, res) => {
  const { id, name, phone, address, shift, cls, date, status, notes } = req.body;
  const enqId = id || ('ENQ-' + Date.now());
  db.run('INSERT OR REPLACE INTO enquiries (id,name,phone,address,shift,cls,date,status,notes,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [enqId, name, phone||'', address||'', shift||'', cls||'', date||'', status||'Pending', notes||'', Date.now()],
    err => err ? res.status(500).json({ error: err.message }) : res.json({ success: true, id: enqId })
  );
});
// PUT update enquiry
app.put('/api/enquiries/:id', (req, res) => {
  const { name, phone, address, shift, cls, date, status, notes } = req.body;
  db.run('UPDATE enquiries SET name=?,phone=?,address=?,shift=?,cls=?,date=?,status=?,notes=? WHERE id=?',
    [name, phone||'', address||'', shift||'', cls||'', date||'', status||'Pending', notes||'', req.params.id],
    err => err ? res.status(500).json({ error: err.message }) : res.json({ success: true })
  );
});
// DELETE enquiry
app.delete('/api/enquiries/:id', (req, res) => {
  db.run('DELETE FROM enquiries WHERE id=?', [req.params.id],
    err => err ? res.status(500).json({ error: err.message }) : res.json({ success: true })
  );
});

// ══ RESTORE ENDPOINT — server.js mein ye add karo ══════════════
// POST /api/reports/restore
app.post('/api/reports/restore', (req, res) => {
  const data = req.body;
  if(!data || (!data.members && !data.feeRecords)){
    return res.status(400).json({ success: false, message: 'Invalid backup data' });
  }
  // Transaction mein sab clear karke naya data insert karo
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    try {
      // Pehle sab tables clear karo
      db.run('DELETE FROM members');
      db.run('DELETE FROM fee_records');
      db.run('DELETE FROM attendance');
      db.run('DELETE FROM expenses');
      db.run('DELETE FROM employees');
      db.run('DELETE FROM salary_records');
      db.run('DELETE FROM notices');

      // Members insert
      const mems = data.members || [];
      mems.forEach(m => {
        db.run(`INSERT OR REPLACE INTO members
          (id,name,phone,cls,shift,plan,fromDate,toDate,seat,color,feeStatus,addr,guardian,gphone,aadhar,aadharImg,photo,dueAmount)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [m.id,m.name,m.phone||'',m.cls||'',m.shift||'',m.plan||'',m.from||m.fromDate||'',m.to||m.toDate||'',m.seat||'',m.color||'',m.feeStatus||'Due',m.addr||'',m.guardian||'',m.gphone||'',m.aadhar||'',m.aadharImg||null,m.photo||null,m.dueAmount||0]
        );
      });

      // Fee Records insert
      (data.feeRecords || []).forEach(f => {
        db.run(`INSERT OR REPLACE INTO fee_records (id,memberId,memberName,plan,shift,amount,date,mode,month,notes,status,dueAmount)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
          [f.id,f.memberId,f.memberName||'',f.plan||'',f.shift||'',f.amount||0,f.date||'',f.mode||'Cash',f.month||'',f.notes||'',f.status||'Paid',f.dueAmount||0]
        );
      });

      // Attendance insert
      (data.attendance || []).forEach(a => {
        db.run(`INSERT OR REPLACE INTO attendance (id,date,memberId,memberName,shift,seat,inTime,outTime,present)
          VALUES (?,?,?,?,?,?,?,?,?)`,
          [a.id||(a.date+'_'+a.memberId),a.date,a.memberId,a.memberName||'',a.shift||'',a.seat||'',a.in||a.inTime||'',a.out||a.outTime||'',a.present?1:0]
        );
      });

      // Expenses insert
      (data.expenses || []).forEach(e => {
        db.run(`INSERT OR REPLACE INTO expenses (id,cat,desc,amount,date,mode,notes)
          VALUES (?,?,?,?,?,?,?)`,
          [e.id,e.cat||'other',e.desc||'',e.amount||0,e.date||'',e.mode||'Cash',e.notes||'']
        );
      });

      // Employees insert
      (data.employees || []).forEach(emp => {
        db.run(`INSERT OR REPLACE INTO employees (id,name,role,phone,salary,join,addr)
          VALUES (?,?,?,?,?,?,?)`,
          [emp.id,emp.name,emp.role||'',emp.phone||'',emp.salary||0,emp.join||emp.joinDate||'',emp.addr||'']
        );
      });

      // Salary Records insert
      (data.salaryRecords || []).forEach(s => {
        db.run(`INSERT OR REPLACE INTO salary_records (id,empId,empName,month,amount,date,mode,notes)
          VALUES (?,?,?,?,?,?,?,?)`,
          [s.id,s.empId,s.empName||'',s.month||'',s.amount||0,s.date||'',s.mode||'Cash',s.notes||'']
        );
      });

      // Notices insert
      (data.notices || []).forEach(n => {
        db.run(`INSERT OR REPLACE INTO notices (id,title,type,body,date)
          VALUES (?,?,?,?,?)`,
          [n.id,n.title||'',n.type||'info',n.body||'',n.date||'']
        );
      });

      db.run('COMMIT', err => {
        if(err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, message: 'Restore complete', counts: {
          members: mems.length,
          feeRecords: (data.feeRecords||[]).length,
          attendance: (data.attendance||[]).length
        }});
      });
    } catch(err) {
      db.run('ROLLBACK');
      res.status(500).json({ success: false, message: err.message });
    }
  });
});

════════════════════════════════════════════════════════════════
*/
