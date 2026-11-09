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
                    if (pct < 3.5) return; // Không vẽ các góc quá hẹp để tránh rối mắt

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
                        textColor = '#047857'; // Xanh lá cây đậm cho Lợi nhuận
                    } else if (lbl.includes('doanh thu') || lbl.includes('lệnh điều')) {
                        textColor = '#1d4ed8'; // Xanh dương đậm cho Doanh thu
                    } else if (lbl.includes('chi phí') || lbl.includes('phí')) {
                        textColor = '#b45309'; // Cam đất đậm cho Chi phí
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

function onPivotDataLabelsToggle() {
    const isChecked = document.getElementById('pivot-toggle-data-labels')?.checked ?? false;
    if (pivotPreviewChart && pivotPreviewChart.options && pivotPreviewChart.options.plugins) {
        if (!pivotPreviewChart.options.plugins.customDataLabels) pivotPreviewChart.options.plugins.customDataLabels = {};
        pivotPreviewChart.options.plugins.customDataLabels.display = isChecked;
        pivotPreviewChart.update();
    }
}
window.onPivotDataLabelsToggle = onPivotDataLabelsToggle;

function renderBgdTrendChart(trend) {
    const ctx = document.getElementById('bgd-revenue-trend-chart');
    if (!ctx || typeof Chart === 'undefined') return;
    if (bgdRevenueChart) {
        bgdRevenueChart.destroy();
    }

    const isCurrency = trend.type === 'currency';

    const isDataLabelsOn = localStorage.getItem('bim_chart_datalabels_1') === 'true';
    updateDataLabelsButtonState(1, isDataLabelsOn);

    bgdRevenueChart = new Chart(ctx, {
        type: 'bar',
        plugins: [chartDataLabelsPlugin],
        data: {
            labels: trend.labels,
            datasets: trend.datasets.map(ds => {
                const labelLower = (ds.label || '').toLowerCase();
                if (ds.type === 'line') {
                    const isProfit = labelLower.includes('lợi nhuận');
                    const lineColor = isProfit ? '#059669' : (ds.borderColor || '#10b981');
                    return {
                        label: ds.label,
                        type: 'line',
                        data: ds.data,
                        borderColor: lineColor,
                        backgroundColor: lineColor,
                        borderWidth: 3.5,
                        pointBackgroundColor: lineColor,
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2.5,
                        pointRadius: 4.5,
                        pointHoverRadius: 6.5,
                        tension: 0.35,
                        order: ds.order || 1
                    };
                }
                // Tách biệt màu sắc rõ nét: Doanh Thu = Xanh Dương (Blue), Chi Phí = Cam Hổ Phách (Amber)
                let barColor = ds.backgroundColor;
                let hoverColor = ds.hoverBackgroundColor || ds.backgroundColor;
                if (labelLower.includes('doanh thu') || labelLower.includes('lệnh điều')) {
                    barColor = 'rgba(37, 99, 235, 0.88)'; // Xanh Dương Royal Blue
                    hoverColor = 'rgba(29, 78, 216, 0.98)';
                } else if (labelLower.includes('chi phí') || labelLower.includes('phí')) {
                    barColor = 'rgba(245, 158, 11, 0.88)'; // Cam Hổ Phách Amber
                    hoverColor = 'rgba(217, 119, 6, 0.98)';
                }
                return {
                    label: ds.label,
                    type: 'bar',
                    data: ds.data,
                    backgroundColor: barColor,
                    hoverBackgroundColor: hoverColor,
                    borderRadius: 6,
                    borderSkipped: false,
                    barPercentage: 0.65,
                    order: ds.order || 2
                };
            })
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
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#ffffff',
                    bodyColor: '#e2e8f0',
                    padding: 10,
                    borderRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const val = context.raw;
                            const ds = context.dataset;
                            if (ds.label && ds.label.includes('%')) {
                                return `${ds.label}: ${val}%`;
                            }
                            if (typeof val === 'number') {
                                const formatted = new Intl.NumberFormat('vi-VN').format(val);
                                return isCurrency ? `${ds.label}: ${formatted} đ` : `${ds.label}: ${formatted}`;
                            }
                            return `${ds.label}: ${val}`;
                        }
                    }
                },
                customDataLabels: {
                    display: isDataLabelsOn
                }
            },
            layout: {
                padding: { top: 18, left: 4, right: 4 }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        font: { family: "'Inter', sans-serif", size: 12, weight: '700' },
                        color: '#334155'
                    }
                },
                y: {
                    grid: { color: 'rgba(226, 232, 240, 0.6)', drawBorder: false },
                    ticks: {
                        font: { family: "'Inter', sans-serif", size: 12.5, weight: '700' },
                        color: '#1e293b',
                        callback: function(value) {
                            if (isCurrency && value >= 1000000) return (value / 1000000).toFixed(0) + ' tr';
                            return value;
                        }
                    }
                }
            }
        }
    });
}

