// -------------------------------------------------------------------------
// 2. DEDICATED FULL-PAGE VIEW: ĐIỀU CHỈNH PHIẾU LƯƠNG (PAYROLL SLIP DETAIL)
// -------------------------------------------------------------------------
async function openPayrollSlipDetailPage(slipId, updateHistory = true) {
    currentViewingSlipId = slipId;

    try {
        const res = await fetchWithAuth(`/api/personnel/slips/${slipId}/`);
        if (!res.ok) throw new Error('Không thể tải chi tiết phiếu lương');
        const s = await res.json();

        document.getElementById('slip-detail-id').value = s.id;
        document.getElementById('sd-avatar').innerText = (s.employee_name || 'NV').slice(0, 2).toUpperCase();
        document.getElementById('sd-emp-name').innerText = `${s.employee_name} (${s.employee_code})`;
        document.getElementById('sd-emp-sub').innerText = `${s.role_label || s.role || 'Nhân viên'} • ${s.department_label || s.department || ''} • STK: ${s.bank_account || '—'} (${s.bank_name || ''})`;
        document.getElementById('sd-slip-code').innerText = s.slip_code || `PL-${s.id}`;
        
        const statusBadge = document.getElementById('sd-status-badge');
        if (statusBadge) {
            statusBadge.innerText = s.is_paid ? 'Đã Thanh Toán' : 'Chờ Chi Lương';
            statusBadge.className = s.is_paid 
                ? 'px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200';
        }

        // Cập nhật 3 Card tổng số
        const fmt = val => new Intl.NumberFormat('vi-VN').format(Math.round(val || 0)) + ' đ';
        document.getElementById('sd-gross-display').innerText = fmt(s.gross_income);
        const totalDeductions = (s.total_insurance_employee || 0) + (s.union_fee_employee || 0) + (s.pit_amount || 0) + (s.advance_deductions || 0) + (s.other_deductions || 0);
        document.getElementById('sd-deductions-display').innerText = '-' + fmt(totalDeductions);
        document.getElementById('sd-net-display').innerText = fmt(s.net_salary);

        // Cấu phần 1: Lương ngày công & HĐLĐ áp dụng
        document.getElementById('sd-time-salary').innerText = fmt(s.time_salary);
        if (document.getElementById('sd-contract-number')) {
            document.getElementById('sd-contract-number').innerText = s.contract_number ? `${s.contract_number} ${s.appendix_number ? '(PL: ' + s.appendix_number + ')' : ''}` : 'Chưa có HĐ';
        }
        document.getElementById('sd-contract-base').innerText = fmt(s.base_salary);
        if (document.getElementById('sd-contract-allowances')) {
            document.getElementById('sd-contract-allowances').innerText = fmt((s.allowance_amount || 0) + (s.subsidy_amount || 0));
        }
        document.getElementById('sd-days-ratio').innerText = `${s.actual_working_days || 0} / 26 công`;
        if (document.getElementById('sd-probation-rate')) {
            document.getElementById('sd-probation-rate').innerText = `${s.probation_rate || 100}%`;
        }
        document.getElementById('sd-paid-leave').innerText = `${s.paid_leave_days || 0} ngày`;
        document.getElementById('sd-holiday-leave').innerText = `${s.holiday_days || 0} ngày`;

        // Cấu phần 2: Lương chuyến xe
        const tripTotal = (s.trip_allowance || 0) + (s.dropoff_allowance || 0) + (s.detention_allowance || 0) + (s.fuel_bonus || 0);
        document.getElementById('sd-trip-salary-total').innerText = fmt(tripTotal);
        document.getElementById('sd-trip-main').innerText = fmt(s.trip_allowance);
        document.getElementById('sd-trip-dropoff').innerText = fmt(s.dropoff_allowance);
        document.getElementById('sd-trip-detention').innerText = fmt(s.detention_allowance);
        document.getElementById('sd-trip-fuel').innerText = fmt(s.fuel_bonus);

        // Cấu phần 3 & 4: Phụ cấp, thưởng & Khấu trừ
        document.getElementById('sd-kpi-bonus').value = new Intl.NumberFormat('vi-VN').format(s.kpi_bonus || 0);
        document.getElementById('sd-other-allowance').value = new Intl.NumberFormat('vi-VN').format(s.other_allowance || 0);
        document.getElementById('sd-phone-allowance').value = new Intl.NumberFormat('vi-VN').format(s.phone_allowance || 0);
        document.getElementById('sd-lunch-allowance').value = new Intl.NumberFormat('vi-VN').format(s.lunch_allowance || 0);
        document.getElementById('sd-advance-deductions').value = new Intl.NumberFormat('vi-VN').format(s.advance_deductions || 0);
        document.getElementById('sd-other-deductions').value = new Intl.NumberFormat('vi-VN').format(s.other_deductions || 0);
        document.getElementById('sd-insurance-employee').value = fmt(s.total_insurance_employee);
        if (document.getElementById('sd-union-fee')) {
            document.getElementById('sd-union-fee').value = fmt(s.union_fee_employee || 0);
        }
        document.getElementById('sd-pit-amount').value = fmt(s.pit_amount);
        document.getElementById('sd-notes').value = s.notes || '';

        // Chuyển View sang view-payroll-slip-detail
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden-view'));
        const slipView = document.getElementById('view-payroll-slip-detail');
        if (slipView) {
            slipView.classList.remove('hidden-view');
            slipView.scrollTop = 0;
            const innerScroll = slipView.querySelector('.overflow-y-auto');
            if (innerScroll) innerScroll.scrollTop = 0;
        }

        setSlipFormReadOnly(true);

        if (typeof setTopbarFullpageMode === 'function') {
            setTopbarFullpageMode({
                backFn: backToPayroll,
                prefix: 'Hành Chính & Nhân Sự',
                title: `Chi Tiết Phiếu Lương | ${s.employee_name} (${s.slip_code || slipId})`,
                subText: '',
                badgesHtml: '',
                actionsHtml: ''
            });
        }
    } catch (e) {
        console.error('Lỗi mở chi tiết phiếu lương:', e);
        showToast('error', e.message || 'Không thể mở chi tiết phiếu lương.', 'Lỗi');
    }
}

