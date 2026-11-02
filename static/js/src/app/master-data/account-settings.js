// ==============================================================================
// CÀI ĐẶT · TÀI CHÍNH & QUẢN TRỊ · CÀI ĐẶT TÀI KHOẢN
// Một bảng duy nhất: Số hiệu | Tên tài khoản | Cấp | Nghiệp vụ | Kích hoạt.
//  - Cột Nghiệp vụ: các nghiệp vụ tự động hạch toán vào tài khoản đó (thêm/bớt được nhiều nghiệp vụ).
//  - Tài khoản không dùng thì tắt kích hoạt: ẩn khỏi danh sách và không hiện nút cài đặt nghiệp vụ.
// Dữ liệu từ /api/ledger/mapping/. Lưu sẽ hạch toán lại toàn bộ bút toán tự động.
// ==============================================================================
let accountSettingsData = null;
const acctState = { overrides: {}, active: new Set(), showInactive: false, search: '' };

const ACCT_GROUP_TITLE = {
    '1': 'Loại 1 - Tài sản ngắn hạn', '2': 'Loại 2 - Tài sản dài hạn', '3': 'Loại 3 - Nợ phải trả', '4': 'Loại 4 - Vốn chủ sở hữu',
    '5': 'Loại 5 - Doanh thu', '6': 'Loại 6 - Chi phí sản xuất, kinh doanh', '7': 'Loại 7 - Thu nhập khác', '8': 'Loại 8 - Chi phí khác',
    '9': 'Loại 9 - Xác định kết quả kinh doanh'
};

function _acctEsc(s) {
    return (typeof escapeHtml === 'function') ? escapeHtml(s == null ? '' : String(s)) : String(s == null ? '' : s);
}

function _acctCanEdit() {
    return typeof mdCan !== 'function' || mdCan('account_settings', 'edit');
}

function _acctEffective(item) {
    return acctState.overrides[item.key] || item.default;
}

// Tài khoản không được tắt: đang gán nghiệp vụ, đã có bút toán (server báo) và tài khoản cha của chúng
function _acctLocked() {
    const d = accountSettingsData;
    const valid = new Set((d.chart || []).map(a => a.code));
    const locked = new Set();
    const add = (code) => { for (let i = 3; i <= code.length; i++) if (valid.has(code.slice(0, i))) locked.add(code.slice(0, i)); };
    d.items.forEach(i => add(_acctEffective(i)));
    (d.locked || []).forEach(add);   // tài khoản đã có bút toán (không phụ thuộc cài đặt đang sửa)
    return locked;
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
        loadAccountState(await res.json());
        paintAccountSettings(box);
    } catch (err) {
        console.error('Lỗi tải cài đặt tài khoản:', err);
        box.innerHTML = `<div class="p-10 text-center text-rose-600 font-bold">${_acctEsc(err.message || 'Không kết nối được máy chủ')}
            <div><button type="button" onclick="renderAccountSettingsPage()" class="mt-3 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold">Thử lại</button></div></div>`;
    }
}

function loadAccountState(data) {
    accountSettingsData = data;
    acctState.overrides = {};
    data.items.forEach(i => { if (i.override) acctState.overrides[i.key] = i.override; });
    acctState.active = new Set(data.active || []);
}

function paintAccountSettings(box) {
    box = box || document.getElementById('md-account-settings-view');
    const d = accountSettingsData;
    if (!box || !d) return;
    const canEdit = _acctCanEdit();
    const regimeSel = `<select id="acct-regime-select" onchange="previewAccountRegime(this.value)" ${d.can_change_regime ? '' : 'disabled title="Chỉ Ban Giám Đốc / quản trị được đổi"'}
        class="h-9 px-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700">
        ${(d.regimes || []).map(r => `<option value="${r}" ${r === d.regime ? 'selected' : ''}>${_acctEsc((d.regime_labels || {})[r] || r)}</option>`).join('')}
        </select>`;
    box.innerHTML = `
        <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div class="px-4 py-3 border-b border-slate-100">
                <h3 class="text-sm md:text-base font-black font-heading text-slate-800">Cài đặt tài khoản kế toán</h3>
                <p class="text-xs text-slate-500 font-medium mt-0.5">Danh mục theo TT99/2025/TT-BTC (doanh nghiệp) hoặc TT58/2026/TT-BTC (siêu nhỏ, rút gọn). Mỗi nghiệp vụ tự động hạch toán vào tài khoản gắn ở cột Nghiệp vụ; tài khoản không dùng thì tắt kích hoạt. Chỉ đổi khi kế toán trưởng yêu cầu.</p>
            </div>
            <div class="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center gap-2 bg-slate-50/60">
                ${regimeSel}
                <input id="acct-chart-search" type="search" value="${_acctEsc(acctState.search)}" oninput="onAccountSearch(this.value)" placeholder="Tìm số hiệu, tên tài khoản hoặc nghiệp vụ..."
                    class="h-9 px-3 border border-slate-200 rounded-xl text-xs font-semibold flex-1 min-w-[200px]">
                <label class="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
                    <input type="checkbox" ${acctState.showInactive ? 'checked' : ''} onchange="toggleShowInactiveAccounts(this.checked)"> Hiện tài khoản chưa kích hoạt</label>
                <span id="acct-counts" class="text-xs font-bold ${d.preview ? 'text-amber-700' : 'text-slate-500'}"></span>
                ${canEdit ? `<button type="button" onclick="resetAccountSettings()" class="h-9 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold whitespace-nowrap">Về mặc định</button>
                <button type="button" onclick="saveAccountSettings()" id="acct-settings-save" class="h-9 px-3.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5"><i class="ph-bold ph-floppy-disk"></i><span>Lưu cài đặt</span></button>` : ''}
            </div>
            <div class="overflow-x-auto"><table class="w-full text-xs text-left" id="acct-chart-table" data-no-col-manager data-no-toolbar>
                <thead class="bg-slate-50 text-slate-700 font-bold"><tr>
                    <th class="px-3 py-2 w-36">Số hiệu</th><th class="px-3 py-2">Tên tài khoản</th><th class="px-3 py-2 w-20">Cấp</th>
                    <th class="px-3 py-2 min-w-[260px]">Nghiệp vụ</th><th class="px-3 py-2 w-24 text-center">Kích hoạt</th></tr></thead>
                <tbody id="acct-chart-body"></tbody>
            </table></div>
        </div>`;
    paintAccountRows();
}

