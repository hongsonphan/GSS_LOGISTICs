// ==============================================================================
// TRỢ NĂNG (WCAG 2.1 A/AA) — bổ sung tên truy cập cho phần tử sinh động, không đổi giao diện
// - <select> không có nhãn: lấy chữ của nhãn đứng trước / ô lọc / lựa chọn đầu tiên
// - Nút chỉ có biểu tượng: lấy title, nếu không có thì đoán theo biểu tượng
// - Khung cuộn ngang chứa bảng: cho phép dùng bàn phím (tabindex=0)
// ==============================================================================
(function () {
    const ICON_NAMES = {
        'ph-x': 'Đóng', 'ph-x-circle': 'Đóng', 'ph-trash': 'Xoá', 'ph-pencil-simple': 'Sửa', 'ph-pencil': 'Sửa',
        'ph-eye': 'Xem', 'ph-printer': 'In', 'ph-download-simple': 'Tải xuống', 'ph-arrows-clockwise': 'Làm mới',
        'ph-caret-left': 'Trang trước', 'ph-caret-right': 'Trang sau', 'ph-caret-double-left': 'Trang đầu',
        'ph-caret-double-right': 'Trang cuối', 'ph-plus': 'Thêm', 'ph-copy': 'Sao chép', 'ph-funnel': 'Bộ lọc',
        'ph-dots-three': 'Thao tác', 'ph-dots-three-vertical': 'Thao tác', 'ph-bell': 'Thông báo',
        'ph-chats-circle': 'Trò chuyện nội bộ', 'ph-list': 'Mở menu', 'ph-sidebar-simple': 'Thu gọn menu',
        'ph-arrow-left': 'Quay lại', 'ph-magnifying-glass': 'Tìm kiếm', 'ph-columns': 'Tùy chỉnh cột',
    };

    const clean = (t) => (t || '').replace(/\s+/g, ' ').replace(/^[-–\s]+|[-–\s]+$/g, '').trim();

    function hasName(el) {
        if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('title')) return true;
        if (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) return true;
        return !!el.closest('label');
    }

    function nameSelect(sel) {
        if (hasName(sel)) return;
        let text = '';
        const prev = sel.previousElementSibling;
        if (prev && /^(LABEL|SPAN|P|DIV)$/.test(prev.tagName) && !prev.querySelector('select, input, button')) text = clean(prev.textContent);
        if (!text && sel.parentElement) {
            const lab = sel.parentElement.querySelector(':scope > label, :scope > span');
            if (lab && lab !== sel) text = clean(lab.textContent);
        }
        if (!text && sel.options.length) text = clean(sel.options[0].textContent);
        if (text) sel.setAttribute('aria-label', text.slice(0, 80));
    }

    function nameButton(btn) {
        if (clean(btn.textContent) || hasName(btn)) return;
        const icon = btn.querySelector('i[class*="ph-"]');
        let text = '';
        if (icon) {
            const cls = [...icon.classList].find(c => ICON_NAMES[c]);
            if (cls) text = ICON_NAMES[cls];
        }
        if (text) btn.setAttribute('aria-label', text);
    }

    function scan(root) {
        root.querySelectorAll('select').forEach(nameSelect);
        root.querySelectorAll('button').forEach(nameButton);
        root.querySelectorAll('div.overflow-x-auto:not([tabindex])').forEach(d => {
            if (d.querySelector(':scope > table') && d.scrollWidth > d.clientWidth + 1) d.setAttribute('tabindex', '0');
        });
    }

    let timer = 0;
    function schedule() {
        if (timer) return;
        timer = setTimeout(() => { timer = 0; scan(document); }, 300);
    }

    function init() {
        scan(document);
        if (typeof MutationObserver === 'function') new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
