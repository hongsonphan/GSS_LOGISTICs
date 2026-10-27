/**
 * BIM LOGISTICS — MODULE TÀI CHÍNH & KẾ TOÁN (ACCOUNTING & SETTLEMENTS)
 */

// =========================================================================
// 10. PHÂN HỆ QUẢN LÝ KẾ TOÁN & ĐỐI SOÁT CHI PHÍ CHUYẾN XE
// =========================================================================
let accountingDataCache = [];

async function loadAccountingData() {
    const tbody = document.getElementById('acct-tbody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="p-8 text-center text-slate-400 font-medium">
                    <i class="ph ph-spinner-gap animate-spin text-2xl mb-2 inline-block text-emerald-600"></i>
                    <p>Đang tải dữ liệu đối soát chi phí & báo cáo kế toán...</p>
                </td>
            </tr>
        `;
    }

    try {
        const globalDates = getDateRangeForPeriod(currentDashboardPeriod, currentDashboardCustomStart, currentDashboardCustomEnd);
        const res = await fetchWithAuth(`/api/accounting/?from_date=${globalDates.fromDate}&to_date=${globalDates.toDate}`);
        if (!res.ok) throw new Error('Lỗi tải dữ liệu kế toán');
        const data = await res.json();

        // 1. Cập nhật 4 thẻ KPI Kế toán
        if (data.stats) {
            const st = data.stats;
            const revEl = document.getElementById('acct-stat-revenue');
            if (revEl) revEl.innerText = new Intl.NumberFormat('vi-VN').format(st.total_revenue) + ' đ';
            const expEl = document.getElementById('acct-stat-expense');
            if (expEl) expEl.innerText = new Intl.NumberFormat('vi-VN').format(st.total_expense) + ' đ';
            const profitEl = document.getElementById('acct-stat-profit');
            if (profitEl) profitEl.innerText = new Intl.NumberFormat('vi-VN').format(st.total_profit) + ' đ';
            const marginEl = document.getElementById('acct-stat-margin');
            if (marginEl) marginEl.innerHTML = `<i class="ph-bold ph-trend-up text-xs"></i> Biên lợi nhuận gộp: ${st.profit_margin}%`;
            const pendEl = document.getElementById('acct-stat-pending');
            if (pendEl) pendEl.innerText = `${new Intl.NumberFormat('vi-VN').format(st.pending_settle_count)} chuyến`;
            const setEl = document.getElementById('acct-stat-settled');
            if (setEl) setEl.innerHTML = `<i class="ph-bold ph-lock-key text-xs"></i> Đã chốt sổ: ${new Intl.NumberFormat('vi-VN').format(st.settled_count)} chuyến`;
            const tripsCountEl = document.getElementById('acct-stat-trips-count');
            if (tripsCountEl) tripsCountEl.innerHTML = `<i class="ph-bold ph-check-circle text-xs"></i> Tính trên ${st.total_trips} chuyến xe phát sinh`;
        }

        // 2. Lưu cache và hiển thị bảng
        accountingDataCache = data.settlements || [];
        populateAccountingFilterDropdowns(accountingDataCache);
        filterAccountingTable();

    } catch (err) {
        console.error('Lỗi tải dữ liệu kế toán:', err);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="p-8 text-center text-rose-500 font-bold">
                        <i class="ph-bold ph-warning-circle text-2xl mb-1 inline-block"></i>
                        <p>Không thể tải dữ liệu đối soát chi phí kế toán. Vui lòng thử lại.</p>
                    </td>
                </tr>
            `;
        }
    }
}

