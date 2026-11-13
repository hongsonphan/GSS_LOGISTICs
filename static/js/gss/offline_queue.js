/* Hàng đợi ngoại tuyến (IndexedDB) cho Tài xế QR / Nhân viên bãi ở vùng sóng yếu. */
(function (G) {
  'use strict';
  if (!G) return;
  var DB_NAME = 'gss_offline_v1', STORE = 'queue', dbPromise = null;

  function openDb() {
    if (!window.indexedDB) return Promise.reject(new Error('IndexedDB không khả dụng'));
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      };
      req.onsuccess = function (e) { resolve(e.target.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }

  function serializeFormData(fd) {
    var entries = [];
    if (!fd || !fd.forEach) return entries;
    fd.forEach(function (val, key) {
      if (val instanceof Blob) entries.push({ key: key, blob: val, name: val.name || 'file.jpg', isFile: true });
      else entries.push({ key: key, val: String(val), isFile: false });
    });
    return entries;
  }

  function rebuildBody(item) {
    if (item.kind === 'json') return item.body;
    var fd = new FormData();
    (item.entries || []).forEach(function (e) {
      if (e.isFile) fd.append(e.key, e.blob, e.name);
      else fd.append(e.key, e.val);
    });
    return fd;
  }

  function updateBanner(cnt) {
    var b = document.getElementById('gss-offline-banner');
    if (!b) {
      if (!cnt && navigator.onLine) return;
      b = document.createElement('div');
      b.id = 'gss-offline-banner';
      b.style.cssText = 'position:fixed;bottom:12px;left:12px;right:12px;z-index:9999;background:#1e293b;color:#f8fafc;padding:10px 14px;border-radius:12px;font:600 12px/1.4 sans-serif;display:flex;align-items:center;justify-content:space-between;gap:10px;box-shadow:0 8px 24px rgba(0,0,0,0.25);';
      document.body.appendChild(b);
    }
    if (!cnt && navigator.onLine) { b.remove(); return; }
    var txt = !navigator.onLine ? ('Đang mất sóng' + (cnt ? ' · ' + cnt + ' thao tác chờ đồng bộ' : '')) : (cnt + ' thao tác chờ đồng bộ');
    b.innerHTML = '<span>' + txt + '</span>' + (cnt && navigator.onLine ? '<button type="button" id="gss-sync-btn" style="background:#0d9488;color:#fff;border:0;border-radius:8px;padding:6px 10px;font-weight:700;cursor:pointer;">Đồng bộ ngay</button>' : '');
    var btn = document.getElementById('gss-sync-btn');
    if (btn) btn.onclick = function () { G.offlineQueue.flush(); };
  }

  function listAll() {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readonly'), req = tx.objectStore(STORE).getAll();
        req.onsuccess = function () { resolve(req.result || []); };
        req.onerror = function () { reject(req.error); };
      });
    }).catch(function () { return []; });
  }

  function removeOne(id) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(id);
        tx.oncomplete = resolve;
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  G.offlineQueue = {
    enqueue: function (url, opts) {
      opts = opts || {};
      var isFd = (typeof FormData !== 'undefined') && (opts.body instanceof FormData);
      var item = {
        url: url,
        method: opts.method || 'POST',
        kind: isFd ? 'formdata' : 'json',
        entries: isFd ? serializeFormData(opts.body) : null,
        body: isFd ? null : opts.body,
        created_at: Date.now()
      };
      return openDb().then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).add(item);
          tx.oncomplete = function () { G.offlineQueue.refresh(); resolve(true); };
          tx.onerror = function () { reject(tx.error); };
        });
      });
    },
    refresh: function () {
      return listAll().then(function (items) { updateBanner(items.length); return items.length; });
    },
    flush: function () {
      if (!navigator.onLine) return Promise.resolve(0);
      return listAll().then(function (items) {
        if (!items.length) { updateBanner(0); return 0; }
        var sent = 0, seq = Promise.resolve();
        items.forEach(function (item) {
          seq = seq.then(function () {
            return G.api(item.url, { method: item.method, body: rebuildBody(item) })
              .then(function () { sent += 1; return removeOne(item.id); })
              .catch(function (e) { if (e && e.status >= 400 && e.status < 500) return removeOne(item.id); });
          });
        });
        return seq.then(function () {
          return G.offlineQueue.refresh().then(function () {
            if (sent && G.toast) G.toast('Đã đồng bộ ' + sent + ' thao tác ngoại tuyến ✓', 'ok');
            return sent;
          });
        });
      });
    }
  };

  window.addEventListener('online', function () { G.offlineQueue.flush(); });
  window.addEventListener('offline', function () { G.offlineQueue.refresh(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { G.offlineQueue.flush(); });
  else G.offlineQueue.flush();
})(window.G);
