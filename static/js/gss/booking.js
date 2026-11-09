/* Màn Booking: danh sách, tạo/sửa (DEM/DET, ghi chú điểm đến, cấm đường), chia cont cho nhà xe, sửa dòng xe/tài thay nhà xe, tệp đính kèm. */
(function () {
  'use strict';
  var A = window.GSSApp, ui = A.ui, el = G.el, api = G.api;
  var filter = { q: '', status: '', alert: false };
  var STATUS_CLS = { PENDING_DISPATCH: 'p-warn', PARTIALLY_DISPATCHED: 'p-info', COMPLETED: 'p-ok', CANCELLED: 'p-bad' };
  var STATUSES = [['', 'Mọi trạng thái'], ['PENDING_DISPATCH', 'Chờ điều xe'], ['PARTIALLY_DISPATCHED', 'Đang điều xe'], ['COMPLETED', 'Đã điều đủ xe'], ['CANCELLED', 'Đã hủy']];
  var masters = null; // {customers, locations, carriers}

  function loadMasters() {
    if (masters) return Promise.resolve(masters);
    return Promise.all([api('/api/master-data/customers/'), api('/api/master-data/locations/'), api('/api/master-data/subcontractors/')]).then(function (r) {
      masters = { customers: r[0].results || [], locations: (r[1].results || []).filter(function (l) { return l.is_active !== false; }),
                  carriers: (r[2].results || []).filter(function (s) { return s.is_active !== false && (!s.partner_type || s.partner_type === 'CARRIER'); }) };
      return masters;
    });
  }
  window.GSSMasters = { reset: function () { masters = null; } }; // màn Danh mục gọi khi dữ liệu đổi

  // ---------------- danh sách ----------------
  function renderList() {
    var root = el('div', 'stack pad'), bar = el('div', 'row');
    var q = ui.input('Tìm mã, số booking, khách, hàng hóa…', filter.q); q.style.maxWidth = '320px';
    var st = el('select', 'in'); st.style.maxWidth = '200px'; STATUSES.forEach(function (o) { st.append(new Option(o[1], o[0])); }); st.value = filter.status;
    var al = el('input'); al.type = 'checkbox'; al.checked = filter.alert; al.style.width = al.style.height = '22px';
    var lal = el('label', 'row small'); lal.append(al, el('span', null, 'Chỉ booking sắp/đã quá hạn DEM-DET'));
    var go = ui.btn('Lọc', 'sec', apply); q.onkeydown = function (e) { if (e.key === 'Enter') apply(); }; st.onchange = apply; al.onchange = apply;
    function apply() { filter = { q: q.value.trim(), status: st.value, alert: al.checked }; renderList(); }
    bar.append(q, st, lal, go, ui.btn('+ Tạo booking', '', function () { openForm(null); }));
    root.append(el('h2', 'page-title', 'Đơn hàng theo B/L & phân bổ nhà xe'), bar);
    G.clear(A.view).append(root);
    var holder = el('div', 'card center mut', 'Đang tải…'); root.append(holder);
    var qs = new URLSearchParams({ q: filter.q, status: filter.status }); if (filter.alert) qs.set('alert', '1');
    api('/api/gss/bookings/?' + qs).then(function (j) { holder.replaceWith(table(j)); }).catch(function (e) { holder.className = 'card err'; holder.textContent = e.message; });
  }

  function table(j) {
    var wrap = el('div', 'stack'); wrap.append(el('div', 'small mut', j.total + ' booking' + (j.truncated ? ' (đang hiện 300 dòng đầu)' : '')));
    var tw = el('div', 'tw'), t = el('table'), hr = el('tr');
    ['Mã', 'Khách hàng', 'Số booking · Hãng tàu', 'Cont', 'Chia cont cho nhà xe', 'Ngày hẹn', 'Hạn DEM', 'Hạn DET', 'Trạng thái'].forEach(function (h) { hr.append(el('th', null, h)); }); t.append(hr);
    j.results.forEach(function (b) {
      var tr = el('tr', 'click'); tr.tabIndex = 0; tr.onclick = function () { openDetail(b.id); }; tr.onkeydown = function (e) { if (e.key === 'Enter') openDetail(b.id); };
      var prog = el('td'), pct = b.total_containers ? Math.min(100, Math.round(100 * b.allocated / b.total_containers)) : 0, bar = el('div', 'progress'), fill = el('i'); fill.style.width = pct + '%'; bar.append(fill);
      prog.append(el('div', 'small', 'Chia ' + b.allocated + '/' + b.total_containers + ' · đã nhập xe ' + b.filled), bar);
      var dem = el('td'), det = el('td'); dem.append(G.demdetPill('', b.dem)); det.append(G.demdetPill('', b.det));
      var st = el('td'); st.append(el('span', 'pill ' + (STATUS_CLS[b.status] || 'p-none'), b.status_label));
      tr.append(el('td', 'mono b', b.code), el('td', null, b.customer), el('td', null, (b.booking_number || '—') + (b.shipping_line ? ' · ' + b.shipping_line : '')),
        el('td', null, b.total_containers + ' × ' + b.container_size), prog, el('td', null, G.fmtDate(b.loading_date)), dem, det, st);
      t.append(tr);
    });
    if (!j.results.length) { var e = el('tr'), td = el('td', 'empty', 'Chưa có booking nào khớp. Bấm "+ Tạo booking" để bắt đầu.'); td.colSpan = 9; e.append(td); t.append(e); }
    tw.append(t); wrap.append(tw); return wrap;
  }

  // ---------------- form tạo/sửa ----------------
  function addDays(dateStr, n) { var d = new Date(dateStr + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
  function expiry(start, free, override) { if (override) return override; if (!start || !(free > 0)) return ''; return addDays(start, free - 1); }

  function locPicker(label, locId, text, required) {
    var wrap = el('div'), l = el('label', 'f' + (required ? ' req' : ''), label), sel = el('select', 'in'), manual = el('input', 'in'); manual.placeholder = 'Nhập tên địa điểm'; manual.style.marginTop = '6px';
    sel.append(new Option('— Chọn từ danh mục —', ''), new Option('Nhập tay…', '__manual'));
    masters.locations.forEach(function (x) { sel.append(new Option(x.name, x.id)); });
    if (locId) sel.value = String(locId); else if (text) { sel.value = '__manual'; manual.value = text; }
    function sync() { manual.classList.toggle('hidden', sel.value !== '__manual'); } sel.onchange = sync; sync();
    wrap.append(l, sel, manual);
    wrap.get = function () { return sel.value === '__manual' ? { id: null, text: manual.value.trim() } : { id: sel.value ? Number(sel.value) : null, text: '' }; };
    wrap.destNotes = function () { var x = masters.locations.filter(function (z) { return String(z.id) === sel.value; })[0]; return x || null; };
    wrap.onPick = function (fn) { sel.addEventListener('change', fn); };
    return wrap;
  }

  function openForm(b) {
    var body = ui.openDrawer(b ? 'Sửa booking ' + b.code : 'Tạo booking mới'); body.append(el('div', 'mut', 'Đang tải…'));
    loadMasters().then(function () { paintForm(body, b); }).catch(function (e) { G.clear(body).append(el('div', 'err', e.message)); });
  }

  function paintForm(body, b) {
    b = b || {};
    var v = {}, g1 = el('div', 'formgrid');
    function add(grid, key, label, input, req, full) { v[key] = input; var w = el('div', full ? 'full' : ''), l = el('label', 'f' + (req ? ' req' : ''), label); l.htmlFor = input.id = 'bk-' + key; w.append(l, input); grid.append(w); return w; }
    function txt(val, ph) { var i = el('input', 'in'); i.value = val || ''; if (ph) i.placeholder = ph; return i; }
    function num(val, min, max) { var i = el('input', 'in'); i.type = 'number'; i.min = min; i.max = max; i.value = val == null ? '' : val; return i; }
    function dt(val) { var i = el('input', 'in'); i.type = 'date'; i.value = val || ''; return i; }
    var cust = el('select', 'in'); cust.append(new Option('— Chọn khách hàng —', '')); masters.customers.forEach(function (c) { cust.append(new Option(c.name, c.id)); }); cust.value = b.customer_id || '';
    var typ = el('select', 'in'); [['EXPORT_FCL', 'Kéo cont xuất khẩu (FCL)'], ['IMPORT_FCL', 'Kéo cont nhập khẩu (FCL)'], ['DOMESTIC', 'Vận chuyển nội địa']].forEach(function (o) { typ.append(new Option(o[1], o[0])); }); typ.value = b.booking_type || 'EXPORT_FCL';
    var size = el('select', 'in'); ['20DC', '40DC', '40HC', '45HC', '20RF', '40RF', 'Khác'].forEach(function (s) { size.append(new Option(s, s)); }); size.value = b.container_size || '40HC';
    add(g1, 'customer_id', 'Khách hàng', cust, true); add(g1, 'booking_type', 'Loại dịch vụ', typ);
    add(g1, 'booking_number', 'Số booking hãng tàu / PO', txt(b.booking_number)); add(g1, 'shipping_line', 'Hãng tàu', txt(b.shipping_line));
    add(g1, 'vessel_voyage', 'Tàu / chuyến', txt(b.vessel_voyage)); add(g1, 'container_size', 'Loại cont', size);
    add(g1, 'total_containers', 'Tổng số cont', num(b.total_containers == null ? 1 : b.total_containers, 1, 500), true);
    add(g1, 'commodity', 'Hàng hóa', txt(b.commodity)); add(g1, 'hs_code', 'Mã HS', txt(b.hs_code));
    add(g1, 'mbl_number', 'Số Master B/L (MBL)', txt(b.mbl_number)); add(g1, 'hbl_number', 'Số House B/L (HBL)', txt(b.hbl_number));
    var mode = el('select', 'in'); [['FCL', 'FCL – nguyên cont'], ['LCL', 'LCL – hàng lẻ']].forEach(function (o) { mode.append(new Option(o[1], o[0])); }); mode.value = b.cargo_mode || 'FCL';
    add(g1, 'cargo_mode', 'Hình thức hàng', mode); add(g1, 'supplier_name', 'Nhà cung cấp / người gửi', txt(b.supplier_name));
    add(g1, 'port_of_loading', 'Cảng xếp', txt(b.port_of_loading)); add(g1, 'port_of_discharge', 'Cảng dỡ', txt(b.port_of_discharge));
    add(g1, 'eta', 'Ngày tàu đến (ETA)', dt(b.eta)); add(g1, 'discharge_date', 'Ngày dỡ hàng', dt(b.discharge_date)); add(g1, 'do_expiry', 'Hạn lệnh D/O', dt(b.do_expiry));
    var s1 = el('section', 'card stack'); s1.append(el('h2', null, '1. Thông tin đơn hàng theo B/L'), el('div', 'small mut', 'Nhập MBL, HBL hoặc cả hai. Tên file chứng từ dùng HBL nếu có, không thì MBL. Có danh sách cont thì tổng số cont tự tính theo danh sách.'), g1);

    var g2 = el('div', 'formgrid'), pk = locPicker('Nơi nhận cont/hàng', b.pickup_loc_id, b.pickup_loc_id ? '' : b.pickup_location, true), dl = locPicker('Nơi giao hàng', b.delivery_loc_id, b.delivery_loc_id ? '' : b.delivery_location, true), dr = locPicker('Nơi hạ rỗng', b.dropoff_loc_id, b.dropoff_loc_id ? '' : b.dropoff_location, false);
    g2.append(pk, dl, dr);
    var s2 = el('section', 'card stack'); s2.append(el('h2', null, '2. Lộ trình'), g2);

    var g3 = el('div', 'formgrid');
    add(g3, 'loading_date', 'Ngày hẹn đóng/giao', dt(b.loading_date)); add(g3, 'loading_time', 'Giờ hẹn', txt(b.loading_time || '08:00'));
    add(g3, 'closing_time', 'Hạn cắt máng (closing)', txt(b.closing_time)); add(g3, 'si_cutoff', 'Hạn SI', txt(b.si_cutoff)); add(g3, 'vgm_cutoff', 'Hạn VGM', txt(b.vgm_cutoff));
    add(g3, 'selling_freight_price', 'Đơn giá cước bán (VNĐ, tùy chọn)', num(b.selling_freight_price || 0, 0, 100000000000));
    var s3 = el('section', 'card stack'); s3.append(el('h2', null, '3. Lịch & cước'), g3);

    var g4 = el('div', 'formgrid'), prev = el('div', 'row full');
    add(g4, 'free_time_demurrage', 'Số ngày miễn phí DEM', num(b.free_time_demurrage == null ? 7 : b.free_time_demurrage, 0, 365)); add(g4, 'dem_start_date', 'Ngày bắt đầu tính DEM', dt(b.dem_start_date));
    add(g4, 'dem_expiry_override', 'Ghi đè hạn DEM (nếu khác tự tính)', dt(b.dem_expiry_override));
    add(g4, 'free_time_detention', 'Số ngày miễn phí DET', num(b.free_time_detention == null ? 7 : b.free_time_detention, 0, 365)); add(g4, 'det_start_date', 'Ngày bắt đầu tính DET', dt(b.det_start_date));
    add(g4, 'det_expiry_override', 'Ghi đè hạn DET (nếu khác tự tính)', dt(b.det_expiry_override)); g4.append(prev);
    function refreshPrev() {
      G.clear(prev);
      [['Hạn DEM', expiry(v.dem_start_date.value, Number(v.free_time_demurrage.value), v.dem_expiry_override.value)], ['Hạn DET', expiry(v.det_start_date.value, Number(v.free_time_detention.value), v.det_expiry_override.value)]]
        .forEach(function (x) { prev.append(el('span', 'pill p-info', x[0] + ': ' + (x[1] ? G.fmtDate(x[1]) : 'chưa đủ dữ liệu để tính'))); });
    }
    ['free_time_demurrage', 'dem_start_date', 'dem_expiry_override', 'free_time_detention', 'det_start_date', 'det_expiry_override'].forEach(function (k) { v[k].addEventListener('input', refreshPrev); }); refreshPrev();
    var s4 = el('section', 'card stack'); s4.append(el('h2', null, '4. Hạn lệnh DEM / DET'), el('div', 'small mut', 'Hạn = ngày bắt đầu + (số ngày miễn phí − 1), tự cập nhật xuống các chuyến chưa kết thúc. DEM tính tới khi lấy cont khỏi cảng, DET tới khi trả vỏ rỗng.'), g4);

    var g5 = el('div', 'formgrid'), ta = function (val, ph) { var t = el('textarea', 'in'); t.rows = 3; t.value = val || ''; if (ph) t.placeholder = ph; return t; };
    var dn = ta(b.destination_notes), rr = ta(b.road_restrictions);
    add(g5, 'destination_notes', 'Ghi chú điểm đến cho tài xế', dn, false, false); add(g5, 'road_restrictions', 'Lưu ý cấm đường / giờ cấm tải', rr, false, false); add(g5, 'notes', 'Ghi chú nội bộ / yêu cầu đặc biệt', ta(b.notes), false, true);
    var hint = el('div', 'small mut');
    function refreshHint() { var l = dl.destNotes(); hint.textContent = l && (l.destination_notes || l.road_restrictions) ? 'Để trống sẽ dùng ghi chú của địa điểm "' + l.name + '": ' + (l.destination_notes || '') + (l.road_restrictions ? ' | Cấm đường: ' + l.road_restrictions : '') : ''; }
    dl.onPick(refreshHint); refreshHint();
    var s5 = el('section', 'card stack'); s5.append(el('h2', null, '5. Lưu ý cho tài xế'), hint, g5);

    var msg = el('div', 'err'), save = ui.btn(b.id ? 'Lưu thay đổi' : 'Tạo booking', 'big', function () {
      msg.textContent = ''; save.disabled = true;
      var p = pk.get(), d = dl.get(), r = dr.get(), data = {};
      Object.keys(v).forEach(function (k) { data[k] = v[k].value; });
      data.customer_id = cust.value ? Number(cust.value) : null;
      data.pickup_loc_id = p.id; data.pickup = p.text; data.delivery_loc_id = d.id; data.delivery = d.text; data.dropoff_loc_id = r.id; data.dropoff = r.text;
      api(b.id ? '/api/gss/bookings/' + b.id + '/' : '/api/gss/bookings/', { method: b.id ? 'PUT' : 'POST', body: data }).then(function (j) {
        G.toast(j.message, 'ok'); body.close(); openDetail(j.data.id); if (A.screens.booking && A.current() === 'booking') renderList();
      }).catch(function (e) { msg.textContent = e.message; save.disabled = false; msg.scrollIntoView({ block: 'center' }); });
    });
    G.clear(body).append(s1, s2, s3, s4, s5, msg, save);
  }

  // ---------------- chi tiết + chia cont ----------------
  function openDetail(id) {
    var body = ui.openDrawer('Booking'); body.append(el('div', 'mut', 'Đang tải…'));
    function reload() {
      return api('/api/gss/bookings/' + id + '/').then(function (j) { paintDetail(body, j.data, reload); })
        .catch(function (e) { G.clear(body).append(el('div', 'err', e.message)); });
    }
    reload();
  }

  function paintDetail(body, b, reload) {
    G.clear(body);
    var head = el('section', 'card stack'), top = el('div', 'row between');
    top.append(el('div', 'b mono', b.code), el('span', 'pill ' + (STATUS_CLS[b.status] || 'p-none'), b.status_label));
    var grid = el('div', 'fields');
    [['Khách hàng', b.customer], ['Số B/L', (b.hbl_number ? 'HBL ' + b.hbl_number : '') + (b.mbl_number ? (b.hbl_number ? ' · ' : '') + 'MBL ' + b.mbl_number : '') || '—'],
     ['ETA / ngày dỡ', G.fmtDate(b.eta) + ' / ' + G.fmtDate(b.discharge_date)], ['Hạn D/O', G.fmtDate(b.do_expiry)], ['Số booking', b.booking_number], ['Hãng tàu', b.shipping_line], ['Cont', b.total_containers + ' × ' + b.container_size], ['Hàng hóa', b.commodity],
     ['Nơi nhận', b.pickup_location], ['Nơi giao', b.delivery_location], ['Nơi hạ rỗng', b.dropoff_location], ['Ngày hẹn', G.fmtDate(b.loading_date) + ' ' + (b.loading_time || '')]]
      .forEach(function (p) { var d = el('div'); d.append(el('div', 'small mut', p[0]), el('div', 'b', p[1] || '—')); grid.append(d); });
    var pills = el('div', 'row'); pills.append(G.demdetPill('DEM', b.dem), G.demdetPill('DET', b.det));
    var acts = el('div', 'row'); acts.append(ui.btn('Sửa booking', 'sec sm', function () { body.close(); openForm(b); }));
    if (b.status !== 'CANCELLED') acts.append(ui.btn('Hủy booking', 'bad sm', function () {
      var why = ui.ask('Hủy booking này? Gõ lý do (≥ 5 ký tự) để xác nhận:'); if (!why || why.length < 5) return;
      api('/api/gss/bookings/' + b.id + '/', { method: 'PUT', body: { status: 'CANCELLED', notes: ((b.notes ? b.notes + '\n' : '') + 'Hủy: ' + why).slice(0, 4000) } }).then(function () { G.toast('Đã hủy booking', 'ok'); reload(); }).catch(function (e) { G.toast(e.message, 'bad'); });
    }));
    head.append(top, grid, pills, acts); body.append(head);
    if (b.destination_notes) body.append(ui.noteBox('Ghi chú điểm đến', b.destination_notes));
    if (b.road_restrictions) body.append(ui.noteBox('Cấm đường / giờ cấm tải', b.road_restrictions));

    var extra = typeof A.blCards === 'function' ? A.blCards(b, reload) : [];
    extra.forEach(function (n) { body.append(n); });
    if (!b.container_mode) body.append(allocCard(b, reload));
    body.append(tripsCard(b), docsCard(b, reload));
  }

  function allocCard(b, reload) {
    var card = el('section', 'card stack');
    card.append(el('h2', null, 'Chia cont cho nhà xe — đã chia ' + b.allocated + '/' + b.total_containers + ', còn ' + b.unallocated));
    if (!b.allocations.length) card.append(el('div', 'small mut', 'Chưa chia cont cho nhà xe nào. Nhà xe nhận link riêng để tự nhập xe/tài/số cont.'));
    b.allocations.forEach(function (a) {
      var row = el('div', 'alloc'), top = el('div', 'row between'), pct = a.allocated_containers ? Math.round(100 * a.filled / a.allocated_containers) : 0;
      var cls = a.locked ? 'p-none' : a.expired ? 'p-bad' : a.status === 'SUBMITTED' ? 'p-ok' : 'p-warn';
      top.append(el('b', null, a.subcontractor), el('span', 'pill ' + cls, a.expired ? 'Link hết hạn' : a.status_label));
      var bar = el('div', 'progress'), fill = el('i'); fill.style.width = pct + '%'; bar.append(fill);
      var info = el('div', 'small mut', 'Đã nhập xe ' + a.filled + '/' + a.allocated_containers + (a.draft ? ' · ' + a.draft + ' dòng nháp' : '') + ' · nhà xe mở lần cuối ' + G.fmtDT(a.last_opened_at) + ' · gửi lần cuối ' + G.fmtDT(a.last_submitted_at));
      var acts = el('div', 'row');
      function act(label, cls2, fn) { acts.append(ui.btn(label, cls2 || 'sec sm', fn)); }
      act('Xem / sửa dòng xe', '', function () { openRows(a, reload); });
      act('Cấp link mới', null, function () { allocAction(a.id, 'regenerate', reload); });
      act('Đổi số cont', null, function () { var n = ui.ask('Số cont giao cho ' + a.subcontractor + ':', a.allocated_containers); if (n === null) return; patch(a.id, { allocated_containers: Number(n) }, reload); });
      act(a.locked ? 'Mở khóa' : 'Khóa phiếu', null, function () { allocAction(a.id, a.locked ? 'unlock' : 'lock', reload); });
      if (!a.filled) act('Thu hồi', 'bad sm', function () { if (window.confirm('Thu hồi phiếu? Link của nhà xe sẽ ngừng hoạt động.')) allocAction(a.id, 'revoke', reload); });
      row.append(top, bar, info, acts); card.append(row);
    });
    if (b.unallocated > 0 && b.status !== 'CANCELLED') {
      loadMasters().then(function (m) {
        var f = el('div', 'formgrid'), sel = el('select', 'in'), n = el('input', 'in'), d = el('input', 'in');
        sel.append(new Option('— Chọn nhà xe —', '')); m.carriers.forEach(function (s) { sel.append(new Option(s.short_name || s.name, s.id)); });
        n.type = 'number'; n.min = 1; n.max = b.unallocated; n.value = b.unallocated; d.type = 'number'; d.min = 0; d.max = 365; d.value = 30;
        var w1 = el('div'), w2 = el('div'), w3 = el('div'); w1.append(el('label', 'f req', 'Nhà xe'), sel); w2.append(el('label', 'f req', 'Số cont giao'), n); w3.append(el('label', 'f', 'Link có hiệu lực (ngày)'), d); f.append(w1, w2, w3);
        var btn = ui.btn('Chia cont & lấy link', '', function () {
          if (!sel.value) { G.toast('Hãy chọn nhà xe.', 'bad'); return; }
          btn.disabled = true;
          api('/api/bookings/' + b.id + '/vendor-allocations/', { method: 'POST', body: { subcontractor_id: Number(sel.value), allocated_containers: Number(n.value), expires_days: Number(d.value) } })
            .then(function (j) { G.toast(j.message, 'ok'); return showLink(j.link).then(reload); }).catch(function (e) { G.toast(e.message, 'bad'); btn.disabled = false; });
        });
        card.append(f, btn);
      }).catch(function (e) { card.append(el('div', 'err', e.message)); });
    }
    return card;
  }

  function patch(id, body, reload) {
    return api('/api/vendor-allocations/' + id + '/', { method: 'PATCH', body: body }).then(function (j) { G.toast(j.message, 'ok'); if (j.link) return showLink(j.link).then(reload); return reload(); })
      .catch(function (e) { G.toast(e.message, 'bad'); });
  }
  function allocAction(id, action, reload) { return patch(id, { action: action }, reload); }

  // Link chỉ hiện một lần: cho sao chép hoặc mở Zalo để gửi
  function showLink(link) {
    return new Promise(function (resolve) {
      var bg = el('div', 'drawer-bg gss-scope'); bg.style.alignItems = 'center'; bg.style.justifyContent = 'center'; bg.style.zIndex = 70;
      var box = el('div', 'card stack'); box.style.maxWidth = '520px'; box.style.width = '92vw';
      var inp = el('input', 'in mono'); inp.readOnly = true; inp.value = link; inp.setAttribute('aria-label', 'Link cho nhà xe');
      var copy = ui.btn('Sao chép', '', function () { (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).catch(function () { inp.select(); document.execCommand('copy'); }).then(function () { copy.textContent = 'Đã sao chép ✓'; }); });
      var zalo = el('a', 'btn sec', 'Gửi qua Zalo'); zalo.href = 'https://zalo.me/share?url=' + encodeURIComponent(link); zalo.target = '_blank'; zalo.rel = 'noopener noreferrer';
      var close = ui.btn('Đóng', 'sec', function () { bg.remove(); resolve(); });
      var row = el('div', 'row'); row.append(copy, zalo, close);
      box.append(el('h2', null, 'Link cho nhà xe'), el('div', 'note', 'Link chỉ hiện MỘT lần (hệ thống chỉ lưu bản băm). Hãy sao chép và gửi ngay; nếu mất, bấm "Cấp link mới" – link cũ sẽ ngừng hoạt động.'), inp, row);
      bg.append(box); document.body.append(bg); inp.select();
    });
  }

  // Điều vận sửa dòng xe/tài/cont thay nhà xe
  var ROW_FIELDS = [['container_number', 'Số cont', 'mono'], ['seal_number', 'Seal', 'mono'], ['tractor_plate', 'Xe đầu kéo *', 'mono'], ['trailer_plate', 'Rơ-moóc', 'mono'], ['driver_name', 'Tài xế', ''], ['driver_phone', 'SĐT', ''], ['vendor_note', 'Ghi chú', '']];
  function openRows(a, reload) {
    var body = ui.openDrawer('Dòng xe · ' + a.subcontractor); body.append(el('div', 'mut', 'Đang tải…'));
    function paint() {
      api('/api/vendor-allocations/' + a.id + '/').then(function (j) {
        var rows = j.data.rows, inputs = {}; G.clear(body);
        body.append(el('div', 'note', 'Điều vận được sửa mọi dòng, kể cả khi chuyến đã chạy. Mọi thay đổi được ghi nhật ký (trước/sau, người sửa).'));
        rows.forEach(function (r) {
          var card = el('section', 'card stack'), h = el('div', 'row between'); h.append(el('b', null, 'Dòng #' + r.line_no), el('span', 'pill ' + (r.trip_code ? 'p-ok' : 'p-none'), r.trip_code ? r.trip_code + ' · ' + r.step_label : 'Chưa nhập'));
          var f = el('div', 'formgrid'); inputs[r.line_no] = {};
          ROW_FIELDS.forEach(function (c) { var w = el('div'), l = el('label', 'f', c[1]), i = el('input', 'in ' + c[2]); i.value = r[c[0]] || ''; inputs[r.line_no][c[0]] = i; l.htmlFor = i.id = 'r' + r.line_no + c[0]; w.append(l, i); f.append(w); });
          var m = el('div', 'small'); m.id = 'rowmsg' + r.line_no; card.append(h, f, m); body.append(card);
        });
        var save = ui.btn('Lưu tất cả dòng', 'big', function () {
          save.disabled = true;
          var payload = rows.map(function (r) { var o = { line_no: r.line_no }; Object.keys(inputs[r.line_no]).forEach(function (k) { o[k] = inputs[r.line_no][k].value; }); return o; });
          api('/api/vendor-allocations/' + a.id + '/', { method: 'PUT', body: { rows: payload } }).then(function (res) {
            var bad = res.results.filter(function (x) { return !x.ok; }); save.disabled = false;
            res.results.forEach(function (x) { var m = document.getElementById('rowmsg' + x.line_no); if (!m) return; G.clear(m); x.errors.forEach(function (t) { m.append(el('div', 'err', t)); }); x.warnings.forEach(function (t) { m.append(el('div', 'small', '⚠ ' + t)); }); });
            if (bad.length) G.toast(bad.length + ' dòng chưa lưu được, xem thông báo từng dòng.', 'bad'); else { G.toast('Đã lưu ' + res.saved + ' thay đổi', 'ok'); body.close(); reload(); }
          }).catch(function (e) { G.toast(e.message, 'bad'); save.disabled = false; });
        });
        body.append(save);
      }).catch(function (e) { G.clear(body).append(el('div', 'err', e.message)); });
    }
    paint();
  }

  function tripsCard(b) {
    var card = el('section', 'card stack'); card.append(el('h2', null, 'Dòng điều vận của booking (' + b.trips.length + ')'));
    if (!b.trips.length) { card.append(el('div', 'small mut', 'Chưa có chuyến nào: chuyến được tạo khi nhà xe nhập biển số xe đầu kéo.')); return card; }
    var tw = el('div', 'tw'), t = el('table'), hr = el('tr'); ['Cont', 'Nhà xe', 'Xe / Tài xế', 'Bước', 'DEM', 'DET'].forEach(function (h) { hr.append(el('th', null, h)); }); t.append(hr);
    b.trips.forEach(function (r) {
      var tr = el('tr', 'click'); tr.onclick = function () { A.openTrip(r.trip_code); };
      var c0 = el('td'); c0.append(el('div', 'b mono', r.container_number || '(chưa có số)'), el('div', 'small mut', r.trip_code)); if (r.swap_label) c0.append(el('div', 'small', r.swap_label));
      var dem = el('td'), det = el('td'); dem.append(G.demdetPill('', r.dem)); det.append(G.demdetPill('', r.det));
      var st = el('td'); st.append(el('span', 'pill p-info', r.step_label));
      tr.append(c0, el('td', null, r.vendor), el('td', null, r.tractor_plate + ' · ' + (r.driver_name || '—')), st, dem, det); t.append(tr);
    });
    tw.append(t); card.append(tw); return card;
  }

  function docsCard(b, reload) {
    var card = el('section', 'card stack'); card.append(el('h2', null, 'Tệp đính kèm booking (' + b.documents.length + '/10)'));
    var th = el('div', 'stack');
    b.documents.forEach(function (d) {
      var r = el('div', 'row between'), a = el('a', null, d.name); a.href = d.url; a.target = '_blank'; a.rel = 'noopener';
      r.append(a, ui.btn('Gỡ', 'sec sm', function () { api('/api/gss/bookings/' + b.id + '/documents/' + d.id + '/', { method: 'DELETE' }).then(reload).catch(function (e) { G.toast(e.message, 'bad'); }); })); th.append(r);
    });
    card.append(th);
    if (b.documents.length < 10) card.append(G.uploader({ have: b.documents.length, max: 10, onUpload: function (files) {
      var fd = new FormData(); files.forEach(function (f) { fd.append('files', f, f.name); });
      return api('/api/gss/bookings/' + b.id + '/documents/', { method: 'POST', body: fd }).then(function () { G.toast('Đã tải tệp', 'ok'); reload(); });
    } }));
    return card;
  }

  A.register({ booking: renderList });
  A.openBooking = openDetail;
  A.showLink = showLink;
  A.loadMasters = loadMasters;
})();
