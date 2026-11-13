/* Trang tài xế mở từ QR: xem lệnh, ghi chú điểm đến/cấm đường, đổi bước, tải chứng từ, quét kiện hàng lẻ. */
(function () {
  'use strict';
  var el = G.el, token = location.pathname.split('/').filter(Boolean)[1] || '';
  var API = '/api/qr/t/' + encodeURIComponent(token) + '/';
  var main = document.getElementById('main'), state = null, gps = null;
  // Vị trí (nếu tài xế cho phép) gắn vào ảnh chứng từ và mốc qua trạm – không bắt buộc
  if (navigator.geolocation) navigator.geolocation.getCurrentPosition(function (p) { gps = { lat: p.coords.latitude, lng: p.coords.longitude }; }, function () {}, { maximumAge: 300000, timeout: 8000 });
  function stamp(fd, source) {
    fd.append('device_time', new Date().toISOString());
    if (source) fd.append('capture_source', source);
    if (gps) { fd.append('lat', gps.lat.toFixed(6)); fd.append('lng', gps.lng.toFixed(6)); }
    return fd;
  }

  function load() {
    return G.api(API).then(function (j) { state = j.data; render(); })
      .catch(function (e) { G.clear(main).append(el('div', 'card center', e.status === 404 ? 'Mã QR không đúng hoặc đã bị vô hiệu hóa. Hãy liên hệ điều vận.' : e.message)); });
  }

  function kv(label, value) { var d = el('div'); d.append(el('div', 'mut small', label), el('div', 'b', value || '—')); return d; }
  function note(title, text) { var n = el('div', 'note'); n.append(el('b', null, title), document.createTextNode(text)); return n; }

  function render() {
    var s = state, frag = document.createDocumentFragment();
    document.title = 'Lệnh ' + s.trip_code;
    document.getElementById('t-title').textContent = 'Lệnh ' + s.trip_code;

    // 1. Lưu ý quan trọng nhất đặt lên đầu
    if (s.destination_notes) frag.append(note('Lưu ý điểm đến', s.destination_notes));
    if (s.road_restrictions) frag.append(note('Cấm đường / giờ cấm tải', s.road_restrictions));
    if (s.delivery_opening_hours) frag.append(note('Giờ nhận hàng tại nơi giao', s.delivery_opening_hours));

    // 2. Thông tin chuyến
    var info = el('section', 'card stack');
    var head = el('div', 'row between');
    head.append(el('div', 'b mono', s.container_number || '(chưa có số cont)'), el('span', 'pill p-info', s.step_label));
    info.append(head);
    if (s.swap_label) info.append(el('div', 'pill p-warn', s.swap_label));
    var g = el('div', 'fields');
    [['Nhận', s.pickup_location], ['Giao', s.delivery_location], ['Hạ rỗng', s.dropoff_location], ['Xe', s.tractor_plate + (s.trailer_plate ? ' / ' + s.trailer_plate : '')],
     ['Seal', s.seal_number], ['Loại cont', s.container_type]].forEach(function (p) { g.append(kv(p[0], p[1])); });
    info.append(g, el('div', 'row'));
    info.lastChild.append(G.demdetPill('DEM', s.dem), G.demdetPill('DET', s.det));
    frag.append(info);

    // 3. Tiến độ
    var steps = el('div', 'steps'), idx = s.steps.map(function (x) { return x.key; }).indexOf(s.step);
    s.steps.forEach(function (st, i) { steps.append(el('span', i < idx ? 'done' : i === idx ? 'cur' : '', st.label)); });
    var prog = el('section', 'card'); prog.append(el('h2', null, 'Tiến độ'), steps); frag.append(prog);

    // 4. Hành động chính
    if (s.locked) {
      frag.append(el('div', 'card center b', s.step === 'CANCELLED' ? 'Chuyến đã hủy.' : 'Chuyến đã hoàn tất. Cảm ơn anh/chị!'));
    } else if (s.action) frag.append(actionCard(s.action));

    // 5. Hàng lẻ có seal
    if (s.packages && s.packages.length) frag.append(packagesCard());
    // 6. Qua trạm / bãi và khai chi phí chi hộ
    if (!s.locked && s.step !== 'READY') frag.append(checkpointCard());
    if (s.step !== 'CANCELLED' && s.claim_codes && s.claim_codes.length) frag.append(claimCard());
    G.clear(main).append(frag);
  }

  function actionCard(a) {
    var card = el('section', 'card stack'), fields = {};
    card.append(el('h2', null, 'Bước tiếp theo: ' + a.label));
    if (a.needs_container_number) {
      var w = el('div'), l = el('label', 'f', 'Số container *'), i = el('input', 'in mono'); i.autocapitalize = 'characters'; i.maxLength = 30;
      l.htmlFor = i.id = 'f-cont'; w.append(l, i); card.append(w); fields.container_number = i;
    }
    if (a.needs_files) {
      var stageName = { PICKUP: 'Nhận cont/hàng', DELIVERY: 'Giao hàng', EMPTY_RETURN: 'Hạ rỗng' }[a.stage];
      card.append(el('div', 'small b', 'Bắt buộc có chứng từ chặng "' + stageName + '" (tối thiểu 1, tối đa ' + state.max_files + ' file)'));
      var up = G.uploader({ have: state.counts[a.stage] || 0, max: state.max_files, cameraOnly: !state.staff, onUpload: function (files) {
        var fd = stamp(new FormData(), state.staff ? 'staff_upload' : 'camera'); fd.append('stage', a.stage); files.forEach(function (f) { fd.append('files', f, f.name); });
        return G.api('/api/qr/t/' + encodeURIComponent(token) + '/attachments/', { method: 'POST', body: fd }).then(function (j) {
          state.counts = j.counts; state.action = j.action; G.toast('Đã tải chứng từ lên', 'ok'); render();
        });
      } });
      card.append(up);
    }
    var swap = null;
    if (a.allows_swap) {
      var chk = el('label', 'row'), cb = el('input'); cb.type = 'checkbox'; cb.style.width = cb.style.height = '24px';
      chk.append(cb, el('span', 'b', 'Đổi số cont hạ rỗng (hạ vỏ khác)'));
      var box = el('div', 'stack hidden'), n = el('input', 'in mono'), r = el('input', 'in');
      n.placeholder = 'Số cont thực tế hạ rỗng'; n.autocapitalize = 'characters'; r.placeholder = 'Lý do đổi vỏ (bắt buộc)';
      box.append(n, r); cb.onchange = function () { box.classList.toggle('hidden', !cb.checked); };
      card.append(chk, box); swap = { cb: cb, n: n, r: r };
    }
    var msg = el('div', 'err'), btn = el('button', 'btn big', a.label); btn.type = 'button';
    btn.disabled = !a.ready;
    if (!a.ready) card.append(el('div', 'small mut', 'Hãy tải ít nhất 1 chứng từ để mở nút chuyển bước.'));
    btn.onclick = function () {
      msg.textContent = ''; btn.disabled = true;
      var body = { to: a.to, fields: {} };
      if (fields.container_number) body.fields.container_number = fields.container_number.value;
      if (swap && swap.cb.checked) body.swap = { new_number: swap.n.value, reason: swap.r.value };
      G.api(API + 'step/', { method: 'POST', body: body }).then(function (j) {
        G.toast(j.message, 'ok'); return load();
      }).catch(function (e) {
        if (!e.status && !navigator.onLine && G.offlineQueue) {
          return G.offlineQueue.enqueue(API + 'step/', { method: 'POST', body: body }).then(function () {
            G.toast('Mất sóng – đã lưu tạm xác nhận bước, sẽ tự đồng bộ khi có mạng.', 'ok');
          });
        }
        msg.textContent = e.message; btn.disabled = false;
      });
    };
    card.append(msg, btn);
    return card;
  }

  // ----- hàng lẻ -----
  function packagesCard() {
    var s = state, sum = s.package_summary, card = el('section', 'card stack');
    var phase = ['READY', 'ARRIVED_AT_PICKUP'].indexOf(s.step) >= 0 ? 'PICKUP' : 'DELIVERY';
    card.append(el('h2', null, 'Kiện hàng lẻ có seal — bốc ' + sum.loaded + '/' + sum.total + ' · giao ' + sum.delivered + '/' + sum.total));
    if (sum.problem) card.append(el('div', 'pill p-bad', sum.problem + ' kiện có vấn đề (hỏng/thiếu/sai seal)'));
    var tw = el('div', 'tw'), t = el('table');
    var hr = el('tr'); ['Kiện', 'Seal', 'Tình trạng'].forEach(function (h) { hr.append(el('th', null, h)); }); t.append(hr);
    s.packages.forEach(function (p) {
      var tr = el('tr'), cls = p.status === 'DELIVERED' ? 'p-ok' : (p.status === 'DAMAGED' || p.status === 'MISSING') ? 'p-bad' : p.status === 'CREATED' ? 'p-none' : 'p-info';
      tr.append(el('td', null, p.index + '/' + p.total), el('td', 'mono', p.seal_number)); var td = el('td'); td.append(el('span', 'pill ' + cls, p.status_label)); tr.append(td); t.append(tr);
    });
    tw.append(t); card.append(tw);
    var area = el('div'), btn = el('button', 'btn big', phase === 'PICKUP' ? 'Quét kiện khi bốc lên xe' : 'Quét kiện khi giao');
    btn.type = 'button';
    btn.onclick = function () {
      btn.classList.add('hidden');
      var sc = G.scanner(area, function (text) { sc.stop(); onPackageScanned(text, phase, area, btn); }, function (e) { G.clear(area).append(el('div', 'err', e.message)); btn.classList.remove('hidden'); });
    };
    card.append(btn, area);
    return card;
  }

  function onPackageScanned(text, phase, area, btn) {
    var tok = G.tokenFromQr(text);
    if (!tok || tok.charAt(0) !== 'P') { G.clear(area).append(el('div', 'err', 'Đây không phải tem QR của kiện hàng.')); btn.classList.remove('hidden'); return; }
    var box = el('div', 'stack'), seal = el('input', 'in mono'), dmg = el('input'), lab = el('label', 'row');
    seal.placeholder = 'Nhập số seal đọc trên kiện'; seal.autocapitalize = 'characters';
    dmg.type = 'checkbox'; dmg.style.width = dmg.style.height = '24px'; lab.append(dmg, el('span', null, 'Seal rách / kiện hỏng'));
    var msg = el('div'), ok = el('button', 'btn big', 'Xác nhận kiện'); ok.type = 'button';
    ok.onclick = function () {
      ok.disabled = true;
      G.api('/api/qr/p/' + encodeURIComponent(tok) + '/scan/', { method: 'POST', body: { phase: phase, seal_seen: seal.value, damaged: dmg.checked, trip_token: token } })
        .then(function (j) {
          var bad = j.result === 'FAIL'; G.toast(bad ? 'CẢNH BÁO: ' + j.warnings.join(' ') : (j.warnings[0] || 'Kiện hợp lệ ✓'), bad ? 'bad' : 'ok');
          if (navigator.vibrate) navigator.vibrate(bad ? [200, 100, 200] : 60);
          return load();
        }).catch(function (e) { msg.className = 'err'; msg.textContent = e.message; ok.disabled = false; });
    };
    var info = el('div', 'b', 'Đã đọc tem kiện. ' + (phase === 'DELIVERY' ? 'Đối chiếu số seal thực tế trên kiện:' : 'Xác nhận bốc kiện lên xe.'));
    box.append(info); if (phase === 'DELIVERY') box.append(seal); box.append(lab, msg, ok);
    G.clear(area).append(box);
  }


  function checkpointCard() {
    var card = el('section', 'card stack'), sel = el('select', 'in'), other = el('input', 'in');
    card.append(el('h2', null, 'Qua trạm / bãi'));
    sel.setAttribute('aria-label', 'Trạm hoặc bãi'); other.placeholder = 'Tên trạm / bãi khác'; other.className = 'in hidden';
    sel.append(new Option('— Chọn nơi đang qua —', ''));
    (state.checkpoint_places || []).concat(['Kho Sóng Thần', 'Nhà máy']).forEach(function (p) { sel.append(new Option(p, p)); });
    sel.append(new Option('Nơi khác…', '__other'));
    sel.onchange = function () { other.classList.toggle('hidden', sel.value !== '__other'); };
    var btn = el('button', 'btn', 'Ghi nhận đã qua'); btn.type = 'button';
    btn.onclick = function () {
      var place = sel.value === '__other' ? other.value.trim() : sel.value;
      if (!place) { G.toast('Chọn nơi đang qua.', 'bad'); return; }
      btn.disabled = true;
      var fd = stamp(new FormData(), ''); fd.append('place', place);
      G.api(API + 'checkpoint/', { method: 'POST', body: fd })
        .then(function (j) { G.toast(j.message, 'ok'); sel.value = ''; })
        .catch(function (e) {
          if (!e.status && !navigator.onLine && G.offlineQueue) {
            return G.offlineQueue.enqueue(API + 'checkpoint/', { method: 'POST', body: fd }).then(function () {
              G.toast('Mất sóng – đã lưu tạm mốc qua trạm, sẽ tự đồng bộ khi có mạng.', 'ok'); sel.value = '';
            });
          }
          G.toast(!e.status && !navigator.onLine ? 'Mất sóng – thử lại khi có mạng.' : e.message, 'bad');
        })
        .then(function () { btn.disabled = false; });
    };
    card.append(sel, other, btn);
    return card;
  }

  function claimCard() {
    var s = state, card = el('section', 'card stack');
    card.append(el('h2', null, 'Khai chi phí chi hộ (nâng/hạ, phát sinh)'));
    (s.claims || []).forEach(function (c) {
      card.append(el('div', 'small', G.fmtDT(c.at) + ' · ' + c.charge + ' · ' + Number(c.amount).toLocaleString('vi-VN') + ' đ · ' + c.status_label));
    });
    var code = el('select', 'in'); code.setAttribute('aria-label', 'Khoản chi');
    s.claim_codes.forEach(function (c) { code.append(new Option(c.name, c.id)); });
    var amt = el('input', 'in'); amt.type = 'number'; amt.inputMode = 'numeric'; amt.min = 0; amt.placeholder = 'Số tiền (đ)'; amt.setAttribute('aria-label', 'Số tiền');
    var desc = el('input', 'in'); desc.placeholder = 'Ghi chú (nơi nâng/hạ, số hoá đơn…)'; desc.setAttribute('aria-label', 'Ghi chú');
    var cam = el('input'); cam.type = 'file'; cam.accept = 'image/*'; cam.setAttribute('capture', 'environment'); cam.className = 'hidden';
    var photo = null, preview = el('div', 'small mut', 'Chưa chụp ảnh hoá đơn');
    cam.onchange = function () { var f = cam.files[0]; if (!f) return; G.compress(f).then(function (x) { photo = x; preview.textContent = 'Đã chụp ảnh hoá đơn ✓'; preview.className = 'small okmsg'; }); };
    var shot = el('button', 'btn sec', 'Chụp ảnh hoá đơn'); shot.type = 'button'; shot.onclick = function () { cam.click(); };
    var send = el('button', 'btn big', 'Gửi khai chi phí'); send.type = 'button';
    send.onclick = function () {
      if (!photo) { G.toast('Phải chụp ảnh hoá đơn/biên lai.', 'bad'); return; }
      if (!(Number(amt.value) > 0)) { G.toast('Nhập số tiền.', 'bad'); return; }
      var fd = stamp(new FormData(), 'camera'); fd.append('charge_code_id', code.value); fd.append('amount', amt.value); fd.append('description', desc.value); fd.append('photo', photo, photo.name || 'hoadon.jpg');
      send.disabled = true;
      G.api(API + 'claims/', { method: 'POST', body: fd }).then(function (j) { G.toast(j.message, 'ok'); return load(); })
        .catch(function (e) { G.toast(!e.status && !navigator.onLine ? 'Mất sóng – thử gửi lại khi có mạng.' : e.message, 'bad'); send.disabled = false; });
    };
    card.append(code, amt, desc, shot, cam, preview, send);
    return card;
  }

  load();
})();
