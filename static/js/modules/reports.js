/**
 * BIM LOGISTICS — MODULE BÁO CÁO & PHÂN TÍCH QUẢN TRỊ TMS (BI ANALYTICS)
 */

// =========================================================================
// 8. PHÂN HỆ BÁO CÁO & PHÂN TÍCH QUẢN TRỊ TMS (BI ANALYTICS LOGIC)
// =========================================================================

let currentReportPeriod = 'month';
let rawReportsData = null;

// Caches & Sort States cho toàn bộ 14 Báo cáo TMS
let rep1DataCache = [];
let rep1SortCol = 'revenue';
let rep1SortAsc = false;

let rep2DataCache = [];
let rep2SortCol = 'estimated_fines';
let rep2SortAsc = false;

let rep3DataCache = [];
let rep3SortCol = 'trip_code';
let rep3SortAsc = false;

let rep4DataCache = [];
let rep4SortCol = 'amount';
let rep4SortAsc = false;

let rep5DataCache = [];
let rep5SortCol = 'wait_hours';
let rep5SortAsc = false;

let rep6DataCache = [];
let rep6SortCol = 'estimated_damage';
let rep6SortAsc = false;

let rep7DataCache = [];
let rep7SortCol = 'total_teu';
let rep7SortAsc = false;

let rep8SubcontractorsCache = [];
let rep8SubSortCol = 'gross_payable';
let rep8SubSortAsc = false;
let rep8TripsCache = [];
let rep8TripSortCol = 'date';
let rep8TripSortAsc = false;

let rep9DataCache = [];
let rep9SortCol = 'base_trip_salary';
let rep9SortAsc = false;

let rep10DataCache = [];
let rep10SortCol = 'code';
let rep10SortAsc = false;

let rep11DataCache = [];
let rep11SortCol = 'trip_code';
let rep11SortAsc = false;

let rep12DataCache = [];
let rep12SortCol = 'loading_date';
let rep12SortAsc = false;

let rep13DataCache = [];
let rep13SortCol = 'total_receivable';
let rep13SortAsc = false;

let rep14DataCache = [];
let rep14SortCol = 'days_unsettled';
let rep14SortAsc = false;

function formatMoneyVND(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '0 đ';
    return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' đ';
}

let currentActiveReportSubtab = 'report-1';
let currentActiveReportGroup = 'group-1';
let currentReportViewMode = 'group'; // 'group' hoặc 'all'

const REPORT_GROUP_MAPPING = {
    'group-1': ['report-1', 'report-4', 'report-12'],
    'group-2': ['report-7', 'report-13', 'report-14'],
    'group-3': ['report-10', 'report-11', 'report-9', 'report-8'],
    'group-4': ['report-2', 'report-3', 'report-5', 'report-6']
};

function switchReportGroup(groupId, autoSwitchFirstChild = true) {
    currentActiveReportGroup = groupId;

    currentReportViewMode = 'group';

    // Cập nhật trạng thái hiển thị của 4 Card Nhóm Lớn
    ['group-1', 'group-2', 'group-3', 'group-4'].forEach(g => {
        const num = g.replace('group-', '');
        const btn = document.getElementById(`report-group-btn-${num}`);
        if (!btn) return;
        if (g === groupId) {
            btn.classList.add('active', 'border-teal-600', 'shadow-xs', 'ring-2', 'ring-teal-600/20');
            btn.classList.remove('border-slate-200', 'hover:border-slate-300', 'shadow-2xs');
        } else {
            btn.classList.remove('active', 'border-teal-600', 'shadow-xs', 'ring-2', 'ring-teal-600/20');
            btn.classList.add('border-slate-200', 'hover:border-slate-300', 'shadow-2xs');
        }
    });

    // Lọc hiển thị nghiêm ngặt: chỉ các nút subtab thuộc nhóm được chọn mới hiển thị
    applyReportGroupFilterToButtons();

    // Tự động kích hoạt báo cáo đầu tiên của nhóm nếu báo cáo hiện tại không nằm trong nhóm này
    const groupReports = REPORT_GROUP_MAPPING[groupId] || [];
    if (autoSwitchFirstChild && !groupReports.includes(currentActiveReportSubtab)) {
        if (groupReports.length > 0) {
            switchReportSubTab(groupReports[0]);
        }
    }
}

function toggleReportViewMode(mode) {
    currentReportViewMode = mode || 'group';
    applyReportGroupFilterToButtons();
}

function applyReportGroupFilterToButtons() {
    const subtabButtons = document.querySelectorAll('.report-subtab-btn');
    subtabButtons.forEach(btn => {
        const btnGroup = btn.getAttribute('data-report-group');
        // Chỉ hiển thị duy nhất các báo cáo thuộc nhóm đang chọn, ẩn triệt để các nhóm khác
        if (btnGroup === currentActiveReportGroup) {
            btn.classList.remove('hidden');
            btn.style.display = '';
        } else {
            btn.classList.add('hidden');
            btn.style.display = 'none';
        }
    });
}

function switchReportSubTab(subtabId) {
    currentActiveReportSubtab = subtabId;

    // Tự động nhận diện và kích hoạt Nhóm cha tương ứng
    for (const [grp, rpts] of Object.entries(REPORT_GROUP_MAPPING)) {
        if (rpts.includes(subtabId) && currentActiveReportGroup !== grp) {
            switchReportGroup(grp, false);
            break;
        }
    }

    // Đảm bảo chỉ hiển thị subtab buttons thuộc nhóm hiện tại
    applyReportGroupFilterToButtons();

    // Ẩn tất cả subtab content
    document.querySelectorAll('.report-subtab-content').forEach(el => el.classList.add('hidden'));

    // Bỏ active tất cả tab buttons
    document.querySelectorAll('.report-subtab-btn').forEach(btn => {
        btn.classList.remove('bg-teal-700', 'text-white', 'shadow-sm', 'active');
        btn.classList.add('text-slate-600', 'hover:text-slate-900', 'hover:bg-slate-100');
    });

    // Mở subtab được chọn
    const targetContent = document.getElementById(`subtab-${subtabId}`);
    if (targetContent) targetContent.classList.remove('hidden');

    // Kích hoạt button tương ứng
    const tabNum = subtabId.replace('report-', '');
    const activeBtn = document.getElementById(`report-tab-btn-${tabNum}`);
    if (activeBtn) {
        activeBtn.classList.remove('text-slate-600', 'hover:text-slate-900', 'hover:bg-slate-100');
        activeBtn.classList.add('bg-teal-700', 'text-white', 'shadow-sm', 'active');
        activeBtn.classList.remove('hidden'); // Đảm bảo nút được nhìn thấy
        activeBtn.style.display = '';
    }
}

window.switchReportGroup = switchReportGroup;
window.toggleReportViewMode = toggleReportViewMode;
window.switchReportSubTab = switchReportSubTab;

function changeReportPeriod(period) {
    if (period === 'this_year') period = 'year';
    currentReportPeriod = period;

    // Cập nhật giao diện nút kỳ
    const periodButtons = ['today', 'week', 'month', 'quarter', 'year', 'all'];
    periodButtons.forEach(p => {
        const btn = document.getElementById(`btn-period-${p}`);
        if (!btn) return;
        if (p === period) {
            btn.className = 'report-period-btn px-3 py-1.5 rounded-lg bg-teal-700 text-white shadow-xs transition-colors cursor-pointer';
        } else {
            btn.className = 'report-period-btn px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer';
        }
    });

    loadReportsData();
}

// Hàm điều hướng trực tiếp sang phân hệ Báo Cáo và mở đúng Tab báo cáo chỉ định (Deep-linking)
window.openReportTab = function(reportId, periodOverride) {
    if (typeof switchTab === 'function') {
        switchTab('bao-cao', true);
    }
    if (reportId && typeof switchReportSubTab === 'function') {
        let subtabId = reportId;
        if (reportId === 'settlement' || reportId === 'report-settlement') subtabId = 'report-12';
        else if (reportId === 'ar-aging' || reportId === 'report-ar-aging') subtabId = 'report-13';
        else if (reportId === 'unsettled-aging' || reportId === 'report-unsettled-aging') subtabId = 'report-14';
        else if (!subtabId.startsWith('report-')) subtabId = `report-${subtabId}`;
        
        setTimeout(() => {
            switchReportSubTab(subtabId);
            if (periodOverride && typeof changeReportPeriod === 'function') {
                changeReportPeriod(periodOverride);
            }
        }, 60);
    }
};

async function loadReportsData() {
    try {
        let p = currentReportPeriod || 'month';
        if (p === 'this_year') p = 'year';
        let url = `/api/reports/?period=${p}`;
        if (p !== 'all') {
            let globalDates;
            if (p === 'year') {
                const now = new Date();
                globalDates = { fromDate: `${now.getFullYear()}-01-01`, toDate: `${now.getFullYear()}-12-31` };
            } else if (p === 'month') {
                globalDates = getDateRangeForPeriod('this_month');
            } else if (p === 'quarter') {
                globalDates = getDateRangeForPeriod('this_quarter');
            } else if (p === 'today') {
                globalDates = getDateRangeForPeriod('today');
            } else if (p === 'week') {
                globalDates = getDateRangeForPeriod('7_days');
            } else {
                globalDates = getDateRangeForPeriod(p, currentDashboardCustomStart, currentDashboardCustomEnd);
            }
            if (globalDates && globalDates.fromDate && globalDates.toDate) {
                url += `&from_date=${globalDates.fromDate}&to_date=${globalDates.toDate}`;
            }
        }
        const res = await fetchWithAuth(url);
        if (!res.ok) throw new Error('Không thể tải dữ liệu báo cáo');
        const data = await res.json();
        rawReportsData = data;

        // Cập nhật số huy hiệu (Badges) trên Subtab bar
        const detWarningBadge = document.getElementById('badge-report-det-warning');
        if (detWarningBadge && data.report2_container_dem_det) {
            const warnCount = (data.report2_container_dem_det.warning_count || 0) + (data.report2_container_dem_det.overdue_count || 0);
            detWarningBadge.innerText = warnCount;
            detWarningBadge.className = warnCount > 0 
                ? 'px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-100 text-rose-700'
                : 'px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500';
        }

        const layoverBadge = document.getElementById('badge-report-layover');
        if (layoverBadge && data.report5_drop_hook_and_layover) {
            const layoverCount = data.report5_drop_hook_and_layover.overnight_trips_count || 0;
            layoverBadge.innerText = layoverCount;
            layoverBadge.className = layoverCount > 0
                ? 'px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-100 text-amber-800'
                : 'px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500';
        }

        const fundBadge = document.getElementById('badge-report-fund-count');
        if (fundBadge && data.report10_dispatcher_funds) {
            const activeFunds = data.report10_dispatcher_funds.active_funds_count || 0;
            fundBadge.innerText = activeFunds;
            fundBadge.className = activeFunds > 0
                ? 'px-1.5 py-0.2 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-700'
                : 'px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500';
        }

        const drvAdvBadge = document.getElementById('badge-report-driver-adv-pending');
        if (drvAdvBadge && data.report11_driver_advances_expenses) {
            const pendingTrips = data.report11_driver_advances_expenses.pending_settlement_count || 0;
            drvAdvBadge.innerText = pendingTrips;
            drvAdvBadge.className = pendingTrips > 0
                ? 'px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-100 text-amber-800'
                : 'px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500';
        }

        const carryoverBadge = document.getElementById('badge-report-carryover-count');
        if (carryoverBadge && data.report12_settlement_backlog) {
            const carryCount = data.report12_settlement_backlog.carryover_trips_count || 0;
            carryoverBadge.innerText = carryCount;
            carryoverBadge.className = carryCount > 0
                ? 'px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-100 text-amber-800'
                : 'px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500';
        }

        const unsettledCriticalBadge = document.getElementById('badge-report-unsettled-critical');
        if (unsettledCriticalBadge && data.report14_unsettled_aging) {
            const critCount = data.report14_unsettled_aging.over_30_days_count || 0;
            unsettledCriticalBadge.innerText = critCount;
            unsettledCriticalBadge.className = critCount > 0
                ? 'px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 animate-pulse'
                : 'px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500';
        }

        // Render Báo cáo 1
        renderReport1(data);

        // Render Báo cáo 2
        renderReport2(data);

        // Render Báo cáo 3
        renderReport3(data);

        // Render Báo cáo 4
        renderReport4(data);

        // Render Báo cáo 5
        renderReport5(data);

        // Render Báo cáo 6
        renderReport6(data);

        // Render Báo cáo 7: Phân Tích Doanh Thu Khách & TEU
        renderReport7(data);

        // Render Báo cáo 8: Quyết Toán Xe Thầu Phụ 3PL
        renderReport8(data);

        // Render Báo cáo 9: Bảng Lương Chuyến & Năng Suất Tài Xế
        renderReport9(data);

        // Render Báo cáo 10: Quỹ Tạm Ứng Điều Vận (Kế Toán Quản Lý)
        renderReport10(data);

        // Render Báo cáo 11: Tạm Ứng & Chi Phí Phát Sinh Tài Xế (Điều Vận Quản Lý)
        renderReport11(data);

        // Render Báo cáo 12: Quyết Toán Chuyến Xe & Backlog Chuyển Kỳ
        renderReport12(data);

        // Render Báo cáo 13: Báo Cáo Theo Dõi Công Nợ Phải Thu (AR)
        renderReport13(data);

        // Render Báo cáo 14: Báo Cáo Tuổi Đơn Tồn Đọng Chưa Quyết Toán
        renderReport14(data);

    } catch (err) {
        console.error('Lỗi khi tải dữ liệu báo cáo TMS:', err);
        showToast('danger', 'Không thể nạp dữ liệu phân tích báo cáo: ' + err.message, 'Lỗi Báo Cáo');
    }
}

// -------------------------------------------------------------
// RENDER BÁO CÁO 1: HIỆU SUẤT ĐỘI XE & P&L ĐẦU XE
// -------------------------------------------------------------
function renderReport1(data) {
    const s = data.summary || {};
    const r1 = data.report1_fleet_utilization || {};
    const canViewFinance = (data.can_view_finance !== false);

    const elOwnedRatio = document.getElementById('rep1-stat-owned-ratio');
    if (elOwnedRatio) elOwnedRatio.innerText = `${s.owned_ratio || 0.0}%`;

    const elNoteOwned = document.getElementById('rep1-note-owned');
    if (elNoteOwned) elNoteOwned.innerText = `Xe Nhà: ${r1.owned_trips || 0} chuyến · Xe Bạn: ${r1.partner_trips || 0} chuyến`;

    const elRev = document.getElementById('rep1-stat-revenue');
    if (elRev) elRev.innerText = canViewFinance ? formatMoneyVND(s.total_revenue || 0) : '*** (Bảo mật)';

    const elExp = document.getElementById('rep1-stat-expense');
    if (elExp) elExp.innerText = canViewFinance ? formatMoneyVND(s.total_expense || 0) : '*** (Bảo mật)';

    const elProfit = document.getElementById('rep1-stat-profit');
    if (elProfit) elProfit.innerText = canViewFinance ? formatMoneyVND(s.total_profit || 0) : '*** (Bảo mật)';

    const elMargin = document.getElementById('rep1-stat-margin');
    if (elMargin) elMargin.innerText = canViewFinance ? `Biên LN gộp: ${s.margin_avg || 0.0}%` : 'Biên LN: Nội bộ BGD';

    rep1DataCache = r1.fleet_pnl || [];
    rep1DataCache._can_view_finance = canViewFinance;
    applyReport1Filters();
}

