// ==============================================================================
// 9.9. SUBTAB 9: SỔ SÁCH KẾ TOÁN — cân đối tài khoản, nhật ký chung, sổ cái (ánh xạ tài khoản nay nằm ở Cài đặt > Tài chính & Quản trị > Cài đặt tài khoản)
// Dữ liệu từ /api/ledger/* (sổ kép tự động theo TT133/TT200 của công ty)
// ==============================================================================
let ledgerView = 'trial';
let ledgerAccounts = null;

const LEDGER_TITLES = {
    trial: 'Bảng cân đối tài khoản',
    journal: 'Sổ nhật ký chung',
    account: 'Sổ cái',
};

function _ledgerNum(n) {
    const v = Number(n || 0);
    return v ? new Intl.NumberFormat('vi-VN').format(Math.round(v)) : '';
}

function _ledgerEsc(s) {
    return (typeof escapeHtml === 'function') ? escapeHtml(s == null ? '' : String(s)) : String(s == null ? '' : s);
}

function _ledgerDate(d) {
    if (!d) return '';
    const p = String(d).slice(0, 10).split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d;
}

function _ledgerEmpty(view, text) {
    const cols = { trial: 8, journal: 7, account: 7 }[view];
    const tb = document.getElementById(`ledger-${view}-tbody`);
    if (tb) tb.innerHTML = `<tr><td colspan="${cols}" class="p-8 text-center text-slate-400 font-medium">${text}</td></tr>`;
    const tf = document.getElementById(`ledger-${view}-tfoot`);
    if (tf) tf.innerHTML = '';
}

function _ledgerPeriod() {
    const fromEl = document.getElementById('ledger-from');
    const toEl = document.getElementById('ledger-to');
    if (fromEl && !fromEl.value) {
        const now = new Date();
        const pad = (x) => String(x).padStart(2, '0');
        fromEl.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
        toEl.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    }
    return { from: fromEl ? fromEl.value : '', to: toEl ? toEl.value : '' };
}

function _ledgerUrl(view, extra = '') {
    const p = _ledgerPeriod();
    const q = `from=${encodeURIComponent(p.from)}&to=${encodeURIComponent(p.to)}${extra}`;
    if (view === 'trial') return `/api/ledger/trial-balance/?${q}`;
    if (view === 'journal') return `/api/ledger/journal/?${q}`;
    const code = (document.getElementById('ledger-account-select') || {}).value || '111';
    return `/api/ledger/accounts/${encodeURIComponent(code)}/ledger/?${q}`;
}

function _ledgerSetHeader(subtitle, summary) {
    const t = document.getElementById('ledger-title');
    if (t) t.textContent = ledgerView === 'account'
        ? `Sổ cái tài khoản ${(document.getElementById('ledger-account-select') || {}).value || ''}`
        : LEDGER_TITLES[ledgerView];
    const s = document.getElementById('ledger-subtitle');
    if (s) s.textContent = subtitle || '';
    const m = document.getElementById('ledger-summary');
    if (m) m.textContent = summary || '';
}

async function loadLedgerData() {
    if (!ledgerAccounts) {
        try {
            const res = await fetchWithAuth('/api/ledger/accounts/');
            if (res.status === 403) {
                ['trial', 'journal', 'account'].forEach(v => _ledgerEmpty(v, 'Chỉ Kế toán và Ban Giám Đốc được xem sổ sách kế toán'));
                return;
            }
            const data = await res.json();
            ledgerAccounts = data.accounts || [];
            const chip = document.getElementById('ledger-regime-chip');
            if (chip) chip.textContent = data.regime === 'TT200' ? 'TT200/2014' : 'TT133/2016';
            const sel = document.getElementById('ledger-account-select');
            if (sel) {
                sel.innerHTML = ledgerAccounts.map(a =>
                    `<option value="${_ledgerEsc(a.code)}">${_ledgerEsc(a.code)} – ${_ledgerEsc(a.name)}</option>`).join('');
                sel.value = '111';
            }
        } catch (err) {
            console.error('Lỗi tải hệ thống tài khoản:', err);
        }
    }
    switchLedgerView(ledgerView);
}

function switchLedgerView(view) {
    ledgerView = view;
    document.querySelectorAll('.ledger-view-btn').forEach(btn => {
        const on = btn.dataset.ledgerView === view;
        btn.classList.toggle('border-indigo-600', on);
        btn.classList.toggle('bg-indigo-50', on);
        btn.classList.toggle('text-indigo-900', on);
        btn.classList.toggle('border-transparent', !on);
        btn.classList.toggle('text-slate-600', !on);
    });
    document.querySelectorAll('.ledger-panel').forEach(p => p.classList.toggle('hidden', p.dataset.ledgerPanel !== view));
    const sel = document.getElementById('ledger-account-select');
    if (sel) sel.classList.toggle('hidden', view !== 'account');
    loadLedgerView();
}

