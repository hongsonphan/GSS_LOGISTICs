// =========================================================================
// 10.1 PHÂN HỆ TẠM ỨNG & HOÀN ỨNG (DISPATCHER FUND & DRIVER ADVANCES)
// =========================================================================

let currentAccountingSubTab = 'acct-cashbook';
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

    // Active button tương ứng (Thứ tự: 1. Cashbook, 2. Driver Adv, 3. Dispatcher Fund, 4. Settlements, 5. Reimbursables, 6. Subcontractors, 7. BOT)
    let btnId = 'acct-tab-btn-1';
    let brandColor = 'emerald';
    if (subtabId === 'acct-driver-advances') { btnId = 'acct-tab-btn-2'; brandColor = 'amber'; }
    else if (subtabId === 'acct-dispatcher-funds') { btnId = 'acct-tab-btn-3'; brandColor = 'indigo'; }
    else if (subtabId === 'acct-settlements') { btnId = 'acct-tab-btn-4'; brandColor = 'teal'; }
    else if (subtabId === 'acct-customer-settlements') { btnId = 'acct-tab-btn-customer-settlements'; brandColor = 'teal'; }
    else if (subtabId === 'acct-reimbursables') { btnId = 'acct-tab-btn-5'; brandColor = 'sky'; }
    else if (subtabId === 'acct-subcontractors') { btnId = 'acct-tab-btn-6'; brandColor = 'rose'; }
    else if (subtabId === 'acct-bot-audit') { btnId = 'acct-tab-btn-7'; brandColor = 'emerald'; }

    const activeBtn = document.getElementById(btnId);
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

        // Cập nhật badges trên Subtab Bar
        const badgeAdv = document.getElementById('badge-acct-driver-advances');
        if (badgeAdv && data.stats) {
            badgeAdv.innerText = data.stats.pending_advances_count || 0;
        }

        const badgeFund = document.getElementById('badge-acct-dispatcher-funds');
        if (badgeFund && data.dispatcher_funds) {
            const activeCount = data.dispatcher_funds.filter(f => f.status === 'APPROVED').length;
            badgeFund.innerText = activeCount;
        }

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


// =============================================================================
// =============================================================================
// -------------------------------------------------------------
// BIM ACCOUNTING ADVANCE & SETTLEMENT CONTROLLERS
// -------------------------------------------------------------
let currentActiveAdvance = null;

function closeDriverAdvanceModal() {
    const modal = document.getElementById('modal-driver-advance');
    if (modal) modal.classList.add('hidden');
}

function onAdvanceTripChange() {
    const tripSelect = document.getElementById('adv-inp-trip');
    if (!tripSelect) return;
    const selectedOption = tripSelect.options[tripSelect.selectedIndex];
    if (!selectedOption || !selectedOption.value) {
        const info = document.getElementById('adv-trip-info');
        if (info) info.classList.add('hidden');
        return;
    }

    const driverId = selectedOption.getAttribute('data-driver');
    const plate = selectedOption.getAttribute('data-plate');
    const route = selectedOption.getAttribute('data-route');

    if (driverId) {
        const drvSelect = document.getElementById('adv-inp-driver');
        if (drvSelect) drvSelect.value = driverId;
    }

    const infoEl = document.getElementById('adv-trip-info');
    if (infoEl) {
        infoEl.innerHTML = `<i class="ph-bold ph-truck"></i> Xe: <strong>${escapeHtml(plate || '')}</strong> | Tuyến: ${escapeHtml(route || '')}`;
        infoEl.classList.remove('hidden');
    }
}

function toggleAdvanceSourceType() {
    const sourceVal = document.querySelector('input[name="adv_source"]:checked')?.value;
    const boxFund = document.getElementById('adv-box-dispatcher-fund');
    if (!boxFund) return;
    if (sourceVal === 'DISPATCHER_FUND') {
        boxFund.classList.remove('hidden');
    } else {
        boxFund.classList.add('hidden');
    }
}

