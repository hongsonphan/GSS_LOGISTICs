// ==============================================================================
// 10. PHÂN HỆ CÀI ĐẶT & HỆ THỐNG DANH MỤC (MASTER DATA CONTROLLER)
// ==============================================================================
let currentMasterDataTab = 'company';
let currentMasterDataGroup = 'initial_setup';

const MASTER_DATA_GROUPS = {
    'initial_setup': {
        name: 'Khai Báo Ban Đầu',
        icon: 'ph-buildings',
        tabs: ['company', 'roles_permissions']
    },
    'finance_admin': {
        name: 'Tài Chính & Quản Trị',
        icon: 'ph-wallet',
        tabs: ['opening_balance', 'account_settings', 'expenses', 'driver_tariffs', 'allowances']
    },
    'partners': {
        name: 'Khách Hàng & Đối Tác',
        icon: 'ph-handshake',
        tabs: ['customers', 'tariffs', 'subcontractors']
    },
    'locations_network': {
        name: 'Mạng Lưới & Địa Điểm',
        icon: 'ph-map-pin',
        tabs: ['locations', 'shipping_lines']
    },
    'fleet_equipment': {
        name: 'Phương Tiện & Thiết Bị',
        icon: 'ph-truck',
        tabs: ['vehicles', 'trailers', 'containers']
    }
};

// Mỗi tab thuộc một dòng quyền "Cài đặt · ..." trong trang Phân quyền (khớp core/access.py CFG_TAB_MODULE)
const MASTER_DATA_TAB_MODULE = {
    company: 'cfg_company', roles_permissions: 'admin',
    opening_balance: 'cfg_finance', account_settings: 'cfg_finance', expenses: 'cfg_finance', driver_tariffs: 'cfg_finance', allowances: 'cfg_finance',
    customers: 'cfg_partners', tariffs: 'cfg_partners', subcontractors: 'cfg_partners',
    locations: 'cfg_network', shipping_lines: 'cfg_network',
    vehicles: 'cfg_fleet', trailers: 'cfg_fleet', containers: 'cfg_fleet'
};

// Trang Cài đặt đang mở (không dựa vào biến toàn cục currentTab vì biến đó không tồn tại)
function isMasterDataPageActive() {
    const view = document.getElementById('view-cai-dat');
    return !!view && !view.classList.contains('hidden-view') && !view.classList.contains('hidden');
}
window.isMasterDataPageActive = isMasterDataPageActive;

function mdCan(tabKey, action = 'view') {
    if (typeof window.canAccess !== 'function') return true;
    return window.canAccess(MASTER_DATA_TAB_MODULE[tabKey] || 'master_data', action);
}
window.mdCan = mdCan;
window.mdActiveModule = () => MASTER_DATA_TAB_MODULE[currentMasterDataTab] || 'master_data';

function firstAllowedMasterDataTab() {
    for (const grp of Object.values(MASTER_DATA_GROUPS)) {
        const tab = grp.tabs.find(t => mdCan(t));
        if (tab) return tab;
    }
    return null;
}

// Ẩn tab / nhóm tab mà người dùng không có quyền xem
function applyMasterDataAccess() {
    document.querySelectorAll('[data-md-tab]').forEach(btn => btn.classList.toggle('hidden', !mdCan(btn.getAttribute('data-md-tab'))));
    Object.entries(MASTER_DATA_GROUPS).forEach(([key, grp]) => {
        const btn = document.querySelector(`[data-md-group="${key}"]`);
        if (btn) btn.classList.toggle('hidden', !grp.tabs.some(t => mdCan(t)));
    });
}

function getMasterDataGroupForTab(tabKey) {
    for (const [groupKey, grp] of Object.entries(MASTER_DATA_GROUPS)) {
        if (grp.tabs.includes(tabKey)) return groupKey;
    }
    return 'initial_setup';
}

