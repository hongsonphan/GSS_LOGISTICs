// ==============================================================================
// MASTER DATA SORTING & STT HELPERS
// ==============================================================================
let masterDataSortColumn = null;
let masterDataSortDirection = 'asc';

function toggleMasterDataSort(colKey) {
    if (masterDataSortColumn === colKey) {
        masterDataSortDirection = (masterDataSortDirection === 'asc') ? 'desc' : 'asc';
    } else {
        masterDataSortColumn = colKey;
        masterDataSortDirection = 'asc';
    }
    filterMasterDataTable();
}
window.toggleMasterDataSort = toggleMasterDataSort;

function renderMdTh(fieldKey, label, align = 'left', extraClass = '', locked = false) {
    const isSorted = (masterDataSortColumn === fieldKey);
    let iconHtml = '';
    if (isSorted) {
        iconHtml = masterDataSortDirection === 'asc'
            ? '<i class="ph-bold ph-arrow-up text-teal-700 text-xs shrink-0"></i>'
            : '<i class="ph-bold ph-arrow-down text-teal-700 text-xs shrink-0"></i>';
    } else {
        iconHtml = '<i class="ph-bold ph-arrows-down-up text-slate-400 text-xs shrink-0 opacity-40 group-hover:opacity-100 transition-opacity"></i>';
    }

    let alignClass = 'justify-between text-left';
    if (align === 'center') alignClass = 'justify-center text-center';
    else if (align === 'right') alignClass = 'justify-end text-right';

    const colKeyAttr = fieldKey ? `data-col-key="${fieldKey}"` : '';
    const colNameAttr = label ? `data-col-name="${label}"` : '';
    const lockedAttr = locked ? 'data-col-locked="true"' : '';

    return `<th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none cursor-pointer hover:bg-slate-200/80 transition-colors group ${extraClass}" onclick="toggleMasterDataSort('${fieldKey}')" title="Bấm để sắp xếp theo ${label}" ${colKeyAttr} ${colNameAttr} ${lockedAttr}><div class="flex items-center ${alignClass} gap-1"><span class="truncate">${label}</span>${iconHtml}</div></th>`;
}
window.renderMdTh = renderMdTh;

function renderMdSttTh() {
    const isSorted = (masterDataSortColumn === '__stt');
    const iconHtml = isSorted
        ? (masterDataSortDirection === 'asc'
            ? '<i class="ph-bold ph-arrow-up text-teal-700 text-xs shrink-0"></i>'
            : '<i class="ph-bold ph-arrow-down text-teal-700 text-xs shrink-0"></i>')
        : '<i class="ph-bold ph-arrows-down-up text-slate-400 text-xs shrink-0 opacity-40 group-hover:opacity-100 transition-opacity"></i>';

    return `<th class="py-2 px-2 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200 select-none cursor-pointer hover:bg-slate-200/80 transition-colors w-12 group" onclick="toggleMasterDataSort('__stt')" title="Sắp xếp theo STT" data-col-key="stt" data-col-name="STT" data-col-locked="true"><div class="flex items-center justify-center gap-1"><span>STT</span>${iconHtml}</div></th>`;
}
window.renderMdSttTh = renderMdSttTh;

function renderMdActionTh() {
    return `<th class="py-2 px-3 text-[12px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 select-none" data-col-key="thao_tac" data-col-name="Thao Tác" data-col-locked="true">Thao Tác</th>`;
}
window.renderMdActionTh = renderMdActionTh;

function renderMdSttTd(stt) {
    return `<td class="py-2 px-2 text-[12px] font-mono font-semibold text-slate-600 text-center border-r border-slate-200 bg-slate-50/40" data-col-key="stt">${stt}</td>`;
}
window.renderMdSttTd = renderMdSttTd;

