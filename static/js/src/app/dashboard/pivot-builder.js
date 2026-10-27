// =========================================================================
// HỆ THỐNG TÙY BIẾN BIỂU ĐỒ BÁO CÁO (ĐỘC LẬP CHO CẢ 2 Ô BIỂU ĐỒ)
// =========================================================================
let currentCustomizingSlot = 1; // 1: Biểu đồ 1 bên trái, 2: Biểu đồ 2 bên phải
let pivotPreviewChart = null;
let currentPivotResultCache = null;

const PIVOT_ENTITY_FIELDS = {
    trips: {
        name: 'Chuyến xe & Vận chuyển',
        groups: [
            { val: 'customer', label: 'Khách hàng (Tên viết tắt)' },
            { val: 'subcontractor', label: 'Thầu phụ / Nhà xe' },
            { val: 'driver', label: 'Tài xế' },
            { val: 'vehicle', label: 'Đầu kéo / Xe' },
            { val: 'route', label: 'Tuyến đường vận chuyển' },
            { val: 'container_type', label: 'Loại Container' },
            { val: 'shipment_type', label: 'Phân loại hàng' },
            { val: 'status', label: 'Trạng thái chuyến' }
        ],
        metrics: [
            { val: 'revenue', label: 'Doanh thu (VNĐ)', defaultAgg: 'sum' },
            { val: 'expense', label: 'Chi phí vận hành (VNĐ)', defaultAgg: 'sum' },
            { val: 'profit', label: 'Lợi nhuận gộp (VNĐ)', defaultAgg: 'sum' },
            { val: 'trip_count', label: 'Số chuyến xe (chuyến)', defaultAgg: 'count' }
        ]
    },
    expenses: {
        name: 'Chi phí phát sinh & Hiện trường',
        groups: [
            { val: 'category', label: 'Khoản mục chi phí' },
            { val: 'driver', label: 'Tài xế lập phiếu chi' },
            { val: 'vehicle', label: 'Biển số xe' },
            { val: 'status', label: 'Trạng thái duyệt chi' }
        ],
        metrics: [
            { val: 'amount', label: 'Số tiền chi (VNĐ)', defaultAgg: 'sum' },
            { val: 'expense_count', label: 'Số lượng phiếu chi (phiếu)', defaultAgg: 'count' }
        ]
    },
    bookings: {
        name: 'Đơn hàng & Đặt chỗ',
        groups: [
            { val: 'customer', label: 'Khách hàng' },
            { val: 'shipping_line', label: 'Hãng tàu' },
            { val: 'container_size', label: 'Kích cỡ Container' },
            { val: 'status', label: 'Trạng thái điều xe' }
        ],
        metrics: [
            { val: 'booking_count', label: 'Số lượng đơn hàng (đơn)', defaultAgg: 'count' },
            { val: 'total_containers', label: 'Tổng số Container (cont)', defaultAgg: 'sum' }
        ]
    },
    vehicles: {
        name: 'Đội xe & Phương tiện',
        groups: [
            { val: 'status', label: 'Trạng thái hoạt động' },
            { val: 'vehicle_type', label: 'Loại phương tiện' }
        ],
        metrics: [
            { val: 'vehicle_count', label: 'Số lượng xe (xe)', defaultAgg: 'count' }
        ]
    },
    quotations: {
        name: 'Báo giá & Khách hàng',
        groups: [
            { val: 'customer', label: 'Khách hàng' },
            { val: 'status', label: 'Trạng thái duyệt' },
            { val: 'pricing_method', label: 'Phương thức định giá' }
        ],
        metrics: [
            { val: 'unit_price', label: 'Đơn giá cước (VNĐ)', defaultAgg: 'avg' },
            { val: 'expected_trips', label: 'Sản lượng cam kết (chuyến)', defaultAgg: 'sum' },
            { val: 'quotation_count', label: 'Số lượng báo giá (hồ sơ)', defaultAgg: 'count' }
        ]
    },
    advances: {
        name: 'Tạm ứng & Hoàn ứng Lái xe',
        groups: [
            { val: 'driver', label: 'Tài xế nhận tạm ứng' },
            { val: 'advance_source', label: 'Nguồn tiền tạm ứng' }
        ],
        metrics: [
            { val: 'amount', label: 'Số tiền tạm ứng (VNĐ)', defaultAgg: 'sum' },
            { val: 'advance_count', label: 'Số phiếu tạm ứng (phiếu)', defaultAgg: 'count' }
        ]
    },
    exceptions: {
        name: 'Sự cố & Khiếu nại vận tải',
        groups: [
            { val: 'exception_type', label: 'Loại sự cố vận tải' },
            { val: 'severity', label: 'Mức độ nghiêm trọng' },
            { val: 'is_resolved', label: 'Tình trạng xử lý' }
        ],
        metrics: [
            { val: 'exception_count', label: 'Số vụ việc sự cố (vụ)', defaultAgg: 'count' }
        ]
    },
    personnel: {
        name: 'Nhân sự & Đội ngũ',
        groups: [
            { val: 'department', label: 'Phòng ban' },
            { val: 'role', label: 'Chức danh & Vị trí' },
            { val: 'gender', label: 'Giới tính' },
            { val: 'is_active', label: 'Trạng thái công tác' }
        ],
        metrics: [
            { val: 'employee_count', label: 'Số lượng nhân sự (người)', defaultAgg: 'count' },
            { val: 'base_salary', label: 'Mức lương cơ bản (VNĐ)', defaultAgg: 'avg' }
        ]
    }
};

