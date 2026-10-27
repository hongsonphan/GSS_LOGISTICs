// --- SUB-PANEL 3: KỲ LƯƠNG & HYBRID PAYROLL ---
// --- SUB-PANEL 3: BẢNG CHẤM CÔNG THÁNG (ATTENDANCE & TIMEKEEPING) ---
let rawAttendanceList = [];

async function loadAttendancePeriodsAndData() {
    try {
        const res = await fetchWithAuth('/api/personnel/periods/');
        if (!res.ok) throw new Error('Không thể tải danh mục kỳ');
        const periods = await res.json();
        
        const select = document.getElementById('attendance-period-select');
        if (select) {
            const curVal = select.value;
            select.innerHTML = (periods || []).map(p => 
                `<option value="${p.id}">[${escapeHtml(p.period_code)}] ${escapeHtml(p.name || '')} (${p.status_label || p.status})</option>`
            ).join('');
            if (curVal && (periods || []).some(p => String(p.id) === String(curVal))) {
                select.value = curVal;
            } else if (periods && periods.length > 0) {
                select.value = periods[0].id;
            }
        }
        await loadAttendanceData();
    } catch (err) {
        console.error('Lỗi nạp kỳ chấm công:', err);
    }
}

async function loadAttendanceData() {
    const select = document.getElementById('attendance-period-select');
    const periodId = select ? select.value : null;
    const tbody = document.getElementById('attendance-tbody');
    const badge = document.getElementById('attendance-count-badge');
    
    if (!periodId) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="14" class="py-6 text-center text-slate-400">Vui lòng chọn hoặc tạo một kỳ chấm công.</td></tr>`;
        return;
    }

    try {
        const res = await fetchWithAuth(`/api/personnel/monthly-attendance/?period_id=${periodId}`);
        if (!res.ok) throw new Error('Không thể tải bảng chấm công');
        const list = await res.json();
        rawAttendanceList = Array.isArray(list) ? list : [];

        if (badge) badge.innerText = `${rawAttendanceList.length} Nhân sự`;

        if (!tbody) return;
        if (rawAttendanceList.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="14" class="p-8 text-center text-slate-400 font-medium">
                        <i class="ph ph-calendar-blank text-3xl mb-2 text-slate-300 block"></i>
                        Chưa có dữ liệu chấm công cho kỳ này.<br/>
                        <button type="button" onclick="autoGenerateMonthlyAttendance()" class="mt-3 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer">
                            <i class="ph-bold ph-magic-wand"></i> Khởi Tạo Công Mặc Định (26 ngày)
                        </button>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = rawAttendanceList.map((row, idx) => {
            const worked = Number(row.worked_days || 0);
            const paidLeave = Number(row.paid_leave_days || 0);
            const holiday = Number(row.holiday_days || 0);
            const unpaid = Number(row.unpaid_leave_days || 0);
            const total = Number(row.total_paid_days || 0);
            const baseSal = Number(row.base_salary || 0);

            return `
                <tr class="hover:bg-slate-50 transition-colors border-b border-slate-200" id="att-row-${row.id}">
                    <td class="py-2 px-3 text-center font-mono font-bold text-slate-500 border-r border-slate-200 select-none">${idx + 1}</td>
                    <td class="py-2 px-3 font-mono font-bold text-teal-900 border-r border-slate-200">${escapeHtml(row.employee_code)}</td>
                    <td class="py-2 px-3 font-bold text-slate-900 border-r border-slate-200">${escapeHtml(row.employee_name)}</td>
                    <td class="py-2 px-3 text-slate-700 border-r border-slate-200">${escapeHtml(row.employee_role_label || row.employee_role || '—')}</td>
                    <td class="py-2 px-3 text-slate-600 border-r border-slate-200">${escapeHtml(row.department_label || row.department || '—')}</td>
                    <td class="py-2 px-3 text-right font-mono font-semibold text-slate-800 border-r border-slate-200">${new Intl.NumberFormat('vi-VN').format(baseSal)} đ</td>
                    <td class="py-2 px-3 text-center font-mono font-bold text-slate-600 border-r border-slate-200 bg-slate-50">${row.standard_days || 26}</td>
                    <td class="py-1 px-2 text-center border-r border-slate-200">
                        <input type="number" step="0.5" min="0" max="31" id="att-worked-${row.id}" value="${worked}" 
                            oninput="recalcAttendanceRow(${row.id})"
                            class="w-16 px-1.5 py-1 text-center font-mono font-bold text-teal-800 bg-white border border-slate-300 rounded focus:border-teal-500 focus:ring-1 focus:ring-teal-500">
                    </td>
                    <td class="py-1 px-2 text-center border-r border-slate-200">
                        <input type="number" step="0.5" min="0" max="31" id="att-pleave-${row.id}" value="${paidLeave}" 
                            oninput="recalcAttendanceRow(${row.id})"
                            class="w-16 px-1.5 py-1 text-center font-mono font-bold text-emerald-800 bg-white border border-slate-300 rounded focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500">
                    </td>
                    <td class="py-1 px-2 text-center border-r border-slate-200">
                        <input type="number" step="0.5" min="0" max="31" id="att-holiday-${row.id}" value="${holiday}" 
                            oninput="recalcAttendanceRow(${row.id})"
                            class="w-16 px-1.5 py-1 text-center font-mono font-bold text-amber-800 bg-white border border-slate-300 rounded focus:border-amber-500 focus:ring-1 focus:ring-amber-500">
                    </td>
                    <td class="py-1 px-2 text-center border-r border-slate-200">
                        <input type="number" step="0.5" min="0" max="31" id="att-unpaid-${row.id}" value="${unpaid}" 
                            class="w-16 px-1.5 py-1 text-center font-mono font-bold text-rose-700 bg-white border border-slate-300 rounded focus:border-rose-500 focus:ring-1 focus:ring-rose-500">
                    </td>
                    <td class="py-2 px-3 text-center font-mono font-black text-indigo-900 border-r border-slate-200 bg-indigo-50/50" id="att-total-${row.id}">
                        ${total}
                    </td>
                    <td class="py-1 px-2 text-center border-r border-slate-200">
                        <input type="number" step="0.5" min="0" max="200" id="att-ot-${row.id}" value="${Number(row.overtime_hours || 0)}" 
                            class="w-16 px-1.5 py-1 text-center font-mono text-slate-700 bg-white border border-slate-300 rounded focus:border-slate-500">
                    </td>
                    <td class="py-2 px-3 text-center">
                        <button type="button" onclick="saveAttendanceRow(${row.id}, ${row.employee})"
                            class="px-2.5 py-1 bg-transparent hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-600 rounded text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                            title="Lưu dòng này">
                            <i class="ph-bold ph-floppy-disk"></i> Lưu
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        if (window.BimTableFooter && Array.isArray(rawAttendanceList)) {
            const totalBaseSal = rawAttendanceList.reduce((sum, r) => sum + (Number(r.base_salary) || 0), 0);
            const totalWorked = rawAttendanceList.reduce((sum, r) => sum + (Number(r.worked_days) || 0), 0);
            const totalPLeave = rawAttendanceList.reduce((sum, r) => sum + (Number(r.paid_leave_days) || 0), 0);
            const totalHoliday = rawAttendanceList.reduce((sum, r) => sum + (Number(r.holiday_days) || 0), 0);
            const totalUnpaid = rawAttendanceList.reduce((sum, r) => sum + (Number(r.unpaid_leave_days) || 0), 0);
            const totalPaidDays = rawAttendanceList.reduce((sum, r) => sum + (Number(r.total_paid_days) || 0), 0);
            const totalOT = rawAttendanceList.reduce((sum, r) => sum + (Number(r.overtime_hours) || 0), 0);
            window.BimTableFooter.render('attendance-table', {
                cells: [
                    { text: 'TỔNG', align: 'center', class: 'font-black text-slate-900 font-heading' },
                    { html: `<span class="text-teal-800 font-extrabold">${rawAttendanceList.length}</span> nhân sự chấm công`, colspan: 4, class: 'text-slate-700' },
                    { html: `<span class="text-slate-900 font-bold tabular-nums font-mono">${new Intl.NumberFormat('vi-VN').format(totalBaseSal)} đ</span>`, align: 'right' },
                    { text: '', align: 'center' },
                    { html: `<span class="text-teal-800 font-bold tabular-nums font-mono">${totalWorked.toFixed(1)}</span>`, align: 'center' },
                    { html: `<span class="text-emerald-800 font-bold tabular-nums font-mono">${totalPLeave.toFixed(1)}</span>`, align: 'center' },
                    { html: `<span class="text-amber-800 font-bold tabular-nums font-mono">${totalHoliday.toFixed(1)}</span>`, align: 'center' },
                    { html: `<span class="text-rose-700 font-bold tabular-nums font-mono">${totalUnpaid.toFixed(1)}</span>`, align: 'center' },
                    { html: `<span class="text-indigo-900 font-black tabular-nums font-mono">${totalPaidDays.toFixed(1)}</span>`, align: 'center' },
                    { html: `<span class="text-slate-800 font-bold tabular-nums font-mono">${totalOT}h</span>`, align: 'center' },
                    { text: '', align: 'center' }
                ]
            });
        }
    } catch (err) {
        console.error('Lỗi tải dữ liệu chấm công:', err);
        showToast('error', err.message || 'Không thể tải bảng chấm công', 'Lỗi');
    }
}

