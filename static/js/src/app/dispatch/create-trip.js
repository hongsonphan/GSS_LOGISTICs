function backToTrips() {
    document.getElementById('view-trip-detail').classList.add('hidden-view');
    if (previousActiveTab && previousActiveTab !== 'trip-detail') {
        switchTab(previousActiveTab, true);
    } else {
        switchTab('dieu-van', true);
    }
}

function backToDispatch() {
    const createTripView = document.getElementById('view-create-trip');
    if (createTripView) createTripView.classList.add('hidden-view');
    if (previousActiveTab && previousActiveTab !== 'create-trip') {
        switchTab(previousActiveTab, true);
    } else {
        switchTab('dieu-van', true);
    }
}

async function openCreateTripPage(bookingId = null, updateHistory = true) {
    await loadMasterDataFormOptions();
    populateMasterDataDropdowns();

    const form = document.getElementById('form-create-trip');
    if (form) form.reset();

    clearBookingFileSelection();

    const chk = document.getElementById('chk-drop-hook');
    if (chk) {
        chk.checked = true;
        toggleDropHookMode(true);
    }
    const chkTwin = document.getElementById('chk-twin-cont');
    if (chkTwin) {
        chkTwin.checked = false;
        toggleTwinContMode(false);
    }

    initDefaultDatesForCreateTrip();
    onFreeDaysChange();
    if (typeof handleCargoTypeChange === 'function') {
        handleCargoTypeChange();
    }

    await loadActiveBookingsForModal(bookingId);

    const inheritedBadge = document.getElementById('fullpage-trip-badge-inherited');
    if (inheritedBadge) {
        if (bookingId) {
            inheritedBadge.classList.remove('hidden');
        } else {
            inheritedBadge.classList.add('hidden');
        }
    }

    if (updateHistory && window.history && window.history.pushState) {
        const tripNewPath = bookingId ? `/dispatch/trips/new?booking_id=${bookingId}` : '/dispatch/trips/new';
        if (window.location.pathname !== '/dispatch/trips/new') {
            window.history.pushState({ view: 'create-trip', bookingId }, '', tripNewPath);
        }
    }

    const currentActiveView = document.querySelector('.view:not(.hidden-view)');
    if (currentActiveView && currentActiveView.id !== 'view-create-trip') {
        previousActiveTab = currentActiveView.id.replace('view-', '');
    }

    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden-view'));
    const createTripView = document.getElementById('view-create-trip');
    if (createTripView) createTripView.classList.remove('hidden-view');

    setTopbarFullpageMode({
        backFn: backToDispatch,
        prefix: 'Điều Vận',
        title: 'Tạo Lệnh Điều Động',
        subText: '',
        badgesHtml: '',
        actionsHtml: ''
    });

    initAllNumberInputs();
}

// =========================================================================
// 1.1 LOGIC THEO LOẠI HÌNH VẬN CHUYỂN: XUẤT / NHẬP / NỘI ĐỊA (CHUẨN NGÀNH)
// =========================================================================
function handleCargoTypeChange() {
    const typeEl = document.getElementById('inp-type');
    if (!typeEl) return;
    const type = typeEl.value; // 'Xuất', 'Nhập', 'Nội địa'

    const colCutoff = document.getElementById('col-cutoff');
    const secDemDet = document.getElementById('section-dem-det');

    const cutoffDate = document.getElementById('inp-cutoff-date');
    const cutoffTime = document.getElementById('inp-cutoff-time');

    const detDays = document.getElementById('inp-det-free-days');
    const detExpiry = document.getElementById('inp-det-expiry');
    const contCond = document.getElementById('select-container-condition');
    const damageDesc = document.getElementById('inp-damage-desc');

    if (type === 'Xuất') {
        // Hàng Xuất: CẦN Cắt CY/SI (Closing time tàu xuất). KHÔNG CẦN Free DEM/DET & EIR bốc dỡ
        if (colCutoff) {
            colCutoff.classList.remove('opacity-40', 'pointer-events-none', 'select-none');
            if (cutoffDate) cutoffDate.disabled = false;
            if (cutoffTime) cutoffTime.disabled = false;
        }
        if (secDemDet) {
            secDemDet.classList.add('opacity-40', 'pointer-events-none', 'select-none');
            if (detDays) detDays.disabled = true;
            if (detExpiry) detExpiry.disabled = true;
            if (contCond) contCond.disabled = true;
            if (damageDesc) damageDesc.disabled = true;
        }
    } else if (type === 'Nhập') {
        // Hàng Nhập: CẦN Hạn Free DEM/DET & Giám định vỏ EIR. KHÔNG CÓ Closing time tàu xuất
        if (colCutoff) {
            colCutoff.classList.add('opacity-40', 'pointer-events-none', 'select-none');
            if (cutoffDate) { cutoffDate.disabled = true; cutoffDate.value = ''; }
            if (cutoffTime) { cutoffTime.disabled = true; }
        }
        if (secDemDet) {
            secDemDet.classList.remove('opacity-40', 'pointer-events-none', 'select-none');
            if (detDays) detDays.disabled = false;
            if (detExpiry) detExpiry.disabled = false;
            if (contCond) contCond.disabled = false;
            if (damageDesc) damageDesc.disabled = false;
        }
    } else if (type === 'Nội địa') {
        // Hàng Nội Địa: KHÔNG CẦN CẢ HAI MỤC TRÊN (Không có tàu quốc tế, không có Free DEM/DET ngoại tệ)
        if (colCutoff) {
            colCutoff.classList.add('opacity-40', 'pointer-events-none', 'select-none');
            if (cutoffDate) { cutoffDate.disabled = true; cutoffDate.value = ''; }
            if (cutoffTime) { cutoffTime.disabled = true; }
        }
        if (secDemDet) {
            secDemDet.classList.add('opacity-40', 'pointer-events-none', 'select-none');
            if (detDays) detDays.disabled = true;
            if (detExpiry) detExpiry.disabled = true;
            if (contCond) contCond.disabled = true;
            if (damageDesc) damageDesc.disabled = true;
        }
    }
}
window.handleCargoTypeChange = handleCargoTypeChange;

// =========================================================================
// 1.2 TẠO NHANH TÀI XẾ CHO ĐIỀU ĐỘ HIỆN TRƯỜNG (CHỈ CẦN TÊN & SĐT)
// =========================================================================
let quickDriverTargetId = 'inp-driver-leg1';

function openQuickCreateDriverModal(targetSelectId = 'inp-driver-leg1') {
    quickDriverTargetId = targetSelectId || 'inp-driver-leg1';
    const targetInput = document.getElementById('quick-driver-target-select-id');
    if (targetInput) targetInput.value = quickDriverTargetId;

    const form = document.getElementById('form-quick-create-driver');
    if (form) form.reset();

    const modal = document.getElementById('modal-quick-create-driver');
    if (modal) {
        modal.classList.remove('hidden-view');
        modal.style.display = 'flex';
    }

    const nameInput = document.getElementById('inp-quick-driver-name');
    if (nameInput) setTimeout(() => nameInput.focus(), 100);
}
window.openQuickCreateDriverModal = openQuickCreateDriverModal;

function closeQuickCreateDriverModal() {
    const modal = document.getElementById('modal-quick-create-driver');
    if (modal) {
        modal.classList.add('hidden-view');
        modal.style.display = 'none';
    }
}
window.closeQuickCreateDriverModal = closeQuickCreateDriverModal;

async function submitQuickCreateDriver() {
    const nameEl = document.getElementById('inp-quick-driver-name');
    const phoneEl = document.getElementById('inp-quick-driver-phone');
    const btn = document.getElementById('btn-submit-quick-driver');

    const fullName = nameEl ? nameEl.value.trim() : '';
    const phone = phoneEl ? phoneEl.value.trim() : '';

    if (!fullName) {
        showToast('warning', 'Vui lòng nhập Họ & Tên tài xế.');
        if (nameEl) nameEl.focus();
        return;
    }
    if (!phone) {
        showToast('warning', 'Vui lòng nhập Số điện thoại tài xế.');
        if (phoneEl) phoneEl.focus();
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="ph-bold ph-spinner animate-spin text-sm"></i> Đang lưu...';
    }

    try {
        const res = await fetchWithAuth('/api/personnel/drivers/quick-create/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name: fullName, phone_number: phone })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            showToast('success', data.message || 'Đã thêm tài xế thành công.');
            closeQuickCreateDriverModal();

            // Cập nhật Master Data cache
            await loadMasterDataFormOptions(true);
            populateMasterDataDropdowns();

            // Tự động gán tài xế vừa tạo vào ô chọn mục tiêu
            const newDriverData = data.data;
            const targetEl = document.getElementById(quickDriverTargetId);
            if (targetEl && newDriverData) {
                setSelectValueCaseInsensitive(targetEl, newDriverData.nickname || newDriverData.full_name);
                if (typeof targetEl.onchange === 'function') targetEl.onchange();
            }
        } else {
            showToast('danger', data.message || 'Không thể tạo tài xế. Vui lòng kiểm tra lại.');
        }
    } catch (err) {
        console.error('Lỗi tạo nhanh tài xế:', err);
        showToast('danger', 'Lỗi kết nối máy chủ khi tạo tài xế.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="ph-bold ph-check text-sm"></i> Lưu & Chọn Ngay';
        }
    }
}
window.submitQuickCreateDriver = submitQuickCreateDriver;

