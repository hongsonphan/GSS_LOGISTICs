async function loadDashboardData(periodOverride) {
    const period = periodOverride || currentDashboardPeriod || '7_days';
    let url = `/api/dashboard/?period=${period}`;
    if (currentDashboardRoleView) {
        url += `&view_as=${currentDashboardRoleView}`;
    }
    if (period === 'custom' && currentDashboardCustomStart && currentDashboardCustomEnd) {
        url += `&start_date=${currentDashboardCustomStart}&end_date=${currentDashboardCustomEnd}`;
    }
    try {
        const res = await fetchWithAuth(url);
        if (!res.ok) throw new Error('Không thể kết nối máy chủ');
        const data = await res.json();
        bgdDataCache = data;

        // 0. Cập nhật Role Header Bar
        const userNameEl = document.getElementById('dash-user-name');
        if (userNameEl) {
            userNameEl.innerText = window.CURRENT_USER?.full_name || 'Quý nhân sự';
        }
        const roleBadgeEl = document.getElementById('dash-role-badge');
        if (roleBadgeEl && data.role_name) {
            roleBadgeEl.innerText = data.role_name;
            if (data.role_badge) {
                roleBadgeEl.className = `px-2 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider border font-heading ${data.role_badge}`;
            }
        }
        const roleDescEl = document.getElementById('dash-role-desc');
        if (roleDescEl && data.role_description) {
            roleDescEl.innerText = data.role_description;
        }

        // Dropdown đổi góc nhìn dành cho Giám đốc / Superuser
        const viewAsContainer = document.getElementById('dash-view-as-container');
        const viewAsSelect = document.getElementById('dash-view-as-select');
        if (viewAsContainer && viewAsSelect) {
            if (data.can_switch_view) {
                viewAsContainer.classList.remove('hidden');
                viewAsContainer.classList.add('flex');
                viewAsSelect.value = data.role || 'DIRECTOR';
            } else {
                viewAsContainer.classList.add('hidden');
                viewAsContainer.classList.remove('flex');
            }
        }

        // 1. Cập nhật 4 Trụ cột KPI Điều hành (Động theo Role)
        if (data.kpi_cards && data.kpi_cards.length > 0) {
            renderRoleKpiCards(data.kpi_cards);
        } else {
            // Fallback backward compatibility
            const fin = data.financial || {};
            const prod = data.productivity || {};
            const fleet = data.fleet || {};
            const pers = data.personnel || {};
            const comm = data.commercial_customs || {};

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

            const todayTripsEl = document.getElementById('bgd-today-trips');
            if (todayTripsEl) todayTripsEl.innerText = prod.today_active ?? 0;
            const totalTripsEl = document.getElementById('bgd-total-trips');
            if (totalTripsEl) totalTripsEl.innerText = prod.total_trips ?? 0;
            const yesterdayTripsEl = document.getElementById('bgd-yesterday-trips');
            if (yesterdayTripsEl) yesterdayTripsEl.innerText = `${prod.completed_yesterday ?? 0} chuyến`;
            const otdRateEl = document.getElementById('bgd-otd-rate');
            if (otdRateEl) otdRateEl.innerText = `${prod.ontime_delivery_rate ?? 0}% OTD`;

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

            const customsGreenEl = document.getElementById('bgd-customs-green');
            if (customsGreenEl) customsGreenEl.innerText = comm.customs_green ?? 0;
            const pendingBookingsEl = document.getElementById('bgd-pending-bookings');
            if (pendingBookingsEl) pendingBookingsEl.innerText = `${comm.pending_bookings ?? 0} đơn`;
        }

        // Cập nhật 3 Thẻ Mini Dưới Biểu Đồ Doanh Thu & Subtitle
        const fin = data.financial || {};
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

        // 2. Khởi tạo Biểu đồ Chart.js Đa Vai Trò nếu có thư viện
        if (typeof Chart !== 'undefined') {
            if (data.role_charts) {
                renderRoleCharts(data.active_role || currentDashboardRoleView || 'DIRECTOR');
            } else if (data.charts) {
                renderBgdRevenueChart(data.charts.daily_trend);
                renderBgdDonutChart(currentDonutType);
            }
            initChartResizer();
        }

        // 3. Render 2 Widget Tương Tác Cốt Lõi: Bản Tin & Quản Lý Công Việc
        renderDashboardNews(data.announcements || []);
        renderDashboardTasks(data.my_tasks || []);
        initWidgetResizer();

        // 4. Render Bảng P&L Chuyến Xe Hỗ Trợ Click Mở Chi Tiết Chuyến, Lọc & Sắp Xếp
        rawDashboardTripsPnl = data.trips_pnl || [];
        applyDashboardPnlFilters();
    } catch (err) {
        console.error('Error loading dashboard data:', err);
        showToast('warning', 'Không thể tải dữ liệu Dashboard. Vui lòng kiểm tra lại kết nối.', 'Cảnh báo');
    }
}

// --- BỘ LỌC & SẮP XẾP BẢNG P&L CHUYẾN XE DASHBOARD ---
let rawDashboardTripsPnl = [];
let dashboardPnlSortColumn = null;
let dashboardPnlSortDirection = 'asc';


