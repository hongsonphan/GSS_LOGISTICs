/**
 * BIM LOGISTICS — MODULE HẢI QUAN & THÔNG QUAN ĐIỆN TỬ (VNACCS/VCIS)
 */

// ==============================================================================
// 10. PHÂN HỆ DỊCH VỤ HẢI QUAN & THÔNG QUAN ĐIỆN TỬ (VNACCS/VCIS CONTROLLER)
// ==============================================================================
let customsDeclarationsCache = [];
let customsSearchDebounceTimeout = null;

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
    const totalEl = document.getElementById('customs-kpi-total');
    const greenEl = document.getElementById('customs-kpi-green');
    const yellowEl = document.getElementById('customs-kpi-yellow');
    const redEl = document.getElementById('customs-kpi-red');
    const rateEl = document.getElementById('customs-kpi-rate');

    if (totalEl) totalEl.innerText = stats.total || 0;
    if (greenEl) greenEl.innerText = stats.green_count || 0;
    if (yellowEl) yellowEl.innerText = stats.yellow_count || 0;
    if (redEl) redEl.innerText = stats.red_count || 0;
    if (rateEl) rateEl.innerText = `Tỷ lệ thông quan: ${stats.clearance_rate || 0}%`;
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
        'DRAFT': '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-600">Chờ truyền TK</span>',
        'SUBMITTED': '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-700">Đã đăng ký</span>',
        'PROCESSING': '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-700">Đang thẩm định</span>',
        'INSPECTION': '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-700">Kiểm hóa bãi/cảng</span>',
        'CLEARED': '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-700">Đã thông quan</span>',
        'RELEASED': '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-teal-100 text-teal-800">Đã qua giám sát</span>',
        'CANCELLED': '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700">Hủy tờ khai</span>',
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
                        <span class="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 text-[10px] font-bold">${d.declaration_type}</span>
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
                    <div class="flex items-center justify-center space-x-1">
                        ${clearBtn}
                        ${docBtn}
                        <button onclick="openCustomsModal(${d.id})" class="p-1 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded transition-colors cursor-pointer" title="Chỉnh sửa"><i class="ph-bold ph-pencil-simple text-sm"></i></button>
                        <button onclick="deleteCustomsDeclaration(${d.id})" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Xóa tờ khai"><i class="ph-bold ph-trash text-sm"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
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

async function openCustomsModal(id = null) {
    const modal = document.getElementById('modal-customs-declaration');
    if (!modal) return;

    // Reset form
    document.getElementById('customs-edit-id').value = id || '';
    document.getElementById('form-customs-declaration').reset();
    document.getElementById('cust-decl-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('cust-current-doc-link').classList.add('hidden');

    const titleEl = document.getElementById('customs-modal-title');
    const submitBtn = document.getElementById('cust-submit-btn');

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
            console.warn('Could not load trips for customs modal', e);
        }
    }

    if (id) {
        if (titleEl) titleEl.innerText = 'Cập Nhật Tờ Khai Hải Quan';
        if (submitBtn) submitBtn.innerHTML = '<i class="ph-bold ph-check text-base"></i><span>Cập Nhật Tờ Khai</span>';
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

            if (item.document_url) {
                const docLinkDiv = document.getElementById('cust-current-doc-link');
                const docLinkA = docLinkDiv.querySelector('a');
                docLinkA.href = item.document_url;
                docLinkDiv.classList.remove('hidden');
            }
        } catch (err) {
            showToast('Lỗi: ' + err.message, 'error');
            return;
        }
    } else {
        if (titleEl) titleEl.innerText = 'Khai Báo Tờ Khai Hải Quan Điện Tử';
        if (submitBtn) submitBtn.innerHTML = '<i class="ph-bold ph-check text-base"></i><span>Lưu Tờ Khai Hải Quan</span>';
        document.getElementById('cust-decl-number').readOnly = false;
    }

    modal.classList.remove('hidden');
}

function closeCustomsModal() {
    const modal = document.getElementById('modal-customs-declaration');
    if (modal) modal.classList.add('hidden');
}

async function submitCustomsDeclarationForm(e) {
    e.preventDefault();
    const id = document.getElementById('customs-edit-id').value;
    const isEdit = !!id;

    const officeSelect = document.getElementById('cust-office-code');
    const officeCode = officeSelect.value;
    const officeName = officeSelect.getAttribute('data-office-name') || officeSelect.options[officeSelect.selectedIndex]?.text || '';

    const formData = new FormData();
    formData.append('declaration_number', document.getElementById('cust-decl-number').value.trim());
    formData.append('declaration_date', document.getElementById('cust-decl-date').value);
    formData.append('customer_id', document.getElementById('cust-customer-id').value);
    formData.append('direction', document.getElementById('cust-direction').value);
    formData.append('declaration_type', document.getElementById('cust-decl-type').value);
    formData.append('customs_office_code', officeCode);
    formData.append('customs_office_name', officeName);
    formData.append('customs_lane', document.getElementById('cust-lane').value);
    formData.append('status', document.getElementById('cust-status').value);
    formData.append('bill_of_lading', document.getElementById('cust-bl-number').value.trim());
    formData.append('container_numbers', document.getElementById('cust-container-numbers').value.trim());
    
    const tripId = document.getElementById('cust-trip-id').value;
    if (tripId) formData.append('dispatch_trip_id', tripId);

    formData.append('is_tax_paid', document.getElementById('cust-is-tax-paid').checked);
    formData.append('tax_amount_vnd', document.getElementById('cust-tax-amount').value || 0);
    formData.append('customs_service_fee', document.getElementById('cust-service-fee').value || 0);
    formData.append('reimbursable_fee', document.getElementById('cust-reimbursable-fee').value || 0);
    formData.append('inspection_notes', document.getElementById('cust-inspection-notes').value.trim());

    const fileInput = document.getElementById('cust-document-file');
    if (fileInput && fileInput.files && fileInput.files[0]) {
        formData.append('declaration_document', fileInput.files[0]);
    }

    const url = isEdit ? `/api/customs/declarations/${id}/` : '/api/customs/declarations/';
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(data.error || 'Lỗi khi lưu tờ khai hải quan!');
        }

        showToast(data.message || 'Lưu tờ khai thành công!', 'success');
        closeCustomsModal();
        fetchCustomsDeclarations();
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


