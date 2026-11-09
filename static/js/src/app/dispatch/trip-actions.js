// Helper đổ dữ liệu Chặng / Tài xế / Đầu kéo vào dropdown chi phí (Hỗ trợ Tài xế đăng nhập & Admin văn phòng)
function populateExpenseLegOptions(selectElId, selectedVal = null) {
    const select = document.getElementById(selectElId);
    if (!select || !currentActiveTripData) return;

    const t = currentActiveTripData;
    let html = '';

    // Xác định thông tin người dùng đang đăng nhập
    const currentUser = window.CURRENT_USER || {};
    const isCurrentUserDriver = currentUser.role === 'DRIVER';
    const currentEmpId = currentUser.employee_id;

    // Xác định giá trị mặc định được chọn
    let targetVal = selectedVal;
    if (!targetVal) {
        if (isCurrentUserDriver && currentEmpId) {
            if (t.is_split_trip && t.dropoff_driver_id === currentEmpId) {
                targetVal = 'LEG_2';
            } else if (t.driver_id === currentEmpId) {
                targetVal = t.is_split_trip ? 'LEG_1' : 'ENTIRE';
            } else {
                targetVal = `DRIVER_${currentEmpId}`;
            }
        } else {
            // Mặc định cho Admin / Điều phối văn phòng
            targetVal = t.is_split_trip ? 'LEG_1' : 'ENTIRE';
        }
    }

    // Nhóm 1: Chặng vận chuyển & Tài xế Chuyến xe
    html += `<optgroup label="Tài xế & Chặng theo Chuyến xe">`;
    if (t.is_split_trip) {
        const driver1 = t.driver || 'Tài xế Chặng 1';
        const veh1 = t.vehicle || 'Xe 1';
        const driver2 = t.dropoff_driver || 'Tài xế Chặng 2';
        const veh2 = t.dropoff_vehicle || 'Xe 2';

        html += `<option value="LEG_1" data-driver-id="${t.driver_id || ''}" data-vehicle-id="${t.vehicle_id || ''}" ${targetVal === 'LEG_1' ? 'selected' : ''}>Chặng 1 (Lấy cont ➔ Kho): ${driver1} (${veh1})</option>`;
        html += `<option value="LEG_2" data-driver-id="${t.dropoff_driver_id || ''}" data-vehicle-id="${t.dropoff_vehicle_id || ''}" ${targetVal === 'LEG_2' ? 'selected' : ''}>Chặng 2 (Kho ➔ Hạ bãi): ${driver2} (${veh2})</option>`;
        html += `<option value="ENTIRE" data-driver-id="${t.driver_id || ''}" data-vehicle-id="${t.vehicle_id || ''}" ${targetVal === 'ENTIRE' ? 'selected' : ''}>Toàn trình: ${driver1} (${veh1})</option>`;
        html += `<option value="COMPANY" ${targetVal === 'COMPANY' ? 'selected' : ''}>Công ty chi chung (Cược cont, nâng hạ chuyển khoản VP...)</option>`;
    } else {
        const driver = t.driver || 'Tài xế';
        const veh = t.vehicle || 'Đầu kéo';
        html += `<option value="ENTIRE" data-driver-id="${t.driver_id || ''}" data-vehicle-id="${t.vehicle_id || ''}" ${targetVal === 'ENTIRE' || targetVal === 'LEG_1' ? 'selected' : ''}>Toàn trình: ${driver} (${veh})</option>`;
        html += `<option value="COMPANY" ${targetVal === 'COMPANY' ? 'selected' : ''}>Công ty chi chung (Cược cont, nâng hạ chuyển khoản VP...)</option>`;
    }
    html += `</optgroup>`;

    // Nhóm 2: Chọn tài xế khác trong Đội xe (Admin / Điều phối văn phòng có thể chọn tài khác)
    if (t.available_drivers && t.available_drivers.length > 0) {
        html += `<optgroup label="Tất cả Tài xế Đội xe (Admin / Điều phối chọn)">`;
        t.available_drivers.forEach(d => {
            const val = `DRIVER_${d.id}`;
            const isSelected = (targetVal === val || targetVal === d.id);
            const vehPlate = d.vehicle ? ` - Xe: ${d.vehicle}` : '';
            html += `<option value="${val}" data-driver-id="${d.id}" data-vehicle-id="${d.vehicle_id || ''}" ${isSelected ? 'selected' : ''}>${d.name} [${d.code}]${vehPlate}</option>`;
        });
        html += `</optgroup>`;
    }

    select.innerHTML = html;
}

