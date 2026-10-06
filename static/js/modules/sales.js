/**
 * BIM LOGISTICS — MODULE KINH DOANH, BÁO GIÁ CRM & BOOKINGS CRUD (SALES)
 */

// --- 8. SALE & BÁO GIÁ CRM & BOOKINGS CRUD ---
function onQuotationPricingMethodChange(method) {
    const fuelBox = document.getElementById('quote-fuel-adjustment-box');
    if (fuelBox) {
        if (method === 'FUEL_ADJUSTED') {
            fuelBox.classList.remove('hidden');
            updateFuelFormulaText();
        } else {
            fuelBox.classList.add('hidden');
        }
    }
}

function updateFuelFormulaText() {
    const basePrice = parseNumberVN(document.getElementById('quote-base-fuel-price')?.value) || 21000;
    const step = parseNumberVN(document.getElementById('quote-fuel-step')?.value) || 1000;
    const ratio = parseFloat(document.getElementById('quote-fuel-ratio')?.value) || 3.5;
    const formulaEl = document.getElementById('quote-fuel-formula-display');
    if (formulaEl) {
        formulaEl.innerText = `Mỗi khi giá dầu DO 0.05S Petrolimex thay đổi ${new Intl.NumberFormat('vi-VN').format(step)} đ/lít so với giá cơ sở (${new Intl.NumberFormat('vi-VN').format(basePrice)} đ), đơn giá cước vận chuyển sẽ điều chỉnh tăng/giảm tương ứng ${ratio}%.`;
    }
}

function addQuotationRouteRow(data = {}) {
    const tbody = document.getElementById('quote-routes-tbody');
    if (!tbody) return;

    const rowIdx = tbody.children.length + 1;
    const routeDesc = data.route_description || data.route || '';
    const cargoType = data.cargo_type || document.getElementById('quote-cargo-type')?.value || 'Cont 40HC';
    const estKm = data.estimated_km !== undefined ? data.estimated_km : 30;
    const unitPrice = data.unit_price !== undefined ? data.unit_price : 3800000;
    const trips = data.expected_trips_monthly !== undefined ? data.expected_trips_monthly : (data.monthly_trips || 20);
    const lineTotal = Number(unitPrice) * Number(trips);

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50/80 transition-colors quote-route-item-row';
    tr.innerHTML = `
        <td class="p-2 text-center font-bold text-slate-500 row-stt">${rowIdx}</td>
        <td class="p-2">
            <input type="text" value="${escapeHtml(routeDesc)}" placeholder="VD: CÁT LÁI ➔ KCN VSIP 2 BÌNH DƯƠNG" required
                class="quote-item-route w-full h-8 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-teal-600 font-bold text-slate-900 text-xs">
        </td>
        <td class="p-2">
            <select class="quote-item-cargo w-full h-8 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:border-teal-600">
                <option value="Cont 40HC" ${cargoType === 'Cont 40HC' ? 'selected' : ''}>Cont 40HC</option>
                <option value="Cont 20GP" ${cargoType === 'Cont 20GP' ? 'selected' : ''}>Cont 20GP</option>
                <option value="Cont 45ft" ${cargoType === 'Cont 45ft' ? 'selected' : ''}>Cont 45ft</option>
                <option value="Cont Flatrack / Lạnh" ${cargoType.includes('Flatrack') ? 'selected' : ''}>Cont Flatrack/RF</option>
                <option value="Xe tải 5 tấn" ${cargoType.includes('5 tấn') ? 'selected' : ''}>Xe tải 5T</option>
                <option value="Xe tải 10 tấn" ${cargoType.includes('10 tấn') ? 'selected' : ''}>Xe tải 10T</option>
                <option value="Xe tải 15 tấn" ${cargoType.includes('15 tấn') ? 'selected' : ''}>Xe tải 15T</option>
                <option value="Hàng rời / FTL" ${cargoType.includes('Hàng rời') ? 'selected' : ''}>Hàng rời / FTL</option>
            </select>
        </td>
        <td class="p-2 text-center">
            <input type="number" step="10" min="0" value="${estKm}" 
                class="quote-item-km w-16 h-8 px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-teal-600 font-bold text-slate-800 text-xs text-center tabular-nums">
        </td>
        <td class="p-2 text-right">
            <input type="text" inputmode="numeric" value="${formatNumberVN(unitPrice)}" oninput="calculateQuotationItemsTotal()" placeholder="0"
                class="quote-item-price input-number-vn w-28 h-8 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-teal-600 font-mono font-bold text-teal-800 text-xs text-right tabular-nums">
        </td>
        <td class="p-2 text-center">
            <input type="text" inputmode="numeric" value="${formatNumberVN(trips)}" oninput="calculateQuotationItemsTotal()" placeholder="1"
                class="quote-item-trips input-number-vn w-20 h-8 px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-teal-600 font-mono font-bold text-slate-800 text-xs text-center tabular-nums">
        </td>
        <td class="p-2 text-right font-black text-teal-900 font-mono tabular-nums quote-item-line-total text-xs">
            ${new Intl.NumberFormat('vi-VN').format(lineTotal)} đ
        </td>
        <td class="p-2 text-center">
            <button type="button" onclick="removeQuotationRouteRow(this)" title="Xóa tuyến này"
                class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer">
                <i class="ph-bold ph-trash text-sm"></i>
            </button>
        </td>
    `;
    tbody.appendChild(tr);

    const priceInput = tr.querySelector('.quote-item-price');
    const tripsInput = tr.querySelector('.quote-item-trips');
    if (priceInput) attachAutoNumberFormat(priceInput, () => calculateQuotationItemsTotal());
    if (tripsInput) attachAutoNumberFormat(tripsInput, () => calculateQuotationItemsTotal());

    calculateQuotationItemsTotal();
}

function removeQuotationRouteRow(button) {
    const tbody = document.getElementById('quote-routes-tbody');
    if (!tbody) return;
    const tr = button.closest('tr');
    if (tr) tr.remove();

    if (tbody.children.length === 0) {
        addQuotationRouteRow({ route_description: '', unit_price: 3800000, expected_trips_monthly: 10 });
    } else {
        Array.from(tbody.children).forEach((row, idx) => {
            const sttEl = row.querySelector('.row-stt');
            if (sttEl) sttEl.innerText = idx + 1;
        });
        calculateQuotationItemsTotal();
    }
}

function calculateQuotationItemsTotal() {
    const tbody = document.getElementById('quote-routes-tbody');
    if (!tbody) return;

    let totalRevenue = 0;
    let totalTrips = 0;
    const rows = Array.from(tbody.querySelectorAll('tr.quote-route-item-row'));

    rows.forEach(row => {
        const priceInput = row.querySelector('.quote-item-price');
        const tripsInput = row.querySelector('.quote-item-trips');
        const lineTotalEl = row.querySelector('.quote-item-line-total');

        const price = parseNumberVN(priceInput?.value) || 0;
        const trips = parseNumberVN(tripsInput?.value) || 0;
        const lineTotal = price * trips;

        if (lineTotalEl) {
            lineTotalEl.innerText = `${new Intl.NumberFormat('vi-VN').format(lineTotal)} đ`;
        }
        totalRevenue += lineTotal;
        totalTrips += trips;
    });

    const badgeEl = document.getElementById('quote-routes-count-badge');
    if (badgeEl) badgeEl.innerText = `${rows.length} tuyến`;

    const tripsLabel = document.getElementById('quote-total-monthly-trips-label');
    if (tripsLabel) tripsLabel.innerText = `${new Intl.NumberFormat('vi-VN').format(totalTrips)} chuyến/tháng`;

    const revEl = document.getElementById('quote-preview-revenue');
    if (revEl) {
        revEl.innerText = `${new Intl.NumberFormat('vi-VN').format(totalRevenue)} đ`;
    }
}

const DEFAULT_QUOTATION_NOTES = {
    fcl: `- Đơn giá trên chưa bao gồm thuế giá trị gia tăng VAT (8% / 10%).
- Chưa bao gồm phí bốc xếp hàng hóa & phí nâng hạ tại kho của Quý khách.
- Xe vận tải đúng tải trọng, tuân thủ nghiêm ngặt Luật Giao thông đường bộ.
- Thời gian neo xe: Miễn phí 12 giờ đầu kể từ khi xe đến kho; Phí neo tính sau 12h: Neo xe đầu kéo 1.500.000 VNĐ/đêm, Neo Mooc 1.000.000 VNĐ/đêm.
- Phía Triền Võ Logistics chịu toàn bộ chi phí nhiên liệu, lương lái xe và vé cầu đường BOT.
- Rất mong nhận được sự hợp tác lâu dài từ Quý Công ty.`,

    ftl: `- Đơn giá trên chưa bao gồm thuế giá trị gia tăng VAT và không bao gồm bốc xếp.
- Xe vận tải cam kết đi đúng tải trọng quy định pháp luật.
- Phía công ty thuê vận chuyển chịu cung cấp đầy đủ hóa đơn, chứng từ hợp pháp của hàng hóa.
- Phía TVL chịu toàn bộ chi phí nhiên liệu, lương tài xế, phí bảo trì phương tiện và vé BOT.
- Rất mong sự hợp tác từ Quý Công ty!`,

    fuel: `- Đơn giá trên chưa bao gồm thuế VAT.
- Phí bốc xếp tại kho do khách hàng chịu trách nhiệm.
- Đơn giá áp dụng theo mức giá dầu Diesel cơ sở tại thời điểm báo giá.
- Khi giá dầu thị trường biến động theo từng bước quy định, hai bên sẽ điều chỉnh đơn giá cước tương ứng.
- Phí Neo tính sau 12h kể từ khi xe đến kho: Neo xe: 1.500.000 VNĐ/đêm, Neo Mooc: 1.000.000 VNĐ/đêm.
- Hotline hỗ trợ 24/7: 0965 559 561 (Phòng Kinh Doanh).`
};

function setQuickQuoteNote(type) {
    const noteEl = document.getElementById('quote-notes');
    if (noteEl && DEFAULT_QUOTATION_NOTES[type]) {
        noteEl.value = DEFAULT_QUOTATION_NOTES[type];
    }
}

