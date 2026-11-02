// ==============================================================================
// CÀI ĐẶT · TÀI CHÍNH & QUẢN TRỊ · CÀI ĐẶT TÀI KHOẢN (trước đây là "Ánh xạ tài khoản" trong Sổ sách kế toán)
// Mỗi nghiệp vụ tự động hạch toán vào tài khoản được chọn; đổi ở đây sẽ hạch toán lại toàn bộ bút toán tự động.
// Dữ liệu từ /api/ledger/mapping/
// ==============================================================================
let accountSettingsData = null;

function _acctEsc(s) {
    return (typeof escapeHtml === 'function') ? escapeHtml(s == null ? '' : String(s)) : String(s == null ? '' : s);
}

async function renderAccountSettingsPage(container, previewRegime) {
    const box = container || document.getElementById('md-account-settings-view');
    if (!box) return;
    box.innerHTML = `<div class="p-10 text-center text-slate-400 font-medium"><i class="ph ph-spinner animate-spin text-2xl text-teal-600 block mb-2"></i>Đang tải cài đặt tài khoản…</div>`;
    try {
        const res = await fetchWithAuth('/api/ledger/mapping/' + (previewRegime ? `?regime=${encodeURIComponent(previewRegime)}` : ''));
        if (res.status === 403) {
            box.innerHTML = '<div class="p-10 text-center text-slate-500 font-semibold">Chỉ Kế toán và Ban Giám Đốc được xem cài đặt tài khoản</div>';
            return;
        }
        if (!res.ok) throw new Error('Không tải được cài đặt tài khoản');
        accountSettingsData = await res.json();
        paintAccountSettings(box);
    } catch (err) {
        console.error('Lỗi tải cài đặt tài khoản:', err);
        box.innerHTML = `<div class="p-10 text-center text-rose-600 font-bold">${_acctEsc(err.message || 'Không kết nối được máy chủ')}
            <div><button type="button" onclick="renderAccountSettingsPage()" class="mt-3 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold">Thử lại</button></div></div>`;
    }
}

function paintAccountSettings(box) {
    const d = accountSettingsData;
    if (!d) return;
    const canEdit = typeof mdCan !== 'function' || mdCan('account_settings', 'edit');
    const names = Object.fromEntries((d.accounts || []).map(a => [a.code, a.name]));
    const options = (sel) => (d.accounts || []).map(a =>
        `<option value="${_acctEsc(a.code)}" ${a.code === sel ? 'selected' : ''}>${_acctEsc(a.code)}</option>`).join('');
    const regimeSel = `<select id="acct-regime-select" onchange="previewAccountRegime(this.value)" ${d.can_change_regime ? '' : 'disabled title="Chỉ Ban Giám Đốc / quản trị được đổi"'}
        class="h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700">
        ${(d.regimes || []).map(r => `<option value="${r}" ${r === d.regime ? 'selected' : ''}>${_acctEsc((d.regime_labels || {})[r] || r)}</option>`).join('')}
        </select>`;
    const changed = d.items.filter(i => i.override).length;
    const rows = d.items.map(i => `<tr class="${i.override ? 'bg-amber-50/50' : ''} border-b border-slate-100">
        <td class="px-3 py-2 font-semibold text-slate-800">${_acctEsc(i.label)}</td>
        <td class="px-3 py-2 font-mono text-slate-500">${_acctEsc(i.default)}</td>
        <td class="px-3 py-2"><select data-acct-key="${_acctEsc(i.key)}" ${canEdit ? '' : 'disabled'} onchange="onAccountSettingChange(this)"
            class="h-8 px-2 rounded-lg border ${i.override ? 'border-amber-400' : 'border-slate-200'} bg-white text-xs font-bold font-mono text-slate-800">${options(i.effective)}</select></td>
        <td class="px-3 py-2 text-slate-500 whitespace-normal" data-acct-name="${_acctEsc(i.key)}">${_acctEsc(names[i.effective] || i.effective_name)}</td>
    </tr>`).join('');

    box.innerHTML = `
        <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div class="px-4 py-3 border-b border-slate-100 flex flex-wrap items-baseline justify-between gap-2">
                <div>
                    <h3 class="text-sm md:text-base font-black font-heading text-slate-800">Cài đặt tài khoản kế toán</h3>
                    <p class="text-xs text-slate-500 font-medium mt-0.5">Danh mục tài khoản theo TT99/2025/TT-BTC (doanh nghiệp) hoặc TT58/2026/TT-BTC (siêu nhỏ, danh mục rút gọn). Mỗi nghiệp vụ tự động hạch toán vào tài khoản bên dưới. Chỉ đổi khi kế toán trưởng yêu cầu.</p>
                </div>
                <p class="text-xs font-bold ${d.preview ? 'text-amber-700' : 'text-slate-600'}">${d.preview ? `Đang xem thử ${_acctEsc(d.regime)} - chưa áp dụng, bấm Lưu để chuyển` : (changed ? `${changed} nghiệp vụ đã đổi so với mặc định` : 'Đang dùng mặc định')}</p>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-xs text-left whitespace-nowrap" id="acct-settings-table" data-no-col-manager data-no-toolbar>
                    <thead class="bg-slate-50 text-slate-700 font-bold"><tr>
                        <th class="px-3 py-2">Nghiệp vụ</th><th class="px-3 py-2">Mặc định</th><th class="px-3 py-2">Tài khoản áp dụng</th><th class="px-3 py-2">Tên tài khoản</th></tr></thead>
                    <tbody>
                        <tr class="bg-slate-50 border-b border-slate-100"><td class="px-3 py-2 font-bold text-slate-700">Chế độ kế toán</td><td class="px-3 py-2" colspan="3">${regimeSel}</td></tr>
                        ${rows}
                    </tbody>
                </table>
            </div>
            ${canEdit ? `<div class="px-4 py-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/60">
                <p class="text-xs text-slate-500 font-medium">Lưu sẽ hạch toán lại toàn bộ bút toán tự động theo cài đặt mới. Chứng từ gốc không thay đổi.</p>
                <div class="flex items-center gap-2">
                    <button type="button" onclick="resetAccountSettings()" class="h-9 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold whitespace-nowrap">Về mặc định</button>
                    <button type="button" onclick="saveAccountSettings()" id="acct-settings-save" class="h-9 px-3.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5"><i class="ph-bold ph-floppy-disk"></i><span>Lưu cài đặt</span></button>
                </div>
            </div>` : ''}
        </div>
        ${chartSectionHtml(d)}`;
    filterAccountChart();
}