function applyReport1Filters() {
    const canViewFinance = (rep1DataCache._can_view_finance !== false);
    const searchVal = (document.getElementById('filter-rep1-search')?.value || '').toLowerCase().trim();
    let list = rep1DataCache.filter(item => {
        if (!searchVal) return true;
        return (item.plate || '').toLowerCase().includes(searchVal) ||
               (item.driver || '').toLowerCase().includes(searchVal) ||
               (item.vehicle_type || '').toLowerCase().includes(searchVal) ||
               (item.ownership || '').toLowerCase().includes(searchVal);
    });

    // Sắp xếp
    list.sort((a, b) => {
        let valA = a[rep1SortCol];
        let valB = b[rep1SortCol];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return rep1SortAsc ? -1 : 1;
        if (valA > valB) return rep1SortAsc ? 1 : -1;
        return 0;
    });

    const tbody = document.getElementById('rep1-pnl-tbody');
    const tfoot = document.getElementById('rep1-pnl-tfoot');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="p-8 text-center text-slate-400 font-medium">Không tìm thấy dữ liệu đầu xe phù hợp với kỳ và bộ lọc này</td></tr>`;
        if (tfoot) tfoot.innerHTML = '';
        return;
    }

    // Tính tổng cộng
    const totalTrips = list.reduce((sum, item) => sum + (Number(item.trips_count) || 0), 0);
    const totalRev = list.reduce((sum, item) => sum + (Number(item.revenue) || 0), 0);
    const totalExp = list.reduce((sum, item) => sum + (Number(item.expense) || 0), 0);
    const totalProfit = list.reduce((sum, item) => sum + (Number(item.profit) || 0), 0);
    const avgMargin = totalRev > 0 ? ((totalProfit / totalRev) * 100).toFixed(1) : '0.0';

    tbody.innerHTML = list.map(item => {
        const isOwned = item.ownership_code === 'OWNED';
        const ownershipBadge = isOwned
            ? `<span class="text-xs font-bold text-teal-700 uppercase">Xe Nhà</span>`
            : `<span class="text-xs font-semibold text-slate-600 uppercase">Xe Bạn / 3PL</span>`;
        
        const profitColor = item.profit >= 0 ? 'text-emerald-700' : 'text-rose-600';
        const marginColor = item.margin_percent >= 20 ? 'text-emerald-700' :
                            (item.margin_percent >= 10 ? 'text-teal-700' : 'text-amber-700');

        const revDisplay = canViewFinance ? formatMoneyVND(item.revenue) : '***';
        const expDisplay = canViewFinance ? formatMoneyVND(item.expense) : '***';
        const profitDisplay = canViewFinance ? formatMoneyVND(item.profit) : '***';
        const marginDisplay = canViewFinance ? `${item.margin_percent}%` : '***';

        return `
            <tr class="hover:bg-teal-50/30 transition-colors">
                <td class="font-black text-slate-900 font-mono text-xs">${escapeHtml(item.plate)}</td>
                <td class="text-xs text-slate-600">${escapeHtml(item.vehicle_type)}</td>
                <td>${ownershipBadge}</td>
                <td class="text-xs font-medium text-slate-700">${escapeHtml(item.driver)}</td>
                <td class="text-center font-bold text-slate-800 text-xs tabular-nums">${item.trips_count}</td>
                <td class="text-right font-semibold text-slate-800 text-xs tabular-nums">${revDisplay}</td>
                <td class="text-right font-medium text-rose-600 text-xs tabular-nums">${expDisplay}</td>
                <td class="text-right font-black ${profitColor} text-xs tabular-nums">${profitDisplay}</td>
                <td class="text-center">
                    <span class="text-xs font-bold ${marginColor} tabular-nums">
                        ${marginDisplay}
                    </span>
                </td>
            </tr>
        `;
    }).join('');

    if (tfoot) {
        tfoot.innerHTML = `
            <tr class="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900">
                <td colspan="4" class="py-2.5 px-3 text-slate-800 font-bold uppercase">TỔNG CỘNG: ${list.length} Đầu Xe</td>
                <td class="text-center font-black font-mono tabular-nums text-slate-900">${totalTrips}</td>
                <td class="text-right font-black font-mono tabular-nums text-slate-900">${canViewFinance ? formatMoneyVND(totalRev) : '***'}</td>
                <td class="text-right font-black font-mono tabular-nums text-rose-700">${canViewFinance ? formatMoneyVND(totalExp) : '***'}</td>
                <td class="text-right font-black font-mono tabular-nums ${totalProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}">${canViewFinance ? formatMoneyVND(totalProfit) : '***'}</td>
                <td class="text-center font-black font-mono tabular-nums text-teal-800">${canViewFinance ? `${avgMargin}%` : '***'}</td>
            </tr>
        `;
    }
}

function toggleReport1Sort(col) {
    if (rep1SortCol === col) {
        rep1SortAsc = !rep1SortAsc;
    } else {
        rep1SortCol = col;
        rep1SortAsc = false;
    }
    applyReport1Filters();
}

// -------------------------------------------------------------
// RENDER BÁO CÁO 2: CHU TRÌNH VỎ CONTAINER & DEM/DET
// -------------------------------------------------------------
function renderReport2(data) {
    const r2 = data.report2_container_dem_det || {};

    const elSafe = document.getElementById('rep2-stat-safe');
    if (elSafe) elSafe.innerText = `${r2.safe_count || 0} Cont`;

    const elWarn = document.getElementById('rep2-stat-warning');
    if (elWarn) elWarn.innerText = `${r2.warning_count || 0} Cont`;

    const elOverdue = document.getElementById('rep2-stat-overdue');
    if (elOverdue) elOverdue.innerText = `${r2.overdue_count || 0} Cont`;

    const elFines = document.getElementById('rep2-stat-fines');
    if (elFines) elFines.innerText = `Ước tính tiền phạt: ${formatMoneyVND(r2.estimated_fines || 0)}`;

    // Render Bảng Ma trận Hãng Tàu (Shipping Lines Summary)
    const slTbody = document.getElementById('rep2-shipping-lines-tbody');
    const slTfoot = document.getElementById('rep2-shipping-lines-tfoot');
    if (slTbody) {
        const slList = r2.shipping_lines_summary || [];
        if (slList.length === 0) {
            slTbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400 font-medium">Chưa có dữ liệu hãng tàu trong kỳ này</td></tr>`;
            if (slTfoot) slTfoot.innerHTML = '';
        } else {
            const sumConts = slList.reduce((sum, item) => sum + (Number(item.total_containers) || 0), 0);
            const sumSafe = slList.reduce((sum, item) => sum + (Number(item.safe_count) || 0), 0);
            const sumWarn = slList.reduce((sum, item) => sum + (Number(item.warning_count) || 0), 0);
            const sumOverdue = slList.reduce((sum, item) => sum + (Number(item.overdue_count) || 0), 0);
            const sumFines = slList.reduce((sum, item) => sum + (Number(item.estimated_fines) || 0), 0);

            slTbody.innerHTML = slList.map(sl => `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="font-bold text-slate-800 text-xs flex items-center gap-2">
                        <i class="ph-bold ph-boat text-teal-700"></i>
                        <span>${escapeHtml(sl.shipping_line)}</span>
                    </td>
                    <td class="text-center font-mono font-bold text-slate-900 text-xs">${sl.total_containers}</td>
                    <td class="text-center font-mono font-bold text-emerald-700 text-xs">${sl.safe_count}</td>
                    <td class="text-center font-mono font-bold text-amber-700 text-xs">${sl.warning_count > 0 ? `<span class="font-bold text-amber-700">${sl.warning_count}</span>` : '0'}</td>
                    <td class="text-center font-mono font-bold text-rose-700 text-xs">${sl.overdue_count > 0 ? `<span class="font-black text-rose-700">${sl.overdue_count}</span>` : '0'}</td>
                    <td class="text-right font-black text-rose-600 text-xs tabular-nums">${formatMoneyVND(sl.estimated_fines)}</td>
                </tr>
            `).join('');

            if (slTfoot) {
                slTfoot.innerHTML = `
                    <tr class="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900">
                        <td class="py-2.5 px-3 uppercase">TỔNG CỘNG: ${slList.length} Hãng Tàu</td>
                        <td class="text-center font-mono font-black tabular-nums">${sumConts}</td>
                        <td class="text-center font-mono font-black text-emerald-700 tabular-nums">${sumSafe}</td>
                        <td class="text-center font-mono font-black text-amber-700 tabular-nums">${sumWarn}</td>
                        <td class="text-center font-mono font-black text-rose-700 tabular-nums">${sumOverdue}</td>
                        <td class="text-right font-mono font-black text-rose-700 tabular-nums">${formatMoneyVND(sumFines)}</td>
                    </tr>
                `;
            }
        }
    }

    rep2DataCache = r2.containers || [];
    applyReport2Filters();
}

function applyReport2Filters() {
    const searchVal = (document.getElementById('filter-rep2-search')?.value || '').toLowerCase().trim();
    let list = rep2DataCache.filter(item => {
        if (!searchVal) return true;
        return (item.container_number || '').toLowerCase().includes(searchVal) ||
               (item.trip_code || '').toLowerCase().includes(searchVal) ||
               (item.customer_name || '').toLowerCase().includes(searchVal) ||
               (item.shipping_line || '').toLowerCase().includes(searchVal) ||
               (item.location_type || '').toLowerCase().includes(searchVal);
    });

    list.sort((a, b) => {
        let valA = a[rep2SortCol];
        let valB = b[rep2SortCol];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return rep2SortAsc ? -1 : 1;
        if (valA > valB) return rep2SortAsc ? 1 : -1;
        return 0;
    });

    const tbody = document.getElementById('rep2-tbody');
    const tfoot = document.getElementById('rep2-tfoot');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="p-8 text-center text-slate-400 font-medium">Không tìm thấy vỏ container nào trong kỳ theo dõi này</td></tr>`;
        if (tfoot) tfoot.innerHTML = '';
        return;
    }

    const totalFines = list.reduce((sum, item) => sum + (Number(item.estimated_fines) || 0), 0);

    tbody.innerHTML = list.map(item => {
        let statusBadge = '';
        if (item.det_status === 'OVERDUE') {
            statusBadge = `<span class="text-xs font-bold text-rose-700 uppercase">Quá hạn (${Math.abs(item.days_left)} ngày)</span>`;
        } else if (item.det_status === 'WARNING') {
            statusBadge = `<span class="text-xs font-bold text-amber-700 uppercase">Còn ${item.days_left} ngày</span>`;
        } else {
            statusBadge = `<span class="text-xs font-bold text-emerald-700 uppercase">An toàn</span>`;
        }

        const finesFormatted = item.estimated_fines > 0
            ? `<span class="font-black text-rose-600 text-xs tabular-nums">${formatMoneyVND(item.estimated_fines)}</span>`
            : `<span class="text-slate-400 text-xs">-</span>`;

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="font-black text-slate-900 font-mono text-xs">${escapeHtml(item.container_number)} <span class="text-[10px] text-slate-400 font-normal">(${item.container_type})</span></td>
                <td><a href="javascript:void(0)" onclick="viewTripDetail('${item.trip_code}')" class="font-mono text-teal-700 hover:underline font-bold text-xs">${escapeHtml(item.trip_code)}</a></td>
                <td class="text-xs font-semibold text-slate-800">${escapeHtml(item.customer_name)}</td>
                <td class="text-xs font-medium text-slate-600">${escapeHtml(item.shipping_line)}</td>
                <td class="text-xs text-slate-600">${escapeHtml(item.location_type)}</td>
                <td class="text-center font-bold text-slate-700 text-xs tabular-nums">${item.det_free_days || 5} ngày</td>
                <td class="text-xs font-medium text-slate-700 tabular-nums">${escapeHtml(item.det_expiry_date)}</td>
                <td class="text-center">${statusBadge}</td>
                <td class="text-right">${finesFormatted}</td>
            </tr>
        `;
    }).join('');

    if (tfoot) {
        tfoot.innerHTML = `
            <tr class="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900">
                <td colspan="8" class="py-2.5 px-3 uppercase">TỔNG CỘNG: ${list.length} Vỏ Container Theo Dõi</td>
                <td class="text-right font-mono font-black text-rose-700 tabular-nums">${formatMoneyVND(totalFines)}</td>
            </tr>
        `;
    }
}

function toggleReport2Sort(col) {
    if (rep2SortCol === col) {
        rep2SortAsc = !rep2SortAsc;
    } else {
        rep2SortCol = col;
        rep2SortAsc = false;
    }
    applyReport2Filters();
}

// -------------------------------------------------------------
// RENDER BÁO CÁO 3: ĐÚNG GIỜ & CHẤT LƯỢNG DỊCH VỤ (OTP / SLA)
// -------------------------------------------------------------
function renderReport3(data) {
    const r3 = data.report3_on_time_performance || {};

    const elOtp = document.getElementById('rep3-stat-otp');
    if (elOtp) elOtp.innerText = `${r3.otp_rate || 0.0}%`;

    const elPickup = document.getElementById('rep3-stat-pickup');
    if (elPickup) elPickup.innerText = `${r3.pickup_on_time || 0} Chuyến`;

    const elArrival = document.getElementById('rep3-stat-arrival');
    if (elArrival) elArrival.innerText = `${r3.arrival_on_time || 0} Chuyến`;

    const elClosing = document.getElementById('rep3-stat-closing');
    if (elClosing) elClosing.innerText = `${r3.closing_on_time || 0} Chuyến`;

    rep3DataCache = r3.trips || [];
    applyReport3Filters();
}

function applyReport3Filters() {
    const searchVal = (document.getElementById('filter-rep3-search')?.value || '').toLowerCase().trim();
    let list = rep3DataCache.filter(item => {
        if (!searchVal) return true;
        return (item.trip_code || '').toLowerCase().includes(searchVal) ||
               (item.customer_name || '').toLowerCase().includes(searchVal) ||
               (item.route || '').toLowerCase().includes(searchVal) ||
               (item.driver_name || '').toLowerCase().includes(searchVal) ||
               (item.delay_reason || '').toLowerCase().includes(searchVal);
    });

    list.sort((a, b) => {
        let valA = a[rep3SortCol];
        let valB = b[rep3SortCol];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return rep3SortAsc ? -1 : 1;
        if (valA > valB) return rep3SortAsc ? 1 : -1;
        return 0;
    });

    const tbody = document.getElementById('rep3-tbody');
    const tfoot = document.getElementById('rep3-tfoot');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="p-8 text-center text-slate-400 font-medium">Không tìm thấy dữ liệu vận hành trong kỳ đã chọn</td></tr>`;
        if (tfoot) tfoot.innerHTML = '';
        return;
    }

    const onTimeCount = list.filter(i => i.is_on_time).length;
    const otpPercent = list.length > 0 ? ((onTimeCount / list.length) * 100).toFixed(1) : '0.0';

    tbody.innerHTML = list.map(item => {
        const onTimeBadge = item.is_on_time
            ? `<span class="text-xs font-bold text-emerald-700 uppercase">Đúng Hẹn</span>`
            : `<span class="text-xs font-bold text-rose-700 uppercase">Trễ Hẹn</span>`;

        const reasonText = !item.is_on_time
            ? `<span class="text-xs font-semibold text-rose-700">${escapeHtml(item.delay_reason)}</span>`
            : `<span class="text-slate-400 text-xs">-</span>`;

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td><a href="javascript:void(0)" onclick="viewTripDetail('${item.trip_code}')" class="font-mono text-teal-700 hover:underline font-bold text-xs">${escapeHtml(item.trip_code)}</a></td>
                <td class="text-xs font-semibold text-slate-800">${escapeHtml(item.customer_name)}</td>
                <td class="text-xs text-slate-600 max-w-xs truncate" title="${escapeHtml(item.route)}">${escapeHtml(item.route)}</td>
                <td class="text-xs text-slate-700">${escapeHtml(item.driver_name)} <span class="font-mono text-slate-400 font-normal">(${escapeHtml(item.vehicle)})</span></td>
                <td class="text-xs font-mono text-slate-800">${escapeHtml(item.loading_time)}</td>
                <td class="text-xs font-mono font-bold text-slate-900">${escapeHtml(item.gate_in_time)}</td>
                <td class="text-xs font-mono text-slate-500">${escapeHtml(item.closing_time)}</td>
                <td class="text-center">${onTimeBadge}</td>
                <td>${reasonText}</td>
            </tr>
        `;
    }).join('');

    if (tfoot) {
        tfoot.innerHTML = `
            <tr class="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900">
                <td colspan="7" class="py-2.5 px-3 uppercase">TỔNG CỘNG: ${list.length} Chuyến Vận Hành</td>
                <td class="text-center font-mono font-black text-emerald-700 tabular-nums">${otpPercent}% ĐÚNG HẸN (${onTimeCount}/${list.length})</td>
                <td class="text-center font-mono font-bold text-rose-700 tabular-nums">${list.length - onTimeCount} Trễ hẹn</td>
            </tr>
        `;
    }
}

function toggleReport3Sort(col) {
    if (rep3SortCol === col) {
        rep3SortAsc = !rep3SortAsc;
    } else {
        rep3SortCol = col;
        rep3SortAsc = false;
    }
    applyReport3Filters();
}

// -------------------------------------------------------------
// RENDER BÁO CÁO 4: ĐỐI SOÁT CHI PHÍ TUYẾN & HOÀN CHI HỘ
// -------------------------------------------------------------
function renderReport4(data) {
    const r4 = data.report4_expenses_reimbursement || {};

    const elBot = document.getElementById('rep4-stat-bot');
    if (elBot) elBot.innerText = formatMoneyVND(r4.total_bot || 0);

    const elFuel = document.getElementById('rep4-stat-fuel');
    if (elFuel) elFuel.innerText = formatMoneyVND(r4.total_fuel || 0);

    const elReimb = document.getElementById('rep4-stat-reimbursable');
    if (elReimb) elReimb.innerText = formatMoneyVND(r4.total_reimbursable || 0);

    const elPending = document.getElementById('rep4-stat-pending-reimb');
    if (elPending) elPending.innerText = formatMoneyVND(r4.pending_reimbursement || 0);

    rep4DataCache = r4.items || [];
    applyReport4Filters();
}