function renderAccountingTable(list) {
    const tbody = document.getElementById('acct-tbody');
    if (!tbody) return;

    if (!list || list.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="p-8 text-center text-slate-400 font-medium">
                    <i class="ph ph-receipt text-3xl mb-1 inline-block text-slate-300"></i>
                    <p>Không có dữ liệu đối soát chuyến xe phù hợp với bộ lọc.</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = '';
    list.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = item.is_settled 
            ? 'hover:bg-slate-50 transition-colors' 
            : 'hover:bg-amber-50/50 bg-amber-50/10 transition-colors';

        const settleBadge = item.is_settled
            ? `<span class="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1 font-heading">
                <i class="ph-bold ph-lock-key"></i> Đã Chốt Sổ
               </span>`
            : `<span class="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1 font-heading">
                <i class="ph-bold ph-clock-countdown"></i> Chờ Chốt Sổ
               </span>`;

        tr.innerHTML = `
            <td class="p-3.5 whitespace-nowrap">
                <p class="font-black text-teal-800 font-mono text-sm cursor-pointer hover:underline" onclick="viewTripDetail('${item.trip_code}')">
                    ${escapeHtml(formatCodeCompact(item.trip_code))}
                </p>
            </td>
            <td class="p-3.5 whitespace-nowrap text-center text-xs font-semibold text-slate-700">
                ${escapeHtml(item.loading_date || '-')}
            </td>
            <td class="p-3.5">
                <p class="font-bold text-slate-900 text-sm max-w-[190px] truncate" title="${item.customer_name}">${item.customer_name}</p>
                <p class="text-[13px] text-slate-600 font-medium mt-0.5 truncate max-w-[210px]" title="${item.route}">${item.route}</p>
            </td>
            <td class="p-3.5">
                <p class="font-bold text-slate-900 text-sm">${item.driver_name}</p>
                <p class="text-xs font-mono text-slate-600 font-bold">${item.license_plate}</p>
            </td>
            <td class="p-3.5 text-right font-black text-slate-900 tabular-nums text-sm font-heading">
                ${new Intl.NumberFormat('vi-VN').format(item.revenue)} đ
            </td>
            <td class="p-3.5 text-right font-black text-rose-600 tabular-nums text-sm font-heading">
                ${new Intl.NumberFormat('vi-VN').format(item.expense)} đ
            </td>
            <td class="p-3.5 text-right">
                <p class="font-black text-emerald-700 tabular-nums font-heading text-sm">${new Intl.NumberFormat('vi-VN').format(item.profit)} đ</p>
                <p class="text-[11px] text-slate-500 font-medium">Biên: ${item.margin_percent}%</p>
            </td>
            <td class="p-3.5 text-center">
                ${item.invoices_count > 0 ? `
                    <span class="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg text-xs font-bold inline-flex items-center gap-1">
                        <i class="ph-bold ph-file-text"></i> ${item.invoices_count} HĐ
                    </span>
                    ${item.sample_invoice ? `<p class="text-[11px] font-mono text-slate-500 mt-0.5">Số: ${item.sample_invoice}</p>` : ''}
                ` : `
                    <span class="text-slate-400 text-xs italic">Chưa có HĐ</span>
                `}
            </td>
            <td class="p-3.5 text-center">
                ${settleBadge}
                ${item.is_settled && item.settled_by ? `
                    <p class="text-[11px] text-slate-400 mt-0.5 font-medium truncate max-w-[110px]" title="${item.settled_by} lúc ${item.settled_at}">
                        ${item.settled_by}
                    </p>
                ` : ''}
            </td>
            <td class="p-3.5 text-center cell-actions">
                <div class="flex items-center justify-center space-x-1.5">
                    <!-- Xem chi tiết đối soát -->
                    <button onclick="viewTripDetail('${item.trip_code}')" title="Soi chứng từ & chi tiết khoản chi" 
                        class="p-1.5 rounded-lg bg-slate-100 hover:bg-teal-100 text-slate-600 hover:text-teal-700 transition-colors">
                        <i class="ph-bold ph-eye text-sm"></i>
                    </button>
                    <!-- Chốt sổ / Mở chốt sổ -->
                    ${item.is_settled ? `
                        <button onclick="toggleSettleTrip('${item.trip_code}', true)" title="Mở khóa sổ kế toán (Cho phép sửa chi phí)" 
                            class="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-700 transition-colors">
                            <i class="ph-bold ph-lock-key-open text-sm"></i>
                        </button>
                    ` : `
                        <button onclick="toggleSettleTrip('${item.trip_code}', false)" title="Chốt sổ kế toán (Khóa cứng chi phí)" 
                            class="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center gap-1 font-heading">
                            <i class="ph-bold ph-lock-key text-xs"></i>
                            <span>Chốt Sổ</span>
                        </button>
                    `}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- BỘ LỌC & SẮP XẾP BẢNG ĐỐI SOÁT KẾ TOÁN ---
let acctSortColumn = null;
let acctSortDirection = 'asc';

function populateAccountingFilterDropdowns(list) {
    if (!list || !Array.isArray(list)) return;

    // 1. Khách hàng
    const custSelect = document.getElementById('acct-filter-customer');
    if (custSelect) {
        const curVal = custSelect.value;
        const customers = [...new Set(list.map(i => (i.customer_name || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
        custSelect.innerHTML = '<option value="">-- Tất cả Khách hàng --</option>' + 
            customers.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
        if (customers.includes(curVal)) custSelect.value = curVal;
    }

    // 2. Tài xế / Xe
    const drvSelect = document.getElementById('acct-filter-driver');
    if (drvSelect) {
        const curVal = drvSelect.value;
        const drivers = [...new Set(list.map(i => (i.driver_name || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
        const vehicles = [...new Set(list.map(i => (i.license_plate || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));

        let opts = '<option value="">-- Tất cả Tài xế / Xe --</option>';
        if (drivers.length > 0) {
            opts += '<optgroup label="Tài xế">' + drivers.map(d => `<option value="DRIVER:${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('') + '</optgroup>';
        }
        if (vehicles.length > 0) {
            opts += '<optgroup label="Biển số xe">' + vehicles.map(v => `<option value="VEHICLE:${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('') + '</optgroup>';
        }
        drvSelect.innerHTML = opts;
        if (curVal) drvSelect.value = curVal;
    }
}

function clearAccountingSearch() {
    const input = document.getElementById('acct-search-input');
    if (input) input.value = '';
    const clearBtn = document.getElementById('btn-clear-acct-search');
    if (clearBtn) clearBtn.classList.add('hidden');
    filterAccountingTable();
}

function resetAccountingFilters() {
    const cust = document.getElementById('acct-filter-customer');
    if (cust) cust.value = '';
    const drv = document.getElementById('acct-filter-driver');
    if (drv) drv.value = '';
    const settle = document.getElementById('acct-filter-settle');
    if (settle) settle.value = 'ALL';
    const search = document.getElementById('acct-search-input');
    if (search) search.value = '';
    const clearBtn = document.getElementById('btn-clear-acct-search');
    if (clearBtn) clearBtn.classList.add('hidden');

    acctSortColumn = null;
    acctSortDirection = 'asc';
    filterAccountingTable();
}

function toggleAccountingSort(col) {
    if (acctSortColumn === col) {
        acctSortDirection = acctSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        acctSortColumn = col;
        acctSortDirection = 'asc';
    }
    filterAccountingTable();
}

function filterAccountingTable() {
    if (!accountingDataCache || !Array.isArray(accountingDataCache)) return;

    const query = document.getElementById('acct-search-input')?.value?.toLowerCase().trim() || '';
    const custFilter = document.getElementById('acct-filter-customer')?.value?.trim().toLowerCase() || '';
    const drvFilter = document.getElementById('acct-filter-driver')?.value?.trim() || '';
    const settleFilter = document.getElementById('acct-filter-settle')?.value || 'ALL';

    const clearBtn = document.getElementById('btn-clear-acct-search');
    if (clearBtn) {
        if (query) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
    }

    let filtered = accountingDataCache.filter(item => {
        if (custFilter && (item.customer_name || '').toLowerCase() !== custFilter) return false;

        if (drvFilter) {
            if (drvFilter.startsWith('DRIVER:')) {
                const targetDrv = drvFilter.replace('DRIVER:', '');
                if (item.driver_name !== targetDrv) return false;
            } else if (drvFilter.startsWith('VEHICLE:')) {
                const targetVeh = drvFilter.replace('VEHICLE:', '');
                if (item.license_plate !== targetVeh) return false;
            }
        }

        if (settleFilter === 'SETTLED' && !item.is_settled) return false;
        if (settleFilter === 'PENDING' && item.is_settled) return false;

        if (query) {
            const combinedText = [
                item.trip_code,
                item.customer_name,
                item.route,
                item.driver_name,
                item.license_plate,
                item.sample_invoice,
                item.settled_by
            ].filter(Boolean).join(' ').toLowerCase();

            if (!combinedText.includes(query)) return false;
        }

        return true;
    });

    // Cập nhật số đếm
    const filteredCountEl = document.getElementById('acct-filtered-count');
    if (filteredCountEl) filteredCountEl.innerText = filtered.length;
    const totalCountEl = document.getElementById('acct-total-count');
    if (totalCountEl) totalCountEl.innerText = accountingDataCache.length;

    // Sắp xếp
    if (acctSortColumn) {
        filtered.sort((a, b) => {
            let valA = a[acctSortColumn];
            let valB = b[acctSortColumn];

            if (acctSortColumn === 'loading_date') {
                const timeA = valA ? new Date(valA).getTime() || 0 : 0;
                const timeB = valB ? new Date(valB).getTime() || 0 : 0;
                return acctSortDirection === 'asc' ? timeA - timeB : timeB - timeA;
            }

            if (['revenue', 'expense', 'profit', 'invoices_count'].includes(acctSortColumn)) {
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
                return acctSortDirection === 'asc' ? valA - valB : valB - valA;
            }

            if (acctSortColumn === 'is_settled') {
                valA = valA ? 1 : 0;
                valB = valB ? 1 : 0;
                return acctSortDirection === 'asc' ? valA - valB : valB - valA;
            }

            valA = (valA || '').toString();
            valB = (valB || '').toString();
            const cmp = valA.localeCompare(valB, 'vi');
            return acctSortDirection === 'asc' ? cmp : -cmp;
        });
    }

    // Cập nhật icon sort thead
    const sortCols = ['trip_code', 'loading_date', 'customer_name', 'driver_name', 'revenue', 'expense', 'profit', 'invoices_count', 'is_settled'];
    sortCols.forEach(col => {
        const iconEl = document.getElementById(`sort-icon-acct-${col}`);
        if (iconEl) {
            if (acctSortColumn === col) {
                iconEl.className = acctSortDirection === 'asc' 
                    ? 'ph-bold ph-arrow-up text-teal-600 text-xs' 
                    : 'ph-bold ph-arrow-down text-teal-600 text-xs';
            } else {
                iconEl.className = 'ph-bold ph-arrows-down-up text-slate-400 text-xs';
            }
        }
    });

    renderAccountingTable(filtered);
}

async function toggleSettleTrip(tripCode, isCurrentlySettled) {
    if (isCurrentlySettled) {
        const confirmed = await showConfirmModal({
            title: 'Mở Khóa Sổ Kế Toán',
            message: `Bạn có chắc chắn muốn MỞ KHÓA SỔ KẾ TOÁN cho chuyến xe [${tripCode}]?\n\nSau khi mở khóa, các khoản chi phí có thể bị sửa đổi hoặc xóa.`,
            confirmText: 'Mở Khóa Sổ',
            cancelText: 'Huỷ bỏ',
            type: 'warning',
            icon: 'ph-bold ph-lock-open text-2xl'
        });
        if (!confirmed) return;
        try {
            const res = await fetchWithAuth(`/api/trips/${tripCode}/unsettle-expenses/`, {
                method: 'POST'
            });
            const data = await res.json().catch(() => ({}));
            if (data.success) {
                showToast('warning', data.message, 'Đã Mở Khóa Sổ');
                loadAccountingData();
            } else {
                showToast('danger', data.message || data.error || data.detail || 'Có lỗi xảy ra');
            }
        } catch (err) {
            showToast('danger', 'Lỗi kết nối máy chủ');
        }
    } else {
        const confirmed = await showConfirmModal({
            title: 'Chốt Sổ Kế Toán',
            message: `Xác nhận CHỐT SỔ KẾ TOÁN chuyến xe [${tripCode}]?\n\nToàn bộ chi phí đã duyệt sẽ được khóa cứng để làm căn cứ quyết toán và hạch toán thuế.`,
            confirmText: 'Chốt Khóa Sổ',
            cancelText: 'Huỷ bỏ',
            type: 'success',
            icon: 'ph-bold ph-seal-check text-2xl'
        });
        if (!confirmed) return;
        try {
            const res = await fetchWithAuth(`/api/trips/${tripCode}/settle-expenses/`, {
                method: 'POST'
            });
            const data = await res.json().catch(() => ({}));
            if (data.success) {
                showToast('success', data.message, 'Chốt Sổ Thành Công');
                loadAccountingData();
            } else {
                showToast('danger', data.message || data.error || data.detail || 'Có lỗi xảy ra');
            }
        } catch (err) {
            showToast('danger', 'Lỗi kết nối máy chủ');
        }
    }
}

// =========================================================================
// 10.1 PHÂN HỆ TẠM ỨNG & HOÀN ỨNG (DISPATCHER FUND & DRIVER ADVANCES)
// =========================================================================

let currentAccountingSubTab = 'acct-cashbook';
let accountingAdvancesData = null;
let rawDriverAdvancesList = [];
let rawDispatcherFundsList = [];

function switchAccountingSubTab(subtabId) {
    currentAccountingSubTab = subtabId;

    // Ẩn tất cả subtab contents
    document.querySelectorAll('.acct-subtab-content').forEach(el => el.classList.add('hidden'));

    // Đưa tất cả buttons về trạng thái Inactive chuẩn (h-10, border-2, border-transparent)
    document.querySelectorAll('.acct-subtab-btn').forEach(btn => {
        btn.className = 'acct-subtab-btn h-10 px-3.5 rounded-xl text-xs md:text-sm font-bold font-heading flex items-center justify-center space-x-1.5 transition-all cursor-pointer border-2 border-transparent bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-200 box-border whitespace-nowrap';
        const icon = btn.querySelector('i');
        if (icon) icon.className = icon.className.replace(/text-[a-z]+-[0-9]+/g, 'text-slate-500');
        const badge = btn.querySelector('span[id^="badge-"]');
        if (badge) badge.className = 'px-2 py-0.5 rounded-full text-[11px] font-black tabular-nums transition-all border bg-slate-100 text-slate-600 border-slate-200';
    });

    // Mở subtab được chọn
    const targetContent = document.getElementById(`subtab-${subtabId}`);
    if (targetContent) targetContent.classList.remove('hidden');

    // Active button tương ứng (Thứ tự: 1. Cashbook, 2. Driver Adv, 3. Dispatcher Fund, 4. Settlements, 5. Reimbursables, 6. Subcontractors, 7. BOT)
    let btnId = 'acct-tab-btn-1';
    let brandColor = 'emerald';
    if (subtabId === 'acct-driver-advances') { btnId = 'acct-tab-btn-2'; brandColor = 'amber'; }
    else if (subtabId === 'acct-dispatcher-funds') { btnId = 'acct-tab-btn-3'; brandColor = 'indigo'; }
    else if (subtabId === 'acct-settlements') { btnId = 'acct-tab-btn-4'; brandColor = 'teal'; }
    else if (subtabId === 'acct-customer-settlements') { btnId = 'acct-tab-btn-customer-settlements'; brandColor = 'teal'; }
    else if (subtabId === 'acct-reimbursables') { btnId = 'acct-tab-btn-5'; brandColor = 'sky'; }
    else if (subtabId === 'acct-subcontractors') { btnId = 'acct-tab-btn-6'; brandColor = 'rose'; }
    else if (subtabId === 'acct-bot-audit') { btnId = 'acct-tab-btn-7'; brandColor = 'emerald'; }

    const activeBtn = document.getElementById(btnId);
    if (activeBtn) {
        activeBtn.className = `acct-subtab-btn active h-10 px-3.5 rounded-xl text-xs md:text-sm font-bold font-heading flex items-center justify-center space-x-1.5 transition-all cursor-pointer border-2 border-${brandColor}-600 bg-${brandColor}-50/70 text-${brandColor}-900 shadow-2xs box-border whitespace-nowrap`;
        const icon = activeBtn.querySelector('i');
        if (icon) icon.className = icon.className.replace(/text-slate-500/g, `text-${brandColor}-600`);
        const badge = activeBtn.querySelector('span[id^="badge-"]');
        if (badge) badge.className = `px-2 py-0.5 rounded-full text-[11px] font-black tabular-nums transition-all border bg-${brandColor}-100 text-${brandColor}-800 border-${brandColor}-200`;
    }

    if (subtabId === 'acct-cashbook') {
        loadCashBookData();
    } else if (subtabId === 'acct-driver-advances' || subtabId === 'acct-dispatcher-funds') {
        loadAccountingAdvancesData();
    } else if (subtabId === 'acct-settlements') {
        loadAccountingData();
    } else if (subtabId === 'acct-customer-settlements') {
        if (typeof loadCustomerSettlementsData === 'function') loadCustomerSettlementsData();
    } else if (subtabId === 'acct-reimbursables') {
        loadReimbursablesData();
    } else if (subtabId === 'acct-subcontractors') {
        loadSubcontractorData();
    } else if (subtabId === 'acct-bot-audit') {
        loadBotAuditData();
    } else {
        loadCashBookData();
    }
}

async function loadAccountingAdvancesData() {
    try {
        const res = await fetchWithAuth('/api/accounting/advances/');
        if (!res.ok) throw new Error('Không thể tải dữ liệu tạm ứng hoàn ứng');
        const data = await res.json();
        accountingAdvancesData = data;

        // Cập nhật badges trên Subtab Bar
        const badgeAdv = document.getElementById('badge-acct-driver-advances');
        if (badgeAdv && data.stats) {
            badgeAdv.innerText = data.stats.pending_advances_count || 0;
        }

        const badgeFund = document.getElementById('badge-acct-dispatcher-funds');
        if (badgeFund && data.dispatcher_funds) {
            const activeCount = data.dispatcher_funds.filter(f => f.status === 'APPROVED').length;
            badgeFund.innerText = activeCount;
        }

        // Render KPI cards Tạm ứng tài xế
        if (data.stats) {
            const st = data.stats;
            const elAdvTotal = document.getElementById('acct-adv-stat-total');
            if (elAdvTotal) elAdvTotal.innerText = formatMoneyVND(st.total_driver_advance_amount);

            const elAdvSpent = document.getElementById('acct-adv-stat-spent');
            if (elAdvSpent) elAdvSpent.innerText = formatMoneyVND(st.total_driver_actual_spent);

            const elAdvRefund = document.getElementById('acct-adv-stat-refund');
            if (elAdvRefund) elAdvRefund.innerText = formatMoneyVND(st.total_refund_due);

            const elAdvReimburse = document.getElementById('acct-adv-stat-reimburse');
            if (elAdvReimburse) elAdvReimburse.innerText = formatMoneyVND(st.total_reimburse_due);

            const elAdvCount = document.getElementById('acct-adv-stat-pending-count');
            if (elAdvCount) elAdvCount.innerText = `${st.pending_advances_count} phiếu đang lưu hành`;

            // KPI cards Quỹ điều vận
            const elFundTotal = document.getElementById('acct-fund-stat-total');
            if (elFundTotal) elFundTotal.innerText = formatMoneyVND(st.total_dispatcher_funds);

            const elFundDisbursed = document.getElementById('acct-fund-stat-disbursed');
            if (elFundDisbursed) elFundDisbursed.innerText = formatMoneyVND(st.total_fund_disbursed);

            const elFundSettled = document.getElementById('acct-fund-stat-settled');
            if (elFundSettled) elFundSettled.innerText = formatMoneyVND(st.total_fund_settled);

            const elFundRem = document.getElementById('acct-fund-stat-remaining');
            if (elFundRem) elFundRem.innerText = formatMoneyVND(st.total_fund_remaining);
        }

        // Render bảng Tạm ứng tài xế
        rawDriverAdvancesList = data.driver_advances || [];
        populateDriverAdvanceFilterDropdowns(data.drivers || []);
        applyDriverAdvancesFilter();

        // Render bảng Quỹ điều vận
        rawDispatcherFundsList = data.dispatcher_funds || [];
        applyDispatcherFundsFilter();

        // Nạp options cho các modal
        populateAdvanceModalOptions(data);

    } catch (err) {
        console.error('Lỗi khi nạp dữ liệu tạm ứng:', err);
        showToast('danger', 'Không thể kết nối máy chủ để tải dữ liệu tạm ứng', 'Lỗi Kế Toán');
    }
}

// -------------------------------------------------------------
// RENDER & FILTER BẢNG TẠM ỨNG CHUYẾN CHO TÀI XẾ
// -------------------------------------------------------------
function populateDriverAdvanceFilterDropdowns(drivers) {
    const drvSelect = document.getElementById('filter-adv-driver');
    if (!drvSelect) return;
    const cur = drvSelect.value;
    drvSelect.innerHTML = '<option value="">-- Tất cả Tài xế --</option>' +
        drivers.map(d => `<option value="${escapeHtml(d.name)}">${escapeHtml(d.name)}</option>`).join('');
    if (cur) drvSelect.value = cur;
}

function applyDriverAdvancesFilter() {
    const drvFilter = document.getElementById('filter-adv-driver')?.value || '';
    const statusFilter = document.getElementById('filter-adv-status')?.value || 'ALL';
    const sourceFilter = document.getElementById('filter-adv-source')?.value || 'ALL';
    const searchVal = (document.getElementById('filter-adv-search')?.value || '').toLowerCase().trim();

    let list = rawDriverAdvancesList.filter(item => {
        if (drvFilter && item.driver_name !== drvFilter) return false;
        if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
        if (sourceFilter !== 'ALL' && item.advance_source !== sourceFilter) return false;

        if (searchVal) {
            const combined = [
                item.code,
                item.trip_code,
                item.customer_name,
                item.driver_name,
                item.license_plate,
                item.purpose
            ].filter(Boolean).join(' ').toLowerCase();
            if (!combined.includes(searchVal)) return false;
        }
        return true;
    });

    renderDriverAdvancesTable(list);
}

function renderDriverAdvancesTable(list) {
    const tbody = document.getElementById('acct-adv-tbody');
    if (!tbody) return;

    if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" class="p-8 text-center text-slate-400 font-medium">Không tìm thấy phiếu tạm ứng chuyến nào phù hợp</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map((item, index) => {
        const isSettled = item.status === 'SETTLED';
        const statusText = isSettled
            ? `<span class="text-xs font-bold text-emerald-700 whitespace-nowrap">Đã Hoàn Ứng</span>`
            : `<span class="text-xs font-bold text-amber-600 whitespace-nowrap">Đang Tạm Ứng</span>`;

        let diffText = '';
        if (isSettled) {
            if (item.settlement_diff_type === 'DRIVER_REFUND') {
                diffText = `<span class="text-xs font-bold text-blue-700 font-mono tabular-nums whitespace-nowrap" title="Tài xế đã hoàn trả tiền thừa">TX Hoàn +${formatMoneyVND(item.refund_amount)}</span>`;
            } else if (item.settlement_diff_type === 'COMPANY_REIMBURSE') {
                diffText = `<span class="text-xs font-bold text-rose-600 font-mono tabular-nums whitespace-nowrap" title="Công ty chi bù thêm">Cty Bù -${formatMoneyVND(item.reimburse_amount)}</span>`;
            } else {
                diffText = `<span class="text-xs font-bold text-emerald-700 whitespace-nowrap">Khớp Đúng 100%</span>`;
            }
        } else {
            const diff = item.difference || 0;
            if (diff > 0) {
                diffText = `<span class="text-xs font-bold text-blue-700 font-mono tabular-nums whitespace-nowrap" title="Dự kiến hoàn trả cty">+${formatMoneyVND(diff)} (Dư)</span>`;
            } else if (diff < 0) {
                diffText = `<span class="text-xs font-bold text-rose-600 font-mono tabular-nums whitespace-nowrap" title="Dự kiến cty chi bù">${formatMoneyVND(diff)} (Thiếu)</span>`;
            } else {
                diffText = `<span class="text-xs text-slate-500 font-medium whitespace-nowrap">Khớp tạm tính</span>`;
            }
        }

        const sourceBadge = item.advance_source === 'DISPATCHER_FUND'
            ? `<span class="text-xs text-indigo-700 font-semibold flex items-center gap-1"><i class="ph-bold ph-wallet"></i> ${escapeHtml(item.fund_code)}</span>`
            : `<span class="text-xs text-slate-600 font-medium">Cty trực tiếp</span>`;

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="w-12 text-center select-none font-bold text-slate-500 border-r border-slate-200 font-mono text-xs tabular-nums">
                    ${index + 1}
                </td>
                <td class="font-black text-slate-900 font-mono text-xs whitespace-nowrap">${escapeHtml(formatCodeCompact(item.code))}</td>
                <td class="whitespace-nowrap">
                    <a href="javascript:void(0)" onclick="viewTripDetail('${item.trip_code}')" class="font-mono text-teal-700 hover:underline font-bold text-xs">${escapeHtml(formatCodeCompact(item.trip_code))}</a>
                </td>
                <td class="text-[11px] text-slate-600 font-medium whitespace-nowrap text-center">${escapeHtml(item.advance_date || '-')}</td>
                <td class="text-xs font-semibold text-slate-800 max-w-[170px] truncate" title="${escapeHtml(item.customer_name)}">${escapeHtml(item.customer_name)}</td>
                <td class="text-xs text-slate-800">
                    <p class="font-bold">${escapeHtml(item.driver_name)}</p>
                    <p class="font-mono text-slate-400">${escapeHtml(item.license_plate)}</p>
                </td>
                <td class="text-right font-black text-teal-800 text-xs tabular-nums">${formatMoneyVND(item.amount)}</td>
                <td>${sourceBadge}</td>
                <td class="text-right font-semibold text-slate-800 text-xs tabular-nums">${formatMoneyVND(item.actual_spent)}</td>
                <td class="text-center">${diffText}</td>
                <td class="text-center">${statusText}</td>
                <td class="text-center">
                    <div class="inline-flex items-center justify-center gap-2">
                        <button type="button" onclick="viewDriverAdvanceDetail(${item.id})"
                            class="w-[70px] h-7 px-2 py-1 bg-white hover:bg-teal-50 text-teal-700 border border-teal-600 rounded-lg text-xs font-bold transition-all inline-flex items-center justify-center gap-1 cursor-pointer shrink-0"
                            title="Xem chi tiết, Sửa, Lưu, In & Xóa phiếu tạm ứng">
                            <i class="ph-bold ph-eye"></i>
                            <span>Xem</span>
                        </button>
                        ${!isSettled ? `
                            <button type="button" onclick="openSettleAdvanceModal(${item.id})"
                                class="w-[96px] h-7 px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold font-heading shadow-2xs inline-flex items-center justify-center gap-1 transition-all cursor-pointer shrink-0"
                                title="Đối soát chi phí thực tế & quyết toán hoàn ứng chuyến xe">
                                <i class="ph-bold ph-calculator text-xs"></i>
                                <span>Quyết Toán</span>
                            </button>
                        ` : `
                            <button type="button" onclick="printDriverAdvanceVoucher(${item.id})"
                                class="w-[96px] h-7 px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1 transition-all cursor-pointer shrink-0"
                                title="In phiếu chi tạm ứng chuyến xe khổ A4/A5">
                                <i class="ph-bold ph-printer"></i>
                                <span>In Phiếu</span>
                            </button>
                        `}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// -------------------------------------------------------------
// RENDER & FILTER BẢNG QUỸ ĐIỀU VẬN (COMPANY ➔ DISPATCHER)
// -------------------------------------------------------------
function applyDispatcherFundsFilter() {
    renderDispatcherFundsTable(rawDispatcherFundsList);
}

function renderDispatcherFundsTable(list) {
    const tbody = document.getElementById('acct-fund-tbody');
    if (!tbody) return;

    if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="p-8 text-center text-slate-400 font-medium">Chưa có phiếu Quỹ tạm ứng điều vận nào</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(item => {
        let statusBadge = '';
        if (item.status === 'APPROVED') {
            statusBadge = `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">Đang Lưu Hành</span>`;
        } else if (item.status === 'PENDING') {
            statusBadge = `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-200">Chờ Cty Duyệt</span>`;
        } else if (item.status === 'SETTLED') {
            statusBadge = `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">Đã Hoàn Ứng Xong</span>`;
        } else {
            statusBadge = `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-200">Từ Chối</span>`;
        }

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="font-black text-slate-900 font-mono text-xs">${escapeHtml(item.code)}</td>
                <td class="text-xs font-bold text-indigo-900">${escapeHtml(item.dispatcher_name)}</td>
                <td class="text-xs text-slate-600 tabular-nums">${item.advance_date}</td>
                <td class="text-right font-black text-slate-900 text-xs tabular-nums">${formatMoneyVND(item.amount)}</td>
                <td class="text-right font-semibold text-amber-700 text-xs tabular-nums">${formatMoneyVND(item.disbursed_amount)}</td>
                <td class="text-right font-semibold text-emerald-700 text-xs tabular-nums">${formatMoneyVND(item.settled_amount)}</td>
                <td class="text-right font-black text-teal-800 text-xs tabular-nums">${formatMoneyVND(item.remaining_balance)}</td>
                <td class="text-center">${statusBadge}</td>
                <td class="text-xs text-slate-500">${escapeHtml(item.approved_by || '-')}</td>
                <td class="text-center">
                    <div class="flex items-center justify-center space-x-1.5">
                        ${item.status === 'PENDING' ? `
                            <button onclick="approveDispatcherFund(${item.id})" class="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold font-heading shadow-xs flex items-center gap-1 transition-all">
                                <i class="ph-bold ph-check text-xs"></i>
                                <span>Duyệt Cấp Quỹ</span>
                            </button>
                        ` : ''}
                        ${item.status === 'APPROVED' ? `
                            <button onclick="settleDispatcherFund(${item.id})" class="px-2.5 py-1 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold font-heading shadow-xs flex items-center gap-1 transition-all">
                                <i class="ph-bold ph-lock-key text-xs"></i>
                                <span>Quyết Toán Về Cty</span>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// -------------------------------------------------------------
// MODAL CẤP TẠM ỨNG CHUYẾN CHO TÀI XẾ
// -------------------------------------------------------------
function populateAdvanceModalOptions(data) {
    // Dropdown Chuyến xe
    const tripSelect = document.getElementById('adv-inp-trip');
    if (tripSelect && data.available_trips) {
        tripSelect.innerHTML = '<option value="">-- Chọn chuyến xe cần cấp tạm ứng --</option>' +
            data.available_trips.map(t => `<option value="${t.id}" data-driver="${t.driver_id || ''}" data-driver-name="${escapeHtml(t.driver_name)}" data-plate="${escapeHtml(t.license_plate)}" data-route="${escapeHtml(t.route)}">[${t.trip_code}] ${escapeHtml(t.customer_name)} (${escapeHtml(t.license_plate)})</option>`).join('');
    }

    // Dropdown Tài xế
    const driverSelect = document.getElementById('adv-inp-driver');
    if (driverSelect && data.drivers) {
        driverSelect.innerHTML = '<option value="">-- Chọn tài xế nhận tạm ứng --</option>' +
            data.drivers.map(d => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('');
    }

    // Dropdown Quỹ điều vận khả dụng
    const fundSelect = document.getElementById('adv-inp-fund');
    if (fundSelect && data.active_funds) {
        fundSelect.innerHTML = '<option value="">-- Chọn Quỹ Điều Vận khả dụng --</option>' +
            data.active_funds.map(f => `<option value="${f.id}" data-balance="${f.remaining_balance}">${escapeHtml(f.code)} - ${escapeHtml(f.dispatcher_name)} (Còn: ${formatMoneyVND(f.remaining_balance)})</option>`).join('');
    }

    // Dropdown Điều phối viên nhận quỹ
    const dispSelect = document.getElementById('fund-inp-dispatcher');
    if (dispSelect && data.dispatchers) {
        dispSelect.innerHTML = '<option value="">-- Chọn nhân viên điều phối nhận quỹ --</option>' +
            data.dispatchers.map(dp => `<option value="${dp.id}">${escapeHtml(dp.name)}</option>`).join('');
    }
}

function openDriverAdvanceModal(tripCode = null) {
    const modal = document.getElementById('modal-driver-advance');
    if (!modal) return;
    modal.classList.remove('hidden');

    const dateInp = document.getElementById('adv-inp-date');
    if (dateInp) dateInp.value = new Date().toISOString().slice(0, 10);

    const amountInp = document.getElementById('adv-inp-amount');
    if (amountInp) amountInp.value = '1.500.000';

    if (tripCode && accountingAdvancesData && accountingAdvancesData.available_trips) {
        const found = accountingAdvancesData.available_trips.find(t => t.trip_code === tripCode);
        if (found) {
            const tripSelect = document.getElementById('adv-inp-trip');
            if (tripSelect) {
                tripSelect.value = found.id;
                onAdvanceTripChange();
            }
        }
    }
}

function closeDriverAdvanceModal() {
    const modal = document.getElementById('modal-driver-advance');
    if (modal) modal.classList.add('hidden');
}

function onAdvanceTripChange() {
    const tripSelect = document.getElementById('adv-inp-trip');
    const selectedOption = tripSelect.options[tripSelect.selectedIndex];
    if (!selectedOption || !selectedOption.value) {
        document.getElementById('adv-trip-info').classList.add('hidden');
        return;
    }

    const driverId = selectedOption.getAttribute('data-driver');
    const driverName = selectedOption.getAttribute('data-driver-name');
    const plate = selectedOption.getAttribute('data-plate');
    const route = selectedOption.getAttribute('data-route');

    if (driverId) {
        const drvSelect = document.getElementById('adv-inp-driver');
        if (drvSelect) drvSelect.value = driverId;
    }

    const infoEl = document.getElementById('adv-trip-info');
    if (infoEl) {
        infoEl.innerHTML = `<i class="ph-bold ph-truck"></i> Xe: <strong>${plate}</strong> | Tuyến: ${route}`;
        infoEl.classList.remove('hidden');
    }
}

function toggleAdvanceSourceType() {
    const sourceVal = document.querySelector('input[name="adv_source"]:checked')?.value;
    const boxFund = document.getElementById('adv-box-dispatcher-fund');
    if (!boxFund) return;
    if (sourceVal === 'DISPATCHER_FUND') {
        boxFund.classList.remove('hidden');
    } else {
        boxFund.classList.add('hidden');
    }
}

async function submitDriverAdvanceForm(e) {
    e.preventDefault();
    const tripId = document.getElementById('adv-inp-trip')?.value;
    const driverId = document.getElementById('adv-inp-driver')?.value;
    const amountStr = document.getElementById('adv-inp-amount')?.value;
    const advanceDate = document.getElementById('adv-inp-date')?.value;
    const sourceVal = document.querySelector('input[name="adv_source"]:checked')?.value || 'DISPATCHER_FUND';
    const fundId = document.getElementById('adv-inp-fund')?.value;
    const purpose = document.getElementById('adv-inp-purpose')?.value;
    const notes = document.getElementById('adv-inp-notes')?.value;

    const payload = {
        trip_id: tripId,
        driver_id: driverId,
        amount: amountStr,
        advance_date: advanceDate,
        advance_source: sourceVal,
        dispatcher_fund_id: (sourceVal === 'DISPATCHER_FUND' && fundId) ? fundId : null,
        purpose: purpose,
        notes: notes
    };

    try {
        const res = await fetchWithAuth('/api/accounting/driver-advances/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message, 'Cấp Tạm Ứng Thành Công');
            closeDriverAdvanceModal();
            loadAccountingAdvancesData();
        } else {
            showToast('danger', data.error || 'Không thể tạo phiếu tạm ứng');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

// -------------------------------------------------------------
// MODAL ĐỐI SOÁT & QUYẾT TOÁN HOÀN ỨNG CHUYẾN
// -------------------------------------------------------------
let currentActiveAdvance = null;

function openSettleAdvanceModal(advanceId) {
    const advance = rawDriverAdvancesList.find(a => a.id === advanceId);
    if (!advance) return;
    currentActiveAdvance = advance;

    const modal = document.getElementById('modal-settle-advance');
    if (!modal) return;

    document.getElementById('settle-adv-id').value = advance.id;
    document.getElementById('settle-adv-code').innerText = advance.code;
    document.getElementById('settle-adv-trip-info').innerText = `[${advance.trip_code}] ${advance.customer_name} (${advance.license_plate})`;
    document.getElementById('settle-adv-driver-name').innerText = advance.driver_name;
    document.getElementById('settle-adv-amount-display').innerText = formatMoneyVND(advance.amount);

    const spentInp = document.getElementById('settle-adv-actual-spent');
    if (spentInp) {
        spentInp.value = new Intl.NumberFormat('vi-VN').format(advance.actual_spent || advance.amount);
    }

    calculateSettlementDiff();
    modal.classList.remove('hidden');
}

function closeSettleAdvanceModal() {
    const modal = document.getElementById('modal-settle-advance');
    if (modal) modal.classList.add('hidden');
}

function calculateSettlementDiff() {
    if (!currentActiveAdvance) return;
    const spentStr = document.getElementById('settle-adv-actual-spent')?.value || '0';
    const spent = parseInt(spentStr.replace(/\D/g, ''), 10) || 0;
    const advance = parseInt(currentActiveAdvance.amount, 10) || 0;
    const diff = advance - spent;

    const box = document.getElementById('settle-adv-diff-box');
    const titleEl = document.getElementById('settle-adv-diff-title');
    const badgeEl = document.getElementById('settle-adv-diff-badge');
    const descEl = document.getElementById('settle-adv-diff-desc');
    const amountEl = document.getElementById('settle-adv-diff-amount');

    if (diff > 0) {
        // Tạm ứng > Thực chi: Tài xế nộp lại
        box.className = 'p-4 rounded-2xl border bg-blue-50/70 border-blue-200 text-blue-900';
        badgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-200 text-blue-900';
        badgeEl.innerText = 'TÀI XẾ HOÀN LẠI TIỀN THỪA';
        descEl.innerText = 'Số tiền tài xế nộp lại vào quỹ:';
        amountEl.className = 'text-xl font-black tabular-nums font-heading text-blue-800';
        amountEl.innerText = `+${formatMoneyVND(diff)}`;
    } else if (diff < 0) {
        // Thực chi > Tạm ứng: Công ty chi bù
        box.className = 'p-4 rounded-2xl border bg-rose-50/70 border-rose-200 text-rose-900';
        badgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-200 text-rose-900';
        badgeEl.innerText = 'CÔNG TY CHI TRẢ BÙ';
        descEl.innerText = 'Số tiền công ty/điều vận chi bù cho tài xế:';
        amountEl.className = 'text-xl font-black tabular-nums font-heading text-rose-700';
        amountEl.innerText = `-${formatMoneyVND(Math.abs(diff))}`;
    } else {
        box.className = 'p-4 rounded-2xl border bg-emerald-50/70 border-emerald-200 text-emerald-900';
        badgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-200 text-emerald-900';
        badgeEl.innerText = 'KHỚP ĐÚNG 100%';
        descEl.innerText = 'Không phát sinh chênh lệch:';
        amountEl.className = 'text-xl font-black tabular-nums font-heading text-emerald-800';
        amountEl.innerText = '0 đ';
    }
}

function recalculateActualExpensesFromTrip() {
    if (!currentActiveAdvance) return;
    const spentInp = document.getElementById('settle-adv-actual-spent');
    if (spentInp) {
        spentInp.value = new Intl.NumberFormat('vi-VN').format(currentActiveAdvance.actual_spent);
        calculateSettlementDiff();
    }
}

async function submitSettleAdvanceForm(e) {
    e.preventDefault();
    if (!currentActiveAdvance) return;

    const spentStr = document.getElementById('settle-adv-actual-spent')?.value || '0';
    const spent = parseInt(spentStr.replace(/\D/g, ''), 10) || 0;
    const notes = document.getElementById('settle-adv-notes')?.value || '';

    try {
        const res = await fetchWithAuth(`/api/accounting/driver-advances/${currentActiveAdvance.id}/settle/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                actual_spent: spent,
                settlement_notes: notes
            })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message, 'Quyết Toán Hoàn Ứng Thành Công');
            closeSettleAdvanceModal();
            loadAccountingAdvancesData();
            if (data.cash_transaction || data.cash_transaction_id || data.cash_transaction_code) {
                setTimeout(() => {
                    openCashVoucherModal(data.cash_transaction || data.cash_transaction_id || data.cash_transaction_code);
                }, 300);
            }
        } else {
            showToast('danger', data.error || 'Không thể quyết toán');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

// -------------------------------------------------------------
// 9.3. PHÂN HỆ QUYẾT TOÁN GOM CHUYẾN XE (BATCH TRIP SETTLEMENT CONTROLLER)
// -------------------------------------------------------------
let pageSettlementData = null;
let pageAllTripsList = [];
let batchSettlementData = null;
let batchAllTripsList = [];


function returnFromSettlementView() {
    if (previousActiveTab && previousActiveTab !== 'quyet-toan') {
        switchTab(previousActiveTab, true);
    } else {
        switchTab('dieu-van', true);
    }
}
window.returnFromSettlementView = returnFromSettlementView;

function openBatchSettlementModal(prefilledDriverId = null, prefilledVehicleId = null) {
    const currentActiveView = document.querySelector('.view:not(.hidden-view)');
    if (currentActiveView && currentActiveView.id !== 'view-quyet-toan') {
        previousActiveTab = currentActiveView.id.replace('view-', '');
    }
    // Chuyển trực tiếp sang Trang Quyết Toán Gom Chuyến chuyên dụng
    switchTab('quyet-toan');
    if (prefilledDriverId) {
        const groupBy = document.getElementById('settle-group-by');
        if (groupBy) {
            groupBy.value = 'driver';
            onSettlementGroupByChange();
            setTimeout(() => {
                const targetSelect = document.getElementById('settle-target-select');
                if (targetSelect) {
                    targetSelect.value = prefilledDriverId;
                    loadSettlementData();
                }
            }, 100);
        }
    } else if (prefilledVehicleId) {
        const groupBy = document.getElementById('settle-group-by');
        if (groupBy) {
            groupBy.value = 'vehicle';
            onSettlementGroupByChange();
            setTimeout(() => {
                const targetSelect = document.getElementById('settle-target-select');
                if (targetSelect) {
                    targetSelect.value = prefilledVehicleId;
                    loadSettlementData();
                }
            }, 100);
        }
    }
}

function onSettlementGroupByChange() {
    const groupBy = document.getElementById('settle-group-by')?.value || 'driver';
    populateSettlementTargetOptions(groupBy);
    loadSettlementData();
}

function populateSettlementTargetOptions(groupBy, preselectedId = null) {
    const targetLabel = document.getElementById('settle-target-label');
    const targetSelect = document.getElementById('settle-target-select');
    if (!targetSelect) return;

    targetSelect.innerHTML = '<option value="">-- Tất cả --</option>';

    if (groupBy === 'driver') {
        if (targetLabel) targetLabel.innerText = 'Chọn Bác Tài:';
        if (masterDataFormOptionsCache?.drivers && masterDataFormOptionsCache.drivers.length > 0) {
            masterDataFormOptionsCache.drivers.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.id;
                opt.innerText = d.label || `${d.full_name || d.nickname} (${d.phone || 'Tài xế'})`;
                if (preselectedId && String(d.id) === String(preselectedId)) opt.selected = true;
                targetSelect.appendChild(opt);
            });
        } else if (window.rawPersonnelList && window.rawPersonnelList.length > 0) {
            const drivers = window.rawPersonnelList.filter(p => p.role === 'DRIVER' || p.role === 'Lái xe' || p.department === 'Đội Xe');
            drivers.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.id;
                opt.innerText = `${d.full_name} (${d.nickname || d.phone_number || 'Tài xế'})`;
                if (preselectedId && String(d.id) === String(preselectedId)) opt.selected = true;
                targetSelect.appendChild(opt);
            });
        }
    } else if (groupBy === 'customer') {
        if (targetLabel) targetLabel.innerText = 'Chọn Khách Hàng:';
        if (masterDataFormOptionsCache?.customers && masterDataFormOptionsCache.customers.length > 0) {
            masterDataFormOptionsCache.customers.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.innerText = c.label || `${c.company_name || c.name || c.short_name || 'Khách hàng'}`;
                if (preselectedId && String(c.id) === String(preselectedId)) opt.selected = true;
                targetSelect.appendChild(opt);
            });
        } else if (window.rawCustomersList && window.rawCustomersList.length > 0) {
            window.rawCustomersList.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.innerText = `${c.company_name || c.name || c.short_name || 'Khách hàng'}`;
                if (preselectedId && String(c.id) === String(preselectedId)) opt.selected = true;
                targetSelect.appendChild(opt);
            });
        } else {
            fetchWithAuth('/api/master-data/customers/').then(r => r.json()).then(data => {
                const list = data.customers || data.results || (Array.isArray(data) ? data : []);
                window.rawCustomersList = list;
                list.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.id;
                    opt.innerText = `${c.company_name || c.name || c.short_name || 'Khách hàng'}`;
                    if (preselectedId && String(c.id) === String(preselectedId)) opt.selected = true;
                    targetSelect.appendChild(opt);
                });
            }).catch(() => {});
        }
    } else if (groupBy === 'vehicle') {
        if (targetLabel) targetLabel.innerText = 'Chọn Đầu Xe:';
        if (masterDataFormOptionsCache?.vehicles && masterDataFormOptionsCache.vehicles.length > 0) {
            masterDataFormOptionsCache.vehicles.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v.id;
                opt.innerText = v.label || `${v.plate || v.license_plate} (${v.type || 'Đầu kéo'})`;
                if (preselectedId && String(v.id) === String(preselectedId)) opt.selected = true;
                targetSelect.appendChild(opt);
            });
        } else if (window.rawFleetVehiclesList && window.rawFleetVehiclesList.length > 0) {
            window.rawFleetVehiclesList.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v.id;
                opt.innerText = `${v.license_plate} (${v.vehicle_type || 'Đầu kéo'})`;
                if (preselectedId && String(v.id) === String(preselectedId)) opt.selected = true;
                targetSelect.appendChild(opt);
            });
        }
    } else {
        if (targetLabel) targetLabel.innerText = 'Đối tượng:';
        targetSelect.innerHTML = '<option value="">-- Toàn bộ chuyến xe --</option>';
    }
}