function switchMasterDataGroup(groupKey, targetSubTab = null) {
    currentMasterDataGroup = groupKey;
    const grp = MASTER_DATA_GROUPS[groupKey];
    if (!grp) return;

    // 1. Highlight Top Group Button
    document.querySelectorAll('.md-group-tab').forEach(btn => {
        btn.classList.remove('active', 'border-teal-700', 'text-teal-900', 'bg-white', 'shadow-2xs');
        btn.classList.add('border-transparent', 'text-slate-600');
    });
    const activeGroupBtn = document.querySelector(`[data-md-group="${groupKey}"]`);
    if (activeGroupBtn) {
        activeGroupBtn.classList.add('active', 'border-teal-700', 'text-teal-900', 'bg-white', 'shadow-2xs');
        activeGroupBtn.classList.remove('border-transparent', 'text-slate-600');
    }

    // 2. Show sub-tabs container for this group, hide others
    document.querySelectorAll('.md-group-container').forEach(c => {
        if (c.getAttribute('data-for-group') === groupKey) {
            c.classList.remove('hidden');
        } else {
            c.classList.add('hidden');
        }
    });

    // 3. Switch to target subtab or first subtab in group
    let subTabToActivate = targetSubTab;
    if (!subTabToActivate || !grp.tabs.includes(subTabToActivate)) {
        subTabToActivate = grp.tabs[0];
    }
    switchMasterDataTab(subTabToActivate);
}

let masterDataCache = {
    driver_tariffs: [],
    allowances: [],
    locations: [],
    tariffs: [],
    customers: [],
    expenses: [],
    containers: [],
    vehicles: []
};

let masterDataPagination = {
    currentPage: 1,
    pageSize: 20,
    filteredItems: []
};

async function loadMasterData() {
    try {
        const res = await fetchWithAuth('/api/master-data/summary/');
        const data = await res.json();
    } catch (err) {
        console.error('Lỗi tải tóm tắt Cài đặt:', err);
    }
    if (!currentMasterDataTab) currentMasterDataTab = 'company';
    switchMasterDataTab(currentMasterDataTab);
}