const ACCT_GROUP_TITLE = {
    '1': 'Loại 1 - Tài sản ngắn hạn', '2': 'Loại 2 - Tài sản dài hạn', '3': 'Loại 3 - Nợ phải trả', '4': 'Loại 4 - Vốn chủ sở hữu',
    '5': 'Loại 5 - Doanh thu', '6': 'Loại 6 - Chi phí sản xuất, kinh doanh', '7': 'Loại 7 - Thu nhập khác', '8': 'Loại 8 - Chi phí khác',
    '9': 'Loại 9 - Xác định kết quả kinh doanh'
};

function chartSectionHtml(d) {
    const chart = d.chart || [];
    const groups = {};
    chart.forEach(a => { (groups[a.code[0]] = groups[a.code[0]] || []).push(a); });
    const body = Object.keys(groups).sort().map(g => `
        <tbody data-acct-group="${g}">
            <tr class="bg-slate-100"><td colspan="3" class="px-3 py-1.5 font-black text-slate-700">${_acctEsc(ACCT_GROUP_TITLE[g] || ('Loại ' + g))} <span class="font-semibold text-slate-400">(${groups[g].length} tài khoản)</span></td></tr>
            ${groups[g].map(a => `<tr data-acct-row="${_acctEsc((a.code + ' ' + a.name).toLowerCase())}" class="border-b border-slate-100">
                <td class="px-3 py-1.5 font-mono ${a.code.length === 3 ? 'font-black text-slate-900' : 'text-slate-600'}" style="padding-left:${0.75 + (a.code.length - 3) * 0.9}rem">${_acctEsc(a.code)}</td>
                <td class="px-3 py-1.5 ${a.code.length === 3 ? 'font-bold text-slate-900' : 'text-slate-700'} whitespace-normal">${_acctEsc(a.name)}</td>
                <td class="px-3 py-1.5 text-slate-400">${a.code.length === 3 ? 'Cấp 1' : (a.code.length === 4 ? 'Cấp 2' : 'Cấp 3+')}</td></tr>`).join('')}
        </tbody>`).join('');
    return `<div class="mt-4 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div><h3 class="text-sm md:text-base font-black font-heading text-slate-800">Danh mục hệ thống tài khoản (${chart.length} tài khoản, loại 1 đến loại 9)</h3>
                <p class="text-xs text-slate-500 font-medium mt-0.5">Hạch toán chọn trong danh mục này. Chế độ đang xem: <strong>${_acctEsc(d.regime)}</strong>${d.preview ? ' (xem thử)' : ''}.</p></div>
            <input id="acct-chart-search" type="search" oninput="filterAccountChart()" placeholder="Tìm số hiệu hoặc tên tài khoản..."
                class="h-9 px-3 border border-slate-200 rounded-xl text-xs font-semibold w-full sm:w-72">
        </div>
        <div class="overflow-x-auto"><table class="w-full text-xs text-left" id="acct-chart-table" data-no-col-manager data-no-toolbar>
            <thead class="bg-slate-50 text-slate-700 font-bold"><tr><th class="px-3 py-2 w-40">Số hiệu</th><th class="px-3 py-2">Tên tài khoản</th><th class="px-3 py-2 w-24">Cấp</th></tr></thead>
            ${body}
        </table></div></div>`;
}

