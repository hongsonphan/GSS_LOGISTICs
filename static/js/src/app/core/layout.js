// --- USER PROFILE & AVATAR DROPDOWN HANDLERS (TÁI CẤU TRÚC GIAO DIỆN TOPBAR) ---
function toggleUserDropdown(e) {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }
    const menu = document.getElementById('topbar-user-menu');
    const caret = document.getElementById('topbar-user-caret');
    if (!menu) return;

    // Đóng dropdown bộ chọn kỳ nếu đang mở
    const periodMenu = document.getElementById('topbar-period-menu');
    if (periodMenu) periodMenu.classList.add('hidden');
    const periodPopover = document.getElementById('topbar-custom-date-popover');
    if (periodPopover) periodPopover.classList.add('hidden');

    const isHidden = menu.classList.contains('hidden');
    if (isHidden) {
        menu.classList.remove('hidden');
        if (caret) caret.classList.add('rotate-180');
    } else {
        menu.classList.add('hidden');
        if (caret) caret.classList.remove('rotate-180');
    }
}
window.toggleUserDropdown = toggleUserDropdown;

function closeUserDropdown() {
    const menu = document.getElementById('topbar-user-menu');
    const caret = document.getElementById('topbar-user-caret');
    if (menu) menu.classList.add('hidden');
    if (caret) caret.classList.remove('rotate-180');
}
window.closeUserDropdown = closeUserDropdown;


// --- MODAL CÀI ĐẶT HỒ SƠ & TÀI KHOẢN CÁ NHÂN (USER PROFILE SETTINGS) ---
let isProfileEditMode = false;
let originalProfileData = {};

function setProfileEditMode(isEdit) {
    isProfileEditMode = isEdit;

    const modal = document.getElementById('modal-profile-settings');
    if (!modal) return;

    const badge = document.getElementById('profile-mode-badge');
    const toggleBtn = document.getElementById('btn-toggle-edit-profile');
    const toggleIcon = document.getElementById('icon-toggle-edit-profile');
    const toggleText = document.getElementById('text-toggle-edit-profile');
    const saveBtn = document.getElementById('btn-save-profile');
    const inputs = modal.querySelectorAll('.profile-input');

    if (isEdit) {
        // --- CHẾ ĐỘ CHỈNH SỬA: Ô NHẬP MỞ KHÓA, NÚT SỬA ĐỔI THÀNH HỦY, NÚT LƯU KÍCH HOẠT ---
        if (badge) {
            badge.innerText = 'Đang chỉnh sửa';
            badge.className = 'text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200';
        }

        inputs.forEach(input => {
            input.disabled = false;
            input.classList.remove('bg-slate-100/70', 'cursor-not-allowed', 'text-slate-700');
            input.classList.add('bg-slate-50', 'text-slate-900', 'cursor-text');
        });

        if (toggleBtn) {
            toggleBtn.className = 'px-4 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1.5';
            toggleBtn.title = 'Hủy bỏ các thay đổi và không lưu';
        }
        if (toggleIcon) toggleIcon.className = 'ph-bold ph-x text-sm';
        if (toggleText) toggleText.innerText = 'Hủy';

        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.className = 'px-5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 active:scale-95 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer';
            saveBtn.title = 'Lưu các thông tin đã thay đổi';
        }

        const fullnameInput = document.getElementById('profile-fullname');
        if (fullnameInput) fullnameInput.focus();

    } else {
        // --- CHẾ ĐỘ CHỈ XEM: Ô NHẬP KHÓA, NÚT SỬA SÁNG LÊN, NÚT LƯU DISABLE ---
        if (badge) {
            badge.innerText = 'Chế độ chỉ xem';
            badge.className = 'text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600 border border-slate-200';
        }

        inputs.forEach(input => {
            input.disabled = true;
            input.classList.remove('bg-slate-50', 'text-slate-900', 'cursor-text');
            input.classList.add('bg-slate-100/70', 'cursor-not-allowed', 'text-slate-700');
        });

        if (toggleBtn) {
            toggleBtn.className = 'px-4 py-2 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100/80 border border-teal-300 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1.5';
            toggleBtn.title = 'Bấm để cho phép chỉnh sửa thông tin';
        }
        if (toggleIcon) toggleIcon.className = 'ph-bold ph-pencil-simple text-sm';
        if (toggleText) toggleText.innerText = 'Sửa';

        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.className = 'px-5 py-2 text-xs font-bold text-slate-400 bg-slate-100 border border-slate-200 rounded-xl cursor-not-allowed opacity-60 flex items-center gap-1.5 transition-all';
            saveBtn.title = 'Chỉ có thể lưu khi đang ở chế độ chỉnh sửa';
        }
    }
}
window.setProfileEditMode = setProfileEditMode;

