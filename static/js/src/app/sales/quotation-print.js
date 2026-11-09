let currentPrintingQuotation = null;
let previousViewBeforeQuotationPrint = null;

async function openQuotationPrintModal(quoteIdOrData, templateType = null) {
    const curActive = document.querySelector('.view:not(.hidden-view)');
    if (curActive && curActive.id !== 'view-quotation-print') {
        previousViewBeforeQuotationPrint = curActive.id;
    }
    let q = null;
    if (typeof quoteIdOrData === 'object' && quoteIdOrData !== null) {
        q = quoteIdOrData;
    } else {
        try {
            const res = await fetchWithAuth(`/api/quotations/${quoteIdOrData}/`);
            if (!res.ok) throw new Error('Không thể tải chi tiết báo giá');
            q = await res.json();
        } catch (err) {
            console.error('Lỗi tải báo giá in:', err);
            showToast('error', 'Không thể tải thông tin báo giá để in', 'Lỗi');
            return;
        }
    }

    currentPrintingQuotation = q;
    const selectedTemplate = templateType || q.template_type || 'STANDARD';

    const selector = document.getElementById('quote-print-template-selector');
    if (selector) selector.value = selectedTemplate;

    const badgeCode = document.getElementById('quote-print-badge-code');
    if (badgeCode) badgeCode.innerText = q.quotation_code || q.code || 'BÁO GIÁ';

    const modalTitle = document.getElementById('quote-print-modal-title');
    if (modalTitle) modalTitle.innerText = `Báo Giá [${q.quotation_code || q.code || ''}] - ${q.customer_name || q.customer || ''}`;

    // Chuẩn bị danh sách items
    let items = q.items || [];
    if (!items || items.length === 0) {
        items = [{
            route_description: q.route_description || q.route || 'Tuyến vận chuyển chính',
            cargo_type: q.cargo_type || 'Cont 40HC',
            estimated_km: q.estimated_km || 0,
            unit_price: q.unit_price || 0,
            expected_trips_monthly: q.expected_trips_monthly || q.monthly_trips || 1
        }];
    }

    let grandTotal = 0;
    items.forEach(it => {
        grandTotal += Number(it.unit_price || 0) * Number(it.expected_trips_monthly || 1);
    });

    const amountInWords = (typeof numberToWordsVN === 'function') ? numberToWordsVN(grandTotal) : `${new Intl.NumberFormat('vi-VN').format(grandTotal)} đồng`;
    const createdDate = q.created_at || (new Date().toLocaleDateString('vi-VN'));

    // Xử lý thông tin ngày hiệu lực (Valid Until): Nếu có nhập thì dùng ngày đó, nếu không thì auto 30 ngày
    let validUntilDateStr = '';
    let isAuto30Days = false;
    if (q.valid_until) {
        validUntilDateStr = formatDateVN(q.valid_until);
    }
    if (!validUntilDateStr) {
        isAuto30Days = true;
        const baseDate = q.created_at ? new Date(q.created_at) : new Date();
        const targetDate = isNaN(baseDate.getTime()) ? new Date() : baseDate;
        const autoDate = new Date(targetDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        const day = String(autoDate.getDate()).padStart(2, '0');
        const month = String(autoDate.getMonth() + 1).padStart(2, '0');
        const year = autoDate.getFullYear();
        validUntilDateStr = `${day}/${month}/${year}`;
    }

    const validityClause = isAuto30Days
        ? `Báo giá có hiệu lực trong vòng 30 ngày kể từ ngày ban hành (đến ngày ${validUntilDateStr}).`
        : `Báo giá có hiệu lực đến ngày ${validUntilDateStr}.`;

    const validityHeaderStr = isAuto30Days
        ? `${validUntilDateStr} (Trong 30 ngày)`
        : `Đến ngày ${validUntilDateStr}`;

    // Tự động cập nhật dòng điều khoản hiệu lực trong nội dung ghi chú
    let notesText = q.notes || DEFAULT_QUOTATION_NOTES.fcl;
    if (/(?:Báo giá có hiệu lực|Báo giá có giá trị)/i.test(notesText)) {
        notesText = notesText.replace(/(?:^|\n)(\s*(?:\d+\.|\-|\*)\s*)?(?:Báo giá có hiệu lực|Báo giá có giá trị)[^\n\r]*/gi, (match, prefix) => {
            const p = prefix || '';
            return `\n${p}${validityClause}`;
        }).trim();
    } else {
        notesText = `${notesText}\n- ${validityClause}`;
    }

    const now = new Date();
    const datePlaceStr = `Tp. Hồ Chí Minh, ngày ${String(now.getDate()).padStart(2, '0')} tháng ${String(now.getMonth() + 1).padStart(2, '0')} năm ${now.getFullYear()}`;

    const isFuelAdjusted = (q.pricing_method === 'FUEL_ADJUSTED') || Boolean(q.base_fuel_price && q.pricing_method === 'FUEL_ADJUSTED');
    const p0Val = Number(q.base_fuel_price || 21000);
    const stepVal = Number(q.fuel_step_vnd || 1000);
    const ratioVal = Number(q.fuel_ratio_percent || 3.5);
    // Diễn giải & ví dụ dựng theo thông số hiện tại (có hỗ trợ điều chỉnh theo số tiền và phụ phí hạ xa)
    const surcharge = buildQuoteSurchargeTexts(q, Number(items[0] && items[0].unit_price) || 0);
    const isFarDrop = Boolean(q.far_drop_enabled);
    const fuelByAmount = q.fuel_adjust_type === 'AMOUNT';
    const formulaText = surcharge.fuelRule;

    // 1. Điền dữ liệu MẪU 1: STANDARD (Tiêu Chuẩn)
    const p1DatePlace = document.getElementById('print-q1-date-place');
    if (p1DatePlace) p1DatePlace.innerText = datePlaceStr;

    const p1CodeSub = document.getElementById('print-q1-code-sub');
    if (p1CodeSub) p1CodeSub.innerText = `Số: ${q.quotation_code || q.code || 'BG'}`;

    const p1CustName = document.getElementById('print-q1-customer-name');
    if (p1CustName) p1CustName.innerText = q.customer_name || q.customer || 'QUÝ KHÁCH HÀNG';

    const p1Contact = document.getElementById('print-q1-contact-person');
    if (p1Contact) p1Contact.innerText = q.contact_person || q.customer_contact || 'Phòng Xuất Nhập Khẩu / Logistics';

    const p1Phone = document.getElementById('print-q1-contact-phone');
    if (p1Phone) p1Phone.innerText = q.contact_phone || q.customer_phone || '';

    const p1Address = document.getElementById('print-q1-customer-address');
    if (p1Address) p1Address.innerText = q.customer_address || 'Địa chỉ kho khách hàng';

    const p1Tax = document.getElementById('print-q1-tax-code');
    if (p1Tax) p1Tax.innerText = q.customer_tax_code || 'Chưa cập nhật';

    const p1ValidUntil = document.getElementById('print-q1-valid-until');
    if (p1ValidUntil) p1ValidUntil.innerText = validityHeaderStr;

    // Render bảng Mẫu 1
    const p1Tbody = document.getElementById('print-q1-table-body');
    if (p1Tbody) {
        p1Tbody.innerHTML = items.map((it, idx) => {
            const lineTotal = Number(it.unit_price || 0) * Number(it.expected_trips_monthly || 1);
            return `
                <tr>
                    <td class="border border-slate-400 p-2 text-center font-bold">${idx + 1}</td>
                    <td class="border border-slate-400 p-2 font-bold text-slate-900">${escapeHtml(it.route_description || it.route || '')}</td>
                    <td class="border border-slate-400 p-2 text-center">${escapeHtml(it.cargo_type || q.cargo_type || 'Cont 40HC')}</td>
                    <td class="border border-slate-400 p-2 text-center font-semibold tabular-nums">${it.estimated_km || 0} km</td>
                    <td class="border border-slate-400 p-2 text-right font-bold text-slate-950 tabular-nums">${new Intl.NumberFormat('vi-VN').format(it.unit_price || 0)} đ</td>
                    <td class="border border-slate-400 p-2 text-center font-semibold tabular-nums">${new Intl.NumberFormat('vi-VN').format(it.expected_trips_monthly || 1)} chuyến</td>
                    <td class="border border-slate-400 p-2 text-right font-black text-slate-950 tabular-nums">${new Intl.NumberFormat('vi-VN').format(lineTotal)} đ</td>
                </tr>
            `;
        }).join('');
    }

    const p1GrandTotal = document.getElementById('print-q1-grand-total');
    if (p1GrandTotal) p1GrandTotal.innerText = `${new Intl.NumberFormat('vi-VN').format(grandTotal)} VNĐ`;

    const p1TotalWords = document.getElementById('print-q1-total-words');
    if (p1TotalWords) p1TotalWords.innerText = amountInWords;

    const p1FuelBox = document.getElementById('print-q1-fuel-box');
    if (p1FuelBox) {
        if (isFuelAdjusted) {
            p1FuelBox.classList.remove('hidden');
            const p0El = document.getElementById('print-q1-fuel-p0');
            if (p0El) p0El.innerText = `${new Intl.NumberFormat('vi-VN').format(p0Val)} đ/lít`;
            const stepEl = document.getElementById('print-q1-fuel-step');
            if (stepEl) stepEl.innerText = `±${new Intl.NumberFormat('vi-VN').format(stepVal)} đ/lít`;
            const ratioEl = document.getElementById('print-q1-fuel-ratio');
            const ratioLabel = document.getElementById('print-q1-fuel-ratio-label');
            if (ratioLabel) ratioLabel.innerText = fuelByAmount ? 'Số tiền điều chỉnh:' : 'Tỷ lệ điều chỉnh:';
            if (ratioEl) ratioEl.innerText = fuelByAmount ? `±${new Intl.NumberFormat('vi-VN').format(Number(q.fuel_amount_per_step) || 0)} đ/chuyến` : `±${ratioVal}% cước`;
            const formEl = document.getElementById('print-q1-fuel-formula');
            if (formEl) formEl.innerText = formulaText;
            const exEl = document.getElementById('print-q1-fuel-example');
            if (exEl) exEl.innerText = surcharge.fuelExample;
        } else {
            p1FuelBox.classList.add('hidden');
        }
    }

    // Phụ phí hạ xa (cả 3 mẫu in)
    [['print-q1-fardrop', true], ['print-q2-fardrop', false], ['print-q3-fardrop', false]].forEach(([prefix, ownExample]) => {
        const box = document.getElementById(`${prefix}-box`);
        if (!box) return;
        box.classList.toggle('hidden', !isFarDrop);
        const descEl = document.getElementById(`${prefix}-desc`);
        if (descEl) descEl.innerText = ownExample ? surcharge.farRule : `${surcharge.farRule} Ví dụ: ${surcharge.farExample}`;
        const exEl = document.getElementById(`${prefix}-example`);
        if (exEl) exEl.innerText = surcharge.farExample;
    });

    const p1Notes = document.getElementById('print-q1-notes-content');
    if (p1Notes) p1Notes.innerText = notesText;

    const p1SignCust = document.getElementById('print-q1-sign-customer');
    if (p1SignCust) p1SignCust.innerText = q.customer_name || q.customer || 'Đại diện khách hàng';

    // 2. Điền dữ liệu MẪU 2: TABLE_MATRIX
    const p2ToName = document.getElementById('print-q2-to-name');
    if (p2ToName) p2ToName.innerText = q.customer_name || q.customer || '';

    const p2ToAttn = document.getElementById('print-q2-to-attn');
    if (p2ToAttn) p2ToAttn.innerText = q.contact_person || q.customer_contact || 'Ban Giám Đốc / P.Logistics';

    const p2ToEmail = document.getElementById('print-q2-to-email');
    if (p2ToEmail) p2ToEmail.innerText = q.contact_email || 'logistics@customer.com';

    const p2ToTel = document.getElementById('print-q2-to-tel');
    if (p2ToTel) p2ToTel.innerText = q.contact_phone || q.customer_phone || '';

    const p2Date = document.getElementById('print-q2-date');
    if (p2Date) p2Date.innerText = createdDate;

    const p2Cargo = document.getElementById('print-q2-cargo');
    if (p2Cargo) p2Cargo.innerText = q.cargo_type || 'Container & Hàng tổng hợp';

    const p2Tbody = document.getElementById('print-q2-tbody');
    if (p2Tbody) {
        p2Tbody.innerHTML = items.map((it, idx) => {
            const lineTotal = Number(it.unit_price || 0) * Number(it.expected_trips_monthly || 1);
            return `
                <tr>
                    <td class="border border-slate-900 p-2 text-center font-bold">${idx + 1}</td>
                    <td class="border border-slate-900 p-2 font-bold text-slate-900">${escapeHtml(it.route_description || it.route || '')}</td>
                    <td class="border border-slate-900 p-2 text-center font-semibold">${escapeHtml(it.cargo_type || q.cargo_type || 'Cont 40HC')}</td>
                    <td class="border border-slate-900 p-2 text-center">${it.estimated_km || 0} km</td>
                    <td class="border border-slate-900 p-2 text-right font-black font-mono">${new Intl.NumberFormat('vi-VN').format(it.unit_price || 0)} đ</td>
                    <td class="border border-slate-900 p-2 text-center font-semibold">${new Intl.NumberFormat('vi-VN').format(it.expected_trips_monthly || 1)} chuyến</td>
                    <td class="border border-slate-900 p-2 text-right font-black font-mono text-slate-950">${new Intl.NumberFormat('vi-VN').format(lineTotal)} đ</td>
                </tr>
            `;
        }).join('');
    }

    const p2GrandTotal = document.getElementById('print-q2-grand-total');
    if (p2GrandTotal) p2GrandTotal.innerText = `${new Intl.NumberFormat('vi-VN').format(grandTotal)} VNĐ`;

    const p2FuelBox = document.getElementById('print-q2-fuel-box');
    if (p2FuelBox) {
        if (isFuelAdjusted) {
            p2FuelBox.classList.remove('hidden');
            const descEl = document.getElementById('print-q2-fuel-desc');
            if (descEl) descEl.innerText = `${formulaText} Ví dụ: ${surcharge.fuelExample}`;
        } else {
            p2FuelBox.classList.add('hidden');
        }
    }

    const p2Notes = document.getElementById('print-q2-notes');
    if (p2Notes) p2Notes.innerText = notesText;

    const p2SignCust = document.getElementById('print-q2-sign-cust');
    if (p2SignCust) p2SignCust.innerText = q.customer_name || q.customer || 'Đại diện khách hàng';

    // 3. Điền dữ liệu MẪU 3: PROJECT_DETAIL
    const p3Code = document.getElementById('print-q3-code');
    if (p3Code) p3Code.innerText = `REF: ${q.quotation_code || q.code || ('BG-' + q.id)}`;

    const p3Cust = document.getElementById('print-q3-client-name') || document.getElementById('print-q3-customer');
    if (p3Cust) p3Cust.innerText = q.customer_name || q.customer || '';

    const p3Contact = document.getElementById('print-q3-client-contact');
    if (p3Contact) p3Contact.innerText = q.contact_person || q.customer_contact || 'Phòng Xuất Nhập Khẩu';

    const p3Phone = document.getElementById('print-q3-client-phone');
    if (p3Phone) p3Phone.innerText = [q.contact_phone || q.customer_phone, q.contact_email].filter(Boolean).join(' / ') || '';

    const p3Cargo = document.getElementById('print-q3-cargo-desc');
    if (p3Cargo) p3Cargo.innerText = q.cargo_type || 'Container 40HC / Hàng xuất nhập khẩu';

    const p3Validity = document.getElementById('print-q3-validity');
    if (p3Validity) p3Validity.innerText = `Áp dụng ${validityHeaderStr.toLowerCase()}`;

    const p3Tbody = document.getElementById('print-q3-tbody');
    if (p3Tbody) {
        p3Tbody.innerHTML = items.map((it, idx) => {
            const lineTotal = Number(it.unit_price || 0) * Number(it.expected_trips_monthly || 1);
            return `
                <tr>
                    <td class="border border-slate-900 p-2 text-center font-bold">${idx + 1}</td>
                    <td class="border border-slate-900 p-2 font-bold text-slate-900">${escapeHtml(it.route_description || it.route || '')}</td>
                    <td class="border border-slate-900 p-2 text-center">${escapeHtml(it.cargo_type || q.cargo_type || 'Cont 40HC')}</td>
                    <td class="border border-slate-900 p-2 text-center">${it.estimated_km || 0} km</td>
                    <td class="border border-slate-900 p-2 text-right font-mono font-bold">${new Intl.NumberFormat('vi-VN').format(it.unit_price || 0)} đ</td>
                    <td class="border border-slate-900 p-2 text-center font-semibold">${new Intl.NumberFormat('vi-VN').format(it.expected_trips_monthly || 1)} chuyến</td>
                    <td class="border border-slate-900 p-2 text-right font-black font-mono text-slate-950">${new Intl.NumberFormat('vi-VN').format(lineTotal)} đ</td>
                </tr>
            `;
        }).join('');
    }

    const p3GrandTotal = document.getElementById('print-q3-grand-total');
    if (p3GrandTotal) p3GrandTotal.innerText = `${new Intl.NumberFormat('vi-VN').format(grandTotal)} VNĐ`;

    const p3Words = document.getElementById('print-q3-words');
    if (p3Words) p3Words.innerText = amountInWords;

    const p3FuelBox = document.getElementById('print-q3-fuel-box');
    if (p3FuelBox) {
        if (isFuelAdjusted) {
            p3FuelBox.classList.remove('hidden');
            const descEl = document.getElementById('print-q3-fuel-desc');
            if (descEl) descEl.innerText = `${formulaText} Ví dụ: ${surcharge.fuelExample}`;
        } else {
            p3FuelBox.classList.add('hidden');
        }
    }

    const p3Notes = document.getElementById('print-q3-notes');
    if (p3Notes) p3Notes.innerText = notesText;

    const p3SignDate = document.getElementById('print-q3-sign-date');
    if (p3SignDate) p3SignDate.innerText = datePlaceStr;

    // Đồng bộ thông tin công ty hệ thống lên mẫu in
    syncCompanyProfileToPrintForms();

    switchQuotationPrintTemplate(selectedTemplate);

    // Mở View Toàn Màn Hình view-quotation-print (không dùng modal popup)
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden-view'));
    const printView = document.getElementById('view-quotation-print');
    if (printView) {
        printView.classList.remove('hidden-view');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    setTopbarFullpageMode({
        backFn: closeQuotationPrintModal,
        prefix: 'Sale & Booking',
        title: 'Bản In Báo Giá',
        subText: '',
        badgesHtml: '',
        actionsHtml: ''
    });

    const modal = document.getElementById('modal-quotation-print');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function closeQuotationPrintModal() {
    const printView = document.getElementById('view-quotation-print');
    if (printView) printView.classList.add('hidden-view');

    const modal = document.getElementById('modal-quotation-print');
    if (modal) {
        modal.classList.add('hidden');
    }

    // Khôi phục view trước đó
    if (previousViewBeforeQuotationPrint === 'view-quotation-detail') {
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden-view'));
        const detailView = document.getElementById('view-quotation-detail');
        if (detailView) detailView.classList.remove('hidden-view');
        
        const quoteId = document.getElementById('fullpage-quote-id')?.value;
        const quoteCode = document.getElementById('fullpage-quote-code')?.innerText || '';
        setTopbarFullpageMode({
            backFn: backToQuotations,
            prefix: 'Sale & Booking',
            title: quoteId ? `Báo Giá | ${quoteCode || ('BG-' + quoteId)}` : 'Tạo Mới Báo Giá',
            subText: '',
            badgesHtml: '',
            actionsHtml: ''
        });
    } else {
        resetTopbarStandardMode('kinh-doanh');
        switchTab('kinh-doanh', true);
        if (typeof switchSalesSubtab === 'function') switchSalesSubtab('quotations');
    }
}

function switchQuotationPrintTemplate(templateType) {
    const tplStandard = document.getElementById('quote-tpl-standard');
    const tplMatrix = document.getElementById('quote-tpl-matrix');
    const tplProject = document.getElementById('quote-tpl-project') || document.getElementById('quote-tpl-detail');

    if (tplStandard) tplStandard.classList.add('hidden');
    if (tplMatrix) tplMatrix.classList.add('hidden');
    if (tplProject) tplProject.classList.add('hidden');

    if (templateType === 'TABLE_MATRIX') {
        if (tplMatrix) tplMatrix.classList.remove('hidden');
    } else if (templateType === 'PROJECT_DETAIL') {
        if (tplProject) tplProject.classList.remove('hidden');
    } else {
        if (tplStandard) tplStandard.classList.remove('hidden');
    }
}

function printQuotationVoucher() {
    if (typeof setDynamicPrintPageStyle === 'function') {
        setDynamicPrintPageStyle('@page { size: A4 portrait; margin: 10mm 12mm 10mm 12mm; }');
    }
    document.body.classList.add('is-printing-quotation');
    document.body.classList.remove('is-printing-voucher', 'is-printing-report');
    setTimeout(() => {
        window.print();
        setTimeout(() => {
            document.body.classList.remove('is-printing-quotation');
        }, 800);
    }, 60);
}

window.addEventListener('afterprint', () => {
    document.body.classList.remove('is-printing-quotation', 'is-printing-voucher', 'is-printing-report');
});

function printQuotationFromModal() {
    const id = document.getElementById('quote-id')?.value;
    const custSelect = document.getElementById('quote-customer');
    const customer = custSelect ? (custSelect.options[custSelect.selectedIndex]?.text || '') : '';
    const pricingMethod = document.getElementById('quote-pricing-method')?.value || 'MULTI_ROUTE';
    const baseFuelPrice = parseNumberVN(document.getElementById('quote-base-fuel-price')?.value) || 21000;
    const fuelStep = parseNumberVN(document.getElementById('quote-fuel-step')?.value) || 1000;
    const fuelRatio = parseFloat(document.getElementById('quote-fuel-ratio')?.value) || 3.5;
    const templateType = document.getElementById('quote-template-type')?.value || 'STANDARD';
    const cargoType = document.getElementById('quote-cargo-type')?.value || 'Container 40HC / Hàng tổng hợp';
    const contactPerson = document.getElementById('quote-contact-person')?.value || '';
    const contactPhone = document.getElementById('quote-contact-phone')?.value || '';
    const contactEmail = document.getElementById('quote-contact-email')?.value || '';
    const validUntil = document.getElementById('quote-valid-until')?.value || '';
    const notes = document.getElementById('quote-notes')?.value || '';

    // Thu thập danh sách items từ các hàng đang nhập
    const rows = Array.from(document.querySelectorAll('#quote-routes-tbody tr.quote-route-item-row'));
    const items = [];
    rows.forEach(row => {
        const route = row.querySelector('.quote-item-route')?.value?.trim();
        const cargo = row.querySelector('.quote-item-cargo')?.value || cargoType;
        const km = parseInt(row.querySelector('.quote-item-km')?.value) || 0;
        const price = parseNumberVN(row.querySelector('.quote-item-price')?.value) || 0;
        const trips = parseNumberVN(row.querySelector('.quote-item-trips')?.value) || 1;

        if (route) {
            items.push({
                route_description: route,
                cargo_type: cargo,
                estimated_km: km,
                unit_price: price,
                expected_trips_monthly: trips
            });
        }
    });

    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const defaultDraftCode = `BG.${yy}${mm}.${String(id || 1).padStart(3, '0')}`;

    const quoteData = {
        id: id,
        quotation_code: id ? defaultDraftCode : 'BG.DRAFT',
        customer_name: customer.replace(/^[^-]+-\s*/, '').trim(),
        pricing_method: pricingMethod,
        base_fuel_price: baseFuelPrice,
        fuel_step_vnd: fuelStep,
        fuel_ratio_percent: fuelRatio,
        fuel_surcharge_formula: `Mỗi khi giá dầu DO 0.05S Petrolimex thay đổi ${new Intl.NumberFormat('vi-VN').format(fuelStep)} đ/lít so với giá cơ sở (${new Intl.NumberFormat('vi-VN').format(baseFuelPrice)} đ), đơn giá cước vận chuyển sẽ điều chỉnh tăng/giảm tương ứng ${fuelRatio}%.`,
        template_type: templateType,
        cargo_type: cargoType,
        contact_person: contactPerson,
        contact_phone: contactPhone,
        contact_email: contactEmail,
        valid_until: validUntil,
        notes: notes,
        items: items
    };

    openQuotationPrintModal(quoteData, templateType);
}


async function deleteQuotation(quoteId) {
    const confirmed = await showConfirmModal({
        title: 'Xóa Báo Giá',
        message: 'Bạn có chắc chắn muốn xóa báo giá này không?\n\nDữ liệu lịch sử sẽ được bảo lưu an toàn (Soft-Delete).',
        confirmText: 'Xác Nhận Xóa',
        cancelText: 'Huỷ bỏ',
        type: 'danger',
        icon: 'ph-bold ph-trash text-2xl'
    });
    if (!confirmed) return;
    try {
        const res = await fetchWithAuth(`/api/quotations/${quoteId}/`, {
            method: 'DELETE'
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || data.error || data.detail || 'Lỗi xóa báo giá');

        showToast('success', data.message || 'Đã xóa báo giá', 'Thành Công');
        loadSalesData();
    } catch (err) {
        console.error('Error deleting quotation:', err);
        showToast('error', err.message || 'Lỗi xóa báo giá', 'Lỗi');
    }
}

// Gắn toàn bộ hàm quản lý Báo giá lên window để đảm bảo inline onclick luôn hoạt động 100%
window.onQuotationPricingMethodChange = onQuotationPricingMethodChange;
window.updateFuelFormulaText = updateFuelFormulaText;
window.addQuotationRouteRow = addQuotationRouteRow;
window.removeQuotationRouteRow = removeQuotationRouteRow;
window.calculateQuotationItemsTotal = calculateQuotationItemsTotal;
window.setQuickQuoteNote = setQuickQuoteNote;
window.toggleQuoteNotesExpand = toggleQuoteNotesExpand;
window.openModalQuotation = openModalQuotation;
window.closeModalQuotation = () => closeModal('modal-quotation');
window.saveQuotation = saveQuotation;
window.submitQuotation = saveQuotation;
window.editQuotation = (quoteId) => openModalQuotation(quoteId, false);
window.deleteQuotation = deleteQuotation;
window.printQuotationFromModal = printQuotationFromModal;
window.printQuotationVoucher = printQuotationVoucher;
function editQuotationFromPrint() {
    const q = currentPrintingQuotation;
    closeQuotationPrintModal();
    if (q && (q.hashid || q.id)) {
        viewQuotationDetail(q.hashid || q.id);
    }
}
window.editQuotationFromPrint = editQuotationFromPrint;
window.openQuotationPrintModal = openQuotationPrintModal;
window.closeQuotationPrintModal = closeQuotationPrintModal;
window.switchQuotationPrintTemplate = switchQuotationPrintTemplate;

// Các hàm cho trang riêng Báo giá
window.openCreateQuotationPage = openCreateQuotationPage;
window.viewQuotationDetail = viewQuotationDetail;
window.backToQuotations = backToQuotations;
window.addFullpageQuotationRouteRow = addFullpageQuotationRouteRow;
window.removeFullpageQuotationRouteRow = removeFullpageQuotationRouteRow;
window.calculateFullpageQuotationItemsTotal = calculateFullpageQuotationItemsTotal;
window.onFullpageQuotationPricingMethodChange = onFullpageQuotationPricingMethodChange;
window.updateFullpageFuelFormulaText = updateFullpageFuelFormulaText;
window.setFullpageQuickQuoteNote = setFullpageQuickQuoteNote;
window.printQuotationFromFullPage = printQuotationFromFullPage;
window.saveFullpageQuotation = saveFullpageQuotation;
