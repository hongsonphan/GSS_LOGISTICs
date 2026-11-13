/* Tài chính & tra cứu GSS: Tra cứu B/L · cont, Quy tắc DEM/DET, Biểu giá (khoản phí, bảng giá bán/mua, duyệt, phiên bản),
   Chi hộ & hoá đơn (duyệt khoản khai, gắn hoá đơn bằng QR/nhập tay/XML, xác nhận), Bảng kê đối soát (lập, chốt, huỷ, Excel),
   Trip Card mở rộng (tài chính chuyến, street-turn, chứng từ tên chuẩn). Dựng DOM bằng textContent. */
(function () {
  'use strict';
  var A = window.GSSApp, ui = A && A.ui, el = G.el, api = G.api;
  if (!A) return;
  var vnd = function (n) { return Number(n || 0).toLocaleString('vi-VN'); };

  function page(title, sub) { var root = el('div', 'stack pad'); root.append(el('h2', 'page-title', title)); if (sub) root.append(el('div', 'small mut', sub)); G.clear(A.view).append(root); return root; }
  function table(heads) { var tw = el('div', 'tw'), t = el('table', 'erp'), hr = el('tr'); heads.forEach(function (h) { var arr = Array.isArray(h), c = el('th', null, arr ? h[0] : h); if (arr && h[1]) c.className = h[1]; hr.append(c); }); t.append(hr); tw.append(t); tw.t = t; return tw; }
  function td(text, cls) { return el('td', cls || null, text == null ? '' : String(text)); }
  function empty(t, n, text) { var tr = el('tr'), c = el('td', 'empty', text); c.colSpan = n; tr.append(c); t.append(tr); }
  function sel(options, value, label) { var s = el('select', 'in'); options.forEach(function (o) { s.append(new Option(o[1], o[0])); }); if (value != null) s.value = value; if (label) s.setAttribute('aria-label', label); return s; }
  function inp(val, type, ph) { var i = el('input', 'in'); if (type) i.type = type; if (val != null) i.value = val; if (ph) i.placeholder = ph; return i; }
  function fld(grid, label, input, req) { var w = el('div'), l = el('label', 'f' + (req ? ' req' : ''), label); l.htmlFor = input.id = input.id || ('f' + Math.random().toString(36).slice(2, 8)); w.append(l, input); grid.append(w); return input; }
  function fail(host) { return function (e) { G.clear(host).append(el('div', 'card err', e.message)); }; }
  function masters() { return A.loadMasters ? A.loadMasters() : Promise.resolve({ customers: [], locations: [], carriers: [] }); }

  // ================================================================ Tra cứu B/L · cont
  var lookupQ = '';
  function renderLookup() {
    var root = page('Tra cứu theo số B/L hoặc số cont', 'Gõ số MBL / HBL / booking hoặc số container (kể cả số cont đổi vỏ) để xem toàn bộ cont, chuyến, nhà xe, trạng thái và số chứng từ.');
    var bar = el('div', 'row'), q = inp(lookupQ, 'search', 'VD: HBL987654 hoặc MSCU1234565'); q.style.maxWidth = '360px'; q.setAttribute('aria-label', 'Số B/L hoặc số cont');
    var out = el('div', 'stack');
    function go() {
      lookupQ = q.value.trim(); if (lookupQ.length < 3) { G.toast('Nhập ít nhất 3 ký tự.', 'bad'); return; }
      G.clear(out).append(el('div', 'card center mut', 'Đang tìm…'));
      api('/api/gss/lookup/?q=' + encodeURIComponent(lookupQ)).then(function (j) {
        G.clear(out);
        if (!j.data.length) { out.append(el('div', 'card empty', 'Không tìm thấy đơn hàng nào khớp.')); return; }
        j.data.forEach(function (b) {
          var card = el('section', 'card stack'), h = el('div', 'row between'), open = ui.btn('Mở đơn hàng', 'sec sm', function () { A.go('booking'); setTimeout(function () { A.openBooking(b.booking_id); }, 50); });
          h.append(el('div', 'b', b.booking_code + ' · ' + b.customer + (b.hbl ? ' · HBL ' + b.hbl : '') + (b.mbl ? ' · MBL ' + b.mbl : '')), open);
          card.append(h);
          if (b.progress) card.append(el('div', 'small', 'Tổng ' + b.progress.total + ' cont · phân bổ ' + b.progress.allocated + ' · đang chạy ' + b.progress.running + ' · đã giao ' + b.progress.delivered + ' · hoàn tất ' + b.progress.done));
          var tw = table(['Số cont', 'Mã chuyến', 'Nhà xe', 'Xe', 'Bước', ['Chứng từ', 'num']]);
          b.trips.forEach(function (t) {
            var tr = el('tr', 'click'); tr.onclick = function () { A.openTrip(t.trip_code); };
            tr.append(td(t.container_number, 'mono b'), td(t.trip_code, 'mono'), td(t.vendor), td(t.plate, 'mono'), td(t.step_label), td(t.docs, 'num')); tw.t.append(tr);
          });
          if (!b.trips.length) empty(tw.t, 6, 'Chưa có chuyến xe.');
          card.append(tw); out.append(card);
        });
      }).catch(fail(out));
    }
    q.onkeydown = function (e) { if (e.key === 'Enter') go(); };
    bar.append(q, ui.btn('Tra cứu', '', go)); root.append(bar, out);
    if (lookupQ) go();
  }

  // ================================================================ Quy tắc DEM/DET
  function renderFreeTime() {
    var root = page('Quy tắc ngày miễn phí DEM/DET', 'Quy tắc khớp cụ thể nhất được dùng (khách hàng > hãng tàu > loại cont). Áp vào đơn hàng ở chi tiết đơn ("Áp quy tắc DEM/DET") hoặc tự áp khi nhập danh sách cont có ngày dỡ/ETA.');
    var bar = el('div', 'row'); bar.append(ui.btn('+ Thêm quy tắc', '', function () { ruleForm(null); })); root.append(bar);
    var holder = el('div', 'card center mut', 'Đang tải…'); root.append(holder);
    api('/api/gss/free-time-rules/').then(function (j) {
      var tw = table(['Tên', 'Loại', 'Hãng tàu', 'Khách hàng', 'Loại cont', ['Số ngày', 'num'], 'Bắt đầu tính', 'Hiệu lực', '']);
      j.data.forEach(function (r) {
        var tr = el('tr'), a = el('td'); a.append(ui.btn('Sửa', 'sec sm', function () { ruleForm(r); }));
        tr.append(td(r.name, 'b'), td(r.kind), td(r.shipping_line || 'Mọi hãng'), td(r.customer || 'Mọi khách'), td(r.container_type || 'Mọi loại'), td(r.free_days, 'num'),
          td(r.start_event_label), td(r.is_active ? 'Đang dùng' : 'Ngừng', r.is_active ? 't-ok' : 't-mut'), a);
        tw.t.append(tr);
      });
      if (!j.data.length) empty(tw.t, 9, 'Chưa có quy tắc nào.');
      holder.replaceWith(tw);
    }).catch(fail(holder));
  }

  function ruleForm(r) {
    r = r || { kind: 'DEM', free_days: 7, start_event: 'DISCHARGE', is_active: true };
    var body = ui.openDrawer(r.id ? 'Sửa quy tắc' : 'Thêm quy tắc DEM/DET'), g = el('div', 'formgrid');
    masters().then(function (m) {
      var name = fld(g, 'Tên quy tắc', inp(r.name), true), kind = fld(g, 'Loại', sel([['DEM', 'DEM (lưu bãi cảng)'], ['DET', 'DET (lưu vỏ)']], r.kind), true);
      var line = fld(g, 'Hãng tàu (để trống = mọi hãng)', inp(r.shipping_line)), cust = sel([['', 'Mọi khách hàng']].concat(m.customers.map(function (c) { return [c.id, c.name]; })), r.customer_id || '');
      fld(g, 'Khách hàng', cust);
      var ct = fld(g, 'Loại cont (để trống = mọi loại)', inp(r.container_type)), days = fld(g, 'Số ngày miễn phí', inp(r.free_days, 'number'), true);
      var ev = fld(g, 'Mốc bắt đầu tính', sel([['DISCHARGE', 'Ngày dỡ hàng'], ['ETA', 'Ngày tàu đến (ETA)'], ['PICKUP', 'Ngày lấy cont khỏi cảng'], ['MANUAL', 'Nhập tay']], r.start_event));
      var act = fld(g, 'Trạng thái', sel([['1', 'Đang dùng'], ['0', 'Ngừng']], r.is_active ? '1' : '0'));
      var msg = el('div', 'err');
      var save = ui.btn('Lưu', 'big', function () {
        save.disabled = true;
        api(r.id ? '/api/gss/free-time-rules/' + r.id + '/' : '/api/gss/free-time-rules/', { method: r.id ? 'PUT' : 'POST', body: {
          name: name.value, kind: kind.value, shipping_line: line.value, customer_id: cust.value || null, container_type: ct.value, free_days: days.value, start_event: ev.value, is_active: act.value === '1' } })
          .then(function (j) { G.toast(j.message, 'ok'); body.close(); renderFreeTime(); }).catch(function (e) { msg.textContent = e.message; save.disabled = false; });
      });
      body.append(g, msg, save);
      if (r.id) body.append(ui.btn('Xoá quy tắc', 'bad sm', function () { if (!window.confirm('Xoá quy tắc này?')) return; api('/api/gss/free-time-rules/' + r.id + '/', { method: 'DELETE', body: {} }).then(function () { body.close(); renderFreeTime(); }).catch(function (e) { G.toast(e.message, 'bad'); }); }));
    });
  }

  // ================================================================ Biểu giá
  var pricingTab = 'cards';
  function renderPricing() {
    var root = page('Biểu giá', 'Bảng giá bán theo khách và giá mua theo nhà xe; đã duyệt thì không sửa – đổi giá bằng phiên bản mới. Giá tự áp khi chuyến hoàn tất (hạ rỗng / street-turn), chụp lại đơn giá vào chuyến.');
    var tabs = el('div', 'row');
    [['cards', 'Bảng giá'], ['codes', 'Khoản phí']].forEach(function (x) { tabs.append(ui.btn(x[1], pricingTab === x[0] ? 'sm' : 'sec sm', function () { pricingTab = x[0]; renderPricing(); })); });
    root.append(tabs);
    var holder = el('div', 'card center mut', 'Đang tải…'); root.append(holder);
    if (pricingTab === 'codes') {
      api('/api/gss/charge-codes/').then(function (j) {
        var wrap = el('div', 'stack'), bar = el('div', 'row'); bar.append(ui.btn('+ Thêm khoản phí', 'sm', function () { codeForm(null); }));
        var tw = table(['Mã', 'Tên', 'Loại', ['VAT %', 'num'], 'TK doanh thu', 'TK chi phí', 'Trạng thái', '']);
        j.data.forEach(function (c) {
          var tr = el('tr'), a = el('td'); a.append(ui.btn('Sửa', 'sec sm', function () { codeForm(c); }));
          tr.append(td(c.code, 'mono b'), td(c.name), td(c.kind_label, c.kind === 'REIMBURSABLE' ? 't-warn' : null), td(c.vat_rate, 'num'), td(c.revenue_account, 'mono'), td(c.cost_account, 'mono'),
            td(c.is_active ? 'Đang dùng' : 'Ngừng', c.is_active ? 't-ok' : 't-mut'), a);
          tw.t.append(tr);
        });
        wrap.append(bar, tw); holder.replaceWith(wrap);
      }).catch(fail(holder));
      return;
    }
    api('/api/gss/rate-cards/').then(function (j) {
      var wrap = el('div', 'stack'), bar = el('div', 'row'); bar.append(ui.btn('+ Tạo bảng giá', 'sm', function () { cardForm(null); }));
      var tw = table(['Mã', 'Tên', 'Chiều', 'Áp dụng cho', 'Hiệu lực', ['Phiên bản', 'num'], ['Số dòng', 'num'], 'Trạng thái']);
      j.data.forEach(function (c) {
        var tr = el('tr', 'click'); tr.onclick = function () { openCard(c.id); };
        tr.append(td(c.code, 'mono b'), td(c.name), td(c.side_label), td(c.customer || c.subcontractor || 'Tất cả'), td(G.fmtDate(c.valid_from) + ' → ' + (c.valid_to ? G.fmtDate(c.valid_to) : 'không thời hạn')),
          td('v' + c.version, 'num'), td(c.line_count, 'num'), td(c.status_label, c.status === 'APPROVED' ? 't-ok' : c.status === 'DRAFT' ? 't-warn' : 't-mut'));
        tw.t.append(tr);
      });
      if (!j.data.length) empty(tw.t, 8, 'Chưa có bảng giá nào. Tạo bảng giá bán cho khách và bảng giá mua cho nhà xe.');
      wrap.append(bar, tw); holder.replaceWith(wrap);
    }).catch(fail(holder));
  }

  function codeForm(c) {
    c = c || { kind: 'FREIGHT', vat_rate: '8', is_active: true };
    var body = ui.openDrawer(c.id ? 'Sửa khoản phí ' + c.code : 'Thêm khoản phí'), g = el('div', 'formgrid');
    var code = fld(g, 'Mã', inp(c.code), true), name = fld(g, 'Tên', inp(c.name), true);
    var kind = fld(g, 'Loại', sel([['FREIGHT', 'Cước vận chuyển'], ['SURCHARGE', 'Phụ phí'], ['REIMBURSABLE', 'Chi hộ (không VAT, tách khỏi doanh thu)']], c.kind));
    var vat = fld(g, 'VAT %', inp(c.vat_rate, 'number')), ra = fld(g, 'Tài khoản doanh thu', inp(c.revenue_account)), ca = fld(g, 'Tài khoản chi phí', inp(c.cost_account));
    var act = fld(g, 'Trạng thái', sel([['1', 'Đang dùng'], ['0', 'Ngừng']], c.is_active ? '1' : '0'));
    var msg = el('div', 'err'), save = ui.btn('Lưu', 'big', function () {
      save.disabled = true;
      api(c.id ? '/api/gss/charge-codes/' + c.id + '/' : '/api/gss/charge-codes/', { method: c.id ? 'PUT' : 'POST', body: { code: code.value, name: name.value, kind: kind.value, vat_rate: vat.value, revenue_account: ra.value, cost_account: ca.value, is_active: act.value === '1' } })
        .then(function (j) { G.toast(j.message, 'ok'); body.close(); renderPricing(); }).catch(function (e) { msg.textContent = e.message; save.disabled = false; });
    });
    body.append(g, msg, save);
  }

  function cardForm(c) {
    c = c || { side: 'SELL' };
    var body = ui.openDrawer(c.id ? 'Sửa bảng giá ' + c.code : 'Tạo bảng giá'), g = el('div', 'formgrid');
    masters().then(function (m) {
      var side = fld(g, 'Chiều', sel([['SELL', 'Giá bán (khách hàng)'], ['BUY', 'Giá mua (nhà xe)']], c.side), true);
      var code = fld(g, 'Mã bảng giá', inp(c.code), true), name = fld(g, 'Tên', inp(c.name), true);
      var party = el('select', 'in'); fld(g, 'Áp dụng cho (để trống = tất cả)', party);
      function fillParty() { G.clear(party); party.append(new Option('— Tất cả —', '')); (side.value === 'SELL' ? m.customers : m.carriers).forEach(function (p) { party.append(new Option(p.short_name || p.name, p.id)); }); party.value = (side.value === 'SELL' ? c.customer_id : c.subcontractor_id) || ''; }
      side.onchange = fillParty; fillParty();
      var vf = fld(g, 'Hiệu lực từ', inp(c.valid_from || new Date().toISOString().slice(0, 10), 'date'), true), vt = fld(g, 'Đến (để trống = không thời hạn)', inp(c.valid_to, 'date'));
      var notes = fld(g, 'Ghi chú', inp(c.notes));
      var msg = el('div', 'err'), save = ui.btn('Lưu bảng giá nháp', 'big', function () {
        var body2 = { side: side.value, code: code.value, name: name.value, valid_from: vf.value, valid_to: vt.value || null, notes: notes.value };
        body2[side.value === 'SELL' ? 'customer_id' : 'subcontractor_id'] = party.value || null; save.disabled = true;
        api(c.id ? '/api/gss/rate-cards/' + c.id + '/' : '/api/gss/rate-cards/', { method: c.id ? 'PUT' : 'POST', body: body2 })
          .then(function (j) { G.toast(j.message, 'ok'); body.close(); openCard(j.data.id); renderPricing(); }).catch(function (e) { msg.textContent = e.message; save.disabled = false; });
      });
      body.append(g, msg, save);
    });
  }

  function openCard(id) {
    var body = ui.openDrawer('Bảng giá');
    function paint() {
      Promise.all([api('/api/gss/rate-cards/' + id + '/'), api('/api/gss/charge-codes/'), masters()]).then(function (r) {
        var c = r[0].data, codes = r[1].data.filter(function (x) { return x.is_active; }), m = r[2], draft = c.status === 'DRAFT';
        G.clear(body);
        var head = el('section', 'card stack'), top = el('div', 'row between');
        top.append(el('div', 'b', c.code + ' · ' + c.name + ' (v' + c.version + ')'), el('span', c.status === 'APPROVED' ? 't-ok b' : c.status === 'DRAFT' ? 't-warn b' : 't-mut b', c.status_label));
        head.append(top, el('div', 'small', c.side_label + ' · ' + (c.customer || c.subcontractor || 'Tất cả') + ' · ' + G.fmtDate(c.valid_from) + ' → ' + (c.valid_to ? G.fmtDate(c.valid_to) : 'không thời hạn')));
        var acts = el('div', 'row');
        if (draft) {
          acts.append(ui.btn('Sửa thông tin', 'sec sm', function () { body.close(); cardForm(c); }),
            ui.btn('Duyệt bảng giá', 'sm', function () { if (!window.confirm('Duyệt bảng giá? Sau khi duyệt không sửa được, chỉ tạo phiên bản mới.')) return; api('/api/gss/rate-cards/' + id + '/approve/', { method: 'POST', body: {} }).then(function (j) { G.toast(j.message, 'ok'); paint(); renderPricing(); }).catch(function (e) { G.toast(e.message, 'bad'); }); }),
            ui.btn('Xoá nháp', 'bad sm', function () { if (!window.confirm('Xoá bảng giá nháp?')) return; api('/api/gss/rate-cards/' + id + '/', { method: 'DELETE', body: {} }).then(function () { body.close(); renderPricing(); }).catch(function (e) { G.toast(e.message, 'bad'); }); }));
        } else {
          acts.append(ui.btn('Tạo phiên bản mới', 'sm', function () {
            var d = ui.ask('Ngày hiệu lực của phiên bản mới (YYYY-MM-DD):', new Date(Date.now() + 864e5).toISOString().slice(0, 10)); if (!d) return;
            api('/api/gss/rate-cards/' + id + '/new-version/', { method: 'POST', body: { valid_from: d } }).then(function (j) { G.toast(j.message, 'ok'); id = j.data.id; paint(); renderPricing(); }).catch(function (e) { G.toast(e.message, 'bad'); });
          }));
        }
        head.append(acts); body.append(head);
        var tw = table(['Khoản phí', 'Nơi lấy', 'Nơi giao / tuyến', 'Loại cont', 'Đơn vị', ['Đơn giá', 'num'], 'Tự áp', '']);
        c.lines.forEach(function (ln) {
          var tr = el('tr'), a = el('td');
          if (draft) a.append(ui.btn('Sửa', 'sec sm', function () { lineForm(ln); }), ui.btn('Xoá', 'bad sm', function () { api('/api/gss/rate-lines/' + ln.id + '/', { method: 'DELETE', body: {} }).then(paint).catch(function (e) { G.toast(e.message, 'bad'); }); }));
          tr.append(td(ln.charge_code + ' · ' + ln.charge_name), td(ln.pickup_loc || 'Mọi nơi'), td(ln.delivery_loc || ln.route_text || 'Mọi tuyến'), td(ln.container_type || 'Mọi loại'),
            td(ln.unit), td(vnd(ln.unit_price), 'num b'), td(ln.auto_apply ? 'Có' : 'Không'), a);
          tw.t.append(tr);
        });
        if (!c.lines.length) empty(tw.t, 8, 'Chưa có dòng giá.');
        body.append(tw);
        if (draft) body.append(ui.btn('+ Thêm dòng giá', 'sm', function () { lineForm(null); }));
        function lineForm(ln) {
          ln = ln || { unit: 'CONT', auto_apply: true };
          var b2 = ui.openDrawer(ln.id ? 'Sửa dòng giá' : 'Thêm dòng giá'), g = el('div', 'formgrid');
          var cc = fld(g, 'Khoản phí', sel(codes.map(function (x) { return [x.id, x.code + ' · ' + x.name]; }), ln.charge_code_id), true);
          var locs = [['', 'Mọi nơi']].concat(m.locations.map(function (x) { return [x.id, x.name]; }));
          var pl = fld(g, 'Nơi lấy', sel(locs, ln.pickup_loc_id || '')), dl = fld(g, 'Nơi giao', sel(locs, ln.delivery_loc_id || ''));
          var rt = fld(g, 'Hoặc tuyến/vùng (khớp chứa trong nơi giao)', inp(ln.route_text)), ct = fld(g, 'Loại cont (trống = mọi loại)', inp(ln.container_type));
          var un = fld(g, 'Đơn vị tính', sel([['CONT', 'Cont'], ['TRIP', 'Chuyến'], ['PACKAGE', 'Kiện'], ['TON', 'Tấn'], ['CBM', 'CBM']], ln.unit));
          var pr = fld(g, 'Đơn giá (VNĐ)', inp(ln.unit_price, 'number'), true), aa = fld(g, 'Tự áp khi chuyến hoàn tất', sel([['1', 'Có'], ['0', 'Không']], ln.auto_apply ? '1' : '0'));
          var msg = el('div', 'err'), save = ui.btn('Lưu dòng giá', 'big', function () {
            save.disabled = true;
            api(ln.id ? '/api/gss/rate-lines/' + ln.id + '/' : '/api/gss/rate-cards/' + id + '/lines/', { method: ln.id ? 'PUT' : 'POST', body: {
              charge_code_id: cc.value, pickup_loc_id: pl.value || null, delivery_loc_id: dl.value || null, route_text: rt.value, container_type: ct.value, unit: un.value, unit_price: pr.value, auto_apply: aa.value === '1' } })
              .then(function (j) { G.toast(j.message, 'ok'); b2.close(); paint(); }).catch(function (e) { msg.textContent = e.message; save.disabled = false; });
          });
          b2.append(g, msg, save);
        }
      }).catch(function (e) { G.clear(body).append(el('div', 'err', e.message)); });
    }
    paint();
  }

  // ================================================================ Chi hộ & hoá đơn
  var claimTab = 'claims', claimStatus = 'PENDING';
  function renderClaims() {
    var root = page('Chi hộ & hoá đơn', 'Tài xế khai chi phí (nâng/hạ, phát sinh) kèm ảnh hoá đơn qua QR lệnh. Kế toán gắn hoá đơn (quét mã QR trên ảnh, nhập tay hoặc tải XML gốc – XML là nguồn sự thật), xác nhận rồi duyệt khoản chi.');
    var tabs = el('div', 'row');
    [['claims', 'Khoản khai chi phí'], ['invoices', 'Hoá đơn điện tử']].forEach(function (x) { tabs.append(ui.btn(x[1], claimTab === x[0] ? 'sm' : 'sec sm', function () { claimTab = x[0]; renderClaims(); })); });
    var st = claimTab === 'claims' ? sel([['PENDING', 'Chờ duyệt'], ['APPROVED', 'Đã duyệt'], ['REJECTED', 'Từ chối'], ['', 'Tất cả']], claimStatus, 'Trạng thái')
      : sel([['PENDING', 'Chờ xác nhận'], ['CONFIRMED', 'Đã xác nhận'], ['REJECTED', 'Từ chối'], ['', 'Tất cả']], claimStatus, 'Trạng thái');
    st.style.maxWidth = '200px'; st.onchange = function () { claimStatus = st.value; renderClaims(); };
    tabs.append(st); root.append(tabs);
    var holder = el('div', 'card center mut', 'Đang tải…'); root.append(holder);
    if (claimTab === 'invoices') {
      api('/api/gss/invoices/?status=' + claimStatus).then(function (j) {
        var tw = table(['Ký hiệu / số', 'MST bán', 'Người mua', 'Ngày', ['Tổng tiền', 'num'], 'Cont', 'Nguồn', 'Kiểm tra', 'Trạng thái', '']);
        j.data.forEach(function (i) { tw.t.append(invoiceRow(i, renderClaims)); });
        if (!j.data.length) empty(tw.t, 10, 'Không có hoá đơn.');
        holder.replaceWith(tw);
      }).catch(fail(holder));
      return;
    }
    api('/api/gss/claims/?status=' + claimStatus).then(function (j) {
      var tw = table(['Khai lúc', 'Cont · chuyến', 'Nhà xe', 'Khoản', ['Số tiền', 'num'], 'Người khai', 'Ảnh', 'Hoá đơn', 'Trạng thái', '']);
      j.data.forEach(function (c) { tw.t.append(claimRow(c, renderClaims)); });
      if (!j.data.length) empty(tw.t, 10, 'Không có khoản khai nào.');
      holder.replaceWith(tw);
    }).catch(fail(holder));
  }

  function checksText(ch) {
    var out = [];
    if (ch && ch.buyer_warning) out.push(ch.buyer_warning);
    if (ch && ch.amount_warning) out.push(ch.amount_warning);
    return out.join(' ');
  }

  function claimRow(c, refresh) {
    var tr = el('tr'), photo = el('td'), inv = el('td'), act = el('td');
    if (c.photo) { var a = el('a', null, 'Xem ảnh'); a.href = c.photo; a.target = '_blank'; a.rel = 'noopener'; photo.append(a); } else photo.append(el('span', 't-mut', '—'));
    if (c.einvoice) { inv.append(el('div', 'mono small', c.einvoice.series + '/' + c.einvoice.number), el('div', 'small t-warn', checksText(c.einvoice.checks))); }
    else inv.append(ui.btn('Gắn hoá đơn', 'sec sm', function () { invoiceForm(c, refresh); }));
    if (c.status === 'PENDING') {
      act.append(ui.btn('Duyệt', 'sm', function () { api('/api/gss/claims/' + c.id + '/review/', { method: 'POST', body: { approve: true } }).then(function (j) { G.toast(j.message, 'ok'); refresh(); }).catch(function (e) { G.toast(e.message, 'bad'); }); }),
        ui.btn('Từ chối', 'bad sm', function () { var why = ui.ask('Lý do từ chối (≥ 5 ký tự):'); if (!why) return; api('/api/gss/claims/' + c.id + '/review/', { method: 'POST', body: { approve: false, note: why } }).then(function (j) { G.toast(j.message, 'ok'); refresh(); }).catch(function (e) { G.toast(e.message, 'bad'); }); }));
    }
    var trip = el('td'), link = el('a', 'mono b', c.container_number || c.trip_code); link.href = '#'; link.onclick = function (e) { e.preventDefault(); A.openTrip(c.trip_code); };
    trip.append(link, el('div', 'small t-mut', c.trip_code));
    tr.append(td(G.fmtDT(c.submitted_at), 'small'), trip, td(c.vendor), td(c.charge_name + (c.description ? ' · ' + c.description : '')), td(vnd(c.amount), 'num b'),
      td(c.submitted_by, 'small'), photo, inv, td(c.status_label + (c.review_note ? ' · ' + c.review_note : ''), c.status === 'APPROVED' ? 't-ok' : c.status === 'REJECTED' ? 't-bad' : 't-warn'), act);
    return tr;
  }

  function invoiceRow(i, refresh) {
    var tr = el('tr'), act = el('td'), files = el('td', 'small');
    if (i.status === 'PENDING') {
      act.append(ui.btn('Xác nhận', 'sm', function () { api('/api/gss/invoices/' + i.id + '/confirm/', { method: 'POST', body: { accept: true } }).then(function (j) { G.toast(j.message, 'ok'); refresh(); }).catch(function (e) { G.toast(e.message, 'bad'); }); }),
        ui.btn('Từ chối', 'bad sm', function () { var why = ui.ask('Lý do (≥ 5 ký tự):'); if (!why) return; api('/api/gss/invoices/' + i.id + '/confirm/', { method: 'POST', body: { accept: false, note: why } }).then(function (j) { G.toast(j.message, 'ok'); refresh(); }).catch(function (e) { G.toast(e.message, 'bad'); }); }));
      var x = el('input'); x.type = 'file'; x.accept = '.xml,text/xml'; x.className = 'hidden';
      x.onchange = function () { var fd = new FormData(); fd.append('xml', x.files[0]); api('/api/gss/invoices/' + i.id + '/xml/', { method: 'POST', body: fd }).then(function (j) { G.toast(j.message, 'ok'); refresh(); }).catch(function (e) { G.toast(e.message, 'bad'); }); };
      act.append(x, ui.btn('Tải XML gốc', 'sec sm', function () { x.click(); }));
    }
    if (i.xml) { var a = el('a', null, 'XML'); a.href = i.xml; a.target = '_blank'; a.rel = 'noopener'; files.append(a); }
    if (i.lookup_url) { var l = el('a', null, ' Tra cứu'); l.href = i.lookup_url; l.target = '_blank'; l.rel = 'noopener noreferrer'; files.append(l); }
    var warn = checksText(i.checks);
    tr.append(td(i.series + '/' + i.number, 'mono b'), td(i.seller_tax_code + (i.seller_name ? ' · ' + i.seller_name : ''), 'small'), td(i.buyer_name || i.buyer_tax_code),
      td(G.fmtDate(i.issue_date)), td(vnd(i.total_amount), 'num b'), td(i.container_number, 'mono'), files,
      td(warn || 'Khớp', warn ? 't-warn small' : 't-ok small'), td(i.status_label, i.status === 'CONFIRMED' ? 't-ok' : i.status === 'REJECTED' ? 't-bad' : 't-warn'), act);
    return tr;
  }

  function invoiceForm(c, done) {
    var body = ui.openDrawer('Gắn hoá đơn · ' + (c.container_number || c.trip_code));
    var note = el('div', 'note', 'Cách nhanh nhất: chọn ảnh hoá đơn có mã QR – hệ thống tự đọc MST, ký hiệu, số. Không đọc được thì nhập tay. Có file XML gốc thì tải XML (ưu tiên). Một hoá đơn chỉ gắn một container; chi hộ phải đứng tên khách hàng.');
    var qrBox = el('div', 'stack'), img = el('input'); img.type = 'file'; img.accept = 'image/*'; img.id = 'inv-img';
    var lab = el('label', 'f', 'Ảnh hoá đơn có mã QR'); lab.htmlFor = img.id;
    var qrText = el('textarea', 'in mono'); qrText.rows = 2; qrText.placeholder = 'Nội dung mã QR (tự điền khi đọc được ảnh, hoặc dán vào)'; qrText.setAttribute('aria-label', 'Nội dung QR');
    img.onchange = function () {
      var f = img.files[0]; if (!f) return;
      function run() {
        var hid = el('div'); hid.id = 'qr-file-' + Date.now(); hid.style.display = 'none'; document.body.append(hid);
        var inst = new Html5Qrcode(hid.id);
        inst.scanFile(f, false).then(function (text) { qrText.value = text; G.toast('Đã đọc mã QR trên hoá đơn', 'ok'); })
          .catch(function () { G.toast('Không đọc được mã QR trên ảnh, hãy nhập tay.', 'bad'); }).then(function () { hid.remove(); });
      }
      if (typeof Html5Qrcode === 'undefined') { var s = document.createElement('script'); s.src = '/static/vendor/html5-qrcode/html5-qrcode.min.js'; s.onload = run; document.head.append(s); } else run();
    };
    var ocrBtn = ui.btn('Đọc ảnh OCR', 'sec sm', function () {
      var f = img.files[0]; if (!f) { G.toast('Chọn ảnh hoá đơn trước khi chạy OCR.', 'bad'); return; }
      var fd = new FormData(); fd.append('file', f);
      api('/api/gss/invoices/ocr/', { method: 'POST', body: fd }).then(function (j) {
        var res = j.data || {};
        if (!res.configured) { G.toast(res.message || 'Dịch vụ OCR chưa cấu hình, vui lòng nhập tay.', 'warn'); return; }
        var fields = res.fields || {};
        Object.keys(fields).forEach(function (k) { if (v[k] && fields[k]) v[k].value = fields[k]; });
        G.toast(res.message || 'Đã đọc thông tin hoá đơn bằng OCR.', 'ok');
      }).catch(function (e) { G.toast(e.message, 'bad'); });
    });
    qrBox.append(lab, img, ocrBtn, qrText);
    var g = el('div', 'formgrid'), v = {};
    [['seller_tax_code', 'MST người bán'], ['series', 'Ký hiệu (vd 1C26TAA)'], ['number', 'Số hoá đơn'], ['issue_date', 'Ngày hoá đơn', 'date'], ['buyer_name', 'Người mua (đứng tên)'],
     ['buyer_tax_code', 'MST người mua'], ['amount_before_vat', 'Tiền trước thuế', 'number'], ['vat_amount', 'Tiền thuế', 'number'], ['total_amount', 'Tổng tiền', 'number']]
      .forEach(function (x) { v[x[0]] = fld(g, x[1], inp('', x[2])); });
    var xml = el('input'); xml.type = 'file'; xml.accept = '.xml,text/xml'; xml.id = 'inv-xml';
    var xl = el('label', 'f', 'Hoặc file XML hoá đơn gốc'); xl.htmlFor = xml.id;
    var msg = el('div', 'err');
    var save = ui.btn('Ghi nhận hoá đơn', 'big', function () {
      var fd = new FormData();
      if (xml.files[0]) fd.append('xml', xml.files[0]);
      else if (qrText.value.trim()) { fd.append('qr', qrText.value.trim()); ['total_amount', 'buyer_name', 'buyer_tax_code'].forEach(function (k) { if (v[k].value) fd.append(k, v[k].value); }); }
      else Object.keys(v).forEach(function (k) { fd.append(k, v[k].value); });
      if (img.files[0]) fd.append('image', img.files[0]);
      save.disabled = true;
      api('/api/gss/claims/' + c.id + '/invoice/', { method: 'POST', body: fd }).then(function (j) {
        var w = checksText(j.data.checks); G.toast(j.message, 'ok'); if (w) G.toast(w, 'bad'); body.close(); done();
      }).catch(function (e) { msg.textContent = e.message; save.disabled = false; });
    });
    body.append(note, qrBox, el('div', 'small mut', 'Nhập tay (khi không có QR / XML):'), g, xl, xml, msg, save);
  }

  // ================================================================ Bảng kê đối soát
  var stFilter = { side: '', status: '' };
  function renderStatements() {
    var root = page('Bảng kê đối soát', 'Lấy chuyến đã hoàn tất trong kỳ chưa nằm trong bảng kê khác. Chi hộ ở mục riêng, tách khỏi cước. Chốt thì khoá và ghi sổ phần chi hộ (cước đã ghi theo từng chuyến khi hoàn tất).');
    var bar = el('div', 'row'), side = sel([['', 'Khách hàng & nhà xe'], ['CUSTOMER', 'Bảng kê khách hàng'], ['VENDOR', 'Bảng kê nhà xe']], stFilter.side, 'Loại bảng kê');
    var st = sel([['', 'Mọi trạng thái'], ['DRAFT', 'Nháp'], ['LOCKED', 'Đã chốt'], ['CANCELLED', 'Đã huỷ']], stFilter.status, 'Trạng thái');
    side.style.maxWidth = st.style.maxWidth = '220px';
    side.onchange = st.onchange = function () { stFilter = { side: side.value, status: st.value }; renderStatements(); };
    bar.append(side, st, ui.btn('+ Lập bảng kê', '', newStatement)); root.append(bar);
    var holder = el('div', 'card center mut', 'Đang tải…'); root.append(holder);
    api('/api/gss/statements/?side=' + stFilter.side + '&status=' + stFilter.status).then(function (j) {
      var tw = table(['Mã', 'Loại', 'Đối tượng', 'Kỳ', ['Số chuyến', 'num'], ['Cước', 'num'], ['VAT', 'num'], ['Chi hộ', 'num'], ['Tổng', 'num'], 'Trạng thái']);
      var tot = 0;
      j.data.forEach(function (s) {
        var t = s.totals || {}, tr = el('tr', 'click'); tr.onclick = function () { openStatement(s.id); };
        if (s.status !== 'CANCELLED') tot += Number(t.grand || 0);
        tr.append(td(s.code, 'mono b'), td(s.side_label), td(s.party), td(G.fmtDate(s.period_from) + ' → ' + G.fmtDate(s.period_to)), td(t.trips, 'num'), td(vnd(t.freight), 'num'),
          td(vnd(t.vat), 'num'), td(vnd(t.reimbursable), 'num'), td(vnd(t.grand), 'num b'), td(s.status_label, s.status === 'LOCKED' ? 't-ok' : s.status === 'DRAFT' ? 't-warn' : 't-mut'));
        tw.t.append(tr);
      });
      if (!j.data.length) empty(tw.t, 10, 'Chưa có bảng kê nào.');
      else { var f = el('tr', 'foot'); f.append(td('Cộng (không gồm bảng kê đã huỷ)', 'b'), td(''), td(''), td(''), td(''), td(''), td(''), td(''), td(vnd(tot), 'num b'), td('')); tw.t.append(f); }
      holder.replaceWith(tw);
    }).catch(fail(holder));
  }

  function newStatement() {
    var body = ui.openDrawer('Lập bảng kê đối soát'), g = el('div', 'formgrid');
    masters().then(function (m) {
      var side = fld(g, 'Loại', sel([['CUSTOMER', 'Bảng kê khách hàng'], ['VENDOR', 'Bảng kê nhà xe']], 'CUSTOMER'), true), party = el('select', 'in'); fld(g, 'Khách hàng / nhà xe', party, true);
      function fill() { G.clear(party); party.append(new Option('— Chọn —', '')); (side.value === 'CUSTOMER' ? m.customers : m.carriers).forEach(function (p) { party.append(new Option(p.short_name || p.name, p.id)); }); }
      side.onchange = fill; fill();
      var now = new Date(), first = new Date(now.getFullYear(), now.getMonth(), 1);
      var pf = fld(g, 'Từ ngày (hoàn tất)', inp(first.toISOString().slice(0, 10), 'date'), true), pt = fld(g, 'Đến ngày', inp(now.toISOString().slice(0, 10), 'date'), true);
      var notes = fld(g, 'Ghi chú', inp(''));
      var prev = el('div', 'stack'), msg = el('div', 'err');
      var preview = ui.btn('Xem trước', 'sec', function () {
        if (!party.value) { G.toast('Chọn đối tượng.', 'bad'); return; }
        api('/api/gss/statements/candidates/?side=' + side.value + '&party_id=' + party.value + '&period_from=' + pf.value + '&period_to=' + pt.value).then(function (j) {
          G.clear(prev); var sum = 0;
          var tw = table(['Chuyến', 'Cont', 'Khoản', ['Thành tiền', 'num']]);
          j.data.forEach(function (r) { sum += Number(r.amount); var tr = el('tr'); tr.append(td(r.trip_code, 'mono'), td(r.container, 'mono'), td(r.charge + (r.kind === 'REIMBURSABLE' ? ' (chi hộ)' : '')), td(vnd(r.amount), 'num')); tw.t.append(tr); });
          if (!j.data.length) empty(tw.t, 4, 'Không có dòng nào chưa đối soát trong kỳ.');
          prev.append(el('div', 'small b', j.data.length + ' dòng · ' + vnd(sum) + ' đ (chưa gồm VAT)'), tw);
        }).catch(function (e) { msg.textContent = e.message; });
      });
      var save = ui.btn('Lập bảng kê nháp', 'big', function () {
        save.disabled = true;
        api('/api/gss/statements/', { method: 'POST', body: { side: side.value, party_id: party.value, period_from: pf.value, period_to: pt.value, notes: notes.value } })
          .then(function (j) { G.toast(j.message, 'ok'); body.close(); renderStatements(); openStatement(j.data.id); }).catch(function (e) { msg.textContent = e.message; save.disabled = false; });
      });
      body.append(g, preview, prev, msg, save);
    });
  }

  function openStatement(id) {
    var body = ui.openDrawer('Bảng kê');
    function act(action, confirmText, needReason) {
      var payload = {};
      if (confirmText && !window.confirm(confirmText)) return;
      if (needReason) { var why = ui.ask('Lý do (≥ 5 ký tự):'); if (!why) return; payload.reason = why; }
      api('/api/gss/statements/' + id + '/' + action + '/', { method: 'POST', body: payload }).then(function (j) { G.toast(j.message, 'ok'); paint(); renderStatements(); }).catch(function (e) { G.toast(e.message, 'bad'); });
    }
    function paint() {
      api('/api/gss/statements/' + id + '/').then(function (j) {
        var s = j.data, t = s.totals || {}; G.clear(body);
        var head = el('section', 'card stack'), top = el('div', 'row between');
        top.append(el('div', 'b', s.code + ' · ' + s.side_label + ' · ' + s.party), el('span', s.status === 'LOCKED' ? 't-ok b' : s.status === 'DRAFT' ? 't-warn b' : 't-mut b', s.status_label));
        head.append(top, el('div', 'small', 'Kỳ ' + G.fmtDate(s.period_from) + ' → ' + G.fmtDate(s.period_to) + (s.locked_at ? ' · chốt ' + G.fmtDT(s.locked_at) + ' bởi ' + s.locked_by : '') + (s.notes ? ' · ' + s.notes : '')));
        var k = el('div', 'fields');
        [['Cước & phụ phí', t.freight], ['VAT', t.vat], ['Chi hộ', t.reimbursable], ['Tổng thanh toán', t.grand]].forEach(function (p) { var d = el('div'); d.append(el('div', 'small mut', p[0]), el('div', 'b', vnd(p[1]) + ' đ')); k.append(d); });
        var acts = el('div', 'row'), xl = el('a', 'btn sec sm', 'Xuất Excel'); xl.href = '/api/gss/statements/' + id + '/?as=xlsx'; acts.append(xl, ui.btn('In', 'sec sm', function () { window.print(); }));
        if (s.status === 'DRAFT') acts.append(ui.btn('Làm mới dòng', 'sec sm', function () { act('refresh'); }), ui.btn('Chốt bảng kê', 'sm', function () { act('lock', 'Chốt bảng kê? Sau khi chốt không sửa được và phát sinh bút toán sổ cái.'); }), ui.btn('Huỷ', 'bad sm', function () { act('cancel', 'Huỷ bảng kê nháp?'); }));
        if (s.status === 'LOCKED') acts.append(ui.btn('Huỷ bảng kê đã chốt', 'bad sm', function () { act('cancel', null, true); }));
        head.append(k, acts); body.append(head);
        [['FREIGHT', 'I. Cước & phụ phí'], ['REIMBURSABLE', 'II. Chi hộ (tách khỏi doanh thu cước)']].forEach(function (sec) {
          var lines = s.lines.filter(function (l) { return l.section === sec[0]; }); if (!lines.length) return;
          var c = el('section', 'card stack'); c.append(el('h2', null, sec[1] + ' (' + lines.length + ')'));
          var tw = table(['STT', 'Chuyến', 'Số B/L', 'Cont', 'Hoàn tất', 'Khoản', ['SL', 'num'], ['Đơn giá', 'num'], ['Thành tiền', 'num'], ['VAT', 'num']]), sum = 0;
          lines.forEach(function (l, i) { sum += Number(l.amount); var tr = el('tr'); tr.append(td(i + 1, 'num'), td(l.trip_code, 'mono'), td(l.bl, 'mono'), td(l.container, 'mono'), td(G.fmtDate(l.completed_at)), td(l.description), td(Number(l.quantity), 'num'), td(vnd(l.unit_price), 'num'), td(vnd(l.amount), 'num b'), td(vnd(l.vat_amount), 'num')); tw.t.append(tr); });
          var f = el('tr', 'foot'); f.append(td('Cộng mục', 'b'), td(''), td(''), td(''), td(''), td(''), td(''), td(''), td(vnd(sum), 'num b'), td('')); tw.t.append(f);
          c.append(tw); body.append(c);
        });
      }).catch(function (e) { G.clear(body).append(el('div', 'err', e.message)); });
    }
    paint();
  }

  // ================================================================ Sổ sách kế toán đầy đủ (phân hệ BIM)
  function renderLedgerFull() {
    var gss = document.getElementById('view-gss'), acc = document.getElementById('view-ke-toan');
    if (!acc) { page('Sổ sách kế toán', 'Phân hệ kế toán đầy đủ không có trong gói này.'); return; }
    gss.classList.add('hidden-view'); acc.classList.remove('hidden-view');
    if (!document.getElementById('gss-back-bar')) {
      var bar = el('div', 'gss-scope row'); bar.id = 'gss-back-bar'; bar.style.padding = '8px 16px';
      bar.append(ui.btn('← Quay lại Bảng kê / Chi hộ / Biểu giá (GSS)', 'sec sm', function () { acc.classList.add('hidden-view'); gss.classList.remove('hidden-view'); A.go('statements'); }));
      acc.prepend(bar);
    }
  }

  // ================================================================ Trip Card mở rộng
  function tripExtras(body, t, reload) {
    var host = el('div', 'stack'); body.append(host);
    api('/api/gss/trips/' + encodeURIComponent(t.trip_code) + '/card/').then(function (j) {
      var c = j.data;
      var blc = el('section', 'card stack'); blc.append(el('h2', null, 'Trip Card · B/L & tờ khai'));
      var g = el('div', 'fields');
      [['HBL / MBL', (c.bl.hbl || '—') + ' / ' + (c.bl.mbl || '—')], ['Hãng tàu · tàu', (c.bl.shipping_line || '—') + ' · ' + (c.bl.vessel_voyage || '—')], ['ETA', G.fmtDate(c.bl.eta)], ['Hạn D/O', G.fmtDate(c.bl.do_expiry)],
       ['Tờ khai', c.bl.customs.map(function (x) { return x.number + ' (' + x.channel_label + ')'; }).join(', ') || '—']]
        .forEach(function (p) { var d = el('div'); d.append(el('div', 'small mut', p[0]), el('div', 'b', p[1])); g.append(d); });
      blc.append(g);
      var acts = el('div', 'row');
      if (t.driver_phone) { var call = el('a', 'btn sec sm', 'Gọi tài xế'); call.href = 'tel:' + t.driver_phone; acts.append(call); }
      if (c.street_turn.is) blc.append(el('div', 'note', 'Street-turn sang booking ' + c.street_turn.booking + (c.street_turn.reason ? ' — ' + c.street_turn.reason : '')));
      else if (t.step === 'UNLOADED' || t.step === 'RETURNING_EMPTY') acts.append(ui.btn('Street-turn sang booking xuất', 'sec sm', function () { streetTurn(t, reload); }));
      blc.append(acts); host.append(blc);
      var cp = c.timeline.filter(function (e) { return e.type === 'CHECKPOINT'; });
      if (cp.length) { var cc = el('section', 'card stack'); cc.append(el('h2', null, 'Qua trạm / bãi (' + cp.length + ')')); cp.forEach(function (e) { cc.append(el('div', 'small', G.fmtDT(e.at) + ' · ' + e.title + (e.by ? ' · ' + e.by : ''))); }); host.append(cc); }
      if (c.finance) host.append(financeCard(t, c.finance, reload));
      if (c.documents.length) {
        var dc = el('section', 'card stack'); dc.append(el('h2', null, 'Thư viện chứng từ (tên chuẩn)'));
        c.documents.forEach(function (d) { var a = el('a', 'mono small doclink', d.path.split('/').pop()); a.href = d.url; a.target = '_blank'; a.rel = 'noopener'; a.title = d.path; dc.append(a); });
        host.append(dc);
      }
    }).catch(function (e) { host.append(el('div', 'err small', e.message)); });
  }

  function streetTurn(t, reload) {
    api('/api/gss/bookings/?status=&q=').then(function (j) {
      var exports = (j.results || []).filter(function (b) { return b.booking_type === 'EXPORT_FCL' && b.status !== 'CANCELLED'; });
      var body = ui.openDrawer('Street-turn · ' + (t.container_number || t.trip_code)), g = el('div', 'formgrid');
      var bk = fld(g, 'Booking xuất nhận vỏ', sel([['', '— Chọn booking xuất —']].concat(exports.map(function (b) { return [b.id, b.code + ' · ' + b.customer + (b.booking_number ? ' · ' + b.booking_number : '')]; })), ''), true);
      var why = fld(g, 'Ghi chú / số lệnh street-turn', inp(''), true), msg = el('div', 'err');
      var save = ui.btn('Xác nhận street-turn', 'big', function () {
        save.disabled = true;
        api('/api/gss/trips/' + t.trip_code + '/street-turn/', { method: 'POST', body: { booking_id: bk.value, reason: why.value } }).then(function (j2) { G.toast(j2.message, 'ok'); body.close(); reload(); })
          .catch(function (e) { msg.textContent = e.message; save.disabled = false; });
      });
      body.append(el('div', 'note', 'Chuyến nhập kết thúc ngay (không có chặng hạ rỗng, không cần chứng từ hạ rỗng); vỏ cont chuyển sang booking xuất. Giá tự áp như chuyến hoàn tất.'), g, msg, save);
    }).catch(function (e) { G.toast(e.message, 'bad'); });
  }

  function financeCard(t, f, reload) {
    var card = el('section', 'card stack'), head = el('div', 'row between');
    head.append(el('h2', null, 'Tài chính chuyến'), ui.btn('Áp lại biểu giá', 'sec sm', function () {
      if (!window.confirm('Áp lại biểu giá cho chuyến? Dòng tự áp cũ được thay; dòng nhập tay và chi hộ giữ nguyên.')) return;
      api('/api/gss/trips/' + t.trip_code + '/apply-rates/', { method: 'POST', body: { force: true } }).then(function (j) { G.toast(j.message, 'ok'); reload(); }).catch(function (e) { G.toast(e.message, 'bad'); });
    }));
    card.append(head);
    var k = el('div', 'fields');
    [['Bán · cước', f.totals.SELL.freight], ['Bán · chi hộ', f.totals.SELL.reimbursable], ['Mua · cước nhà xe', f.totals.BUY.freight], ['Mua · chi hộ nhà xe ứng', f.totals.BUY.reimbursable]]
      .forEach(function (p) { var d = el('div'); d.append(el('div', 'small mut', p[0]), el('div', 'b', vnd(p[1]) + ' đ')); k.append(d); });
    card.append(k);
    var tw = table(['Chiều', 'Khoản', ['SL', 'num'], ['Đơn giá', 'num'], ['Thành tiền', 'num'], 'Nguồn', '']);
    var SRC = { AUTO: 'Biểu giá', MANUAL: 'Nhập tay', CLAIM: 'Chi hộ đã duyệt' };
    f.lines.forEach(function (ln) {
      var tr = el('tr'), a = el('td');
      a.append(ui.btn('Sửa', 'sec sm', function () {
        var price = ui.ask('Đơn giá mới cho ' + ln.charge_name + ':', ln.unit_price); if (price == null) return;
        var why = ui.ask('Lý do sửa giá (≥ 5 ký tự):'); if (!why) return;
        api('/api/gss/job-lines/' + ln.id + '/', { method: 'PUT', body: { unit_price: price, reason: why } }).then(function (j) { G.toast(j.message, 'ok'); reload(); }).catch(function (e) { G.toast(e.message, 'bad'); });
      }));
      tr.append(td(ln.side === 'SELL' ? 'Bán' : 'Mua', ln.side === 'SELL' ? 't-info' : 't-warn'), td(ln.charge_name + (ln.description && ln.description !== ln.charge_name ? ' · ' + ln.description : '')),
        td(Number(ln.quantity), 'num'), td(vnd(ln.unit_price), 'num'), td(vnd(ln.amount), 'num b'), td(SRC[ln.source] + (ln.manual_reason ? ' · ' + ln.manual_reason : ''), 'small'), a);
      tw.t.append(tr);
    });
    if (!f.lines.length) empty(tw.t, 7, 'Chưa có dòng giá. Giá tự áp khi chuyến hoàn tất, hoặc thêm tay.');
    card.append(tw);
    var add = el('div', 'row');
    add.append(ui.btn('+ Thêm dòng giá tay', 'sec sm', function () { manualLine(t, reload); }), ui.btn('+ Khai chi hộ thay tài xế', 'sec sm', function () { staffClaim(t, reload); }));
    card.append(add);
    if (f.claims.length) {
      var cw = table(['Khai lúc', 'Khoản', ['Số tiền', 'num'], 'Hoá đơn', 'Trạng thái']);
      f.claims.forEach(function (c) { var tr = el('tr'); tr.append(td(G.fmtDT(c.submitted_at), 'small'), td(c.charge_name), td(vnd(c.amount), 'num'), td(c.einvoice ? c.einvoice.series + '/' + c.einvoice.number : '—', 'mono small'), td(c.status_label, c.status === 'APPROVED' ? 't-ok' : c.status === 'REJECTED' ? 't-bad' : 't-warn')); cw.t.append(tr); });
      card.append(el('div', 'small b', 'Khoản khai chi hộ / phát sinh'), cw);
    }
    return card;
  }

  function codesFor(filter) { return api('/api/gss/charge-codes/').then(function (j) { return j.data.filter(function (c) { return c.is_active && filter(c); }); }); }

  function manualLine(t, reload) {
    codesFor(function () { return true; }).then(function (codes) {
      var body = ui.openDrawer('Thêm dòng giá tay'), g = el('div', 'formgrid');
      var side = fld(g, 'Chiều', sel([['SELL', 'Bán (thu khách)'], ['BUY', 'Mua (trả nhà xe)']], 'SELL'), true);
      var cc = fld(g, 'Khoản phí', sel(codes.map(function (c) { return [c.id, c.code + ' · ' + c.name]; })), true);
      var q = fld(g, 'Số lượng', inp(1, 'number')), p = fld(g, 'Đơn giá', inp('', 'number'), true), ds = fld(g, 'Diễn giải', inp('')), why = fld(g, 'Lý do (bắt buộc)', inp(''), true);
      var msg = el('div', 'err'), save = ui.btn('Thêm', 'big', function () {
        save.disabled = true;
        api('/api/gss/trips/' + t.trip_code + '/charges/', { method: 'POST', body: { side: side.value, charge_code_id: cc.value, quantity: q.value, unit_price: p.value, description: ds.value, reason: why.value } })
          .then(function (j) { G.toast(j.message, 'ok'); body.close(); reload(); }).catch(function (e) { msg.textContent = e.message; save.disabled = false; });
      });
      body.append(g, msg, save);
    }).catch(function (e) { G.toast(e.message, 'bad'); });
  }

  function staffClaim(t, reload) {
    codesFor(function (c) { return c.kind !== 'FREIGHT'; }).then(function (codes) {
      var body = ui.openDrawer('Khai chi hộ / phát sinh'), g = el('div', 'formgrid');
      var cc = fld(g, 'Khoản', sel(codes.map(function (c) { return [c.id, c.name]; })), true), amt = fld(g, 'Số tiền', inp('', 'number'), true);
      var payer = fld(g, 'Ai đã chi', sel([['VENDOR', 'Nhà xe / tài xế nhà xe ứng'], ['COMPANY', 'GSS chi trực tiếp']], 'VENDOR'));
      var ds = fld(g, 'Diễn giải', inp('')), ph = el('input'); ph.type = 'file'; ph.accept = 'image/*,application/pdf'; fld(g, 'Ảnh hoá đơn', ph);
      var msg = el('div', 'err'), save = ui.btn('Ghi nhận', 'big', function () {
        var fd = new FormData(); fd.append('charge_code_id', cc.value); fd.append('amount', amt.value); fd.append('payer', payer.value); fd.append('description', ds.value);
        if (ph.files[0]) fd.append('photo', ph.files[0]);
        save.disabled = true;
        api('/api/gss/trips/' + t.trip_code + '/claims/', { method: 'POST', body: fd }).then(function (j) { G.toast(j.message, 'ok'); body.close(); reload(); }).catch(function (e) { msg.textContent = e.message; save.disabled = false; });
      });
      body.append(g, msg, save);
    }).catch(function (e) { G.toast(e.message, 'bad'); });
  }

  A.register({ lookup: renderLookup, freetime: renderFreeTime, pricing: renderPricing, claims: renderClaims, statements: renderStatements, 'ledger-full': renderLedgerFull });
  A.tripExtras = tripExtras;
})();
