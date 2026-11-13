// =========================================================================
// 10.1 PHÂN HỆ TẠM ỨNG & HOÀN ỨNG (DISPATCHER FUND & DRIVER ADVANCES)
// =========================================================================

let currentAccountingSubTab = 'acct-cashbook';

// Nhóm tab Kế toán: thanh nhóm ở trên, chỉ hiện các tab con của nhóm đang chọn
const ACCT_GROUPS = {
    cash: ['acct-cashbook', 'acct-driver-advances', 'acct-dispatcher-funds', 'acct-reimbursables'],
    settle: ['acct-settlements', 'acct-customer-settlements', 'acct-subcontractors', 'acct-vouchers'],
    books: ['acct-ledger', 'acct-bot-audit'],
};
const ACCT_GROUP_OF = Object.fromEntries(Object.entries(ACCT_GROUPS).flatMap(([g, tabs]) => tabs.map(t => [t, g])));
const ACCT_BTN_COLOR = { 'acct-cashbook': 'emerald', 'acct-driver-advances': 'amber', 'acct-dispatcher-funds': 'indigo', 'acct-settlements': 'teal',
    'acct-customer-settlements': 'teal', 'acct-reimbursables': 'sky', 'acct-subcontractors': 'rose', 'acct-vouchers': 'teal', 'acct-bot-audit': 'emerald', 'acct-ledger': 'indigo' };

function applyAccountingGroup(group) {
    document.querySelectorAll('[data-acct-subtab]').forEach(btn => {
        btn.style.display = ACCT_GROUP_OF[btn.dataset.acctSubtab] === group ? '' : 'none';
    });
    document.querySelectorAll('[data-acct-group-btn]').forEach(btn => {
        const on = btn.dataset.acctGroupBtn === group;
        btn.classList.toggle('bg-white', on);
        btn.classList.toggle('shadow-2xs', on);
        btn.classList.toggle('text-slate-900', on);
        btn.classList.toggle('text-slate-500', !on);
    });
    const batch = document.getElementById('btn-acct-batch-settle');
    if (batch) batch.classList.toggle('hidden', group !== 'settle');
}

function switchAccountingGroup(group) {
    const tabs = ACCT_GROUPS[group] || [];
    const visible = tabs.find(t => {
        const btn = document.querySelector(`[data-acct-subtab="${t}"]`);
        return btn && !btn.classList.contains('hidden');   // bỏ qua tab bị ẩn do phân quyền
    });
    if (visible) switchAccountingSubTab(visible);
}
let accountingAdvancesData = null;
let rawDriverAdvancesList = [];
let rawDispatcherFundsList = [];