function applyDashboardPnlFilters() {
    if (!rawDashboardTripsPnl || !Array.isArray(rawDashboardTripsPnl)) return;
    const pnlTbody = document.getElementById('bgd-pnl-tbody');
    if (!pnlTbody) return;

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

// --- HỆ THỐNG BIỂU ĐỒ PHÂN TÍCH ĐA CHIỀU THEO VAI TRÒ (ROLE-BASED CHARTS) ---
let currentActiveRole = 'DIRECTOR';
let currentDonutOption = 1;

function renderRoleTrendChart(role) {
    if (!bgdDataCache || !bgdDataCache.role_charts) return;
    const roleChartConfig = bgdDataCache.role_charts[role] || bgdDataCache.role_charts['DIRECTOR'];
    if (!roleChartConfig || !roleChartConfig.trend) return;

    const trend = roleChartConfig.trend;
    const titleEl = document.getElementById('bgd-chart-title');
    if (titleEl) titleEl.innerText = trend.title;
    const subEl = document.getElementById('bgd-chart-subtitle');
    if (subEl) subEl.innerText = trend.subtitle;

    // Render Chú Thích (Legend)
    const legendEl = document.getElementById('bgd-chart-legend');
    if (legendEl && Array.isArray(trend.datasets)) {
        let legHtml = '';
        trend.datasets.forEach(ds => {
            if (ds.type === 'line') {
                legHtml += `<span class="inline-flex items-center text-slate-700 mr-2"><span class="w-2.5 h-0.5 mr-1" style="background-color: ${ds.borderColor || '#10b981'};"></span> ${ds.label}</span>`;
            } else {
                legHtml += `<span class="inline-flex items-center text-slate-700 mr-2"><span class="w-2 h-2 rounded mr-1" style="background-color: ${ds.backgroundColor};"></span> ${ds.label}</span>`;
            }
        });
        legendEl.innerHTML = legHtml;
    }

    // Render 3 Ô Tóm Tắt Dưới Đáy Biểu Đồ
    const sumEl = document.getElementById('bgd-chart-metrics-summary');
    if (sumEl && Array.isArray(trend.summary)) {
        const themeClasses = {
            teal: 'text-teal-800 bg-slate-50 border-slate-100',
            amber: 'text-amber-700 bg-slate-50 border-slate-100',
            emerald: 'text-emerald-700 bg-emerald-50/60 border-emerald-100',
            blue: 'text-blue-700 bg-slate-50 border-slate-100',
            indigo: 'text-indigo-700 bg-indigo-50/60 border-indigo-100',
        };
        let sumHtml = '';
        trend.summary.forEach(s => {
            const cls = themeClasses[s.theme] || themeClasses.teal;
            sumHtml += `
                <div class="p-1.5 2xl:p-2 rounded-lg border ${cls}">
                    <p class="text-[10px] 2xl:text-[10.5px] text-slate-500 font-medium">${s.label}</p>
                    <p class="text-xs 2xl:text-[13px] font-black font-heading mt-0.5 tabular-nums">${s.value}</p>
                </div>
            `;
        });
        sumEl.innerHTML = sumHtml;
    }

    // Ẩn nút khôi phục mặc định biểu đồ 1
    const resetBtn1 = document.getElementById('btn-reset-chart-1');
    if (resetBtn1) {
        resetBtn1.classList.remove('inline-flex');
        resetBtn1.classList.add('hidden');
    }

    // Khởi tạo Canvas Trend Chart
    renderBgdTrendChart(trend);
}
window.renderRoleTrendChart = renderRoleTrendChart;

function renderRoleCharts(role) {
    if (!role) role = currentActiveRole || 'DIRECTOR';
    currentActiveRole = role;

    // 1. KIỂM TRA TÙY BIẾN BIỂU ĐỒ 1 (SLOT 1)
    let hasCustom1 = false;
    const savedCustom1 = localStorage.getItem('bim_custom_chart_1') || localStorage.getItem('bim_custom_pivot_chart');
    if (savedCustom1) {
        try {
            const parsed = JSON.parse(savedCustom1);
            if (parsed && parsed.data) {
                renderCustomChartOnSlot(1, parsed.data);
                hasCustom1 = true;
            }
        } catch (e) {
            console.error('Error parsing custom chart 1 from localStorage:', e);
        }
    }
    if (!hasCustom1) {
        renderRoleTrendChart(role);
    }

    // 2. KIỂM TRA TÙY BIẾN BIỂU ĐỒ 2 (SLOT 2)
    let hasCustom2 = false;
    const savedCustom2 = localStorage.getItem('bim_custom_chart_2');
    if (savedCustom2) {
        try {
            const parsed = JSON.parse(savedCustom2);
            if (parsed && parsed.data) {
                renderCustomChartOnSlot(2, parsed.data);
                hasCustom2 = true;
            }
        } catch (e) {
            console.error('Error parsing custom chart 2 from localStorage:', e);
        }
    }
    if (!hasCustom2) {
        renderRoleDonut(role, currentDonutOption);
    }
    updateDataLabelsButtonState(2, localStorage.getItem('bim_chart_datalabels_2') === 'true');
}
window.renderRoleCharts = renderRoleCharts;