function setSettlementDatePreset(preset) {
    const fromDateInp = document.getElementById('settle-from-date');
    const toDateInp = document.getElementById('settle-to-date');
    if (!fromDateInp || !toDateInp) return;

    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const formatD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'today') {
        fromDateInp.value = formatD(today);
        toDateInp.value = formatD(today);
    } else if (preset === 'week') {
        const dayOfWeek = today.getDay(); // 0 is Sunday
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
        const monday = new Date(today.setDate(diff));
        fromDateInp.value = formatD(monday);
        toDateInp.value = formatD(new Date());
    } else if (preset === 'month') {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        fromDateInp.value = formatD(firstDay);
        toDateInp.value = formatD(lastDay);
    } else if (preset === 'last_month') {
        const firstDayPrev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayPrev = new Date(today.getFullYear(), today.getMonth(), 0);
        fromDateInp.value = formatD(firstDayPrev);
        toDateInp.value = formatD(lastDayPrev);
    }

    loadSettlementData();
}

function resetSettlementFilters() {
    const groupBy = document.getElementById('settle-group-by');
    if (groupBy) groupBy.value = 'driver';
    const targetSelect = document.getElementById('settle-target-select');
    if (targetSelect) targetSelect.value = '';
    const statusFilter = document.getElementById('settle-status-filter');
    if (statusFilter) statusFilter.value = 'PENDING';
    const searchInp = document.getElementById('settle-search-input');
    if (searchInp) searchInp.value = '';

    setSettlementDatePreset('month');
}

function filterSettlementClientSide() {
    const searchVal = (document.getElementById('settle-search-input')?.value || '').toLowerCase().trim();
    const rows = document.querySelectorAll('#page-settle-tbody tr.settle-trip-row');
    let visibleCount = 0;

    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        if (!searchVal || text.includes(searchVal)) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });

    const badgeInfo = document.getElementById('settle-table-badge-info');
    if (badgeInfo) {
        badgeInfo.innerHTML = `Hiển thị: <strong>${visibleCount}</strong> chuyến`;
    }
    onSettlementTripSelectionChange();
}

async function loadSettlementData() {
    const groupBy = document.getElementById('settle-group-by')?.value || 'driver';
    let fromDate = document.getElementById('settle-from-date')?.value || '';
    let toDate = document.getElementById('settle-to-date')?.value || '';
    const targetId = document.getElementById('settle-target-select')?.value || '';
    const statusFilter = document.getElementById('settle-status-filter')?.value || 'PENDING';

    if (!fromDate || !toDate) {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        fromDate = firstDay.toISOString().slice(0, 10);
        toDate = today.toISOString().slice(0, 10);
        const fromInp = document.getElementById('settle-from-date');
        const toInp = document.getElementById('settle-to-date');
        if (fromInp && !fromInp.value) fromInp.value = fromDate;
        if (toInp && !toInp.value) toInp.value = toDate;
    }

    let url = `/api/accounting/driver-settlements/batch-preview/?group_by=${groupBy}&from_date=${fromDate}&to_date=${toDate}`;
    if (groupBy === 'driver' && targetId) url += `&driver_id=${targetId}`;
    if (groupBy === 'vehicle' && targetId) url += `&vehicle_id=${targetId}`;
    if (groupBy === 'customer' && targetId) url += `&customer_id=${targetId}`;

    const tbody = document.getElementById('page-settle-tbody');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="11" class="text-center py-12 text-slate-500 font-medium"><i class="ph-bold ph-spinner ph-spin text-3xl mb-2 block text-teal-600"></i> Đang phân tích và gom dữ liệu chuyến xe...</td></tr>`;
    }

    try {
        const res = await fetchWithAuth(url);
        const data = await res.json();
        if (res.ok && data.success) {
            pageSettlementData = data;
            batchSettlementData = data;
            renderSettlementTable(data);
        } else {
            if (tbody) tbody.innerHTML = `<tr><td colspan="11" class="text-center py-8 text-rose-500 font-bold">${data.error || 'Không thể tải dữ liệu'}</td></tr>`;
        }
    } catch (err) {
        console.error(err);
        if (tbody) tbody.innerHTML = `<tr><td colspan="11" class="text-center py-8 text-rose-500 font-bold">Lỗi kết nối máy chủ</td></tr>`;
    }
}

function renderSettlementTable(data) {
    const tbody = document.getElementById('page-settle-tbody');
    const badgeInfo = document.getElementById('settle-table-badge-info');
    const statusFilter = document.getElementById('settle-status-filter')?.value || 'PENDING';
    if (!tbody) return;

    const groups = data.groups || [];
    pageAllTripsList = [];
    batchAllTripsList = [];

    if (groups.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" class="text-center py-12 text-slate-400 font-semibold"><i class="ph-bold ph-info text-3xl mb-2 block"></i> Không có chuyến xe nào trong khoảng thời gian đã chọn.</td></tr>`;
        if (badgeInfo) badgeInfo.innerHTML = 'Hiển thị: <strong>0</strong> chuyến';
        onSettlementTripSelectionChange();
        return;
    }

    let html = '';
    let totalTripsInView = 0;

    groups.forEach((group, gIdx) => {
        let trips = group.trips || [];
        if (statusFilter === 'PENDING') {
            trips = trips.filter(t => !t.is_settled);
        } else if (statusFilter === 'SETTLED') {
            trips = trips.filter(t => t.is_settled);
        }

        if (trips.length === 0) return;
        totalTripsInView += trips.length;

        // Group Header Row
        html += `
            <tr class="bg-teal-50/80 font-bold text-slate-800 border-y border-teal-200 group-header-row" data-group-index="${gIdx}">
                <td colspan="12" class="py-2.5 px-3">
                    <div class="flex items-center justify-between flex-wrap gap-2">
                        <div class="flex items-center gap-2">
                            <span class="w-6 h-6 rounded-lg bg-teal-800 text-white flex items-center justify-center text-xs font-black">
                                ${gIdx + 1}
                            </span>
                            <span class="text-sm font-black text-teal-950">${escapeHtml(group.group_label)}</span>
                            <span class="text-xs text-slate-600 font-normal">(${escapeHtml(group.group_sub)})</span>
                            <button type="button" onclick="toggleGroupSettlementSelection(${gIdx})" class="px-2 py-0.5 rounded bg-white hover:bg-teal-100 text-teal-900 border border-teal-300 text-[11px] font-bold transition-colors ml-2">
                                Chọn nhóm này
                            </button>
                        </div>
                        <div class="flex items-center gap-4 text-xs">
                            <span class="text-slate-600 font-medium">Số chuyến: <strong class="text-slate-900 font-bold">${trips.length}</strong></span>
                            <span class="text-amber-800 font-medium">Tạm ứng: <strong class="font-mono font-bold">${formatMoneyVND(trips.reduce((acc, t) => acc + (t.advance_amount || 0), 0))}</strong></span>
                            <span class="text-teal-800 font-medium">Thực chi: <strong class="font-mono font-bold">${formatMoneyVND(trips.reduce((acc, t) => acc + (t.actual_spent || 0), 0))}</strong></span>
                        </div>
                    </div>
                </td>
            </tr>
        `;

        trips.forEach(t => {
            pageAllTripsList.push(t);
            batchAllTripsList.push(t);
            const isSettled = t.is_settled;
            const isChecked = !isSettled;

            let diffBadge = '';
            if (t.diff > 0) {
                diffBadge = `<span class="px-2 py-0.5 rounded-full text-[11px] font-black bg-blue-100 text-blue-900 font-mono border border-blue-200">+${formatMoneyVND(t.diff)} (Thừa)</span>`;
            } else if (t.diff < 0) {
                diffBadge = `<span class="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-900 font-mono border border-rose-200">-${formatMoneyVND(Math.abs(t.diff))} (Bù)</span>`;
            } else {
                diffBadge = `<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 font-mono border border-emerald-200">0 đ (Khớp)</span>`;
            }

            const podBadge = t.has_pod
                ? `<span class="text-emerald-700 font-bold flex items-center justify-center gap-0.5"><i class="ph-bold ph-check-circle text-xs"></i> Có E-POD</span>`
                : `<span class="text-amber-600 font-medium flex items-center justify-center gap-0.5"><i class="ph-bold ph-clock text-xs"></i> Chờ nộp</span>`;

            const settleStatusBadge = isSettled
                ? `<span class="px-2 py-0.5 rounded-md text-[10.5px] font-black bg-purple-100 text-purple-800 border border-purple-200">ĐÃ KHÓA SỔ</span>`
                : `<span class="px-2 py-0.5 rounded-md text-[10.5px] font-black bg-amber-100 text-amber-800 border border-amber-200">CHỜ QUYẾT TOÁN</span>`;

            html += `
                <tr class="hover:bg-teal-50/40 transition-colors settle-trip-row ${isSettled ? 'opacity-70 bg-slate-50/50' : ''}" data-group-index="${gIdx}">
                    <td class="text-center py-2.5 px-3">
                        <input type="checkbox" data-trip-id="${t.id}" data-advance="${t.advance_amount}" data-spent="${t.actual_spent}" data-settled="${isSettled ? '1' : '0'}" data-diff="${t.diff}" data-group="${gIdx}"
                            ${isChecked ? 'checked' : ''} onchange="onSettlementTripSelectionChange()"
                            class="page-settle-checkbox batch-trip-checkbox w-4 h-4 text-teal-600 rounded cursor-pointer">
                    </td>
                    <td class="py-2.5 px-3 font-semibold text-slate-900 font-mono whitespace-nowrap">
                        <div class="font-bold text-teal-900">${escapeHtml(formatCodeCompact(t.trip_code))}</div>
                    </td>
                    <td class="py-2.5 px-3 whitespace-nowrap text-xs font-semibold text-slate-700 text-center">
                        ${escapeHtml(t.loading_date || '-')}
                    </td>
                    <td class="py-2.5 px-3">
                        <div class="font-bold text-slate-800 truncate max-w-[200px]" title="${escapeHtml(t.customer_name)}">${escapeHtml(t.customer_name)}</div>
                        <div class="text-[11px] text-slate-500 truncate max-w-[200px]" title="${escapeHtml(t.route)}">${escapeHtml(t.route)}</div>
                    </td>
                    <td class="py-2.5 px-3">
                        <div class="font-bold text-slate-800">${escapeHtml(t.driver_name)}</div>
                        <div class="text-[11px] font-mono font-bold text-teal-800 bg-teal-50 px-1.5 py-0.2 rounded inline-block border border-teal-200">${escapeHtml(t.license_plate)}</div>
                    </td>
                    <td class="py-2.5 px-3 font-mono text-xs">
                        <div class="font-bold text-slate-800">${escapeHtml(t.container_number)}</div>
                        <div class="text-[11px] text-slate-500">${escapeHtml(t.seal_number)}</div>
                    </td>
                    <td class="py-2.5 px-3 text-right font-mono font-bold text-amber-800 tabular-nums">
                        ${formatMoneyVND(t.advance_amount)}
                    </td>
                    <td class="py-2.5 px-3 text-right font-mono font-bold text-teal-800 tabular-nums">
                        ${formatMoneyVND(t.actual_spent)}
                    </td>
                    <td class="py-2.5 px-3 text-center">
                        ${diffBadge}
                    </td>
                    <td class="py-2.5 px-3 text-center">
                        ${podBadge}
                    </td>
                    <td class="py-2.5 px-3 text-center">
                        ${settleStatusBadge}
                    </td>
                    <td class="py-2.5 px-3 text-center cell-actions">
                        <button type="button" onclick="viewTripDetail('${escapeHtml(t.trip_code)}')" class="px-2 py-0.5 rounded text-[11px] font-bold bg-white hover:bg-teal-700 hover:text-white text-teal-700 border border-teal-200 transition-colors shadow-2xs font-heading">
                            Chi tiết
                        </button>
                    </td>
                </tr>
            `;
        });
    });

    if (totalTripsInView === 0) {
        tbody.innerHTML = `<tr><td colspan="12" class="text-center py-12 text-slate-400 font-semibold"><i class="ph-bold ph-info text-3xl mb-2 block"></i> Không có chuyến xe nào khớp với bộ lọc trạng thái.</td></tr>`;
        if (badgeInfo) badgeInfo.innerHTML = 'Hiển thị: <strong>0</strong> chuyến';
        onSettlementTripSelectionChange();
        return;
    }

    tbody.innerHTML = html;
    if (badgeInfo) badgeInfo.innerHTML = `Hiển thị: <strong>${totalTripsInView}</strong> chuyến (${groups.length} nhóm)`;
    onSettlementTripSelectionChange();
}