function recalcAttendanceRow(id) {
    const workedEl = document.getElementById(`att-worked-${id}`);
    const pleaveEl = document.getElementById(`att-pleave-${id}`);
    const holidayEl = document.getElementById(`att-holiday-${id}`);
    const totalEl = document.getElementById(`att-total-${id}`);

    const w = parseFloat(workedEl ? workedEl.value : 0) || 0;
    const p = parseFloat(pleaveEl ? pleaveEl.value : 0) || 0;
    const h = parseFloat(holidayEl ? holidayEl.value : 0) || 0;
    const total = w + p + h;

    if (totalEl) {
        totalEl.innerText = total.toFixed(1).replace('.0', '');
    }
}

async function saveAttendanceRow(id, empId) {
    const workedEl = document.getElementById(`att-worked-${id}`);
    const pleaveEl = document.getElementById(`att-pleave-${id}`);
    const holidayEl = document.getElementById(`att-holiday-${id}`);
    const unpaidEl = document.getElementById(`att-unpaid-${id}`);
    const otEl = document.getElementById(`att-ot-${id}`);

    const payload = {
        worked_days: parseFloat(workedEl ? workedEl.value : 0) || 0,
        paid_leave_days: parseFloat(pleaveEl ? pleaveEl.value : 0) || 0,
        holiday_days: parseFloat(holidayEl ? holidayEl.value : 0) || 0,
        unpaid_leave_days: parseFloat(unpaidEl ? unpaidEl.value : 0) || 0,
        overtime_hours: parseFloat(otEl ? otEl.value : 0) || 0
    };

    try {
        const res = await fetchWithAuth(`/api/personnel/monthly-attendance/${id}/`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Lỗi lưu dòng chấm công');
        showToast('success', data.message || 'Đã lưu công nhân viên thành công!', 'Thành Công');
        if (data.data && data.data.total_paid_days !== undefined) {
            const totalEl = document.getElementById(`att-total-${id}`);
            if (totalEl) totalEl.innerText = data.data.total_paid_days;
        }
    } catch (err) {
        showToast('error', err.message || 'Không thể lưu ngày công', 'Lỗi');
    }
}

async function saveAllAttendanceRows() {
    if (!rawAttendanceList || rawAttendanceList.length === 0) {
        showToast('warning', 'Không có dữ liệu chấm công để lưu.', 'Chú ý');
        return;
    }

    let successCount = 0;
    for (const row of rawAttendanceList) {
        const workedEl = document.getElementById(`att-worked-${row.id}`);
        const pleaveEl = document.getElementById(`att-pleave-${row.id}`);
        const holidayEl = document.getElementById(`att-holiday-${row.id}`);
        const unpaidEl = document.getElementById(`att-unpaid-${row.id}`);
        const otEl = document.getElementById(`att-ot-${row.id}`);

        if (workedEl && pleaveEl && holidayEl && unpaidEl && otEl) {
            const payload = {
                worked_days: parseFloat(workedEl.value) || 0,
                paid_leave_days: parseFloat(pleaveEl.value) || 0,
                holiday_days: parseFloat(holidayEl.value) || 0,
                unpaid_leave_days: parseFloat(unpaidEl.value) || 0,
                overtime_hours: parseFloat(otEl.value) || 0
            };
            try {
                const res = await fetchWithAuth(`/api/personnel/monthly-attendance/${row.id}/`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.ok) successCount++;
            } catch (e) {
                console.error('Lỗi lưu dòng', row.id, e);
            }
        }
    }

    showToast('success', `Đã lưu cập nhật cho ${successCount}/${rawAttendanceList.length} nhân sự.`, 'Thành Công');
    await loadAttendanceData();
}

async function autoGenerateMonthlyAttendance() {
    const select = document.getElementById('attendance-period-select');
    const periodId = select ? select.value : null;
    if (!periodId) {
        showToast('warning', 'Vui lòng chọn kỳ lương cần tạo bảng chấm công.', 'Chú ý');
        return;
    }

    try {
        const res = await fetchWithAuth('/api/personnel/monthly-attendance/auto-generate/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ period_id: periodId })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Lỗi khởi tạo công tự động');
        showToast('success', data.message || 'Đã khởi tạo công tự động cho nhân sự!', 'Thành Công');
        await loadAttendanceData();
    } catch (err) {
        showToast('error', err.message || 'Không thể khởi tạo công tự động', 'Lỗi');
    }
}

// --- SUB-PANEL 4: TÍNH LƯƠNG & HYBRID PAYROLL ENGINE ---
async function loadPayrollPeriodsData() {
    try {
        const res = await fetchWithAuth('/api/personnel/periods/');
        if (!res.ok) throw new Error('Lỗi tải danh mục kỳ lương');
        rawPayrollPeriodsList = await res.json();

        const select = document.getElementById('payroll-period-select');
        if (select) {
            if (rawPayrollPeriodsList.length === 0) {
                select.innerHTML = '<option value="">Chưa có kỳ lương nào - Nhấn "Tạo Kỳ Lương Mới"</option>';
            } else {
                select.innerHTML = rawPayrollPeriodsList.map(p => 
                    `<option value="${p.id}">[${p.period_code}] ${escapeHtml(p.name)} (${p.status_label || p.status})</option>`
                ).join('');
                // Mặc định chọn kỳ đầu tiên
                onPayrollPeriodChange();
            }
        }
    } catch (err) {
        console.error('Lỗi tải danh sách kỳ lương:', err);
    }
}

async function onPayrollPeriodChange() {
    const select = document.getElementById('payroll-period-select');
    if (!select || !select.value) return;
    const periodId = select.value;
    await loadPayrollPeriodDetail(periodId);
}

async function loadPayrollPeriodDetail(periodId) {
    try {
        const res = await fetchWithAuth(`/api/personnel/periods/${periodId}/`);
        if (!res.ok) throw new Error('Lỗi tải chi tiết bảng lương kỳ');
        const data = await res.json();
        currentPayrollPeriodDetail = data.period || {};
        currentPayrollSlipsList = data.slips || [];

        // 1. Cập nhật Badge Trạng Thái
        const statusBadge = document.getElementById('period-status-badge');
        const pStatus = currentPayrollPeriodDetail.status || 'DRAFT';
        if (statusBadge) {
            statusBadge.innerText = currentPayrollPeriodDetail.status_label || pStatus;
            if (pStatus === 'PAID') {
                statusBadge.className = 'px-3 py-1 rounded-full text-xs font-bold border border-emerald-300 bg-emerald-100 text-emerald-800';
            } else if (pStatus === 'LOCKED') {
                statusBadge.className = 'px-3 py-1 rounded-full text-xs font-bold border border-amber-300 bg-amber-100 text-amber-800';
            } else if (pStatus === 'REVIEWED') {
                statusBadge.className = 'px-3 py-1 rounded-full text-xs font-bold border border-blue-300 bg-blue-100 text-blue-800';
            } else {
                statusBadge.className = 'px-3 py-1 rounded-full text-xs font-bold border border-slate-200 bg-slate-100 text-slate-700';
            }
        }

        // Cập nhật khoảng ngày
        const dateDisp = document.getElementById('period-date-range-display');
        if (dateDisp) {
            dateDisp.innerText = `(${currentPayrollPeriodDetail.from_date} ➔ ${currentPayrollPeriodDetail.to_date} | Công chuẩn: ${currentPayrollPeriodDetail.standard_days} ngày)`;
        }

        // 2. Cập nhật các nút thao tác theo vòng đời
        const calcBtn = document.getElementById('btn-calculate-payroll');
        const lockBtn = document.getElementById('btn-lock-payroll');
        const payBtn = document.getElementById('btn-pay-payroll');

        if (calcBtn) calcBtn.classList.toggle('hidden', pStatus === 'LOCKED' || pStatus === 'PAID');
        if (lockBtn) lockBtn.classList.toggle('hidden', pStatus !== 'REVIEWED' && pStatus !== 'DRAFT');
        if (payBtn) payBtn.classList.toggle('hidden', pStatus !== 'LOCKED');

        // 3. Cập nhật Summary Bar
        const el = id => document.getElementById(id);
        if (el('sum-total-employees')) el('sum-total-employees').innerText = `${currentPayrollPeriodDetail.total_employees || currentPayrollSlipsList.length} NV`;
        if (el('sum-total-gross')) el('sum-total-gross').innerText = `${new Intl.NumberFormat('vi-VN').format(currentPayrollPeriodDetail.total_gross || 0)} đ`;
        if (el('sum-total-ins-emp')) el('sum-total-ins-emp').innerText = `${new Intl.NumberFormat('vi-VN').format(currentPayrollPeriodDetail.total_insurance_employee || 0)} đ`;
        if (el('sum-total-pit')) el('sum-total-pit').innerText = `${new Intl.NumberFormat('vi-VN').format(currentPayrollPeriodDetail.total_pit || 0)} đ`;
        if (el('sum-total-advance')) el('sum-total-advance').innerText = `${new Intl.NumberFormat('vi-VN').format(currentPayrollPeriodDetail.total_advances_deducted || 0)} đ`;
        if (el('sum-total-net')) el('sum-total-net').innerText = `${new Intl.NumberFormat('vi-VN').format(currentPayrollPeriodDetail.total_net || 0)} đ`;

        renderPayrollSlipsTable(currentPayrollSlipsList);
    } catch (err) {
        console.error('Lỗi chi tiết kỳ lương:', err);
    }
}

function renderPayrollSlipsTable(slips) {
    const tbody = document.getElementById('payroll-slips-tbody');
    if (!tbody) return;

    if (!slips || slips.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="19" class="p-8 text-center text-slate-400 font-medium">
                    <i class="ph ph-receipt text-3xl mb-2 text-slate-300 block"></i>
                    Chưa có bảng lương chi tiết. Hãy nhấn "⚡ Tính Lương Tự Động" để tính toán.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = slips.map((s, index) => {
        const otherAllowance = (Number(s.phone_allowance) || 0) + (Number(s.lunch_allowance) || 0) + (Number(s.other_allowance) || 0) + (Number(s.kpi_bonus) || 0);
        const dropoffDetention = (Number(s.dropoff_allowance) || 0) + (Number(s.detention_allowance) || 0);

        return `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-200">
                <td class="py-2 px-3 text-center font-mono font-bold text-slate-500 border-r border-slate-200 select-none">${index + 1}</td>
                <td class="py-2 px-3 font-mono font-bold text-teal-900 border-r border-slate-200">${escapeHtml(s.employee_code)}</td>
                <td class="py-2 px-3 font-bold text-slate-900 border-r border-slate-200">
                    <div>${escapeHtml(s.employee_name)}</div>
                    ${s.employee_nickname ? `<div class="text-[11px] text-slate-400 font-normal">(${escapeHtml(s.employee_nickname)})</div>` : ''}
                </td>
                <td class="py-2 px-3 text-slate-700 border-r border-slate-200">${escapeHtml(s.role_label || s.role)}</td>
                <td class="py-2 px-3 text-center font-mono font-bold border-r border-slate-200 text-teal-800">${s.actual_working_days}</td>
                <td class="py-2 px-3 text-right font-mono border-r border-slate-200">${new Intl.NumberFormat('vi-VN').format(s.base_salary || 0)}</td>
                <td class="py-2 px-3 text-right font-mono font-bold text-teal-900 border-r border-slate-200 bg-teal-50/30">${new Intl.NumberFormat('vi-VN').format(s.time_salary || 0)}</td>
                <td class="py-2 px-3 text-center font-bold text-indigo-900 border-r border-slate-200">${s.trip_count || 0}</td>
                <td class="py-2 px-3 text-right font-mono font-bold text-indigo-700 border-r border-slate-200">${new Intl.NumberFormat('vi-VN').format(s.trip_allowance || 0)}</td>
                <td class="py-2 px-3 text-right font-mono border-r border-slate-200">${new Intl.NumberFormat('vi-VN').format(dropoffDetention)}</td>
                <td class="py-2 px-3 text-right font-mono text-indigo-700 border-r border-slate-200 font-semibold">${new Intl.NumberFormat('vi-VN').format(s.fuel_bonus || 0)}</td>
                <td class="py-2 px-3 text-right font-mono border-r border-slate-200">${new Intl.NumberFormat('vi-VN').format(otherAllowance)}</td>
                <td class="py-2 px-3 text-right font-mono font-bold text-slate-900 border-r border-slate-200 bg-slate-50">${new Intl.NumberFormat('vi-VN').format(s.gross_income || 0)}</td>
                <td class="py-2 px-3 text-right font-mono text-indigo-700 border-r border-slate-200">${new Intl.NumberFormat('vi-VN').format(s.total_insurance_employee || 0)}</td>
                <td class="py-2 px-3 text-right font-mono text-rose-700 border-r border-slate-200">${new Intl.NumberFormat('vi-VN').format(s.pit_amount || 0)}</td>
                <td class="py-2 px-3 text-right font-mono text-amber-700 border-r border-slate-200">${new Intl.NumberFormat('vi-VN').format(s.advance_deductions || 0)}</td>
                <td class="py-2 px-3 text-right font-mono font-black text-emerald-800 border-r border-slate-200 bg-emerald-50/50">${new Intl.NumberFormat('vi-VN').format(s.net_salary || 0)} đ</td>
                <td class="py-2 px-3 text-center border-r border-slate-200 font-semibold">
                    ${s.is_paid ? '<span class="text-emerald-700 font-bold">Đã chi</span>' : '<span class="text-amber-600 font-bold">Chờ chi</span>'}
                </td>
                <td class="py-2 px-3 text-center whitespace-nowrap">
                    <div class="inline-flex items-center gap-1.5 justify-center">
                        <!-- 1. Xem Chi Tiết & Điều Chỉnh Phiếu Lương (Toàn màn hình) -->
                        <button type="button" onclick="openPayrollSlipDetailPage(${s.id})" 
                            class="px-2.5 py-1 bg-transparent hover:bg-teal-600 text-teal-700 hover:text-white border border-teal-600 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                            title="Xem chi tiết các cấu phần lương & Điều chỉnh">
                            <i class="ph-bold ph-eye"></i>
                            <span>Xem</span>
                        </button>
                        <!-- 2. In phiếu lương chi tiết khổ A4 -->
                        <button type="button" onclick="openPrintPayslipModal(${s.id})" 
                            class="px-2.5 py-1 bg-transparent hover:bg-slate-700 text-slate-700 hover:text-white border border-slate-600 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                            title="Xem và in phiếu lương chi tiết khổ A4">
                            <i class="ph-bold ph-printer"></i>
                            <span>In</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    if (window.BimTableFooter && Array.isArray(slips)) {
        const totalDays = slips.reduce((sum, s) => sum + (Number(s.actual_working_days) || 0), 0);
        const totalBase = slips.reduce((sum, s) => sum + (Number(s.base_salary) || 0), 0);
        const totalTimeSal = slips.reduce((sum, s) => sum + (Number(s.time_salary) || 0), 0);
        const totalTrips = slips.reduce((sum, s) => sum + (Number(s.trip_count) || 0), 0);
        const totalTripAllow = slips.reduce((sum, s) => sum + (Number(s.trip_allowance) || 0), 0);
        const totalDropDet = slips.reduce((sum, s) => sum + ((Number(s.dropoff_allowance) || 0) + (Number(s.detention_allowance) || 0)), 0);
        const totalFuel = slips.reduce((sum, s) => sum + (Number(s.fuel_bonus) || 0), 0);
        const totalOther = slips.reduce((sum, s) => sum + ((Number(s.phone_allowance) || 0) + (Number(s.lunch_allowance) || 0) + (Number(s.other_allowance) || 0) + (Number(s.kpi_bonus) || 0)), 0);
        const totGross = slips.reduce((sum, s) => sum + (Number(s.gross_income) || 0), 0);
        const totIns = slips.reduce((sum, s) => sum + (Number(s.total_insurance_employee) || 0), 0);
        const totPit = slips.reduce((sum, s) => sum + (Number(s.pit_amount) || 0), 0);
        const totAdv = slips.reduce((sum, s) => sum + (Number(s.advance_deductions) || 0), 0);
        const totNet = slips.reduce((sum, s) => sum + (Number(s.net_salary) || 0), 0);
        window.BimTableFooter.render('payroll-slips-table', {
            cells: [
                { text: 'TỔNG', align: 'center', class: 'font-black text-slate-900 font-heading' },
                { html: `<span class="text-teal-800 font-extrabold">${slips.length}</span> phiếu lương`, colspan: 3, class: 'text-slate-700' },
                { html: `<span class="font-bold tabular-nums font-mono text-teal-800">${totalDays.toFixed(1)}</span>`, align: 'center' },
                { html: `<span class="font-mono text-slate-800 font-bold">${new Intl.NumberFormat('vi-VN').format(totalBase)}</span>`, align: 'right' },
                { html: `<span class="font-bold font-mono text-teal-900">${new Intl.NumberFormat('vi-VN').format(totalTimeSal)}</span>`, align: 'right' },
                { html: `<span class="font-bold text-indigo-900">${totalTrips}</span>`, align: 'center' },
                { html: `<span class="font-bold font-mono text-indigo-700">${new Intl.NumberFormat('vi-VN').format(totalTripAllow)}</span>`, align: 'right' },
                { html: `<span class="font-mono text-slate-800 font-bold">${new Intl.NumberFormat('vi-VN').format(totalDropDet)}</span>`, align: 'right' },
                { html: `<span class="font-mono text-indigo-700 font-bold">${new Intl.NumberFormat('vi-VN').format(totalFuel)}</span>`, align: 'right' },
                { html: `<span class="font-mono text-slate-800 font-bold">${new Intl.NumberFormat('vi-VN').format(totalOther)}</span>`, align: 'right' },
                { html: `<span class="font-bold font-mono text-slate-900">${new Intl.NumberFormat('vi-VN').format(totGross)} đ</span>`, align: 'right' },
                { html: `<span class="font-mono text-indigo-700 font-bold">${new Intl.NumberFormat('vi-VN').format(totIns)} đ</span>`, align: 'right' },
                { html: `<span class="font-mono text-rose-700 font-bold">${new Intl.NumberFormat('vi-VN').format(totPit)} đ</span>`, align: 'right' },
                { html: `<span class="font-mono text-amber-700 font-bold">${new Intl.NumberFormat('vi-VN').format(totAdv)} đ</span>`, align: 'right' },
                { html: `<span class="font-black font-mono text-emerald-800">${new Intl.NumberFormat('vi-VN').format(totNet)} đ</span>`, align: 'right' },
                { text: '', align: 'center' },
                { text: '', align: 'center' }
            ]
        });
    }
}

async function executePayrollCalculation() {
    const select = document.getElementById('payroll-period-select');
    if (!select || !select.value) {
        showToast('warning', 'Vui lòng chọn một kỳ lương cần tính toán.', 'Chú ý');
        return;
    }

    try {
        const periodId = select.value;
        const res = await fetchWithAuth(`/api/personnel/periods/${periodId}/calculate/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Lỗi tính toán lương');

        showToast('success', data.message || 'Đã tính toán thành công bảng lương kỳ!', 'Thành Công');
        await loadPayrollPeriodDetail(periodId);
    } catch (err) {
        console.error('Lỗi tính toán lương:', err);
        showToast('error', err.message || 'Không thể tính toán lương.', 'Lỗi');
    }
}

async function updatePayrollPeriodStatus(newStatus) {
    const select = document.getElementById('payroll-period-select');
    if (!select || !select.value) return;

    const periodId = select.value;
    let confirmMsg = `Bạn có chắc muốn chuyển kỳ lương sang trạng thái '${newStatus}'?`;
    if (newStatus === 'PAID') {
        confirmMsg = `XÁC NHẬN CHI TRẢ LƯƠNG:\n\nHệ thống sẽ tự động sinh PHIẾU CHI trên SỔ QUỸ (CashTransaction) tương ứng với tổng tiền thực lĩnh Net.\n\nBạn có chắc chắn muốn thực hiện?`;
    }

    const confirmed = await showConfirmModal({
        title: 'Cập Nhật Trạng Thái Kỳ Lương',
        message: confirmMsg,
        confirmText: 'Xác Nhận',
        cancelText: 'Huỷ',
        type: newStatus === 'PAID' ? 'danger' : 'warning',
        icon: 'ph-bold ph-check-circle text-2xl'
    });
    if (!confirmed) return;

    try {
        const res = await fetchWithAuth(`/api/personnel/periods/${periodId}/status/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Lỗi cập nhật trạng thái kỳ lương');

        showToast('success', data.message || 'Đã cập nhật trạng thái kỳ lương!', 'Thành Công');
        await loadPayrollPeriodsData();
        select.value = periodId;
        await loadPayrollPeriodDetail(periodId);
    } catch (err) {
        console.error('Lỗi cập nhật trạng thái:', err);
        showToast('error', err.message || 'Không thể cập nhật trạng thái.', 'Lỗi');
    }
}

async function exportBankBatchTransfer() {
    const select = document.getElementById('payroll-period-select');
    if (!select || !select.value) return;

    try {
        const periodId = select.value;
        const res = await fetchWithAuth(`/api/personnel/periods/${periodId}/bank-export/`);
        if (!res.ok) throw new Error('Lỗi xuất dữ liệu chuyển khoản');
        const data = await res.json();

        // Tạo nội dung CSV BOM UTF-8 để mở trực tiếp trong Excel
        let csv = '\uFEFF';
        csv += `BẢNG KÊ CHUYỂN KHOẢN LƯƠNG QUA NGÂN HÀNG - ${data.period_name || data.period_code}\n`;
        csv += `Tổng số cán bộ nhân viên: ${data.total_employees} | Tổng tiền chuyển: ${data.total_transfer_formatted}\n\n`;
        csv += 'STT,Mã Nhân Viên,Họ Và Tên,Chủ Tài Khoản,Số Tài Khoản,Ngân Hàng,Chi Nhánh,Số Tiền (VNĐ),Nội Dung Chuyển Khoản\n';

        (data.records || []).forEach(r => {
            csv += `"${r.stt}","${r.employee_code}","${r.employee_name}","${r.beneficiary_name}","${r.account_number}","${r.bank_name}","${r.bank_branch}","${r.amount}","${r.memo}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Bang_Ke_Chuyen_Khoan_Luong_${data.period_code}.csv`;
        link.click();

        showToast('success', 'Đã tải xuống file danh sách chuyển khoản ngân hàng.', 'Xuất File Thành Công');
    } catch (err) {
        console.error('Lỗi xuất file bank:', err);
        showToast('error', err.message || 'Không thể xuất file chuyển khoản.', 'Lỗi');
    }
}

async function openPrintPayslipModal(slipId) {
    try {
        const res = await fetchWithAuth(`/api/personnel/slips/${slipId}/print/`);
        if (!res.ok) throw new Error('Lỗi tải phiếu lương');
        const data = await res.json();
        
        const modal = document.getElementById('modal-print-payslip');
        const paper = document.getElementById('payslip-paper-content');
        if (!modal || !paper) return;

        const s = data.slip || {};
        const emp = data.employee || {};
        const sysCo = getSystemCompanyProfile();
        const co = {
            name: (data.company && data.company.name) || sysCo.company_name,
            address: (data.company && data.company.address) || sysCo.address,
            tax_id: (data.company && data.company.tax_id) || sysCo.tax_code,
            hotline: (data.company && data.company.hotline) || sysCo.phone
        };
        const period = data.period || {};

        paper.innerHTML = `
            <!-- Tiêu đề văn bản phẳng theo chuẩn chứng từ A4 -->
            <div class="border-b border-slate-300 pb-3">
                <div class="flex justify-between items-start">
                    <div>
                        <h2 class="text-sm font-black uppercase text-slate-900 tracking-tight">${co.name}</h2>
                        <p class="text-xs text-slate-500">${co.address}</p>
                        <p class="text-xs text-slate-500">MST: ${co.tax_id} | Hotline: ${co.hotline}</p>
                    </div>
                    <div class="text-right">
                        <div class="font-mono font-bold text-xs text-teal-800">${s.slip_code}</div>
                        <div class="text-xs text-slate-400">Ngày lập: ${new Date().toLocaleDateString('vi-VN')}</div>
                    </div>
                </div>
            </div>

            <div class="text-center py-2">
                <h1 class="text-base font-black uppercase text-slate-900 tracking-wide">PHIẾU LƯƠNG CHI TIẾT</h1>
                <p class="text-xs text-slate-600 font-semibold italic">${period.name} (Từ ${period.from_date} đến ${period.to_date})</p>
            </div>

            <!-- Khối thông tin nhân viên (Flat text layout) -->
            <div class="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs py-2 border-y border-slate-200">
                <div><strong>Họ và tên:</strong> ${emp.full_name} ${emp.nickname ? '(' + emp.nickname + ')' : ''}</div>
                <div><strong>Mã nhân viên:</strong> <span class="font-mono font-bold">${emp.code}</span></div>
                <div><strong>Phòng ban:</strong> ${emp.department}</div>
                <div><strong>Chức vụ:</strong> ${emp.role}</div>
                <div><strong>Số CCCD:</strong> ${emp.national_id || '—'}</div>
                <div><strong>Số TK ngân hàng:</strong> <span class="font-mono">${emp.bank_account || '—'}</span> (${emp.bank_name || '—'})</div>
                <div><strong>Mã số thuế:</strong> ${emp.tax_id || '—'}</div>
                <div><strong>Số sổ BHXH:</strong> ${emp.insurance_number || '—'}</div>
            </div>

            <!-- Bảng chi tiết thu nhập & khấu trừ dạng tài liệu phẳng -->
            <table class="w-full text-xs border-collapse border border-slate-300 my-2">
                <thead>
                    <tr class="bg-slate-100 font-bold border-b border-slate-300">
                        <th class="p-2 border-r border-slate-300 text-left">MỤC THU NHẬP (A)</th>
                        <th class="p-2 border-r border-slate-300 text-right w-36">SỐ TIỀN (VNĐ)</th>
                        <th class="p-2 border-r border-slate-300 text-left">MỤC KHẤU TRỪ & TRÍCH NỘP (B)</th>
                        <th class="p-2 text-right w-36">SỐ TIỀN (VNĐ)</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 font-mono">
                    <tr>
                        <td class="p-2 border-r border-slate-300">1. Lương thời gian (${s.actual_working_days}/${period.standard_days} ngày)</td>
                        <td class="p-2 border-r border-slate-300 text-right">${new Intl.NumberFormat('vi-VN').format(s.time_salary || 0)}</td>
                        <td class="p-2 border-r border-slate-300">1. BHXH NLĐ (8.0%)</td>
                        <td class="p-2 text-right">${new Intl.NumberFormat('vi-VN').format(s.bhxh_employee || 0)}</td>
                    </tr>
                    <tr>
                        <td class="p-2 border-r border-slate-300">2. Lương chuyến xe (${s.trip_count || 0} chuyến chính)</td>
                        <td class="p-2 border-r border-slate-300 text-right">${new Intl.NumberFormat('vi-VN').format(s.trip_allowance || 0)}</td>
                        <td class="p-2 border-r border-slate-300">2. BHYT NLĐ (1.5%)</td>
                        <td class="p-2 text-right">${new Intl.NumberFormat('vi-VN').format(s.bhyt_employee || 0)}</td>
                    </tr>
                    <tr>
                        <td class="p-2 border-r border-slate-300">3. Lương cắt kéo / hạ cont (${s.dropoff_trip_count || 0} lượt)</td>
                        <td class="p-2 border-r border-slate-300 text-right">${new Intl.NumberFormat('vi-VN').format(s.dropoff_allowance || 0)}</td>
                        <td class="p-2 border-r border-slate-300">3. BHTN NLĐ (1.0%)</td>
                        <td class="p-2 text-right">${new Intl.NumberFormat('vi-VN').format(s.bhtn_employee || 0)}</td>
                    </tr>
                    <tr>
                        <td class="p-2 border-r border-slate-300">4. Phụ cấp neo xe / qua đêm</td>
                        <td class="p-2 border-r border-slate-300 text-right">${new Intl.NumberFormat('vi-VN').format(s.detention_allowance || 0)}</td>
                        <td class="p-2 border-r border-slate-300">4. Thuế Thu Nhập Cá Nhân (TNCN)</td>
                        <td class="p-2 text-right text-rose-700">${new Intl.NumberFormat('vi-VN').format(s.pit_amount || 0)}</td>
                    </tr>
                    <tr>
                        <td class="p-2 border-r border-slate-300">5. Thưởng nhiên liệu & KPI</td>
                        <td class="p-2 border-r border-slate-300 text-right">${new Intl.NumberFormat('vi-VN').format((Number(s.fuel_bonus) || 0) + (Number(s.kpi_bonus) || 0))}</td>
                        <td class="p-2 border-r border-slate-300">5. Khấu trừ hoàn ứng chuyến xe</td>
                        <td class="p-2 text-right text-amber-700">${new Intl.NumberFormat('vi-VN').format(s.advance_deductions || 0)}</td>
                    </tr>
                    <tr>
                        <td class="p-2 border-r border-slate-300">6. Phụ cấp khác (Điện thoại, ăn trưa)</td>
                        <td class="p-2 border-r border-slate-300 text-right">${new Intl.NumberFormat('vi-VN').format((Number(s.phone_allowance) || 0) + (Number(s.lunch_allowance) || 0) + (Number(s.other_allowance) || 0))}</td>
                        <td class="p-2 border-r border-slate-300">6. Khấu trừ khác</td>
                        <td class="p-2 text-right">${new Intl.NumberFormat('vi-VN').format(s.other_deductions || 0)}</td>
                    </tr>
                    <tr class="bg-slate-50 font-bold">
                        <td class="p-2 border-r border-slate-300">TỔNG THU NHẬP (GROSS)</td>
                        <td class="p-2 border-r border-slate-300 text-right">${new Intl.NumberFormat('vi-VN').format(s.gross_income || 0)}</td>
                        <td class="p-2 border-r border-slate-300">TỔNG KHẤU TRỪ</td>
                        <td class="p-2 text-right">${new Intl.NumberFormat('vi-VN').format((Number(s.total_insurance_employee) || 0) + (Number(s.pit_amount) || 0) + (Number(s.advance_deductions) || 0) + (Number(s.other_deductions) || 0))}</td>
                    </tr>
                </tbody>
            </table>

            <!-- Dòng Thực Lĩnh Net -->
            <div class="p-3 bg-emerald-50 border border-emerald-300 rounded-lg flex justify-between items-center text-xs">
                <div>
                    <span class="font-bold text-slate-800 uppercase">SỐ TIỀN THỰC LĨNH (NET TAKE-HOME):</span>
                    <span class="block text-[11px] text-slate-500 font-sans italic">Hình thức: ${s.payment_method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản ngân hàng'}</span>
                </div>
                <div class="text-base font-black text-emerald-800 font-mono">
                    ${new Intl.NumberFormat('vi-VN').format(s.net_salary || 0)} VNĐ
                </div>
            </div>

            <!-- Chữ ký 4 bên theo chuẩn chứng từ văn bản phẳng -->
            <div class="grid grid-cols-4 gap-4 text-center text-xs pt-8 pb-4">
                <div>
                    <p class="font-bold uppercase text-slate-800">Người Lập Biểu</p>
                    <p class="text-[11px] text-slate-400 italic">(Ký, họ tên)</p>
                </div>
                <div>
                    <p class="font-bold uppercase text-slate-800">Kế Toán Trưởng</p>
                    <p class="text-[11px] text-slate-400 italic">(Ký, họ tên)</p>
                </div>
                <div>
                    <p class="font-bold uppercase text-slate-800">Giám Đốc</p>
                    <p class="text-[11px] text-slate-400 italic">(Ký, đóng dấu)</p>
                </div>
                <div>
                    <p class="font-bold uppercase text-slate-800">Người Lao Động</p>
                    <p class="text-[11px] text-slate-400 italic">(Ký, xác nhận)</p>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    } catch (err) {
        console.error('Lỗi in phiếu lương:', err);
        showToast('error', err.message || 'Không thể xem phiếu lương.', 'Lỗi');
    }
}

function closePrintPayslipModal() {
    const modal = document.getElementById('modal-print-payslip');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

// Modal tạo kỳ lương
function openCreatePeriodModal() {
    const modal = document.getElementById('modal-create-period');
    if (!modal) return;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();

    document.getElementById('new-period-code').value = `${y}-${m}`;
    document.getElementById('new-period-name').value = `Bảng lương Tháng ${m}/${y}`;
    document.getElementById('new-period-from').value = `${y}-${m}-01`;
    document.getElementById('new-period-to').value = `${y}-${m}-${lastDay}`;
    document.getElementById('new-period-std-days').value = '26.0';

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeCreatePeriodModal() {
    const modal = document.getElementById('modal-create-period');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

async function submitCreatePeriod(event) {
    event.preventDefault();
    const payload = {
        period_code: document.getElementById('new-period-code').value.trim(),
        name: document.getElementById('new-period-name').value.trim(),
        from_date: normalizeDateToISO(document.getElementById('new-period-from').value),
        to_date: normalizeDateToISO(document.getElementById('new-period-to').value),
        standard_days: parseFloat(document.getElementById('new-period-std-days').value || 26.0)
    };

    try {
        const res = await fetchWithAuth('/api/personnel/periods/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Lỗi khởi tạo kỳ lương');

        showToast('success', data.message || 'Đã khởi tạo kỳ lương mới thành công!', 'Thành Công');
        closeCreatePeriodModal();
        await loadPayrollPeriodsData();
    } catch (err) {
        console.error('Lỗi tạo kỳ lương:', err);
        showToast('error', err.message || 'Không thể tạo kỳ lương.', 'Lỗi');
    }
}

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


// --- SUB-PANEL 4: CHÍNH SÁCH LƯƠNG, BẢO HIỂM, BIỂU THUẾ & PHỤ CẤP ---
async function loadPayrollPoliciesData() {
    try {
        const [policyRes, rateRes, taxRes, paramsRes, allowRes] = await Promise.all([
            fetchWithAuth('/api/personnel/policy-config/'),
            fetchWithAuth('/api/personnel/deduction-rates/'),
            fetchWithAuth('/api/personnel/tax-brackets/'),
            fetchWithAuth('/api/personnel/payroll-parameters/'),
            fetchWithAuth('/api/personnel/allowance-groups/')
        ]);

        const el = id => document.getElementById(id);
        const fmtNum = n => new Intl.NumberFormat('vi-VN').format(n || 0);

        // 1. Tham số giảm trừ gia cảnh
        if (policyRes.ok) {
            const p = await policyRes.json();
            if (el('cfg-personal-relief')) el('cfg-personal-relief').value = fmtNum(p.personal_relief || 15500000);
            if (el('cfg-dependent-relief')) el('cfg-dependent-relief').value = fmtNum(p.dependent_relief || 6200000);
            if (el('cfg-standard-days')) el('cfg-standard-days').value = p.standard_working_days || 26.0;
            if (el('cfg-max-insurance')) el('cfg-max-insurance').value = fmtNum(p.max_insurance_salary || 50800000);
            if (el('cfg-legal-basis-label') && p.legal_basis) {
                el('cfg-legal-basis-label').innerText = `Căn cứ: ${p.legal_basis}`;
            }
        }

        // 2. Tỷ lệ trích đóng bảo hiểm & công đoàn
        if (rateRes.ok) {
            const r = await rateRes.json();
            const empBhxh = Number(r.bhxh_employee_rate || 0.08) * 100;
            const empBhyt = Number(r.bhyt_employee_rate || 0.015) * 100;
            const empBhtn = Number(r.bhtn_employee_rate || 0.01) * 100;
            const empUnion = Number(r.union_employee_rate || 0.01) * 100;
            const empTotal = empBhxh + empBhyt + empBhtn + empUnion;

            if (el('rate-emp-bhxh')) el('rate-emp-bhxh').value = empBhxh.toFixed(1);
            if (el('rate-emp-bhyt')) el('rate-emp-bhyt').value = empBhyt.toFixed(1);
            if (el('rate-emp-bhtn')) el('rate-emp-bhtn').value = empBhtn.toFixed(1);
            if (el('rate-emp-union')) el('rate-emp-union').value = empUnion.toFixed(1);
            if (el('emp-total-rate-badge')) el('emp-total-rate-badge').innerText = `Tổng: ${empTotal.toFixed(1)}%`;

            const emprBhxh = Number(r.bhxh_employer_rate || 0.175) * 100;
            const emprBhyt = Number(r.bhyt_employer_rate || 0.03) * 100;
            const emprBhtn = Number(r.bhtn_employer_rate || 0.01) * 100;
            const emprUnion = Number(r.union_employer_rate || 0.02) * 100;
            const emprTotal = emprBhxh + emprBhyt + emprBhtn + emprUnion;

            if (el('rate-empr-bhxh')) el('rate-empr-bhxh').value = emprBhxh.toFixed(1);
            if (el('rate-empr-bhyt')) el('rate-empr-bhyt').value = emprBhyt.toFixed(1);
            if (el('rate-empr-bhtn')) el('rate-empr-bhtn').value = emprBhtn.toFixed(1);
            if (el('rate-empr-union')) el('rate-empr-union').value = emprUnion.toFixed(1);
            if (el('empr-total-rate-badge')) el('empr-total-rate-badge').innerText = `Tổng: ${emprTotal.toFixed(1)}%`;
        }

        // 3. Biểu thuế thu nhập cá nhân lũy tiến 5 bậc mới
        if (taxRes.ok) {
            const brackets = await taxRes.json();
            const tbody = el('tax-brackets-tbody');
            if (tbody && Array.isArray(brackets)) {
                if (brackets.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="7" class="py-4 text-center text-slate-400">Chưa có biểu thuế trong hệ thống.</td></tr>`;
                } else {
                    tbody.innerHTML = brackets.map(b => {
                        let rangeText = '';
                        const min = Number(b.min_income || 0);
                        const max = b.max_income !== null && b.max_income !== undefined ? Number(b.max_income) : null;
                        if (min === 0 && max !== null) {
                            rangeText = `Đến ${fmtNum(max)} đ`;
                        } else if (max !== null) {
                            rangeText = `Trên ${fmtNum(min)} đ đến ${fmtNum(max)} đ`;
                        } else {
                            rangeText = `Trên ${fmtNum(min)} đ`;
                        }

                        const ratePct = b.tax_rate >= 1 ? `${Number(b.tax_rate)}%` : `${(Number(b.tax_rate) * 100).toFixed(0)}%`;
                        const quickSub = Number(b.quick_subtraction || b.quick_deduction || 0);

                        return `
                            <tr class="hover:bg-slate-50/80 transition-colors">
                                <td class="py-2.5 px-3.5 text-center font-bold text-slate-800">${b.bracket_level || b.level || '-'}</td>
                                <td class="py-2.5 px-3.5 font-semibold text-slate-900">${rangeText}</td>
                                <td class="py-2.5 px-3.5 text-center font-black text-teal-700">${ratePct}</td>
                                <td class="py-2.5 px-3.5 font-mono text-slate-700">${escapeHtml(b.quick_formula || '-')}</td>
                                <td class="py-2.5 px-3.5 text-right font-mono font-bold text-slate-800">${fmtNum(quickSub)} đ</td>
                                <td class="py-2.5 px-3.5 text-slate-600">${escapeHtml(b.legal_basis || 'Luật 109/2025/QH15')}</td>
                                <td class="py-2.5 px-3.5 text-center">
                                    <span class="px-2 py-0.5 rounded text-[11px] font-bold ${b.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}">
                                        ${b.is_active ? 'Hiệu lực' : 'Tạm ngưng'}
                                    </span>
                                </td>
                            </tr>
                        `;
                    }).join('');
                }
            }
        }

        // 4. Bảng tham số chính sách Lương & Thuế (Payroll Parameters)
        if (paramsRes.ok) {
            const params = await paramsRes.json();
            const tbody = el('payroll-parameters-tbody');
            if (tbody && Array.isArray(params)) {
                if (el('payroll-params-badge')) el('payroll-params-badge').innerText = `${params.length} Tham Số`;
                if (params.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="8" class="py-4 text-center text-slate-400">Chưa có tham số nào được thiết lập.</td></tr>`;
                } else {
                    tbody.innerHTML = params.map((p, idx) => {
                        let valDisplay = p.value;
                        const numVal = Number(p.value);
                        if (!isNaN(numVal) && numVal >= 1000) {
                            valDisplay = fmtNum(numVal);
                        }
                        return `
                            <tr class="hover:bg-slate-50 transition-colors">
                                <td class="py-2 px-3 text-center text-slate-500 font-mono">${idx + 1}</td>
                                <td class="py-2 px-3 font-mono font-bold text-teal-800">${escapeHtml(p.code)}</td>
                                <td class="py-2 px-3 font-semibold text-slate-900">${escapeHtml(p.name)}</td>
                                <td class="py-2 px-3 text-right font-mono font-black text-slate-800">${valDisplay}</td>
                                <td class="py-2 px-3 text-center font-bold text-slate-600">${escapeHtml(p.unit || '')}</td>
                                <td class="py-2 px-3 text-slate-600">${escapeHtml(p.legal_basis || '-')}</td>
                                <td class="py-2 px-3 text-center font-mono text-slate-500">${p.effective_date || '-'}</td>
                                <td class="py-2 px-3 text-center">
                                    <span class="px-2 py-0.5 rounded text-[11px] font-bold ${p.is_active ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-slate-100 text-slate-400'}">
                                        ${p.is_active ? 'Áp dụng' : 'Khóa'}
                                    </span>
                                </td>
                            </tr>
                        `;
                    }).join('');
                }
            }
        }

        // 5. Danh mục Phụ cấp, Trợ cấp & Phúc lợi (Allowance Groups & Types)
        if (allowRes.ok) {
            const groups = await allowRes.json();
            const container = el('allowance-groups-container');
            if (container && Array.isArray(groups)) {
                let totalTypes = 0;
                groups.forEach(g => { if (g.items) totalTypes += g.items.length; });
                if (el('allowance-types-badge')) el('allowance-types-badge').innerText = `${groups.length} Nhóm / ${totalTypes} Loại`;

                if (groups.length === 0) {
                    container.innerHTML = `<div class="p-4 text-center text-slate-400">Chưa có danh mục phụ cấp nào.</div>`;
                } else {
                    container.innerHTML = groups.map(g => {
                        const items = g.items || [];
                        const rows = items.map((it, idx) => {
                            const defAmt = Number(it.default_amount || 0);
                            const amtText = defAmt > 0 ? `${fmtNum(defAmt)} đ/tháng` : (it.description || 'Theo thực tế');
                            return `
                                <tr class="hover:bg-slate-50 transition-colors">
                                    <td class="py-2 px-3 text-center text-slate-500 font-mono w-10">${idx + 1}</td>
                                    <td class="py-2 px-3 font-mono font-bold text-indigo-700">${escapeHtml(it.code)}</td>
                                    <td class="py-2 px-3 font-semibold text-slate-900">${escapeHtml(it.name)}</td>
                                    <td class="py-2 px-3 font-mono text-right font-bold text-slate-800">${amtText}</td>
                                    <td class="py-2 px-3 text-center">
                                        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${it.is_insurance_applicable ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-600'}">
                                            ${it.is_insurance_applicable ? 'Có đóng' : 'Không đóng'}
                                        </span>
                                    </td>
                                    <td class="py-2 px-3 text-center">
                                        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${it.is_taxable ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}">
                                            ${it.is_taxable ? 'Chịu thuế' : 'Miễn thuế'}
                                        </span>
                                    </td>
                                    <td class="py-2 px-3 text-slate-600">${escapeHtml(it.legal_basis || '-')}</td>
                                </tr>
                            `;
                        }).join('');

                        return `
                            <div class="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50">
                                <div class="p-2.5 px-3.5 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between">
                                    <span class="font-bold text-slate-800 text-xs">${escapeHtml(g.name)}</span>
                                    <span class="text-[11px] font-mono text-slate-500">${items.length} khoản phụ cấp</span>
                                </div>
                                <div class="overflow-x-auto bg-white">
                                    <table class="w-full text-left border-collapse erp-table text-xs whitespace-nowrap">
                                        <thead class="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-bold">
                                            <tr>
                                                <th class="py-2 px-3 text-center">STT</th>
                                                <th class="py-2 px-3">Mã Khoản</th>
                                                <th class="py-2 px-3">Tên Khoản Phụ Cấp / Trợ Cấp</th>
                                                <th class="py-2 px-3 text-right">Mức Định Mức / Trần</th>
                                                <th class="py-2 px-3 text-center">Đóng BHXH</th>
                                                <th class="py-2 px-3 text-center">Thuế TNCN</th>
                                                <th class="py-2 px-3">Căn Cứ Pháp Lý & Ghi Chú</th>
                                            </tr>
                                        </thead>
                                        <tbody class="divide-y divide-slate-100 font-medium">
                                            ${rows || '<tr><td colspan="7" class="py-2 text-center text-slate-400">Không có khoản nào.</td></tr>'}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        `;
                    }).join('');
                }
            }
        }
    } catch (err) {
        console.error('Lỗi tải chính sách lương:', err);
    }
}

async function savePayrollPolicyConfig() {
    const payload = {
        personal_relief: parseInt(String(document.getElementById('cfg-personal-relief').value).replace(/\D/g, ''), 10) || 15500000,
        dependent_relief: parseInt(String(document.getElementById('cfg-dependent-relief').value).replace(/\D/g, ''), 10) || 6200000,
        standard_working_days: parseFloat(document.getElementById('cfg-standard-days').value) || 26.0,
        max_insurance_salary: parseInt(String(document.getElementById('cfg-max-insurance').value).replace(/\D/g, ''), 10) || 50800000,
    };

    try {
        const res = await fetchWithAuth('/api/personnel/policy-config/', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Lỗi lưu cấu hình chính sách');
        showToast('success', 'Đã lưu cấu hình tham số lương & giảm trừ gia cảnh (NQ 110/2025/UBTVQH15).', 'Thành Công');
    } catch (err) {
        showToast('error', err.message || 'Không thể lưu cấu hình.', 'Lỗi');
    }
}

async function saveSalaryDeductionRate() {
    const payload = {
        bhxh_employee_rate: parseFloat(document.getElementById('rate-emp-bhxh').value) / 100,
        bhyt_employee_rate: parseFloat(document.getElementById('rate-emp-bhyt').value) / 100,
        bhtn_employee_rate: parseFloat(document.getElementById('rate-emp-bhtn').value) / 100,
        union_employee_rate: parseFloat(document.getElementById('rate-emp-union') ? document.getElementById('rate-emp-union').value : 1.0) / 100,
        bhxh_employer_rate: parseFloat(document.getElementById('rate-empr-bhxh').value) / 100,
        bhyt_employer_rate: parseFloat(document.getElementById('rate-empr-bhyt').value) / 100,
        bhtn_employer_rate: parseFloat(document.getElementById('rate-empr-bhtn').value) / 100,
        union_employer_rate: parseFloat(document.getElementById('rate-empr-union').value) / 100,
    };

    try {
        const res = await fetchWithAuth('/api/personnel/deduction-rates/', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Lỗi lưu tỷ lệ bảo hiểm');
        showToast('success', 'Đã lưu tỷ lệ trích nộp bảo hiểm xã hội & kinh phí công đoàn thành công.', 'Thành Công');
    } catch (err) {
        showToast('error', err.message || 'Không thể lưu tỷ lệ.', 'Lỗi');
    }
}

function filterAttendanceTable() {
    const q = (document.getElementById('attendance-search-input')?.value || '').toLowerCase().trim();
    const rows = document.querySelectorAll('#attendance-tbody tr');
    rows.forEach(r => {
        if (!q) { r.style.display = ''; return; }
        r.style.display = r.innerText.toLowerCase().includes(q) ? '' : 'none';
    });
}

function filterPayrollTable() {
    const q = (document.getElementById('payroll-search-input')?.value || '').toLowerCase().trim();
    const rows = document.querySelectorAll('#payroll-slips-tbody tr');
    rows.forEach(r => {
        if (!q) { r.style.display = ''; return; }
        r.style.display = r.innerText.toLowerCase().includes(q) ? '' : 'none';
    });
}
