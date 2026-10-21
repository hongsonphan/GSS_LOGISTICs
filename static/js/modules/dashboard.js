/**
 * BIM LOGISTICS — MODULE DASHBOARD TỔNG QUAN BAN GIÁM ĐỐC
 */

// --- 1. TẢI DỮ LIỆU BAN GIÁM ĐỐC (CHUẨN QUỐC TẾ TMS & HẢI QUAN) ---
async function loadDashboardData(periodOverride) {
    const period = periodOverride || currentDashboardPeriod || '7_days';
    let url = `/api/dashboard/?period=${period}`;
    if (period === 'custom' && currentDashboardCustomStart && currentDashboardCustomEnd) {
        url += `&start_date=${currentDashboardCustomStart}&end_date=${currentDashboardCustomEnd}`;
    }
    try {
        const res = await fetchWithAuth(url);
        if (!res.ok) throw new Error('Không thể kết nối máy chủ');
        const data = await res.json();
        bgdDataCache = data;

        // 1. Cập nhật 4 Trụ cột KPI Điều hành
        const fin = data.financial || {};
        const prod = data.productivity || {};
        const fleet = data.fleet || {};
        const pers = data.personnel || {};
        const comm = data.commercial_customs || {};

        // Pillar 1: Tài chính
        const grossProfitEl = document.getElementById('bgd-gross-profit');
        if (grossProfitEl) grossProfitEl.innerText = new Intl.NumberFormat('vi-VN').format(fin.monthly_gross_profit || 0) + ' đ';
        const monthlyRevEl = document.getElementById('bgd-monthly-rev');
        if (monthlyRevEl) monthlyRevEl.innerText = new Intl.NumberFormat('vi-VN').format(fin.monthly_revenue || 0) + ' đ';
        const monthlyExpEl = document.getElementById('bgd-monthly-exp');
        if (monthlyExpEl) monthlyExpEl.innerText = new Intl.NumberFormat('vi-VN').format(fin.monthly_expense || 0) + ' đ';
        const cashEl = document.getElementById('bgd-cash-val');
        if (cashEl) cashEl.innerText = new Intl.NumberFormat('vi-VN').format(fin.cash_on_hand ?? 0) + ' đ';
        const bankEl = document.getElementById('bgd-bank-val');
        if (bankEl) bankEl.innerText = new Intl.NumberFormat('vi-VN').format(fin.bank_balance ?? 0) + ' đ';

        // Pillar 2: Vận hành
        const todayTripsEl = document.getElementById('bgd-today-trips');
        if (todayTripsEl) todayTripsEl.innerText = prod.today_active ?? 0;
        const totalTripsEl = document.getElementById('bgd-total-trips');
        if (totalTripsEl) totalTripsEl.innerText = prod.total_trips ?? 0;
        const yesterdayTripsEl = document.getElementById('bgd-yesterday-trips');
        if (yesterdayTripsEl) yesterdayTripsEl.innerText = `${prod.completed_yesterday ?? 0} chuyến`;
        const otdRateEl = document.getElementById('bgd-otd-rate');
        if (otdRateEl) otdRateEl.innerText = `${prod.ontime_delivery_rate ?? 0}% OTD`;

        // Pillar 3: Đội xe & Nhân sự
        const utilizationEl = document.getElementById('bgd-fleet-utilization');
        if (utilizationEl) utilizationEl.innerText = `${fleet.utilization_rate ?? 0}%`;
        const fleetActiveEl = document.getElementById('bgd-fleet-active');
        if (fleetActiveEl) fleetActiveEl.innerText = fleet.active ?? 0;
        const fleetTotalEl = document.getElementById('bgd-fleet-total');
        if (fleetTotalEl) fleetTotalEl.innerText = fleet.total ?? 0;
        const fleetIdleEl = document.getElementById('bgd-fleet-idle');
        if (fleetIdleEl) fleetIdleEl.innerText = fleet.idle ?? 0;
        const fleetMaintEl = document.getElementById('bgd-fleet-maint');
        if (fleetMaintEl) fleetMaintEl.innerText = fleet.maintenance ?? 0;
        const hrActiveEl = document.getElementById('bgd-hr-active');
        if (hrActiveEl) hrActiveEl.innerText = `${pers.active ?? 0}/${fleet.total_drivers || pers.total || 0} TX`;

        // Pillar 4: Đơn hàng & Hải quan
        const customsGreenEl = document.getElementById('bgd-customs-green');
        if (customsGreenEl) customsGreenEl.innerText = comm.customs_green ?? 0;
        const pendingBookingsEl = document.getElementById('bgd-pending-bookings');
        if (pendingBookingsEl) pendingBookingsEl.innerText = `${comm.pending_bookings ?? 0} đơn`;

        // Cập nhật 3 Thẻ Mini Dưới Biểu Đồ Doanh Thu & Subtitle
        const avgRevEl = document.getElementById('bgd-avg-rev');
        if (avgRevEl) avgRevEl.innerText = '~' + new Intl.NumberFormat('vi-VN').format(fin.avg_revenue || 0) + ' đ';
        const avgExpEl = document.getElementById('bgd-avg-exp');
        if (avgExpEl) avgExpEl.innerText = '~' + new Intl.NumberFormat('vi-VN').format(fin.avg_expense || 0) + ' đ';
        const avgMarginEl = document.getElementById('bgd-avg-margin');
        if (avgMarginEl) avgMarginEl.innerText = `${fin.profit_margin || 0}%`;

        const avgRevLbl = document.getElementById('bgd-avg-rev-label');
        if (avgRevLbl && fin.avg_revenue_label) avgRevLbl.innerText = fin.avg_revenue_label;
        const avgExpLbl = document.getElementById('bgd-avg-exp-label');
        if (avgExpLbl && fin.avg_expense_label) avgExpLbl.innerText = fin.avg_expense_label;
        const avgMarginLbl = document.getElementById('bgd-avg-margin-label');
        if (avgMarginLbl && fin.avg_margin_label) avgMarginLbl.innerText = fin.avg_margin_label;

        const chartSubEl = document.getElementById('bgd-chart-subtitle');
        if (chartSubEl && fin.chart_subtitle) chartSubEl.innerText = fin.chart_subtitle;

        // 2. Khởi tạo Biểu đồ Chart.js nếu có thư viện
        if (typeof Chart !== 'undefined' && data.charts) {
            renderBgdRevenueChart(data.charts.daily_trend);
            renderBgdDonutChart(currentDonutType);
        }

        // 3. Render Bảng P&L Chuyến Xe Hỗ Trợ Click Mở Chi Tiết Chuyến, Lọc & Sắp Xếp
        rawDashboardTripsPnl = data.trips_pnl || [];
        applyDashboardPnlFilters();
    } catch (err) {
        console.error('Error loading dashboard data:', err);
        showToast('warning', 'Không thể tải dữ liệu Ban Giám Đốc. Vui lòng kiểm tra lại kết nối.', 'Cảnh báo');
    }
}