// --- QUẢN LÝ MỐC CHỜ HẠ CONT SAU 0H & TÍNH PHÍ LƯU XE ---
function openModalDetention() {
    if (!currentActiveTripData) return;
    const t = currentActiveTripData;
    const modal = document.getElementById('modal-detention');
    if (!modal) return;

    const gateoutEl = document.getElementById('detention-modal-gateout-time');
    if (gateoutEl) gateoutEl.innerText = t.actual_gate_out_time || t.loading_time || 'Chưa ghi nhận mốc ra cổng';

    const inpAppoint = document.getElementById('detention-inp-appointment');
    if (inpAppoint) inpAppoint.value = (t.dropoff_appointment_time && t.dropoff_appointment_time !== '-') ? t.dropoff_appointment_time : 'Sau 00:00';

    const inpActual = document.getElementById('detention-inp-actual');
    if (inpActual) inpActual.value = (t.actual_dropoff_time && t.actual_dropoff_time !== '-') ? t.actual_dropoff_time : '';

    const inpReason = document.getElementById('detention-inp-reason');
    if (inpReason && t.detention_reason) inpReason.value = t.detention_reason;

    const inpHours = document.getElementById('detention-inp-hours');
    if (inpHours) inpHours.value = t.overnight_wait_hours > 0 ? t.overnight_wait_hours : 8.0;

    const chkOvernight = document.getElementById('detention-chk-overnight');
    if (chkOvernight) chkOvernight.checked = t.is_overnight_detention || true;

    const inpFeeCust = document.getElementById('detention-inp-fee-customer');
    if (inpFeeCust) {
        inpFeeCust.value = t.detention_fee_customer > 0 ? new Intl.NumberFormat('vi-VN').format(t.detention_fee_customer) : '800.000';
    }

    const inpAllowDrv = document.getElementById('detention-inp-allowance-driver');
    if (inpAllowDrv) {
        inpAllowDrv.value = t.detention_driver_allowance > 0 ? new Intl.NumberFormat('vi-VN').format(t.detention_driver_allowance) : '250.000';
    }

    modal.classList.remove('hidden-view');
}

function closeModalDetention() {
    const modal = document.getElementById('modal-detention');
    if (modal) modal.classList.add('hidden-view');
}

function setQuickAppointment(val) {
    const inp = document.getElementById('detention-inp-appointment');
    if (inp) inp.value = val;
}