function switchMasterDataTab(tabKey) {
    applyMasterDataAccess();
    if (!mdCan(tabKey)) {
        // Tab không được cấp quyền xem: chuyển sang tab đầu tiên được phép (không có thì không mở gì)
        const allowedTab = firstAllowedMasterDataTab();
        if (!allowedTab) return;
        tabKey = allowedTab;
    }
    currentMasterDataTab = tabKey;
    masterDataPagination.currentPage = 1;
    masterDataSortColumn = null;
    masterDataSortDirection = 'asc';

    // 1. Đồng bộ Nhóm cha (Master Data Group) nếu chưa trùng
    const expectedGroup = getMasterDataGroupForTab(tabKey);
    if (currentMasterDataGroup !== expectedGroup) {
        currentMasterDataGroup = expectedGroup;
        document.querySelectorAll('.md-group-tab').forEach(btn => {
            btn.classList.remove('active', 'border-teal-700', 'text-teal-900', 'bg-white', 'shadow-2xs');
            btn.classList.add('border-transparent', 'text-slate-600');
        });
        const activeGroupBtn = document.querySelector(`[data-md-group="${expectedGroup}"]`);
        if (activeGroupBtn) {
            activeGroupBtn.classList.add('active', 'border-teal-700', 'text-teal-900', 'bg-white', 'shadow-2xs');
            activeGroupBtn.classList.remove('border-transparent', 'text-slate-600');
        }
        document.querySelectorAll('.md-group-container').forEach(c => {
            if (c.getAttribute('data-for-group') === expectedGroup) {
                c.classList.remove('hidden');
            } else {
                c.classList.add('hidden');
            }
        });
    }

    // 2. Highlight Sub-tab button
    document.querySelectorAll('.md-tab-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-teal-50', 'text-teal-800', 'border-teal-300');
        btn.classList.add('text-slate-600', 'border-transparent');
    });
    const activeBtn = document.querySelector(`[data-md-tab="${tabKey}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active', 'bg-teal-50', 'text-teal-800', 'border-teal-300');
        activeBtn.classList.remove('text-slate-600', 'border-transparent');
    }

    // 3. Highlight Top KPI Pill
    document.querySelectorAll('.md-kpi-pill').forEach(pill => {
        pill.classList.remove('ring-2', 'ring-teal-600', 'bg-teal-50/60', 'border-teal-400');
        pill.classList.add('bg-white', 'border-slate-200');
    });
    const activePill = document.querySelector(`[data-md-pill="${tabKey}"]`);
    if (activePill) {
        activePill.classList.remove('bg-white', 'border-slate-200');
        activePill.classList.add('ring-2', 'ring-teal-600', 'bg-teal-50/60', 'border-teal-400');
    }

    const labels = {
        'company': 'Sửa Thông Tin Công Ty',
        'roles_permissions': 'Quản Lý Vai Trò',
        'opening_balance': 'Khai Báo Số Dư Đầu Kỳ',
        'account_settings': 'Cài Đặt Tài Khoản',
        'driver_tariffs': 'Tạo mới',
        'allowances': 'Tạo mới',
        'locations': 'Tạo mới',
        'tariffs': 'Tạo mới',
        'customers': 'Tạo mới',
        'expenses': 'Tạo mới',
        'containers': 'Tạo mới',
        'vehicles': 'Tạo mới',
        'trailers': 'Tạo mới',
        'shipping_lines': 'Tạo mới',
        'subcontractors': 'Tạo mới'
    };
    const createBtnLabel = document.getElementById('md-create-btn-label');
    if (createBtnLabel) createBtnLabel.innerText = labels[tabKey] || 'Tạo mới';

    const searchInput = document.getElementById('md-search-input');
    if (searchInput) searchInput.value = '';

    const filterToolbar = document.getElementById('md-filter-toolbar');
    const tableContainer = document.getElementById('md-table-container');
    const paginationContainer = document.getElementById('md-pagination-container');
    const companyView = document.getElementById('md-company-view');
    const rolesView = document.getElementById('md-roles-permissions-view');
    const openingBalanceView = document.getElementById('md-opening-balance-view');
    const accountSettingsView = document.getElementById('md-account-settings-view');
    const createBtnContainer = document.getElementById('md-create-btn') || document.getElementById('md-create-btn-label')?.parentElement;

    if (createBtnContainer) createBtnContainer.style.display = '';
    if (filterToolbar) filterToolbar.classList.remove('hidden');
    if (tableContainer) tableContainer.classList.remove('hidden');
    if (paginationContainer) paginationContainer.classList.remove('hidden');
    if (companyView) companyView.classList.add('hidden');
    if (rolesView) { rolesView.classList.add('hidden'); rolesView.parentElement.classList.remove('shrink-0'); }
    if (openingBalanceView) openingBalanceView.classList.add('hidden');
    if (accountSettingsView) { accountSettingsView.classList.add('hidden'); }

    // Ẩn/hiện các nút Tải Mẫu, Nhập Excel, Xuất Dữ Liệu theo danh mục
    const isSpecialTab = (tabKey === 'company' || tabKey === 'roles_permissions' || tabKey === 'account_settings');
    const exportTemplateBtn = document.getElementById('md-export-template-btn');
    const importBtn = document.getElementById('md-import-btn');
    const exportDataBtn = document.getElementById('md-export-data-btn');
    if (exportTemplateBtn) exportTemplateBtn.style.display = (isSpecialTab || !mdCan(tabKey, 'export')) ? 'none' : '';
    if (importBtn) importBtn.style.display = (isSpecialTab || !mdCan(tabKey, 'create')) ? 'none' : '';
    if (exportDataBtn) exportDataBtn.style.display = (isSpecialTab || !mdCan(tabKey, 'export')) ? 'none' : '';
    // Nút Tạo mới (tab Công ty: Sửa thông tin) chỉ hiện khi có quyền thao tác tương ứng của tab
    if (createBtnContainer && !mdCan(tabKey, tabKey === 'company' ? 'edit' : 'create')) createBtnContainer.style.display = 'none';

    if (tabKey === 'roles_permissions' && rolesView && typeof renderAccessMatrixPage === 'function') {
        // Trang phân quyền riêng: không dùng bảng danh mục chung
        [filterToolbar, tableContainer, paginationContainer].forEach(el => el && el.classList.add('hidden'));
        if (createBtnContainer) createBtnContainer.style.display = 'none';
        rolesView.classList.remove('hidden');
        rolesView.parentElement.classList.add('shrink-0');  // khung danh mục không bị co lại cắt mất nội dung
        renderAccessMatrixPage(rolesView);
        return;
    }

    if (tabKey === 'account_settings' && accountSettingsView && typeof renderAccountSettingsPage === 'function') {
        // Trang cài đặt tài khoản riêng: không dùng bảng danh mục chung
        [filterToolbar, tableContainer, paginationContainer].forEach(el => el && el.classList.add('hidden'));
        if (createBtnContainer) createBtnContainer.style.display = 'none';
        accountSettingsView.classList.remove('hidden');
        accountSettingsView.parentElement.classList.add('shrink-0');
        renderAccountSettingsPage(accountSettingsView);
        return;
    }

    loadActiveMasterDataTab();
}

function reloadActiveMasterDataTab() {
    loadActiveMasterDataTab();
}

async function loadActiveMasterDataTab() {
    const tableBody = document.getElementById('md-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="10" class="p-8 text-center text-slate-400"><i class="ph ph-spinner animate-spin text-2xl mb-2 text-teal-600 block"></i>Đang tải dữ liệu danh mục...</td></tr>`;

    const endpoints = {
        'company': '/api/master-data/company/',
        'roles_permissions': '/api/master-data/roles-permissions/',
        'opening_balance': '/api/master-data/opening-balances/',
        'driver_tariffs': '/api/master-data/driver-tariffs/',
        'allowances': '/api/master-data/allowances/',
        'locations': '/api/master-data/locations/',
        'tariffs': '/api/master-data/tariffs/',
        'customers': '/api/master-data/customers/',
        'expenses': '/api/master-data/expense-items/',
        'containers': '/api/master-data/container-types/',
        'vehicles': '/api/master-data/vehicles/',
        'trailers': '/api/master-data/trailers/',
        'shipping_lines': '/api/master-data/shipping-lines/',
        'subcontractors': '/api/master-data/subcontractors/'
    };

    try {
        const url = endpoints[currentMasterDataTab];
        if (!url) throw new Error('Không tìm thấy API tương ứng với danh mục này.');
        const res = await fetchWithAuth(url);
        if (!res.ok) {
            throw new Error(`Máy chủ phản hồi lỗi ${res.status}: ${res.statusText}`);
        }
        const data = await res.json();
        
        let items = [];
        if (currentMasterDataTab === 'company') {
            const profile = data.data || (data.results && data.results[0]) || data;
            masterDataCache['company'] = profile;
            window.SYSTEM_COMPANY = profile;
            syncCompanyProfileToPrintForms();
            items = data.results || data.items || (profile && (profile.company_name || profile.short_name) ? [profile] : []);
        } else if (currentMasterDataTab === 'roles_permissions') {
            rolesPermissionsDataCache = data;
            items = data.results || data.items || data.roles || [];
        } else if (currentMasterDataTab === 'opening_balance') {
            openingBalanceState.data = data;
            items = data.results || data.items || [];
        } else {
            items = data.results || [];
        }

        if (currentMasterDataTab !== 'company') {
            masterDataCache[currentMasterDataTab] = items;
        }
        masterDataPagination.filteredItems = items;
        masterDataPagination.currentPage = 1;

        setupMasterDataSecondaryFilter(items);
        renderMasterDataPagedView();
    } catch (err) {
        console.error('Lỗi tải danh mục:', err);
        const isAuthError = (err.message || '').includes('401') || (err.message || '').includes('Unauthorized');
        const errorContent = isAuthError
            ? `Phiên đăng nhập đã hết hạn. Vui lòng <a href="/login/?next=${encodeURIComponent(window.location.pathname)}" class="underline text-teal-700 font-black hover:text-teal-900 ml-1">đăng nhập lại tại đây</a>.`
            : `Lỗi tải danh mục: ${err.message || 'Không thể kết nối máy chủ.'}`;
        tableBody.innerHTML = `<tr><td colspan="10" class="p-8 text-center text-rose-500 font-bold"><i class="ph-bold ph-warning-circle text-2xl mb-2 block"></i>${errorContent}</td></tr>`;
        renderMasterDataPagination(0, 0, 0, 1, 1);
    }
}

