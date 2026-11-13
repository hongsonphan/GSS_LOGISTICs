/* Danh mục theo GSS: Khách hàng, Địa điểm (kèm lưu ý điểm đến/cấm đường), Nhà xe + tài xế + xe. Dùng chung một bộ CRUD. */
(function () {
  'use strict';
  var A = window.GSSApp, ui = A.ui, el = G.el, api = G.api;

  var LOC_TYPES = [['PORT', 'Cảng biển'], ['ICD', 'Cảng cạn (ICD)'], ['DEPOT', 'Bãi rỗng / Depot'], ['WAREHOUSE', 'Kho hàng / Nhà máy'], ['YARD', 'Bãi đỗ xe']];

  var CONFIGS = {
    customers: {
      title: 'Khách hàng', url: '/api/master-data/customers/', item: function (id) { return '/api/master-data/customers/' + id + '/'; },
      search: ['code', 'name', 'short_name', 'tax_code', 'contact_person', 'phone'],
      columns: [['code', 'Mã'], ['name', 'Tên khách hàng'], ['phone', 'Điện thoại'], ['contact_person', 'Người liên hệ'], ['payment_term_days', 'Hạn TT (ngày)']],
      fields: [['code', 'Mã khách hàng (để trống = tự sinh)'], ['name', 'Tên khách hàng', 'req'], ['short_name', 'Tên viết tắt'], ['tax_code', 'Mã số thuế'], ['address', 'Địa chỉ', 'req full'],
               ['phone', 'Điện thoại'], ['company_email', 'Email công ty'], ['contact_person', 'Người liên hệ'], ['contact_title', 'Chức vụ'], ['contact_email', 'Email liên hệ'],
               ['payment_term_days', 'Hạn thanh toán (ngày)', 'number'], ['credit_limit', 'Hạn mức nợ (VNĐ)', 'number'], ['notes', 'Ghi chú', 'textarea full']],
      after: function (c, row, reload) { return podAssign(c, row); },
    },
    locations: {
      title: 'Địa điểm & lưu ý cho tài xế', url: '/api/master-data/locations/', item: function (id) { return '/api/master-data/locations/' + id + '/'; },
      search: ['code', 'name', 'address', 'province'],
      columns: [['code', 'Mã'], ['name', 'Tên địa điểm'], ['location_type', 'Loại', function (v) { var t = LOC_TYPES.filter(function (x) { return x[0] === v; })[0]; return t ? t[1] : v; }], ['province', 'Tỉnh/TP'],
                ['destination_notes', 'Có ghi chú điểm đến', function (v) { return v ? '✔' : ''; }], ['road_restrictions', 'Có lưu ý cấm đường', function (v) { return v ? '✔' : ''; }]],
      fields: [['code', 'Mã địa điểm', 'req'], ['name', 'Tên địa điểm', 'req'], ['location_type', 'Loại', 'select', LOC_TYPES], ['province', 'Tỉnh / thành'], ['address', 'Địa chỉ', 'full'],
               ['contact_person', 'Người phụ trách'], ['contact_phone', 'Điện thoại'], ['destination_notes', 'Ghi chú điểm đến (liên hệ, cổng vào, quy định bảo hộ, đăng ký bảo vệ…)', 'textarea full'],
               ['road_restrictions', 'Lưu ý cấm đường / giờ cấm tải / cầu yếu', 'textarea full'], ['notes', 'Ghi chú vận hành', 'textarea full'], ['is_active', 'Đang hoạt động', 'check']],
      defaults: { location_type: 'WAREHOUSE', province: '', is_active: true },
    },
    subcontractors: {
      title: 'Nhà xe thầu phụ', url: '/api/master-data/subcontractors/', item: function (id) { return '/api/master-data/subcontractors/' + id + '/'; },
      filter: function (r) { return !r.partner_type || r.partner_type === 'CARRIER'; },
      search: ['code', 'name', 'short_name', 'contact_person', 'phone'],
      columns: [['code', 'Mã'], ['short_name', 'Tên ngắn'], ['name', 'Tên nhà xe'], ['contact_person', 'Người điều xe'], ['phone', 'Điện thoại']],
      fields: [['code', 'Mã (để trống = tự sinh)'], ['name', 'Tên nhà xe', 'req'], ['short_name', 'Tên ngắn hiển thị'], ['tax_code', 'Mã số thuế'], ['contact_person', 'Người phụ trách điều xe'], ['phone', 'Điện thoại'],
               ['address', 'Địa chỉ công ty', 'full'], ['yard_address', 'Địa chỉ bãi xe', 'full'], ['bank_account_number', 'Số tài khoản'], ['bank_name', 'Ngân hàng'], ['bank_account_holder', 'Chủ tài khoản'],
               ['notes', 'Ghi chú', 'textarea full'], ['is_active', 'Đang hợp tác', 'check']],
      defaults: { partner_type: 'CARRIER', is_active: true },
      after: function (c, row) { return fleetPanel(row); },
    },
  };

  // ---------------- màn danh sách ----------------
  function render(key) {
    var c = CONFIGS[key], root = el('div', 'stack pad'), bar = el('div', 'row'), q = ui.input('Tìm trong danh sách…', ''); q.style.maxWidth = '320px';
    bar.append(q, ui.btn('+ Thêm mới', '', function () { openForm(c, null, load); }));
    var holder = el('div', 'card center mut', 'Đang tải…'), all = [];
    root.append(el('h2', 'page-title', c.title), bar, holder); G.clear(A.view).append(root);
    function paint() {
      var term = q.value.trim().toLowerCase();
      var rows = all.filter(function (r) { return !term || c.search.some(function (k) { return String(r[k] || '').toLowerCase().indexOf(term) >= 0; }); });
      var tw = el('div', 'tw'), t = el('table'), hr = el('tr'); c.columns.forEach(function (col) { hr.append(el('th', null, col[1])); }); t.append(hr);
      rows.forEach(function (r) {
        var tr = el('tr', 'click'); tr.tabIndex = 0; tr.onclick = function () { openForm(c, r, load); }; tr.onkeydown = function (e) { if (e.key === 'Enter') openForm(c, r, load); };
        c.columns.forEach(function (col) { var v = r[col[0]]; tr.append(el('td', col[0] === 'code' ? 'mono b' : '', String(col[2] ? col[2](v, r) : (v == null ? '' : v)))); });
        t.append(tr);
      });
      if (!rows.length) { var e = el('tr'), td = el('td', 'empty', 'Không có dữ liệu.'); td.colSpan = c.columns.length; e.append(td); t.append(e); }
      tw.append(t); var wrap = el('div', 'stack'); wrap.append(el('div', 'small mut', rows.length + '/' + all.length + ' dòng'), tw); G.clear(holder).append(wrap); holder.className = '';
    }
    function load() {
      api(c.url).then(function (j) { all = (j.results || []).filter(c.filter || function () { return true; }); if (window.GSSMasters) GSSMasters.reset(); paint(); }).catch(function (e) { holder.className = 'card err'; holder.textContent = e.message; });
    }
    q.oninput = paint; load();
  }

  // ---------------- form ----------------
  function openForm(c, row, reload) {
    var body = ui.openDrawer(row ? 'Sửa · ' + (row.name || row.code) : 'Thêm ' + c.title.toLowerCase()), g = el('div', 'formgrid'), inputs = {};
    c.fields.forEach(function (f) {
      var key = f[0], type = f[2] || '', cls = type.split(' '), w = el('div', cls.indexOf('full') >= 0 ? 'full' : ''), val = row ? row[key] : (c.defaults ? c.defaults[key] : '');
      var i;
      if (cls.indexOf('select') >= 0) { i = el('select', 'in'); f[3].forEach(function (o) { i.append(new Option(o[1], o[0])); }); i.value = val || f[3][0][0]; }
      else if (cls.indexOf('textarea') >= 0) { i = el('textarea', 'in'); i.rows = 3; i.value = val || ''; }
      else if (cls.indexOf('check') >= 0) { i = el('input'); i.type = 'checkbox'; i.checked = val !== false; i.style.width = i.style.height = '24px'; }
      else { i = el('input', 'in'); i.type = cls.indexOf('number') >= 0 ? 'number' : 'text'; i.value = val == null ? '' : val; }
      i.id = 'm-' + key; inputs[key] = i;
      var l = el('label', 'f' + (cls.indexOf('req') >= 0 ? ' req' : ''), f[1]); l.htmlFor = i.id;
      if (cls.indexOf('check') >= 0) { var r = el('label', 'row'); r.append(i, el('span', null, f[1])); w.append(r); } else w.append(l, i);
      g.append(w);
    });
    var msg = el('div', 'err'), save = ui.btn('Lưu', 'big', function () {
      msg.textContent = ''; save.disabled = true;
      var data = Object.assign({}, c.defaults || {});
      Object.keys(inputs).forEach(function (k) { data[k] = inputs[k].type === 'checkbox' ? inputs[k].checked : inputs[k].value; });
      api(row ? c.item(row.id) : c.url, { method: row ? 'PUT' : 'POST', body: data }).then(function (j) { G.toast(j.message || 'Đã lưu', 'ok'); body.close(); reload(); })
        .catch(function (e) { msg.textContent = e.message; save.disabled = false; });
    });
    var card = el('section', 'card stack'); card.append(g, msg, save); body.append(card);
    if (row && c.after) { var extra = c.after(c, row, reload); if (extra) body.append(extra); }
    if (row) {
      var del = ui.btn('Xóa (ẩn khỏi danh mục)', 'bad sm', function () {
        if (!window.confirm('Xóa "' + (row.name || row.code) + '"? Dữ liệu cũ vẫn được giữ trong hệ thống.')) return;
        api(c.item(row.id), { method: 'DELETE' }).then(function () { G.toast('Đã xóa', 'ok'); body.close(); reload(); }).catch(function (e) { G.toast(e.message, 'bad'); });
      }); body.append(del);
    }
  }

  // ---------------- gán mẫu biên bản cho khách hàng ----------------
  function podAssign(c, row) {
    if (A.feats.pod_templates === false) return null;
    var card = el('section', 'card stack'); card.append(el('h2', null, 'Mẫu biên bản giao hàng'));
    api('/api/gss/pod-templates/').then(function (j) {
      var sel = el('select', 'in'); sel.append(new Option('— Dùng mẫu mặc định —', ''));
      j.templates.filter(function (t) { return t.is_active; }).forEach(function (t) { sel.append(new Option(t.name, t.id)); });
      var cur = j.customers.filter(function (x) { return x.id === row.id; })[0]; sel.value = cur && cur.pod_template_id ? cur.pod_template_id : '';
      card.append(sel, ui.btn('Lưu mẫu cho khách này', 'sec sm', function () {
        api('/api/gss/customers/' + row.id + '/pod-template/', { method: 'PUT', body: { template_id: sel.value || null } }).then(function (r) { G.toast(r.message, 'ok'); }).catch(function (e) { G.toast(e.message, 'bad'); });
      }));
    }).catch(function (e) { card.append(el('div', 'small mut', 'Chỉ Ban giám đốc/quản trị gán được mẫu: ' + e.message)); });
    return card;
  }

  // ---------------- tài xế & xe của nhà xe ----------------
  function portalAccountPanel(sub) {
    var card = el('section', 'card stack'), body = el('div', 'small mut', 'Đang tải...');
    card.append(el('h2', null, 'Tài khoản Cổng Nhà Xe (Portal bảo mật)'), body);
    function load() {
      api('/api/vendor-portal-accounts/' + sub.id + '/').then(function (j) {
        var d = j.data || {};
        G.clear(body);
        var info = el('div', 'small mut', d.has_account
          ? ('Đã kích hoạt: ' + d.username + ' · Token: ' + (d.confirm_token_preview || 'Chưa đặt') + ' · Tự đăng xuất: ' + d.idle_timeout_minutes + ' phút' + (d.locked ? ' (ĐANG BỊ KHÓA)' : (!d.is_active ? ' (TẠM TẮT)' : '')))
          : 'Chưa cấp tài khoản đăng nhập riêng cho nhà xe này.');
        var fg = el('div', 'formgrid');
        var uIn = el('input', 'in'); uIn.value = d.username || d.suggested_username || ''; uIn.placeholder = 'VD: hoangnam';
        var pIn = el('input', 'in'); pIn.type = 'password'; pIn.placeholder = d.has_account ? 'Để trống nếu giữ mật khẩu cũ' : 'Nhập mật khẩu (>= 6 ký tự)';
        var tIn = el('input', 'in'); tIn.type = 'number'; tIn.min = 1; tIn.max = 480; tIn.value = d.idle_timeout_minutes || 15;
        var actIn = el('input'); actIn.type = 'checkbox'; actIn.checked = d.has_account ? !!d.is_active : true;
        var w1 = el('div'); w1.append(el('label', 'f req', 'Tên đăng nhập'), uIn);
        var w2 = el('div'); w2.append(el('label', 'f' + (d.has_account ? '' : ' req'), 'Mật khẩu mới'), pIn);
        var w3 = el('div'); w3.append(el('label', 'f', 'Tự đăng xuất (phút)'), tIn);
        var w4 = el('div'); var lblA = el('label', 'f', 'Trạng thái kích hoạt'); var chkRow = el('label', 'row small'); chkRow.append(actIn, el('span', null, 'Cho phép đăng nhập')); w4.append(lblA, chkRow);
        fg.append(w1, w2, w3, w4);
        var outToken = el('div', 'small', '');
        function save(extra) {
          var payload = Object.assign({ username: uIn.value.trim(), idle_timeout_minutes: Number(tIn.value) || 15, is_active: actIn.checked }, extra || {});
          if (pIn.value) payload.password = pIn.value;
          api('/api/vendor-portal-accounts/' + sub.id + '/', { method: 'POST', body: payload }).then(function (r) {
            G.toast(r.message, 'ok');
            var issued = r.data && r.data.issued_confirm_token;
            if (issued) {
              outToken.className = 'pill ok';
              outToken.textContent = 'Mã Token xác nhận mới (lưu lại để gửi nhà xe): ' + issued;
            }
            pIn.value = '';
            load();
          }).catch(function (e) { G.toast(e.message, 'bad'); });
        }
        var btns = el('div', 'row');
        btns.append(ui.btn(d.has_account ? 'Lưu tài khoản' : 'Cấp tài khoản + Sinh Token', 'pri sm', function () { save({ regenerate_token: !d.has_account }); }));
        if (d.has_account) {
          btns.append(ui.btn('Cấp lại Token xác nhận', 'sec sm', function () { if (window.confirm('Cấp mới Token xác nhận sẽ vô hiệu hóa Token cũ?')) save({ regenerate_token: true }); }));
        }
        if (d.locked) {
          btns.append(ui.btn('Mở khóa', 'sec sm', function () { save({ unlock: true }); }));
        }
        body.append(info, fg, btns);
        if (outToken.textContent) body.append(outToken);
      }).catch(function (e) { G.clear(body).append(el('div', 'err', e.message)); });
    }
    load();
    return card;
  }

  function fleetPanel(sub) {
    var wrap = el('div', 'stack');
    wrap.append(portalAccountPanel(sub));
    wrap.append(listPanel('Tài xế', '/api/master-data/subcontractors/' + sub.id + '/drivers/', function (id) { return '/api/master-data/subcontractor-drivers/' + id + '/'; },
      [['full_name', 'Họ tên'], ['phone', 'SĐT'], ['license_number', 'GPLX']], [['full_name', 'Họ tên', 'req'], ['phone', 'Điện thoại'], ['license_number', 'Số GPLX']]));
    wrap.append(listPanel('Xe đầu kéo của nhà xe', '/api/master-data/subcontractors/' + sub.id + '/vehicles/', function (id) { return '/api/master-data/subcontractors/' + sub.id + '/vehicles/' + id + '/'; },
      [['license_plate', 'Biển số'], ['vehicle_type', 'Loại'], ['payload_display', 'Tải trọng']], [['license_plate', 'Biển số', 'req'], ['brand', 'Hãng xe'], ['payload_capacity_kg', 'Tải trọng (kg)']]));
    return wrap;
  }

  function listPanel(title, url, itemUrl, cols, fields) {
    var card = el('section', 'card stack'), body = el('div');
    card.append(el('h2', null, title), body);
    var form = el('div', 'formgrid'), inputs = {};
    fields.forEach(function (f) { var w = el('div'), l = el('label', 'f' + (f[2] === 'req' ? ' req' : ''), f[1]), i = el('input', 'in'); inputs[f[0]] = i; w.append(l, i); form.append(w); });
    var msg = el('div', 'err'), add = ui.btn('+ Thêm', 'sec sm', function () {
      msg.textContent = ''; var data = {}; Object.keys(inputs).forEach(function (k) { data[k] = inputs[k].value; });
      api(url, { method: 'POST', body: data }).then(function () { Object.keys(inputs).forEach(function (k) { inputs[k].value = ''; }); load(); }).catch(function (e) { msg.textContent = e.message; });
    });
    card.append(form, msg, add);
    function load() {
      api(url).then(function (j) {
        var tw = el('div', 'tw'), t = el('table'), hr = el('tr'); cols.forEach(function (c) { hr.append(el('th', null, c[1])); }); hr.append(el('th')); t.append(hr);
        (j.results || []).forEach(function (r) {
          var tr = el('tr'); cols.forEach(function (c) { tr.append(el('td', null, String(r[c[0]] == null ? '' : r[c[0]]))); });
          var td = el('td'); td.append(ui.btn('Xóa', 'sec sm', function () { if (!window.confirm('Xóa dòng này?')) return; api(itemUrl(r.id), { method: 'DELETE' }).then(load).catch(function (e) { G.toast(e.message, 'bad'); }); })); tr.append(td); t.append(tr);
        });
        if (!(j.results || []).length) { var e = el('tr'), d = el('td', 'empty', 'Chưa có.'); d.colSpan = cols.length + 1; e.append(d); t.append(e); }
        tw.append(t); G.clear(body).append(tw);
      }).catch(function (e) { G.clear(body).append(el('div', 'err', e.message)); });
    }
    load(); return card;
  }

  A.register({ customers: function () { render('customers'); }, locations: function () { render('locations'); }, subcontractors: function () { render('subcontractors'); } });
})();