function renderMasterDataTable(items, total = items.length) {
    const tableHead = document.getElementById('md-table-head');
    const tableBody = document.getElementById('md-table-body');
    if (!tableHead || !tableBody) return;

    if (total === 0 || items.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="15" class="p-8 text-center text-slate-400 font-medium">Không tìm thấy bản ghi nào phù hợp.</td></tr>`;
        return;
    }

    const baseIndex = ((masterDataPagination.currentPage || 1) - 1) * (masterDataPagination.pageSize || 20);

    // 0. KHAI BÁO CÔNG TY (HỒ SƠ DOANH NGHIỆP)
    if (currentMasterDataTab === 'company') {
        tableHead.innerHTML = `
            <tr>
                ${renderMdSttTh()}
                ${renderMdTh('company_name', 'Tên Doanh Nghiệp (Pháp Nhân)')}
                ${renderMdTh('short_name', 'Tên Viết Tắt')}
                ${renderMdTh('tax_code', 'Mã Số Thuế')}
                ${renderMdTh('phone', 'Hotline / SĐT')}
                ${renderMdTh('email', 'Email Liên Hệ')}
                ${renderMdTh('address', 'Địa Chỉ Trụ Sở Chính')}
                ${renderMdTh('representative_name', 'Đại Diện Pháp Luật')}
                ${renderMdTh('bank_account_number', 'Tài Khoản Ngân Hàng')}
                ${renderMdTh('default_vat_rate', 'VAT / Giá Dầu', 'center')}
                ${renderMdActionTh()}
            </tr>
        `;
        tableBody.innerHTML = items.map((item, idx) => {
            const stt = baseIndex + idx + 1;
            return `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-200">
                ${renderMdSttTd(stt)}
                <td class="py-2.5 px-3 text-[13px] font-bold text-teal-950 border-r border-slate-200">${escapeHtml(item.company_name || 'CÔNG TY TNHH VẬN TẢI TRIỀN VÕ')}</td>
                <td class="py-2.5 px-3 text-[12px] font-bold text-teal-700 border-r border-slate-200">${escapeHtml(item.short_name || 'TRIỀN VÕ LOGISTICS')}</td>
                <td class="py-2.5 px-3 text-[12px] font-mono font-bold text-slate-800 border-r border-slate-200">${escapeHtml(item.tax_code || '—')}</td>
                <td class="py-2.5 px-3 text-[12px] font-mono font-bold text-emerald-700 border-r border-slate-200">${escapeHtml(item.phone || item.hotline || '—')}</td>
                <td class="py-2.5 px-3 text-[12px] text-blue-700 border-r border-slate-200">${escapeHtml(item.email || '—')}</td>
                <td class="py-2.5 px-3 text-[12px] text-slate-700 max-w-xs truncate border-r border-slate-200" title="${escapeHtml(item.address || item.headquarters_address || '')}">${escapeHtml(item.address || item.headquarters_address || '—')}</td>
                <td class="py-2.5 px-3 text-[12px] text-slate-800 border-r border-slate-200">${item.representative_name ? `${escapeHtml(item.representative_name)} (${escapeHtml(item.representative_role || 'Đại diện')})` : '—'}</td>
                <td class="py-2.5 px-3 text-[12px] font-mono text-slate-800 border-r border-slate-200">${item.bank_account_number ? `${escapeHtml(item.bank_account_number)} • ${escapeHtml(item.bank_name || '')}` : '—'}</td>
                <td class="py-2.5 px-3 text-[12px] text-center border-r border-slate-200 font-mono font-bold text-slate-800">VAT: ${item.default_vat_rate || 8}% • Dầu: ${formatMoney(item.fuel_reference_price || 21000)}</td>
                <td class="py-2.5 px-3 text-center">
                    <button onclick="openCreateMasterDataModal()" class="px-3 py-1 text-xs font-bold text-teal-700 hover:text-white hover:bg-teal-700 border border-teal-600 rounded-lg transition-colors cursor-pointer inline-flex items-center space-x-1" title="Chỉnh sửa khai báo công ty">
                        <i class="ph-bold ph-pencil-simple text-sm"></i>
                        <span>Sửa</span>
                    </button>
                </td>
            </tr>
            `;
        }).join('');
    }
    // 0.1 VAI TRÒ & PHÂN QUYỀN
    else if (currentMasterDataTab === 'roles_permissions') {
        tableHead.innerHTML = `
            <tr>
                ${renderMdSttTh()}
                ${renderMdTh('code', 'Mã Vai Trò')}
                ${renderMdTh('name', 'Tên Vai Trò / Nhóm Quyền')}
                ${renderMdTh('description', 'Mô Tả Chức Năng Nghiệp Vụ')}
                ${renderMdTh('user_count', 'Số Nhân Sự', 'center')}
                ${renderMdTh('permission_count', 'Phạm Vi Quyền', 'center')}
                ${renderMdTh('is_active', 'Trạng Thái', 'center')}
                ${renderMdActionTh()}
            </tr>
        `;
        tableBody.innerHTML = items.map((item, idx) => {
            const stt = baseIndex + idx + 1;
            return `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-200">
                ${renderMdSttTd(stt)}
                <td class="py-2.5 px-3 text-[12px] font-mono font-bold text-teal-800 border-r border-slate-200">${escapeHtml(item.code || String(item.id))}</td>
                <td class="py-2.5 px-3 text-[13px] font-bold text-slate-900 border-r border-slate-200">${escapeHtml(item.name)}</td>
                <td class="py-2.5 px-3 text-[12px] text-slate-600 border-r border-slate-200">${escapeHtml(item.description || 'Quản lý phân quyền theo nhóm nghiệp vụ')}</td>
                <td class="py-2.5 px-3 text-center border-r border-slate-200">
                    <span class="text-xs font-bold text-blue-700">${item.user_count || 0} nhân sự</span>
                </td>
                <td class="py-2.5 px-3 text-center border-r border-slate-200">
                    <span class="text-xs font-bold text-emerald-700">${item.permission_count || 0} quyền</span>
                </td>
                <td class="py-2.5 px-3 text-center border-r border-slate-200 text-xs font-semibold text-emerald-700">Đang kích hoạt</td>
                <td class="py-2.5 px-3 text-center">
                    <a href="/admin/auth/group/${item.id}/change/" target="_blank" class="px-2.5 py-1 text-xs font-bold text-teal-700 hover:text-white hover:bg-teal-700 border border-teal-600 rounded-lg transition-colors cursor-pointer inline-flex items-center space-x-1" title="Cấu hình nhóm & quyền">
                        <i class="ph-bold ph-pencil-simple text-sm"></i>
                        <span>Sửa</span>
                    </a>
                </td>
            </tr>
            `;
        }).join('');
    }
    // 0.2 SỐ DƯ ĐẦU KỲ KẾ TOÁN
    else if (currentMasterDataTab === 'opening_balance') {
        tableHead.innerHTML = `
            <tr>
                ${renderMdSttTh()}
                ${renderMdTh('account_code', 'Tài Khoản Kế Toán')}
                ${renderMdTh('entity_name', 'Tên Đối Tượng / Quỹ')}
                ${renderMdTh('entity_code', 'Mã Đối Tượng')}
                ${renderMdTh('opening_date', 'Ngày Chốt', 'center')}
                ${renderMdTh('debit_amount', 'Dư Nợ Đầu Kỳ (VNĐ)', 'right')}
                ${renderMdTh('credit_amount', 'Dư Có Đầu Kỳ (VNĐ)', 'right')}
                ${renderMdTh('notes', 'Ghi Chú')}
                ${renderMdActionTh()}
            </tr>
        `;
        tableBody.innerHTML = items.map((item, idx) => {
            const stt = baseIndex + idx + 1;
            return `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-200">
                ${renderMdSttTd(stt)}
                <td class="py-2.5 px-3 text-[12px] font-mono font-bold text-slate-900 border-r border-slate-200">
                    <span class="text-teal-800 font-black">${escapeHtml(item.account_code || '')}</span> - ${escapeHtml(item.account_name || '')}
                </td>
                <td class="py-2.5 px-3 text-[13px] font-bold text-slate-900 border-r border-slate-200">${escapeHtml(item.entity_name || '')}</td>
                <td class="py-2.5 px-3 text-[12px] font-mono text-slate-700 border-r border-slate-200">${escapeHtml(item.entity_code || item.bank_account_number || '—')}</td>
                <td class="py-2.5 px-3 text-[12px] font-mono text-center text-slate-700 border-r border-slate-200">${escapeHtml(item.opening_date || item.balance_date || '2026-01-01')}</td>
                <td class="py-2.5 px-3 text-[13px] font-bold text-emerald-700 text-right font-mono tabular-nums border-r border-slate-200">${item.debit_amount > 0 ? formatMoney(item.debit_amount) : '—'}</td>
                <td class="py-2.5 px-3 text-[13px] font-bold text-rose-700 text-right font-mono tabular-nums border-r border-slate-200">${item.credit_amount > 0 ? formatMoney(item.credit_amount) : '—'}</td>
                <td class="py-2.5 px-3 text-[12px] text-slate-500 max-w-xs truncate border-r border-slate-200">${escapeHtml(item.notes || '—')}</td>
                <td class="py-2.5 px-3 text-center">
                    <div class="flex items-center justify-center space-x-1">
                        <button onclick="openEditMasterDataModal(${item.id})" class="p-1 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded transition-colors cursor-pointer" title="Chỉnh sửa"><i class="ph-bold ph-pencil-simple text-sm"></i></button>
                        <button onclick="deleteOpeningBalanceItem(${item.id}, '${escapeHtml(item.entity_name || '')}')" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Xóa"><i class="ph-bold ph-trash text-sm"></i></button>
                    </div>
                </td>
            </tr>
            `;
        }).join('');
    }
    // 1. BIỂU PHÍ LƯƠNG CHUYẾN
    else if (currentMasterDataTab === 'driver_tariffs') {
        tableHead.innerHTML = `
            <tr>
                ${renderMdSttTh()}
                ${renderMdTh('area_group', 'Khu Vực Kho')}
                ${renderMdTh('route_name', 'Tên Tuyến / KCN / Nhà Máy')}
                ${renderMdTh('pickup_drop_area', 'Trục Lấy / Hạ Cont Chuẩn')}
                ${renderMdTh('estimated_km', 'Cự Ly', 'center')}
                ${renderMdTh('salary_rate', 'Lương Chuyến', 'right')}
                ${renderMdTh('notes', 'Ghi Chú Nghiệp Vụ')}
                ${renderMdTh('is_active', 'Trạng Thái', 'center')}
                ${renderMdActionTh()}
            </tr>
        `;
        tableBody.innerHTML = items.map((item, idx) => {
            const stt = baseIndex + idx + 1;
            return `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-200">
                ${renderMdSttTd(stt)}
                <td class="py-2 px-3 text-[13px] font-semibold text-slate-800 border-r border-slate-200">${item.area_group}</td>
                <td class="py-2 px-3 text-[13px] font-bold text-slate-900 border-r border-slate-200">${item.route_name}</td>
                <td class="py-2 px-3 text-[12px] text-slate-600 max-w-xs truncate border-r border-slate-200">${item.pickup_drop_area || '—'}</td>
                <td class="py-2 px-3 text-center border-r border-slate-200 font-mono font-bold text-xs text-slate-800">
                    ${item.estimated_km ? `${item.estimated_km} km` : '—'}
                </td>
                <td class="py-2 px-3 text-[13px] font-bold text-slate-900 text-right font-mono tabular-nums border-r border-slate-200">${formatMoney(item.salary_rate)}</td>
                <td class="py-2 px-3 text-[12px] text-slate-600 border-r border-slate-200">${item.notes || '—'}</td>
                <td class="py-2 px-3 text-center border-r border-slate-200 text-xs font-semibold ${item.is_active ? 'text-emerald-700' : 'text-slate-400'}">
                    ${item.is_active ? 'Đang dùng' : 'Tạm ngưng'}
                </td>
                <td class="py-2 px-3 text-center">
                    <div class="flex items-center justify-center space-x-1.5">
                        <button onclick="openSubcontractorFleetModal(${item.id})" class="p-1 text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded transition-colors cursor-pointer" title="Quản lý Danh bạ Tài xế & Xe"><i class="ph-bold ph-steering-wheel text-base"></i></button>
                        <button onclick="openEditMasterDataModal(${item.id})" class="p-1 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded transition-colors cursor-pointer" title="Chỉnh sửa thông tin nhà xe"><i class="ph-bold ph-pencil-simple text-base"></i></button>
                        <button onclick="deleteMasterDataItem(${item.id})" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Xóa mềm"><i class="ph-bold ph-trash text-base"></i></button>
                    </div>
                </td>
            </tr>
            `;
        }).join('');
    }
    // 2. PHỤ CẤP CẢNG XA & KIỂM HÓA
    else if (currentMasterDataTab === 'allowances') {
        tableHead.innerHTML = `
            <tr>
                ${renderMdSttTh()}
                ${renderMdTh('code', 'Mã')}
                ${renderMdTh('name', 'Tên Phụ Cấp / Tác Nghiệp')}
                ${renderMdTh('category', 'Phân Loại')}
                ${renderMdTh('amount', 'Mức Phụ Cấp', 'right')}
                ${renderMdTh('notes', 'Điều Kiện Áp Dụng')}
                ${renderMdTh('is_active', 'Trạng Thái', 'center')}
                ${renderMdActionTh()}
            </tr>
        `;
        tableBody.innerHTML = items.map((item, idx) => {
            const stt = baseIndex + idx + 1;
            return `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-200">
                ${renderMdSttTd(stt)}
                <td class="py-2 px-3 text-[12px] font-mono font-bold text-slate-900 border-r border-slate-200">${item.code}</td>
                <td class="py-2 px-3 text-[13px] font-bold text-slate-900 border-r border-slate-200">${item.name}</td>
                <td class="py-2 px-3 text-[12px] text-slate-700 font-medium border-r border-slate-200">${item.category_label || item.category}</td>
                <td class="py-2 px-3 text-[13px] font-bold text-slate-900 text-right font-mono tabular-nums border-r border-slate-200">+${formatMoney(item.amount)}</td>
                <td class="py-2 px-3 text-[12px] text-slate-600 border-r border-slate-200">${item.notes || '—'}</td>
                <td class="py-2 px-3 text-center border-r border-slate-200 text-xs font-semibold ${item.is_active ? 'text-emerald-700' : 'text-slate-400'}">
                    ${item.is_active ? 'Đang dùng' : 'Tạm ngưng'}
                </td>
                <td class="py-2 px-3 text-center">
                    <div class="flex items-center justify-center space-x-1">
                        <button onclick="openEditMasterDataModal(${item.id})" class="p-1 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded transition-colors cursor-pointer" title="Chỉnh sửa"><i class="ph-bold ph-pencil-simple text-sm"></i></button>
                        <button onclick="deleteMasterDataItem(${item.id})" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Xóa mềm"><i class="ph-bold ph-trash text-sm"></i></button>
                    </div>
                </td>
            </tr>
            `;
        }).join('');
    }
    // 3. ĐỊA ĐIỂM / CẢNG / KHO BÃI
    else if (currentMasterDataTab === 'locations') {
        tableHead.innerHTML = `
            <tr>
                ${renderMdSttTh()}
                ${renderMdTh('code', 'Mã Điểm')}
                ${renderMdTh('name', 'Tên Địa Điểm / Cảng / Kho')}
                ${renderMdTh('location_type', 'Phân Loại')}
                ${renderMdTh('province', 'Tỉnh / Thành')}
                ${renderMdTh('address', 'Địa Chỉ Chi Tiết')}
                ${renderMdTh('contact_person', 'Người Liên Hệ & SĐT')}
                ${renderMdTh('notes', 'Ghi Chú')}
                ${renderMdTh('is_active', 'Trạng Thái', 'center')}
                ${renderMdActionTh()}
            </tr>
        `;
        tableBody.innerHTML = items.map((item, idx) => {
            const stt = baseIndex + idx + 1;
            return `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-200">
                ${renderMdSttTd(stt)}
                <td class="py-2 px-3 text-[12px] font-mono font-bold text-slate-900 border-r border-slate-200">${item.code}</td>
                <td class="py-2 px-3 text-[13px] font-bold text-slate-900 border-r border-slate-200">${item.name}</td>
                <td class="py-2 px-3 text-[12px] font-medium text-slate-700 border-r border-slate-200">${item.location_type_label || item.location_type}</td>
                <td class="py-2 px-3 text-[12px] text-slate-700 border-r border-slate-200">${item.province || '—'}</td>
                <td class="py-2 px-3 text-[12px] text-slate-600 max-w-xs truncate border-r border-slate-200">${item.address || '—'}</td>
                <td class="py-2 px-3 text-[12px] text-slate-800 border-r border-slate-200">${item.contact_person ? `${item.contact_person} (${item.contact_phone || ''})` : (item.contact_phone || '—')}</td>
                <td class="py-2 px-3 text-[12px] text-slate-500 border-r border-slate-200">${item.notes || '—'}</td>
                <td class="py-2 px-3 text-center border-r border-slate-200 text-xs font-semibold ${item.is_active ? 'text-emerald-700' : 'text-slate-400'}">
                    ${item.is_active ? 'Đang dùng' : 'Tạm ngưng'}
                </td>
                <td class="py-2 px-3 text-center">
                    <div class="flex items-center justify-center space-x-1">
                        <button onclick="openEditMasterDataModal(${item.id})" class="p-1 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded transition-colors cursor-pointer" title="Chỉnh sửa"><i class="ph-bold ph-pencil-simple text-sm"></i></button>
                        <button onclick="deleteMasterDataItem(${item.id})" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Xóa mềm"><i class="ph-bold ph-trash text-sm"></i></button>
                    </div>
                </td>
            </tr>
            `;
        }).join('');
    }
    // 4. BIỂU CƯỚC KHÁCH HÀNG
    else if (currentMasterDataTab === 'tariffs') {
        tableHead.innerHTML = `
            <tr>
                ${renderMdSttTh()}
                ${renderMdTh('customer_name', 'Khách Hàng')}
                ${renderMdTh('destination_zone', 'Khu Vực Tuyến')}
                ${renderMdTh('container_size', 'Quy Cách')}
                ${renderMdTh('pickup_location', 'Nơi Lấy Cont')}
                ${renderMdTh('delivery_location', 'Kho Giao Nhận')}
                ${renderMdTh('dropoff_location', 'Nơi Hạ Cont')}
                ${renderMdTh('estimated_km', 'Cự Ly', 'center')}
                ${renderMdTh('freight_price', 'Đơn Giá Cước', 'right')}
                ${renderMdTh('driver_trip_pay', 'Định Mức Lương', 'right')}
                ${renderMdTh('toll_standard_fee', 'Định Mức BOT', 'right')}
                ${renderMdActionTh()}
            </tr>
        `;
        tableBody.innerHTML = items.map((item, idx) => {
            const stt = baseIndex + idx + 1;
            return `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-200">
                ${renderMdSttTd(stt)}
                <td class="py-2 px-3 text-[13px] font-bold text-slate-900 border-r border-slate-200">${item.customer_name}</td>
                <td class="py-2 px-3 text-[12px] font-semibold text-slate-800 border-r border-slate-200">
                    ${item.origin_zone || 'Cát Lái'} ➔ ${item.destination_zone || 'Kho Khách'}
                </td>
                <td class="py-2 px-3 text-[12px] font-mono font-bold text-slate-800 border-r border-slate-200">${item.container_size || '40HC'}</td>
                <td class="py-2 px-3 text-[12px] font-semibold text-slate-800 border-r border-slate-200">${item.pickup_location}</td>
                <td class="py-2 px-3 text-[12px] font-semibold text-slate-800 border-r border-slate-200">${item.delivery_location}</td>
                <td class="py-2 px-3 text-[12px] text-slate-600 border-r border-slate-200">${item.dropoff_location || 'Hạ bãi'}</td>
                <td class="py-2 px-3 text-center border-r border-slate-200 font-mono font-bold text-xs text-slate-800">
                    ${item.estimated_km ? `${item.estimated_km} km` : '—'}
                </td>
                <td class="py-2 px-3 text-[13px] font-bold text-slate-900 text-right font-mono tabular-nums border-r border-slate-200">${formatMoney(item.freight_price)}</td>
                <td class="py-2 px-3 text-[13px] font-bold text-slate-900 text-right font-mono tabular-nums border-r border-slate-200">${formatMoney(item.driver_trip_pay)}</td>
                <td class="py-2 px-3 text-[13px] font-bold text-slate-900 text-right font-mono tabular-nums border-r border-slate-200">${formatMoney(item.toll_standard_fee || 0)}</td>
                <td class="py-2 px-3 text-center">
                    <div class="flex items-center justify-center space-x-1">
                        <button onclick="openEditMasterDataModal(${item.id})" class="p-1 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded transition-colors cursor-pointer" title="Chỉnh sửa"><i class="ph-bold ph-pencil-simple text-sm"></i></button>
                        <button onclick="deleteMasterDataItem(${item.id})" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Xóa mềm"><i class="ph-bold ph-trash text-sm"></i></button>
                    </div>
                </td>
            </tr>
            `;
        }).join('');
    }
    // 5. KHÁCH HÀNG
    else if (currentMasterDataTab === 'customers') {
        tableHead.innerHTML = `
            <tr>
                ${renderMdSttTh()}
                ${renderMdTh('code', 'Mã Khách')}
                ${renderMdTh('short_name', 'Tên Viết Tắt')}
                ${renderMdTh('name', 'Tên Khách Hàng / Doanh Nghiệp')}
                ${renderMdTh('customer_group_label', 'Nhóm Khách')}
                ${renderMdTh('tax_code', 'Mã Số Thuế')}
                ${renderMdTh('address', 'Địa Chỉ')}
                ${renderMdTh('company_email', 'Email Công Ty')}
                ${renderMdTh('contact_person', 'Người Phụ Trách / SĐT')}
                ${renderMdTh('contact_email', 'Email Liên Hệ')}
                ${renderMdTh('bank_account_number', 'Số TK Bank')}
                ${renderMdTh('bank_name', 'Tên Ngân Hàng')}
                ${renderMdTh('tariffs_count', 'Số Biểu Cước', 'center')}
                ${renderMdTh('notes', 'Ghi Chú')}
                ${renderMdActionTh()}
            </tr>
        `;
        tableBody.innerHTML = items.map((item, idx) => {
            const stt = baseIndex + idx + 1;
            return `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-200">
                ${renderMdSttTd(stt)}
                <td class="py-2 px-3 text-[12px] font-mono font-bold text-slate-900 border-r border-slate-200" data-col-key="code">${escapeHtml(item.code || '')}</td>
                <td class="py-2 px-3 text-[12px] font-bold text-slate-800 border-r border-slate-200" data-col-key="short_name">${escapeHtml((item.short_name || '—').toUpperCase())}</td>
                <td class="py-2 px-3 text-[13px] font-bold text-slate-900 border-r border-slate-200" data-col-key="name">
                    <span>${escapeHtml(item.name || '—')}</span>
                </td>
                <td class="py-2 px-3 text-[12px] text-slate-800 font-medium border-r border-slate-200" data-col-key="customer_group_label">${escapeHtml(item.customer_group_label || item.customer_group || '—')}</td>
                <td class="py-2 px-3 text-[12px] font-mono text-slate-700 border-r border-slate-200" data-col-key="tax_code">${escapeHtml(item.tax_code || '—')}</td>
                <td class="py-2 px-3 text-[12px] text-slate-600 max-w-xs truncate border-r border-slate-200" data-col-key="address" title="${escapeHtml(item.address || '')}">${escapeHtml(item.address || '—')}</td>
                <td class="py-2 px-3 text-[12px] font-mono text-slate-700 border-r border-slate-200" data-col-key="company_email" title="${escapeHtml(item.company_email || '')}">${escapeHtml(item.company_email || '—')}</td>
                <td class="py-2 px-3 text-[12px] text-slate-800 border-r border-slate-200" data-col-key="contact_person">
                    ${item.contact_person ? `<span class="font-semibold">${escapeHtml(item.contact_person)}</span>` : ''}
                    ${item.contact_title ? `<span class="text-slate-500 text-[11px] block">${escapeHtml(item.contact_title)}</span>` : ''}
                    ${item.phone ? `<span class="text-slate-500 font-mono text-[11px] block">${escapeHtml(item.phone)}</span>` : ''}
                </td>
                <td class="py-2 px-3 text-[12px] font-mono text-slate-700 border-r border-slate-200" data-col-key="contact_email" title="${escapeHtml(item.contact_email || '')}">${escapeHtml(item.contact_email || '—')}</td>
                <td class="py-2 px-3 text-[12px] font-mono text-slate-800 border-r border-slate-200" data-col-key="bank_account_number">${escapeHtml(item.bank_account_number || '—')}</td>
                <td class="py-2 px-3 text-[12px] text-slate-800 border-r border-slate-200" data-col-key="bank_name" title="${escapeHtml(item.bank_branch ? `${item.bank_name} - ${item.bank_branch}` : (item.bank_name || ''))}">${escapeHtml(item.bank_name ? (item.bank_branch ? `${item.bank_name} (${item.bank_branch})` : item.bank_name) : '—')}</td>
                <td class="py-2 px-3 text-center border-r border-slate-200 font-semibold text-[12px] text-slate-800" data-col-key="tariffs_count">${item.tariffs_count || 0} tuyến</td>
                <td class="py-2 px-3 text-[12px] text-slate-500 border-r border-slate-200" data-col-key="notes" title="${escapeHtml(item.notes || '')}">${escapeHtml(item.notes || '—')}</td>
                <td class="py-2 px-3 text-center" data-col-key="thao_tac">
                    <div class="flex items-center justify-center space-x-1">
                        <button onclick="openEditMasterDataModal(${item.id})" class="p-1 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded transition-colors cursor-pointer" title="Chỉnh sửa"><i class="ph-bold ph-pencil-simple text-sm"></i></button>
                        <button onclick="deleteMasterDataItem(${item.id})" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Xóa mềm"><i class="ph-bold ph-trash text-sm"></i></button>
                    </div>
                </td>
            </tr>
            `;
        }).join('');
    }
    // 6. KHOẢN MỤC CHI PHÍ
    else if (currentMasterDataTab === 'expenses') {
        tableHead.innerHTML = `
            <tr>
                ${renderMdSttTh()}
                ${renderMdTh('code', 'Mã Khoản Chi')}
                ${renderMdTh('name', 'Tên Khoản Mục')}
                ${renderMdTh('group_type', 'Nhóm Chi Phí')}
                ${renderMdTh('default_amount', 'Định Mức Tiền', 'right')}
                ${renderMdTh('requires_invoice', 'Yêu Cầu HĐĐT', 'center')}
                ${renderMdTh('notes', 'Ghi Chú')}
                ${renderMdTh('is_active', 'Trạng Thái', 'center')}
                ${renderMdActionTh()}
            </tr>
        `;
        tableBody.innerHTML = items.map((item, idx) => {
            const stt = baseIndex + idx + 1;
            return `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-200">
                ${renderMdSttTd(stt)}
                <td class="py-2 px-3 text-[12px] font-mono font-bold text-slate-900 border-r border-slate-200">${item.code}</td>
                <td class="py-2 px-3 text-[13px] font-bold text-slate-900 border-r border-slate-200">${item.name}</td>
                <td class="py-2 px-3 text-[12px] text-slate-700 font-medium border-r border-slate-200">${item.group_type_label || item.group_type}</td>
                <td class="py-2 px-3 text-[13px] font-bold text-slate-900 text-right font-mono tabular-nums border-r border-slate-200">${item.default_amount > 0 ? formatMoney(item.default_amount) : 'Theo thực tế'}</td>
                <td class="py-2 px-3 text-center border-r border-slate-200 text-xs font-semibold ${item.requires_invoice ? 'text-amber-700' : 'text-slate-500'}">
                    ${item.requires_invoice ? 'Bắt buộc HĐ' : 'Tùy chọn'}
                </td>
                <td class="py-2 px-3 text-[12px] text-slate-500 border-r border-slate-200">${item.notes || '—'}</td>
                <td class="py-2 px-3 text-center border-r border-slate-200 text-xs font-semibold ${item.is_active ? 'text-emerald-700' : 'text-slate-400'}">
                    ${item.is_active ? 'Đang dùng' : 'Tạm ngưng'}
                </td>
                <td class="py-2 px-3 text-center">
                    <div class="flex items-center justify-center space-x-1">
                        <button onclick="openEditMasterDataModal(${item.id})" class="p-1 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded transition-colors cursor-pointer" title="Chỉnh sửa"><i class="ph-bold ph-pencil-simple text-sm"></i></button>
                        <button onclick="deleteMasterDataItem(${item.id})" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Xóa mềm"><i class="ph-bold ph-trash text-sm"></i></button>
                    </div>
                </td>
            </tr>
            `;
        }).join('');
    }
    // 7. QUY CÁCH CONT & XE
    else if (currentMasterDataTab === 'containers') {
        tableHead.innerHTML = `
            <tr>
                ${renderMdSttTh()}
                ${renderMdTh('code', 'Mã Quy Cách')}
                ${renderMdTh('name', 'Tên Quy Cách / Loại Thùng')}
                ${renderMdTh('category', 'Phân Loại')}
                ${renderMdTh('teu_factor', 'Hệ Số TEU', 'center')}
                ${renderMdTh('max_payload_kg', 'Tải Trọng (kg)', 'right')}
                ${renderMdTh('cbm_capacity', 'Thể Tích (CBM)', 'right')}
                ${renderMdTh('is_active', 'Trạng Thái', 'center')}
                ${renderMdActionTh()}
            </tr>
        `;
        tableBody.innerHTML = items.map((item, idx) => {
            const stt = baseIndex + idx + 1;
            return `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-200">
                ${renderMdSttTd(stt)}
                <td class="py-2 px-3 text-[12px] font-mono font-bold text-slate-900 border-r border-slate-200">${item.code}</td>
                <td class="py-2 px-3 text-[13px] font-bold text-slate-900 border-r border-slate-200">${item.name}</td>
                <td class="py-2 px-3 text-[12px] text-slate-700 font-medium border-r border-slate-200">${item.category_label || item.category}</td>
                <td class="py-2 px-3 text-center font-bold text-slate-800 font-mono text-[12px] border-r border-slate-200">${item.teu_factor > 0 ? item.teu_factor : '—'}</td>
                <td class="py-2 px-3 text-[13px] font-bold text-slate-900 text-right font-mono tabular-nums border-r border-slate-200">${formatMoney(item.max_payload_kg).replace(' đ', '')} kg</td>
                <td class="py-2 px-3 text-[13px] font-bold text-slate-900 text-right font-mono tabular-nums border-r border-slate-200">${item.cbm_capacity} m³</td>
                <td class="py-2 px-3 text-center border-r border-slate-200 text-xs font-semibold ${item.is_active ? 'text-emerald-700' : 'text-slate-400'}">
                    ${item.is_active ? 'Đang dùng' : 'Tạm ngưng'}
                </td>
                <td class="py-2 px-3 text-center">
                    <div class="flex items-center justify-center space-x-1">
                        <button onclick="openEditMasterDataModal(${item.id})" class="p-1 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded transition-colors cursor-pointer" title="Chỉnh sửa"><i class="ph-bold ph-pencil-simple text-sm"></i></button>
                        <button onclick="deleteMasterDataItem(${item.id})" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Xóa mềm"><i class="ph-bold ph-trash text-sm"></i></button>
                    </div>
                </td>
            </tr>
            `;
        }).join('');
    }
    // 8. ĐỘI XE & PHƯƠNG TIỆN
    else if (currentMasterDataTab === 'vehicles') {
        tableHead.innerHTML = `
            <tr>
                ${renderMdSttTh()}
                ${renderMdTh('license_plate', 'Biển Số Xe')}
                ${renderMdTh('vehicle_type', 'Loại Phương Tiện')}
                ${renderMdTh('ownership_type', 'Nguồn Sở Hữu')}
                ${renderMdTh('brand', 'Hãng SX')}
                ${renderMdTh('payload_capacity_kg', 'Tải Trọng', 'right')}
                ${renderMdTh('driver_name', 'Tài Xế Mặc Định')}
                ${renderMdTh('registration_expiry', 'Hạn Đăng Kiểm', 'center')}
                ${renderMdTh('insurance_expiry', 'Hạn Bảo Hiểm', 'center')}
                ${renderMdTh('status', 'Trạng Thái', 'center')}
                ${renderMdActionTh()}
            </tr>
        `;
        tableBody.innerHTML = items.map((item, idx) => {
            const stt = baseIndex + idx + 1;
            return `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-200">
                ${renderMdSttTd(stt)}
                <td class="py-2 px-3 text-[13px] font-mono font-bold text-slate-900 border-r border-slate-200">${item.license_plate}</td>
                <td class="py-2 px-3 text-[12px] font-medium text-slate-800 border-r border-slate-200">${item.vehicle_type_label || item.vehicle_type}</td>
                <td class="py-2 px-3 text-[12px] font-semibold text-slate-800 border-r border-slate-200">
                    ${item.ownership_type === 'SUBCONTRACTOR' 
                        ? `<span class="text-xs font-bold text-slate-600 uppercase" title="Xe bạn / 3PL: ${escapeHtml(item.subcontractor_name || '')}">${item.subcontractor_name && item.subcontractor_name !== '-' ? escapeHtml(item.subcontractor_name) : 'Xe Bạn (3PL)'}</span>`
                        : `<span class="text-teal-900 font-bold">${item.ownership_type_label || 'Xe Nhà (TVL)'}</span>`}
                </td>
                <td class="py-2 px-3 text-[12px] text-slate-600 border-r border-slate-200">${item.brand || '—'}</td>
                <td class="py-2 px-3 text-[12px] font-mono text-slate-800 text-right border-r border-slate-200">${(() => {
                    const disp = (item.payload_display || '').trim().replace(/[-—]+$/, '').trim();
                    if (disp && disp !== '—' && disp !== '-') return `${disp} kg`;
                    if (item.payload_capacity_kg && item.payload_capacity_kg > 0) return `${formatNumberVN(item.payload_capacity_kg)} kg`;
                    return '<span class="text-slate-400 font-normal">—</span>';
                })()}</td>
                <td class="py-2 px-3 text-[12px] font-semibold text-slate-800 border-r border-slate-200">${item.driver_name || '—'}</td>
                <td class="py-2 px-3 text-[12px] text-center font-mono font-bold text-slate-700 border-r border-slate-200">${item.registration_expiry || '—'}</td>
                <td class="py-2 px-3 text-[12px] text-center font-mono font-bold text-slate-700 border-r border-slate-200">${item.insurance_expiry || '—'}</td>
                <td class="py-2 px-3 text-center border-r border-slate-200 text-xs font-semibold text-slate-800">
                    ${item.status === 'IDLE' ? 'Nằm bãi' : (item.status === 'ACTIVE' ? 'Đang chạy' : (item.status === 'MAINTENANCE' ? 'Bảo trì' : item.status_label || item.status))}
                </td>
                <td class="py-2 px-3 text-center">
                    <div class="flex items-center justify-center space-x-1">
                        <button onclick="openEditMasterDataModal(${item.id})" class="p-1 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded transition-colors cursor-pointer" title="Chỉnh sửa"><i class="ph-bold ph-pencil-simple text-sm"></i></button>
                        <button onclick="deleteMasterDataItem(${item.id})" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Xóa mềm"><i class="ph-bold ph-trash text-sm"></i></button>
                    </div>
                </td>
            </tr>
            `;
        }).join('');
    }
    // 9. RƠ-MOÓC CONTAINER
    else if (currentMasterDataTab === 'trailers') {
        tableHead.innerHTML = `
            <tr>
                ${renderMdSttTh()}
                ${renderMdTh('license_plate', 'Biển Số Moóc')}
                ${renderMdTh('trailer_type', 'Quy Cách / Loại Moóc')}
                ${renderMdTh('brand', 'Hãng Sản Xuất')}
                ${renderMdTh('payload_capacity_kg', 'Tải Trọng', 'right')}
                ${renderMdTh('registration_expiry', 'Hạn Đăng Kiểm', 'center')}
                ${renderMdTh('status', 'Trạng Thái', 'center')}
                ${renderMdActionTh()}
            </tr>
        `;
        tableBody.innerHTML = items.map((item, idx) => {
            const stt = baseIndex + idx + 1;
            return `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-200">
                ${renderMdSttTd(stt)}
                <td class="py-2 px-3 text-[13px] font-mono font-bold text-slate-900 border-r border-slate-200">${item.license_plate}</td>
                <td class="py-2 px-3 text-[12px] font-medium text-slate-800 border-r border-slate-200">${item.trailer_type}</td>
                <td class="py-2 px-3 text-[12px] text-slate-600 border-r border-slate-200">${item.brand || '—'}</td>
                <td class="py-2 px-3 text-[13px] font-bold text-slate-900 text-right font-mono tabular-nums border-r border-slate-200">${(() => {
                    const disp = (item.payload_display || '').trim().replace(/[-—]+$/, '').trim();
                    if (disp && disp !== '—' && disp !== '-') return `${disp} kg`;
                    if (item.payload_capacity_kg && item.payload_capacity_kg > 0) return `${formatNumberVN(item.payload_capacity_kg)} kg`;
                    return '<span class="text-slate-400 font-normal">—</span>';
                })()}</td>
                <td class="py-2 px-3 text-[12px] text-center font-mono font-bold text-slate-700 border-r border-slate-200">${item.registration_expiry || '—'}</td>
                <td class="py-2 px-3 text-center border-r border-slate-200 text-xs font-semibold text-slate-800">
                    ${item.status === 'IDLE' ? 'Nằm bãi' : (item.status === 'ACTIVE' ? 'Đang kéo' : item.status)}
                </td>
                <td class="py-2 px-3 text-center">
                    <div class="flex items-center justify-center space-x-1">
                        <button onclick="openEditMasterDataModal(${item.id})" class="p-1 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded transition-colors cursor-pointer" title="Chỉnh sửa"><i class="ph-bold ph-pencil-simple text-sm"></i></button>
                        <button onclick="deleteMasterDataItem(${item.id})" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Xóa mềm"><i class="ph-bold ph-trash text-sm"></i></button>
                    </div>
                </td>
            </tr>
            `;
        }).join('');
    }
    // 10. HÃNG TÀU (SHIPPING LINES)
    else if (currentMasterDataTab === 'shipping_lines') {
        tableHead.innerHTML = `
            <tr>
                ${renderMdSttTh()}
                ${renderMdTh('code', 'Mã Hãng Tàu')}
                ${renderMdTh('name', 'Tên Đầy Đủ Hãng Vận Chuyển')}
                ${renderMdTh('contact_phone', 'Hotline / CSKH')}
                ${renderMdTh('contact_email', 'Email & Cổng Web')}
                ${renderMdTh('free_dem_days', 'Free DEM', 'center')}
                ${renderMdTh('free_det_days', 'Free DET', 'center')}
                ${renderMdTh('notes', 'Ghi Chú')}
                ${renderMdTh('is_active', 'Trạng Thái', 'center')}
                ${renderMdActionTh()}
            </tr>
        `;
        tableBody.innerHTML = items.map((item, idx) => {
            const stt = baseIndex + idx + 1;
            return `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-200">
                ${renderMdSttTd(stt)}
                <td class="py-2 px-3 text-[12px] font-mono font-bold text-slate-900 border-r border-slate-200">${item.code}</td>
                <td class="py-2 px-3 text-[13px] font-bold text-slate-900 border-r border-slate-200">${item.name}</td>
                <td class="py-2 px-3 text-[12px] font-mono text-slate-700 border-r border-slate-200">${item.contact_phone || '—'}</td>
                <td class="py-2 px-3 text-[12px] text-slate-600 border-r border-slate-200">
                    <div>${item.contact_email || '—'}</div>
                    ${item.website ? `<a href="${item.website}" target="_blank" class="text-teal-700 hover:underline text-[11px]">${item.website.replace('https://', '')}</a>` : ''}
                </td>
                <td class="py-2 px-3 text-center font-bold text-slate-800 font-mono text-[12px] border-r border-slate-200">${item.free_dem_days} ngày</td>
                <td class="py-2 px-3 text-center font-bold text-slate-800 font-mono text-[12px] border-r border-slate-200">${item.free_det_days} ngày</td>
                <td class="py-2 px-3 text-[12px] text-slate-500 border-r border-slate-200">${item.notes || '—'}</td>
                <td class="py-2 px-3 text-center border-r border-slate-200 text-xs font-semibold ${item.is_active ? 'text-emerald-700' : 'text-slate-400'}">
                    ${item.is_active ? 'Đang dùng' : 'Tạm ngưng'}
                </td>
                <td class="py-2 px-3 text-center">
                    <div class="flex items-center justify-center space-x-1">
                        <button onclick="openEditMasterDataModal(${item.id})" class="p-1 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded transition-colors cursor-pointer" title="Chỉnh sửa"><i class="ph-bold ph-pencil-simple text-sm"></i></button>
                        <button onclick="deleteMasterDataItem(${item.id})" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Xóa mềm"><i class="ph-bold ph-trash text-sm"></i></button>
                    </div>
                </td>
            </tr>
            `;
        }).join('');
    }
    // 11. NHÀ XE THẦU PHỤ / XE BẠN 3PL
    else if (currentMasterDataTab === 'subcontractors') {
        tableHead.innerHTML = `
            <tr>
                ${renderMdSttTh()}
                ${renderMdTh('code', 'Mã Đối Tác')}
                ${renderMdTh('partner_type', 'Loại Đối Tác')}
                ${renderMdTh('short_name', 'Tên Viết Tắt')}
                ${renderMdTh('name', 'Tên Đơn Vị / Đối Tác')}
                ${renderMdTh('address', 'Địa Chỉ Công Ty')}
                ${renderMdTh('yard_address', 'Địa Chỉ Kho / Bãi')}
                ${renderMdTh('tax_code', 'Mã Số Thuế')}
                ${renderMdTh('contact_person', 'Người Điều Hành & SĐT')}
                ${renderMdTh('bank_account_number', 'Thông Tin Tài Khoản Ngân Hàng')}
                ${renderMdTh('notes', 'Ghi Chú')}
                ${renderMdTh('is_active', 'Trạng Thái', 'center')}
                ${renderMdActionTh()}
            </tr>
        `;
        tableBody.innerHTML = items.map((item, idx) => {
            const stt = baseIndex + idx + 1;
            return `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-200">
                ${renderMdSttTd(stt)}
                <td class="py-2 px-3 text-[12px] font-mono font-bold text-slate-900 border-r border-slate-200">${item.code}</td>
                <td class="py-2 px-3 text-[12px] border-r border-slate-200 font-semibold text-slate-800">
                    ${item.partner_type === 'GARAGE' ? 'Gara bảo dưỡng' : (item.partner_type === 'SUPPLIER' ? 'Nhà cung cấp' : 'Nhà xe 3PL')}
                </td>
                <td class="py-2 px-3 text-[12px] font-mono font-bold text-slate-900 border-r border-slate-200">
                    ${escapeHtml(item.short_name || item.code)}
                </td>
                <td class="py-2 px-3 text-[13px] font-bold text-slate-900 border-r border-slate-200">
                    <div class="flex items-center justify-between gap-2">
                        <span class="hover:text-teal-700 cursor-pointer" onclick="${(item.partner_type === 'CARRIER' || !item.partner_type) ? `openSubcontractorFleetModal(${item.id})` : ''}">${escapeHtml(item.name)}</span>
                        ${(item.partner_type === 'CARRIER' || !item.partner_type) ? `
                            <button type="button" onclick="openSubcontractorFleetModal(${item.id})" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition-colors cursor-pointer shrink-0" title="Bấm để xem và quản lý đội xe & tài xế của nhà xe này">
                                <i class="ph-bold ph-truck text-amber-700"></i> Đội xe & Bác tài
                            </button>
                        ` : ''}
                    </div>
                </td>
                <td class="py-2 px-3 text-[12px] text-slate-700 max-w-xs border-r border-slate-200">
                    <div class="truncate" title="${escapeHtml(item.address || '')}">${item.address ? escapeHtml(item.address) : '<span class="text-slate-400 italic">Chưa cập nhật</span>'}</div>
                </td>
                <td class="py-2 px-3 text-[12px] text-slate-700 max-w-xs border-r border-slate-200">
                    <div class="truncate" title="${escapeHtml(item.yard_address || '')}">${item.yard_address ? escapeHtml(item.yard_address) : '<span class="text-slate-400 italic">Chưa cập nhật</span>'}</div>
                </td>
                <td class="py-2 px-3 text-[12px] font-mono text-slate-700 border-r border-slate-200">${item.tax_code || '—'}</td>
                <td class="py-2 px-3 text-[12px] text-slate-800 border-r border-slate-200">
                    <div class="font-bold">${(item.contact_person && item.contact_person !== 'null') ? escapeHtml(item.contact_person) : '—'}</div>
                    <div class="font-mono text-slate-700">${item.phone || '—'}</div>
                </td>
                <td class="py-2 px-3 text-[12px] border-r border-slate-200">
                    ${item.bank_account_number ? `
                        <div class="font-mono font-bold text-slate-900">${item.bank_account_number}</div>
                        <div class="text-[11px] text-slate-600">${item.bank_name || ''} ${item.bank_account_holder ? '• ' + item.bank_account_holder : ''}</div>
                    ` : '<span class="text-slate-400">Chưa có TK</span>'}
                </td>
                <td class="py-2 px-3 text-[12px] text-slate-600 max-w-xs truncate border-r border-slate-200">${item.notes || '—'}</td>
                <td class="py-2 px-3 text-center border-r border-slate-200 text-xs font-semibold ${item.is_active ? 'text-emerald-700' : 'text-slate-400'}">
                    ${item.is_active ? 'Đang hợp tác' : 'Tạm ngưng'}
                </td>
                <td class="py-2 px-3 text-center">
                    <div class="flex items-center justify-center space-x-1">
                        <button onclick="openEditMasterDataModal(${item.id})" class="p-1 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded transition-colors cursor-pointer" title="Chỉnh sửa"><i class="ph-bold ph-pencil-simple text-sm"></i></button>
                        <button onclick="deleteMasterDataItem(${item.id})" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Xóa mềm"><i class="ph-bold ph-trash text-sm"></i></button>
                    </div>
                </td>
            </tr>
            `;
        }).join('');
    }

    // Tự động đồng bộ với Universal Table Column Manager nếu có
    if (window.BimTableColumnManager && window.BimTableColumnManager.instances['md-main-table']) {
        window.BimTableColumnManager.instances['md-main-table'].refreshColumnsFromDOM();
    }
    if (window.BimTableFooter) {
        window.BimTableFooter.render('md-main-table', {
            summary: `Hiển thị <strong>${items.length}</strong> / tổng số <strong>${total || items.length}</strong> bản ghi danh mục`
        });
    }
}