function setupMasterDataSecondaryFilter(items) {
    const select = document.getElementById('md-secondary-filter');
    if (!select) return;

    let optionsHtml = '<option value="ALL">Tất cả</option>';
    if (currentMasterDataTab === 'company') {
        optionsHtml = '<option value="ALL">Tất cả thông tin</option>';
    } else if (currentMasterDataTab === 'roles_permissions') {
        optionsHtml = '<option value="ALL">Tất cả vai trò</option>';
    } else if (currentMasterDataTab === 'opening_balance') {
        const accs = [...new Set(items.map(i => `${i.account_code || ''} - ${i.account_name || ''}`).filter(a => a.trim() !== '-'))];
        accs.forEach(a => { 
            const code = a.split(' - ')[0];
            optionsHtml += `<option value="${code}">${a}</option>`; 
        });
    } else if (currentMasterDataTab === 'driver_tariffs') {
        const areas = [...new Set(items.map(i => i.area_group))];
        areas.forEach(a => { optionsHtml += `<option value="${a}">${a}</option>`; });
    } else if (currentMasterDataTab === 'allowances') {
        const cats = [...new Set(items.map(i => i.category_label || i.category))];
        cats.forEach(c => { optionsHtml += `<option value="${c}">${c}</option>`; });
    } else if (currentMasterDataTab === 'locations') {
        const types = [...new Set(items.map(i => i.location_type_label || i.location_type))];
        types.forEach(t => { optionsHtml += `<option value="${t}">${t}</option>`; });
    } else if (currentMasterDataTab === 'expenses') {
        const groups = [...new Set(items.map(i => i.group_type_label || i.group_type))];
        groups.forEach(g => { optionsHtml += `<option value="${g}">${g}</option>`; });
    } else if (currentMasterDataTab === 'containers') {
        const cats = [...new Set(items.map(i => i.category_label || i.category))];
        cats.forEach(c => { optionsHtml += `<option value="${c}">${c}</option>`; });
    } else if (currentMasterDataTab === 'vehicles') {
        const owns = [...new Set(items.map(i => i.ownership_type_label || i.ownership_type))];
        owns.forEach(o => { optionsHtml += `<option value="${o}">${o}</option>`; });
    } else if (currentMasterDataTab === 'trailers') {
        const types = [...new Set(items.map(i => i.trailer_type))];
        types.forEach(t => { optionsHtml += `<option value="${t}">${t}</option>`; });
    } else if (currentMasterDataTab === 'customers') {
        const groups = [...new Set(items.map(i => i.customer_group_label || i.customer_group).filter(Boolean))];
        groups.forEach(g => { optionsHtml += `<option value="${g}">${g}</option>`; });
    } else if (currentMasterDataTab === 'shipping_lines') {
        optionsHtml += '<option value="ACTIVE">Đang hoạt động</option><option value="INACTIVE">Ngừng hoạt động</option>';
    } else if (currentMasterDataTab === 'subcontractors') {
        optionsHtml = `
            <option value="ALL">Tất cả đối tác</option>
            <option value="CARRIER">Nhà xe vận tải (3PL)</option>
            <option value="GARAGE">Gara sửa chữa / Bảo dưỡng</option>
            <option value="SUPPLIER">Nhà cung cấp vật tư / Dịch vụ</option>
            <option value="ACTIVE">Đang hợp tác</option>
            <option value="INACTIVE">Tạm ngưng</option>
        `;
    }
    select.innerHTML = optionsHtml;
}

