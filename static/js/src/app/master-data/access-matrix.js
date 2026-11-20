// ==============================================================================
// CÀI ĐẶT › VAI TRÒ & PHÂN QUYỀN — 3 tầng: Nhóm → Chức danh → Người
//   1. Theo nhóm: Admin | Giám đốc | Kinh doanh | Nhân sự | Kế toán | Điều vận | Vận hành | Hải quan (quyền gốc)
//   2. Theo chức danh: thuộc nhóm nào (mặc định đủ quyền nhóm) + thêm / bớt quyền riêng của vị trí
//   3. Tra cứu: gõ tên người → quyền đang được cấp và nguồn gốc từng quyền; chỉnh nhóm kiêm nhiệm / ngoại lệ
// API: /api/access/matrix/, /api/access/groups/<key>/, /api/access/roles/<role>/, /api/access/users/<id>/
// ==============================================================================
const accessUI = {
    data: null,
    view: 'groups',          // groups | roles | lookup
    group: 'admin',
    gDraft: null,            // Set('m:a') quyền nhóm đang sửa
    role: 'DIRECTOR',
    pDraft: null,            // {group, add: Set, remove: Set}
    userId: null,
    userQ: '',
    uDraft: null,            // {groups: Set, allow: Set, deny: Set, note}
    container: null,
    collapsed: new Set(),    // id mục (sec) / nhóm con (sec/sub) đang thu gọn
};

const _acEsc = (s) => (typeof escapeHtml === 'function' ? escapeHtml(s == null ? '' : String(s)) : String(s == null ? '' : s));
const _acFlat = (g) => { const s = new Set(); Object.entries(g || {}).forEach(([m, acts]) => (acts || []).forEach(a => s.add(`${m}:${a}`))); return s; };
const _acTree = (s) => { const o = {}; [...s].forEach(k => { const [m, a] = k.split(':'); (o[m] = o[m] || []).push(a); }); return o; };
const _acEq = (a, b) => a.size === b.size && [...a].every(x => b.has(x));
const _acGroup = (key) => (accessUI.data.groups.find(g => g.key === key) || null);
const _acGroupLabel = (key) => (_acGroup(key) || {}).label || 'Không thuộc nhóm';
const _acActLabel = (a) => (accessUI.data.actions.find(x => x.key === a) || {}).label || a;
const _acModLabel = (m) => (accessUI.data.modules.find(x => x.key === m) || {}).label || m;
const _acBtn = 'h-9 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold whitespace-nowrap disabled:opacity-40';
const _acPrimary = 'h-9 px-3.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 disabled:opacity-40';

// Bật một thao tác thì phải được Xem; bỏ Xem thì mất cả phân hệ
function _acToggle(set, m, a, on) {
    const mod = accessUI.data.modules.find(x => x.key === m);
    if (on) { set.add(`${m}:${a}`); if (a !== 'view') set.add(`${m}:view`); }
    else if (a === 'view') mod.actions.forEach(x => set.delete(`${m}:${x}`));
    else set.delete(`${m}:${a}`);
}

async function renderAccessMatrixPage(container) {
    accessUI.container = container;
    container.setAttribute('data-m-keep', '');
    container.innerHTML = `<div class="p-12 text-center text-slate-400"><i class="ph ph-spinner animate-spin text-3xl mb-2 text-teal-600 block"></i>Đang tải phân quyền…</div>`;
    try {
        const res = await fetchWithAuth('/api/access/matrix/');
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || `Lỗi ${res.status}`);
        _acSetData(data);
        renderAccessShell();
    } catch (err) {
        container.innerHTML = `<div class="p-12 text-center text-rose-600 font-bold"><i class="ph-bold ph-lock-key text-3xl mb-2 block"></i>${_acEsc(err.message)}</div>`;
    }
}
window.renderAccessMatrixPage = renderAccessMatrixPage;

function _acSetData(data) {
    // modules[].actions có thể là chuỗi hoặc {key,label}: chuẩn hoá về mảng khoá
    (data.modules || []).forEach(m => { m.actions = (m.actions || []).map(a => (a && typeof a === 'object') ? a.key : a); });
    accessUI.data = data;
    if (!data.groups.some(g => g.key === accessUI.group)) accessUI.group = data.groups[0].key;
    if (!data.roles.some(r => r.key === accessUI.role)) accessUI.role = data.roles[0].key;
    accessUI.gDraft = null; accessUI.pDraft = null; accessUI.uDraft = null;
}

function _acDirty() {
    const v = accessUI.view;
    if (v === 'groups' && accessUI.gDraft) return !_acEq(accessUI.gDraft, _acFlat(_acGroup(accessUI.group).grants));
    if (v === 'roles' && accessUI.pDraft) { const r = _roleObj(); const p = accessUI.pDraft; return p.group !== r.group || !_acEq(p.add, _acFlat(r.add)) || !_acEq(p.remove, _acFlat(r.remove)); }
    if (v === 'lookup' && accessUI.uDraft) return _userDirty();
    return false;
}
async function _acLeaveOk() {
    if (!_acDirty()) return true;
    return showConfirmModal({ title: 'Bỏ thay đổi chưa lưu?', message: 'Bạn có thay đổi phân quyền chưa lưu.', type: 'warning', confirmText: 'Bỏ thay đổi' });
}