function openChartCustomizer(slot = 1) {
    currentCustomizingSlot = Number(slot) || 1;
    const modal = document.getElementById('modal-pivot-chart-builder');
    if (!modal) return;

    // Cập nhật Badge và Tên Nút theo Slot
    const badge = document.getElementById('chart-builder-slot-badge');
    if (badge) {
        badge.innerText = `Biểu đồ ${currentCustomizingSlot}`;
        badge.className = currentCustomizingSlot === 1 
            ? 'px-2 py-0.5 rounded text-[11px] font-bold bg-teal-100 text-teal-800' 
            : 'px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800';
    }
    const btnApplyText = document.getElementById('btn-apply-chart-text');
    if (btnApplyText) {
        btnApplyText.innerText = `Áp Dụng Vào Biểu Đồ ${currentCustomizingSlot}`;
    }

    modal.classList.remove('hidden');

    // Nạp lại cấu hình đã lưu cho slot này (hoặc fallback cho slot 1)
    let saved = localStorage.getItem('bim_custom_chart_' + currentCustomizingSlot);
    if (!saved && currentCustomizingSlot === 1) {
        saved = localStorage.getItem('bim_custom_pivot_chart');
    }

    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.config) {
                const cfg = parsed.config;
                const entSelect = document.getElementById('pivot-select-entity');
                if (entSelect && cfg.entity) entSelect.value = cfg.entity;
                onPivotEntityChange(false);

                const grpSelect = document.getElementById('pivot-select-group-by');
                if (grpSelect && cfg.group_by) grpSelect.value = cfg.group_by;

                const metSelect = document.getElementById('pivot-select-metric');
                if (metSelect && cfg.metric) metSelect.value = cfg.metric;

                const aggSelect = document.getElementById('pivot-select-agg');
                if (aggSelect && cfg.agg) aggSelect.value = cfg.agg;

                const chartSelect = document.getElementById('pivot-select-chart-type');
                if (chartSelect && cfg.chart_type) chartSelect.value = cfg.chart_type;

                const perSelect = document.getElementById('pivot-select-period');
                if (perSelect && cfg.period) perSelect.value = cfg.period;

                const limSelect = document.getElementById('pivot-select-limit');
                if (limSelect && cfg.limit) limSelect.value = cfg.limit;

                const sortSelect = document.getElementById('pivot-select-sort');
                if (sortSelect && cfg.sort) sortSelect.value = cfg.sort;
            } else {
                setCustomizerDefaultsForSlot(currentCustomizingSlot);
            }
        } catch (e) {
            setCustomizerDefaultsForSlot(currentCustomizingSlot);
        }
    } else {
        setCustomizerDefaultsForSlot(currentCustomizingSlot);
    }

    const toggleLabelsEl = document.getElementById('pivot-toggle-data-labels');
    if (toggleLabelsEl) {
        toggleLabelsEl.checked = localStorage.getItem('bim_chart_datalabels_' + currentCustomizingSlot) === 'true';
    }

    fetchAndRenderPivotPreview();
}
window.openChartCustomizer = openChartCustomizer;
window.openPivotChartBuilderModal = openChartCustomizer; // Tương thích ngược

