/**
 * BIM LOGISTICS — MODULE ROUTER & MODAL UTILITIES
 */

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
    '/settings': 'cai-dat'
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
    'cai-dat': '/settings'
};

// --- 9. ĐIỀU HƯỚNG TAB & SỰ KIỆN (CLEAN SEMANTIC URL ROUTING) ---
function switchTab(tabId, updateHistory = true) {
    if (!tabId) tabId = 'dashboard';

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
        const backBtnText = document.getElementById('settle-back-btn-text');
        if (backBtnText) {
            backBtnText.innerText = previousActiveTab === 'ke-toan' ? 'Quay lại Kế Toán' : 'Quay lại Điều Vận';
        }
    } else {
        previousActiveTab = tabId;
    }

    // Ẩn view chi tiết chuyến xe nếu đang mở
    const detailView = document.getElementById('view-trip-detail');
    if (detailView) detailView.classList.add('hidden-view');

    // Chuyển đổi hiển thị view
    document.querySelectorAll('.view').forEach(view => view.classList.add('hidden-view'));
    const targetView = document.getElementById(`view-${tabId}`);
    if (targetView) targetView.classList.remove('hidden-view');

    // Cập nhật Tiêu đề Phân hệ trên Topbar
    const topbarTitleEl = document.getElementById('topbar-page-title');
    if (topbarTitleEl) {
        const TAB_NAME_MAP = {
            'dashboard': 'Dashboard Tổng quan',
            'kinh-doanh': 'Sale & Booking',
            'dieu-van': 'Điều vận',
            'xe-bai': 'Xe & Bãi',
            'nhan-su': 'Hành chính & Nhân sự',
            'ke-toan': 'Tài chính & Kế toán',
            'quyet-toan': (previousActiveTab === 'ke-toan' ? 'Kế toán | Quyết toán chuyến' : 'Điều vận | Quyết toán chuyến'),
            'hai-quan': 'Dịch vụ Hải quan',
            'bao-cao': 'Báo cáo & Thống kê',
            'cai-dat': 'Cài đặt & Danh mục'
        };
        topbarTitleEl.innerText = TAB_NAME_MAP[tabId] || 'Dashboard Tổng quan';
    }

    // Cụm Bộ Chọn Kỳ Toàn Cục trên Topbar: Ẩn tại màn hình Quyết Toán (đã có bộ lọc từ ngày - đến ngày chuyên biệt)
    const dashboardActionsEl = document.getElementById('topbar-dashboard-actions');
    if (dashboardActionsEl) {
        if (tabId === 'quyet-toan') {
            dashboardActionsEl.classList.add('hidden');
        } else {
            dashboardActionsEl.classList.remove('hidden');
        }
    }

    // Nút Ẩn / Hiện Biểu Đồ chỉ hiển thị ở Dashboard
    const btnToggleCharts = document.getElementById('btn-toggle-dashboard-charts');
    if (btnToggleCharts) {
        if (tabId === 'dashboard') {
            btnToggleCharts.classList.remove('hidden');
        } else {
            btnToggleCharts.classList.add('hidden');
        }
    }

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
        const reportPeriodMap = {
            'today': 'today',
            '10_days': 'week',
            '7_days': 'week',
            'this_month': 'month',
            'this_quarter': 'quarter',
            'this_year': 'all',
            'custom': 'month'
        };
        if (typeof currentReportPeriod !== 'undefined') {
            currentReportPeriod = reportPeriodMap[currentDashboardPeriod] || 'week';
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
        if (tabId === 'bao-cao') loadReportsData();
        if (tabId === 'cai-dat') loadMasterData();
    } catch (loadErr) {
        console.error(`[App] Lỗi nạp dữ liệu tab ${tabId}:`, loadErr);
    }
}

function handleSearch(e) {
    if (e.key === 'Enter') {
        const topSearch = document.getElementById('top-search-input');
        const tableSearch = document.getElementById('table-search-input');
        if (topSearch && tableSearch) {
            tableSearch.value = topSearch.value;
        }
        switchTab('dieu-van');
        loadTripsData();
    }
}

