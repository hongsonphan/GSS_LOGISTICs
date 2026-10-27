// ==============================================================================
// 9.8. SUBTAB 8: TRUNG TÂM BÁO CÁO KẾ TOÁN & ĐỐI SOÁT ĐA CHIỀU
// ==============================================================================
let currentAccountingReportType = 'BY_CUSTOMER';
let currentAccountingReportPeriod = 'this_month';
let cachedAccountingReportData = null;


async function loadAccountingReportData() {
    try {
        const fromDate = document.getElementById('acct-rep-from-date')?.value || '';
        const toDate = document.getElementById('acct-rep-to-date')?.value || '';

        let url = `/api/accounting/reports/?report_type=${currentAccountingReportType}`;
        if (fromDate) url += `&from_date=${fromDate}`;
        if (toDate) url += `&to_date=${toDate}`;

        const res = await fetchWithAuth(url);
        if (!res.ok) throw new Error('Không thể tải dữ liệu báo cáo kế toán');
        const data = await res.json();
        cachedAccountingReportData = data;

        // Render Title
        const titleEl = document.getElementById('acct-rep-title');
        if (titleEl) titleEl.innerText = data.report_title || 'Báo Cáo Kế Toán';
        const tblTitleEl = document.getElementById('acct-rep-table-title');
        if (tblTitleEl) tblTitleEl.innerText = data.report_title || 'Chi Tiết Số Liệu';

        // Render KPIs
        renderAccountingReportKPIs(data);

        // Render Table Headers & Body
        renderAccountingReportTable(data);

        // Update Row Count
        const countEl = document.getElementById('acct-rep-row-count');
        if (countEl) countEl.innerText = `${(data.rows || []).length} đối tượng`;

    } catch (err) {
        console.error('loadAccountingReportData error:', err);
        showToast('warning', 'Lỗi tải báo cáo: ' + err.message);
    }
}

