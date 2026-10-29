// =========================================================================
// 8. PHÂN HỆ BÁO CÁO & PHÂN TÍCH QUẢN TRỊ TMS (BI ANALYTICS LOGIC)
// =========================================================================

let currentReportPeriod = (function() { try { return localStorage.getItem('bim_report_period') || 'year'; } catch(e) { return 'year'; } })();
let rawReportsData = null;
let canViewFinance = true;

// Caches & Sort States cho toàn bộ 14 Báo cáo TMS
let rep1DataCache = [];
let rep1DataFiltered = [];
let rep1SortCol = 'revenue';
let rep1SortAsc = false;


let rep2DataCache = [];
let rep2SortCol = 'estimated_fines';
let rep2SortAsc = false;

let rep3DataCache = [];
let rep3SortCol = 'trip_code';
let rep3SortAsc = false;

let rep4ActivePerspective = 'route'; // 'route' | 'vehicle' | 'driver' | 'customer' | 'reimbursable'
let rep4RoutesCache = [];
let rep4VehiclesCache = [];
let rep4DriversCache = [];
let rep4CustomersCache = [];
let rep4ItemsCache = [];
let rep4DataFiltered = [];
let rep4SortCol = 'direct_expense';
let rep4SortAsc = false;

let rep5DataCache = [];
let rep5SortCol = 'wait_hours';
let rep5SortAsc = false;

let rep6DataCache = [];
let rep6SortCol = 'estimated_damage';
let rep6SortAsc = false;

let rep7DataCache = [];
let rep7DataFiltered = [];
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

let rep15DataCache = [];
let rep15DataFiltered = [];
let rep15SortCol = 'monthly_revenue';
let rep15SortAsc = false;

let rep16DataCache = [];
let rep16DataFiltered = [];
let rep16SortCol = 'created_at';
let rep16SortAsc = false;

let rep17DataCache = [];
let rep17DataFiltered = [];
let rep17SortCol = 'loading_date';
let rep17SortAsc = false;

function formatMoneyVND(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '0 đ';
    return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' đ';
}

let currentActiveReportSubtab = 'report-1';
let currentActiveReportGroup = 'group-1';
let currentReportViewMode = 'group'; // 'group' hoặc 'all'

const REPORT_GROUP_MAPPING = {
    'group-1': ['report-1', 'report-7', 'report-4', 'report-12'],
    'group-2': ['report-15', 'report-16', 'report-17'],
    'group-3': ['report-13', 'report-14', 'report-10', 'report-11', 'report-9', 'report-8'],
    'group-4': ['report-2', 'report-3', 'report-5', 'report-6']
};

const REPORT_PERMISSION_MAPPING = {
    'report-1': 'reports.view_report_pnl',
    'report-7': 'reports.view_report_customer_rev',
    'report-4': 'reports.view_report_route_cost',
    'report-2': 'reports.view_report_dem_det',
    'report-3': 'reports.view_report_otp',
    'report-5': 'reports.view_report_layover',
    'report-6': 'reports.view_report_incidents',
    'report-10': 'reports.view_report_dispatcher_funds',
    'report-11': 'reports.view_report_driver_advances',
    'report-9': 'reports.view_report_driver_salary',
    'report-8': 'reports.view_report_subcontractor',
    'report-13': 'reports.view_report_ar_aging',
    'report-12': 'reports.view_report_settlement_backlog',
    'report-14': 'reports.view_report_unsettled_aging',
    'report-15': 'reports.view_report_crm_quotations',
    'report-16': 'reports.view_report_active_bookings',
    'report-17': 'reports.view_report_wip_trips'
};

// Ma trận phân quyền: báo cáo -> phân hệ (khớp apps/dispatch/reports_api.py)
const REPORT_ACCESS_MODULES = {
    'report-1': ['reports_fin'], 'report-7': ['reports_fin'], 'report-8': ['reports_fin'], 'report-9': ['reports_fin'],
    'report-10': ['reports_fin'], 'report-12': ['reports_fin'], 'report-13': ['reports_fin'], 'report-14': ['reports_fin'],
    'report-11': ['reports_fin', 'advances'],
    'report-2': ['reports_ops'], 'report-3': ['reports_ops'], 'report-4': ['reports_ops'], 'report-5': ['reports_ops'],
    'report-6': ['reports_ops'], 'report-17': ['reports_ops', 'sales'],
    'report-15': ['sales'], 'report-16': ['sales']
};