function setCurrentTimeToDropoff() {
    const inp = document.getElementById('detention-inp-actual');
    if (!inp) return;
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())} ${pad(now.getDate())}/${pad(now.getMonth() + 1)}`;
    inp.value = timeStr;
}

async function submitDetentionUpdate() {
    if (!currentActiveTripData) return;
    const tripCode = currentActiveTripData.trip_code || currentActiveTripData.id;
    
    const appointmentTime = document.getElementById('detention-inp-appointment')?.value?.trim();
    const actualTime = document.getElementById('detention-inp-actual')?.value?.trim();
    const reason = document.getElementById('detention-inp-reason')?.value?.trim();
    const hours = parseFloat(document.getElementById('detention-inp-hours')?.value || 0);
    const isOvernight = document.getElementById('detention-chk-overnight')?.checked ?? true;
    
    const parseMoney = (id) => {
        const val = document.getElementById(id)?.value?.replace(/\./g, '').replace(/,/g, '').trim();
        return parseInt(val) || 0;
    };
    
    const feeCustomer = parseMoney('detention-inp-fee-customer');
    const allowanceDriver = parseMoney('detention-inp-allowance-driver');
    const autoCreateExpense = document.getElementById('detention-chk-auto-expense')?.checked ?? true;

    try {
        const res = await fetchWithAuth(`/api/trips/${tripCode}/`, {
            method: 'PATCH',
            body: JSON.stringify({
                dropoff_appointment_time: appointmentTime,
                actual_dropoff_time: actualTime,
                detention_reason: reason,
                overnight_wait_hours: hours,
                is_overnight_detention: isOvernight,
                detention_fee_customer: feeCustomer,
                detention_driver_allowance: allowanceDriver,
                auto_create_driver_allowance: autoCreateExpense
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Cập nhật thất bại');

        closeModalDetention();
        showToast('success', 'Đã lưu mốc hẹn hạ sau 0h và tính phí lưu xe thành công!', 'Tiến Độ Hạ Cont');

        // Tải lại chi tiết chuyến xe
        if (typeof openTripDetail === 'function') {
            await openTripDetail(tripCode);
        }
    } catch (err) {
        showToast('danger', err.message || 'Lỗi khi cập nhật mốc lưu xe', 'Thất bại');
    }
}

// Xác nhận nhận chuyến thay tài xế (khi điều độ gọi điện thoại trực tiếp)
async function confirmTripManually() {
    const trip = window.currentTripDetail;
    if (!trip) return;
    const confirmed = await showConfirmModal({
        title: 'Xác Nhận Nhận Chuyến',
        message: `Xác nhận bác tài ${trip.driver} ĐÃ NHẬN CHUYẾN ${trip.id} qua điện thoại?\n\nTrạng thái sẽ được chuyển sang ĐÃ NHẬN VIỆC (ACCEPTED).`,
        confirmText: 'Xác Nhận Nhận Chuyến',
        cancelText: 'Huỷ bỏ',
        type: 'success',
        icon: 'ph-bold ph-phone-call text-2xl'
    });
    if (!confirmed) return;

    try {
        const res = await fetchWithAuth(`/api/trips/${trip.id}/milestones/`, {
            method: 'POST',
            body: JSON.stringify({
                milestone: 'ACCEPTED_TRIP',
                notes: 'Điều độ viên xác nhận nhận chuyến thay tài xế qua điện thoại'
            })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', `Đã xác nhận nhận chuyến ${trip.id}!`, 'Xác Nhận Thành Công');
            await viewTripDetail(trip.id);
            if (typeof loadTripsData === 'function') loadTripsData();
        } else {
            showToast('danger', data.message || data.error || 'Không thể xác nhận chuyến');
        }
    } catch (err) {
        console.error('Error confirming trip:', err);
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}
window.confirmTripManually = confirmTripManually;

// Modal Phân Lại Xe / Bác Tài (Khi Quá Hạn Xác Nhận)
function openReassignDriverModal() {
    const trip = window.currentTripDetail;
    if (!trip) return;
    
    const modal = document.getElementById('modal-reassign-driver');
    if (!modal) return;

    const selectDrv = document.getElementById('reassign-driver-select');
    if (selectDrv && trip.available_drivers) {
        selectDrv.innerHTML = '<option value="">-- Chọn Bác Tài Mới Thay Thế --</option>' + 
            trip.available_drivers.map(d => `<option value="${d.id}" data-veh="${d.vehicle_id || ''}">${escapeHtml(d.name)} ${d.vehicle ? `(Xe: ${d.vehicle})` : ''}</option>`).join('');
    }
    
    const currInfo = document.getElementById('reassign-current-info');
    if (currInfo) {
        currInfo.innerText = `Chuyến: ${trip.id} | Bác tài hiện tại: ${trip.driver} (${trip.vehicle})`;
    }

    modal.classList.remove('hidden-view');
    modal.classList.remove('hidden');
}
window.openReassignDriverModal = openReassignDriverModal;

function closeReassignDriverModal() {
    const modal = document.getElementById('modal-reassign-driver');
    if (modal) {
        modal.classList.add('hidden-view');
        modal.classList.add('hidden');
    }
}
window.closeReassignDriverModal = closeReassignDriverModal;

async function submitReassignDriver(e) {
    e.preventDefault();
    const trip = window.currentTripDetail;
    if (!trip) return;

    const selectDrv = document.getElementById('reassign-driver-select');
    const driverId = selectDrv?.value;
    if (!driverId) {
        alert('Vui lòng chọn tài xế mới!');
        return;
    }

    const selectedOption = selectDrv.options[selectDrv.selectedIndex];
    const vehId = selectedOption?.getAttribute('data-veh');
    const reason = document.getElementById('reassign-reason')?.value || 'Tài xế cũ không phản hồi sau 60 phút';

    try {
        const payload = {
            driver_id: parseInt(driverId, 10),
            notes: `[ĐỔI TÀI XẾ] ${reason}`
        };
        if (vehId && vehId !== 'null' && vehId !== '') {
            payload.vehicle_id = parseInt(vehId, 10);
        }

        const res = await fetchWithAuth(`/api/trips/${trip.id}/`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
            (data.warnings || []).forEach(w => showToast('warning', w, 'Loại xe không khớp loại hàng'));
            closeReassignDriverModal();
            showToast('success', `Đã phân công lại chuyến ${trip.id} cho tài xế mới!`, 'Phân Xe Thành Công');
            await viewTripDetail(trip.id);
            if (typeof loadTripsData === 'function') loadTripsData();

            // Tự động mở Zalo cho bác tài mới
            const newTrip = window.currentTripDetail;
            if (newTrip && newTrip.driver_phone) {
                const cleanPhone = String(newTrip.driver_phone).replace(/\D/g, '');
                const msg = buildDriverZaloMessage(newTrip);
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(msg).catch(() => {});
                }
                showToast('success', `Đã sao chép Lệnh điều xe & Mở Zalo tài xế mới (${cleanPhone}). Hãy dán (Ctrl+V) để gửi!`, 'Mở Zalo Tài Xế Mới');
                window.open(`https://zalo.me/${cleanPhone}`, '_blank');
            }
        } else {
            showToast('danger', data.message || data.error || 'Lỗi khi phân lại tài xế');
        }
    } catch (err) {
        console.error('Error reassigning driver:', err);
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}
window.submitReassignDriver = submitReassignDriver;