// --- MASTER DATA FORM OPTIONS CACHE & POPULATION (Anti-Garbage Master Data Standard) ---
let masterDataFormOptionsCache = null;

async function loadMasterDataFormOptions(forceReload = false) {
    if (masterDataFormOptionsCache && !forceReload) {
        return masterDataFormOptionsCache;
    }
    try {
        const res = await fetchWithAuth('/api/master-data/form-options/');
        if (res.ok) {
            masterDataFormOptionsCache = await res.json();
            return masterDataFormOptionsCache;
        }
    } catch (err) {
        console.error('Lỗi tải danh mục Master Data form-options:', err);
    }
    return masterDataFormOptionsCache;
}

function setSelectValueCaseInsensitive(selectEl, value, label = null) {
    if (!selectEl || value === undefined || value === null) return;
    const strVal = String(value).trim();
    if (!strVal) {
        selectEl.value = '';
        return;
    }
    for (let i = 0; i < selectEl.options.length; i++) {
        if (selectEl.options[i].value.toLowerCase() === strVal.toLowerCase() ||
            selectEl.options[i].text.toLowerCase() === strVal.toLowerCase()) {
            selectEl.selectedIndex = i;
            return;
        }
    }
    const opt = document.createElement('option');
    opt.value = strVal;
    opt.innerText = label || strVal;
    selectEl.appendChild(opt);
    selectEl.value = strVal;
}

function populateMasterDataDropdowns() {
    if (!masterDataFormOptionsCache) return;
    const { customers, locations, drivers, vehicles, shipping_lines, routes } = masterDataFormOptionsCache;

    function fillSelect(elId, items, placeholder, valueKey = 'name', textKey = 'label') {
        const sel = document.getElementById(elId);
        if (!sel) return;
        const currentVal = sel.value;
        sel.innerHTML = `<option value="">${placeholder}</option>`;
        if (Array.isArray(items)) {
            items.forEach(item => {
                const val = typeof item === 'object' ? item[valueKey] : item;
                const txt = typeof item === 'object' ? (item[textKey] || item.name || item.code) : item;
                const opt = document.createElement('option');
                opt.value = val;
                opt.innerText = txt;
                sel.appendChild(opt);
            });
        }
        if (currentVal) {
            setSelectValueCaseInsensitive(sel, currentVal);
        }
    }

    // Modal Điều Vận (modal-create-trip)
    fillSelect('inp-customer', customers, '-- Chọn Khách Hàng Trong Danh Mục --', 'name', 'label');
    fillSelect('inp-pickup', locations?.pickup_options, '-- Chọn Cảng / Depot Lấy --', 'name', 'label');
    fillSelect('inp-warehouse', locations?.warehouse_options, '-- Chọn Kho Khách Hàng --', 'name', 'label');
    fillSelect('inp-dropoff', locations?.dropoff_options, '-- Chọn Nơi Hạ Cont --', 'name', 'label');
    fillSelect('inp-driver', drivers, '-- Chọn tài xế điều động --', 'nickname', 'label');

    // Chế độ Cắt Kéo (Drop & Hook)
    fillSelect('inp-driver-leg1', drivers, '-- Chọn tài xế lấy cont --', 'nickname', 'label');
    fillSelect('inp-dropoff-driver', drivers, '-- Chọn tài xế hạ cont --', 'nickname', 'label');
    fillSelect('inp-vehicle-leg1', vehicles, '-- Tự động theo tài xế --', 'plate', 'label');
    fillSelect('inp-dropoff-vehicle', vehicles, '-- Tự động theo tài xế --', 'plate', 'label');

    // Modal Booking (modal-booking)
    fillSelect('booking-customer', customers, '-- Chọn Khách Hàng Trong Danh Mục --', 'name', 'label');
    fillSelect('booking-pickup', locations?.pickup_options, '-- Chọn Điểm Lấy --', 'name', 'label');
    fillSelect('booking-delivery', locations?.warehouse_options, '-- Chọn Kho Khách --', 'name', 'label');
    fillSelect('booking-dropoff', locations?.dropoff_options, '-- Chọn Điểm Hạ --', 'name', 'label');

    // Datalist Hãng Tàu cho Booking
    const slDatalist = document.getElementById('shipping-lines-datalist');
    if (slDatalist && Array.isArray(shipping_lines)) {
        slDatalist.innerHTML = shipping_lines.map(sl => `<option value="${sl.code}">${sl.name} (DEM: ${sl.free_dem_days}d / DET: ${sl.free_det_days}d)</option>`).join('');
    }

    // Modal Báo Giá (modal-quotation)
    fillSelect('quote-customer', customers, '-- Chọn Khách Hàng Trong Danh Mục --', 'name', 'label');
    
    // Tuyến đường mẫu Báo giá
    const quotePreset = document.getElementById('quote-route-preset');
    if (quotePreset && Array.isArray(routes)) {
        quotePreset.innerHTML = '<option value="">-- Hoặc Chọn Tuyến Mẫu Danh Mục --</option>' +
            routes.map(r => `<option value="${r.route_name}" data-salary="${r.salary_rate}">${r.label || r.route_name}</option>`).join('');
    }
}

