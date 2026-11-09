// Open Create Modal with Dynamic Form Fields
async function openCreateMasterDataModal() {
    await loadMasterDataFormOptions();
    document.getElementById('md-edit-id').value = '';
    document.getElementById('md-catalog-key').value = currentMasterDataTab;

    if (currentMasterDataTab === 'company') {
        let profile = masterDataCache['company'];
        if (Array.isArray(profile) && profile.length > 0) {
            profile = profile[0];
        } else if (!profile || (!profile.company_name && !profile.short_name)) {
            profile = window.SYSTEM_COMPANY || {};
        }

        // Nếu profile vẫn chưa có thông tin công ty, chủ động gọi API lấy dữ liệu thực tế
        if (!profile.company_name && !profile.short_name) {
            try {
                const res = await fetchWithAuth('/api/master-data/company/');
                if (res.ok) {
                    const data = await res.json();
                    profile = data.data || (data.results && data.results[0]) || data;
                    masterDataCache['company'] = profile;
                    window.SYSTEM_COMPANY = profile;
                }
            } catch (cpErr) {
                console.error('[MasterData] Lỗi tải profile công ty:', cpErr);
            }
        }

        document.getElementById('md-modal-title').innerText = 'Hiệu Chỉnh Khai Báo Hệ Thống (Công Ty)';
        document.getElementById('md-modal-subtitle').innerText = 'Cập nhật thông tin pháp nhân & tham số vận hành chuẩn';
        injectMasterDataModalFields(profile || {});
        document.getElementById('modal-master-data').classList.remove('hidden');
        return;
    }

    if (currentMasterDataTab === 'roles_permissions') {
        window.open('/admin/auth/group/add/', '_blank');
        return;
    }

    const titles = {
        'opening_balance': 'Khai Báo Số Dư Đầu Kỳ Mới',
        'driver_tariffs': 'Thêm Tuyến Lương Chuyến Mới',
        'allowances': 'Thêm Phụ Cấp / Kiểm Hóa Mới',
        'locations': 'Thêm Cảng / Kho Bãi Mới',
        'tariffs': 'Thêm Biểu Cước Khách Hàng',
        'customers': 'Thêm Khách Hàng Mới',
        'expenses': 'Thêm Khoản Mục Chi Phí',
        'containers': 'Thêm Quy Cách Cont & Xe',
        'vehicles': 'Thêm Đầu Kéo / Xe Tải Mới',
        'trailers': 'Thêm Rơ-Moóc Mới',
        'shipping_lines': 'Thêm Hãng Tàu Biển Mới',
        'subcontractors': 'Thêm Đối Tác Xe Thầu Phụ Mới'
    };
    document.getElementById('md-modal-title').innerText = titles[currentMasterDataTab] || 'Thêm Mới Bản Ghi';
    document.getElementById('md-modal-subtitle').innerText = 'Khai báo thông tin chuẩn vào hệ thống Cài đặt';

    injectMasterDataModalFields(null);
    document.getElementById('modal-master-data').classList.remove('hidden');
}