function handleProfileEditCancelClick() {
    if (!isProfileEditMode) {
        setProfileEditMode(true);
    } else {
        cancelProfileEdit();
    }
}
window.handleProfileEditCancelClick = handleProfileEditCancelClick;

function cancelProfileEdit() {
    // Khôi phục giá trị ban đầu và không lưu
    const fullnameInput = document.getElementById('profile-fullname');
    if (fullnameInput && originalProfileData.fullname !== undefined) {
        fullnameInput.value = originalProfileData.fullname;
    }
    const emailInput = document.getElementById('profile-email');
    if (emailInput && originalProfileData.email !== undefined) {
        emailInput.value = originalProfileData.email;
    }
    const phoneInput = document.getElementById('profile-phone');
    if (phoneInput && originalProfileData.phone !== undefined) {
        phoneInput.value = originalProfileData.phone;
    }

    const oldPass = document.getElementById('profile-old-password');
    if (oldPass) oldPass.value = '';
    const newPass = document.getElementById('profile-new-password');
    if (newPass) newPass.value = '';
    const confirmPass = document.getElementById('profile-confirm-password');
    if (confirmPass) confirmPass.value = '';

    const alertBox = document.getElementById('profile-settings-alert');
    if (alertBox) {
        alertBox.className = 'hidden p-3 rounded-xl text-xs font-semibold';
        alertBox.innerHTML = '';
    }

    setProfileEditMode(false);
}
window.cancelProfileEdit = cancelProfileEdit;

async function openProfileSettingsModal() {
    closeUserDropdown();
    const modal = document.getElementById('modal-profile-settings');
    if (!modal) return;

    // Reset alert & password fields
    const alertBox = document.getElementById('profile-settings-alert');
    if (alertBox) {
        alertBox.className = 'hidden p-3 rounded-xl text-xs font-semibold';
        alertBox.innerHTML = '';
    }
    const oldPass = document.getElementById('profile-old-password');
    if (oldPass) oldPass.value = '';
    const newPass = document.getElementById('profile-new-password');
    if (newPass) newPass.value = '';
    const confirmPass = document.getElementById('profile-confirm-password');
    if (confirmPass) confirmPass.value = '';

    // Khởi tạo ở Chế độ chỉ xem mặc định
    setProfileEditMode(false);

    // Lấy thông tin mới nhất từ API /api/auth/me/
    try {
        const res = await fetchWithAuth('/api/auth/me/');
        if (res && res.ok) {
            const data = await res.json();
            const usernameInput = document.getElementById('profile-username');
            if (usernameInput && data.username) usernameInput.value = data.username;
            const fullnameInput = document.getElementById('profile-fullname');
            const fetchedName = (data.employee && data.employee.full_name) ? data.employee.full_name : (data.first_name || data.username);
            if (fullnameInput) fullnameInput.value = fetchedName;
            const emailInput = document.getElementById('profile-email');
            const fetchedEmail = data.email || '';
            if (emailInput) emailInput.value = fetchedEmail;
            const phoneInput = document.getElementById('profile-phone');
            const fetchedPhone = (data.employee && data.employee.phone_number) ? data.employee.phone_number : '';
            if (phoneInput) phoneInput.value = fetchedPhone;

            originalProfileData = {
                fullname: fetchedName,
                email: fetchedEmail,
                phone: fetchedPhone
            };
        }
    } catch (err) {
        console.warn('Lỗi tải dữ liệu profile me:', err);
    }

    modal.classList.remove('hidden');
}
window.openProfileSettingsModal = openProfileSettingsModal;