async function openModalQuotation(quoteId = null, isReadOnly = false) {
    await loadMasterDataFormOptions();
    populateMasterDataDropdowns();

    const form = document.getElementById('form-quotation');
    if (form) {
        form.reset();
        form.querySelectorAll('input, select, textarea').forEach(el => el.disabled = isReadOnly);
    }

    const titleEl = document.getElementById('modal-quotation-title');
    const submitBtn = document.getElementById('btn-submit-quote');
    const btnText = document.getElementById('btn-save-quote-text');
    const idInput = document.getElementById('quote-id');
    const routesTbody = document.getElementById('quote-routes-tbody');
    if (routesTbody) routesTbody.innerHTML = '';

    if (submitBtn) {
        submitBtn.style.display = isReadOnly ? 'none' : 'inline-flex';
    }

    if (!quoteId) {
        if (idInput) idInput.value = '';
        if (titleEl) titleEl.innerText = 'Thêm Báo Giá Tuyến Cước Mới';
        if (btnText) btnText.innerText = 'Lưu Báo Giá';

        const methodEl = document.getElementById('quote-pricing-method');
        if (methodEl) methodEl.value = 'MULTI_ROUTE';
        const p0Input = document.getElementById('quote-base-fuel-price');
        if (p0Input) p0Input.value = formatNumberVN(21000);
        const stepInput = document.getElementById('quote-fuel-step');
        if (stepInput) stepInput.value = formatNumberVN(1000);
        const ratioInput = document.getElementById('quote-fuel-ratio');
        if (ratioInput) ratioInput.value = '3.5';

        const tplEl = document.getElementById('quote-template-type');
        if (tplEl) tplEl.value = 'STANDARD';
        const cargoEl = document.getElementById('quote-cargo-type');
        if (cargoEl) cargoEl.value = 'Container 40HC / Hàng tổng hợp';
        const notesEl = document.getElementById('quote-notes');
        if (notesEl) notesEl.value = DEFAULT_QUOTATION_NOTES.fcl;

        onQuotationPricingMethodChange('MULTI_ROUTE');

        // Mặc định thêm 1 dòng mẫu
        addQuotationRouteRow({
            route_description: 'CÁT LÁI ➔ KCN VSIP 2 BÌNH DƯƠNG',
            cargo_type: 'Cont 40HC',
            estimated_km: 30,
            unit_price: 3800000,
            expected_trips_monthly: 20
        });
    } else {
        if (idInput) idInput.value = quoteId;
        if (titleEl) titleEl.innerText = isReadOnly ? 'Đang tải chi tiết báo giá...' : 'Đang tải thông tin báo giá...';
        if (btnText) btnText.innerText = 'Cập Nhật Báo Giá';

        try {
            const res = await fetchWithAuth(`/api/quotations/${quoteId}/`);
            if (!res.ok) throw new Error('Không thể tải báo giá');
            const q = await res.json();

            if (titleEl) {
                titleEl.innerText = isReadOnly 
                    ? `Chi Tiết Báo Giá [${q.quotation_code}]` 
                    : `Hiệu Chỉnh Báo Giá [${q.quotation_code}]`;
            }
            const custEl = document.getElementById('quote-customer');
            if (custEl) setSelectValueCaseInsensitive(custEl, q.customer_name);

            const methodEl = document.getElementById('quote-pricing-method');
            if (methodEl) methodEl.value = q.pricing_method || 'MULTI_ROUTE';

            const p0Input = document.getElementById('quote-base-fuel-price');
            if (p0Input) p0Input.value = formatNumberVN(q.base_fuel_price || 21000);
            const stepInput = document.getElementById('quote-fuel-step');
            if (stepInput) stepInput.value = formatNumberVN(q.fuel_step_vnd || 1000);
            const ratioInput = document.getElementById('quote-fuel-ratio');
            if (ratioInput) ratioInput.value = q.fuel_ratio_percent || 3.5;

            onQuotationPricingMethodChange(q.pricing_method || 'MULTI_ROUTE');

            const statusEl = document.getElementById('quote-status');
            if (statusEl) statusEl.value = q.status;
            const tplEl = document.getElementById('quote-template-type');
            if (tplEl) tplEl.value = q.template_type || 'STANDARD';
            const cargoEl = document.getElementById('quote-cargo-type');
            if (cargoEl) cargoEl.value = q.cargo_type || 'Container 40HC / Hàng tổng hợp';
            const contactPersonEl = document.getElementById('quote-contact-person');
            if (contactPersonEl) contactPersonEl.value = q.contact_person || '';
            const contactPhoneEl = document.getElementById('quote-contact-phone');
            if (contactPhoneEl) contactPhoneEl.value = q.contact_phone || '';
            const contactEmailEl = document.getElementById('quote-contact-email');
            if (contactEmailEl) contactEmailEl.value = q.contact_email || '';
            const validUntilEl = document.getElementById('quote-valid-until');
            if (validUntilEl) validUntilEl.value = q.valid_until || '';
            const notesEl = document.getElementById('quote-notes');
            if (notesEl) notesEl.value = q.notes || DEFAULT_QUOTATION_NOTES.fcl;

            if (q.items && q.items.length > 0) {
                q.items.forEach(it => addQuotationRouteRow(it));
            } else {
                addQuotationRouteRow({
                    route_description: q.route_description,
                    cargo_type: q.cargo_type || 'Cont 40HC',
                    estimated_km: q.estimated_km || 30,
                    unit_price: q.unit_price || 3800000,
                    expected_trips_monthly: q.expected_trips_monthly || 10
                });
            }

            if (isReadOnly && form) {
                form.querySelectorAll('input, select, textarea, button').forEach(el => {
                    if (el.id !== 'btn-print-quote-modal' && !el.getAttribute('onclick')?.includes('closeModal') && !el.getAttribute('onclick')?.includes('printQuotation')) {
                        el.disabled = true;
                    }
                });
            }
        } catch (err) {
            console.error('Lỗi tải chi tiết báo giá:', err);
            showToast('error', 'Không thể tải thông tin báo giá để xem/chỉnh sửa', 'Lỗi');
            return;
        }
    }

    initAllNumberInputs();
    openModal('modal-quotation');
}

async function saveQuotation(e) {
    if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
    }
    const id = document.getElementById('quote-id')?.value;
    const customer = document.getElementById('quote-customer')?.value?.trim();
    const pricingMethod = document.getElementById('quote-pricing-method')?.value || 'MULTI_ROUTE';
    const baseFuelPrice = parseNumberVN(document.getElementById('quote-base-fuel-price')?.value) || 21000;
    const fuelStep = parseNumberVN(document.getElementById('quote-fuel-step')?.value) || 1000;
    const fuelRatio = parseFloat(document.getElementById('quote-fuel-ratio')?.value) || 3.5;
    const statusVal = document.getElementById('quote-status')?.value || 'NEGOTIATING';
    const templateType = document.getElementById('quote-template-type')?.value || 'STANDARD';
    const cargoType = document.getElementById('quote-cargo-type')?.value || 'Container 40HC / Hàng tổng hợp';
    const contactPerson = document.getElementById('quote-contact-person')?.value?.trim() || '';
    const contactPhone = document.getElementById('quote-contact-phone')?.value?.trim() || '';
    const contactEmail = document.getElementById('quote-contact-email')?.value?.trim() || '';
    const validUntil = document.getElementById('quote-valid-until')?.value || '';
    const notes = document.getElementById('quote-notes')?.value || '';

    if (!customer) {
        showToast('warning', 'Vui lòng chọn khách hàng hợp lệ trong danh mục!', 'Thiếu Thông Tin');
        return;
    }

    // Thu thập danh sách các dòng tuyến đường
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

    if (items.length === 0) {
        showToast('warning', 'Vui lòng nhập ít nhất 1 tuyến đường báo giá hợp lệ!', 'Thiếu Thông Tin');
        return;
    }

    const submitBtn = document.getElementById('btn-submit-quote');
    const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="ph-bold ph-spinner animate-spin text-base"></i> <span>Đang lưu...</span>';
    }

    try {
        let res;
        const payload = {
            customer: customer,
            pricing_method: pricingMethod,
            base_fuel_price: baseFuelPrice,
            fuel_step_vnd: fuelStep,
            fuel_ratio_percent: fuelRatio,
            status: statusVal,
            template_type: templateType,
            cargo_type: cargoType,
            contact_person: contactPerson,
            contact_phone: contactPhone,
            contact_email: contactEmail,
            valid_until: validUntil,
            notes: notes,
            items: items,
            // Fallback fields
            route_description: items[0].route_description,
            unit_price: items[0].unit_price,
            expected_trips_monthly: items[0].expected_trips_monthly,
            monthly_trips: items[0].expected_trips_monthly,
            estimated_km: items[0].estimated_km
        };

        if (id) {
            res = await fetchWithAuth(`/api/quotations/${id}/`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
        } else {
            payload.action = 'create_quotation';
            res = await fetchWithAuth('/api/sales/', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        }

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || data.error || data.detail || 'Lỗi lưu báo giá');

        showToast('success', data.message || 'Lưu báo giá thành công!', 'Thành Công');
        closeModal('modal-quotation');
        loadSalesData();
    } catch (err) {
        console.error('Error saving quotation:', err);
        showToast('error', err.message || 'Không thể lưu báo giá', 'Lỗi');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHtml;
        }
    }
}

let currentPrintingQuotation = null;