function setCustomizerDefaultsForSlot(slot) {
    const entSelect = document.getElementById('pivot-select-entity');
    const chartSelect = document.getElementById('pivot-select-chart-type');
    const perSelect = document.getElementById('pivot-select-period');
    const limSelect = document.getElementById('pivot-select-limit');
    const sortSelect = document.getElementById('pivot-select-sort');

    if (slot === 2) {
        if (entSelect) entSelect.value = 'trips';
        onPivotEntityChange(false);
        const grpSelect = document.getElementById('pivot-select-group-by');
        if (grpSelect) grpSelect.value = 'status';
        const metSelect = document.getElementById('pivot-select-metric');
        if (metSelect) metSelect.value = 'trip_count';
        const aggSelect = document.getElementById('pivot-select-agg');
        if (aggSelect) aggSelect.value = 'count';
        if (chartSelect) chartSelect.value = 'doughnut';
    } else {
        if (entSelect) entSelect.value = 'trips';
        onPivotEntityChange(false);
        const grpSelect = document.getElementById('pivot-select-group-by');
        if (grpSelect) grpSelect.value = 'customer';
        const metSelect = document.getElementById('pivot-select-metric');
        if (metSelect) metSelect.value = 'revenue';
        const aggSelect = document.getElementById('pivot-select-agg');
        if (aggSelect) aggSelect.value = 'sum';
        if (chartSelect) chartSelect.value = 'bar';
    }

    if (perSelect) perSelect.value = 'all';
    if (limSelect) limSelect.value = '10';
    if (sortSelect) sortSelect.value = 'desc';
}

function closePivotChartBuilderModal() {
    const modal = document.getElementById('modal-pivot-chart-builder');
    if (modal) modal.classList.add('hidden');
}
window.closePivotChartBuilderModal = closePivotChartBuilderModal;

function onPivotEntityChange(triggerFetch = true) {
    const entitySelect = document.getElementById('pivot-select-entity');
    const entity = entitySelect ? entitySelect.value : 'trips';
    const def = PIVOT_ENTITY_FIELDS[entity] || PIVOT_ENTITY_FIELDS.trips;

    // Điền Dropdown Group By
    const groupSelect = document.getElementById('pivot-select-group-by');
    if (groupSelect) {
        groupSelect.innerHTML = def.groups.map(g => `<option value="${g.val}">${g.label}</option>`).join('');
    }

    // Điền Dropdown Metric
    const metricSelect = document.getElementById('pivot-select-metric');
    if (metricSelect) {
        metricSelect.innerHTML = def.metrics.map(m => `<option value="${m.val}" data-defagg="${m.defaultAgg}">${m.label}</option>`).join('');
    }

    // Tự động set aggregation phù hợp với metric đầu tiên
    const aggSelect = document.getElementById('pivot-select-agg');
    if (aggSelect && def.metrics.length > 0) {
        aggSelect.value = def.metrics[0].defaultAgg || 'sum';
    }

    if (triggerFetch) {
        fetchAndRenderPivotPreview();
    }
}
window.onPivotEntityChange = onPivotEntityChange;