// =========================================================================
// PHÂN HỆ HIỆU CHỈNH LỆNH ĐIỀU ĐỘNG & HỦY CHUYẾN XE (TRIP CRUD)
// =========================================================================
async function openModalEditTrip(tripCode = null) {
    const detailId = document.getElementById('detail-id')?.innerText?.trim();
    const modalTripCode = document.getElementById('edit-modal-trip-code')?.innerText?.trim();
    const code = tripCode 
        || (window.currentTripDetail ? (window.currentTripDetail.id || window.currentTripDetail.trip_code) : null)
        || (detailId && detailId !== 'GSS-XXX' ? detailId : null)
        || (modalTripCode && modalTripCode !== 'GSS-XXX' ? modalTripCode : null);
    if (!code) {
        showToast('warning', 'Vui lòng chọn chuyến xe cần hiệu chỉnh!');
        return;
    }

    // Tải master data options và kiểm tra đồng bộ tức thời
    if (typeof checkAndSyncMasterData === 'function') {
        await checkAndSyncMasterData(false);
    } else if (typeof loadMasterDataFormOptions === 'function') {
        await loadMasterDataFormOptions();
    }
    if (typeof populateMasterDataDropdowns === 'function') {
        populateMasterDataDropdowns();
    }

    // Đổ danh sách Khách hàng, Bác tài, Đầu kéo, Rơ-mooc vào Form Edit nếu có cache
    if (typeof masterDataFormOptionsCache !== 'undefined' && masterDataFormOptionsCache) {
        const { customers, drivers, vehicles, trailers } = masterDataFormOptionsCache;
        
        const custSel = document.getElementById('edit-inp-customer');
        if (custSel && Array.isArray(customers)) {
            const curVal = custSel.value;
            custSel.innerHTML = '<option value="">-- Chọn Khách Hàng --</option>' +
                customers.map(c => `<option value="${c.id}">${escapeHtml(c.label || c.name)}</option>`).join('');
            if (curVal) custSel.value = curVal;
        }

        const drvSel = document.getElementById('edit-inp-driver');
        if (drvSel && Array.isArray(drivers)) {
            const curVal = drvSel.value;
            drvSel.innerHTML = '<option value="">-- Chọn Bác Tài --</option>' +
                drivers.map(d => `<option value="${d.id}">${escapeHtml(d.label || d.nickname || d.full_name)}</option>`).join('');
            if (curVal) drvSel.value = curVal;
        }

        const vehSel = document.getElementById('edit-inp-vehicle');
        if (vehSel && Array.isArray(vehicles)) {
            const curVal = vehSel.value;
            vehSel.innerHTML = '<option value="">-- Chọn Đầu kéo/ Xe tải --</option>' +
                vehicles.map(v => `<option value="${v.id}">${escapeHtml(v.label || v.plate)}</option>`).join('');
            if (curVal) vehSel.value = curVal;
        }

        const trlSel = document.getElementById('edit-inp-trailer');
        if (trlSel && Array.isArray(trailers)) {
            const curVal = trlSel.value;
            trlSel.innerHTML = '<option value="">-- Chọn Rơ-Moóc --</option>' +
                trailers.map(t => `<option value="${t.id}">${escapeHtml(t.label || t.plate)}</option>`).join('');
            if (curVal) trlSel.value = curVal;
        }

        const dropDrvSel = document.getElementById('edit-inp-dropoff-driver');
        if (dropDrvSel && Array.isArray(drivers)) {
            const curVal = dropDrvSel.value;
            dropDrvSel.innerHTML = '<option value="">-- Bỏ trống (Chưa gán) --</option>' +
                drivers.map(d => `<option value="${d.id}">${escapeHtml(d.label || d.nickname || d.full_name)}</option>`).join('');
            if (curVal) dropDrvSel.value = curVal;
        }

        const dropVehSel = document.getElementById('edit-inp-dropoff-vehicle');
        if (dropVehSel && Array.isArray(vehicles)) {
            const curVal = dropVehSel.value;
            const ownedList = vehicles.filter(v => v.ownership_code === 'OWNED');
            dropVehSel.innerHTML = '<option value="">-- Chọn Đầu kéo Chặng 2 --</option>' +
                ownedList.map(v => `<option value="${v.id}">${escapeHtml(v.label || v.plate)}</option>`).join('');
            if (curVal) dropVehSel.value = curVal;
        }
    }

    // Lấy thông tin chuyến xe
    let trip = window.currentTripDetail;
    if (!trip || trip.id !== code) {
        try {
            const res = await fetchWithAuth(`/api/trips/${code}/`);
            if (res.ok) {
                trip = await res.json();
                window.currentTripDetail = trip;
            }
        } catch (e) {
            console.error('Error fetching trip detail for edit:', e);
        }
    }

    if (!trip) {
        showToast('danger', 'Không tìm thấy dữ liệu chuyến xe');
        return;
    }

    // Gán dữ liệu lên form Edit
    const codeEl = document.getElementById('edit-modal-trip-code');
    if (codeEl) codeEl.innerText = trip.id || trip.trip_code;

    // Customer
    const custSel = document.getElementById('edit-inp-customer');
    if (custSel) {
        if (trip.customer_id) {
            custSel.value = trip.customer_id;
        } else if (trip.customer) {
            for (let i = 0; i < custSel.options.length; i++) {
                if (custSel.options[i].text.toLowerCase().includes(trip.customer.toLowerCase())) {
                    custSel.selectedIndex = i;
                    break;
                }
            }
        }
    }

    // Type & Container type
    const typeSel = document.getElementById('edit-inp-type');
    if (typeSel) {
        if (typeof cleanupTransportTypeOptions === 'function') cleanupTransportTypeOptions(typeSel);
        setSelectValueCaseInsensitive(typeSel, trip.type || 'Nhập');
    }
    const contTypeSel = document.getElementById('edit-inp-cont-type');
    if (contTypeSel) contTypeSel.value = trip.container_type || '40HC';

    // Container, Seal, Booking, VGM
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = (val && val !== '-') ? val : '';
    };

    setVal('edit-inp-booking', trip.booking);
    setVal('edit-inp-cont', trip.container);
    setVal('edit-inp-seal', trip.seal);
    setVal('edit-inp-vgm', trip.vgm_weight);

    // 3 Điểm
    setVal('edit-inp-pickup', trip.pickup);
    setVal('edit-inp-warehouse', trip.warehouse);
    setVal('edit-inp-dropoff', trip.dropoff);

    // Lịch đóng hàng
    setVal('edit-inp-loading-date', trip.raw_loading_date || trip.loading_date_raw || (trip.loading_date && trip.loading_date.match(/^\d{4}-\d{2}-\d{2}$/) ? trip.loading_date : ''));
    setVal('edit-inp-loading-time', trip.loading_time);
    setVal('edit-inp-dock', trip.warehouse_dock);

    // Driver, Vehicle, Trailer
    const drvSel = document.getElementById('edit-inp-driver');
    if (drvSel) {
        if (trip.driver_id) drvSel.value = trip.driver_id;
        else if (trip.driver) {
            for (let i = 0; i < drvSel.options.length; i++) {
                if (drvSel.options[i].text.toLowerCase().includes(trip.driver.toLowerCase())) {
                    drvSel.selectedIndex = i;
                    break;
                }
            }
        }
    }

    const vehSel = document.getElementById('edit-inp-vehicle');
    if (vehSel) {
        if (trip.vehicle_id) vehSel.value = trip.vehicle_id;
        else if (trip.vehicle) {
            for (let i = 0; i < vehSel.options.length; i++) {
                if (vehSel.options[i].text.toLowerCase().includes(trip.vehicle.toLowerCase())) {
                    vehSel.selectedIndex = i;
                    break;
                }
            }
        }
    }

    const trlSel = document.getElementById('edit-inp-trailer');
    if (trlSel && trip.trailer_id) trlSel.value = trip.trailer_id;

    // Chặng 2 (Cắt kéo)
    const editDropDrvSel = document.getElementById('edit-inp-dropoff-driver');
    if (editDropDrvSel) {
        if (trip.dropoff_driver_id) {
            editDropDrvSel.value = trip.dropoff_driver_id;
        } else if (trip.dropoff_driver) {
            for (let i = 0; i < editDropDrvSel.options.length; i++) {
                if (editDropDrvSel.options[i].text.toLowerCase().includes(trip.dropoff_driver.toLowerCase())) {
                    editDropDrvSel.selectedIndex = i;
                    break;
                }
            }
        } else {
            editDropDrvSel.value = '';
        }
    }

    const editDropVehSel = document.getElementById('edit-inp-dropoff-vehicle');
    if (editDropVehSel) {
        if (trip.dropoff_vehicle_id) {
            editDropVehSel.value = trip.dropoff_vehicle_id;
        } else if (trip.dropoff_vehicle) {
            for (let i = 0; i < editDropVehSel.options.length; i++) {
                if (editDropVehSel.options[i].text.toLowerCase().includes(trip.dropoff_vehicle.toLowerCase())) {
                    editDropVehSel.selectedIndex = i;
                    break;
                }
            }
        } else {
            editDropVehSel.value = '';
        }
    }

    // Phụ & Ghi chú
    setVal('edit-inp-invoice', trip.commercial_invoice);
    setVal('edit-inp-free-det', trip.det_free_days || 3);
    const locTypeSel = document.getElementById('edit-inp-location-type');
    if (locTypeSel) locTypeSel.value = trip.cont_location_type || 'BÃI CÔNG TY';
    setVal('edit-inp-notes', trip.cargo_notes);

    // Mở modal
    const modal = document.getElementById('modal-edit-trip');
    if (modal) {
        modal.classList.remove('hidden-view');
        modal.classList.remove('hidden');
    }
}
window.openModalEditTrip = openModalEditTrip;
function onEditDropoffDriverChange(driverId) {
    if (!masterDataFormOptionsCache || !driverId) return;
    const { drivers, vehicles } = masterDataFormOptionsCache;
    const driver = (drivers || []).find(d => String(d.id) === String(driverId));
    const vehSel = document.getElementById('edit-inp-dropoff-vehicle');
    if (driver && vehSel && !vehSel.value) {
        const matchedVeh = (vehicles || []).find(v => v.ownership_code === 'OWNED' && (v.driver_id === driver.id || v.driver_name === driver.nickname || v.driver_name === driver.full_name));
        if (matchedVeh) {
            vehSel.value = matchedVeh.id;
        }
    }
}
window.onEditDropoffDriverChange = onEditDropoffDriverChange;