function selectSettlementTrips(mode) {
    const checkboxes = document.querySelectorAll('.page-settle-checkbox');
    checkboxes.forEach(cb => {
        const row = cb.closest('tr');
        if (row && row.style.display === 'none') return; // Bỏ qua dòng bị ẩn bởi ô tìm kiếm

        const isSettled = cb.getAttribute('data-settled') === '1';
        const diff = parseInt(cb.getAttribute('data-diff') || '0', 10);

        if (mode === 'all') {
            cb.checked = true;
        } else if (mode === 'none') {
            cb.checked = false;
        } else if (mode === 'pending_only') {
            cb.checked = !isSettled;
        } else if (mode === 'balanced_only') {
            cb.checked = !isSettled && diff === 0;
        } else if (mode === 'diff_only') {
            cb.checked = !isSettled && diff !== 0;
        }
    });
    onSettlementTripSelectionChange();
}

function toggleGroupSettlementSelection(groupIdx) {
    const groupCheckboxes = document.querySelectorAll(`.page-settle-checkbox[data-group="${groupIdx}"]`);
    if (groupCheckboxes.length === 0) return;
    const anyUnchecked = Array.from(groupCheckboxes).some(cb => !cb.checked);
    groupCheckboxes.forEach(cb => {
        cb.checked = anyUnchecked;
    });
    onSettlementTripSelectionChange();
}

function toggleMasterSettlementCheckbox(masterCheckbox) {
    const checkboxes = document.querySelectorAll('.page-settle-checkbox');
    checkboxes.forEach(cb => {
        const row = cb.closest('tr');
        if (row && row.style.display === 'none') return;
        cb.checked = masterCheckbox.checked;
    });
    onSettlementTripSelectionChange();
}

function onSettlementTripSelectionChange() {
    const checkboxes = document.querySelectorAll('.page-settle-checkbox:checked');
    let selectedCount = 0;
    let totalAdvance = 0;
    let totalSpent = 0;

    checkboxes.forEach(cb => {
        selectedCount++;
        totalAdvance += parseInt(cb.getAttribute('data-advance') || '0', 10);
        totalSpent += parseInt(cb.getAttribute('data-spent') || '0', 10);
    });

    const netDiff = totalAdvance - totalSpent;

    // Cập nhật 4 thẻ KPI View Quyết toán
    const kpiCount = document.getElementById('page-settle-kpi-count');
    const kpiSub = document.getElementById('page-settle-kpi-sub');
    const kpiAdv = document.getElementById('page-settle-kpi-advance');
    const kpiSpent = document.getElementById('page-settle-kpi-spent');
    const kpiDiffCard = document.getElementById('page-settle-kpi-diff-card');
    const kpiDiffTitle = document.getElementById('page-settle-kpi-diff-title');
    const kpiDiffAmount = document.getElementById('page-settle-kpi-diff-amount');
    const kpiDiffDesc = document.getElementById('page-settle-kpi-diff-desc');
    const kpiDiffIcon = document.getElementById('page-settle-kpi-diff-icon');

    const footerCount = document.getElementById('page-settle-footer-count');
    const btnSubmitText = document.getElementById('btn-page-submit-settle-text');
    const masterCheckbox = document.getElementById('settle-master-checkbox');

    if (kpiCount) kpiCount.innerText = `${selectedCount} chuyến`;
    if (kpiSub) kpiSub.innerText = `Trên tổng số ${pageAllTripsList.length} chuyến trong kỳ`;
    if (kpiAdv) kpiAdv.innerText = formatMoneyVND(totalAdvance);
    if (kpiSpent) kpiSpent.innerText = formatMoneyVND(totalSpent);

    if (footerCount) footerCount.innerText = selectedCount;
    if (btnSubmitText) btnSubmitText.innerText = `XÁC NHẬN QUYẾT TOÁN GOM (${selectedCount} CHUYẾN)`;

    if (masterCheckbox) {
        const allVisible = document.querySelectorAll('.page-settle-checkbox');
        masterCheckbox.checked = allVisible.length > 0 && Array.from(allVisible).every(cb => cb.checked);
    }

    if (kpiDiffCard && kpiDiffAmount && kpiDiffDesc && kpiDiffTitle) {
        if (netDiff > 0) {
            kpiDiffCard.className = 'bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs border-l-4 border-l-blue-600';
            kpiDiffTitle.className = 'text-[12px] font-bold uppercase tracking-wider text-blue-800';
            kpiDiffTitle.innerText = 'TÀI XẾ HOÀN TIỀN THỪA';
            kpiDiffAmount.className = 'text-2xl sm:text-3xl font-black tabular-nums font-heading mt-1 text-blue-700';
            kpiDiffAmount.innerText = `+${formatMoneyVND(netDiff)}`;
            kpiDiffDesc.className = 'text-xs font-semibold mt-1 text-blue-700';
            kpiDiffDesc.innerText = 'Tài xế nộp hoàn lại vào Quỹ tiền';
            if (kpiDiffIcon) kpiDiffIcon.className = 'w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center text-sm';
        } else if (netDiff < 0) {
            kpiDiffCard.className = 'bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs border-l-4 border-l-rose-600';
            kpiDiffTitle.className = 'text-[12px] font-bold uppercase tracking-wider text-rose-800';
            kpiDiffTitle.innerText = 'CÔNG TY CHI TRẢ BÙ';
            kpiDiffAmount.className = 'text-2xl sm:text-3xl font-black tabular-nums font-heading mt-1 text-rose-700';
            kpiDiffAmount.innerText = `-${formatMoneyVND(Math.abs(netDiff))}`;
            kpiDiffDesc.className = 'text-xs font-semibold mt-1 text-rose-700';
            kpiDiffDesc.innerText = 'Công ty / ĐV chi bù tiền vượt ứng';
            if (kpiDiffIcon) kpiDiffIcon.className = 'w-7 h-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center text-sm';
        } else {
            kpiDiffCard.className = 'bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs border-l-4 border-l-emerald-600';
            kpiDiffTitle.className = 'text-[12px] font-bold uppercase tracking-wider text-emerald-800';
            kpiDiffTitle.innerText = 'CHÊNH LỆCH ĐỐI SOÁT';
            kpiDiffAmount.className = 'text-2xl sm:text-3xl font-black tabular-nums font-heading mt-1 text-emerald-700';
            kpiDiffAmount.innerText = '0 đ';
            kpiDiffDesc.className = 'text-xs font-semibold mt-1 text-emerald-700';
            kpiDiffDesc.innerText = 'Khớp đúng 100%';
            if (kpiDiffIcon) kpiDiffIcon.className = 'w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center text-sm';
        }
    }
}

async function executePageSettlementSubmit() {
    const checkboxes = document.querySelectorAll('.page-settle-checkbox:checked');
    const tripIds = [];
    checkboxes.forEach(cb => {
        const id = parseInt(cb.getAttribute('data-trip-id'), 10);
        if (id) tripIds.push(id);
    });

    if (tripIds.length === 0) {
        showToast('warning', 'Vui lòng tích chọn ít nhất một chuyến xe để quyết toán gom!', 'Chưa chọn chuyến');
        return;
    }

    const confirmed = await showConfirmModal({
        title: 'Khóa Sổ & Quyết Toán Gom Chuyến',
        message: `Xác nhận khóa sổ và quyết toán gom ${tripIds.length} chuyến xe đã chọn?\n\nHệ thống sẽ tự động cập nhật đối soát chi phí, chốt hoàn ứng và hạch toán Sổ Quỹ Thu - Chi.`,
        confirmText: `Quyết Toán (${tripIds.length} Chuyến)`,
        cancelText: 'Huỷ bỏ',
        type: 'success',
        icon: 'ph-bold ph-seal-check text-2xl'
    });
    if (!confirmed) return;

    const notes = document.getElementById('page-settle-notes')?.value || '';
    const paymentMethod = document.getElementById('page-settle-payment-method')?.value || 'BANK';
    const autoCashbook = document.getElementById('page-settle-auto-cashbook')?.checked !== false;

    const btn = document.getElementById('btn-page-submit-settle');
    const btnText = document.getElementById('btn-page-submit-settle-text');
    if (btn) btn.disabled = true;
    if (btnText) btnText.innerText = 'Đang xử lý quyết toán...';

    try {
        const res = await fetchWithAuth('/api/accounting/driver-settlements/batch-settle/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                trip_ids: tripIds,
                settlement_notes: notes,
                payment_method: paymentMethod,
                auto_create_cash_transaction: autoCashbook
            })
        });

        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message, 'Quyết Toán Gom Thành Công');
            loadSettlementData();
            if (typeof loadAccountingData === 'function') loadAccountingData();
            if (typeof loadAccountingAdvancesData === 'function') loadAccountingAdvancesData();

            // Tự động mở ngay Phiếu Thu / Phiếu Chi vừa tạo để xem và in ấn
            if (data.cash_transaction || data.cash_transaction_id || data.cash_transaction_code) {
                setTimeout(() => {
                    openCashVoucherModal(data.cash_transaction || data.cash_transaction_id || data.cash_transaction_code);
                }, 350);
            }
        } else {
            const errorMsg = data.error || data.detail || data.message || (typeof data === 'string' ? data : 'Không thể thực hiện quyết toán gom');
            showToast('danger', errorMsg, 'Lỗi Quyết Toán Gom');
        }
    } catch (err) {
        console.error(err);
        showToast('danger', err.message || 'Lỗi kết nối máy chủ', 'Lỗi Hệ Thống');
    } finally {
        if (btn) btn.disabled = false;
        onSettlementTripSelectionChange();
    }
}

