// ==============================================================================
// NHẬT KÝ HOẠT ĐỘNG: ai tạo / sửa / xóa / duyệt phiếu nào, đăng nhập lúc nào (chỉ đọc)
// API: /api/audit/logs/ và /api/audit/logins/ (quyền 'audit_log' trong ma trận Phân quyền)
// ==============================================================================
let auditState = { tab: 'data', page: 1, pageSize: 30, count: 0, filtersLoaded: false, rows: [], openId: null };

// Màu chữ theo hành động (bảng chữ thuần, không dùng badge / pill)
const AUDIT_KIND_CLASS = {
    create: 'text-emerald-700', update: 'text-blue-700', status: 'text-amber-700', delete: 'text-rose-700', hard_delete: 'text-rose-700',
    login: 'text-emerald-700', failed: 'text-rose-700', locked: 'text-rose-700', logout: 'text-slate-600'
};

function loadAuditLog() {
    switchAuditTab(auditState.tab || 'data');
}

function auditQuery(extra = {}) {
    const val = id => (document.getElementById(id)?.value || '').trim();
    const p = new URLSearchParams();
    const set = (k, v) => { if (v) p.set(k, v); };
    set('q', val('audit-q'));
    set('kind', val('audit-kind'));
    set('date_from', val('audit-from'));
    set('date_to', val('audit-to'));
    if (auditState.tab === 'data') { set('actor', val('audit-actor')); set('model', val('audit-model')); }
    Object.entries(extra).forEach(([k, v]) => p.set(k, v));
    return p.toString();
}