// --- BỘ LỌC & SẮP XẾP BẢNG P&L CHUYẾN XE DASHBOARD ---
let rawDashboardTripsPnl = [];
let dashboardPnlSortColumn = null;
let dashboardPnlSortDirection = 'asc';

function clearDashboardPnlSearch() {
    const input = document.getElementById('dashboard-pnl-search');
    if (input) input.value = '';
    const clearBtn = document.getElementById('btn-clear-dashboard-pnl-search');
    if (clearBtn) clearBtn.classList.add('hidden');
    applyDashboardPnlFilters();
}

function resetDashboardPnlFilters() {
    const status = document.getElementById('dashboard-pnl-filter-status');
    if (status) status.value = '';
    const search = document.getElementById('dashboard-pnl-search');
    if (search) search.value = '';
    const clearBtn = document.getElementById('btn-clear-dashboard-pnl-search');
    if (clearBtn) clearBtn.classList.add('hidden');

    dashboardPnlSortColumn = null;
    dashboardPnlSortDirection = 'asc';
    applyDashboardPnlFilters();
}

function toggleDashboardPnlSort(col) {
    if (dashboardPnlSortColumn === col) {
        dashboardPnlSortDirection = dashboardPnlSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        dashboardPnlSortColumn = col;
        dashboardPnlSortDirection = 'asc';
    }
    applyDashboardPnlFilters();
}

