// Bảng ánh xạ Clean Semantic Routes chuẩn Quốc Tế (SaaS TMS / ERP Standard)
const ROUTE_TAB_MAP = {
    '': 'dashboard',
    '/': 'dashboard',
    '/dashboard': 'dashboard',
    '/dispatch': 'dieu-van',
    '/sales': 'kinh-doanh',
    '/fleet': 'xe-bai',
    '/hr': 'nhan-su',
    '/accounting': 'ke-toan',
    '/settlements': 'quyet-toan',
    '/quyet-toan': 'quyet-toan',
    '/customs': 'hai-quan',
    '/reports': 'bao-cao',
    '/settings': 'cai-dat',
    '/news': 'ban-tin',
    '/tasks': 'giao-viec'
};

const TAB_ROUTE_MAP = {
    'dashboard': '/',
    'dieu-van': '/dispatch',
    'kinh-doanh': '/sales',
    'xe-bai': '/fleet',
    'nhan-su': '/hr',
    'ke-toan': '/accounting',
    'quyet-toan': '/settlements',
    'hai-quan': '/customs',
    'bao-cao': '/reports',
    'cai-dat': '/settings',
    'ban-tin': '/news',
    'giao-viec': '/tasks'
};

// --- QUẢN LÝ CHẾ ĐỘ HIỂN THỊ TOPBAR LINH HOẠT (FULLPAGE BREADCRUMB VS STANDARD TABS) ---
function setTopbarFullpageMode(config) {
    // Áp dụng đúng trạng thái đã lưu của người dùng (nếu unhide thì giữ unhide, nếu hide thì giữ hide)
    if (typeof applySidebarStateFromStorage === 'function') {
        applySidebarStateFromStorage();
    }

    const stdWrapper = document.getElementById('topbar-standard-wrapper');
    const fullWrapper = document.getElementById('topbar-fullpage-wrapper');
    if (stdWrapper) stdWrapper.classList.add('hidden');
    if (fullWrapper) fullWrapper.classList.remove('hidden');

    const btnSidebar = document.getElementById('btn-toggle-sidebar');
    const btnBack = document.getElementById('btn-topbar-back');
    if (btnSidebar) btnSidebar.classList.remove('hidden');
    if (btnBack) {
        btnBack.classList.remove('hidden');
        btnBack.title = `Quay lại ${config.prefix || 'trang mẹ'}`;
    }

    window.topbarBackHandler = config.backFn || function() {
        if (typeof previousActiveTab !== 'undefined' && previousActiveTab) {
            switchTab(previousActiveTab, true);
        } else {
            switchTab('dashboard', true);
        }
    };

    const prefixEl = document.getElementById('topbar-fullpage-prefix');
    if (prefixEl) {
        prefixEl.innerText = config.prefix || 'Hệ Thống';
        prefixEl.title = `Quay lại ${config.prefix || 'trang mẹ'}`;
    }

    const titleEl = document.getElementById('topbar-fullpage-title');
    if (titleEl) titleEl.innerText = config.title || '';

    // Chuẩn hóa giao diện: Ẩn triệt để badges, subText và action buttons trên Topbar (đã chuyển xuống footer form)
    const badgesContainer = document.getElementById('topbar-fullpage-badges');
    if (badgesContainer) {
        badgesContainer.innerHTML = '';
        badgesContainer.classList.add('hidden');
    }

    const subEl = document.getElementById('topbar-fullpage-sub');
    if (subEl) {
        subEl.innerHTML = '';
        subEl.classList.add('hidden');
    }

    const actionsContainer = document.getElementById('topbar-fullpage-actions');
    if (actionsContainer) {
        actionsContainer.innerHTML = '';
        actionsContainer.classList.add('hidden');
    }
}

function resetTopbarStandardMode(tabId) {
    const stdWrapper = document.getElementById('topbar-standard-wrapper');
    const fullWrapper = document.getElementById('topbar-fullpage-wrapper');
    if (fullWrapper) fullWrapper.classList.add('hidden');
    if (stdWrapper) stdWrapper.classList.remove('hidden');

    const btnSidebar = document.getElementById('btn-toggle-sidebar');
    const btnBack = document.getElementById('btn-topbar-back');
    if (btnBack) btnBack.classList.add('hidden');
    if (btnSidebar) btnSidebar.classList.remove('hidden');

    if (typeof applySidebarStateFromStorage === 'function') {
        applySidebarStateFromStorage();
    }
}