function setSlipFormReadOnly(isReadOnly) {
    const editIds = ['sd-kpi-bonus', 'sd-other-allowance', 'sd-phone-allowance', 'sd-lunch-allowance', 'sd-advance-deductions', 'sd-other-deductions', 'sd-notes'];
    editIds.forEach(id_ => {
        const el = document.getElementById(id_);
        if (el) {
            el.disabled = isReadOnly;
            if (isReadOnly) el.classList.add('bg-slate-50', 'cursor-not-allowed');
            else el.classList.remove('bg-slate-50', 'cursor-not-allowed');
        }
    });

    const editBtn = document.getElementById('btn-slip-edit-bottom');
    const saveBtn = document.getElementById('sd-submit-btn');
    const printBtn = document.getElementById('btn-slip-print-bottom');

    if (isReadOnly) {
        if (editBtn) editBtn.classList.remove('hidden');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
            document.getElementById('sd-submit-btn-text').innerText = 'Lưu';
        }
        if (printBtn) printBtn.classList.remove('hidden');
    } else {
        if (editBtn) editBtn.classList.add('hidden');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.classList.remove('hidden', 'opacity-50', 'cursor-not-allowed', 'pointer-events-none');
            document.getElementById('sd-submit-btn-text').innerText = 'Lưu';
        }
    }
}

function enableSlipEdit() {
    setSlipFormReadOnly(false);
    showToast('info', 'Đã bật chế độ điều chỉnh phiếu lương. Vui lòng bấm "Lưu" sau khi cập nhật.', 'Chế Độ Sửa');
}

async function submitSlipDetailForm(event) {
    if (event && event.preventDefault) event.preventDefault();
    const slipId = document.getElementById('slip-detail-id').value;
    if (!slipId) return;

    const parseNum = id_ => {
        const clean = String(document.getElementById(id_)?.value || '0').replace(/\D/g, '');
        return parseFloat(clean) || 0;
    };

    const payload = {
        kpi_bonus: parseNum('sd-kpi-bonus'),
        other_allowance: parseNum('sd-other-allowance'),
        phone_allowance: parseNum('sd-phone-allowance'),
        lunch_allowance: parseNum('sd-lunch-allowance'),
        advance_deductions: parseNum('sd-advance-deductions'),
        other_deductions: parseNum('sd-other-deductions'),
        notes: document.getElementById('sd-notes').value.trim()
    };

    try {
        const res = await fetchWithAuth(`/api/personnel/slips/${slipId}/`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Lỗi cập nhật phiếu lương');

        showToast('success', data.message || 'Đã cập nhật và tính lại toàn bộ phiếu lương thành công!', 'Thành Công');
        
        // Reload lại dữ liệu chi tiết
        await openPayrollSlipDetailPage(slipId);

        // Reload bảng lương kỳ
        const select = document.getElementById('payroll-period-select');
        if (select && select.value) {
            await loadPayrollPeriodDetail(select.value);
        }
    } catch (e) {
        console.error('Lỗi lưu phiếu lương:', e);
        showToast('error', e.message || 'Không thể lưu phiếu lương.', 'Lỗi Thao Tác');
    }
}

function printCurrentPayrollSlip() {
    const slipId = document.getElementById('slip-detail-id')?.value;
    if (slipId && typeof openPrintPayslipModal === 'function') {
        openPrintPayslipModal(parseInt(slipId));
    }
}

function backToPayroll() {
    const slipView = document.getElementById('view-payroll-slip-detail');
    if (slipView) slipView.classList.add('hidden-view');

    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden-view'));
    const personnelView = document.getElementById('view-nhan-su');
    if (personnelView) personnelView.classList.remove('hidden-view');

    if (typeof resetTopbarStandardMode === 'function') {
        resetTopbarStandardMode('nhan-su');
    }

    if (typeof switchHRSubTab === 'function') {
        switchHRSubTab('payroll');
    }
}
