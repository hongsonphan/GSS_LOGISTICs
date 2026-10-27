// =========================================================================
// TOÀN BỘ LOGIC MÀN HÌNH BÁO GIÁ DẠNG TRANG RIÊNG BIỆT (DEDICATED FULL-PAGE VIEW)
// URL Chuẩn: /sales/quotations/<hashid>
// =========================================================================

let currentActiveFullpageQuotation = null;

function onFullpageQuotationPricingMethodChange(method) {
    const fuelBox = document.getElementById('fullpage-quote-fuel-box');
    if (fuelBox) {
        if (method === 'FUEL_ADJUSTED') {
            fuelBox.classList.remove('hidden');
            updateFullpageFuelFormulaText();
        } else {
            fuelBox.classList.add('hidden');
        }
    }
}

function updateFullpageFuelFormulaText() {
    const basePrice = parseNumberVN(document.getElementById('fullpage-quote-base-fuel-price')?.value) || 21000;
    const step = parseNumberVN(document.getElementById('fullpage-quote-fuel-step')?.value) || 1000;
    const ratio = parseFloat(document.getElementById('fullpage-quote-fuel-ratio')?.value) || 3.5;
    const formulaEl = document.getElementById('fullpage-quote-fuel-formula-display');
    if (formulaEl) {
        formulaEl.innerText = `Mỗi khi giá dầu DO 0.05S Petrolimex thay đổi ${new Intl.NumberFormat('vi-VN').format(step)} đ/lít so với giá cơ sở (${new Intl.NumberFormat('vi-VN').format(basePrice)} đ), đơn giá cước vận chuyển sẽ điều chỉnh tăng/giảm tương ứng ${ratio}%.`;
    }
}

function setFullpageQuickQuoteNote(type) {
    const noteEl = document.getElementById('fullpage-quote-notes');
    if (noteEl && DEFAULT_QUOTATION_NOTES[type]) {
        noteEl.value = DEFAULT_QUOTATION_NOTES[type];
    }
}

function addFullpageQuotationRouteRow(data = {}) {
    const tbody = document.getElementById('fullpage-quote-routes-tbody');
    if (!tbody) return;

    const rowIdx = tbody.children.length + 1;
    const routeDesc = data.route_description || data.route || '';
    const cargoType = data.cargo_type || document.getElementById('fullpage-quote-cargo-type')?.value || 'Cont 40HC';
    const estKm = data.estimated_km !== undefined ? data.estimated_km : 30;
    const unitPrice = data.unit_price !== undefined ? data.unit_price : 0;
    const trips = data.expected_trips_monthly !== undefined ? data.expected_trips_monthly : (data.monthly_trips || 20);
    const lineTotal = Number(unitPrice) * Number(trips);

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50/80 transition-colors fullpage-quote-route-row';
    tr.innerHTML = `
        <td class="p-3 text-center font-bold text-slate-500 fullpage-row-stt">${rowIdx}</td>
        <td class="p-3">
            <input type="text" value="${escapeHtml(routeDesc)}" placeholder="VD: CÁT LÁI ➔ KCN VSIP 2 BÌNH DƯƠNG" required
                class="fullpage-item-route w-full h-8.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-teal-600 font-bold text-slate-900 text-xs">
        </td>
        <td class="p-3">
            <select class="fullpage-item-cargo w-full h-8.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:border-teal-600">
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
        <td class="p-3 text-center">
            <input type="number" step="10" min="0" value="${estKm}" 
                class="fullpage-item-km w-20 h-8.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-teal-600 font-bold text-slate-800 text-xs text-center tabular-nums">
        </td>
        <td class="p-3 text-right">
            <input type="text" inputmode="numeric" value="${formatNumberVN(unitPrice)}" oninput="calculateFullpageQuotationItemsTotal()" placeholder="0"
                class="fullpage-item-price input-number-vn w-32 h-8.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-teal-600 font-mono font-bold text-teal-800 text-xs text-right tabular-nums">
        </td>
        <td class="p-3 text-center">
            <input type="text" inputmode="numeric" value="${formatNumberVN(trips)}" oninput="calculateFullpageQuotationItemsTotal()" placeholder="1"
                class="fullpage-item-trips input-number-vn w-24 h-8.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-teal-600 font-mono font-bold text-slate-800 text-xs text-center tabular-nums">
        </td>
        <td class="p-3 text-right font-black text-teal-900 font-mono tabular-nums fullpage-item-line-total text-xs">
            ${new Intl.NumberFormat('vi-VN').format(lineTotal)} đ
        </td>
        <td class="p-3 text-center">
            <button type="button" onclick="removeFullpageQuotationRouteRow(this)" title="Xóa tuyến này"
                class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer">
                <i class="ph-bold ph-trash text-sm"></i>
            </button>
        </td>
    `;
    tbody.appendChild(tr);

    const priceInput = tr.querySelector('.fullpage-item-price');
    const tripsInput = tr.querySelector('.fullpage-item-trips');
    if (priceInput) attachAutoNumberFormat(priceInput, () => calculateFullpageQuotationItemsTotal());
    if (tripsInput) attachAutoNumberFormat(tripsInput, () => calculateFullpageQuotationItemsTotal());

    calculateFullpageQuotationItemsTotal();
}

