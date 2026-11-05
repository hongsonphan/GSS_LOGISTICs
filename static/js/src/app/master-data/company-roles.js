function getSystemCompanyProfile() {
    const comp = (typeof masterDataCache !== 'undefined' && masterDataCache['company']) || window.SYSTEM_COMPANY || {};
    return {
        id: comp.id || 1,
        company_name: comp.company_name || 'CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ VẬN TẢI TRIỀN VÕ',
        short_name: comp.short_name || 'TRIỀN VÕ LOGISTICS',
        address: comp.headquarters_address || comp.address || '153/1 Quốc Lộ 1A, P. An Phú Đông, Quận 12, TP. Hồ Chí Minh',
        tax_code: comp.tax_code || '0314567890',
        phone: comp.hotline || comp.phone || '0965 559 561',
        email: comp.email || 'phongkinhdoanh.tvl@trienvo.com',
        representative_name: comp.representative_name || 'Võ Văn Triền',
        representative_role: comp.representative_role || 'Giám Đốc',
        bank_account_number: comp.bank_account_number || '',
        bank_name: comp.bank_name || '',
        bank_branch: comp.bank_branch || '',
        operating_license: comp.operating_license || '',
        branch_name: comp.branch_name || '',
        branch_address: comp.branch_address || '',
        branch_phone: comp.branch_phone || '',
        fleet_yard_name: comp.fleet_yard_name || '',
        fleet_yard_address: comp.fleet_yard_address || '',
        fleet_yard_hotline: comp.fleet_yard_hotline || '',
        logo_url: comp.logo_url || '/static/images/trienvo_logo.png'
    };
}
window.getSystemCompanyProfile = getSystemCompanyProfile;

function syncCompanyProfileToPrintForms() {
    const co = getSystemCompanyProfile();

    // 1. Đồng bộ Tên công ty đầy đủ
    document.querySelectorAll('.print-comp-name').forEach(el => {
        el.innerText = co.company_name.toUpperCase();
    });

    // 2. Đồng bộ Tên viết tắt / Thương hiệu
    document.querySelectorAll('.print-comp-short-name').forEach(el => {
        el.innerText = (co.short_name || co.company_name).toUpperCase();
    });

    // 3. Đồng bộ Địa chỉ
    document.querySelectorAll('.print-comp-address').forEach(el => {
        const prefix = el.getAttribute('data-prefix') || 'Đ/c:';
        el.innerText = `${prefix} ${co.address}`;
    });

    // 4. Đồng bộ Khối liên hệ tổng hợp (MST, Hotline, Email)
    document.querySelectorAll('.print-comp-contact').forEach(el => {
        el.innerText = `MST: ${co.tax_code} • Hotline: ${co.phone} • Email: ${co.email}`;
    });

    // 5. Đồng bộ Số điện thoại / Hotline
    document.querySelectorAll('.print-comp-phone').forEach(el => {
        el.innerText = co.phone;
    });

    // 6. Đồng bộ Email
    document.querySelectorAll('.print-comp-email').forEach(el => {
        el.innerText = co.email;
    });

    // 7. Đồng bộ Mã số thuế
    document.querySelectorAll('.print-comp-tax').forEach(el => {
        el.innerText = co.tax_code;
    });

    // 8. Đồng bộ Logo Công ty Triền Võ (không lấy nhầm logo chung BIM)
    let compLogo = co.logo_url || '/static/images/trienvo_logo.png';
    if (!compLogo || compLogo.endsWith('/logo.png') || compLogo.includes('static/images/logo.png')) {
        compLogo = '/static/images/trienvo_logo.png';
    }
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
    renderBusinessProfileCard(company, container);
}