// ========================================================================
// 1.3 NHÂN BẢN LỆNH ĐIỀU VẬN (DUPLICATE TRIP / MULTI-CONT BOOKING)
// Quy chuẩn nghiệp vụ Logistics TMS:
// - Kế thừa thông tin Khách hàng & Lô hàng (Khách hàng, Loại hình, Quy cách Cont, Booking, Hãng tàu).
// - Tuyến vận chuyển: CHỈ kế thừa Điểm đầu (1. Nơi lấy); 2 điểm sau (Nơi đóng/trả và Nơi hạ) BỎ TRỐNG để chọn lại.
// - Toàn bộ Tài xế, Xe, Doanh thu, Chi phí, Số Cont, Số Seal, VGM, Ghi chú BỎ TRỐNG 100% để tránh xung đột lịch trình và sai lệch cước.
// ========================================================================
async function duplicateCurrentTrip() {
    const trip = window.currentTripDetail || currentActiveTripData;
    if (!trip) {
        showToast('warning', 'Không tìm thấy dữ liệu chuyến để nhân bản.');
        return;
    }

    // 1. Mở trang tạo lệnh điều vận (truyền null để không tự nạp đè điểm đến từ Sale Booking)
    await openCreateTripPage(null);

    // 2. Điền dữ liệu kế thừa từ chuyến cũ theo chuẩn phân tích
    populateTripFormForDuplicate(trip);

    // 3. Thông báo trực quan
    const tripCode = trip.trip_code || trip.id || 'hiện tại';
    showToast('info', `Đã nhân bản Khách hàng & Điểm đầu từ lệnh ${tripCode}. Vui lòng chọn Kho/Điểm hạ và nhập Số Cont.`);
}
window.duplicateCurrentTrip = duplicateCurrentTrip;

function populateTripFormForDuplicate(trip) {
    if (!trip) return;

    // 1. KẾ THỪA THÔNG TIN KHÁCH HÀNG & LÔ HÀNG (Customer Context)
    const custEl = document.getElementById('inp-customer');
    if (custEl) setSelectValueCaseInsensitive(custEl, trip.customer || trip.customer_name);

    const typeEl = document.getElementById('inp-type');
    if (typeEl) {
        setSelectValueCaseInsensitive(typeEl, trip.cargo_type || trip.type || 'Xuất');
        handleCargoTypeChange();
    }

    const contTypeEl = document.getElementById('inp-cont-type');
    if (contTypeEl) setSelectValueCaseInsensitive(contTypeEl, trip.container_type || trip.container_size || '40HC');

    // 2. Booking / Vận đơn, Hãng tàu, Tàu chuyến (Thông tin dùng chung của lô cont)
    const bookingEl = document.getElementById('inp-booking');
    if (bookingEl) bookingEl.value = trip.booking_or_bill || trip.booking || '';

    const slEl = document.getElementById('inp-shipping-line');
    if (slEl) slEl.value = trip.shipping_line || '';

    const vesselEl = document.getElementById('inp-vessel');
    if (vesselEl) vesselEl.value = trip.vessel_name || trip.vessel || '';

    const voyageEl = document.getElementById('inp-voyage');
    if (voyageEl) voyageEl.value = trip.voyage_number || trip.voyage || '';

    // Cắt CY/SI (nếu hàng xuất)
    if (trip.cutoff_time) {
        parseAndSetDateTimeFields(trip.cutoff_time, 'inp-cutoff-date', 'inp-cutoff-time', 'inp-cutoff', '17:00');
    }

    // Free DEM/DET (nếu hàng nhập)
    if (trip.free_det_days) {
        const detEl = document.getElementById('inp-det-free-days');
        if (detEl) detEl.value = trip.free_det_days;
    }

    // 3. TUYẾN ĐƯỜNG: CHỈ KẾ THỪA ĐIỂM ĐẦU, 2 ĐIỂM SAU BỎ TRỐNG ĐỂ CHỌN LẠI
    // Điểm 1: Nơi lấy cont / Depot rỗng -> KẾ THỪA
    const pickupEl = document.getElementById('inp-pickup');
    if (pickupEl) setSelectValueCaseInsensitive(pickupEl, trip.pickup_location || trip.pickup_depot);

    // Điểm 2: Nơi đóng/trả (Kho KH) -> BỎ TRỐNG
    const warehouseEl = document.getElementById('inp-warehouse');
    if (warehouseEl) warehouseEl.value = '';

    // Điểm 3: Nơi hạ (Bãi rỗng / Cảng) -> BỎ TRỐNG
    const dropoffEl = document.getElementById('inp-dropoff');
    if (dropoffEl) dropoffEl.value = '';

    // 4. BỎ TRỐNG TOÀN BỘ CÁC TRƯỜNG RIÊNG CỦA TỪNG CONT (Số cont, seal, cân nặng, invoice, dock, EIR)
    const contEl = document.getElementById('inp-cont');
    if (contEl) contEl.value = '';
    const contNoEl = document.getElementById('inp-cont-no');
    if (contNoEl) contNoEl.value = '';

    const sealEl = document.getElementById('inp-seal');
    if (sealEl) sealEl.value = '';
    const sealNoEl = document.getElementById('inp-seal-no');
    if (sealNoEl) sealNoEl.value = '';

    const vgmEl = document.getElementById('inp-vgm');
    if (vgmEl) vgmEl.value = '';

    const invEl = document.getElementById('inp-invoice');
    if (invEl) invEl.value = '';

    const dockEl = document.getElementById('inp-dock');
    if (dockEl) dockEl.value = '';

    const loadTimeEl = document.getElementById('inp-load-time');
    if (loadTimeEl) loadTimeEl.value = '08:00';

    const condEl = document.getElementById('select-container-condition');
    if (condEl) condEl.value = 'GOOD';

    const damageEl = document.getElementById('inp-damage-desc');
    if (damageEl) damageEl.value = '';

    // Tắt twin cont (nếu có)
    const chkTwin = document.getElementById('chk-twin-cont');
    if (chkTwin) {
        chkTwin.checked = false;
        if (typeof toggleTwinContMode === 'function') toggleTwinContMode(false);
    }

    // 5. BỎ TRỐNG TOÀN BỘ ĐIỀU ĐỘ XE & TÀI XẾ (Tránh xung đột lịch trình & điều trùng xe)
    // Mặc định Cắt Kéo Bật
    const chkDropHook = document.getElementById('chk-drop-hook');
    if (chkDropHook) {
        chkDropHook.checked = true;
        if (typeof toggleDropHookMode === 'function') toggleDropHookMode(true);
    }

    // Reset Tài xế & Xe Chặng 1 và Chặng 2
    const drv1 = document.getElementById('inp-driver-leg1');
    if (drv1) drv1.value = '';
    const veh1 = document.getElementById('inp-vehicle-leg1');
    if (veh1) veh1.value = '';

    const drv2 = document.getElementById('inp-dropoff-driver');
    if (drv2) drv2.value = '';
    const veh2 = document.getElementById('inp-dropoff-vehicle');
    if (veh2) veh2.value = '';

    // Reset Tài xế & Xe Chạy thẳng
    const drv = document.getElementById('inp-driver');
    if (drv) drv.value = '';
    const veh = document.getElementById('inp-vehicle');
    if (veh) veh.value = '';

    // Reset 3PL
    const subSel = document.getElementById('inp-subcontractor');
    if (subSel) subSel.value = '';
    const subVeh = document.getElementById('inp-sub-vehicle');
    if (subVeh) subVeh.value = '';
    const subDrv = document.getElementById('inp-sub-driver');
    if (subDrv) subDrv.value = '';
    const subCost = document.getElementById('inp-sub-cost');
    if (subCost) subCost.value = '';
    const subAdv = document.getElementById('inp-sub-advance');
    if (subAdv) subAdv.value = '';
    const subNotes = document.getElementById('inp-sub-notes');
    if (subNotes) subNotes.value = '';

    // Reset Ghi chú chuyến
    const notesEl = document.getElementById('inp-notes');
    if (notesEl) notesEl.value = '';
    const notesDh = document.getElementById('inp-notes-drop-hook');
    if (notesDh) notesDh.value = '';

    // Reset Doanh thu & Cước (vì chưa chốt 2 điểm giao/hạ)
    const revEl = document.getElementById('inp-revenue');
    if (revEl) revEl.value = '';
    const revAdjEl = document.getElementById('inp-revenue-adj');
    if (revAdjEl) revAdjEl.value = '';

    // 6. Kế thừa file Booking đính kèm (nếu có)
    if (trip.booking_file_url) {
        showInheritedBookingFile(trip.booking_file_url, trip.booking_file_name || `Booking_${trip.booking_or_bill || ''}`);
    }

    // 7. TỰ ĐỘNG FOCUS VÀO Ô 2. NƠI ĐÓNG/TRẢ HÀNG
    setTimeout(() => {
        if (warehouseEl) {
            warehouseEl.focus();
        } else if (contEl) {
            contEl.focus();
        }
    }, 200);
}
window.populateTripFormForDuplicate = populateTripFormForDuplicate;

