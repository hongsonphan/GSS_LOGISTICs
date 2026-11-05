/* Tiện ích dùng chung cho Bảng điều hành GSS và trang tài xế (không phụ thuộc thư viện). */
window.G = (function () {
  'use strict';

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }
  function append(parent) { for (var i = 1; i < arguments.length; i++) if (arguments[i] != null) parent.append(arguments[i]); return parent; }

  function cookie(name) {
    var m = document.cookie.match('(?:^|; )' + name + '=([^;]*)');
    return m ? decodeURIComponent(m[1]) : '';
  }

  // Gọi API. Ném Error(message) với thông báo tiếng Việt từ máy chủ khi lỗi.
  function api(url, opts) {
    opts = opts || {};
    var headers = Object.assign({ 'Accept': 'application/json' }, opts.headers || {});
    var body = opts.body;
    if (body && !(body instanceof FormData) && typeof body !== 'string') {
      body = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
    }
    var method = (opts.method || 'GET').toUpperCase();
    if (method !== 'GET') headers['X-CSRFToken'] = cookie('csrftoken');
    return fetch(url, { method: method, headers: headers, body: body, credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok || j.success === false) {
            var e = new Error(j.message || j.detail || ('Lỗi ' + r.status));
            e.status = r.status; e.data = j;
            throw e;
          }
          return j;
        });
      });
  }

  var toastTimer;
  function toast(message, kind) {
    var old = document.querySelector('.toast'); if (old) old.remove();
    var t = el('div', 'toast ' + (kind || ''), message);
    t.setAttribute('role', 'status');
    document.body.append(t);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.remove(); }, kind === 'bad' ? 6000 : 3000);
  }

  function pad(n) { return String(n).padStart(2, '0'); }
  function fmtDate(iso) { if (!iso) return '—'; var p = iso.slice(0, 10).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function fmtDT(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  // Nhãn DEM/DET có chữ kèm màu
  function demdetPill(label, d) {
    var map = { ok: ['p-ok', 'Còn hạn'], warn: ['p-warn', 'Sắp hết hạn'], overdue: ['p-bad', 'QUÁ HẠN'], none: ['p-none', 'Không còn theo dõi'] };
    if (!d || !d.expiry) return el('span', 'pill p-none', label + ': chưa có hạn');
    var m = map[d.level] || map.none;
    var extra = d.level === 'none' ? '' : ' (' + (d.days_left < 0 ? 'quá ' + (-d.days_left) : 'còn ' + d.days_left) + ' ngày)';
    return el('span', 'pill ' + m[0], label + ' ' + fmtDate(d.expiry) + ' · ' + m[1] + extra);
  }

  // Nén ảnh phía trình duyệt cho mạng yếu; PDF và file nhỏ giữ nguyên
  function compress(file) {
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type) || file.size < 400 * 1024) return Promise.resolve(file);
    return new Promise(function (resolve) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var max = 1600, s = Math.min(1, max / Math.max(img.width, img.height));
        var c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) {
          if (!b || b.size >= file.size) return resolve(file);
          resolve(new File([b], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.8);
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  // Khối tải file: kéo-thả, chọn nhiều, chụp camera, dán Ctrl+V; giới hạn còn lại hiển thị rõ.
  // opts: {have, max, onUpload(files) -> Promise}
  function uploader(opts) {
    var wrap = el('div', 'drop');
    var info = el('div', 'small mut');
    var status = el('div', 'small');
    var bar = el('div', 'prog hidden'), barFill = el('i'); bar.append(barFill);
    var thumbs = el('div', 'thumbs');
    var pending = [];
    var left = function () { return Math.max(0, opts.max - opts.have - pending.length); };
    function refresh() { info.textContent = 'Đã có ' + opts.have + '/' + opts.max + ' file · còn nhận thêm ' + left() + ' file (ảnh JPG/PNG hoặc PDF)'; }

    function addFiles(list) {
      var files = Array.prototype.slice.call(list || []);
      if (!files.length) return;
      if (files.length > left()) { status.className = 'small err'; status.textContent = 'Chỉ còn nhận thêm ' + left() + ' file, hãy bớt file.'; files = files.slice(0, left()); }
      if (!files.length) return;
      Promise.all(files.map(compress)).then(function (done) {
        done.forEach(function (f) {
          pending.push(f);
          var t = el('div', 'thumb');
          if (/^image\//.test(f.type)) { var im = el('img', 'thumb'); im.alt = f.name; im.src = URL.createObjectURL(f); t = im; } else t.textContent = 'PDF';
          thumbs.append(t);
        });
        sendBtn.disabled = !pending.length; refresh();
      });
    }
    var file = el('input'); file.type = 'file'; file.multiple = true; file.accept = 'image/jpeg,image/png,application/pdf'; file.className = 'hidden';
    var cam = el('input'); cam.type = 'file'; cam.accept = 'image/*'; cam.setAttribute('capture', 'environment'); cam.className = 'hidden';
    file.addEventListener('change', function () { addFiles(file.files); file.value = ''; });
    cam.addEventListener('change', function () { addFiles(cam.files); cam.value = ''; });
    var pick = el('button', 'btn sec sm', 'Chọn file'); pick.type = 'button'; pick.onclick = function () { file.click(); };
    var shot = el('button', 'btn sec sm', 'Chụp ảnh'); shot.type = 'button'; shot.onclick = function () { cam.click(); };
    var sendBtn = el('button', 'btn sm', 'Tải lên'); sendBtn.type = 'button'; sendBtn.disabled = true;
    sendBtn.onclick = function () {
      if (!pending.length) return;
      sendBtn.disabled = true; bar.classList.remove('hidden'); barFill.style.width = '30%'; status.className = 'small'; status.textContent = 'Đang tải lên…';
      Promise.resolve(opts.onUpload(pending.slice())).then(function () {
        pending = []; clear(thumbs); status.className = 'small okmsg'; status.textContent = 'Đã tải lên.';
      }).catch(function (e) {
        status.className = 'small err'; status.textContent = e.message || 'Tải lên thất bại, thử lại.'; sendBtn.disabled = false;
      }).then(function () { bar.classList.add('hidden'); barFill.style.width = '0'; refresh(); });
    };
    wrap.addEventListener('dragover', function (e) { e.preventDefault(); wrap.classList.add('over'); });
    wrap.addEventListener('dragleave', function () { wrap.classList.remove('over'); });
    wrap.addEventListener('drop', function (e) { e.preventDefault(); wrap.classList.remove('over'); addFiles(e.dataTransfer.files); });
    wrap.addEventListener('paste', function (e) { addFiles(e.clipboardData && e.clipboardData.files); });
    wrap.tabIndex = 0; wrap.setAttribute('aria-label', 'Vùng tải file: kéo thả, hoặc bấm vào rồi nhấn Ctrl+V để dán ảnh');
    var row = el('div', 'row'); row.style.justifyContent = 'center';
    append(row, pick, shot, sendBtn);
    append(wrap, info, el('div', 'small mut', 'Kéo thả, chụp ảnh, hoặc nhấn vào đây rồi Ctrl+V để dán'), row, bar, thumbs, status, file, cam);
    wrap.setHave = function (n) { opts.have = n; refresh(); };
    refresh();
    return wrap;
  }

  // Quét QR bằng camera (html5-qrcode, tự host). onText(text) gọi khi đọc được; trả về { stop() }.
  function scanner(container, onText, onError) {
    clear(container);
    var id = 'qr-reader-' + Math.random().toString(36).slice(2, 8);
    var box = el('div'); box.id = id; box.className = 'scanbox'; container.append(box);
    var inst = null, stopped = false;
    function boot() {
      if (typeof Html5Qrcode === 'undefined') { onError && onError(new Error('Không tải được thư viện quét QR.')); return; }
      inst = new Html5Qrcode(id);
      inst.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 240, height: 240 } }, function (text) {
        if (stopped) return;
        stopped = true; if (navigator.vibrate) navigator.vibrate(60);
        inst.stop().catch(function () {}).then(function () { onText(text); });
      }, function () {}).catch(function (e) {
        onError && onError(new Error('Không mở được camera (cần cấp quyền và dùng HTTPS hoặc localhost). ' + (e && e.message ? e.message : '')));
      });
    }
    if (typeof Html5Qrcode === 'undefined') {
      var s = document.createElement('script'); s.src = '/static/vendor/html5-qrcode/html5-qrcode.min.js'; s.onload = boot;
      s.onerror = function () { onError && onError(new Error('Không tải được thư viện quét QR.')); };
      document.head.append(s);
    } else boot();
    return { stop: function () { stopped = true; if (inst) { try { inst.stop().catch(function () {}); } catch (e) {} } } };
  }

  // Lấy token từ nội dung QR (URL đầy đủ /q/<token>/ hoặc chính token)
  function tokenFromQr(text) {
    var m = String(text || '').match(/([TP]\d{1,12}\.[A-Za-z0-9_-]{16})/);
    return m ? m[1] : '';
  }

  return { el: el, clear: clear, append: append, api: api, toast: toast, fmtDate: fmtDate, fmtDT: fmtDT, demdetPill: demdetPill,
           compress: compress, uploader: uploader, scanner: scanner, tokenFromQr: tokenFromQr, cookie: cookie };
})();