function resetPivotChartBuilderDefaults() {
    setCustomizerDefaultsForSlot(currentCustomizingSlot);
    fetchAndRenderPivotPreview();
}
window.resetPivotChartBuilderDefaults = resetPivotChartBuilderDefaults;

async function fetchAndRenderPivotPreview() {
    const entity = document.getElementById('pivot-select-entity')?.value || 'trips';
    const group_by = document.getElementById('pivot-select-group-by')?.value || 'customer';
    const metric = document.getElementById('pivot-select-metric')?.value || 'revenue';
    const agg = document.getElementById('pivot-select-agg')?.value || 'sum';
    const chart_type = document.getElementById('pivot-select-chart-type')?.value || 'bar';
    const period = document.getElementById('pivot-select-period')?.value || 'all';
    const limit = document.getElementById('pivot-select-limit')?.value || '10';
    const sort = document.getElementById('pivot-select-sort')?.value || 'desc';

    const loadingEl = document.getElementById('pivot-preview-loading');
    if (loadingEl) loadingEl.classList.remove('hidden');

    try {
        const url = `/api/dashboard/pivot/?entity=${entity}&group_by=${group_by}&metric=${metric}&agg=${agg}&chart_type=${chart_type}&period=${period}&limit=${limit}&sort=${sort}`;
        const res = await fetchWithAuth(url);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();

        if (data && data.success) {
            currentPivotResultCache = data;

            // Cập nhật Tiêu đề & Tổng số trên Preview
            const titleEl = document.getElementById('pivot-preview-title');
            if (titleEl) titleEl.innerText = data.title;
            const subEl = document.getElementById('pivot-preview-subtitle');
            if (subEl) subEl.innerText = `Nguồn: ${entity.toUpperCase()} | Nhóm: ${group_by} | Loại: ${chart_type}`;
            const totalEl = document.getElementById('pivot-preview-total');
            if (totalEl) totalEl.innerText = data.formatted_total;
            const countEl = document.getElementById('pivot-preview-row-count');
            if (countEl) countEl.innerText = `${data.count} mục`;

            // Vẽ Canvas Preview
            renderPivotChartCanvas('pivot-preview-chart', data, true);

            // Vẽ Bảng Chi Tiết Phân Bổ
            renderPivotMiniTable(data.table_rows, data.unit);
        } else {
            showToast('error', data?.message || 'Không thể tổng hợp dữ liệu biểu đồ', 'Lỗi tổng hợp');
        }
    } catch (err) {
        console.error('fetchAndRenderPivotPreview error:', err);
    } finally {
        if (loadingEl) loadingEl.classList.add('hidden');
    }
}
window.fetchAndRenderPivotPreview = fetchAndRenderPivotPreview;

