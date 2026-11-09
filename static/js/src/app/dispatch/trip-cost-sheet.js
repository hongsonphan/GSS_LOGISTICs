// Hàm render Bảng Kê Chi Phí 8 Mục chuẩn theo 5 ảnh thực tế của GSS
function renderCostSheetTable(trip) {
    const tbody = document.getElementById('cost-sheet-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const formatMoney = (n) => new Intl.NumberFormat('vi-VN').format(n) + ' đ';

    const costItems = [
        {
            stt: 1,
            title: 'HĐ điện tử',
            key: 'fee_einvoice',
            sub: 'Thông tin hóa đơn điện tử Cảng / Depot tra cứu',
            getVal: (t) => {
                const invExpenses = (t.expenses || []).filter(e => e.invoice_number);
                if (invExpenses.length === 0) return { text: 'Chưa có HĐĐT', hasInv: false };
                return {
                    text: invExpenses.map(e => `Số HĐ: ${e.invoice_number} (Mã: ${e.invoice_lookup_code || 'N/A'})`).join('; '),
                    hasInv: true,
                    lookup_url: invExpenses[0].invoice_lookup_url
                };
            }
        },
        { stt: 2, title: 'Nâng', code: 'LIFT_ON', key: 'fee_lift_on' },
        { stt: 3, title: 'Hạ', code: 'LIFT_OFF', key: 'fee_lift_off' },
        { stt: 4, title: 'Cược cont', code: 'CONTAINER_DEPOSIT', key: 'fee_deposit' },
        { stt: 5, title: 'Cân xe', code: 'WEIGHING', key: 'fee_weighing' },
        { stt: 6, title: 'Bốc xếp', code: 'LABOR_STEVEDORING', key: 'fee_labor' },
        { stt: 7, title: 'Vé cầu đường', code: 'TOLL_FEE', key: 'fee_toll' },
        { stt: 8, title: 'Chi phí khác', code: 'OTHER', key: 'fee_other' },
    ];

    let totalCalculated = 0;

    function renderExpenseDriverLegBadge(exp, t) {
        if (!exp) return '<span class="text-slate-300 text-xs">-</span>';
        const leg = exp.trip_leg || 'ENTIRE';
        if (leg === 'LEG_1') {
            const dName = exp.driver_name || t.driver || 'Tài xế 1';
            const vPlate = exp.vehicle_plate || t.vehicle || 'Xe 1';
            return `
                <div class="flex items-center space-x-1.5 flex-wrap">
                    <span class="inline-flex items-center text-[11px] font-bold text-teal-700 uppercase shrink-0">
                        <i class="ph-bold ph-arrow-circle-right mr-1"></i>Chặng 1
                    </span>
                    <span class="font-bold text-slate-800 text-[12px]">${dName}</span>
                    <span class="text-[11px] text-slate-500 font-mono">(${vPlate})</span>
                </div>
            `;
        } else if (leg === 'LEG_2') {
            const dName = exp.driver_name || t.dropoff_driver || 'Tài xế 2';
            const vPlate = exp.vehicle_plate || t.dropoff_vehicle || 'Xe 2';
            return `
                <div class="flex items-center space-x-1.5 flex-wrap">
                    <span class="inline-flex items-center text-[11px] font-bold text-indigo-700 uppercase shrink-0">
                        <i class="ph-bold ph-arrow-circle-down mr-1"></i>Chặng 2
                    </span>
                    <span class="font-bold text-slate-800 text-[12px]">${dName}</span>
                    <span class="text-[11px] text-slate-500 font-mono">(${vPlate})</span>
                </div>
            `;
        } else if (leg === 'COMPANY') {
            return `
                <span class="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                    <i class="ph ph-buildings mr-1 text-slate-500"></i>Công ty chi chung
                </span>
            `;
        } else {
            const dName = exp.driver_name || t.driver || 'Tài xế';
            const vPlate = exp.vehicle_plate || t.vehicle || 'Đầu kéo';
            return `
                <div class="flex items-center space-x-1.5 flex-wrap">
                    <span class="font-bold text-slate-800 text-[12px]">${dName}</span>
                    <span class="text-[11px] text-slate-500 font-mono">(${vPlate})</span>
                </div>
            `;
        }
    }

    costItems.forEach(item => {
        if (item.key === 'fee_einvoice') {
            const einvInfo = item.getVal(trip);
            tbody.innerHTML += `
                <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-200/70">
                    <td class="py-1.5 px-3 text-center text-slate-400 font-bold border-r border-slate-200/70">${item.stt}</td>
                    <td class="py-1.5 px-3 border-r border-slate-200/70">
                        <span class="font-bold text-slate-900 text-[13px]">${item.title}</span>
                        <p class="text-[11.5px] text-slate-400 mt-0.5">${item.sub}</p>
                    </td>
                    <td class="py-1.5 px-3 border-r border-slate-200/70 text-slate-400 text-xs italic">
                        Cảng / Depot
                    </td>
                    <td class="py-1.5 px-3 text-right text-slate-400 font-medium border-r border-slate-200/70">-</td>
                    <td class="py-1.5 px-3 border-r border-slate-200/70" colspan="2">
                        ${einvInfo.hasInv ? `
                            <div class="flex items-center space-x-2">
                                <span class="text-[11.5px] font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                    ${einvInfo.text}
                                </span>
                                ${einvInfo.lookup_url ? `
                                    <a href="${einvInfo.lookup_url}" target="_blank" class="text-[11.5px] font-bold text-blue-600 hover:text-blue-800 flex items-center bg-blue-50 px-2 py-0.5 rounded">
                                        <i class="ph ph-arrow-square-out mr-1"></i> Tra cứu online
                                    </a>
                                ` : ''}
                            </div>
                        ` : `
                            <span class="text-[11.5px] text-slate-400 italic">Chưa phát sinh hóa đơn</span>
                        `}
                    </td>
                    <td class="py-1.5 px-3 text-center border-r border-slate-200/70">
                        ${einvInfo.hasInv 
                            ? `<span class="px-2 py-0.2 rounded text-[10.5px] font-bold bg-emerald-100 text-emerald-800">Đã Liên Kết</span>`
                            : `<span class="px-2 py-0.2 rounded text-[10.5px] font-bold bg-slate-100 text-slate-500">Trống</span>`}
                    </td>
                    <td class="py-1.5 px-3 text-center text-slate-300">-</td>
                </tr>
            `;
        } else {
            // Lấy các bản ghi expense khớp với category này
            const matchedExps = (trip.expenses || []).filter(e => {
                if (item.code === 'LIFT_ON') return e.category_code === 'LIFT_ON' || e.category_code === 'LIFT_ON_OFF';
                if (item.code === 'LIFT_OFF') return e.category_code === 'LIFT_OFF';
                if (item.code === 'TOLL_FEE') return e.category_code === 'TOLL_FEE' || e.category_code === 'BOT_TOLL';
                if (item.code === 'CONTAINER_DEPOSIT') return e.category_code === 'CONTAINER_DEPOSIT';
                if (item.code === 'WEIGHING') return e.category_code === 'WEIGHING';
                if (item.code === 'LABOR_STEVEDORING') return e.category_code === 'LABOR_STEVEDORING' || e.category_code === 'STEVEDORING';
                if (item.code === 'OTHER') return e.category_code === 'OTHER' || e.category_code === 'PORT_STORAGE' || e.category_code === 'REPAIR_TIRE';
                return false;
            });

            const amountSum = matchedExps.reduce((acc, curr) => acc + Number(curr.amount), 0);
            totalCalculated += amountSum;

            if (matchedExps.length > 1) {
                // TRƯỜNG HỢP CÓ TỪ 2 KHOẢN CHI TRỞ LÊN: HỖ TRỢ BẤM VÀO ĐỂ XỔ XUỐNG XEM CHI TIẾT TỪNG DÒNG
                const summaryInvText = matchedExps.map(e => e.invoice_number ? e.invoice_number : '').filter(Boolean).join(', ');
                const hasLeg1 = matchedExps.some(e => e.trip_leg === 'LEG_1');
                const hasLeg2 = matchedExps.some(e => e.trip_leg === 'LEG_2');
                const legSummaryBadge = (hasLeg1 && hasLeg2)
                    ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-bold bg-amber-100 text-amber-900 border border-amber-300"><i class="ph-bold ph-arrows-split mr-1 text-amber-700"></i>Chặng 1 & 2</span>`
                    : (hasLeg1 ? `<span class="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">Chặng 1</span>` : (hasLeg2 ? `<span class="text-xs font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">Chặng 2</span>` : `<span class="text-xs font-bold text-slate-700">${trip.driver || '-'}</span>`));
                
                tbody.innerHTML += `
                    <!-- DÒNG TỔNG GỘP (Clickable Accordion) -->
                    <tr onclick="toggleExpenseDetail('${item.code}')" class="hover:bg-teal-50/50 cursor-pointer transition-colors bg-slate-50/40 border-b border-slate-200/80">
                        <td class="py-2 px-3 text-center text-teal-800 font-bold border-r border-slate-200/70">${item.stt}</td>
                        <td class="py-2 px-3 border-r border-slate-200/70">
                            <div class="flex items-center space-x-2">
                                <span class="font-bold text-slate-900 text-[13px]">${item.title}</span>
                                <span class="inline-flex items-center space-x-1 px-2 py-0.2 rounded-full bg-teal-100 text-teal-900 text-[10.5px] font-bold font-heading hover:bg-teal-200 transition-colors">
                                    <i class="ph-bold ph-list-numbers"></i>
                                    <span>${matchedExps.length} khoản chi</span>
                                    <i id="icon-toggle-${item.code}" class="ph ph-caret-down text-xs transition-transform duration-200"></i>
                                </span>
                            </div>
                            <p class="text-[11.5px] text-teal-700 font-semibold mt-0.5 flex items-center">
                                <i class="ph ph-hand-pointing mr-1"></i> Bấm để xem/ẩn chi tiết từng vé (${matchedExps.length} dòng con)
                            </p>
                        </td>
                        <td class="py-2 px-3 border-r border-slate-200/70">
                            ${legSummaryBadge}
                        </td>
                        <td class="py-2 px-3 text-right font-black text-[13px] tabular-nums text-rose-600 font-mono border-r border-slate-200/70">
                            <span class="border-b-2 border-dotted border-rose-400 pb-0.5" title="Tổng cộng ${matchedExps.length} khoản">
                                ${formatMoney(amountSum)}
                            </span>
                        </td>
                        <td class="py-2 px-3 border-r border-slate-200/70">
                            <span class="text-[11.5px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block">
                                ${summaryInvText ? `Gồm các HĐ: ${summaryInvText}` : `Tổng hợp ${matchedExps.length} chứng từ`}
                            </span>
                        </td>
                        <td class="py-2 px-3 text-slate-600 text-[11.5px] border-r border-slate-200/70">
                            <span class="text-teal-800 font-semibold">Xem chi tiết các khoản bên dưới</span>
                        </td>
                        <td class="py-2 px-3 text-center border-r border-slate-200/70">
                            <button type="button" class="px-2 py-0.5 rounded-md text-[11px] font-bold bg-teal-600 hover:bg-teal-700 text-white inline-flex items-center space-x-1 shadow-sm font-heading">
                                <span>Chi tiết</span>
                                <i class="ph ph-caret-down text-xs"></i>
                            </button>
                        </td>
                        <td class="py-2 px-3 text-center text-slate-400 text-[11px] font-semibold">
                            Tập hợp
                        </td>
                    </tr>

                    <!-- CÁC DÒNG CON CHI TIẾT (Sub-rows) -->
                    ${matchedExps.map((subExp, sIdx) => `
                        <tr class="sub-row-${item.code} hidden bg-teal-50/30 border-l-4 border-l-teal-600 border-b border-slate-100 transition-all text-xs">
                            <td class="py-1.5 px-2.5 text-center text-teal-800 font-mono font-bold text-[11.5px] border-r border-slate-200/70">${item.stt}.${sIdx + 1}</td>
                            <td class="py-1.5 px-2.5 pl-6 border-r border-slate-200/70">
                                <div class="flex items-center space-x-2">
                                    <i class="ph ph-arrow-elbow-down-right text-teal-700 font-black text-sm"></i>
                                    <span class="font-bold text-slate-900 text-[12.5px]">${subExp.notes || (item.title + ' #' + (sIdx + 1))}</span>
                                </div>
                                ${subExp.time ? `<p class="text-[11px] text-slate-400 pl-5 font-normal mt-0.5">${subExp.time}</p>` : ''}
                            </td>
                            <td class="py-1.5 px-2.5 border-r border-slate-200/70">
                                ${renderExpenseDriverLegBadge(subExp, trip)}
                            </td>
                            <td class="py-1.5 px-2.5 text-right font-black text-rose-600 tabular-nums font-mono text-[13px] border-r border-slate-200/70">
                                ${formatMoney(subExp.amount)}
                            </td>
                            <td class="py-1.5 px-2.5 border-r border-slate-200/70">
                                ${subExp.invoice_number ? `
                                    <div class="inline-flex items-center space-x-1 font-mono text-[11.5px] font-bold text-teal-900 bg-teal-100/70 px-2 py-0.5 rounded border border-teal-200">
                                        <span>HĐ: ${subExp.invoice_number}${subExp.invoice_lookup_code ? ' / ' + subExp.invoice_lookup_code : ''}</span>
                                        ${subExp.invoice_lookup_url ? `
                                            <a href="${subExp.invoice_lookup_url}" target="_blank" class="text-blue-600 hover:text-blue-800 ml-1 font-bold" title="Tra cứu online">
                                                <i class="ph ph-arrow-square-out text-xs"></i>
                                            </a>
                                        ` : ''}
                                    </div>
                                ` : '<span class="text-slate-400 text-[11.5px]">Vé trạm / Biên nhận</span>'}
                            </td>
                            <td class="py-1.5 px-2.5 text-slate-700 text-[11.5px] font-medium border-r border-slate-200/70">
                                <div class="flex items-center space-x-1.5 flex-wrap gap-y-1">
                                    <span>${subExp.invoice_issuer || subExp.notes || '<span class="text-slate-400">-</span>'}</span>
                                    ${(subExp.expense_payer_type === 'COMPANY_OBH' || (subExp.is_on_behalf_of_customer && !subExp.reimburse_to_subcontractor)) ? `
                                        <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-black bg-sky-100 text-sky-800 border border-sky-300 whitespace-nowrap">
                                            <i class="ph-bold ph-arrow-up-right mr-0.5 text-[10px]"></i>CÔNG TY CHI HỘ
                                        </span>
                                    ` : ((subExp.expense_payer_type === 'SUB_OBH' || subExp.reimburse_to_subcontractor) ? `
                                        <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 whitespace-nowrap">
                                            <i class="ph-bold ph-truck mr-0.5 text-[10px]"></i>3PL CHI HỘ
                                        </span>
                                    ` : `
                                        <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 whitespace-nowrap">
                                            🏢 Công ty
                                        </span>
                                    `)}
                                </div>
                            </td>
                            <td class="py-1.5 px-2.5 text-center border-r border-slate-200/70">
                                <span class="px-2 py-0.2 rounded text-[10.5px] font-bold ${
                                    subExp.status === 'SETTLED' ? 'bg-purple-100 text-purple-800' :
                                    subExp.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }">
                                    ${subExp.status_label || (subExp.status === 'SETTLED' ? 'Đã chốt sổ' : (subExp.status === 'APPROVED' ? 'Đã duyệt' : 'Chờ duyệt'))}
                                </span>
                            </td>
                            <td class="py-1.5 px-2.5 text-center">
                                ${trip.is_expenses_settled || !subExp.can_edit ? `
                                    <span class="inline-flex items-center text-purple-700 font-bold text-[10.5px] bg-purple-50 px-2 py-0.5 rounded border border-purple-200" title="Đã chốt sổ Kế toán, không thể chỉnh sửa">
                                        <i class="ph-bold ph-lock mr-1"></i> Khóa
                                    </span>
                                ` : `
                                    <div class="inline-flex items-center space-x-1">
                                        <button type="button" onclick="event.stopPropagation(); editExpensePrompt(${subExp.id})" class="p-1 rounded text-amber-700 hover:bg-amber-100 transition-colors font-bold" title="Chỉnh sửa chi phí">
                                            <i class="ph ph-pencil text-sm"></i>
                                        </button>
                                        <button type="button" onclick="event.stopPropagation(); deleteExpensePrompt(${subExp.id}, '${subExp.category_name}')" class="p-1 rounded text-rose-600 hover:bg-rose-100 transition-colors font-bold" title="Xóa khoản chi">
                                            <i class="ph ph-trash text-sm"></i>
                                        </button>
                                    </div>
                                `}
                            </td>
                        </tr>
                    `).join('')}
                `;
            } else {
                // TRƯỜNG HỢP CÓ 0 HOẶC 1 KHOẢN CHI: HIỂN THỊ DÒNG ĐƠN BÌNH THƯỜNG
                const singleExp = matchedExps[0] || null;
                const invNoText = singleExp && singleExp.invoice_number 
                    ? `HĐ: ${singleExp.invoice_number}${singleExp.invoice_lookup_code ? ' / ' + singleExp.invoice_lookup_code : ''}` 
                    : '';
                const issuerText = singleExp ? (singleExp.invoice_issuer || singleExp.notes) : '';

                tbody.innerHTML += `
                    <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-200/70 ${amountSum > 0 ? 'bg-amber-50/20' : ''}">
                        <td class="py-1.5 px-3 text-center text-slate-400 font-bold border-r border-slate-200/70">${item.stt}</td>
                        <td class="py-1.5 px-3 border-r border-slate-200/70">
                            <span class="font-bold text-slate-900 text-[13px]">${item.title}</span>
                        </td>
                        <td class="py-1.5 px-3 border-r border-slate-200/70">
                            ${singleExp ? renderExpenseDriverLegBadge(singleExp, trip) : '<span class="text-slate-300 text-xs">-</span>'}
                        </td>
                        <td class="py-1.5 px-3 text-right font-black text-[13px] tabular-nums font-mono border-r border-slate-200/70 ${amountSum > 0 ? 'text-rose-600' : 'text-slate-400'}">
                            ${amountSum > 0 ? formatMoney(amountSum) : '-'}
                        </td>
                        <td class="py-1.5 px-3 border-r border-slate-200/70">
                            ${invNoText ? `
                                <div class="inline-flex items-center space-x-1 font-mono text-[11.5px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                    <span>${invNoText}</span>
                                    ${singleExp.invoice_lookup_url ? `
                                        <a href="${singleExp.invoice_lookup_url}" target="_blank" class="text-blue-600 hover:text-blue-800 ml-1 font-bold" title="Tra cứu online">
                                            <i class="ph ph-arrow-square-out text-xs"></i>
                                        </a>
                                    ` : ''}
                                </div>
                            ` : '<span class="text-slate-400 text-[11.5px]">-</span>'}
                        </td>
                        <td class="py-1.5 px-3 text-slate-600 text-[11.5px] border-r border-slate-200/70">
                            <div class="flex items-center space-x-1.5 flex-wrap gap-y-1">
                                <span>${issuerText || '<span class="text-slate-400">-</span>'}</span>
                                ${singleExp ? (
                                    (singleExp.expense_payer_type === 'COMPANY_OBH' || (singleExp.is_on_behalf_of_customer && !singleExp.reimburse_to_subcontractor)) ? `
                                        <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-black bg-sky-100 text-sky-800 border border-sky-300 whitespace-nowrap">
                                            <i class="ph-bold ph-arrow-up-right mr-0.5 text-[10px]"></i>CÔNG TY CHI HỘ
                                        </span>
                                    ` : ((singleExp.expense_payer_type === 'SUB_OBH' || singleExp.reimburse_to_subcontractor) ? `
                                        <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 whitespace-nowrap">
                                            <i class="ph-bold ph-truck mr-0.5 text-[10px]"></i>3PL CHI HỘ
                                        </span>
                                    ` : `
                                        <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 whitespace-nowrap">
                                            🏢 Công ty
                                        </span>
                                    `)
                                ) : ''}
                            </div>
                        </td>
                        <td class="py-1.5 px-3 text-center border-r border-slate-200/70">
                            ${amountSum > 0 
                                ? `<span class="px-2 py-0.2 rounded text-[10.5px] font-bold ${
                                    (singleExp && singleExp.status === 'SETTLED') ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                                }">${(singleExp && singleExp.status_label) || 'Đã Ghi Nhận'}</span>` 
                                : `<span class="px-2 py-0.2 rounded text-[10.5px] font-bold bg-slate-100 text-slate-400">-</span>`}
                        </td>
                        <td class="py-1.5 px-3 text-center">
                            ${singleExp ? (
                                trip.is_expenses_settled || !singleExp.can_edit ? `
                                    <span class="inline-flex items-center text-purple-700 font-bold text-[10.5px] bg-purple-50 px-2 py-0.5 rounded border border-purple-200" title="Đã chốt sổ Kế toán, không thể chỉnh sửa">
                                        <i class="ph-bold ph-lock mr-1"></i> Khóa
                                    </span>
                                ` : `
                                    <div class="inline-flex items-center space-x-1">
                                        <button type="button" onclick="editExpensePrompt(${singleExp.id})" class="p-1 rounded text-amber-700 hover:bg-amber-100 transition-colors font-bold" title="Chỉnh sửa chi phí">
                                            <i class="ph ph-pencil text-sm"></i>
                                        </button>
                                        <button type="button" onclick="deleteExpensePrompt(${singleExp.id}, '${singleExp.category_name}')" class="p-1 rounded text-rose-600 hover:bg-rose-100 transition-colors font-bold" title="Xóa khoản chi">
                                            <i class="ph ph-trash text-sm"></i>
                                        </button>
                                    </div>
                                `
                            ) : '<span class="text-slate-300">-</span>'}
                        </td>
                    </tr>
                `;
            }
        }
    });

    const totalEl = document.getElementById('cost-sheet-total');
    if (totalEl) totalEl.innerText = formatMoney(totalCalculated);

    // Hiển thị dòng Tổng Chi Hộ KH nếu có (cất riêng khỏi chi phí vận hành)
    const reimbursableTotal = trip.cost_sheet?.total_reimbursable || 0;
    const reimbursableItems = trip.cost_sheet?.reimbursable_items || [];
    const reimbursableRow = document.getElementById('cost-sheet-reimbursable-row');
    const reimbursableTotalEl = document.getElementById('cost-sheet-reimbursable-total');
    if (reimbursableRow) {
        reimbursableRow.style.display = reimbursableTotal > 0 ? '' : 'none';
    }
    if (reimbursableTotalEl) {
        const itemsText = reimbursableItems.map(it => `${it.category}: ${formatMoney(it.amount)}`).join(' · ');
        reimbursableTotalEl.innerHTML = `
            <td colspan="2" class="p-3 text-right text-xs font-bold text-amber-800">
                <i class="ph-bold ph-arrow-up-right mr-1"></i>Tổng Khoản Chi Hộ Khách Hàng
                <p class="text-[10px] font-normal text-amber-600 mt-0.5">${itemsText || 'Công ty ứng chi trước, thu lại khi quyết toán với KH'}</p>
            </td>
            <td class="p-3 text-right font-black text-amber-700 tabular-nums">${formatMoney(reimbursableTotal)}</td>
            <td colspan="4" class="p-3 text-xs text-amber-600">
                <span class="px-2 py-0.5 rounded bg-amber-100 border border-amber-300 font-bold text-amber-800 text-[10px]">Không tính vào chi phí công ty</span>
            </td>
        `;
    }

    // ĐỒNG BỘ TUYỆT ĐỐI VỚI BOX P&L VÀ APP MOBILE (SINGLE SOURCE OF TRUTH)
    const pnlExpenseEl = document.getElementById('pnl-expense');
    if (pnlExpenseEl) pnlExpenseEl.innerText = formatMoney(totalCalculated);

    const rev = Number(trip.financials?.revenue || 0);
    const actualProfit = rev - totalCalculated;
    const actualMargin = rev > 0 ? ((actualProfit / rev) * 100).toFixed(1) : 0;
    const profitEl = document.getElementById('pnl-profit');
    if (profitEl) {
        profitEl.innerText = `${formatMoney(actualProfit)} (${actualMargin}%)`;
    }

    const appTotal = document.getElementById('app-total-expense');
    if (appTotal) appTotal.innerText = formatMoney(totalCalculated);
}

// Xây dựng nội dung tin nhắn Lệnh điều xe gửi Zalo chuẩn hóa
function buildDriverZaloMessage(trip) {
    if (!trip) return '';
    const portalUrl = `${window.location.origin}${trip.driver_link || ''}`;
    const tripCode = trip.id || trip.trip_code || trip.code || '-';
    const vehicle = trip.vehicle || trip.truck || '-';
    const trailer = trip.trailer || '-';
    const cont = trip.container || trip.container_number || 'CHƯA CÓ CONT';
    const contType = trip.container_type ? ` (${trip.container_type})` : '';
    const seal = trip.seal || trip.seal_number || '-';
    const pickup = trip.pickup || trip.pickup_location || '-';
    const warehouse = trip.warehouse || trip.warehouse_location || '-';
    const dropoff = trip.dropoff || trip.dropoff_location || '-';
    const loadingTimeStr = trip.loading_time ? `\n⏰ Giờ hẹn đóng hàng: ${trip.loading_time}` : '';

    return `🚚 LỆNH ĐIỀU XE GSS LOGISTICS:
• Chuyến: ${tripCode}
• Xe: ${vehicle} | Mooc: ${trailer}
• Cont: ${cont}${contType} | Seal: ${seal}
• Điểm 1 (Lấy cont): ${pickup}
• Điểm 2 (Giao kho): ${warehouse}
• Điểm 3 (Hạ cont): ${dropoff}${loadingTimeStr}
⚠️ LƯU Ý: Vui lòng mở link bên dưới xác nhận nhận chuyến trong vòng 60 phút.

👉 Mở link mobile báo mốc & kê chi phí:
${portalUrl}`;
}
window.buildDriverZaloMessage = buildDriverZaloMessage;

// Sao chép Lệnh điều xe kèm link Mobile Driver Portal gửi tài xế qua Zalo/SMS
window.copyDriverPortalLink = function() {
    const trip = window.currentTripDetail;
    if (!trip) {
        alert('Chưa có thông tin chi tiết chuyến xe để sao chép!');
        return;
    }
    const message = buildDriverZaloMessage(trip);
    const portalUrl = `${window.location.origin}${trip.driver_link || ''}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(message).then(() => {
            showToast('success', '✓ Đã sao chép Lệnh điều xe kèm link Mobile Driver Portal vào bộ nhớ tạm!\nBạn có thể dán (Ctrl+V) ngay vào Zalo gửi cho tài xế.', 'Đã Sao Chép Lệnh Xe');
        }).catch(err => {
            prompt('Sao chép liên kết gửi tài xế:', portalUrl);
        });
    } else {
        prompt('Sao chép liên kết gửi tài xế:', portalUrl);
    }
};

window.openZaloDriverChat = function() {
    const trip = window.currentTripDetail;
    if (!trip) return;
    const message = buildDriverZaloMessage(trip);
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(message).catch(() => {});
    }
    const phone = trip.driver_phone ? String(trip.driver_phone).replace(/\D/g, '') : '';
    if (phone) {
        window.open(`https://zalo.me/${phone}`, '_blank');
        showToast('success', `Đã sao chép Lệnh điều xe vào bộ nhớ tạm & Mở Zalo tài xế (${phone})! Hãy dán (Ctrl+V) để gửi.`, 'Mở Zalo Thành Công');
    } else {
        showToast('warning', 'Tài xế chưa có số điện thoại đăng ký Zalo trong hồ sơ.', 'Thiếu SĐT Tài Xế');
    }
};