function switchAccountingSubTab(subtabId) {
    currentAccountingSubTab = subtabId;

    // Ẩn tất cả subtab contents
    document.querySelectorAll('.acct-subtab-content').forEach(el => el.classList.add('hidden'));

    // Đưa tất cả buttons về trạng thái Inactive chuẩn (h-10, border-2, border-transparent)
    document.querySelectorAll('.acct-subtab-btn').forEach(btn => {
        btn.className = 'acct-subtab-btn h-10 px-3.5 rounded-xl text-xs md:text-sm font-bold font-heading flex items-center justify-center space-x-1.5 transition-all cursor-pointer border-2 border-transparent bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-200 box-border whitespace-nowrap';
        const icon = btn.querySelector('i');
        if (icon) icon.className = icon.className.replace(/text-[a-z]+-[0-9]+/g, 'text-slate-500');
        const badge = btn.querySelector('span[id^="badge-"]');
        if (badge) badge.className = 'px-2 py-0.5 rounded-full text-[11px] font-black tabular-nums transition-all border bg-slate-100 text-slate-600 border-slate-200';
    });

    // Mở subtab được chọn
    const targetContent = document.getElementById(`subtab-${subtabId}`);
    if (targetContent) targetContent.classList.remove('hidden');

    const activeBtn = document.querySelector(`[data-acct-subtab="${subtabId}"]`);
    const brandColor = ACCT_BTN_COLOR[subtabId] || 'emerald';
    applyAccountingGroup(ACCT_GROUP_OF[subtabId] || 'cash');
    if (activeBtn) {
        activeBtn.className = `acct-subtab-btn active h-10 px-3.5 rounded-xl text-xs md:text-sm font-bold font-heading flex items-center justify-center space-x-1.5 transition-all cursor-pointer border-2 border-${brandColor}-600 bg-${brandColor}-50/70 text-${brandColor}-900 shadow-2xs box-border whitespace-nowrap`;
        const icon = activeBtn.querySelector('i');
        if (icon) icon.className = icon.className.replace(/text-slate-500/g, `text-${brandColor}-600`);
        const badge = activeBtn.querySelector('span[id^="badge-"]');
        if (badge) badge.className = `px-2 py-0.5 rounded-full text-[11px] font-black tabular-nums transition-all border bg-${brandColor}-100 text-${brandColor}-800 border-${brandColor}-200`;
    }

    if (subtabId === 'acct-cashbook') {
        loadCashBookData();
    } else if (subtabId === 'acct-driver-advances' || subtabId === 'acct-dispatcher-funds') {
        loadAccountingAdvancesData();
    } else if (subtabId === 'acct-settlements') {
        loadAccountingData();
    } else if (subtabId === 'acct-customer-settlements') {
        loadCustomerSettlementsData();
    } else if (subtabId === 'acct-reimbursables') {
        loadReimbursablesData();
    } else if (subtabId === 'acct-subcontractors') {
        loadSubcontractorData();
    } else if (subtabId === 'acct-bot-audit') {
        loadBotAuditData();
    } else if (subtabId === 'acct-vouchers') {
        loadVoucherTab();
    } else if (subtabId === 'acct-ledger') {
        loadLedgerData();
    } else {
        loadCashBookData();
    }
}

async function loadAccountingAdvancesData() {
    try {
        const res = await fetchWithAuth('/api/accounting/advances/');
        if (!res.ok) {
            if (res.status === 403) {
                console.warn('[Kế Toán] Tài khoản không thuộc phân quyền quản trị Tạm ứng quỹ.');
                return;
            }
            throw new Error('Không thể tải dữ liệu tạm ứng hoàn ứng (HTTP ' + res.status + ')');
        }
        const data = await res.json();
        accountingAdvancesData = data;

        // Render KPI cards Tạm ứng tài xế
        if (data.stats) {
            const st = data.stats;
            const elAdvTotal = document.getElementById('acct-adv-stat-total');
            if (elAdvTotal) elAdvTotal.innerText = formatMoneyVND(st.total_driver_advance_amount);

            const elAdvSpent = document.getElementById('acct-adv-stat-spent');
            if (elAdvSpent) elAdvSpent.innerText = formatMoneyVND(st.total_driver_actual_spent);

            const elAdvRefund = document.getElementById('acct-adv-stat-refund');
            if (elAdvRefund) elAdvRefund.innerText = formatMoneyVND(st.total_refund_due);

            const elAdvReimburse = document.getElementById('acct-adv-stat-reimburse');
            if (elAdvReimburse) elAdvReimburse.innerText = formatMoneyVND(st.total_reimburse_due);

            const elAdvCount = document.getElementById('acct-adv-stat-pending-count');
            if (elAdvCount) elAdvCount.innerText = `${st.pending_advances_count} phiếu đang lưu hành`;

            // KPI cards Quỹ điều vận
            const elFundTotal = document.getElementById('acct-fund-stat-total');
            if (elFundTotal) elFundTotal.innerText = formatMoneyVND(st.total_dispatcher_funds);

            const elFundDisbursed = document.getElementById('acct-fund-stat-disbursed');
            if (elFundDisbursed) elFundDisbursed.innerText = formatMoneyVND(st.total_fund_disbursed);

            const elFundSettled = document.getElementById('acct-fund-stat-settled');
            if (elFundSettled) elFundSettled.innerText = formatMoneyVND(st.total_fund_settled);

            const elFundRem = document.getElementById('acct-fund-stat-remaining');
            if (elFundRem) elFundRem.innerText = formatMoneyVND(st.total_fund_remaining);
        }

        // Render bảng Tạm ứng tài xế
        rawDriverAdvancesList = data.driver_advances || [];
        populateDriverAdvanceFilterDropdowns(data.drivers || []);
        applyDriverAdvancesFilter();

        // Render bảng Quỹ điều vận
        rawDispatcherFundsList = data.dispatcher_funds || [];
        applyDispatcherFundsFilter();

        // Nạp options cho các modal
        if (typeof populateAdvanceModalOptions === 'function') {
            populateAdvanceModalOptions(data);
        }

    } catch (err) {
        console.error('Lỗi khi nạp dữ liệu tạm ứng:', err);
        showToast('danger', 'Không thể kết nối máy chủ để tải dữ liệu tạm ứng', 'Lỗi Kế Toán');
    }
}