// --- XỬ LÝ ĐÍNH KÈM FILE BOOKING / LỆNH CẤP RỖNG (TRIP DISPATCH & SALE) ---
let currentInheritedBookingFile = null;
let tripBookingFilesList = [];
let saleBookingFilesList = [];
let saleBookingExistingDocs = [];
let currentEditingBookingId = null;

function setBookingTime(timeStr) {
    const el = document.getElementById('booking-loading-time');
    if (el) {
        el.value = timeStr;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

function syncBookingClosingTime() {
    const d = document.getElementById('booking-closing-date')?.value;
    const t = document.getElementById('booking-closing-time-val')?.value || '17:00';
    const hidden = document.getElementById('booking-closing-time');
    if (hidden) {
        hidden.value = d ? `${d} ${t}` : '';
    }
}

function setBookingClosingTime(timeStr) {
    const el = document.getElementById('booking-closing-time-val');
    if (el) el.value = timeStr;
    syncBookingClosingTime();
}

function syncBookingSiTime() {
    const d = document.getElementById('booking-si-date')?.value;
    const t = document.getElementById('booking-si-time-val')?.value || '12:00';
    const hidden = document.getElementById('booking-si-cutoff');
    if (hidden) {
        hidden.value = d ? `${d} ${t}` : '';
    }
}

function setBookingSiTime(timeStr) {
    const el = document.getElementById('booking-si-time-val');
    if (el) el.value = timeStr;
    syncBookingSiTime();
}

function syncTripCutoff() {
    const d = document.getElementById('inp-cutoff-date')?.value;
    const t = document.getElementById('inp-cutoff-time')?.value || '17:00';
    const hidden = document.getElementById('inp-cutoff');
    if (hidden) {
        hidden.value = d ? `${d} ${t}` : '';
    }
}

function setTripCutoffTime(timeStr) {
    const el = document.getElementById('inp-cutoff-time');
    if (el) el.value = timeStr;
    syncTripCutoff();
}

function parseAndSetDateTimeFields(rawStr, dateInputId, timeInputId, hiddenInputId, defaultTime = '17:00') {
    const dateEl = document.getElementById(dateInputId);
    const timeEl = document.getElementById(timeInputId);
    const hiddenEl = document.getElementById(hiddenInputId);
    if (!rawStr || typeof rawStr !== 'string') {
        if (dateEl) dateEl.value = '';
        if (timeEl) timeEl.value = defaultTime;
        if (hiddenEl) hiddenEl.value = '';
        return;
    }
    const val = rawStr.trim();
    if (hiddenEl) hiddenEl.value = val;

    let foundDate = '';
    let foundTime = defaultTime;

    // Check ISO date YYYY-MM-DD
    const isoDateMatch = val.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (isoDateMatch) {
        foundDate = isoDateMatch[1];
    } else {
        // Check VN date DD/MM/YYYY or DD/MM
        const vnDateMatch = val.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/);
        if (vnDateMatch) {
            const day = String(vnDateMatch[1]).padStart(2, '0');
            const month = String(vnDateMatch[2]).padStart(2, '0');
            const year = vnDateMatch[3] ? vnDateMatch[3] : new Date().getFullYear();
            foundDate = `${year}-${month}-${day}`;
        }
    }

    // Check Time HH:MM (có thể kèm AM/PM) or HHhMM or HHh
    const timeAmPmMatch = val.match(/\b(\d{1,2}):(\d{2})(?::\d{2})?\s*([aApP][mM])?\b/i);
    if (timeAmPmMatch) {
        let hhNum = parseInt(timeAmPmMatch[1], 10);
        const mmNum = parseInt(timeAmPmMatch[2], 10);
        const ampm = timeAmPmMatch[3] ? timeAmPmMatch[3].toUpperCase() : null;
        if (ampm === 'PM' && hhNum < 12) {
            hhNum += 12;
        } else if (ampm === 'AM' && hhNum === 12) {
            hhNum = 0;
        }
        if (hhNum >= 0 && hhNum <= 23 && mmNum >= 0 && mmNum <= 59) {
            foundTime = `${String(hhNum).padStart(2, '0')}:${String(mmNum).padStart(2, '0')}`;
        }
    } else {
        const hourOnlyMatch = val.match(/\b(\d{1,2})h(?:(\d{2}))?\b/i);
        if (hourOnlyMatch) {
            const hh = String(hourOnlyMatch[1]).padStart(2, '0');
            const mm = hourOnlyMatch[2] ? String(hourOnlyMatch[2]).padStart(2, '0') : '00';
            foundTime = `${hh}:${mm}`;
        }
    }

    if (dateEl && foundDate) dateEl.value = foundDate;
    if (timeEl && foundTime) timeEl.value = foundTime;

    if (dateEl && dateEl.value && timeEl && timeEl.value) {
        if (hiddenEl) hiddenEl.value = `${dateEl.value} ${timeEl.value}`;
    }
}

// 1. Quản lý file đính kèm cho Lệnh điều động (Trip modal)
function handleBookingFilesSelect(input) {
    if (!input || !input.files || input.files.length === 0) return;
    
    for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        if (file.size > 5 * 1024 * 1024) {
            showToast('warning', `File "${file.name}" vượt quá 5MB. Vui lòng chọn file nhẹ hơn.`, 'File Quá Dung Lượng');
            continue;
        }
        // Tránh trùng tên & kích thước
        const isDuplicate = tripBookingFilesList.some(f => f.name === file.name && f.size === file.size);
        if (!isDuplicate) {
            tripBookingFilesList.push(file);
        }
    }
    input.value = '';
    renderTripBookingFilesList();
}

function removeTripBookingFile(index) {
    if (index >= 0 && index < tripBookingFilesList.length) {
        tripBookingFilesList.splice(index, 1);
        renderTripBookingFilesList();
    }
}

function renderTripBookingFilesList() {
    const area = document.getElementById('booking-files-list-area');
    const summary = document.getElementById('booking-file-summary');
    if (!area) return;

    let itemsHtml = '';
    let totalCount = tripBookingFilesList.length;

    // Nếu có file kế thừa từ booking cha
    if (currentInheritedBookingFile && currentInheritedBookingFile.url) {
        totalCount += 1;
        const isPdf = currentInheritedBookingFile.url.toLowerCase().endsWith('.pdf');
        itemsHtml += `
            <div class="flex items-center justify-between p-2 rounded-lg bg-teal-50 border border-teal-200 text-xs">
                <div class="flex items-center space-x-2 truncate pr-2">
                    <i class="${isPdf ? 'ph-bold ph-file-pdf text-rose-600' : 'ph-bold ph-file-image text-teal-600'} text-base shrink-0"></i>
                    <div class="truncate">
                        <p class="font-bold text-teal-900 truncate" title="${currentInheritedBookingFile.name || 'File Booking'}">${currentInheritedBookingFile.name || 'File Booking'}</p>
                        <span class="text-[10px] text-teal-700 italic font-medium">(Kế thừa từ Booking)</span>
                    </div>
                </div>
                <div class="flex items-center space-x-1 shrink-0">
                    <a href="${currentInheritedBookingFile.url}" target="_blank" rel="noopener noreferrer" 
                        class="p-1 rounded text-teal-700 hover:text-teal-900 hover:bg-teal-100 transition-colors" title="Mở xem file">
                        <i class="ph-bold ph-arrow-square-out text-sm"></i>
                    </a>
                    <button type="button" onclick="removeInheritedBookingFile()" 
                        class="p-1 rounded text-rose-600 hover:text-rose-800 hover:bg-rose-50 transition-colors" title="Gỡ bỏ file kế thừa">
                        <i class="ph-bold ph-trash text-sm"></i>
                    </button>
                </div>
            </div>
        `;
    }

    tripBookingFilesList.forEach((file, idx) => {
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        const sizeKb = (file.size / 1024).toFixed(0);
        const sizeStr = file.size >= 1024 * 1024 ? `${sizeMb} MB` : `${sizeKb} KB`;
        const tempUrl = URL.createObjectURL(file);

        itemsHtml += `
            <div class="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 shadow-2xs text-xs">
                <div class="flex items-center space-x-2 truncate pr-2">
                    <i class="${isPdf ? 'ph-bold ph-file-pdf text-rose-600' : 'ph-bold ph-file-image text-blue-600'} text-base shrink-0"></i>
                    <div class="truncate">
                        <p class="font-bold text-slate-800 truncate" title="${file.name}">${file.name}</p>
                        <span class="text-[10px] text-slate-400 font-medium">(${sizeStr})</span>
                    </div>
                </div>
                <div class="flex items-center space-x-1 shrink-0">
                    <a href="${tempUrl}" target="_blank" rel="noopener noreferrer" 
                        class="p-1 rounded text-blue-700 hover:text-blue-900 hover:bg-blue-50 transition-colors" title="Xem trước">
                        <i class="ph-bold ph-eye text-sm"></i>
                    </a>
                    <button type="button" onclick="removeTripBookingFile(${idx})" 
                        class="p-1 rounded text-rose-600 hover:text-rose-800 hover:bg-rose-50 transition-colors" title="Xóa file">
                        <i class="ph-bold ph-trash text-sm"></i>
                    </button>
                </div>
            </div>
        `;
    });

    area.innerHTML = itemsHtml;
    if (summary) {
        if (totalCount > 0) {
            summary.innerHTML = `<i class="ph-bold ph-check-circle text-emerald-600"></i> <strong class="text-emerald-800">${totalCount}</strong> tệp đính kèm`;
        } else {
            summary.innerHTML = `<i class="ph ph-info text-blue-500"></i> Chưa có tệp nào được đính kèm (hoặc kế thừa từ Booking)`;
        }
    }
}