function applyDashboardPnlFilters() {
    if (!rawDashboardTripsPnl || !Array.isArray(rawDashboardTripsPnl)) return;

    const filterStatus = document.getElementById('dashboard-pnl-filter-status')?.value?.trim() || '';
    const filterSearch = document.getElementById('dashboard-pnl-search')?.value?.trim().toLowerCase() || '';

    const clearBtn = document.getElementById('btn-clear-dashboard-pnl-search');
    if (clearBtn) {
        if (filterSearch) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
    }

    let list = rawDashboardTripsPnl.filter(item => {
        if (filterStatus) {
            if (filterStatus === 'COMPLETED' && item.status !== 'COMPLETED') return false;
            if (filterStatus === 'TRANSIT') {
                if (!['IN_TRANSIT', 'ACCEPTED', 'CONTAINER_PICKED', 'AT_WAREHOUSE', 'UNLOADING', 'RETURNING_EMPTY'].includes(item.status)) return false;
            }
        }

        if (filterSearch) {
            const combinedText = [
                item.trip_code,
                item.customer_name,
                item.route,
                item.driver_name,
                item.license_plate,
                item.container_number,
                item.status_label
            ].filter(Boolean).join(' ').toLowerCase();

            if (!combinedText.includes(filterSearch)) return false;
        }

        return true;
    });

    // Cập nhật số đếm
    const filteredCountEl = document.getElementById('dashboard-pnl-filtered-count');
    if (filteredCountEl) filteredCountEl.innerText = list.length;
    const totalCountEl = document.getElementById('dashboard-pnl-total-count');
    if (totalCountEl) totalCountEl.innerText = rawDashboardTripsPnl.length;

    // Sắp xếp
    if (dashboardPnlSortColumn) {
        list.sort((a, b) => {
            let valA = a[dashboardPnlSortColumn];
            let valB = b[dashboardPnlSortColumn];

            if (['revenue', 'expense', 'profit', 'margin_percent'].includes(dashboardPnlSortColumn)) {
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
                return dashboardPnlSortDirection === 'asc' ? valA - valB : valB - valA;
            }

            if (dashboardPnlSortColumn === 'loading_date') {
                const timeA = a.loading_date_iso ? new Date(a.loading_date_iso).getTime() || 0 : 0;
                const timeB = b.loading_date_iso ? new Date(b.loading_date_iso).getTime() || 0 : 0;
                return dashboardPnlSortDirection === 'asc' ? timeA - timeB : timeB - timeA;
            }

            if (['revenue', 'expense', 'profit', 'margin_percent'].includes(dashboardPnlSortColumn)) {
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
                return dashboardPnlSortDirection === 'asc' ? valA - valB : valB - valA;
            }

            valA = (valA || '').toString();
            valB = (valB || '').toString();
            const cmp = valA.localeCompare(valB, 'vi');
            return dashboardPnlSortDirection === 'asc' ? cmp : -cmp;
        });
    }

    // Cập nhật icon sort thead
    const sortCols = ['trip_code', 'loading_date', 'customer_name', 'driver_name', 'container_number', 'revenue', 'expense', 'profit', 'margin_percent', 'status'];
    sortCols.forEach(col => {
        const iconEl = document.getElementById(`sort-icon-pnl-${col}`);
        if (iconEl) {
            if (dashboardPnlSortColumn === col) {
                iconEl.className = dashboardPnlSortDirection === 'asc' 
                    ? 'ph-bold ph-arrow-up text-teal-600 text-xs' 
                    : 'ph-bold ph-arrow-down text-teal-600 text-xs';
            } else {
                iconEl.className = 'ph-bold ph-arrows-down-up text-slate-400 text-xs';
            }
        }
    });

    renderDashboardPnlTable(list);
}

