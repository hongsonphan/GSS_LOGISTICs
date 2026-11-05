// ==============================================================================
// 10. PHÂN HỆ DỊCH VỤ HẢI QUAN & THÔNG QUAN ĐIỆN TỬ (VNACCS/VCIS CONTROLLER)
// ==============================================================================
let customsDeclarationsCache = [];
let customsSearchDebounceTimeout = null;

function filterCustomsChannel(laneOrStatus) {
    const laneSelect = document.getElementById('customs-filter-lane');
    const statusSelect = document.getElementById('customs-filter-status');
    if (laneOrStatus === 'CLEARED') {
        if (laneSelect) laneSelect.value = '';
        if (statusSelect) statusSelect.value = 'CLEARED';
    } else {
        if (laneSelect) laneSelect.value = laneOrStatus || '';
        if (statusSelect) statusSelect.value = '';
    }
    fetchCustomsDeclarations();
}

function debounceCustomsSearch() {
    clearTimeout(customsSearchDebounceTimeout);
    customsSearchDebounceTimeout = setTimeout(() => {
        fetchCustomsDeclarations();
    }, 300);
}

async function fetchCustomsDeclarations() {
    const q = document.getElementById('customs-filter-q')?.value?.trim() || '';
    const lane = document.getElementById('customs-filter-lane')?.value || '';
    const status = document.getElementById('customs-filter-status')?.value || '';
    const direction = document.getElementById('customs-filter-direction')?.value || '';
    const tax = document.getElementById('customs-filter-tax')?.value || '';

    const tbody = document.getElementById('customs-table-body');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="py-12 text-center text-slate-400">
                    <i class="ph-bold ph-spinner animate-spin text-2xl text-teal-600 mb-2"></i>
                    <p class="text-xs font-medium">Đang tải dữ liệu tờ khai hải quan VNACCS...</p>
                </td>
            </tr>
        `;
    }

    try {
        const params = new URLSearchParams();
        if (q) params.append('q', q);
        if (lane) params.append('lane', lane);
        if (status) params.append('status', status);
        if (direction) params.append('direction', direction);
        if (tax !== '') params.append('is_tax_paid', tax);
        const custPeriod = document.getElementById('customs-filter-period')?.value || 'this_month';
        if (custPeriod !== 'all') {
            const dateRange = getDateRangeForPeriod(custPeriod);
            params.append('from_date', dateRange.fromDate);
            params.append('to_date', dateRange.toDate);
        }

        const globalDates = getDateRangeForPeriod(currentDashboardPeriod, currentDashboardCustomStart, currentDashboardCustomEnd);
        if (globalDates.fromDate) params.append('from_date', globalDates.fromDate);
        if (globalDates.toDate) params.append('to_date', globalDates.toDate);

        const res = await fetchWithAuth(`/api/customs/declarations/?${params.toString()}`);
        if (!res.ok) throw new Error('Không thể tải dữ liệu hải quan');
        const data = await res.json();
        
        customsDeclarationsCache = data.results || [];
        renderCustomsKPIs(data.stats || {});
        renderCustomsTable(customsDeclarationsCache);
    } catch (err) {
        console.error('Error fetching customs data:', err);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="py-8 text-center text-rose-500 text-xs font-bold">
                        <i class="ph-bold ph-warning-circle text-xl mb-1"></i>
                        <p>Không thể kết nối đến máy chủ hải quan: ${err.message}</p>
                    </td>
                </tr>
            `;
        }
    }
}

function renderCustomsKPIs(stats) {
    if (!stats) return;
    const setTxt = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.innerText = val; };

    setTxt('customs-kpi-total', stats.total || 0);
    setTxt('customs-card-total-line1', stats.card_total?.line_1);
    setTxt('customs-card-total-line2', stats.card_total?.line_2);

    setTxt('customs-kpi-green', stats.green_count || 0);
    setTxt('customs-card-green-line1', stats.card_green?.line_1);
    setTxt('customs-card-green-line2', stats.card_green?.line_2);

    setTxt('customs-kpi-yellow', stats.yellow_count || 0);
    setTxt('customs-card-yellow-line1', stats.card_yellow?.line_1);
    setTxt('customs-card-yellow-line2', stats.card_yellow?.line_2);

    setTxt('customs-kpi-red', stats.red_count || 0);
    setTxt('customs-card-red-line1', stats.card_red?.line_1);
    setTxt('customs-card-red-line2', stats.card_red?.line_2);

    setTxt('customs-kpi-rate-val', `${stats.clearance_rate || 0}%`);
    setTxt('customs-kpi-rate', `Tỷ lệ thông quan: ${stats.clearance_rate || 0}%`);
    setTxt('customs-card-clearance-line1', stats.card_clearance?.line_1);
    setTxt('customs-card-clearance-line2', stats.card_clearance?.line_2);
}