function clearBookingFileSelection() {
    const input = document.getElementById('inp-booking-file');
    if (input) input.value = '';
    tripBookingFilesList = [];
    currentInheritedBookingFile = null;
    renderTripBookingFilesList();
}

function showInheritedBookingFile(fileUrl, fileName) {
    if (!fileUrl) {
        currentInheritedBookingFile = null;
    } else {
        currentInheritedBookingFile = { url: fileUrl, name: fileName || 'File_Booking_Dinh_Kem' };
    }
    renderTripBookingFilesList();
}

function removeInheritedBookingFile() {
    currentInheritedBookingFile = null;
    renderTripBookingFilesList();
    showToast('info', 'Đã gỡ bỏ file đính kèm kế thừa từ Booking.');
}
// --- 3.8. QUẢN LÝ CHẾ ĐỘ ĐỘI XE: XE NHÀ vs XE BẠN / 3PL (Phương Án 3: Quản Lý Theo Đối Tác) ---
function setTripCarrierMode(mode) {
    document.querySelectorAll('#inp-carrier-mode').forEach(el => el.value = mode);

    if (mode === 'SUBCONTRACTOR') {
        document.querySelectorAll('#btn-fleet-owned').forEach(el => {
            el.className = 'px-2.5 py-1 rounded-md text-[11px] font-semibold text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1';
        });
        document.querySelectorAll('#btn-fleet-subcontractor').forEach(el => {
            el.className = 'px-2.5 py-1 rounded-md text-[11px] font-bold transition-all bg-amber-500 text-white shadow-2xs flex items-center gap-1';
        });
        document.querySelectorAll('#section-direct-dispatch').forEach(el => el.classList.add('hidden-view'));
        document.querySelectorAll('#section-drop-hook-dispatch').forEach(el => el.classList.add('hidden-view'));
        document.querySelectorAll('#wrapper-drop-hook-toggle').forEach(el => el.classList.add('hidden-view'));
        document.querySelectorAll('#section-subcontractor-dispatch').forEach(el => el.classList.remove('hidden-view'));

        // Nạp danh sách Thầu phụ vào select nếu có cache
        if (masterDataFormOptionsCache && masterDataFormOptionsCache.subcontractors) {
            document.querySelectorAll('#inp-subcontractor').forEach(subSel => {
                if (subSel && subSel.options.length <= 1) {
                    masterDataFormOptionsCache.subcontractors.forEach(s => {
                        const opt = document.createElement('option');
                        opt.value = s.id;
                        opt.innerText = s.label || s.name;
                        subSel.appendChild(opt);
                    });
                }
            });
        }
    } else {
        document.querySelectorAll('#btn-fleet-owned').forEach(el => {
            el.className = 'px-2.5 py-1 rounded-md text-[11px] font-bold transition-all bg-white text-teal-800 shadow-2xs flex items-center gap-1';
        });
        document.querySelectorAll('#btn-fleet-subcontractor').forEach(el => {
            el.className = 'px-2.5 py-1 rounded-md text-[11px] font-semibold text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1';
        });
        document.querySelectorAll('#section-subcontractor-dispatch').forEach(el => el.classList.add('hidden-view'));
        document.querySelectorAll('#wrapper-drop-hook-toggle').forEach(el => el.classList.remove('hidden-view'));

        const chkDropHook = document.getElementById('chk-drop-hook');
        if (chkDropHook && chkDropHook.checked) {
            document.querySelectorAll('#section-drop-hook-dispatch').forEach(el => el.classList.remove('hidden-view'));
            document.querySelectorAll('#section-direct-dispatch').forEach(el => el.classList.add('hidden-view'));
        } else {
            document.querySelectorAll('#section-direct-dispatch').forEach(el => el.classList.remove('hidden-view'));
            document.querySelectorAll('#section-drop-hook-dispatch').forEach(el => el.classList.add('hidden-view'));
        }
    }
}

async function onSubcontractorSelected(subId, triggerEl = null) {
    const context = triggerEl ? (triggerEl.closest('form') || triggerEl.closest('#modal-create-trip') || triggerEl.closest('#view-create-trip') || document) : document;
    const vehSels = context.querySelectorAll('#inp-sub-vehicle');
    const drvSels = context.querySelectorAll('#inp-sub-driver');
    const customVehInps = context.querySelectorAll('#inp-sub-vehicle-custom');
    const customDrvDivs = context.querySelectorAll('#div-sub-driver-custom');

    customVehInps.forEach(el => el.classList.add('hidden-view'));
    customDrvDivs.forEach(el => el.classList.add('hidden-view'));

    if (!subId) {
        vehSels.forEach(vehSel => {
            vehSel.innerHTML = '<option value="">-- Chọn Đầu kéo/ Xe tải 3PL --</option><option value="CUSTOM">+ Nhập Biển Số Xe Khác...</option>';
        });
        drvSels.forEach(drvSel => {
            drvSel.innerHTML = '<option value="">-- Chọn Tài Xế 3PL --</option><option value="CUSTOM">+ Nhập Tài Xế Mới...</option>';
        });
        return;
    }

    try {
        const res = await fetchWithAuth(`/api/master-data/subcontractors/${subId}/fleet/`);
        if (res.ok) {
            const data = await res.json();
            vehSels.forEach(vehSel => {
                vehSel.innerHTML = '<option value="">-- Chọn Đầu kéo/ Xe tải 3PL --</option>';
                if (data.vehicles && data.vehicles.length > 0) {
                    data.vehicles.forEach(v => {
                        const opt = document.createElement('option');
                        opt.value = v.license_plate;
                        opt.innerText = `${v.license_plate} (${v.vehicle_type || 'Đầu kéo/ Xe tải'})`;
                        vehSel.appendChild(opt);
                    });
                }
                const optCustom = document.createElement('option');
                optCustom.value = 'CUSTOM';
                optCustom.innerText = '+ Nhập Biển Số Xe Khác...';
                vehSel.appendChild(optCustom);
            });

            drvSels.forEach(drvSel => {
                drvSel.innerHTML = '<option value="">-- Chọn Tài Xế 3PL --</option>';
                if (data.drivers && data.drivers.length > 0) {
                    data.drivers.forEach(d => {
                        const opt = document.createElement('option');
                        opt.value = d.id;
                        opt.innerText = `${d.full_name} (${d.phone || 'Không SĐT'})`;
                        opt.dataset.phone = d.phone || '';
                        opt.dataset.name = d.full_name;
                        drvSel.appendChild(opt);
                    });
                }
                const optCustom = document.createElement('option');
                optCustom.value = 'CUSTOM';
                optCustom.innerText = '+ Nhập Tài Xế Mới...';
                drvSel.appendChild(optCustom);
            });
        }
    } catch (e) {
        console.error('Lỗi tải danh bạ xe/tài 3PL:', e);
    }
}

function onSubVehicleSelectChange(val, triggerEl = null) {
    const context = triggerEl ? (triggerEl.closest('form') || triggerEl.closest('#modal-create-trip') || triggerEl.closest('#view-create-trip') || document) : document;
    const customInps = context.querySelectorAll('#inp-sub-vehicle-custom');
    customInps.forEach(customInp => {
        if (val === 'CUSTOM') {
            customInp.classList.remove('hidden-view');
            customInp.focus();
        } else {
            customInp.classList.add('hidden-view');
        }
    });
}

function onSubDriverSelectChange(val, triggerEl = null) {
    const context = triggerEl ? (triggerEl.closest('form') || triggerEl.closest('#modal-create-trip') || triggerEl.closest('#view-create-trip') || document) : document;
    const customDivs = context.querySelectorAll('#div-sub-driver-custom');
    const phoneInps = context.querySelectorAll('#inp-sub-driver-phone');
    const nameInps = context.querySelectorAll('#inp-sub-driver-name');

    if (val === 'CUSTOM') {
        customDivs.forEach(el => el.classList.remove('hidden-view'));
        phoneInps.forEach(el => el.value = '');
        nameInps.forEach(el => {
            el.value = '';
            el.focus();
        });
    } else {
        customDivs.forEach(el => el.classList.add('hidden-view'));
        const drvSel = triggerEl || context.querySelector('#inp-sub-driver');
        if (drvSel && drvSel.value) {
            const selOpt = drvSel.selectedOptions[0];
            const p = selOpt ? selOpt.dataset.phone : '';
            const n = selOpt ? selOpt.dataset.name : '';
            phoneInps.forEach(el => el.value = p || '');
            nameInps.forEach(el => el.value = n || '');
        } else {
            phoneInps.forEach(el => el.value = '');
            nameInps.forEach(el => el.value = '');
        }
    }
}

