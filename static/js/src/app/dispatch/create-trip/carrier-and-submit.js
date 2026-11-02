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
            (result.warnings || []).forEach(w => showToast('warning', w, 'Loại xe không khớp loại hàng'));
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