function renderCustomsTable(list) {
    const tbody = document.getElementById('customs-table-body');
    const footerCount = document.getElementById('customs-footer-count');
    if (!tbody) return;

    if (footerCount) footerCount.innerText = `Hiển thị ${list.length} tờ khai`;

    if (!list || list.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="py-12 text-center text-slate-400">
                    <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-400">
                        <i class="ph-bold ph-file-x text-2xl"></i>
                    </div>
                    <p class="text-xs font-medium text-slate-600">Không tìm thấy tờ khai hải quan phù hợp</p>
                    <p class="text-[11px] text-slate-400 mt-0.5">Bấm nút "Đăng Ký Tờ Khai Mới" để tạo hồ sơ thông quan</p>
                </td>
            </tr>
        `;
        return;
    }

    const laneBadges = {
        'GREEN': '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>Luồng Xanh</span>',
        'YELLOW': '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>Luồng Vàng</span>',
        'RED': '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>Luồng Đỏ</span>',
    };

    const statusBadges = {
        'DRAFT': '<span class="text-xs font-bold text-slate-600 uppercase">Chờ truyền TK</span>',
        'SUBMITTED': '<span class="text-xs font-bold text-blue-700 uppercase">Đã đăng ký</span>',
        'PROCESSING': '<span class="text-xs font-bold text-amber-700 uppercase">Đang thẩm định</span>',
        'INSPECTION': '<span class="text-xs font-bold text-purple-700 uppercase">Kiểm hóa bãi/cảng</span>',
        'CLEARED': '<span class="text-xs font-bold text-emerald-700 uppercase">Đã thông quan</span>',
        'RELEASED': '<span class="text-xs font-bold text-teal-800 uppercase">Đã qua giám sát</span>',
        'CANCELLED': '<span class="text-xs font-bold text-rose-700 uppercase">Hủy tờ khai</span>',
    };

    tbody.innerHTML = list.map((d, index) => {
        const laneHtml = laneBadges[d.customs_lane] || d.customs_lane;
        const statusHtml = statusBadges[d.status] || d.status;
        const taxBadge = d.is_tax_paid 
            ? `<button onclick="quickToggleCustomsTax(${d.id})" class="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer" title="Bấm để đổi trạng thái thuế">Đã nộp</button>`
            : `<button onclick="quickToggleCustomsTax(${d.id})" class="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer" title="Bấm để đổi trạng thái thuế">Chưa nộp</button>`;
        
        const docBtn = d.document_url
            ? `<a href="${d.document_url}" target="_blank" class="p-1 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded transition-colors" title="Xem tệp tờ khai"><i class="ph-bold ph-file-pdf text-sm"></i></a>`
            : '';

        const tripBadge = d.trip_code 
            ? `<a href="javascript:void(0)" onclick="viewTripDetail('${d.trip_code}')" class="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-teal-50 text-teal-800 font-mono font-bold text-[11px] hover:bg-teal-100 border border-teal-200">
                <i class="ph-bold ph-truck text-xs"></i>
                <span>${d.trip_code}</span>
               </a>`
            : `<span class="text-slate-400 text-xs italic">Chưa gán xe</span>`;

        const clearBtn = (d.status !== 'CLEARED' && d.status !== 'RELEASED')
            ? `<button onclick="quickSetCustomsStatus(${d.id}, 'set_cleared')" class="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors cursor-pointer" title="Xác nhận Thông quan nhanh"><i class="ph-bold ph-check-circle text-sm"></i></button>`
            : '';

        return `
            <tr class="hover:bg-teal-50/40 transition-colors border-b border-slate-200/80">
                <td class="py-2.5 px-3 text-center text-xs font-bold text-slate-500 border-r border-slate-200">${index + 1}</td>
                <td class="py-2.5 px-3 border-r border-slate-200">
                    <div class="font-mono font-bold text-teal-900 text-xs">${d.declaration_number}</div>
                    <div class="flex items-center space-x-1.5 mt-0.5">
                        <span class="text-[11px] font-bold text-slate-700 uppercase">${d.declaration_type}</span>
                        <span class="text-[11px] text-slate-400 font-medium">${d.declaration_date}</span>
                        <span class="text-[10px] font-bold ${d.direction === 'IMPORT' ? 'text-blue-600' : 'text-amber-600'}">${d.direction === 'IMPORT' ? 'NHẬP' : 'XUẤT'}</span>
                    </div>
                </td>
                <td class="py-2.5 px-3 border-r border-slate-200">
                    <div class="text-xs font-bold text-slate-800">${d.customer_name}</div>
                    <div class="text-[11px] text-slate-500 truncate max-w-[200px]" title="${d.customs_office_name}">${d.customs_office_code} - ${d.customs_office_name}</div>
                </td>
                <td class="py-2.5 px-3 text-center border-r border-slate-200">
                    <div class="inline-block relative">
                        ${laneHtml}
                    </div>
                </td>
                <td class="py-2.5 px-3 text-center border-r border-slate-200">${statusHtml}</td>
                <td class="py-2.5 px-3 border-r border-slate-200 font-mono text-xs">
                    <div class="font-bold text-slate-700">${d.bill_of_lading || '-'}</div>
                    <div class="text-[11px] text-slate-500 mt-0.5 truncate max-w-[150px]" title="${d.container_numbers || ''}">${d.container_numbers || '-'}</div>
                </td>
                <td class="py-2.5 px-3 border-r border-slate-200">${tripBadge}</td>
                <td class="py-2.5 px-3 text-right border-r border-slate-200">
                    <div class="font-mono font-bold text-xs text-slate-800">${formatMoney(d.tax_amount_vnd)}</div>
                    <div class="mt-0.5">${taxBadge}</div>
                </td>
                <td class="py-2.5 px-3 text-right border-r border-slate-200 font-mono font-bold text-xs text-amber-700">
                    ${formatMoney(d.reimbursable_fee)}
                </td>
                <td class="py-2.5 px-3 text-center">
                    <div class="inline-flex items-center gap-1.5 justify-center">
                        <!-- 1. Xem Tờ Khai (Toàn màn hình) -->
                        <button type="button" onclick="openCustomsPage(${d.id})" 
                            class="px-2.5 py-1 bg-transparent hover:bg-teal-600 text-teal-700 hover:text-white border border-teal-600 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                            title="Xem chi tiết, Sửa, Lưu & Xóa tờ khai">
                            <i class="ph-bold ph-eye"></i>
                            <span>Xem</span>
                        </button>
                        <!-- 2. In nhanh Tờ Khai khổ A4 -->
                        <button type="button" onclick="openDirectPrintCustoms(${d.id})" 
                            class="px-2.5 py-1 bg-transparent hover:bg-slate-700 text-slate-700 hover:text-white border border-slate-600 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                            title="In nhanh tờ khai hải quan khổ A4">
                            <i class="ph-bold ph-printer"></i>
                            <span>In</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    if (window.BimTableFooter && Array.isArray(list)) {
        const totalTax = list.reduce((sum, d) => sum + (Number(d.tax_amount_vnd) || 0), 0);
        const totalReimburse = list.reduce((sum, d) => sum + (Number(d.reimbursable_fee) || 0), 0);
        window.BimTableFooter.render('customs-declarations-table', {
            cells: [
                { text: 'TỔNG', align: 'center', class: 'font-black text-slate-900 font-heading' },
                { html: `<span class="text-teal-800 font-extrabold">${list.length}</span> tờ khai hải quan điện tử`, colspan: 6, class: 'text-slate-700' },
                { html: `<span class="text-slate-900 font-bold tabular-nums font-mono text-xs">${formatMoney(totalTax)}</span>`, align: 'right' },
                { html: `<span class="text-amber-800 font-bold tabular-nums font-mono text-xs">${formatMoney(totalReimburse)}</span>`, align: 'right' },
                { text: '', align: 'center' }
            ]
        });
    }
}

function onCustomsOfficeChange(selectEl) {
    const val = selectEl.value;
    const names = {
        '02CI': 'Chi cục HQ Cửa khẩu Cảng Sài Gòn KV4 (Cát Lái)',
        '51CB': 'Chi cục HQ Cửa khẩu Cảng Cái Mép (BR-VT)',
        '43BA': 'Chi cục Hải quan Sóng Thần (Bình Dương)',
        '43BD': 'Chi cục HQ Quản lý Hàng XNK Ngoài KCN Bình Dương',
        '47PA': 'Chi cục Hải quan Long An',
        '02IK': 'Chi cục Hải quan Chuyển Phát Nhanh TP.HCM',
        '01NV': 'Chi cục Hải quan Cửa khẩu Sân bay Quốc tế Nội Bài',
        '03EE': 'Chi cục Hải quan Cửa khẩu Cảng Đình Vũ (Hải Phòng)',
    };
    selectEl.setAttribute('data-office-name', names[val] || 'Chi cục Hải quan');
}

function backToCustoms() {
    const formView = document.getElementById('view-customs-form');
    if (formView) formView.classList.add('hidden-view');

    if (previousActiveTab && previousActiveTab !== 'customs-form') {
        switchTab(previousActiveTab, true);
    } else {
        switchTab('hai-quan', true);
    }
}

async function openCustomsPage(id = null, updateHistory = true) {
    // Reset form
    document.getElementById('customs-edit-id').value = id || '';
    const form = document.getElementById('form-customs-declaration');
    if (form) form.reset();
    document.getElementById('cust-decl-date').value = new Date().toISOString().split('T')[0];
    const docLinkDiv = document.getElementById('cust-current-doc-link');
    if (docLinkDiv) docLinkDiv.classList.add('hidden');

    if (updateHistory && window.history && window.history.pushState) {
        const path = id ? `/customs/declarations/${id}` : '/customs/declarations/new';
        if (window.location.pathname !== path) {
            window.history.pushState({ view: 'customs-form', customsId: id }, '', path);
        }
    }

    const currentActiveView = document.querySelector('.view:not(.hidden-view)');
    if (currentActiveView && currentActiveView.id !== 'view-customs-form') {
        previousActiveTab = currentActiveView.id.replace('view-', '');
    }

    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden-view'));
    const formView = document.getElementById('view-customs-form');
    if (formView) formView.classList.remove('hidden-view');

    // Nạp danh sách khách hàng vào dropdown
    const custSelect = document.getElementById('cust-customer-id');
    if (custSelect) {
        custSelect.innerHTML = '<option value="">-- Đang tải danh sách khách hàng... --</option>';
        try {
            const res = await fetchWithAuth('/api/master-data/customers/');
            const d = await res.json();
            const customers = d.results || [];
            custSelect.innerHTML = '<option value="">-- Chọn Doanh Nghiệp / Chủ Hàng --</option>' +
                customers.map(c => `<option value="${c.id}">${c.name} (${c.code || 'KH'})</option>`).join('');
        } catch (e) {
            custSelect.innerHTML = '<option value="">-- Không thể tải khách hàng --</option>';
        }
    }

    // Nạp danh sách chuyến xe vào dropdown
    const tripSelect = document.getElementById('cust-trip-id');
    if (tripSelect) {
        tripSelect.innerHTML = '<option value="">-- Chưa gán chuyến xe --</option>';
        try {
            const res = await fetchWithAuth('/api/trips/?page_size=30');
            const d = await res.json();
            const trips = d.results || [];
            tripSelect.innerHTML = '<option value="">-- Chưa gán chuyến xe --</option>' +
                trips.map(t => `<option value="${t.id}">${t.trip_code} - ${t.driver_name || 'TX'} (${t.container_number || 'No Cont'})</option>`).join('');
        } catch (e) {
            console.warn('Could not load trips for customs form', e);
        }
    }

    if (id) {
        try {
            const res = await fetchWithAuth(`/api/customs/declarations/${id}/`);
            if (!res.ok) throw new Error('Không thể tải chi tiết tờ khai');
            const item = await res.json();

            document.getElementById('cust-decl-number').value = item.declaration_number || '';
            document.getElementById('cust-decl-number').readOnly = true;
            document.getElementById('cust-decl-date').value = item.declaration_date || '';
            if (custSelect) custSelect.value = item.customer_id || '';
            document.getElementById('cust-direction').value = item.direction || 'IMPORT';
            document.getElementById('cust-decl-type').value = item.declaration_type || 'A11';
            document.getElementById('cust-office-code').value = item.customs_office_code || '02CI';
            document.getElementById('cust-lane').value = item.customs_lane || 'GREEN';
            document.getElementById('cust-status').value = item.status || 'SUBMITTED';
            document.getElementById('cust-bl-number').value = item.bill_of_lading || '';
            document.getElementById('cust-container-numbers').value = item.container_numbers || '';
            if (tripSelect) tripSelect.value = item.dispatch_trip_id || '';
            document.getElementById('cust-is-tax-paid').checked = !!item.is_tax_paid;
            document.getElementById('cust-tax-amount').value = item.tax_amount_vnd || 0;
            document.getElementById('cust-service-fee').value = item.customs_service_fee || 0;
            document.getElementById('cust-reimbursable-fee').value = item.reimbursable_fee || 0;
            document.getElementById('cust-inspection-notes').value = item.inspection_notes || '';

            if (item.document_url && docLinkDiv) {
                const docLinkA = docLinkDiv.querySelector('a');
                if (docLinkA) docLinkA.href = item.document_url;
                docLinkDiv.classList.remove('hidden');
            }

            const laneBadgeClass = item.customs_lane === 'GREEN' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                (item.customs_lane === 'YELLOW' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-rose-50 text-rose-800 border-rose-200');
            const laneLabel = item.customs_lane === 'GREEN' ? 'Luồng Xanh' : (item.customs_lane === 'YELLOW' ? 'Luồng Vàng' : 'Luồng Đỏ');

            setTopbarFullpageMode({
                backFn: backToCustoms,
                prefix: 'Dịch Vụ Hải Quan',
                title: `Tờ Khai | ${item.declaration_number}`,
                subText: '',
                badgesHtml: '',
                actionsHtml: ''
            });
            // Khi xem tờ khai đã có: Bật chế độ readonly, sáng Xóa, In, Sửa; mờ Lưu
            setCustomsFormReadOnly(true);
            const submitBtnText = document.getElementById('cust-submit-btn-text');
            if (submitBtnText) submitBtnText.innerText = 'Lưu';
        } catch (err) {
            showToast('Lỗi: ' + err.message, 'error');
            backToCustoms();
            return;
        }
    } else {
        document.getElementById('cust-decl-number').readOnly = false;
        // Khi tạo mới: Mở khóa form, ẩn Xóa/In/Sửa, chỉ hiện Lưu
        setCustomsFormReadOnly(false);
        const delBtn = document.getElementById('btn-customs-delete-bottom');
        if (delBtn) delBtn.classList.add('hidden');
        const printBtn = document.getElementById('btn-customs-print-bottom');
        if (printBtn) printBtn.classList.add('hidden');
        const editBtn = document.getElementById('btn-customs-edit-bottom');
        if (editBtn) editBtn.classList.add('hidden');
        const submitBtnText = document.getElementById('cust-submit-btn-text');
        if (submitBtnText) submitBtnText.innerText = 'Lưu';

        setTopbarFullpageMode({
            backFn: backToCustoms,
            prefix: 'Dịch Vụ Hải Quan',
            title: 'Tạo Mới Tờ Khai Hải Quan',
            subText: '',
            badgesHtml: '',
            actionsHtml: ''
        });
    }
}


function closeCustomsModal() {
    backToCustoms();
}

async function submitCustomsDeclarationForm(e) {
    e.preventDefault();
    const formEl = (e && e.target && e.target.closest) ? e.target.closest('form') : document;
    const getEl = (id) => formEl.querySelector('#' + id) || document.getElementById(id);
    const getVal = (id) => (getEl(id)?.value || '').trim();

    const id = getVal('customs-edit-id');
    const isEdit = !!id;

    const officeSelect = getEl('cust-office-code');
    const officeCode = officeSelect ? officeSelect.value : '';
    const officeName = officeSelect ? (officeSelect.getAttribute('data-office-name') || officeSelect.options[officeSelect.selectedIndex]?.text || '') : '';

    const formData = new FormData();
    formData.append('declaration_number', getVal('cust-decl-number'));
    formData.append('declaration_date', getVal('cust-decl-date'));
    formData.append('customer_id', getVal('cust-customer-id'));
    formData.append('direction', getVal('cust-direction'));
    formData.append('declaration_type', getVal('cust-decl-type'));
    formData.append('customs_office_code', officeCode);
    formData.append('customs_office_name', officeName);
    formData.append('customs_lane', getVal('cust-lane'));
    formData.append('status', getVal('cust-status'));
    formData.append('bill_of_lading', getVal('cust-bl-number'));
    formData.append('container_numbers', getVal('cust-container-numbers'));
    
    const tripId = getVal('cust-trip-id');
    if (tripId) formData.append('dispatch_trip_id', tripId);

    formData.append('is_tax_paid', getEl('cust-is-tax-paid')?.checked || false);
    formData.append('tax_amount_vnd', getVal('cust-tax-amount') || 0);
    formData.append('customs_service_fee', getVal('cust-service-fee') || 0);
    formData.append('reimbursable_fee', getVal('cust-reimbursable-fee') || 0);
    formData.append('inspection_notes', getVal('cust-inspection-notes'));

    const fileInput = getEl('cust-document-file');
    if (fileInput && fileInput.files && fileInput.files[0]) {
        formData.append('declaration_document', fileInput.files[0]);
    }

    const url = isEdit ? `/api/customs/declarations/${id}/` : '/api/customs/declarations/';
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const headers = getAuthHeaders();
        delete headers['Content-Type']; // để trình duyệt tự đặt multipart boundary
        const res = await fetch(url, {
            method: method,
            headers: headers,
            body: formData
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(data.error || 'Lỗi khi lưu tờ khai hải quan!');
        }

        showToast(data.message || 'Lưu tờ khai thành công!', 'success');
        fetchCustomsDeclarations();
        const savedId = id || data.declaration_id || data.id;
        if (savedId) {
            openCustomsPage(savedId, true);
        } else {
            backToCustoms();
        }
    } catch (err) {
        showToast('Lỗi: ' + err.message, 'error');
    }
}

async function quickSetCustomsStatus(id, action) {
    try {
        const res = await fetchWithAuth(`/api/customs/declarations/${id}/action/`, {
            method: 'POST',
            body: JSON.stringify({ action })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Lỗi khi cập nhật trạng thái');

        showToast(data.message || 'Đã cập nhật trạng thái thông quan!', 'success');
        fetchCustomsDeclarations();
    } catch (err) {
        showToast('Lỗi: ' + err.message, 'error');
    }
}

async function quickToggleCustomsTax(id) {
    try {
        const res = await fetchWithAuth(`/api/customs/declarations/${id}/action/`, {
            method: 'POST',
            body: JSON.stringify({ action: 'toggle_tax' })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Lỗi khi cập nhật trạng thái thuế');

        showToast(data.message, 'success');
        fetchCustomsDeclarations();
    } catch (err) {
        showToast('Lỗi: ' + err.message, 'error');
    }
}

async function deleteCustomsDeclaration(id) {
    const confirmed = await showConfirmModal({
        title: 'Xóa Tờ Khai Hải Quan',
        message: 'Bạn có chắc chắn muốn xóa tờ khai hải quan này không?\n\nDữ liệu lịch sử sẽ được bảo lưu an toàn (Soft-Delete).',
        confirmText: 'Xóa Tờ Khai',
        cancelText: 'Huỷ bỏ',
        type: 'danger',
        icon: 'ph-bold ph-trash text-2xl'
    });
    if (!confirmed) return;
    try {
        const res = await fetchWithAuth(`/api/customs/declarations/${id}/`, {
            method: 'DELETE'
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Lỗi khi xóa tờ khai');

        showToast(data.message || 'Đã xóa tờ khai hải quan.', 'success');
        fetchCustomsDeclarations();
    } catch (err) {
        showToast('Lỗi: ' + err.message, 'error');
    }
}

function exportCustomsExcel() {
    const q = document.getElementById('customs-filter-q')?.value?.trim() || '';
    const lane = document.getElementById('customs-filter-lane')?.value || '';
    const status = document.getElementById('customs-filter-status')?.value || '';

    const params = new URLSearchParams();
    if (q) params.append('q', q);
    if (lane) params.append('lane', lane);
    if (status) params.append('status', status);

    window.open(`/api/customs/declarations/export-excel/?${params.toString()}`, '_blank');
}

/**
 * 3. HẢI QUAN: Khóa form, mở sửa, xóa và in trực tiếp
 */
function setCustomsFormReadOnly(isReadOnly) {
    const form = document.getElementById('form-customs-declaration');
    if (form) {
        form.querySelectorAll('input:not(#customs-edit-id), select, textarea').forEach(el => {
            el.disabled = isReadOnly;
            if (isReadOnly) {
                el.classList.add('bg-slate-50', 'cursor-not-allowed');
            } else {
                el.classList.remove('bg-slate-50', 'cursor-not-allowed');
            }
        });
    }
    const delBtn = document.getElementById('btn-customs-delete-bottom');
    const printBtn = document.getElementById('btn-customs-print-bottom');
    const editBtn = document.getElementById('btn-customs-edit-bottom');
    const saveBtn = document.getElementById('cust-submit-btn');

    if (isReadOnly) {
        if (delBtn) delBtn.classList.remove('hidden');
        if (printBtn) printBtn.classList.remove('hidden');
        if (editBtn) {
            editBtn.classList.remove('hidden', 'opacity-50', 'pointer-events-none');
            editBtn.disabled = false;
        }
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
        }
    } else {
        if (editBtn) editBtn.classList.add('hidden');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
        }
    }
}
window.setCustomsFormReadOnly = setCustomsFormReadOnly;

function enableCustomsEdit() {
    setCustomsFormReadOnly(false);
    showToast('info', 'Đã bật chế độ Sửa Tờ Khai. Bạn có thể hiệu chỉnh thông tin và bấm Lưu.', 'Chế Độ Sửa');
}
window.enableCustomsEdit = enableCustomsEdit;

function confirmDeleteCurrentCustomsDeclaration() {
    const id = document.getElementById('customs-edit-id')?.value;
    if (!id) {
        showToast('warning', 'Chưa có tờ khai nào được lưu để xóa!', 'Thông Báo');
        return;
    }
    deleteCustomsDeclaration(id);
}
window.confirmDeleteCurrentCustomsDeclaration = confirmDeleteCurrentCustomsDeclaration;

function printCurrentCustomsDeclaration() {
    const id = document.getElementById('customs-edit-id')?.value;
    if (!id) {
        showToast('warning', 'Vui lòng lưu tờ khai hải quan trước khi in ấn!', 'Thông Báo');
        return;
    }
    openDirectPrintCustoms(id);
}
window.printCurrentCustomsDeclaration = printCurrentCustomsDeclaration;

async function openDirectPrintCustoms(customsId) {
    if (!customsId) return;
    try {
        const res = await fetchWithAuth(`/api/customs/declarations/${customsId}/`);
        if (!res.ok) throw new Error('Không thể tải dữ liệu tờ khai');
        const item = await res.json();

        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) {
            window.print();
            return;
        }

        const co = getSystemCompanyProfile();
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Tờ Khai Hải Quan - ${item.declaration_number}</title>
                <style>
                    @page { 
                        size: A4 portrait; 
                        margin: 15mm 18mm 15mm 18mm; 
                    }
                    *, *::before, *::after { 
                        box-sizing: border-box; 
                    }
                    html, body { 
                        margin: 0; 
                        padding: 0; 
                        background: #ffffff; 
                        color: #0f172a; 
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; 
                        font-size: 13px; 
                        line-height: 1.5; 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important; 
                    }
                    .print-sheet {
                        width: 100%;
                        max-width: 175mm;
                        margin: 0 auto;
                        padding: 10mm 4mm 12mm 4mm;
                        box-sizing: border-box;
                        background: #ffffff;
                    }
                    @media print {
                        @page { 
                            size: A4 portrait; 
                            margin: 15mm 18mm 15mm 18mm; 
                        }
                        html, body { 
                            margin: 0 !important; 
                            padding: 0 !important; 
                            width: 100% !important; 
                            background: #ffffff !important; 
                        }
                        .print-sheet { 
                            width: 100% !important; 
                            max-width: 100% !important; 
                            margin: 0 !important; 
                            padding: 8mm 2mm 10mm 2mm !important; 
                            box-sizing: border-box !important; 
                            page-break-inside: avoid !important; 
                            page-break-after: avoid !important; 
                        }
                    }
                    .header { 
                        display: flex; 
                        justify-content: space-between; 
                        align-items: flex-start; 
                        border-bottom: 2.5px solid #0f766e; 
                        padding-bottom: 12px; 
                        margin-bottom: 20px; 
                    }
                    .title { 
                        text-align: center; 
                        font-size: 18px; 
                        font-weight: 800; 
                        color: #0f766e; 
                        text-transform: uppercase; 
                        letter-spacing: 0.5px;
                        margin: 16px 0 24px 0; 
                    }
                    .meta-table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin-bottom: 24px; 
                        table-layout: fixed; 
                    }
                    .meta-table td { 
                        padding: 8px 12px; 
                        border: 1px solid #cbd5e1; 
                        word-wrap: break-word; 
                        vertical-align: middle;
                        font-size: 13px;
                    }
                    .meta-table td.label { 
                        font-weight: 700; 
                        background: #f8fafc; 
                        width: 22%; 
                        color: #334155; 
                    }
                    .signatures { 
                        display: flex; 
                        justify-content: space-between; 
                        margin-top: 50px; 
                        text-align: center; 
                        page-break-inside: avoid; 
                    }
                    .sig-box { 
                        width: 30%; 
                    }
                    .sig-title { 
                        font-weight: 700; 
                        color: #1e293b;
                        margin-bottom: 75px; 
                    }
                    .footer-note {
                        margin-top: 35px;
                        border-top: 1px dashed #cbd5e1;
                        padding-top: 8px;
                        font-size: 11px;
                        color: #64748b;
                        font-style: italic;
                        display: flex;
                        justify-content: space-between;
                    }
                </style>
            </head>
            <body>
                <div class="print-sheet">
                    <div class="header">
                        <div>
                            <div style="font-size: 16px; font-weight: 800; text-transform: uppercase; color: #0f766e; letter-spacing: 0.5px;">${co.company_name} — PHÒNG THỦ TỤC HẢI QUAN</div>
                            <div style="font-size: 11.5px; color: #475569; margin-top: 3px;">Hotline thông quan: ${co.phone || '—'} • Đ/c: ${co.address || '—'} • Cổng kết nối VNACCS/VCIS EDI Gateway</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-weight: 800; font-family: monospace; font-size: 15px; color: #0f766e;">TK: ${item.declaration_number}</div>
                            <div style="font-size: 11.5px; color: #64748b; margin-top: 3px;">Ngày in: ${new Date().toLocaleDateString('vi-VN')}</div>
                        </div>
                    </div>

                    <div class="title">PHIẾU THEO DÕI & XÁC NHẬN THỦ TỤC HẢI QUAN</div>

                    <table class="meta-table">
                        <tr>
                            <td class="label">Số Tờ Khai:</td>
                            <td style="font-family: monospace; font-weight: bold; font-size: 14px;">${item.declaration_number}</td>
                            <td class="label">Ngày Đăng Ký:</td>
                            <td>${item.declaration_date || '-'}</td>
                        </tr>
                        <tr>
                            <td class="label">Doanh Nghiệp / Chủ Hàng:</td>
                            <td style="font-weight: bold;">${item.customer_name || '-'}</td>
                            <td class="label">Chiều / Loại Hình:</td>
                            <td><strong>${item.direction === 'IMPORT' ? 'NHẬP KHẨU' : 'XUẤT KHẨU'}</strong> (${item.declaration_type || 'A11'})</td>
                        </tr>
                        <tr>
                            <td class="label">Chi Cục Hải Quan:</td>
                            <td colspan="3">${item.customs_office_code || ''} - ${item.customs_office_name || '-'}</td>
                        </tr>
                        <tr>
                            <td class="label">Phân Luồng Hải Quan:</td>
                            <td style="font-weight: bold; color: ${item.customs_lane === 'GREEN' ? '#047857' : (item.customs_lane === 'YELLOW' ? '#d97706' : '#e11d48')};">
                                ${item.customs_lane === 'GREEN' ? 'LUỒNG XANH (Thông quan)' : (item.customs_lane === 'YELLOW' ? 'LUỒNG VÀNG (Kiểm tra hồ sơ)' : 'LUỒNG ĐỎ (Kiểm tra thực tế hàng)')}
                            </td>
                            <td class="label">Trạng Thái:</td>
                            <td style="font-weight: bold;">${item.status || '-'}</td>
                        </tr>
                        <tr>
                            <td class="label">Số Vận Đơn (B/L):</td>
                            <td style="font-family: monospace;">${item.bill_of_lading || '-'}</td>
                            <td class="label">Số Container:</td>
                            <td style="font-family: monospace;">${item.container_numbers || '-'}</td>
                        </tr>
                        <tr>
                            <td class="label">Chuyến Xe Gán:</td>
                            <td>${item.trip_code || 'Chưa gán xe'}</td>
                            <td class="label">Tình Trạng Thuế:</td>
                            <td><strong>${item.is_tax_paid ? 'ĐÃ NỘP THUẾ' : 'CHƯA NỘP THUẾ'}</strong> (${new Intl.NumberFormat('vi-VN').format(item.tax_amount_vnd || 0)} đ)</td>
                        </tr>
                        <tr>
                            <td class="label">Phí Dịch Vụ Khai HQ:</td>
                            <td style="font-weight: bold; color: #0f766e;">${new Intl.NumberFormat('vi-VN').format(item.customs_service_fee || 0)} đ</td>
                            <td class="label">Chi Hộ Kiểm Hóa:</td>
                            <td style="font-weight: bold; color: #d97706;">${new Intl.NumberFormat('vi-VN').format(item.reimbursable_fee || 0)} đ</td>
                        </tr>
                        <tr>
                            <td class="label">Ghi Chú Tiến Độ:</td>
                            <td colspan="3">${item.inspection_notes || 'Không có ghi chú thêm.'}</td>
                        </tr>
                    </table>

                    <div class="signatures">
                        <div class="sig-box">
                            <div class="sig-title">Đại Diện Doanh Nghiệp</div>
                            <div>(Ký & ghi rõ họ tên)</div>
                        </div>
                        <div class="sig-box">
                            <div class="sig-title">Cán Bộ Hải Quan Tiếp Nhận</div>
                            <div>(Ký & đóng dấu)</div>
                        </div>
                        <div class="sig-box">
                            <div class="sig-title">Nhân Viên Hiện Trường (Ops)</div>
                            <div>(Ký & ghi rõ họ tên)</div>
                        </div>
                    </div>

                    <div class="footer-note">
                        <span>* Phiếu theo dõi thủ tục hải quan lưu kèm hồ sơ chứng từ điện tử gốc.</span>
                        <span>${co.short_name || co.company_name} • Hotline: ${co.phone || '—'}</span>
                    </div>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 300);
    } catch (e) {
        console.error('Lỗi in tờ khai hải quan:', e);
        showToast('error', 'Không thể mở lệnh in tờ khai hải quan', 'Lỗi In');
    }
}