async function openQuotationPrintModal(quoteIdOrData, templateType = null) {
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
    const notesText = q.notes || DEFAULT_QUOTATION_NOTES.fcl;

    const now = new Date();
    const datePlaceStr = `Tp. Hồ Chí Minh, ngày ${String(now.getDate()).padStart(2, '0')} tháng ${String(now.getMonth() + 1).padStart(2, '0')} năm ${now.getFullYear()}`;

    const isFuelAdjusted = (q.pricing_method === 'FUEL_ADJUSTED') || Boolean(q.base_fuel_price && q.pricing_method === 'FUEL_ADJUSTED');
    const p0Val = Number(q.base_fuel_price || 21000);
    const stepVal = Number(q.fuel_step_vnd || 1000);
    const ratioVal = Number(q.fuel_ratio_percent || 3.5);
    const formulaText = q.fuel_surcharge_formula || `Mỗi khi giá dầu DO 0.05S Petrolimex thay đổi ${new Intl.NumberFormat('vi-VN').format(stepVal)} đ/lít so với giá cơ sở (${new Intl.NumberFormat('vi-VN').format(p0Val)} đ), đơn giá cước vận chuyển sẽ điều chỉnh tăng/giảm tương ứng ${ratioVal}%.`;

    // 1. Điền dữ liệu MẪU 1: STANDARD (TVL Tiêu Chuẩn)
    const p1DatePlace = document.getElementById('print-q1-date-place');
    if (p1DatePlace) p1DatePlace.innerText = datePlaceStr;

    const p1CodeSub = document.getElementById('print-q1-code-sub');
    if (p1CodeSub) p1CodeSub.innerText = `Số: ${q.quotation_code || q.code || 'BG'}`;

    const p1CustName = document.getElementById('print-q1-customer-name');
    if (p1CustName) p1CustName.innerText = q.customer_name || q.customer || 'QUÝ KHÁCH HÀNG';

    const p1Contact = document.getElementById('print-q1-contact-person');
    if (p1Contact) p1Contact.innerText = q.contact_person || q.customer_contact || 'Phòng Xuất Nhập Khẩu / Logistics';

    const p1Phone = document.getElementById('print-q1-contact-phone');
    if (p1Phone) p1Phone.innerText = q.contact_phone || q.customer_phone || '0965 559 561';

    const p1Address = document.getElementById('print-q1-customer-address');
    if (p1Address) p1Address.innerText = q.customer_address || 'Địa chỉ kho khách hàng';

    const p1Tax = document.getElementById('print-q1-tax-code');
    if (p1Tax) p1Tax.innerText = q.customer_tax_code || 'Chưa cập nhật';

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
            if (ratioEl) ratioEl.innerText = `±${ratioVal}% cước`;
            const formEl = document.getElementById('print-q1-fuel-formula');
            if (formEl) formEl.innerText = formulaText;
        } else {
            p1FuelBox.classList.add('hidden');
        }
    }

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
            if (descEl) descEl.innerText = formulaText;
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
    if (p3Code) p3Code.innerText = `Số: ${q.quotation_code || q.code || ''}`;

    const p3Cust = document.getElementById('print-q3-customer');
    if (p3Cust) p3Cust.innerText = q.customer_name || q.customer || '';

    const p3Tbody = document.getElementById('print-q3-tbody');
    if (p3Tbody) {
        p3Tbody.innerHTML = items.map((it, idx) => {
            const lineTotal = Number(it.unit_price || 0) * Number(it.expected_trips_monthly || 1);
            return `
                <tr>
                    <td class="border border-slate-300 p-2 text-center">${idx + 1}</td>
                    <td class="border border-slate-300 p-2 font-bold">${escapeHtml(it.route_description || it.route || '')}</td>
                    <td class="border border-slate-300 p-2 text-center">${escapeHtml(it.cargo_type || q.cargo_type || 'Cont 40HC')}</td>
                    <td class="border border-slate-300 p-2 text-center font-semibold">${new Intl.NumberFormat('vi-VN').format(it.expected_trips_monthly || 1)} chuyến</td>
                    <td class="border border-slate-300 p-2 text-right font-mono">${new Intl.NumberFormat('vi-VN').format(it.unit_price || 0)} đ</td>
                    <td class="border border-slate-300 p-2 text-right font-black font-mono">${new Intl.NumberFormat('vi-VN').format(lineTotal)} đ</td>
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
            if (descEl) descEl.innerText = formulaText;
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

    const modal = document.getElementById('modal-quotation-print');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeQuotationPrintModal() {
    const modal = document.getElementById('modal-quotation-print');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function switchQuotationPrintTemplate(templateType) {
    const tplStandard = document.getElementById('quote-tpl-standard');
    const tplMatrix = document.getElementById('quote-tpl-matrix');
    const tplDetail = document.getElementById('quote-tpl-detail');

    if (tplStandard) tplStandard.classList.add('hidden');
    if (tplMatrix) tplMatrix.classList.add('hidden');
    if (tplDetail) tplDetail.classList.add('hidden');

    if (templateType === 'TABLE_MATRIX') {
        if (tplMatrix) tplMatrix.classList.remove('hidden');
    } else if (templateType === 'PROJECT_DETAIL') {
        if (tplDetail) tplDetail.classList.remove('hidden');
    } else {
        if (tplStandard) tplStandard.classList.remove('hidden');
    }
}

function printQuotationVoucher() {
    if (typeof setDynamicPrintPageStyle === 'function') {
        setDynamicPrintPageStyle('@page { size: A4 portrait; margin: 6mm 8mm; }');
    }
    document.body.classList.add('is-printing-quotation');
    document.body.classList.remove('is-printing-voucher', 'is-printing-report');
    window.print();
}

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

async function changeQuotationStatus(quoteId, newStatus) {
    if (!newStatus) return;
    try {
        const res = await fetchWithAuth(`/api/quotations/${quoteId}/status/`, {
            method: 'PATCH',
            body: JSON.stringify({ status: newStatus })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || data.error || data.detail || 'Lỗi chuyển trạng thái');

        showToast('success', data.message || 'Đã cập nhật trạng thái báo giá', 'Thành Công');
        loadSalesData();
    } catch (err) {
        console.error('Error updating quotation status:', err);
        showToast('error', err.message || 'Lỗi đổi trạng thái', 'Lỗi');
    }
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
window.openModalQuotation = openModalQuotation;
window.closeModalQuotation = () => closeModal('modal-quotation');
window.saveQuotation = saveQuotation;
window.submitQuotation = saveQuotation;
window.editQuotation = (quoteId) => openModalQuotation(quoteId, false);
window.deleteQuotation = deleteQuotation;
window.changeQuotationStatus = changeQuotationStatus;
window.printQuotationFromModal = printQuotationFromModal;
window.printQuotationVoucher = printQuotationVoucher;
window.openQuotationPrintModal = openQuotationPrintModal;
window.closeQuotationPrintModal = closeQuotationPrintModal;
window.switchQuotationPrintTemplate = switchQuotationPrintTemplate;

function onBookingTypeChange() {
    const type = document.getElementById('booking-type')?.value;
    const shipInput = document.getElementById('booking-shipping-line');
    const pickupInput = document.getElementById('booking-pickup');
    const dropoffInput = document.getElementById('booking-dropoff');

    if (type === 'DOMESTIC') {
        if (shipInput && !shipInput.value) shipInput.value = 'NỘI ĐỊA';
        if (pickupInput && !pickupInput.value) pickupInput.placeholder = 'Kho bốc / Nhà máy A...';
        if (dropoffInput && !dropoffInput.value) dropoffInput.placeholder = 'Kho dỡ / Điểm giao B...';
    } else if (type === 'EXPORT_FCL') {
        if (shipInput && shipInput.value === 'NỘI ĐỊA') shipInput.value = '';
        if (pickupInput) pickupInput.placeholder = 'VD: Bãi cấp rỗng Solog, Sowatco...';
        if (dropoffInput) dropoffInput.placeholder = 'VD: Cảng Gemalink, Cát Lái...';
    } else if (type === 'IMPORT_FCL') {
        if (shipInput && shipInput.value === 'NỘI ĐỊA') shipInput.value = '';
        if (pickupInput) pickupInput.placeholder = 'VD: Cảng Cát Lái, Cái Mép...';
        if (dropoffInput) dropoffInput.placeholder = 'VD: Bãi trả rỗng Tân Cảng...';
    }
}

async function openModalBooking(bookingId = null, isReadOnly = false) {
    await loadMasterDataFormOptions();
    populateMasterDataDropdowns();

    const form = document.getElementById('form-booking');
    if (form) {
        form.reset();
        form.querySelectorAll('input, select, textarea').forEach(el => el.disabled = isReadOnly);
    }

    const titleEl = document.getElementById('modal-booking-title');
    const submitBtn = document.getElementById('btn-submit-booking');
    const btnText = document.getElementById('btn-save-booking-text');
    const idInput = document.getElementById('booking-id');

    if (submitBtn) {
        submitBtn.style.display = isReadOnly ? 'none' : 'inline-flex';
    }

    const todayStr = new Date().toISOString().split('T')[0];

    if (!bookingId) {
        currentEditingBookingId = null;
        if (idInput) idInput.value = '';
        if (titleEl) titleEl.innerText = 'Tiếp Nhận Đơn Đặt Hàng / Booking Mới Từ Khách Hàng';
        if (btnText) btnText.innerText = 'Tiếp Nhận Đơn Hàng';
        const dateInput = document.getElementById('booking-loading-date');
        if (dateInput) dateInput.value = todayStr;
        const timeInput = document.getElementById('booking-loading-time');
        if (timeInput) timeInput.value = '08:00';
        const closingDateInput = document.getElementById('booking-closing-date');
        if (closingDateInput) closingDateInput.value = todayStr;
        const closingTimeValInput = document.getElementById('booking-closing-time-val');
        if (closingTimeValInput) closingTimeValInput.value = '17:00';
        syncBookingClosingTime();
        const siDateInput = document.getElementById('booking-si-date');
        if (siDateInput) siDateInput.value = todayStr;
        const siTimeValInput = document.getElementById('booking-si-time-val');
        if (siTimeValInput) siTimeValInput.value = '12:00';
        syncBookingSiTime();
        const totalInput = document.getElementById('booking-total-containers');
        if (totalInput) totalInput.value = formatNumberVN(1);
        const detInput = document.getElementById('booking-det');
        if (detInput) detInput.value = formatNumberVN(7);
        const demInput = document.getElementById('booking-dem');
        if (demInput) demInput.value = formatNumberVN(7);
        const priceInput = document.getElementById('booking-price');
        if (priceInput) priceInput.value = formatNumberVN(4000000);
        clearSaleBookingFileSelection();
        onBookingTypeChange();
    } else {
        currentEditingBookingId = bookingId;
        if (idInput) idInput.value = bookingId;
        if (titleEl) titleEl.innerText = isReadOnly ? 'Đang tải chi tiết đơn hàng / booking...' : 'Đang tải thông tin đơn hàng / booking...';
        if (btnText) btnText.innerText = 'Cập Nhật Đơn Hàng';

        try {
            const res = await fetchWithAuth(`/api/bookings/${bookingId}/`);
            if (!res.ok) throw new Error('Không thể tải chi tiết đơn hàng / booking');
            const b = await res.json();

            if (titleEl) {
                titleEl.innerText = isReadOnly 
                    ? `Chi Tiết Đơn Hàng / Booking [${b.booking_code}]` 
                    : `Hiệu Chỉnh Đơn Hàng / Booking [${b.booking_code}]`;
            }
            
            const typeEl = document.getElementById('booking-type');
            if (typeEl) typeEl.value = b.booking_type || 'EXPORT_FCL';
            const custEl = document.getElementById('booking-customer');
            if (custEl) setSelectValueCaseInsensitive(custEl, b.customer_name);
            const numEl = document.getElementById('booking-number');
            if (numEl) numEl.value = b.booking_number || '';
            const shipEl = document.getElementById('booking-shipping-line');
            if (shipEl) shipEl.value = b.shipping_line || '';
            const vesEl = document.getElementById('booking-vessel');
            if (vesEl) vesEl.value = b.vessel_voyage || '';
            const sizeEl = document.getElementById('booking-container-size');
            if (sizeEl) setSelectValueCaseInsensitive(sizeEl, b.container_size || '40HC');
            const totalEl = document.getElementById('booking-total-containers');
            if (totalEl) totalEl.value = formatNumberVN(b.total_containers || 1);
            const comEl = document.getElementById('booking-commodity');
            if (comEl) comEl.value = b.commodity || '';
            const hsEl = document.getElementById('booking-hs-code');
            if (hsEl) hsEl.value = b.hs_code || '';
            const pickEl = document.getElementById('booking-pickup');
            if (pickEl) setSelectValueCaseInsensitive(pickEl, b.pickup_location);
            const delEl = document.getElementById('booking-delivery');
            if (delEl) setSelectValueCaseInsensitive(delEl, b.delivery_location);
            const dropEl = document.getElementById('booking-dropoff');
            if (dropEl) setSelectValueCaseInsensitive(dropEl, b.dropoff_location);
            const dateEl = document.getElementById('booking-loading-date');
            if (dateEl) dateEl.value = b.loading_date || todayStr;
            const timeEl = document.getElementById('booking-loading-time');
            if (timeEl) timeEl.value = b.loading_time || '08:00';
            parseAndSetDateTimeFields(b.closing_time, 'booking-closing-date', 'booking-closing-time-val', 'booking-closing-time', '17:00');
            parseAndSetDateTimeFields(b.si_cutoff, 'booking-si-date', 'booking-si-time-val', 'booking-si-cutoff', '12:00');
            const detEl = document.getElementById('booking-det');
            if (detEl) detEl.value = formatNumberVN(b.free_time_detention ?? 7);
            const demEl = document.getElementById('booking-dem');
            if (demEl) demEl.value = formatNumberVN(b.free_time_demurrage ?? 7);
            const priceEl = document.getElementById('booking-price');
            if (priceEl) priceEl.value = formatNumberVN(b.selling_freight_price || b.freight_price || 4000000);
            const statusEl = document.getElementById('booking-status');
            if (statusEl) statusEl.value = b.status || 'PENDING_DISPATCH';
            const notesEl = document.getElementById('booking-notes');
            if (notesEl) notesEl.value = b.notes || '';

            // Hiển thị file booking đính kèm (nếu có hoặc danh sách documents)
            showSaleExistingBookingFile(b.booking_file_url, b.booking_file_name, b.documents);

            // Render danh sách container của Booking & Theo dõi Cắt Kéo
            const tripsTbody = document.getElementById('booking-trips-tbody');
            const tripsCountBadge = document.getElementById('booking-trips-count-badge');
            if (tripsTbody) {
                if (b.trips && b.trips.length > 0) {
                    if (tripsCountBadge) {
                        tripsCountBadge.innerText = `${b.trips.length} / ${b.total_containers} Container`;
                    }
                    tripsTbody.innerHTML = b.trips.map(t => {
                        const modeBadge = t.is_split_trip
                            ? `<span class="px-2 py-0.5 rounded font-black text-[10px] uppercase bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1" title="Chế độ Cắt Kéo (Drop & Hook) - Tài lấy & Tài hạ khác nhau">
                                <i class="ph-bold ph-arrows-split"></i> Cắt Kéo (${t.driver_split_ratio}%/${100 - t.driver_split_ratio}%)
                               </span>`
                            : `<span class="px-2 py-0.5 rounded font-black text-[10px] uppercase bg-teal-50 text-teal-700 border border-teal-200 inline-flex items-center gap-1">
                                <i class="ph-bold ph-arrow-right"></i> Chạy Thẳng
                               </span>`;
                        
                        const statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-800 border border-slate-200">${t.status_label || t.status}</span>`;

                        const locBadge = `<span class="px-1.5 py-0.5 rounded text-[11px] font-bold ${t.cont_location_type === 'NHÀ MÁY' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-700 border border-slate-200'}">${t.cont_location_type || 'NHÀ MÁY'}</span>`;

                        return `
                            <tr class="hover:bg-slate-50 transition-colors">
                                <td class="p-2.5">
                                    <p class="font-bold text-slate-900 font-mono text-xs">${t.trip_code}</p>
                                    <p class="text-[11px] font-mono text-indigo-700 font-bold">${t.container_number}</p>
                                </td>
                                <td class="p-2.5">${modeBadge}</td>
                                <td class="p-2.5">
                                    <p class="font-bold text-slate-900">${t.driver}</p>
                                    <p class="text-[11px] text-slate-500 font-medium">Xe: ${t.vehicle}</p>
                                </td>
                                <td class="p-2.5">
                                    ${t.is_split_trip ? `
                                        <p class="font-bold text-amber-900">${t.dropoff_driver || 'Chưa gán'}</p>
                                        <p class="text-[11px] text-slate-500 font-medium">Xe: ${t.dropoff_vehicle || '-'}</p>
                                    ` : `
                                        <span class="text-slate-400 italic text-[11px]">(Tài xế chặng 1)</span>
                                    `}
                                </td>
                                <td class="p-2.5">${locBadge}</td>
                                <td class="p-2.5">${statusBadge}</td>
                                <td class="p-2.5 text-center">
                                    <button type="button" onclick="closeModal('modal-booking'); viewTripDetail('${t.trip_code}')" 
                                        class="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition-colors inline-flex items-center gap-1 font-heading" title="Xem chi tiết chuyến xe">
                                        <i class="ph-bold ph-arrow-square-out"></i> Xem
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('');
                } else {
                    if (tripsCountBadge) {
                        tripsCountBadge.innerText = `0 / ${b.total_containers} Container`;
                    }
                    tripsTbody.innerHTML = `
                        <tr>
                            <td colspan="7" class="p-4 text-center text-slate-400 italic">
                                Chưa có container nào được phát lệnh điều xe từ Booking này. Bấm "Điều Xe" bên ngoài để phát lệnh.
                            </td>
                        </tr>
                    `;
                }
            }

            onBookingTypeChange();
        } catch (err) {
            console.error('Lỗi tải chi tiết booking:', err);
            showToast('error', 'Không thể tải thông tin đơn hàng để xem/chỉnh sửa', 'Lỗi');
            return;
        }
    }

    initAllNumberInputs();
    openModal('modal-booking');
}

async function saveBooking(e) {
    if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
    }
    const id = document.getElementById('booking-id')?.value;
    const bookingType = document.getElementById('booking-type')?.value || 'EXPORT_FCL';
    const customer = document.getElementById('booking-customer')?.value?.trim();
    const bookingNumber = document.getElementById('booking-number')?.value?.trim();
    const shippingLine = document.getElementById('booking-shipping-line')?.value?.trim();
    const vessel = document.getElementById('booking-vessel')?.value?.trim();
    const containerSize = document.getElementById('booking-container-size')?.value || '40HC';
    const totalContainers = parseNumberVN(document.getElementById('booking-total-containers')?.value) || 1;
    const commodity = document.getElementById('booking-commodity')?.value?.trim();
    const hsCode = document.getElementById('booking-hs-code')?.value?.trim();
    const pickup = document.getElementById('booking-pickup')?.value?.trim();
    const delivery = document.getElementById('booking-delivery')?.value?.trim();
    const dropoff = document.getElementById('booking-dropoff')?.value?.trim();
    const loadingDate = document.getElementById('booking-loading-date')?.value;
    const loadingTime = document.getElementById('booking-loading-time')?.value?.trim() || '08:00';
    syncBookingClosingTime();
    syncBookingSiTime();
    const closingTime = document.getElementById('booking-closing-time')?.value?.trim();
    const siCutoff = document.getElementById('booking-si-cutoff')?.value?.trim();
    const det = parseNumberVN(document.getElementById('booking-det')?.value) || 7;
    const dem = parseNumberVN(document.getElementById('booking-dem')?.value) || 7;
    const price = parseNumberVN(document.getElementById('booking-price')?.value) || 0;
    const statusVal = document.getElementById('booking-status')?.value || 'PENDING_DISPATCH';
    const notes = document.getElementById('booking-notes')?.value?.trim();

    if (!customer || !bookingNumber || !pickup || !delivery || !dropoff) {
        showToast('warning', 'Vui lòng điền đủ: Khách hàng, Số đơn/booking và Lộ trình 3 điểm', 'Thiếu Thông Tin');
        return;
    }

    const submitBtn = document.getElementById('btn-submit-booking');
    const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="ph-bold ph-spinner animate-spin text-base"></i> <span>Đang lưu...</span>';
    }

    try {
        const saleFileInput = document.getElementById('booking-order-file');
        const hasSaleFile = saleFileInput && saleFileInput.files && saleFileInput.files[0];

        const formData = new FormData();
        formData.append('action', 'create_booking');
        formData.append('booking_type', bookingType);
        formData.append('customer', customer);
        formData.append('booking_number', bookingNumber);
        formData.append('shipping_line', shippingLine);
        formData.append('vessel_voyage', vessel);
        formData.append('container_size', containerSize);
        formData.append('total_containers', totalContainers);
        formData.append('commodity', commodity);
        formData.append('hs_code', hsCode);
        formData.append('pickup_location', pickup);
        formData.append('delivery_location', delivery);
        formData.append('dropoff_location', dropoff);
        formData.append('loading_date', loadingDate || '');
        formData.append('loading_time', loadingTime);
        formData.append('closing_time', closingTime || '');
        formData.append('si_cutoff', siCutoff || '');
        formData.append('free_time_detention', det);
        formData.append('free_time_demurrage', dem);
        formData.append('selling_freight_price', price);
        formData.append('status', statusVal);
        formData.append('notes', notes || '');

        if (saleBookingFilesList && saleBookingFilesList.length > 0) {
            formData.append('booking_file', saleBookingFilesList[0]);
            saleBookingFilesList.forEach(file => {
                formData.append('booking_files', file);
            });
        } else if (hasSaleFile) {
            formData.append('booking_file', saleFileInput.files[0]);
        }

        let res;
        if (id) {
            res = await fetchWithAuth(`/api/bookings/${id}/`, {
                method: 'PUT',
                body: formData
            });
        } else {
            res = await fetchWithAuth('/api/sales/', {
                method: 'POST',
                body: formData
            });
        }

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || data.error || data.detail || 'Lỗi lưu đơn hàng / booking');

        showToast('success', data.message || 'Tiếp nhận đơn hàng thành công!', 'Thành Công');
        closeModal('modal-booking');
        clearSaleBookingFileSelection();
        loadSalesData();
        loadActiveBookingsForModal();
    } catch (err) {
        console.error('Error saving booking:', err);
        showToast('error', err.message || 'Không thể lưu đơn hàng / booking', 'Lỗi');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHtml;
        }
    }
}

async function changeBookingStatus(bookingId, newStatus) {
    if (!newStatus) return;
    try {
        const res = await fetchWithAuth(`/api/bookings/${bookingId}/status/`, {
            method: 'PATCH',
            body: JSON.stringify({ status: newStatus })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || data.error || data.detail || 'Lỗi chuyển trạng thái');

        showToast('success', data.message || 'Đã cập nhật trạng thái đơn hàng', 'Thành Công');
        loadSalesData();
        loadActiveBookingsForModal();
    } catch (err) {
        console.error('Error updating booking status:', err);
        showToast('error', err.message || 'Lỗi đổi trạng thái đơn hàng', 'Lỗi');
    }
}

async function deleteBooking(bookingId) {
    const confirmed = await showConfirmModal({
        title: 'Hủy / Xóa Đơn Hàng',
        message: 'Bạn có chắc chắn muốn xóa / hủy đơn hàng này không?\n\nDữ liệu lịch sử sẽ được bảo lưu an toàn (Soft-Delete).',
        confirmText: 'Xác Nhận Xóa',
        cancelText: 'Huỷ bỏ',
        type: 'danger',
        icon: 'ph-bold ph-trash text-2xl'
    });
    if (!confirmed) return;
    try {
        const res = await fetchWithAuth(`/api/bookings/${bookingId}/`, {
            method: 'DELETE'
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || data.error || data.detail || 'Lỗi xóa đơn hàng');

        showToast('success', data.message || 'Đã xóa đơn hàng / booking', 'Thành Công');
        loadSalesData();
        loadActiveBookingsForModal();
    } catch (err) {
        console.error('Error deleting booking:', err);
        showToast('error', err.message || 'Lỗi xóa đơn hàng / booking', 'Lỗi');
    }
}

function switchSalesSubTab(tabName) {
    const tabQuotesBtn = document.getElementById('tab-btn-quotations');
    const tabBookingsBtn = document.getElementById('tab-btn-bookings');
    const subtabQuotes = document.getElementById('subtab-sales-quotations');
    const subtabBookings = document.getElementById('subtab-sales-bookings');
    const roleHint = document.getElementById('sales-tab-role-hint');

    if (tabName === 'quotations') {
        if (subtabQuotes) subtabQuotes.classList.remove('hidden');
        if (subtabBookings) subtabBookings.classList.add('hidden');

        if (tabQuotesBtn) {
            tabQuotesBtn.className = 'flex-1 md:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold font-heading flex items-center justify-center space-x-2.5 transition-all shadow-sm bg-indigo-700 text-white';
            const badge = tabQuotesBtn.querySelector('#badge-count-quotes');
            if (badge) badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-black bg-white/20 text-white tabular-nums';
        }
        if (tabBookingsBtn) {
            tabBookingsBtn.className = 'flex-1 md:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold font-heading flex items-center justify-center space-x-2.5 transition-all text-slate-600 hover:text-slate-900 hover:bg-slate-100';
            const badge = tabBookingsBtn.querySelector('#badge-count-bookings');
            if (badge) badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-100 text-teal-800 tabular-nums';
        }
        if (roleHint) {
            roleHint.innerHTML = 'Phân quyền: <strong class="text-indigo-700">Nhân viên Kinh doanh (NVKD)</strong> — Khảo sát tuyến, chào giá, đàm phán hợp đồng';
        }
        if (typeof applyQuoteFilters === 'function') {
            applyQuoteFilters();
        }
        if (window.BimTableColumnManager) {
            window.BimTableColumnManager.apply('sales-quotations-table');
        }
    } else if (tabName === 'bookings') {
        if (subtabQuotes) subtabQuotes.classList.add('hidden');
        if (subtabBookings) subtabBookings.classList.remove('hidden');

        if (tabBookingsBtn) {
            tabBookingsBtn.className = 'flex-1 md:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold font-heading flex items-center justify-center space-x-2.5 transition-all shadow-sm bg-teal-700 text-white';
            const badge = tabBookingsBtn.querySelector('#badge-count-bookings');
            if (badge) badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-black bg-white/20 text-white tabular-nums';
        }
        if (tabQuotesBtn) {
            tabQuotesBtn.className = 'flex-1 md:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold font-heading flex items-center justify-center space-x-2.5 transition-all text-slate-600 hover:text-slate-900 hover:bg-slate-100';
            const badge = tabQuotesBtn.querySelector('#badge-count-quotes');
            if (badge) badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800 tabular-nums';
        }
        if (roleHint) {
            roleHint.innerHTML = 'Phân quyền: <strong class="text-teal-700">Sale Admin / CS (Chăm sóc Khách hàng)</strong> — Booking hãng tàu, kiểm soát SI/CY cut-off, chuyển giao điều xe';
        }
        if (!rawSalesBookings || rawSalesBookings.length === 0) {
            loadSalesData();
        } else {
            if (typeof applyBookingFilters === 'function') {
                applyBookingFilters();
            }
            if (window.BimTableColumnManager) {
                window.BimTableColumnManager.apply('sales-bookings-table');
            }
        }
    }
}

// --- BỘ LỌC TỪNG CỘT & SẮP XẾP BẢNG BOOKINGS (SALE / CS) ---
let rawSalesBookings = [];
let bookingSortColumn = 'loading_date';
let bookingSortDirection = 'asc'; // 'asc' | 'desc'

function populateBookingFilterDropdowns(bookings) {
    if (!bookings || !Array.isArray(bookings)) return;

    // 1. Dropdown Khách hàng
    const custSelect = document.getElementById('filter-bk-customer');
    if (custSelect) {
        const currentVal = custSelect.value || '';
        const customers = [...new Set(bookings.map(b => (b.customer || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
        let html = '<option value="">-- Tất cả Khách hàng --</option>';
        customers.forEach(c => {
            html += `<option value="${escapeHtml(c)}" ${c.toLowerCase() === currentVal.toLowerCase() ? 'selected' : ''}>${escapeHtml(c)}</option>`;
        });
        custSelect.innerHTML = html;
        if (currentVal && customers.some(c => c.toLowerCase() === currentVal.toLowerCase())) {
            custSelect.value = currentVal;
        }
    }

    // 2. Dropdown Hãng tàu
    const shipSelect = document.getElementById('filter-bk-shipping-line');
    if (shipSelect) {
        const currentVal = shipSelect.value || '';
        const shippingLines = [...new Set(bookings.map(b => (b.shipping_line || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
        let html = '<option value="">-- Tất cả Hãng tàu --</option>';
        shippingLines.forEach(s => {
            html += `<option value="${escapeHtml(s)}" ${s.toLowerCase() === currentVal.toLowerCase() ? 'selected' : ''}>${escapeHtml(s)}</option>`;
        });
        shipSelect.innerHTML = html;
        if (currentVal && shippingLines.some(s => s.toLowerCase() === currentVal.toLowerCase())) {
            shipSelect.value = currentVal;
        }
    }

    // 3. Dropdown Loại Cont
    const sizeSelect = document.getElementById('filter-bk-cont-size');
    if (sizeSelect) {
        const currentVal = sizeSelect.value || '';
        const sizes = [...new Set(bookings.map(b => (b.container_size || '').trim()).filter(Boolean))].sort();
        let html = '<option value="">-- Tất cả Loại Cont --</option>';
        sizes.forEach(s => {
            html += `<option value="${escapeHtml(s)}" ${s.toUpperCase() === currentVal.toUpperCase() ? 'selected' : ''}>Cont ${escapeHtml(s)}</option>`;
        });
        sizeSelect.innerHTML = html;
        if (currentVal && sizes.some(s => s.toUpperCase() === currentVal.toUpperCase())) {
            sizeSelect.value = currentVal;
        }
    }
}

function toggleBookingSort(column) {
    if (bookingSortColumn === column) {
        bookingSortDirection = bookingSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        bookingSortColumn = column;
        bookingSortDirection = (column === 'loading_date' || column === 'closing_time') ? 'asc' : 'desc';
    }
    applyBookingFilters();
}

function resetBookingFilters() {
    const cust = document.getElementById('filter-bk-customer');
    if (cust) cust.value = '';
    const ship = document.getElementById('filter-bk-shipping-line');
    if (ship) ship.value = '';
    const size = document.getElementById('filter-bk-cont-size');
    if (size) size.value = '';
    const status = document.getElementById('filter-bk-status');
    if (status) status.value = '';
    const search = document.getElementById('filter-bk-search');
    if (search) search.value = '';
    const clearBtn = document.getElementById('btn-clear-bk-search');
    if (clearBtn) clearBtn.classList.add('hidden');

    bookingSortColumn = 'loading_date';
    bookingSortDirection = 'asc';
    applyBookingFilters();
}

function clearBookingSearch() {
    const search = document.getElementById('filter-bk-search');
    if (search) search.value = '';
    const clearBtn = document.getElementById('btn-clear-bk-search');
    if (clearBtn) clearBtn.classList.add('hidden');
    applyBookingFilters();
}

function applyBookingFilters() {
    if (!rawSalesBookings) rawSalesBookings = [];
    if (!Array.isArray(rawSalesBookings)) rawSalesBookings = [];

    const filterCust = document.getElementById('filter-bk-customer')?.value?.trim().toLowerCase() || '';
    const filterShip = document.getElementById('filter-bk-shipping-line')?.value?.trim().toLowerCase() || '';
    const filterSize = document.getElementById('filter-bk-cont-size')?.value?.trim().toUpperCase() || '';
    const filterStatus = document.getElementById('filter-bk-status')?.value?.trim() || '';
    const filterSearch = document.getElementById('filter-bk-search')?.value?.trim().toLowerCase() || '';

    const clearBtn = document.getElementById('btn-clear-bk-search');
    if (clearBtn) {
        if (filterSearch) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
    }

    // Tiến hành lọc
    let list = rawSalesBookings.filter(b => {
        if (!b) return false;
        if (filterCust && (b.customer || '').trim().toLowerCase() !== filterCust) return false;
        if (filterShip && (b.shipping_line || '').trim().toLowerCase() !== filterShip) return false;
        if (filterSize && (b.container_size || '').trim().toUpperCase() !== filterSize) return false;

        if (filterStatus) {
            if (filterStatus === 'URGENT') {
                if (!b.is_urgent) return false;
            } else if (filterStatus === 'DROP_HOOK') {
                if (!b.has_drop_hook) return false;
            } else if (b.status !== filterStatus) {
                return false;
            }
        }

        if (filterSearch) {
            const combinedText = [
                b.booking_code,
                b.booking_number,
                b.customer,
                b.shipping_line,
                b.vessel_voyage,
                b.pickup,
                b.delivery,
                b.dropoff,
                b.commodity
            ].filter(Boolean).join(' ').toLowerCase();

            if (!combinedText.includes(filterSearch)) return false;
        }

        return true;
    });

    // Cập nhật số đếm
    const filteredCountEl = document.getElementById('booking-filtered-count');
    if (filteredCountEl) filteredCountEl.innerText = list.length;
    const totalCountEl = document.getElementById('booking-total-count');
    if (totalCountEl) totalCountEl.innerText = rawSalesBookings.length;

    // Sắp xếp
    list.sort((a, b) => {
        if (bookingSortColumn === 'booking_code') {
            const cmp = (a.booking_code || '').toString().localeCompare((b.booking_code || '').toString(), 'vi', { numeric: true });
            return bookingSortDirection === 'asc' ? cmp : -cmp;
        }

        if (bookingSortColumn === 'loading_date') {
            valA = a.loading_date_iso || a.loading_date || '';
            valB = b.loading_date_iso || b.loading_date || '';
            const cmp = valA.localeCompare(valB);
            return bookingSortDirection === 'asc' ? cmp : -cmp;
        }

        if (bookingSortColumn === 'price') {
            valA = parseFloat(valA) || 0;
            valB = parseFloat(valB) || 0;
            return bookingSortDirection === 'asc' ? valA - valB : valB - valA;
        }

        if (bookingSortColumn === 'progress_percent') {
            valA = parseFloat(valA) || 0;
            valB = parseFloat(valB) || 0;
            return bookingSortDirection === 'asc' ? valA - valB : valB - valA;
        }

        // Mặc định so sánh chuỗi / ngày giờ
        valA = (valA || '').toString();
        valB = (valB || '').toString();
        const cmp = valA.localeCompare(valB, 'vi');
        return bookingSortDirection === 'asc' ? cmp : -cmp;
    });

    // Cập nhật visual icons trên thead
    const sortIcons = {
        'booking_code': document.getElementById('sort-icon-booking_code'),
        'loading_date': document.getElementById('sort-icon-loading_date'),
        'progress_percent': document.getElementById('sort-icon-progress_percent'),
        'closing_time': document.getElementById('sort-icon-closing_time'),
        'price': document.getElementById('sort-icon-price')
    };

    Object.entries(sortIcons).forEach(([col, icon]) => {
        if (!icon) return;
        if (col === bookingSortColumn) {
            icon.className = bookingSortDirection === 'asc' 
                ? 'ph-bold ph-arrow-up text-teal-700 text-xs font-black' 
                : 'ph-bold ph-arrow-down text-teal-700 text-xs font-black';
        } else {
            icon.className = 'ph-bold ph-arrows-down-up text-slate-400 text-xs';
        }
    });

    renderBookingsTable(list);
    if (window.BimTableColumnManager) {
        window.BimTableColumnManager.apply('sales-bookings-table');
    }
}

function renderBookingsTable(bookings) {
    const bkBody = document.getElementById('sales-bookings-tbody');
    if (!bkBody) return;
    bkBody.innerHTML = '';

    if (!bookings || bookings.length === 0) {
        bkBody.innerHTML = `
            <tr>
                <td colspan="10" class="p-8 text-center text-slate-400 italic">
                    <div class="flex flex-col items-center justify-center space-y-2">
                        <i class="ph-bold ph-magnifying-glass text-3xl text-slate-300"></i>
                        <p class="font-medium text-sm">Không tìm thấy đơn hàng / booking nào phù hợp với bộ lọc hiện tại.</p>
                        <button type="button" onclick="resetBookingFilters()" class="text-xs text-teal-700 hover:text-teal-900 font-bold underline">
                            Đặt lại toàn bộ bộ lọc
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    bookings.forEach(b => {
        const tr = document.createElement('tr');
        tr.className = b.is_urgent 
            ? 'hover:bg-amber-50/70 bg-amber-50/25 transition-colors' 
            : 'hover:bg-slate-50 transition-colors';
        
        const statusBadge = b.status === 'PENDING_DISPATCH' 
            ? '<span class="text-xs font-semibold text-amber-700 whitespace-nowrap">Chờ điều xe</span>'
            : b.status === 'PARTIALLY_DISPATCHED'
            ? '<span class="text-xs font-semibold text-teal-700 whitespace-nowrap">Đang điều xe</span>'
            : b.status === 'COMPLETED'
            ? '<span class="text-xs font-semibold text-emerald-700 whitespace-nowrap">Đã đủ cont</span>'
            : '<span class="text-xs font-semibold text-rose-700 whitespace-nowrap">Đã hủy</span>';

        const urgentBadge = b.is_urgent ? `
            <span class="ml-1 px-1.5 py-0.2 rounded text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200 inline-flex items-center gap-0.5">
                <i class="ph-bold ph-warning-circle text-[11px]"></i> GẤP
            </span>
        ` : '';

        const dropHookBadge = b.has_drop_hook ? `
            <span class="ml-1 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-0.5" title="Có ${b.drop_hook_count} cont chạy chế độ cắt kéo (đổi tài)">
                <i class="ph-bold ph-arrows-split"></i> CẮT KÉO (${b.drop_hook_count})
            </span>
        ` : '';

        // Phân loại nhãn dịch vụ gọn gàng
        const svcTag = b.booking_type === 'DOMESTIC' ? 'Nội Địa FTL' : (b.booking_type === 'IMPORT_FCL' ? 'Nhập FCL' : 'Xuất FCL');
        const svcCls = b.booking_type === 'DOMESTIC' ? 'bg-amber-50 text-amber-800 border-amber-200' : (b.booking_type === 'IMPORT_FCL' ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-teal-50 text-teal-800 border-teal-200');

        // Hàm rút gọn địa điểm loại bỏ ngoặc rườm rà
        const cleanLoc = (s) => (s || '-').replace(/\([^)]*\)/g, '').trim();

        tr.innerHTML = `
            <td class="p-3.5 whitespace-nowrap">
                <div class="flex items-center flex-wrap gap-1">
                    <span class="font-black text-slate-900 font-heading font-mono text-sm">${escapeHtml(formatCodeCompact(b.booking_code))}</span>
                    ${urgentBadge}
                    ${dropHookBadge}
                </div>
            </td>
            <td class="p-3.5 whitespace-nowrap">
                <div class="text-xs text-slate-700 font-semibold flex items-center gap-1">
                    <i class="ph-bold ph-calendar-blank text-slate-400"></i> ${b.loading_date} · ${b.loading_time}
                </div>
            </td>
            <td class="p-3.5">
                <p class="font-bold text-slate-900 text-sm truncate max-w-[200px]" title="${b.customer}">${b.customer}</p>
                <p class="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
                    <span class="px-1.5 py-0.5 rounded font-bold border text-[11px] ${svcCls}">${svcTag}</span>
                    <span class="font-bold text-teal-800 truncate max-w-[120px]">${b.shipping_line}</span>
                </p>
            </td>
            <td class="p-3.5 font-mono text-sm">
                <p class="font-black text-indigo-900">${b.booking_number || '-'}</p>
                <p class="text-xs text-slate-400 font-normal truncate max-w-[120px]">${b.vessel_voyage || '-'}</p>
            </td>
            <td class="p-3.5">
                <div class="flex items-center gap-1.5">
                    <span class="px-1.5 py-0.5 rounded font-black text-xs bg-slate-100 text-slate-800 border border-slate-200 uppercase">${b.container_size}</span>
                    <span class="text-sm font-semibold text-slate-800 truncate max-w-[130px]" title="${b.commodity || 'Hàng hóa'}">${b.commodity || 'Hàng hóa'}</span>
                </div>
            </td>
            <td class="p-3.5">
                <div class="flex items-center space-x-1.5 mb-1">
                    <span class="font-black text-slate-900 text-sm tabular-nums">${b.progress}</span>
                    <div class="w-12 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div class="bg-teal-600 h-1.5 rounded-full" style="width: ${b.progress_percent}%"></div>
                    </div>
                </div>
                <div>${statusBadge}</div>
            </td>
            <td class="p-3.5">
                <div class="text-[13px] leading-snug space-y-0.5 max-w-[220px]">
                    <p class="truncate text-slate-700"><strong class="text-teal-700 font-bold">1. Lấy:</strong> ${cleanLoc(b.pickup)}</p>
                    <p class="truncate text-slate-900 font-semibold"><strong class="text-slate-900 font-bold">2. Kho:</strong> ${cleanLoc(b.delivery)}</p>
                    ${b.dropoff ? `<p class="truncate text-slate-700"><strong class="text-indigo-700 font-bold">3. Hạ:</strong> ${cleanLoc(b.dropoff)}</p>` : ''}
                </div>
            </td>
            <td class="p-3.5 font-mono text-sm">
                <p class="font-bold text-rose-700">${b.closing_time || '-'}</p>
                ${b.si_cutoff ? `<p class="text-[11px] text-slate-400 mt-0.5 font-sans">SI: ${b.si_cutoff}</p>` : ''}
            </td>
            <td class="p-3.5 text-right font-black text-slate-900 text-sm tabular-nums">
                ${new Intl.NumberFormat('vi-VN').format(b.price)} đ
            </td>
            <td class="p-3.5 text-center">
                <div class="flex items-center justify-center space-x-1.5">
                    ${b.status !== 'COMPLETED' && b.status !== 'CANCELLED' ? `
                        <button onclick="dispatchFromBooking(${b.id})" class="px-2.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center gap-1 font-heading" title="Điều xe ngay">
                            <i class="ph-bold ph-paper-plane-tilt text-xs"></i>
                            <span>Điều Xe</span>
                        </button>
                    ` : `
                        <span class="px-2 py-1 text-xs text-emerald-700 font-bold flex items-center gap-0.5">
                            <i class="ph-bold ph-check"></i> Đủ xe
                        </span>
                    `}
                    <!-- 1. Xem chi tiết Booking (Chế độ chỉ đọc) -->
                    <button onclick="openModalBooking(${b.id}, true)" title="Xem chi tiết đơn hàng" 
                        class="p-1.5 rounded-lg bg-slate-100 hover:bg-sky-100 text-slate-600 hover:text-sky-700 transition-colors">
                        <i class="ph-bold ph-eye text-sm"></i>
                    </button>
                    <!-- 2. Sửa Booking (Chế độ chỉnh sửa) -->
                    <button onclick="openModalBooking(${b.id}, false)" title="Hiệu chỉnh đơn hàng" 
                        class="p-1.5 rounded-lg bg-slate-100 hover:bg-teal-100 text-slate-600 hover:text-teal-700 transition-colors">
                        <i class="ph-bold ph-pencil-simple text-sm"></i>
                    </button>
                    <!-- 3. Xóa Booking -->
                    <button onclick="deleteBooking(${b.id})" title="Xóa đơn hàng" 
                        class="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 transition-colors">
                        <i class="ph-bold ph-trash text-sm"></i>
                    </button>
                </div>
            </td>
        `;
        bkBody.appendChild(tr);
    });
}

async function loadSalesData() {
    try {
        const globalDates = getDateRangeForPeriod(currentDashboardPeriod, currentDashboardCustomStart, currentDashboardCustomEnd);
        const res = await fetchWithAuth(`/api/sales/?from_date=${globalDates.fromDate}&to_date=${globalDates.toDate}`);
        if (!res.ok) throw new Error('Lỗi tải dữ liệu kinh doanh');
        const data = await res.json();

        // Cập nhật Cụm Chỉ Số Tình Trạng Kinh Doanh & Tăng Trưởng (Màn hình chính)
        if (data.overview_metrics) {
            const ov = data.overview_metrics;
            const revEl = document.getElementById('sales-overview-revenue');
            if (revEl) revEl.innerText = new Intl.NumberFormat('vi-VN').format(ov.revenue_monthly) + ' đ';
            const revTrendEl = document.getElementById('sales-trend-revenue');
            if (revTrendEl) revTrendEl.innerHTML = `<i class="ph-bold ph-trend-up"></i> ${ov.revenue_trend}`;
            const revNoteEl = document.getElementById('sales-note-revenue');
            if (revNoteEl) revNoteEl.innerHTML = `<i class="ph-bold ph-check-circle text-emerald-600 text-xs"></i> ${ov.revenue_note}`;

            const bkEl = document.getElementById('sales-overview-bookings');
            if (bkEl) bkEl.innerText = `${new Intl.NumberFormat('vi-VN').format(ov.total_bookings || 0)} Đơn hàng`;
            const bkTrendEl = document.getElementById('sales-trend-bookings');
            if (bkTrendEl) bkTrendEl.innerHTML = `<i class="ph-bold ph-trend-up"></i> ${ov.booking_trend}`;
            const bkNoteEl = document.getElementById('sales-note-bookings');
            if (bkNoteEl) bkNoteEl.innerHTML = `<i class="ph-bold ph-truck text-teal-600 text-xs"></i> ${ov.booking_note}`;

            const contEl = document.getElementById('sales-overview-containers');
            if (contEl) contEl.innerText = `${new Intl.NumberFormat('vi-VN').format(ov.total_containers || 0)} Cont`;
            const contTrendEl = document.getElementById('sales-trend-containers');
            if (contTrendEl) contTrendEl.innerHTML = `<i class="ph-bold ph-trend-up"></i> ${ov.container_trend}`;
            const contNoteEl = document.getElementById('sales-note-containers');
            if (contNoteEl) contNoteEl.innerHTML = `<i class="ph-bold ph-package text-amber-600 text-xs"></i> ${ov.container_note}`;

            const winEl = document.getElementById('sales-overview-winrate');
            if (winEl) winEl.innerText = `${ov.win_rate}%`;
            const winTrendEl = document.getElementById('sales-trend-winrate');
            if (winTrendEl) winTrendEl.innerHTML = `<i class="ph-bold ph-trend-up"></i> ${ov.win_rate_trend}`;
            const winNoteEl = document.getElementById('sales-note-winrate');
            if (winNoteEl) winNoteEl.innerHTML = `<i class="ph-bold ph-chats-circle text-indigo-600 text-xs"></i> ${ov.win_rate_note}`;
        }

        // Cập nhật badges số lượng trên 2 tab
        const bQuoteCount = document.getElementById('badge-count-quotes');
        if (bQuoteCount && data.quotations) bQuoteCount.innerText = new Intl.NumberFormat('vi-VN').format(data.quotations.length);
        const bBookingCount = document.getElementById('badge-count-bookings');
        if (bBookingCount && data.bookings) bBookingCount.innerText = new Intl.NumberFormat('vi-VN').format(data.bookings.length);

        // Cập nhật stats con cho Báo giá & Booking (Dashboard riêng từng tab)
        if (data.stats) {
            const qs = data.stats.quotation_stats;
            if (qs) {
                const qNeg = document.getElementById('stat-quote-negotiating');
                if (qNeg) qNeg.innerText = new Intl.NumberFormat('vi-VN').format(qs.negotiating || 0);
                const qPending = document.getElementById('stat-quote-pending');
                if (qPending) qPending.innerText = new Intl.NumberFormat('vi-VN').format(qs.pending_approval || 0);
                const qApp = document.getElementById('stat-quote-approved');
                if (qApp) qApp.innerText = new Intl.NumberFormat('vi-VN').format(qs.approved || 0);
                const qRev = document.getElementById('stat-quote-revenue');
                if (qRev) qRev.innerText = new Intl.NumberFormat('vi-VN').format(qs.expected_revenue || 0) + ' đ';
            }

            const bs = data.stats.booking_stats;
            if (bs) {
                const pEl = document.getElementById('sales-stat-pending-dispatch');
                if (pEl) pEl.innerText = new Intl.NumberFormat('vi-VN').format(bs.pending_dispatch || 0);
                const partEl = document.getElementById('sales-stat-partially-dispatched');
                if (partEl) partEl.innerText = new Intl.NumberFormat('vi-VN').format(bs.partially_dispatched || 0);
                const cEl = document.getElementById('sales-stat-completed');
                if (cEl) cEl.innerText = new Intl.NumberFormat('vi-VN').format(bs.completed || 0);

                const dispContEl = document.getElementById('sales-stat-dispatched-containers');
                if (dispContEl) dispContEl.innerText = new Intl.NumberFormat('vi-VN').format(bs.dispatched_containers || 0);
                const totContEl = document.getElementById('sales-stat-total-containers');
                if (totContEl) totContEl.innerText = new Intl.NumberFormat('vi-VN').format(bs.total_containers || 0);
                const remContEl = document.getElementById('sales-stat-remaining-containers');
                if (remContEl) remContEl.innerText = new Intl.NumberFormat('vi-VN').format(bs.remaining_containers || 0);
            }
        }

        // Cập nhật danh sách Bookings với bộ lọc & sắp xếp theo ngày/cột
        rawSalesBookings = data.bookings || data.items || data.results || (Array.isArray(data) ? data : []);
        populateBookingFilterDropdowns(rawSalesBookings);
        applyBookingFilters();

        // Cập nhật danh sách Báo Giá Tuyến Cước với bộ lọc & sắp xếp
        rawSalesQuotations = data.quotations || [];
        populateQuoteFilterDropdowns(rawSalesQuotations);
        applyQuoteFilters();
    } catch (err) {
        console.error('Error loading sales data:', err);
    }
}

// --- BỘ LỌC & SẮP XẾP BẢNG BÁO GIÁ TUYẾN CƯỚC (CRM) ---
let rawSalesQuotations = [];
let quoteSortColumn = null;
let quoteSortDirection = 'asc';

function populateQuoteFilterDropdowns(quotes) {
    if (!quotes || !Array.isArray(quotes)) return;
    const custSelect = document.getElementById('filter-quote-customer');
    if (custSelect) {
        const curVal = custSelect.value;
        const customers = [...new Set(quotes.map(q => (q.customer || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
        custSelect.innerHTML = '<option value="">-- Tất cả Khách hàng --</option>' + 
            customers.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
        if (customers.includes(curVal)) custSelect.value = curVal;
    }
}

function clearQuoteSearch() {
    const input = document.getElementById('filter-quote-search');
    if (input) input.value = '';
    const clearBtn = document.getElementById('btn-clear-quote-search');
    if (clearBtn) clearBtn.classList.add('hidden');
    applyQuoteFilters();
}

function resetQuoteFilters() {
    const cust = document.getElementById('filter-quote-customer');
    if (cust) cust.value = '';
    const status = document.getElementById('filter-quote-status');
    if (status) status.value = '';
    const search = document.getElementById('filter-quote-search');
    if (search) search.value = '';
    const clearBtn = document.getElementById('btn-clear-quote-search');
    if (clearBtn) clearBtn.classList.add('hidden');

    quoteSortColumn = null;
    quoteSortDirection = 'asc';
    applyQuoteFilters();
}

function toggleQuoteSort(col) {
    if (quoteSortColumn === col) {
        quoteSortDirection = quoteSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        quoteSortColumn = col;
        quoteSortDirection = 'asc';
    }
    applyQuoteFilters();
}

function applyQuoteFilters() {
    if (!rawSalesQuotations || !Array.isArray(rawSalesQuotations)) return;

    const filterCust = document.getElementById('filter-quote-customer')?.value?.trim().toLowerCase() || '';
    const filterStatus = document.getElementById('filter-quote-status')?.value?.trim().toLowerCase() || '';
    const filterSearch = document.getElementById('filter-quote-search')?.value?.trim().toLowerCase() || '';

    const clearBtn = document.getElementById('btn-clear-quote-search');
    if (clearBtn) {
        if (filterSearch) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
    }

    let list = rawSalesQuotations.filter(q => {
        if (filterCust && (q.customer || '').toLowerCase() !== filterCust) return false;
        
        if (filterStatus) {
            const st = (q.status || '').toLowerCase();
            if (!st.includes(filterStatus)) return false;
        }

        if (filterSearch) {
            const combinedText = [
                q.code,
                q.created_at,
                q.customer,
                q.route,
                q.status,
                q.unit_price,
                q.monthly_trips,
                q.expected_revenue
            ].filter(Boolean).join(' ').toLowerCase();

            if (!combinedText.includes(filterSearch)) return false;
        }

        return true;
    });

    // Cập nhật số đếm
    const filteredCountEl = document.getElementById('quote-filtered-count');
    if (filteredCountEl) filteredCountEl.innerText = list.length;
    const totalCountEl = document.getElementById('quote-total-count');
    if (totalCountEl) totalCountEl.innerText = rawSalesQuotations.length;

    // Sắp xếp
    if (quoteSortColumn) {
        list.sort((a, b) => {
            let valA = a[quoteSortColumn];
            let valB = b[quoteSortColumn];

            if (quoteSortColumn === 'created_at') {
                const parseDate = (dStr) => {
                    if (!dStr) return 0;
                    const parts = dStr.split('/');
                    if (parts.length === 3) {
                        return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
                    }
                    const t = new Date(dStr).getTime();
                    return isNaN(t) ? 0 : t;
                };
                const timeA = parseDate(valA);
                const timeB = parseDate(valB);
                return quoteSortDirection === 'asc' ? timeA - timeB : timeB - timeA;
            }

            if (['unit_price', 'monthly_trips', 'expected_revenue'].includes(quoteSortColumn)) {
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
                return quoteSortDirection === 'asc' ? valA - valB : valB - valA;
            }

            valA = (valA || '').toString();
            valB = (valB || '').toString();
            const cmp = valA.localeCompare(valB, 'vi');
            return quoteSortDirection === 'asc' ? cmp : -cmp;
        });
    }

    // Cập nhật icons thead
    const sortCols = ['code', 'created_at', 'customer', 'route', 'unit_price', 'monthly_trips', 'expected_revenue', 'status'];
    sortCols.forEach(col => {
        const iconEl = document.getElementById(`sort-icon-quote-${col}`);
        if (iconEl) {
            if (quoteSortColumn === col) {
                iconEl.className = quoteSortDirection === 'asc' 
                    ? 'ph-bold ph-arrow-up text-indigo-600 text-xs' 
                    : 'ph-bold ph-arrow-down text-indigo-600 text-xs';
            } else {
                iconEl.className = 'ph-bold ph-arrows-down-up text-slate-400 text-xs';
            }
        }
    });

    renderQuotationsTable(list);
}

function renderQuotationsTable(quotations) {
    const tbody = document.getElementById('sales-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!quotations || quotations.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-10 text-slate-400">
                    <div class="flex flex-col items-center justify-center">
                        <i class="ph ph-magnifying-glass text-3xl mb-2 text-slate-300"></i>
                        <p class="font-medium text-sm text-slate-500">Không tìm thấy báo giá nào phù hợp với bộ lọc</p>
                        <p class="text-xs text-slate-400 mt-1">Thử đổi điều kiện lọc hoặc bấm "Đặt lại"</p>
                        <button onclick="resetQuoteFilters()" class="mt-2.5 px-3 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors">
                            Đặt lại bộ lọc
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    quotations.forEach(s => {
        let statusCls = 'text-teal-700 font-semibold';
        if (s.status.includes('Đã duyệt')) statusCls = 'text-emerald-700 font-semibold';
        if (s.status.includes('Chờ') || s.status.includes('thương lượng')) statusCls = 'text-amber-700 font-semibold';
        if (s.status.includes('Từ chối') || s.status.includes('hết hiệu lực')) statusCls = 'text-rose-700 font-semibold';

        const hasMultiRoutes = (s.items_count && s.items_count > 1) || (s.items && s.items.length > 1);
        const routeCount = s.items_count || (s.items ? s.items.length : 1);
        const isFuelAdj = s.pricing_method === 'FUEL_ADJUSTED';

        let routeDisplay = escapeHtml(s.route);
        if (hasMultiRoutes) {
            routeDisplay = `
                <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="font-bold text-slate-900">${escapeHtml(s.route)}</span>
                    <span class="text-indigo-700 font-semibold text-xs">+${routeCount - 1} tuyến khác</span>
                </div>
            `;
        }

        let methodBadge = '';
        if (isFuelAdj) {
            methodBadge = `<span class="text-amber-800 font-semibold text-xs">Giá Dầu</span>`;
        }

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition-colors';
        tr.innerHTML = `
            <td class="p-3.5 font-black text-indigo-950 font-heading text-sm">
                <div class="flex flex-col">
                    <span>${formatCodeCompact(s.code)}</span>
                    ${methodBadge ? `<div class="mt-0.5">${methodBadge}</div>` : ''}
                </div>
            </td>
            <td class="p-3.5 text-center whitespace-nowrap text-xs font-semibold text-slate-700">${escapeHtml(s.created_at || '-')}</td>
            <td class="p-3.5 font-bold text-slate-900 text-sm">${escapeHtml(s.customer)}</td>
            <td class="p-3.5 font-medium text-slate-700 text-[13px]">${routeDisplay}</td>
            <td class="p-3.5 font-semibold text-slate-700 tabular-nums text-sm text-right">${new Intl.NumberFormat('vi-VN').format(s.unit_price)} đ</td>
            <td class="p-3.5 text-center font-bold text-teal-700 tabular-nums text-sm">${new Intl.NumberFormat('vi-VN').format(s.monthly_trips || 0)} <span class="text-xs text-slate-400 font-normal">chuyến</span></td>
            <td class="p-3.5 text-right font-black text-emerald-700 tabular-nums font-heading text-sm">${new Intl.NumberFormat('vi-VN').format(s.expected_revenue)} đ</td>
            <td class="p-3.5 whitespace-nowrap">
                <span class="text-xs ${statusCls}">${escapeHtml(s.status)}</span>
            </td>
            <td class="p-3.5 text-center">
                <div class="flex items-center justify-center space-x-1.5">
                    <!-- 1. In Báo Giá Chuẩn Doanh Nghiệp -->
                    <button onclick="openQuotationPrintModal(${s.id})" title="In Báo Giá Ký Kết" 
                        class="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 hover:text-teal-900 border border-teal-200 transition-colors">
                        <i class="ph-bold ph-printer text-sm"></i>
                    </button>
                    <!-- 2. Xem chi tiết Báo Giá (Chế độ chỉ đọc) -->
                    <button onclick="openModalQuotation(${s.id}, true)" title="Xem chi tiết báo giá" 
                        class="p-1.5 rounded-lg bg-slate-100 hover:bg-sky-100 text-slate-600 hover:text-sky-700 transition-colors">
                        <i class="ph-bold ph-eye text-sm"></i>
                    </button>
                    <!-- 3. Sửa Báo Giá (Chế độ chỉnh sửa) -->
                    <button onclick="openModalQuotation(${s.id}, false)" title="Chỉnh sửa báo giá" 
                        class="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 transition-colors">
                        <i class="ph-bold ph-pencil-simple text-sm"></i>
                    </button>
                    <!-- 4. Xóa Báo Giá -->
                    <button onclick="deleteQuotation(${s.id})" title="Xóa báo giá" 
                        class="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 transition-colors">
                        <i class="ph-bold ph-trash text-sm"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Bảng ánh xạ Clean Semantic Routes chuẩn Quốc Tế (SaaS TMS / ERP Standard)
const ROUTE_TAB_MAP = {
    '': 'dashboard',
    '/': 'dashboard',
    '/dashboard': 'dashboard',
    '/dispatch': 'dieu-van',
    '/sales': 'kinh-doanh',
    '/fleet': 'xe-bai',
    '/hr': 'nhan-su',
    '/accounting': 'ke-toan',
    '/settlements': 'quyet-toan',
    '/quyet-toan': 'quyet-toan',
    '/customs': 'hai-quan',
    '/reports': 'bao-cao',
    '/settings': 'cai-dat'
};

const TAB_ROUTE_MAP = {
    'dashboard': '/',
    'dieu-van': '/dispatch',
    'kinh-doanh': '/sales',
    'xe-bai': '/fleet',
    'nhan-su': '/hr',
    'ke-toan': '/accounting',
    'quyet-toan': '/settlements',
    'hai-quan': '/customs',
    'bao-cao': '/reports',
    'cai-dat': '/settings'
};

