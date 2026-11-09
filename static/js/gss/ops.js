/* Đối soát cước nhà xe, tạo chuyến thủ công, xuất Excel. */
(function () {
  'use strict';
  var A = window.GSSApp, ui = A.ui, el = G.el, api = G.api;
  var fmt = function (n) { return Number(n || 0).toLocaleString('vi-VN'); };
  var sFilter = { vendor: '', status: '', from: '', to: '', q: '' };
  var STATUS_CLS = { PENDING: 'p-warn', RECONCILING: 'p-info', APPROVED: 'p-ok', PARTIAL: 'p-ok', SETTLED: 'p-ok' };

  function qs(f) { var p = new URLSearchParams(); Object.keys(f).forEach(function (k) { if (f[k]) p.set(k, f[k]); }); return p.toString(); }

  // ---------------- Đối soát cước nhà xe ----------------
  function renderSettlement() {
    var root = el('div', 'stack pad'); root.append(el('h2', 'page-title', 'Đối soát cước nhà xe'));
    var note = el('div', 'small mut', 'Nhập cước thỏa thuận và tạm ứng theo từng cont, chốt đối soát khi chuyến đã hạ rỗng và đủ chứng từ 3 chặng. Duyệt công nợ, phiếu chi và quyết toán tiền thực hiện ở phân hệ Kế toán (hệ thống cũ).');
    var bar = el('div', 'row'), vend = el('select', 'in'), st = el('select', 'in'), from = ui.input('', sFilter.from), to = ui.input('', sFilter.to), q = ui.input('Tìm cont, chuyến, biển số…', sFilter.q);
    vend.style.maxWidth = '220px'; st.style.maxWidth = '200px'; q.style.maxWidth = '240px'; from.type = to.type = 'date'; from.style.maxWidth = to.style.maxWidth = '160px';
    from.setAttribute('aria-label', 'Từ ngày'); to.setAttribute('aria-label', 'Đến ngày');
    vend.append(new Option('Mọi nhà xe', '')); [['', 'Mọi trạng thái'], ['PENDING', 'Chờ đối soát'], ['RECONCILING', 'Đã chốt đối soát'], ['APPROVED', 'Đã duyệt công nợ'], ['SETTLED', 'Đã quyết toán']].forEach(function (o) { st.append(new Option(o[1], o[0])); });
    st.value = sFilter.status;
    function apply() { sFilter = { vendor: vend.value, status: st.value, from: from.value, to: to.value, q: q.value.trim() }; renderSettlement(); }
    var xl = el('a', 'btn sec', 'Xuất Excel'); xl.href = '/api/gss/settlement/export/?' + qs(sFilter);
    q.onkeydown = function (e) { if (e.key === 'Enter') apply(); };
    bar.append(vend, st, from, to, q, ui.btn('Lọc', '', apply), xl);
    var holder = el('div', 'card center mut', 'Đang tải…');
    root.append(note, bar, holder); G.clear(A.view).append(root);
    api('/api/master-data/subcontractors/').then(function (j) {
      (j.results || []).filter(function (s) { return !s.partner_type || s.partner_type === 'CARRIER'; }).forEach(function (s) { vend.append(new Option(s.short_name || s.name, s.id)); }); vend.value = sFilter.vendor;
    }).catch(function () {});
    api('/api/gss/settlement/?' + qs(sFilter)).then(function (j) { holder.replaceWith(paintSettlement(j)); })
      .catch(function (e) { holder.className = 'card err'; holder.textContent = e.message; });
  }

  function paintSettlement(j) {
    var wrap = el('div', 'stack'), kp = el('div', 'kpis');
    j.summary.forEach(function (s) {
      var c = el('button', 'kpi'); c.type = 'button'; c.style.textAlign = 'left'; c.style.cursor = 'pointer';
      c.onclick = function () { sFilter.vendor = String(s.vendor_id); renderSettlement(); };
      c.append(el('div', 'l', s.vendor), el('div', 'v', fmt(s.remaining) + ' đ'), el('div', 's mut', s.trips + ' chuyến · hạ rỗng ' + s.completed + ' · đã chốt ' + s.reconciled + ' · cước ' + fmt(s.cost) + ' · tạm ứng ' + fmt(s.advance)));
      kp.append(c);
    });
    if (j.summary.length) wrap.append(kp);
    wrap.append(el('div', 'small mut', j.total + ' dòng' + (j.truncated ? ' (đang hiện 500 dòng đầu)' : '')));
    var tw = el('div', 'tw'), t = el('table'), hr = el('tr');
    ['Cont / chuyến', 'Nhà xe', 'Bước', 'Chứng từ N·G·H', 'Cước thỏa thuận (đ)', 'Tạm ứng (đ)', 'Còn phải trả', 'Trạng thái', ''].forEach(function (h) { hr.append(el('th', null, h)); }); t.append(hr);
    j.results.forEach(function (r) { t.append(settleRow(r)); });
    if (!j.results.length) { var e = el('tr'), td = el('td', 'empty', 'Chưa có chuyến nhà xe nào khớp bộ lọc.'); td.colSpan = 9; e.append(td); t.append(e); }
    tw.append(t); wrap.append(tw); return wrap;
  }

  function settleRow(r) {
    var tr = el('tr'), c0 = el('td'); c0.append(el('div', 'b mono', r.container_number || '(chưa có số)'), el('div', 'small mut', r.trip_code + (r.booking_code ? ' · ' + r.booking_code : '')));
    if (r.swapped) c0.append(el('div', 'small', '🔄 Hạ: ' + r.return_container_number));
    var step = el('td'); step.append(el('span', 'pill ' + (r.completed ? 'p-ok' : 'p-none'), r.step_label));
    var docs = el('td'); docs.append(el('span', 'pill ' + (r.docs_complete ? 'p-ok' : 'p-warn'), r.docs.PICKUP + '·' + r.docs.DELIVERY + '·' + r.docs.EMPTY_RETURN + (r.docs_complete ? ' đủ' : ' thiếu')));
    var cost = ui.input('', r.cost), adv = ui.input('', r.advance); [cost, adv].forEach(function (i) { i.type = 'number'; i.min = 0; i.style.minWidth = '120px'; i.disabled = !r.editable; });
    cost.setAttribute('aria-label', 'Cước ' + r.trip_code); adv.setAttribute('aria-label', 'Tạm ứng ' + r.trip_code);
    var c4 = el('td'), c5 = el('td'); c4.append(cost); c5.append(adv);
    var rem = el('td', 'b', fmt(r.remaining)), stt = el('td'); stt.append(el('span', 'pill ' + (STATUS_CLS[r.status] || 'p-none'), r.status_label));
    var act = el('td'), msg = el('div', 'small err');
    function post(body) {
      body.action = body.action; return api('/api/gss/settlement/' + r.trip_code + '/', { method: 'POST', body: body }).then(function (j) {
        G.toast(j.message, 'ok'); var nr = settleRow(j.data); tr.replaceWith(nr);
      }).catch(function (e) { msg.textContent = e.message; G.toast(e.message, 'bad'); });
    }
    if (r.editable) act.append(ui.btn('Lưu', 'sec sm', function () { post({ action: 'update_cost', cost: cost.value, advance: adv.value, notes: r.notes }); }));
    if (r.status === 'PENDING' && r.completed) act.append(document.createTextNode(' '), ui.btn('Chốt đối soát', 'sm', function () {
      var body = { action: 'reconcile' };
      if (!r.docs_complete) { var why = ui.ask('Thiếu chứng từ. Nhập lý do (≥ 5 ký tự) để chốt ngoại lệ:'); if (!why) return; body.reason = why; }
      post(body);
    }));
    if (r.status === 'RECONCILING') act.append(document.createTextNode(' '), ui.btn('Mở lại', 'sec sm', function () { var why = ui.ask('Lý do mở lại đối soát (≥ 5 ký tự):'); if (why) post({ action: 'reopen', reason: why }); }));
    act.append(msg);
    tr.append(c0, el('td', null, r.vendor), step, docs, c4, c5, rem, stt, act); return tr;
  }

  // ---------------- Tạo chuyến thủ công ----------------
  function openManualTrip(done) {
    var body = ui.openDrawer('Tạo chuyến thủ công'); body.append(el('div', 'mut', 'Đang tải…'));
    Promise.all([api('/api/gss/bookings/'), api('/api/master-data/customers/'), api('/api/master-data/subcontractors/')]).then(function (r) {
      var bookings = r[0].results.filter(function (b) { return b.status !== 'CANCELLED' && b.status !== 'COMPLETED'; }), customers = r[1].results || [], subs = (r[2].results || []).filter(function (s) { return s.is_active !== false && (!s.partner_type || s.partner_type === 'CARRIER'); });
      var v = {}, g = el('div', 'formgrid');
      function add(k, label, input, req, full) { v[k] = input; var w = el('div', full ? 'full' : ''), l = el('label', 'f' + (req ? ' req' : ''), label); l.htmlFor = input.id = 'mt-' + k; w.append(l, input); g.append(w); return w; }
      function sel(opts, first) { var s = el('select', 'in'); s.append(new Option(first, '')); opts.forEach(function (o) { s.append(new Option(o[1], o[0])); }); return s; }
      add('booking_id', 'Gắn vào Booking (tùy chọn)', sel(bookings.map(function (b) { return [b.id, b.code + ' · ' + b.customer + ' · ' + b.booking_number + ' (đã điều ' + b.filled + '/' + b.total_containers + ')']; }), '— Chuyến ngoài Booking —'), false, true);
      var cw = add('customer_id', 'Khách hàng (khi không có Booking)', sel(customers.map(function (c) { return [c.id, c.name]; }), '— Chọn khách hàng —'), true);
      var ext = el('div', 'full formgrid'); g.append(ext);
      function addExt(k, label, req) { var i = el('input', 'in'); v[k] = i; var w = el('div'), l = el('label', 'f' + (req ? ' req' : ''), label); l.htmlFor = i.id = 'mt-' + k; w.append(l, i); ext.append(w); return i; }
      addExt('pickup', 'Nơi nhận', true); addExt('delivery', 'Nơi giao', true); addExt('dropoff', 'Nơi hạ rỗng'); var ld = addExt('loading_date', 'Ngày hẹn'); ld.type = 'date'; addExt('container_size', 'Loại cont');
      function sync() { var has = !!v.booking_id.value; cw.classList.toggle('hidden', has); ext.classList.toggle('hidden', has); } v.booking_id.onchange = sync; sync();
      add('subcontractor_id', 'Nhà xe (để trống = xe nhà)', sel(subs.map(function (s) { return [s.id, s.short_name || s.name]; }), '— Xe nhà (Đội xe công ty) —'), false, true);
      [['tractor_plate', 'Biển số xe đầu kéo', true], ['trailer_plate', 'Biển số rơ-moóc'], ['driver_name', 'Tài xế'], ['driver_phone', 'SĐT tài xế'], ['container_number', 'Số container'], ['seal_number', 'Số seal']].forEach(function (f) { add(f[0], f[1], el('input', 'in'), !!f[2]); });
      var nt = el('textarea', 'in'); nt.rows = 2; add('notes', 'Ghi chú', nt, false, true);
      var msg = el('div', 'err'), save = ui.btn('Tạo chuyến', 'big', function () {
        msg.textContent = ''; save.disabled = true; var d = {}; Object.keys(v).forEach(function (k) { d[k] = v[k].value; });
        ['booking_id', 'customer_id', 'subcontractor_id'].forEach(function (k) { d[k] = d[k] ? Number(d[k]) : null; });
        api('/api/gss/manual-trips/', { method: 'POST', body: d }).then(function (j) { G.toast(j.message, 'ok'); body.close(); if (done) done(); A.openTrip(j.data.trip_code); })
          .catch(function (e) { msg.textContent = e.message; save.disabled = false; msg.scrollIntoView({ block: 'center' }); });
      });
      var card = el('section', 'card stack'); card.append(el('div', 'small mut', 'Dùng khi chuyến không đi qua link nhà xe: xe nhà, hoặc điều vận nhập thẳng. Có Booking thì kế thừa khách, lộ trình, DEM/DET và không vượt tổng cont.'), g, msg, save);
      G.clear(body).append(card);
    }).catch(function (e) { G.clear(body).append(el('div', 'err', e.message)); });
  }

  A.register({ settlement: renderSettlement });
  A.openManualTrip = openManualTrip;
})();
