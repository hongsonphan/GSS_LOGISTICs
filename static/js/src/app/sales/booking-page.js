// ==============================================================================
// 8.1. DEDICATED FULL-PAGE BOOKING VIEW (SALE & BOOKING | TẠO BOOKING)
// ==============================================================================
let fullpageBookingFilesList = [];
let fullpageBookingExistingDocs = [];
let currentActiveFullpageBooking = null;

function handleFullpageBookingFilesSelect(input) {
    if (!input || !input.files || input.files.length === 0) return;

    for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        if (file.size > 10 * 1024 * 1024) {
            showToast('warning', `File "${file.name}" vượt quá 10MB. Vui lòng chọn file nhẹ hơn.`, 'File Quá Dung Lượng');
            continue;
        }
        const isDuplicate = fullpageBookingFilesList.some(f => f.name === file.name && f.size === file.size);
        if (!isDuplicate) {
            fullpageBookingFilesList.push(file);
        }
    }
    input.value = '';
    renderFullpageBookingFilesList();
}

function removeFullpageBookingNewFile(index) {
    if (index >= 0 && index < fullpageBookingFilesList.length) {
        fullpageBookingFilesList.splice(index, 1);
        renderFullpageBookingFilesList();
    }
}

async function deleteFullpageBookingExistingDoc(docId) {
    const bookingId = document.getElementById('fullpage-booking-id')?.value;
    if (!bookingId || !docId) {
        fullpageBookingExistingDocs = fullpageBookingExistingDocs.filter(d => d.id !== docId);
        renderFullpageBookingFilesList();
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
        const res = await fetchWithAuth(`/api/bookings/${bookingId}/documents/${docId}/`, {
            method: 'DELETE'
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || data.error || 'Lỗi khi xóa tài liệu');

        fullpageBookingExistingDocs = fullpageBookingExistingDocs.filter(d => d.id !== docId);
        renderFullpageBookingFilesList();
        showToast('success', 'Đã xóa tài liệu đính kèm', 'Thành Công');
    } catch (err) {
        console.error('Lỗi xóa document:', err);
        showToast('error', err.message || 'Không thể xóa tài liệu đính kèm', 'Lỗi');
    }
}

function renderFullpageBookingFilesList() {
    const listArea = document.getElementById('fullpage-booking-order-files-list');
    const summary = document.getElementById('fullpage-booking-order-files-summary');
    if (!listArea) return;

    let itemsHtml = '';
    const totalCount = fullpageBookingExistingDocs.length + fullpageBookingFilesList.length;

    fullpageBookingExistingDocs.forEach(doc => {
        const isPdf = (doc.name || doc.url || '').toLowerCase().endsWith('.pdf');
        const docName = doc.name || doc.file_name || 'Tài liệu Booking';
        const docUrl = doc.url || doc.file_url || '#';
        const hasValidUrl = docUrl && docUrl !== '#';

        itemsHtml += `
            <div class="flex items-center justify-between p-2 rounded-lg bg-teal-50 hover:bg-teal-100/60 border border-teal-200 shadow-2xs text-xs transition-colors group">
                <a ${hasValidUrl ? `href="${docUrl}" target="_blank" rel="noopener noreferrer"` : ''} 
                   class="flex items-center space-x-2 truncate pr-2 flex-1 cursor-pointer no-underline" 
                   title="Nhấn để mở / tải file: ${docName}">
                    <i class="${isPdf ? 'ph-bold ph-file-pdf text-rose-600' : 'ph-bold ph-file-image text-teal-600'} text-base shrink-0 group-hover:scale-110 transition-transform"></i>
                    <div class="truncate">
                        <p class="font-bold text-teal-900 group-hover:text-teal-700 group-hover:underline truncate font-mono text-[11px]" title="${docName}">${docName}</p>
                        <span class="text-[10px] text-teal-700 font-medium">${doc.size_formatted ? `(${doc.size_formatted})` : '(Đã lưu)'} · <span class="text-teal-600 underline">Bấm để mở</span></span>
                    </div>
                </a>
                <div class="flex items-center space-x-1 shrink-0">
                    ${hasValidUrl ? `
                        <a href="${docUrl}" target="_blank" rel="noopener noreferrer" 
                            class="p-1.5 rounded-md text-teal-700 hover:text-white hover:bg-teal-600 transition-colors shadow-xs" title="Mở file trong tab mới">
                            <i class="ph-bold ph-arrow-square-out text-sm"></i>
                        </a>
                    ` : ''}
                    ${doc.id ? `
                        <button type="button" onclick="deleteFullpageBookingExistingDoc(${doc.id})" 
                            class="p-1.5 rounded-md text-rose-600 hover:text-white hover:bg-rose-600 transition-colors shadow-xs" title="Xóa tài liệu này">
                            <i class="ph-bold ph-trash text-sm"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    });

    fullpageBookingFilesList.forEach((file, idx) => {
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        const sizeKb = (file.size / 1024).toFixed(0);
        const sizeStr = file.size >= 1024 * 1024 ? `${sizeMb} MB` : `${sizeKb} KB`;
        let tempUrl = '';
        try {
            tempUrl = URL.createObjectURL(file);
        } catch (e) {
            tempUrl = '';
        }

        itemsHtml += `
            <div class="flex items-center justify-between p-2 rounded-lg bg-amber-50 hover:bg-amber-100/60 border border-amber-200 shadow-2xs text-xs transition-colors group">
                ${tempUrl ? `
                    <a href="${tempUrl}" target="_blank" rel="noopener noreferrer" 
                       class="flex items-center space-x-2 truncate pr-2 flex-1 cursor-pointer no-underline" 
                       title="Xem trước file: ${file.name}">
                        <i class="${isPdf ? 'ph-bold ph-file-pdf text-rose-600' : 'ph-bold ph-file-image text-amber-600'} text-base shrink-0 group-hover:scale-110 transition-transform"></i>
                        <div class="truncate">
                            <p class="font-bold text-amber-900 group-hover:text-amber-700 group-hover:underline truncate font-mono text-[11px]" title="${file.name}">${file.name}</p>
                            <span class="text-[10px] text-amber-700 font-semibold font-mono">(${sizeStr} - Chờ lưu) · <span class="underline">Xem trước</span></span>
                        </div>
                    </a>
                ` : `
                    <div class="flex items-center space-x-2 truncate pr-2 flex-1">
                        <i class="${isPdf ? 'ph-bold ph-file-pdf text-rose-600' : 'ph-bold ph-file-image text-amber-600'} text-base shrink-0"></i>
                        <div class="truncate">
                            <p class="font-bold text-amber-900 truncate font-mono text-[11px]" title="${file.name}">${file.name}</p>
                            <span class="text-[10px] text-amber-700 font-semibold font-mono">(${sizeStr} - Chờ lưu)</span>
                        </div>
                    </div>
                `}
                <div class="flex items-center space-x-1 shrink-0">
                    ${tempUrl ? `
                        <a href="${tempUrl}" target="_blank" rel="noopener noreferrer" 
                            class="p-1.5 rounded-md text-amber-700 hover:text-white hover:bg-amber-600 transition-colors shadow-xs" title="Xem trước file">
                            <i class="ph-bold ph-eye text-sm"></i>
                        </a>
                    ` : ''}
                    <button type="button" onclick="removeFullpageBookingNewFile(${idx})" 
                        class="p-1.5 rounded-md text-rose-600 hover:text-white hover:bg-rose-600 transition-colors shadow-xs shrink-0" title="Hủy tệp này">
                        <i class="ph-bold ph-x text-sm"></i>
                    </button>
                </div>
            </div>
        `;
    });

    listArea.innerHTML = itemsHtml;
    if (summary) {
        if (totalCount === 0) {
            summary.innerHTML = '<i class="ph ph-info text-teal-600"></i> Chưa có tệp nào được đính kèm';
            summary.className = 'text-xs text-slate-500 italic mb-2';
        } else {
            summary.innerHTML = `<i class="ph-bold ph-check-circle text-teal-600"></i> Đã chọn <strong>${totalCount}</strong> tệp đính kèm (${fullpageBookingExistingDocs.length} tệp đã lưu, ${fullpageBookingFilesList.length} tệp mới)`;
            summary.className = 'text-xs text-teal-800 font-medium mb-2';
        }
    }
}

function clearFullpageBookingFileSelection() {
    fullpageBookingFilesList = [];
    fullpageBookingExistingDocs = [];
    const input = document.getElementById('fullpage-booking-order-file');
    if (input) input.value = '';
    renderFullpageBookingFilesList();
}
/**
 * Tối ưu hóa biểu mẫu Booking thích ứng động theo 3 loại dịch vụ:
 * 1. EXPORT_FCL (Kéo cont xuất khẩu)
 * 2. IMPORT_FCL (Kéo cont nhập khẩu)
 * 3. DOMESTIC (Vận chuyển nội địa)
 *
 * Nguyên tắc tối ưu:
 * - Thay đổi Label, Placeholder và tiêu đề đính kèm file chuẩn xác theo thuật ngữ nghiệp vụ.
 * - Trường không áp dụng: disable, làm mờ (opacity-40, pointer-events-none), set tabindex="-1" để phím TAB tự động bỏ qua.
 * - Khi chuyển loại: tự động khôi phục các trường hợp lệ, gán giá trị mặc định an toàn.
 */
function applyBookingFormTypeAdapters(prefix = '') {
    const typeEl = document.getElementById(prefix + 'booking-type');
    const type = typeEl?.value || 'EXPORT_FCL';

    // Xác định xem form hiện có đang ở chế độ Chỉ Xem (Read-only) hay không
    let isReadOnly = false;
    if (!prefix) {
        const submitBtn = document.getElementById('btn-submit-booking');
        isReadOnly = submitBtn && submitBtn.style.display === 'none';
    } else {
        const editBtn = document.getElementById('btn-fullpage-edit-booking-bottom');
        isReadOnly = editBtn && !editBtn.classList.contains('hidden');
    }

    // Helper kiểm soát trạng thái Disable, Làm mờ và Tab navigation
    function setFieldState(wrapperId, inputIds, isDisabled, defaultValue = null) {
        const wrapper = document.getElementById(prefix + wrapperId);
        if (!wrapper) return;
        const inputs = (inputIds || []).map(id => document.getElementById(prefix + id)).filter(Boolean);

        if (isDisabled) {
            wrapper.classList.add('opacity-40', 'pointer-events-none', 'select-none');
            wrapper.querySelectorAll('button').forEach(btn => {
                btn.disabled = true;
                btn.setAttribute('tabindex', '-1');
            });
            inputs.forEach(el => {
                el.disabled = true;
                el.setAttribute('tabindex', '-1');
                el.classList.add('bg-slate-100', 'text-slate-400', 'cursor-not-allowed');
                if (defaultValue !== null) {
                    el.value = defaultValue;
                }
            });
        } else {
            wrapper.classList.remove('opacity-40', 'pointer-events-none', 'select-none');
            wrapper.querySelectorAll('button').forEach(btn => {
                btn.disabled = isReadOnly;
                btn.setAttribute('tabindex', '-1'); // Nút phụ luôn có tabindex -1 để phím Tab lướt thẳng giữa các Input
            });
            inputs.forEach(el => {
                if (!isReadOnly) {
                    el.disabled = false;
                }
                el.removeAttribute('tabindex');
                el.classList.remove('bg-slate-100', 'text-slate-400', 'cursor-not-allowed');
            });
        }
    }

    // 1. Cập nhật Badge phân loại
    const typeBadge = document.getElementById(prefix + 'booking-type-badge');
    if (typeBadge) {
        typeBadge.innerText = type === 'DOMESTIC' ? 'Vận Chuyển Nội Địa' : (type === 'IMPORT_FCL' ? 'Kéo Cont Nhập Khẩu' : 'Kéo Cont Xuất Khẩu');
    }

    // 2. Số Booking / PO / B/L
    const labelNumber = document.getElementById(prefix + 'label-booking-number');
    const inputNumber = document.getElementById(prefix + 'booking-number');
    if (labelNumber) {
        if (type === 'DOMESTIC') {
            labelNumber.innerHTML = 'Số PO / Đơn Hàng / Lệnh Xe <span class="text-rose-500">*</span>';
        } else if (type === 'IMPORT_FCL') {
            labelNumber.innerHTML = 'Số Vận Đơn (B/L) / D/O <span class="text-rose-500">*</span>';
        } else {
            labelNumber.innerHTML = 'Số Booking Hãng Tàu <span class="text-rose-500">*</span>';
        }
    }
    if (inputNumber) {
        if (type === 'DOMESTIC') {
            inputNumber.placeholder = 'VD: PO-2024-001, DH-998...';
        } else if (type === 'IMPORT_FCL') {
            inputNumber.placeholder = 'VD: MEDU1234567, COSU...';
        } else {
            inputNumber.placeholder = 'VD: 276081838, ONEY...';
        }
    }

    // 3. Hãng Tàu
    const labelShipping = document.getElementById(prefix + 'label-booking-shipping-line');
    const inputShipping = document.getElementById(prefix + 'booking-shipping-line');
    if (type === 'DOMESTIC') {
        setFieldState('wrapper-shipping-line', ['booking-shipping-line'], true, 'NỘI ĐỊA');
        if (labelShipping) labelShipping.innerHTML = 'Hãng Tàu <span class="text-slate-400 font-normal lowercase">(nội địa)</span>';
    } else {
        setFieldState('wrapper-shipping-line', ['booking-shipping-line'], false);
        if (labelShipping) labelShipping.innerHTML = 'Hãng Tàu';
        if (inputShipping) {
            if (inputShipping.value === 'NỘI ĐỊA') inputShipping.value = '';
            inputShipping.placeholder = type === 'IMPORT_FCL' ? 'COSCO, MSC, EVERGREEN...' : 'MAERSK, ONE, CMA...';
        }
    }

    // 4. Tên Tàu & Chuyến (Vessel / Voyage)
    const labelVessel = document.getElementById(prefix + 'label-booking-vessel');
    const inputVessel = document.getElementById(prefix + 'booking-vessel');
    if (type === 'DOMESTIC') {
        setFieldState('wrapper-vessel', ['booking-vessel'], true, '');
        if (labelVessel) labelVessel.innerHTML = 'Tàu & Chuyến <span class="text-slate-400 font-normal lowercase">(không áp dụng)</span>';
    } else {
        setFieldState('wrapper-vessel', ['booking-vessel'], false);
        if (labelVessel) {
            labelVessel.innerHTML = type === 'IMPORT_FCL' 
                ? 'Tên Tàu & Chuyến Cập <span class="text-[10px] text-slate-400 font-normal lowercase">(Vessel/Voy)</span>' 
                : 'Tên Tàu & Chuyến <span class="text-[10px] text-slate-400 font-normal lowercase">(Vessel/Voy)</span>';
        }
        if (inputVessel) {
            inputVessel.placeholder = type === 'IMPORT_FCL' ? 'VD: CMA CGM CHENNAI / 002S' : 'VD: CAP SAN LAZARO / 001N';
        }
    }

    // 5. HS Code
    const labelHsCode = document.getElementById(prefix + 'label-booking-hs-code');
    if (type === 'DOMESTIC') {
        setFieldState('wrapper-booking-hs-code', ['booking-hs-code'], true, '');
        if (labelHsCode) labelHsCode.innerHTML = 'Mã Phân Loại HS Code <span class="text-slate-400 font-normal lowercase">(không áp dụng)</span>';
    } else {
        setFieldState('wrapper-booking-hs-code', ['booking-hs-code'], false);
        if (labelHsCode) labelHsCode.innerHTML = 'Mã Phân Loại HS Code';
    }

    // 6. Lộ trình 3 điểm
    const labelPickup = document.getElementById(prefix + 'label-booking-pickup');
    const labelDelivery = document.getElementById(prefix + 'label-booking-delivery');
    const labelDropoff = document.getElementById(prefix + 'label-booking-dropoff');

    if (type === 'DOMESTIC') {
        if (labelPickup) labelPickup.innerHTML = '1. Điểm Bốc Hàng (Nơi đi) <span class="text-rose-500">*</span>';
        if (labelDelivery) labelDelivery.innerHTML = '2. Điểm Giao Hàng (Nơi đến) <span class="text-rose-500">*</span>';
        setFieldState('wrapper-booking-dropoff', ['booking-dropoff'], true, '');
        if (labelDropoff) labelDropoff.innerHTML = '3. Điểm Hạ / Trả Cont <span class="text-slate-400 font-normal lowercase">(không áp dụng)</span>';
    } else if (type === 'IMPORT_FCL') {
        if (labelPickup) labelPickup.innerHTML = '1. Cảng Lấy Cont Hàng <span class="text-rose-500">*</span>';
        if (labelDelivery) labelDelivery.innerHTML = '2. Kho Rút Hàng <span class="text-rose-500">*</span>';
        setFieldState('wrapper-booking-dropoff', ['booking-dropoff'], false);
        if (labelDropoff) labelDropoff.innerHTML = '3. Depot Trả Rỗng <span class="text-rose-500">*</span>';
    } else {
        if (labelPickup) labelPickup.innerHTML = '1. Depot Cấp Rỗng <span class="text-rose-500">*</span>';
        if (labelDelivery) labelDelivery.innerHTML = '2. Kho Đóng Hàng <span class="text-rose-500">*</span>';
        setFieldState('wrapper-booking-dropoff', ['booking-dropoff'], false);
        if (labelDropoff) labelDropoff.innerHTML = '3. Cảng Hạ CY <span class="text-rose-500">*</span>';
    }

    // 7. Ngày hẹn đóng/dỡ/bốc
    const labelDate = document.getElementById(prefix + 'label-booking-loading-date');
    if (labelDate) {
        if (type === 'DOMESTIC') {
            labelDate.innerHTML = 'Ngày Bốc Hàng <span class="text-rose-500">*</span>';
        } else if (type === 'IMPORT_FCL') {
            labelDate.innerHTML = 'Ngày Hẹn Dỡ Hàng <span class="text-rose-500">*</span>';
        } else {
            labelDate.innerHTML = 'Ngày Hẹn Đóng <span class="text-rose-500">*</span>';
        }
    }

    // 8. Hạn Cắt Máng CY (Closing Time)
    const labelClosing = document.getElementById(prefix + 'label-booking-closing');
    if (type === 'DOMESTIC' || type === 'IMPORT_FCL') {
        setFieldState('wrapper-booking-closing', ['booking-closing-date', 'booking-closing-time-val', 'booking-closing-time'], true, '');
        if (labelClosing) labelClosing.innerHTML = 'Hạn Cắt Máng CY <span class="text-slate-400 font-normal lowercase">(không áp dụng)</span>';
    } else {
        setFieldState('wrapper-booking-closing', ['booking-closing-date', 'booking-closing-time-val', 'booking-closing-time'], false);
        if (labelClosing) labelClosing.innerHTML = 'Hạn Cắt Máng CY <span class="text-rose-700">*</span>';
    }

    // 9. Hạn SI Cut-off
    const labelSi = document.getElementById(prefix + 'label-booking-si');
    if (type === 'DOMESTIC' || type === 'IMPORT_FCL') {
        setFieldState('wrapper-booking-si', ['booking-si-date', 'booking-si-time-val', 'booking-si-cutoff'], true, '');
        if (labelSi) labelSi.innerHTML = 'Hạn SI Cut-off <span class="text-slate-400 font-normal lowercase">(không áp dụng)</span>';
    } else {
        setFieldState('wrapper-booking-si', ['booking-si-date', 'booking-si-time-val', 'booking-si-cutoff'], false);
        if (labelSi) labelSi.innerHTML = 'Hạn SI Cut-off';
    }

    // 10. Free DET & DEM
    const labelDet = document.getElementById(prefix + 'label-booking-det');
    const inputDet = document.getElementById(prefix + 'booking-det');
    const labelDem = document.getElementById(prefix + 'label-booking-dem');
    const inputDem = document.getElementById(prefix + 'booking-dem');

    if (type === 'DOMESTIC') {
        setFieldState('wrapper-booking-det', ['booking-det'], true, '0');
        if (labelDet) labelDet.innerHTML = 'Free DET <span class="text-slate-400 font-normal lowercase">(không có)</span>';
        setFieldState('wrapper-booking-dem', ['booking-dem'], true, '0');
        if (labelDem) labelDem.innerHTML = 'Free DEM <span class="text-slate-400 font-normal lowercase">(không có)</span>';
    } else {
        setFieldState('wrapper-booking-det', ['booking-det'], false);
        setFieldState('wrapper-booking-dem', ['booking-dem'], false);
        if (labelDet) labelDet.innerHTML = type === 'IMPORT_FCL' ? 'Free DET (Mượn vỏ)' : 'Free DET (Ngày)';
        if (labelDem) labelDem.innerHTML = type === 'IMPORT_FCL' ? 'Free DEM (Lưu bãi)' : 'Free DEM (Ngày)';
        if (inputDet && (!inputDet.value || inputDet.value === '0')) inputDet.value = formatNumberVN(7);
        if (inputDem && (!inputDem.value || inputDem.value === '0')) inputDem.value = formatNumberVN(7);
    }

    // 11. Đính kèm file
    const titleFile = document.getElementById(prefix + 'title-booking-file');
    if (titleFile) {
        if (type === 'DOMESTIC') {
            titleFile.innerHTML = '<i class="ph-bold ph-file-arrow-up text-teal-700 text-sm"></i> Đính Kèm PO / Lệnh Điều Xe / Phiếu Xuất Kho';
        } else if (type === 'IMPORT_FCL') {
            titleFile.innerHTML = '<i class="ph-bold ph-file-arrow-up text-teal-700 text-sm"></i> Đính Kèm Lệnh Giao Hàng D/O & Vận Đơn (B/L)';
        } else {
            titleFile.innerHTML = '<i class="ph-bold ph-file-arrow-up text-teal-700 text-sm"></i> Đính Kèm File Booking / Lệnh Cấp Rỗng';
        }
    }
}
window.applyBookingFormTypeAdapters = applyBookingFormTypeAdapters;

function onFullpageBookingTypeChange() {
    applyBookingFormTypeAdapters('fullpage-');
}
window.onFullpageBookingTypeChange = onFullpageBookingTypeChange;

function onFullpageBookingCustomerChange() {
    const sel = document.getElementById('fullpage-booking-customer');
    const headerCust = document.getElementById('fullpage-booking-header-customer');
    const topbarCust = document.getElementById('topbar-booking-customer');
    if (sel) {
        const text = sel.options[sel.selectedIndex]?.text || '';
        const custName = (text && !text.startsWith('--')) ? text : 'Chưa chọn khách hàng';
        if (headerCust) headerCust.innerText = custName;
        if (topbarCust) topbarCust.innerText = custName;
    }
}

function onFullpageBookingDateChange() {
    const dateInput = document.getElementById('fullpage-booking-loading-date');
    const headerDate = document.getElementById('fullpage-booking-header-date');
    const topbarDate = document.getElementById('topbar-booking-date');
    if (dateInput) {
        const dateStr = dateInput.value ? `Hẹn đóng: ${formatDateVN(dateInput.value)}` : 'Hẹn đóng: --/--/----';
        if (headerDate) headerDate.innerText = dateStr;
        if (topbarDate) topbarDate.innerText = dateStr;
    }
}

function syncFullpageBookingClosingTime() {
    const date = document.getElementById('fullpage-booking-closing-date')?.value || '';
    const time = document.getElementById('fullpage-booking-closing-time-val')?.value || '17:00';
    const target = document.getElementById('fullpage-booking-closing-time');
    if (target) {
        target.value = date ? `${time} ${formatDateVN(date)}` : '';
    }
}

function syncFullpageBookingSiTime() {
    const date = document.getElementById('fullpage-booking-si-date')?.value || '';
    const time = document.getElementById('fullpage-booking-si-time-val')?.value || '12:00';
    const target = document.getElementById('fullpage-booking-si-cutoff');
    if (target) {
        target.value = date ? `${time} ${formatDateVN(date)}` : '';
    }
}

function parseClosingTimeToFullpageInputs(closingStr) {
    const dateInput = document.getElementById('fullpage-booking-closing-date');
    const timeInput = document.getElementById('fullpage-booking-closing-time-val');
    const hiddenInput = document.getElementById('fullpage-booking-closing-time');
    if (hiddenInput) hiddenInput.value = closingStr || '';
    if (!closingStr) return;

    const parts = closingStr.trim().split(' ');
    if (parts.length >= 2) {
        if (timeInput) timeInput.value = parts[0];
        const dateParts = parts[1].split('/');
        if (dateParts.length === 3 && dateInput) {
            dateInput.value = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
        }
    }
}

function parseSiCutoffToFullpageInputs(siStr) {
    const dateInput = document.getElementById('fullpage-booking-si-date');
    const timeInput = document.getElementById('fullpage-booking-si-time-val');
    const hiddenInput = document.getElementById('fullpage-booking-si-cutoff');
    if (hiddenInput) hiddenInput.value = siStr || '';
    if (!siStr) return;

    const parts = siStr.trim().split(' ');
    if (parts.length >= 2) {
        if (timeInput) timeInput.value = parts[0];
        const dateParts = parts[1].split('/');
        if (dateParts.length === 3 && dateInput) {
            dateInput.value = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
        }
    }
}

async function openCreateBookingPage(updateHistory = true) {
    try {
        const currentActiveView = document.querySelector('.view:not(.hidden-view)');
        if (currentActiveView && currentActiveView.id !== 'view-booking-detail') {
            previousActiveTab = currentActiveView.id.replace('view-', '');
        }

        // Ẩn tất cả view, hiện view-booking-detail ngay lập tức
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden-view'));
        const detailView = document.getElementById('view-booking-detail');
        if (detailView) {
            detailView.classList.remove('hidden-view');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        setTopbarFullpageMode({
            backFn: backToBookings,
            prefix: 'Sale & Booking',
            title: 'Tạo Mới Booking',
            subText: '',
            badgesHtml: '',
            actionsHtml: ''
        });

        if (updateHistory && window.history && window.history.pushState) {
            const bookingPath = '/sales/bookings/new';
            if (window.location.pathname !== bookingPath) {
                window.history.pushState({ view: 'booking-create' }, '', bookingPath);
            }
        }

        const form = document.getElementById('form-fullpage-booking');
        if (form) {
            form.reset();
            form.querySelectorAll('input, select, textarea, button').forEach(el => el.disabled = false);
        }

        const idInput = document.getElementById('fullpage-booking-id');
        const titleCodeEl = document.getElementById('fullpage-booking-title-code');
        const statusBadge = document.getElementById('fullpage-booking-status-badge');
        const typeBadge = document.getElementById('fullpage-booking-type-badge');
        const headerCust = document.getElementById('fullpage-booking-header-customer');
        const headerDate = document.getElementById('fullpage-booking-header-date');
        const saveBtnText = document.getElementById('btn-fullpage-save-booking-bottom-text') || document.getElementById('btn-fullpage-save-booking-text');
        const tripsSection = document.getElementById('fullpage-booking-trips-section');

        currentActiveFullpageBooking = null;
        if (idInput) idInput.value = '';
        if (titleCodeEl) titleCodeEl.innerText = 'Tạo Booking';
        if (statusBadge) statusBadge.classList.add('hidden');
        if (typeBadge) {
            typeBadge.classList.remove('hidden');
            typeBadge.innerText = 'Kéo Cont Xuất Khẩu';
        }
        if (headerCust) headerCust.innerText = 'Chưa chọn khách hàng';
        const todayStr = new Date().toISOString().split('T')[0];
        if (headerDate) headerDate.innerText = `Hẹn đóng: ${new Date().toLocaleDateString('vi-VN')}`;
        if (saveBtnText) saveBtnText.innerText = 'Lưu';
        if (tripsSection) tripsSection.classList.add('hidden');

        // Ở chế độ Tạo Mới: Ẩn Xóa, In, Sửa; Nút Lưu sáng lên
        const delBtn = document.getElementById('btn-fullpage-delete-booking-bottom');
        if (delBtn) delBtn.classList.add('hidden');
        const printBtn = document.getElementById('btn-fullpage-print-booking-bottom');
        if (printBtn) printBtn.classList.add('hidden');
        const editBtn = document.getElementById('btn-fullpage-edit-booking-bottom');
        if (editBtn) editBtn.classList.add('hidden');
        setFullpageSaveButtonState('btn-fullpage-save-booking-bottom', true);

        const dateInput = document.getElementById('fullpage-booking-loading-date');
        const timeInput = document.getElementById('fullpage-booking-loading-time');
        const closingDateInput = document.getElementById('fullpage-booking-closing-date');
        const closingTimeValInput = document.getElementById('fullpage-booking-closing-time-val');
        if (dateInput) dateInput.value = todayStr;
        if (timeInput) timeInput.value = '08:00';
        if (closingDateInput) closingDateInput.value = todayStr;
        if (closingTimeValInput) closingTimeValInput.value = '17:00';
        if (typeof syncFullpageBookingClosingTime === 'function') syncFullpageBookingClosingTime();

        const siDateInput = document.getElementById('fullpage-booking-si-date');
        const siTimeValInput = document.getElementById('fullpage-booking-si-time-val');
        if (siDateInput) siDateInput.value = todayStr;
        if (siTimeValInput) siTimeValInput.value = '12:00';
        if (typeof syncFullpageBookingSiTime === 'function') syncFullpageBookingSiTime();

        const totalInput = document.getElementById('fullpage-booking-total-containers');
        const detInput = document.getElementById('fullpage-booking-det');
        const demInput = document.getElementById('fullpage-booking-dem');
        const priceInput = document.getElementById('fullpage-booking-price');
        if (totalInput) totalInput.value = formatNumberVN(1);
        if (detInput) detInput.value = formatNumberVN(7);
        if (demInput) demInput.value = formatNumberVN(7);
        if (priceInput) priceInput.value = '';

        if (typeof clearFullpageBookingFileSelection === 'function') clearFullpageBookingFileSelection();
        if (typeof onFullpageBookingTypeChange === 'function') onFullpageBookingTypeChange();
        if (typeof initAllNumberInputs === 'function') initAllNumberInputs();

        try {
            if (typeof loadMasterDataFormOptions === 'function') await loadMasterDataFormOptions();
            if (typeof populateMasterDataDropdowns === 'function') populateMasterDataDropdowns();
        } catch (mErr) {
            console.warn('loadMasterDataFormOptions error:', mErr);
        }
    } catch (err) {
        console.error('Error in openCreateBookingPage:', err);
    }
}
window.openCreateBookingPage = openCreateBookingPage;

async function viewBookingDetail(bookingId, updateHistory = true) {
    if (!bookingId || bookingId === 'new') {
        return openCreateBookingPage(updateHistory);
    }
    await loadMasterDataFormOptions();
    populateMasterDataDropdowns();

    const form = document.getElementById('form-fullpage-booking');
    if (form) form.reset();

    const idInput = document.getElementById('fullpage-booking-id');
    const titleCodeEl = document.getElementById('fullpage-booking-title-code');
    const statusBadge = document.getElementById('fullpage-booking-status-badge');
    const typeBadge = document.getElementById('fullpage-booking-type-badge');
    const headerCust = document.getElementById('fullpage-booking-header-customer');
    const headerDate = document.getElementById('fullpage-booking-header-date');
    const saveBtnText = document.getElementById('btn-fullpage-save-booking-bottom-text') || document.getElementById('btn-fullpage-save-booking-text');
    const tripsSection = document.getElementById('fullpage-booking-trips-section');

    if (titleCodeEl) titleCodeEl.innerText = 'Đang tải...';
    if (saveBtnText) saveBtnText.innerText = 'Lưu';

    try {
        const res = await fetchWithAuth(`/api/bookings/${bookingId}/`);
        if (!res.ok) throw new Error('Không thể tải chi tiết đơn hàng / booking');
        const b = await res.json();
        currentActiveFullpageBooking = b;

        if (idInput) idInput.value = b.id;
        if (titleCodeEl) titleCodeEl.innerText = b.booking_code || `BK-${b.id}`;
        if (headerCust) headerCust.innerText = b.customer_name || '...';
        if (headerDate) headerDate.innerText = `Hẹn đóng: ${b.loading_date ? formatDateVN(b.loading_date) : '--/--/----'}`;

        if (statusBadge) {
            statusBadge.classList.remove('hidden');
            statusBadge.innerText = b.status_display || b.status;
            statusBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider font-heading ' +
                (b.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                 b.status === 'PARTIALLY_DISPATCHED' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                 b.status === 'CANCELLED' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                 'bg-teal-50 text-teal-800 border-teal-200');
        }
        if (typeBadge) {
            typeBadge.classList.remove('hidden');
            typeBadge.innerText = b.booking_type_display || (b.booking_type === 'DOMESTIC' ? 'Vận Chuyển Nội Địa' : (b.booking_type === 'IMPORT_FCL' ? 'Kéo Cont Nhập Khẩu' : 'Kéo Cont Xuất Khẩu'));
        }

        if (updateHistory && window.history && window.history.pushState) {
            const bookingPath = `/sales/bookings/${b.id}`;
            if (window.location.pathname !== bookingPath) {
                window.history.pushState({ view: 'booking-detail', bookingId: b.id }, '', bookingPath);
            }
        }

        const currentActiveView = document.querySelector('.view:not(.hidden-view)');
        if (currentActiveView && currentActiveView.id !== 'view-booking-detail') {
            previousActiveTab = currentActiveView.id.replace('view-', '');
        }

        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden-view'));
        const detailView = document.getElementById('view-booking-detail');
        if (detailView) detailView.classList.remove('hidden-view');

        const bookingTypeLabel = b.booking_type_display || (b.booking_type === 'DOMESTIC' ? 'Vận Chuyển Nội Địa' : (b.booking_type === 'IMPORT_FCL' ? 'Kéo Cont Nhập Khẩu' : 'Kéo Cont Xuất Khẩu'));
        const bookingDateStr = b.loading_date ? formatDateVN(b.loading_date) : '--/--/----';

        setTopbarFullpageMode({
            backFn: backToBookings,
            prefix: 'Sale & Booking',
            title: `Booking | ${b.booking_code || ('BK-' + b.id)}`,
            subText: '',
            badgesHtml: '',
            actionsHtml: ''
        });

        const typeEl = document.getElementById('fullpage-booking-type');
        if (typeEl) typeEl.value = b.booking_type || 'EXPORT_FCL';
        const custEl = document.getElementById('fullpage-booking-customer');
        if (custEl) setSelectValueCaseInsensitive(custEl, b.customer_name);
        const numEl = document.getElementById('fullpage-booking-number');
        if (numEl) numEl.value = b.booking_number || '';
        const shipEl = document.getElementById('fullpage-booking-shipping-line');
        if (shipEl) shipEl.value = b.shipping_line || '';
        const vesEl = document.getElementById('fullpage-booking-vessel');
        if (vesEl) vesEl.value = b.vessel_voyage || '';
        const sizeEl = document.getElementById('fullpage-booking-container-size');
        if (sizeEl) setSelectValueCaseInsensitive(sizeEl, b.container_size || '40HC');
        const totalEl = document.getElementById('fullpage-booking-total-containers');
        if (totalEl) totalEl.value = formatNumberVN(b.total_containers || 1);
        const comEl = document.getElementById('fullpage-booking-commodity');
        if (comEl) comEl.value = b.commodity || '';
        const hsEl = document.getElementById('fullpage-booking-hs-code');
        if (hsEl) hsEl.value = b.hs_code || '';

        const pickEl = document.getElementById('fullpage-booking-pickup');
        if (pickEl) setSelectValueCaseInsensitive(pickEl, b.pickup_location);
        const delEl = document.getElementById('fullpage-booking-delivery');
        if (delEl) setSelectValueCaseInsensitive(delEl, b.delivery_location);
        const dropEl = document.getElementById('fullpage-booking-dropoff');
        if (dropEl) setSelectValueCaseInsensitive(dropEl, b.dropoff_location);

        const dateEl = document.getElementById('fullpage-booking-loading-date');
        if (dateEl) dateEl.value = b.loading_date || '';
        const timeEl = document.getElementById('fullpage-booking-loading-time');
        if (timeEl) timeEl.value = formatTimeString(b.loading_time || '08:00');

        parseClosingTimeToFullpageInputs(b.closing_time);
        parseSiCutoffToFullpageInputs(b.si_cutoff);

        const detEl = document.getElementById('fullpage-booking-det');
        if (detEl) detEl.value = formatNumberVN(b.free_time_detention || 7);
        const demEl = document.getElementById('fullpage-booking-dem');
        if (demEl) demEl.value = formatNumberVN(b.free_time_demurrage || 7);
        const priceEl = document.getElementById('fullpage-booking-price');
        if (priceEl) priceEl.value = b.selling_freight_price ? formatNumberVN(b.selling_freight_price) : '';
        const statusEl = document.getElementById('fullpage-booking-status');
        if (statusEl) statusEl.value = b.status || 'PENDING_DISPATCH';
        const notesEl = document.getElementById('fullpage-booking-notes');
        if (notesEl) notesEl.value = b.notes || '';

        fullpageBookingFilesList = [];
        fullpageBookingExistingDocs = [];
        if (b.documents && b.documents.length > 0) {
            fullpageBookingExistingDocs = b.documents.map(d => ({
                id: d.id,
                name: d.file_name || d.name || d.title || 'Tài liệu Booking',
                url: d.file_url || d.url || (d.file_path ? `/media/${d.file_path}` : '#'),
                size_formatted: d.file_size_formatted || d.size_formatted || ''
            }));
        } else if (b.booking_file_url) {
            fullpageBookingExistingDocs.push({
                id: null,
                name: b.booking_file_name || 'Tài liệu Booking',
                url: b.booking_file_url,
                size_formatted: ''
            });
        }
        renderFullpageBookingFilesList();

        if (tripsSection) {            tripsSection.classList.remove('hidden');
            const tripsCountBadge = document.getElementById('fullpage-booking-trips-count-badge');
            const tripsTbody = document.getElementById('fullpage-booking-trips-tbody');

            if (b.trips && b.trips.length > 0) {
                if (tripsCountBadge) {
                    tripsCountBadge.innerText = `${b.dispatched_containers || b.trips.length} / ${b.total_containers} Container`;
                }
                tripsTbody.innerHTML = b.trips.map(t => {
                    const statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${t.status_badge_class || 'bg-slate-100 text-slate-700'}">${t.status_display || t.status}</span>`;
                    const modeBadge = t.is_split_trip 
                        ? `<span class="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Cắt Kéo (2 Chặng)</span>`
                        : `<span class="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">Nguyên Chuyến (FTL)</span>`;
                    return `
                        <tr class="hover:bg-slate-50 transition-colors">
                            <td class="p-2.5">
                                <p class="font-bold text-slate-900 font-mono text-xs">${t.trip_code}</p>
                                <p class="text-[11px] font-mono text-indigo-700 font-bold">${t.container_number || '-'}</p>
                            </td>
                            <td class="p-2.5">${modeBadge}</td>
                            <td class="p-2.5">
                                <p class="font-bold text-slate-900">${t.driver || '-'}</p>
                                <p class="text-[11px] text-slate-500 font-medium">Xe: ${t.vehicle || '-'}</p>
                            </td>
                            <td class="p-2.5">
                                ${t.is_split_trip ? `
                                    <p class="font-bold text-amber-900">${t.dropoff_driver || 'Chưa gán'}</p>
                                    <p class="text-[11px] text-slate-500 font-medium">Xe: ${t.dropoff_vehicle || '-'}</p>
                                ` : `
                                    <span class="text-slate-400 italic text-[11px]">(Tài xế chặng 1)</span>
                                `}
                            </td>
                            <td class="p-2.5 text-[11px] text-slate-700 leading-tight">
                                ${t.pickup_location || '-'} ➔ ${t.delivery_location || '-'}
                            </td>
                            <td class="p-2.5">${statusBadge}</td>
                            <td class="p-2.5 text-center">
                                <button type="button" onclick="viewTripDetail('${t.trip_code}')" 
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
                        <td colspan="7" class="p-4 text-center text-slate-400 italic text-xs">
                            Chưa có container nào được phát lệnh điều xe từ Booking này. Bấm "Điều Xe" bên ngoài để phát lệnh.
                        </td>
                    </tr>
                `;
            }
        }

        // CHẾ ĐỘ XEM BẢN GHI ĐÃ CÓ:
        // 1. Khóa toàn bộ input/select/textarea của form
        if (form) {
            form.querySelectorAll('input, select, textarea').forEach(el => el.disabled = true);
            form.querySelectorAll('button:not(#btn-fullpage-edit-booking-bottom):not(#btn-fullpage-delete-booking-bottom):not(#btn-fullpage-print-booking-bottom):not([onclick*="backToBookings"]):not([onclick*="viewTripDetail"])').forEach(el => el.disabled = true);
        }
        // 2. Hiển thị đủ bộ nút Xóa, In, Sửa
        const delBtn = document.getElementById('btn-fullpage-delete-booking-bottom');
        if (delBtn) {
            delBtn.classList.remove('hidden');
            delBtn.disabled = false;
        }
        const printBtn = document.getElementById('btn-fullpage-print-booking-bottom');
        if (printBtn) {
            printBtn.classList.remove('hidden');
            printBtn.disabled = false;
        }
        const editBtn = document.getElementById('btn-fullpage-edit-booking-bottom');
        if (editBtn) {
            editBtn.classList.remove('hidden');
            editBtn.disabled = false;
        }
        // 3. Nút Lưu mờ đi, chỉ sáng lên khi người dùng bấm Sửa
        setFullpageSaveButtonState('btn-fullpage-save-booking-bottom', false);

        onFullpageBookingTypeChange();
        initAllNumberInputs();
    } catch (err) {
        console.error('Lỗi tải chi tiết booking trang riêng:', err);
        showToast('error', 'Không thể tải thông tin đơn hàng / booking', 'Lỗi');
        backToBookings();
    }
}

function backToBookings() {
    const detailView = document.getElementById('view-booking-detail');
    if (detailView) detailView.classList.add('hidden-view');

    if (previousActiveTab && previousActiveTab !== 'booking-detail') {
        switchTab(previousActiveTab, true);
    } else {
        switchTab('kinh-doanh', true);
    }
}

function copyBookingPageLink() {
    const id = document.getElementById('fullpage-booking-id')?.value;
    if (!id) {
        showToast('warning', 'Đơn hàng chưa được lưu để lấy link chia sẻ', 'Cảnh Báo');
        return;
    }
    const fullUrl = `${window.location.origin}/sales/bookings/${id}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
        showToast('success', `Đã sao chép link đơn hàng:\n${fullUrl}`, 'Thành Công');
    }).catch(() => {
        prompt('Sao chép link đơn hàng:', fullUrl);
    });
}

async function saveFullpageBooking(e) {
    if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
    }
    const id = document.getElementById('fullpage-booking-id')?.value;
    const bookingType = document.getElementById('fullpage-booking-type')?.value || 'EXPORT_FCL';
    const customer = document.getElementById('fullpage-booking-customer')?.value?.trim();
    const bookingNumber = document.getElementById('fullpage-booking-number')?.value?.trim();
    let shippingLine = document.getElementById('fullpage-booking-shipping-line')?.value?.trim();
    let vessel = document.getElementById('fullpage-booking-vessel')?.value?.trim();
    const containerSize = document.getElementById('fullpage-booking-container-size')?.value || '40HC';
    const totalContainers = parseNumberVN(document.getElementById('fullpage-booking-total-containers')?.value) || 1;
    const commodity = document.getElementById('fullpage-booking-commodity')?.value?.trim();
    let hsCode = document.getElementById('fullpage-booking-hs-code')?.value?.trim();
    const pickup = document.getElementById('fullpage-booking-pickup')?.value?.trim();
    const delivery = document.getElementById('fullpage-booking-delivery')?.value?.trim();
    let dropoff = document.getElementById('fullpage-booking-dropoff')?.value?.trim();
    const loadingDate = document.getElementById('fullpage-booking-loading-date')?.value;
    const loadingTime = formatTimeString(document.getElementById('fullpage-booking-loading-time')?.value?.trim() || '08:00');
    syncFullpageBookingClosingTime();
    syncFullpageBookingSiTime();
    let closingTime = document.getElementById('fullpage-booking-closing-time')?.value?.trim();
    let siCutoff = document.getElementById('fullpage-booking-si-cutoff')?.value?.trim();
    let det = parseNumberVN(document.getElementById('fullpage-booking-det')?.value);
    let dem = parseNumberVN(document.getElementById('fullpage-booking-dem')?.value);
    const price = parseNumberVN(document.getElementById('fullpage-booking-price')?.value) || 0;
    const statusVal = document.getElementById('fullpage-booking-status')?.value || 'PENDING_DISPATCH';
    const notes = document.getElementById('fullpage-booking-notes')?.value?.trim();

    // Chuẩn hóa và gán ngầm định theo từng phân loại dịch vụ
    if (bookingType === 'DOMESTIC') {
        shippingLine = shippingLine || 'NỘI ĐỊA';
        vessel = '';
        hsCode = '';
        dropoff = dropoff || delivery; // Điểm 3 ngầm định theo điểm giao
        closingTime = '';
        siCutoff = '';
        det = 0;
        dem = 0;
    } else if (bookingType === 'IMPORT_FCL') {
        closingTime = '';
        siCutoff = '';
        if (det === null || det === undefined || isNaN(det)) det = 7;
        if (dem === null || dem === undefined || isNaN(dem)) dem = 7;
    } else {
        if (det === null || det === undefined || isNaN(det)) det = 7;
        if (dem === null || dem === undefined || isNaN(dem)) dem = 7;
    }

    if (!customer) {
        showToast('warning', 'Vui lòng chọn Khách Hàng trong danh mục!', 'Thiếu Thông Tin');
        document.getElementById('fullpage-booking-customer')?.focus();
        return;
    }
    if (!bookingNumber) {
        const numLabel = bookingType === 'DOMESTIC' ? 'Số PO / Đơn Hàng' : (bookingType === 'IMPORT_FCL' ? 'Số Vận Đơn (B/L) / D/O' : 'Số Booking');
        showToast('warning', `Vui lòng nhập ${numLabel}!`, 'Thiếu Thông Tin');
        document.getElementById('fullpage-booking-number')?.focus();
        return;
    }
    if (!pickup) {
        const pLabel = bookingType === 'DOMESTIC' ? 'Điểm Bốc Hàng (Điểm 1)' : (bookingType === 'IMPORT_FCL' ? 'Cảng Lấy Cont (Điểm 1)' : 'Depot Cấp Rỗng (Điểm 1)');
        showToast('warning', `Vui lòng chọn ${pLabel}!`, 'Thiếu Thông Tin');
        document.getElementById('fullpage-booking-pickup')?.focus();
        return;
    }
    if (!delivery) {
        const dLabel = bookingType === 'DOMESTIC' ? 'Kho Giao Hàng (Điểm 2)' : (bookingType === 'IMPORT_FCL' ? 'Kho Rút Hàng (Điểm 2)' : 'Kho Đóng Hàng (Điểm 2)');
        showToast('warning', `Vui lòng chọn ${dLabel}!`, 'Thiếu Thông Tin');
        document.getElementById('fullpage-booking-delivery')?.focus();
        return;
    }
    if (bookingType !== 'DOMESTIC' && !dropoff) {
        const drLabel = bookingType === 'IMPORT_FCL' ? 'Depot Trả Rỗng (Điểm 3)' : 'Cảng Hạ CY (Điểm 3)';
        showToast('warning', `Vui lòng chọn ${drLabel}!`, 'Thiếu Thông Tin');
        document.getElementById('fullpage-booking-dropoff')?.focus();
        return;
    }

    const submitBtn = document.getElementById('btn-fullpage-save-booking-bottom') || document.getElementById('btn-fullpage-save-booking');
    const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="ph-bold ph-spinner animate-spin text-base"></i> <span>Đang lưu...</span>';
    }

    try {
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

        if (fullpageBookingFilesList && fullpageBookingFilesList.length > 0) {
            formData.append('booking_file', fullpageBookingFilesList[0]);
            fullpageBookingFilesList.forEach(file => {
                formData.append('booking_files', file);
            });
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

        showToast('success', data.message || 'Lưu đơn hàng / booking thành công!', 'Thành Công');
        clearFullpageBookingFileSelection();
        loadSalesData();
        loadActiveBookingsForModal();

        const savedId = id || data.booking_id || data.id;
        if (savedId) {
            viewBookingDetail(savedId, true);
        } else {
            backToBookings();
        }
    } catch (err) {
        console.error('Error saving fullpage booking:', err);
        showToast('error', err.message || 'Không thể lưu đơn hàng / booking', 'Lỗi');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHtml;
        }
    }
}

/**
 * 2. BOOKING / ĐƠN HÀNG: In trực tiếp từ bảng danh sách & từ form chi tiết
 */
function printCurrentBookingSlip() {
    const id = document.getElementById('fullpage-booking-id')?.value;
    if (!id) {
        showToast('warning', 'Vui lòng lưu đơn hàng / booking trước khi in ấn!', 'Thông Báo');
        return;
    }
    openDirectPrintBooking(id);
}
window.printCurrentBookingSlip = printCurrentBookingSlip;

async function openDirectPrintBooking(bookingId) {
    if (!bookingId) return;
    try {
        let b = (rawSalesBookings || []).find(item => item.id == bookingId);
        if (!b) {
            const res = await fetchWithAuth(`/api/bookings/${bookingId}/`);
            if (res.ok) b = await res.json();
        }
        if (!b) throw new Error('Không tìm thấy thông tin booking');

        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) {
            window.print();
            return;
        }

        const co = getSystemCompanyProfile();
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Phiếu Tiếp Nhận Booking - ${b.booking_code || ('BK-' + b.id)}</title>
                <style>
                    @page { 
                        size: A4 portrait; 
                        margin: 15mm 18mm 15mm 18mm; 
                    }
                    *, *::before, *::after { 
                        box-sizing: border-box; 
                    }
                    html, body { 
                        margin: 0; 
                        padding: 0; 
                        background: #ffffff; 
                        color: #0f172a; 
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; 
                        font-size: 13px; 
                        line-height: 1.5; 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important; 
                    }
                    .print-sheet {
                        width: 100%;
                        max-width: 175mm;
                        margin: 0 auto;
                        padding: 10mm 4mm 12mm 4mm;
                        box-sizing: border-box;
                        background: #ffffff;
                    }
                    @media print {
                        @page { 
                            size: A4 portrait; 
                            margin: 15mm 18mm 15mm 18mm; 
                        }
                        html, body { 
                            margin: 0 !important; 
                            padding: 0 !important; 
                            width: 100% !important; 
                            background: #ffffff !important; 
                        }
                        .print-sheet { 
                            width: 100% !important; 
                            max-width: 100% !important; 
                            margin: 0 !important; 
                            padding: 8mm 2mm 10mm 2mm !important; 
                            box-sizing: border-box !important; 
                            page-break-inside: avoid !important; 
                            page-break-after: avoid !important; 
                        }
                    }
                    .header { 
                        display: flex; 
                        justify-content: space-between; 
                        align-items: flex-start; 
                        border-bottom: 2.5px solid #0f766e; 
                        padding-bottom: 12px; 
                        margin-bottom: 20px; 
                    }
                    .title { 
                        text-align: center; 
                        font-size: 18px; 
                        font-weight: 800; 
                        color: #0f766e; 
                        text-transform: uppercase; 
                        letter-spacing: 0.5px;
                        margin: 16px 0 24px 0; 
                    }
                    .meta-table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin-bottom: 24px; 
                        table-layout: fixed; 
                    }
                    .meta-table td { 
                        padding: 8px 12px; 
                        border: 1px solid #cbd5e1; 
                        word-wrap: break-word; 
                        vertical-align: middle;
                        font-size: 13px;
                    }
                    .meta-table td.label { 
                        font-weight: 700; 
                        background: #f8fafc; 
                        width: 22%; 
                        color: #334155; 
                    }
                    .signatures { 
                        display: flex; 
                        justify-content: space-between; 
                        margin-top: 50px; 
                        text-align: center; 
                        page-break-inside: avoid; 
                    }
                    .sig-box { 
                        width: 30%; 
                    }
                    .sig-title { 
                        font-weight: 700; 
                        color: #1e293b;
                        margin-bottom: 75px; 
                    }
                    .footer-note {
                        margin-top: 35px;
                        border-top: 1px dashed #cbd5e1;
                        padding-top: 8px;
                        font-size: 11px;
                        color: #64748b;
                        font-style: italic;
                        display: flex;
                        justify-content: space-between;
                    }
                </style>
            </head>
            <body>
                <div class="print-sheet">
                    <div class="header">
                        <div>
                            <div style="font-size: 16px; font-weight: 800; text-transform: uppercase; color: #0f766e; letter-spacing: 0.5px;">${co.company_name}</div>
                            <div style="font-size: 11.5px; color: #475569; margin-top: 3px;">Đ/c: ${co.address || '—'} • Hotline: ${co.phone || '0965.559.561'}${co.tax_code ? ` • MST: ${co.tax_code}` : ''}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-weight: 800; font-family: monospace; font-size: 15px; color: #0f766e;">${b.booking_code || ('BK-' + b.id)}</div>
                            <div style="font-size: 11.5px; color: #64748b; margin-top: 3px;">Ngày in: ${new Date().toLocaleDateString('vi-VN')}</div>
                        </div>
                    </div>

                    <div class="title">PHIẾU TIẾP NHẬN ĐƠN HÀNG VẬN TẢI / BOOKING</div>

                    <table class="meta-table">
                        <tr>
                            <td class="label">Khách Hàng:</td>
                            <td style="font-weight: bold; font-size: 14px;">${b.customer_name || b.customer || '-'}</td>
                            <td class="label">Số Booking / PO:</td>
                            <td style="font-family: monospace; font-weight: bold;">${b.booking_number || '-'}</td>
                        </tr>
                        <tr>
                            <td class="label">Phân Loại Dịch Vụ:</td>
                            <td>${b.booking_type_display || (b.booking_type === 'DOMESTIC' ? 'Vận Chuyển Nội Địa' : (b.booking_type === 'IMPORT_FCL' ? 'Kéo Cont Nhập Khẩu' : 'Kéo Cont Xuất Khẩu'))}</td>
                            <td class="label">Hãng Tàu / Tàu:</td>
                            <td>${b.shipping_line || '-'} ${b.vessel_voyage ? ('/ ' + b.vessel_voyage) : ''}</td>
                        </tr>
                        <tr>
                            <td class="label">Loại Cont & Số lượng:</td>
                            <td>${b.container_size || '40HC'} — Số lượng: <strong>${b.total_containers || 1} cont</strong></td>
                            <td class="label">Hàng Hóa / Trọng Lượng:</td>
                            <td>${b.commodity || 'Hàng tổng hợp'}</td>
                        </tr>
                        <tr>
                            <td class="label">Nơi Lấy Rỗng / Hàng:</td>
                            <td colspan="3">${b.pickup_location || '-'}</td>
                        </tr>
                        <tr>
                            <td class="label">Nơi Đóng / Giao Hàng:</td>
                            <td colspan="3" style="font-weight: bold;">${b.delivery_location || '-'}</td>
                        </tr>
                        <tr>
                            <td class="label">Nơi Hạ Bãi / Trả Vỏ:</td>
                            <td colspan="3">${b.dropoff_location || '-'}</td>
                        </tr>
                        <tr>
                            <td class="label">Hẹn Đóng Hàng:</td>
                            <td style="font-weight: bold; color: #0f766e;">${b.loading_date ? (b.loading_date + ' ' + (b.loading_time || '')) : '-'}</td>
                            <td class="label">Hạn Cắt Máng (CY):</td>
                            <td style="font-weight: bold; color: #e11d48;">${b.closing_time || '-'}</td>
                        </tr>
                        <tr>
                            <td class="label">Cước Thỏa Thuận:</td>
                            <td style="font-weight: bold; font-size: 14px; color: #047857;">${new Intl.NumberFormat('vi-VN').format(b.price || 0)} đ</td>
                            <td class="label">Trạng Thái Đơn:</td>
                            <td>${b.status_display || b.status || 'ĐÃ TIẾP NHẬN'}</td>
                        </tr>
                    </table>

                    <div class="signatures">
                        <div class="sig-box">
                            <div class="sig-title">Khách Hàng</div>
                            <div>(Ký & ghi rõ họ tên)</div>
                        </div>
                        <div class="sig-box">
                            <div class="sig-title">Điều Phối Vận Tải</div>
                            <div>(Ký & ghi rõ họ tên)</div>
                        </div>
                        <div class="sig-box">
                            <div class="sig-title">Người Lập Phiếu</div>
                            <div>(Ký & ghi rõ họ tên)</div>
                        </div>
                    </div>

                    <div class="footer-note">
                        <span>* Phiếu tiếp nhận vận tải là căn cứ điều phối và đối chiếu giao nhận hàng hóa.</span>
                        <span>${co.short_name || co.company_name} • Hotline: ${co.phone || '0965.559.561'}</span>
                    </div>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 300);
    } catch (e) {
        console.error('Lỗi in booking:', e);
        showToast('error', 'Không thể mở lệnh in đơn hàng / booking', 'Lỗi In');
    }
}
window.openDirectPrintBooking = openDirectPrintBooking;

/**
 * Xác nhận xóa booking đang mở trong form chi tiết
 */
function confirmDeleteCurrentBooking() {
    const id = document.getElementById('fullpage-booking-id')?.value;
    if (!id) {
        showToast('warning', 'Chưa có đơn hàng nào được lưu để xóa!', 'Thông Báo');
        return;
    }
    deleteBooking(id);
}
window.confirmDeleteCurrentBooking = confirmDeleteCurrentBooking;