// -------------------------------------------------------------
// RENDER & FILTER BẢNG TẠM ỨNG CHUYẾN CHO TÀI XẾ
// -------------------------------------------------------------
function populateDriverAdvanceFilterDropdowns(drivers) {
    const drvSelect = document.getElementById('filter-adv-driver');
    if (!drvSelect) return;
    const cur = drvSelect.value;
    drvSelect.innerHTML = '<option value="">-- Tất cả Tài xế --</option>' +
        drivers.map(d => `<option value="${escapeHtml(d.name)}">${escapeHtml(d.name)}</option>`).join('');
    if (cur) drvSelect.value = cur;
}

function applyDriverAdvancesFilter() {
    const drvFilter = document.getElementById('filter-adv-driver')?.value || '';
    const statusFilter = document.getElementById('filter-adv-status')?.value || 'ALL';
    const sourceFilter = document.getElementById('filter-adv-source')?.value || 'ALL';
    const searchVal = (document.getElementById('filter-adv-search')?.value || '').toLowerCase().trim();

    let list = rawDriverAdvancesList.filter(item => {
        if (drvFilter && item.driver_name !== drvFilter) return false;
        if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
        if (sourceFilter !== 'ALL' && item.advance_source !== sourceFilter) return false;

        if (searchVal) {
            const combined = [
                item.code,
                item.trip_code,
                item.customer_name,
                item.driver_name,
                item.license_plate,
                item.purpose
            ].filter(Boolean).join(' ').toLowerCase();
            if (!combined.includes(searchVal)) return false;
        }
        return true;
    });

    renderDriverAdvancesTable(list);
}