// --- 4. TẠO LỆNH ĐIỀU ĐỘNG VỚI DEFENSIVE VALIDATION (Bim_ERP Standard) ---
async function submitNewTrip(sourceEl = null) {
    // 1. Xác định context container chính xác: Nếu modal đang hiển thị thì ưu tiên modal, ngược lại nếu view-create-trip đang mở thì dùng view-create-trip
    const modalEl = document.getElementById('modal-create-trip');
    const isModalActive = modalEl && !modalEl.classList.contains('hidden-view') && !modalEl.classList.contains('hidden');
    const viewEl = document.getElementById('view-create-trip');
    const isViewActive = viewEl && !viewEl.classList.contains('hidden-view') && !viewEl.classList.contains('hidden');

    let container = document;
    if (sourceEl && sourceEl.closest) {
        container = sourceEl.closest('#modal-create-trip') || sourceEl.closest('#view-create-trip') || (isModalActive ? modalEl : (isViewActive ? viewEl : document));
    } else {
        container = isModalActive ? modalEl : (isViewActive ? viewEl : document);
    }

    const getEl = (id) => container.querySelector('#' + id) || document.getElementById(id);
    const getVal = (id) => (getEl(id)?.value || '').trim();

    const is_split_trip = getEl('chk-drop-hook')?.checked || false;

    // Reset lỗi cũ & cấu hình danh sách trường bắt buộc theo chế độ chạy
    const requiredFields = [
        { id: 'inp-customer', errId: 'err-customer', label: 'Khách hàng' },
        { id: 'inp-pickup', errId: 'err-pickup', label: 'Nơi lấy cont/hàng' },
        { id: 'inp-warehouse', errId: 'err-warehouse', label: 'Nơi đóng/trả hàng' }
    ];

    const carrier_mode = getVal('inp-carrier-mode') || 'OWNED';
    let subcontractor_id = null;
    let subcontractor_driver_id = null;
    let subcontractor_driver_name = '';
    let subcontractor_driver_phone = '';
    let subcontractor_cost = 0;
    let subcontractor_advance = 0;
    let driver = '';
    let vehicle = '';

    if (carrier_mode === 'SUBCONTRACTOR') {
        requiredFields.push({ id: 'inp-subcontractor', errId: 'err-subcontractor', label: 'Nhà xe / 3PL' });
        requiredFields.push({ id: 'inp-sub-cost', errId: 'err-sub-cost', label: 'Giá cước khoán 3PL' });

        const subVehSel = getEl('inp-sub-vehicle');
        const subVehCustom = getEl('inp-sub-vehicle-custom');
        const subDrvSel = getEl('inp-sub-driver');
        const subDrvName = getEl('inp-sub-driver-name');
        const subDrvPhone = getEl('inp-sub-driver-phone');

        subcontractor_id = getVal('inp-subcontractor') || '';

        if (subVehSel && subVehSel.value === 'CUSTOM') {
            vehicle = subVehCustom ? subVehCustom.value.trim() : '';
            if (!vehicle) {
                requiredFields.push({ id: 'inp-sub-vehicle-custom', errId: 'err-sub-vehicle', label: 'Biển số xe 3PL' });
            }
        } else if (subVehSel && subVehSel.value) {
            vehicle = subVehSel.value.trim();
        } else {
            requiredFields.push({ id: 'inp-sub-vehicle', errId: 'err-sub-vehicle', label: 'Biển số xe 3PL' });
        }

        if (subDrvSel && subDrvSel.value === 'CUSTOM') {
            subcontractor_driver_name = subDrvName ? subDrvName.value.trim() : '';
            subcontractor_driver_phone = subDrvPhone ? subDrvPhone.value.trim() : '';
            if (!subcontractor_driver_name) {
                requiredFields.push({ id: 'inp-sub-driver-name', errId: 'err-sub-driver', label: 'Tên tài xế 3PL' });
            }
        } else if (subDrvSel && subDrvSel.value) {
            subcontractor_driver_id = parseInt(subDrvSel.value);
            const selOpt = subDrvSel.selectedOptions[0];
            subcontractor_driver_name = selOpt ? selOpt.dataset.name : '';
            subcontractor_driver_phone = selOpt ? selOpt.dataset.phone : '';
        } else {
            requiredFields.push({ id: 'inp-sub-driver', errId: 'err-sub-driver', label: 'Tài xế 3PL' });
        }

        const rawCost = getVal('inp-sub-cost') || '0';
        subcontractor_cost = parseFloat(rawCost.replace(/\./g, '').replace(/,/g, '')) || 0;
        const rawAdv = getVal('inp-sub-advance') || '0';
        subcontractor_advance = parseFloat(rawAdv.replace(/\./g, '').replace(/,/g, '')) || 0;
    } else {
        if (is_split_trip) {
            requiredFields.push({ id: 'inp-driver-leg1', errId: 'err-driver-leg1', label: 'Tài xế lấy cont (Chặng 1)' });
            requiredFields.push({ id: 'inp-vehicle-leg1', errId: 'err-vehicle-leg1', label: 'Đầu kéo/ Xe tải lấy cont (Chặng 1)' });
            // Chặng 2 (Tài xế hạ cont & Xe hạ cont) cho phép bỏ trống để phân công gán sau khi hạ cont
        } else {
            requiredFields.push({ id: 'inp-driver', errId: 'err-driver', label: 'Tài xế nhận lệnh' });
            requiredFields.push({ id: 'inp-vehicle', errId: 'err-vehicle', label: 'Đầu kéo/ Xe tải TVL' });
        }
    }

    let hasError = false;
    let firstErrorEl = null;
    const missingLabels = [];

    requiredFields.forEach(f => {
        const inputEl = getEl(f.id);
        const errEl = getEl(f.errId);
        if (!inputEl) return;
        
        if (!inputEl.value || !inputEl.value.trim()) {
            hasError = true;
            missingLabels.push(f.label);
            inputEl.classList.add('input-error');
            if (errEl) {
                errEl.innerHTML = `<i class="ph-bold ph-warning-circle"></i> Vui lòng chọn/nhập ${f.label.toLowerCase()}`;
                errEl.classList.remove('hidden');
            }
            if (!firstErrorEl) firstErrorEl = inputEl;

            // Tự động xóa viền đỏ khi người dùng bắt đầu nhập hoặc chọn option
            const clearError = () => {
                inputEl.classList.remove('input-error');
                if (errEl) errEl.classList.add('hidden');
            };
            inputEl.addEventListener('input', clearError, { once: true });
            inputEl.addEventListener('change', clearError, { once: true });
        } else {
            inputEl.classList.remove('input-error');
            if (errEl) errEl.classList.add('hidden');
        }
    });

    if (hasError) {
        showToast('warning', `Vui lòng chọn/nhập các thông tin bắt buộc: ${missingLabels.join(', ')}`, 'Thiếu dữ liệu');
        if (firstErrorEl) {
            firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
                try { firstErrorEl.focus(); } catch (e) {}
            }, 250);
        }
        return;
    }

    const bookingOrderEl = getEl('select-booking-order');
    const booking_order_id = bookingOrderEl && bookingOrderEl.value ? parseInt(bookingOrderEl.value) : null;
    const customer = getVal('inp-customer');
    const type = getVal('inp-type') || 'Nhập';
    const is_twin_container = getEl('chk-twin-cont')?.checked || false;
    let container_type = getVal('inp-cont-type') || (is_twin_container ? '2x20DC' : '40HC');
    if (is_twin_container && (!container_type || container_type === '40HC')) {
        container_type = '2x20DC';
    }
    const container_code = getVal('inp-cont');
    const booking = getVal('inp-booking');
    const seal = getVal('inp-seal');
    const vgm_weight = getVal('inp-vgm');
    syncTripCutoff();
    const cutoff = getVal('inp-cutoff');
    const commercial_invoice = getVal('inp-invoice');
    const warehouse_dock = getVal('inp-dock');
    const loading_time = getVal('inp-load-time') || '08:00';
    const cont_location_type = getVal('inp-cont-loc') || 'NHÀ MÁY';

    // Trường Cont thứ 2 (Kẹp 20ft)
    const container_2 = is_twin_container ? getVal('inp-cont-2') : '';
    const seal_2 = is_twin_container ? getVal('inp-seal-2') : '';
    const booking_2 = is_twin_container ? getVal('inp-booking-2') : '';
    const vgm_weight_2 = is_twin_container ? getVal('inp-vgm-2') : '';
    const cargo_notes_2 = is_twin_container ? getVal('inp-cargo-notes-2') : '';

    // Nghiệp vụ Cảng: Quản lý Hạn Free DEM/DET & Giám định EIR
    const det_free_days = parseInt(getVal('inp-det-free-days')) || 3;
    const dem_free_days = parseInt(getVal('inp-dem-free-days')) || 3;
    const det_expiry_date = getVal('inp-det-expiry');
    const dem_expiry_date = getVal('inp-dem-expiry');
    const container_condition = getVal('select-container-condition') || 'GOOD';
    const damage_description = getVal('inp-damage-desc');

    const pickup = getVal('inp-pickup');
    const warehouse = getVal('inp-warehouse');
    const dropoff = getVal('inp-dropoff');
    let dropoff_driver = '';
    let dropoff_vehicle = '';
    let driver_split_ratio = 50;

    if (carrier_mode !== 'SUBCONTRACTOR') {
        if (is_split_trip) {
            driver = getVal('inp-driver-leg1');
            vehicle = getVal('inp-vehicle-leg1');
            dropoff_driver = getVal('inp-dropoff-driver');
            dropoff_vehicle = getVal('inp-dropoff-vehicle');
            const splitRatioVal = getVal('inp-driver-split-ratio');
            if (splitRatioVal === 'custom') {
                driver_split_ratio = parseFloat(getVal('inp-custom-split-ratio-leg1')) || 50;
            } else {
                driver_split_ratio = parseFloat(splitRatioVal) || 50;
            }
        } else {
            driver = getVal('inp-driver');
            vehicle = getVal('inp-vehicle');
        }
    }

    const notes = is_split_trip 
        ? (getVal('inp-notes-drop-hook') || getVal('inp-notes') || '')
        : (getVal('inp-notes') || '');

    // Hiệu ứng Visual Feedback trên nút Lưu
    const submitBtn = getEl('btn-submit-trip') || container.querySelector('button[type="submit"]') || document.querySelector('#form-create-trip button');
    let originalBtnHtml = '';
    if (submitBtn) {
        originalBtnHtml = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="ph ph-spinner animate-spin text-lg mr-1.5"></i> Đang lưu & phát lệnh Zalo...';
    }

    try {
        const formData = new FormData();
        if (booking_order_id) formData.append('booking_order_id', booking_order_id);
        formData.append('customer', customer);
        formData.append('type', type);
        formData.append('container_type', container_type);
        formData.append('container', container_code);
        formData.append('booking', booking);
        formData.append('seal', seal);
        formData.append('cutoff', cutoff);
        formData.append('vgm_weight', vgm_weight);
        formData.append('commercial_invoice', commercial_invoice);
        formData.append('warehouse_dock', warehouse_dock);
        formData.append('loading_time', loading_time);
        formData.append('cont_location_type', cont_location_type);
        formData.append('pickup', pickup);
        formData.append('warehouse', warehouse);
        formData.append('dropoff', dropoff);
        formData.append('driver', driver);
        formData.append('vehicle', vehicle);
        formData.append('notes', notes);
        formData.append('cargo_notes', notes);
        formData.append('is_split_trip', is_split_trip ? 'true' : 'false');
        formData.append('dropoff_driver', dropoff_driver);
        formData.append('dropoff_vehicle', dropoff_vehicle);
        formData.append('driver_split_ratio', driver_split_ratio);
        formData.append('is_twin_container', is_twin_container ? 'true' : 'false');
        formData.append('container_2', container_2);
        formData.append('seal_2', seal_2);
        formData.append('booking_2', booking_2);
        formData.append('vgm_weight_2', vgm_weight_2);
        formData.append('cargo_notes_2', cargo_notes_2);
        formData.append('det_free_days', det_free_days);
        formData.append('dem_free_days', dem_free_days);
        formData.append('det_expiry_date', det_expiry_date);
        formData.append('dem_expiry_date', dem_expiry_date);
        formData.append('container_condition', container_condition);
        formData.append('damage_description', damage_description);
        if (subcontractor_id) formData.append('subcontractor_id', subcontractor_id);
        if (subcontractor_driver_id) formData.append('subcontractor_driver_id', subcontractor_driver_id);
        if (subcontractor_driver_name) formData.append('subcontractor_driver_name', subcontractor_driver_name);
        if (subcontractor_driver_phone) formData.append('subcontractor_driver_phone', subcontractor_driver_phone);
        if (subcontractor_cost) formData.append('subcontractor_cost', subcontractor_cost);
        if (subcontractor_advance) formData.append('subcontractor_advance', subcontractor_advance);

        const fileInput = document.getElementById('inp-booking-file');
        if (tripBookingFilesList && tripBookingFilesList.length > 0) {
            formData.append('booking_file', tripBookingFilesList[0]);
            tripBookingFilesList.forEach(file => {
                formData.append('booking_files', file);
            });
        } else if (fileInput && fileInput.files && fileInput.files[0]) {
            formData.append('booking_file', fileInput.files[0]);
        }

        const res = await fetchWithAuth('/api/trips/', {
            method: 'POST',
            body: formData
        });
        const result = await res.json().catch(() => ({}));
        if (res.ok && result.success) {
            closeModal('modal-create-trip');
            const createTripView = document.getElementById('view-create-trip');
            if (createTripView) createTripView.classList.add('hidden-view');
            const formCreateTrip = document.getElementById('form-create-trip');
            if (formCreateTrip) formCreateTrip.reset();
            clearBookingFileSelection();
            loadTripsData();

            // Tự động sao chép Lệnh điều xe và mở Zalo nếu có tài xế
            const message = buildDriverZaloMessage(result);
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(message).catch(() => {});
            }

            if (result.driver_phone) {
                const cleanPhone = String(result.driver_phone).replace(/\D/g, '');
                showToast('success', `Đã tạo lệnh ${result.trip_code}! Đã sao chép nội dung Lệnh & Mở Zalo tài xế (${result.driver_name || cleanPhone}). Hãy dán (Ctrl+V) để gửi ngay!`, 'Tạo Lệnh & Sao Chép Zalo');
                window.open(`https://zalo.me/${cleanPhone}`, '_blank');
            } else {
                showToast('success', result.message || 'Tạo lệnh điều động thành công!', 'Thành công');
            }

            // Chuyển hướng xem chi tiết chuyến xe vừa tạo
            const targetTripCode = result.trip_code || result.id;
            if (targetTripCode) {
                viewTripDetail(targetTripCode, true);
            } else {
                backToDispatch();
            }
        } else {
            let errorMsg = result.message || result.error || result.detail;
            if (!errorMsg && typeof result === 'object' && Object.keys(result).length > 0) {
                const fieldErrors = Object.entries(result)
                    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                    .join(' | ');
                if (fieldErrors) errorMsg = fieldErrors;
            }
            errorMsg = errorMsg || 'Vui lòng kiểm tra lại dữ liệu nhập.';
            showToast('danger', errorMsg, 'Lỗi nghiệp vụ');
        }
    } catch (err) {
        console.error('Error submitting trip:', err);
        showToast('danger', 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.', 'Lỗi kết nối');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHtml;
        }
    }
}

