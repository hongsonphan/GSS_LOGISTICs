// ==============================================================================
// CÀI ĐẶT › VAI TRÒ & PHÂN QUYỀN — ma trận Chức danh × Phân hệ × Thao tác + ngoại lệ theo người
// API: /api/access/matrix/, /api/access/roles/<role>/, /api/access/users/<id>/ (core/access_views.py)
// ==============================================================================
const accessUI = {
    data: null,
    view: 'roles',          // roles | users | lookup
    role: 'DIRECTOR',
    draft: null,            // {module: Set(actions)} đang sửa cho chức danh
    userId: null,
    userDraft: null,        // {allow: {m: Set}, deny: {m: Set}, note}
    lookup: { module: 'accounting', action: 'view', q: '' },
    container: null,
};

const _acEsc = (s) => (typeof escapeHtml === 'function' ? escapeHtml(s == null ? '' : String(s)) : String(s == null ? '' : s));
const _acSets = (grants) => Object.fromEntries(Object.entries(grants || {}).map(([m, a]) => [m, new Set(a)]));
const _acPlain = (sets) => Object.fromEntries(Object.entries(sets).filter(([, s]) => s.size).map(([m, s]) => [m, [...s]]));
const _acSame = (a, b) => JSON.stringify(_acNorm(a)) === JSON.stringify(_acNorm(b));
function _acNorm(g) {
    const out = {};
    Object.keys(g || {}).sort().forEach(m => { const v = [...(g[m] || [])].sort(); if (v.length) out[m] = v; });
    return out;
}

async function renderAccessMatrixPage(container) {
    accessUI.container = container;
    container.setAttribute('data-m-keep', '');
    container.innerHTML = `<div class="p-12 text-center text-slate-400"><i class="ph ph-spinner animate-spin text-3xl mb-2 text-teal-600 block"></i>Đang tải ma trận phân quyền…</div>`;
    try {
        const res = await fetchWithAuth('/api/access/matrix/');
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || `Lỗi ${res.status}`);
        accessUI.data = data;
        if (!data.roles.some(r => r.key === accessUI.role)) accessUI.role = data.roles[0].key;
        accessUI.draft = null;
        accessUI.userDraft = null;
        renderAccessShell();
    } catch (err) {
        container.innerHTML = `<div class="p-12 text-center text-rose-600 font-bold"><i class="ph-bold ph-lock-key text-3xl mb-2 block"></i>${_acEsc(err.message)}</div>`;
    }
}
window.renderAccessMatrixPage = renderAccessMatrixPage;

function renderAccessShell() {
    const d = accessUI.data;
    const tab = (key, label, icon) => `<button type="button" onclick="switchAccessView('${key}')"
        class="h-9 px-3.5 rounded-xl text-xs md:text-sm font-bold font-heading border-2 whitespace-nowrap flex items-center gap-1.5 ${accessUI.view === key ? 'border-teal-600 bg-teal-50 text-teal-900' : 'border-transparent text-slate-600 hover:bg-slate-100'}">
        <i class="ph-bold ${icon}"></i><span>${label}</span></button>`;
    accessUI.container.innerHTML = `
      <div class="space-y-4">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div class="min-w-0">
            <h3 class="text-base font-black font-heading text-slate-900 flex items-center gap-2"><i class="ph-bold ph-shield-check text-teal-700"></i>Phân quyền theo chức danh</h3>
            <p class="text-xs text-slate-500 font-medium mt-0.5">Ai được vào phân hệ nào và được Xem / Tạo / Sửa / Xoá / Duyệt / Xuất gì. Quyền của một người = quyền chức danh + ngoại lệ riêng.</p>
          </div>
          <div class="flex flex-wrap gap-1.5">
            ${tab('roles', 'Theo chức danh', 'ph-identification-badge')}
            ${tab('users', 'Ngoại lệ theo người', 'ph-user-gear')}
            ${tab('lookup', 'Tra cứu: ai được làm gì', 'ph-magnifying-glass')}
          </div>
        </div>
        ${d.can_edit ? '' : `<div class="px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">Bạn chỉ có quyền xem. Chỉ Ban Giám đốc (quyền Sửa ở phân hệ Quản trị hệ thống) được thay đổi phân quyền.</div>`}
        <div id="access-body"></div>
      </div>`;
    if (accessUI.view === 'roles') renderAccessRoles();
    else if (accessUI.view === 'users') renderAccessUsers();
    else renderAccessLookup();
}