function renderDashboardPnlTable(trips) {
    const pnlTbody = document.getElementById('bgd-pnl-tbody');
    if (!pnlTbody) return;
    pnlTbody.innerHTML = '';

    if (!trips || trips.length === 0) {
        pnlTbody.innerHTML = `
            <tr>
                <td colspan="11" class="text-center py-8 text-slate-400">
                    <p class="font-medium text-xs text-slate-500">Không tìm thấy chuyến xe nào phù hợp</p>
                </td>
            </tr>
        `;
        return;
    }

    trips.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-teal-50/40 transition-colors cursor-pointer group row-multiline border-b border-slate-200/70';
        tr.title = `Bấm để xem chi tiết hồ sơ chuyến [${item.trip_code}]`;
        tr.onclick = () => {
            viewTripDetail(item.trip_code);
        };

        let statusBadge = `<span class="text-xs font-semibold text-slate-600">${escapeHtml(item.status_label || item.status)}</span>`;
        if (item.status === 'COMPLETED') {
            statusBadge = `<span class="text-xs font-semibold text-emerald-700">Đã hoàn tất</span>`;
        } else if (['IN_TRANSIT', 'ACCEPTED', 'CONTAINER_PICKED', 'AT_WAREHOUSE', 'UNLOADING', 'RETURNING_EMPTY'].includes(item.status)) {
            statusBadge = `<span class="text-xs font-semibold text-amber-700">Đang vận hành</span>`;
        }

        const marginVal = item.margin_percent || 0;
        const barColor = marginVal >= 50 ? 'bg-emerald-500' : (marginVal >= 25 ? 'bg-amber-500' : 'bg-rose-500');

        tr.innerHTML = `
            <td class="py-1.5 px-3 border-r border-slate-200/70 font-black text-teal-800 font-mono text-[13px] whitespace-nowrap">
                <div class="flex items-center space-x-1">
                    <span>${escapeHtml(formatCodeCompact(item.trip_code))}</span>
                    <i class="ph ph-arrow-square-out text-slate-400 group-hover:text-teal-600 transition-colors text-xs"></i>
                </div>
            </td>
            <td class="py-1.5 px-3 border-r border-slate-200/70 whitespace-nowrap text-center text-xs font-semibold text-slate-700">
                ${escapeHtml(item.loading_date || '-')}
            </td>
            <td class="py-1.5 px-3 border-r border-slate-200/70">
                <p class="font-bold text-slate-900 text-[13px] leading-tight">${escapeHtml(item.customer_name)}</p>
                <p class="text-[11.5px] text-slate-500 font-medium truncate max-w-xs mt-0.5 leading-tight">${escapeHtml(item.route)}</p>
            </td>
            <td class="py-1.5 px-3 border-r border-slate-200/70">
                <p class="font-bold text-slate-900 text-[13px] leading-tight">${escapeHtml(item.driver_name)}</p>
                <p class="text-[11.5px] text-teal-700 font-mono font-bold mt-0.5 leading-tight">${escapeHtml(item.license_plate)}</p>
            </td>
            <td class="py-1.5 px-3 border-r border-slate-200/70 font-mono text-slate-800 font-bold text-[12.5px]">${escapeHtml(item.container_number)}</td>
            <td class="py-1.5 px-3 border-r border-slate-200/70 text-right font-bold text-slate-900 tabular-nums font-mono text-[13px]">${new Intl.NumberFormat('vi-VN').format(item.revenue)} đ</td>
            <td class="py-1.5 px-3 border-r border-slate-200/70 text-right font-medium text-amber-700 tabular-nums font-mono text-[13px]">-${new Intl.NumberFormat('vi-VN').format(item.expense)} đ</td>
            <td class="py-1.5 px-3 border-r border-slate-200/70 text-right font-bold text-emerald-700 tabular-nums font-mono text-[13px] font-heading">${new Intl.NumberFormat('vi-VN').format(item.profit)} đ</td>
            <td class="py-1.5 px-3 border-r border-slate-200/70 text-center">
                <div class="flex items-center justify-center space-x-1.5">
                    <span class="text-[11.5px] font-bold text-slate-700 w-9 text-right tabular-nums">${marginVal}%</span>
                    <div class="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div class="h-full ${barColor}" style="width: ${Math.min(100, Math.max(0, marginVal))}%"></div>
                    </div>
                </div>
            </td>
            <td class="py-1.5 px-3 border-r border-slate-200/70 text-center">${statusBadge}</td>
            <td class="py-1.5 px-3 text-center" onclick="event.stopPropagation();">
                <button onclick="viewTripDetail('${item.trip_code}')" class="px-2 py-0.5 rounded text-[11px] font-bold bg-teal-50 hover:bg-teal-700 hover:text-white text-teal-700 font-heading border border-teal-200 transition-colors shadow-2xs">
                    Chi Tiết
                </button>
            </td>
        `;
        pnlTbody.appendChild(tr);
    });
}

