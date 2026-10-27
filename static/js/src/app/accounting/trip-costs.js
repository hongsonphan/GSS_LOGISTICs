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
                <td colspan="11" class="p-8 text-center text-slate-400 font-medium">
                    <i class="ph ph-receipt text-3xl mb-1 inline-block text-slate-300"></i>
                    <p>Không có dữ liệu đối soát chuyến xe phù hợp với bộ lọc.</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = '';
    list.forEach((item, idx) => {
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
            <td class="p-3.5 text-center font-mono text-xs font-bold text-slate-500 tabular-nums select-none border-r border-slate-200/70 w-12">
                ${idx + 1}
            </td>
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
                <div class="flex items-center justify-center gap-1.5">
                    <!-- 1. Quyết toán -->
                    ${item.is_settled ? `
                        <button type="button" onclick="toggleSettleTrip('${item.trip_code}', true)" title="Mở khóa sổ chuyến xe" 
                            class="h-7 px-2.5 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 inline-flex items-center gap-1 cursor-pointer">
                            <i class="ph-bold ph-arrow-counter-clockwise text-xs"></i><span>Mở Lại</span>
                        </button>
                    ` : `
                        <button type="button" onclick="toggleSettleTrip('${item.trip_code}', false)" title="Chốt sổ quyết toán tài xế" 
                            class="h-7 px-2.5 text-[11px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-2xs inline-flex items-center gap-1 cursor-pointer">
                            <i class="ph-bold ph-check-circle text-xs"></i><span>Quyết Toán</span>
                        </button>
                    `}
                    <!-- 2. Xem -->
                    <button type="button" onclick="viewTripDetail('${item.trip_code}')" title="Xem chi tiết chuyến xe & chứng từ" 
                        class="h-7 px-2.5 text-[11px] font-bold text-teal-800 hover:text-teal-950 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors border border-teal-200 inline-flex items-center gap-1 cursor-pointer">
                        <i class="ph-bold ph-eye text-xs"></i><span>Xem</span>
                    </button>
                    <!-- 3. In -->
                    <button type="button" onclick="printTripSettlementVoucher('${item.trip_code}')" title="In phiếu quyết toán chuyến xe tài xế" 
                        class="h-7 px-2.5 text-[11px] font-bold text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-50 rounded-lg transition-colors border border-slate-200 shadow-2xs inline-flex items-center gap-1 cursor-pointer">
                        <i class="ph-bold ph-printer text-xs text-slate-500"></i><span>In</span>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (window.BimTableFooter && Array.isArray(list)) {
        const totalRev = list.reduce((sum, i) => sum + (Number(i.revenue) || 0), 0);
        const totalExp = list.reduce((sum, i) => sum + (Number(i.expense) || 0), 0);
        const totalProfit = totalRev - totalExp;
        window.BimTableFooter.render('accounting-pnl-table', {
            cells: [
                { text: 'TỔNG', align: 'center', class: 'font-black text-slate-900 font-heading' },
                { html: `${list.length} chuyến xe đối soát P&L`, colspan: 4 },
                { html: `<span class="text-slate-900 font-bold tabular-nums font-mono text-sm">${new Intl.NumberFormat('vi-VN').format(totalRev)} đ</span>`, align: 'right' },
                { html: `<span class="text-rose-600 font-bold tabular-nums font-mono text-sm">${new Intl.NumberFormat('vi-VN').format(totalExp)} đ</span>`, align: 'right' },
                { html: `<span class="text-emerald-700 font-black tabular-nums font-mono text-sm">${new Intl.NumberFormat('vi-VN').format(totalProfit)} đ</span>`, align: 'right' },
                { text: '', align: 'center', colspan: 3 }
            ]
        });
    }
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