function paintAccountRows() {
    const d = accountSettingsData;
    const body = document.getElementById('acct-chart-body');
    if (!d || !body) return;
    const canEdit = _acctCanEdit();
    const locked = _acctLocked();
    const q = acctState.search.trim().toLowerCase();
    const itemsAt = {};
    d.items.forEach(i => { (itemsAt[_acctEffective(i)] = itemsAt[_acctEffective(i)] || []).push(i); });

    const rows = [];
    let lastGroup = '';
    (d.chart || []).forEach(a => {
        const isActive = acctState.active.has(a.code);
        const biz = itemsAt[a.code] || [];
        if (!isActive && !acctState.showInactive) return;
        if (q && !(`${a.code} ${a.name} ${biz.map(b => b.label).join(' ')}`.toLowerCase().includes(q))) return;
        const g = a.code[0];
        if (g !== lastGroup) {
            lastGroup = g;
            rows.push(`<tr class="bg-slate-100"><td colspan="5" class="px-3 py-1.5 font-black text-slate-700">${_acctEsc(ACCT_GROUP_TITLE[g] || ('Loại ' + g))}</td></tr>`);
        }
        const lvl = a.code.length;
        const chips = biz.map(b => {
            const moved = b.default !== a.code;
            return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold ${moved ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-teal-50 border-teal-200 text-teal-800'}"
                title="${moved ? 'Đã chuyển về đây, mặc định là TK ' + _acctEsc(b.default) : 'Nghiệp vụ mặc định của tài khoản này'}">${_acctEsc(b.label)}${
                moved && canEdit ? `<button type="button" onclick="removeAccountBiz('${_acctEsc(b.key)}')" class="hover:text-rose-600" title="Trả về tài khoản mặc định ${_acctEsc(b.default)}"><i class="ph-bold ph-x text-[10px]"></i></button>` : ''}</span>`;
        }).join(' ');
        const addBtn = (isActive && canEdit) ? `<button type="button" onclick="startAddAccountBiz('${_acctEsc(a.code)}', this)" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-dashed border-slate-300 text-[11px] font-bold text-slate-500 hover:border-teal-500 hover:text-teal-700" title="Gắn thêm nghiệp vụ vào tài khoản này"><i class="ph-bold ph-plus text-[10px]"></i> Nghiệp vụ</button>` : '';
        const canToggle = canEdit && !locked.has(a.code);
        const toggle = `<label class="inline-flex items-center ${canToggle ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}" title="${canToggle ? (isActive ? 'Tắt nếu không dùng' : 'Bật để sử dụng') : 'Đang được dùng (gắn nghiệp vụ hoặc đã có bút toán) nên không tắt được'}">
            <input type="checkbox" class="sr-only peer" ${isActive ? 'checked' : ''} ${canToggle ? '' : 'disabled'} onchange="toggleAccountActive('${_acctEsc(a.code)}', this.checked)">
            <span class="w-9 h-5 rounded-full bg-slate-300 peer-checked:bg-teal-600 relative transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4"></span></label>`;
        rows.push(`<tr class="border-b border-slate-100 ${isActive ? '' : 'opacity-50 bg-slate-50'}">
            <td class="px-3 py-1.5 font-mono ${lvl === 3 ? 'font-black text-slate-900' : 'text-slate-600'}" style="padding-left:${0.75 + (lvl - 3) * 0.9}rem">${_acctEsc(a.code)}</td>
            <td class="px-3 py-1.5 ${lvl === 3 ? 'font-bold text-slate-900' : 'text-slate-700'} whitespace-normal">${_acctEsc(a.name)}</td>
            <td class="px-3 py-1.5 text-slate-400">${lvl === 3 ? 'Cấp 1' : (lvl === 4 ? 'Cấp 2' : 'Cấp 3+')}</td>
            <td class="px-3 py-1.5"><div class="flex flex-wrap items-center gap-1" data-acct-biz="${_acctEsc(a.code)}">${chips}${addBtn}</div></td>
            <td class="px-3 py-1.5 text-center">${toggle}</td></tr>`);
    });
    body.innerHTML = rows.join('') || '<tr><td colspan="5" class="p-8 text-center text-slate-400 font-medium">Không có tài khoản nào khớp</td></tr>';
    const counts = document.getElementById('acct-counts');
    if (counts) counts.textContent = d.preview
        ? `Đang xem thử ${d.regime} - chưa áp dụng, bấm Lưu để chuyển`
        : `${acctState.active.size}/${(d.chart || []).length} tài khoản kích hoạt`;
}

function onAccountSearch(v) {
    acctState.search = v || '';
    paintAccountRows();
}

function toggleShowInactiveAccounts(on) {
    acctState.showInactive = !!on;
    paintAccountRows();
}

function toggleAccountActive(code, on) {
    const d = accountSettingsData;
    const valid = (d.chart || []).map(a => a.code);
    if (on) {
        for (let i = 3; i <= code.length; i++) if (valid.includes(code.slice(0, i))) acctState.active.add(code.slice(0, i));  // bật cả tài khoản cha
    } else {
        const locked = _acctLocked();
        const kids = valid.filter(c => c.startsWith(code));
        const blocked = kids.find(c => locked.has(c));
        if (blocked) {
            showToast('warning', `Không tắt được: tài khoản ${blocked} đang được dùng`, 'Cài đặt tài khoản');
        } else {
            kids.forEach(c => acctState.active.delete(c));  // tắt cả các tài khoản con
        }
    }
    paintAccountRows();
}

function removeAccountBiz(key) {
    delete acctState.overrides[key];
    paintAccountRows();
}

// Mở ô chọn nghiệp vụ để gắn vào tài khoản (nghiệp vụ đang ở tài khoản khác sẽ được chuyển sang đây)
function startAddAccountBiz(code, btn) {
    const d = accountSettingsData;
    const options = d.items.filter(i => _acctEffective(i) !== code)
        .map(i => `<option value="${_acctEsc(i.key)}">${_acctEsc(i.label)} (đang ở TK ${_acctEsc(_acctEffective(i))})</option>`).join('');
    if (!options) { showToast('info', 'Mọi nghiệp vụ đã nằm ở tài khoản này', 'Cài đặt tài khoản'); return; }
    const sel = document.createElement('select');
    sel.className = 'h-7 px-1.5 rounded-lg border border-teal-400 bg-white text-[11px] font-bold text-slate-700 max-w-[260px]';
    sel.innerHTML = `<option value="">-- Chọn nghiệp vụ --</option>${options}`;
    sel.onchange = () => {
        if (!sel.value) return;
        const item = d.items.find(i => i.key === sel.value);
        if (item.default === code) delete acctState.overrides[item.key]; else acctState.overrides[item.key] = code;
        paintAccountRows();
    };
    sel.onblur = () => paintAccountRows();
    btn.replaceWith(sel);
    sel.focus();
}

function previewAccountRegime(regime) {
    // Xem thử danh mục và ánh xạ của chế độ được chọn (chưa lưu)
    acctState.search = '';
    renderAccountSettingsPage(document.getElementById('md-account-settings-view'), regime);
}

function resetAccountSettings() {
    // Về mặc định: ánh xạ nghiệp vụ và danh sách tài khoản kích hoạt (bấm Lưu mới áp dụng)
    if (!accountSettingsData) return;
    acctState.overrides = {};
    acctState.active = new Set(accountSettingsData.default_active || []);
    paintAccountRows();
}

async function saveAccountSettings() {
    const d = accountSettingsData;
    const regimeEl = document.getElementById('acct-regime-select');
    const regime = regimeEl ? regimeEl.value : undefined;
    const msg = regime && regime !== d.current_regime
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
            body: JSON.stringify({ regime, overrides: acctState.overrides, active_accounts: Array.from(acctState.active), rebuild: true }),
        });
        const data = await res.json();
        if (!res.ok) {
            const err = data.regime || (data.overrides && Object.values(data.overrides)[0]) || data.active_accounts || data.detail || 'Không lưu được';
            showToast('danger', String(err), 'Cài đặt tài khoản');
            return;
        }
        loadAccountState(data);
        if (typeof ledgerAccounts !== 'undefined') ledgerAccounts = null;  // Sổ sách nạp lại hệ thống tài khoản mới
        paintAccountSettings();
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
window.onAccountSearch = onAccountSearch;
window.toggleShowInactiveAccounts = toggleShowInactiveAccounts;
window.toggleAccountActive = toggleAccountActive;
window.removeAccountBiz = removeAccountBiz;
window.startAddAccountBiz = startAddAccountBiz;
window.resetAccountSettings = resetAccountSettings;
window.saveAccountSettings = saveAccountSettings;