async function submitEditTripForm() {
    const modalCode = document.getElementById('edit-modal-trip-code')?.innerText?.trim();
    const trip = window.currentTripDetail;
    const tripCode = (trip && (trip.id || trip.trip_code)) || (modalCode && modalCode !== 'GSS-XXX' ? modalCode : null);

    if (!tripCode) {
        showToast('warning', 'Không tìm thấy thông tin chuyến xe để cập nhật');
        return;
    }

    // Kiểm tra tính hợp lệ của các trường bắt buộc với thông báo trực quan
    const custId = document.getElementById('edit-inp-customer')?.value;
    if (!custId) {
        showToast('warning', 'Vui lòng chọn Khách Hàng!');
        document.getElementById('edit-inp-customer')?.focus();
        return;
    }
    const pickup = document.getElementById('edit-inp-pickup')?.value?.trim();
    if (!pickup) {
        showToast('warning', 'Vui lòng nhập 1. Nơi Lấy Cont!');
        document.getElementById('edit-inp-pickup')?.focus();
        return;
    }
    const warehouse = document.getElementById('edit-inp-warehouse')?.value?.trim();
    if (!warehouse) {
        showToast('warning', 'Vui lòng nhập 2. Kho Đóng/ Trả Hàng!');
        document.getElementById('edit-inp-warehouse')?.focus();
        return;
    }

    const btnSave = document.getElementById('btn-save-edit-trip');
    if (btnSave) {
        btnSave.disabled = true;
        btnSave.innerHTML = '<i class="ph ph-spinner-gap animate-spin mr-1"></i> Đang lưu...';
    }

    const payload = {
        customer_id: document.getElementById('edit-inp-customer')?.value || null,
        transport_type: document.getElementById('edit-inp-type')?.value || 'Nhập',
        container_type: document.getElementById('edit-inp-cont-type')?.value || '40HC',
        booking_number: document.getElementById('edit-inp-booking')?.value?.trim() || '',
        container_number: document.getElementById('edit-inp-cont')?.value?.trim() || '',
        seal_number: document.getElementById('edit-inp-seal')?.value?.trim() || '',
        vgm_weight: document.getElementById('edit-inp-vgm')?.value?.trim() || '',
        pickup_location: document.getElementById('edit-inp-pickup')?.value?.trim() || '',
        warehouse_location: document.getElementById('edit-inp-warehouse')?.value?.trim() || '',
        dropoff_location: document.getElementById('edit-inp-dropoff')?.value?.trim() || '',
        loading_date: document.getElementById('edit-inp-loading-date')?.value || null,
        loading_time: document.getElementById('edit-inp-loading-time')?.value?.trim() || '',
        warehouse_dock: document.getElementById('edit-inp-dock')?.value?.trim() || '',
        driver_id: document.getElementById('edit-inp-driver')?.value || null,
        vehicle_id: document.getElementById('edit-inp-vehicle')?.value || null,
        trailer_id: document.getElementById('edit-inp-trailer')?.value || null,
        dropoff_driver_id: document.getElementById('edit-inp-dropoff-driver')?.value || null,
        dropoff_vehicle_id: document.getElementById('edit-inp-dropoff-vehicle')?.value || null,
        commercial_invoice: document.getElementById('edit-inp-invoice')?.value?.trim() || '',
        free_det_days: document.getElementById('edit-inp-free-det')?.value || 3,
        cont_location_type: document.getElementById('edit-inp-location-type')?.value || 'BÃI CÔNG TY',
        cargo_notes: document.getElementById('edit-inp-notes')?.value?.trim() || ''
    };

    try {
        const res = await fetchWithAuth(`/api/trips/${encodeURIComponent(tripCode)}/`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
            closeModal('modal-edit-trip');
            showToast('success', `Đã cập nhật lệnh điều động ${tripCode} thành công!`, 'Lưu Thành Công');
            
            // Nếu đang mở trang Chi tiết chuyến xe thì tải lại dữ liệu mới nhất
            const detailView = document.getElementById('view-trip-detail');
            if (detailView && !detailView.classList.contains('hidden-view')) {
                if (typeof viewTripDetail === 'function') await viewTripDetail(tripCode);
            }
            if (typeof loadTripsData === 'function') loadTripsData();
        } else {
            showToast('danger', data.error || data.message || 'Lỗi khi cập nhật chuyến xe');
        }
    } catch (err) {
        console.error('Error updating trip:', err);
        showToast('danger', 'Lỗi kết nối máy chủ');
    } finally {
        if (btnSave) {
            btnSave.disabled = false;
            btnSave.innerHTML = '<i class="ph-bold ph-floppy-disk text-sm"></i> Lưu';
        }
    }
}
window.submitEditTripForm = submitEditTripForm;