function renderAccessShell() {
    const d = accessUI.data;
    const tab = (key, label, icon, hint) => `<button type="button" onclick="switchAccessView('${key}')" title="${hint}"
        class="h-10 px-4 rounded-xl text-xs md:text-sm font-bold font-heading border-2 whitespace-nowrap flex items-center gap-1.5 ${accessUI.view === key ? 'border-teal-600 bg-teal-50 text-teal-900' : 'border-transparent text-slate-600 hover:bg-slate-100'}">
        <i class="ph-bold ${icon}"></i><span>${label}</span></button>`;
    const step = (n, t, s) => `<div class="flex items-start gap-2 min-w-0"><span class="shrink-0 w-6 h-6 rounded-full bg-teal-700 text-white text-xs font-black flex items-center justify-center">${n}</span>
        <div class="min-w-0"><div class="text-[12.5px] font-bold text-slate-800">${t}</div><div class="text-[11px] text-slate-500 font-medium leading-snug">${s}</div></div></div>`;
    accessUI.container.innerHTML = `
      <div class="space-y-4">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
          <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <h3 class="text-base font-black font-heading text-slate-900 flex items-center gap-2"><i class="ph-bold ph-shield-check text-teal-700"></i>Phân quyền</h3>
            <div class="flex flex-wrap gap-1.5" role="tablist">
              ${tab('groups', '1. Theo nhóm', 'ph-users-three', 'Quyền gốc của từng nhóm')}
              ${tab('roles', '2. Theo chức danh', 'ph-identification-badge', 'Chức danh thuộc nhóm nào, thêm / bớt quyền gì')}
              ${tab('lookup', '3. Tra cứu người dùng', 'ph-magnifying-glass', 'Gõ tên để xem quyền đã cấp')}
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
            ${step(1, 'Nhóm = quyền gốc', 'Mỗi nhóm có sẵn bộ quyền đầy đủ của bộ phận.')}
            ${step(2, 'Chức danh thuộc một nhóm', 'Mặc định đủ quyền nhóm; thêm hoặc bớt tuỳ vị trí.')}
            ${step(3, 'Người theo chức danh', 'Có thể kiêm thêm nhóm khác hoặc thêm / chặn riêng.')}
          </div>
        </div>
        ${d.can_edit ? '' : `<div class="px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">Bạn chỉ có quyền xem. Chỉ người có quyền Sửa ở phân hệ "Quản trị hệ thống" được thay đổi phân quyền.</div>`}
        <div id="access-body"></div>
      </div>`;
    if (accessUI.view === 'groups') renderAccessGroups();
    else if (accessUI.view === 'roles') renderAccessRoles();
    else renderAccessLookup();
}

async function switchAccessView(view) {
    if (view === accessUI.view) return;
    if (!(await _acLeaveOk())) return;
    accessUI.gDraft = null; accessUI.pDraft = null; accessUI.uDraft = null;
    accessUI.view = view;
    renderAccessShell();
}
window.switchAccessView = switchAccessView;

// ---------------------------------------------------------------- Bảng ma trận dùng chung (hàng = cây theo sidebar)
// Mô hình cây: [{key,label,icon,mods}] theo thứ tự sidebar; trong mục, tab xếp đúng thứ tự API, đổi sub_section thì thêm dòng nhóm con.
// Thiếu section/sections (API cũ) => trả null và bảng hiện danh sách phẳng.
function _acTreeModel() {
    const d = accessUI.data;
    if (!Array.isArray(d.sections) || !d.sections.length || !d.modules.some(m => m.section)) return null;
    const known = new Set(d.sections.map(s => s.key));
    const secs = d.sections.map(s => ({ ...s, mods: d.modules.filter(m => m.section === s.key) }));
    const orphan = d.modules.filter(m => !known.has(m.section));
    if (orphan.length) secs.push({ key: '_other', label: 'Khác', icon: 'ph-dots-three', sub_sections: [], mods: orphan });
    return secs.filter(s => s.mods.length);
}