// =========================================================================
// CUSTOM CHART DATA LABELS PLUGIN & HELPER (HIỂN THỊ SỐ LIỆU TRÊN CỘT / LINE)
// =========================================================================
const chartDataLabelsPlugin = {
    id: 'customDataLabels',
    afterDatasetsDraw(chart, args, pluginOptions) {
        if (!pluginOptions || !pluginOptions.display) return;

        const { ctx } = chart;
        ctx.save();
        ctx.lineJoin = 'round';

        // 1. XỬ LÝ RIÊNG CHO BIỂU ĐỒ TRÒN / DONUT (HIỂN THỊ SỐ LIỆU CON TRÊN TỪNG Ô LÁT CẮT)
        if (chart.config.type === 'doughnut' || chart.config.type === 'pie') {
            chart.data.datasets.forEach((dataset, datasetIndex) => {
                const meta = chart.getDatasetMeta(datasetIndex);
                if (!meta || meta.hidden) return;
                const total = dataset.data.reduce((acc, curr) => acc + (Number(curr) || 0), 0);

                meta.data.forEach((element, index) => {
                    const val = dataset.data[index];
                    if (val === null || val === undefined || val === 0) return;
                    const pct = total > 0 ? (val / total * 100) : 0;
                    if (pct < 3.5) return;

                    let text = '';
                    if (typeof val === 'number') {
                        if (val >= 1000000) {
                            text = (val / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' tr';
                        } else if (val >= 1000) {
                            text = new Intl.NumberFormat('vi-VN').format(val);
                        } else {
                            text = String(val);
                        }
                    } else {
                        text = String(val);
                    }

                    const pos = element.tooltipPosition();
                    ctx.font = 'bold 11px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.lineWidth = 3;
                    ctx.strokeStyle = '#ffffff';
                    ctx.fillStyle = '#0f172a';
                    ctx.strokeText(text, pos.x, pos.y);
                    ctx.fillText(text, pos.x, pos.y);
                });
            });
            ctx.restore();
            return;
        }

        // 2. XỬ LÝ CHO BIỂU ĐỒ CỘT (BAR) & ĐƯỜNG (LINE)
        ctx.font = 'bold 12px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#ffffff';

        chart.data.datasets.forEach((dataset, datasetIndex) => {
            const meta = chart.getDatasetMeta(datasetIndex);
            if (!meta || meta.hidden) return;

            meta.data.forEach((element, index) => {
                const val = dataset.data[index];
                if (val === null || val === undefined || val === 0) return;

                let text = '';
                if (dataset.label && dataset.label.includes('%')) {
                    text = `${val}%`;
                } else if (typeof val === 'number') {
                    if (val >= 1000000) {
                        text = (val / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' tr';
                    } else if (val >= 1000) {
                        text = new Intl.NumberFormat('vi-VN').format(val);
                    } else {
                        text = String(val);
                    }
                } else {
                    text = String(val);
                }

                const pos = element.tooltipPosition();
                const isHorizontal = chart.config.options?.indexAxis === 'y';

                if (isHorizontal) {
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = '#0f766e';
                    ctx.strokeText(text, pos.x + 8, pos.y);
                    ctx.fillText(text, pos.x + 8, pos.y);
                } else {
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    let textColor = '#1e293b';
                    const lbl = (dataset.label || '').toLowerCase();
                    if (dataset.type === 'line' || lbl.includes('lợi nhuận')) {
                        textColor = '#047857';
                    } else if (lbl.includes('doanh thu') || lbl.includes('lệnh điều')) {
                        textColor = '#1d4ed8';
                    } else if (lbl.includes('chi phí') || lbl.includes('phí')) {
                        textColor = '#b45309';
                    } else if (dataset.borderColor) {
                        textColor = dataset.borderColor;
                    }
                    ctx.fillStyle = textColor;
                    ctx.strokeText(text, pos.x, pos.y - 5);
                    ctx.fillText(text, pos.x, pos.y - 5);
                }
            });
        });
        ctx.restore();
    }
};

function toggleDashboardChartDataLabels(slot = 1) {
    const key = 'bim_chart_datalabels_' + slot;
    const currentState = localStorage.getItem(key) === 'true';
    const newState = !currentState;
    localStorage.setItem(key, String(newState));

    updateDataLabelsButtonState(slot, newState);

    const targetChart = (slot === 1) ? bgdRevenueChart : bgdDonutChart;
    if (targetChart && targetChart.options && targetChart.options.plugins) {
        if (!targetChart.options.plugins.customDataLabels) targetChart.options.plugins.customDataLabels = {};
        targetChart.options.plugins.customDataLabels.display = newState;
        targetChart.update();
    }
}
window.toggleDashboardChartDataLabels = toggleDashboardChartDataLabels;

function updateDataLabelsButtonState(slot, isActive) {
    const btn = document.getElementById('btn-toggle-datalabels-' + slot);
    const txt = document.getElementById('text-toggle-datalabels-' + slot);
    if (!btn) return;
    if (isActive) {
        btn.classList.remove('bg-slate-100', 'text-slate-700', 'border-slate-200');
        btn.classList.add('bg-teal-600', 'text-white', 'border-teal-700', 'shadow-xs');
        if (txt) txt.innerText = 'Số liệu: Bật';
    } else {
        btn.classList.remove('bg-teal-600', 'text-white', 'border-teal-700', 'shadow-xs');
        btn.classList.add('bg-slate-100', 'text-slate-700', 'border-slate-200');
        if (txt) txt.innerText = 'Số liệu';
    }
}
window.updateDataLabelsButtonState = updateDataLabelsButtonState;

// Biểu đồ Cột & Đường Doanh thu, Chi phí, Lợi nhuận gộp
function renderBgdRevenueChart(trendData) {
    const ctx = document.getElementById('bgd-revenue-trend-chart');
    if (!ctx) return;
    if (bgdRevenueChart) {
        bgdRevenueChart.destroy();
    }

    const isDataLabelsOn = localStorage.getItem('bim_chart_datalabels_1') === 'true';
    updateDataLabelsButtonState(1, isDataLabelsOn);
    
    bgdRevenueChart = new Chart(ctx, {
        type: 'bar',
        plugins: [chartDataLabelsPlugin],
        data: {
            labels: trendData.labels,
            datasets: [
                {
                    label: 'Lợi Nhuận Gộp',
                    type: 'line',
                    data: trendData.profit,
                    borderColor: '#10b981',
                    backgroundColor: '#10b981',
                    borderWidth: 3,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.35,
                    order: 1
                },
                {
                    label: 'Doanh Thu Cước',
                    type: 'bar',
                    data: trendData.revenue,
                    backgroundColor: 'rgba(13, 148, 136, 0.85)',
                    hoverBackgroundColor: '#0d9488',
                    borderRadius: 6,
                    borderSkipped: false,
                    barPercentage: 0.65,
                    order: 2
                },
                {
                    label: 'Chi Phí Vận Hành',
                    type: 'bar',
                    data: trendData.expense,
                    backgroundColor: 'rgba(245, 158, 11, 0.75)',
                    hoverBackgroundColor: '#f59e0b',
                    borderRadius: 6,
                    borderSkipped: false,
                    barPercentage: 0.65,
                    order: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: { display: false },
                customDataLabels: { display: isDataLabelsOn },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#ffffff',
                    bodyColor: '#e2e8f0',
                    padding: 10,
                    borderRadius: 8,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${new Intl.NumberFormat('vi-VN').format(context.raw)} đ`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        font: { family: "'Inter', sans-serif", size: 11, weight: '600' },
                        color: '#64748b'
                    }
                },
                y: {
                    grid: { color: 'rgba(226, 232, 240, 0.6)', drawBorder: false },
                    ticks: {
                        font: { family: "'Inter', sans-serif", size: 10 },
                        color: '#94a3b8',
                        callback: function(value) {
                            if (value >= 1000000) return (value / 1000000).toFixed(0) + ' tr';
                            return value;
                        }
                    }
                }
            }
        }
    });
}

// Biểu đồ Donut Khai thác Đội xe & Hải quan
function renderBgdDonutChart(type = 'fleet') {
    const ctx = document.getElementById('bgd-donut-chart');
    if (!ctx || !bgdDataCache) return;
    if (bgdDonutChart) {
        bgdDonutChart.destroy();
    }

    currentDonutType = type;
    const isFleet = type === 'fleet';
    
    const btnFleet = document.getElementById('donut-toggle-fleet');
    const btnCustoms = document.getElementById('donut-toggle-customs');
    if (btnFleet && btnCustoms) {
        if (isFleet) {
            btnFleet.className = 'px-2.5 py-1 rounded-lg bg-white text-teal-800 shadow-xs transition-all font-heading';
            btnCustoms.className = 'px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-800 transition-all font-heading';
        } else {
            btnCustoms.className = 'px-2.5 py-1 rounded-lg bg-white text-teal-800 shadow-xs transition-all font-heading';
            btnFleet.className = 'px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-800 transition-all font-heading';
        }
    }

    const labels = isFleet 
        ? ['Đang chở hàng (Active)', 'Chờ bãi (Idle)', 'Bảo trì (Maintenance)'] 
        : ['Luồng Xanh (Thông quan)', 'Luồng Vàng (Nộp hồ sơ)', 'Luồng Đỏ (Kiểm hóa)'];
        
    const dataVals = isFleet 
        ? [bgdDataCache.fleet.active, bgdDataCache.fleet.idle, bgdDataCache.fleet.maintenance]
        : [bgdDataCache.commercial_customs.customs_green, bgdDataCache.commercial_customs.customs_yellow, bgdDataCache.commercial_customs.customs_red];

    const bgColors = isFleet 
        ? ['#10b981', '#0d9488', '#f43f5e']
        : ['#10b981', '#f59e0b', '#f43f5e'];

    const centerValEl = document.getElementById('donut-center-value');
    const centerLblEl = document.getElementById('donut-center-label');
    if (centerValEl && centerLblEl) {
        centerValEl.innerText = isFleet ? `${bgdDataCache.fleet.utilization_rate}%` : `${bgdDataCache.commercial_customs.customs_clearance_rate}%`;
        centerLblEl.innerText = isFleet ? 'Khai Thác' : 'Luồng Xanh';
    }

    const legendEl = document.getElementById('donut-legend-container');
    if (legendEl) {
        if (isFleet) {
            legendEl.innerHTML = `
                <div class="flex justify-between items-center text-slate-600">
                    <span class="flex items-center"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2"></span> Đang có hàng (Active)</span>
                    <strong class="font-heading text-slate-800">${bgdDataCache.fleet.active} xe (${bgdDataCache.fleet.utilization_rate}%)</strong>
                </div>
                <div class="flex justify-between items-center text-slate-600">
                    <span class="flex items-center"><span class="w-2.5 h-2.5 rounded-full bg-teal-500 mr-2"></span> Sẵn sàng bãi (Idle)</span>
                    <strong class="font-heading text-slate-800">${bgdDataCache.fleet.idle} xe</strong>
                </div>
                <div class="flex justify-between items-center text-slate-600">
                    <span class="flex items-center"><span class="w-2.5 h-2.5 rounded-full bg-rose-500 mr-2"></span> Bảo dưỡng (Maintenance)</span>
                    <strong class="font-heading text-slate-800">${bgdDataCache.fleet.maintenance} xe</strong>
                </div>
            `;
        } else {
            legendEl.innerHTML = `
                <div class="flex justify-between items-center text-slate-600">
                    <span class="flex items-center"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2"></span> Luồng Xanh (Thông quan tự động)</span>
                    <strong class="font-heading text-emerald-700">${bgdDataCache.commercial_customs.customs_green} tờ (85%)</strong>
                </div>
                <div class="flex justify-between items-center text-slate-600">
                    <span class="flex items-center"><span class="w-2.5 h-2.5 rounded-full bg-amber-500 mr-2"></span> Luồng Vàng (Kiểm tra hồ sơ)</span>
                    <strong class="font-heading text-amber-700">${bgdDataCache.commercial_customs.customs_yellow} tờ (12%)</strong>
                </div>
                <div class="flex justify-between items-center text-slate-600">
                    <span class="flex items-center"><span class="w-2.5 h-2.5 rounded-full bg-rose-500 mr-2"></span> Luồng Đỏ (Kiểm tra thực tế)</span>
                    <strong class="font-heading text-rose-700">${bgdDataCache.commercial_customs.customs_red} tờ (3%)</strong>
                </div>
            `;
        }
    }

    bgdDonutChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: dataVals,
                backgroundColor: bgColors,
                borderWidth: 2,
                borderColor: '#ffffff',
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '72%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    padding: 8,
                    borderRadius: 8
                }
            }
        }
    });
}

function switchDonutChart(type) {
    renderBgdDonutChart(type);
}