function closeProfileSettingsModal() {
    cancelProfileEdit();
    const modal = document.getElementById('modal-profile-settings');
    if (modal) modal.classList.add('hidden');
}
window.closeProfileSettingsModal = closeProfileSettingsModal;

async function submitProfileSettingsForm(e) {
    if (e) e.preventDefault();
    if (!isProfileEditMode) return;

    const alertBox = document.getElementById('profile-settings-alert');
    const saveBtn = document.getElementById('btn-save-profile');
    const fullname = document.getElementById('profile-fullname')?.value.trim();
    const email = document.getElementById('profile-email')?.value.trim();
    const phone = document.getElementById('profile-phone')?.value.trim();
    const oldPassword = document.getElementById('profile-old-password')?.value;
    const newPassword = document.getElementById('profile-new-password')?.value;
    const confirmPassword = document.getElementById('profile-confirm-password')?.value;

    if (!fullname) {
        if (alertBox) {
            alertBox.className = 'p-3 rounded-xl text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700';
            alertBox.innerText = 'Vui lòng nhập họ và tên.';
            alertBox.classList.remove('hidden');
        }
        return;
    }

    if (newPassword || oldPassword) {
        if (!oldPassword) {
            if (alertBox) {
                alertBox.className = 'p-3 rounded-xl text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700';
                alertBox.innerText = 'Vui lòng nhập mật khẩu hiện tại để đổi mật khẩu mới.';
                alertBox.classList.remove('hidden');
            }
            return;
        }
        if (newPassword.length < 6) {
            if (alertBox) {
                alertBox.className = 'p-3 rounded-xl text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700';
                alertBox.innerText = 'Mật khẩu mới phải có tối thiểu 6 ký tự.';
                alertBox.classList.remove('hidden');
            }
            return;
        }
        if (newPassword !== confirmPassword) {
            if (alertBox) {
                alertBox.className = 'p-3 rounded-xl text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700';
                alertBox.innerText = 'Mật khẩu xác nhận không khớp với mật khẩu mới.';
                alertBox.classList.remove('hidden');
            }
            return;
        }
    }

    const payload = {
        full_name: fullname,
        email: email,
        phone_number: phone
    };
    if (newPassword && oldPassword) {
        payload.old_password = oldPassword;
        payload.new_password = newPassword;
    }

    try {
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="ph ph-spinner animate-spin text-sm"></i> Đang lưu...';
        }

        const res = await fetchWithAuth('/api/auth/me/', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Không thể lưu cài đặt hồ sơ.');
        }

        // Cập nhật giao diện động tức thì
        const updatedUser = data.user || {};
        if (updatedUser.full_name) {
            originalProfileData.fullname = updatedUser.full_name;
            const ddName = document.getElementById('topbar-dropdown-fullname');
            if (ddName) ddName.innerText = updatedUser.full_name;
            const valName = document.getElementById('topbar-profile-val-name');
            if (valName) valName.innerText = updatedUser.full_name;
            const topbarBtn = document.querySelector('#topbar-user-menu-btn .lg\\:flex span.font-bold');
            if (topbarBtn) topbarBtn.innerText = updatedUser.full_name;
        }
        if (updatedUser.email !== undefined) {
            originalProfileData.email = updatedUser.email || '';
            const ddEmail = document.getElementById('topbar-profile-val-email');
            if (ddEmail) {
                ddEmail.innerText = updatedUser.email || 'Chưa cập nhật';
                ddEmail.title = updatedUser.email || 'Chưa cập nhật';
            }
        }
        if (updatedUser.phone_number !== undefined) {
            originalProfileData.phone = updatedUser.phone_number || '';
        }

        if (typeof showToast === 'function') {
            showToast('success', data.message || 'Đã cập nhật cài đặt hồ sơ cá nhân thành công!', 'Hồ Sơ Cá Nhân');
        }

        setProfileEditMode(false);
        closeProfileSettingsModal();

    } catch (err) {
        if (alertBox) {
            alertBox.className = 'p-3 rounded-xl text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700';
            alertBox.innerText = err.message || 'Đã xảy ra lỗi khi lưu thông tin.';
            alertBox.classList.remove('hidden');
        }
    } finally {
        if (saveBtn) {
            saveBtn.disabled = !isProfileEditMode;
            saveBtn.innerHTML = '<i class="ph-bold ph-floppy-disk text-sm"></i> <span>Lưu</span>';
        }
    }
}
window.submitProfileSettingsForm = submitProfileSettingsForm;

