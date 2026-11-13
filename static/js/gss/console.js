/* Bảng điều hành GSS: Tổng quan nhà xe · Điều vận · Bãi cont · Quét QR. Giao diện dựng bằng DOM + textContent (không innerHTML). */
(function () {
  'use strict';
  var el = G.el, A = G.api, view = document.getElementById('gss-view');
  var feats = (window.GSS && GSS.features) || {};
  var dispatchFilter = { vendor: '', metric: 'all', q: '', step: '', label: '' };
  var depotFilter = { status: 'IN_YARD', q: '', cargo: '', day: '' };
  var depotYard = ''; // '' = bãi mặc định
  var STEP_CLASS = { READY: 'p-none', ARRIVED_AT_PICKUP: 'p-info', LOADED_ON_VEHICLE: 'p-info', ARRIVED_AT_DELIVERY: 'p-info', UNLOADED: 'p-ok', RETURNING_EMPTY: 'p-warn', EMPTY_RETURNED: 'p-ok', CANCELLED: 'p-bad' };
  var STAGES = [['PICKUP', 'Nhận cont/hàng'], ['DELIVERY', 'Giao hàng'], ['EMPTY_RETURN', 'Hạ rỗng']];

  function field(label, input, cls) { var w = el('div', cls || ''); var l = el('label', 'f', label); l.append(); w.append(l, input); return w; }
  function input(ph, val, extra) { var i = el('input', 'in ' + (extra || '')); if (ph) i.placeholder = ph; if (val != null) i.value = val; return i; }
  function btn(text, cls, fn) { var b = el('button', 'btn ' + (cls || ''), text); b.type = 'button'; if (fn) b.onclick = fn; return b; }
  function ask(text, dflt) { var v = window.prompt(text, dflt || ''); return v == null ? null : v.trim(); }

  // ---------------- điều hướng ----------------
  // Các màn GSS nằm trong khung BIM (router SPA `switchTab`). Mỗi mục sidebar = 1 nhóm màn hình + thanh tab con.
  // Các file khác (booking.js, master.js) gọi GSSApp.register(...) để đăng ký màn hình.
  var screens = {}, current = '', pending = null;
  var NEEDS = { depot: 'depot_yard', scan: 'qr_tracking', pod: 'pod_templates', booking: 'sales' };
  var GROUPS = {
    'dashboard': [['dashboard', 'Tổng quan nhà xe'], ['lookup', 'Tra cứu B/L · cont']]
  };
  function usable(t) { return !!screens[t] && (!NEEDS[t] || feats[NEEDS[t]] !== false); }
  function groupOf(t) { for (var g in GROUPS) if (GROUPS[g].some(function (x) { return x[0] === t; })) return g; return null; }
  function tabsOf(g) { return (GROUPS[g] || []).filter(function (x) { return usable(x[0]); }); }
  var subnav = document.getElementById('gss-subnav');
  function renderSubnav(g, t) {
    if (!subnav) return; G.clear(subnav);
    var items = tabsOf(g); subnav.classList.toggle('hidden', items.length < 2);
    items.forEach(function (x) { var b = el('button', 'subtab', x[1]); b.type = 'button'; b.setAttribute('aria-selected', x[0] === t ? 'true' : 'false'); b.onclick = function () { go(x[0]); }; subnav.append(b); });
  }
  // Mở màn hình bên trong khung (router gọi khi người dùng chọn mục sidebar)
  function show(t, arg) {
    Array.prototype.forEach.call(document.querySelectorAll('.drawer-bg'), function (d) { d.remove(); });
    current = t; renderSubnav(groupOf(t), t);
    screens[t](arg);
  }
  function enter(g) {
    var p = pending; pending = null;
    if (p && groupOf(p.t) === g && usable(p.t)) return show(p.t, p.arg);
    var first = tabsOf(g)[0]; if (first) show(first[0]);
  }
  // Chuyển sang màn hình khác (có thể thuộc mục sidebar khác): để router chuyển mục rồi gọi lại enter()
  function go(t, arg) {
    if (!usable(t)) t = 'dashboard';
    var g = groupOf(t);
    if (typeof previousActiveTab !== 'undefined' && previousActiveTab === g) return show(t, arg);
    pending = { t: t, arg: arg };
    if (typeof window.switchTab === 'function') window.switchTab(g, true); else enter(g);
  }
  function hasTab(g) { return tabsOf(g).length > 0; }
  function loading() { G.clear(view).append(el('div', 'card center mut', 'Đang tải…')); }
  function fail(e) { G.clear(view).append(el('div', 'card err', e.message)); }


  // ---------------- Theo dõi hành trình xe container (kế thừa bản demo) ----------------
  var FLEET_STEPS = [['READY', 'Sẵn sàng'], ['ARRIVED_AT_PICKUP', 'Đến nơi nhận'], ['LOADED_ON_VEHICLE', 'Đã nhận cont'], ['ARRIVED_AT_DELIVERY', 'Đến nơi giao'],
    ['UNLOADED', 'Giao xong'], ['RETURNING_EMPTY', 'Đi hạ rỗng'], ['EMPTY_RETURNED', 'Hạ rỗng']];
  var NODE_CONFIG = {
    1: { key: 'pickup', tag: 'NƠI NHẬN', cls: 'node-pickup', dotCls: 'dot-pickup' },
    3: { key: 'delivery', tag: 'NƠI GIAO', cls: 'node-delivery', dotCls: 'dot-delivery' },
    6: { key: 'dropoff', tag: 'NƠI HẠ RỖNG', cls: 'node-dropoff', dotCls: 'dot-dropoff' }
  };
  var FLEET_COLORS = ['#2563eb', '#d97706', '#7c3aed', '#e11d48', '#0891b2'];
  function pctAt(k) { return Math.round(k / (FLEET_STEPS.length - 1) * 1000) / 10; }
  var fleetState = { q: '', sort: 'vendor', filter: 'all' };
  function stepIndex(s) { for (var i = 0; i < FLEET_STEPS.length; i++) if (FLEET_STEPS[i][0] === s) return i; return 0; }
  function fleetTimeline(host) {
    var card = el('section', 'card stack fleet'); host.append(card);
    var head = el('div', 'row between'), ttl = el('div'), cnt = el('div', 'small mut');
    ttl.append(el('h2', null, 'Theo dõi hành trình xe container'), el('div', 'small mut', 'Tiến trình 7 mốc: Sẵn sàng ➔ Nhận cont ➔ Giao hàng ➔ Hạ rỗng. Bấm vào một xe để xem chi tiết chuyến.'));
    head.append(ttl, cnt); card.append(head);
    var bar = el('div', 'row fleet-bar'), q = input('Tìm biển số, mã chuyến, số cont, tài xế, nhà xe, khách…', fleetState.q); q.style.flex = '1'; q.style.minWidth = '220px';
    var sort = el('select', 'in'); sort.style.width = 'auto';
    [['vendor', 'Sắp xếp: Nhà xe'], ['progress_desc', 'Tiến độ: Cao ➔ Thấp'], ['progress_asc', 'Tiến độ: Thấp ➔ Cao'], ['plate', 'Biển số: A ➔ Z']].forEach(function (o) { sort.append(new Option(o[1], o[0])); });
    sort.value = fleetState.sort;
    var chips = el('div', 'row'); bar.append(q, sort, chips); card.append(bar);
    var list = el('div', 'fleet-list'); card.append(list);
    var rows = [];
    function match(r) {
      var f = fleetState.filter, done = r.step === 'EMPTY_RETURNED';
      if (f === 'running' && done) return false;
      if (f === 'done' && !done) return false;
      if (f.indexOf('v:') === 0 && r.vendor !== f.slice(2)) return false;
      var s = fleetState.q.toLowerCase(); if (!s) return true;
      return [r.tractor_plate, r.trip_code, r.container_number, r.container_number_2, r.driver_name, r.vendor, r.customer, r.booking_code].join(' ').toLowerCase().indexOf(s) >= 0;
    }
    function draw() {
      var vis = rows.filter(match);
      vis.sort(function (a, b) {
        if (fleetState.sort === 'progress_desc') return stepIndex(b.step) - stepIndex(a.step);
        if (fleetState.sort === 'progress_asc') return stepIndex(a.step) - stepIndex(b.step);
        if (fleetState.sort === 'plate') return (a.tractor_plate || '').localeCompare(b.tractor_plate || '');
        return (a.vendor || '').localeCompare(b.vendor || '') || (a.tractor_plate || '').localeCompare(b.tractor_plate || '');
      });
      cnt.textContent = 'Hiển thị ' + vis.length + ' / ' + rows.length + ' xe';
      G.clear(list);
      var hd = el('div', 'fleet-head'), hw = el('div', 'fleet-who'); hw.append(el('i', 'ph ph-truck'), document.createTextNode(' Khách hàng & số cont')); hd.append(hw);
      var htrack = el('div', 'fleet-wrap');
      FLEET_STEPS.forEach(function (s, k) {
        var cfg = NODE_CONFIG[k];
        var lblText = cfg ? ('★ ' + cfg.tag) : ((k + 1) + '. ' + s[1].toUpperCase());
        var t = el('span', 'fleet-lbl hd' + (cfg ? ' hd-' + cfg.key : ''), lblText);
        t.style.left = pctAt(k) + '%';
        htrack.append(t);
      });
      hd.append(htrack); list.append(hd);
      if (!vis.length) { list.append(el('div', 'empty', 'Không có xe nào khớp bộ lọc.')); return; }
      var lastVendor = null, idx = 0;
      vis.forEach(function (r) {
        if (fleetState.sort === 'vendor' && r.vendor !== lastVendor) {
          lastVendor = r.vendor; idx = 0;
          var grp = vis.filter(function (x) { return x.vendor === r.vendor; }), vh = el('div', 'fleet-vendor');
          var vl = el('div', 'row'); vl.style.flexWrap = 'nowrap'; vl.append(el('i', 'ph ph-buildings'), el('b', null, 'Nhà xe: ' + (r.vendor || '—')), el('span', 'sep', '|'), el('span', 'pill p-ok', grp.length + ' chuyến'));
          var rt = [r.pickup_location, r.delivery_location, r.dropoff_location].filter(Boolean).join(' ➔ ');
          vh.append(vl, el('span', 'small mut ell', rt ? 'Lộ trình: ' + rt : '')); list.append(vh);
        }
        var i = stepIndex(r.step), pct = Math.round(i / (FLEET_STEPS.length - 1) * 100), row = el('div', 'fleet-row'); row.tabIndex = 0;
        var color = i === FLEET_STEPS.length - 1 ? '#059669' : FLEET_COLORS[idx++ % FLEET_COLORS.length];
        row.style.setProperty('--vc', color);
        row.onclick = function () { openTrip(r.trip_code); };
        row.onkeydown = function (e) { if (e.key === 'Enter') openTrip(r.trip_code); };
        var who = el('div', 'fleet-who'), l1 = el('div', 'row between'); l1.style.flexWrap = 'nowrap';
        var conts = [r.container_number, r.container_number_2].filter(function (x) { return x && x !== '-'; }).join('/') || '—';
        l1.append(el('span', 'cust ell', r.customer_short || r.customer || '—'), el('span', 'small mut b', pct + '%'));
        var l2 = el('div', 'conts mono ell', conts);
        who.append(l1, l2); who.title = (r.customer || '') + ' · Cont ' + conts + ' · Xe ' + (r.tractor_plate || '—') + ' · ' + (r.vendor || '') + ' · ' + (r.driver_name || '') + ' — bấm để xem chi tiết';
        var wrap = el('div', 'fleet-wrap'), places = { 1: r.pickup_location, 3: r.delivery_location, 6: r.dropoff_location };
        FLEET_STEPS.forEach(function (s, k) {
          if (!places[k]) return;
          var cfg = NODE_CONFIG[k] || { tag: s[1], cls: '', dotCls: '' };
          var passed = k <= i;
          var t = el('span', 'fleet-lbl node-dest ' + cfg.cls + (passed ? ' passed' : ' upcoming'), places[k]);
          t.style.left = pctAt(k) + '%';
          t.title = (cfg.tag ? (cfg.tag + ': ') : '') + places[k] + (passed ? ' (Đã qua)' : ' (Điểm tiếp theo)');
          wrap.append(t);
        });
        var line = el('div', 'fleet-line'), fill = el('i'); fill.style.width = pct + '%'; line.append(fill);
        FLEET_STEPS.forEach(function (s, k) {
          var cfg = NODE_CONFIG[k];
          var cls = 'dot' + (k <= i ? ' on' : '') + (cfg ? ' ' + cfg.dotCls : '');
          var d = el('span', cls);
          d.style.left = pctAt(k) + '%';
          d.title = (cfg ? ('[' + cfg.tag + '] ') : '') + s[1];
          line.append(d);
        });
        var truck = el('span', 'truck'); truck.style.left = pct + '%'; truck.append(GSSTruck.make(r.tractor_plate)); line.append(truck);
        wrap.append(line); row.append(who, wrap); list.append(row);
      });
    }
    function drawChips() {
      G.clear(chips);
      var vendors = [];
      rows.forEach(function (r) { if (r.vendor && vendors.indexOf(r.vendor) < 0) vendors.push(r.vendor); });
      var nRun = rows.filter(function (r) { return r.step !== 'EMPTY_RETURNED'; }).length;
      var defs = [['all', 'Tất cả (' + rows.length + ')'], ['running', 'Đang chạy (' + nRun + ')'], ['done', 'Đã hạ rỗng (' + (rows.length - nRun) + ')']]
        .concat(vendors.map(function (v) { return ['v:' + v, v + ' (' + rows.filter(function (r) { return r.vendor === v; }).length + ')']; }));
      defs.forEach(function (d) { chips.append(btn(d[1], 'sm ' + (fleetState.filter === d[0] ? '' : 'sec'), function () { fleetState.filter = d[0]; drawChips(); draw(); })); });
    }
    q.oninput = function () { fleetState.q = q.value; draw(); };
    sort.onchange = function () { fleetState.sort = sort.value; draw(); };
    list.append(el('div', 'empty', 'Đang tải…'));
    A('/api/gss/trips/?metric=all').then(function (j) {
      rows = (j.results || []).filter(function (r) { return r.step !== 'CANCELLED'; }); drawChips(); draw();
    }).catch(function (e) { G.clear(list).append(el('div', 'err', e.message)); });
  }

  // ---------------- 1. Tổng quan ----------------
  function renderDashboard() {
    loading();
    A('/api/gss/dashboard/').then(function (j) {
      var d = j.data, k = d.kpi, root = el('div', 'stack');
      var kp = el('div', 'kpis kpis5'), bz = k.business, tr = k.trips, fl = k.fleet;
      // Thẻ KPI theo mẫu demo: tiêu đề đánh số + icon, giá trị lớn, 2 dòng phụ, nút điều hướng
      function kcard(tone, title, icon, label, value, l1, l2, link, onclick) {
        var c = el('div', 'kcard tone-' + tone), h = el('div', 'row between'), ic = el('i', 'ph ' + icon);
        h.style.flexWrap = 'nowrap'; h.append(el('span', 'kt', title), ic);
        var ft = el('div', 'kft'), r2 = el('div', 'row between'); r2.style.flexWrap = 'nowrap';
        var a = el('button', 'klink', link + ' ›'); a.type = 'button'; a.onclick = onclick;
        r2.append(el('span', 'small mut ell', l2), a); ft.append(el('div', 'small mut ell', l1), r2);
        c.append(h, el('div', 'small mut', label), el('div', 'kv', value), ft); return c;
      }
      kp.append(
        kcard('indigo', '1. KINH DOANH', 'ph-trend-up', 'Booking đang mở', bz.bookings + ' đơn', bz.containers + ' cont · ' + bz.customers + ' khách hàng', 'Chưa tính booking đã hủy', 'Sale & Booking', function () { go('booking'); }),
        kcard('teal', '2. VẬN HÀNH CHUYẾN', 'ph-truck', 'Chuyến đang vận hành', tr.running + ' đang chạy / ' + tr.total, 'Đã hạ rỗng: ' + tr.done + ' chuyến (' + tr.done_pct + '%)',
          k.progress.received + ' nhận · ' + k.progress.delivered + ' giao · ' + k.progress.returned + ' hạ', 'Điều vận', function () { openList({ metric: 'all', label: 'Tất cả cont' }); }),
        kcard('blue', '3. KHẢ DỤNG ĐỘI XE', 'ph-steering-wheel', 'Tỷ lệ xe đang lăn bánh', fl.pct + '% (' + fl.running + '/' + fl.plates + ' xe)', fl.drivers + ' tài xế · ' + fl.vendors + ' nhà xe tham gia', 'Xe đã nhận cont, chưa hạ rỗng', 'Phương tiện', function () { go('subcontractors'); }),
        kcard('emerald', '4. BÃI ĐẮK NÔNG', 'ph-warehouse', 'Tồn bãi hiện tại', k.yard.in_yard + ' cont', 'Hàng ' + k.yard.full + ' · Rỗng ' + k.yard.empty, 'Hôm nay vào ' + k.yard.in_today + ' / ra ' + k.yard.out_today, 'Bãi cont',
          feats.depot_yard ? function () { depotFilter = { status: 'IN_YARD', q: '', cargo: '', day: '' }; go('depot'); } : function () {}),
        kcard('amber', '5. CẢNH BÁO DEM/DET', 'ph-warning', 'Cont sắp/đã quá hạn', k.alerts.count + ' cont', 'Còn ≤ ' + d.warn_days + ' ngày hoặc quá hạn', 'Chưa hạ rỗng', 'Xem danh sách', function () { openList({ metric: 'alert', label: 'Cảnh báo DEM/DET' }); }));
      root.append(kp);
      // Hai biểu đồ (Chart.js tự host): cont theo khách hàng, cont chia theo nhà xe
      var cg = el('div', 'charts2'), ch = d.charts || { by_customer: [], by_vendor: [] };
      function chartCard(title, icon, sub, empty, build) {
        var c = el('section', 'card'), h = el('h2', 'row'); h.append(el('i', 'ph ' + icon), el('span', null, title));
        var box = el('div', 'chartbox'); c.append(h, el('div', 'small mut', sub), box);
        if (!empty || typeof Chart === 'undefined') { box.append(el('div', 'empty', typeof Chart === 'undefined' ? 'Chưa tải được thư viện biểu đồ.' : 'Chưa có dữ liệu.')); } else { var cv = el('canvas'); box.append(cv); setTimeout(function () { build(cv); }, 0); }
        return c;
      }
      var PAL = ['#0d9488', '#2563eb', '#d97706', '#7c3aed', '#e11d48', '#059669', '#64748b'];
      cg.append(
        chartCard('Số cont theo khách hàng', 'ph-chart-bar', 'Top ' + ch.by_customer.length + ' khách (booking chưa hủy)', ch.by_customer.length, function (cv) {
          new Chart(cv, { type: 'bar', data: { labels: ch.by_customer.map(function (x) { return x.customer; }), datasets: [{ label: 'Số cont', data: ch.by_customer.map(function (x) { return x.containers; }), backgroundColor: '#0d9488', borderRadius: 6, maxBarThickness: 38 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { ticks: { maxRotation: 0, autoSkip: false, callback: function (v) { var t = this.getLabelForValue(v); return t.length > 14 ? t.slice(0, 13) + '…' : t; } } } } } });
        }),
        chartCard('Cont chia theo nhà xe', 'ph-chart-donut', 'Tổng ' + d.totals.total + ' cont đã chia cho ' + ch.by_vendor.length + ' nhà xe', ch.by_vendor.length, function (cv) {
          new Chart(cv, { type: 'doughnut', data: { labels: ch.by_vendor.map(function (x) { return x.vendor; }), datasets: [{ data: ch.by_vendor.map(function (x) { return x.containers; }), backgroundColor: PAL, borderWidth: 2, borderColor: '#fff' }] },
            options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 12 } } } } } });
        }));
      root.append(cg);

      var card = el('section', 'card'); card.append(el('h2', null, 'Ma trận theo dõi nhà xe'), el('div', 'small mut', 'Bấm vào bất kỳ con số nào để xem đúng danh sách cont đó.'));
      var cols = [['total', 'Tổng cont giao', 'all'], ['pending', 'Chờ nhập xe/tài', 'pending'], ['received', 'Đã nhận cont', 'received'], ['delivering', 'Đang đi giao', 'delivering'],
        ['delivered', 'Đã giao hàng', 'delivered'], ['returned', 'Đã hạ rỗng', 'returned'], ['swapped', 'Đổi vỏ hạ', 'swapped'], ['alert', 'Cảnh báo DEM/DET', 'alert']];
      var tw = el('div', 'tw'), t = el('table'), hr = el('tr'); hr.append(el('th', null, 'Nhà xe')); cols.forEach(function (c) { hr.append(el('th', 'num', c[1])); }); t.append(hr);
      function row(r, bold) {
        var tr = el('tr'); tr.append(el('td', bold ? 'b' : '', r.vendor));
        cols.forEach(function (c) {
          var v = r[c[0]], td = el('td', 'num'), b = el('button', 'cellbtn' + (c[0] === 'alert' && v ? ' hot' : ''), String(v) + (c[0] === 'alert' && v ? ' ⚠' : ''));
          b.type = 'button'; b.setAttribute('aria-label', r.vendor + ': ' + c[1] + ' ' + v);
          b.onclick = function () { openList({ vendor: r.vendor_id || '', metric: c[2], label: (r.vendor_id ? r.vendor + ' · ' : '') + c[1] }); };
          td.append(b); tr.append(td);
        }); return tr;
      }
      d.matrix.forEach(function (r) { t.append(row(r)); });
      if (d.matrix.length) t.append(row(Object.assign({ vendor: 'TỔNG', vendor_id: '' }, d.totals), true));
      else { var er = el('tr'), td = el('td', 'center mut', 'Chưa chia cont cho nhà xe nào. Vào Booking → "Chia cont cho nhà xe".'); td.colSpan = cols.length + 1; er.append(td); t.append(er); }
      tw.append(t); card.append(tw);
      // Ma trận theo dõi nhà xe: tạm ẩn khỏi Dashboard (cần dùng lại thì bỏ comment dòng dưới)
      // root.append(card);
      var fh = el('div'); root.append(fh); G.clear(view).append(root); fleetTimeline(fh);
    }).catch(fail);
  }
  function openList(f) { dispatchFilter = Object.assign({ vendor: '', metric: 'all', q: '', step: '', label: '' }, f); go('dispatch'); }

  function A_manual() { return typeof window.GSSApp.openManualTrip === 'function'; }

  // ---------------- 2. Điều vận ----------------
  function renderDispatch() {
    var root = el('div', 'stack'), bar = el('div', 'row');
    var q = input('Tìm số cont, mã chuyến, biển số, tài xế…', dispatchFilter.q); q.style.maxWidth = '340px';
    var st = el('select', 'in'); st.style.maxWidth = '220px';
    [['', 'Mọi bước']].concat([['READY', 'Sẵn sàng'], ['ARRIVED_AT_PICKUP', 'Đã đến nơi nhận'], ['LOADED_ON_VEHICLE', 'Đã lên xe'], ['ARRIVED_AT_DELIVERY', 'Đã đến nơi giao'], ['UNLOADED', 'Đã hạ xe/giao xong'], ['RETURNING_EMPTY', 'Đang đi hạ rỗng'], ['EMPTY_RETURNED', 'Đã hạ rỗng']])
      .forEach(function (o) { st.append(new Option(o[1], o[0])); });
    st.value = dispatchFilter.step;
    var go1 = btn('Lọc', '', function () { dispatchFilter.q = q.value.trim(); dispatchFilter.step = st.value; renderDispatch(); });
    q.onkeydown = function (e) { if (e.key === 'Enter') go1.click(); };
    bar.append(q, st, go1);
    var xq = new URLSearchParams({ metric: dispatchFilter.metric, q: dispatchFilter.q, step: dispatchFilter.step }); if (dispatchFilter.vendor) xq.set('vendor', dispatchFilter.vendor);
    var xl = el('a', 'btn sec', 'Xuất Excel'); xl.href = '/api/gss/trips-export/?' + xq; bar.append(xl);
    if (A_manual()) bar.append(btn('+ Tạo chuyến thủ công', 'sec', function () { window.GSSApp.openManualTrip(function () { renderDispatch(); }); }));
    if (dispatchFilter.label || dispatchFilter.vendor || dispatchFilter.metric !== 'all') {
      bar.append(el('span', 'pill p-info', 'Đang lọc: ' + (dispatchFilter.label || dispatchFilter.metric)), btn('Bỏ lọc', 'sec sm', function () { dispatchFilter = { vendor: '', metric: 'all', q: '', step: '', label: '' }; renderDispatch(); }));
    }
    root.append(bar); G.clear(view).append(root);
    var holder = el('div', 'card center mut', 'Đang tải…'); root.append(holder);
    var qs = new URLSearchParams({ metric: dispatchFilter.metric, q: dispatchFilter.q, step: dispatchFilter.step }); if (dispatchFilter.vendor) qs.set('vendor', dispatchFilter.vendor);
    A('/api/gss/trips/?' + qs).then(function (j) {
      if (dispatchFilter.metric === 'pending') return holder.replaceWith(pendingTable(j.pending));
      holder.replaceWith(tripTable(j));
    }).catch(function (e) { holder.className = 'card err'; holder.textContent = e.message; });
  }

  function pendingTable(rows) {
    var tw = el('div', 'tw'), t = el('table'), hr = el('tr'); ['Booking', 'Nhà xe', 'Được giao', 'Còn thiếu xe/tài'].forEach(function (h) { hr.append(el('th', null, h)); }); t.append(hr);
    rows.forEach(function (r) { var tr = el('tr'); [r.booking_code, r.vendor, r.allocated, r.missing].forEach(function (v) { tr.append(el('td', null, String(v))); }); t.append(tr); });
    if (!rows.length) { var e = el('tr'), td = el('td', 'center mut', 'Không còn dòng nào chờ nhà xe nhập.'); td.colSpan = 4; e.append(td); t.append(e); }
    tw.append(t); return tw;
  }

  function tripTable(j) {
    var wrap = el('div', 'stack');
    wrap.append(el('div', 'small mut', j.total + ' dòng' + (j.truncated ? ' (đang hiện 300 dòng đầu, hãy lọc thêm)' : '')));
    var tw = el('div', 'tw'), t = el('table'), hr = el('tr');
    ['Cont', 'Nhà xe', 'Xe / Tài xế', 'Bước hiện tại', 'DEM', 'DET', 'Chứng từ N·G·H'].forEach(function (h) { hr.append(el('th', null, h)); }); t.append(hr);
    j.results.forEach(function (r) {
      var tr = el('tr', 'click'); tr.tabIndex = 0; tr.onclick = function () { openTrip(r.trip_code); }; tr.onkeydown = function (e) { if (e.key === 'Enter') openTrip(r.trip_code); };
      var c1 = el('td');
      if (r.container_number_2) {
        c1.append(el('div', 'b mono small', (r.container_number || '(chưa có số)') + ' / ' + r.container_number_2), el('div', 'small mut', r.trip_code + (r.line_no ? ' · dòng ' + r.line_no : '') + ' · Kẹp 20\''));
      } else {
        c1.append(el('div', 'b mono', r.container_number || '(chưa có số)'), el('div', 'small mut', r.trip_code + (r.line_no ? ' · dòng ' + r.line_no : '')));
      }
      if (r.swap_label) c1.append(el('div', 'small b', r.swap_label));
      var c3 = el('td'); c3.append(el('div', null, r.tractor_plate + (r.trailer_plate ? ' / ' + r.trailer_plate : '')), el('div', 'small mut', (r.driver_name || '—') + (r.driver_phone ? ' · ' + r.driver_phone : '')));
      var c4 = el('td'); c4.append(el('span', 'pill ' + (STEP_CLASS[r.step] || 'p-none'), r.step_label));
      var dem = el('td'), det = el('td'); dem.append(G.demdetPill('', r.dem)); det.append(G.demdetPill('', r.det));
      var c7 = el('td', 'mono'); c7.textContent = r.docs.PICKUP + ' · ' + r.docs.DELIVERY + ' · ' + r.docs.EMPTY_RETURN + ' /10';
      tr.append(c1, el('td', null, r.vendor), c3, c4, dem, det, c7); t.append(tr);
    });
    if (!j.results.length) { var e = el('tr'), td = el('td', 'center mut', 'Không có dòng điều vận nào khớp bộ lọc.'); td.colSpan = 7; e.append(td); t.append(e); }
    tw.append(t); wrap.append(tw); return wrap;
  }

  // ---------------- Ngăn kéo chi tiết chuyến ----------------
  var drawerStack = [];
  function openDrawer(title) {
    var bg = el('div', 'drawer-bg gss-scope'), d = el('div', 'drawer'); bg.append(d);
    var head = el('header'); head.append(el('h2', null, title), btn('Đóng', 'sec sm', close)); d.append(head);
    function close() { bg.remove(); drawerStack = drawerStack.filter(function (x) { return x !== bg; }); document.removeEventListener('keydown', esc); }
    function esc(e) { if (e.key === 'Escape') close(); }
    bg.addEventListener('mousedown', function (e) { if (e.target === bg) close(); });
    document.addEventListener('keydown', esc); document.body.append(bg); drawerStack.push(bg);
    var body = el('div', 'stack'); d.append(body); body.close = close; return body;
  }

  function openTrip(code) {
    var body = openDrawer('Chuyến ' + code); body.append(el('div', 'mut', 'Đang tải…'));
    function reload() { return A('/api/gss/trips/' + encodeURIComponent(code) + '/').then(function (j) { paintTrip(body, j.data, reload); }).catch(function (e) { G.clear(body).append(el('div', 'err', e.message)); }); }
    reload();
  }

  function paintTrip(body, t, reload) {
    G.clear(body);
    // tiêu đề + tác vụ nhanh
    var h = el('section', 'card stack'), top = el('div', 'row between');
    top.append(el('div', 'b mono', (t.container_number || '(chưa có số cont)') + (t.container_type ? ' · ' + t.container_type : '')), el('span', 'pill ' + (STEP_CLASS[t.step] || 'p-none'), t.step_label));
    h.append(top);
    if (t.swap_label) h.append(el('div', 'pill p-warn', t.swap_label + (t.swap_reason ? ' — ' + t.swap_reason : '')));
    var g = el('div', 'fields');
    [['Mã chuyến', t.trip_code], ['Booking', t.booking_code], ['Nhà xe', t.vendor], ['Xe đầu kéo', t.tractor_plate], ['Rơ-moóc', t.trailer_plate], ['Tài xế', t.driver_name + (t.driver_phone ? ' · ' + t.driver_phone : '')],
     ['Seal', t.seal_number], ['Nơi nhận', t.pickup_location], ['Nơi giao', t.delivery_location], ['Nơi hạ rỗng', t.dropoff_location]].forEach(function (p) { var d = el('div'); d.append(el('div', 'small mut', p[0]), el('div', 'b', p[1] || '—')); g.append(d); });
    var pills = el('div', 'row'); pills.append(G.demdetPill('DEM', t.dem), G.demdetPill('DET', t.det));
    var acts = el('div', 'row');
    if (feats.pod_templates) acts.append(btn('In biên bản giao hàng', 'sec sm', function () { window.open('/api/gss/trips/' + t.trip_code + '/pod/', '_blank', 'noopener'); }));
    if (feats.qr_tracking) acts.append(btn('In tem QR', 'sec sm', function () { window.open('/api/gss/trips/' + t.trip_code + '/labels/', '_blank', 'noopener'); }));
    h.append(g, pills, acts); body.append(h);
    if (t.destination_notes) body.append(noteBox('Lưu ý điểm đến', t.destination_notes));
    if (t.road_restrictions) body.append(noteBox('Cấm đường / giờ cấm tải', t.road_restrictions));

    body.append(stepsCard(t, reload), attachmentsCard(t, reload));
    if (feats.lcl_packages) body.append(packagesCard(t, reload));
    if (feats.driver_messages) body.append(messageCard(t, reload));
    var ev = el('section', 'card'); ev.append(el('h2', null, 'Nhật ký hành trình'));
    t.events.forEach(function (e) { ev.append(el('div', 'small', G.fmtDT(e.at) + ' · ' + e.title + (e.by ? ' · ' + e.by : '') + (e.note ? ' — ' + e.note : ''))); });
    body.append(ev);
    // Trip Card mở rộng (static/js/gss/finance.js): B/L, tài chính chuyến, chi hộ, street-turn, chứng từ tên chuẩn
    if (typeof window.GSSApp.tripExtras === 'function') window.GSSApp.tripExtras(body, t, reload);
  }
  function noteBox(title, text) { var n = el('div', 'note'); n.append(el('b', null, title), document.createTextNode(text)); return n; }

  function stepsCard(t, reload) {
    var card = el('section', 'card stack'); card.append(el('h2', null, 'Tiến độ & chuyển bước'));
    var steps = el('div', 'steps'), idx = t.steps.map(function (s) { return s.key; }).indexOf(t.step);
    t.steps.forEach(function (s, i) { steps.append(el('span', i < idx ? 'done' : i === idx ? 'cur' : '', s.label + (s.at ? ' · ' + G.fmtDT(s.at) : ''))); });
    card.append(steps);
    if (t.step === 'CANCELLED') return card;
    var sel = el('select', 'in'); t.steps.forEach(function (s) { if (s.key !== t.step) sel.append(new Option(s.label, s.key)); });
    if (t.action) sel.value = t.action.to;
    var force = el('input'); force.type = 'checkbox'; force.style.width = force.style.height = '22px';
    var fl = el('label', 'row'); fl.append(force, el('span', 'small', 'Lùi/nhảy bước hoặc bỏ qua kiểm tra (cần lý do, được ghi vết)'));
    var reason = input('Lý do (≥ 5 ký tự)'); reason.classList.add('hidden'); force.onchange = function () { reason.classList.toggle('hidden', !force.checked); };
    var cont = input('Số container', t.container_number, 'mono'); var swapBox = el('div', 'stack hidden'), sn = input('Số cont thực tế hạ rỗng', '', 'mono'), sr = input('Lý do đổi vỏ (bắt buộc)');
    swapBox.append(sn, sr);
    function sync() { cont.classList.toggle('hidden', !(sel.value === 'LOADED_ON_VEHICLE' && !t.container_number)); swapBox.classList.toggle('hidden', sel.value !== 'EMPTY_RETURNED'); }
    sel.onchange = sync; sync();
    var msg = el('div', 'err'), go2 = btn('Chuyển bước', '', function () {
      msg.textContent = ''; go2.disabled = true;
      var body = { to: sel.value, force: force.checked, reason: reason.value, fields: {} };
      if (!cont.classList.contains('hidden') && cont.value) body.fields.container_number = cont.value;
      if (sel.value === 'EMPTY_RETURNED' && sn.value.trim()) body.swap = { new_number: sn.value, reason: sr.value };
      A('/api/gss/trips/' + t.trip_code + '/step/', { method: 'POST', body: body }).then(function (j) { G.toast(j.message + (j.warning ? ' ' + j.warning : ''), j.warning ? '' : 'ok'); reload(); })
        .catch(function (e) { msg.textContent = e.message; go2.disabled = false; });
    });
    var cancel = btn('Hủy chuyến', 'bad sm', function () {
      var why = ask('Lý do hủy chuyến (≥ 5 ký tự):'); if (!why) return;
      A('/api/gss/trips/' + t.trip_code + '/step/', { method: 'POST', body: { cancel: true, reason: why } }).then(function () { G.toast('Đã hủy chuyến', 'ok'); reload(); }).catch(function (e) { G.toast(e.message, 'bad'); });
    });
    var w = el('div', 'fields'); w.append(field('Chuyển sang', sel), field('Số container', cont), field('', swapBox, 'full'));
    card.append(w, fl, reason, msg, el('div', 'row'));
    card.lastChild.append(go2, cancel);
    if (t.action && t.action.needs_files && !t.action.ready) card.insertBefore(el('div', 'note', 'Bước "' + t.action.label + '" cần ít nhất 1 chứng từ chặng này — hãy tải lên bên dưới.'), msg);
    return card;
  }

  function attachmentsCard(t, reload) {
    var card = el('section', 'card stack'); card.append(el('h2', null, 'Chứng từ theo chặng (tối đa ' + t.max_files + ' file/chặng)'));
    STAGES.forEach(function (s) {
      var docs = t.attachments.filter(function (a) { return a.stage === s[0]; }), box = el('div', 'stack');
      var head = el('div', 'row between'); head.append(el('b', null, s[1]), el('span', 'pill ' + (docs.length ? 'p-ok' : 'p-warn'), docs.length + '/' + t.max_files + (docs.length ? '' : ' · chưa có')));
      box.append(head);
      var th = el('div', 'thumbs');
      docs.forEach(function (d) {
        var cell = el('div'), a = el('a'); a.href = d.url; a.target = '_blank'; a.rel = 'noopener'; a.title = d.title + ' · ' + d.by;
        if (/\.pdf$/i.test(d.url)) { a.className = 'thumb'; a.textContent = 'PDF'; } else { var im = el('img', 'thumb'); im.src = d.url; im.alt = d.title; im.loading = 'lazy'; a.append(im); }
        var rm = btn('Gỡ', 'sec sm', function () {
          var why = ask('Lý do gỡ chứng từ (≥ 5 ký tự):'); if (!why) return;
          A('/api/gss/trips/' + t.trip_code + '/attachments/' + d.id + '/', { method: 'DELETE', body: { reason: why } }).then(reload).catch(function (e) { G.toast(e.message, 'bad'); });
        }); rm.style.marginTop = '4px'; cell.append(a, rm); th.append(cell);
      });
      box.append(th);
      if (docs.length < t.max_files) box.append(G.uploader({ have: docs.length, max: t.max_files, onUpload: function (files) {
        var fd = new FormData(); fd.append('stage', s[0]); files.forEach(function (f) { fd.append('files', f, f.name); });
        return A('/api/gss/trips/' + t.trip_code + '/attachments/', { method: 'POST', body: fd }).then(function () { G.toast('Đã tải chứng từ', 'ok'); reload(); });
      } }));
      card.append(box);
    });
    return card;
  }

  function packagesCard(t, reload) {
    var card = el('section', 'card stack'), sum = t.package_summary;
    card.append(el('h2', null, 'Hàng lẻ theo kiện có Seal' + (sum.total ? ' — bốc ' + sum.loaded + '/' + sum.total + ' · giao ' + sum.delivered + '/' + sum.total : '')));
    if (t.packages.length) {
      var tw = el('div', 'tw'), tb = el('table'), hr = el('tr'); ['Kiện', 'Mã kiện', 'Seal', 'Người nhận', 'Tình trạng', ''].forEach(function (x) { hr.append(el('th', null, x)); }); tb.append(hr);
      t.packages.forEach(function (p) {
        var tr = el('tr'), cls = p.status === 'DELIVERED' ? 'p-ok' : (p.status === 'DAMAGED' || p.status === 'MISSING') ? 'p-bad' : p.status === 'CREATED' ? 'p-none' : 'p-info';
        var st = el('td'); st.append(el('span', 'pill ' + cls, p.status_label)); var ac = el('td');
        if (p.status === 'CREATED' && ['READY', 'ARRIVED_AT_PICKUP'].indexOf(t.step) >= 0) {
          ac.append(btn('Xóa', 'sec sm', function () { A('/api/gss/packages/' + p.id + '/', { method: 'DELETE' }).then(reload).catch(function (e) { G.toast(e.message, 'bad'); }); }));
        }
        tr.append(el('td', null, p.index + '/' + p.total), el('td', 'mono', p.code), el('td', 'mono', p.seal_number), el('td', null, p.recipient_name), st, ac); tb.append(tr);
      });
      tw.append(tb); card.append(tw);
    }
    if (['READY', 'ARRIVED_AT_PICKUP'].indexOf(t.step) >= 0) {
      var f = el('div', 'fields'), n = input('Số kiện', '', ''), pre = input('Tiền tố seal, VD: SL-', '', 'mono'), start = input('Bắt đầu từ', '1'), rc = input('Người nhận (tùy chọn)');
      n.type = 'number'; n.min = 1; start.type = 'number';
      f.append(field('Số kiện', n), field('Tiền tố seal', pre), field('Số seal đầu', start), field('Người nhận', rc));
      var add = btn('Tạo kiện', 'sec', function () {
        A('/api/gss/trips/' + t.trip_code + '/packages/', { method: 'POST', body: { count: n.value, seal_prefix: pre.value, seal_start: start.value, recipient_name: rc.value } })
          .then(function (j) { G.toast(j.message, 'ok'); reload(); }).catch(function (e) { G.toast(e.message, 'bad'); });
      });
      card.append(el('div', 'small mut', 'Tạo nhanh một dãy kiện có số seal liên tục (VD: SL-1, SL-2…). Có thể in tem QR từng kiện ở nút "In tem QR".'), f, add);
    }
    return card;
  }

  function messageCard(t, reload) {
    var card = el('section', 'card stack'); card.append(el('h2', null, 'Gửi tin cho tài xế'));
    var ta = el('textarea', 'in'); ta.readOnly = true; ta.rows = 8; card.append(ta);
    var row = el('div', 'row'), zalo = '', phone = '';
    A('/api/gss/trips/' + t.trip_code + '/message/').then(function (j) {
      ta.value = j.content; zalo = j.zalo_url; phone = j.phone;
      var hist = el('div', 'stack'); hist.append(el('b', 'small', 'Lịch sử gửi'));
      j.history.forEach(function (h) { hist.append(el('div', 'small', G.fmtDT(h.sent_at) + ' · ' + h.channel_label + ' · ' + (h.sent_by || '—') + ' · ' + (h.is_read ? 'tài xế đã mở ' + G.fmtDT(h.opened_at) : 'chưa xác nhận đã xem'))); });
      if (!j.history.length) hist.append(el('div', 'small mut', 'Chưa gửi lần nào.'));
      card.append(hist);
    }).catch(function (e) { ta.value = e.message; });
    function log(channel) { return A('/api/gss/trips/' + t.trip_code + '/message/', { method: 'POST', body: { channel: channel } }); }
    row.append(
      btn('Sao chép tin', 'sec', function () {
        (navigator.clipboard ? navigator.clipboard.writeText(ta.value) : Promise.reject()).catch(function () { ta.select(); document.execCommand('copy'); });
        log('COPY').then(function () { G.toast('Đã sao chép, dán vào nhóm Zalo', 'ok'); }).catch(function (e) { G.toast(e.message, 'bad'); });
      }),
      btn('Mở Zalo tài xế', '', function () {
        if (!zalo) { G.toast('Chưa có số điện thoại tài xế.', 'bad'); return; }
        (navigator.clipboard ? navigator.clipboard.writeText(ta.value) : Promise.resolve()).catch(function () {});
        log('ZALO').then(function () { G.toast('Đã chép tin, dán vào khung chat Zalo vừa mở', 'ok'); window.open(zalo, '_blank', 'noopener'); }).catch(function (e) { G.toast(e.message, 'bad'); });
      }));
    card.insertBefore(row, ta.nextSibling);
    card.append(el('div', 'small mut', 'Zalo chỉ mở khung chat (không có xác nhận đã đọc); trạng thái "đã mở" chỉ cập nhật khi tài xế mở link trong tin.'));
    return card;
  }

  // ---------------- 3. Bãi cont ----------------
  function renderDepot() {
    var root = el('div', 'stack'); G.clear(view).append(root);
    var yardBar = el('div', 'row'), statsBox = el('div', 'kpis'), formBox = el('div'), listBox = el('div', 'card center mut', 'Đang tải…');
    root.append(yardBar, statsBox, formBox, listBox);
    A('/api/depot/yards/').then(function (j) {
      var ys = el('select', 'in'); ys.style.maxWidth = '260px'; ys.setAttribute('aria-label', 'Chọn bãi');
      j.results.forEach(function (y) { ys.append(new Option(y.name + ' (' + y.in_yard + ' cont)', y.id)); });
      if (!depotYard && j.results[0]) depotYard = String(j.results[0].id);
      ys.value = depotYard; ys.onchange = function () { depotYard = ys.value; renderDepot(); };
      yardBar.append(ys, btn('Quản lý bãi', 'sec sm', yardManager));
    }).catch(function () {});
    function loadStats() {
      A('/api/depot/stats/?yard=' + encodeURIComponent(depotYard)).then(function (j) {
        var s = j.data; G.clear(statsBox);
        function k(label, v, sub, f) { var c = el('button', 'kpi'); c.type = 'button'; c.style.textAlign = 'left'; c.style.cursor = 'pointer'; c.onclick = function () { depotFilter = Object.assign({ status: 'IN_YARD', q: '', cargo: '', day: '' }, f); renderDepot(); }; c.append(el('div', 'l', label), el('div', 'v', String(v)), el('div', 's mut', sub)); return c; }
        statsBox.append(k('Đang tồn bãi', s.in_yard, 'Hàng ' + s.full + ' · Rỗng ' + s.empty + (s.capacity ? ' · sức chứa ' + s.capacity : ''), {}),
          k('Cont hàng', s.full, 'đang nằm bãi', { cargo: 'FULL' }), k('Cont rỗng', s.empty, 'đang nằm bãi', { cargo: 'EMPTY' }),
          k('Lượt vào hôm nay', s.in_today, 'Gate-in', { status: 'all', day: 'in_today' }), k('Lượt ra hôm nay', s.out_today, 'Gate-out', { status: 'DEPARTED', day: 'out_today' }),
          k('Lưu bãi lâu', s.long_stay, '> 7 ngày', {}));
        var br = el('section', 'card'); br.append(el('h2', null, 'Tồn theo nhà xe / chủ hàng'));
        Object.keys(s.by_subcontractor).forEach(function (n) { br.append(el('span', 'pill p-info', n + ': ' + s.by_subcontractor[n])); br.append(document.createTextNode(' ')); });
        br.append(el('div'));
        Object.keys(s.by_customer).forEach(function (n) { br.append(el('span', 'pill p-none', n + ': ' + s.by_customer[n])); br.append(document.createTextNode(' ')); });
        statsBox.after(br); statsBox._br && statsBox._br.remove(); statsBox._br = br;
      }).catch(function (e) { statsBox.append(el('div', 'err', e.message)); });
    }
    function loadList() {
      var qs = new URLSearchParams({ status: depotFilter.status, q: depotFilter.q, cargo: depotFilter.cargo, day: depotFilter.day, yard: depotYard });
      A('/api/depot/movements/?' + qs).then(function (j) {
        var wrap = el('div', 'stack'), bar = el('div', 'row'), q = input('Tìm số cont, biển số, tài xế…', depotFilter.q); q.style.maxWidth = '320px';
        var st = el('select', 'in'); st.style.maxWidth = '190px'; [['IN_YARD', 'Đang tồn bãi'], ['DEPARTED', 'Đã rời bãi'], ['all', 'Tất cả']].forEach(function (o) { st.append(new Option(o[1], o[0])); }); st.value = depotFilter.status;
        bar.append(q, st, btn('Lọc', 'sec', function () { depotFilter.q = q.value.trim(); depotFilter.status = st.value; depotFilter.day = ''; renderDepot(); }), btn('+ Ghi nhận cont vào bãi (Gate-in)', '', function () { gateInForm(formBox, {}); }));
        var dx = el('a', 'btn sec', 'Xuất Excel'); dx.href = '/api/depot/export/?yard=' + encodeURIComponent(depotYard) + '&status=' + encodeURIComponent(depotFilter.status); bar.append(dx);
        wrap.append(bar, el('div', 'small mut', j.total + ' lượt'));
        var tw = el('div', 'tw'), t = el('table'), hr = el('tr');
        ['Số cont', 'Loại', 'Hàng/Rỗng', 'Nhà xe', 'Vào bãi', 'Xe vào', 'Lưu (ngày)', 'Ra bãi', 'Xe ra', ''].forEach(function (h) { hr.append(el('th', null, h)); }); t.append(hr);
        j.results.forEach(function (m) {
          var tr = el('tr'), act = el('td');
          if (m.status === 'IN_YARD') act.append(btn('Gate-out', 'sm', function () { gateOutForm(m); }));
          act.append(btn('Ảnh', 'sec sm', function () { photosDrawer(m.id); }));
          var c0 = el('td'); c0.append(el('div', 'b mono', m.container_number), el('div', 'small mut', m.trip_code));
          var fc = el('td'); fc.append(el('span', 'pill ' + (m.cargo_status === 'FULL' ? 'p-warn' : 'p-info'), m.cargo_label));
          var vi = el('td'); vi.append(el('div', null, m.in_vehicle_plate), el('div', 'small mut', m.in_driver_name));
          var vo = el('td'); vo.append(el('div', null, m.out_vehicle_plate || '—'), el('div', 'small mut', m.out_purpose_label));
          tr.append(c0, el('td', null, m.container_type), fc, el('td', null, m.subcontractor), el('td', null, G.fmtDT(m.gate_in_at)), vi, el('td', 'num', String(m.storage_days)), el('td', null, G.fmtDT(m.gate_out_at)), vo, act); t.append(tr);
        });
        if (!j.results.length) { var e = el('tr'), td = el('td', 'center mut', 'Không có cont nào.'); td.colSpan = 10; e.append(td); t.append(e); }
        tw.append(t); wrap.append(tw); listBox.replaceWith(wrap); listBox = wrap;
      }).catch(function (e) { listBox.className = 'card err'; listBox.textContent = e.message; });
    }
    loadStats(); loadList();
    window.GSS_depotReload = function () { renderDepot(); };
  }

  // Quản lý danh sách bãi: thêm bãi, đổi tên, sức chứa, ngừng hoạt động
  function yardManager() {
    var body = openDrawer('Quản lý bãi container');
    function paint() {
      A('/api/depot/yards/?all=1').then(function (j) {
        G.clear(body);
        j.results.forEach(function (y) { body.append(yardCard(y)); });
        body.append(yardCard(null));
      }).catch(function (e) { G.clear(body).append(el('div', 'err', e.message)); });
    }
    function yardCard(y) {
      var c = el('section', 'card stack'), f = el('div', 'fields'), v = {};
      [['code', 'Mã bãi', 'mono'], ['name', 'Tên bãi'], ['address', 'Địa chỉ'], ['capacity', 'Sức chứa (0 = không giới hạn)']].forEach(function (p) {
        var i = input('', y ? y[p[0]] : '', p[2]); if (p[0] === 'capacity') i.type = 'number'; if (y && p[0] === 'code') i.readOnly = true; v[p[0]] = i; f.append(field(p[1], i));
      });
      var act = el('input'); act.type = 'checkbox'; act.checked = y ? y.is_active : true; act.style.width = act.style.height = '22px';
      var lab = el('label', 'row'); lab.append(act, el('span', 'small', 'Đang hoạt động'));
      var msg = el('div', 'err'), save = btn(y ? 'Lưu bãi' : '+ Thêm bãi mới', y ? 'sec sm' : '', function () {
        msg.textContent = '';
        A(y ? '/api/depot/yards/' + y.id + '/' : '/api/depot/yards/', { method: y ? 'PUT' : 'POST', body: { code: v.code.value, name: v.name.value, address: v.address.value, capacity: v.capacity.value, is_active: act.checked } })
          .then(function (r) { G.toast(r.message, 'ok'); paint(); }).catch(function (e) { msg.textContent = e.message; });
      });
      c.append(el('b', null, y ? y.name + ' · ' + y.in_yard + ' cont đang tồn' : 'Thêm bãi mới'), f, lab, msg, save); return c;
    }
    paint();
  }

  function gateInForm(host, pre) {
    var card = el('section', 'card stack'); card.append(el('h2', null, 'Ghi nhận cont vào bãi (Gate-in)'));
    var f = el('div', 'fields'), v = {};
    [['container_number', 'Số container *', 'mono'], ['container_type', 'Loại cont (20DC, 40HC…)'], ['shipping_line', 'Hãng tàu'], ['in_vehicle_plate', 'Biển số xe chở đến *'], ['in_trailer_plate', 'Biển số rơ-moóc'],
     ['in_driver_name', 'Tên tài xế'], ['in_driver_phone', 'SĐT tài xế'], ['condition_notes', 'Tình trạng kỹ thuật vỏ'], ['notes', 'Ghi chú']].forEach(function (p) { v[p[0]] = input('', pre[p[0]] || '', p[2]); f.append(field(p[1], v[p[0]])); });
    var cargo = el('select', 'in'); cargo.append(new Option('Cont rỗng', 'EMPTY'), new Option('Cont hàng', 'FULL')); f.append(field('Tình trạng cont', cargo));
    var at = input('', ''); at.type = 'datetime-local'; f.append(field('Giờ đến (để trống = bây giờ)', at));
    var info = el('div', 'small mut');
    v.container_number.onblur = function () {
      if (!v.container_number.value.trim()) return;
      A('/api/depot/lookup/?container=' + encodeURIComponent(v.container_number.value)).then(function (j) {
        if (j.in_yard) { info.className = 'err'; info.textContent = 'Cont này đang nằm trong bãi từ ' + G.fmtDT(j.in_yard.gate_in_at) + '.'; return; }
        if (j.trip) { info.className = 'small okmsg'; info.textContent = 'Khớp lệnh ' + j.trip.trip_code + ' (' + j.trip.vendor + '), đã điền sẵn thông tin.';
          if (!v.container_type.value) v.container_type.value = j.trip.container_type || ''; if (!v.in_vehicle_plate.value) v.in_vehicle_plate.value = j.trip.tractor_plate || '';
          if (!v.in_driver_name.value) v.in_driver_name.value = j.trip.driver_name || ''; if (!v.in_driver_phone.value) v.in_driver_phone.value = j.trip.driver_phone || ''; v._trip = j.trip.trip_code; }
        else { info.className = 'small mut'; info.textContent = 'Không có lệnh điều vận khớp, vẫn ghi nhận được.'; }
      }).catch(function () {});
    };
    var msg = el('div', 'err'), save = btn('Ghi nhận vào bãi', '', function () {
      msg.textContent = ''; save.disabled = true;
      var body = { cargo_status: cargo.value, yard_id: depotYard || undefined }; Object.keys(v).forEach(function (k) { if (k !== '_trip') body[k] = v[k].value; }); if (at.value) body.gate_in_at = at.value; if (v._trip) body.trip_code = v._trip;
      A('/api/depot/movements/', { method: 'POST', body: body }).then(function (j) {
        G.toast(j.message + (j.warnings.length ? ' ' + j.warnings.join(' ') : ''), j.warnings.length ? '' : 'ok'); photosDrawer(j.data.id); renderDepot();
      }).catch(function (e) { msg.textContent = e.message; save.disabled = false; });
    });
    card.append(f, info, msg, el('div', 'row')); card.lastChild.append(save, btn('Đóng', 'sec', function () { G.clear(host); }));
    G.clear(host).append(card); v.container_number.focus();
  }

  function gateOutForm(m) {
    var body = openDrawer('Gate-out · ' + m.container_number), f = el('div', 'fields'), v = {};
    [['out_vehicle_plate', 'Biển số xe kéo đi *'], ['out_trailer_plate', 'Biển số rơ-moóc'], ['out_driver_name', 'Tên tài xế nhận cont'], ['out_driver_phone', 'SĐT tài xế']].forEach(function (p) { v[p[0]] = input('', ''); f.append(field(p[1], v[p[0]])); });
    var pur = el('select', 'in'); [['', '— Chọn mục đích —'], ['DELIVER', 'Giao khách'], ['RETURN_EMPTY', 'Kéo về cảng hạ rỗng'], ['TRANSFER', 'Chuyển bãi'], ['OTHER', 'Khác']].forEach(function (o) { pur.append(new Option(o[1], o[0])); });
    var at = input('', ''); at.type = 'datetime-local';
    f.append(field('Mục đích xuất bãi *', pur), field('Giờ đi (trống = bây giờ)', at));
    var msg = el('div', 'err'), ok = btn('Xác nhận cont rời bãi', '', function () {
      msg.textContent = ''; ok.disabled = true;
      var b = { out_purpose: pur.value }; Object.keys(v).forEach(function (k) { b[k] = v[k].value; }); if (at.value) b.gate_out_at = at.value;
      A('/api/depot/movements/' + m.id + '/gate-out/', { method: 'POST', body: b }).then(function (j) { G.toast(j.message, 'ok'); body.close(); renderDepot(); }).catch(function (e) { msg.textContent = e.message; ok.disabled = false; });
    });
    body.append(el('div', 'small mut', 'Vào bãi: ' + G.fmtDT(m.gate_in_at) + ' · xe ' + m.in_vehicle_plate + ' · đã lưu ' + m.storage_days + ' ngày'), f, msg, ok);
  }

  function photosDrawer(id) {
    var body = openDrawer('Ảnh kiểm định tại cổng');
    function paint() {
      A('/api/depot/movements/' + id + '/').then(function (j) {
        var m = j.data; G.clear(body); body.append(el('div', 'b mono', m.container_number));
        [['IN', 'Gate-in'], ['OUT', 'Gate-out']].forEach(function (ph) {
          if (ph[0] === 'OUT' && m.status === 'IN_YARD') return;
          var ps = m.photos.filter(function (p) { return p.phase === ph[0]; }), box = el('section', 'card stack'), th = el('div', 'thumbs');
          box.append(el('h2', null, ph[1] + ' — ' + ps.length + '/10 ảnh'));
          ps.forEach(function (p) { var a = el('a'); a.href = p.url; a.target = '_blank'; a.rel = 'noopener'; var im = el('img', 'thumb'); im.src = p.url; im.alt = ph[1] + ' #' + p.seq; a.append(im); th.append(a); });
          box.append(th);
          if (ps.length < 10) box.append(G.uploader({ have: ps.length, max: 10, onUpload: function (files) {
            var fd = new FormData(); fd.append('phase', ph[0]); files.forEach(function (f) { fd.append('files', f, f.name); });
            return A('/api/depot/movements/' + id + '/photos/', { method: 'POST', body: fd }).then(paint);
          } }));
          body.append(box);
        });
      }).catch(function (e) { G.clear(body).append(el('div', 'err', e.message)); });
    }
    paint();
  }

  // ---------------- 5. Mẫu biên bản giao hàng (POD) ----------------
  function renderPod() {
    loading();
    A('/api/gss/pod-templates/').then(function (j) {
      var root = el('div', 'stack'), list = el('section', 'card stack'), editor = el('div');
      list.append(el('h2', null, 'Mẫu biên bản giao hàng'), el('div', 'small mut', 'Mỗi khách hàng dùng mẫu riêng; khách chưa gán dùng mẫu mặc định (hoặc mẫu hệ thống nếu chưa có). Các biến: ' + j.placeholders.map(function (p) { return '{{ ' + p + ' }}'; }).join(', ') + ', {{ packages_table }}.'));
      var tw = el('div', 'tw'), t = el('table'), hr = el('tr'); ['Mã', 'Tên mẫu', 'Mặc định', 'Số khách dùng', ''].forEach(function (h) { hr.append(el('th', null, h)); }); t.append(hr);
      j.templates.forEach(function (tpl) {
        var tr = el('tr'), act = el('td');
        act.append(btn('Sửa', 'sec sm', function () { edit(tpl); }), document.createTextNode(' '), btn('Xem trước', 'sec sm', function () { window.open('/api/gss/pod-templates/' + tpl.id + '/preview/', '_blank', 'noopener'); }));
        tr.append(el('td', 'mono', tpl.code), el('td', 'b', tpl.name), el('td', null, tpl.is_default ? 'Có' : ''), el('td', 'num', String(tpl.customers)), act); t.append(tr);
      });
      if (!j.templates.length) { var e = el('tr'), td = el('td', 'center mut', 'Chưa có mẫu riêng — đang dùng mẫu hệ thống.'); td.colSpan = 5; e.append(td); t.append(e); }
      tw.append(t); list.append(tw, btn('+ Tạo mẫu mới', '', function () { edit(null); }));

      var assign = el('section', 'card stack'); assign.append(el('h2', null, 'Gán mẫu cho khách hàng'));
      var cs = el('select', 'in'), ts = el('select', 'in'); ts.append(new Option('— Dùng mẫu mặc định —', ''));
      j.templates.filter(function (x) { return x.is_active; }).forEach(function (x) { ts.append(new Option(x.name, x.id)); });
      j.customers.forEach(function (c) { var o = new Option(c.name, c.id); o.dataset.tpl = c.pod_template_id || ''; cs.append(o); });
      cs.onchange = function () { ts.value = cs.selectedOptions[0] ? cs.selectedOptions[0].dataset.tpl : ''; }; cs.onchange();
      var f = el('div', 'fields'); f.append(field('Khách hàng', cs), field('Mẫu biên bản', ts));
      assign.append(f, btn('Lưu gán mẫu', '', function () {
        A('/api/gss/customers/' + cs.value + '/pod-template/', { method: 'PUT', body: { template_id: ts.value || null } }).then(function (r) { G.toast(r.message, 'ok'); renderPod(); }).catch(function (e) { G.toast(e.message, 'bad'); });
      }));
      root.append(list, editor, assign); G.clear(view).append(root);

      function edit(tpl) {
        var base = tpl || { code: '', name: '', header_html: j.default_template.header_html, body_html: j.default_template.body_html, terms_html: j.default_template.terms_html, is_default: false, is_active: true };
        var c = el('section', 'card stack'), f2 = el('div', 'fields'), code = input('', base.code, 'mono'), name = input('', base.name);
        var hd = el('textarea', 'in mono'), bd = el('textarea', 'in mono'), tm = el('textarea', 'in mono'); hd.value = base.header_html; bd.value = base.body_html; tm.value = base.terms_html; bd.rows = 10; hd.rows = tm.rows = 4;
        var def = el('input'); def.type = 'checkbox'; def.checked = base.is_default; var act = el('input'); act.type = 'checkbox'; act.checked = base.is_active;
        var l1 = el('label', 'row'); l1.append(def, el('span', null, 'Mẫu mặc định')); var l2 = el('label', 'row'); l2.append(act, el('span', null, 'Đang sử dụng'));
        if (tpl) code.readOnly = true;
        f2.append(field('Mã mẫu *', code), field('Tên mẫu *', name), field('Đầu biên bản (HTML)', hd, 'full'), field('Nội dung chính (HTML) *', bd, 'full'), field('Điều khoản (HTML)', tm, 'full'));
        var msg = el('div', 'err');
        var save = btn('Lưu mẫu', '', function () {
          msg.textContent = '';
          A(tpl ? '/api/gss/pod-templates/' + tpl.id + '/' : '/api/gss/pod-templates/', { method: tpl ? 'PUT' : 'POST', body: { code: code.value, name: name.value, header_html: hd.value, body_html: bd.value, terms_html: tm.value, is_default: def.checked, is_active: act.checked } })
            .then(function (r) { G.toast(r.message, 'ok'); renderPod(); }).catch(function (e) { msg.textContent = e.message; });
        });
        c.append(el('h2', null, tpl ? 'Sửa mẫu ' + tpl.code : 'Tạo mẫu mới'), el('div', 'small mut', 'Chỉ giữ thẻ định dạng in an toàn; script và thuộc tính chạy mã tự bị loại khi lưu.'), f2, l1, l2, msg, el('div', 'row'));
        c.lastChild.append(save, btn('Đóng', 'sec', function () { G.clear(editor); }));
        G.clear(editor).append(c); c.scrollIntoView({ block: 'start' });
      }
    }).catch(fail);
  }

  // ---------------- 4. Quét QR ----------------
  var scanner = null;
  function renderScan() {
    var root = el('div', 'stack'), card = el('section', 'card stack'), area = el('div'), result = el('div', 'stack');
    card.append(el('h2', null, 'Quét mã QR'), el('div', 'small mut', 'Quét QR lệnh của tài xế hoặc tem QR từng kiện hàng lẻ. Cần cho phép camera (chạy HTTPS hoặc localhost).'));
    var manual = input('Hoặc dán nội dung/đường dẫn QR rồi bấm Mở'); var go1 = btn('Mở', 'sec', function () { handle(manual.value); });
    var start = btn('Bật camera quét', '', function () {
      start.classList.add('hidden');
      scanner = G.scanner(area, function (t) { handle(t); start.classList.remove('hidden'); }, function (e) { G.clear(area).append(el('div', 'err', e.message)); start.classList.remove('hidden'); });
    });
    var mrow = el('div', 'row'); mrow.append(manual, go1); manual.style.maxWidth = '420px';
    card.append(start, area, mrow); root.append(card, result); G.clear(view).append(root);

    function handle(text) {
      var tok = G.tokenFromQr(text); G.clear(result);
      if (!tok) { result.append(el('div', 'card err', 'Không đọc được mã QR hợp lệ của hệ thống.')); return; }
      A('/api/gss/resolve/?token=' + encodeURIComponent(tok)).then(function (j) {
        if (j.type === 'TRIP') return tripResult(result, j.data);
        packageResult(result, j, tok);
      }).catch(function (e) { result.append(el('div', 'card err', e.message)); });
    }
  }

  function tripResult(host, r) {
    var c = el('section', 'card stack'); c.append(el('div', 'b mono', r.container_number || '(chưa có số cont)'), el('span', 'pill ' + (STEP_CLASS[r.step] || 'p-none'), r.step_label));
    c.append(el('div', 'small', r.tractor_plate + ' · ' + (r.driver_name || '—') + ' · ' + r.vendor), el('div', 'small', r.pickup_location + ' → ' + r.delivery_location + ' → ' + r.dropoff_location));
    var row = el('div', 'row'); row.append(btn('Mở chi tiết & đổi bước', '', function () { openTrip(r.trip_code); }));
    if (feats.depot_yard) row.append(btn('Gate-in bãi', 'sec', function () { go('depot'); var h = view.firstChild && view.firstChild.children[1]; if (h) gateInForm(h, { container_number: r.container_number, container_type: r.container_type, in_vehicle_plate: r.tractor_plate, in_trailer_plate: r.trailer_plate, in_driver_name: r.driver_name, in_driver_phone: r.driver_phone }); }));
    c.append(row, el('div', 'row')); c.lastChild.append(G.demdetPill('DEM', r.dem), G.demdetPill('DET', r.det)); host.append(c);
  }

  function packageResult(host, j, tok) {
    var p = j.package, c = el('section', 'card stack'), phase = ['READY', 'ARRIVED_AT_PICKUP'].indexOf(j.trip_step) >= 0 ? 'PICKUP' : 'DELIVERY';
    c.append(el('div', 'b', 'Kiện ' + p.index + '/' + p.total + ' · ' + p.code), el('div', 'mono', 'Seal hệ thống: ' + p.seal_number), el('span', 'pill p-info', p.status_label + ' · chuyến ' + j.trip_code));
    var seal = input('Số seal đọc trên kiện', '', 'mono'), dmg = el('input'); dmg.type = 'checkbox'; dmg.style.width = dmg.style.height = '24px';
    var lab = el('label', 'row'); lab.append(dmg, el('span', null, 'Seal rách / kiện hỏng'));
    var msg = el('div'), ok = btn(phase === 'PICKUP' ? 'Xác nhận bốc lên xe' : 'Xác nhận giao', 'big', function () {
      ok.disabled = true;
      A('/api/gss/packages/' + p.id + '/scan/', { method: 'POST', body: { phase: phase, seal_seen: seal.value, damaged: dmg.checked } }).then(function (r) {
        var bad = r.result === 'FAIL'; msg.className = bad ? 'err' : 'okmsg'; msg.textContent = (bad ? 'CẢNH BÁO: ' : '') + (r.warnings.join(' ') || 'Kiện hợp lệ ✓') + ' — Đã ' + (r.summary.delivered) + '/' + r.summary.total + ' kiện giao.';
        G.toast(bad ? 'CẢNH BÁO seal/kiện' : 'Kiện hợp lệ', bad ? 'bad' : 'ok'); if (navigator.vibrate) navigator.vibrate(bad ? [200, 100, 200] : 60);
      }).catch(function (e) { msg.className = 'err'; msg.textContent = e.message; ok.disabled = false; });
    });
    if (phase === 'DELIVERY') c.append(seal); c.append(lab, msg, ok); host.append(c);
  }

  screens.dashboard = renderDashboard; screens.dispatch = renderDispatch; screens.depot = renderDepot; screens.scan = renderScan; screens.pod = renderPod;
  window.GSSApp = {
    screens: screens, go: go, show: show, enter: enter, hasTab: hasTab, view: view, feats: feats, current: function () { return current; },
    register: function (map) { Object.keys(map).forEach(function (k) { screens[k] = map[k]; }); },
    openList: function (f) { openList(f); }, openTrip: function (c) { openTrip(c); },
    ui: { field: field, input: input, btn: btn, ask: ask, openDrawer: openDrawer, loading: loading, fail: fail, noteBox: noteBox },
  };
})();
