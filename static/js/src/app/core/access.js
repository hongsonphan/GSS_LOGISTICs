// ==============================================================================
// MA TRẬN PHÂN QUYỀN TRÊN GIAO DIỆN (máy chủ vẫn kiểm tra lại mọi thao tác)
// window.BIM_ACCESS = {phân hệ: [thao tác]} | null (tài khoản không có hồ sơ nhân viên: không áp dụng)
// - canAccess(module, action): kiểm tra nhanh
// - [data-access="module" | "module:action"]: ẩn phần tử khi không có quyền
// - Nút Tạo / Xoá / Xuất ở thanh công cụ và dòng bảng của từng phân hệ: tự ẩn khi không có quyền tương ứng
// ==============================================================================
(function () {
    function canAccess(module, action) {
        const cu = window.CURRENT_USER || {};
        if (cu.is_superuser) return true;
        const grants = window.BIM_ACCESS;
        if (!grants) return true;  // quy tắc cũ: để máy chủ quyết định
        return (grants[module] || []).includes(action || 'view');
    }
    window.canAccess = canAccess;

    const VIEW_MODULE = {
        'view-dieu-van': 'dispatch', 'view-trip-detail': 'dispatch', 'view-create-trip': 'dispatch', 'view-quyet-toan': 'accounting', 'view-settlement-voucher': 'accounting',
        'view-kinh-doanh': 'sales', 'view-quotation-detail': 'sales', 'view-booking-detail': 'sales',
        'view-xe-bai': 'fleet', 'view-hai-quan': 'customs', 'view-customs-form': 'customs',
        'view-nhan-su': 'hr', 'view-employee-form': 'hr', 'view-contract-detail': 'hr', 'view-payroll-slip-detail': 'payroll',
        'view-ke-toan': 'accounting', 'view-cash-voucher-detail': 'accounting', 'view-cai-dat': 'settings',
    };
    const SUBTAB_MODULE = {
        'subtab-acct-driver-advances': 'advances', 'subtab-acct-dispatcher-funds': 'advances', 'subtab-acct-ledger': 'ledger',
    };
    const RULES = [
        [/^\s*(open\w*Create\w*|openCreate\w*|create\w*Page|openNew\w*|openAdd\w*|add(Trip|Vehicle|Trailer|Employee|Customer|Booking|Quotation)\w*)\s*\(/, 'create'],
        [/^\s*(event\.stopPropagation\(\);\s*)?(confirmDelete\w*|delete\w*|remove(Trip|Vehicle|Trailer|Employee|Customer|Booking|Quotation|Voucher|Declaration)\w*)\s*\(/, 'delete'],
        [/^\s*(export\w*|download\w*Excel\w*)\s*\(/, 'export'],
    ];
    // Nút Sửa trong bảng Cài đặt (tab Công ty dùng quyền Sửa; tab khác cũng cần Sửa)
    const SETTINGS_EDIT_RULE = /^\s*(openEditMasterDataModal|openSubcontractorFleetModal)\s*\(/;

    function moduleOf(el) {
        // Trang Cài đặt: quyền theo tab đang mở (cfg_*)
        if (el.closest('#view-cai-dat') && typeof window.mdActiveModule === 'function') return window.mdActiveModule();
        const sub = el.closest('[id^="subtab-"]');
        if (sub && SUBTAB_MODULE[sub.id]) return SUBTAB_MODULE[sub.id];
        const view = el.closest('[id^="view-"]');
        return view ? VIEW_MODULE[view.id] : null;
    }

    function apply(root) {
        if (!window.BIM_ACCESS || (window.CURRENT_USER || {}).is_superuser) return;
        (root || document).querySelectorAll('[data-access]').forEach(el => {
            const [m, a] = el.getAttribute('data-access').split(':');
            if (!canAccess(m, a || 'view')) el.classList.add('hidden', 'acc-hidden');
        });
        (root || document).querySelectorAll('button[onclick], a[onclick]').forEach(el => {
            if (el.closest('form, [id^="modal-"], #m-sheet, [data-access-keep]')) return;
            const on = el.getAttribute('onclick') || '';
            if (SETTINGS_EDIT_RULE.test(on) && el.closest('#view-cai-dat')) {
                if (!canAccess(moduleOf(el), 'edit')) el.classList.add('acc-hidden');
                return;
            }
            const rule = RULES.find(([re]) => re.test(on));
            if (!rule) return;
            const mod = moduleOf(el);
            if (mod && !canAccess(mod, rule[1])) el.classList.add('acc-hidden');
        });
    }
    window.applyAccessRules = apply;

    // Tab đang mở bị ẩn do không có quyền -> mở tab đầu tiên còn được phép trong cùng thanh tab
    function openFirstAllowedTab() {
        document.querySelectorAll('button.acc-hidden.active, button.acc-hidden[aria-selected="true"]').forEach(btn => {
            const next = [...btn.parentElement.querySelectorAll('button[onclick]')].find(b => !b.classList.contains('acc-hidden') && !b.classList.contains('hidden'));
            if (next) next.click();
        });
    }
    window.openFirstAllowedTab = openFirstAllowedTab;

    // Sau khi chuyển phân hệ: nếu tab mặc định không được phép thì mở tab được phép đầu tiên
    if (typeof window.switchTab === 'function' && !window.switchTab.__accessWrapped) {
        const orig = window.switchTab;
        const wrapped = function () {
            const r = orig.apply(this, arguments);
            setTimeout(() => { apply(document); openFirstAllowedTab(); }, 60);
            return r;
        };
        wrapped.__accessWrapped = true;
        window.switchTab = wrapped;
    }

    let timer = 0;
    function init() {
        apply(document);
        setTimeout(openFirstAllowedTab, 0);
        if (typeof MutationObserver === 'function') {
            new MutationObserver(() => {
                if (timer) return;
                timer = setTimeout(() => { timer = 0; apply(document); }, 250);
            }).observe(document.body, { childList: true, subtree: true });
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