// Close dropdown and popover on click outside
document.addEventListener('click', (e) => {
    const container = document.getElementById('dashboard-period-dropdown-container');
    const menu = document.getElementById('topbar-period-menu');
    const popover = document.getElementById('topbar-custom-date-popover');
    if (container && !container.contains(e.target)) {
        if (menu) menu.classList.add('hidden');
        if (popover) popover.classList.add('hidden');
    }

    const userContainer = document.getElementById('topbar-user-dropdown-container');
    if (userContainer && !userContainer.contains(e.target)) {
        closeUserDropdown();
    }
});

// Close dropdown on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeUserDropdown();
        closeProfileSettingsModal();
    }
});

// =========================================================================
// TIỆN ÍCH GIAO DIỆN: ẨN / HIỆN SIDEBAR & BIỂU ĐỒ DASHBOARD
// =========================================================================

function syncSidebarUIState(isCollapsed) {
    const arrowIn = document.getElementById('icon-sidebar-arrow-in');
    const arrowOut = document.getElementById('icon-sidebar-arrow-out');
    const headerArrowIn = document.getElementById('icon-sidebar-header-arrow-in');
    const headerArrowOut = document.getElementById('icon-sidebar-header-arrow-out');
    const headerToggleBtn = document.getElementById('btn-sidebar-header-toggle');
    const topbarToggleBtn = document.getElementById('btn-toggle-sidebar');
    const backdrop = document.getElementById('sidebar-mobile-backdrop');

    if (arrowIn && arrowOut) {
        if (isCollapsed) {
            arrowIn.classList.add('hidden');
            arrowOut.classList.remove('hidden');
            if (topbarToggleBtn) topbarToggleBtn.title = "Mở rộng thanh điều hướng Sidebar";
        } else {
            arrowIn.classList.remove('hidden');
            arrowOut.classList.add('hidden');
            if (topbarToggleBtn) topbarToggleBtn.title = "Thu gọn / Ẩn Sidebar";
        }
    }

    if (headerArrowIn && headerArrowOut) {
        if (isCollapsed) {
            // Khi đang ở chế độ hide: Nút trên sidebar hiển thị mũi tên hướng ra (phải) để bấm ghim mở cố định
            headerArrowIn.classList.add('hidden');
            headerArrowOut.classList.remove('hidden');
            if (headerToggleBtn) headerToggleBtn.title = "Ghim mở cố định Sidebar";
        } else {
            // Khi đang mở cố định: Nút trên sidebar hiển thị mũi tên hướng vô (trái) để bấm thu gọn
            headerArrowIn.classList.remove('hidden');
            headerArrowOut.classList.add('hidden');
            if (headerToggleBtn) headerToggleBtn.title = "Thu gọn / Ẩn Sidebar";
        }
    }

    if (backdrop) {
        if (isCollapsed || window.innerWidth >= 1024) {
            backdrop.classList.add('hidden');
        } else {
            backdrop.classList.remove('hidden');
        }
    }
}