function removeFullpageQuotationRouteRow(button) {
    if (!confirm('Bạn có chắc chắn muốn xóa dòng tuyến báo giá này?')) return;
    const tbody = document.getElementById('fullpage-quote-routes-tbody');
    if (!tbody) return;
    const tr = button.closest('tr');
    if (tr) tr.remove();

    if (tbody.children.length === 0) {
        addFullpageQuotationRouteRow({ route_description: '', unit_price: 0, expected_trips_monthly: 0 });
    } else {
        Array.from(tbody.children).forEach((row, idx) => {
            const sttEl = row.querySelector('.fullpage-row-stt');
            if (sttEl) sttEl.innerText = idx + 1;
        });
        calculateFullpageQuotationItemsTotal();
    }
}

function calculateFullpageQuotationItemsTotal() {
    const tbody = document.getElementById('fullpage-quote-routes-tbody');
    if (!tbody) return;

    let totalRevenue = 0;
    let totalTrips = 0;
    const rows = Array.from(tbody.querySelectorAll('tr.fullpage-quote-route-row'));

    rows.forEach(row => {
        const priceInput = row.querySelector('.fullpage-item-price');
        const tripsInput = row.querySelector('.fullpage-item-trips');
        const lineTotalEl = row.querySelector('.fullpage-item-line-total');

        const price = parseNumberVN(priceInput?.value) || 0;
        const trips = parseNumberVN(tripsInput?.value) || 0;
        const lineTotal = price * trips;

        if (lineTotalEl) {
            lineTotalEl.innerText = `${new Intl.NumberFormat('vi-VN').format(lineTotal)} đ`;
        }
        totalRevenue += lineTotal;
        totalTrips += trips;
    });

    const badgeEl = document.getElementById('fullpage-quote-routes-count-badge');
    if (badgeEl) badgeEl.innerText = `${rows.length} tuyến`;

    const tripsLabel = document.getElementById('fullpage-quote-total-trips-label');
    if (tripsLabel) tripsLabel.innerText = `${new Intl.NumberFormat('vi-VN').format(totalTrips)} chuyến/tháng`;

    const revEl = document.getElementById('fullpage-quote-preview-revenue');
    if (revEl) {
        revEl.innerText = `${new Intl.NumberFormat('vi-VN').format(totalRevenue)} đ`;
    }
}

function setFullpageSaveButtonState(btnId, isEnabled) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (isEnabled) {
        btn.disabled = false;
        btn.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
        btn.classList.add('bg-teal-700', 'hover:bg-teal-800', 'cursor-pointer');
    } else {
        btn.disabled = true;
        btn.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
        btn.classList.remove('hover:bg-teal-800', 'cursor-pointer');
    }
}
window.setFullpageSaveButtonState = setFullpageSaveButtonState;