// Loại hình doanh nghiệp + bật/tắt từng tính năng (core/features.py)
function renderBusinessProfileCard(company, container) {
    if (!company.business_model) return;
    const wrap = container.firstElementChild;
    if (!wrap) return;
    const labels = company.feature_labels || {};
    const effective = company.effective_features || {};
    const overrides = company.enabled_features || {};
    const options = (company.business_model_choices || []).map(c =>
        `<option value="${escapeHtml(c.value)}" ${c.value === company.business_model ? 'selected' : ''}>${escapeHtml(c.label)}</option>`).join('');
    const rows = Object.keys(labels).map(k => `
        <label class="flex items-center gap-3 min-h-[44px] px-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
            <input type="checkbox" data-feature="${escapeHtml(k)}" class="w-5 h-5 accent-teal-600" ${effective[k] ? 'checked' : ''}>
            <span class="text-xs font-semibold text-slate-700">${escapeHtml(labels[k])}</span>
            ${k in overrides ? '<span class="ml-auto text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">Tùy chỉnh</span>' : ''}
        </label>`).join('');
    const card = document.createElement('div');
    card.id = 'md-business-profile';
    card.className = 'bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4';
    card.innerHTML = `
        <div class="flex items-center space-x-2 text-teal-800 font-bold text-sm border-b border-slate-100 pb-2.5">
            <i class="ph-bold ph-sliders-horizontal text-lg text-teal-600"></i>
            <span>7. Loại Hình Doanh Nghiệp & Phân Hệ Sử Dụng</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <label class="md:col-span-2">
                <span class="block text-slate-500 font-medium text-[11px] mb-1">Loại hình (chọn xong bấm Lưu để áp dụng gói mặc định)</span>
                <select id="bp-model" class="w-full min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm bg-white">${options}</select>
            </label>
            <label>
                <span class="block text-slate-500 font-medium text-[11px] mb-1">Cảnh báo DEM/DET khi còn ≤ (ngày)</span>
                <input id="bp-warn" type="number" min="0" max="30" value="${Number(company.warn_days ?? 2)}" class="w-full min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm">
            </label>
        </div>
        <div id="bp-features" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">${rows}</div>
        <div class="flex justify-end">
            <button id="bp-save" class="min-h-[44px] px-5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-black cursor-pointer">Lưu loại hình</button>
        </div>`;
    wrap.appendChild(card);

    // Đổi loại hình -> làm mới các ô tích theo gói (chỉ xem trước, chưa lưu)
    const presets = company.model_presets || {};
    card.querySelector('#bp-model').addEventListener('change', (e) => {
        const preset = presets[e.target.value];
        if (preset) card.querySelectorAll('[data-feature]').forEach(cb => { cb.checked = preset.includes(cb.dataset.feature); });
    });
    card.querySelector('#bp-save').addEventListener('click', async () => {
        const model = card.querySelector('#bp-model').value;
        const checked = {};
        card.querySelectorAll('[data-feature]').forEach(cb => { checked[cb.dataset.feature] = cb.checked; });
        // Chỉ lưu phần khác gói mặc định làm ghi đè, để đổi loại hình sau này vẫn áp đúng gói
        const preset = presets[model] || [];
        Object.keys(checked).forEach(k => { if (checked[k] === preset.includes(k)) delete checked[k]; });
        try {
            const res = await fetchWithAuth('/api/master-data/company/', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ business_model: model, enabled_features: checked, warn_days: card.querySelector('#bp-warn').value }),
            });
            const out = await res.json();
            if (!res.ok || !out.success) { showToast('danger', out.message || 'Không lưu được loại hình.'); return; }
            showToast('success', 'Đã lưu. Đang tải lại để áp dụng menu mới...');
            setTimeout(() => window.location.reload(), 800);
        } catch (err) {
            showToast('danger', 'Lỗi kết nối, vui lòng thử lại.');
        }
    });
}

let rolesPermissionsDataCache = null;

async function loadRolesPermissionsData() {
    const container = document.getElementById('md-roles-permissions-view');
    if (container) {
        container.innerHTML = `
            <div class="p-12 text-center text-slate-400">
                <i class="ph ph-spinner animate-spin text-3xl mb-2 text-teal-600 block"></i>
                Đang tải hệ thống phân quyền & vai trò người dùng...
            </div>
        `;
    }

    try {
        const res = await fetchWithAuth('/api/master-data/roles-permissions/');
        if (!res.ok) throw new Error(`Máy chủ phản hồi lỗi ${res.status}`);
        const data = await res.json();
        rolesPermissionsDataCache = data;
        renderRolesPermissionsView(data);
    } catch (err) {
        console.error('Lỗi tải dữ liệu phân quyền:', err);
        if (container) {
            container.innerHTML = `
                <div class="p-12 text-center text-rose-500 font-bold">
                    <i class="ph-bold ph-warning-circle text-3xl mb-2 block"></i>
                    Lỗi tải thông tin phân quyền: ${err.message || 'Không thể kết nối máy chủ.'}
                </div>
            `;
        }
    }
}
window.loadRolesPermissionsData = loadRolesPermissionsData;