function switchAccessView(view) {
    accessUI.view = view;
    renderAccessShell();
}
window.switchAccessView = switchAccessView;

// ---------------------------------------------------------------- Bảng ma trận dùng chung
function _accessTable(cellFn, rowToggle) {
    const d = accessUI.data;
    const head = d.actions.map(a => `<th class="text-center" data-col-key="${a.key}">${_acEsc(a.label)}</th>`).join('');
    const rows = d.modules.map(m => {
        const cells = d.actions.map(a => m.actions.includes(a.key)
            ? `<td class="text-center">${cellFn(m.key, a.key)}</td>`
            : `<td class="text-center text-slate-300">—</td>`).join('');
        return `<tr>
            <td class="min-w-[220px] whitespace-normal">
              <div class="flex items-start gap-2">
                ${rowToggle ? rowToggle(m.key) : ''}
                <div><div class="font-bold text-slate-800">${_acEsc(m.label)}</div>
                <div class="text-[11px] text-slate-500 font-medium leading-snug">${_acEsc(m.description)}</div></div>
              </div>
            </td>${cells}</tr>`;
    }).join('');
    return `<div class="overflow-x-auto"><table class="erp-table" data-table-title="Ma trận phân quyền" data-m-keep>
        <thead><tr><th data-col-key="module">Phân hệ</th>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

// ---------------------------------------------------------------- 1. Theo chức danh
function _roleObj() { return accessUI.data.roles.find(r => r.key === accessUI.role); }

function renderAccessRoles() {
    const d = accessUI.data;
    const role = _roleObj();
    if (!accessUI.draft) accessUI.draft = _acSets(role.grants);
    const groups = [];
    d.roles.forEach(r => { let g = groups.find(x => x.name === r.group); if (!g) groups.push(g = { name: r.group, roles: [] }); g.roles.push(r); });
    const list = groups.map(g => `
        <div class="mb-3"><div class="px-2 text-[10.5px] font-black uppercase tracking-wider text-slate-400 mb-1">${_acEsc(g.name)}</div>
        ${g.roles.map(r => `<button type="button" onclick="selectAccessRole('${r.key}')"
            class="w-full text-left px-3 py-2 rounded-xl text-[13px] font-bold flex items-center justify-between gap-2 ${r.key === accessUI.role ? 'bg-teal-50 text-teal-900 ring-1 ring-teal-200' : 'text-slate-700 hover:bg-slate-50'}">
            <span class="truncate">${_acEsc(r.label)}</span>
            ${r.customized ? '<span class="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">Đã chỉnh</span>' : ''}
          </button>`).join('')}</div>`).join('');

    const def = _acSets(role.default);
    const saved = _acSets(role.grants);
    const locked = role.locked || {};
    const cell = (m, a) => {
        const on = accessUI.draft[m] && accessUI.draft[m].has(a);
        const changed = on !== !!(saved[m] && saved[m].has(a));
        const isLocked = (locked[m] || []).includes(a);
        const notDefault = on !== !!(def[m] && def[m].has(a));
        return `<label class="inline-flex items-center justify-center w-9 h-9 rounded-lg ${changed ? 'bg-amber-100 ring-1 ring-amber-300' : ''}" title="${notDefault ? 'Khác mặc định' : 'Như mặc định'}${isLocked ? ' — luôn bật cho Ban Giám đốc' : ''}">
            <input type="checkbox" class="w-4 h-4 accent-teal-700" ${on ? 'checked' : ''} ${(!d.can_edit || isLocked) ? 'disabled' : ''}
              onchange="toggleAccessRoleCell('${m}','${a}',this.checked)" aria-label="${_acEsc(m)} ${_acEsc(a)}">
            ${notDefault ? '<span class="sr-only">khác mặc định</span>' : ''}</label>`;
    };
    const rowToggle = (m) => d.can_edit ? `<input type="checkbox" class="mt-1 w-4 h-4 accent-teal-700" title="Bật/tắt cả hàng" aria-label="Cả hàng"
        ${(accessUI.draft[m] && accessUI.draft[m].size === d.modules.find(x => x.key === m).actions.length) ? 'checked' : ''}
        onchange="toggleAccessRoleRow('${m}', this.checked)">` : '';
    const dirty = !_acSame(_acPlain(accessUI.draft), role.grants);
    const userCount = d.users.filter(u => u.role === role.key).length;

    document.getElementById('access-body').innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-4">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-xs p-2 lg:max-h-[70vh] lg:overflow-y-auto">${list}</div>
        <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div class="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div class="text-sm font-black font-heading text-slate-900">${_acEsc(role.label)}</div>
              <div class="text-xs text-slate-500 font-medium">${userCount} người đang giữ chức danh này · ${role.customized ? 'đã chỉnh so với mặc định' : 'đang dùng quyền mặc định'}</div>
            </div>
            <div class="text-[11px] text-slate-500 flex items-center gap-3">
              <span class="inline-flex items-center gap-1"><span class="w-3 h-3 rounded bg-amber-100 ring-1 ring-amber-300"></span>Chưa lưu</span>
            </div>
          </div>
          ${_accessTable(cell, rowToggle)}
          ${d.can_edit ? `<div class="px-4 py-3 border-t border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-2">
              <p class="text-xs text-slate-500 font-medium">Áp dụng ngay cho mọi người giữ chức danh này (trừ ngoại lệ riêng).</p>
              <div class="flex items-center gap-2">
                ${role.customized ? `<button type="button" onclick="resetAccessRole()" class="h-9 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold whitespace-nowrap">Về mặc định</button>` : ''}
                <button type="button" onclick="cancelAccessRole()" ${dirty ? '' : 'disabled'} class="h-9 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold whitespace-nowrap disabled:opacity-40">Huỷ thay đổi</button>
                <button type="button" onclick="saveAccessRole()" ${dirty ? '' : 'disabled'} class="h-9 px-3.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 disabled:opacity-40"><i class="ph-bold ph-floppy-disk"></i>Lưu phân quyền</button>
              </div></div>` : ''}
        </div>
      </div>`;
}

