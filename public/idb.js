// ═══════════════════════════════════════════════════════════════════
// AR_IDB — IndexedDB module for storing photos & aadhar images locally
// Images server pe nahi jaate, sirf browser mein save hote hain
// Refresh ke baad bhi dikhai dete hain
// ═══════════════════════════════════════════════════════════════════
const AR_IDB = (() => {
  const DB_NAME = 'YugvandanaLibraryImages';
  const DB_VERSION = 1;
  const STORE = 'memberImages';
  let _db = null;

  function openDB() {
    if (_db) return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'memberId' });
        }
      };
      req.onsuccess = e => { _db = e.target.result; resolve(_db); };
      req.onerror   = e => { console.error('IDB open error', e); reject(e); };
    });
  }

  async function saveImages(memberId, { photo, aadharImg }) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      // Sirf naye images save karo — null aane pe existing ko rakho
      const getReq = store.get(memberId);
      getReq.onsuccess = () => {
        const existing = getReq.result || { memberId };
        if (photo     !== undefined) existing.photo     = photo;
        if (aadharImg !== undefined) existing.aadharImg = aadharImg;
        store.put(existing);
      };
      tx.oncomplete = () => resolve();
      tx.onerror    = e  => reject(e);
    });
  }

  async function getImages(memberId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(memberId);
      req.onsuccess = () => resolve(req.result || {});
      req.onerror   = e  => reject(e);
    });
  }

  async function getAllImages() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => {
        // memberId -> { photo, aadharImg } map banao
        const map = {};
        (req.result || []).forEach(r => { map[r.memberId] = r; });
        resolve(map);
      };
      req.onerror = e => reject(e);
    });
  }

  async function deleteImages(memberId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(memberId);
      tx.oncomplete = () => resolve();
      tx.onerror    = e  => reject(e);
    });
  }

  return { saveImages, getImages, getAllImages, deleteImages };
})();
