// ==============================================================================
// KHAI BÁO & QUẢN LÝ SỐ DƯ ĐẦU KỲ KẾ TOÁN (OPENING BALANCES) - CHUẨN VAS & THÔNG TƯ
// ==============================================================================
let openingBalanceState = {
    data: null,
    activeAccountCode: 'ALL',
    searchKeyword: '',
    editingId: null,
};

async function loadOpeningBalanceData() {
    const container = document.getElementById('md-opening-balance-view');
    if (!container) return;

    if (!openingBalanceState.data) {
        container.innerHTML = `
            <div class="p-16 text-center text-slate-400">
                <i class="ph ph-spinner animate-spin text-3xl mb-3 text-teal-600 block"></i>
                <p class="text-sm font-semibold text-slate-600">Đang tải số dư đầu kỳ kế toán...</p>
            </div>
        `;
    }

    try {
        const res = await fetchWithAuth('/api/master-data/opening-balances/');
        if (!res.ok) throw new Error('Không thể tải dữ liệu số dư đầu kỳ');
        const data = await res.json();
        openingBalanceState.data = data;
        renderOpeningBalanceView();
    } catch (err) {
        console.error('Lỗi khi tải số dư đầu kỳ:', err);
        container.innerHTML = `
            <div class="p-12 text-center">
                <i class="ph-bold ph-warning-circle text-4xl text-rose-500 mb-2 block"></i>
                <p class="text-sm font-bold text-rose-600 mb-4">${err.message || 'Lỗi kết nối máy chủ'}</p>
                <button onclick="loadOpeningBalanceData()" class="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer">
                    Thử lại
                </button>
            </div>
        `;
    }
}
window.loadOpeningBalanceData = loadOpeningBalanceData;

function formatCurrencyOB(val) {
    if (val === undefined || val === null || isNaN(val)) return '0 đ';
    return Number(val).toLocaleString('vi-VN') + ' đ';
}