async function loadLedgerView() {
    const view = ledgerView;
    _ledgerSetHeader('', '');
    try {
        const res = await fetchWithAuth(_ledgerUrl(view));
        if (!res.ok) {
            let msg = 'Không tải được sổ';
            try { msg = (await res.json()).detail || msg; } catch (e) { /* bỏ qua */ }
            _ledgerEmpty(view, _ledgerEsc(msg));
            return;
        }
        const data = await res.json();
        if (view !== ledgerView) return;
        if (view === 'trial') renderLedgerTrial(data);
        else if (view === 'journal') renderLedgerJournal(data);
        else renderLedgerAccount(data);
    } catch (err) {
        console.error('Lỗi tải sổ sách:', err);
        _ledgerEmpty(view, 'Không kết nối được máy chủ');
    }
}

function renderLedgerTrial(data) {
    const rows = (data.rows || []).filter(r =>
        r.opening_debit || r.opening_credit || r.period_debit || r.period_credit || r.closing_debit || r.closing_credit);
    _ledgerSetHeader(`Mẫu ${data.form || ''} · ${_ledgerDate(data.from)} – ${_ledgerDate(data.to)}`,
        `${rows.filter(r => r.level === 1).length} tài khoản có số liệu`);
    if (!rows.length) return _ledgerEmpty('trial', 'Chưa có số liệu trong kỳ');
    document.getElementById('ledger-trial-tbody').innerHTML = rows.map(r => {
        const sub = r.level !== 1;
        return `<tr class="${sub ? 'text-slate-500' : 'font-semibold text-slate-800'} cursor-pointer hover:bg-indigo-50/40" onclick="openLedgerAccount('${_ledgerEsc(r.code)}')" title="Xem sổ cái ${_ledgerEsc(r.code)}">
            <td class="font-mono ${sub ? 'pl-6' : ''}">${_ledgerEsc(r.code)}</td>
            <td class="whitespace-normal min-w-[220px]"><span class="md:hidden font-mono">${_ledgerEsc(r.code)} · </span>${_ledgerEsc(r.name)}</td>
            <td class="text-right tabular-nums">${_ledgerNum(r.opening_debit)}</td>
            <td class="text-right tabular-nums">${_ledgerNum(r.opening_credit)}</td>
            <td class="text-right tabular-nums">${_ledgerNum(r.period_debit)}</td>
            <td class="text-right tabular-nums">${_ledgerNum(r.period_credit)}</td>
            <td class="text-right tabular-nums">${_ledgerNum(r.closing_debit)}</td>
            <td class="text-right tabular-nums">${_ledgerNum(r.closing_credit)}</td>
        </tr>`;
    }).join('');
    const t = data.totals || {};
    document.getElementById('ledger-trial-tfoot').innerHTML = `<tr class="bg-slate-100 font-black text-slate-900">
        <td></td><td>Tổng cộng</td>
        <td class="text-right tabular-nums">${_ledgerNum(t.opening_debit)}</td>
        <td class="text-right tabular-nums">${_ledgerNum(t.opening_credit)}</td>
        <td class="text-right tabular-nums">${_ledgerNum(t.period_debit)}</td>
        <td class="text-right tabular-nums">${_ledgerNum(t.period_credit)}</td>
        <td class="text-right tabular-nums">${_ledgerNum(t.closing_debit)}</td>
        <td class="text-right tabular-nums">${_ledgerNum(t.closing_credit)}</td></tr>`;
}