function renderRolesPermissionsView(data) {
    const container = document.getElementById('md-roles-permissions-view');
    if (!container) return;
    // Trang phân quyền mới: ma trận Chức danh × Phân hệ × Thao tác (master-data/access-matrix.js)
    if (typeof renderAccessMatrixPage === 'function') return;
    if (!data) return;

    const summary = data.summary || {};
    const roles = data.roles || [];
    const users = data.users || [];

    const groupOptionsHtml = roles.map(r => `<option value="${r.id}">${escapeHtml(r.name)}</option>`).join('');

    const isCurrentAdmin = Boolean(data.is_current_admin);

    container.innerHTML = `
        <div class="max-w-7xl mx-auto space-y-6">
            <!-- Header Banner -->
            <div class="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 rounded-2xl p-5 md:p-6 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 border border-teal-700/40">
                <div class="flex items-start md:items-center space-x-4">
                    <div class="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-teal-500/20 backdrop-blur-md border border-teal-400/30 flex items-center justify-center text-3xl font-black text-teal-300 shadow-inner shrink-0">
                        <i class="ph-bold ph-shield-check"></i>
                    </div>
                    <div>
                        <div class="flex items-center gap-2 flex-wrap mb-1">
                            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-teal-500/30 text-teal-200 border border-teal-400/30">
                                Chuẩn Phân Quyền Vai Trò
                            </span>
                            <span class="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                                Phân Quyền Theo Nhóm
                            </span>
                        </div>
                        <h2 class="text-lg md:text-xl font-black font-heading tracking-tight text-white">
                            Quản Trị Vai Trò & Phân Quyền Hệ Thống
                        </h2>
                        <p class="text-xs text-slate-300 mt-0.5 leading-relaxed">
                            Quản lý nhóm vai trò nghiệp vụ (Ban Giám Đốc, Điều Phối Viên, Kế Toán Cước, Kinh Doanh, Nhân Sự) và kiểm soát quyền truy cập của người dùng nội bộ (Tài xế thực hiện nhận lệnh qua link xác nhận chuyến độc lập, không cấp tài khoản hệ thống).
                        </p>
                    </div>
                </div>

                ${isCurrentAdmin ? `
                <!-- Action Button: Open Django Admin (Chỉ hiển thị cho Quản trị viên tối cao) -->
                <div class="flex items-center gap-2 shrink-0">
                    <a href="/admin/auth/group/" target="_blank" class="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 text-teal-300 hover:text-white rounded-xl text-xs font-bold border border-teal-500/40 shadow-xs flex items-center space-x-1.5 transition-all">
                        <i class="ph-bold ph-gear text-sm"></i>
                        <span>Cấu Hình Nhóm (Admin)</span>
                        <i class="ph ph-arrow-square-out text-xs"></i>
                    </a>
                    <a href="/admin/auth/user/" target="_blank" class="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center space-x-1.5 transition-all">
                        <i class="ph-bold ph-user-gear text-sm"></i>
                        <span>Quản Lý User (Admin)</span>
                        <i class="ph ph-arrow-square-out text-xs"></i>
                    </a>
                </div>
                ` : `
                <div class="px-3 py-1.5 bg-slate-800/60 rounded-xl border border-slate-700/60 text-xs text-slate-300 flex items-center gap-2 shrink-0">
                    <i class="ph-fill ph-lock-key text-teal-400 text-base"></i>
                    <span>Chế độ: <strong>Xem ma trận quyền</strong></span>
                </div>
                `}
            </div>

            <!-- KPI Summary Cards -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
                <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center space-x-3.5">
                    <div class="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center text-xl shrink-0">
                        <i class="ph-bold ph-users-three"></i>
                    </div>
                    <div>
                        <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng Tài Khoản</div>
                        <div class="text-xl font-black text-slate-800">${summary.total_users || 0}</div>
                    </div>
                </div>
                <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center space-x-3.5">
                    <div class="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-xl shrink-0">
                        <i class="ph-bold ph-user-check"></i>
                    </div>
                    <div>
                        <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Đang Hoạt Động</div>
                        <div class="text-xl font-black text-emerald-700">${summary.active_users || 0}</div>
                    </div>
                </div>
                <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center space-x-3.5">
                    <div class="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center text-xl shrink-0">
                        <i class="ph-bold ph-shield-check"></i>
                    </div>
                    <div>
                        <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nhóm Vai Trò</div>
                        <div class="text-xl font-black text-blue-800">${summary.total_groups || 0}</div>
                    </div>
                </div>
                <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center space-x-3.5">
                    <div class="w-11 h-11 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center text-xl shrink-0">
                        <i class="ph-bold ph-identification-card"></i>
                    </div>
                    <div>
                        <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Quản Trị Viên (Admin)</div>
                        <div class="text-xl font-black text-purple-800">${summary.staff_count || 0}</div>
                    </div>
                </div>
            </div>

            <!-- Roles Matrix Cards -->
            <div class="space-y-3">
                <div class="flex items-center justify-between">
                    <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <i class="ph-bold ph-shield-check text-teal-700"></i>
                        <span>1. Danh Sách Nhóm Quyền & Quyền Hạn Nghiệp Vụ (Django Groups)</span>
                    </h3>
                    <span class="text-xs text-slate-500 font-medium">${roles.length} nhóm vai trò</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    ${roles.map(r => {
                        let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
                        let iconName = 'ph-users';
                        if (r.name.includes('Giám Đốc')) {
                            badgeColor = 'bg-rose-50 text-rose-800 border-rose-200';
                            iconName = 'ph-crown';
                        } else if (r.name.includes('Điều Phối')) {
                            badgeColor = 'bg-teal-50 text-teal-800 border-teal-200';
                            iconName = 'ph-git-branch';
                        } else if (r.name.includes('Kế Toán')) {
                            badgeColor = 'bg-blue-50 text-blue-800 border-blue-200';
                            iconName = 'ph-calculator';
                        } else if (r.name.includes('Kinh Doanh')) {
                            badgeColor = 'bg-purple-50 text-purple-800 border-purple-200';
                            iconName = 'ph-chart-line-up';
                        } else if (r.name.includes('Nhân Sự')) {
                            badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                            iconName = 'ph-identification-badge';
                        } else if (r.name.includes('Tài Xế')) {
                            badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
                            iconName = 'ph-steering-wheel';
                        }
                        return `
                            <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow space-y-3 flex flex-col justify-between">
                                <div>
                                    <div class="flex items-center justify-between mb-2">
                                        <div class="flex items-center space-x-2">
                                            <div class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-base ${badgeColor}">
                                                <i class="ph-bold ${iconName}"></i>
                                            </div>
                                            <h4 class="font-bold text-slate-900 text-sm">${escapeHtml(r.name)}</h4>
                                        </div>
                                        <span class="text-[11px] font-bold px-2 py-0.5 rounded-full ${badgeColor}">
                                            ${r.user_count} thành viên
                                        </span>
                                    </div>
                                    <div class="text-xs text-slate-500 mb-2">
                                        Tổng số quyền: <strong class="text-slate-800 font-mono">${r.permission_count}</strong> permissions
                                    </div>
                                    <div class="bg-slate-50 rounded-xl p-2.5 border border-slate-100 space-y-1">
                                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quyền mẫu:</div>
                                        <div class="flex flex-wrap gap-1">
                                            ${(r.permissions || []).slice(0, 6).map(p => `
                                                <span class="inline-block text-[10px] font-medium bg-white text-slate-600 px-1.5 py-0.5 rounded border border-slate-200" title="${escapeHtml(p.name)}">
                                                    ${escapeHtml(p.codename)}
                                                </span>
                                            `).join('') || '<span class="text-[11px] text-slate-400 italic">Chưa cấp quyền cụ thể</span>'}
                                            ${r.permissions && r.permissions.length > 6 ? `<span class="text-[10px] text-slate-400 font-bold self-center">+${r.permission_count - 6} quyền khác</span>` : ''}
                                        </div>
                                    </div>
                                </div>
                                ${isCurrentAdmin ? `
                                <div class="pt-2 border-t border-slate-100 flex items-center justify-between">
                                    <a href="/admin/auth/group/${r.id}/change/" target="_blank" class="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1">
                                        <span>Chỉnh sửa quyền</span>
                                        <i class="ph ph-arrow-square-out text-xs"></i>
                                    </a>
                                </div>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- Users Permissions Assignment Table -->
            <div class="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-3 p-5">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                        <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                            <i class="ph-bold ph-user-list text-teal-700"></i>
                            <span>2. Danh Sách Người Dùng & Phân Bổ Nhóm Vai Trò</span>
                        </h3>
                        <p class="text-xs text-slate-400 mt-0.5">Thay đổi nhóm vai trò của người dùng theo nguyên tắc phân quyền chuẩn của Django.</p>
                    </div>
                    <div class="text-xs font-bold text-slate-500">
                        Hiển thị <span class="text-teal-800 font-black">${users.length}</span> tài khoản
                    </div>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse erp-table text-xs whitespace-nowrap">
                        <thead>
                            <tr class="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                                <th class="p-3">Tài Khoản</th>
                                <th class="p-3">Họ Tên / Nhân Sự</th>
                                <th class="p-3">Số Điện Thoại</th>
                                <th class="p-3">Nhóm Vai Trò (Django Group)</th>
                                <th class="p-3 text-center">Trạng Thái</th>
                                <th class="p-3 text-center">Quyền Admin</th>
                                <th class="p-3">Đăng Nhập Cuối</th>
                                ${isCurrentAdmin ? '<th class="p-3 text-center">Thao Tác</th>' : ''}
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 font-medium">
                            ${users.map(u => {
                                const activeBadge = u.is_active 
                                    ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Hoạt động</span>'
                                    : '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">Đã khóa</span>';
                                
                                const staffBadge = u.is_staff 
                                    ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Admin</span>'
                                    : '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-400">Người dùng</span>';

                                return `
                                    <tr class="hover:bg-slate-50/80 transition-colors">
                                        <td class="p-3 font-mono font-bold text-slate-800">
                                            <div class="flex items-center gap-1.5">
                                                <i class="ph ph-user text-slate-400"></i>
                                                <span>${escapeHtml(u.username)}</span>
                                                ${u.is_superuser ? '<i class="ph-fill ph-crown text-amber-500" title="Superuser (Toàn quyền)"></i>' : ''}
                                            </div>
                                        </td>
                                        <td class="p-3">
                                            <div class="font-bold text-slate-900">${escapeHtml(u.full_name)}</div>
                                            <div class="text-[11px] text-slate-400">${escapeHtml(u.role_in_employee || u.email || '')}</div>
                                        </td>
                                        <td class="p-3 font-mono text-slate-600">${escapeHtml(u.phone || '-')}</td>
                                        <td class="p-3">
                                            ${isCurrentAdmin ? `
                                            <select onchange="updateUserRoleGroup(${u.id}, this.value)" class="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 focus:outline-hidden shadow-2xs">
                                                <option value="0" ${!u.primary_group_id ? 'selected' : ''}>-- Chưa gán nhóm --</option>
                                                ${roles.map(r => `
                                                    <option value="${r.id}" ${u.primary_group_id === r.id ? 'selected' : ''}>${escapeHtml(r.name)}</option>
                                                `).join('')}
                                            </select>
                                            ` : `
                                            <span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                ${escapeHtml(u.primary_group || 'Chưa gán nhóm')}
                                            </span>
                                            `}
                                        </td>
                                        <td class="p-3 text-center">${activeBadge}</td>
                                        <td class="p-3 text-center">${staffBadge}</td>
                                        <td class="p-3 text-slate-500 font-mono text-[11px]">${escapeHtml(u.last_login)}</td>
                                        <td class="p-3 text-center whitespace-nowrap">
                                            <div class="inline-flex items-center gap-1.5">
                                                <button onclick="openUserPermissionsModal(${u.id})" class="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200/80 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs hover:shadow-xs transition-all" title="Xem và tùy biến chi tiết phân quyền hệ thống & 14 báo cáo cho nhân sự này">
                                                    <i class="ph-bold ph-shield-check text-xs text-teal-600"></i>
                                                    <span>Phân Quyền</span>
                                                    ${u.has_custom_permissions ? '<span class="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" title="Đã có cấu hình quyền tùy biến riêng lẻ"></span>' : ''}
                                                </button>
                                                ${isCurrentAdmin ? `
                                                <a href="/admin/auth/user/${u.id}/change/" target="_blank" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 transition-colors" title="Mở trang chỉnh sửa chi tiết Django Admin">
                                                    <i class="ph ph-sliders"></i>
                                                    <span>Admin</span>
                                                    <i class="ph ph-arrow-square-out text-[10px]"></i>
                                                </a>
                                                ` : ''}
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Modal Tùy Biến Phân Quyền Cho Người Dùng -->
        <div id="modal-user-permissions" class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs hidden transition-opacity">
            <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <!-- Modal Header -->
                <div class="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white flex items-center justify-between border-b border-teal-700/40 shrink-0">
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 text-xl font-black">
                            <i class="ph-bold ph-shield-check"></i>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 class="text-base font-black font-heading text-white">Tùy Biến Phân Quyền Cá Nhân</h3>
                                <span id="modal-perm-username-badge" class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-teal-500/30 text-teal-200 border border-teal-400/30">user</span>
                            </div>
                            <p class="text-xs text-slate-300 mt-0.5" id="modal-perm-user-desc">
                                Người dùng kế thừa quyền từ Nhóm Vai Trò và có thể thêm hoặc bớt quyền xem báo cáo / thao tác riêng lẻ.
                            </p>
                        </div>
                    </div>
                    <button type="button" onclick="closeUserPermissionsModal()" class="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors">
                        <i class="ph-bold ph-x text-base"></i>
                    </button>
                </div>

                <!-- Modal Body -->
                <div class="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 divide-y divide-slate-100">
                    <!-- Section 1: Nhóm Vai Trò -->
                    <div class="space-y-2 pb-4">
                        <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                            1. Nhóm Vai Trò Nghiệp Vụ (Django Group)
                        </label>
                        <div class="flex flex-col sm:flex-row sm:items-center gap-3">
                            <select id="modal-perm-group-select" onchange="onModalGroupChanged(this.value)" class="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-hidden shadow-2xs max-w-md w-full">
                                <option value="0">-- Chưa gán nhóm (Không có quyền nhóm) --</option>
                            </select>
                            <span class="text-xs text-slate-400 italic">
                                * Khi đổi nhóm, các quyền mặc định của nhóm sẽ được chọn trước. Bạn có thể tick thêm hoặc bỏ bớt bên dưới.
                            </span>
                        </div>
                    </div>

                    <!-- Section 2: Danh sách quyền phân loại theo Module -->
                    <div class="space-y-4 pt-4">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                    2. Danh Sách Quyền Phân Hệ & Báo Cáo
                                </label>
                                <p class="text-xs text-slate-400 mt-0.5">
                                    Được phân quyền: hiển thị và cho phép truy cập. Không được phân quyền: ẩn hoàn toàn phân hệ/báo cáo.
                                </p>
                            </div>
                            <div class="flex items-center gap-2 text-xs font-medium">
                                <button type="button" onclick="toggleAllModalPermissions(true)" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] transition-colors">
                                    Chọn tất cả
                                </button>
                                <button type="button" onclick="toggleAllModalPermissions(false)" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] transition-colors">
                                    Bỏ chọn tất cả
                                </button>
                            </div>
                        </div>

                        <!-- Accordion Modules Container -->
                        <div id="modal-perm-modules-container" class="space-y-3">
                            <!-- Injected by JavaScript -->
                        </div>
                    </div>
                </div>

                <!-- Modal Footer -->
                <div class="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                    <div class="text-xs text-slate-500" id="modal-perm-stats-text">
                        Đang chọn: <strong class="text-teal-700 font-bold" id="modal-perm-selected-count">0</strong> quyền
                    </div>
                    <div class="flex items-center gap-2">
                        <button type="button" onclick="closeUserPermissionsModal()" class="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition-colors">
                            Hủy Bỏ
                        </button>
                        <button type="button" id="btn-save-user-perms" onclick="saveUserPermissionsModal()" class="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-sm inline-flex items-center gap-1.5 transition-all">
                            <i class="ph-bold ph-floppy-disk text-sm"></i>
                            <span>Lưu Phân Quyền</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

