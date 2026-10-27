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

function getCsrfToken() {
    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
    if (csrfMeta && csrfMeta.content) return csrfMeta.content;
    const match = document.cookie.match(/csrftoken=([^;]+)/);
    return match ? match[1] : '';
}
window.getCsrfToken = getCsrfToken;
window.getAuthHeaders = getAuthHeaders;

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
        if (res.status === 401 && !window._isRedirectingToLogin && !window.location.pathname.startsWith('/login')) {
            window._isRedirectingToLogin = true;
            console.warn('Phiên làm việc đã hết hạn. Đang chuyển hướng về trang đăng nhập...');
            if (typeof showToast === 'function') {
                showToast('Phiên làm việc đã hết hạn. Đang chuyển về trang đăng nhập...', 'warning');
            }
            setTimeout(() => {
                const nextParam = encodeURIComponent(window.location.pathname + window.location.search);
                window.location.href = `/login/?next=${nextParam}`;
            }, 800);
        }
    }
    return res;
}