function switchAuditTab(tab) {
    auditState.tab = tab === 'login' ? 'login' : 'data';
    auditState.page = 1;
    auditState.filtersLoaded = false;
    auditState.openId = null;
    const on = 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-teal-800 shadow-xs';
    const off = 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-slate-600 hover:text-slate-900';
    const tData = document.getElementById('audit-tab-data');
    const tLogin = document.getElementById('audit-tab-login');
    if (tData) tData.className = auditState.tab === 'data' ? on : off;
    if (tLogin) tLogin.className = auditState.tab === 'login' ? on : off;
    ['audit-f-actor', 'audit-f-model'].forEach(id => document.getElementById(id)?.classList.toggle('hidden', auditState.tab !== 'data'));
    const label = document.getElementById('audit-kind-label');
    if (label) label.innerText = auditState.tab === 'data' ? 'Hành động' : 'Sự kiện';
    const q = document.getElementById('audit-q');
    if (q) q.placeholder = auditState.tab === 'data' ? 'Số phiếu, tên đối tượng, tài khoản...' : 'Tài khoản, địa chỉ IP...';
    ['audit-q', 'audit-actor', 'audit-model', 'audit-kind', 'audit-from', 'audit-to'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    fetchAuditPage(true);
}

function applyAuditFilters() {
    auditState.page = 1;
    fetchAuditPage(false);
}

function resetAuditFilters() {
    ['audit-q', 'audit-actor', 'audit-model', 'audit-kind', 'audit-from', 'audit-to'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    applyAuditFilters();
}

function goAuditPage(delta) {
    const pages = Math.max(1, Math.ceil(auditState.count / auditState.pageSize));
    const next = auditState.page + delta;
    if (next < 1 || next > pages) return;
    auditState.page = next;
    fetchAuditPage(false);
}

function fillAuditSelect(id, options, allLabel) {
    const el = document.getElementById(id);
    if (!el) return;
    const cur = el.value;
    el.innerHTML = `<option value="">${allLabel}</option>` + options.map(o => `<option value="${escapeHtml(o.key)}">${escapeHtml(o.label)}</option>`).join('');
    el.value = cur;
}

async function fetchAuditPage(withFilters) {
    const tbody = document.getElementById('audit-tbody');
    const thead = document.getElementById('audit-thead');
    if (!tbody || !thead) return;
    const isData = auditState.tab === 'data';
    thead.innerHTML = isData
        ? '<tr><th class="px-4 py-3 w-40">Thời gian</th><th class="px-4 py-3">Người thực hiện</th><th class="px-4 py-3">Hành động</th><th class="px-4 py-3">Loại phiếu</th><th class="px-4 py-3">Đối tượng</th><th class="px-4 py-3">Nội dung</th></tr>'
        : '<tr><th class="px-4 py-3 w-40">Thời gian</th><th class="px-4 py-3">Tài khoản</th><th class="px-4 py-3">Sự kiện</th><th class="px-4 py-3">Địa chỉ IP</th><th class="px-4 py-3">Thiết bị / trình duyệt</th></tr>';
    tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-400"><i class="ph ph-spinner animate-spin text-2xl text-teal-600 block mb-2"></i>Đang tải nhật ký...</td></tr>`;
    const needFilters = withFilters || !auditState.filtersLoaded;
    const url = (isData ? '/api/audit/logs/' : '/api/audit/logins/') + '?' + auditQuery({ page: auditState.page, page_size: auditState.pageSize, ...(needFilters ? { with_filters: 1 } : {}) });
    try {
        const res = await fetchWithAuth(url);
        if (res.status === 403) throw new Error('Bạn không có quyền xem Nhật ký hoạt động. Liên hệ Ban Giám Đốc để được cấp quyền.');
        if (!res.ok) throw new Error(`Máy chủ phản hồi lỗi ${res.status}`);
        const data = await res.json();
        if (data.filters) {
            auditState.filtersLoaded = true;
            if (isData) {
                fillAuditSelect('audit-actor', data.filters.actors || [], 'Tất cả');
                fillAuditSelect('audit-model', data.filters.models || [], 'Tất cả');
            }
            fillAuditSelect('audit-kind', data.filters.kinds || [], 'Tất cả');
        }
        auditState.rows = data.results || [];
        auditState.count = data.count || 0;
        renderAuditRows();
    } catch (err) {
        console.error('Lỗi tải nhật ký:', err);
        tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-rose-600 font-bold"><i class="ph-bold ph-warning-circle text-2xl block mb-2"></i>${escapeHtml(err.message || 'Không thể kết nối máy chủ.')}</td></tr>`;
    }
}

function renderAuditRows() {
    const tbody = document.getElementById('audit-tbody');
    const isData = auditState.tab === 'data';
    const rows = auditState.rows;
    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-400">Không có bản ghi nào khớp bộ lọc.</td></tr>';
    } else if (isData) {
        tbody.innerHTML = rows.map(r => {
            const who = r.actor_name && r.actor_name !== r.actor ? `${escapeHtml(r.actor_name)} <span class="text-slate-400">(${escapeHtml(r.actor)})</span>` : escapeHtml(r.actor);
            const open = auditState.openId === r.id;
            const detail = open ? `<tr class="bg-slate-50"><td colspan="6" class="px-4 py-3">${auditDetailHtml(r)}</td></tr>` : '';
            return `<tr class="hover:bg-slate-50 cursor-pointer align-top" onclick="toggleAuditRow(${r.id})">
                <td class="px-4 py-3 whitespace-nowrap text-slate-600">${escapeHtml(r.when)}</td>
                <td class="px-4 py-3 font-bold text-slate-800">${who}${r.ip ? `<div class="text-[11px] font-normal text-slate-400">${escapeHtml(r.ip)}</div>` : ''}</td>
                <td class="px-4 py-3 font-bold whitespace-nowrap ${AUDIT_KIND_CLASS[r.kind] || 'text-slate-700'}">${escapeHtml(r.kind_label)}</td>
                <td class="px-4 py-3 text-slate-700">${escapeHtml(r.model_name)}</td>
                <td class="px-4 py-3 font-bold text-slate-800">${escapeHtml(r.object_repr || ('#' + r.object_id))}</td>
                <td class="px-4 py-3 text-slate-600">${escapeHtml(r.summary)}</td>
            </tr>${detail}`;
        }).join('');
    } else {
        tbody.innerHTML = rows.map(r => {
            const who = r.name && r.name !== r.username ? `${escapeHtml(r.name)} <span class="text-slate-400">(${escapeHtml(r.username)})</span>` : escapeHtml(r.username || '—');
            return `<tr class="align-top">
                <td class="px-4 py-3 whitespace-nowrap text-slate-600">${escapeHtml(r.when)}</td>
                <td class="px-4 py-3 font-bold text-slate-800">${who}</td>
                <td class="px-4 py-3 font-bold ${AUDIT_KIND_CLASS[r.kind] || 'text-slate-700'}">${escapeHtml(r.kind_label)}${r.new_device ? ' <span class="font-bold text-amber-700">- thiết bị mới</span>' : ''}</td>
                <td class="px-4 py-3 text-slate-600">${escapeHtml(r.ip || '—')}</td>
                <td class="px-4 py-3 text-slate-500 text-xs break-all">${escapeHtml(r.user_agent || '—')}</td>
            </tr>`;
        }).join('');
    }
    const pages = Math.max(1, Math.ceil(auditState.count / auditState.pageSize));
    const from = auditState.count ? (auditState.page - 1) * auditState.pageSize + 1 : 0;
    const to = Math.min(auditState.page * auditState.pageSize, auditState.count);
    const sum = document.getElementById('audit-summary');
    if (sum) sum.innerText = `Hiển thị ${from}–${to} trên ${auditState.count} bản ghi (mới nhất ở trên)`;
    const lbl = document.getElementById('audit-page-label');
    if (lbl) lbl.innerText = `${auditState.page} / ${pages}`;
    const prev = document.getElementById('audit-prev');
    const next = document.getElementById('audit-next');
    if (prev) prev.disabled = auditState.page <= 1;
    if (next) next.disabled = auditState.page >= pages;
}

function auditDetailHtml(r) {
    const changes = r.changes || [];
    if (!changes.length) return '<span class="text-slate-500 text-xs">Không có chi tiết thay đổi.</span>';
    const head = r.kind === 'create' ? 'Giá trị ban đầu' : 'Trước';
    const body = changes.map(c => `<tr class="border-t border-slate-200">
        <td class="py-1.5 pr-4 font-bold text-slate-700 whitespace-nowrap">${escapeHtml(c.label)}</td>
        <td class="py-1.5 pr-4 text-rose-700 break-all">${r.kind === 'create' ? '—' : escapeHtml(c.old)}</td>
        <td class="py-1.5 text-emerald-700 break-all">${escapeHtml(c.new)}</td></tr>`).join('');
    return `<table class="text-xs w-full max-w-3xl"><thead><tr class="text-slate-500 uppercase text-[10px]"><th class="text-left pb-1 pr-4">Trường</th><th class="text-left pb-1 pr-4">${head}</th><th class="text-left pb-1">Sau</th></tr></thead><tbody>${body}</tbody></table>`;
}

function toggleAuditRow(id) {
    auditState.openId = auditState.openId === id ? null : id;
    renderAuditRows();
}

async function exportAuditLog() {
    const url = (auditState.tab === 'data' ? '/api/audit/logs/' : '/api/audit/logins/') + '?' + auditQuery({ export: 'csv' });
    try {
        const res = await fetchWithAuth(url);
        if (res.status === 403) { showToast('danger', 'Bạn không có quyền xuất Nhật ký hoạt động.'); return; }
        if (!res.ok) throw new Error(`Lỗi ${res.status}`);
        const blob = await res.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `nhat-ky-${auditState.tab === 'data' ? 'hoat-dong' : 'dang-nhap'}-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('success', 'Đã xuất nhật ký (tối đa 5.000 dòng mới nhất theo bộ lọc).');
    } catch (err) {
        showToast('danger', 'Không xuất được nhật ký: ' + (err.message || 'lỗi kết nối'));
    }
}