// --- 5. CẬP NHẬT HÓA ĐƠN & CHỨNG TỪ VẬN TẢI THỰC TẾ (PRODUCTION ENTERPRISE) ---
currentOcrMode = 'phi-ton';

// --- KHỞI TẠO MẶC ĐỊNH NGÀY/GIỜ CHO CÁC FORM TẠO MỚI ---
function initDefaultDatesForCreateTrip() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const loadingDateEl = document.getElementById('inp-loading-date');
    if (loadingDateEl && !loadingDateEl.value) {
        loadingDateEl.value = todayStr;
    }
    
    const loadingTimeEl = document.getElementById('inp-loading-time');
    if (loadingTimeEl && !loadingTimeEl.value) {
        loadingTimeEl.value = '08:00';
    }

    const cutoffDateEl = document.getElementById('inp-cutoff-date');
    if (cutoffDateEl && !cutoffDateEl.value) {
        cutoffDateEl.value = todayStr;
    }

    const cutoffTimeEl = document.getElementById('inp-cutoff-time');
    if (cutoffTimeEl && !cutoffTimeEl.value) {
        cutoffTimeEl.value = '17:00';
    }
    syncTripCutoff();
    
    const demDaysEl = document.getElementById('inp-det-free-days');
    if (demDaysEl && (!demDaysEl.value || demDaysEl.value === '3')) {
        demDaysEl.value = '7';
    }
    
    onFreeDaysChange();
}

function initDefaultDatesForQuotation() {
    const priceInput = document.getElementById('quote-unit-price');
    if (priceInput && !priceInput.value) priceInput.value = '';
    const tripsInput = document.getElementById('quote-monthly-trips');
    if (tripsInput && !tripsInput.value) tripsInput.value = '';
    calculateQuoteExpectedRevenue();
}

// --- NGHIỆP VỤ GHÉP 2 CONT 20FT (TWIN 20FT DRAYAGE TMS STANDARD) ---
function toggleTwinContMode(isTwin) {
    const twinSection = document.getElementById('section-twin-cont-2');
    const contTypeSel = document.getElementById('inp-cont-type');
    const cont1Title = document.getElementById('label-cont-1-title');

    if (isTwin) {
        if (twinSection) twinSection.classList.remove('hidden-view');
        if (cont1Title) cont1Title.innerHTML = '<i class="ph-bold ph-cube text-teal-600"></i> Container #1 (20ft)';
        if (contTypeSel) {
            setSelectValueCaseInsensitive(contTypeSel, '2x20DC');
        }
    } else {
        if (twinSection) twinSection.classList.add('hidden-view');
        if (cont1Title) cont1Title.innerHTML = '<i class="ph-bold ph-cube text-teal-600"></i> Thông Tin Vỏ Cont / Chì';
        // Reset dữ liệu Cont 2
        const cont2 = document.getElementById('inp-cont-2');
        const seal2 = document.getElementById('inp-seal-2');
        const booking2 = document.getElementById('inp-booking-2');
        const vgm2 = document.getElementById('inp-vgm-2');
        const notes2 = document.getElementById('inp-cargo-notes-2');
        if (cont2) cont2.value = '';
        if (seal2) seal2.value = '';
        if (booking2) booking2.value = '';
        if (vgm2) vgm2.value = '';
        if (notes2) notes2.value = '';
    }
}