async function selectAccessRole(role) {
    const cur = _roleObj();
    if (accessUI.draft && !_acSame(_acPlain(accessUI.draft), cur.grants)) {
        const ok = await showConfirmModal({ title: 'Bỏ thay đổi chưa lưu?', message: `Phân quyền của "${cur.label}" có thay đổi chưa lưu.`, type: 'warning', confirmText: 'Bỏ thay đổi' });
        if (!ok) return;
    }
    accessUI.role = role;
    accessUI.draft = null;
    renderAccessRoles();
}
function toggleAccessRoleCell(m, a, on) {
    const s = accessUI.draft[m] || (accessUI.draft[m] = new Set());
    if (on) {
        s.add(a);
        if (a !== 'view') s.add('view');  // có thao tác thì phải được Xem
    } else {
        s.delete(a);
        if (a === 'view') s.clear();       // bỏ Xem = không vào được phân hệ
    }
    renderAccessRoles();
}
function toggleAccessRoleRow(m, on) {
    const mod = accessUI.data.modules.find(x => x.key === m);
    accessUI.draft[m] = new Set(on ? mod.actions : []);
    renderAccessRoles();
}
function cancelAccessRole() { accessUI.draft = null; renderAccessRoles(); }

async function saveAccessRole() {
    const role = _roleObj();
    const ok = await showConfirmModal({ title: 'Lưu phân quyền', message: `Áp dụng quyền mới cho chức danh "${role.label}"?`, type: 'warning', confirmText: 'Lưu' });
    if (!ok) return;
    await _accessSend(`/api/access/roles/${encodeURIComponent(role.key)}/`, 'PUT', { grants: _acPlain(accessUI.draft) }, `Đã lưu phân quyền "${role.label}"`);
}
async function resetAccessRole() {
    const role = _roleObj();
    const ok = await showConfirmModal({ title: 'Khôi phục mặc định', message: `Đưa quyền của "${role.label}" về mặc định của hệ thống?`, type: 'warning', confirmText: 'Khôi phục' });
    if (!ok) return;
    await _accessSend(`/api/access/roles/${encodeURIComponent(role.key)}/`, 'DELETE', null, `Đã khôi phục mặc định "${role.label}"`);
}