function renderPivotChartCanvas(canvasId, pivotRes, isPreview = false, isSlot2 = false) {
    const ctx = document.getElementById(canvasId);
    if (!ctx || typeof Chart === 'undefined') return;

    if (isPreview) {
        if (pivotPreviewChart) pivotPreviewChart.destroy();
    } else if (isSlot2 || canvasId === 'bgd-donut-chart') {
        if (bgdDonutChart) bgdDonutChart.destroy();
    } else {
        if (bgdRevenueChart) bgdRevenueChart.destroy();
    }

    const chartType = pivotRes.chart_type || 'bar';
    const isCurrency = pivotRes.is_currency;
    const isHorizontal = (chartType === 'horizontal_bar');
    const actualType = isHorizontal ? 'bar' : (chartType === 'pie' ? 'pie' : (chartType === 'doughnut' ? 'doughnut' : (chartType === 'line' ? 'line' : 'bar')));

    let dataset = {
        label: pivotRes.metric.toUpperCase(),
        data: pivotRes.data,
        backgroundColor: (actualType === 'doughnut' || actualType === 'pie') ? pivotRes.colors : (actualType === 'line' ? 'rgba(15, 118, 110, 0.15)' : pivotRes.colors[0] || 'rgba(15, 118, 110, 0.85)'),
        borderColor: (actualType === 'doughnut' || actualType === 'pie') ? '#ffffff' : (actualType === 'line' ? '#0f766e' : (pivotRes.border_colors[0] || '#0f766e')),
        borderWidth: actualType === 'line' ? 3 : (actualType === 'doughnut' || actualType === 'pie' ? 2 : 1),
        borderRadius: actualType === 'bar' ? 6 : 0,
        fill: actualType === 'line',
        tension: actualType === 'line' ? 0.35 : 0,
        pointBackgroundColor: '#0f766e',
        pointBorderColor: '#ffffff',
        pointRadius: actualType === 'line' ? 4 : 0
    };

    const slotNum = isSlot2 ? 2 : (currentCustomizingSlot || 1);
    const isLabelsActive = isPreview 
        ? (document.getElementById('pivot-toggle-data-labels')?.checked ?? false)
        : (localStorage.getItem('bim_chart_datalabels_' + (isSlot2 ? 2 : (canvasId === 'bgd-donut-chart' ? 2 : 1))) === 'true');

    const config = {
        type: actualType,
        plugins: [chartDataLabelsPlugin],
        data: {
            labels: pivotRes.labels,
            datasets: [dataset]
        },
        options: {
            indexAxis: isHorizontal ? 'y' : 'x',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: isPreview && (actualType === 'doughnut' || actualType === 'pie'),
                    position: 'bottom',
                    labels: {
                        font: { family: "'Inter', sans-serif", size: 10.5, weight: '600' },
                        boxWidth: 9,
                        padding: 6
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#ffffff',
                    bodyColor: '#e2e8f0',
                    padding: 8,
                    borderRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const val = context.raw;
                            if (typeof val === 'number') {
                                const formatted = new Intl.NumberFormat('vi-VN').format(val);
                                return isCurrency ? ` ${context.dataset.label || 'Giá trị'}: ${formatted} đ` : ` ${context.dataset.label || 'Giá trị'}: ${formatted} ${pivotRes.unit || ''}`;
                            }
                            return ` ${context.dataset.label || 'Giá trị'}: ${val} ${pivotRes.unit || ''}`;
                        }
                    }
                },
                customDataLabels: {
                    display: isLabelsActive
                }
            }
        }
    };

    if (actualType === 'doughnut') {
        config.options.cutout = '74%';
    }

    if (actualType !== 'doughnut' && actualType !== 'pie') {
        config.options.layout = { padding: { top: 18, right: 14 } };
        if (isHorizontal) {
            config.options.scales = {
                y: {
                    grid: { display: false },
                    ticks: {
                        font: { family: "'Inter', sans-serif", size: 11.5, weight: '700' },
                        color: '#334155'
                    }
                },
                x: {
                    grid: { color: 'rgba(226, 232, 240, 0.6)' },
                    ticks: {
                        font: { family: "'Inter', sans-serif", size: 11, weight: '600' },
                        color: '#64748b',
                        callback: function(val) {
                            if (isCurrency && val >= 1000000) return (val / 1000000).toFixed(0) + ' tr';
                            return val;
                        }
                    }
                }
            };
        } else {
            config.options.scales = {
                x: {
                    grid: { display: false },
                    ticks: {
                        font: { family: "'Inter', sans-serif", size: 11.5, weight: '700' },
                        color: '#475569',
                        maxRotation: 35,
                        minRotation: 0
                    }
                },
                y: {
                    grid: { color: 'rgba(226, 232, 240, 0.6)' },
                    ticks: {
                        font: { family: "'Inter', sans-serif", size: 12.5, weight: '700' },
                        color: '#1e293b',
                        callback: function(val) {
                            if (isCurrency && val >= 1000000) return (val / 1000000).toFixed(0) + ' tr';
                            return val;
                        }
                    }
                }
            };
        }
    }

    const createdChart = new Chart(ctx, config);
    if (isPreview) {
        pivotPreviewChart = createdChart;
    } else if (isSlot2 || canvasId === 'bgd-donut-chart') {
        bgdDonutChart = createdChart;
    } else {
        bgdRevenueChart = createdChart;
    }
}