// --- TÍNH HẠN TRẢ VỎ CONTAINER (7 NGÀY CỘNG 6 DO TÍNH CẢ NGÀY ĐẦU) ---
function onFreeDaysChange() {
    const daysInput = document.getElementById('inp-det-free-days');
    const expiryInput = document.getElementById('inp-det-expiry');
    const loadingDateInput = document.getElementById('inp-loading-date');
    if (!daysInput || !expiryInput) return;
    const days = parseInt(daysInput.value) || 0;
    if (days > 0) {
        const baseDate = (loadingDateInput && loadingDateInput.value) ? new Date(loadingDateInput.value) : new Date();
        const d = new Date(baseDate);
        // Tính hạn trả vỏ: ngày nhận cont là ngày 1 -> cộng thêm (days - 1) ngày
        d.setDate(d.getDate() + Math.max(0, days - 1));
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        expiryInput.value = `${yyyy}-${mm}-${dd}`;
    }
}

// --- NGHIỆP VỤ CẮT KÉO / CẮT MOOC (DROP & HOOK TMS STANDARD) ---
function toggleDropHookMode(isDropHook) {
    document.querySelectorAll('#section-direct-dispatch').forEach(el => {
        if (isDropHook) el.classList.add('hidden-view');
        else el.classList.remove('hidden-view');
    });
    document.querySelectorAll('#section-drop-hook-dispatch').forEach(el => {
        if (isDropHook) el.classList.remove('hidden-view');
        else el.classList.add('hidden-view');
    });

    // Xóa trạng thái báo lỗi cũ của các trường tài xế
    ['inp-driver', 'inp-driver-leg1', 'inp-dropoff-driver'].forEach(id => {
        document.querySelectorAll(`#${id}`).forEach(el => el.classList.remove('input-error'));
    });
    ['err-driver', 'err-driver-leg1', 'err-dropoff-driver'].forEach(id => {
        document.querySelectorAll(`#${id}`).forEach(el => el.classList.add('hidden'));
    });

    document.querySelectorAll('#inp-driver').forEach(mainDriver => {
        const form = mainDriver.closest('form') || document;
        const leg1Driver = form.querySelector('#inp-driver-leg1');
        const leg2Driver = form.querySelector('#inp-dropoff-driver');

        if (isDropHook) {
            mainDriver.removeAttribute('required');
            if (leg1Driver) leg1Driver.setAttribute('required', 'required');
            // Chặng 2 (Tài 2 & Xe 2) cho phép bỏ trống để gán sau
            if (leg2Driver) leg2Driver.removeAttribute('required');
            
            // Kế thừa giá trị tài xế nếu đã chọn ở direct
            if (mainDriver && mainDriver.value && leg1Driver && !leg1Driver.value) {
                setSelectValueCaseInsensitive(leg1Driver, mainDriver.value);
                onDriverLeg1Change(mainDriver.value);
            }
        } else {
            mainDriver.setAttribute('required', 'required');
            if (leg1Driver) leg1Driver.removeAttribute('required');
            if (leg2Driver) leg2Driver.removeAttribute('required');

            // Kế thừa ngược lại nếu đã chọn ở leg1
            if (leg1Driver && leg1Driver.value && mainDriver) {
                setSelectValueCaseInsensitive(mainDriver, leg1Driver.value);
            }
        }
    });
}

function onDriverChange(driverNickname, triggerEl = null) {
    if (!masterDataFormOptionsCache) return;
    const context = triggerEl ? (triggerEl.closest('form') || triggerEl.closest('#modal-create-trip') || triggerEl.closest('#view-create-trip') || document) : document;
    const vehSel = context.querySelector('#inp-vehicle');
    if (!vehSel || !driverNickname) return;

    // Gợi ý thông minh: Nếu ô xe chưa chọn, tự động gợi ý xe thường lái của tài xế (không ép buộc)
    if (!vehSel.value) {
        const { drivers, vehicles } = masterDataFormOptionsCache;
        const driver = (drivers || []).find(d => (d.nickname === driverNickname || d.full_name === driverNickname || d.code === driverNickname));
        if (driver) {
            let matchedPlate = driver.default_vehicle_plate;
            if (!matchedPlate) {
                const matchedVeh = (vehicles || []).find(v => v.ownership_code === 'OWNED' && (v.driver_id === driver.id || v.driver_name === driver.nickname || v.driver_name === driver.full_name));
                if (matchedVeh) matchedPlate = matchedVeh.plate;
            }
            if (matchedPlate) {
                setSelectValueCaseInsensitive(vehSel, matchedPlate);
                vehSel.classList.remove('input-error');
                context.querySelector('#err-vehicle')?.classList.add('hidden');
            }
        }
    }
}

function onVehicleChange(vehiclePlate, triggerEl = null) {
    if (!masterDataFormOptionsCache) return;
    const context = triggerEl ? (triggerEl.closest('form') || triggerEl.closest('#modal-create-trip') || triggerEl.closest('#view-create-trip') || document) : document;
    const drvSel = context.querySelector('#inp-driver');
    if (!drvSel || !vehiclePlate) return;

    // Gợi ý thông minh: Nếu ô tài xế chưa chọn, tự động gợi ý tài xế thường lái của xe (không ép buộc)
    if (!drvSel.value) {
        const { drivers, vehicles } = masterDataFormOptionsCache;
        const veh = (vehicles || []).find(v => v.plate === vehiclePlate);
        if (veh && veh.driver_name) {
            const matchedDriver = (drivers || []).find(d => d.nickname === veh.driver_name || d.full_name === veh.driver_name);
            if (matchedDriver) {
                setSelectValueCaseInsensitive(drvSel, matchedDriver.nickname || matchedDriver.full_name);
                drvSel.classList.remove('input-error');
                context.querySelector('#err-driver')?.classList.add('hidden');
            }
        }
    }
}

function onDriverLeg1Change(driverNickname) {
    if (!masterDataFormOptionsCache) return;
    const { drivers, vehicles } = masterDataFormOptionsCache;
    const driver = (drivers || []).find(d => (d.nickname === driverNickname || d.full_name === driverNickname || d.code === driverNickname));
    const vehSel = document.getElementById('inp-vehicle-leg1');
    if (!vehSel || !driver) return;
    const matchedVeh = (vehicles || []).find(v => v.driver_id === driver.id || v.driver_name === driver.nickname);
    if (matchedVeh) {
        setSelectValueCaseInsensitive(vehSel, matchedVeh.plate);
    }
}

function onDriverLeg2Change(driverNickname) {
    if (!masterDataFormOptionsCache) return;
    const { drivers, vehicles } = masterDataFormOptionsCache;
    const driver = (drivers || []).find(d => (d.nickname === driverNickname || d.full_name === driverNickname || d.code === driverNickname));
    const vehSel = document.getElementById('inp-dropoff-vehicle');
    if (!vehSel || !driver) return;
    const matchedVeh = (vehicles || []).find(v => v.driver_id === driver.id || v.driver_name === driver.nickname);
    if (matchedVeh) {
        setSelectValueCaseInsensitive(vehSel, matchedVeh.plate);
    }
}

function onSplitRatioChange(ratio) {
    const customDiv = document.getElementById('div-custom-split-ratio');
    if (ratio === 'custom') {
        if (customDiv) customDiv.classList.remove('hidden');
        const customInput = document.getElementById('inp-custom-split-ratio-leg1');
        const r = parseInt(customInput?.value, 10) || 50;
        onCustomSplitRatioInput(r);
    } else {
        if (customDiv) customDiv.classList.add('hidden');
        const r = parseInt(ratio, 10) || 50;
        const badgeLeg1 = document.getElementById('badge-ratio-leg1');
        const badgeLeg2 = document.getElementById('badge-ratio-leg2');
        if (badgeLeg1) badgeLeg1.innerText = `Tỷ lệ: ${r}%`;
        if (badgeLeg2) badgeLeg2.innerText = `Tỷ lệ: ${100 - r}%`;
    }
}

function onCustomSplitRatioInput(val) {
    let r = parseInt(val, 10);
    if (isNaN(r)) r = 50;
    if (r < 0) r = 0;
    if (r > 100) r = 100;
    
    const leg2Input = document.getElementById('inp-custom-split-ratio-leg2');
    if (leg2Input) leg2Input.value = 100 - r;

    const badgeLeg1 = document.getElementById('badge-ratio-leg1');
    const badgeLeg2 = document.getElementById('badge-ratio-leg2');
    if (badgeLeg1) badgeLeg1.innerText = `Tỷ lệ: ${r}%`;
    if (badgeLeg2) badgeLeg2.innerText = `Tỷ lệ: ${100 - r}%`;
}