async function _accessSend(url, method, body, okMsg) {
    try {
        const res = await fetchWithAuth(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || `Lỗi ${res.status}`);
        accessUI.data = data;
        accessUI.draft = null;
        accessUI.userDraft = null;
        renderAccessShell();
        showToast('success', okMsg, 'Phân quyền');
    } catch (err) {
        showToast('danger', err.message || 'Không lưu được', 'Phân quyền');
    }
}

// ---------------------------------------------------------------- 2. Ngoại lệ theo người
function _userObj() { return accessUI.data.users.find(u => u.id === accessUI.userId); }

function renderAccessUsers() {
    const d = accessUI.data;
    if (!accessUI.userId || !_userObj()) accessUI.userId = (d.users.find(u => u.has_employee) || d.users[0] || {}).id;
    const u = _userObj();
    const q = (accessUI.userQ || '').toLowerCase();
    const list = d.users.filter(x => !q || `${x.name} ${x.username} ${x.code} ${x.role_label}`.toLowerCase().includes(q)).map(x => {
        const n = Object.values(x.allow).flat().length + Object.values(x.deny).flat().length;
        return `<button type="button" onclick="selectAccessUser(${x.id})" class="w-full text-left px-3 py-2 rounded-xl ${x.id === accessUI.userId ? 'bg-teal-50 ring-1 ring-teal-200' : 'hover:bg-slate-50'}">
            <div class="flex items-center justify-between gap-2"><span class="text-[13px] font-bold text-slate-800 truncate">${_acEsc(x.name)}</span>
            ${n ? `<span class="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">${n} ngoại lệ</span>` : ''}</div>
            <div class="text-[11px] text-slate-500 truncate">${_acEsc(x.username)} · ${_acEsc(x.role_label)}</div></button>`;
    }).join('') || '<div class="p-4 text-xs text-slate-400">Không tìm thấy</div>';

    let detail = '<div class="p-8 text-center text-slate-400">Chọn một người để xem quyền</div>';
    if (u) {
        if (!accessUI.userDraft) accessUI.userDraft = { allow: _acSets(u.allow), deny: _acSets(u.deny), note: u.note || '' };
        const ud = accessUI.userDraft;
        const roleG = _acSets((d.roles.find(r => r.key === u.role) || {}).grants || {});
        const editable = d.can_edit && u.has_employee && !u.is_superuser;
        const cell = (m, a) => {
            const fromRole = roleG[m] && roleG[m].has(a);
            const allow = ud.allow[m] && ud.allow[m].has(a);
            const deny = ud.deny[m] && ud.deny[m].has(a);
            let cls = 'text-slate-300', icon = 'ph-minus', title = 'Không có quyền';
            if (u.is_superuser) { cls = 'text-teal-700'; icon = 'ph-check'; title = 'Quản trị hệ thống: đủ quyền'; }
            else if (deny) { cls = 'bg-rose-100 text-rose-700 ring-1 ring-rose-300'; icon = 'ph-prohibit'; title = 'Chặn riêng người này'; }
            else if (allow) { cls = 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300'; icon = 'ph-plus'; title = 'Cho thêm riêng người này'; }
            else if (fromRole) { cls = 'text-teal-700'; icon = 'ph-check'; title = 'Theo chức danh'; }
            return `<button type="button" ${editable ? `onclick="cycleAccessUserCell('${m}','${a}')"` : 'disabled'} title="${title}${editable ? ' — bấm để đổi' : ''}"
                class="inline-flex items-center justify-center w-9 h-9 rounded-lg ${cls} ${editable ? 'hover:ring-2 hover:ring-slate-300' : ''}" aria-label="${title}"><i class="ph-bold ${icon} text-base"></i></button>`;
        };
        const dirty = editable && (!_acSame(_acPlain(ud.allow), u.allow) || !_acSame(_acPlain(ud.deny), u.deny) || (ud.note || '') !== (u.note || ''));
        detail = `
          <div class="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div><div class="text-sm font-black font-heading text-slate-900">${_acEsc(u.name)} <span class="text-slate-400 font-bold">· ${_acEsc(u.username)}</span></div>
              <div class="text-xs text-slate-500 font-medium">${_acEsc(u.role_label)}${u.is_active ? '' : ' · <span class="text-rose-600">đã khoá</span>'}</div></div>
            <div class="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
              <span class="inline-flex items-center gap-1"><i class="ph-bold ph-check text-teal-700"></i>Theo chức danh</span>
              <span class="inline-flex items-center gap-1"><span class="w-4 h-4 rounded bg-emerald-100 ring-1 ring-emerald-300 inline-flex items-center justify-center"><i class="ph-bold ph-plus text-[10px] text-emerald-800"></i></span>Cho thêm</span>
              <span class="inline-flex items-center gap-1"><span class="w-4 h-4 rounded bg-rose-100 ring-1 ring-rose-300 inline-flex items-center justify-center"><i class="ph-bold ph-prohibit text-[10px] text-rose-700"></i></span>Chặn</span>
            </div>
          </div>
          ${u.is_superuser ? '<div class="mx-4 mt-3 px-3 py-2 rounded-xl bg-slate-50 text-xs text-slate-600 font-medium">Tài khoản quản trị hệ thống luôn đủ quyền, không áp dụng ngoại lệ.</div>' : ''}
          ${!u.has_employee && !u.is_superuser ? '<div class="mx-4 mt-3 px-3 py-2 rounded-xl bg-amber-50 text-xs text-amber-900 font-medium">Tài khoản chưa gắn hồ sơ nhân viên nên dùng quy tắc cũ. Hãy gắn hồ sơ nhân viên để áp dụng ma trận phân quyền.</div>' : ''}
          ${_accessTable(cell)}
          ${_accessAccountBox(u)}
          ${editable ? `<div class="px-4 py-3 border-t border-slate-100 bg-slate-50/60 space-y-2">
              <input type="text" value="${_acEsc(ud.note)}" oninput="accessUI.userDraft.note=this.value; renderAccessUserButtons()" maxlength="255"
                placeholder="Lý do ngoại lệ (vd. Kiêm nhiệm thủ quỹ từ 11/2026)" aria-label="Lý do ngoại lệ"
                class="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <p class="text-xs text-slate-500 font-medium">Bấm vào ô để đổi: Theo chức danh → Cho thêm → Chặn.</p>
                <div class="flex items-center gap-2" id="access-user-buttons"></div>
              </div></div>` : ''}`;
        accessUI._userDirty = dirty;
    }
    document.getElementById('access-body').innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-4">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-xs p-2 lg:max-h-[70vh] lg:overflow-y-auto">
          <input type="search" value="${_acEsc(accessUI.userQ || '')}" oninput="accessUI.userQ=this.value; renderAccessUsers(); const i=document.querySelector('#access-body input[type=search]'); if(i){i.focus(); i.setSelectionRange(i.value.length,i.value.length);}"
            placeholder="Tìm người, mã NV, chức danh…" aria-label="Tìm người" class="w-full h-9 px-3 mb-2 rounded-xl border border-slate-200 text-xs font-semibold">
          ${list}</div>
        <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">${detail}</div>
      </div>`;
    renderAccessUserButtons();
}

function _accessAccountBox(u) {
    const d = accessUI.data;
    const logins = (u.recent_logins || []).map(e => `<li class="flex items-center justify-between gap-2"><span>${_acEsc(e.when)} · ${_acEsc(e.kind)}${e.new_device ? ' <span class="text-[10px] px-1.5 rounded-full bg-amber-100 text-amber-800">thiết bị mới</span>' : ''}</span><span class="font-mono text-slate-500">${_acEsc(e.ip)}</span></li>`).join('')
        || '<li class="text-slate-400">Chưa có nhật ký đăng nhập</li>';
    return `<div class="px-4 py-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div><div class="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Tài khoản & mật khẩu</div>
          <div class="text-xs text-slate-600 space-y-1">
            <div>Đăng nhập gần nhất: <b>${_acEsc(u.last_login || '—')}</b></div>
            <div>Email nhận đặt lại mật khẩu: <b>${u.has_email ? 'đã có' : '<span class="text-rose-600">chưa có (bổ sung trong hồ sơ Nhân sự)</span>'}</b></div>
          </div>
          ${d.can_edit && u.has_email ? `<button type="button" onclick="sendAccessReset(${u.id})" class="mt-2 h-8 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold inline-flex items-center gap-1.5"><i class="ph-bold ph-envelope-simple"></i>Gửi link đặt lại mật khẩu</button>` : ''}
        </div>
        <div><div class="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Đăng nhập gần đây</div>
          <ul class="text-xs text-slate-700 space-y-1">${logins}</ul></div>
      </div>`;
}

async function sendAccessReset(id) {
    const u = accessUI.data.users.find(x => x.id === id);
    const ok = await showConfirmModal({ title: 'Gửi link đặt lại mật khẩu', message: `Gửi email đặt lại mật khẩu cho ${u.name}? Link dùng một lần, hết hạn sau 1 giờ.`, type: 'warning', confirmText: 'Gửi email' });
    if (!ok) return;
    try {
        const res = await fetchWithAuth(`/api/access/users/${id}/send-reset/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || `Lỗi ${res.status}`);
        showToast('success', data.detail, 'Mật khẩu');
    } catch (err) {
        showToast('danger', err.message, 'Mật khẩu');
    }
}
window.sendAccessReset = sendAccessReset;

