/**
 * BIM LOGISTICS — MODULE CORE UTILITIES, AUTH & FORMATTERS
 */

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
    'COMPLETED': 'text-emerald-700 font-semibold',
    'DELIVERED': 'text-teal-700 font-semibold',
    'RETURNING_EMPTY': 'text-purple-700 font-semibold',
    'UNLOADING': 'text-orange-700 font-semibold',
    'AT_WAREHOUSE': 'text-indigo-700 font-semibold',
    'IN_TRANSIT': 'text-amber-700 font-semibold',
    'CONTAINER_PICKED': 'text-cyan-700 font-semibold',
    'ACCEPTED': 'text-blue-700 font-semibold',
    'DISPATCHED': 'text-teal-700 font-semibold',
    'DRAFT': 'text-slate-600 font-semibold',
    'CANCELLED': 'text-rose-700 font-semibold',
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
/**
 * Chuẩn hóa các mã chứng từ, mã chuyến, mã booking:
 * Thay khoảng trắng bằng dấu chấm để thu gọn độ rộng cột và chống tràn bảng
 */
function formatCodeCompact(code) {
    if (code === null || code === undefined) return '';
    return String(code).trim().replace(/\s+/g, '.');
}
window.formatCodeCompact = formatCodeCompact;

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

function formatTimeString(timeStr) {
    if (!timeStr) return '';
    const s = String(timeStr).trim();
    if (!s || s === '-') return '';

    // Chuẩn hóa định dạng có hoặc không có AM/PM (vd: 19:00 PM, 7:30 PM, 08:00 AM, 17:00, 5:00 PM) sang 24h chuẩn (HH:mm)
    const matchTimeAmPm = s.match(/^(\d{1,2}):(\d{1,2})(?::\d{1,2})?\s*([aApP][mM])?$/i);
    if (matchTimeAmPm) {
        let hour = parseInt(matchTimeAmPm[1], 10);
        let minute = parseInt(matchTimeAmPm[2], 10);
        const ampm = matchTimeAmPm[3] ? matchTimeAmPm[3].toUpperCase() : null;
        if (ampm === 'PM' && hour < 12) {
            hour += 12;
        } else if (ampm === 'AM' && hour === 12) {
            hour = 0;
        }
        if (hour > 23) hour = 23;
        if (minute > 59) minute = 59;
        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }

    // Format 4 chữ số liền: 1700 -> 17:00, 0830 -> 08:30
    const match4Digits = s.match(/^(\d{2})(\d{2})$/);
    if (match4Digits) {
        let hour = parseInt(match4Digits[1], 10);
        let minute = parseInt(match4Digits[2], 10);
        if (hour > 23) hour = 23;
        if (minute > 59) minute = 59;
        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }

    // Format 3 chữ số liền: 830 -> 08:30, 915 -> 09:15
    const match3Digits = s.match(/^(\d{1})(\d{2})$/);
    if (match3Digits) {
        let hour = parseInt(match3Digits[1], 10);
        let minute = parseInt(match3Digits[2], 10);
        if (hour > 23) hour = 23;
        if (minute > 59) minute = 59;
        return `0${hour}:${String(minute).padStart(2, '0')}`;
    }

    // Format 8H, 8h, 8 -> 08:00
    const matchSimpleH = s.match(/^(\d{1,2})\s*[hH]$/i) || s.match(/^(\d{1,2})$/);
    if (matchSimpleH) {
        let hour = parseInt(matchSimpleH[1], 10);
        if (hour > 23) hour = 23;
        return `${String(hour).padStart(2, '0')}:00`;
    }
    // Format 8H30, 8h30, 16H30 -> 08:30, 16:30
    const matchHMinute = s.match(/^(\d{1,2})\s*[hH]\s*(\d{1,2})$/i);
    if (matchHMinute) {
        let hour = parseInt(matchHMinute[1], 10);
        let minute = parseInt(matchHMinute[2], 10);
        if (hour > 23) hour = 23;
        if (minute > 59) minute = 59;
        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }

    // Format khi gõ kèm dấu hai chấm: "8:" -> 08:00, "17:" -> 17:00
    const matchHColon = s.match(/^(\d{1,2}):$/);
    if (matchHColon) {
        let hour = parseInt(matchHColon[1], 10);
        if (hour > 23) hour = 23;
        return `${String(hour).padStart(2, '0')}:00`;
    }

    return s;
}

function formatAndValidate24hTimeInput(inputEl) {
    if (!inputEl) return;
    const raw = inputEl.value.trim();
    if (!raw) return;
    const formatted = formatTimeString(raw);
    if (formatted && /^([01]\d|2[0-3]):[0-5]\d$/.test(formatted)) {
        inputEl.value = formatted;
    }
}

