// --- MASTER DATA FORM OPTIONS CACHE & POPULATION (Anti-Garbage Master Data Standard) ---
let masterDataFormOptionsCache = null;
let quickMasterDataTargetSelectId = null;

async function loadMasterDataFormOptions(forceReload = false) {
    if (masterDataFormOptionsCache && !forceReload) {
        return masterDataFormOptionsCache;
    }
    try {
        const res = await fetchWithAuth('/api/master-data/form-options/');
        if (res.ok) {
            masterDataFormOptionsCache = await res.json();
            return masterDataFormOptionsCache;
        }
    } catch (err) {
        console.error('Lỗi tải danh mục Master Data form-options:', err);
    }
    return masterDataFormOptionsCache;
}

function populateMasterDataDropdowns() {
    if (!masterDataFormOptionsCache) return;
    const { customers, locations, drivers, vehicles, shipping_lines, routes } = masterDataFormOptionsCache;

    function fillSelect(elId, items, placeholder, valueKey = 'name', textKey = 'label') {
        const elements = document.querySelectorAll('#' + elId);
        if (!elements.length) return;
        elements.forEach(sel => {
            const currentVal = sel.value;
            sel.innerHTML = `<option value="">${placeholder}</option>`;
            if (Array.isArray(items)) {
                items.forEach(item => {
                    const val = typeof item === 'object' ? item[valueKey] : item;
                    const txt = typeof item === 'object' ? (item[textKey] || item.name || item.code) : item;
                    const opt = document.createElement('option');
                    opt.value = val;
                    opt.innerText = txt;
                    sel.appendChild(opt);
                });
            }
            if (currentVal) {
                setSelectValueCaseInsensitive(sel, currentVal);
            }
            // Tự động nâng cấp sang Searchable Combobox chuẩn Bim TMS (Kính lúp dòng 1 + gõ free-text)
            makeSearchableSelect(sel);
        });
    }

    // Modal Điều Vận (modal-create-trip)
    fillSelect('inp-customer', customers, '-- Chọn Khách Hàng Trong Danh Mục --', 'name', 'label');
    fillSelect('inp-subcontractor', masterDataFormOptionsCache?.subcontractors, '-- Chọn Nhà Xe Thầu Phụ / 3PL --', 'id', 'label');
    fillSelect('inp-pickup', locations?.pickup_options, '-- Chọn Cảng / Depot Lấy --', 'name', 'label');
    fillSelect('inp-warehouse', locations?.warehouse_options, '-- Chọn Kho Khách Hàng --', 'name', 'label');
    fillSelect('inp-dropoff', locations?.dropoff_options, '-- Chọn Nơi Hạ Cont --', 'name', 'label');
    fillSelect('inp-driver', drivers, '-- Chọn tài xế điều động --', 'nickname', 'label');

    // Xe nhà nội bộ TVL (chỉ lọc ownership_code === 'OWNED')
    const ownedVehicles = (vehicles || []).filter(v => v.ownership_code === 'OWNED');
    fillSelect('inp-vehicle', ownedVehicles, '-- Chọn Đầu kéo/ Xe tải TVL --', 'plate', 'label');

    // Chế độ Cắt Kéo (Drop & Hook)
    fillSelect('inp-driver-leg1', drivers, '-- Chọn tài xế lấy cont --', 'nickname', 'label');
    fillSelect('inp-dropoff-driver', drivers, '-- Bỏ trống (Phân công gán sau khi hạ cont) --', 'nickname', 'label');
    fillSelect('inp-vehicle-leg1', ownedVehicles, '-- Chọn Đầu kéo/ Xe tải lấy cont --', 'plate', 'label');
    fillSelect('inp-dropoff-vehicle', ownedVehicles, '-- Tự động theo tài xế hoặc gán sau --', 'plate', 'label');

    // Đổ danh sách Chặng 2 cho Modal Sửa Lệnh Điều Vận
    fillSelect('edit-inp-dropoff-driver', drivers, '-- Bỏ trống (Chưa gán) --', 'id', 'label');
    fillSelect('edit-inp-dropoff-vehicle', ownedVehicles, '-- Chọn Đầu kéo Chặng 2 --', 'id', 'label');

    // Modal Báo Giá (modal-quotation & fullpage view)
    fillSelect('quote-customer', customers, '-- Chọn Khách Hàng Trong Danh Mục --', 'name', 'label');
    fillSelect('fullpage-quote-customer', customers, '-- Chọn Khách Hàng Trong Danh Mục --', 'name', 'label');
    
    // Modal Booking (modal-booking & fullpage view)
    fillSelect('booking-customer', customers, '-- Chọn Khách Hàng Trong Danh Mục --', 'name', 'label');
    fillSelect('booking-pickup', locations?.pickup_options, '-- Chọn Điểm Lấy --', 'name', 'label');
    fillSelect('booking-delivery', locations?.warehouse_options, '-- Chọn Kho Khách --', 'name', 'label');
    fillSelect('booking-dropoff', locations?.dropoff_options, '-- Chọn Điểm Hạ --', 'name', 'label');

    fillSelect('fullpage-booking-customer', customers, '-- Chọn Khách Hàng Trong Danh Mục --', 'name', 'label');
    fillSelect('fullpage-booking-pickup', locations?.pickup_options, '-- Chọn Cảng / Depot Lấy Cont --', 'name', 'label');
    fillSelect('fullpage-booking-delivery', locations?.warehouse_options, '-- Chọn Kho Khách Hàng --', 'name', 'label');
    fillSelect('fullpage-booking-dropoff', locations?.dropoff_options, '-- Chọn Nơi Hạ Cont --', 'name', 'label');

    // Datalist Hãng Tàu cho Booking (Modal & Fullpage)
    const slDatalist = document.getElementById('shipping-lines-datalist');
    if (slDatalist && Array.isArray(shipping_lines)) {
        slDatalist.innerHTML = shipping_lines.map(sl => `<option value="${sl.code}">${sl.name} (DEM: ${sl.free_dem_days}d / DET: ${sl.free_det_days}d)</option>`).join('');
    }
    const fullpageSlDatalist = document.getElementById('fullpage-shipping-lines-datalist');
    if (fullpageSlDatalist && Array.isArray(shipping_lines)) {
        fullpageSlDatalist.innerHTML = shipping_lines.map(sl => `<option value="${sl.code}">${sl.name} (DEM: ${sl.free_dem_days}d / DET: ${sl.free_det_days}d)</option>`).join('');
    }

    // Modal Hải Quan & Fullpage Hải Quan
    fillSelect('cust-customer-id', customers, '-- Chọn Doanh Nghiệp / Chủ Hàng --', 'id', 'name');

    // Tuyến đường mẫu Báo giá
    const quotePreset = document.getElementById('quote-route-preset');
    if (quotePreset && Array.isArray(routes)) {
        quotePreset.innerHTML = '<option value="">-- Hoặc Chọn Tuyến Mẫu Danh Mục --</option>' +
            routes.map(r => `<option value="${r.route_name}" data-salary="${r.salary_rate}">${r.label || r.route_name}</option>`).join('');
    }
}

