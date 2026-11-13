/* Đơn hàng theo B/L: danh sách cont (dán/Excel, kiểm tra ISO 6346 từng dòng), phân bổ từng cont cho nhà xe (giao diện + Excel hai pha),
   tờ khai hải quan, áp quy tắc DEM/DET, lệnh điều vận in, phiếu giao hàng theo điểm giao, chứng từ đặt tên chuẩn (cây thư mục + zip).
   Dựng DOM bằng textContent (không innerHTML). Gắn vào chi tiết booking qua GSSApp.blCards. */
(function () {
  'use strict';
  var A = window.GSSApp, ui = A.ui, el = G.el, api = G.api;
  if (!A) return;

  function fmtKg(v) { return v ? Number(v).toLocaleString('vi-VN') : ''; }
  function stepCls(s) { return s === 'EMPTY_RETURNED' ? 't-ok' : s === 'CANCELLED' ? 't-bad' : s && s !== 'READY' ? 't-info' : 't-mut'; }
  function th(row, labels) { labels.forEach(function (h) { var arr = Array.isArray(h), c = el('th', null, arr ? h[0] : h); if (arr && h[1]) c.className = h[1]; row.append(c); }); }

  function blCards(b, reload) {
    var root = el('div', 'stack'), contCard = el('section', 'card stack');
    root.append(contCard);
    paintContainers(contCard, b, reload);
    root.append(customsCard(b), stopsCard(b), docsTreeCard(b));
    return [root];
  }

  // ---------------- danh sách cont + phân bổ ----------------
  function paintContainers(card, b, reload) {
    G.clear(card).append(el('h2', null, 'Danh sách cont theo B/L'), el('div', 'mut small', 'Đang tải…'));
    Promise.all([api('/api/gss/bookings/' + b.id + '/containers/'), A.loadMasters()]).then(function (r) {
      var d = r[0].data, m = r[1], conts = d.containers, p = d.progress, selected = {};
      G.clear(card);
      var head = el('div', 'row between');
      head.append(el('h2', null, 'Danh sách cont theo B/L (' + conts.length + ')'),
        el('div', 'small', 'Đã phân bổ ' + p.allocated + ' · có xe ' + p.assigned_truck + ' · đang chạy ' + p.running + ' · đã giao ' + p.delivered + ' · hoàn tất ' + p.done));
      card.append(head);
      var tools = el('div', 'row');
      tools.append(ui.btn('Nhập cont (dán / Excel)', 'sm', function () { importDrawer(b, function () { paintContainers(card, b, reload); reload(); }); }));
      if (conts.length) {
        var tpl = el('a', 'btn sec sm', 'Tải file mẫu phân bổ'); tpl.href = '/api/gss/bookings/' + b.id + '/allocation-template/';
        tools.append(tpl, ui.btn('Nhập file phân bổ', 'sec sm', function () { allocImport(b, function () { paintContainers(card, b, reload); reload(); }); }));
        tools.append(ui.btn('In lệnh điều vận tổng', 'sec sm', function () { window.open('/api/gss/bookings/' + b.id + '/dispatch-order/', '_blank', 'noopener'); }));
      }
      tools.append(ui.btn('Áp quy tắc DEM/DET', 'sec sm', function () {
        api('/api/gss/bookings/' + b.id + '/apply-free-time/', { method: 'POST', body: {} }).then(function (j) { G.toast(j.message, 'ok'); reload(); }).catch(function (e) { G.toast(e.message, 'bad'); });
      }));
      card.append(tools);
      if (!conts.length) {
        card.append(el('div', 'note', 'Chưa có danh sách cont. Dán danh sách cont từ email/Excel (mỗi dòng: SỐ CONT  LOẠI  SEAL  TRỌNG LƯỢNG) để phân bổ từng cont cho nhà xe. Nếu không nhập danh sách, vẫn có thể chia theo số lượng như trước.'));
        return;
      }
      // thanh thao tác hàng loạt
      var bulk = el('div', 'row'), sel = el('select', 'in'), count = el('span', 'small mut', 'Chưa chọn cont nào');
      sel.style.maxWidth = '240px'; sel.setAttribute('aria-label', 'Nhà xe nhận cont');
      sel.append(new Option('— Chọn nhà xe —', ''));
      m.carriers.forEach(function (s) { sel.append(new Option((s.code ? s.code + ' · ' : '') + (s.short_name || s.name), s.id)); });
      function ids() { return Object.keys(selected).filter(function (k) { return selected[k]; }).map(Number); }
      function refreshCount() { var n = ids().length; count.textContent = n ? 'Đã chọn ' + n + ' cont' : 'Chưa chọn cont nào'; }
      function doAssign(sid) {
        var list = ids(); if (!list.length) { G.toast('Hãy tích chọn cont.', 'bad'); return; }
        if (sid === undefined && !sel.value) { G.toast('Hãy chọn nhà xe.', 'bad'); return; }
        var body = { container_ids: list, subcontractor_id: sid === null ? null : Number(sel.value) };
        var hasTrip = conts.some(function (c) { return list.indexOf(c.id) >= 0 && c.trip_code; });
        if (hasTrip) { var why = ui.ask('Một số cont đã có chuyến ở bước "Sẵn sàng" – chuyến cũ sẽ bị huỷ. Gõ lý do đổi nhà xe (≥ 5 ký tự):'); if (!why || why.length < 5) return; body.reason = why; }
        api('/api/gss/bookings/' + b.id + '/containers/assign/', { method: 'POST', body: body }).then(function (j) {
          G.toast(j.message, j.data.errors.length ? 'bad' : 'ok');
          j.data.errors.forEach(function (e) { G.toast(e, 'bad'); });
          var done = function () { paintContainers(card, b, reload); reload(); };
          if (j.link) A.showLink(j.link).then(done); else done();
        }).catch(function (e) { G.toast(e.message, 'bad'); });
      }
      bulk.append(count, sel, ui.btn('Giao cho nhà xe', 'sm', function () { doAssign(); }), ui.btn('Bỏ phân bổ', 'sec sm', function () { doAssign(null); }));
      card.append(bulk);
      // bảng cont
      var tw = el('div', 'tw'), t = el('table', 'erp'), hr = el('tr'), all = el('input');
      all.type = 'checkbox'; all.setAttribute('aria-label', 'Chọn tất cả cont');
      var c0 = el('th'); c0.append(all); hr.append(c0);
      th(hr, ['STT', 'Số cont', 'Loại', 'Seal', ['Trọng lượng (kg)', 'num'], 'Nơi giao', 'Nhà xe', 'Chuyến · bước', 'Xe · tài xế', 'Hạn DEM / DET', '']);
      t.append(hr);
      var boxes = [];
      conts.forEach(function (c) {
        var tr = el('tr'), cb = el('input'); cb.type = 'checkbox'; cb.disabled = c.locked; cb.setAttribute('aria-label', 'Chọn ' + c.container_number);
        cb.onchange = function () { selected[c.id] = cb.checked; refreshCount(); }; boxes.push(cb);
        var td0 = el('td'); td0.append(cb);
        var trip = el('td');
        if (c.trip_code) { var a = el('a', 'mono', c.trip_code); a.href = '#'; a.onclick = function (e) { e.preventDefault(); A.openTrip(c.trip_code); }; trip.append(a, el('div', 'small ' + stepCls(c.step_status), c.step_label)); }
        else trip.append(el('span', 'small t-mut', c.vendor ? 'Chờ nhà xe nhập xe' : 'Chưa phân bổ'));
        var vend = el('td', c.vendor ? 'b' : 't-mut', c.vendor || '—');
        var edit = el('td'); edit.append(ui.btn('Sửa', 'sec sm', function () { editContainer(c, m, function () { paintContainers(card, b, reload); }); }));
        var contTd = el('td', 'mono b');
        if (c.is_twin_container && c.container_number_2) {
          contTd.append(el('div', 'small', c.container_number), el('div', 'small t-mut', '+ ' + c.container_number_2 + ' (Kẹp 20\')'));
        } else {
          contTd.textContent = c.container_number;
        }
        tr.append(td0, el('td', 'num', String(c.line_no)), contTd, el('td', null, c.container_type), el('td', 'mono', c.seal_number),
          el('td', 'num', fmtKg(c.gross_weight_kg)), el('td', null, c.delivery_loc || c.delivery_address || 'Theo B/L'), vend, trip,
          el('td', 'small', (c.tractor_plate || '') + (c.driver_name ? ' · ' + c.driver_name : '')),
          el('td', 'small', G.fmtDate(c.dem_expiry) + ' / ' + G.fmtDate(c.det_expiry)), edit);
        t.append(tr);
      });
      all.onchange = function () { boxes.forEach(function (cb, i) { if (!cb.disabled) { cb.checked = all.checked; selected[conts[i].id] = all.checked; } }); refreshCount(); };
      tw.append(t); card.append(tw);
      // in lệnh theo nhà xe
      var vendors = {};
      conts.forEach(function (c) { if (c.vendor_id) vendors[c.vendor_id] = c.vendor; });
      if (Object.keys(vendors).length) {
        var pr = el('div', 'row small'); pr.append(el('span', 'mut', 'In lệnh chi tiết theo nhà xe:'));
        Object.keys(vendors).forEach(function (id) { pr.append(ui.btn(vendors[id], 'sec sm', function () { window.open('/api/gss/bookings/' + b.id + '/dispatch-order/?vendor=' + id, '_blank', 'noopener'); })); });
        card.append(pr);
      }
    }).catch(function (e) { G.clear(card).append(el('div', 'err', e.message)); });
  }

  function importDrawer(b, done) {
    var body = ui.openDrawer('Nhập danh sách cont · ' + b.code);
    var ta = el('textarea', 'in mono'); ta.rows = 10; ta.placeholder = 'MSCU1234565\t40HC\tSEAL123\t24500\nTGHU1000013 40HC'; ta.id = 'bl-paste';
    var lab = el('label', 'f', 'Dán danh sách cont (mỗi dòng một cont: số cont, loại, seal, trọng lượng kg – phân tách bằng tab, dấu phẩy hoặc khoảng trắng)'); lab.htmlFor = ta.id;
    var file = el('input'); file.type = 'file'; file.accept = '.xlsx'; file.id = 'bl-xlsx';
    var flab = el('label', 'f', 'Hoặc chọn file Excel (.xlsx: cột A số cont, B loại, C seal, D trọng lượng)'); flab.htmlFor = file.id;
    var out = el('div', 'stack');
    function send(commit) {
      var fd = new FormData();
      if (file.files[0]) fd.append('file', file.files[0]); else fd.append('text', ta.value);
      fd.append('commit', commit ? '1' : '0');
      return api('/api/gss/bookings/' + b.id + '/containers/', { method: 'POST', body: fd });
    }
    var check = ui.btn('Kiểm tra', '', function () {
      check.disabled = true;
      send(false).then(function (j) { paint(j); }).catch(function (e) { G.clear(out).append(el('div', 'err', e.message)); }).then(function () { check.disabled = false; });
    });
    function paint(j) {
      var d = j.data; G.clear(out);
      out.append(el('div', d.errors ? 'err' : 'okmsg', j.message));
      var tw = el('div', 'tw'), t = el('table', 'erp'), hr = el('tr'); th(hr, ['Dòng', 'Số cont', 'Loại', 'Seal', 'Kết quả']); t.append(hr);
      d.results.forEach(function (r) {
        var tr = el('tr'); tr.append(el('td', 'num', String(r.source_line)), el('td', 'mono', r.container_number || r.raw), el('td', null, r.container_type), el('td', 'mono', r.seal_number),
          el('td', r.ok ? 't-ok small' : 't-bad small', r.ok ? (r.action === 'UPDATE' ? 'Cập nhật cont đã có' : 'Thêm mới') : r.errors.join(' ')));
        t.append(tr);
      });
      tw.append(t); out.append(tw);
      if (!d.errors && d.valid) {
        var ok = ui.btn('Xác nhận ghi ' + d.valid + ' cont', 'big', function () {
          ok.disabled = true;
          send(true).then(function (j2) { G.toast(j2.message, 'ok'); body.close(); done(); }).catch(function (e) { G.toast(e.message, 'bad'); ok.disabled = false; });
        });
        out.append(ok);
      }
    }
    body.append(el('div', 'note', 'Số cont được chuẩn hoá chữ hoa, bỏ khoảng trắng và kiểm tra chữ số cuối theo ISO 6346. Có dòng lỗi thì không ghi gì; sửa rồi kiểm tra lại. Nhập lại cont đã có chỉ cập nhật, không tạo trùng.'),
      lab, ta, flab, file, check, out);
  }

  function editContainer(c, m, done) {
    var body = ui.openDrawer('Cont ' + c.container_number), g = el('div', 'formgrid'), v = {};
    function add(key, label, input) { var w = el('div'), l = el('label', 'f', label); l.htmlFor = input.id = 'bc-' + key; w.append(l, input); g.append(w); v[key] = input; }
    function txt(val) { var i = el('input', 'in'); i.value = val || ''; return i; }
    function dt(val) { var i = el('input', 'in'); i.type = 'date'; i.value = val || ''; return i; }
    var loc = el('select', 'in'); loc.append(new Option('— Theo nơi giao của B/L —', '')); m.locations.forEach(function (x) { loc.append(new Option(x.name, x.id)); }); loc.value = c.delivery_loc_id || '';
    add('container_type', 'Loại cont', txt(c.container_type)); add('seal_number', 'Seal', txt(c.seal_number));
    var w = txt(c.gross_weight_kg); w.type = 'number'; w.min = 0; add('gross_weight_kg', 'Trọng lượng (kg)', w);
    add('delivery_loc_id', 'Nơi giao riêng (giao nhiều điểm)', loc); add('delivery_address', 'Hoặc địa chỉ giao (nếu chưa có trong danh mục)', txt(c.delivery_address));
    add('dem_expiry_override', 'Hạn DEM riêng của cont', dt(c.dem_expiry_override)); add('det_expiry_override', 'Hạn DET riêng của cont', dt(c.det_expiry_override));
    add('notes', 'Ghi chú', txt(c.notes));
    var msg = el('div', 'err');
    var save = ui.btn('Lưu', 'big', function () {
      var data = {}; Object.keys(v).forEach(function (k) { data[k] = v[k].value || null; });
      data.delivery_loc_id = loc.value ? Number(loc.value) : null; save.disabled = true;
      api('/api/gss/containers/' + c.id + '/', { method: 'PATCH', body: data }).then(function (j) { G.toast(j.message, 'ok'); body.close(); done(); })
        .catch(function (e) { msg.textContent = e.message; save.disabled = false; });
    });
    var del = ui.btn('Xoá cont khỏi danh sách', 'bad sm', function () {
      if (!window.confirm('Xoá cont ' + c.container_number + ' khỏi danh sách B/L?')) return;
      api('/api/gss/containers/' + c.id + '/', { method: 'DELETE', body: {} }).then(function (j) { G.toast(j.message, 'ok'); body.close(); done(); }).catch(function (e) { G.toast(e.message, 'bad'); });
    });
    body.append(g, msg, save, del);
  }

  function allocImport(b, done) {
    var body = ui.openDrawer('Nhập file phân bổ · ' + b.code), file = el('input'), out = el('div', 'stack');
    file.type = 'file'; file.accept = '.xlsx'; file.id = 'alloc-file';
    var lab = el('label', 'f req', 'File phân bổ đã điền mã nhà xe (cột "Mã nhà xe (điền)")'); lab.htmlFor = file.id;
    var check = ui.btn('Kiểm tra & xem trước', '', function () {
      if (!file.files[0]) { G.toast('Chọn file trước.', 'bad'); return; }
      var fd = new FormData(); fd.append('file', file.files[0]); check.disabled = true;
      api('/api/gss/bookings/' + b.id + '/allocation-import/', { method: 'POST', body: fd }).then(function (j) { paint(j); })
        .catch(function (e) { G.clear(out).append(el('div', 'err', e.message)); }).then(function () { check.disabled = false; });
    });
    function paint(j) {
      var d = j.data; G.clear(out);
      var s = d.summary;
      out.append(el('div', d.errors ? 'err' : 'okmsg', j.message),
        el('div', 'small', 'Giao mới ' + s.ASSIGN + ' · đổi nhà xe ' + s.CHANGE + ' · bỏ phân bổ ' + s.UNASSIGN + ' · giữ nguyên ' + s.NOCHANGE + ' · lỗi ' + s.ERROR));
      if (d.stale) out.append(el('div', 'note', 'Danh sách cont đã thay đổi sau khi tải file mẫu. Kiểm tra kỹ trước khi xác nhận.'));
      var tw = el('div', 'tw'), t = el('table', 'erp'), hr = el('tr'); th(hr, ['Dòng', 'Số cont', 'Từ', 'Sang', 'Thao tác', 'Lỗi']); t.append(hr);
      var LBL = { ASSIGN: 'Giao mới', CHANGE: 'Đổi nhà xe', UNASSIGN: 'Bỏ phân bổ', NOCHANGE: 'Giữ nguyên', ERROR: 'Lỗi' };
      d.rows.forEach(function (r) {
        var tr = el('tr'); tr.append(el('td', 'num', String(r.row)), el('td', 'mono', r.container_number), el('td', null, r.from), el('td', null, r.to),
          el('td', r.action === 'ERROR' ? 't-bad' : r.action === 'NOCHANGE' ? 't-mut' : 't-info', LBL[r.action]), el('td', 't-bad small', r.errors.join('; ')));
        t.append(tr);
      });
      tw.append(t); out.append(tw);
      if (d.errors) {
        var ef = ui.btn('Tải file kết quả (đánh dấu ô lỗi)', 'sec', function () {
          var fd = new FormData(); fd.append('file', file.files[0]);
          fetch('/api/gss/bookings/' + b.id + '/allocation-import/?as=xlsx', { method: 'POST', body: fd, credentials: 'same-origin', headers: { 'X-CSRFToken': G.cookie('csrftoken') } })
            .then(function (r) { return r.blob(); }).then(function (blob) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'loi-phan-bo-' + b.code + '.xlsx'; a.click(); });
        });
        out.append(ef);
      }
      if (d.token) {
        var reason = el('input', 'in'); reason.placeholder = 'Lý do (nếu đổi nhà xe cont đã có chuyến)';
        var ok = ui.btn('Xác nhận áp dụng ' + d.changes + ' thay đổi', 'big', function () {
          ok.disabled = true;
          api('/api/gss/bookings/' + b.id + '/allocation-import/commit/', { method: 'POST', body: { token: d.token, reason: reason.value } }).then(function (j2) {
            G.toast(j2.message, 'ok'); (j2.data.errors || []).forEach(function (e) { G.toast(e, 'bad'); }); body.close(); done();
          }).catch(function (e) { G.toast(e.message, 'bad'); ok.disabled = false; });
        });
        out.append(reason, ok);
      }
    }
    body.append(el('div', 'note', 'Pha 1 chỉ kiểm tra và xem trước, chưa ghi gì. Bấm xác nhận để ghi. File mẫu có mã phiên bản ẩn: file của đơn khác bị từ chối; nhập lại cùng file không tạo trùng.'), lab, file, check, out);
  }

  // ---------------- tờ khai ----------------
  function customsCard(b) {
    var card = el('section', 'card stack');
    function paint() {
      api('/api/gss/bookings/' + b.id + '/customs/').then(function (j) {
        G.clear(card).append(el('h2', null, 'Tờ khai hải quan (' + j.data.length + ')'));
        j.data.forEach(function (c) {
          var r = el('div', 'row between');
          r.append(el('span', 'mono b', c.number), el('span', 'small', G.fmtDate(c.declared_on) + ' · ' + c.channel_label + (c.note ? ' · ' + c.note : '')),
            ui.btn('Xoá', 'sec sm', function () { api('/api/gss/customs/' + c.id + '/', { method: 'DELETE', body: {} }).then(paint).catch(function (e) { G.toast(e.message, 'bad'); }); }));
          card.append(r);
        });
        var f = el('div', 'row'), num = el('input', 'in mono'), day = el('input', 'in'), ch = el('select', 'in');
        num.placeholder = 'Số tờ khai'; num.setAttribute('aria-label', 'Số tờ khai'); day.type = 'date'; day.setAttribute('aria-label', 'Ngày tờ khai');
        [['', 'Chưa phân luồng'], ['GREEN', 'Luồng xanh'], ['YELLOW', 'Luồng vàng'], ['RED', 'Luồng đỏ']].forEach(function (o) { ch.append(new Option(o[1], o[0])); });
        num.style.maxWidth = '200px'; day.style.maxWidth = '170px'; ch.style.maxWidth = '170px';
        f.append(num, day, ch, ui.btn('Thêm tờ khai', 'sm', function () {
          api('/api/gss/bookings/' + b.id + '/customs/', { method: 'POST', body: { number: num.value, declared_on: day.value, channel: ch.value } }).then(function (j2) { G.toast(j2.message, 'ok'); paint(); }).catch(function (e) { G.toast(e.message, 'bad'); });
        }));
        card.append(f);
      }).catch(function (e) { G.clear(card).append(el('div', 'err', e.message)); });
    }
    paint(); return card;
  }

  // ---------------- phiếu giao hàng theo điểm giao ----------------
  function stopsCard(b) {
    var card = el('section', 'card stack');
    function paint() {
      api('/api/gss/bookings/' + b.id + '/delivery-notes/').then(function (j) {
        var d = j.data; G.clear(card).append(el('h2', null, 'Phiếu giao hàng theo điểm giao'));
        d.stops.forEach(function (s) {
          var r = el('div', 'row between');
          r.append(el('div', null, s.label + ' · ' + s.containers.length + ' cont (' + s.trips.length + ' đã có xe)'),
            ui.btn('Lập phiếu giao hàng', 'sm', function () {
              api('/api/gss/bookings/' + b.id + '/delivery-notes/', { method: 'POST', body: { stop_key: s.key } }).then(function (j2) {
                G.toast(j2.message, 'ok'); window.open('/api/gss/delivery-notes/' + j2.data.id + '/', '_blank', 'noopener'); paint();
              }).catch(function (e) { G.toast(e.message, 'bad'); });
            }));
          card.append(r);
        });
        if (d.notes.length) {
          var tw = el('div', 'tw'), t = el('table', 'erp'), hr = el('tr'); th(hr, ['Mã phiếu', 'Điểm giao', 'Số cont', 'Lập lúc', 'Bản scan ký', '']); t.append(hr);
          d.notes.forEach(function (n) {
            var tr = el('tr'), act = el('td'), scan = el('td');
            act.append(ui.btn('In lại', 'sec sm', function () { window.open('/api/gss/delivery-notes/' + n.id + '/', '_blank', 'noopener'); }));
            if (n.signed_scan) { var a = el('a', null, 'Xem'); a.href = n.signed_scan; a.target = '_blank'; a.rel = 'noopener'; scan.append(a); }
            else {
              var f = el('input'); f.type = 'file'; f.accept = 'image/*,application/pdf'; f.className = 'hidden';
              f.onchange = function () { var fd = new FormData(); fd.append('file', f.files[0]); api('/api/gss/delivery-notes/' + n.id + '/', { method: 'POST', body: fd }).then(function (j3) { G.toast(j3.message, 'ok'); paint(); }).catch(function (e) { G.toast(e.message, 'bad'); }); };
              scan.append(f, ui.btn('Tải bản scan', 'sec sm', function () { f.click(); }));
            }
            tr.append(el('td', 'mono b', n.code), el('td', null, n.stop_label), el('td', 'num', String(n.containers.length)), el('td', 'small', G.fmtDT(n.created_at)), scan, act);
            t.append(tr);
          });
          tw.append(t); card.append(tw);
        }
      }).catch(function (e) { G.clear(card).append(el('div', 'err', e.message)); });
    }
    paint(); return card;
  }

  // ---------------- chứng từ đặt tên chuẩn ----------------
  function docsTreeCard(b) {
    var card = el('section', 'card stack'), head = el('div', 'row between');
    var zip = el('a', 'btn sec sm', 'Tải zip theo cây thư mục'); zip.href = '/api/gss/bookings/' + b.id + '/doc-tree/?zip=1';
    head.append(el('h2', null, 'Chứng từ hành trình & hoá đơn (tên chuẩn)'), zip);
    var list = el('div', 'stack');
    var show = ui.btn('Xem cây thư mục', 'sec sm', function () {
      show.disabled = true;
      api('/api/gss/bookings/' + b.id + '/doc-tree/').then(function (j) {
        G.clear(list);
        if (!j.data.length) { list.append(el('div', 'small mut', 'Chưa có chứng từ nào.')); return; }
        j.data.forEach(function (r) { var a = el('a', 'mono small doclink', r.path); a.href = r.url; a.target = '_blank'; a.rel = 'noopener'; list.append(a); });
      }).catch(function (e) { list.append(el('div', 'err', e.message)); });
    });
    card.append(head, el('div', 'small mut', 'Tên: {B/L}_{CONT}_{NHÀ XE}_{LOẠI}_{NGÀY}_{STT}; cây /Năm_Tháng/Số_BL/Số_Cont/Chung_Tu_Hanh_Trinh và /Hoa_Don_Nang_Ha_OCR. File gốc không bị đổi tên.'), show, list);
    return card;
  }

  A.blCards = blCards;
})();