function filterMasterDataTable() {
    const q = (document.getElementById('md-search-input')?.value || '').trim().toLowerCase();
    const subFilter = document.getElementById('md-secondary-filter')?.value || 'ALL';
    const allItems = masterDataCache[currentMasterDataTab] || [];

    const filtered = allItems.filter(item => {
        // Text match
        const str = JSON.stringify(item).toLowerCase();
        const matchesQuery = !q || str.includes(q);

        // Subfilter match
        let matchesSub = true;
        if (subFilter !== 'ALL') {
            if (currentMasterDataTab === 'opening_balance') matchesSub = (item.account_code || '').startsWith(subFilter);
            else if (currentMasterDataTab === 'driver_tariffs') matchesSub = item.area_group === subFilter;
            else if (currentMasterDataTab === 'allowances') matchesSub = (item.category_label === subFilter || item.category === subFilter);
            else if (currentMasterDataTab === 'locations') matchesSub = (item.location_type_label === subFilter || item.location_type === subFilter);
            else if (currentMasterDataTab === 'expenses') matchesSub = (item.group_type_label === subFilter || item.group_type === subFilter);
            else if (currentMasterDataTab === 'containers') matchesSub = (item.category_label === subFilter || item.category === subFilter);
            else if (currentMasterDataTab === 'vehicles') matchesSub = (item.ownership_type_label === subFilter || item.ownership_type === subFilter);
            else if (currentMasterDataTab === 'trailers') matchesSub = item.trailer_type === subFilter;
            else if (currentMasterDataTab === 'customers') matchesSub = (item.customer_group_label === subFilter || item.customer_group === subFilter);
            else if (currentMasterDataTab === 'shipping_lines') matchesSub = (subFilter === 'ACTIVE' ? item.is_active : !item.is_active);
            else if (currentMasterDataTab === 'subcontractors') {
        if (subFilter === 'ACTIVE') matchesSub = item.is_active;
        else if (subFilter === 'INACTIVE') matchesSub = !item.is_active;
        else if (['CARRIER', 'GARAGE', 'SUPPLIER'].includes(subFilter)) matchesSub = (item.partner_type === subFilter);
    }
        }
        return matchesQuery && matchesSub;
    });

    // Sắp xếp dữ liệu (Client-side Sorting trên đầu cột)
    if (masterDataSortColumn) {
        filtered.sort((a, b) => {
            if (masterDataSortColumn === '__stt' || masterDataSortColumn === 'id') {
                const idA = a.id || 0;
                const idB = b.id || 0;
                return masterDataSortDirection === 'asc' ? idA - idB : idB - idA;
            }
            let valA = a[masterDataSortColumn];
            let valB = b[masterDataSortColumn];

            if (valA === null || valA === undefined) valA = '';
            if (valB === null || valB === undefined) valB = '';

            if (typeof valA === 'boolean' || typeof valB === 'boolean') {
                const bA = valA ? 1 : 0;
                const bB = valB ? 1 : 0;
                return masterDataSortDirection === 'asc' ? bA - bB : bB - bA;
            }

            const numA = parseFloat(valA);
            const numB = parseFloat(valB);
            const isNumA = !isNaN(numA) && isFinite(valA) && String(valA).trim() !== '';
            const isNumB = !isNaN(numB) && isFinite(valB) && String(valB).trim() !== '';
            if (isNumA && isNumB) {
                return masterDataSortDirection === 'asc' ? numA - numB : numB - numA;
            }

            const strA = String(valA);
            const strB = String(valB);
            const cmp = strA.localeCompare(strB, 'vi', { numeric: true, sensitivity: 'base' });
            return masterDataSortDirection === 'asc' ? cmp : -cmp;
        });
    }

    masterDataPagination.filteredItems = filtered;
    masterDataPagination.currentPage = 1;
    renderMasterDataPagedView();
}