function renderDriverAdvancesTable(list) {
    const tbody = document.getElementById('acct-adv-tbody');
    if (!tbody) return;

    if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" class="p-8 text-center text-slate-400 font-medium">Không tìm thấy phiếu tạm ứng chuyến nào phù hợp</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map((item, index) => {
        const isSettled = item.status === 'SETTLED';
        const statusText = isSettled
            ? `<span class="text-xs font-bold text-emerald-700 whitespace-nowrap">Đã Hoàn Ứng</span>`
            : `<span class="text-xs font-bold text-amber-600 whitespace-nowrap">Đang Tạm Ứng</span>`;

        let diffText = '';
        if (isSettled) {
            if (item.settlement_diff_type === 'DRIVER_REFUND') {
                diffText = `<span class="text-xs font-bold text-blue-700 font-mono tabular-nums whitespace-nowrap" title="Tài xế đã hoàn trả tiền thừa">TX Hoàn +${formatMoneyVND(item.refund_amount)}</span>`;
            } else if (item.settlement_diff_type === 'COMPANY_REIMBURSE') {
                diffText = `<span class="text-xs font-bold text-rose-600 font-mono tabular-nums whitespace-nowrap" title="Công ty chi bù thêm">Cty Bù -${formatMoneyVND(item.reimburse_amount)}</span>`;
            } else {
                diffText = `<span class="text-xs font-bold text-emerald-700 whitespace-nowrap">Khớp Đúng 100%</span>`;
            }
        } else {
            const diff = item.difference || 0;
            if (diff > 0) {
                diffText = `<span class="text-xs font-bold text-blue-700 font-mono tabular-nums whitespace-nowrap" title="Dự kiến hoàn trả cty">+${formatMoneyVND(diff)} (Dư)</span>`;
            } else if (diff < 0) {
                diffText = `<span class="text-xs font-bold text-rose-600 font-mono tabular-nums whitespace-nowrap" title="Dự kiến cty chi bù">${formatMoneyVND(diff)} (Thiếu)</span>`;
            } else {
                diffText = `<span class="text-xs text-slate-500 font-medium whitespace-nowrap">Khớp tạm tính</span>`;
            }
        }

        const sourceBadge = item.advance_source === 'DISPATCHER_FUND'
            ? `<span class="text-xs text-indigo-700 font-semibold flex items-center gap-1"><i class="ph-bold ph-wallet"></i> ${escapeHtml(item.fund_code)}</span>`
            : `<span class="text-xs text-slate-600 font-medium">Cty trực tiếp</span>`;

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="w-12 text-center select-none font-bold text-slate-500 border-r border-slate-200 font-mono text-xs tabular-nums">
                    ${index + 1}
                </td>
                <td class="font-black text-slate-900 font-mono text-xs whitespace-nowrap">${escapeHtml(formatCodeCompact(item.code))}</td>
                <td class="whitespace-nowrap">
                    <a href="javascript:void(0)" onclick="viewTripDetail('${item.trip_code}')" class="font-mono text-teal-700 hover:underline font-bold text-xs">${escapeHtml(formatCodeCompact(item.trip_code))}</a>
                </td>
                <td class="text-[11px] text-slate-600 font-medium whitespace-nowrap text-center">${escapeHtml(item.advance_date || '-')}</td>
                <td class="text-xs font-semibold text-slate-800 max-w-[170px] truncate" title="${escapeHtml(item.customer_name)}">${escapeHtml(item.customer_name)}</td>
                <td class="text-xs text-slate-800">
                    <p class="font-bold">${escapeHtml(item.driver_name)}</p>
                    <p class="font-mono text-slate-400">${escapeHtml(item.license_plate)}</p>
                </td>
                <td class="text-right font-black text-teal-800 text-xs tabular-nums">${formatMoneyVND(item.amount)}</td>
                <td>${sourceBadge}</td>
                <td class="text-right font-semibold text-slate-800 text-xs tabular-nums">${formatMoneyVND(item.actual_spent)}</td>
                <td class="text-center">${diffText}</td>
                <td class="text-center">${statusText}</td>
                <td class="text-center cell-actions">
                    <div class="flex items-center justify-center gap-1.5">
                        <!-- 1. Quyết toán -->
                        ${!isSettled ? `
                            <button type="button" onclick="openSettleAdvanceModal(${item.id})"
                                class="h-7 px-2.5 text-[11px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-2xs inline-flex items-center gap-1 cursor-pointer shrink-0"
                                title="Đối soát chi phí thực tế & quyết toán hoàn ứng chuyến xe">
                                <i class="ph-bold ph-check-circle text-xs"></i>
                                <span>Quyết Toán</span>
                            </button>
                        ` : `
                            <button type="button" onclick="openSettleAdvanceModal(${item.id})"
                                class="h-7 px-2.5 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 inline-flex items-center gap-1 cursor-pointer shrink-0"
                                title="Đã hoàn ứng quyết toán (bấm xem lại)">
                                <i class="ph-bold ph-check text-xs text-emerald-600"></i>
                                <span>Đã Xong</span>
                            </button>
                        `}
                        <!-- 2. Xem -->
                        <button type="button" onclick="viewDriverAdvanceDetail(${item.id})"
                            class="h-7 px-2.5 text-[11px] font-bold text-teal-800 hover:text-teal-950 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors border border-teal-200 inline-flex items-center gap-1 cursor-pointer shrink-0"
                            title="Xem chi tiết, Sửa & Quản lý phiếu tạm ứng">
                            <i class="ph-bold ph-eye text-xs"></i>
                            <span>Xem</span>
                        </button>
                        <!-- 3. In -->
                        <button type="button" onclick="printDriverAdvanceVoucher(${item.id})"
                            class="h-7 px-2.5 text-[11px] font-bold text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-50 rounded-lg transition-colors border border-slate-200 shadow-2xs inline-flex items-center gap-1 cursor-pointer shrink-0"
                            title="In phiếu chi tạm ứng chuyến xe khổ A4/A5">
                            <i class="ph-bold ph-printer text-xs text-slate-500"></i>
                            <span>In</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    if (window.BimTableFooter && Array.isArray(list)) {
        const totalAdvAmount = list.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
        const totalActualSpent = list.reduce((sum, i) => sum + (Number(i.actual_spent) || 0), 0);
        const totalDiff = totalAdvAmount - totalActualSpent;
        window.BimTableFooter.render('accounting-advances-table', {
            cells: [
                { text: 'TỔNG', align: 'center', class: 'font-black text-slate-900 font-heading' },
                { html: `${list.length} phiếu tạm ứng chuyến`, colspan: 5 },
                { html: `<span class="text-teal-800 font-bold tabular-nums font-mono">${formatMoneyVND(totalAdvAmount)}</span>`, align: 'right' },
                { text: '' },
                { html: `<span class="text-slate-800 font-bold tabular-nums font-mono">${formatMoneyVND(totalActualSpent)}</span>`, align: 'right' },
                { html: `<span class="${totalDiff >= 0 ? 'text-blue-700' : 'text-rose-700'} font-bold tabular-nums font-mono">${totalDiff >= 0 ? '+' : ''}${formatMoneyVND(totalDiff)}</span>`, align: 'center' },
                { text: '', align: 'center', colspan: 2 }
            ]
        });
    }
}

