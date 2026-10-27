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