function _accessTable(cellFn, ui) {
    ui = ui || {};
    const d = accessUI.data;
    const nCols = d.actions.length + 1;
    const head = d.actions.map(a => `<th class="text-center" data-col-key="${a.key}">${_acEsc(a.label)}${ui.colToggle ? `<div class="mt-0.5">${ui.colToggle(a.key)}</div>` : ''}</th>`).join('');

    const tabRow = (m, sec, sub, pad) => {
        const cells = d.actions.map(a => m.actions.includes(a.key)
            ? `<td class="text-center">${cellFn(m.key, a.key)}</td>`
            : `<td></td>`).join('');
        const screens = (m.screens || []).filter(Boolean).join(' · ') || m.description || '';
        return `<tr data-kind="row" data-sec="${_acEsc(sec)}" data-sub="${_acEsc(sub)}">
            <td class="min-w-[240px] whitespace-normal">
              <div class="flex items-start gap-2 ${pad}">
                ${ui.rowToggle ? ui.rowToggle(m.key) : ''}
                <div class="min-w-0"><div class="text-[13px] font-semibold text-slate-800">${_acEsc(m.label)}</div>
                ${screens ? `<div class="text-[11px] text-slate-400 font-medium leading-snug">${_acEsc(screens)}</div>` : ''}</div>
              </div>
            </td>${cells}</tr>`;
    };
    const headRow = (kind, sec, sub, id, cls, pad, icon, label, mods) => `<tr data-kind="${kind}" data-sec="${_acEsc(sec)}" data-sub="${_acEsc(sub)}" class="${cls} cursor-pointer" tabindex="0" role="button" aria-expanded="true"
          onclick="toggleAccessCollapse('${_acEsc(id)}')" onkeydown="accessCollapseKey(event,'${_acEsc(id)}')">
        <td colspan="${nCols}"><div class="flex items-center gap-2 ${pad}">
          <i class="ph-bold ph-caret-down ac-caret text-slate-500 text-xs w-3"></i>
          ${ui.groupToggle ? ui.groupToggle(mods, kind === 'section' ? `toggleAccessSection('${_acEsc(sec)}', this.checked)` : `toggleAccessSub('${_acEsc(sec)}', '${_acEsc(sub)}', this.checked)`, label) : ''}
          ${icon ? `<i class="ph-bold ${_acEsc(icon)} text-teal-700"></i>` : ''}
          <span class="${kind === 'section' ? 'text-[13px] font-black font-heading text-slate-900' : 'text-xs font-bold font-heading text-slate-700'}">${_acEsc(label)}</span>
        </div></td></tr>`;

    let rows;
    const secs = _acTreeModel();
    if (!secs) {
        rows = d.modules.map(m => tabRow(m, '', '', '')).join('');
    } else {
        rows = secs.map(s => {
            let out = headRow('section', s.key, '', s.key, 'bg-slate-100 hover:bg-slate-200/70', '', s.icon, s.label, s.mods);
            let last = '';
            s.mods.forEach(m => {
                const sub = m.sub_section || '';
                if (sub !== last) {
                    last = sub;
                    if (sub) {
                        const lab = ((s.sub_sections || []).find(x => x.key === sub) || {}).label || sub;
                        out += headRow('sub', s.key, sub, `${s.key}/${sub}`, 'bg-slate-50 hover:bg-slate-100', 'pl-5', '', lab, s.mods.filter(x => (x.sub_section || '') === sub));
                    }
                }
                out += tabRow(m, s.key, sub, sub ? 'pl-10' : 'pl-5');
            });
            return out;
        }).join('');
    }
    return `<div class="overflow-x-auto"><table class="erp-table" data-table-title="Ma trận phân quyền" data-m-keep>
        <thead><tr><th data-col-key="module">Mục / Tab</th>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

// Sau mỗi lần vẽ: trạng thái indeterminate của hộp tick cả mục / hàng và thu gọn / mở rộng
function _acApplyCollapse(root) {
    if (!root) return;
    const set = accessUI.collapsed;
    root.querySelectorAll('tr[data-kind]').forEach(tr => {
        const kind = tr.dataset.kind, sec = tr.dataset.sec, sub = tr.dataset.sub || '';
        if (kind !== 'row') {
            const closed = set.has(kind === 'section' ? sec : `${sec}/${sub}`);
            tr.setAttribute('aria-expanded', String(!closed));
            const c = tr.querySelector('.ac-caret');
            if (c) { c.classList.toggle('ph-caret-down', !closed); c.classList.toggle('ph-caret-right', closed); }
        }
        const hide = (kind !== 'section' && set.has(sec)) || (kind === 'row' && !!sub && set.has(`${sec}/${sub}`));
        tr.classList.toggle('hidden', hide);
    });
}
function _acPostRender() {
    const root = document.getElementById('access-body');
    if (!root) return;
    root.querySelectorAll('input[data-ind]').forEach(i => { i.indeterminate = true; });
    _acApplyCollapse(root);
}
function toggleAccessCollapse(id) {
    const s = accessUI.collapsed;
    if (s.has(id)) s.delete(id); else s.add(id);
    _acApplyCollapse(document.getElementById('access-body'));
}
function accessCollapseKey(e, id) {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleAccessCollapse(id); }
}

// ---------------------------------------------------------------- Chọn nhanh cả hàng / cả cột (dùng chung 3 tầng)
function _acRoleEff() {
    const p = accessUI.pDraft;
    const base = _acFlat((_acGroup(p.group) || {}).grants);
    return { base, eff: new Set([...base, ...p.add].filter(k => !p.remove.has(k))) };
}
// Người đang có quyền k hay không (theo bản nháp): bị chặn riêng thì không; còn lại có nếu từ chức danh / nhóm kiêm nhiệm / cho thêm riêng
function _acUserHas(u, ud, k) {
    if (ud.deny.has(k)) return false;
    const src = _userSources(u, ud);
    return src.roleSet.has(k) || !!src.extra[k] || ud.allow.has(k);
}
function _acIsOnFn() {
    const v = accessUI.view;
    if (v === 'groups') return (k) => accessUI.gDraft.has(k);
    if (v === 'roles') { const { eff } = _acRoleEff(); return (k) => eff.has(k); }
    const u = _userObj(); const ud = accessUI.uDraft;
    return (k) => _acUserHas(u, ud, k);
}
function _acBulkUi(editable) {
    if (!editable) return {};
    const d = accessUI.data;
    const isOn = _acIsOnFn();
    const cb = (st, title, handler, extra) => `<input type="checkbox" class="${extra || ''} w-4 h-4 accent-teal-700 cursor-pointer shrink-0" title="${title}" aria-label="${title}" ${st.all ? 'checked' : ''} ${st.some ? 'data-ind="1"' : ''}
        onclick="event.stopPropagation()" onchange="${handler}">`;
    // Trạng thái một tập phân hệ: all = mọi ô áp dụng đều bật; some = bật một phần (indeterminate)
    const stateOf = (mods) => {
        let on = 0, tot = 0;
        mods.forEach(m => m.actions.forEach(a => { tot++; if (isOn(`${m.key}:${a}`)) on++; }));
        return { all: tot > 0 && on === tot, some: on > 0 && on < tot };
    };
    return {
        rowToggle: (m) => cb(stateOf([d.modules.find(x => x.key === m)]), `Bật/tắt cả hàng ${_acEsc(_acModLabel(m))}`, `toggleAccessRow('${m}', this.checked)`, 'mt-0.5'),
        colToggle: (a) => cb({ all: d.modules.filter(m => m.actions.includes(a)).every(m => isOn(`${m.key}:${a}`)), some: false }, `Bật/tắt cả cột ${_acEsc(_acActLabel(a))}`, `toggleAccessCol('${a}', this.checked)`),
        groupToggle: (mods, handler, label) => cb(stateOf(mods), `Bật/tắt cả mục ${_acEsc(label)}`, handler),
    };
}
// Đặt quyền của một người cho ô (phân hệ, thao tác): bật thao tác thì phải có Xem; tắt Xem thì mất cả phân hệ
function _acUserSet(u, ud, m, a, on) {
    const src = _userSources(u, ud);
    const k = `${m}:${a}`;
    const inherited = src.roleSet.has(k) || !!src.extra[k];
    if (on) {
        ud.deny.delete(k);
        if (!inherited) ud.allow.add(k);
        if (a !== 'view') _acUserSet(u, ud, m, 'view', true);
    } else {
        ud.allow.delete(k);
        if (inherited) ud.deny.add(k);
        if (a === 'view') _acModActions(m).forEach(x => { if (x !== 'view') _acUserSet(u, ud, m, x, false); });
    }
}
function _acBulk(pairs, on) {
    if (!accessUI.data.can_edit) return;
    const v = accessUI.view;
    if (v === 'groups') {
        pairs.forEach(([m, a]) => _acToggle(accessUI.gDraft, m, a, on));
        _acKeepLocked(); renderAccessGroups();
    } else if (v === 'roles') {
        const p = accessUI.pDraft;
        const { base, eff } = _acRoleEff();
        pairs.forEach(([m, a]) => _acToggle(eff, m, a, on));
        p.add = new Set([...eff].filter(k => !base.has(k)));
        p.remove = new Set([...base].filter(k => !eff.has(k)));
        renderAccessRoles();
    } else {
        const u = _userObj(); const ud = accessUI.uDraft;
        if (!u || !ud || u.is_superuser) return;
        pairs.forEach(([m, a]) => _acUserSet(u, ud, m, a, on));
        renderAccessLookup();
    }
}
function toggleAccessSection(sec, on) {
    const s = (_acTreeModel() || []).find(x => x.key === sec);
    if (s) _acBulk(s.mods.flatMap(m => m.actions.map(a => [m.key, a])), on);
}
function toggleAccessSub(sec, sub, on) {
    const s = (_acTreeModel() || []).find(x => x.key === sec);
    if (s) _acBulk(s.mods.filter(m => (m.sub_section || '') === sub).flatMap(m => m.actions.map(a => [m.key, a])), on);
}
function toggleAccessRow(m, on) { _acBulk(_acModActions(m).map(a => [m, a]), on); }
function toggleAccessCol(a, on) { _acBulk(accessUI.data.modules.filter(m => m.actions.includes(a)).map(m => [m.key, a]), on); }

const _acChip = (cls, icon, label) => `<span class="inline-flex items-center gap-1"><span class="w-5 h-5 rounded ${cls} inline-flex items-center justify-center"><i class="ph-bold ${icon} text-[11px]"></i></span>${label}</span>`;
const _AC_LEGEND = {
    group: _acChip('text-teal-700 bg-teal-50 ring-1 ring-teal-200', 'ph-check', 'Theo nhóm'),
    add: _acChip('bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300', 'ph-plus', 'Thêm'),
    remove: _acChip('bg-rose-100 text-rose-700 ring-1 ring-rose-300', 'ph-x', 'Bớt / Chặn'),
    extra: _acChip('bg-indigo-100 text-indigo-800 ring-1 ring-indigo-300', 'ph-users-three', 'Nhóm kiêm nhiệm'),
};
function _acCellBtn(state, title, onclick) {
    const map = {
        group: ['text-teal-700 bg-teal-50 ring-1 ring-teal-200', 'ph-check'],
        add: ['bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300', 'ph-plus'],
        remove: ['bg-rose-100 text-rose-700 ring-1 ring-rose-300', 'ph-x'],
        extra: ['bg-indigo-100 text-indigo-800 ring-1 ring-indigo-300', 'ph-users-three'],
        none: ['text-slate-300', 'ph-minus'],
    };
    const [cls, icon] = map[state];
    return `<button type="button" ${onclick ? `onclick="${onclick}"` : 'disabled'} title="${_acEsc(title)}${onclick ? ' — bấm để đổi' : ''}" aria-label="${_acEsc(title)}"
        class="inline-flex items-center justify-center w-9 h-9 rounded-lg ${cls} ${onclick ? 'hover:ring-2 hover:ring-slate-400' : 'cursor-default'}"><i class="ph-bold ${icon} text-base"></i></button>`;
}

// ---------------------------------------------------------------- 1. Theo nhóm
function _groupMembers(key) {
    const d = accessUI.data;
    return d.users.filter(u => (u.is_superuser ? key === 'admin' : (u.position_group === key || (u.groups || []).includes(key))));
}

function renderAccessGroups() {
    const d = accessUI.data;
    const g = _acGroup(accessUI.group);
    if (!accessUI.gDraft) accessUI.gDraft = _acFlat(g.grants);
    const draft = accessUI.gDraft;
    const saved = _acFlat(g.grants);
    const def = _acFlat(g.default);
    const locked = _acFlat(g.locked);

    const pills = d.groups.map(x => {
        const n = _groupMembers(x.key).length;
        const on = x.key === g.key;
        return `<button type="button" onclick="selectAccessGroup('${x.key}')" aria-pressed="${on}"
            class="px-3 py-2.5 rounded-xl border-2 text-left min-w-0 ${on ? 'border-teal-600 bg-teal-50' : 'border-slate-200 bg-white hover:bg-slate-50'}">
            <div class="flex items-center gap-1.5 text-[13px] font-black font-heading ${on ? 'text-teal-900' : 'text-slate-800'}"><i class="ph-bold ${_acEsc(x.icon)}"></i><span class="truncate">${_acEsc(x.label)}</span></div>
            <div class="text-[11px] text-slate-500 font-semibold mt-0.5">${n} người${x.customized ? ' · <span class="text-amber-700">đã chỉnh</span>' : ''}</div></button>`;
    }).join('');

    const positions = d.roles.filter(r => r.group === g.key);
    const members = _groupMembers(g.key);
    const cell = (m, a) => {
        const k = `${m}:${a}`; const on = draft.has(k);
        const changed = on !== saved.has(k);
        const isLocked = locked.has(k);
        return `<label class="inline-flex items-center justify-center w-9 h-9 rounded-lg ${changed ? 'bg-amber-100 ring-1 ring-amber-300' : ''}" title="${on !== def.has(k) ? 'Khác mặc định' : 'Như mặc định'}${isLocked ? ' — luôn bật cho nhóm này' : ''}">
            <input type="checkbox" class="w-4 h-4 accent-teal-700" ${on ? 'checked' : ''} ${(!d.can_edit || isLocked) ? 'disabled' : ''}
              onchange="toggleAccessGroupCell('${m}','${a}',this.checked)" aria-label="${_acEsc(_acModLabel(m))} — ${_acEsc(_acActLabel(a))}"></label>`;
    };
    const ui = _acBulkUi(d.can_edit);
    const dirty = !_acEq(draft, saved);
    const modKeys = new Set(d.modules.map(m => m.key));
    const nMods = new Set([...draft].map(k => k.split(':')[0]).filter(k => modKeys.has(k))).size;

    document.getElementById('access-body').innerHTML = `
      <div class="space-y-4">
        <div class="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2">${pills}</div>
        <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div class="px-4 py-3 border-b border-slate-100 space-y-2">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div class="text-sm font-black font-heading text-slate-900 flex items-center gap-2"><i class="ph-bold ${_acEsc(g.icon)} text-teal-700"></i>Nhóm ${_acEsc(g.label)}</div>
                <div class="text-xs text-slate-500 font-medium">${_acEsc(g.description)} · được vào ${nMods}/${d.modules.length} tab</div>
              </div>
              <div class="text-[11px] text-slate-500 flex items-center gap-1"><span class="w-3 h-3 rounded bg-amber-100 ring-1 ring-amber-300"></span>Chưa lưu</div>
            </div>
            <div class="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span class="font-bold text-slate-500">Chức danh thuộc nhóm:</span>
              ${positions.map(r => `<button type="button" onclick="openAccessRole('${r.key}')" class="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-teal-100 text-slate-700 font-bold">${_acEsc(r.label)}</button>`).join('') || '<span class="text-slate-400">chưa có</span>'}
              <span class="font-bold text-slate-500 ml-2">Thành viên:</span>
              ${members.map(u => `<button type="button" onclick="openAccessUser(${u.id})" class="px-2 py-0.5 rounded-full bg-white ring-1 ring-slate-200 hover:bg-teal-50 text-slate-700 font-semibold">${_acEsc(u.name)}${u.is_superuser ? ' <span class="text-slate-500">(quản trị)</span>' : (u.position_group !== g.key ? ' <span class="text-indigo-700">(kiêm)</span>' : '')}</button>`).join('') || '<span class="text-slate-400">chưa có</span>'}
            </div>
          </div>
          ${_accessTable(cell, ui)}
          ${d.can_edit ? `<div class="px-4 py-3 border-t border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-2">
              <p class="text-xs text-slate-500 font-medium">Áp dụng ngay cho mọi chức danh và người thuộc nhóm (trừ phần chức danh / cá nhân đã bớt).</p>
              <div class="flex items-center gap-2">
                ${g.customized ? `<button type="button" onclick="resetAccessGroup()" class="${_acBtn}">Về mặc định</button>` : ''}
                <button type="button" onclick="cancelAccessDraft()" ${dirty ? '' : 'disabled'} class="${_acBtn}">Huỷ thay đổi</button>
                <button type="button" onclick="saveAccessGroup()" ${dirty ? '' : 'disabled'} class="${_acPrimary}"><i class="ph-bold ph-floppy-disk"></i>Lưu quyền nhóm</button>
              </div></div>` : ''}
        </div>
      </div>`;
    _acPostRender();
}

async function selectAccessGroup(key) {
    if (key === accessUI.group) return;
    if (!(await _acLeaveOk())) return;
    accessUI.group = key; accessUI.gDraft = null;
    renderAccessGroups();
}
function toggleAccessGroupCell(m, a, on) { _acToggle(accessUI.gDraft, m, a, on); _acKeepLocked(); renderAccessGroups(); }
function toggleAccessGroupRow(m, on) { toggleAccessRow(m, on); }
function _acKeepLocked() { _acFlat(_acGroup(accessUI.group).locked).forEach(k => accessUI.gDraft.add(k)); }
async function saveAccessGroup() {
    const g = _acGroup(accessUI.group);
    const ok = await showConfirmModal({ title: 'Lưu quyền nhóm', message: `Áp dụng quyền mới cho nhóm "${g.label}"? Mọi chức danh và người thuộc nhóm sẽ nhận thay đổi ngay.`, type: 'warning', confirmText: 'Lưu' });
    if (!ok) return;
    await _accessSend(`/api/access/groups/${encodeURIComponent(g.key)}/`, 'PUT', { grants: _acTree(accessUI.gDraft) }, `Đã lưu quyền nhóm "${g.label}"`);
}
async function resetAccessGroup() {
    const g = _acGroup(accessUI.group);
    const ok = await showConfirmModal({ title: 'Khôi phục mặc định', message: `Đưa quyền nhóm "${g.label}" về mặc định của hệ thống?`, type: 'warning', confirmText: 'Khôi phục' });
    if (!ok) return;
    await _accessSend(`/api/access/groups/${encodeURIComponent(g.key)}/`, 'DELETE', null, `Đã khôi phục mặc định nhóm "${g.label}"`);
}
function cancelAccessDraft() { accessUI.gDraft = null; accessUI.pDraft = null; accessUI.uDraft = null; renderAccessShell(); }

async function _accessSend(url, method, body, okMsg) {
    try {
        const res = await fetchWithAuth(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || `Lỗi ${res.status}`);
        _acSetData(data);
        renderAccessShell();
        showToast('success', okMsg, 'Phân quyền');
    } catch (err) {
        showToast('danger', err.message || 'Không lưu được', 'Phân quyền');
    }
}

// ---------------------------------------------------------------- 2. Theo chức danh
function _roleObj() { return accessUI.data.roles.find(r => r.key === accessUI.role); }

function renderAccessRoles() {
    const d = accessUI.data;
    const role = _roleObj();
    if (!accessUI.pDraft) accessUI.pDraft = { group: role.group, add: _acFlat(role.add), remove: _acFlat(role.remove) };
    const p = accessUI.pDraft;
    const base = _acFlat((_acGroup(p.group) || {}).grants);

    const sections = [...d.groups.map(g => ({ key: g.key, label: g.label, icon: g.icon })), { key: '', label: 'Không thuộc nhóm', icon: 'ph-user' }]
        .map(g => ({ ...g, roles: d.roles.filter(r => r.group === g.key) })).filter(g => g.roles.length);
    const list = sections.map(g => `
        <div class="mb-3"><div class="px-2 text-[10.5px] font-black uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1"><i class="ph-bold ${_acEsc(g.icon)}"></i>${_acEsc(g.label)}</div>
        ${g.roles.map(r => {
            const nAdd = _acFlat(r.add).size, nRem = _acFlat(r.remove).size;
            return `<button type="button" onclick="selectAccessRole('${r.key}')"
            class="w-full text-left px-3 py-2 rounded-xl text-[13px] font-bold flex items-center justify-between gap-2 ${r.key === accessUI.role ? 'bg-teal-50 text-teal-900 ring-1 ring-teal-200' : 'text-slate-700 hover:bg-slate-50'}">
            <span class="truncate">${_acEsc(r.label)}</span>
            <span class="shrink-0 flex gap-1 text-[10px]">${nAdd ? `<span class="px-1.5 rounded-full bg-emerald-100 text-emerald-800">+${nAdd}</span>` : ''}${nRem ? `<span class="px-1.5 rounded-full bg-rose-100 text-rose-700">−${nRem}</span>` : ''}</span>
          </button>`;
        }).join('')}</div>`).join('');

    const editable = d.can_edit;
    const ui = _acBulkUi(editable);
    const cell = (m, a) => {
        const k = `${m}:${a}`;
        let state = 'none', title = 'Không có quyền';
        if (base.has(k)) { state = p.remove.has(k) ? 'remove' : 'group'; title = p.remove.has(k) ? 'Bớt so với nhóm' : `Theo nhóm ${_acGroupLabel(p.group)}`; }
        else if (p.add.has(k)) { state = 'add'; title = 'Thêm riêng cho chức danh'; }
        return _acCellBtn(state, `${_acModLabel(m)} — ${_acActLabel(a)}: ${title}`, editable ? `cycleAccessRoleCell('${m}','${a}')` : '');
    };
    const dirty = _acDirty();
    const members = d.users.filter(u => u.role === role.key);
    const groupOpts = [...d.groups.map(g => `<option value="${g.key}" ${g.key === p.group ? 'selected' : ''}>${_acEsc(g.label)}</option>`),
        `<option value="" ${!p.group ? 'selected' : ''}>Không thuộc nhóm</option>`].join('');
    const diffList = (set, cls, sign) => [...set].map(k => { const [m, a] = k.split(':'); return `<span class="px-1.5 py-0.5 rounded-full ${cls}">${sign} ${_acEsc(_acModLabel(m))}: ${_acEsc(_acActLabel(a))}</span>`; }).join(' ');
    const defNote = (role.default_group !== p.group) ? `<span class="text-amber-700">(mặc định: ${_acEsc(_acGroupLabel(role.default_group))})</span>` : '';

    document.getElementById('access-body').innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)] gap-4">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-xs p-2 lg:max-h-[75vh] lg:overflow-y-auto">${list}</div>
        <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div class="px-4 py-3 border-b border-slate-100 space-y-2">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div class="text-sm font-black font-heading text-slate-900">${_acEsc(role.label)}</div>
                <div class="text-xs text-slate-500 font-medium">${members.length} người: ${members.map(u => `<button type="button" onclick="openAccessUser(${u.id})" class="underline decoration-dotted hover:text-teal-700">${_acEsc(u.name)}</button>`).join(', ') || '—'}</div>
              </div>
              <label class="flex items-center gap-2 text-xs font-bold text-slate-600">Thuộc nhóm
                <select ${editable ? '' : 'disabled'} onchange="changeAccessRoleGroup(this.value)" aria-label="Nhóm của chức danh" class="h-9 px-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800">${groupOpts}</select>
                ${defNote}</label>
            </div>
            <div class="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">${_AC_LEGEND.group}${_AC_LEGEND.add}${_AC_LEGEND.remove}</div>
            ${(p.add.size || p.remove.size) ? `<div class="flex flex-wrap gap-1 text-[11px] font-semibold">${diffList(p.add, 'bg-emerald-100 text-emerald-800', '+')} ${diffList(p.remove, 'bg-rose-100 text-rose-700', '−')}</div>`
                : `<div class="text-[11px] text-slate-500">Đang dùng đúng quyền của nhóm ${_acEsc(_acGroupLabel(p.group))}.</div>`}
          </div>
          ${_accessTable(cell, ui)}
          ${editable ? `<div class="px-4 py-3 border-t border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-2">
              <p class="text-xs text-slate-500 font-medium">Bấm vào ô: quyền của nhóm ⇄ Bớt; quyền nhóm không có ⇄ Thêm. Hộp đầu hàng / đầu cột: bật hoặc tắt cả hàng / cả cột.</p>
              <div class="flex items-center gap-2">
                ${role.customized ? `<button type="button" onclick="resetAccessRole()" class="${_acBtn}">Về mặc định</button>` : ''}
                <button type="button" onclick="cancelAccessDraft()" ${dirty ? '' : 'disabled'} class="${_acBtn}">Huỷ thay đổi</button>
                <button type="button" onclick="saveAccessRole()" ${dirty ? '' : 'disabled'} class="${_acPrimary}"><i class="ph-bold ph-floppy-disk"></i>Lưu chức danh</button>
              </div></div>` : ''}
        </div>
      </div>`;
    _acPostRender();
}