// -------------------------------------------------------------
// RENDER & FILTER BẢNG QUỸ ĐIỀU VẬN (COMPANY ➔ DISPATCHER)
// -------------------------------------------------------------
function applyDispatcherFundsFilter() {
    const q = (document.getElementById('fund-search')?.value || '').toLowerCase().trim();
    const statusFilter = document.getElementById('filter-fund-status')?.value || 'ALL';

    const filtered = (rawDispatcherFundsList || []).filter(item => {
        if (statusFilter === 'ACTIVE') {
            if (item.status !== 'APPROVED' && item.status !== 'ACTIVE') return false;
        } else if (statusFilter === 'SETTLED') {
            if (item.status !== 'SETTLED') return false;
        } else if (statusFilter === 'PENDING') {
            if (item.status !== 'PENDING') return false;
        }

        if (q) {
            const text = [item.code, item.dispatcher_name, item.purpose, item.status, item.status_label, item.approved_by, item.notes].filter(Boolean).join(' ').toLowerCase();
            if (!text.includes(q)) return false;
        }
        return true;
    });

    renderDispatcherFundsTable(filtered);
}

function renderDispatcherFundsTable(list) {
    const tbody = document.getElementById('acct-fund-tbody');
    if (!tbody) return;

    if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" class="p-8 text-center text-slate-400 font-medium">Chưa có phiếu Quỹ tạm ứng điều vận nào</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map((item, index) => {
        let statusBadge = '';
        if (item.status === 'APPROVED' || item.status === 'ACTIVE') {
            statusBadge = `<span class="text-xs font-bold text-emerald-700 flex items-center justify-center gap-1"><i class="ph-bold ph-check-circle text-xs"></i> Đang Lưu Hành</span>`;
        } else if (item.status === 'PENDING') {
            statusBadge = `<span class="text-xs font-bold text-amber-600 flex items-center justify-center gap-1"><i class="ph-bold ph-clock text-xs"></i> Chờ Cty Duyệt</span>`;
        } else if (item.status === 'SETTLED') {
            statusBadge = `<span class="text-xs font-bold text-slate-600 flex items-center justify-center gap-1"><i class="ph-bold ph-lock-key text-xs"></i> Đã Hoàn Ứng</span>`;
        } else {
            statusBadge = `<span class="text-xs font-bold text-rose-600 flex items-center justify-center gap-1"><i class="ph-bold ph-x-circle text-xs"></i> Từ Chối</span>`;
        }

        let settleBtn = '';
        if (item.status === 'PENDING') {
            settleBtn = `
                <button type="button" onclick="approveDispatcherFund(${item.id})"
                    class="h-7 px-2.5 text-[11px] font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-2xs inline-flex items-center gap-1 cursor-pointer shrink-0"
                    title="Kế toán duyệt xuất quỹ điều vận">
                    <i class="ph-bold ph-check-circle text-xs"></i>
                    <span>Duyệt Quỹ</span>
                </button>
            `;
        } else if (item.status === 'APPROVED' || item.status === 'ACTIVE') {
            settleBtn = `
                <button type="button" onclick="settleDispatcherFund(${item.id})"
                    class="h-7 px-2.5 text-[11px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-2xs inline-flex items-center gap-1 cursor-pointer shrink-0"
                    title="Quyết toán hoàn tất quỹ về công ty">
                    <i class="ph-bold ph-check-circle text-xs"></i>
                    <span>Quyết Toán</span>
                </button>
            `;
        } else if (item.status === 'SETTLED') {
            settleBtn = `
                <button type="button" onclick="viewDispatcherFundDetail(${item.id})"
                    class="h-7 px-2.5 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 inline-flex items-center gap-1 cursor-pointer shrink-0"
                    title="Đã hoàn ứng quyết toán xong (bấm xem lại)">
                    <i class="ph-bold ph-check text-xs text-emerald-600"></i>
                    <span>Đã Xong</span>
                </button>
            `;
        } else {
            settleBtn = `
                <button type="button" onclick="confirmDeleteDispatcherFund(${item.id})"
                    class="h-7 px-2.5 text-[11px] font-bold text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 rounded-lg transition-colors border border-rose-200 inline-flex items-center gap-1 cursor-pointer shrink-0"
                    title="Xóa quỹ bị từ chối">
                    <i class="ph-bold ph-trash text-xs"></i>
                    <span>Xóa</span>
                </button>
            `;
        }

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="w-12 text-center select-none font-bold text-slate-500 border-r border-slate-200 font-mono text-xs tabular-nums">
                    ${index + 1}
                </td>
                <td class="font-black text-slate-900 font-mono text-xs">${escapeHtml(item.code)}</td>
                <td class="text-xs font-bold text-indigo-900">${escapeHtml(item.dispatcher_name)}</td>
                <td class="text-xs text-slate-600 tabular-nums text-center">${item.advance_date}</td>
                <td class="text-right font-black text-slate-900 text-xs tabular-nums">${formatMoneyVND(item.amount)}</td>
                <td class="text-right font-semibold text-amber-700 text-xs tabular-nums">${formatMoneyVND(item.disbursed_amount)}</td>
                <td class="text-right font-semibold text-emerald-700 text-xs tabular-nums">${formatMoneyVND(item.settled_amount)}</td>
                <td class="text-right font-black text-teal-800 text-xs tabular-nums">${formatMoneyVND(item.remaining_balance)}</td>
                <td class="text-center">${statusBadge}</td>
                <td class="text-xs text-slate-500">${escapeHtml(item.approved_by || '-')}</td>
                <td class="text-center cell-actions whitespace-nowrap">
                    <div class="flex items-center justify-center gap-1.5">
                        <!-- 1. Quyết toán -->
                        ${settleBtn}
                        <!-- 2. Xem -->
                        <button type="button" onclick="viewDispatcherFundDetail(${item.id})"
                            class="h-7 px-2.5 text-[11px] font-bold text-teal-800 hover:text-teal-950 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors border border-teal-200 inline-flex items-center gap-1 cursor-pointer shrink-0"
                            title="Xem chi tiết & quản lý quỹ điều vận">
                            <i class="ph-bold ph-eye text-xs"></i>
                            <span>Xem</span>
                        </button>
                        <!-- 3. In -->
                        <button type="button" onclick="printDispatcherFundVoucher(${item.id})"
                            class="h-7 px-2.5 text-[11px] font-bold text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-50 rounded-lg transition-colors border border-slate-200 shadow-2xs inline-flex items-center gap-1 cursor-pointer shrink-0"
                            title="In phiếu cấp quỹ điều vận khổ A4">
                            <i class="ph-bold ph-printer text-xs text-slate-500"></i>
                            <span>In</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    if (window.BimTableFooter && Array.isArray(list)) {
        const totalAmount = list.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
        const totalDisbursed = list.reduce((sum, i) => sum + (Number(i.disbursed_amount) || 0), 0);
        const totalSettled = list.reduce((sum, i) => sum + (Number(i.settled_amount) || 0), 0);
        const totalBalance = list.reduce((sum, i) => sum + (Number(i.remaining_balance) || 0), 0);
        window.BimTableFooter.render('accounting-fund-table', {
            cells: [
                { text: 'TỔNG', align: 'center', class: 'font-black text-slate-900 font-heading' },
                { html: `${list.length} quỹ điều vận`, colspan: 3 },
                { html: `<span class="text-slate-900 font-bold tabular-nums font-mono">${formatMoneyVND(totalAmount)}</span>`, align: 'right' },
                { html: `<span class="text-amber-700 font-bold tabular-nums font-mono">${formatMoneyVND(totalDisbursed)}</span>`, align: 'right' },
                { html: `<span class="text-emerald-700 font-bold tabular-nums font-mono">${formatMoneyVND(totalSettled)}</span>`, align: 'right' },
                { html: `<span class="text-teal-800 font-bold tabular-nums font-mono">${formatMoneyVND(totalBalance)}</span>`, align: 'right' },
                { text: '', align: 'center', colspan: 3 }
            ]
        });
    }

    if (window.BimTableColumnManager && typeof window.BimTableColumnManager.register === 'function') {
        window.BimTableColumnManager.register('accounting-fund-table');
    }
}