function applyReport4Filters() {
    const searchVal = (document.getElementById('filter-rep4-search')?.value || '').toLowerCase().trim();
    let list = rep4DataCache.filter(item => {
        if (!searchVal) return true;
        return (item.trip_code || '').toLowerCase().includes(searchVal) ||
               (item.customer_name || '').toLowerCase().includes(searchVal) ||
               (item.expense_name || '').toLowerCase().includes(searchVal) ||
               (item.expense_type || '').toLowerCase().includes(searchVal) ||
               (item.invoice_number || '').toLowerCase().includes(searchVal);
    });

    list.sort((a, b) => {
        let valA = a[rep4SortCol];
        let valB = b[rep4SortCol];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return rep4SortAsc ? -1 : 1;
        if (valA > valB) return rep4SortAsc ? 1 : -1;
        return 0;
    });

    const tbody = document.getElementById('rep4-tbody');
    const tfoot = document.getElementById('rep4-tfoot');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-slate-400 font-medium">Không có khoản chi hộ nào phát sinh trong kỳ này</td></tr>`;
        if (tfoot) tfoot.innerHTML = '';
        return;
    }

    const totalAmount = list.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const settledAmount = list.filter(i => i.is_settled).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const pendingAmount = totalAmount - settledAmount;

    tbody.innerHTML = list.map(item => {
        const settleBadge = item.is_settled
            ? `<span class="text-xs font-bold text-emerald-700 uppercase">Đã thu hồi</span>`
            : `<span class="text-xs font-bold text-rose-700 uppercase">Chờ khách trả</span>`;

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td><a href="javascript:void(0)" onclick="viewTripDetail('${item.trip_code}')" class="font-mono text-teal-700 hover:underline font-bold text-xs">${escapeHtml(item.trip_code)}</a></td>
                <td class="text-xs font-semibold text-slate-800">${escapeHtml(item.customer_name)}</td>
                <td class="text-xs font-bold text-slate-900">${escapeHtml(item.expense_name)}</td>
                <td class="text-xs text-slate-600">${escapeHtml(item.expense_type)}</td>
                <td class="text-right font-black text-slate-900 text-xs tabular-nums">${formatMoneyVND(item.amount)}</td>
                <td class="text-xs font-mono text-slate-600">${escapeHtml(item.invoice_number)}</td>
                <td class="text-xs text-slate-600 tabular-nums">${escapeHtml(item.date)}</td>
                <td class="text-center">${settleBadge}</td>
            </tr>
        `;
    }).join('');

    if (tfoot) {
        tfoot.innerHTML = `
            <tr class="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900">
                <td colspan="4" class="py-2.5 px-3 uppercase">TỔNG CỘNG: ${list.length} Khoản Chi Hộ</td>
                <td class="text-right font-mono font-black text-slate-900 tabular-nums">${formatMoneyVND(totalAmount)}</td>
                <td colspan="3" class="text-right font-mono font-bold text-slate-600 tabular-nums">
                    <span class="text-emerald-700">Đã thu: ${formatMoneyVND(settledAmount)}</span> · 
                    <span class="text-rose-700 font-black">Chờ thu: ${formatMoneyVND(pendingAmount)}</span>
                </td>
            </tr>
        `;
    }
}

function toggleReport4Sort(col) {
    if (rep4SortCol === col) {
        rep4SortAsc = !rep4SortAsc;
    } else {
        rep4SortCol = col;
        rep4SortAsc = false;
    }
    applyReport4Filters();
}

// -------------------------------------------------------------
// RENDER BÁO CÁO 5: BÀN GIAO CẮT KÉO & LƯU XE SAU 0H
// -------------------------------------------------------------
function renderReport5(data) {
    const r5 = data.report5_drop_hook_and_layover || {};

    const elCount = document.getElementById('rep5-stat-overnight-count');
    if (elCount) elCount.innerText = `${r5.overnight_trips_count || 0} Chuyến`;

    const elFees = document.getElementById('rep5-stat-detention-fees');
    if (elFees) elFees.innerText = formatMoneyVND(r5.total_detention_fees || 0);

    const elAllow = document.getElementById('rep5-stat-allowances');
    if (elAllow) elAllow.innerText = formatMoneyVND(r5.total_overnight_allowances || 0);

    rep5DataCache = r5.records || [];
    applyReport5Filters();
}

function applyReport5Filters() {
    const searchVal = (document.getElementById('filter-rep5-search')?.value || '').toLowerCase().trim();
    let list = rep5DataCache.filter(item => {
        if (!searchVal) return true;
        return (item.trip_code || '').toLowerCase().includes(searchVal) ||
               (item.customer_name || '').toLowerCase().includes(searchVal) ||
               (item.container_number || '').toLowerCase().includes(searchVal) ||
               (item.driver_leg1 || '').toLowerCase().includes(searchVal) ||
               (item.driver_leg2 || '').toLowerCase().includes(searchVal) ||
               (item.reason || '').toLowerCase().includes(searchVal);
    });

    list.sort((a, b) => {
        let valA = a[rep5SortCol];
        let valB = b[rep5SortCol];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return rep5SortAsc ? -1 : 1;
        if (valA > valB) return rep5SortAsc ? 1 : -1;
        return 0;
    });

    const tbody = document.getElementById('rep5-tbody');
    const tfoot = document.getElementById('rep5-tfoot');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="13" class="p-8 text-center text-slate-400 font-medium">Không có chuyến cắt kéo hoặc neo xe qua đêm nào trong kỳ</td></tr>`;
        if (tfoot) tfoot.innerHTML = '';
        return;
    }

    const totalWaitHours = list.reduce((sum, item) => sum + (Number(item.wait_hours) || 0), 0);
    const totalDetFee = list.reduce((sum, item) => sum + (Number(item.detention_fee) || 0), 0);
    const totalAllowance = list.reduce((sum, item) => sum + (Number(item.driver_allowance) || 0), 0);

    tbody.innerHTML = list.map(item => {
        const typeBadge = item.is_split_trip
            ? `<span class="text-xs font-bold text-indigo-700 uppercase">Cắt Kéo Đổi Xe</span>`
            : `<span class="text-xs font-bold text-amber-700 uppercase">Lưu Xe Sau 0H</span>`;

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td><a href="javascript:void(0)" onclick="viewTripDetail('${item.trip_code}')" class="font-mono text-teal-700 hover:underline font-bold text-xs">${escapeHtml(item.trip_code)}</a></td>
                <td class="text-xs font-semibold text-slate-800">${escapeHtml(item.customer_name)}</td>
                <td class="text-xs font-mono font-bold text-slate-900">${escapeHtml(item.container_number)}</td>
                <td>${typeBadge}</td>
                <td class="text-xs text-slate-700">${escapeHtml(item.driver_leg1)} <span class="font-mono text-slate-400">(${escapeHtml(item.vehicle_leg1)})</span></td>
                <td class="text-xs text-slate-700">${escapeHtml(item.driver_leg2)} <span class="font-mono text-slate-400">(${escapeHtml(item.vehicle_leg2)})</span></td>
                <td class="text-xs font-mono text-slate-700">${escapeHtml(item.gate_out_time)}</td>
                <td class="text-xs font-mono font-bold text-amber-700">${escapeHtml(item.appointment_dropoff)}</td>
                <td class="text-xs font-mono text-slate-700">${escapeHtml(item.actual_dropoff)}</td>
                <td class="text-center font-black text-slate-900 text-xs tabular-nums">${item.wait_hours}h</td>
                <td class="text-right font-black text-teal-800 text-xs tabular-nums">${formatMoneyVND(item.detention_fee)}</td>
                <td class="text-right font-black text-indigo-700 text-xs tabular-nums">${formatMoneyVND(item.driver_allowance)}</td>
                <td class="text-xs text-slate-600 max-w-xs truncate" title="${escapeHtml(item.reason)}">${escapeHtml(item.reason)}</td>
            </tr>
        `;
    }).join('');

    if (tfoot) {
        tfoot.innerHTML = `
            <tr class="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900">
                <td colspan="9" class="py-2.5 px-3 uppercase">TỔNG CỘNG: ${list.length} Chuyến Bàn Giao Cắt Kéo / Neo Xe</td>
                <td class="text-center font-mono font-black tabular-nums">${totalWaitHours}h</td>
                <td class="text-right font-mono font-black text-teal-800 tabular-nums">${formatMoneyVND(totalDetFee)}</td>
                <td class="text-right font-mono font-black text-indigo-700 tabular-nums">${formatMoneyVND(totalAllowance)}</td>
                <td></td>
            </tr>
        `;
    }
}

function toggleReport5Sort(col) {
    if (rep5SortCol === col) {
        rep5SortAsc = !rep5SortAsc;
    } else {
        rep5SortCol = col;
        rep5SortAsc = false;
    }
    applyReport5Filters();
}

// -------------------------------------------------------------
// RENDER BÁO CÁO 6: NGOẠI LỆ & SỰ CỐ HIỆN TRƯỜNG (OS&D)
// -------------------------------------------------------------
function renderReport6(data) {
    const r6 = data.report6_osd_exceptions || {};

    const elDamaged = document.getElementById('rep6-stat-damaged');
    if (elDamaged) elDamaged.innerText = `${r6.damaged_cont_count || 0} Trường hợp`;

    const elSeal = document.getElementById('rep6-stat-seal');
    if (elSeal) elSeal.innerText = `${r6.broken_seal_count || 0} Vụ việc`;

    rep6DataCache = r6.incidents || [];
    applyReport6Filters();
}

function applyReport6Filters() {
    const searchVal = (document.getElementById('filter-rep6-search')?.value || '').toLowerCase().trim();
    let list = rep6DataCache.filter(item => {
        if (!searchVal) return true;
        return (item.trip_code || '').toLowerCase().includes(searchVal) ||
               (item.customer_name || '').toLowerCase().includes(searchVal) ||
               (item.container_number || '').toLowerCase().includes(searchVal) ||
               (item.seal_number || '').toLowerCase().includes(searchVal) ||
               (item.incident_type || '').toLowerCase().includes(searchVal) ||
               (item.description || '').toLowerCase().includes(searchVal);
    });

    list.sort((a, b) => {
        let valA = a[rep6SortCol];
        let valB = b[rep6SortCol];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return rep6SortAsc ? -1 : 1;
        if (valA > valB) return rep6SortAsc ? 1 : -1;
        return 0;
    });

    const tbody = document.getElementById('rep6-tbody');
    const tfoot = document.getElementById('rep6-tfoot');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="p-8 text-center text-slate-400 font-medium">Không có sự cố hoặc ngoại lệ OS&D nào được ghi nhận</td></tr>`;
        if (tfoot) tfoot.innerHTML = '';
        return;
    }

    const totalDamage = list.reduce((sum, item) => sum + (Number(item.estimated_damage) || 0), 0);

    tbody.innerHTML = list.map(item => {
        const podLink = item.has_pod_photo
            ? `<span class="inline-flex items-center gap-1 text-teal-700 font-bold text-xs"><i class="ph-bold ph-image"></i> Đã chụp ảnh</span>`
            : `<span class="text-slate-400 text-xs">Chưa có</span>`;

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td><a href="javascript:void(0)" onclick="viewTripDetail('${item.trip_code}')" class="font-mono text-teal-700 hover:underline font-bold text-xs">${escapeHtml(item.trip_code)}</a></td>
                <td class="text-xs text-slate-600 tabular-nums">${escapeHtml(item.date)}</td>
                <td class="text-xs font-semibold text-slate-800">${escapeHtml(item.customer_name)}</td>
                <td class="text-xs font-mono font-bold text-slate-900">${escapeHtml(item.container_number)}</td>
                <td class="text-xs font-mono text-slate-600">${escapeHtml(item.seal_number || '-')}</td>
                <td class="text-xs font-bold text-rose-700">${escapeHtml(item.incident_type)}</td>
                <td class="text-xs text-slate-600 max-w-sm truncate" title="${escapeHtml(item.description)}">${escapeHtml(item.description)}</td>
                <td class="text-right font-black text-rose-600 text-xs tabular-nums">${formatMoneyVND(item.estimated_damage)}</td>
                <td class="text-center">${podLink}</td>
                <td class="text-xs font-medium text-amber-700">${escapeHtml(item.settlement_status)}</td>
            </tr>
        `;
    }).join('');

    if (tfoot) {
        tfoot.innerHTML = `
            <tr class="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900">
                <td colspan="7" class="py-2.5 px-3 uppercase">TỔNG CỘNG: ${list.length} Vụ Việc Sự Cố & Ngoại Lệ OS&D</td>
                <td class="text-right font-mono font-black text-rose-700 tabular-nums">${formatMoneyVND(totalDamage)}</td>
                <td colspan="2"></td>
            </tr>
        `;
    }
}

function toggleReport6Sort(col) {
    if (rep6SortCol === col) {
        rep6SortAsc = !rep6SortAsc;
    } else {
        rep6SortCol = col;
        rep6SortAsc = false;
    }
    applyReport6Filters();
}

// -------------------------------------------------------------
// RENDER BÁO CÁO 7: PHÂN TÍCH DOANH THU KHÁCH HÀNG & SẢN LƯỢNG TEU
// -------------------------------------------------------------
function renderReport7(data) {
    const r7 = data.report7_customer_analytics || {};
    const canViewFinance = (data.can_view_finance !== false);

    const elTeu = document.getElementById('rep7-stat-teu');
    if (elTeu) elTeu.innerText = `${r7.total_system_teu || 0.0} TEU`;

    const elRev = document.getElementById('rep7-stat-rev');
    if (elRev) elRev.innerText = canViewFinance ? formatMoneyVND(r7.total_customer_revenue || 0) : '*** (Bảo mật)';

    const elTop = document.getElementById('rep7-stat-top');
    if (elTop) elTop.innerText = r7.top_key_account || '-';

    const elTopShare = document.getElementById('rep7-stat-top-share');
    if (elTopShare) elTopShare.innerText = canViewFinance ? `Đóng góp ${r7.top_key_account_share || 0.0}% doanh thu` : 'Tỷ trọng: Nội bộ BGD';

    const elAvg = document.getElementById('rep7-stat-avg');
    if (elAvg) elAvg.innerText = `${r7.avg_teu_per_trip || 0.0} TEU`;

    rep7DataCache = r7.customers || [];
    rep7DataCache._can_view_finance = canViewFinance;
    applyReport7Filters();
}

function applyReport7Filters() {
    const canViewFinance = (rep7DataCache._can_view_finance !== false);
    const searchVal = (document.getElementById('filter-rep7-search')?.value || '').toLowerCase().trim();

    let list = rep7DataCache.filter(item => {
        if (!searchVal) return true;
        return (item.customer_name || '').toLowerCase().includes(searchVal) ||
               (item.customer_code || '').toLowerCase().includes(searchVal) ||
               (item.top_route || '').toLowerCase().includes(searchVal);
    });

    list.sort((a, b) => {
        let valA = a[rep7SortCol];
        let valB = b[rep7SortCol];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return rep7SortAsc ? -1 : 1;
        if (valA > valB) return rep7SortAsc ? 1 : -1;
        return 0;
    });

    const tbody = document.getElementById('rep7-tbody');
    const tfoot = document.getElementById('rep7-tfoot');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" class="p-8 text-center text-slate-400 font-medium">Không tìm thấy dữ liệu khách hàng phù hợp</td></tr>`;
        if (tfoot) tfoot.innerHTML = '';
        return;
    }

    const totalTrips = list.reduce((sum, item) => sum + (Number(item.trips_count) || 0), 0);
    const totalTeu = list.reduce((sum, item) => sum + (Number(item.total_teu) || 0), 0);
    const total20 = list.reduce((sum, item) => sum + (Number(item.teu_20_count) || 0), 0);
    const total40 = list.reduce((sum, item) => sum + (Number(item.teu_40_count) || 0), 0);
    const total45 = list.reduce((sum, item) => sum + (Number(item.teu_45_count) || 0), 0);
    const totalRev = list.reduce((sum, item) => sum + (Number(item.revenue) || 0), 0);
    const avgMargin = list.length > 0 ? (list.reduce((sum, item) => sum + (Number(item.margin_percent) || 0), 0) / list.length).toFixed(1) : '0.0';

    tbody.innerHTML = list.map(item => {
        const revDisplay = canViewFinance ? formatMoneyVND(item.revenue) : '***';
        const shareDisplay = canViewFinance ? `${item.revenue_share}%` : '***';
        const marginDisplay = canViewFinance ? `${item.margin_percent}%` : '***';

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="font-bold text-slate-900 text-xs">${escapeHtml(item.customer_name)}</td>
                <td class="font-mono text-slate-500 text-xs">${escapeHtml(item.customer_code)}</td>
                <td class="text-center font-bold text-slate-800 text-xs tabular-nums">${item.trips_count}</td>
                <td class="text-center font-black text-teal-800 text-xs tabular-nums bg-teal-50/50">${item.total_teu}</td>
                <td class="text-center text-slate-600 text-xs tabular-nums">${item.teu_20_count}</td>
                <td class="text-center text-slate-600 text-xs tabular-nums">${item.teu_40_count}</td>
                <td class="text-center text-slate-600 text-xs tabular-nums">${item.teu_45_count}</td>
                <td class="text-xs text-slate-600 max-w-xs truncate" title="${escapeHtml(item.top_route)}">${escapeHtml(item.top_route)}</td>
                <td class="text-right font-black text-indigo-700 text-xs tabular-nums">${revDisplay}</td>
                <td class="text-center font-bold text-slate-700 text-xs tabular-nums">${shareDisplay}</td>
                <td class="text-center text-xs tabular-nums font-bold ${item.margin_percent >= 20 ? 'text-emerald-700' : 'text-slate-600'}">${marginDisplay}</td>
            </tr>
        `;
    }).join('');

    if (tfoot) {
        tfoot.innerHTML = `
            <tr class="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900">
                <td colspan="2" class="py-2.5 px-3 uppercase">TỔNG CỘNG: ${list.length} Khách Hàng</td>
                <td class="text-center font-mono font-black tabular-nums">${totalTrips}</td>
                <td class="text-center font-mono font-black text-teal-800 bg-teal-50/80 tabular-nums">${totalTeu.toFixed(1)}</td>
                <td class="text-center font-mono font-bold tabular-nums">${total20}</td>
                <td class="text-center font-mono font-bold tabular-nums">${total40}</td>
                <td class="text-center font-mono font-bold tabular-nums">${total45}</td>
                <td></td>
                <td class="text-right font-mono font-black text-indigo-700 tabular-nums">${canViewFinance ? formatMoneyVND(totalRev) : '***'}</td>
                <td class="text-center font-mono font-bold tabular-nums">100.0%</td>
                <td class="text-center font-mono font-bold tabular-nums">${canViewFinance ? `${avgMargin}%` : '***'}</td>
            </tr>
        `;
    }
}

function toggleReport7Sort(col) {
    if (rep7SortCol === col) {
        rep7SortAsc = !rep7SortAsc;
    } else {
        rep7SortCol = col;
        rep7SortAsc = false;
    }
    applyReport7Filters();
}

// -------------------------------------------------------------
// RENDER BÁO CÁO 8: QUYẾT TOÁN & CÔNG NỢ NHÀ XE THẦU PHỤ 3PL
// -------------------------------------------------------------
function renderReport8(data) {
    const r8 = data.report8_subcontractor_settlements || {};
    const canViewFinance = (data.can_view_finance !== false);

    const elTrips = document.getElementById('rep8-stat-trips');
    if (elTrips) elTrips.innerText = `${r8.total_subcontractor_trips || 0} Chuyến`;

    const elGross = document.getElementById('rep8-stat-gross');
    if (elGross) elGross.innerText = canViewFinance ? formatMoneyVND(r8.total_gross_payable || 0) : '*** (Bảo mật)';

    const elSettled = document.getElementById('rep8-stat-settled');
    if (elSettled) elSettled.innerText = canViewFinance ? formatMoneyVND(r8.total_subcontractor_settled || 0) : '*** (Bảo mật)';

    const elBalance = document.getElementById('rep8-stat-balance');
    if (elBalance) elBalance.innerText = canViewFinance ? formatMoneyVND(r8.total_balance_due || 0) : '*** (Bảo mật)';

    rep8SubcontractorsCache = r8.subcontractors || [];
    rep8SubcontractorsCache._can_view_finance = canViewFinance;
    rep8TripsCache = r8.trips || [];
    rep8TripsCache._can_view_finance = canViewFinance;

    applyReport8Filters();
}

function toggleReport8SubSort(col) {
    if (rep8SubSortCol === col) {
        rep8SubSortAsc = !rep8SubSortAsc;
    } else {
        rep8SubSortCol = col;
        rep8SubSortAsc = false;
    }
    applyReport8Filters();
}

function toggleReport8TripSort(col) {
    if (rep8TripSortCol === col) {
        rep8TripSortAsc = !rep8TripSortAsc;
    } else {
        rep8TripSortCol = col;
        rep8TripSortAsc = false;
    }
    applyReport8Filters();
}

function applyReport8Filters() {
    const canViewFinance = (rep8SubcontractorsCache._can_view_finance !== false);
    const searchVal = (document.getElementById('filter-rep8-search')?.value || '').toLowerCase().trim();

    // 1. Render Bảng Nhà xe thầu phụ
    let subList = rep8SubcontractorsCache.filter(item => {
        if (!searchVal) return true;
        return (item.subcontractor_name || '').toLowerCase().includes(searchVal) ||
               (item.contact_info || '').toLowerCase().includes(searchVal) ||
               (item.bank_info || '').toLowerCase().includes(searchVal);
    });

    subList.sort((a, b) => {
        let valA = a[rep8SubSortCol];
        let valB = b[rep8SubSortCol];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return rep8SubSortAsc ? -1 : 1;
        if (valA > valB) return rep8SubSortAsc ? 1 : -1;
        return 0;
    });

    const subTbody = document.getElementById('rep8-subcontractors-tbody');
    const subTfoot = document.getElementById('rep8-subcontractors-tfoot');
    if (subTbody) {
        if (subList.length === 0) {
            subTbody.innerHTML = `<tr><td colspan="9" class="p-8 text-center text-slate-400 font-medium">Không tìm thấy nhà xe thầu phụ nào trong kỳ</td></tr>`;
            if (subTfoot) subTfoot.innerHTML = '';
        } else {
            const sumTrips = subList.reduce((sum, item) => sum + (Number(item.trips_count) || 0), 0);
            const sumGross = subList.reduce((sum, item) => sum + (Number(item.gross_payable) || 0), 0);
            const sumAdv = subList.reduce((sum, item) => sum + (Number(item.advance_amount) || 0), 0);
            const sumSettled = subList.reduce((sum, item) => sum + (Number(item.settled_amount) || 0), 0);
            const sumBal = subList.reduce((sum, item) => sum + (Number(item.balance_due) || 0), 0);

            subTbody.innerHTML = subList.map(s => {
                const grossDisp = canViewFinance ? formatMoneyVND(s.gross_payable) : '***';
                const advDisp = canViewFinance ? formatMoneyVND(s.advance_amount) : '***';
                const settledDisp = canViewFinance ? formatMoneyVND(s.settled_amount) : '***';
                const balDisp = canViewFinance ? formatMoneyVND(s.balance_due) : '***';

                let statusBadge = s.balance_due <= 0
                    ? `<span class="text-xs font-bold text-emerald-700 uppercase">Đã quyết toán</span>`
                    : `<span class="text-xs font-bold text-amber-700 uppercase">${escapeHtml(s.settlement_status)}</span>`;

                return `
                    <tr class="hover:bg-slate-50 transition-colors">
                        <td class="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            <i class="ph-bold ph-handshake text-indigo-600"></i>
                            <span>${escapeHtml(s.subcontractor_name)}</span>
                        </td>
                        <td class="text-xs text-slate-600">${escapeHtml(s.contact_info || '-')}</td>
                        <td class="text-xs font-mono text-slate-700 max-w-xs truncate" title="${escapeHtml(s.bank_info)}">${escapeHtml(s.bank_info || '-')}</td>
                        <td class="text-center font-bold text-slate-800 text-xs tabular-nums">${s.trips_count}</td>
                        <td class="text-right font-black text-slate-800 text-xs tabular-nums">${grossDisp}</td>
                        <td class="text-right text-xs text-slate-600 tabular-nums">${advDisp}</td>
                        <td class="text-right text-xs font-bold text-emerald-700 tabular-nums">${settledDisp}</td>
                        <td class="text-right font-black text-rose-700 text-xs tabular-nums bg-rose-50/40">${balDisp}</td>
                        <td class="text-center">${statusBadge}</td>
                    </tr>
                `;
            }).join('');

            if (subTfoot) {
                subTfoot.innerHTML = `
                    <tr class="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900">
                        <td colspan="3" class="py-2.5 px-3 uppercase">TỔNG CỘNG: ${subList.length} Nhà Xe Thầu Phụ</td>
                        <td class="text-center font-mono font-black tabular-nums">${sumTrips}</td>
                        <td class="text-right font-mono font-black tabular-nums text-slate-900">${canViewFinance ? formatMoneyVND(sumGross) : '***'}</td>
                        <td class="text-right font-mono font-bold tabular-nums text-slate-600">${canViewFinance ? formatMoneyVND(sumAdv) : '***'}</td>
                        <td class="text-right font-mono font-bold tabular-nums text-emerald-700">${canViewFinance ? formatMoneyVND(sumSettled) : '***'}</td>
                        <td class="text-right font-mono font-black tabular-nums text-rose-700 bg-rose-50/80">${canViewFinance ? formatMoneyVND(sumBal) : '***'}</td>
                        <td></td>
                    </tr>
                `;
            }
        }
    }

    // 2. Render Bảng chi tiết chuyến xe ngoài
    const tripsTbody = document.getElementById('rep8-trips-tbody');
    const tripsTfoot = document.getElementById('rep8-trips-tfoot');
    if (tripsTbody) {
        let tripList = rep8TripsCache.filter(item => {
            if (!searchVal) return true;
            return (item.trip_code || '').toLowerCase().includes(searchVal) ||
                   (item.subcontractor_name || '').toLowerCase().includes(searchVal) ||
                   (item.vehicle || '').toLowerCase().includes(searchVal) ||
                   (item.driver || '').toLowerCase().includes(searchVal) ||
                   (item.route || '').toLowerCase().includes(searchVal) ||
                   (item.container_number || '').toLowerCase().includes(searchVal);
        });

        tripList.sort((a, b) => {
            let valA = a[rep8TripSortCol];
            let valB = b[rep8TripSortCol];
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            if (valA < valB) return rep8TripSortAsc ? -1 : 1;
            if (valA > valB) return rep8TripSortAsc ? 1 : -1;
            return 0;
        });

        if (tripList.length === 0) {
            tripsTbody.innerHTML = `<tr><td colspan="11" class="p-8 text-center text-slate-400 font-medium">Không có chuyến xe ngoài nào được tìm thấy</td></tr>`;
            if (tripsTfoot) tripsTfoot.innerHTML = '';
        } else {
            const sumGross = tripList.reduce((sum, item) => sum + (Number(item.gross_cost) || 0), 0);
            const sumAdv = tripList.reduce((sum, item) => sum + (Number(item.advance) || 0), 0);
            const sumBal = tripList.reduce((sum, item) => sum + (Number(item.balance) || 0), 0);

            tripsTbody.innerHTML = tripList.map(t => {
                const costDisp = canViewFinance ? formatMoneyVND(t.gross_cost) : '***';
                const advDisp = canViewFinance ? formatMoneyVND(t.advance) : '***';
                const balDisp = canViewFinance ? formatMoneyVND(t.balance) : '***';

                return `
                    <tr class="hover:bg-slate-50 transition-colors">
                        <td><a href="javascript:void(0)" onclick="viewTripDetail('${t.trip_code}')" class="font-mono text-teal-700 hover:underline font-bold text-xs">${escapeHtml(t.trip_code)}</a></td>
                        <td class="text-xs text-slate-600 tabular-nums">${escapeHtml(t.date)}</td>
                        <td class="text-xs font-semibold text-slate-800">${escapeHtml(t.subcontractor_name)}</td>
                        <td class="text-xs font-mono font-bold text-slate-900">${escapeHtml(t.vehicle)}</td>
                        <td class="text-xs text-slate-700">${escapeHtml(t.driver)}</td>
                        <td class="text-xs text-slate-600 max-w-xs truncate" title="${escapeHtml(t.route)}">${escapeHtml(t.route)}</td>
                        <td class="text-xs font-mono text-slate-700">${escapeHtml(t.container_number)}</td>
                        <td class="text-right font-black text-slate-800 text-xs tabular-nums">${costDisp}</td>
                        <td class="text-right text-xs text-slate-600 tabular-nums">${advDisp}</td>
                        <td class="text-right font-black text-rose-700 text-xs tabular-nums">${balDisp}</td>
                        <td class="text-center text-xs font-medium text-slate-700">${escapeHtml(t.status)}</td>
                    </tr>
                `;
            }).join('');

            if (tripsTfoot) {
                tripsTfoot.innerHTML = `
                    <tr class="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900">
                        <td colspan="7" class="py-2.5 px-3 uppercase">TỔNG CỘNG: ${tripList.length} Chuyến Xe Ngoài</td>
                        <td class="text-right font-mono font-black tabular-nums text-slate-900">${canViewFinance ? formatMoneyVND(sumGross) : '***'}</td>
                        <td class="text-right font-mono font-bold tabular-nums text-slate-600">${canViewFinance ? formatMoneyVND(sumAdv) : '***'}</td>
                        <td class="text-right font-mono font-black tabular-nums text-rose-700">${canViewFinance ? formatMoneyVND(sumBal) : '***'}</td>
                        <td></td>
                    </tr>
                `;
            }
        }
    }
}

// -------------------------------------------------------------
// RENDER BÁO CÁO 9: BẢNG LƯƠNG CHUYẾN & NĂNG SUẤT TÀI XẾ
// -------------------------------------------------------------
function renderReport9(data) {
    const r9 = data.report9_driver_payroll_performance || {};
    const canViewFinance = (data.can_view_finance !== false);

    const elFund = document.getElementById('rep9-stat-fund');
    if (elFund) elFund.innerText = canViewFinance ? formatMoneyVND(r9.total_payroll_fund || 0) : '*** (Bảo mật)';

    const elDrivers = document.getElementById('rep9-stat-drivers');
    if (elDrivers) elDrivers.innerText = `${r9.active_drivers_count || 0} Tài xế`;

    const elAvg = document.getElementById('rep9-stat-avg');
    if (elAvg) elAvg.innerText = canViewFinance ? `${formatMoneyVND(r9.avg_salary_per_driver || 0)}/TX` : '*** / TX';

    const elTop = document.getElementById('rep9-stat-top');
    if (elTop) elTop.innerText = r9.top_driver_name || '-';

    rep9DataCache = r9.drivers || [];
    rep9DataCache._can_view_finance = canViewFinance;

    applyReport9Filters();
}

function applyReport9Filters() {
    const canViewFinance = (rep9DataCache._can_view_finance !== false);
    const searchVal = (document.getElementById('filter-rep9-search')?.value || '').toLowerCase().trim();

    let list = rep9DataCache.filter(item => {
        if (!searchVal) return true;
        return (item.driver_name || '').toLowerCase().includes(searchVal) ||
               (item.driver_code || '').toLowerCase().includes(searchVal) ||
               (item.phone || '').toLowerCase().includes(searchVal);
    });

    list.sort((a, b) => {
        let valA = a[rep9SortCol];
        let valB = b[rep9SortCol];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return rep9SortAsc ? -1 : 1;
        if (valA > valB) return rep9SortAsc ? 1 : -1;
        return 0;
    });

    const tbody = document.getElementById('rep9-tbody');
    const tfoot = document.getElementById('rep9-tfoot');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" class="p-8 text-center text-slate-400 font-medium">Không tìm thấy tài xế nào trong kỳ</td></tr>`;
        if (tfoot) tfoot.innerHTML = '';
        return;
    }

    const totalTrips = list.reduce((sum, item) => sum + (Number(item.trips_count) || 0), 0);
    const totalSplit = list.reduce((sum, item) => sum + (Number(item.split_trips_count) || 0), 0);
    const totalBase = list.reduce((sum, item) => sum + (Number(item.base_trip_salary) || 0), 0);
    const totalLayover = list.reduce((sum, item) => sum + (Number(item.layover_allowance) || 0), 0);
    const totalSpecial = list.reduce((sum, item) => sum + (Number(item.special_allowances) || 0), 0);
    const totalAdv = list.reduce((sum, item) => sum + (Number(item.total_advances) || 0), 0);
    const totalNet = list.reduce((sum, item) => sum + (Number(item.net_salary) || 0), 0);
    const avgOtp = list.length > 0 ? (list.reduce((sum, item) => sum + (Number(item.otp_rate) || 0), 0) / list.length).toFixed(1) : '0.0';
    const totalIncidents = list.reduce((sum, item) => sum + (Number(item.incident_count) || 0), 0);

    tbody.innerHTML = list.map(item => {
        const baseDisp = canViewFinance ? formatMoneyVND(item.base_trip_salary) : '***';
        const layoverDisp = canViewFinance ? formatMoneyVND(item.layover_allowance) : '***';
        const specialDisp = canViewFinance ? formatMoneyVND(item.special_allowances) : '***';
        const advDisp = canViewFinance ? formatMoneyVND(item.total_advances) : '***';
        const netDisp = canViewFinance ? formatMoneyVND(item.net_salary) : '***';

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <i class="ph-bold ph-identification-badge text-teal-700"></i>
                    <span>${escapeHtml(item.driver_name)}</span>
                </td>
                <td class="font-mono text-slate-500 text-xs">${escapeHtml(item.driver_code)}</td>
                <td class="text-xs font-mono text-slate-600">${escapeHtml(item.phone)}</td>
                <td class="text-center font-bold text-slate-800 text-xs tabular-nums">${item.trips_count}</td>
                <td class="text-center text-slate-600 text-xs tabular-nums">${item.split_trips_count > 0 ? `<span class="font-bold text-teal-700">${item.split_trips_count}</span>` : '0'}</td>
                <td class="text-right text-xs font-bold text-slate-800 tabular-nums">${baseDisp}</td>
                <td class="text-right text-xs text-amber-700 tabular-nums">${layoverDisp}</td>
                <td class="text-right text-xs text-slate-600 tabular-nums">${specialDisp}</td>
                <td class="text-right text-xs text-rose-600 tabular-nums">${advDisp}</td>
                <td class="text-right font-black text-emerald-700 text-xs tabular-nums bg-emerald-50/50">${netDisp}</td>
                <td class="text-center font-bold text-xs tabular-nums ${item.otp_rate >= 90 ? 'text-emerald-700' : 'text-amber-700'}">${item.otp_rate}%</td>
                <td class="text-center text-xs tabular-nums ${item.incident_count > 0 ? 'text-rose-700 font-bold' : 'text-slate-400'}">${item.incident_count}</td>
            </tr>
        `;
    }).join('');

    if (tfoot) {
        tfoot.innerHTML = `
            <tr class="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900">
                <td colspan="3" class="py-2.5 px-3 uppercase">TỔNG CỘNG: ${list.length} Tài Xế</td>
                <td class="text-center font-mono font-black tabular-nums">${totalTrips}</td>
                <td class="text-center font-mono font-black text-teal-800 tabular-nums">${totalSplit}</td>
                <td class="text-right font-mono font-bold tabular-nums text-slate-800">${canViewFinance ? formatMoneyVND(totalBase) : '***'}</td>
                <td class="text-right font-mono font-bold tabular-nums text-amber-700">${canViewFinance ? formatMoneyVND(totalLayover) : '***'}</td>
                <td class="text-right font-mono font-medium tabular-nums text-slate-600">${canViewFinance ? formatMoneyVND(totalSpecial) : '***'}</td>
                <td class="text-right font-mono font-medium tabular-nums text-rose-600">${canViewFinance ? formatMoneyVND(totalAdv) : '***'}</td>
                <td class="text-right font-mono font-black tabular-nums text-emerald-700 bg-emerald-50/80">${canViewFinance ? formatMoneyVND(totalNet) : '***'}</td>
                <td class="text-center font-mono font-bold tabular-nums">${avgOtp}%</td>
                <td class="text-center font-mono font-black tabular-nums ${totalIncidents > 0 ? 'text-rose-700' : 'text-slate-400'}">${totalIncidents}</td>
            </tr>
        `;
    }
}

function toggleReport9Sort(col) {
    if (rep9SortCol === col) {
        rep9SortAsc = !rep9SortAsc;
    } else {
        rep9SortCol = col;
        rep9SortAsc = false;
    }
    applyReport9Filters();
}

// -------------------------------------------------------------
// RENDER BÁO CÁO 10: QUỸ TẠM ỨNG ĐIỀU VẬN (KẾ TOÁN QUẢN LÝ)
// -------------------------------------------------------------
function renderReport10(data) {
    const r10 = data.report10_dispatcher_funds || {};

    const elGranted = document.getElementById('rep10-stat-funds-granted');
    if (elGranted) elGranted.innerText = formatMoneyVND(r10.total_funds_granted || 0);

    const elCount = document.getElementById('rep10-stat-funds-count');
    if (elCount) elCount.innerText = `${r10.active_funds_count || 0} gói quỹ đang lưu hành · ${r10.settled_funds_count || 0} đã quyết toán`;

    const elDisbursed = document.getElementById('rep10-stat-disbursed');
    if (elDisbursed) elDisbursed.innerText = formatMoneyVND(r10.total_disbursed || 0);

    const elSettled = document.getElementById('rep10-stat-settled');
    if (elSettled) elSettled.innerText = formatMoneyVND(r10.total_settled_spent || 0);

    const elRefunds = document.getElementById('rep10-stat-refunds');
    if (elRefunds) elRefunds.innerText = `Thu hồi tiền thừa: ${formatMoneyVND(r10.total_refunds_returned || 0)}`;

    const elBalance = document.getElementById('rep10-stat-balance');
    if (elBalance) elBalance.innerText = formatMoneyVND(r10.remaining_balance_total || 0);

    rep10DataCache = r10.funds || [];
    applyReport10Filters();
}

function applyReport10Filters() {
    const searchVal = (document.getElementById('filter-rep10-search')?.value || '').toLowerCase().trim();

    let list = rep10DataCache.filter(item => {
        if (!searchVal) return true;
        return (item.code || '').toLowerCase().includes(searchVal) ||
               (item.dispatcher_name || '').toLowerCase().includes(searchVal) ||
               (item.dispatcher_code || '').toLowerCase().includes(searchVal) ||
               (item.notes || '').toLowerCase().includes(searchVal);
    });

    list.sort((a, b) => {
        let valA = a[rep10SortCol];
        let valB = b[rep10SortCol];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return rep10SortAsc ? -1 : 1;
        if (valA > valB) return rep10SortAsc ? 1 : -1;
        return 0;
    });

    const tbody = document.getElementById('rep10-tbody');
    const tfoot = document.getElementById('rep10-tfoot');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" class="p-8 text-center text-slate-400 font-medium">Không tìm thấy gói Quỹ Điều Vận nào trong kỳ</td></tr>`;
        if (tfoot) tfoot.innerHTML = '';
        return;
    }

    const totalAmount = list.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const totalDisbursed = list.reduce((sum, item) => sum + (Number(item.disbursed_amount) || 0), 0);
    const totalSettled = list.reduce((sum, item) => sum + (Number(item.settled_amount) || 0), 0);
    const totalRefunds = list.reduce((sum, item) => sum + (Number(item.refunds_returned) || 0), 0);
    const totalBalance = list.reduce((sum, item) => sum + (Number(item.remaining_balance) || 0), 0);
    const avgUtil = totalAmount > 0 ? ((totalDisbursed / totalAmount) * 100).toFixed(1) : '0.0';

    tbody.innerHTML = list.map(item => {
        let statusBadge = '';
        if (item.status === 'APPROVED' || item.status === 'ACTIVE') {
            statusBadge = '<span class="text-xs font-bold text-indigo-700 uppercase">Đang lưu hành</span>';
        } else if (item.status === 'SETTLED') {
            statusBadge = '<span class="text-xs font-bold text-emerald-700 uppercase">Đã quyết toán</span>';
        } else if (item.status === 'PENDING') {
            statusBadge = '<span class="text-xs font-bold text-amber-700 uppercase">Chờ duyệt xuất</span>';
        } else {
            const sLabel = item.status_label || (item.status === 'ACTIVE' ? 'Đang lưu hành' : item.status) || '—';
            statusBadge = `<span class="text-xs font-semibold text-slate-700 uppercase">${escapeHtml(sLabel)}</span>`;
        }

        const utilPercent = Math.min(100, Math.max(0, item.utilization_rate || 0));
        let barColor = 'bg-teal-600';
        if (utilPercent > 85) barColor = 'bg-rose-500';
        else if (utilPercent > 60) barColor = 'bg-amber-500';

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="font-mono font-bold text-indigo-800 text-xs flex items-center gap-1.5">
                    <i class="ph-bold ph-wallet text-indigo-600"></i>
                    <span>${escapeHtml(item.code)}</span>
                </td>
                <td class="font-bold text-slate-800 text-xs">
                    <div>${escapeHtml(item.dispatcher_name)}</div>
                    <div class="text-[10px] text-slate-400 font-mono">${escapeHtml(item.dispatcher_code)}</div>
                </td>
                <td class="text-center text-xs font-mono text-slate-600">${escapeHtml(item.advance_date)}</td>
                <td class="text-right text-xs font-bold text-slate-900 tabular-nums">${formatMoneyVND(item.amount)}</td>
                <td class="text-right text-xs font-bold text-amber-700 tabular-nums">${formatMoneyVND(item.disbursed_amount)}</td>
                <td class="text-center align-middle">
                    <div class="flex items-center gap-2 justify-center">
                        <div class="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div class="${barColor} h-1.5 rounded-full" style="width: ${utilPercent}%"></div>
                        </div>
                        <span class="text-[11px] font-bold text-slate-700 tabular-nums">${item.utilization_rate}%</span>
                    </div>
                </td>
                <td class="text-right text-xs text-slate-700 tabular-nums">${formatMoneyVND(item.settled_amount)}</td>
                <td class="text-right text-xs text-emerald-700 tabular-nums font-medium">${formatMoneyVND(item.refunds_returned)}</td>
                <td class="text-right font-black text-teal-800 text-xs tabular-nums bg-teal-50/50">${formatMoneyVND(item.remaining_balance)}</td>
                <td class="text-center text-xs">${statusBadge}</td>
                <td class="text-xs text-slate-600">
                    <div>${escapeHtml(item.approved_by || '-')}</div>
                    <div class="text-[10px] text-slate-400 font-mono">${escapeHtml(item.approved_at)}</div>
                </td>
                <td class="text-xs text-slate-500 max-w-xs truncate" title="${escapeHtml(item.notes || item.settlement_notes || '')}">
                    ${escapeHtml(item.settlement_notes || item.notes || '-')}
                </td>
            </tr>
        `;
    }).join('');

    if (tfoot) {
        tfoot.innerHTML = `
            <tr class="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900">
                <td colspan="3" class="py-2.5 px-3 uppercase">TỔNG CỘNG: ${list.length} Gói Quỹ Điều Vận</td>
                <td class="text-right font-mono font-black tabular-nums text-slate-900">${formatMoneyVND(totalAmount)}</td>
                <td class="text-right font-mono font-black tabular-nums text-amber-700">${formatMoneyVND(totalDisbursed)}</td>
                <td class="text-center font-mono font-bold tabular-nums">${avgUtil}%</td>
                <td class="text-right font-mono font-bold tabular-nums text-slate-700">${formatMoneyVND(totalSettled)}</td>
                <td class="text-right font-mono font-bold tabular-nums text-emerald-700">${formatMoneyVND(totalRefunds)}</td>
                <td class="text-right font-mono font-black tabular-nums text-teal-800 bg-teal-50/80">${formatMoneyVND(totalBalance)}</td>
                <td colspan="3"></td>
            </tr>
        `;
    }
}

function toggleReport10Sort(col) {
    if (rep10SortCol === col) {
        rep10SortAsc = !rep10SortAsc;
    } else {
        rep10SortCol = col;
        rep10SortAsc = false;
    }
    applyReport10Filters();
}


// -------------------------------------------------------------
// RENDER BÁO CÁO 11: TẠM ỨNG & CHI PHÍ PHÁT SINH TÀI XẾ (ĐIỀU VẬN QUẢN LÝ)
// -------------------------------------------------------------
function renderReport11(data) {
    const r11 = data.report11_driver_advances_expenses || {};

    const elAdvances = document.getElementById('rep11-stat-advances');
    if (elAdvances) elAdvances.innerText = formatMoneyVND(r11.total_driver_advances || 0);

    const elPendingTrips = document.getElementById('rep11-stat-pending-trips');
    if (elPendingTrips) elPendingTrips.innerText = `${r11.pending_settlement_count || 0} chuyến đang chờ hoàn ứng · ${r11.settled_count || 0} đã chốt`;

    const elActualExp = document.getElementById('rep11-stat-actual-expenses');
    if (elActualExp) elActualExp.innerText = formatMoneyVND(r11.total_actual_expenses || 0);

    const elRefund = document.getElementById('rep11-stat-refund-due');
    if (elRefund) elRefund.innerText = formatMoneyVND(r11.total_refund_due || 0);

    const elReimburse = document.getElementById('rep11-stat-reimburse-due');
    if (elReimburse) elReimburse.innerText = formatMoneyVND(r11.total_reimburse_due || 0);

    rep11DataCache = r11.trips || [];
    applyReport11Filters();
}

function applyReport11Filters() {
    const searchVal = (document.getElementById('filter-rep11-search')?.value || '').toLowerCase().trim();
    const statusVal = document.getElementById('filter-rep11-status')?.value || 'ALL';

    let list = rep11DataCache.filter(item => {
        // Lọc trạng thái
        if (statusVal === 'PENDING' && item.is_settled) return false;
        if (statusVal === 'SETTLED' && !item.is_settled) return false;

        // Tìm kiếm từ khóa
        if (!searchVal) return true;
        return (item.trip_code || '').toLowerCase().includes(searchVal) ||
               (item.advance_code || '').toLowerCase().includes(searchVal) ||
               (item.driver_name || '').toLowerCase().includes(searchVal) ||
               (item.license_plate || '').toLowerCase().includes(searchVal) ||
               (item.customer_name || '').toLowerCase().includes(searchVal) ||
               (item.route || '').toLowerCase().includes(searchVal);
    });

    list.sort((a, b) => {
        let valA = a[rep11SortCol];
        let valB = b[rep11SortCol];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return rep11SortAsc ? -1 : 1;
        if (valA > valB) return rep11SortAsc ? 1 : -1;
        return 0;
    });

    const tbody = document.getElementById('rep11-tbody');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="14" class="p-8 text-center text-slate-400 font-medium">Không tìm thấy chuyến xe nào phát sinh tạm ứng hoặc chi phí trong kỳ</td></tr>`;
        const tfoot = document.getElementById('rep11-tfoot');
        if (tfoot) tfoot.innerHTML = '';
        return;
    }

    const totalAdv = list.reduce((sum, item) => sum + (parseFloat(item.advance_amount) || 0), 0);
    const totalExp = list.reduce((sum, item) => sum + (parseFloat(item.actual_expenses) || 0), 0);
    const totalBot = list.reduce((sum, item) => sum + (parseFloat(item.bot_expense) || 0), 0);
    const totalPort = list.reduce((sum, item) => sum + (parseFloat(item.port_lift_expense) || 0), 0);
    const totalDep = list.reduce((sum, item) => sum + (parseFloat(item.deposit_expense) || 0), 0);
    const totalDiff = totalAdv - totalExp;
    const totalDocs = list.reduce((sum, item) => sum + (parseInt(item.documents_count) || 0), 0);

    const tfoot = document.getElementById('rep11-tfoot');
    if (tfoot) {
        let diffColor = 'text-slate-800';
        let diffText = '0 đ';
        if (totalDiff > 0) {
            diffColor = 'text-emerald-700 font-black';
            diffText = `+ ${formatMoneyVND(totalDiff)}`;
        } else if (totalDiff < 0) {
            diffColor = 'text-rose-700 font-black';
            diffText = `- ${formatMoneyVND(Math.abs(totalDiff))}`;
        }
        tfoot.innerHTML = `
            <tr class="bg-slate-100/90 font-bold border-t-2 border-slate-300">
                <td colspan="6" class="text-right uppercase p-2">TỔNG CỘNG: ${list.length} Chuyến Tạm Ứng:</td>
                <td class="text-right text-indigo-800 font-mono font-black p-2">${formatMoneyVND(totalAdv)}</td>
                <td class="text-right text-rose-700 font-mono font-black p-2">${formatMoneyVND(totalExp)}</td>
                <td class="text-right text-[11px] text-slate-700 p-2">
                    <span>BOT: ${formatMoneyVND(totalBot)}</span> | 
                    <span>Cảng: ${formatMoneyVND(totalPort)}</span>
                    ${totalDep > 0 ? ` | <span>Cược: ${formatMoneyVND(totalDep)}</span>` : ''}
                </td>
                <td class="text-right font-mono p-2 ${diffColor}">${diffText}</td>
                <td colspan="2" class="text-center p-2"></td>
                <td class="text-center font-bold text-teal-800 p-2">${totalDocs > 0 ? `<i class="ph-bold ph-receipt mr-0.5"></i>${totalDocs}` : '-'}</td>
                <td class="p-2"></td>
            </tr>
        `;
    }

    tbody.innerHTML = list.map(item => {
        let diffColor = 'text-slate-600';
        let diffText = '0 đ';
        if (item.difference > 0) {
            diffColor = 'text-emerald-700 bg-emerald-50/70 font-black';
            diffText = `+ ${formatMoneyVND(item.difference)}`;
        } else if (item.difference < 0) {
            diffColor = 'text-rose-700 bg-rose-50/70 font-black';
            diffText = `- ${formatMoneyVND(item.difference_abs)}`;
        }

        let actionBadge = '';
        if (item.settlement_action === 'REFUND') {
            actionBadge = '<span class="text-xs font-bold text-emerald-700 uppercase">Tài xế nộp lại</span>';
        } else if (item.settlement_action === 'REIMBURSE') {
            actionBadge = '<span class="text-xs font-bold text-amber-700 uppercase">Cty/ĐV chi bù</span>';
        } else {
            actionBadge = '<span class="text-xs font-semibold text-slate-600 uppercase">Khớp đúng</span>';
        }

        const statusBadge = item.is_settled
            ? '<span class="text-xs font-bold text-emerald-700 uppercase flex items-center gap-1 justify-center"><i class="ph-bold ph-check-circle"></i> Đã hoàn ứng</span>'
            : '<span class="text-xs font-bold text-amber-700 uppercase flex items-center gap-1 justify-center"><i class="ph-bold ph-clock"></i> Đang tạm ứng</span>';

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="font-bold text-xs">
                    <a href="javascript:void(0)" onclick="viewTripDetail('${escapeHtml(item.trip_code)}')" class="font-mono text-teal-800 hover:text-teal-900 underline flex items-center gap-1">
                        <i class="ph-bold ph-truck"></i>
                        <span>${escapeHtml(item.trip_code)}</span>
                    </a>
                    ${item.advance_code && item.advance_code !== '-' ? `<div class="text-[10px] text-slate-400 font-mono">${escapeHtml(item.advance_code)}</div>` : ''}
                </td>
                <td class="font-bold text-slate-800 text-xs">${escapeHtml(item.customer_name)}</td>
                <td class="text-xs text-slate-600 max-w-[180px] truncate" title="${escapeHtml(item.route)}">${escapeHtml(item.route)}</td>
                <td class="text-xs">
                    <div class="font-bold text-slate-900">
                        <span>${escapeHtml(item.driver_name)}</span>
                    </div>
                    <div class="text-[10px] font-mono font-bold text-teal-800 mt-0.5">${escapeHtml(item.license_plate)}</div>
                </td>
                <td class="text-center text-xs font-mono text-slate-600">${escapeHtml(item.advance_date)}</td>
                <td class="text-xs text-slate-600">
                    <span class="text-xs text-slate-700 font-medium">${escapeHtml(item.advance_source)}</span>
                </td>
                <td class="text-right text-xs font-bold text-indigo-800 tabular-nums">${formatMoneyVND(item.advance_amount)}</td>
                <td class="text-right text-xs font-bold text-rose-700 tabular-nums">${formatMoneyVND(item.actual_expenses)}</td>
                <td class="text-right text-[11px] text-slate-600 tabular-nums">
                    <span title="Vé cầu đường BOT" class="text-slate-700 font-medium">BOT: ${formatMoneyVND(item.bot_expense)}</span>
                    <span title="Nâng / hạ bãi cảng" class="text-slate-700 font-medium ml-1">· Cảng: ${formatMoneyVND(item.port_lift_expense)}</span>
                    ${item.deposit_expense > 0 ? `<span title="Cược vỏ cont" class="text-amber-800 font-medium ml-1">· Cược: ${formatMoneyVND(item.deposit_expense)}</span>` : ''}
                </td>
                <td class="text-right text-xs font-bold tabular-nums ${diffColor}">${diffText}</td>
                <td class="text-center text-xs">${actionBadge}</td>
                <td class="text-center text-xs">${statusBadge}</td>
                <td class="text-center text-xs font-bold tabular-nums">
                    ${item.documents_count > 0 
                        ? `<span class="text-xs font-bold text-teal-700 inline-flex items-center gap-1"><i class="ph-bold ph-receipt"></i> ${item.documents_count}</span>` 
                        : '<span class="text-slate-300">-</span>'}
                </td>
                <td class="text-xs text-slate-500">
                    <div>${escapeHtml(item.settled_by || '-')}</div>
                    <div class="text-[10px] text-slate-400 font-mono">${escapeHtml(item.settled_at)}</div>
                </td>
            </tr>
        `;
    }).join('');
}

function toggleReport11Sort(col) {
    if (rep11SortCol === col) {
        rep11SortAsc = !rep11SortAsc;
    } else {
        rep11SortCol = col;
        rep11SortAsc = false;
    }
    applyReport11Filters();
}


// -------------------------------------------------------------
// RENDER BÁO CÁO 12: BÁO CÁO QUYẾT TOÁN CHUYẾN XE & BACKLOG CHUYỂN KỲ
// -------------------------------------------------------------
function renderReport12(data) {
    const r12 = data.report12_settlement_backlog || {};
    const canViewFinance = (data.can_view_finance !== false);

    const elTrips = document.getElementById('rep12-stat-trips');
    if (elTrips) elTrips.innerText = `${r12.settled_trips_count || 0} / ${r12.total_trips_count || 0}`;

    const elNoteSettled = document.getElementById('rep12-note-settled');
    if (elNoteSettled) elNoteSettled.innerText = `Đã chốt sổ: ${r12.settled_trips_count || 0} · Chưa chốt: ${r12.unsettled_trips_count || 0}`;

    const elSettledRev = document.getElementById('rep12-stat-settled-rev');
    if (elSettledRev) elSettledRev.innerText = canViewFinance ? formatMoneyVND(r12.settled_revenue || 0) : '*** (Bảo mật)';

    const elSettledProfit = document.getElementById('rep12-stat-settled-profit');
    if (elSettledProfit) elSettledProfit.innerText = canViewFinance ? `Lợi nhuận chốt: ${formatMoneyVND(r12.settled_profit || 0)}` : 'Lợi nhuận: ***';

    const elUnsettledRev = document.getElementById('rep12-stat-unsettled-rev');
    if (elUnsettledRev) elUnsettledRev.innerText = canViewFinance ? formatMoneyVND(r12.unsettled_revenue || 0) : '*** (Bảo mật)';

    const elCarryover = document.getElementById('rep12-stat-carryover');
    if (elCarryover) elCarryover.innerText = `${r12.carryover_trips_count || 0} Chuyến`;

    rep12DataCache = r12.trips || [];
    rep12DataCache._can_view_finance = canViewFinance;
    applyReport12Filters();
}

function applyReport12Filters() {
    const canViewFinance = (rep12DataCache._can_view_finance !== false);
    const searchVal = (document.getElementById('filter-rep12-search')?.value || '').toLowerCase().trim();
    const statusVal = document.getElementById('filter-rep12-status')?.value || 'ALL';

    let list = rep12DataCache.filter(item => {
        if (statusVal === 'SETTLED' && !item.is_settled) return false;
        if (statusVal === 'UNSETTLED' && item.is_settled) return false;
        if (statusVal === 'CARRY_OVER' && !item.is_carry_over) return false;
        if (statusVal === 'OWNED' && item.vehicle_ownership !== 'OWNED') return false;
        if (statusVal === 'PARTNER' && item.vehicle_ownership !== 'PARTNER') return false;

        if (!searchVal) return true;
        return (item.trip_code || '').toLowerCase().includes(searchVal) ||
               (item.customer_name || '').toLowerCase().includes(searchVal) ||
               (item.vehicle_plate || '').toLowerCase().includes(searchVal) ||
               (item.driver_name || '').toLowerCase().includes(searchVal) ||
               (item.container_number || '').toLowerCase().includes(searchVal) ||
               (item.route || '').toLowerCase().includes(searchVal);
    });

    list.sort((a, b) => {
        let valA = a[rep12SortCol];
        let valB = b[rep12SortCol];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return rep12SortAsc ? -1 : 1;
        if (valA > valB) return rep12SortAsc ? 1 : -1;
        return 0;
    });

    const tbody = document.getElementById('rep12-tbody');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="15" class="p-8 text-center text-slate-400 font-medium">Không tìm thấy chuyến xe nào khớp bộ lọc</td></tr>`;
        const tfoot = document.getElementById('rep12-tfoot');
        if (tfoot) tfoot.innerHTML = '';
        return;
    }

    const totalRev = list.reduce((sum, item) => sum + (parseFloat(item.revenue) || 0), 0);
    const totalExp = list.reduce((sum, item) => sum + (parseFloat(item.expense) || 0), 0);
    const totalReim = list.reduce((sum, item) => sum + (parseFloat(item.reimbursable) || 0), 0);
    const totalProfit = list.reduce((sum, item) => sum + (parseFloat(item.profit) || 0), 0);
    const avgMargin = totalRev > 0 ? ((totalProfit / totalRev) * 100).toFixed(1) : '0.0';

    const tfoot = document.getElementById('rep12-tfoot');
    if (tfoot) {
        tfoot.innerHTML = `
            <tr class="bg-slate-100/90 font-bold border-t-2 border-slate-300">
                <td colspan="6" class="text-right uppercase p-2">TỔNG CỘNG: ${list.length} Chuyến Vận Tải:</td>
                <td class="text-right text-slate-900 font-mono font-black p-2">${canViewFinance ? formatMoneyVND(totalRev) : '***'}</td>
                <td class="text-right text-rose-700 font-mono font-black p-2">${canViewFinance ? formatMoneyVND(totalExp) : '***'}</td>
                <td class="text-right text-indigo-700 font-mono font-black p-2">${canViewFinance ? formatMoneyVND(totalReim) : '***'}</td>
                <td class="text-right text-emerald-700 font-mono font-black bg-emerald-50/40 p-2">${canViewFinance ? formatMoneyVND(totalProfit) : '***'}</td>
                <td class="text-center font-mono font-bold ${parseFloat(avgMargin) >= 20 ? 'text-emerald-700' : 'text-amber-700'} p-2">${canViewFinance ? `${avgMargin}%` : '***'}</td>
                <td colspan="4" class="p-2"></td>
            </tr>
        `;
    }

    tbody.innerHTML = list.map(item => {
        const revDisp = canViewFinance ? formatMoneyVND(item.revenue) : '***';
        const expDisp = canViewFinance ? formatMoneyVND(item.expense) : '***';
        const reimDisp = canViewFinance ? formatMoneyVND(item.reimbursable) : '***';
        const profDisp = canViewFinance ? formatMoneyVND(item.profit) : '***';

        let categoryBadge = '';
        if (item.category_tag === 'BACKLOG_SETTLED') {
            categoryBadge = '<span class="text-xs font-bold text-purple-700 uppercase">Tồn T- trước ➔ Đã Q.Toán</span>';
        } else if (item.category_tag === 'BACKLOG_PENDING') {
            categoryBadge = '<span class="text-xs font-bold text-rose-700 uppercase">Tồn T- trước ➔ Nợ Tiếp</span>';
        } else if (item.category_tag === 'CURRENT_SETTLED') {
            categoryBadge = '<span class="text-xs font-bold text-teal-700 uppercase">Trong kỳ ➔ Đã Q.Toán</span>';
        } else {
            categoryBadge = '<span class="text-xs font-bold text-amber-700 uppercase">Trong kỳ ➔ Chưa Chốt</span>';
        }

        const settlementBadge = item.is_settled
            ? '<span class="text-xs font-bold text-emerald-700 uppercase flex items-center gap-1 justify-center"><i class="ph-bold ph-check-circle"></i> Đã Quyết Toán</span>'
            : '<span class="text-xs font-bold text-amber-700 uppercase flex items-center gap-1 justify-center"><i class="ph-bold ph-hourglass"></i> Chưa Chốt</span>';

        const podBadge = item.has_pod
            ? '<span class="text-xs font-bold text-emerald-700 uppercase inline-flex items-center gap-1"><i class="ph-bold ph-file-check"></i> Đã Thu POD</span>'
            : '<span class="text-xs font-bold text-rose-700 uppercase inline-flex items-center gap-1"><i class="ph-bold ph-warning-circle"></i> Thiếu POD</span>';

        const ownershipBadge = item.vehicle_ownership === 'OWNED'
            ? '<span class="text-[10px] font-bold text-teal-700 uppercase">Xe Nhà</span>'
            : '<span class="text-[10px] font-bold text-slate-600 uppercase">Xe Bạn</span>';

        return `
            <tr class="hover:bg-slate-50 transition-colors ${item.is_carry_over ? 'bg-amber-50/20' : ''}">
                <td class="font-bold text-xs">
                    <a href="javascript:void(0)" onclick="viewTripDetail('${escapeHtml(item.trip_code)}')" class="font-mono text-teal-800 hover:text-teal-900 underline flex items-center gap-1">
                        <i class="ph-bold ph-truck"></i>
                        <span>${escapeHtml(item.trip_code)}</span>
                    </a>
                    ${item.settlement_batch_code && item.settlement_batch_code !== '-' ? `<div class="text-[10px] text-slate-400 font-mono">Đợt: ${escapeHtml(item.settlement_batch_code)}</div>` : ''}
                </td>
                <td class="text-center text-xs font-mono text-slate-600 font-bold">${escapeHtml(item.loading_date)}</td>
                <td class="text-xs font-bold text-slate-800">
                    <div>${escapeHtml(item.customer_name)}</div>
                    <div class="text-[10px] text-slate-400 font-mono">${escapeHtml(item.customer_code)}</div>
                </td>
                <td class="text-xs">
                    <div class="font-bold font-mono text-slate-900 flex items-center gap-1">
                        <span>${escapeHtml(item.vehicle_plate)}</span>
                        ${ownershipBadge}
                    </div>
                    ${item.dropoff_vehicle_plate ? `<div class="text-[10px] font-mono text-slate-500">Hạ: ${escapeHtml(item.dropoff_vehicle_plate)}</div>` : ''}
                </td>
                <td class="text-xs">
                    <div class="font-bold text-slate-900">
                        <span>${escapeHtml(item.driver_name)}</span>
                    </div>
                    ${item.dropoff_driver_name ? `<div class="text-[10px] text-slate-500">TX Hạ: ${escapeHtml(item.dropoff_driver_name)}</div>` : ''}
                </td>
                <td class="text-xs text-slate-600 max-w-[200px] truncate">
                    <div title="${escapeHtml(item.route)}">${escapeHtml(item.route)}</div>
                    <div class="text-[10px] font-mono text-slate-500">Cont: ${escapeHtml(item.container_number)}</div>
                </td>
                <td class="text-right text-xs font-bold text-slate-900 tabular-nums">${revDisp}</td>
                <td class="text-right text-xs text-rose-700 tabular-nums">${expDisp}</td>
                <td class="text-right text-xs text-indigo-700 tabular-nums">${reimDisp}</td>
                <td class="text-right text-xs font-black text-emerald-700 tabular-nums bg-emerald-50/40">${profDisp}</td>
                <td class="text-center text-xs font-bold tabular-nums ${item.margin_percent >= 20 ? 'text-emerald-700' : 'text-amber-700'}">${canViewFinance ? `${item.margin_percent}%` : '***'}</td>
                <td class="text-center text-xs">${podBadge}</td>
                <td class="text-center text-xs">${categoryBadge}</td>
                <td class="text-center text-xs">${settlementBadge}</td>
                <td class="text-xs text-slate-500">
                    <div>${escapeHtml(item.settled_by || '-')}</div>
                    <div class="text-[10px] text-slate-400 font-mono">${escapeHtml(item.settled_at)}</div>
                </td>
            </tr>
        `;
    }).join('');
}

function toggleReport12Sort(col) {
    if (rep12SortCol === col) {
        rep12SortAsc = !rep12SortAsc;
    } else {
        rep12SortCol = col;
        rep12SortAsc = false;
    }
    applyReport12Filters();
}


// -------------------------------------------------------------
// RENDER BÁO CÁO 13: BÁO CÁO THEO DÕI CÔNG NỢ PHẢI THU (AR AGING) & THU TIỀN
// -------------------------------------------------------------
let currentStatementCustomer = null;

function renderReport13(data) {
    const r13 = data.report13_ar_aging || {};
    const canViewFinance = (data.can_view_finance !== false);

    const elTotalAr = document.getElementById('rep13-stat-total-ar');
    if (elTotalAr) elTotalAr.innerText = canViewFinance ? formatMoneyVND(r13.total_receivable || 0) : '*** (Bảo mật)';

    const elRevReim = document.getElementById('rep13-stat-rev-reim');
    if (elRevReim) elRevReim.innerText = canViewFinance ? `Cước: ${formatMoneyVND(r13.total_freight_revenue || 0)} · Chi hộ: ${formatMoneyVND(r13.total_reimbursable || 0)}` : '***';

    const elCollected = document.getElementById('rep13-stat-collected');
    if (elCollected) elCollected.innerText = canViewFinance ? formatMoneyVND(r13.total_collected || 0) : '*** (Bảo mật)';

    const elBalance = document.getElementById('rep13-stat-balance');
    if (elBalance) elBalance.innerText = canViewFinance ? formatMoneyVND(r13.total_remaining_balance || 0) : '*** (Bảo mật)';

    const elOverdue = document.getElementById('rep13-stat-overdue');
    if (elOverdue) elOverdue.innerText = canViewFinance ? formatMoneyVND(r13.total_overdue || 0) : '*** (Bảo mật)';

    rep13DataCache = r13.customers || [];
    rep13DataCache._can_view_finance = canViewFinance;
    applyReport13Filters();
}

function applyReport13Filters() {
    const canViewFinance = (rep13DataCache._can_view_finance !== false);
    const searchVal = (document.getElementById('filter-rep13-search')?.value || '').toLowerCase().trim();

    let list = rep13DataCache.filter(item => {
        if (!searchVal) return true;
        return (item.customer_name || '').toLowerCase().includes(searchVal) ||
               (item.customer_code || '').toLowerCase().includes(searchVal) ||
               (item.tax_code || '').toLowerCase().includes(searchVal) ||
               (item.contact_phone || '').toLowerCase().includes(searchVal);
    });

    list.sort((a, b) => {
        let valA = a[rep13SortCol];
        let valB = b[rep13SortCol];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return rep13SortAsc ? -1 : 1;
        if (valA > valB) return rep13SortAsc ? 1 : -1;
        return 0;
    });

    const tbody = document.getElementById('rep13-tbody');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="13" class="p-8 text-center text-slate-400 font-medium">Không tìm thấy khách hàng nào có công nợ</td></tr>`;
        const tfoot = document.getElementById('rep13-tfoot');
        if (tfoot) tfoot.innerHTML = '';
        return;
    }

    const totalTrips = list.reduce((sum, item) => sum + (parseInt(item.trips_count) || 0), 0);
    const totalSettledTrips = list.reduce((sum, item) => sum + (parseInt(item.settled_trips_count) || 0), 0);
    const totalUnsettledTrips = list.reduce((sum, item) => sum + (parseInt(item.unsettled_trips_count) || 0), 0);
    const totalFreight = list.reduce((sum, item) => sum + (parseFloat(item.freight_revenue) || 0), 0);
    const totalReim = list.reduce((sum, item) => sum + (parseFloat(item.reimbursable_amount) || 0), 0);
    const totalReceivable = list.reduce((sum, item) => sum + (parseFloat(item.total_receivable) || 0), 0);
    const totalCollected = list.reduce((sum, item) => sum + (parseFloat(item.collected_amount) || 0), 0);
    const totalBalance = list.reduce((sum, item) => sum + (parseFloat(item.remaining_balance) || 0), 0);
    const totalCurrent = list.reduce((sum, item) => sum + (parseFloat(item.aging_current) || 0), 0);
    const total31 = list.reduce((sum, item) => sum + (parseFloat(item.aging_31_60) || 0), 0);
    const total61 = list.reduce((sum, item) => sum + (parseFloat(item.aging_61_90) || 0), 0);
    const totalOver90 = list.reduce((sum, item) => sum + (parseFloat(item.aging_over_90) || 0), 0);

    const tfoot = document.getElementById('rep13-tfoot');
    if (tfoot) {
        tfoot.innerHTML = `
            <tr class="bg-slate-100/90 font-bold border-t-2 border-slate-300">
                <td class="p-2 uppercase text-slate-900 font-heading">TỔNG CỘNG: ${list.length} Khách Hàng</td>
                <td class="text-center font-bold font-mono text-slate-900 p-2">${totalTrips}</td>
                <td class="text-center font-bold text-xs p-2"><span class="text-emerald-700">${totalSettledTrips}</span> / <span class="text-amber-700">${totalUnsettledTrips}</span></td>
                <td class="text-right text-slate-900 font-mono font-bold p-2">${canViewFinance ? formatMoneyVND(totalFreight) : '***'}</td>
                <td class="text-right text-slate-700 font-mono font-bold p-2">${canViewFinance ? formatMoneyVND(totalReim) : '***'}</td>
                <td class="text-right text-slate-950 font-mono font-black p-2">${canViewFinance ? formatMoneyVND(totalReceivable) : '***'}</td>
                <td class="text-right text-emerald-700 font-mono font-black p-2">${canViewFinance ? formatMoneyVND(totalCollected) : '***'}</td>
                <td class="text-right text-indigo-700 font-mono font-black bg-indigo-50/50 p-2">${canViewFinance ? formatMoneyVND(totalBalance) : '***'}</td>
                <td class="text-right text-emerald-700 font-mono font-bold p-2">${canViewFinance ? formatMoneyVND(totalCurrent) : '***'}</td>
                <td class="text-right text-amber-700 font-mono font-bold p-2">${canViewFinance ? formatMoneyVND(total31) : '***'}</td>
                <td class="text-right text-orange-700 font-mono font-bold p-2">${canViewFinance ? formatMoneyVND(total61) : '***'}</td>
                <td class="text-right text-rose-700 font-mono font-black p-2">${canViewFinance ? formatMoneyVND(totalOver90) : '***'}</td>
                <td class="p-2"></td>
            </tr>
        `;
    }

    tbody.innerHTML = list.map(item => {
        const freightDisp = canViewFinance ? formatMoneyVND(item.freight_revenue) : '***';
        const reimDisp = canViewFinance ? formatMoneyVND(item.reimbursable_amount) : '***';
        const totalDisp = canViewFinance ? formatMoneyVND(item.total_receivable) : '***';
        const collectedDisp = canViewFinance ? formatMoneyVND(item.collected_amount) : '***';
        const balanceDisp = canViewFinance ? formatMoneyVND(item.remaining_balance) : '***';
        const currentDisp = canViewFinance ? formatMoneyVND(item.aging_current) : '***';
        const aging31Disp = canViewFinance ? formatMoneyVND(item.aging_31_60) : '***';
        const aging61Disp = canViewFinance ? formatMoneyVND(item.aging_61_90) : '***';
        const agingOver90Disp = canViewFinance ? formatMoneyVND(item.aging_over_90) : '***';

        const custIdSafe = escapeHtml(String(item.customer_id || item.customer_code || ''));

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="font-bold text-xs text-slate-900">
                    <div class="flex items-center gap-1.5 cursor-pointer text-teal-800 hover:text-teal-900" onclick="viewCustomerARStatement('${custIdSafe}')">
                        <i class="ph-bold ph-buildings text-teal-700"></i>
                        <span class="hover:underline">${escapeHtml(item.customer_name)}</span>
                    </div>
                    <div class="text-[10px] text-slate-400 font-mono">Mã: ${escapeHtml(item.customer_code)} · MST: ${escapeHtml(item.tax_code)}</div>
                </td>
                <td class="text-center font-bold text-xs tabular-nums text-slate-800">${item.trips_count}</td>
                <td class="text-center text-xs tabular-nums">
                    <span class="text-emerald-700 font-bold">${item.settled_trips_count}</span> / 
                    <span class="text-amber-700 font-bold">${item.unsettled_trips_count}</span>
                </td>
                <td class="text-right text-xs text-slate-800 tabular-nums">${freightDisp}</td>
                <td class="text-right text-xs text-slate-600 tabular-nums">${reimDisp}</td>
                <td class="text-right text-xs font-black text-slate-900 tabular-nums">${totalDisp}</td>
                <td class="text-right text-xs font-bold text-emerald-700 tabular-nums">${collectedDisp}</td>
                <td class="text-right text-xs font-black text-indigo-700 tabular-nums bg-indigo-50/50">${balanceDisp}</td>
                <td class="text-right text-xs text-emerald-700 tabular-nums">${currentDisp}</td>
                <td class="text-right text-xs text-amber-700 tabular-nums">${aging31Disp}</td>
                <td class="text-right text-xs text-orange-700 tabular-nums">${aging61Disp}</td>
                <td class="text-right text-xs font-bold text-rose-700 tabular-nums">${agingOver90Disp}</td>
                <td class="text-center">
                    <div class="flex items-center justify-center gap-1">
                        <button type="button" onclick="viewCustomerARStatement('${custIdSafe}')" class="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1" title="Xem bảng kê đối soát công nợ chi tiết (SOA)">
                            <i class="ph-bold ph-eye text-xs"></i>
                            <span>Đối Soát</span>
                        </button>
                        <button type="button" onclick="printCustomerARStatement('${custIdSafe}')" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1" title="In bảng kê đối soát công nợ A4 cho khách hàng">
                            <i class="ph-bold ph-printer text-xs"></i>
                            <span>In</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function viewCustomerARStatement(customerId) {
    const cust = rep13DataCache.find(c => String(c.customer_id) === String(customerId) || String(c.customer_code) === String(customerId));
    if (!cust) {
        showToast('Không tìm thấy dữ liệu đối soát của khách hàng', 'error');
        return;
    }
    currentStatementCustomer = cust;

    const modal = document.getElementById('modal-customer-ar-statement');
    if (!modal) return;

    // Cập nhật Header & Info
    const elHeader = document.getElementById('modal-ar-soa-customer-header');
    if (elHeader) elHeader.innerText = `Khách hàng: ${cust.customer_name} (${cust.customer_code || '-'})`;

    const elCustName = document.getElementById('modal-ar-cust-name');
    if (elCustName) elCustName.innerText = cust.customer_name;

    const elCustCode = document.getElementById('modal-ar-cust-code');
    if (elCustCode) elCustCode.innerText = cust.customer_code || '-';

    const elCustTax = document.getElementById('modal-ar-cust-tax');
    if (elCustTax) elCustTax.innerText = cust.tax_code || '-';

    const elCustPhone = document.getElementById('modal-ar-cust-phone');
    if (elCustPhone) elCustPhone.innerText = cust.contact_phone || '-';

    // Cập nhật Thẻ Tiền
    const elTotal = document.getElementById('modal-ar-cust-total');
    if (elTotal) elTotal.innerText = formatMoneyVND(cust.total_receivable || 0);

    const elSub = document.getElementById('modal-ar-cust-sub');
    if (elSub) elSub.innerText = `Cước: ${formatMoneyVND(cust.freight_revenue || 0)} · Chi hộ: ${formatMoneyVND(cust.reimbursable_amount || 0)}`;

    const elBalance = document.getElementById('modal-ar-cust-balance');
    if (elBalance) elBalance.innerText = formatMoneyVND(cust.remaining_balance || 0);

    const elCollected = document.getElementById('modal-ar-cust-collected');
    if (elCollected) elCollected.innerText = `Đã thu: ${formatMoneyVND(cust.collected_amount || 0)}`;

    const elCount = document.getElementById('modal-ar-trips-count');
    if (elCount) elCount.innerText = `${cust.trips ? cust.trips.length : 0} Vận Đơn / Chuyến Xe`;

    // Render Bảng Chuyến
    const tbody = document.getElementById('modal-ar-trips-tbody');
    const modalTfoot = document.getElementById('modal-ar-trips-tfoot');
    if (tbody) {
        const trips = cust.trips || [];
        if (trips.length === 0) {
            tbody.innerHTML = `<tr><td colspan="11" class="text-center py-6 text-slate-400 font-medium">Không có chi tiết chuyến phát sinh trong kỳ</td></tr>`;
            if (modalTfoot) modalTfoot.innerHTML = '';
        } else {
            const sumRev = trips.reduce((sum, t) => sum + (parseFloat(t.revenue) || 0), 0);
            const sumReim = trips.reduce((sum, t) => sum + (parseFloat(t.reimbursable) || 0), 0);
            const sumTotal = trips.reduce((sum, t) => sum + (parseFloat(t.total_receivable) || 0), 0);

            tbody.innerHTML = trips.map((t, idx) => `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="text-center font-bold text-slate-500">${idx + 1}</td>
                    <td class="font-bold text-teal-800 font-mono">${escapeHtml(t.trip_code)}</td>
                    <td class="text-center text-slate-700">${escapeHtml(t.loading_date)}</td>
                    <td class="text-slate-800 font-medium">${escapeHtml(t.vehicle_plate)} · <span class="text-slate-500">${escapeHtml(t.driver_name || '-')}</span></td>
                    <td class="font-mono text-slate-700">${escapeHtml(t.container_number || '-')}</td>
                    <td class="text-slate-700 truncate max-w-xs" title="${escapeHtml(t.route)}">${escapeHtml(t.route)}</td>
                    <td class="text-right text-slate-900 font-medium tabular-nums">${formatMoneyVND(t.revenue || 0)}</td>
                    <td class="text-right text-slate-600 tabular-nums">${formatMoneyVND(t.reimbursable || 0)}</td>
                    <td class="text-right font-black text-slate-900 tabular-nums bg-slate-50">${formatMoneyVND(t.total_receivable || 0)}</td>
                    <td class="text-center">
                        <span class="px-2 py-0.5 rounded-md text-[10px] font-bold ${t.has_pod ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
                            ${t.has_pod ? 'Đã Nộp POD' : 'Thiếu POD'}
                        </span>
                    </td>
                    <td class="text-center">
                        <span class="px-2 py-0.5 rounded-md text-[10px] font-bold ${t.is_settled ? 'bg-teal-100 text-teal-800' : 'bg-amber-100 text-amber-800'}">
                            ${t.is_settled ? 'Đã Chốt' : 'Chưa Chốt'}
                        </span>
                    </td>
                </tr>
            `).join('');

            if (modalTfoot) {
                modalTfoot.innerHTML = `
                    <tr class="bg-slate-100/90 font-bold border-t-2 border-slate-300">
                        <td colspan="6" class="text-right uppercase p-2">TỔNG CỘNG: ${trips.length} Chuyến Vận Đơn:</td>
                        <td class="text-right font-mono font-bold text-slate-900 p-2">${formatMoneyVND(sumRev)}</td>
                        <td class="text-right font-mono font-bold text-slate-600 p-2">${formatMoneyVND(sumReim)}</td>
                        <td class="text-right font-mono font-black text-slate-950 bg-slate-200/50 p-2">${formatMoneyVND(sumTotal)}</td>
                        <td colspan="2" class="p-2"></td>
                    </tr>
                `;
            }
        }
    }

    modal.classList.remove('hidden');
}

function closeCustomerARStatementModal() {
    const modal = document.getElementById('modal-customer-ar-statement');
    if (modal) modal.classList.add('hidden');
}

function printCurrentCustomerStatement() {
    if (!currentStatementCustomer) return;
    printCustomerARStatement(currentStatementCustomer.customer_id);
}

function printCustomerARStatement(customerId) {
    const cust = rep13DataCache.find(c => String(c.customer_id) === String(customerId) || String(c.customer_code) === String(customerId));
    if (!cust) {
        showToast('Không tìm thấy thông tin khách hàng để in đối soát', 'error');
        return;
    }
    currentStatementCustomer = cust;

    // Thiết lập dữ liệu vào Modal In Báo Cáo chung với tiêu đề và định dạng Statement of Account
    const modal = document.getElementById('modal-report-print');
    if (!modal) {
        window.print();
        return;
    }

    // Đặt tiêu đề báo cáo in
    const titleEl = document.getElementById('print-rep-title');
    if (titleEl) titleEl.innerText = `BẢNG KÊ ĐỐI SOÁT CÔNG NỢ & CƯỚC VẬN CHUYỂN`;

    const subTitleEl = document.getElementById('print-rep-subtitle');
    if (subTitleEl) subTitleEl.innerText = `Khách hàng: ${cust.customer_name} (Mã: ${cust.customer_code || '-'} · MST: ${cust.tax_code || '-'})`;

    // Thiết lập KPIs tóm tắt
    const kpisContainer = document.getElementById('print-rep-kpis');
    if (kpisContainer) {
        kpisContainer.innerHTML = `
            <div class="p-2.5 rounded-lg border border-slate-300 bg-slate-50 text-left">
                <span class="text-[10.5px] font-bold text-slate-500 uppercase tracking-tight block truncate">Tổng Cước Vận Tải</span>
                <p class="text-base font-black text-slate-900 font-heading tabular-nums mt-0.5">${formatMoneyVND(cust.freight_revenue || 0)}</p>
                <p class="text-[9.5px] text-slate-500 truncate mt-0.5">Cước hợp đồng chuyến</p>
            </div>
            <div class="p-2.5 rounded-lg border border-slate-300 bg-slate-50 text-left">
                <span class="text-[10.5px] font-bold text-slate-500 uppercase tracking-tight block truncate">Tổng Khoản Chi Hộ</span>
                <p class="text-base font-black text-slate-900 font-heading tabular-nums mt-0.5">${formatMoneyVND(cust.reimbursable_amount || 0)}</p>
                <p class="text-[9.5px] text-slate-500 truncate mt-0.5">Nâng hạ cảng, lưu cont, phụ phí</p>
            </div>
            <div class="p-2.5 rounded-lg border border-slate-300 bg-slate-50 text-left">
                <span class="text-[10.5px] font-bold text-slate-500 uppercase tracking-tight block truncate">Đã Thanh Toán</span>
                <p class="text-base font-black text-emerald-700 font-heading tabular-nums mt-0.5">${formatMoneyVND(cust.collected_amount || 0)}</p>
                <p class="text-[9.5px] text-emerald-700 truncate mt-0.5">Đã thu hồi qua quỹ/ngân hàng</p>
            </div>
            <div class="p-2.5 rounded-lg border border-slate-300 bg-slate-50 text-left border-l-4 border-l-indigo-600">
                <span class="text-[10.5px] font-bold text-slate-500 uppercase tracking-tight block truncate">Dư Nợ Còn Phải Trả</span>
                <p class="text-base font-black text-indigo-700 font-heading tabular-nums mt-0.5">${formatMoneyVND(cust.remaining_balance || 0)}</p>
                <p class="text-[9.5px] text-indigo-700 font-bold truncate mt-0.5">Số dư cần quyết toán đối soát</p>
            </div>
        `;
    }

    // Thiết lập Bảng In chi tiết từng chuyến
    const theadEl = document.getElementById('print-rep-table-thead');
    const tbodyEl = document.getElementById('print-rep-table-tbody');
    const tfootEl = document.getElementById('print-rep-table-tfoot');
    const wordsBox = document.getElementById('print-rep-words-box');
    const wordsText = document.getElementById('print-rep-amount-words');

    if (theadEl) {
        theadEl.innerHTML = `
            <tr>
                <th class="border border-slate-400 p-2 text-center text-slate-900 font-bold bg-slate-100">STT</th>
                <th class="border border-slate-400 p-2 text-slate-900 font-bold bg-slate-100">Mã Chuyến</th>
                <th class="border border-slate-400 p-2 text-center text-slate-900 font-bold bg-slate-100">Ngày Chạy</th>
                <th class="border border-slate-400 p-2 text-slate-900 font-bold bg-slate-100">Xe Kéo & Tài Xế</th>
                <th class="border border-slate-400 p-2 text-slate-900 font-bold bg-slate-100">Số Cont</th>
                <th class="border border-slate-400 p-2 text-slate-900 font-bold bg-slate-100">Tuyến Vận Chuyển</th>
                <th class="border border-slate-400 p-2 text-right text-slate-900 font-bold bg-slate-100">Cước Vận Tải</th>
                <th class="border border-slate-400 p-2 text-right text-slate-900 font-bold bg-slate-100">Chi Hộ</th>
                <th class="border border-slate-400 p-2 text-right text-slate-900 font-bold bg-slate-100 font-black">Tổng Phải Thu</th>
                <th class="border border-slate-400 p-2 text-center text-slate-900 font-bold bg-slate-100">Tình Trạng POD</th>
            </tr>
        `;
    }

    const trips = cust.trips || [];
    if (tbodyEl) {
        if (trips.length === 0) {
            tbodyEl.innerHTML = `<tr><td colspan="10" class="text-center py-6 text-slate-400 italic">Không có chi tiết chuyến phát sinh trong kỳ</td></tr>`;
        } else {
            tbodyEl.innerHTML = trips.map((t, idx) => `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="border border-slate-300 p-1.5 text-center font-bold">${idx + 1}</td>
                    <td class="border border-slate-300 p-1.5 font-bold font-mono text-slate-900">${escapeHtml(t.trip_code)}</td>
                    <td class="border border-slate-300 p-1.5 text-center">${escapeHtml(t.loading_date)}</td>
                    <td class="border border-slate-300 p-1.5">${escapeHtml(t.vehicle_plate)} · ${escapeHtml(t.driver_name || '')}</td>
                    <td class="border border-slate-300 p-1.5 font-mono">${escapeHtml(t.container_number || '-')}</td>
                    <td class="border border-slate-300 p-1.5">${escapeHtml(t.route)}</td>
                    <td class="border border-slate-300 p-1.5 text-right font-mono">${formatMoneyVND(t.revenue || 0)}</td>
                    <td class="border border-slate-300 p-1.5 text-right font-mono">${formatMoneyVND(t.reimbursable || 0)}</td>
                    <td class="border border-slate-300 p-1.5 text-right font-mono font-bold">${formatMoneyVND(t.total_receivable || 0)}</td>
                    <td class="border border-slate-300 p-1.5 text-center font-bold ${t.has_pod ? 'text-emerald-700' : 'text-rose-700'}">${t.has_pod ? 'Đã Nộp POD' : 'Thiếu POD'}</td>
                </tr>
            `).join('');
        }
    }

    if (tfootEl) {
        tfootEl.innerHTML = `
            <tr>
                <td colspan="6" class="border border-slate-400 p-2 font-bold text-slate-950 bg-slate-100 text-right uppercase">TỔNG CỘNG ĐỐI SOÁT:</td>
                <td class="border border-slate-400 p-2 font-bold text-slate-950 bg-slate-100 text-right font-mono">${formatMoneyVND(cust.freight_revenue || 0)}</td>
                <td class="border border-slate-400 p-2 font-bold text-slate-950 bg-slate-100 text-right font-mono">${formatMoneyVND(cust.reimbursable_amount || 0)}</td>
                <td class="border border-slate-400 p-2 font-black text-slate-950 bg-slate-100 text-right font-mono">${formatMoneyVND(cust.total_receivable || 0)}</td>
                <td class="border border-slate-400 p-2 bg-slate-100"></td>
            </tr>
        `;
    }

    if (wordsBox && wordsText && typeof numberToWordsVN === 'function') {
        const bal = cust.remaining_balance || cust.total_receivable || 0;
        if (bal > 0) {
            wordsBox.classList.remove('hidden');
            wordsText.innerText = numberToWordsVN(bal);
        } else {
            wordsBox.classList.add('hidden');
        }
    }

    // Đảm bảo đồng bộ thông tin pháp lý công ty Triền Võ lên header bản in
    if (typeof syncCompanyProfileToPrintForms === 'function') {
        syncCompanyProfileToPrintForms();
    }

    modal.classList.remove('hidden');
}

window.viewCustomerARStatement = viewCustomerARStatement;
window.closeCustomerARStatementModal = closeCustomerARStatementModal;
window.printCurrentCustomerStatement = printCurrentCustomerStatement;
window.printCustomerARStatement = printCustomerARStatement;

function toggleReport13Sort(col) {
    if (rep13SortCol === col) {
        rep13SortAsc = !rep13SortAsc;
    } else {
        rep13SortCol = col;
        rep13SortAsc = false;
    }
    applyReport13Filters();
}


// -------------------------------------------------------------
// RENDER BÁO CÁO 14: BÁO CÁO TUỔI ĐƠN TỒN ĐỌNG CHƯA QUYẾT TOÁN (UNSETTLED AGING)
// -------------------------------------------------------------
function renderReport14(data) {
    const r14 = data.report14_unsettled_aging || {};
    const canViewFinance = (data.can_view_finance !== false);

    const elTotal = document.getElementById('rep14-stat-total-unsettled');
    if (elTotal) elTotal.innerText = `${r14.total_unsettled_count || 0} Chuyến`;

    const elRevStuck = document.getElementById('rep14-stat-rev-stuck');
    if (elRevStuck) elRevStuck.innerText = canViewFinance ? formatMoneyVND(r14.total_unsettled_revenue || 0) : '*** (Bảo mật)';

    const elExpStuck = document.getElementById('rep14-stat-exp-stuck');
    if (elExpStuck) elExpStuck.innerText = canViewFinance ? `Chi phí đang ứng: ${formatMoneyVND(r14.total_unsettled_expense || 0)}` : 'Chi phí: ***';

    const elOver30 = document.getElementById('rep14-stat-over-30');
    if (elOver30) elOver30.innerText = `${r14.over_30_days_count || 0} Chuyến`;

    const elMissingPod = document.getElementById('rep14-stat-missing-pod');
    if (elMissingPod) elMissingPod.innerText = `${r14.missing_pod_count || 0} Chuyến`;

    rep14DataCache = r14.records || [];
    rep14DataCache._can_view_finance = canViewFinance;
    applyReport14Filters();
}

function applyReport14Filters() {
    const canViewFinance = (rep14DataCache._can_view_finance !== false);
    const searchVal = (document.getElementById('filter-rep14-search')?.value || '').toLowerCase().trim();
    const levelVal = document.getElementById('filter-rep14-level')?.value || 'ALL';

    let list = rep14DataCache.filter(item => {
        if (levelVal !== 'ALL' && item.aging_level !== levelVal) return false;

        if (!searchVal) return true;
        return (item.trip_code || '').toLowerCase().includes(searchVal) ||
               (item.customer_name || '').toLowerCase().includes(searchVal) ||
               (item.vehicle_plate || '').toLowerCase().includes(searchVal) ||
               (item.driver_name || '').toLowerCase().includes(searchVal) ||
               (item.pending_reason || '').toLowerCase().includes(searchVal) ||
               (item.route || '').toLowerCase().includes(searchVal);
    });

    list.sort((a, b) => {
        let valA = a[rep14SortCol];
        let valB = b[rep14SortCol];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return rep14SortAsc ? -1 : 1;
        if (valA > valB) return rep14SortAsc ? 1 : -1;
        return 0;
    });

    const tbody = document.getElementById('rep14-tbody');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" class="p-8 text-center text-slate-400 font-medium">Không có chuyến xe nào bị tồn đọng chưa quyết toán</td></tr>`;
        const tfoot = document.getElementById('rep14-tfoot');
        if (tfoot) tfoot.innerHTML = '';
        return;
    }

    const totalRev = list.reduce((sum, item) => sum + (parseFloat(item.revenue) || 0), 0);
    const totalExp = list.reduce((sum, item) => sum + (parseFloat(item.expense) || 0), 0);
    const avgDays = list.length > 0 ? Math.round(list.reduce((sum, item) => sum + (parseInt(item.days_unsettled) || 0), 0) / list.length) : 0;

    const tfoot = document.getElementById('rep14-tfoot');
    if (tfoot) {
        tfoot.innerHTML = `
            <tr class="bg-slate-100/90 font-bold border-t-2 border-slate-300">
                <td colspan="2" class="text-right uppercase p-2">TỔNG CỘNG: ${list.length} Đơn Tồn:</td>
                <td class="text-center font-bold text-rose-700 font-mono p-2">TB ${avgDays} ngày</td>
                <td colspan="4" class="p-2"></td>
                <td class="text-right text-slate-900 font-mono font-bold p-2">${canViewFinance ? formatMoneyVND(totalRev) : '***'}</td>
                <td class="text-right text-rose-700 font-mono font-bold p-2">${canViewFinance ? formatMoneyVND(totalExp) : '***'}</td>
                <td colspan="3" class="p-2"></td>
            </tr>
        `;
    }

    tbody.innerHTML = list.map(item => {
        const revDisp = canViewFinance ? formatMoneyVND(item.revenue) : '***';
        const expDisp = canViewFinance ? formatMoneyVND(item.expense) : '***';

        let levelBadge = '';
        if (item.aging_level === 'CRITICAL') {
            levelBadge = '<span class="text-xs font-bold text-rose-700 uppercase tracking-wide">> 30 Ngày (Cực Gấp)</span>';
        } else if (item.aging_level === 'WARNING') {
            levelBadge = '<span class="text-xs font-bold text-amber-700 uppercase tracking-wide">16 - 30 Ngày (Cảnh Báo)</span>';
        } else if (item.aging_level === 'WATCH') {
            levelBadge = '<span class="text-xs font-bold text-sky-700 uppercase tracking-wide">8 - 15 Ngày (Đôn Thúc POD)</span>';
        } else {
            levelBadge = '<span class="text-xs font-semibold text-slate-600 uppercase tracking-wide">0 - 7 Ngày (Bình Thường)</span>';
        }

        const podBadge = item.has_pod
            ? '<span class="text-xs font-bold text-emerald-700 uppercase">Đã Có POD</span>'
            : '<span class="text-xs font-bold text-rose-700 uppercase">Thiếu POD Gốc</span>';

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="font-bold text-xs">
                    <a href="javascript:void(0)" onclick="viewTripDetail('${escapeHtml(item.trip_code)}')" class="font-mono text-teal-800 hover:text-teal-900 underline flex items-center gap-1">
                        <i class="ph-bold ph-truck"></i>
                        <span>${escapeHtml(item.trip_code)}</span>
                    </a>
                </td>
                <td class="text-center text-xs font-mono text-slate-600 font-bold">${escapeHtml(item.loading_date)}</td>
                <td class="text-center text-xs font-black text-rose-700 tabular-nums">${item.days_unsettled} ngày</td>
                <td class="text-center text-xs">${levelBadge}</td>
                <td class="text-xs font-bold text-slate-800">
                    <div>${escapeHtml(item.customer_name)}</div>
                    <div class="text-[10px] text-slate-400 font-mono">${escapeHtml(item.customer_code)}</div>
                </td>
                <td class="text-xs">
                    <div class="font-mono font-bold text-slate-900">${escapeHtml(item.vehicle_plate)}</div>
                    <div class="text-[10px] text-slate-500">${escapeHtml(item.ownership_label)}</div>
                </td>
                <td class="text-xs font-bold text-slate-800">
                    <div>
                        <span>${escapeHtml(item.driver_name)}</span>
                    </div>
                </td>
                <td class="text-right text-xs font-bold text-slate-900 tabular-nums">${revDisp}</td>
                <td class="text-right text-xs text-rose-700 tabular-nums">${expDisp}</td>
                <td class="text-xs text-slate-700 max-w-xs font-medium" title="${escapeHtml(item.pending_reason)}">
                    <div class="flex items-center gap-1 text-rose-800">
                        <i class="ph-bold ph-warning-circle shrink-0"></i>
                        <span>${escapeHtml(item.pending_reason)}</span>
                    </div>
                </td>
                <td class="text-center text-xs">${podBadge}</td>
                <td class="text-center text-xs">
                    <span class="text-xs font-semibold text-slate-700 uppercase">${escapeHtml(item.status_label)}</span>
                </td>
            </tr>
        `;
    }).join('');
}

function toggleReport14Sort(col) {
    if (rep14SortCol === col) {
        rep14SortAsc = !rep14SortAsc;
    } else {
        rep14SortCol = col;
        rep14SortAsc = false;
    }
    applyReport14Filters();
}



// -------------------------------------------------------------
// XUẤT BÁO CÁO RA TỆP CSV / EXCEL CHUẨN UTF-8 VỚI BOM
// -------------------------------------------------------------
function exportReportToExcel() {
    // Xác định subtab đang hiển thị
    const activeSubtab = document.querySelector('.report-subtab-content:not(.hidden)');
    if (!activeSubtab) {
        showToast('warning', 'Không tìm thấy bảng dữ liệu báo cáo nào đang mở');
        return;
    }

    const table = activeSubtab.querySelector('table');
    if (!table) {
        showToast('warning', 'Bảng dữ liệu báo cáo trống');
        return;
    }

    const rows = table.querySelectorAll('tr');
    let csvContent = '\uFEFF'; // Thêm BOM UTF-8 để Microsoft Excel mở trực tiếp không lỗi tiếng Việt

    rows.forEach(row => {
        const cols = row.querySelectorAll('th, td');
        const rowData = [];
        cols.forEach(col => {
            // Lấy text và làm sạch dấu nháy kép
            let text = col.innerText.replace(/"/g, '""').trim();
            // Xóa các biểu tượng font icon nếu có
            text = text.replace(/[\n\r]+/g, ' ');
            rowData.push(`"${text}"`);
        });
        if (rowData.length > 0) {
            csvContent += rowData.join(',') + '\r\n';
        }
    });

    const subtabId = activeSubtab.id.replace('subtab-', '');
    const filename = `BIM_Logistics_Bao_Cao_${subtabId}_${currentReportPeriod}_${new Date().toISOString().slice(0, 10)}.csv`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('success', `Đã xuất báo cáo "${filename}" thành công!`, 'Xuất Excel Thành Công');
}

// -------------------------------------------------------------
// IN ẤN BÁO CÁO QUẢN TRỊ DOANH NGHIỆP (BIM TMS BI REPORTS)
// -------------------------------------------------------------
const REPORT_PRINT_METADATA = {
    'report-1': {
        title: 'BÁO CÁO KẾT QUẢ KINH DOANH & HIỆU SUẤT ĐỘI XE',
        code: 'TMS-BI-01',
        authorRole: 'Phòng Vận Tải & Kế Toán'
    },
    'report-2': {
        title: 'BÁO CÁO THEO DÕI VỎ CONTAINER & CẢNH BÁO DEM/DET',
        code: 'TMS-BI-02',
        authorRole: 'Phòng Khai Thác Cảng & Điều Vận'
    },
    'report-3': {
        title: 'BÁO CÁO CHẤT LƯỢNG DỊCH VỤ & ĐÚNG GIỜ GIAO NHẬN (OTP)',
        code: 'TMS-BI-03',
        authorRole: 'Phòng Quản Lý Chất Lượng & CS'
    },
    'report-4': {
        title: 'BÁO CÁO TỔNG HỢP CHI PHÍ TUYẾN & TIỀN CHI HỘ',
        code: 'TMS-BI-04',
        authorRole: 'Kế Toán Chi Phí & Điều Vận'
    },
    'report-5': {
        title: 'BÁO CÁO THEO DÕI CẮT KÉO & LƯU XE QUA ĐÊM (LAYOVER)',
        code: 'TMS-BI-05',
        authorRole: 'Đội Trưởng Đội Xe & Điều Vận'
    },
    'report-6': {
        title: 'BÁO CÁO TỔNG HỢP SỰ CỐ VẬN TẢI & NGOẠI LỆ (OS&D)',
        code: 'TMS-BI-06',
        authorRole: 'Bộ Phận An Toàn & Bảo Hiểm'
    },
    'report-7': {
        title: 'BÁO CÁO DOANH THU KHÁCH HÀNG & SẢN LƯỢNG TEU',
        code: 'TMS-BI-07',
        authorRole: 'Phòng Kinh Doanh / Sales & Kế Toán'
    },
    'report-8': {
        title: 'BẢNG ĐỐI SOÁT & QUYẾT TOÁN CƯỚC XE THẦU PHỤ 3PL',
        code: 'TMS-BI-08',
        authorRole: 'Kế Toán Thanh Toán 3PL'
    },
    'report-9': {
        title: 'BẢNG TỔNG HỢP LƯƠNG CHUYẾN & THU NHẬP TÀI XẾ',
        code: 'TMS-BI-09',
        authorRole: 'Kế Toán Tiền Lương & Đội Xe'
    },
    'report-10': {
        title: 'BÁO CÁO THEO DÕI QUỸ TẠM ỨNG & THU CHI ĐIỀU VẬN',
        code: 'TMS-BI-10',
        authorRole: 'Thủ Quỹ & Kế Toán Theo Dõi Quỹ'
    },
    'report-11': {
        title: 'BẢNG TỔNG HỢP TẠM ỨNG & CHI PHÍ DỌC ĐƯỜNG TÀI XẾ',
        code: 'TMS-BI-11',
        authorRole: 'Điều Vận & Kế Toán Tạm Ứng'
    },
    'report-12': {
        title: 'BÁO CÁO TIẾN ĐỘ QUYẾT TOÁN CHUYẾN & TỒN ĐỌNG (BACKLOG)',
        code: 'TMS-BI-12',
        authorRole: 'Kế Toán Quyết Toán Chuyến'
    },
    'report-13': {
        title: 'BÁO CÁO CÔNG NỢ PHẢI THU KHÁCH HÀNG (ACCOUNTS RECEIVABLE)',
        code: 'TMS-BI-13',
        authorRole: 'Kế Toán Công Nợ Phải Thu'
    },
    'report-14': {
        title: 'BÁO CÁO PHÂN TÍCH TUỔI ĐƠN HÀNG TỒN ĐỌNG CHƯA CHỐT',
        code: 'TMS-BI-14',
        authorRole: 'Kiểm Soát Vận Hành & Điều Vận'
    }
};

// --- TỰ ĐỘNG PHÂN LOẠI KHỔ GIẤY A4 NGANG (LANDSCAPE) / DỌC (PORTRAIT) TỐI ƯU ---
const DEFAULT_REPORT_ORIENTATION = {
    'report-1': 'landscape', // P&L Hiệu Suất Đội Xe: 11 Cột
    'report-2': 'portrait',  // Vỏ Cont & DEM/DET Hãng Tàu: 6 Cột
    'report-3': 'portrait',  // Đúng Giờ & Chất Lượng OTP: 6 Cột
    'report-4': 'landscape', // Chi Phí Tuyến & Chi Hộ: 8 Cột
    'report-5': 'landscape', // Bàn Giao Cắt Kéo & Lưu Xe 0H: 13 Cột
    'report-6': 'portrait',  // Biên Bản Sự Cố OS&D: Dạng biên bản
    'report-7': 'landscape', // Doanh Thu Khách & Sản Lượng TEU: 11 Cột
    'report-8': 'landscape', // Quyết Toán Xe Thầu Phụ 3PL: 9-11 Cột
    'report-9': 'landscape', // Lương Chuyến & Thu Nhập Lái Xe: 10 Cột
    'report-10': 'portrait', // Sổ Quỹ Tiền Mặt & Tạm Ứng Điều Vận: 6 Cột
    'report-11': 'portrait', // Tạm Ứng & Chi Phí Dọc Đường: 6 Cột
    'report-12': 'landscape',// Tiến Độ Quyết Toán & Backlog: 10 Cột
    'report-13': 'landscape',// Công Nợ Phải Thu AR Aging: 8 Cột
    'report-14': 'landscape' // Tuổi Đơn Hàng Tồn Đọng: 8 Cột
};

let currentReportPrintOrientation = 'landscape';

function setReportPrintOrientation(orientation = 'landscape') {
    currentReportPrintOrientation = orientation;
    const printArea = document.getElementById('report-printable-area');
    const modalDialog = document.getElementById('report-print-modal-dialog');
    const btnPortrait = document.getElementById('btn-rep-orient-portrait');
    const btnLandscape = document.getElementById('btn-rep-orient-landscape');

    if (printArea) {
        if (orientation === 'landscape') {
            printArea.classList.add('is-landscape');
            printArea.classList.remove('is-portrait');
        } else {
            printArea.classList.add('is-portrait');
            printArea.classList.remove('is-landscape');
        }
    }

    if (modalDialog) {
        if (orientation === 'landscape') {
            modalDialog.classList.add('max-w-6xl');
            modalDialog.classList.remove('max-w-4xl');
        } else {
            modalDialog.classList.add('max-w-4xl');
            modalDialog.classList.remove('max-w-6xl');
        }
    }

    if (btnPortrait && btnLandscape) {
        if (orientation === 'landscape') {
            btnLandscape.className = 'px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 bg-teal-600 text-white shadow-xs cursor-pointer';
            btnPortrait.className = 'px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 text-slate-300 hover:text-white cursor-pointer';
        } else {
            btnPortrait.className = 'px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 bg-teal-600 text-white shadow-xs cursor-pointer';
            btnLandscape.className = 'px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 text-slate-300 hover:text-white cursor-pointer';
        }
    }

    // Dynamic @page size setting
    if (typeof setDynamicPrintPageStyle === 'function') {
        if (orientation === 'landscape') {
            setDynamicPrintPageStyle('@page { size: A4 landscape; margin: 4mm 6mm; }');
        } else {
            setDynamicPrintPageStyle('@page { size: A4 portrait; margin: 6mm 8mm; }');
        }
    }
}

function openReportPrintModal(targetReportType = null) {
    const reportKey = targetReportType || currentActiveReportSubtab || 'report-1';
    const cleanKey = reportKey.startsWith('report-') ? reportKey : `report-${reportKey}`;
    
    const selector = document.getElementById('report-print-type-selector');
    if (selector) selector.value = cleanKey;

    renderReportPrintContent(cleanKey);

    const modal = document.getElementById('modal-report-print');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function onReportPrintTypeChanged(newType) {
    renderReportPrintContent(newType);
}

function renderReportPrintContent(reportKey) {
    const meta = REPORT_PRINT_METADATA[reportKey] || {
        title: 'BÁO CÁO QUẢN TRỊ VẬN HÀNH DOANH NGHIỆP',
        code: 'TMS-BI-REPORT',
        authorRole: 'Bộ Phận Vận Hành & Kế Toán'
    };

    // Tự động chọn khổ giấy tối ưu cho báo cáo này
    const autoOrientation = DEFAULT_REPORT_ORIENTATION[reportKey] || 'landscape';
    setReportPrintOrientation(autoOrientation);

    const titleEl = document.getElementById('print-rep-main-title');
    if (titleEl) titleEl.innerText = meta.title;

    const moduleEl = document.getElementById('print-rep-module-code');
    if (moduleEl) moduleEl.innerText = meta.code;

    // Kỳ báo cáo
    const periodMap = {
        today: 'Hôm nay',
        week: 'Tuần này',
        month: 'Tháng này',
        quarter: 'Quý này',
        all: 'Tất cả thời gian'
    };
    const periodLabel = periodMap[currentReportPeriod] || currentReportPeriod;
    const badgePeriod = document.getElementById('report-print-badge-period');
    if (badgePeriod) badgePeriod.innerText = periodLabel;

    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const exportDateEl = document.getElementById('print-rep-export-date');
    if (exportDateEl) exportDateEl.innerText = `Ngày in: ${dateStr} ${timeStr}`;

    const subtitleEl = document.getElementById('print-rep-period-subtitle');
    if (subtitleEl) subtitleEl.innerText = `Kỳ báo cáo: ${periodLabel} • Đơn vị tiền tệ: VNĐ • Xuất tự động từ Hệ thống BIM Logistics`;

    const authorEl = document.getElementById('print-rep-sign-author');
    if (authorEl) {
        const userName = window.CURRENT_USER?.full_name || window.CURRENT_USER?.username || meta.authorRole;
        authorEl.innerText = userName;
    }

    // Đồng bộ thông tin công ty hệ thống lên báo cáo
    syncCompanyProfileToPrintForms();

    // 1. Trích xuất KPIs từ subtab tương ứng
    const subtabContent = document.getElementById(`subtab-${reportKey}`);
    const kpisContainer = document.getElementById('print-rep-kpis-container');
    if (kpisContainer) {
        kpisContainer.innerHTML = '';
        if (subtabContent) {
            const cards = subtabContent.querySelectorAll('.grid > div');
            if (cards && cards.length > 0) {
                // Lấy tối đa 4 card đầu tiên
                Array.from(cards).slice(0, 4).forEach(card => {
                    const label = card.querySelector('span')?.innerText?.trim() || '';
                    const value = card.querySelector('p.text-3xl, p.text-2xl, p.font-black')?.innerText?.trim() || '';
                    const note = card.querySelectorAll('p')[1]?.innerText?.trim() || '';
                    if (label || value) {
                        const div = document.createElement('div');
                        div.className = 'p-2.5 rounded-lg border border-slate-300 bg-slate-50 text-left';
                        div.innerHTML = `
                            <span class="text-[10.5px] font-bold text-slate-500 uppercase tracking-tight block truncate">${escapeHtml(label)}</span>
                            <p class="text-base sm:text-lg font-black text-slate-900 font-heading tabular-nums mt-0.5">${escapeHtml(value)}</p>
                            ${note ? `<p class="text-[9.5px] text-slate-500 truncate mt-0.5">${escapeHtml(note)}</p>` : ''}
                        `;
                        kpisContainer.appendChild(div);
                    }
                });
            }
        }
    }

    // 2. Trích xuất Bảng dữ liệu chi tiết
    const theadEl = document.getElementById('print-rep-table-thead');
    const tbodyEl = document.getElementById('print-rep-table-tbody');
    const tfootEl = document.getElementById('print-rep-table-tfoot');
    const wordsBox = document.getElementById('print-rep-words-box');
    const wordsText = document.getElementById('print-rep-amount-words');

    if (theadEl) theadEl.innerHTML = '';
    if (tbodyEl) tbodyEl.innerHTML = '';
    if (tfootEl) tfootEl.innerHTML = '';
    if (wordsBox) wordsBox.classList.add('hidden');

    if (subtabContent) {
        const sourceTable = subtabContent.querySelector('table');
        if (sourceTable) {
            // Clone thead (loại bỏ cột thao tác nếu có)
            const srcThead = sourceTable.querySelector('thead');
            if (srcThead && theadEl) {
                const headerRow = document.createElement('tr');
                const ths = srcThead.querySelectorAll('th');
                ths.forEach(th => {
                    const thText = th.innerText.trim();
                    if (thText !== 'Thao Tác' && thText !== 'Hành Động' && !th.dataset.colKey?.includes('action')) {
                        const newTh = document.createElement('th');
                        newTh.className = 'border border-slate-400 p-2 text-slate-900 font-bold bg-slate-100 ' + (th.className.includes('text-right') ? 'text-right' : th.className.includes('text-center') ? 'text-center' : 'text-left');
                        newTh.innerText = thText;
                        headerRow.appendChild(newTh);
                    }
                });
                theadEl.appendChild(headerRow);
            }

            // Clone tbody
            const srcTbody = sourceTable.querySelector('tbody');
            let sumAmount = 0;
            if (srcTbody && tbodyEl) {
                const trs = srcTbody.querySelectorAll('tr');
                if (trs.length === 0 || trs[0].querySelector('td[colspan]')) {
                    tbodyEl.innerHTML = `<tr><td colspan="12" class="text-center py-6 text-slate-400 italic">Không có dữ liệu phát sinh trong kỳ báo cáo này</td></tr>`;
                } else {
                    trs.forEach((tr, index) => {
                        const newTr = document.createElement('tr');
                        newTr.className = 'hover:bg-slate-50 transition-colors';
                        const tds = tr.querySelectorAll('td');
                        tds.forEach((td, tdIdx) => {
                            // Bỏ qua cột thao tác / nút bấm
                            if (!td.querySelector('button') || tdIdx < tds.length - 1) {
                                const newTd = document.createElement('td');
                                newTd.className = 'border border-slate-300 p-1.5 ' + (td.className.includes('text-right') ? 'text-right font-mono' : td.className.includes('text-center') ? 'text-center' : 'text-left');
                                newTd.innerText = td.innerText.trim();
                                newTr.appendChild(newTd);

                                // Thu thập số tiền nếu có
                                const textVal = td.innerText.replace(/[^\d]/g, '');
                                if (textVal && td.className.includes('text-right') && tdIdx === tds.length - 2) {
                                    sumAmount += Number(textVal) || 0;
                                }
                            }
                        });
                        tbodyEl.appendChild(newTr);
                    });
                }
            }

            // Dòng Tổng Cộng tfoot
            const srcTfoot = sourceTable.querySelector('tfoot');
            if (srcTfoot && tfootEl && srcTfoot.innerHTML.trim()) {
                tfootEl.innerHTML = srcTfoot.innerHTML;
                tfootEl.querySelectorAll('td, th').forEach(cell => {
                    cell.className = 'border border-slate-400 p-2 font-bold text-slate-950 bg-slate-100 ' + (cell.className.includes('text-right') ? 'text-right' : 'text-left');
                });
            }

            if (sumAmount > 0 && typeof numberToWordsVN === 'function' && wordsBox && wordsText) {
                wordsBox.classList.remove('hidden');
                wordsText.innerText = numberToWordsVN(sumAmount);
            }
        }
    }
}

function executePrintReportDocument() {
    document.body.classList.add('is-printing-report');
    document.body.classList.remove('is-printing-quotation', 'is-printing-voucher');
    window.print();
}

// Tự động gán cờ in ấn nếu người dùng bấm phím tắt Ctrl+P khi modal đang mở
window.addEventListener('beforeprint', () => {
    const voucherModal = document.getElementById('modal-cash-voucher-print');
    const quoteModal = document.getElementById('modal-quotation-print');
    const reportModal = document.getElementById('modal-report-print');
    if (voucherModal && !voucherModal.classList.contains('hidden')) {
        document.body.classList.add('is-printing-voucher');
        document.body.classList.remove('is-printing-quotation', 'is-printing-report');
    } else if (quoteModal && !quoteModal.classList.contains('hidden')) {
        document.body.classList.add('is-printing-quotation');
        document.body.classList.remove('is-printing-voucher', 'is-printing-report');
    } else if (reportModal && !reportModal.classList.contains('hidden')) {
        document.body.classList.add('is-printing-report');
        document.body.classList.remove('is-printing-voucher', 'is-printing-quotation');
    }
});

// Tự động gỡ bỏ cờ in ấn sau khi đóng hộp thoại In của trình duyệt
window.addEventListener('afterprint', () => {
    document.body.classList.remove('is-printing-quotation', 'is-printing-voucher', 'is-printing-report');
});

function closeReportPrintModal() {
    const modal = document.getElementById('modal-report-print');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function printReportDocument() {
    openReportPrintModal(currentActiveReportSubtab);
}

window.openReportPrintModal = openReportPrintModal;
window.closeReportPrintModal = closeReportPrintModal;
window.printReportDocument = printReportDocument;
window.executePrintReportDocument = executePrintReportDocument;
window.setReportPrintOrientation = setReportPrintOrientation;
window.onReportPrintTypeChanged = onReportPrintTypeChanged;


// Hàm phân giải URL khi tải trang lần đầu (Hỗ trợ Clean Semantic URL & Deep-link HashID)
function resolveInitialRoute() {
    const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
    const hash = window.location.hash ? window.location.hash.replace('#', '').replace(/^\/+/, '') : '';

    // 1. Kiểm tra deep-link chi tiết chuyến xe: /dispatch/trips/<hashid> hoặc /dispatch/trips/new
    const tripMatch = pathname.match(/^\/dispatch\/trips\/([a-zA-Z0-9_-]+)/) || (hash.startsWith('trip/') ? hash.match(/^trip\/([a-zA-Z0-9_-]+)/) : null);
    if (tripMatch && tripMatch[1]) {
        const tripIdentifier = tripMatch[1];
        switchTab('dieu-van', false);
        if (tripIdentifier === 'new') {
            const urlParams = new URLSearchParams(window.location.search);
            const bookingId = urlParams.get('booking_id');
            if (typeof openCreateTripPage === 'function') openCreateTripPage(bookingId, false);
        } else {
            viewTripDetail(tripIdentifier, false);
        }
        if (window.history && window.history.replaceState) {
            window.history.replaceState({ view: tripIdentifier === 'new' ? 'create-trip' : 'trip-detail', tripIdentifier }, '', window.location.pathname + window.location.search);
        }
        return;
    }

    // 1.1. Kiểm tra deep-link chi tiết báo giá trang riêng: /sales/quotations/<hashid>
    const quoteMatch = pathname.match(/^\/sales\/quotations\/([a-zA-Z0-9_-]+)/) || (hash.startsWith('quotation/') ? hash.match(/^quotation\/([a-zA-Z0-9_-]+)/) : null);
    if (quoteMatch && quoteMatch[1]) {
        const quoteIdentifier = quoteMatch[1];
        switchTab('kinh-doanh', false);
        if (quoteIdentifier === 'new') {
            if (typeof openCreateQuotationPage === 'function') openCreateQuotationPage(false);
        } else {
            if (typeof viewQuotationDetail === 'function') viewQuotationDetail(quoteIdentifier, false);
        }
        if (window.history && window.history.replaceState) {
            window.history.replaceState({ view: 'quotation-detail', quoteIdentifier }, '', `/sales/quotations/${quoteIdentifier}`);
        }
        return;
    }

    // 1.2. Kiểm tra deep-link tiếp nhận đơn / booking trang riêng: /sales/bookings/<id>
    const bookingMatch = pathname.match(/^\/sales\/bookings\/([a-zA-Z0-9_-]+)/) || (hash.startsWith('booking/') ? hash.match(/^booking\/([a-zA-Z0-9_-]+)/) : null);
    if (bookingMatch && bookingMatch[1]) {
        const bookingIdentifier = bookingMatch[1];
        switchTab('kinh-doanh', false);
        if (bookingIdentifier === 'new') {
            if (typeof openCreateBookingPage === 'function') openCreateBookingPage(false);
        } else {
            if (typeof viewBookingDetail === 'function') viewBookingDetail(bookingIdentifier, false);
        }
        if (window.history && window.history.replaceState) {
            window.history.replaceState({ view: 'booking-detail', bookingIdentifier }, '', `/sales/bookings/${bookingIdentifier}`);
        }
        return;
    }

    // 2. Chuyển đổi tương thích ngược: nếu người dùng vào từ link cũ có hash (#dieu-van, #kinh-doanh...)
    if (hash) {
        const cleanHash = hash.replace(/^\/+/, '');
        const validLegacyTabs = {
            'dashboard': 'dashboard',
            'dieu-van': 'dieu-van',
            'kinh-doanh': 'kinh-doanh',
            'xe-bai': 'xe-bai',
            'nhan-su': 'nhan-su',
            'ke-toan': 'ke-toan',
            'hai-quan': 'hai-quan',
            'bao-cao': 'bao-cao',
            'cai-dat': 'cai-dat'
        };
        if (validLegacyTabs[cleanHash]) {
            const mappedTab = validLegacyTabs[cleanHash];
            switchTab(mappedTab, true);
            return;
        }
    }

    // 3. Điều hướng theo Clean Semantic URL pathname
    const targetTab = ROUTE_TAB_MAP[pathname];
    if (targetTab) {
        switchTab(targetTab, false);
    } else {
        switchTab('dashboard', false);
    }
}

// Lắng nghe sự kiện Back/Forward của trình duyệt để chuyển view mượt mà
window.addEventListener('popstate', (event) => {
    const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
    const tripMatch = pathname.match(/^\/dispatch\/trips\/([a-zA-Z0-9_-]+)/);
    const quoteMatch = pathname.match(/^\/sales\/quotations\/([a-zA-Z0-9_-]+)/);
    const bookingMatch = pathname.match(/^\/sales\/bookings\/([a-zA-Z0-9_-]+)/);

    if (tripMatch && tripMatch[1]) {
        switchTab('dieu-van', false);
        if (tripMatch[1] === 'new') {
            const urlParams = new URLSearchParams(window.location.search);
            const bookingId = urlParams.get('booking_id');
            if (typeof openCreateTripPage === 'function') openCreateTripPage(bookingId, false);
        } else {
            viewTripDetail(tripMatch[1], false);
        }
    } else if (quoteMatch && quoteMatch[1]) {
        switchTab('kinh-doanh', false);
        if (quoteMatch[1] === 'new') {
            if (typeof openCreateQuotationPage === 'function') openCreateQuotationPage(false);
        } else {
            if (typeof viewQuotationDetail === 'function') viewQuotationDetail(quoteMatch[1], false);
        }
    } else if (bookingMatch && bookingMatch[1]) {
        switchTab('kinh-doanh', false);
        if (bookingMatch[1] === 'new') {
            if (typeof openCreateBookingPage === 'function') openCreateBookingPage(false);
        } else {
            if (typeof viewBookingDetail === 'function') viewBookingDetail(bookingMatch[1], false);
        }
    } else {
        const targetTab = ROUTE_TAB_MAP[pathname] || 'dashboard';
        const tripDetailView = document.getElementById('view-trip-detail');
        if (tripDetailView && !tripDetailView.classList.contains('hidden-view')) {
            tripDetailView.classList.add('hidden-view');
        }
        const createTripView = document.getElementById('view-create-trip');
        if (createTripView && !createTripView.classList.contains('hidden-view')) {
            createTripView.classList.add('hidden-view');
        }
        const quoteDetailView = document.getElementById('view-quotation-detail');
        if (quoteDetailView && !quoteDetailView.classList.contains('hidden-view')) {
            quoteDetailView.classList.add('hidden-view');
        }
        const bookingDetailView = document.getElementById('view-booking-detail');
        if (bookingDetailView && !bookingDetailView.classList.contains('hidden-view')) {
            bookingDetailView.classList.add('hidden-view');
        }
        switchTab(targetTab, false);
    }
});