function switchRoleDonutOption(optIdx) {
    currentDonutOption = optIdx;
    renderRoleDonut(currentActiveRole, optIdx);
}
window.switchRoleDonutOption = switchRoleDonutOption;

function renderRoleDonut(role, optIdx = 1) {
    const ctx = document.getElementById('bgd-donut-chart');
    if (!ctx || !bgdDataCache || !bgdDataCache.role_charts || typeof Chart === 'undefined') return;
    if (bgdDonutChart) {
        bgdDonutChart.destroy();
    }

    const roleChartConfig = bgdDataCache.role_charts[role] || bgdDataCache.role_charts['DIRECTOR'];
    const donutConfig = roleChartConfig.donut;
    if (!donutConfig) return;

    // Cập nhật Box Title & Subtitle
    const titleEl = document.getElementById('donut-box-title');
    if (titleEl) titleEl.innerText = donutConfig.title;
    const subEl = document.getElementById('donut-box-subtitle');
    if (subEl) subEl.innerText = donutConfig.subtitle;

    // Cập nhật 2 nút toggle
    const btn1 = document.getElementById('donut-toggle-btn1');
    const btn2 = document.getElementById('donut-toggle-btn2');
    if (btn1 && btn2) {
        btn1.innerText = donutConfig.btn1 || 'Chế độ 1';
        btn2.innerText = donutConfig.btn2 || 'Chế độ 2';
        if (optIdx === 1) {
            btn1.className = 'px-2 py-0.5 rounded bg-white text-teal-800 shadow-xs transition-all font-heading';
            btn2.className = 'px-2 py-0.5 rounded text-slate-500 hover:text-slate-800 transition-all font-heading';
        } else {
            btn2.className = 'px-2 py-0.5 rounded bg-white text-teal-800 shadow-xs transition-all font-heading';
            btn1.className = 'px-2 py-0.5 rounded text-slate-500 hover:text-slate-800 transition-all font-heading';
        }
    }

    const curOpt = optIdx === 1 ? donutConfig.opt1 : donutConfig.opt2;
    if (!curOpt) return;

    // Cập nhật tâm rỗng tự động điều chỉnh font size hài hòa
    const centerValEl = document.getElementById('donut-center-value');
    const centerLblEl = document.getElementById('donut-center-label');
    if (centerValEl && centerLblEl) {
        const valText = curOpt.center_val || '0%';
        centerValEl.innerText = valText;
        centerLblEl.innerText = curOpt.center_lbl || '';
        const len = String(valText).length;
        if (len > 12) {
            centerValEl.style.fontSize = '13.5px';
        } else if (len > 9) {
            centerValEl.style.fontSize = '15px';
        } else if (len > 6) {
            centerValEl.style.fontSize = '17px';
        } else {
            centerValEl.style.fontSize = '20px';
        }
        centerValEl.style.lineHeight = '1.2';
    }

    // Cập nhật chú thích bên dưới
    const legendEl = document.getElementById('donut-legend-container');
    if (legendEl && Array.isArray(curOpt.items)) {
        let legHtml = '';
        curOpt.items.forEach(it => {
            legHtml += `
                <div class="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 transition-colors text-slate-700 border border-transparent hover:border-slate-100">
                    <span class="flex items-center min-w-0 mr-2"><span class="w-2.5 h-2.5 rounded-full ${it.color} mr-1.5 shrink-0 shadow-2xs"></span> <span class="truncate font-semibold text-slate-800 text-[11px] 2xl:text-xs">${it.name}</span></span>
                    <strong class="font-heading text-slate-900 shrink-0 font-bold text-[11.5px] 2xl:text-xs tabular-nums">${it.val}</strong>
                </div>
            `;
        });
        legendEl.innerHTML = legHtml;
    }

    bgdDonutChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: curOpt.labels,
            datasets: [{
                data: curOpt.data,
                backgroundColor: curOpt.colors,
                borderWidth: 2,
                borderColor: '#ffffff',
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '74%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#ffffff',
                    bodyColor: '#e2e8f0',
                    padding: 8,
                    borderRadius: 6
                }
            }
        }
    });
}

// Giữ lại hàm cũ để tương thích ngược nếu có chỗ gọi
function renderBgdRevenueChart(trendData) {
    if (bgdDataCache && bgdDataCache.role_charts) {
        renderRoleCharts(currentActiveRole);
    }
}
function renderBgdDonutChart(type = 'fleet') {
    switchRoleDonutOption(type === 'customs' ? 2 : 1);
}