function renderPivotMiniTable(rows, unit) {
    const tbody = document.getElementById('pivot-preview-table-body');
    if (!tbody) return;

    if (!Array.isArray(rows) || rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-slate-400 text-xs">Không có dữ liệu phù hợp với bộ lọc</td></tr>';
        return;
    }

    tbody.innerHTML = rows.map((r, i) => `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="py-1.5 px-2 font-mono text-[10px] text-slate-400 font-bold">${i + 1}</td>
            <td class="py-1.5 px-2 font-semibold text-slate-800 truncate max-w-[150px]">${escapeHtml(r.label)}</td>
            <td class="py-1.5 px-2 text-right font-mono font-bold text-teal-800">${escapeHtml(r.formatted_value)}</td>
            <td class="py-1.5 px-2 text-right">
                <div class="flex items-center justify-end gap-1.5">
                    <div class="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div class="bg-teal-600 h-1.5 rounded-full" style="width: ${r.percentage}%"></div>
                    </div>
                    <span class="text-[10px] font-bold text-slate-500 w-8 text-right">${r.percentage}%</span>
                </div>
            </td>
        </tr>
    `).join('');
}

function applyPivotChartToDashboard() {
    if (!currentPivotResultCache) {
        showToast('warning', 'Chưa có dữ liệu để áp dụng. Vui lòng thử lại.', 'Thông báo');
        return;
    }

    const currentConfig = {
        entity: document.getElementById('pivot-select-entity')?.value || 'trips',
        group_by: document.getElementById('pivot-select-group-by')?.value || 'customer',
        metric: document.getElementById('pivot-select-metric')?.value || 'revenue',
        agg: document.getElementById('pivot-select-agg')?.value || 'sum',
        chart_type: document.getElementById('pivot-select-chart-type')?.value || 'bar',
        period: document.getElementById('pivot-select-period')?.value || 'all',
        limit: document.getElementById('pivot-select-limit')?.value || '10',
        sort: document.getElementById('pivot-select-sort')?.value || 'desc',
    };

    const slot = currentCustomizingSlot || 1;

    const showLabels = document.getElementById('pivot-toggle-data-labels')?.checked ?? false;
    localStorage.setItem('bim_chart_datalabels_' + slot, String(showLabels));
    updateDataLabelsButtonState(slot, showLabels);

    // Lưu cấu hình vào localStorage theo slot
    localStorage.setItem('bim_custom_chart_' + slot, JSON.stringify({
        config: currentConfig,
        data: currentPivotResultCache,
        show_data_labels: showLabels
    }));

    // Render trực tiếp lên Slot tương ứng
    renderCustomChartOnSlot(slot, currentPivotResultCache);

    // Đóng Modal và thông báo
    closePivotChartBuilderModal();
    showToast('success', `Đã áp dụng biểu đồ tùy biến cho Biểu đồ ${slot} thành công!`, 'Thành công');
}
window.applyPivotChartToDashboard = applyPivotChartToDashboard;