function populateAdvanceModalOptions(data) {
    if (!data) return;
    // Dropdown Chuyến xe
    const tripSelect = document.getElementById('adv-inp-trip');
    if (tripSelect && data.available_trips) {
        tripSelect.innerHTML = '<option value="">-- Chọn chuyến xe cần cấp tạm ứng --</option>' +
            data.available_trips.map(t => `<option value="${t.id}" data-driver="${t.driver_id || ''}" data-driver-name="${escapeHtml(t.driver_name)}" data-plate="${escapeHtml(t.license_plate)}" data-route="${escapeHtml(t.route)}">[${t.trip_code}] ${escapeHtml(t.customer_name)} (${escapeHtml(t.license_plate)})</option>`).join('');
    }

    // Dropdown Tài xế
    const driverSelect = document.getElementById('adv-inp-driver');
    if (driverSelect && data.drivers) {
        driverSelect.innerHTML = '<option value="">-- Chọn tài xế nhận tạm ứng --</option>' +
            data.drivers.map(d => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('');
    }

    // Dropdown Quỹ điều vận khả dụng
    const fundSelect = document.getElementById('adv-inp-fund');
    if (fundSelect && data.active_funds) {
        fundSelect.innerHTML = '<option value="">-- Chọn Quỹ Điều Vận khả dụng --</option>' +
            data.active_funds.map(f => `<option value="${f.id}" data-balance="${f.remaining_balance}">${escapeHtml(f.code)} - ${escapeHtml(f.dispatcher_name)} (Còn: ${formatMoneyVND(f.remaining_balance)})</option>`).join('');
    }

    // Dropdown Điều phối viên nhận quỹ
    const dispSelect = document.getElementById('fund-inp-dispatcher');
    if (dispSelect && data.dispatchers) {
        dispSelect.innerHTML = '<option value="">-- Chọn nhân viên điều phối nhận quỹ --</option>' +
            data.dispatchers.map(dp => `<option value="${dp.id}">${escapeHtml(dp.name)}</option>`).join('');
    }
}
window.openDispatcherFundModal = openDispatcherFundModal;
window.closeDispatcherFundModal = closeDispatcherFundModal;
window.submitDispatcherFundForm = submitDispatcherFundForm;

// -------------------------------------------------------------
// MODAL TẠO QUỸ TẠM ỨNG ĐIỀU VẬN (COMPANY ➔ DISPATCHER)
// -------------------------------------------------------------
function openDispatcherFundModal() {
    const modal = document.getElementById('modal-dispatcher-fund');
    if (!modal) return;
    modal.classList.remove('hidden');

    const dateInp = document.getElementById('fund-inp-date');
    if (dateInp) dateInp.value = new Date().toISOString().slice(0, 10);

    const amountInp = document.getElementById('fund-inp-amount');
    if (amountInp) amountInp.value = '20.000.000';
}

function closeDispatcherFundModal() {
    const modal = document.getElementById('modal-dispatcher-fund');
    if (modal) modal.classList.add('hidden');
}

async function submitDispatcherFundForm(e) {
    e.preventDefault();
    const dispatcherId = document.getElementById('fund-inp-dispatcher')?.value;
    const amountStr = document.getElementById('fund-inp-amount')?.value;
    const advanceDate = document.getElementById('fund-inp-date')?.value;
    const purpose = document.getElementById('fund-inp-purpose')?.value;
    const notes = document.getElementById('fund-inp-notes')?.value;

    try {
        const res = await fetchWithAuth('/api/accounting/dispatcher-funds/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                dispatcher_id: dispatcherId,
                amount: amountStr,
                advance_date: advanceDate,
                purpose: purpose,
                notes: notes
            })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message, 'Tạo Quỹ Điều Vận Thành Công');
            closeDispatcherFundModal();
            loadAccountingAdvancesData();
        } else {
            showToast('danger', data.error || 'Không thể tạo phiếu tạm ứng quỹ');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

async function approveDispatcherFund(fundId) {
    const confirmed = await showConfirmModal({
        title: 'Duyệt Xuất Quỹ Điều Vận',
        message: 'Xác nhận Kế toán / Ban Giám Đốc DUYỆT XUẤT QUỸ tạm ứng này cho bộ phận Điều vận?\n\nHệ thống sẽ chuyển trạng thái Quỹ sang ĐÃ DUYỆT (APPROVED).',
        confirmText: 'Duyệt Xuất Quỹ',
        cancelText: 'Huỷ bỏ',
        type: 'success',
        icon: 'ph-bold ph-seal-check text-2xl'
    });
    if (!confirmed) return;
    try {
        const res = await fetchWithAuth(`/api/accounting/dispatcher-funds/${fundId}/action/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'approve' })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message, 'Duyệt Quỹ Thành Công');
            loadAccountingAdvancesData();
        } else {
            showToast('danger', data.error || 'Có lỗi xảy ra');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

async function settleDispatcherFund(fundId) {
    const notes = prompt('Nhập ghi chú quyết toán quỹ điều vận về công ty (vd: Kế toán đã thu đủ chứng từ & số dư hoàn quỹ):');
    if (notes === null) return;

    try {
        const res = await fetchWithAuth(`/api/accounting/dispatcher-funds/${fundId}/action/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'settle', notes: notes })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message, 'Quyết Toán Quỹ Thành Công');
            loadAccountingAdvancesData();
        } else {
            showToast('danger', data.error || 'Có lỗi xảy ra');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}
