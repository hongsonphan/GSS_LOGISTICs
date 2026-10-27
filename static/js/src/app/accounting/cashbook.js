// ==============================================================================
// 9.5. SUBTAB 5: SỔ QUỸ THU - CHI & DÒNG TIỀN VẬN TẢI (CASH & BANK BOOK)
// ==============================================================================
let rawCashTransactionsList = [];

function setCashBookPeriod(period) {
    const sel = document.getElementById('cash-filter-period');
    if (sel) {
        sel.value = period;
    }
    loadCashBookData();
}
window.setCashBookPeriod = setCashBookPeriod;

async function loadCashBookData() {
    try {
        const method = document.getElementById('cash-filter-method')?.value || 'ALL';
        const type = document.getElementById('cash-filter-type')?.value || 'ALL';
        const category = document.getElementById('cash-filter-category')?.value || 'ALL';
        const search = document.getElementById('cash-search')?.value || '';
        const period = document.getElementById('cash-filter-period')?.value || 'this_month';

        let url = `/api/accounting/cashbook/?payment_method=${method}&transaction_type=${type}&category=${category}`;
        if (period !== 'all') {
            const dateRange = getDateRangeForPeriod(period, currentDashboardCustomStart, currentDashboardCustomEnd);
            url += `&from_date=${dateRange.fromDate}&to_date=${dateRange.toDate}`;
        }
        if (search) url += `&search=${encodeURIComponent(search)}`;

        const res = await fetchWithAuth(url);
        if (!res.ok) throw new Error('Không thể tải Sổ Quỹ');
        const data = await res.json();

        rawCashTransactionsList = data.transactions || [];

        // Cập nhật KPIs với số liệu thực tế từ hệ thống
        const kp = data.kpis || {};
        const elCash = document.getElementById('cash-stat-cash-balance');
        if (elCash) elCash.innerText = formatMoneyVND(kp.cash_balance || 0);

        const elBank = document.getElementById('cash-stat-bank-balance');
        if (elBank) elBank.innerText = formatMoneyVND(kp.bank_balance || 0);

        const elTotal = document.getElementById('cash-stat-total-balance');
        if (elTotal) elTotal.innerText = formatMoneyVND(kp.total_balance || 0);

        const elNet = document.getElementById('cash-stat-period-net');
        if (elNet) {
            const net = kp.period_net || 0;
            elNet.innerText = (net >= 0 ? '+' : '') + formatMoneyVND(net);
            elNet.className = `text-3xl font-black tabular-nums font-heading tracking-tight mt-1 ${net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`;
        }

        const elInOut = document.getElementById('cash-stat-in-out-summary');
        if (elInOut) {
            elInOut.innerText = `Thu: +${formatMoneyVND(kp.period_inflow || 0)} | Chi: -${formatMoneyVND(kp.period_outflow || 0)}`;
        }

        renderCashBookTable(rawCashTransactionsList);
    } catch (err) {
        console.error('Lỗi tải Sổ Quỹ:', err);
    }
}