function handle24hTimeInputMask(e) {
    const input = e.target;
    let val = input.value.replace(/[^\d:]/g, '');
    if (val.length === 2 && !val.includes(':') && e.inputType !== 'deleteContentBackward') {
        val = val + ':';
    }
    if (val.length > 5) {
        val = val.slice(0, 5);
    }
    input.value = val;
}

function attach24hTimeInput(inputEl) {
    if (!inputEl || inputEl.dataset.has24hTimeMask) return;
    inputEl.dataset.has24hTimeMask = 'true';
    inputEl.setAttribute('autocomplete', 'off');
    inputEl.setAttribute('inputmode', 'numeric');
    inputEl.setAttribute('maxlength', '5');

    inputEl.addEventListener('input', handle24hTimeInputMask);
    inputEl.addEventListener('blur', function() {
        const prev = this.value;
        formatAndValidate24hTimeInput(this);
        if (this.value !== prev) {
            this.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });
}

function initAll24hTimeInputs() {
    document.querySelectorAll('input[data-time-24h="true"]').forEach(attach24hTimeInput);
}

document.addEventListener('DOMContentLoaded', () => {
    initAll24hTimeInputs();
});
function setTripLoadTime(timeStr) {
    const el = document.getElementById('inp-load-time');
    if (el) {
        el.value = timeStr;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

function setBookingLoadingTime(timeStr) {
    const el = document.getElementById('booking-loading-time');
    if (el) {
        el.value = timeStr;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

function setFullpageBookingLoadingTime(timeStr) {
    const el = document.getElementById('fullpage-booking-loading-time');
    if (el) {
        el.value = timeStr;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

function setFullpageBookingClosingTime(timeStr) {
    const el = document.getElementById('fullpage-booking-closing-time-val');
    if (el) {
        el.value = timeStr;
        if (typeof syncFullpageBookingClosingTime === 'function') syncFullpageBookingClosingTime();
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

function setFullpageBookingSiTime(timeStr) {
    const el = document.getElementById('fullpage-booking-si-time-val');
    if (el) {
        el.value = timeStr;
        if (typeof syncFullpageBookingSiTime === 'function') syncFullpageBookingSiTime();
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }
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


window.formatTimeString = formatTimeString;
window.formatAndValidate24hTimeInput = formatAndValidate24hTimeInput;
window.attach24hTimeInput = attach24hTimeInput;
window.initAll24hTimeInputs = initAll24hTimeInputs;
window.setTripLoadTime = setTripLoadTime;
window.setBookingLoadingTime = setBookingLoadingTime;
window.setFullpageBookingLoadingTime = setFullpageBookingLoadingTime;
window.setFullpageBookingClosingTime = setFullpageBookingClosingTime;
window.setFullpageBookingSiTime = setFullpageBookingSiTime;

// ==========================================
// BIM 24-HOUR INTERACTIVE TIME PICKER SYSTEM
// ==========================================
let currentBim24hTarget = null;
let currentBim24hHour = '17';
let currentBim24hMinute = '00';

function initBim24hTimePickerDOM() {
    const hContainer = document.getElementById('bim-tp-hours-list');
    if (hContainer && hContainer.children.length === 0) {
        let htmlH = '';
        for (let i = 0; i <= 23; i++) {
            const val = String(i).padStart(2, '0');
            htmlH += '<button type="button" data-val="' + val + '" onclick="selectBim24hHour(\'' + val + '\')" class="w-full py-1 text-xs font-mono font-semibold rounded-lg hover:bg-teal-50 hover:text-teal-800 transition-colors">' + val + '</button>';
        }
        hContainer.innerHTML = htmlH;
    }

    const mContainer = document.getElementById('bim-tp-minutes-list');
    if (mContainer && mContainer.children.length === 0) {
        let htmlM = '';
        for (let i = 0; i < 60; i += 5) {
            const val = String(i).padStart(2, '0');
            htmlM += '<button type="button" data-val="' + val + '" onclick="selectBim24hMinute(\'' + val + '\')" class="w-full py-1 text-xs font-mono font-semibold rounded-lg hover:bg-teal-50 hover:text-teal-800 transition-colors">' + val + '</button>';
        }
        htmlM += '<button type="button" data-val="59" onclick="selectBim24hMinute(\'59\')" class="w-full py-1 text-xs font-mono font-semibold rounded-lg hover:bg-teal-50 hover:text-teal-800 transition-colors">59</button>';
        mContainer.innerHTML = htmlM;
    }
}

function openBim24hTimePicker(targetInput, event) {
    if (event) {
        event.stopPropagation();
    }
    if (!targetInput) return;
    currentBim24hTarget = targetInput;

    const popover = document.getElementById('bim-24h-timepicker-popover');
    if (!popover) return;

    initBim24hTimePickerDOM();

    let val = targetInput.value ? targetInput.value.trim() : '17:00';
    const match = val.match(/^(\d{1,2}):(\d{2})/);
    if (match) {
        currentBim24hHour = String(parseInt(match[1], 10)).padStart(2, '0');
        currentBim24hMinute = String(parseInt(match[2], 10)).padStart(2, '0');
    } else {
        currentBim24hHour = '17';
        currentBim24hMinute = '00';
    }

    updateBim24hPickerActiveState();

    const rect = targetInput.getBoundingClientRect();
    const popoverWidth = 260;
    const popoverHeight = 330;

    let left = rect.left;
    if (left + popoverWidth > window.innerWidth) {
        left = window.innerWidth - popoverWidth - 10;
    }
    if (left < 10) left = 10;

    let top = rect.bottom + 6;
    if (top + popoverHeight > window.innerHeight) {
        top = Math.max(10, rect.top - popoverHeight - 6);
    }

    popover.style.left = left + 'px';
    popover.style.top = top + 'px';
    popover.classList.remove('hidden');

    setTimeout(() => {
        const activeH = document.querySelector('#bim-tp-hours-list button[data-val="' + currentBim24hHour + '"]');
        if (activeH) activeH.scrollIntoView({ block: 'center', behavior: 'auto' });
        const activeM = document.querySelector('#bim-tp-minutes-list button[data-val="' + currentBim24hMinute + '"]');
        if (activeM) activeM.scrollIntoView({ block: 'center', behavior: 'auto' });
    }, 50);
}

function selectBim24hHour(hourStr) {
    currentBim24hHour = hourStr;
    updateBim24hPickerActiveState();
    applyCurrentBim24hTimeToTarget(false);
}

function selectBim24hMinute(minuteStr) {
    currentBim24hMinute = minuteStr;
    updateBim24hPickerActiveState();
    applyCurrentBim24hTimeToTarget(false);
}

function setBim24hPickerTime(hourStr, minuteStr) {
    currentBim24hHour = hourStr;
    currentBim24hMinute = minuteStr;
    updateBim24hPickerActiveState();
    applyCurrentBim24hTimeToTarget(true);
}

function setBim24hPickerNow() {
    const now = new Date();
    currentBim24hHour = String(now.getHours()).padStart(2, '0');
    currentBim24hMinute = String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, '0');
    updateBim24hPickerActiveState();
    applyCurrentBim24hTimeToTarget(false);
}

function updateBim24hPickerActiveState() {
    const display = document.getElementById('bim-tp-display');
    if (display) display.textContent = currentBim24hHour + ':' + currentBim24hMinute;

    document.querySelectorAll('#bim-tp-hours-list button').forEach(b => {
        if (b.dataset.val === currentBim24hHour) {
            b.className = 'w-full py-1 text-xs font-mono font-bold rounded-lg bg-teal-700 text-white shadow-xs';
        } else {
            b.className = 'w-full py-1 text-xs font-mono font-semibold rounded-lg hover:bg-slate-100 text-slate-700 transition-colors';
        }
    });

    document.querySelectorAll('#bim-tp-minutes-list button').forEach(b => {
        if (b.dataset.val === currentBim24hMinute) {
            b.className = 'w-full py-1 text-xs font-mono font-bold rounded-lg bg-teal-700 text-white shadow-xs';
        } else {
            b.className = 'w-full py-1 text-xs font-mono font-semibold rounded-lg hover:bg-slate-100 text-slate-700 transition-colors';
        }
    });
}

function applyCurrentBim24hTimeToTarget(autoClose = false) {
    if (currentBim24hTarget) {
        currentBim24hTarget.value = currentBim24hHour + ':' + currentBim24hMinute;
        currentBim24hTarget.dispatchEvent(new Event('input', { bubbles: true }));
        currentBim24hTarget.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (autoClose) {
        closeBim24hTimePicker();
    }
}

function confirmBim24hTimePicker() {
    applyCurrentBim24hTimeToTarget(true);
}

function closeBim24hTimePicker() {
    const popover = document.getElementById('bim-24h-timepicker-popover');
    if (popover) popover.classList.add('hidden');
    currentBim24hTarget = null;
}

// Global click outside listener for Time Picker popover
document.addEventListener('click', (e) => {
    const popover = document.getElementById('bim-24h-timepicker-popover');
    if (popover && !popover.classList.contains('hidden')) {
        if (!popover.contains(e.target) && !e.target.closest('[data-time-picker-24h="true"]') && !e.target.closest('button[onclick*="openBim24hTimePicker"]')) {
            closeBim24hTimePicker();
        }
    }
});

// ESC key to close
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeBim24hTimePicker();
    }
});


window.openBim24hTimePicker = openBim24hTimePicker;
window.closeBim24hTimePicker = closeBim24hTimePicker;
window.selectBim24hHour = selectBim24hHour;
window.selectBim24hMinute = selectBim24hMinute;
window.setBim24hPickerTime = setBim24hPickerTime;
window.setBim24hPickerNow = setBim24hPickerNow;
window.confirmBim24hTimePicker = confirmBim24hTimePicker;

