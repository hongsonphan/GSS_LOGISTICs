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

    // Khởi tạo và đồng bộ multi-select loại cont/xe
    if (typeof initBookingContainerSizeMultiSelect === 'function') {
        initBookingContainerSizeMultiSelect(prefix);
    }
    const sizeBtn = document.getElementById(prefix + 'booking-container-size-btn');
    if (sizeBtn) {
        sizeBtn.disabled = isReadOnly;
        if (isReadOnly) {
            sizeBtn.classList.add('opacity-70', 'cursor-not-allowed');
        } else {
            sizeBtn.classList.remove('opacity-70', 'cursor-not-allowed');
        }
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

    // 4. Tên Tàu & Chuyến (Vessel / Voyage) - Đã bỏ theo yêu cầu, giữ input hidden tương thích
    const labelVessel = document.getElementById(prefix + 'label-booking-vessel');
    const inputVessel = document.getElementById(prefix + 'booking-vessel');
    if (type === 'DOMESTIC') {
        setFieldState('wrapper-vessel', ['booking-vessel'], true, '');
        if (labelVessel) labelVessel.innerHTML = 'Tàu & Chuyến <span class="text-slate-400 font-normal lowercase">(không áp dụng)</span>';
        if (inputVessel) inputVessel.value = '';
    } else {
        setFieldState('wrapper-vessel', ['booking-vessel'], false);
        if (labelVessel) {
            labelVessel.innerHTML = type === 'IMPORT_FCL' 
                ? 'Tên Tàu & Chuyến Cập <span class="text-[10px] text-slate-400 font-normal lowercase">(Vessel/Voy)</span>' 
                : 'Tên Tàu & Chuyến <span class="text-[10px] text-slate-400 font-normal lowercase">(Vessel/Voy)</span>';
        }
        if (inputVessel && !inputVessel.hidden) {
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
        if (labelDelivery) labelDelivery.innerHTML = '2. Điểm Giao Hàng (Nơi đến)';
        setFieldState('wrapper-booking-dropoff', ['booking-dropoff'], true, '');
        if (labelDropoff) labelDropoff.innerHTML = '3. Điểm Hạ / Trả Cont <span class="text-slate-400 font-normal lowercase">(không áp dụng)</span>';
    } else if (type === 'IMPORT_FCL') {
        if (labelPickup) labelPickup.innerHTML = '1. Cảng Lấy Cont Hàng <span class="text-rose-500">*</span>';
        if (labelDelivery) labelDelivery.innerHTML = '2. Kho Rút Hàng';
        setFieldState('wrapper-booking-dropoff', ['booking-dropoff'], false);
        if (labelDropoff) labelDropoff.innerHTML = '3. Depot Trả Rỗng';
    } else {
        if (labelPickup) labelPickup.innerHTML = '1. Depot Cấp Rỗng <span class="text-rose-500">*</span>';
        if (labelDelivery) labelDelivery.innerHTML = '2. Kho Đóng Hàng';
        setFieldState('wrapper-booking-dropoff', ['booking-dropoff'], false);
        if (labelDropoff) labelDropoff.innerHTML = '3. Cảng Hạ CY';
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
    if (typeof autoLookupBookingPrice === 'function') {
        autoLookupBookingPrice('fullpage-');
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


async function autoLookupBookingPrice(prefix = 'fullpage-') {
    const custEl = document.getElementById(prefix + 'booking-customer');
    const customer = custEl ? custEl.value?.trim() : '';
    if (!customer) return;

    const pickup = document.getElementById(prefix + 'booking-pickup')?.value?.trim() || '';
    const delivery = document.getElementById(prefix + 'booking-delivery')?.value?.trim() || '';
    const containerSize = document.getElementById(prefix + 'booking-container-size')?.value || '40HC';
    const priceInput = document.getElementById(prefix + 'booking-price');
    const hintEl = document.getElementById(prefix + 'booking-price-hint');

    try {
        const params = new URLSearchParams({
            customer: customer,
            pickup: pickup,
            delivery: delivery,
            container_size: containerSize
        });
        const res = await fetchWithAuth(`/api/sales/price-lookup/?${params.toString()}`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.found && data.price > 0) {
            if (priceInput) {
                priceInput.value = formatNumberVN(data.price);
                priceInput.classList.remove('border-rose-500', 'bg-rose-50');
            }
            if (hintEl) {
                hintEl.className = 'text-[11px] font-bold mt-1 text-teal-700 flex items-center gap-1';
                hintEl.innerHTML = `<i class="ph-bold ph-check-circle text-xs text-teal-600"></i> ${data.message || ('Áp dụng từ báo giá: ' + formatNumberVN(data.price) + ' đ')}`;
                hintEl.classList.remove('hidden');
            }
        } else {
            // Nếu chưa có báo giá riêng, nếu ô giá đang rỗng hoặc = 0 thì tự gợi ý mức chuẩn 4.000.000 VNĐ
            if (priceInput && (!priceInput.value || parseNumberVN(priceInput.value) <= 0)) {
                priceInput.value = formatNumberVN(4000000);
            }
            if (hintEl) {
                hintEl.className = 'text-[11px] font-medium mt-1 text-slate-500 flex items-center gap-1';
                hintEl.innerHTML = `<i class="ph-bold ph-info text-xs text-amber-500"></i> Chưa có báo giá riêng. Đã điền đơn giá tiêu chuẩn (bạn có thể chỉnh sửa).`;
                hintEl.classList.remove('hidden');
            }
        }
    } catch (e) {
        console.warn('Lỗi tra cứu giá cước tự động:', e);
    }
}
window.autoLookupBookingPrice = autoLookupBookingPrice;

/**
 * ==========================================================================
 * Quản lý Dropdown Checkbox Chọn Nhiều Loại Cont / Xe
 * ==========================================================================
 */
let BOOKING_CONTAINER_SIZE_OPTIONS = [
    { value: '20GP', label: 'Cont 20GP', desc: '(20ft Thường)' },
    { value: '40GP', label: 'Cont 40GP', desc: '(40ft Thường)' },
    { value: '40HC', label: 'Cont 40HC', desc: '(40ft Cao 9ft6)' },
    { value: '45HQ', label: 'Cont 45HQ', desc: '(45ft Cao)' },
    { value: '20RF', label: 'Cont 20RF', desc: '(20ft Lạnh)' },
    { value: '40RF', label: 'Cont 40RF', desc: '(40ft Lạnh)' },
    { value: '20FR', label: 'Cont 20FR', desc: '(20ft Flat Rack)' },
    { value: '40FR', label: 'Cont 40FR', desc: '(40ft Flat Rack)' },
    { value: '20OT', label: 'Cont 20OT', desc: '(20ft Open Top)' },
    { value: '40OT', label: 'Cont 40OT', desc: '(40ft Open Top)' }
];

function populateBookingContainerSizeOptions(containerTypes) {
    if (!Array.isArray(containerTypes) || containerTypes.length === 0) return;
    BOOKING_CONTAINER_SIZE_OPTIONS = containerTypes.map(item => {
        const code = item.code || '';
        const name = item.name || '';
        let desc = '';
        if (name) {
            const shortName = name.replace(/^Container\s+/i, '');
            desc = `(${shortName})`;
        }
        return {
            value: code,
            label: `Cont ${code}`,
            desc: desc
        };
    });
    renderBookingContainerSizeDropdownList('fullpage-');
    renderBookingContainerSizeDropdownList('');
}
window.populateBookingContainerSizeOptions = populateBookingContainerSizeOptions;

function renderBookingContainerSizeDropdownList(prefix = '') {
    const listEl = document.getElementById(prefix + 'booking-container-size-list');
    if (!listEl) return;
    const cbName = prefix === 'fullpage-' ? 'fullpage-cont-size-cb' : 'cont-size-cb';
    const currentValues = Array.from(document.querySelectorAll(`input[name="${cbName}"]:checked`)).map(cb => cb.value);
    const effectiveValues = currentValues.length > 0 ? currentValues : ['20GP'];

    const padCls = prefix === 'fullpage-' ? 'px-2 py-1.5' : 'px-2 py-1';
    const cbSize = prefix === 'fullpage-' ? 'w-4 h-4' : 'w-3.5 h-3.5';
    const descSize = prefix === 'fullpage-' ? 'text-[11px]' : 'text-[10.5px]';

    listEl.innerHTML = BOOKING_CONTAINER_SIZE_OPTIONS.map(opt => {
        const isChecked = effectiveValues.includes(opt.value) ? 'checked' : '';
        return `
            <label class="flex items-center gap-2.5 ${padCls} hover:bg-teal-50/70 rounded-lg cursor-pointer transition-colors text-xs text-slate-800 select-none">
                <input type="checkbox" name="${cbName}" value="${opt.value}" ${isChecked} onchange="onBookingContainerSizeChange('${prefix}')"
                    class="${cbSize} text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer">
                <span class="font-bold">${opt.label}</span> ${opt.desc ? `<span class="text-slate-500 ${descSize}">${opt.desc}</span>` : ''}
            </label>
        `;
    }).join('');

    onBookingContainerSizeChange(prefix);
}
window.renderBookingContainerSizeDropdownList = renderBookingContainerSizeDropdownList;

function toggleBookingContainerSizeDropdown(prefix = '') {
    const dropdown = document.getElementById(prefix + 'booking-container-size-dropdown');
    const icon = document.getElementById(prefix + 'booking-container-size-icon');
    if (!dropdown) return;
    const isHidden = dropdown.classList.contains('hidden');
    // Đóng dropdown khác nếu đang mở
    document.querySelectorAll('[id$="booking-container-size-dropdown"]').forEach(d => {
        if (d !== dropdown) d.classList.add('hidden');
    });
    if (isHidden) {
        dropdown.classList.remove('hidden');
        if (icon) icon.classList.add('rotate-180');
        // Click outside listener
        const closeOnClickOutside = (e) => {
            const wrapper = document.getElementById(prefix + 'wrapper-booking-container-size') || 
                            document.getElementById('wrapper-' + prefix + 'booking-container-size');
            if (wrapper && !wrapper.contains(e.target)) {
                dropdown.classList.add('hidden');
                if (icon) icon.classList.remove('rotate-180');
                document.removeEventListener('click', closeOnClickOutside);
            }
        };
        setTimeout(() => document.addEventListener('click', closeOnClickOutside), 10);
    } else {
        dropdown.classList.add('hidden');
        if (icon) icon.classList.remove('rotate-180');
    }
}

function closeBookingContainerSizeDropdown(prefix = '') {
    const dropdown = document.getElementById(prefix + 'booking-container-size-dropdown');
    const icon = document.getElementById(prefix + 'booking-container-size-icon');
    if (dropdown) dropdown.classList.add('hidden');
    if (icon) icon.classList.remove('rotate-180');
}

function onBookingContainerSizeChange(prefix = '') {
    const cbName = prefix === 'fullpage-' ? 'fullpage-cont-size-cb' : 'cont-size-cb';
    const cbs = Array.from(document.querySelectorAll(`input[name="${cbName}"]`));
    if (cbs.length === 0) return;

    let checkedCbs = cbs.filter(cb => cb.checked);
    
    // Nếu bỏ chọn hết thì tự động chọn lại 20GP
    if (checkedCbs.length === 0) {
        const defaultCb = cbs.find(cb => cb.value === '20GP');
        if (defaultCb) {
            defaultCb.checked = true;
            checkedCbs.push(defaultCb);
        }
    }

    const selectedValues = checkedCbs.map(cb => cb.value);
    const hiddenInput = document.getElementById(prefix + 'booking-container-size');
    const labelEl = document.getElementById(prefix + 'booking-container-size-label');
    const btn = document.getElementById(prefix + 'booking-container-size-btn');

    // Cập nhật chuỗi nối nhau bằng dấu phẩy
    const valStr = selectedValues.join(', ');
    if (hiddenInput && hiddenInput.value !== valStr) {
        hiddenInput.value = valStr;
        hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Hiển thị nhãn trên trigger button
    let displayText = '';
    if (selectedValues.length === 1) {
        const opt = BOOKING_CONTAINER_SIZE_OPTIONS.find(o => o.value === selectedValues[0]);
        displayText = opt ? `${opt.label} ${opt.desc}`.trim() : selectedValues[0];
    } else if (selectedValues.length === 2) {
        displayText = selectedValues.map(v => {
            const opt = BOOKING_CONTAINER_SIZE_OPTIONS.find(o => o.value === v);
            return opt ? opt.label : v;
        }).join(', ');
    } else {
        displayText = `${selectedValues.length} loại cont/xe đã chọn`;
    }

    if (labelEl) labelEl.textContent = displayText;
    if (btn) btn.title = valStr;

    // Tự động kích hoạt tra cứu giá cước
    if (prefix === 'fullpage-' && typeof autoLookupBookingPrice === 'function') {
        autoLookupBookingPrice('fullpage-');
    } else if (!prefix && typeof lookupBookingPrice === 'function') {
        lookupBookingPrice();
    }
}

function selectAllBookingContainerSizes(prefix = '', selectAll = true) {
    const cbName = prefix === 'fullpage-' ? 'fullpage-cont-size-cb' : 'cont-size-cb';
    const cbs = document.querySelectorAll(`input[name="${cbName}"]`);
    cbs.forEach(cb => {
        cb.checked = selectAll;
    });
    onBookingContainerSizeChange(prefix);
}

function setBookingContainerSizes(val, prefix = '') {
    const cbName = prefix === 'fullpage-' ? 'fullpage-cont-size-cb' : 'cont-size-cb';
    const cbs = document.querySelectorAll(`input[name="${cbName}"]`);
    if (!cbs || cbs.length === 0) return;

    let targetCodes = [];
    if (Array.isArray(val)) {
        targetCodes = val.map(v => String(v).trim().toUpperCase());
    } else if (typeof val === 'string' && val.trim()) {
        targetCodes = val.split(',').map(s => s.trim().toUpperCase());
    } else {
        targetCodes = ['20GP'];
    }

    cbs.forEach(cb => {
        const vUpper = cb.value.toUpperCase();
        cb.checked = targetCodes.some(tc => tc === vUpper || tc.includes(vUpper) || vUpper.includes(tc));
    });

    onBookingContainerSizeChange(prefix);
}

function initBookingContainerSizeMultiSelect(prefix = '') {
    const hiddenInput = document.getElementById(prefix + 'booking-container-size');
    if (!hiddenInput) return;

    hiddenInput._bimMultiSelect = {
        set: (v) => setBookingContainerSizes(v, prefix),
        get: () => hiddenInput.value
    };

    // Khởi tạo trạng thái ban đầu dựa vào value hiện tại
    const initVal = hiddenInput.value || '20GP';
    setBookingContainerSizes(initVal, prefix);
}

window.toggleBookingContainerSizeDropdown = toggleBookingContainerSizeDropdown;
window.closeBookingContainerSizeDropdown = closeBookingContainerSizeDropdown;
window.onBookingContainerSizeChange = onBookingContainerSizeChange;
window.selectAllBookingContainerSizes = selectAllBookingContainerSizes;
window.setBookingContainerSizes = setBookingContainerSizes;
window.initBookingContainerSizeMultiSelect = initBookingContainerSizeMultiSelect;

// Tự động khởi tạo multi-select khi tải DOM
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initBookingContainerSizeMultiSelect('fullpage-');
            initBookingContainerSizeMultiSelect('');
        });
    } else {
        initBookingContainerSizeMultiSelect('fullpage-');
        initBookingContainerSizeMultiSelect('');
    }
}