window.copyCustomerTrackingLink = function() {
    const trip = window.currentTripDetail;
    if (!trip) {
        alert('Chưa có thông tin chuyến xe để sao chép!');
        return;
    }
    const trackingToken = trip.tracking_hashid || trip.hashid || trip.trip_code;
    const trackingUrl = `${window.location.origin}/tracking/${trackingToken}/`;
    const destWarehouse = trip.delivery_warehouse || trip.warehouse || 'Kho Khách Hàng';
    const message = `THÔNG TIN TRA CỨU VẬN ĐƠN CONTAINER - GSS LOGISTICS:\nChuyến: ${trip.trip_code || trip.code || trip.id}\nContainer: ${trip.container || '-'} (${trip.container_type || '40HC'})\nSố Chì (Seal): ${trip.seal || 'Chưa bấm'}\nKho Giao Hàng: ${destWarehouse}\n- Quý khách có thể theo dõi tiến độ chuyến xe thời gian thực tại: ${trackingUrl}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(message).then(() => {
            showToast('success', '✓ Đã sao chép liên kết tra cứu tiến độ chuyến xe dành cho khách hàng!\nBạn có thể dán (Ctrl+V) gửi qua Zalo / Email cho chủ hàng.', 'Đã Sao Chép Tracking Link');
        }).catch(err => {
            prompt('Sao chép liên kết gửi khách hàng:', trackingUrl);
        });
    } else {
        prompt('Sao chép liên kết gửi khách hàng:', trackingUrl);
    }
};

// Hàm mở / đóng chi tiết các dòng chi phí con khi người dùng click
function toggleExpenseDetail(code) {
    const subRows = document.querySelectorAll(`.sub-row-${code}`);
    const icon = document.getElementById(`icon-toggle-${code}`);
    subRows.forEach(row => {
        row.classList.toggle('hidden');
    });
    if (icon) {
        icon.classList.toggle('rotate-180');
    }
}