async function openCreateQuotationPage(updateHistory = true) {
    await loadMasterDataFormOptions();
    populateMasterDataDropdowns();

    const form = document.getElementById('form-fullpage-quotation');
    if (form) {
        form.reset();
        form.querySelectorAll('input, select, textarea, button').forEach(el => el.disabled = false);
    }

    const routesTbody = document.getElementById('fullpage-quote-routes-tbody');
    if (routesTbody) routesTbody.innerHTML = '';

    const idInput = document.getElementById('fullpage-quote-id');
    const hashidInput = document.getElementById('fullpage-quote-hashid');
    const codeEl = document.getElementById('fullpage-quote-code');
    const statusBadge = document.getElementById('fullpage-quote-status-badge');
    const pricingBadge = document.getElementById('fullpage-quote-pricing-badge');
    const headerCustEl = document.getElementById('fullpage-quote-header-customer');
    const dateEl = document.getElementById('fullpage-quote-date');

    currentActiveFullpageQuotation = null;
    if (idInput) idInput.value = '';
    if (hashidInput) hashidInput.value = '';
    if (codeEl) codeEl.innerText = 'Tạo Báo giá';
    if (statusBadge) statusBadge.classList.add('hidden');
    if (pricingBadge) pricingBadge.classList.add('hidden');
    if (headerCustEl) headerCustEl.innerText = 'Chưa chọn khách hàng';
    if (dateEl) {
        dateEl.innerText = new Date().toLocaleDateString('vi-VN');
    }

    // Ở chế độ Tạo Mới: Ẩn Xóa, In, Sửa; Nút Lưu sáng lên
    const delBtn = document.getElementById('btn-fullpage-delete-quote-bottom');
    if (delBtn) delBtn.classList.add('hidden');
    const printBtn = document.getElementById('btn-fullpage-print-quote-bottom');
    if (printBtn) printBtn.classList.add('hidden');
    const editBtn = document.getElementById('btn-fullpage-edit-quote-bottom');
    if (editBtn) editBtn.classList.add('hidden');
    setFullpageSaveButtonState('btn-fullpage-save-quote-bottom', true);

    // Cập nhật URL chuẩn Semantic Path: /sales/quotations/new
    if (updateHistory && window.history && window.history.pushState) {
        const quotePath = '/sales/quotations/new';
        if (window.location.pathname !== quotePath) {
            window.history.pushState({ view: 'quotation-create' }, '', quotePath);
        }
    }

    // Lưu vết view trước đó để nút Quay lại hoạt động chuẩn xác
    const currentActiveView = document.querySelector('.view:not(.hidden-view)');
    if (currentActiveView && currentActiveView.id !== 'view-quotation-detail') {
        previousActiveTab = currentActiveView.id.replace('view-', '');
    }

    // Ẩn tất cả view, hiện view-quotation-detail
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden-view'));
    const detailView = document.getElementById('view-quotation-detail');
    if (detailView) detailView.classList.remove('hidden-view');

    setTopbarFullpageMode({
        backFn: backToQuotations,
        prefix: 'Sale & Booking',
        title: 'Tạo Mới Báo Giá',
        subText: '',
        badgesHtml: '',
        actionsHtml: ''
    });

    // Thiết lập giá trị mặc định cho form tạo mới
    const methodEl = document.getElementById('fullpage-quote-pricing-method');
    if (methodEl) methodEl.value = 'MULTI_ROUTE';

    const p0Input = document.getElementById('fullpage-quote-base-fuel-price');
    if (p0Input) p0Input.value = formatNumberVN(21000);
    const stepInput = document.getElementById('fullpage-quote-fuel-step');
    if (stepInput) stepInput.value = formatNumberVN(1000);
    const ratioInput = document.getElementById('fullpage-quote-fuel-ratio');
    if (ratioInput) ratioInput.value = 3.5;

    onFullpageQuotationPricingMethodChange('MULTI_ROUTE');

    const statusEl = document.getElementById('fullpage-quote-status');
    if (statusEl) statusEl.value = 'SENT';

    const tplEl = document.getElementById('fullpage-quote-template-type');
    if (tplEl) tplEl.value = 'STANDARD';
    const cargoEl = document.getElementById('fullpage-quote-cargo-type');
    if (cargoEl) cargoEl.value = 'Container 40HC / Hàng tổng hợp';
    const notesEl = document.getElementById('fullpage-quote-notes');
    if (notesEl) notesEl.value = DEFAULT_QUOTATION_NOTES.fcl;

    // Mặc định thêm 1 dòng mẫu
    addFullpageQuotationRouteRow({
        route_description: 'CÁT LÁI ➔ KCN VSIP 2 BÌNH DƯƠNG',
        cargo_type: 'Cont 40HC',
        estimated_km: 30,
        unit_price: 0,
        expected_trips_monthly: 0
    });

    initAllNumberInputs();
}