function renderAccountingReportKPIs(data) {
    const container = document.getElementById('acct-rep-kpi-container');
    if (!container) return;
    const kpis = data.kpis || {};
    const fmt = (n) => (n !== undefined && n !== null) ? Number(n).toLocaleString('vi-VN') : '0';

    let cardsHtml = '';

    if (data.report_type === 'BY_CUSTOMER') {
        cardsHtml = `
            <div class="bg-white p-4 rounded-2xl border border-slate-200 border-l-4 border-l-teal-600 shadow-2xs">
                <div class="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                    <span>Tổng Doanh Thu Cước</span>
                    <i class="ph-bold ph-money text-teal-600 text-lg"></i>
                </div>
                <p class="text-2xl font-black text-slate-900 font-heading mt-1">${fmt(kpis.total_revenue)} đ</p>
                <p class="text-[11px] text-slate-500 mt-1">${fmt(kpis.total_trips)} chuyến (${fmt(kpis.total_customers)} khách hàng)</p>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-slate-200 border-l-4 border-l-rose-500 shadow-2xs">
                <div class="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                    <span>Chi Phí Vận Hành</span>
                    <i class="ph-bold ph-receipt text-rose-600 text-lg"></i>
                </div>
                <p class="text-2xl font-black text-rose-600 font-heading mt-1">${fmt(kpis.total_operating_expenses)} đ</p>
                <p class="text-[11px] text-slate-500 mt-1">Nâng hạ, cầu đường & chi phí chuyến</p>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-slate-200 border-l-4 border-l-indigo-600 shadow-2xs">
                <div class="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                    <span>Tiền Chi Hộ (Debit Note)</span>
                    <i class="ph-bold ph-hand-coins text-indigo-600 text-lg"></i>
                </div>
                <p class="text-2xl font-black text-indigo-600 font-heading mt-1">${fmt(kpis.total_reimbursables)} đ</p>
                <p class="text-[11px] text-slate-500 mt-1">Đang theo dõi thu hồi từ khách hàng</p>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-slate-200 border-l-4 border-l-emerald-600 shadow-2xs">
                <div class="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                    <span>Lợi Nhuận Gộp (Margin)</span>
                    <i class="ph-bold ph-trend-up text-emerald-600 text-lg"></i>
                </div>
                <p class="text-2xl font-black text-emerald-600 font-heading mt-1">${fmt(kpis.total_gross_profit)} đ</p>
                <p class="text-[11px] text-emerald-700 font-bold mt-1">Biên lợi nhuận TB: ${kpis.avg_profit_margin_pct}%</p>
            </div>
        `;
    } else if (data.report_type === 'BY_SUBCONTRACTOR') {
        cardsHtml = `
            <div class="bg-white p-4 rounded-2xl border border-slate-200 border-l-4 border-l-blue-600 shadow-2xs">
                <div class="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                    <span>Tổng Chuyến Xe Bạn</span>
                    <i class="ph-bold ph-truck text-blue-600 text-lg"></i>
                </div>
                <p class="text-2xl font-black text-slate-900 font-heading mt-1">${fmt(kpis.total_trips)} chuyến</p>
                <p class="text-[11px] text-slate-500 mt-1">${fmt(kpis.total_vehicles)} đầu xe đối tác</p>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-slate-200 border-l-4 border-l-amber-500 shadow-2xs">
                <div class="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                    <span>Cước Thuê Xe Bạn</span>
                    <i class="ph-bold ph-handshake text-amber-600 text-lg"></i>
                </div>
                <p class="text-2xl font-black text-amber-900 font-heading mt-1">${fmt(kpis.total_subcontractor_cost)} đ</p>
                <p class="text-[11px] text-slate-500 mt-1">Thu từ khách: ${fmt(kpis.total_customer_revenue)} đ</p>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-slate-200 border-l-4 border-l-rose-600 shadow-2xs">
                <div class="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                    <span>Còn Phải Trả Xe Bạn (AP)</span>
                    <i class="ph-bold ph-wallet text-rose-600 text-lg"></i>
                </div>
                <p class="text-2xl font-black text-rose-600 font-heading mt-1">${fmt(kpis.total_remaining_payable)} đ</p>
                <p class="text-[11px] text-slate-500 mt-1">Đã ứng trước: ${fmt(kpis.total_advance_paid)} đ</p>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-slate-200 border-l-4 border-l-emerald-600 shadow-2xs">
                <div class="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                    <span>Lợi Nhuận Giữ Lại Cty</span>
                    <i class="ph-bold ph-coins text-emerald-600 text-lg"></i>
                </div>
                <p class="text-2xl font-black text-emerald-600 font-heading mt-1">${fmt(kpis.total_company_margin)} đ</p>
                <p class="text-[11px] text-emerald-700 font-bold mt-1">Chênh lệch cước dịch vụ 3PL</p>
            </div>
        `;
    } else if (data.report_type === 'BY_DRIVER') {
        cardsHtml = `
            <div class="bg-white p-4 rounded-2xl border border-slate-200 border-l-4 border-l-teal-600 shadow-2xs">
                <div class="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                    <span>Tổng Chuyến Hoàn Thành</span>
                    <i class="ph-bold ph-steering-wheel text-teal-600 text-lg"></i>
                </div>
                <p class="text-2xl font-black text-slate-900 font-heading mt-1">${fmt(kpis.total_trips_completed)} chuyến</p>
                <p class="text-[11px] text-slate-500 mt-1">${fmt(kpis.total_drivers)} bác tài xe nhà</p>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-slate-200 border-l-4 border-l-blue-600 shadow-2xs">
                <div class="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                    <span>Lương Chuyến Định Mức</span>
                    <i class="ph-bold ph-money text-blue-600 text-lg"></i>
                </div>
                <p class="text-2xl font-black text-blue-900 font-heading mt-1">${fmt(kpis.total_trip_salary)} đ</p>
                <p class="text-[11px] text-slate-500 mt-1">Khoán lương theo chuyến chạy</p>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-slate-200 border-l-4 border-l-amber-500 shadow-2xs">
                <div class="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                    <span>Tạm Ứng Đã Nhận</span>
                    <i class="ph-bold ph-hand-coins text-amber-600 text-lg"></i>
                </div>
                <p class="text-2xl font-black text-amber-900 font-heading mt-1">${fmt(kpis.total_advance_given)} đ</p>
                <p class="text-[11px] text-slate-500 mt-1">Thực chi hiện trường: ${fmt(kpis.total_actual_expense)} đ</p>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-slate-200 border-l-4 border-l-emerald-600 shadow-2xs">
                <div class="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                    <span>Chênh Lệch Quyết Toán</span>
                    <i class="ph-bold ph-arrows-left-right text-emerald-600 text-lg"></i>
                </div>
                <p class="text-2xl font-black text-emerald-700 font-heading mt-1">+${fmt(kpis.total_driver_refund)} đ</p>
                <p class="text-[11px] text-slate-500 mt-1">Tài xế hoàn lại cty (Chi bù: ${fmt(kpis.total_company_reimburse)} đ)</p>
            </div>
        `;
    } else if (data.report_type === 'BY_ROUTE') {
        cardsHtml = `
            <div class="bg-white p-4 rounded-2xl border border-slate-200 border-l-4 border-l-indigo-600 shadow-2xs">
                <div class="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                    <span>Tổng Tuyến Vận Chuyển</span>
                    <i class="ph-bold ph-path text-indigo-600 text-lg"></i>
                </div>
                <p class="text-2xl font-black text-slate-900 font-heading mt-1">${fmt(kpis.total_routes)} tuyến</p>
                <p class="text-[11px] text-slate-500 mt-1">${fmt(kpis.total_trips)} chuyến vận hành</p>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-slate-200 border-l-4 border-l-teal-600 shadow-2xs">
                <div class="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                    <span>Doanh Thu Toàn Tuyến</span>
                    <i class="ph-bold ph-money text-teal-600 text-lg"></i>
                </div>
                <p class="text-2xl font-black text-teal-900 font-heading mt-1">${fmt(kpis.total_revenue)} đ</p>
                <p class="text-[11px] text-slate-500 mt-1">Tổng cước thu từ tất cả các tuyến</p>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-slate-200 border-l-4 border-l-orange-500 shadow-2xs">
                <div class="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                    <span>Chi Phí Vé BOT Tuyến</span>
                    <i class="ph-bold ph-barcode text-orange-600 text-lg"></i>
                </div>
                <p class="text-2xl font-black text-orange-700 font-heading mt-1">${fmt(kpis.total_toll_fee)} đ</p>
                <p class="text-[11px] text-slate-500 mt-1">Tổng chi phí: ${fmt(kpis.total_expense)} đ</p>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-slate-200 border-l-4 border-l-emerald-600 shadow-2xs">
                <div class="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                    <span>Lợi Nhuận Gộp Tuyến</span>
                    <i class="ph-bold ph-trend-up text-emerald-600 text-lg"></i>
                </div>
                <p class="text-2xl font-black text-emerald-600 font-heading mt-1">${fmt(kpis.total_gross_profit)} đ</p>
                <p class="text-[11px] text-emerald-700 font-bold mt-1">Lợi nhuận gộp sau trừ BOT & chi phí</p>
            </div>
        `;
    }

    container.innerHTML = cardsHtml;
}