// Open Edit Modal with Current Data
async function openEditMasterDataModal(id) {
    await loadMasterDataFormOptions();
    if (currentMasterDataTab === 'company') {
        return openCreateMasterDataModal();
    }
    if (currentMasterDataTab === 'roles_permissions') {
        window.open(`/admin/auth/group/${id}/change/`, '_blank');
        return;
    }
    let items = masterDataCache[currentMasterDataTab] || [];
    let item = items.find(i => i.id === id);
    if (!item) {
        // Fallback 1: Nạp trực tiếp từ API nếu danh mục chưa được nạp vào cache
        const endpoints = {
            'vehicles': '/api/master-data/vehicles/',
            'trailers': '/api/master-data/trailers/',
            'customers': '/api/master-data/customers/',
            'locations': '/api/master-data/locations/',
            'subcontractors': '/api/master-data/subcontractors/',
            'driver_tariffs': '/api/master-data/driver-tariffs/',
            'allowances': '/api/master-data/allowances/',
            'expenses': '/api/master-data/expense-items/',
            'containers': '/api/master-data/container-types/',
            'shipping_lines': '/api/master-data/shipping-lines/',
            'opening_balance': '/api/master-data/opening-balances/'
        };
        const ep = endpoints[currentMasterDataTab];
        if (ep) {
            try {
                const res = await fetchWithAuth(ep);
                if (res.ok) {
                    const data = await res.json();
                    items = data.results || data.items || [];
                    masterDataCache[currentMasterDataTab] = items;
                    item = items.find(i => i.id === id);
                }
            } catch (err) {
                console.error('[MasterData] Fallback fetch item error:', err);
            }
        }
    }
    if (!item) {
        // Fallback 2: Lấy từ cache dữ liệu Đội xe nếu có sẵn
        if (currentMasterDataTab === 'trailers' && typeof rawFleetTrailers !== 'undefined' && Array.isArray(rawFleetTrailers)) {
            const rawT = rawFleetTrailers.find(i => i.id === id);
            if (rawT) {
                item = {
                    id: rawT.id,
                    license_plate: rawT.plate,
                    trailer_type: rawT.type,
                    brand: rawT.brand,
                    payload_capacity_kg: rawT.payload_capacity_kg,
                    payload_display: rawT.payload_display,
                    registration_expiry: rawT.reg_expiry,
                    status: rawT.status_raw || (rawT.status && rawT.status.includes('Nằm bãi') ? 'IDLE' : (rawT.status && rawT.status.includes('Đang kéo') ? 'ACTIVE' : 'MAINTENANCE'))
                };
            }
        } else if (currentMasterDataTab === 'vehicles' && typeof rawFleetVehicles !== 'undefined' && Array.isArray(rawFleetVehicles)) {
            const rawV = rawFleetVehicles.find(i => i.id === id);
            if (rawV) {
                item = {
                    id: rawV.id,
                    license_plate: rawV.plate,
                    vehicle_type: rawV.type,
                    ownership_type: rawV.ownership_code || 'OWNED',
                    brand: rawV.brand,
                    payload_capacity_kg: rawV.payload_capacity_kg,
                    current_driver_id: rawV.driver_id,
                    registration_expiry: rawV.reg_expiry,
                    status: rawV.status_raw || 'ACTIVE'
                };
            }
        }
    }
    if (!item) {
        if (typeof showToast === 'function') {
            showToast('warning', 'Không tìm thấy dữ liệu đối tượng cần chỉnh sửa.', 'Thông Báo');
        }
        return;
    }

    document.getElementById('md-edit-id').value = id;
    document.getElementById('md-catalog-key').value = currentMasterDataTab;

    const titles = {
        'opening_balance': 'Chỉnh Sửa Số Dư Đầu Kỳ Kế Toán',
        'driver_tariffs': 'Chỉnh Sửa Tuyến Lương Chuyến',
        'allowances': 'Chỉnh Sửa Phụ Cấp / Kiểm Hóa',
        'locations': 'Chỉnh Sửa Cảng / Kho Bãi',
        'tariffs': 'Chỉnh Sửa Biểu Cước Khách Hàng',
        'customers': 'Chỉnh Sửa Khách Hàng',
        'expenses': 'Chỉnh Sửa Khoản Mục Chi Phí',
        'containers': 'Chỉnh Sửa Quy Cách Cont & Xe',
        'vehicles': 'Chỉnh Sửa Đầu Kéo / Xe Tải',
        'trailers': 'Chỉnh Sửa Rơ-Moóc',
        'shipping_lines': 'Chỉnh Sửa Hãng Tàu Biển',
        'subcontractors': 'Chỉnh Sửa Đối Tác Xe Thầu Phụ'
    };
    document.getElementById('md-modal-title').innerText = titles[currentMasterDataTab] || 'Chỉnh Sửa Bản Ghi';
    document.getElementById('md-modal-subtitle').innerText = `ID #${id} • Cập nhật thông tin chuẩn`;

    injectMasterDataModalFields(item);
    document.getElementById('modal-master-data').classList.remove('hidden');
}

function closeMasterDataModal() {
    const modal = document.getElementById('modal-master-data');
    if (modal) modal.classList.add('hidden');
}