async function viewQuotationDetail(quoteIdentifier, updateHistory = true) {
    if (!quoteIdentifier || quoteIdentifier === 'new') {
        return openCreateQuotationPage(updateHistory);
    }
    await loadMasterDataFormOptions();
    populateMasterDataDropdowns();

    const form = document.getElementById('form-fullpage-quotation');
    if (form) form.reset();

    const routesTbody = document.getElementById('fullpage-quote-routes-tbody');
    if (routesTbody) routesTbody.innerHTML = '';

    const idInput = document.getElementById('fullpage-quote-id');
    const hashidInput = document.getElementById('fullpage-quote-hashid');
    const codeEl = document.getElementById('fullpage-quote-code');
    const statusBadge = document.getElementById('fullpage-quote-status-badge');
    const customerEl = document.getElementById('fullpage-quote-customer');
    const dateEl = document.getElementById('fullpage-quote-date');

    if (codeEl) codeEl.innerText = 'Đang tải...';
    if (statusBadge) statusBadge.innerText = 'Vui lòng chờ';

    try {
        const res = await fetchWithAuth(`/api/quotations/${quoteIdentifier}/`);
        if (!res.ok) throw new Error('Không thể tải chi tiết báo giá');
        const q = await res.json();
        currentActiveFullpageQuotation = q;

        const quoteHash = q.hashid || q.id;
        if (idInput) idInput.value = q.id;
        if (hashidInput) hashidInput.value = quoteHash;
        if (codeEl) codeEl.innerText = q.quotation_code || `BG-${q.id}`;
        const headerCustEl = document.getElementById('fullpage-quote-header-customer');
        if (headerCustEl) headerCustEl.innerText = q.customer_name || '...';
        if (dateEl) dateEl.innerText = q.created_at || '--/--/----';

        // Cập nhật URL chuẩn Semantic Path kèm HashID bảo mật: /sales/quotations/<hashid>
        if (updateHistory && window.history && window.history.pushState) {
            const quotePath = `/sales/quotations/${quoteHash}`;
            if (window.location.pathname !== quotePath) {
                window.history.pushState({ view: 'quotation-detail', quoteIdentifier: quoteHash }, '', quotePath);
            }
        }

        // Lưu vết view trước đó để nút Quay lại hoạt động chuẩn xác
        const currentActiveView = document.querySelector('.view:not(.hidden-view)');
        if (currentActiveView && currentActiveView.id !== 'view-quotation-detail') {
            previousActiveTab = currentActiveView.id.replace('view-', '');
        }

        // Ẩn tất cả view, hiện view-quotation-detail
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden-view'));
        const detailView = document.getElementById('view-quotation-detail');
        if (detailView) detailView.classList.remove('hidden-view');

        setTopbarFullpageMode({
            backFn: backToQuotations,
            prefix: 'Sale & Booking',
            title: `Báo Giá | ${q.quotation_code || ('BG-' + q.id)}`,
            subText: '',
            badgesHtml: '',
            actionsHtml: ''
        });

        // Điền dữ liệu vào form
        if (customerEl) setSelectValueCaseInsensitive(customerEl, q.customer_name);

        const methodEl = document.getElementById('fullpage-quote-pricing-method');
        if (methodEl) methodEl.value = q.pricing_method || 'MULTI_ROUTE';

        const p0Input = document.getElementById('fullpage-quote-base-fuel-price');
        if (p0Input) p0Input.value = formatNumberVN(q.base_fuel_price || 21000);
        const stepInput = document.getElementById('fullpage-quote-fuel-step');
        if (stepInput) stepInput.value = formatNumberVN(q.fuel_step_vnd || 1000);
        const ratioInput = document.getElementById('fullpage-quote-fuel-ratio');
        if (ratioInput) ratioInput.value = q.fuel_ratio_percent || 3.5;

        onFullpageQuotationPricingMethodChange(q.pricing_method || 'MULTI_ROUTE');

        const statusEl = document.getElementById('fullpage-quote-status');
        if (statusEl) statusEl.value = q.status;

        // Cập nhật badge trạng thái trên topbar
        if (statusBadge) {
            statusBadge.classList.remove('hidden');
            statusBadge.innerText = q.status_display || q.status;
            const st = (q.status_raw || q.status || '').toUpperCase();
            let badgeCls = 'bg-slate-50 text-slate-800 border-slate-200';
            if (st === 'APPROVED') {
                badgeCls = 'bg-emerald-50 text-emerald-800 border-emerald-200';
            } else if (st === 'PENDING_APPROVAL') {
                badgeCls = 'bg-indigo-50 text-indigo-800 border-indigo-200';
            } else if (st === 'NEGOTIATING') {
                badgeCls = 'bg-amber-50 text-amber-800 border-amber-200';
            } else if (st === 'SENT') {
                badgeCls = 'bg-sky-50 text-sky-800 border-sky-200';
            } else if (['REJECTED', 'EXPIRED'].includes(st)) {
                badgeCls = 'bg-rose-50 text-rose-800 border-rose-200';
            }
            statusBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider font-heading ' + badgeCls;
        }
        const pricingBadge = document.getElementById('fullpage-quote-pricing-badge');
        if (pricingBadge) {
            pricingBadge.classList.remove('hidden');
        }

        const tplEl = document.getElementById('fullpage-quote-template-type');
        if (tplEl) tplEl.value = q.template_type || 'STANDARD';
        const cargoEl = document.getElementById('fullpage-quote-cargo-type');
        if (cargoEl) cargoEl.value = q.cargo_type || 'Container 40HC / Hàng tổng hợp';
        const contactPersonEl = document.getElementById('fullpage-quote-contact-person');
        if (contactPersonEl) contactPersonEl.value = q.contact_person || '';
        const contactPhoneEl = document.getElementById('fullpage-quote-contact-phone');
        if (contactPhoneEl) contactPhoneEl.value = q.contact_phone || '';
        const contactEmailEl = document.getElementById('fullpage-quote-contact-email');
        if (contactEmailEl) contactEmailEl.value = q.contact_email || '';
        const validUntilEl = document.getElementById('fullpage-quote-valid-until');
        if (validUntilEl) validUntilEl.value = q.valid_until || '';
        const notesEl = document.getElementById('fullpage-quote-notes');
        if (notesEl) notesEl.value = q.notes || DEFAULT_QUOTATION_NOTES.fcl;

        if (q.items && q.items.length > 0) {
            q.items.forEach(it => addFullpageQuotationRouteRow(it));
        } else {
            addFullpageQuotationRouteRow({
                route_description: q.route_description,
                cargo_type: q.cargo_type || 'Cont 40HC',
                estimated_km: q.estimated_km || 30,
                unit_price: q.unit_price || 0,
                expected_trips_monthly: q.expected_trips_monthly || 10
            });
        }

        // CHẾ ĐỘ XEM BẢN GHI ĐÃ CÓ:
        // 1. Khóa toàn bộ các input/select/textarea của form
        if (form) {
            form.querySelectorAll('input, select, textarea').forEach(el => el.disabled = true);
            form.querySelectorAll('button:not(#btn-fullpage-edit-quote-bottom):not(#btn-fullpage-delete-quote-bottom):not(#btn-fullpage-print-quote-bottom):not([onclick*="backToQuotations"]):not([onclick*="printQuotation"])').forEach(el => el.disabled = true);
        }
        // 2. Hiển thị đủ bộ nút Xóa, In, Sửa
        const delBtn = document.getElementById('btn-fullpage-delete-quote-bottom');
        if (delBtn) {
            delBtn.classList.remove('hidden');
            delBtn.disabled = false;
        }
        const printBtn = document.getElementById('btn-fullpage-print-quote-bottom');
        if (printBtn) {
            printBtn.classList.remove('hidden');
            printBtn.disabled = false;
        }
        const editBtn = document.getElementById('btn-fullpage-edit-quote-bottom');
        if (editBtn) {
            editBtn.classList.remove('hidden');
            editBtn.disabled = false;
        }
        // 3. Nút Lưu mờ đi, chỉ sáng lên khi người dùng bấm Sửa
        setFullpageSaveButtonState('btn-fullpage-save-quote-bottom', false);

        initAllNumberInputs();
    } catch (err) {
        console.error('Lỗi tải chi tiết báo giá trang riêng:', err);
        showToast('error', 'Không thể tải thông tin báo giá', 'Lỗi');
        backToQuotations();
    }
}

