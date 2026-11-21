/**
 * GSS LOGISTICS — VIEWPORT AUTO-SCALE & DENSITY ENGINE (Enterprise SaaS Standard)
 * Tự động hiệu chỉnh tỷ lệ co giãn (CSS Zoom) theo kích thước màn hình
 * Hỗ trợ các dòng Laptop 12", 13", 14", 15.6" và Màn hình 21", 24", 27", 32"+
 * Ngoại trừ Mobile (< 1024px) để đảm bảo trải nghiệm cảm ứng di động.
 */

const GSS_SCALE_STORAGE_KEY = 'gss_viewport_scale_mode';
const GSS_BASE_DESKTOP_WIDTH = 1680; // Chuẩn tham chiếu màn 27" Full HD

let currentScaleMode = 'auto'; // 'auto' | '1.0' | '0.9' | '0.85' | '0.8' | '0.75'
let activeScaleRatio = 1.0;

function calculateAutoFitScale() {
    const width = window.innerWidth;
    // Dưới 1024px là mobile/tablet: không co giãn desktop zoom
    if (width < 1024) {
        return 1.0;
    }
    // Màn hình lớn >= 1680px (24" - 27"+): tỷ lệ chuẩn 100%
    if (width >= GSS_BASE_DESKTOP_WIDTH) {
        return 1.0;
    }
    // Laptops (1024px <= width < 1680px):
    // Tự động tính tỷ lệ co tỷ lệ thuận theo chiều rộng
    // Giới hạn trong khoảng 0.78 đến 1.0 để chữ luôn sắc nét
    const ratio = width / GSS_BASE_DESKTOP_WIDTH;
    const bounded = Math.max(0.78, Math.min(1.0, ratio));
    return Math.round(bounded * 100) / 100;
}

function applyViewportScale(scaleMode, persist) {
    if (persist === undefined) persist = true;

    if (scaleMode) {
        currentScaleMode = scaleMode;
    } else {
        try {
            currentScaleMode = localStorage.getItem(GSS_SCALE_STORAGE_KEY) || 'auto';
        } catch (e) {
            currentScaleMode = 'auto';
        }
    }

    if (persist) {
        try {
            localStorage.setItem(GSS_SCALE_STORAGE_KEY, currentScaleMode);
        } catch (e) {}
    }

    let targetZoom = 1.0;
    if (currentScaleMode === 'auto') {
        targetZoom = calculateAutoFitScale();
    } else {
        const parsed = parseFloat(currentScaleMode);
        targetZoom = isNaN(parsed) ? 1.0 : parsed;
    }

    // Đảm bảo an toàn không để zoom < 0.7 hoặc > 1.3
    targetZoom = Math.max(0.7, Math.min(1.3, targetZoom));
    activeScaleRatio = targetZoom;

    // 1. Áp dụng biến CSS toàn cục
    document.documentElement.style.setProperty('--gss-viewport-zoom', targetZoom);

    // 2. Áp dụng trực tiếp vào các container workspace chính
    const mainViews = document.getElementById('main-views');
    if (mainViews) {
        mainViews.style.zoom = targetZoom;
    }

    const vendorMain = document.getElementById('main-content');
    if (vendorMain && document.getElementById('vendor-app-shell')) {
        vendorMain.style.zoom = targetZoom;
    }

    // 3. Tự động thu gọn Sidebar trên laptop nhỏ nếu chưa có thiết lập cố định của người dùng
    if (window.innerWidth < 1440 && window.innerWidth >= 1024) {
        try {
            const hasUserPinned = localStorage.getItem('bim_sidebar_collapsed');
            if (hasUserPinned === null && typeof collapseSidebar === 'function') {
                collapseSidebar(false);
            }
        } catch (e) {}
    }

    // 4. Cập nhật nhãn và trạng thái trên UI Dropdown (nếu có trên Topbar)
    updateScaleUI();
}

function updateScaleUI() {
    const labels = document.querySelectorAll('#display-scale-label');
    const pct = Math.round(activeScaleRatio * 100);
    labels.forEach(label => {
        if (currentScaleMode === 'auto') {
            label.textContent = `Tự động (${pct}%)`;
        } else {
            label.textContent = `${pct}%`;
        }
    });

    // Cập nhật dấu tích check trong menu dropdown
    const checkItems = document.querySelectorAll('.scale-check-item');
    checkItems.forEach(item => {
        const val = item.getAttribute('data-scale');
        const checkIcon = item.querySelector('.scale-check-icon');
        if (val === currentScaleMode) {
            item.classList.add('bg-teal-50', 'text-teal-900', 'font-bold');
            if (checkIcon) checkIcon.classList.remove('hidden');
        } else {
            item.classList.remove('bg-teal-50', 'text-teal-900', 'font-bold');
            if (checkIcon) checkIcon.classList.add('hidden');
        }
    });
}

function setDisplayScale(mode) {
    applyViewportScale(mode, true);
    closeDisplayScaleDropdown();
}

function toggleDisplayScaleDropdown(e) {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }
    const menus = document.querySelectorAll('#display-scale-dropdown-menu');
    menus.forEach(menu => {
        const isHidden = menu.classList.contains('hidden');
        if (isHidden) {
            // Đóng các dropdown khác nếu đang mở
            if (typeof closeUserDropdown === 'function') closeUserDropdown();
            const notifMenu = document.getElementById('notification-dropdown-menu');
            if (notifMenu) notifMenu.classList.add('hidden');
            menu.classList.remove('hidden');
        } else {
            menu.classList.add('hidden');
        }
    });
}

function closeDisplayScaleDropdown() {
    const menus = document.querySelectorAll('#display-scale-dropdown-menu');
    menus.forEach(menu => menu.classList.add('hidden'));
}

// Khởi tạo và lắng nghe thay đổi kích thước cửa sổ
let scaleResizeTimer = null;
function initViewportScale() {
    applyViewportScale(null, false);

    window.addEventListener('resize', () => {
        clearTimeout(scaleResizeTimer);
        scaleResizeTimer = setTimeout(() => {
            if (currentScaleMode === 'auto') {
                applyViewportScale('auto', false);
            }
        }, 150);
    });

    // Đóng dropdown khi click ra ngoài
    document.addEventListener('click', (e) => {
        const containers = document.querySelectorAll('#topbar-scale-control-container, #vendor-scale-control-container');
        let clickedInside = false;
        containers.forEach(c => {
            if (c && c.contains(e.target)) clickedInside = true;
        });
        if (!clickedInside) {
            closeDisplayScaleDropdown();
        }
    });
}

// Khởi chạy sớm ngay khi script nạp
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initViewportScale);
} else {
    initViewportScale();
}

window.applyViewportScale = applyViewportScale;
window.setDisplayScale = setDisplayScale;
window.toggleDisplayScaleDropdown = toggleDisplayScaleDropdown;
window.closeDisplayScaleDropdown = closeDisplayScaleDropdown;