async function selectAccessRole(role) {
    if (role === accessUI.role && accessUI.view === 'roles') return;
    if (!(await _acLeaveOk())) return;
    accessUI.role = role; accessUI.pDraft = null;
    renderAccessRoles();
}
async function openAccessRole(role) {
    if (!(await _acLeaveOk())) return;
    accessUI.gDraft = null; accessUI.pDraft = null; accessUI.uDraft = null;
    accessUI.role = role; accessUI.view = 'roles';
    renderAccessShell();
}
function changeAccessRoleGroup(key) {
    const p = accessUI.pDraft;
    const base = _acFlat((_acGroup(key) || {}).grants);
    p.group = key;
    p.add = new Set([...p.add].filter(k => !base.has(k)));
    p.remove = new Set([...p.remove].filter(k => base.has(k)));
    renderAccessRoles();
}
function cycleAccessRoleCell(m, a) {
    const p = accessUI.pDraft;
    const base = _acFlat((_acGroup(p.group) || {}).grants);
    const eff = new Set([...base, ...p.add].filter(k => !p.remove.has(k)));
    _acToggle(eff, m, a, !eff.has(`${m}:${a}`));
    p.add = new Set([...eff].filter(k => !base.has(k)));
    p.remove = new Set([...base].filter(k => !eff.has(k)));
    renderAccessRoles();
}
async function saveAccessRole() {
    const role = _roleObj(); const p = accessUI.pDraft;
    const ok = await showConfirmModal({ title: 'Lưu chức danh', message: `Áp dụng cho mọi người giữ chức danh "${role.label}"?`, type: 'warning', confirmText: 'Lưu' });
    if (!ok) return;
    await _accessSend(`/api/access/roles/${encodeURIComponent(role.key)}/`, 'PUT', { group: p.group, add: _acTree(p.add), remove: _acTree(p.remove) }, `Đã lưu chức danh "${role.label}"`);
}
async function resetAccessRole() {
    const role = _roleObj();
    const ok = await showConfirmModal({ title: 'Khôi phục mặc định', message: `Đưa chức danh "${role.label}" về nhóm và quyền mặc định?`, type: 'warning', confirmText: 'Khôi phục' });
    if (!ok) return;
    await _accessSend(`/api/access/roles/${encodeURIComponent(role.key)}/`, 'DELETE', null, `Đã khôi phục mặc định "${role.label}"`);
}