function onFullpageQuoteCustomerChange() {
    const sel = document.getElementById('fullpage-quote-customer');
    const headerCust = document.getElementById('fullpage-quote-header-customer');
    const topbarCust = document.getElementById('topbar-quote-customer');
    if (sel) {
        const text = sel.options[sel.selectedIndex]?.text || '';
        const custName = (text && !text.startsWith('--')) ? text : 'Chưa chọn khách hàng';
        if (headerCust) headerCust.innerText = custName;
        if (topbarCust) topbarCust.innerText = custName;
    }
}

function backToQuotations() {
    const detailView = document.getElementById('view-quotation-detail');
    if (detailView) detailView.classList.add('hidden-view');

    if (previousActiveTab && previousActiveTab !== 'quotation-detail') {
        switchTab(previousActiveTab, true);
    } else {
        switchTab('kinh-doanh', true);
    }
}

function copyQuotationPageLink() {
    const quoteHash = document.getElementById('fullpage-quote-hashid')?.value || document.getElementById('fullpage-quote-id')?.value;
    if (!quoteHash) {
        showToast('warning', 'Báo giá chưa được lưu để lấy liên kết chia sẻ. Vui lòng bấm "Lưu" trước!', 'Cảnh Báo');
        return;
    }
    const fullUrl = `${window.location.origin}/sales/quotations/${quoteHash}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
        showToast('success', `Đã sao chép link báo giá:\n${fullUrl}`, 'Thành Công');
    }).catch(() => {
        prompt('Sao chép link báo giá:', fullUrl);
    });
}

function printQuotationFromFullPage() {
    const id = document.getElementById('fullpage-quote-id')?.value;
    const customerSelect = document.getElementById('fullpage-quote-customer');
    const customerName = customerSelect?.value ? (customerSelect.options[customerSelect.selectedIndex]?.text || customerSelect.value) : '';

    // Lấy danh sách các tuyến đường từ bảng trên form
    const rows = Array.from(document.querySelectorAll('#fullpage-quote-routes-tbody tr.fullpage-quote-route-row'));
    const items = [];
    rows.forEach(row => {
        const route = row.querySelector('.fullpage-item-route')?.value?.trim();
        const cargo = row.querySelector('.fullpage-item-cargo')?.value?.trim() || 'Container 40HC';
        const km = parseInt(row.querySelector('.fullpage-item-km')?.value) || 0;
        const price = parseNumberVN(row.querySelector('.fullpage-item-price')?.value) || 0;
        const trips = parseNumberVN(row.querySelector('.fullpage-item-trips')?.value) || 1;
        if (route || price > 0) {
            items.push({
                route_description: route || 'Tuyến vận chuyển',
                cargo_type: cargo,
                estimated_km: km,
                unit_price: price,
                expected_trips_monthly: trips
            });
        }
    });

    // Nếu đang ở màn hình tạo mới (hoặc không có id trong DB)
    if (!id || !currentActiveFullpageQuotation) {
        if (!customerName || customerName.startsWith('--')) {
            showToast('warning', 'Vui lòng chọn Khách Hàng trước khi xem và in báo giá!', 'Cần Chọn Khách Hàng');
            customerSelect?.focus();
            return;
        }
        if (items.length === 0) {
            showToast('warning', 'Vui lòng nhập ít nhất 1 tuyến đường có đơn giá cước để xem và in!', 'Thiếu Tuyến Đường');
            return;
        }

        // Tìm thêm thông tin chi tiết khách hàng từ master data cache nếu có
        let customerInfo = null;
        if (window.masterDataCache?.customers && Array.isArray(window.masterDataCache.customers)) {
            customerInfo = window.masterDataCache.customers.find(c => c.name === customerSelect.value || c.short_name === customerSelect.value);
        }

        const draftQuote = {
            id: 'draft',
            quotation_code: 'BG-DRAFT (BẢN XEM TRƯỚC)',
            created_at: new Date().toISOString(),
            date: new Date().toLocaleDateString('vi-VN'),
            customer_name: customerName,
            customer_tax_code: customerInfo?.tax_code || '',
            customer_address: customerInfo?.address || '',
            pricing_method: document.getElementById('fullpage-quote-pricing-method')?.value || 'MULTI_ROUTE',
            base_fuel_price: parseNumberVN(document.getElementById('fullpage-quote-base-fuel-price')?.value) || 21000,
            fuel_step_vnd: parseNumberVN(document.getElementById('fullpage-quote-fuel-step')?.value) || 1000,
            fuel_ratio_percent: parseFloat(document.getElementById('fullpage-quote-fuel-ratio')?.value) || 3.5,
            cargo_type: document.getElementById('fullpage-quote-cargo-type')?.value || 'Container 40HC / Hàng tổng hợp',
            contact_person: document.getElementById('fullpage-quote-contact-person')?.value?.trim() || '',
            contact_phone: document.getElementById('fullpage-quote-contact-phone')?.value?.trim() || '',
            contact_email: document.getElementById('fullpage-quote-contact-email')?.value?.trim() || '',
            valid_until: document.getElementById('fullpage-quote-valid-until')?.value || '',
            notes: document.getElementById('fullpage-quote-notes')?.value || '',
            template_type: document.getElementById('fullpage-quote-template-type')?.value || 'STANDARD',
            items: items,
            unit_price: items[0]?.unit_price || 0,
            route_description: items[0]?.route_description || '',
            estimated_km: items[0]?.estimated_km || 0,
            expected_trips_monthly: items[0]?.expected_trips_monthly || 1
        };

        openQuotationPrintModal(draftQuote);
        return;
    }

    // Nếu đã có báo giá trong DB
    if (currentActiveFullpageQuotation) {
        openQuotationPrintModal(currentActiveFullpageQuotation);
    } else if (id) {
        openQuotationPrintModal(id);
    }
}

function enableFullpageQuotationEdit() {
    const form = document.getElementById('form-fullpage-quotation');
    if (form) {
        form.querySelectorAll('input, select, textarea, button').forEach(el => el.disabled = false);
    }
    const editBtn = document.getElementById('btn-fullpage-edit-quote-bottom');
    if (editBtn) editBtn.classList.add('hidden');
    setFullpageSaveButtonState('btn-fullpage-save-quote-bottom', true);
    const codeEl = document.getElementById('fullpage-quote-code');
    if (codeEl && !codeEl.innerText.includes('Hiệu Chỉnh') && !codeEl.innerText.includes('Sửa')) {
        showToast('info', 'Đã chuyển sang chế độ Sửa Báo giá. Bạn có thể thay đổi thông tin và bấm Lưu.', 'Chế Độ Sửa');
    }
}
window.enableFullpageQuotationEdit = enableFullpageQuotationEdit;

function enableFullpageBookingEdit() {
    const form = document.getElementById('form-fullpage-booking');
    if (form) {
        form.querySelectorAll('input, select, textarea, button').forEach(el => el.disabled = false);
    }
    const editBtn = document.getElementById('btn-fullpage-edit-booking-bottom');
    if (editBtn) editBtn.classList.add('hidden');
    setFullpageSaveButtonState('btn-fullpage-save-booking-bottom', true);
    if (typeof onFullpageBookingTypeChange === 'function') onFullpageBookingTypeChange();
    showToast('info', 'Đã chuyển sang chế độ Sửa Đơn Hàng / Booking. Bạn có thể thay đổi thông tin và bấm Lưu.', 'Chế Độ Sửa');
}
window.enableFullpageBookingEdit = enableFullpageBookingEdit;


async function saveFullpageQuotation(e) {
    if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
    }
    const id = document.getElementById('fullpage-quote-id')?.value;
    const customer = document.getElementById('fullpage-quote-customer')?.value?.trim();
    const pricingMethod = document.getElementById('fullpage-quote-pricing-method')?.value || 'MULTI_ROUTE';
    const baseFuelPrice = parseNumberVN(document.getElementById('fullpage-quote-base-fuel-price')?.value) || 21000;
    const fuelStep = parseNumberVN(document.getElementById('fullpage-quote-fuel-step')?.value) || 1000;
    const fuelRatio = parseFloat(document.getElementById('fullpage-quote-fuel-ratio')?.value) || 3.5;
    const statusVal = document.getElementById('fullpage-quote-status')?.value || 'NEGOTIATING';
    const templateType = document.getElementById('fullpage-quote-template-type')?.value || 'STANDARD';
    const cargoType = document.getElementById('fullpage-quote-cargo-type')?.value || 'Container 40HC / Hàng tổng hợp';
    const contactPerson = document.getElementById('fullpage-quote-contact-person')?.value?.trim() || '';
    const contactPhone = document.getElementById('fullpage-quote-contact-phone')?.value?.trim() || '';
    const contactEmail = document.getElementById('fullpage-quote-contact-email')?.value?.trim() || '';
    const validUntil = document.getElementById('fullpage-quote-valid-until')?.value || '';
    const notes = document.getElementById('fullpage-quote-notes')?.value || '';

    if (!customer) {
        showToast('warning', 'Vui lòng chọn khách hàng hợp lệ trong danh mục!', 'Thiếu Thông Tin');
        document.getElementById('fullpage-quote-customer')?.focus();
        return;
    }

    const rows = Array.from(document.querySelectorAll('#fullpage-quote-routes-tbody tr.fullpage-quote-route-row'));
    const items = [];
    rows.forEach(row => {
        const route = row.querySelector('.fullpage-item-route')?.value?.trim();
        const cargo = row.querySelector('.fullpage-item-cargo')?.value || cargoType;
        const km = parseInt(row.querySelector('.fullpage-item-km')?.value) || 0;
        const price = parseNumberVN(row.querySelector('.fullpage-item-price')?.value) || 0;
        const trips = parseNumberVN(row.querySelector('.fullpage-item-trips')?.value) || 1;

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

    const submitBtn = document.getElementById('btn-fullpage-save-quote-bottom') || document.getElementById('btn-fullpage-save-quote');
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
        // Làm mới dữ liệu ngầm
        if (typeof loadSalesData === 'function') loadSalesData();

        // Cập nhật lại view với dữ liệu mới
        const targetId = id || data.quotation_id;
        if (targetId) {
            viewQuotationDetail(targetId, true);
        } else {
            backToQuotations();
        }
    } catch (err) {
        console.error('Lỗi lưu báo giá trang riêng:', err);
        showToast('error', err.message || 'Không thể lưu báo giá', 'Lỗi');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHtml;
        }
    }
}

// =========================================================================
// CHUẨN HÓA BỘ 4 NÚT & IN TRỰC TIẾP (QUOTATION, BOOKING, CUSTOMS, EMPLOYEE)
// =========================================================================

/**
 * 1. BÁO GIÁ: In trực tiếp từ bảng danh sách mà không chuyển view
 */
async function openDirectPrintQuotation(quoteIdentifier) {
    if (!quoteIdentifier) return;
    try {
        await openQuotationPrintModal(quoteIdentifier);
        printQuotationVoucher();
    } catch (e) {
        console.error('Lỗi in nhanh báo giá:', e);
        showToast('error', 'Không thể mở lệnh in nhanh báo giá', 'Lỗi In');
    }
}
window.openDirectPrintQuotation = openDirectPrintQuotation;

/**
 * Xác nhận xóa báo giá đang mở trong form chi tiết
 */
function confirmDeleteCurrentQuotation() {
    const id = document.getElementById('fullpage-quote-id')?.value;
    if (!id) {
        showToast('warning', 'Chưa có báo giá nào được lưu để xóa!', 'Thông Báo');
        return;
    }
    deleteQuotation(id);
}
window.confirmDeleteCurrentQuotation = confirmDeleteCurrentQuotation;
