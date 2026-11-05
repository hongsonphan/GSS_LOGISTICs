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
    const unitPrice = data.unit_price !== undefined ? data.unit_price : 0;
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
    if (!confirm('Bạn có chắc chắn muốn xóa dòng tuyến báo giá này?')) return;
    const tbody = document.getElementById('quote-routes-tbody');
    if (!tbody) return;
    const tr = button.closest('tr');
    if (tr) tr.remove();

    if (tbody.children.length === 0) {
        addQuotationRouteRow({ route_description: '', unit_price: 0, expected_trips_monthly: 0 });
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
    fcl: `1. Đơn giá trên chưa bao gồm thuế giá trị gia tăng (VAT 8% / 10%). Đã bao gồm chi phí nhiên liệu, lương lái xe và phí cầu đường BOT.
2. Chưa bao gồm phí nâng hạ cont tại cảng/ICD và phí bốc xếp hàng hóa tại kho của Quý khách hàng.
3. Thời gian lưu xe (Free-time): Miễn phí 12 giờ đầu kể từ khi xe đến kho; Phí neo tính sau 12h: Xe đầu kéo 1.500.000 VNĐ/đêm, Rơ-moóc 1.000.000 VNĐ/đêm.
4. Green Solutions Supply cam kết điều xe đúng chủng loại, đảm bảo tải trọng quy định, bảo toàn nguyên vẹn seal chì và phẩm chất hàng hóa.
5. Báo giá có hiệu lực trong vòng 30 ngày kể từ ngày ban hành.`,

    ftl: `1. Đơn giá trên chưa bao gồm thuế VAT (8% / 10%) và chưa bao gồm chi phí bốc xếp tại hai đầu kho.
2. Đã bao gồm chi phí xăng dầu, lương tài xế, bảo trì phương tiện và vé trạm BOT.
3. Xe vận tải cam kết chạy đúng tải trọng và tuân thủ tuyệt đối Luật Giao thông đường bộ.
4. Quý khách hàng chịu trách nhiệm chuẩn bị hóa đơn, chứng từ vận chuyển hợp pháp theo hàng hóa.
5. Báo giá có hiệu lực trong vòng 30 ngày kể từ ngày ban hành.`,

    fuel: `1. Đơn giá trên chưa bao gồm thuế VAT (8% / 10%) và phí bốc xếp tại kho khách hàng.
2. Đơn giá cước áp dụng theo mức giá dầu Diesel DO 0.05S cơ sở tại thời điểm phát hành báo giá.
3. Khi giá dầu thị trường Petrolimex biến động theo từng bước quy định, hai bên sẽ tự động điều chỉnh đơn giá cước tương ứng.
4. Thời gian neo xe: Miễn phí 12 giờ đầu; Phí neo tính sau 12h: Xe đầu kéo 1.500.000 VNĐ/đêm, Rơ-moóc 1.000.000 VNĐ/đêm.
5. Báo giá có hiệu lực trong vòng 30 ngày kể từ ngày ban hành.`
};

function setQuickQuoteNote(type) {
    const noteEl = document.getElementById('quote-notes');
    if (noteEl && DEFAULT_QUOTATION_NOTES[type]) {
        noteEl.value = DEFAULT_QUOTATION_NOTES[type];
    }
}

function toggleQuoteNotesExpand() {
    const noteEl = document.getElementById('quote-notes');
    const iconEl = document.getElementById('icon-toggle-quote-notes');
    const textEl = document.getElementById('text-toggle-quote-notes');
    const btnEl = document.getElementById('btn-toggle-quote-notes');
    if (!noteEl) return;

    const isExpanded = noteEl.getAttribute('data-expanded') === 'true';
    if (isExpanded) {
        noteEl.rows = 5;
        noteEl.style.minHeight = '110px';
        noteEl.removeAttribute('data-expanded');
        if (iconEl) iconEl.className = 'ph-bold ph-arrows-out-simple text-teal-700 text-sm';
        if (textEl) textEl.textContent = 'Mở Rộng Ô';
        if (btnEl) btnEl.title = 'Bấm để phóng to khung soạn thảo điều khoản giúp dễ gõ';
    } else {
        noteEl.rows = 14;
        noteEl.style.minHeight = '280px';
        noteEl.setAttribute('data-expanded', 'true');
        if (iconEl) iconEl.className = 'ph-bold ph-arrows-in-simple text-amber-700 text-sm';
        if (textEl) textEl.textContent = 'Thu Gọn';
        if (btnEl) btnEl.title = 'Bấm để thu nhỏ khung soạn thảo điều khoản';
        // Cuộn mượt đến textarea để người dùng tiện soạn thảo
        noteEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        noteEl.focus();
    }
}

async function openModalQuotation(quoteId = null, isReadOnly = false) {
    if (quoteId) {
        return viewQuotationDetail(quoteId);
    } else {
        return openCreateQuotationPage();
    }
}

function enableEditQuotationModal() {
    const form = document.getElementById('form-quotation');
    if (form) {
        form.querySelectorAll('input, select, textarea, button').forEach(el => el.disabled = false);
    }
    const titleEl = document.getElementById('modal-quotation-title');
    const quoteCode = document.getElementById('quote-code')?.value || '';
    if (titleEl && !titleEl.innerText.startsWith('Hiệu Chỉnh')) {
        titleEl.innerText = titleEl.innerText.replace('Chi Tiết', 'Hiệu Chỉnh');
    }
    const editModalBtn = document.getElementById('btn-edit-quote-modal');
    if (editModalBtn) editModalBtn.classList.add('hidden');
    const submitBtn = document.getElementById('btn-submit-quote');
    if (submitBtn) submitBtn.style.display = 'inline-flex';
}
window.enableEditQuotationModal = enableEditQuotationModal;

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

// --- XỬ LÝ KHU VỰC, TUYẾN ĐƯỜNG & SỐ KM BÁO GIÁ ---
function roundEstimatedKmInput(input) {
    if (!input) return;
    let val = parseInt(input.value) || 0;
    if (val > 0) {
        val = Math.max(10, Math.round(val / 10) * 10);
    } else {
        val = 0;
    }
    input.value = val;
}


function setTariffKm(kmVal) {
    const el = document.getElementById('mdf-estimated-km');
    if (el) {
        el.value = kmVal;
    }
}


