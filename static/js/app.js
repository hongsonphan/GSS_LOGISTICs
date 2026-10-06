/**
 * ==========================================================================
 * BIM LOGISTICS — FRONTEND APPLICATION LOGIC (TMS & FLEET)
 * Triết lý: Graceful Notification, Defensive UI & Bim Enterprise Table Standard
 * Kế thừa từ Bim_ERP-Solutions
 * ==========================================================================
 */

let currentActiveTripCode = null;
let currentActiveTripData = null;
let currentOcrMode = 'phi-ton';

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Chuẩn hóa Header xác thực kép cho toàn bộ Client:
 * 1. JWT Bearer Token (kiểm tra hạn dùng exp, tự động dọn sạch nếu hết hạn)
 * 2. CSRF Token (nạp từ thẻ meta hoặc cookie csrftoken của Django Session)
 */
function getAuthHeaders(extraHeaders = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...extraHeaders
    };
    
    // Kiểm tra tính hợp lệ của JWT token trước khi gửi
    const token = localStorage.getItem('access_token');
    if (token) {
        try {
            const parts = token.split('.');
            if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1]));
                const nowSec = Math.floor(Date.now() / 1000);
                // Nếu token đã hết hạn hoặc sắp hết hạn trong 5 giây
                if (payload.exp && payload.exp <= nowSec + 5) {
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                } else {
                    headers['Authorization'] = `Bearer ${token}`;
                }
            } else {
                localStorage.removeItem('access_token');
            }
        } catch (e) {
            localStorage.removeItem('access_token');
        }
    }

    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
    if (csrfMeta && csrfMeta.content) {
        headers['X-CSRFToken'] = csrfMeta.content;
    } else {
        const match = document.cookie.match(/csrftoken=([^;]+)/);
        if (match) headers['X-CSRFToken'] = match[1];
    }
    return headers;
}

/**
 * Wrapper gọi fetch có xác thực kép thông minh:
 * - Gửi JWT Bearer Token + Django Session Cookie + CSRF
 * - Nếu token JWT hết hạn (401), tự động dọn sạch token hỏng và fallback sang Session Cookie
 */
async function fetchWithAuth(url, options = {}) {
    const headers = getAuthHeaders(options.headers || {});
    if (options.body instanceof FormData) {
        delete headers['Content-Type'];
    }
    const fetchOptions = {
        ...options,
        headers,
        credentials: 'include'
    };
    let res = await fetch(url, fetchOptions);
    if (res.status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        if (headers['Authorization']) {
            const fallbackHeaders = { ...headers };
            delete fallbackHeaders['Authorization'];
            fetchOptions.headers = fallbackHeaders;
            res = await fetch(url, fetchOptions);
        }
    }
    return res;
}

const STATUS_STYLE_MAP = {
    'COMPLETED': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'DELIVERED': 'bg-teal-100 text-teal-800 border-teal-300',
    'RETURNING_EMPTY': 'bg-purple-100 text-purple-800 border-purple-300',
    'UNLOADING': 'bg-orange-100 text-orange-800 border-orange-300',
    'AT_WAREHOUSE': 'bg-indigo-100 text-indigo-800 border-indigo-300',
    'IN_TRANSIT': 'bg-amber-100 text-amber-800 border-amber-300',
    'CONTAINER_PICKED': 'bg-cyan-100 text-cyan-800 border-cyan-300',
    'ACCEPTED': 'bg-blue-100 text-blue-800 border-blue-300',
    'DISPATCHED': 'bg-teal-100 text-teal-800 border-teal-300',
    'DRAFT': 'bg-slate-100 text-slate-700 border-slate-300',
    'CANCELLED': 'bg-rose-100 text-rose-800 border-rose-300',
};

const STATUS_NAME_MAP = {
    'DRAFT': 'Tiếp nhận đơn',
    'DISPATCHED': 'Đã điều xe',
    'ACCEPTED': 'Tài xế nhận lệnh',
    'CONTAINER_PICKED': 'Đã lấy Cont / Hàng',
    'IN_TRANSIT': 'Đang vận chuyển',
    'AT_WAREHOUSE': 'Đã đến kho hàng',
    'UNLOADING': 'Đang đóng / dỡ hàng',
    'DELIVERED': 'Đã giao hàng (Ký POD)',
    'RETURNING_EMPTY': 'Đang trả vỏ rỗng',
    'COMPLETED': 'Hoàn tất chuyến xe',
    'CANCELLED': 'Đã hủy chuyến',
};

// =========================================================================
// CHUẨN HOÁ ĐỊNH DẠNG SỐ & PHÂN CÁCH HÀNG NGÀN (VIETNAMESE NUMBER FORMATTING)
// =========================================================================
function formatNumberVN(val) {
    if (val === null || val === undefined || val === '') return '';
    const clean = String(val).replace(/\D/g, '');
    if (!clean) return '';
    return new Intl.NumberFormat('vi-VN').format(parseInt(clean, 10));
}

function parseNumberVN(val) {
    if (val === null || val === undefined || val === '') return 0;
    const clean = String(val).replace(/\D/g, '');
    return parseInt(clean, 10) || 0;
}

function formatMoney(n) {
    if (n === null || n === undefined || isNaN(Number(n))) return '0 đ';
    return new Intl.NumberFormat('vi-VN').format(Math.round(Number(n))) + ' đ';
}

function attachAutoNumberFormat(inputEl, onChangeCallback) {
    if (!inputEl || inputEl.dataset.hasNumberFormatter) return;
    inputEl.dataset.hasNumberFormatter = 'true';

    // Định dạng sẵn giá trị hiện tại nếu có
    if (inputEl.value) {
        const clean = String(inputEl.value).replace(/\D/g, '');
        if (clean) {
            inputEl.value = new Intl.NumberFormat('vi-VN').format(parseInt(clean, 10));
        }
    }

    // Xử lý phím Backspace khi đứng ngay sau dấu chấm phân cách hàng ngàn
    inputEl.addEventListener('keydown', function(e) {
        if (e.key === 'Backspace') {
            const pos = this.selectionStart;
            if (pos > 0 && this.selectionStart === this.selectionEnd && this.value[pos - 1] === '.') {
                e.preventDefault();
                const val = this.value;
                this.value = val.slice(0, pos - 2) + val.slice(pos - 1);
                this.setSelectionRange(pos - 1, pos - 1);
                this.dispatchEvent(new Event('input'));
            }
        }
    });

    // Tự động thêm dấu chấm phân cách hàng ngàn theo thời gian thực và duy trì vị trí con trỏ chuột
    inputEl.addEventListener('input', function(e) {
        const rawValue = this.value;
        const cursorPosition = this.selectionStart || 0;
        const digitsOnly = rawValue.replace(/\D/g, '');

        if (!digitsOnly) {
            this.value = '';
            if (onChangeCallback) onChangeCallback(0);
            return;
        }

        const formatted = new Intl.NumberFormat('vi-VN').format(parseInt(digitsOnly, 10));
        this.value = formatted;

        // Định vị lại con trỏ tương ứng với số chữ số trước con trỏ cũ
        const digitsBeforeCursor = rawValue.slice(0, cursorPosition).replace(/\D/g, '').length;
        let newCursor = formatted.length;
        if (digitsBeforeCursor === 0) {
            newCursor = 0;
        } else {
            let digitsCounted = 0;
            for (let i = 0; i < formatted.length; i++) {
                if (/\d/.test(formatted[i])) {
                    digitsCounted++;
                }
                if (digitsCounted === digitsBeforeCursor) {
                    newCursor = i + 1;
                    break;
                }
            }
        }
        this.setSelectionRange(newCursor, newCursor);

        if (onChangeCallback) onChangeCallback(parseInt(digitsOnly, 10));
    });
}

function initAllNumberInputs() {
    document.querySelectorAll('.input-number-vn, [data-format="number"]').forEach(el => {
        const cb = (el.id === 'quote-unit-price' || el.id === 'quote-monthly-trips') 
            ? calculateQuoteExpectedRevenue 
            : null;
        attachAutoNumberFormat(el, cb);
    });
}

// --- GRACEFUL TOAST NOTIFICATION (Bim_ERP-Solutions Standard) ---
function showToast(type, message, title = '') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const typeClass = type === 'success' ? 'toast-success' :
                      type === 'danger' ? 'toast-danger' : 'toast-warning';
    
    const icon = type === 'success' ? 'ph-bold ph-check-circle text-emerald-600' :
                 type === 'danger' ? 'ph-bold ph-x-circle text-rose-600' : 'ph-bold ph-warning-circle text-amber-600';

    toast.className = `toast-notification ${typeClass}`;
    toast.innerHTML = `
        <i class="${icon} text-2xl shrink-0 mt-0.5"></i>
        <div class="flex-1 min-w-0">
            ${title ? `<h5 class="font-bold text-[14px] leading-snug font-heading mb-0.5">${title}</h5>` : ''}
            <p class="text-[13px] leading-relaxed font-medium">${message}</p>
        </div>
        <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-slate-600 p-1 shrink-0">
            <i class="ph ph-x text-base"></i>
        </button>
    `;

    container.appendChild(toast);

    // Tự động đóng sau 4.5 giây
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(30px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }
    }, 4500);
}

// --- GLOBAL ENTERPRISE CONFIRMATION MODAL (Bim_ERP-Solutions Standard) ---
let _globalConfirmResolver = null;

function showConfirmModal(options = {}) {
    return new Promise((resolve) => {
        _globalConfirmResolver = resolve;
        const modal = document.getElementById('modal-global-confirm');
        if (!modal) {
            resolve(window.confirm(options.message || options.title || 'Xác nhận thao tác?'));
            return;
        }

        const titleEl = document.getElementById('confirm-modal-title');
        const msgEl = document.getElementById('confirm-modal-message');
        const iconBox = document.getElementById('confirm-modal-icon-box');
        const iconEl = document.getElementById('confirm-modal-icon');
        const cancelBtn = document.getElementById('confirm-modal-cancel-btn');
        const okBtn = document.getElementById('confirm-modal-ok-btn');
        const okText = document.getElementById('confirm-modal-ok-text');
        const okIcon = document.getElementById('confirm-modal-ok-icon');

        const type = options.type || 'warning'; // 'warning' | 'danger' | 'success' | 'info'
        const title = options.title || (type === 'danger' ? 'Xác Nhận Xóa Dữ Liệu' : 'Xác Nhận Thao Tác');
        const message = options.message || 'Bạn có chắc chắn muốn thực hiện hành động này?';
        const confirmText = options.confirmText || (type === 'danger' ? 'Xác Nhận Xóa' : 'Đồng Ý');
        const cancelText = options.cancelText || 'Huỷ bỏ';

        if (titleEl) titleEl.innerText = title;
        if (msgEl) msgEl.innerText = message;
        if (cancelBtn) cancelBtn.innerText = cancelText;
        if (okText) okText.innerText = confirmText;

        if (iconBox && iconEl && okBtn) {
            if (type === 'danger') {
                iconBox.className = 'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-rose-100 text-rose-600 shadow-xs';
                iconEl.className = options.icon || 'ph-bold ph-trash text-2xl';
                okBtn.className = 'px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold font-heading shadow-sm flex items-center gap-1.5 transition-all cursor-pointer';
                if (okIcon) okIcon.className = 'ph-bold ph-trash text-sm';
            } else if (type === 'success') {
                iconBox.className = 'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-emerald-100 text-emerald-700 shadow-xs';
                iconEl.className = options.icon || 'ph-bold ph-seal-check text-2xl';
                okBtn.className = 'px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold font-heading shadow-sm flex items-center gap-1.5 transition-all cursor-pointer';
                if (okIcon) okIcon.className = 'ph-bold ph-check text-sm';
            } else if (type === 'info') {
                iconBox.className = 'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-teal-100 text-teal-700 shadow-xs';
                iconEl.className = options.icon || 'ph-bold ph-info text-2xl';
                okBtn.className = 'px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold font-heading shadow-sm flex items-center gap-1.5 transition-all cursor-pointer';
                if (okIcon) okIcon.className = 'ph-bold ph-arrow-right text-sm';
            } else {
                iconBox.className = 'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-amber-100 text-amber-700 shadow-xs';
                iconEl.className = options.icon || 'ph-bold ph-warning text-2xl';
                okBtn.className = 'px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold font-heading shadow-sm flex items-center gap-1.5 transition-all cursor-pointer';
                if (okIcon) okIcon.className = 'ph-bold ph-check text-sm';
            }
        }

        modal.classList.remove('hidden');
    });
}

function resolveGlobalConfirm(result) {
    const modal = document.getElementById('modal-global-confirm');
    if (modal) modal.classList.add('hidden');
    if (typeof _globalConfirmResolver === 'function') {
        _globalConfirmResolver(result);
        _globalConfirmResolver = null;
    }
}
window.showConfirmModal = showConfirmModal;
window.resolveGlobalConfirm = resolveGlobalConfirm;

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

function refreshCurrentView() {
    const activeView = document.querySelector('.view:not(.hidden-view)');
    const currentTab = activeView ? activeView.id.replace('view-', '') : 'dashboard';

    if (currentTab === 'dashboard') {
        loadDashboardData();
    } else if (currentTab === 'dieu-van') {
        loadTripsData();
    } else if (currentTab === 'kinh-doanh') {
        loadSalesData();
    } else if (currentTab === 'ke-toan') {
        if (currentAccountingSubTab === 'acct-reports') {
            loadAccountingReportData();
        } else {
            switchAccountingSubTab(currentAccountingSubTab || 'acct-cashbook');
        }
    } else if (currentTab === 'quyet-toan') {
        loadSettlementData();
    } else if (currentTab === 'hai-quan') {
        fetchCustomsDeclarations();
    } else if (currentTab === 'bao-cao') {
        loadReportsData();
    } else if (currentTab === 'xe-bai') {
        loadFleetData();
    } else if (currentTab === 'nhan-su') {
        loadHRData();
    } else if (currentTab === 'cai-dat') {
        loadMasterData();
    } else if (currentTab === 'trip-detail' && currentActiveTripCode) {
        viewTripDetail(currentActiveTripCode, false);
    } else {
        loadDashboardData();
    }

    if (typeof showToast === 'function') {
        showToast('success', 'Đã làm mới dữ liệu mới nhất từ máy chủ!', 'Đồng Bộ Dữ Liệu');
    }
}
window.refreshCurrentView = refreshCurrentView;

// Close dropdown and popover on click outside
document.addEventListener('click', (e) => {
    const container = document.getElementById('dashboard-period-dropdown-container');
    const menu = document.getElementById('topbar-period-menu');
    const popover = document.getElementById('topbar-custom-date-popover');
    if (container && !container.contains(e.target)) {
        if (menu) menu.classList.add('hidden');
        if (popover) popover.classList.add('hidden');
    }
});

// --- 1. TẢI DỮ LIỆU BAN GIÁM ĐỐC (CHUẨN QUỐC TẾ TMS & HẢI QUAN) ---
async function loadDashboardData(periodOverride) {
    const period = periodOverride || currentDashboardPeriod || '7_days';
    let url = `/api/dashboard/?period=${period}`;
    if (period === 'custom' && currentDashboardCustomStart && currentDashboardCustomEnd) {
        url += `&start_date=${currentDashboardCustomStart}&end_date=${currentDashboardCustomEnd}`;
    }
    try {
        const res = await fetchWithAuth(url);
        if (!res.ok) throw new Error('Không thể kết nối máy chủ');
        const data = await res.json();
        bgdDataCache = data;

        // 1. Cập nhật 4 Trụ cột KPI Điều hành
        const fin = data.financial || {};
        const prod = data.productivity || {};
        const fleet = data.fleet || {};
        const pers = data.personnel || {};
        const comm = data.commercial_customs || {};

        // Pillar 1: Tài chính
        const grossProfitEl = document.getElementById('bgd-gross-profit');
        if (grossProfitEl) grossProfitEl.innerText = new Intl.NumberFormat('vi-VN').format(fin.monthly_gross_profit || 0) + ' đ';
        const monthlyRevEl = document.getElementById('bgd-monthly-rev');
        if (monthlyRevEl) monthlyRevEl.innerText = new Intl.NumberFormat('vi-VN').format(fin.monthly_revenue || 0) + ' đ';
        const monthlyExpEl = document.getElementById('bgd-monthly-exp');
        if (monthlyExpEl) monthlyExpEl.innerText = new Intl.NumberFormat('vi-VN').format(fin.monthly_expense || 0) + ' đ';
        const cashEl = document.getElementById('bgd-cash-val');
        if (cashEl) cashEl.innerText = new Intl.NumberFormat('vi-VN').format(fin.cash_on_hand || 150000000) + ' đ';
        const bankEl = document.getElementById('bgd-bank-val');
        if (bankEl) bankEl.innerText = new Intl.NumberFormat('vi-VN').format(fin.bank_balance || 1250000000) + ' đ';

        // Pillar 2: Vận hành
        const todayTripsEl = document.getElementById('bgd-today-trips');
        if (todayTripsEl) todayTripsEl.innerText = prod.today_active ?? 5;
        const totalTripsEl = document.getElementById('bgd-total-trips');
        if (totalTripsEl) totalTripsEl.innerText = prod.total_trips ?? 16;
        const yesterdayTripsEl = document.getElementById('bgd-yesterday-trips');
        if (yesterdayTripsEl) yesterdayTripsEl.innerText = prod.completed_yesterday ?? 8;
        const otdRateEl = document.getElementById('bgd-otd-rate');
        if (otdRateEl) otdRateEl.innerText = `${prod.ontime_delivery_rate || 98.2}% OTD`;

        // Pillar 3: Đội xe & Nhân sự
        const utilizationEl = document.getElementById('bgd-fleet-utilization');
        if (utilizationEl) utilizationEl.innerText = `${fleet.utilization_rate || 62.5}%`;
        const fleetActiveEl = document.getElementById('bgd-fleet-active');
        if (fleetActiveEl) fleetActiveEl.innerText = fleet.active ?? 5;
        const fleetTotalEl = document.getElementById('bgd-fleet-total');
        if (fleetTotalEl) fleetTotalEl.innerText = fleet.total ?? 8;
        const fleetIdleEl = document.getElementById('bgd-fleet-idle');
        if (fleetIdleEl) fleetIdleEl.innerText = fleet.idle ?? 3;
        const fleetMaintEl = document.getElementById('bgd-fleet-maint');
        if (fleetMaintEl) fleetMaintEl.innerText = fleet.maintenance ?? 0;
        const hrActiveEl = document.getElementById('bgd-hr-active');
        if (hrActiveEl) hrActiveEl.innerText = `${pers.active || 7}/10 Tài xế`;

        // Pillar 4: Đơn hàng & Hải quan
        const customsGreenEl = document.getElementById('bgd-customs-green');
        if (customsGreenEl) customsGreenEl.innerText = comm.customs_green ?? 85;
        const pendingBookingsEl = document.getElementById('bgd-pending-bookings');
        if (pendingBookingsEl) pendingBookingsEl.innerText = `${comm.pending_bookings ?? 6} đơn`;

        // Cập nhật 3 Thẻ Mini Dưới Biểu Đồ Doanh Thu & Subtitle
        const avgRevEl = document.getElementById('bgd-avg-rev');
        if (avgRevEl) avgRevEl.innerText = '~' + new Intl.NumberFormat('vi-VN').format(fin.avg_revenue || 0) + ' đ';
        const avgExpEl = document.getElementById('bgd-avg-exp');
        if (avgExpEl) avgExpEl.innerText = '~' + new Intl.NumberFormat('vi-VN').format(fin.avg_expense || 0) + ' đ';
        const avgMarginEl = document.getElementById('bgd-avg-margin');
        if (avgMarginEl) avgMarginEl.innerText = `${fin.profit_margin || 0}%`;

        const avgRevLbl = document.getElementById('bgd-avg-rev-label');
        if (avgRevLbl && fin.avg_revenue_label) avgRevLbl.innerText = fin.avg_revenue_label;
        const avgExpLbl = document.getElementById('bgd-avg-exp-label');
        if (avgExpLbl && fin.avg_expense_label) avgExpLbl.innerText = fin.avg_expense_label;
        const avgMarginLbl = document.getElementById('bgd-avg-margin-label');
        if (avgMarginLbl && fin.avg_margin_label) avgMarginLbl.innerText = fin.avg_margin_label;

        const chartSubEl = document.getElementById('bgd-chart-subtitle');
        if (chartSubEl && fin.chart_subtitle) chartSubEl.innerText = fin.chart_subtitle;

        // 2. Khởi tạo Biểu đồ Chart.js nếu có thư viện
        if (typeof Chart !== 'undefined' && data.charts) {
            renderBgdRevenueChart(data.charts.daily_trend);
            renderBgdDonutChart(currentDonutType);
        }

        // 3. Render Bảng P&L Chuyến Xe Hỗ Trợ Click Mở Chi Tiết Chuyến, Lọc & Sắp Xếp
        rawDashboardTripsPnl = data.trips_pnl || [];
        applyDashboardPnlFilters();
    } catch (err) {
        console.error('Error loading dashboard data:', err);
        showToast('warning', 'Không thể tải dữ liệu Ban Giám Đốc. Vui lòng kiểm tra lại kết nối.', 'Cảnh báo');
    }
}

// --- BỘ LỌC & SẮP XẾP BẢNG P&L CHUYẾN XE DASHBOARD ---
let rawDashboardTripsPnl = [];
let dashboardPnlSortColumn = null;
let dashboardPnlSortDirection = 'asc';

function clearDashboardPnlSearch() {
    const input = document.getElementById('dashboard-pnl-search');
    if (input) input.value = '';
    const clearBtn = document.getElementById('btn-clear-dashboard-pnl-search');
    if (clearBtn) clearBtn.classList.add('hidden');
    applyDashboardPnlFilters();
}

function resetDashboardPnlFilters() {
    const status = document.getElementById('dashboard-pnl-filter-status');
    if (status) status.value = '';
    const search = document.getElementById('dashboard-pnl-search');
    if (search) search.value = '';
    const clearBtn = document.getElementById('btn-clear-dashboard-pnl-search');
    if (clearBtn) clearBtn.classList.add('hidden');

    dashboardPnlSortColumn = null;
    dashboardPnlSortDirection = 'asc';
    applyDashboardPnlFilters();
}

function toggleDashboardPnlSort(col) {
    if (dashboardPnlSortColumn === col) {
        dashboardPnlSortDirection = dashboardPnlSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        dashboardPnlSortColumn = col;
        dashboardPnlSortDirection = 'asc';
    }
    applyDashboardPnlFilters();
}

function applyDashboardPnlFilters() {
    if (!rawDashboardTripsPnl || !Array.isArray(rawDashboardTripsPnl)) return;

    const filterStatus = document.getElementById('dashboard-pnl-filter-status')?.value?.trim() || '';
    const filterSearch = document.getElementById('dashboard-pnl-search')?.value?.trim().toLowerCase() || '';

    const clearBtn = document.getElementById('btn-clear-dashboard-pnl-search');
    if (clearBtn) {
        if (filterSearch) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
    }

    let list = rawDashboardTripsPnl.filter(item => {
        if (filterStatus) {
            if (filterStatus === 'COMPLETED' && item.status !== 'COMPLETED') return false;
            if (filterStatus === 'TRANSIT') {
                if (!['IN_TRANSIT', 'ACCEPTED', 'CONTAINER_PICKED', 'AT_WAREHOUSE', 'UNLOADING', 'RETURNING_EMPTY'].includes(item.status)) return false;
            }
        }

        if (filterSearch) {
            const combinedText = [
                item.trip_code,
                item.customer_name,
                item.route,
                item.driver_name,
                item.license_plate,
                item.container_number,
                item.status_label
            ].filter(Boolean).join(' ').toLowerCase();

            if (!combinedText.includes(filterSearch)) return false;
        }

        return true;
    });

    // Cập nhật số đếm
    const filteredCountEl = document.getElementById('dashboard-pnl-filtered-count');
    if (filteredCountEl) filteredCountEl.innerText = list.length;
    const totalCountEl = document.getElementById('dashboard-pnl-total-count');
    if (totalCountEl) totalCountEl.innerText = rawDashboardTripsPnl.length;

    // Sắp xếp
    if (dashboardPnlSortColumn) {
        list.sort((a, b) => {
            let valA = a[dashboardPnlSortColumn];
            let valB = b[dashboardPnlSortColumn];

            if (['revenue', 'expense', 'profit', 'margin_percent'].includes(dashboardPnlSortColumn)) {
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
                return dashboardPnlSortDirection === 'asc' ? valA - valB : valB - valA;
            }

            valA = (valA || '').toString();
            valB = (valB || '').toString();
            const cmp = valA.localeCompare(valB, 'vi');
            return dashboardPnlSortDirection === 'asc' ? cmp : -cmp;
        });
    }

    // Cập nhật icon sort thead
    const sortCols = ['trip_code', 'customer_name', 'driver_name', 'container_number', 'revenue', 'expense', 'profit', 'margin_percent', 'status'];
    sortCols.forEach(col => {
        const iconEl = document.getElementById(`sort-icon-pnl-${col}`);
        if (iconEl) {
            if (dashboardPnlSortColumn === col) {
                iconEl.className = dashboardPnlSortDirection === 'asc' 
                    ? 'ph-bold ph-arrow-up text-teal-600 text-xs' 
                    : 'ph-bold ph-arrow-down text-teal-600 text-xs';
            } else {
                iconEl.className = 'ph-bold ph-arrows-down-up text-slate-400 text-xs';
            }
        }
    });

    renderDashboardPnlTable(list);
}

function renderDashboardPnlTable(trips) {
    const pnlTbody = document.getElementById('bgd-pnl-tbody');
    if (!pnlTbody) return;
    pnlTbody.innerHTML = '';

    if (!trips || trips.length === 0) {
        pnlTbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center py-8 text-slate-400">
                    <p class="font-medium text-xs text-slate-500">Không tìm thấy chuyến xe nào phù hợp</p>
                </td>
            </tr>
        `;
        return;
    }

    trips.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-teal-50/40 transition-colors cursor-pointer group row-multiline border-b border-slate-200/70';
        tr.title = `Bấm để xem chi tiết hồ sơ chuyến [${item.trip_code}]`;
        tr.onclick = () => {
            viewTripDetail(item.trip_code);
        };

        let statusBadge = `<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 font-heading">${escapeHtml(item.status_label || item.status)}</span>`;
        if (item.status === 'COMPLETED') {
            statusBadge = `<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-heading">Đã hoàn tất</span>`;
        } else if (['IN_TRANSIT', 'ACCEPTED', 'CONTAINER_PICKED', 'AT_WAREHOUSE', 'UNLOADING', 'RETURNING_EMPTY'].includes(item.status)) {
            statusBadge = `<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 font-heading">Đang vận hành</span>`;
        }

        const marginVal = item.margin_percent || 0;
        const barColor = marginVal >= 50 ? 'bg-emerald-500' : (marginVal >= 25 ? 'bg-amber-500' : 'bg-rose-500');

        tr.innerHTML = `
            <td class="py-1.5 px-3 border-r border-slate-200/70 font-black text-teal-800 font-heading text-[13px]">
                <div class="flex items-center space-x-1">
                    <span>${escapeHtml(item.trip_code)}</span>
                    <i class="ph ph-arrow-square-out text-slate-400 group-hover:text-teal-600 transition-colors text-xs"></i>
                </div>
            </td>
            <td class="py-1.5 px-3 border-r border-slate-200/70">
                <p class="font-bold text-slate-900 text-[13px] leading-tight">${escapeHtml(item.customer_name)}</p>
                <p class="text-[11.5px] text-slate-500 font-medium truncate max-w-xs mt-0.5 leading-tight">${escapeHtml(item.route)}</p>
            </td>
            <td class="py-1.5 px-3 border-r border-slate-200/70">
                <p class="font-bold text-slate-900 text-[13px] leading-tight">${escapeHtml(item.driver_name)}</p>
                <p class="text-[11.5px] text-teal-700 font-mono font-bold mt-0.5 leading-tight">${escapeHtml(item.license_plate)}</p>
            </td>
            <td class="py-1.5 px-3 border-r border-slate-200/70 font-mono text-slate-800 font-bold text-[12.5px]">${escapeHtml(item.container_number)}</td>
            <td class="py-1.5 px-3 border-r border-slate-200/70 text-right font-bold text-slate-900 tabular-nums font-mono text-[13px]">${new Intl.NumberFormat('vi-VN').format(item.revenue)} đ</td>
            <td class="py-1.5 px-3 border-r border-slate-200/70 text-right font-medium text-amber-700 tabular-nums font-mono text-[13px]">-${new Intl.NumberFormat('vi-VN').format(item.expense)} đ</td>
            <td class="py-1.5 px-3 border-r border-slate-200/70 text-right font-bold text-emerald-700 tabular-nums font-mono text-[13px] font-heading">${new Intl.NumberFormat('vi-VN').format(item.profit)} đ</td>
            <td class="py-1.5 px-3 border-r border-slate-200/70 text-center">
                <div class="flex items-center justify-center space-x-1.5">
                    <span class="text-[11.5px] font-bold text-slate-700 w-9 text-right tabular-nums">${marginVal}%</span>
                    <div class="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div class="h-full ${barColor}" style="width: ${Math.min(100, Math.max(0, marginVal))}%"></div>
                    </div>
                </div>
            </td>
            <td class="py-1.5 px-3 border-r border-slate-200/70 text-center">${statusBadge}</td>
            <td class="py-1.5 px-3 text-center" onclick="event.stopPropagation();">
                <button onclick="viewTripDetail('${item.trip_code}')" class="px-2 py-0.5 rounded text-[11px] font-bold bg-teal-50 hover:bg-teal-700 hover:text-white text-teal-700 font-heading border border-teal-200 transition-colors shadow-2xs">
                    Chi Tiết
                </button>
            </td>
        `;
        pnlTbody.appendChild(tr);
    });
}

// Biểu đồ Cột & Đường Doanh thu, Chi phí, Lợi nhuận gộp
function renderBgdRevenueChart(trendData) {
    const ctx = document.getElementById('bgd-revenue-trend-chart');
    if (!ctx) return;
    if (bgdRevenueChart) {
        bgdRevenueChart.destroy();
    }
    
    bgdRevenueChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: trendData.labels,
            datasets: [
                {
                    label: 'Lợi Nhuận Gộp',
                    type: 'line',
                    data: trendData.profit,
                    borderColor: '#10b981',
                    backgroundColor: '#10b981',
                    borderWidth: 3,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.35,
                    order: 1
                },
                {
                    label: 'Doanh Thu Cước',
                    type: 'bar',
                    data: trendData.revenue,
                    backgroundColor: 'rgba(13, 148, 136, 0.85)',
                    hoverBackgroundColor: '#0d9488',
                    borderRadius: 6,
                    borderSkipped: false,
                    barPercentage: 0.65,
                    order: 2
                },
                {
                    label: 'Chi Phí Vận Hành',
                    type: 'bar',
                    data: trendData.expense,
                    backgroundColor: 'rgba(245, 158, 11, 0.75)',
                    hoverBackgroundColor: '#f59e0b',
                    borderRadius: 6,
                    borderSkipped: false,
                    barPercentage: 0.65,
                    order: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#ffffff',
                    bodyColor: '#e2e8f0',
                    padding: 10,
                    borderRadius: 8,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${new Intl.NumberFormat('vi-VN').format(context.raw)} đ`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        font: { family: "'Inter', sans-serif", size: 11, weight: '600' },
                        color: '#64748b'
                    }
                },
                y: {
                    grid: { color: 'rgba(226, 232, 240, 0.6)', drawBorder: false },
                    ticks: {
                        font: { family: "'Inter', sans-serif", size: 10 },
                        color: '#94a3b8',
                        callback: function(value) {
                            if (value >= 1000000) return (value / 1000000).toFixed(0) + ' tr';
                            return value;
                        }
                    }
                }
            }
        }
    });
}

// Biểu đồ Donut Khai thác Đội xe & Hải quan
function renderBgdDonutChart(type = 'fleet') {
    const ctx = document.getElementById('bgd-donut-chart');
    if (!ctx || !bgdDataCache) return;
    if (bgdDonutChart) {
        bgdDonutChart.destroy();
    }

    currentDonutType = type;
    const isFleet = type === 'fleet';
    
    const btnFleet = document.getElementById('donut-toggle-fleet');
    const btnCustoms = document.getElementById('donut-toggle-customs');
    if (btnFleet && btnCustoms) {
        if (isFleet) {
            btnFleet.className = 'px-2.5 py-1 rounded-lg bg-white text-teal-800 shadow-xs transition-all font-heading';
            btnCustoms.className = 'px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-800 transition-all font-heading';
        } else {
            btnCustoms.className = 'px-2.5 py-1 rounded-lg bg-white text-teal-800 shadow-xs transition-all font-heading';
            btnFleet.className = 'px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-800 transition-all font-heading';
        }
    }

    const labels = isFleet 
        ? ['Đang chở hàng (Active)', 'Chờ bãi (Idle)', 'Bảo trì (Maintenance)'] 
        : ['Luồng Xanh (Thông quan)', 'Luồng Vàng (Nộp hồ sơ)', 'Luồng Đỏ (Kiểm hóa)'];
        
    const dataVals = isFleet 
        ? [bgdDataCache.fleet.active, bgdDataCache.fleet.idle, bgdDataCache.fleet.maintenance]
        : [bgdDataCache.commercial_customs.customs_green, bgdDataCache.commercial_customs.customs_yellow, bgdDataCache.commercial_customs.customs_red];

    const bgColors = isFleet 
        ? ['#10b981', '#0d9488', '#f43f5e']
        : ['#10b981', '#f59e0b', '#f43f5e'];

    const centerValEl = document.getElementById('donut-center-value');
    const centerLblEl = document.getElementById('donut-center-label');
    if (centerValEl && centerLblEl) {
        centerValEl.innerText = isFleet ? `${bgdDataCache.fleet.utilization_rate}%` : `${bgdDataCache.commercial_customs.customs_clearance_rate}%`;
        centerLblEl.innerText = isFleet ? 'Khai Thác' : 'Luồng Xanh';
    }

    const legendEl = document.getElementById('donut-legend-container');
    if (legendEl) {
        if (isFleet) {
            legendEl.innerHTML = `
                <div class="flex justify-between items-center text-slate-600">
                    <span class="flex items-center"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2"></span> Đang có hàng (Active)</span>
                    <strong class="font-heading text-slate-800">${bgdDataCache.fleet.active} xe (${bgdDataCache.fleet.utilization_rate}%)</strong>
                </div>
                <div class="flex justify-between items-center text-slate-600">
                    <span class="flex items-center"><span class="w-2.5 h-2.5 rounded-full bg-teal-500 mr-2"></span> Sẵn sàng bãi (Idle)</span>
                    <strong class="font-heading text-slate-800">${bgdDataCache.fleet.idle} xe</strong>
                </div>
                <div class="flex justify-between items-center text-slate-600">
                    <span class="flex items-center"><span class="w-2.5 h-2.5 rounded-full bg-rose-500 mr-2"></span> Bảo dưỡng (Maintenance)</span>
                    <strong class="font-heading text-slate-800">${bgdDataCache.fleet.maintenance} xe</strong>
                </div>
            `;
        } else {
            legendEl.innerHTML = `
                <div class="flex justify-between items-center text-slate-600">
                    <span class="flex items-center"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2"></span> Luồng Xanh (Thông quan tự động)</span>
                    <strong class="font-heading text-emerald-700">${bgdDataCache.commercial_customs.customs_green} tờ (85%)</strong>
                </div>
                <div class="flex justify-between items-center text-slate-600">
                    <span class="flex items-center"><span class="w-2.5 h-2.5 rounded-full bg-amber-500 mr-2"></span> Luồng Vàng (Kiểm tra hồ sơ)</span>
                    <strong class="font-heading text-amber-700">${bgdDataCache.commercial_customs.customs_yellow} tờ (12%)</strong>
                </div>
                <div class="flex justify-between items-center text-slate-600">
                    <span class="flex items-center"><span class="w-2.5 h-2.5 rounded-full bg-rose-500 mr-2"></span> Luồng Đỏ (Kiểm tra thực tế)</span>
                    <strong class="font-heading text-rose-700">${bgdDataCache.commercial_customs.customs_red} tờ (3%)</strong>
                </div>
            `;
        }
    }

    bgdDonutChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: dataVals,
                backgroundColor: bgColors,
                borderWidth: 2,
                borderColor: '#ffffff',
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '72%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    padding: 8,
                    borderRadius: 8
                }
            }
        }
    });
}

function switchDonutChart(type) {
    renderBgdDonutChart(type);
}

// --- 2. TẢI DỮ LIỆU PHÒNG ĐIỀU VẬN (TRIPS) ---
let rawDispatchTrips = [];
let dispatchSortColumn = null;
let dispatchSortDirection = 'asc';

function populateDispatchFilterDropdowns(trips) {
    if (!trips || !Array.isArray(trips)) return;
    
    // 1. Khách hàng
    const custSelect = document.getElementById('filter-dispatch-customer');
    if (custSelect) {
        const curCust = custSelect.value;
        const customers = [...new Set(trips.map(t => (t.customer || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
        custSelect.innerHTML = '<option value="">-- Tất cả Khách hàng --</option>' + 
            customers.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
        if (customers.includes(curCust)) custSelect.value = curCust;
    }

    // 2. Tài xế / Xe
    const drvSelect = document.getElementById('filter-dispatch-driver');
    if (drvSelect) {
        const curDrv = drvSelect.value;
        const drivers = [...new Set(trips.map(t => (t.driver || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
        const vehicles = [...new Set(trips.map(t => (t.vehicle || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
        
        let options = '<option value="">-- Tất cả Tài xế / Xe --</option>';
        if (drivers.length > 0) {
            options += '<optgroup label="Tài xế">' + drivers.map(d => `<option value="DRIVER:${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('') + '</optgroup>';
        }
        if (vehicles.length > 0) {
            options += '<optgroup label="Xe / Đầu kéo">' + vehicles.map(v => `<option value="VEHICLE:${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('') + '</optgroup>';
        }
        drvSelect.innerHTML = options;
        if (curDrv) drvSelect.value = curDrv;
    }
}

function clearDispatchSearch() {
    const input = document.getElementById('filter-dispatch-search');
    if (input) input.value = '';
    const clearBtn = document.getElementById('btn-clear-dispatch-search');
    if (clearBtn) clearBtn.classList.add('hidden');
    applyDispatchFilters();
}

function resetDispatchFilters() {
    const cust = document.getElementById('filter-dispatch-customer');
    if (cust) cust.value = '';
    const drv = document.getElementById('filter-dispatch-driver');
    if (drv) drv.value = '';
    const status = document.getElementById('filter-dispatch-status');
    if (status) status.value = '';
    const type = document.getElementById('filter-dispatch-type');
    if (type) type.value = '';
    const search = document.getElementById('filter-dispatch-search');
    if (search) search.value = '';
    const clearBtn = document.getElementById('btn-clear-dispatch-search');
    if (clearBtn) clearBtn.classList.add('hidden');

    dispatchSortColumn = null;
    dispatchSortDirection = 'asc';
    applyDispatchFilters();
}

function toggleDispatchSort(col) {
    if (dispatchSortColumn === col) {
        dispatchSortDirection = dispatchSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        dispatchSortColumn = col;
        dispatchSortDirection = 'asc';
    }
    applyDispatchFilters();
}

let isHideCompletedTripsActive = (function() {
    try {
        return localStorage.getItem('bim_hide_completed_trips') === 'true';
    } catch (e) {
        return false;
    }
})();

function updateHideCompletedBtnUI() {
    const btn = document.getElementById('btn-toggle-hide-completed');
    const icon = document.getElementById('icon-toggle-hide-completed');
    const text = document.getElementById('text-toggle-hide-completed');
    if (!btn) return;

    if (isHideCompletedTripsActive) {
        btn.className = 'text-xs font-bold text-teal-900 bg-teal-100 hover:bg-teal-200 border border-teal-300 shadow-2xs px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer';
        if (icon) icon.className = 'ph-bold ph-eye-slash text-teal-800 text-sm';
        if (text) text.innerText = 'Đang Ẩn Đã Xong';
    } else {
        btn.className = 'text-xs font-semibold text-slate-700 hover:text-teal-800 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer';
        if (icon) icon.className = 'ph-bold ph-eye text-slate-500 text-sm';
        if (text) text.innerText = 'Ẩn Đã Hoàn Thành';
    }
}

function toggleHideCompletedTrips() {
    isHideCompletedTripsActive = !isHideCompletedTripsActive;
    try {
        localStorage.setItem('bim_hide_completed_trips', isHideCompletedTripsActive ? 'true' : 'false');
    } catch (e) {}
    updateHideCompletedBtnUI();
    applyDispatchFilters();
}
window.toggleHideCompletedTrips = toggleHideCompletedTrips;
window.updateHideCompletedBtnUI = updateHideCompletedBtnUI;

function applyDispatchFilters() {
    if (!rawDispatchTrips || !Array.isArray(rawDispatchTrips)) return;

    updateHideCompletedBtnUI();

    const filterCust = document.getElementById('filter-dispatch-customer')?.value?.trim().toLowerCase() || '';
    const filterDrv = document.getElementById('filter-dispatch-driver')?.value?.trim() || '';
    const filterStatus = document.getElementById('filter-dispatch-status')?.value?.trim() || '';
    const filterType = document.getElementById('filter-dispatch-type')?.value?.trim().toUpperCase() || '';
    const filterSearch = document.getElementById('filter-dispatch-search')?.value?.trim().toLowerCase() || '';

    const clearBtn = document.getElementById('btn-clear-dispatch-search');
    if (clearBtn) {
        if (filterSearch) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
    }

    let list = rawDispatchTrips.filter(trip => {
        if (filterCust && (trip.customer || '').toLowerCase() !== filterCust) return false;
        
        if (filterDrv) {
            if (filterDrv.startsWith('DRIVER:')) {
                const targetDrv = filterDrv.replace('DRIVER:', '');
                if (trip.driver !== targetDrv) return false;
            } else if (filterDrv.startsWith('VEHICLE:')) {
                const targetVeh = filterDrv.replace('VEHICLE:', '');
                if (trip.vehicle !== targetVeh) return false;
            }
        }

        // Nếu bật nút "Ẩn Đã Hoàn Thành" (và không đang lọc riêng mục COMPLETED)
        if (isHideCompletedTripsActive && filterStatus !== 'COMPLETED') {
            if (trip.status === 'COMPLETED' || trip.status_raw === 'COMPLETED' || trip.status === 'Hoàn tất & Chốt sổ') {
                return false;
            }
        }

        if (filterStatus === 'ACTIVE') {
            // Lọc các chuyến đang điều vận, ẩn các chuyến đã hoàn thành hoặc đã hủy
            if (trip.status === 'COMPLETED' || trip.status === 'CANCELLED' || 
                trip.status_raw === 'COMPLETED' || trip.status_raw === 'CANCELLED' || 
                trip.status === 'Hoàn tất & Chốt sổ' || trip.status === 'Đã hủy') {
                return false;
            }
        } else if (!filterStatus || filterStatus === 'ALL') {
            // Mặc định / Tất cả: Hiển thị toàn bộ chuyến xe
        } else if (filterStatus === 'COMPLETED') {
            if (trip.status !== 'COMPLETED' && trip.status_raw !== 'COMPLETED' && trip.status !== 'Hoàn tất & Chốt sổ') return false;
        } else if (filterStatus === 'DROP_HOOK') {
            if (!trip.is_split_trip) return false;
        } else if (filterStatus === 'TWIN_CONT') {
            if (!trip.is_twin_container) return false;
        } else if (filterStatus === 'DET_WARNING') {
            if (!trip.det_status || !['OVERDUE', 'TODAY', 'WARNING'].includes(trip.det_status.status)) return false;
        } else if (filterStatus === 'TRANSIT') {
            if (trip.status !== 'In Transit' && trip.status_raw !== 'TRANSIT' && trip.status !== 'IN_TRANSIT' && trip.status !== 'RETURNING_EMPTY' && trip.status !== 'CONTAINER_PICKED') return false;
        } else if (filterStatus === 'DELIVERED') {
            if (trip.status !== 'Delivered' && trip.status_raw !== 'DELIVERED' && trip.status !== 'AT_WAREHOUSE' && trip.status !== 'UNLOADING') return false;
        } else if (filterStatus === 'PENDING') {
            if (!['Dispatched', 'Picked Up', 'Draft', 'DRAFT', 'DISPATCHED', 'ACCEPTED'].includes(trip.status) && !['DRAFT', 'DISPATCHED', 'ACCEPTED'].includes(trip.status_raw)) return false;
        } else if (trip.status !== filterStatus && trip.status_raw !== filterStatus) {
            return false;
        }

        if (filterType && (trip.type_raw || '').toUpperCase() !== filterType) {
            return false;
        }

        if (filterSearch) {
            const combinedText = [
                trip.id,
                trip.container,
                trip.container_2,
                trip.booking,
                trip.seal,
                trip.seal_2,
                trip.commercial_invoice,
                trip.customer,
                trip.warehouse,
                trip.driver,
                trip.vehicle,
                trip.pickup,
                trip.dropoff
            ].filter(Boolean).join(' ').toLowerCase();

            if (!combinedText.includes(filterSearch)) return false;
        }

        return true;
    });

    // Cập nhật số đếm
    const filteredCountEl = document.getElementById('dispatch-filtered-count');
    if (filteredCountEl) filteredCountEl.innerText = list.length;
    const totalCountEl = document.getElementById('dispatch-total-count');
    if (totalCountEl) totalCountEl.innerText = rawDispatchTrips.length;

    // Sắp xếp
    if (dispatchSortColumn) {
        list.sort((a, b) => {
            let valA = a[dispatchSortColumn];
            let valB = b[dispatchSortColumn];

            if (dispatchSortColumn === 'expense') {
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
                return dispatchSortDirection === 'asc' ? valA - valB : valB - valA;
            }

            valA = (valA || '').toString();
            valB = (valB || '').toString();
            const cmp = valA.localeCompare(valB, 'vi');
            return dispatchSortDirection === 'asc' ? cmp : -cmp;
        });
    } else {
        // Mặc định: Chuyến mới nhất ở trên đầu
        list.sort((a, b) => {
            const idA = (a.id || '').toString();
            const idB = (b.id || '').toString();
            return idB.localeCompare(idA, 'vi', { numeric: true });
        });
    }

    // Cập nhật icon sort thead
    const sortCols = ['loading_date', 'customer', 'container', 'vehicle', 'expense', 'status'];
    sortCols.forEach(col => {
        const iconEl = document.getElementById(`sort-icon-dispatch-${col}`);
        if (iconEl) {
            if (dispatchSortColumn === col) {
                iconEl.className = dispatchSortDirection === 'asc' 
                    ? 'ph-bold ph-arrow-up text-teal-600 text-xs' 
                    : 'ph-bold ph-arrow-down text-teal-600 text-xs';
            } else {
                iconEl.className = 'ph-bold ph-arrows-down-up text-slate-400 text-xs';
            }
        }
    });

    renderDispatchTable(list);
}

function renderDispatchTable(trips) {
    const tbody = document.getElementById('trips-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!trips || trips.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-12 text-slate-400">
                    <div class="flex flex-col items-center justify-center">
                        <i class="ph ph-magnifying-glass text-4xl mb-2 text-slate-300"></i>
                        <p class="font-medium text-sm text-slate-500">Không tìm thấy chuyến xe nào phù hợp với bộ lọc</p>
                        <p class="text-xs text-slate-400 mt-1">Thử xóa từ khóa tìm kiếm hoặc chọn "Đặt lại bộ lọc"</p>
                        <button onclick="resetDispatchFilters()" class="mt-3 px-3 py-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg text-xs font-bold transition-colors">
                            Đặt lại bộ lọc
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    trips.forEach(trip => {
        const typeColor = trip.type_raw === 'IMPORT' ? 'bg-blue-100 text-blue-700' : 
                          trip.type_raw === 'EXPORT' ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700';
        const statusCls = STATUS_STYLE_MAP[trip.status] || 'bg-slate-100 text-slate-700 border-slate-300';
        const tripIdentifier = trip.hashid || trip.id;

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-teal-50/40 transition-colors cursor-pointer group row-multiline border-b border-slate-200/80';
        tr.onclick = (e) => {
            if (!e.target.closest('button, a, input, select')) {
                viewTripDetail(tripIdentifier);
            }
        };
        
        tr.innerHTML = `
            <td class="px-3 py-2 border-r border-slate-200/70">
                <div class="flex items-center space-x-2">
                    <a href="/dispatch/trips/${tripIdentifier}" 
                       onclick="event.preventDefault(); event.stopPropagation(); viewTripDetail('${tripIdentifier}');" 
                       class="font-bold text-teal-700 hover:text-teal-900 hover:underline font-heading text-[13.5px] inline-flex items-center gap-1 group/link"
                       title="Xem chi tiết lệnh điều động ${trip.id}">
                        <span>${escapeHtml(trip.id)}</span>
                        <i class="ph ph-arrow-up-right text-[11px] opacity-0 group-hover/link:opacity-100 transition-opacity text-teal-600"></i>
                    </a>
                </div>
                <div class="flex items-center space-x-1.5 text-[11.5px] font-medium text-slate-500 mt-0.5">
                    <i class="ph ph-calendar text-slate-400 text-xs"></i>
                    <span>${escapeHtml(trip.loading_date)}</span>
                    ${trip.loading_time ? `<span class="text-teal-800 bg-teal-100/80 px-1 py-0.2 rounded font-bold text-[11px]">${escapeHtml(trip.loading_time)}</span>` : ''}
                </div>
            </td>
            <td class="px-3 py-2 border-r border-slate-200/70">
                <p class="font-bold text-slate-900 text-[13px] leading-snug truncate" title="${escapeHtml(trip.customer)}">${escapeHtml(trip.customer)}</p>
                <p class="text-[11.5px] text-slate-500 font-medium mt-0.5 flex items-center gap-1.5 truncate" title="${escapeHtml(trip.warehouse)}">
                    <i class="ph ph-warehouse text-slate-400 text-xs shrink-0"></i>
                    <span>${escapeHtml(trip.warehouse)}</span>
                </p>
            </td>
            <td class="px-3 py-2 border-r border-slate-200/70">
                <div class="flex items-center space-x-1.5 font-mono font-bold text-slate-900 text-[13px]">
                    <i class="ph ph-barcode text-teal-600 text-sm"></i>
                    <span>${escapeHtml(trip.container)}</span>
                    ${trip.is_twin_container ? `
                        <span class="px-1.5 py-0.2 rounded text-[10px] font-black uppercase bg-teal-100 text-teal-800 border border-teal-300 inline-flex items-center gap-0.5" title="Chế độ Ghép 2 Cont 20ft">
                            <i class="ph-bold ph-stack"></i> 2x20ft
                        </span>
                    ` : ''}
                </div>
                <div class="text-[11.5px] text-slate-500 mt-0.5 flex items-center space-x-1.5 font-medium flex-wrap gap-y-0.5">
                    <span>B/L: <strong class="text-slate-800 font-mono font-bold">${escapeHtml(trip.booking)}</strong></span>
                    ${trip.seal && trip.seal !== '-' ? `<span class="text-slate-300">|</span> <span>Seal: <strong class="text-slate-800 font-mono font-bold">${escapeHtml(trip.seal)}</strong></span>` : ''}
                </div>
                ${trip.is_twin_container && trip.container_2 ? `
                    <div class="text-[11px] font-mono text-slate-600 mt-0.5 flex items-center gap-1">
                        <span class="text-slate-400 font-normal">Cont 2:</span>
                        <strong class="text-teal-900 font-bold">${escapeHtml(trip.container_2)}</strong>
                        ${trip.seal_2 && trip.seal_2 !== '-' ? `<span class="text-slate-300">|</span> <span class="text-slate-500">${escapeHtml(trip.seal_2)}</span>` : ''}
                    </div>
                ` : ''}
                ${trip.det_status && (trip.det_status.status === 'OVERDUE' || trip.det_status.status === 'TODAY' || trip.det_status.status === 'WARNING') ? `
                    <div class="mt-1">
                        ${trip.det_status.status === 'OVERDUE' 
                            ? `<span class="px-1.5 py-0.2 rounded text-[9.5px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center gap-0.5 animate-pulse" title="Quá hạn Free DET ${Math.abs(trip.det_status.days_remaining)} ngày">
                                <i class="ph-bold ph-warning"></i> Quá Hạn DET (${Math.abs(trip.det_status.days_remaining)}N)
                               </span>`
                            : trip.det_status.status === 'TODAY'
                            ? `<span class="px-1.5 py-0.2 rounded text-[9.5px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-0.5" title="Hôm nay hết hạn trả vỏ">
                                <i class="ph-bold ph-clock"></i> DET Hết Hôm Nay
                               </span>`
                            : `<span class="px-1.5 py-0.2 rounded text-[9.5px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-0.5" title="Còn 1 ngày Free DET">
                                <i class="ph-bold ph-clock-countdown"></i> DET Còn 1N
                               </span>`
                        }
                    </div>
                ` : ''}
                ${trip.customs_info && trip.customs_info.has_declaration ? `
                    <div class="mt-1 flex items-center space-x-1">
                        ${trip.customs_info.customs_lane === 'GREEN'
                            ? `<span class="px-1.5 py-0.2 rounded text-[9.5px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-0.5" title="Tờ khai ${escapeHtml(trip.customs_info.declaration_number)}: Thông quan tự động"><i class="ph-bold ph-check"></i> Luồng Xanh</span>`
                            : trip.customs_info.customs_lane === 'YELLOW'
                            ? `<span class="px-1.5 py-0.2 rounded text-[9.5px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-0.5" title="Tờ khai ${escapeHtml(trip.customs_info.declaration_number)}: Thẩm định hồ sơ"><i class="ph-bold ph-file-search"></i> Luồng Vàng</span>`
                            : `<span class="px-1.5 py-0.2 rounded text-[9.5px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center gap-0.5" title="Tờ khai ${escapeHtml(trip.customs_info.declaration_number)}: Kiểm tra thực tế/Soi chiếu"><i class="ph-bold ph-magnifying-glass"></i> Luồng Đỏ</span>`
                        }
                        <span class="text-[10px] font-mono text-slate-500 font-bold">${escapeHtml(trip.customs_info.declaration_number)}</span>
                    </div>
                ` : ''}
            </td>
            <td class="px-3 py-2 border-r border-slate-200/70">
                <div class="flex items-center space-x-1.5">
                    ${trip.commercial_invoice && trip.commercial_invoice !== '-' ? `
                        <span class="font-mono text-[11.5px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded shadow-2xs" title="Hóa đơn thương mại">
                            <i class="ph ph-file-text"></i> ${escapeHtml(trip.commercial_invoice)}
                        </span>
                    ` : `<span class="text-slate-400 text-[11.5px] italic">-</span>`}
                </div>
                <div class="mt-0.5">
                    ${trip.warehouse_dock && trip.warehouse_dock !== '-' ? `
                        <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 font-heading">
                            DOCK: ${escapeHtml(trip.warehouse_dock)}
                        </span>
                    ` : `<span class="text-[11.5px] text-slate-400 font-medium">Chưa chỉ định dock</span>`}
                </div>
            </td>
            <td class="px-3 py-2 border-r border-slate-200/70">
                <div class="flex items-center space-x-1.5">
                    <span class="font-bold text-slate-900 font-mono text-[13px]">${escapeHtml(trip.vehicle)}</span>
                    ${trip.vehicle_ownership_code === 'OWNED' 
                        ? `<span class="px-1.5 py-0.2 text-[10.5px] font-black uppercase rounded bg-teal-100 text-teal-800 border border-teal-200">Xe Nhà</span>`
                        : `<span class="px-1.5 py-0.2 text-[10.5px] font-black uppercase rounded bg-amber-100 text-amber-800 border border-amber-200">Xe Bạn</span>`
                    }
                </div>
                <div class="text-[11.5px] text-slate-500 mt-0.5 flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                    <span>Tài: <strong class="text-slate-900 font-bold">${escapeHtml(trip.driver)}</strong></span>
                    ${trip.is_split_trip ? `
                        <span class="text-amber-800 bg-amber-100 border border-amber-300 px-1 py-0.2 rounded font-black text-[10px] uppercase inline-flex items-center gap-0.5" title="Cắt kéo: Chặng 2 hạ do ${escapeHtml(trip.dropoff_driver || 'Tài khác')} đảm nhiệm">
                            <i class="ph-bold ph-arrows-split"></i> Hạ: ${escapeHtml(trip.dropoff_driver || trip.dropoff_vehicle || 'Tài 2')}
                        </span>
                    ` : (trip.dropoff_vehicle && trip.dropoff_vehicle !== '-' && trip.dropoff_vehicle !== trip.vehicle ? `
                        <span class="text-slate-300">|</span>
                        <span class="text-indigo-700 font-bold font-mono text-[11.5px]" title="Xe hạ bãi">Hạ: ${escapeHtml(trip.dropoff_vehicle)}</span>
                    ` : '')}
                </div>
            </td>
            <td class="px-3 py-2 border-r border-slate-200/70">
                <div class="flex items-center">
                    <span class="px-1.5 py-0.2 rounded text-[10.5px] font-bold uppercase tracking-wider ${trip.cont_location_type === 'BÃI TVL' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-slate-100 text-slate-700 border border-slate-200'}">
                        <i class="ph ph-map-pin"></i> ${escapeHtml(trip.cont_location_type)}
                    </span>
                </div>
                <p class="text-[11.5px] text-slate-500 font-medium italic line-clamp-1 max-w-[200px] mt-0.5" title="${escapeHtml(trip.cargo_notes || 'Không có lưu ý')}">
                    ${trip.cargo_notes ? `<i class="ph ph-info text-amber-600"></i> ${escapeHtml(trip.cargo_notes)}` : '<span class="text-slate-400 font-normal">Không có lưu ý</span>'}
                </p>
            </td>
            <td class="px-3 py-2 border-r border-slate-200/70">
                <div class="text-[13px] font-bold text-slate-800 flex items-center space-x-1.5 truncate" title="${escapeHtml(trip.pickup)} ➔ ${escapeHtml(trip.dropoff || 'Hạ bãi')}">
                    <span class="text-teal-700">${escapeHtml(trip.pickup)}</span>
                    <i class="ph ph-arrow-right text-slate-400 text-xs shrink-0"></i>
                    <span class="text-indigo-700">${escapeHtml(trip.dropoff || 'Bãi rỗng')}</span>
                </div>
                <div class="mt-0.5 flex items-center space-x-2 text-[11.5px]">
                    <span class="px-1.5 py-0.2 rounded text-[10px] font-black uppercase font-heading ${typeColor}">${escapeHtml(trip.type)}</span>
                    <span class="text-rose-600 font-mono font-bold text-[12px] tabular-nums">${new Intl.NumberFormat('vi-VN').format(trip.expense)} đ</span>
                </div>
            </td>
            <td class="px-3 py-2 text-center">
                <span class="px-2.5 py-1 rounded-full text-[11px] font-bold border uppercase tracking-wider font-heading inline-block ${statusCls}">
                    ${escapeHtml(trip.status_label)}
                </span>
                ${trip.status === 'DISPATCHED' ? `
                    <div class="mt-1">
                        ${trip.acceptance_sla_status === 'DECLINED' || trip.declined_at ? `
                            <span class="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-700 text-white border border-rose-900 inline-flex items-center gap-1 shadow-sm" title="Tài xế đã TỪ CHỐI nhận chuyến: ${escapeHtml(trip.decline_reason || 'Không rõ lý do')}">
                                <i class="ph-bold ph-x-circle"></i> TX TỪ CHỐI (${trip.minutes_since_dispatch}p)
                            </span>
                        ` : trip.acceptance_sla_status === 'OVERDUE' ? `
                            <span class="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-600 text-white border border-rose-700 inline-flex items-center gap-1 animate-pulse" title="Tài xế chưa nhận chuyến sau hơn 60 phút - Cần đổi xe hoặc gọi điện">
                                <i class="ph-bold ph-warning-circle"></i> Quá hạn (${trip.minutes_since_dispatch}p)
                            </span>
                        ` : trip.acceptance_sla_status === 'WARNING' ? `
                            <span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-500 text-white border border-amber-600 inline-flex items-center gap-1" title="Chờ tài xế xác nhận nhận chuyến">
                                <i class="ph-bold ph-clock"></i> Chờ TX (${trip.minutes_since_dispatch}p)
                            </span>
                        ` : `
                            <span class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-teal-50 text-teal-700 border border-teal-200 inline-flex items-center gap-1" title="Đã phát lệnh qua Zalo/App">
                                <i class="ph ph-paper-plane-tilt"></i> Chờ nhận (${trip.minutes_since_dispatch}p)
                            </span>
                        `}
                    </div>
                ` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function loadTripsData() {
    try {
        const globalDates = getDateRangeForPeriod(currentDashboardPeriod, currentDashboardCustomStart, currentDashboardCustomEnd);
        const res = await fetchWithAuth(`/api/trips/?from_date=${globalDates.fromDate}&to_date=${globalDates.toDate}`);
        if (!res.ok) throw new Error('Lỗi tải danh sách chuyến');
        const data = await res.json();

        // Cập nhật stats
        const totalTripsEl = document.getElementById('stat-total-trips');
        if (totalTripsEl) totalTripsEl.innerText = new Intl.NumberFormat('vi-VN').format(data.stats.total_trips_monthly || 0);
        const transitEl = document.getElementById('stat-transit');
        if (transitEl) transitEl.innerText = new Intl.NumberFormat('vi-VN').format(data.stats.transit_count || 0);
        const pendExpEl = document.getElementById('stat-pending-expenses');
        if (pendExpEl) pendExpEl.innerText = new Intl.NumberFormat('vi-VN').format(data.stats.pending_expenses_count || 0);

        rawDispatchTrips = data.trips || [];
        populateDispatchFilterDropdowns(rawDispatchTrips);
        applyDispatchFilters();
    } catch (err) {
        console.error('Error loading trips data:', err);
    }
}

// --- 3. XEM CHI TIẾT CHUYẾN XE & BẢNG KÊ CHI PHÍ TRIỀN VÕ ---
async function viewTripDetail(tripCode, updateHistory = true) {
    currentActiveTripCode = tripCode;
    try {
        const res = await fetchWithAuth(`/api/trips/${tripCode}/`);
        if (!res.ok) {
            let errorMsg = 'Không tìm thấy chuyến xe.';
            try {
                const errData = await res.json();
                errorMsg = errData.error || errData.detail || `Lỗi máy chủ (${res.status})`;
            } catch (e) {}
            throw new Error(errorMsg);
        }
        const trip = await res.json();
        currentActiveTripData = trip;
        const tripHash = trip.hashid || trip.id;
        currentActiveTripCode = trip.id; // Luôn dùng trip_code gốc cho các API con

        // Cập nhật URL chuẩn Semantic Path kèm HashID bảo mật: /dispatch/trips/<hashid>
        if (updateHistory && window.history && window.history.pushState) {
            const tripPath = `/dispatch/trips/${tripHash}`;
            if (window.location.pathname !== tripPath) {
                window.history.pushState({ view: 'trip-detail', tripIdentifier: tripHash }, '', tripPath);
            }
        }

        // Lưu vết tab trước đó để nút Quay lại hoạt động chuẩn xác
        const currentActiveView = document.querySelector('.view:not(.hidden-view)');
        if (currentActiveView && currentActiveView.id !== 'view-trip-detail') {
            previousActiveTab = currentActiveView.id.replace('view-', '');
        }

        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden-view'));
        const detailView = document.getElementById('view-trip-detail');
        if (detailView) detailView.classList.remove('hidden-view');

        // Cập nhật Tiêu đề Phân hệ trên Topbar
        const topbarTitleEl = document.getElementById('topbar-page-title');
        if (topbarTitleEl) {
            const originTab = (previousActiveTab === 'ke-toan' ? 'Kế toán' : 'Điều vận');
            topbarTitleEl.innerText = `${originTab} | Chi tiết chuyến ${trip.id || trip.trip_code || ''}`;
        }

        window.currentTripDetail = trip;

        // Helper gán text an toàn chống crash DOM
        const setText = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.innerText = (val !== undefined && val !== null) ? val : '-';
        };

        // Thông tin chung
        setText('detail-id', trip.id);
        setText('detail-type', trip.type);
        setText('detail-customer', trip.customer);
        setText('detail-driver', trip.driver);
        setText('detail-vehicle-plate', trip.vehicle);

        // Phân loại nguồn xe
        const ownerBadge = document.getElementById('detail-ownership-badge');
        if (ownerBadge) {
            if (trip.vehicle_ownership_code === 'OWNED') {
                ownerBadge.innerText = 'Xe Nhà';
                ownerBadge.className = 'text-[9.5px] font-black uppercase px-1.5 py-0.2 rounded bg-teal-100 text-teal-800 border border-teal-200';
            } else {
                ownerBadge.innerText = 'Xe Bạn';
                ownerBadge.className = 'text-[9.5px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200';
            }
        }

        // Cấu hình Chặng & Xe hạ (Nghiệp vụ Cắt Kéo)
        const dropoffVehEl = document.getElementById('detail-dropoff-vehicle-info');
        if (dropoffVehEl) {
            if (trip.is_split_trip) {
                dropoffVehEl.innerHTML = `
                    <div class="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 space-y-1">
                        <div class="flex items-center justify-between font-bold text-amber-900 border-b border-amber-200 pb-1">
                            <span class="flex items-center gap-1">
                                <i class="ph-bold ph-arrows-split text-amber-700"></i>
                                Chế độ Cắt Kéo (Drop & Hook)
                            </span>
                            <span class="text-[10.5px] bg-amber-200/80 px-1.5 py-0.2 rounded font-black">2 Chặng</span>
                        </div>
                        <p class="pt-0.5">• <strong>Chặng 1 (Lấy Cont):</strong> ${trip.driver} (Xe: ${trip.vehicle}) · Chia lương: ${trip.driver_split_ratio}%</p>
                        <p>• <strong>Chặng 2 (Hạ Bãi):</strong> ${trip.dropoff_driver || 'Chưa gán tài xế'} (Xe: ${trip.dropoff_vehicle || '-'}) · Chia lương: ${100 - trip.driver_split_ratio}%</p>
                    </div>
                `;
                dropoffVehEl.classList.remove('hidden');
            } else if (trip.dropoff_vehicle && trip.dropoff_vehicle !== '-' && trip.dropoff_vehicle !== trip.vehicle) {
                dropoffVehEl.innerText = `Xe hạ: ${trip.dropoff_vehicle}`;
                dropoffVehEl.classList.remove('hidden');
            } else {
                dropoffVehEl.innerText = '';
                dropoffVehEl.classList.add('hidden');
            }
        }
        
        setText('detail-cont', trip.container);
        const contTypeEl = document.getElementById('detail-cont-type');
        if (contTypeEl) {
            if (trip.is_twin_container) {
                contTypeEl.innerText = 'Chế độ: Ghép 2x20ft';
            } else if (trip.vgm_weight && trip.vgm_weight !== '-') {
                contTypeEl.innerText = `Loại: ${trip.container_type || 'Cont 40'} | VGM: ${trip.vgm_weight}`;
            } else {
                contTypeEl.innerText = `Loại: ${trip.container_type || 'Cont 40'}`;
            }
        }

        // Cập nhật Box Ghép 2 Cont 20ft
        const twinCard = document.getElementById('detail-twin-container-card');
        if (twinCard) {
            if (trip.is_twin_container) {
                twinCard.classList.remove('hidden');
                setText('detail-cont-1-no', trip.container || '-');
                setText('detail-cont-1-seal', trip.seal || '-');
                setText('detail-cont-1-booking', trip.booking || '-');
                const vgm1El = document.getElementById('detail-cont-1-vgm');
                if (vgm1El) vgm1El.innerText = trip.vgm_weight && trip.vgm_weight !== '-' ? `VGM: ${trip.vgm_weight}` : 'VGM: -';

                setText('detail-cont-2-no', trip.container_2 || 'Chưa cập nhật');
                setText('detail-cont-2-seal', trip.seal_2 || '-');
                setText('detail-cont-2-booking', trip.booking_2 || trip.booking || '-');
                const vgm2El = document.getElementById('detail-cont-2-vgm');
                if (vgm2El) vgm2El.innerText = trip.vgm_weight_2 ? `VGM: ${trip.vgm_weight_2}` : 'VGM: -';
                setText('detail-cont-2-notes', trip.cargo_notes_2 || 'Không có ghi chú riêng');
            } else {
                twinCard.classList.add('hidden');
            }
        }

        // Cập nhật Box Quản lý DEM/DET & Giám định Vỏ Cont (EIR)
        setText('detail-det-days', `${trip.det_free_days || 3} ngày`);
        setText('detail-det-expiry', trip.det_expiry_date || 'Chưa thiết lập');
        setText('detail-dem-days', `${trip.dem_free_days || 3} ngày`);
        setText('detail-dem-expiry', trip.dem_expiry_date || 'Chưa thiết lập');
        setText('detail-condition-label', trip.container_condition_label || 'Nguyên Vẹn / Đạt Chuẩn');
        setText('detail-damage-desc', trip.damage_description || (trip.container_condition === 'GOOD' ? 'Vỏ cont sạch sẽ, nguyên vẹn, không hư hỏng' : 'Không có ghi chú thêm'));

        const condBadge = document.getElementById('detail-condition-badge');
        if (condBadge) {
            if (trip.container_condition === 'DAMAGED') {
                condBadge.className = 'text-[10.5px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-200';
                condBadge.innerText = 'Hư hỏng (EIR)';
            } else if (trip.container_condition === 'CLEANING_REQUIRED') {
                condBadge.className = 'text-[10.5px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200';
                condBadge.innerText = 'Cần vệ sinh';
            } else {
                condBadge.className = 'text-[10.5px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200';
                condBadge.innerText = 'Đạt chuẩn';
            }
        }

        const detBadgeEl = document.getElementById('detail-det-status-badge');
        const detCountdownEl = document.getElementById('detail-det-countdown');
        if (trip.det_status) {
            const ds = trip.det_status;
            if (detBadgeEl) {
                if (ds.status === 'OVERDUE') {
                    detBadgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-black uppercase font-heading bg-rose-100 text-rose-800 border border-rose-300 animate-pulse';
                    detBadgeEl.innerHTML = `<i class="ph-bold ph-warning-circle mr-1"></i> Quá Hạn Phạt Tiền (${Math.abs(ds.days_remaining)} ngày)`;
                } else if (ds.status === 'TODAY') {
                    detBadgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-black uppercase font-heading bg-rose-50 text-rose-700 border border-rose-300';
                    detBadgeEl.innerHTML = `<i class="ph-bold ph-clock mr-1"></i> Hạn Chót Hôm Nay`;
                } else if (ds.status === 'WARNING') {
                    detBadgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold uppercase font-heading bg-amber-100 text-amber-800 border border-amber-300';
                    detBadgeEl.innerHTML = `<i class="ph-bold ph-hourglass mr-1"></i> Sắp Hết Hạn (1 ngày)`;
                } else if (ds.status === 'ATTENTION') {
                    detBadgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold uppercase font-heading bg-amber-50 text-amber-700 border border-amber-200';
                    detBadgeEl.innerHTML = `<i class="ph-bold ph-hourglass-low mr-1"></i> Còn 2 ngày Free DET`;
                } else {
                    detBadgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold uppercase font-heading bg-emerald-100 text-emerald-800 border border-emerald-200';
                    detBadgeEl.innerHTML = `<i class="ph-bold ph-check-circle mr-1"></i> Trong Hạn Free-time (${ds.days_remaining} ngày)`;
                }
            }
            if (detCountdownEl) {
                if (ds.status === 'OVERDUE') {
                    detCountdownEl.innerText = `Cảnh báo: Đã vượt quá hạn mượn vỏ ${Math.abs(ds.days_remaining)} ngày! Đang phát sinh phí lưu vỏ của hãng tàu.`;
                    detCountdownEl.className = 'text-[11px] text-rose-700 mt-1 font-bold';
                } else if (ds.status === 'TODAY') {
                    detCountdownEl.innerText = `Lưu ý: Hạn trả rỗng hạ bãi là ngày hôm nay. Cần ưu tiên xếp xe hạ cont trước 17H.`;
                    detCountdownEl.className = 'text-[11px] text-rose-700 mt-1 font-bold';
                } else {
                    detCountdownEl.innerText = `Thời gian mượn vỏ còn lại: ${ds.days_remaining} ngày an toàn.`;
                    detCountdownEl.className = 'text-[11px] text-amber-800 mt-1 font-medium';
                }
            }
        }

        // Vị trí cont
        const contLocBadge = document.getElementById('detail-cont-location-badge');
        if (contLocBadge) contLocBadge.innerText = trip.cont_location_type || 'Nhà máy';

        setText('detail-booking', trip.booking !== '-' ? `B/L: ${trip.booking}` : 'B/L: Chưa có');
        setText('detail-seal', trip.seal !== '-' ? `Seal: ${trip.seal}` : 'Seal: Chưa cập nhật');
        
        // Commercial Invoice & Dock
        const invoiceEl = document.getElementById('detail-invoice');
        if (invoiceEl) invoiceEl.innerText = trip.commercial_invoice || '-';
        const dockEl = document.getElementById('detail-dock');
        if (dockEl) dockEl.innerText = trip.warehouse_dock && trip.warehouse_dock !== '-' ? `DOCK: ${trip.warehouse_dock}` : 'DOCK: Chưa chỉ định';

        // 5 Mốc thời gian tại kho khách hàng
        const etaEl = document.getElementById('detail-eta-time');
        if (etaEl) etaEl.innerText = trip.eta_warehouse_time || '-';
        const callInEl = document.getElementById('detail-call-in-time');
        if (callInEl) callInEl.innerText = trip.warehouse_call_in_time || '-';
        const actualInEl = document.getElementById('detail-actual-in-time');
        if (actualInEl) actualInEl.innerText = trip.actual_gate_in_time || '-';
        const callOutEl = document.getElementById('detail-call-out-time');
        if (callOutEl) callOutEl.innerText = trip.warehouse_call_out_time || '-';
        const actualOutEl = document.getElementById('detail-actual-out-time');
        if (actualOutEl) actualOutEl.innerText = trip.actual_gate_out_time || '-';

        // 2 Mốc bổ sung thực tiễn: Hẹn hạ sau 0h & Hạ bãi thực tế
        const dropoffAppointEl = document.getElementById('detail-dropoff-appointment-time');
        if (dropoffAppointEl) dropoffAppointEl.innerText = trip.dropoff_appointment_time || '-';
        const actualDropoffEl = document.getElementById('detail-actual-dropoff-time');
        if (actualDropoffEl) actualDropoffEl.innerText = trip.actual_dropoff_time || '-';

        // Cập nhật Cảnh báo Neo Xe & Lưu Cont Qua Đêm
        const overnightBadge = document.getElementById('detail-overnight-badge');
        const detentionBadgeStatus = document.getElementById('detail-detention-badge-status');
        const detentionInfoText = document.getElementById('detail-detention-info-text');
        const gateoutSummary = document.getElementById('detail-gateout-summary');

        if (gateoutSummary) gateoutSummary.innerText = trip.actual_gate_out_time && trip.actual_gate_out_time !== '-' ? trip.actual_gate_out_time : 'chưa xác nhận';

        if (trip.is_overnight_detention || (trip.dropoff_appointment_time && trip.dropoff_appointment_time.toLowerCase().includes('00:00'))) {
            if (overnightBadge) overnightBadge.classList.remove('hidden');
            if (detentionBadgeStatus) {
                detentionBadgeStatus.className = 'px-2 py-0.2 rounded font-black text-[10.5px] bg-amber-200 text-amber-950 uppercase border border-amber-300';
                detentionBadgeStatus.innerText = `Lưu Xe Qua Đêm (${trip.overnight_wait_hours || 'Chờ sau 0h'})`;
            }
            if (detentionInfoText) {
                const feeCustStr = trip.detention_fee_customer > 0 ? `Thu KH: ${new Intl.NumberFormat('vi-VN').format(trip.detention_fee_customer)} đ` : 'Chưa định giá';
                const allowDrvStr = trip.detention_driver_allowance > 0 ? `Chi TX: ${new Intl.NumberFormat('vi-VN').format(trip.detention_driver_allowance)} đ` : 'Chưa tính phụ cấp';
                detentionInfoText.innerHTML = `Lý do: <strong>${trip.detention_reason || 'Kho yêu cầu chờ sau 0h mới hạ bãi'}</strong>. Mốc hẹn: <strong class="text-amber-950 font-mono">${trip.dropoff_appointment_time}</strong>. Đã hạch toán: <strong class="text-teal-900">${feeCustStr}</strong> | <strong class="text-indigo-900">${allowDrvStr}</strong>.`;
            }
        } else {
            if (overnightBadge) overnightBadge.classList.add('hidden');
            if (detentionBadgeStatus) {
                detentionBadgeStatus.className = 'px-2 py-0.2 rounded font-bold text-[10.5px] bg-slate-100 text-slate-700';
                detentionBadgeStatus.innerText = 'Bình thường';
            }
            if (detentionInfoText) {
                detentionInfoText.innerHTML = `Xe kéo cont ra khỏi kho lúc <strong>${trip.actual_gate_out_time || '-'}</strong>. Nếu kho yêu cầu chờ sau 0h mới hạ bãi, vui lòng bấm cập nhật để tự động tính phụ phí.`;
            }
        }

        // Lịch đóng hàng & Cắt máng
        const loadSchedEl = document.getElementById('detail-loading-schedule');
        if (loadSchedEl) loadSchedEl.innerText = `${trip.loading_date} (Giờ: ${trip.loading_time || '8H'})`;
        const cutoffEl = document.getElementById('detail-cutoff');
        if (cutoffEl) cutoffEl.innerText = trip.cutoff || '-';
        const notesEl = document.getElementById('detail-cargo-notes');
        if (notesEl) notesEl.innerText = trip.cargo_notes || 'Không có lưu ý đặc biệt';

        // Hành trình 3 điểm
        setText('detail-pickup', trip.pickup);
        setText('detail-warehouse', trip.warehouse);
        setText('detail-dropoff', trip.dropoff || 'Hạ bãi rỗng');

        // Link Zalo và Màn hình Tài xế Mobile
        const driverToken = trip.driver_hashid || trip.hashid || trip.trip_code;
        const driverPortalUrl = `${window.location.origin}/driver/${driverToken}/`;
        const driverPortalBtn = document.getElementById('driver-portal-btn');
        if (driverPortalBtn) {
            driverPortalBtn.href = driverPortalUrl;
        }

        const zaloLink = document.getElementById('zalo-driver-link');
        if (zaloLink) {
            zaloLink.href = trip.driver_phone ? `https://zalo.me/${trip.driver_phone}` : '#';
        }

        // Status Badge
        const statusCls = STATUS_STYLE_MAP[trip.status] || 'bg-slate-100 text-slate-700 border-slate-300';
        const badge = document.getElementById('detail-status-badge');
        if (badge) {
            badge.className = `px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider font-heading ${statusCls}`;
            badge.innerText = trip.status_label || trip.status_display || STATUS_NAME_MAP[trip.status] || trip.status || 'Chưa xác định';
        }

        // Cập nhật Cảnh báo SLA & Từ chối Chuyến Xe
        const slaBanner = document.getElementById('trip-sla-warning-banner');
        if (slaBanner) {
            if (trip.acceptance_sla_status === 'DECLINED' || trip.declined_at) {
                slaBanner.className = 'p-4 rounded-2xl border bg-rose-100 border-rose-400 text-rose-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md transition-all mb-4';
                const iconBox = document.getElementById('trip-sla-icon-box');
                if (iconBox) iconBox.className = 'w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center text-2xl shrink-0';
                const titleEl = document.getElementById('trip-sla-title');
                if (titleEl) titleEl.innerText = `❌ TÀI XẾ ${trip.driver} ĐÃ TỪ CHỐI CHUYẾN!`;
                const descEl = document.getElementById('trip-sla-desc');
                if (descEl) descEl.innerHTML = `Lý do từ chối: <strong class="text-rose-900">${escapeHtml(trip.decline_reason || 'Không nêu lý do')}</strong> (${trip.minutes_since_dispatch} phút trước). Vui lòng phân lại tài xế / xe khác ngay để đảm bảo tiến độ!`;
                slaBanner.classList.remove('hidden');
            } else if (trip.status === 'DISPATCHED' && trip.acceptance_sla_status === 'OVERDUE') {
                slaBanner.className = 'p-4 rounded-2xl border bg-rose-50 border-rose-300 text-rose-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm transition-all mb-4';
                const iconBox = document.getElementById('trip-sla-icon-box');
                if (iconBox) iconBox.className = 'w-10 h-10 rounded-xl bg-rose-200 text-rose-700 flex items-center justify-center text-2xl shrink-0';
                const titleEl = document.getElementById('trip-sla-title');
                if (titleEl) titleEl.innerText = `⚠️ CẢNH BÁO: TÀI XẾ QUÁ HẠN XÁC NHẬN (${trip.minutes_since_dispatch} PHÚT)`;
                const descEl = document.getElementById('trip-sla-desc');
                if (descEl) descEl.innerText = `Bác tài ${trip.driver} (${trip.driver_phone || 'Chưa có SĐT'}) chưa nhận chuyến sau hơn 60 phút phát lệnh. Vui lòng gọi điện xác nhận hoặc phân xe/tài xế khác ngay!`;
                slaBanner.classList.remove('hidden');
            } else if (trip.status === 'DISPATCHED' && trip.acceptance_sla_status === 'WARNING') {
                slaBanner.className = 'p-4 rounded-2xl border bg-amber-50 border-amber-300 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm transition-all mb-4';
                const iconBox = document.getElementById('trip-sla-icon-box');
                if (iconBox) iconBox.className = 'w-10 h-10 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center text-2xl shrink-0';
                const titleEl = document.getElementById('trip-sla-title');
                if (titleEl) titleEl.innerText = `ĐANG CHỜ BÁC TÀI XÁC NHẬN (${trip.minutes_since_dispatch} PHÚT)`;
                const descEl = document.getElementById('trip-sla-desc');
                if (descEl) descEl.innerText = `Lệnh điều xe đã gửi tới bác tài ${trip.driver}. Hệ thống sẽ cảnh báo đỏ nếu quá 60 phút không phản hồi.`;
                slaBanner.classList.remove('hidden');
            } else {
                slaBanner.classList.add('hidden');
            }
        }

        // Trạng thái Chốt Sổ Kế Toán (Settlement Controls)
        const settleCont = document.getElementById('settlement-status-container');
        const btnAddTbl = document.getElementById('btn-add-expense-table');
        const banner = document.getElementById('cost-sheet-settled-banner');

        if (trip.is_expenses_settled) {
            if (settleCont) {
                settleCont.innerHTML = `
                    <span class="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-purple-50 text-purple-900 border border-purple-200 flex items-center shadow-2xs font-heading" title="Chốt bởi ${trip.settled_by || 'Kế toán'} lúc ${trip.settled_at}">
                        <i class="ph-bold ph-lock-key mr-1.5 text-purple-600 text-sm"></i> Đã Chốt Sổ (Kế Toán)
                    </span>
                `;
            }
            if (btnAddTbl) btnAddTbl.classList.add('hidden');
            if (banner) {
                banner.classList.remove('hidden');
                const desc = document.getElementById('cost-sheet-settled-desc');
                if (desc) desc.innerText = `Chốt bởi ${trip.settled_by || 'Kế toán viên'} vào lúc ${trip.settled_at || 'gần đây'}. Dữ liệu chi phí đã khóa cứng đối soát.`;
            }
        } else {
            if (settleCont) {
                settleCont.innerHTML = '';
            }
            if (btnAddTbl) btnAddTbl.classList.remove('hidden');
            if (banner) banner.classList.add('hidden');
        }

        // P&L Summary Cards
        const formatMoney = (n) => new Intl.NumberFormat('vi-VN').format(n) + ' đ';
        if (document.getElementById('pnl-revenue')) document.getElementById('pnl-revenue').innerText = formatMoney(trip.financials.revenue);
        if (document.getElementById('pnl-expense')) document.getElementById('pnl-expense').innerText = formatMoney(trip.financials.expense);
        if (document.getElementById('pnl-profit')) {
            const profitEl = document.getElementById('pnl-profit');
            profitEl.innerText = `${formatMoney(trip.financials.profit)} (${trip.financials.margin_percent}%)`;
        }

        // --- RENDER BẢNG KÊ CHI PHÍ (8 MỤC CHUẨN TRIỀN VÕ) ---
        renderCostSheetTable(trip);

        // --- RENDER MOBILE SIMULATOR DATA ---
        renderDriverMobileApp(trip);

        // --- RENDER TIẾN ĐỘ THỰC HIỆN (QUY TRÌNH 10 BƯỚC) DẠNG LƯỚI BẢNG CHUẨN ---
        const tContainer = document.getElementById('detail-timeline');
        if (tContainer) {
            const timelineList = trip.timeline || [];
            if (timelineList.length === 0) {
                if (tContainer.tagName === 'TBODY') {
                    tContainer.innerHTML = `
                        <tr>
                            <td colspan="4" class="py-8 text-center text-slate-400 text-xs italic">
                                <i class="ph ph-clock-counter-clockwise text-2xl text-slate-300 block mb-1"></i>
                                Đang khởi tạo các mốc tiến độ điều vận...
                            </td>
                        </tr>
                    `;
                } else {
                    tContainer.innerHTML = `
                        <div class="py-8 text-center text-slate-400 text-xs italic">
                            <i class="ph ph-clock-counter-clockwise text-2xl text-slate-300 block mb-1"></i>
                            Đang khởi tạo các mốc tiến độ điều vận...
                        </div>
                    `;
                }
            } else {
                let rowsHtml = '';
                timelineList.forEach(item => {
                    let rowClass = 'hover:bg-slate-50/60 transition-colors opacity-60';
                    let iconHtml = `<div class="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center text-[11px] font-normal mx-auto">${item.step}</div>`;
                    let textClass = 'text-slate-400 font-normal text-[13px]';
                    let actorTextClass = 'text-slate-400 font-normal text-[13px]';
                    let actorDisplay = '—';
                    let badgeHtml = '<span class="inline-block px-2 py-0.5 rounded text-[10px] font-normal text-slate-400 bg-slate-100 border border-slate-200">Chưa thực hiện</span>';
                    
                    if (item.active) {
                        rowClass = 'bg-teal-50/40 hover:bg-teal-50/70 transition-colors border-l-4 border-l-teal-600';
                        iconHtml = '<div class="w-6 h-6 rounded-full bg-teal-600 text-white ring-4 ring-teal-100 flex items-center justify-center font-bold text-xs animate-pulse mx-auto"><div class="w-2 h-2 rounded-full bg-white"></div></div>';
                        textClass = 'text-teal-950 font-bold text-[13.5px]';
                        actorTextClass = 'text-teal-900 font-bold text-[13px]';
                        actorDisplay = (item.actor && item.actor !== '—') ? item.actor : '—';
                        badgeHtml = '<span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black bg-teal-100 text-teal-800 border border-teal-300 whitespace-nowrap animate-pulse">ĐANG THỰC HIỆN</span>';
                    } else if (item.done) {
                        rowClass = 'hover:bg-slate-50/80 transition-colors';
                        iconHtml = '<div class="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shadow-xs mx-auto"><i class="ph-bold ph-check text-xs"></i></div>';
                        textClass = 'text-slate-800 font-medium text-[13px]';
                        actorTextClass = 'text-slate-700 font-medium text-[13px]';
                        actorDisplay = (item.actor && item.actor !== '—') ? item.actor : '—';
                        badgeHtml = '<span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">Hoàn thành</span>';
                    }

                    // Chứng từ đính kèm (Chỉ hiển thị khi có chứng từ thật đính kèm)
                    let docsHtml = '';
                    if (item.docs && item.docs.length > 0) {
                        const validDocs = item.docs.filter(doc => (typeof doc === 'object' && doc.url && doc.url.trim() !== ''));
                        if (validDocs.length > 0) {
                            const formattedDocs = validDocs.map(doc => {
                                const docName = doc.name || 'Chứng từ';
                                const docUrl = doc.url;
                                return `<a href="${docUrl}" target="_blank" rel="noopener noreferrer" class="text-teal-700 hover:text-teal-900 font-semibold underline underline-offset-2 inline-flex items-center gap-0.5 transition-colors" title="Bấm xem tài liệu / ảnh gốc"><i class="ph ph-file-text text-xs text-teal-600"></i><span>${docName}</span><i class="ph-bold ph-arrow-square-out text-[9px] text-teal-500"></i></a>`;
                            }).join('<span class="text-slate-300 mx-1.5 font-normal">;</span>');
                            docsHtml = formattedDocs;
                        }
                    }

                    rowsHtml += `
                        <tr class="${rowClass}">
                            <td class="py-3 px-3 text-center align-top">
                                ${iconHtml}
                            </td>
                            <td class="py-3 px-3 align-top">
                                <div class="${textClass} leading-snug">${item.title}</div>
                                ${item.time ? `
                                    <div class="text-[11px] mt-0.5 font-mono ${item.active ? 'text-teal-800 font-bold' : (item.done ? 'text-slate-500 font-medium' : 'text-slate-400')} flex items-center gap-1">
                                        <i class="ph ph-clock text-xs ${item.active ? 'text-teal-600' : 'text-slate-400'}"></i>
                                        <span>${item.time}</span>
                                    </div>
                                ` : ''}
                                ${docsHtml ? `
                                    <div class="text-[11.5px] mt-1.5 text-slate-600 leading-relaxed bg-slate-50/80 px-2 py-1 rounded-md border border-slate-200/60 inline-block">
                                        <span class="text-slate-400 font-medium mr-1"><i class="ph ph-paperclip mr-0.5 text-slate-400"></i>Chứng từ:</span>
                                        ${docsHtml}
                                    </div>
                                ` : ''}
                            </td>
                            <td class="py-3 px-3 text-center align-top whitespace-nowrap">
                                ${badgeHtml}
                            </td>
                            <td class="py-3 px-3 align-top whitespace-nowrap">
                                <span class="${actorTextClass}">${actorDisplay}</span>
                            </td>
                        </tr>
                    `;
                });

                if (tContainer.tagName === 'TBODY') {
                    tContainer.innerHTML = rowsHtml;
                } else {
                    tContainer.innerHTML = `
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="border-y border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider font-heading">
                                    <th class="py-2.5 px-3 w-14 text-center">Bước</th>
                                    <th class="py-2.5 px-3 min-w-[260px]">Nội Dung & Chứng Từ Đính Kèm</th>
                                    <th class="py-2.5 px-3 w-36 text-center">Trạng Thái</th>
                                    <th class="py-2.5 px-3 min-w-[170px]">Bộ Phận / Người Xử Lý</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 text-xs font-sans">
                                ${rowsHtml}
                            </tbody>
                        </table>
                    `;
                }
            }
        }

        // --- RENDER DANH SÁCH CHỨNG TỪ GỐC & HÓA ĐƠN ĐIỆN TỬ ---
        const docContainer = document.getElementById('detail-documents');
        if (docContainer) {
            docContainer.innerHTML = '';
            const docList = trip.documents || [];
            if (docList.length === 0) {
                docContainer.innerHTML = `
                    <div class="py-4 text-center text-slate-400 text-xs italic md:col-span-2">
                        <i class="ph ph-file-dashed text-xl text-slate-300 block mb-1"></i>
                        Chưa có chứng từ đính kèm cho chuyến xe này.
                    </div>
                `;
            } else {
                docList.forEach(doc => {
                    // Xác định icon, màu sắc và danh mục chứng từ
                    let iconClass = 'ph-bold ph-file-text text-teal-600';
                    let iconBg = 'bg-teal-50 border-teal-200';
                    let tagLabel = doc.type_label || 'Chứng từ';

                    if (doc.type === 'BOOKING_NOTE') {
                        iconClass = 'ph-bold ph-file-pdf text-rose-600';
                        iconBg = 'bg-rose-50 border-rose-200';
                        tagLabel = 'Lệnh Booking / Cấp Rỗng';
                    } else if (doc.type === 'EIR_PICKUP') {
                        iconClass = 'ph-bold ph-truck text-blue-600';
                        iconBg = 'bg-blue-50 border-blue-200';
                        tagLabel = 'Phiếu EIR Lấy Cont';
                    } else if (doc.type === 'EIR_DROPOFF') {
                        iconClass = 'ph-bold ph-arrow-down-left text-indigo-600';
                        iconBg = 'bg-indigo-50 border-indigo-200';
                        tagLabel = 'Phiếu EIR Hạ Cont';
                    } else if (doc.type === 'POD') {
                        iconClass = 'ph-bold ph-signature text-emerald-600';
                        iconBg = 'bg-emerald-50 border-emerald-200';
                        tagLabel = 'Biên bản POD';
                    } else if (doc.type === 'INVOICE') {
                        iconClass = 'ph-bold ph-receipt text-amber-600';
                        iconBg = 'bg-amber-50 border-amber-200';
                        tagLabel = 'Hóa đơn / Biên nhận';
                    } else if (doc.type === 'WEIGHT_TICKET') {
                        iconClass = 'ph-bold ph-scales text-purple-600';
                        iconBg = 'bg-purple-50 border-purple-200';
                        tagLabel = 'Phiếu cân';
                    } else if (doc.type === 'CONTAINER_CHECK') {
                        iconClass = 'ph-bold ph-shield-check text-cyan-600';
                        iconBg = 'bg-cyan-50 border-cyan-200';
                        tagLabel = 'Giám định vỏ cont';
                    }

                    docContainer.innerHTML += `
                        <div class="flex items-center p-3 border border-slate-200 rounded-xl bg-slate-50/70 hover:bg-slate-100/90 transition-all shadow-2xs">
                            <div class="w-10 h-10 rounded-lg ${iconBg} border flex items-center justify-center mr-3 shrink-0">
                                <i class="${iconClass} text-xl"></i>
                            </div>
                            <div class="flex-1 min-w-0 pr-2">
                                <div class="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                                    <span class="text-[10px] font-black uppercase px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-heading">${tagLabel}</span>
                                    <p class="text-[13px] font-bold text-slate-900 truncate" title="${doc.name}">${doc.name}</p>
                                </div>
                                <p class="text-[11px] font-medium text-slate-600 truncate mt-0.5">${doc.details}</p>
                                <p class="text-[10px] text-slate-400 mt-0.5 flex items-center font-mono">
                                    <i class="ph ph-clock mr-1 text-[10px]"></i>${doc.time}
                                </p>
                            </div>
                            <div class="flex items-center space-x-1.5 shrink-0 ml-2">
                                <span class="text-[10px] px-2 py-0.5 ${doc.is_verified ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'} border rounded-md font-bold font-heading">
                                    ${doc.is_verified ? 'Đã Nghiệm Thu' : 'Chờ Đối Chiếu'}
                                </span>
                                ${doc.file_url ? `
                                    <a href="${doc.file_url}" target="_blank" rel="noopener noreferrer" 
                                       class="px-2 py-0.5 text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 rounded-md hover:bg-teal-100 flex items-center gap-1 transition-colors" title="Xem / Tải chứng từ">
                                        <i class="ph-bold ph-eye"></i> Xem
                                    </a>
                                ` : ''}
                            </div>
                        </div>
                    `;
                });
            }
        }

    } catch (err) {
        console.error('Error fetching trip detail:', err);
        showToast('danger', err.message || 'Không thể mở chi tiết chuyến xe.', 'Lỗi');
    }
}

// Hàm render Bảng Kê Chi Phí 8 Mục chuẩn theo 5 ảnh thực tế của Triền Võ
function renderCostSheetTable(trip) {
    const tbody = document.getElementById('cost-sheet-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const formatMoney = (n) => new Intl.NumberFormat('vi-VN').format(n) + ' đ';

    const costItems = [
        {
            stt: 1,
            title: 'HĐ điện tử',
            key: 'fee_einvoice',
            sub: 'Thông tin hóa đơn điện tử Cảng / Depot tra cứu',
            getVal: (t) => {
                const invExpenses = (t.expenses || []).filter(e => e.invoice_number);
                if (invExpenses.length === 0) return { text: 'Chưa có HĐĐT', hasInv: false };
                return {
                    text: invExpenses.map(e => `Số HĐ: ${e.invoice_number} (Mã: ${e.invoice_lookup_code || 'N/A'})`).join('; '),
                    hasInv: true,
                    lookup_url: invExpenses[0].invoice_lookup_url
                };
            }
        },
        { stt: 2, title: 'Nâng', code: 'LIFT_ON', key: 'fee_lift_on' },
        { stt: 3, title: 'Hạ', code: 'LIFT_OFF', key: 'fee_lift_off' },
        { stt: 4, title: 'Cược cont', code: 'CONTAINER_DEPOSIT', key: 'fee_deposit' },
        { stt: 5, title: 'Cân xe', code: 'WEIGHING', key: 'fee_weighing' },
        { stt: 6, title: 'Bốc xếp', code: 'LABOR_STEVEDORING', key: 'fee_labor' },
        { stt: 7, title: 'Vé cầu đường', code: 'TOLL_FEE', key: 'fee_toll' },
        { stt: 8, title: 'Chi phí khác', code: 'OTHER', key: 'fee_other' },
    ];

    let totalCalculated = 0;

    function renderExpenseDriverLegBadge(exp, t) {
        if (!exp) return '<span class="text-slate-300 text-xs">-</span>';
        const leg = exp.trip_leg || 'ENTIRE';
        if (leg === 'LEG_1') {
            const dName = exp.driver_name || t.driver || 'Tài xế 1';
            const vPlate = exp.vehicle_plate || t.vehicle || 'Xe 1';
            return `
                <div class="flex items-center space-x-1.5 flex-wrap">
                    <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-bold bg-teal-100 text-teal-900 border border-teal-300 shrink-0">
                        <i class="ph-bold ph-arrow-circle-right text-teal-700 mr-1"></i>Chặng 1
                    </span>
                    <span class="font-bold text-slate-800 text-[12px]">${dName}</span>
                    <span class="text-[11px] text-slate-500 font-mono">(${vPlate})</span>
                </div>
            `;
        } else if (leg === 'LEG_2') {
            const dName = exp.driver_name || t.dropoff_driver || 'Tài xế 2';
            const vPlate = exp.vehicle_plate || t.dropoff_vehicle || 'Xe 2';
            return `
                <div class="flex items-center space-x-1.5 flex-wrap">
                    <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-300 shrink-0">
                        <i class="ph-bold ph-arrow-circle-down text-indigo-700 mr-1"></i>Chặng 2
                    </span>
                    <span class="font-bold text-slate-800 text-[12px]">${dName}</span>
                    <span class="text-[11px] text-slate-500 font-mono">(${vPlate})</span>
                </div>
            `;
        } else if (leg === 'COMPANY') {
            return `
                <span class="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                    <i class="ph ph-buildings mr-1 text-slate-500"></i>Công ty chi chung
                </span>
            `;
        } else {
            const dName = exp.driver_name || t.driver || 'Tài xế';
            const vPlate = exp.vehicle_plate || t.vehicle || 'Đầu kéo';
            return `
                <div class="flex items-center space-x-1.5 flex-wrap">
                    <span class="font-bold text-slate-800 text-[12px]">${dName}</span>
                    <span class="text-[11px] text-slate-500 font-mono">(${vPlate})</span>
                </div>
            `;
        }
    }

    costItems.forEach(item => {
        if (item.key === 'fee_einvoice') {
            const einvInfo = item.getVal(trip);
            tbody.innerHTML += `
                <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-200/70">
                    <td class="py-1.5 px-3 text-center text-slate-400 font-bold border-r border-slate-200/70">${item.stt}</td>
                    <td class="py-1.5 px-3 border-r border-slate-200/70">
                        <span class="font-bold text-slate-900 text-[13px]">${item.title}</span>
                        <p class="text-[11.5px] text-slate-400 mt-0.5">${item.sub}</p>
                    </td>
                    <td class="py-1.5 px-3 border-r border-slate-200/70 text-slate-400 text-xs italic">
                        Cảng / Depot
                    </td>
                    <td class="py-1.5 px-3 text-right text-slate-400 font-medium border-r border-slate-200/70">-</td>
                    <td class="py-1.5 px-3 border-r border-slate-200/70" colspan="2">
                        ${einvInfo.hasInv ? `
                            <div class="flex items-center space-x-2">
                                <span class="text-[11.5px] font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                    ${einvInfo.text}
                                </span>
                                ${einvInfo.lookup_url ? `
                                    <a href="${einvInfo.lookup_url}" target="_blank" class="text-[11.5px] font-bold text-blue-600 hover:text-blue-800 flex items-center bg-blue-50 px-2 py-0.5 rounded">
                                        <i class="ph ph-arrow-square-out mr-1"></i> Tra cứu online
                                    </a>
                                ` : ''}
                            </div>
                        ` : `
                            <span class="text-[11.5px] text-slate-400 italic">Chưa phát sinh hóa đơn</span>
                        `}
                    </td>
                    <td class="py-1.5 px-3 text-center border-r border-slate-200/70">
                        ${einvInfo.hasInv 
                            ? `<span class="px-2 py-0.2 rounded text-[10.5px] font-bold bg-emerald-100 text-emerald-800">Đã Liên Kết</span>`
                            : `<span class="px-2 py-0.2 rounded text-[10.5px] font-bold bg-slate-100 text-slate-500">Trống</span>`}
                    </td>
                    <td class="py-1.5 px-3 text-center text-slate-300">-</td>
                </tr>
            `;
        } else {
            // Lấy các bản ghi expense khớp với category này
            const matchedExps = (trip.expenses || []).filter(e => {
                if (item.code === 'LIFT_ON') return e.category_code === 'LIFT_ON' || e.category_code === 'LIFT_ON_OFF';
                if (item.code === 'LIFT_OFF') return e.category_code === 'LIFT_OFF';
                if (item.code === 'TOLL_FEE') return e.category_code === 'TOLL_FEE' || e.category_code === 'BOT_TOLL';
                if (item.code === 'CONTAINER_DEPOSIT') return e.category_code === 'CONTAINER_DEPOSIT';
                if (item.code === 'WEIGHING') return e.category_code === 'WEIGHING';
                if (item.code === 'LABOR_STEVEDORING') return e.category_code === 'LABOR_STEVEDORING' || e.category_code === 'STEVEDORING';
                if (item.code === 'OTHER') return e.category_code === 'OTHER' || e.category_code === 'PORT_STORAGE' || e.category_code === 'REPAIR_TIRE';
                return false;
            });

            const amountSum = matchedExps.reduce((acc, curr) => acc + Number(curr.amount), 0);
            totalCalculated += amountSum;

            if (matchedExps.length > 1) {
                // TRƯỜNG HỢP CÓ TỪ 2 KHOẢN CHI TRỞ LÊN: HỖ TRỢ BẤM VÀO ĐỂ XỔ XUỐNG XEM CHI TIẾT TỪNG DÒNG
                const summaryInvText = matchedExps.map(e => e.invoice_number ? e.invoice_number : '').filter(Boolean).join(', ');
                const hasLeg1 = matchedExps.some(e => e.trip_leg === 'LEG_1');
                const hasLeg2 = matchedExps.some(e => e.trip_leg === 'LEG_2');
                const legSummaryBadge = (hasLeg1 && hasLeg2)
                    ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-bold bg-amber-100 text-amber-900 border border-amber-300"><i class="ph-bold ph-arrows-split mr-1 text-amber-700"></i>Chặng 1 & 2</span>`
                    : (hasLeg1 ? `<span class="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">Chặng 1</span>` : (hasLeg2 ? `<span class="text-xs font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">Chặng 2</span>` : `<span class="text-xs font-bold text-slate-700">${trip.driver || '-'}</span>`));
                
                tbody.innerHTML += `
                    <!-- DÒNG TỔNG GỘP (Clickable Accordion) -->
                    <tr onclick="toggleExpenseDetail('${item.code}')" class="hover:bg-teal-50/50 cursor-pointer transition-colors bg-slate-50/40 border-b border-slate-200/80">
                        <td class="py-2 px-3 text-center text-teal-800 font-bold border-r border-slate-200/70">${item.stt}</td>
                        <td class="py-2 px-3 border-r border-slate-200/70">
                            <div class="flex items-center space-x-2">
                                <span class="font-bold text-slate-900 text-[13px]">${item.title}</span>
                                <span class="inline-flex items-center space-x-1 px-2 py-0.2 rounded-full bg-teal-100 text-teal-900 text-[10.5px] font-bold font-heading hover:bg-teal-200 transition-colors">
                                    <i class="ph-bold ph-list-numbers"></i>
                                    <span>${matchedExps.length} khoản chi</span>
                                    <i id="icon-toggle-${item.code}" class="ph ph-caret-down text-xs transition-transform duration-200"></i>
                                </span>
                            </div>
                            <p class="text-[11.5px] text-teal-700 font-semibold mt-0.5 flex items-center">
                                <i class="ph ph-hand-pointing mr-1"></i> Bấm để xem/ẩn chi tiết từng vé (${matchedExps.length} dòng con)
                            </p>
                        </td>
                        <td class="py-2 px-3 border-r border-slate-200/70">
                            ${legSummaryBadge}
                        </td>
                        <td class="py-2 px-3 text-right font-black text-[13px] tabular-nums text-rose-600 font-mono border-r border-slate-200/70">
                            <span class="border-b-2 border-dotted border-rose-400 pb-0.5" title="Tổng cộng ${matchedExps.length} khoản">
                                ${formatMoney(amountSum)}
                            </span>
                        </td>
                        <td class="py-2 px-3 border-r border-slate-200/70">
                            <span class="text-[11.5px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block">
                                ${summaryInvText ? `Gồm các HĐ: ${summaryInvText}` : `Tổng hợp ${matchedExps.length} chứng từ`}
                            </span>
                        </td>
                        <td class="py-2 px-3 text-slate-600 text-[11.5px] border-r border-slate-200/70">
                            <span class="text-teal-800 font-semibold">Xem chi tiết các khoản bên dưới</span>
                        </td>
                        <td class="py-2 px-3 text-center border-r border-slate-200/70">
                            <button type="button" class="px-2 py-0.5 rounded-md text-[11px] font-bold bg-teal-600 hover:bg-teal-700 text-white inline-flex items-center space-x-1 shadow-sm font-heading">
                                <span>Chi tiết</span>
                                <i class="ph ph-caret-down text-xs"></i>
                            </button>
                        </td>
                        <td class="py-2 px-3 text-center text-slate-400 text-[11px] font-semibold">
                            Tập hợp
                        </td>
                    </tr>

                    <!-- CÁC DÒNG CON CHI TIẾT (Sub-rows) -->
                    ${matchedExps.map((subExp, sIdx) => `
                        <tr class="sub-row-${item.code} hidden bg-teal-50/30 border-l-4 border-l-teal-600 border-b border-slate-100 transition-all text-xs">
                            <td class="py-1.5 px-2.5 text-center text-teal-800 font-mono font-bold text-[11.5px] border-r border-slate-200/70">${item.stt}.${sIdx + 1}</td>
                            <td class="py-1.5 px-2.5 pl-6 border-r border-slate-200/70">
                                <div class="flex items-center space-x-2">
                                    <i class="ph ph-arrow-elbow-down-right text-teal-700 font-black text-sm"></i>
                                    <span class="font-bold text-slate-900 text-[12.5px]">${subExp.notes || (item.title + ' #' + (sIdx + 1))}</span>
                                </div>
                                ${subExp.time ? `<p class="text-[11px] text-slate-400 pl-5 font-normal mt-0.5">${subExp.time}</p>` : ''}
                            </td>
                            <td class="py-1.5 px-2.5 border-r border-slate-200/70">
                                ${renderExpenseDriverLegBadge(subExp, trip)}
                            </td>
                            <td class="py-1.5 px-2.5 text-right font-black text-rose-600 tabular-nums font-mono text-[13px] border-r border-slate-200/70">
                                ${formatMoney(subExp.amount)}
                            </td>
                            <td class="py-1.5 px-2.5 border-r border-slate-200/70">
                                ${subExp.invoice_number ? `
                                    <div class="inline-flex items-center space-x-1 font-mono text-[11.5px] font-bold text-teal-900 bg-teal-100/70 px-2 py-0.5 rounded border border-teal-200">
                                        <span>HĐ: ${subExp.invoice_number}${subExp.invoice_lookup_code ? ' / ' + subExp.invoice_lookup_code : ''}</span>
                                        ${subExp.invoice_lookup_url ? `
                                            <a href="${subExp.invoice_lookup_url}" target="_blank" class="text-blue-600 hover:text-blue-800 ml-1 font-bold" title="Tra cứu online">
                                                <i class="ph ph-arrow-square-out text-xs"></i>
                                            </a>
                                        ` : ''}
                                    </div>
                                ` : '<span class="text-slate-400 text-[11.5px]">Vé trạm / Biên nhận</span>'}
                            </td>
                            <td class="py-1.5 px-2.5 text-slate-700 text-[11.5px] font-medium border-r border-slate-200/70">
                                <div class="flex items-center space-x-1.5 flex-wrap gap-y-1">
                                    <span>${subExp.invoice_issuer || subExp.notes || '<span class="text-slate-400">-</span>'}</span>
                                    ${subExp.is_on_behalf_of_customer ? `
                                        <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 whitespace-nowrap">
                                            <i class="ph-bold ph-arrow-up-right mr-0.5 text-[10px]"></i>CHI HỘ KH
                                        </span>
                                    ` : ''}
                                </div>
                            </td>
                            <td class="py-1.5 px-2.5 text-center border-r border-slate-200/70">
                                <span class="px-2 py-0.2 rounded text-[10.5px] font-bold ${
                                    subExp.status === 'SETTLED' ? 'bg-purple-100 text-purple-800' :
                                    subExp.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }">
                                    ${subExp.status_label || (subExp.status === 'SETTLED' ? 'Đã chốt sổ' : (subExp.status === 'APPROVED' ? 'Đã duyệt' : 'Chờ duyệt'))}
                                </span>
                            </td>
                            <td class="py-1.5 px-2.5 text-center">
                                ${trip.is_expenses_settled || !subExp.can_edit ? `
                                    <span class="inline-flex items-center text-purple-700 font-bold text-[10.5px] bg-purple-50 px-2 py-0.5 rounded border border-purple-200" title="Đã chốt sổ Kế toán, không thể chỉnh sửa">
                                        <i class="ph-bold ph-lock mr-1"></i> Khóa
                                    </span>
                                ` : `
                                    <div class="inline-flex items-center space-x-1">
                                        <button type="button" onclick="event.stopPropagation(); editExpensePrompt(${subExp.id})" class="p-1 rounded text-amber-700 hover:bg-amber-100 transition-colors font-bold" title="Chỉnh sửa chi phí">
                                            <i class="ph ph-pencil text-sm"></i>
                                        </button>
                                        <button type="button" onclick="event.stopPropagation(); deleteExpensePrompt(${subExp.id}, '${subExp.category_name}')" class="p-1 rounded text-rose-600 hover:bg-rose-100 transition-colors font-bold" title="Xóa khoản chi">
                                            <i class="ph ph-trash text-sm"></i>
                                        </button>
                                    </div>
                                `}
                            </td>
                        </tr>
                    `).join('')}
                `;
            } else {
                // TRƯỜNG HỢP CÓ 0 HOẶC 1 KHOẢN CHI: HIỂN THỊ DÒNG ĐƠN BÌNH THƯỜNG
                const singleExp = matchedExps[0] || null;
                const invNoText = singleExp && singleExp.invoice_number 
                    ? `HĐ: ${singleExp.invoice_number}${singleExp.invoice_lookup_code ? ' / ' + singleExp.invoice_lookup_code : ''}` 
                    : '';
                const issuerText = singleExp ? (singleExp.invoice_issuer || singleExp.notes) : '';

                tbody.innerHTML += `
                    <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-200/70 ${amountSum > 0 ? 'bg-amber-50/20' : ''}">
                        <td class="py-1.5 px-3 text-center text-slate-400 font-bold border-r border-slate-200/70">${item.stt}</td>
                        <td class="py-1.5 px-3 border-r border-slate-200/70">
                            <span class="font-bold text-slate-900 text-[13px]">${item.title}</span>
                        </td>
                        <td class="py-1.5 px-3 border-r border-slate-200/70">
                            ${singleExp ? renderExpenseDriverLegBadge(singleExp, trip) : '<span class="text-slate-300 text-xs">-</span>'}
                        </td>
                        <td class="py-1.5 px-3 text-right font-black text-[13px] tabular-nums font-mono border-r border-slate-200/70 ${amountSum > 0 ? 'text-rose-600' : 'text-slate-400'}">
                            ${amountSum > 0 ? formatMoney(amountSum) : '-'}
                        </td>
                        <td class="py-1.5 px-3 border-r border-slate-200/70">
                            ${invNoText ? `
                                <div class="inline-flex items-center space-x-1 font-mono text-[11.5px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                    <span>${invNoText}</span>
                                    ${singleExp.invoice_lookup_url ? `
                                        <a href="${singleExp.invoice_lookup_url}" target="_blank" class="text-blue-600 hover:text-blue-800 ml-1 font-bold" title="Tra cứu online">
                                            <i class="ph ph-arrow-square-out text-xs"></i>
                                        </a>
                                    ` : ''}
                                </div>
                            ` : '<span class="text-slate-400 text-[11.5px]">-</span>'}
                        </td>
                        <td class="py-1.5 px-3 text-slate-600 text-[11.5px] border-r border-slate-200/70">
                            <div class="flex items-center space-x-1.5 flex-wrap gap-y-1">
                                <span>${issuerText || '<span class="text-slate-400">-</span>'}</span>
                                ${(singleExp && singleExp.is_on_behalf_of_customer) ? `
                                    <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 whitespace-nowrap">
                                        <i class="ph-bold ph-arrow-up-right mr-0.5 text-[10px]"></i>CHI HỘ KH
                                    </span>
                                ` : ''}
                            </div>
                        </td>
                        <td class="py-1.5 px-3 text-center border-r border-slate-200/70">
                            ${amountSum > 0 
                                ? `<span class="px-2 py-0.2 rounded text-[10.5px] font-bold ${
                                    (singleExp && singleExp.status === 'SETTLED') ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                                }">${(singleExp && singleExp.status_label) || 'Đã Ghi Nhận'}</span>` 
                                : `<span class="px-2 py-0.2 rounded text-[10.5px] font-bold bg-slate-100 text-slate-400">-</span>`}
                        </td>
                        <td class="py-1.5 px-3 text-center">
                            ${singleExp ? (
                                trip.is_expenses_settled || !singleExp.can_edit ? `
                                    <span class="inline-flex items-center text-purple-700 font-bold text-[10.5px] bg-purple-50 px-2 py-0.5 rounded border border-purple-200" title="Đã chốt sổ Kế toán, không thể chỉnh sửa">
                                        <i class="ph-bold ph-lock mr-1"></i> Khóa
                                    </span>
                                ` : `
                                    <div class="inline-flex items-center space-x-1">
                                        <button type="button" onclick="editExpensePrompt(${singleExp.id})" class="p-1 rounded text-amber-700 hover:bg-amber-100 transition-colors font-bold" title="Chỉnh sửa chi phí">
                                            <i class="ph ph-pencil text-sm"></i>
                                        </button>
                                        <button type="button" onclick="deleteExpensePrompt(${singleExp.id}, '${singleExp.category_name}')" class="p-1 rounded text-rose-600 hover:bg-rose-100 transition-colors font-bold" title="Xóa khoản chi">
                                            <i class="ph ph-trash text-sm"></i>
                                        </button>
                                    </div>
                                `
                            ) : '<span class="text-slate-300">-</span>'}
                        </td>
                    </tr>
                `;
            }
        }
    });

    const totalEl = document.getElementById('cost-sheet-total');
    if (totalEl) totalEl.innerText = formatMoney(totalCalculated);

    // Hiển thị dòng Tổng Chi Hộ KH nếu có (cất riêng khỏi chi phí vận hành)
    const reimbursableTotal = trip.cost_sheet?.total_reimbursable || 0;
    const reimbursableItems = trip.cost_sheet?.reimbursable_items || [];
    const reimbursableRow = document.getElementById('cost-sheet-reimbursable-row');
    const reimbursableTotalEl = document.getElementById('cost-sheet-reimbursable-total');
    if (reimbursableRow) {
        reimbursableRow.style.display = reimbursableTotal > 0 ? '' : 'none';
    }
    if (reimbursableTotalEl) {
        const itemsText = reimbursableItems.map(it => `${it.category}: ${formatMoney(it.amount)}`).join(' · ');
        reimbursableTotalEl.innerHTML = `
            <td colspan="2" class="p-3 text-right text-xs font-bold text-amber-800">
                <i class="ph-bold ph-arrow-up-right mr-1"></i>Tổng Khoản Chi Hộ Khách Hàng
                <p class="text-[10px] font-normal text-amber-600 mt-0.5">${itemsText || 'Công ty ứng chi trước, thu lại khi quyết toán với KH'}</p>
            </td>
            <td class="p-3 text-right font-black text-amber-700 tabular-nums">${formatMoney(reimbursableTotal)}</td>
            <td colspan="4" class="p-3 text-xs text-amber-600">
                <span class="px-2 py-0.5 rounded bg-amber-100 border border-amber-300 font-bold text-amber-800 text-[10px]">Không tính vào chi phí công ty</span>
            </td>
        `;
    }

    // ĐỒNG BỘ TUYỆT ĐỐI VỚI BOX P&L VÀ APP MOBILE (SINGLE SOURCE OF TRUTH)
    const pnlExpenseEl = document.getElementById('pnl-expense');
    if (pnlExpenseEl) pnlExpenseEl.innerText = formatMoney(totalCalculated);

    const rev = Number(trip.financials?.revenue || 0);
    const actualProfit = rev - totalCalculated;
    const actualMargin = rev > 0 ? ((actualProfit / rev) * 100).toFixed(1) : 0;
    const profitEl = document.getElementById('pnl-profit');
    if (profitEl) {
        profitEl.innerText = `${formatMoney(actualProfit)} (${actualMargin}%)`;
    }

    const appTotal = document.getElementById('app-total-expense');
    if (appTotal) appTotal.innerText = formatMoney(totalCalculated);
}

// Xây dựng nội dung tin nhắn Lệnh điều xe gửi Zalo chuẩn hóa
function buildDriverZaloMessage(trip) {
    if (!trip) return '';
    const driverToken = trip.driver_hashid || trip.hashid || trip.id || trip.trip_code;
    const portalUrl = `${window.location.origin}/driver/${driverToken}/`;
    const tripCode = trip.id || trip.trip_code || trip.code || 'TVL-XXX';
    const vehicle = trip.vehicle || trip.truck || '-';
    const trailer = trip.trailer || '-';
    const cont = trip.container || trip.container_number || 'CHƯA CÓ CONT';
    const contType = trip.container_type ? ` (${trip.container_type})` : '';
    const seal = trip.seal || trip.seal_number || '-';
    const pickup = trip.pickup || trip.pickup_location || '-';
    const warehouse = trip.warehouse || trip.warehouse_location || '-';
    const dropoff = trip.dropoff || trip.dropoff_location || '-';
    const loadingTimeStr = trip.loading_time ? `\n⏰ Giờ hẹn đóng hàng: ${trip.loading_time}` : '';

    return `🚚 LỆNH ĐIỀU XE BIM LOGISTICS:
• Chuyến: ${tripCode}
• Xe: ${vehicle} | Mooc: ${trailer}
• Cont: ${cont}${contType} | Seal: ${seal}
• Điểm 1 (Lấy cont): ${pickup}
• Điểm 2 (Giao kho): ${warehouse}
• Điểm 3 (Hạ cont): ${dropoff}${loadingTimeStr}
⚠️ LƯU Ý: Vui lòng mở link bên dưới xác nhận nhận chuyến trong vòng 60 phút.

👉 Mở link mobile báo mốc & kê chi phí:
${portalUrl}`;
}
window.buildDriverZaloMessage = buildDriverZaloMessage;

// Sao chép Lệnh điều xe kèm link Mobile Driver Portal gửi tài xế qua Zalo/SMS
window.copyDriverPortalLink = function() {
    const trip = window.currentTripDetail;
    if (!trip) {
        alert('Chưa có thông tin chi tiết chuyến xe để sao chép!');
        return;
    }
    const message = buildDriverZaloMessage(trip);
    const portalUrl = `${window.location.origin}/driver/${trip.driver_hashid || trip.hashid || trip.id}/`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(message).then(() => {
            showToast('success', '✓ Đã sao chép Lệnh điều xe kèm link Mobile Driver Portal vào bộ nhớ tạm!\nBạn có thể dán (Ctrl+V) ngay vào Zalo gửi cho tài xế.', 'Đã Sao Chép Lệnh Xe');
        }).catch(err => {
            prompt('Sao chép liên kết gửi tài xế:', portalUrl);
        });
    } else {
        prompt('Sao chép liên kết gửi tài xế:', portalUrl);
    }
};

window.openZaloDriverChat = function() {
    const trip = window.currentTripDetail;
    if (!trip) return;
    const message = buildDriverZaloMessage(trip);
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(message).catch(() => {});
    }
    const phone = trip.driver_phone ? String(trip.driver_phone).replace(/\D/g, '') : '';
    if (phone) {
        window.open(`https://zalo.me/${phone}`, '_blank');
        showToast('success', `Đã sao chép Lệnh điều xe vào bộ nhớ tạm & Mở Zalo tài xế (${phone})! Hãy dán (Ctrl+V) để gửi.`, 'Mở Zalo Thành Công');
    } else {
        showToast('warning', 'Tài xế chưa có số điện thoại đăng ký Zalo trong hồ sơ.', 'Thiếu SĐT Tài Xế');
    }
};

window.copyCustomerTrackingLink = function() {
    const trip = window.currentTripDetail;
    if (!trip) {
        alert('Chưa có thông tin chuyến xe để sao chép!');
        return;
    }
    const trackingToken = trip.tracking_hashid || trip.hashid || trip.trip_code;
    const trackingUrl = `${window.location.origin}/tracking/${trackingToken}/`;
    const destWarehouse = trip.delivery_warehouse || trip.warehouse || 'Kho Khách Hàng';
    const message = `THÔNG TIN TRA CỨU VẬN ĐƠN CONTAINER - BIM LOGISTICS:\nChuyến: ${trip.trip_code || trip.code || trip.id}\nContainer: ${trip.container || '-'} (${trip.container_type || '40HC'})\nSố Chì (Seal): ${trip.seal || 'Chưa bấm'}\nKho Giao Hàng: ${destWarehouse}\n- Quý khách có thể theo dõi tiến độ chuyến xe thời gian thực tại: ${trackingUrl}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(message).then(() => {
            showToast('success', '✓ Đã sao chép liên kết tra cứu tiến độ chuyến xe dành cho khách hàng!\nBạn có thể dán (Ctrl+V) gửi qua Zalo / Email cho chủ hàng.', 'Đã Sao Chép Tracking Link');
        }).catch(err => {
            prompt('Sao chép liên kết gửi khách hàng:', trackingUrl);
        });
    } else {
        prompt('Sao chép liên kết gửi khách hàng:', trackingUrl);
    }
};

// Hàm mở / đóng chi tiết các dòng chi phí con khi người dùng click
function toggleExpenseDetail(code) {
    const subRows = document.querySelectorAll(`.sub-row-${code}`);
    const icon = document.getElementById(`icon-toggle-${code}`);
    subRows.forEach(row => {
        row.classList.toggle('hidden');
    });
    if (icon) {
        icon.classList.toggle('rotate-180');
    }
}

// Đồng bộ dữ liệu hiện trường sang Mobile Driver Sync (Simulator Chuẩn BIM)
function renderDriverMobileApp(trip) {
    if (!trip) return;

    const formatMoney = (n) => new Intl.NumberFormat('vi-VN').format(n || 0) + ' đ';

    // 1. Header Simulator
    const appTripCode = document.getElementById('app-trip-code');
    if (appTripCode) appTripCode.innerText = trip.id || 'TVL-XXX';

    const appDriver = document.getElementById('app-driver-name');
    if (appDriver) appDriver.innerText = `Tài xế: ${trip.driver || 'Chưa gán'}`;

    const appPlate = document.getElementById('app-vehicle-plate');
    if (appPlate) appPlate.innerText = trip.vehicle || 'Chưa gán';

    const statusBadge = document.getElementById('app-status-badge');
    if (statusBadge) {
        statusBadge.innerText = trip.status_label || trip.status || 'MỚI';
        if (trip.status === 'COMPLETED') {
            statusBadge.className = 'text-[9.5px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-white uppercase';
        } else if (trip.status === 'DELIVERED') {
            statusBadge.className = 'text-[9.5px] font-black px-2 py-0.5 rounded-full bg-teal-500 text-white uppercase';
        } else if (['IN_TRANSIT', 'AT_WAREHOUSE', 'UNLOADING', 'RETURNING_EMPTY', 'CONTAINER_PICKED', 'ACCEPTED'].includes(trip.status)) {
            statusBadge.className = 'text-[9.5px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-900 uppercase';
        } else {
            statusBadge.className = 'text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-sky-500 text-white uppercase';
        }
    }

    // 2. Nút Vận Đơn & Container Summary
    const appCont = document.getElementById('app-cont-no');
    if (appCont) appCont.innerText = trip.container || 'Chưa gán';

    const appBooking = document.getElementById('app-booking-no');
    if (appBooking) appBooking.innerText = trip.booking_or_bill || trip.booking || '-';

    const appCustomsDot = document.getElementById('app-customs-dot');
    if (appCustomsDot) {
        if (trip.customs_declaration) {
            appCustomsDot.classList.remove('hidden');
        } else {
            appCustomsDot.classList.add('hidden');
        }
    }

    // 3. Lộ Trình 3 Điểm & 3 Nút Chỉ Đường Thông Minh
    const pLoc = trip.pickup_depot || trip.pickup || 'Cảng / Bãi lấy cont';
    const wLoc = trip.delivery_warehouse || trip.warehouse || 'Kho đóng/trả hàng';
    const dLoc = trip.dropoff_depot || trip.dropoff || 'Cảng / Bãi hạ cont';

    const leg1Name = document.getElementById('sim-leg1-name');
    if (leg1Name) leg1Name.innerText = pLoc;
    const leg2Name = document.getElementById('sim-leg2-name');
    if (leg2Name) leg2Name.innerText = wLoc;
    const leg3Name = document.getElementById('sim-leg3-name');
    if (leg3Name) leg3Name.innerText = dLoc;

    const leg2Time = document.getElementById('sim-leg2-time');
    if (leg2Time) {
        let tStr = '';
        if (trip.loading_time) tStr += `Hẹn: ${trip.loading_time}`;
        if (trip.warehouse_dock) tStr += (tStr ? ' | ' : '') + `Dock: ${trip.warehouse_dock}`;
        leg2Time.innerText = tStr;
    }

    const mapBase = 'https://www.google.com/maps/dir/?api=1&destination=';
    const map1 = document.getElementById('sim-leg1-map');
    if (map1) map1.href = `${mapBase}${encodeURIComponent(pLoc)}`;
    const map2 = document.getElementById('sim-leg2-map');
    if (map2) map2.href = `${mapBase}${encodeURIComponent(wLoc)}`;
    const map3 = document.getElementById('sim-leg3-map');
    if (map3) map3.href = `${mapBase}${encodeURIComponent(dLoc)}`;

    // Modal Route Elements
    const mLeg1Name = document.getElementById('sim-modal-leg1-name');
    if (mLeg1Name) mLeg1Name.innerText = pLoc;
    const mLeg2Name = document.getElementById('sim-modal-leg2-name');
    if (mLeg2Name) mLeg2Name.innerText = wLoc;
    const mLeg3Name = document.getElementById('sim-modal-leg3-name');
    if (mLeg3Name) mLeg3Name.innerText = dLoc;

    const mLeg1Map = document.getElementById('sim-modal-leg1-map');
    if (mLeg1Map) mLeg1Map.href = `${mapBase}${encodeURIComponent(pLoc)}`;
    const mLeg2Map = document.getElementById('sim-modal-leg2-map');
    if (mLeg2Map) mLeg2Map.href = `${mapBase}${encodeURIComponent(wLoc)}`;
    const mLeg3Map = document.getElementById('sim-modal-leg3-map');
    if (mLeg3Map) mLeg3Map.href = `${mapBase}${encodeURIComponent(dLoc)}`;

    const st = trip.status || 'DRAFT';

    // Đang đến
    let curDest = pLoc || 'Bãi lấy cont';
    if (st === 'RETURNING_EMPTY') {
        curDest = dLoc || 'Bãi hạ cont';
    } else if (['CONTAINER_PICKED', 'IN_TRANSIT', 'AT_WAREHOUSE', 'UNLOADING', 'DELIVERED'].includes(st)) {
        curDest = wLoc || 'Kho đóng/trả hàng';
    } else if (st === 'COMPLETED') {
        curDest = 'Đã hoàn tất toàn tuyến';
    }
    const curDestEl = document.getElementById('sim-current-dest');
    if (curDestEl) curDestEl.innerText = `Đang đến: ${curDest}`;

    // Trạng thái Lộ trình 3 điểm (Style đồng bộ Driver Portal)
    const leg1Card = document.getElementById('sim-leg1-card') || document.getElementById('sim-modal-leg1-card');
    const leg1Icon = document.getElementById('sim-leg1-icon') || document.getElementById('sim-modal-leg1-icon');
    const leg1Badge = document.getElementById('sim-leg1-badge') || document.getElementById('sim-modal-leg1-badge');

    const leg2Card = document.getElementById('sim-leg2-card') || document.getElementById('sim-modal-leg2-card');
    const leg2Icon = document.getElementById('sim-leg2-icon') || document.getElementById('sim-modal-leg2-icon');
    const leg2Badge = document.getElementById('sim-leg2-badge') || document.getElementById('sim-modal-leg2-badge');

    const leg3Card = document.getElementById('sim-leg3-card') || document.getElementById('sim-modal-leg3-card');
    const leg3Icon = document.getElementById('sim-leg3-icon') || document.getElementById('sim-modal-leg3-icon');
    const leg3Badge = document.getElementById('sim-leg3-badge') || document.getElementById('sim-modal-leg3-badge');

    // Reset styles
    const setLegStyle = (card, icon, badge, mode, stepNum, titleText) => {
        if (!card) return;
        if (mode === 'DONE') {
            card.className = 'p-2.5 rounded-xl border bg-emerald-50/70 border-emerald-300 text-emerald-950';
            if (icon) {
                icon.className = 'w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs mt-0.5 shrink-0 bg-emerald-700 text-white';
                icon.innerHTML = '<i class="ph-bold ph-check text-xs"></i>';
            }
            if (badge) {
                badge.className = 'text-[10.5px] font-bold uppercase tracking-wider flex items-center gap-1 text-emerald-800';
                badge.innerHTML = `<span>Điểm ${stepNum}: ${titleText}</span><span class="px-1.5 py-0.2 bg-emerald-200 text-emerald-900 rounded text-[8.5px]">ĐÃ XONG</span>`;
            }
        } else if (mode === 'ACTIVE') {
            card.className = 'p-3 rounded-xl border-2 bg-teal-50 border-teal-600 text-teal-950 shadow-2xs';
            if (icon) {
                icon.className = 'w-6 h-6 rounded-full flex items-center justify-center font-black text-xs mt-0.5 shrink-0 bg-teal-700 text-white ring-2 ring-teal-200';
                icon.innerHTML = `${stepNum}`;
            }
            if (badge) {
                badge.className = 'text-[10.5px] font-black uppercase tracking-wider flex items-center gap-1 text-teal-800';
                badge.innerHTML = `<span>Điểm ${stepNum}: ${titleText}</span><span class="px-1.5 py-0.2 bg-amber-400 text-slate-900 rounded-full text-[9px] font-black animate-pulse">⚡ ĐANG ĐẾN</span>`;
            }
        } else {
            // PENDING
            card.className = 'p-2.5 rounded-xl border bg-slate-50 border-slate-200 text-slate-400';
            if (icon) {
                icon.className = 'w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs mt-0.5 shrink-0 bg-slate-200 text-slate-500';
                icon.innerHTML = `${stepNum}`;
            }
            if (badge) {
                badge.className = 'text-[10.5px] font-bold uppercase tracking-wider text-slate-500';
                badge.innerHTML = `<span>Điểm ${stepNum}: ${titleText}</span>`;
            }
        }
    };

    if (st === 'COMPLETED') {
        setLegStyle(leg1Card, leg1Icon, leg1Badge, 'DONE', 1, 'Lấy Cont / Hàng');
        setLegStyle(leg2Card, leg2Icon, leg2Badge, 'DONE', 2, 'Kho Đóng / Trả Hàng');
        setLegStyle(leg3Card, leg3Icon, leg3Badge, 'DONE', 3, 'Bãi Hạ Vỏ Cont');
    } else if (st === 'RETURNING_EMPTY') {
        setLegStyle(leg1Card, leg1Icon, leg1Badge, 'DONE', 1, 'Lấy Cont / Hàng');
        setLegStyle(leg2Card, leg2Icon, leg2Badge, 'DONE', 2, 'Kho Đóng / Trả Hàng');
        setLegStyle(leg3Card, leg3Icon, leg3Badge, 'ACTIVE', 3, 'Bãi Hạ Vỏ Cont');
    } else if (['CONTAINER_PICKED', 'IN_TRANSIT', 'AT_WAREHOUSE', 'UNLOADING', 'DELIVERED'].includes(st)) {
        setLegStyle(leg1Card, leg1Icon, leg1Badge, 'DONE', 1, 'Lấy Cont / Hàng');
        setLegStyle(leg2Card, leg2Icon, leg2Badge, 'ACTIVE', 2, 'Kho Đóng / Trả Hàng');
        setLegStyle(leg3Card, leg3Icon, leg3Badge, 'PENDING', 3, 'Bãi Hạ Vỏ Cont');
    } else {
        // DRAFT, DISPATCHED, ACCEPTED
        setLegStyle(leg1Card, leg1Icon, leg1Badge, 'ACTIVE', 1, 'Lấy Cont / Hàng');
        setLegStyle(leg2Card, leg2Icon, leg2Badge, 'PENDING', 2, 'Kho Đóng / Trả Hàng');
        setLegStyle(leg3Card, leg3Icon, leg3Badge, 'PENDING', 3, 'Bãi Hạ Vỏ Cont');
    }

    // 4. SMART NEXT-ACTION HERO CARD (Tương tác 1-chạm)
    const nextStepLabel = document.getElementById('sim-next-step-label');
    const nextActionTitle = document.getElementById('sim-next-action-title');
    const nextActionDesc = document.getElementById('sim-next-action-desc');
    const nextActionBtns = document.getElementById('sim-next-action-btns');

    if (nextActionBtns) {
        if (st === 'DRAFT' || st === 'DISPATCHED') {
            if (nextStepLabel) nextStepLabel.innerText = 'Bước 1-2/10';
            if (nextActionTitle) nextActionTitle.innerText = 'Lệnh điều xe mới phát';
            if (nextActionDesc) nextActionDesc.innerText = 'Tài xế bấm nhận chuyến để bắt đầu hoặc từ chối để điều độ phân xe lại.';
            nextActionBtns.innerHTML = `
                <div class="grid grid-cols-2 gap-2">
                    <button type="button" onclick="driverReportMilestone('DECLINED_TRIP')" class="py-2.5 rounded-xl border border-rose-500/60 text-rose-300 font-bold text-xs flex items-center justify-center gap-1 hover:bg-rose-950/50 active:scale-95 transition-all">
                        <i class="ph-bold ph-x-circle"></i> Từ Chối
                    </button>
                    <button type="button" onclick="driverReportMilestone('ACCEPTED_TRIP')" class="py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs flex items-center justify-center gap-1 shadow-md active:scale-95 transition-all">
                        <i class="ph-bold ph-check-circle"></i> Nhận Chuyến
                    </button>
                </div>
            `;
        } else if (st === 'ACCEPTED') {
            if (nextStepLabel) nextStepLabel.innerText = 'Bước 3/10';
            if (nextActionTitle) nextActionTitle.innerText = 'Đã nhận lệnh — Chuẩn bị xuất phát';
            if (nextActionDesc) nextActionDesc.innerText = 'Chụp ảnh giám định vỏ cont tại bãi lấy cont trước khi xuất phát.';
            nextActionBtns.innerHTML = `
                <div class="grid grid-cols-2 gap-2">
                    <button type="button" onclick="openOcrApp('chung-tu')" class="py-2.5 rounded-xl border border-slate-500 text-slate-200 font-bold text-xs flex items-center justify-center gap-1 hover:bg-slate-800 active:scale-95 transition-all">
                        <i class="ph-bold ph-camera"></i> Chụp Vỏ Cont
                    </button>
                    <button type="button" onclick="driverReportMilestone('DEPARTED')" class="py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs flex items-center justify-center gap-1 shadow-md active:scale-95 transition-all">
                        <i class="ph-bold ph-paper-plane-tilt"></i> Xuất Phát Đi
                    </button>
                </div>
            `;
        } else if (st === 'CONTAINER_PICKED') {
            if (nextStepLabel) nextStepLabel.innerText = 'Bước 4-5/10';
            if (nextActionTitle) nextActionTitle.innerText = 'Đang trên đường đến kho khách hàng';
            if (nextActionDesc) nextActionDesc.innerText = 'Báo trước 30 phút cho thủ kho hoặc bấm Check-in ngay khi đến cổng kho.';
            nextActionBtns.innerHTML = `
                <div class="grid grid-cols-2 gap-2">
                    <button type="button" onclick="driverReportMilestone('APPROACHING_WAREHOUSE')" class="py-2.5 rounded-xl border border-teal-400 text-teal-200 font-bold text-xs flex items-center justify-center gap-1 hover:bg-teal-950/50 active:scale-95 transition-all">
                        <i class="ph-bold ph-bell-ringing"></i> Báo Sắp Đến
                    </button>
                    <button type="button" onclick="driverReportMilestone('ARRIVED_WAREHOUSE')" class="py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs flex items-center justify-center gap-1 shadow-md active:scale-95 transition-all">
                        <i class="ph-bold ph-map-pin"></i> Đến Cổng Kho
                    </button>
                </div>
            `;
        } else if (st === 'IN_TRANSIT' || st === 'AT_WAREHOUSE') {
            if (nextStepLabel) nextStepLabel.innerText = 'Bước 6/10';
            if (nextActionTitle) nextActionTitle.innerText = 'Tại kho — Chờ gọi vào Dock';
            if (nextActionDesc) nextActionDesc.innerText = 'Khi xe lùi vào dock mở cửa cont, bấm bắt đầu dỡ/đóng hàng.';
            nextActionBtns.innerHTML = `
                <button type="button" onclick="driverReportMilestone('START_UNLOADING')" class="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all">
                    <i class="ph-bold ph-package text-base"></i>
                    <span>BẮT ĐẦU ĐÓNG / DỠ HÀNG</span>
                </button>
            `;
        } else if (st === 'UNLOADING') {
            if (nextStepLabel) nextStepLabel.innerText = 'Bước 7/10';
            if (nextActionTitle) nextActionTitle.innerText = 'Đang đóng/dỡ hàng tại Dock';
            if (nextActionDesc) nextActionDesc.innerText = 'Sau khi xếp hàng xong, chụp biên bản giao nhận có chữ ký (POD).';
            nextActionBtns.innerHTML = `
                <div class="grid grid-cols-2 gap-2">
                    <button type="button" onclick="openOcrApp('chung-tu')" class="py-2.5 rounded-xl border border-teal-400 text-teal-200 font-bold text-xs flex items-center justify-center gap-1 hover:bg-teal-950 active:scale-95 transition-all">
                        <i class="ph-bold ph-camera"></i> Chụp POD
                    </button>
                    <button type="button" onclick="driverReportMilestone('FINISHED_UNLOADING')" class="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1 shadow-md active:scale-95 transition-all">
                        <i class="ph-bold ph-check-circle"></i> Đóng Xong
                    </button>
                </div>
            `;
        } else if (st === 'DELIVERED') {
            if (nextStepLabel) nextStepLabel.innerText = 'Bước 8/10';
            if (nextActionTitle) nextActionTitle.innerText = 'Hoàn tất giao hàng — Ra khỏi cổng kho';
            if (nextActionDesc) nextActionDesc.innerText = 'Kéo cont rời kho để vận chuyển về bãi cảng hạ cont.';
            nextActionBtns.innerHTML = `
                <button type="button" onclick="driverReportMilestone('DEPART_TO_DROPOFF')" class="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all">
                    <i class="ph-bold ph-truck text-base"></i>
                    <span>KÉO CONT RỜI KHO — VỀ BÃI HẠ</span>
                </button>
            `;
        } else if (st === 'RETURNING_EMPTY') {
            if (nextStepLabel) nextStepLabel.innerText = 'Bước 9/10';
            if (nextActionTitle) nextActionTitle.innerText = 'Đang vận chuyển về bãi hạ';
            if (nextActionDesc) nextActionDesc.innerText = 'Đến bãi hạ, cẩu cont xuống và nhận Phiếu EIR hạ cont.';
            nextActionBtns.innerHTML = `
                <button type="button" onclick="driverReportMilestone('DROPOFF_COMPLETED')" class="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all">
                    <i class="ph-bold ph-anchor text-base"></i>
                    <span>ĐÃ HẠ CONT — LẤY PHIẾU EIR</span>
                </button>
            `;
        } else {
            // COMPLETED
            if (nextStepLabel) nextStepLabel.innerText = 'Hoàn Tất 10/10';
            if (nextActionTitle) nextActionTitle.innerText = 'Chuyến xe đã hoàn thành 100%';
            if (nextActionDesc) nextActionDesc.innerText = 'Toàn bộ chứng từ và chi phí đã chuyển cho Điều Độ và Kế Toán đối soát.';
            nextActionBtns.innerHTML = `
                <div class="py-2 px-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-center text-emerald-300 font-black text-xs flex items-center justify-center gap-1.5">
                    <i class="ph-bold ph-check-fat text-emerald-400"></i>
                    <span>CHUYẾN XE ĐÃ HOÀN TẤT</span>
                </div>
            `;
        }
    }

    // 4.5. DYNAMICALLY RENDER & LOCK QUICK MILESTONES (ZERO JUMP & COMPLETED LOCK)
    renderSimQuickMilestones(trip.status, !!trip.is_overnight_detention);

    // 5. Accordion Timeline Mini List
    const timelineMiniList = document.getElementById('sim-timeline-mini-list');
    if (timelineMiniList) {
        timelineMiniList.innerHTML = '';
        const tList = trip.timeline || [];
        if (tList.length === 0) {
            timelineMiniList.innerHTML = `<p class="text-[10px] text-slate-400 text-center py-1 italic">Chưa có mốc tiến độ</p>`;
        } else {
            tList.forEach(item => {
                let dotClass = 'bg-slate-300 text-slate-600';
                let textClass = 'text-slate-500';
                let timeClass = 'text-slate-400';
                let iconContent = item.step;

                if (item.active) {
                    dotClass = 'bg-teal-600 text-white ring-2 ring-teal-200 animate-pulse';
                    textClass = 'text-teal-950 font-bold';
                    timeClass = 'text-teal-700 font-bold';
                } else if (item.done) {
                    dotClass = 'bg-emerald-600 text-white';
                    textClass = 'text-slate-800 font-medium';
                    timeClass = 'text-slate-500';
                    iconContent = '✓';
                }

                timelineMiniList.innerHTML += `
                    <div class="flex items-center justify-between py-1 border-b border-slate-100 last:border-b-0 text-[10.5px]">
                        <div class="flex items-center gap-1.5 overflow-hidden">
                            <span class="w-4 h-4 rounded-full flex items-center justify-center font-bold text-[9px] shrink-0 ${dotClass}">${iconContent}</span>
                            <span class="truncate ${textClass}">${item.title}</span>
                        </div>
                        <span class="font-mono text-[10px] shrink-0 pl-1 ${timeClass}">${item.time || '—'}</span>
                    </div>
                `;
            });
        }
    }

    // 6. Accordion Chi Phí Đã Kê
    const totalDriverExpense = (trip.expenses || []).reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const appTotal = document.getElementById('app-total-expense');
    if (appTotal) appTotal.innerText = formatMoney(totalDriverExpense);

    const listEl = document.getElementById('app-expenses-list');
    if (listEl) {
        listEl.innerHTML = '';
        if (!trip.expenses || trip.expenses.length === 0) {
            listEl.innerHTML = `<p class="text-[10px] text-slate-400 text-center py-2 italic">Chưa có khoản chi phí nào</p>`;
        } else {
            trip.expenses.forEach(exp => {
                let actionButtons = '';
                if (exp.status === 'PENDING') {
                    actionButtons = `
                        <div class="flex items-center space-x-1 mt-1">
                            <button onclick="driverEditExpense(${exp.id})" class="px-1.5 py-0.2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded text-[9.5px] font-bold border border-amber-200 flex items-center">
                                <i class="ph ph-pencil mr-0.5"></i> Sửa
                            </button>
                            <button onclick="driverDeleteExpense(${exp.id})" class="px-1.5 py-0.2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-[9.5px] font-bold border border-rose-200 flex items-center">
                                <i class="ph ph-trash mr-0.5"></i> Xóa
                            </button>
                        </div>
                    `;
                } else if (exp.status === 'SETTLED') {
                    actionButtons = `
                        <span class="inline-flex items-center text-[9px] font-bold text-purple-700 mt-1">
                            <i class="ph-bold ph-lock mr-0.5"></i> Đã chốt sổ
                        </span>
                    `;
                } else {
                    actionButtons = `
                        <span class="inline-flex items-center text-[9px] font-bold text-emerald-700 mt-1">
                            <i class="ph-bold ph-lock mr-0.5"></i> Đã duyệt
                        </span>
                    `;
                }

                listEl.innerHTML += `
                    <div class="p-1.5 rounded-lg bg-slate-50 border border-slate-200/70 flex flex-col space-y-0.5">
                        <div class="flex justify-between items-start">
                            <div class="overflow-hidden">
                                <p class="text-[11px] font-bold text-slate-800 truncate">${exp.category_name}</p>
                                <p class="text-[9.5px] text-slate-400 font-mono truncate">${exp.invoice_number ? 'HĐ: ' + exp.invoice_number : (exp.notes || exp.time)}</p>
                            </div>
                            <span class="text-[11px] font-black text-rose-600 tabular-nums shrink-0 pl-1">${formatMoney(exp.amount)}</span>
                        </div>
                        <div class="flex justify-between items-center pt-0.5 border-t border-slate-200/50">
                            <span class="text-[8.5px] px-1.5 py-0.2 rounded font-bold ${
                                exp.status === 'SETTLED' ? 'bg-purple-100 text-purple-800' :
                                exp.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }">
                                ${exp.status_label || (exp.status === 'SETTLED' ? 'Đã chốt sổ' : (exp.status === 'APPROVED' ? 'Đã duyệt' : 'Chờ duyệt'))}
                            </span>
                            ${actionButtons}
                        </div>
                    </div>
                `;
            });
        }
    }
}

// Helper đổ dữ liệu Chặng / Tài xế / Đầu kéo vào dropdown chi phí (Hỗ trợ Tài xế đăng nhập & Admin văn phòng)
function populateExpenseLegOptions(selectElId, selectedVal = null) {
    const select = document.getElementById(selectElId);
    if (!select || !currentActiveTripData) return;

    const t = currentActiveTripData;
    let html = '';

    // Xác định thông tin người dùng đang đăng nhập
    const currentUser = window.CURRENT_USER || {};
    const isCurrentUserDriver = currentUser.role === 'DRIVER';
    const currentEmpId = currentUser.employee_id;

    // Xác định giá trị mặc định được chọn
    let targetVal = selectedVal;
    if (!targetVal) {
        if (isCurrentUserDriver && currentEmpId) {
            if (t.is_split_trip && t.dropoff_driver_id === currentEmpId) {
                targetVal = 'LEG_2';
            } else if (t.driver_id === currentEmpId) {
                targetVal = t.is_split_trip ? 'LEG_1' : 'ENTIRE';
            } else {
                targetVal = `DRIVER_${currentEmpId}`;
            }
        } else {
            // Mặc định cho Admin / Điều phối văn phòng
            targetVal = t.is_split_trip ? 'LEG_1' : 'ENTIRE';
        }
    }

    // Nhóm 1: Chặng vận chuyển & Tài xế Chuyến xe
    html += `<optgroup label="Tài xế & Chặng theo Chuyến xe">`;
    if (t.is_split_trip) {
        const driver1 = t.driver || 'Tài xế Chặng 1';
        const veh1 = t.vehicle || 'Xe 1';
        const driver2 = t.dropoff_driver || 'Tài xế Chặng 2';
        const veh2 = t.dropoff_vehicle || 'Xe 2';

        html += `<option value="LEG_1" data-driver-id="${t.driver_id || ''}" data-vehicle-id="${t.vehicle_id || ''}" ${targetVal === 'LEG_1' ? 'selected' : ''}>Chặng 1 (Lấy cont ➔ Kho): ${driver1} (${veh1})</option>`;
        html += `<option value="LEG_2" data-driver-id="${t.dropoff_driver_id || ''}" data-vehicle-id="${t.dropoff_vehicle_id || ''}" ${targetVal === 'LEG_2' ? 'selected' : ''}>Chặng 2 (Kho ➔ Hạ bãi): ${driver2} (${veh2})</option>`;
        html += `<option value="ENTIRE" data-driver-id="${t.driver_id || ''}" data-vehicle-id="${t.vehicle_id || ''}" ${targetVal === 'ENTIRE' ? 'selected' : ''}>Toàn trình: ${driver1} (${veh1})</option>`;
        html += `<option value="COMPANY" ${targetVal === 'COMPANY' ? 'selected' : ''}>Công ty chi chung (Cược cont, nâng hạ chuyển khoản VP...)</option>`;
    } else {
        const driver = t.driver || 'Tài xế';
        const veh = t.vehicle || 'Đầu kéo';
        html += `<option value="ENTIRE" data-driver-id="${t.driver_id || ''}" data-vehicle-id="${t.vehicle_id || ''}" ${targetVal === 'ENTIRE' || targetVal === 'LEG_1' ? 'selected' : ''}>Toàn trình: ${driver} (${veh})</option>`;
        html += `<option value="COMPANY" ${targetVal === 'COMPANY' ? 'selected' : ''}>Công ty chi chung (Cược cont, nâng hạ chuyển khoản VP...)</option>`;
    }
    html += `</optgroup>`;

    // Nhóm 2: Chọn tài xế khác trong Đội xe (Admin / Điều phối văn phòng có thể chọn tài khác)
    if (t.available_drivers && t.available_drivers.length > 0) {
        html += `<optgroup label="Tất cả Tài xế Đội xe (Admin / Điều phối chọn)">`;
        t.available_drivers.forEach(d => {
            const val = `DRIVER_${d.id}`;
            const isSelected = (targetVal === val || targetVal === d.id);
            const vehPlate = d.vehicle ? ` - Xe: ${d.vehicle}` : '';
            html += `<option value="${val}" data-driver-id="${d.id}" data-vehicle-id="${d.vehicle_id || ''}" ${isSelected ? 'selected' : ''}>${d.name} [${d.code}]${vehPlate}</option>`;
        });
        html += `</optgroup>`;
    }

    select.innerHTML = html;
}

// --- QUẢN LÝ MỐC CHỜ HẠ CONT SAU 0H & TÍNH PHÍ LƯU XE ---
function openModalDetention() {
    if (!currentActiveTripData) return;
    const t = currentActiveTripData;
    const modal = document.getElementById('modal-detention');
    if (!modal) return;

    const gateoutEl = document.getElementById('detention-modal-gateout-time');
    if (gateoutEl) gateoutEl.innerText = t.actual_gate_out_time || t.loading_time || 'Chưa ghi nhận mốc ra cổng';

    const inpAppoint = document.getElementById('detention-inp-appointment');
    if (inpAppoint) inpAppoint.value = (t.dropoff_appointment_time && t.dropoff_appointment_time !== '-') ? t.dropoff_appointment_time : 'Sau 00:00';

    const inpActual = document.getElementById('detention-inp-actual');
    if (inpActual) inpActual.value = (t.actual_dropoff_time && t.actual_dropoff_time !== '-') ? t.actual_dropoff_time : '';

    const inpReason = document.getElementById('detention-inp-reason');
    if (inpReason && t.detention_reason) inpReason.value = t.detention_reason;

    const inpHours = document.getElementById('detention-inp-hours');
    if (inpHours) inpHours.value = t.overnight_wait_hours > 0 ? t.overnight_wait_hours : 8.0;

    const chkOvernight = document.getElementById('detention-chk-overnight');
    if (chkOvernight) chkOvernight.checked = t.is_overnight_detention || true;

    const inpFeeCust = document.getElementById('detention-inp-fee-customer');
    if (inpFeeCust) {
        inpFeeCust.value = t.detention_fee_customer > 0 ? new Intl.NumberFormat('vi-VN').format(t.detention_fee_customer) : '800.000';
    }

    const inpAllowDrv = document.getElementById('detention-inp-allowance-driver');
    if (inpAllowDrv) {
        inpAllowDrv.value = t.detention_driver_allowance > 0 ? new Intl.NumberFormat('vi-VN').format(t.detention_driver_allowance) : '250.000';
    }

    modal.classList.remove('hidden-view');
}

function closeModalDetention() {
    const modal = document.getElementById('modal-detention');
    if (modal) modal.classList.add('hidden-view');
}

function setQuickAppointment(val) {
    const inp = document.getElementById('detention-inp-appointment');
    if (inp) inp.value = val;
}

function setCurrentTimeToDropoff() {
    const inp = document.getElementById('detention-inp-actual');
    if (!inp) return;
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())} ${pad(now.getDate())}/${pad(now.getMonth() + 1)}`;
    inp.value = timeStr;
}

async function submitDetentionUpdate() {
    if (!currentActiveTripData) return;
    const tripCode = currentActiveTripData.trip_code || currentActiveTripData.id;
    
    const appointmentTime = document.getElementById('detention-inp-appointment')?.value?.trim();
    const actualTime = document.getElementById('detention-inp-actual')?.value?.trim();
    const reason = document.getElementById('detention-inp-reason')?.value?.trim();
    const hours = parseFloat(document.getElementById('detention-inp-hours')?.value || 0);
    const isOvernight = document.getElementById('detention-chk-overnight')?.checked ?? true;
    
    const parseMoney = (id) => {
        const val = document.getElementById(id)?.value?.replace(/\./g, '').replace(/,/g, '').trim();
        return parseInt(val) || 0;
    };
    
    const feeCustomer = parseMoney('detention-inp-fee-customer');
    const allowanceDriver = parseMoney('detention-inp-allowance-driver');
    const autoCreateExpense = document.getElementById('detention-chk-auto-expense')?.checked ?? true;

    try {
        const res = await fetchWithAuth(`/api/trips/${tripCode}/`, {
            method: 'PATCH',
            body: JSON.stringify({
                dropoff_appointment_time: appointmentTime,
                actual_dropoff_time: actualTime,
                detention_reason: reason,
                overnight_wait_hours: hours,
                is_overnight_detention: isOvernight,
                detention_fee_customer: feeCustomer,
                detention_driver_allowance: allowanceDriver,
                auto_create_driver_allowance: autoCreateExpense
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Cập nhật thất bại');

        closeModalDetention();
        showToast('success', 'Đã lưu mốc hẹn hạ sau 0h và tính phí lưu xe thành công!', 'Tiến Độ Hạ Cont');

        // Tải lại chi tiết chuyến xe
        if (typeof openTripDetail === 'function') {
            await openTripDetail(tripCode);
        }
    } catch (err) {
        showToast('danger', err.message || 'Lỗi khi cập nhật mốc lưu xe', 'Thất bại');
    }
}

// Xác nhận nhận chuyến thay tài xế (khi điều độ gọi điện thoại trực tiếp)
async function confirmTripManually() {
    const trip = window.currentTripDetail;
    if (!trip) return;
    const confirmed = await showConfirmModal({
        title: 'Xác Nhận Nhận Chuyến',
        message: `Xác nhận bác tài ${trip.driver} ĐÃ NHẬN CHUYẾN ${trip.id} qua điện thoại?\n\nTrạng thái sẽ được chuyển sang ĐÃ NHẬN VIỆC (ACCEPTED).`,
        confirmText: 'Xác Nhận Nhận Chuyến',
        cancelText: 'Huỷ bỏ',
        type: 'success',
        icon: 'ph-bold ph-phone-call text-2xl'
    });
    if (!confirmed) return;

    try {
        const res = await fetchWithAuth(`/api/trips/${trip.id}/milestones/`, {
            method: 'POST',
            body: JSON.stringify({
                milestone: 'ACCEPTED_TRIP',
                notes: 'Điều độ viên xác nhận nhận chuyến thay tài xế qua điện thoại'
            })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', `Đã xác nhận nhận chuyến ${trip.id}!`, 'Xác Nhận Thành Công');
            await viewTripDetail(trip.id);
            if (typeof loadTripsData === 'function') loadTripsData();
        } else {
            showToast('danger', data.message || data.error || 'Không thể xác nhận chuyến');
        }
    } catch (err) {
        console.error('Error confirming trip:', err);
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}
window.confirmTripManually = confirmTripManually;

// Modal Phân Lại Xe / Bác Tài (Khi Quá Hạn Xác Nhận)
function openReassignDriverModal() {
    const trip = window.currentTripDetail;
    if (!trip) return;
    
    const modal = document.getElementById('modal-reassign-driver');
    if (!modal) return;

    const selectDrv = document.getElementById('reassign-driver-select');
    if (selectDrv && trip.available_drivers) {
        selectDrv.innerHTML = '<option value="">-- Chọn Bác Tài Mới Thay Thế --</option>' + 
            trip.available_drivers.map(d => `<option value="${d.id}" data-veh="${d.vehicle_id || ''}">${escapeHtml(d.name)} ${d.vehicle ? `(Xe: ${d.vehicle})` : ''}</option>`).join('');
    }
    
    const currInfo = document.getElementById('reassign-current-info');
    if (currInfo) {
        currInfo.innerText = `Chuyến: ${trip.id} | Bác tài hiện tại: ${trip.driver} (${trip.vehicle})`;
    }

    modal.classList.remove('hidden-view');
    modal.classList.remove('hidden');
}
window.openReassignDriverModal = openReassignDriverModal;

function closeReassignDriverModal() {
    const modal = document.getElementById('modal-reassign-driver');
    if (modal) {
        modal.classList.add('hidden-view');
        modal.classList.add('hidden');
    }
}
window.closeReassignDriverModal = closeReassignDriverModal;

async function submitReassignDriver(e) {
    e.preventDefault();
    const trip = window.currentTripDetail;
    if (!trip) return;

    const selectDrv = document.getElementById('reassign-driver-select');
    const driverId = selectDrv?.value;
    if (!driverId) {
        alert('Vui lòng chọn tài xế mới!');
        return;
    }

    const selectedOption = selectDrv.options[selectDrv.selectedIndex];
    const vehId = selectedOption?.getAttribute('data-veh');
    const reason = document.getElementById('reassign-reason')?.value || 'Tài xế cũ không phản hồi sau 60 phút';

    try {
        const payload = {
            driver_id: parseInt(driverId, 10),
            notes: `[ĐỔI TÀI XẾ] ${reason}`
        };
        if (vehId && vehId !== 'null' && vehId !== '') {
            payload.vehicle_id = parseInt(vehId, 10);
        }

        const res = await fetchWithAuth(`/api/trips/${trip.id}/`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
            closeReassignDriverModal();
            showToast('success', `Đã phân công lại chuyến ${trip.id} cho tài xế mới!`, 'Phân Xe Thành Công');
            await viewTripDetail(trip.id);
            if (typeof loadTripsData === 'function') loadTripsData();

            // Tự động mở Zalo cho bác tài mới
            const newTrip = window.currentTripDetail;
            if (newTrip && newTrip.driver_phone) {
                const cleanPhone = String(newTrip.driver_phone).replace(/\D/g, '');
                const msg = buildDriverZaloMessage(newTrip);
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(msg).catch(() => {});
                }
                showToast('success', `Đã sao chép Lệnh điều xe & Mở Zalo tài xế mới (${cleanPhone}). Hãy dán (Ctrl+V) để gửi!`, 'Mở Zalo Tài Xế Mới');
                window.open(`https://zalo.me/${cleanPhone}`, '_blank');
            }
        } else {
            showToast('danger', data.message || data.error || 'Lỗi khi phân lại tài xế');
        }
    } catch (err) {
        console.error('Error reassigning driver:', err);
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}
window.submitReassignDriver = submitReassignDriver;

// =========================================================================
// PHÂN HỆ HIỆU CHỈNH LỆNH ĐIỀU ĐỘNG & HỦY CHUYẾN XE (TRIP CRUD)
// =========================================================================
async function openModalEditTrip(tripCode = null) {
    const code = tripCode || (window.currentTripDetail ? window.currentTripDetail.id : null);
    if (!code) {
        showToast('warning', 'Vui lòng chọn chuyến xe cần hiệu chỉnh!');
        return;
    }

    // Tải master data options nếu chưa có
    if (typeof loadMasterDataFormOptions === 'function') {
        await loadMasterDataFormOptions();
    }
    if (typeof populateMasterDataDropdowns === 'function') {
        populateMasterDataDropdowns();
    }

    // Đổ danh sách Khách hàng, Bác tài, Đầu kéo, Rơ-mooc vào Form Edit nếu có cache
    if (typeof masterDataFormOptionsCache !== 'undefined' && masterDataFormOptionsCache) {
        const { customers, drivers, vehicles, trailers } = masterDataFormOptionsCache;
        
        const custSel = document.getElementById('edit-inp-customer');
        if (custSel && Array.isArray(customers)) {
            const curVal = custSel.value;
            custSel.innerHTML = '<option value="">-- Chọn Khách Hàng --</option>' +
                customers.map(c => `<option value="${c.id}">${escapeHtml(c.label || c.name)}</option>`).join('');
            if (curVal) custSel.value = curVal;
        }

        const drvSel = document.getElementById('edit-inp-driver');
        if (drvSel && Array.isArray(drivers)) {
            const curVal = drvSel.value;
            drvSel.innerHTML = '<option value="">-- Chọn Bác Tài --</option>' +
                drivers.map(d => `<option value="${d.id}">${escapeHtml(d.label || d.nickname || d.full_name)}</option>`).join('');
            if (curVal) drvSel.value = curVal;
        }

        const vehSel = document.getElementById('edit-inp-vehicle');
        if (vehSel && Array.isArray(vehicles)) {
            const curVal = vehSel.value;
            vehSel.innerHTML = '<option value="">-- Chọn Đầu Kéo --</option>' +
                vehicles.map(v => `<option value="${v.id}">${escapeHtml(v.label || v.plate)}</option>`).join('');
            if (curVal) vehSel.value = curVal;
        }

        const trlSel = document.getElementById('edit-inp-trailer');
        if (trlSel && Array.isArray(trailers)) {
            const curVal = trlSel.value;
            trlSel.innerHTML = '<option value="">-- Chọn Rơ-Moóc --</option>' +
                trailers.map(t => `<option value="${t.id}">${escapeHtml(t.label || t.plate)}</option>`).join('');
            if (curVal) trlSel.value = curVal;
        }
    }

    // Lấy thông tin chuyến xe
    let trip = window.currentTripDetail;
    if (!trip || trip.id !== code) {
        try {
            const res = await fetchWithAuth(`/api/trips/${code}/`);
            if (res.ok) {
                trip = await res.json();
                window.currentTripDetail = trip;
            }
        } catch (e) {
            console.error('Error fetching trip detail for edit:', e);
        }
    }

    if (!trip) {
        showToast('danger', 'Không tìm thấy dữ liệu chuyến xe');
        return;
    }

    // Gán dữ liệu lên form Edit
    const codeEl = document.getElementById('edit-modal-trip-code');
    if (codeEl) codeEl.innerText = trip.id || trip.trip_code;

    // Customer
    const custSel = document.getElementById('edit-inp-customer');
    if (custSel) {
        if (trip.customer_id) {
            custSel.value = trip.customer_id;
        } else if (trip.customer) {
            for (let i = 0; i < custSel.options.length; i++) {
                if (custSel.options[i].text.toLowerCase().includes(trip.customer.toLowerCase())) {
                    custSel.selectedIndex = i;
                    break;
                }
            }
        }
    }

    // Type & Container type
    const typeSel = document.getElementById('edit-inp-type');
    if (typeSel) typeSel.value = trip.type || 'Nhập';
    const contTypeSel = document.getElementById('edit-inp-cont-type');
    if (contTypeSel) contTypeSel.value = trip.container_type || '40HC';

    // Container, Seal, Booking, VGM
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = (val && val !== '-') ? val : '';
    };

    setVal('edit-inp-booking', trip.booking);
    setVal('edit-inp-cont', trip.container);
    setVal('edit-inp-seal', trip.seal);
    setVal('edit-inp-vgm', trip.vgm_weight);

    // 3 Điểm
    setVal('edit-inp-pickup', trip.pickup);
    setVal('edit-inp-warehouse', trip.warehouse);
    setVal('edit-inp-dropoff', trip.dropoff);

    // Lịch đóng hàng
    setVal('edit-inp-loading-date', trip.raw_loading_date || trip.loading_date_raw || (trip.loading_date && trip.loading_date.match(/^\d{4}-\d{2}-\d{2}$/) ? trip.loading_date : ''));
    setVal('edit-inp-loading-time', trip.loading_time);
    setVal('edit-inp-dock', trip.warehouse_dock);

    // Driver, Vehicle, Trailer
    const drvSel = document.getElementById('edit-inp-driver');
    if (drvSel) {
        if (trip.driver_id) drvSel.value = trip.driver_id;
        else if (trip.driver) {
            for (let i = 0; i < drvSel.options.length; i++) {
                if (drvSel.options[i].text.toLowerCase().includes(trip.driver.toLowerCase())) {
                    drvSel.selectedIndex = i;
                    break;
                }
            }
        }
    }

    const vehSel = document.getElementById('edit-inp-vehicle');
    if (vehSel) {
        if (trip.vehicle_id) vehSel.value = trip.vehicle_id;
        else if (trip.vehicle) {
            for (let i = 0; i < vehSel.options.length; i++) {
                if (vehSel.options[i].text.toLowerCase().includes(trip.vehicle.toLowerCase())) {
                    vehSel.selectedIndex = i;
                    break;
                }
            }
        }
    }

    const trlSel = document.getElementById('edit-inp-trailer');
    if (trlSel && trip.trailer_id) trlSel.value = trip.trailer_id;

    // Phụ & Ghi chú
    setVal('edit-inp-invoice', trip.commercial_invoice);
    setVal('edit-inp-free-det', trip.det_free_days || 3);
    const locTypeSel = document.getElementById('edit-inp-location-type');
    if (locTypeSel) locTypeSel.value = trip.cont_location_type || 'BÃI TVL';
    setVal('edit-inp-notes', trip.cargo_notes);

    // Mở modal
    const modal = document.getElementById('modal-edit-trip');
    if (modal) {
        modal.classList.remove('hidden-view');
        modal.classList.remove('hidden');
    }
}
window.openModalEditTrip = openModalEditTrip;

async function submitEditTripForm() {
    const trip = window.currentTripDetail;
    if (!trip) {
        showToast('danger', 'Không tìm thấy thông tin chuyến xe để cập nhật');
        return;
    }

    const btnSave = document.getElementById('btn-save-edit-trip');
    if (btnSave) {
        btnSave.disabled = true;
        btnSave.innerHTML = '<i class="ph ph-spinner-gap animate-spin mr-1"></i> Đang lưu...';
    }

    const payload = {
        customer_id: document.getElementById('edit-inp-customer')?.value || null,
        transport_type: document.getElementById('edit-inp-type')?.value || 'Nhập',
        container_type: document.getElementById('edit-inp-cont-type')?.value || '40HC',
        booking_number: document.getElementById('edit-inp-booking')?.value?.trim() || '',
        container_number: document.getElementById('edit-inp-cont')?.value?.trim() || '',
        seal_number: document.getElementById('edit-inp-seal')?.value?.trim() || '',
        vgm_weight: document.getElementById('edit-inp-vgm')?.value?.trim() || '',
        pickup_location: document.getElementById('edit-inp-pickup')?.value?.trim() || '',
        warehouse_location: document.getElementById('edit-inp-warehouse')?.value?.trim() || '',
        dropoff_location: document.getElementById('edit-inp-dropoff')?.value?.trim() || '',
        loading_date: document.getElementById('edit-inp-loading-date')?.value || null,
        loading_time: document.getElementById('edit-inp-loading-time')?.value?.trim() || '',
        warehouse_dock: document.getElementById('edit-inp-dock')?.value?.trim() || '',
        driver_id: document.getElementById('edit-inp-driver')?.value || null,
        vehicle_id: document.getElementById('edit-inp-vehicle')?.value || null,
        trailer_id: document.getElementById('edit-inp-trailer')?.value || null,
        commercial_invoice: document.getElementById('edit-inp-invoice')?.value?.trim() || '',
        free_det_days: document.getElementById('edit-inp-free-det')?.value || 3,
        cont_location_type: document.getElementById('edit-inp-location-type')?.value || 'BÃI TVL',
        cargo_notes: document.getElementById('edit-inp-notes')?.value?.trim() || ''
    };

    try {
        const res = await fetchWithAuth(`/api/trips/${trip.id}/`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
            closeModal('modal-edit-trip');
            showToast('success', `Đã cập nhật lệnh điều động ${trip.id} thành công!`, 'Lưu Thành Công');
            await viewTripDetail(trip.id);
            if (typeof loadTripsData === 'function') loadTripsData();
        } else {
            showToast('danger', data.error || data.message || 'Lỗi khi cập nhật chuyến xe');
        }
    } catch (err) {
        console.error('Error updating trip:', err);
        showToast('danger', 'Lỗi kết nối máy chủ');
    } finally {
        if (btnSave) {
            btnSave.disabled = false;
            btnSave.innerHTML = '<i class="ph-bold ph-floppy-disk text-sm"></i> Lưu Thay Đổi';
        }
    }
}
window.submitEditTripForm = submitEditTripForm;

async function deleteOrCancelTrip(tripCode = null) {
    const code = tripCode || (window.currentTripDetail ? window.currentTripDetail.id : null);
    if (!code) {
        showToast('warning', 'Không tìm thấy chuyến xe cần xóa');
        return;
    }

    const reason = prompt(`XÁC NHẬN HỦY / XÓA CHUYẾN XE ${code}\n\nNhập lý do hủy chuyến (để lưu vết nhật ký điều độ):`, 'Điều độ hủy hoặc dời lịch');
    if (reason === null) return; // Người dùng bấm Hủy

    try {
        const res = await fetchWithAuth(`/api/trips/${code}/`, {
            method: 'DELETE',
            body: JSON.stringify({ reason: reason.trim() || 'Điều độ viên hủy chuyến' })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            closeModal('modal-edit-trip');
            showToast('success', data.message || `Đã hủy chuyến ${code} thành công!`, 'Hủy Chuyến Thành Công');
            if (typeof backToTrips === 'function') {
                backToTrips();
            }
            if (typeof loadTripsData === 'function') {
                loadTripsData();
            }
        } else {
            showToast('danger', data.error || data.message || 'Không thể hủy chuyến xe');
        }
    } catch (err) {
        console.error('Error deleting trip:', err);
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}
window.deleteOrCancelTrip = deleteOrCancelTrip;

// Các hàm Modal Thêm Chi Phí Phát Sinh
function openModalAddExpense() {
    const modal = document.getElementById('modal-add-expense');
    if (modal) {
        populateExpenseLegOptions('expense-leg-select');
        modal.classList.remove('hidden-view');
    }
}

/**
 * Toggle switch cho ô Chi hộ KH — dùng chung cho cả Add và Edit modal.
 * @param {string} checkboxId   - id của <input type="checkbox" class="sr-only">
 * @param {string} wrapId       - id của div container (background highlight)
 * @param {string} dotId        - id của nút tròn trượt
 * @param {string} trackId      - id của dải track background
 */
function toggleBehalfCheckbox(checkboxId, wrapId, dotId, trackId) {
    const cb = document.getElementById(checkboxId);
    const wrap = document.getElementById(wrapId);
    const dot = document.getElementById(dotId);
    const track = document.getElementById(trackId);
    if (!cb) return;

    cb.checked = !cb.checked;
    const isOn = cb.checked;

    // Hiệu ứng track (background)
    if (track) {
        track.style.backgroundColor = isOn ? '#0f766e' : ''; // teal-700
        track.className = track.className.replace(/bg-\S+/, isOn ? 'bg-teal-700' : 'bg-slate-300');
    }
    // Hiệu ứng dot trượt
    if (dot) {
        dot.style.transform = isOn ? 'translateX(20px)' : 'translateX(0px)';
    }
    // Highlight vùng wrap khi bật
    if (wrap) {
        if (isOn) {
            wrap.classList.remove('bg-amber-50', 'border-amber-200');
            wrap.classList.add('bg-teal-50', 'border-teal-400', 'ring-2', 'ring-teal-300');
        } else {
            wrap.classList.remove('bg-teal-50', 'border-teal-400', 'ring-2', 'ring-teal-300');
            wrap.classList.add('bg-amber-50', 'border-amber-200');
        }
    }
}

/** Reset toggle về mặc định (OFF) */
function resetBehalfToggle(checkboxId, wrapId, dotId, trackId) {
    const cb = document.getElementById(checkboxId);
    const wrap = document.getElementById(wrapId);
    const dot = document.getElementById(dotId);
    const track = document.getElementById(trackId);
    if (cb) cb.checked = false;
    if (track) { track.style.backgroundColor = ''; track.className = track.className.replace(/bg-teal-700|bg-slate-300/, 'bg-slate-300'); }
    if (dot) dot.style.transform = 'translateX(0px)';
    if (wrap) {
        wrap.classList.remove('bg-teal-50', 'border-teal-400', 'ring-2', 'ring-teal-300');
        wrap.classList.add('bg-amber-50', 'border-amber-200');
    }
}

/** Đặt toggle sang ON (khi mở modal edit và giá trị là true) */
function setBehalfToggle(value, checkboxId, wrapId, dotId, trackId) {
    const cb = document.getElementById(checkboxId);
    if (!cb) return;
    if (cb.checked !== !!value) {
        // Chỉ gọi toggle nếu cần thay đổi trạng thái
        if (!!value) toggleBehalfCheckbox(checkboxId, wrapId, dotId, trackId);
    }
}

function closeModalAddExpense() {
    const modal = document.getElementById('modal-add-expense');
    if (modal) modal.classList.add('hidden-view');
    const form = document.getElementById('form-add-expense');
    if (form) form.reset();
    // Reset toggle về OFF
    resetBehalfToggle('expense-on-behalf-checkbox', 'expense-behalf-toggle-wrap', 'expense-behalf-toggle-dot', 'expense-behalf-toggle-track');
}

async function submitAddExpense(e) {
    e.preventDefault();
    if (!currentActiveTripCode) return;

    const category = document.getElementById('expense-category-select').value;
    const legSelect = document.getElementById('expense-leg-select');
    const selectedOption = legSelect?.options[legSelect.selectedIndex];
    const legVal = selectedOption?.value || 'ENTIRE';

    let trip_leg = 'ENTIRE';
    let driver_id = null;
    let vehicle_id = null;

    if (legVal.startsWith('DRIVER_')) {
        driver_id = parseInt(legVal.replace('DRIVER_', ''), 10);
        const dataVehId = selectedOption?.getAttribute('data-vehicle-id');
        vehicle_id = dataVehId ? parseInt(dataVehId, 10) : null;
        trip_leg = 'ENTIRE';
    } else if (legVal === 'COMPANY') {
        trip_leg = 'COMPANY';
        driver_id = null;
        vehicle_id = null;
    } else {
        trip_leg = legVal; // 'LEG_1', 'LEG_2', 'ENTIRE'
        const rawDriverId = selectedOption?.getAttribute('data-driver-id');
        const rawVehId = selectedOption?.getAttribute('data-vehicle-id');
        driver_id = rawDriverId ? parseInt(rawDriverId, 10) : null;
        vehicle_id = rawVehId ? parseInt(rawVehId, 10) : null;
    }

    const amount = parseNumberVN(document.getElementById('expense-amount-input').value) || 0;
    const invoice_number = document.getElementById('expense-inv-number').value.trim();
    const invoice_lookup_code = document.getElementById('expense-inv-lookup-code').value.trim();
    const invoice_issuer = document.getElementById('expense-inv-issuer').value.trim();
    const invoice_lookup_url = document.getElementById('expense-inv-lookup-url').value.trim();
    const notes = document.getElementById('expense-notes-input').value.trim();
    const is_on_behalf_of_customer = document.getElementById('expense-on-behalf-checkbox')?.checked || false;

    const payload = {
        category,
        trip_leg,
        amount,
        invoice_number,
        invoice_lookup_code,
        invoice_issuer,
        invoice_lookup_url,
        notes,
        is_on_behalf_of_customer
    };
    if (driver_id) payload.driver_id = driver_id;
    if (vehicle_id) payload.vehicle_id = vehicle_id;

    try {
        const res = await fetchWithAuth(`/api/trips/${currentActiveTripCode}/expenses/`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok && data.success) {
            closeModalAddExpense();
            const chiHoLabel = is_on_behalf_of_customer ? ' [Chi hộ KH]' : '';
            showToast('success', data.message + chiHoLabel, 'Ghi nhận chi phí thành công');
            viewTripDetail(currentActiveTripCode);
        } else {
            showToast('danger', data.message || data.error || data.detail || 'Có lỗi xảy ra');
        }
    } catch (err) {
        console.error('Error adding expense:', err);
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

// --- CÁC HÀM HIỆU CHỈNH & XÓA KHOẢN CHI PHÍ (KHI CHƯA KHÓA SỔ) ---
function openModalEditExpense(exp) {
    const modal = document.getElementById('modal-edit-expense');
    if (!modal) return;
    
    document.getElementById('edit-expense-id').value = exp.id;
    document.getElementById('edit-expense-category-select').value = exp.category_code;
    
    const t = currentActiveTripData;
    let selectedLeg = exp.trip_leg || 'ENTIRE';
    if (exp.driver_id) {
        if (t && exp.driver_id === t.driver_id) {
            selectedLeg = t.is_split_trip ? (exp.trip_leg || 'LEG_1') : 'ENTIRE';
        } else if (t && t.is_split_trip && exp.driver_id === t.dropoff_driver_id) {
            selectedLeg = 'LEG_2';
        } else {
            selectedLeg = `DRIVER_${exp.driver_id}`;
        }
    }
    populateExpenseLegOptions('edit-expense-leg-select', selectedLeg);
    
    document.getElementById('edit-expense-amount-input').value = formatNumberVN(exp.amount);
    document.getElementById('edit-expense-inv-number').value = exp.invoice_number || '';
    document.getElementById('edit-expense-inv-lookup-code').value = exp.invoice_lookup_code || '';
    document.getElementById('edit-expense-inv-issuer').value = exp.invoice_issuer || '';
    document.getElementById('edit-expense-inv-lookup-url').value = exp.invoice_lookup_url || '';
    document.getElementById('edit-expense-notes-input').value = exp.notes || '';

    // Đồng bộ toggle Chi hộ KH với giá trị hiện tại của expense
    resetBehalfToggle('edit-expense-on-behalf-checkbox', 'edit-expense-behalf-toggle-wrap', 'edit-expense-behalf-toggle-dot', 'edit-expense-behalf-toggle-track');
    if (exp.is_on_behalf_of_customer) {
        toggleBehalfCheckbox('edit-expense-on-behalf-checkbox', 'edit-expense-behalf-toggle-wrap', 'edit-expense-behalf-toggle-dot', 'edit-expense-behalf-toggle-track');
    }

    initAllNumberInputs();
    modal.classList.remove('hidden-view');
}

function closeModalEditExpense() {
    const modal = document.getElementById('modal-edit-expense');
    if (modal) modal.classList.add('hidden-view');
    const form = document.getElementById('form-edit-expense');
    if (form) form.reset();
    // Reset toggle về OFF
    resetBehalfToggle('edit-expense-on-behalf-checkbox', 'edit-expense-behalf-toggle-wrap', 'edit-expense-behalf-toggle-dot', 'edit-expense-behalf-toggle-track');
}

function editExpensePrompt(expenseId) {
    if (!currentActiveTripData || !currentActiveTripData.expenses) return;
    const exp = currentActiveTripData.expenses.find(e => e.id === expenseId);
    if (!exp) {
        showToast('warning', 'Không tìm thấy thông tin khoản chi.');
        return;
    }
    if (currentActiveTripData.is_expenses_settled || !exp.can_edit) {
        showToast('warning', 'Chuyến xe đã được Kế toán chốt sổ, không thể chỉnh sửa chi phí này.', 'Bảng kê đã khóa');
        return;
    }
    openModalEditExpense(exp);
}

async function submitEditExpense(e) {
    e.preventDefault();
    if (!currentActiveTripCode) return;

    const expenseId = document.getElementById('edit-expense-id').value;
    const category = document.getElementById('edit-expense-category-select').value;
    const legSelect = document.getElementById('edit-expense-leg-select');
    const selectedOption = legSelect?.options[legSelect.selectedIndex];
    const legVal = selectedOption?.value || 'ENTIRE';

    let trip_leg = 'ENTIRE';
    let driver_id = null;
    let vehicle_id = null;

    if (legVal.startsWith('DRIVER_')) {
        driver_id = parseInt(legVal.replace('DRIVER_', ''), 10);
        const dataVehId = selectedOption?.getAttribute('data-vehicle-id');
        vehicle_id = dataVehId ? parseInt(dataVehId, 10) : null;
        trip_leg = 'ENTIRE';
    } else if (legVal === 'COMPANY') {
        trip_leg = 'COMPANY';
        driver_id = null;
        vehicle_id = null;
    } else {
        trip_leg = legVal; // 'LEG_1', 'LEG_2', 'ENTIRE'
        const rawDriverId = selectedOption?.getAttribute('data-driver-id');
        const rawVehId = selectedOption?.getAttribute('data-vehicle-id');
        driver_id = rawDriverId ? parseInt(rawDriverId, 10) : null;
        vehicle_id = rawVehId ? parseInt(rawVehId, 10) : null;
    }

    const amount = parseNumberVN(document.getElementById('edit-expense-amount-input').value) || 0;
    const invoice_number = document.getElementById('edit-expense-inv-number').value.trim();
    const invoice_lookup_code = document.getElementById('edit-expense-inv-lookup-code').value.trim();
    const invoice_issuer = document.getElementById('edit-expense-inv-issuer').value.trim();
    const invoice_lookup_url = document.getElementById('edit-expense-inv-lookup-url').value.trim();
    const notes = document.getElementById('edit-expense-notes-input').value.trim();
    const is_on_behalf_of_customer = document.getElementById('edit-expense-on-behalf-checkbox')?.checked || false;

    const payload = {
        category,
        trip_leg,
        amount,
        invoice_number,
        invoice_lookup_code,
        invoice_issuer,
        invoice_lookup_url,
        notes,
        is_on_behalf_of_customer,
        driver_id,
        vehicle_id
    };

    try {
        const res = await fetchWithAuth(`/api/trips/${currentActiveTripCode}/expenses/${expenseId}/`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok && data.success) {
            closeModalEditExpense();
            showToast('success', data.message, 'Cập nhật thành công');
            viewTripDetail(currentActiveTripCode);
        } else {
            showToast('danger', data.message || data.error || data.detail || 'Không thể cập nhật khoản chi phí');
        }
    } catch (err) {
        console.error('Error updating expense:', err);
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

async function deleteExpensePrompt(expenseId, categoryName) {
    if (!currentActiveTripData) return;
    if (currentActiveTripData.is_expenses_settled) {
        showToast('warning', 'Chuyến xe đã được Kế toán chốt sổ, không thể xóa chi phí.', 'Bảng kê đã khóa');
        return;
    }

    const confirmDelete = await showConfirmModal({
        title: 'Xóa Khoản Chi Phí',
        message: `Bạn có chắc chắn muốn xóa khoản chi "${categoryName}" này khỏi bảng kê chuyến xe?\n\nThao tác sẽ được lưu vết kiểm toán (Soft-Delete).`,
        confirmText: 'Xác Nhận Xóa',
        cancelText: 'Huỷ bỏ',
        type: 'danger',
        icon: 'ph-bold ph-trash text-2xl'
    });
    if (!confirmDelete) return;

    try {
        const res = await fetchWithAuth(`/api/trips/${currentActiveTripCode}/expenses/${expenseId}/`, {
            method: 'DELETE'
        });

        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message, 'Đã xóa chi phí');
            viewTripDetail(currentActiveTripCode);
        } else {
            showToast('danger', data.message || data.error || data.detail || 'Không thể xóa khoản chi phí');
        }
    } catch (err) {
        console.error('Error deleting expense:', err);
        showToast('danger', 'Lỗi kết nối máy chủ khi xóa');
    }
}

// --- CÁC HÀM KHÓA SỔ & MỞ SỔ KẾ TOÁN (SETTLEMENT LIFECYCLE) ---
async function settleTripExpenses() {
    if (!currentActiveTripCode) return;
    
    const confirmSettle = await showConfirmModal({
        title: 'Chốt Sổ Kế Toán Chuyến Xe',
        message: `Xác nhận CHỐT SỔ KẾ TOÁN cho chuyến xe [${currentActiveTripCode}]?\n\n• Toàn bộ chi phí thực tế sẽ chuyển sang trạng thái "ĐÃ CHỐT SỔ" (SETTLED).\n• Bảng kê sẽ bị khóa cứng (Read-only), ngăn chặn sửa đổi/xóa.\n• Số liệu được khóa để đối soát P&L và xuất hóa đơn.`,
        confirmText: 'Chốt Khóa Sổ',
        cancelText: 'Huỷ bỏ',
        type: 'success',
        icon: 'ph-bold ph-seal-check text-2xl'
    });
    if (!confirmSettle) return;

    try {
        const res = await fetchWithAuth(`/api/trips/${currentActiveTripCode}/settle-expenses/`, {
            method: 'POST'
        });

        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message, 'Khóa Sổ Kế Toán Thành Công');
            viewTripDetail(currentActiveTripCode);
        } else {
            showToast('danger', data.message || data.error || data.detail || 'Có lỗi khi chốt sổ');
        }
    } catch (err) {
        console.error('Error settling expenses:', err);
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

async function unsettleTripExpenses() {
    if (!currentActiveTripCode) return;
    
    const confirmUnsettle = await showConfirmModal({
        title: 'Mở Khóa Sổ Kế Toán',
        message: `MỞ KHÓA SỔ KẾ TOÁN CHO CHUYẾN XE [${currentActiveTripCode}]?\n\nLưu ý: Chỉ thực hiện khi cần điều chỉnh số liệu phát sinh sai sót hoặc bổ sung hóa đơn hợp lệ.`,
        confirmText: 'Mở Khóa Sổ',
        cancelText: 'Huỷ bỏ',
        type: 'warning',
        icon: 'ph-bold ph-lock-open text-2xl'
    });
    if (!confirmUnsettle) return;

    try {
        const res = await fetchWithAuth(`/api/trips/${currentActiveTripCode}/unsettle-expenses/`, {
            method: 'POST'
        });

        const data = await res.json();
        if (res.ok && data.success) {
            showToast('warning', data.message, 'Đã Mở Khóa Sổ Kế Toán');
            viewTripDetail(currentActiveTripCode);
        } else {
            showToast('danger', data.message || data.error || data.detail || 'Không thể mở khóa');
        }
    } catch (err) {
        console.error('Error unsettling expenses:', err);
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

// --- THAO TÁC CỦA TÀI XẾ TRÊN MOBILE SIMULATOR ---
function driverEditExpense(expenseId) {
    if (!currentActiveTripData || !currentActiveTripData.expenses) return;
    const exp = currentActiveTripData.expenses.find(e => e.id === expenseId);
    if (!exp) return;

    if (exp.status !== 'PENDING') {
        showToast('warning', 'Khoản chi đã được Điều độ / Kế toán duyệt, không thể tự sửa. Vui lòng gọi Điều độ viên.', 'Không thể sửa');
        return;
    }
    openModalEditExpense(exp);
}

async function driverDeleteExpense(expenseId) {
    if (!currentActiveTripData || !currentActiveTripData.expenses) return;
    const exp = currentActiveTripData.expenses.find(e => e.id === expenseId);
    if (!exp) return;

    if (exp.status !== 'PENDING') {
        showToast('warning', 'Khoản chi đã được duyệt, tài xế không thể tự xóa.', 'Đã duyệt');
        return;
    }

    const ok = await showConfirmModal({
        title: 'Hủy Khoản Chi Nhập Nhầm',
        message: `Tài xế xác nhận muốn xóa khoản chi: "${exp.category_name}" (${new Intl.NumberFormat('vi-VN').format(exp.amount)} đ) do nhập nhầm?`,
        confirmText: 'Xóa Khoản Chi',
        cancelText: 'Huỷ bỏ',
        type: 'danger',
        icon: 'ph-bold ph-trash text-2xl'
    });
    if (!ok) return;

    try {
        const res = await fetchWithAuth(`/api/trips/${currentActiveTripCode}/expenses/${expenseId}/`, {
            method: 'DELETE'
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', 'Đã hủy khoản chi nhập nhầm', 'Tài xế xóa thành công');
            viewTripDetail(currentActiveTripCode);
        } else {
            showToast('danger', data.message || data.error || data.detail || 'Không thể xóa');
        }
    } catch (err) {
        console.error('Error driver deleting expense:', err);
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

// Dynamic quick milestones renderer with strict state machine and mistake rollback logic
function renderSimQuickMilestones(tripStatus, isOvernight) {
    const grid = document.getElementById('sim-quick-milestones-grid');
    if (!grid) return;

    if (tripStatus === 'COMPLETED') {
        grid.innerHTML = `
            <div class="col-span-2 p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-center space-y-1">
                <div class="text-[11px] font-black text-slate-700 flex items-center justify-center gap-1.5 font-heading">
                    <i class="ph-bold ph-lock-key text-teal-700"></i>
                    <span>Chuyến xe đã hoàn tất (Đã khóa)</span>
                </div>
                <p class="text-[9.5px] text-slate-500">Mọi mốc tiến độ đã hoàn thành và được chốt cố định.</p>
            </div>
        `;
        return;
    }

    // Step order mapping (0: DISPATCHED, 1: ACCEPTED, 2: CONTAINER_PICKED, 3: IN_TRANSIT, 4: AT_WAREHOUSE, 5: UNLOADING, 6: DELIVERED, 7: RETURNING_EMPTY, 8: COMPLETED)
    const stepOrder = {
        'DRAFT': 0, 'DISPATCHED': 0,
        'ACCEPTED': 1,
        'CONTAINER_PICKED': 2,
        'IN_TRANSIT': 3,
        'AT_WAREHOUSE': 4,
        'UNLOADING': 5,
        'DELIVERED': 6,
        'RETURNING_EMPTY': 7,
        'COMPLETED': 8
    };

    const currentStep = stepOrder[tripStatus] !== undefined ? stepOrder[tripStatus] : 0;

    const quickBtns = [
        {
            code: 'APPROACHING_WAREHOUSE',
            title: 'Sắp đến kho',
            desc: 'Báo trước 30p',
            icon: 'ph-bell-ringing',
            targetStep: 3,
            color: 'teal'
        },
        {
            code: 'ARRIVED_WAREHOUSE',
            title: 'Đến cổng kho',
            desc: 'Check-in kho',
            icon: 'ph-map-pin',
            targetStep: 4,
            color: 'blue'
        },
        {
            code: 'START_UNLOADING',
            title: 'Đang dỡ/đóng',
            desc: 'Bắt đầu hàng',
            icon: 'ph-package',
            targetStep: 5,
            color: 'amber'
        },
        {
            code: 'FINISHED_UNLOADING',
            title: 'Đóng xong',
            desc: 'Chuẩn bị hạ',
            icon: 'ph-check-circle',
            targetStep: 6,
            color: 'emerald'
        },
        {
            code: 'OVERNIGHT_WAIT',
            title: 'Chờ sau 0h',
            desc: isOvernight ? 'Đã báo lưu xe' : 'Kho yêu cầu',
            icon: 'ph-moon',
            targetStep: null,
            color: 'amber'
        },
        {
            code: 'DROPOFF_COMPLETED',
            title: 'Đã hạ cont',
            desc: 'Phiếu EIR',
            icon: 'ph-anchor',
            targetStep: 8,
            color: 'teal'
        }
    ];

    let html = '';
    quickBtns.forEach(btn => {
        let isEnabled = false;
        let btnBadge = '';
        let btnStyle = '';

        if (btn.code === 'OVERNIGHT_WAIT') {
            if (currentStep >= 4 && currentStep <= 7 && !isOvernight) {
                isEnabled = true;
                btnBadge = 'Sau 0h';
                btnStyle = 'bg-amber-50/90 hover:bg-amber-100 border-amber-300 text-amber-900 active:scale-95 cursor-pointer';
            } else if (isOvernight) {
                isEnabled = false;
                btnBadge = '✓ Đã báo';
                btnStyle = 'bg-amber-100/70 border-amber-300 text-amber-900 opacity-60 cursor-not-allowed';
            } else {
                isEnabled = false;
                btnBadge = 'Chưa đến';
                btnStyle = 'bg-slate-50 border-slate-200 text-slate-400 opacity-35 cursor-not-allowed';
            }
        } else {
            const target = btn.targetStep;
            const isNext = (target === currentStep + 1) || (currentStep === 2 && target === 4);
            const isPrev1 = (target === currentStep - 1) || (currentStep === 4 && target === 3) || (currentStep === 7 && target === 6);
            const isPast = target < currentStep && !isPrev1;

            if (isNext) {
                isEnabled = true;
                btnBadge = 'Tiếp theo';
                btnStyle = `bg-${btn.color}-50 hover:bg-${btn.color}-100 border-${btn.color}-500 text-${btn.color}-950 ring-2 ring-${btn.color}-200/60 font-bold active:scale-95 cursor-pointer shadow-2xs`;
            } else if (isPrev1) {
                isEnabled = true;
                btnBadge = '↩ Sửa lại nếu nhầm';
                btnStyle = 'bg-amber-50/80 hover:bg-amber-100 border-amber-300 text-amber-900 font-bold active:scale-95 cursor-pointer';
            } else if (isPast || target === currentStep) {
                isEnabled = false;
                btnBadge = '✓ Đã qua';
                btnStyle = 'bg-slate-100/80 border-slate-200 text-slate-400 opacity-45 cursor-not-allowed';
            } else {
                isEnabled = false;
                btnBadge = 'Chưa đến';
                btnStyle = 'bg-slate-50 border-slate-200 text-slate-400 opacity-35 cursor-not-allowed';
            }
        }

        const disabledAttr = isEnabled ? '' : 'disabled';
        const clickHandler = isEnabled ? `onclick="driverReportMilestone('${btn.code}')"` : '';

        html += `
            <button type="button" ${disabledAttr} ${clickHandler}
                class="p-1.5 rounded-lg border text-left transition-all ${btnStyle}">
                <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold flex items-center gap-1">
                        <i class="ph-bold ${btn.icon}"></i> ${btn.title}
                    </span>
                    <span class="text-[8px] font-semibold px-1 py-0.2 rounded ${isEnabled ? 'bg-white/80 border border-slate-200 text-slate-800' : 'text-slate-400'}">${btnBadge}</span>
                </div>
                <span class="text-[8.5px] opacity-75 block mt-0.5">${btn.desc}</span>
            </button>
        `;
    });

    grid.innerHTML = html;
}

// Tài xế báo nhanh mốc thời gian kho 1 chạm (Bước 6 SOP)
async function driverReportMilestone(milestoneCode) {
    if (!currentActiveTripCode) return;
    if (currentActiveTripData && currentActiveTripData.status === 'COMPLETED') {
        showToast('warning', 'Chuyến xe đã hoàn tất! Toàn bộ mốc thời gian đã được chốt và khóa cố định.');
        return;
    }

    try {
        const res = await fetchWithAuth(`/api/trips/${currentActiveTripCode}/milestones/`, {
            method: 'POST',
            body: JSON.stringify({ milestone: milestoneCode })
        });

        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message, 'Cập nhật tiến độ');
            await viewTripDetail(currentActiveTripCode);
            if (typeof loadTripsData === 'function') {
                loadTripsData();
            }
        } else {
            showToast('danger', data.message || data.error || data.detail || 'Không thể cập nhật mốc');
        }
    } catch (err) {
        console.error('Error reporting milestone:', err);
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

// --- CÁC HÀM ĐIỀU KHIỂN GIAO DIỆN SIMULATOR TÀI XẾ ---
function openSimRouteDetailsModal() {
    const modal = document.getElementById('modal-sim-route-details');
    if (modal) modal.classList.remove('hidden-view');
}

function closeSimRouteDetailsModal() {
    const modal = document.getElementById('modal-sim-route-details');
    if (modal) modal.classList.add('hidden-view');
}

function toggleSimTimelineAccordion() {
    const body = document.getElementById('sim-timeline-body');
    const caret = document.getElementById('sim-timeline-caret');
    if (!body) return;
    body.classList.toggle('hidden');
    if (caret) {
        caret.classList.toggle('rotate-180');
    }
}

function toggleSimExpenseAccordion() {
    const body = document.getElementById('sim-expense-body');
    const caret = document.getElementById('sim-expense-caret');
    if (!body) return;
    body.classList.toggle('hidden');
    if (caret) {
        caret.classList.toggle('rotate-180');
    }
}

function openSimTripDetailsModal() {
    if (!currentActiveTripData) return;
    const t = currentActiveTripData;
    const formatMoney = (n) => new Intl.NumberFormat('vi-VN').format(n || 0) + ' đ';

    const modal = document.getElementById('modal-sim-trip-details');
    if (!modal) return;

    const setT = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = (val !== undefined && val !== null && val !== '') ? val : '-';
    };

    setT('sim-modal-trip-code', `Lệnh: ${t.id || 'TVL-XXX'}`);
    setT('sim-modal-cont-type', t.container_type || '40HC');
    setT('sim-modal-cont-no', t.container || 'Chưa gán');
    setT('sim-modal-seal-no', t.seal || '-');
    setT('sim-modal-booking', t.booking_or_bill || t.booking || '-');
    setT('sim-modal-shipping-line', t.shipping_line || '-');
    setT('sim-modal-customer', t.customer || '-');
    setT('sim-modal-dock', t.warehouse_dock || 'Chưa gán');
    setT('sim-modal-det', t.det_free_days ? `${t.det_free_days} ngày` : (t.dem_det_countdown || '-'));
    setT('sim-modal-customs', t.customs_declaration || 'Chưa có');
    setT('sim-modal-advance', formatMoney(t.driver_advance_amount || 0));

    modal.classList.remove('hidden-view');
}

function closeSimTripDetailsModal() {
    const modal = document.getElementById('modal-sim-trip-details');
    if (modal) modal.classList.add('hidden-view');
}

function openSimIncidentModal() {
    const modal = document.getElementById('modal-sim-incident');
    if (modal) modal.classList.remove('hidden-view');
}

function closeSimIncidentModal() {
    const modal = document.getElementById('modal-sim-incident');
    if (modal) modal.classList.add('hidden-view');
}

async function submitSimIncident(e) {
    e.preventDefault();
    if (!currentActiveTripCode) return;

    const incType = document.getElementById('sim-inc-type')?.value;
    const incDesc = document.getElementById('sim-inc-desc')?.value;

    try {
        const res = await fetchWithAuth(`/api/trips/${currentActiveTripCode}/milestones/`, {
            method: 'POST',
            body: JSON.stringify({
                milestone: 'INCIDENT_REPORTED',
                notes: `[SỰ CỐ: ${incType}] ${incDesc}`
            })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            closeSimIncidentModal();
            showToast('warning', 'Đã ghi nhận cảnh báo sự cố khẩn cấp và gửi thông báo tới Điều Độ!', 'Báo Sự Cố Thành Công');
            await viewTripDetail(currentActiveTripCode);
            if (typeof loadTripsData === 'function') {
                loadTripsData();
            }
        } else {
            showToast('danger', data.message || data.error || 'Không thể gửi báo cáo sự cố');
        }
    } catch (err) {
        console.error('Error submitting incident:', err);
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

function openSimContactModal(type) {
    if (type === 'consignee') {
        const cName = currentActiveTripData?.customer || 'Thủ kho / Người nhận';
        alert(`LIÊN HỆ GIAO NHẬN HÀNG:\n\n• Người nhận / Khách hàng: ${cName}\n• Hotline: 0908.123.456\n• Điểm đến: ${currentActiveTripData?.warehouse_location || currentActiveTripData?.warehouse || 'Kho nhận hàng'}`);
    } else {
        const dispName = currentActiveTripData?.dispatcher || 'Điều độ trực';
        alert(`HOTLINE ĐIỀU ĐỘ PHỤ TRÁCH:\n\n• Điều độ: ${dispName} (0908.123.456 - Trực 24/7)\n• Mã chuyến xe: ${currentActiveTripCode || 'TVL-XXX'}`);
    }
}

function backToTrips() {
    document.getElementById('view-trip-detail').classList.add('hidden-view');
    if (previousActiveTab && previousActiveTab !== 'trip-detail') {
        switchTab(previousActiveTab, true);
    } else {
        switchTab('dieu-van', true);
    }
}

// --- XỬ LÝ ĐÍNH KÈM FILE BOOKING / LỆNH CẤP RỖNG (TRIP DISPATCH & SALE) ---
let currentInheritedBookingFile = null;
let tripBookingFilesList = [];
let saleBookingFilesList = [];
let saleBookingExistingDocs = [];
let currentEditingBookingId = null;

function setBookingTime(timeStr) {
    const el = document.getElementById('booking-loading-time');
    if (el) {
        el.value = timeStr;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

function syncBookingClosingTime() {
    const d = document.getElementById('booking-closing-date')?.value;
    const t = document.getElementById('booking-closing-time-val')?.value || '17:00';
    const hidden = document.getElementById('booking-closing-time');
    if (hidden) {
        hidden.value = d ? `${d} ${t}` : '';
    }
}

function setBookingClosingTime(timeStr) {
    const el = document.getElementById('booking-closing-time-val');
    if (el) el.value = timeStr;
    syncBookingClosingTime();
}

function syncBookingSiTime() {
    const d = document.getElementById('booking-si-date')?.value;
    const t = document.getElementById('booking-si-time-val')?.value || '12:00';
    const hidden = document.getElementById('booking-si-cutoff');
    if (hidden) {
        hidden.value = d ? `${d} ${t}` : '';
    }
}

function setBookingSiTime(timeStr) {
    const el = document.getElementById('booking-si-time-val');
    if (el) el.value = timeStr;
    syncBookingSiTime();
}

function syncTripCutoff() {
    const d = document.getElementById('inp-cutoff-date')?.value;
    const t = document.getElementById('inp-cutoff-time')?.value || '17:00';
    const hidden = document.getElementById('inp-cutoff');
    if (hidden) {
        hidden.value = d ? `${d} ${t}` : '';
    }
}

function setTripCutoffTime(timeStr) {
    const el = document.getElementById('inp-cutoff-time');
    if (el) el.value = timeStr;
    syncTripCutoff();
}

function parseAndSetDateTimeFields(rawStr, dateInputId, timeInputId, hiddenInputId, defaultTime = '17:00') {
    const dateEl = document.getElementById(dateInputId);
    const timeEl = document.getElementById(timeInputId);
    const hiddenEl = document.getElementById(hiddenInputId);
    if (!rawStr || typeof rawStr !== 'string') {
        if (dateEl) dateEl.value = '';
        if (timeEl) timeEl.value = defaultTime;
        if (hiddenEl) hiddenEl.value = '';
        return;
    }
    const val = rawStr.trim();
    if (hiddenEl) hiddenEl.value = val;

    let foundDate = '';
    let foundTime = defaultTime;

    // Check ISO date YYYY-MM-DD
    const isoDateMatch = val.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (isoDateMatch) {
        foundDate = isoDateMatch[1];
    } else {
        // Check VN date DD/MM/YYYY or DD/MM
        const vnDateMatch = val.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/);
        if (vnDateMatch) {
            const day = String(vnDateMatch[1]).padStart(2, '0');
            const month = String(vnDateMatch[2]).padStart(2, '0');
            const year = vnDateMatch[3] ? vnDateMatch[3] : new Date().getFullYear();
            foundDate = `${year}-${month}-${day}`;
        }
    }

    // Check Time HH:MM or HHhMM or HHh
    const timeMatch = val.match(/\b(\d{1,2}):(\d{2})\b/);
    if (timeMatch) {
        const hh = String(timeMatch[1]).padStart(2, '0');
        const mm = String(timeMatch[2]).padStart(2, '0');
        foundTime = `${hh}:${mm}`;
    } else {
        const hourOnlyMatch = val.match(/\b(\d{1,2})h(?:(\d{2}))?\b/i);
        if (hourOnlyMatch) {
            const hh = String(hourOnlyMatch[1]).padStart(2, '0');
            const mm = hourOnlyMatch[2] ? String(hourOnlyMatch[2]).padStart(2, '0') : '00';
            foundTime = `${hh}:${mm}`;
        }
    }

    if (dateEl && foundDate) dateEl.value = foundDate;
    if (timeEl && foundTime) timeEl.value = foundTime;

    if (dateEl && dateEl.value && timeEl && timeEl.value) {
        if (hiddenEl) hiddenEl.value = `${dateEl.value} ${timeEl.value}`;
    }
}

// 1. Quản lý file đính kèm cho Lệnh điều động (Trip modal)
function handleBookingFilesSelect(input) {
    if (!input || !input.files || input.files.length === 0) return;
    
    for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        if (file.size > 5 * 1024 * 1024) {
            showToast('warning', `File "${file.name}" vượt quá 5MB. Vui lòng chọn file nhẹ hơn.`, 'File Quá Dung Lượng');
            continue;
        }
        // Tránh trùng tên & kích thước
        const isDuplicate = tripBookingFilesList.some(f => f.name === file.name && f.size === file.size);
        if (!isDuplicate) {
            tripBookingFilesList.push(file);
        }
    }
    input.value = '';
    renderTripBookingFilesList();
}

function removeTripBookingFile(index) {
    if (index >= 0 && index < tripBookingFilesList.length) {
        tripBookingFilesList.splice(index, 1);
        renderTripBookingFilesList();
    }
}

function renderTripBookingFilesList() {
    const area = document.getElementById('booking-files-list-area');
    const summary = document.getElementById('booking-file-summary');
    if (!area) return;

    let itemsHtml = '';
    let totalCount = tripBookingFilesList.length;

    // Nếu có file kế thừa từ booking cha
    if (currentInheritedBookingFile && currentInheritedBookingFile.url) {
        totalCount += 1;
        const isPdf = currentInheritedBookingFile.url.toLowerCase().endsWith('.pdf');
        itemsHtml += `
            <div class="flex items-center justify-between p-2 rounded-lg bg-teal-50 border border-teal-200 text-xs">
                <div class="flex items-center space-x-2 truncate pr-2">
                    <i class="${isPdf ? 'ph-bold ph-file-pdf text-rose-600' : 'ph-bold ph-file-image text-teal-600'} text-base shrink-0"></i>
                    <div class="truncate">
                        <p class="font-bold text-teal-900 truncate" title="${currentInheritedBookingFile.name || 'File Booking'}">${currentInheritedBookingFile.name || 'File Booking'}</p>
                        <span class="text-[10px] text-teal-700 italic font-medium">(Kế thừa từ Booking)</span>
                    </div>
                </div>
                <div class="flex items-center space-x-1 shrink-0">
                    <a href="${currentInheritedBookingFile.url}" target="_blank" rel="noopener noreferrer" 
                        class="p-1 rounded text-teal-700 hover:text-teal-900 hover:bg-teal-100 transition-colors" title="Mở xem file">
                        <i class="ph-bold ph-arrow-square-out text-sm"></i>
                    </a>
                    <button type="button" onclick="removeInheritedBookingFile()" 
                        class="p-1 rounded text-rose-600 hover:text-rose-800 hover:bg-rose-50 transition-colors" title="Gỡ bỏ file kế thừa">
                        <i class="ph-bold ph-trash text-sm"></i>
                    </button>
                </div>
            </div>
        `;
    }

    tripBookingFilesList.forEach((file, idx) => {
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        const sizeKb = (file.size / 1024).toFixed(0);
        const sizeStr = file.size >= 1024 * 1024 ? `${sizeMb} MB` : `${sizeKb} KB`;
        const tempUrl = URL.createObjectURL(file);

        itemsHtml += `
            <div class="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 shadow-2xs text-xs">
                <div class="flex items-center space-x-2 truncate pr-2">
                    <i class="${isPdf ? 'ph-bold ph-file-pdf text-rose-600' : 'ph-bold ph-file-image text-blue-600'} text-base shrink-0"></i>
                    <div class="truncate">
                        <p class="font-bold text-slate-800 truncate" title="${file.name}">${file.name}</p>
                        <span class="text-[10px] text-slate-400 font-medium">(${sizeStr})</span>
                    </div>
                </div>
                <div class="flex items-center space-x-1 shrink-0">
                    <a href="${tempUrl}" target="_blank" rel="noopener noreferrer" 
                        class="p-1 rounded text-blue-700 hover:text-blue-900 hover:bg-blue-50 transition-colors" title="Xem trước">
                        <i class="ph-bold ph-eye text-sm"></i>
                    </a>
                    <button type="button" onclick="removeTripBookingFile(${idx})" 
                        class="p-1 rounded text-rose-600 hover:text-rose-800 hover:bg-rose-50 transition-colors" title="Xóa file">
                        <i class="ph-bold ph-trash text-sm"></i>
                    </button>
                </div>
            </div>
        `;
    });

    area.innerHTML = itemsHtml;
    if (summary) {
        if (totalCount > 0) {
            summary.innerHTML = `<i class="ph-bold ph-check-circle text-emerald-600"></i> <strong class="text-emerald-800">${totalCount}</strong> tệp đính kèm`;
        } else {
            summary.innerHTML = `<i class="ph ph-info text-blue-500"></i> Chưa có tệp nào được đính kèm (hoặc kế thừa từ Booking)`;
        }
    }
}

function clearBookingFileSelection() {
    const input = document.getElementById('inp-booking-file');
    if (input) input.value = '';
    tripBookingFilesList = [];
    currentInheritedBookingFile = null;
    renderTripBookingFilesList();
}

function showInheritedBookingFile(fileUrl, fileName) {
    if (!fileUrl) {
        currentInheritedBookingFile = null;
    } else {
        currentInheritedBookingFile = { url: fileUrl, name: fileName || 'File_Booking_Dinh_Kem' };
    }
    renderTripBookingFilesList();
}

function removeInheritedBookingFile() {
    currentInheritedBookingFile = null;
    renderTripBookingFilesList();
    showToast('info', 'Đã gỡ bỏ file đính kèm kế thừa từ Booking.');
}

// 2. Quản lý multi-files cho Sale / Booking Order
function handleSaleBookingFilesSelect(input) {
    if (!input || !input.files || input.files.length === 0) return;

    for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        if (file.size > 5 * 1024 * 1024) {
            showToast('warning', `File "${file.name}" vượt quá 5MB. Vui lòng chọn file nhẹ hơn.`, 'File Quá Dung Lượng');
            continue;
        }
        const isDuplicate = saleBookingFilesList.some(f => f.name === file.name && f.size === file.size);
        if (!isDuplicate) {
            saleBookingFilesList.push(file);
        }
    }
    input.value = '';
    renderSaleBookingFilesList();
}

function removeSaleBookingNewFile(index) {
    if (index >= 0 && index < saleBookingFilesList.length) {
        saleBookingFilesList.splice(index, 1);
        renderSaleBookingFilesList();
    }
}

async function deleteSaleBookingExistingDoc(docId) {
    if (!currentEditingBookingId || !docId) {
        saleBookingExistingDocs = saleBookingExistingDocs.filter(d => d.id !== docId);
        renderSaleBookingFilesList();
        return;
    }

    const confirmed = await showConfirmModal({
        title: 'Xóa Tài Liệu Booking',
        message: 'Bạn có chắc chắn muốn xóa tài liệu này khỏi Booking không?\n\nThao tác sẽ gỡ bỏ tệp đính kèm khỏi hệ thống.',
        confirmText: 'Xác Nhận Xóa',
        cancelText: 'Huỷ bỏ',
        type: 'danger',
        icon: 'ph-bold ph-trash text-2xl'
    });
    if (!confirmed) return;

    try {
        const res = await fetchWithAuth(`/api/bookings/${currentEditingBookingId}/documents/${docId}/`, {
            method: 'DELETE'
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || data.error || 'Lỗi khi xóa tài liệu');

        saleBookingExistingDocs = saleBookingExistingDocs.filter(d => d.id !== docId);
        renderSaleBookingFilesList();
        showToast('success', 'Đã xóa tài liệu đính kèm', 'Thành Công');
    } catch (err) {
        console.error('Lỗi xóa document:', err);
        showToast('error', err.message || 'Không thể xóa tài liệu đính kèm', 'Lỗi');
    }
}

function renderSaleBookingFilesList() {
    const listArea = document.getElementById('booking-order-files-list');
    const summary = document.getElementById('booking-order-files-summary');
    if (!listArea) return;

    let itemsHtml = '';
    const totalCount = saleBookingExistingDocs.length + saleBookingFilesList.length;

    // Render các file đã lưu trong CSDL
    saleBookingExistingDocs.forEach(doc => {
        const isPdf = (doc.name || doc.url || '').toLowerCase().endsWith('.pdf');
        itemsHtml += `
            <div class="flex items-center justify-between p-2 rounded-lg bg-teal-50 border border-teal-200 shadow-2xs text-xs">
                <div class="flex items-center space-x-2 truncate pr-2">
                    <i class="${isPdf ? 'ph-bold ph-file-pdf text-rose-600' : 'ph-bold ph-file-image text-teal-600'} text-base shrink-0"></i>
                    <div class="truncate">
                        <p class="font-bold text-teal-900 truncate" title="${doc.name || 'File Booking'}">${doc.name || 'File Booking'}</p>
                        <span class="text-[10px] text-teal-700 font-medium">${doc.size_formatted ? `(${doc.size_formatted})` : '(Đã lưu)'}</span>
                    </div>
                </div>
                <div class="flex items-center space-x-1 shrink-0">
                    <a href="${doc.url}" target="_blank" rel="noopener noreferrer" 
                        class="p-1 rounded text-teal-700 hover:text-teal-900 hover:bg-teal-100 transition-colors" title="Mở file">
                        <i class="ph-bold ph-arrow-square-out text-sm"></i>
                    </a>
                    ${doc.id ? `
                        <button type="button" onclick="deleteSaleBookingExistingDoc(${doc.id})" 
                            class="p-1 rounded text-rose-600 hover:text-rose-800 hover:bg-rose-50 transition-colors" title="Xóa tài liệu này">
                            <i class="ph-bold ph-trash text-sm"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    });

    // Render các file mới chọn chưa lưu
    saleBookingFilesList.forEach((file, idx) => {
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        const sizeKb = (file.size / 1024).toFixed(0);
        const sizeStr = file.size >= 1024 * 1024 ? `${sizeMb} MB` : `${sizeKb} KB`;
        const tempUrl = URL.createObjectURL(file);

        itemsHtml += `
            <div class="flex items-center justify-between p-2 rounded-lg bg-white border border-blue-200 shadow-2xs text-xs">
                <div class="flex items-center space-x-2 truncate pr-2">
                    <i class="${isPdf ? 'ph-bold ph-file-pdf text-rose-600' : 'ph-bold ph-file-image text-blue-600'} text-base shrink-0"></i>
                    <div class="truncate">
                        <p class="font-bold text-slate-800 truncate" title="${file.name}">${file.name}</p>
                        <span class="text-[10px] text-blue-600 font-medium">Mới: (${sizeStr})</span>
                    </div>
                </div>
                <div class="flex items-center space-x-1 shrink-0">
                    <a href="${tempUrl}" target="_blank" rel="noopener noreferrer" 
                        class="p-1 rounded text-blue-700 hover:text-blue-900 hover:bg-blue-50 transition-colors" title="Xem trước">
                        <i class="ph-bold ph-eye text-sm"></i>
                    </a>
                    <button type="button" onclick="removeSaleBookingNewFile(${idx})" 
                        class="p-1 rounded text-rose-600 hover:text-rose-800 hover:bg-rose-50 transition-colors" title="Bỏ file này">
                        <i class="ph-bold ph-trash text-sm"></i>
                    </button>
                </div>
            </div>
        `;
    });

    listArea.innerHTML = itemsHtml;
    if (summary) {
        if (totalCount > 0) {
            summary.innerHTML = `<i class="ph-bold ph-check-circle text-emerald-600"></i> <strong class="text-emerald-800">${totalCount}</strong> tệp đính kèm`;
        } else {
            summary.innerHTML = `<i class="ph ph-info text-blue-500"></i> Chưa có tệp nào được đính kèm`;
        }
    }
}

function clearSaleBookingFileSelection() {
    const input = document.getElementById('booking-order-file');
    if (input) input.value = '';
    saleBookingFilesList = [];
    saleBookingExistingDocs = [];
    currentEditingBookingId = null;
    renderSaleBookingFilesList();
}

function showSaleExistingBookingFile(fileUrl, fileName, docs = []) {
    saleBookingFilesList = [];
    if (docs && docs.length > 0) {
        saleBookingExistingDocs = [...docs];
    } else if (fileUrl) {
        saleBookingExistingDocs = [{
            id: null,
            name: fileName || 'File_Booking_Dinh_Kem',
            url: fileUrl,
            size_formatted: ''
        }];
    } else {
        saleBookingExistingDocs = [];
    }
    renderSaleBookingFilesList();
}

// --- 4. TẠO LỆNH ĐIỀU ĐỘNG VỚI DEFENSIVE VALIDATION (Bim_ERP Standard) ---
async function submitNewTrip() {
    const is_split_trip = document.getElementById('chk-drop-hook')?.checked || false;

    // Reset lỗi cũ & cấu hình danh sách trường bắt buộc theo chế độ chạy
    const requiredFields = [
        { id: 'inp-customer', errId: 'err-customer', label: 'Khách hàng' },
        { id: 'inp-pickup', errId: 'err-pickup', label: 'Nơi lấy cont/hàng' },
        { id: 'inp-warehouse', errId: 'err-warehouse', label: 'Nơi đóng/trả hàng' }
    ];

    if (is_split_trip) {
        requiredFields.push({ id: 'inp-driver-leg1', errId: 'err-driver-leg1', label: 'Tài xế lấy cont (Chặng 1)' });
        requiredFields.push({ id: 'inp-dropoff-driver', errId: 'err-dropoff-driver', label: 'Tài xế hạ cont (Chặng 2)' });
    } else {
        requiredFields.push({ id: 'inp-driver', errId: 'err-driver', label: 'Tài xế nhận lệnh' });
    }

    let hasError = false;
    let firstErrorEl = null;
    const missingLabels = [];

    requiredFields.forEach(f => {
        const inputEl = document.getElementById(f.id);
        const errEl = document.getElementById(f.errId);
        if (!inputEl) return;
        
        if (!inputEl.value || !inputEl.value.trim()) {
            hasError = true;
            missingLabels.push(f.label);
            inputEl.classList.add('input-error');
            if (errEl) {
                errEl.innerHTML = `<i class="ph-bold ph-warning-circle"></i> Vui lòng chọn/nhập ${f.label.toLowerCase()}`;
                errEl.classList.remove('hidden');
            }
            if (!firstErrorEl) firstErrorEl = inputEl;

            // Tự động xóa viền đỏ khi người dùng bắt đầu nhập hoặc chọn option
            const clearError = () => {
                inputEl.classList.remove('input-error');
                if (errEl) errEl.classList.add('hidden');
            };
            inputEl.addEventListener('input', clearError, { once: true });
            inputEl.addEventListener('change', clearError, { once: true });
        } else {
            inputEl.classList.remove('input-error');
            if (errEl) errEl.classList.add('hidden');
        }
    });

    if (hasError) {
        showToast('warning', `Vui lòng chọn/nhập các thông tin bắt buộc: ${missingLabels.join(', ')}`, 'Thiếu dữ liệu');
        if (firstErrorEl) {
            firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
                try { firstErrorEl.focus(); } catch (e) {}
            }, 250);
        }
        return;
    }

    const bookingOrderEl = document.getElementById('select-booking-order');
    const booking_order_id = bookingOrderEl && bookingOrderEl.value ? parseInt(bookingOrderEl.value) : null;
    const customer = document.getElementById('inp-customer')?.value || '';
    const type = document.getElementById('inp-type')?.value || 'Nhập';
    const is_twin_container = document.getElementById('chk-twin-cont')?.checked || false;
    let container_type = document.getElementById('inp-cont-type') ? document.getElementById('inp-cont-type').value : (is_twin_container ? '2x20DC' : '40HC');
    if (is_twin_container && (!container_type || container_type === '40HC')) {
        container_type = '2x20DC';
    }
    const container = document.getElementById('inp-cont')?.value || '';
    const booking = document.getElementById('inp-booking')?.value || '';
    const seal = document.getElementById('inp-seal')?.value || '';
    const vgm_weight = document.getElementById('inp-vgm')?.value || '';
    syncTripCutoff();
    const cutoff = document.getElementById('inp-cutoff')?.value || '';
    const commercial_invoice = document.getElementById('inp-invoice') ? document.getElementById('inp-invoice').value.trim() : '';
    const warehouse_dock = document.getElementById('inp-dock') ? document.getElementById('inp-dock').value.trim() : '';
    const loading_time = document.getElementById('inp-load-time') ? document.getElementById('inp-load-time').value.trim() : '8H';
    const cont_location_type = document.getElementById('inp-cont-loc') ? document.getElementById('inp-cont-loc').value.trim() : 'NHÀ MÁY';

    // Trường Cont thứ 2 (Kẹp 20ft)
    const container_2 = is_twin_container ? (document.getElementById('inp-cont-2')?.value || '').trim() : '';
    const seal_2 = is_twin_container ? (document.getElementById('inp-seal-2')?.value || '').trim() : '';
    const booking_2 = is_twin_container ? (document.getElementById('inp-booking-2')?.value || '').trim() : '';
    const vgm_weight_2 = is_twin_container ? (document.getElementById('inp-vgm-2')?.value || '').trim() : '';
    const cargo_notes_2 = is_twin_container ? (document.getElementById('inp-cargo-notes-2')?.value || '').trim() : '';

    // Nghiệp vụ Cảng: Quản lý Hạn Free DEM/DET & Giám định EIR
    const det_free_days = parseInt(document.getElementById('inp-det-free-days')?.value) || 3;
    const dem_free_days = parseInt(document.getElementById('inp-dem-free-days')?.value) || 3;
    const det_expiry_date = document.getElementById('inp-det-expiry')?.value || '';
    const dem_expiry_date = document.getElementById('inp-dem-expiry')?.value || '';
    const container_condition = document.getElementById('select-container-condition')?.value || 'GOOD';
    const damage_description = (document.getElementById('inp-damage-desc')?.value || '').trim();

    const pickup = document.getElementById('inp-pickup')?.value || '';
    const warehouse = document.getElementById('inp-warehouse')?.value || '';
    const dropoff = document.getElementById('inp-dropoff')?.value || '';
    let driver = '';
    let vehicle = '';
    let dropoff_driver = '';
    let dropoff_vehicle = '';
    let driver_split_ratio = 50;

    if (is_split_trip) {
        driver = document.getElementById('inp-driver-leg1')?.value || '';
        vehicle = document.getElementById('inp-vehicle-leg1')?.value || '';
        dropoff_driver = document.getElementById('inp-dropoff-driver')?.value || '';
        dropoff_vehicle = document.getElementById('inp-dropoff-vehicle')?.value || '';
        driver_split_ratio = parseFloat(document.getElementById('inp-driver-split-ratio')?.value) || 50;
    } else {
        driver = document.getElementById('inp-driver')?.value || '';
    }

    const notes = is_split_trip 
        ? (document.getElementById('inp-notes-drop-hook')?.value || document.getElementById('inp-notes')?.value || '')
        : (document.getElementById('inp-notes')?.value || '');

    // Hiệu ứng Visual Feedback trên nút Lưu
    const submitBtn = document.getElementById('btn-submit-trip') || document.querySelector('#form-create-trip button');
    let originalBtnHtml = '';
    if (submitBtn) {
        originalBtnHtml = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="ph ph-spinner animate-spin text-lg mr-1.5"></i> Đang lưu & phát lệnh Zalo...';
    }

    try {
        const formData = new FormData();
        if (booking_order_id) formData.append('booking_order_id', booking_order_id);
        formData.append('customer', customer);
        formData.append('type', type);
        formData.append('container_type', container_type);
        formData.append('container', container);
        formData.append('booking', booking);
        formData.append('seal', seal);
        formData.append('cutoff', cutoff);
        formData.append('vgm_weight', vgm_weight);
        formData.append('commercial_invoice', commercial_invoice);
        formData.append('warehouse_dock', warehouse_dock);
        formData.append('loading_time', loading_time);
        formData.append('cont_location_type', cont_location_type);
        formData.append('pickup', pickup);
        formData.append('warehouse', warehouse);
        formData.append('dropoff', dropoff);
        formData.append('driver', driver);
        formData.append('vehicle', vehicle);
        formData.append('notes', notes);
        formData.append('cargo_notes', notes);
        formData.append('is_split_trip', is_split_trip ? 'true' : 'false');
        formData.append('dropoff_driver', dropoff_driver);
        formData.append('dropoff_vehicle', dropoff_vehicle);
        formData.append('driver_split_ratio', driver_split_ratio);
        formData.append('is_twin_container', is_twin_container ? 'true' : 'false');
        formData.append('container_2', container_2);
        formData.append('seal_2', seal_2);
        formData.append('booking_2', booking_2);
        formData.append('vgm_weight_2', vgm_weight_2);
        formData.append('cargo_notes_2', cargo_notes_2);
        formData.append('det_free_days', det_free_days);
        formData.append('dem_free_days', dem_free_days);
        formData.append('det_expiry_date', det_expiry_date);
        formData.append('dem_expiry_date', dem_expiry_date);
        formData.append('container_condition', container_condition);
        formData.append('damage_description', damage_description);

        const fileInput = document.getElementById('inp-booking-file');
        if (tripBookingFilesList && tripBookingFilesList.length > 0) {
            formData.append('booking_file', tripBookingFilesList[0]);
            tripBookingFilesList.forEach(file => {
                formData.append('booking_files', file);
            });
        } else if (fileInput && fileInput.files && fileInput.files[0]) {
            formData.append('booking_file', fileInput.files[0]);
        }

        const res = await fetchWithAuth('/api/trips/', {
            method: 'POST',
            body: formData
        });
        const result = await res.json().catch(() => ({}));
        if (res.ok && result.success) {
            closeModal('modal-create-trip');
            document.getElementById('form-create-trip').reset();
            clearBookingFileSelection();
            loadTripsData();

            // Tự động sao chép Lệnh điều xe và mở Zalo nếu có tài xế
            const message = buildDriverZaloMessage(result);
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(message).catch(() => {});
            }

            if (result.driver_phone) {
                const cleanPhone = String(result.driver_phone).replace(/\D/g, '');
                showToast('success', `Đã tạo lệnh ${result.trip_code}! Đã sao chép nội dung Lệnh & Mở Zalo tài xế (${result.driver_name || cleanPhone}). Hãy dán (Ctrl+V) để gửi ngay!`, 'Tạo Lệnh & Sao Chép Zalo');
                window.open(`https://zalo.me/${cleanPhone}`, '_blank');
            } else {
                showToast('success', result.message || 'Tạo lệnh điều động thành công!', 'Thành công');
            }
        } else {
            let errorMsg = result.message || result.error || result.detail;
            if (!errorMsg && typeof result === 'object' && Object.keys(result).length > 0) {
                const fieldErrors = Object.entries(result)
                    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                    .join(' | ');
                if (fieldErrors) errorMsg = fieldErrors;
            }
            errorMsg = errorMsg || 'Vui lòng kiểm tra lại dữ liệu nhập.';
            showToast('danger', errorMsg, 'Lỗi nghiệp vụ');
        }
    } catch (err) {
        console.error('Error submitting trip:', err);
        showToast('danger', 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.', 'Lỗi kết nối');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHtml;
        }
    }
}

// --- 5. CAMERA OCR QUÉT CHỨNG TỪ & PHÍ PHÁT SINH (APP TÀI XẾ) ---
function openOcrApp(mode) {
    currentOcrMode = mode;
    if (mode === 'phi-ton') {
        document.getElementById('ocr-modal-title').innerHTML = '<i class="ph-bold ph-camera text-amber-600 text-xl mr-2"></i> Báo Cáo Phí Phát Sinh';
        document.getElementById('ocr-upload-text').innerText = 'Chụp Hóa Đơn / Vé Trạm BOT';
        document.getElementById('ocr-upload-sub').innerText = 'AI OCR sẽ tự động trích xuất số tiền chi phí.';
    } else {
        document.getElementById('ocr-modal-title').innerHTML = '<i class="ph-bold ph-file-text text-emerald-600 text-xl mr-2"></i> Trả Chứng Từ Hoàn Thành';
        document.getElementById('ocr-upload-text').innerText = 'Chụp Phiếu EIR / Biên Bản POD';
        document.getElementById('ocr-upload-sub').innerText = 'AI OCR sẽ nhận diện số Cont, Seal để đối chiếu lệnh.';
    }
    openModal('modal-ocr');
}

function resetOcr() {
    document.getElementById('ocr-step-1').classList.remove('hidden-view');
    document.getElementById('ocr-step-2').classList.add('hidden-view');
    document.getElementById('ocr-step-3').classList.add('hidden-view');
    document.getElementById('ocr-form-expense').classList.add('hidden-view');
    document.getElementById('ocr-form-document').classList.add('hidden-view');
}

function startOcrScan() {
    document.getElementById('ocr-step-1').classList.add('hidden-view');
    document.getElementById('ocr-step-2').classList.remove('hidden-view');
    document.getElementById('ocr-step-2').classList.add('flex');
    
    setTimeout(() => {
        document.getElementById('ocr-step-2').classList.add('hidden-view');
        document.getElementById('ocr-step-2').classList.remove('flex');
        document.getElementById('ocr-step-3').classList.remove('hidden-view');
        
        if (currentOcrMode === 'phi-ton') {
            document.getElementById('ocr-form-expense').classList.remove('hidden-view');
            document.getElementById('ocr-raw-text').innerText = 'Dữ liệu gốc OCR: "Trạm thu phí Cầu Đồng Nai - 120.000 VNĐ"';
        } else {
            document.getElementById('ocr-form-document').classList.remove('hidden-view');
            const contVal = document.getElementById('detail-cont').innerText;
            const sealVal = document.getElementById('detail-seal').innerText;
            document.getElementById('ocr-raw-text').innerText = `Dữ liệu gốc OCR: "Phiếu Giao Nhận EIR - Cont: ${contVal}"`;
            document.getElementById('ocr-doc-cont').value = contVal;
            document.getElementById('ocr-doc-seal').value = sealVal !== '-' ? sealVal : 'SL-998877';
        }
    }, 1000);
}

async function submitOcrData() {
    if (!currentActiveTripCode) return;

    if (currentOcrMode === 'phi-ton') {
        const category = document.getElementById('ocr-expense-type').value;
        const amount = parseNumberVN(document.getElementById('ocr-amount').value);
        const raw_ocr = document.getElementById('ocr-raw-text').innerText;

        try {
            const res = await fetchWithAuth(`/api/trips/${currentActiveTripCode}/expenses/`, {
                method: 'POST',
                body: JSON.stringify({ category, amount, raw_ocr })
            });
            const resData = await res.json();
            if (res.ok && resData.success) {
                closeModal('modal-ocr');
                viewTripDetail(currentActiveTripCode);
                showToast('success', resData.message, 'Đã ghi nhận chi phí');
            } else {
                showToast('danger', resData.message || resData.error || resData.detail || 'Lỗi khi gửi báo cáo chi phí.');
            }
        } catch (err) {
            showToast('danger', 'Lỗi khi gửi báo cáo chi phí.');
        }
    } else {
        const doc_type = document.getElementById('ocr-doc-type').value;
        const container_no = document.getElementById('ocr-doc-cont').value;
        const seal_no = document.getElementById('ocr-doc-seal').value;

        try {
            const res = await fetchWithAuth(`/api/trips/${currentActiveTripCode}/documents/`, {
                method: 'POST',
                body: JSON.stringify({ doc_type, container_no, seal_no })
            });
            const resData = await res.json();
            if (res.ok && resData.success) {
                closeModal('modal-ocr');
                viewTripDetail(currentActiveTripCode);
                showToast('success', resData.message, 'Đã nghiệm thu chứng từ');
            } else {
                showToast('danger', resData.message || resData.error || resData.detail || 'Lỗi khi gửi chứng từ hoàn tất.');
            }
        } catch (err) {
            showToast('danger', 'Lỗi khi gửi chứng từ hoàn tất.');
        }
    }
}

// --- 6. PHÂN HỆ HÀNH CHÍNH & NHÂN SỰ (EMPLOYEE DIRECTORY & PAYROLL) ---
let currentHRSubTab = 'directory';
let rawEmployeesList = [];
let rawHRData = [];
let hrSortColumn = null;
let hrSortDirection = 'asc';

function switchHRSubTab(tabKey) {
    currentHRSubTab = tabKey;
    const dirBtn = document.getElementById('hr-tab-directory-btn');
    const payBtn = document.getElementById('hr-tab-payroll-btn');
    const dirPanel = document.getElementById('hr-panel-directory');
    const payPanel = document.getElementById('hr-panel-payroll');
    const createBtn = document.getElementById('btn-create-employee');

    if (tabKey === 'directory') {
        if (dirBtn) {
            dirBtn.classList.add('active', 'border-teal-600', 'text-teal-800');
            dirBtn.classList.remove('border-transparent', 'text-slate-500');
        }
        if (payBtn) {
            payBtn.classList.remove('active', 'border-teal-600', 'text-teal-800');
            payBtn.classList.add('border-transparent', 'text-slate-500');
        }
        if (dirPanel) dirPanel.classList.remove('hidden');
        if (payPanel) payPanel.classList.add('hidden');
        if (createBtn) createBtn.classList.remove('hidden');
        loadEmployeesData();
    } else {
        if (payBtn) {
            payBtn.classList.add('active', 'border-teal-600', 'text-teal-800');
            payBtn.classList.remove('border-transparent', 'text-slate-500');
        }
        if (dirBtn) {
            dirBtn.classList.remove('active', 'border-teal-600', 'text-teal-800');
            dirBtn.classList.add('border-transparent', 'text-slate-500');
        }
        if (payPanel) payPanel.classList.remove('hidden');
        if (dirPanel) dirPanel.classList.add('hidden');
        if (createBtn) createBtn.classList.add('hidden');
        loadHRPayrollData();
    }
}

async function loadEmployeesData() {
    try {
        const [empRes, statsRes] = await Promise.all([
            fetchWithAuth('/api/personnel/employees/'),
            fetchWithAuth('/api/personnel/stats/')
        ]);

        if (statsRes.ok) {
            const statsJson = await statsRes.json();
            const s = statsJson.stats || {};
            const el = id => document.getElementById(id);
            if (el('hr-kpi-total')) el('hr-kpi-total').innerText = s.total || 0;
            if (el('hr-kpi-drivers')) el('hr-kpi-drivers').innerText = s.drivers || 0;
            if (el('hr-kpi-office')) el('hr-kpi-office').innerText = (s.dispatchers || 0) + (s.accountants || 0);
            if (el('hr-kpi-inactive')) el('hr-kpi-inactive').innerText = s.inactive || 0;
        }

        if (empRes.ok) {
            const empJson = await empRes.json();
            rawEmployeesList = empJson.results || [];
            filterEmployeesTable();
        }
    } catch (err) {
        console.error('Lỗi tải danh sách nhân sự:', err);
    }
}

function filterEmployeesTable() {
    const q = (document.getElementById('emp-search-input')?.value || '').trim().toLowerCase();
    const dept = document.getElementById('emp-filter-dept')?.value || 'ALL';
    const role = document.getElementById('emp-filter-role')?.value || 'ALL';
    const status = document.getElementById('emp-filter-status')?.value || 'ALL';

    const filtered = (rawEmployeesList || []).filter(item => {
        // Match Search Text
        const str = `${item.code} ${item.full_name} ${item.nickname || ''} ${item.phone_number || ''} ${item.license_number || ''}`.toLowerCase();
        const matchesQuery = !q || str.includes(q);

        // Match Filters
        const matchesDept = dept === 'ALL' || item.department === dept;
        const matchesRole = role === 'ALL' || item.role === role;
        const matchesStatus = status === 'ALL' || (status === 'ACTIVE' ? item.is_active : !item.is_active);

        return matchesQuery && matchesDept && matchesRole && matchesStatus;
    });

    const countDisplay = document.getElementById('emp-count-display');
    if (countDisplay) countDisplay.innerText = filtered.length;

    renderEmployeesTable(filtered);
}

function renderEmployeesTable(items) {
    const tbody = document.getElementById('employees-tbody');
    if (!tbody) return;

    if (!items || items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="p-8 text-center text-slate-400 font-medium">
                    <i class="ph ph-user-circle text-3xl mb-2 text-slate-300 block"></i>
                    Không tìm thấy nhân sự nào phù hợp với bộ lọc.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = items.map(emp => `
        <tr class="hover:bg-slate-50 transition-colors border-b border-slate-200">
            <td class="py-2.5 px-3.5 font-mono font-bold text-teal-900 border-r border-slate-200 text-xs">${escapeHtml(emp.code)}</td>
            <td class="py-2.5 px-3.5 font-bold text-slate-900 border-r border-slate-200 text-sm">
                <div>${escapeHtml(emp.full_name)}</div>
                ${emp.username ? `<div class="text-[11px] text-slate-400 font-normal">@${escapeHtml(emp.username)}</div>` : ''}
            </td>
            <td class="py-2.5 px-3.5 text-xs font-semibold text-slate-700 border-r border-slate-200">${emp.nickname ? `<span class="px-2 py-0.5 bg-amber-50 text-amber-800 rounded-md border border-amber-200">${escapeHtml(emp.nickname)}</span>` : '—'}</td>
            <td class="py-2.5 px-3.5 text-xs border-r border-slate-200 font-mono">
                <div class="font-bold text-slate-800">${escapeHtml(emp.phone_number || '—')}</div>
                ${emp.zalo_id ? `<div class="text-[11px] text-teal-600 font-medium">Zalo: ${escapeHtml(emp.zalo_id)}</div>` : ''}
            </td>
            <td class="py-2.5 px-3.5 text-xs font-medium text-slate-700 border-r border-slate-200">${escapeHtml(emp.department_label || emp.department)}</td>
            <td class="py-2.5 px-3.5 text-xs font-bold border-r border-slate-200">
                <span class="px-2 py-0.5 rounded-md ${emp.role === 'DRIVER' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : (emp.role === 'DIRECTOR' ? 'bg-purple-50 text-purple-800 border border-purple-200' : 'bg-blue-50 text-blue-800 border border-blue-200')}">
                    ${escapeHtml(emp.role_label || emp.role)}
                </span>
            </td>
            <td class="py-2.5 px-3.5 text-xs border-r border-slate-200">
                ${emp.license_number ? `
                    <div class="font-mono font-bold text-slate-800">${escapeHtml(emp.license_number)}</div>
                    ${emp.license_expiry ? `<div class="text-[11px] text-slate-500">Hạn: ${emp.license_expiry}</div>` : ''}
                ` : '<span class="text-slate-400">—</span>'}
            </td>
            <td class="py-2.5 px-3.5 text-xs font-mono font-bold text-right text-slate-900 border-r border-slate-200 tabular-nums">${formatMoney(emp.base_salary)}</td>
            <td class="py-2.5 px-3.5 text-center border-r border-slate-200 text-xs font-semibold ${emp.is_active ? 'text-emerald-700' : 'text-slate-400'}">
                ${emp.is_active ? '<span class="inline-flex items-center gap-1 text-emerald-700 font-bold"><i class="ph-fill ph-check-circle text-sm"></i> Đang làm</span>' : '<span class="inline-flex items-center gap-1 text-slate-400"><i class="ph-fill ph-minus-circle text-sm"></i> Tạm ngưng</span>'}
            </td>
            <td class="py-2.5 px-3.5 text-center">
                <div class="flex items-center justify-center space-x-1">
                    <button onclick="openEditEmployeeModal(${emp.id})" class="p-1 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded transition-colors cursor-pointer" title="Chỉnh sửa hồ sơ"><i class="ph-bold ph-pencil-simple text-sm"></i></button>
                    <button onclick="deleteEmployeeItem(${emp.id})" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Tạm ngưng công tác"><i class="ph-bold ph-user-minus text-sm"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

function handleEmployeeRoleChange() {
    const roleSelect = document.getElementById('emp-role');
    const driverFields = document.getElementById('emp-driver-fields');
    if (roleSelect && driverFields) {
        if (roleSelect.value === 'DRIVER') {
            driverFields.classList.remove('hidden');
        } else {
            driverFields.classList.add('hidden');
        }
    }
}

function openCreateEmployeeModal() {
    document.getElementById('emp-edit-id').value = '';
    document.getElementById('emp-modal-title').innerText = 'Khai Báo Nhân Sự Mới';
    document.getElementById('emp-modal-subtitle').innerText = 'Thêm mới nhân viên, tài xế vào danh bạ BIM Logistics';

    document.getElementById('emp-code').value = '';
    document.getElementById('emp-full-name').value = '';
    document.getElementById('emp-nickname').value = '';
    document.getElementById('emp-phone').value = '';
    document.getElementById('emp-zalo').value = '';
    document.getElementById('emp-department').value = 'FLEET';
    document.getElementById('emp-role').value = 'DRIVER';
    document.getElementById('emp-license-number').value = '';
    document.getElementById('emp-license-expiry').value = '';
    document.getElementById('emp-base-salary').value = '5,000,000';
    document.getElementById('emp-is-active').value = 'true';

    handleEmployeeRoleChange();
    document.getElementById('modal-employee').classList.remove('hidden');
}

function openEditEmployeeModal(id) {
    const emp = (rawEmployeesList || []).find(e => e.id === id);
    if (!emp) return;

    document.getElementById('emp-edit-id').value = id;
    document.getElementById('emp-modal-title').innerText = 'Chỉnh Sửa Hồ Sơ Nhân Sự';
    document.getElementById('emp-modal-subtitle').innerText = `ID #${id} • Cập nhật thông tin cán bộ / tài xế`;

    document.getElementById('emp-code').value = emp.code || '';
    document.getElementById('emp-full-name').value = emp.full_name || '';
    document.getElementById('emp-nickname').value = emp.nickname || '';
    document.getElementById('emp-phone').value = emp.phone_number || '';
    document.getElementById('emp-zalo').value = emp.zalo_id || '';
    document.getElementById('emp-department').value = emp.department || 'FLEET';
    document.getElementById('emp-role').value = emp.role || 'DRIVER';
    document.getElementById('emp-license-number').value = emp.license_number || '';
    document.getElementById('emp-license-expiry').value = emp.license_expiry || '';
    document.getElementById('emp-base-salary').value = new Intl.NumberFormat('vi-VN').format(emp.base_salary || 0);
    document.getElementById('emp-is-active').value = emp.is_active ? 'true' : 'false';

    handleEmployeeRoleChange();
    document.getElementById('modal-employee').classList.remove('hidden');
}

function closeEmployeeModal() {
    const modal = document.getElementById('modal-employee');
    if (modal) modal.classList.add('hidden');
}

async function submitEmployeeForm(event) {
    event.preventDefault();
    const editId = document.getElementById('emp-edit-id').value;
    const isEdit = Boolean(editId);

    const baseSalaryClean = String(document.getElementById('emp-base-salary').value || '0').replace(/\D/g, '');

    const payload = {
        code: document.getElementById('emp-code').value.trim().toUpperCase(),
        full_name: document.getElementById('emp-full-name').value.trim(),
        nickname: document.getElementById('emp-nickname').value.trim(),
        phone_number: document.getElementById('emp-phone').value.trim(),
        zalo_id: document.getElementById('emp-zalo').value.trim(),
        department: document.getElementById('emp-department').value,
        role: document.getElementById('emp-role').value,
        license_number: document.getElementById('emp-license-number').value.trim(),
        license_expiry: document.getElementById('emp-license-expiry').value || null,
        base_salary: parseInt(baseSalaryClean, 10) || 0,
        is_active: document.getElementById('emp-is-active').value === 'true'
    };

    const url = isEdit ? `/api/personnel/employees/${editId}/` : '/api/personnel/employees/';
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const res = await fetchWithAuth(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
            const errStr = data.errors ? Object.entries(data.errors).map(([k, v]) => `${k}: ${v}`).join('; ') : (data.message || 'Lỗi lưu hồ sơ');
            throw new Error(errStr);
        }

        if (typeof showToast === 'function') {
            showToast('success', data.message || 'Đã lưu hồ sơ nhân sự thành công!', 'Thành Công');
        }
        closeEmployeeModal();
        loadEmployeesData();
    } catch (err) {
        console.error('Lỗi gửi form nhân sự:', err);
        if (typeof showToast === 'function') {
            showToast('error', err.message || 'Không thể lưu hồ sơ.', 'Lỗi Khai Báo');
        } else {
            alert('Lỗi: ' + err.message);
        }
    }
}

async function deleteEmployeeItem(id) {
    const confirmed = await showConfirmModal({
        title: 'Tạm Ngưng Nhân Sự',
        message: 'Bạn có chắc chắn muốn chuyển nhân sự này sang trạng thái tạm ngưng công tác?\n\nDữ liệu lịch sử phân công và bảng lương vẫn được bảo lưu an toàn.',
        confirmText: 'Tạm Ngưng',
        cancelText: 'Huỷ bỏ',
        type: 'danger',
        icon: 'ph-bold ph-user-minus text-2xl'
    });
    if (!confirmed) return;

    try {
        const res = await fetchWithAuth(`/api/personnel/employees/${id}/`, {
            method: 'DELETE'
        });
        const data = await res.json();
        if (typeof showToast === 'function') {
            showToast('success', data.message || 'Đã cập nhật trạng thái nhân sự!', 'Thành Công');
        }
        loadEmployeesData();
    } catch (err) {
        console.error('Lỗi tạm ngưng nhân sự:', err);
    }
}

async function loadHRPayrollData() {
    try {
        const globalDates = getDateRangeForPeriod(currentDashboardPeriod, currentDashboardCustomStart, currentDashboardCustomEnd);
        const res = await fetchWithAuth(`/api/personnel/payroll/?from_date=${globalDates.fromDate}&to_date=${globalDates.toDate}`);
        if (!res.ok) throw new Error('Lỗi tải bảng lương');
        const data = await res.json();
        rawHRData = data || [];
        applyHRFilters();
    } catch (err) {
        console.error('Lỗi tải bảng lương HR:', err);
    }
}

async function loadHRData() {
    if (currentHRSubTab === 'directory') {
        loadEmployeesData();
    } else {
        loadHRPayrollData();
    }
}

// --- 7. ĐỘI XE & BÃI ---
let rawFleetVehicles = [];
let fleetSortColumn = null;
let fleetSortDirection = 'asc';

function populateFleetFilterDropdowns(vehicles) {
    if (!vehicles || !Array.isArray(vehicles)) return;
    const typeSelect = document.getElementById('filter-fleet-type');
    if (typeSelect) {
        const curVal = typeSelect.value;
        const types = [...new Set(vehicles.map(v => (v.type || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
        typeSelect.innerHTML = '<option value="">-- Tất cả Loại phương tiện --</option>' + 
            types.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
        if (types.includes(curVal)) typeSelect.value = curVal;
    }
}

function clearFleetSearch() {
    const input = document.getElementById('filter-fleet-search');
    if (input) input.value = '';
    const clearBtn = document.getElementById('btn-clear-fleet-search');
    if (clearBtn) clearBtn.classList.add('hidden');
    applyFleetFilters();
}

function resetFleetFilters() {
    const type = document.getElementById('filter-fleet-type');
    if (type) type.value = '';
    const status = document.getElementById('filter-fleet-status');
    if (status) status.value = '';
    const search = document.getElementById('filter-fleet-search');
    if (search) search.value = '';
    const clearBtn = document.getElementById('btn-clear-fleet-search');
    if (clearBtn) clearBtn.classList.add('hidden');

    fleetSortColumn = null;
    fleetSortDirection = 'asc';
    applyFleetFilters();
}

function toggleFleetSort(col) {
    if (fleetSortColumn === col) {
        fleetSortDirection = fleetSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        fleetSortColumn = col;
        fleetSortDirection = 'asc';
    }
    applyFleetFilters();
}

function applyFleetFilters() {
    if (!rawFleetVehicles || !Array.isArray(rawFleetVehicles)) return;

    const filterType = document.getElementById('filter-fleet-type')?.value?.trim().toLowerCase() || '';
    const filterStatus = document.getElementById('filter-fleet-status')?.value?.trim() || '';
    const filterSearch = document.getElementById('filter-fleet-search')?.value?.trim().toLowerCase() || '';

    const clearBtn = document.getElementById('btn-clear-fleet-search');
    if (clearBtn) {
        if (filterSearch) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
    }

    let list = rawFleetVehicles.filter(v => {
        if (filterType && (v.type || '').toLowerCase() !== filterType) return false;

        if (filterStatus) {
            if (filterStatus === 'REG_WARNING') {
                if (!v.is_reg_warning) return false;
            } else if (filterStatus === 'MAINT_WARNING') {
                if (!v.is_maint_warning) return false;
            } else if (v.status !== filterStatus) {
                return false;
            }
        }

        if (filterSearch) {
            const combinedText = [
                v.plate,
                v.type,
                v.driver,
                v.reg_expiry,
                v.maint_date,
                v.status
            ].filter(Boolean).join(' ').toLowerCase();

            if (!combinedText.includes(filterSearch)) return false;
        }

        return true;
    });

    // Cập nhật số đếm
    const filteredCountEl = document.getElementById('fleet-filtered-count');
    if (filteredCountEl) filteredCountEl.innerText = list.length;
    const totalCountEl = document.getElementById('fleet-total-count');
    if (totalCountEl) totalCountEl.innerText = rawFleetVehicles.length;

    // Sắp xếp
    if (fleetSortColumn) {
        list.sort((a, b) => {
            let valA = (a[fleetSortColumn] || '').toString();
            let valB = (b[fleetSortColumn] || '').toString();
            const cmp = valA.localeCompare(valB, 'vi');
            return fleetSortDirection === 'asc' ? cmp : -cmp;
        });
    }

    // Cập nhật icon thead
    const sortCols = ['plate', 'type', 'driver', 'reg_expiry', 'maint_date', 'status'];
    sortCols.forEach(col => {
        const iconEl = document.getElementById(`sort-icon-fleet-${col}`);
        if (iconEl) {
            if (fleetSortColumn === col) {
                iconEl.className = fleetSortDirection === 'asc' 
                    ? 'ph-bold ph-arrow-up text-teal-600 text-xs' 
                    : 'ph-bold ph-arrow-down text-teal-600 text-xs';
            } else {
                iconEl.className = 'ph-bold ph-arrows-down-up text-slate-400 text-xs';
            }
        }
    });

    renderFleetTable(list);
}

function renderFleetTable(vehicles) {
    const tbody = document.getElementById('fleet-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!vehicles || vehicles.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-10 text-slate-400">
                    <div class="flex flex-col items-center justify-center">
                        <i class="ph ph-truck text-3xl mb-2 text-slate-300"></i>
                        <p class="font-medium text-sm text-slate-500">Không tìm thấy phương tiện nào phù hợp với bộ lọc</p>
                        <p class="text-xs text-slate-400 mt-1">Thử đổi điều kiện lọc hoặc bấm "Đặt lại"</p>
                        <button onclick="resetFleetFilters()" class="mt-2.5 px-3 py-1 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg text-xs font-bold transition-colors">
                            Đặt lại bộ lọc
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    vehicles.forEach(v => {
        let statusCls = 'bg-emerald-100 text-emerald-800';
        if (v.is_reg_expired) statusCls = 'bg-rose-100 text-rose-700 font-black';
        else if (v.is_reg_warning || v.is_maint_warning || v.is_ins_warning) statusCls = 'bg-amber-100 text-amber-700 font-bold';

        let regBadge = '';
        if (v.is_reg_expired) {
            regBadge = `<span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-300 mt-0.5"><i class="ph-bold ph-warning-circle mr-1"></i>Hết hạn (${Math.abs(v.reg_days_left)}N)</span>`;
        } else if (v.is_reg_warning) {
            regBadge = `<span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 mt-0.5"><i class="ph-bold ph-clock mr-1"></i>Còn ${v.reg_days_left} ngày</span>`;
        } else if (v.reg_days_left !== null && v.reg_days_left !== undefined) {
            regBadge = `<span class="text-[10.5px] text-emerald-600 font-bold mt-0.5 block">Hợp lệ (${v.reg_days_left}N)</span>`;
        }

        let maintBadge = '';
        if (v.is_maint_warning) {
            maintBadge = `<span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 mt-0.5"><i class="ph-bold ph-wrench mr-1"></i>Đến hạn (${v.maint_days_left}N)</span>`;
        } else if (v.maint_days_left !== null && v.maint_days_left !== undefined) {
            maintBadge = `<span class="text-[10.5px] text-slate-400 font-medium mt-0.5 block">Còn ${v.maint_days_left}N</span>`;
        }

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition-colors border-b border-slate-200/80';
        tr.innerHTML = `
            <td class="p-4 font-black text-slate-900 font-heading text-sm">${escapeHtml(v.plate)}</td>
            <td class="p-4 font-medium text-slate-700 text-sm">
                <div>${escapeHtml(v.type)}</div>
                <span class="text-[10.5px] font-bold ${v.ownership_code === 'OWNED' ? 'text-teal-700' : 'text-amber-700'}">${escapeHtml(v.ownership_type)}</span>
            </td>
            <td class="p-4 font-bold text-slate-800 text-sm">${escapeHtml(v.driver)}</td>
            <td class="p-4 text-sm font-medium">
                <div class="${v.is_reg_expired ? 'text-rose-700 font-black' : v.is_reg_warning ? 'text-amber-700 font-bold' : 'text-slate-700'}">${escapeHtml(v.reg_expiry)}</div>
                ${regBadge}
            </td>
            <td class="p-4 text-sm font-medium">
                <div class="${v.is_maint_warning ? 'text-amber-600 font-bold' : 'text-slate-600'}">${escapeHtml(v.maint_date)}</div>
                ${maintBadge}
            </td>
            <td class="p-4">
                <span class="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider font-heading ${statusCls}">${escapeHtml(v.status)}</span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function loadFleetData() {
    try {
        const res = await fetchWithAuth('/api/fleet/');
        if (!res.ok) throw new Error('Lỗi tải đội xe');
        const data = await res.json();

        document.getElementById('fleet-stat-tractors').innerText = data.total_tractors;
        document.getElementById('fleet-stat-trailers').innerText = data.total_trailers;
        document.getElementById('fleet-stat-reg').innerText = data.reg_warning_count;
        document.getElementById('fleet-stat-maint').innerText = data.maint_warning_count;

        rawFleetVehicles = data.vehicles || [];
        populateFleetFilterDropdowns(rawFleetVehicles);
        applyFleetFilters();
    } catch (err) {
        console.error('Error loading fleet data:', err);
    }
}

// --- 8. SALE & BÁO GIÁ CRM & BOOKINGS CRUD ---
function onQuotationPricingMethodChange(method) {
    const fuelBox = document.getElementById('quote-fuel-adjustment-box');
    if (fuelBox) {
        if (method === 'FUEL_ADJUSTED') {
            fuelBox.classList.remove('hidden');
            updateFuelFormulaText();
        } else {
            fuelBox.classList.add('hidden');
        }
    }
}

function updateFuelFormulaText() {
    const basePrice = parseNumberVN(document.getElementById('quote-base-fuel-price')?.value) || 21000;
    const step = parseNumberVN(document.getElementById('quote-fuel-step')?.value) || 1000;
    const ratio = parseFloat(document.getElementById('quote-fuel-ratio')?.value) || 3.5;
    const formulaEl = document.getElementById('quote-fuel-formula-display');
    if (formulaEl) {
        formulaEl.innerText = `Mỗi khi giá dầu DO 0.05S Petrolimex thay đổi ${new Intl.NumberFormat('vi-VN').format(step)} đ/lít so với giá cơ sở (${new Intl.NumberFormat('vi-VN').format(basePrice)} đ), đơn giá cước vận chuyển sẽ điều chỉnh tăng/giảm tương ứng ${ratio}%.`;
    }
}

function addQuotationRouteRow(data = {}) {
    const tbody = document.getElementById('quote-routes-tbody');
    if (!tbody) return;

    const rowIdx = tbody.children.length + 1;
    const routeDesc = data.route_description || data.route || '';
    const cargoType = data.cargo_type || document.getElementById('quote-cargo-type')?.value || 'Cont 40HC';
    const estKm = data.estimated_km !== undefined ? data.estimated_km : 30;
    const unitPrice = data.unit_price !== undefined ? data.unit_price : 3800000;
    const trips = data.expected_trips_monthly !== undefined ? data.expected_trips_monthly : (data.monthly_trips || 20);
    const lineTotal = Number(unitPrice) * Number(trips);

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50/80 transition-colors quote-route-item-row';
    tr.innerHTML = `
        <td class="p-2 text-center font-bold text-slate-500 row-stt">${rowIdx}</td>
        <td class="p-2">
            <input type="text" value="${escapeHtml(routeDesc)}" placeholder="VD: CÁT LÁI ➔ KCN VSIP 2 BÌNH DƯƠNG" required
                class="quote-item-route w-full h-8 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-teal-600 font-bold text-slate-900 text-xs">
        </td>
        <td class="p-2">
            <select class="quote-item-cargo w-full h-8 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:border-teal-600">
                <option value="Cont 40HC" ${cargoType === 'Cont 40HC' ? 'selected' : ''}>Cont 40HC</option>
                <option value="Cont 20GP" ${cargoType === 'Cont 20GP' ? 'selected' : ''}>Cont 20GP</option>
                <option value="Cont 45ft" ${cargoType === 'Cont 45ft' ? 'selected' : ''}>Cont 45ft</option>
                <option value="Cont Flatrack / Lạnh" ${cargoType.includes('Flatrack') ? 'selected' : ''}>Cont Flatrack/RF</option>
                <option value="Xe tải 5 tấn" ${cargoType.includes('5 tấn') ? 'selected' : ''}>Xe tải 5T</option>
                <option value="Xe tải 10 tấn" ${cargoType.includes('10 tấn') ? 'selected' : ''}>Xe tải 10T</option>
                <option value="Xe tải 15 tấn" ${cargoType.includes('15 tấn') ? 'selected' : ''}>Xe tải 15T</option>
                <option value="Hàng rời / FTL" ${cargoType.includes('Hàng rời') ? 'selected' : ''}>Hàng rời / FTL</option>
            </select>
        </td>
        <td class="p-2 text-center">
            <input type="number" step="10" min="0" value="${estKm}" 
                class="quote-item-km w-16 h-8 px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-teal-600 font-bold text-slate-800 text-xs text-center tabular-nums">
        </td>
        <td class="p-2 text-right">
            <input type="text" inputmode="numeric" value="${formatNumberVN(unitPrice)}" oninput="calculateQuotationItemsTotal()" placeholder="0"
                class="quote-item-price input-number-vn w-28 h-8 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-teal-600 font-mono font-bold text-teal-800 text-xs text-right tabular-nums">
        </td>
        <td class="p-2 text-center">
            <input type="text" inputmode="numeric" value="${formatNumberVN(trips)}" oninput="calculateQuotationItemsTotal()" placeholder="1"
                class="quote-item-trips input-number-vn w-20 h-8 px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-teal-600 font-mono font-bold text-slate-800 text-xs text-center tabular-nums">
        </td>
        <td class="p-2 text-right font-black text-teal-900 font-mono tabular-nums quote-item-line-total text-xs">
            ${new Intl.NumberFormat('vi-VN').format(lineTotal)} đ
        </td>
        <td class="p-2 text-center">
            <button type="button" onclick="removeQuotationRouteRow(this)" title="Xóa tuyến này"
                class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer">
                <i class="ph-bold ph-trash text-sm"></i>
            </button>
        </td>
    `;
    tbody.appendChild(tr);
    initAllNumberInputs();
    calculateQuotationItemsTotal();
}

function removeQuotationRouteRow(button) {
    const tbody = document.getElementById('quote-routes-tbody');
    if (!tbody) return;
    const tr = button.closest('tr');
    if (tr) tr.remove();

    if (tbody.children.length === 0) {
        addQuotationRouteRow({ route_description: '', unit_price: 3800000, expected_trips_monthly: 10 });
    } else {
        Array.from(tbody.children).forEach((row, idx) => {
            const sttEl = row.querySelector('.row-stt');
            if (sttEl) sttEl.innerText = idx + 1;
        });
        calculateQuotationItemsTotal();
    }
}

function calculateQuotationItemsTotal() {
    const tbody = document.getElementById('quote-routes-tbody');
    if (!tbody) return;

    let totalRevenue = 0;
    let totalTrips = 0;
    const rows = Array.from(tbody.querySelectorAll('tr.quote-route-item-row'));

    rows.forEach(row => {
        const priceInput = row.querySelector('.quote-item-price');
        const tripsInput = row.querySelector('.quote-item-trips');
        const lineTotalEl = row.querySelector('.quote-item-line-total');

        const price = parseNumberVN(priceInput?.value) || 0;
        const trips = parseNumberVN(tripsInput?.value) || 0;
        const lineTotal = price * trips;

        if (lineTotalEl) {
            lineTotalEl.innerText = `${new Intl.NumberFormat('vi-VN').format(lineTotal)} đ`;
        }
        totalRevenue += lineTotal;
        totalTrips += trips;
    });

    const badgeEl = document.getElementById('quote-routes-count-badge');
    if (badgeEl) badgeEl.innerText = `${rows.length} tuyến`;

    const tripsLabel = document.getElementById('quote-total-monthly-trips-label');
    if (tripsLabel) tripsLabel.innerText = `${new Intl.NumberFormat('vi-VN').format(totalTrips)} chuyến/tháng`;

    const revEl = document.getElementById('quote-preview-revenue');
    if (revEl) {
        revEl.innerText = `${new Intl.NumberFormat('vi-VN').format(totalRevenue)} đ`;
    }
}

const DEFAULT_QUOTATION_NOTES = {
    fcl: `- Đơn giá trên chưa bao gồm thuế giá trị gia tăng VAT (8% / 10%).
- Chưa bao gồm phí bốc xếp hàng hóa & phí nâng hạ tại kho của Quý khách.
- Xe vận tải đúng tải trọng, tuân thủ nghiêm ngặt Luật Giao thông đường bộ.
- Thời gian neo xe: Miễn phí 12 giờ đầu kể từ khi xe đến kho; Phí neo tính sau 12h: Neo xe đầu kéo 1.500.000 VNĐ/đêm, Neo Mooc 1.000.000 VNĐ/đêm.
- Phía Triền Võ Logistics chịu toàn bộ chi phí nhiên liệu, lương lái xe và vé cầu đường BOT.
- Rất mong nhận được sự hợp tác lâu dài từ Quý Công ty.`,

    ftl: `- Đơn giá trên chưa bao gồm thuế giá trị gia tăng VAT và không bao gồm bốc xếp.
- Xe vận tải cam kết đi đúng tải trọng quy định pháp luật.
- Phía công ty thuê vận chuyển chịu cung cấp đầy đủ hóa đơn, chứng từ hợp pháp của hàng hóa.
- Phía TVL chịu toàn bộ chi phí nhiên liệu, lương tài xế, phí bảo trì phương tiện và vé BOT.
- Rất mong sự hợp tác từ Quý Công ty!`,

    fuel: `- Đơn giá trên chưa bao gồm thuế VAT.
- Phí bốc xếp tại kho do khách hàng chịu trách nhiệm.
- Đơn giá áp dụng theo mức giá dầu Diesel cơ sở tại thời điểm báo giá.
- Khi giá dầu thị trường biến động theo từng bước quy định, hai bên sẽ điều chỉnh đơn giá cước tương ứng.
- Phí Neo tính sau 12h kể từ khi xe đến kho: Neo xe: 1.500.000 VNĐ/đêm, Neo Mooc: 1.000.000 VNĐ/đêm.
- Hotline hỗ trợ 24/7: 0965 559 561 (Phòng Kinh Doanh).`
};

function setQuickQuoteNote(type) {
    const noteEl = document.getElementById('quote-notes');
    if (noteEl && DEFAULT_QUOTATION_NOTES[type]) {
        noteEl.value = DEFAULT_QUOTATION_NOTES[type];
    }
}

async function openModalQuotation(quoteId = null, isReadOnly = false) {
    await loadMasterDataFormOptions();
    populateMasterDataDropdowns();

    const form = document.getElementById('form-quotation');
    if (form) {
        form.reset();
        form.querySelectorAll('input, select, textarea').forEach(el => el.disabled = isReadOnly);
    }

    const titleEl = document.getElementById('modal-quotation-title');
    const submitBtn = document.getElementById('btn-submit-quote');
    const btnText = document.getElementById('btn-save-quote-text');
    const idInput = document.getElementById('quote-id');
    const routesTbody = document.getElementById('quote-routes-tbody');
    if (routesTbody) routesTbody.innerHTML = '';

    if (submitBtn) {
        submitBtn.style.display = isReadOnly ? 'none' : 'inline-flex';
    }

    if (!quoteId) {
        if (idInput) idInput.value = '';
        if (titleEl) titleEl.innerText = 'Thêm Báo Giá Tuyến Cước Mới';
        if (btnText) btnText.innerText = 'Lưu Báo Giá';

        const methodEl = document.getElementById('quote-pricing-method');
        if (methodEl) methodEl.value = 'MULTI_ROUTE';
        const p0Input = document.getElementById('quote-base-fuel-price');
        if (p0Input) p0Input.value = formatNumberVN(21000);
        const stepInput = document.getElementById('quote-fuel-step');
        if (stepInput) stepInput.value = formatNumberVN(1000);
        const ratioInput = document.getElementById('quote-fuel-ratio');
        if (ratioInput) ratioInput.value = '3.5';

        const tplEl = document.getElementById('quote-template-type');
        if (tplEl) tplEl.value = 'STANDARD';
        const cargoEl = document.getElementById('quote-cargo-type');
        if (cargoEl) cargoEl.value = 'Container 40HC / Hàng tổng hợp';
        const notesEl = document.getElementById('quote-notes');
        if (notesEl) notesEl.value = DEFAULT_QUOTATION_NOTES.fcl;

        onQuotationPricingMethodChange('MULTI_ROUTE');

        // Mặc định thêm 1 dòng mẫu
        addQuotationRouteRow({
            route_description: 'CÁT LÁI ➔ KCN VSIP 2 BÌNH DƯƠNG',
            cargo_type: 'Cont 40HC',
            estimated_km: 30,
            unit_price: 3800000,
            expected_trips_monthly: 20
        });
    } else {
        if (idInput) idInput.value = quoteId;
        if (titleEl) titleEl.innerText = isReadOnly ? 'Đang tải chi tiết báo giá...' : 'Đang tải thông tin báo giá...';
        if (btnText) btnText.innerText = 'Cập Nhật Báo Giá';

        try {
            const res = await fetchWithAuth(`/api/quotations/${quoteId}/`);
            if (!res.ok) throw new Error('Không thể tải báo giá');
            const q = await res.json();

            if (titleEl) {
                titleEl.innerText = isReadOnly 
                    ? `Chi Tiết Báo Giá [${q.quotation_code}]` 
                    : `Hiệu Chỉnh Báo Giá [${q.quotation_code}]`;
            }
            const custEl = document.getElementById('quote-customer');
            if (custEl) setSelectValueCaseInsensitive(custEl, q.customer_name);

            const methodEl = document.getElementById('quote-pricing-method');
            if (methodEl) methodEl.value = q.pricing_method || 'MULTI_ROUTE';

            const p0Input = document.getElementById('quote-base-fuel-price');
            if (p0Input) p0Input.value = formatNumberVN(q.base_fuel_price || 21000);
            const stepInput = document.getElementById('quote-fuel-step');
            if (stepInput) stepInput.value = formatNumberVN(q.fuel_step_vnd || 1000);
            const ratioInput = document.getElementById('quote-fuel-ratio');
            if (ratioInput) ratioInput.value = q.fuel_ratio_percent || 3.5;

            onQuotationPricingMethodChange(q.pricing_method || 'MULTI_ROUTE');

            const statusEl = document.getElementById('quote-status');
            if (statusEl) statusEl.value = q.status;
            const tplEl = document.getElementById('quote-template-type');
            if (tplEl) tplEl.value = q.template_type || 'STANDARD';
            const cargoEl = document.getElementById('quote-cargo-type');
            if (cargoEl) cargoEl.value = q.cargo_type || 'Container 40HC / Hàng tổng hợp';
            const contactPersonEl = document.getElementById('quote-contact-person');
            if (contactPersonEl) contactPersonEl.value = q.contact_person || '';
            const contactPhoneEl = document.getElementById('quote-contact-phone');
            if (contactPhoneEl) contactPhoneEl.value = q.contact_phone || '';
            const contactEmailEl = document.getElementById('quote-contact-email');
            if (contactEmailEl) contactEmailEl.value = q.contact_email || '';
            const validUntilEl = document.getElementById('quote-valid-until');
            if (validUntilEl) validUntilEl.value = q.valid_until || '';
            const notesEl = document.getElementById('quote-notes');
            if (notesEl) notesEl.value = q.notes || DEFAULT_QUOTATION_NOTES.fcl;

            if (q.items && q.items.length > 0) {
                q.items.forEach(it => addQuotationRouteRow(it));
            } else {
                addQuotationRouteRow({
                    route_description: q.route_description,
                    cargo_type: q.cargo_type || 'Cont 40HC',
                    estimated_km: q.estimated_km || 30,
                    unit_price: q.unit_price || 3800000,
                    expected_trips_monthly: q.expected_trips_monthly || 10
                });
            }

            if (isReadOnly && form) {
                form.querySelectorAll('input, select, textarea, button').forEach(el => {
                    if (el.id !== 'btn-print-quote-modal' && !el.getAttribute('onclick')?.includes('closeModal') && !el.getAttribute('onclick')?.includes('printQuotation')) {
                        el.disabled = true;
                    }
                });
            }
        } catch (err) {
            console.error('Lỗi tải chi tiết báo giá:', err);
            showToast('error', 'Không thể tải thông tin báo giá để xem/chỉnh sửa', 'Lỗi');
            return;
        }
    }

    initAllNumberInputs();
    openModal('modal-quotation');
}

async function saveQuotation(e) {
    if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
    }
    const id = document.getElementById('quote-id')?.value;
    const customer = document.getElementById('quote-customer')?.value?.trim();
    const pricingMethod = document.getElementById('quote-pricing-method')?.value || 'MULTI_ROUTE';
    const baseFuelPrice = parseNumberVN(document.getElementById('quote-base-fuel-price')?.value) || 21000;
    const fuelStep = parseNumberVN(document.getElementById('quote-fuel-step')?.value) || 1000;
    const fuelRatio = parseFloat(document.getElementById('quote-fuel-ratio')?.value) || 3.5;
    const statusVal = document.getElementById('quote-status')?.value || 'NEGOTIATING';
    const templateType = document.getElementById('quote-template-type')?.value || 'STANDARD';
    const cargoType = document.getElementById('quote-cargo-type')?.value || 'Container 40HC / Hàng tổng hợp';
    const contactPerson = document.getElementById('quote-contact-person')?.value?.trim() || '';
    const contactPhone = document.getElementById('quote-contact-phone')?.value?.trim() || '';
    const contactEmail = document.getElementById('quote-contact-email')?.value?.trim() || '';
    const validUntil = document.getElementById('quote-valid-until')?.value || '';
    const notes = document.getElementById('quote-notes')?.value || '';

    if (!customer) {
        showToast('warning', 'Vui lòng chọn khách hàng hợp lệ trong danh mục!', 'Thiếu Thông Tin');
        return;
    }

    // Thu thập danh sách các dòng tuyến đường
    const rows = Array.from(document.querySelectorAll('#quote-routes-tbody tr.quote-route-item-row'));
    const items = [];
    rows.forEach(row => {
        const route = row.querySelector('.quote-item-route')?.value?.trim();
        const cargo = row.querySelector('.quote-item-cargo')?.value || cargoType;
        const km = parseInt(row.querySelector('.quote-item-km')?.value) || 0;
        const price = parseNumberVN(row.querySelector('.quote-item-price')?.value) || 0;
        const trips = parseNumberVN(row.querySelector('.quote-item-trips')?.value) || 1;

        if (route) {
            items.push({
                route_description: route,
                cargo_type: cargo,
                estimated_km: km,
                unit_price: price,
                expected_trips_monthly: trips
            });
        }
    });

    if (items.length === 0) {
        showToast('warning', 'Vui lòng nhập ít nhất 1 tuyến đường báo giá hợp lệ!', 'Thiếu Thông Tin');
        return;
    }

    const submitBtn = document.getElementById('btn-submit-quote');
    const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="ph-bold ph-spinner animate-spin text-base"></i> <span>Đang lưu...</span>';
    }

    try {
        let res;
        const payload = {
            customer: customer,
            pricing_method: pricingMethod,
            base_fuel_price: baseFuelPrice,
            fuel_step_vnd: fuelStep,
            fuel_ratio_percent: fuelRatio,
            status: statusVal,
            template_type: templateType,
            cargo_type: cargoType,
            contact_person: contactPerson,
            contact_phone: contactPhone,
            contact_email: contactEmail,
            valid_until: validUntil,
            notes: notes,
            items: items,
            // Fallback fields
            route_description: items[0].route_description,
            unit_price: items[0].unit_price,
            expected_trips_monthly: items[0].expected_trips_monthly,
            monthly_trips: items[0].expected_trips_monthly,
            estimated_km: items[0].estimated_km
        };

        if (id) {
            res = await fetchWithAuth(`/api/quotations/${id}/`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
        } else {
            payload.action = 'create_quotation';
            res = await fetchWithAuth('/api/sales/', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        }

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || data.error || data.detail || 'Lỗi lưu báo giá');

        showToast('success', data.message || 'Lưu báo giá thành công!', 'Thành Công');
        closeModal('modal-quotation');
        loadSalesData();
    } catch (err) {
        console.error('Error saving quotation:', err);
        showToast('error', err.message || 'Không thể lưu báo giá', 'Lỗi');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHtml;
        }
    }
}

let currentPrintingQuotation = null;

async function openQuotationPrintModal(quoteIdOrData, templateType = null) {
    let q = null;
    if (typeof quoteIdOrData === 'object' && quoteIdOrData !== null) {
        q = quoteIdOrData;
    } else {
        try {
            const res = await fetchWithAuth(`/api/quotations/${quoteIdOrData}/`);
            if (!res.ok) throw new Error('Không thể tải chi tiết báo giá');
            q = await res.json();
        } catch (err) {
            console.error('Lỗi tải báo giá in:', err);
            showToast('error', 'Không thể tải thông tin báo giá để in', 'Lỗi');
            return;
        }
    }

    currentPrintingQuotation = q;
    const selectedTemplate = templateType || q.template_type || 'STANDARD';

    const selector = document.getElementById('quote-print-template-selector');
    if (selector) selector.value = selectedTemplate;

    const badgeCode = document.getElementById('quote-print-badge-code');
    if (badgeCode) badgeCode.innerText = q.quotation_code || q.code || 'BÁO GIÁ';

    const modalTitle = document.getElementById('quote-print-modal-title');
    if (modalTitle) modalTitle.innerText = `Báo Giá [${q.quotation_code || q.code || ''}] - ${q.customer_name || q.customer || ''}`;

    // Chuẩn bị danh sách items
    let items = q.items || [];
    if (!items || items.length === 0) {
        items = [{
            route_description: q.route_description || q.route || 'Tuyến vận chuyển chính',
            cargo_type: q.cargo_type || 'Cont 40HC',
            estimated_km: q.estimated_km || 0,
            unit_price: q.unit_price || 0,
            expected_trips_monthly: q.expected_trips_monthly || q.monthly_trips || 1
        }];
    }

    let grandTotal = 0;
    items.forEach(it => {
        grandTotal += Number(it.unit_price || 0) * Number(it.expected_trips_monthly || 1);
    });

    const amountInWords = (typeof numberToWordsVN === 'function') ? numberToWordsVN(grandTotal) : `${new Intl.NumberFormat('vi-VN').format(grandTotal)} đồng`;
    const createdDate = q.created_at || (new Date().toLocaleDateString('vi-VN'));
    const notesText = q.notes || DEFAULT_QUOTATION_NOTES.fcl;

    const now = new Date();
    const datePlaceStr = `Tp. Hồ Chí Minh, ngày ${String(now.getDate()).padStart(2, '0')} tháng ${String(now.getMonth() + 1).padStart(2, '0')} năm ${now.getFullYear()}`;

    const isFuelAdjusted = (q.pricing_method === 'FUEL_ADJUSTED') || Boolean(q.base_fuel_price && q.pricing_method === 'FUEL_ADJUSTED');
    const p0Val = Number(q.base_fuel_price || 21000);
    const stepVal = Number(q.fuel_step_vnd || 1000);
    const ratioVal = Number(q.fuel_ratio_percent || 3.5);
    const formulaText = q.fuel_surcharge_formula || `Mỗi khi giá dầu DO 0.05S Petrolimex thay đổi ${new Intl.NumberFormat('vi-VN').format(stepVal)} đ/lít so với giá cơ sở (${new Intl.NumberFormat('vi-VN').format(p0Val)} đ), đơn giá cước vận chuyển sẽ điều chỉnh tăng/giảm tương ứng ${ratioVal}%.`;

    // 1. Điền dữ liệu MẪU 1: STANDARD (TVL Tiêu Chuẩn)
    const p1DatePlace = document.getElementById('print-q1-date-place');
    if (p1DatePlace) p1DatePlace.innerText = datePlaceStr;

    const p1CodeSub = document.getElementById('print-q1-code-sub');
    if (p1CodeSub) p1CodeSub.innerText = `Số: ${q.quotation_code || q.code || 'BG'}`;

    const p1CustName = document.getElementById('print-q1-customer-name');
    if (p1CustName) p1CustName.innerText = q.customer_name || q.customer || 'QUÝ KHÁCH HÀNG';

    const p1Contact = document.getElementById('print-q1-contact-person');
    if (p1Contact) p1Contact.innerText = q.contact_person || q.customer_contact || 'Phòng Xuất Nhập Khẩu / Logistics';

    const p1Phone = document.getElementById('print-q1-contact-phone');
    if (p1Phone) p1Phone.innerText = q.contact_phone || q.customer_phone || '0965 559 561';

    const p1Address = document.getElementById('print-q1-customer-address');
    if (p1Address) p1Address.innerText = q.customer_address || 'Địa chỉ kho khách hàng';

    const p1Tax = document.getElementById('print-q1-tax-code');
    if (p1Tax) p1Tax.innerText = q.customer_tax_code || 'Chưa cập nhật';

    // Render bảng Mẫu 1
    const p1Tbody = document.getElementById('print-q1-table-body');
    if (p1Tbody) {
        p1Tbody.innerHTML = items.map((it, idx) => {
            const lineTotal = Number(it.unit_price || 0) * Number(it.expected_trips_monthly || 1);
            return `
                <tr>
                    <td class="border border-slate-400 p-2 text-center font-bold">${idx + 1}</td>
                    <td class="border border-slate-400 p-2 font-bold text-slate-900">${escapeHtml(it.route_description || it.route || '')}</td>
                    <td class="border border-slate-400 p-2 text-center">${escapeHtml(it.cargo_type || q.cargo_type || 'Cont 40HC')}</td>
                    <td class="border border-slate-400 p-2 text-center font-semibold tabular-nums">${it.estimated_km || 0} km</td>
                    <td class="border border-slate-400 p-2 text-right font-bold text-slate-950 tabular-nums">${new Intl.NumberFormat('vi-VN').format(it.unit_price || 0)} đ</td>
                    <td class="border border-slate-400 p-2 text-center font-semibold tabular-nums">${new Intl.NumberFormat('vi-VN').format(it.expected_trips_monthly || 1)} chuyến</td>
                    <td class="border border-slate-400 p-2 text-right font-black text-slate-950 tabular-nums">${new Intl.NumberFormat('vi-VN').format(lineTotal)} đ</td>
                </tr>
            `;
        }).join('');
    }

    const p1GrandTotal = document.getElementById('print-q1-grand-total');
    if (p1GrandTotal) p1GrandTotal.innerText = `${new Intl.NumberFormat('vi-VN').format(grandTotal)} VNĐ`;

    const p1TotalWords = document.getElementById('print-q1-total-words');
    if (p1TotalWords) p1TotalWords.innerText = amountInWords;

    const p1FuelBox = document.getElementById('print-q1-fuel-box');
    if (p1FuelBox) {
        if (isFuelAdjusted) {
            p1FuelBox.classList.remove('hidden');
            const p0El = document.getElementById('print-q1-fuel-p0');
            if (p0El) p0El.innerText = `${new Intl.NumberFormat('vi-VN').format(p0Val)} đ/lít`;
            const stepEl = document.getElementById('print-q1-fuel-step');
            if (stepEl) stepEl.innerText = `±${new Intl.NumberFormat('vi-VN').format(stepVal)} đ/lít`;
            const ratioEl = document.getElementById('print-q1-fuel-ratio');
            if (ratioEl) ratioEl.innerText = `±${ratioVal}% cước`;
            const formEl = document.getElementById('print-q1-fuel-formula');
            if (formEl) formEl.innerText = formulaText;
        } else {
            p1FuelBox.classList.add('hidden');
        }
    }

    const p1Notes = document.getElementById('print-q1-notes-content');
    if (p1Notes) p1Notes.innerText = notesText;

    const p1SignCust = document.getElementById('print-q1-sign-customer');
    if (p1SignCust) p1SignCust.innerText = q.customer_name || q.customer || 'Đại diện khách hàng';

    // 2. Điền dữ liệu MẪU 2: TABLE_MATRIX
    const p2ToName = document.getElementById('print-q2-to-name');
    if (p2ToName) p2ToName.innerText = q.customer_name || q.customer || '';

    const p2ToAttn = document.getElementById('print-q2-to-attn');
    if (p2ToAttn) p2ToAttn.innerText = q.contact_person || q.customer_contact || 'Ban Giám Đốc / P.Logistics';

    const p2ToEmail = document.getElementById('print-q2-to-email');
    if (p2ToEmail) p2ToEmail.innerText = q.contact_email || 'logistics@customer.com';

    const p2ToTel = document.getElementById('print-q2-to-tel');
    if (p2ToTel) p2ToTel.innerText = q.contact_phone || q.customer_phone || '';

    const p2Date = document.getElementById('print-q2-date');
    if (p2Date) p2Date.innerText = createdDate;

    const p2Cargo = document.getElementById('print-q2-cargo');
    if (p2Cargo) p2Cargo.innerText = q.cargo_type || 'Container & Hàng tổng hợp';

    const p2Tbody = document.getElementById('print-q2-tbody');
    if (p2Tbody) {
        p2Tbody.innerHTML = items.map((it, idx) => {
            const lineTotal = Number(it.unit_price || 0) * Number(it.expected_trips_monthly || 1);
            return `
                <tr>
                    <td class="border border-slate-900 p-2 text-center font-bold">${idx + 1}</td>
                    <td class="border border-slate-900 p-2 font-bold text-slate-900">${escapeHtml(it.route_description || it.route || '')}</td>
                    <td class="border border-slate-900 p-2 text-center font-semibold">${escapeHtml(it.cargo_type || q.cargo_type || 'Cont 40HC')}</td>
                    <td class="border border-slate-900 p-2 text-center">${it.estimated_km || 0} km</td>
                    <td class="border border-slate-900 p-2 text-right font-black font-mono">${new Intl.NumberFormat('vi-VN').format(it.unit_price || 0)} đ</td>
                    <td class="border border-slate-900 p-2 text-center font-semibold">${new Intl.NumberFormat('vi-VN').format(it.expected_trips_monthly || 1)} chuyến</td>
                    <td class="border border-slate-900 p-2 text-right font-black font-mono text-slate-950">${new Intl.NumberFormat('vi-VN').format(lineTotal)} đ</td>
                </tr>
            `;
        }).join('');
    }

    const p2GrandTotal = document.getElementById('print-q2-grand-total');
    if (p2GrandTotal) p2GrandTotal.innerText = `${new Intl.NumberFormat('vi-VN').format(grandTotal)} VNĐ`;

    const p2FuelBox = document.getElementById('print-q2-fuel-box');
    if (p2FuelBox) {
        if (isFuelAdjusted) {
            p2FuelBox.classList.remove('hidden');
            const descEl = document.getElementById('print-q2-fuel-desc');
            if (descEl) descEl.innerText = formulaText;
        } else {
            p2FuelBox.classList.add('hidden');
        }
    }

    const p2Notes = document.getElementById('print-q2-notes');
    if (p2Notes) p2Notes.innerText = notesText;

    const p2SignCust = document.getElementById('print-q2-sign-cust');
    if (p2SignCust) p2SignCust.innerText = q.customer_name || q.customer || 'Đại diện khách hàng';

    // 3. Điền dữ liệu MẪU 3: PROJECT_DETAIL
    const p3Code = document.getElementById('print-q3-code');
    if (p3Code) p3Code.innerText = `Số: ${q.quotation_code || q.code || ''}`;

    const p3Cust = document.getElementById('print-q3-customer');
    if (p3Cust) p3Cust.innerText = q.customer_name || q.customer || '';

    const p3Tbody = document.getElementById('print-q3-tbody');
    if (p3Tbody) {
        p3Tbody.innerHTML = items.map((it, idx) => {
            const lineTotal = Number(it.unit_price || 0) * Number(it.expected_trips_monthly || 1);
            return `
                <tr>
                    <td class="border border-slate-300 p-2 text-center">${idx + 1}</td>
                    <td class="border border-slate-300 p-2 font-bold">${escapeHtml(it.route_description || it.route || '')}</td>
                    <td class="border border-slate-300 p-2 text-center">${escapeHtml(it.cargo_type || q.cargo_type || 'Cont 40HC')}</td>
                    <td class="border border-slate-300 p-2 text-center font-semibold">${new Intl.NumberFormat('vi-VN').format(it.expected_trips_monthly || 1)} chuyến</td>
                    <td class="border border-slate-300 p-2 text-right font-mono">${new Intl.NumberFormat('vi-VN').format(it.unit_price || 0)} đ</td>
                    <td class="border border-slate-300 p-2 text-right font-black font-mono">${new Intl.NumberFormat('vi-VN').format(lineTotal)} đ</td>
                </tr>
            `;
        }).join('');
    }

    const p3GrandTotal = document.getElementById('print-q3-grand-total');
    if (p3GrandTotal) p3GrandTotal.innerText = `${new Intl.NumberFormat('vi-VN').format(grandTotal)} VNĐ`;

    const p3Words = document.getElementById('print-q3-words');
    if (p3Words) p3Words.innerText = amountInWords;

    const p3FuelBox = document.getElementById('print-q3-fuel-box');
    if (p3FuelBox) {
        if (isFuelAdjusted) {
            p3FuelBox.classList.remove('hidden');
            const descEl = document.getElementById('print-q3-fuel-desc');
            if (descEl) descEl.innerText = formulaText;
        } else {
            p3FuelBox.classList.add('hidden');
        }
    }

    const p3Notes = document.getElementById('print-q3-notes');
    if (p3Notes) p3Notes.innerText = notesText;

    const p3SignDate = document.getElementById('print-q3-sign-date');
    if (p3SignDate) p3SignDate.innerText = datePlaceStr;

    // Đồng bộ thông tin công ty hệ thống lên mẫu in
    syncCompanyProfileToPrintForms();

    switchQuotationPrintTemplate(selectedTemplate);

    const modal = document.getElementById('modal-quotation-print');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeQuotationPrintModal() {
    const modal = document.getElementById('modal-quotation-print');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function switchQuotationPrintTemplate(templateType) {
    const tplStandard = document.getElementById('quote-tpl-standard');
    const tplMatrix = document.getElementById('quote-tpl-matrix');
    const tplDetail = document.getElementById('quote-tpl-detail');

    if (tplStandard) tplStandard.classList.add('hidden');
    if (tplMatrix) tplMatrix.classList.add('hidden');
    if (tplDetail) tplDetail.classList.add('hidden');

    if (templateType === 'TABLE_MATRIX') {
        if (tplMatrix) tplMatrix.classList.remove('hidden');
    } else if (templateType === 'PROJECT_DETAIL') {
        if (tplDetail) tplDetail.classList.remove('hidden');
    } else {
        if (tplStandard) tplStandard.classList.remove('hidden');
    }
}

function printQuotationVoucher() {
    document.body.classList.add('is-printing-quotation');
    document.body.classList.remove('is-printing-voucher', 'is-printing-report');
    window.print();
}

function printQuotationFromModal() {
    const id = document.getElementById('quote-id')?.value;
    const custSelect = document.getElementById('quote-customer');
    const customer = custSelect ? (custSelect.options[custSelect.selectedIndex]?.text || '') : '';
    const pricingMethod = document.getElementById('quote-pricing-method')?.value || 'MULTI_ROUTE';
    const baseFuelPrice = parseNumberVN(document.getElementById('quote-base-fuel-price')?.value) || 21000;
    const fuelStep = parseNumberVN(document.getElementById('quote-fuel-step')?.value) || 1000;
    const fuelRatio = parseFloat(document.getElementById('quote-fuel-ratio')?.value) || 3.5;
    const templateType = document.getElementById('quote-template-type')?.value || 'STANDARD';
    const cargoType = document.getElementById('quote-cargo-type')?.value || 'Container 40HC / Hàng tổng hợp';
    const contactPerson = document.getElementById('quote-contact-person')?.value || '';
    const contactPhone = document.getElementById('quote-contact-phone')?.value || '';
    const contactEmail = document.getElementById('quote-contact-email')?.value || '';
    const validUntil = document.getElementById('quote-valid-until')?.value || '';
    const notes = document.getElementById('quote-notes')?.value || '';

    // Thu thập danh sách items từ các hàng đang nhập
    const rows = Array.from(document.querySelectorAll('#quote-routes-tbody tr.quote-route-item-row'));
    const items = [];
    rows.forEach(row => {
        const route = row.querySelector('.quote-item-route')?.value?.trim();
        const cargo = row.querySelector('.quote-item-cargo')?.value || cargoType;
        const km = parseInt(row.querySelector('.quote-item-km')?.value) || 0;
        const price = parseNumberVN(row.querySelector('.quote-item-price')?.value) || 0;
        const trips = parseNumberVN(row.querySelector('.quote-item-trips')?.value) || 1;

        if (route) {
            items.push({
                route_description: route,
                cargo_type: cargo,
                estimated_km: km,
                unit_price: price,
                expected_trips_monthly: trips
            });
        }
    });

    const quoteData = {
        id: id,
        quotation_code: id ? `BG-${id}` : 'BG-DRAFT',
        customer_name: customer.replace(/^[^-]+-\s*/, '').trim(),
        pricing_method: pricingMethod,
        base_fuel_price: baseFuelPrice,
        fuel_step_vnd: fuelStep,
        fuel_ratio_percent: fuelRatio,
        fuel_surcharge_formula: `Mỗi khi giá dầu DO 0.05S Petrolimex thay đổi ${new Intl.NumberFormat('vi-VN').format(fuelStep)} đ/lít so với giá cơ sở (${new Intl.NumberFormat('vi-VN').format(baseFuelPrice)} đ), đơn giá cước vận chuyển sẽ điều chỉnh tăng/giảm tương ứng ${fuelRatio}%.`,
        template_type: templateType,
        cargo_type: cargoType,
        contact_person: contactPerson,
        contact_phone: contactPhone,
        contact_email: contactEmail,
        valid_until: validUntil,
        notes: notes,
        items: items
    };

    openQuotationPrintModal(quoteData, templateType);
}

async function changeQuotationStatus(quoteId, newStatus) {
    if (!newStatus) return;
    try {
        const res = await fetchWithAuth(`/api/quotations/${quoteId}/status/`, {
            method: 'PATCH',
            body: JSON.stringify({ status: newStatus })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || data.error || data.detail || 'Lỗi chuyển trạng thái');

        showToast('success', data.message || 'Đã cập nhật trạng thái báo giá', 'Thành Công');
        loadSalesData();
    } catch (err) {
        console.error('Error updating quotation status:', err);
        showToast('error', err.message || 'Lỗi đổi trạng thái', 'Lỗi');
    }
}

async function deleteQuotation(quoteId) {
    const confirmed = await showConfirmModal({
        title: 'Xóa Báo Giá',
        message: 'Bạn có chắc chắn muốn xóa báo giá này không?\n\nDữ liệu lịch sử sẽ được bảo lưu an toàn (Soft-Delete).',
        confirmText: 'Xác Nhận Xóa',
        cancelText: 'Huỷ bỏ',
        type: 'danger',
        icon: 'ph-bold ph-trash text-2xl'
    });
    if (!confirmed) return;
    try {
        const res = await fetchWithAuth(`/api/quotations/${quoteId}/`, {
            method: 'DELETE'
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || data.error || data.detail || 'Lỗi xóa báo giá');

        showToast('success', data.message || 'Đã xóa báo giá', 'Thành Công');
        loadSalesData();
    } catch (err) {
        console.error('Error deleting quotation:', err);
        showToast('error', err.message || 'Lỗi xóa báo giá', 'Lỗi');
    }
}

function onBookingTypeChange() {
    const type = document.getElementById('booking-type')?.value;
    const shipInput = document.getElementById('booking-shipping-line');
    const pickupInput = document.getElementById('booking-pickup');
    const dropoffInput = document.getElementById('booking-dropoff');

    if (type === 'DOMESTIC') {
        if (shipInput && !shipInput.value) shipInput.value = 'NỘI ĐỊA';
        if (pickupInput && !pickupInput.value) pickupInput.placeholder = 'Kho bốc / Nhà máy A...';
        if (dropoffInput && !dropoffInput.value) dropoffInput.placeholder = 'Kho dỡ / Điểm giao B...';
    } else if (type === 'EXPORT_FCL') {
        if (shipInput && shipInput.value === 'NỘI ĐỊA') shipInput.value = '';
        if (pickupInput) pickupInput.placeholder = 'VD: Bãi cấp rỗng Solog, Sowatco...';
        if (dropoffInput) dropoffInput.placeholder = 'VD: Cảng Gemalink, Cát Lái...';
    } else if (type === 'IMPORT_FCL') {
        if (shipInput && shipInput.value === 'NỘI ĐỊA') shipInput.value = '';
        if (pickupInput) pickupInput.placeholder = 'VD: Cảng Cát Lái, Cái Mép...';
        if (dropoffInput) dropoffInput.placeholder = 'VD: Bãi trả rỗng Tân Cảng...';
    }
}

async function openModalBooking(bookingId = null, isReadOnly = false) {
    await loadMasterDataFormOptions();
    populateMasterDataDropdowns();

    const form = document.getElementById('form-booking');
    if (form) {
        form.reset();
        form.querySelectorAll('input, select, textarea').forEach(el => el.disabled = isReadOnly);
    }

    const titleEl = document.getElementById('modal-booking-title');
    const submitBtn = document.getElementById('btn-submit-booking');
    const btnText = document.getElementById('btn-save-booking-text');
    const idInput = document.getElementById('booking-id');

    if (submitBtn) {
        submitBtn.style.display = isReadOnly ? 'none' : 'inline-flex';
    }

    const todayStr = new Date().toISOString().split('T')[0];

    if (!bookingId) {
        currentEditingBookingId = null;
        if (idInput) idInput.value = '';
        if (titleEl) titleEl.innerText = 'Tiếp Nhận Đơn Đặt Hàng / Booking Mới Từ Khách Hàng';
        if (btnText) btnText.innerText = 'Tiếp Nhận Đơn Hàng';
        const dateInput = document.getElementById('booking-loading-date');
        if (dateInput) dateInput.value = todayStr;
        const timeInput = document.getElementById('booking-loading-time');
        if (timeInput) timeInput.value = '08:00';
        const closingDateInput = document.getElementById('booking-closing-date');
        if (closingDateInput) closingDateInput.value = todayStr;
        const closingTimeValInput = document.getElementById('booking-closing-time-val');
        if (closingTimeValInput) closingTimeValInput.value = '17:00';
        syncBookingClosingTime();
        const siDateInput = document.getElementById('booking-si-date');
        if (siDateInput) siDateInput.value = todayStr;
        const siTimeValInput = document.getElementById('booking-si-time-val');
        if (siTimeValInput) siTimeValInput.value = '12:00';
        syncBookingSiTime();
        const totalInput = document.getElementById('booking-total-containers');
        if (totalInput) totalInput.value = formatNumberVN(1);
        const detInput = document.getElementById('booking-det');
        if (detInput) detInput.value = formatNumberVN(7);
        const demInput = document.getElementById('booking-dem');
        if (demInput) demInput.value = formatNumberVN(7);
        const priceInput = document.getElementById('booking-price');
        if (priceInput) priceInput.value = formatNumberVN(4000000);
        clearSaleBookingFileSelection();
        onBookingTypeChange();
    } else {
        currentEditingBookingId = bookingId;
        if (idInput) idInput.value = bookingId;
        if (titleEl) titleEl.innerText = isReadOnly ? 'Đang tải chi tiết đơn hàng / booking...' : 'Đang tải thông tin đơn hàng / booking...';
        if (btnText) btnText.innerText = 'Cập Nhật Đơn Hàng';

        try {
            const res = await fetchWithAuth(`/api/bookings/${bookingId}/`);
            if (!res.ok) throw new Error('Không thể tải chi tiết đơn hàng / booking');
            const b = await res.json();

            if (titleEl) {
                titleEl.innerText = isReadOnly 
                    ? `Chi Tiết Đơn Hàng / Booking [${b.booking_code}]` 
                    : `Hiệu Chỉnh Đơn Hàng / Booking [${b.booking_code}]`;
            }
            
            const typeEl = document.getElementById('booking-type');
            if (typeEl) typeEl.value = b.booking_type || 'EXPORT_FCL';
            const custEl = document.getElementById('booking-customer');
            if (custEl) setSelectValueCaseInsensitive(custEl, b.customer_name);
            const numEl = document.getElementById('booking-number');
            if (numEl) numEl.value = b.booking_number || '';
            const shipEl = document.getElementById('booking-shipping-line');
            if (shipEl) shipEl.value = b.shipping_line || '';
            const vesEl = document.getElementById('booking-vessel');
            if (vesEl) vesEl.value = b.vessel_voyage || '';
            const sizeEl = document.getElementById('booking-container-size');
            if (sizeEl) setSelectValueCaseInsensitive(sizeEl, b.container_size || '40HC');
            const totalEl = document.getElementById('booking-total-containers');
            if (totalEl) totalEl.value = formatNumberVN(b.total_containers || 1);
            const comEl = document.getElementById('booking-commodity');
            if (comEl) comEl.value = b.commodity || '';
            const hsEl = document.getElementById('booking-hs-code');
            if (hsEl) hsEl.value = b.hs_code || '';
            const pickEl = document.getElementById('booking-pickup');
            if (pickEl) setSelectValueCaseInsensitive(pickEl, b.pickup_location);
            const delEl = document.getElementById('booking-delivery');
            if (delEl) setSelectValueCaseInsensitive(delEl, b.delivery_location);
            const dropEl = document.getElementById('booking-dropoff');
            if (dropEl) setSelectValueCaseInsensitive(dropEl, b.dropoff_location);
            const dateEl = document.getElementById('booking-loading-date');
            if (dateEl) dateEl.value = b.loading_date || todayStr;
            const timeEl = document.getElementById('booking-loading-time');
            if (timeEl) timeEl.value = b.loading_time || '08:00';
            parseAndSetDateTimeFields(b.closing_time, 'booking-closing-date', 'booking-closing-time-val', 'booking-closing-time', '17:00');
            parseAndSetDateTimeFields(b.si_cutoff, 'booking-si-date', 'booking-si-time-val', 'booking-si-cutoff', '12:00');
            const detEl = document.getElementById('booking-det');
            if (detEl) detEl.value = formatNumberVN(b.free_time_detention ?? 7);
            const demEl = document.getElementById('booking-dem');
            if (demEl) demEl.value = formatNumberVN(b.free_time_demurrage ?? 7);
            const priceEl = document.getElementById('booking-price');
            if (priceEl) priceEl.value = formatNumberVN(b.selling_freight_price || b.freight_price || 4000000);
            const statusEl = document.getElementById('booking-status');
            if (statusEl) statusEl.value = b.status || 'PENDING_DISPATCH';
            const notesEl = document.getElementById('booking-notes');
            if (notesEl) notesEl.value = b.notes || '';

            // Hiển thị file booking đính kèm (nếu có hoặc danh sách documents)
            showSaleExistingBookingFile(b.booking_file_url, b.booking_file_name, b.documents);

            // Render danh sách container của Booking & Theo dõi Cắt Kéo
            const tripsTbody = document.getElementById('booking-trips-tbody');
            const tripsCountBadge = document.getElementById('booking-trips-count-badge');
            if (tripsTbody) {
                if (b.trips && b.trips.length > 0) {
                    if (tripsCountBadge) {
                        tripsCountBadge.innerText = `${b.trips.length} / ${b.total_containers} Container`;
                    }
                    tripsTbody.innerHTML = b.trips.map(t => {
                        const modeBadge = t.is_split_trip
                            ? `<span class="px-2 py-0.5 rounded font-black text-[10px] uppercase bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1" title="Chế độ Cắt Kéo (Drop & Hook) - Tài lấy & Tài hạ khác nhau">
                                <i class="ph-bold ph-arrows-split"></i> Cắt Kéo (${t.driver_split_ratio}%/${100 - t.driver_split_ratio}%)
                               </span>`
                            : `<span class="px-2 py-0.5 rounded font-black text-[10px] uppercase bg-teal-50 text-teal-700 border border-teal-200 inline-flex items-center gap-1">
                                <i class="ph-bold ph-arrow-right"></i> Chạy Thẳng
                               </span>`;
                        
                        const statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-800 border border-slate-200">${t.status_label || t.status}</span>`;

                        const locBadge = `<span class="px-1.5 py-0.5 rounded text-[11px] font-bold ${t.cont_location_type === 'NHÀ MÁY' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-700 border border-slate-200'}">${t.cont_location_type || 'NHÀ MÁY'}</span>`;

                        return `
                            <tr class="hover:bg-slate-50 transition-colors">
                                <td class="p-2.5">
                                    <p class="font-bold text-slate-900 font-mono text-xs">${t.trip_code}</p>
                                    <p class="text-[11px] font-mono text-indigo-700 font-bold">${t.container_number}</p>
                                </td>
                                <td class="p-2.5">${modeBadge}</td>
                                <td class="p-2.5">
                                    <p class="font-bold text-slate-900">${t.driver}</p>
                                    <p class="text-[11px] text-slate-500 font-medium">Xe: ${t.vehicle}</p>
                                </td>
                                <td class="p-2.5">
                                    ${t.is_split_trip ? `
                                        <p class="font-bold text-amber-900">${t.dropoff_driver || 'Chưa gán'}</p>
                                        <p class="text-[11px] text-slate-500 font-medium">Xe: ${t.dropoff_vehicle || '-'}</p>
                                    ` : `
                                        <span class="text-slate-400 italic text-[11px]">(Tài xế chặng 1)</span>
                                    `}
                                </td>
                                <td class="p-2.5">${locBadge}</td>
                                <td class="p-2.5">${statusBadge}</td>
                                <td class="p-2.5 text-center">
                                    <button type="button" onclick="closeModal('modal-booking'); viewTripDetail('${t.trip_code}')" 
                                        class="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition-colors inline-flex items-center gap-1 font-heading" title="Xem chi tiết chuyến xe">
                                        <i class="ph-bold ph-arrow-square-out"></i> Xem
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('');
                } else {
                    if (tripsCountBadge) {
                        tripsCountBadge.innerText = `0 / ${b.total_containers} Container`;
                    }
                    tripsTbody.innerHTML = `
                        <tr>
                            <td colspan="7" class="p-4 text-center text-slate-400 italic">
                                Chưa có container nào được phát lệnh điều xe từ Booking này. Bấm "Điều Xe" bên ngoài để phát lệnh.
                            </td>
                        </tr>
                    `;
                }
            }

            onBookingTypeChange();
        } catch (err) {
            console.error('Lỗi tải chi tiết booking:', err);
            showToast('error', 'Không thể tải thông tin đơn hàng để xem/chỉnh sửa', 'Lỗi');
            return;
        }
    }

    initAllNumberInputs();
    openModal('modal-booking');
}

async function saveBooking(e) {
    if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
    }
    const id = document.getElementById('booking-id')?.value;
    const bookingType = document.getElementById('booking-type')?.value || 'EXPORT_FCL';
    const customer = document.getElementById('booking-customer')?.value?.trim();
    const bookingNumber = document.getElementById('booking-number')?.value?.trim();
    const shippingLine = document.getElementById('booking-shipping-line')?.value?.trim();
    const vessel = document.getElementById('booking-vessel')?.value?.trim();
    const containerSize = document.getElementById('booking-container-size')?.value || '40HC';
    const totalContainers = parseNumberVN(document.getElementById('booking-total-containers')?.value) || 1;
    const commodity = document.getElementById('booking-commodity')?.value?.trim();
    const hsCode = document.getElementById('booking-hs-code')?.value?.trim();
    const pickup = document.getElementById('booking-pickup')?.value?.trim();
    const delivery = document.getElementById('booking-delivery')?.value?.trim();
    const dropoff = document.getElementById('booking-dropoff')?.value?.trim();
    const loadingDate = document.getElementById('booking-loading-date')?.value;
    const loadingTime = document.getElementById('booking-loading-time')?.value?.trim() || '08:00';
    syncBookingClosingTime();
    syncBookingSiTime();
    const closingTime = document.getElementById('booking-closing-time')?.value?.trim();
    const siCutoff = document.getElementById('booking-si-cutoff')?.value?.trim();
    const det = parseNumberVN(document.getElementById('booking-det')?.value) || 7;
    const dem = parseNumberVN(document.getElementById('booking-dem')?.value) || 7;
    const price = parseNumberVN(document.getElementById('booking-price')?.value) || 0;
    const statusVal = document.getElementById('booking-status')?.value || 'PENDING_DISPATCH';
    const notes = document.getElementById('booking-notes')?.value?.trim();

    if (!customer || !bookingNumber || !pickup || !delivery || !dropoff) {
        showToast('warning', 'Vui lòng điền đủ: Khách hàng, Số đơn/booking và Lộ trình 3 điểm', 'Thiếu Thông Tin');
        return;
    }

    const submitBtn = document.getElementById('btn-submit-booking');
    const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="ph-bold ph-spinner animate-spin text-base"></i> <span>Đang lưu...</span>';
    }

    try {
        const saleFileInput = document.getElementById('booking-order-file');
        const hasSaleFile = saleFileInput && saleFileInput.files && saleFileInput.files[0];

        const formData = new FormData();
        formData.append('action', 'create_booking');
        formData.append('booking_type', bookingType);
        formData.append('customer', customer);
        formData.append('booking_number', bookingNumber);
        formData.append('shipping_line', shippingLine);
        formData.append('vessel_voyage', vessel);
        formData.append('container_size', containerSize);
        formData.append('total_containers', totalContainers);
        formData.append('commodity', commodity);
        formData.append('hs_code', hsCode);
        formData.append('pickup_location', pickup);
        formData.append('delivery_location', delivery);
        formData.append('dropoff_location', dropoff);
        formData.append('loading_date', loadingDate || '');
        formData.append('loading_time', loadingTime);
        formData.append('closing_time', closingTime || '');
        formData.append('si_cutoff', siCutoff || '');
        formData.append('free_time_detention', det);
        formData.append('free_time_demurrage', dem);
        formData.append('selling_freight_price', price);
        formData.append('status', statusVal);
        formData.append('notes', notes || '');

        if (saleBookingFilesList && saleBookingFilesList.length > 0) {
            formData.append('booking_file', saleBookingFilesList[0]);
            saleBookingFilesList.forEach(file => {
                formData.append('booking_files', file);
            });
        } else if (hasSaleFile) {
            formData.append('booking_file', saleFileInput.files[0]);
        }

        let res;
        if (id) {
            res = await fetchWithAuth(`/api/bookings/${id}/`, {
                method: 'PUT',
                body: formData
            });
        } else {
            res = await fetchWithAuth('/api/sales/', {
                method: 'POST',
                body: formData
            });
        }

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || data.error || data.detail || 'Lỗi lưu đơn hàng / booking');

        showToast('success', data.message || 'Tiếp nhận đơn hàng thành công!', 'Thành Công');
        closeModal('modal-booking');
        clearSaleBookingFileSelection();
        loadSalesData();
        loadActiveBookingsForModal();
    } catch (err) {
        console.error('Error saving booking:', err);
        showToast('error', err.message || 'Không thể lưu đơn hàng / booking', 'Lỗi');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHtml;
        }
    }
}

async function changeBookingStatus(bookingId, newStatus) {
    if (!newStatus) return;
    try {
        const res = await fetchWithAuth(`/api/bookings/${bookingId}/status/`, {
            method: 'PATCH',
            body: JSON.stringify({ status: newStatus })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || data.error || data.detail || 'Lỗi chuyển trạng thái');

        showToast('success', data.message || 'Đã cập nhật trạng thái đơn hàng', 'Thành Công');
        loadSalesData();
        loadActiveBookingsForModal();
    } catch (err) {
        console.error('Error updating booking status:', err);
        showToast('error', err.message || 'Lỗi đổi trạng thái đơn hàng', 'Lỗi');
    }
}

async function deleteBooking(bookingId) {
    const confirmed = await showConfirmModal({
        title: 'Hủy / Xóa Đơn Hàng',
        message: 'Bạn có chắc chắn muốn xóa / hủy đơn hàng này không?\n\nDữ liệu lịch sử sẽ được bảo lưu an toàn (Soft-Delete).',
        confirmText: 'Xác Nhận Xóa',
        cancelText: 'Huỷ bỏ',
        type: 'danger',
        icon: 'ph-bold ph-trash text-2xl'
    });
    if (!confirmed) return;
    try {
        const res = await fetchWithAuth(`/api/bookings/${bookingId}/`, {
            method: 'DELETE'
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || data.error || data.detail || 'Lỗi xóa đơn hàng');

        showToast('success', data.message || 'Đã xóa đơn hàng / booking', 'Thành Công');
        loadSalesData();
        loadActiveBookingsForModal();
    } catch (err) {
        console.error('Error deleting booking:', err);
        showToast('error', err.message || 'Lỗi xóa đơn hàng / booking', 'Lỗi');
    }
}

function switchSalesSubTab(tabName) {
    const tabQuotesBtn = document.getElementById('tab-btn-quotations');
    const tabBookingsBtn = document.getElementById('tab-btn-bookings');
    const subtabQuotes = document.getElementById('subtab-sales-quotations');
    const subtabBookings = document.getElementById('subtab-sales-bookings');
    const roleHint = document.getElementById('sales-tab-role-hint');

    if (tabName === 'quotations') {
        if (subtabQuotes) subtabQuotes.classList.remove('hidden');
        if (subtabBookings) subtabBookings.classList.add('hidden');

        if (tabQuotesBtn) {
            tabQuotesBtn.className = 'flex-1 md:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold font-heading flex items-center justify-center space-x-2.5 transition-all shadow-sm bg-indigo-700 text-white';
            const badge = tabQuotesBtn.querySelector('#badge-count-quotes');
            if (badge) badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-black bg-white/20 text-white tabular-nums';
        }
        if (tabBookingsBtn) {
            tabBookingsBtn.className = 'flex-1 md:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold font-heading flex items-center justify-center space-x-2.5 transition-all text-slate-600 hover:text-slate-900 hover:bg-slate-100';
            const badge = tabBookingsBtn.querySelector('#badge-count-bookings');
            if (badge) badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-100 text-teal-800 tabular-nums';
        }
        if (roleHint) {
            roleHint.innerHTML = 'Phân quyền: <strong class="text-indigo-700">Nhân viên Kinh doanh (NVKD)</strong> — Khảo sát tuyến, chào giá, đàm phán hợp đồng';
        }
    } else if (tabName === 'bookings') {
        if (subtabQuotes) subtabQuotes.classList.add('hidden');
        if (subtabBookings) subtabBookings.classList.remove('hidden');

        if (tabBookingsBtn) {
            tabBookingsBtn.className = 'flex-1 md:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold font-heading flex items-center justify-center space-x-2.5 transition-all shadow-sm bg-teal-700 text-white';
            const badge = tabBookingsBtn.querySelector('#badge-count-bookings');
            if (badge) badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-black bg-white/20 text-white tabular-nums';
        }
        if (tabQuotesBtn) {
            tabQuotesBtn.className = 'flex-1 md:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold font-heading flex items-center justify-center space-x-2.5 transition-all text-slate-600 hover:text-slate-900 hover:bg-slate-100';
            const badge = tabQuotesBtn.querySelector('#badge-count-quotes');
            if (badge) badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800 tabular-nums';
        }
        if (roleHint) {
            roleHint.innerHTML = 'Phân quyền: <strong class="text-teal-700">Sale Admin / CS (Chăm sóc Khách hàng)</strong> — Booking hãng tàu, kiểm soát SI/CY cut-off, chuyển giao điều xe';
        }
    }
}

// --- BỘ LỌC TỪNG CỘT & SẮP XẾP BẢNG BOOKINGS (SALE / CS) ---
let rawSalesBookings = [];
let bookingSortColumn = 'loading_date';
let bookingSortDirection = 'asc'; // 'asc' | 'desc'

function populateBookingFilterDropdowns(bookings) {
    if (!bookings || !Array.isArray(bookings)) return;

    // 1. Dropdown Khách hàng
    const custSelect = document.getElementById('filter-bk-customer');
    if (custSelect) {
        const currentVal = custSelect.value;
        const customers = [...new Set(bookings.map(b => b.customer).filter(Boolean))].sort();
        let html = '<option value="">-- Tất cả Khách hàng --</option>';
        customers.forEach(c => {
            html += `<option value="${escapeHtml(c)}" ${c === currentVal ? 'selected' : ''}>${escapeHtml(c)}</option>`;
        });
        custSelect.innerHTML = html;
    }

    // 2. Dropdown Hãng tàu
    const shipSelect = document.getElementById('filter-bk-shipping-line');
    if (shipSelect) {
        const currentVal = shipSelect.value;
        const shippingLines = [...new Set(bookings.map(b => b.shipping_line).filter(Boolean))].sort();
        let html = '<option value="">-- Tất cả Hãng tàu --</option>';
        shippingLines.forEach(s => {
            html += `<option value="${escapeHtml(s)}" ${s === currentVal ? 'selected' : ''}>${escapeHtml(s)}</option>`;
        });
        shipSelect.innerHTML = html;
    }

    // 3. Dropdown Loại Cont
    const sizeSelect = document.getElementById('filter-bk-cont-size');
    if (sizeSelect) {
        const currentVal = sizeSelect.value;
        const sizes = [...new Set(bookings.map(b => b.container_size).filter(Boolean))].sort();
        let html = '<option value="">-- Tất cả Loại Cont --</option>';
        sizes.forEach(s => {
            html += `<option value="${escapeHtml(s)}" ${s === currentVal ? 'selected' : ''}>Cont ${escapeHtml(s)}</option>`;
        });
        sizeSelect.innerHTML = html;
    }
}

function toggleBookingSort(column) {
    if (bookingSortColumn === column) {
        bookingSortDirection = bookingSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        bookingSortColumn = column;
        bookingSortDirection = (column === 'loading_date' || column === 'closing_time') ? 'asc' : 'desc';
    }
    applyBookingFilters();
}

function resetBookingFilters() {
    const cust = document.getElementById('filter-bk-customer');
    if (cust) cust.value = '';
    const ship = document.getElementById('filter-bk-shipping-line');
    if (ship) ship.value = '';
    const size = document.getElementById('filter-bk-cont-size');
    if (size) size.value = '';
    const status = document.getElementById('filter-bk-status');
    if (status) status.value = '';
    const search = document.getElementById('filter-bk-search');
    if (search) search.value = '';
    const clearBtn = document.getElementById('btn-clear-bk-search');
    if (clearBtn) clearBtn.classList.add('hidden');

    bookingSortColumn = 'loading_date';
    bookingSortDirection = 'asc';
    applyBookingFilters();
}

function clearBookingSearch() {
    const search = document.getElementById('filter-bk-search');
    if (search) search.value = '';
    const clearBtn = document.getElementById('btn-clear-bk-search');
    if (clearBtn) clearBtn.classList.add('hidden');
    applyBookingFilters();
}

function applyBookingFilters() {
    if (!rawSalesBookings || !Array.isArray(rawSalesBookings)) return;

    const filterCust = document.getElementById('filter-bk-customer')?.value?.trim().toLowerCase() || '';
    const filterShip = document.getElementById('filter-bk-shipping-line')?.value?.trim().toLowerCase() || '';
    const filterSize = document.getElementById('filter-bk-cont-size')?.value?.trim().toUpperCase() || '';
    const filterStatus = document.getElementById('filter-bk-status')?.value?.trim() || '';
    const filterSearch = document.getElementById('filter-bk-search')?.value?.trim().toLowerCase() || '';

    const clearBtn = document.getElementById('btn-clear-bk-search');
    if (clearBtn) {
        if (filterSearch) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
    }

    // Tiến hành lọc
    let list = rawSalesBookings.filter(b => {
        if (filterCust && (b.customer || '').toLowerCase() !== filterCust) return false;
        if (filterShip && (b.shipping_line || '').toLowerCase() !== filterShip) return false;
        if (filterSize && (b.container_size || '').toUpperCase() !== filterSize) return false;

        if (filterStatus) {
            if (filterStatus === 'URGENT') {
                if (!b.is_urgent) return false;
            } else if (filterStatus === 'DROP_HOOK') {
                if (!b.has_drop_hook) return false;
            } else if (b.status !== filterStatus) {
                return false;
            }
        }

        if (filterSearch) {
            const combinedText = [
                b.booking_code,
                b.booking_number,
                b.customer,
                b.shipping_line,
                b.vessel_voyage,
                b.pickup,
                b.delivery,
                b.dropoff,
                b.commodity
            ].filter(Boolean).join(' ').toLowerCase();

            if (!combinedText.includes(filterSearch)) return false;
        }

        return true;
    });

    // Cập nhật số đếm
    const filteredCountEl = document.getElementById('booking-filtered-count');
    if (filteredCountEl) filteredCountEl.innerText = list.length;
    const totalCountEl = document.getElementById('booking-total-count');
    if (totalCountEl) totalCountEl.innerText = rawSalesBookings.length;

    // Sắp xếp
    list.sort((a, b) => {
        let valA = a[bookingSortColumn];
        let valB = b[bookingSortColumn];

        if (bookingSortColumn === 'price') {
            valA = parseFloat(valA) || 0;
            valB = parseFloat(valB) || 0;
            return bookingSortDirection === 'asc' ? valA - valB : valB - valA;
        }

        if (bookingSortColumn === 'progress_percent') {
            valA = parseFloat(valA) || 0;
            valB = parseFloat(valB) || 0;
            return bookingSortDirection === 'asc' ? valA - valB : valB - valA;
        }

        // Mặc định so sánh chuỗi / ngày giờ
        valA = (valA || '').toString();
        valB = (valB || '').toString();
        const cmp = valA.localeCompare(valB, 'vi');
        return bookingSortDirection === 'asc' ? cmp : -cmp;
    });

    // Cập nhật visual icons trên thead
    const sortIcons = {
        'loading_date': document.getElementById('sort-icon-loading_date'),
        'progress_percent': document.getElementById('sort-icon-progress_percent'),
        'closing_time': document.getElementById('sort-icon-closing_time'),
        'price': document.getElementById('sort-icon-price')
    };

    Object.entries(sortIcons).forEach(([col, icon]) => {
        if (!icon) return;
        if (col === bookingSortColumn) {
            icon.className = bookingSortDirection === 'asc' 
                ? 'ph-bold ph-arrow-up text-teal-700 text-xs font-black' 
                : 'ph-bold ph-arrow-down text-teal-700 text-xs font-black';
        } else {
            icon.className = 'ph-bold ph-arrows-down-up text-slate-400 text-xs';
        }
    });

    renderBookingsTable(list);
}

function renderBookingsTable(bookings) {
    const bkBody = document.getElementById('sales-bookings-tbody');
    if (!bkBody) return;
    bkBody.innerHTML = '';

    if (!bookings || bookings.length === 0) {
        bkBody.innerHTML = `
            <tr>
                <td colspan="9" class="p-8 text-center text-slate-400 italic">
                    <div class="flex flex-col items-center justify-center space-y-2">
                        <i class="ph-bold ph-magnifying-glass text-3xl text-slate-300"></i>
                        <p class="font-medium text-sm">Không tìm thấy đơn hàng / booking nào phù hợp với bộ lọc hiện tại.</p>
                        <button type="button" onclick="resetBookingFilters()" class="text-xs text-teal-700 hover:text-teal-900 font-bold underline">
                            Đặt lại toàn bộ bộ lọc
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    bookings.forEach(b => {
        const tr = document.createElement('tr');
        tr.className = b.is_urgent 
            ? 'hover:bg-amber-50/70 bg-amber-50/25 transition-colors' 
            : 'hover:bg-slate-50 transition-colors';
        
        const statusBadge = b.status === 'PENDING_DISPATCH' 
            ? '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200 inline-block">Chờ điều xe</span>'
            : b.status === 'PARTIALLY_DISPATCHED'
            ? '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase bg-teal-100 text-teal-800 border border-teal-200 inline-block">Đang điều xe</span>'
            : b.status === 'COMPLETED'
            ? '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 inline-block">Đã đủ cont</span>'
            : '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-200 inline-block">Đã hủy</span>';

        const urgentBadge = b.is_urgent ? `
            <span class="ml-1 px-1.5 py-0.2 rounded text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200 inline-flex items-center gap-0.5">
                <i class="ph-bold ph-warning-circle text-[11px]"></i> GẤP
            </span>
        ` : '';

        const dropHookBadge = b.has_drop_hook ? `
            <span class="ml-1 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-0.5" title="Có ${b.drop_hook_count} cont chạy chế độ cắt kéo (đổi tài)">
                <i class="ph-bold ph-arrows-split"></i> CẮT KÉO (${b.drop_hook_count})
            </span>
        ` : '';

        // Phân loại nhãn dịch vụ gọn gàng
        const svcTag = b.booking_type === 'DOMESTIC' ? 'Nội Địa FTL' : (b.booking_type === 'IMPORT_FCL' ? 'Nhập FCL' : 'Xuất FCL');
        const svcCls = b.booking_type === 'DOMESTIC' ? 'bg-amber-50 text-amber-800 border-amber-200' : (b.booking_type === 'IMPORT_FCL' ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-teal-50 text-teal-800 border-teal-200');

        // Hàm rút gọn địa điểm loại bỏ ngoặc rườm rà
        const cleanLoc = (s) => (s || '-').replace(/\([^)]*\)/g, '').trim();

        tr.innerHTML = `
            <td class="p-3.5">
                <div class="flex items-center flex-wrap gap-1">
                    <span class="font-black text-slate-900 font-heading text-sm">${b.booking_code}</span>
                    ${urgentBadge}
                    ${dropHookBadge}
                </div>
                <p class="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                    <i class="ph-bold ph-calendar-blank text-slate-400"></i> ${b.loading_date} · ${b.loading_time}
                </p>
            </td>
            <td class="p-3.5">
                <p class="font-bold text-slate-900 text-sm truncate max-w-[200px]" title="${b.customer}">${b.customer}</p>
                <p class="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
                    <span class="px-1.5 py-0.5 rounded font-bold border text-[11px] ${svcCls}">${svcTag}</span>
                    <span class="font-bold text-teal-800 truncate max-w-[120px]">${b.shipping_line}</span>
                </p>
            </td>
            <td class="p-3.5 font-mono text-sm">
                <p class="font-black text-indigo-900">${b.booking_number || '-'}</p>
                <p class="text-xs text-slate-400 font-normal truncate max-w-[120px]">${b.vessel_voyage || '-'}</p>
            </td>
            <td class="p-3.5">
                <div class="flex items-center gap-1.5">
                    <span class="px-1.5 py-0.5 rounded font-black text-xs bg-slate-100 text-slate-800 border border-slate-200 uppercase">${b.container_size}</span>
                    <span class="text-sm font-semibold text-slate-800 truncate max-w-[130px]" title="${b.commodity || 'Hàng hóa'}">${b.commodity || 'Hàng hóa'}</span>
                </div>
            </td>
            <td class="p-3.5">
                <div class="flex items-center space-x-1.5 mb-1">
                    <span class="font-black text-slate-900 text-sm tabular-nums">${b.progress}</span>
                    <div class="w-12 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div class="bg-teal-600 h-1.5 rounded-full" style="width: ${b.progress_percent}%"></div>
                    </div>
                </div>
                <div>${statusBadge}</div>
            </td>
            <td class="p-3.5">
                <div class="text-[13px] leading-snug space-y-0.5 max-w-[220px]">
                    <p class="truncate text-slate-700"><strong class="text-teal-700 font-bold">1. Lấy:</strong> ${cleanLoc(b.pickup)}</p>
                    <p class="truncate text-slate-900 font-semibold"><strong class="text-slate-900 font-bold">2. Kho:</strong> ${cleanLoc(b.delivery)}</p>
                    ${b.dropoff ? `<p class="truncate text-slate-700"><strong class="text-indigo-700 font-bold">3. Hạ:</strong> ${cleanLoc(b.dropoff)}</p>` : ''}
                </div>
            </td>
            <td class="p-3.5 font-mono text-sm">
                <p class="font-bold text-rose-700">${b.closing_time || '-'}</p>
                ${b.si_cutoff ? `<p class="text-[11px] text-slate-400 mt-0.5 font-sans">SI: ${b.si_cutoff}</p>` : ''}
            </td>
            <td class="p-3.5 text-right font-black text-slate-900 text-sm tabular-nums">
                ${new Intl.NumberFormat('vi-VN').format(b.price)} đ
            </td>
            <td class="p-3.5 text-center">
                <div class="flex items-center justify-center space-x-1.5">
                    ${b.status !== 'COMPLETED' && b.status !== 'CANCELLED' ? `
                        <button onclick="dispatchFromBooking(${b.id})" class="px-2.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center gap-1 font-heading" title="Điều xe ngay">
                            <i class="ph-bold ph-paper-plane-tilt text-xs"></i>
                            <span>Điều Xe</span>
                        </button>
                    ` : `
                        <span class="px-2 py-1 text-xs text-emerald-700 font-bold flex items-center gap-0.5">
                            <i class="ph-bold ph-check"></i> Đủ xe
                        </span>
                    `}
                    <!-- 1. Xem chi tiết Booking (Chế độ chỉ đọc) -->
                    <button onclick="openModalBooking(${b.id}, true)" title="Xem chi tiết đơn hàng" 
                        class="p-1.5 rounded-lg bg-slate-100 hover:bg-sky-100 text-slate-600 hover:text-sky-700 transition-colors">
                        <i class="ph-bold ph-eye text-sm"></i>
                    </button>
                    <!-- 2. Sửa Booking (Chế độ chỉnh sửa) -->
                    <button onclick="openModalBooking(${b.id}, false)" title="Hiệu chỉnh đơn hàng" 
                        class="p-1.5 rounded-lg bg-slate-100 hover:bg-teal-100 text-slate-600 hover:text-teal-700 transition-colors">
                        <i class="ph-bold ph-pencil-simple text-sm"></i>
                    </button>
                    <!-- 3. Xóa Booking -->
                    <button onclick="deleteBooking(${b.id})" title="Xóa đơn hàng" 
                        class="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 transition-colors">
                        <i class="ph-bold ph-trash text-sm"></i>
                    </button>
                </div>
            </td>
        `;
        bkBody.appendChild(tr);
    });
}

async function loadSalesData() {
    try {
        const globalDates = getDateRangeForPeriod(currentDashboardPeriod, currentDashboardCustomStart, currentDashboardCustomEnd);
        const res = await fetchWithAuth(`/api/sales/?from_date=${globalDates.fromDate}&to_date=${globalDates.toDate}`);
        if (!res.ok) throw new Error('Lỗi tải dữ liệu kinh doanh');
        const data = await res.json();

        // Cập nhật Cụm Chỉ Số Tình Trạng Kinh Doanh & Tăng Trưởng (Màn hình chính)
        if (data.overview_metrics) {
            const ov = data.overview_metrics;
            const revEl = document.getElementById('sales-overview-revenue');
            if (revEl) revEl.innerText = new Intl.NumberFormat('vi-VN').format(ov.revenue_monthly) + ' đ';
            const revTrendEl = document.getElementById('sales-trend-revenue');
            if (revTrendEl) revTrendEl.innerHTML = `<i class="ph-bold ph-trend-up"></i> ${ov.revenue_trend}`;
            const revNoteEl = document.getElementById('sales-note-revenue');
            if (revNoteEl) revNoteEl.innerHTML = `<i class="ph-bold ph-check-circle text-emerald-600 text-xs"></i> ${ov.revenue_note}`;

            const bkEl = document.getElementById('sales-overview-bookings');
            if (bkEl) bkEl.innerText = `${new Intl.NumberFormat('vi-VN').format(ov.total_bookings || 0)} Đơn hàng`;
            const bkTrendEl = document.getElementById('sales-trend-bookings');
            if (bkTrendEl) bkTrendEl.innerHTML = `<i class="ph-bold ph-trend-up"></i> ${ov.booking_trend}`;
            const bkNoteEl = document.getElementById('sales-note-bookings');
            if (bkNoteEl) bkNoteEl.innerHTML = `<i class="ph-bold ph-truck text-teal-600 text-xs"></i> ${ov.booking_note}`;

            const contEl = document.getElementById('sales-overview-containers');
            if (contEl) contEl.innerText = `${new Intl.NumberFormat('vi-VN').format(ov.total_containers || 0)} Cont`;
            const contTrendEl = document.getElementById('sales-trend-containers');
            if (contTrendEl) contTrendEl.innerHTML = `<i class="ph-bold ph-trend-up"></i> ${ov.container_trend}`;
            const contNoteEl = document.getElementById('sales-note-containers');
            if (contNoteEl) contNoteEl.innerHTML = `<i class="ph-bold ph-package text-amber-600 text-xs"></i> ${ov.container_note}`;

            const winEl = document.getElementById('sales-overview-winrate');
            if (winEl) winEl.innerText = `${ov.win_rate}%`;
            const winTrendEl = document.getElementById('sales-trend-winrate');
            if (winTrendEl) winTrendEl.innerHTML = `<i class="ph-bold ph-trend-up"></i> ${ov.win_rate_trend}`;
            const winNoteEl = document.getElementById('sales-note-winrate');
            if (winNoteEl) winNoteEl.innerHTML = `<i class="ph-bold ph-chats-circle text-indigo-600 text-xs"></i> ${ov.win_rate_note}`;
        }

        // Cập nhật badges số lượng trên 2 tab
        const bQuoteCount = document.getElementById('badge-count-quotes');
        if (bQuoteCount && data.quotations) bQuoteCount.innerText = new Intl.NumberFormat('vi-VN').format(data.quotations.length);
        const bBookingCount = document.getElementById('badge-count-bookings');
        if (bBookingCount && data.bookings) bBookingCount.innerText = new Intl.NumberFormat('vi-VN').format(data.bookings.length);

        // Cập nhật stats con cho Báo giá & Booking (Dashboard riêng từng tab)
        if (data.stats) {
            const qs = data.stats.quotation_stats;
            if (qs) {
                const qNeg = document.getElementById('stat-quote-negotiating');
                if (qNeg) qNeg.innerText = new Intl.NumberFormat('vi-VN').format(qs.negotiating || 0);
                const qPending = document.getElementById('stat-quote-pending');
                if (qPending) qPending.innerText = new Intl.NumberFormat('vi-VN').format(qs.pending_approval || 0);
                const qApp = document.getElementById('stat-quote-approved');
                if (qApp) qApp.innerText = new Intl.NumberFormat('vi-VN').format(qs.approved || 0);
                const qRev = document.getElementById('stat-quote-revenue');
                if (qRev) qRev.innerText = new Intl.NumberFormat('vi-VN').format(qs.expected_revenue || 0) + ' đ';
            }

            const bs = data.stats.booking_stats;
            if (bs) {
                const pEl = document.getElementById('sales-stat-pending-dispatch');
                if (pEl) pEl.innerText = new Intl.NumberFormat('vi-VN').format(bs.pending_dispatch || 0);
                const partEl = document.getElementById('sales-stat-partially-dispatched');
                if (partEl) partEl.innerText = new Intl.NumberFormat('vi-VN').format(bs.partially_dispatched || 0);
                const cEl = document.getElementById('sales-stat-completed');
                if (cEl) cEl.innerText = new Intl.NumberFormat('vi-VN').format(bs.completed || 0);

                const dispContEl = document.getElementById('sales-stat-dispatched-containers');
                if (dispContEl) dispContEl.innerText = new Intl.NumberFormat('vi-VN').format(bs.dispatched_containers || 0);
                const totContEl = document.getElementById('sales-stat-total-containers');
                if (totContEl) totContEl.innerText = new Intl.NumberFormat('vi-VN').format(bs.total_containers || 0);
                const remContEl = document.getElementById('sales-stat-remaining-containers');
                if (remContEl) remContEl.innerText = new Intl.NumberFormat('vi-VN').format(bs.remaining_containers || 0);
            }
        }

        // Cập nhật danh sách Bookings với bộ lọc & sắp xếp theo ngày/cột
        rawSalesBookings = data.bookings || [];
        populateBookingFilterDropdowns(rawSalesBookings);
        applyBookingFilters();


        // Cập nhật danh sách Báo Giá Tuyến Cước với bộ lọc & sắp xếp
        rawSalesQuotations = data.quotations || [];
        populateQuoteFilterDropdowns(rawSalesQuotations);
        applyQuoteFilters();
    } catch (err) {
        console.error('Error loading sales data:', err);
    }
}

// --- BỘ LỌC & SẮP XẾP BẢNG BÁO GIÁ TUYẾN CƯỚC (CRM) ---
let rawSalesQuotations = [];
let quoteSortColumn = null;
let quoteSortDirection = 'asc';

function populateQuoteFilterDropdowns(quotes) {
    if (!quotes || !Array.isArray(quotes)) return;
    const custSelect = document.getElementById('filter-quote-customer');
    if (custSelect) {
        const curVal = custSelect.value;
        const customers = [...new Set(quotes.map(q => (q.customer || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
        custSelect.innerHTML = '<option value="">-- Tất cả Khách hàng --</option>' + 
            customers.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
        if (customers.includes(curVal)) custSelect.value = curVal;
    }
}

function clearQuoteSearch() {
    const input = document.getElementById('filter-quote-search');
    if (input) input.value = '';
    const clearBtn = document.getElementById('btn-clear-quote-search');
    if (clearBtn) clearBtn.classList.add('hidden');
    applyQuoteFilters();
}

function resetQuoteFilters() {
    const cust = document.getElementById('filter-quote-customer');
    if (cust) cust.value = '';
    const status = document.getElementById('filter-quote-status');
    if (status) status.value = '';
    const search = document.getElementById('filter-quote-search');
    if (search) search.value = '';
    const clearBtn = document.getElementById('btn-clear-quote-search');
    if (clearBtn) clearBtn.classList.add('hidden');

    quoteSortColumn = null;
    quoteSortDirection = 'asc';
    applyQuoteFilters();
}

function toggleQuoteSort(col) {
    if (quoteSortColumn === col) {
        quoteSortDirection = quoteSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        quoteSortColumn = col;
        quoteSortDirection = 'asc';
    }
    applyQuoteFilters();
}

function applyQuoteFilters() {
    if (!rawSalesQuotations || !Array.isArray(rawSalesQuotations)) return;

    const filterCust = document.getElementById('filter-quote-customer')?.value?.trim().toLowerCase() || '';
    const filterStatus = document.getElementById('filter-quote-status')?.value?.trim().toLowerCase() || '';
    const filterSearch = document.getElementById('filter-quote-search')?.value?.trim().toLowerCase() || '';

    const clearBtn = document.getElementById('btn-clear-quote-search');
    if (clearBtn) {
        if (filterSearch) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
    }

    let list = rawSalesQuotations.filter(q => {
        if (filterCust && (q.customer || '').toLowerCase() !== filterCust) return false;
        
        if (filterStatus) {
            const st = (q.status || '').toLowerCase();
            if (!st.includes(filterStatus)) return false;
        }

        if (filterSearch) {
            const combinedText = [
                q.code,
                q.customer,
                q.route,
                q.status,
                q.unit_price,
                q.monthly_trips,
                q.expected_revenue
            ].filter(Boolean).join(' ').toLowerCase();

            if (!combinedText.includes(filterSearch)) return false;
        }

        return true;
    });

    // Cập nhật số đếm
    const filteredCountEl = document.getElementById('quote-filtered-count');
    if (filteredCountEl) filteredCountEl.innerText = list.length;
    const totalCountEl = document.getElementById('quote-total-count');
    if (totalCountEl) totalCountEl.innerText = rawSalesQuotations.length;

    // Sắp xếp
    if (quoteSortColumn) {
        list.sort((a, b) => {
            let valA = a[quoteSortColumn];
            let valB = b[quoteSortColumn];

            if (['unit_price', 'monthly_trips', 'expected_revenue'].includes(quoteSortColumn)) {
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
                return quoteSortDirection === 'asc' ? valA - valB : valB - valA;
            }

            valA = (valA || '').toString();
            valB = (valB || '').toString();
            const cmp = valA.localeCompare(valB, 'vi');
            return quoteSortDirection === 'asc' ? cmp : -cmp;
        });
    }

    // Cập nhật icons thead
    const sortCols = ['code', 'customer', 'route', 'unit_price', 'monthly_trips', 'expected_revenue', 'status'];
    sortCols.forEach(col => {
        const iconEl = document.getElementById(`sort-icon-quote-${col}`);
        if (iconEl) {
            if (quoteSortColumn === col) {
                iconEl.className = quoteSortDirection === 'asc' 
                    ? 'ph-bold ph-arrow-up text-indigo-600 text-xs' 
                    : 'ph-bold ph-arrow-down text-indigo-600 text-xs';
            } else {
                iconEl.className = 'ph-bold ph-arrows-down-up text-slate-400 text-xs';
            }
        }
    });

    renderQuotationsTable(list);
}

function renderQuotationsTable(quotations) {
    const tbody = document.getElementById('sales-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!quotations || quotations.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-10 text-slate-400">
                    <div class="flex flex-col items-center justify-center">
                        <i class="ph ph-magnifying-glass text-3xl mb-2 text-slate-300"></i>
                        <p class="font-medium text-sm text-slate-500">Không tìm thấy báo giá nào phù hợp với bộ lọc</p>
                        <p class="text-xs text-slate-400 mt-1">Thử đổi điều kiện lọc hoặc bấm "Đặt lại"</p>
                        <button onclick="resetQuoteFilters()" class="mt-2.5 px-3 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors">
                            Đặt lại bộ lọc
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    quotations.forEach(s => {
        let statusCls = 'bg-teal-100 text-teal-800';
        if (s.status.includes('Đã duyệt')) statusCls = 'bg-emerald-100 text-emerald-800';
        if (s.status.includes('Chờ') || s.status.includes('thương lượng')) statusCls = 'bg-amber-100 text-amber-800';
        if (s.status.includes('Từ chối') || s.status.includes('hết hiệu lực')) statusCls = 'bg-rose-100 text-rose-800';

        const hasMultiRoutes = (s.items_count && s.items_count > 1) || (s.items && s.items.length > 1);
        const routeCount = s.items_count || (s.items ? s.items.length : 1);
        const isFuelAdj = s.pricing_method === 'FUEL_ADJUSTED';

        let routeDisplay = escapeHtml(s.route);
        if (hasMultiRoutes) {
            routeDisplay = `
                <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="font-bold text-slate-900">${escapeHtml(s.route)}</span>
                    <span class="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-200">+${routeCount - 1} tuyến khác</span>
                </div>
            `;
        }

        let methodBadge = '';
        if (isFuelAdj) {
            methodBadge = `<span class="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200"><i class="ph-bold ph-gas-pump"></i> Giá Dầu</span>`;
        }

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition-colors';
        tr.innerHTML = `
            <td class="p-3.5 font-black text-indigo-950 font-heading text-sm">
                <div class="flex flex-col">
                    <span>${escapeHtml(s.code)}</span>
                    ${methodBadge ? `<div class="mt-0.5">${methodBadge}</div>` : ''}
                </div>
            </td>
            <td class="p-3.5 font-bold text-slate-900 text-sm">${escapeHtml(s.customer)}</td>
            <td class="p-3.5 font-medium text-slate-700 text-[13px]">${routeDisplay}</td>
            <td class="p-3.5 font-semibold text-slate-700 tabular-nums text-sm text-right">${new Intl.NumberFormat('vi-VN').format(s.unit_price)} đ</td>
            <td class="p-3.5 text-center font-bold text-teal-700 tabular-nums text-sm">${new Intl.NumberFormat('vi-VN').format(s.monthly_trips || 0)} <span class="text-xs text-slate-400 font-normal">chuyến</span></td>
            <td class="p-3.5 text-right font-black text-emerald-700 tabular-nums font-heading text-sm">${new Intl.NumberFormat('vi-VN').format(s.expected_revenue)} đ</td>
            <td class="p-3.5">
                <span class="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider font-heading ${statusCls}">${escapeHtml(s.status)}</span>
            </td>
            <td class="p-3.5 text-center">
                <div class="flex items-center justify-center space-x-1.5">
                    <!-- 1. In Báo Giá Chuẩn Doanh Nghiệp -->
                    <button onclick="openQuotationPrintModal(${s.id})" title="In Báo Giá Ký Kết" 
                        class="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 hover:text-teal-900 border border-teal-200 transition-colors">
                        <i class="ph-bold ph-printer text-sm"></i>
                    </button>
                    <!-- 2. Xem chi tiết Báo Giá (Chế độ chỉ đọc) -->
                    <button onclick="openModalQuotation(${s.id}, true)" title="Xem chi tiết báo giá" 
                        class="p-1.5 rounded-lg bg-slate-100 hover:bg-sky-100 text-slate-600 hover:text-sky-700 transition-colors">
                        <i class="ph-bold ph-eye text-sm"></i>
                    </button>
                    <!-- 3. Sửa Báo Giá (Chế độ chỉnh sửa) -->
                    <button onclick="openModalQuotation(${s.id}, false)" title="Chỉnh sửa báo giá" 
                        class="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 transition-colors">
                        <i class="ph-bold ph-pencil-simple text-sm"></i>
                    </button>
                    <!-- 4. Xóa Báo Giá -->
                    <button onclick="deleteQuotation(${s.id})" title="Xóa báo giá" 
                        class="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 transition-colors">
                        <i class="ph-bold ph-trash text-sm"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

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
    const curUser = window.CURRENT_USER || {};
    const role = curUser.role || '';
    const isAdmin = curUser.is_superuser || curUser.is_staff;

    // RBAC: Chặn các tab không có thẩm quyền truy cập
    if (!isAdmin && role) {
        if (tabId === 'quyet-toan' && !['DIRECTOR', 'DISPATCHER', 'ACCOUNTANT'].includes(role)) {
            if (typeof showToast === 'function') {
                showToast('warning', 'Tính năng Quyết toán gom chuyến dành cho Điều độ viên, Kế toán và Ban Giám Đốc!', 'Hạn Chế Quyền');
            }
            return;
        }
        if ((tabId === 'nhan-su' || tabId === 'ke-toan') && !['DIRECTOR', 'ACCOUNTANT'].includes(role)) {
            if (typeof showToast === 'function') {
                showToast('warning', 'Phân hệ Nhân sự và Kế toán tài chính chỉ dành cho Kế toán viên và Ban Giám Đốc!', 'Hạn Chế Quyền');
            }
            return;
        }
        if (tabId === 'xe-bai' && !['DIRECTOR', 'DISPATCHER', 'MECHANIC'].includes(role)) {
            if (typeof showToast === 'function') {
                showToast('warning', 'Phân hệ Xe & Bãi chỉ dành cho Điều độ viên và Kỹ thuật bãi!', 'Hạn Chế Quyền');
            }
            return;
        }
        if (tabId === 'kinh-doanh' && !['DIRECTOR', 'SALESMAN', 'DISPATCHER', 'ACCOUNTANT'].includes(role)) {
            if (typeof showToast === 'function') {
                showToast('warning', 'Phân hệ Sale & Booking dành cho Nhân viên Kinh doanh và Điều độ!', 'Hạn Chế Quyền');
            }
            return;
        }
    }

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
    }

    // Ẩn view chi tiết chuyến xe nếu đang mở
    const detailView = document.getElementById('view-trip-detail');
    if (detailView) detailView.classList.add('hidden-view');

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

    // Cụm Bộ Chọn Kỳ Toàn Cục luôn hiển thị trên Topbar
    const dashboardActionsEl = document.getElementById('topbar-dashboard-actions');
    if (dashboardActionsEl) {
        dashboardActionsEl.classList.remove('hidden');
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
        currentReportPeriod = reportPeriodMap[currentDashboardPeriod] || 'week';
    }

    // Cập nhật URL sạch trên thanh địa chỉ trình duyệt (Loại bỏ hoàn toàn dấu #)
    if (updateHistory && window.history && window.history.pushState) {
        const routePath = TAB_ROUTE_MAP[tabId] || '/';
        if (window.location.pathname !== routePath || window.location.hash) {
            window.history.pushState({ tabId }, '', routePath);
        }
    }

    if (tabId === 'dashboard') loadDashboardData();
    if (tabId === 'dieu-van') loadTripsData();
    if (tabId === 'nhan-su') loadHRData();
    if (tabId === 'xe-bai') loadFleetData();
    if (tabId === 'kinh-doanh') loadSalesData();
    if (tabId === 'ke-toan') switchAccountingSubTab(currentAccountingSubTab || 'acct-cashbook');
    if (tabId === 'quyet-toan') loadSettlementData();
    if (tabId === 'hai-quan') fetchCustomsDeclarations();
    if (tabId === 'bao-cao') loadReportsData();
    if (tabId === 'cai-dat') loadMasterData();
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
    if (loadTimeEl) loadTimeEl.value = `${b.loading_date_display || ''} - ${b.loading_time || '8H'}`.trim();

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
    await openModal('modal-create-trip', bookingId);
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

// =========================================================================
// 10. PHÂN HỆ QUẢN LÝ KẾ TOÁN & ĐỐI SOÁT CHI PHÍ CHUYẾN XE
// =========================================================================
let accountingDataCache = [];

async function loadAccountingData() {
    const tbody = document.getElementById('acct-tbody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="p-8 text-center text-slate-400 font-medium">
                    <i class="ph ph-spinner-gap animate-spin text-2xl mb-2 inline-block text-emerald-600"></i>
                    <p>Đang tải dữ liệu đối soát chi phí & báo cáo kế toán...</p>
                </td>
            </tr>
        `;
    }

    try {
        const globalDates = getDateRangeForPeriod(currentDashboardPeriod, currentDashboardCustomStart, currentDashboardCustomEnd);
        const res = await fetchWithAuth(`/api/accounting/?from_date=${globalDates.fromDate}&to_date=${globalDates.toDate}`);
        if (!res.ok) throw new Error('Lỗi tải dữ liệu kế toán');
        const data = await res.json();

        // 1. Cập nhật 4 thẻ KPI Kế toán
        if (data.stats) {
            const st = data.stats;
            const revEl = document.getElementById('acct-stat-revenue');
            if (revEl) revEl.innerText = new Intl.NumberFormat('vi-VN').format(st.total_revenue) + ' đ';
            const expEl = document.getElementById('acct-stat-expense');
            if (expEl) expEl.innerText = new Intl.NumberFormat('vi-VN').format(st.total_expense) + ' đ';
            const profitEl = document.getElementById('acct-stat-profit');
            if (profitEl) profitEl.innerText = new Intl.NumberFormat('vi-VN').format(st.total_profit) + ' đ';
            const marginEl = document.getElementById('acct-stat-margin');
            if (marginEl) marginEl.innerHTML = `<i class="ph-bold ph-trend-up text-xs"></i> Biên lợi nhuận gộp: ${st.profit_margin}%`;
            const pendEl = document.getElementById('acct-stat-pending');
            if (pendEl) pendEl.innerText = `${new Intl.NumberFormat('vi-VN').format(st.pending_settle_count)} chuyến`;
            const setEl = document.getElementById('acct-stat-settled');
            if (setEl) setEl.innerHTML = `<i class="ph-bold ph-lock-key text-xs"></i> Đã chốt sổ: ${new Intl.NumberFormat('vi-VN').format(st.settled_count)} chuyến`;
            const tripsCountEl = document.getElementById('acct-stat-trips-count');
            if (tripsCountEl) tripsCountEl.innerHTML = `<i class="ph-bold ph-check-circle text-xs"></i> Tính trên ${st.total_trips} chuyến xe phát sinh`;
        }

        // 2. Lưu cache và hiển thị bảng
        accountingDataCache = data.settlements || [];
        populateAccountingFilterDropdowns(accountingDataCache);
        filterAccountingTable();

    } catch (err) {
        console.error('Lỗi tải dữ liệu kế toán:', err);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="p-8 text-center text-rose-500 font-bold">
                        <i class="ph-bold ph-warning-circle text-2xl mb-1 inline-block"></i>
                        <p>Không thể tải dữ liệu đối soát chi phí kế toán. Vui lòng thử lại.</p>
                    </td>
                </tr>
            `;
        }
    }
}

function renderAccountingTable(list) {
    const tbody = document.getElementById('acct-tbody');
    if (!tbody) return;

    if (!list || list.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="p-8 text-center text-slate-400 font-medium">
                    <i class="ph ph-receipt text-3xl mb-1 inline-block text-slate-300"></i>
                    <p>Không có dữ liệu đối soát chuyến xe phù hợp với bộ lọc.</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = '';
    list.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = item.is_settled 
            ? 'hover:bg-slate-50 transition-colors' 
            : 'hover:bg-amber-50/50 bg-amber-50/10 transition-colors';

        const settleBadge = item.is_settled
            ? `<span class="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1 font-heading">
                <i class="ph-bold ph-lock-key"></i> Đã Chốt Sổ
               </span>`
            : `<span class="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1 font-heading">
                <i class="ph-bold ph-clock-countdown"></i> Chờ Chốt Sổ
               </span>`;

        tr.innerHTML = `
            <td class="p-3.5">
                <p class="font-black text-teal-800 font-heading text-sm cursor-pointer hover:underline" onclick="viewTripDetail('${item.trip_code}')">
                    ${item.trip_code}
                </p>
                <p class="text-xs text-slate-500 font-medium mt-0.5">${item.loading_date || '-'}</p>
            </td>
            <td class="p-3.5">
                <p class="font-bold text-slate-900 text-sm max-w-[190px] truncate" title="${item.customer_name}">${item.customer_name}</p>
                <p class="text-[13px] text-slate-600 font-medium mt-0.5 truncate max-w-[210px]" title="${item.route}">${item.route}</p>
            </td>
            <td class="p-3.5">
                <p class="font-bold text-slate-900 text-sm">${item.driver_name}</p>
                <p class="text-xs font-mono text-slate-600 font-bold">${item.license_plate}</p>
            </td>
            <td class="p-3.5 text-right font-black text-slate-900 tabular-nums text-sm font-heading">
                ${new Intl.NumberFormat('vi-VN').format(item.revenue)} đ
            </td>
            <td class="p-3.5 text-right font-black text-rose-600 tabular-nums text-sm font-heading">
                ${new Intl.NumberFormat('vi-VN').format(item.expense)} đ
            </td>
            <td class="p-3.5 text-right">
                <p class="font-black text-emerald-700 tabular-nums font-heading text-sm">${new Intl.NumberFormat('vi-VN').format(item.profit)} đ</p>
                <p class="text-[11px] text-slate-500 font-medium">Biên: ${item.margin_percent}%</p>
            </td>
            <td class="p-3.5 text-center">
                ${item.invoices_count > 0 ? `
                    <span class="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg text-xs font-bold inline-flex items-center gap-1">
                        <i class="ph-bold ph-file-text"></i> ${item.invoices_count} HĐ
                    </span>
                    ${item.sample_invoice ? `<p class="text-[11px] font-mono text-slate-500 mt-0.5">Số: ${item.sample_invoice}</p>` : ''}
                ` : `
                    <span class="text-slate-400 text-xs italic">Chưa có HĐ</span>
                `}
            </td>
            <td class="p-3.5 text-center">
                ${settleBadge}
                ${item.is_settled && item.settled_by ? `
                    <p class="text-[11px] text-slate-400 mt-0.5 font-medium truncate max-w-[110px]" title="${item.settled_by} lúc ${item.settled_at}">
                        ${item.settled_by}
                    </p>
                ` : ''}
            </td>
            <td class="p-3.5 text-center">
                <div class="flex items-center justify-center space-x-1.5">
                    <!-- Xem chi tiết đối soát -->
                    <button onclick="viewTripDetail('${item.trip_code}')" title="Soi chứng từ & chi tiết khoản chi" 
                        class="p-1.5 rounded-lg bg-slate-100 hover:bg-teal-100 text-slate-600 hover:text-teal-700 transition-colors">
                        <i class="ph-bold ph-eye text-sm"></i>
                    </button>
                    <!-- Chốt sổ / Mở chốt sổ -->
                    ${item.is_settled ? `
                        <button onclick="toggleSettleTrip('${item.trip_code}', true)" title="Mở khóa sổ kế toán (Cho phép sửa chi phí)" 
                            class="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-700 transition-colors">
                            <i class="ph-bold ph-lock-key-open text-sm"></i>
                        </button>
                    ` : `
                        <button onclick="toggleSettleTrip('${item.trip_code}', false)" title="Chốt sổ kế toán (Khóa cứng chi phí)" 
                            class="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center gap-1 font-heading">
                            <i class="ph-bold ph-lock-key text-xs"></i>
                            <span>Chốt Sổ</span>
                        </button>
                    `}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- BỘ LỌC & SẮP XẾP BẢNG ĐỐI SOÁT KẾ TOÁN ---
let acctSortColumn = null;
let acctSortDirection = 'asc';

function populateAccountingFilterDropdowns(list) {
    if (!list || !Array.isArray(list)) return;

    // 1. Khách hàng
    const custSelect = document.getElementById('acct-filter-customer');
    if (custSelect) {
        const curVal = custSelect.value;
        const customers = [...new Set(list.map(i => (i.customer_name || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
        custSelect.innerHTML = '<option value="">-- Tất cả Khách hàng --</option>' + 
            customers.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
        if (customers.includes(curVal)) custSelect.value = curVal;
    }

    // 2. Tài xế / Xe
    const drvSelect = document.getElementById('acct-filter-driver');
    if (drvSelect) {
        const curVal = drvSelect.value;
        const drivers = [...new Set(list.map(i => (i.driver_name || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
        const vehicles = [...new Set(list.map(i => (i.license_plate || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));

        let opts = '<option value="">-- Tất cả Tài xế / Xe --</option>';
        if (drivers.length > 0) {
            opts += '<optgroup label="Tài xế">' + drivers.map(d => `<option value="DRIVER:${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('') + '</optgroup>';
        }
        if (vehicles.length > 0) {
            opts += '<optgroup label="Biển số xe">' + vehicles.map(v => `<option value="VEHICLE:${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('') + '</optgroup>';
        }
        drvSelect.innerHTML = opts;
        if (curVal) drvSelect.value = curVal;
    }
}

function clearAccountingSearch() {
    const input = document.getElementById('acct-search-input');
    if (input) input.value = '';
    const clearBtn = document.getElementById('btn-clear-acct-search');
    if (clearBtn) clearBtn.classList.add('hidden');
    filterAccountingTable();
}

function resetAccountingFilters() {
    const cust = document.getElementById('acct-filter-customer');
    if (cust) cust.value = '';
    const drv = document.getElementById('acct-filter-driver');
    if (drv) drv.value = '';
    const settle = document.getElementById('acct-filter-settle');
    if (settle) settle.value = 'ALL';
    const search = document.getElementById('acct-search-input');
    if (search) search.value = '';
    const clearBtn = document.getElementById('btn-clear-acct-search');
    if (clearBtn) clearBtn.classList.add('hidden');

    acctSortColumn = null;
    acctSortDirection = 'asc';
    filterAccountingTable();
}

function toggleAccountingSort(col) {
    if (acctSortColumn === col) {
        acctSortDirection = acctSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        acctSortColumn = col;
        acctSortDirection = 'asc';
    }
    filterAccountingTable();
}

function filterAccountingTable() {
    if (!accountingDataCache || !Array.isArray(accountingDataCache)) return;

    const query = document.getElementById('acct-search-input')?.value?.toLowerCase().trim() || '';
    const custFilter = document.getElementById('acct-filter-customer')?.value?.trim().toLowerCase() || '';
    const drvFilter = document.getElementById('acct-filter-driver')?.value?.trim() || '';
    const settleFilter = document.getElementById('acct-filter-settle')?.value || 'ALL';

    const clearBtn = document.getElementById('btn-clear-acct-search');
    if (clearBtn) {
        if (query) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
    }

    let filtered = accountingDataCache.filter(item => {
        if (custFilter && (item.customer_name || '').toLowerCase() !== custFilter) return false;

        if (drvFilter) {
            if (drvFilter.startsWith('DRIVER:')) {
                const targetDrv = drvFilter.replace('DRIVER:', '');
                if (item.driver_name !== targetDrv) return false;
            } else if (drvFilter.startsWith('VEHICLE:')) {
                const targetVeh = drvFilter.replace('VEHICLE:', '');
                if (item.license_plate !== targetVeh) return false;
            }
        }

        if (settleFilter === 'SETTLED' && !item.is_settled) return false;
        if (settleFilter === 'PENDING' && item.is_settled) return false;

        if (query) {
            const combinedText = [
                item.trip_code,
                item.customer_name,
                item.route,
                item.driver_name,
                item.license_plate,
                item.sample_invoice,
                item.settled_by
            ].filter(Boolean).join(' ').toLowerCase();

            if (!combinedText.includes(query)) return false;
        }

        return true;
    });

    // Cập nhật số đếm
    const filteredCountEl = document.getElementById('acct-filtered-count');
    if (filteredCountEl) filteredCountEl.innerText = filtered.length;
    const totalCountEl = document.getElementById('acct-total-count');
    if (totalCountEl) totalCountEl.innerText = accountingDataCache.length;

    // Sắp xếp
    if (acctSortColumn) {
        filtered.sort((a, b) => {
            let valA = a[acctSortColumn];
            let valB = b[acctSortColumn];

            if (['revenue', 'expense', 'profit', 'invoices_count'].includes(acctSortColumn)) {
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
                return acctSortDirection === 'asc' ? valA - valB : valB - valA;
            }

            if (acctSortColumn === 'is_settled') {
                valA = valA ? 1 : 0;
                valB = valB ? 1 : 0;
                return acctSortDirection === 'asc' ? valA - valB : valB - valA;
            }

            valA = (valA || '').toString();
            valB = (valB || '').toString();
            const cmp = valA.localeCompare(valB, 'vi');
            return acctSortDirection === 'asc' ? cmp : -cmp;
        });
    }

    // Cập nhật icon sort thead
    const sortCols = ['trip_code', 'customer_name', 'driver_name', 'revenue', 'expense', 'profit', 'invoices_count', 'is_settled'];
    sortCols.forEach(col => {
        const iconEl = document.getElementById(`sort-icon-acct-${col}`);
        if (iconEl) {
            if (acctSortColumn === col) {
                iconEl.className = acctSortDirection === 'asc' 
                    ? 'ph-bold ph-arrow-up text-teal-600 text-xs' 
                    : 'ph-bold ph-arrow-down text-teal-600 text-xs';
            } else {
                iconEl.className = 'ph-bold ph-arrows-down-up text-slate-400 text-xs';
            }
        }
    });

    renderAccountingTable(filtered);
}

async function toggleSettleTrip(tripCode, isCurrentlySettled) {
    if (isCurrentlySettled) {
        const confirmed = await showConfirmModal({
            title: 'Mở Khóa Sổ Kế Toán',
            message: `Bạn có chắc chắn muốn MỞ KHÓA SỔ KẾ TOÁN cho chuyến xe [${tripCode}]?\n\nSau khi mở khóa, các khoản chi phí có thể bị sửa đổi hoặc xóa.`,
            confirmText: 'Mở Khóa Sổ',
            cancelText: 'Huỷ bỏ',
            type: 'warning',
            icon: 'ph-bold ph-lock-open text-2xl'
        });
        if (!confirmed) return;
        try {
            const res = await fetchWithAuth(`/api/trips/${tripCode}/unsettle-expenses/`, {
                method: 'POST'
            });
            const data = await res.json().catch(() => ({}));
            if (data.success) {
                showToast('warning', data.message, 'Đã Mở Khóa Sổ');
                loadAccountingData();
            } else {
                showToast('danger', data.message || data.error || data.detail || 'Có lỗi xảy ra');
            }
        } catch (err) {
            showToast('danger', 'Lỗi kết nối máy chủ');
        }
    } else {
        const confirmed = await showConfirmModal({
            title: 'Chốt Sổ Kế Toán',
            message: `Xác nhận CHỐT SỔ KẾ TOÁN chuyến xe [${tripCode}]?\n\nToàn bộ chi phí đã duyệt sẽ được khóa cứng để làm căn cứ quyết toán và hạch toán thuế.`,
            confirmText: 'Chốt Khóa Sổ',
            cancelText: 'Huỷ bỏ',
            type: 'success',
            icon: 'ph-bold ph-seal-check text-2xl'
        });
        if (!confirmed) return;
        try {
            const res = await fetchWithAuth(`/api/trips/${tripCode}/settle-expenses/`, {
                method: 'POST'
            });
            const data = await res.json().catch(() => ({}));
            if (data.success) {
                showToast('success', data.message, 'Chốt Sổ Thành Công');
                loadAccountingData();
            } else {
                showToast('danger', data.message || data.error || data.detail || 'Có lỗi xảy ra');
            }
        } catch (err) {
            showToast('danger', 'Lỗi kết nối máy chủ');
        }
    }
}

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

    // Bỏ active tất cả buttons
    document.querySelectorAll('.acct-subtab-btn').forEach(btn => {
        btn.classList.remove('bg-emerald-700', 'text-white', 'shadow-sm', 'active');
        btn.classList.add('text-slate-600', 'hover:text-slate-900', 'hover:bg-slate-100');
    });

    // Mở subtab được chọn
    const targetContent = document.getElementById(`subtab-${subtabId}`);
    if (targetContent) targetContent.classList.remove('hidden');

    // Active button tương ứng (Thứ tự mới: 1. Cashbook, 2. Driver Adv, 3. Dispatcher Fund, 4. Settlements, 5. Reimbursables, 6. Subcontractors, 7. BOT)
    let btnId = 'acct-tab-btn-1';
    if (subtabId === 'acct-driver-advances') btnId = 'acct-tab-btn-2';
    else if (subtabId === 'acct-dispatcher-funds') btnId = 'acct-tab-btn-3';
    else if (subtabId === 'acct-settlements') btnId = 'acct-tab-btn-4';
    else if (subtabId === 'acct-reimbursables') btnId = 'acct-tab-btn-5';
    else if (subtabId === 'acct-subcontractors') btnId = 'acct-tab-btn-6';
    else if (subtabId === 'acct-bot-audit') btnId = 'acct-tab-btn-7';

    const activeBtn = document.getElementById(btnId);
    if (activeBtn) {
        activeBtn.classList.remove('text-slate-600', 'hover:text-slate-900', 'hover:bg-slate-100');
        activeBtn.classList.add('bg-emerald-700', 'text-white', 'shadow-sm', 'active');
    }

    if (subtabId === 'acct-cashbook') {
        loadCashBookData();
    } else if (subtabId === 'acct-driver-advances' || subtabId === 'acct-dispatcher-funds') {
        loadAccountingAdvancesData();
    } else if (subtabId === 'acct-settlements') {
        loadAccountingData();
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
        if (!res.ok) throw new Error('Không thể tải dữ liệu tạm ứng hoàn ứng');
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
        populateAdvanceModalOptions(data);

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
        tbody.innerHTML = `<tr><td colspan="10" class="p-8 text-center text-slate-400 font-medium">Không tìm thấy phiếu tạm ứng chuyến nào phù hợp</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(item => {
        const isSettled = item.status === 'SETTLED';
        const statusBadge = isSettled
            ? `<span class="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">Đã Hoàn Ứng</span>`
            : `<span class="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-200">Đang Tạm Ứng</span>`;

        let diffBadge = '';
        if (isSettled) {
            if (item.settlement_diff_type === 'DRIVER_REFUND') {
                diffBadge = `<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800" title="Tài xế đã hoàn trả tiền thừa">TX Hoàn +${formatMoneyVND(item.refund_amount)}</span>`;
            } else if (item.settlement_diff_type === 'COMPANY_REIMBURSE') {
                diffBadge = `<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800" title="Công ty chi bù thêm">Cty Bù -${formatMoneyVND(item.reimburse_amount)}</span>`;
            } else {
                diffBadge = `<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">Khớp Đúng 100%</span>`;
            }
        } else {
            const diff = item.difference || 0;
            if (diff > 0) {
                diffBadge = `<span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200" title="Dự kiến hoàn trả cty">+${formatMoneyVND(diff)} (Dư)</span>`;
            } else if (diff < 0) {
                diffBadge = `<span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200" title="Dự kiến cty chi bù">${formatMoneyVND(diff)} (Thiếu)</span>`;
            } else {
                diffBadge = `<span class="text-xs text-slate-400 font-medium">Khớp tạm tính</span>`;
            }
        }

        const sourceBadge = item.advance_source === 'DISPATCHER_FUND'
            ? `<span class="text-xs text-indigo-700 font-semibold flex items-center gap-1"><i class="ph-bold ph-wallet"></i> ${escapeHtml(item.fund_code)}</span>`
            : `<span class="text-xs text-slate-600 font-medium">Cty trực tiếp</span>`;

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="font-black text-slate-900 font-mono text-xs">${escapeHtml(item.code)}</td>
                <td>
                    <a href="javascript:void(0)" onclick="viewTripDetail('${item.trip_code}')" class="font-mono text-teal-700 hover:underline font-bold text-xs">${escapeHtml(item.trip_code)}</a>
                    <p class="text-[11px] text-slate-400">${item.advance_date}</p>
                </td>
                <td class="text-xs font-semibold text-slate-800 max-w-[170px] truncate" title="${escapeHtml(item.customer_name)}">${escapeHtml(item.customer_name)}</td>
                <td class="text-xs text-slate-800">
                    <p class="font-bold">${escapeHtml(item.driver_name)}</p>
                    <p class="font-mono text-slate-400">${escapeHtml(item.license_plate)}</p>
                </td>
                <td class="text-right font-black text-teal-800 text-xs tabular-nums">${formatMoneyVND(item.amount)}</td>
                <td>${sourceBadge}</td>
                <td class="text-right font-semibold text-slate-800 text-xs tabular-nums">${formatMoneyVND(item.actual_spent)}</td>
                <td class="text-center">${diffBadge}</td>
                <td class="text-center">${statusBadge}</td>
                <td class="text-center">
                    <div class="flex items-center justify-center space-x-1.5">
                        ${!isSettled ? `
                            <button onclick="openSettleAdvanceModal(${item.id})" class="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold font-heading shadow-xs flex items-center gap-1 transition-all">
                                <i class="ph-bold ph-calculator text-xs"></i>
                                <span>Quyết Toán</span>
                            </button>
                        ` : `
                            <span class="text-xs text-slate-400 italic">Đã chốt sổ</span>
                        `}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// -------------------------------------------------------------
// RENDER & FILTER BẢNG QUỸ ĐIỀU VẬN (COMPANY ➔ DISPATCHER)
// -------------------------------------------------------------
function applyDispatcherFundsFilter() {
    renderDispatcherFundsTable(rawDispatcherFundsList);
}

function renderDispatcherFundsTable(list) {
    const tbody = document.getElementById('acct-fund-tbody');
    if (!tbody) return;

    if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="p-8 text-center text-slate-400 font-medium">Chưa có phiếu Quỹ tạm ứng điều vận nào</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(item => {
        let statusBadge = '';
        if (item.status === 'APPROVED') {
            statusBadge = `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">Đang Lưu Hành</span>`;
        } else if (item.status === 'PENDING') {
            statusBadge = `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-200">Chờ Cty Duyệt</span>`;
        } else if (item.status === 'SETTLED') {
            statusBadge = `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">Đã Hoàn Ứng Xong</span>`;
        } else {
            statusBadge = `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-200">Từ Chối</span>`;
        }

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="font-black text-slate-900 font-mono text-xs">${escapeHtml(item.code)}</td>
                <td class="text-xs font-bold text-indigo-900">${escapeHtml(item.dispatcher_name)}</td>
                <td class="text-xs text-slate-600 tabular-nums">${item.advance_date}</td>
                <td class="text-right font-black text-slate-900 text-xs tabular-nums">${formatMoneyVND(item.amount)}</td>
                <td class="text-right font-semibold text-amber-700 text-xs tabular-nums">${formatMoneyVND(item.disbursed_amount)}</td>
                <td class="text-right font-semibold text-emerald-700 text-xs tabular-nums">${formatMoneyVND(item.settled_amount)}</td>
                <td class="text-right font-black text-teal-800 text-xs tabular-nums">${formatMoneyVND(item.remaining_balance)}</td>
                <td class="text-center">${statusBadge}</td>
                <td class="text-xs text-slate-500">${escapeHtml(item.approved_by || '-')}</td>
                <td class="text-center">
                    <div class="flex items-center justify-center space-x-1.5">
                        ${item.status === 'PENDING' ? `
                            <button onclick="approveDispatcherFund(${item.id})" class="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold font-heading shadow-xs flex items-center gap-1 transition-all">
                                <i class="ph-bold ph-check text-xs"></i>
                                <span>Duyệt Cấp Quỹ</span>
                            </button>
                        ` : ''}
                        ${item.status === 'APPROVED' ? `
                            <button onclick="settleDispatcherFund(${item.id})" class="px-2.5 py-1 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold font-heading shadow-xs flex items-center gap-1 transition-all">
                                <i class="ph-bold ph-lock-key text-xs"></i>
                                <span>Quyết Toán Về Cty</span>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// -------------------------------------------------------------
// MODAL CẤP TẠM ỨNG CHUYẾN CHO TÀI XẾ
// -------------------------------------------------------------
function populateAdvanceModalOptions(data) {
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

function openDriverAdvanceModal(tripCode = null) {
    const modal = document.getElementById('modal-driver-advance');
    if (!modal) return;
    modal.classList.remove('hidden');

    const dateInp = document.getElementById('adv-inp-date');
    if (dateInp) dateInp.value = new Date().toISOString().slice(0, 10);

    const amountInp = document.getElementById('adv-inp-amount');
    if (amountInp) amountInp.value = '1.500.000';

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
}

function closeDriverAdvanceModal() {
    const modal = document.getElementById('modal-driver-advance');
    if (modal) modal.classList.add('hidden');
}

function onAdvanceTripChange() {
    const tripSelect = document.getElementById('adv-inp-trip');
    const selectedOption = tripSelect.options[tripSelect.selectedIndex];
    if (!selectedOption || !selectedOption.value) {
        document.getElementById('adv-trip-info').classList.add('hidden');
        return;
    }

    const driverId = selectedOption.getAttribute('data-driver');
    const driverName = selectedOption.getAttribute('data-driver-name');
    const plate = selectedOption.getAttribute('data-plate');
    const route = selectedOption.getAttribute('data-route');

    if (driverId) {
        const drvSelect = document.getElementById('adv-inp-driver');
        if (drvSelect) drvSelect.value = driverId;
    }

    const infoEl = document.getElementById('adv-trip-info');
    if (infoEl) {
        infoEl.innerHTML = `<i class="ph-bold ph-truck"></i> Xe: <strong>${plate}</strong> | Tuyến: ${route}`;
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
    e.preventDefault();
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
            showToast('success', data.message, 'Cấp Tạm Ứng Thành Công');
            closeDriverAdvanceModal();
            loadAccountingAdvancesData();
        } else {
            showToast('danger', data.error || 'Không thể tạo phiếu tạm ứng');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

// -------------------------------------------------------------
// MODAL ĐỐI SOÁT & QUYẾT TOÁN HOÀN ỨNG CHUYẾN
// -------------------------------------------------------------
let currentActiveAdvance = null;

function openSettleAdvanceModal(advanceId) {
    const advance = rawDriverAdvancesList.find(a => a.id === advanceId);
    if (!advance) return;
    currentActiveAdvance = advance;

    const modal = document.getElementById('modal-settle-advance');
    if (!modal) return;

    document.getElementById('settle-adv-id').value = advance.id;
    document.getElementById('settle-adv-code').innerText = advance.code;
    document.getElementById('settle-adv-trip-info').innerText = `[${advance.trip_code}] ${advance.customer_name} (${advance.license_plate})`;
    document.getElementById('settle-adv-driver-name').innerText = advance.driver_name;
    document.getElementById('settle-adv-amount-display').innerText = formatMoneyVND(advance.amount);

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
    const titleEl = document.getElementById('settle-adv-diff-title');
    const badgeEl = document.getElementById('settle-adv-diff-badge');
    const descEl = document.getElementById('settle-adv-diff-desc');
    const amountEl = document.getElementById('settle-adv-diff-amount');

    if (diff > 0) {
        // Tạm ứng > Thực chi: Tài xế nộp lại
        box.className = 'p-4 rounded-2xl border bg-blue-50/70 border-blue-200 text-blue-900';
        badgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-200 text-blue-900';
        badgeEl.innerText = 'TÀI XẾ HOÀN LẠI TIỀN THỪA';
        descEl.innerText = 'Số tiền tài xế nộp lại vào quỹ:';
        amountEl.className = 'text-xl font-black tabular-nums font-heading text-blue-800';
        amountEl.innerText = `+${formatMoneyVND(diff)}`;
    } else if (diff < 0) {
        // Thực chi > Tạm ứng: Công ty chi bù
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
    e.preventDefault();
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
            showToast('success', data.message, 'Quyết Toán Hoàn Ứng Thành Công');
            closeSettleAdvanceModal();
            loadAccountingAdvancesData();
            if (data.cash_transaction || data.cash_transaction_id || data.cash_transaction_code) {
                setTimeout(() => {
                    openCashVoucherModal(data.cash_transaction || data.cash_transaction_id || data.cash_transaction_code);
                }, 300);
            }
        } else {
            showToast('danger', data.error || 'Không thể quyết toán');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

// -------------------------------------------------------------
// 9.3. PHÂN HỆ QUYẾT TOÁN GOM CHUYẾN XE (BATCH TRIP SETTLEMENT CONTROLLER)
// -------------------------------------------------------------
let pageSettlementData = null;
let pageAllTripsList = [];
let batchSettlementData = null;
let batchAllTripsList = [];


function returnFromSettlementView() {
    if (previousActiveTab && previousActiveTab !== 'quyet-toan') {
        switchTab(previousActiveTab, true);
    } else {
        switchTab('dieu-van', true);
    }
}
window.returnFromSettlementView = returnFromSettlementView;

function openBatchSettlementModal(prefilledDriverId = null, prefilledVehicleId = null) {
    const currentActiveView = document.querySelector('.view:not(.hidden-view)');
    if (currentActiveView && currentActiveView.id !== 'view-quyet-toan') {
        previousActiveTab = currentActiveView.id.replace('view-', '');
    }
    // Chuyển trực tiếp sang Trang Quyết Toán Gom Chuyến chuyên dụng
    switchTab('quyet-toan');
    if (prefilledDriverId) {
        const groupBy = document.getElementById('settle-group-by');
        if (groupBy) {
            groupBy.value = 'driver';
            onSettlementGroupByChange();
            setTimeout(() => {
                const targetSelect = document.getElementById('settle-target-select');
                if (targetSelect) {
                    targetSelect.value = prefilledDriverId;
                    loadSettlementData();
                }
            }, 100);
        }
    } else if (prefilledVehicleId) {
        const groupBy = document.getElementById('settle-group-by');
        if (groupBy) {
            groupBy.value = 'vehicle';
            onSettlementGroupByChange();
            setTimeout(() => {
                const targetSelect = document.getElementById('settle-target-select');
                if (targetSelect) {
                    targetSelect.value = prefilledVehicleId;
                    loadSettlementData();
                }
            }, 100);
        }
    }
}

function onSettlementGroupByChange() {
    const groupBy = document.getElementById('settle-group-by')?.value || 'driver';
    populateSettlementTargetOptions(groupBy);
    loadSettlementData();
}

function populateSettlementTargetOptions(groupBy, preselectedId = null) {
    const targetLabel = document.getElementById('settle-target-label');
    const targetSelect = document.getElementById('settle-target-select');
    if (!targetSelect) return;

    targetSelect.innerHTML = '<option value="">-- Tất cả --</option>';

    if (groupBy === 'driver') {
        if (targetLabel) targetLabel.innerText = 'Chọn Bác Tài:';
        if (masterDataFormOptionsCache?.drivers && masterDataFormOptionsCache.drivers.length > 0) {
            masterDataFormOptionsCache.drivers.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.id;
                opt.innerText = d.label || `${d.full_name || d.nickname} (${d.phone || 'Tài xế'})`;
                if (preselectedId && String(d.id) === String(preselectedId)) opt.selected = true;
                targetSelect.appendChild(opt);
            });
        } else if (window.rawPersonnelList && window.rawPersonnelList.length > 0) {
            const drivers = window.rawPersonnelList.filter(p => p.role === 'DRIVER' || p.role === 'Lái xe' || p.department === 'Đội Xe');
            drivers.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.id;
                opt.innerText = `${d.full_name} (${d.nickname || d.phone_number || 'Tài xế'})`;
                if (preselectedId && String(d.id) === String(preselectedId)) opt.selected = true;
                targetSelect.appendChild(opt);
            });
        }
    } else if (groupBy === 'customer') {
        if (targetLabel) targetLabel.innerText = 'Chọn Khách Hàng:';
        if (masterDataFormOptionsCache?.customers && masterDataFormOptionsCache.customers.length > 0) {
            masterDataFormOptionsCache.customers.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.innerText = c.label || `${c.company_name || c.name || c.short_name || 'Khách hàng'}`;
                if (preselectedId && String(c.id) === String(preselectedId)) opt.selected = true;
                targetSelect.appendChild(opt);
            });
        } else if (window.rawCustomersList && window.rawCustomersList.length > 0) {
            window.rawCustomersList.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.innerText = `${c.company_name || c.name || c.short_name || 'Khách hàng'}`;
                if (preselectedId && String(c.id) === String(preselectedId)) opt.selected = true;
                targetSelect.appendChild(opt);
            });
        } else {
            fetchWithAuth('/api/customers/').then(r => r.json()).then(data => {
                const list = data.customers || data.results || (Array.isArray(data) ? data : []);
                window.rawCustomersList = list;
                list.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.id;
                    opt.innerText = `${c.company_name || c.name || c.short_name || 'Khách hàng'}`;
                    if (preselectedId && String(c.id) === String(preselectedId)) opt.selected = true;
                    targetSelect.appendChild(opt);
                });
            }).catch(() => {});
        }
    } else if (groupBy === 'vehicle') {
        if (targetLabel) targetLabel.innerText = 'Chọn Đầu Xe:';
        if (masterDataFormOptionsCache?.vehicles && masterDataFormOptionsCache.vehicles.length > 0) {
            masterDataFormOptionsCache.vehicles.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v.id;
                opt.innerText = v.label || `${v.plate || v.license_plate} (${v.type || 'Đầu kéo'})`;
                if (preselectedId && String(v.id) === String(preselectedId)) opt.selected = true;
                targetSelect.appendChild(opt);
            });
        } else if (window.rawFleetVehiclesList && window.rawFleetVehiclesList.length > 0) {
            window.rawFleetVehiclesList.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v.id;
                opt.innerText = `${v.license_plate} (${v.vehicle_type || 'Đầu kéo'})`;
                if (preselectedId && String(v.id) === String(preselectedId)) opt.selected = true;
                targetSelect.appendChild(opt);
            });
        }
    } else {
        if (targetLabel) targetLabel.innerText = 'Đối tượng:';
        targetSelect.innerHTML = '<option value="">-- Toàn bộ chuyến xe --</option>';
    }
}

function setSettlementDatePreset(preset) {
    const fromDateInp = document.getElementById('settle-from-date');
    const toDateInp = document.getElementById('settle-to-date');
    if (!fromDateInp || !toDateInp) return;

    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const formatD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'today') {
        fromDateInp.value = formatD(today);
        toDateInp.value = formatD(today);
    } else if (preset === 'week') {
        const dayOfWeek = today.getDay(); // 0 is Sunday
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
        const monday = new Date(today.setDate(diff));
        fromDateInp.value = formatD(monday);
        toDateInp.value = formatD(new Date());
    } else if (preset === 'month') {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        fromDateInp.value = formatD(firstDay);
        toDateInp.value = formatD(lastDay);
    } else if (preset === 'last_month') {
        const firstDayPrev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayPrev = new Date(today.getFullYear(), today.getMonth(), 0);
        fromDateInp.value = formatD(firstDayPrev);
        toDateInp.value = formatD(lastDayPrev);
    }

    loadSettlementData();
}

function resetSettlementFilters() {
    const groupBy = document.getElementById('settle-group-by');
    if (groupBy) groupBy.value = 'driver';
    const targetSelect = document.getElementById('settle-target-select');
    if (targetSelect) targetSelect.value = '';
    const statusFilter = document.getElementById('settle-status-filter');
    if (statusFilter) statusFilter.value = 'PENDING';
    const searchInp = document.getElementById('settle-search-input');
    if (searchInp) searchInp.value = '';

    setSettlementDatePreset('month');
}

function filterSettlementClientSide() {
    const searchVal = (document.getElementById('settle-search-input')?.value || '').toLowerCase().trim();
    const rows = document.querySelectorAll('#page-settle-tbody tr.settle-trip-row');
    let visibleCount = 0;

    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        if (!searchVal || text.includes(searchVal)) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });

    const badgeInfo = document.getElementById('settle-table-badge-info');
    if (badgeInfo) {
        badgeInfo.innerHTML = `Hiển thị: <strong>${visibleCount}</strong> chuyến`;
    }
    onSettlementTripSelectionChange();
}

async function loadSettlementData() {
    const groupBy = document.getElementById('settle-group-by')?.value || 'driver';
    let fromDate = document.getElementById('settle-from-date')?.value || '';
    let toDate = document.getElementById('settle-to-date')?.value || '';
    const targetId = document.getElementById('settle-target-select')?.value || '';
    const statusFilter = document.getElementById('settle-status-filter')?.value || 'PENDING';

    if (!fromDate || !toDate) {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        fromDate = firstDay.toISOString().slice(0, 10);
        toDate = today.toISOString().slice(0, 10);
        const fromInp = document.getElementById('settle-from-date');
        const toInp = document.getElementById('settle-to-date');
        if (fromInp && !fromInp.value) fromInp.value = fromDate;
        if (toInp && !toInp.value) toInp.value = toDate;
    }

    let url = `/api/accounting/driver-settlements/batch-preview/?group_by=${groupBy}&from_date=${fromDate}&to_date=${toDate}`;
    if (groupBy === 'driver' && targetId) url += `&driver_id=${targetId}`;
    if (groupBy === 'vehicle' && targetId) url += `&vehicle_id=${targetId}`;
    if (groupBy === 'customer' && targetId) url += `&customer_id=${targetId}`;

    const tbody = document.getElementById('page-settle-tbody');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="11" class="text-center py-12 text-slate-500 font-medium"><i class="ph-bold ph-spinner ph-spin text-3xl mb-2 block text-teal-600"></i> Đang phân tích và gom dữ liệu chuyến xe...</td></tr>`;
    }

    try {
        const res = await fetchWithAuth(url);
        const data = await res.json();
        if (res.ok && data.success) {
            pageSettlementData = data;
            batchSettlementData = data;
            renderSettlementTable(data);
        } else {
            if (tbody) tbody.innerHTML = `<tr><td colspan="11" class="text-center py-8 text-rose-500 font-bold">${data.error || 'Không thể tải dữ liệu'}</td></tr>`;
        }
    } catch (err) {
        console.error(err);
        if (tbody) tbody.innerHTML = `<tr><td colspan="11" class="text-center py-8 text-rose-500 font-bold">Lỗi kết nối máy chủ</td></tr>`;
    }
}

function renderSettlementTable(data) {
    const tbody = document.getElementById('page-settle-tbody');
    const badgeInfo = document.getElementById('settle-table-badge-info');
    const statusFilter = document.getElementById('settle-status-filter')?.value || 'PENDING';
    if (!tbody) return;

    const groups = data.groups || [];
    pageAllTripsList = [];
    batchAllTripsList = [];

    if (groups.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" class="text-center py-12 text-slate-400 font-semibold"><i class="ph-bold ph-info text-3xl mb-2 block"></i> Không có chuyến xe nào trong khoảng thời gian đã chọn.</td></tr>`;
        if (badgeInfo) badgeInfo.innerHTML = 'Hiển thị: <strong>0</strong> chuyến';
        onSettlementTripSelectionChange();
        return;
    }

    let html = '';
    let totalTripsInView = 0;

    groups.forEach((group, gIdx) => {
        let trips = group.trips || [];
        if (statusFilter === 'PENDING') {
            trips = trips.filter(t => !t.is_settled);
        } else if (statusFilter === 'SETTLED') {
            trips = trips.filter(t => t.is_settled);
        }

        if (trips.length === 0) return;
        totalTripsInView += trips.length;

        // Group Header Row
        html += `
            <tr class="bg-teal-50/80 font-bold text-slate-800 border-y border-teal-200 group-header-row" data-group-index="${gIdx}">
                <td colspan="11" class="py-2.5 px-3">
                    <div class="flex items-center justify-between flex-wrap gap-2">
                        <div class="flex items-center gap-2">
                            <span class="w-6 h-6 rounded-lg bg-teal-800 text-white flex items-center justify-center text-xs font-black">
                                ${gIdx + 1}
                            </span>
                            <span class="text-sm font-black text-teal-950">${escapeHtml(group.group_label)}</span>
                            <span class="text-xs text-slate-600 font-normal">(${escapeHtml(group.group_sub)})</span>
                            <button type="button" onclick="toggleGroupSettlementSelection(${gIdx})" class="px-2 py-0.5 rounded bg-white hover:bg-teal-100 text-teal-900 border border-teal-300 text-[11px] font-bold transition-colors ml-2">
                                Chọn nhóm này
                            </button>
                        </div>
                        <div class="flex items-center gap-4 text-xs">
                            <span class="text-slate-600 font-medium">Số chuyến: <strong class="text-slate-900 font-bold">${trips.length}</strong></span>
                            <span class="text-amber-800 font-medium">Tạm ứng: <strong class="font-mono font-bold">${formatMoneyVND(trips.reduce((acc, t) => acc + (t.advance_amount || 0), 0))}</strong></span>
                            <span class="text-teal-800 font-medium">Thực chi: <strong class="font-mono font-bold">${formatMoneyVND(trips.reduce((acc, t) => acc + (t.actual_spent || 0), 0))}</strong></span>
                        </div>
                    </div>
                </td>
            </tr>
        `;

        trips.forEach(t => {
            pageAllTripsList.push(t);
            batchAllTripsList.push(t);
            const isSettled = t.is_settled;
            const isChecked = !isSettled;

            let diffBadge = '';
            if (t.diff > 0) {
                diffBadge = `<span class="px-2 py-0.5 rounded-full text-[11px] font-black bg-blue-100 text-blue-900 font-mono border border-blue-200">+${formatMoneyVND(t.diff)} (Thừa)</span>`;
            } else if (t.diff < 0) {
                diffBadge = `<span class="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-900 font-mono border border-rose-200">-${formatMoneyVND(Math.abs(t.diff))} (Bù)</span>`;
            } else {
                diffBadge = `<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 font-mono border border-emerald-200">0 đ (Khớp)</span>`;
            }

            const podBadge = t.has_pod
                ? `<span class="text-emerald-700 font-bold flex items-center justify-center gap-0.5"><i class="ph-bold ph-check-circle text-xs"></i> Có E-POD</span>`
                : `<span class="text-amber-600 font-medium flex items-center justify-center gap-0.5"><i class="ph-bold ph-clock text-xs"></i> Chờ nộp</span>`;

            const settleStatusBadge = isSettled
                ? `<span class="px-2 py-0.5 rounded-md text-[10.5px] font-black bg-purple-100 text-purple-800 border border-purple-200">ĐÃ KHÓA SỔ</span>`
                : `<span class="px-2 py-0.5 rounded-md text-[10.5px] font-black bg-amber-100 text-amber-800 border border-amber-200">CHỜ QUYẾT TOÁN</span>`;

            html += `
                <tr class="hover:bg-teal-50/40 transition-colors settle-trip-row ${isSettled ? 'opacity-70 bg-slate-50/50' : ''}" data-group-index="${gIdx}">
                    <td class="text-center py-2.5 px-3">
                        <input type="checkbox" data-trip-id="${t.id}" data-advance="${t.advance_amount}" data-spent="${t.actual_spent}" data-settled="${isSettled ? '1' : '0'}" data-diff="${t.diff}" data-group="${gIdx}"
                            ${isChecked ? 'checked' : ''} onchange="onSettlementTripSelectionChange()"
                            class="page-settle-checkbox batch-trip-checkbox w-4 h-4 text-teal-600 rounded cursor-pointer">
                    </td>
                    <td class="py-2.5 px-3 font-semibold text-slate-900 font-mono">
                        <div class="font-bold text-teal-900">${escapeHtml(t.trip_code)}</div>
                        <div class="text-[11px] text-slate-500 font-normal">${escapeHtml(t.loading_date)}</div>
                    </td>
                    <td class="py-2.5 px-3">
                        <div class="font-bold text-slate-800 truncate max-w-[200px]" title="${escapeHtml(t.customer_name)}">${escapeHtml(t.customer_name)}</div>
                        <div class="text-[11px] text-slate-500 truncate max-w-[200px]" title="${escapeHtml(t.route)}">${escapeHtml(t.route)}</div>
                    </td>
                    <td class="py-2.5 px-3">
                        <div class="font-bold text-slate-800">${escapeHtml(t.driver_name)}</div>
                        <div class="text-[11px] font-mono font-bold text-teal-800 bg-teal-50 px-1.5 py-0.2 rounded inline-block border border-teal-200">${escapeHtml(t.license_plate)}</div>
                    </td>
                    <td class="py-2.5 px-3 font-mono text-xs">
                        <div class="font-bold text-slate-800">${escapeHtml(t.container_number)}</div>
                        <div class="text-[11px] text-slate-500">${escapeHtml(t.seal_number)}</div>
                    </td>
                    <td class="py-2.5 px-3 text-right font-mono font-bold text-amber-800 tabular-nums">
                        ${formatMoneyVND(t.advance_amount)}
                    </td>
                    <td class="py-2.5 px-3 text-right font-mono font-bold text-teal-800 tabular-nums">
                        ${formatMoneyVND(t.actual_spent)}
                    </td>
                    <td class="py-2.5 px-3 text-center">
                        ${diffBadge}
                    </td>
                    <td class="py-2.5 px-3 text-center">
                        ${podBadge}
                    </td>
                    <td class="py-2.5 px-3 text-center">
                        ${settleStatusBadge}
                    </td>
                    <td class="py-2.5 px-3 text-center">
                        <button type="button" onclick="viewTripDetail('${escapeHtml(t.trip_code)}')" class="px-2 py-0.5 rounded text-[11px] font-bold bg-white hover:bg-teal-700 hover:text-white text-teal-700 border border-teal-200 transition-colors shadow-2xs font-heading">
                            Chi tiết
                        </button>
                    </td>
                </tr>
            `;
        });
    });

    if (totalTripsInView === 0) {
        tbody.innerHTML = `<tr><td colspan="11" class="text-center py-12 text-slate-400 font-semibold"><i class="ph-bold ph-info text-3xl mb-2 block"></i> Không có chuyến xe nào khớp với bộ lọc trạng thái.</td></tr>`;
        if (badgeInfo) badgeInfo.innerHTML = 'Hiển thị: <strong>0</strong> chuyến';
        onSettlementTripSelectionChange();
        return;
    }

    tbody.innerHTML = html;
    if (badgeInfo) badgeInfo.innerHTML = `Hiển thị: <strong>${totalTripsInView}</strong> chuyến (${groups.length} nhóm)`;
    onSettlementTripSelectionChange();
}

function selectSettlementTrips(mode) {
    const checkboxes = document.querySelectorAll('.page-settle-checkbox');
    checkboxes.forEach(cb => {
        const row = cb.closest('tr');
        if (row && row.style.display === 'none') return; // Bỏ qua dòng bị ẩn bởi ô tìm kiếm

        const isSettled = cb.getAttribute('data-settled') === '1';
        const diff = parseInt(cb.getAttribute('data-diff') || '0', 10);

        if (mode === 'all') {
            cb.checked = true;
        } else if (mode === 'none') {
            cb.checked = false;
        } else if (mode === 'pending_only') {
            cb.checked = !isSettled;
        } else if (mode === 'balanced_only') {
            cb.checked = !isSettled && diff === 0;
        } else if (mode === 'diff_only') {
            cb.checked = !isSettled && diff !== 0;
        }
    });
    onSettlementTripSelectionChange();
}

function toggleGroupSettlementSelection(groupIdx) {
    const groupCheckboxes = document.querySelectorAll(`.page-settle-checkbox[data-group="${groupIdx}"]`);
    if (groupCheckboxes.length === 0) return;
    const anyUnchecked = Array.from(groupCheckboxes).some(cb => !cb.checked);
    groupCheckboxes.forEach(cb => {
        cb.checked = anyUnchecked;
    });
    onSettlementTripSelectionChange();
}

function toggleMasterSettlementCheckbox(masterCheckbox) {
    const checkboxes = document.querySelectorAll('.page-settle-checkbox');
    checkboxes.forEach(cb => {
        const row = cb.closest('tr');
        if (row && row.style.display === 'none') return;
        cb.checked = masterCheckbox.checked;
    });
    onSettlementTripSelectionChange();
}

function onSettlementTripSelectionChange() {
    const checkboxes = document.querySelectorAll('.page-settle-checkbox:checked');
    let selectedCount = 0;
    let totalAdvance = 0;
    let totalSpent = 0;

    checkboxes.forEach(cb => {
        selectedCount++;
        totalAdvance += parseInt(cb.getAttribute('data-advance') || '0', 10);
        totalSpent += parseInt(cb.getAttribute('data-spent') || '0', 10);
    });

    const netDiff = totalAdvance - totalSpent;

    // Cập nhật 4 thẻ KPI View Quyết toán
    const kpiCount = document.getElementById('page-settle-kpi-count');
    const kpiSub = document.getElementById('page-settle-kpi-sub');
    const kpiAdv = document.getElementById('page-settle-kpi-advance');
    const kpiSpent = document.getElementById('page-settle-kpi-spent');
    const kpiDiffCard = document.getElementById('page-settle-kpi-diff-card');
    const kpiDiffTitle = document.getElementById('page-settle-kpi-diff-title');
    const kpiDiffAmount = document.getElementById('page-settle-kpi-diff-amount');
    const kpiDiffDesc = document.getElementById('page-settle-kpi-diff-desc');
    const kpiDiffIcon = document.getElementById('page-settle-kpi-diff-icon');

    const footerCount = document.getElementById('page-settle-footer-count');
    const btnSubmitText = document.getElementById('btn-page-submit-settle-text');
    const masterCheckbox = document.getElementById('settle-master-checkbox');

    if (kpiCount) kpiCount.innerText = `${selectedCount} chuyến`;
    if (kpiSub) kpiSub.innerText = `Trên tổng số ${pageAllTripsList.length} chuyến trong kỳ`;
    if (kpiAdv) kpiAdv.innerText = formatMoneyVND(totalAdvance);
    if (kpiSpent) kpiSpent.innerText = formatMoneyVND(totalSpent);

    if (footerCount) footerCount.innerText = selectedCount;
    if (btnSubmitText) btnSubmitText.innerText = `XÁC NHẬN QUYẾT TOÁN GOM (${selectedCount} CHUYẾN)`;

    if (masterCheckbox) {
        const allVisible = document.querySelectorAll('.page-settle-checkbox');
        masterCheckbox.checked = allVisible.length > 0 && Array.from(allVisible).every(cb => cb.checked);
    }

    if (kpiDiffCard && kpiDiffAmount && kpiDiffDesc && kpiDiffTitle) {
        if (netDiff > 0) {
            kpiDiffCard.className = 'bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs border-l-4 border-l-blue-600';
            kpiDiffTitle.className = 'text-[12px] font-bold uppercase tracking-wider text-blue-800';
            kpiDiffTitle.innerText = 'TÀI XẾ HOÀN TIỀN THỪA';
            kpiDiffAmount.className = 'text-2xl sm:text-3xl font-black tabular-nums font-heading mt-1 text-blue-700';
            kpiDiffAmount.innerText = `+${formatMoneyVND(netDiff)}`;
            kpiDiffDesc.className = 'text-xs font-semibold mt-1 text-blue-700';
            kpiDiffDesc.innerText = 'Tài xế nộp hoàn lại vào Quỹ tiền';
            if (kpiDiffIcon) kpiDiffIcon.className = 'w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center text-sm';
        } else if (netDiff < 0) {
            kpiDiffCard.className = 'bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs border-l-4 border-l-rose-600';
            kpiDiffTitle.className = 'text-[12px] font-bold uppercase tracking-wider text-rose-800';
            kpiDiffTitle.innerText = 'CÔNG TY CHI TRẢ BÙ';
            kpiDiffAmount.className = 'text-2xl sm:text-3xl font-black tabular-nums font-heading mt-1 text-rose-700';
            kpiDiffAmount.innerText = `-${formatMoneyVND(Math.abs(netDiff))}`;
            kpiDiffDesc.className = 'text-xs font-semibold mt-1 text-rose-700';
            kpiDiffDesc.innerText = 'Công ty / ĐV chi bù tiền vượt ứng';
            if (kpiDiffIcon) kpiDiffIcon.className = 'w-7 h-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center text-sm';
        } else {
            kpiDiffCard.className = 'bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs border-l-4 border-l-emerald-600';
            kpiDiffTitle.className = 'text-[12px] font-bold uppercase tracking-wider text-emerald-800';
            kpiDiffTitle.innerText = 'CHÊNH LỆCH ĐỐI SOÁT';
            kpiDiffAmount.className = 'text-2xl sm:text-3xl font-black tabular-nums font-heading mt-1 text-emerald-700';
            kpiDiffAmount.innerText = '0 đ';
            kpiDiffDesc.className = 'text-xs font-semibold mt-1 text-emerald-700';
            kpiDiffDesc.innerText = 'Khớp đúng 100%';
            if (kpiDiffIcon) kpiDiffIcon.className = 'w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center text-sm';
        }
    }
}

async function executePageSettlementSubmit() {
    const checkboxes = document.querySelectorAll('.page-settle-checkbox:checked');
    const tripIds = [];
    checkboxes.forEach(cb => {
        const id = parseInt(cb.getAttribute('data-trip-id'), 10);
        if (id) tripIds.push(id);
    });

    if (tripIds.length === 0) {
        showToast('warning', 'Vui lòng tích chọn ít nhất một chuyến xe để quyết toán gom!', 'Chưa chọn chuyến');
        return;
    }

    const confirmed = await showConfirmModal({
        title: 'Khóa Sổ & Quyết Toán Gom Chuyến',
        message: `Xác nhận khóa sổ và quyết toán gom ${tripIds.length} chuyến xe đã chọn?\n\nHệ thống sẽ tự động cập nhật đối soát chi phí, chốt hoàn ứng và hạch toán Sổ Quỹ Thu - Chi.`,
        confirmText: `Quyết Toán (${tripIds.length} Chuyến)`,
        cancelText: 'Huỷ bỏ',
        type: 'success',
        icon: 'ph-bold ph-seal-check text-2xl'
    });
    if (!confirmed) return;

    const notes = document.getElementById('page-settle-notes')?.value || '';
    const paymentMethod = document.getElementById('page-settle-payment-method')?.value || 'BANK';
    const autoCashbook = document.getElementById('page-settle-auto-cashbook')?.checked !== false;

    const btn = document.getElementById('btn-page-submit-settle');
    const btnText = document.getElementById('btn-page-submit-settle-text');
    if (btn) btn.disabled = true;
    if (btnText) btnText.innerText = 'Đang xử lý quyết toán...';

    try {
        const res = await fetchWithAuth('/api/accounting/driver-settlements/batch-settle/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                trip_ids: tripIds,
                settlement_notes: notes,
                payment_method: paymentMethod,
                auto_create_cash_transaction: autoCashbook
            })
        });

        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message, 'Quyết Toán Gom Thành Công');
            loadSettlementData();
            if (typeof loadAccountingData === 'function') loadAccountingData();
            if (typeof loadAccountingAdvancesData === 'function') loadAccountingAdvancesData();

            // Tự động mở ngay Phiếu Thu / Phiếu Chi vừa tạo để xem và in ấn
            if (data.cash_transaction || data.cash_transaction_id || data.cash_transaction_code) {
                setTimeout(() => {
                    openCashVoucherModal(data.cash_transaction || data.cash_transaction_id || data.cash_transaction_code);
                }, 350);
            }
        } else {
            const errorMsg = data.error || data.detail || data.message || (typeof data === 'string' ? data : 'Không thể thực hiện quyết toán gom');
            showToast('danger', errorMsg, 'Lỗi Quyết Toán Gom');
        }
    } catch (err) {
        console.error(err);
        showToast('danger', err.message || 'Lỗi kết nối máy chủ', 'Lỗi Hệ Thống');
    } finally {
        if (btn) btn.disabled = false;
        onSettlementTripSelectionChange();
    }
}

function exportSettlementToExcel() {
    const table = document.getElementById('settlement-trips-table');
    if (!table) {
        showToast('warning', 'Không tìm thấy bảng quyết toán');
        return;
    }

    const rows = table.querySelectorAll('tr');
    let csvContent = '\uFEFF';

    rows.forEach(row => {
        // Bỏ qua dòng checkbox header master hoặc checkbox cells
        const cols = row.querySelectorAll('th, td');
        const rowData = [];
        cols.forEach((col, idx) => {
            if (idx === 0 || idx === cols.length - 1) return; // Bỏ cột checkbox và chi tiết
            let text = col.innerText.replace(/"/g, '""').trim();
            text = text.replace(/[\n\r]+/g, ' ');
            rowData.push(`"${text}"`);
        });
        if (rowData.length > 0) {
            csvContent += rowData.join(',') + '\r\n';
        }
    });

    const filename = `BIM_Quyet_Toan_Gom_Chuyen_${new Date().toISOString().slice(0, 10)}.csv`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('success', `Đã xuất bảng kê quyết toán "${filename}" thành công!`, 'Xuất Excel Thành Công');
}

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

// -------------------------------------------------------------
// XUẤT BÁO CÁO EXCEL KẾ TOÁN & TẠM ỨNG
// -------------------------------------------------------------
function exportAccountingToExcel() {
    const activeSubtab = document.querySelector('.acct-subtab-content:not(.hidden)');
    if (!activeSubtab) {
        showToast('warning', 'Không tìm thấy bảng dữ liệu kế toán đang mở');
        return;
    }

    const table = activeSubtab.querySelector('table');
    if (!table) {
        showToast('warning', 'Bảng dữ liệu kế toán trống');
        return;
    }

    const rows = table.querySelectorAll('tr');
    let csvContent = '\uFEFF';

    rows.forEach(row => {
        const cols = row.querySelectorAll('th, td');
        const rowData = [];
        cols.forEach(col => {
            let text = col.innerText.replace(/"/g, '""').trim();
            text = text.replace(/[\n\r]+/g, ' ');
            rowData.push(`"${text}"`);
        });
        if (rowData.length > 0) {
            csvContent += rowData.join(',') + '\r\n';
        }
    });

    const subtabId = activeSubtab.id.replace('subtab-', '');
    const filename = `BIM_Logistics_KeToan_${subtabId}_${new Date().toISOString().slice(0, 10)}.csv`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('success', `Đã xuất dữ liệu "${filename}" thành công!`, 'Xuất Excel Thành Công');
}


// ==============================================================================
// 9.4. SUBTAB 4: ĐỐI SOÁT & THU HỒI CHI HỘ KHÁCH HÀNG (DEBIT NOTE CONTROLLER)
// ==============================================================================
let rawReimbursablesList = [];
let selectedReimbursableIds = new Set();

async function loadReimbursablesData() {
    try {
        const statusFilter = document.getElementById('reimburse-filter-status')?.value || 'ALL';
        const customerId = document.getElementById('reimburse-filter-customer')?.value || '';
        const search = document.getElementById('reimburse-search')?.value || '';

        const globalDates = getDateRangeForPeriod(currentDashboardPeriod, currentDashboardCustomStart, currentDashboardCustomEnd);
        let url = `/api/accounting/reimbursables/?reimbursement_status=${statusFilter}&from_date=${globalDates.fromDate}&to_date=${globalDates.toDate}`;
        if (customerId) url += `&customer_id=${customerId}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;

        const res = await fetchWithAuth(url);
        if (!res.ok) throw new Error('Không thể tải dữ liệu chi hộ');
        const data = await res.json();

        rawReimbursablesList = data.items || [];

        // Cập nhật KPIs
        if (data.kpis) {
            const kp = data.kpis;
            const elTotal = document.getElementById('reimburse-stat-total');
            if (elTotal) elTotal.innerText = formatMoneyVND(kp.total_amount);

            const elCollected = document.getElementById('reimburse-stat-collected');
            if (elCollected) elCollected.innerText = formatMoneyVND(kp.collected_amount);

            const elPending = document.getElementById('reimburse-stat-pending');
            if (elPending) elPending.innerText = formatMoneyVND(kp.pending_amount);

            const elBilled = document.getElementById('reimburse-stat-billed');
            if (elBilled) elBilled.innerText = formatMoneyVND(kp.billed_amount);

            const elCount = document.getElementById('reimburse-stat-count');
            if (elCount) elCount.innerText = `${kp.total_items_count} khoản chi hộ`;

            const elPCount = document.getElementById('reimburse-stat-pending-count');
            if (elPCount) elPCount.innerText = `${kp.pending_items_count} khoản chờ thu`;

            const badge = document.getElementById('badge-acct-reimbursables');
            if (badge) badge.innerText = kp.pending_items_count;
        }

        // Cập nhật dropdown Khách hàng (nếu chưa có hoặc lần đầu)
        const custSelect = document.getElementById('reimburse-filter-customer');
        if (custSelect && data.by_customer && custSelect.options.length <= 1) {
            data.by_customer.forEach(c => {
                if (c.customer_id) {
                    const opt = document.createElement('option');
                    opt.value = c.customer_id;
                    opt.textContent = `${c.customer_name} (${formatMoneyVND(c.pending_amount)} chờ thu)`;
                    custSelect.appendChild(opt);
                }
            });
        }

        renderReimbursablesTable(rawReimbursablesList);
    } catch (err) {
        console.error('Lỗi tải bảng kê chi hộ:', err);
        showToast('danger', 'Không thể kết nối máy chủ để tải bảng kê chi hộ', 'Lỗi Chi Hộ');
    }
}

function renderReimbursablesTable(list) {
    const tbody = document.getElementById('acct-reimburse-tbody');
    if (!tbody) return;

    if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" class="p-8 text-center text-slate-400 font-medium">Không tìm thấy khoản chi hộ nào phù hợp</td></tr>`;
        updateSelectedReimbursablesUI();
        return;
    }

    tbody.innerHTML = list.map(item => {
        const isChecked = selectedReimbursableIds.has(item.id) ? 'checked' : '';
        const isCollected = item.reimbursement_status === 'COLLECTED';
        const isBilled = item.reimbursement_status === 'BILLED';

        let statusBadge = `<span class="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-200">Chờ Thu</span>`;
        if (isBilled) {
            statusBadge = `<span class="px-2 py-0.5 rounded-full text-[11px] font-black bg-indigo-100 text-indigo-800 border border-indigo-200">Đã Lập Debit Note</span>`;
        } else if (isCollected) {
            statusBadge = `<span class="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">Đã Thu Hồi</span>`;
        }

        let invoiceInfo = '<span class="text-slate-400">Không có HĐ</span>';
        if (item.invoice_number) {
            invoiceInfo = `<div class="font-bold text-slate-800">Số: ${escapeHtml(item.invoice_number)}</div>`;
            if (item.invoice_lookup_code) {
                invoiceInfo += `<div class="text-[10px] text-teal-700 font-mono">Tra cứu: ${escapeHtml(item.invoice_lookup_code)}</div>`;
            }
        }

        let dnBadge = item.debit_note_number 
            ? `<span class="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">${escapeHtml(item.debit_note_number)}</span>`
            : '<span class="text-slate-400 text-xs">-</span>';

        return `
            <tr class="hover:bg-teal-50/30 transition-colors">
                <td class="text-center">
                    <input type="checkbox" value="${item.id}" ${isChecked} onchange="toggleReimbursableCheck(${item.id}, this)" class="rounded text-teal-600 focus:ring-teal-500">
                </td>
                <td>
                    <div class="font-bold text-teal-800 font-heading">[${escapeHtml(item.trip_code)}]</div>
                    <div class="text-[11px] text-slate-400 font-medium">${item.created_at}</div>
                </td>
                <td>
                    <div class="font-bold text-slate-800 max-w-[180px] truncate" title="${escapeHtml(item.customer_name)}">${escapeHtml(item.customer_name)}</div>
                    <div class="text-[11px] text-slate-500">TX: ${escapeHtml(item.driver_name)} (${escapeHtml(item.vehicle_plate)})</div>
                </td>
                <td>
                    <div class="font-mono font-bold text-slate-700">${escapeHtml(item.container_number || '-')}</div>
                    <div class="text-[11px] text-slate-400">BK: ${escapeHtml(item.booking_or_bill || '-')}</div>
                </td>
                <td>
                    <span class="px-2 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        ${escapeHtml(item.expense_item_name)}
                    </span>
                    ${item.notes ? `<div class="text-[10px] text-slate-400 italic mt-0.5">${escapeHtml(item.notes)}</div>` : ''}
                </td>
                <td class="text-right font-black text-slate-900 tabular-nums text-sm font-heading">
                    ${formatMoneyVND(item.amount)}
                </td>
                <td>${invoiceInfo}</td>
                <td>${dnBadge}</td>
                <td class="text-center">${statusBadge}</td>
                <td class="text-xs text-slate-500 font-medium">
                    ${item.reimbursed_at ? `<div class="text-emerald-700 font-bold">${item.reimbursed_at}</div><div class="text-[10px] text-slate-400">${escapeHtml(item.reimbursed_by_name)}</div>` : '-'}
                </td>
                <td class="text-center">
                    <div class="flex items-center justify-center gap-1.5">
                        ${!isCollected ? `
                            <button type="button" onclick="settleSingleReimbursement(${item.id})" class="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-colors" title="Xác nhận khách đã hoàn trả tiền">
                                <i class="ph-bold ph-check text-xs"></i> Thu Tiền
                            </button>
                        ` : `
                            <span class="text-xs text-emerald-600 font-bold flex items-center gap-1"><i class="ph-bold ph-check-circle"></i> Đã Thu</span>
                        `}
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    updateSelectedReimbursablesUI();
}

function toggleReimbursableCheck(id, checkbox) {
    if (checkbox.checked) {
        selectedReimbursableIds.add(id);
    } else {
        selectedReimbursableIds.delete(id);
    }
    updateSelectedReimbursablesUI();
}

function toggleCheckAllReimbursables(masterCheckbox) {
    const isChecked = masterCheckbox.checked;
    rawReimbursablesList.forEach(item => {
        if (isChecked) {
            selectedReimbursableIds.add(item.id);
        } else {
            selectedReimbursableIds.delete(item.id);
        }
    });
    renderReimbursablesTable(rawReimbursablesList);
}

function selectAllReimbursables(state) {
    const master = document.getElementById('reimburse-check-all');
    if (master) master.checked = state;
    toggleCheckAllReimbursables({ checked: state });
}

function updateSelectedReimbursablesUI() {
    const count = selectedReimbursableIds.size;
    const badge = document.getElementById('reimburse-selected-badge');
    if (badge) badge.innerText = count;

    const master = document.getElementById('reimburse-check-all');
    if (master) {
        master.checked = count > 0 && count === rawReimbursablesList.length;
    }
}

function openCreateDebitNoteModal() {
    if (selectedReimbursableIds.size === 0) {
        showToast('warning', 'Vui lòng tích chọn ít nhất 1 khoản chi hộ để gom nhóm lập Debit Note!');
        return;
    }

    const modal = document.getElementById('modal-debit-note');
    if (!modal) return;

    document.getElementById('dn-action-type').value = 'create_debit_note';
    document.getElementById('dn-expense-ids').value = Array.from(selectedReimbursableIds).join(',');

    // Tính tổng tiền
    let totalAmt = 0;
    const custNames = new Set();
    rawReimbursablesList.forEach(item => {
        if (selectedReimbursableIds.has(item.id)) {
            totalAmt += item.amount;
            if (item.customer_name) custNames.add(item.customer_name);
        }
    });

    document.getElementById('dn-selected-count').innerText = `${selectedReimbursableIds.size} khoản chi hộ`;
    document.getElementById('dn-selected-amount').innerText = formatMoneyVND(totalAmt);
    document.getElementById('dn-selected-customer').innerText = `Khách hàng: ${Array.from(custNames).join(', ') || 'Nhiều khách hàng'}`;

    // Auto generate DN code
    const now = new Date();
    const dStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const tStr = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
    document.getElementById('dn-number').value = `DN-${dStr}-${tStr}`;

    // UI state for create
    document.getElementById('debit-modal-title').innerText = 'Gom Nhóm & Lập Debit Note Chi Hộ';
    document.getElementById('dn-code-container').classList.remove('hidden');
    document.getElementById('dn-settle-fields').classList.add('hidden');
    document.getElementById('btn-submit-debit-note-label').innerText = 'Xác Nhận Lập Debit Note';

    modal.classList.remove('hidden');
}

function openSettleDebitNoteModal() {
    if (selectedReimbursableIds.size === 0) {
        showToast('warning', 'Vui lòng tích chọn các khoản chi hộ muốn xác nhận khách hàng đã hoàn tiền!');
        return;
    }

    const modal = document.getElementById('modal-debit-note');
    if (!modal) return;

    document.getElementById('dn-action-type').value = 'settle_reimbursement';
    document.getElementById('dn-expense-ids').value = Array.from(selectedReimbursableIds).join(',');

    let totalAmt = 0;
    const custNames = new Set();
    rawReimbursablesList.forEach(item => {
        if (selectedReimbursableIds.has(item.id)) {
            totalAmt += item.amount;
            if (item.customer_name) custNames.add(item.customer_name);
        }
    });

    document.getElementById('dn-selected-count').innerText = `${selectedReimbursableIds.size} khoản chi hộ`;
    document.getElementById('dn-selected-amount').innerText = formatMoneyVND(totalAmt);
    document.getElementById('dn-selected-customer').innerText = `Khách hàng hoàn tiền: ${Array.from(custNames).join(', ')}`;

    // UI state for settle
    document.getElementById('debit-modal-title').innerText = 'Xác Nhận Thu Hồi Chi Hộ (1-Chạm)';
    document.getElementById('dn-code-container').classList.add('hidden');
    document.getElementById('dn-settle-fields').classList.remove('hidden');
    document.getElementById('btn-submit-debit-note-label').innerText = 'Xác Nhận Đã Thu Tiền & Ghi Sổ Quỹ';

    modal.classList.remove('hidden');
}

function closeDebitNoteModal() {
    const modal = document.getElementById('modal-debit-note');
    if (modal) modal.classList.add('hidden');
}

async function handleSaveDebitNote(e) {
    e.preventDefault();
    const actionType = document.getElementById('dn-action-type').value;
    const expIdsStr = document.getElementById('dn-expense-ids').value;
    const expenseIds = expIdsStr ? expIdsStr.split(',').map(Number) : [];
    const dnNumber = document.getElementById('dn-number')?.value || '';
    const paymentMethod = document.getElementById('dn-payment-method')?.value || 'BANK';
    const bankName = document.getElementById('dn-bank-name')?.value || '';
    const notes = document.getElementById('dn-notes')?.value || '';

    try {
        let payload = { action: actionType, expense_ids: expenseIds, notes: notes };
        if (actionType === 'create_debit_note') {
            payload.debit_note_number = dnNumber;
        } else if (actionType === 'settle_reimbursement') {
            payload.payment_method = paymentMethod;
            payload.bank_name = bankName;
        }

        const res = await fetchWithAuth('/api/accounting/reimbursables/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (res.ok && data.success) {
            showToast('success', data.message, 'Thành Công');
            closeDebitNoteModal();
            selectedReimbursableIds.clear();
            loadReimbursablesData();
        } else {
            showToast('danger', data.error || 'Thao tác không thành công');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

async function settleSingleReimbursement(expenseId) {
    const confirmed = await showConfirmModal({
        title: 'Thu Hồi Chi Hộ',
        message: 'Xác nhận Khách hàng đã hoàn tiền cho khoản chi hộ này?\n\nHệ thống sẽ tự động hạch toán Phiếu Thu vào Sổ Quỹ.',
        confirmText: 'Thu Hồi Tiền',
        cancelText: 'Huỷ bỏ',
        type: 'success',
        icon: 'ph-bold ph-hand-coins text-2xl'
    });
    if (!confirmed) return;
    try {
        const res = await fetchWithAuth('/api/accounting/reimbursables/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'settle_reimbursement',
                expense_ids: [expenseId],
                payment_method: 'BANK',
                notes: 'Thu hoàn ứng chi hộ trực tiếp'
            })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message, 'Đã Thu Tiền Hoàn Ứng');
            loadReimbursablesData();
        } else {
            showToast('danger', data.error || 'Có lỗi xảy ra');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

function exportReimbursablesToExcel() {
    exportAccountingToExcel();
}


// ==============================================================================
// 9.5. SUBTAB 5: SỔ QUỸ THU - CHI & DÒNG TIỀN VẬN TẢI (CASH & BANK BOOK)
// ==============================================================================
let rawCashTransactionsList = [];

async function loadCashBookData() {
    try {
        const method = document.getElementById('cash-filter-method')?.value || 'ALL';
        const type = document.getElementById('cash-filter-type')?.value || 'ALL';
        const category = document.getElementById('cash-filter-category')?.value || 'ALL';
        const search = document.getElementById('cash-search')?.value || '';

        const globalDates = getDateRangeForPeriod(currentDashboardPeriod, currentDashboardCustomStart, currentDashboardCustomEnd);
        let url = `/api/accounting/cashbook/?payment_method=${method}&transaction_type=${type}&category=${category}&from_date=${globalDates.fromDate}&to_date=${globalDates.toDate}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;

        const res = await fetchWithAuth(url);
        if (!res.ok) throw new Error('Không thể tải Sổ Quỹ');
        const data = await res.json();

        rawCashTransactionsList = data.transactions || [];

        // Cập nhật KPIs
        if (data.kpis) {
            const kp = data.kpis;
            const elCash = document.getElementById('cash-stat-cash-balance');
            if (elCash) elCash.innerText = formatMoneyVND(kp.cash_balance);

            const elBank = document.getElementById('cash-stat-bank-balance');
            if (elBank) elBank.innerText = formatMoneyVND(kp.bank_balance);

            const elTotal = document.getElementById('cash-stat-total-balance');
            if (elTotal) elTotal.innerText = formatMoneyVND(kp.total_balance);

            const elNet = document.getElementById('cash-stat-period-net');
            if (elNet) {
                elNet.innerText = (kp.period_net >= 0 ? '+' : '') + formatMoneyVND(kp.period_net);
                elNet.className = `text-3xl font-black tabular-nums font-heading tracking-tight mt-1 ${kp.period_net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`;
            }

            const elInOut = document.getElementById('cash-stat-in-out-summary');
            if (elInOut) {
                elInOut.innerText = `Thu: +${formatMoneyVND(kp.period_inflow)} | Chi: -${formatMoneyVND(kp.period_outflow)}`;
            }
        }

        renderCashBookTable(rawCashTransactionsList);
    } catch (err) {
        console.error('Lỗi tải Sổ Quỹ:', err);
        showToast('danger', 'Không thể kết nối máy chủ để tải Sổ Quỹ Thu - Chi', 'Lỗi Sổ Quỹ');
    }
}

function renderCashBookTable(list) {
    const tbody = document.getElementById('acct-cash-tbody');
    if (!tbody) return;

    if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" class="p-8 text-center text-slate-400 font-medium">Không tìm thấy giao dịch thu chi nào phù hợp</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(item => {
        const isInflow = item.transaction_type === 'INFLOW';
        const typeBadge = isInflow
            ? `<span class="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">➕ Thu Tiền</span>`
            : `<span class="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-200">➖ Chi Tiền</span>`;

        const methodBadge = item.payment_method === 'BANK'
            ? `<span class="px-2 py-0.5 rounded-lg text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200"><i class="ph-bold ph-bank"></i> Ngân Hàng</span>`
            : `<span class="px-2 py-0.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200"><i class="ph-bold ph-money"></i> Tiền Mặt</span>`;

        const amountClass = isInflow ? 'text-emerald-700' : 'text-rose-700';
        const sign = isInflow ? '+' : '-';

        return `
            <tr class="hover:bg-slate-50/80 transition-colors">
                <td>
                    <div class="font-bold text-slate-800 font-mono text-xs">${escapeHtml(item.code)}</div>
                </td>
                <td class="text-xs text-slate-600 font-medium">${item.transaction_date}</td>
                <td class="text-center">${typeBadge}</td>
                <td>${methodBadge}</td>
                <td>
                    <span class="font-bold text-slate-800 text-xs">${escapeHtml(item.category_label)}</span>
                </td>
                <td>
                    <div class="font-bold text-slate-800">${escapeHtml(item.partner_name || '-')}</div>
                    ${item.partner_type_label ? `<div class="text-[10px] text-slate-400">${escapeHtml(item.partner_type_label)}</div>` : ''}
                </td>
                <td>
                    ${item.ref_code ? `<span class="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-bold">${escapeHtml(item.ref_code)}</span>` : '<span class="text-slate-400">-</span>'}
                </td>
                <td class="text-right font-black tabular-nums text-sm font-heading ${amountClass}">
                    ${sign}${formatMoneyVND(item.amount)}
                </td>
                <td class="text-xs text-slate-500">${escapeHtml(item.created_by || '-')}</td>
                <td class="text-xs text-slate-600 max-w-[220px] truncate" title="${escapeHtml(item.notes || '')}">
                    ${escapeHtml(item.notes || '-')}
                </td>
                <td class="text-center">
                    <button type="button" onclick="openCashVoucherModal('${escapeHtml(item.id || item.code)}')" 
                        class="px-2.5 py-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 rounded-lg text-xs font-bold shadow-2xs transition-colors inline-flex items-center gap-1 cursor-pointer"
                        title="Xem chi tiết & In phiếu Thu/Chi">
                        <i class="ph-bold ph-printer text-emerald-700"></i>
                        <span>In Phiếu</span>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// --- CHUYỂN ĐỔI SỐ TIỀN THÀNH CHỮ TIẾNG VIỆT CHUẨN KẾ TOÁN ---
function numberToWordsVN(n) {
    if (n === null || n === undefined || isNaN(n)) return '';
    let num = Math.abs(Math.round(Number(n)));
    if (num === 0) return 'Không đồng.';

    const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
    const scaleUnits = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

    function readGroup(group, showZeroHundred) {
        let h = Math.floor(group / 100);
        let t = Math.floor((group % 100) / 10);
        let u = group % 10;
        let res = '';

        if (h > 0 || showZeroHundred) {
            res += digits[h] + ' trăm ';
            if (t === 0 && u > 0) res += 'lẻ ';
        }

        if (t > 1) {
            res += digits[t] + ' mươi ';
            if (u === 1) res += 'mốt ';
            else if (u === 5) res += 'lăm ';
            else if (u > 0) res += digits[u] + ' ';
        } else if (t === 1) {
            res += 'mười ';
            if (u === 5) res += 'lăm ';
            else if (u > 0) res += digits[u] + ' ';
        } else if (u > 0 && !res.includes('lẻ')) {
            res += digits[u] + ' ';
        } else if (u > 0) {
            res += digits[u] + ' ';
        }

        return res.trim();
    }

    let groups = [];
    while (num > 0) {
        groups.push(num % 1000);
        num = Math.floor(num / 1000);
    }

    let words = '';
    for (let i = groups.length - 1; i >= 0; i--) {
        let g = groups[i];
        if (g > 0) {
            let showZeroHundred = (i < groups.length - 1) && (groups.length > 1);
            let gText = readGroup(g, showZeroHundred);
            let unit = scaleUnits[i] ? ' ' + scaleUnits[i] : '';
            words += (words ? ' ' : '') + gText + unit;
        }
    }

    words = words.trim();
    if (!words) return 'Không đồng.';
    words = words.charAt(0).toUpperCase() + words.slice(1) + ' đồng chẵn.';
    return words;
}

// --- QUẢN LÝ MODAL XEM CHI TIẾT & IN PHIẾU THU / CHI (MẪU 01-TT / 02-TT BTC) ---
let currentVoucherPrintMode = 'dual';

function setDynamicPrintPageStyle(cssText) {
    let styleEl = document.getElementById('dynamic-print-page-style');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'dynamic-print-page-style';
        document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = `@media print { ${cssText} }`;
}

function setVoucherPrintMode(mode = 'dual') {
    currentVoucherPrintMode = mode;
    const printArea = document.getElementById('cash-voucher-printable-area');
    const btnDual = document.getElementById('btn-voucher-mode-dual');
    const btnSingle = document.getElementById('btn-voucher-mode-single');

    if (printArea) {
        if (mode === 'dual') {
            printArea.classList.add('voucher-mode-dual');
            printArea.classList.remove('voucher-mode-single');
        } else {
            printArea.classList.add('voucher-mode-single');
            printArea.classList.remove('voucher-mode-dual');
        }
    }

    if (btnDual && btnSingle) {
        if (mode === 'dual') {
            btnDual.className = 'px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 bg-teal-600 text-white shadow-xs cursor-pointer';
            btnSingle.className = 'px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 text-slate-300 hover:text-white cursor-pointer';
        } else {
            btnSingle.className = 'px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 bg-teal-600 text-white shadow-xs cursor-pointer';
            btnDual.className = 'px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 text-slate-300 hover:text-white cursor-pointer';
        }
    }

    // Thiết lập khổ in chuẩn A4 dọc
    setDynamicPrintPageStyle(mode === 'dual' ? '@page { size: A4 portrait; margin: 3mm 4mm; }' : '@page { size: A4 portrait; margin: 8mm; }');
}

async function openCashVoucherModal(txDataOrId) {
    let tx = null;
    if (typeof txDataOrId === 'object' && txDataOrId !== null) {
        tx = txDataOrId;
    } else {
        try {
            const res = await fetchWithAuth(`/api/accounting/cashbook/${txDataOrId}/`);
            if (!res.ok) throw new Error('Không tìm thấy chứng từ');
            const data = await res.json();
            tx = data.transaction;
        } catch (err) {
            console.error('Lỗi tải chứng từ:', err);
            showToast('danger', 'Không thể tải chi tiết chứng từ để in', 'Lỗi In Phiếu');
            return;
        }
    }

    if (!tx) return;

    const modal = document.getElementById('modal-cash-voucher-print');
    if (!modal) return;

    const isInflow = tx.transaction_type === 'INFLOW';
    const titleText = isInflow ? 'PHIẾU THU' : 'PHIẾU CHI';
    const topTitleText = isInflow ? 'Phiếu Thu Sổ Quỹ (Mẫu 01-TT BTC)' : 'Phiếu Chi Sổ Quỹ (Mẫu 02-TT BTC)';
    const templateNoText = isInflow ? 'Mẫu số 01 - TT' : 'Mẫu số 02 - TT';
    const debitAcc = isInflow ? (tx.payment_method === 'BANK' ? '1121' : '1111') : '1411 / 331 / 642';
    const creditAcc = isInflow ? '1411 / 131 / 711' : (tx.payment_method === 'BANK' ? '1121' : '1111');
    const partnerLabel = isInflow ? 'Họ tên người nộp tiền:' : 'Họ tên người nhận tiền:';
    const signPartnerRole = isInflow ? 'Người Nộp Tiền' : 'Người Nhận Tiền';
    const reasonLabel = isInflow ? 'Lý do nộp:' : 'Lý do chi:';

    // Parse date parts
    let day = tx.day || '', month = tx.month || '', year = tx.year || '';
    if (!day && tx.transaction_date) {
        const parts = tx.transaction_date.split('/');
        if (parts.length === 3) {
            day = parts[0]; month = parts[1]; year = parts[2];
        }
    }
    if (!day) {
        const now = new Date();
        day = String(now.getDate()).padStart(2, '0');
        month = String(now.getMonth() + 1).padStart(2, '0');
        year = String(now.getFullYear());
    }

    const dateFormattedText = `Ngày ${day} tháng ${month} năm ${year}`;
    const signDateFormattedText = `Ngày ${day}/${month}/${year}`;
    const amountWords = numberToWordsVN(tx.amount);
    const amountFormatted = (formatMoneyVND(tx.amount) || '0') + ' đ';
    const methodFormatted = tx.payment_method === 'BANK' ? 'Chuyển khoản Ngân hàng' : 'Quỹ Tiền mặt';
    const departmentFormatted = tx.partner_type_label ? `${tx.partner_type_label} - Triền Võ Logistics` : 'Đội xe vận tải Triền Võ Logistics';
    const reasonFormatted = tx.notes || tx.category_label || (isInflow ? 'Thu hoàn ứng tiền thừa quyết toán gom chuyến' : 'Chi bù vượt ứng quyết toán gom chuyến');
    const attachmentsFormatted = tx.ref_code ? `01 Bảng kê [${tx.ref_code}] & chứng từ gốc` : '01 Bảng kê quyết toán chuyến & chứng từ gốc';

    // Helper cập nhật tất cả selector cùng class (đồng bộ Liên 1 & Liên 2)
    const setAllClassText = (cls, val) => {
        document.querySelectorAll(`#cash-voucher-printable-area .${cls}`).forEach(el => {
            el.innerText = val;
        });
    };

    const topTitleEl = document.getElementById('voucher-modal-top-title');
    if (topTitleEl) topTitleEl.innerText = topTitleText;

    const footerCodeEl = document.getElementById('print-v-footer-code');
    if (footerCodeEl) footerCodeEl.innerText = tx.code || '-';

    const copy2Badge = document.getElementById('voucher-copy-2-badge');
    if (copy2Badge) {
        copy2Badge.innerText = isInflow ? 'Liên 2: Giao cho người nộp tiền' : 'Liên 2: Giao cho người nhận tiền';
    }

    // Đồng bộ Liên 1 & Liên 2
    setAllClassText('v-template-no', templateNoText);
    setAllClassText('v-code', tx.code || '-');
    setAllClassText('v-debit-acc', debitAcc);
    setAllClassText('v-credit-acc', creditAcc);
    setAllClassText('v-title', titleText);
    setAllClassText('v-date', dateFormattedText);
    setAllClassText('v-sign-date', signDateFormattedText);
    setAllClassText('v-partner-label', partnerLabel);
    setAllClassText('v-sign-partner-role', signPartnerRole);
    setAllClassText('v-partner-name', tx.partner_name || 'Tài xế / Đối tác');
    setAllClassText('v-department', departmentFormatted);
    setAllClassText('v-reason-label', reasonLabel);
    setAllClassText('v-reason', reasonFormatted);
    setAllClassText('v-amount', amountFormatted);
    setAllClassText('v-method', methodFormatted);
    setAllClassText('v-amount-words', amountWords);
    setAllClassText('v-received-words', amountWords);
    setAllClassText('v-creator-name', tx.created_by || 'Kế toán viên');
    setAllClassText('v-attachments', attachmentsFormatted);

    // Đồng bộ thông tin công ty hệ thống lên phiếu thu chi
    syncCompanyProfileToPrintForms();

    // Mặc định chế độ 2 Liên / A4
    setVoucherPrintMode('dual');

    modal.classList.remove('hidden');
}

function closeCashVoucherModal() {
    const modal = document.getElementById('modal-cash-voucher-print');
    if (modal) modal.classList.add('hidden');
}

function printCashVoucher() {
    document.body.classList.add('is-printing-voucher');
    document.body.classList.remove('is-printing-quotation', 'is-printing-report');
    window.print();
}

window.openCashVoucherModal = openCashVoucherModal;
window.closeCashVoucherModal = closeCashVoucherModal;
window.printCashVoucher = printCashVoucher;
window.setVoucherPrintMode = setVoucherPrintMode;
window.setDynamicPrintPageStyle = setDynamicPrintPageStyle;
window.numberToWordsVN = numberToWordsVN;

function openCreateCashTransactionModal(defaultType = 'INFLOW') {
    const modal = document.getElementById('modal-cash-transaction');
    if (!modal) return;

    document.getElementById('cash-tx-type').value = defaultType;
    document.getElementById('cash-tx-date').value = new Date().toISOString().slice(0, 10);
    document.getElementById('cash-tx-amount').value = '';
    document.getElementById('cash-tx-partner-name').value = '';
    document.getElementById('cash-tx-ref').value = '';
    document.getElementById('cash-tx-notes').value = '';

    onCashTypeChange();
    onPaymentMethodChange();

    modal.classList.remove('hidden');
}

function closeCashTransactionModal() {
    const modal = document.getElementById('modal-cash-transaction');
    if (modal) modal.classList.add('hidden');
}

function onCashTypeChange() {
    const type = document.getElementById('cash-tx-type')?.value;
    const catSelect = document.getElementById('cash-tx-category');
    if (!catSelect) return;

    if (type === 'INFLOW') {
        catSelect.innerHTML = `
            <option value="FREIGHT_REVENUE">Thu cước vận tải từ khách hàng</option>
            <option value="REIMBURSABLE_COLLECTION">Thu hồi chi hộ (Debit Note)</option>
            <option value="ADVANCE_REFUND">Thu hoàn ứng tiền thừa (Tài xế/Điều vận)</option>
            <option value="OTHER_INFLOW">Thu khác</option>
        `;
        document.getElementById('cash-modal-title').innerText = 'Lập Phiếu Thu (Tiền Vào Quỹ)';
    } else {
        catSelect.innerHTML = `
            <option value="DISPATCHER_FUND_ADVANCE">Chi tạm ứng Quỹ Điều vận</option>
            <option value="DRIVER_TRIP_ADVANCE">Chi tạm ứng Chuyến xe (Tài xế)</option>
            <option value="ADVANCE_REIMBURSE">Chi bù vượt ứng (Hoàn ứng tài xế)</option>
            <option value="SUBCONTRACTOR_PAYMENT">Chi thanh toán Thầu phụ / Xe bạn</option>
            <option value="FUEL_PAYMENT">Chi mua xăng dầu</option>
            <option value="ETC_TOPUP">Chi nạp tiền tài khoản BOT/ETC</option>
            <option value="VEHICLE_MAINTENANCE">Chi bảo dưỡng sửa xe</option>
            <option value="OTHER_OUTFLOW">Chi phí khác</option>
        `;
        document.getElementById('cash-modal-title').innerText = 'Lập Phiếu Chi (Tiền Ra Khỏi Quỹ)';
    }
}

function onPaymentMethodChange() {
    const method = document.getElementById('cash-tx-method')?.value;
    const bankFields = document.getElementById('cash-bank-fields');
}

async function handleSaveCashTransaction(e) {
    e.preventDefault();
    const type = document.getElementById('cash-tx-type').value;
    const method = document.getElementById('cash-tx-method').value;
    const category = document.getElementById('cash-tx-category').value;
    const amount = document.getElementById('cash-tx-amount').value;
    const date = document.getElementById('cash-tx-date').value;
    const partnerType = document.getElementById('cash-tx-partner-type').value;
    const partnerName = document.getElementById('cash-tx-partner-name').value;
    const refCode = document.getElementById('cash-tx-ref').value;
    const bankName = document.getElementById('cash-tx-bank').value;
    const notes = document.getElementById('cash-tx-notes').value;

    try {
        const res = await fetchWithAuth('/api/accounting/cashbook/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transaction_type: type,
                payment_method: method,
                category: category,
                amount: amount,
                transaction_date: date,
                partner_type: partnerType,
                partner_name: partnerName,
                ref_code: refCode,
                bank_name: bankName,
                notes: notes
            })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message, 'Lập Phiếu Thành Công');
            closeCashTransactionModal();
            loadCashBookData();
        } else {
            showToast('danger', data.error || 'Có lỗi xảy ra');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

function exportCashBookToExcel() {
    exportAccountingToExcel();
}


// ==============================================================================
// 9.6. SUBTAB 6: QUYẾT TOÁN XE BẠN / THẦU PHỤ 3PL (SUBCONTRACTOR CONTROLLER)
// ==============================================================================
let rawSubcontractorList = [];

async function loadSubcontractorData() {
    try {
        const status = document.getElementById('subcon-filter-status')?.value || 'ALL';
        const search = document.getElementById('subcon-search')?.value || '';

        const globalDates = getDateRangeForPeriod(currentDashboardPeriod, currentDashboardCustomStart, currentDashboardCustomEnd);
        let url = `/api/accounting/subcontractor-settlements/?status=${status}&from_date=${globalDates.fromDate}&to_date=${globalDates.toDate}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;

        const res = await fetchWithAuth(url);
        if (!res.ok) throw new Error('Không thể tải quyết toán xe bạn');
        const data = await res.json();

        rawSubcontractorList = data.trips || [];

        // Cập nhật KPIs
        if (data.kpis) {
            const kp = data.kpis;
            const elTrips = document.getElementById('subcon-stat-trips');
            if (elTrips) elTrips.innerText = `${kp.total_trips} chuyến`;

            const elCost = document.getElementById('subcon-stat-cost');
            if (elCost) elCost.innerText = formatMoneyVND(kp.total_cost);

            const elAdv = document.getElementById('subcon-stat-advance');
            if (elAdv) elAdv.innerText = formatMoneyVND(kp.total_advance);

            const elRem = document.getElementById('subcon-stat-remaining');
            if (elRem) elRem.innerText = formatMoneyVND(kp.total_remaining);

            const elInfo = document.getElementById('subcon-stat-settled-info');
            if (elInfo) elInfo.innerText = `Đã quyết toán: ${kp.settled_count} / ${kp.total_trips} chuyến`;

            const badge = document.getElementById('badge-acct-subcontractors');
            if (badge) badge.innerText = kp.pending_count;

            const badgeFiltered = document.getElementById('subcon-filtered-badge');
            if (badgeFiltered) badgeFiltered.innerText = `Hiển thị: ${rawSubcontractorList.length} chuyến xe bạn`;
        }

        renderSubcontractorTable(rawSubcontractorList);
    } catch (err) {
        console.error('Lỗi tải quyết toán xe bạn:', err);
        showToast('danger', 'Không thể kết nối máy chủ để tải quyết toán xe bạn', 'Lỗi Thầu Phụ 3PL');
    }
}

function renderSubcontractorTable(list) {
    const tbody = document.getElementById('acct-subcon-tbody');
    if (!tbody) return;

    if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" class="p-8 text-center text-slate-400 font-medium">Không tìm thấy chuyến xe bạn nào phù hợp</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(item => {
        const isSettled = item.subcontractor_settlement_status === 'SETTLED';
        const isPartial = item.subcontractor_settlement_status === 'PARTIAL';

        let statusBadge = `<span class="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-200">Chờ Quyết Toán</span>`;
        if (isPartial) {
            statusBadge = `<span class="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-200">Đã Trả Một Phần</span>`;
        } else if (isSettled) {
            statusBadge = `<span class="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">Đã Quyết Toán</span>`;
        }

        const marginClass = item.gross_company_margin >= 0 ? 'text-teal-700' : 'text-rose-600';

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td>
                    <div class="font-bold text-slate-900 font-heading">[${escapeHtml(item.trip_code)}]</div>
                    <div class="text-[11px] text-slate-400">${item.created_at}</div>
                </td>
                <td>
                    <div class="font-bold text-slate-800 font-mono bg-slate-100 px-2 py-0.5 rounded inline-block">${escapeHtml(item.vehicle_plate)}</div>
                </td>
                <td>
                    <div class="font-semibold text-slate-800">${escapeHtml(item.driver_name)}</div>
                </td>
                <td>
                    <div class="font-bold text-slate-800 truncate max-w-[160px]" title="${escapeHtml(item.customer_name)}">${escapeHtml(item.customer_name)}</div>
                    <div class="text-[11px] text-slate-500">${escapeHtml(item.route_name)}</div>
                </td>
                <td class="text-right font-bold text-slate-700 tabular-nums">
                    ${formatMoneyVND(item.cached_revenue)}
                </td>
                <td class="text-right font-black text-rose-700 tabular-nums font-heading">
                    ${formatMoneyVND(item.subcontractor_cost)}
                </td>
                <td class="text-right font-bold tabular-nums ${marginClass}">
                    ${formatMoneyVND(item.gross_company_margin)}
                </td>
                <td class="text-right font-semibold text-amber-700 tabular-nums">
                    ${formatMoneyVND(item.subcontractor_advance)}
                </td>
                <td class="text-right font-black text-slate-900 tabular-nums font-heading text-sm">
                    ${formatMoneyVND(item.remaining_payable)}
                </td>
                <td class="text-center">${statusBadge}</td>
                <td class="text-xs text-slate-500 max-w-[140px] truncate" title="${escapeHtml(item.subcontractor_notes)}">
                    ${escapeHtml(item.subcontractor_notes || '-')}
                </td>
                <td class="text-center">
                    <div class="flex items-center justify-center gap-1.5">
                        <button type="button" onclick="openSubcontractorModal(${item.trip_id}, 'update_cost')" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors" title="Sửa thỏa thuận cước & tạm ứng">
                            <i class="ph-bold ph-pencil text-xs"></i>
                        </button>
                        ${!isSettled ? `
                            <button type="button" onclick="openSubcontractorModal(${item.trip_id}, 'settle')" class="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-colors" title="Quyết toán cước xe bạn & lập phiếu chi">
                                <i class="ph-bold ph-check text-xs"></i> Quyết Toán
                            </button>
                        ` : `
                            <span class="text-xs text-emerald-600 font-bold"><i class="ph-bold ph-check-circle"></i> Đã Xong</span>
                        `}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

let activeSubcontractorTrip = null;

function openSubcontractorModal(tripId, mode = 'update_cost') {
    const trip = rawSubcontractorList.find(t => t.trip_id === tripId);
    if (!trip) return;
    activeSubcontractorTrip = trip;

    const modal = document.getElementById('modal-subcontractor-settle');
    if (!modal) return;

    document.getElementById('subcon-trip-id').value = trip.trip_id;
    document.getElementById('subcon-action-type').value = mode;

    document.getElementById('subcon-trip-code').innerText = trip.trip_code;
    document.getElementById('subcon-vehicle-driver').innerText = `${trip.vehicle_plate} • ${trip.driver_name}`;
    document.getElementById('subcon-route').innerText = `${trip.customer_name} (${trip.route_name})`;
    document.getElementById('subcon-revenue').innerText = formatMoneyVND(trip.cached_revenue);

    document.getElementById('subcon-cost').value = trip.subcontractor_cost || '';
    document.getElementById('subcon-advance').value = trip.subcontractor_advance || '';
    document.getElementById('subcon-notes').value = trip.subcontractor_notes || '';

    const settleSection = document.getElementById('subcon-settle-section');
    const titleEl = document.getElementById('subcon-modal-title');
    const labelEl = document.getElementById('btn-save-subcon-label');

    if (mode === 'settle') {
        settleSection.classList.remove('hidden');
        titleEl.innerText = 'Quyết Toán Cước Xe Bạn & Xuất Phiếu Chi';
        labelEl.innerText = 'Xác Nhận Quyết Toán & Ghi Sổ Quỹ';
    } else {
        settleSection.classList.add('hidden');
        titleEl.innerText = 'Thỏa Thuận Cước & Tạm Ứng Xe Bạn';
        labelEl.innerText = 'Lưu Thỏa Thuận Cước';
    }

    calculateSubcontractorMargin();
    modal.classList.remove('hidden');
}

function closeSubcontractorModal() {
    const modal = document.getElementById('modal-subcontractor-settle');
    if (modal) modal.classList.add('hidden');
}

function calculateSubcontractorMargin() {
    if (!activeSubcontractorTrip) return;
    const cost = parseInt(document.getElementById('subcon-cost')?.value || '0', 10) || 0;
    const adv = parseInt(document.getElementById('subcon-advance')?.value || '0', 10) || 0;
    const rev = activeSubcontractorTrip.cached_revenue || 0;

    const margin = rev - cost;
    const rem = Math.max(0, cost - adv);

    const marginEl = document.getElementById('subcon-calc-margin');
    if (marginEl) {
        marginEl.innerText = formatMoneyVND(margin);
        marginEl.className = `font-black text-sm ${margin >= 0 ? 'text-teal-800' : 'text-rose-700'}`;
    }

    const remEl = document.getElementById('subcon-calc-remaining');
    if (remEl) {
        remEl.innerText = formatMoneyVND(rem);
    }
}

async function handleSaveSubcontractor(e) {
    e.preventDefault();
    if (!activeSubcontractorTrip) return;

    const action = document.getElementById('subcon-action-type').value;
    const tripId = document.getElementById('subcon-trip-id').value;
    const cost = document.getElementById('subcon-cost').value;
    const advance = document.getElementById('subcon-advance').value;
    const notes = document.getElementById('subcon-notes').value;
    const paymentMethod = document.getElementById('subcon-payment-method')?.value || 'BANK';
    const bankInfo = document.getElementById('subcon-bank-info')?.value || '';

    try {
        let payload = { action: action, trip_id: tripId, notes: notes };
        if (action === 'update_cost') {
            payload.subcontractor_cost = cost;
            payload.subcontractor_advance = advance;
        } else if (action === 'settle') {
            payload.payment_method = paymentMethod;
            payload.bank_name = bankInfo;
        }

        const res = await fetchWithAuth('/api/accounting/subcontractor-settlements/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message, 'Thành Công');
            closeSubcontractorModal();
            loadSubcontractorData();
        } else {
            showToast('danger', data.error || 'Có lỗi xảy ra');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

function exportSubcontractorToExcel() {
    exportAccountingToExcel();
}


// ==============================================================================
// 9.7. SUBTAB 7: ĐỐI SOÁT VÉ CẦU ĐƯỜNG BOT / ETC (BOT AUDIT CONTROLLER)
// ==============================================================================
async function loadBotAuditData() {
    try {
        const globalDates = getDateRangeForPeriod(currentDashboardPeriod, currentDashboardCustomStart, currentDashboardCustomEnd);
        const res = await fetchWithAuth(`/api/accounting/bot-audit/?from_date=${globalDates.fromDate}&to_date=${globalDates.toDate}`);
        if (!res.ok) throw new Error('Không thể tải đối soát vé BOT');
        const data = await res.json();

        // Cập nhật KPIs
        if (data.kpis) {
            const kp = data.kpis;
            const elTrips = document.getElementById('bot-stat-trips');
            if (elTrips) elTrips.innerText = `${kp.total_trips_with_toll} chuyến`;

            const elActual = document.getElementById('bot-stat-actual');
            if (elActual) elActual.innerText = formatMoneyVND(kp.total_actual_toll);

            const elStd = document.getElementById('bot-stat-standard');
            if (elStd) elStd.innerText = formatMoneyVND(kp.total_standard_toll);

            const elVar = document.getElementById('bot-stat-variance');
            if (elVar) elVar.innerText = `${kp.variance_count} chuyến`;
        }

        renderBotAuditTable(data.items || []);
    } catch (err) {
        console.error('Lỗi tải đối soát BOT:', err);
        showToast('danger', 'Không thể kết nối máy chủ để tải đối soát vé BOT', 'Lỗi Đối Soát BOT');
    }
}

function renderBotAuditTable(list) {
    const tbody = document.getElementById('acct-bot-tbody');
    if (!tbody) return;

    if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="p-8 text-center text-slate-400 font-medium">Không tìm thấy dữ liệu vé cầu đường BOT nào</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(item => {
        let badge = '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">Bình thường</span>';
        if (item.warning_level === 'HIGH') {
            badge = `<span class="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-200">⚠️ Vượt định mức (+${item.variance_percent}%)</span>`;
        } else if (item.warning_level === 'SAVING') {
            badge = `<span class="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">✅ Tiết kiệm (${item.variance_percent}%)</span>`;
        } else if (item.warning_level === 'NO_STANDARD') {
            badge = '<span class="text-xs text-slate-400 italic">Chưa có định mức</span>';
        }

        const diffClass = item.variance_amount > 0 ? 'text-rose-600' : (item.variance_amount < 0 ? 'text-emerald-600' : 'text-slate-600');
        const diffSign = item.variance_amount > 0 ? '+' : '';

        // Tóm tắt các vé
        const ticketsDesc = (item.tickets_detail || []).map(tk => 
            `<span class="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 mr-1" title="${escapeHtml(tk.invoice_issuer || '')}">${formatMoneyVND(tk.amount)}</span>`
        ).join('');

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td>
                    <div class="font-bold text-slate-900 font-heading">[${escapeHtml(item.trip_code)}]</div>
                </td>
                <td>
                    <div class="font-bold text-slate-800 font-mono bg-slate-100 px-2 py-0.5 rounded inline-block">${escapeHtml(item.vehicle_plate)}</div>
                </td>
                <td>
                    <div class="font-semibold text-slate-800">${escapeHtml(item.driver_name)}</div>
                </td>
                <td>
                    <div class="font-medium text-slate-700 text-xs">${escapeHtml(item.route_name)}</div>
                </td>
                <td class="text-center font-bold text-slate-800">${item.tickets_count} vé</td>
                <td class="text-right font-black text-rose-700 tabular-nums font-heading">
                    ${formatMoneyVND(item.actual_toll)}
                </td>
                <td class="text-right font-bold text-indigo-700 tabular-nums">
                    ${item.standard_toll > 0 ? formatMoneyVND(item.standard_toll) : '<span class="text-slate-400">-</span>'}
                </td>
                <td class="text-right font-black tabular-nums ${diffClass}">
                    ${item.standard_toll > 0 ? `${diffSign}${formatMoneyVND(item.variance_amount)}` : '<span class="text-slate-400">-</span>'}
                </td>
                <td class="text-center">${badge}</td>
                <td>
                    <div class="flex flex-wrap gap-1 items-center">
                        ${ticketsDesc || '<span class="text-slate-400">-</span>'}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function exportBotAuditToExcel() {
    exportAccountingToExcel();
}


// ==============================================================================
// 10. PHÂN HỆ CÀI ĐẶT & HỆ THỐNG DANH MỤC (MASTER DATA CONTROLLER)
// ==============================================================================
let currentMasterDataTab = 'driver_tariffs';
let masterDataCache = {
    driver_tariffs: [],
    allowances: [],
    locations: [],
    tariffs: [],
    customers: [],
    expenses: [],
    containers: [],
    vehicles: []
};

let masterDataPagination = {
    currentPage: 1,
    pageSize: 20,
    filteredItems: []
};

async function loadMasterData() {
    try {
        const res = await fetchWithAuth('/api/master-data/summary/');
        const data = await res.json();
        if (data.stats) {
            const s = data.stats;
            const el = id => document.getElementById(id);
            if (el('md-stat-company') && s.company_name) el('md-stat-company').innerText = s.company_name;
            if (el('md-stat-driver-tariffs')) el('md-stat-driver-tariffs').innerText = s.driver_tariffs_count || 0;
            if (el('md-stat-allowances')) el('md-stat-allowances').innerText = s.allowances_count || 0;
            if (el('md-stat-locations')) el('md-stat-locations').innerText = s.locations_count || 0;
            if (el('md-stat-tariffs')) el('md-stat-tariffs').innerText = s.tariffs_count || 0;
            if (el('md-stat-customers')) el('md-stat-customers').innerText = s.customers_count || 0;
            if (el('md-stat-expenses')) el('md-stat-expenses').innerText = s.expense_items_count || 0;
            if (el('md-stat-containers')) el('md-stat-containers').innerText = s.container_types_count || 0;
            if (el('md-stat-vehicles')) el('md-stat-vehicles').innerText = s.vehicles_count || 0;
            if (el('md-stat-trailers')) el('md-stat-trailers').innerText = s.trailers_count || 0;
            if (el('md-stat-shipping-lines')) el('md-stat-shipping-lines').innerText = s.shipping_lines_count || 0;
            if (el('md-stat-subcontractors')) el('md-stat-subcontractors').innerText = s.subcontractors_count || 0;
        }
    } catch (err) {
        console.error('Lỗi tải tóm tắt Cài đặt:', err);
    }
    if (currentMasterDataTab === 'company') {
        loadCompanyProfile();
    } else {
        loadActiveMasterDataTab();
    }
}

function switchMasterDataTab(tabKey) {
    currentMasterDataTab = tabKey;
    masterDataPagination.currentPage = 1;

    // 1. Highlight Sub-tab button
    document.querySelectorAll('.md-tab-btn').forEach(btn => {
        btn.classList.remove('active', 'border-teal-600', 'text-teal-800');
        btn.classList.add('border-transparent', 'text-slate-500');
    });
    const activeBtn = document.querySelector(`[data-md-tab="${tabKey}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active', 'border-teal-600', 'text-teal-800');
        activeBtn.classList.remove('border-transparent', 'text-slate-500');
    }

    // 2. Highlight Top KPI Pill
    document.querySelectorAll('.md-kpi-pill').forEach(pill => {
        pill.classList.remove('ring-2', 'ring-teal-600', 'bg-teal-50/60', 'border-teal-400');
        pill.classList.add('bg-white', 'border-slate-200');
    });
    const activePill = document.querySelector(`[data-md-pill="${tabKey}"]`);
    if (activePill) {
        activePill.classList.remove('bg-white', 'border-slate-200');
        activePill.classList.add('ring-2', 'ring-teal-600', 'bg-teal-50/60', 'border-teal-400');
    }

    const labels = {
        'company': '✏️ Hiệu Chỉnh Khai Báo HT',
        'driver_tariffs': '+ Thêm Mới Tuyến Lương',
        'allowances': '+ Thêm Mới Phụ Cấp',
        'locations': '+ Thêm Mới Cảng / Kho',
        'tariffs': '+ Thêm Mới Biểu Cước Khách',
        'customers': '+ Thêm Mới Khách Hàng',
        'expenses': '+ Thêm Mới Khoản Chi',
        'containers': '+ Thêm Mới Quy Cách',
        'vehicles': '+ Thêm Mới Đầu Kéo / Xe',
        'trailers': '+ Thêm Mới Rơ-Moóc',
        'shipping_lines': '+ Thêm Mới Hãng Tàu',
        'subcontractors': '+ Thêm Mới Xe Thầu Phụ'
    };
    const createBtnLabel = document.getElementById('md-create-btn-label');
    if (createBtnLabel) createBtnLabel.innerText = labels[tabKey] || '+ Thêm Mới';

    const searchInput = document.getElementById('md-search-input');
    if (searchInput) searchInput.value = '';

    const filterToolbar = document.getElementById('md-filter-toolbar');
    const tableContainer = document.getElementById('md-table-container');
    const paginationContainer = document.getElementById('md-pagination-container');
    const companyView = document.getElementById('md-company-view');

    if (tabKey === 'company') {
        if (filterToolbar) filterToolbar.classList.add('hidden');
        if (tableContainer) tableContainer.classList.add('hidden');
        if (paginationContainer) paginationContainer.classList.add('hidden');
        if (companyView) companyView.classList.remove('hidden');
        loadCompanyProfile();
    } else {
        if (filterToolbar) filterToolbar.classList.remove('hidden');
        if (tableContainer) tableContainer.classList.remove('hidden');
        if (paginationContainer) paginationContainer.classList.remove('hidden');
        if (companyView) companyView.classList.add('hidden');
        loadActiveMasterDataTab();
    }
}

function reloadActiveMasterDataTab() {
    if (currentMasterDataTab === 'company') {
        loadCompanyProfile();
    } else {
        loadActiveMasterDataTab();
    }
}

function syncCompanyProfileToPrintForms() {
    const comp = masterDataCache['company'] || window.SYSTEM_COMPANY || {};
    const compName = comp.company_name || 'CÔNG TY TNHH ĐẦU TƯ VẬN TẢI TRIỀN VÕ';
    const compAddress = comp.headquarters_address || comp.address || '153/1 Quốc Lộ 1A, P. An Phú Đông, Quận 12, TP. Hồ Chí Minh';
    const compTax = comp.tax_code || '0314567890';
    const compPhone = comp.hotline || comp.phone || '0965.559.561';
    const compEmail = comp.email || 'Phongkinhdoanh.tvl@trienvo.com';
    
    // Đảm bảo luôn lấy logo chính thức của Công ty Triền Võ (không lấy logo phần mềm BIM)
    let compLogo = comp.logo_url || '/static/images/trienvo_logo.png';
    if (!compLogo || compLogo.endsWith('/logo.png') || compLogo.includes('static/images/logo.png')) {
        compLogo = '/static/images/trienvo_logo.png';
    }

    // 1. Đồng bộ Tên công ty
    document.querySelectorAll('.print-comp-name').forEach(el => {
        el.innerText = compName.toUpperCase();
    });

    // 2. Đồng bộ Địa chỉ
    document.querySelectorAll('.print-comp-address').forEach(el => {
        el.innerText = `Đ/c: ${compAddress}`;
    });

    // 3. Đồng bộ Liên hệ (MST, Hotline, Email)
    document.querySelectorAll('.print-comp-contact').forEach(el => {
        el.innerText = `MST: ${compTax} • Hotline: ${compPhone} • Email: ${compEmail}`;
    });

    // 4. Đồng bộ Logo Công ty Triền Võ
    document.querySelectorAll('.print-comp-logo').forEach(el => {
        el.src = compLogo;
        el.onerror = () => { el.src = '/media/trienvo_logo.png'; };
    });
}
window.syncCompanyProfileToPrintForms = syncCompanyProfileToPrintForms;

async function loadCompanyProfile() {
    const container = document.getElementById('md-company-view');
    if (container) {
        container.innerHTML = `
            <div class="p-12 text-center text-slate-400">
                <i class="ph ph-spinner animate-spin text-3xl mb-2 text-teal-600 block"></i>
                Đang tải thông tin khai báo hệ thống...
            </div>
        `;
    }

    try {
        const res = await fetchWithAuth('/api/master-data/company/');
        if (!res.ok) throw new Error(`Máy chủ phản hồi lỗi ${res.status}`);
        const data = await res.json();
        const profile = data.data || {};
        masterDataCache['company'] = profile;
        window.SYSTEM_COMPANY = profile;

        if (profile.short_name || profile.company_name) {
            const el = document.getElementById('md-stat-company');
            if (el) el.innerText = profile.short_name || 'Triền Võ';
        }

        // Tự động đồng bộ lên tất cả các mẫu in
        syncCompanyProfileToPrintForms();

        renderCompanyProfileView(profile);
    } catch (err) {
        console.error('Lỗi tải thông tin công ty:', err);
        if (container) {
            container.innerHTML = `
                <div class="p-12 text-center text-rose-500 font-bold">
                    <i class="ph-bold ph-warning-circle text-3xl mb-2 block"></i>
                    Lỗi tải thông tin khai báo hệ thống: ${err.message || 'Không thể kết nối máy chủ.'}
                </div>
            `;
        }
    }
}

function renderCompanyProfileView(company) {
    const container = document.getElementById('md-company-view');
    if (!container) return;
    if (!company) {
        container.innerHTML = `
            <div class="p-8 text-center text-slate-400">
                <i class="ph ph-spinner animate-spin text-3xl mb-2 text-teal-600 block"></i>
                Đang tải thông tin khai báo hệ thống...
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="max-w-6xl mx-auto space-y-4">
            <!-- Header Card -->
            <div class="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 rounded-2xl p-5 md:p-6 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 border border-teal-700/50">
                <div class="flex items-start md:items-center space-x-4">
                    <div class="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-3xl font-black text-teal-300 shadow-inner shrink-0">
                        <i class="ph-bold ph-buildings"></i>
                    </div>
                    <div>
                        <div class="flex items-center gap-2 flex-wrap mb-1">
                            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-teal-500/30 text-teal-200 border border-teal-400/30">
                                ${escapeHtml(company.short_name || 'TRIỀN VÕ LOGISTICS')}
                            </span>
                            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                                <i class="ph-bold ph-check-circle"></i> Đang hoạt động
                            </span>
                            <span class="text-xs text-teal-300 font-mono">
                                MST: <strong class="text-white">${escapeHtml(company.tax_code || '---')}</strong>
                            </span>
                        </div>
                        <h2 class="text-lg md:text-xl font-black font-heading tracking-tight text-white leading-snug">
                            ${escapeHtml(company.company_name || 'CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ VẬN TẢI TRIỀN VÕ')}
                        </h2>
                        <p class="text-xs text-teal-200/80 mt-1 flex items-center gap-1.5 flex-wrap">
                            <span><i class="ph-bold ph-map-pin text-teal-300"></i> ${escapeHtml(company.address || '---')}</span>
                            <span class="text-teal-400">•</span>
                            <span>Cập nhật: <strong class="text-white">${escapeHtml(company.updated_at || '---')}</strong></span>
                        </p>
                    </div>
                </div>

                <div class="flex items-center gap-2 shrink-0">
                    <button onclick="openCreateMasterDataModal()" class="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs md:text-sm font-black font-heading shadow-md flex items-center space-x-2 transition-all cursor-pointer">
                        <i class="ph-bold ph-pencil-simple text-base"></i>
                        <span>Hiệu Chỉnh Thông Tin</span>
                    </button>
                </div>
            </div>

            <!-- 6 Structured Information Grid Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Card 1: Pháp lý & Định danh -->
                <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3.5">
                    <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div class="flex items-center space-x-2 text-teal-800 font-bold text-sm">
                            <i class="ph-bold ph-identification-card text-lg text-teal-600"></i>
                            <span>1. Pháp Lý & Định Danh Doanh Nghiệp</span>
                        </div>
                        <span class="text-[11px] font-bold text-slate-400">Pháp nhân</span>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                            <span class="block text-slate-400 font-medium text-[11px]">Tên pháp nhân:</span>
                            <strong class="text-slate-800 text-xs">${escapeHtml(company.company_name || '-')}</strong>
                        </div>
                        <div>
                            <span class="block text-slate-400 font-medium text-[11px]">Tên thương hiệu / Viết tắt:</span>
                            <strong class="text-teal-700 font-bold text-xs">${escapeHtml(company.short_name || '-')}</strong>
                        </div>
                        <div>
                            <span class="block text-slate-400 font-medium text-[11px]">Mã số thuế (MST):</span>
                            <strong class="text-slate-900 font-mono font-bold text-xs">${escapeHtml(company.tax_code || '-')}</strong>
                        </div>
                        <div>
                            <span class="block text-slate-400 font-medium text-[11px]">Giấy phép KD vận tải:</span>
                            <strong class="text-indigo-700 font-mono font-bold text-xs">${escapeHtml(company.operating_license || '-')}</strong>
                        </div>
                        <div>
                            <span class="block text-slate-400 font-medium text-[11px]">Người đại diện pháp luật:</span>
                            <strong class="text-slate-800 text-xs">${escapeHtml(company.representative_name || '-')}</strong>
                        </div>
                        <div>
                            <span class="block text-slate-400 font-medium text-[11px]">Chức danh đại diện:</span>
                            <strong class="text-slate-800 text-xs">${escapeHtml(company.representative_role || 'Giám Đốc')}</strong>
                        </div>
                    </div>
                </div>

                <!-- Card 2: Trụ sở & Kênh liên hệ -->
                <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3.5">
                    <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div class="flex items-center space-x-2 text-teal-800 font-bold text-sm">
                            <i class="ph-bold ph-buildings text-lg text-teal-600"></i>
                            <span>2. Trụ Sở Chính & Kênh Liên Lạc</span>
                        </div>
                        <span class="text-[11px] font-bold text-slate-400">Trụ sở</span>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div class="sm:col-span-2">
                            <span class="block text-slate-400 font-medium text-[11px]">Địa chỉ trụ sở chính (Đăng ký KD):</span>
                            <strong class="text-slate-800 text-xs leading-relaxed">${escapeHtml(company.address || '-')}</strong>
                        </div>
                        <div>
                            <span class="block text-slate-400 font-medium text-[11px]">Hotline / Điện thoại:</span>
                            <strong class="text-emerald-700 font-mono font-bold text-xs">${escapeHtml(company.phone || '-')}</strong>
                        </div>
                        <div>
                            <span class="block text-slate-400 font-medium text-[11px]">Email công ty:</span>
                            <strong class="text-blue-700 text-xs font-medium">${escapeHtml(company.email || '-')}</strong>
                        </div>
                        <div class="sm:col-span-2">
                            <span class="block text-slate-400 font-medium text-[11px]">Website chính thức:</span>
                            <a href="${escapeHtml(company.website || '#')}" target="_blank" class="text-teal-700 hover:underline font-bold text-xs flex items-center gap-1">
                                <span>${escapeHtml(company.website || '-')}</span>
                                <i class="ph ph-arrow-square-out text-xs"></i>
                            </a>
                        </div>
                    </div>
                </div>

                <!-- Card 3: Chi nhánh & Văn phòng đại diện -->
                <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3.5">
                    <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div class="flex items-center space-x-2 text-teal-800 font-bold text-sm">
                            <i class="ph-bold ph-storefront text-lg text-purple-600"></i>
                            <span>3. Chi Nhánh & Văn Phòng Đại Diện</span>
                        </div>
                        <span class="text-[11px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">Chi nhánh</span>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                            <span class="block text-slate-400 font-medium text-[11px]">Tên chi nhánh / Văn phòng:</span>
                            <strong class="text-slate-800 text-xs">${escapeHtml(company.branch_name || 'Văn Phòng Chi Nhánh')}</strong>
                        </div>
                        <div>
                            <span class="block text-slate-400 font-medium text-[11px]">Điện thoại chi nhánh:</span>
                            <strong class="text-emerald-700 font-mono font-bold text-xs">${escapeHtml(company.branch_phone || '-')}</strong>
                        </div>
                        <div class="sm:col-span-2">
                            <span class="block text-slate-400 font-medium text-[11px]">Địa chỉ chi nhánh:</span>
                            <strong class="text-slate-800 text-xs leading-relaxed">${escapeHtml(company.branch_address || '-')}</strong>
                        </div>
                    </div>
                </div>

                <!-- Card 4: Bãi xe & Trạm điều phối -->
                <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3.5">
                    <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div class="flex items-center space-x-2 text-teal-800 font-bold text-sm">
                            <i class="ph-bold ph-truck text-lg text-amber-600"></i>
                            <span>4. Bãi Đỗ Xe & Trạm Điều Phối Đầu Kéo</span>
                        </div>
                        <span class="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Bãi xe / Depot</span>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                            <span class="block text-slate-400 font-medium text-[11px]">Tên bãi đỗ xe:</span>
                            <strong class="text-slate-800 text-xs">${escapeHtml(company.fleet_yard_name || 'Bãi Đỗ Xe & Trạm Điều Phối TVL')}</strong>
                        </div>
                        <div>
                            <span class="block text-slate-400 font-medium text-[11px]">Hotline điều phối trực bãi:</span>
                            <strong class="text-amber-800 font-mono font-bold text-xs">${escapeHtml(company.fleet_yard_hotline || '-')}</strong>
                        </div>
                        <div class="sm:col-span-2">
                            <span class="block text-slate-400 font-medium text-[11px]">Địa chỉ bãi đỗ xe:</span>
                            <strong class="text-slate-800 text-xs leading-relaxed">${escapeHtml(company.fleet_yard_address || '-')}</strong>
                        </div>
                    </div>
                </div>

                <!-- Card 5: Tài khoản ngân hàng -->
                <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3.5">
                    <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div class="flex items-center space-x-2 text-teal-800 font-bold text-sm">
                            <i class="ph-bold ph-bank text-lg text-teal-600"></i>
                            <span>5. Tài Khoản Ngân Hàng Giao Dịch</span>
                        </div>
                        <span class="text-[11px] font-bold text-slate-400">Thanh toán</span>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                            <span class="block text-slate-400 font-medium text-[11px]">Số tài khoản:</span>
                            <strong class="text-emerald-800 font-mono font-black text-sm tracking-wide bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">${escapeHtml(company.bank_account_number || '-')}</strong>
                        </div>
                        <div>
                            <span class="block text-slate-400 font-medium text-[11px]">Chủ tài khoản:</span>
                            <strong class="text-slate-900 font-bold text-xs uppercase">${escapeHtml(company.company_name || '-')}</strong>
                        </div>
                        <div>
                            <span class="block text-slate-400 font-medium text-[11px]">Tên ngân hàng:</span>
                            <strong class="text-slate-800 text-xs">${escapeHtml(company.bank_name || '-')}</strong>
                        </div>
                        <div>
                            <span class="block text-slate-400 font-medium text-[11px]">Chi nhánh ngân hàng:</span>
                            <strong class="text-slate-800 text-xs">${escapeHtml(company.bank_branch || '-')}</strong>
                        </div>
                    </div>
                </div>

                <!-- Card 6: Tham số hệ thống & Tính cước -->
                <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3.5">
                    <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div class="flex items-center space-x-2 text-teal-800 font-bold text-sm">
                            <i class="ph-bold ph-sliders text-lg text-teal-600"></i>
                            <span>6. Tham Số Vận Hành & Tính Cước Mặc Định</span>
                        </div>
                        <span class="text-[11px] font-bold text-slate-400">Cấu hình</span>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span class="block text-slate-500 font-medium text-[11px]">Thuế VAT Mặc Định:</span>
                            <strong class="text-teal-800 font-mono font-black text-base">${Number(company.default_vat_rate || 8).toFixed(1)} %</strong>
                            <p class="text-[10px] text-slate-400 mt-0.5">Áp dụng báo giá & hóa đơn</p>
                        </div>
                        <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span class="block text-slate-500 font-medium text-[11px]">Giá Dầu Tham Chiếu:</span>
                            <strong class="text-amber-700 font-mono font-black text-base">${formatNumberVN(company.fuel_reference_price || 21000)} đ</strong>
                            <p class="text-[10px] text-slate-400 mt-0.5">Dầu DO 0.05S (VNĐ/Lít)</p>
                        </div>
                        <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span class="block text-slate-500 font-medium text-[11px]">Mẫu Số Quy Đổi CBM:</span>
                            <strong class="text-indigo-700 font-mono font-black text-base">${company.cbm_formula_divisor || 5000}</strong>
                            <p class="text-[10px] text-slate-400 mt-0.5">D x R x C / Divisor</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function loadActiveMasterDataTab() {
    const tableBody = document.getElementById('md-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-slate-400"><i class="ph ph-spinner animate-spin text-2xl mb-2 text-teal-600 block"></i>Đang tải dữ liệu...</td></tr>`;

    const endpoints = {
        'driver_tariffs': '/api/master-data/driver-tariffs/',
        'allowances': '/api/master-data/allowances/',
        'locations': '/api/master-data/locations/',
        'tariffs': '/api/master-data/tariffs/',
        'customers': '/api/master-data/customers/',
        'expenses': '/api/master-data/expense-items/',
        'containers': '/api/master-data/container-types/',
        'vehicles': '/api/master-data/vehicles/',
        'trailers': '/api/master-data/trailers/',
        'shipping_lines': '/api/master-data/shipping-lines/',
        'subcontractors': '/api/master-data/subcontractors/'
    };

    try {
        const url = endpoints[currentMasterDataTab];
        if (!url) throw new Error('Không tìm thấy API tương ứng với danh mục này.');
        const res = await fetchWithAuth(url);
        if (!res.ok) {
            throw new Error(`Máy chủ phản hồi lỗi ${res.status}: ${res.statusText}`);
        }
        const data = await res.json();
        const items = data.results || [];
        masterDataCache[currentMasterDataTab] = items;
        masterDataPagination.filteredItems = items;
        masterDataPagination.currentPage = 1;

        setupMasterDataSecondaryFilter(items);
        renderMasterDataPagedView();
    } catch (err) {
        console.error('Lỗi tải danh mục:', err);
        tableBody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-rose-500 font-bold"><i class="ph-bold ph-warning-circle text-2xl mb-2 block"></i>Lỗi tải danh mục: ${err.message || 'Không thể kết nối máy chủ.'}</td></tr>`;
        renderMasterDataPagination(0, 0, 0, 1, 1);
    }
}

function setupMasterDataSecondaryFilter(items) {
    const select = document.getElementById('md-secondary-filter');
    if (!select) return;

    let optionsHtml = '<option value="ALL">Tất cả</option>';
    if (currentMasterDataTab === 'driver_tariffs') {
        const areas = [...new Set(items.map(i => i.area_group))];
        areas.forEach(a => { optionsHtml += `<option value="${a}">${a}</option>`; });
    } else if (currentMasterDataTab === 'allowances') {
        const cats = [...new Set(items.map(i => i.category_label || i.category))];
        cats.forEach(c => { optionsHtml += `<option value="${c}">${c}</option>`; });
    } else if (currentMasterDataTab === 'locations') {
        const types = [...new Set(items.map(i => i.location_type_label || i.location_type))];
        types.forEach(t => { optionsHtml += `<option value="${t}">${t}</option>`; });
    } else if (currentMasterDataTab === 'expenses') {
        const groups = [...new Set(items.map(i => i.group_type_label || i.group_type))];
        groups.forEach(g => { optionsHtml += `<option value="${g}">${g}</option>`; });
    } else if (currentMasterDataTab === 'containers') {
        const cats = [...new Set(items.map(i => i.category_label || i.category))];
        cats.forEach(c => { optionsHtml += `<option value="${c}">${c}</option>`; });
    } else if (currentMasterDataTab === 'vehicles') {
        const owns = [...new Set(items.map(i => i.ownership_type_label || i.ownership_type))];
        owns.forEach(o => { optionsHtml += `<option value="${o}">${o}</option>`; });
    } else if (currentMasterDataTab === 'trailers') {
        const types = [...new Set(items.map(i => i.trailer_type))];
        types.forEach(t => { optionsHtml += `<option value="${t}">${t}</option>`; });
    } else if (currentMasterDataTab === 'shipping_lines') {
        optionsHtml += '<option value="ACTIVE">Đang hoạt động</option><option value="INACTIVE">Ngừng hoạt động</option>';
    } else if (currentMasterDataTab === 'subcontractors') {
        optionsHtml += '<option value="ACTIVE">Đang hợp tác</option><option value="INACTIVE">Tạm ngưng</option>';
    }
    select.innerHTML = optionsHtml;
}

function filterMasterDataTable() {
    const q = (document.getElementById('md-search-input')?.value || '').trim().toLowerCase();
    const subFilter = document.getElementById('md-secondary-filter')?.value || 'ALL';
    const allItems = masterDataCache[currentMasterDataTab] || [];

    const filtered = allItems.filter(item => {
        // Text match
        const str = JSON.stringify(item).toLowerCase();
        const matchesQuery = !q || str.includes(q);

        // Subfilter match
        let matchesSub = true;
        if (subFilter !== 'ALL') {
            if (currentMasterDataTab === 'driver_tariffs') matchesSub = item.area_group === subFilter;
            else if (currentMasterDataTab === 'allowances') matchesSub = (item.category_label === subFilter || item.category === subFilter);
            else if (currentMasterDataTab === 'locations') matchesSub = (item.location_type_label === subFilter || item.location_type === subFilter);
            else if (currentMasterDataTab === 'expenses') matchesSub = (item.group_type_label === subFilter || item.group_type === subFilter);
            else if (currentMasterDataTab === 'containers') matchesSub = (item.category_label === subFilter || item.category === subFilter);
            else if (currentMasterDataTab === 'vehicles') matchesSub = (item.ownership_type_label === subFilter || item.ownership_type === subFilter);
            else if (currentMasterDataTab === 'trailers') matchesSub = item.trailer_type === subFilter;
            else if (currentMasterDataTab === 'shipping_lines') matchesSub = (subFilter === 'ACTIVE' ? item.is_active : !item.is_active);
            else if (currentMasterDataTab === 'subcontractors') matchesSub = (subFilter === 'ACTIVE' ? item.is_active : !item.is_active);
        }
        return matchesQuery && matchesSub;
    });

    masterDataPagination.filteredItems = filtered;
    masterDataPagination.currentPage = 1;
    renderMasterDataPagedView();
}

function changeMasterDataPageSize(newSize) {
    masterDataPagination.pageSize = parseInt(newSize, 10) || 20;
    masterDataPagination.currentPage = 1;
    renderMasterDataPagedView();
}

function goToMasterDataPage(pageNumber) {
    const total = masterDataPagination.filteredItems.length;
    const totalPages = Math.max(1, Math.ceil(total / masterDataPagination.pageSize));
    if (pageNumber < 1 || pageNumber > totalPages) return;
    masterDataPagination.currentPage = pageNumber;
    renderMasterDataPagedView();

    const container = document.getElementById('md-table-container');
    if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderMasterDataPagedView() {
    const all = masterDataPagination.filteredItems || [];
    const total = all.length;
    const pageSize = masterDataPagination.pageSize;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    if (masterDataPagination.currentPage > totalPages) {
        masterDataPagination.currentPage = totalPages;
    }
    if (masterDataPagination.currentPage < 1) {
        masterDataPagination.currentPage = 1;
    }

    const currentPage = masterDataPagination.currentPage;
    const startIdx = (currentPage - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, total);
    const pagedItems = all.slice(startIdx, endIdx);

    renderMasterDataTable(pagedItems, total);
    renderMasterDataPagination(startIdx, endIdx, total, totalPages, currentPage);
}

function renderMasterDataPagination(startIdx, endIdx, total, totalPages, currentPage) {
    const rangeStart = document.getElementById('md-range-start');
    const rangeEnd = document.getElementById('md-range-end');
    const countDisplay = document.getElementById('md-count-display');
    const controls = document.getElementById('md-pagination-controls');
    const pageSizeSelect = document.getElementById('md-page-size');

    if (rangeStart) rangeStart.innerText = total === 0 ? 0 : (startIdx + 1);
    if (rangeEnd) rangeEnd.innerText = endIdx;
    if (countDisplay) countDisplay.innerText = total;
    if (pageSizeSelect && pageSizeSelect.value !== String(masterDataPagination.pageSize)) {
        pageSizeSelect.value = String(masterDataPagination.pageSize);
    }

    if (!controls) return;

    if (total === 0 || totalPages <= 1) {
        controls.innerHTML = `
            <button disabled class="p-1.5 min-w-[32px] h-[32px] rounded-lg text-xs font-bold border border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed flex items-center justify-center"><i class="ph-bold ph-caret-double-left text-sm"></i></button>
            <button disabled class="p-1.5 min-w-[32px] h-[32px] rounded-lg text-xs font-bold border border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed flex items-center justify-center"><i class="ph-bold ph-caret-left text-sm"></i></button>
            <button class="px-2.5 min-w-[32px] h-[32px] rounded-lg text-xs font-black bg-teal-700 text-white border border-teal-700 shadow-2xs flex items-center justify-center">1</button>
            <button disabled class="p-1.5 min-w-[32px] h-[32px] rounded-lg text-xs font-bold border border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed flex items-center justify-center"><i class="ph-bold ph-caret-right text-sm"></i></button>
            <button disabled class="p-1.5 min-w-[32px] h-[32px] rounded-lg text-xs font-bold border border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed flex items-center justify-center"><i class="ph-bold ph-caret-double-right text-sm"></i></button>
        `;
        return;
    }

    let html = '';

    // First page button
    const isFirstDisabled = currentPage <= 1;
    html += `
        <button onclick="goToMasterDataPage(1)" ${isFirstDisabled ? 'disabled' : ''} title="Trang đầu" class="p-1.5 min-w-[32px] h-[32px] rounded-lg text-xs font-bold border flex items-center justify-center ${isFirstDisabled ? 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-teal-700 cursor-pointer transition-colors shadow-2xs'}">
            <i class="ph-bold ph-caret-double-left text-sm"></i>
        </button>
    `;

    // Prev page button
    html += `
        <button onclick="goToMasterDataPage(${currentPage - 1})" ${isFirstDisabled ? 'disabled' : ''} title="Trang trước" class="p-1.5 min-w-[32px] h-[32px] rounded-lg text-xs font-bold border flex items-center justify-center ${isFirstDisabled ? 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-teal-700 cursor-pointer transition-colors shadow-2xs'}">
            <i class="ph-bold ph-caret-left text-sm"></i>
        </button>
    `;

    // Numeric Pages with intelligent windowing
    let pages = [];
    if (totalPages <= 7) {
        for (let p = 1; p <= totalPages; p++) pages.push(p);
    } else {
        if (currentPage <= 4) {
            pages = [1, 2, 3, 4, 5, '...', totalPages];
        } else if (currentPage >= totalPages - 3) {
            pages = [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        } else {
            pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
        }
    }

    pages.forEach(p => {
        if (p === '...') {
            html += `<span class="px-2 py-1 text-slate-400 font-bold select-none text-xs flex items-center justify-center">...</span>`;
        } else {
            const isActive = p === currentPage;
            html += `
                <button onclick="goToMasterDataPage(${p})" class="px-2.5 min-w-[32px] h-[32px] rounded-lg text-xs font-bold border transition-colors flex items-center justify-center cursor-pointer ${isActive ? 'bg-teal-700 border-teal-700 text-white shadow-xs font-black' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-teal-700 shadow-2xs'}">
                    ${p}
                </button>
            `;
        }
    });

    // Next page button
    const isLastDisabled = currentPage >= totalPages;
    html += `
        <button onclick="goToMasterDataPage(${currentPage + 1})" ${isLastDisabled ? 'disabled' : ''} title="Trang sau" class="p-1.5 min-w-[32px] h-[32px] rounded-lg text-xs font-bold border flex items-center justify-center ${isLastDisabled ? 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-teal-700 cursor-pointer transition-colors shadow-2xs'}">
            <i class="ph-bold ph-caret-right text-sm"></i>
        </button>
    `;

    // Last page button
    html += `
        <button onclick="goToMasterDataPage(${totalPages})" ${isLastDisabled ? 'disabled' : ''} title="Trang cuối" class="p-1.5 min-w-[32px] h-[32px] rounded-lg text-xs font-bold border flex items-center justify-center ${isLastDisabled ? 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-teal-700 cursor-pointer transition-colors shadow-2xs'}">
            <i class="ph-bold ph-caret-double-right text-sm"></i>
        </button>
    `;

    controls.innerHTML = html;
}

function renderMasterDataTable(items, total = items.length) {
    const tableHead = document.getElementById('md-table-head');
    const tableBody = document.getElementById('md-table-body');
    if (!tableHead || !tableBody) return;

    if (total === 0 || items.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-400 font-medium">Không tìm thấy bản ghi nào phù hợp.</td></tr>`;
        return;
    }

    // 1. BIỂU PHÍ LƯƠNG CHUYẾN
    if (currentMasterDataTab === 'driver_tariffs') {
        tableHead.innerHTML = `
            <tr>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Khu Vực Kho</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Tên Tuyến / KCN / Nhà Máy</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Trục Lấy / Hạ Cont Chuẩn</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Cự Ly</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-right sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Lương Chuyến</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Ghi Chú Nghiệp Vụ</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Trạng Thái</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 select-none">Thao Tác</th>
            </tr>
        `;
        tableBody.innerHTML = items.map(item => `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-200">
                <td class="py-2 px-3 text-[13px] font-semibold text-slate-800 border-r border-slate-200">${item.area_group}</td>
                <td class="py-2 px-3 text-[13px] font-bold text-slate-900 border-r border-slate-200">${item.route_name}</td>
                <td class="py-2 px-3 text-[12px] text-slate-600 max-w-xs truncate border-r border-slate-200">${item.pickup_drop_area || '—'}</td>
                <td class="py-2 px-3 text-center border-r border-slate-200 font-mono font-bold text-xs text-slate-800">
                    ${item.estimated_km ? `${item.estimated_km} km` : '—'}
                </td>
                <td class="py-2 px-3 text-[13px] font-bold text-slate-900 text-right font-mono tabular-nums border-r border-slate-200">${formatMoney(item.salary_rate)}</td>
                <td class="py-2 px-3 text-[12px] text-slate-600 border-r border-slate-200">${item.notes || '—'}</td>
                <td class="py-2 px-3 text-center border-r border-slate-200 text-xs font-semibold ${item.is_active ? 'text-emerald-700' : 'text-slate-400'}">
                    ${item.is_active ? 'Đang dùng' : 'Tạm ngưng'}
                </td>
                <td class="py-2 px-3 text-center">
                    <div class="flex items-center justify-center space-x-1">
                        <button onclick="openEditMasterDataModal(${item.id})" class="p-1 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded transition-colors cursor-pointer" title="Chỉnh sửa"><i class="ph-bold ph-pencil-simple text-sm"></i></button>
                        <button onclick="deleteMasterDataItem(${item.id})" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Xóa mềm"><i class="ph-bold ph-trash text-sm"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    // 2. PHỤ CẤP CẢNG XA & KIỂM HÓA
    else if (currentMasterDataTab === 'allowances') {
        tableHead.innerHTML = `
            <tr>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Mã</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Tên Phụ Cấp / Tác Nghiệp</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Phân Loại</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-right sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Mức Phụ Cấp</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Điều Kiện Áp Dụng</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Trạng Thái</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 select-none">Thao Tác</th>
            </tr>
        `;
        tableBody.innerHTML = items.map(item => `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-200">
                <td class="py-2 px-3 text-[12px] font-mono font-bold text-slate-900 border-r border-slate-200">${item.code}</td>
                <td class="py-2 px-3 text-[13px] font-bold text-slate-900 border-r border-slate-200">${item.name}</td>
                <td class="py-2 px-3 text-[12px] text-slate-700 font-medium border-r border-slate-200">${item.category_label || item.category}</td>
                <td class="py-2 px-3 text-[13px] font-bold text-slate-900 text-right font-mono tabular-nums border-r border-slate-200">+${formatMoney(item.amount)}</td>
                <td class="py-2 px-3 text-[12px] text-slate-600 border-r border-slate-200">${item.notes || '—'}</td>
                <td class="py-2 px-3 text-center border-r border-slate-200 text-xs font-semibold ${item.is_active ? 'text-emerald-700' : 'text-slate-400'}">
                    ${item.is_active ? 'Đang dùng' : 'Tạm ngưng'}
                </td>
                <td class="py-2 px-3 text-center">
                    <div class="flex items-center justify-center space-x-1">
                        <button onclick="openEditMasterDataModal(${item.id})" class="p-1 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded transition-colors cursor-pointer" title="Chỉnh sửa"><i class="ph-bold ph-pencil-simple text-sm"></i></button>
                        <button onclick="deleteMasterDataItem(${item.id})" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Xóa mềm"><i class="ph-bold ph-trash text-sm"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    // 3. ĐỊA ĐIỂM / CẢNG / KHO BÃI
    else if (currentMasterDataTab === 'locations') {
        tableHead.innerHTML = `
            <tr>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Mã Điểm</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Tên Địa Điểm / Cảng / Kho</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Phân Loại</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Tỉnh / Thành</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Địa Chỉ Chi Tiết</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Người Liên Hệ & SĐT</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Ghi Chú</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Trạng Thái</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 select-none">Thao Tác</th>
            </tr>
        `;
        tableBody.innerHTML = items.map(item => `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-200">
                <td class="py-2 px-3 text-[12px] font-mono font-bold text-slate-900 border-r border-slate-200">${item.code}</td>
                <td class="py-2 px-3 text-[13px] font-bold text-slate-900 border-r border-slate-200">${item.name}</td>
                <td class="py-2 px-3 text-[12px] font-medium text-slate-700 border-r border-slate-200">${item.location_type_label || item.location_type}</td>
                <td class="py-2 px-3 text-[12px] text-slate-700 border-r border-slate-200">${item.province || '—'}</td>
                <td class="py-2 px-3 text-[12px] text-slate-600 max-w-xs truncate border-r border-slate-200">${item.address || '—'}</td>
                <td class="py-2 px-3 text-[12px] text-slate-800 border-r border-slate-200">${item.contact_person ? `${item.contact_person} (${item.contact_phone || ''})` : (item.contact_phone || '—')}</td>
                <td class="py-2 px-3 text-[12px] text-slate-500 border-r border-slate-200">${item.notes || '—'}</td>
                <td class="py-2 px-3 text-center border-r border-slate-200 text-xs font-semibold ${item.is_active ? 'text-emerald-700' : 'text-slate-400'}">
                    ${item.is_active ? 'Đang dùng' : 'Tạm ngưng'}
                </td>
                <td class="py-2 px-3 text-center">
                    <div class="flex items-center justify-center space-x-1">
                        <button onclick="openEditMasterDataModal(${item.id})" class="p-1 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded transition-colors cursor-pointer" title="Chỉnh sửa"><i class="ph-bold ph-pencil-simple text-sm"></i></button>
                        <button onclick="deleteMasterDataItem(${item.id})" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Xóa mềm"><i class="ph-bold ph-trash text-sm"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    // 4. BIỂU CƯỚC KHÁCH HÀNG
    else if (currentMasterDataTab === 'tariffs') {
        tableHead.innerHTML = `
            <tr>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Khách Hàng</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Khu Vực Tuyến</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Quy Cách</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Nơi Lấy Cont</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Kho Giao Nhận</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Nơi Hạ Cont</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Cự Ly</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-right sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Đơn Giá Cước</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-right sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Định Mức Lương</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-right sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Định Mức BOT</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 select-none">Thao Tác</th>
            </tr>
        `;
        tableBody.innerHTML = items.map(item => `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-200">
                <td class="py-2 px-3 text-[13px] font-bold text-slate-900 border-r border-slate-200">${item.customer_name}</td>
                <td class="py-2 px-3 text-[12px] font-semibold text-slate-800 border-r border-slate-200">
                    ${item.origin_zone || 'Cát Lái'} ➔ ${item.destination_zone || 'Kho Khách'}
                </td>
                <td class="py-2 px-3 text-[12px] font-mono font-bold text-slate-800 border-r border-slate-200">${item.container_size || '40HC'}</td>
                <td class="py-2 px-3 text-[12px] font-semibold text-slate-800 border-r border-slate-200">${item.pickup_location}</td>
                <td class="py-2 px-3 text-[12px] font-semibold text-slate-800 border-r border-slate-200">${item.delivery_location}</td>
                <td class="py-2 px-3 text-[12px] text-slate-600 border-r border-slate-200">${item.dropoff_location || 'Hạ bãi'}</td>
                <td class="py-2 px-3 text-center border-r border-slate-200 font-mono font-bold text-xs text-slate-800">
                    ${item.estimated_km ? `${item.estimated_km} km` : '—'}
                </td>
                <td class="py-2 px-3 text-[13px] font-bold text-slate-900 text-right font-mono tabular-nums border-r border-slate-200">${formatMoney(item.freight_price)}</td>
                <td class="py-2 px-3 text-[13px] font-bold text-slate-900 text-right font-mono tabular-nums border-r border-slate-200">${formatMoney(item.driver_trip_pay)}</td>
                <td class="py-2 px-3 text-[13px] font-bold text-slate-900 text-right font-mono tabular-nums border-r border-slate-200">${formatMoney(item.toll_standard_fee || 0)}</td>
                <td class="py-2 px-3 text-center">
                    <div class="flex items-center justify-center space-x-1">
                        <button onclick="openEditMasterDataModal(${item.id})" class="p-1 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded transition-colors cursor-pointer" title="Chỉnh sửa"><i class="ph-bold ph-pencil-simple text-sm"></i></button>
                        <button onclick="deleteMasterDataItem(${item.id})" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Xóa mềm"><i class="ph-bold ph-trash text-sm"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    // 5. KHÁCH HÀNG
    else if (currentMasterDataTab === 'customers') {
        tableHead.innerHTML = `
            <tr>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Mã Khách</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Tên Khách Hàng / Doanh Nghiệp</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Mã Số Thuế</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Địa Chỉ</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Người Liên Hệ / SĐT</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Số Biểu Cước</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Ghi Chú</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 select-none">Thao Tác</th>
            </tr>
        `;
        tableBody.innerHTML = items.map(item => `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-200">
                <td class="py-2 px-3 text-[12px] font-mono font-bold text-slate-900 border-r border-slate-200">${item.code}</td>
                <td class="py-2 px-3 text-[13px] font-bold text-slate-900 border-r border-slate-200">${item.name}</td>
                <td class="py-2 px-3 text-[12px] font-mono text-slate-700 border-r border-slate-200">${item.tax_code || '—'}</td>
                <td class="py-2 px-3 text-[12px] text-slate-600 max-w-xs truncate border-r border-slate-200">${item.address || '—'}</td>
                <td class="py-2 px-3 text-[12px] text-slate-800 border-r border-slate-200">${item.contact_person ? `${item.contact_person} (${item.phone || ''})` : (item.phone || '—')}</td>
                <td class="py-2 px-3 text-center border-r border-slate-200 font-semibold text-[12px] text-slate-800">${item.tariffs_count || 0} tuyến</td>
                <td class="py-2 px-3 text-[12px] text-slate-500 border-r border-slate-200">${item.notes || '—'}</td>
                <td class="py-2 px-3 text-center">
                    <div class="flex items-center justify-center space-x-1">
                        <button onclick="openEditMasterDataModal(${item.id})" class="p-1 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded transition-colors cursor-pointer" title="Chỉnh sửa"><i class="ph-bold ph-pencil-simple text-sm"></i></button>
                        <button onclick="deleteMasterDataItem(${item.id})" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Xóa mềm"><i class="ph-bold ph-trash text-sm"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    // 6. KHOẢN MỤC CHI PHÍ
    else if (currentMasterDataTab === 'expenses') {
        tableHead.innerHTML = `
            <tr>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Mã Khoản Chi</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Tên Khoản Mục</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Nhóm Chi Phí</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-right sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Định Mức Tiền</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Yêu Cầu HĐĐT</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Ghi Chú</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Trạng Thái</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 select-none">Thao Tác</th>
            </tr>
        `;
        tableBody.innerHTML = items.map(item => `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-200">
                <td class="py-2 px-3 text-[12px] font-mono font-bold text-slate-900 border-r border-slate-200">${item.code}</td>
                <td class="py-2 px-3 text-[13px] font-bold text-slate-900 border-r border-slate-200">${item.name}</td>
                <td class="py-2 px-3 text-[12px] text-slate-700 font-medium border-r border-slate-200">${item.group_type_label || item.group_type}</td>
                <td class="py-2 px-3 text-[13px] font-bold text-slate-900 text-right font-mono tabular-nums border-r border-slate-200">${item.default_amount > 0 ? formatMoney(item.default_amount) : 'Theo thực tế'}</td>
                <td class="py-2 px-3 text-center border-r border-slate-200 text-xs font-semibold ${item.requires_invoice ? 'text-amber-700' : 'text-slate-500'}">
                    ${item.requires_invoice ? 'Bắt buộc HĐ' : 'Tùy chọn'}
                </td>
                <td class="py-2 px-3 text-[12px] text-slate-500 border-r border-slate-200">${item.notes || '—'}</td>
                <td class="py-2 px-3 text-center border-r border-slate-200 text-xs font-semibold ${item.is_active ? 'text-emerald-700' : 'text-slate-400'}">
                    ${item.is_active ? 'Đang dùng' : 'Tạm ngưng'}
                </td>
                <td class="py-2 px-3 text-center">
                    <div class="flex items-center justify-center space-x-1">
                        <button onclick="openEditMasterDataModal(${item.id})" class="p-1 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded transition-colors cursor-pointer" title="Chỉnh sửa"><i class="ph-bold ph-pencil-simple text-sm"></i></button>
                        <button onclick="deleteMasterDataItem(${item.id})" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Xóa mềm"><i class="ph-bold ph-trash text-sm"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    // 7. QUY CÁCH CONT & XE
    else if (currentMasterDataTab === 'containers') {
        tableHead.innerHTML = `
            <tr>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Mã Quy Cách</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Tên Quy Cách / Loại Thùng</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Phân Loại</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Hệ Số TEU</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-right sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Tải Trọng (kg)</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-right sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Thể Tích (CBM)</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Trạng Thái</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 select-none">Thao Tác</th>
            </tr>
        `;
        tableBody.innerHTML = items.map(item => `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-200">
                <td class="py-2 px-3 text-[12px] font-mono font-bold text-slate-900 border-r border-slate-200">${item.code}</td>
                <td class="py-2 px-3 text-[13px] font-bold text-slate-900 border-r border-slate-200">${item.name}</td>
                <td class="py-2 px-3 text-[12px] text-slate-700 font-medium border-r border-slate-200">${item.category_label || item.category}</td>
                <td class="py-2 px-3 text-center font-bold text-slate-800 font-mono text-[12px] border-r border-slate-200">${item.teu_factor > 0 ? item.teu_factor : '—'}</td>
                <td class="py-2 px-3 text-[13px] font-bold text-slate-900 text-right font-mono tabular-nums border-r border-slate-200">${formatMoney(item.max_payload_kg).replace(' đ', '')} kg</td>
                <td class="py-2 px-3 text-[13px] font-bold text-slate-900 text-right font-mono tabular-nums border-r border-slate-200">${item.cbm_capacity} m³</td>
                <td class="py-2 px-3 text-center border-r border-slate-200 text-xs font-semibold ${item.is_active ? 'text-emerald-700' : 'text-slate-400'}">
                    ${item.is_active ? 'Đang dùng' : 'Tạm ngưng'}
                </td>
                <td class="py-2 px-3 text-center">
                    <div class="flex items-center justify-center space-x-1">
                        <button onclick="openEditMasterDataModal(${item.id})" class="p-1 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded transition-colors cursor-pointer" title="Chỉnh sửa"><i class="ph-bold ph-pencil-simple text-sm"></i></button>
                        <button onclick="deleteMasterDataItem(${item.id})" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Xóa mềm"><i class="ph-bold ph-trash text-sm"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    // 8. ĐỘI XE & PHƯƠNG TIỆN
    else if (currentMasterDataTab === 'vehicles') {
        tableHead.innerHTML = `
            <tr>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Biển Số Xe</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Loại Phương Tiện</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Nguồn Sở Hữu</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Hãng SX</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-right sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Tải Trọng</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Tài Xế Mặc Định</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Hạn Đăng Kiểm</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Hạn Bảo Hiểm</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Trạng Thái</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 select-none">Thao Tác</th>
            </tr>
        `;
        tableBody.innerHTML = items.map(item => `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-200">
                <td class="py-2 px-3 text-[13px] font-mono font-bold text-slate-900 border-r border-slate-200">${item.license_plate}</td>
                <td class="py-2 px-3 text-[12px] font-medium text-slate-800 border-r border-slate-200">${item.vehicle_type_label || item.vehicle_type}</td>
                <td class="py-2 px-3 text-[12px] font-semibold text-slate-800 border-r border-slate-200">${item.ownership_type_label || item.ownership_type}</td>
                <td class="py-2 px-3 text-[12px] text-slate-600 border-r border-slate-200">${item.brand || '—'}</td>
                <td class="py-2 px-3 text-[12px] font-mono text-slate-800 text-right border-r border-slate-200">${formatMoney(item.payload_capacity_kg).replace(' đ', '')} kg</td>
                <td class="py-2 px-3 text-[12px] font-semibold text-slate-800 border-r border-slate-200">${item.driver_name || '—'}</td>
                <td class="py-2 px-3 text-[12px] text-center font-mono font-bold text-slate-700 border-r border-slate-200">${item.registration_expiry || '—'}</td>
                <td class="py-2 px-3 text-[12px] text-center font-mono text-slate-700 border-r border-slate-200">${item.insurance_expiry || '—'}</td>
                <td class="py-2 px-3 text-center border-r border-slate-200 text-xs font-semibold text-slate-800">
                    ${item.status === 'IDLE' ? 'Nằm bãi' : (item.status === 'ACTIVE' ? 'Đang chạy' : (item.status === 'MAINTENANCE' ? 'Bảo trì' : item.status_label || item.status))}
                </td>
                <td class="py-2 px-3 text-center">
                    <div class="flex items-center justify-center space-x-1">
                        <button onclick="openEditMasterDataModal(${item.id})" class="p-1 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded transition-colors cursor-pointer" title="Chỉnh sửa"><i class="ph-bold ph-pencil-simple text-sm"></i></button>
                        <button onclick="deleteMasterDataItem(${item.id})" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Xóa mềm"><i class="ph-bold ph-trash text-sm"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    // 9. RƠ-MOÓC CONTAINER
    else if (currentMasterDataTab === 'trailers') {
        tableHead.innerHTML = `
            <tr>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Biển Số Moóc</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Quy Cách / Loại Moóc</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Hãng Sản Xuất</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-right sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Tải Trọng</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Hạn Đăng Kiểm</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Trạng Thái</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 select-none">Thao Tác</th>
            </tr>
        `;
        tableBody.innerHTML = items.map(item => `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-200">
                <td class="py-2 px-3 text-[13px] font-mono font-bold text-slate-900 border-r border-slate-200">${item.license_plate}</td>
                <td class="py-2 px-3 text-[12px] font-medium text-slate-800 border-r border-slate-200">${item.trailer_type}</td>
                <td class="py-2 px-3 text-[12px] text-slate-600 border-r border-slate-200">${item.brand || '—'}</td>
                <td class="py-2 px-3 text-[13px] font-bold text-slate-900 text-right font-mono tabular-nums border-r border-slate-200">${formatMoney(item.payload_capacity_kg).replace(' đ', '')} kg</td>
                <td class="py-2 px-3 text-[12px] text-center font-mono font-bold text-slate-700 border-r border-slate-200">${item.registration_expiry || '—'}</td>
                <td class="py-2 px-3 text-center border-r border-slate-200 text-xs font-semibold text-slate-800">
                    ${item.status === 'IDLE' ? 'Nằm bãi' : (item.status === 'ACTIVE' ? 'Đang kéo' : item.status)}
                </td>
                <td class="py-2 px-3 text-center">
                    <div class="flex items-center justify-center space-x-1">
                        <button onclick="openEditMasterDataModal(${item.id})" class="p-1 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded transition-colors cursor-pointer" title="Chỉnh sửa"><i class="ph-bold ph-pencil-simple text-sm"></i></button>
                        <button onclick="deleteMasterDataItem(${item.id})" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Xóa mềm"><i class="ph-bold ph-trash text-sm"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    // 10. HÃNG TÀU (SHIPPING LINES)
    else if (currentMasterDataTab === 'shipping_lines') {
        tableHead.innerHTML = `
            <tr>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Mã Hãng Tàu</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Tên Đầy Đủ Hãng Vận Chuyển</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Hotline / CSKH</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Email & Cổng Web</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Free DEM</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Free DET</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Ghi Chú</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Trạng Thái</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 select-none">Thao Tác</th>
            </tr>
        `;
        tableBody.innerHTML = items.map(item => `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-200">
                <td class="py-2 px-3 text-[12px] font-mono font-bold text-slate-900 border-r border-slate-200">${item.code}</td>
                <td class="py-2 px-3 text-[13px] font-bold text-slate-900 border-r border-slate-200">${item.name}</td>
                <td class="py-2 px-3 text-[12px] font-mono text-slate-700 border-r border-slate-200">${item.contact_phone || '—'}</td>
                <td class="py-2 px-3 text-[12px] text-slate-600 border-r border-slate-200">
                    <div>${item.contact_email || '—'}</div>
                    ${item.website ? `<a href="${item.website}" target="_blank" class="text-teal-700 hover:underline text-[11px]">${item.website.replace('https://', '')}</a>` : ''}
                </td>
                <td class="py-2 px-3 text-center font-bold text-slate-800 font-mono text-[12px] border-r border-slate-200">${item.free_dem_days} ngày</td>
                <td class="py-2 px-3 text-center font-bold text-slate-800 font-mono text-[12px] border-r border-slate-200">${item.free_det_days} ngày</td>
                <td class="py-2 px-3 text-[12px] text-slate-500 border-r border-slate-200">${item.notes || '—'}</td>
                <td class="py-2 px-3 text-center border-r border-slate-200 text-xs font-semibold ${item.is_active ? 'text-emerald-700' : 'text-slate-400'}">
                    ${item.is_active ? 'Đang dùng' : 'Tạm ngưng'}
                </td>
                <td class="py-2 px-3 text-center">
                    <div class="flex items-center justify-center space-x-1">
                        <button onclick="openEditMasterDataModal(${item.id})" class="p-1 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded transition-colors cursor-pointer" title="Chỉnh sửa"><i class="ph-bold ph-pencil-simple text-sm"></i></button>
                        <button onclick="deleteMasterDataItem(${item.id})" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Xóa mềm"><i class="ph-bold ph-trash text-sm"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    // 11. NHÀ XE THẦU PHỤ / XE BẠN 3PL
    else if (currentMasterDataTab === 'subcontractors') {
        tableHead.innerHTML = `
            <tr>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Mã Nhà Xe</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Tên Đơn Vị / Đối Tác Vận Tải</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Mã Số Thuế</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Người Điều Hành & SĐT</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Thông Tin Tài Khoản Ngân Hàng</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Tuyến Thế Mạnh / Ghi Chú</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none">Trạng Thái</th>
                <th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 select-none">Thao Tác</th>
            </tr>
        `;
        tableBody.innerHTML = items.map(item => `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-200">
                <td class="py-2 px-3 text-[12px] font-mono font-bold text-slate-900 border-r border-slate-200">${item.code}</td>
                <td class="py-2 px-3 text-[13px] font-bold text-slate-900 border-r border-slate-200">
                    <div>${item.name}</div>
                    ${item.address ? `<div class="text-[11px] text-slate-500 font-normal truncate max-w-xs">${item.address}</div>` : ''}
                </td>
                <td class="py-2 px-3 text-[12px] font-mono text-slate-700 border-r border-slate-200">${item.tax_code || '—'}</td>
                <td class="py-2 px-3 text-[12px] text-slate-800 border-r border-slate-200">
                    <div class="font-bold">${item.contact_person || '—'}</div>
                    <div class="font-mono text-slate-700">${item.phone || '—'}</div>
                </td>
                <td class="py-2 px-3 text-[12px] border-r border-slate-200">
                    ${item.bank_account_number ? `
                        <div class="font-mono font-bold text-slate-900">${item.bank_account_number}</div>
                        <div class="text-[11px] text-slate-600">${item.bank_name || ''} ${item.bank_account_holder ? '• ' + item.bank_account_holder : ''}</div>
                    ` : '<span class="text-slate-400">Chưa có TK</span>'}
                </td>
                <td class="py-2 px-3 text-[12px] text-slate-600 max-w-xs truncate border-r border-slate-200">${item.notes || '—'}</td>
                <td class="py-2 px-3 text-center border-r border-slate-200 text-xs font-semibold ${item.is_active ? 'text-emerald-700' : 'text-slate-400'}">
                    ${item.is_active ? 'Đang hợp tác' : 'Tạm ngưng'}
                </td>
                <td class="py-2 px-3 text-center">
                    <div class="flex items-center justify-center space-x-1">
                        <button onclick="openEditMasterDataModal(${item.id})" class="p-1 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded transition-colors cursor-pointer" title="Chỉnh sửa"><i class="ph-bold ph-pencil-simple text-sm"></i></button>
                        <button onclick="deleteMasterDataItem(${item.id})" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Xóa mềm"><i class="ph-bold ph-trash text-sm"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
}

// Open Create Modal with Dynamic Form Fields
async function openCreateMasterDataModal() {
    await loadMasterDataFormOptions();
    document.getElementById('md-edit-id').value = '';
    document.getElementById('md-catalog-key').value = currentMasterDataTab;

    if (currentMasterDataTab === 'company') {
        const profile = masterDataCache['company'] || {};
        document.getElementById('md-modal-title').innerText = 'Hiệu Chỉnh Khai Báo Hệ Thống (Công Ty)';
        document.getElementById('md-modal-subtitle').innerText = 'Cập nhật thông tin pháp nhân & tham số vận hành chuẩn';
        injectMasterDataModalFields(profile);
        document.getElementById('modal-master-data').classList.remove('hidden');
        return;
    }

    const titles = {
        'driver_tariffs': 'Thêm Tuyến Lương Chuyến Mới',
        'allowances': 'Thêm Phụ Cấp / Kiểm Hóa Mới',
        'locations': 'Thêm Cảng / Kho Bãi Mới',
        'tariffs': 'Thêm Biểu Cước Khách Hàng',
        'customers': 'Thêm Khách Hàng Mới',
        'expenses': 'Thêm Khoản Mục Chi Phí',
        'containers': 'Thêm Quy Cách Cont & Xe',
        'vehicles': 'Thêm Đầu Kéo / Xe Tải Mới',
        'trailers': 'Thêm Rơ-Moóc Mới',
        'shipping_lines': 'Thêm Hãng Tàu Biển Mới',
        'subcontractors': 'Thêm Đối Tác Xe Thầu Phụ Mới'
    };
    document.getElementById('md-modal-title').innerText = titles[currentMasterDataTab] || 'Thêm Mới Bản Ghi';
    document.getElementById('md-modal-subtitle').innerText = 'Khai báo thông tin chuẩn vào hệ thống Cài đặt';

    injectMasterDataModalFields(null);
    document.getElementById('modal-master-data').classList.remove('hidden');
}

// Open Edit Modal with Current Data
async function openEditMasterDataModal(id) {
    await loadMasterDataFormOptions();
    if (currentMasterDataTab === 'company') {
        return openCreateMasterDataModal();
    }
    const items = masterDataCache[currentMasterDataTab] || [];
    const item = items.find(i => i.id === id);
    if (!item) return;

    document.getElementById('md-edit-id').value = id;
    document.getElementById('md-catalog-key').value = currentMasterDataTab;

    const titles = {
        'driver_tariffs': 'Chỉnh Sửa Tuyến Lương Chuyến',
        'allowances': 'Chỉnh Sửa Phụ Cấp / Kiểm Hóa',
        'locations': 'Chỉnh Sửa Cảng / Kho Bãi',
        'tariffs': 'Chỉnh Sửa Biểu Cước Khách Hàng',
        'customers': 'Chỉnh Sửa Khách Hàng',
        'expenses': 'Chỉnh Sửa Khoản Mục Chi Phí',
        'containers': 'Chỉnh Sửa Quy Cách Cont & Xe',
        'vehicles': 'Chỉnh Sửa Đầu Kéo / Xe Tải',
        'trailers': 'Chỉnh Sửa Rơ-Moóc',
        'shipping_lines': 'Chỉnh Sửa Hãng Tàu Biển',
        'subcontractors': 'Chỉnh Sửa Đối Tác Xe Thầu Phụ'
    };
    document.getElementById('md-modal-title').innerText = titles[currentMasterDataTab] || 'Chỉnh Sửa Bản Ghi';
    document.getElementById('md-modal-subtitle').innerText = `ID #${id} • Cập nhật thông tin chuẩn`;

    injectMasterDataModalFields(item);
    document.getElementById('modal-master-data').classList.remove('hidden');
}

function closeMasterDataModal() {
    const modal = document.getElementById('modal-master-data');
    if (modal) modal.classList.add('hidden');
}

function injectMasterDataModalFields(data) {
    const container = document.getElementById('md-modal-fields-container');
    if (!container) return;

    const d = data || {};

    if (currentMasterDataTab === 'company') {
        container.innerHTML = `
            <div class="p-3 bg-teal-50/70 border border-teal-200/80 rounded-xl mb-3 flex items-center space-x-2.5 text-xs text-teal-900 font-medium">
                <i class="ph-bold ph-info text-base text-teal-700 shrink-0"></i>
                <span>Thông tin Khai Báo Hệ Thống sẽ được sử dụng trên toàn bộ Báo giá, Đơn đặt hàng, Biên bản giao nhận POD và Hóa đơn quyết toán.</span>
            </div>

            <!-- Group 1: Pháp lý & Định danh -->
            <div class="text-xs font-bold text-teal-800 uppercase tracking-wider pb-1 border-b border-slate-200">1. Pháp Lý & Định Danh Doanh Nghiệp</div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-8">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tên Pháp Nhân Đầy Đủ <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-cp-name" value="${escapeHtml(d.company_name || '')}" placeholder="VD: CÔNG TY TNHH VẬN TẢI TRIỀN VÕ" class="form-input h-8.5 px-2.5 py-1 text-xs font-bold text-slate-800 w-full" required>
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tên Thương Hiệu / Viết Tắt</label>
                    </div>
                    <input type="text" id="mdf-cp-short-name" value="${escapeHtml(d.short_name || '')}" placeholder="VD: TRIỀN VÕ LOGISTICS" class="form-input h-8.5 px-2.5 py-1 text-xs font-bold text-teal-700 w-full">
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Mã Số Thuế (MST) <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-cp-tax-code" value="${escapeHtml(d.tax_code || '')}" placeholder="VD: 0312345678" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-slate-800 w-full" required>
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Giấy Phép KD Vận Tải</label>
                    </div>
                    <input type="text" id="mdf-cp-license" value="${escapeHtml(d.operating_license || '')}" placeholder="VD: GP-VT-2024/TPHCM" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Người Đại Diện & Chức Vụ</label>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <input type="text" id="mdf-cp-rep-name" value="${escapeHtml(d.representative_name || '')}" placeholder="Họ tên" class="form-input h-8.5 px-2.5 py-1 text-xs font-semibold text-slate-800 w-2/3">
                        <input type="text" id="mdf-cp-rep-role" value="${escapeHtml(d.representative_role || 'Giám Đốc')}" placeholder="Chức vụ" class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-1/3">
                    </div>
                </div>
            </div>

            <!-- Group 2: Trụ sở & Liên hệ -->
            <div class="text-xs font-bold text-teal-800 uppercase tracking-wider pt-2 pb-1 border-b border-slate-200">2. Trụ Sở & Thông Tin Liên Hệ</div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Địa Chỉ Trụ Sở Chính (Đăng ký KD) <span class="text-rose-500">*</span></label>
                </div>
                <input type="text" id="mdf-cp-address" value="${escapeHtml(d.address || '')}" placeholder="VD: Số 123 Đường Nguyễn Văn Linh, P. Tân Thuận Tây, Quận 7, TP. HCM" class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full" required>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Hotline / Điện Thoại <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-cp-phone" value="${escapeHtml(d.phone || '')}" placeholder="VD: 0903.123.456" class="form-input h-8.5 px-2.5 py-1 text-xs font-bold text-emerald-700 w-full" required>
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Email Liên Hệ</label>
                    </div>
                    <input type="email" id="mdf-cp-email" value="${escapeHtml(d.email || '')}" placeholder="VD: contact@trienvo.com" class="form-input h-8.5 px-2.5 py-1 text-xs text-blue-700 w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Website Công Ty</label>
                    </div>
                    <input type="text" id="mdf-cp-website" value="${escapeHtml(d.website || '')}" placeholder="VD: https://trienvo.com" class="form-input h-8.5 px-2.5 py-1 text-xs text-teal-700 w-full">
                </div>
            </div>

            <!-- Group 3: Chi nhánh & Văn phòng -->
            <div class="text-xs font-bold text-teal-800 uppercase tracking-wider pt-2 pb-1 border-b border-slate-200">3. Chi Nhánh & Văn Phòng Đại Diện</div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-8">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tên Chi Nhánh / Văn Phòng Đại Diện</label>
                    </div>
                    <input type="text" id="mdf-cp-branch-name" value="${escapeHtml(d.branch_name || '')}" placeholder="VD: Chi Nhánh Hải Phòng / Văn Phòng Kho Sóng Thần" class="form-input h-8.5 px-2.5 py-1 text-xs font-semibold text-slate-800 w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Điện Thoại Chi Nhánh</label>
                    </div>
                    <input type="text" id="mdf-cp-branch-phone" value="${escapeHtml(d.branch_phone || '')}" placeholder="VD: 0225.3123.456" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
                </div>
                <div class="md:col-span-12">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Địa Chỉ Chi Nhánh</label>
                    </div>
                    <input type="text" id="mdf-cp-branch-address" value="${escapeHtml(d.branch_address || '')}" placeholder="VD: Lô CN-02, KCN Đình Vũ, P. Đông Hải 2, Q. Hải An, Hải Phòng" class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
            </div>

            <!-- Group 4: Bãi xe & Trạm điều phối -->
            <div class="text-xs font-bold text-teal-800 uppercase tracking-wider pt-2 pb-1 border-b border-slate-200">4. Bãi Đỗ Xe & Trạm Điều Phối Đầu Kéo</div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-8">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tên Bãi Xe / Depot Tập Kết</label>
                    </div>
                    <input type="text" id="mdf-cp-yard-name" value="${escapeHtml(d.fleet_yard_name || '')}" placeholder="VD: Bãi Xe Trung Tâm Sóng Thần - Dĩ An" class="form-input h-8.5 px-2.5 py-1 text-xs font-semibold text-slate-800 w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Hotline Điều Phối Trực Bãi</label>
                    </div>
                    <input type="text" id="mdf-cp-yard-hotline" value="${escapeHtml(d.fleet_yard_hotline || '')}" placeholder="VD: 0918.888.999" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-amber-700 w-full">
                </div>
                <div class="md:col-span-12">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Địa Chỉ Bãi Đỗ & Trạm Điều Phối</label>
                    </div>
                    <input type="text" id="mdf-cp-yard-address" value="${escapeHtml(d.fleet_yard_address || '')}" placeholder="VD: Đường ĐT743, KCN Sóng Thần 1, Dĩ An, Bình Dương" class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
            </div>

            <!-- Group 5: Ngân hàng -->
            <div class="text-xs font-bold text-teal-800 uppercase tracking-wider pt-2 pb-1 border-b border-slate-200">5. Tài Khoản Ngân Hàng Giao Dịch</div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Số Tài Khoản</label>
                    </div>
                    <input type="text" id="mdf-cp-bank-acc" value="${escapeHtml(d.bank_account_number || '')}" placeholder="VD: 19030000000001" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-emerald-800 w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tên Ngân Hàng</label>
                    </div>
                    <input type="text" id="mdf-cp-bank-name" value="${escapeHtml(d.bank_name || '')}" placeholder="VD: Ngân hàng Techcombank" class="form-input h-8.5 px-2.5 py-1 text-xs font-semibold text-slate-800 w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Chi Nhánh</label>
                    </div>
                    <input type="text" id="mdf-cp-bank-branch" value="${escapeHtml(d.bank_branch || '')}" placeholder="VD: Chi nhánh Nam Sài Gòn" class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
            </div>

            <!-- Group 6: Tham số hệ thống -->
            <div class="text-xs font-bold text-teal-800 uppercase tracking-wider pt-2 pb-1 border-b border-slate-200">6. Tham Số Vận Hành & Tính Cước Mặc Định</div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Thuế VAT Mặc Định (%)</label>
                    </div>
                    <input type="number" id="mdf-cp-vat" value="${d.default_vat_rate || 8}" step="0.1" min="0" max="100" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-teal-800 text-center w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Giá Dầu Tham Chiếu (VNĐ/Lít)</label>
                    </div>
                    <input type="text" inputmode="numeric" id="mdf-cp-fuel-price" value="${d.fuel_reference_price ? formatNumberVN(d.fuel_reference_price) : '21.000'}" class="input-number-vn form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-amber-700 text-right w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Mẫu Số Quy Đổi CBM</label>
                    </div>
                    <input type="number" id="mdf-cp-cbm-divisor" value="${d.cbm_formula_divisor || 5000}" step="100" min="1000" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-indigo-700 text-center w-full">
                </div>
            </div>

            <!-- Group 7: Ghi chú & Chính sách -->
            <div class="text-xs font-bold text-teal-800 uppercase tracking-wider pt-2 pb-1 border-b border-slate-200">7. Ghi Chú & Chính Sách Vận Hành Toàn Hệ Thống</div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Ghi Chú Vận Hành / Tiêu Chuẩn Phục Vụ</label>
                </div>
                <textarea id="mdf-cp-notes" rows="2" placeholder="VD: Áp dụng phụ phí nâng hạ ngoài giờ sau 18h; Quy định kiểm tra seal nguyên vẹn trước khi kéo..." class="form-input px-2.5 py-1.5 text-xs text-slate-800 w-full">${escapeHtml(d.notes || '')}</textarea>
            </div>
        `;
    } else if (currentMasterDataTab === 'driver_tariffs') {
        const areas = ['Khu Vực Củ Chi', 'Khu Vực Long An', 'Khu Vực Tây Ninh', 'Khu Vực Bình Dương', 'Khu Vực Đồng Nai', 'Khu Vực TP.HCM', 'Khu Vực Vũng Tàu', 'Tuyến Đặc Thù'];
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Khu Vực Kho <span class="text-rose-500">*</span></label>
                    </div>
                    <select id="mdf-area-group" class="form-select h-8.5 px-2.5 py-1 text-xs font-bold text-slate-800 w-full">
                        ${areas.map(a => `<option value="${a}" ${d.area_group === a ? 'selected' : ''}>${a}</option>`).join('')}
                    </select>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tên Tuyến / KCN / Nhà Máy <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-route-name" value="${d.route_name || ''}" placeholder="VD: KCN Phước Đông, KCN Bàu Bàng..." class="form-input h-8.5 px-2.5 py-1 text-xs font-semibold text-slate-800 w-full" required>
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Trục Lấy / Hạ Cont Chuẩn</label>
                </div>
                <input type="text" id="mdf-pickup-drop" value="${d.pickup_drop_area || 'Cát Lái, SPITC, Thủ Đức, Tân Vạn, Sóng Thần, VICT, Q4, Q7'}" placeholder="Cát Lái, SPITC, Thủ Đức..." class="form-input h-8.5 px-2.5 py-1 text-xs font-medium text-slate-800 w-full">
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-start">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Cự Ly Ước Tính (km)</label>
                        <span class="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">Bước 10km</span>
                    </div>
                    <input type="number" id="mdf-estimated-km" value="${d.estimated_km || 30}" step="10" min="0" onchange="roundEstimatedKmInput(this)" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-center w-full">
                    <div class="flex items-center gap-1 mt-1 text-[11px] text-slate-500 flex-wrap">
                        <span class="text-[10px] text-slate-400 font-semibold">Nhanh:</span>
                        <button type="button" onclick="setTariffKm(20)" class="px-1.5 py-0.2 rounded bg-slate-100 hover:bg-indigo-100 font-bold transition-colors">20k</button>
                        <button type="button" onclick="setTariffKm(30)" class="px-1.5 py-0.2 rounded bg-slate-100 hover:bg-indigo-100 font-bold transition-colors">30k</button>
                        <button type="button" onclick="setTariffKm(50)" class="px-1.5 py-0.2 rounded bg-slate-100 hover:bg-indigo-100 font-bold transition-colors">50k</button>
                        <button type="button" onclick="setTariffKm(70)" class="px-1.5 py-0.2 rounded bg-slate-100 hover:bg-indigo-100 font-bold transition-colors">70k</button>
                        <button type="button" onclick="setTariffKm(100)" class="px-1.5 py-0.2 rounded bg-slate-100 hover:bg-indigo-100 font-bold transition-colors">100k</button>
                    </div>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Mức Lương Chuyến (VNĐ) <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" inputmode="numeric" id="mdf-salary-rate" value="${d.salary_rate ? formatNumberVN(d.salary_rate) : '600.000'}" class="input-number-vn form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-emerald-700 text-right w-full" required>
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Ghi Chú Điều Kiện Áp Dụng</label>
                </div>
                <input type="text" id="mdf-notes" value="${d.notes || ''}" placeholder="VD: Lấy/hạ Cát Lái + 50k..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
            </div>
            <div class="flex items-center space-x-2 pt-1">
                <input type="checkbox" id="mdf-is-active" ${d.is_active !== false ? 'checked' : ''} class="w-4 h-4 text-teal-600 rounded">
                <label for="mdf-is-active" class="text-xs font-bold text-slate-700 cursor-pointer">Đang hoạt động / áp dụng</label>
            </div>
        `;
    } else if (currentMasterDataTab === 'allowances') {
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Mã Phụ Cấp <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-code" value="${d.code || ''}" placeholder="VD: CANG_HIEP_PHUOC" class="form-input h-8.5 px-2.5 py-1 text-xs uppercase font-mono font-bold w-full" required ${d.code ? 'readonly' : ''}>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Phân Loại</label>
                    </div>
                    <select id="mdf-category" class="form-select h-8.5 px-2.5 py-1 text-xs font-bold text-slate-800 w-full">
                        <option value="PORT" ${d.category === 'PORT' ? 'selected' : ''}>Phụ Thêm Cảng Xa</option>
                        <option value="INSPECTION" ${d.category === 'INSPECTION' ? 'selected' : ''}>Phụ Thu Kiểm Hóa</option>
                        <option value="OPERATION" ${d.category === 'OPERATION' ? 'selected' : ''}>Phụ Cấp Tác Nghiệp Đặc Thù</option>
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tên Phụ Cấp / Tác Nghiệp <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-name" value="${d.name || ''}" placeholder="VD: Phụ thêm Cảng Cái Mép..." class="form-input h-8.5 px-2.5 py-1 text-xs font-semibold text-slate-800 w-full" required>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Số Tiền Phụ Cấp (VNĐ) <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" inputmode="numeric" id="mdf-amount" value="${d.amount ? formatNumberVN(d.amount) : '500.000'}" class="input-number-vn form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-teal-800 text-right w-full" required>
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Điều Kiện Áp Dụng</label>
                </div>
                <input type="text" id="mdf-notes" value="${d.notes || ''}" placeholder="VD: Lấy hoặc hạ cont tại Cảng..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
            </div>
            <div class="flex items-center space-x-2 pt-1">
                <input type="checkbox" id="mdf-is-active" ${d.is_active !== false ? 'checked' : ''} class="w-4 h-4 text-teal-600 rounded">
                <label for="mdf-is-active" class="text-xs font-bold text-slate-700 cursor-pointer">Đang hoạt động / áp dụng</label>
            </div>
        `;
    } else if (currentMasterDataTab === 'locations') {
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Mã Địa Điểm <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-code" value="${d.code || ''}" placeholder="VD: CAT_LAI, KHO_WCA..." class="form-input h-8.5 px-2.5 py-1 text-xs uppercase font-mono font-bold w-full" required ${d.code ? 'readonly' : ''}>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Phân Loại</label>
                    </div>
                    <select id="mdf-location-type" class="form-select h-8.5 px-2.5 py-1 text-xs font-bold text-slate-800 w-full">
                        <option value="PORT" ${d.location_type === 'PORT' ? 'selected' : ''}>Cảng Biển</option>
                        <option value="ICD" ${d.location_type === 'ICD' ? 'selected' : ''}>Cảng Cạn (ICD)</option>
                        <option value="DEPOT" ${d.location_type === 'DEPOT' ? 'selected' : ''}>Bãi Rỗng / Depot</option>
                        <option value="WAREHOUSE" ${d.location_type === 'WAREHOUSE' ? 'selected' : ''}>Kho Hàng / Nhà Máy</option>
                        <option value="YARD" ${d.location_type === 'YARD' ? 'selected' : ''}>Bãi Đỗ Xe Công Ty</option>
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tên Địa Điểm <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-name" value="${d.name || ''}" placeholder="VD: Cảng Cát Lái, Kho WCA Tân Vạn..." class="form-input h-8.5 px-2.5 py-1 text-xs font-semibold text-slate-800 w-full" required>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tỉnh / Thành Phố</label>
                    </div>
                    <input type="text" id="mdf-province" value="${d.province || 'TP. Hồ Chí Minh'}" class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Địa Chỉ Chi Tiết</label>
                    </div>
                    <input type="text" id="mdf-address" value="${d.address || ''}" placeholder="Số nhà, đường, phường, quận/huyện..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Số Điện Thoại Liên Hệ</label>
                    </div>
                    <input type="text" id="mdf-contact-phone" value="${d.contact_phone || ''}" placeholder="SĐT điều độ..." class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Người Phụ Trách / Đầu Mối</label>
                    </div>
                    <input type="text" id="mdf-contact-person" value="${d.contact_person || ''}" placeholder="Tên nhân sự phụ trách..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Ghi Chú Vận Hành</label>
                    </div>
                    <input type="text" id="mdf-notes" value="${d.notes || ''}" placeholder="Giờ làm việc kho, quy định vào cổng..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
            </div>
            <div class="flex items-center space-x-2 pt-1">
                <input type="checkbox" id="mdf-is-active" ${d.is_active !== false ? 'checked' : ''} class="w-4 h-4 text-teal-600 rounded">
                <label for="mdf-is-active" class="text-xs font-bold text-slate-700 cursor-pointer">Đang hoạt động</label>
            </div>
        `;
    } else if (currentMasterDataTab === 'customers') {
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Mã Khách Hàng</label>
                    </div>
                    <input type="text" id="mdf-code" value="${d.code || ''}" placeholder="Tự sinh nếu để trống" class="form-input h-8.5 px-2.5 py-1 text-xs uppercase font-mono font-bold w-full" ${d.code ? 'readonly' : ''}>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Mã Số Thuế (MST)</label>
                    </div>
                    <input type="text" id="mdf-tax-code" value="${d.tax_code || ''}" placeholder="MST doanh nghiệp..." class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-semibold text-slate-800 w-full">
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Tên Khách Hàng / Doanh Nghiệp <span class="text-rose-500">*</span></label>
                </div>
                <input type="text" id="mdf-name" value="${d.name || ''}" placeholder="Tên đầy đủ theo giấy phép ĐKKD..." class="form-input h-8.5 px-2.5 py-1 text-xs font-semibold text-slate-800 w-full" required>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Người Liên Hệ / Đầu Mối</label>
                    </div>
                    <input type="text" id="mdf-contact-person" value="${d.contact_person || ''}" placeholder="Tên nhân sự phụ trách..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Số Điện Thoại Liên Hệ</label>
                    </div>
                    <input type="text" id="mdf-phone" value="${d.phone || ''}" placeholder="SĐT liên hệ..." class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Địa Chỉ Xuất Hóa Đơn / Văn Phòng</label>
                </div>
                <input type="text" id="mdf-address" value="${d.address || ''}" placeholder="Địa chỉ đăng ký kinh doanh..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
            </div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Ghi Chú / Yêu Cầu Giao Nhận Đặc Thù</label>
                </div>
                <input type="text" id="mdf-notes" value="${d.notes || ''}" placeholder="Chính sách công nợ, quy định kiểm đếm, chứng từ..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
            </div>
        `;
    } else if (currentMasterDataTab === 'tariffs') {
        const customers = masterDataFormOptionsCache?.customers || masterDataCache['customers'] || [];
        const pickupOpts = masterDataFormOptionsCache?.locations?.pickup_options || masterDataCache['locations'] || [];
        const warehouseOpts = masterDataFormOptionsCache?.locations?.warehouse_options || masterDataCache['locations'] || [];
        const dropoffOpts = masterDataFormOptionsCache?.locations?.dropoff_options || masterDataCache['locations'] || [];
        const contSizes = ['40HC', '20DC', '45G1', '40GP', '20RF', '40RF', 'XE_TAI_10T', 'XE_TAI_2T'];
        container.innerHTML = `
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Khách Hàng Áp Dụng <span class="text-rose-500">*</span></label>
                </div>
                <select id="mdf-customer-id" class="form-select h-8.5 px-2.5 py-1 text-xs font-bold text-slate-800 w-full" required>
                    <option value="">-- Chọn Khách Hàng --</option>
                    ${customers.map(c => `<option value="${c.id}" ${d.customer_id === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
                </select>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-teal-900 text-xs truncate flex items-center gap-1">
                            <i class="ph-bold ph-map-pin text-teal-600"></i>
                            1. Khu Vực Đi / Lấy Cont
                        </label>
                    </div>
                    <input type="text" id="mdf-origin-zone" list="mdf-origin-zones-list" value="${d.origin_zone || ''}" placeholder="VD: Cát Lái, Cái Mép, Hiệp Phước..." class="form-input h-8.5 px-2.5 py-1 text-xs font-bold text-teal-900 w-full">
                    <datalist id="mdf-origin-zones-list">
                        <option value="Cát Lái (TP.HCM)">
                        <option value="Cái Mép (Vũng Tàu)">
                        <option value="Hiệp Phước (Nhà Bè)">
                        <option value="SPITC / Phú Hữu">
                        <option value="Sóng Thần / Dĩ An">
                        <option value="Bãi Triền Võ (TVL)">
                    </datalist>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-teal-900 text-xs truncate flex items-center gap-1">
                            <i class="ph-bold ph-flag-pennant text-teal-600"></i>
                            2. Khu Vực Đến / Giao Hàng
                        </label>
                    </div>
                    <input type="text" id="mdf-dest-zone" list="mdf-dest-zones-list" value="${d.destination_zone || ''}" placeholder="VD: VSIP, Bàu Bàng, Trảng Bàng, Bến Lức..." class="form-input h-8.5 px-2.5 py-1 text-xs font-bold text-teal-900 w-full">
                    <datalist id="mdf-dest-zones-list">
                        <option value="Bình Dương (VSIP/Bàu Bàng/Mỹ Phước)">
                        <option value="Đồng Nai (Biên Hòa/Nhơn Trạch/Long Thành)">
                        <option value="Tây Ninh (Trảng Bàng/Phước Đông)">
                        <option value="Long An (Bến Lức/Đức Hòa/Tân An)">
                        <option value="Củ Chi / Hóc Môn / TP.HCM">
                        <option value="Vũng Tàu / Phú Mỹ">
                    </datalist>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Nơi Lấy (Cảng / ICD) <span class="text-rose-500">*</span></label>
                    </div>
                    <select id="mdf-pickup" class="form-select h-8.5 px-2.5 py-1 text-xs uppercase font-bold text-teal-900 w-full" required>
                        <option value="">-- Chọn Nơi Lấy --</option>
                        ${pickupOpts.map(l => `<option value="${l.name}" ${d.pickup_location === l.name ? 'selected' : ''}>${l.label || l.name}</option>`).join('')}
                    </select>
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Kho Nhận (Nhà Máy / Kho) <span class="text-rose-500">*</span></label>
                    </div>
                    <select id="mdf-delivery" class="form-select h-8.5 px-2.5 py-1 text-xs uppercase font-bold text-amber-900 w-full" required>
                        <option value="">-- Chọn Kho Nhận --</option>
                        ${warehouseOpts.map(l => `<option value="${l.name}" ${d.delivery_location === l.name ? 'selected' : ''}>${l.label || l.name}</option>`).join('')}
                    </select>
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Nơi Hạ Cont (Bãi / Cảng)</label>
                    </div>
                    <select id="mdf-dropoff" class="form-select h-8.5 px-2.5 py-1 text-xs uppercase font-bold text-emerald-900 w-full">
                        <option value="">-- Chọn Nơi Hạ --</option>
                        ${dropoffOpts.map(l => `<option value="${l.name}" ${d.dropoff_location === l.name ? 'selected' : ''}>${l.label || l.name}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Quy Cách Cont / Phương Tiện</label>
                    </div>
                    <select id="mdf-container-size" class="form-select h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-slate-800 w-full">
                        ${contSizes.map(s => `<option value="${s}" ${(d.container_size || '40HC') === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Cự Ly Ước Tính (km)</label>
                        <span class="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">Bước 10km</span>
                    </div>
                    <input type="text" id="mdf-estimated-km" value="${d.estimated_km || 30}" onchange="roundEstimatedKmInput(this)" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-center input-number-vn w-full" placeholder="VD: 30">
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Đơn Giá Cước (HĐ) <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-price" value="${d.freight_price ? formatNumberVN(d.freight_price) : '4.000.000'}" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-teal-800 text-right input-number-vn w-full" placeholder="VD: 4.000.000" required>
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Lương Chuyến Tài Xế <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-pay" value="${d.driver_trip_pay ? formatNumberVN(d.driver_trip_pay) : '600.000'}" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-emerald-700 text-right input-number-vn w-full" placeholder="VD: 600.000" required>
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Vé BOT / Cầu Đường Chuẩn</label>
                    </div>
                    <input type="text" id="mdf-toll" value="${d.toll_standard_fee ? formatNumberVN(d.toll_standard_fee) : '0'}" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-amber-700 text-right input-number-vn w-full" placeholder="VD: 150.000">
                </div>
            </div>
        `;
        if (d.pickup_location) setSelectValueCaseInsensitive(document.getElementById('mdf-pickup'), d.pickup_location);
        if (d.delivery_location) setSelectValueCaseInsensitive(document.getElementById('mdf-delivery'), d.delivery_location);
        if (d.dropoff_location) setSelectValueCaseInsensitive(document.getElementById('mdf-dropoff'), d.dropoff_location);
    } else if (currentMasterDataTab === 'expenses') {
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Mã Khoản Chi <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-code" value="${d.code || ''}" placeholder="VD: LIFT_ON, TOLL_FEE..." class="form-input h-8.5 px-2.5 py-1 text-xs uppercase font-mono font-bold w-full" required ${d.code ? 'readonly' : ''}>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Nhóm Chi Phí</label>
                    </div>
                    <select id="mdf-group-type" class="form-select h-8.5 px-2.5 py-1 text-xs font-bold text-slate-800 w-full">
                        <option value="TOLL" ${d.group_type === 'TOLL' ? 'selected' : ''}>Vé Cầu Đường / BOT</option>
                        <option value="LIFT_ON" ${d.group_type === 'LIFT_ON' ? 'selected' : ''}>Nâng Cont</option>
                        <option value="LIFT_OFF" ${d.group_type === 'LIFT_OFF' ? 'selected' : ''}>Hạ Cont</option>
                        <option value="DEPOSIT" ${d.group_type === 'DEPOSIT' ? 'selected' : ''}>Cược Container</option>
                        <option value="WEIGHING" ${d.group_type === 'WEIGHING' ? 'selected' : ''}>Cân Xe</option>
                        <option value="LABOR" ${d.group_type === 'LABOR' ? 'selected' : ''}>Bốc Xếp / Bồi Dưỡng</option>
                        <option value="EINVOICE" ${d.group_type === 'EINVOICE' ? 'selected' : ''}>Hóa Đơn Điện Tử Cảng</option>
                        <option value="OTHER" ${d.group_type === 'OTHER' ? 'selected' : ''}>Chi Phí Khác</option>
                    </select>
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Tên Khoản Mục Chi Phí <span class="text-rose-500">*</span></label>
                </div>
                <input type="text" id="mdf-name" value="${d.name || ''}" placeholder="VD: Phí nâng cont, Vé BOT..." class="form-input h-8.5 px-2.5 py-1 text-xs font-semibold text-slate-800 w-full" required>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Định Mức Tiền Ngầm Định (VNĐ)</label>
                    </div>
                    <input type="text" id="mdf-default-amount" value="${d.default_amount ? formatNumberVN(d.default_amount) : '0'}" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-teal-800 text-right input-number-vn w-full" placeholder="VD: 100.000">
                </div>
                <div class="md:col-span-6 flex items-center pt-6 space-x-2">
                    <input type="checkbox" id="mdf-requires-invoice" ${d.requires_invoice ? 'checked' : ''} class="w-4 h-4 text-teal-600 rounded cursor-pointer">
                    <label for="mdf-requires-invoice" class="text-xs font-bold text-slate-700 cursor-pointer">Bắt buộc có HĐĐT / Mã tra cứu</label>
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Ghi Chú & Điều Kiện Áp Dụng</label>
                </div>
                <input type="text" id="mdf-notes" value="${d.notes || ''}" placeholder="Quy định thanh toán, chứng từ thanh toán..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
            </div>
            <div class="flex items-center space-x-2 pt-1">
                <input type="checkbox" id="mdf-is-active" ${d.is_active !== false ? 'checked' : ''} class="w-4 h-4 text-teal-600 rounded cursor-pointer">
                <label for="mdf-is-active" class="text-xs font-bold text-slate-700 cursor-pointer">Đang sử dụng</label>
            </div>
        `;
    } else if (currentMasterDataTab === 'containers') {
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Mã Quy Cách <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-code" value="${d.code || ''}" placeholder="VD: 40HC, 20DC, TAI_10T..." class="form-input h-8.5 px-2.5 py-1 text-xs uppercase font-mono font-bold w-full" required ${d.code ? 'readonly' : ''}>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Phân Loại Phương Tiện / Thùng</label>
                    </div>
                    <select id="mdf-category" class="form-select h-8.5 px-2.5 py-1 text-xs font-bold text-slate-800 w-full">
                        <option value="CONTAINER" ${d.category === 'CONTAINER' ? 'selected' : ''}>Container Đường Biển</option>
                        <option value="TRUCK" ${d.category === 'TRUCK' ? 'selected' : ''}>Xe Tải Thùng / Đường Bộ</option>
                    </select>
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Tên Quy Cách / Tên Loại Thùng <span class="text-rose-500">*</span></label>
                </div>
                <input type="text" id="mdf-name" value="${d.name || ''}" placeholder="VD: Container 40ft Cao (40HC)..." class="form-input h-8.5 px-2.5 py-1 text-xs font-semibold text-slate-800 w-full" required>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Hệ Số TEU</label>
                    </div>
                    <input type="number" id="mdf-teu" value="${d.teu_factor !== undefined ? d.teu_factor : 2.0}" step="0.25" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-center w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tải Trọng Cho Phép (kg)</label>
                    </div>
                    <input type="text" id="mdf-payload" value="${d.max_payload_kg ? formatNumberVN(d.max_payload_kg) : '30.000'}" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-right input-number-vn w-full" placeholder="VD: 30.000">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Thể Tích Chứa (CBM)</label>
                    </div>
                    <input type="number" id="mdf-cbm" value="${d.cbm_capacity || 67}" step="0.5" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-center w-full">
                </div>
            </div>
            <div class="flex items-center space-x-2 pt-1">
                <input type="checkbox" id="mdf-is-active" ${d.is_active !== false ? 'checked' : ''} class="w-4 h-4 text-teal-600 rounded cursor-pointer">
                <label for="mdf-is-active" class="text-xs font-bold text-slate-700 cursor-pointer">Đang hoạt động</label>
            </div>
        `;
    } else if (currentMasterDataTab === 'vehicles') {
        const drivers = masterDataFormOptionsCache?.drivers || [];
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Biển Số Xe <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-license-plate" value="${d.license_plate || ''}" placeholder="VD: 51H-123.45..." class="form-input h-8.5 px-2.5 py-1 text-xs uppercase font-mono font-black w-full" required ${d.license_plate ? 'readonly' : ''}>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Nguồn Sở Hữu</label>
                    </div>
                    <select id="mdf-ownership" class="form-select h-8.5 px-2.5 py-1 text-xs font-bold text-slate-800 w-full">
                        <option value="OWNED" ${d.ownership_type === 'OWNED' ? 'selected' : ''}>Xe Nhà (Đội Xe Công Ty)</option>
                        <option value="SUBCONTRACTOR" ${d.ownership_type === 'SUBCONTRACTOR' ? 'selected' : ''}>Xe Bạn (Thuê Ngoài / 3PL)</option>
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Loại Phương Tiện</label>
                    </div>
                    <select id="mdf-vehicle-type" class="form-select h-8.5 px-2.5 py-1 text-xs font-bold text-slate-800 w-full">
                        <option value="TRACTOR" ${d.vehicle_type === 'TRACTOR' ? 'selected' : ''}>Đầu kéo Container</option>
                        <option value="TRUCK_10T" ${d.vehicle_type === 'TRUCK_10T' ? 'selected' : ''}>Xe tải 10 Tấn</option>
                        <option value="TRUCK_2T" ${d.vehicle_type === 'TRUCK_2T' ? 'selected' : ''}>Xe tải 2 Tấn</option>
                        <option value="VAN" ${d.vehicle_type === 'VAN' ? 'selected' : ''}>Xe tải nhỏ / Van</option>
                    </select>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Hãng Sản Xuất / Dòng Xe</label>
                    </div>
                    <input type="text" id="mdf-brand" value="${d.brand || 'Freightliner'}" placeholder="VD: Freightliner, Hino, Isuzu..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tài Xế Mặc Định Gắn Xe</label>
                    </div>
                    <select id="mdf-driver-id" class="form-select h-8.5 px-2.5 py-1 text-xs font-semibold text-slate-800 w-full">
                        <option value="">-- Chưa gán tài xế --</option>
                        ${drivers.map(dr => `<option value="${dr.id}" ${d.current_driver_id === dr.id ? 'selected' : ''}>${dr.label || dr.nickname || dr.full_name}</option>`).join('')}
                    </select>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tải Trọng Cho Phép (kg)</label>
                    </div>
                    <input type="text" id="mdf-payload" value="${d.payload_capacity_kg ? formatNumberVN(d.payload_capacity_kg) : '30.000'}" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-right input-number-vn w-full" placeholder="VD: 30.000">
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Hạn Đăng Kiểm</label>
                    </div>
                    <input type="date" id="mdf-reg-expiry" value="${d.registration_expiry ? (d.registration_expiry.includes('/') ? d.registration_expiry.split('/').reverse().join('-') : d.registration_expiry) : ''}" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Hạn Bảo Hiểm</label>
                    </div>
                    <input type="date" id="mdf-ins-expiry" value="${d.insurance_expiry ? (d.insurance_expiry.includes('/') ? d.insurance_expiry.split('/').reverse().join('-') : d.insurance_expiry) : ''}" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Bảo Trì Kế Tiếp</label>
                    </div>
                    <input type="date" id="mdf-maint-date" value="${d.next_maintenance_date ? (d.next_maintenance_date.includes('/') ? d.next_maintenance_date.split('/').reverse().join('-') : d.next_maintenance_date) : ''}" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Trạng Thái Phương Tiện</label>
                </div>
                <select id="mdf-vehicle-status" class="form-select h-8.5 px-2.5 py-1 text-xs font-bold text-slate-800 w-full">
                    <option value="IDLE" ${d.status === 'IDLE' ? 'selected' : ''}>Nằm bãi (Chờ việc)</option>
                    <option value="ACTIVE" ${d.status === 'ACTIVE' ? 'selected' : ''}>Đang chạy (Có hàng)</option>
                    <option value="MAINTENANCE" ${d.status === 'MAINTENANCE' ? 'selected' : ''}>Hư hỏng / Bảo trì</option>
                    <option value="DECOMMISSIONED" ${d.status === 'DECOMMISSIONED' ? 'selected' : ''}>Ngừng sử dụng</option>
                </select>
            </div>
        `;
    } else if (currentMasterDataTab === 'trailers') {
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Biển Số Rơ-Moóc <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-trailer-plate" value="${d.license_plate || ''}" placeholder="VD: 51R-123.45" class="form-input h-8.5 px-2.5 py-1 text-xs uppercase font-mono font-black w-full" required ${d.license_plate ? 'readonly' : ''}>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Loại Rơ-Moóc <span class="text-rose-500">*</span></label>
                    </div>
                    <select id="mdf-trailer-type" class="form-select h-8.5 px-2.5 py-1 text-xs font-bold text-slate-800 w-full">
                        <option value="MOOC_XUONG_40" ${d.trailer_type === 'MOOC_XUONG_40' ? 'selected' : ''}>Moóc Xương 40ft (3 Trục)</option>
                        <option value="MOOC_CO_CO_40" ${d.trailer_type === 'MOOC_CO_CO_40' ? 'selected' : ''}>Moóc Cổ Cò 40ft (Chở Cont Lạnh/HC)</option>
                        <option value="MOOC_XUONG_20" ${d.trailer_type === 'MOOC_XUONG_20' ? 'selected' : ''}>Moóc Xương 20ft (3 Trục)</option>
                        <option value="MOOC_SAN_45" ${d.trailer_type === 'MOOC_SAN_45' ? 'selected' : ''}>Moóc Sàn 45ft</option>
                        <option value="MOOC_LUN" ${d.trailer_type === 'MOOC_LUN' ? 'selected' : ''}>Moóc Lùn / Chuyên Dụng</option>
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Hãng Sản Xuất</label>
                    </div>
                    <input type="text" id="mdf-trailer-brand" value="${d.brand || 'Tân Thanh'}" placeholder="VD: Tân Thanh, CIMC, Doosung..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tải Trọng Thiết Kế (kg)</label>
                    </div>
                    <input type="text" id="mdf-trailer-payload" value="${d.payload_capacity_kg ? formatNumberVN(d.payload_capacity_kg) : '32.000'}" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-right input-number-vn w-full" placeholder="VD: 32.000">
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Hạn Đăng Kiểm Định Kỳ</label>
                    </div>
                    <input type="date" id="mdf-trailer-expiry" value="${d.registration_expiry ? (d.registration_expiry.includes('/') ? d.registration_expiry.split('/').reverse().join('-') : d.registration_expiry) : ''}" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Trạng Thái Hoạt Động</label>
                    </div>
                    <select id="mdf-trailer-status" class="form-select h-8.5 px-2.5 py-1 text-xs font-bold text-slate-800 w-full">
                        <option value="IDLE" ${d.status === 'IDLE' ? 'selected' : ''}>Nằm bãi (Chờ kéo)</option>
                        <option value="ACTIVE" ${d.status === 'ACTIVE' ? 'selected' : ''}>Đang gắn xe kéo</option>
                        <option value="MAINTENANCE" ${d.status === 'MAINTENANCE' ? 'selected' : ''}>Bảo trì / Sửa chữa</option>
                    </select>
                </div>
            </div>
        `;
    } else if (currentMasterDataTab === 'shipping_lines') {
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Mã Hãng Tàu <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-sl-code" value="${d.code || ''}" placeholder="VD: MAEU, ONE, COSCO..." class="form-input h-8.5 px-2.5 py-1 text-xs uppercase font-mono font-black w-full" required ${d.code ? 'readonly' : ''}>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tên Hãng Tàu / Đơn Vị Vận Chuyển <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-sl-name" value="${d.name || ''}" placeholder="VD: Ocean Network Express..." class="form-input h-8.5 px-2.5 py-1 text-xs font-semibold text-slate-800 w-full" required>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Hotline CSKH / Cấp Vỏ</label>
                    </div>
                    <input type="text" id="mdf-sl-phone" value="${d.contact_phone || ''}" placeholder="VD: 028-3827-0100" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Email Tiếp Nhận e-DO</label>
                    </div>
                    <input type="email" id="mdf-sl-email" value="${d.contact_email || ''}" placeholder="cs@shipping.com" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Website Lấy e-DO / Tra Cứu Container</label>
                </div>
                <input type="url" id="mdf-sl-web" value="${d.website || ''}" placeholder="https://..." class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Free DEM Chuẩn (Ngày)</label>
                    </div>
                    <input type="number" id="mdf-sl-dem" value="${d.free_dem_days || 7}" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-center text-teal-800 w-full">
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Free DET Chuẩn (Ngày)</label>
                    </div>
                    <input type="number" id="mdf-sl-det" value="${d.free_det_days || 5}" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-center text-amber-800 w-full">
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Ghi Chú Quy Định Cấp Vỏ / Hạ Rỗng</label>
                </div>
                <input type="text" id="mdf-sl-notes" value="${d.notes || ''}" placeholder="Depot chỉ định hạ rỗng, lưu ý hãng..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
            </div>
            <div class="flex items-center space-x-2 pt-1">
                <input type="checkbox" id="mdf-is-active" ${d.is_active !== false ? 'checked' : ''} class="w-4 h-4 text-teal-600 rounded cursor-pointer">
                <label for="mdf-is-active" class="text-xs font-bold text-slate-700 cursor-pointer">Đang hoạt động</label>
            </div>
        `;
    } else if (currentMasterDataTab === 'subcontractors') {
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Mã Đối Tác / Nhà Xe</label>
                    </div>
                    <input type="text" id="mdf-sc-code" value="${d.code || ''}" placeholder="Tự sinh nếu để trống (NX_...)" class="form-input h-8.5 px-2.5 py-1 text-xs uppercase font-mono font-bold w-full" ${d.code ? 'readonly' : ''}>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Mã Số Thuế (MST)</label>
                    </div>
                    <input type="text" id="mdf-sc-tax" value="${d.tax_code || ''}" placeholder="MST doanh nghiệp..." class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-semibold text-slate-800 w-full">
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Tên Nhà Xe / Đơn Vị Vận Tải 3PL <span class="text-rose-500">*</span></label>
                </div>
                <input type="text" id="mdf-sc-name" value="${d.name || ''}" placeholder="VD: Công ty TNHH Vận tải Hoàng Nam..." class="form-input h-8.5 px-2.5 py-1 text-xs font-semibold text-slate-800 w-full" required>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Người Điều Hành Xe</label>
                    </div>
                    <input type="text" id="mdf-sc-person" value="${d.contact_person || ''}" placeholder="Tên điều độ / chủ xe..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Số Điện Thoại Điều Xe <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-sc-phone" value="${d.phone || ''}" placeholder="SĐT liên hệ gấp..." class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-teal-800 w-full" required>
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Địa Chỉ Bãi Xe / Văn Phòng</label>
                </div>
                <input type="text" id="mdf-sc-address" value="${d.address || ''}" placeholder="Địa chỉ..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Số Tài Khoản</label>
                    </div>
                    <input type="text" id="mdf-sc-acc" value="${d.bank_account_number || ''}" placeholder="Số TK..." class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tên Ngân Hàng</label>
                    </div>
                    <input type="text" id="mdf-sc-bank" value="${d.bank_name || ''}" placeholder="VD: VCB, MB..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Chủ Tài Khoản</label>
                    </div>
                    <input type="text" id="mdf-sc-holder" value="${d.bank_account_holder || ''}" placeholder="Tên in hoa..." class="form-input h-8.5 px-2.5 py-1 text-xs uppercase text-slate-800 w-full">
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Tuyến Thế Mạnh & Ghi Chú Đơn Giá</label>
                </div>
                <input type="text" id="mdf-sc-notes" value="${d.notes || ''}" placeholder="VD: Chuyên tuyến Long An, 10 xe đầu kéo..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
            </div>
            <div class="flex items-center space-x-2 pt-1">
                <input type="checkbox" id="mdf-is-active" ${d.is_active !== false ? 'checked' : ''} class="w-4 h-4 text-teal-600 rounded cursor-pointer">
                <label for="mdf-is-active" class="text-xs font-bold text-slate-700 cursor-pointer">Đang hợp tác</label>
            </div>
        `;
    }

    // Tự động khởi tạo format hàng ngàn cho tất cả input tiền tệ / số trong modal
    if (typeof initAllNumberInputs === 'function') {
        initAllNumberInputs();
    }
}

// Submit Create or Edit Form
async function submitMasterDataForm(e) {
    e.preventDefault();
    const editId = document.getElementById('md-edit-id').value;
    const tabKey = document.getElementById('md-catalog-key').value;
    const isEdit = tabKey === 'company' ? true : !!editId;

    const endpoints = {
        'company': '/api/master-data/company/',
        'driver_tariffs': isEdit ? `/api/master-data/driver-tariffs/${editId}/` : '/api/master-data/driver-tariffs/',
        'allowances': isEdit ? `/api/master-data/allowances/${editId}/` : '/api/master-data/allowances/',
        'locations': isEdit ? `/api/master-data/locations/${editId}/` : '/api/master-data/locations/',
        'tariffs': isEdit ? `/api/master-data/tariffs/${editId}/` : '/api/master-data/tariffs/',
        'customers': isEdit ? `/api/master-data/customers/${editId}/` : '/api/master-data/customers/',
        'expenses': isEdit ? `/api/master-data/expense-items/${editId}/` : '/api/master-data/expense-items/',
        'containers': isEdit ? `/api/master-data/container-types/${editId}/` : '/api/master-data/container-types/',
        'vehicles': isEdit ? `/api/master-data/vehicles/${editId}/` : '/api/master-data/vehicles/',
        'trailers': isEdit ? `/api/master-data/trailers/${editId}/` : '/api/master-data/trailers/',
        'shipping_lines': isEdit ? `/api/master-data/shipping-lines/${editId}/` : '/api/master-data/shipping-lines/',
        'subcontractors': isEdit ? `/api/master-data/subcontractors/${editId}/` : '/api/master-data/subcontractors/'
    };

    let payload = {};
    if (tabKey === 'company') {
        payload = {
            company_name: document.getElementById('mdf-cp-name')?.value || '',
            short_name: document.getElementById('mdf-cp-short-name')?.value || '',
            tax_code: document.getElementById('mdf-cp-tax-code')?.value || '',
            operating_license: document.getElementById('mdf-cp-license')?.value || '',
            representative_name: document.getElementById('mdf-cp-rep-name')?.value || '',
            representative_role: document.getElementById('mdf-cp-rep-role')?.value || '',
            address: document.getElementById('mdf-cp-address')?.value || '',
            phone: document.getElementById('mdf-cp-phone')?.value || '',
            email: document.getElementById('mdf-cp-email')?.value || '',
            website: document.getElementById('mdf-cp-website')?.value || '',
            branch_name: document.getElementById('mdf-cp-branch-name')?.value || '',
            branch_address: document.getElementById('mdf-cp-branch-address')?.value || '',
            branch_phone: document.getElementById('mdf-cp-branch-phone')?.value || '',
            fleet_yard_name: document.getElementById('mdf-cp-yard-name')?.value || '',
            fleet_yard_address: document.getElementById('mdf-cp-yard-address')?.value || '',
            fleet_yard_hotline: document.getElementById('mdf-cp-yard-hotline')?.value || '',
            bank_account_number: document.getElementById('mdf-cp-bank-acc')?.value || '',
            bank_name: document.getElementById('mdf-cp-bank-name')?.value || '',
            bank_branch: document.getElementById('mdf-cp-bank-branch')?.value || '',
            default_vat_rate: parseFloat(document.getElementById('mdf-cp-vat')?.value) || 8.0,
            fuel_reference_price: parseNumberVN(document.getElementById('mdf-cp-fuel-price')?.value) || 21000,
            cbm_formula_divisor: parseInt(document.getElementById('mdf-cp-cbm-divisor')?.value) || 5000,
            notes: document.getElementById('mdf-cp-notes')?.value || '',
        };
    } else if (tabKey === 'driver_tariffs') {
        payload = {
            area_group: document.getElementById('mdf-area-group').value,
            route_name: document.getElementById('mdf-route-name').value,
            pickup_drop_area: document.getElementById('mdf-pickup-drop')?.value || '',
            estimated_km: parseNumberVN(document.getElementById('mdf-estimated-km')?.value) || 0,
            salary_rate: parseNumberVN(document.getElementById('mdf-salary-rate').value) || 0,
            notes: document.getElementById('mdf-notes').value,
            is_active: document.getElementById('mdf-is-active')?.checked ?? true
        };
    } else if (tabKey === 'allowances') {
        payload = {
            code: document.getElementById('mdf-code').value,
            category: document.getElementById('mdf-category').value,
            name: document.getElementById('mdf-name').value,
            amount: parseNumberVN(document.getElementById('mdf-amount').value) || 0,
            notes: document.getElementById('mdf-notes').value,
            is_active: document.getElementById('mdf-is-active')?.checked ?? true
        };
    } else if (tabKey === 'locations') {
        payload = {
            code: document.getElementById('mdf-code').value,
            location_type: document.getElementById('mdf-location-type').value,
            name: document.getElementById('mdf-name').value,
            province: document.getElementById('mdf-province').value,
            address: document.getElementById('mdf-address').value,
            contact_person: document.getElementById('mdf-contact-person')?.value || '',
            contact_phone: document.getElementById('mdf-contact-phone').value,
            notes: document.getElementById('mdf-notes')?.value || '',
            is_active: document.getElementById('mdf-is-active')?.checked ?? true
        };
    } else if (tabKey === 'customers') {
        payload = {
            code: document.getElementById('mdf-code').value,
            tax_code: document.getElementById('mdf-tax-code').value,
            name: document.getElementById('mdf-name').value,
            address: document.getElementById('mdf-address').value,
            contact_person: document.getElementById('mdf-contact-person').value,
            phone: document.getElementById('mdf-phone').value,
            notes: document.getElementById('mdf-notes')?.value || ''
        };
    } else if (tabKey === 'tariffs') {
        payload = {
            customer_id: document.getElementById('mdf-customer-id').value,
            origin_zone: document.getElementById('mdf-origin-zone')?.value || '',
            destination_zone: document.getElementById('mdf-dest-zone')?.value || '',
            estimated_km: parseNumberVN(document.getElementById('mdf-estimated-km')?.value) || 0,
            pickup_location: document.getElementById('mdf-pickup').value,
            delivery_location: document.getElementById('mdf-delivery').value,
            dropoff_location: document.getElementById('mdf-dropoff').value,
            container_size: document.getElementById('mdf-container-size')?.value || '40HC',
            freight_price: parseNumberVN(document.getElementById('mdf-price').value) || 0,
            driver_trip_pay: parseNumberVN(document.getElementById('mdf-pay').value) || 0,
            toll_standard_fee: parseNumberVN(document.getElementById('mdf-toll')?.value || 0) || 0
        };
    } else if (tabKey === 'expenses') {
        payload = {
            code: document.getElementById('mdf-code').value,
            group_type: document.getElementById('mdf-group-type').value,
            name: document.getElementById('mdf-name').value,
            default_amount: parseNumberVN(document.getElementById('mdf-default-amount').value) || 0,
            requires_invoice: document.getElementById('mdf-requires-invoice').checked,
            notes: document.getElementById('mdf-notes')?.value || '',
            is_active: document.getElementById('mdf-is-active')?.checked ?? true
        };
    } else if (tabKey === 'containers') {
        payload = {
            code: document.getElementById('mdf-code').value,
            category: document.getElementById('mdf-category').value,
            name: document.getElementById('mdf-name').value,
            teu_factor: parseFloat(document.getElementById('mdf-teu').value) || 2.0,
            max_payload_kg: parseNumberVN(document.getElementById('mdf-payload').value) || 0,
            cbm_capacity: parseFloat(document.getElementById('mdf-cbm').value) || 0,
            is_active: document.getElementById('mdf-is-active')?.checked ?? true
        };
    } else if (tabKey === 'vehicles') {
        payload = {
            license_plate: document.getElementById('mdf-license-plate').value,
            ownership_type: document.getElementById('mdf-ownership').value,
            vehicle_type: document.getElementById('mdf-vehicle-type').value,
            brand: document.getElementById('mdf-brand').value,
            payload_capacity_kg: parseNumberVN(document.getElementById('mdf-payload').value) || 0,
            current_driver_id: document.getElementById('mdf-driver-id')?.value ? parseInt(document.getElementById('mdf-driver-id').value) : null,
            registration_expiry: document.getElementById('mdf-reg-expiry')?.value || null,
            insurance_expiry: document.getElementById('mdf-ins-expiry')?.value || null,
            next_maintenance_date: document.getElementById('mdf-maint-date')?.value || null,
            status: document.getElementById('mdf-vehicle-status')?.value || 'IDLE'
        };
    } else if (tabKey === 'trailers') {
        payload = {
            license_plate: document.getElementById('mdf-trailer-plate').value,
            trailer_type: document.getElementById('mdf-trailer-type').value,
            brand: document.getElementById('mdf-trailer-brand').value,
            payload_capacity_kg: parseNumberVN(document.getElementById('mdf-trailer-payload').value) || 0,
            registration_expiry: document.getElementById('mdf-trailer-expiry').value || null,
            status: document.getElementById('mdf-trailer-status').value
        };
    } else if (tabKey === 'shipping_lines') {
        payload = {
            code: document.getElementById('mdf-sl-code').value,
            name: document.getElementById('mdf-sl-name').value,
            contact_phone: document.getElementById('mdf-sl-phone').value,
            contact_email: document.getElementById('mdf-sl-email').value,
            website: document.getElementById('mdf-sl-web').value,
            free_dem_days: parseInt(document.getElementById('mdf-sl-dem').value || 7),
            free_det_days: parseInt(document.getElementById('mdf-sl-det').value || 5),
            notes: document.getElementById('mdf-sl-notes').value,
            is_active: document.getElementById('mdf-is-active')?.checked ?? true
        };
    } else if (tabKey === 'subcontractors') {
        payload = {
            code: document.getElementById('mdf-sc-code').value,
            tax_code: document.getElementById('mdf-sc-tax').value,
            name: document.getElementById('mdf-sc-name').value,
            contact_person: document.getElementById('mdf-sc-person').value,
            phone: document.getElementById('mdf-sc-phone').value,
            address: document.getElementById('mdf-sc-address').value,
            bank_account_number: document.getElementById('mdf-sc-acc').value,
            bank_name: document.getElementById('mdf-sc-bank').value,
            bank_account_holder: document.getElementById('mdf-sc-holder').value,
            notes: document.getElementById('mdf-sc-notes').value,
            is_active: document.getElementById('mdf-is-active')?.checked ?? true
        };
    }

    try {
        const res = await fetchWithAuth(endpoints[tabKey], {
            method: isEdit ? 'PUT' : 'POST',
            body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && (data.success || data.id)) {
            showToast('success', data.message || 'Lưu bản ghi thành công!');
            closeMasterDataModal();
            loadMasterData();

            // Tự động tải lại danh mục cho các Modal đang mở và chọn ngay bản ghi vừa tạo
            await loadMasterDataFormOptions(true);
            populateMasterDataDropdowns();

            if (quickMasterDataTargetSelectId) {
                const targetEl = document.getElementById(quickMasterDataTargetSelectId);
                const createdName = payload.name || payload.code || payload.license_plate || payload.route_name || '';
                if (targetEl && createdName) {
                    if (targetEl.tagName === 'SELECT') {
                        setSelectValueCaseInsensitive(targetEl, createdName);
                    } else {
                        targetEl.value = createdName;
                    }
                    if (typeof targetEl.onchange === 'function') {
                        targetEl.onchange();
                    }
                }
                quickMasterDataTargetSelectId = null;
            }
        } else {
            showToast('danger', data.message || data.error || data.detail || 'Có lỗi xảy ra khi lưu dữ liệu!');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ!');
    }
}

// Delete Item (Soft-delete)
async function deleteMasterDataItem(id) {
    const confirmed = await showConfirmModal({
        title: 'Xóa Danh Mục',
        message: 'Bạn có chắc chắn muốn xóa bản ghi này khỏi danh mục không?\n\nDữ liệu lịch sử sẽ được bảo lưu an toàn (Soft-Delete).',
        confirmText: 'Xóa Bản Ghi',
        cancelText: 'Huỷ bỏ',
        type: 'danger',
        icon: 'ph-bold ph-trash text-2xl'
    });
    if (!confirmed) return;

    const endpoints = {
        'driver_tariffs': `/api/master-data/driver-tariffs/${id}/`,
        'allowances': `/api/master-data/allowances/${id}/`,
        'locations': `/api/master-data/locations/${id}/`,
        'tariffs': `/api/master-data/tariffs/${id}/`,
        'customers': `/api/master-data/customers/${id}/`,
        'expenses': `/api/master-data/expense-items/${id}/`,
        'containers': `/api/master-data/container-types/${id}/`,
        'vehicles': `/api/master-data/vehicles/${id}/`,
        'trailers': `/api/master-data/trailers/${id}/`,
        'shipping_lines': `/api/master-data/shipping-lines/${id}/`,
        'subcontractors': `/api/master-data/subcontractors/${id}/`
    };

    try {
        const res = await fetchWithAuth(endpoints[currentMasterDataTab], {
            method: 'DELETE'
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
            showToast('success', data.message || 'Đã xóa bản ghi thành công!');
            loadMasterData();
        } else {
            showToast('danger', data.message || data.error || data.detail || 'Không thể xóa bản ghi!');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ!');
    }
}

// =========================================================================
// TIỆN ÍCH GIAO DIỆN: ẨN / HIỆN SIDEBAR & BIỂU ĐỒ DASHBOARD
// =========================================================================

function toggleSidebar() {
    const sidebar = document.querySelector('.app-sidebar');
    const arrowIn = document.getElementById('icon-sidebar-arrow-in');
    const arrowOut = document.getElementById('icon-sidebar-arrow-out');
    if (!sidebar) return;
    sidebar.classList.toggle('collapsed');
    const isCollapsed = sidebar.classList.contains('collapsed');
    if (arrowIn && arrowOut) {
        if (isCollapsed) {
            arrowIn.classList.add('hidden');
            arrowOut.classList.remove('hidden');
        } else {
            arrowIn.classList.remove('hidden');
            arrowOut.classList.add('hidden');
        }
    }
    try {
        localStorage.setItem('bim_sidebar_collapsed', isCollapsed ? 'true' : 'false');
    } catch (e) {}
}

function toggleDashboardCharts() {
    const rowPillars = document.getElementById('dashboard-row-pillars');
    const rowCharts = document.getElementById('dashboard-row-charts');
    const iconToggle = document.getElementById('icon-toggle-charts');
    const textToggle = document.getElementById('text-toggle-charts');
    const iconTableExpand = document.getElementById('icon-table-expand');
    const textTableExpand = document.getElementById('text-table-expand');

    if (!rowPillars || !rowCharts) return;

    const isHidden = rowPillars.classList.contains('hidden');

    if (isHidden) {
        // Hiện lại 2 hàng biểu đồ & trụ cột
        rowPillars.classList.remove('hidden');
        rowCharts.classList.remove('hidden');
        if (iconToggle) iconToggle.className = 'ph ph-eye-slash text-base text-teal-700';
        if (textToggle) textToggle.innerText = 'Ẩn Biểu Đồ';
        if (iconTableExpand) iconTableExpand.className = 'ph ph-arrows-out-simple text-teal-700';
        if (textTableExpand) textTableExpand.innerText = 'Toàn Màn Hình';
        try {
            localStorage.setItem('bim_dashboard_charts_collapsed', 'false');
        } catch (e) {}
    } else {
        // Ẩn 2 hàng biểu đồ để bung toàn màn hình Bảng Kê Hiệu Suất P&L
        rowPillars.classList.add('hidden');
        rowCharts.classList.add('hidden');
        if (iconToggle) iconToggle.className = 'ph ph-eye text-base text-teal-700';
        if (textToggle) textToggle.innerText = 'Hiện Biểu Đồ';
        if (iconTableExpand) iconTableExpand.className = 'ph ph-arrows-in-simple text-teal-700';
        if (textTableExpand) textTableExpand.innerText = 'Thu Gọn Bảng';
        try {
            localStorage.setItem('bim_dashboard_charts_collapsed', 'true');
        } catch (e) {}
    }
}

// Khởi chạy khi DOM sẵn sàng

document.addEventListener('DOMContentLoaded', () => {
    initAllNumberInputs();
    const dateEl = document.getElementById('current-date');
    if (dateEl) {
        const now = new Date();
        const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
        const dayName = days[now.getDay()];
        const d = String(now.getDate()).padStart(2, '0');
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const y = now.getFullYear();
        dateEl.innerText = `${dayName}, ${d}/${m}/${y}`;
    }

    // Khôi phục trạng thái thu gọn Sidebar từ localStorage
    try {
        if (localStorage.getItem('bim_sidebar_collapsed') === 'true') {
            const sidebar = document.querySelector('.app-sidebar');
            const arrowIn = document.getElementById('icon-sidebar-arrow-in');
            const arrowOut = document.getElementById('icon-sidebar-arrow-out');
            if (sidebar) sidebar.classList.add('collapsed');
            if (arrowIn) arrowIn.classList.add('hidden');
            if (arrowOut) arrowOut.classList.remove('hidden');
        }
    } catch (e) {}

    // Khôi phục trạng thái ẩn biểu đồ từ localStorage
    try {
        if (localStorage.getItem('bim_dashboard_charts_collapsed') === 'true') {
            const rowPillars = document.getElementById('dashboard-row-pillars');
            const rowCharts = document.getElementById('dashboard-row-charts');
            const iconToggle = document.getElementById('icon-toggle-charts');
            const textToggle = document.getElementById('text-toggle-charts');
            const iconTableExpand = document.getElementById('icon-table-expand');
            const textTableExpand = document.getElementById('text-table-expand');
            if (rowPillars) rowPillars.classList.add('hidden');
            if (rowCharts) rowCharts.classList.add('hidden');
            if (iconToggle) iconToggle.className = 'ph ph-eye text-base text-teal-700';
            if (textToggle) textToggle.innerText = 'Hiện Biểu Đồ';
            if (iconTableExpand) iconTableExpand.className = 'ph ph-arrows-in-simple text-teal-700';
            if (textTableExpand) textTableExpand.innerText = 'Thu Gọn Bảng';
        }
    } catch (e) {}
    
    // Tải danh mục Master Data chuẩn bị sẵn cho tất cả modal form
    loadMasterDataFormOptions().then(() => populateMasterDataDropdowns());

    // Nạp thông tin công ty hệ thống để đồng bộ lên các biểu mẫu in
    loadCompanyProfile();

    // Khởi tạo điều hướng Clean Semantic URL & Deep-link HashID (Chuẩn Quốc Tế SaaS)
    resolveInitialRoute();
});

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
    'group-1': ['report-1', 'report-7', 'report-4'],
    'group-2': ['report-2', 'report-3', 'report-5', 'report-6'],
    'group-3': ['report-10', 'report-11', 'report-9', 'report-8'],
    'group-4': ['report-13', 'report-12', 'report-14']
};

function switchReportGroup(groupId, autoSwitchFirstChild = true) {
    currentActiveReportGroup = groupId;

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

    // Lọc hiển thị các nút subtab con nếu ở chế độ 'group'
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
    currentReportViewMode = mode;
    const btnGroup = document.getElementById('btn-report-view-group');
    const btnAll = document.getElementById('btn-report-view-all');

    if (mode === 'all') {
        if (btnAll) {
            btnAll.className = 'px-2.5 py-1.5 rounded-lg text-[11px] font-bold font-heading bg-teal-700 text-white shadow-2xs transition-colors';
        }
        if (btnGroup) {
            btnGroup.className = 'px-2.5 py-1.5 rounded-lg text-[11px] font-bold font-heading text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors';
        }
    } else {
        if (btnGroup) {
            btnGroup.className = 'px-2.5 py-1.5 rounded-lg text-[11px] font-bold font-heading bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors';
        }
        if (btnAll) {
            btnAll.className = 'px-2.5 py-1.5 rounded-lg text-[11px] font-bold font-heading text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors';
        }
    }

    applyReportGroupFilterToButtons();
}

function applyReportGroupFilterToButtons() {
    const subtabButtons = document.querySelectorAll('.report-subtab-btn');
    subtabButtons.forEach(btn => {
        const btnGroup = btn.getAttribute('data-report-group');
        if (currentReportViewMode === 'all' || btnGroup === currentActiveReportGroup) {
            btn.classList.remove('hidden');
        } else {
            btn.classList.add('hidden');
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
            ? `<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">Xe Nhà</span>`
            : `<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">Xe Bạn / 3PL</span>`;
        
        const profitColor = item.profit >= 0 ? 'text-emerald-700' : 'text-rose-600';
        const marginColor = item.margin_percent >= 20 ? 'bg-emerald-100 text-emerald-800' :
                            (item.margin_percent >= 10 ? 'bg-teal-100 text-teal-800' : 'bg-amber-100 text-amber-800');

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
                    <span class="px-2 py-0.5 rounded-md text-[11px] font-black ${marginColor} tabular-nums">
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
                    <td class="text-center font-mono font-bold text-amber-700 text-xs">${sl.warning_count > 0 ? `<span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">${sl.warning_count}</span>` : '0'}</td>
                    <td class="text-center font-mono font-bold text-rose-700 text-xs">${sl.overdue_count > 0 ? `<span class="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-black">${sl.overdue_count}</span>` : '0'}</td>
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
            statusBadge = `<span class="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-200">Quá hạn (${Math.abs(item.days_left)} ngày)</span>`;
        } else if (item.det_status === 'WARNING') {
            statusBadge = `<span class="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-200">Còn ${item.days_left} ngày</span>`;
        } else {
            statusBadge = `<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">An toàn</span>`;
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
            ? `<span class="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">ĐÚNG HẸN</span>`
            : `<span class="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-200">TRỄ HẸN</span>`;

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
            ? `<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Đã thu hồi</span>`
            : `<span class="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-200">Chờ khách trả</span>`;

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
            ? `<span class="px-2 py-0.5 rounded-full text-[11px] font-black bg-indigo-100 text-indigo-800 border border-indigo-200">Cắt Kéo Đổi Xe</span>`
            : `<span class="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-200">Lưu Xe Sau 0H</span>`;

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

                let statusBadge = `<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">${escapeHtml(s.settlement_status)}</span>`;
                if (s.balance_due <= 0) {
                    statusBadge = `<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">Đã quyết toán</span>`;
                }

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
                <td class="text-center text-slate-600 text-xs tabular-nums">${item.split_trips_count > 0 ? `<span class="px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 font-bold">${item.split_trips_count}</span>` : '0'}</td>
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
        if (item.status === 'APPROVED') {
            statusBadge = '<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">Đang lưu hành</span>';
        } else if (item.status === 'SETTLED') {
            statusBadge = '<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Đã quyết toán</span>';
        } else if (item.status === 'PENDING') {
            statusBadge = '<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">Chờ duyệt xuất</span>';
        } else {
            statusBadge = `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">${escapeHtml(item.status_label)}</span>`;
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
            actionBadge = '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Tài xế nộp lại</span>';
        } else if (item.settlement_action === 'REIMBURSE') {
            actionBadge = '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Cty/ĐV chi bù</span>';
        } else {
            actionBadge = '<span class="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">Khớp đúng</span>';
        }

        const statusBadge = item.is_settled
            ? '<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 justify-center"><i class="ph-bold ph-check-circle"></i> Đã hoàn ứng</span>'
            : '<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 justify-center"><i class="ph-bold ph-clock"></i> Đang tạm ứng</span>';

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
                    <div class="font-bold text-slate-900 flex items-center gap-1">
                        <i class="ph-bold ph-steering-wheel text-slate-500"></i>
                        <span>${escapeHtml(item.driver_name)}</span>
                    </div>
                    <div class="text-[10px] font-mono font-bold text-teal-800 mt-0.5">${escapeHtml(item.license_plate)}</div>
                </td>
                <td class="text-center text-xs font-mono text-slate-600">${escapeHtml(item.advance_date)}</td>
                <td class="text-xs text-slate-600">
                    <span class="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">${escapeHtml(item.advance_source)}</span>
                </td>
                <td class="text-right text-xs font-bold text-indigo-800 tabular-nums">${formatMoneyVND(item.advance_amount)}</td>
                <td class="text-right text-xs font-bold text-rose-700 tabular-nums">${formatMoneyVND(item.actual_expenses)}</td>
                <td class="text-right text-[11px] text-slate-600 tabular-nums">
                    <span title="Vé cầu đường BOT" class="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">BOT: ${formatMoneyVND(item.bot_expense)}</span>
                    <span title="Nâng / hạ bãi cảng" class="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-medium ml-1">Cảng: ${formatMoneyVND(item.port_lift_expense)}</span>
                    ${item.deposit_expense > 0 ? `<span title="Cược vỏ cont" class="px-1.5 py-0.5 bg-amber-50 rounded text-amber-800 font-medium ml-1">Cược: ${formatMoneyVND(item.deposit_expense)}</span>` : ''}
                </td>
                <td class="text-right text-xs tabular-nums ${diffColor} p-2 rounded">${diffText}</td>
                <td class="text-center text-xs">${actionBadge}</td>
                <td class="text-center text-xs">${statusBadge}</td>
                <td class="text-center text-xs font-bold tabular-nums">
                    ${item.documents_count > 0 
                        ? `<span class="px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 inline-flex items-center gap-1"><i class="ph-bold ph-receipt"></i> ${item.documents_count}</span>` 
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
            categoryBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">Tồn T- trước ➔ Đã Q.Toán</span>';
        } else if (item.category_tag === 'BACKLOG_PENDING') {
            categoryBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">Tồn T- trước ➔ Nợ Tiếp</span>';
        } else if (item.category_tag === 'CURRENT_SETTLED') {
            categoryBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">Trong kỳ ➔ Đã Q.Toán</span>';
        } else {
            categoryBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Trong kỳ ➔ Chưa Chốt</span>';
        }

        const settlementBadge = item.is_settled
            ? '<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 justify-center"><i class="ph-bold ph-check-circle"></i> Đã Quyết Toán</span>'
            : '<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 justify-center"><i class="ph-bold ph-hourglass"></i> Chưa Chốt</span>';

        const podBadge = item.has_pod
            ? '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 inline-flex items-center gap-1"><i class="ph-bold ph-file-check"></i> Đã Thu POD</span>'
            : '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 inline-flex items-center gap-1"><i class="ph-bold ph-warning-circle"></i> Thiếu POD</span>';

        const ownershipBadge = item.vehicle_ownership === 'OWNED'
            ? '<span class="px-1.5 py-0.2 rounded text-[10px] font-bold bg-teal-50 text-teal-800">Xe Nhà</span>'
            : '<span class="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-50 text-indigo-800">Xe Bạn (3PL)</span>';

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
                    <div class="font-bold text-slate-900 flex items-center gap-1">
                        <i class="ph-bold ph-steering-wheel text-slate-500"></i>
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
            levelBadge = '<span class="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">> 30 Ngày (Cực Gấp)</span>';
        } else if (item.aging_level === 'WARNING') {
            levelBadge = '<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">16 - 30 Ngày (Cảnh Báo)</span>';
        } else if (item.aging_level === 'WATCH') {
            levelBadge = '<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-300">8 - 15 Ngày (Đốc Thúc POD)</span>';
        } else {
            levelBadge = '<span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">0 - 7 Ngày (Bình Thường)</span>';
        }

        const podBadge = item.has_pod
            ? '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">Đã Có POD</span>'
            : '<span class="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-700">Thiếu POD Gốc</span>';

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
                    <div class="flex items-center gap-1">
                        <i class="ph-bold ph-steering-wheel text-slate-500"></i>
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
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">${escapeHtml(item.status_label)}</span>
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
    if (subtitleEl) subtitleEl.innerText = `Kỳ báo cáo: ${periodLabel} • Đơn vị tiền tệ: VNĐ • Xuất tự động từ BIM TMS`;

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

    // 1. Kiểm tra deep-link chi tiết chuyến xe: /dispatch/trips/<hashid> hoặc legacy #/trip/<hashid>
    const tripMatch = pathname.match(/^\/dispatch\/trips\/([a-zA-Z0-9_-]+)/) || (hash.startsWith('trip/') ? hash.match(/^trip\/([a-zA-Z0-9_-]+)/) : null);
    if (tripMatch && tripMatch[1]) {
        const tripIdentifier = tripMatch[1];
        switchTab('dieu-van', false);
        viewTripDetail(tripIdentifier, false);
        if (window.history && window.history.replaceState) {
            window.history.replaceState({ view: 'trip-detail', tripIdentifier }, '', `/dispatch/trips/${tripIdentifier}`);
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
    if (tripMatch && tripMatch[1]) {
        switchTab('dieu-van', false);
        viewTripDetail(tripMatch[1], false);
    } else {
        const targetTab = ROUTE_TAB_MAP[pathname] || 'dashboard';
        const detailView = document.getElementById('view-trip-detail');
        if (detailView && !detailView.classList.contains('hidden-view')) {
            detailView.classList.add('hidden-view');
        }
        switchTab(targetTab, false);
    }
});

// ==============================================================================
// 10. PHÂN HỆ DỊCH VỤ HẢI QUAN & THÔNG QUAN ĐIỆN TỬ (VNACCS/VCIS CONTROLLER)
// ==============================================================================
let customsDeclarationsCache = [];
let customsSearchDebounceTimeout = null;

function debounceCustomsSearch() {
    clearTimeout(customsSearchDebounceTimeout);
    customsSearchDebounceTimeout = setTimeout(() => {
        fetchCustomsDeclarations();
    }, 300);
}

async function fetchCustomsDeclarations() {
    const q = document.getElementById('customs-filter-q')?.value?.trim() || '';
    const lane = document.getElementById('customs-filter-lane')?.value || '';
    const status = document.getElementById('customs-filter-status')?.value || '';
    const direction = document.getElementById('customs-filter-direction')?.value || '';
    const tax = document.getElementById('customs-filter-tax')?.value || '';

    const tbody = document.getElementById('customs-table-body');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="py-12 text-center text-slate-400">
                    <i class="ph-bold ph-spinner animate-spin text-2xl text-teal-600 mb-2"></i>
                    <p class="text-xs font-medium">Đang tải dữ liệu tờ khai hải quan VNACCS...</p>
                </td>
            </tr>
        `;
    }

    try {
        const params = new URLSearchParams();
        if (q) params.append('q', q);
        if (lane) params.append('lane', lane);
        if (status) params.append('status', status);
        if (direction) params.append('direction', direction);
        if (tax !== '') params.append('is_tax_paid', tax);

        const globalDates = getDateRangeForPeriod(currentDashboardPeriod, currentDashboardCustomStart, currentDashboardCustomEnd);
        if (globalDates.fromDate) params.append('from_date', globalDates.fromDate);
        if (globalDates.toDate) params.append('to_date', globalDates.toDate);

        const res = await fetchWithAuth(`/api/customs/declarations/?${params.toString()}`);
        if (!res.ok) throw new Error('Không thể tải dữ liệu hải quan');
        const data = await res.json();
        
        customsDeclarationsCache = data.results || [];
        renderCustomsKPIs(data.stats || {});
        renderCustomsTable(customsDeclarationsCache);
    } catch (err) {
        console.error('Error fetching customs data:', err);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="py-8 text-center text-rose-500 text-xs font-bold">
                        <i class="ph-bold ph-warning-circle text-xl mb-1"></i>
                        <p>Không thể kết nối đến máy chủ hải quan: ${err.message}</p>
                    </td>
                </tr>
            `;
        }
    }
}

function renderCustomsKPIs(stats) {
    const totalEl = document.getElementById('customs-kpi-total');
    const greenEl = document.getElementById('customs-kpi-green');
    const yellowEl = document.getElementById('customs-kpi-yellow');
    const redEl = document.getElementById('customs-kpi-red');
    const rateEl = document.getElementById('customs-kpi-rate');

    if (totalEl) totalEl.innerText = stats.total || 0;
    if (greenEl) greenEl.innerText = stats.green_count || 0;
    if (yellowEl) yellowEl.innerText = stats.yellow_count || 0;
    if (redEl) redEl.innerText = stats.red_count || 0;
    if (rateEl) rateEl.innerText = `Tỷ lệ thông quan: ${stats.clearance_rate || 0}%`;
}

function renderCustomsTable(list) {
    const tbody = document.getElementById('customs-table-body');
    const footerCount = document.getElementById('customs-footer-count');
    if (!tbody) return;

    if (footerCount) footerCount.innerText = `Hiển thị ${list.length} tờ khai`;

    if (!list || list.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="py-12 text-center text-slate-400">
                    <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-400">
                        <i class="ph-bold ph-file-x text-2xl"></i>
                    </div>
                    <p class="text-xs font-medium text-slate-600">Không tìm thấy tờ khai hải quan phù hợp</p>
                    <p class="text-[11px] text-slate-400 mt-0.5">Bấm nút "Đăng Ký Tờ Khai Mới" để tạo hồ sơ thông quan</p>
                </td>
            </tr>
        `;
        return;
    }

    const laneBadges = {
        'GREEN': '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>Luồng Xanh</span>',
        'YELLOW': '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>Luồng Vàng</span>',
        'RED': '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>Luồng Đỏ</span>',
    };

    const statusBadges = {
        'DRAFT': '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-600">Chờ truyền TK</span>',
        'SUBMITTED': '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-700">Đã đăng ký</span>',
        'PROCESSING': '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-700">Đang thẩm định</span>',
        'INSPECTION': '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-700">Kiểm hóa bãi/cảng</span>',
        'CLEARED': '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-700">Đã thông quan</span>',
        'RELEASED': '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-teal-100 text-teal-800">Đã qua giám sát</span>',
        'CANCELLED': '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700">Hủy tờ khai</span>',
    };

    tbody.innerHTML = list.map((d, index) => {
        const laneHtml = laneBadges[d.customs_lane] || d.customs_lane;
        const statusHtml = statusBadges[d.status] || d.status;
        const taxBadge = d.is_tax_paid 
            ? `<button onclick="quickToggleCustomsTax(${d.id})" class="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer" title="Bấm để đổi trạng thái thuế">Đã nộp</button>`
            : `<button onclick="quickToggleCustomsTax(${d.id})" class="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer" title="Bấm để đổi trạng thái thuế">Chưa nộp</button>`;
        
        const docBtn = d.document_url
            ? `<a href="${d.document_url}" target="_blank" class="p-1 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded transition-colors" title="Xem tệp tờ khai"><i class="ph-bold ph-file-pdf text-sm"></i></a>`
            : '';

        const tripBadge = d.trip_code 
            ? `<a href="javascript:void(0)" onclick="viewTripDetail('${d.trip_code}')" class="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-teal-50 text-teal-800 font-mono font-bold text-[11px] hover:bg-teal-100 border border-teal-200">
                <i class="ph-bold ph-truck text-xs"></i>
                <span>${d.trip_code}</span>
               </a>`
            : `<span class="text-slate-400 text-xs italic">Chưa gán xe</span>`;

        const clearBtn = (d.status !== 'CLEARED' && d.status !== 'RELEASED')
            ? `<button onclick="quickSetCustomsStatus(${d.id}, 'set_cleared')" class="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors cursor-pointer" title="Xác nhận Thông quan nhanh"><i class="ph-bold ph-check-circle text-sm"></i></button>`
            : '';

        return `
            <tr class="hover:bg-teal-50/40 transition-colors border-b border-slate-200/80">
                <td class="py-2.5 px-3 text-center text-xs font-bold text-slate-500 border-r border-slate-200">${index + 1}</td>
                <td class="py-2.5 px-3 border-r border-slate-200">
                    <div class="font-mono font-bold text-teal-900 text-xs">${d.declaration_number}</div>
                    <div class="flex items-center space-x-1.5 mt-0.5">
                        <span class="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 text-[10px] font-bold">${d.declaration_type}</span>
                        <span class="text-[11px] text-slate-400 font-medium">${d.declaration_date}</span>
                        <span class="text-[10px] font-bold ${d.direction === 'IMPORT' ? 'text-blue-600' : 'text-amber-600'}">${d.direction === 'IMPORT' ? 'NHẬP' : 'XUẤT'}</span>
                    </div>
                </td>
                <td class="py-2.5 px-3 border-r border-slate-200">
                    <div class="text-xs font-bold text-slate-800">${d.customer_name}</div>
                    <div class="text-[11px] text-slate-500 truncate max-w-[200px]" title="${d.customs_office_name}">${d.customs_office_code} - ${d.customs_office_name}</div>
                </td>
                <td class="py-2.5 px-3 text-center border-r border-slate-200">
                    <div class="inline-block relative">
                        ${laneHtml}
                    </div>
                </td>
                <td class="py-2.5 px-3 text-center border-r border-slate-200">${statusHtml}</td>
                <td class="py-2.5 px-3 border-r border-slate-200 font-mono text-xs">
                    <div class="font-bold text-slate-700">${d.bill_of_lading || '-'}</div>
                    <div class="text-[11px] text-slate-500 mt-0.5 truncate max-w-[150px]" title="${d.container_numbers || ''}">${d.container_numbers || '-'}</div>
                </td>
                <td class="py-2.5 px-3 border-r border-slate-200">${tripBadge}</td>
                <td class="py-2.5 px-3 text-right border-r border-slate-200">
                    <div class="font-mono font-bold text-xs text-slate-800">${formatMoney(d.tax_amount_vnd)}</div>
                    <div class="mt-0.5">${taxBadge}</div>
                </td>
                <td class="py-2.5 px-3 text-right border-r border-slate-200 font-mono font-bold text-xs text-amber-700">
                    ${formatMoney(d.reimbursable_fee)}
                </td>
                <td class="py-2.5 px-3 text-center">
                    <div class="flex items-center justify-center space-x-1">
                        ${clearBtn}
                        ${docBtn}
                        <button onclick="openCustomsModal(${d.id})" class="p-1 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded transition-colors cursor-pointer" title="Chỉnh sửa"><i class="ph-bold ph-pencil-simple text-sm"></i></button>
                        <button onclick="deleteCustomsDeclaration(${d.id})" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Xóa tờ khai"><i class="ph-bold ph-trash text-sm"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function onCustomsOfficeChange(selectEl) {
    const val = selectEl.value;
    const names = {
        '02CI': 'Chi cục HQ Cửa khẩu Cảng Sài Gòn KV4 (Cát Lái)',
        '51CB': 'Chi cục HQ Cửa khẩu Cảng Cái Mép (BR-VT)',
        '43BA': 'Chi cục Hải quan Sóng Thần (Bình Dương)',
        '43BD': 'Chi cục HQ Quản lý Hàng XNK Ngoài KCN Bình Dương',
        '47PA': 'Chi cục Hải quan Long An',
        '02IK': 'Chi cục Hải quan Chuyển Phát Nhanh TP.HCM',
        '01NV': 'Chi cục Hải quan Cửa khẩu Sân bay Quốc tế Nội Bài',
        '03EE': 'Chi cục Hải quan Cửa khẩu Cảng Đình Vũ (Hải Phòng)',
    };
    selectEl.setAttribute('data-office-name', names[val] || 'Chi cục Hải quan');
}

async function openCustomsModal(id = null) {
    const modal = document.getElementById('modal-customs-declaration');
    if (!modal) return;

    // Reset form
    document.getElementById('customs-edit-id').value = id || '';
    document.getElementById('form-customs-declaration').reset();
    document.getElementById('cust-decl-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('cust-current-doc-link').classList.add('hidden');

    const titleEl = document.getElementById('customs-modal-title');
    const submitBtn = document.getElementById('cust-submit-btn');

    // Nạp danh sách khách hàng vào dropdown
    const custSelect = document.getElementById('cust-customer-id');
    if (custSelect) {
        custSelect.innerHTML = '<option value="">-- Đang tải danh sách khách hàng... --</option>';
        try {
            const res = await fetchWithAuth('/api/master-data/customers/');
            const d = await res.json();
            const customers = d.results || [];
            custSelect.innerHTML = '<option value="">-- Chọn Doanh Nghiệp / Chủ Hàng --</option>' +
                customers.map(c => `<option value="${c.id}">${c.name} (${c.code || 'KH'})</option>`).join('');
        } catch (e) {
            custSelect.innerHTML = '<option value="">-- Không thể tải khách hàng --</option>';
        }
    }

    // Nạp danh sách chuyến xe vào dropdown
    const tripSelect = document.getElementById('cust-trip-id');
    if (tripSelect) {
        tripSelect.innerHTML = '<option value="">-- Chưa gán chuyến xe --</option>';
        try {
            const res = await fetchWithAuth('/api/trips/?page_size=30');
            const d = await res.json();
            const trips = d.results || [];
            tripSelect.innerHTML = '<option value="">-- Chưa gán chuyến xe --</option>' +
                trips.map(t => `<option value="${t.id}">${t.trip_code} - ${t.driver_name || 'TX'} (${t.container_number || 'No Cont'})</option>`).join('');
        } catch (e) {
            console.warn('Could not load trips for customs modal', e);
        }
    }

    if (id) {
        if (titleEl) titleEl.innerText = 'Cập Nhật Tờ Khai Hải Quan';
        if (submitBtn) submitBtn.innerHTML = '<i class="ph-bold ph-check text-base"></i><span>Cập Nhật Tờ Khai</span>';
        try {
            const res = await fetchWithAuth(`/api/customs/declarations/${id}/`);
            if (!res.ok) throw new Error('Không thể tải chi tiết tờ khai');
            const item = await res.json();

            document.getElementById('cust-decl-number').value = item.declaration_number || '';
            document.getElementById('cust-decl-number').readOnly = true;
            document.getElementById('cust-decl-date').value = item.declaration_date || '';
            if (custSelect) custSelect.value = item.customer_id || '';
            document.getElementById('cust-direction').value = item.direction || 'IMPORT';
            document.getElementById('cust-decl-type').value = item.declaration_type || 'A11';
            document.getElementById('cust-office-code').value = item.customs_office_code || '02CI';
            document.getElementById('cust-lane').value = item.customs_lane || 'GREEN';
            document.getElementById('cust-status').value = item.status || 'SUBMITTED';
            document.getElementById('cust-bl-number').value = item.bill_of_lading || '';
            document.getElementById('cust-container-numbers').value = item.container_numbers || '';
            if (tripSelect) tripSelect.value = item.dispatch_trip_id || '';
            document.getElementById('cust-is-tax-paid').checked = !!item.is_tax_paid;
            document.getElementById('cust-tax-amount').value = item.tax_amount_vnd || 0;
            document.getElementById('cust-service-fee').value = item.customs_service_fee || 0;
            document.getElementById('cust-reimbursable-fee').value = item.reimbursable_fee || 0;
            document.getElementById('cust-inspection-notes').value = item.inspection_notes || '';

            if (item.document_url) {
                const docLinkDiv = document.getElementById('cust-current-doc-link');
                const docLinkA = docLinkDiv.querySelector('a');
                docLinkA.href = item.document_url;
                docLinkDiv.classList.remove('hidden');
            }
        } catch (err) {
            showToast('Lỗi: ' + err.message, 'error');
            return;
        }
    } else {
        if (titleEl) titleEl.innerText = 'Khai Báo Tờ Khai Hải Quan Điện Tử';
        if (submitBtn) submitBtn.innerHTML = '<i class="ph-bold ph-check text-base"></i><span>Lưu Tờ Khai Hải Quan</span>';
        document.getElementById('cust-decl-number').readOnly = false;
    }

    modal.classList.remove('hidden');
}

function closeCustomsModal() {
    const modal = document.getElementById('modal-customs-declaration');
    if (modal) modal.classList.add('hidden');
}

async function submitCustomsDeclarationForm(e) {
    e.preventDefault();
    const id = document.getElementById('customs-edit-id').value;
    const isEdit = !!id;

    const officeSelect = document.getElementById('cust-office-code');
    const officeCode = officeSelect.value;
    const officeName = officeSelect.getAttribute('data-office-name') || officeSelect.options[officeSelect.selectedIndex]?.text || '';

    const formData = new FormData();
    formData.append('declaration_number', document.getElementById('cust-decl-number').value.trim());
    formData.append('declaration_date', document.getElementById('cust-decl-date').value);
    formData.append('customer_id', document.getElementById('cust-customer-id').value);
    formData.append('direction', document.getElementById('cust-direction').value);
    formData.append('declaration_type', document.getElementById('cust-decl-type').value);
    formData.append('customs_office_code', officeCode);
    formData.append('customs_office_name', officeName);
    formData.append('customs_lane', document.getElementById('cust-lane').value);
    formData.append('status', document.getElementById('cust-status').value);
    formData.append('bill_of_lading', document.getElementById('cust-bl-number').value.trim());
    formData.append('container_numbers', document.getElementById('cust-container-numbers').value.trim());
    
    const tripId = document.getElementById('cust-trip-id').value;
    if (tripId) formData.append('dispatch_trip_id', tripId);

    formData.append('is_tax_paid', document.getElementById('cust-is-tax-paid').checked);
    formData.append('tax_amount_vnd', document.getElementById('cust-tax-amount').value || 0);
    formData.append('customs_service_fee', document.getElementById('cust-service-fee').value || 0);
    formData.append('reimbursable_fee', document.getElementById('cust-reimbursable-fee').value || 0);
    formData.append('inspection_notes', document.getElementById('cust-inspection-notes').value.trim());

    const fileInput = document.getElementById('cust-document-file');
    if (fileInput && fileInput.files && fileInput.files[0]) {
        formData.append('declaration_document', fileInput.files[0]);
    }

    const url = isEdit ? `/api/customs/declarations/${id}/` : '/api/customs/declarations/';
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(data.error || 'Lỗi khi lưu tờ khai hải quan!');
        }

        showToast(data.message || 'Lưu tờ khai thành công!', 'success');
        closeCustomsModal();
        fetchCustomsDeclarations();
    } catch (err) {
        showToast('Lỗi: ' + err.message, 'error');
    }
}

async function quickSetCustomsStatus(id, action) {
    try {
        const res = await fetchWithAuth(`/api/customs/declarations/${id}/action/`, {
            method: 'POST',
            body: JSON.stringify({ action })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Lỗi khi cập nhật trạng thái');

        showToast(data.message || 'Đã cập nhật trạng thái thông quan!', 'success');
        fetchCustomsDeclarations();
    } catch (err) {
        showToast('Lỗi: ' + err.message, 'error');
    }
}

async function quickToggleCustomsTax(id) {
    try {
        const res = await fetchWithAuth(`/api/customs/declarations/${id}/action/`, {
            method: 'POST',
            body: JSON.stringify({ action: 'toggle_tax' })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Lỗi khi cập nhật trạng thái thuế');

        showToast(data.message, 'success');
        fetchCustomsDeclarations();
    } catch (err) {
        showToast('Lỗi: ' + err.message, 'error');
    }
}

async function deleteCustomsDeclaration(id) {
    const confirmed = await showConfirmModal({
        title: 'Xóa Tờ Khai Hải Quan',
        message: 'Bạn có chắc chắn muốn xóa tờ khai hải quan này không?\n\nDữ liệu lịch sử sẽ được bảo lưu an toàn (Soft-Delete).',
        confirmText: 'Xóa Tờ Khai',
        cancelText: 'Huỷ bỏ',
        type: 'danger',
        icon: 'ph-bold ph-trash text-2xl'
    });
    if (!confirmed) return;
    try {
        const res = await fetchWithAuth(`/api/customs/declarations/${id}/`, {
            method: 'DELETE'
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Lỗi khi xóa tờ khai');

        showToast(data.message || 'Đã xóa tờ khai hải quan.', 'success');
        fetchCustomsDeclarations();
    } catch (err) {
        showToast('Lỗi: ' + err.message, 'error');
    }
}

function exportCustomsExcel() {
    const q = document.getElementById('customs-filter-q')?.value?.trim() || '';
    const lane = document.getElementById('customs-filter-lane')?.value || '';
    const status = document.getElementById('customs-filter-status')?.value || '';

    const params = new URLSearchParams();
    if (q) params.append('q', q);
    if (lane) params.append('lane', lane);
    if (status) params.append('status', status);

    window.open(`/api/customs/declarations/export-excel/?${params.toString()}`, '_blank');
}


// ==============================================================================
// 9.8. SUBTAB 8: TRUNG TÂM BÁO CÁO KẾ TOÁN & ĐỐI SOÁT ĐA CHIỀU
// ==============================================================================
let currentAccountingReportType = 'BY_CUSTOMER';
let currentAccountingReportPeriod = 'this_month';
let cachedAccountingReportData = null;

function selectAccountingReportType(reportType) {
    currentAccountingReportType = reportType;
    if (typeof closeAccountingDrilldownView === 'function') {
        closeAccountingDrilldownView();
    }
    
    // Cập nhật giao diện 4 nút
    const buttons = {
        'BY_CUSTOMER': 'btn-rep-type-customer',
        'BY_SUBCONTRACTOR': 'btn-rep-type-subcontractor',
        'BY_DRIVER': 'btn-rep-type-driver',
        'BY_ROUTE': 'btn-rep-type-route'
    };

    Object.entries(buttons).forEach(([type, btnId]) => {
        const btn = document.getElementById(btnId);
        if (btn) {
            if (type === reportType) {
                btn.classList.add('active', 'border-teal-600', 'bg-teal-50', 'text-teal-900');
                btn.classList.remove('border-slate-200', 'bg-white', 'text-slate-700');
            } else {
                btn.classList.remove('active', 'border-teal-600', 'bg-teal-50', 'text-teal-900');
                btn.classList.add('border-slate-200', 'bg-white', 'text-slate-700');
            }
        }
    });

    loadAccountingReportData();
}

function setAccountingReportPeriod(period) {
    currentAccountingReportPeriod = period;
    const fromInput = document.getElementById('acct-rep-from-date');
    const toInput = document.getElementById('acct-rep-to-date');
    if (!fromInput || !toInput) return;

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth(); // 0-indexed

    const pad = (n) => String(n).padStart(2, '0');
    const formatD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (period === 'this_month') {
        fromInput.value = `${y}-${pad(m + 1)}-01`;
        const lastDay = new Date(y, m + 1, 0);
        toInput.value = formatD(lastDay);
    } else if (period === 'last_month') {
        const prevMonth = m === 0 ? 11 : m - 1;
        const prevYear = m === 0 ? y - 1 : y;
        fromInput.value = `${prevYear}-${pad(prevMonth + 1)}-01`;
        const lastDay = new Date(prevYear, prevMonth + 1, 0);
        toInput.value = formatD(lastDay);
    } else if (period === 'this_quarter') {
        const qMonth = Math.floor(m / 3) * 3;
        fromInput.value = `${y}-${pad(qMonth + 1)}-01`;
        const lastDay = new Date(y, qMonth + 3, 0);
        toInput.value = formatD(lastDay);
    } else if (period === 'this_year') {
        fromInput.value = `${y}-01-01`;
        toInput.value = `${y}-12-31`;
    }

    loadAccountingReportData();
}

async function loadAccountingReportData() {
    try {
        const fromDate = document.getElementById('acct-rep-from-date')?.value || '';
        const toDate = document.getElementById('acct-rep-to-date')?.value || '';

        let url = `/api/accounting/reports/?report_type=${currentAccountingReportType}`;
        if (fromDate) url += `&from_date=${fromDate}`;
        if (toDate) url += `&to_date=${toDate}`;

        const res = await fetchWithAuth(url);
        if (!res.ok) throw new Error('Không thể tải dữ liệu báo cáo kế toán');
        const data = await res.json();
        cachedAccountingReportData = data;

        // Render Title
        const titleEl = document.getElementById('acct-rep-title');
        if (titleEl) titleEl.innerText = data.report_title || 'Báo Cáo Kế Toán';
        const tblTitleEl = document.getElementById('acct-rep-table-title');
        if (tblTitleEl) tblTitleEl.innerText = data.report_title || 'Chi Tiết Số Liệu';

        // Render KPIs
        renderAccountingReportKPIs(data);

        // Render Table Headers & Body
        renderAccountingReportTable(data);

        // Update Row Count
        const countEl = document.getElementById('acct-rep-row-count');
        if (countEl) countEl.innerText = `${(data.rows || []).length} đối tượng`;

    } catch (err) {
        console.error('loadAccountingReportData error:', err);
        showToast('warning', 'Lỗi tải báo cáo: ' + err.message);
    }
}

function renderAccountingReportKPIs(data) {
    const container = document.getElementById('acct-rep-kpi-container');
    if (!container) return;
    const kpis = data.kpis || {};
    const fmt = (n) => (n !== undefined && n !== null) ? Number(n).toLocaleString('vi-VN') : '0';

    let cardsHtml = '';

    if (data.report_type === 'BY_CUSTOMER') {
        cardsHtml = `
            <div class="bg-white p-4 rounded-2xl border border-slate-200 border-l-4 border-l-teal-600 shadow-2xs">
                <div class="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                    <span>Tổng Doanh Thu Cước</span>
                    <i class="ph-bold ph-money text-teal-600 text-lg"></i>
                </div>
                <p class="text-2xl font-black text-slate-900 font-heading mt-1">${fmt(kpis.total_revenue)} đ</p>
                <p class="text-[11px] text-slate-500 mt-1">${fmt(kpis.total_trips)} chuyến (${fmt(kpis.total_customers)} khách hàng)</p>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-slate-200 border-l-4 border-l-rose-500 shadow-2xs">
                <div class="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                    <span>Chi Phí Vận Hành</span>
                    <i class="ph-bold ph-receipt text-rose-600 text-lg"></i>
                </div>
                <p class="text-2xl font-black text-rose-600 font-heading mt-1">${fmt(kpis.total_operating_expenses)} đ</p>
                <p class="text-[11px] text-slate-500 mt-1">Nâng hạ, cầu đường & chi phí chuyến</p>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-slate-200 border-l-4 border-l-indigo-600 shadow-2xs">
                <div class="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                    <span>Tiền Chi Hộ (Debit Note)</span>
                    <i class="ph-bold ph-hand-coins text-indigo-600 text-lg"></i>
                </div>
                <p class="text-2xl font-black text-indigo-600 font-heading mt-1">${fmt(kpis.total_reimbursables)} đ</p>
                <p class="text-[11px] text-slate-500 mt-1">Đang theo dõi thu hồi từ khách hàng</p>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-slate-200 border-l-4 border-l-emerald-600 shadow-2xs">
                <div class="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                    <span>Lợi Nhuận Gộp (Margin)</span>
                    <i class="ph-bold ph-trend-up text-emerald-600 text-lg"></i>
                </div>
                <p class="text-2xl font-black text-emerald-600 font-heading mt-1">${fmt(kpis.total_gross_profit)} đ</p>
                <p class="text-[11px] text-emerald-700 font-bold mt-1">Biên lợi nhuận TB: ${kpis.avg_profit_margin_pct}%</p>
            </div>
        `;
    } else if (data.report_type === 'BY_SUBCONTRACTOR') {
        cardsHtml = `
            <div class="bg-white p-4 rounded-2xl border border-slate-200 border-l-4 border-l-blue-600 shadow-2xs">
                <div class="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                    <span>Tổng Chuyến Xe Bạn</span>
                    <i class="ph-bold ph-truck text-blue-600 text-lg"></i>
                </div>
                <p class="text-2xl font-black text-slate-900 font-heading mt-1">${fmt(kpis.total_trips)} chuyến</p>
                <p class="text-[11px] text-slate-500 mt-1">${fmt(kpis.total_vehicles)} đầu xe đối tác</p>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-slate-200 border-l-4 border-l-amber-500 shadow-2xs">
                <div class="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                    <span>Cước Thuê Xe Bạn</span>
                    <i class="ph-bold ph-handshake text-amber-600 text-lg"></i>
                </div>
                <p class="text-2xl font-black text-amber-900 font-heading mt-1">${fmt(kpis.total_subcontractor_cost)} đ</p>
                <p class="text-[11px] text-slate-500 mt-1">Thu từ khách: ${fmt(kpis.total_customer_revenue)} đ</p>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-slate-200 border-l-4 border-l-rose-600 shadow-2xs">
                <div class="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                    <span>Còn Phải Trả Xe Bạn (AP)</span>
                    <i class="ph-bold ph-wallet text-rose-600 text-lg"></i>
                </div>
                <p class="text-2xl font-black text-rose-600 font-heading mt-1">${fmt(kpis.total_remaining_payable)} đ</p>
                <p class="text-[11px] text-slate-500 mt-1">Đã ứng trước: ${fmt(kpis.total_advance_paid)} đ</p>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-slate-200 border-l-4 border-l-emerald-600 shadow-2xs">
                <div class="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                    <span>Lợi Nhuận Giữ Lại Cty</span>
                    <i class="ph-bold ph-coins text-emerald-600 text-lg"></i>
                </div>
                <p class="text-2xl font-black text-emerald-600 font-heading mt-1">${fmt(kpis.total_company_margin)} đ</p>
                <p class="text-[11px] text-emerald-700 font-bold mt-1">Chênh lệch cước dịch vụ 3PL</p>
            </div>
        `;
    } else if (data.report_type === 'BY_DRIVER') {
        cardsHtml = `
            <div class="bg-white p-4 rounded-2xl border border-slate-200 border-l-4 border-l-teal-600 shadow-2xs">
                <div class="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                    <span>Tổng Chuyến Hoàn Thành</span>
                    <i class="ph-bold ph-steering-wheel text-teal-600 text-lg"></i>
                </div>
                <p class="text-2xl font-black text-slate-900 font-heading mt-1">${fmt(kpis.total_trips_completed)} chuyến</p>
                <p class="text-[11px] text-slate-500 mt-1">${fmt(kpis.total_drivers)} bác tài xe nhà</p>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-slate-200 border-l-4 border-l-blue-600 shadow-2xs">
                <div class="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                    <span>Lương Chuyến Định Mức</span>
                    <i class="ph-bold ph-money text-blue-600 text-lg"></i>
                </div>
                <p class="text-2xl font-black text-blue-900 font-heading mt-1">${fmt(kpis.total_trip_salary)} đ</p>
                <p class="text-[11px] text-slate-500 mt-1">Khoán lương theo chuyến chạy</p>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-slate-200 border-l-4 border-l-amber-500 shadow-2xs">
                <div class="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                    <span>Tạm Ứng Đã Nhận</span>
                    <i class="ph-bold ph-hand-coins text-amber-600 text-lg"></i>
                </div>
                <p class="text-2xl font-black text-amber-900 font-heading mt-1">${fmt(kpis.total_advance_given)} đ</p>
                <p class="text-[11px] text-slate-500 mt-1">Thực chi hiện trường: ${fmt(kpis.total_actual_expense)} đ</p>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-slate-200 border-l-4 border-l-emerald-600 shadow-2xs">
                <div class="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                    <span>Chênh Lệch Quyết Toán</span>
                    <i class="ph-bold ph-arrows-left-right text-emerald-600 text-lg"></i>
                </div>
                <p class="text-2xl font-black text-emerald-700 font-heading mt-1">+${fmt(kpis.total_driver_refund)} đ</p>
                <p class="text-[11px] text-slate-500 mt-1">Tài xế hoàn lại cty (Chi bù: ${fmt(kpis.total_company_reimburse)} đ)</p>
            </div>
        `;
    } else if (data.report_type === 'BY_ROUTE') {
        cardsHtml = `
            <div class="bg-white p-4 rounded-2xl border border-slate-200 border-l-4 border-l-indigo-600 shadow-2xs">
                <div class="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                    <span>Tổng Tuyến Vận Chuyển</span>
                    <i class="ph-bold ph-path text-indigo-600 text-lg"></i>
                </div>
                <p class="text-2xl font-black text-slate-900 font-heading mt-1">${fmt(kpis.total_routes)} tuyến</p>
                <p class="text-[11px] text-slate-500 mt-1">${fmt(kpis.total_trips)} chuyến vận hành</p>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-slate-200 border-l-4 border-l-teal-600 shadow-2xs">
                <div class="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                    <span>Doanh Thu Toàn Tuyến</span>
                    <i class="ph-bold ph-money text-teal-600 text-lg"></i>
                </div>
                <p class="text-2xl font-black text-teal-900 font-heading mt-1">${fmt(kpis.total_revenue)} đ</p>
                <p class="text-[11px] text-slate-500 mt-1">Tổng cước thu từ tất cả các tuyến</p>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-slate-200 border-l-4 border-l-orange-500 shadow-2xs">
                <div class="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                    <span>Chi Phí Vé BOT Tuyến</span>
                    <i class="ph-bold ph-barcode text-orange-600 text-lg"></i>
                </div>
                <p class="text-2xl font-black text-orange-700 font-heading mt-1">${fmt(kpis.total_toll_fee)} đ</p>
                <p class="text-[11px] text-slate-500 mt-1">Tổng chi phí: ${fmt(kpis.total_expense)} đ</p>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-slate-200 border-l-4 border-l-emerald-600 shadow-2xs">
                <div class="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                    <span>Lợi Nhuận Gộp Tuyến</span>
                    <i class="ph-bold ph-trend-up text-emerald-600 text-lg"></i>
                </div>
                <p class="text-2xl font-black text-emerald-600 font-heading mt-1">${fmt(kpis.total_gross_profit)} đ</p>
                <p class="text-[11px] text-emerald-700 font-bold mt-1">Lợi nhuận gộp sau trừ BOT & chi phí</p>
            </div>
        `;
    }

    container.innerHTML = cardsHtml;
}

// =========================================================================
// TRUNG TÂM BÁO CÁO KẾ TOÁN: TÌM KIẾM, SẮP XẾP CỘT & DRILL-DOWN CHI TIẾT
// =========================================================================

let accountingReportSearchTerm = '';
let accountingReportSortColumn = null;
let accountingReportSortAsc = false;
let cachedAccountingDrilldownData = null;
let currentDrilldownTab = 'trips';

function filterAccountingReportTable() {
    const input = document.getElementById('acct-rep-search-input');
    const clearBtn = document.getElementById('acct-rep-search-clear');
    accountingReportSearchTerm = input ? input.value.trim().toLowerCase() : '';

    if (clearBtn) {
        if (accountingReportSearchTerm) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
    }

    if (cachedAccountingReportData) {
        renderAccountingReportTable(cachedAccountingReportData);
    }
}
window.filterAccountingReportTable = filterAccountingReportTable;

function clearAccountingReportSearch() {
    const input = document.getElementById('acct-rep-search-input');
    if (input) input.value = '';
    filterAccountingReportTable();
}
window.clearAccountingReportSearch = clearAccountingReportSearch;

function sortAccountingReportBy(colKey) {
    if (accountingReportSortColumn === colKey) {
        accountingReportSortAsc = !accountingReportSortAsc;
    } else {
        accountingReportSortColumn = colKey;
        accountingReportSortAsc = false; // Mặc định cột tiền/số lượng ưu tiên giảm dần
    }
    if (cachedAccountingReportData) {
        renderAccountingReportTable(cachedAccountingReportData);
    }
}
window.sortAccountingReportBy = sortAccountingReportBy;

function renderAccountingReportTable(data) {
    const thead = document.getElementById('acct-rep-thead');
    const tbody = document.getElementById('acct-rep-tbody');
    const rowCountEl = document.getElementById('acct-rep-row-count');
    if (!thead || !tbody) return;

    const headers = data.headers || [];
    let rows = (data.rows || []).slice();
    const fmt = (n) => (n !== undefined && n !== null) ? Number(n).toLocaleString('vi-VN') : '0';

    // 1. Lọc theo từ khóa tìm kiếm (Search Filter)
    if (accountingReportSearchTerm) {
        rows = rows.filter(r => {
            const combinedText = Object.values(r).map(v => String(v || '').toLowerCase()).join(' ');
            return combinedText.includes(accountingReportSearchTerm);
        });
    }

    // 2. Sắp xếp theo cột (Column Sorting)
    if (accountingReportSortColumn) {
        rows.sort((a, b) => {
            let va = a[accountingReportSortColumn];
            let vb = b[accountingReportSortColumn];
            if (va === null || va === undefined) va = 0;
            if (vb === null || vb === undefined) vb = 0;

            if (typeof va === 'number' && typeof vb === 'number') {
                return accountingReportSortAsc ? va - vb : vb - va;
            }
            return accountingReportSortAsc 
                ? String(va).localeCompare(String(vb), 'vi') 
                : String(vb).localeCompare(String(va), 'vi');
        });
    }

    if (rowCountEl) {
        rowCountEl.innerText = `${rows.length} đối tượng`;
    }

    // 3. Render THEAD với Sort Icon & Cursor Pointer
    let thHtml = '<tr class="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200 font-heading text-xs">';
    thHtml += '<th class="py-3 px-3.5 w-12 text-center select-none">STT</th>';
    headers.forEach(h => {
        const alignClass = h.align === 'right' ? 'text-right' : (h.align === 'center' ? 'text-center' : 'text-left');
        let sortIcon = '<i class="ph-bold ph-arrows-down-up text-slate-300 ml-1 text-xs opacity-60"></i>';
        if (accountingReportSortColumn === h.key) {
            sortIcon = accountingReportSortAsc 
                ? '<i class="ph-bold ph-arrow-up text-teal-700 ml-1 text-xs"></i>' 
                : '<i class="ph-bold ph-arrow-down text-teal-700 ml-1 text-xs"></i>';
        }
        thHtml += `
            <th onclick="sortAccountingReportBy('${h.key}')" 
                class="py-3 px-3.5 ${alignClass} cursor-pointer hover:bg-teal-50/80 hover:text-teal-900 transition-colors select-none group" 
                title="Bấm để sắp xếp theo ${h.label}">
                <div class="inline-flex items-center gap-1 ${h.align === 'right' ? 'justify-end' : (h.align === 'center' ? 'justify-center' : 'justify-start')}">
                    <span>${h.label}</span>
                    ${sortIcon}
                </div>
            </th>`;
    });
    thHtml += '<th class="py-3 px-3.5 text-center w-24 select-none">Thao Tác</th>';
    thHtml += '</tr>';
    thead.innerHTML = thHtml;

    // 4. Render TBODY
    if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${headers.length + 2}" class="py-10 text-center text-slate-400 italic">Không tìm thấy đối tượng nào phù hợp với bộ lọc</td></tr>`;
        return;
    }

    let trHtml = '';
    rows.forEach((r, idx) => {
        const targetId = r.customer_id || r.driver_id || r.vehicle_id || 0;
        const targetKey = r.customer_name || r.driver_name || r.vehicle_plate || r.route_name || '';
        const safeTargetKey = encodeURIComponent(targetKey);

        trHtml += `
            <tr onclick="openAccountingReportDrilldown('${targetId}', '${safeTargetKey}')" 
                class="hover:bg-teal-50/70 cursor-pointer transition-colors text-xs border-b border-slate-100 group"
                title="💡 Bấm vào dòng để xem báo cáo chi tiết các chuyến xe của ${escapeHtml(targetKey)}">
                <td class="py-3 px-3.5 text-center font-bold text-slate-400 group-hover:text-teal-700">${idx + 1}</td>
        `;

        headers.forEach(h => {
            const val = r[h.key];
            const alignClass = h.align === 'right' ? 'text-right font-mono font-semibold' : (h.align === 'center' ? 'text-center' : 'text-left font-semibold');

            let displayVal = val;
            if (typeof val === 'number') {
                if (h.key.includes('pct') || h.key.includes('percent')) {
                    displayVal = `${val}%`;
                } else if (h.key.includes('revenue') || h.key.includes('cost') || h.key.includes('expense') || h.key.includes('profit') || h.key.includes('salary') || h.key.includes('toll') || h.key.includes('advance') || h.key.includes('payable') || h.key.includes('refund') || h.key.includes('margin') || h.key.includes('reimbursables') || h.key.includes('reimburse') || h.key.includes('balance')) {
                    displayVal = `${fmt(val)} đ`;
                } else {
                    displayVal = fmt(val);
                }
            }

            // Highlighting
            if (h.key === 'customer_name' || h.key === 'vehicle_plate' || h.key === 'driver_name' || h.key === 'route_name') {
                displayVal = `<span class="font-heading font-black text-slate-900 group-hover:text-teal-800 transition-colors flex items-center gap-1.5"><i class="ph-bold ph-arrow-square-out text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity"></i>${displayVal}</span>`;
            } else if (h.key === 'gross_profit' || h.key === 'company_margin') {
                displayVal = `<span class="text-emerald-700 font-bold font-mono">${displayVal}</span>`;
            } else if (h.key === 'remaining_payable' || h.key === 'operating_expenses') {
                displayVal = `<span class="text-rose-600 font-bold font-mono">${displayVal}</span>`;
            } else if (h.key === 'refund_to_company') {
                displayVal = val > 0 ? `<span class="text-emerald-700 font-bold font-mono">+${displayVal}</span>` : '-';
            } else if (h.key === 'company_reimburse') {
                displayVal = val > 0 ? `<span class="text-amber-700 font-bold font-mono">-${displayVal}</span>` : '-';
            } else if (h.key === 'settlement_balance') {
                if (val > 0) {
                    displayVal = `<span class="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold font-mono">+${fmt(val)} đ <span class="text-[10px] font-normal">(Nộp cty)</span></span>`;
                } else if (val < 0) {
                    displayVal = `<span class="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-bold font-mono">${fmt(val)} đ <span class="text-[10px] font-normal">(Cty bù)</span></span>`;
                } else {
                    displayVal = `<span class="text-slate-400 font-mono">0 đ (Khớp)</span>`;
                }
            }

            trHtml += `<td class="py-3 px-3.5 ${alignClass}">${displayVal}</td>`;
        });

        trHtml += `
            <td class="py-3 px-3.5 text-center" onclick="event.stopPropagation(); openAccountingReportDrilldown('${targetId}', '${safeTargetKey}')">
                <button type="button" class="px-2.5 py-1 bg-white hover:bg-teal-700 hover:text-white text-teal-800 border border-teal-200 rounded-lg text-xs font-bold font-heading shadow-2xs flex items-center gap-1 mx-auto transition-all cursor-pointer">
                    <i class="ph-bold ph-list-magnifying-glass"></i>
                    <span>Chi Tiết</span>
                </button>
            </td>
        `;

        trHtml += '</tr>';
    });

    tbody.innerHTML = trHtml;
}

// =========================================================================
// BÁO CÁO CHI TIẾT TOÀN TRANG (FULL-PAGE DRILL-DOWN)
// =========================================================================

let currentDrilldownTarget = null;

async function openAccountingReportDrilldown(targetId, encodedTargetKey) {
    const targetKey = decodeURIComponent(encodedTargetKey || '');
    currentDrilldownTarget = { targetId, encodedTargetKey };

    // 1. Chuyển đổi giữa View Tổng Hợp và View Chi Tiết Toàn Trang (Focus Mode)
    const summaryView = document.getElementById('acct-rep-summary-view');
    const drilldownView = document.getElementById('acct-rep-drilldown-view');
    const mainHeader = document.getElementById('acct-main-header');
    const mainSubtabsBar = document.getElementById('acct-main-subtabs-bar');

    if (mainHeader) mainHeader.classList.add('hidden');
    if (mainSubtabsBar) mainSubtabsBar.classList.add('hidden');
    if (summaryView) summaryView.classList.add('hidden');
    if (drilldownView) drilldownView.classList.remove('hidden');

    const titleEl = document.getElementById('drilldown-view-title');
    const badgeEl = document.getElementById('drilldown-view-badge');
    const subtextEl = document.getElementById('drilldown-view-subtext');
    const periodEl = document.getElementById('drilldown-view-period');
    const iconEl = document.getElementById('drilldown-view-icon');
    const kpiContainer = document.getElementById('drilldown-kpi-container');
    const tripsTbody = document.getElementById('drilldown-trips-tbody');
    const expTbody = document.getElementById('drilldown-expenses-tbody');
    const tripsTfoot = document.getElementById('drilldown-trips-tfoot');
    const expTfoot = document.getElementById('drilldown-expenses-tfoot');
    const searchInput = document.getElementById('drilldown-table-search');
    if (searchInput) searchInput.value = '';

    if (titleEl) titleEl.innerText = targetKey || 'Đang tải dữ liệu...';
    if (subtextEl) subtextEl.innerText = 'Vui lòng chờ trong giây lát...';

    const fromDate = document.getElementById('acct-rep-from-date')?.value || '';
    const toDate = document.getElementById('acct-rep-to-date')?.value || '';
    let periodText = 'Tất cả';
    if (fromDate && toDate) {
        periodText = `${fromDate} đến ${toDate}`;
    } else if (currentAccountingReportPeriod) {
        const periodMap = {
            'this_month': 'Tháng này',
            'last_month': 'Tháng trước',
            'this_quarter': 'Quý này',
            'this_year': 'Năm nay'
        };
        periodText = periodMap[currentAccountingReportPeriod] || currentAccountingReportPeriod;
    }
    if (periodEl) periodEl.innerText = `Kỳ: ${periodText}`;
    
    // Đổi Badge & Icon theo loại báo cáo
    const reportType = currentAccountingReportType || (cachedAccountingReportData ? cachedAccountingReportData.report_type : 'BY_CUSTOMER');
    if (reportType === 'BY_CUSTOMER') {
        if (badgeEl) {
            badgeEl.innerText = 'CHI TIẾT KHÁCH HÀNG';
            badgeEl.className = 'px-2 py-0.5 rounded-md bg-teal-100 border border-teal-200 text-teal-900 text-[10.5px] font-black uppercase tracking-wider font-heading';
        }
        if (iconEl) iconEl.innerHTML = '<i class="ph-bold ph-buildings text-teal-700"></i>';
    } else if (reportType === 'BY_SUBCONTRACTOR') {
        if (badgeEl) {
            badgeEl.innerText = 'CHI TIẾT XE BẠN (3PL)';
            badgeEl.className = 'px-2 py-0.5 rounded-md bg-rose-100 border border-rose-200 text-rose-900 text-[10.5px] font-black uppercase tracking-wider font-heading';
        }
        if (iconEl) iconEl.innerHTML = '<i class="ph-bold ph-truck text-rose-600"></i>';
    } else if (reportType === 'BY_DRIVER') {
        if (badgeEl) {
            badgeEl.innerText = 'CHI TIẾT BÁC TÀI';
            badgeEl.className = 'px-2 py-0.5 rounded-md bg-amber-100 border border-amber-200 text-amber-900 text-[10.5px] font-black uppercase tracking-wider font-heading';
        }
        if (iconEl) iconEl.innerHTML = '<i class="ph-bold ph-steering-wheel text-amber-600"></i>';
    } else if (reportType === 'BY_ROUTE') {
        if (badgeEl) {
            badgeEl.innerText = 'CHI TIẾT TUYẾN ĐƯỜNG';
            badgeEl.className = 'px-2 py-0.5 rounded-md bg-indigo-100 border border-indigo-200 text-indigo-900 text-[10.5px] font-black uppercase tracking-wider font-heading';
        }
        if (iconEl) iconEl.innerHTML = '<i class="ph-bold ph-path text-indigo-600"></i>';
    }

    if (kpiContainer) {
        kpiContainer.innerHTML = '<div class="col-span-2 lg:col-span-4 py-4 text-center text-slate-400"><i class="ph-bold ph-spinner animate-spin text-xl text-teal-600"></i> Đang nạp dữ liệu phân tích chi tiết...</div>';
    }
    if (tripsTbody) {
        tripsTbody.innerHTML = '<tr><td colspan="11" class="py-12 text-center text-slate-400"><i class="ph-bold ph-spinner animate-spin text-2xl text-teal-600"></i> Đang tải các chuyến xe...</td></tr>';
    }
    if (tripsTfoot) tripsTfoot.innerHTML = '';
    if (expTfoot) expTfoot.innerHTML = '';

    // Cuộn lên đầu view kế toán
    const mainView = document.getElementById('view-ke-toan');
    if (mainView) mainView.scrollTo({ top: 0, behavior: 'smooth' });

    // 2. Gọi API Drill-down
    try {
        const url = `/api/accounting/reports/drilldown/?type=${reportType}&target_id=${targetId}&target_key=${encodeURIComponent(targetKey)}&from_date=${fromDate}&to_date=${toDate}`;
        
        const res = await fetchWithAuth(url);
        if (!res.ok) throw new Error('Không thể tải dữ liệu chi tiết');
        const data = await res.json();
        cachedAccountingDrilldownData = data;

        // Cập nhật thông tin Header
        if (titleEl) titleEl.innerText = data.target_name || targetKey;
        if (subtextEl) subtextEl.innerText = data.target_subtext || '';

        // 3. Render 4 Thẻ KPI Phân Tích Nhỏ Gọn (Compact Metric Strip)
        const sum = data.summary || {};
        const fmt = (n) => Number(n || 0).toLocaleString('vi-VN');

        if (kpiContainer) {
            kpiContainer.innerHTML = `
                <div class="bg-slate-50/80 p-3 rounded-xl border border-slate-200/90 border-l-4 border-l-teal-600 flex items-center justify-between shadow-2xs">
                    <div>
                        <span class="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">Tổng Chuyến Chạy</span>
                        <p class="text-xl font-black text-slate-900 font-heading tabular-nums mt-0.5">${fmt(sum.total_trips)} <span class="text-xs font-semibold text-slate-500">chuyến</span></p>
                    </div>
                    <div class="w-8 h-8 rounded-lg bg-teal-100/70 text-teal-800 flex items-center justify-center text-sm shrink-0">
                        <i class="ph-bold ph-truck"></i>
                    </div>
                </div>
                <div class="bg-slate-50/80 p-3 rounded-xl border border-slate-200/90 border-l-4 border-l-blue-600 flex items-center justify-between shadow-2xs">
                    <div>
                        <span class="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">Tổng Doanh Thu Cước</span>
                        <p class="text-xl font-black text-blue-900 font-heading tabular-nums mt-0.5">${fmt(sum.total_revenue)} <span class="text-xs font-semibold text-slate-500">đ</span></p>
                    </div>
                    <div class="w-8 h-8 rounded-lg bg-blue-100/70 text-blue-800 flex items-center justify-center text-sm shrink-0">
                        <i class="ph-bold ph-hand-coins"></i>
                    </div>
                </div>
                <div class="bg-slate-50/80 p-3 rounded-xl border border-slate-200/90 border-l-4 border-l-rose-500 flex items-center justify-between shadow-2xs">
                    <div>
                        <span class="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">Tổng Chi Phí Thực Tế</span>
                        <p class="text-xl font-black text-rose-600 font-heading tabular-nums mt-0.5">${fmt(sum.total_expense)} <span class="text-xs font-semibold text-slate-500">đ</span></p>
                    </div>
                    <div class="w-8 h-8 rounded-lg bg-rose-100/70 text-rose-700 flex items-center justify-center text-sm shrink-0">
                        <i class="ph-bold ph-receipt"></i>
                    </div>
                </div>
                <div class="bg-slate-50/80 p-3 rounded-xl border border-slate-200/90 border-l-4 border-l-emerald-600 flex items-center justify-between shadow-2xs">
                    <div>
                        <span class="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">Lợi Nhuận Gộp Đối Tượng</span>
                        <p class="text-xl font-black text-emerald-700 font-heading tabular-nums mt-0.5">${fmt(sum.total_gross_profit)} <span class="text-xs font-semibold text-slate-500">đ</span></p>
                    </div>
                    <div class="w-8 h-8 rounded-lg bg-emerald-100/70 text-emerald-800 flex items-center justify-center text-sm shrink-0">
                        <i class="ph-bold ph-trend-up"></i>
                    </div>
                </div>
            `;
        }

        // 4. Render Tab Labels
        const trips = data.trips || [];
        const expenses = data.expenses || [];
        const tabTripsLabel = document.getElementById('drilldown-tab-trips-label');
        const tabExpLabel = document.getElementById('drilldown-tab-expenses-label');
        if (tabTripsLabel) tabTripsLabel.innerText = `Bảng Kê Chuyến Xe (${trips.length})`;
        if (tabExpLabel) tabExpLabel.innerText = `Khoản Chi & Hóa Đơn (${expenses.length})`;

        // 5. Render Bảng Chuyến Xe
        if (tripsTbody) {
            if (trips.length === 0) {
                tripsTbody.innerHTML = '<tr><td colspan="11" class="py-12 text-center text-slate-400 italic">Không có chuyến xe nào trong kỳ đã chọn</td></tr>';
            } else {
                let tripsHtml = '';
                trips.forEach((t, idx) => {
                    const statusClass = t.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800';
                    tripsHtml += `
                        <tr class="hover:bg-teal-50/50 transition-colors">
                            <td class="py-3 px-3.5 text-center font-bold text-slate-400">${idx + 1}</td>
                            <td class="py-3 px-3.5">
                                <button type="button" onclick="viewTripDetail('${t.trip_code}')"
                                    class="text-teal-700 hover:text-teal-900 font-bold font-mono text-left underline decoration-teal-300 flex items-center gap-1 cursor-pointer">
                                    <i class="ph-bold ph-arrow-square-out text-xs"></i>
                                    <span>${t.trip_code}</span>
                                </button>
                            </td>
                            <td class="py-3 px-3.5 text-slate-600">${t.created_date}</td>
                            <td class="py-3 px-3.5">
                                <strong class="text-slate-800 block font-heading">${escapeHtml(t.vehicle_plate)}</strong>
                                <span class="text-slate-500 text-[11px]">${escapeHtml(t.driver_name)}</span>
                            </td>
                            <td class="py-3 px-3.5">
                                <span class="font-mono font-semibold text-slate-800 block">${escapeHtml(t.container_number)} (${t.container_type})</span>
                                <span class="text-slate-400 text-[10px]">Seal: ${escapeHtml(t.seal_number)}</span>
                            </td>
                            <td class="py-3 px-3.5 text-slate-700 max-w-[240px] truncate font-medium" title="${escapeHtml(t.route)}">
                                ${escapeHtml(t.route)}
                            </td>
                            <td class="py-3 px-3.5 text-right font-mono font-bold text-slate-800">${fmt(t.revenue)} đ</td>
                            <td class="py-3 px-3.5 text-right font-mono font-semibold text-rose-600">${fmt(t.operating_expense)} đ</td>
                            <td class="py-3 px-3.5 text-right font-mono text-amber-700">${t.reimbursable_expense > 0 ? fmt(t.reimbursable_expense) + ' đ' : '-'}</td>
                            <td class="py-3 px-3.5 text-right font-mono font-black text-emerald-700">${fmt(t.gross_profit)} đ</td>
                            <td class="py-3 px-3.5 text-center">
                                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusClass}">
                                    ${t.status_display}
                                </span>
                            </td>
                        </tr>
                    `;
                });
                tripsTbody.innerHTML = tripsHtml;
            }
        }

        // Render Footer Tổng Chuyến Xe
        if (tripsTfoot && trips.length > 0) {
            tripsTfoot.innerHTML = `
                <tr class="bg-slate-100/90 font-black text-slate-800 border-t-2 border-slate-300">
                    <td colspan="6" class="py-3 px-3.5 text-right font-heading uppercase text-xs">
                        TỔNG CỘNG (${trips.length} chuyến):
                    </td>
                    <td class="py-3 px-3.5 text-right font-mono text-blue-900 font-black text-xs">${fmt(sum.total_revenue)} đ</td>
                    <td class="py-3 px-3.5 text-right font-mono text-rose-600 font-black text-xs">${fmt(sum.total_expense)} đ</td>
                    <td class="py-3 px-3.5 text-right font-mono text-amber-700 font-black text-xs">${fmt(sum.total_reimbursable)} đ</td>
                    <td class="py-3 px-3.5 text-right font-mono text-emerald-700 font-black text-xs">${fmt(sum.total_gross_profit)} đ</td>
                    <td></td>
                </tr>
            `;
        }

        // 6. Render Bảng Chi Phí & Hóa Đơn
        if (expTbody) {
            if (expenses.length === 0) {
                expTbody.innerHTML = '<tr><td colspan="9" class="py-12 text-center text-slate-400 italic">Không có khoản chi phí phát sinh nào</td></tr>';
            } else {
                let expHtml = '';
                expenses.forEach((e, idx) => {
                    const isReimbBadge = e.is_on_behalf_of_customer 
                        ? '<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800">Chi Hộ</span>'
                        : '<span class="text-slate-400">-</span>';
                    expHtml += `
                        <tr class="hover:bg-slate-50/80 transition-colors">
                            <td class="py-3 px-3.5 text-center font-bold text-slate-400">${idx + 1}</td>
                            <td class="py-3 px-3.5 font-mono font-bold text-teal-800">${escapeHtml(e.trip_code)}</td>
                            <td class="py-3 px-3.5 font-semibold text-slate-800">
                                ${escapeHtml(e.category_display)}
                                ${e.expense_item_name ? `<span class="text-slate-400 font-normal text-[11px] block">(${escapeHtml(e.expense_item_name)})</span>` : ''}
                            </td>
                            <td class="py-3 px-3.5 text-right font-mono font-black text-rose-600">${fmt(e.amount)} đ</td>
                            <td class="py-3 px-3.5 text-slate-600">${escapeHtml(e.receipt_type_display)}</td>
                            <td class="py-3 px-3.5 font-mono text-slate-700">${escapeHtml(e.invoice_number || '-')}</td>
                            <td class="py-3 px-3.5 text-center">${isReimbBadge}</td>
                            <td class="py-3 px-3.5 text-center">
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">${escapeHtml(e.status_display)}</span>
                            </td>
                            <td class="py-3 px-3.5 text-center text-slate-500">${e.created_at}</td>
                        </tr>
                    `;
                });
                expTbody.innerHTML = expHtml;
            }
        }

        // Render Footer Tổng Chi Phí
        if (expTfoot && expenses.length > 0) {
            expTfoot.innerHTML = `
                <tr class="bg-slate-100/90 font-black text-slate-800 border-t-2 border-slate-300">
                    <td colspan="3" class="py-3 px-3.5 text-right font-heading uppercase text-xs">
                        TỔNG CỘNG (${expenses.length} khoản chi):
                    </td>
                    <td class="py-3 px-3.5 text-right font-mono text-rose-600 font-black text-xs">${fmt(sum.total_expense)} đ</td>
                    <td colspan="5"></td>
                </tr>
            `;
        }

        // Mặc định mở Tab 1 (Chuyến xe)
        switchDrilldownTab('trips');

    } catch (err) {
        console.error('Error loading drilldown:', err);
        showToast('danger', 'Không thể nạp chi tiết báo cáo');
    }
}
window.openAccountingReportDrilldown = openAccountingReportDrilldown;

function switchDrilldownTab(tabName) {
    currentDrilldownTab = tabName;
    const btnTrips = document.getElementById('btn-drilldown-tab-trips');
    const btnExp = document.getElementById('btn-drilldown-tab-expenses');
    const panelTrips = document.getElementById('drilldown-panel-trips');
    const panelExp = document.getElementById('drilldown-panel-expenses');

    if (tabName === 'trips') {
        if (btnTrips) btnTrips.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold font-heading bg-teal-700 text-white shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer';
        if (btnExp) btnExp.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold font-heading text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-all cursor-pointer';
        if (panelTrips) panelTrips.classList.remove('hidden');
        if (panelExp) panelExp.classList.add('hidden');
    } else {
        if (btnTrips) btnTrips.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold font-heading text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-all cursor-pointer';
        if (btnExp) btnExp.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold font-heading bg-teal-700 text-white shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer';
        if (panelTrips) panelTrips.classList.add('hidden');
        if (panelExp) panelExp.classList.remove('hidden');
    }

    // Re-apply search filter for newly activated tab
    filterDrilldownTable();
}
window.switchDrilldownTab = switchDrilldownTab;

function filterDrilldownTable() {
    const searchInput = document.getElementById('drilldown-table-search');
    const clearBtn = document.getElementById('drilldown-search-clear');
    if (!searchInput) return;

    const term = (searchInput.value || '').trim().toLowerCase();
    if (clearBtn) {
        if (term) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
    }

    const currentTab = currentDrilldownTab || 'trips';
    const tbody = currentTab === 'trips' 
        ? document.getElementById('drilldown-trips-tbody') 
        : document.getElementById('drilldown-expenses-tbody');

    if (!tbody) return;

    const rows = tbody.querySelectorAll('tr');
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        if (!term || text.includes(term)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}
window.filterDrilldownTable = filterDrilldownTable;

function clearDrilldownSearch() {
    const searchInput = document.getElementById('drilldown-table-search');
    if (searchInput) {
        searchInput.value = '';
        filterDrilldownTable();
        searchInput.focus();
    }
}
window.clearDrilldownSearch = clearDrilldownSearch;

function closeAccountingDrilldownView() {
    const summaryView = document.getElementById('acct-rep-summary-view');
    const drilldownView = document.getElementById('acct-rep-drilldown-view');
    const mainHeader = document.getElementById('acct-main-header');
    const mainSubtabsBar = document.getElementById('acct-main-subtabs-bar');

    if (drilldownView) drilldownView.classList.add('hidden');
    if (mainHeader) mainHeader.classList.remove('hidden');
    if (mainSubtabsBar) mainSubtabsBar.classList.remove('hidden');
    if (summaryView) summaryView.classList.remove('hidden');

    const mainView = document.getElementById('view-ke-toan');
    if (mainView) mainView.scrollTo({ top: 0, behavior: 'smooth' });
}
window.closeAccountingDrilldownView = closeAccountingDrilldownView;
window.closeAccountingDrilldownModal = closeAccountingDrilldownView;

function reloadAccountingDrilldown() {
    if (currentDrilldownTarget) {
        openAccountingReportDrilldown(currentDrilldownTarget.targetId, currentDrilldownTarget.encodedTargetKey);
    }
}
window.reloadAccountingDrilldown = reloadAccountingDrilldown;
window.reloadAccountingDrilldown = reloadAccountingDrilldown;

function exportAccountingDrilldownToExcel() {
    if (!cachedAccountingDrilldownData || !cachedAccountingDrilldownData.trips || cachedAccountingDrilldownData.trips.length === 0) {
        showToast('warning', 'Chưa có dữ liệu chuyến xe để xuất Excel');
        return;
    }

    const data = cachedAccountingDrilldownData;
    const trips = data.trips;
    let csvContent = '\uFEFF';

    // Header thông tin
    csvContent += `"BÁO CÁO CHI TIẾT CHUYẾN XE — ${data.target_name || ''}"\r\n`;
    csvContent += `"Thời điểm xuất: ${new Date().toLocaleString('vi-VN')}"\r\n\r\n`;

    // Cột
    csvContent += `"STT","Mã Chuyến","Ngày Chạy","Khách Hàng","Đầu Kéo","Bác Tài","SĐT","Container","Seal","Lộ Trình","Doanh Thu (VNĐ)","Chi Phí Chuyến (VNĐ)","Chi Hộ KH (VNĐ)","Lợi Nhuận Gộp (VNĐ)","Trạng Thái"\r\n`;

    trips.forEach((t, idx) => {
        const row = [
            idx + 1,
            `"${t.trip_code}"`,
            `"${t.created_date}"`,
            `"${t.customer_name}"`,
            `"${t.vehicle_plate}"`,
            `"${t.driver_name}"`,
            `"${t.driver_phone}"`,
            `"${t.container_number} (${t.container_type})"`,
            `"${t.seal_number}"`,
            `"${t.route}"`,
            t.revenue,
            t.operating_expense,
            t.reimbursable_expense,
            t.gross_profit,
            `"${t.status_display}"`
        ];
        csvContent += row.join(',') + '\r\n';
    });

    const filename = `BIM_ChiTiet_${(data.target_name || 'DoiTuong').replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('success', `Đã xuất báo cáo chi tiết "${filename}" thành công!`, 'Xuất Excel Thành Công');
}
window.exportAccountingDrilldownToExcel = exportAccountingDrilldownToExcel;

function exportAccountingReportToExcel() {
    if (!cachedAccountingReportData || !cachedAccountingReportData.rows || cachedAccountingReportData.rows.length === 0) {
        showToast('warning', 'Chưa có dữ liệu báo cáo để xuất Excel');
        return;
    }

    const data = cachedAccountingReportData;
    const headers = data.headers || [];
    const rows = data.rows || [];

    let csvContent = '\uFEFF';
    // Title
    csvContent += `"${data.report_title || 'BÁO CÁO KẾ TOÁN'}"\r\n`;
    csvContent += `"Thời điểm xuất: ${new Date().toLocaleString('vi-VN')}"\r\n\r\n`;

    // Headers
    const headerLabels = ['STT', ...headers.map(h => `"${h.label}"`)];
    csvContent += headerLabels.join(',') + '\r\n';

    // Rows
    rows.forEach((r, idx) => {
        const rowData = [idx + 1];
        headers.forEach(h => {
            let val = r[h.key];
            if (val === null || val === undefined) val = '';
            rowData.push(`"${String(val).replace(/"/g, '""')}"`);
        });
        csvContent += rowData.join(',') + '\r\n';
    });

    const filename = `BIM_Logistics_BaoCao_${data.report_type}_${new Date().toISOString().slice(0, 10)}.csv`;
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

window.switchTab = switchTab;
window.switchAccountingSubTab = switchAccountingSubTab;
window.selectAccountingReportType = selectAccountingReportType;
window.switchAccountingReportType = selectAccountingReportType;
window.setAccountingReportPeriod = setAccountingReportPeriod;
window.changeAccountingReportPeriod = setAccountingReportPeriod;
window.loadAccountingReportData = loadAccountingReportData;
window.exportAccountingReportToExcel = exportAccountingReportToExcel;
window.openAccountingReportDrilldown = openAccountingReportDrilldown;
window.closeAccountingDrilldownModal = closeAccountingDrilldownModal;
window.switchDrilldownTab = switchDrilldownTab;
window.exportAccountingDrilldownToExcel = exportAccountingDrilldownToExcel;

// Phân hệ Quyết Toán Gom Chuyến (Driver Settlements View)
window.loadSettlementData = loadSettlementData;
window.onSettlementGroupByChange = onSettlementGroupByChange;
window.populateSettlementTargetOptions = populateSettlementTargetOptions;
window.setSettlementDatePreset = setSettlementDatePreset;
window.resetSettlementFilters = resetSettlementFilters;
window.filterSettlementClientSide = filterSettlementClientSide;
window.selectSettlementTrips = selectSettlementTrips;
window.toggleGroupSettlementSelection = toggleGroupSettlementSelection;
window.toggleMasterSettlementCheckbox = toggleMasterSettlementCheckbox;
window.onSettlementTripSelectionChange = onSettlementTripSelectionChange;
window.executePageSettlementSubmit = executePageSettlementSubmit;
window.exportSettlementToExcel = exportSettlementToExcel;