function renderCustomChartOnSlot(slot, pivotRes) {
    if (!pivotRes) return;

    if (slot === 1) {
        // Cập nhật Tiêu đề Card 1
        const titleEl = document.getElementById('bgd-chart-title');
        if (titleEl) titleEl.innerText = pivotRes.title;
        const subEl = document.getElementById('bgd-chart-subtitle');
        if (subEl) subEl.innerHTML = `<span class="inline-flex items-center gap-1 font-bold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200 text-[10px] mr-1">Tùy biến</span> Nguồn: ${pivotRes.entity.toUpperCase()} | Nhóm: ${pivotRes.group_by} | ${pivotRes.period_label}`;

        // Hiện nút Khôi phục Mặc định Biểu đồ 1
        const resetBtn1 = document.getElementById('btn-reset-chart-1');
        if (resetBtn1) {
            resetBtn1.classList.remove('hidden');
            resetBtn1.classList.add('inline-flex');
        }

        // Cập nhật Legend Header
        const legendEl = document.getElementById('bgd-chart-legend');
        if (legendEl) {
            legendEl.innerHTML = `<span class="inline-flex items-center text-teal-800 font-bold"><span class="w-2 h-2 rounded bg-teal-600 mr-1"></span> ${pivotRes.metric.toUpperCase()} (${pivotRes.unit || ''})</span>`;
        }

        // Vẽ Canvas `#bgd-revenue-trend-chart`
        renderPivotChartCanvas('bgd-revenue-trend-chart', pivotRes, false, false);

        // Cập nhật 3 ô tóm tắt dưới đáy
        const sumEl = document.getElementById('bgd-chart-metrics-summary');
        if (sumEl && pivotRes.table_rows) {
            const topRow = pivotRes.table_rows[0];
            const topVal = topRow ? topRow.formatted_value : '0';

            sumEl.innerHTML = `
                <div class="p-1.5 2xl:p-2 rounded-lg border text-teal-800 bg-slate-50 border-slate-100">
                    <p class="text-[10px] 2xl:text-[10.5px] text-slate-500 font-medium">Tổng Chỉ Số</p>
                    <p class="text-xs 2xl:text-[13px] font-black font-heading mt-0.5 tabular-nums text-teal-800">${pivotRes.formatted_total}</p>
                </div>
                <div class="p-1.5 2xl:p-2 rounded-lg border text-amber-700 bg-slate-50 border-slate-100">
                    <p class="text-[10px] 2xl:text-[10.5px] text-slate-500 font-medium" title="${topRow ? topRow.label : ''}">Top 1 Phân Bổ</p>
                    <p class="text-xs 2xl:text-[13px] font-black font-heading mt-0.5 tabular-nums text-amber-700 truncate">${topVal}</p>
                </div>
                <div class="p-1.5 2xl:p-2 rounded-lg border text-emerald-700 bg-emerald-50/60 border-emerald-100">
                    <p class="text-[10px] 2xl:text-[10.5px] text-emerald-800 font-bold">Số Lượng Phân Nhóm</p>
                    <p class="text-xs 2xl:text-[13px] font-black font-heading mt-0.5 tabular-nums text-emerald-700">${pivotRes.count} nhóm</p>
                </div>
            `;
        }
    } else if (slot === 2) {
        // Cập nhật Tiêu đề Card 2
        const titleEl = document.getElementById('donut-box-title');
        if (titleEl) titleEl.innerText = pivotRes.title;
        const subEl = document.getElementById('donut-box-subtitle');
        if (subEl) subEl.innerHTML = `<span class="inline-flex items-center gap-1 font-bold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200 text-[10px] mr-1">Tùy biến</span> Nguồn: ${pivotRes.entity.toUpperCase()} • ${pivotRes.group_by}`;

        // Hiện nút Khôi phục Mặc định Biểu đồ 2
        const resetBtn2 = document.getElementById('btn-reset-chart-2');
        if (resetBtn2) {
            resetBtn2.classList.remove('hidden');
            resetBtn2.classList.add('inline-flex');
        }

        // Ẩn thanh toggle vai trò (Đội xe / Hải quan) khi đang tùy biến
        const toggleContainer = document.getElementById('donut-toggle-container');
        if (toggleContainer) {
            toggleContainer.classList.add('hidden');
        }

        // Tâm donut: hiện nếu chart_type là doughnut, ẩn nếu chart khác
        const centerContainer = document.getElementById('donut-center-container');
        if (centerContainer) {
            if (pivotRes.chart_type === 'doughnut') {
                centerContainer.classList.remove('hidden');
                const centerVal = document.getElementById('donut-center-value');
                const centerLbl = document.getElementById('donut-center-label');
                if (centerVal) {
                    const totalStr = pivotRes.formatted_total || '';
                    centerVal.innerText = totalStr;
                    const len = totalStr.length;
                    if (len > 12) {
                        centerVal.style.fontSize = '13.5px';
                    } else if (len > 9) {
                        centerVal.style.fontSize = '15px';
                    } else if (len > 6) {
                        centerVal.style.fontSize = '17px';
                    } else {
                        centerVal.style.fontSize = '20px';
                    }
                    centerVal.style.lineHeight = '1.2';
                }
                if (centerLbl) {
                    centerLbl.innerText = 'TỔNG';
                    centerLbl.style.fontSize = '10px';
                }
            } else {
                centerContainer.classList.add('hidden');
            }
        }

        // Cập nhật danh sách thông số / khách hàng ở cột bên phải Biểu đồ 2
        const legendEl = document.getElementById('donut-legend-container');
        if (legendEl && Array.isArray(pivotRes.table_rows)) {
            const palette = [
                'bg-teal-500', 'bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 
                'bg-purple-500', 'bg-rose-500', 'bg-indigo-500', 'bg-cyan-500', 'bg-orange-500', 'bg-slate-400'
            ];
            legendEl.innerHTML = pivotRes.table_rows.map((r, i) => `
                <div class="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                    <span class="flex items-center min-w-0 mr-2">
                        <span class="w-2.5 h-2.5 rounded-full ${palette[i % palette.length]} mr-1.5 shrink-0 shadow-2xs"></span> 
                        <span class="truncate font-semibold text-slate-800 text-[11px] 2xl:text-xs" title="${escapeHtml(r.label)}">${escapeHtml(r.label)}</span>
                    </span>
                    <div class="text-right shrink-0">
                        <span class="font-bold text-slate-900 font-heading text-[11.5px] 2xl:text-xs tabular-nums">${escapeHtml(r.formatted_value)}</span>
                        <span class="text-[10px] font-semibold text-slate-400 ml-1">(${r.percentage}%)</span>
                    </div>
                </div>
            `).join('');
        }

        // Vẽ Canvas `#bgd-donut-chart`
        renderPivotChartCanvas('bgd-donut-chart', pivotRes, false, true);
    }
}
window.renderCustomChartOnSlot = renderCustomChartOnSlot;
window.renderCustomPivotChartOnDashboard = function(data) {
    renderCustomChartOnSlot(1, data);
};