// --- BỘ LỌC TÌM KIẾM NHANH KHÁCH HÀNG TRÊN DROPDOWN (SEARCHABLE DROPDOWN) ---
function filterCustomerSelectOptions(searchId, selectId) {
    const searchInput = document.getElementById(searchId);
    const selectEl = document.getElementById(selectId);
    if (!searchInput || !selectEl) return;
    
    const keyword = searchInput.value.trim().toLowerCase();
    const options = selectEl.options;
    let firstMatch = null;
    
    for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        if (!opt.value) continue;
        const text = opt.text.toLowerCase();
        if (!keyword || text.includes(keyword)) {
            opt.style.display = '';
            if (!firstMatch && keyword) firstMatch = opt;
        } else {
            opt.style.display = 'none';
        }
    }
    if (firstMatch && keyword) {
        selectEl.value = firstMatch.value;
    }
}

// --- QUY TẮC MỞ NHANH MODAL MASTER DATA & TỰ ĐỘNG CHỌN (UNIVERSAL QUICK-ADD) ---
async function openMasterDataModalQuick(tabKey, targetSelectId = null) {
    quickMasterDataTargetSelectId = targetSelectId;
    currentMasterDataTab = tabKey;
    await openCreateMasterDataModal();
}

// --- XỬ LÝ KHU VỰC, TUYẾN ĐƯỜNG & SỐ KM BÁO GIÁ ---
function roundEstimatedKmInput(input) {
    if (!input) return;
    let val = parseInt(input.value) || 0;
    if (val > 0) {
        val = Math.max(10, Math.round(val / 10) * 10);
    } else {
        val = 0;
    }
    input.value = val;
}

function setQuoteKm(kmVal) {
    const el = document.getElementById('quote-estimated-km');
    if (el) {
        el.value = kmVal;
    }
}

function setTariffKm(kmVal) {
    const el = document.getElementById('mdf-estimated-km');
    if (el) {
        el.value = kmVal;
    }
}

