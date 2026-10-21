function toggleSubcontractorTypePanels(typeVal) {
    const isCarrier = (typeVal === 'CARRIER');
    const vehSec = document.getElementById('section-subcontractor-vehicles-mgmt');
    const drvSec = document.getElementById('section-subcontractor-drivers-mgmt');
    if (vehSec) vehSec.style.display = isCarrier ? 'block' : 'none';
    if (drvSec) drvSec.style.display = isCarrier ? 'block' : 'none';
}
window.toggleSubcontractorTypePanels = toggleSubcontractorTypePanels;

/**
 * BIM LOGISTICS — MODULE CÀI ĐẶT & HỆ THỐNG DANH MỤC (MASTER DATA)
 */

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
        tabs: ['opening_balance', 'expenses', 'driver_tariffs', 'allowances']
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
        'company': '✏️ Sửa Thông Tin Công Ty',
        'roles_permissions': '🛡️ Quản Lý Vai Trò',
        'opening_balance': '💰 Khai Báo Số Dư Đầu Kỳ',
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
    const createBtnContainer = document.getElementById('md-create-btn') || document.getElementById('md-create-btn-label')?.parentElement;

    if (createBtnContainer) createBtnContainer.style.display = '';
    if (filterToolbar) filterToolbar.classList.remove('hidden');
    if (tableContainer) tableContainer.classList.remove('hidden');
    if (paginationContainer) paginationContainer.classList.remove('hidden');
    if (companyView) companyView.classList.add('hidden');
    if (rolesView) rolesView.classList.add('hidden');
    if (openingBalanceView) openingBalanceView.classList.add('hidden');

    loadActiveMasterDataTab();
}

function reloadActiveMasterDataTab() {
    loadActiveMasterDataTab();
}

function syncCompanyProfileToPrintForms() {
    const comp = masterDataCache['company'] || window.SYSTEM_COMPANY || {};
    const compName = comp.company_name || 'CÔNG TY TNHH ĐẦU TƯ VẬN TẢI TRIỀN VÕ';
    const compAddress = comp.headquarters_address || comp.address || '153/1 Quốc Lộ 1A, P. An Phú Đông, Quận 12, TP. Hồ Chí Minh';
    const compTax = comp.tax_code || '0314567890';
    const compPhone = comp.hotline || comp.phone || '0965.559.561';
    const compEmail = comp.email || 'Phongkinhdoanh.tvl@trienvo.com';
    
    // Đảm bảo luôn lấy logo chính thức của Công ty Triền Võ (không lấy logo phần mềm BIM)
    let compLogo = comp.logo_url || '/static/images/trienvo_logo.png';
    if (!compLogo || compLogo.endsWith('/logo.png') || compLogo.includes('static/images/logo.png')) {
        compLogo = '/static/images/trienvo_logo.png';
    }

    // 1. Đồng bộ Tên công ty
    document.querySelectorAll('.print-comp-name').forEach(el => {
        el.innerText = compName.toUpperCase();
    });

    // 2. Đồng bộ Địa chỉ
    document.querySelectorAll('.print-comp-address').forEach(el => {
        el.innerText = `Đ/c: ${compAddress}`;
    });

    // 3. Đồng bộ Liên hệ (MST, Hotline, Email)
    document.querySelectorAll('.print-comp-contact').forEach(el => {
        el.innerText = `MST: ${compTax} • Hotline: ${compPhone} • Email: ${compEmail}`;
    });

    // 4. Đồng bộ Logo Công ty Triền Võ
    document.querySelectorAll('.print-comp-logo').forEach(el => {
        el.src = compLogo;
        el.onerror = () => { el.src = '/media/trienvo_logo.png'; };
    });
}
window.syncCompanyProfileToPrintForms = syncCompanyProfileToPrintForms;

async function loadCompanyProfile() {
    const container = document.getElementById('md-company-view');
    if (container) {
        container.innerHTML = `
            <div class="p-12 text-center text-slate-400">
                <i class="ph ph-spinner animate-spin text-3xl mb-2 text-teal-600 block"></i>
                Đang tải thông tin khai báo hệ thống...
            </div>
        `;
    }

    try {
        const res = await fetchWithAuth('/api/master-data/company/');
        if (!res.ok) throw new Error(`Máy chủ phản hồi lỗi ${res.status}`);
        const data = await res.json();
        const profile = data.data || {};
        masterDataCache['company'] = profile;
        window.SYSTEM_COMPANY = profile;

        if (profile.short_name || profile.company_name) {
            const el = document.getElementById('md-stat-company');
            if (el) el.innerText = profile.short_name || 'Triền Võ';
        }

        // Tự động đồng bộ lên tất cả các mẫu in
        syncCompanyProfileToPrintForms();

        renderCompanyProfileView(profile);
    } catch (err) {
        console.error('Lỗi tải thông tin công ty:', err);
        if (container) {
            container.innerHTML = `
                <div class="p-12 text-center text-rose-500 font-bold">
                    <i class="ph-bold ph-warning-circle text-3xl mb-2 block"></i>
                    Lỗi tải thông tin khai báo hệ thống: ${err.message || 'Không thể kết nối máy chủ.'}
                </div>
            `;
        }
    }
}

