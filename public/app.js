// AR_API stub — agar api.js load na ho to crash na ho
if(typeof AR_API === 'undefined'){
  window.AR_API = {
    getMembers:()=>Promise.reject(new Error('offline')),
    getFeeRecords:()=>Promise.reject(new Error('offline')),
    getAttendance:()=>Promise.reject(new Error('offline')),
    getNotices:()=>Promise.reject(new Error('offline')),
    getExpenses:()=>Promise.reject(new Error('offline')),
    getEmployees:()=>Promise.reject(new Error('offline')),
    getSalaryRecords:()=>Promise.reject(new Error('offline')),
    getFeeStructure:()=>Promise.reject(new Error('offline')),
    autoExpire:()=>Promise.reject(new Error('offline')),
    addMember:()=>Promise.reject(new Error('offline')),
    updateMember:()=>Promise.reject(new Error('offline')),
    deleteMember:()=>Promise.reject(new Error('offline')),
    collectFee:()=>Promise.reject(new Error('offline')),
    deleteFeeRecord:()=>Promise.reject(new Error('offline')),
    checkIn:()=>Promise.reject(new Error('offline')),
    checkOut:()=>Promise.reject(new Error('offline')),
    deleteAttendance:()=>Promise.reject(new Error('offline')),
    addNotice:()=>Promise.reject(new Error('offline')),
    deleteNotice:()=>Promise.reject(new Error('offline')),
    addExpense:()=>Promise.reject(new Error('offline')),
    deleteExpense:()=>Promise.reject(new Error('offline')),
    addEmployee:()=>Promise.reject(new Error('offline')),
    deleteEmployee:()=>Promise.reject(new Error('offline')),
    paySalary:()=>Promise.reject(new Error('offline')),
    updateFeeStructure:()=>Promise.reject(new Error('offline')),
    getBin:()=>Promise.resolve([]),
    addToBin:()=>Promise.resolve({}),
    deleteFromBin:()=>Promise.resolve({}),
    emptyBin:()=>Promise.resolve({}),
    getEnquiries:()=>Promise.resolve([]),
    addEnquiry:()=>Promise.resolve({}),
    deleteEnquiry:()=>Promise.resolve({}),
    getLockers:()=>Promise.resolve([]),
    addLocker:()=>Promise.resolve({}),
    deleteLocker:()=>Promise.resolve({}),
    updateLocker:()=>Promise.resolve({}),
    getEmpCreds:()=>Promise.resolve([]),
    updateEmpCred:()=>Promise.resolve({}),
    getBackup:()=>Promise.resolve({}),
  };
}

// ═══ CONSTANTS ════════════════════════════════════════════════════════════════

// ── IDB Helper: members array mein local images inject karo ──
async function injectIDBImages(membersArr) {
  try {
    const idbMap = await AR_IDB.getAllImages();
    membersArr.forEach(mem => {
      const local = idbMap[mem.id];
      if(local){
        if(local.photo)     mem.photo     = local.photo;
        if(local.aadharImg) mem.aadharImg = local.aadharImg;
      }
    });
  } catch(ex){ console.warn('IDB inject error:', ex); }
  return membersArr;
}

const COLORS=['#3b82f6','#a855f7','#22c55e','#f97316','#14b8a6','#ef4444','#eab308','#ec4899','#6366f1','#06b6d4'];
const LS_KEY = 'studyzone_v2';
const BIN_KEY = 'stdlib_recycle_bin_v1';
const REC_SEQ_KEY = 'stdlib_receipt_seq_v1';
let saveTimer = null;
let checkoutTarget = null;
let recycleBin = []; // {id, type, label, data, deletedAt}

// ═══ DEFAULT DATA ═════════════════════════════════════════════════════════════
const defaultData = {
  feeStructure: {
    'Half Day':                {Morning:600,  Evening:600,  'Full Day':600},
    'Half Day + Reserved Seat':{Morning:800,  Evening:800,  'Full Day':800},
    'Full Day':                {Morning:1300, Evening:1300, 'Full Day':1300},
    'Full Day + Reserved Seat':{Morning:1300, Evening:1300, 'Full Day':1300}
  },
  members: [
    {id:'AR-001',name:'Rohit Kumar',phone:'919876543210',cls:'B.Tech 2nd Year',shift:'Morning (6AM–1PM)',plan:'Full Day',from:'2026-04-01',to:'2026-04-30',seat:5,color:COLORS[0],feeStatus:'Paid',addr:'',guardian:'Ramesh Kumar',gphone:'919876500000',aadhar:'1234 5678 9012',aadharImg:null,photo:null},
    {id:'AR-002',name:'Priya Sharma',phone:'919812345678',cls:'12th',shift:'Evening (1PM–8PM)',plan:'Half Day',from:'2026-04-01',to:'2026-04-30',seat:12,color:COLORS[1],feeStatus:'Due',addr:'',guardian:'Sunita Sharma',gphone:'919812300000',aadhar:'',aadharImg:null,photo:null},
    {id:'AR-003',name:'Ankit Verma',phone:'919807654321',cls:'UPSC Aspirant',shift:'Full Day (6AM–8PM)',plan:'Full Day + Reserved Seat',from:'2026-03-01',to:'2026-05-31',seat:8,color:COLORS[2],feeStatus:'Paid',addr:'',guardian:'',gphone:'',aadhar:'9876 5432 1098',aadharImg:null,photo:null},
    {id:'AR-004',name:'Sunita Devi',phone:'919834567890',cls:'BA 1st Year',shift:'Morning (6AM–1PM)',plan:'Half Day',from:'2026-04-01',to:'2026-04-30',seat:21,color:COLORS[3],feeStatus:'Due',addr:'',guardian:'Mahesh Devi',gphone:'919834500000',aadhar:'',aadharImg:null,photo:null},
    {id:'AR-005',name:'Arjun Singh',phone:'919845678901',cls:'12th',shift:'Evening (1PM–8PM)',plan:'Half Day + Reserved Seat',from:'2026-04-01',to:'2026-04-30',seat:35,color:COLORS[4],feeStatus:'Paid',addr:'',guardian:'Baldev Singh',gphone:'919845600000',aadhar:'4567 8901 2345',aadharImg:null,photo:null},
  ],
  feeRecords: [
    {id:'REC-001',memberId:'AR-001',memberName:'Rohit Kumar',plan:'Full Day',shift:'Morning',amount:1100,date:'2026-04-01',mode:'UPI',month:'April 2026',notes:'',status:'Paid'},
    {id:'REC-002',memberId:'AR-003',memberName:'Ankit Verma',plan:'Full Day + Reserved Seat',shift:'Full Day',amount:1300,date:'2026-03-01',mode:'Cash',month:'March 2026',notes:'',status:'Paid'},
    {id:'REC-003',memberId:'AR-005',memberName:'Arjun Singh',plan:'Half Day + Reserved Seat',shift:'Evening',amount:800,date:'2026-04-01',mode:'Online',month:'April 2026',notes:'',status:'Paid'},
  ],
  attendance: [
    {date:'2026-04-13',memberId:'AR-001',memberName:'Rohit Kumar',shift:'Morning',seat:5,in:'06:15',out:'13:00',present:true},
    {date:'2026-04-13',memberId:'AR-003',memberName:'Ankit Verma',shift:'Full Day',seat:8,in:'07:00',out:'',present:true},
    {date:'2026-04-13',memberId:'AR-005',memberName:'Arjun Singh',shift:'Evening',seat:35,in:'',out:'',present:false},
    {date:'2026-04-12',memberId:'AR-001',memberName:'Rohit Kumar',shift:'Morning',seat:5,in:'06:30',out:'13:00',present:true},
    {date:'2026-04-12',memberId:'AR-002',memberName:'Priya Sharma',shift:'Evening',seat:12,in:'13:10',out:'19:50',present:true},
  ],
  notices: [
    {id:1,title:'Library Timing Notice',type:'info',body:'Yugvandana Library timings: Morning Shift 6:00 AM – 1:00 PM | Evening Shift 1:00 PM – 8:00 PM | Full Day 6:00 AM – 8:00 PM.',date:'2026-04-12'},
    {id:2,title:'Fee Reminder',type:'warn',body:'Members with pending fees are requested to clear dues within 3 days. Fees once paid are non-refundable.',date:'2026-04-11'},
  ],
  expenses: [
    {id:'EXP-001',cat:'rent',desc:'Monthly rent for April 2026',amount:5000,date:'2026-04-01',mode:'Cash',notes:''},
    {id:'EXP-002',cat:'utility',desc:'Electricity bill March',amount:1200,date:'2026-04-05',mode:'UPI',notes:''},
    {id:'EXP-003',cat:'maintenance',desc:'Chair repair',amount:500,date:'2026-04-10',mode:'Cash',notes:'5 chairs fixed'},
  ],
  employees: [
    {id:'EMP-001',name:'Sanjay Kumar',role:'Librarian',phone:'919800000001',salary:8000,join:'2025-01-01',addr:'Ward No. 15, Sarkari Hospital Ke Samne, Baikunthpur'},
  ],
  salaryRecords: [
    {id:'SAL-001',empId:'EMP-001',empName:'Sanjay Kumar',month:'March 2026',amount:8000,date:'2026-04-01',mode:'Cash',notes:''},
  ]
};

// ═══ STATE ═══════════════════════════════════════════════════════════════════
let feeStructure = {}, members = [], feeRecords = [], attendance = [], notices = [], seats = [];
let expenses = [], employees = [], salaryRecords = [];
let currentShift = 'morning';
let selectedSeatNo = null;
let selectedSeatNoMorning = null;
let selectedSeatNoEvening = null;
let receiptWaData = null;
let currentExpTab = 'all';
let currentProfileId = null;
let currentProfileTab = 'info';

// ═══ API-BASED DATA LAYER (replaces localStorage) ══════════════════════════════
let _retryTimer = null;
let _serverOnline = false;

function _startRetryTimer(){
  if(_retryTimer) return;
  let attempt = 0;
  _retryTimer = setInterval(async ()=>{
    attempt++;
    const badge = document.getElementById('storageBadge');
    if(badge){ badge.style.cssText='border-color:var(--orange);color:var(--orange);cursor:pointer'; badge.textContent='🔄 Retry #'+attempt+'...'; }
    try {
      await loadData();
    } catch(e){
      if(badge){ badge.style.cssText='border-color:var(--red);color:var(--red);cursor:pointer'; badge.textContent='❌ Offline — retry #'+attempt; }
    }
  }, 5000);
}

async function loadData(){
  const badge = document.getElementById('storageBadge');
  if(badge){ badge.className='storage-badge saving'; badge.style.cssText='cursor:pointer'; badge.textContent='⏳ Loading...'; }
  try {
    try { await AR_API.autoExpire(); } catch(ex) { /* skip */ }
    const [m,fr,att,ntc,exp,emp,sal,fs] = await Promise.all([
      AR_API.getMembers().catch(()=>[]),
      AR_API.getFeeRecords().catch(()=>[]),
      AR_API.getAttendance().catch(()=>[]),
      AR_API.getNotices().catch(()=>[]),
      AR_API.getExpenses().catch(()=>[]),
      AR_API.getEmployees().catch(()=>[]),
      AR_API.getSalaryRecords().catch(()=>[]),
      AR_API.getFeeStructure().catch(()=>({}))
    ]);
    members=m||[]; feeRecords=fr||[]; attendance=att||[]; notices=ntc||[];
    expenses=exp||[]; employees=emp||[]; salaryRecords=sal||[];
    feeStructure = fs && Object.keys(fs).length ? fs : JSON.parse(JSON.stringify(defaultData.feeStructure));

    // ── IDB: Local se photo aur aadharImg inject karo (server pe nahi hote) ──
    await injectIDBImages(members);

    // SYNC FIX: Har member ka latest fee record se dueAmount accurately sync karo
    // Latest = highest date, phir highest numeric id
    const memberLatestRecMap = {};
    feeRecords.forEach(r=>{
      if(!r.memberId) return;
      const prev = memberLatestRecMap[r.memberId];
      if(!prev
        || normDate(r.date) > normDate(prev.date)
        || (normDate(r.date)===normDate(prev.date) && (parseInt(r.id)||0)>(parseInt(prev.id)||0))){
        memberLatestRecMap[r.memberId] = r;
      }
    });
    members.forEach(mem=>{
      const latestRec = memberLatestRecMap[mem.id];
      if(!latestRec) return;
      if(latestRec.status==='Paid'){
        if(mem.feeStatus==='Partial'){ mem.feeStatus='Paid'; mem.dueAmount=0; }
      } else if(latestRec.status==='Partial'){
        mem.dueAmount = parseFloat(latestRec.dueAmount)||0;
      } else if(mem.feeStatus==='Due' && (!mem.dueAmount || mem.dueAmount===0)){
        // Plan change fix: Total paid calculate karke naye plan se ghataao
        const shiftKey=(mem.shift||'').includes('Full Day')?'Full Day':(mem.shift||'').includes('Evening')?'Evening':'Morning';
        const planBase=(feeStructure[mem.plan]||{})[shiftKey]||0;
        const durVal=parseInt(mem.category)||1;
        const sub=planBase*durVal;
        const planTotal=sub-Math.round(sub*getPlanDiscount(durVal));
        const totalPaid=feeRecords
          .filter(r=>r.memberId===mem.id)
          .reduce((s,r)=>s+(parseFloat(r.paidAmount)||parseFloat(r.amount)||0),0);
        if(planTotal>0 && totalPaid>0 && totalPaid<planTotal){
          mem.dueAmount=Math.max(0,planTotal-totalPaid);
        }
      }
    });

    // ✅ Locker data server se sync karo
    try {
      const serverLockers = await AR_API.getLockers();
      if(serverLockers && serverLockers.length > 0){
        loadAppSettings();
        appSettings.lockerData = serverLockers;
        saveAppSettings();
      }
    } catch(ex){ /* skip */ }
    if(badge){ badge.className='storage-badge'; badge.style.cssText='cursor:pointer'; badge.textContent='🌐 Live DB'; }
    _serverOnline = true;
    if(_retryTimer){ clearInterval(_retryTimer); _retryTimer=null; toast('✅ Server connected!','var(--green)'); }
  } catch(e){
    console.warn('Server error:', e.message);
    _serverOnline = false;
    if(badge){ badge.className='storage-badge'; badge.style.cssText='border-color:var(--red);color:var(--red);cursor:pointer'; badge.textContent='❌ Server Offline'; }
    if(!_retryTimer){ toast('⚠️ Server offline — retrying...','var(--orange)'); _startRetryTimer(); }
  }
  buildSeats();
}


function toggleSection(id){
  const el = document.getElementById(id);
  if(!el) return;
  el.style.display = el.style.display === 'none' ? '' : 'none';
}

// ═══ SEAT KEY HELPERS ═══════════════════════════════════════════════════════
// Seat stored as "M5", "E12", "F8" etc.
// M = Morning, E = Evening, F = Full Day
function seatPrefix(shift){
  if(!shift) return 'M';
  if(shift.includes('Full Day')||shift.includes('Full')) return 'F';
  if(shift.includes('Evening')) return 'E';
  if(shift.includes('Night')) return 'N';
  if(shift.includes('Morning')) return 'M';
  // Custom shift — check if it has a saved prefix
  loadAppSettings();
  const customShifts = appSettings.customShifts || [];
  const cs = customShifts.find(s => shift.startsWith(s.name));
  if(cs && cs.prefix) return cs.prefix.toUpperCase();
  return 'M';
}
function parseSeatKey(key){
  // Returns {prefix:'M'|'E'|'F'|'N'|..., no:5}
  if(!key && key!==0) return {prefix:'M',no:0};
  const s = String(key);
  const m = s.match(/^([A-Za-z]+)(\d+)$/i);
  if(m) return {prefix:m[1].toUpperCase(), no:parseInt(m[2])};
  // Legacy numeric seats — keep as-is with no prefix
  const n = parseInt(s);
  return {prefix:'', no:isNaN(n)?0:n};
}
function makeSeatKey(shift, no){
  return seatPrefix(shift) + no;
}

// ── Shift ke start/end time minutes mein nikalo ──────────────────────────────
function getShiftMinutes(shift){
  if(!shift) return {start:0, end:0};
  loadAppSettings();
  const sts = appSettings.shifts || {};
  const cs = (appSettings.customShifts||[]).find(s=>{
    const sl = shift.toLowerCase().trim();
    const sn = s.name.toLowerCase();
    return sl === sn || sl.startsWith(sn+' ') || sl.startsWith(sn+'(') || sl.startsWith(sn+' (');
  });
  const toMin = t => {
    if(!t) return 0;
    const [h,m] = t.split(':').map(Number);
    return h*60 + (m||0);
  };
  if(cs) return { start: toMin(cs.start), end: toMin(cs.end) };
  if(shift.includes('Full Day')||shift.includes('Full'))
    return { start: toMin(sts.morningStart||'08:00'), end: toMin(sts.eveningEnd||'20:00') };
  if(shift.includes('Evening'))
    return { start: toMin(sts.eveningStart||'14:00'), end: toMin(sts.eveningEnd||'20:00') };
  if(shift.includes('Night'))
    return { start: toMin(sts.nightStart||'20:00'), end: toMin(sts.nightEnd||'24:00') };
  if(shift.includes('Morning'))
    return { start: toMin(sts.morningStart||'08:00'), end: toMin(sts.morningEnd||'14:00') };
  return { start: 0, end: 0 };
}

// Do shifts ka time overlap check — kya dono ek saath seat use karenge?
function shiftsOverlap(shiftA, shiftB){
  const a = getShiftMinutes(shiftA);
  const b = getShiftMinutes(shiftB);
  if(!a.start && !a.end) return false;
  if(!b.start && !b.end) return false;
  // Overlap: a.start < b.end AND b.start < a.end
  return a.start < b.end && b.start < a.end;
}

function buildSeats(){
  loadAppSettings();
  const total = (appSettings.seats && appSettings.seats.total) ? appSettings.seats.total : 79;

  seats = Array.from({length:total},(_,i)=>{
    const seatNo = i+1;
    // Us seat pe jo bhi members hain (seat assigned)
    const seatMembers = members.filter(x => x.seat && parseSeatKey(x.seat).no === seatNo);

    // Morning slot pe kaun baitha hai (time overlap se)
    const morningShift = 'Morning';
    const morningM = seatMembers.find(x => shiftsOverlap(x.shift, morningShift));

    // Evening slot pe kaun baitha hai
    const eveningShift = 'Evening';
    const eveningM = seatMembers.find(x => shiftsOverlap(x.shift, eveningShift));

    // Night slot
    const nightShift = 'Night';
    const nightM = seatMembers.find(x => shiftsOverlap(x.shift, nightShift));

    const anyM = seatMembers.length > 0 ? seatMembers[0] : null;
    return {
      no: seatNo,
      occupied: seatMembers.length > 0,
      member: anyM,
      morningMember: morningM || null,
      eveningMember: eveningM || null,
      nightMember: nightM || null,
      allMembers: seatMembers  // saare members jo is seat pe hain
    };
  });
}

function getSeatZone(no){
  loadAppSettings();
  const s = appSettings.seats || {};
  // Zone order: Red(1-zR), Blue(zR+1-total)
  const zR = s.zoneRed || 50;   // 1-50 = Red, 51+ = Blue
  if(no<=zR) return 'red';
  return 'blue';
}

function saveData(){
  localStorage.removeItem(LS_KEY);
}

// ═══ RECYCLE BIN ══════════════════════════════════════════════════════════════
// ✅ RECYCLE BIN — Server (MongoDB) based
async function loadRecycleBin(){
  try {
    const rows = await AR_API.getBin();
    recycleBin = Array.isArray(rows) ? rows : [];
  } catch(e){
    // fallback: localStorage
    try {
      const raw = localStorage.getItem(BIN_KEY);
      recycleBin = raw ? JSON.parse(raw) : [];
    } catch(e2){ recycleBin=[]; }
  }
  updateBinBadge();
}

function saveRecycleBin(){
  // localStorage backup bhi rakhte hain
  try { localStorage.setItem(BIN_KEY, JSON.stringify(recycleBin)); } catch(e){}
  updateBinBadge();
}

function updateBinBadge(){
  const badge = document.getElementById('binBadge');
  if(!badge) return;
  if(recycleBin.length > 0){
    badge.style.display='inline';
    badge.textContent = recycleBin.length;
  } else {
    badge.style.display='none';
  }
}

async function addToRecycleBin(type, label, data){
  const item = {
    id: 'bin-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),
    type, label,
    data: typeof data === 'string' ? data : JSON.stringify(data),
    deletedAt: Date.now()
  };
  // Server pe save karo
  try {
    await AR_API.addToBin(item);
  } catch(e){
    console.warn('Bin server save failed, localStorage fallback:', e.message);
  }
  // Memory mein bhi rakho
  recycleBin.push({...item, data: typeof data === 'object' ? data : JSON.parse(item.data)});
  saveRecycleBin();
}

async function restoreFromBin(binId){
  await loadRecycleBin();
  const item = recycleBin.find(x=>x.id===binId);
  if(!item){ toast('⚠️ Item not found in bin','var(--red)'); return; }
  const typeLabels = {member:'Member',fee:'Fee Record',expense:'Expense',notice:'Notice',employee:'Employee'};
  if(!confirm(`Restore this ${typeLabels[item.type]||'item'}? It will be added back.`)) return;

  // Helper: localStorage fallback restore
  function localRestore(){
    if(item.type==='member'){
      const exists = members.find(m=>m.id===item.data.id);
      if(!exists){ members.push(item.data); }
      buildSeats(); renderMembers(); renderDashboard();
      toast(`✅ Member "${item.label}" restored!`,'var(--green)');
    } else if(item.type==='fee'){
      feeRecords.push(item.data);
      renderFees(); renderDashboard();
      toast(`✅ Fee record "${item.label}" restored!`,'var(--green)');
    } else if(item.type==='expense'){
      expenses.push(item.data);
      renderExpenses();
      toast(`✅ Expense "${item.label}" restored!`,'var(--green)');
    } else if(item.type==='notice'){
      notices.push(item.data);
      renderNotices();
      toast(`✅ Notice "${item.label}" restored!`,'var(--green)');
    } else if(item.type==='employee'){
      const exists = employees.find(e=>e.id===item.data.id);
      if(!exists){ employees.push(item.data); }
      renderSalary();
      toast(`✅ Employee "${item.label}" restored!`,'var(--green)');
    }
    recycleBin = recycleBin.filter(x=>x.id!==binId);
    saveRecycleBin();
    renderRecycleBin();
  }

  if(item.type==='member'){
    // Agar member already exist karta hai to update karo, warna add karo
    const existingMember = members.find(m=>m.id===item.data.id);
    const apiCall = existingMember
      ? AR_API.updateMember(item.data.id, item.data)
      : AR_API.addMember(item.data);
    apiCall.then(async ()=>{
      members = await AR_API.getMembers(); await injectIDBImages(members);
      buildSeats(); renderMembers(); renderDashboard();
      toast(`✅ Member "${item.label}" restored!`,'var(--green)');
      AR_API.deleteFromBin(binId).catch(e=>console.warn(e));
      recycleBin = recycleBin.filter(x=>x.id!==binId);
      saveRecycleBin(); renderRecycleBin();
    }).catch(()=>localRestore());
  } else if(item.type==='fee'){
    AR_API.collectFee(item.data).then(async ()=>{
      feeRecords = await AR_API.getFeeRecords();
      renderFees(); renderDashboard();
      toast(`✅ Fee record "${item.label}" restored!`,'var(--green)');
      AR_API.deleteFromBin(binId).catch(e=>console.warn(e));
      recycleBin = recycleBin.filter(x=>x.id!==binId);
      saveRecycleBin(); renderRecycleBin();
    }).catch(()=>localRestore());
  } else if(item.type==='expense'){
    AR_API.addExpense(item.data).then(async ()=>{
      expenses = await AR_API.getExpenses();
      renderExpenses();
      toast(`✅ Expense "${item.label}" restored!`,'var(--green)');
      AR_API.deleteFromBin(binId).catch(e=>console.warn(e));
      recycleBin = recycleBin.filter(x=>x.id!==binId);
      saveRecycleBin(); renderRecycleBin();
    }).catch(()=>localRestore());
  } else if(item.type==='notice'){
    AR_API.addNotice(item.data).then(async ()=>{
      notices = await AR_API.getNotices();
      renderNotices();
      toast(`✅ Notice "${item.label}" restored!`,'var(--green)');
      AR_API.deleteFromBin(binId).catch(e=>console.warn(e));
      recycleBin = recycleBin.filter(x=>x.id!==binId);
      saveRecycleBin(); renderRecycleBin();
    }).catch(()=>localRestore());
  } else if(item.type==='employee'){
    AR_API.addEmployee(item.data).then(async ()=>{
      employees = await AR_API.getEmployees();
      renderSalary();
      toast(`✅ Employee "${item.label}" restored!`,'var(--green)');
      recycleBin = recycleBin.filter(x=>x.id!==binId);
      saveRecycleBin(); renderRecycleBin();
    }).catch(()=>localRestore());
  } else {
    // fallback for unknown types
    recycleBin = recycleBin.filter(x=>x.id!==binId);
    saveRecycleBin(); renderRecycleBin();
  }
}

function permanentDeleteFromBin(binId){
  if(!confirm('Permanently delete this item? This cannot be undone.')) return;
  AR_API.deleteFromBin(binId).catch(e=>console.warn('Bin delete error:',e));
  recycleBin = recycleBin.filter(x=>x.id!==binId);
  saveRecycleBin();
  renderRecycleBin();
  toast('🗑️ Permanently deleted','var(--red)');
}

function emptyRecycleBin(){
  if(!recycleBin.length){ toast('Recycle bin is already empty','var(--ink3)'); return; }
  requireAdmin(()=>{
    if(!confirm(`Permanently delete ALL ${recycleBin.length} item(s) in the bin? This CANNOT be undone!`)) return;
    AR_API.emptyBin().catch(e=>console.warn('Empty bin error:',e));
    recycleBin = [];
    saveRecycleBin();
    renderRecycleBin();
    toast('🧹 Recycle bin emptied!','var(--orange)');
  });
}

async function renderRecycleBin(){
  await loadRecycleBin();
  const typeFilter = (document.getElementById('bin-typeFil')||{}).value||'';
  const typeIcon = {member:'👥',fee:'💰',expense:'💸',notice:'📢',employee:'👷'};
  const typeColor = {member:'var(--blue)',fee:'var(--green)',expense:'var(--red)',notice:'var(--teal)',employee:'var(--purple)'};

  let list = typeFilter ? recycleBin.filter(x=>x.type===typeFilter) : recycleBin;
  list = [...list].sort((a,b)=>b.deletedAt-a.deletedAt);

  const el = document.getElementById('recycleBinList');
  if(!el) return;

  if(!list.length){
    el.innerHTML=`<div class="empty"><div class="empty-icon">🗑️</div><h3 style="color:var(--ink3)">${typeFilter?'No items of this type':'Recycle bin is empty'}</h3><p style="color:var(--ink3);font-size:13px;margin-top:6px">Deleted items appear here for 30 days</p></div>`;
    return;
  }

  el.innerHTML = list.map(item=>{
    const daysLeft = Math.ceil((item.deletedAt + 30*24*60*60*1000 - Date.now()) / (24*60*60*1000));
    const urgent = daysLeft <= 3;
    const deletedDate = new Date(item.deletedAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
    const color = typeColor[item.type]||'var(--ink3)';
    const icon = typeIcon[item.type]||'📄';

    // Build detail snippet
    let detail = '';
    if(item.type==='member') detail = `ID: ${item.data.id} · ${item.data.phone||''}`;
    else if(item.type==='fee') detail = `${item.data.plan||''} · ₹${item.data.amount||0} · ${item.data.month||''}`;
    else if(item.type==='expense') detail = `${item.data.desc||''} · ₹${item.data.amount||0}`;
    else if(item.type==='notice') detail = (item.data.body||'').substring(0,60)+'...';
    else if(item.type==='employee') detail = `${item.data.role||''} · ₹${item.data.salary||0}/month`;

    return `<div style="display:flex;align-items:flex-start;gap:12px;padding:14px 0;border-bottom:1px solid var(--border)">
      <div style="width:38px;height:38px;border-radius:10px;background:${color}22;border:1.5px solid ${color};display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${icon}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:800;font-size:13px;color:var(--ink)">${item.label}</div>
        <div style="font-size:11px;color:var(--ink3);margin-top:2px">${detail}</div>
        <div style="display:flex;gap:10px;margin-top:5px;flex-wrap:wrap;align-items:center">
          <span style="font-size:11px;color:${color};font-weight:700;background:${color}22;padding:2px 8px;border-radius:10px">${icon} ${item.type.charAt(0).toUpperCase()+item.type.slice(1)}</span>
          <span style="font-size:11px;color:var(--ink3)">🗑️ Deleted: ${deletedDate}</span>
          <span style="font-size:11px;color:${urgent?'var(--red)':'var(--orange)'};font-weight:800">${urgent?'⚠️':'⏳'} ${daysLeft}d left</span>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
        ${isAdmin()?`<button class="btn btn-green btn-sm" onclick="restoreFromBin('${item.id}')">♻️ Restore</button>`:''}
        ${isAdmin()?`<button class="btn btn-red btn-sm" onclick="permanentDeleteFromBin('${item.id}')">❌ Delete</button>`:''}
        ${!isAdmin()?`<span style="font-size:11px;color:var(--ink3);font-weight:700">👁️ View Only</span>`:''}
      </div>
    </div>`;
  }).join('');
}

function setBackupTab(tab, btn){
  ['main','bin'].forEach(t=>{ const el=document.getElementById('bk-'+t); if(el) el.style.display='none'; });
  const target=document.getElementById('bk-'+tab);
  if(target) target.style.display='block';
  document.querySelectorAll('.fee-tab[id^="bktab-"]').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  if(tab==='bin') renderRecycleBin();
  if(tab==='main') renderBackup();
}

// ═══ SEQUENTIAL RECEIPT NUMBER ══════════════════════════════════════════════
function getNextReceiptNumber(){
  // Server pe already kitne records hain usse sequence banao
  const seq = (feeRecords.length || 0) + 1;
  return 'REC-'+String(seq).padStart(4,'0')+'-'+Date.now().toString().slice(-4);
}

function confirmResetData(){
  if(!confirm('⚠️ This will delete ALL data and restore defaults. Are you sure?')) return;
  localStorage.removeItem(LS_KEY);
  feeStructure = JSON.parse(JSON.stringify(defaultData.feeStructure));
  members = JSON.parse(JSON.stringify(defaultData.members));
  feeRecords = JSON.parse(JSON.stringify(defaultData.feeRecords));
  attendance = JSON.parse(JSON.stringify(defaultData.attendance));
  notices = JSON.parse(JSON.stringify(defaultData.notices));
  buildSeats();
  renderDashboard();
  toast('🗑️ Data reset to defaults','var(--orange)');
  saveData();
}

// ═══ AUTO EXPIRE ══════════════════════════════════════════════════════════════
function autoMarkExpired(){
  const today = todayStr(); // YYYY-MM-DD IST
  members.forEach(m=>{
    if(!m.to) return;
    const toNorm = normDate(m.to); // handle all formats + ISO datetime
    if(toNorm && toNorm < today && m.feeStatus !== 'Expired'){
      m.feeStatus = 'Expired';
    }
  });
}
// ═══ UTILS ═══════════════════════════════════════════════════════════════════
const toast = (msg,c='var(--blue)') => {
  const t=document.getElementById('toast');
  if(!t) return;
  t.textContent=msg;
  t.style.borderLeftColor=c; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),3200);
};
const openModal = id => document.getElementById(id).classList.add('open');
const closeModal = id => document.getElementById(id).classList.remove('open');
const openBookSeat = () => { populateAllShiftDropdowns(); populateSeatModal(); openModal('modal-bookSeat'); };
const openAddMember = () => {
  _pendingAadharData = null; // reset pending aadhar
  document.getElementById('addMemberTitle').textContent='👤 Register New Member';
  document.getElementById('addMemberBtn').textContent='✅ Register';
  document.getElementById('am-editId').value='';
  document.getElementById('am-from').value=todayStr();
  ['am-id','am-name','am-phone','am-class','am-addr','am-guardian','am-gphone','am-aadhar','am-dob'].forEach(x=>document.getElementById(x).value='');
  document.getElementById('am-feeStatus').value='Due';
  const _cat=document.getElementById('am-category'); if(_cat) _cat.value='';
  const _prev=document.getElementById('am-aadharPreview'); if(_prev) _prev.innerHTML='';
  const _aph=document.getElementById('am-aadharPlaceholder'); if(_aph) _aph.style.display='block';
  const _af=document.getElementById('am-aadharFile'); if(_af) _af.value='';
  // Reset photo
  const _pf=document.getElementById('am-photo'); if(_pf) _pf.value='';
  const _pp=document.getElementById('am-photoPreview'); if(_pp){_pp.src='';_pp.style.display='none';}
  const _ph=document.getElementById('am-photoPlaceholder'); if(_ph) _ph.style.display='block';
  document.getElementById('am-id').disabled=false;
  populateAllShiftDropdowns();
  openModal('modal-addMember');
};
const openCollectFee = () => { populateAllShiftDropdowns(); populateFeeModal(); openModal('modal-collectFee'); };
const val = id => (document.getElementById(id)||{}).value?.trim()||'';
const todayStr = () => new Date().toLocaleDateString('en-CA', {timeZone:'Asia/Kolkata'}); // YYYY-MM-DD in IST
const nowTime  = () => new Date().toLocaleTimeString('en-IN', {timeZone:'Asia/Kolkata', hour:'2-digit', minute:'2-digit', hour12:false});
const fmtDate = d => {
  if(!d) return '—';
  let iso = d;
  // DD/MM/YYYY → YYYY-MM-DD
  if(/^\d{2}\/\d{2}\/\d{4}$/.test(d)) iso = d.split('/').reverse().join('-');
  // DD-MM-YYYY → YYYY-MM-DD
  else if(/^\d{2}-\d{2}-\d{4}$/.test(d)) { const p=d.split('-'); iso=`${p[2]}-${p[1]}-${p[0]}`; }
  // YYYY/MM/DD → YYYY-MM-DD
  else if(/^\d{4}\/\d{2}\/\d{2}$/.test(d)) iso = d.replaceAll('/','-');
  // ISO with time (2026-05-28T18:30:00.000Z etc) — sirf date part lo
  else if(/^\d{4}-\d{2}-\d{2}T/.test(d)) iso = d.slice(0,10);
  const dt = new Date(iso+'T05:30:00+05:30'); // IST noon — timezone shift se date galat na ho
  if(isNaN(dt)) return d; // jo bhi hai wahi dikhao
  return dt.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric',timeZone:'Asia/Kolkata'});
};
// Date ko YYYY-MM-DD mein normalize karo (comparison ke liye)
const toISO = d => {
  if(!d) return '';
  if(/^\d{2}\/\d{2}\/\d{4}$/.test(d)) return d.split('/').reverse().join('-');
  if(/^\d{2}-\d{2}-\d{4}$/.test(d)) { const p=d.split('-'); return `${p[2]}-${p[1]}-${p[0]}`; }
  if(/^\d{4}\/\d{2}\/\d{2}$/.test(d)) return d.replaceAll('/','-');
  // ISO datetime from server e.g. 2026-05-28T18:30:00.000Z — sirf date part lo (IST mein directly)
  if(/^\d{4}-\d{2}-\d{2}T/.test(d)){
    const dt = new Date(d);
    return dt.toLocaleDateString('en-CA', {timeZone:'Asia/Kolkata'});
  }
  return d;
};
// ✅ MONTH NORMALIZER — "may 2026", "MAY2026", "MAY 2026" → "May 2026"
const normalizeMonth = m => {
  if(!m) return '';
  const s = String(m).trim();
  // Handle "MAY2026" (no space)
  const noSp = s.replace(/([A-Za-z]+)(\d{4})/, '$1 $2');
  // Capitalize first letter only
  return noSp.replace(/^([a-z])/, c=>c.toUpperCase())
             .replace(/^([A-Z]+)(?=[a-z])/, w=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase())
             .replace(/^([A-Z]{2,})(\s)/, (_, word, sp) => word.charAt(0).toUpperCase()+word.slice(1).toLowerCase()+sp);
};
// ✅ MASTER DATE NORMALIZER — server ki ISO datetime ya koi bhi format → YYYY-MM-DD (IST)
const normDate = d => toISO(String(d||''));
const fmtAmt = n => '₹'+Number(n).toLocaleString('en-IN');
const fmtSeat = key => {
  if(!key && key!==0) return '—';
  const {prefix,no} = parseSeatKey(key);
  if(!no) return '—';
  return prefix ? prefix+no : String(no);
};
const shiftShort = s => s.replace(/ \(.*\)/,'');
const avatarColor = name => COLORS[name.charCodeAt(0)%COLORS.length];

// ═══ EXPIRY WARNING ═══════════════════════════════════════════════════════════
function renderExpiryWarnings(){
  const today = todayStr();
  const expiryQ = (document.getElementById('expirySearch')?.value||'').toLowerCase().trim();
  const soon = members.filter(m=>{
    if(!m.to) return false;
    const days = Math.ceil((new Date(toISO(m.to))-new Date(today))/(86400000));
    if(!(days>=-1 && days<=7)) return false;
    if(expiryQ && !(m.name||'').toLowerCase().includes(expiryQ) && !(m.id||'').toLowerCase().includes(expiryQ)) return false;
    return true;
  }).sort((a,b)=> new Date(a.to)-new Date(b.to)); // Nearest expiry first

  const el = document.getElementById('expiryWarnings');
  const countBadge = document.getElementById('expiry-count');
  const card = document.getElementById('expiryWarningsCard');
  if(!el) return;
  if(countBadge) countBadge.textContent = soon.length;
  if(card) card.style.display = soon.length ? '' : 'none';
  if(!soon.length){ el.innerHTML='<div style="color:var(--ink3);font-size:13px;padding:8px">No plans expiring in next 7 days 🎉</div>'; return; }

  // Send all button
  const sendAllBtn = soon.length > 1
    ? `<button class="btn btn-wa btn-sm" onclick="sendAllExpiryAlerts()" style="margin-bottom:12px">📲 Send All Reminders (${soon.length})</button>`
    : '';

  el.innerHTML = sendAllBtn + soon.map(m=>{
    const days = Math.ceil((new Date(toISO(m.to))-new Date(today))/(86400000));
    const dayLabel = days<0
      ? `<span style="color:var(--red);font-weight:900">EXPIRED ${Math.abs(days)} day(s) ago</span>`
      : days===0?'<span style="color:var(--red);font-weight:900">🚨 TODAY!</span>'
      : days===1?'<span style="color:var(--orange);font-weight:800">⚠️ TOMORROW</span>'
      :`in <strong>${days} days</strong>`;
    const rowBg = days<=1 ? 'background:var(--redl);border:1px solid var(--red);' : days<=3 ? 'background:var(--orangel);border:1px solid var(--orange);' : '';
    const waMsg = encodeURIComponent('⚠️ *Yugvandana Library — Plan Expiry Alert*\n\nDear *'+m.name+'*, 🙏\n\nYour library membership plan is expiring '+(days<=0?'TODAY':days===1?'tomorrow':'in '+days+' days')+' on *'+fmtDate(m.to)+'*.\n\n📋 *Your Details:*\n• Member ID: '+m.id+'\n• Plan: '+(m.plan||'—')+'\n• Shift: '+(shiftShort(m.shift)||'—')+'\n• Valid Till: '+fmtDate(m.to)+'\n\nPlease renew your plan to continue enjoying library services. 📚\n\nThank you!\n📍 Yugvandana Library\n📞 83498 52152');
    const waGuardMsg = encodeURIComponent('⚠️ *Yugvandana Library — Plan Expiry Alert*\n\nDear Guardian of *'+m.name+'*, 🙏\n\nYour ward\'s library membership plan is expiring '+(days<=0?'TODAY':days===1?'tomorrow':'in '+days+' days')+' on *'+fmtDate(m.to)+'*.\n\nKindly ensure timely renewal. 📚\n\nThank you!\n📍 Yugvandana Library\n📞 83498 52152');
    return `<div class="expiry-warn" style="${rowBg}display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px;border-radius:8px;padding:10px 14px">
      <div>
        <div style="font-weight:800;font-size:13px">⏳ ${m.name} <span style="font-size:10px;color:var(--ink3)">(${m.id} · Seat ${fmtSeat(m.seat)})</span></div>
        <div style="font-size:12px;margin-top:3px">Expires ${dayLabel} &nbsp;·&nbsp; <span style="color:var(--ink3)">${fmtDate(m.to)}</span></div>
        <div style="font-size:11px;color:var(--ink3);margin-top:2px">📞 ${m.phone||'—'} · 💳 ${m.plan||'—'}</div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;flex-wrap:wrap">
        <a href="https://wa.me/${m.phone}?text=${waMsg}" target="_blank" class="btn btn-wa btn-sm" style="text-decoration:none">📲 Student</a>
        ${m.gphone && m.gphone!==m.phone ? `<a href="https://wa.me/${m.gphone}?text=${waGuardMsg}" target="_blank" class="btn btn-wa btn-sm" style="text-decoration:none;background:#128c7e">👨‍👩‍👧 Guardian</a>` : ''}
        <button class="btn btn-green btn-sm" onclick="quickFee('${m.id}')">💰 Renew</button>
      </div>
    </div>`;
  }).join('');
}

function sendAllExpiryAlerts(){
  const today = todayStr();
  const soon = members.filter(m=>{
    if(!m.to||!m.phone) return false;
    const days = Math.ceil((new Date(toISO(m.to))-new Date(today))/86400000);
    return days>=-1 && days<=7;
  });
  if(!soon.length){ toast('No expiring members to alert','var(--ink3)'); return; }

  // Build modal with all WA links — popup blocker se bachne ka tarika
  const rows = soon.map(m=>{
    const days = Math.ceil((new Date(toISO(m.to))-new Date(today))/86400000);
    const dayLabel = days<0?`Expired ${Math.abs(days)}d ago`:days===0?'TODAY':days===1?'TOMORROW':`in ${days} days`;
    const bgColor = days<=0?'var(--redl)':days<=2?'var(--orangel)':'transparent';
    const waMsg = encodeURIComponent('⚠️ *Yugvandana Library — Plan Expiry Alert*\n\nDear *'+m.name+'*, 🙏\n\nYour library membership plan is expiring '+(days<=0?'TODAY':days===1?'tomorrow':'in '+days+' days')+' on *'+fmtDate(m.to)+'*.\n\n📋 *Your Details:*\n• Member ID: '+m.id+'\n• Plan: '+(m.plan||'—')+'\n• Shift: '+(shiftShort(m.shift)||'—')+'\n• Valid Till: '+fmtDate(m.to)+'\n\nPlease renew your plan to continue enjoying library services. 📚\n\nThank you!\n📍 Yugvandana Library\n📞 83498 52152');
    const waGuardMsg = m.gphone&&m.gphone!==m.phone ? encodeURIComponent('⚠️ *Yugvandana Library — Plan Expiry Alert*\n\nDear Guardian of *'+m.name+'*, 🙏\n\nYour ward\'s library membership plan is expiring '+(days<=0?'TODAY':days===1?'tomorrow':'in '+days+' days')+' on *'+fmtDate(m.to)+'*.\n\nKindly ensure timely renewal. 📚\n\nThank you!\n📍 Yugvandana Library\n📞 83498 52152') : null;
    return `<div style="display:flex;align-items:center;gap:8px;padding:10px 0;border-bottom:1px solid var(--border);flex-wrap:wrap;background:${bgColor};border-radius:6px;padding:8px 10px;margin-bottom:4px">
      <div style="flex:1;min-width:0">
        <div style="font-weight:800;font-size:13px">⏳ ${m.name} <span style="font-size:10px;color:var(--ink3)">${m.id}</span></div>
        <div style="font-size:11px;color:${days<=0?'var(--red)':days<=2?'var(--orange)':'var(--ink3)'}">📅 ${fmtDate(m.to)} · ${dayLabel}</div>
      </div>
      <div style="display:flex;gap:5px;flex-wrap:wrap">
        <a href="https://wa.me/${m.phone}?text=${waMsg}" target="_blank" class="btn btn-wa btn-sm" style="text-decoration:none">📲 Student</a>
        ${waGuardMsg?`<a href="https://wa.me/${m.gphone}?text=${waGuardMsg}" target="_blank" class="btn btn-wa btn-sm" style="text-decoration:none;background:#128c7e">👨‍👩‍👧 Guardian</a>`:''}
      </div>
    </div>`;
  }).join('');

  const old=document.getElementById('expiryAlertModal');
  if(old) old.remove();
  const overlay=document.createElement('div');
  overlay.id='expiryAlertModal';
  overlay.style.cssText='position:fixed;inset:0;background:#00000090;z-index:400;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .2s';
  overlay.innerHTML=`
    <div style="background:var(--card);border:2px solid var(--orange);border-radius:18px;width:100%;max-width:520px;box-shadow:var(--shadow2);animation:fadeUp .3s ease;overflow:hidden;display:flex;flex-direction:column;max-height:88vh">
      <div style="background:linear-gradient(135deg,var(--orangel),var(--yellowl));padding:14px 18px;display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid var(--orange)">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:1px;color:var(--orange)">⏳ Expiry Alerts — ${soon.length} Members</div>
        <button onclick="document.getElementById('expiryAlertModal').remove()" style="background:var(--bg3);border:1px solid var(--border2);color:var(--ink);width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:16px">✕</button>
      </div>
      <div style="padding:8px 16px 4px;font-size:12px;color:var(--orange);font-weight:700;background:var(--orangel);border-bottom:1px solid var(--orange)">
        ℹ️ Har member ke liye alag button hai — click karke WhatsApp mein bhejein
      </div>
      <div style="overflow-y:auto;padding:8px 16px;flex:1">${rows}</div>
      <div style="padding:12px 16px;border-top:1px solid var(--border);display:flex;justify-content:flex-end">
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('expiryAlertModal').remove()">✕ Close</button>
      </div>
    </div>`;
  overlay.addEventListener('click',e=>{ if(e.target===overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  toast(`⏳ ${soon.length} members ki expiry list ready`,'var(--orange)');
}

// ═══ NAV ══════════════════════════════════════════════════════════════════════
function nav(name, btn){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('nav button,.sidebar button').forEach(b=>b.classList.remove('active'));
  document.getElementById('page-'+name)?.classList.add('active');
  // Mark active: if btn passed use it, else find sidebar button by onclick containing the name
  if(btn){ btn.classList.add('active'); }
  else {
    const match = Array.from(document.querySelectorAll('.sidebar button')).find(b=>b.getAttribute('onclick')&&b.getAttribute('onclick').includes("'"+name+"'"));
    if(match) match.classList.add('active');
  }
  // Also sync More drawer button active state
  document.querySelectorAll('#sb-more-drawer button').forEach(b=>b.classList.remove('active'));
  const drawerMatch = Array.from(document.querySelectorAll('#sb-more-drawer button')).find(b=>b.dataset.page===name);
  if(drawerMatch) drawerMatch.classList.add('active');
  if(name==='dashboard') renderDashboard();
  if(name==='seats'){ renderSeats(); renderLockers(); }
  if(name==='members') renderMembers();
  if(name==='fees'){ renderFees(); renderDues(); renderFeeStructure(); }
  if(name==='attendance'){ document.getElementById('attDate').value=todayStr(); renderAttendance(); }
  if(name==='enquiry') renderEnquiry();
  if(name==='notices') renderNotices();
  if(name==='expenses') renderExpenses();
  if(name==='salary') renderSalary();
  if(name==='reports'){ renderPL(); renderLeaderboard(); renderRetention(); renderHeatmap(); renderIncomeVsTarget(); renderInactive(30); }
  if(name==='backup') renderBackup();
  if(name==='settings') renderSettings();
}

// ═══ DASHBOARD ═══════════════════════════════════════════════════════════════
function renderDashboard(){
  if(!Array.isArray(members)) members = [];
  if(!Array.isArray(feeRecords)) feeRecords = [];
  if(!Array.isArray(attendance)) attendance = [];
  if(!Array.isArray(expenses)) expenses = [];
  if(!Array.isArray(employees)) employees = [];
  if(!Array.isArray(salaryRecords)) salaryRecords = [];
  if(!seats || !seats.length) buildSeats();
  autoMarkExpired();
  loadAppSettings();
  const totalSeats = (appSettings.seats && appSettings.seats.total) ? appSettings.seats.total : 79;
  const occupied = seats.filter(s=>s.occupied).length;
  const free = totalSeats - occupied;
  const due = members.filter(m=>m.feeStatus==='Due');
  const expired = members.filter(m=>m.feeStatus==='Expired');
  const todayAtt = attendance.filter(a=>a.date===todayStr()&&a.present);
  const totalRev = feeRecords.reduce((s,r)=>s+(parseFloat(r.paidAmount)||parseFloat(r.amount)||0),0);
  const todayIncome = feeRecords.filter(r=>normDate(r.date)===todayStr()).reduce((s,r)=>s+(parseFloat(r.paidAmount)||parseFloat(r.amount)||0),0);
  const allEnquiries = getEnquiries();
  const pendingEnqs = allEnquiries.filter(e=>e.status==='Pending'||e.status==='Follow Up').length;
  const joinedEnqs  = allEnquiries.filter(e=>e.status==='Joined').length;
  const thisMonthStr = todayStr().slice(0,7);
  const monthlyIncome = feeRecords.filter(r=>r.date&&normDate(r.date).startsWith(thisMonthStr)).reduce((s,r)=>s+(parseFloat(r.paidAmount)||parseFloat(r.amount)||0),0);
  const monthlyReceipts = feeRecords.filter(r=>r.date&&normDate(r.date).startsWith(thisMonthStr)).length;

  const MONTHLY_TARGET_DASH = (appSettings.monthlyTarget)||70000;
  const tPctDash = Math.min(100, Math.round((monthlyIncome / MONTHLY_TARGET_DASH) * 100));
  const tColorDash = tPctDash>=100?'var(--green)':tPctDash>=60?'var(--yellow)':'var(--red)';

  document.getElementById('stats-row').innerHTML = [
    {icon:'🎯',val:fmtAmt(monthlyIncome),label:'Monthly Income',color:tColorDash,sub:`${tPctDash}% of target`},
    {icon:'💰',val:fmtAmt(totalRev),label:'Total Revenue',color:'var(--green)',sub:`${feeRecords.length} receipts`},
    {icon:'👥',val:members.length,label:'Total Members',color:'var(--blue)',sub:`${expired.length} expired`},
    {icon:'🪑',val:free+'/'+totalSeats,label:'Free Seats',color:'var(--teal)',sub:`${occupied} occupied`},
    {icon:'⚠️',val:due.length+expired.length,label:'Fee Due',color:'var(--red)',sub:`${expired.length} expired plans`},
    {icon:'📋',val:todayAtt.length,label:'Present Today',color:'var(--purple)',sub:`Out of ${members.length}`},
    {icon:'📅',val:fmtAmt(todayIncome),label:"Today's Income",color:'var(--orange)',sub:`${feeRecords.filter(r=>normDate(r.date)===todayStr()).length} receipts`},
    {icon:'📝',val:allEnquiries.length,label:'Enquiries',color:'var(--blue)',sub:`${pendingEnqs} pending`},
  ].map((s,i)=>`
    <div class="scard" style="animation:fadeUp .3s ease ${i*.07}s both">
      <div class="scard-accent" style="background:${s.color}"></div>
      <div class="scard-icon">${s.icon}</div>
      <div class="scard-val">${s.val}</div>
      <div class="scard-label">${s.label}</div>
      <div class="scard-sub" style="background:${s.color}22;color:${s.color}">${s.sub}</div>
    </div>`).join('');

  renderExpiryWarnings();
  renderBirthdaySection();
  renderTargetAndLagat();
  setTimeout(drawCharts, 150);
  updateNotifBadge();
}

function renderTargetAndLagat(){
  const MONTHLY_TARGET = 70000;
  const TOTAL_LAGAT    = 1000000; // ₹10 lakh
  const MONTHLY_RECOVERY = 30000; // ₹30,000/month recovery

  // This month revenue — actual collected (paidAmount)
  const thisMonth = todayStr().slice(0,7);
  const monthRev = feeRecords
    .filter(r => r.date && normDate(r.date).startsWith(thisMonth))
    .reduce((s,r) => s + (parseFloat(r.paidAmount)||parseFloat(r.amount)||0), 0);

  // Total revenue so far (for lagat recovery) — actual collected (gross)
  const totalRev = feeRecords.reduce((s,r) => s + (parseFloat(r.paidAmount)||parseFloat(r.amount)||0), 0);
  // Lagat recovery = total collected revenue (same consistent source)
  const netRecovered = totalRev;
  const lagatLeft = Math.max(0, TOTAL_LAGAT - netRecovered);
  const monthsLeft = lagatLeft > 0 ? Math.ceil(lagatLeft / MONTHLY_RECOVERY) : 0;
  // Note: monthRev is defined above for Monthly Target; totalRev used for Lagat Recovery

  // ── Target Progress ──
  const tPct = Math.min(100, Math.round((monthRev / MONTHLY_TARGET) * 100));
  const tColor = tPct >= 100 ? 'var(--green)' : tPct >= 60 ? 'var(--yellow)' : 'var(--red)';
  const tRemain = Math.max(0, MONTHLY_TARGET - monthRev);
  const tEl = document.getElementById('targetProgress');
  if(tEl) tEl.innerHTML = `
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px">
        <span style="font-weight:700;font-size:16px;color:${tColor}">₹${monthRev.toLocaleString('en-IN')}</span>
        <span style="color:var(--ink3)">of ₹${MONTHLY_TARGET.toLocaleString('en-IN')}</span>
      </div>
      <div style="background:var(--bg3);border-radius:20px;height:14px;overflow:hidden;border:1px solid var(--border)">
        <div style="width:${tPct}%;height:100%;background:${tColor};border-radius:20px;transition:width .6s ease;position:relative">
          ${tPct>15?`<span style="position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:10px;font-weight:900;color:#fff">${tPct}%</span>`:''}
        </div>
      </div>
      <div style="margin-top:8px;font-size:12px;color:var(--ink3)">
        ${tPct>=100
          ? '<span style="color:var(--green);font-weight:800">🎉 Target achieved this month!</span>'
          : `<span style="color:${tColor};font-weight:700">₹${tRemain.toLocaleString('en-IN')} remaining</span> to reach target`}
      </div>
    </div>`;

  // ── Lagat Recovery Progress ──
  const lPct = Math.min(100, Math.round((netRecovered / TOTAL_LAGAT) * 100));
  const lColor = lPct >= 75 ? 'var(--green)' : lPct >= 40 ? 'var(--yellow)' : 'var(--orange)';
  const lEl = document.getElementById('lagatProgress');
  if(lEl) lEl.innerHTML = `
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px">
        <span style="font-weight:700;font-size:16px;color:${lColor}">₹${netRecovered.toLocaleString('en-IN')} recovered</span>
        <span style="color:var(--ink3)">of ₹${TOTAL_LAGAT.toLocaleString('en-IN')}</span>
      </div>
      <div style="background:var(--bg3);border-radius:20px;height:14px;overflow:hidden;border:1px solid var(--border)">
        <div style="width:${lPct}%;height:100%;background:${lColor};border-radius:20px;transition:width .6s ease;position:relative">
          ${lPct>15?`<span style="position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:10px;font-weight:900;color:#fff">${lPct}%</span>`:''}
        </div>
      </div>
      <div style="margin-top:8px;font-size:12px;color:var(--ink3)">
        ${lPct>=100
          ? '<span style="color:var(--green);font-weight:800">🎉 Puri lagat recover ho gayi!</span>'
          : `<span style="color:${lColor};font-weight:700">₹${lagatLeft.toLocaleString('en-IN')} baaki</span>
             · @₹30k/mo = <span style="font-weight:800;color:var(--orange)">${monthsLeft} mahine</span> aur`}
      </div>
    </div>`;
}

// ═══ SEATS ════════════════════════════════════════════════════════════════════
function renderZonePricingStrip(){
  loadAppSettings();
  const s = appSettings.seats || {};
  const zR = s.zoneRed || 50;
  const total = s.total || 79;

  // Prices from feeStructure
  const redAmt  = (feeStructure['Half Day']||{})['Morning'] || 0;
  const blueAmt = (feeStructure['Full Day']||{})['Morning'] || 0;

  const zones = [
    {emoji:'🔴',name:'Red Zone',label:'Half Day',amt:redAmt,from:1,to:zR,color:'red',badge:''},
    {emoji:'🔵',name:'Blue Zone',label:'Full Day',amt:blueAmt,from:zR+1,to:total,color:'blue',badge:'RESERVED'},
  ];

  const stripEl = document.getElementById('zonePricingStrip');
  if(stripEl) stripEl.innerHTML = zones.map(z=>`
    <div class="zpcard" style="background:var(--${z.color}l);border-color:var(--${z.color})">
      ${z.badge?`<div class="zpcard-badge" style="background:var(--${z.color});color:#fff">${z.badge}</div>`:''}
      <div style="font-size:20px">${z.emoji}</div>
      <div class="zpcard-num" style="color:var(--${z.color})">${z.name}</div>
      <div class="zpcard-label" style="color:var(--${z.color})">${z.label}</div>
      <div class="zpcard-seats" style="color:var(--${z.color})">Seats ${z.from}–${z.to} &nbsp;·&nbsp; ${z.to-z.from+1} Seats</div>
    </div>`).join('');

  const legendEl = document.getElementById('seatLegend');
  if(legendEl) legendEl.innerHTML = zones.map(z=>`
    <div class="sl-item"><div class="sl-dot" style="background:var(--${z.color}l);border:2px solid var(--${z.color})"></div>${z.name.replace(' Zone','')} — ${z.label}</div>
  `).join('')+`
    <div class="sl-item"><div class="sl-dot" style="background:#1a0a0a;border:2px solid #4a1a1a"></div>Occupied</div>
    <div class="sl-item"><div class="sl-dot" style="background:var(--blue);border:2px solid var(--blue)"></div>Selected</div>`;
}

function renderSeats(){
  renderZonePricingStrip();
  loadAppSettings();
  const total = (appSettings.seats && appSettings.seats.total) ? appSettings.seats.total : 79;
  const sts = appSettings.shifts || {};
  const fmtT = t => { const [h,m]=(t||'').split(':'); const hr=+h; return (hr%12||12)+':'+(m||'00')+(hr<12?'AM':'PM'); };
  const mTiming = document.getElementById('morning-timing');
  const eTiming = document.getElementById('evening-timing');
  if(mTiming) mTiming.textContent = fmtT(sts.morningStart||'06:00')+' – '+fmtT(sts.morningEnd||'13:00');
  if(eTiming) eTiming.textContent = fmtT(sts.eveningStart||'13:00')+' – '+fmtT(sts.eveningEnd||'20:00');
  const nTiming = document.getElementById('night-timing');
  if(nTiming) nTiming.textContent = fmtT(sts.nightStart||'20:00')+' – '+fmtT(sts.nightEnd||'24:00');

  // Build a single chair-shaped seat HTML
  function buildSeatHtml(s, cls, tipTxt, extraDot, shiftKey, prefix, flipped){
    const tip = `<div class="seat-tooltip">${tipTxt}</div>`;
    const label = prefix ? `${prefix}${s.no}` : s.no;
    const flipCls = flipped ? ' flip' : '';
    return `<div class="seat ${cls}${flipCls}" onclick="clickSeat(${s.no},'${shiftKey}')">
      ${tip}
      <div class="seat-back"></div>
      <div class="seat-body">${extraDot}<span>${label}</span></div>
    </div>`;
  }

  // Row layout:
  // Row A  → 1–21  single row (normal, facing down toward viewer)
  // Row B  → top:  22–41 flipped (facing aisle = down)
  //          aisle gap
  //          bottom: 42–61 normal (facing aisle = up)
  // Row C  → top:  62–70 flipped
  //          aisle gap
  //          bottom: 71–79 normal
  function buildRowLayout(seatsArr, getClsFn, getTipFn, getDotFn, shiftKey, prefix){
    const byNo = {};
    seatsArr.forEach(s=>{ byNo[s.no]=s; });
    const mkSeat = (no, flipped)=>{ const s=byNo[no]; if(!s) return ''; return buildSeatHtml(s,getClsFn(s),getTipFn(s),getDotFn(s),shiftKey,prefix||'',flipped); };

    const rowA   = Array.from({length:21},(_,i)=>i+1);
    const rowBTop= Array.from({length:20},(_,i)=>i+22);
    const rowBBot= Array.from({length:20},(_,i)=>i+42);
    const rowCTop= Array.from({length:9}, (_,i)=>i+62);
    const rowCBot= Array.from({length:9}, (_,i)=>i+71);

    // Helper: split array into chunks
    const chunk = (arr, size) => Array.from({length:Math.ceil(arr.length/size)},(_,i)=>arr.slice(i*size,(i+1)*size));
    const COLS = 10; // seats per row line

    // Render a set of seat-numbers as multiple wrapped rows
    const mkRows = (arr, flipped, extraGap) => chunk(arr, COLS).map((line, idx) =>
      `<div class="seat-row${flipped?' row-top':''}" style="margin-bottom:${(extraGap&&idx<chunk(arr,COLS).length-1)?'0':'4px'}">${line.map(n=>mkSeat(n,flipped)).join('')}</div>`
    ).join('');

    return `<div class="seatmap-container">
      <div style="margin-bottom:8px">
        <div style="font-size:8px;font-weight:800;color:var(--ink3);letter-spacing:.5px;margin-bottom:3px;opacity:.6">ROW A</div>
        ${mkRows(rowA, false, false)}
      </div>
      <div style="margin-bottom:8px">
        <div style="font-size:8px;font-weight:800;color:var(--ink3);letter-spacing:.5px;margin-bottom:3px;opacity:.6">ROW B</div>
        ${mkRows(rowBTop, true, true)}
        <div class="seat-aisle-gap"><span class="seat-aisle-gap-label">AISLE</span></div>
        ${mkRows(rowBBot, false, false)}
      </div>
      <div>
        <div style="font-size:8px;font-weight:800;color:var(--ink3);letter-spacing:.5px;margin-bottom:3px;opacity:.6">ROW C</div>
        ${mkRows(rowCTop, true, true)}
        <div class="seat-aisle-gap"><span class="seat-aisle-gap-label">AISLE</span></div>
        ${mkRows(rowCBot, false, false)}
      </div>
    </div>`;
  }

  // Render one grid for a specific shift
  function renderGrid(gridId, shiftKey){
    const el = document.getElementById(gridId);
    if(!el) return;
    const selNo = shiftKey==='morning' ? selectedSeatNoMorning : selectedSeatNoEvening;
    el.style.display = 'block';
    el.innerHTML = buildRowLayout(
      seats,
      (s)=>{ const mem=shiftKey==='morning'?s.morningMember:s.eveningMember; const occ=!!mem; const zone=getSeatZone(s.no); return occ?'occupied':(selNo===s.no?'selected':`free zone-${zone}`); },
      (s)=>{ const mem=shiftKey==='morning'?s.morningMember:s.eveningMember; const occ=!!mem; const zone=getSeatZone(s.no); return occ&&mem?`${mem.name}<br>${mem.plan}`:`${zone.charAt(0).toUpperCase()+zone.slice(1)} Zone`; },
      (s)=>{ const mem=shiftKey==='morning'?s.morningMember:s.eveningMember; const occ=!!mem; const otherMem=shiftKey==='morning'?s.eveningMember:s.morningMember; return (!occ&&otherMem)?`<div style="position:absolute;top:1px;right:1px;width:5px;height:5px;border-radius:50%;background:var(--orange)"></div>`:''; },
      shiftKey,''
    );
  }
  renderGrid('seatMapMorning','morning');
  renderGrid('seatMapEvening','evening');

  // ─── NIGHT seatmap ─────────────────────────────────────────────────
  const nightEl = document.getElementById('seatMapNight');
  if(nightEl){
    nightEl.style.display='block';
    nightEl.innerHTML = buildRowLayout(
      seats,
      (s)=>{ const nm=(s.allMembers||[]).find(m=>shiftsOverlap(m.shift,'Night')); const zone=getSeatZone(s.no); return nm?'occupied':`free zone-${zone}`; },
      (s)=>{ const nm=(s.allMembers||[]).find(m=>shiftsOverlap(m.shift,'Night')); const zone=getSeatZone(s.no); return nm?`${nm.name}<br>Night`:`${zone.charAt(0).toUpperCase()+zone.slice(1)} Zone`; },
      ()=>'','night','N'
    );
  }
  // Night stats & holders
  const nightMembers = members.filter(m=>m.shift.includes('Night'));
  const nightOccupied = nightMembers.filter(m=>m.seat).length;
  const nightFree = total - nightOccupied;
  const nBadge = document.getElementById('night-stats-badge');
  if(nBadge) nBadge.textContent = `${nightMembers.length} Members · ${nightFree} Seats Free`;
  const nStats = document.getElementById('nightStats');
  if(nStats) nStats.innerHTML = [
    {label:'Total',val:total,color:'var(--purple)'},
    {label:'Occupied',val:nightOccupied,color:'var(--red)'},
    {label:'Free',val:nightFree,color:'var(--green)'},
    {label:'Fill',val:Math.round(nightOccupied/total*100)+'%',color:'var(--yellow)'},
  ].map(s=>`<span style="font-weight:800;color:${s.color}">${s.label}: ${s.val}</span>`).join('');
  const nHolders = document.getElementById('nightHolders');
  if(nHolders) nHolders.innerHTML = nightMembers.length ? nightMembers.map(m=>`
    <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
      <div style="width:26px;height:26px;border-radius:7px;background:${m.color};display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:11px;flex-shrink:0">${m.name[0]}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.name}</div>
        <div style="color:var(--ink3);font-size:10.5px">Seat ${fmtSeat(m.seat)} · ${m.plan} · <span style="color:var(--purple);font-weight:800">Night</span> · <span style="color:${m.feeStatus==='Paid'?'var(--green)':m.feeStatus==='Expired'?'var(--red)':'var(--orange)'}">${m.feeStatus}</span></div>
      </div>
      <button class="btn btn-red btn-sm btn-icon" style="flex-shrink:0" onclick="releaseSeat('${m.id}')" title="Release">✕</button>
    </div>`).join('')
  : '<div style="color:var(--ink3);text-align:center;padding:14px;font-size:12px">No Night shift members yet</div>';

  // ─── FULL DAY seatmap ─────────────────────────────────────────────
  const fdTimingEl = document.getElementById('fullday-timing');
  if(fdTimingEl) fdTimingEl.textContent = fmtT(sts.morningStart||'06:00')+' – '+fmtT(sts.eveningEnd||'20:00');

  const fdEl = document.getElementById('seatMapFullDay');
  if(fdEl){
    fdEl.style.display='block';
    fdEl.innerHTML = buildRowLayout(
      seats,
      (s)=>{ const fm=(s.allMembers||[]).find(m=>shiftsOverlap(m.shift,'Full Day')); const zone=getSeatZone(s.no); return fm?'occupied':`free zone-${zone}`; },
      (s)=>{ const fm=(s.allMembers||[]).find(m=>shiftsOverlap(m.shift,'Full Day')); const zone=getSeatZone(s.no); return fm?`${fm.name}<br>${shiftShort(fm.shift)}`:`${zone.charAt(0).toUpperCase()+zone.slice(1)} Zone`; },
      ()=>'','fullday','F'
    );
  }

  // Full Day stats
  const fdMembers = members.filter(m=>m.shift.includes('Full Day')||m.shift.includes('Full'));
  const fdOccupied = fdMembers.filter(m=>m.seat).length;
  const fdFree = total - fdOccupied;
  const fdBadge = document.getElementById('fullday-stats-badge');
  if(fdBadge) fdBadge.textContent = `${fdMembers.length} Members · ${fdFree} Seats Free`;
  const fdStats = document.getElementById('fulldayStats');
  if(fdStats) fdStats.innerHTML = [
    {label:'Total',val:total,color:'var(--purple)'},
    {label:'Occupied',val:fdOccupied,color:'var(--red)'},
    {label:'Free',val:fdFree,color:'var(--green)'},
    {label:'Fill',val:Math.round(fdOccupied/total*100)+'%',color:'var(--yellow)'},
  ].map(s=>`<span style="font-weight:800;color:${s.color}">${s.label}: ${s.val}</span>`).join('');
  const fdHolders = document.getElementById('fulldayHolders');
  if(fdHolders) fdHolders.innerHTML = fdMembers.length ? fdMembers.map(m=>`
    <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
      <div style="width:26px;height:26px;border-radius:7px;background:${m.color};display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:11px;flex-shrink:0">${m.name[0]}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.name}</div>
        <div style="color:var(--ink3);font-size:10.5px">Seat ${fmtSeat(m.seat)} · ${m.plan} · <span style="color:var(--purple);font-weight:800">Full Day</span> · <span style="color:${m.feeStatus==='Paid'?'var(--green)':m.feeStatus==='Expired'?'var(--red)':'var(--orange)'}">${m.feeStatus}</span></div>
      </div>
      <button class="btn btn-red btn-sm btn-icon" style="flex-shrink:0" onclick="releaseSeat('${m.id}')" title="Release">✕</button>
    </div>`).join('')
  : '<div style="color:var(--ink3);text-align:center;padding:14px;font-size:12px">No Full Day members yet</div>';
  // ─────────────────────────────────────────────────────────────────────

  // Stats & Holders for each shift
  function renderShiftInfo(shiftKey, badgeId, statsId, holdersId){
    const getMem = s => shiftKey==='morning' ? s.morningMember : s.eveningMember;
    const occupied = seats.filter(s=>!!getMem(s)).length;
    const free = total - occupied;
    const badge = document.getElementById(badgeId);
    if(badge) badge.textContent = `${free} Free · ${occupied} Occupied`;
    const statsEl = document.getElementById(statsId);
    if(statsEl) statsEl.innerHTML = [
      {label:'Total',val:total,color:'var(--blue)'},
      {label:'Occupied',val:occupied,color:'var(--red)'},
      {label:'Free',val:free,color:'var(--green)'},
      {label:'Fill',val:Math.round(occupied/total*100)+'%',color:'var(--yellow)'},
    ].map(s=>`<span style="font-weight:800;color:${s.color}">${s.label}: ${s.val}</span>`).join('');
    const holdersEl = document.getElementById(holdersId);
    if(!holdersEl) return;
    const shiftFilter = shiftKey==='morning'
      ? m=>m.shift.includes('Morning')||m.shift.includes('Full Day')
      : m=>m.shift.includes('Evening')||m.shift.includes('Full Day');
    const holders = members.filter(shiftFilter);
    holdersEl.innerHTML = holders.length ? holders.map(m=>`
      <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
        <div style="width:26px;height:26px;border-radius:7px;background:${m.color};display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:11px;flex-shrink:0">${m.name[0]}</div>
        <div style="flex:1;min-width:0"><div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.name}</div><div style="color:var(--ink3);font-size:10.5px">Seat ${fmtSeat(m.seat)} · ${m.plan}</div></div>
        <button class="btn btn-red btn-sm btn-icon" style="flex-shrink:0" onclick="releaseSeat('${m.id}')" title="Release">✕</button>
      </div>`).join('')
    : '<div style="color:var(--ink3);text-align:center;padding:14px;font-size:12px">No members in this shift</div>';
  }
  renderShiftInfo('morning','morning-stats-badge','morningStats','morningHolders');
  renderShiftInfo('evening','evening-stats-badge','eveningStats','eveningHolders');

  // ─── Custom Shift Seat Maps ────────────────────────────────────────────────
  const customShiftsData = getCustomShifts();
  const csContainer = document.getElementById('customShiftSeatMaps');
  if(csContainer){
    if(!customShiftsData.length){
      csContainer.innerHTML = '';
    } else {
      const colors = ['var(--teal)','var(--yellow)','var(--purple)','var(--green)','var(--red)','var(--blue)','var(--orange)'];
      const lightColors = ['var(--teall)','var(--yellowl)','var(--purplel)','var(--greenl)','var(--redl)','var(--bluel)','var(--orangel)'];
      csContainer.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:8px">` +
        customShiftsData.map((s, i)=>{
          const col = colors[i % colors.length];
          const lcol = lightColors[i % lightColors.length];
          const safeId = s.id.replace(/[^a-z0-9_]/gi,'_');
          const fmtT = t => { if(!t) return ''; const [h,m]=t.split(':'); const hr=+h; return (hr%12||12)+':'+(m||'00')+(hr<12?'AM':'PM'); };
          const sn = s.name.toLowerCase();
          // Time overlap se members filter karo — name match + time overlap
          const shiftMembers = members.filter(m => {
            if(!m.shift) return false;
            return shiftsOverlap(m.shift, s.name);
          });
          // Exact match — sirf jo exactly is shift mein registered hain
          const exactShiftMembers = members.filter(m => m.shift && m.shift.startsWith(s.name));
          const occupied = shiftMembers.filter(m=>m.seat).length;
          const free = total - occupied;
          // Seat prefix for display
          const dispPfx = (s.prefix && s.prefix.trim()) ? s.prefix.trim().toUpperCase() : '';
          return `<div class="card" style="padding:16px 12px;border:2px solid ${col}">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:6px">
              <div>
                <div style="font-family:'Bebas Neue',sans-serif;font-size:17px;letter-spacing:1px;color:${col}">⏰ ${s.name}</div>
                <div style="font-size:11px;color:var(--ink3)">${fmtT(s.start)} – ${fmtT(s.end)}</div>
              </div>
              <span style="font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px;background:${lcol};color:${col}">${exactShiftMembers.length} Members · ${free} Seats Free</span>
            </div>
            <div id="seatMap_${safeId}" style="display:grid;grid-template-columns:repeat(10,1fr);gap:5px;margin-bottom:10px"></div>
            <div id="stats_${safeId}" style="font-size:11.5px;color:var(--ink2);padding:8px 0;border-top:1px solid var(--border);display:flex;gap:12px;flex-wrap:wrap"></div>
            <div style="font-size:11px;font-weight:800;color:var(--ink3);margin:8px 0 4px;text-transform:uppercase;letter-spacing:.5px">Seat Holders</div>
            <div id="holders_${safeId}" style="max-height:160px;overflow-y:auto;font-size:12px"></div>
          </div>`;
        }).join('') + `</div>`;

      // Now populate each custom shift's seat map
      customShiftsData.forEach((s, i)=>{
        const safeId = s.id.replace(/[^a-z0-9_]/gi,'_');
        const col = colors[i % colors.length];
        const mapEl = document.getElementById('seatMap_'+safeId);
        const statsEl = document.getElementById('stats_'+safeId);
        const holdersEl = document.getElementById('holders_'+safeId);
        // Time overlap se members filter — sirf wo members jo is shift se overlap karte hain
        const shiftMembers = members.filter(m => m.shift && shiftsOverlap(m.shift, s.name));
        const occupied = shiftMembers.filter(m=>m.seat).length;
        const free = total - occupied;
        // Seat prefix for display
        const dispPrefix = (s.prefix && s.prefix.trim()) ? s.prefix.trim().toUpperCase() : (safeId.slice(0,2).toUpperCase() || 'C');

        if(mapEl){
          mapEl.style.display='block';
          mapEl.innerHTML = buildRowLayout(
            seats,
            (seat)=>{ const mem=(seat.allMembers||[]).find(m=>shiftsOverlap(m.shift,s.name)); const zone=getSeatZone(seat.no); return mem?'occupied':`free zone-${zone}`; },
            (seat)=>{ const mem=(seat.allMembers||[]).find(m=>shiftsOverlap(m.shift,s.name)); const zone=getSeatZone(seat.no); return mem?`${mem.name}<br>${s.name}`:`${zone.charAt(0).toUpperCase()+zone.slice(1)} Zone`; },
            ()=>'',`custom_${s.id}`,dispPrefix
          );
        }
        if(statsEl){
          statsEl.innerHTML = [
            {label:'Total',val:total,color:col},
            {label:'Occupied',val:occupied,color:'var(--red)'},
            {label:'Free',val:free,color:'var(--green)'},
            {label:'Fill',val:Math.round(occupied/total*100)+'%',color:'var(--yellow)'},
          ].map(st=>`<span style="font-weight:800;color:${st.color}">${st.label}: ${st.val}</span>`).join('');
        }
        if(holdersEl){
          // Sirf wo members dikhao jinki shift mein is custom shift ka exact name ho
          const exactMembers = members.filter(m => m.shift && m.shift.startsWith(s.name));
          holdersEl.innerHTML = exactMembers.length ? exactMembers.map(m=>`
            <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
              <div style="width:26px;height:26px;border-radius:7px;background:${m.color};display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:11px;flex-shrink:0">${m.name[0]}</div>
              <div style="flex:1;min-width:0">
                <div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.name}</div>
                <div style="color:var(--ink3);font-size:10.5px">Seat ${fmtSeat(m.seat)} · ${m.plan}</div>
              </div>
              <button class="btn btn-red btn-sm btn-icon" style="flex-shrink:0" onclick="releaseSeat('${m.id}')" title="Release">✕</button>
            </div>`).join('')
          : `<div style="color:var(--ink3);text-align:center;padding:14px;font-size:12px">No members in ${s.name} shift</div>`;
        }
      });
    }
  }
}

function setShift(s,btn){
  currentShift=s; // still used by bookSeat modal context
  renderSeats();
}

function clickSeat(no, shiftKey){
  const seatData = seats.find(s=>s.no===no);
  if(!seatData) return;

  // Determine which member is in this shift using time overlap
  let shiftMember;
  if(shiftKey==='morning' || shiftKey==='evening' || shiftKey==='night' || shiftKey==='fullday'){
    const shiftName = shiftKey==='morning'?'Morning':shiftKey==='evening'?'Evening':shiftKey==='night'?'Night':'Full Day';
    shiftMember = (seatData.allMembers||[]).find(m => shiftsOverlap(m.shift, shiftName));
  } else if(shiftKey && shiftKey.startsWith('custom_')){
    // Custom shift — ID se shift naam nikalo
    const csId = shiftKey.replace('custom_','');
    const cs = (appSettings.customShifts||[]).find(s=>s.id===csId);
    shiftMember = cs ? (seatData.allMembers||[]).find(m => shiftsOverlap(m.shift, cs.name)) : null;
  } else {
    shiftMember = seatData.morningMember;
  }

  if(shiftMember){
    // Show occupied seat popup
    const zone = getSeatZone(no);
    const zoneColor = zone==='blue'?'var(--blue)':'var(--red)';
    const zoneName = zone==='blue'?'🔵 Blue Zone':'🔴 Red Zone';
    const shiftLabel = shiftKey==='fullday' ? '🌐 Full Day (6AM–8PM)'
      : shiftKey==='morning'
      ? (shiftMember.shift.includes('Full Day')?'🌐 Full Day':'🌅 Morning Shift')
      : '🌆 Evening Shift';

    const m = shiftMember;
    const statusColor = m.feeStatus==='Paid'?'var(--green)':m.feeStatus==='Expired'?'var(--red)':'var(--yellow)';
    const existing = document.getElementById('seat-detail-popup');
    if(existing) existing.remove();
    const popup = document.createElement('div');
    popup.id='seat-detail-popup';
    popup.style.cssText='position:fixed;inset:0;background:#00000090;z-index:400;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .2s;';
    popup.innerHTML=`
      <div style="background:var(--card);border:2px solid ${zoneColor};border-radius:18px;padding:24px;width:100%;max-width:440px;box-shadow:var(--shadow2);animation:fadeUp .3s ease;max-height:90vh;overflow-y:auto">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:1px;color:var(--ink)">🪑 Seat ${no} <span style="font-size:13px;color:${zoneColor}">${zoneName}</span></div>
          <button onclick="document.getElementById('seat-detail-popup').remove()" style="background:var(--bg3);border:1px solid var(--border2);color:var(--ink);width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center">✕</button>
        </div>
        ${seatData.morningMember && seatData.eveningMember ? `<div style="font-size:11px;color:var(--orange);font-weight:800;padding:5px 12px;background:var(--orangel);border-radius:8px;margin-bottom:12px;border:1px solid var(--orange)">⚡ Dual Shift — Morning + Evening dono booked</div>` : ''}
        <div style="font-size:10px;color:${zoneColor};font-weight:800;letter-spacing:.5px;text-transform:uppercase;margin-bottom:8px">${shiftLabel}</div>
        <div style="background:var(--bg3);border:1px solid var(--border);border-radius:12px;padding:14px">
          <div style="display:flex;align-items:center;gap:12px">
            ${m.photo ? `<img src="${m.photo}" style="width:48px;height:48px;border-radius:10px;object-fit:cover;border:2px solid ${zoneColor};flex-shrink:0"/>`
              : `<div style="width:48px;height:48px;border-radius:10px;background:${m.color||'var(--blue)'};display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:#fff;flex-shrink:0">${(m.name||'?')[0]}</div>`}
            <div style="flex:1">
              <div style="font-weight:900;font-size:15px;color:var(--ink)">${m.name||'—'}</div>
              <div style="font-size:11px;color:var(--ink3);margin-top:2px">${m.id||'—'} · ${m.cls||'—'}</div>
              <div style="margin-top:5px;display:flex;gap:6px;flex-wrap:wrap">
                <span style="background:${statusColor}22;color:${statusColor};font-size:11px;font-weight:800;padding:2px 9px;border-radius:20px;border:1px solid ${statusColor}">${m.feeStatus||'—'}</span>
                <span style="background:var(--bluel);color:var(--blue);font-size:11px;font-weight:700;padding:2px 9px;border-radius:20px">${m.plan||'—'}</span>
              </div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:10px;font-size:12px">
            <div style="color:var(--ink3)">📞 <b style="color:var(--ink)">${m.phone||'—'}</b></div>
            <div style="color:var(--ink3)">📅 Till <b style="color:var(--ink)">${m.to?fmtDate(m.to):'—'}</b></div>
          </div>
          <div style="display:flex;gap:6px;margin-top:10px">
            <button class="btn btn-wa btn-sm" style="flex:1;justify-content:center" onclick="document.getElementById('seat-detail-popup').remove();sendWA('${m.id}','due',false)">📲 WA Student</button>
            ${m.gphone?`<button class="btn btn-wa btn-sm" style="background:#128c7e;flex:1;justify-content:center" onclick="document.getElementById('seat-detail-popup').remove();sendWA('${m.id}','due',true)">👪 Guardian</button>`:''}
            <button class="btn btn-yellow btn-sm" style="flex:1;justify-content:center" onclick="document.getElementById('seat-detail-popup').remove();openProfile('${m.id}')">👤 Profile</button>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" style="width:100%;justify-content:center;margin-top:10px" onclick="document.getElementById('seat-detail-popup').remove()">Close</button>
      </div>`;
    popup.addEventListener('click', e=>{ if(e.target===popup) popup.remove(); });
    document.body.appendChild(popup);
    return;
  }

  // Free seat — show locker-style assign popup
  const existing = document.getElementById('seat-assign-popup');
  if(existing) existing.remove();

  // Deselect previous selection
  selectedSeatNoMorning = null;
  selectedSeatNoEvening = null;
  selectedSeatNo = null;

  const zone = getSeatZone(no);
  const zoneColor = zone==='blue'?'var(--blue)':'var(--red)';
  const zoneName = zone==='blue'?'🔵 Blue Zone':'🔴 Red Zone';

  // shiftLabel resolve karo — custom shift ke liye actual naam nikalo
  let shiftLabel;
  if(shiftKey==='morning') shiftLabel = 'Morning (6AM–1PM)';
  else if(shiftKey==='evening') shiftLabel = 'Evening (1PM–8PM)';
  else if(shiftKey==='night') shiftLabel = 'Night (8PM–12AM)';
  else if(shiftKey==='fullday') shiftLabel = 'Full Day (6AM–8PM)';
  else if(shiftKey && shiftKey.startsWith('custom_')){
    const csId = shiftKey.replace('custom_','');
    const cs = (appSettings.customShifts||[]).find(s=>s.id===csId);
    const fmtT = t => { if(!t) return ''; const [h,m]=t.split(':'); const hr=+h; return (hr%12||12)+':'+(m||'00')+(hr<12?'AM':'PM'); };
    shiftLabel = cs ? `${cs.name} (${fmtT(cs.start)}–${fmtT(cs.end)})` : 'Full Day (6AM–8PM)';
  } else shiftLabel = 'Full Day (6AM–8PM)';

  const popup = document.createElement('div');
  popup.id = 'seat-assign-popup';
  popup.style.cssText = 'position:fixed;inset:0;background:#00000090;z-index:400;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .2s;';
  popup.innerHTML = `
    <div style="background:var(--card);border:2px solid ${zoneColor};border-radius:18px;padding:24px;width:100%;max-width:400px;box-shadow:var(--shadow2);animation:fadeUp .3s ease">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:var(--ink)">🪑 Seat ${no} <span style="font-size:13px;color:${zoneColor}">${zoneName}</span></div>
        <button onclick="document.getElementById('seat-assign-popup').remove()" style="background:var(--bg3);border:1px solid var(--border2);color:var(--ink);width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:16px">✕</button>
      </div>
      <div style="background:var(--greenl);border:1px solid var(--green);border-radius:10px;padding:12px;margin-bottom:14px;font-size:13px;color:var(--green);font-weight:800;text-align:center">
        ✅ Free Seat — ${shiftLabel}
      </div>
      <div class="frow" style="margin-bottom:12px"><label>Member Select Karein</label>
        <select id="sap-member" style="width:100%;padding:10px 13px;border:1.5px solid var(--border);border-radius:9px;background:var(--bg3);color:var(--ink);font-size:13.5px;outline:none">
          <option value="">— Select Member —</option>
          ${members.map(m=>`<option value="${m.id}">${m.id} — ${m.name}</option>`).join('')}
        </select>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
        <div class="frow" style="margin-bottom:0"><label>From Date</label>
          <input type="date" id="sap-from" value="${todayStr()}" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:9px;background:var(--bg3);color:var(--ink);font-size:13px;outline:none"/>
        </div>
        <div class="frow" style="margin-bottom:0"><label>To Date</label>
          <input type="date" id="sap-to" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:9px;background:var(--bg3);color:var(--ink);font-size:13px;outline:none"/>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:4px">
        <button class="btn btn-green" style="flex:1;justify-content:center" onclick="confirmSeatAssignPopup(${no},'${shiftKey}')">✅ Assign Seat</button>
        <button class="btn btn-ghost" style="flex:1;justify-content:center" onclick="document.getElementById('seat-assign-popup').remove()">Close</button>
      </div>
    </div>`;
  // Set default to date (1 month from today)
  const d2 = new Date(); d2.setMonth(d2.getMonth()+1);
  popup.querySelector('#sap-to').value = d2.toISOString().slice(0,10);
  popup.addEventListener('click', e=>{ if(e.target===popup) popup.remove(); });
  document.body.appendChild(popup);
}
async function releaseSeat(mId){
  if(!confirm('Release this seat?')) return;
  const m = members.find(x=>x.id===mId);
  if(m){
    try {
      await AR_API.updateMember(mId, {...m, seat:null});
      members = await AR_API.getMembers(); await injectIDBImages(members);
      buildSeats(); renderSeats();
      toast(`🪑 Seat released for ${m.name}`,'var(--orange)');
    } catch(e){
      toast('❌ Server error: '+e.message,'var(--red)');
    }
  }
}

async function confirmSeatAssignPopup(seatNo, shiftKey){
  const mId = document.getElementById('sap-member')?.value;
  const fromVal = document.getElementById('sap-from')?.value;
  const toVal = document.getElementById('sap-to')?.value;
  if(!mId){ toast('⚠️ Member select karein','var(--red)'); return; }
  if(!fromVal||!toVal){ toast('⚠️ Dates select karein','var(--red)'); return; }
  const member = members.find(m=>m.id===mId);
  if(!member){ toast('⚠️ Member nahi mila','var(--red)'); return; }

  // Map shiftKey to full shift label
  let shiftLabel;
  if(shiftKey==='morning') shiftLabel = 'Morning (6AM–1PM)';
  else if(shiftKey==='evening') shiftLabel = 'Evening (1PM–8PM)';
  else if(shiftKey==='night') shiftLabel = 'Night (8PM–12AM)';
  else if(shiftKey==='fullday') shiftLabel = 'Full Day (6AM–8PM)';
  else if(shiftKey && shiftKey.startsWith('custom_')){
    const csId = shiftKey.replace('custom_','');
    const cs = (appSettings.customShifts||[]).find(s=>s.id===csId);
    const fmtT = t => { if(!t) return ''; const [h,m]=t.split(':'); const hr=+h; return (hr%12||12)+':'+(m||'00')+(hr<12?'AM':'PM'); };
    shiftLabel = cs ? `${cs.name} (${fmtT(cs.start)}–${fmtT(cs.end)})` : 'Full Day (6AM–8PM)';
  } else shiftLabel = 'Full Day (6AM–8PM)';

  // Conflict check — time overlap se
  const newShiftTimes = getShiftMinutes(shiftLabel);
  const conflict = members.find(m=>{
    if(m.id===mId) return false;
    if(!m.seat) return false;
    if(parseSeatKey(m.seat).no !== seatNo) return false;
    return shiftsOverlap(m.shift, shiftLabel);
  });
  if(conflict){
    const ct = getShiftMinutes(conflict.shift);
    toast(`⚠️ Seat ${seatNo} par ${conflict.name} (${shiftShort(conflict.shift)}) already hai — time overlap ho raha hai!`,'var(--red)');
    return;
  }

  const seatKey = makeSeatKey(shiftLabel, seatNo);
  const updatedMember = {...member, seat:seatKey, shift:shiftLabel, from:fromVal, to:toVal};
  try {
    await AR_API.updateMember(member.id, updatedMember);
    members = await AR_API.getMembers(); await injectIDBImages(members);
  } catch(e){
    toast('❌ Server error: '+e.message,'var(--red)'); return;
  }
  buildSeats(); renderSeats();
  document.getElementById('seat-assign-popup')?.remove();
  toast(`✅ Seat ${seatNo} assigned to ${member.name}!`,'var(--teal)');
}

function populateSeatModal(){
  const sel=document.getElementById('bs-member');
  sel.innerHTML='<option value="">— Select Member —</option>'+members.map(m=>`<option value="${m.id}">${m.id} — ${m.name}</option>`).join('');
  const d2=new Date(); d2.setMonth(d2.getMonth()+1);
  document.getElementById('bs-from').value=todayStr();
  document.getElementById('bs-to').value=d2.toISOString().slice(0,10);
  // Whichever shift has an active selected seat, pre-fill accordingly
  const shiftSel = document.getElementById('bs-shift');
  const seatEl = document.getElementById('bs-seat');
  if(selectedSeatNoEvening && !selectedSeatNoMorning){
    if(shiftSel) shiftSel.value='Evening (1PM–8PM)';
    if(seatEl) seatEl.value=selectedSeatNoEvening;
    selectedSeatNo = selectedSeatNoEvening;
  } else if(selectedSeatNoMorning){
    if(shiftSel) shiftSel.value='Morning (6AM–1PM)';
    if(seatEl) seatEl.value=selectedSeatNoMorning;
    selectedSeatNo = selectedSeatNoMorning;
  } else {
    if(shiftSel) shiftSel.value='Morning (6AM–1PM)';
    if(seatEl) seatEl.value='';
  }
  calcSeatFee();
}

function calcSeatFee(){
  const plan=val('bs-plan');
  const shiftRaw=val('bs-shift')||'';
  let shift='Morning';
  if(shiftRaw.includes('Evening')) shift='Evening';
  else if(shiftRaw.includes('Full Day')||shiftRaw.includes('Full')) shift='Full Day';
  const baseAmt=(feeStructure[plan]||{})[shift]||(feeStructure[plan]||{})['Morning']||0;
  const durVal = parseInt(val('bs-category')||'1')||1;
  const durLabel = durVal===3?'3 Month':durVal===6?'6 Month':'1 Month';
  const subtotal = baseAmt * durVal;
  const discRate = getPlanDiscount(durVal);
  const discAmt = Math.round(subtotal * discRate);
  const amt = subtotal - discAmt;
  // Zone info
  const seatNo=parseInt(document.getElementById('bs-seat')?.value||selectedSeatNo||0);
  let zoneInfo='';
  if(seatNo>0){
    const zone=getSeatZone(seatNo);
    const zoneEmoji={blue:'🔵',red:'🔴'}[zone]||'';
    zoneInfo=`<div class="receipt-row"><span class="rlabel">${zoneEmoji} Zone</span><span class="rval" style="color:var(--${zone})">${zone.charAt(0).toUpperCase()+zone.slice(1)} Zone</span></div>`;
  }
  document.getElementById('seatFeePreview').innerHTML=`
    <div class="receipt-row"><span class="rlabel">Plan</span><span class="rval">${plan}</span></div>
    <div class="receipt-row"><span class="rlabel">Shift</span><span class="rval">${shift}</span></div>
    <div class="receipt-row"><span class="rlabel">Duration</span><span class="rval">${durLabel}</span></div>
    <div class="receipt-row"><span class="rlabel">Base Fee × ${durVal}</span><span class="rval">${fmtAmt(baseAmt)} × ${durVal} = ${fmtAmt(subtotal)}</span></div>
    ${discAmt>0?`<div class="receipt-row"><span class="rlabel" style="color:var(--green)">🎉 Discount (${discRate*100}%)</span><span class="rval" style="color:var(--green)">− ${fmtAmt(discAmt)}</span></div>`:''}
    <div class="receipt-row"><span class="rlabel">Total Fee</span><span class="rval" style="color:var(--blue)">${fmtAmt(amt)}</span></div>
    ${zoneInfo}`;
}

async function confirmBookSeat(){
  const mId = val('bs-member');
  const seatNo = Number(val('bs-seat')) || Number(selectedSeatNo) || 0;
  const shiftVal = val('bs-shift');
  const planVal = val('bs-plan');
  const fromVal = val('bs-from');
  const toVal = val('bs-to');
  const durVal = val('bs-category');

  // Basic validation
  if(!mId){ toast('⚠️ Member select karein','var(--red)'); return; }
  if(!seatNo){ toast('⚠️ Seat number daalen','var(--red)'); return; }
  if(!durVal){ toast('⚠️ Duration select karein','var(--red)'); return; }

  const member = members.find(m => m.id === mId);
  if(!member){ toast('⚠️ Member nahi mila','var(--red)'); return; }

  // Conflict check - same shift same seat already booked?
  const conflict = members.find(m =>
    m.id !== mId &&
    parseSeatKey(m.seat).no === seatNo &&
    (
      shiftVal.includes('Full Day') ||
      m.shift.includes('Full Day') ||
      (shiftVal.includes('Morning') && m.shift.includes('Morning')) ||
      (shiftVal.includes('Evening') && m.shift.includes('Evening'))
    )
  );
  if(conflict){
    toast('⚠️ Seat ' + seatNo + ' par ' + conflict.name + ' already booked hai is shift mein','var(--red)');
    return;
  }

  toast('⏳ Booking save ho rahi hai...', 'var(--blue)');
  try {
    // Store seat as prefixed key: M5, E12, F8
    const seatKey = makeSeatKey(shiftVal, seatNo);
    // Poora member object update karo seat + shift + plan sab ke saath
    const updatedMember = {
      ...member,
      seat: seatKey,
      shift: shiftVal,
      plan: planVal,
      category: durVal,
      from: fromVal,
      to: toVal,
      feeStatus: member.feeStatus || 'Paid'
    };
    await AR_API.updateMember(member.id, updatedMember);
    members = await AR_API.getMembers(); await injectIDBImages(members);
    buildSeats();
    selectedSeatNo = null;
    selectedSeatNoMorning = null;
    selectedSeatNoEvening = null;
    closeModal('modal-bookSeat');
    renderSeats();
    // Verify karo seat sahi save hua (seat key F8/M8/E8 format mein hai)
    const saved = members.find(m => m.id === mId);
    if(saved && parseSeatKey(saved.seat).no === seatNo){
      toast('✅ Seat ' + seatNo + ' booked for ' + member.name + ' (' + shiftVal.split(' ')[0] + ')!', 'var(--green)');
    } else {
      toast('⚠️ Seat save nahi hua — Member Edit karke seat manually set karein', 'var(--orange)');
    }
  } catch(e){
    toast('❌ ' + (e.message || 'Server error - dobara try karein'), 'var(--red)');
  }
}

// ═══ MEMBERS ══════════════════════════════════════════════════════════════════
function renderMembers(){
  autoMarkExpired();
  const q=(val('msearch')||'').toLowerCase();
  const sf=val('mshiftFil');
  const stf=val('mstatusFil');
  const drf=val('mdurationFil');
  let list=members.filter(m=>{
    if(q&&!m.name.toLowerCase().includes(q)&&!m.id.toLowerCase().includes(q)&&!m.phone.includes(q)) return false;
    if(sf&&!m.shift.includes(sf)) return false;
    if(stf&&m.feeStatus!==stf) return false;
    if(drf){
      const raw=String(m.category||'1');
      const dur=raw.includes('6')?'6':raw.includes('3')?'3':'1';
      if(dur!==drf) return false;
    }
    return true;
  });
  const fsBadge={Paid:'b-green',Due:'b-yellow',Expired:'b-red'};
  const cnt = document.getElementById('membersCount');
  if(cnt) cnt.textContent = `Showing ${list.length} of ${members.length} members`;

  document.getElementById('membersGrid').innerHTML = list.length ? list.map(m=>{
    const today=todayStr();
    const expSoon = m.to && toISO(m.to)>=today && Math.ceil((new Date(toISO(m.to))-new Date(today))/86400000)<=5;
    const avatarHtml = m.photo
      ? `<img src="${m.photo}" style="width:46px;height:46px;border-radius:12px;object-fit:cover;flex-shrink:0;border:2px solid ${m.color}" />`
      : `<div class="mavatar" style="background:${m.color}">${m.name[0]}</div>`;
    return `
    <div class="mcard" id="mcard-${m.id}">
      ${avatarHtml}
      <div style="flex:1">
        <div class="mname">${m.name} <span class="badge ${fsBadge[m.feeStatus]||'b-gray'}">${m.feeStatus}</span></div>
        <div class="mmeta">
          🎓 ${m.cls||'—'} &nbsp;·&nbsp; 💳 ${m.plan}<br>
          ⏰ ${shiftShort(m.shift)} &nbsp;·&nbsp; 📅 Till ${fmtDate(m.to)}${expSoon?` <span style="color:var(--orange);font-size:10px">⚠️ Expiring Soon</span>`:''}<br>
          🪑 Seat ${fmtSeat(m.seat)} &nbsp;·&nbsp; 🆔 ${m.id}<br>
          📞 ${m.phone}${m.guardian?`<br>👨‍👩‍👧 ${m.guardian} · 📞 ${m.gphone||'—'}`:''}${m.aadhar?`<br>🪪 Aadhar: ${m.aadhar}`:''}${m.addr?`<br>🏠 ${m.addr}`:''}
        </div>
        <div class="mactions">
          <button class="btn btn-blue btn-sm" onclick="openProfile('${m.id}')">👁️ Profile</button>
          <button class="btn btn-wa btn-sm" onclick="sendWA('${m.id}','reminder',false)" title="WA Student">📲</button>
          ${m.gphone?`<button class="btn btn-wa btn-sm" style="background:#128c7e" onclick="sendWA('${m.id}','reminder',true)" title="WA Guardian">👨‍👩‍👧</button>`:''}
          <button class="btn btn-green btn-sm" onclick="quickFee('${m.id}')">💰 Fee</button>
          <button class="btn btn-ghost btn-sm" onclick="markAttendance('${m.id}')">📋 Att.</button>
          <button class="btn btn-yellow btn-sm" onclick="editMember('${m.id}')">✏️ Edit</button>
          ${isAdmin()?`<button class="btn btn-red btn-sm" onclick="deleteMember('${m.id}')">🗑️</button>`:''}
        </div>
      </div>
    </div>`;}).join('') : `<div class="empty" style="grid-column:1/-1"><div class="empty-icon">👥</div><h3>No member found</h3></div>`;
}

async function saveMember(){
  const editId = val('am-editId');
  const id=val('am-id'), name=val('am-name');
  if(!id||!name){ toast('\u26a0\ufe0f ID and name required','var(--red)'); return; }

  // Button ko loading state mein daalo
  const btn = document.getElementById('addMemberBtn');
  const origText = btn ? btn.textContent : '';
  if(btn){ btn.disabled=true; btn.textContent='⏳ Saving...'; }

  // Image compress karke size kam karo (server payload limit fix)
  const compressImage = (file, maxW, maxH, quality) => new Promise(res => {
    if(!file){ return res(null); }
    const reader = new FileReader();
    reader.onerror = () => res(null);
    reader.onload = ev => {
      const img = new Image();
      img.onerror = () => res(null);
      img.onload = () => {
        try {
          let w=img.width, h=img.height;
          if(w>maxW){ h=Math.round(h*maxW/w); w=maxW; }
          if(h>maxH){ w=Math.round(w*maxH/h); h=maxH; }
          const canvas=document.createElement('canvas');
          canvas.width=w; canvas.height=h;
          canvas.getContext('2d').drawImage(img,0,0,w,h);
          res(canvas.toDataURL('image/jpeg', quality));
        } catch(e){ res(null); }
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  try {
    const photoFile  = document.getElementById('am-photo')?.files?.[0] || null;
    const aadharFile = document.getElementById('am-aadharFile')?.files?.[0] || null;

    // Profile photo: max 400x400, 70% quality | Aadhar: max 900x600, 75% quality
    const photoData  = await compressImage(photoFile,  400, 400, 0.70);
    // Aadhar: Use already-read global variable (fix: database mein nahi jaata tha)
    // _pendingAadharData previewAadhar function mein set hoti hai
    let aadharData = _pendingAadharData || null;
    // Fallback: agar global null hai aur file exist karta hai to compress karo
    if(!aadharData && aadharFile){
      if(aadharFile.type === 'application/pdf'){
        aadharData = await new Promise(res => {
          const r = new FileReader();
          r.onerror = () => res(null);
          r.onload = e => res(e.target.result);
          r.readAsDataURL(aadharFile);
        });
      } else {
        aadharData = await compressImage(aadharFile, 900, 600, 0.75);
      }
    }

    // ── IDB: Images locally save karo, server pe null bhejo ──
    const newPhoto     = photoData     || null;
    const newAadharImg = aadharData    || null;
    const existingMem  = editId ? members.find(x=>x.id===editId) : null;

    // IndexedDB mein save karo (sirf naye images, existing preserve karo)
    try {
      const idbUpdate = {};
      if(newPhoto)     idbUpdate.photo     = newPhoto;
      if(newAadharImg) idbUpdate.aadharImg = newAadharImg;
      if(Object.keys(idbUpdate).length > 0){
        await AR_IDB.saveImages(id, idbUpdate);
      }
    } catch(ex){ console.warn('IDB save error:', ex); }

    const payload = {
      id, name, phone:val('am-phone'), cls:val('am-class'),
      shift:val('am-shift'), plan:val('am-plan'), category:val('am-category'),
      from:val('am-from'), to:val('am-to'),
      feeStatus:val('am-feeStatus'), addr:val('am-addr'),
      dob:val('am-dob'),
      guardian:val('am-guardian'), gphone:val('am-gphone'),
      aadhar:val('am-aadhar'),
      seat: editId ? (existingMem?.seat || null) : null,
      color: editId ? (existingMem?.color || COLORS[members.length%COLORS.length]) : COLORS[members.length%COLORS.length],
      // ✅ FIX: dueAmount preserve karo — edit karne pe server overwrite na kare
      dueAmount: editId ? (existingMem?.dueAmount || 0) : 0,
      aadharImg: null,  // Server pe nahi jaata — IndexedDB mein hai
      photo: null       // Server pe nahi jaata — IndexedDB mein hai
    };

    if(editId){
      // Plan change fix: agar 'to' date future mein hai aur feeStatus 'Expired' ya 'Due' hai
      // lekin user ne manually feeStatus change nahi kiya — auto detect karo
      const origMem = members.find(x=>x.id===editId);
      if(origMem && payload.to && normDate(payload.to) >= todayStr()){
        // Agar to date future mein hai to status 'Due' hona chahiye (next renewal pending)
        // Sirf tab change karo jab user ne feeStatus field change nahi kiya
        if(payload.feeStatus === 'Expired'){
          payload.feeStatus = 'Due'; // date extend ki, to Due set karo
        }
      }
      await AR_API.updateMember(editId, payload);
      toast(`\u2705 ${name} updated!`,'var(--blue)');
    } else {
      await AR_API.addMember(payload);
      toast('\u2705 Member registered!','var(--green)');
    }
    closeModal('modal-addMember');
    _pendingAadharData = null; // reset after save
    members = await AR_API.getMembers(); await injectIDBImages(members);

    // ── IDB: Reload ke baad sabhi members mein local images inject karo ──
    await injectIDBImages(members);

    // FIX: Agar profile modal khula tha aur usi member ko edit kiya — profile refresh karo
    if(editId && currentProfileId===editId && document.getElementById('modal-profile').classList.contains('open')){
      openProfile(editId);
    }
    buildSeats(); renderMembers(); renderDashboard();
  } catch(e){
    const msg = e?.message || e?.toString() || 'Unknown error';
    toast('\u274c Save failed: '+msg,'var(--red)');
    console.error('saveMember error:', e);
  } finally {
    // Button hamesha restore hoga — chahe success ho ya error
    if(btn){ btn.disabled=false; btn.textContent=origText; }
  }
}

function editMember(id){
  const m=members.find(x=>x.id===id);
  if(!m) return;
  document.getElementById('addMemberTitle').textContent='✏️ Edit Member';
  document.getElementById('addMemberBtn').textContent='💾 Save Changes';
  document.getElementById('am-editId').value=m.id;
  document.getElementById('am-id').value=m.id;
  document.getElementById('am-id').disabled=true;
  document.getElementById('am-name').value=m.name;
  document.getElementById('am-phone').value=m.phone;
  document.getElementById('am-dob').value=m.dob||'';
  document.getElementById('am-class').value=m.cls||'';
  document.getElementById('am-shift').value=m.shift;
  document.getElementById('am-plan').value=m.plan;
  // Plan ke hisaab se shift dropdown filter karo
  filterAmShift(m.plan);
  const _amcat=document.getElementById('am-category'); if(_amcat) _amcat.value=m.category||'';
  document.getElementById('am-from').value=m.from||'';
  document.getElementById('am-to').value=m.to||'';
  document.getElementById('am-feeStatus').value=m.feeStatus||'Due';
  document.getElementById('am-addr').value=m.addr||'';
  document.getElementById('am-guardian').value=m.guardian||'';
  document.getElementById('am-gphone').value=m.gphone||'';
  document.getElementById('am-aadhar').value=m.aadhar||'';
  const prev=document.getElementById('am-aadharPreview');
  const placeholder=document.getElementById('am-aadharPlaceholder');
  if(prev){ prev.innerHTML = m.aadharImg ? `<img src="${m.aadharImg}" style="max-width:100%;max-height:100px;border-radius:6px;border:1px solid var(--border);display:block;margin:0 auto"/>` : ''; }
  if(placeholder){ placeholder.style.display = m.aadharImg ? 'none' : 'block'; }
  // Set photo preview
  const pp=document.getElementById('am-photoPreview');
  const ph=document.getElementById('am-photoPlaceholder');
  if(m.photo && pp && ph){ pp.src=m.photo; pp.style.display='block'; ph.style.display='none'; }
  else if(pp && ph){ pp.src=''; pp.style.display='none'; ph.style.display='block'; }
  openModal('modal-addMember');
}

function deleteMember(id){
  requireAdmin(async ()=>{
    const m=members.find(x=>x.id===id);
    if(!confirm(`Delete member "${m?.name}"? They will be moved to Recycle Bin for 30 days.`)) return;
    try {
      addToRecycleBin('member', m?.name||id, {...m});
      await AR_API.deleteMember(id, 'anuj@2006');
      members = await AR_API.getMembers(); await injectIDBImages(members);
      buildSeats(); renderMembers(); renderDashboard();
      toast('\uD83D\uDDD1\uFE0F Member moved to Recycle Bin','var(--orange)');
    } catch(e){ toast('\u274c '+e.message,'var(--red)'); }
  });
}

// ═══ FEES ═════════════════════════════════════════════════════════════════════
function setFeeTab(t,btn){
  ['records','monthly','settings','dues'].forEach(x=>{ const el=document.getElementById('fee-'+x); if(el) el.style.display='none'; });
  const target = document.getElementById('fee-'+t);
  if(target) target.style.display='block';
  document.querySelectorAll('.fee-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  if(t==='settings'){
    renderFeeStructure();
    renderChargeTypeList();
    renderCustomPlanList();
  }
  if(t==='monthly'){
    renderMonthlyIncome();
  }
}

function populateFeeModal(){
  const sel=document.getElementById('cf-member');
  sel.innerHTML='<option value="">— Select Member —</option>'+members.map(m=>`<option value="${m.id}">${m.id} — ${m.name} (${m.feeStatus})</option>`).join('');
  sel.onchange = function(){ fillMemberFeeDetails(this.value); };

  // Clear member info banner
  const old = document.getElementById('cf-memberInfo');
  if(old) old.remove();

  // cf-plan mein feeStructure ke saare plans daalo
  const planSel = document.getElementById('cf-plan');
  if(planSel){
    const allPlans = Object.keys(feeStructure);
    planSel.innerHTML = allPlans.map(p=>`<option value="${p}">${p}</option>`).join('');
    // ✅ Custom/Manual plan always at end
    planSel.innerHTML += `<option value="Custom / Manual">✏️ Custom / Manual</option>`;
    // Default plan ke hisaab se shift filter karo
    filterCfShift(planSel.value||'');
  }
  // Reset manual fields
  ['cf-manualPlanName','cf-manualAmt','cf-manualDuration','cf-manualShift'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value='';
  });
  const ms=document.getElementById('cf-manualSection'); if(ms) ms.style.display='none';

  document.getElementById('cf-month').value = new Date().toLocaleString('en-IN',{month:'long',year:'numeric'});
  document.getElementById('cf-notes').value='';
  document.getElementById('cf-notes').placeholder='Optional notes...';
  const _cfcat=document.getElementById('cf-category'); if(_cfcat) _cfcat.value='';
  // Reset split payment
  const splitToggle = document.getElementById('cf-splitToggle');
  if(splitToggle) splitToggle.checked=false;
  const splitFields = document.getElementById('cf-splitFields');
  if(splitFields) splitFields.style.display='none';
  const pa = document.getElementById('cf-partialAmt');
  if(pa) pa.value='';
  const ra = document.getElementById('cf-remainingAmt');
  if(ra) ra.value='';
  // Reset due cache
  const dc = document.getElementById('cf-dueCache');
  if(dc) dc.value='0';
  // Reset renewal date inputs
  const rfReset = document.getElementById('cf-renewFrom');
  const rtReset = document.getElementById('cf-renewTo');
  if(rfReset) rfReset.value = '';
  if(rtReset) rtReset.value = '';
  // Reset extra charges (multi)
  resetExtraChargeRows();
  calcFee();
}

function fillMemberFeeDetails(mId){
  if(!mId){ calcFee(); return; }
  const m = members.find(x=>x.id===mId);
  if(!m) return;

  // ── Plan auto-fill ──────────────────────────────────────────────
  const planSel = document.getElementById('cf-plan');
  if(planSel && m.plan){
    // Try exact match first across all options
    let matched = false;
    for(let opt of planSel.options){
      if(opt.value === m.plan){ planSel.value = m.plan; matched=true; break; }
    }
    // If plan not in list (custom plan), add it temporarily
    if(!matched && m.plan){
      const opt = document.createElement('option');
      opt.value = m.plan; opt.textContent = m.plan;
      planSel.appendChild(opt);
      planSel.value = m.plan;
    }
    // Plan ke hisaab se shift filter lagao
    filterCfShift(planSel.value);
  }

  // ── Shift auto-fill ─────────────────────────────────────────────
  const shiftSel = document.getElementById('cf-shift');
  if(shiftSel && m.shift){
    if(m.shift.includes('Full Day')) shiftSel.value = 'Full Day';
    else if(m.shift.includes('Evening')) shiftSel.value = 'Evening';
    else shiftSel.value = 'Morning';
  }

  // ── Category (Duration) auto-fill ──────────────────────────────────────────
  const catSel = document.getElementById('cf-category');
  if(catSel && m.category){
    // m.category could be "1 Month", "3 Month", "6 Month" or old "1 Month Regular" etc.
    const raw = String(m.category);
    if(raw.includes('6')) catSel.value='6';
    else if(raw.includes('3')) catSel.value='3';
    else catSel.value='1';
  }

  // ── Month: next month sirf tab suggest karo jab member ki validity already aage ho ─────────────
  const cfMonth = document.getElementById('cf-month');
  if(cfMonth){
    const now = new Date();
    const thisMonth = now.toLocaleString('en-IN',{month:'long',year:'numeric',timeZone:'Asia/Kolkata'});
    // Member ki validity check karo — agar 'to' date current month ke end ke baad hai tab next month suggest karo
    const validTill = m.to ? toISO(m.to) : '';
    // Current month ka last day
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().slice(0,10);
    if(validTill && validTill > lastDayOfMonth && m.feeStatus !== 'Due'){
      // Validity already next month tak extended hai — next month suggest karo
      const nm = new Date(now.getFullYear(), now.getMonth()+1, 1);
      cfMonth.value = nm.toLocaleString('en-IN',{month:'long',year:'numeric',timeZone:'Asia/Kolkata'});
    } else {
      cfMonth.value = thisMonth;
    }
  }

  // ── Member info banner below member select ───────────────────────
  let infoBox = document.getElementById('cf-memberInfo');
  if(!infoBox){
    infoBox = document.createElement('div');
    infoBox.id = 'cf-memberInfo';
    const memberRow = document.getElementById('cf-member')?.closest('.frow');
    if(memberRow) memberRow.appendChild(infoBox);
  }
  const shiftKey = m.shift.includes('Full Day')?'Full Day': m.shift.includes('Evening')?'Evening':'Morning';
  const planAmt = (feeStructure[m.plan]||{})[shiftKey] || 0;

  // ── Due Amount: renderDues ki tarah fee records se accurately calculate karo ──
  let dueAmt = 0;
  const _durValFill = parseInt(m.category)||1;
  const _subFill = planAmt * _durValFill;
  const _planTotal = _subFill - Math.round(_subFill * getPlanDiscount(_durValFill));

  const _latestRecFill = feeRecords
    .filter(r=>r.memberId===m.id)
    .sort((a,b)=>{
      const dd=(b.date||'').localeCompare(a.date||'');
      if(dd!==0) return dd;
      return (parseInt(b.id)||0)-(parseInt(a.id)||0);
    })[0];

  if(m.feeStatus==='Partial'){
    const _latestPartial = feeRecords
      .filter(r=>r.memberId===m.id && r.status==='Partial')
      .sort((a,b)=>{
        const dd=(b.date||'').localeCompare(a.date||'');
        if(dd!==0) return dd;
        return (parseInt(b.id)||0)-(parseInt(a.id)||0);
      })[0];
    dueAmt = _latestPartial ? (parseFloat(_latestPartial.dueAmount)||0) : (parseFloat(m.dueAmount)||0);
  } else if(m.feeStatus==='Due' || m.feeStatus==='Expired'){
    if(parseFloat(m.dueAmount) > 0){
      dueAmt = parseFloat(m.dueAmount);
    } else if(_latestRecFill && parseFloat(_latestRecFill.paidAmount) > 0){
      // ✅ FIX: Stored record amount use karo — discount change se purana due galat na ho
      const _storedTotal = parseFloat(_latestRecFill.amount)||_planTotal;
      const _totalPaidFill = feeRecords
        .filter(r=>r.memberId===m.id)
        .reduce((s,r)=>s+(parseFloat(r.paidAmount)||parseFloat(r.amount)||0), 0);
      dueAmt = Math.max(0, _storedTotal - _totalPaidFill);
    } else {
      dueAmt = 0; // Full Due — collect karo pura plan amount (no partial history)
    }
  }

  infoBox.innerHTML = `
    <div style="margin-top:8px;padding:10px 13px;background:var(--bg3);border:1.5px solid var(--border2);border-radius:10px;font-size:12px">
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        <span>🪑 <b>Seat ${fmtSeat(m.seat)}</b></span>
        <span>⏰ <b>${shiftShort(m.shift)}</b></span>
        <span>📅 Valid Till: <b style="color:${m.to && toISO(m.to) < todayStr()?'var(--red)':'var(--ink'}">${fmtDate(m.to)}</b></span>
        <span>💳 <b>${m.plan}</b> — ${fmtAmt(planAmt)}</span>
        <span class="badge ${m.feeStatus==='Paid'?'b-green':m.feeStatus==='Expired'?'b-red':'b-yellow'}">${m.feeStatus}</span>
        ${dueAmt>0?`<span style="color:var(--red);font-weight:800">⚠️ Due: ${fmtAmt(dueAmt)}</span>`:''}
      </div>
      ${m.phone?`<div style="margin-top:5px;color:var(--ink3)">📞 ${m.phone}${m.guardian?` · 👨‍👩‍👧 ${m.guardian} (${m.gphone||'—'})`:''}</div>`:''}
    </div>`;

  // ── Notes placeholder ────────────────────────────────────────────
  const notesEl = document.getElementById('cf-notes');
  if(notesEl) notesEl.placeholder = `Seat ${fmtSeat(m.seat)} · ${m.plan||'—'}${dueAmt>0?' · Due: ₹'+dueAmt:''}`;

  // ✅ FIX: dueAmt cache karo taaki calcFee() mein consistent value mile
  const dueCacheEl = document.getElementById('cf-dueCache');
  if(dueCacheEl) dueCacheEl.value = dueAmt;

  // ── RENEWAL PERIOD: Auto-fill suggested dates (user can override) ─────────
  const durValFill = parseInt((document.getElementById('cf-category')?.value)||'1')||1;
  // From date suggestion: agar existing validity future mein hai to uske baad se, warna aaj se
  const suggestedFrom = m.to && toISO(m.to) >= todayStr() ? toISO(m.to) : todayStr();
  const suggestedTo = (() => {
    const d = new Date(suggestedFrom + 'T00:00:00');
    d.setMonth(d.getMonth() + durValFill);
    d.setDate(d.getDate() - 1);
    return d.toLocaleDateString('en-CA', {timeZone:'Asia/Kolkata'});
  })();
  const rfEl = document.getElementById('cf-renewFrom');
  const rtEl = document.getElementById('cf-renewTo');
  if(rfEl && !rfEl.value) rfEl.value = suggestedFrom;
  if(rtEl && !rtEl.value) rtEl.value = suggestedTo;

  // ── AUTO-SPLIT: Agar member ka due amount > 0 hai, Split auto-enable karo ──
  if(dueAmt > 0){
    const splitToggle = document.getElementById('cf-splitToggle');
    const splitFields = document.getElementById('cf-splitFields');
    const pa = document.getElementById('cf-partialAmt');
    const ra = document.getElementById('cf-remainingAmt');
    if(splitToggle){ splitToggle.checked = true; }
    if(splitFields){ splitFields.style.display = 'block'; }
    if(pa){ pa.value = dueAmt; }
    if(ra){ ra.value = 0; }
  } else {
    // No due — reset split to off
    const splitToggle = document.getElementById('cf-splitToggle');
    const splitFields = document.getElementById('cf-splitFields');
    const pa = document.getElementById('cf-partialAmt');
    if(splitToggle && splitToggle.checked){ splitToggle.checked = false; }
    if(splitFields){ splitFields.style.display = 'none'; }
    if(pa){ pa.value = ''; }
  }

  calcFee();
}

// Discount helper: reads from editable appSettings
// ✅ HELPER: Member ka actual remaining due amount calculate karo (fee records se accurate)
function getMemberDue(mId){
  const m = members.find(x=>x.id===mId);
  if(!m) return 0;

  // 1. Pehle member.dueAmount check karo
  if(parseFloat(m.dueAmount) > 0) return parseFloat(m.dueAmount);

  const durVal = (() => { const raw=String(m.category||'1'); if(raw.includes('6')) return 6; if(raw.includes('3')) return 3; return 1; })();
  const shKey = m.shift?.includes('Full Day')?'Full Day':m.shift?.includes('Evening')?'Evening':'Morning';
  const baseA = (feeStructure[m.plan]||{})[shKey]||0;
  const sub = baseA * durVal;
  const planTotal = sub - Math.round(sub * getPlanDiscount(durVal));

  // ✅ FIX: Sirf CURRENT plan ke fee records filter karo — purane plan (Half Day etc.) ke records include mat karo
  const currentPlanRecs = feeRecords
    .filter(r => r.memberId === mId && r.plan === m.plan)
    .sort((a,b) => (b.date||'').localeCompare(a.date||'')||((parseInt(b.id)||0)-(parseInt(a.id)||0)));

  const latestRec = currentPlanRecs[0];

  // 2. Latest current-plan record mein dueAmount stored hai to wahi lo
  if(latestRec && parseFloat(latestRec.dueAmount) > 0)
    return parseFloat(latestRec.dueAmount);

  // 3. Current plan ke total paid se calculate karo
  if(latestRec && parseFloat(latestRec.paidAmount) > 0){
    const totalPaid = currentPlanRecs.reduce((s,r) => s + (parseFloat(r.paidAmount)||parseFloat(r.amount)||0), 0);
    return Math.max(0, planTotal - totalPaid);
  }

  return 0;
}

function getPlanDiscount(durVal){
  loadAppSettings();
  const d = appSettings.discounts || {};
  if(durVal===3) return (d.threeMonth ?? 10) / 100;
  if(durVal===6) return (d.sixMonth ?? 20) / 100;
  return 0;
}

function calcFee(){
  const plan=val('cf-plan')||'Monthly';
  const shift=val('cf-shift')||'Morning';

  // ✅ CUSTOM / MANUAL PLAN — sab kuch manual, koi auto-calc nahi
  if(plan === 'Custom / Manual'){
    const manualAmt   = parseFloat(document.getElementById('cf-manualAmt')?.value)||0;
    const manualPlan  = document.getElementById('cf-manualPlanName')?.value || 'Custom';
    const manualDur   = document.getElementById('cf-manualDuration')?.value || '—';
    const manualShift = document.getElementById('cf-manualShift')?.value || '—';
    const isSplitM    = document.getElementById('cf-splitToggle')?.checked;
    const partialElM  = document.getElementById('cf-partialAmt');
    const partialAmtM = isSplitM ? Math.max(0, parseFloat(partialElM?.value||'0')||0) : manualAmt;
    const remM        = isSplitM ? Math.max(0, manualAmt - partialAmtM) : 0;
    // Renewal dates recalc skip (user manually sets them)
    const extraCharges = getExtraChargeRows ? getExtraChargeRows() : [];
    const extraAmt = extraCharges.reduce((s,c)=>s+c.amount,0);
    const grandTotalM = (isSplitM ? partialAmtM : manualAmt) + extraAmt;
    const extraRowsHtml = extraCharges.length ? extraCharges.map(c=>`
      <div class="receipt-row"><span class="rlabel">➕ ${c.note||'Extra'}</span><span class="rval">${fmtAmt(c.amount)}</span></div>`).join('') : '';
    const splitHtml = isSplitM && partialAmtM>0 ? `
      <div class="receipt-row" style="color:var(--orange)"><span class="rlabel">💵 Paying Now</span><span class="rval">${fmtAmt(partialAmtM)}</span></div>
      <div class="receipt-row" style="color:var(--red)"><span class="rlabel">⏳ Remaining Due</span><span class="rval">${fmtAmt(remM)}</span></div>` : '';
    document.getElementById('feePreviewBox').innerHTML=`
      <div class="receipt-row"><span class="rlabel">Plan</span><span class="rval">${manualPlan}</span></div>
      <div class="receipt-row"><span class="rlabel">Shift</span><span class="rval">${manualShift}</span></div>
      <div class="receipt-row"><span class="rlabel">Duration</span><span class="rval">${manualDur}</span></div>
      <div class="receipt-row"><span class="rlabel">Fee Amount</span><span class="rval">${fmtAmt(manualAmt)}</span></div>
      ${extraRowsHtml}
      ${splitHtml}
      <div class="receipt-row" style="font-weight:900;font-size:15px;border-top:2px solid var(--border2);margin-top:6px;padding-top:8px">
        <span class="rlabel">Total Amount</span>
        <span class="rval" style="color:var(--green)">${fmtAmt(grandTotalM)}</span>
      </div>`;
    return;
  }
  const baseAmt=(feeStructure[plan]||{})[shift]||0;
  const durVal = parseInt(val('cf-category')||'1')||1;
  const durLabel = durVal===3?'3 Month':durVal===6?'6 Month':'1 Month';
  const subtotal = baseAmt * durVal;
  const discRate = getPlanDiscount(durVal);
  const discAmt = Math.round(subtotal * discRate);
  const amt = subtotal - discAmt;

  // ── Renewal period update karo jab bhi calcFee calle ──
  const _mIdCalc = val('cf-member');
  const _mCalc = _mIdCalc ? members.find(m=>m.id===_mIdCalc) : null;
  // ── RENEWAL PERIOD: Auto-update To date when category (duration) changes ──
  const rfCalcEl = document.getElementById('cf-renewFrom');
  const rtCalcEl = document.getElementById('cf-renewTo');
  if(rfCalcEl && rtCalcEl && rfCalcEl.value){
    // Recalculate To based on current From + selected duration
    const fromVal = rfCalcEl.value;
    const newToCalc = (() => {
      const d = new Date(fromVal + 'T00:00:00');
      d.setMonth(d.getMonth() + durVal);
      d.setDate(d.getDate() - 1);
      return d.toLocaleDateString('en-CA', {timeZone:'Asia/Kolkata'});
    })();
    rtCalcEl.value = newToCalc;
  }

  const isSplit = document.getElementById('cf-splitToggle')?.checked;
  const partialEl = document.getElementById('cf-partialAmt');
  const partialRaw = partialEl ? (partialEl.value === '' ? '0' : partialEl.value) : '0';
  const partialAmt = isSplit ? Math.max(0, parseFloat(partialRaw)||0) : amt;
  // ✅ FIX: fillMemberFeeDetails se cached dueAmt use karo — plan-change wale members ke liye bhi sahi
  const _mIdC = val('cf-member');
  const _mC = _mIdC ? members.find(m=>m.id===_mIdC) : null;
  const _exDue = parseFloat(document.getElementById('cf-dueCache')?.value)||0;
  // ✅ FIX: Agar user ne member ka current plan se DIFFERENT plan select kiya hai,
  // to pichle due ki "Already Paid" credit nahi dikhani chahiye — fresh plan hai
  const isNewPlan = _mC && plan !== (_mC.plan || 'Monthly');
  // ✅ FIX: Existing due ke against partial pay karo to remaining sirf _exDue - partial hona chahiye
  const remaining = isSplit
    ? (_exDue > 0 ? Math.max(0, _exDue - partialAmt) : Math.max(0, amt - partialAmt))
    : 0;

  // ── Plan Upgrade Due Calculation ────────────────────────────────────────────
  // Agar member ne pehle 1-month fee di thi aur ab 3/6 month plan le raha hai,
  // to jo already paid hai usse deduct karo aur remaining due dikhao
  let upgradeNote = '';
  let netAmtAfterUpgrade = amt; // default: full amt
  if(_mC){
    // Member ki current plan ki paid amount (last fee record)
    const lastPaidRec = feeRecords
      .filter(r=>r.memberId===_mC.id)
      .sort((a,b)=>(b.date||'').localeCompare(a.date||'')||((parseInt(b.id)||0)-(parseInt(a.id)||0)))[0];
    const lastPaidAmt = lastPaidRec ? (parseFloat(lastPaidRec.paidAmount)||parseFloat(lastPaidRec.amount)||0) : 0;

    // Member ka current plan duration
    const memberDurVal = (() => {
      const raw = String(_mC.category||'1');
      if(raw.includes('6')) return 6;
      if(raw.includes('3')) return 3;
      return 1;
    })();
    const memberSubtotal = baseAmt * memberDurVal;
    const memberDisc = Math.round(memberSubtotal * getPlanDiscount(memberDurVal));
    const memberPlanTotal = memberSubtotal - memberDisc;

    // Upgrade scenario: new duration > member's current duration aur same plan
    // ✅ FIX: Credit SIRF mid-period upgrade pe do.
    // Agar renewal hai (FROM date >= member ki expiry), toh fresh full payment leni chahiye — koi credit nahi.
    const planStillActive = _mC.to && toISO(_mC.to) >= todayStr();
    const renewFromVal = document.getElementById('cf-renewFrom')?.value || todayStr();
    const isMidPeriodUpgrade = _mC.to && renewFromVal < toISO(_mC.to); // FROM date expiry se PEHLE = mid-period
    const memberFullyPaid = (_mC.feeStatus === 'Paid') &&
      lastPaidRec && (lastPaidRec.status === 'Paid' || !lastPaidRec.status);
    if(durVal > memberDurVal && lastPaidAmt > 0 && lastPaidAmt <= memberPlanTotal + 50 && memberFullyPaid && planStillActive && isMidPeriodUpgrade){
      const creditAmount = lastPaidAmt; // jo already paid hai
      netAmtAfterUpgrade = Math.max(0, amt - creditAmount);
      if(netAmtAfterUpgrade < amt){
        upgradeNote = `<div class="receipt-row" style="background:var(--bluel);border-radius:6px;padding:4px 8px;margin:4px 0">
          <span class="rlabel">✅ Already Paid (Credit)</span>
          <span class="rval" style="color:var(--green)">− ${fmtAmt(creditAmount)}</span>
        </div>
        <div class="receipt-row" style="font-weight:900;color:var(--orange)">
          <span class="rlabel">⬆️ Upgrade Due</span>
          <span class="rval" style="color:var(--orange)">${fmtAmt(netAmtAfterUpgrade)}</span>
        </div>`;
      }
    }
  }

  // Extra charges (multi)
  const extraCharges = getExtraChargeRows();
  const extraAmt = extraCharges.reduce((s,c)=>s+c.amount,0);
  const extraNote = extraCharges.map(c=>c.note).filter(Boolean).join(', ');
  // ✅ FIX: Agar member ka dueAmount > 0 hai (partial payment tha), to grandTotal mein sirf due amount lo
  // Lekin agar user ne NEW/DIFFERENT plan select kiya hai to fresh full charge leni chahiye
  const effectiveAmt = (!isSplit && _exDue > 0 && !upgradeNote && !isNewPlan) ? _exDue : (netAmtAfterUpgrade || amt);
  const grandTotal = (isSplit ? partialAmt : effectiveAmt) + extraAmt;

  // ✅ FIX: Agar due amount hai to preview mein "Already Paid" aur "Due Amount" bhi dikhao
  // New plan select karne pe paidSoFar nahi dikhana — fresh payment hai
  const paidSoFar = (!isSplit && _exDue > 0 && !upgradeNote && !isNewPlan) ? (amt - _exDue) : 0;

  document.getElementById('feePreviewBox').innerHTML=`
    <div class="receipt-row"><span class="rlabel">Plan</span><span class="rval">${plan}</span></div>
    <div class="receipt-row"><span class="rlabel">Shift</span><span class="rval">${shift}</span></div>
    <div class="receipt-row"><span class="rlabel">Duration</span><span class="rval">${durLabel}</span></div>
    <div class="receipt-row"><span class="rlabel">Base Fee × ${durVal}</span><span class="rval">${fmtAmt(baseAmt)} × ${durVal} = ${fmtAmt(subtotal)}</span></div>
    ${discAmt>0?`<div class="receipt-row"><span class="rlabel">🎉 Discount (${discRate*100}%)</span><span class="rval">− ${fmtAmt(discAmt)}</span></div>`:''}
    ${upgradeNote}
    ${paidSoFar>0?`<div class="receipt-row" style="color:var(--green)"><span class="rlabel">✅ Already Paid</span><span class="rval">− ${fmtAmt(paidSoFar)}</span></div>`:''}
    ${isSplit?`<div class="receipt-row"><span class="rlabel">Paying Now</span><span class="rval">${fmtAmt(partialAmt)}</span></div>
    <div class="receipt-row"><span class="rlabel">Remaining Due</span><span class="rval">${fmtAmt(remaining)}</span></div>`:''}
    ${extraCharges.map(c=>c.amount>0?`<div class="receipt-row"><span class="rlabel">➕ ${c.note||'Additional Charge'}</span><span class="rval">${fmtAmt(c.amount)}</span></div>`:'').join('')}
    ${extraAmt>0?`<div class="receipt-row" style="font-weight:900"><span class="rlabel">Grand Total</span><span class="rval">${fmtAmt(grandTotal)}</span></div>`:
    `<div class="receipt-row"><span class="rlabel">Total Amount</span><span class="rval">${fmtAmt(grandTotal)}</span></div>`}`;
  return {total:amt, subtotal, discAmt, discRate, paying: isSplit?partialAmt:effectiveAmt, remaining: isSplit?remaining:0, isSplit, extraAmt, extraNote, grandTotal, durVal, durLabel, extraCharges, netAmtAfterUpgrade, upgradeCredit: amt - netAmtAfterUpgrade};
}

function toggleSplit(){
  const on = document.getElementById('cf-splitToggle').checked;
  const fields = document.getElementById('cf-splitFields');
  if(fields) fields.style.display = on ? 'block' : 'none';
  if(!on){
    const pa = document.getElementById('cf-partialAmt');
    if(pa) pa.value='';
    const ra = document.getElementById('cf-remainingAmt');
    if(ra) ra.value='';
  }
  calcFee();
}

function updateFeeSplitPreview(){
  const plan=val('cf-plan')||'Monthly';
  if(plan === 'Custom / Manual'){ calcFee(); return; }
  const shift=val('cf-shift')||'Morning';
  const baseAmt=(feeStructure[plan]||{})[shift]||0;
  const durVal = parseInt(val('cf-category')||'1')||1;
  const subtotal = baseAmt * durVal;
  const total = subtotal - Math.round(subtotal * getPlanDiscount(durVal));
  const partial=parseFloat(document.getElementById('cf-partialAmt')?.value||'0')||0;
  // ✅ FIX: dueCache se existing due lo (fillMemberFeeDetails ne accurately compute kiya tha)
  const _exDueU = parseFloat(document.getElementById('cf-dueCache')?.value)||0;
  const rem = _exDueU > 0 ? Math.max(0, _exDueU - partial) : Math.max(0, total-partial);
  const remEl=document.getElementById('cf-remainingAmt');
  if(remEl) remEl.value=rem>0?rem:0;
  calcFee();
}

async function collectFee(){
  const mId=val('cf-member');
  if(!mId){ toast('⚠️ Please select a member','var(--red)'); return; }
  const member=members.find(m=>m.id===mId);
  let plan=val('cf-plan'), shift=val('cf-shift'), category=val('cf-category');
  let durVal = parseInt(category||'1')||1;
  let durLabel = durVal===3?'3 Month':durVal===6?'6 Month':'1 Month';
  let baseAmt=(feeStructure[plan]||{})[shift]||0;
  let subtotalAmt = baseAmt * durVal;
  let discRate = getPlanDiscount(durVal);
  let discAmt = Math.round(subtotalAmt * discRate);
  let totalAmt = subtotalAmt - discAmt;

  // ✅ CUSTOM / MANUAL PLAN — manual values override karo
  const isManualPlan = plan === 'Custom / Manual';
  if(isManualPlan){
    plan     = document.getElementById('cf-manualPlanName')?.value?.trim() || 'Custom';
    shift    = document.getElementById('cf-manualShift')?.value?.trim() || '—';
    durLabel = document.getElementById('cf-manualDuration')?.value?.trim() || '—';
    totalAmt = parseFloat(document.getElementById('cf-manualAmt')?.value)||0;
    if(totalAmt <= 0){ toast('⚠️ Manual amount enter karo (₹ > 0)','var(--red)'); return; }
  }
  const mode=val('cf-mode'), month=normalizeMonth(val('cf-month')), notes=val('cf-notes');

  const isSplit = document.getElementById('cf-splitToggle')?.checked;
  const memberForDue = members.find(m=>m.id===mId);
  // ✅ FIX: Cache se existing due lo — fillMemberFeeDetails ne sahi calculate kiya tha
  const existingDue = parseFloat(document.getElementById('cf-dueCache')?.value)||getMemberDue(mId);
  // ✅ FIX: Agar member ka existing due hai aur split off hai,
  // to sirf due amount collect karo, pura plan amount nahi
  let payingNow = (existingDue > 0 && !isSplit) ? existingDue : totalAmt;
  let remaining = 0;

  if(isSplit){
    const _paEl = document.getElementById('cf-partialAmt');
    payingNow = parseFloat(_paEl ? (_paEl.value === '' ? '0' : _paEl.value) : '0')||0;
    if(payingNow<=0){ toast('⚠️ Please enter a valid partial amount','var(--red)'); return; }
    if(existingDue > 0){
      // Existing due ke against payment — validate & calc against existingDue
      if(payingNow > existingDue){
        toast('⚠️ Amount cannot exceed existing due ₹'+existingDue,'var(--red)'); return;
      }
      remaining = Math.max(0, existingDue - payingNow);
    } else {
      // Fresh partial against new plan total
      if(payingNow > totalAmt){
        toast('⚠️ Partial amount cannot exceed total fee','var(--red)'); return;
      }
      remaining = Math.max(0, totalAmt - payingNow);
    }
  }

  // Extra charges (multi)
  const extraCharges = getExtraChargeRows();
  const extraAmt = extraCharges.reduce((s,c)=>s+c.amount,0);
  const extraNote = extraCharges.map(c=>c.note).filter(Boolean).join(', ');
  const grandTotal = payingNow + extraAmt;
  const recordAmount = isSplit ? totalAmt : grandTotal; // Full plan fee store karo for record

  const recId = getNextReceiptNumber();
  const splitNote = isSplit ? `Split Payment: ₹${payingNow} paid, ₹${remaining} remaining` : '';
  const extraChgNote = extraAmt>0 ? `Extra Charges (${extraNote}): ₹${extraAmt}` : '';
  const finalNotes = [notes, splitNote, extraChgNote].filter(Boolean).join(' | ');

  closeModal('modal-collectFee');
  // Reset toggles
  const extraToggle = document.getElementById('cf-splitToggle');
  if(extraToggle) extraToggle.checked=false;
  const splitFields = document.getElementById('cf-splitFields');
  if(splitFields) splitFields.style.display='none';
  const pa = document.getElementById('cf-partialAmt');
  if(pa) pa.value='';
  resetExtraChargeRows();

  try {
    await AR_API.collectFee({
      memberId:mId, memberName:member.name, plan, shift, category:durLabel,
      amount:recordAmount, paidAmount:payingNow, dueAmount:remaining,
      date:todayStr(), month, mode, notes:finalNotes,
      status: isSplit && remaining>0 ? 'Partial' : 'Paid'
    });
    // ✅ FIX: member feeStatus update karo Paid/Partial pe
    // ✅ FIX 2: member ki 'to' (valid till) date bhi update karo — 1/3/6 months aage
    const newFeeStatus = isSplit && remaining>0 ? 'Partial' : 'Paid';
    try {
      // ✅ Manual renewal dates use karo (user ne set ki hain)
      const rfFinal = document.getElementById('cf-renewFrom')?.value;
      const rtFinal = document.getElementById('cf-renewTo')?.value;
      const newTo = rtFinal || (() => {
        const baseFrom = member.to && toISO(member.to) >= todayStr() ? toISO(member.to) : todayStr();
        const d = new Date(baseFrom + 'T00:00:00');
        d.setMonth(d.getMonth() + durVal);
        return d.toLocaleDateString('en-CA', {timeZone:'Asia/Kolkata'});
      })();
      await AR_API.updateMember(mId, { ...member, feeStatus: newFeeStatus, dueAmount: remaining, to: newTo });
    } catch(ex){ /* server update fail hone par bhi continue karo */ }
    // Reload
    [members, feeRecords] = await Promise.all([AR_API.getMembers(), AR_API.getFeeRecords()]); await injectIDBImages(members);
    // Agar server se naya data nahi aya toh locally bhi update karo
    const localMember = members.find(m=>m.id===mId);
    if(localMember){ localMember.feeStatus = newFeeStatus; localMember.dueAmount = remaining; }
  } catch(e){ toast('❌ Fee save error: '+e.message,'var(--red)'); }

  document.getElementById('receiptContent').innerHTML=`
    <div class="receipt">
      <div class="receipt-row"><span class="rlabel">Receipt No.</span><span class="rval">${recId}</span></div>
      <div class="receipt-row"><span class="rlabel">Member</span><span class="rval">${member.name}</span></div>
      <div class="receipt-row"><span class="rlabel">Member ID</span><span class="rval">${mId}</span></div>
      <div class="receipt-row"><span class="rlabel">Plan</span><span class="rval">${plan}</span></div>
      <div class="receipt-row"><span class="rlabel">Duration</span><span class="rval">${durLabel}</span></div>
      <div class="receipt-row"><span class="rlabel">Base Fee × ${durVal}</span><span class="rval">${fmtAmt(baseAmt)} × ${durVal} = ${fmtAmt(subtotalAmt)}</span></div>
      ${discAmt>0?`<div class="receipt-row"><span class="rlabel">🎉 Discount (${discRate*100}%)</span><span class="rval">− ${fmtAmt(discAmt)}</span></div>`:''}
      <div class="receipt-row"><span class="rlabel">Shift</span><span class="rval">${shift}</span></div>
      <div class="receipt-row"><span class="rlabel">Month</span><span class="rval">${month}</span></div>
      <div class="receipt-row"><span class="rlabel">Mode</span><span class="rval">${mode}</span></div>
      ${isSplit?`<div class="receipt-row"><span class="rlabel">Plan Total</span><span class="rval">${fmtAmt(totalAmt)}</span></div>`:''}
      ${isSplit&&remaining>0?`<div class="receipt-row"><span class="rlabel">⚠️ Remaining Due</span><span class="rval">${fmtAmt(remaining)}</span></div>`:''}
      ${extraCharges.map(c=>c.amount>0?`<div class="receipt-row"><span class="rlabel">➕ ${c.note||'Additional Charge'}</span><span class="rval">${fmtAmt(c.amount)}</span></div>`:'').join('')}      ${finalNotes?`<div class="receipt-row"><span class="rlabel">Notes</span><span class="rval" style="font-size:11px">${finalNotes}</span></div>`:''}
      <div class="receipt-row"><span class="rlabel">Date</span><span class="rval">${fmtDate(todayStr())}</span></div>
      <div class="receipt-row"><span class="rlabel">${extraAmt>0?'Grand Total':'Amount Paid'}</span><span class="rval">${fmtAmt(grandTotal)}</span></div>
    </div>`;
  receiptWaData={member,plan,shift,category:durLabel,durVal,durLabel,baseAmt,amt:grandTotal,totalAmt,remaining,isSplit,month,mode,recId,notes:finalNotes,extraAmt,extraNote,extraCharges};
  document.getElementById('receiptWaBtn').onclick=()=>sendReceiptWA(false);
  const gBtn=document.getElementById('receiptWaGuardianBtn');
  if(gBtn){
    gBtn.onclick=()=>sendReceiptWA(true);
    gBtn.style.opacity=member.gphone?'1':'0.4';
  }
  document.getElementById('printReceiptBtn').onclick=printReceipt;
  openModal('modal-receipt');
  renderFees(); renderDues(); renderDashboard();
  if(isSplit && remaining>0){
    toast(`✅ ₹${payingNow} collected! ₹${remaining} remaining due.`,'var(--orange)');
  } else {
    toast('✅ Full fee collected! '+fmtAmt(payingNow),'var(--green)');
  }
}

function sendReceiptWA(toGuardian){
  if(!receiptWaData) return;
  const {member,plan,shift,category,durVal,baseAmt,amt,totalAmt,remaining,isSplit,month,mode,recId,notes}=receiptWaData;
  const durLabel = durVal>1?`${durVal} Month`:'1 Month';
  const splitLine = isSplit && remaining>0 ? `\n*Total Fee:* ₹${totalAmt}\n*Paid Now:* ₹${amt}\n⚠️ *Remaining Due:* ₹${remaining}` : `\n*Amount Paid:* ₹${amt}`;
  const who = toGuardian ? `Guardian of *${member.name}*` : `*${member.name}*`;
  const phone = toGuardian ? (member.gphone||member.phone) : member.phone;
  const durLine = durVal>1 ? `\n*Duration:* ${durLabel} (Base: ₹${baseAmt} × ${durVal})` : '';
  const msg=`🧾 *Yugvandana Library — Fee Receipt*\n\nDear ${who}, 🙏\n\n*Receipt ID:* ${recId}\n*Name:* ${member.name}\n*Member ID:* ${member.id}\n*Plan:* ${plan} | *Shift:* ${shift}${durLine}\n*Month:* ${month}${splitLine}\n*Mode:* ${mode}${notes?`\n*Notes:* ${notes}`:''}\n\n${!isSplit||remaining===0?'Fee successfully collected. ✅':'⚠️ Partial payment received. Please pay remaining amount soon.'}\n\nThank you!\n\n📍 Yugvandana Library — Ward No. 15, Sarkari Hospital Ke Samne, Baikunthpur\n📞 83498 52152`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,'_blank');
}

function numberToWords(num){
  num=Math.floor(Number(num)||0);
  if(num===0) return 'Zero';
  const ones=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  function convert(n){
    if(n<20) return ones[n];
    if(n<100) return tens[Math.floor(n/10)]+(n%10?' '+ones[n%10]:'');
    if(n<1000) return ones[Math.floor(n/100)]+' Hundred'+(n%100?' and '+convert(n%100):'');
    if(n<100000) return convert(Math.floor(n/1000))+' Thousand'+(n%1000?' '+convert(n%1000):'');
    if(n<10000000) return convert(Math.floor(n/100000))+' Lakh'+(n%100000?' '+convert(n%100000):'');
    return convert(Math.floor(n/10000000))+' Crore'+(n%10000000?' '+convert(n%10000000):'');
  }
  return 'Rupees '+convert(num)+' Only';
}

function printReceipt(){
  if(!receiptWaData) return;
  const {member,plan,shift,amt,totalAmt,remaining,isSplit,month,mode,recId,notes,category,durVal,baseAmt,extraAmt,extraNote,extraCharges}=receiptWaData;
  const durLabel = durVal>1?`${durVal} Month`:'1 Month';
  const printDate=new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
  const amtWords=numberToWords(amt);

  function invoiceBlock(copyLabel){
    const rows=[
      ['Invoice No.',`<strong>${recId}</strong>`],
      ['Invoice Date',printDate],
      ['Member Name',`<strong>${member.name}</strong>`],
      ['Member ID',member.id],
      ['Class / Course',member.cls||'—'],
      ['Seat No.',fmtSeat(member.seat)],
      ['Shift',shift],
      ['Plan',plan],
      ['Duration',durLabel],
      ...(baseAmt&&durVal>1?[[`Base Fee × ${durVal}`,`₹${baseAmt} × ${durVal}`]]:[]),
      ['For Month',month],
      ['Payment Mode',`<strong>${mode}</strong>`],
    ];
    let extraRows='';
    if(isSplit){
      extraRows+=`<tr style="background:#f0f0f0"><td style="padding:6px 10px;border:1px solid #bbb;font-size:11px;color:#333;font-weight:600">Plan Total</td><td style="padding:6px 10px;border:1px solid #bbb;font-size:11px;font-weight:700;text-align:right">&#8377;${totalAmt}</td></tr>`;
      if(remaining>0) extraRows+=`<tr style="background:#f5f5f5"><td style="padding:6px 10px;border:1px solid #999;font-size:11px;color:#900;font-weight:700">&#9888; Remaining Due</td><td style="padding:6px 10px;border:1px solid #999;font-size:11px;color:#900;font-weight:800;text-align:right">&#8377;${remaining}</td></tr>`;
    }
    if(extraCharges&&extraCharges.length>0) extraCharges.forEach(c=>{ if(c.amount>0) extraRows+=`<tr style="background:#f8f8f8"><td style="padding:6px 10px;border:1px solid #ccc;font-size:11px;color:#444;font-weight:700">&#10133; ${c.note||'Extra Charge'}</td><td style="padding:6px 10px;border:1px solid #ccc;font-size:11px;color:#444;font-weight:800;text-align:right">&#8377;${c.amount}</td></tr>`; });
    if(notes) extraRows+=`<tr><td style="padding:6px 10px;border:1px solid #ccc;font-size:10px;color:#555;font-weight:600">Notes</td><td style="padding:6px 10px;border:1px solid #ccc;font-size:10px;color:#111">${notes}</td></tr>`;

    return `<div style="background:#fff;border:2px solid #222;font-family:Arial,sans-serif;font-size:10px;color:#111;page-break-inside:avoid;">
      <div class="rct-hdr" style="background:#111;padding:8px 12px;display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-size:15px;font-weight:900;color:#fff;letter-spacing:2px;font-family:Georgia,serif;">STUDENTS LIBRARY</div>
          <div style="font-size:7px;color:#ccc;letter-spacing:1px;text-transform:uppercase;margin-top:1px;">Ward No. 15, Sarkari Hospital Ke Samne, Baikunthpur</div>
          <div style="font-size:7px;color:#aaa;margin-top:1px;">&#128205; Sarkari Hospital ke Samne &nbsp;|&nbsp; &#128222; 83498 52152</div>
        </div>
        <div style="text-align:right;">
          <div style="border:1px solid #fff;border-radius:4px;padding:2px 8px;display:inline-block;font-size:9px;font-weight:900;color:#fff;letter-spacing:1px;">FEE INVOICE</div>
          <div style="margin-top:3px;font-size:7px;color:#bbb;border-radius:3px;padding:2px 6px;display:inline-block;">${copyLabel}</div>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:10px;">
        <tbody>
          ${rows.map((r,i)=>`<tr class="${i%2===0?'rct-row-even':'rct-row-odd'}" style="background:${i%2===0?'#f0f0f0':'#fff'}"><td style="padding:4px 8px;border:1px solid #ccc;color:#555;font-weight:600;width:42%">${r[0]}</td><td style="padding:4px 8px;border:1px solid #ccc;font-weight:700;color:#000;">${r[1]}</td></tr>`).join('')}
          ${extraRows}
        </tbody>
      </table>
      <table style="width:100%;border-collapse:collapse;">
        <tr class="rct-total"><td style="padding:6px 8px;font-weight:900;font-size:11px;color:#fff;background:#111;width:60%">${isSplit?'Amount Paid Now':'TOTAL AMOUNT PAID'}</td><td style="padding:6px 8px;font-weight:900;font-size:14px;color:#fff;background:#111;text-align:right;">&#8377;${amt}/-</td></tr>
      </table>
      <div style="background:#eee;border-top:1px solid #bbb;padding:3px 8px;font-size:8px;color:#333;font-weight:700;">In words: <em>${amtWords}</em></div>
      <div style="padding:4px 8px;background:#f8f8f8;border-top:1px solid #ddd;display:flex;align-items:center;gap:8px;">
        <div style="flex:1;font-size:8px;color:#900;font-weight:700;">&#9888; No Refund — Fee once paid is non-refundable.</div>
        <div style="text-align:center;min-width:80px;"><div style="border-top:1.5px solid #333;margin-top:14px;padding-top:2px;font-size:7px;color:#333;font-weight:700;">Authorised Sign</div></div>
      </div>
      <div style="text-align:center;padding:3px 8px;border-top:1px solid #ddd;font-size:7px;color:#777;">&#128591; Thank you for studying at Yugvandana Library! &nbsp;|&nbsp; <span style="font-weight:700;color:#333">Rohit CircleX &#9898;&#10006;</span></div>
    </div>`;
  }

  const d=document.getElementById('printable-receipt');
  d.innerHTML=`
  <div style="width:190mm;margin:0 auto;padding:3mm 4mm;background:#fff;box-sizing:border-box;">
    ${invoiceBlock('CUSTOMER COPY')}
    <div style="display:flex;align-items:center;margin:3mm 0;gap:0;">
      <div style="flex:1;border-top:2px dashed #94a3b8;"></div>
      <div style="padding:0 6px;font-size:8px;color:#64748b;font-weight:700;white-space:nowrap;">&#9986; &nbsp;CUT HERE&nbsp; &#9986;</div>
      <div style="flex:1;border-top:2px dashed #94a3b8;"></div>
    </div>
    ${invoiceBlock('LIBRARY COPY')}
  </div>`;
  d.style.display='block';
  window.print();
  setTimeout(()=>{ d.style.display='none'; },1000);
}

function buildMonthFilter(){
  // Month filter: r.month se ya r.date se (IST normalized) — normalize karo pehle
  const allMonths = feeRecords.map(r=>{
    if(r.month) return normalizeMonth(r.month);
    if(r.date) return dateToMonthLabel(r.date);
    return null;
  }).filter(Boolean);
  const months = [...new Set(allMonths)].sort((a,b)=>monthSortKey(b)-monthSortKey(a));
  const sel = document.getElementById('fmonthFil');
  if(!sel) return;
  const cur = sel.value;
  sel.innerHTML='<option value="">All Months</option>'+months.map(m=>`<option value="${m}">${m}</option>`).join('');
  if(cur) sel.value=cur;
}

function renderFees(){
  buildMonthFilter();
  const q=(val('fsearch')||'').toLowerCase();
  const mf=val('fmonthFil');
  const modef=val('fmodeFil');
  let list=feeRecords.filter(r=>{
    if(q&&!r.memberName.toLowerCase().includes(q)&&!r.memberId.toLowerCase().includes(q)) return false;
    if(mf&&normalizeMonth(r.month)!==mf) return false;
    if(modef&&r.mode!==modef) return false;
    return true;
  }).slice().sort((a,b)=>{
    // Latest date pehle, same date mein latest ID pehle
    const dc = normDate(b.date).localeCompare(normDate(a.date));
    if(dc!==0) return dc;
    return (b.id||'').localeCompare(a.id||'');
  });

  const totalAmt = list.reduce((s,r)=>s+(parseFloat(r.paidAmount)||parseFloat(r.amount)||0),0);
  const totalExtra = list.reduce((s,r)=>{
    if(!r.notes) return s;
    const m = r.notes.match(/Extra Charges[^:]*: ₹(\d+(\.\d+)?)/);
    return m ? s + parseFloat(m[1]) : s;
  }, 0);
  const statsEl = document.getElementById('feeStats');
  if(statsEl) statsEl.innerHTML = [
    {label:'Records',val:list.length,c:'var(--blue)'},
    {label:'Total Collected',val:fmtAmt(totalAmt),c:'var(--green)'},
    {label:'Cash',val:fmtAmt(list.filter(r=>r.mode==='Cash').reduce((s,r)=>s+(parseFloat(r.paidAmount)||parseFloat(r.amount)||0),0)),c:'var(--yellow)'},
    {label:'UPI/Online',val:fmtAmt(list.filter(r=>r.mode!=='Cash').reduce((s,r)=>s+(parseFloat(r.paidAmount)||parseFloat(r.amount)||0),0)),c:'var(--teal)'},
    ...(totalExtra>0?[{label:'Extra Charges',val:fmtAmt(totalExtra),c:'var(--purple)'}]:[]),
  ].map(s=>`<div style="background:var(--card);border:1px solid var(--border);border-radius:9px;padding:10px 16px;display:flex;flex-direction:column;gap:3px">
    <div style="font-size:11px;color:var(--ink3);font-weight:800;text-transform:uppercase">${s.label}</div>
    <div style="font-size:17px;font-weight:900;color:${s.c}">${s.val}</div>
  </div>`).join('');

  document.getElementById('feeTable').innerHTML = list.length ? list.map(r=>{
    const paid = parseFloat(r.paidAmount)||parseFloat(r.amount)||0;
    const due = parseFloat(r.dueAmount)||0;
    const isPartial = r.status==='Partial' && due>0;
    // Extra charges from notes
    let extraChargesHtml = '—';
    if(r.notes){
      const ecMatch = r.notes.match(/Extra Charges \(([^)]+)\): ₹(\d+(\.\d+)?)/);
      if(ecMatch){ extraChargesHtml = `<span style="color:var(--purple);font-weight:800">₹${parseFloat(ecMatch[2]).toLocaleString('en-IN')}</span><br><span style="font-size:10px;color:var(--ink3)">${ecMatch[1]}</span>`; }
    }
    return `
    <tr>
      <td data-label="Receipt" style="font-family:monospace;font-size:11px;color:var(--ink3)">${r.id}</td>
      <td data-label="Member"><div style="font-weight:700">${r.memberName}</div><div style="font-size:11px;color:var(--ink3)">${r.memberId}</div></td>
      <td data-label="Plan"><span class="badge b-blue">${r.plan}</span></td>
      <td data-label="Shift">${r.shift}</td>
      <td data-label="Amount">
        <div style="font-weight:800;color:var(--green)">${fmtAmt(paid)}<span style="font-size:10px;font-weight:600;color:var(--ink3)"> paid</span></div>
        ${isPartial?`<div style="font-weight:800;color:var(--red);font-size:12px">${fmtAmt(due)}<span style="font-size:10px;font-weight:600;color:var(--ink3)"> due</span></div>`:''}
      </td>
      <td data-label="Extra" class="fee-extra-col">${extraChargesHtml}</td>
      <td data-label="Date/Month">${fmtDate(r.date)}<br><span style="font-size:10px;color:var(--ink3)">${r.month}</span></td>
      <td data-label="Mode"><span class="badge b-gray">${r.mode}</span></td>
      <td data-label="Status"><span class="badge ${r.status==='Partial'?'b-orange':'b-green'}">${r.status}</span></td>
      <td data-label="Action" style="display:flex;gap:5px;flex-wrap:wrap">
        <button class="btn btn-ghost btn-sm btn-icon" onclick="openEditFeeRecord('${r.id}')" title="Edit Record" style="${isAdmin()?'':'display:none'}">✏️</button>
        <button class="btn btn-blue btn-sm btn-icon" onclick="downloadReceiptById('${r.id}')" title="Download Receipt">🧾</button>
        <button class="btn btn-wa btn-sm btn-icon" onclick="sendReceiptWAById('${r.id}',false)" title="Send Student WA">📲</button>
        ${(()=>{ const _m=members.find(x=>x.id===r.memberId); return _m&&_m.gphone?`<button class="btn btn-wa btn-sm btn-icon" style="background:#128c7e" onclick="sendReceiptWAById('${r.id}',true)" title="Send Guardian WA">👨‍👩‍👧</button>`:''; })()}
        <button class="btn btn-red btn-sm btn-icon" onclick="deleteFeeRecord('${r.id}')" title="Delete" style="${isAdmin()?'':'display:none'}">🗑️</button>
      </td>
    </tr>`;}).join('') : `<tr><td colspan="10"><div class="empty"><div class="empty-icon">💸</div><h3>No records found</h3></div></td></tr>`;
}

function deleteFeeRecord(id){
  requireAdmin(async ()=>{
    if(!confirm('Delete this fee record? It will be moved to Recycle Bin for 30 days.')) return;
    try {
      const rec=feeRecords.find(x=>x.id===id);
      if(rec) addToRecycleBin('fee', `${rec.memberName} — ${rec.id}`, {...rec});
      await AR_API.deleteFeeRecord(id, 'anuj@2006');
      feeRecords = await AR_API.getFeeRecords();
      renderFees();
      toast('\uD83D\uDDD1\uFE0F Fee record moved to Recycle Bin','var(--orange)');
    } catch(e){ toast('\u274c '+e.message,'var(--red)'); }
  });
}

function downloadReceiptById(recId){
  const r=feeRecords.find(x=>x.id===recId);
  const m=members.find(x=>x.id===r?.memberId);
  if(!r){ toast('⚠️ Receipt not found','var(--red)'); return; }
  const mName = m?.name || r.memberName;
  const receiptHTML=`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Receipt ${r.id}</title>
  <style>body{font-family:sans-serif;padding:30px;max-width:500px;margin:auto;color:#111}
  h2{text-align:center;color:#1d4ed8}
  .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;font-size:14px}
  .row:last-child{border:none;font-weight:800;font-size:16px;color:#1d4ed8}
  .label{color:#666}.footer{text-align:center;margin-top:24px;font-size:12px;color:#888}</style></head>
  <body>
  <h2>📚 Yugvandana Library</h2><p style="text-align:center;font-size:12px;color:#888">Ward No. 15, Sarkari Hospital Ke Samne, Baikunthpur | 83498 52152</p>
  <hr style="margin:12px 0"/>
  <div class="row"><span class="label">Receipt No.</span><span>${r.id}</span></div>
  <div class="row"><span class="label">Member</span><span>${mName}</span></div>
  <div class="row"><span class="label">Member ID</span><span>${r.memberId}</span></div>
  <div class="row"><span class="label">Plan</span><span>${r.plan}</span></div>
  <div class="row"><span class="label">Shift</span><span>${r.shift}</span></div>
  <div class="row"><span class="label">Month</span><span>${r.month}</span></div>
  <div class="row"><span class="label">Payment Mode</span><span>${r.mode}</span></div>
  ${r.notes?`<div class="row"><span class="label">Notes</span><span>${r.notes}</span></div>`:''}
  <div class="row"><span class="label">Date</span><span>${fmtDate(r.date)}</span></div>
  <div class="row"><span class="label">Total Amount</span><span>₹${r.amount}</span></div>
  <div class="footer">Thank you for studying at Yugvandana Library! 🙏<br/>Fees once paid are non-refundable.<br/><span style="font-size:10px;color:#aaa;margin-top:4px;display:block">Developed by Rohit CircleX ©</span></div>
  </body></html>`;
  const blob=new Blob([receiptHTML],{type:'text/html'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`Receipt_${r.id}_${mName.replace(/ /g,'_')}.html`;
  a.click();
  toast(`🧾 Receipt ${r.id} downloaded!`,'var(--blue)');
}

function sendReceiptWAById(recId, toGuardian=false){
  const r=feeRecords.find(x=>x.id===recId);
  const m=members.find(x=>x.id===r?.memberId);
  if(!m||!r){ toast('⚠️ Member not found','var(--red)'); return; }
  const who = toGuardian ? `Guardian of *${r.memberName}*` : `*${r.memberName}*`;
  const phone = toGuardian ? (m.gphone||m.phone) : m.phone;
  const msg=`🧾 *Yugvandana Library — Fee Receipt*\n\nDear ${who}, 🙏\n\n*Receipt ID:* ${r.id}\n*Name:* ${r.memberName}\n*Plan:* ${r.plan} | *Shift:* ${r.shift}\n*Month:* ${r.month}\n*Amount:* ₹${r.amount} (${r.mode})\n*Date:* ${fmtDate(r.date)}${r.notes?`\n*Notes:* ${r.notes}`:''}\n\n✅ Fee paid. Thank you!\n\n📍 Yugvandana Library — Ward No. 15, Sarkari Hospital Ke Samne, Baikunthpur\n📞 83498 52152`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,'_blank');
}

function renderFeeStructure(){
  const plans=Object.keys(feeStructure);
  const shifts=['Morning','Evening','Full Day'];
  const durations=[{label:'1 Month',x:1},{label:'3 Month',x:3},{label:'6 Month',x:6}];
  const el=document.getElementById('feeStructure');
  if(!el) return;
  el.innerHTML = `
  <div style="font-size:12px;color:var(--ink3);margin-bottom:12px;padding:8px 12px;background:var(--bg3);border-radius:8px;border:1px solid var(--border)">
    💡 Base rates editable · <span style="color:var(--green);font-weight:800">3 Month = 10% off</span> · <span style="color:var(--purple);font-weight:800">6 Month = 20% off</span>
  </div>
  <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">
    <thead><tr style="background:var(--bg3)">
      <th style="padding:10px 14px;text-align:left;color:var(--ink3);font-size:11px;text-transform:uppercase;border-bottom:1px solid var(--border)">Plan</th>
      <th style="padding:10px 14px;text-align:right;color:var(--ink3);font-size:11px;text-transform:uppercase;border-bottom:1px solid var(--border)">Morning</th>
      <th style="padding:10px 14px;text-align:right;color:var(--ink3);font-size:11px;text-transform:uppercase;border-bottom:1px solid var(--border)">Evening</th>
      <th style="padding:10px 14px;text-align:right;color:var(--ink3);font-size:11px;text-transform:uppercase;border-bottom:1px solid var(--border)">Full Day</th>
      <th style="padding:10px 14px;text-align:right;color:var(--teal);font-size:11px;text-transform:uppercase;border-bottom:1px solid var(--border)">3 Month <span style="color:var(--green)">-10%</span></th>
      <th style="padding:10px 14px;text-align:right;color:var(--purple);font-size:11px;text-transform:uppercase;border-bottom:1px solid var(--border)">6 Month <span style="color:var(--green)">-20%</span></th>
    </tr></thead>
    <tbody>${plans.map((p,i)=>{
      const m=(feeStructure[p]||{}).Morning||0;
      const e=(feeStructure[p]||{}).Evening||0;
      const f=(feeStructure[p]||{})['Full Day']||0;
      const m3=Math.round(m*3*0.9), m6=Math.round(m*6*0.8);
      return `<tr style="${i%2===1?'background:var(--bg3)':''}">
        <td style="padding:10px 14px;font-weight:700;color:var(--ink);border-bottom:1px solid var(--border)">${p}</td>
        <td style="padding:10px 14px;text-align:right;font-weight:800;color:var(--blue);border-bottom:1px solid var(--border)">${fmtAmt(m)}</td>
        <td style="padding:10px 14px;text-align:right;font-weight:800;color:var(--blue);border-bottom:1px solid var(--border)">${fmtAmt(e)}</td>
        <td style="padding:10px 14px;text-align:right;font-weight:800;color:var(--blue);border-bottom:1px solid var(--border)">${fmtAmt(f)}</td>
        <td style="padding:10px 14px;text-align:right;font-weight:800;color:var(--teal);border-bottom:1px solid var(--border)">${fmtAmt(m3)}<br><span style="font-size:10px;color:var(--ink3);text-decoration:line-through">${fmtAmt(m*3)}</span></td>
        <td style="padding:10px 14px;text-align:right;font-weight:800;color:var(--purple);border-bottom:1px solid var(--border)">${fmtAmt(m6)}<br><span style="font-size:10px;color:var(--ink3);text-decoration:line-through">${fmtAmt(m*6)}</span></td>
      </tr>`;}).join('')}</tbody>
  </table></div>`;
}

function saveDiscountSettings(){
  loadAppSettings();
  const v3 = parseFloat(document.getElementById('disc-3m')?.value);
  const v6 = parseFloat(document.getElementById('disc-6m')?.value);
  if(isNaN(v3)||v3<0||v3>100||isNaN(v6)||v6<0||v6>100){
    toast('⚠️ 0–100 ke beech valid percentage daalen','var(--red)'); return;
  }
  appSettings.discounts = { threeMonth: v3, sixMonth: v6 };
  saveAppSettings();
  updateDiscountPreview();
  toast(`✅ Discount saved — 3M: ${v3}%, 6M: ${v6}%`, 'var(--green)');
}

function updateDiscountPreview(){
  loadAppSettings();
  const d = appSettings.discounts || { threeMonth:10, sixMonth:20 };
  const el = document.getElementById('discPreview');
  if(el) el.textContent = `3-Month plan par ${d.threeMonth}% discount · 6-Month plan par ${d.sixMonth}% discount`;
  const i3 = document.getElementById('disc-3m');
  const i6 = document.getElementById('disc-6m');
  if(i3) i3.value = d.threeMonth;
  if(i6) i6.value = d.sixMonth;
}

function setFeeSettingsTab(t, btn){
  ['structure','edit','plans','charges'].forEach(x=>{
    const el=document.getElementById('fs-tab-'+x); if(el) el.style.display='none';
  });
  const target=document.getElementById('fs-tab-'+t);
  if(target) target.style.display='block';
  document.querySelectorAll('.exp-tab[id^="fstab-"]').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  if(t==='edit') { renderBulkFeeGrid(); updateDiscountPreview(); }
  if(t==='structure') renderFeeStructure();
  if(t==='plans') renderCustomPlanList();
  if(t==='charges') renderChargeTypeList();
}

function renderBulkFeeGrid(){
  const plans=Object.keys(feeStructure);
  const shifts=['Morning','Evening','Full Day'];
  const el=document.getElementById('fsBulkGrid');
  if(!el) return;
  el.innerHTML=plans.map(p=>`
    <div style="margin-bottom:14px;padding:12px;background:var(--bg3);border:1px solid var(--border);border-radius:10px">
      <div style="font-weight:800;font-size:12px;color:var(--blue);margin-bottom:8px">${p}</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
        ${shifts.map(s=>`<div>
          <div style="font-size:10px;color:var(--ink3);font-weight:700;margin-bottom:4px">${s}</div>
          <input type="number" class="bulk-fee-input" data-plan="${p}" data-shift="${s}"
            value="${(feeStructure[p]||{})[s]||0}"
            style="width:100%;padding:6px 8px;border:1.5px solid var(--border);border-radius:7px;background:var(--card2);color:var(--ink);font-size:12px;font-weight:700"/>
        </div>`).join('')}
      </div>
    </div>`).join('');
}

async function saveBulkFees(){
  const inputs=document.querySelectorAll('.bulk-fee-input');
  let count=0;
  for(const inp of inputs){
    const plan=inp.dataset.plan, shift=inp.dataset.shift, amt=parseFloat(inp.value)||0;
    if((feeStructure[plan]||{})[shift] !== amt){
      try{ await AR_API.updateFeeStructure(plan,shift,amt); count++; } catch(e){}
      if(!feeStructure[plan]) feeStructure[plan]={};
      feeStructure[plan][shift]=amt;
    }
  }
  renderFeeStructure();
  if(document.getElementById('page-seats')?.classList.contains('active')) renderZonePricingStrip();
  toast(`✅ ${count} fee${count!==1?'s':''} updated!`,'var(--green)');
}

function renderCustomPlanList(){
  const plans=Object.keys(feeStructure);
  const defPlans=['Half Day','Half Day + Reserved Seat','Full Day','Full Day + Reserved Seat'];
  const custom=plans.filter(p=>!defPlans.includes(p));
  const el=document.getElementById('customPlanList');
  if(!el) return;
  el.innerHTML = custom.length ? custom.map(p=>`
    <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="flex:1">
        <div style="font-weight:800;font-size:13px;color:var(--ink)">${p}</div>
        <div style="font-size:11px;color:var(--ink3)">M:${fmtAmt((feeStructure[p]||{}).Morning||0)} · E:${fmtAmt((feeStructure[p]||{}).Evening||0)} · F:${fmtAmt((feeStructure[p]||{})['Full Day']||0)}</div>
      </div>
      <button class="btn btn-red btn-sm btn-icon" onclick="deleteCustomPlan('${p}')">🗑️</button>
    </div>`).join('')
  : `<div style="color:var(--ink3);font-size:13px;text-align:center;padding:20px">No custom plans yet</div>`;
}

function deleteCustomPlan(name){
  if(!confirm(`Delete plan "${name}"?`)) return;
  delete feeStructure[name];
  renderCustomPlanList();
  renderFeeStructure();
  populateAllShiftDropdowns(); // plan dropdowns se bhi hatao
  toast('🗑️ Plan deleted','var(--orange)');
}


async function updateFeeStructure(){
  const plan=val('fplan'), shift=val('fshift2'), amt=parseFloat(val('famt'));
  if(!amt||isNaN(amt)||amt<=0){ toast('\u26a0\ufe0f Please enter a valid amount','var(--red)'); return; }
  try {
    await AR_API.updateFeeStructure(plan, shift, amt);
    feeStructure = await AR_API.getFeeStructure();
    renderFeeStructure();
    if(document.getElementById('page-seats')?.classList.contains('active')) renderZonePricingStrip();
    toast(`\u2705 ${plan} / ${shift}: ${fmtAmt(amt)}`,'var(--green)');
  } catch(e){ toast('\u274c '+e.message,'var(--red)'); }
}

function renderDues(){
  const duesDurFil = val('duesDurationFil')||'';
  const duesQ = (document.getElementById('duesSearch')?.value||'').toLowerCase().trim();
  const due=members.filter(m=>{
    if(!(m.feeStatus==='Due'||m.feeStatus==='Expired'||m.feeStatus==='Partial')) return false;
    if(duesDurFil){
      const raw=String(m.category||'1');
      const dur=raw.includes('6')?'6':raw.includes('3')?'3':'1';
      if(dur!==duesDurFil) return false;
    }
    if(duesQ && !(m.name||'').toLowerCase().includes(duesQ) && !(m.id||'').toLowerCase().includes(duesQ)) return false;
    return true;
  });
  document.getElementById('duesTable').innerHTML = due.length ? due.map(m=>{
    const shiftKey = m.shift.includes('Full Day')?'Full Day': m.shift.includes('Evening')?'Evening':'Morning';
    const _baseAmt=(feeStructure[m.plan]||{})[shiftKey]||0;
    const _durVal=parseInt(m.category)||1;
    const _sub=_baseAmt*_durVal;
    const planAmt=_sub-Math.round(_sub*getPlanDiscount(_durVal)); // actual total with duration+discount

    // KEY FIX: Sabhi members ke liye fee_records se latest record lo
    let dueAmt, paidAmt, totalAmt;
    const _latestRec = feeRecords
      .filter(r=>r.memberId===m.id)
      .sort((a,b)=>{
        const dateDiff=(b.date||'').localeCompare(a.date||'');
        if(dateDiff!==0) return dateDiff;
        return (parseInt(b.id)||0)-(parseInt(a.id)||0);
      })[0];

    if(m.feeStatus==='Partial'){
      const latestPartial = feeRecords
        .filter(r=>r.memberId===m.id && r.status==='Partial')
        .sort((a,b)=>{
          const dateDiff=(b.date||'').localeCompare(a.date||'');
          if(dateDiff!==0) return dateDiff;
          return (parseInt(b.id)||0)-(parseInt(a.id)||0);
        })[0];
      if(latestPartial){
        dueAmt  = parseFloat(latestPartial.dueAmount)||0;
        paidAmt = parseFloat(latestPartial.paidAmount)||0;
        totalAmt = parseFloat(latestPartial.amount)||(dueAmt + paidAmt);
      } else {
        dueAmt  = parseFloat(m.dueAmount)||0;
        paidAmt = Math.max(0, planAmt - dueAmt);
        totalAmt = planAmt;
      }
    } else {
      // Due/Expired — fee_records se bhi paid amount dikhao agar koi record hai
      // FIX: Plan change hone ke baad purani payment naye plan ke against credit karo
      if(parseFloat(m.dueAmount) > 0){
        // Explicitly set dueAmount hai to use karo
        dueAmt = parseFloat(m.dueAmount);
      } else if(_latestRec && parseFloat(_latestRec.paidAmount) > 0){
        // Payment record hai: naye plan se paid amount ghataao
        const _totalPaid = feeRecords
          .filter(r=>r.memberId===m.id)
          .reduce((sum,r)=>sum+(parseFloat(r.paidAmount)||parseFloat(r.amount)||0),0);
        dueAmt = Math.max(0, planAmt - _totalPaid);
      } else {
        dueAmt = planAmt;
      }
      if(_latestRec){
        paidAmt  = parseFloat(_latestRec.paidAmount)||parseFloat(_latestRec.amount)||0;
        totalAmt = planAmt;
      } else {
        paidAmt  = 0;
        totalAmt = planAmt;
      }
    }

    const isPartial = dueAmt > 0 && paidAmt > 0;
    const daysLeft = m.to ? Math.ceil((new Date(toISO(m.to))-new Date(todayStr()))/(86400000)) : null;
    const expiryBadge = daysLeft!==null && daysLeft<=1
      ? `<span style="color:var(--red);font-weight:900;font-size:10px"> ⚠️ ${daysLeft<=0?'Expired!':'Expires Tomorrow!'}</span>` : '';
    return `
    <tr>
      <td data-label="Member"><div style="font-weight:700">${m.name}${expiryBadge}</div><div style="font-size:11px;color:var(--ink3)">${m.id} · 📞 ${m.phone||'—'}</div></td>
      <td data-label="Seat">${fmtSeat(m.seat)}</td>
      <td data-label="Shift">${shiftShort(m.shift)}</td>
      <td data-label="Plan"><span class="badge b-blue">${m.plan}</span></td>
      <td data-label="Valid Till" style="color:${m.feeStatus==='Expired'?'var(--red)':'var(--orange)'}">${fmtDate(m.to)}<br><span class="badge ${m.feeStatus==='Expired'?'b-red':m.feeStatus==='Partial'?'b-orange':'b-yellow'}">${m.feeStatus}</span></td>
      <td data-label="Amount Due" style="font-weight:800;color:var(--red)">
        ${fmtAmt(dueAmt)}
        ${isPartial?`<br><span style="font-size:10px;color:var(--green)">✅ Paid: ${fmtAmt(paidAmt)}</span><br><span style="font-size:10px;color:var(--ink3)">Total: ${fmtAmt(totalAmt)}</span>`:''}
      </td>
      <td data-label="Action" style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn btn-wa btn-sm" onclick="sendWA('${m.id}','due',false)">📲 Student</button>
        ${m.gphone?`<button class="btn btn-wa btn-sm" style="background:#128c7e;margin-left:3px" onclick="sendWA('${m.id}','due',true)">👨‍👩‍👧 Guardian</button>`:''}
        <button class="btn btn-green btn-sm" onclick="quickFee('${m.id}')">💰 Collect</button>
      </td>
    </tr>`;}).join('') : `<tr><td colspan="7"><div class="empty"><div class="empty-icon">🎉</div><h3>No pending dues!</h3></div></td></tr>`;
}

function quickFee(id){
  populateFeeModal();
  const selEl = document.getElementById('cf-member');
  if(selEl) selEl.value = id;
  // fillMemberFeeDetails handles auto-split + due amount calculation from fee records
  fillMemberFeeDetails(id);
  calcFee();
  openModal('modal-collectFee');
}

// ═══ ATTENDANCE ═══════════════════════════════════════════════════════════════
function renderAttendance(){
  const date=val('attDate')||todayStr();
  const q=(val('attSearch')||'').toLowerCase();
  // ✅ Mark search — upar wala search box (Present/Absent grid filter)
  const mq=(document.getElementById('attMarkSearch')?.value||'').toLowerCase().trim();
  const todayRecs=attendance.filter(a=>a.date===date);
  const presentIds=new Set(todayRecs.filter(a=>a.present).map(a=>a.memberId));

  // Filter by shift tab
  let allMembers = members;
  if(currentAttShift==='morning') allMembers = members.filter(m=>m.shift&&m.shift.includes('Morning'));
  else if(currentAttShift==='evening') allMembers = members.filter(m=>m.shift&&m.shift.includes('Evening'));
  else if(currentAttShift==='fullday') allMembers = members.filter(m=>m.shift&&(m.shift.includes('Full Day')||m.shift.includes('Full')));

  // ✅ Name search filter on present/absent grids
  if(mq) allMembers = allMembers.filter(m=>(m.name||'').toLowerCase().includes(mq)||(m.id||'').toLowerCase().includes(mq)||(m.seat||'').toLowerCase().includes(mq));

  let present=allMembers.filter(m=>presentIds.has(m.id));
  let absent=allMembers.filter(m=>!presentIds.has(m.id));

  document.getElementById('presentCount').textContent=present.length;
  document.getElementById('absentCount').textContent=absent.length;

  const makeAtt=(list,isPresent)=>list.map(m=>{
    const rec = todayRecs.find(a=>a.memberId===m.id);
    return `
    <div class="att-card">
      <div class="att-avatar" style="background:${m.color}">${m.name[0]}</div>
      <div>
        <div class="att-name">${m.name}</div>
        <div class="att-time">${shiftShort(m.shift)} · Seat ${fmtSeat(m.seat)}</div>
        ${isPresent&&rec?`<div class="att-time" style="color:var(--green)">In: ${rec.in||'—'} ${rec.out?`| Out: ${rec.out}`:'<span style="color:var(--orange)">| Active</span>'}</div>`:''}
      </div>
      <div class="att-btns">
        ${isPresent
          ? `<button class="btn btn-orange btn-sm btn-icon" onclick="openCheckout('${m.id}','${date}')" title="Mark Check-Out">🕐</button>
             <button class="btn btn-red btn-sm btn-icon" onclick="toggleAtt('${m.id}','${date}',false)" title="Mark Absent">✕</button>`
          : `<button class="btn btn-green btn-sm btn-icon" onclick="toggleAtt('${m.id}','${date}',true)" title="Mark Present">✓</button>`
        }
        <button class="btn btn-wa btn-sm btn-icon" onclick="sendWA('${m.id}','absent',false)" title="WhatsApp Student">📲</button>
        ${m.gphone?`<button class="btn btn-wa btn-sm btn-icon" style="background:#128c7e" onclick="sendWA('${m.id}','absent',true)" title="WhatsApp Guardian">👨‍👩‍👧</button>`:''}
      </div>
    </div>`;}).join('');

  document.getElementById('presentGrid').innerHTML=present.length?makeAtt(present,true):`<div class="empty"><div class="empty-icon">😶</div><h3>No one present</h3></div>`;
  document.getElementById('absentGrid').innerHTML=absent.length?makeAtt(absent,false):`<div class="empty"><div class="empty-icon">🎉</div><h3>Everyone is present!</h3></div>`;

  // Also refresh quick checkin panel if open
  if(currentAttShift!=='all'){
    const panel = document.getElementById('quickCheckinPanel');
    if(panel&&panel.style.display!=='none') renderQuickCheckin(currentAttShift);
  }

  let allAtt = attendance.slice().sort((a,b)=>{
    // Date descending — newest first
    const dc = (b.date||'').localeCompare(a.date||'');
    if(dc!==0) return dc;
    // Same date: sort by in-time descending
    return (b.in||'').localeCompare(a.in||'');
  });
  // ✅ Name/ID search
  if(q) allAtt = allAtt.filter(a=>(a.memberName||'').toLowerCase().includes(q)||(a.memberId||'').toLowerCase().includes(q));
  // ✅ Date filter from log date input
  const logDate = (document.getElementById('attLogDate')?.value||'').trim();
  if(logDate) allAtt = allAtt.filter(a=>a.date===logDate);
  // Filter log by shift tab too
  if(currentAttShift==='morning') allAtt=allAtt.filter(a=>a.shift&&a.shift.toLowerCase().includes('morning'));
  else if(currentAttShift==='evening') allAtt=allAtt.filter(a=>a.shift&&a.shift.toLowerCase().includes('evening'));
  else if(currentAttShift==='fullday') allAtt=allAtt.filter(a=>a.shift&&(a.shift.toLowerCase().includes('full')));

  document.getElementById('attTable').innerHTML=allAtt.map(a=>`
    <tr>
      <td>${fmtDate(a.date||'')}</td>
      <td style="font-weight:700">${a.memberName||'—'}</td>
      <td>${a.shift||'—'}</td>
      <td>Seat ${a.seat||'—'}</td>
      <td style="color:var(--green)">${a.in||'—'}</td>
      <td style="color:var(--orange)">${a.out||'—'}</td>
      <td><span class="badge ${a.present?'b-green':'b-red'}">${a.present?'Present':'Absent'}</span></td>
      <td><button class="btn btn-red btn-sm btn-icon" onclick="deleteAttRec('${a.memberId}','${a.date||''}')" title="Delete">🗑️</button></td>
    </tr>`).join('');
}

// ── Attendance — Direct Server Calls (no localStorage) ───────────────────────
async function toggleAtt(mId,date,present){
  const m=members.find(x=>x.id===mId);
  if(!m) return;
  try {
    if(present){
      await AR_API.checkIn({memberId:mId,memberName:m.name,shift:shiftShort(m.shift),seat:m.seat||null,date,in:nowTime()});
    } else {
      const existing = attendance.find(a=>a.date===date&&a.memberId===mId);
      if(existing&&existing.id) await AR_API.deleteAttendance(existing.id);
    }
    attendance = await AR_API.getAttendance();
  } catch(e){
    toast('❌ Server error: '+e.message,'var(--red)'); return;
  }
  renderAttendance();
  toast(present?`✅ ${m.name} — Present`:`❌ ${m.name} — Absent`, present?'var(--green)':'var(--red)');
}

function openCheckout(mId,date){
  const rec=attendance.find(a=>a.date===date&&a.memberId===mId);
  const m=members.find(x=>x.id===mId);
  if(!rec||!m) return;
  checkoutTarget={mId,date};
  document.getElementById('checkoutInfo').innerHTML=`<strong>${m.name}</strong><br>Check-In: <span style="color:var(--green)">${rec.in||'—'}</span>`;
  document.getElementById('co-time').value=nowTime();
  openModal('modal-checkout');
}

async function confirmCheckout(){
  if(!checkoutTarget) return;
  const {mId,date}=checkoutTarget;
  const m=members.find(x=>x.id===mId);
  const outTime = val('co-time');
  closeModal('modal-checkout');
  try {
    await AR_API.checkOut({memberId:mId, date, out:outTime});
    attendance = await AR_API.getAttendance();
  } catch(e){ toast('❌ Checkout error: '+e.message,'var(--red)'); }
  renderAttendance();
  toast(`🕐 ${m?.name} — Checked Out at ${outTime}`,'var(--orange)');
  if(currentAttShift!=='all') renderQuickCheckin(currentAttShift);
  checkoutTarget=null;
}

function deleteAttRec(mId,date){
  requireAdmin(async ()=>{
    if(!confirm('Delete this attendance record?')) return;
    try {
      const existing = attendance.find(a=>a.date===date&&a.memberId===mId);
      if(existing&&existing.id) await AR_API.deleteAttendance(existing.id);
      attendance = await AR_API.getAttendance();
    } catch(e){ toast('❌ '+e.message,'var(--red)'); return; }
    renderAttendance();
    toast('🗑️ Attendance deleted','var(--orange)');
  });
}

function markAttendance(id){
  // Find attendance button dynamically instead of hardcoded index
  const attBtn = Array.from(document.querySelectorAll('.sidebar button')).find(b=>b.textContent.includes('Attendance'));
  nav('attendance', attBtn || null);
  document.getElementById('attDate').value=todayStr();
  setTimeout(()=>{ toggleAtt(id,todayStr(),true); },300);
}

// ═══ WHATSAPP ═════════════════════════════════════════════════════════════════
function sendWA(mId, type, toGuardian=false){
  const m=members.find(x=>x.id===mId);
  if(!m){ toast('Member not found','var(--red)'); return; }
  const lib=`📍 Yugvandana Library — Ward No. 15, Sarkari Hospital Ke Samne, Baikunthpur\n📞 83498 52152`;
  let msg='';
  if(type==='due'){
    const who = toGuardian ? `Guardian of *${m.name}*` : `*${m.name}*`;
    // ✅ FIX: Actual remaining due lo, pura plan fee nahi
    const actualDue = getMemberDue(mId);
    const durVal = (() => { const raw=String(m.category||'1'); if(raw.includes('6')) return 6; if(raw.includes('3')) return 3; return 1; })();
    const shKey = m.shift?.includes('Full Day')?'Full Day':m.shift?.includes('Evening')?'Evening':'Morning';
    const baseA = (feeStructure[m.plan]||{})[shKey]||0;
    const sub = baseA * durVal;
    const planTotal = sub - Math.round(sub * getPlanDiscount(durVal));
    const dueAmt = actualDue > 0 ? actualDue : planTotal;
    msg=`🔔 *Yugvandana Library — Fee Reminder*\n\nDear ${who}, 🙏\n\nLibrary fee is pending.\n\n📋 *Details:*\n• Member ID: ${m.id}\n• Shift: ${shiftShort(m.shift)}\n• Plan: ${m.plan}\n• *Amount Due: ₹${dueAmt}*\n• Valid Till: ${fmtDate(m.to)}\n\nPlease clear dues at the earliest.\n\n${lib}`;
  } else if(type==='absent'){
    const who = toGuardian ? `Guardian of *${m.name}*` : `*${m.name}*`;
    msg=`📚 *Yugvandana Library — Absence Alert*\n\nDear ${who}, 👋\n\n*${m.name}* (Seat ${fmtSeat(m.seat)}) was absent from the library today.\n\nConsistent study is the key to success! 💪\n\n${lib}`;
  } else {
    msg=`📢 *Yugvandana Library — Reminder*\n\nDear *${m.name}*,\n\nThis is a reminder from Yugvandana Library. Please contact us for any queries.\n\n${lib}`;
  }
  const phone = toGuardian ? (m.gphone||m.phone) : m.phone;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,'_blank');
  toast(`📲 WhatsApp opened for ${toGuardian?'Guardian of ':''} ${m.name}`,'var(--wa)');
}

function sendWABoth(mId, type){
  const m=members.find(x=>x.id===mId);
  if(!m) return;
  sendWA(mId, type, false);
  if(m.gphone && m.gphone !== m.phone){
    setTimeout(()=>sendWA(mId, type, true), 1000);
    toast(`📲 Sending to Student & Guardian...`,'var(--wa)');
  }
}

function sendBulkReminder(){
  const due=members.filter(m=>m.feeStatus==='Due'||m.feeStatus==='Expired');
  if(!due.length){ toast('No pending dues! 🎉','var(--green)'); return; }

  const lib='📍 Yugvandana Library — Ward No. 15, Sarkari Hospital Ke Samne, Baikunthpur\n📞 83498 52152';

  // Saare WA links ek array mein store karo
  const waLinks = [];
  due.forEach(m=>{
    const _bA=(feeStructure[m.plan]||{})[shiftShort(m.shift)]||0;
    const _bD=parseInt(m.category)||1;
    const _bS=_bA*_bD;
    const amt=parseFloat(m.dueAmount)>0?parseFloat(m.dueAmount):(_bS-Math.round(_bS*getPlanDiscount(_bD)));
    const msg=encodeURIComponent(`🔔 *Yugvandana Library — Fee Reminder*\n\nDear *${m.name}*, 🙏\n\nLibrary fee is pending.\n\n📋 *Details:*\n• Member ID: ${m.id}\n• Shift: ${shiftShort(m.shift)}\n• Plan: ${m.plan}\n• Amount Due: ₹${amt}\n• Valid Till: ${fmtDate(m.to)}\n\nPlease clear dues at the earliest.\n\n${lib}`);
    waLinks.push({ phone: m.phone, msg });
    if(m.gphone && m.gphone!==m.phone){
      const gMsg=encodeURIComponent(`🔔 *Yugvandana Library — Fee Reminder*\n\nDear Guardian of *${m.name}*, 🙏\n\nLibrary fee is pending.\n\n📋 *Details:*\n• Member ID: ${m.id}\n• Shift: ${shiftShort(m.shift)}\n• Plan: ${m.plan}\n• Amount Due: ₹${amt}\n• Valid Till: ${fmtDate(m.to)}\n\nPlease ensure timely payment.\n\n${lib}`);
      waLinks.push({ phone: m.gphone, msg: gMsg });
    }
  });

  // Member list preview rows
  const rows = due.map(m=>{
    const _bA=(feeStructure[m.plan]||{})[shiftShort(m.shift)]||0;
    const _bD=parseInt(m.category)||1;
    const _bS=_bA*_bD;
    const amt=parseFloat(m.dueAmount)>0?parseFloat(m.dueAmount):(_bS-Math.round(_bS*getPlanDiscount(_bD)));
    const statusBadge = m.feeStatus==='Expired'
      ? `<span style="background:var(--redl);color:var(--red);font-size:10px;padding:1px 6px;border-radius:10px;font-weight:800">Expired</span>`
      : `<span style="background:var(--yellowl);color:var(--yellow);font-size:10px;padding:1px 6px;border-radius:10px;font-weight:800">Due</span>`;
    const hasBoth = m.gphone && m.gphone!==m.phone;
    return `<div style="display:flex;align-items:center;gap:8px;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="width:34px;height:34px;border-radius:9px;background:${m.color};display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:14px;flex-shrink:0">${m.name[0]}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:800;font-size:13px">${m.name} ${statusBadge}</div>
        <div style="font-size:11px;color:var(--ink3)">${shiftShort(m.shift)} · ₹${amt} · ${fmtDate(m.to)} ${hasBoth?'· 📲+👨‍👩‍👧':''}</div>
      </div>
    </div>`;
  }).join('');

  // Remove old modal if exists
  const old=document.getElementById('bulkReminderModal');
  if(old) old.remove();

  let _bulkIdx=0;
  function _sendNext(){
    if(_bulkIdx>=waLinks.length){
      toast(`✅ Sabke WhatsApp bhej diye — ${waLinks.length} messages!`,'var(--green)');
      document.getElementById('bulkReminderModal')?.remove();
      return;
    }
    const {phone,msg}=waLinks[_bulkIdx];
    window.open(`https://wa.me/${phone}?text=${msg}`,'_blank');
    _bulkIdx++;
    const total=waLinks.length;
    const btnEl=document.getElementById('_bulkSendBtn');
    if(btnEl){
      if(_bulkIdx<total) btnEl.textContent=`📲 Send Next (${_bulkIdx}/${total})`;
      else btnEl.textContent=`✅ Done!`;
    }
    const progEl=document.getElementById('_bulkProg');
    if(progEl) progEl.style.width=`${Math.round(_bulkIdx/total*100)}%`;
  }

  const overlay=document.createElement('div');
  overlay.id='bulkReminderModal';
  overlay.style.cssText='position:fixed;inset:0;background:#00000090;z-index:400;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .2s';
  overlay.innerHTML=`
    <div style="background:var(--card);border:2px solid var(--wa);border-radius:18px;width:100%;max-width:520px;box-shadow:var(--shadow2);animation:fadeUp .3s ease;overflow:hidden;display:flex;flex-direction:column;max-height:88vh">
      <div style="background:linear-gradient(135deg,#128c7e,#25d366);padding:14px 18px;display:flex;align-items:center;justify-content:space-between">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:1px;color:#fff">📲 Bulk Reminder — ${due.length} Members</div>
        <button onclick="document.getElementById('bulkReminderModal').remove()" style="background:rgba(255,255,255,.2);border:none;color:#fff;width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:16px">✕</button>
      </div>
      <div style="padding:10px 16px;background:var(--greenl);border-bottom:1px solid var(--green)">
        <div style="font-size:12px;color:var(--green);font-weight:700;margin-bottom:8px">📲 ${waLinks.length} WhatsApp messages ready (Students + Guardians)</div>
        <button id="_bulkSendBtn" class="btn btn-wa" style="width:100%;font-size:14px;font-weight:800;padding:10px" onclick="_sendNext()">📲 Send (1/${waLinks.length})</button>
        <div style="margin-top:8px;height:6px;background:var(--bg3);border-radius:3px;overflow:hidden">
          <div id="_bulkProg" style="height:100%;background:var(--wa);border-radius:3px;width:0%;transition:width .3s"></div>
        </div>
      </div>
      <div style="overflow-y:auto;padding:0 16px;flex:1">${rows}</div>
      <div style="padding:12px 16px;border-top:1px solid var(--border);display:flex;justify-content:flex-end">
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('bulkReminderModal').remove()">✕ Close</button>
      </div>
    </div>`;
  overlay.addEventListener('click',e=>{ if(e.target===overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  // Pehla message turant bhejo
  _sendNext();
}

// ═══ NOTICES ══════════════════════════════════════════════════════════════════
function renderNotices(){
  const icons={info:'ℹ️',warn:'⚠️',success:'✅',danger:'🚨'};
  const typeLabel={info:'Info',warn:'Warning',success:'Good News',danger:'Important'};
  document.getElementById('noticesList').innerHTML = notices.length
    ? [...notices].reverse().map(n=>`
      <div class="ncard ${n.type}">
        <div class="ncard-topbar"></div>
        <div class="ncard-body">
          <div class="ntitle">${icons[n.type]||'📢'} ${n.title}</div>
          <div class="nbody">${n.body}</div>
          <div class="ncard-footer">
            <span class="ndate">📅 ${fmtDate(n.date)}</span>
            <div style="display:flex;align-items:center;gap:6px">
              <span class="ntype-badge">${typeLabel[n.type]||n.type}</span>
              ${isAdmin()?`<button class="btn btn-red btn-sm btn-icon" style="padding:3px 7px;font-size:12px;line-height:1" onclick="deleteNotice(${n.id})" title="Delete">✕</button>`:''}
            </div>
          </div>
        </div>
      </div>`).join('')
    : `<div class="empty" style="grid-column:1/-1"><div class="empty-icon">📢</div><h3>No notices posted</h3></div>`;
}

async function addNotice(){
  const title=val('nt-title'), body=val('nt-body');
  if(!title||!body){ toast('\u26a0\ufe0f Please fill all fields','var(--red)'); return; }
  try {
    await AR_API.addNotice({title, type:val('nt-type'), body, date:todayStr()});
    notices = await AR_API.getNotices();
    closeModal('modal-notice');
    document.getElementById('nt-title').value='';
    document.getElementById('nt-body').value='';
    renderNotices();
    toast('\uD83D\uDCE2 Notice posted!','var(--blue)');
  } catch(e){ toast('\u274c '+e.message,'var(--red)'); }
}

function deleteNotice(id){
  requireAdmin(async ()=>{
    const n=notices.find(x=>x.id===id);
    if(!confirm(`Delete notice "${n?.title||'this notice'}"? It will be moved to Recycle Bin for 30 days.`)) return;
    try {
      if(n) addToRecycleBin('notice', n.title||`Notice #${id}`, {...n});
      await AR_API.deleteNotice(id, 'anuj@2006');
      notices = await AR_API.getNotices();
      renderNotices();
      toast('\uD83D\uDDD1\uFE0F Notice moved to Recycle Bin','var(--orange)');
    } catch(e){ toast('\u274c '+e.message,'var(--red)'); }
  });
}

// ═══ EXCEL EXPORT ═════════════════════════════════════════════════════════════
function exportExcel(type){
  if(typeof XLSX==='undefined'){
    toast('⚠️ XLSX library not loaded. Check internet connection.','var(--red)');
    return;
  }

  let wb = XLSX.utils.book_new();

  if(type==='members'){
    const data = members.map(m=>({
      'Member ID': m.id,
      'Name': m.name,
      'WhatsApp': m.phone,
      'Class/Course': m.cls||'',
      'Shift': shiftShort(m.shift),
      'Plan': m.plan,
      'Seat No': fmtSeat(m.seat),
      'Join Date': m.from||'',
      'Valid Till': m.to||'',
      'Fee Status': m.feeStatus,
      'Address': m.addr||''
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    setColWidths(ws,[10,20,15,18,12,12,8,12,12,10,25]);
    XLSX.utils.book_append_sheet(wb, ws, 'Members');
    XLSX.writeFile(wb, `StudyZone_Members_${todayStr()}.xlsx`);
    toast('📊 Members exported to Excel!','var(--green)');

  } else if(type==='fees'){
    const data = feeRecords.map(r=>({
      'Receipt ID': r.id,
      'Member ID': r.memberId,
      'Member Name': r.memberName,
      'Plan': r.plan,
      'Shift': r.shift,
      'Amount (₹)': r.amount,
      'Date': r.date,
      'Month': r.month,
      'Mode': r.mode,
      'Notes': r.notes||'',
      'Status': r.status
    }));
    // Add summary sheet
    const totalRev = feeRecords.reduce((s,r)=>s+(parseFloat(r.paidAmount)||parseFloat(r.amount)||0),0);
    const cashTotal = feeRecords.filter(r=>r.mode==='Cash').reduce((s,r)=>s+(parseFloat(r.paidAmount)||parseFloat(r.amount)||0),0);
    const upiTotal = feeRecords.filter(r=>r.mode==='UPI').reduce((s,r)=>s+(parseFloat(r.paidAmount)||parseFloat(r.amount)||0),0);
    const onlineTotal = feeRecords.filter(r=>r.mode==='Online').reduce((s,r)=>s+(parseFloat(r.paidAmount)||parseFloat(r.amount)||0),0);

    const summary = [
      {'Metric':'Total Records','Value':feeRecords.length},
      {'Metric':'Total Revenue','Value':totalRev},
      {'Metric':'Cash Collections','Value':cashTotal},
      {'Metric':'UPI Collections','Value':upiTotal},
      {'Metric':'Online Collections','Value':onlineTotal},
      {'Metric':'Export Date','Value':todayStr()},
    ];

    const ws1 = XLSX.utils.json_to_sheet(data);
    setColWidths(ws1,[12,12,20,12,10,12,12,16,8,20,8]);
    const ws2 = XLSX.utils.json_to_sheet(summary);
    XLSX.utils.book_append_sheet(wb, ws1, 'Fee Records');
    XLSX.utils.book_append_sheet(wb, ws2, 'Summary');
    XLSX.writeFile(wb, `StudyZone_Fees_${todayStr()}.xlsx`);
    toast('📊 Fee records exported to Excel!','var(--green)');

  } else if(type==='attendance'){
    const data = attendance.map(a=>({
      'Date': a.date,
      'Member ID': a.memberId,
      'Member Name': a.memberName,
      'Shift': a.shift,
      'Seat': a.seat||'',
      'Check-In': a.in||'',
      'Check-Out': a.out||'',
      'Status': a.present?'Present':'Absent'
    }));
    // Attendance summary
    const dates = [...new Set(attendance.map(a=>a.date))].sort().reverse();
    const summary = dates.map(d=>({
      'Date': d,
      'Present': attendance.filter(a=>a.date===d&&a.present).length,
      'Absent': attendance.filter(a=>a.date===d&&!a.present).length,
      'Total Tracked': attendance.filter(a=>a.date===d).length
    }));

    const ws1 = XLSX.utils.json_to_sheet(data);
    const ws2 = XLSX.utils.json_to_sheet(summary);
    setColWidths(ws1,[12,12,20,10,6,10,10,10]);
    XLSX.utils.book_append_sheet(wb, ws1, 'Attendance Log');
    XLSX.utils.book_append_sheet(wb, ws2, 'Daily Summary');
    XLSX.writeFile(wb, `StudyZone_Attendance_${todayStr()}.xlsx`);
    toast('📊 Attendance exported to Excel!','var(--green)');
  } else if(type==='expenses'){
    const data=expenses.map(e=>({'ID':e.id,'Category':catLabels[e.cat]||e.cat,'Description':e.desc,'Amount (₹)':e.amount,'Date':e.date,'Mode':e.mode,'Notes':e.notes||''}));
    const ws=XLSX.utils.json_to_sheet(data);
    setColWidths(ws,[12,18,30,12,12,10,20]);
    XLSX.utils.book_append_sheet(wb,ws,'Expenses');
    XLSX.writeFile(wb,`StudyZone_Expenses_${todayStr()}.xlsx`);
    toast('📊 Expenses exported!','var(--green)');
  } else if(type==='pl'){
    const months=[...new Set([...feeRecords.map(r=>r.date.slice(0,7)),...expenses.map(e=>e.date.slice(0,7)),...salaryRecords.map(s=>s.date.slice(0,7))])].sort().reverse();
    const data=months.map(m=>{
      const rev=feeRecords.filter(r=>normDate(r.date).startsWith(m)).reduce((s,r)=>s+(parseFloat(r.amount)||0),0);
      const exp=expenses.filter(e=>e.date.startsWith(m)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
      const sal=salaryRecords.filter(s=>s.date.startsWith(m)).reduce((s,r)=>s+(parseFloat(r.amount)||0),0);
      const net=rev-exp-sal;
      return {'Month':new Date(m+'-01').toLocaleDateString('en-IN',{month:'long',year:'numeric'}),'Revenue (₹)':rev,'Expenses (₹)':exp,'Salary (₹)':sal,'Net Profit/Loss (₹)':net,'Status':net>=0?'Profit':'Loss'};
    });
    const ws=XLSX.utils.json_to_sheet(data);
    setColWidths(ws,[18,14,14,12,18,10]);
    XLSX.utils.book_append_sheet(wb,ws,'P&L Report');
    XLSX.writeFile(wb,`StudyZone_PL_${todayStr()}.xlsx`);
    toast('📊 P&L Report exported!','var(--green)');
  }
}

function setColWidths(ws, widths){
  ws['!cols'] = widths.map(w=>({wch:w}));
}

// ═══ AADHAR PREVIEW ════════════════════════════════════════════════════════════
function previewAadhar(input){
  const prev=document.getElementById('am-aadharPreview');
  const placeholder=document.getElementById('am-aadharPlaceholder');
  _pendingAadharData = null; // reset on new selection
  if(!prev) return;
  if(input.files&&input.files[0]){
    const file = input.files[0];
    // If PDF, just show filename (can't preview PDF inline easily)
    if(file.type === 'application/pdf'){
      prev.innerHTML=`<div style="padding:6px 10px;background:var(--bluel);border:1px solid var(--blue);border-radius:6px;font-size:11px;font-weight:700;color:var(--blue)">📄 ${file.name}</div>`;
      if(placeholder) placeholder.style.display='none';
      // Read as dataURL and store in global variable
      const r=new FileReader();
      r.onload=e=>{ _pendingAadharData = e.target.result; prev.dataset.b64=e.target.result; };
      r.readAsDataURL(file);
      return;
    }
    const r=new FileReader();
    r.onload=e=>{ 
      _pendingAadharData = e.target.result; // Store in global variable
      prev.dataset.b64 = e.target.result;
      prev.innerHTML=`<img src="${e.target.result}" style="max-width:100%;max-height:100px;border-radius:6px;border:1px solid var(--border);display:block;margin:0 auto"/>`;
      if(placeholder) placeholder.style.display='none';
    };
    r.readAsDataURL(file);
  } else { 
    _pendingAadharData = null;
    prev.innerHTML='';
    if(placeholder) placeholder.style.display='block';
  }
}

// ═══ AADHAR GLOBAL STORE (fix: database mein nahi jaata tha) ════════════════════
let _pendingAadharData = null; // previewAadhar se set hota hai, saveMember mein use hota hai

// ═══ AADHAR VIEW MODAL ══════════════════════════════════════════════════════════
function viewAadhar(mId){
  const m=members.find(x=>x.id===mId);
  if(!m||!m.aadharImg){ toast('⚠️ No Aadhar image uploaded','var(--orange)'); return; }
  const isPdf = m.aadharImg.startsWith('data:application/pdf');
  if(isPdf){
    // PDF: direct download karo
    const a=document.createElement('a');
    a.href=m.aadharImg;
    a.download=`Aadhar_${m.name.replace(/\s+/g,'_')}.pdf`;
    a.click();
  } else {
    // Image: fullscreen popup
    const overlay=document.createElement('div');
    overlay.style.cssText='position:fixed;inset:0;background:#000000ee;z-index:500;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;animation:fadeIn .2s';
    overlay.innerHTML=`
      <img src="${m.aadharImg}" style="max-width:94vw;max-height:78vh;border-radius:10px;border:2px solid var(--purple);object-fit:contain"/>
      <div style="display:flex;gap:10px">
        <a href="${m.aadharImg}" download="Aadhar_${m.name.replace(/\s+/g,'_')}.jpg" class="btn btn-purple btn-sm">⬇️ Download</a>
        <button class="btn btn-ghost btn-sm" onclick="this.closest('div[style]').remove()">✕ Close</button>
      </div>
      ${m.aadhar?`<div style="color:#fff;font-size:13px;font-weight:700">🪪 ${m.aadhar}</div>`:''}`;
    overlay.addEventListener('click',e=>{ if(e.target===overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }
}

// ── Attendance PDF Download (profile se) ─────────────────────────────────────
function downloadAttendancePDF(mId){
  const m=members.find(x=>x.id===mId);
  if(!m){ toast('Member not found','var(--red)'); return; }
  const mAtt=attendance.filter(a=>a.memberId===mId).slice().reverse();
  const pCount=mAtt.filter(a=>a.present).length;
  const aCount=mAtt.length-pCount;
  const pct=mAtt.length?Math.round(pCount/mAtt.length*100):0;

  const rows=mAtt.map((a,i)=>`
    <tr style="background:${i%2===0?'#f8f9ff':'#fff'}">
      <td style="padding:7px 12px;border:1px solid #ddd">${i+1}</td>
      <td style="padding:7px 12px;border:1px solid #ddd">${fmtDate(a.date)}</td>
      <td style="padding:7px 12px;border:1px solid #ddd;color:${a.present?'#15803d':'#dc2626'};font-weight:700">${a.present?'✅ Present':'❌ Absent'}</td>
      <td style="padding:7px 12px;border:1px solid #ddd;color:#15803d">${a.in||'—'}</td>
      <td style="padding:7px 12px;border:1px solid #ddd;color:#ea580c">${a.out||'—'}</td>
    </tr>`).join('');

  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"/>
  <style>
    body{font-family:Arial,sans-serif;margin:0;padding:20px;color:#1a1a2e}
    .header{text-align:center;border-bottom:3px solid #6d28d9;padding-bottom:14px;margin-bottom:18px}
    .header h1{font-size:22px;margin:0;color:#6d28d9}
    .header p{margin:4px 0;font-size:13px;color:#555}
    .info-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:18px}
    .info-box{background:#f3f4ff;border:1px solid #c4b5fd;border-radius:8px;padding:10px 14px}
    .info-label{font-size:10px;color:#7c3aed;font-weight:800;text-transform:uppercase;letter-spacing:.5px}
    .info-val{font-size:14px;font-weight:700;margin-top:3px}
    .stats{display:flex;gap:14px;margin-bottom:18px;flex-wrap:wrap}
    .stat{background:#fff;border:2px solid #e0e7ff;border-radius:10px;padding:12px 18px;text-align:center;flex:1}
    .stat-val{font-size:24px;font-weight:900}
    .stat-label{font-size:11px;color:#666;font-weight:700;text-transform:uppercase}
    table{width:100%;border-collapse:collapse;font-size:13px}
    thead{background:#6d28d9;color:#fff}
    thead th{padding:9px 12px;border:1px solid #5b21b6;font-size:12px;text-align:left}
    .footer{margin-top:20px;text-align:center;font-size:11px;color:#888;border-top:1px solid #ddd;padding-top:12px}
    @media print{body{padding:10px}}
  </style></head><body>
  <div class="header">
    <h1>📚 Yugvandana Library — Ward No. 15, Sarkari Hospital Ke Samne, Baikunthpur</h1>
    <p>Attendance Report</p>
    <p style="font-size:12px;color:#888">Generated: ${new Date().toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata',day:'2-digit',month:'long',year:'numeric'})}</p>
  </div>
  <div class="info-grid">
    <div class="info-box"><div class="info-label">Member Name</div><div class="info-val">${m.name}</div></div>
    <div class="info-box"><div class="info-label">Member ID</div><div class="info-val">${m.id}</div></div>
    <div class="info-box"><div class="info-label">Shift</div><div class="info-val">${shiftShort(m.shift)}</div></div>
    <div class="info-box"><div class="info-label">Plan</div><div class="info-val">${m.plan}</div></div>
    <div class="info-box"><div class="info-label">Valid From</div><div class="info-val">${fmtDate(m.from)}</div></div>
    <div class="info-box"><div class="info-label">Valid Till</div><div class="info-val">${fmtDate(m.to)}</div></div>
  </div>
  <div class="stats">
    <div class="stat"><div class="stat-val" style="color:#15803d">${pCount}</div><div class="stat-label">Present</div></div>
    <div class="stat"><div class="stat-val" style="color:#dc2626">${aCount}</div><div class="stat-label">Absent</div></div>
    <div class="stat"><div class="stat-val" style="color:#2563eb">${mAtt.length}</div><div class="stat-label">Total Days</div></div>
    <div class="stat"><div class="stat-val" style="color:#7c3aed">${pct}%</div><div class="stat-label">Attendance</div></div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Date</th><th>Status</th><th>Check-In</th><th>Check-Out</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">Yugvandana Library · Ward No. 15, Sarkari Hospital Ke Samne, Baikunthpur · 📞 83498 52152 · This is a system-generated report<br/><span style="font-size:10px;color:#aaa">Developed by Rohit CircleX ©</span></div>
  <script>window.onload=()=>{ setTimeout(()=>{ window.print(); },400); }<\/script>
  </body></html>`;

  const w=window.open('','_blank','width=800,height=700');
  if(w){ w.document.write(html); w.document.close(); }
  else { toast('⚠️ Popup blocked — please allow popups','var(--orange)'); }
}

// ═══ MEMBER PHOTO PREVIEW ══════════════════════════════════════════════════════
function previewMemberPhoto(input){
  const pp=document.getElementById('am-photoPreview');
  const ph=document.getElementById('am-photoPlaceholder');
  if(!pp||!ph) return;
  if(input.files&&input.files[0]){
    const r=new FileReader();
    r.onload=e=>{ pp.src=e.target.result; pp.style.display='block'; ph.style.display='none'; };
    r.readAsDataURL(input.files[0]);
  } else { pp.src=''; pp.style.display='none'; ph.style.display='block'; }
}

// ═══ MEMBER PROFILE ═══════════════════════════════════════════════════════════
function openProfile(mId){
  const m=members.find(x=>x.id===mId);
  if(!m) return;
  currentProfileId=mId;
  currentProfileTab='info';
  // Header
  const avatarHtml = m.photo
    ? `<img src="${m.photo}" class="profile-avatar-img"/>`
    : `<div class="profile-avatar-fallback" style="background:${m.color}">${m.name[0]}</div>`;
  const fsBadge={Paid:'b-green',Due:'b-yellow',Expired:'b-red'};
  const totalPaid=feeRecords.filter(r=>r.memberId===mId).reduce((s,r)=>s+(parseFloat(r.paidAmount)||parseFloat(r.amount)||0),0);
  const attCount=attendance.filter(a=>a.memberId===mId&&a.present).length;
  document.getElementById('profileHeader').innerHTML=`
    <div class="profile-avatar-wrap">${avatarHtml}</div>
    <div class="profile-info" style="flex:1">
      <h3>${m.name}</h3>
      <div class="pid">${m.id} &nbsp;·&nbsp; <span class="badge ${fsBadge[m.feeStatus]||'b-gray'}">${m.feeStatus}</span></div>
      <div style="font-size:12px;color:var(--ink3);margin-top:6px">🎓 ${m.cls||'—'} &nbsp;·&nbsp; ⏰ ${shiftShort(m.shift)} &nbsp;·&nbsp; 🪑 Seat ${fmtSeat(m.seat)}</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:12px">
        <div class="profile-stat"><div class="profile-stat-val" style="color:var(--green)">${fmtAmt(totalPaid)}</div><div class="profile-stat-label">Total Paid</div></div>
        <div class="profile-stat"><div class="profile-stat-val" style="color:var(--blue)">${attCount}</div><div class="profile-stat-label">Days Present</div></div>
        <div class="profile-stat"><div class="profile-stat-val" style="color:var(--orange)">${fmtDate(m.to)}</div><div class="profile-stat-label">Valid Till</div></div>
      </div>
    </div>`;
  // Reset tabs
  document.querySelectorAll('.profile-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.profile-tab')[0].classList.add('active');
  document.getElementById('profileEditBtn').onclick=()=>{ closeModal('modal-profile'); editMember(mId); };
  renderProfileContent('info', m);
  openModal('modal-profile');
}

function switchProfileTab(tab, btn){
  document.querySelectorAll('.profile-tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  currentProfileTab=tab;
  const m=members.find(x=>x.id===currentProfileId);
  if(!m) return;

  // Agar docs tab open hua — IDB se fresh images load karo
  if(tab==='docs'){
    renderProfileContent(tab, m); // pehle current data se dikhao
    AR_IDB.getImages(m.id).then(local=>{
      let updated = false;
      if(local.photo     && (!m.photo     || m.photo.length     < 10)){ m.photo     = local.photo;     updated=true; }
      if(local.aadharImg && (!m.aadharImg || m.aadharImg.length < 10)){ m.aadharImg = local.aadharImg; updated=true; }
      if(updated && currentProfileTab==='docs' && currentProfileId===m.id){
        renderProfileContent('docs', m);
      }
    }).catch(()=>{});
    return;
  }

  renderProfileContent(tab, m);
}

function renderProfileContent(tab, m){
  const el=document.getElementById('profileContent');
  if(tab==='info'){
    el.innerHTML=`
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        ${[
          ['📞 Phone',m.phone],['📞 Guardian',m.guardian||'—'],['📱 Guardian Ph.',m.gphone||'—'],
          ['🏠 Address',m.addr||'—'],['💳 Plan',m.plan],['📅 Join Date',fmtDate(m.from)],
          ['🎂 Birthday',m.dob?fmtDate(m.dob):'—'],
          ['🪪 Aadhar',m.aadhar||'—'],['🌐 Shift',shiftShort(m.shift)],
        ].map(([l,v])=>`
          <div style="background:var(--bg3);border:1px solid var(--border);border-radius:9px;padding:10px 14px">
            <div style="font-size:10px;color:var(--ink3);font-weight:800;text-transform:uppercase;letter-spacing:.5px">${l}</div>
            <div style="font-size:13px;font-weight:700;color:var(--ink);margin-top:3px">${v}</div>
          </div>`).join('')}
      </div>`;
  } else if(tab==='fees'){
    const mFees=feeRecords.filter(r=>r.memberId===m.id).slice().reverse();
    el.innerHTML=mFees.length?`<div class="twrap"><table>
      <thead><tr><th>Receipt</th><th>Plan</th><th>Month</th><th>Amount</th><th>Mode</th><th>Date</th></tr></thead>
      <tbody>${mFees.map(r=>`<tr>
        <td style="font-size:11px;color:var(--ink3);font-family:monospace">${r.id}</td>
        <td><span class="badge b-blue" style="font-size:10px">${r.plan}</span></td>
        <td style="font-size:12px">${r.month}</td>
        <td style="font-weight:800;color:var(--green)">${fmtAmt(r.amount)}</td>
        <td><span class="badge b-gray">${r.mode}</span></td>
        <td style="font-size:12px">${fmtDate(r.date)}</td>
      </tr>`).join('')}</tbody>
    </table></div><div style="margin-top:10px;padding:10px;background:var(--greenl);border:1px solid var(--green);border-radius:8px;font-weight:800;font-size:13px;color:var(--green)">
      Total Paid: ${fmtAmt(mFees.reduce((s,r)=>s+(parseFloat(r.paidAmount)||parseFloat(r.amount)||0),0))} &nbsp;·&nbsp; ${mFees.length} Receipts</div>`
    :`<div class="empty"><div class="empty-icon">💸</div><h3>No fee records yet</h3></div>`;
  } else if(tab==='attendance'){
    const mAtt=attendance.filter(a=>a.memberId===m.id).slice().reverse();
    const pCount=mAtt.filter(a=>a.present).length;

    // ── Attendance Streak ──
    const sortedAtt = attendance.filter(a=>a.memberId===m.id&&a.present).map(a=>a.date).sort().reverse();
    let streak=0;
    const today=todayStr();
    let checkDate=today;
    for(let i=0;i<sortedAtt.length;i++){
      if(sortedAtt[i]===checkDate||sortedAtt[i]===prevDay(checkDate)){
        streak++;
        checkDate=sortedAtt[i];
        const d=new Date(checkDate); d.setDate(d.getDate()-1);
        checkDate=d.toISOString().slice(0,10);
      } else break;
    }

    // ── Monthly calendar ──
    const now=new Date(); const yr=now.getFullYear(); const mo=now.getMonth();
    const firstDay=new Date(yr,mo,1).getDay();
    const daysInMonth=new Date(yr,mo+1,0).getDate();
    const monthName=now.toLocaleDateString('en-IN',{month:'long',year:'numeric'});
    const presentSet=new Set(attendance.filter(a=>a.memberId===m.id&&a.present).map(a=>a.date));
    const absentSet=new Set(attendance.filter(a=>a.memberId===m.id&&!a.present).map(a=>a.date));
    let calCells='';
    for(let i=0;i<firstDay;i++) calCells+=`<div></div>`;
    for(let d=1;d<=daysInMonth;d++){
      const ds=`${yr}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const isP=presentSet.has(ds),isA=absentSet.has(ds),isT=ds===today;
      calCells+=`<div style="aspect-ratio:1;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;
        background:${isP?'var(--green)':isA?'var(--red)':isT?'var(--bluel)':'var(--bg3)'};
        color:${isP||isA?'#fff':isT?'var(--blue)':'var(--ink3)'};
        border:${isT?'2px solid var(--blue)':'1px solid var(--border)'};"
        title="${ds}">${d}</div>`;
    }

    el.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;flex:1">
        <div class="profile-stat"><div class="profile-stat-val" style="color:var(--green)">${pCount}</div><div class="profile-stat-label">Present</div></div>
        <div class="profile-stat"><div class="profile-stat-val" style="color:var(--red)">${mAtt.length-pCount}</div><div class="profile-stat-label">Absent</div></div>
        <div class="profile-stat"><div class="profile-stat-val" style="color:var(--blue)">${mAtt.length?Math.round(pCount/mAtt.length*100):0}%</div><div class="profile-stat-label">Attendance %</div></div>
        <div class="profile-stat"><div class="profile-stat-val" style="color:var(--orange)">🔥${streak}</div><div class="profile-stat-label">Day Streak</div></div>
      </div>
      ${mAtt.length?`<button class="btn btn-red btn-sm" style="flex-shrink:0" onclick="downloadAttendancePDF('${m.id}')">📄 PDF</button>`:''}
    </div>
    <!-- Monthly Calendar -->
    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:14px">
      <div style="font-weight:800;font-size:13px;color:var(--ink);margin-bottom:10px;display:flex;align-items:center;justify-content:space-between">
        📅 ${monthName}
        <div style="display:flex;gap:10px;font-size:11px;font-weight:700">
          <span style="color:var(--green)">🟢 Present</span>
          <span style="color:var(--red)">🔴 Absent</span>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-bottom:4px">
        ${['S','M','T','W','T','F','S'].map(d=>`<div style="text-align:center;font-size:10px;font-weight:800;color:var(--ink3);padding-bottom:4px">${d}</div>`).join('')}
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px">${calCells}</div>
    </div>
    ${mAtt.length?`<div class="twrap"><table>
      <thead><tr><th>Date</th><th>Status</th><th>Check-In</th><th>Check-Out</th></tr></thead>
      <tbody>${mAtt.map(a=>`<tr>
        <td>${fmtDate(a.date)}</td>
        <td><span class="badge ${a.present?'b-green':'b-red'}">${a.present?'Present':'Absent'}</span></td>
        <td style="color:var(--green)">${a.in||'—'}</td>
        <td style="color:var(--orange)">${a.out||'—'}</td>
      </tr>`).join('')}</tbody>
    </table></div>`:'<div class="empty"><div class="empty-icon">📅</div><h3>No attendance records</h3></div>'}`;
  } else if(tab==='docs'){
    const hasPhoto = m.photo && m.photo.length > 10;
    const hasAadhar = m.aadharImg && m.aadharImg.length > 10;
    el.innerHTML=`<div style="display:flex;flex-direction:column;gap:14px">
      <!-- Aadhar Number (always show if exists) -->
      ${m.aadhar?`<div style="background:var(--purplel);border:1.5px solid var(--purple);border-radius:10px;padding:12px 16px;display:flex;align-items:center;gap:10px">
        <span style="font-size:22px">🪪</span>
        <div>
          <div style="font-size:10px;color:var(--purple);font-weight:800;text-transform:uppercase">Aadhar Number</div>
          <div style="font-size:16px;font-weight:900;letter-spacing:2px;color:var(--ink)">${m.aadhar}</div>
        </div>
      </div>`:''}
      <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start">
        <!-- Photo -->
        ${hasPhoto
          ? `<div style="text-align:center;cursor:pointer;" onclick="(function(){const w=window.open('','_blank');w.document.write('<html><body style=\\'margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh\\'><img src=\\'${m.photo.replace(/'/g,"&#39;")}\\'style=\\'max-width:95vw;max-height:95vh;border-radius:8px\\'/></body></html>');w.document.close();})()">
              <img src="${m.photo}" style="width:120px;height:120px;border-radius:12px;object-fit:cover;border:2px solid var(--blue);display:block;" onerror="this.parentElement.innerHTML='<div class=\\'profile-stat\\'style=\\'padding:24px;color:var(--ink3)\\'>📷 Photo load error</div>'"/>
              <div style="font-size:11px;color:var(--ink3);margin-top:6px;font-weight:700">Member Photo</div>
              <div style="font-size:10px;color:var(--blue);margin-top:2px">Click to zoom</div>
            </div>`
          : `<div class="profile-stat" style="padding:24px;text-align:center;color:var(--ink3)">📷 No photo uploaded</div>`}
        <!-- Aadhar Image -->
        ${hasAadhar
          ? (()=>{
              const isPdf = m.aadharImg.startsWith('data:application/pdf');
              return `<div style="text-align:center;flex:1;cursor:pointer;" onclick="viewAadhar('${m.id}')">
                ${isPdf
                  ? `<div style="width:100%;max-width:200px;height:100px;background:var(--bluel);border:2px solid var(--purple);border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;margin:0 auto;font-size:32px">📄<div style="font-size:11px;color:var(--purple);font-weight:700;margin-top:4px">PDF Document</div></div>`
                  : `<img src="${m.aadharImg}" style="max-width:100%;max-height:160px;border-radius:8px;border:2px solid var(--purple);display:block;margin:0 auto" onerror="this.parentElement.innerHTML='<div class=\\'profile-stat\\'style=\\'padding:24px;color:var(--red)\\'>⚠️ Aadhar image load error — try re-uploading</div>'">`}
                <div style="font-size:11px;color:var(--ink3);margin-top:6px;font-weight:700">Aadhar Card Image</div>
                <div style="font-size:10px;color:var(--blue);margin-top:2px">👆 Tap to view / download</div>
              </div>`;
            })()
          : `<div class="profile-stat" style="padding:20px;flex:1;text-align:center">
              <div style="font-size:28px;margin-bottom:8px">🪪</div>
              <div style="color:var(--ink3);font-size:13px;font-weight:700">Aadhar image uploaded nahi hai</div>
              ${m.aadhar?`<div style="font-size:11px;color:var(--purple);margin-top:4px">Number saved: ${m.aadhar}</div>`:''}
              <button class="btn btn-purple btn-sm" style="margin-top:10px" onclick="closeModal('modal-profile');editMember('${m.id}')">➕ Upload Aadhar Image</button>
            </div>`}
      </div>
    </div>`;
  }
}

// ═══ EXPENSES ════════════════════════════════════════════════════════════════
const catLabels={rent:'🏠 Rent',utility:'💡 Utility',maintenance:'🔧 Maintenance',stationery:'📝 Stationery',furniture:'🪑 Furniture',marketing:'📣 Marketing',other:'📦 Other'};

function setExpTab(tab, btn){
  currentExpTab=tab;
  document.querySelectorAll('.exp-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderExpenses();
}

function renderExpenses(){
  const q=(document.getElementById('expsearch')||{}).value?.toLowerCase()||'';
  const mf=(document.getElementById('expmonth')||{}).value||'';
  // Build month filter options
  const months=[...new Set(expenses.map(e=>e.date.slice(0,7)))].sort().reverse();
  const msel=document.getElementById('expmonth');
  if(msel){ const cur=msel.value; msel.innerHTML='<option value="">All Months</option>'+months.map(m=>`<option value="${m}">${new Date(m+'-01').toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</option>`).join(''); if(cur) msel.value=cur; }
  let list=expenses.filter(e=>{
    if(currentExpTab!=='all'&&e.cat!==currentExpTab) return false;
    if(q&&!e.desc.toLowerCase().includes(q)) return false;
    if(mf&&!e.date.startsWith(mf)) return false;
    return true;
  }).slice().reverse();
  // Stats
  const total=expenses.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const thisMonth=todayStr().slice(0,7);
  const monthTotal=expenses.filter(e=>e.date.startsWith(thisMonth)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  document.getElementById('expenseStats').innerHTML=[
    {label:'Total Expenses',val:fmtAmt(total),c:'var(--red)'},
    {label:'This Month',val:fmtAmt(monthTotal),c:'var(--orange)'},
    {label:'Records',val:expenses.length,c:'var(--blue)'},
    {label:'Avg/Month',val:fmtAmt(Math.round(total/Math.max(1,[...new Set(expenses.map(e=>e.date.slice(0,7)))].length))),c:'var(--purple)'},
  ].map(s=>`<div class="scard"><div class="scard-accent" style="background:${s.c}"></div><div class="scard-val" style="color:${s.c}">${s.val}</div><div class="scard-label">${s.label}</div></div>`).join('');
  document.getElementById('expenseTable').innerHTML=list.length?list.map((e,i)=>`<tr>
    <td data-label="#" style="font-size:11px;color:var(--ink3);font-family:monospace">${e.id}</td>
    <td data-label="Category"><span class="badge b-purple">${catLabels[e.cat]||e.cat}</span></td>
    <td data-label="Description" style="font-weight:600">${e.desc}${e.notes?`<br><span style="font-size:10px;color:var(--ink3)">${e.notes}</span>`:''}</td>
    <td data-label="Amount" style="font-weight:800;color:var(--red)">${fmtAmt(e.amount)}</td>
    <td data-label="Date">${fmtDate(e.date)}</td>
    <td data-label="Mode"><span class="badge b-gray">${e.mode}</span></td>
    <td data-label="Action">${isAdmin()?`<button class="btn btn-red btn-sm btn-icon" onclick="deleteExpense('${e.id}')">🗑️</button>`:'<span style="font-size:11px;color:var(--ink3)">—</span>'}</td>
  </tr>`).join(''):`<tr><td colspan="7"><div class="empty"><div class="empty-icon">💸</div><h3>No expenses found</h3></div></td></tr>`;
}

async function saveExpense(){
  const desc=val('exp-desc'), amt=parseFloat(val('exp-amt'));
  if(!desc||!amt||isNaN(amt)||amt<=0){ toast('\u26a0\ufe0f Fill all fields','var(--red)'); return; }
  try {
    await AR_API.addExpense({cat:val('exp-cat'),desc,amount:amt,date:val('exp-date')||todayStr(),mode:val('exp-mode'),notes:val('exp-notes')});
    expenses = await AR_API.getExpenses();
    closeModal('modal-addExpense');
    ['exp-desc','exp-amt','exp-notes'].forEach(x=>document.getElementById(x).value='');
    renderExpenses();
    renderSalaryExpenses();
    renderDashboard();
    toast('\u2705 Expense saved!','var(--red)');
  } catch(e){ toast('\u274c '+e.message,'var(--red)'); }
}

async function deleteExpense(id){
  if(!confirm('Delete this expense? It will be moved to Recycle Bin for 30 days.')) return;
  try {
    const exp=expenses.find(x=>x.id===id);
    if(exp) addToRecycleBin('expense', `${exp.desc} — ₹${exp.amount}`, {...exp});
    await AR_API.deleteExpense(id, appSettings.adminPwd||'anuj@2006');
    expenses = await AR_API.getExpenses();
    renderExpenses();
    renderSalaryExpenses();
    renderDashboard();
    toast('🗑️ Expense moved to Recycle Bin','var(--orange)');
  } catch(e){
    // Server nahi mila — locally remove karo
    expenses = expenses.filter(x=>x.id!==id);
    renderExpenses();
    renderSalaryExpenses();
    renderDashboard();
    toast('🗑️ Expense deleted','var(--orange)');
  }
}

// ═══ SALARY ════════════════════════════════════════════════════════════════
function renderSalary(){
  // Stats
  const totalSalPaid=salaryRecords.reduce((s,r)=>s+(parseFloat(r.amount)||0),0);
  const thisMonth=todayStr().slice(0,7);
  const monthSal=salaryRecords.filter(r=>normDate(r.date).startsWith(thisMonth)).reduce((s,r)=>s+(parseFloat(r.amount)||0),0);
  document.getElementById('salaryStats').innerHTML=[
    {label:'Total Employees',val:employees.length,c:'var(--blue)'},
    {label:'Monthly Salary Budget',val:fmtAmt(employees.reduce((s,e)=>s+e.salary,0)),c:'var(--orange)'},
    {label:'Total Salary Paid',val:fmtAmt(totalSalPaid),c:'var(--green)'},
  ].map(s=>`<div class="scard"><div class="scard-accent" style="background:${s.c}"></div><div class="scard-val" style="color:${s.c}">${s.val}</div><div class="scard-label">${s.label}</div></div>`).join('');
  // Employee list
  document.getElementById('employeeList').innerHTML=employees.length?employees.map(e=>`
    <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)">
      <div style="width:42px;height:42px;border-radius:10px;background:var(--bluel);border:2px solid var(--blue);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">👷</div>
      <div style="flex:1">
        <div style="font-weight:800;font-size:14px">${e.name}</div>
        <div style="font-size:11px;color:var(--ink3)">${e.role} · 📞 ${e.phone||'—'}</div>
        <div style="font-size:11px;color:var(--green);font-weight:700;margin-top:2px">₹${e.salary.toLocaleString('en-IN')}/month</div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-green btn-sm" onclick="openPaySalary('${e.id}')">💰 Pay</button>
        ${isAdmin()?`<button class="btn btn-red btn-sm btn-icon" onclick="deleteEmployee('${e.id}')">🗑️</button>`:''}
      </div>
    </div>`).join(''):`<div class="empty"><div class="empty-icon">👷</div><h3>No employees added</h3></div>`;
  renderSalaryRecords();
  renderSalaryExpenses();
}

function renderSalaryExpenses(){
  const mf = (document.getElementById('salExpMonth')||{}).value||'';
  // Build month filter
  const months = [...new Set(expenses.map(e=>e.date?e.date.slice(0,7):'')).values()].filter(Boolean).sort().reverse();
  const sel = document.getElementById('salExpMonth');
  if(sel){ const cur=sel.value; sel.innerHTML='<option value="">All Months</option>'+months.map(m=>`<option value="${m}">${new Date(m+'-01').toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</option>`).join(''); if(cur) sel.value=cur; }

  const list = expenses.filter(e=>!mf||e.date.startsWith(mf));
  const total = list.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const catMap = {};
  list.forEach(e=>{ catMap[e.cat]=(catMap[e.cat]||0)+(parseFloat(e.amount)||0); });
  const topCat = Object.entries(catMap).sort((a,b)=>b[1]-a[1]).slice(0,3);

  const statsEl = document.getElementById('salExpStats');
  if(statsEl) statsEl.innerHTML = [
    {label:'Total Expenses',val:'₹'+total.toLocaleString('en-IN'),c:'var(--red)'},
    {label:'This Month',val:'₹'+expenses.filter(e=>e.date&&e.date.startsWith(todayStr().slice(0,7))).reduce((s,e)=>s+(parseFloat(e.amount)||0),0).toLocaleString('en-IN'),c:'var(--orange)'},
    {label:'# Records',val:list.length,c:'var(--blue)'},
  ].map(s=>`<div class="scard"><div class="scard-accent" style="background:${s.c}"></div><div class="scard-val" style="color:${s.c}">${s.val}</div><div class="scard-label">${s.label}</div></div>`).join('');

  const catIcon={rent:'🏠',electricity:'⚡',internet:'🌐',stationery:'📝',cleaning:'🧹',maintenance:'🔧',furniture:'🪑',other:'📦'};
  const tbody = document.getElementById('salExpTable');
  if(tbody) tbody.innerHTML = list.length ? list.slice().reverse().map(e=>`<tr>
    <td data-label="Category"><span style="font-size:13px">${catIcon[e.cat]||'📦'}</span> <span style="font-weight:700;text-transform:capitalize">${e.cat}</span></td>
    <td data-label="Description" style="font-size:12px;color:var(--ink3);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.desc||'—'}</td>
    <td data-label="Amount" style="font-weight:800;color:var(--red)">₹${parseFloat(e.amount||0).toLocaleString('en-IN')}</td>
    <td data-label="Date" style="font-size:12px">${fmtDate(e.date)}</td>
    <td data-label="Mode"><span class="badge b-gray">${e.mode||'Cash'}</span></td>
    <td data-label="Action" class="admin-only-col">${isAdmin()?`<button class="btn btn-red btn-sm btn-icon" onclick="deleteExpense('${e.id}')">🗑️</button>`:'—'}</td>
  </tr>`).join('') : '<tr><td colspan="6"><div class="empty"><div class="empty-icon">💸</div><h3>No expenses</h3></div></td></tr>';
}

function renderSalaryRecords(){
  const mf=(document.getElementById('salmonth')||{}).value||'';
  // Build month options
  const months=[...new Set(salaryRecords.map(r=>r.date.slice(0,7)))].sort().reverse();
  const sel=document.getElementById('salmonth');
  if(sel){ const cur=sel.value; sel.innerHTML='<option value="">All Months</option>'+months.map(m=>`<option value="${m}">${new Date(m+'-01').toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</option>`).join(''); if(cur) sel.value=cur; }
  let list=salaryRecords.filter(r=>!mf||normDate(r.date).startsWith(mf)).slice().reverse();
  document.getElementById('salaryTable').innerHTML=list.length?list.map(r=>`<tr>
    <td style="font-weight:700">${r.empName}</td>
    <td style="font-size:12px">${r.month}</td>
    <td style="font-weight:800;color:var(--orange)">${fmtAmt(r.amount)}</td>
    <td style="font-size:12px">${fmtDate(r.date)}</td>
    <td><span class="badge b-gray">${r.mode}</span></td>
  </tr>`).join(''):`<tr><td colspan="5"><div class="empty"><div class="empty-icon">💰</div><h3>No salary records</h3></div></td></tr>`;
}

async function saveEmployee(){
  const name=val('emp-name'), role=val('emp-role'), sal=parseFloat(val('emp-salary'));
  if(!name||!sal||isNaN(sal)){ toast('\u26a0\ufe0f Name and salary required','var(--red)'); return; }
  const loginId = val('emp-loginId');
  const loginPwd = document.getElementById('emp-loginPwd').value || 'arl@123';
  try {
    await AR_API.addEmployee({name,role,phone:val('emp-phone'),salary:sal,joinDate:val('emp-join')||todayStr(),addr:val('emp-addr')});
    employees = await AR_API.getEmployees();
    // Save login credentials to server (works on all browsers/phones)
    if(loginId){
      const newEmp = employees.find(e=>e.name===name);
      if(newEmp){
        let creds = [];
        try { creds = await getEmpCredsFromServer(); } catch(_){ creds = getEmpCreds(); }
        // Remove old if exists
        creds = creds.filter(c=>c.loginId!==loginId);
        creds.push({empId:newEmp.id, name:newEmp.name, loginId, password:loginPwd});
        await saveEmpCredsToServer(creds);
        toast('✅ Employee login created: ' + loginId,'var(--green)');
      }
    }
    closeModal('modal-addEmployee');
    ['emp-name','emp-role','emp-phone','emp-salary','emp-addr','emp-loginId'].forEach(x=>document.getElementById(x).value='');
    renderSalary();
    toast('\u2705 Employee added!','var(--blue)');
  } catch(e){ toast('\u274c '+e.message,'var(--red)'); }
}

function deleteEmployee(id){
  requireAdmin(async ()=>{
    if(!confirm('Delete this employee? They will be moved to Recycle Bin for 30 days.')) return;
    try {
      const emp=employees.find(x=>x.id===id);
      if(emp) addToRecycleBin('employee', `${emp.name} (${emp.role})`, {...emp});
      await AR_API.deleteEmployee(id, 'anuj@2006');
      employees = await AR_API.getEmployees();
      renderSalary();
      toast('\uD83D\uDDD1\uFE0F Employee moved to Recycle Bin','var(--orange)');
    } catch(e){ toast('\u274c '+e.message,'var(--red)'); }
  });
}

function openPaySalary(empId){
  const e=employees.find(x=>x.id===empId);
  if(!e) return;
  const sel=document.getElementById('ps-emp');
  if(sel){
    sel.innerHTML='<option value="">— Select Employee —</option>'+employees.map(emp=>`<option value="${emp.id}" ${emp.id===empId?'selected':''}>${emp.name} (${emp.role})</option>`).join('');
  }
  document.getElementById('ps-date').value=todayStr();
  document.getElementById('ps-month').value=new Date().toLocaleDateString('en-IN',{month:'long',year:'numeric'});
  document.getElementById('ps-amt').value='';
  document.getElementById('ps-split1').value='';
  document.getElementById('ps-split2').value='';
  document.getElementById('ps-notes').value='';
  const splitPrev=document.getElementById('ps-split-preview'); if(splitPrev) splitPrev.innerHTML='';
  setSalaryType('full');
  // Trigger employee select UI update
  onEmpSelectSalary(sel);
  openModal('modal-paySalary');
}

async function paySalary(){
  const empId=val('ps-emp');
  const emp=employees.find(x=>x.id===empId);
  if(!emp){ toast('⚠️ Employee select karo','var(--red)'); return; }
  const month=val('ps-month'), date=val('ps-date')||todayStr(), mode=val('ps-mode'), notes=document.getElementById('ps-notes').value.trim();
  try {
    if(_currentSalaryType==='split'){
      const s1=parseFloat(document.getElementById('ps-split1').value)||0;
      const s2=parseFloat(document.getElementById('ps-split2').value)||0;
      if(!s1&&!s2){ toast('⚠️ Koi amount nahi dala','var(--red)'); return; }
      if(s1>0) await AR_API.paySalary({empId,empName:emp.name,month,amount:s1,date,mode,notes:notes?`[Split 1/2] ${notes}`:'[Split 1/2]',type:'split'});
      if(s2>0) await AR_API.paySalary({empId,empName:emp.name,month,amount:s2,date,mode,notes:notes?`[Split 2/2] ${notes}`:'[Split 2/2]',type:'split'});
      salaryRecords = await AR_API.getSalaryRecords();
      closeModal('modal-paySalary');
      renderSalary();
      toast(`✅ Split payment done — ₹${(s1+s2).toLocaleString('en-IN')} to ${emp.name}!`,'var(--green)');
    } else {
      const amt=parseFloat(val('ps-amt'));
      if(!amt||isNaN(amt)){ toast('⚠️ Amount daalein','var(--red)'); return; }
      const type=_currentSalaryType==='advance'?'advance':'salary';
      const notePrefix=_currentSalaryType==='advance'?'[Advance] ':'';
      const finalNotes=notes?(notePrefix+notes):(notePrefix.trim()||undefined);
      await AR_API.paySalary({empId,empName:emp.name,month,amount:amt,date,mode,notes:finalNotes,type});
      salaryRecords = await AR_API.getSalaryRecords();
      closeModal('modal-paySalary');
      renderSalary();
      const label=_currentSalaryType==='advance'?'advance':'salary';
      toast(`✅ ₹${amt.toLocaleString('en-IN')} ${label} paid to ${emp.name}!`,'var(--green)');
    }
  } catch(e){ toast('❌ '+e.message,'var(--red)'); }
}

// ═══ PROFIT & LOSS ════════════════════════════════════════════════════════════
function renderPL(){
  if(!Array.isArray(feeRecords)) feeRecords=[];
  if(!Array.isArray(expenses)) expenses=[];
  if(!Array.isArray(salaryRecords)) salaryRecords=[];
  // Build month options
  const allMonths=[...new Set([
    ...feeRecords.map(r=>r.date.slice(0,7)),
    ...expenses.map(e=>e.date.slice(0,7)),
    ...salaryRecords.map(s=>s.date.slice(0,7))
  ])].sort().reverse();
  const sel=document.getElementById('plmonth');
  if(sel){ const cur=sel.value; sel.innerHTML='<option value="">All Time</option>'+allMonths.map(m=>`<option value="${m}">${new Date(m+'-01').toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</option>`).join(''); if(cur) sel.value=cur; }
  const mf=sel?.value||'';

  const filtFee = mf ? feeRecords.filter(r=>normDate(r.date).startsWith(mf)) : feeRecords;
  const filtExp = mf ? expenses.filter(e=>e.date.startsWith(mf)) : expenses;
  const filtSal = mf ? salaryRecords.filter(s=>s.date.startsWith(mf)) : salaryRecords;

  const totalRev=filtFee.reduce((s,r)=>s+(parseFloat(r.paidAmount)||parseFloat(r.amount)||0),0);
  const totalExp=filtExp.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const totalSal=filtSal.reduce((s,r)=>s+(parseFloat(r.amount)||0),0);
  const net=totalRev-totalExp-totalSal;

  // Cards
  document.getElementById('plCards').innerHTML=[
    {label:'Total Revenue',val:fmtAmt(totalRev),c:'var(--green)',cls:'pl-positive',icon:'📥'},
    {label:'Total Expenses',val:fmtAmt(totalExp+totalSal),c:'var(--red)',cls:'pl-negative',icon:'📤'},
    {label:net>=0?'Net Profit':'Net Loss',val:fmtAmt(Math.abs(net)),c:net>=0?'var(--green)':'var(--red)',cls:net>=0?'pl-positive':'pl-negative',icon:net>=0?'📈':'📉'},
  ].map(s=>`<div class="pl-card ${s.cls}">
    <div style="font-size:24px">${s.icon}</div>
    <div style="font-size:28px;font-weight:900;color:${s.c};font-family:'Bebas Neue',sans-serif">${s.val}</div>
    <div style="font-size:12px;color:var(--ink3);font-weight:800;text-transform:uppercase;letter-spacing:.5px">${s.label}</div>
  </div>`).join('');

  // Income breakdown
  const incomeByMonth={}; feeRecords.forEach(r=>{const k=r.date.slice(0,7);incomeByMonth[k]=(incomeByMonth[k]||0)+(parseFloat(r.paidAmount)||parseFloat(r.amount)||0);});
  document.getElementById('plIncome').innerHTML=`
    ${filtFee.length?[
      {label:'Fee Collections',val:totalRev,c:'var(--green)'},
      {label:'Cash',val:filtFee.filter(r=>r.mode==='Cash').reduce((s,r)=>s+(parseFloat(r.paidAmount)||parseFloat(r.amount)||0),0),c:'var(--yellow)'},
      {label:'UPI',val:filtFee.filter(r=>r.mode==='UPI').reduce((s,r)=>s+(parseFloat(r.paidAmount)||parseFloat(r.amount)||0),0),c:'var(--blue)'},
      {label:'Online',val:filtFee.filter(r=>r.mode==='Online').reduce((s,r)=>s+(parseFloat(r.paidAmount)||parseFloat(r.amount)||0),0),c:'var(--teal)'},
    ].map(s=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:13px;color:var(--ink2)">${s.label}</span>
      <span style="font-weight:900;font-size:14px;color:${s.c}">${fmtAmt(s.val)}</span>
    </div>`).join(''):'<div class="empty"><div class="empty-icon">📥</div><h3>No income data</h3></div>'}`;

  // Expense breakdown
  const cats=[...new Set(filtExp.map(e=>e.cat))];
  document.getElementById('plExpense').innerHTML=`
    ${[
      {label:'Total Salary',val:totalSal,c:'var(--orange)'},
      ...cats.map(cat=>({label:catLabels[cat]||cat,val:filtExp.filter(e=>e.cat===cat).reduce((s,e)=>s+(parseFloat(e.amount)||0),0),c:'var(--red)'}))
    ].filter(s=>s.val>0).map(s=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:13px;color:var(--ink2)">${s.label}</span>
      <span style="font-weight:900;font-size:14px;color:${s.c}">${fmtAmt(s.val)}</span>
    </div>`).join('')||'<div class="empty"><div class="empty-icon">📤</div><h3>No expense data</h3></div>'}`;

  // Monthly summary table
  const tableMonths=[...new Set([
    ...feeRecords.map(r=>r.date.slice(0,7)),
    ...expenses.map(e=>e.date.slice(0,7)),
    ...salaryRecords.map(s=>s.date.slice(0,7))
  ])].sort().reverse();
  document.getElementById('plTable').innerHTML=tableMonths.length?tableMonths.map(m=>{
    const rev=feeRecords.filter(r=>r.date.startsWith(m)).reduce((s,r)=>s+(parseFloat(r.paidAmount)||parseFloat(r.amount)||0),0);
    const exp=expenses.filter(e=>e.date.startsWith(m)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
    const sal=salaryRecords.filter(s=>s.date.startsWith(m)).reduce((s,r)=>s+(parseFloat(r.amount)||0),0);
    const net=rev-exp-sal;
    return `<tr>
      <td style="font-weight:700">${new Date(m+'-01').toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</td>
      <td style="color:var(--green);font-weight:800">${fmtAmt(rev)}</td>
      <td style="color:var(--red);font-weight:800">${fmtAmt(exp)}</td>
      <td style="color:var(--orange);font-weight:800">${fmtAmt(sal)}</td>
      <td style="font-weight:900;color:${net>=0?'var(--green)':'var(--red)'}">${net>=0?'+':''}${fmtAmt(net)}</td>
      <td><span class="badge ${net>=0?'b-green':'b-red'}">${net>=0?'Profit':'Loss'}</span></td>
    </tr>`;}).join(''):`<tr><td colspan="6"><div class="empty"><div class="empty-icon">📊</div><h3>No data available</h3></div></td></tr>`;

  // ── P&L Chart ──
  setTimeout(()=>{
    const canvas=document.getElementById('plChart');
    if(!canvas) return;
    const ctx=canvas.getContext('2d');
    const months6=[]; const revData=[]; const expData=[]; const salData=[];
    for(let i=5;i>=0;i--){
      const d=new Date(); d.setMonth(d.getMonth()-i);
      const ym=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      months6.push(d.toLocaleDateString('en-IN',{month:'short'}));
      revData.push(feeRecords.filter(r=>r.date&&r.date.startsWith(ym)).reduce((s,r)=>s+(parseFloat(r.paidAmount)||parseFloat(r.amount)||0),0));
      expData.push(expenses.filter(e=>e.date&&e.date.startsWith(ym)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0));
      salData.push(salaryRecords.filter(s=>s.date&&s.date.startsWith(ym)).reduce((s,r)=>s+(parseFloat(r.amount)||0),0));
    }
    const parent=canvas.parentElement;
    const W=canvas.width=parent?parent.clientWidth-32:360;
    const H=canvas.height=170;
    ctx.clearRect(0,0,W,H);
    const isDark=!document.body.classList.contains('light');
    const maxVal=Math.max(...revData,...expData,...salData,1);
    const pad={l:36,r:10,t:16,b:28};
    const chartW=W-pad.l-pad.r; const chartH=H-pad.t-pad.b;
    const grpW=chartW/6;
    const bW=Math.max(6,Math.floor(grpW*0.22));
    const colors=['#22c55e','#ef4444','#f97316'];
    const datasets=[revData,expData,salData];
    ctx.strokeStyle=isDark?'#2a305033':'#c8cde833'; ctx.lineWidth=1;
    [0.5,1].forEach(pct=>{
      const y=pad.t+chartH*(1-pct);
      ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(W-pad.r,y); ctx.stroke();
      ctx.fillStyle=isDark?'#5a628066':'#7a84a866';
      ctx.font=`700 8px 'Nunito',sans-serif`; ctx.textAlign='right';
      const v=Math.round(maxVal*pct);
      ctx.fillText(v>=1000?`₹${Math.round(v/1000)}k`:`₹${v}`,pad.l-2,y+3);
    });
    months6.forEach((lbl,i)=>{
      const gx=pad.l+i*grpW+grpW/2;
      datasets.forEach((ds,di)=>{
        const val=ds[i];
        const bH=val?Math.max(3,Math.floor(val/maxVal*chartH)):2;
        const y=pad.t+chartH-bH;
        const offset=(di-1)*(bW+3);
        ctx.fillStyle=colors[di]; ctx.globalAlpha=0.9;
        ctx.beginPath();
        if(ctx.roundRect) ctx.roundRect(gx+offset-bW/2,y,bW,bH,3);
        else ctx.rect(gx+offset-bW/2,y,bW,bH);
        ctx.fill(); ctx.globalAlpha=1;
      });
      ctx.fillStyle=isDark?'#5a6280':'#7a84a8';
      ctx.font=`700 9px 'Nunito',sans-serif`; ctx.textAlign='center';
      ctx.fillText(lbl,gx,H-6);
    });
    setTimeout(()=>{ renderIncomeVsTarget(); renderRetention(); },80);
  },100);
}

function populateAndOpenPaySalary(){
  const sel=document.getElementById('ps-emp');
  if(sel) sel.innerHTML='<option value="">— Select Employee —</option>'+employees.map(e=>`<option value="${e.id}">${e.name} (${e.role})</option>`).join('');
  document.getElementById('ps-date').value=todayStr();
  document.getElementById('ps-month').value=new Date().toLocaleDateString('en-IN',{month:'long',year:'numeric'});
  // Reset all fields
  document.getElementById('ps-amt').value='';
  document.getElementById('ps-split1').value='';
  document.getElementById('ps-split2').value='';
  document.getElementById('ps-notes').value='';
  const infoBox=document.getElementById('ps-salaryInfo'); if(infoBox) infoBox.style.display='none';
  const preview=document.getElementById('ps-preview'); if(preview) preview.style.display='none';
  const quickBtns=document.getElementById('ps-quickBtns'); if(quickBtns) quickBtns.style.display='none';
  const splitPrev=document.getElementById('ps-split-preview'); if(splitPrev) splitPrev.innerHTML='';
  setSalaryType('full');
  openModal('modal-paySalary');
}

// ═══ AUTH SYSTEM ════════════════════════════════════════════════════════════
const ADMIN_PASSWORD = 'anuj@2006';
const EMP_CREDS_KEY = 'stdlib_emp_creds_v1';
let currentSession = null; // {role:'admin'|'employee', name, empId, loginId}

// ══ HARDCODED BUILT-IN EMPLOYEE (always works on any browser/device) ══
const BUILTIN_EMPLOYEES = [
  { empId: '2026001', name: 'Employee', loginId: '2026001', password: 'ar@123' }
];

// ══ EMPLOYEE CREDENTIALS — server-first, localStorage as local cache ══
// Server endpoint (api.js pe /api/emp-creds GET/POST) se creds load/save honge
// Agar server offline ho to localStorage fallback use hoga

async function getEmpCredsFromServer(){
  try {
    // Use AR_API which knows the correct BASE URL (localhost vs production)
    const data = await AR_API.getEmpCreds();
    // Cache locally for offline fallback
    try{ localStorage.setItem(EMP_CREDS_KEY, JSON.stringify(data)); }catch(_){}
    return data;
  } catch(_) {
    // Fallback: localStorage cache
    try{ return JSON.parse(localStorage.getItem(EMP_CREDS_KEY)||'[]'); }catch(__){ return []; }
  }
}
async function saveEmpCredsToServer(creds){
  try {
    await AR_API.saveEmpCreds(creds);
    // Also update local cache
    try{ localStorage.setItem(EMP_CREDS_KEY, JSON.stringify(creds)); }catch(_){}
  } catch(_) {
    // Server offline — at least save locally
    try{ localStorage.setItem(EMP_CREDS_KEY, JSON.stringify(creds)); }catch(__){}
  }
}
function getEmpCreds(){
  // Sync version — from localStorage cache only (for non-async contexts)
  try{ return JSON.parse(localStorage.getItem(EMP_CREDS_KEY)||'[]'); }catch(_){ return []; }
}
function saveEmpCreds(creds){
  // Save to server (async) + local cache
  saveEmpCredsToServer(creds);
}

function selectRole(role){
  document.getElementById('roleSelect').style.display='none';
  if(role==='admin'){
    document.getElementById('adminLoginForm').style.display='block';
    setTimeout(()=>document.getElementById('adminPwdLogin').focus(),100);
  } else {
    document.getElementById('empLoginForm').style.display='block';
    setTimeout(()=>document.getElementById('empLoginId').focus(),100);
  }
}
function backToRoleSelect(){
  document.getElementById('roleSelect').style.display='block';
  document.getElementById('adminLoginForm').style.display='none';
  document.getElementById('empLoginForm').style.display='none';
  document.getElementById('adminLoginErr').style.display='none';
  document.getElementById('empLoginErr').style.display='none';
  document.getElementById('adminPwdLogin').value='';
  document.getElementById('empLoginId').value='';
  document.getElementById('empLoginPwd').value='';
}
function doAdminLogin(){
  const pwd = document.getElementById('adminPwdLogin').value;
  if(pwd === ADMIN_PASSWORD){
    currentSession = {role:'admin', name:'Admin', empId:null, loginId:'admin'};
    sessionStorage.setItem('stdlib_session', JSON.stringify(currentSession));
    onLoginSuccess();
  } else {
    document.getElementById('adminLoginErr').style.display='block';
    document.getElementById('adminPwdLogin').value='';
    document.getElementById('adminPwdLogin').focus();
  }
}
async function doEmpLogin(){
  const loginId = document.getElementById('empLoginId').value.trim();
  const pwd = document.getElementById('empLoginPwd').value;
  const errEl = document.getElementById('empLoginErr');
  errEl.style.display='none';
  const btn = document.querySelector('#empLoginForm .btn-blue');
  if(btn){ btn.disabled=true; btn.textContent='\u23f3 Checking...'; }

  // 1. Hardcoded built-in employees — always work on any browser/device
  const builtin = BUILTIN_EMPLOYEES.find(c=>c.loginId===loginId && c.password===pwd);
  if(builtin){
    currentSession = {role:'employee', name:builtin.name, empId:builtin.empId, loginId:builtin.loginId};
    sessionStorage.setItem('stdlib_session', JSON.stringify(currentSession));
    if(btn){ btn.disabled=false; btn.textContent='\u2705 Login'; }
    onLoginSuccess();
    return;
  }

  // 2. Server-stored credentials — same across all browsers and phones
  let serverCreds = [];
  try { serverCreds = await getEmpCredsFromServer(); } catch(_){}
  const found = serverCreds.find(c=>c.loginId===loginId && c.password===pwd);
  if(btn){ btn.disabled=false; btn.textContent='\u2705 Login'; }
  if(found){
    currentSession = {role:'employee', name:found.name, empId:found.empId, loginId:found.loginId};
    sessionStorage.setItem('stdlib_session', JSON.stringify(currentSession));
    onLoginSuccess();
  } else {
    errEl.style.display='block';
    document.getElementById('empLoginPwd').value='';
    document.getElementById('empLoginPwd').focus();
  }
}
function onLoginSuccess(){
  document.getElementById('loginScreen').style.display='none';
  // Show user badge
  const badge = document.getElementById('userBadge');
  const avatar = document.getElementById('userBadgeAvatar');
  const name = document.getElementById('userBadgeName');
  if(badge && currentSession){
    badge.style.display='inline-flex';
    document.getElementById('logoutBtn').style.display='inline-flex';
    const isAdmin = currentSession.role==='admin';
    avatar.style.background = isAdmin ? 'var(--red)' : 'var(--blue)';
    avatar.textContent = isAdmin ? '🔐' : '👤';
    name.textContent = (isAdmin ? 'Admin' : currentSession.name) + (isAdmin ? '' : ' (Employee)');
  }
  // Apply role-based UI
  applyRoleUI();
  init();
}
function doLogout(){
  if(!confirm('Logout karna chahte hain?')) return;
  currentSession = null;
  sessionStorage.removeItem('stdlib_session');
  location.reload();
}
function isAdmin(){
  return currentSession && currentSession.role === 'admin';
}
function applyRoleUI(){
  const admin = isAdmin();
  // Hide admin-only sidebar buttons for employees
  document.querySelectorAll('.admin-only-sidebar').forEach(btn=>{
    btn.style.display = admin ? '' : 'none';
  });
  // Hide admin-only action buttons (add/collect/pay)
  document.querySelectorAll('.admin-action-btn').forEach(btn=>{
    btn.style.display = admin ? '' : 'none';
  });
  // Add body class for CSS-based hiding
  if(!admin && currentSession){
    document.body.classList.add('employee-mode');
    // Show employee info banner
    const banner = document.createElement('div');
    banner.id='empBanner';
    banner.style.cssText='position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:var(--bluel);border:1.5px solid var(--blue);color:var(--blue);border-radius:10px;padding:7px 16px;font-size:12px;font-weight:800;z-index:100;white-space:nowrap;pointer-events:none';
    banner.innerHTML='👤 Employee Mode — View Only (Delete disabled)';
    document.body.appendChild(banner);
    setTimeout(()=>{ if(banner) banner.remove(); }, 4000);
  } else {
    document.body.classList.remove('employee-mode');
  }
}
function requireAdmin(callback){
  if(isAdmin()){
    callback();
    return;
  }
  if(currentSession && currentSession.role==='employee'){
    toast('🚫 Admin only! Aapke paas yeh permission nahi hai.','var(--red)');
    return;
  }
  // Fallback: show password modal
  _adminCallback = callback;
  document.getElementById('adminPwdInput').value = '';
  document.getElementById('adminError').style.display = 'none';
  document.getElementById('adminOverlay').classList.add('open');
  setTimeout(()=>document.getElementById('adminPwdInput').focus(), 100);
}

// Employee management
function openManageEmployees(){
  renderEmpMgmtList();
  openModal('modal-manageEmployees');
}
async function renderEmpMgmtList(){
  let creds = [];
  try { creds = await getEmpCredsFromServer(); } catch(_){ creds = getEmpCreds(); }
  const el = document.getElementById('empMgmtList');
  if(!el) return;
  if(!creds.length){
    el.innerHTML='<div class="empty"><div class="empty-icon">👤</div><h3>No employee logins created yet</h3><p style="font-size:12px;color:var(--ink3)">Add employees from Salary section to create their login.</p></div>';
    return;
  }
  el.innerHTML = creds.map(c=>{
    const emp = employees.find(e=>e.id===c.empId);
    return `<div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg3);border:1px solid var(--border);border-radius:10px;margin-bottom:8px">
      <div style="width:40px;height:40px;border-radius:10px;background:var(--bluel);border:2px solid var(--blue);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">👤</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:800;font-size:13px;color:var(--ink)">${c.name}</div>
        <div style="font-size:11px;color:var(--ink3);margin-top:2px">ID: <b style="color:var(--blue)">${c.loginId}</b> · ${emp?emp.role:'—'}</div>
        <div style="font-size:10px;color:var(--ink3)">Emp ID: ${c.empId}</div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-orange btn-sm" onclick="openResetEmpPwd('${c.empId}')">🔑 Reset</button>
        <button class="btn btn-red btn-sm" onclick="removeEmpLogin('${c.empId}')">🗑️</button>
      </div>
    </div>`;
  }).join('');
}
function openResetEmpPwd(empId){
  const creds = getEmpCreds();
  const c = creds.find(x=>x.empId===empId);
  if(!c) return;
  document.getElementById('rep-empId').value = empId;
  document.getElementById('rep-empName').textContent = '👤 ' + c.name;
  document.getElementById('rep-loginId').value = c.loginId;
  document.getElementById('rep-pwd').value = '';
  closeModal('modal-manageEmployees');
  openModal('modal-resetEmpPwd');
}
async function confirmResetEmpPwd(){
  const empId = document.getElementById('rep-empId').value;
  const loginId = val('rep-loginId');
  const pwd = document.getElementById('rep-pwd').value;
  if(!loginId){ toast('⚠️ Login ID required','var(--red)'); return; }
  if(!pwd){ toast('⚠️ Password required','var(--red)'); return; }
  let creds = [];
  try { creds = await getEmpCredsFromServer(); } catch(_){ creds = getEmpCreds(); }
  const idx = creds.findIndex(c=>c.empId===empId);
  if(idx>=0){
    creds[idx].loginId = loginId;
    creds[idx].password = pwd;
  } else {
    const emp = employees.find(e=>e.id===empId);
    creds.push({empId, name:emp?emp.name:'Employee', loginId, password:pwd});
  }
  await saveEmpCredsToServer(creds);
  closeModal('modal-resetEmpPwd');
  renderEmpMgmtList();
  toast('✅ Login credentials updated!','var(--green)');
}
async function removeEmpLogin(empId){
  if(!confirm('Remove employee login access?')) return;
  let creds = [];
  try { creds = await getEmpCredsFromServer(); } catch(_){ creds = getEmpCreds(); }
  creds = creds.filter(c=>c.empId!==empId);
  await saveEmpCredsToServer(creds);
  renderEmpMgmtList();
  toast('🗑️ Employee login removed','var(--orange)');
}
function openAddEmpFromAdmin(){
  document.getElementById('emp-name').value='';
  document.getElementById('emp-role').value='';
  document.getElementById('emp-phone').value='';
  document.getElementById('emp-salary').value='';
  document.getElementById('emp-addr').value='';
  document.getElementById('emp-editId').value='';
  document.getElementById('emp-loginId').value='';
  document.getElementById('emp-loginPwd').value='arl@123';
  openModal('modal-addEmployee');
}

// ═══ SALARY MODAL HELPERS ══════════════════════════════════════════════════
let _currentSalaryType = 'full'; // 'full' | 'advance' | 'split'

function setSalaryType(type){
  _currentSalaryType = type;
  const types = ['full','advance','split'];
  types.forEach(t=>{
    const btn = document.getElementById('ps-type-'+t);
    if(btn) btn.className = 'btn btn-sm ' + (t===type ? 'btn-green' : 'btn-ghost');
  });
  const singleSec = document.getElementById('ps-single-section');
  const splitSec = document.getElementById('ps-split-section');
  const amtLabel = document.getElementById('ps-amt-label');
  const quickBtns = document.getElementById('ps-quickBtns');
  const preview = document.getElementById('ps-preview');
  if(type==='split'){
    if(singleSec) singleSec.style.display='none';
    if(splitSec) splitSec.style.display='block';
    if(quickBtns) quickBtns.style.display='none';
    if(preview) preview.style.display='none';
    updateSplitPreview();
  } else {
    if(singleSec) singleSec.style.display='block';
    if(splitSec) splitSec.style.display='none';
    if(amtLabel) amtLabel.textContent = type==='advance' ? 'Advance Amount (₹)' : 'Amount (₹)';
    const empId = document.getElementById('ps-emp')?.value;
    const emp = employees.find(e=>e.id===empId);
    if(emp && quickBtns) quickBtns.style.display='flex';
    updateSalaryPreview();
  }
}

function onEmpSelectSalary(sel){
  const empId = sel ? sel.value : '';
  const infoBox = document.getElementById('ps-salaryInfo');
  const infoText = document.getElementById('ps-salaryInfoText');
  const quickBtns = document.getElementById('ps-quickBtns');
  const preview = document.getElementById('ps-preview');
  if(!empId){
    if(infoBox) infoBox.style.display='none';
    if(quickBtns) quickBtns.style.display='none';
    if(preview) preview.style.display='none';
    return;
  }
  const emp = employees.find(e=>e.id===empId);
  if(!emp){
    if(infoBox) infoBox.style.display='none';
    if(quickBtns) quickBtns.style.display='none';
    if(preview) preview.style.display='none';
    return;
  }
  // Show info strip
  if(infoBox) infoBox.style.display='block';
  if(infoText) infoText.innerHTML=`👷 <strong>${emp.name}</strong> · ${emp.role} &nbsp;|&nbsp; 💰 Monthly Salary: <strong style="color:var(--green)">₹${Number(emp.salary||0).toLocaleString('en-IN')}</strong>`;
  // Quick buttons dataset
  if(quickBtns){ quickBtns.dataset.salary = emp.salary||0; }
  // Auto fill based on type
  if(_currentSalaryType !== 'split'){
    const amtEl = document.getElementById('ps-amt');
    if(amtEl) amtEl.value = emp.salary||'';
    if(quickBtns) quickBtns.style.display='flex';
    updateSalaryPreview();
  } else {
    updateSplitPreview();
  }
}

function fillSalaryAmt(inputId, fraction){
  const quickBtns = document.getElementById('ps-quickBtns');
  const full = parseFloat(quickBtns?.dataset?.salary||0);
  const amt = Math.round(full * fraction);
  const el = document.getElementById(inputId);
  if(el) el.value = amt;
  updateSalaryPreview();
}

function autoSplit(f1, f2){
  const quickBtns = document.getElementById('ps-quickBtns');
  const full = parseFloat(quickBtns?.dataset?.salary||0);
  document.getElementById('ps-split1').value = Math.round(full*f1);
  document.getElementById('ps-split2').value = Math.round(full*f2);
  updateSplitPreview();
}

function updateSplitPreview(){
  const full = parseFloat(document.getElementById('ps-quickBtns')?.dataset?.salary||0);
  const s1 = parseFloat(document.getElementById('ps-split1')?.value)||0;
  const s2 = parseFloat(document.getElementById('ps-split2')?.value)||0;
  const total = s1+s2;
  const prev = document.getElementById('ps-split-preview');
  if(!prev) return;
  if(total>0){
    const diff = full - total;
    let msg = `Total: <strong>₹${total.toLocaleString('en-IN')}</strong>`;
    if(full>0){
      if(diff===0) msg += ` &nbsp;✅ Full salary covered`;
      else if(diff>0) msg += ` &nbsp;⚡ ₹${diff.toLocaleString('en-IN')} remaining`;
      else msg += ` &nbsp;⚠️ ₹${Math.abs(diff).toLocaleString('en-IN')} excess`;
    }
    prev.innerHTML = msg;
  } else {
    prev.innerHTML='';
  }
}

function updateSalaryPreview(){
  const amt = parseFloat(document.getElementById('ps-amt')?.value)||0;
  const preview = document.getElementById('ps-preview');
  if(!preview) return;
  const quickBtns = document.getElementById('ps-quickBtns');
  const full = parseFloat(quickBtns?.dataset?.salary||0);
  if(amt>0){
    preview.style.display='block';
    let typeLabel = _currentSalaryType==='advance' ? '⚡ Advance' : '';
    let label = amt===full ? '✅ Full Salary' : amt<full ? `${typeLabel||'⚡ Partial'} — ₹${(full-amt).toLocaleString('en-IN')} remaining` : '💰 Extra Payment';
    let color = amt===full?'var(--green)':amt<full?'var(--orange)':'var(--blue)';
    preview.style.borderColor=color; preview.style.color=color;
    preview.style.background= amt===full?'var(--greenl)':amt<full?'var(--orangel)':'var(--bluel)';
    preview.innerHTML=`💸 Paying: <span style="font-size:16px">₹${amt.toLocaleString('en-IN')}</span> &nbsp;·&nbsp; ${label}`;
  } else {
    preview.style.display='none';
  }
}

// ═══ ADMIN PASSWORD MODAL (legacy/fallback) ═══════════════════════════════
let _adminCallback = null;

function verifyAdmin(){
  const pwd = document.getElementById('adminPwdInput').value;
  if(pwd === ADMIN_PASSWORD){
    document.getElementById('adminOverlay').classList.remove('open');
    if(_adminCallback){ _adminCallback(); _adminCallback = null; }
  } else {
    document.getElementById('adminError').style.display = 'block';
    document.getElementById('adminPwdInput').value = '';
    document.getElementById('adminPwdInput').focus();
  }
}
function closeAdminModal(){
  document.getElementById('adminOverlay').classList.remove('open');
  _adminCallback = null;
}

// ═══ THEME TOGGLE ═════════════════════════════════════════════════════════════
function toggleTheme(){
  const isLight=document.body.classList.toggle('light');
  document.getElementById('themeToggle').textContent=isLight?'☀️':'🌙';
  localStorage.setItem('arlib-theme',isLight?'light':'dark');
}
function applyTheme(){
  const saved=localStorage.getItem('arlib-theme');
  if(saved==='light'){
    document.body.classList.add('light');
    const btn=document.getElementById('themeToggle');
    if(btn) btn.textContent='☀️';
  }
}

// ═══ BACKUP ════════════════════════════════════════════════════════════════════
function renderBackup(){
  loadRecycleBin();
  updateBinBadge();
  // Show/hide employee notice banner
  const empNotice = document.getElementById('emp-backup-notice');
  if(empNotice) empNotice.style.display = isAdmin() ? 'none' : 'block';
  // Stats
  const occupied = seats.filter(s=>s.occupied).length;
  document.getElementById('backup-stats').innerHTML=[
    {icon:'👥',label:'Members',val:members.length,c:'var(--blue)'},
    {icon:'💰',label:'Fee Records',val:feeRecords.length,c:'var(--green)'},
    {icon:'📋',label:'Attendance',val:attendance.length,c:'var(--teal)'},
    {icon:'💸',label:'Expenses',val:expenses.length,c:'var(--red)'},
    {icon:'👷',label:'Employees',val:employees.length,c:'var(--orange)'},
  ].map(s=>`
    <div class="scard">
      <div class="scard-accent" style="background:${s.c}"></div>
      <div class="scard-icon">${s.icon}</div>
      <div class="scard-val" style="color:${s.c}">${s.val}</div>
      <div class="scard-label">${s.label}</div>
    </div>`).join('');

  // Last backup label
  const lb = localStorage.getItem('arlib-lastBackup');
  document.getElementById('lastBackupLabel').textContent = lb
    ? new Date(lb).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})
    : 'Never ⚠️';

  // Contents list
  loadAppSettings();
  const _lockerData = appSettings.lockerData || [];
  const _enquiries = getEnquiries();
  const totalSize = (JSON.stringify({feeStructure,members,feeRecords,attendance,notices,expenses,employees,salaryRecords}).length/1024).toFixed(1);
  document.getElementById('backupContents').innerHTML=[
    {icon:'👥',label:'Members',val:members.length+' records'},
    {icon:'💰',label:'Fee Records',val:feeRecords.length+' records'},
    {icon:'📋',label:'Attendance',val:attendance.length+' records'},
    {icon:'📢',label:'Notices',val:notices.length+' records'},
    {icon:'💸',label:'Expenses',val:expenses.length+' records'},
    {icon:'👷',label:'Employees & Salary',val:employees.length+' emp · '+salaryRecords.length+' records'},
    {icon:'🔐',label:'Lockers',val:_lockerData.length+' assigned'},
    {icon:'📝',label:'Enquiries',val:_enquiries.length+' records'},
    {icon:'⚙️',label:'Fee Structure',val:'All plans saved'},
    {icon:'🚫',label:'Images (photo/aadhar)',val:'Not included (backup mein nahi aate)'},
    {icon:'📦',label:'Total Size (approx)',val:'~'+totalSize+' KB'},
  ].map(r=>`<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border)">
    <span>${r.icon} ${r.label}</span>
    <span style="font-weight:800;color:var(--ink)">${r.val}</span>
  </div>`).join('');
}

async function downloadBackup(){
  toast('⏳ Fetching latest data from server...','var(--teal)');
  try {
    // Always fetch fresh backup data from server
    const serverData = await AR_API.getBackup();

    // Strip images (photo, aadharImg) to keep backup small & fast
    const membersClean = (serverData.members || members).map(m=>({
      ...m,
      photo: null,
      aadharImg: null
    }));

    // Locker data — server + appSettings dono se merge karo
    let lockerData = [];
    let lockerCount = {};
    try {
      const serverLockers = await AR_API.getLockers();
      loadAppSettings();
      const localLockers = appSettings.lockerData || [];
      // Merge — server + local, duplicate locker no. hataao
      const lockerMap = {};
      [...localLockers, ...serverLockers].forEach(l=>{ if(l && l.no) lockerMap[l.no]=l; });
      lockerData = Object.values(lockerMap);
      lockerCount = appSettings.lockers || {};
      // appSettings mein bhi update karo
      appSettings.lockerData = lockerData;
      saveAppSettings();
    } catch(e){ 
      loadAppSettings();
      lockerData = appSettings.lockerData || [];
      lockerCount = appSettings.lockers || {};
    }

    // Enquiry data — server + localStorage dono se merge karo
    let enquiries = [];
    try {
      const serverEnqs = await AR_API.getEnquiries();
      const localEnqs = getEnquiries(); // localStorage
      // Dono combine karo — duplicate IDs hataao
      const enqMap = {};
      [...localEnqs, ...serverEnqs].forEach(e=>{ if(e && e.id) enqMap[e.id]=e; });
      enquiries = Object.values(enqMap);
      // Server pe bhi sync karo agar kuch local mein extra hai
      if(localEnqs.length > 0) saveEnquiries(enquiries);
    } catch(e){
      enquiries = getEnquiries(); // pure localStorage fallback
    }

    // ── Employee Credentials backup ────────────────────────────────────────────
    let empCreds = [];
    try {
      empCreds = await AR_API.getEmpCreds();
    } catch(e){
      empCreds = getEmpCreds(); // localStorage fallback
    }

    // ── Recycle Bin backup ─────────────────────────────────────────────────────
    let binData = [];
    try {
      binData = await AR_API.getBin();
    } catch(e){
      try { binData = JSON.parse(localStorage.getItem(BIN_KEY)||'[]'); } catch(_){ binData=[]; }
    }

    // ── App Settings backup (localStorage) ────────────────────────────────────
    loadAppSettings();
    const settingsSnapshot = JSON.parse(JSON.stringify(appSettings));

    const data = {
      _meta:{
        app:'Yugvandana Library',
        version:'2.7',
        exportedAt: new Date().toISOString(),
        exportedBy:'Yugvandana Library System',
        note:'Images (photo/aadhar) excluded from backup to reduce size'
      },
      feeStructure:  serverData.feeStructure  || feeStructure,
      members:       membersClean,
      feeRecords:    serverData.feeRecords    || feeRecords,
      attendance:    serverData.attendance    || attendance,
      notices:       serverData.notices       || notices,
      expenses:      serverData.expenses      || expenses,
      employees:     serverData.employees     || employees,
      salaryRecords: serverData.salaryRecords || salaryRecords,
      lockerData:    lockerData,
      lockerCount:   lockerCount,
      enquiries:     enquiries,
      empCreds:      empCreds,
      recycleBin:    binData,
      appSettings:   settingsSnapshot
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], {type:'application/json'});
    const a = document.createElement('a');
    const date = new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}).replace(/ /g,'-');
    const time = new Date().toTimeString().slice(0,5).replace(':','-');
    a.href = URL.createObjectURL(blob);
    a.download = `ARLibrary_Backup_${date}_${time}.json`;
    a.click();
    localStorage.setItem('arlib-lastBackup', new Date().toISOString());
    toast('✅ Backup downloaded! (Images excluded)','var(--teal)');
    renderBackup();
  } catch(e) {
    console.error('Backup error:', e);
    toast('❌ Backup failed: ' + e.message,'var(--red)');
  }
}

function downloadAllExcel(){
  if(typeof XLSX==='undefined'){ toast('⚠️ XLSX library not loaded','var(--red)'); return; }
  const wb = XLSX.utils.book_new();

  // Members
  if(members.length){
    const ws1 = XLSX.utils.json_to_sheet(members.map(m=>({
      'ID':m.id,'Name':m.name,'Phone':m.phone,'Class':m.cls||'',
      'Shift':shiftShort(m.shift),'Plan':m.plan,'Seat':fmtSeat(m.seat),
      'From':m.from||'','To':m.to||'','Status':m.feeStatus,'Address':m.addr||''
    })));
    XLSX.utils.book_append_sheet(wb, ws1, 'Members');
  }
  // Fee Records
  if(feeRecords.length){
    const ws2 = XLSX.utils.json_to_sheet(feeRecords.map(r=>({
      'Receipt ID':r.id,'Member':r.memberName,'Plan':r.plan,
      'Shift':r.shift,'Amount':r.amount,'Date':r.date,'Month':r.month,'Mode':r.mode,'Status':r.status
    })));
    XLSX.utils.book_append_sheet(wb, ws2, 'Fee Records');
  }
  // Attendance
  if(attendance.length){
    const ws3 = XLSX.utils.json_to_sheet(attendance.map(a=>({
      'Date':a.date,'Member':a.memberName,'Shift':a.shift,'Seat':a.seat||'',
      'Check-In':a.in||'','Check-Out':a.out||'','Present':a.present?'Yes':'No'
    })));
    XLSX.utils.book_append_sheet(wb, ws3, 'Attendance');
  }
  // Expenses
  if(expenses.length){
    const ws4 = XLSX.utils.json_to_sheet(expenses.map(e=>({
      'ID':e.id,'Category':e.cat,'Description':e.desc,
      'Amount':e.amount,'Date':e.date,'Mode':e.mode
    })));
    XLSX.utils.book_append_sheet(wb, ws4, 'Expenses');
  }
  // Salary
  if(salaryRecords.length){
    const ws5 = XLSX.utils.json_to_sheet(salaryRecords.map(s=>({
      'Employee':s.empName,'Month':s.month,'Amount':s.amount,'Date':s.date,'Mode':s.mode
    })));
    XLSX.utils.book_append_sheet(wb, ws5, 'Salary');
  }
  const date = new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}).replace(/ /g,'-');
  XLSX.writeFile(wb, `ARLibrary_AllData_${date}.xlsx`);
  toast('📊 Full Excel backup downloaded!','var(--green)');
}

function handleRestoreFile(input){
  const file = input.files[0];
  if(!file){ return; }
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if(!data.members && !data.feeRecords){
        throw new Error('Invalid backup file');
      }
      // Show preview
      const prev = document.getElementById('restorePreview');
      const exportedAt = data._meta?.exportedAt
        ? new Date(data._meta.exportedAt).toLocaleString('en-IN')
        : 'Unknown';
      prev.style.display='block';
      prev.innerHTML=`
        <div style="background:var(--orangel);border:1.5px solid var(--orange);border-radius:10px;padding:14px">
          <div style="font-weight:800;font-size:13px;color:var(--orange);margin-bottom:8px">⚠️ Restore Preview — Please Confirm</div>
          <div style="font-size:12px;color:var(--ink2);line-height:1.8;margin-bottom:12px">
            📅 Backup date: <strong>${exportedAt}</strong><br>
            👥 Members: <strong>${(data.members||[]).length}</strong>&nbsp;·&nbsp;
            💰 Fees: <strong>${(data.feeRecords||[]).length}</strong>&nbsp;·&nbsp;
            📋 Attendance: <strong>${(data.attendance||[]).length}</strong><br>
            💸 Expenses: <strong>${(data.expenses||[]).length}</strong>&nbsp;·&nbsp;
            👷 Employees: <strong>${(data.employees||[]).length}</strong>
          </div>
          <div style="font-size:12px;color:var(--red);font-weight:700;margin-bottom:12px">
            ⚠️ Current data will be REPLACED. Download a fresh backup first if needed!
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-orange" onclick="confirmRestore()" style="flex:1;justify-content:center">✅ Yes, Restore</button>
            <button class="btn btn-ghost" onclick="cancelRestore()" style="flex:1;justify-content:center">❌ Cancel</button>
          </div>
        </div>`;
      window._pendingRestore = data;
    } catch(err){
      toast('⚠️ Invalid backup file! Please select a valid .json file.','var(--red)');
      input.value='';
    }
  };
  reader.readAsText(file);
}

function confirmRestore(){
  const data = window._pendingRestore;
  if(!data){ toast('⚠️ No backup data found','var(--red)'); return; }
  requireAdmin(async ()=>{
    const btn = document.querySelector('[onclick="confirmRestore()"]');
    if(btn){ btn.disabled=true; btn.textContent='⏳ Restoring...'; }
    try {
      // Strip base64 photos to keep payload under 5MB limit
      // Photos are large and can be re-uploaded separately
      const members = (data.members || []).map(m => ({
        ...m,
        photo:     m.photo     && m.photo.length     > 50000 ? null : (m.photo     || null),
        aadharImg: m.aadharImg && m.aadharImg.length > 50000 ? null : (m.aadharImg || null)
      }));

      const payload = {
        members,
        feeRecords:    data.feeRecords    || [],
        attendance:    data.attendance    || [],
        notices:       data.notices       || [],
        expenses:      data.expenses      || [],
        employees:     data.employees     || [],
        salaryRecords: data.salaryRecords || [],
        feeStructure:  data.feeStructure  || []
      };

      const payloadSize = JSON.stringify(payload).length;
      console.log('📦 Restore payload size:', (payloadSize/1024).toFixed(0), 'KB');
      if(payloadSize > 4_000_000){
        toast('⚠️ Payload bahut bada hai (' + (payloadSize/1024/1024).toFixed(1) + ' MB) — photos strip kar rahe hain...','var(--orange)');
        // Strip ALL photos if still too big
        payload.members = payload.members.map(m => ({ ...m, photo: null, aadharImg: null }));
      }

      const result = await AR_API.restoreBackup(payload);

      if(!result || !result.ok) throw new Error((result && result.error) || 'Server restore failed');

      await loadData();
      buildSeats();

      // ── Lockers: server pe restore karo (one by one) ──────────────────────
      if(data.lockerData && data.lockerData.length > 0){
        toast('🔐 Lockers restore ho rahe hain...','var(--teal)');
        let lockerOk = true;
        try {
          // Pehle sab release karo server se (fresh start)
          const existingLockers = await AR_API.getLockers().catch(()=>[]);
          for(const lk of existingLockers){
            await AR_API.releaseLocker(lk.no).catch(()=>{});
          }
          // Ab backup wale lockers save karo
          for(const lk of data.lockerData){
            await AR_API.saveLocker(lk).catch(e=>{ lockerOk=false; console.warn('Locker save err:',e.message); });
          }
        } catch(e){ lockerOk=false; console.warn('Locker restore error:',e.message); }
        // Locker count appSettings mein (localStorage) — ye theek hai
        loadAppSettings();
        appSettings.lockerData = data.lockerData;
        if(data.lockerCount) appSettings.lockers = data.lockerCount;
        saveAppSettings();
        renderLockers();
        if(!lockerOk) toast('⚠️ Kuch lockers server pe save nahi hue','var(--orange)');
      }

      // ── Enquiries: server pe restore karo (one by one) ────────────────────
      if(data.enquiries && data.enquiries.length > 0){
        toast('📝 Enquiries restore ho rahi hain...','var(--teal)');
        let enqOk = true;
        try {
          // Pehle sab delete karo
          const existingEnqs = await AR_API.getEnquiries().catch(()=>[]);
          for(const eq of existingEnqs){
            await AR_API.deleteEnquiry(eq.id).catch(()=>{});
          }
          // Ab backup wali enquiries add karo
          for(const eq of data.enquiries){
            await AR_API.addEnquiry(eq).catch(e=>{ enqOk=false; console.warn('Enq save err:',e.message); });
          }
          // LocalStorage bhi sync karo
          saveEnquiries(data.enquiries);
        } catch(e){ enqOk=false; console.warn('Enquiry restore error:',e.message); }
        if(!enqOk) toast('⚠️ Kuch enquiries server pe save nahi hui','var(--orange)');
      }

      localStorage.setItem('arlib-lastBackup', data._meta?.exportedAt || new Date().toISOString());

      // ── Employee Credentials restore ───────────────────────────────────────
      if(data.empCreds && Array.isArray(data.empCreds) && data.empCreds.length > 0){
        try {
          await saveEmpCredsToServer(data.empCreds);
          toast('👤 Employee credentials restored!','var(--blue)');
        } catch(e){ console.warn('EmpCreds restore warn:', e.message); }
      }

      // ── Recycle Bin restore ────────────────────────────────────────────────
      if(data.recycleBin && Array.isArray(data.recycleBin) && data.recycleBin.length > 0){
        try {
          // Pehle clear karo, then add one by one
          await AR_API.emptyBin().catch(()=>{});
          for(const item of data.recycleBin){
            await AR_API.addToBin(item).catch(()=>{});
          }
          recycleBin = data.recycleBin;
          saveRecycleBin();
          renderRecycleBin();
          toast('🗑️ Recycle bin restored!','var(--orange)');
        } catch(e){ console.warn('Bin restore warn:', e.message); }
      }

      // ── App Settings restore (localStorage) ───────────────────────────────
      if(data.appSettings && typeof data.appSettings === 'object'){
        // Merge carefully — preserve critical fields
        loadAppSettings();
        const saved = data.appSettings;
        // Restore all settings fields except lockerData (handled separately)
        if(saved.adminPwd) appSettings.adminPwd = saved.adminPwd;
        if(saved.library) appSettings.library = saved.library;
        if(saved.seats) appSettings.seats = saved.seats;
        if(saved.shifts) appSettings.shifts = saved.shifts;
        if(saved.discounts) appSettings.discounts = saved.discounts;
        if(saved.customShifts) appSettings.customShifts = saved.customShifts;
        if(saved.lockers) appSettings.lockers = saved.lockers;
        if(saved.chargeTypes) appSettings.chargeTypes = saved.chargeTypes;
        if(saved.customPlans) appSettings.customPlans = saved.customPlans;
        if(saved.target) appSettings.target = saved.target;
        if(saved.lagat) appSettings.lagat = saved.lagat;
        saveAppSettings();
        toast('⚙️ App settings restored!','var(--teal)');
      }

      window._pendingRestore = null;
      document.getElementById('restorePreview').style.display='none';
      document.getElementById('restoreFileInput').value='';
      renderBackup();
      toast('✅ Data successfully restored to server!','var(--teal)');
    } catch(e) {
      console.error('❌ Restore error:', e);
      toast('❌ Restore failed: ' + e.message, 'var(--red)');
    } finally {
      if(btn){ btn.disabled=false; btn.textContent='✅ Yes, Restore'; }
    }
  });
}

function cancelRestore(){
  window._pendingRestore = null;
  document.getElementById('restorePreview').style.display='none';
  document.getElementById('restoreFileInput').value='';
}

// ═══ SECTION SETTINGS TOGGLE ══════════════════════════════════════════════════
function toggleSectionSettings(divId, btnId) {
  const div = document.getElementById(divId);
  const btn = document.getElementById(btnId);
  if (!div) return;
  const isOpen = div.style.display !== 'none';
  div.style.display = isOpen ? 'none' : 'block';
  if (btn) {
    btn.textContent = isOpen ? '⚙️ Settings' : '✖ Hide Settings';
    btn.classList.toggle('btn-ghost', isOpen);
    btn.classList.toggle('btn-orange', !isOpen);
  }
  if (!isOpen && divId === 'seats-settings') renderSettingsSeatMap();
  if (!isOpen && divId === 'seats-settings'){ renderCustomShiftList(); populateAllShiftDropdowns(); }
}

function renderSettingsSeatMap(){
  loadAppSettings();
  const s = appSettings.seats || {};
  const total    = s.total   || 79;
  const zoneRed  = s.zoneRed || 50;

  // Occupied seat numbers — build a map by numeric seat no
  // A seat is occupied if ANY member (morning, evening, full day) has that number
  const occupied = {}; // {seatNo: [members]}
  members.forEach(m=>{
    if(!m.seat) return;
    const {no} = parseSeatKey(m.seat);
    if(!no) return;
    if(!occupied[no]) occupied[no]=[];
    occupied[no].push(m);
  });

  // Info bar
  const infoEl = document.getElementById('settingsSeatMapInfo');
  if(infoEl){
    const occ = Object.keys(occupied).length;
    infoEl.innerHTML = `
      <span>🪑 Total: <b>${total}</b></span>
      <span style="color:var(--red)">🔴 Occupied: <b>${occ}</b></span>
      <span style="color:var(--green)">🟢 Free: <b>${total-occ}</b></span>
      <span style="color:var(--red)">🔴 Red Zone: seats 1–${zoneRed}</span>
      <span style="color:var(--blue)">🔵 Blue Zone: seats ${zoneRed+1}–${total}</span>`;
  }

  const mapEl = document.getElementById('settingsSeatMap');
  if(!mapEl) return;
  mapEl.style.display='block';
  // Build row-based layout for settings
  const byNo2 = {};
  for(let i=1;i<=total;i++){
    byNo2[i] = {no:i, occList: occupied[i]||[]};
  }
  const mkSettingsSeat = (no, flipped)=>{
    const {occList} = byNo2[no]||{occList:[]};
    const occ = occList[0]||null;
    let zoneBorder, zone;
    if(no<=zoneRed){ zone='var(--redl)'; zoneBorder='var(--red)'; }
    else           { zone='var(--bluel)'; zoneBorder='var(--blue)'; }
    const backStyle = flipped
      ? `width:78%;height:9px;border-radius:0 0 4px 4px;border:2px solid;border-top:none;margin-top:-1px;flex-shrink:0;`
      : `width:78%;height:9px;border-radius:4px 4px 0 0;border:2px solid;border-bottom:none;margin-bottom:-1px;flex-shrink:0;`;
    const flexDir = flipped ? 'column-reverse' : 'column';
    if(occ){
      const initials=occ.name.split(' ').map(x=>x[0]).join('').substring(0,2).toUpperCase();
      const dualLabel=occList.length>1?`<div style="font-size:6px;color:var(--orange)">×${occList.length}</div>`:'';
      return `<div onclick="showSeatDetail(${no})" title="Seat ${no}" style="width:34px;flex-shrink:0;display:flex;flex-direction:${flexDir};align-items:center;cursor:pointer">
        <div style="${backStyle}background:#200808;border-color:#5a1a1a"></div>
        <div style="width:100%;height:22px;border-radius:3px;border:2px solid #5a1a1a;background:#200808;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:8px;font-weight:800;color:var(--red)">${no}<div style="font-size:7px">${initials}</div>${dualLabel}</div>
      </div>`;
    } else {
      return `<div onclick="showSeatDetail(${no})" title="Seat ${no}" style="width:34px;flex-shrink:0;display:flex;flex-direction:${flexDir};align-items:center;cursor:pointer">
        <div style="${backStyle}background:${zone};border-color:${zoneBorder}"></div>
        <div style="width:100%;height:22px;border-radius:3px;border:2px solid ${zoneBorder};background:${zone};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:${zoneBorder}">${no}</div>
      </div>`;
    }
  };
  const rowA2=Array.from({length:21},(_,i)=>i+1);
  const rowBTop2=Array.from({length:20},(_,i)=>i+22);
  const rowBBot2=Array.from({length:20},(_,i)=>i+42);
  const rowCTop2=Array.from({length:9},(_,i)=>i+62);
  const rowCBot2=Array.from({length:9},(_,i)=>i+71);
  const rowLbl2=(t,color='var(--ink3)')=>`<div style="font-size:8px;font-weight:800;color:${color};letter-spacing:.5px;margin-bottom:3px;opacity:.7">${t}</div>`;
  const chunk2=(arr,size)=>Array.from({length:Math.ceil(arr.length/size)},(_,i)=>arr.slice(i*size,(i+1)*size));
  const mkRows2=(arr,flipped)=>chunk2(arr,10).map(line=>`<div class="seat-row${flipped?' row-top':''}" style="margin-bottom:4px">${line.map(n=>mkSettingsSeat(n,flipped)).join('')}</div>`).join('');
  mapEl.innerHTML=`<div class="seatmap-container">
    <div style="margin-bottom:8px">${rowLbl2('ROW A')}${mkRows2(rowA2,false)}</div>
    <div style="margin-bottom:8px">${rowLbl2('ROW B')}${mkRows2(rowBTop2,true)}<div class="seat-aisle-gap"></div>${mkRows2(rowBBot2,false)}</div>
    <div>${rowLbl2('ROW C')}${mkRows2(rowCTop2,true)}<div class="seat-aisle-gap"></div>${mkRows2(rowCBot2,false)}</div>
  </div>`;
}

function showSeatDetail(seatNo){
  const detEl = document.getElementById('settingsSeatDetail');
  const titleEl = document.getElementById('ssdTitle');
  const bodyEl = document.getElementById('ssdBody');
  if(!detEl) return;
  // Find all members assigned to this seat number (any shift)
  const mList = members.filter(m=>{
    const {no} = parseSeatKey(m.seat);
    return no === seatNo;
  });
  titleEl.textContent = `🪑 Seat ${seatNo}`;
  if(mList.length){
    bodyEl.innerHTML = mList.map(member=>`
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:8px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px">
        <div><span style="color:var(--ink3)">Member:</span> <b>${member.name}</b></div>
        <div><span style="color:var(--ink3)">ID:</span> ${member.id}</div>
        <div><span style="color:var(--ink3)">Shift:</span> ${shiftShort(member.shift)}</div>
        <div><span style="color:var(--ink3)">Seat Key:</span> <b style="color:var(--blue)">${fmtSeat(member.seat)}</b></div>
        <div><span style="color:var(--ink3)">Plan:</span> ${member.plan}</div>
        <div><span style="color:var(--ink3)">Valid Till:</span> ${member.to||'—'}</div>
        <div><span style="color:var(--ink3)">Status:</span> <span class="badge ${member.feeStatus==='Paid'?'b-green':'b-red'}">${member.feeStatus}</span></div>
        <div><span style="color:var(--ink3)">Phone:</span> ${member.phone||'—'}</div>
      </div>
      <div style="margin-top:8px;display:flex;gap:8px">
        <a href="https://wa.me/${member.phone}" target="_blank" class="btn btn-wa btn-sm">📲 WhatsApp</a>
      </div>
    </div>`).join('');
  } else {
    bodyEl.innerHTML = `<div style="color:var(--green);font-weight:700">✅ Seat is free</div>`;
  }
  detEl.style.display='block';
}

// ═══ SETTINGS ═════════════════════════════════════════════════════════════════

// Default app settings stored in localStorage
const SETTINGS_KEY = 'studyzone_settings_v1';
let appSettings = {};

function loadAppSettings(){
  try {
    const s = localStorage.getItem(SETTINGS_KEY);
    appSettings = s ? JSON.parse(s) : {};
  } catch(e){ appSettings = {}; }
  // Defaults
  appSettings.library = appSettings.library || {
    name:'Yugvandana Library', tagline:'Ward No. 15, Sarkari Hospital Ke Samne, Baikunthpur',
    addr:'Ward No. 15, Sarkari Hospital Ke Samne, Baikunthpur',
    phone:'83498 52152', email:''
  };
  appSettings.shifts = appSettings.shifts || {
    morningStart:'06:00', morningEnd:'13:00',
    eveningStart:'13:00', eveningEnd:'20:00',
    nightStart:'20:00', nightEnd:'24:00'
  };
  appSettings.seats = appSettings.seats || { total:79, zoneRed:50 };
  appSettings.discounts = appSettings.discounts || { threeMonth:10, sixMonth:20 };
  appSettings.lockers = appSettings.lockers || { total:20 };
  appSettings.chargeTypes = appSettings.chargeTypes || [
    {id:'ct1', name:'Late Fee', amount:50, desc:'Charged for late payment'},
    {id:'ct2', name:'Locker Fee', amount:100, desc:'Monthly locker charge'},
    {id:'ct3', name:'Penalty', amount:200, desc:'Rule violation penalty'}
  ];
  appSettings.adminPwd = appSettings.adminPwd || 'anuj@2006';
  appSettings.customShifts = appSettings.customShifts || [];
}

function saveAppSettings(){
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(appSettings)); } catch(e){}
}

function setSettingsTab(t, btn){
  ['library','fees','seats','shifts','security','additional'].forEach(x=>{
    const el = document.getElementById('settings-'+x);
    if(el) el.style.display='none';
  });
  const target = document.getElementById('settings-'+t);
  if(target) target.style.display='block';
  document.querySelectorAll('#page-settings .fee-tab').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  if(t==='fees') renderSettingsFeeStructure();
  if(t==='additional') renderChargeTypeList();
  if(t==='shifts') renderShiftPreview();
}

function renderSettings(){
  loadAppSettings();
  const lib = appSettings.library;
  document.getElementById('st-libName').value = lib.name||'';
  document.getElementById('st-libTagline').value = lib.tagline||'';
  document.getElementById('st-libAddr').value = lib.addr||'';
  document.getElementById('st-libPhone').value = lib.phone||'';
  document.getElementById('st-libEmail').value = lib.email||'';
  updateLibraryPreview();

  const sh = appSettings.shifts;
  document.getElementById('st-morningStart').value = sh.morningStart||'06:00';
  document.getElementById('st-morningEnd').value = sh.morningEnd||'13:00';
  document.getElementById('st-eveningStart').value = sh.eveningStart||'13:00';
  document.getElementById('st-eveningEnd').value = sh.eveningEnd||'20:00';
  const nightStartEl = document.getElementById('st-nightStart'); if(nightStartEl) nightStartEl.value = sh.nightStart||'20:00';
  const nightEndEl = document.getElementById('st-nightEnd'); if(nightEndEl) nightEndEl.value = sh.nightEnd||'24:00';

  const se = appSettings.seats;
  document.getElementById('st-totalSeats').value = se.total||79;
  document.getElementById('st-zoneRed').value = se.zoneRed||50;
  renderCustomShiftList();
}

function updateLibraryPreview(){
  const n = document.getElementById('st-libName')?.value || 'Yugvandana Library';
  const t = document.getElementById('st-libTagline')?.value || 'Silent Study Zone';
  const a = document.getElementById('st-libAddr')?.value || '';
  const p = document.getElementById('st-libPhone')?.value || '';
  const pn = document.getElementById('prev-name'); if(pn) pn.textContent = '📚 '+n;
  const pt = document.getElementById('prev-tagline'); if(pt) pt.textContent = t;
  const pc = document.getElementById('prev-contact'); if(pc) pc.textContent = (a?'📍 '+a+' | ':'')+( p?'📞 '+p:'');
}
// Live preview on input
document.addEventListener('input', e=>{
  if(['st-libName','st-libTagline','st-libAddr','st-libPhone'].includes(e.target.id)) updateLibraryPreview();
});

function saveLibrarySettings(){
  loadAppSettings();
  appSettings.library = {
    name: document.getElementById('st-libName').value.trim() || 'Yugvandana Library',
    tagline: document.getElementById('st-libTagline').value.trim() || 'Silent Study Zone',
    addr: document.getElementById('st-libAddr').value.trim(),
    phone: document.getElementById('st-libPhone').value.trim(),
    email: document.getElementById('st-libEmail').value.trim()
  };
  saveAppSettings();
  toast('✅ Library info saved!','var(--green)');
}

function renderSettingsFeeStructure(){
  const plans = Object.keys(feeStructure);
  const shifts = ['Morning','Evening','Full Day'];
  const el = document.getElementById('st-feeStructureView');
  if(!el) return;
  el.innerHTML = plans.map(p=>`
    <div style="margin-bottom:14px">
      <div style="font-weight:800;font-size:12px;color:var(--blue);letter-spacing:.5px;margin-bottom:6px">${p}</div>
      ${shifts.map(s=>{
        const base=(feeStructure[p]||{})[s]||0;
        const b3=Math.round(base*3*0.9), b6=Math.round(base*6*0.8);
        return `<div style="display:flex;justify-content:space-between;font-size:12.5px;padding:4px 0;border-bottom:1px solid var(--border)">
          <span style="color:var(--ink3)">${s}</span>
          <span style="font-weight:800;color:var(--ink)">${fmtAmt(base)}
            <span style="color:var(--teal);font-size:11px;margin-left:6px">3M:${fmtAmt(b3)} <span style="color:var(--green)">-10%</span></span>
            <span style="color:var(--purple);font-size:11px;margin-left:4px">6M:${fmtAmt(b6)} <span style="color:var(--green)">-20%</span></span>
          </span>
        </div>`;}).join('')}
    </div>`).join('');
  // Also update plan select options (only base 4 plans)
  const sel = document.getElementById('st-fplan') || document.getElementById('fplan');
  if(sel){
    const current = sel.value;
    sel.innerHTML = plans.map(p=>`<option${p===current?' selected':''}>${p}</option>`).join('');
  }
}

async function settingsUpdateFee(){
  const plan = (document.getElementById('st-fplan')||document.getElementById('fplan')||{}).value;
  const shift = (document.getElementById('st-fshift')||document.getElementById('fshift')||{}).value;
  const amtEl = document.getElementById('st-famt')||document.getElementById('famt');
  const amt = parseFloat(amtEl ? amtEl.value : 0);
  if(!plan||!shift||!amt||isNaN(amt)||amt<=0){ toast('⚠️ Valid amount enter karein','var(--red)'); return; }
  try {
    await AR_API.updateFeeStructure(plan, shift, amt);
    feeStructure = await AR_API.getFeeStructure();
    renderSettingsFeeStructure();
    renderFeeStructure();
    renderZonePricingStrip();
    if(amtEl) amtEl.value='';
    toast(`✅ ${plan} / ${shift}: ${fmtAmt(amt)} updated!`,'var(--green)');
  } catch(e){ toast('❌ '+e.message,'var(--red)'); }
}

async function addCustomPlan(){
  const nameEl = document.getElementById('st-newPlanName');
  const mEl = document.getElementById('st-newPlanMorning');
  const evEl = document.getElementById('st-newPlanEvening');
  const fdEl = document.getElementById('st-newPlanFull');
  if(!nameEl){ toast('⚠️ Fee Settings tab mein jaakar Custom Plan add karein','var(--orange)'); return; }
  const name = nameEl.value.trim();
  const m = parseFloat(mEl.value)||0;
  const ev = parseFloat(evEl.value)||0;
  const fd = parseFloat(fdEl.value)||0;
  if(!name){ toast('⚠️ Plan name required','var(--red)'); return; }
  if(!feeStructure[name]){
    feeStructure[name] = {Morning:m, Evening:ev, 'Full Day':fd};
    try {
      await AR_API.updateFeeStructure(name, 'Morning', m);
      await AR_API.updateFeeStructure(name, 'Evening', ev);
      await AR_API.updateFeeStructure(name, 'Full Day', fd);
      feeStructure = await AR_API.getFeeStructure();
    } catch(e){ /* offline fallback */ }
    renderSettingsFeeStructure();
    populateAllShiftDropdowns(); // plan dropdowns refresh karo
    if(nameEl) nameEl.value='';
    if(mEl) mEl.value='';
    if(evEl) evEl.value='';
    if(fdEl) fdEl.value='';
    toast('✅ Custom plan added!','var(--purple)');
  } else {
    toast('⚠️ Is naam ka plan already exists','var(--orange)');
  }
}

function saveSeatCount(){
  loadAppSettings();
  const total = parseInt(document.getElementById('st-totalSeats').value)||79;
  if(total < 10 || total > 500){ toast('⚠️ Seat count 10-500 ke beech hona chahiye','var(--red)'); return; }
  appSettings.seats = appSettings.seats || {};
  appSettings.seats.total = total;
  saveAppSettings();
  buildSeats();
  renderDashboard();
  toast(`✅ Total seats updated to ${total}!`,'var(--green)');
}

function saveZoneSettings(){
  loadAppSettings();
  const red = parseInt(document.getElementById('st-zoneRed').value)||40;
  if(red < 1){ toast('⚠️ Red zone boundary 1 se kam nahi ho sakti','var(--red)'); return; }
  appSettings.seats = appSettings.seats || {};
  appSettings.seats.zoneRed = red;
  saveAppSettings();
  renderZonePricingStrip();
  buildSeats(); renderSeats();
  toast('✅ Zone ranges saved!','var(--blue)');
}

function renderShiftPreview(){
  const sh = appSettings.shifts || {};
  const el = document.getElementById('st-shiftPreview');
  if(!el) return;
  el.innerHTML = `
    🌅 <strong>Morning:</strong> ${sh.morningStart||'06:00'} – ${sh.morningEnd||'13:00'}<br>
    🌆 <strong>Evening:</strong> ${sh.eveningStart||'13:00'} – ${sh.eveningEnd||'20:00'}<br>
    🌙 <strong>Night:</strong> ${sh.nightStart||'20:00'} – ${sh.nightEnd||'24:00'}<br>
    🌐 <strong>Full Day:</strong> ${sh.morningStart||'06:00'} – ${sh.eveningEnd||'20:00'}<br><br>
    <span style="color:var(--ink3);font-size:12px">Note: Shift labels in member cards and modals will reflect saved timings.</span>`;
}

function saveShiftSettings(){
  loadAppSettings();
  appSettings.shifts = {
    morningStart: document.getElementById('st-morningStart').value || '06:00',
    morningEnd: document.getElementById('st-morningEnd').value || '13:00',
    eveningStart: document.getElementById('st-eveningStart').value || '13:00',
    eveningEnd: document.getElementById('st-eveningEnd').value || '20:00',
    nightStart: document.getElementById('st-nightStart')?.value || '20:00',
    nightEnd: document.getElementById('st-nightEnd')?.value || '24:00'
  };
  saveAppSettings();
  renderShiftPreview();
  toast('✅ Shift timings saved!','var(--blue)');
}

// ═══ CUSTOM SHIFTS ═══════════════════════════════════════════════════════════
function getCustomShifts(){
  loadAppSettings();
  return appSettings.customShifts || [];
}

function addCustomShift(){
  const name = (document.getElementById('cs-name').value||'').trim();
  const start = document.getElementById('cs-start').value;
  const end = document.getElementById('cs-end').value;
  const prefix = (document.getElementById('cs-prefix').value||'').trim().toUpperCase();
  if(!name){ toast('⚠️ Shift ka naam likho','var(--red)'); return; }
  if(!start||!end){ toast('⚠️ Start aur end time bharo','var(--red)'); return; }
  loadAppSettings();
  if(!appSettings.customShifts) appSettings.customShifts=[];
  if(appSettings.customShifts.find(s=>s.name.toLowerCase()===name.toLowerCase())){
    toast('⚠️ Yeh shift pehle se exist karta hai','var(--orange)'); return;
  }
  const id='cs_'+Date.now();
  appSettings.customShifts.push({id,name,start,end,prefix});
  saveAppSettings();
  document.getElementById('cs-name').value='';
  document.getElementById('cs-start').value='';
  document.getElementById('cs-end').value='';
  document.getElementById('cs-prefix').value='';
  renderCustomShiftList();
  populateAllShiftDropdowns();
  renderSeats(); // naye shift ka seat map bhi render karo
  toast('✅ Shift "'+name+'" add ho gaya!','var(--green)');
}

function deleteCustomShift(id){
  loadAppSettings();
  appSettings.customShifts=(appSettings.customShifts||[]).filter(s=>s.id!==id);
  saveAppSettings();
  renderCustomShiftList();
  populateAllShiftDropdowns();
  renderSeats(); // deleted shift ka seat map hatao
  toast('🗑️ Custom shift delete ho gaya','var(--orange)');
}

function renderCustomShiftList(){
  const el=document.getElementById('customShiftList');
  if(!el) return;
  loadAppSettings();
  const shifts=appSettings.customShifts||[];
  if(!shifts.length){
    el.innerHTML='<div style="color:var(--ink3);font-size:12px;text-align:center;padding:12px">Abhi koi custom shift nahi hai.</div>';
    return;
  }
  el.innerHTML=shifts.map(s=>`
    <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--bg3);border:1px solid var(--border);border-radius:10px;margin-bottom:8px">
      <div style="font-size:18px">⏰</div>
      <div style="flex:1">
        <div style="font-weight:800;font-size:13px;color:var(--ink)">${s.name}</div>
        <div style="font-size:11px;color:var(--ink3);margin-top:2px">${s.start} – ${s.end}${s.prefix?' · Prefix: <b>'+s.prefix+'</b>':''}</div>
      </div>
      <button class="btn btn-red btn-sm" onclick="deleteCustomShift('${s.id}')" style="padding:4px 10px">🗑️</button>
    </div>`).join('');
}

function populateAllShiftDropdowns(){
  const customShifts=getCustomShifts();
  ['am-shift','cf-shift','bs-shift'].forEach(selId=>{
    const el=document.getElementById(selId);
    if(!el) return;
    const cur=el.value;
    // Remove old custom options
    Array.from(el.options).forEach(opt=>{ if(opt.dataset.custom==='1') el.removeChild(opt); });
    // Add current custom shifts
    customShifts.forEach(s=>{
      const label=s.name+' ('+s.start+'–'+s.end+')';
      const opt=document.createElement('option');
      opt.value=label; opt.textContent=label; opt.dataset.custom='1';
      el.appendChild(opt);
    });
    // Restore previous value if still present
    if(Array.from(el.options).find(o=>o.value===cur)) el.value=cur;
  });

  // ── Plan dropdowns mein bhi custom plans add karo ──
  const defaultPlans = ['Half Day','Half Day + Reserved Seat','Full Day','Full Day + Reserved Seat'];
  ['am-plan','cf-plan','bs-plan'].forEach(selId=>{
    const el=document.getElementById(selId);
    if(!el) return;
    const cur=el.value;
    // Remove old custom plan options (jo default mein nahi hain)
    Array.from(el.options).forEach(opt=>{ if(opt.dataset.customPlan==='1') el.removeChild(opt); });
    // feeStructure ke saare plans check karo, jo default mein nahi woh add karo
    Object.keys(feeStructure||{}).forEach(planName=>{
      if(!defaultPlans.includes(planName)){
        const opt=document.createElement('option');
        opt.value=planName; opt.textContent=planName; opt.dataset.customPlan='1';
        el.appendChild(opt);
      }
    });
    // Restore previous value if still present
    if(Array.from(el.options).find(o=>o.value===cur)) el.value=cur;
  });
}

function changeAdminPassword(){
  loadAppSettings();
  const old = document.getElementById('st-oldPwd').value;
  const nw = document.getElementById('st-newPwd').value;
  const conf = document.getElementById('st-confirmPwd').value;
  const current = appSettings.adminPwd || 'anuj@2006';
  if(old !== current){ toast('❌ Current password galat hai!','var(--red)'); return; }
  if(nw.length < 6){ toast('⚠️ New password kam se kam 6 characters ka hona chahiye','var(--red)'); return; }
  if(nw !== conf){ toast('❌ Passwords match nahi kar rahe!','var(--red)'); return; }
  appSettings.adminPwd = nw;
  saveAppSettings();
  document.getElementById('st-oldPwd').value='';
  document.getElementById('st-newPwd').value='';
  document.getElementById('st-confirmPwd').value='';
  toast('✅ Admin password updated!','var(--green)');
}

// Override requireAdmin to use dynamic password
function requireAdmin(cb){
  loadAppSettings();
  const overlay = document.getElementById('adminOverlay');
  overlay.classList.add('open');
  document.getElementById('adminPwdInput').value='';
  document.getElementById('adminError').style.display='none';
  window._adminCallback = cb;
}
async function verifyAdmin(){
  loadAppSettings();
  const pwd = document.getElementById('adminPwdInput').value;
  const correct = appSettings.adminPwd || 'anuj@2006';
  if(pwd === correct){
    document.getElementById('adminOverlay').classList.remove('open');
    const cb = window._adminCallback;
    window._adminCallback = null;
    if(cb){ try { await cb(); } catch(e){ console.error('Admin callback error:',e); toast('❌ Error: '+e.message,'var(--red)'); } }
  } else {
    document.getElementById('adminError').style.display='block';
  }
}

// ═══ ADDITIONAL CHARGE TYPES ══════════════════════════════════════════════════
function addChargeType(){
  loadAppSettings();
  const name = document.getElementById('st-chargeName').value.trim();
  const amt = parseFloat(document.getElementById('st-chargeAmt').value)||0;
  const desc = document.getElementById('st-chargeDesc').value.trim();
  if(!name){ toast('⚠️ Charge name required','var(--red)'); return; }
  if(!appSettings.chargeTypes) appSettings.chargeTypes = [];
  appSettings.chargeTypes.push({id:'ct'+Date.now(), name, amount:amt, desc});
  saveAppSettings();
  document.getElementById('st-chargeName').value='';
  document.getElementById('st-chargeAmt').value='';
  document.getElementById('st-chargeDesc').value='';
  renderChargeTypeList();
  populateExtraChargeSelect();
  toast('✅ Charge type added!','var(--purple)');
}

function deleteChargeType(id){
  loadAppSettings();
  appSettings.chargeTypes = (appSettings.chargeTypes||[]).filter(c=>c.id!==id);
  saveAppSettings();
  renderChargeTypeList();
  populateExtraChargeSelect();
  toast('🗑️ Charge type deleted','var(--orange)');
}

function renderChargeTypeList(){
  loadAppSettings();
  const el = document.getElementById('st-chargeList');
  if(!el) return;
  const list = appSettings.chargeTypes || [];
  el.innerHTML = list.length ? list.map(c=>`
    <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="flex:1">
        <div style="font-weight:800;font-size:13px;color:var(--ink)">${c.name} <span style="color:var(--purple);font-weight:900">${fmtAmt(c.amount)}</span></div>
        ${c.desc?`<div style="font-size:11px;color:var(--ink3)">${c.desc}</div>`:''}
      </div>
      <button class="btn btn-red btn-sm btn-icon" onclick="deleteChargeType('${c.id}')" title="Delete">🗑️</button>
    </div>`).join('')
  : `<div style="color:var(--ink3);font-size:13px;text-align:center;padding:20px">No charge types added yet</div>`;
}

// ═══ MULTI EXTRA CHARGE HELPERS ═════════════════════════════════════════════
let _extraChargeCounter = 0;

function getChargeTypeOptions(){
  loadAppSettings();
  const list = appSettings.chargeTypes || [];
  return '<option value="">— Select Charge —</option><option value="custom">📝 Custom / Manual</option>'
    + list.map(c=>`<option value="${c.id}" data-amt="${c.amount}">${c.name} (${fmtAmt(c.amount)})</option>`).join('');
}

function addExtraChargeRow(){
  const container = document.getElementById('cf-extraRows');
  const emptyMsg  = document.getElementById('cf-extraEmpty');
  if(!container) return;
  if(emptyMsg) emptyMsg.style.display='none';

  _extraChargeCounter++;
  const id = _extraChargeCounter;
  const row = document.createElement('div');
  row.id = `ecr-${id}`;
  row.style.cssText = 'background:var(--bg3);border:1px solid var(--border2);border-radius:9px;padding:10px 12px;margin-bottom:8px;position:relative';
  row.innerHTML = `
    <button type="button" onclick="removeExtraChargeRow(${id})" title="Remove"
      style="position:absolute;top:6px;right:8px;background:transparent;border:none;color:var(--red);font-size:16px;cursor:pointer;line-height:1">✕</button>
    <div class="fgrid" style="gap:8px;margin-bottom:6px">
      <div class="frow"><label style="font-size:11px">Charge Type</label>
        <select id="ect-${id}" onchange="ecrFillAmt(${id})">${getChargeTypeOptions()}</select>
      </div>
      <div class="frow"><label style="font-size:11px">Amount (₹)</label>
        <input id="eca-${id}" type="number" min="0" placeholder="e.g. 100" oninput="calcFee()"/>
      </div>
    </div>
    <div class="frow"><label style="font-size:11px">Reason / Note</label>
      <input id="ecn-${id}" placeholder="e.g. Late fee, Locker charge..." oninput="calcFee()"/>
    </div>`;
  container.appendChild(row);
  calcFee();
}

function removeExtraChargeRow(id){
  const row = document.getElementById(`ecr-${id}`);
  if(row) row.remove();
  const container = document.getElementById('cf-extraRows');
  const emptyMsg  = document.getElementById('cf-extraEmpty');
  if(emptyMsg && container && container.children.length===0) emptyMsg.style.display='block';
  calcFee();
}

function ecrFillAmt(id){
  const sel = document.getElementById(`ect-${id}`);
  if(!sel) return;
  const opt = sel.selectedOptions[0];
  const amt = opt?.dataset?.amt;
  const amtEl = document.getElementById(`eca-${id}`);
  if(!amtEl) return;
  if(amt && sel.value !== 'custom'){
    amtEl.value = amt;
  } else if(sel.value === 'custom'){
    amtEl.value = '';
    amtEl.focus();
  }
  calcFee();
}

function getExtraChargeRows(){
  const container = document.getElementById('cf-extraRows');
  if(!container) return [];
  const result = [];
  container.querySelectorAll('[id^="ecr-"]').forEach(row=>{
    const id = row.id.replace('ecr-','');
    const amt = parseFloat(document.getElementById(`eca-${id}`)?.value)||0;
    const note = document.getElementById(`ecn-${id}`)?.value.trim() || 'Additional Charge';
    result.push({amount:amt, note});
  });
  return result;
}

function resetExtraChargeRows(){
  const container = document.getElementById('cf-extraRows');
  if(container) container.innerHTML='';
  const emptyMsg = document.getElementById('cf-extraEmpty');
  if(emptyMsg) emptyMsg.style.display='block';
  _extraChargeCounter = 0;
}

// Fill charge types in Collect Fee modal dropdown (legacy - keep for settings page)
function populateExtraChargeSelect(){
  loadAppSettings();
  const sel = document.getElementById('cf-extraType');
  if(!sel) return;
  const list = appSettings.chargeTypes || [];
  sel.innerHTML = '<option value="">— Select Charge —</option><option value="custom">📝 Custom / Manual</option>'
    + list.map(c=>`<option value="${c.id}" data-amt="${c.amount}">${c.name} (${fmtAmt(c.amount)})</option>`).join('');
}

function fillExtraAmt(){
  const sel = document.getElementById('cf-extraType');
  if(!sel) return;
  const opt = sel.selectedOptions[0];
  const amt = opt?.dataset?.amt;
  if(amt && sel.value !== 'custom'){
    document.getElementById('cf-extraAmt').value = amt;
  } else if(sel.value === 'custom'){
    document.getElementById('cf-extraAmt').value = '';
    document.getElementById('cf-extraAmt')?.focus();
  }
  calcFee();
}

function toggleExtraCharge(){
  // Legacy - no longer used but kept for safety
}

// ═══ PLAN → SHIFT FILTER FUNCTIONS ══════════════════════════════════════════
// Full Day plan select hone pe Half Day options hide karo, aur vice versa

function filterAmShift(planVal){
  const shiftSel = document.getElementById('am-shift');
  if(!shiftSel) return;
  const isFullDay = planVal.toLowerCase().includes('full');
  Array.from(shiftSel.options).forEach(opt=>{
    const isMorningEvening = opt.value.includes('Morning') || opt.value.includes('Evening');
    const isFullDayOpt = opt.value.includes('Full Day') && !opt.dataset.custom;
    const isCustom = opt.dataset.custom === '1';
    if(isFullDay){
      // Full Day plan: only Full Day shift
      opt.hidden = isMorningEvening || isCustom;
      opt.disabled = isMorningEvening || isCustom;
    } else {
      // Half Day plan: Morning, Evening, custom shifts; Full Day hidden
      opt.hidden = isFullDayOpt;
      opt.disabled = isFullDayOpt;
    }
  });
  // Auto-select valid option
  const visibleOpts = Array.from(shiftSel.options).filter(o=>!o.hidden);
  if(visibleOpts.length && shiftSel.options[shiftSel.selectedIndex]?.hidden){
    shiftSel.value = visibleOpts[0].value;
  }
}

function filterCfShift(planVal){
  // ✅ Custom/Manual plan: manual section dikhao, standard category/shift hide karo
  const isManual = planVal === 'Custom / Manual';
  const manualSec = document.getElementById('cf-manualSection');
  const categoryRow = document.getElementById('cf-category')?.closest('.frow');
  const shiftRow = document.getElementById('cf-shift')?.closest('.frow');
  if(manualSec) manualSec.style.display = isManual ? 'block' : 'none';
  if(categoryRow) categoryRow.style.display = isManual ? 'none' : '';
  if(shiftRow) shiftRow.style.display = isManual ? 'none' : '';
  if(isManual){ calcFee(); return; }

  const shiftSel = document.getElementById('cf-shift');
  if(!shiftSel) return;
  const isFullDay = planVal.toLowerCase().includes('full');
  Array.from(shiftSel.options).forEach(opt=>{
    const isMorningEvening = opt.value==='Morning' || opt.value==='Evening';
    const isFullDayOpt = opt.value==='Full Day' && !opt.dataset.custom;
    const isCustom = opt.dataset.custom === '1';
    if(isFullDay){
      opt.hidden = isMorningEvening || isCustom;
      opt.disabled = isMorningEvening || isCustom;
    } else {
      opt.hidden = isFullDayOpt;
      opt.disabled = isFullDayOpt;
    }
  });
  // Auto-select valid option
  const visibleOpts = Array.from(shiftSel.options).filter(o=>!o.hidden);
  if(visibleOpts.length && shiftSel.options[shiftSel.selectedIndex]?.hidden){
    shiftSel.value = visibleOpts[0].value;
  }
  calcFee();
}

// ═══════════════════════════════════════════════════════════════════════════════
// Init
// ═══════════════════════════════════════════════════════════════════════════════

// ═══ AUTO EXPIRY ALERTS ════════════════════════════════════════════════════════
function checkAndSendExpiryAlerts(){
  const today = todayStr();
  const alertKey = 'stdlib_expiry_alert_' + today;
  // Agar aaj already alert bhej chuke hain to skip karo
  if(localStorage.getItem(alertKey)) return;

  // 0 ya 1 din bacha ho unhe dhundho
  const urgent = members.filter(m=>{
    if(!m.to || !m.phone) return false;
    const days = Math.ceil((new Date(m.to) - new Date(today)) / 86400000);
    return days >= 0 && days <= 1;
  });

  if(!urgent.length) return;

  // Dashboard pe alert card dikhao
  const el = document.getElementById('expiryWarnings');
  // Notification toast dikhao with manual send option
  setTimeout(()=>{
    toast(`🚨 ${urgent.length} member(s) ki membership kal/aaj expire ho rahi hai! Dashboard check karein.`, 'var(--red)');
  }, 1500);

  // Auto-open WhatsApp links (ek ke baad ek, 1.5 second gap)
  // Sirf agar user ne permission di ho (confirm box)
  setTimeout(()=>{
    if(urgent.length > 0){
      const names = urgent.map(m=>m.name).join(', ');
      const shouldSend = confirm(
        `🚨 ${urgent.length} member(s) ki membership aaj/kal expire ho rahi hai:\n${names}\n\nKya WhatsApp reminder bhejein? (Automatically opens)`
      );
      if(shouldSend){
        urgent.forEach((m, i) => {
          setTimeout(() => {
            sendWA(m.id, 'due', false);
            if(m.gphone && m.gphone !== m.phone){
              setTimeout(() => sendWA(m.id, 'due', true), 600);
            }
          }, i * 1800);
        });
        localStorage.setItem(alertKey, '1');
        toast(`📲 ${urgent.length} expiry alerts bheje ja rahe hain...`, 'var(--wa)');
      } else {
        // User ne decline kiya — phir bhi aaj ke liye mark karo
        localStorage.setItem(alertKey, 'skipped');
      }
    }
  }, 2500);
}

// ═══ LOCKERS ══════════════════════════════════════════════════════════════════
// lockerAssignments stored in appSettings.lockerData = [{no, memberId, memberName, from, to, fee, notes}]

function getLockerData(){
  loadAppSettings();
  return appSettings.lockerData || [];
}

function saveLockerData(data){
  loadAppSettings();
  appSettings.lockerData = data;
  saveAppSettings();
}

function saveLockerCount(){
  const v = parseInt(document.getElementById('locker-total-inp')?.value||'0');
  if(!v||v<1||v>200){ toast('⚠️ 1–200 ke beech valid count daalen','var(--red)'); return; }
  loadAppSettings();
  appSettings.lockers = { total: v };
  saveAppSettings();
  renderLockers();
  toast(`✅ Locker count set to ${v}`,'var(--teal)');
}

function renderLockers(){
  loadAppSettings();
  const total = (appSettings.lockers||{}).total || 20;
  const data = getLockerData();
  const today = todayStr();

  // Update count input
  const inp = document.getElementById('locker-total-inp');
  if(inp) inp.value = total;

  // Badge
  const occupied = data.length;
  const badge = document.getElementById('locker-summary-badge');
  if(badge) badge.textContent = `${total-occupied} Free · ${occupied} Assigned`;

  // Grid
  const gridEl = document.getElementById('lockerGrid');
  if(gridEl){
    let html = '';
    loadAppSettings();
    const zoneRedMax = (appSettings.seats||{}).zoneRed || 50;
    for(let i=1;i<=total;i++){
      const asgn = data.find(x=>x.no===i);
      const zone = i <= zoneRedMax ? 'red' : 'blue';
      let cls = '', tip = '', dotStyle = '';
      if(asgn){
        const expired = asgn.to && toISO(asgn.to) < today;
        if(expired){
          cls = 'occupied'; dotStyle = 'background:var(--orangel);border-color:var(--orange);color:var(--orange)';
          tip = `<div class="seat-tooltip">${asgn.memberName}<br>EXPIRED</div>`;
        } else {
          cls = 'occupied'; dotStyle = 'background:#1a0a0a;border-color:#4a1a1a;color:var(--red)';
          tip = `<div class="seat-tooltip">${asgn.memberName}<br>Till ${fmtDate(asgn.to)}</div>`;
        }
      } else {
        dotStyle = zone==='red'
          ? 'background:var(--redl);border-color:var(--red);color:var(--red)'
          : 'background:var(--bluel);border-color:var(--blue);color:var(--blue)';
        tip = `<div class="seat-tooltip">${zone==='red'?'🔴':'🔵'} Locker ${i} — Free</div>`;
      }
      html += `<div class="seat" style="position:relative;${dotStyle};aspect-ratio:1;border-radius:9px;border:2px solid;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:10px;font-weight:800;transition:.15s" onclick="clickLocker(${i})">${tip}<span>🔐</span><span style="font-size:9px">${i}</span></div>`;
    }
    gridEl.innerHTML = html;
  }

  // Holders list
  const holdersEl = document.getElementById('lockerHolders');
  if(holdersEl){
    if(!data.length){
      holdersEl.innerHTML = '<div style="color:var(--ink3);text-align:center;padding:16px;font-size:13px">Koi locker assign nahi hai</div>';
    } else {
      holdersEl.innerHTML = data.map(a=>{
        const expired = a.to && toISO(a.to) < today;
        const m = members.find(x=>x.id===a.memberId);
        return `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);font-size:12.5px">
          <div style="width:32px;height:32px;border-radius:8px;background:var(--teall);border:2px solid var(--teal);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0">🔐</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:800">Locker ${a.no} — ${a.memberName}</div>
            <div style="color:var(--ink3);font-size:11px">📅 ${fmtDate(a.from)} → ${fmtDate(a.to)} · 💰 ₹${a.fee||0}/mo ${a.notes?'· '+a.notes:''}</div>
            ${expired?`<div style="color:var(--orange);font-size:11px;font-weight:800">⚠️ EXPIRED</div>`:''}
          </div>
          <div style="display:flex;gap:5px;flex-shrink:0">
            <button class="btn btn-ghost btn-sm" onclick="openAssignLocker(${a.no})">✏️</button>
            <button class="btn btn-red btn-sm" onclick="releaseLocker(${a.no})">✕</button>
          </div>
        </div>`;
      }).join('');
    }
  }
}

function clickLocker(no){
  const data = getLockerData();
  const asgn = data.find(x=>x.no===no);
  if(asgn){
    // Show popup
    const today = todayStr();
    const expired = asgn.to && toISO(asgn.to) < today;
    const existing = document.getElementById('locker-detail-popup');
    if(existing) existing.remove();
    const popup = document.createElement('div');
    popup.id = 'locker-detail-popup';
    popup.style.cssText = 'position:fixed;inset:0;background:#00000090;z-index:400;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .2s;';
    const m = members.find(x=>x.id===asgn.memberId);
    popup.innerHTML = `
      <div style="background:var(--card);border:2px solid var(--teal);border-radius:18px;padding:24px;width:100%;max-width:380px;box-shadow:var(--shadow2);animation:fadeUp .3s ease">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:var(--ink)">🔐 Locker ${no}</div>
          <button onclick="document.getElementById('locker-detail-popup').remove()" style="background:var(--bg3);border:1px solid var(--border2);color:var(--ink);width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:16px">✕</button>
        </div>
        ${expired?`<div style="font-size:11px;font-weight:800;color:var(--orange);padding:5px 12px;background:var(--orangel);border-radius:8px;margin-bottom:10px;border:1px solid var(--orange)">⚠️ Locker expired — Please renew</div>`:''}
        <div style="background:var(--bg3);border:1px solid var(--border);border-radius:12px;padding:14px">
          <div style="font-weight:900;font-size:15px;color:var(--ink)">${asgn.memberName}</div>
          <div style="font-size:12px;color:var(--ink3);margin-top:4px">${asgn.memberId} · ${m?.phone||'—'}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:10px;font-size:12px">
            <div>📅 From: <b>${fmtDate(asgn.from)}</b></div>
            <div>📅 Till: <b style="color:${expired?'var(--orange)':'var(--ink)'}">${fmtDate(asgn.to)}</b></div>
            <div>💰 Fee: <b>₹${asgn.fee||0}/month</b></div>
            ${asgn.notes?`<div>📝 ${asgn.notes}</div>`:''}
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn btn-teal btn-sm" style="flex:1;justify-content:center" onclick="document.getElementById('locker-detail-popup').remove();openLockerFeePayment(${no})">💰 Fee</button>
          <button class="btn btn-ghost btn-sm" style="flex:1;justify-content:center" onclick="document.getElementById('locker-detail-popup').remove();openAssignLocker(${no})">✏️ Edit</button>
          <button class="btn btn-red btn-sm" style="flex:1;justify-content:center" onclick="document.getElementById('locker-detail-popup').remove();releaseLocker(${no})">🔓 Release</button>
          <button class="btn btn-ghost btn-sm" style="justify-content:center" onclick="document.getElementById('locker-detail-popup').remove()">✕</button>
        </div>
      </div>`;
    popup.addEventListener('click', e=>{ if(e.target===popup) popup.remove(); });
    document.body.appendChild(popup);
  } else {
    openAssignLocker(no);
  }
}

function openAssignLocker(no){
  // Populate member dropdown
  const sel = document.getElementById('al-member');
  if(sel) sel.innerHTML = '<option value="">— Select Member —</option>' + members.map(m=>`<option value="${m.id}">${m.id} — ${m.name}</option>`).join('');

  // Pre-fill locker number if provided
  const noEl = document.getElementById('al-lockerNoDisp');
  const hidEl = document.getElementById('al-lockerNo');
  if(no && noEl){ noEl.value = no; }
  if(no && hidEl){ hidEl.value = no; }

  // Pre-fill from existing assignment
  const data = getLockerData();
  const asgn = no ? data.find(x=>x.no===no) : null;
  if(asgn){
    if(sel) sel.value = asgn.memberId;
    const fromEl = document.getElementById('al-from');
    const toEl = document.getElementById('al-to');
    const feeEl = document.getElementById('al-fee');
    const notesEl = document.getElementById('al-notes');
    if(fromEl) fromEl.value = asgn.from||'';
    if(toEl) toEl.value = asgn.to||'';
    if(feeEl) feeEl.value = asgn.fee||'';
    if(notesEl) notesEl.value = asgn.notes||'';
  } else {
    const d2 = new Date(); d2.setMonth(d2.getMonth()+1);
    const fromEl = document.getElementById('al-from');
    const toEl = document.getElementById('al-to');
    if(fromEl) fromEl.value = todayStr();
    if(toEl) toEl.value = d2.toISOString().slice(0,10);
    const feeEl = document.getElementById('al-fee');
    if(feeEl) feeEl.value = '100';
    const notesEl = document.getElementById('al-notes');
    if(notesEl) notesEl.value = '';
  }
  openModal('modal-assignLocker');
}

async function confirmAssignLocker(){
  const no = parseInt(document.getElementById('al-lockerNo')?.value||document.getElementById('al-lockerNoDisp')?.value||'0');
  const mId = val('al-member');
  const fromVal = val('al-from');
  const toVal = val('al-to');
  const feeVal = parseFloat(val('al-fee'))||0;
  const notesVal = val('al-notes');

  if(!no||no<1){ toast('⚠️ Valid locker number daalen','var(--red)'); return; }
  if(!mId){ toast('⚠️ Member select karein','var(--red)'); return; }
  if(!fromVal||!toVal){ toast('⚠️ Dates select karein','var(--red)'); return; }

  loadAppSettings();
  const total = (appSettings.lockers||{}).total||20;
  if(no>total){ toast(`⚠️ Locker ${no} exist nahi karta (max ${total})`,'var(--red)'); return; }

  const member = members.find(m=>m.id===mId);
  if(!member){ toast('⚠️ Member nahi mila','var(--red)'); return; }

  // Check conflict
  let data = getLockerData();
  const existing = data.find(x=>x.no===no);
  if(existing && existing.memberId!==mId){
    toast(`⚠️ Locker ${no} already ${existing.memberName} ko assign hai`,'var(--red)');
    return;
  }

  const lockerPayload = { no, memberId:mId, memberName:member.name, from:fromVal, to:toVal, fee:feeVal, notes:notesVal };

  // Server pe save karo (AR_API.saveLocker fallback to localStorage)
  try {
    await AR_API.saveLocker(lockerPayload);
  } catch(e) { console.warn('Locker save error:', e.message); }

  // Local state bhi update karo
  data = data.filter(x=>x.no!==no);
  data.push(lockerPayload);
  saveLockerData(data);

  closeModal('modal-assignLocker');
  renderLockers();
  toast(`✅ Locker ${no} assigned to ${member.name}!`,'var(--teal)');
}

async function releaseLocker(no){
  if(!confirm(`Locker ${no} release karna chahte hain?`)) return;

  // Server se bhi delete karo
  try { await AR_API.releaseLocker(no); } catch(e) { console.warn('Locker release error:', e.message); }

  let data = getLockerData();
  data = data.filter(x=>x.no!==no);
  saveLockerData(data);
  renderLockers();
  toast(`🔓 Locker ${no} released`,'var(--orange)');
}


// ═══ ENQUIRY ══════════════════════════════════════════════════════════════════
const ENQ_KEY = 'stdlib_enquiries';

function getEnquiries(){
  try{ return JSON.parse(localStorage.getItem(ENQ_KEY)||'[]'); }catch(_){ return []; }
}
function saveEnquiries(arr){
  try{ localStorage.setItem(ENQ_KEY, JSON.stringify(arr)); }catch(_){}
}

function openAddEnquiry(){
  document.getElementById('enqModalTitle').textContent = '📝 New Enquiry';
  document.getElementById('enq-editId').value = '';
  document.getElementById('enq-name').value = '';
  document.getElementById('enq-phone').value = '';
  document.getElementById('enq-address').value = '';
  document.getElementById('enq-shift').value = '';
  document.getElementById('enq-class').value = '';
  document.getElementById('enq-date').value = todayStr();
  document.getElementById('enq-status').value = 'Pending';
  document.getElementById('enq-notes').value = '';
  openModal('modal-addEnquiry');
}

function openEditEnquiry(id){
  const list = getEnquiries();
  const e = list.find(x=>x.id===id);
  if(!e) return;
  document.getElementById('enqModalTitle').textContent = '✏️ Edit Enquiry';
  document.getElementById('enq-editId').value = e.id;
  document.getElementById('enq-name').value = e.name||'';
  document.getElementById('enq-phone').value = e.phone||'';
  document.getElementById('enq-address').value = e.address||'';
  document.getElementById('enq-shift').value = e.shift||'';
  document.getElementById('enq-class').value = e.cls||'';
  document.getElementById('enq-date').value = e.date||todayStr();
  document.getElementById('enq-status').value = e.status||'Pending';
  document.getElementById('enq-notes').value = e.notes||'';
  openModal('modal-addEnquiry');
}

async function saveEnquiry(){
  const name = (document.getElementById('enq-name').value||'').trim();
  const phone = (document.getElementById('enq-phone').value||'').trim();
  const address = (document.getElementById('enq-address').value||'').trim();
  if(!name){ toast('⚠️ Name zaroori hai','var(--red)'); return; }
  if(!phone){ toast('⚠️ Phone number zaroori hai','var(--red)'); return; }
  if(!address){ toast('⚠️ Address zaroori hai','var(--red)'); return; }

  const editId = document.getElementById('enq-editId').value;
  const enqData = {
    id: editId || ('ENQ-' + Date.now()),
    name, phone, address,
    shift: document.getElementById('enq-shift').value,
    cls: document.getElementById('enq-class').value,
    date: document.getElementById('enq-date').value||todayStr(),
    status: document.getElementById('enq-status').value,
    notes: document.getElementById('enq-notes').value,
    createdAt: editId ? undefined : Date.now()
  };

  try {
    if(editId){
      await AR_API.updateEnquiry(editId, enqData);
      toast('✅ Enquiry updated!','var(--green)');
    } else {
      await AR_API.addEnquiry(enqData);
      toast('✅ Enquiry add ho gayi!','var(--teal)');
    }
  } catch(e){
    toast('⚠️ Saved locally: '+e.message,'var(--orange)');
  }

  closeModal('modal-addEnquiry');
  renderEnquiry();
}

async function deleteEnquiry(id){
  if(!confirm('Is enquiry ko delete karna chahte hain?')) return;
  try {
    await AR_API.deleteEnquiry(id);
  } catch(e) { console.warn('Enquiry delete error:', e.message); }
  // LocalStorage se bhi remove karo
  let list = getEnquiries();
  list = list.filter(x=>x.id!==id);
  saveEnquiries(list);
  renderEnquiry();
  toast('🗑️ Enquiry deleted','var(--red)');
}

function updateEnquiryStatus(id, status){
  let list = getEnquiries();
  const idx = list.findIndex(x=>x.id===id);
  if(idx>-1) list[idx].status = status;
  saveEnquiries(list);
  renderEnquiry();
  toast(`Status updated: ${status}`,'var(--blue)');
}

async function renderEnquiry(){
  // Server se latest data load karo
  let list = [];
  try {
    list = await AR_API.getEnquiries();
    // LocalStorage bhi sync karo
    saveEnquiries(list);
  } catch(e) {
    // Fallback localStorage
    list = getEnquiries();
  }
  const q = (document.getElementById('enqSearch')?.value||'').toLowerCase();
  const sf = document.getElementById('enqStatusFil')?.value||'';
  const shf = document.getElementById('enqShiftFil')?.value||'';

  let filtered = list.filter(e=>{
    if(q && !e.name.toLowerCase().includes(q) && !(e.phone||'').includes(q) && !(e.address||'').toLowerCase().includes(q)) return false;
    if(sf && e.status!==sf) return false;
    if(shf && e.shift!==shf) return false;
    return true;
  });

  // Stats
  const total = list.length;
  const pending = list.filter(e=>e.status==='Pending').length;
  const joined = list.filter(e=>e.status==='Joined').length;
  const notInt = list.filter(e=>e.status==='Not Interested').length;
  const statsEl = document.getElementById('enquiryStats');
  if(statsEl) statsEl.innerHTML = [
    {icon:'📝',val:total,label:'Total Enquiries',c:'var(--blue)'},
    {icon:'🟡',val:pending,label:'Pending',c:'var(--yellow)'},
    {icon:'🟢',val:joined,label:'Joined',c:'var(--green)'},
    {icon:'🔴',val:notInt,label:'Not Interested',c:'var(--red)'},
  ].map(s=>`<div class="scard"><div class="scard-accent" style="background:${s.c}"></div><div class="scard-icon">${s.icon}</div><div class="scard-val" style="color:${s.c}">${s.val}</div><div class="scard-label">${s.label}</div></div>`).join('');

  const statusBadge = {
    'Pending': 'b-yellow', 'Joined': 'b-green',
    'Not Interested': 'b-red', 'Follow Up': 'b-blue'
  };
  const statusEmoji = {
    'Pending':'🟡','Joined':'🟢','Not Interested':'🔴','Follow Up':'🔵'
  };

  const tbody = document.getElementById('enquiryTable');
  if(!tbody) return;

  if(!filtered.length){
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty"><div class="empty-icon">📝</div><h3>Koi enquiry nahi mili</h3><p style="color:var(--ink3);font-size:13px;margin-top:8px">Naya enquiry add karne ke liye "+ Add Enquiry" click karein</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((e,i)=>{
    const badge = statusBadge[e.status]||'b-blue';
    const emoji = statusEmoji[e.status]||'🔵';
    const waMsg = encodeURIComponent(`Namaste *${e.name}* ji! 🙏\n\nYugvandana Library mein aapki enquiry ke liye dhanyavaad. Aapko library join karne mein kisi bhi prakar ki sahayata chahiye to hume zaroor batayein.\n\n📍 Yugvandana Library — Silent Study Zone\n📞 83498 52152`);
    return `<tr>
      <td style="font-weight:800;color:var(--ink3);font-size:12px">${i+1}</td>
      <td>
        <div style="font-weight:800;font-size:13px">${e.name}</div>
        ${e.cls ? `<div style="font-size:11px;color:var(--teal);font-weight:700">${e.cls}</div>` : ''}
      </td>
      <td>
        <div style="font-weight:700">${e.phone||'—'}</div>
        <a href="https://wa.me/${(e.phone||'').replace(/\D/g,'')}?text=${waMsg}" target="_blank" style="font-size:10px;color:var(--wa);text-decoration:none;font-weight:700">📲 WhatsApp</a>
      </td>
      <td style="max-width:160px;word-wrap:break-word;font-size:12.5px">${e.address||'—'}</td>
      <td>${e.shift ? `<span class="badge b-blue">${e.shift}</span>` : '<span style="color:var(--ink3)">—</span>'}</td>
      <td style="font-size:12px;color:var(--ink3)">${fmtDate(e.date)||'—'}</td>
      <td>
        <select style="font-size:11.5px;padding:4px 8px;border:1.5px solid var(--border);border-radius:8px;background:var(--card2);color:var(--ink);font-weight:700;cursor:pointer" onchange="updateEnquiryStatus('${e.id}',this.value)">
          <option ${e.status==='Pending'?'selected':''}>Pending</option>
          <option ${e.status==='Follow Up'?'selected':''}>Follow Up</option>
          <option ${e.status==='Joined'?'selected':''}>Joined</option>
          <option ${e.status==='Not Interested'?'selected':''}>Not Interested</option>
        </select>
      </td>
      <td style="font-size:12px;color:var(--ink2);max-width:140px;word-wrap:break-word">${e.notes||'—'}</td>
      <td>
        <div style="display:flex;gap:5px;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm btn-icon" onclick="openEditEnquiry('${e.id}')" title="Edit">✏️</button>
          <button class="btn btn-red btn-sm btn-icon" onclick="deleteEnquiry('${e.id}')" title="Delete">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function exportEnquiryExcel(){
  if(typeof XLSX==='undefined'){ toast('⚠️ XLSX library not loaded','var(--red)'); return; }
  const list = getEnquiries();
  if(!list.length){ toast('⚠️ Koi enquiry nahi hai export karne ke liye','var(--orange)'); return; }
  const ws = XLSX.utils.json_to_sheet(list.map((e,i)=>({
    'S.No': i+1,
    'Name': e.name,
    'Phone': e.phone,
    'Address': e.address,
    'Shift Interest': e.shift||'',
    'Class/Course': e.cls||'',
    'Enquiry Date': e.date,
    'Status': e.status,
    'Notes': e.notes||''
  })));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Enquiries');
  const date = new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}).replace(/ /g,'-');
  XLSX.writeFile(wb, `ARLibrary_Enquiries_${date}.xlsx`);
  toast('📊 Enquiry Excel downloaded!','var(--green)');
}


// ═══ BIRTHDAY SECTION ════════════════════════════════════════════════════════
function renderBirthdaySection(){
  const el = document.getElementById('birthdayList');
  const countEl = document.getElementById('birthday-count');
  if(!el) return;

  // IST today — timezone-safe (UTC+5:30 offset fix)
  const istTodayStr = new Date().toLocaleDateString('en-CA', {timeZone:'Asia/Kolkata'});
  const [istY, istM, istD] = istTodayStr.split('-').map(Number);
  // Pure UTC comparison to avoid local timezone DST issues
  const todayUTC = Date.UTC(istY, istM - 1, istD);

  const upcoming = [];
  members.forEach(m=>{
    if(!m.dob || m.dob.length<10) return;
    const dobISO = toISO(m.dob);
    if(!dobISO || dobISO.length < 10) return;
    // ✅ Direct string parse — koi Date object nahi, timezone issue zero
    const dobParts = dobISO.slice(0,10).split('-').map(Number); // [YYYY, MM, DD]
    const dobYearOrig = dobParts[0];
    const dobM = dobParts[1] - 1; // 0-indexed for Date.UTC
    const dobD = dobParts[2];
    if(!dobYearOrig || !dobM && dobM!==0 || !dobD) return;
    // This year birthday (UTC midnight)
    let bdayY = istY;
    let bdayUTC = Date.UTC(bdayY, dobM, dobD);
    // Agar is saal ka already guzar gaya (strictly < today) toh next year
    if(bdayUTC < todayUTC) { bdayY = istY + 1; bdayUTC = Date.UTC(bdayY, dobM, dobD); }
    const diffDays = Math.round((bdayUTC - todayUTC) / 86400000);
    if(diffDays <= 7){
      const age = bdayY - dobYearOrig;
      upcoming.push({...m, diffDays, age});
    }
  });
  upcoming.sort((a,b)=>a.diffDays-b.diffDays);

  if(countEl) countEl.textContent = upcoming.length;
  const card = document.getElementById('birthdayCard');
  if(card) card.style.display = upcoming.length ? '' : 'none';
  if(!upcoming.length){ el.innerHTML='<div style="color:var(--ink3);text-align:center;padding:20px;font-size:13px">🎂 Koi upcoming birthday nahi (next 7 days)</div>'; return; }

  el.innerHTML = upcoming.map(m=>{
    const label = m.diffDays===0 ? '🎉 Aaj!' : m.diffDays===1 ? '⏰ Kal' : `${m.diffDays} din mein`;
    const waMsg = encodeURIComponent(`🎂 *Happy Birthday ${m.name} ji!* 🎉\n\nYugvandana Library ki taraf se aapko janamdin ki bahut bahut badhaai! 🎊\n\nIshwar aapko lambi ayu, achha swasthya aur safalta de. 🙏\n\n📚 Yugvandana Library — Your Study Partner\n📞 83498 52152`);
    return `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="width:36px;height:36px;border-radius:9px;background:${m.color||'var(--teal)'};display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:16px;flex-shrink:0">🎂</div>
      <div style="flex:1">
        <div style="font-weight:800;font-size:13px">${m.name}</div>
        <div style="font-size:11px;color:var(--ink3)">${fmtDate(m.dob)} · ${m.age} saal · <span style="color:var(--yellow);font-weight:800">${label}</span></div>
      </div>
      <a href="https://wa.me/${(m.phone||'').replace(/\D/g,'')}?text=${waMsg}" target="_blank" class="btn btn-wa btn-sm" title="Birthday Wish Bhejo">🎉 Wish</a>
    </div>`;
  }).join('');
}

// ═══ MEMBER TABS ══════════════════════════════════════════════════════════════
function setMemberTab(tab, btn){
  document.getElementById('member-tab-list').style.display = tab==='list' ? '' : 'none';
  document.getElementById('member-tab-birthday').style.display = tab==='birthday' ? '' : 'none';
  document.querySelectorAll('#mtab-list, #mtab-birthday').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  if(tab==='birthday') renderBirthdayTab();
}

function renderBirthdayTab(){
  const el = document.getElementById('birthdayTabList');
  const summaryEl = document.getElementById('bdSummary');
  if(!el) return;

  const q = (document.getElementById('bdsearch')?.value||'').toLowerCase().trim();
  const monthFil = document.getElementById('bdmonthFil')?.value||'';
  const sortFil = document.getElementById('bdsortFil')?.value||'upcoming';

  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  // Sabhi members jo dob rakhte hain
  let list = members.filter(m=>m.dob && m.dob.length>=10).map(m=>{
    const dobISO = toISO(m.dob);
    const dob = new Date(dobISO+'T00:00:00');
    if(isNaN(dob)) return null;
    const bday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
    if(bday < todayMidnight) bday.setFullYear(now.getFullYear()+1);
    const diffDays = Math.round((bday - todayMidnight) / 86400000);
    const age = bday.getFullYear() - dob.getFullYear();
    const dobMonth = String(dob.getMonth()+1).padStart(2,'0');
    return {...m, dob, dobISO, diffDays, age, dobMonth, dobDay: dob.getDate(), dobMonthName: MONTH_NAMES[dob.getMonth()]};
  }).filter(Boolean);

  // Search filter
  if(q) list = list.filter(m=>(m.name||'').toLowerCase().includes(q)||(m.phone||'').toLowerCase().includes(q));
  // Month filter
  if(monthFil) list = list.filter(m=>m.dobMonth===monthFil);

  // Sort
  if(sortFil==='upcoming') list.sort((a,b)=>a.diffDays-b.diffDays);
  else if(sortFil==='date') list.sort((a,b)=>a.dobMonth!==b.dobMonth ? a.dobMonth.localeCompare(b.dobMonth) : a.dobDay-b.dobDay);
  else if(sortFil==='name') list.sort((a,b)=>(a.name||'').localeCompare(b.name||''));

  const noDobCount = members.filter(m=>!m.dob||m.dob.length<10).length;
  if(summaryEl) summaryEl.textContent = `${list.length} member${list.length!==1?'s':''} ${monthFil?'in '+MONTH_NAMES[parseInt(monthFil)-1]:'with birthday'} · ${noDobCount} members ka DOB nahi hai`;

  if(!list.length){
    el.innerHTML=`<div class="empty"><div class="empty-icon">🎂</div><h3>Koi birthday nahi mila</h3><p>${monthFil?'Is month mein kisi ka birthday nahi':'Search se kuch nahi mila'}</p></div>`;
    return;
  }

  el.innerHTML = list.map(m=>{
    const isToday = m.diffDays===0;
    const isTomorrow = m.diffDays===1;
    const isThisWeek = m.diffDays<=7;
    const label = isToday ? '🎉 Aaj!' : isTomorrow ? '⏰ Kal' : isThisWeek ? `${m.diffDays} din mein` : `${m.diffDays} din baad`;
    const labelColor = isToday ? 'var(--green)' : isTomorrow ? 'var(--orange)' : isThisWeek ? 'var(--yellow)' : 'var(--ink3)';
    const cardBorder = isToday ? 'var(--green)' : isTomorrow ? 'var(--orange)' : 'var(--border)';
    const waMsg = encodeURIComponent(`🎂 *Happy Birthday ${m.name} ji!* 🎉\n\nYugvandana Library ki taraf se aapko janamdin ki bahut bahut badhaai! 🎊\n\nIshwar aapko lambi ayu, achha swasthya aur safalta de. 🙏\n\n📚 Yugvandana Library — Your Study Partner`);
    const dobDisplay = `${String(m.dobDay).padStart(2,'0')} ${m.dobMonthName}`;
    return `<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;border:1.5px solid ${cardBorder};margin-bottom:10px;background:var(--card2);${isToday?'box-shadow:0 0 0 3px var(--greenl)':''}">
      <div style="width:44px;height:44px;border-radius:50%;background:${m.color||'var(--teal)'};display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">${isToday?'🎂':'👤'}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:900;font-size:14px;color:var(--ink)">${m.name}</div>
        <div style="font-size:11px;color:var(--ink3);margin-top:2px">📅 ${dobDisplay} · 🎂 ${m.age} saal · ${m.shift||'—'} · Seat ${fmtSeat(m.seat)||'—'}</div>
        <div style="font-size:11px;margin-top:3px"><span style="color:${labelColor};font-weight:800">${label}</span>${m.phone?` · 📞 ${m.phone}`:''}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${m.phone?`<a href="https://wa.me/${(m.phone||'').replace(/\D/g,'')}?text=${waMsg}" target="_blank" class="btn btn-wa btn-sm" style="font-size:11px;padding:5px 10px">🎉 Wish</a>`:''}
      </div>
    </div>`;
  }).join('');
}

// ═══ EDIT FEE RECORD ══════════════════════════════════════════════════════════
function openEditFeeRecord(id){
  requireAdmin(()=>{
    const r = feeRecords.find(x=>x.id===id);
    if(!r){ toast('⚠️ Record not found','var(--red)'); return; }

    const el = document.getElementById('editFeeModal');
    if(el) el.remove();

    const modal = document.createElement('div');
    modal.className = 'overlay open';
    modal.id = 'editFeeModal';
    modal.innerHTML = `
    <div class="modal" style="max-width:420px">
      <h3>✏️ Edit Fee Record</h3>
      <input type="hidden" id="efr-id" value="${r.id}"/>
      <div class="frow"><label>Member</label><input value="${r.memberName}" disabled style="opacity:.6"/></div>
      <div class="fgrid">
        <div class="frow"><label>Amount (₹)</label><input type="number" id="efr-amount" value="${r.amount}"/></div>
        <div class="frow"><label>Payment Mode</label>
          <select id="efr-mode">
            <option ${r.mode==='Cash'?'selected':''}>Cash</option>
            <option ${r.mode==='UPI'?'selected':''}>UPI</option>
            <option ${r.mode==='Online'?'selected':''}>Online</option>
            <option ${r.mode==='Cheque'?'selected':''}>Cheque</option>
          </select>
        </div>
      </div>
      <div class="fgrid">
        <div class="frow"><label>Date</label><input type="date" id="efr-date" value="${r.date}"/></div>
        <div class="frow"><label>Month</label><input id="efr-month" value="${r.month}"/></div>
      </div>
      <div class="frow"><label>Status</label>
        <select id="efr-status">
          <option ${r.status==='Paid'?'selected':''}>Paid</option>
          <option ${r.status==='Partial'?'selected':''}>Partial</option>
        </select>
      </div>
      <div class="frow"><label>Notes</label><input id="efr-notes" value="${r.notes||''}"/></div>
      <div style="display:flex;gap:10px;margin-top:8px">
        <button class="btn btn-blue" style="flex:1" onclick="saveEditFeeRecord()">✅ Save</button>
        <button class="btn btn-ghost" onclick="document.getElementById('editFeeModal').remove()">Cancel</button>
      </div>
    </div>`;
    modal.addEventListener('click', e=>{ if(e.target===modal) modal.remove(); });
    document.body.appendChild(modal);
  });
}

async function saveEditFeeRecord(){
  const id = document.getElementById('efr-id')?.value;
  const r = feeRecords.find(x=>x.id===id);
  if(!r) return;
  const amt = parseFloat(document.getElementById('efr-amount')?.value||'0');
  if(!amt||amt<=0){ toast('⚠️ Valid amount darj karein','var(--red)'); return; }

  const updated = {
    ...r,
    amount: amt,
    mode: document.getElementById('efr-mode')?.value||r.mode,
    date: document.getElementById('efr-date')?.value||r.date,
    month: document.getElementById('efr-month')?.value||r.month,
    status: document.getElementById('efr-status')?.value||r.status,
    notes: document.getElementById('efr-notes')?.value||''
  };

  // Server pe update karne ki koshish
  try {
    await AR_API.deleteFeeRecord(id, 'anuj@2006');
    await AR_API.collectFee(updated);
    feeRecords = await AR_API.getFeeRecords();
    toast('✅ Fee record updated!','var(--green)');
  } catch(e){
    // Locally update karo agar server nahi mila
    const idx = feeRecords.findIndex(x=>x.id===id);
    if(idx>-1) feeRecords[idx] = updated;
    toast('✅ Record updated locally','var(--green)');
  }
  document.getElementById('editFeeModal')?.remove();
  renderFees();
}

// ═══ LOCKER FEE PAYMENT ═══════════════════════════════════════════════════════
function openLockerFeePayment(no){
  const data = getLockerData();
  const asgn = data.find(x=>x.no===no);
  if(!asgn){ toast('⚠️ Locker assigned nahi hai','var(--red)'); return; }

  const el = document.getElementById('lockerFeeModal');
  if(el) el.remove();

  const modal = document.createElement('div');
  modal.className = 'overlay open';
  modal.id = 'lockerFeeModal';
  modal.innerHTML = `
  <div class="modal" style="max-width:400px">
    <h3>🔐 Locker Fee Collect — Locker ${no}</h3>
    <input type="hidden" id="lfm-no" value="${no}"/>
    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:14px">
      <div style="font-weight:900;font-size:14px">${asgn.memberName}</div>
      <div style="font-size:12px;color:var(--ink3)">${asgn.memberId} · Monthly Fee: ₹${asgn.fee||0}</div>
    </div>
    <div class="fgrid">
      <div class="frow"><label>Amount (₹)</label><input type="number" id="lfm-amt" value="${asgn.fee||0}" min="1"/></div>
      <div class="frow"><label>Payment Mode</label>
        <select id="lfm-mode">
          <option>Cash</option><option>UPI</option><option>Online</option>
        </select>
      </div>
    </div>
    <div class="fgrid">
      <div class="frow"><label>Month</label><input id="lfm-month" value="${new Date().toLocaleString('en-IN',{month:'long',year:'numeric'})}"/></div>
      <div class="frow"><label>Date</label><input type="date" id="lfm-date" value="${todayStr()}"/></div>
    </div>
    <div class="frow"><label>Notes</label><input id="lfm-notes" placeholder="Optional notes"/></div>
    <div style="display:flex;gap:10px;margin-top:8px">
      <button class="btn btn-teal" style="flex:1" onclick="collectLockerFee()">✅ Collect & Receipt</button>
      <button class="btn btn-ghost" onclick="document.getElementById('lockerFeeModal').remove()">Cancel</button>
    </div>
  </div>`;
  modal.addEventListener('click', e=>{ if(e.target===modal) modal.remove(); });
  document.body.appendChild(modal);
}

async function collectLockerFee(){
  const no = parseInt(document.getElementById('lfm-no')?.value||'0');
  const data = getLockerData();
  const asgn = data.find(x=>x.no===no);
  if(!asgn) return;
  const amt = parseFloat(document.getElementById('lfm-amt')?.value||'0');
  if(!amt||amt<=0){ toast('⚠️ Valid amount darj karein','var(--red)'); return; }
  const mode = document.getElementById('lfm-mode')?.value||'Cash';
  const month = document.getElementById('lfm-month')?.value||'';
  const date = document.getElementById('lfm-date')?.value||todayStr();
  const notes = document.getElementById('lfm-notes')?.value||'';
  const member = members.find(m=>m.id===asgn.memberId);

  const recId = 'LKR-'+Date.now();
  const payload = {
    id: recId, memberId: asgn.memberId, memberName: asgn.memberName,
    plan: `Locker #${no}`, shift: '—', category: '1 Month',
    amount: amt, paidAmount: amt, dueAmount: 0,
    date, month, mode, notes: notes || `Locker #${no} fee`,
    status: 'Paid'
  };

  try {
    await AR_API.collectFee(payload);
    feeRecords = await AR_API.getFeeRecords();
  } catch(e){
    feeRecords.push(payload);
  }

  document.getElementById('lockerFeeModal')?.remove();

  // Receipt
  const waMsg = encodeURIComponent(`🔐 *Yugvandana Library — Locker Fee Receipt*\n\nDear *${asgn.memberName}* ji, 🙏\n\n*Receipt ID:* ${recId}\n*Locker No.:* ${no}\n*Month:* ${month}\n*Amount Paid:* ₹${amt}\n*Mode:* ${mode}\n*Date:* ${fmtDate(date)}\n${notes?`*Notes:* ${notes}\n`:''}\n✅ Locker fee successfully collected.\n\nThank you!\n📍 Yugvandana Library\n📞 83498 52152`);
  const waLink = member?.phone ? `<a href="https://wa.me/${member.phone}?text=${waMsg}" target="_blank" class="btn btn-wa btn-sm" style="margin-top:10px;display:inline-block">📲 Receipt WA bhejo</a>` : '';

  toast(`✅ Locker fee ₹${amt} collected!`, 'var(--teal)');
  renderFees(); renderDashboard();
}

function toggleMoreDrawer(){
  const drawer = document.getElementById('sb-more-drawer');
  const overlay = document.getElementById('sb-more-overlay');
  const isOpen = drawer.classList.contains('open');
  if(isOpen){ closeMoreDrawer(); }
  else { drawer.classList.add('open'); overlay.classList.add('open'); }
}
function closeMoreDrawer(){
  document.getElementById('sb-more-drawer')?.classList.remove('open');
  document.getElementById('sb-more-overlay')?.classList.remove('open');
}

// ═══ MONTHLY INCOME ═══════════════════════════════════════════════════════════
// Helper: extract extra charges amount from fee record notes
function getExtraAmtFromRecord(r){
  // notes mein "Extra Charges (xxx): ₹200" format
  if(!r.notes) return 0;
  const m = r.notes.match(/Extra Charges[^:]*:\s*₹?(\d+(\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}

// Month name → sort order (Jan=1 ... Dec=12)
const MONTH_ORDER = {January:1,February:2,March:3,April:4,May:5,June:6,July:7,August:8,September:9,October:10,November:11,December:12};
function monthSortKey(m){ // "May 2026" → 202605
  const [name,yr] = (m||'').split(' ');
  return parseInt(yr||0)*100 + (MONTH_ORDER[name]||0);
}

// Helper: payment date (YYYY-MM-DD or ISO datetime) se "Month YYYY" string banao
function dateToMonthLabel(dateStr){
  if(!dateStr||dateStr.length<7) return '';
  let iso = dateStr;
  // ISO datetime from server e.g. 2026-05-28T18:30:00.000Z
  if(/^\d{4}-\d{2}-\d{2}T/.test(dateStr)){
    const dt = new Date(dateStr);
    iso = dt.toLocaleDateString('en-CA', {timeZone:'Asia/Kolkata'});
  }
  const [yr,mo] = iso.split('-');
  const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];
  return (monthNames[parseInt(mo)-1]||'') + ' ' + yr;
}

function renderMonthlyIncome(){
  // Populate month selector — payment DATE se months nikalo, r.month as fallback
  const monthsFromDate = feeRecords.map(r=>r.date?dateToMonthLabel(r.date):null).filter(Boolean);
  // r.month fallback for records with no date
  const monthsFromLabel = feeRecords.filter(r=>!r.date && r.month).map(r=>r.month).filter(Boolean);
  const months = [...new Set([...monthsFromDate, ...monthsFromLabel])]
    .sort((a,b)=>monthSortKey(b)-monthSortKey(a));

  const sel = document.getElementById('mi-monthSel');
  if(!sel) return;

  // No fee records — show empty state
  if(!months.length){
    sel.innerHTML = '<option value="">— No fee records —</option>';
    const summaryEl = document.getElementById('mi-summary');
    if(summaryEl) summaryEl.innerHTML = `<div style="grid-column:1/-1;background:var(--bg3);border:1px solid var(--border);border-radius:12px;padding:24px;text-align:center;color:var(--ink3)">
      <div style="font-size:32px;margin-bottom:8px">💰</div>
      <div style="font-size:14px;font-weight:800">Koi fee record nahi hai</div>
      <div style="font-size:12px;margin-top:4px">Fee collect karein to yahan monthly income dikhegi</div>
    </div>`;
    const cardsContainer = document.getElementById('mi-cards-grid');
    if(cardsContainer) cardsContainer.innerHTML = '';
    return;
  }

  const prevVal = sel.value;
  sel.innerHTML = months.map(m=>`<option value="${m}">${m}</option>`).join('');
  if(prevVal && months.includes(prevVal)) sel.value = prevVal;
  else if(months.length) sel.value = months[0];

  const selectedMonth = sel.value;
  // Filter by actual payment DATE month — r.month as fallback for old records
  const [selMName, selMYear] = (selectedMonth||'').split(' ');
  const selMNum = String((MONTH_ORDER[selMName]||1)).padStart(2,'0');
  const selDatePrefix = `${selMYear}-${selMNum}`;
  const monthRecs = feeRecords.filter(r=>{
    // r.date ko YYYY-MM-DD mein normalize karo pehle
    const recDate = r.date ? normDate(r.date) : null;
    if(recDate) return recDate.startsWith(selDatePrefix);
    // Fallback: r.month label match (normalize karke compare karo)
    if(r.month) return normalizeMonth(r.month) === selectedMonth;
    return false;
  }).sort((a,b)=>normDate(a.date).localeCompare(normDate(b.date)));

  // Summary stats
  const totalAmt = monthRecs.reduce((s,r)=>s+(parseFloat(r.paidAmount)||parseFloat(r.amount)||0),0);
  const cashAmt  = monthRecs.filter(r=>r.mode==='Cash').reduce((s,r)=>s+(parseFloat(r.paidAmount)||parseFloat(r.amount)||0),0);
  const upiAmt   = monthRecs.filter(r=>r.mode!=='Cash').reduce((s,r)=>s+(parseFloat(r.paidAmount)||parseFloat(r.amount)||0),0);
  const extraAmt = monthRecs.reduce((s,r)=>s+getExtraAmtFromRecord(r),0);

  // Pending Due: members table se SABHI Due/Expired/Partial members ka dueAmount sum karo
  // Ye most accurate source hai — kisi bhi month ka ho, sab count hoga
  const dueAmt = members
    .filter(mem=>mem.feeStatus==='Due'||mem.feeStatus==='Expired'||mem.feeStatus==='Partial')
    .reduce((s,mem)=>{
      const shiftKey=mem.shift&&mem.shift.includes('Full Day')?'Full Day':mem.shift&&mem.shift.includes('Evening')?'Evening':'Morning';
      const _base=(feeStructure[mem.plan]||{})[shiftKey]||0;
      const _dur=parseInt(mem.category)||1;
      const _sub=_base*_dur;
      const planTotal=_sub-Math.round(_sub*getPlanDiscount(_dur));
      const memberDue = parseFloat(mem.dueAmount)>0 ? parseFloat(mem.dueAmount) : planTotal;
      return s + memberDue;
    }, 0);

  const summaryEl = document.getElementById('mi-summary');
  if(summaryEl) summaryEl.innerHTML = [
    {label:'Total Income',  val:fmtAmt(totalAmt), c:'var(--green)',  icon:'💰'},
    {label:'Cash',          val:fmtAmt(cashAmt),  c:'var(--yellow)', icon:'💵'},
    {label:'UPI/Online',    val:fmtAmt(upiAmt),   c:'var(--teal)',   icon:'📲'},
    {label:'Extra Charges', val:fmtAmt(extraAmt), c:'var(--purple)', icon:'➕'},
    {label:'Pending Due',   val:fmtAmt(dueAmt),   c:'var(--red)',    icon:'⚠️'},
    {label:'Receipts',      val:monthRecs.length,  c:'var(--blue)',   icon:'🧾'},
  ].map(s=>`<div style="background:var(--card);border:1px solid var(--border);border-radius:11px;padding:12px 16px;display:flex;flex-direction:column;gap:4px">
    <div style="font-size:18px">${s.icon}</div>
    <div style="font-size:11px;color:var(--ink3);font-weight:800;text-transform:uppercase">${s.label}</div>
    <div style="font-size:18px;font-weight:900;color:${s.c}">${s.val}</div>
  </div>`).join('');

  const totalBadge = document.getElementById('mi-totalBadge');
  if(totalBadge) totalBadge.textContent = `Total: ${fmtAmt(totalAmt)}`;

  // ── Build day-wise data ────────────────────────────────────────────────────
  const dayMap = {};
  monthRecs.forEach(r=>{
    if(!r.date) return;
    // Normalize date to YYYY-MM-DD (IST)
    const recDate = (()=>{
      if(/^\d{4}-\d{2}-\d{2}T/.test(r.date)){
        const dt = new Date(r.date);
        return dt.toLocaleDateString('en-CA', {timeZone:'Asia/Kolkata'});
      }
      return r.date;
    })();
    if(!dayMap[recDate]) dayMap[recDate]={date:recDate,count:0,cash:0,upi:0,extra:0,total:0,recs:[]};
    const amt   = parseFloat(r.paidAmount)||parseFloat(r.amount)||0;
    const extra = getExtraAmtFromRecord(r);
    dayMap[recDate].count++;
    dayMap[recDate].total += amt;
    dayMap[recDate].extra += extra;
    dayMap[recDate].recs.push(r);
    if(r.mode==='Cash') dayMap[recDate].cash += amt;
    else                dayMap[recDate].upi  += amt;
  });

  // ── Pura mahina generate karo (1 se last day tak) ─────────────────────────
  const [mName, mYear] = (selectedMonth||'').split(' ');
  const mNum  = (MONTH_ORDER[mName]||1) - 1; // 0-based
  const yr    = parseInt(mYear)||new Date().getFullYear();
  const daysInMonth = new Date(yr, mNum+1, 0).getDate();
  const DAYS  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const tbody = document.getElementById('mi-table');
  if(!tbody) return;

  // ── CARD FORMAT — 7-col grid, har din ek card ─────────────────────────────
  const cardsEl = document.getElementById('mi-cards-grid');
  const tableWrap = tbody.closest('.twrap') || tbody.closest('div');

  // Table hide karo, cards use karo
  if(tableWrap) tableWrap.style.display='none';

  let cardsContainer = document.getElementById('mi-cards-grid');
  if(!cardsContainer){
    cardsContainer = document.createElement('div');
    cardsContainer.id = 'mi-cards-grid';
    tableWrap ? tableWrap.parentNode.insertBefore(cardsContainer, tableWrap) : tbody.parentNode.appendChild(cardsContainer);
  }

  const today = todayStr();
  let cardsHtml = `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-top:10px">`;

  // Weekday headers
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d=>{
    cardsHtml += `<div style="text-align:center;font-size:10px;font-weight:800;color:var(--ink3);padding:4px 0;text-transform:uppercase">${d}</div>`;
  });

  // 1st day of month kaun sa weekday hai
  const firstDay = new Date(yr, mNum, 1).getDay(); // 0=Sun
  for(let i=0;i<firstDay;i++){
    cardsHtml += `<div></div>`; // blank cells
  }

  for(let d=1; d<=daysInMonth; d++){
    const dateStr = `${yr}-${String(mNum+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const data    = dayMap[dateStr];
    const isToday = dateStr === today;
    const hasFee  = data && data.total > 0;
    const isFuture= dateStr > today;

    let bg   = 'var(--bg3)';
    let border = '1px solid var(--border)';
    let totalColor = 'var(--ink3)';
    if(isToday){  bg='var(--greenl)'; border='2px solid var(--green)'; }
    else if(hasFee){ bg='var(--card2)'; border='1px solid var(--border2)'; totalColor='var(--green)'; }
    else if(isFuture){ bg='var(--bg)'; }

    cardsHtml += `<div style="border:${border};border-radius:9px;padding:5px 4px;background:${bg};cursor:${hasFee?'pointer':'default'};min-height:58px"
      ${hasFee?`onclick="showDayDetail('${dateStr}')"`:''}
      title="${hasFee?`${data.count} records — ${fmtAmt(data.total)}`:''}">
      <div style="font-size:11px;font-weight:${isToday?'900':'700'};color:${isToday?'var(--green)':hasFee?'var(--ink)':'var(--ink3)'}">
        ${d}${isToday?`<span style="font-size:8px;color:var(--green);font-weight:900"> •</span>`:''}
      </div>
      ${hasFee?`
        <div style="font-size:9px;color:${totalColor};font-weight:900;margin-top:2px">${fmtAmt(data.total)}</div>
        <div style="font-size:8px;color:var(--ink3);margin-top:1px">${data.count} rec</div>
        ${data.cash>0&&data.upi>0?`<div style="display:flex;gap:2px;margin-top:2px">
          <span style="font-size:7px;background:var(--yellowl);color:var(--yellow);border-radius:3px;padding:1px 3px;font-weight:800">C</span>
          <span style="font-size:7px;background:var(--teall);color:var(--teal);border-radius:3px;padding:1px 3px;font-weight:800">U</span>
        </div>`:data.cash>0?`<span style="font-size:7px;background:var(--yellowl);color:var(--yellow);border-radius:3px;padding:1px 3px;font-weight:800">Cash</span>`:
        data.upi>0?`<span style="font-size:7px;background:var(--teall);color:var(--teal);border-radius:3px;padding:1px 3px;font-weight:800">UPI</span>`:''}
      `:'<div style="font-size:8px;color:var(--ink3);margin-top:6px;opacity:.4">—</div>'}
    </div>`;
  }
  cardsHtml += `</div>`;

  // Month total bar
  cardsHtml += `<div style="margin-top:12px;background:var(--card2);border:1px solid var(--border2);border-radius:11px;padding:12px 16px;display:flex;flex-wrap:wrap;gap:16px;align-items:center">
    <span style="font-size:13px;font-weight:900;color:var(--ink)">📊 ${selectedMonth} Total</span>
    <span style="font-weight:900;color:var(--green)">${fmtAmt(totalAmt)}</span>
    <span style="font-size:12px;color:var(--yellow);font-weight:700">💵 Cash: ${fmtAmt(cashAmt)}</span>
    <span style="font-size:12px;color:var(--teal);font-weight:700">📲 UPI: ${fmtAmt(upiAmt)}</span>
    ${extraAmt>0?`<span style="font-size:12px;color:var(--purple);font-weight:700">➕ Extra: ${fmtAmt(extraAmt)}</span>`:''}
    ${dueAmt>0?`<span style="font-size:12px;color:var(--red);font-weight:700">⚠️ Due: ${fmtAmt(dueAmt)}</span>`:''}
    <span style="font-size:12px;color:var(--blue);font-weight:700">🧾 ${monthRecs.length} receipts</span>
  </div>`;

  // Detail popup placeholder
  cardsHtml += `<div id="mi-day-detail"></div>`;

  cardsContainer.innerHTML = cardsHtml;
}

// Day click detail popup
function showDayDetail(dateStr){
  const sel = document.getElementById('mi-monthSel');
  const selectedMonth = sel?.value||'';
  const recs = feeRecords.filter(r=>normDate(r.date)===dateStr);
  if(!recs.length) return;
  const total = recs.reduce((s,r)=>s+(parseFloat(r.paidAmount)||parseFloat(r.amount)||0),0);
  const DAYS  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const dateObj = new Date(dateStr);
  const label = `${DAYS[dateObj.getDay()]}, ${fmtDate(dateStr)}`;

  const old = document.getElementById('mi-day-popup');
  if(old) old.remove();

  const popup = document.createElement('div');
  popup.id='mi-day-popup';
  popup.style.cssText='position:fixed;inset:0;background:#00000090;z-index:400;display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeIn .2s';
  popup.innerHTML=`<div style="background:var(--card);border:2px solid var(--green);border-radius:16px;width:100%;max-width:480px;max-height:85vh;overflow:hidden;display:flex;flex-direction:column;animation:fadeUp .25s ease">
    <div style="background:var(--greenl);padding:12px 16px;border-bottom:1px solid var(--green);display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-weight:900;font-size:15px">📅 ${label}</div>
        <div style="font-size:12px;color:var(--green);font-weight:800">${recs.length} receipts · Total: ${fmtAmt(total)}</div>
      </div>
      <button onclick="document.getElementById('mi-day-popup').remove()" style="background:var(--bg3);border:1px solid var(--border);color:var(--ink);width:28px;height:28px;border-radius:7px;cursor:pointer">✕</button>
    </div>
    <div style="overflow-y:auto;padding:12px 16px">
      ${recs.map(r=>`<div style="padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-weight:800;font-size:13px">${r.memberName}</div>
            <div style="font-size:11px;color:var(--ink3)">${r.memberId} · ${r.plan}</div>
          </div>
          <div style="text-align:right">
            <div style="font-weight:900;color:var(--green)">${fmtAmt(parseFloat(r.paidAmount)||parseFloat(r.amount)||0)}</div>
            <span class="badge b-gray" style="font-size:10px">${r.mode}</span>
          </div>
        </div>
        ${r.notes?`<div style="font-size:11px;color:var(--ink3);margin-top:4px">📝 ${r.notes}</div>`:''}
      </div>`).join('')}
    </div>
  </div>`;
  popup.addEventListener('click',e=>{ if(e.target===popup) popup.remove(); });
  document.body.appendChild(popup);
}

function exportMonthlyIncomeExcel(){
  if(typeof XLSX==='undefined'){ toast('⚠️ XLSX library not loaded','var(--red)'); return; }
  const sel = document.getElementById('mi-monthSel');
  const selectedMonth = sel?.value || '';
  const [selMName2, selMYear2] = (selectedMonth||'').split(' ');
  const selMNum2 = String((MONTH_ORDER[selMName2]||1)).padStart(2,'0');
  const selDatePrefix2 = `${selMYear2}-${selMNum2}`;
  const monthRecs = feeRecords.filter(r=>r.date&&normDate(r.date).startsWith(selDatePrefix2));
  const dayMap = {};
  monthRecs.forEach(r=>{
    if(!r.date) return;
    if(!dayMap[r.date]) dayMap[r.date]={Date:fmtDate(r.date),Day:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(r.date).getDay()],Receipts:0,Cash:0,'UPI/Online':0,Total:0};
    const amt = parseFloat(r.paidAmount)||parseFloat(r.amount)||0;
    dayMap[r.date].Receipts++;
    dayMap[r.date].Total += amt;
    if(r.mode==='Cash') dayMap[r.date].Cash += amt;
    else dayMap[r.date]['UPI/Online'] += amt;
  });
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(Object.values(dayMap).sort((a,b)=>b.Date.localeCompare(a.Date)));
  XLSX.utils.book_append_sheet(wb, ws, 'Monthly Income');
  XLSX.writeFile(wb, `AR_Income_${selectedMonth.replace(' ','_')}.xlsx`);
  toast('📊 Monthly Income exported!','var(--green)');
}

// ═══ ATTENDANCE SHIFT TABS ════════════════════════════════════════════════════
let currentAttShift = 'all';

function setAttShiftTab(shift, btn){
  currentAttShift = shift;
  document.querySelectorAll('.att-shift-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderAttendance();
  const panel = document.getElementById('quickCheckinPanel');
  if(!panel) return;
  if(shift==='all'){
    panel.style.display='none';
  } else {
    panel.style.display='block';
    const titles = {morning:'🌅 Morning Shift Members',evening:'🌆 Evening Shift Members',fullday:'☀️ Full Day Members'};
    const titleEl = document.getElementById('quickCheckinTitle');
    if(titleEl) titleEl.textContent = titles[shift]||shift;
    renderQuickCheckin(shift);
  }
}

function getShiftMembers(shift){
  if(shift==='morning') return members.filter(m=>m.shift&&(m.shift.includes('Morning')));
  if(shift==='evening') return members.filter(m=>m.shift&&(m.shift.includes('Evening')));
  if(shift==='fullday') return members.filter(m=>m.shift&&(m.shift.includes('Full Day')||m.shift.includes('Full')));
  return members;
}

function renderQuickCheckin(shift){
  const grid = document.getElementById('quickCheckinGrid');
  if(!grid) return;
  const date = val('attDate')||todayStr();
  const shiftMembers = getShiftMembers(shift);
  const todayRecs = attendance.filter(a=>a.date===date);

  if(!shiftMembers.length){
    grid.innerHTML = `<div style="color:var(--ink3);text-align:center;padding:14px;grid-column:1/-1">Is shift mein koi member nahi hai</div>`;
    return;
  }

  grid.innerHTML = shiftMembers.map(m=>{
    const rec = todayRecs.find(a=>a.memberId===m.id&&a.present);
    const isPresent = !!rec;
    return `<div class="qci-card${isPresent?' is-present':''}" id="qci-${m.id}">
      <div class="qci-avatar" style="background:${m.color}">${m.name[0]}</div>
      <div class="qci-info">
        <div class="qci-name">${m.name}</div>
        <div class="qci-sub">Seat ${fmtSeat(m.seat)} · ${shiftShort(m.shift)}</div>
        ${isPresent?`<div class="qci-sub" style="color:var(--green)">✅ In: ${rec.in||'—'}${rec.out?' | Out: '+rec.out:' | <span style="color:var(--orange)">Active</span>'}</div>`:''}
      </div>
      <div class="qci-btns">
        ${isPresent
          ? `<button class="btn btn-orange btn-sm btn-icon" onclick="openCheckout('${m.id}','${date}')" title="Checkout">🕐</button>
             <button class="btn btn-red btn-sm btn-icon" onclick="toggleAtt('${m.id}','${date}',false);renderQuickCheckin('${currentAttShift}')" title="Absent">✕</button>`
          : `<button class="btn btn-green btn-sm" style="font-size:11px;padding:5px 10px" onclick="qciCheckin('${m.id}','${date}')">✅ In</button>`
        }
      </div>
    </div>`;
  }).join('');
}

function qciCheckin(mId, date){
  toggleAtt(mId, date, true);
  setTimeout(()=>renderQuickCheckin(currentAttShift), 200);
}

function markAllShiftPresent(){
  const date = val('attDate')||todayStr();
  const shiftMembers = getShiftMembers(currentAttShift);
  const todayRecs = attendance.filter(a=>a.date===date&&a.present);
  const notPresent = shiftMembers.filter(m=>!todayRecs.find(a=>a.memberId===m.id));
  if(!notPresent.length){ toast('Sabhi members already present hain ✅','var(--green)'); return; }
  notPresent.forEach(m=>toggleAtt(m.id, date, true));
  setTimeout(()=>{ renderQuickCheckin(currentAttShift); toast(`✅ ${notPresent.length} members marked present`,'var(--green)'); }, 300);
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEW FEATURES: Quick Search, Charts, Notifications, Auto Checkout
// ═══════════════════════════════════════════════════════════════════════════════

// ── Helper: previous day string ──
function prevDay(dateStr){
  const d=new Date(dateStr); d.setDate(d.getDate()-1); return d.toISOString().slice(0,10);
}

// ═══ QUICK SEARCH ════════════════════════════════════════════════════════════
let qsSelectedIdx = -1;

function openQuickSearch(){
  document.getElementById('qs-overlay').classList.add('open');
  setTimeout(()=>document.getElementById('qs-input').focus(),50);
  renderQS();
}
function closeQuickSearch(){
  document.getElementById('qs-overlay').classList.remove('open');
  document.getElementById('qs-input').value='';
  qsSelectedIdx=-1;
}
document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.key==='k'){ e.preventDefault(); openQuickSearch(); }
  if(e.key==='Escape'&&document.getElementById('qs-overlay').classList.contains('open')) closeQuickSearch();
});

function renderQS(){
  const q=(document.getElementById('qs-input').value||'').toLowerCase().trim();
  const res=document.getElementById('qs-results');
  if(!q){ res.innerHTML='<div class="qs-empty">🔍 Member ka naam, ID, ya seat number type karo...</div>'; return; }
  const matched=members.filter(m=>
    (m.name||'').toLowerCase().includes(q)||
    (m.id||'').toLowerCase().includes(q)||
    String(m.seat||'').includes(q)||
    (m.phone||'').includes(q)||
    (m.cls||'').toLowerCase().includes(q)
  ).slice(0,8);
  if(!matched.length){ res.innerHTML=`<div class="qs-empty">😕 "${q}" se koi member nahi mila</div>`; return; }
  qsSelectedIdx=-1;
  res.innerHTML=matched.map((m,i)=>{
    const fsBadge={Paid:'b-green',Due:'b-yellow',Expired:'b-red'};
    return `<div class="qs-item" data-idx="${i}" onclick="qsOpenMember('${m.id}')">
      <div class="qs-avatar" style="background:${m.color}">${m.name[0]}</div>
      <div class="qs-info">
        <div class="qs-name">${m.name} <span class="badge ${fsBadge[m.feeStatus]||'b-gray'} qs-badge">${m.feeStatus}</span></div>
        <div class="qs-sub">${m.id} · ${shiftShort(m.shift)} · Seat ${fmtSeat(m.seat)} · ${m.cls||'—'}</div>
      </div>
    </div>`;
  }).join('');
}

function qsOpenMember(id){
  closeQuickSearch();
  openProfile(id);
}

function qsKeyNav(e){
  const items=document.querySelectorAll('.qs-item');
  if(!items.length) return;
  if(e.key==='ArrowDown'){ e.preventDefault(); qsSelectedIdx=Math.min(qsSelectedIdx+1,items.length-1); }
  else if(e.key==='ArrowUp'){ e.preventDefault(); qsSelectedIdx=Math.max(qsSelectedIdx-1,0); }
  else if(e.key==='Enter'){ e.preventDefault(); if(qsSelectedIdx>=0) items[qsSelectedIdx].click(); return; }
  items.forEach((el,i)=>el.classList.toggle('qs-active',i===qsSelectedIdx));
  if(qsSelectedIdx>=0) items[qsSelectedIdx].scrollIntoView({block:'nearest'});
}

// ═══ NOTIFICATIONS ════════════════════════════════════════════════════════════
function buildNotifications(){
  const notifs=[];
  const today=new Date(); const todayS=todayStr();

  // Due members
  const due=members.filter(m=>m.feeStatus==='Due'||m.feeStatus==='Expired');
  if(due.length) notifs.push({icon:'⚠️',title:`${due.length} members ka fee due hai`,body:due.slice(0,3).map(m=>m.name).join(', ')+(due.length>3?` +${due.length-3} aur`:''),color:'var(--red)'});

  // Expiring in 3 days
  const expiring=members.filter(m=>{
    if(!m.to||m.feeStatus==='Expired') return false;
    const diff=Math.ceil((new Date(m.to)-today)/(1000*60*60*24));
    return diff>=0&&diff<=3;
  });
  if(expiring.length) notifs.push({icon:'⏳',title:`${expiring.length} members ka plan expire hone wala hai`,body:expiring.map(m=>m.name).join(', '),color:'var(--orange)'});

  // Today present count
  const todayPres=attendance.filter(a=>a.date===todayS&&a.present).length;
  if(todayPres>0) notifs.push({icon:'📋',title:`Aaj ${todayPres} members present hain`,body:`Total members: ${members.length}`,color:'var(--teal)'});

  // Active (checked in but not checked out)
  const active=attendance.filter(a=>a.date===todayS&&a.present&&a.in&&!a.out);
  if(active.length) notifs.push({icon:'🕐',title:`${active.length} members abhi library mein hain`,body:active.slice(0,3).map(a=>a.memberName).join(', ')+(active.length>3?` +${active.length-3}`:'')+' — checkout pending',color:'var(--blue)'});

  return notifs;
}

function toggleNotifDropdown(){
  const dd=document.getElementById('notifDropdown');
  dd.classList.toggle('open');
  if(dd.classList.contains('open')) renderNotifications();
}
function closeNotifDropdown(){
  document.getElementById('notifDropdown').classList.remove('open');
}
document.addEventListener('click',e=>{
  if(!e.target.closest('.notif-bell-wrap')) closeNotifDropdown();
});

function renderNotifications(){
  const notifs=buildNotifications();
  const dot=document.getElementById('notifDot');
  const list=document.getElementById('notifList');
  if(notifs.length){ dot.classList.add('show'); dot.textContent=notifs.length; }
  else { dot.classList.remove('show'); }
  list.innerHTML=notifs.length
    ? notifs.map(n=>`<div class="notif-item"><div class="notif-icon">${n.icon}</div><div class="notif-body"><div class="notif-title" style="color:${n.color}">${n.title}</div>${n.body}</div></div>`).join('')
    : '<div class="notif-empty">✅ Sab theek hai! Koi alert nahi.</div>';
}

function updateNotifBadge(){
  const notifs=buildNotifications();
  const dot=document.getElementById('notifDot');
  if(!dot) return;
  if(notifs.length){ dot.classList.add('show'); dot.textContent=notifs.length; }
  else { dot.classList.remove('show'); }
}

// ═══ CHARTS (Canvas-based, no external library) ══════════════════════════════
function drawCharts(){
  drawRevenueChart();
  drawMemberGrowthChart();
  drawSeatOccupancyChart();
  drawShiftIncomeChart();
}

function drawRevenueChart(){
  const canvas=document.getElementById('revenueChart');
  if(!canvas) return;
  const ctx=canvas.getContext('2d');
  const months=[]; const data=[];
  for(let i=5;i>=0;i--){
    const d=new Date(); d.setMonth(d.getMonth()-i);
    const ym=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    months.push(d.toLocaleDateString('en-IN',{month:'short'}));
    const rev=feeRecords.filter(r=>r.date&&normDate(r.date).startsWith(ym)).reduce((s,r)=>s+(parseFloat(r.paidAmount)||parseFloat(r.amount)||0),0);
    data.push(rev);
  }
  drawBarChart(ctx,canvas,months,data,'#22c55e',150);
}

function drawMemberGrowthChart(){
  const canvas=document.getElementById('memberGrowthChart');
  if(!canvas) return;
  const ctx=canvas.getContext('2d');
  const months=[]; const data=[];
  for(let i=5;i>=0;i--){
    const d=new Date(); d.setMonth(d.getMonth()-i);
    const ym=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    months.push(d.toLocaleDateString('en-IN',{month:'short'}));
    data.push(members.filter(m=>m.from&&normDate(m.from).startsWith(ym)).length);
  }
  drawBarChart(ctx,canvas,months,data,'#3b82f6',150);
}

function drawShiftIncomeChart(){
  const canvas=document.getElementById('shiftIncomeChart');
  if(!canvas) return;
  const ctx=canvas.getContext('2d');
  // Shift-wise income from fee records (match by member shift)
  const shiftMap={'Morning':0,'Evening':0,'Full Day':0,'Full':0};
  feeRecords.forEach(r=>{
    const m=members.find(x=>x.id===r.memberId);
    if(!m) return;
    const amt=parseFloat(r.paidAmount)||parseFloat(r.amount)||0;
    const s=m.shift||'';
    if(s.includes('Morning')) shiftMap['Morning']+=amt;
    else if(s.includes('Evening')) shiftMap['Evening']+=amt;
    else shiftMap['Full Day']+=amt;
  });
  const labels=['Morning','Evening','Full Day'];
  const data=[shiftMap['Morning'],shiftMap['Evening'],shiftMap['Full Day']+shiftMap['Full']];
  const colors=['#f59e0b','#6366f1','#10b981'];
  const statsEl=document.getElementById('shiftIncomeStats');

  const parent=canvas.parentElement;
  const W=canvas.width=parent?parent.clientWidth-32:220;
  const H=canvas.height=150;
  ctx.clearRect(0,0,W,H);
  const isDark=!document.body.classList.contains('light');
  const max=Math.max(...data,1);
  const pad={l:34,r:10,t:12,b:28};
  const chartW=W-pad.l-pad.r;
  const chartH=H-pad.t-pad.b;
  const barW=Math.floor(chartW/3*0.45);
  const gap=chartW/3;

  // grid
  ctx.strokeStyle=isDark?'#2a305033':'#c8cde833';
  ctx.lineWidth=1;
  [0.5,1].forEach(pct=>{
    const y=pad.t+chartH*(1-pct);
    ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(W-pad.r,y); ctx.stroke();
    ctx.fillStyle=isDark?'#5a628066':'#7a84a866';
    ctx.font=`700 8px 'Nunito',sans-serif`;
    ctx.textAlign='right';
    const v=Math.round(max*pct);
    ctx.fillText(v>=1000?`₹${Math.round(v/1000)}k`:`₹${v}`,pad.l-2,y+3);
  });

  labels.forEach((lbl,i)=>{
    const x=pad.l+i*gap+gap/2;
    const bH=data[i]?Math.max(4,Math.floor(data[i]/max*chartH)):3;
    const y=pad.t+chartH-bH;
    ctx.fillStyle=colors[i];
    ctx.globalAlpha=0.9;
    ctx.beginPath();
    if(ctx.roundRect) ctx.roundRect(x-barW/2,y,barW,bH,4);
    else ctx.rect(x-barW/2,y,barW,bH);
    ctx.fill();
    ctx.globalAlpha=1;
    ctx.fillStyle=isDark?'#a8b0cc':'#3a4260';
    ctx.font=`800 9px 'Nunito',sans-serif`;
    ctx.textAlign='center';
    if(data[i]>0) ctx.fillText(data[i]>=1000?`₹${Math.round(data[i]/1000)}k`:`₹${data[i]}`,x,y-3);
    ctx.fillStyle=isDark?'#5a6280':'#7a84a8';
    ctx.font=`700 9px 'Nunito',sans-serif`;
    ctx.fillText(lbl,x,H-6);
  });

  if(statsEl) statsEl.innerHTML=labels.map((l,i)=>`
    <div style="display:flex;align-items:center;gap:6px;font-size:11px;padding:4px 0;border-bottom:1px solid var(--border)">
      <div style="width:10px;height:10px;border-radius:3px;background:${colors[i]};flex-shrink:0"></div>
      <span style="color:var(--ink2);flex:1">${l}</span>
      <span style="font-weight:900;color:${colors[i]}">₹${data[i].toLocaleString('en-IN')}</span>
    </div>`).join('');
}

function drawSeatOccupancyChart(){
  const canvas=document.getElementById('seatOccupancyChart');
  if(!canvas) return;
  const ctx=canvas.getContext('2d');
  loadAppSettings();
  const total=(appSettings.seats&&appSettings.seats.total)||79;
  const occ=members.filter(m=>m.seat&&m.feeStatus!=='Expired').length;
  const free=total-occ;
  const pct=Math.round(occ/total*100);

  // Donut chart
  const parent=canvas.parentElement;
  const W=canvas.width=parent?Math.min(parent.clientWidth-32,200):180;
  const H=canvas.height=150;
  ctx.clearRect(0,0,W,H);
  const cx=W/2, cy=H/2, r=52, lw=20;
  const isDark=!document.body.classList.contains('light');

  // Draw donut
  const slices=[
    {val:occ,color:'#a855f7'},
    {val:free,color:isDark?'#2a3050':'#e0e4f4'},
  ];
  let start=-Math.PI/2;
  slices.forEach(s=>{
    if(!total) return;
    const angle=2*Math.PI*(s.val/total);
    ctx.beginPath(); ctx.arc(cx,cy,r,start,start+angle);
    ctx.arc(cx,cy,r-lw,start+angle,start,true);
    ctx.closePath(); ctx.fillStyle=s.color; ctx.fill();
    start+=angle;
  });
  // Center text
  ctx.fillStyle=isDark?'#eef0f8':'#1a1f36';
  ctx.font=`900 22px 'Bebas Neue', sans-serif`;
  ctx.textAlign='center'; ctx.fillText(`${pct}%`,cx,cy+4);
  ctx.font=`700 11px 'Nunito', sans-serif`;
  ctx.fillStyle=isDark?'#5a6280':'#7a84a8';
  ctx.fillText('Occupied',cx,cy+18);

  // center canvas
  canvas.style.display='block';
  canvas.style.margin='0 auto';

  // Stats below
  const statsEl=document.getElementById('seatOccupancyStats');
  if(statsEl) statsEl.innerHTML=`
    <div style="background:var(--purplel);border:1px solid var(--purple);border-radius:8px;padding:8px;text-align:center">
      <div style="font-size:18px;font-weight:900;color:var(--purple)">${occ}</div>
      <div style="font-size:10px;color:var(--ink3);font-weight:700">OCCUPIED</div>
    </div>
    <div style="background:var(--greenl);border:1px solid var(--green);border-radius:8px;padding:8px;text-align:center">
      <div style="font-size:18px;font-weight:900;color:var(--green)">${free}</div>
      <div style="font-size:10px;color:var(--ink3);font-weight:700">FREE</div>
    </div>`;
}

function drawBarChart(ctx, canvas, labels, data, color, chartHeight=150){
  const parent=canvas.parentElement;
  const W=canvas.width=parent?parent.clientWidth-32:280;
  const H=canvas.height=chartHeight;
  ctx.clearRect(0,0,W,H);
  const isDark=!document.body.classList.contains('light');
  const max=Math.max(...data,1);
  const pad={l:34,r:10,t:16,b:28};
  const chartW=W-pad.l-pad.r;
  const chartH=H-pad.t-pad.b;
  const barW=Math.floor(chartW/labels.length*0.5);
  const gap=chartW/labels.length;

  // Grid lines
  ctx.strokeStyle=isDark?'#2a305033':'#c8cde833';
  ctx.lineWidth=1;
  [0.25,0.5,0.75,1].forEach(pct=>{
    const y=pad.t+chartH*(1-pct);
    ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(W-pad.r,y); ctx.stroke();
    ctx.fillStyle=isDark?'#5a628066':'#7a84a866';
    ctx.font=`700 8px 'Nunito',sans-serif`;
    ctx.textAlign='right';
    const val=Math.round(max*pct);
    ctx.fillText(val>=1000?`${Math.round(val/1000)}k`:val,pad.l-2,y+3);
  });

  labels.forEach((lbl,i)=>{
    const x=pad.l+i*gap+gap/2;
    const barH=data[i]?Math.max(4,Math.floor(data[i]/max*chartH)):2;
    const y=pad.t+chartH-barH;
    ctx.fillStyle=color;
    ctx.globalAlpha=0.9;
    ctx.beginPath();
    if(ctx.roundRect) ctx.roundRect(x-barW/2,y,barW,barH,4);
    else ctx.rect(x-barW/2,y,barW,barH);
    ctx.fill();
    ctx.globalAlpha=1;
    ctx.fillStyle=isDark?'#5a6280':'#7a84a8';
    ctx.font=`700 9px 'Nunito',sans-serif`;
    ctx.textAlign='center';
    ctx.fillText(lbl,x,H-6);
    if(data[i]>0){
      ctx.fillStyle=isDark?'#a8b0cc':'#3a4260';
      ctx.font=`800 9px 'Nunito',sans-serif`;
      const valStr=data[i]>=1000?`₹${Math.round(data[i]/1000)}k`:String(data[i]);
      ctx.fillText(valStr,x,y-3);
    }
  });
}

// ═══ AUTO CHECKOUT ════════════════════════════════════════════════════════════
// Shift end time pe active members ko automatically checkout karo
async function runAutoCheckout(){
  const now=new Date();
  const nowH=now.getHours(); const nowM=now.getMinutes();
  const nowMins=nowH*60+nowM;
  const today=todayStr();

  loadAppSettings();
  const shifts=appSettings.shiftTimings||{morningEnd:'13:00',eveningEnd:'20:00'};
  const checkTimes=[
    {label:'Morning',endStr:shifts.morningEnd||'13:00',shiftKeywords:['Morning']},
    {label:'Evening',endStr:shifts.eveningEnd||'20:00',shiftKeywords:['Evening','Full Day','Full']},
  ];

  for(const ct of checkTimes){
    const [eh,em]=ct.endStr.split(':').map(Number);
    const endMins=eh*60+em;
    // Run within 5 min window after shift end
    if(nowMins>=endMins&&nowMins<=endMins+5){
      const activeRecs=attendance.filter(a=>
        a.date===today&&a.present&&a.in&&!a.out&&
        ct.shiftKeywords.some(kw=>(a.shift||'').includes(kw))
      );
      if(activeRecs.length){
        for(const rec of activeRecs){
          try{
            await AR_API.checkOut({memberId:rec.memberId,date:today,out:ct.endStr});
          }catch(_){}
        }
        if(activeRecs.length){
          attendance=await AR_API.getAttendance().catch(()=>attendance);
          toast(`🕐 Auto Checkout: ${activeRecs.length} ${ct.label} members checkout ho gaye`,'var(--orange)');
        }
      }
    }
  }
}

// Check every minute for auto checkout
setInterval(runAutoCheckout, 60000);

// ═══════════════════════════════════════════════════════════════════════════════
// MEMBER VIEW TOGGLE
// ═══════════════════════════════════════════════════════════════════════════════
let currentMemberView = 'grid';
function setMemberView(view, btn){
  currentMemberView = view;
  document.querySelectorAll('.view-btn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  const grid = document.getElementById('membersGrid');
  if(!grid) return;
  grid.classList.remove('card-view','list-view');
  if(view==='card') grid.classList.add('card-view');
  if(view==='list') grid.classList.add('list-view');
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORT TABS
// ═══════════════════════════════════════════════════════════════════════════════
function setRepTab(tab, btn){
  document.querySelectorAll('.rep-page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.rep-tab').forEach(b=>b.classList.remove('active'));
  document.getElementById('rep-'+tab)?.classList.add('active');
  if(btn) btn.classList.add('active');
  if(tab==='pl') renderPL();
  if(tab==='inactive') renderInactive(30);
  if(tab==='leaderboard') renderLeaderboard();
  if(tab==='retention') renderRetention();
  if(tab==='heatmap') renderHeatmap();
  if(tab==='target') renderIncomeVsTarget();
}

// ═══ INACTIVE MEMBERS ════════════════════════════════════════════════════════
function renderInactive(days=30){
  const today = new Date(todayStr());
  const cutoff = new Date(today); cutoff.setDate(cutoff.getDate()-days);
  const cutoffStr = cutoff.toISOString().slice(0,10);
  const result = members.map(m=>{
    const mAtt = attendance.filter(a=>a.memberId===m.id&&a.present).map(a=>a.date).sort().reverse();
    const lastDate = mAtt[0]||m.from||null;
    const daysSince = lastDate ? Math.floor((today-new Date(lastDate))/86400000) : 999;
    return {...m, lastDate, daysSince};
  }).filter(m=>m.daysSince>=days&&m.feeStatus!=='Expired').sort((a,b)=>b.daysSince-a.daysSince);

  document.getElementById('inactiveCount').textContent = result.length;
  document.querySelectorAll('#rep-inactive .btn-sm').forEach(b=>b.classList.remove('btn-orange'));
  document.getElementById('inact-30')?.classList.remove('btn-orange');

  if(!result.length){
    document.getElementById('inactiveList').innerHTML=`<div class="empty"><div class="empty-icon">✅</div><h3>Sab active hain!</h3><p>Koi member ${days}+ days inactive nahi hai</p></div>`;
    return;
  }
  const fsBadge={Paid:'b-green',Due:'b-yellow',Expired:'b-red'};
  document.getElementById('inactiveList').innerHTML=`
    <div class="twrap"><table>
      <thead><tr><th>Member</th><th>Shift</th><th>Status</th><th>Last Seen</th><th>Days Absent</th><th>Action</th></tr></thead>
      <tbody>${result.map(m=>`<tr>
        <td><div style="font-weight:800">${m.name}</div><div style="font-size:11px;color:var(--ink3)">${m.id}</div></td>
        <td>${shiftShort(m.shift)}</td>
        <td><span class="badge ${fsBadge[m.feeStatus]}">${m.feeStatus}</span></td>
        <td style="color:var(--orange);font-weight:700">${m.lastDate?fmtDate(m.lastDate):'Never'}</td>
        <td><span class="badge ${m.daysSince>60?'b-red':m.daysSince>30?'b-orange':'b-yellow'}">${m.daysSince===999?'—':m.daysSince+' days'}</span></td>
        <td><button class="btn btn-wa btn-sm" onclick="sendWA('${m.id}','reminder',false)">📲 WA</button></td>
      </tr>`).join('')}</tbody>
    </table></div>`;
}

// ═══ LEADERBOARD ═════════════════════════════════════════════════════════════
function renderLeaderboard(){
  const thisMonth = todayStr().slice(0,7);

  // Top Attendance this month
  const attMap={};
  attendance.filter(a=>a.date.startsWith(thisMonth)&&a.present).forEach(a=>{
    attMap[a.memberId]=(attMap[a.memberId]||0)+1;
  });
  const topAtt = members.map(m=>({...m,attCount:attMap[m.id]||0}))
    .filter(m=>m.attCount>0).sort((a,b)=>b.attCount-a.attCount).slice(0,8);

  // Top Fee payers all time
  const feeMap={};
  feeRecords.forEach(r=>{ feeMap[r.memberId]=(feeMap[r.memberId]||0)+(parseFloat(r.paidAmount)||parseFloat(r.amount)||0); });
  const topFee = members.map(m=>({...m,totalPaid:feeMap[m.id]||0}))
    .filter(m=>m.totalPaid>0).sort((a,b)=>b.totalPaid-a.totalPaid).slice(0,8);

  const medals=['🥇','🥈','🥉'];
  const rankColors=['#f59e0b','#9ca3af','#b45309'];

  document.getElementById('leaderboardAtt').innerHTML = topAtt.length ? topAtt.map((m,i)=>`
    <div class="leaderboard-item">
      <div class="leaderboard-rank" style="background:${rankColors[i]||'var(--bg3)'};color:${i<3?'#fff':'var(--ink)'}">${medals[i]||i+1}</div>
      <div style="width:34px;height:34px;border-radius:9px;background:${m.color};display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:14px;flex-shrink:0">${m.name[0]}</div>
      <div style="flex:1"><div style="font-weight:800;font-size:13px">${m.name}</div><div style="font-size:11px;color:var(--ink3)">${shiftShort(m.shift)}</div></div>
      <div style="font-weight:900;color:var(--green);font-size:16px">${m.attCount}<span style="font-size:10px;color:var(--ink3);font-weight:700"> days</span></div>
    </div>`).join('') : '<div class="empty"><div class="empty-icon">📋</div><h3>Is month koi attendance nahi</h3></div>';

  document.getElementById('leaderboardFee').innerHTML = topFee.length ? topFee.map((m,i)=>`
    <div class="leaderboard-item">
      <div class="leaderboard-rank" style="background:${rankColors[i]||'var(--bg3)'};color:${i<3?'#fff':'var(--ink)'}">${medals[i]||i+1}</div>
      <div style="width:34px;height:34px;border-radius:9px;background:${m.color};display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:14px;flex-shrink:0">${m.name[0]}</div>
      <div style="flex:1"><div style="font-weight:800;font-size:13px">${m.name}</div><div style="font-size:11px;color:var(--ink3)">${m.plan}</div></div>
      <div style="font-weight:900;color:var(--blue);font-size:14px">${fmtAmt(m.totalPaid)}</div>
    </div>`).join('') : '<div class="empty"><div class="empty-icon">💰</div><h3>Koi fee record nahi</h3></div>';
}

// ═══ RETENTION RATE ══════════════════════════════════════════════════════════
function renderRetention(){
  // Monthly renewal rate — members jo renew kiye (new fee record aaya same member ka)
  const months6=[]; const retData=[];
  for(let i=5;i>=0;i--){
    const d=new Date(); d.setMonth(d.getMonth()-i);
    const ym=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    months6.push(d.toLocaleDateString('en-IN',{month:'short'}));
    const renewed=new Set(feeRecords.filter(r=>r.date&&r.date.startsWith(ym)).map(r=>r.memberId)).size;
    retData.push(renewed);
  }

  // Draw line chart
  const canvas=document.getElementById('retentionChart');
  if(canvas){
    const ctx=canvas.getContext('2d');
    const parent=canvas.parentElement;
    const W=canvas.width=parent?parent.clientWidth-32:280;
    const H=canvas.height=200;
    ctx.clearRect(0,0,W,H);
    const isDark=!document.body.classList.contains('light');
    const max=Math.max(...retData,1);
    const pad={l:34,r:16,t:20,b:32};
    const chartW=W-pad.l-pad.r; const chartH=H-pad.t-pad.b;
    const gap=chartW/(months6.length-1);

    // Grid
    ctx.strokeStyle=isDark?'#2a305033':'#c8cde833'; ctx.lineWidth=1;
    [0,0.5,1].forEach(pct=>{
      const y=pad.t+chartH*(1-pct);
      ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(W-pad.r,y); ctx.stroke();
      ctx.fillStyle=isDark?'#5a6280':'#9ca3af'; ctx.font=`700 8px 'Nunito',sans-serif`; ctx.textAlign='right';
      ctx.fillText(Math.round(max*pct),pad.l-3,y+3);
    });

    // Area fill
    ctx.beginPath();
    retData.forEach((v,i)=>{ const x=pad.l+i*gap; const y=pad.t+chartH-(v/max*chartH); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
    ctx.lineTo(pad.l+(months6.length-1)*gap, pad.t+chartH);
    ctx.lineTo(pad.l, pad.t+chartH); ctx.closePath();
    ctx.fillStyle='#10b98122'; ctx.fill();

    // Line
    ctx.beginPath(); ctx.strokeStyle='#10b981'; ctx.lineWidth=2.5; ctx.lineJoin='round';
    retData.forEach((v,i)=>{ const x=pad.l+i*gap; const y=pad.t+chartH-(v/max*chartH); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
    ctx.stroke();

    // Dots + labels
    retData.forEach((v,i)=>{
      const x=pad.l+i*gap; const y=pad.t+chartH-(v/max*chartH);
      ctx.beginPath(); ctx.arc(x,y,4,0,Math.PI*2); ctx.fillStyle='#10b981'; ctx.fill();
      ctx.strokeStyle=isDark?'#1a1f36':'#fff'; ctx.lineWidth=2; ctx.stroke();
      ctx.fillStyle=isDark?'#a8b0cc':'#3a4260'; ctx.font=`800 9px 'Nunito',sans-serif`; ctx.textAlign='center';
      if(v>0) ctx.fillText(v,x,y-8);
      ctx.fillStyle=isDark?'#5a6280':'#9ca3af'; ctx.font=`700 9px 'Nunito',sans-serif`;
      ctx.fillText(months6[i],x,H-8);
    });
  }

  // Plan-wise split
  const planMap={};
  members.forEach(m=>{ planMap[m.plan]=(planMap[m.plan]||0)+1; });
  const total=members.length||1;
  const planColors=['#3b82f6','#22c55e','#f59e0b','#a855f7','#ef4444','#10b981'];
  document.getElementById('retentionStats').innerHTML = Object.entries(planMap).sort((a,b)=>b[1]-a[1]).map(([plan,cnt],i)=>`
    <div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:800;margin-bottom:4px">
        <span style="color:${planColors[i%planColors.length]}">${plan}</span>
        <span>${cnt} members (${Math.round(cnt/total*100)}%)</span>
      </div>
      <div class="retention-bar"><div class="retention-fill" style="width:${Math.round(cnt/total*100)}%;background:${planColors[i%planColors.length]}"></div></div>
    </div>`).join('');
}

// ═══ PEAK HOURS HEATMAP ══════════════════════════════════════════════════════
function renderHeatmap(){
  const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const hours=Array.from({length:14},(_,i)=>i+7); // 7am to 8pm

  // Build heatmap from attendance check-in times
  const grid={};
  days.forEach(d=>{ grid[d]={}; hours.forEach(h=>grid[d][h]=0); });
  attendance.filter(a=>a.present&&a.in).forEach(a=>{
    const date=new Date(a.date+'T00:00:00');
    const dayName=days[date.getDay()];
    const hr=parseInt((a.in||'10:00').split(':')[0]);
    if(grid[dayName]&&grid[dayName][hr]!==undefined) grid[dayName][hr]++;
  });

  const maxVal=Math.max(...days.flatMap(d=>hours.map(h=>grid[d][h])),1);

  const headerRow=`<div></div>`+hours.map(h=>`<div style="text-align:center;font-size:9px;font-weight:800;color:var(--ink3);padding:2px 0">${h>12?h-12+'pm':h===12?'12pm':h+'am'}</div>`).join('');
  const dataRows=days.map(d=>`
    <div style="font-size:10px;font-weight:800;color:var(--ink3);display:flex;align-items:center;padding-right:6px">${d}</div>
    ${hours.map(h=>{
      const v=grid[d][h]; const pct=v/maxVal;
      const bg=pct>0.75?'#ef4444':pct>0.5?'#f97316':pct>0.25?'#f59e0b':pct>0?'#22c55e':'var(--bg3)';
      return `<div class="heatmap-cell" style="background:${bg};opacity:${pct>0?0.4+pct*0.6:0.3}" title="${d} ${h>12?h-12+'pm':h+'am'}: ${v} members">${v>0?v:''}</div>`;
    }).join('')}`).join('');

  document.getElementById('heatmapGrid').innerHTML=`
    <div style="display:grid;grid-template-columns:36px repeat(${hours.length},1fr);gap:3px;min-width:400px">
      ${headerRow}${dataRows}
    </div>
    <div style="display:flex;gap:8px;margin-top:12px;align-items:center;flex-wrap:wrap">
      <span style="font-size:11px;color:var(--ink3);font-weight:700">Low</span>
      ${['#22c55e','#f59e0b','#f97316','#ef4444'].map(c=>`<div style="width:16px;height:16px;border-radius:4px;background:${c}"></div>`).join('')}
      <span style="font-size:11px;color:var(--ink3);font-weight:700">High</span>
    </div>`;
}

// ═══ INCOME VS TARGET ════════════════════════════════════════════════════════
function renderIncomeVsTarget(){
  loadAppSettings();
  const target=appSettings.monthlyTarget||70000;
  const months12=[]; const incomeData=[];
  for(let i=11;i>=0;i--){
    const d=new Date(); d.setMonth(d.getMonth()-i);
    const ym=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    months12.push(d.toLocaleDateString('en-IN',{month:'short',year:'2-digit'}));
    incomeData.push(feeRecords.filter(r=>r.date&&r.date.startsWith(ym)).reduce((s,r)=>s+(parseFloat(r.paidAmount)||parseFloat(r.amount)||0),0));
  }

  // Canvas line chart
  const canvas=document.getElementById('targetChart');
  if(canvas){
    const ctx=canvas.getContext('2d');
    const parent=canvas.parentElement;
    const W=canvas.width=parent?parent.clientWidth-32:360;
    const H=canvas.height=220;
    ctx.clearRect(0,0,W,H);
    const isDark=!document.body.classList.contains('light');
    const maxVal=Math.max(...incomeData,target)*1.1;
    const pad={l:46,r:16,t:20,b:36};
    const chartW=W-pad.l-pad.r; const chartH=H-pad.t-pad.b;
    const gap=chartW/(months12.length-1);

    // Grid
    ctx.strokeStyle=isDark?'#2a305033':'#c8cde833'; ctx.lineWidth=1;
    [0,0.25,0.5,0.75,1].forEach(pct=>{
      const y=pad.t+chartH*(1-pct);
      ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(W-pad.r,y); ctx.stroke();
      ctx.fillStyle=isDark?'#5a6280':'#9ca3af'; ctx.font=`700 8px 'Nunito',sans-serif`; ctx.textAlign='right';
      const v=Math.round(maxVal*pct);
      ctx.fillText(v>=1000?`${Math.round(v/1000)}k`:v,pad.l-3,y+3);
    });

    // Target line (dashed orange)
    const targetY=pad.t+chartH-(target/maxVal*chartH);
    ctx.setLineDash([6,4]); ctx.strokeStyle='#f97316'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(pad.l,targetY); ctx.lineTo(W-pad.r,targetY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle='#f97316'; ctx.font=`800 9px 'Nunito',sans-serif`; ctx.textAlign='left';
    ctx.fillText(`Target ₹${target>=1000?Math.round(target/1000)+'k':target}`,pad.l+4,targetY-4);

    // Income area
    ctx.beginPath();
    incomeData.forEach((v,i)=>{ const x=pad.l+i*gap; const y=pad.t+chartH-(v/maxVal*chartH); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
    ctx.lineTo(pad.l+(months12.length-1)*gap,pad.t+chartH); ctx.lineTo(pad.l,pad.t+chartH); ctx.closePath();
    ctx.fillStyle='#22c55e22'; ctx.fill();

    // Income line
    ctx.beginPath(); ctx.strokeStyle='#22c55e'; ctx.lineWidth=2.5; ctx.lineJoin='round';
    incomeData.forEach((v,i)=>{ const x=pad.l+i*gap; const y=pad.t+chartH-(v/maxVal*chartH); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
    ctx.stroke();

    // Dots
    incomeData.forEach((v,i)=>{
      const x=pad.l+i*gap; const y=pad.t+chartH-(v/maxVal*chartH);
      const hit=v>=target;
      ctx.beginPath(); ctx.arc(x,y,4,0,Math.PI*2); ctx.fillStyle=hit?'#22c55e':'#ef4444'; ctx.fill();
      ctx.strokeStyle=isDark?'#1a1f36':'#fff'; ctx.lineWidth=2; ctx.stroke();
      ctx.fillStyle=isDark?'#5a6280':'#9ca3af'; ctx.font=`700 8px 'Nunito',sans-serif`; ctx.textAlign='center';
      ctx.fillText(months12[i],x,H-8);
    });
  }

  // Month cards below
  document.getElementById('targetMonthCards').innerHTML=months12.map((lbl,i)=>{
    const v=incomeData[i]; const hit=v>=target; const pct=Math.min(100,Math.round(v/target*100));
    return `<div style="background:var(--card);border:1.5px solid ${hit?'var(--green)':'var(--border)'};border-radius:12px;padding:12px;text-align:center">
      <div style="font-size:10px;font-weight:800;color:var(--ink3);margin-bottom:6px">${lbl}</div>
      <div style="font-size:16px;font-weight:900;color:${hit?'var(--green)':'var(--red)'}">${fmtAmt(v)}</div>
      <div style="font-size:10px;color:var(--ink3);margin:4px 0">${pct}% of target</div>
      <div style="height:5px;background:var(--bg3);border-radius:10px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${hit?'var(--green)':'var(--orange)'};border-radius:10px"></div>
      </div>
      <div style="margin-top:5px">${hit?'✅':'❌'}</div>
    </div>`;
  }).join('');
}

async function init(){
  // Check existing session
  try{
    const saved = sessionStorage.getItem('stdlib_session');
    if(saved){ currentSession = JSON.parse(saved); }
  }catch(_){ currentSession = null; }

  if(!currentSession){
    // Show login screen
    document.getElementById('loginScreen').style.display='flex';
    applyTheme();
    document.getElementById('hdate').textContent=new Date().toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'});
    return;
  }

  // Already logged in — hide login screen and show app
  document.getElementById('loginScreen').style.display='none';
  const badge = document.getElementById('userBadge');
  const avatar = document.getElementById('userBadgeAvatar');
  const name = document.getElementById('userBadgeName');
  if(badge && currentSession){
    badge.style.display='inline-flex';
    document.getElementById('logoutBtn').style.display='inline-flex';
    const isAdm = currentSession.role==='admin';
    avatar.style.background = isAdm ? 'var(--red)' : 'var(--blue)';
    avatar.textContent = isAdm ? '🔐' : '👤';
    name.textContent = (isAdm ? 'Admin' : currentSession.name) + (isAdm ? '' : ' (Employee)');
  }
  applyRoleUI();

  loadAppSettings();
  loadRecycleBin();
  applyTheme();
  document.getElementById('hdate').textContent=new Date().toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'});
  await loadData();
  renderDashboard();
  renderLockers();
  populateAllShiftDropdowns();
  // Set default attendance date
  const attDateEl = document.getElementById('attDate');
  if(attDateEl && !attDateEl.value) attDateEl.value = todayStr();
  checkAndSendExpiryAlerts();
  document.querySelectorAll('.overlay').forEach(o=>{
    o.addEventListener('click',e=>{ if(e.target===o) o.classList.remove('open'); });
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape') document.querySelectorAll('.overlay.open').forEach(o=>o.classList.remove('open'));
  });
}
init();