function renderOpeningBalanceView() {
    const container = document.getElementById('md-opening-balance-view');
    if (!container || !openingBalanceState.data) return;

    const data = openingBalanceState.data;
    const kpis = data.kpis || {};
    const accountCharts = data.account_charts || [];
    const suggestions = data.suggestions || {};
    let items = data.items || [];

    // Filter items
    if (openingBalanceState.activeAccountCode !== 'ALL') {
        items = items.filter(i => (i.account_code || '').startsWith(openingBalanceState.activeAccountCode));
    }
    if (openingBalanceState.searchKeyword) {
        const kw = openingBalanceState.searchKeyword.toLowerCase().trim();
        items = items.filter(i => 
            (i.entity_name && i.entity_name.toLowerCase().includes(kw)) ||
            (i.entity_code && i.entity_code.toLowerCase().includes(kw)) ||
            (i.account_code && i.account_code.toLowerCase().includes(kw)) ||
            (i.account_name && i.account_name.toLowerCase().includes(kw)) ||
            (i.bank_account_number && i.bank_account_number.toLowerCase().includes(kw)) ||
            (i.notes && i.notes.toLowerCase().includes(kw))
        );
    }

    container.innerHTML = `
        <!-- 1. Header Banner -->
        <div class="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 rounded-2xl p-5 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <div class="flex items-center space-x-2.5 mb-1.5">
                    <div class="p-2 bg-teal-700/60 rounded-xl border border-teal-500/40">
                        <i class="ph-bold ph-book-open-text text-2xl text-teal-200"></i>
                    </div>
                    <div>
                        <h2 class="text-lg md:text-xl font-black font-heading tracking-tight">Khai Báo Số Dư Đầu Kỳ Kế Toán</h2>
                        <p class="text-xs text-teal-200/90 font-medium">Chuẩn hóa theo Hệ thống Tài khoản Kế toán Doanh nghiệp (TT 200/2014 & TT 133/2016) — Tiền mặt (111), Ngân hàng (112), Phải thu KH (131), Tạm ứng (141), Phải trả Thầu phụ (331), Lương (334).</p>
                    </div>
                </div>
            </div>
            <div class="flex items-center space-x-2">
                <button onclick="loadOpeningBalanceData()" title="Tải lại số dư" class="px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold text-white transition-all flex items-center space-x-1.5 cursor-pointer">
                    <i class="ph-bold ph-arrows-clockwise text-base"></i>
                    <span>Làm Mới</span>
                </button>
            </div>
        </div>

        <!-- 2. KPI Summary Cards Chuẩn Kế Toán (4 Thẻ Cân Đối) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <!-- Card 1: Tổng Dư Nợ Đầu Kỳ -->
            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-3.5">
                <div class="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                    <i class="ph-bold ph-arrow-circle-down-right text-2xl"></i>
                </div>
                <div class="min-w-0">
                    <p class="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">Tổng Dư Nợ Đầu Kỳ</p>
                    <p class="text-base font-black text-emerald-800 truncate">${formatCurrencyOB(kpis.total_debit)}</p>
                    <p class="text-[10px] text-emerald-600 font-semibold">Tài sản, Tồn quỹ & Phải thu</p>
                </div>
            </div>

            <!-- Card 2: Tổng Dư Có Đầu Kỳ -->
            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-3.5">
                <div class="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 shrink-0">
                    <i class="ph-bold ph-arrow-circle-up-right text-2xl"></i>
                </div>
                <div class="min-w-0">
                    <p class="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">Tổng Dư Có Đầu Kỳ</p>
                    <p class="text-base font-black text-rose-800 truncate">${formatCurrencyOB(kpis.total_credit)}</p>
                    <p class="text-[10px] text-rose-600 font-semibold">Nợ phải trả & Nguồn vốn</p>
                </div>
            </div>

            <!-- Card 3: Tiền Mặt & Ngân Hàng (TK 111 & 112) -->
            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-3.5">
                <div class="w-11 h-11 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0">
                    <i class="ph-bold ph-bank text-2xl"></i>
                </div>
                <div class="min-w-0">
                    <p class="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">Tiền Mặt & Ngân Hàng (111/112)</p>
                    <p class="text-base font-black text-teal-900 truncate">${formatCurrencyOB(kpis.total_cash_bank)}</p>
                    <p class="text-[10px] text-teal-600 font-semibold">Tồn quỹ khả dụng ban đầu</p>
                </div>
            </div>

            <!-- Card 4: Công nợ Vận tải (131 vs 331) -->
            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-3.5">
                <div class="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
                    <i class="ph-bold ph-scales text-2xl"></i>
                </div>
                <div class="min-w-0">
                    <p class="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">Thu KH (131) / Trả Thầu (331)</p>
                    <p class="text-xs font-black text-blue-900 truncate">Thu KH: ${formatCurrencyOB(kpis.total_customer_ar)}</p>
                    <p class="text-xs font-black text-orange-900 truncate">Trả Thầu: ${formatCurrencyOB(kpis.total_subcontractor_ap)}</p>
                </div>
            </div>
        </div>

        <!-- 3. Form Card: Khai Báo Số Dư Đầu Kỳ Trực Tiếp Trên Trang (Flat Page Form - No Popup) -->
        <div id="ob-form-card" class="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden transition-all">
            <div class="bg-slate-50/80 px-4 py-3 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                <div class="flex items-center space-x-2">
                    <i class="ph-bold ph-pencil-simple-line text-teal-700 text-lg"></i>
                    <h3 id="ob-form-title" class="text-sm font-black text-slate-800 uppercase tracking-wide">
                        ${openingBalanceState.editingId ? 'Chỉnh Sửa Bản Ghi Số Dư Đầu Kỳ Kế Toán' : 'Khai Báo Số Dư Đầu Kỳ Kế Toán Mới'}
                    </h3>
                </div>
                <span class="text-[11px] font-semibold text-slate-500 italic">Nhập trực tiếp tại form bên dưới và bấm Lưu để ghi sổ</span>
            </div>

            <form id="ob-entry-form" onsubmit="event.preventDefault(); saveOpeningBalanceItem();" class="p-4 md:p-6 space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <!-- 1. Tài khoản Kế toán (COA) -->
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1.5">
                            Tài Khoản Kế Toán <span class="text-rose-500">*</span>
                        </label>
                        <select id="ob-input-account" onchange="onOpeningBalanceAccountChange()" required class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-black text-teal-900 focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-hidden transition-all">
                            ${accountCharts.map(a => `<option value="${a.code}">${a.label}</option>`).join('')}
                        </select>
                    </div>

                    <!-- 2. Chọn nhanh Đối tượng gợi ý (Quick selector) -->
                    <div id="ob-suggestion-wrapper">
                        <label class="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                            <span>Chọn Nhanh Đối Tượng</span>
                            <span class="text-[10px] text-teal-700 font-semibold cursor-pointer" onclick="clearObEntityInput()">Tự nhập</span>
                        </label>
                        <select id="ob-quick-select" onchange="onQuickSelectObEntity(this.value)" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-medium text-slate-700 focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-hidden transition-all">
                            <option value="">-- Chọn từ danh mục đối tượng --</option>
                        </select>
                    </div>

                    <!-- 3. Mã đối tượng -->
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1.5">
                            Mã Đối Tượng
                        </label>
                        <input type="text" id="ob-input-code" placeholder="VD: TVL, KH_SAMSUNG, TX001..." class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-mono font-bold focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-hidden transition-all">
                    </div>

                    <!-- 4. Tên đối tượng / Tên khoản mục -->
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1.5">
                            Tên Đối Tượng / Quỹ <span class="text-rose-500">*</span>
                        </label>
                        <input type="text" id="ob-input-name" required placeholder="VD: Quỹ tiền mặt VP, Cty Samsung..." class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-hidden transition-all">
                    </div>
                </div>

                <!-- Dòng 2: Ngân hàng (nếu là TK 112) + Ngày chốt + Số tiền + Tính chất Nợ/Có -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                    <!-- 5. Số tài khoản ngân hàng (hiện nổi bật nếu là TK 112) -->
                    <div id="ob-bank-account-box">
                        <label class="block text-xs font-bold text-slate-700 mb-1.5">
                            Số Tài Khoản Ngân Hàng <span id="ob-bank-required" class="text-rose-500 hidden">*</span>
                        </label>
                        <input type="text" id="ob-input-bank-acc" placeholder="VD: 19030000000001 (Techcombank)" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-mono font-bold text-blue-900 focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-hidden transition-all">
                    </div>

                    <!-- 6. Ngày chốt số dư -->
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1.5">
                            Ngày Chốt Số Dư <span class="text-rose-500">*</span>
                        </label>
                        <input type="date" id="ob-input-date" required class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-hidden transition-all">
                    </div>

                    <!-- 7. Số tiền & Tính chất Dư Nợ / Dư Có -->
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1.5">
                            Số Dư Đầu Kỳ (VNĐ) <span class="text-rose-500">*</span>
                        </label>
                        <div class="flex items-center space-x-1.5">
                            <input type="number" id="ob-input-amount" min="0" step="1000" required placeholder="0" oninput="updateObAmountPreview(this.value)" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-black text-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-hidden transition-all">
                            <select id="ob-input-type" class="w-32 px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-hidden transition-all shrink-0">
                                <option value="debit" class="text-emerald-700 font-bold">Dư Nợ (+)</option>
                                <option value="credit" class="text-rose-700 font-bold">Dư Có (-)</option>
                            </select>
                        </div>
                        <p id="ob-amount-preview" class="text-[11px] font-bold text-teal-700 mt-1">0 đ</p>
                    </div>

                    <!-- 8. Ghi chú / Căn cứ chứng từ -->
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1.5">
                            Ghi Chú / Căn Cứ Chứng Từ
                        </label>
                        <input type="text" id="ob-input-notes" placeholder="VD: Biên bản đối soát, sao kê NH..." class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-medium focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-hidden transition-all">
                    </div>
                </div>

                <!-- Form Action Buttons -->
                <div class="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                    <button type="button" onclick="resetObForm()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer">
                        <i class="ph-bold ph-arrows-counter-clockwise mr-1"></i> Làm Lại
                    </button>
                    <button type="submit" id="ob-save-btn" class="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs md:text-sm font-bold shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer">
                        <i class="ph-bold ph-floppy-disk text-base"></i>
                        <span id="ob-save-btn-text">Lưu Số Dư Đầu Kỳ Kế Toán</span>
                    </button>
                </div>
            </form>
        </div>

        <!-- 4. Data Table Card: Bảng Số Dư Đầu Kỳ Chuẩn 8 Cột Kế Toán -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
            <!-- Table Toolbar: Lọc Tài Khoản & Tìm Kiếm -->
            <div class="p-3 md:p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col lg:flex-row items-center justify-between gap-3">
                <!-- Account Code Filter Pills -->
                <div class="flex items-center space-x-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0">
                    <button onclick="filterObAccount('ALL')" class="ob-filter-pill px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${openingBalanceState.activeAccountCode === 'ALL' ? 'bg-teal-700 text-white shadow-2xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}">
                        Tất Cả (${data.items ? data.items.length : 0})
                    </button>
                    <button onclick="filterObAccount('111')" class="ob-filter-pill px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${openingBalanceState.activeAccountCode === '111' ? 'bg-teal-700 text-white shadow-2xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}">
                        111 - Tiền Mặt
                    </button>
                    <button onclick="filterObAccount('112')" class="ob-filter-pill px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${openingBalanceState.activeAccountCode === '112' ? 'bg-teal-700 text-white shadow-2xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}">
                        112 - Ngân Hàng
                    </button>
                    <button onclick="filterObAccount('131')" class="ob-filter-pill px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${openingBalanceState.activeAccountCode === '131' ? 'bg-teal-700 text-white shadow-2xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}">
                        131 - Phải Thu KH
                    </button>
                    <button onclick="filterObAccount('141')" class="ob-filter-pill px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${openingBalanceState.activeAccountCode === '141' ? 'bg-teal-700 text-white shadow-2xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}">
                        141 - Tạm Ứng
                    </button>
                    <button onclick="filterObAccount('331')" class="ob-filter-pill px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${openingBalanceState.activeAccountCode === '331' ? 'bg-teal-700 text-white shadow-2xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}">
                        331 - Phải Trả Thầu Phụ
                    </button>
                    <button onclick="filterObAccount('334')" class="ob-filter-pill px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${openingBalanceState.activeAccountCode === '334' ? 'bg-teal-700 text-white shadow-2xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}">
                        334 - Lương Tài Xế
                    </button>
                </div>

                <!-- Search Input -->
                <div class="relative w-full lg:w-72 shrink-0">
                    <i class="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base"></i>
                    <input type="text" id="ob-table-search" onkeyup="searchObTable(this.value)" value="${openingBalanceState.searchKeyword}" placeholder="Tìm theo tên, mã, số TK, ghi chú..." class="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs md:text-sm font-medium focus:ring-2 focus:ring-teal-500 focus:outline-hidden transition-all">
                </div>
            </div>

            <!-- Table Container: Chuẩn 8 Cột Kế Toán -->
            <div class="overflow-x-auto min-h-[300px]">
                <table class="w-full text-left border-collapse whitespace-nowrap text-xs md:text-sm">
                    <thead>
                        <tr class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                            <th class="p-3 pl-4 text-center w-12">STT</th>
                            <th class="p-3">Khoản Mục / Diễn Giải</th>
                            <th class="p-3 text-center">TK Kế Toán</th>
                            <th class="p-3">Số Tài Khoản NH</th>
                            <th class="p-3 text-right text-emerald-800">Dư Nợ (+)</th>
                            <th class="p-3 text-right text-rose-800">Dư Có (-)</th>
                            <th class="p-3">Mã Đối Tượng</th>
                            <th class="p-3">Tên Đối Tượng / Quỹ</th>
                            <th class="p-3">Ghi Chú / Chứng Từ</th>
                            <th class="p-3 pr-4 text-center w-24">Thao Tác</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 font-medium text-slate-700">
                        ${items.length === 0 ? `
                            <tr>
                                <td colspan="10" class="p-12 text-center text-slate-400">
                                    <i class="ph-bold ph-tray text-3xl mb-2 text-slate-300 block"></i>
                                    Chưa có bản ghi số dư đầu kỳ nào phù hợp với bộ lọc.
                                </td>
                            </tr>
                        ` : items.map((item, idx) => `
                            <tr class="hover:bg-slate-50/80 transition-colors ${openingBalanceState.editingId === item.id ? 'bg-amber-50/70 ring-1 ring-amber-300' : ''}">
                                <td class="p-3 pl-4 text-center font-bold text-slate-400">${idx + 1}</td>
                                <td class="p-3 font-semibold text-slate-800">
                                    ${item.account_name || item.category_display || '-'}
                                </td>
                                <td class="p-3 text-center">
                                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-black border bg-slate-100 text-slate-800 border-slate-300">
                                        ${item.account_code || '1111'}
                                    </span>
                                </td>
                                <td class="p-3 font-mono font-bold text-blue-900">
                                    ${item.bank_account_number ? (item.bank_account_number + (item.bank_name ? ' (' + item.bank_name + ')' : '')) : '<span class="text-slate-300">—</span>'}
                                </td>
                                <td class="p-3 text-right font-black ${item.debit_amount > 0 ? 'text-emerald-700' : 'text-slate-300'}">
                                    ${item.debit_amount > 0 ? formatCurrencyOB(item.debit_amount) : '—'}
                                </td>
                                <td class="p-3 text-right font-black ${item.credit_amount > 0 ? 'text-rose-700' : 'text-slate-300'}">
                                    ${item.credit_amount > 0 ? formatCurrencyOB(item.credit_amount) : '—'}
                                </td>
                                <td class="p-3 font-mono font-bold text-slate-900">${item.entity_code || '<span class="text-slate-300">—</span>'}</td>
                                <td class="p-3 font-bold text-slate-900">${item.entity_name}</td>
                                <td class="p-3 text-slate-500 max-w-xs truncate" title="${item.notes || ''}">${item.notes || '—'}</td>
                                <td class="p-3 pr-4 text-center">
                                    <div class="flex items-center justify-center space-x-1.5">
                                        <button onclick="editOpeningBalanceItem(${item.id})" title="Chỉnh sửa bản ghi" class="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer">
                                            <i class="ph-bold ph-pencil-simple text-base"></i>
                                        </button>
                                        <button onclick="deleteOpeningBalanceItem(${item.id}, '${item.entity_name.replace(/'/g, "\\'")}')" title="Xóa bản ghi" class="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer">
                                            <i class="ph-bold ph-trash text-base"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Table Footer: Thống Kê Tổng Phát Sinh & Bảng Cân Đối -->
            <div class="p-3 px-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-semibold text-slate-600">
                <div class="flex items-center space-x-4">
                    <span>Tổng số bản ghi: <b class="text-slate-900">${items.length}</b></span>
                    <span>Tổng Nợ: <b class="text-emerald-700">${formatCurrencyOB(items.reduce((acc, i) => acc + (i.debit_amount || 0), 0))}</b></span>
                    <span>Tổng Có: <b class="text-rose-700">${formatCurrencyOB(items.reduce((acc, i) => acc + (i.credit_amount || 0), 0))}</b></span>
                </div>
                <span class="text-slate-400">Niên độ kế toán: Năm 2026</span>
            </div>
        </div>
    `;

    // Thiết lập ngày mặc định nếu thêm mới
    if (!openingBalanceState.editingId) {
        const dateInput = document.getElementById('ob-input-date');
        if (dateInput && !dateInput.value) {
            dateInput.value = '2026-01-01';
        }
        onOpeningBalanceAccountChange();
    }
}
window.renderOpeningBalanceView = renderOpeningBalanceView;

function updateObAmountPreview(val) {
    const preview = document.getElementById('ob-amount-preview');
    if (preview) {
        preview.innerText = formatCurrencyOB(val);
    }
}
window.updateObAmountPreview = updateObAmountPreview;

function onOpeningBalanceAccountChange() {
    const accSelect = document.getElementById('ob-input-account');
    const quickSelect = document.getElementById('ob-quick-select');
    const typeSelect = document.getElementById('ob-input-type');
    const bankBox = document.getElementById('ob-bank-account-box');
    const bankReq = document.getElementById('ob-bank-required');
    const codeInput = document.getElementById('ob-input-code');
    const nameInput = document.getElementById('ob-input-name');
    const bankAccInput = document.getElementById('ob-input-bank-acc');
    if (!accSelect || !quickSelect || !openingBalanceState.data) return;

    const acc = accSelect.value;
    const suggestions = openingBalanceState.data.suggestions || {};
    const company = suggestions.company || { code: 'GSS', name: 'Green Solutions Supply Co., Ltd.', full_name: 'CÔNG TY TNHH CUNG ỨNG GIẢI PHÁP XANH' };

    // Hiển thị/ẩn ô số tài khoản ngân hàng nếu chọn TK 112
    if (acc.startsWith('112')) {
        if (bankReq) bankReq.classList.remove('hidden');
        if (typeSelect && !openingBalanceState.editingId) typeSelect.value = 'debit';
    } else {
        if (bankReq) bankReq.classList.add('hidden');
    }

    let list = [];
    let groupTitle = 'đối tượng';

    if (acc.startsWith('111')) {
        // Tiền mặt tại quỹ: chọn công ty mình
        groupTitle = 'Đơn vị / Công ty';
        list = [
            { code: company.code || 'GSS', name: company.name || 'Green Solutions Supply Co., Ltd.', bank: '' },
            { code: 'QTM_VP', name: 'Quỹ Tiền Mặt Văn Phòng (Cát Lái)', bank: '' },
            { code: 'QTM_TN', name: 'Quỹ Tiền Mặt Chi Nhánh Tây Ninh', bank: '' }
        ];
        if (typeSelect && !openingBalanceState.editingId) typeSelect.value = 'debit';

        // Tự động gán sẵn nếu form đang trống và không ở chế độ sửa
        if (!openingBalanceState.editingId && codeInput && (!codeInput.value || codeInput.value === 'GSS')) {
            codeInput.value = company.code || 'GSS';
            if (nameInput) nameInput.value = company.name || 'Green Solutions Supply Co., Ltd.';
        }
    } else if (acc.startsWith('112')) {
        // Tiền gửi Ngân hàng: tài khoản ngân hàng công ty mình
        groupTitle = 'Ngân hàng Công ty';
        list = [
            { 
                code: company.code || 'GSS', 
                name: (company.name || 'Green Solutions Supply Co., Ltd.') + (company.bank_name ? ` - ${company.bank_name}` : ''), 
                bank: company.bank_account_number || '' 
            }
        ];
        if (typeSelect && !openingBalanceState.editingId) typeSelect.value = 'debit';

        if (!openingBalanceState.editingId && bankAccInput && !bankAccInput.value && company.bank_account_number) {
            bankAccInput.value = company.bank_account_number;
            if (codeInput) codeInput.value = company.code || 'GSS';
            if (nameInput) nameInput.value = company.name || 'Green Solutions Supply Co., Ltd.';
        }
    } else if (acc === '131' || acc === '1388') {
        // 131 - Phải thu Khách hàng
        groupTitle = 'Khách hàng';
        list = (suggestions.customers || []).map(c => ({ code: c.code, name: c.name, bank: '' }));
        if (typeSelect && !openingBalanceState.editingId) typeSelect.value = 'debit';
    } else if (acc === '141') {
        // 141 - Tạm ứng nội bộ: Nhân viên nội bộ (Điều phối, Ban Giám đốc, Kế toán, Tài xế)
        groupTitle = 'Nhân sự nội bộ';
        const roleLabels = {
            'DRIVER': 'Tài xế',
            'DISPATCHER': 'Điều phối',
            'DIRECTOR': 'Ban Giám Đốc',
            'ACCOUNTANT': 'Kế toán',
            'SALESMAN': 'Kinh doanh',
            'HR': 'Nhân sự'
        };
        const allEmps = suggestions.employees && suggestions.employees.length > 0 ? suggestions.employees : (suggestions.drivers || []);
        list = allEmps.map(e => ({
            code: e.code,
            name: `${e.full_name}${e.nickname ? ' (' + e.nickname + ')' : ''} [${roleLabels[e.role] || e.role || 'Nội bộ'}]`,
            bank: ''
        }));
        if (typeSelect && !openingBalanceState.editingId) typeSelect.value = 'debit';
    } else if (acc === '331') {
        // 331 - Phải trả Nhà cung cấp / Nhà xe Thầu phụ 3PL (Mua dịch vụ)
        groupTitle = 'Nhà xe Thầu phụ / Nhà cung cấp';
        list = (suggestions.subcontractors || []).map(s => ({
            code: s.code,
            name: s.name,
            bank: s.bank_account_number ? `${s.bank_account_number} (${s.bank_name || ''})` : ''
        }));
        if (typeSelect && !openingBalanceState.editingId) typeSelect.value = 'credit';
    } else if (acc === '334') {
        // 334 - Phải trả người lao động (Lương tài xế / nhân viên)
        groupTitle = 'Người lao động / Lương';
        const allStaff = suggestions.employees || suggestions.drivers || [];
        list = allStaff.map(d => ({
            code: d.code,
            name: `${d.full_name}${d.nickname ? ' (' + d.nickname + ')' : ''}`,
            bank: ''
        }));
        if (typeSelect && !openingBalanceState.editingId) typeSelect.value = 'credit';
    } else {
        // Tài khoản khác
        groupTitle = 'Đối tượng liên quan';
        const combined = [
            ...(suggestions.customers || []).map(c => ({ code: c.code, name: `[KH] ${c.name}`, bank: '' })),
            ...(suggestions.subcontractors || []).map(s => ({ code: s.code, name: `[Thầu phụ] ${s.name}`, bank: '' }))
        ];
        list = combined;
    }

    quickSelect.innerHTML = `<option value="">-- Chọn ${groupTitle} (${list.length}) --</option>` +
        list.map(item => {
            const val = `${item.code}|${item.name.replace(/\|/g, '-')}|${item.bank || ''}`;
            return `<option value="${val}">[${item.code}] ${item.name}</option>`;
        }).join('');
}
window.onOpeningBalanceAccountChange = onOpeningBalanceAccountChange;

function onQuickSelectObEntity(val) {
    if (!val) return;
    const parts = val.split('|');
    const code = parts[0] || '';
    const name = parts[1] || '';
    const bank = parts[2] || '';
    const codeInput = document.getElementById('ob-input-code');
    const nameInput = document.getElementById('ob-input-name');
    const bankAccInput = document.getElementById('ob-input-bank-acc');
    if (codeInput) codeInput.value = code;
    if (nameInput) nameInput.value = name;
    if (bank && bankAccInput && !bankAccInput.value) {
        bankAccInput.value = bank;
    }
}
window.onQuickSelectObEntity = onQuickSelectObEntity;

function clearObEntityInput() {
    const codeInput = document.getElementById('ob-input-code');
    const nameInput = document.getElementById('ob-input-name');
    const quickSelect = document.getElementById('ob-quick-select');
    if (codeInput) codeInput.value = '';
    if (nameInput) nameInput.value = '';
    if (quickSelect) quickSelect.value = '';
}
window.clearObEntityInput = clearObEntityInput;

function filterObAccount(accPrefix) {
    openingBalanceState.activeAccountCode = accPrefix;
    renderOpeningBalanceView();
}
window.filterObAccount = filterObAccount;

function searchObTable(kw) {
    openingBalanceState.searchKeyword = kw;
    renderOpeningBalanceView();
}
window.searchObTable = searchObTable;

function resetObForm() {
    openingBalanceState.editingId = null;
    const formTitle = document.getElementById('ob-form-title');
    const saveBtnText = document.getElementById('ob-save-btn-text');
    if (formTitle) formTitle.innerText = 'Khai Báo Số Dư Đầu Kỳ Kế Toán Mới';
    if (saveBtnText) saveBtnText.innerText = 'Lưu Số Dư Đầu Kỳ Kế Toán';

    const form = document.getElementById('ob-entry-form');
    if (form) form.reset();

    const dateInput = document.getElementById('ob-input-date');
    if (dateInput) dateInput.value = '2026-01-01';
    updateObAmountPreview(0);
    onOpeningBalanceAccountChange();
    renderOpeningBalanceView();
}
window.resetObForm = resetObForm;

function editOpeningBalanceItem(id) {
    if (!openingBalanceState.data || !openingBalanceState.data.items) return;
    const item = openingBalanceState.data.items.find(i => i.id === id);
    if (!item) return;

    openingBalanceState.editingId = id;

    // Cuộn mượt về form nhập
    const formCard = document.getElementById('ob-form-card');
    if (formCard) {
        formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        formCard.classList.add('ring-2', 'ring-teal-500');
        setTimeout(() => formCard.classList.remove('ring-2', 'ring-teal-500'), 1500);
    }

    const formTitle = document.getElementById('ob-form-title');
    const saveBtnText = document.getElementById('ob-save-btn-text');
    if (formTitle) formTitle.innerText = `Chỉnh Sửa Số Dư: ${item.entity_name} (${item.account_code})`;
    if (saveBtnText) saveBtnText.innerText = 'Cập Nhật Số Dư';

    const accSelect = document.getElementById('ob-input-account');
    const bankAccInput = document.getElementById('ob-input-bank-acc');
    const codeInput = document.getElementById('ob-input-code');
    const nameInput = document.getElementById('ob-input-name');
    const dateInput = document.getElementById('ob-input-date');
    const amountInput = document.getElementById('ob-input-amount');
    const typeSelect = document.getElementById('ob-input-type');
    const notesInput = document.getElementById('ob-input-notes');

    if (accSelect) accSelect.value = item.account_code || '1111';
    if (bankAccInput) bankAccInput.value = item.bank_account_number || '';
    if (codeInput) codeInput.value = item.entity_code || '';
    if (nameInput) nameInput.value = item.entity_name || '';
    if (dateInput) dateInput.value = item.opening_date || '2026-01-01';
    
    const amt = item.debit_amount > 0 ? item.debit_amount : (item.credit_amount > 0 ? item.credit_amount : item.amount);
    if (amountInput) amountInput.value = amt || 0;
    if (typeSelect) typeSelect.value = (item.debit_amount > 0 || item.is_debit) ? 'debit' : 'credit';
    if (notesInput) notesInput.value = item.notes || '';

    updateObAmountPreview(amt || 0);
    onOpeningBalanceAccountChange();
    renderOpeningBalanceView();
}
window.editOpeningBalanceItem = editOpeningBalanceItem;

async function saveOpeningBalanceItem() {
    const accSelect = document.getElementById('ob-input-account');
    const bankAccInput = document.getElementById('ob-input-bank-acc');
    const codeInput = document.getElementById('ob-input-code');
    const nameInput = document.getElementById('ob-input-name');
    const dateInput = document.getElementById('ob-input-date');
    const amountInput = document.getElementById('ob-input-amount');
    const typeSelect = document.getElementById('ob-input-type');
    const notesInput = document.getElementById('ob-input-notes');
    const saveBtn = document.getElementById('ob-save-btn');

    if (!nameInput || !nameInput.value.trim()) {
        showToast('error', 'Vui lòng nhập tên đối tượng hoặc tên quỹ.', 'Thiếu thông tin');
        return;
    }
    if (!dateInput || !dateInput.value.trim()) {
        showToast('error', 'Vui lòng chọn ngày chốt số dư đầu kỳ.', 'Thiếu thông tin');
        return;
    }

    const accCode = accSelect ? accSelect.value : '1111';
    const isDebit = typeSelect ? typeSelect.value === 'debit' : true;
    const amount = amountInput ? Number(amountInput.value) || 0 : 0;

    const payload = {
        account_code: accCode,
        bank_account_number: bankAccInput ? bankAccInput.value.trim() : '',
        entity_code: codeInput ? codeInput.value.trim() : '',
        entity_name: nameInput.value.trim(),
        opening_date: dateInput.value.trim(),
        debit_amount: isDebit ? amount : 0,
        credit_amount: !isDebit ? amount : 0,
        amount: amount,
        is_debit: isDebit,
        notes: notesInput ? notesInput.value.trim() : ''
    };

    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<i class="ph ph-spinner animate-spin mr-1"></i> Đang lưu...`;
    }

    try {
        const isEditing = Boolean(openingBalanceState.editingId);
        const url = isEditing 
            ? `/api/master-data/opening-balances/${openingBalanceState.editingId}/` 
            : '/api/master-data/opening-balances/';
        const method = isEditing ? 'PUT' : 'POST';

        const res = await fetchWithAuth(url, {
            method: method,
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lưu số dư đầu kỳ thất bại');

        showToast('success', data.message || 'Đã ghi nhận số dư đầu kỳ thành công!');
        resetObForm();
        await loadOpeningBalanceData();
    } catch (err) {
        console.error('Lỗi khi lưu số dư đầu kỳ:', err);
        showToast('error', err.message || 'Không thể lưu số dư đầu kỳ', 'Lỗi');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `<i class="ph-bold ph-floppy-disk text-base"></i> <span id="ob-save-btn-text">${openingBalanceState.editingId ? 'Cập Nhật Số Dư' : 'Lưu Số Dư Đầu Kỳ Kế Toán'}</span>`;
        }
    }
}
window.saveOpeningBalanceItem = saveOpeningBalanceItem;

async function deleteOpeningBalanceItem(id, name) {
    if (!confirm(`Bạn có chắc chắn muốn xóa số dư đầu kỳ kế toán của "${name}"?\nHành động này không thể hoàn tác.`)) {
        return;
    }

    try {
        const res = await fetchWithAuth(`/api/master-data/opening-balances/${id}/`, {
            method: 'DELETE'
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Xóa số dư đầu kỳ thất bại');

        showToast('success', data.message || 'Đã xóa bản ghi số dư thành công!');
        if (openingBalanceState.editingId === id) {
            resetObForm();
        }
        await loadOpeningBalanceData();
    } catch (err) {
        console.error('Lỗi khi xóa số dư:', err);
        showToast('error', err.message || 'Không thể xóa số dư đầu kỳ', 'Lỗi');
    }
}
window.deleteOpeningBalanceItem = deleteOpeningBalanceItem;