function onQuoteZonesChanged() {
    const origZone = document.getElementById('quote-origin-zone')?.value || '';
    const destZone = document.getElementById('quote-dest-zone')?.value || '';
    const routeInput = document.getElementById('quote-route');
    const presetSelect = document.getElementById('quote-route-preset');
    const kmInput = document.getElementById('quote-estimated-km');

    // Lọc danh sách tuyến mẫu
    const routes = masterDataFormOptionsCache?.routes || [];
    let filtered = routes;
    if (destZone) {
        const destKeyword = destZone.split('(')[0].trim().toLowerCase();
        filtered = routes.filter(r => (r.area_group && r.area_group.toLowerCase().includes(destKeyword)) || (r.route_name && r.route_name.toLowerCase().includes(destKeyword)));
    }
    if (presetSelect) {
        presetSelect.innerHTML = '<option value="">-- Chọn Tuyến Mẫu --</option>' +
            (filtered.length ? filtered : routes).map(r => `<option value="${r.route_name}" data-salary="${r.salary_rate || 0}" data-km="${r.estimated_km || 0}">${r.label || r.route_name}${r.estimated_km ? ` (${r.estimated_km} km)` : ''}</option>`).join('');
    }

    // Tự sinh tên tuyến nếu cả 2 khu vực được chọn và ô tuyến đang trống hoặc đang là format khu vực cũ
    if (origZone && destZone && routeInput) {
        const cleanOrig = origZone.split('(')[0].trim().toUpperCase();
        const cleanDest = destZone.split('(')[0].trim().toUpperCase();
        if (!routeInput.value || routeInput.value.includes('➔')) {
            routeInput.value = `${cleanOrig} ➔ ${cleanDest}`;
        }
    }

    // Ước tính số km mặc định theo khoảng cách giữa 2 vùng (chuẩn hóa 10km)
    if (origZone && destZone && kmInput) {
        let estKm = 30;
        const o = origZone.toLowerCase();
        const d = destZone.toLowerCase();
        if (o.includes('cái mép') || d.includes('vũng tàu')) {
            estKm = 70;
        } else if (d.includes('tây ninh')) {
            estKm = 80;
        } else if (d.includes('bình dương') || d.includes('đồng nai') || d.includes('long an')) {
            estKm = 40;
        } else if (d.includes('củ chi')) {
            estKm = 50;
        } else {
            estKm = 30;
        }
        kmInput.value = estKm;
    }
}

function onQuoteRoutePresetChanged(routeVal) {
    const routeInput = document.getElementById('quote-route');
    const origZone = document.getElementById('quote-origin-zone')?.value || '';
    const cleanOrig = origZone ? origZone.split('(')[0].trim().toUpperCase() : 'CÁT LÁI';
    const presetSelect = document.getElementById('quote-route-preset');

    // Tự động load số km ước tính từ tuyến mẫu nếu có
    if (presetSelect && presetSelect.selectedOptions && presetSelect.selectedOptions.length > 0) {
        const opt = presetSelect.selectedOptions[0];
        const km = opt ? parseInt(opt.getAttribute('data-km')) : 0;
        if (km && km > 0) {
            const kmInput = document.getElementById('quote-estimated-km');
            if (kmInput) kmInput.value = km;
        }
    }

    if (routeInput && routeVal) {
        if (routeVal.toUpperCase().includes('➔') || routeVal.toUpperCase().includes('->')) {
            routeInput.value = routeVal;
        } else {
            routeInput.value = `${cleanOrig} ➔ ${routeVal}`;
        }
    }
}

// --- KHỞI TẠO MẶC ĐỊNH NGÀY/GIỜ CHO CÁC FORM TẠO MỚI ---
function initDefaultDatesForCreateTrip() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const loadingDateEl = document.getElementById('inp-loading-date');
    if (loadingDateEl && !loadingDateEl.value) {
        loadingDateEl.value = todayStr;
    }
    
    const loadingTimeEl = document.getElementById('inp-loading-time');
    if (loadingTimeEl && !loadingTimeEl.value) {
        loadingTimeEl.value = '08:00';
    }

    const cutoffDateEl = document.getElementById('inp-cutoff-date');
    if (cutoffDateEl && !cutoffDateEl.value) {
        cutoffDateEl.value = todayStr;
    }

    const cutoffTimeEl = document.getElementById('inp-cutoff-time');
    if (cutoffTimeEl && !cutoffTimeEl.value) {
        cutoffTimeEl.value = '17:00';
    }
    syncTripCutoff();
    
    const demDaysEl = document.getElementById('inp-det-free-days');
    if (demDaysEl && (!demDaysEl.value || demDaysEl.value === '3')) {
        demDaysEl.value = '7';
    }
    
    onFreeDaysChange();
}