function exportSettlementToExcel() {
    const table = document.getElementById('settlement-trips-table');
    if (!table) {
        showToast('warning', 'Không tìm thấy bảng quyết toán');
        return;
    }

    const rows = table.querySelectorAll('tr');
    let csvContent = '\uFEFF';

    rows.forEach(row => {
        // Bỏ qua dòng checkbox header master hoặc checkbox cells
        const cols = row.querySelectorAll('th, td');
        const rowData = [];
        cols.forEach((col, idx) => {
            if (idx === 0 || idx === cols.length - 1) return; // Bỏ cột checkbox và chi tiết
            let text = col.innerText.replace(/"/g, '""').trim();
            text = text.replace(/[\n\r]+/g, ' ');
            rowData.push(`"${text}"`);
        });
        if (rowData.length > 0) {
            csvContent += rowData.join(',') + '\r\n';
        }
    });

    const filename = `BIM_Quyet_Toan_Gom_Chuyen_${new Date().toISOString().slice(0, 10)}.csv`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('success', `Đã xuất bảng kê quyết toán "${filename}" thành công!`, 'Xuất Excel Thành Công');
}

// -------------------------------------------------------------
// MODAL TẠO QUỸ TẠM ỨNG ĐIỀU VẬN (COMPANY ➔ DISPATCHER)
// -------------------------------------------------------------
function openDispatcherFundModal() {
    const modal = document.getElementById('modal-dispatcher-fund');
    if (!modal) return;
    modal.classList.remove('hidden');

    const dateInp = document.getElementById('fund-inp-date');
    if (dateInp) dateInp.value = new Date().toISOString().slice(0, 10);

    const amountInp = document.getElementById('fund-inp-amount');
    if (amountInp) amountInp.value = '20.000.000';
}

function closeDispatcherFundModal() {
    const modal = document.getElementById('modal-dispatcher-fund');
    if (modal) modal.classList.add('hidden');
}

async function submitDispatcherFundForm(e) {
    e.preventDefault();
    const dispatcherId = document.getElementById('fund-inp-dispatcher')?.value;
    const amountStr = document.getElementById('fund-inp-amount')?.value;
    const advanceDate = document.getElementById('fund-inp-date')?.value;
    const purpose = document.getElementById('fund-inp-purpose')?.value;
    const notes = document.getElementById('fund-inp-notes')?.value;

    try {
        const res = await fetchWithAuth('/api/accounting/dispatcher-funds/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                dispatcher_id: dispatcherId,
                amount: amountStr,
                advance_date: advanceDate,
                purpose: purpose,
                notes: notes
            })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message, 'Tạo Quỹ Điều Vận Thành Công');
            closeDispatcherFundModal();
            loadAccountingAdvancesData();
        } else {
            showToast('danger', data.error || 'Không thể tạo phiếu tạm ứng quỹ');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

async function approveDispatcherFund(fundId) {
    const confirmed = await showConfirmModal({
        title: 'Duyệt Xuất Quỹ Điều Vận',
        message: 'Xác nhận Kế toán / Ban Giám Đốc DUYỆT XUẤT QUỸ tạm ứng này cho bộ phận Điều vận?\n\nHệ thống sẽ chuyển trạng thái Quỹ sang ĐÃ DUYỆT (APPROVED).',
        confirmText: 'Duyệt Xuất Quỹ',
        cancelText: 'Huỷ bỏ',
        type: 'success',
        icon: 'ph-bold ph-seal-check text-2xl'
    });
    if (!confirmed) return;
    try {
        const res = await fetchWithAuth(`/api/accounting/dispatcher-funds/${fundId}/action/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'approve' })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message, 'Duyệt Quỹ Thành Công');
            loadAccountingAdvancesData();
        } else {
            showToast('danger', data.error || 'Có lỗi xảy ra');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

async function settleDispatcherFund(fundId) {
    const notes = prompt('Nhập ghi chú quyết toán quỹ điều vận về công ty (vd: Kế toán đã thu đủ chứng từ & số dư hoàn quỹ):');
    if (notes === null) return;

    try {
        const res = await fetchWithAuth(`/api/accounting/dispatcher-funds/${fundId}/action/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'settle', notes: notes })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message, 'Quyết Toán Quỹ Thành Công');
            loadAccountingAdvancesData();
        } else {
            showToast('danger', data.error || 'Có lỗi xảy ra');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

// -------------------------------------------------------------
// XUẤT BÁO CÁO EXCEL KẾ TOÁN & TẠM ỨNG
// -------------------------------------------------------------
function exportAccountingToExcel() {
    const activeSubtab = document.querySelector('.acct-subtab-content:not(.hidden)');
    if (!activeSubtab) {
        showToast('warning', 'Không tìm thấy bảng dữ liệu kế toán đang mở');
        return;
    }

    const table = activeSubtab.querySelector('table');
    if (!table) {
        showToast('warning', 'Bảng dữ liệu kế toán trống');
        return;
    }

    const rows = table.querySelectorAll('tr');
    let csvContent = '\uFEFF';

    rows.forEach(row => {
        const cols = row.querySelectorAll('th, td');
        const rowData = [];
        cols.forEach(col => {
            let text = col.innerText.replace(/"/g, '""').trim();
            text = text.replace(/[\n\r]+/g, ' ');
            rowData.push(`"${text}"`);
        });
        if (rowData.length > 0) {
            csvContent += rowData.join(',') + '\r\n';
        }
    });

    const subtabId = activeSubtab.id.replace('subtab-', '');
    const filename = `BIM_Logistics_KeToan_${subtabId}_${new Date().toISOString().slice(0, 10)}.csv`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('success', `Đã xuất dữ liệu "${filename}" thành công!`, 'Xuất Excel Thành Công');
}


// ==============================================================================
// 9.4. SUBTAB 4: ĐỐI SOÁT & THU HỒI CHI HỘ KHÁCH HÀNG (DEBIT NOTE CONTROLLER)
// ==============================================================================
let rawReimbursablesList = [];
let selectedReimbursableIds = new Set();

async function loadReimbursablesData() {
    try {
        const statusFilter = document.getElementById('reimburse-filter-status')?.value || 'ALL';
        const customerId = document.getElementById('reimburse-filter-customer')?.value || '';
        const search = document.getElementById('reimburse-search')?.value || '';

        const globalDates = getDateRangeForPeriod(currentDashboardPeriod, currentDashboardCustomStart, currentDashboardCustomEnd);
        let url = `/api/accounting/reimbursables/?reimbursement_status=${statusFilter}&from_date=${globalDates.fromDate}&to_date=${globalDates.toDate}`;
        if (customerId) url += `&customer_id=${customerId}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;

        const res = await fetchWithAuth(url);
        if (!res.ok) throw new Error('Không thể tải dữ liệu chi hộ');
        const data = await res.json();

        rawReimbursablesList = data.items || [];

        // Cập nhật KPIs
        if (data.kpis) {
            const kp = data.kpis;
            const elTotal = document.getElementById('reimburse-stat-total');
            if (elTotal) elTotal.innerText = formatMoneyVND(kp.total_amount);

            const elCollected = document.getElementById('reimburse-stat-collected');
            if (elCollected) elCollected.innerText = formatMoneyVND(kp.collected_amount);

            const elPending = document.getElementById('reimburse-stat-pending');
            if (elPending) elPending.innerText = formatMoneyVND(kp.pending_amount);

            const elBilled = document.getElementById('reimburse-stat-billed');
            if (elBilled) elBilled.innerText = formatMoneyVND(kp.billed_amount);

            const elCount = document.getElementById('reimburse-stat-count');
            if (elCount) elCount.innerText = `${kp.total_items_count} khoản chi hộ`;

            const elPCount = document.getElementById('reimburse-stat-pending-count');
            if (elPCount) elPCount.innerText = `${kp.pending_items_count} khoản chờ thu`;

            const badge = document.getElementById('badge-acct-reimbursables');
            if (badge) badge.innerText = kp.pending_items_count;
        }

        // Cập nhật dropdown Khách hàng (nếu chưa có hoặc lần đầu)
        const custSelect = document.getElementById('reimburse-filter-customer');
        if (custSelect && data.by_customer && custSelect.options.length <= 1) {
            data.by_customer.forEach(c => {
                if (c.customer_id) {
                    const opt = document.createElement('option');
                    opt.value = c.customer_id;
                    opt.textContent = `${c.customer_name} (${formatMoneyVND(c.pending_amount)} chờ thu)`;
                    custSelect.appendChild(opt);
                }
            });
        }

        renderReimbursablesTable(rawReimbursablesList);
    } catch (err) {
        console.error('Lỗi tải bảng kê chi hộ:', err);
        showToast('danger', 'Không thể kết nối máy chủ để tải bảng kê chi hộ', 'Lỗi Chi Hộ');
    }
}

function renderReimbursablesTable(list) {
    const tbody = document.getElementById('acct-reimburse-tbody');
    if (!tbody) return;

    if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" class="p-8 text-center text-slate-400 font-medium">Không tìm thấy khoản chi hộ nào phù hợp</td></tr>`;
        updateSelectedReimbursablesUI();
        return;
    }

    tbody.innerHTML = list.map(item => {
        const isChecked = selectedReimbursableIds.has(item.id) ? 'checked' : '';
        const isCollected = item.reimbursement_status === 'COLLECTED';
        const isBilled = item.reimbursement_status === 'BILLED';

        let statusBadge = `<span class="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-200">Chờ Thu</span>`;
        if (isBilled) {
            statusBadge = `<span class="px-2 py-0.5 rounded-full text-[11px] font-black bg-indigo-100 text-indigo-800 border border-indigo-200">Đã Lập Debit Note</span>`;
        } else if (isCollected) {
            statusBadge = `<span class="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">Đã Thu Hồi</span>`;
        }

        let invoiceInfo = '<span class="text-slate-400">Không có HĐ</span>';
        if (item.invoice_number) {
            invoiceInfo = `<div class="font-bold text-slate-800">Số: ${escapeHtml(item.invoice_number)}</div>`;
            if (item.invoice_lookup_code) {
                invoiceInfo += `<div class="text-[10px] text-teal-700 font-mono">Tra cứu: ${escapeHtml(item.invoice_lookup_code)}</div>`;
            }
        }

        let dnBadge = item.debit_note_number 
            ? `<span class="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">${escapeHtml(item.debit_note_number)}</span>`
            : '<span class="text-slate-400 text-xs">-</span>';

        return `
            <tr class="hover:bg-teal-50/30 transition-colors">
                <td class="text-center">
                    <input type="checkbox" value="${item.id}" ${isChecked} onchange="toggleReimbursableCheck(${item.id}, this)" class="rounded text-teal-600 focus:ring-teal-500">
                </td>
                <td class="whitespace-nowrap">
                    <div class="font-bold text-teal-800 font-mono text-xs">${escapeHtml(formatCodeCompact(item.trip_code))}</div>
                </td>
                <td class="whitespace-nowrap text-center text-[11px] text-slate-600 font-medium">
                    ${escapeHtml(item.created_at || '-')}
                </td>
                <td>
                    <div class="font-bold text-slate-800 max-w-[180px] truncate" title="${escapeHtml(item.customer_name)}">${escapeHtml(item.customer_name)}</div>
                    <div class="text-[11px] text-slate-500">TX: ${escapeHtml(item.driver_name)} (${escapeHtml(item.vehicle_plate)})</div>
                </td>
                <td>
                    <div class="font-mono font-bold text-slate-700">${escapeHtml(item.container_number || '-')}</div>
                    <div class="text-[11px] text-slate-400">BK: ${escapeHtml(item.booking_or_bill || '-')}</div>
                </td>
                <td>
                    <span class="px-2 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        ${escapeHtml(item.expense_item_name)}
                    </span>
                    ${item.notes ? `<div class="text-[10px] text-slate-400 italic mt-0.5">${escapeHtml(item.notes)}</div>` : ''}
                </td>
                <td class="text-right font-black text-slate-900 tabular-nums text-sm font-heading">
                    ${formatMoneyVND(item.amount)}
                </td>
                <td>${invoiceInfo}</td>
                <td>${dnBadge}</td>
                <td class="text-center">${statusBadge}</td>
                <td class="text-xs text-slate-500 font-medium">
                    ${item.reimbursed_at ? `<div class="text-emerald-700 font-bold">${item.reimbursed_at}</div><div class="text-[10px] text-slate-400">${escapeHtml(item.reimbursed_by_name)}</div>` : '-'}
                </td>
                <td class="text-center">
                    <div class="flex items-center justify-center gap-1.5">
                        ${!isCollected ? `
                            <button type="button" onclick="settleSingleReimbursement(${item.id})" class="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-colors" title="Xác nhận khách đã hoàn trả tiền">
                                <i class="ph-bold ph-check text-xs"></i> Thu Tiền
                            </button>
                        ` : `
                            <span class="text-xs text-emerald-600 font-bold flex items-center gap-1"><i class="ph-bold ph-check-circle"></i> Đã Thu</span>
                        `}
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    updateSelectedReimbursablesUI();
}

function toggleReimbursableCheck(id, checkbox) {
    if (checkbox.checked) {
        selectedReimbursableIds.add(id);
    } else {
        selectedReimbursableIds.delete(id);
    }
    updateSelectedReimbursablesUI();
}

function toggleCheckAllReimbursables(masterCheckbox) {
    const isChecked = masterCheckbox.checked;
    rawReimbursablesList.forEach(item => {
        if (isChecked) {
            selectedReimbursableIds.add(item.id);
        } else {
            selectedReimbursableIds.delete(item.id);
        }
    });
    renderReimbursablesTable(rawReimbursablesList);
}

function selectAllReimbursables(state) {
    const master = document.getElementById('reimburse-check-all');
    if (master) master.checked = state;
    toggleCheckAllReimbursables({ checked: state });
}

function updateSelectedReimbursablesUI() {
    const count = selectedReimbursableIds.size;
    const badge = document.getElementById('reimburse-selected-badge');
    if (badge) badge.innerText = count;

    const master = document.getElementById('reimburse-check-all');
    if (master) {
        master.checked = count > 0 && count === rawReimbursablesList.length;
    }
}

function openCreateDebitNoteModal() {
    if (selectedReimbursableIds.size === 0) {
        showToast('warning', 'Vui lòng tích chọn ít nhất 1 khoản chi hộ để gom nhóm lập Debit Note!');
        return;
    }

    const modal = document.getElementById('modal-debit-note');
    if (!modal) return;

    document.getElementById('dn-action-type').value = 'create_debit_note';
    document.getElementById('dn-expense-ids').value = Array.from(selectedReimbursableIds).join(',');

    // Tính tổng tiền
    let totalAmt = 0;
    const custNames = new Set();
    rawReimbursablesList.forEach(item => {
        if (selectedReimbursableIds.has(item.id)) {
            totalAmt += item.amount;
            if (item.customer_name) custNames.add(item.customer_name);
        }
    });

    document.getElementById('dn-selected-count').innerText = `${selectedReimbursableIds.size} khoản chi hộ`;
    document.getElementById('dn-selected-amount').innerText = formatMoneyVND(totalAmt);
    document.getElementById('dn-selected-customer').innerText = `Khách hàng: ${Array.from(custNames).join(', ') || 'Nhiều khách hàng'}`;

    // Auto generate DN code
    const now = new Date();
    const dStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const tStr = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
    document.getElementById('dn-number').value = `DN-${dStr}-${tStr}`;

    // UI state for create
    document.getElementById('debit-modal-title').innerText = 'Gom Nhóm & Lập Debit Note Chi Hộ';
    document.getElementById('dn-code-container').classList.remove('hidden');
    document.getElementById('dn-settle-fields').classList.add('hidden');
    document.getElementById('btn-submit-debit-note-label').innerText = 'Xác Nhận Lập Debit Note';

    modal.classList.remove('hidden');
}

function openSettleDebitNoteModal() {
    if (selectedReimbursableIds.size === 0) {
        showToast('warning', 'Vui lòng tích chọn các khoản chi hộ muốn xác nhận khách hàng đã hoàn tiền!');
        return;
    }

    const modal = document.getElementById('modal-debit-note');
    if (!modal) return;

    document.getElementById('dn-action-type').value = 'settle_reimbursement';
    document.getElementById('dn-expense-ids').value = Array.from(selectedReimbursableIds).join(',');

    let totalAmt = 0;
    const custNames = new Set();
    rawReimbursablesList.forEach(item => {
        if (selectedReimbursableIds.has(item.id)) {
            totalAmt += item.amount;
            if (item.customer_name) custNames.add(item.customer_name);
        }
    });

    document.getElementById('dn-selected-count').innerText = `${selectedReimbursableIds.size} khoản chi hộ`;
    document.getElementById('dn-selected-amount').innerText = formatMoneyVND(totalAmt);
    document.getElementById('dn-selected-customer').innerText = `Khách hàng hoàn tiền: ${Array.from(custNames).join(', ')}`;

    // UI state for settle
    document.getElementById('debit-modal-title').innerText = 'Xác Nhận Thu Hồi Chi Hộ (1-Chạm)';
    document.getElementById('dn-code-container').classList.add('hidden');
    document.getElementById('dn-settle-fields').classList.remove('hidden');
    document.getElementById('btn-submit-debit-note-label').innerText = 'Xác Nhận Đã Thu Tiền & Ghi Sổ Quỹ';

    modal.classList.remove('hidden');
}

function closeDebitNoteModal() {
    const modal = document.getElementById('modal-debit-note');
    if (modal) modal.classList.add('hidden');
}

async function handleSaveDebitNote(e) {
    e.preventDefault();
    const actionType = document.getElementById('dn-action-type').value;
    const expIdsStr = document.getElementById('dn-expense-ids').value;
    const expenseIds = expIdsStr ? expIdsStr.split(',').map(Number) : [];
    const dnNumber = document.getElementById('dn-number')?.value || '';
    const paymentMethod = document.getElementById('dn-payment-method')?.value || 'BANK';
    const bankName = document.getElementById('dn-bank-name')?.value || '';
    const notes = document.getElementById('dn-notes')?.value || '';

    try {
        let payload = { action: actionType, expense_ids: expenseIds, notes: notes };
        if (actionType === 'create_debit_note') {
            payload.debit_note_number = dnNumber;
        } else if (actionType === 'settle_reimbursement') {
            payload.payment_method = paymentMethod;
            payload.bank_name = bankName;
        }

        const res = await fetchWithAuth('/api/accounting/reimbursables/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (res.ok && data.success) {
            showToast('success', data.message, 'Thành Công');
            closeDebitNoteModal();
            selectedReimbursableIds.clear();
            loadReimbursablesData();
        } else {
            showToast('danger', data.error || 'Thao tác không thành công');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

async function settleSingleReimbursement(expenseId) {
    const confirmed = await showConfirmModal({
        title: 'Thu Hồi Chi Hộ',
        message: 'Xác nhận Khách hàng đã hoàn tiền cho khoản chi hộ này?\n\nHệ thống sẽ tự động hạch toán Phiếu Thu vào Sổ Quỹ.',
        confirmText: 'Thu Hồi Tiền',
        cancelText: 'Huỷ bỏ',
        type: 'success',
        icon: 'ph-bold ph-hand-coins text-2xl'
    });
    if (!confirmed) return;
    try {
        const res = await fetchWithAuth('/api/accounting/reimbursables/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'settle_reimbursement',
                expense_ids: [expenseId],
                payment_method: 'BANK',
                notes: 'Thu hoàn ứng chi hộ trực tiếp'
            })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message, 'Đã Thu Tiền Hoàn Ứng');
            loadReimbursablesData();
        } else {
            showToast('danger', data.error || 'Có lỗi xảy ra');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

function exportReimbursablesToExcel() {
    exportAccountingToExcel();
}


// ==============================================================================
// 9.5. SUBTAB 5: SỔ QUỸ THU - CHI & DÒNG TIỀN VẬN TẢI (CASH & BANK BOOK)
// ==============================================================================
let rawCashTransactionsList = [];

async function loadCashBookData() {
    try {
        const method = document.getElementById('cash-filter-method')?.value || 'ALL';
        const type = document.getElementById('cash-filter-type')?.value || 'ALL';
        const category = document.getElementById('cash-filter-category')?.value || 'ALL';
        const search = document.getElementById('cash-search')?.value || '';

        const globalDates = getDateRangeForPeriod(currentDashboardPeriod, currentDashboardCustomStart, currentDashboardCustomEnd);
        let url = `/api/accounting/cashbook/?payment_method=${method}&transaction_type=${type}&category=${category}&from_date=${globalDates.fromDate}&to_date=${globalDates.toDate}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;

        const res = await fetchWithAuth(url);
        if (!res.ok) throw new Error('Không thể tải Sổ Quỹ');
        const data = await res.json();

        rawCashTransactionsList = data.transactions || [];

        // Cập nhật KPIs với số liệu thực tế từ hệ thống
        const kp = data.kpis || {};
        const elCash = document.getElementById('cash-stat-cash-balance');
        if (elCash) elCash.innerText = formatMoneyVND(kp.cash_balance || 0);

        const elBank = document.getElementById('cash-stat-bank-balance');
        if (elBank) elBank.innerText = formatMoneyVND(kp.bank_balance || 0);

        const elTotal = document.getElementById('cash-stat-total-balance');
        if (elTotal) elTotal.innerText = formatMoneyVND(kp.total_balance || 0);

        const elNet = document.getElementById('cash-stat-period-net');
        if (elNet) {
            const net = kp.period_net || 0;
            elNet.innerText = (net >= 0 ? '+' : '') + formatMoneyVND(net);
            elNet.className = `text-3xl font-black tabular-nums font-heading tracking-tight mt-1 ${net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`;
        }

        const elInOut = document.getElementById('cash-stat-in-out-summary');
        if (elInOut) {
            elInOut.innerText = `Thu: +${formatMoneyVND(kp.period_inflow || 0)} | Chi: -${formatMoneyVND(kp.period_outflow || 0)}`;
        }

        renderCashBookTable(rawCashTransactionsList);
    } catch (err) {
        console.error('Lỗi tải Sổ Quỹ:', err);
    }
}

function renderCashBookTable(list) {
    const tbody = document.getElementById('acct-cash-tbody');
    if (!tbody) return;

    if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" class="p-8 text-center text-slate-400 font-medium">Không tìm thấy giao dịch thu chi nào phù hợp</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(item => {
        const isInflow = item.transaction_type === 'INFLOW';
        const typeBadge = isInflow
            ? `<span class="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">➕ Thu Tiền</span>`
            : `<span class="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-200">➖ Chi Tiền</span>`;

        const methodBadge = item.payment_method === 'BANK'
            ? `<span class="px-2 py-0.5 rounded-lg text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200"><i class="ph-bold ph-bank"></i> Ngân Hàng</span>`
            : `<span class="px-2 py-0.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200"><i class="ph-bold ph-money"></i> Tiền Mặt</span>`;

        const amountClass = isInflow ? 'text-emerald-700' : 'text-rose-700';
        const sign = isInflow ? '+' : '-';

        return `
            <tr class="hover:bg-slate-50/80 transition-colors">
                <td>
                    <div class="font-bold text-slate-800 font-mono text-xs">${escapeHtml(item.code)}</div>
                </td>
                <td class="text-xs text-slate-600 font-medium">${item.transaction_date}</td>
                <td class="text-center">${typeBadge}</td>
                <td>${methodBadge}</td>
                <td>
                    <span class="font-bold text-slate-800 text-xs">${escapeHtml(item.category_label)}</span>
                </td>
                <td>
                    <div class="font-bold text-slate-800">${escapeHtml(item.partner_name || '-')}</div>
                    ${item.partner_type_label ? `<div class="text-[10px] text-slate-400">${escapeHtml(item.partner_type_label)}</div>` : ''}
                </td>
                <td>
                    ${item.ref_code ? `<span class="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-bold">${escapeHtml(item.ref_code)}</span>` : '<span class="text-slate-400">-</span>'}
                </td>
                <td class="text-right font-black tabular-nums text-sm font-heading ${amountClass}">
                    ${sign}${formatMoneyVND(item.amount)}
                </td>
                <td class="text-xs text-slate-500">${escapeHtml(item.created_by || '-')}</td>
                <td class="text-xs text-slate-600 max-w-[220px] truncate" title="${escapeHtml(item.notes || '')}">
                    ${escapeHtml(item.notes || '-')}
                </td>
                <td class="text-center">
                    <button type="button" onclick="viewCashVoucherDetail('${escapeHtml(item.id || item.code)}')" 
                        class="px-2.5 py-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 rounded-lg text-xs font-bold shadow-2xs transition-colors inline-flex items-center gap-1 cursor-pointer"
                        title="Xem chi tiết, Sửa, Lưu & In phiếu Thu/Chi">
                        <i class="ph-bold ph-eye text-emerald-700"></i>
                        <span>Xem / In</span>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// --- CHUYỂN ĐỔI SỐ TIỀN THÀNH CHỮ TIẾNG VIỆT CHUẨN KẾ TOÁN ---
function numberToWordsVN(n) {
    if (n === null || n === undefined || isNaN(n)) return '';
    let num = Math.abs(Math.round(Number(n)));
    if (num === 0) return 'Không đồng.';

    const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
    const scaleUnits = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

    function readGroup(group, showZeroHundred) {
        let h = Math.floor(group / 100);
        let t = Math.floor((group % 100) / 10);
        let u = group % 10;
        let res = '';

        if (h > 0 || showZeroHundred) {
            res += digits[h] + ' trăm ';
            if (t === 0 && u > 0) res += 'lẻ ';
        }

        if (t > 1) {
            res += digits[t] + ' mươi ';
            if (u === 1) res += 'mốt ';
            else if (u === 5) res += 'lăm ';
            else if (u > 0) res += digits[u] + ' ';
        } else if (t === 1) {
            res += 'mười ';
            if (u === 5) res += 'lăm ';
            else if (u > 0) res += digits[u] + ' ';
        } else if (u > 0 && !res.includes('lẻ')) {
            res += digits[u] + ' ';
        } else if (u > 0) {
            res += digits[u] + ' ';
        }

        return res.trim();
    }

    let groups = [];
    while (num > 0) {
        groups.push(num % 1000);
        num = Math.floor(num / 1000);
    }

    let words = '';
    for (let i = groups.length - 1; i >= 0; i--) {
        let g = groups[i];
        if (g > 0) {
            let showZeroHundred = (i < groups.length - 1) && (groups.length > 1);
            let gText = readGroup(g, showZeroHundred);
            let unit = scaleUnits[i] ? ' ' + scaleUnits[i] : '';
            words += (words ? ' ' : '') + gText + unit;
        }
    }

    words = words.trim();
    if (!words) return 'Không đồng.';
    words = words.charAt(0).toUpperCase() + words.slice(1) + ' đồng chẵn.';
    return words;
}

// --- QUẢN LÝ MODAL XEM CHI TIẾT & IN PHIẾU THU / CHI (MẪU 01-TT / 02-TT BTC) ---
let currentVoucherPrintMode = 'dual';

function setDynamicPrintPageStyle(cssText) {
    let styleEl = document.getElementById('dynamic-print-page-style');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'dynamic-print-page-style';
        document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = `@media print { ${cssText} }`;
}

function setVoucherPrintMode(mode = 'dual') {
    currentVoucherPrintMode = mode;
    const printArea = document.getElementById('cash-voucher-printable-area');
    const btnDual = document.getElementById('btn-voucher-mode-dual');
    const btnSingle = document.getElementById('btn-voucher-mode-single');

    if (printArea) {
        if (mode === 'dual') {
            printArea.classList.add('voucher-mode-dual');
            printArea.classList.remove('voucher-mode-single');
        } else {
            printArea.classList.add('voucher-mode-single');
            printArea.classList.remove('voucher-mode-dual');
        }
    }

    if (btnDual && btnSingle) {
        if (mode === 'dual') {
            btnDual.className = 'px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 bg-teal-600 text-white shadow-xs cursor-pointer';
            btnSingle.className = 'px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 text-slate-300 hover:text-white cursor-pointer';
        } else {
            btnSingle.className = 'px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 bg-teal-600 text-white shadow-xs cursor-pointer';
            btnDual.className = 'px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 text-slate-300 hover:text-white cursor-pointer';
        }
    }

    // Thiết lập khổ in chuẩn A4 dọc
    setDynamicPrintPageStyle(mode === 'dual' ? '@page { size: A4 portrait; margin: 8mm 10mm; }' : '@page { size: A4 portrait; margin: 15mm 18mm; }');
}

async function openCashVoucherModal(txDataOrId) {
    let tx = null;
    if (typeof txDataOrId === 'object' && txDataOrId !== null) {
        tx = txDataOrId;
    } else {
        try {
            const res = await fetchWithAuth(`/api/accounting/cashbook/${txDataOrId}/`);
            if (!res.ok) throw new Error('Không tìm thấy chứng từ');
            const data = await res.json();
            tx = data.transaction;
        } catch (err) {
            console.error('Lỗi tải chứng từ:', err);
            showToast('danger', 'Không thể tải chi tiết chứng từ để in', 'Lỗi In Phiếu');
            return;
        }
    }

    if (!tx) return;

    const modal = document.getElementById('modal-cash-voucher-print');
    if (!modal) return;

    const isInflow = tx.transaction_type === 'INFLOW';
    const titleText = isInflow ? 'PHIẾU THU' : 'PHIẾU CHI';
    const topTitleText = isInflow ? 'Phiếu Thu Sổ Quỹ (Mẫu 01-TT BTC)' : 'Phiếu Chi Sổ Quỹ (Mẫu 02-TT BTC)';
    const templateNoText = isInflow ? 'Mẫu số 01 - TT' : 'Mẫu số 02 - TT';
    const debitAcc = isInflow ? (tx.payment_method === 'BANK' ? '1121' : '1111') : '1411 / 331 / 642';
    const creditAcc = isInflow ? '1411 / 131 / 711' : (tx.payment_method === 'BANK' ? '1121' : '1111');
    const partnerLabel = isInflow ? 'Họ tên người nộp tiền:' : 'Họ tên người nhận tiền:';
    const signPartnerRole = isInflow ? 'Người Nộp Tiền' : 'Người Nhận Tiền';
    const reasonLabel = isInflow ? 'Lý do nộp:' : 'Lý do chi:';

    // Parse date parts
    let day = tx.day || '', month = tx.month || '', year = tx.year || '';
    if (!day && tx.transaction_date) {
        const parts = tx.transaction_date.split('/');
        if (parts.length === 3) {
            day = parts[0]; month = parts[1]; year = parts[2];
        }
    }
    if (!day) {
        const now = new Date();
        day = String(now.getDate()).padStart(2, '0');
        month = String(now.getMonth() + 1).padStart(2, '0');
        year = String(now.getFullYear());
    }

    const dateFormattedText = `Ngày ${day} tháng ${month} năm ${year}`;
    const signDateFormattedText = `Ngày ${day}/${month}/${year}`;
    const amountWords = numberToWordsVN(tx.amount);
    const amountFormatted = new Intl.NumberFormat('vi-VN').format(Math.round(tx.amount || 0)) + ' đ';
    const methodFormatted = tx.payment_method === 'BANK' ? 'Chuyển khoản Ngân hàng' : 'Quỹ Tiền mặt';
    const departmentFormatted = tx.partner_type_label ? `${tx.partner_type_label} - Triền Võ Logistics` : 'Đội xe vận tải Triền Võ Logistics';
    const reasonFormatted = tx.notes || tx.category_label || (isInflow ? 'Thu hoàn ứng tiền thừa quyết toán gom chuyến' : 'Chi bù vượt ứng quyết toán gom chuyến');
    const attachmentsFormatted = tx.ref_code ? `01 Bảng kê [${tx.ref_code}] & chứng từ gốc` : '01 Bảng kê quyết toán chuyến & chứng từ gốc';

    // Helper cập nhật tất cả selector cùng class (đồng bộ Liên 1 & Liên 2)
    const setAllClassText = (cls, val) => {
        document.querySelectorAll(`#cash-voucher-printable-area .${cls}`).forEach(el => {
            el.innerText = val;
        });
    };

    const topTitleEl = document.getElementById('voucher-modal-top-title');
    if (topTitleEl) topTitleEl.innerText = topTitleText;

    const footerCodeEl = document.getElementById('print-v-footer-code');
    if (footerCodeEl) footerCodeEl.innerText = tx.code || '-';

    const copy2Badge = document.getElementById('voucher-copy-2-badge');
    if (copy2Badge) {
        copy2Badge.innerText = isInflow ? 'Liên 2: Giao cho người nộp tiền' : 'Liên 2: Giao cho người nhận tiền';
    }

    // Đồng bộ Liên 1 & Liên 2
    setAllClassText('v-template-no', templateNoText);
    setAllClassText('v-code', tx.code || '-');
    setAllClassText('v-debit-acc', debitAcc);
    setAllClassText('v-credit-acc', creditAcc);
    setAllClassText('v-title', titleText);
    setAllClassText('v-date', dateFormattedText);
    setAllClassText('v-sign-date', signDateFormattedText);
    setAllClassText('v-partner-label', partnerLabel);
    setAllClassText('v-sign-partner-role', signPartnerRole);
    setAllClassText('v-partner-name', tx.partner_name || 'Tài xế / Đối tác');
    setAllClassText('v-department', departmentFormatted);
    setAllClassText('v-reason-label', reasonLabel);
    setAllClassText('v-reason', reasonFormatted);
    setAllClassText('v-amount', amountFormatted);
    setAllClassText('v-method', methodFormatted);
    setAllClassText('v-amount-words', amountWords);
    setAllClassText('v-received-words', amountWords);
    setAllClassText('v-creator-name', tx.created_by || 'Kế toán viên');
    setAllClassText('v-attachments', attachmentsFormatted);

    // Đồng bộ thông tin công ty hệ thống lên phiếu thu chi
    syncCompanyProfileToPrintForms();

    // Mặc định chế độ 2 Liên / A4
    setVoucherPrintMode('dual');

    modal.classList.remove('hidden');
}

