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
            if (typeof checkAndSyncMasterData === 'function') {
                await checkAndSyncMasterData(false);
            } else if (typeof loadMasterDataFormOptions === 'function') {
                await loadMasterDataFormOptions();
            }
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
    if (typeof checkAndSyncMasterData === 'function') {
        await checkAndSyncMasterData(false);
    } else {
        await loadMasterDataFormOptions();
    }
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