async function deleteOrCancelTrip(tripCode = null) {
    const detailId = document.getElementById('detail-id')?.innerText?.trim();
    const modalTripCode = document.getElementById('edit-modal-trip-code')?.innerText?.trim();
    const code = tripCode 
        || (window.currentTripDetail ? (window.currentTripDetail.id || window.currentTripDetail.trip_code) : null)
        || (detailId && detailId !== 'GSS-XXX' ? detailId : null)
        || (modalTripCode && modalTripCode !== 'GSS-XXX' ? modalTripCode : null);
    if (!code) {
        showToast('warning', 'Không xác định được mã phiếu điều độ cần xóa!');
        return;
    }

    const confirmed = await showConfirmModal({
        title: 'Xác Nhận Xóa Phiếu Điều Độ',
        message: `Bạn có chắc chắn muốn xóa / hủy phiếu điều độ "${code}" không?\n\n• Trạng thái chuyến sẽ chuyển sang Đã Hủy (Soft-Delete an toàn bảo toàn Audit Trail).\n• Hạn mức container sẽ tự động hoàn lại cho đơn hàng Booking liên quan.\n• Các chứng từ chi phí và hình ảnh chưa chốt sổ sẽ được đồng bộ dọn dẹp an toàn.`,
        confirmText: 'Xác Nhận Xóa Phiếu',
        cancelText: 'Hủy Bỏ',
        type: 'danger',
        icon: 'ph-bold ph-trash text-2xl'
    });
    if (!confirmed) return;

    try {
        const res = await fetchWithAuth(`/api/trips/${code}/`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                reason: 'Điều độ viên hủy/xóa phiếu điều độ',
                cascade: true 
            })
        });
        const data = await res.json();
        if (res.ok && (data.success || res.status === 204)) {
            if (typeof closeModal === 'function') {
                try { closeModal('modal-edit-trip'); } catch(e) {}
            }
            showToast('success', data.message || `Đã xóa phiếu điều độ ${code} thành công!`, 'Xóa Phiếu Thành Công');
            
            // Nếu đang xem chi tiết của phiếu bị xóa -> Quay về danh sách điều vận
            const currentActiveView = document.querySelector('.view:not(.hidden-view)');
            if (currentActiveView && currentActiveView.id === 'view-trip-detail') {
                if (typeof backToTrips === 'function') backToTrips();
            }
            if (typeof loadTripsData === 'function') {
                await loadTripsData();
            }
        } else {
            showToast('danger', data.error || data.message || 'Không thể xóa phiếu điều độ này!');
        }
    } catch (err) {
        console.error('Error deleting trip:', err);
        showToast('danger', 'Lỗi kết nối máy chủ khi thực hiện xóa phiếu điều độ!');
    }
}
window.deleteOrCancelTrip = deleteOrCancelTrip;