function collapseSidebar(savePreference = true) {
    const sidebar = document.querySelector('.app-sidebar');
    if (!sidebar) return;
    sidebar.classList.remove('sidebar-peek');
    sidebar.classList.add('collapsed');
    syncSidebarUIState(true);
    // CHỈ lưu preference trên Desktop (>= 1024px) khi người dùng chủ động chọn
    if (savePreference && window.innerWidth >= 1024) {
        try {
            localStorage.setItem('bim_sidebar_collapsed', 'true');
        } catch (e) {}
    }
}
window.collapseSidebar = collapseSidebar;

function expandSidebar(savePreference = true) {
    const sidebar = document.querySelector('.app-sidebar');
    if (!sidebar) return;
    sidebar.classList.remove('sidebar-peek');
    sidebar.classList.remove('collapsed');
    syncSidebarUIState(false);
    // CHỈ lưu preference trên Desktop (>= 1024px) khi người dùng chủ động chọn
    if (savePreference && window.innerWidth >= 1024) {
        try {
            localStorage.setItem('bim_sidebar_collapsed', 'false');
        } catch (e) {}
    }
}
window.expandSidebar = expandSidebar;

/**
 * Chuẩn hóa trạng thái Sidebar tập trung duy nhất từ localStorage (Bim_ERP Standard):
 * - Nếu là Mobile / Tablet (< 1024px): Mặc định luôn thu gọn drawer, không lưu đè preference desktop.
 * - Nếu là Desktop (>= 1024px):
 *   + bim_sidebar_collapsed === 'true': Ở trạng thái Hide (collapsed), hỗ trợ Hover Peek.
 *   + bim_sidebar_collapsed !== 'true': Luôn ở trạng thái Mở Rộng (unhide) ở tất cả màn hình.
 */
function applySidebarStateFromStorage() {
    const sidebar = document.querySelector('.app-sidebar');
    if (!sidebar) return;

    if (window.innerWidth < 1024) {
        collapseSidebar(false);
        return;
    }

    let isCollapsed = false;
    try {
        isCollapsed = (localStorage.getItem('bim_sidebar_collapsed') === 'true');
    } catch (e) {
        isCollapsed = false;
    }

    if (isCollapsed) {
        collapseSidebar(false);
    } else {
        expandSidebar(false);
    }
}
window.applySidebarStateFromStorage = applySidebarStateFromStorage;

function toggleSidebar() {
    const sidebar = document.querySelector('.app-sidebar');
    if (!sidebar) return;

    const isPeek = sidebar.classList.contains('sidebar-peek');
    sidebar.classList.remove('sidebar-peek');

    // Trên thiết bị di động (< 1024px): Đóng mở drawer đơn thuần, không ghi đè localStorage của desktop
    if (window.innerWidth < 1024) {
        if (sidebar.classList.contains('collapsed')) {
            expandSidebar(false);
        } else {
            collapseSidebar(false);
        }
        return;
    }

    // Trên Desktop (>= 1024px):
    // Nếu đang ở chế độ Peek (hover khi đang hide): Bấm vào nút có nghĩa là người dùng muốn GHIM MỞ CỐ ĐỊNH (Unhide)
    if (isPeek && sidebar.classList.contains('collapsed')) {
        expandSidebar(true);
        return;
    }

    // Toggle trạng thái và lưu cấu hình của người dùng
    if (sidebar.classList.contains('collapsed')) {
        expandSidebar(true);
    } else {
        collapseSidebar(true);
    }
}
window.toggleSidebar = toggleSidebar;

/**
 * Khởi tạo tính năng Hover Peek cho Sidebar trên Desktop (Bim_ERP Standard):
 * - Khi sidebar đang ở trạng thái Hide (collapsed):
 *   Quơ con chuột vào nút hide (hình) sẽ hiển thị sidebar ra dạng flyout để bấm chọn menu.
 * - Rời con chuột đi (khỏi nút và khỏi sidebar) -> sidebar tự động hide lại.
 * - Bấm vào bất kỳ mục menu nào trong sidebar -> chuyển trang và sidebar tự động hide lại.
 * - Không ảnh hưởng đến hành vi của mobile (<1024px) và thao tác click ghim cố định desktop.
 */