function renderAccessUserButtons() {
    const box = document.getElementById('access-user-buttons');
    const u = _userObj();
    if (!box || !u) return;
    const ud = accessUI.userDraft;
    const dirty = !_acSame(_acPlain(ud.allow), u.allow) || !_acSame(_acPlain(ud.deny), u.deny) || (ud.note || '') !== (u.note || '');
    const hasAny = Object.keys(u.allow).length || Object.keys(u.deny).length;
    box.innerHTML = `
        ${hasAny ? `<button type="button" onclick="clearAccessUser()" class="h-9 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold whitespace-nowrap">Bỏ mọi ngoại lệ</button>` : ''}
        <button type="button" onclick="saveAccessUser()" ${dirty ? '' : 'disabled'} class="h-9 px-3.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 disabled:opacity-40"><i class="ph-bold ph-floppy-disk"></i>Lưu ngoại lệ</button>`;
}
window.renderAccessUserButtons = renderAccessUserButtons;

function selectAccessUser(id) { accessUI.userId = id; accessUI.userDraft = null; renderAccessUsers(); }
function cycleAccessUserCell(m, a) {
    const ud = accessUI.userDraft;
    const role = accessUI.data.roles.find(r => r.key === _userObj().role) || {};
    const fromRole = ((role.grants || {})[m] || []).includes(a);
    const allow = ud.allow[m] || (ud.allow[m] = new Set());
    const deny = ud.deny[m] || (ud.deny[m] = new Set());
    // Có quyền theo chức danh: Theo chức danh <-> Chặn. Không có: Theo chức danh <-> Cho thêm.
    if (fromRole) { deny.has(a) ? deny.delete(a) : deny.add(a); allow.delete(a); }
    else { allow.has(a) ? allow.delete(a) : allow.add(a); deny.delete(a); }
    renderAccessUsers();
}
async function saveAccessUser() {
    const u = _userObj(); const ud = accessUI.userDraft;
    await _accessSend(`/api/access/users/${u.id}/`, 'PUT', { allow: _acPlain(ud.allow), deny: _acPlain(ud.deny), note: ud.note }, `Đã lưu ngoại lệ của ${u.name}`);
}
async function clearAccessUser() {
    const u = _userObj();
    const ok = await showConfirmModal({ title: 'Bỏ ngoại lệ', message: `${u.name} sẽ chỉ còn quyền theo chức danh "${u.role_label}".`, type: 'warning', confirmText: 'Bỏ ngoại lệ' });
    if (!ok) return;
    await _accessSend(`/api/access/users/${u.id}/`, 'DELETE', null, `Đã bỏ ngoại lệ của ${u.name}`);
}