function filterAccountChart() {
    const q = (document.getElementById('acct-chart-search')?.value || '').trim().toLowerCase();
    document.querySelectorAll('#acct-chart-table tbody[data-acct-group]').forEach(tb => {
        let shown = 0;
        tb.querySelectorAll('tr[data-acct-row]').forEach(tr => {
            const ok = !q || tr.getAttribute('data-acct-row').includes(q);
            tr.style.display = ok ? '' : 'none';
            if (ok) shown++;
        });
        tb.style.display = shown ? '' : 'none';
    });
}

function previewAccountRegime(regime) {
    // Xem thử danh mục và ánh xạ của chế độ được chọn (chưa lưu)
    renderAccountSettingsPage(document.getElementById('md-account-settings-view'), regime);
}

function onAccountSettingChange(sel) {
    const names = Object.fromEntries(((accountSettingsData || {}).accounts || []).map(a => [a.code, a.name]));
    const cell = document.querySelector(`[data-acct-name="${sel.dataset.acctKey}"]`);
    if (cell) cell.textContent = names[sel.value] || '';
    const item = (accountSettingsData.items || []).find(i => i.key === sel.dataset.acctKey);
    const isOverride = item && sel.value !== item.default;
    sel.classList.toggle('border-amber-400', !!isOverride);
    sel.classList.toggle('border-slate-200', !isOverride);
    sel.closest('tr').classList.toggle('bg-amber-50/50', !!isOverride);
}

function resetAccountSettings() {
    if (!accountSettingsData) return;
    document.querySelectorAll('#acct-settings-table select[data-acct-key]').forEach(sel => {
        const item = accountSettingsData.items.find(i => i.key === sel.dataset.acctKey);
        if (item) { sel.value = item.default; onAccountSettingChange(sel); }
    });
}

async function saveAccountSettings() {
    const overrides = {};
    document.querySelectorAll('#acct-settings-table select[data-acct-key]').forEach(sel => {
        overrides[sel.dataset.acctKey] = sel.value;
    });
    const regimeEl = document.getElementById('acct-regime-select');
    const regime = regimeEl ? regimeEl.value : undefined;
    const msg = regime && regime !== accountSettingsData.current_regime
        ? `Đổi chế độ kế toán sang ${regime} và hạch toán lại toàn bộ bút toán tự động?`
        : 'Lưu cài đặt tài khoản và hạch toán lại toàn bộ bút toán tự động?';
    const ok = await showConfirmModal({ title: 'Lưu cài đặt tài khoản', message: msg, type: 'warning', confirmText: 'Lưu và hạch toán lại' });
    if (!ok) return;
    const btn = document.getElementById('acct-settings-save');
    if (btn) btn.disabled = true;
    try {
        const res = await fetchWithAuth('/api/ledger/mapping/', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ regime, overrides, rebuild: true }),
        });
        const data = await res.json();
        if (!res.ok) {
            const err = data.regime || (data.overrides && Object.values(data.overrides)[0]) || data.detail || 'Không lưu được';
            showToast('danger', String(err), 'Cài đặt tài khoản');
            return;
        }
        accountSettingsData = data;
        if (typeof ledgerAccounts !== 'undefined') ledgerAccounts = null;  // Sổ sách nạp lại hệ thống tài khoản mới
        paintAccountSettings(document.getElementById('md-account-settings-view'));
        showToast('success', `Đã lưu và hạch toán lại ${data.rebuilt || 0} bút toán`, 'Cài đặt tài khoản');
    } catch (err) {
        console.error('Lỗi lưu cài đặt tài khoản:', err);
        showToast('danger', 'Không kết nối được máy chủ', 'Cài đặt tài khoản');
    } finally {
        if (btn) btn.disabled = false;
    }
}

window.renderAccountSettingsPage = renderAccountSettingsPage;
window.previewAccountRegime = previewAccountRegime;
window.filterAccountChart = filterAccountChart;
window.onAccountSettingChange = onAccountSettingChange;
window.resetAccountSettings = resetAccountSettings;
window.saveAccountSettings = saveAccountSettings;