function closeCashVoucherModal() {
    const modal = document.getElementById('modal-cash-voucher-print');
    if (modal) modal.classList.add('hidden');
}

function printCashVoucher() {
    document.body.classList.add('is-printing-voucher');
    document.body.classList.remove('is-printing-quotation', 'is-printing-report');
    window.print();
}

window.openCashVoucherModal = openCashVoucherModal;
window.closeCashVoucherModal = closeCashVoucherModal;
window.printCashVoucher = printCashVoucher;
window.setVoucherPrintMode = setVoucherPrintMode;
window.setDynamicPrintPageStyle = setDynamicPrintPageStyle;
window.numberToWordsVN = numberToWordsVN;

// ==============================================================================
// 9.5b. PHÂN HỆ XEM, SỬA, LƯU & IN PHIẾU THU / CHI TOÀN MÀN HÌNH (DEDICATED FULL-PAGE VIEW)
// URL Chuẩn: /accounting/vouchers/<id_or_code>
// ==============================================================================
let currentActiveFullpageVoucher = null;
let currentFullpageVoucherPrintMode = 'dual';

function setFullpageVoucherSaveButtonState(isEnabled) {
    const btn = document.getElementById('btn-fullpage-save-voucher');
    if (!btn) return;
    if (isEnabled) {
        btn.disabled = false;
        btn.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
        btn.classList.add('bg-teal-700', 'hover:bg-teal-800', 'cursor-pointer');
    } else {
        btn.disabled = true;
        btn.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
        btn.classList.remove('hover:bg-teal-800', 'cursor-pointer');
    }
}

function setFullpageVoucherPrintMode(mode = 'dual') {
    currentFullpageVoucherPrintMode = mode;
    const printArea = document.getElementById('fullpage-cash-voucher-printable-area');
    const btnDual = document.getElementById('btn-fullpage-voucher-mode-dual');
    const btnSingle = document.getElementById('btn-fullpage-voucher-mode-single');

    if (printArea) {
        if (mode === 'dual') {
            printArea.classList.add('voucher-mode-dual');
            printArea.classList.remove('voucher-mode-single');
        } else {
            printArea.classList.add('voucher-mode-single');
            printArea.classList.remove('voucher-mode-dual');
        }
    }

    if (btnDual && btnSingle) {
        if (mode === 'dual') {
            btnDual.className = 'px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 bg-emerald-700 text-white shadow-xs cursor-pointer';
            btnSingle.className = 'px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 text-slate-600 hover:text-slate-900 cursor-pointer';
        } else {
            btnSingle.className = 'px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 bg-emerald-700 text-white shadow-xs cursor-pointer';
            btnDual.className = 'px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 text-slate-600 hover:text-slate-900 cursor-pointer';
        }
    }

    setDynamicPrintPageStyle(mode === 'dual' ? '@page { size: A4 portrait; margin: 8mm 10mm; }' : '@page { size: A4 portrait; margin: 15mm 18mm; }');
}

function renderFullpageVoucherContent(tx) {
    if (!tx) return;
    const isInflow = tx.transaction_type === 'INFLOW';
    const titleText = isInflow ? 'PHIẾU THU' : 'PHIẾU CHI';
    const topTitleText = isInflow ? 'Phiếu Thu Sổ Quỹ (Mẫu 01-TT BTC)' : 'Phiếu Chi Sổ Quỹ (Mẫu 02-TT BTC)';
    const templateNoText = isInflow ? 'Mẫu số 01 - TT' : 'Mẫu số 02 - TT';
    const debitAcc = isInflow ? (tx.payment_method === 'BANK' ? '1121' : '1111') : '1411 / 331 / 642';
    const creditAcc = isInflow ? '1411 / 131 / 711' : (tx.payment_method === 'BANK' ? '1121' : '1111');
    const partnerLabel = isInflow ? 'Họ tên người nộp tiền:' : 'Họ tên người nhận tiền:';
    const signPartnerRole = isInflow ? 'Người Nộp Tiền' : 'Người Nhận Tiền';
    const reasonLabel = isInflow ? 'Lý do nộp:' : 'Lý do chi:';

    let day = tx.day || '', month = tx.month || '', year = tx.year || '';
    if (!day && tx.transaction_date) {
        const parts = tx.transaction_date.split('/');
        if (parts.length === 3) {
            day = parts[0]; month = parts[1]; year = parts[2];
        }
    }
    if (!day) {
        const now = new Date();
        day = String(now.getDate()).padStart(2, '0');
        month = String(now.getMonth() + 1).padStart(2, '0');
        year = String(now.getFullYear());
    }

    const dateFormattedText = `Ngày ${day} tháng ${month} năm ${year}`;
    const signDateFormattedText = `Ngày ${day}/${month}/${year}`;
    const amountWords = numberToWordsVN(tx.amount);
    const amountFormatted = new Intl.NumberFormat('vi-VN').format(Math.round(tx.amount || 0)) + ' đ';
    const methodFormatted = tx.payment_method === 'BANK' ? 'Chuyển khoản Ngân hàng' : 'Quỹ Tiền mặt';
    const departmentFormatted = tx.partner_type_label ? `${tx.partner_type_label} - Triền Võ Logistics` : 'Đội xe vận tải Triền Võ Logistics';
    const reasonFormatted = tx.notes || tx.category_label || (isInflow ? 'Thu hoàn ứng tiền thừa quyết toán gom chuyến' : 'Chi bù vượt ứng quyết toán gom chuyến');
    const attachmentsFormatted = tx.ref_code ? `01 Bảng kê [${tx.ref_code}] & chứng từ gốc` : '01 Bảng kê quyết toán chuyến & chứng từ gốc';

    const topTitleEl = document.getElementById('fullpage-voucher-top-title');
    if (topTitleEl) topTitleEl.innerText = topTitleText;

    const badgeCodeEl = document.getElementById('fullpage-voucher-badge-code');
    if (badgeCodeEl) {
        badgeCodeEl.innerText = tx.code || '-';
        badgeCodeEl.className = isInflow 
            ? 'px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono'
            : 'px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-50 text-rose-800 border border-rose-200 font-mono';
    }

    const copy2Badge = document.getElementById('fullpage-voucher-copy-2-badge');
    if (copy2Badge) {
        copy2Badge.innerText = isInflow ? 'Liên 2: Giao cho người nộp tiền' : 'Liên 2: Giao cho người nhận tiền';
    }

    const setAllAreaClassText = (cls, val) => {
        document.querySelectorAll(`#fullpage-cash-voucher-printable-area .${cls}`).forEach(el => {
            el.innerText = val;
        });
    };

    setAllAreaClassText('v-template-no', templateNoText);
    setAllAreaClassText('v-code', tx.code || '-');
    setAllAreaClassText('v-debit-acc', debitAcc);
    setAllAreaClassText('v-credit-acc', creditAcc);
    setAllAreaClassText('v-title', titleText);
    setAllAreaClassText('v-date', dateFormattedText);
    setAllAreaClassText('v-sign-date', signDateFormattedText);
    setAllAreaClassText('v-partner-label', partnerLabel);
    setAllAreaClassText('v-sign-partner-role', signPartnerRole);
    setAllAreaClassText('v-partner-name', tx.partner_name || 'Tài xế / Đối tác');
    setAllAreaClassText('v-department', departmentFormatted);
    setAllAreaClassText('v-reason-label', reasonLabel);
    setAllAreaClassText('v-reason', reasonFormatted);
    setAllAreaClassText('v-amount', amountFormatted);
    setAllAreaClassText('v-method', methodFormatted);
    setAllAreaClassText('v-amount-words', amountWords);
    setAllAreaClassText('v-received-words', amountWords);
    setAllAreaClassText('v-creator-name', tx.created_by || 'Kế toán viên');
    setAllAreaClassText('v-attachments', attachmentsFormatted);

    syncCompanyProfileToPrintForms();
}