function canAccessReport(reportId) {
    if (!window.CURRENT_USER) return false;
    if (window.CURRENT_USER.is_superuser) return true;
    if (window.BIM_ACCESS && typeof window.canAccess === 'function') {
        return (REPORT_ACCESS_MODULES[reportId] || ['reports_fin']).some(m => window.canAccess(m, 'view'));
    }
    const role = window.CURRENT_USER.role || '';
    const dept = window.CURRENT_USER.department || '';

    // Ban Giám Đốc và Kế Toán có toàn quyền xem tất cả 14 Báo Cáo
    if (role === 'DIRECTOR' || role === 'ACCOUNTANT' || role === 'LEAD_ADMIN_ACC' || dept === 'ACCOUNTING' || dept === 'MANAGEMENT') {
        return true;
    }

    // Kiểm tra Django permission tường minh nếu có
    const perm = REPORT_PERMISSION_MAPPING[reportId];
    if (perm && typeof window.hasUserPermission === 'function' && window.hasUserPermission(perm)) {
        return true;
    }

    // Phân quyền theo ma trận chuyên môn phòng ban:
    // 1. Điều Vận (DISPATCH): Báo cáo Vận hành 1, 2, 3, 4, 5, 6, 10, 11, 12, 14
    if (role === 'DISPATCHER' || role === 'LEAD_DISPATCH' || role === 'DISPATCH_ASST' || dept === 'DISPATCH') {
        return ['report-1', 'report-2', 'report-3', 'report-4', 'report-5', 'report-6', 'report-10', 'report-11', 'report-12', 'report-14', 'report-16', 'report-17'].includes(reportId);
    }

    // 2. Kinh Doanh (SALES): Báo cáo 7 (Doanh thu khách & TEU), Báo cáo 4 (Chi phí tuyến), Báo cáo 3 (Đúng giờ OTP), Báo cáo 13 (Công nợ AR)
    if (role === 'SALESMAN' || role === 'LEAD_SALES' || role === 'CSKH' || dept === 'SALES') {
        return ['report-15', 'report-16', 'report-17', 'report-7', 'report-4', 'report-3', 'report-13', 'report-14'].includes(reportId);
    }

    // 3. Nhân Sự (HR): Báo cáo 9 (Lương chuyến & Năng suất tài xế), Báo cáo 3 (Đúng giờ OTP), Báo cáo 6 (Sự cố)
    if (role === 'STAFF_ADMIN_ACC' || dept === 'HR') {
        return ['report-9', 'report-3', 'report-6'].includes(reportId);
    }

    return false;
}

function initReportPermissions() {
    let firstAllowedGroup = null;
    let firstAllowedReport = null;

    // 1. Kiểm tra từng subtab button và content container
    Object.keys(REPORT_PERMISSION_MAPPING).forEach(repId => {
        const num = repId.replace('report-', '');
        const btn = document.getElementById(`report-tab-btn-${num}`);
        const content = document.getElementById(`subtab-${repId}`);
        const allowed = canAccessReport(repId);

        if (btn) {
            if (allowed) {
                btn.removeAttribute('data-forbidden');
                btn.style.display = '';
            } else {
                btn.setAttribute('data-forbidden', 'true');
                btn.style.display = 'none';
                btn.classList.add('hidden');
            }
        }
        if (content && !allowed) {
            content.classList.add('hidden');
        }
    });

    // 2. Kiểm tra từng Nhóm lớn (group-1, group-2, group-3, group-4)
    Object.entries(REPORT_GROUP_MAPPING).forEach(([grpId, repList]) => {
        const num = grpId.replace('group-', '');
        const cardBtn = document.getElementById(`report-group-btn-${num}`);
        const allowedInGroup = repList.filter(r => canAccessReport(r));

        if (cardBtn) {
            // Cập nhật badge số lượng báo cáo thực tế được quyền xem
            const badge = cardBtn.querySelector('span.rounded-full');
            if (badge) {
                badge.innerText = `${allowedInGroup.length} BC`;
            }

            if (allowedInGroup.length === 0) {
                // ẨN HOÀN TOÀN Card Nhóm nếu không có báo cáo nào được xem!
                cardBtn.style.display = 'none';
                cardBtn.setAttribute('data-forbidden', 'true');
                cardBtn.classList.add('hidden');
            } else {
                cardBtn.style.display = '';
                cardBtn.removeAttribute('data-forbidden');
                cardBtn.classList.remove('hidden');
                if (!firstAllowedGroup) {
                    firstAllowedGroup = grpId;
                    firstAllowedReport = allowedInGroup[0];
                }
            }
        }
    });

    // 3. Nếu nhóm hiện tại hoặc subtab hiện tại không được phép xem -> nhảy sang báo cáo hợp lệ đầu tiên
    if (!canAccessReport(currentActiveReportSubtab) || (firstAllowedGroup && currentActiveReportGroup !== firstAllowedGroup && !REPORT_GROUP_MAPPING[currentActiveReportGroup]?.some(r => canAccessReport(r)))) {
        if (firstAllowedGroup && firstAllowedReport) {
            switchReportGroup(firstAllowedGroup, false);
            switchReportSubTab(firstAllowedReport);
        }
    } else {
        applyReportGroupFilterToButtons();
    }
}