// =========================================================================
// TRUNG TÂM BÁO CÁO KẾ TOÁN: TÌM KIẾM, SẮP XẾP CỘT & DRILL-DOWN CHI TIẾT
// =========================================================================

let accountingReportSearchTerm = '';
let accountingReportSortColumn = null;
let accountingReportSortAsc = false;
let cachedAccountingDrilldownData = null;
let currentDrilldownTab = 'trips';


function sortAccountingReportBy(colKey) {
    if (accountingReportSortColumn === colKey) {
        accountingReportSortAsc = !accountingReportSortAsc;
    } else {
        accountingReportSortColumn = colKey;
        accountingReportSortAsc = false; // Mặc định cột tiền/số lượng ưu tiên giảm dần
    }
    if (cachedAccountingReportData) {
        renderAccountingReportTable(cachedAccountingReportData);
    }
}
window.sortAccountingReportBy = sortAccountingReportBy;

function renderAccountingReportTable(data) {
    const thead = document.getElementById('acct-rep-thead');
    const tbody = document.getElementById('acct-rep-tbody');
    const rowCountEl = document.getElementById('acct-rep-row-count');
    if (!thead || !tbody) return;

    const headers = data.headers || [];
    let rows = (data.rows || []).slice();
    const fmt = (n) => (n !== undefined && n !== null) ? Number(n).toLocaleString('vi-VN') : '0';

    // 1. Lọc theo từ khóa tìm kiếm (Search Filter)
    if (accountingReportSearchTerm) {
        rows = rows.filter(r => {
            const combinedText = Object.values(r).map(v => String(v || '').toLowerCase()).join(' ');
            return combinedText.includes(accountingReportSearchTerm);
        });
    }

    // 2. Sắp xếp theo cột (Column Sorting)
    if (accountingReportSortColumn) {
        rows.sort((a, b) => {
            let va = a[accountingReportSortColumn];
            let vb = b[accountingReportSortColumn];
            if (va === null || va === undefined) va = 0;
            if (vb === null || vb === undefined) vb = 0;

            if (typeof va === 'number' && typeof vb === 'number') {
                return accountingReportSortAsc ? va - vb : vb - va;
            }
            return accountingReportSortAsc 
                ? String(va).localeCompare(String(vb), 'vi') 
                : String(vb).localeCompare(String(va), 'vi');
        });
    }

    if (rowCountEl) {
        rowCountEl.innerText = `${rows.length} đối tượng`;
    }

    // 3. Render THEAD với Sort Icon & Cursor Pointer
    let thHtml = '<tr class="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200 font-heading text-xs">';
    thHtml += '<th class="py-3 px-3.5 w-12 text-center select-none">STT</th>';
    headers.forEach(h => {
        const alignClass = h.align === 'right' ? 'text-right' : (h.align === 'center' ? 'text-center' : 'text-left');
        let sortIcon = '<i class="ph-bold ph-arrows-down-up text-slate-300 ml-1 text-xs opacity-60"></i>';
        if (accountingReportSortColumn === h.key) {
            sortIcon = accountingReportSortAsc 
                ? '<i class="ph-bold ph-arrow-up text-teal-700 ml-1 text-xs"></i>' 
                : '<i class="ph-bold ph-arrow-down text-teal-700 ml-1 text-xs"></i>';
        }
        thHtml += `
            <th onclick="sortAccountingReportBy('${h.key}')" 
                class="py-3 px-3.5 ${alignClass} cursor-pointer hover:bg-teal-50/80 hover:text-teal-900 transition-colors select-none group" 
                title="Bấm để sắp xếp theo ${h.label}">
                <div class="inline-flex items-center gap-1 ${h.align === 'right' ? 'justify-end' : (h.align === 'center' ? 'justify-center' : 'justify-start')}">
                    <span>${h.label}</span>
                    ${sortIcon}
                </div>
            </th>`;
    });
    thHtml += '<th class="py-3 px-3.5 text-center w-24 select-none">Thao Tác</th>';
    thHtml += '</tr>';
    thead.innerHTML = thHtml;

    // 4. Render TBODY
    if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${headers.length + 2}" class="py-10 text-center text-slate-400 italic">Không tìm thấy đối tượng nào phù hợp với bộ lọc</td></tr>`;
        return;
    }

    let trHtml = '';
    rows.forEach((r, idx) => {
        const targetId = r.customer_id || r.driver_id || r.vehicle_id || 0;
        const targetKey = r.customer_name || r.driver_name || r.vehicle_plate || r.route_name || '';
        const safeTargetKey = encodeURIComponent(targetKey);

        trHtml += `
            <tr onclick="openAccountingReportDrilldown('${targetId}', '${safeTargetKey}')" 
                class="hover:bg-teal-50/70 cursor-pointer transition-colors text-xs border-b border-slate-100 group"
                title="💡 Bấm vào dòng để xem báo cáo chi tiết các chuyến xe của ${escapeHtml(targetKey)}">
                <td class="py-3 px-3.5 text-center font-bold text-slate-400 group-hover:text-teal-700">${idx + 1}</td>
        `;

        headers.forEach(h => {
            const val = r[h.key];
            const alignClass = h.align === 'right' ? 'text-right font-mono font-semibold' : (h.align === 'center' ? 'text-center' : 'text-left font-semibold');

            let displayVal = val;
            if (typeof val === 'number') {
                if (h.key.includes('pct') || h.key.includes('percent')) {
                    displayVal = `${val}%`;
                } else if (h.key.includes('revenue') || h.key.includes('cost') || h.key.includes('expense') || h.key.includes('profit') || h.key.includes('salary') || h.key.includes('toll') || h.key.includes('advance') || h.key.includes('payable') || h.key.includes('refund') || h.key.includes('margin') || h.key.includes('reimbursables') || h.key.includes('reimburse') || h.key.includes('balance')) {
                    displayVal = `${fmt(val)} đ`;
                } else {
                    displayVal = fmt(val);
                }
            }

            // Highlighting
            if (h.key === 'customer_name' || h.key === 'vehicle_plate' || h.key === 'driver_name' || h.key === 'route_name') {
                displayVal = `<span class="font-heading font-black text-slate-900 group-hover:text-teal-800 transition-colors flex items-center gap-1.5"><i class="ph-bold ph-arrow-square-out text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity"></i>${displayVal}</span>`;
            } else if (h.key === 'gross_profit' || h.key === 'company_margin') {
                displayVal = `<span class="text-emerald-700 font-bold font-mono">${displayVal}</span>`;
            } else if (h.key === 'remaining_payable' || h.key === 'operating_expenses') {
                displayVal = `<span class="text-rose-600 font-bold font-mono">${displayVal}</span>`;
            } else if (h.key === 'refund_to_company') {
                displayVal = val > 0 ? `<span class="text-emerald-700 font-bold font-mono">+${displayVal}</span>` : '-';
            } else if (h.key === 'company_reimburse') {
                displayVal = val > 0 ? `<span class="text-amber-700 font-bold font-mono">-${displayVal}</span>` : '-';
            } else if (h.key === 'settlement_balance') {
                if (val > 0) {
                    displayVal = `<span class="font-bold text-xs text-emerald-700 font-mono">+${fmt(val)} đ <span class="text-[11px] font-normal text-slate-500">(Nộp cty)</span></span>`;
                } else if (val < 0) {
                    displayVal = `<span class="font-bold text-xs text-rose-700 font-mono">${fmt(val)} đ <span class="text-[11px] font-normal text-slate-500">(Cty bù)</span></span>`;
                } else {
                    displayVal = `<span class="text-slate-400 font-mono text-xs">0 đ (Khớp)</span>`;
                }
            }

            trHtml += `<td class="py-3 px-3.5 ${alignClass}">${displayVal}</td>`;
        });

        trHtml += `
            <td class="py-3 px-3.5 text-center" onclick="event.stopPropagation(); openAccountingReportDrilldown('${targetId}', '${safeTargetKey}')">
                <button type="button" class="px-2.5 py-1 bg-white hover:bg-teal-700 hover:text-white text-teal-800 border border-teal-200 rounded-lg text-xs font-bold font-heading shadow-2xs flex items-center gap-1 mx-auto transition-all cursor-pointer">
                    <i class="ph-bold ph-list-magnifying-glass"></i>
                    <span>Chi Tiết</span>
                </button>
            </td>
        `;

        trHtml += '</tr>';
    });

    tbody.innerHTML = trHtml;
}

