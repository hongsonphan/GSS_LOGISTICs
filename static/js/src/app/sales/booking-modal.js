// 2. Quản lý multi-files cho Sale / Booking Order
function handleSaleBookingFilesSelect(input) {
    if (!input || !input.files || input.files.length === 0) return;

    for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        if (file.size > 5 * 1024 * 1024) {
            showToast('warning', `File "${file.name}" vượt quá 5MB. Vui lòng chọn file nhẹ hơn.`, 'File Quá Dung Lượng');
            continue;
        }
        const isDuplicate = saleBookingFilesList.some(f => f.name === file.name && f.size === file.size);
        if (!isDuplicate) {
            saleBookingFilesList.push(file);
        }
    }
    input.value = '';
    renderSaleBookingFilesList();
}

function removeSaleBookingNewFile(index) {
    if (index >= 0 && index < saleBookingFilesList.length) {
        saleBookingFilesList.splice(index, 1);
        renderSaleBookingFilesList();
    }
}

async function deleteSaleBookingExistingDoc(docId) {
    if (!currentEditingBookingId || !docId) {
        saleBookingExistingDocs = saleBookingExistingDocs.filter(d => d.id !== docId);
        renderSaleBookingFilesList();
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
        const res = await fetchWithAuth(`/api/bookings/${currentEditingBookingId}/documents/${docId}/`, {
            method: 'DELETE'
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || data.error || 'Lỗi khi xóa tài liệu');

        saleBookingExistingDocs = saleBookingExistingDocs.filter(d => d.id !== docId);
        renderSaleBookingFilesList();
        showToast('success', 'Đã xóa tài liệu đính kèm', 'Thành Công');
    } catch (err) {
        console.error('Lỗi xóa document:', err);
        showToast('error', err.message || 'Không thể xóa tài liệu đính kèm', 'Lỗi');
    }
}

function renderSaleBookingFilesList() {
    const listArea = document.getElementById('booking-order-files-list');
    const summary = document.getElementById('booking-order-files-summary');
    if (!listArea) return;

    let itemsHtml = '';
    const totalCount = saleBookingExistingDocs.length + saleBookingFilesList.length;

    // Render các file đã lưu trong CSDL
    saleBookingExistingDocs.forEach(doc => {
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
                        <button type="button" onclick="deleteSaleBookingExistingDoc(${doc.id})" 
                            class="p-1.5 rounded-md text-rose-600 hover:text-white hover:bg-rose-600 transition-colors shadow-xs" title="Xóa tài liệu này">
                            <i class="ph-bold ph-trash text-sm"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    });

    // Render các file mới chọn chưa lưu
    saleBookingFilesList.forEach((file, idx) => {
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
            <div class="flex items-center justify-between p-2 rounded-lg bg-blue-50 hover:bg-blue-100/60 border border-blue-200 shadow-2xs text-xs transition-colors group">
                ${tempUrl ? `
                    <a href="${tempUrl}" target="_blank" rel="noopener noreferrer" 
                       class="flex items-center space-x-2 truncate pr-2 flex-1 cursor-pointer no-underline" 
                       title="Xem trước file: ${file.name}">
                        <i class="${isPdf ? 'ph-bold ph-file-pdf text-rose-600' : 'ph-bold ph-file-image text-blue-600'} text-base shrink-0 group-hover:scale-110 transition-transform"></i>
                        <div class="truncate">
                            <p class="font-bold text-slate-800 group-hover:text-blue-700 group-hover:underline truncate font-mono text-[11px]" title="${file.name}">${file.name}</p>
                            <span class="text-[10px] text-blue-600 font-medium font-mono">(${sizeStr} - Chờ lưu) · <span class="underline">Xem trước</span></span>
                        </div>
                    </a>
                ` : `
                    <div class="flex items-center space-x-2 truncate pr-2 flex-1">
                        <i class="${isPdf ? 'ph-bold ph-file-pdf text-rose-600' : 'ph-bold ph-file-image text-blue-600'} text-base shrink-0"></i>
                        <div class="truncate">
                            <p class="font-bold text-slate-800 truncate font-mono text-[11px]" title="${file.name}">${file.name}</p>
                            <span class="text-[10px] text-blue-600 font-medium font-mono">(${sizeStr} - Chờ lưu)</span>
                        </div>
                    </div>
                `}
                <div class="flex items-center space-x-1 shrink-0">
                    ${tempUrl ? `
                        <a href="${tempUrl}" target="_blank" rel="noopener noreferrer" 
                            class="p-1.5 rounded-md text-blue-700 hover:text-white hover:bg-blue-600 transition-colors shadow-xs" title="Xem trước">
                            <i class="ph-bold ph-eye text-sm"></i>
                        </a>
                    ` : ''}
                    <button type="button" onclick="removeSaleBookingNewFile(${idx})" 
                        class="p-1.5 rounded-md text-rose-600 hover:text-white hover:bg-rose-600 transition-colors shadow-xs shrink-0" title="Bỏ file này">
                        <i class="ph-bold ph-trash text-sm"></i>
                    </button>
                </div>
            </div>
        `;
    });

    listArea.innerHTML = itemsHtml;
    if (summary) {
        if (totalCount > 0) {
            summary.innerHTML = `<i class="ph-bold ph-check-circle text-emerald-600"></i> <strong class="text-emerald-800">${totalCount}</strong> tệp đính kèm`;
        } else {
            summary.innerHTML = `<i class="ph ph-info text-blue-500"></i> Chưa có tệp nào được đính kèm`;
        }
    }
}

function clearSaleBookingFileSelection() {
    const input = document.getElementById('booking-order-file');
    if (input) input.value = '';
    saleBookingFilesList = [];
    saleBookingExistingDocs = [];
    currentEditingBookingId = null;
    renderSaleBookingFilesList();
}


function onBookingTypeChange() {
    applyBookingFormTypeAdapters('');
}
window.onBookingTypeChange = onBookingTypeChange;

async function openModalBooking(bookingId = null, isReadOnly = false) {
    if (!bookingId) {
        return openCreateBookingPage(true);
    } else {
        return viewBookingDetail(bookingId, true);
    }
}

function enableEditBookingModal() {
    const form = document.getElementById('form-booking');
    if (form) {
        form.querySelectorAll('input, select, textarea, button').forEach(el => el.disabled = false);
    }
    const titleEl = document.getElementById('modal-booking-title');
    if (titleEl && !titleEl.innerText.startsWith('Hiệu Chỉnh')) {
        titleEl.innerText = titleEl.innerText.replace('Chi Tiết', 'Hiệu Chỉnh');
    }
    const editModalBtn = document.getElementById('btn-edit-booking-modal');
    if (editModalBtn) editModalBtn.classList.add('hidden');
    const submitBtn = document.getElementById('btn-submit-booking');
    if (submitBtn) submitBtn.style.display = 'inline-flex';
    if (typeof onBookingTypeChange === 'function') onBookingTypeChange();
}
window.enableEditBookingModal = enableEditBookingModal;

async function saveBooking(e) {
    if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
    }
    const id = document.getElementById('booking-id')?.value;
    const bookingType = document.getElementById('booking-type')?.value || 'EXPORT_FCL';
    const customer = document.getElementById('booking-customer')?.value?.trim();
    const bookingNumber = document.getElementById('booking-number')?.value?.trim();
    let shippingLine = document.getElementById('booking-shipping-line')?.value?.trim();
    let vessel = document.getElementById('booking-vessel')?.value?.trim();
    const containerSize = document.getElementById('booking-container-size')?.value || '40HC';
    const totalContainers = parseNumberVN(document.getElementById('booking-total-containers')?.value) || 1;
    const commodity = document.getElementById('booking-commodity')?.value?.trim();
    let hsCode = document.getElementById('booking-hs-code')?.value?.trim();
    const pickup = document.getElementById('booking-pickup')?.value?.trim();
    const delivery = document.getElementById('booking-delivery')?.value?.trim();
    let dropoff = document.getElementById('booking-dropoff')?.value?.trim();
    const loadingDate = document.getElementById('booking-loading-date')?.value;
    const loadingTime = formatTimeString(document.getElementById('booking-loading-time')?.value?.trim() || '08:00');
    syncBookingClosingTime();
    syncBookingSiTime();
    let closingTime = document.getElementById('booking-closing-time')?.value?.trim();
    let siCutoff = document.getElementById('booking-si-cutoff')?.value?.trim();
    let det = parseNumberVN(document.getElementById('booking-det')?.value);
    let dem = parseNumberVN(document.getElementById('booking-dem')?.value);
    const price = parseNumberVN(document.getElementById('booking-price')?.value) || 0;
    const statusVal = document.getElementById('booking-status')?.value || 'PENDING_DISPATCH';
    const notes = document.getElementById('booking-notes')?.value?.trim();

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

    if (!customer || !bookingNumber || !pickup || !delivery || (bookingType !== 'DOMESTIC' && !dropoff)) {
        showToast('warning', 'Vui lòng điền đủ: Khách hàng, Số đơn/booking và Lộ trình vận chuyển', 'Thiếu Thông Tin');
        return;
    }

    if (!price || price <= 0) {
        showToast('warning', 'Đơn giá cước vận chuyển là bắt buộc và phải lớn hơn 0! Vui lòng kiểm tra và nhập giá cước bán.', 'Chưa Nhập Giá Cước');
        const priceInput = document.getElementById('booking-price');
        if (priceInput) {
            priceInput.focus();
            priceInput.classList.add('border-rose-500', 'bg-rose-50');
            const hintEl = document.getElementById('booking-price-hint');
            if (hintEl) {
                hintEl.innerHTML = '<span class="text-rose-600 font-bold flex items-center gap-1"><i class="ph-bold ph-warning text-xs"></i> Bắt buộc nhập đơn giá cước vận chuyển (> 0 đ)!</span>';
                hintEl.classList.remove('hidden');
            }
        }
        return;
    }

    const submitBtn = document.getElementById('btn-submit-booking');
    const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="ph-bold ph-spinner animate-spin text-base"></i> <span>Đang lưu...</span>';
    }

    try {
        const saleFileInput = document.getElementById('booking-order-file');
        const hasSaleFile = saleFileInput && saleFileInput.files && saleFileInput.files[0];

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

        if (saleBookingFilesList && saleBookingFilesList.length > 0) {
            formData.append('booking_file', saleBookingFilesList[0]);
            saleBookingFilesList.forEach(file => {
                formData.append('booking_files', file);
            });
        } else if (hasSaleFile) {
            formData.append('booking_file', saleFileInput.files[0]);
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

        showToast('success', data.message || 'Tiếp nhận đơn hàng thành công!', 'Thành Công');
        closeModal('modal-booking');
        clearSaleBookingFileSelection();
        loadSalesData();
        loadActiveBookingsForModal();
    } catch (err) {
        console.error('Error saving booking:', err);
        showToast('error', err.message || 'Không thể lưu đơn hàng / booking', 'Lỗi');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHtml;
        }
    }
}


async function deleteBooking(bookingId) {
    const confirmed = await showConfirmModal({
        title: 'Hủy / Xóa Đơn Hàng',
        message: 'Bạn có chắc chắn muốn xóa / hủy đơn hàng này không?\n\nDữ liệu lịch sử sẽ được bảo lưu an toàn (Soft-Delete).',
        confirmText: 'Xác Nhận Xóa',
        cancelText: 'Huỷ bỏ',
        type: 'danger',
        icon: 'ph-bold ph-trash text-2xl'
    });
    if (!confirmed) return;
    try {
        const res = await fetchWithAuth(`/api/bookings/${bookingId}/`, {
            method: 'DELETE'
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || data.error || data.detail || 'Lỗi xóa đơn hàng');

        showToast('success', data.message || 'Đã xóa đơn hàng / booking', 'Thành Công');
        loadSalesData();
        loadActiveBookingsForModal();
    } catch (err) {
        console.error('Error deleting booking:', err);
        showToast('error', err.message || 'Lỗi xóa đơn hàng / booking', 'Lỗi');
    }
}