function switchReportGroup(groupId, autoSwitchFirstChild = true) {
    const cardBtn = document.getElementById(`report-group-btn-${groupId.replace('group-', '')}`);
    if (cardBtn && cardBtn.getAttribute('data-forbidden') === 'true') {
        return; // Nhóm bị cấm truy cập
    }

    currentActiveReportGroup = groupId;
    try {
        localStorage.setItem('bim_report_group', groupId);
    } catch(e) {}
    currentReportViewMode = 'group'; // Luôn khóa cố định chế độ xem theo nhóm được chọn

    // Cập nhật trạng thái hiển thị của 4 Card Nhóm Lớn
    ['group-1', 'group-2', 'group-3', 'group-4'].forEach(g => {
        const num = g.replace('group-', '');
        const btn = document.getElementById(`report-group-btn-${num}`);
        if (!btn || btn.getAttribute('data-forbidden') === 'true') return;
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

    // Tự động kích hoạt báo cáo đầu tiên của nhóm mà USER CÓ QUYỀN XEM
    const groupReports = (REPORT_GROUP_MAPPING[groupId] || []).filter(r => canAccessReport(r));
    if (autoSwitchFirstChild && !groupReports.includes(currentActiveReportSubtab)) {
        if (groupReports.length > 0) {
            switchReportSubTab(groupReports[0]);
        }
    }
}


function applyReportGroupFilterToButtons() {
    const subtabButtons = document.querySelectorAll('.report-subtab-btn');
    subtabButtons.forEach(btn => {
        // Nếu bị cấm quyền thì ẩn hoàn toàn tuyệt đối
        if (btn.getAttribute('data-forbidden') === 'true') {
            btn.classList.add('hidden');
            btn.style.display = 'none';
            return;
        }
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
    if (!canAccessReport(subtabId)) {
        if (typeof showToast === 'function') {
            showToast('Bạn không có quyền truy cập báo cáo này!', 'warning');
        }
        return;
    }

    currentActiveReportSubtab = subtabId;
    try {
        localStorage.setItem('bim_report_subtab', subtabId);
        if (currentActiveReportGroup) {
            localStorage.setItem('bim_report_group', currentActiveReportGroup);
        }
    } catch(e) {}

    // Tự động nhận diện và kích hoạt Nhóm cha tương ứng nếu khác nhóm hiện tại
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
        activeBtn.classList.remove('hidden');
        activeBtn.style.display = '';
    }
}

window.canAccessReport = canAccessReport;
window.initReportPermissions = initReportPermissions;
window.switchReportGroup = switchReportGroup;
window.switchReportSubTab = switchReportSubTab;

function syncReportPeriodButtonsUI(period) {
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
}
window.syncReportPeriodButtonsUI = syncReportPeriodButtonsUI;

function changeReportPeriod(period) {
    if (period === 'this_year') period = 'year';
    currentReportPeriod = period;
    try {
        localStorage.setItem('bim_report_period', period);
    } catch(e) {}

    syncReportPeriodButtonsUI(period);
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
        canViewFinance = (data.can_view_finance !== false);

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

        // Render an toàn 14 Báo Cáo chuyên sâu (Zero-crash Architecture)
        try { if (canAccessReport('report-1')) renderReport1(data); } catch (e1) { console.warn('Lỗi render BC1:', e1); }
        try { if (canAccessReport('report-2')) renderReport2(data); } catch (e2) { console.warn('Lỗi render BC2:', e2); }
        try { if (canAccessReport('report-3')) renderReport3(data); } catch (e3) { console.warn('Lỗi render BC3:', e3); }
        try { if (canAccessReport('report-4')) renderReport4(data); } catch (e4) { console.warn('Lỗi render BC4:', e4); }
        try { if (canAccessReport('report-5')) renderReport5(data); } catch (e5) { console.warn('Lỗi render BC5:', e5); }
        try { if (canAccessReport('report-6')) renderReport6(data); } catch (e6) { console.warn('Lỗi render BC6:', e6); }
        try { if (canAccessReport('report-7')) renderReport7(data); } catch (e7) { console.warn('Lỗi render BC7:', e7); }
        try { if (canAccessReport('report-8')) renderReport8(data); } catch (e8) { console.warn('Lỗi render BC8:', e8); }
        try { if (canAccessReport('report-9')) renderReport9(data); } catch (e9) { console.warn('Lỗi render BC9:', e9); }
        try { if (canAccessReport('report-10')) renderReport10(data); } catch (e10) { console.warn('Lỗi render BC10:', e10); }
        try { if (canAccessReport('report-11')) renderReport11(data); } catch (e11) { console.warn('Lỗi render BC11:', e11); }
        try { if (canAccessReport('report-12')) renderReport12(data); } catch (e12) { console.warn('Lỗi render BC12:', e12); }
        try { if (canAccessReport('report-13')) renderReport13(data); } catch (e13) { console.warn('Lỗi render BC13:', e13); }
        try { if (canAccessReport('report-14')) renderReport14(data); } catch (e14) { console.warn('Lỗi render BC14:', e14); }
        try { if (canAccessReport('report-15')) renderReport15(data); } catch (e15) { console.warn('Lỗi render BC15:', e15); }
        try { if (canAccessReport('report-16')) renderReport16(data); } catch (e16) { console.warn('Lỗi render BC16:', e16); }
        try { if (canAccessReport('report-17')) renderReport17(data); } catch (e17) { console.warn('Lỗi render BC17:', e17); }

    } catch (err) {
        console.error('Lỗi khi tải dữ liệu báo cáo TMS:', err);
        showToast('danger', 'Không thể nạp dữ liệu phân tích báo cáo: ' + err.message, 'Lỗi Báo Cáo');
    }
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