// --- BỘ LỌC TÌM KIẾM NHANH KHÁCH HÀNG TRÊN DROPDOWN (SEARCHABLE DROPDOWN) ---
function filterCustomerSelectOptions(searchId, selectId) {
    const searchInput = document.getElementById(searchId);
    const selectEl = document.getElementById(selectId);
    if (!searchInput || !selectEl) return;
    
    // Nếu select đã được nâng cấp sang Searchable Combobox thì proxy vào combobox
    if (selectEl._bimCombobox) {
        selectEl._bimCombobox.searchInput.value = searchInput.value;
        selectEl._bimCombobox.sync();
        return;
    }
    
    const keyword = searchInput.value.trim().toLowerCase();
    const options = selectEl.options;
    let firstMatch = null;
    
    for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        if (!opt.value) continue;
        const text = opt.text.toLowerCase();
        if (!keyword || text.includes(keyword)) {
            opt.style.display = '';
            if (!firstMatch && keyword) firstMatch = opt;
        } else {
            opt.style.display = 'none';
        }
    }
    if (firstMatch && keyword) {
        selectEl.value = firstMatch.value;
    }
}

// --- QUY TẮC MỞ NHANH MODAL MASTER DATA & TỰ ĐỘNG CHỌN (UNIVERSAL QUICK-ADD) ---
async function openMasterDataModalQuick(tabKey, targetSelectId = null) {
    quickMasterDataTargetSelectId = targetSelectId;
    currentMasterDataTab = tabKey;
    await openCreateMasterDataModal();
}
