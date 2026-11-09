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