let currentEditingUserId = null;

function openUserPermissionsModal(userId) {
    if (!rolesPermissionsDataCache) return;
    const user = (rolesPermissionsDataCache.users || []).find(u => u.id === Number(userId));
    if (!user) {
        showToast('error', 'Không tìm thấy thông tin tài khoản người dùng!');
        return;
    }

    currentEditingUserId = userId;
    const modal = document.getElementById('modal-user-permissions');
    if (!modal) return;

    // Set User Title & Badge
    const badge = document.getElementById('modal-perm-username-badge');
    if (badge) badge.textContent = `${user.username} (${user.full_name})`;

    const desc = document.getElementById('modal-perm-user-desc');
    if (desc) desc.textContent = `${user.role_in_employee || 'Nhân sự'} | Email: ${user.email || 'Chưa có'} | Đăng nhập cuối: ${user.last_login}`;

    // Fill Group Select
    const groupSelect = document.getElementById('modal-perm-group-select');
    if (groupSelect) {
        const roles = rolesPermissionsDataCache.roles || [];
        groupSelect.innerHTML = `
            <option value="0" ${!user.primary_group_id ? 'selected' : ''}>-- Chưa gán nhóm (Không có quyền nhóm) --</option>
            ${roles.map(r => `
                <option value="${r.id}" ${user.primary_group_id === r.id ? 'selected' : ''}>${escapeHtml(r.name)} (${r.permission_count} quyền)</option>
            `).join('')}
        `;
    }

    // Render Modules & Checkboxes
    const container = document.getElementById('modal-perm-modules-container');
    const modules = rolesPermissionsDataCache.modules || [];
    const effectivePermsSet = new Set(user.effective_permissions || []);

    if (container) {
        container.innerHTML = modules.map(m => {
            return `
                <div class="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <div class="bg-slate-50 px-3.5 py-2.5 flex items-center justify-between border-b border-slate-100 cursor-pointer" onclick="togglePermModuleCollapse('${m.id}')">
                        <div class="flex items-center space-x-2">
                            <i class="ph-bold ${m.icon || 'ph-folder'} text-teal-700 text-sm"></i>
                            <span class="text-xs font-bold text-slate-800">${escapeHtml(m.name)}</span>
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-600">
                                ${(m.permissions || []).length} quyền
                            </span>
                        </div>
                        <div class="flex items-center space-x-2">
                            <button type="button" onclick="event.stopPropagation(); toggleModuleCheckboxes('${m.id}', true)" class="text-[10px] text-teal-700 hover:underline font-bold">Chọn nhóm này</button>
                            <span class="text-slate-300">|</span>
                            <button type="button" onclick="event.stopPropagation(); toggleModuleCheckboxes('${m.id}', false)" class="text-[10px] text-slate-500 hover:underline font-bold">Bỏ nhóm này</button>
                            <i id="icon-chevron-${m.id}" class="ph-bold ph-caret-down text-slate-400 text-xs ml-1 transition-transform"></i>
                        </div>
                    </div>
                    <div id="module-body-${m.id}" class="p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 bg-white">
                        ${(m.permissions || []).map(p => {
                            const isChecked = effectivePermsSet.has(p.full_code);
                            const isReport = p.app_label === 'reports';
                            return `
                                <label class="flex items-start space-x-2 p-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer text-xs select-none ${isReport ? 'bg-teal-50/20' : ''}">
                                    <input type="checkbox" name="user_modal_perm" value="${p.full_code}" data-module="${m.id}" ${isChecked ? 'checked' : ''} onchange="updateModalPermStats()" class="mt-0.5 rounded text-teal-600 focus:ring-teal-500 border-slate-300">
                                    <div class="min-w-0">
                                        <div class="text-[11.5px] font-bold text-slate-800 leading-tight">${escapeHtml(p.name)}</div>
                                        <div class="text-[10px] font-mono text-slate-400 truncate" title="${p.full_code}">${p.codename}</div>
                                    </div>
                                </label>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    updateModalPermStats();
    modal.classList.remove('hidden');
}
window.openUserPermissionsModal = openUserPermissionsModal;

function closeUserPermissionsModal() {
    const modal = document.getElementById('modal-user-permissions');
    if (modal) modal.classList.add('hidden');
    currentEditingUserId = null;
}
window.closeUserPermissionsModal = closeUserPermissionsModal;

function togglePermModuleCollapse(moduleId) {
    const body = document.getElementById(`module-body-${moduleId}`);
    const icon = document.getElementById(`icon-chevron-${moduleId}`);
    if (body) {
        body.classList.toggle('hidden');
        if (icon) {
            icon.classList.toggle('rotate-180');
        }
    }
}
window.togglePermModuleCollapse = togglePermModuleCollapse;

function toggleModuleCheckboxes(moduleId, check) {
    const checkboxes = document.querySelectorAll(`input[name="user_modal_perm"][data-module="${moduleId}"]`);
    checkboxes.forEach(cb => { cb.checked = Boolean(check); });
    updateModalPermStats();
}
window.toggleModuleCheckboxes = toggleModuleCheckboxes;

function toggleAllModalPermissions(check) {
    const checkboxes = document.querySelectorAll('input[name="user_modal_perm"]');
    checkboxes.forEach(cb => { cb.checked = Boolean(check); });
    updateModalPermStats();
}
window.toggleAllModalPermissions = toggleAllModalPermissions;

function onModalGroupChanged(groupId) {
    if (!rolesPermissionsDataCache) return;
    const roles = rolesPermissionsDataCache.roles || [];
    const grp = roles.find(r => r.id === Number(groupId));
    if (!grp) return;

    const grpPermsSet = new Set(grp.permission_codes || []);
    const checkboxes = document.querySelectorAll('input[name="user_modal_perm"]');
    checkboxes.forEach(cb => {
        cb.checked = grpPermsSet.has(cb.value);
    });
    updateModalPermStats();
}
window.onModalGroupChanged = onModalGroupChanged;

function updateModalPermStats() {
    const countEl = document.getElementById('modal-perm-selected-count');
    const checked = document.querySelectorAll('input[name="user_modal_perm"]:checked');
    if (countEl) countEl.textContent = checked.length;
}
window.updateModalPermStats = updateModalPermStats;

async function saveUserPermissionsModal() {
    if (!currentEditingUserId) return;
    const saveBtn = document.getElementById('btn-save-user-perms');
    const groupSelect = document.getElementById('modal-perm-group-select');
    const groupId = groupSelect ? groupSelect.value : null;

    const checkedInputs = document.querySelectorAll('input[name="user_modal_perm"]:checked');
    const selectedPermissions = Array.from(checkedInputs).map(cb => cb.value);

    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="ph ph-spinner animate-spin text-sm"></i> Đang lưu...';
    }

    try {
        const res = await fetchWithAuth('/api/master-data/roles-permissions/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentEditingUserId,
                group_id: groupId,
                permissions: selectedPermissions
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lưu phân quyền thất bại');

        showToast('success', data.message || 'Cập nhật phân quyền người dùng thành công!');
        closeUserPermissionsModal();
        await loadRolesPermissionsData();
    } catch (err) {
        console.error('Lỗi khi lưu phân quyền:', err);
        showToast('error', err.message || 'Không thể lưu phân quyền', 'Lỗi');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="ph-bold ph-floppy-disk text-sm"></i><span>Lưu Phân Quyền</span>';
        }
    }
}
window.saveUserPermissionsModal = saveUserPermissionsModal;

async function updateUserRoleGroup(userId, groupId) {
    try {
        const res = await fetchWithAuth('/api/master-data/roles-permissions/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                group_id: groupId
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Cập nhật phân quyền thất bại');
        showToast('success', data.message || 'Cập nhật phân quyền thành công');
        loadRolesPermissionsData();
    } catch (err) {
        console.error('Lỗi cập nhật nhóm vai trò:', err);
        showToast('error', err.message || 'Không thể cập nhật phân quyền', 'Lỗi');
        loadRolesPermissionsData();
    }
}
window.updateUserRoleGroup = updateUserRoleGroup;
