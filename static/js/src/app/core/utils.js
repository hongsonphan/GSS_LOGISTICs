// Global Debounce Utility (Supports inline: oninput="debounce(fn, wait)()")
const _debounceNamedTimers = {};
function debounce(func, wait = 300) {
    return function(...args) {
        const key = func.name || func.toString();
        if (_debounceNamedTimers[key]) {
            clearTimeout(_debounceNamedTimers[key]);
        }
        _debounceNamedTimers[key] = setTimeout(() => {
            try {
                func.apply(this, args);
            } catch (err) {
                console.error('[Debounce Execution Error]', err);
            }
            delete _debounceNamedTimers[key];
        }, wait);
    };
}
window.debounce = debounce;

// Global Currency Formatter for Inputs
function formatCurrencyInput(el) {
    if (!el) return;
    const rawVal = String(el.value).replace(/\D/g, '');
    if (!rawVal) {
        el.value = '';
        return;
    }
    const num = parseInt(rawVal, 10);
    el.value = new Intl.NumberFormat('vi-VN').format(num);
}
window.formatCurrencyInput = formatCurrencyInput;

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
 * Chuẩn hóa chuỗi ngày tháng từ bất kỳ định dạng nào (DD/MM/YYYY, ISO, Date) sang chuẩn YYYY-MM-DD
 * để gán an toàn vào input[type="date"] và gửi chuẩn RFC/ISO lên DRF backend.
 */
function normalizeDateToISO(dateStr) {
    if (!dateStr) return '';
    dateStr = String(dateStr).trim();
    if (!dateStr) return '';
    // Nếu đã là YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    // Nếu là YYYY-MM-DDTHH:mm:ss...
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.substring(0, 10);
    // Nếu là DD/MM/YYYY hoặc DD-MM-YYYY hoặc DD.MM.YYYY
    const dmyMatch = dateStr.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
    if (dmyMatch) {
        const day = dmyMatch[1].padStart(2, '0');
        const month = dmyMatch[2].padStart(2, '0');
        const year = dmyMatch[3];
        return `${year}-${month}-${day}`;
    }
    // Thử parse qua Date
    try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        }
    } catch (e) {}
    return dateStr;
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

function formatDateVN(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    } catch (e) {
        return dateStr;
    }
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

// Định dạng mã công việc & tên người (dùng chung cho Dashboard và Cộng tác)
function formatTaskCode(code) {
    if (!code) return '';
    const match = String(code).match(/^TSK[-.](\d{6})[-.]0*(\d+)$/i);
    if (match) {
        return `TSK.${match[1]}.${String(parseInt(match[2], 10)).padStart(3, '0')}`;
    }
    return code;
}
window.formatTaskCode = formatTaskCode;

function cleanPersonName(name) {
    if (!name) return '';
    return String(name).replace(/\s*\([^)]*\)/g, '').trim() || name;
}
window.cleanPersonName = cleanPersonName;