async function submitDriverAdvanceForm(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const tripId = document.getElementById('adv-inp-trip')?.value;
    const driverId = document.getElementById('adv-inp-driver')?.value;
    const amountStr = document.getElementById('adv-inp-amount')?.value;
    const advanceDate = document.getElementById('adv-inp-date')?.value;
    const sourceVal = document.querySelector('input[name="adv_source"]:checked')?.value || 'DISPATCHER_FUND';
    const fundId = document.getElementById('adv-inp-fund')?.value;
    const purpose = document.getElementById('adv-inp-purpose')?.value;
    const notes = document.getElementById('adv-inp-notes')?.value;

    const payload = {
        trip_id: tripId,
        driver_id: driverId,
        amount: amountStr,
        advance_date: advanceDate,
        advance_source: sourceVal,
        dispatcher_fund_id: (sourceVal === 'DISPATCHER_FUND' && fundId) ? fundId : null,
        purpose: purpose,
        notes: notes
    };

    try {
        const res = await fetchWithAuth('/api/accounting/driver-advances/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message || 'Cấp tạm ứng thành công', 'Cấp Tạm Ứng Thành Công');
            closeDriverAdvanceModal();
            if (typeof loadAccountingAdvancesData === 'function') {
                loadAccountingAdvancesData();
            }
        } else {
            showToast('danger', data.error || 'Không thể tạo phiếu tạm ứng');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

function openSettleAdvanceModal(advanceId) {
    const advance = (rawDriverAdvancesList || []).find(a => a.id === advanceId);
    if (!advance) return;
    currentActiveAdvance = advance;

    const modal = document.getElementById('modal-settle-advance');
    if (!modal) return;

    const idEl = document.getElementById('settle-adv-id');
    if (idEl) idEl.value = advance.id;
    const codeEl = document.getElementById('settle-adv-code');
    if (codeEl) codeEl.innerText = advance.code;
    const tripEl = document.getElementById('settle-adv-trip-info');
    if (tripEl) tripEl.innerText = `[${advance.trip_code}] ${advance.customer_name || ''} (${advance.license_plate || ''})`;
    const drvEl = document.getElementById('settle-adv-driver-name');
    if (drvEl) drvEl.innerText = advance.driver_name;
    const amtEl = document.getElementById('settle-adv-amount-display');
    if (amtEl) amtEl.innerText = formatMoneyVND(advance.amount);

    const spentInp = document.getElementById('settle-adv-actual-spent');
    if (spentInp) {
        spentInp.value = new Intl.NumberFormat('vi-VN').format(advance.actual_spent || advance.amount);
    }

    calculateSettlementDiff();
    modal.classList.remove('hidden');
}

function closeSettleAdvanceModal() {
    const modal = document.getElementById('modal-settle-advance');
    if (modal) modal.classList.add('hidden');
}

function calculateSettlementDiff() {
    if (!currentActiveAdvance) return;
    const spentStr = document.getElementById('settle-adv-actual-spent')?.value || '0';
    const spent = parseInt(spentStr.replace(/\D/g, ''), 10) || 0;
    const advance = parseInt(currentActiveAdvance.amount, 10) || 0;
    const diff = advance - spent;

    const box = document.getElementById('settle-adv-diff-box');
    const badgeEl = document.getElementById('settle-adv-diff-badge');
    const descEl = document.getElementById('settle-adv-diff-desc');
    const amountEl = document.getElementById('settle-adv-diff-amount');

    if (!box || !badgeEl || !descEl || !amountEl) return;

    if (diff > 0) {
        box.className = 'p-4 rounded-2xl border bg-blue-50/70 border-blue-200 text-blue-900';
        badgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-200 text-blue-900';
        badgeEl.innerText = 'TÀI XẾ HOÀN LẠI TIỀN THỪA';
        descEl.innerText = 'Số tiền tài xế nộp lại vào quỹ:';
        amountEl.className = 'text-xl font-black tabular-nums font-heading text-blue-800';
        amountEl.innerText = `+${formatMoneyVND(diff)}`;
    } else if (diff < 0) {
        box.className = 'p-4 rounded-2xl border bg-rose-50/70 border-rose-200 text-rose-900';
        badgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-200 text-rose-900';
        badgeEl.innerText = 'CÔNG TY CHI TRẢ BÙ';
        descEl.innerText = 'Số tiền công ty/điều vận chi bù cho tài xế:';
        amountEl.className = 'text-xl font-black tabular-nums font-heading text-rose-700';
        amountEl.innerText = `-${formatMoneyVND(Math.abs(diff))}`;
    } else {
        box.className = 'p-4 rounded-2xl border bg-emerald-50/70 border-emerald-200 text-emerald-900';
        badgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-200 text-emerald-900';
        badgeEl.innerText = 'KHỚP ĐÚNG 100%';
        descEl.innerText = 'Không phát sinh chênh lệch:';
        amountEl.className = 'text-xl font-black tabular-nums font-heading text-emerald-800';
        amountEl.innerText = '0 đ';
    }
}

function recalculateActualExpensesFromTrip() {
    if (!currentActiveAdvance) return;
    const spentInp = document.getElementById('settle-adv-actual-spent');
    if (spentInp) {
        spentInp.value = new Intl.NumberFormat('vi-VN').format(currentActiveAdvance.actual_spent);
        calculateSettlementDiff();
    }
}

async function submitSettleAdvanceForm(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!currentActiveAdvance) return;

    const spentStr = document.getElementById('settle-adv-actual-spent')?.value || '0';
    const spent = parseInt(spentStr.replace(/\D/g, ''), 10) || 0;
    const notes = document.getElementById('settle-adv-notes')?.value || '';

    try {
        const res = await fetchWithAuth(`/api/accounting/driver-advances/${currentActiveAdvance.id}/settle/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                actual_spent: spent,
                settlement_notes: notes
            })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message || 'Quyết toán hoàn ứng thành công', 'Quyết Toán Hoàn Ứng Thành Công');
            closeSettleAdvanceModal();
            if (typeof loadAccountingAdvancesData === 'function') {
                loadAccountingAdvancesData();
            }
            if (data.cash_transaction || data.cash_transaction_id || data.cash_transaction_code) {
                setTimeout(() => {
                    if (typeof openCashVoucherModal === 'function') {
                        openCashVoucherModal(data.cash_transaction || data.cash_transaction_id || data.cash_transaction_code);
                    }
                }, 300);
            }
        } else {
            showToast('danger', data.error || 'Không thể quyết toán');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

window.closeDriverAdvanceModal = closeDriverAdvanceModal;
window.onAdvanceTripChange = onAdvanceTripChange;
window.toggleAdvanceSourceType = toggleAdvanceSourceType;
window.submitDriverAdvanceForm = submitDriverAdvanceForm;
window.openSettleAdvanceModal = openSettleAdvanceModal;
window.closeSettleAdvanceModal = closeSettleAdvanceModal;
window.calculateSettlementDiff = calculateSettlementDiff;
window.recalculateActualExpensesFromTrip = recalculateActualExpensesFromTrip;
window.submitSettleAdvanceForm = submitSettleAdvanceForm;

// BIM ACCOUNTING ADVANCES & FUNDS - COMPREHENSIVE CRUD (VIEW, EDIT, SAVE, PRINT, DELETE)
// =============================================================================
let currentActiveDriverAdvance = null;
let currentActiveDispatcherFund = null;

function setDriverAdvanceFormDisabled(disabled) {
    const fields = ['adv-inp-trip', 'adv-inp-driver', 'adv-inp-amount', 'adv-inp-date', 'adv-inp-fund', 'adv-inp-purpose', 'adv-inp-notes'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = disabled;
    });
    const radios = document.querySelectorAll('input[name="adv_source"]');
    radios.forEach(r => r.disabled = disabled);
}

function openDriverAdvanceModal(tripCode = null) {
    const modal = document.getElementById('modal-driver-advance');
    if (!modal) return;
    currentActiveDriverAdvance = null;

    const modeInp = document.getElementById('adv-mode');
    if (modeInp) modeInp.value = 'create';
    const editIdInp = document.getElementById('adv-edit-id');
    if (editIdInp) editIdInp.value = '';

    const titleEl = document.getElementById('adv-modal-title');
    if (titleEl) titleEl.innerText = 'Cấp Tạm Ứng Chuyến Cho Tài Xế';
    const subEl = document.getElementById('adv-modal-subtitle');
    if (subEl) subEl.innerText = 'Trích Quỹ Điều Vận hoặc Công ty chuyển khoản trực tiếp';

    const badgeEl = document.getElementById('adv-modal-badge');
    if (badgeEl) badgeEl.classList.add('hidden');
    const bannerEl = document.getElementById('adv-detail-banner');
    if (bannerEl) bannerEl.classList.add('hidden');
    const sumEl = document.getElementById('adv-box-settlement-summary');
    if (sumEl) sumEl.classList.add('hidden');

    const footerCreate = document.getElementById('adv-footer-create');
    if (footerCreate) footerCreate.classList.remove('hidden');
    const footerDetail = document.getElementById('adv-footer-detail');
    if (footerDetail) footerDetail.classList.add('hidden');

    setDriverAdvanceFormDisabled(false);

    const dateInp = document.getElementById('adv-inp-date');
    if (dateInp) dateInp.value = new Date().toISOString().slice(0, 10);

    const amountInp = document.getElementById('adv-inp-amount');
    if (amountInp) amountInp.value = '1.500.000';

    const purposeInp = document.getElementById('adv-inp-purpose');
    if (purposeInp) purposeInp.value = 'Chi phí cầu đường BOT, nâng hạ cảng, cược vỏ cont, kiểm dịch';

    const notesInp = document.getElementById('adv-inp-notes');
    if (notesInp) notesInp.value = '';

    const srcFund = document.getElementById('adv-src-fund');
    if (srcFund) srcFund.checked = true;
    toggleAdvanceSourceType();

    if (tripCode && accountingAdvancesData && accountingAdvancesData.available_trips) {
        const found = accountingAdvancesData.available_trips.find(t => t.trip_code === tripCode);
        if (found) {
            const tripSelect = document.getElementById('adv-inp-trip');
            if (tripSelect) {
                tripSelect.value = found.id;
                onAdvanceTripChange();
            }
        }
    }
    modal.classList.remove('hidden');
}

async function viewDriverAdvanceDetail(advanceId) {
    if (!advanceId) return;
    const modal = document.getElementById('modal-driver-advance');
    if (!modal) return;

    try {
        const res = await fetchWithAuth(`/api/accounting/driver-advances/${advanceId}/`);
        if (!res.ok) throw new Error('Không thể tải dữ liệu phiếu tạm ứng');
        const data = await res.json();
        const adv = data.advance;
        currentActiveDriverAdvance = adv;

        const modeInp = document.getElementById('adv-mode');
        if (modeInp) modeInp.value = 'view';
        const editIdInp = document.getElementById('adv-edit-id');
        if (editIdInp) editIdInp.value = adv.id;

        const titleEl = document.getElementById('adv-modal-title');
        if (titleEl) titleEl.innerText = `Phiếu Tạm Ứng [${adv.code}]`;
        const subEl = document.getElementById('adv-modal-subtitle');
        if (subEl) subEl.innerText = `Chuyến: ${adv.trip_code} • Xe: ${adv.license_plate} • Tài xế: ${adv.driver_name}`;

        const badgeEl = document.getElementById('adv-modal-badge');
        if (badgeEl) {
            badgeEl.innerText = adv.code;
            badgeEl.classList.remove('hidden');
        }

        // Cập nhật banner trạng thái
        const bannerEl = document.getElementById('adv-detail-banner');
        const bannerIcon = document.getElementById('adv-banner-icon');
        const bannerText = document.getElementById('adv-banner-text');
        const bannerBadge = document.getElementById('adv-banner-status-badge');
        if (bannerEl) {
            bannerEl.classList.remove('hidden');
            if (adv.status === 'SETTLED') {
                bannerEl.className = 'p-3 rounded-xl border flex items-center justify-between text-xs bg-emerald-50 border-emerald-200 text-emerald-900';
                if (bannerIcon) bannerIcon.className = 'ph-bold ph-check-circle text-emerald-600 text-base';
                if (bannerText) bannerText.innerText = 'Phiếu tạm ứng đã hoàn tất quyết toán & chốt sổ sổ quỹ';
                if (bannerBadge) {
                    bannerBadge.className = 'px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300';
                    bannerBadge.innerText = 'ĐÃ HOÀN ỨNG';
                }
            } else {
                bannerEl.className = 'p-3 rounded-xl border flex items-center justify-between text-xs bg-amber-50 border-amber-200 text-amber-900';
                if (bannerIcon) bannerIcon.className = 'ph-bold ph-hourglass-medium text-amber-600 text-base';
                if (bannerText) bannerText.innerText = 'Phiếu đang tạm ứng lưu hành (Chờ chuyến xe kết thúc để quyết toán)';
                if (bannerBadge) {
                    bannerBadge.className = 'px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-300';
                    bannerBadge.innerText = 'ĐANG TẠM ỨNG';
                }
            }
        }

        // Điền dữ liệu vào form
        const tripSelect = document.getElementById('adv-inp-trip');
        if (tripSelect) {
            // Đảm bảo option chuyến xe có mặt
            let opt = Array.from(tripSelect.options).find(o => o.value == adv.trip_id);
            if (!opt) {
                opt = new Option(`[${adv.trip_code}] ${adv.route_name || ''} - ${adv.license_plate}`, adv.trip_id, true, true);
                tripSelect.add(opt);
            }
            tripSelect.value = adv.trip_id;
        }

        const drvSelect = document.getElementById('adv-inp-driver');
        if (drvSelect) {
            let opt = Array.from(drvSelect.options).find(o => o.value == adv.driver_id);
            if (!opt) {
                opt = new Option(adv.driver_name, adv.driver_id, true, true);
                drvSelect.add(opt);
            }
            drvSelect.value = adv.driver_id;
        }

        const amountInp = document.getElementById('adv-inp-amount');
        if (amountInp) amountInp.value = formatMoneyVND(adv.amount);

        const dateInp = document.getElementById('adv-inp-date');
        if (dateInp) dateInp.value = adv.advance_date;

        const purposeInp = document.getElementById('adv-inp-purpose');
        if (purposeInp) purposeInp.value = adv.purpose || '';

        const notesInp = document.getElementById('adv-inp-notes');
        if (notesInp) notesInp.value = adv.notes || '';

        // Nguồn tiền
        if (adv.advance_source === 'DISPATCHER_FUND') {
            const rFund = document.getElementById('adv-src-fund');
            if (rFund) rFund.checked = true;
            const fundSelect = document.getElementById('adv-inp-fund');
            if (fundSelect && adv.dispatcher_fund_id) {
                let opt = Array.from(fundSelect.options).find(o => o.value == adv.dispatcher_fund_id);
                if (!opt) {
                    opt = new Option(`[${adv.fund_code}] Quỹ Điều Vận`, adv.dispatcher_fund_id, true, true);
                    fundSelect.add(opt);
                }
                fundSelect.value = adv.dispatcher_fund_id;
            }
        } else {
            const rDirect = document.getElementById('adv-src-direct');
            if (rDirect) rDirect.checked = true;
        }
        toggleAdvanceSourceType();

        // Khối tóm tắt quyết toán nếu đã settled
        const sumBox = document.getElementById('adv-box-settlement-summary');
        if (sumBox) {
            if (adv.status === 'SETTLED') {
                sumBox.classList.remove('hidden');
                const spentEl = document.getElementById('adv-display-actual-spent');
                if (spentEl) spentEl.innerText = formatMoneyVND(adv.actual_spent);

                const diffLabel = document.getElementById('adv-display-diff-label');
                const diffVal = document.getElementById('adv-display-diff-val');
                if (diffVal) {
                    if (adv.settlement_diff_type === 'DRIVER_REFUND') {
                        if (diffLabel) diffLabel.innerText = 'Tài xế đã nộp lại tiền thừa:';
                        diffVal.innerText = `+${formatMoneyVND(adv.refund_amount)}`;
                        diffVal.className = 'font-black tabular-nums font-mono text-sm text-blue-700';
                    } else if (adv.settlement_diff_type === 'COMPANY_REIMBURSE') {
                        if (diffLabel) diffLabel.innerText = 'Công ty đã chi trả bù cho tài xế:';
                        diffVal.innerText = `-${formatMoneyVND(adv.reimburse_amount)}`;
                        diffVal.className = 'font-black tabular-nums font-mono text-sm text-rose-700';
                    } else {
                        if (diffLabel) diffLabel.innerText = 'Kết quả đối soát:';
                        diffVal.innerText = 'Khớp đúng 100% (0 đ)';
                        diffVal.className = 'font-black tabular-nums font-mono text-sm text-emerald-700';
                    }
                }

                const settledByEl = document.getElementById('adv-display-settled-by');
                if (settledByEl) settledByEl.innerText = adv.settled_by || 'Kế toán';
                const settledAtEl = document.getElementById('adv-display-settled-at');
                if (settledAtEl) settledAtEl.innerText = adv.settled_at || '';
            } else {
                sumBox.classList.add('hidden');
            }
        }

        // Chuyển footer sang cụm chi tiết: Xóa | In, Sửa, Lưu, Đóng
        const footerCreate = document.getElementById('adv-footer-create');
        if (footerCreate) footerCreate.classList.add('hidden');
        const footerDetail = document.getElementById('adv-footer-detail');
        if (footerDetail) footerDetail.classList.remove('hidden');

        // Mặc định ở chế độ xem: Khóa form, ẩn nút Lưu, hiện nút Sửa
        setDriverAdvanceFormDisabled(true);
        const btnEdit = document.getElementById('btn-adv-edit');
        if (btnEdit) btnEdit.classList.remove('hidden');
        const btnSave = document.getElementById('btn-adv-save');
        if (btnSave) btnSave.classList.add('hidden');

        modal.classList.remove('hidden');
    } catch (err) {
        showToast('danger', err.message || 'Lỗi khi tải chi tiết phiếu tạm ứng');
    }
}

function enableDriverAdvanceEdit() {
    if (!currentActiveDriverAdvance) return;
    const isSettled = currentActiveDriverAdvance.status === 'SETTLED';

    if (isSettled) {
        // Đã hoàn ứng: chỉ cho phép sửa ghi chú
        const notesInp = document.getElementById('adv-inp-notes');
        if (notesInp) notesInp.disabled = false;
        showToast('info', 'Phiếu đã chốt hoàn ứng, bạn chỉ có thể hiệu chỉnh ghi chú');
    } else {
        // Đang tạm ứng: mở khóa số tiền, ngày, mục đích, ghi chú
        const fields = ['adv-inp-amount', 'adv-inp-date', 'adv-inp-purpose', 'adv-inp-notes'];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = false;
        });
        showToast('info', 'Đã mở khóa các trường thông tin để chỉnh sửa');
    }

    const btnEdit = document.getElementById('btn-adv-edit');
    if (btnEdit) btnEdit.classList.add('hidden');
    const btnSave = document.getElementById('btn-adv-save');
    if (btnSave) btnSave.classList.remove('hidden');
}

async function saveDriverAdvanceUpdate() {
    if (!currentActiveDriverAdvance) return;
    const advanceId = currentActiveDriverAdvance.id;

    const amountStr = document.getElementById('adv-inp-amount')?.value;
    const advanceDate = document.getElementById('adv-inp-date')?.value;
    const purpose = document.getElementById('adv-inp-purpose')?.value;
    const notes = document.getElementById('adv-inp-notes')?.value;

    const payload = {
        amount: amountStr,
        advance_date: advanceDate,
        purpose: purpose,
        notes: notes
    };

    try {
        const res = await fetchWithAuth(`/api/accounting/driver-advances/${advanceId}/`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message || 'Cập nhật phiếu tạm ứng thành công', 'Lưu Thành Công');
            // Cập nhật lại chế độ xem
            await viewDriverAdvanceDetail(advanceId);
            if (typeof loadAccountingAdvancesData === 'function') {
                loadAccountingAdvancesData();
            }
        } else {
            showToast('danger', data.error || 'Không thể cập nhật phiếu tạm ứng');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

async function confirmDeleteDriverAdvance(advanceId = null) {
    const targetId = advanceId || (currentActiveDriverAdvance ? currentActiveDriverAdvance.id : null);
    if (!targetId) return;

    if (currentActiveDriverAdvance && currentActiveDriverAdvance.status === 'SETTLED') {
        showToast('warning', 'Không thể xóa phiếu tạm ứng đã được quyết toán hoàn ứng chốt sổ!');
        return;
    }

    const confirmed = await showConfirmModal({
        title: 'Xóa Phiếu Tạm Ứng Chuyến',
        message: `Bạn có chắc chắn muốn XÓA VĨNH VIỄN phiếu tạm ứng này?

Số tiền tạm ứng sẽ được hoàn lại vào Quỹ Điều Vận / trừ khỏi chuyến xe.`,
        confirmText: 'Xóa Phiếu',
        cancelText: 'Hủy Bỏ',
        type: 'danger',
        icon: 'ph-bold ph-trash text-2xl'
    });
    if (!confirmed) return;

    try {
        const res = await fetchWithAuth(`/api/accounting/driver-advances/${targetId}/`, {
            method: 'DELETE'
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message || 'Đã xóa phiếu tạm ứng thành công', 'Xóa Thành Công');
            closeDriverAdvanceModal();
            if (typeof loadAccountingAdvancesData === 'function') {
                loadAccountingAdvancesData();
            }
        } else {
            showToast('danger', data.error || 'Không thể xóa phiếu tạm ứng');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

function printCurrentDriverAdvance() {
    if (currentActiveDriverAdvance) {
        printDriverAdvanceVoucher(currentActiveDriverAdvance.id);
    }
}

async function printDriverAdvanceVoucher(advanceId) {
    if (!advanceId) return;
    try {
        const res = await fetchWithAuth(`/api/accounting/driver-advances/${advanceId}/`);
        if (!res.ok) throw new Error('Không thể tải phiếu để in');
        const data = await res.json();
        const adv = data.advance;

        const company = window.SYSTEM_COMPANY || {};
        const compName = company.name || 'CÔNG TY TNHH VẬN TẢI & GIAO NHẬN TRIỀN VÕ';
        const compAddress = company.address || 'Hồ Chí Minh, Việt Nam';
        const compTax = company.tax_code || '0318000000';
        const compPhone = company.phone || '0900.000.000';

        const printWindow = window.open('', '_blank', 'width=900,height=800');
        if (!printWindow) {
            alert('Trình duyệt đã chặn cửa sổ in (Pop-up). Vui lòng cho phép mở pop-up.');
            return;
        }

        const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Phiếu Chi Tạm Ứng - ${escapeHtml(adv.code)}</title>
    <style>
        @page { size: A4 portrait; margin: 15mm 18mm; }
        body { font-family: "Times New Roman", Times, serif; font-size: 13pt; line-height: 1.4; color: #111; margin: 0; padding: 20px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 1px solid #ddd; padding-bottom: 12px; }
        .company-info { font-size: 10pt; line-height: 1.3; }
        .company-name { font-weight: bold; font-size: 12pt; text-transform: uppercase; color: #0f766e; }
        .voucher-title-box { text-align: center; margin: 15px 0 20px 0; }
        .voucher-title { font-size: 18pt; font-weight: bold; text-transform: uppercase; margin: 0; }
        .voucher-sub { font-size: 11pt; font-style: italic; margin-top: 4px; }
        .voucher-meta { text-align: right; font-size: 10pt; }
        .content-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
        .content-table td { padding: 6px 4px; vertical-align: top; }
        .label { font-weight: bold; width: 220px; }
        .dots { border-bottom: 1px dotted #999; }
        .money-box { border: 2px dashed #0f766e; background: #f0fdfa; padding: 12px 18px; border-radius: 6px; margin: 15px 0 25px 0; }
        .signatures { width: 100%; margin-top: 35px; border-collapse: collapse; text-align: center; }
        .signatures td { vertical-align: top; width: 20%; padding: 4px; font-size: 11pt; }
        .sig-title { font-weight: bold; }
        .sig-sub { font-style: italic; font-size: 9.5pt; color: #555; }
        .sig-space { height: 75px; }
        @media print {
            .no-print { display: none !important; }
            body { padding: 0; }
        }
    </style>
</head>
<body>
    <div class="no-print" style="margin-bottom: 20px; padding: 10px; background: #f1f5f9; border-radius: 8px; text-align: right;">
        <button onclick="window.print()" style="padding: 8px 18px; background: #0f766e; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
            In Phiếu (Print A4)
        </button>
        <button onclick="window.close()" style="padding: 8px 14px; background: #64748b; color: white; border: none; border-radius: 6px; margin-left: 8px; cursor: pointer;">
            Đóng
        </button>
    </div>

    <div class="header">
        <div class="company-info">
            <div class="company-name">${escapeHtml(compName)}</div>
            <div>Địa chỉ: ${escapeHtml(compAddress)}</div>
            <div>Mã số thuế: ${escapeHtml(compTax)} | Điện thoại: ${escapeHtml(compPhone)}</div>
        </div>
        <div class="voucher-meta">
            <div><strong>Mẫu số: 02-TT / C40-BB</strong></div>
            <div style="font-size: 9pt; font-style: italic;">(Ban hành theo TT 200/2014/TT-BTC)</div>
            <div style="margin-top: 4px;">Số: <strong>${escapeHtml(adv.code)}</strong></div>
            <div>Quyển số: TUTX-2026</div>
        </div>
    </div>

    <div class="voucher-title-box">
        <h1 class="voucher-title">PHIẾU CHI TẠM ỨNG CHUYẾN XE</h1>
        <div class="voucher-sub">Ngày ${adv.advance_date ? adv.advance_date.split('-').reverse().join(' tháng ') : '..... tháng .....'} năm 2026</div>
    </div>

    <table class="content-table">
        <tr>
            <td class="label">Họ và tên người nhận tiền:</td>
            <td><strong>${escapeHtml(adv.driver_name)}</strong> ${adv.driver_phone ? `(SĐT: ${escapeHtml(adv.driver_phone)})` : ''}</td>
        </tr>
        <tr>
            <td class="label">Bộ phận / Vị trí:</td>
            <td>Đội xe vận tải đường bộ - Tài xế điều khiển phương tiện</td>
        </tr>
        <tr>
            <td class="label">Chuyến xe thực hiện:</td>
            <td><strong style="color: #0f766e;">[${escapeHtml(adv.trip_code)}]</strong> - Biển số xe: <strong>${escapeHtml(adv.license_plate || '-')}</strong></td>
        </tr>
        <tr>
            <td class="label">Khách hàng & Tuyến đường:</td>
            <td>${escapeHtml(adv.customer_name || 'Khách hàng')} - Tuyến: ${escapeHtml(adv.route_name || '-')}</td>
        </tr>
        <tr>
            <td class="label">Nguồn tiền tạm ứng:</td>
            <td>${adv.advance_source === 'DISPATCHER_FUND' ? `Trích Quỹ Điều Vận (${escapeHtml(adv.fund_code || 'QĐV')})` : 'Công ty chi chuyển khoản trực tiếp'}</td>
        </tr>
        <tr>
            <td class="label">Lý do tạm ứng:</td>
            <td>${escapeHtml(adv.purpose || 'Chi phí cầu đường BOT, vé cảng, nâng hạ, cược vỏ cont, kiểm dịch phát sinh chuyến xe')}</td>
        </tr>
    </table>

    <div class="money-box">
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 12pt; font-weight: bold;">Số tiền tạm ứng:</span>
            <span style="font-size: 16pt; font-weight: bold; color: #0f766e;">${formatMoneyVND(adv.amount)}</span>
        </div>
        <div style="font-style: italic; margin-top: 6px; font-size: 11pt;">
            (Bằng chữ: <em>${escapeHtml(numberToWordsVN(adv.amount))}</em>)
        </div>
    </div>

    <div style="font-size: 11pt; margin-bottom: 10px;">
        Ghi chú / Chứng từ kèm theo: <em>${escapeHtml(adv.notes || 'Biên nhận tạm ứng theo chuyến xe')}</em>
    </div>

    <table class="signatures">
        <tr>
            <td class="sig-title">Giám Đốc</td>
            <td class="sig-title">Kế Toán Trưởng</td>
            <td class="sig-title">Thủ Quỹ</td>
            <td class="sig-title">Điều Phối Viên</td>
            <td class="sig-title">Người Nhận Tiền</td>
        </tr>
        <tr>
            <td class="sig-sub">(Ký, họ tên, đóng dấu)</td>
            <td class="sig-sub">(Ký, họ tên)</td>
            <td class="sig-sub">(Ký, họ tên)</td>
            <td class="sig-sub">(Ký, họ tên)</td>
            <td class="sig-sub">(Ký, họ tên)</td>
        </tr>
        <tr class="sig-space">
            <td></td><td></td><td></td><td></td><td></td>
        </tr>
        <tr>
            <td style="font-weight: bold;"></td>
            <td style="font-weight: bold;"></td>
            <td style="font-weight: bold;"></td>
            <td style="font-weight: bold;"></td>
            <td style="font-weight: bold;">${escapeHtml(adv.driver_name)}</td>
        </tr>
    </table>

    <div style="margin-top: 35px; border-top: 1px dashed #bbb; padding-top: 8px; font-size: 9.5pt; font-style: italic; color: #666; text-align: center;">
        Tài xế có trách nhiệm thu thập đầy đủ hóa đơn GTGT / vé điện tử và hoàn ứng quyết toán trong vòng 24 giờ sau khi kết thúc chuyến xe.
    </div>
</body>
</html>
        `;

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
    } catch (err) {
        showToast('danger', err.message || 'Lỗi khi in phiếu');
    }
}

// -----------------------------------------------------------------------------
// DISPATCHER ADVANCE FUND CRUD (VIEW, EDIT, SAVE, PRINT, DELETE)
// -----------------------------------------------------------------------------
function setDispatcherFundFormDisabled(disabled) {
    const fields = ['fund-inp-dispatcher', 'fund-inp-amount', 'fund-inp-date', 'fund-inp-purpose', 'fund-inp-notes'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = disabled;
    });
}

async function viewDispatcherFundDetail(fundId) {
    if (!fundId) return;
    const modal = document.getElementById('modal-dispatcher-fund');
    if (!modal) return;

    try {
        const res = await fetchWithAuth(`/api/accounting/dispatcher-funds/${fundId}/`);
        if (!res.ok) throw new Error('Không thể tải dữ liệu Quỹ Điều Vận');
        const data = await res.json();
        const fund = data.fund;
        currentActiveDispatcherFund = fund;

        const modeInp = document.getElementById('fund-mode');
        if (modeInp) modeInp.value = 'view';
        const editIdInp = document.getElementById('fund-edit-id');
        if (editIdInp) editIdInp.value = fund.id;

        const titleEl = document.getElementById('fund-modal-title');
        if (titleEl) titleEl.innerText = `Quỹ Điều Vận [${fund.code}]`;
        const subEl = document.getElementById('fund-modal-subtitle');
        if (subEl) subEl.innerText = `Nhân viên quản lý quỹ: ${fund.dispatcher_name} • SĐT: ${fund.dispatcher_phone || '-'}`;

        const badgeEl = document.getElementById('fund-modal-badge');
        if (badgeEl) {
            badgeEl.innerText = fund.code;
            badgeEl.classList.remove('hidden');
        }

        // Cập nhật banner trạng thái
        const bannerEl = document.getElementById('fund-detail-banner');
        const bannerIcon = document.getElementById('fund-banner-icon');
        const bannerText = document.getElementById('fund-banner-text');
        const bannerBadge = document.getElementById('fund-banner-status-badge');
        if (bannerEl) {
            bannerEl.classList.remove('hidden');
            if (fund.status === 'APPROVED') {
                bannerEl.className = 'p-3 rounded-xl border flex items-center justify-between text-xs bg-emerald-50 border-emerald-200 text-emerald-900';
                if (bannerIcon) bannerIcon.className = 'ph-bold ph-check-circle text-emerald-600 text-base';
                if (bannerText) bannerText.innerText = 'Quỹ đã duyệt & đang lưu hành giải ngân tạm ứng cho các chuyến xe';
                if (bannerBadge) {
                    bannerBadge.className = 'px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300';
                    bannerBadge.innerText = 'ĐANG LƯU HÀNH';
                }
            } else if (fund.status === 'SETTLED') {
                bannerEl.className = 'p-3 rounded-xl border flex items-center justify-between text-xs bg-slate-50 border-slate-200 text-slate-800';
                if (bannerIcon) bannerIcon.className = 'ph-bold ph-lock-key text-slate-600 text-base';
                if (bannerText) bannerText.innerText = 'Quỹ điều vận đã quyết toán hoàn ứng xong về công ty';
                if (bannerBadge) {
                    bannerBadge.className = 'px-2.5 py-0.5 rounded-full text-[11px] font-black bg-slate-200 text-slate-700 border border-slate-300';
                    bannerBadge.innerText = 'ĐÃ HOÀN ỨNG';
                }
            } else if (fund.status === 'PENDING') {
                bannerEl.className = 'p-3 rounded-xl border flex items-center justify-between text-xs bg-amber-50 border-amber-200 text-amber-900';
                if (bannerIcon) bannerIcon.className = 'ph-bold ph-hourglass-medium text-amber-600 text-base';
                if (bannerText) bannerText.innerText = 'Đề xuất tạm ứng quỹ đang chờ Kế toán / Ban Giám Đốc phê duyệt';
                if (bannerBadge) {
                    bannerBadge.className = 'px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-300';
                    bannerBadge.innerText = 'CHỜ DUYỆT';
                }
            } else {
                bannerEl.className = 'p-3 rounded-xl border flex items-center justify-between text-xs bg-rose-50 border-rose-200 text-rose-900';
                if (bannerIcon) bannerIcon.className = 'ph-bold ph-x-circle text-rose-600 text-base';
                if (bannerText) bannerText.innerText = 'Đề xuất cấp quỹ đã bị từ chối';
                if (bannerBadge) {
                    bannerBadge.className = 'px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-300';
                    bannerBadge.innerText = 'TỪ CHỐI';
                }
            }
        }

        // Điền dữ liệu
        const dispSelect = document.getElementById('fund-inp-dispatcher');
        if (dispSelect) {
            let opt = Array.from(dispSelect.options).find(o => o.value == fund.dispatcher_id);
            if (!opt) {
                opt = new Option(fund.dispatcher_name, fund.dispatcher_id, true, true);
                dispSelect.add(opt);
            }
            dispSelect.value = fund.dispatcher_id;
        }

        const amountInp = document.getElementById('fund-inp-amount');
        if (amountInp) amountInp.value = formatMoneyVND(fund.amount);

        const dateInp = document.getElementById('fund-inp-date');
        if (dateInp) dateInp.value = fund.advance_date;

        const purposeInp = document.getElementById('fund-inp-purpose');
        if (purposeInp) purposeInp.value = fund.purpose || '';

        const notesInp = document.getElementById('fund-inp-notes');
        if (notesInp) notesInp.value = fund.notes || '';

        // Khối tóm tắt dòng tiền quỹ
        const statsBox = document.getElementById('fund-box-money-stats');
        if (statsBox) {
            statsBox.classList.remove('hidden');
            const disEl = document.getElementById('fund-display-disbursed');
            if (disEl) disEl.innerText = formatMoneyVND(fund.disbursed_amount);
            const setEl = document.getElementById('fund-display-settled');
            if (setEl) setEl.innerText = formatMoneyVND(fund.settled_amount);
            const remEl = document.getElementById('fund-display-remaining');
            if (remEl) remEl.innerText = formatMoneyVND(fund.remaining_balance);

            const appByEl = document.getElementById('fund-display-approved-by');
            if (appByEl) appByEl.innerText = fund.approved_by || 'Chờ duyệt';
            const appAtEl = document.getElementById('fund-display-approved-at');
            if (appAtEl) appAtEl.innerText = fund.approved_at || '';
        }

        // Chuyển footer
        const footerCreate = document.getElementById('fund-footer-create');
        if (footerCreate) footerCreate.classList.add('hidden');
        const footerDetail = document.getElementById('fund-footer-detail');
        if (footerDetail) footerDetail.classList.remove('hidden');

        setDispatcherFundFormDisabled(true);
        const btnEdit = document.getElementById('btn-fund-edit');
        if (btnEdit) btnEdit.classList.remove('hidden');
        const btnSave = document.getElementById('btn-fund-save');
        if (btnSave) btnSave.classList.add('hidden');

        modal.classList.remove('hidden');
    } catch (err) {
        showToast('danger', err.message || 'Lỗi khi tải chi tiết Quỹ Điều Vận');
    }
}

function enableDispatcherFundEdit() {
    if (!currentActiveDispatcherFund) return;
    const isSettled = currentActiveDispatcherFund.status === 'SETTLED';

    if (isSettled) {
        const notesInp = document.getElementById('fund-inp-notes');
        if (notesInp) notesInp.disabled = false;
        showToast('info', 'Quỹ đã chốt hoàn ứng, bạn chỉ có thể hiệu chỉnh ghi chú');
    } else {
        const fields = ['fund-inp-amount', 'fund-inp-date', 'fund-inp-purpose', 'fund-inp-notes'];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = false;
        });
        showToast('info', 'Đã mở khóa các trường thông tin Quỹ Điều Vận');
    }

    const btnEdit = document.getElementById('btn-fund-edit');
    if (btnEdit) btnEdit.classList.add('hidden');
    const btnSave = document.getElementById('btn-fund-save');
    if (btnSave) btnSave.classList.remove('hidden');
}