function initSidebarHoverPeek() {
    const btnToggle = document.getElementById('btn-toggle-sidebar');
    const sidebar = document.querySelector('.app-sidebar');
    if (!btnToggle || !sidebar) return;

    let peekTimer = null;
    let isOverTrigger = false;
    let isOverSidebar = false;

    const canHover = () => window.innerWidth >= 1024 && window.matchMedia('(hover: hover)').matches;

    const showPeek = () => {
        if (!canHover()) return;
        // Chỉ kích hoạt khi sidebar đang ở trạng thái hide (collapsed)
        if (!sidebar.classList.contains('collapsed')) return;

        if (peekTimer) {
            clearTimeout(peekTimer);
            peekTimer = null;
        }
        sidebar.classList.add('sidebar-peek');
    };

    const scheduleHidePeek = () => {
        if (peekTimer) clearTimeout(peekTimer);
        peekTimer = setTimeout(() => {
            if (!isOverTrigger && !isOverSidebar) {
                sidebar.classList.remove('sidebar-peek');
            }
        }, 220); // 220ms debounce mượt mà, không bị giật
    };

    btnToggle.addEventListener('mouseenter', () => {
        if (!canHover()) return;
        isOverTrigger = true;
        showPeek();
    });

    btnToggle.addEventListener('mouseleave', () => {
        if (!canHover()) return;
        isOverTrigger = false;
        scheduleHidePeek();
    });

    sidebar.addEventListener('mouseenter', () => {
        if (!canHover()) return;
        isOverSidebar = true;
        if (peekTimer) {
            clearTimeout(peekTimer);
            peekTimer = null;
        }
    });

    sidebar.addEventListener('mouseleave', () => {
        if (!canHover()) return;
        isOverSidebar = false;
        scheduleHidePeek();
    });

    // Khi người dùng click vào bất kỳ menu nào trong sidebar: Tắt peek ngay (trừ nút toggle ghim)
    sidebar.querySelectorAll('a, button').forEach(el => {
        el.addEventListener('click', () => {
            if (el.id === 'btn-sidebar-header-toggle') return;
            if (sidebar.classList.contains('sidebar-peek')) {
                sidebar.classList.remove('sidebar-peek');
                isOverTrigger = false;
                isOverSidebar = false;
                if (peekTimer) clearTimeout(peekTimer);
            }
        });
    });
}
window.initSidebarHoverPeek = initSidebarHoverPeek;

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

    // Khởi tạo tính năng Hover Peek cho Desktop khi sidebar đang ở trạng thái Hide
    initSidebarHoverPeek();

    // Gắn sự kiện: Khi bấm vào bất kỳ menu nào trên Sidebar
    document.querySelectorAll('.app-sidebar .sidebar-item-main, .app-sidebar-header a').forEach(menuEl => {
        menuEl.addEventListener('click', () => {
            const sidebar = document.querySelector('.app-sidebar');
            if (sidebar && sidebar.classList.contains('sidebar-peek')) {
                sidebar.classList.remove('sidebar-peek');
            }
            if (window.innerWidth < 1024) {
                collapseSidebar(false);
            }
        });
    });

    // Áp dụng chuẩn hóa trạng thái Sidebar từ localStorage ngay khi nạp trang
    applySidebarStateFromStorage();

    // Lắng nghe thay đổi kích thước cửa sổ để chuyển đổi linh hoạt giữa Mobile drawer và Desktop state
    let sidebarResizeTimer = null;
    window.addEventListener('resize', () => {
        if (sidebarResizeTimer) clearTimeout(sidebarResizeTimer);
        sidebarResizeTimer = setTimeout(() => {
            applySidebarStateFromStorage();
        }, 150);
    });

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