function renderLedgerJournal(data) {
    const lines = data.lines || [];
    const sumD = lines.reduce((a, l) => a + Number(l.debit || 0), 0);
    const sumC = lines.reduce((a, l) => a + Number(l.credit || 0), 0);
    _ledgerSetHeader(`${_ledgerDate(data.from)} – ${_ledgerDate(data.to)}`, `${lines.length} dòng`);
    if (!lines.length) return _ledgerEmpty('journal', 'Chưa có bút toán trong kỳ');
    let prevRef = null;
    document.getElementById('ledger-journal-tbody').innerHTML = lines.map(l => {
        const first = l.ref !== prevRef;
        prevRef = l.ref;
        return `<tr class="${first ? 'border-t border-slate-200' : ''}">
            <td class="tabular-nums">${first ? _ledgerDate(l.date) : ''}</td>
            <td class="font-mono text-xs">${first ? _ledgerEsc(l.ref) : ''}</td>
            <td class="whitespace-normal min-w-[240px] text-slate-700">${_ledgerEsc(l.memo || l.description)}</td>
            <td class="font-mono font-bold">${_ledgerEsc(l.account)}</td>
            <td class="text-right tabular-nums">${_ledgerNum(l.debit)}</td>
            <td class="text-right tabular-nums">${_ledgerNum(l.credit)}</td>
            <td class="text-slate-500">${_ledgerEsc(l.partner)}</td>
        </tr>`;
    }).join('');
    document.getElementById('ledger-journal-tfoot').innerHTML = `<tr class="bg-slate-100 font-black text-slate-900">
        <td></td><td></td><td>Tổng phát sinh</td><td></td>
        <td class="text-right tabular-nums">${_ledgerNum(sumD)}</td>
        <td class="text-right tabular-nums">${_ledgerNum(sumC)}</td><td></td></tr>`;
}

function renderLedgerAccount(data) {
    const rows = data.rows || [];
    _ledgerSetHeader(`${_ledgerDate(data.from)} – ${_ledgerDate(data.to)}`,
        `Đầu kỳ ${_ledgerNum(data.opening) || 0} · Cuối kỳ ${_ledgerNum(data.closing) || 0}`);
    const opening = `<tr class="bg-slate-50 font-bold text-slate-700">
        <td></td><td></td><td>Số dư đầu kỳ</td><td></td>
        <td></td><td></td><td class="text-right tabular-nums">${_ledgerNum(data.opening) || 0}</td></tr>`;
    const body = rows.map(r => `<tr>
        <td class="tabular-nums">${_ledgerDate(r.date)}</td>
        <td class="font-mono text-xs">${_ledgerEsc(r.ref)}</td>
        <td class="whitespace-normal min-w-[240px] text-slate-700">${_ledgerEsc(r.description)}</td>
        <td class="font-mono">${_ledgerEsc(r.contra)}</td>
        <td class="text-right tabular-nums">${_ledgerNum(r.debit)}</td>
        <td class="text-right tabular-nums">${_ledgerNum(r.credit)}</td>
        <td class="text-right tabular-nums font-semibold">${_ledgerNum(r.balance) || 0}</td></tr>`).join('');
    document.getElementById('ledger-account-tbody').innerHTML = opening + (body ||
        `<tr><td colspan="7" class="p-6 text-center text-slate-400 font-medium">Không có phát sinh trong kỳ</td></tr>`);
    const sumD = rows.reduce((a, r) => a + Number(r.debit || 0), 0);
    const sumC = rows.reduce((a, r) => a + Number(r.credit || 0), 0);
    document.getElementById('ledger-account-tfoot').innerHTML = `<tr class="bg-slate-100 font-black text-slate-900">
        <td></td><td></td><td>Cộng phát sinh · Số dư cuối kỳ</td><td></td>
        <td class="text-right tabular-nums">${_ledgerNum(sumD)}</td>
        <td class="text-right tabular-nums">${_ledgerNum(sumC)}</td>
        <td class="text-right tabular-nums">${_ledgerNum(data.closing) || 0}</td></tr>`;
}

function openLedgerAccount(code) {
    const sel = document.getElementById('ledger-account-select');
    if (sel) {
        if (!Array.from(sel.options).some(o => o.value === code)) {
            sel.insertAdjacentHTML('beforeend', `<option value="${_ledgerEsc(code)}">${_ledgerEsc(code)}</option>`);
        }
        sel.value = code;
    }
    switchLedgerView('account');
}

async function exportLedgerExcel() {
    const btn = document.getElementById('ledger-export-btn');
    if (btn) btn.disabled = true;
    try {
        const res = await fetchWithAuth(_ledgerUrl(ledgerView, '&export=xlsx'));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        let filename = 'so-sach-ke-toan.xlsx';
        const disp = res.headers.get('Content-Disposition');
        const m = disp && disp.match(/filename="?([^";]+)"?/);
        if (m) filename = m[1];
        const url = URL.createObjectURL(await res.blob());
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        showToast('success', `Đã tải "${filename}"`, 'Xuất Excel');
    } catch (err) {
        console.error('Lỗi xuất sổ:', err);
        showToast('danger', 'Không xuất được file Excel', 'Xuất Excel');
    } finally {
        if (btn) btn.disabled = false;
    }
}