function resetChartSlotToDefault(slot) {
    if (slot === 1) {
        localStorage.removeItem('bim_custom_chart_1');
        localStorage.removeItem('bim_custom_pivot_chart');
        const resetBtn1 = document.getElementById('btn-reset-chart-1');
        if (resetBtn1) {
            resetBtn1.classList.remove('inline-flex');
            resetBtn1.classList.add('hidden');
        }
        renderRoleTrendChart(currentActiveRole);
        showToast('info', 'Đã khôi phục Biểu đồ 1 về mặc định theo vai trò', 'Khôi phục mặc định');
    } else if (slot === 2) {
        localStorage.removeItem('bim_custom_chart_2');
        const resetBtn2 = document.getElementById('btn-reset-chart-2');
        if (resetBtn2) {
            resetBtn2.classList.remove('inline-flex');
            resetBtn2.classList.add('hidden');
        }
        const toggleContainer = document.getElementById('donut-toggle-container');
        if (toggleContainer) {
            toggleContainer.classList.remove('hidden');
        }
        const centerContainer = document.getElementById('donut-center-container');
        if (centerContainer) {
            centerContainer.classList.remove('hidden');
        }
        renderRoleDonut(currentActiveRole, currentDonutOption);
        showToast('info', 'Đã khôi phục Biểu đồ 2 về mặc định theo vai trò', 'Khôi phục mặc định');
    }
}
window.resetChartSlotToDefault = resetChartSlotToDefault;
window.resetToDefaultRoleChart = function() {
    resetChartSlotToDefault(1);
};
