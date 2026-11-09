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
