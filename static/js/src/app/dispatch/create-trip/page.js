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
    const typeElInit = document.getElementById('inp-type');
    if (typeElInit && typeof cleanupTransportTypeOptions === 'function') {
        cleanupTransportTypeOptions(typeElInit);
    }
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
