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