async function viewCashVoucherDetail(voucherIdentifier, updateHistory = true) {
    if (!voucherIdentifier) return;

    try {
        const res = await fetchWithAuth(`/api/accounting/cashbook/${voucherIdentifier}/`);
        if (!res.ok) throw new Error('Không thể tải chứng từ sổ quỹ');
        const data = await res.json();
        const tx = data.transaction;
        currentActiveFullpageVoucher = tx;

        const voucherCode = tx.code || tx.id;

        // Cập nhật URL chuẩn: /accounting/vouchers/<code_or_id>
        if (updateHistory && window.history && window.history.pushState) {
            const voucherPath = `/accounting/vouchers/${voucherCode}`;
            if (window.location.pathname !== voucherPath) {
                window.history.pushState({ view: 'cash-voucher-detail', voucherIdentifier: voucherCode }, '', voucherPath);
            }
        }

        // Lưu vết view trước đó
        const currentActiveView = document.querySelector('.view:not(.hidden-view)');
        if (currentActiveView && currentActiveView.id !== 'view-cash-voucher-detail') {
            previousActiveTab = currentActiveView.id.replace('view-', '');
        }

        // Ẩn tất cả views, hiển thị view-cash-voucher-detail
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden-view'));
        const detailView = document.getElementById('view-cash-voucher-detail');
        if (detailView) detailView.classList.remove('hidden-view');

        // Render nội dung phiếu A4
        renderFullpageVoucherContent(tx);

        // Ẩn khung edit, reset nút Sửa & Lưu về trạng thái xem ban đầu
        const editPanel = document.getElementById('fullpage-voucher-edit-panel');
        if (editPanel) editPanel.classList.add('hidden');
        const editBtn = document.getElementById('btn-fullpage-edit-voucher');
        if (editBtn) editBtn.classList.remove('hidden');
        setFullpageVoucherSaveButtonState(false);

        // Điền dữ liệu vào form edit sẵn sàng nếu người dùng bấm Sửa
        document.getElementById('edit-voucher-id').value = tx.id || '';
        document.getElementById('edit-voucher-code').value = tx.code || '';
        document.getElementById('edit-voucher-type').value = tx.transaction_type || 'INFLOW';
        document.getElementById('edit-voucher-method').value = tx.payment_method || 'BANK';
        populateEditVoucherCategories(tx.transaction_type || 'INFLOW', tx.category);
        document.getElementById('edit-voucher-amount').value = formatNumberVN(tx.amount || 0);
        document.getElementById('edit-voucher-date').value = tx.transaction_date_iso || '';
        document.getElementById('edit-voucher-ref').value = tx.ref_code || '';
        document.getElementById('edit-voucher-partner-type').value = tx.partner_type || '';
        document.getElementById('edit-voucher-partner-name').value = tx.partner_name || '';
        document.getElementById('edit-voucher-notes').value = tx.notes || '';

        setFullpageVoucherPrintMode('dual');
        initAllNumberInputs();
    } catch (err) {
        console.error('Lỗi tải chi tiết phiếu thu chi:', err);
        showToast('error', 'Không thể tải chứng từ sổ quỹ', 'Lỗi');
        backToAccountingCashbook();
    }
}

function populateEditVoucherCategories(type, selectedCategory = '') {
    const catSelect = document.getElementById('edit-voucher-category');
    if (!catSelect) return;
    if (type === 'INFLOW') {
        catSelect.innerHTML = `
            <option value="FREIGHT_REVENUE">Thu cước vận tải từ khách hàng</option>
            <option value="REIMBURSABLE_COLLECTION">Thu hồi chi hộ (Debit Note)</option>
            <option value="ADVANCE_REFUND">Thu hoàn ứng tiền thừa (Tài xế/Điều vận)</option>
            <option value="OTHER_INFLOW">Thu khác</option>
        `;
    } else {
        catSelect.innerHTML = `
            <option value="DISPATCHER_FUND_ADVANCE">Chi tạm ứng Quỹ Điều vận</option>
            <option value="DRIVER_TRIP_ADVANCE">Chi tạm ứng Chuyến xe (Tài xế)</option>
            <option value="ADVANCE_REIMBURSE">Chi bù vượt ứng (Hoàn ứng tài xế)</option>
            <option value="SUBCONTRACTOR_PAYMENT">Chi thanh toán Thầu phụ / Xe bạn</option>
            <option value="FUEL_PAYMENT">Chi mua xăng dầu</option>
            <option value="ETC_TOPUP">Chi nạp tiền tài khoản BOT/ETC</option>
            <option value="VEHICLE_MAINTENANCE">Chi bảo dưỡng sửa xe</option>
            <option value="OTHER_OUTFLOW">Chi phí khác</option>
        `;
    }
    if (selectedCategory) {
        catSelect.value = selectedCategory;
    }
}

function onEditVoucherTypeChange() {
    const type = document.getElementById('edit-voucher-type')?.value;
    populateEditVoucherCategories(type);
    if (currentActiveFullpageVoucher) {
        currentActiveFullpageVoucher.transaction_type = type;
        renderFullpageVoucherContent(currentActiveFullpageVoucher);
    }
}

function onEditVoucherMethodChange() {
    const method = document.getElementById('edit-voucher-method')?.value;
    if (currentActiveFullpageVoucher) {
        currentActiveFullpageVoucher.payment_method = method;
        renderFullpageVoucherContent(currentActiveFullpageVoucher);
    }
}

function updateLiveVoucherAmount(val) {
    const num = parseNumberVN(val);
    if (currentActiveFullpageVoucher) {
        currentActiveFullpageVoucher.amount = num;
        renderFullpageVoucherContent(currentActiveFullpageVoucher);
    }
}

function updateLiveVoucherDate(isoDate) {
    if (currentActiveFullpageVoucher && isoDate) {
        const parts = isoDate.split('-');
        if (parts.length === 3) {
            currentActiveFullpageVoucher.year = parts[0];
            currentActiveFullpageVoucher.month = parts[1];
            currentActiveFullpageVoucher.day = parts[2];
            currentActiveFullpageVoucher.transaction_date = `${parts[2]}/${parts[1]}/${parts[0]}`;
            renderFullpageVoucherContent(currentActiveFullpageVoucher);
        }
    }
}

function updateLiveVoucherPartnerName(val) {
    if (currentActiveFullpageVoucher) {
        currentActiveFullpageVoucher.partner_name = val;
        renderFullpageVoucherContent(currentActiveFullpageVoucher);
    }
}

function updateLiveVoucherPartnerType(val) {
    if (currentActiveFullpageVoucher) {
        currentActiveFullpageVoucher.partner_type = val;
        renderFullpageVoucherContent(currentActiveFullpageVoucher);
    }
}

function updateLiveVoucherRef(val) {
    if (currentActiveFullpageVoucher) {
        currentActiveFullpageVoucher.ref_code = val;
        renderFullpageVoucherContent(currentActiveFullpageVoucher);
    }
}

function updateLiveVoucherReason(val) {
    if (currentActiveFullpageVoucher) {
        currentActiveFullpageVoucher.notes = val;
        renderFullpageVoucherContent(currentActiveFullpageVoucher);
    }
}

function enableFullpageVoucherEdit() {
    const editPanel = document.getElementById('fullpage-voucher-edit-panel');
    if (editPanel) editPanel.classList.remove('hidden');

    const editBtn = document.getElementById('btn-fullpage-edit-voucher');
    if (editBtn) editBtn.classList.add('hidden');

    setFullpageVoucherSaveButtonState(true);
    showToast('info', 'Đã chuyển sang chế độ Sửa Phiếu. Bạn có thể thay đổi thông tin và bấm Lưu.', 'Chế Độ Sửa');
}

async function saveFullpageVoucher() {
    const id = document.getElementById('edit-voucher-id')?.value;
    if (!id) return;

    const type = document.getElementById('edit-voucher-type')?.value;
    const method = document.getElementById('edit-voucher-method')?.value;
    const category = document.getElementById('edit-voucher-category')?.value;
    const amountVal = parseNumberVN(document.getElementById('edit-voucher-amount')?.value);
    const dateVal = document.getElementById('edit-voucher-date')?.value;
    const refCode = document.getElementById('edit-voucher-ref')?.value?.trim();
    const partnerType = document.getElementById('edit-voucher-partner-type')?.value;
    const partnerName = document.getElementById('edit-voucher-partner-name')?.value?.trim();
    const notes = document.getElementById('edit-voucher-notes')?.value?.trim();

    if (!amountVal || amountVal <= 0) {
        showToast('warning', 'Số tiền giao dịch phải lớn hơn 0 đ!', 'Cảnh Báo');
        return;
    }

    try {
        const res = await fetchWithAuth(`/api/accounting/cashbook/${id}/`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transaction_type: type,
                payment_method: method,
                category: category,
                amount: amountVal,
                transaction_date: dateVal,
                ref_code: refCode,
                partner_type: partnerType,
                partner_name: partnerName,
                notes: notes
            })
        });

        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message || 'Cập nhật phiếu thành công!', 'Thành Công');
            // Ẩn panel sửa
            const editPanel = document.getElementById('fullpage-voucher-edit-panel');
            if (editPanel) editPanel.classList.add('hidden');
            const editBtn = document.getElementById('btn-fullpage-edit-voucher');
            if (editBtn) editBtn.classList.remove('hidden');
            setFullpageVoucherSaveButtonState(false);

            // Tải lại chi tiết mới nhất
            viewCashVoucherDetail(id, false);
            // Đồng bộ dữ liệu bảng Sổ Quỹ
            loadCashBookData();
        } else {
            showToast('danger', data.error || 'Có lỗi xảy ra khi lưu', 'Lỗi Lưu Phiếu');
        }
    } catch (err) {
        console.error('Lỗi lưu chứng từ:', err);
        showToast('danger', 'Lỗi kết nối máy chủ', 'Lỗi');
    }
}

function printFullpageCashVoucher() {
    document.body.classList.add('is-printing-voucher');
    document.body.classList.remove('is-printing-quotation', 'is-printing-report');
    window.print();
}

function backToAccountingCashbook() {
    const detailView = document.getElementById('view-cash-voucher-detail');
    if (detailView) detailView.classList.add('hidden-view');

    switchTab('ke-toan', true);
}

window.viewCashVoucherDetail = viewCashVoucherDetail;
window.backToAccountingCashbook = backToAccountingCashbook;
window.enableFullpageVoucherEdit = enableFullpageVoucherEdit;
window.saveFullpageVoucher = saveFullpageVoucher;
window.printFullpageCashVoucher = printFullpageCashVoucher;
window.setFullpageVoucherPrintMode = setFullpageVoucherPrintMode;
window.setFullpageVoucherSaveButtonState = setFullpageVoucherSaveButtonState;
window.onEditVoucherTypeChange = onEditVoucherTypeChange;
window.onEditVoucherMethodChange = onEditVoucherMethodChange;
window.updateLiveVoucherAmount = updateLiveVoucherAmount;
window.updateLiveVoucherDate = updateLiveVoucherDate;
window.updateLiveVoucherPartnerName = updateLiveVoucherPartnerName;
window.updateLiveVoucherPartnerType = updateLiveVoucherPartnerType;
window.updateLiveVoucherRef = updateLiveVoucherRef;
window.updateLiveVoucherReason = updateLiveVoucherReason;


function openCreateCashTransactionModal(defaultType = 'INFLOW') {
    const modal = document.getElementById('modal-cash-transaction');
    if (!modal) return;

    document.getElementById('cash-tx-type').value = defaultType;
    document.getElementById('cash-tx-date').value = new Date().toISOString().slice(0, 10);
    document.getElementById('cash-tx-amount').value = '';
    document.getElementById('cash-tx-partner-name').value = '';
    document.getElementById('cash-tx-ref').value = '';
    document.getElementById('cash-tx-notes').value = '';

    onCashTypeChange();
    onPaymentMethodChange();

    modal.classList.remove('hidden');
}

function closeCashTransactionModal() {
    const modal = document.getElementById('modal-cash-transaction');
    if (modal) modal.classList.add('hidden');
}

function onCashTypeChange() {
    const type = document.getElementById('cash-tx-type')?.value;
    const catSelect = document.getElementById('cash-tx-category');
    if (!catSelect) return;

    if (type === 'INFLOW') {
        catSelect.innerHTML = `
            <option value="FREIGHT_REVENUE">Thu cước vận tải từ khách hàng</option>
            <option value="REIMBURSABLE_COLLECTION">Thu hồi chi hộ (Debit Note)</option>
            <option value="ADVANCE_REFUND">Thu hoàn ứng tiền thừa (Tài xế/Điều vận)</option>
            <option value="OTHER_INFLOW">Thu khác</option>
        `;
        document.getElementById('cash-modal-title').innerText = 'Lập Phiếu Thu (Tiền Vào Quỹ)';
    } else {
        catSelect.innerHTML = `
            <option value="DISPATCHER_FUND_ADVANCE">Chi tạm ứng Quỹ Điều vận</option>
            <option value="DRIVER_TRIP_ADVANCE">Chi tạm ứng Chuyến xe (Tài xế)</option>
            <option value="ADVANCE_REIMBURSE">Chi bù vượt ứng (Hoàn ứng tài xế)</option>
            <option value="SUBCONTRACTOR_PAYMENT">Chi thanh toán Thầu phụ / Xe bạn</option>
            <option value="FUEL_PAYMENT">Chi mua xăng dầu</option>
            <option value="ETC_TOPUP">Chi nạp tiền tài khoản BOT/ETC</option>
            <option value="VEHICLE_MAINTENANCE">Chi bảo dưỡng sửa xe</option>
            <option value="OTHER_OUTFLOW">Chi phí khác</option>
        `;
        document.getElementById('cash-modal-title').innerText = 'Lập Phiếu Chi (Tiền Ra Khỏi Quỹ)';
    }
}

function onPaymentMethodChange() {
    const method = document.getElementById('cash-tx-method')?.value;
    const bankFields = document.getElementById('cash-bank-fields');
}