function initDefaultDatesForQuotation() {
    const priceInput = document.getElementById('quote-unit-price');
    if (priceInput && !priceInput.value) priceInput.value = formatNumberVN(3800000);
    const tripsInput = document.getElementById('quote-monthly-trips');
    if (tripsInput && !tripsInput.value) tripsInput.value = formatNumberVN(20);
    calculateQuoteExpectedRevenue();
}

// --- NGHIỆP VỤ GHÉP 2 CONT 20FT (TWIN 20FT DRAYAGE TMS STANDARD) ---
function toggleTwinContMode(isTwin) {
    const twinSection = document.getElementById('section-twin-cont-2');
    const contTypeSel = document.getElementById('inp-cont-type');
    const cont1Title = document.getElementById('label-cont-1-title');

    if (isTwin) {
        if (twinSection) twinSection.classList.remove('hidden-view');
        if (cont1Title) cont1Title.innerHTML = '<i class="ph-bold ph-cube text-teal-600"></i> Container #1 (20ft)';
        if (contTypeSel) {
            setSelectValueCaseInsensitive(contTypeSel, '2x20DC');
        }
    } else {
        if (twinSection) twinSection.classList.add('hidden-view');
        if (cont1Title) cont1Title.innerHTML = '<i class="ph-bold ph-cube text-teal-600"></i> Thông Tin Vỏ Cont / Chì';
        // Reset dữ liệu Cont 2
        const cont2 = document.getElementById('inp-cont-2');
        const seal2 = document.getElementById('inp-seal-2');
        const booking2 = document.getElementById('inp-booking-2');
        const vgm2 = document.getElementById('inp-vgm-2');
        const notes2 = document.getElementById('inp-cargo-notes-2');
        if (cont2) cont2.value = '';
        if (seal2) seal2.value = '';
        if (booking2) booking2.value = '';
        if (vgm2) vgm2.value = '';
        if (notes2) notes2.value = '';
    }
}

// --- TÍNH HẠN TRẢ VỎ CONTAINER (7 NGÀY CỘNG 6 DO TÍNH CẢ NGÀY ĐẦU) ---
function onFreeDaysChange() {
    const daysInput = document.getElementById('inp-det-free-days');
    const expiryInput = document.getElementById('inp-det-expiry');
    const loadingDateInput = document.getElementById('inp-loading-date');
    if (!daysInput || !expiryInput) return;
    const days = parseInt(daysInput.value) || 0;
    if (days > 0) {
        const baseDate = (loadingDateInput && loadingDateInput.value) ? new Date(loadingDateInput.value) : new Date();
        const d = new Date(baseDate);
        // Tính hạn trả vỏ: ngày nhận cont là ngày 1 -> cộng thêm (days - 1) ngày
        d.setDate(d.getDate() + Math.max(0, days - 1));
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        expiryInput.value = `${yyyy}-${mm}-${dd}`;
    }
}

// --- NGHIỆP VỤ CẮT KÉO / CẮT MOOC (DROP & HOOK TMS STANDARD) ---
function toggleDropHookMode(isDropHook) {
    const directSection = document.getElementById('section-direct-dispatch');
    const dropHookSection = document.getElementById('section-drop-hook-dispatch');
    const mainDriver = document.getElementById('inp-driver');
    const leg1Driver = document.getElementById('inp-driver-leg1');
    const leg2Driver = document.getElementById('inp-dropoff-driver');

    // Xóa trạng thái báo lỗi cũ của các trường tài xế
    ['inp-driver', 'inp-driver-leg1', 'inp-dropoff-driver'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('input-error');
    });
    ['err-driver', 'err-driver-leg1', 'err-dropoff-driver'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    if (isDropHook) {
        if (directSection) directSection.classList.add('hidden-view');
        if (dropHookSection) dropHookSection.classList.remove('hidden-view');
        if (mainDriver) mainDriver.removeAttribute('required');
        if (leg1Driver) leg1Driver.setAttribute('required', 'required');
        if (leg2Driver) leg2Driver.setAttribute('required', 'required');
        
        // Kế thừa giá trị tài xế nếu đã chọn ở direct
        if (mainDriver && mainDriver.value && leg1Driver && !leg1Driver.value) {
            setSelectValueCaseInsensitive(leg1Driver, mainDriver.value);
            onDriverLeg1Change(mainDriver.value);
        }
    } else {
        if (directSection) directSection.classList.remove('hidden-view');
        if (dropHookSection) dropHookSection.classList.add('hidden-view');
        if (mainDriver) mainDriver.setAttribute('required', 'required');
        if (leg1Driver) leg1Driver.removeAttribute('required');
        if (leg2Driver) leg2Driver.removeAttribute('required');

        // Kế thừa ngược lại nếu đã chọn ở leg1
        if (leg1Driver && leg1Driver.value && mainDriver) {
            setSelectValueCaseInsensitive(mainDriver, leg1Driver.value);
        }
    }
}