async function saveDispatcherFundUpdate() {
    if (!currentActiveDispatcherFund) return;
    const fundId = currentActiveDispatcherFund.id;

    const amountStr = document.getElementById('fund-inp-amount')?.value;
    const advanceDate = document.getElementById('fund-inp-date')?.value;
    const purpose = document.getElementById('fund-inp-purpose')?.value;
    const notes = document.getElementById('fund-inp-notes')?.value;

    const payload = {
        amount: amountStr,
        advance_date: advanceDate,
        purpose: purpose,
        notes: notes
    };

    try {
        const res = await fetchWithAuth(`/api/accounting/dispatcher-funds/${fundId}/`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message || 'Cập nhật Quỹ Điều Vận thành công', 'Lưu Thành Công');
            await viewDispatcherFundDetail(fundId);
            if (typeof loadAccountingAdvancesData === 'function') {
                loadAccountingAdvancesData();
            }
        } else {
            showToast('danger', data.error || 'Không thể cập nhật Quỹ Điều Vận');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

async function confirmDeleteDispatcherFund(fundId = null) {
    const targetId = fundId || (currentActiveDispatcherFund ? currentActiveDispatcherFund.id : null);
    if (!targetId) return;

    if (currentActiveDispatcherFund && currentActiveDispatcherFund.disbursed_amount > 0) {
        showToast('warning', 'Không thể xóa Quỹ Điều Vận đã giải ngân cho các chuyến xe!');
        return;
    }

    const confirmed = await showConfirmModal({
        title: 'Xóa Quỹ Điều Vận',
        message: `Bạn có chắc chắn muốn XÓA Quỹ Tạm Ứng Điều Vận này?

Thao tác này chỉ thực hiện được khi quỹ chưa giải ngân tiền cho chuyến nào.`,
        confirmText: 'Xóa Quỹ',
        cancelText: 'Hủy Bỏ',
        type: 'danger',
        icon: 'ph-bold ph-trash text-2xl'
    });
    if (!confirmed) return;

    try {
        const res = await fetchWithAuth(`/api/accounting/dispatcher-funds/${targetId}/`, {
            method: 'DELETE'
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message || 'Đã xóa Quỹ Điều Vận thành công', 'Xóa Thành Công');
            closeDispatcherFundModal();
            if (typeof loadAccountingAdvancesData === 'function') {
                loadAccountingAdvancesData();
            }
        } else {
            showToast('danger', data.error || 'Không thể xóa Quỹ Điều Vận');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

function printCurrentDispatcherFund() {
    if (currentActiveDispatcherFund) {
        printDispatcherFundVoucher(currentActiveDispatcherFund.id);
    }
}

async function printDispatcherFundVoucher(fundId) {
    if (!fundId) return;
    try {
        const res = await fetchWithAuth(`/api/accounting/dispatcher-funds/${fundId}/`);
        if (!res.ok) throw new Error('Không thể tải Quỹ Điều Vận để in');
        const data = await res.json();
        const fund = data.fund;

        const company = window.SYSTEM_COMPANY || {};
        const compName = company.name || 'CÔNG TY TNHH VẬN TẢI & GIAO NHẬN TRIỀN VÕ';
        const compAddress = company.address || 'Hồ Chí Minh, Việt Nam';
        const compTax = company.tax_code || '0318000000';
        const compPhone = company.phone || '0900.000.000';

        const printWindow = window.open('', '_blank', 'width=900,height=800');
        if (!printWindow) {
            alert('Trình duyệt đã chặn cửa sổ in (Pop-up). Vui lòng cho phép mở pop-up.');
            return;
        }

        const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Phiếu Xuất Quỹ Tạm Ứng Điều Vận - ${escapeHtml(fund.code)}</title>
    <style>
        @page { size: A4 portrait; margin: 15mm 18mm; }
        body { font-family: "Times New Roman", Times, serif; font-size: 13pt; line-height: 1.4; color: #111; margin: 0; padding: 20px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 1px solid #ddd; padding-bottom: 12px; }
        .company-info { font-size: 10pt; line-height: 1.3; }
        .company-name { font-weight: bold; font-size: 12pt; text-transform: uppercase; color: #3730a3; }
        .voucher-title-box { text-align: center; margin: 15px 0 20px 0; }
        .voucher-title { font-size: 18pt; font-weight: bold; text-transform: uppercase; margin: 0; }
        .voucher-sub { font-size: 11pt; font-style: italic; margin-top: 4px; }
        .voucher-meta { text-align: right; font-size: 10pt; }
        .content-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
        .content-table td { padding: 6px 4px; vertical-align: top; }
        .label { font-weight: bold; width: 220px; }
        .money-box { border: 2px dashed #3730a3; background: #eef2ff; padding: 12px 18px; border-radius: 6px; margin: 15px 0 25px 0; }
        .signatures { width: 100%; margin-top: 35px; border-collapse: collapse; text-align: center; }
        .signatures td { vertical-align: top; width: 25%; padding: 4px; font-size: 11pt; }
        .sig-title { font-weight: bold; }
        .sig-sub { font-style: italic; font-size: 9.5pt; color: #555; }
        .sig-space { height: 75px; }
        @media print {
            .no-print { display: none !important; }
            body { padding: 0; }
        }
    </style>
</head>
<body>
    <div class="no-print" style="margin-bottom: 20px; padding: 10px; background: #f1f5f9; border-radius: 8px; text-align: right;">
        <button onclick="window.print()" style="padding: 8px 18px; background: #3730a3; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
            In Phiếu (Print A4)
        </button>
        <button onclick="window.close()" style="padding: 8px 14px; background: #64748b; color: white; border: none; border-radius: 6px; margin-left: 8px; cursor: pointer;">
            Đóng
        </button>
    </div>

    <div class="header">
        <div class="company-info">
            <div class="company-name">${escapeHtml(compName)}</div>
            <div>Địa chỉ: ${escapeHtml(compAddress)}</div>
            <div>Mã số thuế: ${escapeHtml(compTax)} | Điện thoại: ${escapeHtml(compPhone)}</div>
        </div>
        <div class="voucher-meta">
            <div><strong>Mẫu số: 02-TT</strong></div>
            <div style="font-size: 9pt; font-style: italic;">(Ban hành theo TT 200/2014/TT-BTC)</div>
            <div style="margin-top: 4px;">Số: <strong>${escapeHtml(fund.code)}</strong></div>
            <div>Quyển số: QĐV-2026</div>
        </div>
    </div>

    <div class="voucher-title-box">
        <h1 class="voucher-title">PHIẾU XUẤT CẤP QUỸ TẠM ỨNG ĐIỀU VẬN</h1>
        <div class="voucher-sub">Ngày ${fund.advance_date ? fund.advance_date.split('-').reverse().join(' tháng ') : '..... tháng .....'} năm 2026</div>
    </div>

    <table class="content-table">
        <tr>
            <td class="label">Người nhận quỹ / Chức danh:</td>
            <td><strong>${escapeHtml(fund.dispatcher_name)}</strong> - Điều Phối Viên / Trưởng Đội Xe</td>
        </tr>
        <tr>
            <td class="label">Bộ phận công tác:</td>
            <td>Phòng Điều Phối & Quản Lý Đội Xe Vận Tải Triền Võ</td>
        </tr>
        <tr>
            <td class="label">Mục đích cấp quỹ:</td>
            <td>${escapeHtml(fund.purpose || 'Quỹ điều vận tạm ứng chuyến xe, phí BOT, nâng hạ cảng & cược vỏ container')}</td>
        </tr>
        <tr>
            <td class="label">Trạng thái quỹ:</td>
            <td><strong>${escapeHtml(fund.status_label || fund.status)}</strong></td>
        </tr>
    </table>

    <div class="money-box">
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 12pt; font-weight: bold;">Tổng số tiền cấp quỹ:</span>
            <span style="font-size: 16pt; font-weight: bold; color: #3730a3;">${formatMoneyVND(fund.amount)}</span>
        </div>
        <div style="font-style: italic; margin-top: 6px; font-size: 11pt;">
            (Bằng chữ: <em>${escapeHtml(numberToWordsVN(fund.amount))}</em>)
        </div>
    </div>

    <div style="font-size: 11pt; margin-bottom: 10px;">
        Ghi chú đề xuất: <em>${escapeHtml(fund.notes || 'Cấp quỹ lưu động cho bộ phận điều vận theo định mức hàng tháng')}</em>
    </div>

    <table class="signatures">
        <tr>
            <td class="sig-title">Ban Giám Đốc</td>
            <td class="sig-title">Kế Toán Trưởng</td>
            <td class="sig-title">Thủ Quỹ</td>
            <td class="sig-title">Người Nhận Quỹ</td>
        </tr>
        <tr>
            <td class="sig-sub">(Ký, họ tên, đóng dấu)</td>
            <td class="sig-sub">(Ký, họ tên)</td>
            <td class="sig-sub">(Ký, họ tên)</td>
            <td class="sig-sub">(Ký, họ tên)</td>
        </tr>
        <tr class="sig-space">
            <td></td><td></td><td></td><td></td>
        </tr>
        <tr>
            <td style="font-weight: bold;"></td>
            <td style="font-weight: bold;">${escapeHtml(fund.approved_by || '')}</td>
            <td style="font-weight: bold;"></td>
            <td style="font-weight: bold;">${escapeHtml(fund.dispatcher_name)}</td>
        </tr>
    </table>
</body>
</html>
        `;

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
    } catch (err) {
        showToast('danger', err.message || 'Lỗi khi in phiếu');
    }
}

function printSettlementAdvanceVoucher() {
    if (!currentActiveAdvance) {
        showToast('warning', 'Chưa có thông tin phiếu quyết toán');
        return;
    }
    const adv = currentActiveAdvance;
    const actualSpent = document.getElementById('settle-adv-actual-spent')?.value || adv.actual_spent || 0;
    const notes = document.getElementById('settle-adv-notes')?.value || adv.settlement_notes || '';

    const company = window.SYSTEM_COMPANY || {};
    const compName = company.name || 'CÔNG TY TNHH VẬN TẢI & GIAO NHẬN TRIỀN VÕ';
    const compAddress = company.address || 'Hồ Chí Minh, Việt Nam';

    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) {
        alert('Trình duyệt đã chặn cửa sổ in (Pop-up). Vui lòng cho phép mở pop-up.');
        return;
    }

    const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Biên Bản Hoàn Ứng Quyết Toán - ${escapeHtml(adv.code)}</title>
    <style>
        @page { size: A4 portrait; margin: 15mm 18mm; }
        body { font-family: "Times New Roman", Times, serif; font-size: 13pt; line-height: 1.4; color: #111; margin: 0; padding: 20px; }
        .header { display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 15px; }
        .title { text-align: center; font-size: 18pt; font-weight: bold; text-transform: uppercase; margin: 15px 0 5px 0; }
        .sub { text-align: center; font-style: italic; font-size: 11pt; margin-bottom: 20px; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .table td { padding: 6px 4px; }
        .money-box { border: 2px solid #047857; background: #f0fdf4; padding: 12px; border-radius: 6px; margin: 15px 0; }
        .signatures { width: 100%; margin-top: 35px; border-collapse: collapse; text-align: center; }
        .signatures td { vertical-align: top; width: 33%; padding: 4px; font-size: 11pt; }
        @media print { .no-print { display: none !important; } body { padding: 0; } }
    </style>
</head>
<body>
    <div class="no-print" style="margin-bottom: 20px; padding: 10px; background: #f1f5f9; border-radius: 8px; text-align: right;">
        <button onclick="window.print()" style="padding: 8px 18px; background: #047857; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">In Biên Bản (A4)</button>
        <button onclick="window.close()" style="padding: 8px 14px; background: #64748b; color: white; border: none; border-radius: 6px; margin-left: 8px; cursor: pointer;">Đóng</button>
    </div>

    <div class="header">
        <div>
            <div style="font-weight: bold; font-size: 12pt; text-transform: uppercase; color: #047857;">${escapeHtml(compName)}</div>
            <div style="font-size: 10pt;">${escapeHtml(compAddress)}</div>
        </div>
        <div style="text-align: right; font-size: 10pt;">
            <div>Mã phiếu: <strong>${escapeHtml(adv.code)}</strong></div>
            <div>Chuyến: <strong>${escapeHtml(adv.trip_code)}</strong></div>
        </div>
    </div>

    <div class="title">BIÊN BẢN ĐỐI SOÁT & HOÀN ỨNG CHUYẾN XE</div>
    <div class="sub">Ngày ${new Date().toLocaleDateString('vi-VN')}</div>

    <table class="table">
        <tr>
            <td style="font-weight: bold; width: 220px;">Tài xế nhận tạm ứng:</td>
            <td><strong>${escapeHtml(adv.driver_name)}</strong></td>
        </tr>
        <tr>
            <td style="font-weight: bold;">Chuyến xe vận tải:</td>
            <td><strong>${escapeHtml(adv.trip_code)}</strong> - Biển số xe: <strong>${escapeHtml(adv.license_plate)}</strong></td>
        </tr>
        <tr>
            <td style="font-weight: bold;">Khách hàng & Tuyến:</td>
            <td>${escapeHtml(adv.customer_name)}</td>
        </tr>
        <tr>
            <td style="font-weight: bold;">Số tiền đã tạm ứng:</td>
            <td style="font-weight: bold; font-size: 12pt; color: #0f766e;">${formatMoneyVND(adv.amount)}</td>
        </tr>
        <tr>
            <td style="font-weight: bold;">Tổng chi phí thực tế đã chi:</td>
            <td style="font-weight: bold; font-size: 12pt; color: #1e293b;">${formatMoneyVND(actualSpent)}</td>
        </tr>
    </table>

    <div class="money-box">
        <div style="font-weight: bold; font-size: 12pt;">KẾT QUẢ ĐỐI SOÁT HOÀN ỨNG:</div>
        <div style="font-size: 13pt; margin-top: 6px;">
            ${(Number(adv.amount) - Number(String(actualSpent).replace(/\./g, ''))) > 0 ? 
                `Tài xế nộp lại tiền thừa cho công ty: <strong style="color: #1d4ed8;">+${formatMoneyVND(Number(adv.amount) - Number(String(actualSpent).replace(/\./g, '')))}</strong>` : 
                ((Number(adv.amount) - Number(String(actualSpent).replace(/\./g, ''))) < 0 ? 
                    `Công ty chi trả bù thêm cho tài xế: <strong style="color: #b91c1c;">-${formatMoneyVND(Math.abs(Number(adv.amount) - Number(String(actualSpent).replace(/\./g, ''))))}</strong>` : 
                    `<strong style="color: #047857;">Hai bên đối soát khớp đúng 100% (0 đ)</strong>`)}
        </div>
    </div>

    <div style="font-size: 11pt; margin-top: 10px;">
        Ghi chú đối soát: <em>${escapeHtml(notes || 'Đã đối chiếu đủ hóa đơn, vé cầu đường và chứng từ hợp lệ.')}</em>
    </div>

    <table class="signatures">
        <tr>
            <td style="font-weight: bold;">Kế Toán Đối Soát</td>
            <td style="font-weight: bold;">Điều Phối Đội Xe</td>
            <td style="font-weight: bold;">Tài Xế Hoàn Ứng</td>
        </tr>
        <tr>
            <td style="font-style: italic; font-size: 9.5pt;">(Ký, họ tên)</td>
            <td style="font-style: italic; font-size: 9.5pt;">(Ký, họ tên)</td>
            <td style="font-style: italic; font-size: 9.5pt;">(Ký, họ tên)</td>
        </tr>
        <tr style="height: 75px;"><td></td><td></td><td></td></tr>
        <tr>
            <td></td><td></td><td style="font-weight: bold;">${escapeHtml(adv.driver_name)}</td>
        </tr>
    </table>
</body>
</html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
}
window.viewDriverAdvanceDetail = viewDriverAdvanceDetail;
window.enableDriverAdvanceEdit = enableDriverAdvanceEdit;
window.saveDriverAdvanceUpdate = saveDriverAdvanceUpdate;
window.confirmDeleteDriverAdvance = confirmDeleteDriverAdvance;
window.printCurrentDriverAdvance = printCurrentDriverAdvance;
window.printDriverAdvanceVoucher = printDriverAdvanceVoucher;
window.printSettlementAdvanceVoucher = printSettlementAdvanceVoucher;
window.openDriverAdvanceModal = openDriverAdvanceModal;
window.setDriverAdvanceFormDisabled = setDriverAdvanceFormDisabled;