// --- 9. ĐIỀU HƯỚNG TAB & SỰ KIỆN (CLEAN SEMANTIC URL ROUTING) ---
function switchTab(tabId, updateHistory = true) {
    if (!tabId) tabId = 'dashboard';

    // Chuẩn hóa trạng thái Sidebar từ localStorage (Unhide luôn Unhide ở tất cả màn hình, Hide luôn Hide và tắt peek)
    if (typeof applySidebarStateFromStorage === 'function') {
        applySidebarStateFromStorage();
    }

    // 1. Luôn đồng bộ URL sạch trên thanh địa chỉ trình duyệt trước tiên
    if (updateHistory && window.history && window.history.pushState) {
        const routePath = TAB_ROUTE_MAP[tabId] || '/';
        if (window.location.pathname !== routePath || window.location.hash) {
            try {
                window.history.pushState({ tabId }, '', routePath);
            } catch (err) {
                console.warn('[Router] Không thể cập nhật pushState:', err);
            }
        }
    }

    const curUser = window.CURRENT_USER || {};
    const role = curUser.role || '';
    const isAdmin = curUser.is_superuser || curUser.is_staff;

    // RBAC Phân quyền mềm: Cho phép điều hướng và chỉ nhắc nhở nếu thiếu quyền
    if (!isAdmin && role) {
        if (tabId === 'quyet-toan' && !['DIRECTOR', 'DISPATCHER', 'ACCOUNTANT'].includes(role)) {
            if (typeof showToast === 'function') {
                showToast('warning', 'Tính năng Quyết toán gom chuyến dành cho Điều độ viên, Kế toán và Ban Giám Đốc!', 'Hạn Chế Quyền');
            }
        }
    }

    // Khôi phục Topbar về chế độ tiêu chuẩn khi đổi tab
    resetTopbarStandardMode(tabId);

    // Cập nhật trạng thái active trên Sidebar Menu
    document.querySelectorAll('.sidebar-item-main').forEach(btn => {
        btn.classList.remove('active');
        const icon = btn.querySelector('i');
        if (icon) icon.className = icon.className.replace('text-teal-300', 'text-slate-400');
    });

    const activeTarget = (tabId === 'quyet-toan') ? (previousActiveTab === 'ke-toan' ? 'ke-toan' : 'dieu-van') : tabId;
    const activeBtn = document.querySelector(`[data-target="${activeTarget}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
        const icon = activeBtn.querySelector('i');
        if (icon) icon.className = icon.className.replace('text-slate-400', 'text-teal-300');
    }

    if (tabId === 'quyet-toan') {
        const originPrefix = (previousActiveTab === 'ke-toan' ? 'Tài chính & Kế toán' : 'Điều Vận');
        setTopbarFullpageMode({
            backFn: returnFromSettlementView,
            prefix: originPrefix,
            title: 'Quyết Toán Gom Chuyến Xe'
        });
        const backBtnText = document.getElementById('settle-back-btn-text');
        if (backBtnText) {
            backBtnText.innerText = `Quay Lại ${originPrefix}`;
        }
    } else {
        previousActiveTab = tabId;
    }

    // Ẩn view chi tiết chuyến xe, phiếu thu chi, bảng kê đối soát nếu đang mở
    const detailView = document.getElementById('view-trip-detail');
    if (detailView) detailView.classList.add('hidden-view');
    const voucherDetailView = document.getElementById('view-cash-voucher-detail');
    if (voucherDetailView) voucherDetailView.classList.add('hidden-view');
    const soaDetailView = document.getElementById('view-customer-ar-statement');
    if (soaDetailView) soaDetailView.classList.add('hidden-view');

    // Chuyển đổi hiển thị view
    const targetView = document.getElementById(`view-${tabId}`);
    if (!targetView) {
        // Nếu trang hiện tại là trang đơn (như /news/<hashid>/), điều hướng sang URL tương ứng
        const routePath = TAB_ROUTE_MAP[tabId] || '/';
        window.location.href = routePath;
        return;
    }
    document.querySelectorAll('.view').forEach(view => view.classList.add('hidden-view'));
    targetView.classList.remove('hidden-view');
    targetView.scrollTop = 0;

    // Cập nhật Tiêu đề Phân hệ trên Topbar
    const topbarTitleEl = document.getElementById('topbar-page-title');
    if (topbarTitleEl) {
        const TAB_NAME_MAP = {
            'dashboard': 'Dashboard Tổng quan',
            'kinh-doanh': 'Sale & Booking',
            'dieu-van': 'Điều vận',
            'xe-bai': 'Xe & Bãi',
            'nhan-su': 'Hành chính & Nhân sự',
            'employee-form': 'Hành chính & Nhân sự',
            'ke-toan': 'Tài chính & Kế toán',
            'quyet-toan': (previousActiveTab === 'ke-toan' ? 'Kế toán | Quyết toán chuyến' : 'Điều vận | Quyết toán chuyến'),
            'hai-quan': 'Dịch vụ Hải quan',
            'customs-form': 'Dịch vụ Hải quan',
            'bao-cao': 'Báo cáo & Thống kê',
            'cai-dat': 'Cài đặt & Danh mục',
            'ban-tin': 'Bản tin Công ty & Thông báo Nội bộ',
            'giao-viec': 'Quản lý Giao việc Văn phòng'
        };
        topbarTitleEl.innerText = TAB_NAME_MAP[tabId] || 'Dashboard Tổng quan';
    }

    // Topbar đã được chuẩn hóa cố định (Clean & Stable Topbar - Zero Layout Shift)
    // Các bộ chọn kỳ và thao tác được tích hợp trực tiếp trong nội bộ từng phân hệ

    // Đồng bộ khoảng ngày hiện tại vào các view có bộ lọc ngày
    const globalDates = getDateRangeForPeriod(currentDashboardPeriod, currentDashboardCustomStart, currentDashboardCustomEnd);
    if (tabId === 'quyet-toan') {
        const settleFrom = document.getElementById('settle-from-date');
        const settleTo = document.getElementById('settle-to-date');
        if (settleFrom) settleFrom.value = globalDates.fromDate;
        if (settleTo) settleTo.value = globalDates.toDate;
    } else if (tabId === 'ke-toan') {
        const acctFrom = document.getElementById('acct-rep-from-date');
        const acctTo = document.getElementById('acct-rep-to-date');
        if (acctFrom) acctFrom.value = globalDates.fromDate;
        if (acctTo) acctTo.value = globalDates.toDate;
    } else if (tabId === 'bao-cao') {
        const savedPeriod = (function() { try { return localStorage.getItem('bim_report_period') || currentReportPeriod || 'year'; } catch(e) { return currentReportPeriod || 'year'; } })();
        currentReportPeriod = savedPeriod;
        if (typeof syncReportPeriodButtonsUI === 'function') {
            syncReportPeriodButtonsUI(savedPeriod);
        }
    }

    // Tự động kích hoạt nạp dữ liệu cho phân hệ tương ứng
    try {
        if (tabId === 'dashboard') loadDashboardData();
        if (tabId === 'dieu-van') loadTripsData();
        if (tabId === 'nhan-su') loadHRData();
        if (tabId === 'xe-bai') loadFleetData();
        if (tabId === 'kinh-doanh') loadSalesData();
        if (tabId === 'ke-toan') {
            switchAccountingSubTab(currentAccountingSubTab || 'acct-cashbook');
            loadAccountingAdvancesData();
        }
        if (tabId === 'quyet-toan') loadSettlementData();
        if (tabId === 'hai-quan') fetchCustomsDeclarations();
        if (tabId === 'bao-cao') {
            initReportPermissions();
            try {
                const savedGroup = localStorage.getItem('bim_report_group');
                const savedSubtab = localStorage.getItem('bim_report_subtab');
                if (savedGroup && typeof switchReportGroup === 'function') {
                    switchReportGroup(savedGroup, false);
                }
                if (savedSubtab && typeof switchReportSubTab === 'function' && typeof canAccessReport === 'function' && canAccessReport(savedSubtab)) {
                    switchReportSubTab(savedSubtab);
                }
            } catch(e) {}
            loadReportsData();
        }
        if (tabId === 'cai-dat') loadMasterData();
        if (tabId === 'ban-tin') {
            if (typeof loadCompanyNews === 'function') loadCompanyNews();
        }
        if (tabId === 'giao-viec') {
            if (typeof loadOfficeTasks === 'function') loadOfficeTasks();
        }
    } catch (loadErr) {
        console.error(`[App] Lỗi nạp dữ liệu tab ${tabId}:`, loadErr);
    }
}


// Hàm phân giải URL khi tải trang lần đầu (Hỗ trợ Clean Semantic URL & Deep-link HashID)
function resolveInitialRoute() {
    const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
    const hash = window.location.hash ? window.location.hash.replace('#', '').replace(/^\/+/, '') : '';

    // 0. Kiểm tra URL trang chi tiết bản tin: /news/<hashid> (đã được Django render trên base.html)
    const newsDetailMatch = pathname.match(/^\/news\/([a-zA-Z0-9_-]+)/);
    if (newsDetailMatch && newsDetailMatch[1]) {
        return;
    }

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

    // 1.3. Kiểm tra deep-link phiếu thu / chi trang riêng: /accounting/vouchers/<id_or_code>
    const voucherMatch = pathname.match(/^\/accounting\/vouchers\/([a-zA-Z0-9_.-]+)/) || (hash.startsWith('voucher/') ? hash.match(/^voucher\/([a-zA-Z0-9_.-]+)/) : null);
    if (voucherMatch && voucherMatch[1]) {
        const voucherIdentifier = voucherMatch[1];
        switchTab('ke-toan', false);
        if (typeof viewCashVoucherDetail === 'function') {
            viewCashVoucherDetail(voucherIdentifier, false);
        }
        if (window.history && window.history.replaceState) {
            window.history.replaceState({ view: 'cash-voucher-detail', voucherIdentifier }, '', `/accounting/vouchers/${voucherIdentifier}`);
        }
        return;
    }

    // 1.4. Kiểm tra deep-link hồ sơ nhân sự trang riêng: /personnel/employees/<id>
    const empMatch = pathname.match(/^\/personnel\/employees\/([a-zA-Z0-9_-]+)/);
    if (empMatch && empMatch[1]) {
        const empId = empMatch[1];
        switchTab('nhan-su', false);
        if (empId === 'new') {
            if (typeof openCreateEmployeePage === 'function') openCreateEmployeePage(false);
        } else {
            if (typeof openEditEmployeePage === 'function') openEditEmployeePage(empId, false);
        }
        return;
    }

    // 1.5. Kiểm tra deep-link hợp đồng lao động trang riêng: /personnel/contracts/<id>
    const contractMatch = pathname.match(/^\/personnel\/contracts\/([a-zA-Z0-9_-]+)/);
    if (contractMatch && contractMatch[1]) {
        const contractId = contractMatch[1];
        switchTab('nhan-su', false);
        if (contractId === 'new') {
            if (typeof openCreateContractPage === 'function') openCreateContractPage(null, false);
        } else {
            if (typeof openContractDetailPage === 'function') openContractDetailPage(contractId, false);
        }
        return;
    }

    // 2. Chuyển đổi tương thích ngược & Deep-link qua Hash (#tasks, #news, #task-123...)
    if (hash) {
        const taskMatch = hash.match(/^task-(\d+)/);
        if (taskMatch && taskMatch[1]) {
            switchTab('giao-viec', false);
            setTimeout(() => {
                if (typeof openTaskDetailDrawer === 'function') {
                    openTaskDetailDrawer(parseInt(taskMatch[1], 10));
                }
            }, 300);
            return;
        }

        const newsMatch = hash.match(/^news-(\d+)/);
        if (newsMatch && newsMatch[1]) {
            switchTab('ban-tin', false);
            setTimeout(() => {
                if (typeof openNewsDetailModal === 'function') {
                    openNewsDetailModal(parseInt(newsMatch[1], 10));
                }
            }, 300);
            return;
        }

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
            'cai-dat': 'cai-dat',
            'ban-tin': 'ban-tin',
            'news': 'ban-tin',
            'giao-viec': 'giao-viec',
            'tasks': 'giao-viec'
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
    if (pathname.match(/^\/news\/([a-zA-Z0-9_-]+)/)) {
        return;
    }
    const tripMatch = pathname.match(/^\/dispatch\/trips\/([a-zA-Z0-9_-]+)/);
    const quoteMatch = pathname.match(/^\/sales\/quotations\/([a-zA-Z0-9_-]+)/);
    const bookingMatch = pathname.match(/^\/sales\/bookings\/([a-zA-Z0-9_-]+)/);
    const voucherMatch = pathname.match(/^\/accounting\/vouchers\/([a-zA-Z0-9_.-]+)/);

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
    } else if (voucherMatch && voucherMatch[1]) {
        switchTab('ke-toan', false);
        if (typeof viewCashVoucherDetail === 'function') {
            viewCashVoucherDetail(voucherMatch[1], false);
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
        const cashVoucherDetailView = document.getElementById('view-cash-voucher-detail');
        if (cashVoucherDetailView && !cashVoucherDetailView.classList.contains('hidden-view')) {
            cashVoucherDetailView.classList.add('hidden-view');
        }
        switchTab(targetTab, false);
    }
});