// =========================================================================
// BÁO CÁO CHI TIẾT TOÀN TRANG (FULL-PAGE DRILL-DOWN)
// =========================================================================

let currentDrilldownTarget = null;

async function openAccountingReportDrilldown(targetId, encodedTargetKey) {
    const targetKey = decodeURIComponent(encodedTargetKey || '');
    currentDrilldownTarget = { targetId, encodedTargetKey };

    // 1. Chuyển đổi giữa View Tổng Hợp và View Chi Tiết Toàn Trang (Focus Mode)
    const summaryView = document.getElementById('acct-rep-summary-view');
    const drilldownView = document.getElementById('acct-rep-drilldown-view');
    const mainHeader = document.getElementById('acct-main-header');
    const mainSubtabsBar = document.getElementById('acct-main-subtabs-bar');

    if (mainHeader) mainHeader.classList.add('hidden');
    if (mainSubtabsBar) mainSubtabsBar.classList.add('hidden');
    if (summaryView) summaryView.classList.add('hidden');
    if (drilldownView) drilldownView.classList.remove('hidden');

    const titleEl = document.getElementById('drilldown-view-title');
    const badgeEl = document.getElementById('drilldown-view-badge');
    const subtextEl = document.getElementById('drilldown-view-subtext');
    const periodEl = document.getElementById('drilldown-view-period');
    const iconEl = document.getElementById('drilldown-view-icon');
    const kpiContainer = document.getElementById('drilldown-kpi-container');
    const tripsTbody = document.getElementById('drilldown-trips-tbody');
    const expTbody = document.getElementById('drilldown-expenses-tbody');
    const tripsTfoot = document.getElementById('drilldown-trips-tfoot');
    const expTfoot = document.getElementById('drilldown-expenses-tfoot');
    const searchInput = document.getElementById('drilldown-table-search');
    if (searchInput) searchInput.value = '';

    if (titleEl) titleEl.innerText = targetKey || 'Đang tải dữ liệu...';
    if (subtextEl) subtextEl.innerText = 'Vui lòng chờ trong giây lát...';

    const fromDate = document.getElementById('acct-rep-from-date')?.value || '';
    const toDate = document.getElementById('acct-rep-to-date')?.value || '';
    let periodText = 'Tất cả';
    if (fromDate && toDate) {
        periodText = `${fromDate} đến ${toDate}`;
    } else if (currentAccountingReportPeriod) {
        const periodMap = {
            'this_month': 'Tháng này',
            'last_month': 'Tháng trước',
            'this_quarter': 'Quý này',
            'this_year': 'Năm nay'
        };
        periodText = periodMap[currentAccountingReportPeriod] || currentAccountingReportPeriod;
    }
    if (periodEl) periodEl.innerText = `Kỳ: ${periodText}`;
    
    // Đổi Badge & Icon theo loại báo cáo
    const reportType = currentAccountingReportType || (cachedAccountingReportData ? cachedAccountingReportData.report_type : 'BY_CUSTOMER');
    if (reportType === 'BY_CUSTOMER') {
        if (badgeEl) {
            badgeEl.innerText = 'CHI TIẾT KHÁCH HÀNG';
            badgeEl.className = 'px-2 py-0.5 rounded-md bg-teal-100 border border-teal-200 text-teal-900 text-[10.5px] font-black uppercase tracking-wider font-heading';
        }
        if (iconEl) iconEl.innerHTML = '<i class="ph-bold ph-buildings text-teal-700"></i>';
    } else if (reportType === 'BY_SUBCONTRACTOR') {
        if (badgeEl) {
            badgeEl.innerText = 'CHI TIẾT XE BẠN (3PL)';
            badgeEl.className = 'px-2 py-0.5 rounded-md bg-rose-100 border border-rose-200 text-rose-900 text-[10.5px] font-black uppercase tracking-wider font-heading';
        }
        if (iconEl) iconEl.innerHTML = '<i class="ph-bold ph-truck text-rose-600"></i>';
    } else if (reportType === 'BY_DRIVER') {
        if (badgeEl) {
            badgeEl.innerText = 'CHI TIẾT BÁC TÀI';
            badgeEl.className = 'px-2 py-0.5 rounded-md bg-amber-100 border border-amber-200 text-amber-900 text-[10.5px] font-black uppercase tracking-wider font-heading';
        }
        if (iconEl) iconEl.innerHTML = '<i class="ph-bold ph-steering-wheel text-amber-600"></i>';
    } else if (reportType === 'BY_ROUTE') {
        if (badgeEl) {
            badgeEl.innerText = 'CHI TIẾT TUYẾN ĐƯỜNG';
            badgeEl.className = 'px-2 py-0.5 rounded-md bg-indigo-100 border border-indigo-200 text-indigo-900 text-[10.5px] font-black uppercase tracking-wider font-heading';
        }
        if (iconEl) iconEl.innerHTML = '<i class="ph-bold ph-path text-indigo-600"></i>';
    }

    if (kpiContainer) {
        kpiContainer.innerHTML = '<div class="col-span-2 lg:col-span-4 py-4 text-center text-slate-400"><i class="ph-bold ph-spinner animate-spin text-xl text-teal-600"></i> Đang nạp dữ liệu phân tích chi tiết...</div>';
    }
    if (tripsTbody) {
        tripsTbody.innerHTML = '<tr><td colspan="11" class="py-12 text-center text-slate-400"><i class="ph-bold ph-spinner animate-spin text-2xl text-teal-600"></i> Đang tải các chuyến xe...</td></tr>';
    }
    if (tripsTfoot) tripsTfoot.innerHTML = '';
    if (expTfoot) expTfoot.innerHTML = '';

    // Cuộn lên đầu view kế toán
    const mainView = document.getElementById('view-ke-toan');
    if (mainView) mainView.scrollTo({ top: 0, behavior: 'smooth' });

    // 2. Gọi API Drill-down
    try {
        const url = `/api/accounting/reports/drilldown/?type=${reportType}&target_id=${targetId}&target_key=${encodeURIComponent(targetKey)}&from_date=${fromDate}&to_date=${toDate}`;
        
        const res = await fetchWithAuth(url);
        if (!res.ok) throw new Error('Không thể tải dữ liệu chi tiết');
        const data = await res.json();
        cachedAccountingDrilldownData = data;

        // Cập nhật thông tin Header
        if (titleEl) titleEl.innerText = data.target_name || targetKey;
        if (subtextEl) subtextEl.innerText = data.target_subtext || '';

        // 3. Render 4 Thẻ KPI Phân Tích Nhỏ Gọn (Compact Metric Strip)
        const sum = data.summary || {};
        const fmt = (n) => Number(n || 0).toLocaleString('vi-VN');

        if (kpiContainer) {
            kpiContainer.innerHTML = `
                <div class="bg-slate-50/80 p-3 rounded-xl border border-slate-200/90 border-l-4 border-l-teal-600 flex items-center justify-between shadow-2xs">
                    <div>
                        <span class="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">Tổng Chuyến Chạy</span>
                        <p class="text-xl font-black text-slate-900 font-heading tabular-nums mt-0.5">${fmt(sum.total_trips)} <span class="text-xs font-semibold text-slate-500">chuyến</span></p>
                    </div>
                    <div class="w-8 h-8 rounded-lg bg-teal-100/70 text-teal-800 flex items-center justify-center text-sm shrink-0">
                        <i class="ph-bold ph-truck"></i>
                    </div>
                </div>
                <div class="bg-slate-50/80 p-3 rounded-xl border border-slate-200/90 border-l-4 border-l-blue-600 flex items-center justify-between shadow-2xs">
                    <div>
                        <span class="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">Tổng Doanh Thu Cước</span>
                        <p class="text-xl font-black text-blue-900 font-heading tabular-nums mt-0.5">${fmt(sum.total_revenue)} <span class="text-xs font-semibold text-slate-500">đ</span></p>
                    </div>
                    <div class="w-8 h-8 rounded-lg bg-blue-100/70 text-blue-800 flex items-center justify-center text-sm shrink-0">
                        <i class="ph-bold ph-hand-coins"></i>
                    </div>
                </div>
                <div class="bg-slate-50/80 p-3 rounded-xl border border-slate-200/90 border-l-4 border-l-rose-500 flex items-center justify-between shadow-2xs">
                    <div>
                        <span class="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">Tổng Chi Phí Thực Tế</span>
                        <p class="text-xl font-black text-rose-600 font-heading tabular-nums mt-0.5">${fmt(sum.total_expense)} <span class="text-xs font-semibold text-slate-500">đ</span></p>
                    </div>
                    <div class="w-8 h-8 rounded-lg bg-rose-100/70 text-rose-700 flex items-center justify-center text-sm shrink-0">
                        <i class="ph-bold ph-receipt"></i>
                    </div>
                </div>
                <div class="bg-slate-50/80 p-3 rounded-xl border border-slate-200/90 border-l-4 border-l-emerald-600 flex items-center justify-between shadow-2xs">
                    <div>
                        <span class="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">Lợi Nhuận Gộp Đối Tượng</span>
                        <p class="text-xl font-black text-emerald-700 font-heading tabular-nums mt-0.5">${fmt(sum.total_gross_profit)} <span class="text-xs font-semibold text-slate-500">đ</span></p>
                    </div>
                    <div class="w-8 h-8 rounded-lg bg-emerald-100/70 text-emerald-800 flex items-center justify-center text-sm shrink-0">
                        <i class="ph-bold ph-trend-up"></i>
                    </div>
                </div>
            `;
        }

        // 4. Render Tab Labels
        const trips = data.trips || [];
        const expenses = data.expenses || [];
        const tabTripsLabel = document.getElementById('drilldown-tab-trips-label');
        const tabExpLabel = document.getElementById('drilldown-tab-expenses-label');
        if (tabTripsLabel) tabTripsLabel.innerText = `Bảng Kê Chuyến Xe (${trips.length})`;
        if (tabExpLabel) tabExpLabel.innerText = `Khoản Chi & Hóa Đơn (${expenses.length})`;

        // 5. Render Bảng Chuyến Xe
        if (tripsTbody) {
            if (trips.length === 0) {
                tripsTbody.innerHTML = '<tr><td colspan="11" class="py-12 text-center text-slate-400 italic">Không có chuyến xe nào trong kỳ đã chọn</td></tr>';
            } else {
                let tripsHtml = '';
                trips.forEach((t, idx) => {
                    const statusClass = t.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800';
                    tripsHtml += `
                        <tr class="hover:bg-teal-50/50 transition-colors">
                            <td class="py-3 px-3.5 text-center font-bold text-slate-400">${idx + 1}</td>
                            <td class="py-3 px-3.5">
                                <button type="button" onclick="viewTripDetail('${t.trip_code}')"
                                    class="text-teal-700 hover:text-teal-900 font-bold font-mono text-left underline decoration-teal-300 flex items-center gap-1 cursor-pointer">
                                    <i class="ph-bold ph-arrow-square-out text-xs"></i>
                                    <span>${t.trip_code}</span>
                                </button>
                            </td>
                            <td class="py-3 px-3.5 text-slate-600">${t.created_date}</td>
                            <td class="py-3 px-3.5">
                                <strong class="text-slate-800 block font-heading">${escapeHtml(t.vehicle_plate)}</strong>
                                <span class="text-slate-500 text-[11px]">${escapeHtml(t.driver_name)}</span>
                            </td>
                            <td class="py-3 px-3.5">
                                <span class="font-mono font-semibold text-slate-800 block">${escapeHtml(t.container_number)} (${t.container_type})</span>
                                <span class="text-slate-400 text-[10px]">Seal: ${escapeHtml(t.seal_number)}</span>
                            </td>
                            <td class="py-3 px-3.5 text-slate-700 max-w-[240px] truncate font-medium" title="${escapeHtml(t.route)}">
                                ${escapeHtml(t.route)}
                            </td>
                            <td class="py-3 px-3.5 text-right font-mono font-bold text-slate-800">${fmt(t.revenue)} đ</td>
                            <td class="py-3 px-3.5 text-right font-mono font-semibold text-rose-600">${fmt(t.operating_expense)} đ</td>
                            <td class="py-3 px-3.5 text-right font-mono text-amber-700">${t.reimbursable_expense > 0 ? fmt(t.reimbursable_expense) + ' đ' : '-'}</td>
                            <td class="py-3 px-3.5 text-right font-mono font-black text-emerald-700">${fmt(t.gross_profit)} đ</td>
                            <td class="py-3 px-3.5 text-center">
                                <span class="text-xs font-bold uppercase ${statusClass}">
                                    ${t.status_display}
                                </span>
                            </td>
                        </tr>
                    `;
                });
                tripsTbody.innerHTML = tripsHtml;
            }
        }

        // Render Footer Tổng Chuyến Xe
        if (tripsTfoot && trips.length > 0) {
            tripsTfoot.innerHTML = `
                <tr class="bg-slate-100/90 font-black text-slate-800 border-t-2 border-slate-300">
                    <td colspan="6" class="py-3 px-3.5 text-right font-heading uppercase text-xs">
                        TỔNG CỘNG (${trips.length} chuyến):
                    </td>
                    <td class="py-3 px-3.5 text-right font-mono text-blue-900 font-black text-xs">${fmt(sum.total_revenue)} đ</td>
                    <td class="py-3 px-3.5 text-right font-mono text-rose-600 font-black text-xs">${fmt(sum.total_expense)} đ</td>
                    <td class="py-3 px-3.5 text-right font-mono text-amber-700 font-black text-xs">${fmt(sum.total_reimbursable)} đ</td>
                    <td class="py-3 px-3.5 text-right font-mono text-emerald-700 font-black text-xs">${fmt(sum.total_gross_profit)} đ</td>
                    <td></td>
                </tr>
            `;
        }

        // 6. Render Bảng Chi Phí & Hóa Đơn
        if (expTbody) {
            if (expenses.length === 0) {
                expTbody.innerHTML = '<tr><td colspan="9" class="py-12 text-center text-slate-400 italic">Không có khoản chi phí phát sinh nào</td></tr>';
            } else {
                let expHtml = '';
                expenses.forEach((e, idx) => {
                    const isReimbBadge = e.is_on_behalf_of_customer 
                        ? '<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800">Chi Hộ</span>'
                        : '<span class="text-slate-400">-</span>';
                    expHtml += `
                        <tr class="hover:bg-slate-50/80 transition-colors">
                            <td class="py-3 px-3.5 text-center font-bold text-slate-400">${idx + 1}</td>
                            <td class="py-3 px-3.5 font-mono font-bold text-teal-800">${escapeHtml(e.trip_code)}</td>
                            <td class="py-3 px-3.5 font-semibold text-slate-800">
                                ${escapeHtml(e.category_display)}
                                ${e.expense_item_name ? `<span class="text-slate-400 font-normal text-[11px] block">(${escapeHtml(e.expense_item_name)})</span>` : ''}
                            </td>
                            <td class="py-3 px-3.5 text-right font-mono font-black text-rose-600">${fmt(e.amount)} đ</td>
                            <td class="py-3 px-3.5 text-slate-600">${escapeHtml(e.receipt_type_display)}</td>
                            <td class="py-3 px-3.5 font-mono text-slate-700">${escapeHtml(e.invoice_number || '-')}</td>
                            <td class="py-3 px-3.5 text-center">${isReimbBadge}</td>
                            <td class="py-3 px-3.5 text-center">
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">${escapeHtml(e.status_display)}</span>
                            </td>
                            <td class="py-3 px-3.5 text-center text-slate-500">${e.created_at}</td>
                        </tr>
                    `;
                });
                expTbody.innerHTML = expHtml;
            }
        }

        // Render Footer Tổng Chi Phí
        if (expTfoot && expenses.length > 0) {
            expTfoot.innerHTML = `
                <tr class="bg-slate-100/90 font-black text-slate-800 border-t-2 border-slate-300">
                    <td colspan="3" class="py-3 px-3.5 text-right font-heading uppercase text-xs">
                        TỔNG CỘNG (${expenses.length} khoản chi):
                    </td>
                    <td class="py-3 px-3.5 text-right font-mono text-rose-600 font-black text-xs">${fmt(sum.total_expense)} đ</td>
                    <td colspan="5"></td>
                </tr>
            `;
        }

        // Mặc định mở Tab 1 (Chuyến xe)
        switchDrilldownTab('trips');

    } catch (err) {
        console.error('Error loading drilldown:', err);
        showToast('danger', 'Không thể nạp chi tiết báo cáo');
    }
}
window.openAccountingReportDrilldown = openAccountingReportDrilldown;

