// Biến lưu trữ biểu đồ và dữ liệu Dashboard
let bgdRevenueChart = null;
let bgdDonutChart = null;
let currentDonutType = 'fleet';
let bgdDataCache = null;
let previousActiveTab = 'dashboard';
let currentDashboardPeriod = '10_days';
let currentDashboardCustomStart = null;
let currentDashboardCustomEnd = null;

function getDateRangeForPeriod(period, customStart, customEnd) {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = now.getMonth(); // 0-indexed
    
    const fmt = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    if (period === 'today') {
        const tStr = fmt(now);
        return { fromDate: tStr, toDate: tStr };
    }
    if (period === '10_days' || period === '7_days') {
        const past = new Date(now);
        const daysAgo = (period === '7_days') ? 6 : 9;
        past.setDate(now.getDate() - daysAgo);
        return { fromDate: fmt(past), toDate: fmt(now) };
    }
    if (period === 'this_month') {
        const first = new Date(yyyy, mm, 1);
        const last = new Date(yyyy, mm + 1, 0);
        return { fromDate: fmt(first), toDate: fmt(last) };
    }
    if (period === 'this_quarter') {
        const qStartMonth = Math.floor(mm / 3) * 3;
        const first = new Date(yyyy, qStartMonth, 1);
        const last = new Date(yyyy, qStartMonth + 3, 0);
        return { fromDate: fmt(first), toDate: fmt(last) };
    }
    if (period === 'this_year') {
        return { fromDate: `${yyyy}-01-01`, toDate: `${yyyy}-12-31` };
    }
    if (period === 'custom' && customStart && customEnd) {
        return { fromDate: customStart, toDate: customEnd };
    }
    const past = new Date(now);
    past.setDate(now.getDate() - 9);
    return { fromDate: fmt(past), toDate: fmt(now) };
}
window.getDateRangeForPeriod = getDateRangeForPeriod;

function toggleDashboardPeriodDropdown(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('topbar-period-menu');
    if (menu) menu.classList.toggle('hidden');
}
window.toggleDashboardPeriodDropdown = toggleDashboardPeriodDropdown;

function setDashboardPeriod(period, label) {
    currentDashboardPeriod = period;
    const labelEl = document.getElementById('topbar-period-label');
    if (labelEl) labelEl.innerText = label;

    // Update active style on menu items
    document.querySelectorAll('#topbar-period-menu .period-item').forEach(item => {
        const itemPeriod = item.getAttribute('data-period');
        if (itemPeriod === period) {
            item.className = 'w-full text-left px-3 py-2 hover:bg-teal-50 hover:text-teal-900 flex items-center justify-between font-bold text-teal-800 bg-teal-50/60 period-item';
            item.innerHTML = `<span>${label}</span><i class="ph-bold ph-check text-teal-600"></i>`;
        } else {
            const itemLabel = item.querySelector('span')?.innerText || item.innerText.trim();
            item.className = 'w-full text-left px-3 py-2 hover:bg-teal-50 hover:text-teal-900 flex items-center justify-between period-item';
            item.innerHTML = `<span>${itemLabel}</span>`;
        }
    });

    const menu = document.getElementById('topbar-period-menu');
    if (menu) menu.classList.add('hidden');

    const dateRange = getDateRangeForPeriod(period, currentDashboardCustomStart, currentDashboardCustomEnd);

    // Đồng bộ vào các input ngày của Quyết toán nếu có
    const settleFrom = document.getElementById('settle-from-date');
    const settleTo = document.getElementById('settle-to-date');
    if (settleFrom) settleFrom.value = dateRange.fromDate;
    if (settleTo) settleTo.value = dateRange.toDate;

    // Đồng bộ vào các input ngày của Kế toán nếu có
    const acctFrom = document.getElementById('acct-rep-from-date');
    const acctTo = document.getElementById('acct-rep-to-date');
    if (acctFrom) acctFrom.value = dateRange.fromDate;
    if (acctTo) acctTo.value = dateRange.toDate;

    // Nhận diện view hiện tại và tải dữ liệu tương ứng
    const activeView = document.querySelector('.view:not(.hidden-view)');
    const currentTab = activeView ? activeView.id.replace('view-', '') : 'dashboard';

    if (currentTab === 'dashboard') {
        loadDashboardData(period);
    } else if (currentTab === 'quyet-toan') {
        loadSettlementData();
    } else if (currentTab === 'ke-toan') {
        switchAccountingSubTab(currentAccountingSubTab || 'acct-cashbook');
    } else if (currentTab === 'bao-cao') {
        const reportPeriodMap = {
            'today': 'today',
            '10_days': 'week',
            '7_days': 'week',
            'this_month': 'month',
            'this_quarter': 'quarter',
            'this_year': 'all',
            'custom': 'month'
        };
        const rPeriod = reportPeriodMap[period] || 'week';
        if (typeof changeReportPeriod === 'function') {
            changeReportPeriod(rPeriod);
        } else {
            loadReportsData();
        }
    } else if (currentTab === 'dieu-van') {
        loadTripsData();
    } else if (currentTab === 'kinh-doanh') {
        loadSalesData();
    } else if (currentTab === 'hai-quan') {
        fetchCustomsDeclarations();
    } else if (currentTab === 'xe-bai') {
        loadFleetData();
    } else if (currentTab === 'nhan-su') {
        loadHRData();
    } else if (currentTab === 'cai-dat') {
        loadMasterData();
    } else {
        loadDashboardData(period);
    }
}
window.setDashboardPeriod = setDashboardPeriod;

function openDashboardCustomDatePicker(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('topbar-period-menu');
    if (menu) menu.classList.add('hidden');
    
    const popover = document.getElementById('topbar-custom-date-popover');
    if (popover) {
        popover.classList.remove('hidden');
        const startInput = document.getElementById('topbar-custom-start-date');
        const endInput = document.getElementById('topbar-custom-end-date');
        
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;
        
        if (startInput && !startInput.value) {
            startInput.value = currentDashboardCustomStart || `${yyyy}-${mm}-01`;
        }
        if (endInput && !endInput.value) {
            endInput.value = currentDashboardCustomEnd || todayStr;
        }
    }
}
window.openDashboardCustomDatePicker = openDashboardCustomDatePicker;

function closeDashboardCustomDatePicker() {
    const popover = document.getElementById('topbar-custom-date-popover');
    if (popover) popover.classList.add('hidden');
}
window.closeDashboardCustomDatePicker = closeDashboardCustomDatePicker;

function applyDashboardCustomDate() {
    const startInput = document.getElementById('topbar-custom-start-date');
    const endInput = document.getElementById('topbar-custom-end-date');
    
    if (!startInput || !endInput || !startInput.value || !endInput.value) {
        showToast('warning', 'Vui lòng chọn đầy đủ Từ ngày và Đến ngày', 'Cảnh báo');
        return;
    }
    
    currentDashboardCustomStart = startInput.value;
    currentDashboardCustomEnd = endInput.value;
    
    closeDashboardCustomDatePicker();
    
    const startDateObj = new Date(currentDashboardCustomStart);
    const endDateObj = new Date(currentDashboardCustomEnd);
    const sStr = `${String(startDateObj.getDate()).padStart(2, '0')}/${String(startDateObj.getMonth() + 1).padStart(2, '0')}`;
    const eStr = `${String(endDateObj.getDate()).padStart(2, '0')}/${String(endDateObj.getMonth() + 1).padStart(2, '0')}`;
    const customLabel = `${sStr} - ${eStr}`;
    
    setDashboardPeriod('custom', customLabel);
}
window.applyDashboardCustomDate = applyDashboardCustomDate;