let activeBookingsCache = [];

async function loadActiveBookingsForModal(selectedBookingId = null) {
    const sel = document.getElementById('select-booking-order');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Đang tải danh sách Booking từ Sale... --</option>';
    try {
        const res = await fetchWithAuth('/api/bookings/active/');
        if (!res.ok) throw new Error('Lỗi tải booking');
        activeBookingsCache = await res.json();
        
        renderBookingOrderOptions(activeBookingsCache, selectedBookingId);

        if (selectedBookingId) {
            onBookingSelected(selectedBookingId);
        }
    } catch (err) {
        console.error('Error loading active bookings:', err);
        sel.innerHTML = '<option value="">-- Lỗi tải danh sách Booking (Nhập thủ công) --</option>';
    }
}

function onBookingSelected(bookingId) {
    if (!bookingId) {
        const fileInput = document.getElementById('inp-booking-file');
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            clearBookingFileSelection();
        }
        return;
    }
    const b = activeBookingsCache.find(item => String(item.id) === String(bookingId));
    if (!b) return;

    // Tự động điền 9 trường dữ liệu kế thừa từ Booking của Sale
    const custEl = document.getElementById('inp-customer');
    if (custEl) setSelectValueCaseInsensitive(custEl, b.customer_name);
    
    const contTypeEl = document.getElementById('inp-cont-type');
    if (contTypeEl) setSelectValueCaseInsensitive(contTypeEl, b.container_size || '40HC');

    const bookingEl = document.getElementById('inp-booking');
    if (bookingEl) bookingEl.value = b.booking_number || '';

    if (b.closing_time) {
        parseAndSetDateTimeFields(b.closing_time, 'inp-cutoff-date', 'inp-cutoff-time', 'inp-cutoff', '17:00');
    } else {
        const cutoffEl = document.getElementById('inp-cutoff');
        if (cutoffEl) cutoffEl.value = '';
    }

    const loadTimeEl = document.getElementById('inp-load-time');
    if (loadTimeEl) loadTimeEl.value = `${b.loading_date_display || ''} - ${b.loading_time || '08:00'}`.trim();

    const pickupEl = document.getElementById('inp-pickup');
    if (pickupEl) setSelectValueCaseInsensitive(pickupEl, b.pickup_location);

    const warehouseEl = document.getElementById('inp-warehouse');
    if (warehouseEl) setSelectValueCaseInsensitive(warehouseEl, b.delivery_location);

    const dropoffEl = document.getElementById('inp-dropoff');
    if (dropoffEl) setSelectValueCaseInsensitive(dropoffEl, b.dropoff_location);

    const notesEl = document.getElementById('inp-notes');
    if (notesEl && b.notes) notesEl.value = b.notes;

    if (b.free_time_detention) {
        const detEl = document.getElementById('inp-det-free-days');
        if (detEl) {
            detEl.value = b.free_time_detention;
            onFreeDaysChange();
        }
    }
    if (b.free_time_demurrage) {
        const demEl = document.getElementById('inp-dem-free-days');
        if (demEl) demEl.value = b.free_time_demurrage;
    }

    // Tự động kế thừa file Booking / Lệnh cấp rỗng nếu có
    if (b.booking_file_url) {
        showInheritedBookingFile(b.booking_file_url, b.booking_file_name || `Booking_${b.booking_number}`);
    } else {
        const fileInput = document.getElementById('inp-booking-file');
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            clearBookingFileSelection();
        }
    }

    // Xóa cảnh báo viền đỏ (nếu có)
    ['inp-customer', 'inp-pickup', 'inp-warehouse'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('input-error');
    });
    ['err-customer', 'err-pickup', 'err-warehouse'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    showToast('success', `Đã kế thừa 9 trường dữ liệu và file booking từ [${b.booking_code}] - Khách hàng: ${b.customer_name}`, 'Kế Thừa Thành Công');
}

async function dispatchFromBooking(bookingId) {
    if (typeof openCreateTripPage === 'function') {
        await openCreateTripPage(bookingId, true);
    } else {
        await openModal('modal-create-trip', bookingId);
    }
}


// =========================================================================
// CÁC HÀM XỬ LÝ BOOKING PRICE & SEARCH & QUYẾT TOÁN KHÁCH HÀNG (v4.7.5)
// =========================================================================

function renderBookingOrderOptions(bookingsList, selectedBookingId = null) {
    const selects = document.querySelectorAll('#select-booking-order');
    selects.forEach(sel => {
        sel.innerHTML = '<option value="">-- Chọn Booking / Đơn Hàng Đang Chờ Điều Xe (Hoặc Nhập Thủ Công) --</option>';
        (bookingsList || []).forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.id;
            opt.innerText = `[${b.booking_code}] ${b.customer_name} | B/L: ${b.booking_number} (${b.container_size} - Còn ${b.remaining_containers} cont) | Kho: ${b.delivery_location}`;
            if (selectedBookingId && String(selectedBookingId) === String(b.id)) {
                opt.selected = true;
            }
            sel.appendChild(opt);
        });
    });
}

function filterBookingOrderOptions(query) {
    const q = (query || '').toLowerCase().trim();
    const clearBtn1 = document.getElementById('btn-clear-booking-search');
    const clearBtn2 = document.getElementById('modal-btn-clear-booking-search');
    if (clearBtn1) clearBtn1.classList.toggle('hidden', !q);
    if (clearBtn2) clearBtn2.classList.toggle('hidden', !q);

    if (!q) {
        renderBookingOrderOptions(activeBookingsCache);
        return;
    }

    const filtered = (activeBookingsCache || []).filter(b => {
        const cust = (b.customer_name || '').toLowerCase();
        const code = (b.booking_code || '').toLowerCase();
        const num = (b.booking_number || '').toLowerCase();
        const deliv = (b.delivery_location || '').toLowerCase();
        const pick = (b.pickup_location || '').toLowerCase();
        return cust.includes(q) || code.includes(q) || num.includes(q) || deliv.includes(q) || pick.includes(q);
    });

    renderBookingOrderOptions(filtered);
    if (filtered.length === 1) {
        const sel = document.getElementById('select-booking-order');
        if (sel) {
            sel.value = filtered[0].id;
            onBookingSelected(filtered[0].id);
        }
    }
}

function clearBookingOrderSearch() {
    const inp1 = document.getElementById('search-booking-order');
    const inp2 = document.getElementById('modal-search-booking-order');
    if (inp1) inp1.value = '';
    if (inp2) inp2.value = '';
    filterBookingOrderOptions('');
}

let isBookingPriceAutoFilled = false;

async function lookupBookingPrice() {
    const custEl = document.getElementById('booking-customer');
    const custVal = custEl ? custEl.value.trim() : '';
    const pickEl = document.getElementById('booking-pickup');
    const pickVal = pickEl ? pickEl.value.trim() : '';
    const delivEl = document.getElementById('booking-delivery');
    const delivVal = delivEl ? delivEl.value.trim() : '';
    const sizeEl = document.getElementById('booking-container-size');
    const sizeVal = sizeEl ? sizeEl.value.trim() : '40HC';
    const priceInput = document.getElementById('booking-price');
    const hintEl = document.getElementById('booking-price-hint');

    if (!custVal) {
        if (hintEl) {
            hintEl.innerText = '';
            hintEl.classList.add('hidden');
        }
        return;
    }

    if (priceInput) priceInput.classList.remove('border-rose-500', 'bg-rose-50');

    try {
        const params = new URLSearchParams({
            customer: custVal,
            pickup: pickVal,
            delivery: delivVal,
            container_size: sizeVal
        });
        const res = await fetchWithAuth(`/api/sales/price-lookup/?${params.toString()}`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.found && data.price > 0) {
            if (priceInput && (!priceInput.value || isBookingPriceAutoFilled)) {
                priceInput.value = formatNumberVN(data.price);
                isBookingPriceAutoFilled = true;
            }
            if (hintEl) {
                hintEl.innerHTML = `<span class="text-teal-700 font-bold flex items-center gap-1"><i class="ph-bold ph-check-circle text-xs"></i> ${data.message || data.source} (${formatMoneyVND(data.price)})</span>`;
                hintEl.classList.remove('hidden');
            }
        } else {
            isBookingPriceAutoFilled = false;
            if (hintEl) {
                hintEl.innerHTML = `<span class="text-amber-700 font-bold flex items-center gap-1"><i class="ph-bold ph-warning-circle text-xs"></i> Tuyến này chưa có báo giá ký kết. Vui lòng kiểm tra kỹ và nhập đơn giá cước bán (Bắt buộc)!</span>`;
                hintEl.classList.remove('hidden');
            }
        }
    } catch (err) {
        console.error('Error looking up booking price:', err);
    }
}

function onBookingPriceManualInput() {
    isBookingPriceAutoFilled = false;
    const priceInput = document.getElementById('booking-price');
    if (priceInput) priceInput.classList.remove('border-rose-500', 'bg-rose-50');
    const hintEl = document.getElementById('booking-price-hint');
    if (hintEl && hintEl.innerHTML.includes('Bắt buộc')) {
        hintEl.classList.add('hidden');
    }
}