function changeMasterDataPageSize(newSize) {
    masterDataPagination.pageSize = parseInt(newSize, 10) || 20;
    masterDataPagination.currentPage = 1;
    renderMasterDataPagedView();
}

function goToMasterDataPage(pageNumber) {
    const total = masterDataPagination.filteredItems.length;
    const totalPages = Math.max(1, Math.ceil(total / masterDataPagination.pageSize));
    if (pageNumber < 1 || pageNumber > totalPages) return;
    masterDataPagination.currentPage = pageNumber;
    renderMasterDataPagedView();

    const container = document.getElementById('md-table-container');
    if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderMasterDataPagedView() {
    const all = masterDataPagination.filteredItems || [];
    const total = all.length;
    const pageSize = masterDataPagination.pageSize;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    if (masterDataPagination.currentPage > totalPages) {
        masterDataPagination.currentPage = totalPages;
    }
    if (masterDataPagination.currentPage < 1) {
        masterDataPagination.currentPage = 1;
    }

    const currentPage = masterDataPagination.currentPage;
    const startIdx = (currentPage - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, total);
    const pagedItems = all.slice(startIdx, endIdx);

    renderMasterDataTable(pagedItems, total);
    renderMasterDataPagination(startIdx, endIdx, total, totalPages, currentPage);
}

function renderMasterDataPagination(startIdx, endIdx, total, totalPages, currentPage) {
    const rangeStart = document.getElementById('md-range-start');
    const rangeEnd = document.getElementById('md-range-end');
    const countDisplay = document.getElementById('md-count-display');
    const controls = document.getElementById('md-pagination-controls');
    const pageSizeSelect = document.getElementById('md-page-size');

    if (rangeStart) rangeStart.innerText = total === 0 ? 0 : (startIdx + 1);
    if (rangeEnd) rangeEnd.innerText = endIdx;
    if (countDisplay) countDisplay.innerText = total;
    if (pageSizeSelect && pageSizeSelect.value !== String(masterDataPagination.pageSize)) {
        pageSizeSelect.value = String(masterDataPagination.pageSize);
    }

    if (!controls) return;

    if (total === 0 || totalPages <= 1) {
        controls.innerHTML = `
            <button disabled class="p-1.5 min-w-[32px] h-[32px] rounded-lg text-xs font-bold border border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed flex items-center justify-center"><i class="ph-bold ph-caret-double-left text-sm"></i></button>
            <button disabled class="p-1.5 min-w-[32px] h-[32px] rounded-lg text-xs font-bold border border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed flex items-center justify-center"><i class="ph-bold ph-caret-left text-sm"></i></button>
            <button class="px-2.5 min-w-[32px] h-[32px] rounded-lg text-xs font-black bg-teal-700 text-white border border-teal-700 shadow-2xs flex items-center justify-center">1</button>
            <button disabled class="p-1.5 min-w-[32px] h-[32px] rounded-lg text-xs font-bold border border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed flex items-center justify-center"><i class="ph-bold ph-caret-right text-sm"></i></button>
            <button disabled class="p-1.5 min-w-[32px] h-[32px] rounded-lg text-xs font-bold border border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed flex items-center justify-center"><i class="ph-bold ph-caret-double-right text-sm"></i></button>
        `;
        return;
    }

    let html = '';

    // First page button
    const isFirstDisabled = currentPage <= 1;
    html += `
        <button onclick="goToMasterDataPage(1)" ${isFirstDisabled ? 'disabled' : ''} title="Trang đầu" class="p-1.5 min-w-[32px] h-[32px] rounded-lg text-xs font-bold border flex items-center justify-center ${isFirstDisabled ? 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-teal-700 cursor-pointer transition-colors shadow-2xs'}">
            <i class="ph-bold ph-caret-double-left text-sm"></i>
        </button>
    `;

    // Prev page button
    html += `
        <button onclick="goToMasterDataPage(${currentPage - 1})" ${isFirstDisabled ? 'disabled' : ''} title="Trang trước" class="p-1.5 min-w-[32px] h-[32px] rounded-lg text-xs font-bold border flex items-center justify-center ${isFirstDisabled ? 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-teal-700 cursor-pointer transition-colors shadow-2xs'}">
            <i class="ph-bold ph-caret-left text-sm"></i>
        </button>
    `;

    // Numeric Pages with intelligent windowing
    let pages = [];
    if (totalPages <= 7) {
        for (let p = 1; p <= totalPages; p++) pages.push(p);
    } else {
        if (currentPage <= 4) {
            pages = [1, 2, 3, 4, 5, '...', totalPages];
        } else if (currentPage >= totalPages - 3) {
            pages = [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        } else {
            pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
        }
    }

    pages.forEach(p => {
        if (p === '...') {
            html += `<span class="px-2 py-1 text-slate-400 font-bold select-none text-xs flex items-center justify-center">...</span>`;
        } else {
            const isActive = p === currentPage;
            html += `
                <button onclick="goToMasterDataPage(${p})" class="px-2.5 min-w-[32px] h-[32px] rounded-lg text-xs font-bold border transition-colors flex items-center justify-center cursor-pointer ${isActive ? 'bg-teal-700 border-teal-700 text-white shadow-xs font-black' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-teal-700 shadow-2xs'}">
                    ${p}
                </button>
            `;
        }
    });

    // Next page button
    const isLastDisabled = currentPage >= totalPages;
    html += `
        <button onclick="goToMasterDataPage(${currentPage + 1})" ${isLastDisabled ? 'disabled' : ''} title="Trang sau" class="p-1.5 min-w-[32px] h-[32px] rounded-lg text-xs font-bold border flex items-center justify-center ${isLastDisabled ? 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-teal-700 cursor-pointer transition-colors shadow-2xs'}">
            <i class="ph-bold ph-caret-right text-sm"></i>
        </button>
    `;

    // Last page button
    html += `
        <button onclick="goToMasterDataPage(${totalPages})" ${isLastDisabled ? 'disabled' : ''} title="Trang cuối" class="p-1.5 min-w-[32px] h-[32px] rounded-lg text-xs font-bold border flex items-center justify-center ${isLastDisabled ? 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-teal-700 cursor-pointer transition-colors shadow-2xs'}">
            <i class="ph-bold ph-caret-double-right text-sm"></i>
        </button>
    `;

    controls.innerHTML = html;
}