function onDriverLeg1Change(driverNickname) {
    if (!masterDataFormOptionsCache) return;
    const { drivers, vehicles } = masterDataFormOptionsCache;
    const driver = (drivers || []).find(d => (d.nickname === driverNickname || d.full_name === driverNickname || d.code === driverNickname));
    const vehSel = document.getElementById('inp-vehicle-leg1');
    if (!vehSel || !driver) return;
    const matchedVeh = (vehicles || []).find(v => v.driver_id === driver.id || v.driver_name === driver.nickname);
    if (matchedVeh) {
        setSelectValueCaseInsensitive(vehSel, matchedVeh.plate);
    }
}

function onDriverLeg2Change(driverNickname) {
    if (!masterDataFormOptionsCache) return;
    const { drivers, vehicles } = masterDataFormOptionsCache;
    const driver = (drivers || []).find(d => (d.nickname === driverNickname || d.full_name === driverNickname || d.code === driverNickname));
    const vehSel = document.getElementById('inp-dropoff-vehicle');
    if (!vehSel || !driver) return;
    const matchedVeh = (vehicles || []).find(v => v.driver_id === driver.id || v.driver_name === driver.nickname);
    if (matchedVeh) {
        setSelectValueCaseInsensitive(vehSel, matchedVeh.plate);
    }
}

function onSplitRatioChange(ratio) {
    const r = parseInt(ratio) || 50;
    const badgeLeg1 = document.getElementById('badge-ratio-leg1');
    const badgeLeg2 = document.getElementById('badge-ratio-leg2');
    if (badgeLeg1) badgeLeg1.innerText = `Tỷ lệ: ${r}%`;
    if (badgeLeg2) badgeLeg2.innerText = `Tỷ lệ: ${100 - r}%`;
}

let activeBookingsCache = [];

async function loadActiveBookingsForModal(selectedBookingId = null) {
    const sel = document.getElementById('select-booking-order');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Đang tải danh sách Booking từ Sale... --</option>';
    try {
        const res = await fetchWithAuth('/api/bookings/active/');
        if (!res.ok) throw new Error('Lỗi tải booking');
        activeBookingsCache = await res.json();
        
        sel.innerHTML = '<option value="">-- Chọn Booking / Đơn Hàng Từ Sale (Hoặc Nhập Thủ Công) --</option>';
        activeBookingsCache.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.id;
            opt.innerText = `[${b.booking_code}] ${b.customer_name} | B/L: ${b.booking_number} (${b.container_size} - Còn ${b.remaining_containers} cont) | Kho: ${b.delivery_location}`;
            if (selectedBookingId && String(selectedBookingId) === String(b.id)) {
                opt.selected = true;
            }
            sel.appendChild(opt);
        });

        if (selectedBookingId) {
            onBookingSelected(selectedBookingId);
        }
    } catch (err) {
        console.error('Error loading active bookings:', err);
        sel.innerHTML = '<option value="">-- Lỗi tải danh sách Booking (Nhập thủ công) --</option>';
    }
}