function switchDrilldownTab(tabName) {
    currentDrilldownTab = tabName;
    const btnTrips = document.getElementById('btn-drilldown-tab-trips');
    const btnExp = document.getElementById('btn-drilldown-tab-expenses');
    const panelTrips = document.getElementById('drilldown-panel-trips');
    const panelExp = document.getElementById('drilldown-panel-expenses');

    if (tabName === 'trips') {
        if (btnTrips) btnTrips.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold font-heading bg-teal-700 text-white shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer';
        if (btnExp) btnExp.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold font-heading text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-all cursor-pointer';
        if (panelTrips) panelTrips.classList.remove('hidden');
        if (panelExp) panelExp.classList.add('hidden');
    } else {
        if (btnTrips) btnTrips.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold font-heading text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-all cursor-pointer';
        if (btnExp) btnExp.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold font-heading bg-teal-700 text-white shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer';
        if (panelTrips) panelTrips.classList.add('hidden');
        if (panelExp) panelExp.classList.remove('hidden');
    }

    // Re-apply search filter for newly activated tab
    filterDrilldownTable();
}
window.switchDrilldownTab = switchDrilldownTab;

function filterDrilldownTable() {
    const searchInput = document.getElementById('drilldown-table-search');
    const clearBtn = document.getElementById('drilldown-search-clear');
    if (!searchInput) return;

    const term = (searchInput.value || '').trim().toLowerCase();
    if (clearBtn) {
        if (term) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
    }

    const currentTab = currentDrilldownTab || 'trips';
    const tbody = currentTab === 'trips' 
        ? document.getElementById('drilldown-trips-tbody') 
        : document.getElementById('drilldown-expenses-tbody');

    if (!tbody) return;

    const rows = tbody.querySelectorAll('tr');
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        if (!term || text.includes(term)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}
window.filterDrilldownTable = filterDrilldownTable;