async function handleSaveCashTransaction(e) {
    e.preventDefault();
    const type = document.getElementById('cash-tx-type').value;
    const method = document.getElementById('cash-tx-method').value;
    const category = document.getElementById('cash-tx-category').value;
    const amount = document.getElementById('cash-tx-amount').value;
    const date = document.getElementById('cash-tx-date').value;
    const partnerType = document.getElementById('cash-tx-partner-type').value;
    const partnerName = document.getElementById('cash-tx-partner-name').value;
    const refCode = document.getElementById('cash-tx-ref').value;
    const bankName = document.getElementById('cash-tx-bank').value;
    const notes = document.getElementById('cash-tx-notes').value;

    try {
        const res = await fetchWithAuth('/api/accounting/cashbook/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transaction_type: type,
                payment_method: method,
                category: category,
                amount: amount,
                transaction_date: date,
                partner_type: partnerType,
                partner_name: partnerName,
                ref_code: refCode,
                bank_name: bankName,
                notes: notes
            })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message, 'Lập Phiếu Thành Công');
            closeCashTransactionModal();
            loadCashBookData();
        } else {
            showToast('danger', data.error || 'Có lỗi xảy ra');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

function exportCashBookToExcel() {
    exportAccountingToExcel();
}


// ==============================================================================
// 9.6. SUBTAB 6: QUYẾT TOÁN XE BẠN / THẦU PHỤ 3PL (SUBCONTRACTOR CONTROLLER)
// ==============================================================================
let rawSubcontractorList = [];

async function loadSubcontractorData() {
    try {
        const status = document.getElementById('subcon-filter-status')?.value || 'ALL';
        const search = document.getElementById('subcon-search')?.value || '';

        const globalDates = getDateRangeForPeriod(currentDashboardPeriod, currentDashboardCustomStart, currentDashboardCustomEnd);
        let url = `/api/accounting/subcontractor-settlements/?status=${status}&from_date=${globalDates.fromDate}&to_date=${globalDates.toDate}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;

        const res = await fetchWithAuth(url);
        if (!res.ok) throw new Error('Không thể tải quyết toán xe bạn');
        const data = await res.json();

        rawSubcontractorList = data.trips || [];

        // Cập nhật KPIs
        if (data.kpis) {
            const kp = data.kpis;
            const elTrips = document.getElementById('subcon-stat-trips');
            if (elTrips) elTrips.innerText = `${kp.total_trips} chuyến`;

            const elCost = document.getElementById('subcon-stat-cost');
            if (elCost) elCost.innerText = formatMoneyVND(kp.total_cost);

            const elAdv = document.getElementById('subcon-stat-advance');
            if (elAdv) elAdv.innerText = formatMoneyVND(kp.total_advance);

            const elRem = document.getElementById('subcon-stat-remaining');
            if (elRem) elRem.innerText = formatMoneyVND(kp.total_remaining);

            const elInfo = document.getElementById('subcon-stat-settled-info');
            if (elInfo) elInfo.innerText = `Đã quyết toán: ${kp.settled_count} / ${kp.total_trips} chuyến`;

            const badge = document.getElementById('badge-acct-subcontractors');
            if (badge) badge.innerText = kp.pending_count;

            const badgeFiltered = document.getElementById('subcon-filtered-badge');
            if (badgeFiltered) badgeFiltered.innerText = `Hiển thị: ${rawSubcontractorList.length} chuyến xe bạn`;
        }

        renderSubcontractorTable(rawSubcontractorList);
    } catch (err) {
        console.error('Lỗi tải quyết toán xe bạn:', err);
        showToast('danger', 'Không thể kết nối máy chủ để tải quyết toán xe bạn', 'Lỗi Thầu Phụ 3PL');
    }
}

function renderSubcontractorTable(list) {
    const tbody = document.getElementById('acct-subcon-tbody');
    if (!tbody) return;

    if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" class="p-8 text-center text-slate-400 font-medium">Không tìm thấy chuyến xe bạn nào phù hợp</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(item => {
        const isSettled = item.subcontractor_settlement_status === 'SETTLED';
        const isPartial = item.subcontractor_settlement_status === 'PARTIAL';

        let statusBadge = `<span class="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-200">Chờ Quyết Toán</span>`;
        if (isPartial) {
            statusBadge = `<span class="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-200">Đã Trả Một Phần</span>`;
        } else if (isSettled) {
            statusBadge = `<span class="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">Đã Quyết Toán</span>`;
        }

        const marginClass = item.gross_company_margin >= 0 ? 'text-teal-700' : 'text-rose-600';

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td>
                    <div class="font-bold text-slate-900 font-heading">[${escapeHtml(item.trip_code)}]</div>
                    <div class="text-[11px] text-slate-400">${item.created_at}</div>
                </td>
                <td>
                    <div class="font-bold text-slate-800 font-mono bg-slate-100 px-2 py-0.5 rounded inline-block">${escapeHtml(item.vehicle_plate)}</div>
                </td>
                <td>
                    <div class="font-semibold text-slate-800">${escapeHtml(item.driver_name)}</div>
                </td>
                <td>
                    <div class="font-bold text-slate-800 truncate max-w-[160px]" title="${escapeHtml(item.customer_name)}">${escapeHtml(item.customer_name)}</div>
                    <div class="text-[11px] text-slate-500">${escapeHtml(item.route_name)}</div>
                </td>
                <td class="text-right font-bold text-slate-700 tabular-nums">
                    ${formatMoneyVND(item.cached_revenue)}
                </td>
                <td class="text-right font-black text-rose-700 tabular-nums font-heading">
                    ${formatMoneyVND(item.subcontractor_cost)}
                </td>
                <td class="text-right font-bold tabular-nums ${marginClass}">
                    ${formatMoneyVND(item.gross_company_margin)}
                </td>
                <td class="text-right font-semibold text-amber-700 tabular-nums">
                    ${formatMoneyVND(item.subcontractor_advance)}
                </td>
                <td class="text-right font-black text-slate-900 tabular-nums font-heading text-sm">
                    ${formatMoneyVND(item.remaining_payable)}
                </td>
                <td class="text-center">${statusBadge}</td>
                <td class="text-xs text-slate-500 max-w-[140px] truncate" title="${escapeHtml(item.subcontractor_notes)}">
                    ${escapeHtml(item.subcontractor_notes || '-')}
                </td>
                <td class="text-center">
                    <div class="flex items-center justify-center gap-1.5">
                        <button type="button" onclick="openSubcontractorModal(${item.trip_id}, 'update_cost')" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors" title="Sửa thỏa thuận cước & tạm ứng">
                            <i class="ph-bold ph-pencil text-xs"></i>
                        </button>
                        ${!isSettled ? `
                            <button type="button" onclick="openSubcontractorModal(${item.trip_id}, 'settle')" class="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-colors" title="Quyết toán cước xe bạn & lập phiếu chi">
                                <i class="ph-bold ph-check text-xs"></i> Quyết Toán
                            </button>
                        ` : `
                            <span class="text-xs text-emerald-600 font-bold"><i class="ph-bold ph-check-circle"></i> Đã Xong</span>
                        `}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

let activeSubcontractorTrip = null;

function openSubcontractorModal(tripId, mode = 'update_cost') {
    const trip = rawSubcontractorList.find(t => t.trip_id === tripId);
    if (!trip) return;
    activeSubcontractorTrip = trip;

    const modal = document.getElementById('modal-subcontractor-settle');
    if (!modal) return;

    document.getElementById('subcon-trip-id').value = trip.trip_id;
    document.getElementById('subcon-action-type').value = mode;

    document.getElementById('subcon-trip-code').innerText = trip.trip_code;
    document.getElementById('subcon-vehicle-driver').innerText = `${trip.vehicle_plate} • ${trip.driver_name}`;
    document.getElementById('subcon-route').innerText = `${trip.customer_name} (${trip.route_name})`;
    document.getElementById('subcon-revenue').innerText = formatMoneyVND(trip.cached_revenue);

    document.getElementById('subcon-cost').value = trip.subcontractor_cost || '';
    document.getElementById('subcon-advance').value = trip.subcontractor_advance || '';
    document.getElementById('subcon-notes').value = trip.subcontractor_notes || '';

    const settleSection = document.getElementById('subcon-settle-section');
    const titleEl = document.getElementById('subcon-modal-title');
    const labelEl = document.getElementById('btn-save-subcon-label');

    if (mode === 'settle') {
        settleSection.classList.remove('hidden');
        titleEl.innerText = 'Quyết Toán Cước Xe Bạn & Xuất Phiếu Chi';
        labelEl.innerText = 'Xác Nhận Quyết Toán & Ghi Sổ Quỹ';
    } else {
        settleSection.classList.add('hidden');
        titleEl.innerText = 'Thỏa Thuận Cước & Tạm Ứng Xe Bạn';
        labelEl.innerText = 'Lưu Thỏa Thuận Cước';
    }

    calculateSubcontractorMargin();
    modal.classList.remove('hidden');
}

function closeSubcontractorModal() {
    const modal = document.getElementById('modal-subcontractor-settle');
    if (modal) modal.classList.add('hidden');
}

function calculateSubcontractorMargin() {
    if (!activeSubcontractorTrip) return;
    const cost = parseInt(document.getElementById('subcon-cost')?.value || '0', 10) || 0;
    const adv = parseInt(document.getElementById('subcon-advance')?.value || '0', 10) || 0;
    const rev = activeSubcontractorTrip.cached_revenue || 0;

    const margin = rev - cost;
    const rem = Math.max(0, cost - adv);

    const marginEl = document.getElementById('subcon-calc-margin');
    if (marginEl) {
        marginEl.innerText = formatMoneyVND(margin);
        marginEl.className = `font-black text-sm ${margin >= 0 ? 'text-teal-800' : 'text-rose-700'}`;
    }

    const remEl = document.getElementById('subcon-calc-remaining');
    if (remEl) {
        remEl.innerText = formatMoneyVND(rem);
    }
}

async function handleSaveSubcontractor(e) {
    e.preventDefault();
    if (!activeSubcontractorTrip) return;

    const action = document.getElementById('subcon-action-type').value;
    const tripId = document.getElementById('subcon-trip-id').value;
    const cost = document.getElementById('subcon-cost').value;
    const advance = document.getElementById('subcon-advance').value;
    const notes = document.getElementById('subcon-notes').value;
    const paymentMethod = document.getElementById('subcon-payment-method')?.value || 'BANK';
    const bankInfo = document.getElementById('subcon-bank-info')?.value || '';

    try {
        let payload = { action: action, trip_id: tripId, notes: notes };
        if (action === 'update_cost') {
            payload.subcontractor_cost = cost;
            payload.subcontractor_advance = advance;
        } else if (action === 'settle') {
            payload.payment_method = paymentMethod;
            payload.bank_name = bankInfo;
        }

        const res = await fetchWithAuth('/api/accounting/subcontractor-settlements/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message, 'Thành Công');
            closeSubcontractorModal();
            loadSubcontractorData();
        } else {
            showToast('danger', data.error || 'Có lỗi xảy ra');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

function exportSubcontractorToExcel() {
    exportAccountingToExcel();
}


// ==============================================================================
// 9.7. SUBTAB 7: ĐỐI SOÁT VÉ CẦU ĐƯỜNG BOT / ETC (BOT AUDIT CONTROLLER)
// ==============================================================================
async function loadBotAuditData() {
    try {
        const globalDates = getDateRangeForPeriod(currentDashboardPeriod, currentDashboardCustomStart, currentDashboardCustomEnd);
        const res = await fetchWithAuth(`/api/accounting/bot-audit/?from_date=${globalDates.fromDate}&to_date=${globalDates.toDate}`);
        if (!res.ok) throw new Error('Không thể tải đối soát vé BOT');
        const data = await res.json();

        // Cập nhật KPIs
        if (data.kpis) {
            const kp = data.kpis;
            const elTrips = document.getElementById('bot-stat-trips');
            if (elTrips) elTrips.innerText = `${kp.total_trips_with_toll} chuyến`;

            const elActual = document.getElementById('bot-stat-actual');
            if (elActual) elActual.innerText = formatMoneyVND(kp.total_actual_toll);

            const elStd = document.getElementById('bot-stat-standard');
            if (elStd) elStd.innerText = formatMoneyVND(kp.total_standard_toll);

            const elVar = document.getElementById('bot-stat-variance');
            if (elVar) elVar.innerText = `${kp.variance_count} chuyến`;
        }

        renderBotAuditTable(data.items || []);
    } catch (err) {
        console.error('Lỗi tải đối soát BOT:', err);
        showToast('danger', 'Không thể kết nối máy chủ để tải đối soát vé BOT', 'Lỗi Đối Soát BOT');
    }
}

function renderBotAuditTable(list) {
    const tbody = document.getElementById('acct-bot-tbody');
    if (!tbody) return;

    if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="p-8 text-center text-slate-400 font-medium">Không tìm thấy dữ liệu vé cầu đường BOT nào</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(item => {
        let badge = '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">Bình thường</span>';
        if (item.warning_level === 'HIGH') {
            badge = `<span class="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-200">⚠️ Vượt định mức (+${item.variance_percent}%)</span>`;
        } else if (item.warning_level === 'SAVING') {
            badge = `<span class="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">✅ Tiết kiệm (${item.variance_percent}%)</span>`;
        } else if (item.warning_level === 'NO_STANDARD') {
            badge = '<span class="text-xs text-slate-400 italic">Chưa có định mức</span>';
        }

        const diffClass = item.variance_amount > 0 ? 'text-rose-600' : (item.variance_amount < 0 ? 'text-emerald-600' : 'text-slate-600');
        const diffSign = item.variance_amount > 0 ? '+' : '';

        // Tóm tắt các vé
        const ticketsDesc = (item.tickets_detail || []).map(tk => 
            `<span class="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 mr-1" title="${escapeHtml(tk.invoice_issuer || '')}">${formatMoneyVND(tk.amount)}</span>`
        ).join('');

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td>
                    <div class="font-bold text-slate-900 font-heading">[${escapeHtml(item.trip_code)}]</div>
                </td>
                <td>
                    <div class="font-bold text-slate-800 font-mono bg-slate-100 px-2 py-0.5 rounded inline-block">${escapeHtml(item.vehicle_plate)}</div>
                </td>
                <td>
                    <div class="font-semibold text-slate-800">${escapeHtml(item.driver_name)}</div>
                </td>
                <td>
                    <div class="font-medium text-slate-700 text-xs">${escapeHtml(item.route_name)}</div>
                </td>
                <td class="text-center font-bold text-slate-800">${item.tickets_count} vé</td>
                <td class="text-right font-black text-rose-700 tabular-nums font-heading">
                    ${formatMoneyVND(item.actual_toll)}
                </td>
                <td class="text-right font-bold text-indigo-700 tabular-nums">
                    ${item.standard_toll > 0 ? formatMoneyVND(item.standard_toll) : '<span class="text-slate-400">-</span>'}
                </td>
                <td class="text-right font-black tabular-nums ${diffClass}">
                    ${item.standard_toll > 0 ? `${diffSign}${formatMoneyVND(item.variance_amount)}` : '<span class="text-slate-400">-</span>'}
                </td>
                <td class="text-center">${badge}</td>
                <td>
                    <div class="flex flex-wrap gap-1 items-center">
                        ${ticketsDesc || '<span class="text-slate-400">-</span>'}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function exportBotAuditToExcel() {
    exportAccountingToExcel();
}




// ==============================================================================
// 9.8. SUBTAB 8: TRUNG TÂM BÁO CÁO KẾ TOÁN & ĐỐI SOÁT ĐA CHIỀU
// ==============================================================================
let currentAccountingReportType = 'BY_CUSTOMER';
let currentAccountingReportPeriod = 'this_month';
let cachedAccountingReportData = null;

function selectAccountingReportType(reportType) {
    currentAccountingReportType = reportType;
    if (typeof closeAccountingDrilldownView === 'function') {
        closeAccountingDrilldownView();
    }
    
    // Cập nhật giao diện 4 nút
    const buttons = {
        'BY_CUSTOMER': 'btn-rep-type-customer',
        'BY_SUBCONTRACTOR': 'btn-rep-type-subcontractor',
        'BY_DRIVER': 'btn-rep-type-driver',
        'BY_ROUTE': 'btn-rep-type-route'
    };

    Object.entries(buttons).forEach(([type, btnId]) => {
        const btn = document.getElementById(btnId);
        if (btn) {
            if (type === reportType) {
                btn.classList.add('active', 'border-teal-600', 'bg-teal-50', 'text-teal-900');
                btn.classList.remove('border-slate-200', 'bg-white', 'text-slate-700');
            } else {
                btn.classList.remove('active', 'border-teal-600', 'bg-teal-50', 'text-teal-900');
                btn.classList.add('border-slate-200', 'bg-white', 'text-slate-700');
            }
        }
    });

    loadAccountingReportData();
}

function setAccountingReportPeriod(period) {
    currentAccountingReportPeriod = period;
    const fromInput = document.getElementById('acct-rep-from-date');
    const toInput = document.getElementById('acct-rep-to-date');
    if (!fromInput || !toInput) return;

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth(); // 0-indexed

    const pad = (n) => String(n).padStart(2, '0');
    const formatD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (period === 'this_month') {
        fromInput.value = `${y}-${pad(m + 1)}-01`;
        const lastDay = new Date(y, m + 1, 0);
        toInput.value = formatD(lastDay);
    } else if (period === 'last_month') {
        const prevMonth = m === 0 ? 11 : m - 1;
        const prevYear = m === 0 ? y - 1 : y;
        fromInput.value = `${prevYear}-${pad(prevMonth + 1)}-01`;
        const lastDay = new Date(prevYear, prevMonth + 1, 0);
        toInput.value = formatD(lastDay);
    } else if (period === 'this_quarter') {
        const qMonth = Math.floor(m / 3) * 3;
        fromInput.value = `${y}-${pad(qMonth + 1)}-01`;
        const lastDay = new Date(y, qMonth + 3, 0);
        toInput.value = formatD(lastDay);
    } else if (period === 'this_year') {
        fromInput.value = `${y}-01-01`;
        toInput.value = `${y}-12-31`;
    }

    loadAccountingReportData();
}

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

function filterAccountingReportTable() {
    const input = document.getElementById('acct-rep-search-input');
    const clearBtn = document.getElementById('acct-rep-search-clear');
    accountingReportSearchTerm = input ? input.value.trim().toLowerCase() : '';

    if (clearBtn) {
        if (accountingReportSearchTerm) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
    }

    if (cachedAccountingReportData) {
        renderAccountingReportTable(cachedAccountingReportData);
    }
}
window.filterAccountingReportTable = filterAccountingReportTable;

function clearAccountingReportSearch() {
    const input = document.getElementById('acct-rep-search-input');
    if (input) input.value = '';
    filterAccountingReportTable();
}
window.clearAccountingReportSearch = clearAccountingReportSearch;

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
                    displayVal = `<span class="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold font-mono">+${fmt(val)} đ <span class="text-[10px] font-normal">(Nộp cty)</span></span>`;
                } else if (val < 0) {
                    displayVal = `<span class="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-bold font-mono">${fmt(val)} đ <span class="text-[10px] font-normal">(Cty bù)</span></span>`;
                } else {
                    displayVal = `<span class="text-slate-400 font-mono">0 đ (Khớp)</span>`;
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
                                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusClass}">
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

function clearDrilldownSearch() {
    const searchInput = document.getElementById('drilldown-table-search');
    if (searchInput) {
        searchInput.value = '';
        filterDrilldownTable();
        searchInput.focus();
    }
}
window.clearDrilldownSearch = clearDrilldownSearch;

function closeAccountingDrilldownView() {
    const summaryView = document.getElementById('acct-rep-summary-view');
    const drilldownView = document.getElementById('acct-rep-drilldown-view');
    const mainHeader = document.getElementById('acct-main-header');
    const mainSubtabsBar = document.getElementById('acct-main-subtabs-bar');

    if (drilldownView) drilldownView.classList.add('hidden');
    if (mainHeader) mainHeader.classList.remove('hidden');
    if (mainSubtabsBar) mainSubtabsBar.classList.remove('hidden');
    if (summaryView) summaryView.classList.remove('hidden');

    const mainView = document.getElementById('view-ke-toan');
    if (mainView) mainView.scrollTo({ top: 0, behavior: 'smooth' });
}
window.closeAccountingDrilldownView = closeAccountingDrilldownView;
window.closeAccountingDrilldownModal = closeAccountingDrilldownView;

function reloadAccountingDrilldown() {
    if (currentDrilldownTarget) {
        openAccountingReportDrilldown(currentDrilldownTarget.targetId, currentDrilldownTarget.encodedTargetKey);
    }
}
window.reloadAccountingDrilldown = reloadAccountingDrilldown;
window.reloadAccountingDrilldown = reloadAccountingDrilldown;

function exportAccountingDrilldownToExcel() {
    if (!cachedAccountingDrilldownData || !cachedAccountingDrilldownData.trips || cachedAccountingDrilldownData.trips.length === 0) {
        showToast('warning', 'Chưa có dữ liệu chuyến xe để xuất Excel');
        return;
    }

    const data = cachedAccountingDrilldownData;
    const trips = data.trips;
    let csvContent = '\uFEFF';

    // Header thông tin
    csvContent += `"BÁO CÁO CHI TIẾT CHUYẾN XE — ${data.target_name || ''}"\r\n`;
    csvContent += `"Thời điểm xuất: ${new Date().toLocaleString('vi-VN')}"\r\n\r\n`;

    // Cột
    csvContent += `"STT","Mã Chuyến","Ngày Chạy","Khách Hàng","Đầu Kéo","Bác Tài","SĐT","Container","Seal","Lộ Trình","Doanh Thu (VNĐ)","Chi Phí Chuyến (VNĐ)","Chi Hộ KH (VNĐ)","Lợi Nhuận Gộp (VNĐ)","Trạng Thái"\r\n`;

    trips.forEach((t, idx) => {
        const row = [
            idx + 1,
            `"${t.trip_code}"`,
            `"${t.created_date}"`,
            `"${t.customer_name}"`,
            `"${t.vehicle_plate}"`,
            `"${t.driver_name}"`,
            `"${t.driver_phone}"`,
            `"${t.container_number} (${t.container_type})"`,
            `"${t.seal_number}"`,
            `"${t.route}"`,
            t.revenue,
            t.operating_expense,
            t.reimbursable_expense,
            t.gross_profit,
            `"${t.status_display}"`
        ];
        csvContent += row.join(',') + '\r\n';
    });

    const filename = `BIM_ChiTiet_${(data.target_name || 'DoiTuong').replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('success', `Đã xuất báo cáo chi tiết "${filename}" thành công!`, 'Xuất Excel Thành Công');
}
window.exportAccountingDrilldownToExcel = exportAccountingDrilldownToExcel;

function exportAccountingReportToExcel() {
    if (!cachedAccountingReportData || !cachedAccountingReportData.rows || cachedAccountingReportData.rows.length === 0) {
        showToast('warning', 'Chưa có dữ liệu báo cáo để xuất Excel');
        return;
    }

    const data = cachedAccountingReportData;
    const headers = data.headers || [];
    const rows = data.rows || [];

    let csvContent = '\uFEFF';
    // Title
    csvContent += `"${data.report_title || 'BÁO CÁO KẾ TOÁN'}"\r\n`;
    csvContent += `"Thời điểm xuất: ${new Date().toLocaleString('vi-VN')}"\r\n\r\n`;

    // Headers
    const headerLabels = ['STT', ...headers.map(h => `"${h.label}"`)];
    csvContent += headerLabels.join(',') + '\r\n';

    // Rows
    rows.forEach((r, idx) => {
        const rowData = [idx + 1];
        headers.forEach(h => {
            let val = r[h.key];
            if (val === null || val === undefined) val = '';
            rowData.push(`"${String(val).replace(/"/g, '""')}"`);
        });
        csvContent += rowData.join(',') + '\r\n';
    });

    const filename = `BIM_Logistics_BaoCao_${data.report_type}_${new Date().toISOString().slice(0, 10)}.csv`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('success', `Đã xuất báo cáo "${filename}" thành công!`, 'Xuất Excel Thành Công');
}

window.switchTab = switchTab;
window.switchAccountingSubTab = switchAccountingSubTab;
window.selectAccountingReportType = selectAccountingReportType;
window.switchAccountingReportType = selectAccountingReportType;
window.setAccountingReportPeriod = setAccountingReportPeriod;
window.changeAccountingReportPeriod = setAccountingReportPeriod;
window.loadAccountingReportData = loadAccountingReportData;
window.exportAccountingReportToExcel = exportAccountingReportToExcel;
window.openAccountingReportDrilldown = openAccountingReportDrilldown;
window.closeAccountingDrilldownModal = closeAccountingDrilldownView;
window.switchDrilldownTab = switchDrilldownTab;
window.exportAccountingDrilldownToExcel = exportAccountingDrilldownToExcel;

// Phân hệ Quyết Toán Gom Chuyến (Driver Settlements View)
window.loadSettlementData = loadSettlementData;
window.onSettlementGroupByChange = onSettlementGroupByChange;
window.populateSettlementTargetOptions = populateSettlementTargetOptions;
window.setSettlementDatePreset = setSettlementDatePreset;
window.resetSettlementFilters = resetSettlementFilters;
window.filterSettlementClientSide = filterSettlementClientSide;
window.selectSettlementTrips = selectSettlementTrips;
window.toggleGroupSettlementSelection = toggleGroupSettlementSelection;
window.toggleMasterSettlementCheckbox = toggleMasterSettlementCheckbox;
window.onSettlementTripSelectionChange = onSettlementTripSelectionChange;
window.executePageSettlementSubmit = executePageSettlementSubmit;
window.exportSettlementToExcel = exportSettlementToExcel;