function renderCompanyProfileView(company) {
    const container = document.getElementById('md-company-view');
    if (!container) return;
    if (!company) {
        container.innerHTML = `
            <div class="p-8 text-center text-slate-400">
                <i class="ph ph-spinner animate-spin text-3xl mb-2 text-teal-600 block"></i>
                Đang tải thông tin khai báo hệ thống...
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="max-w-6xl mx-auto space-y-4">
            <!-- Header Card -->
            <div class="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 rounded-2xl p-5 md:p-6 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 border border-teal-700/50">
                <div class="flex items-start md:items-center space-x-4">
                    <div class="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-3xl font-black text-teal-300 shadow-inner shrink-0">
                        <i class="ph-bold ph-buildings"></i>
                    </div>
                    <div>
                        <div class="flex items-center gap-2 flex-wrap mb-1">
                            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-teal-500/30 text-teal-200 border border-teal-400/30">
                                ${escapeHtml(company.short_name || 'TRIỀN VÕ LOGISTICS')}
                            </span>
                            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                                <i class="ph-bold ph-check-circle"></i> Đang hoạt động
                            </span>
                            <span class="text-xs text-teal-300 font-mono">
                                MST: <strong class="text-white">${escapeHtml(company.tax_code || '---')}</strong>
                            </span>
                        </div>
                        <h2 class="text-lg md:text-xl font-black font-heading tracking-tight text-white leading-snug">
                            ${escapeHtml(company.company_name || 'CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ VẬN TẢI TRIỀN VÕ')}
                        </h2>
                        <p class="text-xs text-teal-200/80 mt-1 flex items-center gap-1.5 flex-wrap">
                            <span><i class="ph-bold ph-map-pin text-teal-300"></i> ${escapeHtml(company.address || '---')}</span>
                            <span class="text-teal-400">•</span>
                            <span>Cập nhật: <strong class="text-white">${escapeHtml(company.updated_at || '---')}</strong></span>
                        </p>
                    </div>
                </div>

                <div class="flex items-center gap-2 shrink-0">
                    <button onclick="openCreateMasterDataModal()" class="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs md:text-sm font-black font-heading shadow-md flex items-center space-x-2 transition-all cursor-pointer">
                        <i class="ph-bold ph-pencil-simple text-base"></i>
                        <span>Hiệu Chỉnh Thông Tin</span>
                    </button>
                </div>
            </div>

            <!-- 6 Structured Information Grid Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Card 1: Pháp lý & Định danh -->
                <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3.5">
                    <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div class="flex items-center space-x-2 text-teal-800 font-bold text-sm">
                            <i class="ph-bold ph-identification-card text-lg text-teal-600"></i>
                            <span>1. Pháp Lý & Định Danh Doanh Nghiệp</span>
                        </div>
                        <span class="text-[11px] font-bold text-slate-400">Pháp nhân</span>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                            <span class="block text-slate-400 font-medium text-[11px]">Tên pháp nhân:</span>
                            <strong class="text-slate-800 text-xs">${escapeHtml(company.company_name || '-')}</strong>
                        </div>
                        <div>
                            <span class="block text-slate-400 font-medium text-[11px]">Tên thương hiệu / Viết tắt:</span>
                            <strong class="text-teal-700 font-bold text-xs">${escapeHtml(company.short_name || '-')}</strong>
                        </div>
                        <div>
                            <span class="block text-slate-400 font-medium text-[11px]">Mã số thuế (MST):</span>
                            <strong class="text-slate-900 font-mono font-bold text-xs">${escapeHtml(company.tax_code || '-')}</strong>
                        </div>
                        <div>
                            <span class="block text-slate-400 font-medium text-[11px]">Giấy phép KD vận tải:</span>
                            <strong class="text-indigo-700 font-mono font-bold text-xs">${escapeHtml(company.operating_license || '-')}</strong>
                        </div>
                        <div>
                            <span class="block text-slate-400 font-medium text-[11px]">Người đại diện pháp luật:</span>
                            <strong class="text-slate-800 text-xs">${escapeHtml(company.representative_name || '-')}</strong>
                        </div>
                        <div>
                            <span class="block text-slate-400 font-medium text-[11px]">Chức danh đại diện:</span>
                            <strong class="text-slate-800 text-xs">${escapeHtml(company.representative_role || 'Giám Đốc')}</strong>
                        </div>
                    </div>
                </div>

                <!-- Card 2: Trụ sở & Kênh liên hệ -->
                <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3.5">
                    <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div class="flex items-center space-x-2 text-teal-800 font-bold text-sm">
                            <i class="ph-bold ph-buildings text-lg text-teal-600"></i>
                            <span>2. Trụ Sở Chính & Kênh Liên Lạc</span>
                        </div>
                        <span class="text-[11px] font-bold text-slate-400">Trụ sở</span>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div class="sm:col-span-2">
                            <span class="block text-slate-400 font-medium text-[11px]">Địa chỉ trụ sở chính (Đăng ký KD):</span>
                            <strong class="text-slate-800 text-xs leading-relaxed">${escapeHtml(company.address || '-')}</strong>
                        </div>
                        <div>
                            <span class="block text-slate-400 font-medium text-[11px]">Hotline / Điện thoại:</span>
                            <strong class="text-emerald-700 font-mono font-bold text-xs">${escapeHtml(company.phone || '-')}</strong>
                        </div>
                        <div>
                            <span class="block text-slate-400 font-medium text-[11px]">Email công ty:</span>
                            <strong class="text-blue-700 text-xs font-medium">${escapeHtml(company.email || '-')}</strong>
                        </div>
                        <div class="sm:col-span-2">
                            <span class="block text-slate-400 font-medium text-[11px]">Website chính thức:</span>
                            <a href="${escapeHtml(company.website || '#')}" target="_blank" class="text-teal-700 hover:underline font-bold text-xs flex items-center gap-1">
                                <span>${escapeHtml(company.website || '-')}</span>
                                <i class="ph ph-arrow-square-out text-xs"></i>
                            </a>
                        </div>
                    </div>
                </div>

                <!-- Card 3: Chi nhánh & Văn phòng đại diện -->
                <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3.5">
                    <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div class="flex items-center space-x-2 text-teal-800 font-bold text-sm">
                            <i class="ph-bold ph-storefront text-lg text-purple-600"></i>
                            <span>3. Chi Nhánh & Văn Phòng Đại Diện</span>
                        </div>
                        <span class="text-[11px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">Chi nhánh</span>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                            <span class="block text-slate-400 font-medium text-[11px]">Tên chi nhánh / Văn phòng:</span>
                            <strong class="text-slate-800 text-xs">${escapeHtml(company.branch_name || 'Văn Phòng Chi Nhánh')}</strong>
                        </div>
                        <div>
                            <span class="block text-slate-400 font-medium text-[11px]">Điện thoại chi nhánh:</span>
                            <strong class="text-emerald-700 font-mono font-bold text-xs">${escapeHtml(company.branch_phone || '-')}</strong>
                        </div>
                        <div class="sm:col-span-2">
                            <span class="block text-slate-400 font-medium text-[11px]">Địa chỉ chi nhánh:</span>
                            <strong class="text-slate-800 text-xs leading-relaxed">${escapeHtml(company.branch_address || '-')}</strong>
                        </div>
                    </div>
                </div>

                <!-- Card 4: Bãi xe & Trạm điều phối -->
                <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3.5">
                    <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div class="flex items-center space-x-2 text-teal-800 font-bold text-sm">
                            <i class="ph-bold ph-truck text-lg text-amber-600"></i>
                            <span>4. Bãi Đỗ Xe & Trạm Điều Phối Đầu Kéo</span>
                        </div>
                        <span class="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Bãi xe / Depot</span>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                            <span class="block text-slate-400 font-medium text-[11px]">Tên bãi đỗ xe:</span>
                            <strong class="text-slate-800 text-xs">${escapeHtml(company.fleet_yard_name || 'Bãi Đỗ Xe & Trạm Điều Phối TVL')}</strong>
                        </div>
                        <div>
                            <span class="block text-slate-400 font-medium text-[11px]">Hotline điều phối trực bãi:</span>
                            <strong class="text-amber-800 font-mono font-bold text-xs">${escapeHtml(company.fleet_yard_hotline || '-')}</strong>
                        </div>
                        <div class="sm:col-span-2">
                            <span class="block text-slate-400 font-medium text-[11px]">Địa chỉ bãi đỗ xe:</span>
                            <strong class="text-slate-800 text-xs leading-relaxed">${escapeHtml(company.fleet_yard_address || '-')}</strong>
                        </div>
                    </div>
                </div>

                <!-- Card 5: Tài khoản ngân hàng -->
                <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3.5">
                    <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div class="flex items-center space-x-2 text-teal-800 font-bold text-sm">
                            <i class="ph-bold ph-bank text-lg text-teal-600"></i>
                            <span>5. Tài Khoản Ngân Hàng Giao Dịch</span>
                        </div>
                        <span class="text-[11px] font-bold text-slate-400">Thanh toán</span>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                            <span class="block text-slate-400 font-medium text-[11px]">Số tài khoản:</span>
                            <strong class="text-emerald-800 font-mono font-black text-sm tracking-wide bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">${escapeHtml(company.bank_account_number || '-')}</strong>
                        </div>
                        <div>
                            <span class="block text-slate-400 font-medium text-[11px]">Chủ tài khoản:</span>
                            <strong class="text-slate-900 font-bold text-xs uppercase">${escapeHtml(company.company_name || '-')}</strong>
                        </div>
                        <div>
                            <span class="block text-slate-400 font-medium text-[11px]">Tên ngân hàng:</span>
                            <strong class="text-slate-800 text-xs">${escapeHtml(company.bank_name || '-')}</strong>
                        </div>
                        <div>
                            <span class="block text-slate-400 font-medium text-[11px]">Chi nhánh ngân hàng:</span>
                            <strong class="text-slate-800 text-xs">${escapeHtml(company.bank_branch || '-')}</strong>
                        </div>
                    </div>
                </div>

                <!-- Card 6: Tham số hệ thống & Tính cước -->
                <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3.5">
                    <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div class="flex items-center space-x-2 text-teal-800 font-bold text-sm">
                            <i class="ph-bold ph-sliders text-lg text-teal-600"></i>
                            <span>6. Tham Số Vận Hành & Tính Cước Mặc Định</span>
                        </div>
                        <span class="text-[11px] font-bold text-slate-400">Cấu hình</span>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span class="block text-slate-500 font-medium text-[11px]">Thuế VAT Mặc Định:</span>
                            <strong class="text-teal-800 font-mono font-black text-base">${Number(company.default_vat_rate || 8).toFixed(1)} %</strong>
                            <p class="text-[10px] text-slate-400 mt-0.5">Áp dụng báo giá & hóa đơn</p>
                        </div>
                        <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span class="block text-slate-500 font-medium text-[11px]">Giá Dầu Tham Chiếu:</span>
                            <strong class="text-amber-700 font-mono font-black text-base">${formatNumberVN(company.fuel_reference_price || 21000)} đ</strong>
                            <p class="text-[10px] text-slate-400 mt-0.5">Dầu DO 0.05S (VNĐ/Lít)</p>
                        </div>
                        <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span class="block text-slate-500 font-medium text-[11px]">Mẫu Số Quy Đổi CBM:</span>
                            <strong class="text-indigo-700 font-mono font-black text-base">${company.cbm_formula_divisor || 5000}</strong>
                            <p class="text-[10px] text-slate-400 mt-0.5">D x R x C / Divisor</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function loadActiveMasterDataTab() {
    const tableBody = document.getElementById('md-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-slate-400"><i class="ph ph-spinner animate-spin text-2xl mb-2 text-teal-600 block"></i>Đang tải dữ liệu...</td></tr>`;

    const endpoints = {
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
        const items = data.results || [];
        masterDataCache[currentMasterDataTab] = items;
        masterDataPagination.filteredItems = items;
        masterDataPagination.currentPage = 1;

        setupMasterDataSecondaryFilter(items);
        renderMasterDataPagedView();
    } catch (err) {
        console.error('Lỗi tải danh mục:', err);
        tableBody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-rose-500 font-bold"><i class="ph-bold ph-warning-circle text-2xl mb-2 block"></i>Lỗi tải danh mục: ${err.message || 'Không thể kết nối máy chủ.'}</td></tr>`;
        renderMasterDataPagination(0, 0, 0, 1, 1);
    }
}

function setupMasterDataSecondaryFilter(items) {
    const select = document.getElementById('md-secondary-filter');
    if (!select) return;

    let optionsHtml = '<option value="ALL">Tất cả</option>';
    if (currentMasterDataTab === 'driver_tariffs') {
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
        optionsHtml += '<option value="ACTIVE">Đang hợp tác</option><option value="INACTIVE">Tạm ngưng</option>';
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
            if (currentMasterDataTab === 'driver_tariffs') matchesSub = item.area_group === subFilter;
            else if (currentMasterDataTab === 'allowances') matchesSub = (item.category_label === subFilter || item.category === subFilter);
            else if (currentMasterDataTab === 'locations') matchesSub = (item.location_type_label === subFilter || item.location_type === subFilter);
            else if (currentMasterDataTab === 'expenses') matchesSub = (item.group_type_label === subFilter || item.group_type === subFilter);
            else if (currentMasterDataTab === 'containers') matchesSub = (item.category_label === subFilter || item.category === subFilter);
            else if (currentMasterDataTab === 'vehicles') matchesSub = (item.ownership_type_label === subFilter || item.ownership_type === subFilter);
            else if (currentMasterDataTab === 'trailers') matchesSub = item.trailer_type === subFilter;
            else if (currentMasterDataTab === 'customers') matchesSub = (item.customer_group_label === subFilter || item.customer_group === subFilter);
            else if (currentMasterDataTab === 'shipping_lines') matchesSub = (subFilter === 'ACTIVE' ? item.is_active : !item.is_active);
            else if (currentMasterDataTab === 'subcontractors') matchesSub = (subFilter === 'ACTIVE' ? item.is_active : !item.is_active);
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
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">${item.user_count || 0} nhân sự</span>
                </td>
                <td class="py-2.5 px-3 text-center border-r border-slate-200">
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">${item.permission_count || 0} quyền</span>
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
                <td class="py-2 px-3 text-[12px] font-bold text-slate-800 border-r border-slate-200" data-col-key="short_name">${escapeHtml(item.short_name || '—')}</td>
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
                        ? `<span class="inline-flex items-center gap-1 text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded text-[11px] border border-amber-200" title="Xe bạn / 3PL: ${escapeHtml(item.subcontractor_name || '')}"><i class="ph-bold ph-handshake"></i> ${item.subcontractor_name && item.subcontractor_name !== '-' ? escapeHtml(item.subcontractor_name) : 'Xe Bạn (3PL)'}</span>`
                        : `<span class="text-teal-900 font-bold">${item.ownership_type_label || 'Xe Nhà (TVL)'}</span>`}
                </td>
                <td class="py-2 px-3 text-[12px] text-slate-600 border-r border-slate-200">${item.brand || '—'}</td>
                <td class="py-2 px-3 text-[12px] font-mono text-slate-800 text-right border-r border-slate-200">${formatMoney(item.payload_capacity_kg).replace(' đ', '')} kg</td>
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
                <td class="py-2 px-3 text-[13px] font-bold text-slate-900 text-right font-mono tabular-nums border-r border-slate-200">${formatMoney(item.payload_capacity_kg).replace(' đ', '')} kg</td>
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
}



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

    const titles = {
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
    const items = masterDataCache[currentMasterDataTab] || [];
    const item = items.find(i => i.id === id);
    if (!item) return;

    document.getElementById('md-edit-id').value = id;
    document.getElementById('md-catalog-key').value = currentMasterDataTab;

    const titles = {
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

function injectMasterDataModalFields(data) {
    const container = document.getElementById('md-modal-fields-container');
    if (!container) return;

    const d = data || {};

    if (currentMasterDataTab === 'company') {
        container.innerHTML = `
            <div class="p-3 bg-teal-50/70 border border-teal-200/80 rounded-xl mb-3 flex items-center space-x-2.5 text-xs text-teal-900 font-medium">
                <i class="ph-bold ph-info text-base text-teal-700 shrink-0"></i>
                <span>Thông tin Khai Báo Hệ Thống sẽ được sử dụng trên toàn bộ Báo giá, Đơn đặt hàng, Biên bản giao nhận POD và Hóa đơn quyết toán.</span>
            </div>

            <!-- Group 1: Pháp lý & Định danh -->
            <div class="text-xs font-bold text-teal-800 uppercase tracking-wider pb-1 border-b border-slate-200">1. Pháp Lý & Định Danh Doanh Nghiệp</div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-8">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tên Pháp Nhân Đầy Đủ <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-cp-name" value="${escapeHtml(d.company_name || '')}" placeholder="VD: CÔNG TY TNHH VẬN TẢI TRIỀN VÕ" class="form-input h-8.5 px-2.5 py-1 text-xs font-bold text-slate-800 w-full" required>
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tên Thương Hiệu / Viết Tắt</label>
                    </div>
                    <input type="text" id="mdf-cp-short-name" value="${escapeHtml(d.short_name || '')}" placeholder="VD: TRIỀN VÕ LOGISTICS" class="form-input h-8.5 px-2.5 py-1 text-xs font-bold text-teal-700 w-full">
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Mã Số Thuế (MST) <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-cp-tax-code" value="${escapeHtml(d.tax_code || '')}" placeholder="VD: 0312345678" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-slate-800 w-full" required>
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Giấy Phép KD Vận Tải</label>
                    </div>
                    <input type="text" id="mdf-cp-license" value="${escapeHtml(d.operating_license || '')}" placeholder="VD: GP-VT-2024/TPHCM" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Người Đại Diện & Chức Vụ</label>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <input type="text" id="mdf-cp-rep-name" value="${escapeHtml(d.representative_name || '')}" placeholder="Họ tên" class="form-input h-8.5 px-2.5 py-1 text-xs font-semibold text-slate-800 w-2/3">
                        <input type="text" id="mdf-cp-rep-role" value="${escapeHtml(d.representative_role || 'Giám Đốc')}" placeholder="Chức vụ" class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-1/3">
                    </div>
                </div>
            </div>

            <!-- Group 2: Trụ sở & Liên hệ -->
            <div class="text-xs font-bold text-teal-800 uppercase tracking-wider pt-2 pb-1 border-b border-slate-200">2. Trụ Sở & Thông Tin Liên Hệ</div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Địa Chỉ Trụ Sở Chính (Đăng ký KD) <span class="text-rose-500">*</span></label>
                </div>
                <input type="text" id="mdf-cp-address" value="${escapeHtml(d.address || '')}" placeholder="VD: Số 123 Đường Nguyễn Văn Linh, P. Tân Thuận Tây, Quận 7, TP. HCM" class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full" required>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Hotline / Điện Thoại <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-cp-phone" value="${escapeHtml(d.phone || '')}" placeholder="VD: 0903.123.456" class="form-input h-8.5 px-2.5 py-1 text-xs font-bold text-emerald-700 w-full" required>
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Email Liên Hệ</label>
                    </div>
                    <input type="email" id="mdf-cp-email" value="${escapeHtml(d.email || '')}" placeholder="VD: contact@trienvo.com" class="form-input h-8.5 px-2.5 py-1 text-xs text-blue-700 w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Website Công Ty</label>
                    </div>
                    <input type="text" id="mdf-cp-website" value="${escapeHtml(d.website || '')}" placeholder="VD: https://trienvo.com" class="form-input h-8.5 px-2.5 py-1 text-xs text-teal-700 w-full">
                </div>
            </div>

            <!-- Group 3: Chi nhánh & Văn phòng -->
            <div class="text-xs font-bold text-teal-800 uppercase tracking-wider pt-2 pb-1 border-b border-slate-200">3. Chi Nhánh & Văn Phòng Đại Diện</div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-8">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tên Chi Nhánh / Văn Phòng Đại Diện</label>
                    </div>
                    <input type="text" id="mdf-cp-branch-name" value="${escapeHtml(d.branch_name || '')}" placeholder="VD: Chi Nhánh Hải Phòng / Văn Phòng Kho Sóng Thần" class="form-input h-8.5 px-2.5 py-1 text-xs font-semibold text-slate-800 w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Điện Thoại Chi Nhánh</label>
                    </div>
                    <input type="text" id="mdf-cp-branch-phone" value="${escapeHtml(d.branch_phone || '')}" placeholder="VD: 0225.3123.456" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
                </div>
                <div class="md:col-span-12">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Địa Chỉ Chi Nhánh</label>
                    </div>
                    <input type="text" id="mdf-cp-branch-address" value="${escapeHtml(d.branch_address || '')}" placeholder="VD: Lô CN-02, KCN Đình Vũ, P. Đông Hải 2, Q. Hải An, Hải Phòng" class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
            </div>

            <!-- Group 4: Bãi xe & Trạm điều phối -->
            <div class="text-xs font-bold text-teal-800 uppercase tracking-wider pt-2 pb-1 border-b border-slate-200">4. Bãi Đỗ Xe & Trạm Điều Phối Đầu Kéo</div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-8">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tên Bãi Xe / Depot Tập Kết</label>
                    </div>
                    <input type="text" id="mdf-cp-yard-name" value="${escapeHtml(d.fleet_yard_name || '')}" placeholder="VD: Bãi Xe Trung Tâm Sóng Thần - Dĩ An" class="form-input h-8.5 px-2.5 py-1 text-xs font-semibold text-slate-800 w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Hotline Điều Phối Trực Bãi</label>
                    </div>
                    <input type="text" id="mdf-cp-yard-hotline" value="${escapeHtml(d.fleet_yard_hotline || '')}" placeholder="VD: 0918.888.999" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-amber-700 w-full">
                </div>
                <div class="md:col-span-12">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Địa Chỉ Bãi Đỗ & Trạm Điều Phối</label>
                    </div>
                    <input type="text" id="mdf-cp-yard-address" value="${escapeHtml(d.fleet_yard_address || '')}" placeholder="VD: Đường ĐT743, KCN Sóng Thần 1, Dĩ An, Bình Dương" class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
            </div>

            <!-- Group 5: Ngân hàng -->
            <div class="text-xs font-bold text-teal-800 uppercase tracking-wider pt-2 pb-1 border-b border-slate-200">5. Tài Khoản Ngân Hàng Giao Dịch</div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Số Tài Khoản</label>
                    </div>
                    <input type="text" id="mdf-cp-bank-acc" value="${escapeHtml(d.bank_account_number || '')}" placeholder="VD: 19030000000001" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-emerald-800 w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tên Ngân Hàng</label>
                    </div>
                    <input type="text" id="mdf-cp-bank-name" value="${escapeHtml(d.bank_name || '')}" placeholder="VD: Ngân hàng Techcombank" class="form-input h-8.5 px-2.5 py-1 text-xs font-semibold text-slate-800 w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Chi Nhánh</label>
                    </div>
                    <input type="text" id="mdf-cp-bank-branch" value="${escapeHtml(d.bank_branch || '')}" placeholder="VD: Chi nhánh Nam Sài Gòn" class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
            </div>

            <!-- Group 6: Tham số hệ thống -->
            <div class="text-xs font-bold text-teal-800 uppercase tracking-wider pt-2 pb-1 border-b border-slate-200">6. Tham Số Vận Hành & Tính Cước Mặc Định</div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Thuế VAT Mặc Định (%)</label>
                    </div>
                    <input type="number" id="mdf-cp-vat" value="${d.default_vat_rate || 8}" step="0.1" min="0" max="100" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-teal-800 text-center w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Giá Dầu Tham Chiếu (VNĐ/Lít)</label>
                    </div>
                    <input type="text" inputmode="numeric" id="mdf-cp-fuel-price" value="${d.fuel_reference_price ? formatNumberVN(d.fuel_reference_price) : '21.000'}" class="input-number-vn form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-amber-700 text-right w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Mẫu Số Quy Đổi CBM</label>
                    </div>
                    <input type="number" id="mdf-cp-cbm-divisor" value="${d.cbm_formula_divisor || 5000}" step="100" min="1000" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-indigo-700 text-center w-full">
                </div>
            </div>

            <!-- Group 7: Ghi chú & Chính sách -->
            <div class="text-xs font-bold text-teal-800 uppercase tracking-wider pt-2 pb-1 border-b border-slate-200">7. Ghi Chú & Chính Sách Vận Hành Toàn Hệ Thống</div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Ghi Chú Vận Hành / Tiêu Chuẩn Phục Vụ</label>
                </div>
                <textarea id="mdf-cp-notes" rows="2" placeholder="VD: Áp dụng phụ phí nâng hạ ngoài giờ sau 18h; Quy định kiểm tra seal nguyên vẹn trước khi kéo..." class="form-input px-2.5 py-1.5 text-xs text-slate-800 w-full">${escapeHtml(d.notes || '')}</textarea>
            </div>
        `;
    } else if (currentMasterDataTab === 'driver_tariffs') {
        const areas = ['Khu Vực Củ Chi', 'Khu Vực Long An', 'Khu Vực Tây Ninh', 'Khu Vực Bình Dương', 'Khu Vực Đồng Nai', 'Khu Vực TP.HCM', 'Khu Vực Vũng Tàu', 'Tuyến Đặc Thù'];
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Khu Vực Kho <span class="text-rose-500">*</span></label>
                    </div>
                    <select id="mdf-area-group" class="form-select h-8.5 px-2.5 py-1 text-xs font-bold text-slate-800 w-full">
                        ${areas.map(a => `<option value="${a}" ${d.area_group === a ? 'selected' : ''}>${a}</option>`).join('')}
                    </select>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tên Tuyến / KCN / Nhà Máy <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-route-name" value="${d.route_name || ''}" placeholder="VD: KCN Phước Đông, KCN Bàu Bàng..." class="form-input h-8.5 px-2.5 py-1 text-xs font-semibold text-slate-800 w-full" required>
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Trục Lấy / Hạ Cont Chuẩn</label>
                </div>
                <input type="text" id="mdf-pickup-drop" value="${d.pickup_drop_area || 'Cát Lái, SPITC, Thủ Đức, Tân Vạn, Sóng Thần, VICT, Q4, Q7'}" placeholder="Cát Lái, SPITC, Thủ Đức..." class="form-input h-8.5 px-2.5 py-1 text-xs font-medium text-slate-800 w-full">
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-start">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Cự Ly Ước Tính (km)</label>
                        <span class="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">Bước 10km</span>
                    </div>
                    <input type="number" id="mdf-estimated-km" value="${d.estimated_km || 30}" step="10" min="0" onchange="roundEstimatedKmInput(this)" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-center w-full">
                    <div class="flex items-center gap-1 mt-1 text-[11px] text-slate-500 flex-wrap">
                        <span class="text-[10px] text-slate-400 font-semibold">Nhanh:</span>
                        <button type="button" onclick="setTariffKm(20)" class="px-1.5 py-0.2 rounded bg-slate-100 hover:bg-indigo-100 font-bold transition-colors">20k</button>
                        <button type="button" onclick="setTariffKm(30)" class="px-1.5 py-0.2 rounded bg-slate-100 hover:bg-indigo-100 font-bold transition-colors">30k</button>
                        <button type="button" onclick="setTariffKm(50)" class="px-1.5 py-0.2 rounded bg-slate-100 hover:bg-indigo-100 font-bold transition-colors">50k</button>
                        <button type="button" onclick="setTariffKm(70)" class="px-1.5 py-0.2 rounded bg-slate-100 hover:bg-indigo-100 font-bold transition-colors">70k</button>
                        <button type="button" onclick="setTariffKm(100)" class="px-1.5 py-0.2 rounded bg-slate-100 hover:bg-indigo-100 font-bold transition-colors">100k</button>
                    </div>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Mức Lương Chuyến (VNĐ) <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" inputmode="numeric" id="mdf-salary-rate" value="${d.salary_rate ? formatNumberVN(d.salary_rate) : '600.000'}" class="input-number-vn form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-emerald-700 text-right w-full" required>
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Ghi Chú Điều Kiện Áp Dụng</label>
                </div>
                <input type="text" id="mdf-notes" value="${d.notes || ''}" placeholder="VD: Lấy/hạ Cát Lái + 50k..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
            </div>
            <div class="flex items-center space-x-2 pt-1">
                <input type="checkbox" id="mdf-is-active" ${d.is_active !== false ? 'checked' : ''} class="w-4 h-4 text-teal-600 rounded">
                <label for="mdf-is-active" class="text-xs font-bold text-slate-700 cursor-pointer">Đang hoạt động / áp dụng</label>
            </div>
        `;
    } else if (currentMasterDataTab === 'allowances') {
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Mã Phụ Cấp <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-code" value="${d.code || ''}" placeholder="VD: CANG_HIEP_PHUOC" class="form-input h-8.5 px-2.5 py-1 text-xs uppercase font-mono font-bold w-full" required ${d.code ? 'readonly' : ''}>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Phân Loại</label>
                    </div>
                    <select id="mdf-category" class="form-select h-8.5 px-2.5 py-1 text-xs font-bold text-slate-800 w-full">
                        <option value="PORT" ${d.category === 'PORT' ? 'selected' : ''}>Phụ Thêm Cảng Xa</option>
                        <option value="INSPECTION" ${d.category === 'INSPECTION' ? 'selected' : ''}>Phụ Thu Kiểm Hóa</option>
                        <option value="OPERATION" ${d.category === 'OPERATION' ? 'selected' : ''}>Phụ Cấp Tác Nghiệp Đặc Thù</option>
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tên Phụ Cấp / Tác Nghiệp <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-name" value="${d.name || ''}" placeholder="VD: Phụ thêm Cảng Cái Mép..." class="form-input h-8.5 px-2.5 py-1 text-xs font-semibold text-slate-800 w-full" required>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Số Tiền Phụ Cấp (VNĐ) <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" inputmode="numeric" id="mdf-amount" value="${d.amount ? formatNumberVN(d.amount) : '500.000'}" class="input-number-vn form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-teal-800 text-right w-full" required>
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Điều Kiện Áp Dụng</label>
                </div>
                <input type="text" id="mdf-notes" value="${d.notes || ''}" placeholder="VD: Lấy hoặc hạ cont tại Cảng..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
            </div>
            <div class="flex items-center space-x-2 pt-1">
                <input type="checkbox" id="mdf-is-active" ${d.is_active !== false ? 'checked' : ''} class="w-4 h-4 text-teal-600 rounded">
                <label for="mdf-is-active" class="text-xs font-bold text-slate-700 cursor-pointer">Đang hoạt động / áp dụng</label>
            </div>
        `;
    } else if (currentMasterDataTab === 'locations') {
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Mã Địa Điểm <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-code" value="${d.code || ''}" placeholder="VD: CAT_LAI, KHO_WCA..." class="form-input h-8.5 px-2.5 py-1 text-xs uppercase font-mono font-bold w-full" required ${d.code ? 'readonly' : ''}>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Phân Loại</label>
                    </div>
                    <select id="mdf-location-type" class="form-select h-8.5 px-2.5 py-1 text-xs font-bold text-slate-800 w-full">
                        <option value="PORT" ${d.location_type === 'PORT' ? 'selected' : ''}>Cảng Biển</option>
                        <option value="ICD" ${d.location_type === 'ICD' ? 'selected' : ''}>Cảng Cạn (ICD)</option>
                        <option value="DEPOT" ${d.location_type === 'DEPOT' ? 'selected' : ''}>Bãi Rỗng / Depot</option>
                        <option value="WAREHOUSE" ${d.location_type === 'WAREHOUSE' ? 'selected' : ''}>Kho Hàng / Nhà Máy</option>
                        <option value="YARD" ${d.location_type === 'YARD' ? 'selected' : ''}>Bãi Đỗ Xe Công Ty</option>
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tên Địa Điểm <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-name" value="${d.name || ''}" placeholder="VD: Cảng Cát Lái, Kho WCA Tân Vạn..." class="form-input h-8.5 px-2.5 py-1 text-xs font-semibold text-slate-800 w-full" required>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tỉnh / Thành Phố</label>
                    </div>
                    <input type="text" id="mdf-province" value="${d.province || 'TP. Hồ Chí Minh'}" class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Địa Chỉ Chi Tiết</label>
                    </div>
                    <input type="text" id="mdf-address" value="${d.address || ''}" placeholder="Số nhà, đường, phường, quận/huyện..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Số Điện Thoại Liên Hệ</label>
                    </div>
                    <input type="text" id="mdf-contact-phone" value="${d.contact_phone || ''}" placeholder="SĐT điều độ..." class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Người Phụ Trách / Đầu Mối</label>
                    </div>
                    <input type="text" id="mdf-contact-person" value="${d.contact_person || ''}" placeholder="Tên nhân sự phụ trách..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Ghi Chú Vận Hành</label>
                    </div>
                    <input type="text" id="mdf-notes" value="${d.notes || ''}" placeholder="Giờ làm việc kho, quy định vào cổng..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
            </div>
            <div class="flex items-center space-x-2 pt-1">
                <input type="checkbox" id="mdf-is-active" ${d.is_active !== false ? 'checked' : ''} class="w-4 h-4 text-teal-600 rounded">
                <label for="mdf-is-active" class="text-xs font-bold text-slate-700 cursor-pointer">Đang hoạt động</label>
            </div>
        `;
    } else if (currentMasterDataTab === 'customers') {
        const group = d.customer_group || 'COMMERCIAL_TRADING';
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Mã Khách Hàng</label>
                    </div>
                    <input type="text" id="mdf-code" value="${d.code || ''}" placeholder="Tự sinh nếu để trống" class="form-input h-8.5 px-2.5 py-1 text-xs uppercase font-mono font-bold w-full" ${d.code ? 'readonly' : ''}>
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Mã Số Thuế (MST)</label>
                    </div>
                    <input type="text" id="mdf-tax-code" value="${d.tax_code || ''}" placeholder="MST doanh nghiệp..." class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-semibold text-slate-800 w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Nhóm Khách Hàng <span class="text-rose-500">*</span></label>
                    </div>
                    <select id="mdf-customer-group" class="form-select h-8.5 px-2.5 py-1 text-xs font-semibold text-slate-800 w-full">
                        <option value="COMMERCIAL_TRADING" ${group === 'COMMERCIAL_TRADING' ? 'selected' : ''}>Thương mại / XNK</option>
                        <option value="FDI_ENTERPRISE" ${group === 'FDI_ENTERPRISE' ? 'selected' : ''}>Doanh nghiệp FDI / Nhà máy</option>
                        <option value="FORWARDER_LOGISTICS" ${group === 'FORWARDER_LOGISTICS' ? 'selected' : ''}>Đại lý 3PL / Forwarder</option>
                        <option value="DOMESTIC_FACTORY" ${group === 'DOMESTIC_FACTORY' ? 'selected' : ''}>Nhà máy nội địa</option>
                        <option value="WALK_IN_RETAIL" ${group === 'WALK_IN_RETAIL' ? 'selected' : ''}>Khách lẻ / Vãng lai</option>
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-8">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tên Khách Hàng / Doanh Nghiệp <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-name" value="${d.name || ''}" placeholder="Tên đầy đủ theo giấy phép ĐKKD..." class="form-input h-8.5 px-2.5 py-1 text-xs font-semibold text-slate-800 w-full" required>
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tên Viết Tắt</label>
                    </div>
                    <input type="text" id="mdf-short-name" value="${d.short_name || ''}" placeholder="VD: ABC, OASIS..." class="form-input h-8.5 px-2.5 py-1 text-xs font-semibold text-teal-800 bg-teal-50/40 border border-teal-300 rounded-md w-full">
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Địa Chỉ Xuất Hóa Đơn / Văn Phòng <span class="text-rose-500">*</span></label>
                </div>
                <input type="text" id="mdf-address" value="${d.address || ''}" placeholder="Địa chỉ đăng ký kinh doanh..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full" required>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Email Công Ty (Nhận HĐĐT / Công Nợ)</label>
                    </div>
                    <input type="email" id="mdf-company-email" value="${d.company_email || ''}" placeholder="ketoan@company.com..." class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
                </div>
                <div class="md:col-span-3">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Người Phụ Trách</label>
                    </div>
                    <input type="text" id="mdf-contact-person" value="${d.contact_person || ''}" placeholder="Tên nhân sự..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
                <div class="md:col-span-3">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Chức Vụ</label>
                    </div>
                    <input type="text" id="mdf-contact-title" value="${d.contact_title || ''}" placeholder="VD: Trưởng phòng XNK..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Số Điện Thoại Liên Hệ</label>
                    </div>
                    <input type="text" id="mdf-phone" value="${d.phone || ''}" placeholder="SĐT liên hệ..." class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Email Người Liên Hệ (Vận Hành / Booking)</label>
                    </div>
                    <input type="email" id="mdf-contact-email" value="${d.contact_email || ''}" placeholder="ops@company.com..." class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Số Tài Khoản Ngân Hàng</label>
                    </div>
                    <input type="text" id="mdf-bank-acc" value="${d.bank_account_number || ''}" placeholder="Số tài khoản..." class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tên Ngân Hàng</label>
                    </div>
                    <input type="text" id="mdf-bank-name" value="${d.bank_name || ''}" placeholder="VD: Vietcombank, ACB..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Chi Nhánh Ngân Hàng</label>
                    </div>
                    <input type="text" id="mdf-bank-branch" value="${d.bank_branch || ''}" placeholder="VD: CN Tân Bình..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tên Chủ Tài Khoản</label>
                    </div>
                    <input type="text" id="mdf-bank-holder" value="${d.bank_account_holder || ''}" placeholder="Tên in hoa trên thẻ..." class="form-input h-8.5 px-2.5 py-1 text-xs uppercase text-slate-800 w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Kỳ Hạn Thanh Toán (Ngày)</label>
                    </div>
                    <input type="number" id="mdf-payment-term" value="${d.payment_term_days || 30}" min="0" step="1" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-center w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Hạn Mức Nợ Tối Đa (VNĐ)</label>
                    </div>
                    <input type="text" id="mdf-credit-limit" value="${d.credit_limit ? formatNumberVN(d.credit_limit) : '0'}" placeholder="0 = Không giới hạn" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-teal-800 text-right input-number-vn w-full">
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Ghi Chú & Điều Kiện Vận Hành / Hợp Đồng</label>
                </div>
                <input type="text" id="mdf-notes" value="${d.notes || ''}" placeholder="Chính sách công nợ, quy định giao nhận, an toàn kho..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
            </div>
        `;
    } else if (currentMasterDataTab === 'tariffs') {
        const customers = masterDataFormOptionsCache?.customers || masterDataCache['customers'] || [];
        const pickupOpts = masterDataFormOptionsCache?.locations?.pickup_options || masterDataCache['locations'] || [];
        const warehouseOpts = masterDataFormOptionsCache?.locations?.warehouse_options || masterDataCache['locations'] || [];
        const dropoffOpts = masterDataFormOptionsCache?.locations?.dropoff_options || masterDataCache['locations'] || [];
        const contSizes = ['40HC', '20DC', '45G1', '40GP', '20RF', '40RF', 'XE_TAI_10T', 'XE_TAI_2T'];
        container.innerHTML = `
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Khách Hàng Áp Dụng <span class="text-rose-500">*</span></label>
                </div>
                <select id="mdf-customer-id" class="form-select h-8.5 px-2.5 py-1 text-xs font-bold text-slate-800 w-full" required>
                    <option value="">-- Chọn Khách Hàng --</option>
                    ${customers.map(c => `<option value="${c.id}" ${d.customer_id === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
                </select>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-teal-900 text-xs truncate flex items-center gap-1">
                            <i class="ph-bold ph-map-pin text-teal-600"></i>
                            1. Khu Vực Đi / Lấy Cont
                        </label>
                    </div>
                    <input type="text" id="mdf-origin-zone" list="mdf-origin-zones-list" value="${d.origin_zone || ''}" placeholder="VD: Cát Lái, Cái Mép, Hiệp Phước..." class="form-input h-8.5 px-2.5 py-1 text-xs font-bold text-teal-900 w-full">
                    <datalist id="mdf-origin-zones-list">
                        <option value="Cát Lái (TP.HCM)">
                        <option value="Cái Mép (Vũng Tàu)">
                        <option value="Hiệp Phước (Nhà Bè)">
                        <option value="SPITC / Phú Hữu">
                        <option value="Sóng Thần / Dĩ An">
                        <option value="Bãi Triền Võ (TVL)">
                    </datalist>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-teal-900 text-xs truncate flex items-center gap-1">
                            <i class="ph-bold ph-flag-pennant text-teal-600"></i>
                            2. Khu Vực Đến / Giao Hàng
                        </label>
                    </div>
                    <input type="text" id="mdf-dest-zone" list="mdf-dest-zones-list" value="${d.destination_zone || ''}" placeholder="VD: VSIP, Bàu Bàng, Trảng Bàng, Bến Lức..." class="form-input h-8.5 px-2.5 py-1 text-xs font-bold text-teal-900 w-full">
                    <datalist id="mdf-dest-zones-list">
                        <option value="Bình Dương (VSIP/Bàu Bàng/Mỹ Phước)">
                        <option value="Đồng Nai (Biên Hòa/Nhơn Trạch/Long Thành)">
                        <option value="Tây Ninh (Trảng Bàng/Phước Đông)">
                        <option value="Long An (Bến Lức/Đức Hòa/Tân An)">
                        <option value="Củ Chi / Hóc Môn / TP.HCM">
                        <option value="Vũng Tàu / Phú Mỹ">
                    </datalist>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Nơi Lấy (Cảng / ICD) <span class="text-rose-500">*</span></label>
                    </div>
                    <select id="mdf-pickup" class="form-select h-8.5 px-2.5 py-1 text-xs uppercase font-bold text-teal-900 w-full" required>
                        <option value="">-- Chọn Nơi Lấy --</option>
                        ${pickupOpts.map(l => `<option value="${l.name}" ${d.pickup_location === l.name ? 'selected' : ''}>${l.label || l.name}</option>`).join('')}
                    </select>
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Kho Nhận (Nhà Máy / Kho) <span class="text-rose-500">*</span></label>
                    </div>
                    <select id="mdf-delivery" class="form-select h-8.5 px-2.5 py-1 text-xs uppercase font-bold text-amber-900 w-full" required>
                        <option value="">-- Chọn Kho Nhận --</option>
                        ${warehouseOpts.map(l => `<option value="${l.name}" ${d.delivery_location === l.name ? 'selected' : ''}>${l.label || l.name}</option>`).join('')}
                    </select>
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Nơi Hạ Cont (Bãi / Cảng)</label>
                    </div>
                    <select id="mdf-dropoff" class="form-select h-8.5 px-2.5 py-1 text-xs uppercase font-bold text-emerald-900 w-full">
                        <option value="">-- Chọn Nơi Hạ --</option>
                        ${dropoffOpts.map(l => `<option value="${l.name}" ${d.dropoff_location === l.name ? 'selected' : ''}>${l.label || l.name}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Quy Cách Cont / Phương Tiện</label>
                    </div>
                    <select id="mdf-container-size" class="form-select h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-slate-800 w-full">
                        ${contSizes.map(s => `<option value="${s}" ${(d.container_size || '40HC') === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Cự Ly Ước Tính (km)</label>
                        <span class="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">Bước 10km</span>
                    </div>
                    <input type="text" id="mdf-estimated-km" value="${d.estimated_km || 30}" onchange="roundEstimatedKmInput(this)" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-center input-number-vn w-full" placeholder="VD: 30">
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Đơn Giá Cước (HĐ) <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-price" value="${d.freight_price ? formatNumberVN(d.freight_price) : '4.000.000'}" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-teal-800 text-right input-number-vn w-full" placeholder="VD: 4.000.000" required>
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Lương Chuyến Tài Xế <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-pay" value="${d.driver_trip_pay ? formatNumberVN(d.driver_trip_pay) : '600.000'}" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-emerald-700 text-right input-number-vn w-full" placeholder="VD: 600.000" required>
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Vé BOT / Cầu Đường Chuẩn</label>
                    </div>
                    <input type="text" id="mdf-toll" value="${d.toll_standard_fee ? formatNumberVN(d.toll_standard_fee) : '0'}" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-amber-700 text-right input-number-vn w-full" placeholder="VD: 150.000">
                </div>
            </div>
        `;
        if (d.pickup_location) setSelectValueCaseInsensitive(document.getElementById('mdf-pickup'), d.pickup_location);
        if (d.delivery_location) setSelectValueCaseInsensitive(document.getElementById('mdf-delivery'), d.delivery_location);
        if (d.dropoff_location) setSelectValueCaseInsensitive(document.getElementById('mdf-dropoff'), d.dropoff_location);
    } else if (currentMasterDataTab === 'expenses') {
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Mã Khoản Chi <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-code" value="${d.code || ''}" placeholder="VD: LIFT_ON, TOLL_FEE..." class="form-input h-8.5 px-2.5 py-1 text-xs uppercase font-mono font-bold w-full" required ${d.code ? 'readonly' : ''}>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Nhóm Chi Phí</label>
                    </div>
                    <select id="mdf-group-type" class="form-select h-8.5 px-2.5 py-1 text-xs font-bold text-slate-800 w-full">
                        <option value="TOLL" ${d.group_type === 'TOLL' ? 'selected' : ''}>Vé Cầu Đường / BOT</option>
                        <option value="LIFT_ON" ${d.group_type === 'LIFT_ON' ? 'selected' : ''}>Nâng Cont</option>
                        <option value="LIFT_OFF" ${d.group_type === 'LIFT_OFF' ? 'selected' : ''}>Hạ Cont</option>
                        <option value="DEPOSIT" ${d.group_type === 'DEPOSIT' ? 'selected' : ''}>Cược Container</option>
                        <option value="WEIGHING" ${d.group_type === 'WEIGHING' ? 'selected' : ''}>Cân Xe</option>
                        <option value="LABOR" ${d.group_type === 'LABOR' ? 'selected' : ''}>Bốc Xếp / Bồi Dưỡng</option>
                        <option value="EINVOICE" ${d.group_type === 'EINVOICE' ? 'selected' : ''}>Hóa Đơn Điện Tử Cảng</option>
                        <option value="OTHER" ${d.group_type === 'OTHER' ? 'selected' : ''}>Chi Phí Khác</option>
                    </select>
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Tên Khoản Mục Chi Phí <span class="text-rose-500">*</span></label>
                </div>
                <input type="text" id="mdf-name" value="${d.name || ''}" placeholder="VD: Phí nâng cont, Vé BOT..." class="form-input h-8.5 px-2.5 py-1 text-xs font-semibold text-slate-800 w-full" required>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Định Mức Tiền Ngầm Định (VNĐ)</label>
                    </div>
                    <input type="text" id="mdf-default-amount" value="${d.default_amount ? formatNumberVN(d.default_amount) : '0'}" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-teal-800 text-right input-number-vn w-full" placeholder="VD: 100.000">
                </div>
                <div class="md:col-span-6 flex items-center pt-6 space-x-2">
                    <input type="checkbox" id="mdf-requires-invoice" ${d.requires_invoice ? 'checked' : ''} class="w-4 h-4 text-teal-600 rounded cursor-pointer">
                    <label for="mdf-requires-invoice" class="text-xs font-bold text-slate-700 cursor-pointer">Bắt buộc có HĐĐT / Mã tra cứu</label>
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Ghi Chú & Điều Kiện Áp Dụng</label>
                </div>
                <input type="text" id="mdf-notes" value="${d.notes || ''}" placeholder="Quy định thanh toán, chứng từ thanh toán..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
            </div>
            <div class="flex items-center space-x-2 pt-1">
                <input type="checkbox" id="mdf-is-active" ${d.is_active !== false ? 'checked' : ''} class="w-4 h-4 text-teal-600 rounded cursor-pointer">
                <label for="mdf-is-active" class="text-xs font-bold text-slate-700 cursor-pointer">Đang sử dụng</label>
            </div>
        `;
    } else if (currentMasterDataTab === 'containers') {
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Mã Quy Cách <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-code" value="${d.code || ''}" placeholder="VD: 40HC, 20DC, TAI_10T..." class="form-input h-8.5 px-2.5 py-1 text-xs uppercase font-mono font-bold w-full" required ${d.code ? 'readonly' : ''}>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Phân Loại Phương Tiện / Thùng</label>
                    </div>
                    <select id="mdf-category" class="form-select h-8.5 px-2.5 py-1 text-xs font-bold text-slate-800 w-full">
                        <option value="CONTAINER" ${d.category === 'CONTAINER' ? 'selected' : ''}>Container Đường Biển</option>
                        <option value="TRUCK" ${d.category === 'TRUCK' ? 'selected' : ''}>Xe Tải Thùng / Đường Bộ</option>
                    </select>
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Tên Quy Cách / Tên Loại Thùng <span class="text-rose-500">*</span></label>
                </div>
                <input type="text" id="mdf-name" value="${d.name || ''}" placeholder="VD: Container 40ft Cao (40HC)..." class="form-input h-8.5 px-2.5 py-1 text-xs font-semibold text-slate-800 w-full" required>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Hệ Số TEU</label>
                    </div>
                    <input type="number" id="mdf-teu" value="${d.teu_factor !== undefined ? d.teu_factor : 2.0}" step="0.25" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-center w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tải Trọng Cho Phép (kg)</label>
                    </div>
                    <input type="text" id="mdf-payload" value="${d.max_payload_kg ? formatNumberVN(d.max_payload_kg) : '30.000'}" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-right input-number-vn w-full" placeholder="VD: 30.000">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Thể Tích Chứa (CBM)</label>
                    </div>
                    <input type="number" id="mdf-cbm" value="${d.cbm_capacity || 67}" step="0.5" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-center w-full">
                </div>
            </div>
            <div class="flex items-center space-x-2 pt-1">
                <input type="checkbox" id="mdf-is-active" ${d.is_active !== false ? 'checked' : ''} class="w-4 h-4 text-teal-600 rounded cursor-pointer">
                <label for="mdf-is-active" class="text-xs font-bold text-slate-700 cursor-pointer">Đang hoạt động</label>
            </div>
        `;
    } else if (currentMasterDataTab === 'vehicles') {
        const drivers = masterDataFormOptionsCache?.drivers || [];
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Biển Số Xe <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-license-plate" value="${d.license_plate || ''}" placeholder="VD: 51H-123.45..." class="form-input h-8.5 px-2.5 py-1 text-xs uppercase font-mono font-black w-full" required ${d.license_plate ? 'readonly' : ''}>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Nguồn Sở Hữu</label>
                    </div>
                    <select id="mdf-ownership" class="form-select h-8.5 px-2.5 py-1 text-xs font-bold text-slate-800 w-full">
                        <option value="OWNED" ${d.ownership_type === 'OWNED' ? 'selected' : ''}>Xe Nhà (Đội Xe Công Ty)</option>
                        <option value="SUBCONTRACTOR" ${d.ownership_type === 'SUBCONTRACTOR' ? 'selected' : ''}>Xe Bạn (Thuê Ngoài / 3PL)</option>
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Loại Phương Tiện</label>
                    </div>
                    <select id="mdf-vehicle-type" class="form-select h-8.5 px-2.5 py-1 text-xs font-bold text-slate-800 w-full">
                        <option value="TRACTOR" ${d.vehicle_type === 'TRACTOR' ? 'selected' : ''}>Đầu kéo Container</option>
                        <option value="TRUCK_10T" ${d.vehicle_type === 'TRUCK_10T' ? 'selected' : ''}>Xe tải 10 Tấn</option>
                        <option value="TRUCK_2T" ${d.vehicle_type === 'TRUCK_2T' ? 'selected' : ''}>Xe tải 2 Tấn</option>
                        <option value="VAN" ${d.vehicle_type === 'VAN' ? 'selected' : ''}>Xe tải nhỏ / Van</option>
                    </select>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Hãng Sản Xuất / Dòng Xe</label>
                    </div>
                    <input type="text" id="mdf-brand" value="${d.brand || 'Freightliner'}" placeholder="VD: Freightliner, Hino, Isuzu..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tài Xế Mặc Định Gắn Xe</label>
                    </div>
                    <select id="mdf-driver-id" class="form-select h-8.5 px-2.5 py-1 text-xs font-semibold text-slate-800 w-full">
                        <option value="">-- Chưa gán tài xế --</option>
                        ${drivers.map(dr => `<option value="${dr.id}" ${d.current_driver_id === dr.id ? 'selected' : ''}>${dr.label || dr.nickname || dr.full_name}</option>`).join('')}
                    </select>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tải Trọng Cho Phép (kg)</label>
                    </div>
                    <input type="text" id="mdf-payload" value="${d.payload_capacity_kg ? formatNumberVN(d.payload_capacity_kg) : '30.000'}" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-right input-number-vn w-full" placeholder="VD: 30.000">
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Hạn Đăng Kiểm</label>
                    </div>
                    <input type="date" id="mdf-reg-expiry" value="${d.registration_expiry ? (d.registration_expiry.includes('/') ? d.registration_expiry.split('/').reverse().join('-') : d.registration_expiry) : ''}" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Hạn Bảo Hiểm</label>
                    </div>
                    <input type="date" id="mdf-ins-expiry" value="${d.insurance_expiry ? (d.insurance_expiry.includes('/') ? d.insurance_expiry.split('/').reverse().join('-') : d.insurance_expiry) : ''}" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Bảo Trì Kế Tiếp</label>
                    </div>
                    <input type="date" id="mdf-maint-date" value="${d.next_maintenance_date ? (d.next_maintenance_date.includes('/') ? d.next_maintenance_date.split('/').reverse().join('-') : d.next_maintenance_date) : ''}" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Trạng Thái Phương Tiện</label>
                </div>
                <select id="mdf-vehicle-status" class="form-select h-8.5 px-2.5 py-1 text-xs font-bold text-slate-800 w-full">
                    <option value="IDLE" ${d.status === 'IDLE' ? 'selected' : ''}>Nằm bãi (Chờ việc)</option>
                    <option value="ACTIVE" ${d.status === 'ACTIVE' ? 'selected' : ''}>Đang chạy (Có hàng)</option>
                    <option value="MAINTENANCE" ${d.status === 'MAINTENANCE' ? 'selected' : ''}>Hư hỏng / Bảo trì</option>
                    <option value="DECOMMISSIONED" ${d.status === 'DECOMMISSIONED' ? 'selected' : ''}>Ngừng sử dụng</option>
                </select>
            </div>
        `;
    } else if (currentMasterDataTab === 'trailers') {
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Biển Số Rơ-Moóc <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-trailer-plate" value="${d.license_plate || ''}" placeholder="VD: 51R-123.45" class="form-input h-8.5 px-2.5 py-1 text-xs uppercase font-mono font-black w-full" required ${d.license_plate ? 'readonly' : ''}>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Loại Rơ-Moóc <span class="text-rose-500">*</span></label>
                    </div>
                    <select id="mdf-trailer-type" class="form-select h-8.5 px-2.5 py-1 text-xs font-bold text-slate-800 w-full">
                        <option value="MOOC_XUONG_40" ${d.trailer_type === 'MOOC_XUONG_40' ? 'selected' : ''}>Moóc Xương 40ft (3 Trục)</option>
                        <option value="MOOC_CO_CO_40" ${d.trailer_type === 'MOOC_CO_CO_40' ? 'selected' : ''}>Moóc Cổ Cò 40ft (Chở Cont Lạnh/HC)</option>
                        <option value="MOOC_XUONG_20" ${d.trailer_type === 'MOOC_XUONG_20' ? 'selected' : ''}>Moóc Xương 20ft (3 Trục)</option>
                        <option value="MOOC_SAN_45" ${d.trailer_type === 'MOOC_SAN_45' ? 'selected' : ''}>Moóc Sàn 45ft</option>
                        <option value="MOOC_LUN" ${d.trailer_type === 'MOOC_LUN' ? 'selected' : ''}>Moóc Lùn / Chuyên Dụng</option>
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Hãng Sản Xuất</label>
                    </div>
                    <input type="text" id="mdf-trailer-brand" value="${d.brand || 'Tân Thanh'}" placeholder="VD: Tân Thanh, CIMC, Doosung..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tải Trọng Thiết Kế (kg)</label>
                    </div>
                    <input type="text" id="mdf-trailer-payload" value="${d.payload_capacity_kg ? formatNumberVN(d.payload_capacity_kg) : '32.000'}" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-right input-number-vn w-full" placeholder="VD: 32.000">
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Hạn Đăng Kiểm Định Kỳ</label>
                    </div>
                    <input type="date" id="mdf-trailer-expiry" value="${d.registration_expiry ? (d.registration_expiry.includes('/') ? d.registration_expiry.split('/').reverse().join('-') : d.registration_expiry) : ''}" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Trạng Thái Hoạt Động</label>
                    </div>
                    <select id="mdf-trailer-status" class="form-select h-8.5 px-2.5 py-1 text-xs font-bold text-slate-800 w-full">
                        <option value="IDLE" ${d.status === 'IDLE' ? 'selected' : ''}>Nằm bãi (Chờ kéo)</option>
                        <option value="ACTIVE" ${d.status === 'ACTIVE' ? 'selected' : ''}>Đang gắn xe kéo</option>
                        <option value="MAINTENANCE" ${d.status === 'MAINTENANCE' ? 'selected' : ''}>Bảo trì / Sửa chữa</option>
                    </select>
                </div>
            </div>
        `;
    } else if (currentMasterDataTab === 'shipping_lines') {
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Mã Hãng Tàu <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-sl-code" value="${d.code || ''}" placeholder="VD: MAEU, ONE, COSCO..." class="form-input h-8.5 px-2.5 py-1 text-xs uppercase font-mono font-black w-full" required ${d.code ? 'readonly' : ''}>
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tên Hãng Tàu / Đơn Vị Vận Chuyển <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-sl-name" value="${d.name || ''}" placeholder="VD: Ocean Network Express..." class="form-input h-8.5 px-2.5 py-1 text-xs font-semibold text-slate-800 w-full" required>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Hotline CSKH / Cấp Vỏ</label>
                    </div>
                    <input type="text" id="mdf-sl-phone" value="${d.contact_phone || ''}" placeholder="VD: 028-3827-0100" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Email Tiếp Nhận e-DO</label>
                    </div>
                    <input type="email" id="mdf-sl-email" value="${d.contact_email || ''}" placeholder="cs@shipping.com" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Website Lấy e-DO / Tra Cứu Container</label>
                </div>
                <input type="url" id="mdf-sl-web" value="${d.website || ''}" placeholder="https://..." class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Free DEM Chuẩn (Ngày)</label>
                    </div>
                    <input type="number" id="mdf-sl-dem" value="${d.free_dem_days || 7}" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-center text-teal-800 w-full">
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Free DET Chuẩn (Ngày)</label>
                    </div>
                    <input type="number" id="mdf-sl-det" value="${d.free_det_days || 5}" class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-center text-amber-800 w-full">
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Ghi Chú Quy Định Cấp Vỏ / Hạ Rỗng</label>
                </div>
                <input type="text" id="mdf-sl-notes" value="${d.notes || ''}" placeholder="Depot chỉ định hạ rỗng, lưu ý hãng..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
            </div>
            <div class="flex items-center space-x-2 pt-1">
                <input type="checkbox" id="mdf-is-active" ${d.is_active !== false ? 'checked' : ''} class="w-4 h-4 text-teal-600 rounded cursor-pointer">
                <label for="mdf-is-active" class="text-xs font-bold text-slate-700 cursor-pointer">Đang hoạt động</label>
            </div>
        `;
    } else if (currentMasterDataTab === 'subcontractors') {
        const contactVal = (d.contact_person && d.contact_person !== 'null') ? d.contact_person : '';
        const partnerTypeVal = d.partner_type || 'CARRIER';
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-teal-900 text-xs truncate">Loại Đối Tác <span class="text-rose-500">*</span></label>
                    </div>
                    <select id="mdf-sc-partner-type" onchange="toggleSubcontractorTypePanels(this.value)" class="form-select h-8.5 px-2.5 py-1 text-xs font-bold text-teal-950 border-teal-300 bg-teal-50/40 w-full rounded">
                        <option value="CARRIER" ${partnerTypeVal === 'CARRIER' ? 'selected' : ''}>🏢 Nhà xe vận tải (3PL)</option>
                        <option value="GARAGE" ${partnerTypeVal === 'GARAGE' ? 'selected' : ''}>🔧 Gara sửa chữa / Bảo dưỡng</option>
                        <option value="SUPPLIER" ${partnerTypeVal === 'SUPPLIER' ? 'selected' : ''}>📦 Nhà cung cấp vật tư / Dịch vụ</option>
                    </select>
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-amber-900 text-xs truncate">Tên Viết Tắt <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-sc-short-name" value="${escapeHtml(d.short_name || d.code || '')}" placeholder="VD: 3S, HOANGNAM..." class="form-input h-8.5 px-2.5 py-1 text-xs uppercase font-mono font-bold text-amber-950 border-amber-300 w-full" required>
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Mã Đối Tác / Nhà Xe</label>
                    </div>
                    <input type="text" id="mdf-sc-code" value="${escapeHtml(d.code || '')}" placeholder="Tự sinh nếu để trống (NX_...)" class="form-input h-8.5 px-2.5 py-1 text-xs uppercase font-mono font-bold w-full" ${d.code ? 'readonly' : ''}>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-8">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tên Doanh Nghiệp / Đơn Vị <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-sc-name" value="${escapeHtml(d.name || '')}" placeholder="VD: CÔNG TY TNHH 3S LOGISTICS..." class="form-input h-8.5 px-2.5 py-1 text-xs font-semibold text-slate-800 w-full" required>
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Mã Số Thuế (MST)</label>
                    </div>
                    <input type="text" id="mdf-sc-tax" value="${escapeHtml(d.tax_code || '')}" placeholder="MST doanh nghiệp..." class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-semibold text-slate-800 w-full">
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Người Điều Hành Xe</label>
                    </div>
                    <input type="text" id="mdf-sc-person" value="${d.contact_person || ''}" placeholder="Tên điều độ / chủ xe..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Số Điện Thoại Điều Xe <span class="text-rose-500">*</span></label>
                    </div>
                    <input type="text" id="mdf-sc-phone" value="${d.phone || ''}" placeholder="SĐT liên hệ gấp..." class="form-input h-8.5 px-2.5 py-1 text-xs font-mono font-bold text-teal-800 w-full" required>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Địa Chỉ Công Ty</label>
                    </div>
                    <input type="text" id="mdf-sc-address" value="${d.address || ''}" placeholder="Trụ sở, số nhà, đường, quận/huyện..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
                <div class="md:col-span-6">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Địa Chỉ Kho / Bãi Xe</label>
                    </div>
                    <input type="text" id="mdf-sc-yard-address" value="${d.yard_address || ''}" placeholder="Vị trí bãi xe, kho tập kết hàng..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Số Tài Khoản</label>
                    </div>
                    <input type="text" id="mdf-sc-acc" value="${d.bank_account_number || ''}" placeholder="Số TK..." class="form-input h-8.5 px-2.5 py-1 text-xs font-mono text-slate-800 w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Tên Ngân Hàng</label>
                    </div>
                    <input type="text" id="mdf-sc-bank" value="${d.bank_name || ''}" placeholder="VD: VCB, MB..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-center justify-between h-5 mb-1">
                        <label class="block font-bold text-slate-700 text-xs truncate">Chủ Tài Khoản</label>
                    </div>
                    <input type="text" id="mdf-sc-holder" value="${d.bank_account_holder || ''}" placeholder="Tên in hoa..." class="form-input h-8.5 px-2.5 py-1 text-xs uppercase text-slate-800 w-full">
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between h-5 mb-1">
                    <label class="block font-bold text-slate-700 text-xs truncate">Ghi chú</label>
                </div>
                <input type="text" id="mdf-sc-notes" value="${d.notes || ''}" placeholder="Ghi chú thêm..." class="form-input h-8.5 px-2.5 py-1 text-xs text-slate-800 w-full">
            </div>
            <div class="flex items-center space-x-2 pt-1">
                <input type="checkbox" id="mdf-is-active" ${d.is_active !== false ? 'checked' : ''} class="w-4 h-4 text-teal-600 rounded cursor-pointer">
                <label for="mdf-is-active" class="text-xs font-bold text-slate-700 cursor-pointer">Đang hợp tác</label>
            </div>
        `;
    }

    // Tự động khởi tạo format hàng ngàn cho tất cả input tiền tệ / số trong modal
    if (typeof initAllNumberInputs === 'function') {
        initAllNumberInputs();
    }
}

// Submit Create or Edit Form
async function submitMasterDataForm(e) {
    e.preventDefault();
    const editId = document.getElementById('md-edit-id').value;
    const tabKey = document.getElementById('md-catalog-key').value;
    const isEdit = tabKey === 'company' ? true : !!editId;

    const endpoints = {
        'company': '/api/master-data/company/',
        'driver_tariffs': isEdit ? `/api/master-data/driver-tariffs/${editId}/` : '/api/master-data/driver-tariffs/',
        'allowances': isEdit ? `/api/master-data/allowances/${editId}/` : '/api/master-data/allowances/',
        'locations': isEdit ? `/api/master-data/locations/${editId}/` : '/api/master-data/locations/',
        'tariffs': isEdit ? `/api/master-data/tariffs/${editId}/` : '/api/master-data/tariffs/',
        'customers': isEdit ? `/api/master-data/customers/${editId}/` : '/api/master-data/customers/',
        'expenses': isEdit ? `/api/master-data/expense-items/${editId}/` : '/api/master-data/expense-items/',
        'containers': isEdit ? `/api/master-data/container-types/${editId}/` : '/api/master-data/container-types/',
        'vehicles': isEdit ? `/api/master-data/vehicles/${editId}/` : '/api/master-data/vehicles/',
        'trailers': isEdit ? `/api/master-data/trailers/${editId}/` : '/api/master-data/trailers/',
        'shipping_lines': isEdit ? `/api/master-data/shipping-lines/${editId}/` : '/api/master-data/shipping-lines/',
        'subcontractors': isEdit ? `/api/master-data/subcontractors/${editId}/` : '/api/master-data/subcontractors/'
    };

    let payload = {};
    if (tabKey === 'company') {
        payload = {
            company_name: document.getElementById('mdf-cp-name')?.value || '',
            short_name: document.getElementById('mdf-cp-short-name')?.value || '',
            tax_code: document.getElementById('mdf-cp-tax-code')?.value || '',
            operating_license: document.getElementById('mdf-cp-license')?.value || '',
            representative_name: document.getElementById('mdf-cp-rep-name')?.value || '',
            representative_role: document.getElementById('mdf-cp-rep-role')?.value || '',
            address: document.getElementById('mdf-cp-address')?.value || '',
            phone: document.getElementById('mdf-cp-phone')?.value || '',
            email: document.getElementById('mdf-cp-email')?.value || '',
            website: document.getElementById('mdf-cp-website')?.value || '',
            branch_name: document.getElementById('mdf-cp-branch-name')?.value || '',
            branch_address: document.getElementById('mdf-cp-branch-address')?.value || '',
            branch_phone: document.getElementById('mdf-cp-branch-phone')?.value || '',
            fleet_yard_name: document.getElementById('mdf-cp-yard-name')?.value || '',
            fleet_yard_address: document.getElementById('mdf-cp-yard-address')?.value || '',
            fleet_yard_hotline: document.getElementById('mdf-cp-yard-hotline')?.value || '',
            bank_account_number: document.getElementById('mdf-cp-bank-acc')?.value || '',
            bank_name: document.getElementById('mdf-cp-bank-name')?.value || '',
            bank_branch: document.getElementById('mdf-cp-bank-branch')?.value || '',
            default_vat_rate: parseFloat(document.getElementById('mdf-cp-vat')?.value) || 8.0,
            fuel_reference_price: parseNumberVN(document.getElementById('mdf-cp-fuel-price')?.value) || 21000,
            cbm_formula_divisor: parseInt(document.getElementById('mdf-cp-cbm-divisor')?.value) || 5000,
            notes: document.getElementById('mdf-cp-notes')?.value || '',
        };
    } else if (tabKey === 'driver_tariffs') {
        payload = {
            area_group: document.getElementById('mdf-area-group').value,
            route_name: document.getElementById('mdf-route-name').value,
            pickup_drop_area: document.getElementById('mdf-pickup-drop')?.value || '',
            estimated_km: parseNumberVN(document.getElementById('mdf-estimated-km')?.value) || 0,
            salary_rate: parseNumberVN(document.getElementById('mdf-salary-rate').value) || 0,
            notes: document.getElementById('mdf-notes').value,
            is_active: document.getElementById('mdf-is-active')?.checked ?? true
        };
    } else if (tabKey === 'allowances') {
        payload = {
            code: document.getElementById('mdf-code').value,
            category: document.getElementById('mdf-category').value,
            name: document.getElementById('mdf-name').value,
            amount: parseNumberVN(document.getElementById('mdf-amount').value) || 0,
            notes: document.getElementById('mdf-notes').value,
            is_active: document.getElementById('mdf-is-active')?.checked ?? true
        };
    } else if (tabKey === 'locations') {
        payload = {
            code: document.getElementById('mdf-code').value,
            location_type: document.getElementById('mdf-location-type').value,
            name: document.getElementById('mdf-name').value,
            province: document.getElementById('mdf-province').value,
            address: document.getElementById('mdf-address').value,
            contact_person: document.getElementById('mdf-contact-person')?.value || '',
            contact_phone: document.getElementById('mdf-contact-phone').value,
            notes: document.getElementById('mdf-notes')?.value || '',
            is_active: document.getElementById('mdf-is-active')?.checked ?? true
        };
    } else if (tabKey === 'customers') {
        payload = {
            code: document.getElementById('mdf-code').value,
            tax_code: document.getElementById('mdf-tax-code').value,
            customer_group: document.getElementById('mdf-customer-group')?.value || 'COMMERCIAL_TRADING',
            name: document.getElementById('mdf-name').value,
            short_name: document.getElementById('mdf-short-name')?.value?.trim() || '',
            address: document.getElementById('mdf-address').value,
            company_email: document.getElementById('mdf-company-email')?.value?.trim() || '',
            contact_person: document.getElementById('mdf-contact-person')?.value?.trim() || '',
            contact_title: document.getElementById('mdf-contact-title')?.value?.trim() || '',
            contact_email: document.getElementById('mdf-contact-email')?.value?.trim() || '',
            phone: document.getElementById('mdf-phone').value,
            bank_account_number: document.getElementById('mdf-bank-acc')?.value?.trim() || '',
            bank_name: document.getElementById('mdf-bank-name')?.value?.trim() || '',
            bank_branch: document.getElementById('mdf-bank-branch')?.value?.trim() || '',
            bank_account_holder: document.getElementById('mdf-bank-holder')?.value?.trim() || '',
            payment_term_days: parseInt(document.getElementById('mdf-payment-term')?.value) || 30,
            credit_limit: (typeof parseNumberVN === 'function') ? (parseNumberVN(document.getElementById('mdf-credit-limit')?.value) || 0) : 0,
            notes: document.getElementById('mdf-notes')?.value || ''
        };
    } else if (tabKey === 'tariffs') {
        payload = {
            customer_id: document.getElementById('mdf-customer-id').value,
            origin_zone: document.getElementById('mdf-origin-zone')?.value || '',
            destination_zone: document.getElementById('mdf-dest-zone')?.value || '',
            estimated_km: parseNumberVN(document.getElementById('mdf-estimated-km')?.value) || 0,
            pickup_location: document.getElementById('mdf-pickup').value,
            delivery_location: document.getElementById('mdf-delivery').value,
            dropoff_location: document.getElementById('mdf-dropoff').value,
            container_size: document.getElementById('mdf-container-size')?.value || '40HC',
            freight_price: parseNumberVN(document.getElementById('mdf-price').value) || 0,
            driver_trip_pay: parseNumberVN(document.getElementById('mdf-pay').value) || 0,
            toll_standard_fee: parseNumberVN(document.getElementById('mdf-toll')?.value || 0) || 0
        };
    } else if (tabKey === 'expenses') {
        payload = {
            code: document.getElementById('mdf-code').value,
            group_type: document.getElementById('mdf-group-type').value,
            name: document.getElementById('mdf-name').value,
            default_amount: parseNumberVN(document.getElementById('mdf-default-amount').value) || 0,
            requires_invoice: document.getElementById('mdf-requires-invoice').checked,
            notes: document.getElementById('mdf-notes')?.value || '',
            is_active: document.getElementById('mdf-is-active')?.checked ?? true
        };
    } else if (tabKey === 'containers') {
        payload = {
            code: document.getElementById('mdf-code').value,
            category: document.getElementById('mdf-category').value,
            name: document.getElementById('mdf-name').value,
            teu_factor: parseFloat(document.getElementById('mdf-teu').value) || 2.0,
            max_payload_kg: parseNumberVN(document.getElementById('mdf-payload').value) || 0,
            cbm_capacity: parseFloat(document.getElementById('mdf-cbm').value) || 0,
            is_active: document.getElementById('mdf-is-active')?.checked ?? true
        };
    } else if (tabKey === 'vehicles') {
        payload = {
            license_plate: document.getElementById('mdf-license-plate').value,
            ownership_type: document.getElementById('mdf-ownership').value,
            vehicle_type: document.getElementById('mdf-vehicle-type').value,
            brand: document.getElementById('mdf-brand').value,
            payload_capacity_kg: parseNumberVN(document.getElementById('mdf-payload').value) || 0,
            current_driver_id: document.getElementById('mdf-driver-id')?.value ? parseInt(document.getElementById('mdf-driver-id').value) : null,
            registration_expiry: document.getElementById('mdf-reg-expiry')?.value || null,
            insurance_expiry: document.getElementById('mdf-ins-expiry')?.value || null,
            next_maintenance_date: document.getElementById('mdf-maint-date')?.value || null,
            status: document.getElementById('mdf-vehicle-status')?.value || 'IDLE'
        };
    } else if (tabKey === 'trailers') {
        payload = {
            license_plate: document.getElementById('mdf-trailer-plate').value,
            trailer_type: document.getElementById('mdf-trailer-type').value,
            brand: document.getElementById('mdf-trailer-brand').value,
            payload_capacity_kg: parseNumberVN(document.getElementById('mdf-trailer-payload').value) || 0,
            registration_expiry: document.getElementById('mdf-trailer-expiry').value || null,
            status: document.getElementById('mdf-trailer-status').value
        };
    } else if (tabKey === 'shipping_lines') {
        payload = {
            code: document.getElementById('mdf-sl-code').value,
            name: document.getElementById('mdf-sl-name').value,
            contact_phone: document.getElementById('mdf-sl-phone').value,
            contact_email: document.getElementById('mdf-sl-email').value,
            website: document.getElementById('mdf-sl-web').value,
            free_dem_days: parseInt(document.getElementById('mdf-sl-dem').value || 7),
            free_det_days: parseInt(document.getElementById('mdf-sl-det').value || 5),
            notes: document.getElementById('mdf-sl-notes').value,
            is_active: document.getElementById('mdf-is-active')?.checked ?? true
        };
    } else if (tabKey === 'subcontractors') {
        payload = {
            partner_type: document.getElementById('mdf-sc-partner-type')?.value || 'CARRIER',
            code: document.getElementById('mdf-sc-code').value,
            short_name: document.getElementById('mdf-sc-short-name')?.value || '', 
            tax_code: document.getElementById('mdf-sc-tax').value,
            name: document.getElementById('mdf-sc-name').value,
            contact_person: document.getElementById('mdf-sc-person').value,
            phone: document.getElementById('mdf-sc-phone').value,
            address: document.getElementById('mdf-sc-address').value,
            yard_address: document.getElementById('mdf-sc-yard-address')?.value || '',
            bank_account_number: document.getElementById('mdf-sc-acc').value,
            bank_name: document.getElementById('mdf-sc-bank').value,
            bank_account_holder: document.getElementById('mdf-sc-holder').value,
            notes: document.getElementById('mdf-sc-notes').value,
            is_active: document.getElementById('mdf-is-active')?.checked ?? true
        };
    }

    try {
        const res = await fetchWithAuth(endpoints[tabKey], {
            method: isEdit ? 'PUT' : 'POST',
            body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && (data.success || data.id)) {
            showToast('success', data.message || 'Lưu bản ghi thành công!');
            closeMasterDataModal();
            loadMasterData();

            // Tự động tải lại danh mục cho các Modal đang mở và chọn ngay bản ghi vừa tạo
            await loadMasterDataFormOptions(true);
            populateMasterDataDropdowns();

            if (quickMasterDataTargetSelectId) {
                const targetEl = document.getElementById(quickMasterDataTargetSelectId);
                const createdName = payload.name || payload.code || payload.license_plate || payload.route_name || '';
                if (targetEl && createdName) {
                    if (targetEl.tagName === 'SELECT') {
                        setSelectValueCaseInsensitive(targetEl, createdName);
                    } else {
                        targetEl.value = createdName;
                    }
                    if (typeof targetEl.onchange === 'function') {
                        targetEl.onchange();
                    }
                }
                quickMasterDataTargetSelectId = null;
            }
        } else {
            showToast('danger', data.message || data.error || data.detail || 'Có lỗi xảy ra khi lưu dữ liệu!');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ!');
    }
}

// Delete Item (Soft-delete)
async function deleteMasterDataItem(id) {
    const confirmed = await showConfirmModal({
        title: 'Xóa Danh Mục',
        message: 'Bạn có chắc chắn muốn xóa bản ghi này khỏi danh mục không?\n\nDữ liệu lịch sử sẽ được bảo lưu an toàn (Soft-Delete).',
        confirmText: 'Xóa Bản Ghi',
        cancelText: 'Huỷ bỏ',
        type: 'danger',
        icon: 'ph-bold ph-trash text-2xl'
    });
    if (!confirmed) return;

    const endpoints = {
        'driver_tariffs': `/api/master-data/driver-tariffs/${id}/`,
        'allowances': `/api/master-data/allowances/${id}/`,
        'locations': `/api/master-data/locations/${id}/`,
        'tariffs': `/api/master-data/tariffs/${id}/`,
        'customers': `/api/master-data/customers/${id}/`,
        'expenses': `/api/master-data/expense-items/${id}/`,
        'containers': `/api/master-data/container-types/${id}/`,
        'vehicles': `/api/master-data/vehicles/${id}/`,
        'trailers': `/api/master-data/trailers/${id}/`,
        'shipping_lines': `/api/master-data/shipping-lines/${id}/`,
        'subcontractors': `/api/master-data/subcontractors/${id}/`
    };

    try {
        const res = await fetchWithAuth(endpoints[currentMasterDataTab], {
            method: 'DELETE'
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
            showToast('success', data.message || 'Đã xóa bản ghi thành công!');
            loadMasterData();
        } else {
            showToast('danger', data.message || data.error || data.detail || 'Không thể xóa bản ghi!');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ!');
    }
}