// ---------------------------------------------------------------- 3. Tra cứu
function renderAccessLookup() {
    const d = accessUI.data; const lk = accessUI.lookup;
    const mod = d.modules.find(m => m.key === lk.module) || d.modules[0];
    if (!mod.actions.includes(lk.action)) lk.action = mod.actions[0];
    const people = d.users.filter(u => u.is_active && (u.effective[mod.key] || []).includes(lk.action));
    const byRole = {};
    people.forEach(u => { (byRole[u.role_label] = byRole[u.role_label] || []).push(u); });
    const summary = d.modules.map(m => {
        const n = d.users.filter(u => u.is_active && (u.effective[m.key] || []).includes('view')).length;
        return `<button type="button" onclick="accessUI.lookup.module='${m.key}'; renderAccessLookup()" class="px-3 py-2 rounded-xl border text-left ${m.key === mod.key ? 'border-teal-600 bg-teal-50' : 'border-slate-200 hover:bg-slate-50'}">
            <div class="text-[12px] font-bold text-slate-800">${_acEsc(m.label)}</div><div class="text-[11px] text-slate-500">${n} người được vào</div></button>`;
    }).join('');
    document.getElementById('access-body').innerHTML = `
      <div class="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-4">
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">${summary}</div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs font-bold text-slate-600">Ai được</span>
          <select onchange="accessUI.lookup.action=this.value; renderAccessLookup()" aria-label="Thao tác" class="h-9 px-2 rounded-xl border border-slate-200 bg-white text-xs font-bold">
            ${mod.actions.map(a => `<option value="${a}" ${a === lk.action ? 'selected' : ''}>${_acEsc(d.actions.find(x => x.key === a).label)}</option>`).join('')}
          </select>
          <span class="text-xs font-bold text-slate-600">trong phân hệ <b class="text-teal-800">${_acEsc(mod.label)}</b>: ${people.length} người</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          ${Object.keys(byRole).sort().map(r => `<div class="rounded-xl border border-slate-200 p-3">
              <div class="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">${_acEsc(r)} · ${byRole[r].length}</div>
              ${byRole[r].map(u => `<div class="text-[13px] font-semibold text-slate-800 flex items-center justify-between gap-2"><span class="truncate">${_acEsc(u.name)}</span>
                ${(u.allow[mod.key] || []).includes(lk.action) ? '<span class="text-[10px] px-1.5 rounded-full bg-emerald-100 text-emerald-800">ngoại lệ</span>' : ''}</div>`).join('')}
            </div>`).join('') || '<div class="text-sm text-slate-400">Không ai có quyền này</div>'}
        </div>
      </div>`;
}
window.renderAccessLookup = renderAccessLookup;
Object.assign(window, { selectAccessRole, toggleAccessRoleCell, toggleAccessRoleRow, cancelAccessRole, saveAccessRole, resetAccessRole,
    selectAccessUser, cycleAccessUserCell, saveAccessUser, clearAccessUser, accessUI });