// ---------------------------------------------------------------- 3. Tra cứu người dùng
function _userObj() { return accessUI.data.users.find(u => u.id === accessUI.userId); }
const _acNorm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

function _userDirty() {
    const u = _userObj(); const ud = accessUI.uDraft;
    if (!u || !ud) return false;
    return !_acEq(ud.groups, new Set(u.groups || [])) || !_acEq(ud.allow, _acFlat(u.allow)) || !_acEq(ud.deny, _acFlat(u.deny)) || (ud.note || '') !== (u.note || '');
}

// Nguồn của một quyền: chức danh (nhóm / thêm), nhóm kiêm nhiệm, cho thêm riêng, chặn riêng
function _userSources(u, ud) {
    const role = accessUI.data.roles.find(r => r.key === u.role) || { grants: {}, add: {}, group: '' };
    const roleSet = _acFlat(role.grants);
    const roleAdd = _acFlat(role.add);
    const extra = {};
    [...ud.groups].forEach(gk => _acFlat((_acGroup(gk) || {}).grants).forEach(k => { if (!extra[k]) extra[k] = gk; }));
    return { role, roleSet, roleAdd, extra };
}

function renderAccessLookup() {
    const d = accessUI.data;
    const q = _acNorm(accessUI.userQ);
    const found = d.users.filter(x => !q || _acNorm(`${x.name} ${x.username} ${x.code} ${x.role_label}`).includes(q));
    if (!found.some(x => x.id === accessUI.userId)) { accessUI.userId = (found[0] || {}).id || null; accessUI.uDraft = null; }
    const u = _userObj();

    const list = found.map(x => {
        const modKeys = new Set(d.modules.map(m => m.key));
        const nMods = Object.keys(x.effective || {}).filter(k => modKeys.has(k)).length;
        const nEx = (x.groups || []).length + _acFlat(x.allow).size + _acFlat(x.deny).size;
        return `<button type="button" onclick="selectAccessUser(${x.id})" class="w-full text-left px-3 py-2 rounded-xl ${x.id === accessUI.userId ? 'bg-teal-50 ring-1 ring-teal-200' : 'hover:bg-slate-50'}">
            <div class="flex items-center justify-between gap-2"><span class="text-[13px] font-bold text-slate-800 truncate">${_acEsc(x.name)}</span>
              <span class="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">${x.is_superuser ? 'toàn quyền' : `${nMods} tab`}</span></div>
            <div class="text-[11px] text-slate-500 truncate">${_acEsc(x.username)} · ${_acEsc(x.role_label)}${nEx ? ` · <span class="text-indigo-700">${nEx} ngoại lệ</span>` : ''}</div></button>`;
    }).join('') || '<div class="p-4 text-xs text-slate-400">Không tìm thấy người dùng</div>';

    let detail = '<div class="p-10 text-center text-slate-400">Gõ tên, tên đăng nhập hoặc mã nhân viên để xem quyền</div>';
    if (u) detail = _accessUserDetail(u);

    const body = document.getElementById('access-body');
    const hadFocus = document.activeElement && document.activeElement.id === 'access-user-search';
    body.innerHTML = `
      <div class="space-y-3">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-xs p-3">
          <label class="relative block">
            <i class="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input id="access-user-search" type="search" value="${_acEsc(accessUI.userQ)}" oninput="searchAccessUser(this.value)" autocomplete="off"
              placeholder="Gõ tên người dùng, tên đăng nhập, mã NV… (vd. dieudo)" aria-label="Tra cứu người dùng"
              class="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 text-sm font-semibold focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none">
          </label>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-4">
          <div class="bg-white rounded-2xl border border-slate-200 shadow-xs p-2 lg:max-h-[75vh] lg:overflow-y-auto">
            <div class="px-2 pb-1 text-[10.5px] font-black uppercase tracking-wider text-slate-400">${found.length} người</div>${list}</div>
          <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">${detail}</div>
        </div>
      </div>`;
    _acPostRender();
    if (hadFocus) { const i = document.getElementById('access-user-search'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
}

function _accessUserDetail(u) {
    const d = accessUI.data;
    if (!accessUI.uDraft) accessUI.uDraft = { groups: new Set(u.groups || []), allow: _acFlat(u.allow), deny: _acFlat(u.deny), note: u.note || '' };
    const ud = accessUI.uDraft;
    // Tài khoản không có hồ sơ nhân viên vẫn sửa được (nhóm kiêm nhiệm + cho thêm / chặn); chỉ quản trị hệ thống là chỉ xem
    const editable = d.can_edit && !u.is_superuser;
    const ui = _acBulkUi(editable);
    const src = _userSources(u, ud);
    const eff = new Set(u.is_superuser ? d.modules.flatMap(m => m.actions.map(a => `${m.key}:${a}`)) : []);
    if (!u.is_superuser) {
        src.roleSet.forEach(k => eff.add(k));
        Object.keys(src.extra).forEach(k => eff.add(k));
        ud.allow.forEach(k => eff.add(k));
        ud.deny.forEach(k => eff.delete(k));
    }
    const cell = (m, a) => {
        const k = `${m}:${a}`; const label = `${_acModLabel(m)} — ${_acActLabel(a)}`;
        if (u.is_superuser) return _acCellBtn('group', `${label}: quản trị hệ thống`, '');
        let state = 'none', title = 'Không có quyền';
        if (ud.deny.has(k)) { state = 'remove'; title = 'Chặn riêng người này'; }
        else if (src.roleSet.has(k)) { state = src.roleAdd.has(k) ? 'add' : 'group'; title = src.roleAdd.has(k) ? `Chức danh ${u.role_label} được thêm` : `Theo nhóm ${_acGroupLabel(src.role.group)}`; }
        else if (src.extra[k]) { state = 'extra'; title = `Nhóm kiêm nhiệm ${_acGroupLabel(src.extra[k])}`; }
        else if (ud.allow.has(k)) { state = 'add'; title = 'Cho thêm riêng người này'; }
        return _acCellBtn(state, `${label}: ${title}`, editable ? `cycleAccessUserCell('${m}','${a}')` : '');
    };
    const mods = d.modules.filter(m => eff.has(`${m.key}:view`));
    const groupChips = d.groups.filter(g => g.key !== u.position_group).map(g => {
        const on = ud.groups.has(g.key);
        return `<label class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[12px] font-bold ${on ? 'border-indigo-400 bg-indigo-50 text-indigo-900' : 'border-slate-200 text-slate-600'} ${editable ? 'cursor-pointer hover:bg-indigo-50' : 'opacity-70'}">
            <input type="checkbox" class="w-3.5 h-3.5 accent-indigo-700" ${on ? 'checked' : ''} ${editable ? '' : 'disabled'} onchange="toggleAccessUserGroup('${g.key}', this.checked)">${_acEsc(g.label)}</label>`;
    }).join('');
    const dirty = editable && _userDirty();
    const hasAny = (u.groups || []).length || _acFlat(u.allow).size || _acFlat(u.deny).size;

    return `
      <div class="px-4 py-3 border-b border-slate-100 space-y-2">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div class="text-sm font-black font-heading text-slate-900">${_acEsc(u.name)} <span class="text-slate-400 font-bold">· ${_acEsc(u.username)}</span>${u.code ? ` <span class="text-slate-400 font-bold">· ${_acEsc(u.code)}</span>` : ''}</div>
            <div class="text-xs text-slate-600 font-medium mt-0.5">Chức danh: <b>${_acEsc(u.role_label)}</b>${u.role ? ` <button type="button" onclick="openAccessRole('${u.role}')" class="text-teal-700 underline decoration-dotted">xem</button>` : ''}
              · Nhóm: <b>${u.is_superuser ? 'Quản trị hệ thống' : _acEsc([u.position_group, ...(u.groups || []).filter(g => g !== u.position_group)].filter(Boolean).map(_acGroupLabel).join(' + ') || 'Không thuộc nhóm')}</b>
              ${u.is_active ? '' : ' · <span class="text-rose-600 font-bold">đã khoá</span>'}</div>
          </div>
          <div class="text-xs font-bold text-slate-600">Được vào <span class="text-teal-800">${mods.length}/${d.modules.length}</span> tab</div>
        </div>
        <div class="flex flex-wrap gap-1 text-[11px]">${mods.map(m => `<span class="px-2 py-0.5 rounded-full bg-teal-50 text-teal-900 font-semibold ring-1 ring-teal-100">${_acEsc(m.label)}</span>`).join('') || '<span class="text-rose-600 font-bold">Không vào được phân hệ nào</span>'}</div>
        ${u.is_superuser ? '<div class="px-3 py-2 rounded-xl bg-slate-50 text-xs text-slate-600 font-medium">Tài khoản quản trị hệ thống luôn đủ quyền.</div>' : ''}
        ${!u.has_employee && !u.is_superuser ? '<div class="px-3 py-2 rounded-xl bg-amber-50 text-xs text-amber-900 font-medium">Tài khoản chưa gắn hồ sơ nhân viên nên không có chức danh: chưa được cấp quyền nào cho đến khi bạn chọn nhóm kiêm nhiệm hoặc cho thêm quyền bên dưới.</div>' : ''}
        ${!u.is_superuser ? `<div class="flex flex-wrap items-center gap-1.5"><span class="text-[11px] font-black uppercase tracking-wider text-slate-500 mr-1">Kiêm thêm nhóm</span>${groupChips}</div>` : ''}
        <div class="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">${_AC_LEGEND.group}${_AC_LEGEND.extra}${_AC_LEGEND.add}${_AC_LEGEND.remove}</div>
      </div>
      ${_accessTable(cell, ui)}
      ${editable ? `<div class="px-4 py-3 border-t border-slate-100 bg-slate-50/60 space-y-2">
          <input type="text" value="${_acEsc(ud.note)}" oninput="accessUI.uDraft.note=this.value; renderAccessUserButtons()" maxlength="255"
            placeholder="Lý do (vd. Kiêm nhiệm thủ quỹ từ 11/2026)" aria-label="Lý do ngoại lệ"
            class="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="text-xs text-slate-500 font-medium">Bấm vào ô: quyền đang có ⇄ Chặn riêng; quyền chưa có ⇄ Cho thêm riêng.</p>
            <div class="flex items-center gap-2" id="access-user-buttons">${_accessUserButtons(dirty, hasAny)}</div>
          </div></div>` : ''}
      ${_accessAccountBox(u)}`;
}

function _accessUserButtons(dirty, hasAny) {
    return `${hasAny ? `<button type="button" onclick="clearAccessUser()" class="${_acBtn}">Bỏ mọi ngoại lệ</button>` : ''}
        <button type="button" onclick="cancelAccessDraft()" ${dirty ? '' : 'disabled'} class="${_acBtn}">Huỷ thay đổi</button>
        <button type="button" onclick="saveAccessUser()" ${dirty ? '' : 'disabled'} class="${_acPrimary}"><i class="ph-bold ph-floppy-disk"></i>Lưu</button>`;
}
function renderAccessUserButtons() {
    const box = document.getElementById('access-user-buttons'); const u = _userObj();
    if (!box || !u) return;
    box.innerHTML = _accessUserButtons(_userDirty(), (u.groups || []).length || _acFlat(u.allow).size || _acFlat(u.deny).size);
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

let _acSearchTimer = null;
function searchAccessUser(v) {
    accessUI.userQ = v;
    clearTimeout(_acSearchTimer);
    _acSearchTimer = setTimeout(async () => {
        const prev = accessUI.userId;
        const q = _acNorm(v);
        const first = accessUI.data.users.find(x => !q || _acNorm(`${x.name} ${x.username} ${x.code} ${x.role_label}`).includes(q));
        const keep = accessUI.data.users.some(x => x.id === prev && (!q || _acNorm(`${x.name} ${x.username} ${x.code} ${x.role_label}`).includes(q)));
        if (!keep && _userDirty() && !(await _acLeaveOk())) return;
        if (!keep) { accessUI.userId = first ? first.id : null; accessUI.uDraft = null; }
        renderAccessLookup();
    }, 150);
}
async function selectAccessUser(id) {
    if (id === accessUI.userId) return;
    if (!(await _acLeaveOk())) return;
    accessUI.userId = id; accessUI.uDraft = null;
    renderAccessLookup();
}
async function openAccessUser(id) {
    if (!(await _acLeaveOk())) return;
    accessUI.gDraft = null; accessUI.pDraft = null; accessUI.uDraft = null;
    accessUI.userId = id; accessUI.userQ = ''; accessUI.view = 'lookup';
    renderAccessShell();
}
function toggleAccessUserGroup(key, on) {
    const ud = accessUI.uDraft;
    if (on) ud.groups.add(key); else ud.groups.delete(key);
    renderAccessLookup();
}
function cycleAccessUserCell(m, a) {
    const u = _userObj(); const ud = accessUI.uDraft;
    if (!u || !ud || u.is_superuser || !accessUI.data.can_edit) return;
    // Quyền có sẵn (chức danh / nhóm kiêm nhiệm): có ⇄ Chặn. Chưa có: chưa có ⇄ Cho thêm.
    _acUserSet(u, ud, m, a, !_acUserHas(u, ud, `${m}:${a}`));
    renderAccessLookup();
}
const _acModActions = (m) => (accessUI.data.modules.find(x => x.key === m) || { actions: [] }).actions;
async function saveAccessUser() {
    const u = _userObj(); const ud = accessUI.uDraft;
    await _accessSend(`/api/access/users/${u.id}/`, 'PUT', { groups: [...ud.groups], allow: _acTree(ud.allow), deny: _acTree(ud.deny), note: ud.note }, `Đã lưu phân quyền của ${u.name}`);
}
async function clearAccessUser() {
    const u = _userObj();
    const ok = await showConfirmModal({ title: 'Bỏ ngoại lệ', message: `${u.name} sẽ chỉ còn quyền theo chức danh "${u.role_label}".`, type: 'warning', confirmText: 'Bỏ ngoại lệ' });
    if (!ok) return;
    await _accessSend(`/api/access/users/${u.id}/`, 'DELETE', null, `Đã bỏ ngoại lệ của ${u.name}`);
}

Object.assign(window, {
    accessUI, renderAccessGroups, renderAccessRoles, renderAccessLookup, renderAccessUserButtons, cancelAccessDraft,
    selectAccessGroup, toggleAccessGroupCell, toggleAccessGroupRow, toggleAccessRow, toggleAccessCol, toggleAccessSection, toggleAccessSub, toggleAccessCollapse, accessCollapseKey, saveAccessGroup, resetAccessGroup,
    selectAccessRole, openAccessRole, changeAccessRoleGroup, cycleAccessRoleCell, saveAccessRole, resetAccessRole,
    searchAccessUser, selectAccessUser, openAccessUser, toggleAccessUserGroup, cycleAccessUserCell, saveAccessUser, clearAccessUser, sendAccessReset,
});