function onBookingSelected(bookingId) {
    if (!bookingId) {
        const fileInput = document.getElementById('inp-booking-file');
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            clearBookingFileSelection();
        }
        return;
    }
    const b = activeBookingsCache.find(item => String(item.id) === String(bookingId));
    if (!b) return;

    // Tự động điền 9 trường dữ liệu kế thừa từ Booking của Sale
    const custEl = document.getElementById('inp-customer');
    if (custEl) setSelectValueCaseInsensitive(custEl, b.customer_name);
    
    const contTypeEl = document.getElementById('inp-cont-type');
    if (contTypeEl) setSelectValueCaseInsensitive(contTypeEl, b.container_size || '40HC');

    const bookingEl = document.getElementById('inp-booking');
    if (bookingEl) bookingEl.value = b.booking_number || '';

    if (b.closing_time) {
        parseAndSetDateTimeFields(b.closing_time, 'inp-cutoff-date', 'inp-cutoff-time', 'inp-cutoff', '17:00');
    } else {
        const cutoffEl = document.getElementById('inp-cutoff');
        if (cutoffEl) cutoffEl.value = '';
    }

    const loadTimeEl = document.getElementById('inp-load-time');
    if (loadTimeEl) loadTimeEl.value = `${b.loading_date_display || ''} - ${b.loading_time || '08:00'}`.trim();

    const pickupEl = document.getElementById('inp-pickup');
    if (pickupEl) setSelectValueCaseInsensitive(pickupEl, b.pickup_location);

    const warehouseEl = document.getElementById('inp-warehouse');
    if (warehouseEl) setSelectValueCaseInsensitive(warehouseEl, b.delivery_location);

    const dropoffEl = document.getElementById('inp-dropoff');
    if (dropoffEl) setSelectValueCaseInsensitive(dropoffEl, b.dropoff_location);

    const notesEl = document.getElementById('inp-notes');
    if (notesEl && b.notes) notesEl.value = b.notes;

    if (b.free_time_detention) {
        const detEl = document.getElementById('inp-det-free-days');
        if (detEl) {
            detEl.value = b.free_time_detention;
            onFreeDaysChange();
        }
    }
    if (b.free_time_demurrage) {
        const demEl = document.getElementById('inp-dem-free-days');
        if (demEl) demEl.value = b.free_time_demurrage;
    }

    // Tự động kế thừa file Booking / Lệnh cấp rỗng nếu có
    if (b.booking_file_url) {
        showInheritedBookingFile(b.booking_file_url, b.booking_file_name || `Booking_${b.booking_number}`);
    } else {
        const fileInput = document.getElementById('inp-booking-file');
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            clearBookingFileSelection();
        }
    }

    // Xóa cảnh báo viền đỏ (nếu có)
    ['inp-customer', 'inp-pickup', 'inp-warehouse'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('input-error');
    });
    ['err-customer', 'err-pickup', 'err-warehouse'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    showToast('success', `Đã kế thừa 9 trường dữ liệu và file booking từ [${b.booking_code}] - Khách hàng: ${b.customer_name}`, 'Kế Thừa Thành Công');
}

async function dispatchFromBooking(bookingId) {
    if (typeof openCreateTripPage === 'function') {
        await openCreateTripPage(bookingId, true);
    } else {
        await openModal('modal-create-trip', bookingId);
    }
}

async function openModal(id, extraParam = null) { 
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden-view'); 
    initAllNumberInputs();
    if (id === 'modal-create-trip') {
        clearBookingFileSelection();
        const chk = document.getElementById('chk-drop-hook');
        if (chk) {
            chk.checked = false;
            toggleDropHookMode(false);
        }
        const chkTwin = document.getElementById('chk-twin-cont');
        if (chkTwin) {
            chkTwin.checked = false;
            toggleTwinContMode(false);
        }
        initDefaultDatesForCreateTrip();
        onFreeDaysChange();
        await loadMasterDataFormOptions();
        populateMasterDataDropdowns();
        await loadActiveBookingsForModal(extraParam);
    }
}

function closeModal(id) { 
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden-view'); 
    if (id === 'modal-ocr') resetOcr();
    if (id === 'modal-create-trip') clearBookingFileSelection();
    if (id === 'modal-booking') clearSaleBookingFileSelection();
}