function renderCashBookTable(list) {
    const tbody = document.getElementById('acct-cash-tbody');
    if (!tbody) return;

    if (!list || list.length === 0) {
        const periodSelect = document.getElementById('cash-filter-period');
        const periodLabel = periodSelect ? (periodSelect.options[periodSelect.selectedIndex]?.text || 'kỳ đã chọn') : 'kỳ đã chọn';
        tbody.innerHTML = `
            <tr>
                <td colspan="12" class="py-12 px-4 text-center">
                    <div class="max-w-md mx-auto space-y-2.5">
                        <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-2xl">
                            <i class="ph-bold ph-calendar-blank"></i>
                        </div>
                        <p class="text-sm font-bold text-slate-700">Chưa có phiếu thu / chi nào trong khoảng <span class="text-teal-700 font-black">"${escapeHtml(periodLabel)}"</span></p>
                        <p class="text-xs text-slate-500 leading-relaxed">
                            💡 Ba thẻ chỉ số ở trên thể hiện <strong>số dư tồn quỹ thực tế tích lũy của toàn công ty</strong> tính đến thời điểm hiện tại.<br>
                            Để xem lại các phiếu thu chi phát sinh trong tháng hoặc toàn bộ thời gian, bạn có thể chọn nhanh:
                        </p>
                        <div class="pt-2 flex items-center justify-center gap-2">
                            <button type="button" onclick="setCashBookPeriod('this_month')" 
                                class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold font-heading shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer">
                                <i class="ph-bold ph-calendar"></i>
                                <span>Xem Phiếu Tháng Này</span>
                            </button>
                            <button type="button" onclick="setCashBookPeriod('this_year')" 
                                class="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold font-heading transition-all inline-flex items-center gap-1.5 cursor-pointer">
                                <span>Xem Cả Năm</span>
                            </button>
                            <button type="button" onclick="setCashBookPeriod('all')" 
                                class="px-3.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold font-heading transition-all inline-flex items-center gap-1.5 cursor-pointer">
                                <span>Tất Cả Thời Gian</span>
                            </button>
                        </div>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = list.map((item, index) => {
        const isInflow = item.transaction_type === 'INFLOW';
        const typeBadge = isInflow
            ? `<span class="font-bold text-xs text-emerald-600 inline-flex items-center justify-center gap-1"><i class="ph-bold ph-plus-circle text-xs"></i> Thu Tiền</span>`
            : `<span class="font-bold text-xs text-rose-600 inline-flex items-center justify-center gap-1"><i class="ph-bold ph-minus-circle text-xs"></i> Chi Tiền</span>`;

        const methodBadge = item.payment_method === 'BANK'
            ? `<span class="font-bold text-xs text-slate-700 inline-flex items-center gap-1.5"><i class="ph-bold ph-bank text-teal-600 text-sm"></i> Ngân Hàng</span>`
            : `<span class="font-bold text-xs text-slate-700 inline-flex items-center gap-1.5"><i class="ph-bold ph-money text-amber-600 text-sm"></i> Tiền Mặt</span>`;

        const amountClass = isInflow ? 'text-emerald-700' : 'text-rose-700';
        const sign = isInflow ? '+' : '-';

        return `
            <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="w-12 text-center select-none font-bold text-slate-500 border-r border-slate-200 font-mono text-xs tabular-nums">
                    ${index + 1}
                </td>
                <td>
                    <div class="font-bold text-slate-800 font-mono text-xs">${escapeHtml(item.code)}</div>
                </td>
                <td class="text-xs text-slate-600 font-medium">${item.transaction_date}</td>
                <td class="text-center">${typeBadge}</td>
                <td>${methodBadge}</td>
                <td>
                    <span class="font-bold text-slate-800 text-xs">${escapeHtml(item.category_label)}</span>
                </td>
                <td>
                    <div class="font-bold text-slate-800">${escapeHtml(item.partner_name || '-')}</div>
                    ${item.partner_type_label ? `<div class="text-[10px] text-slate-400">${escapeHtml(item.partner_type_label)}</div>` : ''}
                </td>
                <td>
                    ${item.ref_code ? `<span class="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-bold">${escapeHtml(item.ref_code)}</span>` : '<span class="text-slate-400">-</span>'}
                </td>
                <td class="text-right font-black tabular-nums text-sm font-heading ${amountClass}">
                    ${sign}${formatMoneyVND(item.amount)}
                </td>
                <td class="text-xs text-slate-500">${escapeHtml(item.created_by || '-')}</td>
                <td class="text-xs text-slate-600 max-w-[220px] truncate" title="${escapeHtml(item.notes || '')}">
                    ${escapeHtml(item.notes || '-')}
                </td>
                <td class="text-center">
                    <div class="inline-flex items-center gap-1.5 justify-center">
                        <button type="button" onclick="viewCashVoucherDetail('${escapeHtml(item.id || item.code)}')" 
                            class="px-2.5 py-1 bg-transparent hover:bg-teal-600 text-teal-700 hover:text-white border border-teal-600 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                            title="Xem chi tiết, Sửa, Lưu & Xóa phiếu Thu/Chi">
                            <i class="ph-bold ph-eye"></i>
                            <span>Xem</span>
                        </button>
                        <button type="button" onclick="openDirectPrintCashVoucher('${escapeHtml(item.id || item.code)}')" 
                            class="px-2.5 py-1 bg-transparent hover:bg-slate-700 text-slate-700 hover:text-white border border-slate-600 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                            title="In nhanh phiếu Thu/Chi khổ A4 (Mẫu BTC)">
                            <i class="ph-bold ph-printer"></i>
                            <span>In</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    if (window.BimTableFooter && Array.isArray(list)) {
        const totalInflow = list.filter(i => i.transaction_type === 'INFLOW').reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
        const totalOutflow = list.filter(i => i.transaction_type === 'OUTFLOW').reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
        const netBalance = totalInflow - totalOutflow;
        window.BimTableFooter.render('accounting-cashbook-table', {
            cells: [
                { text: 'TỔNG', align: 'center', class: 'font-black text-slate-900 font-heading' },
                { html: `${list.length} phiếu GD | Thu: <span class="text-emerald-700 font-bold font-mono">+${formatMoneyVND(totalInflow)}</span> | Chi: <span class="text-rose-700 font-bold font-mono">-${formatMoneyVND(totalOutflow)}</span>`, colspan: 7 },
                { html: `<span class="${netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'} font-black tabular-nums font-mono text-sm">${netBalance >= 0 ? '+' : ''}${formatMoneyVND(netBalance)}</span>`, align: 'right' },
                { text: '', align: 'center', colspan: 3 }
            ]
        });
    }
}

// --- CHUYỂN ĐỔI SỐ TIỀN THÀNH CHỮ TIẾNG VIỆT CHUẨN KẾ TOÁN ---
function numberToWordsVN(n) {
    if (n === null || n === undefined || isNaN(n)) return '';
    let num = Math.abs(Math.round(Number(n)));
    if (num === 0) return 'Không đồng.';

    const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
    const scaleUnits = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

    function readGroup(group, showZeroHundred) {
        let h = Math.floor(group / 100);
        let t = Math.floor((group % 100) / 10);
        let u = group % 10;
        let res = '';

        if (h > 0 || showZeroHundred) {
            res += digits[h] + ' trăm ';
            if (t === 0 && u > 0) res += 'lẻ ';
        }

        if (t > 1) {
            res += digits[t] + ' mươi ';
            if (u === 1) res += 'mốt ';
            else if (u === 5) res += 'lăm ';
            else if (u > 0) res += digits[u] + ' ';
        } else if (t === 1) {
            res += 'mười ';
            if (u === 5) res += 'lăm ';
            else if (u > 0) res += digits[u] + ' ';
        } else if (u > 0 && !res.includes('lẻ')) {
            res += digits[u] + ' ';
        } else if (u > 0) {
            res += digits[u] + ' ';
        }

        return res.trim();
    }

    let groups = [];
    while (num > 0) {
        groups.push(num % 1000);
        num = Math.floor(num / 1000);
    }

    let words = '';
    for (let i = groups.length - 1; i >= 0; i--) {
        let g = groups[i];
        if (g > 0) {
            let showZeroHundred = (i < groups.length - 1) && (groups.length > 1);
            let gText = readGroup(g, showZeroHundred);
            let unit = scaleUnits[i] ? ' ' + scaleUnits[i] : '';
            words += (words ? ' ' : '') + gText + unit;
        }
    }

    words = words.trim();
    if (!words) return 'Không đồng.';
    words = words.charAt(0).toUpperCase() + words.slice(1) + ' đồng chẵn.';
    return words;
}

// --- QUẢN LÝ MODAL XEM CHI TIẾT & IN PHIẾU THU / CHI (MẪU 01-TT / 02-TT BTC) ---
let currentVoucherPrintMode = 'dual';

function setDynamicPrintPageStyle(cssText) {
    let styleEl = document.getElementById('dynamic-print-page-style');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'dynamic-print-page-style';
        document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = `@media print { ${cssText} }`;
}

function setVoucherPrintMode(mode = 'dual') {
    currentVoucherPrintMode = mode;
    const printArea = document.getElementById('cash-voucher-printable-area');
    const btnDual = document.getElementById('btn-voucher-mode-dual');
    const btnSingle = document.getElementById('btn-voucher-mode-single');

    if (printArea) {
        if (mode === 'dual') {
            printArea.classList.add('voucher-mode-dual');
            printArea.classList.remove('voucher-mode-single');
        } else {
            printArea.classList.add('voucher-mode-single');
            printArea.classList.remove('voucher-mode-dual');
        }
    }

    if (btnDual && btnSingle) {
        if (mode === 'dual') {
            btnDual.className = 'px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 bg-teal-600 text-white shadow-xs cursor-pointer';
            btnSingle.className = 'px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 text-slate-300 hover:text-white cursor-pointer';
        } else {
            btnSingle.className = 'px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 bg-teal-600 text-white shadow-xs cursor-pointer';
            btnDual.className = 'px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 text-slate-300 hover:text-white cursor-pointer';
        }
    }

    // Thiết lập khổ in chuẩn A4 dọc
    setDynamicPrintPageStyle(mode === 'dual' ? '@page { size: A4 portrait; margin: 8mm 10mm; }' : '@page { size: A4 portrait; margin: 15mm 18mm; }');
}

async function openCashVoucherModal(txDataOrId) {
    let tx = null;
    if (typeof txDataOrId === 'object' && txDataOrId !== null) {
        tx = txDataOrId;
    } else {
        try {
            const res = await fetchWithAuth(`/api/accounting/cashbook/${txDataOrId}/`);
            if (!res.ok) throw new Error('Không tìm thấy chứng từ');
            const data = await res.json();
            tx = data.transaction;
        } catch (err) {
            console.error('Lỗi tải chứng từ:', err);
            showToast('danger', 'Không thể tải chi tiết chứng từ để in', 'Lỗi In Phiếu');
            return;
        }
    }

    if (!tx) return;

    const modal = document.getElementById('modal-cash-voucher-print');
    if (!modal) return;

    const isInflow = tx.transaction_type === 'INFLOW';
    const titleText = isInflow ? 'PHIẾU THU' : 'PHIẾU CHI';
    const topTitleText = isInflow ? 'Phiếu Thu Sổ Quỹ (Mẫu 01-TT BTC)' : 'Phiếu Chi Sổ Quỹ (Mẫu 02-TT BTC)';
    const templateNoText = isInflow ? 'Mẫu số 01 - TT' : 'Mẫu số 02 - TT';
    const debitAcc = isInflow ? (tx.payment_method === 'BANK' ? '1121' : '1111') : '1411 / 331 / 642';
    const creditAcc = isInflow ? '1411 / 131 / 711' : (tx.payment_method === 'BANK' ? '1121' : '1111');
    const partnerLabel = isInflow ? 'Họ tên người nộp tiền:' : 'Họ tên người nhận tiền:';
    const signPartnerRole = isInflow ? 'Người Nộp Tiền' : 'Người Nhận Tiền';
    const reasonLabel = isInflow ? 'Lý do nộp:' : 'Lý do chi:';

    // Parse date parts
    let day = tx.day || '', month = tx.month || '', year = tx.year || '';
    if (!day && tx.transaction_date) {
        const parts = tx.transaction_date.split('/');
        if (parts.length === 3) {
            day = parts[0]; month = parts[1]; year = parts[2];
        }
    }
    if (!day) {
        const now = new Date();
        day = String(now.getDate()).padStart(2, '0');
        month = String(now.getMonth() + 1).padStart(2, '0');
        year = String(now.getFullYear());
    }

    const dateFormattedText = `Ngày ${day} tháng ${month} năm ${year}`;
    const signDateFormattedText = `Ngày ${day}/${month}/${year}`;
    const amountWords = numberToWordsVN(tx.amount);
    const amountFormatted = new Intl.NumberFormat('vi-VN').format(Math.round(tx.amount || 0)) + ' đ';
    const methodFormatted = tx.payment_method === 'BANK' ? 'Chuyển khoản Ngân hàng' : 'Quỹ Tiền mặt';
    const co = getSystemCompanyProfile();
    const departmentFormatted = tx.partner_type_label ? `${tx.partner_type_label} - ${co.short_name || co.company_name}` : `Đội xe vận tải ${co.short_name || co.company_name}`;
    const reasonFormatted = tx.notes || tx.category_label || (isInflow ? 'Thu hoàn ứng tiền thừa quyết toán gom chuyến' : 'Chi bù vượt ứng quyết toán gom chuyến');
    const attachmentsFormatted = tx.ref_code ? `01 Bảng kê [${tx.ref_code}] & chứng từ gốc` : '01 Bảng kê quyết toán chuyến & chứng từ gốc';

    syncCompanyProfileToPrintForms();

    // Helper cập nhật tất cả selector cùng class (đồng bộ Liên 1 & Liên 2)
    const setAllClassText = (cls, val) => {
        document.querySelectorAll(`#cash-voucher-printable-area .${cls}`).forEach(el => {
            el.innerText = val;
        });
    };

    const topTitleEl = document.getElementById('voucher-modal-top-title');
    if (topTitleEl) topTitleEl.innerText = topTitleText;

    const footerCodeEl = document.getElementById('print-v-footer-code');
    if (footerCodeEl) footerCodeEl.innerText = tx.code || '-';

    const copy2Badge = document.getElementById('voucher-copy-2-badge');
    if (copy2Badge) {
        copy2Badge.innerText = isInflow ? 'Liên 2: Giao cho người nộp tiền' : 'Liên 2: Giao cho người nhận tiền';
    }

    // Đồng bộ Liên 1 & Liên 2
    setAllClassText('v-template-no', templateNoText);
    setAllClassText('v-code', tx.code || '-');
    setAllClassText('v-debit-acc', debitAcc);
    setAllClassText('v-credit-acc', creditAcc);
    setAllClassText('v-title', titleText);
    setAllClassText('v-date', dateFormattedText);
    setAllClassText('v-sign-date', signDateFormattedText);
    setAllClassText('v-partner-label', partnerLabel);
    setAllClassText('v-sign-partner-role', signPartnerRole);
    setAllClassText('v-partner-name', tx.partner_name || 'Tài xế / Đối tác');
    setAllClassText('v-department', departmentFormatted);
    setAllClassText('v-reason-label', reasonLabel);
    setAllClassText('v-reason', reasonFormatted);
    setAllClassText('v-amount', amountFormatted);
    setAllClassText('v-method', methodFormatted);
    setAllClassText('v-amount-words', amountWords);
    setAllClassText('v-received-words', amountWords);
    setAllClassText('v-creator-name', tx.created_by || 'Kế toán viên');
    setAllClassText('v-attachments', attachmentsFormatted);

    // Đồng bộ thông tin công ty hệ thống lên phiếu thu chi
    syncCompanyProfileToPrintForms();

    // Mặc định chế độ 2 Liên / A4
    setVoucherPrintMode('dual');

    modal.classList.remove('hidden');
}

function closeCashVoucherModal() {
    const modal = document.getElementById('modal-cash-voucher-print');
    if (modal) modal.classList.add('hidden');
}

function printCashVoucher() {
    document.body.classList.add('is-printing-voucher');
    document.body.classList.remove('is-printing-quotation', 'is-printing-report');
    window.print();
}

window.openCashVoucherModal = openCashVoucherModal;
window.closeCashVoucherModal = closeCashVoucherModal;
window.printCashVoucher = printCashVoucher;
window.setVoucherPrintMode = setVoucherPrintMode;
window.setDynamicPrintPageStyle = setDynamicPrintPageStyle;
window.numberToWordsVN = numberToWordsVN;


function openCreateCashTransactionModal(defaultType = 'INFLOW') {
    const modal = document.getElementById('modal-cash-transaction');
    if (!modal) return;

    document.getElementById('cash-tx-type').value = defaultType;
    document.getElementById('cash-tx-date').value = new Date().toISOString().slice(0, 10);
    document.getElementById('cash-tx-amount').value = '';
    document.getElementById('cash-tx-partner-name').value = '';
    document.getElementById('cash-tx-ref').value = '';
    document.getElementById('cash-tx-notes').value = '';

    onCashTypeChange();
    onPaymentMethodChange();

    modal.classList.remove('hidden');
}

function closeCashTransactionModal() {
    const modal = document.getElementById('modal-cash-transaction');
    if (modal) modal.classList.add('hidden');
}

function onCashTypeChange() {
    const type = document.getElementById('cash-tx-type')?.value;
    const catSelect = document.getElementById('cash-tx-category');
    if (!catSelect) return;

    if (type === 'INFLOW') {
        catSelect.innerHTML = `
            <option value="FREIGHT_REVENUE">Thu cước vận tải từ khách hàng</option>
            <option value="REIMBURSABLE_COLLECTION">Thu hồi chi hộ (Debit Note)</option>
            <option value="ADVANCE_REFUND">Thu hoàn ứng tiền thừa (Tài xế/Điều vận)</option>
            <option value="OTHER_INFLOW">Thu khác</option>
        `;
        document.getElementById('cash-modal-title').innerText = 'Lập Phiếu Thu (Tiền Vào Quỹ)';
    } else {
        catSelect.innerHTML = `
            <option value="DISPATCHER_FUND_ADVANCE">Chi tạm ứng Quỹ Điều vận</option>
            <option value="DRIVER_TRIP_ADVANCE">Chi tạm ứng Chuyến xe (Tài xế)</option>
            <option value="ADVANCE_REIMBURSE">Chi bù vượt ứng (Hoàn ứng tài xế)</option>
            <option value="SUBCONTRACTOR_PAYMENT">Chi thanh toán Thầu phụ / Xe bạn</option>
            <option value="FUEL_PAYMENT">Chi mua xăng dầu</option>
            <option value="ETC_TOPUP">Chi nạp tiền tài khoản BOT/ETC</option>
            <option value="VEHICLE_MAINTENANCE">Chi bảo dưỡng sửa xe</option>
            <option value="OTHER_OUTFLOW">Chi phí khác</option>
        `;
        document.getElementById('cash-modal-title').innerText = 'Lập Phiếu Chi (Tiền Ra Khỏi Quỹ)';
    }
}

function onPaymentMethodChange() {
    const method = document.getElementById('cash-tx-method')?.value;
    const bankFields = document.getElementById('cash-bank-fields');
}

async function handleSaveCashTransaction(e) {
    e.preventDefault();
    const type = document.getElementById('cash-tx-type').value;
    const method = document.getElementById('cash-tx-method').value;
    const category = document.getElementById('cash-tx-category').value;
    const amount = document.getElementById('cash-tx-amount').value;
    const date = document.getElementById('cash-tx-date').value;
    const partnerType = document.getElementById('cash-tx-partner-type').value;
    const partnerName = document.getElementById('cash-tx-partner-name').value;
    const refCode = document.getElementById('cash-tx-ref').value;
    const bankName = document.getElementById('cash-tx-bank').value;
    const notes = document.getElementById('cash-tx-notes').value;

    try {
        const res = await fetchWithAuth('/api/accounting/cashbook/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transaction_type: type,
                payment_method: method,
                category: category,
                amount: amount,
                transaction_date: date,
                partner_type: partnerType,
                partner_name: partnerName,
                ref_code: refCode,
                bank_name: bankName,
                notes: notes
            })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message, 'Lập Phiếu Thành Công');
            closeCashTransactionModal();
            loadCashBookData();
        } else {
            showToast('danger', data.error || 'Có lỗi xảy ra');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

function exportCashBookToExcel() {
    exportAccountingToExcel();
}
