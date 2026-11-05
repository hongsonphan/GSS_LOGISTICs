// --- MASTER DATA FORM OPTIONS CACHE & POPULATION (Anti-Garbage Master Data Standard) ---
let masterDataFormOptionsCache = null;
let quickMasterDataTargetSelectId = null;
let currentMasterDataVersion = null;
let isSyncingMasterData = false;

// Kênh giao tiếp tức thì giữa các tab cùng trình duyệt (Cross-tab Realtime Sync)
const masterDataSyncChannel = (typeof window !== 'undefined' && typeof window.BroadcastChannel !== 'undefined')
    ? new BroadcastChannel('bim_master_data_sync_channel')
    : null;

if (masterDataSyncChannel) {
    masterDataSyncChannel.onmessage = (event) => {
        if (event && event.data && event.data.type === 'MASTER_DATA_UPDATED') {
            // Nhận tín hiệu từ tab khác vừa thêm/sửa/xóa danh mục -> tự động đồng bộ ngay lập tức
            checkAndSyncMasterData(true);
        }
    };
}

function broadcastMasterDataChanged() {
    if (masterDataSyncChannel) {
        try {
            masterDataSyncChannel.postMessage({ type: 'MASTER_DATA_UPDATED', timestamp: Date.now() });
        } catch (e) {
            // Không làm gián đoạn luồng chính
        }
    }
}

async function loadMasterDataFormOptions(forceReload = false) {
    if (masterDataFormOptionsCache && !forceReload) {
        return masterDataFormOptionsCache;
    }
    try {
        const res = await fetchWithAuth('/api/master-data/form-options/');
        if (res.ok) {
            masterDataFormOptionsCache = await res.json();
            if (masterDataFormOptionsCache && masterDataFormOptionsCache.version) {
                currentMasterDataVersion = masterDataFormOptionsCache.version;
            }
            return masterDataFormOptionsCache;
        }
    } catch (err) {
        console.error('Lỗi tải danh mục Master Data form-options:', err);
    }
    return masterDataFormOptionsCache;
}

/**
 * Kiểm tra và đồng bộ danh mục tức thời (Realtime Instant Master Data Sync):
 * - Nếu force = true: ép tải lại toàn bộ danh mục mới nhất, điền lại các select và phát tín hiệu cho các tab khác.
 * - Nếu force = false: gọi endpoint version siêu nhẹ (~1ms). Chỉ khi server có dữ liệu mới thì mới tải và cập nhật.
 */
async function checkAndSyncMasterData(force = false) {
    if (isSyncingMasterData) return masterDataFormOptionsCache;
    isSyncingMasterData = true;
    try {
        if (force) {
            await loadMasterDataFormOptions(true);
            populateMasterDataDropdowns();
            broadcastMasterDataChanged();
            return masterDataFormOptionsCache;
        }

        // Tự động kiểm tra endpoint version siêu nhẹ
        const res = await fetchWithAuth('/api/master-data/version/');
        if (res.ok) {
            const data = await res.json();
            const serverVersion = data.version;
            if (!currentMasterDataVersion || (serverVersion && serverVersion !== currentMasterDataVersion)) {
                await loadMasterDataFormOptions(true);
                populateMasterDataDropdowns();
                // Đang mở trang Cài đặt: làm mới luôn bảng danh mục (trừ khi đang mở form nhập)
                if (typeof isMasterDataPageActive === 'function' && isMasterDataPageActive() && typeof reloadActiveMasterDataTab === 'function'
                    && !document.querySelector('#modal-master-data:not(.hidden)')) {
                    reloadActiveMasterDataTab();
                }
            }
        }
    } catch (err) {
        // Tránh gián đoạn UI khi mất mạng tạm thời
    } finally {
        isSyncingMasterData = false;
    }
    return masterDataFormOptionsCache;
}

function populateMasterDataDropdowns() {
    if (!masterDataFormOptionsCache) return;
    const { customers, locations, drivers, vehicles, trailers, shipping_lines, routes } = masterDataFormOptionsCache;

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
            // Tự động nâng cấp sang Searchable Combobox chuẩn GSS TMS (Kính lúp dòng 1 + gõ free-text)
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
    fillSelect('inp-trailer', trailers, '-- Chọn Rơ-Moóc --', 'plate', 'label');

    // Chế độ Cắt Kéo (Drop & Hook)
    fillSelect('inp-driver-leg1', drivers, '-- Chọn tài xế lấy cont --', 'nickname', 'label');
    fillSelect('inp-dropoff-driver', drivers, '-- Bỏ trống (Phân công gán sau khi hạ cont) --', 'nickname', 'label');
    fillSelect('inp-vehicle-leg1', ownedVehicles, '-- Chọn Đầu kéo/ Xe tải lấy cont --', 'plate', 'label');
    fillSelect('inp-dropoff-vehicle', ownedVehicles, '-- Tự động theo tài xế hoặc gán sau --', 'plate', 'label');

    // Đổ danh sách cho Modal Sửa Lệnh Điều Vận (modal-edit-trip)
    fillSelect('edit-inp-customer', customers, '-- Chọn Khách Hàng --', 'id', 'label');
    fillSelect('edit-inp-driver', drivers, '-- Chọn tài xế điều động --', 'id', 'label');
    fillSelect('edit-inp-vehicle', ownedVehicles, '-- Chọn Đầu kéo/ Xe tải TVL --', 'id', 'label');
    fillSelect('edit-inp-trailer', trailers, '-- Chọn Rơ-Moóc --', 'id', 'label');
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

// --- QUY TẮC MỞ NHANH MODAL MASTER DATA & TỰ ĐỘNG CHỌN (UNIVERSAL QUICK-ADD) ---
async function openMasterDataModalQuick(tabKey, targetSelectId = null) {
    quickMasterDataTargetSelectId = targetSelectId;
    currentMasterDataTab = tabKey;
    await openCreateMasterDataModal();
}

// Lắng nghe sự kiện người dùng tương tác để đồng bộ dữ liệu ngầm không chờ đợi
if (typeof window !== 'undefined') {
    // 1. Khi người dùng focus hoặc chuyển tab quay lại ứng dụng -> tự động check version
    window.addEventListener('focus', () => {
        checkAndSyncMasterData(false);
    });

    if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                checkAndSyncMasterData(false);
            }
        });
    }

    // 2. Định kỳ 5 giây kiểm tra version ngầm siêu nhẹ (~1ms) khi tab đang hoạt động
    setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
            checkAndSyncMasterData(false);
        }
    }, 5000);
}

// Cung cấp hàm toàn cục cho toàn hệ thống
window.loadMasterDataFormOptions = loadMasterDataFormOptions;
window.checkAndSyncMasterData = checkAndSyncMasterData;
window.broadcastMasterDataChanged = broadcastMasterDataChanged;
window.populateMasterDataDropdowns = populateMasterDataDropdowns;
window.refreshMasterDataOptions = () => checkAndSyncMasterData(true);
