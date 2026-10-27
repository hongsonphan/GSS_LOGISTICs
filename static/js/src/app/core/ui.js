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

async function openModal(id, extraParam = null) { 
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden-view'); 
    initAllNumberInputs();
    if (el) initAllSearchableComboboxes(el);
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
    closeAllSearchableComboboxes();
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden-view'); 
    if (id === 'modal-ocr') resetOcr();
    if (id === 'modal-create-trip') clearBookingFileSelection();
    if (id === 'modal-booking') clearSaleBookingFileSelection();
}
