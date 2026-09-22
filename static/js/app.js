/**
 * ==========================================================================
 * BIM LOGISTICS — FRONTEND APPLICATION LOGIC (TMS & FLEET)
 * Triết lý: Graceful Notification, Defensive UI & Bim Enterprise Table Standard
 * Kế thừa từ Bim_ERP-Solutions
 * ==========================================================================
 */

let currentActiveTripCode = null;
let currentActiveTripData = null;
let currentOcrMode = 'phi-ton';

const STATUS_STYLE_MAP = {
    'COMPLETED': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'IN_TRANSIT': 'bg-amber-100 text-amber-800 border-amber-300',
    'UNLOADING': 'bg-orange-100 text-orange-800 border-orange-300',
    'DISPATCHED': 'bg-teal-100 text-teal-800 border-teal-300',
    'ACCEPTED': 'bg-blue-100 text-blue-800 border-blue-300',
    'DRAFT': 'bg-slate-100 text-slate-700 border-slate-300',
};

// =========================================================================
// CHUẨN HOÁ ĐỊNH DẠNG SỐ & PHÂN CÁCH HÀNG NGÀN (VIETNAMESE NUMBER FORMATTING)
// =========================================================================
function formatNumberVN(val) {
    if (val === null || val === undefined || val === '') return '';
    const clean = String(val).replace(/\D/g, '');
    if (!clean) return '';
    return new Intl.NumberFormat('vi-VN').format(parseInt(clean, 10));
}

function parseNumberVN(val) {
    if (val === null || val === undefined || val === '') return 0;
    const clean = String(val).replace(/\D/g, '');
    return parseInt(clean, 10) || 0;
}

function formatMoney(n) {
    if (n === null || n === undefined || isNaN(Number(n))) return '0 đ';
    return new Intl.NumberFormat('vi-VN').format(Math.round(Number(n))) + ' đ';
}

function attachAutoNumberFormat(inputEl, onChangeCallback) {
    if (!inputEl || inputEl.dataset.hasNumberFormatter) return;
    inputEl.dataset.hasNumberFormatter = 'true';

    // Định dạng sẵn giá trị hiện tại nếu có
    if (inputEl.value) {
        const clean = String(inputEl.value).replace(/\D/g, '');
        if (clean) {
            inputEl.value = new Intl.NumberFormat('vi-VN').format(parseInt(clean, 10));
        }
    }

    // Xử lý phím Backspace khi đứng ngay sau dấu chấm phân cách hàng ngàn
    inputEl.addEventListener('keydown', function(e) {
        if (e.key === 'Backspace') {
            const pos = this.selectionStart;
            if (pos > 0 && this.selectionStart === this.selectionEnd && this.value[pos - 1] === '.') {
                e.preventDefault();
                const val = this.value;
                this.value = val.slice(0, pos - 2) + val.slice(pos - 1);
                this.setSelectionRange(pos - 1, pos - 1);
                this.dispatchEvent(new Event('input'));
            }
        }
    });

    // Tự động thêm dấu chấm phân cách hàng ngàn theo thời gian thực và duy trì vị trí con trỏ chuột
    inputEl.addEventListener('input', function(e) {
        const rawValue = this.value;
        const cursorPosition = this.selectionStart || 0;
        const digitsOnly = rawValue.replace(/\D/g, '');

        if (!digitsOnly) {
            this.value = '';
            if (onChangeCallback) onChangeCallback(0);
            return;
        }

        const formatted = new Intl.NumberFormat('vi-VN').format(parseInt(digitsOnly, 10));
        this.value = formatted;

        // Định vị lại con trỏ tương ứng với số chữ số trước con trỏ cũ
        const digitsBeforeCursor = rawValue.slice(0, cursorPosition).replace(/\D/g, '').length;
        let newCursor = formatted.length;
        if (digitsBeforeCursor === 0) {
            newCursor = 0;
        } else {
            let digitsCounted = 0;
            for (let i = 0; i < formatted.length; i++) {
                if (/\d/.test(formatted[i])) {
                    digitsCounted++;
                }
                if (digitsCounted === digitsBeforeCursor) {
                    newCursor = i + 1;
                    break;
                }
            }
        }
        this.setSelectionRange(newCursor, newCursor);

        if (onChangeCallback) onChangeCallback(parseInt(digitsOnly, 10));
    });
}

function initAllNumberInputs() {
    document.querySelectorAll('.input-number-vn, [data-format="number"]').forEach(el => {
        const cb = (el.id === 'quote-unit-price' || el.id === 'quote-monthly-trips') 
            ? calculateQuoteExpectedRevenue 
            : null;
        attachAutoNumberFormat(el, cb);
    });
}

// --- GRACEFUL TOAST NOTIFICATION (Bim_ERP-Solutions Standard) ---
function showToast(type, message, title = '') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const typeClass = type === 'success' ? 'toast-success' :
                      type === 'danger' ? 'toast-danger' : 'toast-warning';
    
    const icon = type === 'success' ? 'ph-fill ph-check-circle text-emerald-600' :
                 type === 'danger' ? 'ph-fill ph-x-circle text-rose-600' : 'ph-fill ph-warning-circle text-amber-600';

    toast.className = `toast-notification ${typeClass}`;
    toast.innerHTML = `
        <i class="${icon} text-2xl shrink-0 mt-0.5"></i>
        <div class="flex-1 min-w-0">
            ${title ? `<h5 class="font-bold text-[14px] leading-snug font-heading mb-0.5">${title}</h5>` : ''}
            <p class="text-[13px] leading-relaxed font-medium">${message}</p>
        </div>
        <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-slate-600 p-1 shrink-0">
            <i class="ph ph-x text-base"></i>
        </button>
    `;

    container.appendChild(toast);

    // Tự động đóng sau 4.5 giây
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(30px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }
    }, 4500);
}

// Biến lưu trữ biểu đồ và dữ liệu Dashboard
let bgdRevenueChart = null;
let bgdDonutChart = null;
let currentDonutType = 'fleet';
let bgdDataCache = null;
let previousActiveTab = 'dashboard';

// --- 1. TẢI DỮ LIỆU BAN GIÁM ĐỐC (CHUẨN QUỐC TẾ TMS & HẢI QUAN) ---
async function loadDashboardData() {
    try {
        const res = await fetch('/api/dashboard/');
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
        if (cashEl) cashEl.innerText = new Intl.NumberFormat('vi-VN').format(fin.cash_on_hand || 150000000) + ' đ';
        const bankEl = document.getElementById('bgd-bank-val');
        if (bankEl) bankEl.innerText = new Intl.NumberFormat('vi-VN').format(fin.bank_balance || 1250000000) + ' đ';

        // Pillar 2: Vận hành
        const todayTripsEl = document.getElementById('bgd-today-trips');
        if (todayTripsEl) todayTripsEl.innerText = prod.today_active ?? 5;
        const totalTripsEl = document.getElementById('bgd-total-trips');
        if (totalTripsEl) totalTripsEl.innerText = prod.total_trips ?? 16;
        const yesterdayTripsEl = document.getElementById('bgd-yesterday-trips');
        if (yesterdayTripsEl) yesterdayTripsEl.innerText = prod.completed_yesterday ?? 8;
        const otdRateEl = document.getElementById('bgd-otd-rate');
        if (otdRateEl) otdRateEl.innerText = `${prod.ontime_delivery_rate || 98.2}% OTD`;

        // Pillar 3: Đội xe & Nhân sự
        const utilizationEl = document.getElementById('bgd-fleet-utilization');
        if (utilizationEl) utilizationEl.innerText = `${fleet.utilization_rate || 62.5}%`;
        const fleetActiveEl = document.getElementById('bgd-fleet-active');
        if (fleetActiveEl) fleetActiveEl.innerText = fleet.active ?? 5;
        const fleetTotalEl = document.getElementById('bgd-fleet-total');
        if (fleetTotalEl) fleetTotalEl.innerText = fleet.total ?? 8;
        const fleetIdleEl = document.getElementById('bgd-fleet-idle');
        if (fleetIdleEl) fleetIdleEl.innerText = fleet.idle ?? 3;
        const fleetMaintEl = document.getElementById('bgd-fleet-maint');
        if (fleetMaintEl) fleetMaintEl.innerText = fleet.maintenance ?? 0;
        const hrActiveEl = document.getElementById('bgd-hr-active');
        if (hrActiveEl) hrActiveEl.innerText = `${pers.active || 7}/10 Tài xế`;

        // Pillar 4: Đơn hàng & Hải quan
        const customsGreenEl = document.getElementById('bgd-customs-green');
        if (customsGreenEl) customsGreenEl.innerText = comm.customs_green ?? 85;
        const pendingBookingsEl = document.getElementById('bgd-pending-bookings');
        if (pendingBookingsEl) pendingBookingsEl.innerText = `${comm.pending_bookings ?? 6} đơn`;

        // 2. Khởi tạo Biểu đồ Chart.js nếu có thư viện
        if (typeof Chart !== 'undefined' && data.charts) {
            renderBgdRevenueChart(data.charts.daily_trend);
            renderBgdDonutChart(currentDonutType);
        }

        // 3. Render Bảng P&L Chuyến Xe Hỗ Trợ Click Mở Chi Tiết Chuyến
        const pnlTbody = document.getElementById('bgd-pnl-tbody');
        if (pnlTbody && data.trips_pnl) {
            pnlTbody.innerHTML = '';
            data.trips_pnl.forEach(item => {
                const tr = document.createElement('tr');
                tr.className = 'hover:bg-teal-50/40 transition-colors cursor-pointer group row-multiline border-b border-slate-200/70';
                tr.title = `Bấm để xem chi tiết hồ sơ chuyến [${item.trip_code}]`;
                tr.onclick = () => {
                    viewTripDetail(item.trip_code);
                };

                let statusBadge = `<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 font-heading">${item.status_label || item.status}</span>`;
                if (item.status === 'COMPLETED') {
                    statusBadge = `<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-heading">Đã hoàn tất</span>`;
                } else if (['IN_TRANSIT', 'ACCEPTED', 'CONTAINER_PICKED', 'AT_WAREHOUSE', 'UNLOADING', 'RETURNING_EMPTY'].includes(item.status)) {
                    statusBadge = `<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 font-heading">Đang vận hành</span>`;
                }

                const marginVal = item.margin_percent || 0;
                const barColor = marginVal >= 50 ? 'bg-emerald-500' : (marginVal >= 25 ? 'bg-amber-500' : 'bg-rose-500');

                tr.innerHTML = `
                    <td class="py-1.5 px-3 border-r border-slate-200/70 font-black text-teal-800 font-heading text-[13px]">
                        <div class="flex items-center space-x-1">
                            <span>${item.trip_code}</span>
                            <i class="ph ph-arrow-square-out text-slate-400 group-hover:text-teal-600 transition-colors text-xs"></i>
                        </div>
                    </td>
                    <td class="py-1.5 px-3 border-r border-slate-200/70">
                        <p class="font-bold text-slate-900 text-[13px] leading-tight">${item.customer_name}</p>
                        <p class="text-[11.5px] text-slate-500 font-medium truncate max-w-xs mt-0.5 leading-tight">${item.route}</p>
                    </td>
                    <td class="py-1.5 px-3 border-r border-slate-200/70">
                        <p class="font-bold text-slate-900 text-[13px] leading-tight">${item.driver_name}</p>
                        <p class="text-[11.5px] text-teal-700 font-mono font-bold mt-0.5 leading-tight">${item.license_plate}</p>
                    </td>
                    <td class="py-1.5 px-3 border-r border-slate-200/70 font-mono text-slate-800 font-bold text-[12.5px]">${item.container_number}</td>
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
    } catch (err) {
        console.error('Error loading dashboard data:', err);
        showToast('warning', 'Không thể tải dữ liệu Ban Giám Đốc. Vui lòng kiểm tra lại kết nối.', 'Cảnh báo');
    }
}

// Biểu đồ Cột & Đường Doanh thu, Chi phí, Lợi nhuận gộp
function renderBgdRevenueChart(trendData) {
    const ctx = document.getElementById('bgd-revenue-trend-chart');
    if (!ctx) return;
    if (bgdRevenueChart) {
        bgdRevenueChart.destroy();
    }
    
    bgdRevenueChart = new Chart(ctx, {
        type: 'bar',
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

// --- 2. TẢI DỮ LIỆU PHÒNG ĐIỀU VẬN (TRIPS) ---
async function loadTripsData() {
    try {
        const searchInput = document.getElementById('table-search-input');
        const searchVal = searchInput ? searchInput.value : '';
        const statusSelect = document.getElementById('status-filter-select');
        const statusVal = statusSelect ? statusSelect.value : 'Tất cả trạng thái';
        
        let url = `/api/trips/?q=${encodeURIComponent(searchVal)}&status=${encodeURIComponent(statusVal)}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error('Lỗi tải danh sách chuyến');
        const data = await res.json();

        // Cập nhật stats
        const totalTripsEl = document.getElementById('stat-total-trips');
        if (totalTripsEl) totalTripsEl.innerText = new Intl.NumberFormat('vi-VN').format(data.stats.total_trips_monthly || 0);
        const transitEl = document.getElementById('stat-transit');
        if (transitEl) transitEl.innerText = new Intl.NumberFormat('vi-VN').format(data.stats.transit_count || 0);
        const pendExpEl = document.getElementById('stat-pending-expenses');
        if (pendExpEl) pendExpEl.innerText = new Intl.NumberFormat('vi-VN').format(data.stats.pending_expenses_count || 0);

        const tbody = document.getElementById('trips-tbody');
        tbody.innerHTML = '';

        data.trips.forEach(trip => {
            const typeColor = trip.type_raw === 'IMPORT' ? 'bg-blue-100 text-blue-700' : 
                              trip.type_raw === 'EXPORT' ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700';
            const statusCls = STATUS_STYLE_MAP[trip.status] || 'bg-slate-100 text-slate-700 border-slate-300';

            const tr = document.createElement('tr');
            tr.className = 'hover:bg-teal-50/40 transition-colors cursor-pointer group row-multiline border-b border-slate-200/80';
            tr.onclick = () => viewTripDetail(trip.id);
            
            tr.innerHTML = `
                <td class="px-3 py-2 border-r border-slate-200/70">
                    <div class="flex items-center space-x-2">
                        <span class="font-bold text-teal-800 font-heading text-[13px]">${trip.id}</span>
                    </div>
                    <div class="flex items-center space-x-1.5 text-[11.5px] font-medium text-slate-500 mt-0.5">
                        <i class="ph ph-calendar text-slate-400 text-xs"></i>
                        <span>${trip.loading_date}</span>
                        ${trip.loading_time ? `<span class="text-teal-800 bg-teal-100/80 px-1 py-0.2 rounded font-bold text-[11px]">${trip.loading_time}</span>` : ''}
                    </div>
                </td>
                <td class="px-3 py-2 border-r border-slate-200/70">
                    <p class="font-bold text-slate-900 text-[13px] leading-snug truncate" title="${trip.customer}">${trip.customer}</p>
                    <p class="text-[11.5px] text-slate-500 font-medium mt-0.5 flex items-center gap-1.5 truncate" title="${trip.warehouse}">
                        <i class="ph ph-warehouse text-slate-400 text-xs shrink-0"></i>
                        <span>${trip.warehouse}</span>
                    </p>
                </td>
                <td class="px-3 py-2 border-r border-slate-200/70">
                    <div class="flex items-center space-x-1.5 font-mono font-bold text-slate-900 text-[13px]">
                        <i class="ph ph-barcode text-teal-600 text-sm"></i>
                        <span>${trip.container}</span>
                    </div>
                    <div class="text-[11.5px] text-slate-500 mt-0.5 flex items-center space-x-1.5 font-medium">
                        <span>B/L: <strong class="text-slate-800 font-mono font-bold">${trip.booking}</strong></span>
                        ${trip.seal && trip.seal !== '-' ? `<span class="text-slate-300">|</span> <span>Seal: <strong class="text-slate-800 font-mono font-bold">${trip.seal}</strong></span>` : ''}
                    </div>
                </td>
                <td class="px-3 py-2 border-r border-slate-200/70">
                    <div class="flex items-center space-x-1.5">
                        ${trip.commercial_invoice && trip.commercial_invoice !== '-' ? `
                            <span class="font-mono text-[11.5px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded shadow-2xs" title="Hóa đơn thương mại">
                                <i class="ph ph-file-text"></i> ${trip.commercial_invoice}
                            </span>
                        ` : `<span class="text-slate-400 text-[11.5px] italic">-</span>`}
                    </div>
                    <div class="mt-0.5">
                        ${trip.warehouse_dock && trip.warehouse_dock !== '-' ? `
                            <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 font-heading">
                                DOCK: ${trip.warehouse_dock}
                            </span>
                        ` : `<span class="text-[11.5px] text-slate-400 font-medium">Chưa chỉ định dock</span>`}
                    </div>
                </td>
                <td class="px-3 py-2 border-r border-slate-200/70">
                    <div class="flex items-center space-x-1.5">
                        <span class="font-bold text-slate-900 font-mono text-[13px]">${trip.vehicle}</span>
                        ${trip.vehicle_ownership_code === 'OWNED' 
                            ? `<span class="px-1.5 py-0.2 text-[10.5px] font-black uppercase rounded bg-teal-100 text-teal-800 border border-teal-200">Xe Nhà</span>`
                            : `<span class="px-1.5 py-0.2 text-[10.5px] font-black uppercase rounded bg-amber-100 text-amber-800 border border-amber-200">Xe Bạn</span>`
                        }
                    </div>
                    <div class="text-[11.5px] text-slate-500 mt-0.5 flex items-center space-x-1.5">
                        <span>Tài xế: <strong class="text-slate-900 font-bold">${trip.driver}</strong></span>
                        ${trip.dropoff_vehicle && trip.dropoff_vehicle !== '-' && trip.dropoff_vehicle !== trip.vehicle ? `
                            <span class="text-slate-300">|</span>
                            <span class="text-indigo-700 font-bold font-mono text-[11.5px]" title="Xe hạ bãi">Hạ: ${trip.dropoff_vehicle}</span>
                        ` : ''}
                    </div>
                </td>
                <td class="px-3 py-2 border-r border-slate-200/70">
                    <div class="flex items-center">
                        <span class="px-1.5 py-0.2 rounded text-[10.5px] font-bold uppercase tracking-wider ${trip.cont_location_type === 'BÃI TVL' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-slate-100 text-slate-700 border border-slate-200'}">
                            <i class="ph ph-map-pin"></i> ${trip.cont_location_type}
                        </span>
                    </div>
                    <p class="text-[11.5px] text-slate-500 font-medium italic line-clamp-1 max-w-[200px] mt-0.5" title="${trip.cargo_notes || 'Không có lưu ý'}">
                        ${trip.cargo_notes ? `<i class="ph ph-info text-amber-600"></i> ${trip.cargo_notes}` : '<span class="text-slate-400 font-normal">Không có lưu ý</span>'}
                    </p>
                </td>
                <td class="px-3 py-2 border-r border-slate-200/70">
                    <div class="text-[13px] font-bold text-slate-800 flex items-center space-x-1.5 truncate" title="${trip.pickup} ➔ ${trip.dropoff || 'Hạ bãi'}">
                        <span class="text-teal-700">${trip.pickup}</span>
                        <i class="ph ph-arrow-right text-slate-400 text-xs shrink-0"></i>
                        <span class="text-indigo-700">${trip.dropoff || 'Bãi rỗng'}</span>
                    </div>
                    <div class="mt-0.5 flex items-center space-x-2 text-[11.5px]">
                        <span class="px-1.5 py-0.2 rounded text-[10px] font-black uppercase font-heading ${typeColor}">${trip.type}</span>
                        <span class="text-rose-600 font-mono font-bold text-[12px] tabular-nums">${new Intl.NumberFormat('vi-VN').format(trip.expense)} đ</span>
                    </div>
                </td>
                <td class="px-3 py-2 text-center">
                    <span class="px-2.5 py-1 rounded-full text-[11px] font-bold border uppercase tracking-wider font-heading inline-block ${statusCls}">
                        ${trip.status_label}
                    </span>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error loading trips data:', err);
    }
}

// --- 3. XEM CHI TIẾT CHUYẾN XE & BẢNG KÊ CHI PHÍ TRIỀN VÕ ---
async function viewTripDetail(tripCode) {
    currentActiveTripCode = tripCode;
    try {
        const res = await fetch(`/api/trips/${tripCode}/`);
        if (!res.ok) throw new Error('Không tìm thấy chuyến');
        const trip = await res.json();
        // Lưu vết tab trước đó để nút Quay lại hoạt động chuẩn xác
        const currentActiveView = document.querySelector('.view:not(.hidden-view)');
        if (currentActiveView && currentActiveView.id !== 'view-trip-detail') {
            previousActiveTab = currentActiveView.id.replace('view-', '');
        }

        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden-view'));
        const detailView = document.getElementById('view-trip-detail');
        detailView.classList.remove('hidden-view');

        // Thông tin chung
        document.getElementById('detail-id').innerText = trip.id;
        document.getElementById('detail-type').innerText = trip.type;
        document.getElementById('detail-customer').innerText = trip.customer;
        document.getElementById('detail-driver').innerText = trip.driver;
        const vehPlateEl = document.getElementById('detail-vehicle-plate');
        if (vehPlateEl) vehPlateEl.innerText = trip.vehicle;

        // Phân loại nguồn xe
        const ownerBadge = document.getElementById('detail-ownership-badge');
        if (ownerBadge) {
            if (trip.vehicle_ownership_code === 'OWNED') {
                ownerBadge.innerText = 'Xe Nhà';
                ownerBadge.className = 'text-[9.5px] font-black uppercase px-1.5 py-0.2 rounded bg-teal-100 text-teal-800 border border-teal-200';
            } else {
                ownerBadge.innerText = 'Xe Bạn';
                ownerBadge.className = 'text-[9.5px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200';
            }
        }

        // Xe hạ
        const dropoffVehEl = document.getElementById('detail-dropoff-vehicle-info');
        if (dropoffVehEl) {
            if (trip.dropoff_vehicle && trip.dropoff_vehicle !== '-' && trip.dropoff_vehicle !== trip.vehicle) {
                dropoffVehEl.innerText = `Xe hạ: ${trip.dropoff_vehicle}`;
                dropoffVehEl.classList.remove('hidden');
            } else {
                dropoffVehEl.innerText = '';
                dropoffVehEl.classList.add('hidden');
            }
        }
        
        document.getElementById('detail-cont').innerText = trip.container;
        const contTypeEl = document.getElementById('detail-cont-type');
        if (contTypeEl) contTypeEl.innerText = trip.vgm_weight !== '-' ? `Loại: Cont 40 | VGM: ${trip.vgm_weight}` : 'Loại: Cont 40';

        // Vị trí cont
        const contLocBadge = document.getElementById('detail-cont-location-badge');
        if (contLocBadge) contLocBadge.innerText = trip.cont_location_type || 'Nhà máy';

        document.getElementById('detail-booking').innerText = trip.booking !== '-' ? `B/L: ${trip.booking}` : 'B/L: Chưa có';
        document.getElementById('detail-seal').innerText = trip.seal !== '-' ? `Seal: ${trip.seal}` : 'Seal: Chưa cập nhật';
        
        // Commercial Invoice & Dock
        const invoiceEl = document.getElementById('detail-invoice');
        if (invoiceEl) invoiceEl.innerText = trip.commercial_invoice || '-';
        const dockEl = document.getElementById('detail-dock');
        if (dockEl) dockEl.innerText = trip.warehouse_dock && trip.warehouse_dock !== '-' ? `DOCK: ${trip.warehouse_dock}` : 'DOCK: Chưa chỉ định';

        // 5 Mốc thời gian tại kho khách hàng
        const etaEl = document.getElementById('detail-eta-time');
        if (etaEl) etaEl.innerText = trip.eta_warehouse_time || '-';
        const callInEl = document.getElementById('detail-call-in-time');
        if (callInEl) callInEl.innerText = trip.warehouse_call_in_time || '-';
        const actualInEl = document.getElementById('detail-actual-in-time');
        if (actualInEl) actualInEl.innerText = trip.actual_gate_in_time || '-';
        const callOutEl = document.getElementById('detail-call-out-time');
        if (callOutEl) callOutEl.innerText = trip.warehouse_call_out_time || '-';
        const actualOutEl = document.getElementById('detail-actual-out-time');
        if (actualOutEl) actualOutEl.innerText = trip.actual_gate_out_time || '-';

        // Lịch đóng hàng & Cắt máng
        const loadSchedEl = document.getElementById('detail-loading-schedule');
        if (loadSchedEl) loadSchedEl.innerText = `${trip.loading_date} (Giờ: ${trip.loading_time || '8H'})`;
        const cutoffEl = document.getElementById('detail-cutoff');
        if (cutoffEl) cutoffEl.innerText = trip.cutoff || '-';
        const notesEl = document.getElementById('detail-cargo-notes');
        if (notesEl) notesEl.innerText = trip.cargo_notes || 'Không có lưu ý đặc biệt';

        // Hành trình 3 điểm
        document.getElementById('detail-pickup').innerText = trip.pickup;
        document.getElementById('detail-warehouse').innerText = trip.warehouse;
        document.getElementById('detail-dropoff').innerText = trip.dropoff || 'Hạ bãi rỗng';

        // Link Zalo tài xế
        const zaloLink = document.getElementById('zalo-driver-link');
        if (zaloLink) {
            zaloLink.href = trip.driver_phone ? `https://zalo.me/${trip.driver_phone}` : '#';
        }

        // Status Badge
        const statusCls = STATUS_STYLE_MAP[trip.status] || 'bg-slate-100 text-slate-700 border-slate-300';
        const badge = document.getElementById('detail-status-badge');
        badge.className = `px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider font-heading ${statusCls}`;
        badge.innerText = trip.status_label;

        // Trạng thái Chốt Sổ Kế Toán (Settlement Controls)
        const settleCont = document.getElementById('settlement-status-container');
        const btnAddHead = document.getElementById('btn-header-add-expense');
        const btnAddTbl = document.getElementById('btn-add-expense-table');
        const banner = document.getElementById('cost-sheet-settled-banner');

        if (trip.is_expenses_settled) {
            if (settleCont) {
                settleCont.innerHTML = `
                    <div class="flex items-center space-x-1.5">
                        <span class="px-3 py-1.5 rounded-xl text-xs font-black bg-purple-100 text-purple-900 border border-purple-300 flex items-center shadow-sm font-heading" title="Chốt bởi ${trip.settled_by || 'Kế toán'} lúc ${trip.settled_at}">
                            <i class="ph-fill ph-lock-key mr-1 text-purple-700 text-sm"></i> ĐÃ CHỐT SỔ KẾ TOÁN
                        </span>
                        <button onclick="unsettleTripExpenses()" class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition-colors flex items-center font-heading" title="Mở khóa sổ để hiệu chỉnh chi phí">
                            <i class="ph ph-lock-key-open mr-1"></i> Mở Sổ
                        </button>
                    </div>
                `;
            }
            if (btnAddHead) btnAddHead.classList.add('hidden');
            if (btnAddTbl) btnAddTbl.classList.add('hidden');
            if (banner) {
                banner.classList.remove('hidden');
                const desc = document.getElementById('cost-sheet-settled-desc');
                if (desc) desc.innerText = `Chốt bởi ${trip.settled_by || 'Kế toán viên'} vào lúc ${trip.settled_at || 'gần đây'}. Dữ liệu chi phí đã khóa cứng đối soát.`;
            }
        } else {
            if (settleCont) {
                settleCont.innerHTML = `
                    <button onclick="settleTripExpenses()" class="px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-sm flex items-center transition-all font-heading">
                        <i class="ph-fill ph-lock-simple mr-1.5 text-base text-indigo-200"></i> Chốt Sổ Kế Toán
                    </button>
                `;
            }
            if (btnAddHead) btnAddHead.classList.remove('hidden');
            if (btnAddTbl) btnAddTbl.classList.remove('hidden');
            if (banner) banner.classList.add('hidden');
        }

        // P&L Summary Cards
        const formatMoney = (n) => new Intl.NumberFormat('vi-VN').format(n) + ' đ';
        if (document.getElementById('pnl-revenue')) document.getElementById('pnl-revenue').innerText = formatMoney(trip.financials.revenue);
        if (document.getElementById('pnl-expense')) document.getElementById('pnl-expense').innerText = formatMoney(trip.financials.expense);
        if (document.getElementById('pnl-profit')) {
            const profitEl = document.getElementById('pnl-profit');
            profitEl.innerText = `${formatMoney(trip.financials.profit)} (${trip.financials.margin_percent}%)`;
        }

        // --- RENDER BẢNG KÊ CHI PHÍ (8 MỤC CHUẨN TRIỀN VÕ) ---
        renderCostSheetTable(trip);

        // --- RENDER MOBILE SIMULATOR DATA ---
        renderDriverMobileApp(trip);

        // --- RENDER TIMELINE 10 BƯỚC ---
        const tContainer = document.getElementById('detail-timeline');
        if (tContainer) {
            tContainer.innerHTML = '';
            const timelineList = trip.timeline || [];
            if (timelineList.length === 0) {
                tContainer.innerHTML = `
                    <div class="py-6 text-center text-slate-400 text-xs italic">
                        <i class="ph ph-clock-counter-clockwise text-xl text-slate-300 block mb-1"></i>
                        Đang khởi tạo các mốc tiến độ điều vận...
                    </div>
                `;
            } else {
                timelineList.forEach(item => {
                    let borderClass = 'border-slate-300 bg-white';
                    let dotHtml = `<span class="text-[9.5px] font-bold text-slate-400">${item.step}</span>`;
                    let textClass = 'text-slate-500 font-medium';
                    let badgeHtml = '';
                    
                    if (item.active) {
                        borderClass = 'border-teal-600 ring-4 ring-teal-100 bg-teal-50';
                        dotHtml = '<div class="w-2.5 h-2.5 bg-teal-600 rounded-full animate-pulse"></div>';
                        textClass = 'text-teal-900 font-bold';
                        badgeHtml = '<span class="ml-2 px-2 py-0.5 rounded text-[10px] font-black bg-teal-100 text-teal-800 border border-teal-300 whitespace-nowrap animate-pulse">ĐANG THỰC HIỆN</span>';
                    } else if (item.done) {
                        borderClass = 'border-emerald-500 bg-emerald-50';
                        dotHtml = '<i class="ph-bold ph-check text-[11px] text-emerald-600"></i>';
                        textClass = 'text-slate-800 font-bold';
                        badgeHtml = '<span class="ml-2 px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">Hoàn thành</span>';
                    }

                    tContainer.innerHTML += `
                        <div class="relative py-2 timeline-item">
                            <div class="timeline-line"></div>
                            <div class="absolute left-0 top-[10px] w-6 h-6 rounded-full border-2 flex items-center justify-center z-10 transition-all shadow-2xs ${borderClass}">
                                ${dotHtml}
                            </div>
                            <div class="pl-10">
                                <div class="flex items-center flex-wrap gap-1">
                                    <span class="text-[13.5px] tracking-tight ${textClass}">${item.title}</span>
                                    ${badgeHtml}
                                </div>
                                ${item.time ? `
                                    <p class="text-[11px] mt-0.5 font-medium text-slate-500 flex items-center">
                                        <i class="ph ph-clock mr-1 text-slate-400 text-xs"></i>
                                        <span>${item.time}</span>
                                    </p>
                                ` : ''}
                            </div>
                        </div>
                    `;
                });
            }
        }

        // --- RENDER DANH SÁCH CHỨNG TỪ GỐC & HÓA ĐƠN ĐIỆN TỬ ---
        const docContainer = document.getElementById('detail-documents');
        if (docContainer) {
            docContainer.innerHTML = '';
            const docList = trip.documents || [];
            if (docList.length === 0) {
                docContainer.innerHTML = `
                    <div class="py-4 text-center text-slate-400 text-xs italic md:col-span-2">
                        <i class="ph ph-file-dashed text-xl text-slate-300 block mb-1"></i>
                        Chưa có chứng từ đính kèm cho chuyến xe này.
                    </div>
                `;
            } else {
                docList.forEach(doc => {
                    // Xác định icon, màu sắc và danh mục chứng từ
                    let iconClass = 'ph-fill ph-file-text text-teal-600';
                    let iconBg = 'bg-teal-50 border-teal-200';
                    let tagLabel = doc.type_label || 'Chứng từ';

                    if (doc.type === 'EIR_PICKUP') {
                        iconClass = 'ph-fill ph-truck text-blue-600';
                        iconBg = 'bg-blue-50 border-blue-200';
                        tagLabel = 'Phiếu EIR Lấy Cont';
                    } else if (doc.type === 'EIR_DROPOFF') {
                        iconClass = 'ph-fill ph-arrow-down-left text-indigo-600';
                        iconBg = 'bg-indigo-50 border-indigo-200';
                        tagLabel = 'Phiếu EIR Hạ Cont';
                    } else if (doc.type === 'POD') {
                        iconClass = 'ph-fill ph-signature text-emerald-600';
                        iconBg = 'bg-emerald-50 border-emerald-200';
                        tagLabel = 'Biên bản POD';
                    } else if (doc.type === 'INVOICE') {
                        iconClass = 'ph-fill ph-receipt text-amber-600';
                        iconBg = 'bg-amber-50 border-amber-200';
                        tagLabel = 'Hóa đơn / Biên nhận';
                    } else if (doc.type === 'WEIGHT_TICKET') {
                        iconClass = 'ph-fill ph-scales text-purple-600';
                        iconBg = 'bg-purple-50 border-purple-200';
                        tagLabel = 'Phiếu cân';
                    } else if (doc.type === 'CONTAINER_CHECK') {
                        iconClass = 'ph-fill ph-shield-check text-cyan-600';
                        iconBg = 'bg-cyan-50 border-cyan-200';
                        tagLabel = 'Giám định vỏ cont';
                    }

                    docContainer.innerHTML += `
                        <div class="flex items-center p-3 border border-slate-200 rounded-xl bg-slate-50/70 hover:bg-slate-100/90 transition-all shadow-2xs">
                            <div class="w-10 h-10 rounded-lg ${iconBg} border flex items-center justify-center mr-3 shrink-0">
                                <i class="${iconClass} text-xl"></i>
                            </div>
                            <div class="flex-1 min-w-0 pr-2">
                                <div class="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                                    <span class="text-[10px] font-black uppercase px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-heading">${tagLabel}</span>
                                    <p class="text-[13px] font-bold text-slate-900 truncate" title="${doc.name}">${doc.name}</p>
                                </div>
                                <p class="text-[11px] font-medium text-slate-600 truncate mt-0.5">${doc.details}</p>
                                <p class="text-[10px] text-slate-400 mt-0.5 flex items-center font-mono">
                                    <i class="ph ph-clock mr-1 text-[10px]"></i>${doc.time}
                                </p>
                            </div>
                            <span class="text-[10px] px-2 py-0.5 ${doc.is_verified ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'} border rounded-md font-bold font-heading shrink-0">
                                ${doc.is_verified ? 'Đã Nghiệm Thu' : 'Chờ Đối Chiếu'}
                            </span>
                        </div>
                    `;
                });
            }
        }

    } catch (err) {
        console.error('Error fetching trip detail:', err);
        showToast('danger', 'Không thể mở chi tiết chuyến xe.', 'Lỗi');
    }
}

// Hàm render Bảng Kê Chi Phí 8 Mục chuẩn theo 5 ảnh thực tế của Triền Võ
function renderCostSheetTable(trip) {
    const tbody = document.getElementById('cost-sheet-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const formatMoney = (n) => new Intl.NumberFormat('vi-VN').format(n) + ' đ';

    const costItems = [
        {
            stt: 1,
            title: 'HĐ điện tử',
            key: 'fee_einvoice',
            sub: 'Thông tin hóa đơn điện tử Cảng / Depot tra cứu',
            getVal: (t) => {
                const invExpenses = (t.expenses || []).filter(e => e.invoice_number);
                if (invExpenses.length === 0) return { text: 'Chưa có HĐĐT', hasInv: false };
                return {
                    text: invExpenses.map(e => `Số HĐ: ${e.invoice_number} (Mã: ${e.invoice_lookup_code || 'N/A'})`).join('; '),
                    hasInv: true,
                    lookup_url: invExpenses[0].invoice_lookup_url
                };
            }
        },
        { stt: 2, title: 'Nâng', code: 'LIFT_ON', key: 'fee_lift_on' },
        { stt: 3, title: 'Hạ', code: 'LIFT_OFF', key: 'fee_lift_off' },
        { stt: 4, title: 'Cược cont', code: 'CONTAINER_DEPOSIT', key: 'fee_deposit' },
        { stt: 5, title: 'Cân xe', code: 'WEIGHING', key: 'fee_weighing' },
        { stt: 6, title: 'Bốc xếp', code: 'LABOR_STEVEDORING', key: 'fee_labor' },
        { stt: 7, title: 'Vé cầu đường', code: 'TOLL_FEE', key: 'fee_toll' },
        { stt: 8, title: 'Chi phí khác', code: 'OTHER', key: 'fee_other' },
    ];

    let totalCalculated = 0;

    costItems.forEach(item => {
        if (item.key === 'fee_einvoice') {
            const einvInfo = item.getVal(trip);
            tbody.innerHTML += `
                <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-200/70">
                    <td class="py-1.5 px-3 text-center text-slate-400 font-bold border-r border-slate-200/70">${item.stt}</td>
                    <td class="py-1.5 px-3 border-r border-slate-200/70">
                        <span class="font-bold text-slate-900 text-[13px]">${item.title}</span>
                        <p class="text-[11.5px] text-slate-400 mt-0.5">${item.sub}</p>
                    </td>
                    <td class="py-1.5 px-3 text-right text-slate-400 font-medium border-r border-slate-200/70">-</td>
                    <td class="py-1.5 px-3 border-r border-slate-200/70" colspan="2">
                        ${einvInfo.hasInv ? `
                            <div class="flex items-center space-x-2">
                                <span class="text-[11.5px] font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                    ${einvInfo.text}
                                </span>
                                ${einvInfo.lookup_url ? `
                                    <a href="${einvInfo.lookup_url}" target="_blank" class="text-[11.5px] font-bold text-blue-600 hover:text-blue-800 flex items-center bg-blue-50 px-2 py-0.5 rounded">
                                        <i class="ph ph-arrow-square-out mr-1"></i> Tra cứu online
                                    </a>
                                ` : ''}
                            </div>
                        ` : `
                            <span class="text-[11.5px] text-slate-400 italic">Chưa phát sinh hóa đơn</span>
                        `}
                    </td>
                    <td class="py-1.5 px-3 text-center border-r border-slate-200/70">
                        ${einvInfo.hasInv 
                            ? `<span class="px-2 py-0.2 rounded text-[10.5px] font-bold bg-emerald-100 text-emerald-800">Đã Liên Kết</span>`
                            : `<span class="px-2 py-0.2 rounded text-[10.5px] font-bold bg-slate-100 text-slate-500">Trống</span>`}
                    </td>
                    <td class="py-1.5 px-3 text-center text-slate-300">-</td>
                </tr>
            `;
        } else {
            // Lấy các bản ghi expense khớp với category này
            const matchedExps = (trip.expenses || []).filter(e => {
                if (item.code === 'LIFT_ON') return e.category_code === 'LIFT_ON' || e.category_code === 'LIFT_ON_OFF';
                if (item.code === 'LIFT_OFF') return e.category_code === 'LIFT_OFF';
                if (item.code === 'TOLL_FEE') return e.category_code === 'TOLL_FEE' || e.category_code === 'BOT_TOLL';
                if (item.code === 'CONTAINER_DEPOSIT') return e.category_code === 'CONTAINER_DEPOSIT';
                if (item.code === 'WEIGHING') return e.category_code === 'WEIGHING';
                if (item.code === 'LABOR_STEVEDORING') return e.category_code === 'LABOR_STEVEDORING' || e.category_code === 'STEVEDORING';
                if (item.code === 'OTHER') return e.category_code === 'OTHER' || e.category_code === 'PORT_STORAGE' || e.category_code === 'REPAIR_TIRE';
                return false;
            });

            const amountSum = matchedExps.reduce((acc, curr) => acc + Number(curr.amount), 0);
            totalCalculated += amountSum;

            if (matchedExps.length > 1) {
                // TRƯỜNG HỢP CÓ TỪ 2 KHOẢN CHI TRỞ LÊN: HỖ TRỢ BẤM VÀO ĐỂ XỔ XUỐNG XEM CHI TIẾT TỪNG DÒNG
                const summaryInvText = matchedExps.map(e => e.invoice_number ? e.invoice_number : '').filter(Boolean).join(', ');
                
                tbody.innerHTML += `
                    <!-- DÒNG TỔNG GỘP (Clickable Accordion) -->
                    <tr onclick="toggleExpenseDetail('${item.code}')" class="hover:bg-teal-50/50 cursor-pointer transition-colors bg-slate-50/40 border-b border-slate-200/80">
                        <td class="py-2 px-3 text-center text-teal-800 font-bold border-r border-slate-200/70">${item.stt}</td>
                        <td class="py-2 px-3 border-r border-slate-200/70">
                            <div class="flex items-center space-x-2">
                                <span class="font-bold text-slate-900 text-[13px]">${item.title}</span>
                                <span class="inline-flex items-center space-x-1 px-2 py-0.2 rounded-full bg-teal-100 text-teal-900 text-[10.5px] font-bold font-heading hover:bg-teal-200 transition-colors">
                                    <i class="ph-fill ph-list-numbers"></i>
                                    <span>${matchedExps.length} khoản chi</span>
                                    <i id="icon-toggle-${item.code}" class="ph ph-caret-down text-xs transition-transform duration-200"></i>
                                </span>
                            </div>
                            <p class="text-[11.5px] text-teal-700 font-semibold mt-0.5 flex items-center">
                                <i class="ph ph-hand-pointing mr-1"></i> Bấm để xem/ẩn chi tiết từng vé (${matchedExps.length} dòng con)
                            </p>
                        </td>
                        <td class="py-2 px-3 text-right font-black text-[13px] tabular-nums text-rose-600 font-mono border-r border-slate-200/70">
                            <span class="border-b-2 border-dotted border-rose-400 pb-0.5" title="Tổng cộng ${matchedExps.length} khoản">
                                ${formatMoney(amountSum)}
                            </span>
                        </td>
                        <td class="py-2 px-3 border-r border-slate-200/70">
                            <span class="text-[11.5px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block">
                                ${summaryInvText ? `Gồm các HĐ: ${summaryInvText}` : `Tổng hợp ${matchedExps.length} chứng từ`}
                            </span>
                        </td>
                        <td class="py-2 px-3 text-slate-600 text-[11.5px] border-r border-slate-200/70">
                            <span class="text-teal-800 font-semibold">Xem chi tiết các khoản bên dưới</span>
                        </td>
                        <td class="py-2 px-3 text-center border-r border-slate-200/70">
                            <button type="button" class="px-2 py-0.5 rounded-md text-[11px] font-bold bg-teal-600 hover:bg-teal-700 text-white inline-flex items-center space-x-1 shadow-sm font-heading">
                                <span>Chi tiết</span>
                                <i class="ph ph-caret-down text-xs"></i>
                            </button>
                        </td>
                        <td class="py-2 px-3 text-center text-slate-400 text-[11px] font-semibold">
                            Tập hợp
                        </td>
                    </tr>

                    <!-- CÁC DÒNG CON CHI TIẾT (Sub-rows) -->
                    ${matchedExps.map((subExp, sIdx) => `
                        <tr class="sub-row-${item.code} hidden bg-teal-50/30 border-l-4 border-l-teal-600 border-b border-slate-100 transition-all text-xs">
                            <td class="py-1.5 px-2.5 text-center text-teal-800 font-mono font-bold text-[11.5px] border-r border-slate-200/70">${item.stt}.${sIdx + 1}</td>
                            <td class="py-1.5 px-2.5 pl-6 border-r border-slate-200/70">
                                <div class="flex items-center space-x-2">
                                    <i class="ph ph-arrow-elbow-down-right text-teal-700 font-black text-sm"></i>
                                    <span class="font-bold text-slate-900 text-[12.5px]">${subExp.notes || (item.title + ' #' + (sIdx + 1))}</span>
                                </div>
                                ${subExp.time ? `<p class="text-[11px] text-slate-400 pl-5 font-normal mt-0.5">${subExp.time}</p>` : ''}
                            </td>
                            <td class="py-1.5 px-2.5 text-right font-black text-rose-600 tabular-nums font-mono text-[13px] border-r border-slate-200/70">
                                ${formatMoney(subExp.amount)}
                            </td>
                            <td class="py-1.5 px-2.5 border-r border-slate-200/70">
                                ${subExp.invoice_number ? `
                                    <div class="inline-flex items-center space-x-1 font-mono text-[11.5px] font-bold text-teal-900 bg-teal-100/70 px-2 py-0.5 rounded border border-teal-200">
                                        <span>HĐ: ${subExp.invoice_number}${subExp.invoice_lookup_code ? ' / ' + subExp.invoice_lookup_code : ''}</span>
                                        ${subExp.invoice_lookup_url ? `
                                            <a href="${subExp.invoice_lookup_url}" target="_blank" class="text-blue-600 hover:text-blue-800 ml-1 font-bold" title="Tra cứu online">
                                                <i class="ph ph-arrow-square-out text-xs"></i>
                                            </a>
                                        ` : ''}
                                    </div>
                                ` : '<span class="text-slate-400 text-[11.5px]">Vé trạm / Biên nhận</span>'}
                            </td>
                            <td class="py-1.5 px-2.5 text-slate-700 text-[11.5px] font-medium border-r border-slate-200/70">
                                <div class="flex items-center space-x-1.5 flex-wrap gap-y-1">
                                    <span>${subExp.invoice_issuer || subExp.notes || '<span class="text-slate-400">-</span>'}</span>
                                    ${subExp.is_on_behalf_of_customer ? `
                                        <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 whitespace-nowrap">
                                            <i class="ph-bold ph-arrow-up-right mr-0.5 text-[10px]"></i>CHI HỘ KH
                                        </span>
                                    ` : ''}
                                </div>
                            </td>
                            <td class="py-1.5 px-2.5 text-center border-r border-slate-200/70">
                                <span class="px-2 py-0.2 rounded text-[10.5px] font-bold ${
                                    subExp.status === 'SETTLED' ? 'bg-purple-100 text-purple-800' :
                                    subExp.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }">
                                    ${subExp.status_label || (subExp.status === 'SETTLED' ? 'Đã chốt sổ' : (subExp.status === 'APPROVED' ? 'Đã duyệt' : 'Chờ duyệt'))}
                                </span>
                            </td>
                            <td class="py-1.5 px-2.5 text-center">
                                ${trip.is_expenses_settled || !subExp.can_edit ? `
                                    <span class="inline-flex items-center text-purple-700 font-bold text-[10.5px] bg-purple-50 px-2 py-0.5 rounded border border-purple-200" title="Đã chốt sổ Kế toán, không thể chỉnh sửa">
                                        <i class="ph-fill ph-lock mr-1"></i> Khóa
                                    </span>
                                ` : `
                                    <div class="inline-flex items-center space-x-1">
                                        <button type="button" onclick="event.stopPropagation(); editExpensePrompt(${subExp.id})" class="p-1 rounded text-amber-700 hover:bg-amber-100 transition-colors font-bold" title="Chỉnh sửa chi phí">
                                            <i class="ph ph-pencil text-sm"></i>
                                        </button>
                                        <button type="button" onclick="event.stopPropagation(); deleteExpensePrompt(${subExp.id}, '${subExp.category_name}')" class="p-1 rounded text-rose-600 hover:bg-rose-100 transition-colors font-bold" title="Xóa khoản chi">
                                            <i class="ph ph-trash text-sm"></i>
                                        </button>
                                    </div>
                                `}
                            </td>
                        </tr>
                    `).join('')}
                `;
            } else {
                // TRƯỜNG HỢP CÓ 0 HOẶC 1 KHOẢN CHI: HIỂN THỊ DÒNG ĐƠN BÌNH THƯỜNG
                const singleExp = matchedExps[0] || null;
                const invNoText = singleExp && singleExp.invoice_number 
                    ? `HĐ: ${singleExp.invoice_number}${singleExp.invoice_lookup_code ? ' / ' + singleExp.invoice_lookup_code : ''}` 
                    : '';
                const issuerText = singleExp ? (singleExp.invoice_issuer || singleExp.notes) : '';

                tbody.innerHTML += `
                    <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-200/70 ${amountSum > 0 ? 'bg-amber-50/20' : ''}">
                        <td class="py-1.5 px-3 text-center text-slate-400 font-bold border-r border-slate-200/70">${item.stt}</td>
                        <td class="py-1.5 px-3 border-r border-slate-200/70">
                            <span class="font-bold text-slate-900 text-[13px]">${item.title}</span>
                        </td>
                        <td class="py-1.5 px-3 text-right font-black text-[13px] tabular-nums font-mono border-r border-slate-200/70 ${amountSum > 0 ? 'text-rose-600' : 'text-slate-400'}">
                            ${amountSum > 0 ? formatMoney(amountSum) : '-'}
                        </td>
                        <td class="py-1.5 px-3 border-r border-slate-200/70">
                            ${invNoText ? `
                                <div class="inline-flex items-center space-x-1 font-mono text-[11.5px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                    <span>${invNoText}</span>
                                    ${singleExp.invoice_lookup_url ? `
                                        <a href="${singleExp.invoice_lookup_url}" target="_blank" class="text-blue-600 hover:text-blue-800 ml-1 font-bold" title="Tra cứu online">
                                            <i class="ph ph-arrow-square-out text-xs"></i>
                                        </a>
                                    ` : ''}
                                </div>
                            ` : '<span class="text-slate-400 text-[11.5px]">-</span>'}
                        </td>
                        <td class="py-1.5 px-3 text-slate-600 text-[11.5px] border-r border-slate-200/70">
                            <div class="flex items-center space-x-1.5 flex-wrap gap-y-1">
                                <span>${issuerText || '<span class="text-slate-400">-</span>'}</span>
                                ${(singleExp && singleExp.is_on_behalf_of_customer) ? `
                                    <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 whitespace-nowrap">
                                        <i class="ph-bold ph-arrow-up-right mr-0.5 text-[10px]"></i>CHI HỘ KH
                                    </span>
                                ` : ''}
                            </div>
                        </td>
                        <td class="py-1.5 px-3 text-center border-r border-slate-200/70">
                            ${amountSum > 0 
                                ? `<span class="px-2 py-0.2 rounded text-[10.5px] font-bold ${
                                    (singleExp && singleExp.status === 'SETTLED') ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                                }">${(singleExp && singleExp.status_label) || 'Đã Ghi Nhận'}</span>` 
                                : `<span class="px-2 py-0.2 rounded text-[10.5px] font-bold bg-slate-100 text-slate-400">-</span>`}
                        </td>
                        <td class="py-1.5 px-3 text-center">
                            ${singleExp ? (
                                trip.is_expenses_settled || !singleExp.can_edit ? `
                                    <span class="inline-flex items-center text-purple-700 font-bold text-[10.5px] bg-purple-50 px-2 py-0.5 rounded border border-purple-200" title="Đã chốt sổ Kế toán, không thể chỉnh sửa">
                                        <i class="ph-fill ph-lock mr-1"></i> Khóa
                                    </span>
                                ` : `
                                    <div class="inline-flex items-center space-x-1">
                                        <button type="button" onclick="editExpensePrompt(${singleExp.id})" class="p-1 rounded text-amber-700 hover:bg-amber-100 transition-colors font-bold" title="Chỉnh sửa chi phí">
                                            <i class="ph ph-pencil text-sm"></i>
                                        </button>
                                        <button type="button" onclick="deleteExpensePrompt(${singleExp.id}, '${singleExp.category_name}')" class="p-1 rounded text-rose-600 hover:bg-rose-100 transition-colors font-bold" title="Xóa khoản chi">
                                            <i class="ph ph-trash text-sm"></i>
                                        </button>
                                    </div>
                                `
                            ) : '<span class="text-slate-300">-</span>'}
                        </td>
                    </tr>
                `;
            }
        }
    });

    const totalEl = document.getElementById('cost-sheet-total');
    if (totalEl) totalEl.innerText = formatMoney(totalCalculated);

    // Hiển thị dòng Tổng Chi Hộ KH nếu có (cất riêng khỏi chi phí vận hành)
    const reimbursableTotal = trip.cost_sheet?.total_reimbursable || 0;
    const reimbursableItems = trip.cost_sheet?.reimbursable_items || [];
    const reimbursableRow = document.getElementById('cost-sheet-reimbursable-row');
    const reimbursableTotalEl = document.getElementById('cost-sheet-reimbursable-total');
    if (reimbursableRow) {
        reimbursableRow.style.display = reimbursableTotal > 0 ? '' : 'none';
    }
    if (reimbursableTotalEl) {
        const itemsText = reimbursableItems.map(it => `${it.category}: ${formatMoney(it.amount)}`).join(' · ');
        reimbursableTotalEl.innerHTML = `
            <td colspan="2" class="p-3 text-right text-xs font-bold text-amber-800">
                <i class="ph-bold ph-arrow-up-right mr-1"></i>Tổng Khoản Chi Hộ Khách Hàng
                <p class="text-[10px] font-normal text-amber-600 mt-0.5">${itemsText || 'Công ty ứng chi trước, thu lại khi quyết toán với KH'}</p>
            </td>
            <td class="p-3 text-right font-black text-amber-700 tabular-nums">${formatMoney(reimbursableTotal)}</td>
            <td colspan="4" class="p-3 text-xs text-amber-600">
                <span class="px-2 py-0.5 rounded bg-amber-100 border border-amber-300 font-bold text-amber-800 text-[10px]">Không tính vào chi phí công ty</span>
            </td>
        `;
    }

    // ĐỒNG BỘ TUYỆT ĐỐI VỚI BOX P&L VÀ APP MOBILE (SINGLE SOURCE OF TRUTH)
    const pnlExpenseEl = document.getElementById('pnl-expense');
    if (pnlExpenseEl) pnlExpenseEl.innerText = formatMoney(totalCalculated);

    const rev = Number(trip.financials?.revenue || 0);
    const actualProfit = rev - totalCalculated;
    const actualMargin = rev > 0 ? ((actualProfit / rev) * 100).toFixed(1) : 0;
    const profitEl = document.getElementById('pnl-profit');
    if (profitEl) {
        profitEl.innerText = `${formatMoney(actualProfit)} (${actualMargin}%)`;
    }

    const appTotal = document.getElementById('app-total-expense');
    if (appTotal) appTotal.innerText = formatMoney(totalCalculated);
}

// Hàm mở / đóng chi tiết các dòng chi phí con khi người dùng click
function toggleExpenseDetail(code) {
    const subRows = document.querySelectorAll(`.sub-row-${code}`);
    const icon = document.getElementById(`icon-toggle-${code}`);
    subRows.forEach(row => {
        row.classList.toggle('hidden');
    });
    if (icon) {
        icon.classList.toggle('rotate-180');
    }
}

// Render dữ liệu vào App di động giả lập
function renderDriverMobileApp(trip) {
    const appTitle = document.getElementById('app-title');
    if (appTitle) appTitle.innerText = trip.customer;
    const appDriver = document.getElementById('app-driver-name');
    if (appDriver) appDriver.innerText = trip.driver;

    const appCont = document.getElementById('app-cont-no');
    if (appCont) appCont.innerText = trip.container;
    const appEir = document.getElementById('app-eir-no');
    if (appEir) appEir.innerText = trip.eir_number !== '-' ? trip.eir_number : 'Chưa lấy EIR';
    const appShip = document.getElementById('app-shipping-line');
    if (appShip) appShip.innerText = trip.shipping_line !== '-' ? trip.shipping_line : '-';

    const formatMoney = (n) => new Intl.NumberFormat('vi-VN').format(n) + ' đ';
    const totalDriverExpense = (trip.expenses || []).reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const appTotal = document.getElementById('app-total-expense');
    if (appTotal) appTotal.innerText = formatMoney(totalDriverExpense);

    const listEl = document.getElementById('app-expenses-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    if (!trip.expenses || trip.expenses.length === 0) {
        listEl.innerHTML = `<p class="text-xs text-slate-400 text-center py-4 italic">Chưa có khoản chi phí nào</p>`;
        return;
    }

    trip.expenses.forEach(exp => {
        let actionButtons = '';
        if (exp.status === 'PENDING') {
            actionButtons = `
                <div class="flex items-center space-x-1 mt-1">
                    <button onclick="driverEditExpense(${exp.id})" class="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded text-[10px] font-bold border border-amber-200 flex items-center">
                        <i class="ph ph-pencil mr-0.5"></i> Sửa
                    </button>
                    <button onclick="driverDeleteExpense(${exp.id})" class="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-[10px] font-bold border border-rose-200 flex items-center">
                        <i class="ph ph-trash mr-0.5"></i> Xóa
                    </button>
                </div>
            `;
        } else if (exp.status === 'SETTLED') {
            actionButtons = `
                <span class="inline-flex items-center text-[9.5px] font-bold text-purple-700 mt-1" title="Kế toán đã chốt sổ">
                    <i class="ph-fill ph-lock mr-0.5"></i> Đã chốt sổ
                </span>
            `;
        } else {
            actionButtons = `
                <span class="inline-flex items-center text-[9.5px] font-bold text-emerald-700 mt-1" title="Điều độ đã duyệt">
                    <i class="ph-fill ph-lock mr-0.5"></i> Đã duyệt
                </span>
            `;
        }

        listEl.innerHTML += `
            <div class="p-2 rounded-lg bg-slate-50 border border-slate-100 flex flex-col space-y-1">
                <div class="flex justify-between items-start">
                    <div>
                        <p class="text-xs font-bold text-slate-800">${exp.category_name}</p>
                        <p class="text-[10px] text-slate-400 font-mono">${exp.invoice_number ? 'HĐ: ' + exp.invoice_number : (exp.notes || exp.time)}</p>
                    </div>
                    <span class="text-xs font-black text-rose-600 tabular-nums">${formatMoney(exp.amount)}</span>
                </div>
                <div class="flex justify-between items-center pt-1 border-t border-slate-200/50">
                    <span class="text-[9.5px] px-1.5 py-0.5 rounded font-bold ${
                        exp.status === 'SETTLED' ? 'bg-purple-100 text-purple-800' :
                        exp.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }">
                        ${exp.status_label || (exp.status === 'SETTLED' ? 'Đã chốt sổ' : (exp.status === 'APPROVED' ? 'Đã duyệt' : 'Chờ duyệt'))}
                    </span>
                    ${actionButtons}
                </div>
            </div>
        `;
    });
}

// Các hàm Modal Thêm Chi Phí Phát Sinh
function openModalAddExpense() {
    const modal = document.getElementById('modal-add-expense');
    if (modal) modal.classList.remove('hidden-view');
}

/**
 * Toggle switch cho ô Chi hộ KH — dùng chung cho cả Add và Edit modal.
 * @param {string} checkboxId   - id của <input type="checkbox" class="sr-only">
 * @param {string} wrapId       - id của div container (background highlight)
 * @param {string} dotId        - id của nút tròn trượt
 * @param {string} trackId      - id của dải track background
 */
function toggleBehalfCheckbox(checkboxId, wrapId, dotId, trackId) {
    const cb = document.getElementById(checkboxId);
    const wrap = document.getElementById(wrapId);
    const dot = document.getElementById(dotId);
    const track = document.getElementById(trackId);
    if (!cb) return;

    cb.checked = !cb.checked;
    const isOn = cb.checked;

    // Hiệu ứng track (background)
    if (track) {
        track.style.backgroundColor = isOn ? '#0f766e' : ''; // teal-700
        track.className = track.className.replace(/bg-\S+/, isOn ? 'bg-teal-700' : 'bg-slate-300');
    }
    // Hiệu ứng dot trượt
    if (dot) {
        dot.style.transform = isOn ? 'translateX(20px)' : 'translateX(0px)';
    }
    // Highlight vùng wrap khi bật
    if (wrap) {
        if (isOn) {
            wrap.classList.remove('bg-amber-50', 'border-amber-200');
            wrap.classList.add('bg-teal-50', 'border-teal-400', 'ring-2', 'ring-teal-300');
        } else {
            wrap.classList.remove('bg-teal-50', 'border-teal-400', 'ring-2', 'ring-teal-300');
            wrap.classList.add('bg-amber-50', 'border-amber-200');
        }
    }
}

/** Reset toggle về mặc định (OFF) */
function resetBehalfToggle(checkboxId, wrapId, dotId, trackId) {
    const cb = document.getElementById(checkboxId);
    const wrap = document.getElementById(wrapId);
    const dot = document.getElementById(dotId);
    const track = document.getElementById(trackId);
    if (cb) cb.checked = false;
    if (track) { track.style.backgroundColor = ''; track.className = track.className.replace(/bg-teal-700|bg-slate-300/, 'bg-slate-300'); }
    if (dot) dot.style.transform = 'translateX(0px)';
    if (wrap) {
        wrap.classList.remove('bg-teal-50', 'border-teal-400', 'ring-2', 'ring-teal-300');
        wrap.classList.add('bg-amber-50', 'border-amber-200');
    }
}

/** Đặt toggle sang ON (khi mở modal edit và giá trị là true) */
function setBehalfToggle(value, checkboxId, wrapId, dotId, trackId) {
    const cb = document.getElementById(checkboxId);
    if (!cb) return;
    if (cb.checked !== !!value) {
        // Chỉ gọi toggle nếu cần thay đổi trạng thái
        if (!!value) toggleBehalfCheckbox(checkboxId, wrapId, dotId, trackId);
    }
}

function closeModalAddExpense() {
    const modal = document.getElementById('modal-add-expense');
    if (modal) modal.classList.add('hidden-view');
    const form = document.getElementById('form-add-expense');
    if (form) form.reset();
    // Reset toggle về OFF
    resetBehalfToggle('expense-on-behalf-checkbox', 'expense-behalf-toggle-wrap', 'expense-behalf-toggle-dot', 'expense-behalf-toggle-track');
}

async function submitAddExpense(e) {
    e.preventDefault();
    if (!currentActiveTripCode) return;

    const category = document.getElementById('expense-category-select').value;
    const amount = parseNumberVN(document.getElementById('expense-amount-input').value) || 0;
    const invoice_number = document.getElementById('expense-inv-number').value.trim();
    const invoice_lookup_code = document.getElementById('expense-inv-lookup-code').value.trim();
    const invoice_issuer = document.getElementById('expense-inv-issuer').value.trim();
    const invoice_lookup_url = document.getElementById('expense-inv-lookup-url').value.trim();
    const notes = document.getElementById('expense-notes-input').value.trim();
    const is_on_behalf_of_customer = document.getElementById('expense-on-behalf-checkbox')?.checked || false;

    try {
        const res = await fetch(`/api/trips/${currentActiveTripCode}/expenses/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                category,
                amount,
                invoice_number,
                invoice_lookup_code,
                invoice_issuer,
                invoice_lookup_url,
                notes,
                is_on_behalf_of_customer
            })
        });

        const data = await res.json();
        if (data.success) {
            closeModalAddExpense();
            const chiHoLabel = is_on_behalf_of_customer ? ' [Chi hộ KH]' : '';
            showToast('success', data.message + chiHoLabel, 'Ghi nhận chi phí thành công');
            viewTripDetail(currentActiveTripCode);
        } else {
            showToast('danger', data.error || 'Có lỗi xảy ra');
        }
    } catch (err) {
        console.error('Error adding expense:', err);
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

// --- CÁC HÀM HIỆU CHỈNH & XÓA KHOẢN CHI PHÍ (KHI CHƯA KHÓA SỔ) ---
function openModalEditExpense(exp) {
    const modal = document.getElementById('modal-edit-expense');
    if (!modal) return;
    
    document.getElementById('edit-expense-id').value = exp.id;
    document.getElementById('edit-expense-category-select').value = exp.category_code;
    document.getElementById('edit-expense-amount-input').value = formatNumberVN(exp.amount);
    document.getElementById('edit-expense-inv-number').value = exp.invoice_number || '';
    document.getElementById('edit-expense-inv-lookup-code').value = exp.invoice_lookup_code || '';
    document.getElementById('edit-expense-inv-issuer').value = exp.invoice_issuer || '';
    document.getElementById('edit-expense-inv-lookup-url').value = exp.invoice_lookup_url || '';
    document.getElementById('edit-expense-notes-input').value = exp.notes || '';

    // Đồng bộ toggle Chi hộ KH với giá trị hiện tại của expense
    resetBehalfToggle('edit-expense-on-behalf-checkbox', 'edit-expense-behalf-toggle-wrap', 'edit-expense-behalf-toggle-dot', 'edit-expense-behalf-toggle-track');
    if (exp.is_on_behalf_of_customer) {
        toggleBehalfCheckbox('edit-expense-on-behalf-checkbox', 'edit-expense-behalf-toggle-wrap', 'edit-expense-behalf-toggle-dot', 'edit-expense-behalf-toggle-track');
    }

    initAllNumberInputs();
    modal.classList.remove('hidden-view');
}

function closeModalEditExpense() {
    const modal = document.getElementById('modal-edit-expense');
    if (modal) modal.classList.add('hidden-view');
    const form = document.getElementById('form-edit-expense');
    if (form) form.reset();
    // Reset toggle về OFF
    resetBehalfToggle('edit-expense-on-behalf-checkbox', 'edit-expense-behalf-toggle-wrap', 'edit-expense-behalf-toggle-dot', 'edit-expense-behalf-toggle-track');
}

function editExpensePrompt(expenseId) {
    if (!currentActiveTripData || !currentActiveTripData.expenses) return;
    const exp = currentActiveTripData.expenses.find(e => e.id === expenseId);
    if (!exp) {
        showToast('warning', 'Không tìm thấy thông tin khoản chi.');
        return;
    }
    if (currentActiveTripData.is_expenses_settled || !exp.can_edit) {
        showToast('warning', 'Chuyến xe đã được Kế toán chốt sổ, không thể chỉnh sửa chi phí này.', 'Bảng kê đã khóa');
        return;
    }
    openModalEditExpense(exp);
}

async function submitEditExpense(e) {
    e.preventDefault();
    if (!currentActiveTripCode) return;

    const expenseId = document.getElementById('edit-expense-id').value;
    const category = document.getElementById('edit-expense-category-select').value;
    const amount = parseNumberVN(document.getElementById('edit-expense-amount-input').value) || 0;
    const invoice_number = document.getElementById('edit-expense-inv-number').value.trim();
    const invoice_lookup_code = document.getElementById('edit-expense-inv-lookup-code').value.trim();
    const invoice_issuer = document.getElementById('edit-expense-inv-issuer').value.trim();
    const invoice_lookup_url = document.getElementById('edit-expense-inv-lookup-url').value.trim();
    const notes = document.getElementById('edit-expense-notes-input').value.trim();
    const is_on_behalf_of_customer = document.getElementById('edit-expense-on-behalf-checkbox')?.checked || false;

    try {
        const res = await fetch(`/api/trips/${currentActiveTripCode}/expenses/${expenseId}/`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                category,
                amount,
                invoice_number,
                invoice_lookup_code,
                invoice_issuer,
                invoice_lookup_url,
                notes,
                is_on_behalf_of_customer
            })
        });

        const data = await res.json();
        if (data.success) {
            closeModalEditExpense();
            showToast('success', data.message, 'Cập nhật thành công');
            viewTripDetail(currentActiveTripCode);
        } else {
            showToast('danger', data.error || 'Không thể cập nhật khoản chi phí');
        }
    } catch (err) {
        console.error('Error updating expense:', err);
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

async function deleteExpensePrompt(expenseId, categoryName) {
    if (!currentActiveTripData) return;
    if (currentActiveTripData.is_expenses_settled) {
        showToast('warning', 'Chuyến xe đã được Kế toán chốt sổ, không thể xóa chi phí.', 'Bảng kê đã khóa');
        return;
    }

    const confirmDelete = confirm(`Bạn có chắc chắn muốn xóa khoản chi "${categoryName}" này khỏi bảng kê chuyến xe?\nThao tác sẽ được lưu vết kiểm toán (Soft-Delete).`);
    if (!confirmDelete) return;

    try {
        const res = await fetch(`/api/trips/${currentActiveTripCode}/expenses/${expenseId}/`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await res.json();
        if (data.success) {
            showToast('success', data.message, 'Đã xóa chi phí');
            viewTripDetail(currentActiveTripCode);
        } else {
            showToast('danger', data.error || 'Không thể xóa khoản chi phí');
        }
    } catch (err) {
        console.error('Error deleting expense:', err);
        showToast('danger', 'Lỗi kết nối máy chủ khi xóa');
    }
}

// --- CÁC HÀM KHÓA SỔ & MỞ SỔ KẾ TOÁN (SETTLEMENT LIFECYCLE) ---
async function settleTripExpenses() {
    if (!currentActiveTripCode) return;
    
    const confirmSettle = confirm(
        `XÁC NHẬN CHỐT SỔ KẾ TOÁN CHO CHUYẾN XE ${currentActiveTripCode}?\n\n` +
        `• Toàn bộ chi phí thực tế sẽ chuyển sang trạng thái "ĐÃ CHỐT SỔ" (SETTLED).\n` +
        `• Bảng kê sẽ bị khóa cứng (Read-only), ngăn chặn tài xế hoặc điều độ sửa đổi/xóa.\n` +
        `• Số liệu sẽ được khóa để đối soát P&L và lập hóa đơn cước khách hàng.`
    );
    if (!confirmSettle) return;

    try {
        const res = await fetch(`/api/trips/${currentActiveTripCode}/settle-expenses/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await res.json();
        if (data.success) {
            showToast('success', data.message, 'Khóa Sổ Kế Toán Thành Công');
            viewTripDetail(currentActiveTripCode);
        } else {
            showToast('danger', data.error || 'Có lỗi khi chốt sổ');
        }
    } catch (err) {
        console.error('Error settling expenses:', err);
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

async function unsettleTripExpenses() {
    if (!currentActiveTripCode) return;
    
    const confirmUnsettle = confirm(
        `MỞ KHÓA SỔ KẾ TOÁN CHO CHUYẾN XE ${currentActiveTripCode}?\n\n` +
        `Lưu ý: Chỉ thực hiện khi cần điều chỉnh số liệu phát sinh sai sót hoặc bổ sung hóa đơn hợp lệ theo yêu cầu Kế toán trưởng.`
    );
    if (!confirmUnsettle) return;

    try {
        const res = await fetch(`/api/trips/${currentActiveTripCode}/unsettle-expenses/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await res.json();
        if (data.success) {
            showToast('warning', data.message, 'Đã Mở Khóa Sổ Kế Toán');
            viewTripDetail(currentActiveTripCode);
        } else {
            showToast('danger', data.error || 'Không thể mở khóa');
        }
    } catch (err) {
        console.error('Error unsettling expenses:', err);
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

// --- THAO TÁC CỦA TÀI XẾ TRÊN MOBILE SIMULATOR ---
function driverEditExpense(expenseId) {
    if (!currentActiveTripData || !currentActiveTripData.expenses) return;
    const exp = currentActiveTripData.expenses.find(e => e.id === expenseId);
    if (!exp) return;

    if (exp.status !== 'PENDING') {
        showToast('warning', 'Khoản chi đã được Điều độ / Kế toán duyệt, không thể tự sửa. Vui lòng gọi Điều độ viên.', 'Không thể sửa');
        return;
    }
    openModalEditExpense(exp);
}

async function driverDeleteExpense(expenseId) {
    if (!currentActiveTripData || !currentActiveTripData.expenses) return;
    const exp = currentActiveTripData.expenses.find(e => e.id === expenseId);
    if (!exp) return;

    if (exp.status !== 'PENDING') {
        showToast('warning', 'Khoản chi đã được duyệt, tài xế không thể tự xóa.', 'Đã duyệt');
        return;
    }

    const ok = confirm(`Tài xế xác nhận muốn xóa khoản chi: "${exp.category_name}" (${new Intl.NumberFormat('vi-VN').format(exp.amount)} đ) do nhập nhầm?`);
    if (!ok) return;

    try {
        const res = await fetch(`/api/trips/${currentActiveTripCode}/expenses/${expenseId}/`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (data.success) {
            showToast('success', 'Đã hủy khoản chi nhập nhầm', 'Tài xế xóa thành công');
            viewTripDetail(currentActiveTripCode);
        } else {
            showToast('danger', data.error || 'Không thể xóa');
        }
    } catch (err) {
        console.error('Error driver deleting expense:', err);
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

// Tài xế báo nhanh mốc thời gian kho 1 chạm (Bước 6 SOP)
async function driverReportMilestone(milestoneCode) {
    if (!currentActiveTripCode) return;

    try {
        const res = await fetch(`/api/trips/${currentActiveTripCode}/milestones/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ milestone: milestoneCode })
        });

        const data = await res.json();
        if (data.success) {
            showToast('success', data.message, 'Cập nhật tiến độ kho');
            viewTripDetail(currentActiveTripCode);
        } else {
            showToast('danger', data.error || 'Không thể cập nhật mốc');
        }
    } catch (err) {
        console.error('Error reporting milestone:', err);
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}


function backToTrips() {
    document.getElementById('view-trip-detail').classList.add('hidden-view');
    if (previousActiveTab && previousActiveTab !== 'trip-detail') {
        switchTab(previousActiveTab);
    } else {
        switchTab('dieu-van');
    }
}

// --- 4. TẠO LỆNH ĐIỀU ĐỘNG VỚI DEFENSIVE VALIDATION (Bim_ERP Standard) ---
async function submitNewTrip() {
    // Reset lỗi cũ
    const requiredFields = [
        { id: 'inp-customer', errId: 'err-customer', label: 'Khách hàng' },
        { id: 'inp-pickup', errId: 'err-pickup', label: 'Nơi lấy cont/hàng' },
        { id: 'inp-warehouse', errId: 'err-warehouse', label: 'Nơi đóng/trả hàng' },
        { id: 'inp-driver', errId: 'err-driver', label: 'Tài xế nhận lệnh' }
    ];

    let hasError = false;
    let firstErrorEl = null;

    requiredFields.forEach(f => {
        const inputEl = document.getElementById(f.id);
        const errEl = document.getElementById(f.errId);
        
        if (!inputEl.value.trim()) {
            hasError = true;
            inputEl.classList.add('input-error');
            if (errEl) {
                errEl.innerHTML = `<i class="ph-fill ph-warning-circle"></i> Vui lòng nhập ${f.label.toLowerCase()}`;
                errEl.classList.remove('hidden');
            }
            if (!firstErrorEl) firstErrorEl = inputEl;

            // Cơ chế tự động xóa viền đỏ khi người dùng bắt đầu nhập (Bim ERP Rule)
            inputEl.addEventListener('input', () => {
                inputEl.classList.remove('input-error');
                if (errEl) errEl.classList.add('hidden');
            }, { once: true });
        } else {
            inputEl.classList.remove('input-error');
            if (errEl) errEl.classList.add('hidden');
        }
    });

    if (hasError) {
        showToast('warning', 'Vui lòng kiểm tra lại các trường thông tin bắt buộc còn thiếu!', 'Dữ liệu chưa hợp lệ');
        if (firstErrorEl) firstErrorEl.focus();
        return;
    }

    const bookingOrderEl = document.getElementById('select-booking-order');
    const booking_order_id = bookingOrderEl && bookingOrderEl.value ? parseInt(bookingOrderEl.value) : null;
    const customer = document.getElementById('inp-customer').value;
    const type = document.getElementById('inp-type').value;
    const container_type = document.getElementById('inp-cont-type') ? document.getElementById('inp-cont-type').value : '40HC';
    const container = document.getElementById('inp-cont').value;
    const booking = document.getElementById('inp-booking').value;
    const seal = document.getElementById('inp-seal').value;
    const cutoff = document.getElementById('inp-cutoff').value;
    const commercial_invoice = document.getElementById('inp-invoice') ? document.getElementById('inp-invoice').value.trim() : '';
    const warehouse_dock = document.getElementById('inp-dock') ? document.getElementById('inp-dock').value.trim() : '';
    const loading_time = document.getElementById('inp-load-time') ? document.getElementById('inp-load-time').value.trim() : '8H';
    const cont_location_type = document.getElementById('inp-cont-loc') ? document.getElementById('inp-cont-loc').value.trim() : 'NHÀ MÁY';
    const pickup = document.getElementById('inp-pickup').value;
    const warehouse = document.getElementById('inp-warehouse').value;
    const dropoff = document.getElementById('inp-dropoff').value;
    const driver = document.getElementById('inp-driver').value;
    const notes = document.getElementById('inp-notes').value;

    try {
        const res = await fetch('/api/trips/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                booking_order_id,
                customer, type, container_type, container, booking, seal, cutoff,
                commercial_invoice, warehouse_dock, loading_time, cont_location_type,
                pickup, warehouse, dropoff, driver, notes, cargo_notes: notes
            })
        });
        const result = await res.json();
        if (result.success) {
            closeModal('modal-create-trip');
            document.getElementById('form-create-trip').reset();
            loadTripsData();
            showToast('success', result.message, 'Thành công');
        } else {
            showToast('danger', result.error || 'Vui lòng kiểm tra lại dữ liệu nhập.', 'Lỗi nghiệp vụ');
        }
    } catch (err) {
        console.error('Error submitting trip:', err);
        showToast('danger', 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.', 'Lỗi kết nối');
    }
}

// --- 5. GIẢ LẬP CAMERA OCR (APP TÀI XẾ) ---
function openOcrApp(mode) {
    currentOcrMode = mode;
    if (mode === 'phi-ton') {
        document.getElementById('ocr-modal-title').innerHTML = '<i class="ph-fill ph-camera text-amber-600 text-xl mr-2"></i> Báo Cáo Phí Phát Sinh';
        document.getElementById('ocr-upload-text').innerText = 'Chụp Hóa Đơn / Vé Trạm BOT';
        document.getElementById('ocr-upload-sub').innerText = 'AI OCR sẽ tự động trích xuất số tiền chi phí.';
    } else {
        document.getElementById('ocr-modal-title').innerHTML = '<i class="ph-fill ph-file-text text-emerald-600 text-xl mr-2"></i> Trả Chứng Từ Hoàn Thành';
        document.getElementById('ocr-upload-text').innerText = 'Chụp Phiếu EIR / Biên Bản POD';
        document.getElementById('ocr-upload-sub').innerText = 'AI OCR sẽ nhận diện số Cont, Seal để đối chiếu lệnh.';
    }
    openModal('modal-ocr');
}

function resetOcr() {
    document.getElementById('ocr-step-1').classList.remove('hidden-view');
    document.getElementById('ocr-step-2').classList.add('hidden-view');
    document.getElementById('ocr-step-3').classList.add('hidden-view');
    document.getElementById('ocr-form-expense').classList.add('hidden-view');
    document.getElementById('ocr-form-document').classList.add('hidden-view');
}

function startOcrScan() {
    document.getElementById('ocr-step-1').classList.add('hidden-view');
    document.getElementById('ocr-step-2').classList.remove('hidden-view');
    document.getElementById('ocr-step-2').classList.add('flex');
    
    setTimeout(() => {
        document.getElementById('ocr-step-2').classList.add('hidden-view');
        document.getElementById('ocr-step-2').classList.remove('flex');
        document.getElementById('ocr-step-3').classList.remove('hidden-view');
        
        if (currentOcrMode === 'phi-ton') {
            document.getElementById('ocr-form-expense').classList.remove('hidden-view');
            document.getElementById('ocr-raw-text').innerText = 'Dữ liệu gốc OCR: "Trạm thu phí Cầu Đồng Nai - 120.000 VNĐ"';
        } else {
            document.getElementById('ocr-form-document').classList.remove('hidden-view');
            const contVal = document.getElementById('detail-cont').innerText;
            const sealVal = document.getElementById('detail-seal').innerText;
            document.getElementById('ocr-raw-text').innerText = `Dữ liệu gốc OCR: "Phiếu Giao Nhận EIR - Cont: ${contVal}"`;
            document.getElementById('ocr-doc-cont').value = contVal;
            document.getElementById('ocr-doc-seal').value = sealVal !== '-' ? sealVal : 'SL-998877';
        }
    }, 1000);
}

async function submitOcrData() {
    if (!currentActiveTripCode) return;

    if (currentOcrMode === 'phi-ton') {
        const category = document.getElementById('ocr-expense-type').value;
        const amount = parseNumberVN(document.getElementById('ocr-amount').value);
        const raw_ocr = document.getElementById('ocr-raw-text').innerText;

        try {
            const res = await fetch(`/api/trips/${currentActiveTripCode}/expenses/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category, amount, raw_ocr })
            });
            const resData = await res.json();
            if (resData.success) {
                closeModal('modal-ocr');
                viewTripDetail(currentActiveTripCode);
                showToast('success', resData.message, 'Đã ghi nhận chi phí');
            }
        } catch (err) {
            showToast('danger', 'Lỗi khi gửi báo cáo chi phí.');
        }
    } else {
        const doc_type = document.getElementById('ocr-doc-type').value;
        const container_no = document.getElementById('ocr-doc-cont').value;
        const seal_no = document.getElementById('ocr-doc-seal').value;

        try {
            const res = await fetch(`/api/trips/${currentActiveTripCode}/documents/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ doc_type, container_no, seal_no })
            });
            const resData = await res.json();
            if (resData.success) {
                closeModal('modal-ocr');
                viewTripDetail(currentActiveTripCode);
                showToast('success', resData.message, 'Đã nghiệm thu chứng từ');
            }
        } catch (err) {
            showToast('danger', 'Lỗi khi gửi chứng từ hoàn tất.');
        }
    }
}

// --- 6. NHÂN SỰ & LƯƠNG ---
async function loadHRData() {
    try {
        const res = await fetch('/api/personnel/');
        if (!res.ok) throw new Error('Lỗi tải nhân sự');
        const data = await res.json();
        const tbody = document.getElementById('hr-tbody');
        tbody.innerHTML = '';
        data.forEach(nv => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50 transition-colors';
            tr.innerHTML = `
                <td class="p-4 font-black text-teal-800 font-heading text-sm">${nv.code}</td>
                <td class="p-4 font-bold text-slate-900 text-sm">${nv.name}</td>
                <td class="p-4 text-center font-bold text-slate-700 tabular-nums text-sm">${nv.trips}</td>
                <td class="p-4 text-right font-medium text-slate-600 tabular-nums text-sm">${new Intl.NumberFormat('vi-VN').format(nv.base_salary)} đ</td>
                <td class="p-4 text-right font-bold text-teal-700 tabular-nums text-sm">${new Intl.NumberFormat('vi-VN').format(nv.trip_salary)} đ</td>
                <td class="p-4 text-right font-medium text-rose-600 tabular-nums text-sm">-${new Intl.NumberFormat('vi-VN').format(nv.advance)} đ</td>
                <td class="p-4 text-right font-black text-emerald-600 tabular-nums font-heading text-sm">${new Intl.NumberFormat('vi-VN').format(nv.net_salary)} đ</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error loading HR data:', err);
    }
}

// --- 7. ĐỘI XE & BÃI ---
async function loadFleetData() {
    try {
        const res = await fetch('/api/fleet/');
        if (!res.ok) throw new Error('Lỗi tải đội xe');
        const data = await res.json();

        document.getElementById('fleet-stat-tractors').innerText = data.total_tractors;
        document.getElementById('fleet-stat-trailers').innerText = data.total_trailers;
        document.getElementById('fleet-stat-reg').innerText = data.reg_warning_count;
        document.getElementById('fleet-stat-maint').innerText = data.maint_warning_count;

        const tbody = document.getElementById('fleet-tbody');
        tbody.innerHTML = '';
        data.vehicles.forEach(v => {
            let statusCls = 'bg-emerald-100 text-emerald-800';
            if (v.is_reg_warning) statusCls = 'bg-rose-100 text-rose-700 font-black';
            if (v.is_maint_warning) statusCls = 'bg-amber-100 text-amber-700 font-bold';

            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50 transition-colors';
            tr.innerHTML = `
                <td class="p-4 font-black text-slate-900 font-heading text-sm">${v.plate}</td>
                <td class="p-4 font-medium text-slate-700 text-sm">${v.type}</td>
                <td class="p-4 font-bold text-slate-800 text-sm">${v.driver}</td>
                <td class="p-4 text-sm font-medium ${v.is_reg_warning ? 'text-rose-600 font-black' : 'text-slate-600'}">${v.reg_expiry}</td>
                <td class="p-4 text-sm font-medium ${v.is_maint_warning ? 'text-amber-600 font-bold' : 'text-slate-600'}">${v.maint_date}</td>
                <td class="p-4">
                    <span class="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider font-heading ${statusCls}">${v.status}</span>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error loading fleet data:', err);
    }
}

// --- 8. SALE & BÁO GIÁ CRM & BOOKINGS CRUD ---
function calculateQuoteExpectedRevenue() {
    const price = parseNumberVN(document.getElementById('quote-unit-price')?.value);
    const trips = parseNumberVN(document.getElementById('quote-monthly-trips')?.value);
    const revEl = document.getElementById('quote-preview-revenue');
    if (revEl) {
        revEl.innerText = new Intl.NumberFormat('vi-VN').format(price * trips) + ' đ';
    }
}

async function openModalQuotation(quoteId = null, isReadOnly = false) {
    const form = document.getElementById('form-quotation');
    if (form) {
        form.reset();
        form.querySelectorAll('input, select, textarea').forEach(el => el.disabled = isReadOnly);
    }

    const titleEl = document.getElementById('modal-quotation-title');
    const submitBtn = document.getElementById('btn-submit-quote');
    const btnText = document.getElementById('btn-save-quote-text');
    const idInput = document.getElementById('quote-id');

    if (submitBtn) {
        submitBtn.style.display = isReadOnly ? 'none' : 'inline-flex';
    }

    if (!quoteId) {
        if (idInput) idInput.value = '';
        if (titleEl) titleEl.innerText = 'Thêm Báo Giá Tuyến Cước Mới';
        if (btnText) btnText.innerText = 'Lưu Báo Giá';
        const priceInput = document.getElementById('quote-unit-price');
        if (priceInput) priceInput.value = formatNumberVN(3800000);
        const tripsInput = document.getElementById('quote-monthly-trips');
        if (tripsInput) tripsInput.value = formatNumberVN(20);
        calculateQuoteExpectedRevenue();
    } else {
        if (idInput) idInput.value = quoteId;
        if (titleEl) titleEl.innerText = isReadOnly ? 'Đang tải chi tiết báo giá...' : 'Đang tải thông tin báo giá...';
        if (btnText) btnText.innerText = 'Cập Nhật Báo Giá';

        try {
            const res = await fetch(`/api/quotations/${quoteId}/`);
            if (!res.ok) throw new Error('Không thể tải báo giá');
            const q = await res.json();

            if (titleEl) {
                titleEl.innerText = isReadOnly 
                    ? `Chi Tiết Báo Giá [${q.quotation_code}]` 
                    : `Hiệu Chỉnh Báo Giá [${q.quotation_code}]`;
            }
            const custEl = document.getElementById('quote-customer');
            if (custEl) custEl.value = q.customer_name;
            const routeEl = document.getElementById('quote-route');
            if (routeEl) routeEl.value = q.route_description;
            const priceEl = document.getElementById('quote-unit-price');
            if (priceEl) priceEl.value = formatNumberVN(q.unit_price);
            const tripsEl = document.getElementById('quote-monthly-trips');
            if (tripsEl) tripsEl.value = formatNumberVN(q.expected_trips_monthly);
            const statusEl = document.getElementById('quote-status');
            if (statusEl) statusEl.value = q.status;

            calculateQuoteExpectedRevenue();
        } catch (err) {
            console.error('Lỗi tải chi tiết báo giá:', err);
            showToast('error', 'Không thể tải thông tin báo giá để xem/chỉnh sửa', 'Lỗi');
            return;
        }
    }

    initAllNumberInputs();
    openModal('modal-quotation');
}

async function saveQuotation(e) {
    e.preventDefault();
    const id = document.getElementById('quote-id')?.value;
    const customer = document.getElementById('quote-customer')?.value?.trim();
    const route = document.getElementById('quote-route')?.value?.trim();
    const unitPrice = parseNumberVN(document.getElementById('quote-unit-price')?.value);
    const monthlyTrips = parseNumberVN(document.getElementById('quote-monthly-trips')?.value);
    const statusVal = document.getElementById('quote-status')?.value || 'NEGOTIATING';

    if (!customer || !route) {
        showToast('warning', 'Vui lòng nhập đầy đủ tên khách hàng và tuyến đường', 'Thiếu Thông Tin');
        return;
    }

    try {
        let res;
        if (id) {
            res = await fetch(`/api/quotations/${id}/`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer: customer,
                    route_description: route,
                    unit_price: unitPrice,
                    expected_trips_monthly: monthlyTrips,
                    status: statusVal
                })
            });
        } else {
            res = await fetch('/api/sales/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create_quotation',
                    customer: customer,
                    route_description: route,
                    unit_price: unitPrice,
                    monthly_trips: monthlyTrips,
                    status: statusVal
                })
            });
        }

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi lưu báo giá');

        showToast('success', data.message || 'Lưu báo giá thành công!', 'Thành Công');
        closeModal('modal-quotation');
        loadSalesData();
    } catch (err) {
        console.error('Error saving quotation:', err);
        showToast('error', err.message || 'Không thể lưu báo giá', 'Lỗi');
    }
}

async function changeQuotationStatus(quoteId, newStatus) {
    if (!newStatus) return;
    try {
        const res = await fetch(`/api/quotations/${quoteId}/status/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi chuyển trạng thái');

        showToast('success', data.message || 'Đã cập nhật trạng thái báo giá', 'Thành Công');
        loadSalesData();
    } catch (err) {
        console.error('Error updating quotation status:', err);
        showToast('error', err.message || 'Lỗi đổi trạng thái', 'Lỗi');
    }
}

async function deleteQuotation(quoteId) {
    if (!confirm('Bạn có chắc chắn muốn xóa báo giá này không? Dữ liệu lịch sử sẽ được bảo lưu an toàn.')) return;
    try {
        const res = await fetch(`/api/quotations/${quoteId}/`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi xóa báo giá');

        showToast('success', data.message || 'Đã xóa báo giá', 'Thành Công');
        loadSalesData();
    } catch (err) {
        console.error('Error deleting quotation:', err);
        showToast('error', err.message || 'Lỗi xóa báo giá', 'Lỗi');
    }
}

function onBookingTypeChange() {
    const type = document.getElementById('booking-type')?.value;
    const shipInput = document.getElementById('booking-shipping-line');
    const pickupInput = document.getElementById('booking-pickup');
    const dropoffInput = document.getElementById('booking-dropoff');

    if (type === 'DOMESTIC') {
        if (shipInput && !shipInput.value) shipInput.value = 'NỘI ĐỊA';
        if (pickupInput && !pickupInput.value) pickupInput.placeholder = 'Kho bốc / Nhà máy A...';
        if (dropoffInput && !dropoffInput.value) dropoffInput.placeholder = 'Kho dỡ / Điểm giao B...';
    } else if (type === 'EXPORT_FCL') {
        if (shipInput && shipInput.value === 'NỘI ĐỊA') shipInput.value = '';
        if (pickupInput) pickupInput.placeholder = 'VD: Bãi cấp rỗng Solog, Sowatco...';
        if (dropoffInput) dropoffInput.placeholder = 'VD: Cảng Gemalink, Cát Lái...';
    } else if (type === 'IMPORT_FCL') {
        if (shipInput && shipInput.value === 'NỘI ĐỊA') shipInput.value = '';
        if (pickupInput) pickupInput.placeholder = 'VD: Cảng Cát Lái, Cái Mép...';
        if (dropoffInput) dropoffInput.placeholder = 'VD: Bãi trả rỗng Tân Cảng...';
    }
}

async function openModalBooking(bookingId = null, isReadOnly = false) {
    const form = document.getElementById('form-booking');
    if (form) {
        form.reset();
        form.querySelectorAll('input, select, textarea').forEach(el => el.disabled = isReadOnly);
    }

    const titleEl = document.getElementById('modal-booking-title');
    const submitBtn = document.getElementById('btn-submit-booking');
    const btnText = document.getElementById('btn-save-booking-text');
    const idInput = document.getElementById('booking-id');

    if (submitBtn) {
        submitBtn.style.display = isReadOnly ? 'none' : 'inline-flex';
    }

    const todayStr = new Date().toISOString().split('T')[0];

    if (!bookingId) {
        if (idInput) idInput.value = '';
        if (titleEl) titleEl.innerText = 'Tiếp Nhận Đơn Đặt Hàng / Booking Mới Từ Khách Hàng';
        if (btnText) btnText.innerText = 'Tiếp Nhận Đơn Hàng';
        const dateInput = document.getElementById('booking-loading-date');
        if (dateInput) dateInput.value = todayStr;
        const totalInput = document.getElementById('booking-total-containers');
        if (totalInput) totalInput.value = formatNumberVN(1);
        const detInput = document.getElementById('booking-det');
        if (detInput) detInput.value = formatNumberVN(7);
        const demInput = document.getElementById('booking-dem');
        if (demInput) demInput.value = formatNumberVN(7);
        const priceInput = document.getElementById('booking-price');
        if (priceInput) priceInput.value = formatNumberVN(4000000);
        onBookingTypeChange();
    } else {
        if (idInput) idInput.value = bookingId;
        if (titleEl) titleEl.innerText = isReadOnly ? 'Đang tải chi tiết đơn hàng / booking...' : 'Đang tải thông tin đơn hàng / booking...';
        if (btnText) btnText.innerText = 'Cập Nhật Đơn Hàng';

        try {
            const res = await fetch(`/api/bookings/${bookingId}/`);
            if (!res.ok) throw new Error('Không thể tải chi tiết đơn hàng / booking');
            const b = await res.json();

            if (titleEl) {
                titleEl.innerText = isReadOnly 
                    ? `Chi Tiết Đơn Hàng / Booking [${b.booking_code}]` 
                    : `Hiệu Chỉnh Đơn Hàng / Booking [${b.booking_code}]`;
            }
            
            const typeEl = document.getElementById('booking-type');
            if (typeEl) typeEl.value = b.booking_type || 'EXPORT_FCL';
            const custEl = document.getElementById('booking-customer');
            if (custEl) custEl.value = b.customer_name || '';
            const numEl = document.getElementById('booking-number');
            if (numEl) numEl.value = b.booking_number || '';
            const shipEl = document.getElementById('booking-shipping-line');
            if (shipEl) shipEl.value = b.shipping_line || '';
            const vesEl = document.getElementById('booking-vessel');
            if (vesEl) vesEl.value = b.vessel_voyage || '';
            const sizeEl = document.getElementById('booking-container-size');
            if (sizeEl) sizeEl.value = b.container_size || '40HC';
            const totalEl = document.getElementById('booking-total-containers');
            if (totalEl) totalEl.value = formatNumberVN(b.total_containers || 1);
            const comEl = document.getElementById('booking-commodity');
            if (comEl) comEl.value = b.commodity || '';
            const hsEl = document.getElementById('booking-hs-code');
            if (hsEl) hsEl.value = b.hs_code || '';
            const pickEl = document.getElementById('booking-pickup');
            if (pickEl) pickEl.value = b.pickup_location || '';
            const delEl = document.getElementById('booking-delivery');
            if (delEl) delEl.value = b.delivery_location || '';
            const dropEl = document.getElementById('booking-dropoff');
            if (dropEl) dropEl.value = b.dropoff_location || '';
            const dateEl = document.getElementById('booking-loading-date');
            if (dateEl) dateEl.value = b.loading_date || todayStr;
            const timeEl = document.getElementById('booking-loading-time');
            if (timeEl) timeEl.value = b.loading_time || '8H';
            const closingEl = document.getElementById('booking-closing-time');
            if (closingEl) closingEl.value = b.closing_time || '';
            const siEl = document.getElementById('booking-si-cutoff');
            if (siEl) siEl.value = b.si_cutoff || '';
            const detEl = document.getElementById('booking-det');
            if (detEl) detEl.value = formatNumberVN(b.free_time_detention ?? 7);
            const demEl = document.getElementById('booking-dem');
            if (demEl) demEl.value = formatNumberVN(b.free_time_demurrage ?? 7);
            const priceEl = document.getElementById('booking-price');
            if (priceEl) priceEl.value = formatNumberVN(b.selling_freight_price || b.freight_price || 4000000);
            const statusEl = document.getElementById('booking-status');
            if (statusEl) statusEl.value = b.status || 'PENDING_DISPATCH';
            const notesEl = document.getElementById('booking-notes');
            if (notesEl) notesEl.value = b.notes || '';

            onBookingTypeChange();
        } catch (err) {
            console.error('Lỗi tải chi tiết booking:', err);
            showToast('error', 'Không thể tải thông tin đơn hàng để xem/chỉnh sửa', 'Lỗi');
            return;
        }
    }

    initAllNumberInputs();
    openModal('modal-booking');
}

async function saveBooking(e) {
    e.preventDefault();
    const id = document.getElementById('booking-id')?.value;
    const bookingType = document.getElementById('booking-type')?.value || 'EXPORT_FCL';
    const customer = document.getElementById('booking-customer')?.value?.trim();
    const bookingNumber = document.getElementById('booking-number')?.value?.trim();
    const shippingLine = document.getElementById('booking-shipping-line')?.value?.trim();
    const vessel = document.getElementById('booking-vessel')?.value?.trim();
    const containerSize = document.getElementById('booking-container-size')?.value || '40HC';
    const totalContainers = parseNumberVN(document.getElementById('booking-total-containers')?.value) || 1;
    const commodity = document.getElementById('booking-commodity')?.value?.trim();
    const hsCode = document.getElementById('booking-hs-code')?.value?.trim();
    const pickup = document.getElementById('booking-pickup')?.value?.trim();
    const delivery = document.getElementById('booking-delivery')?.value?.trim();
    const dropoff = document.getElementById('booking-dropoff')?.value?.trim();
    const loadingDate = document.getElementById('booking-loading-date')?.value;
    const loadingTime = document.getElementById('booking-loading-time')?.value?.trim() || '8H';
    const closingTime = document.getElementById('booking-closing-time')?.value?.trim();
    const siCutoff = document.getElementById('booking-si-cutoff')?.value?.trim();
    const det = parseNumberVN(document.getElementById('booking-det')?.value) || 7;
    const dem = parseNumberVN(document.getElementById('booking-dem')?.value) || 7;
    const price = parseNumberVN(document.getElementById('booking-price')?.value) || 0;
    const statusVal = document.getElementById('booking-status')?.value || 'PENDING_DISPATCH';
    const notes = document.getElementById('booking-notes')?.value?.trim();

    if (!customer || !bookingNumber || !pickup || !delivery || !dropoff) {
        showToast('warning', 'Vui lòng điền đủ: Khách hàng, Số đơn/booking và Lộ trình 3 điểm', 'Thiếu Thông Tin');
        return;
    }

    try {
        const payload = {
            action: 'create_booking',
            booking_type: bookingType,
            customer: customer,
            booking_number: bookingNumber,
            shipping_line: shippingLine,
            vessel_voyage: vessel,
            container_size: containerSize,
            total_containers: totalContainers,
            commodity: commodity,
            hs_code: hsCode,
            pickup_location: pickup,
            delivery_location: delivery,
            dropoff_location: dropoff,
            loading_date: loadingDate,
            loading_time: loadingTime,
            closing_time: closingTime,
            si_cutoff: siCutoff,
            free_time_detention: det,
            free_time_demurrage: dem,
            selling_freight_price: price,
            status: statusVal,
            notes: notes
        };

        let res;
        if (id) {
            res = await fetch(`/api/bookings/${id}/`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            res = await fetch('/api/sales/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi lưu đơn hàng / booking');

        showToast('success', data.message || 'Tiếp nhận đơn hàng thành công!', 'Thành Công');
        closeModal('modal-booking');
        loadSalesData();
        loadActiveBookingsForModal();
    } catch (err) {
        console.error('Error saving booking:', err);
        showToast('error', err.message || 'Không thể lưu đơn hàng / booking', 'Lỗi');
    }
}

async function changeBookingStatus(bookingId, newStatus) {
    if (!newStatus) return;
    try {
        const res = await fetch(`/api/bookings/${bookingId}/status/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi chuyển trạng thái');

        showToast('success', data.message || 'Đã cập nhật trạng thái đơn hàng', 'Thành Công');
        loadSalesData();
        loadActiveBookingsForModal();
    } catch (err) {
        console.error('Error updating booking status:', err);
        showToast('error', err.message || 'Lỗi đổi trạng thái đơn hàng', 'Lỗi');
    }
}

async function deleteBooking(bookingId) {
    if (!confirm('Bạn có chắc chắn muốn xóa / hủy đơn hàng này không? Dữ liệu lịch sử sẽ được bảo lưu an toàn.')) return;
    try {
        const res = await fetch(`/api/bookings/${bookingId}/`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi xóa đơn hàng');

        showToast('success', data.message || 'Đã xóa đơn hàng / booking', 'Thành Công');
        loadSalesData();
        loadActiveBookingsForModal();
    } catch (err) {
        console.error('Error deleting booking:', err);
        showToast('error', err.message || 'Lỗi xóa đơn hàng / booking', 'Lỗi');
    }
}

function switchSalesSubTab(tabName) {
    const tabQuotesBtn = document.getElementById('tab-btn-quotations');
    const tabBookingsBtn = document.getElementById('tab-btn-bookings');
    const subtabQuotes = document.getElementById('subtab-sales-quotations');
    const subtabBookings = document.getElementById('subtab-sales-bookings');
    const roleHint = document.getElementById('sales-tab-role-hint');

    if (tabName === 'quotations') {
        if (subtabQuotes) subtabQuotes.classList.remove('hidden');
        if (subtabBookings) subtabBookings.classList.add('hidden');

        if (tabQuotesBtn) {
            tabQuotesBtn.className = 'flex-1 md:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold font-heading flex items-center justify-center space-x-2.5 transition-all shadow-sm bg-indigo-700 text-white';
            const badge = tabQuotesBtn.querySelector('#badge-count-quotes');
            if (badge) badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-black bg-white/20 text-white tabular-nums';
        }
        if (tabBookingsBtn) {
            tabBookingsBtn.className = 'flex-1 md:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold font-heading flex items-center justify-center space-x-2.5 transition-all text-slate-600 hover:text-slate-900 hover:bg-slate-100';
            const badge = tabBookingsBtn.querySelector('#badge-count-bookings');
            if (badge) badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-100 text-teal-800 tabular-nums';
        }
        if (roleHint) {
            roleHint.innerHTML = 'Phân quyền: <strong class="text-indigo-700">Nhân viên Kinh doanh (NVKD)</strong> — Khảo sát tuyến, chào giá, đàm phán hợp đồng';
        }
    } else if (tabName === 'bookings') {
        if (subtabQuotes) subtabQuotes.classList.add('hidden');
        if (subtabBookings) subtabBookings.classList.remove('hidden');

        if (tabBookingsBtn) {
            tabBookingsBtn.className = 'flex-1 md:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold font-heading flex items-center justify-center space-x-2.5 transition-all shadow-sm bg-teal-700 text-white';
            const badge = tabBookingsBtn.querySelector('#badge-count-bookings');
            if (badge) badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-black bg-white/20 text-white tabular-nums';
        }
        if (tabQuotesBtn) {
            tabQuotesBtn.className = 'flex-1 md:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold font-heading flex items-center justify-center space-x-2.5 transition-all text-slate-600 hover:text-slate-900 hover:bg-slate-100';
            const badge = tabQuotesBtn.querySelector('#badge-count-quotes');
            if (badge) badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800 tabular-nums';
        }
        if (roleHint) {
            roleHint.innerHTML = 'Phân quyền: <strong class="text-teal-700">Sale Admin / CS (Chăm sóc Khách hàng)</strong> — Booking hãng tàu, kiểm soát SI/CY cut-off, chuyển giao điều xe';
        }
    }
}

async function loadSalesData() {
    try {
        const res = await fetch('/api/sales/');
        if (!res.ok) throw new Error('Lỗi tải dữ liệu kinh doanh');
        const data = await res.json();

        // Cập nhật Cụm Chỉ Số Tình Trạng Kinh Doanh & Tăng Trưởng (Màn hình chính)
        if (data.overview_metrics) {
            const ov = data.overview_metrics;
            const revEl = document.getElementById('sales-overview-revenue');
            if (revEl) revEl.innerText = new Intl.NumberFormat('vi-VN').format(ov.revenue_monthly) + ' đ';
            const revTrendEl = document.getElementById('sales-trend-revenue');
            if (revTrendEl) revTrendEl.innerHTML = `<i class="ph-bold ph-trend-up"></i> ${ov.revenue_trend}`;
            const revNoteEl = document.getElementById('sales-note-revenue');
            if (revNoteEl) revNoteEl.innerHTML = `<i class="ph-fill ph-check-circle text-emerald-600 text-xs"></i> ${ov.revenue_note}`;

            const bkEl = document.getElementById('sales-overview-bookings');
            if (bkEl) bkEl.innerText = `${new Intl.NumberFormat('vi-VN').format(ov.total_bookings || 0)} Đơn hàng`;
            const bkTrendEl = document.getElementById('sales-trend-bookings');
            if (bkTrendEl) bkTrendEl.innerHTML = `<i class="ph-bold ph-trend-up"></i> ${ov.booking_trend}`;
            const bkNoteEl = document.getElementById('sales-note-bookings');
            if (bkNoteEl) bkNoteEl.innerHTML = `<i class="ph-fill ph-truck text-teal-600 text-xs"></i> ${ov.booking_note}`;

            const contEl = document.getElementById('sales-overview-containers');
            if (contEl) contEl.innerText = `${new Intl.NumberFormat('vi-VN').format(ov.total_containers || 0)} Cont`;
            const contTrendEl = document.getElementById('sales-trend-containers');
            if (contTrendEl) contTrendEl.innerHTML = `<i class="ph-bold ph-trend-up"></i> ${ov.container_trend}`;
            const contNoteEl = document.getElementById('sales-note-containers');
            if (contNoteEl) contNoteEl.innerHTML = `<i class="ph-fill ph-package text-amber-600 text-xs"></i> ${ov.container_note}`;

            const winEl = document.getElementById('sales-overview-winrate');
            if (winEl) winEl.innerText = `${ov.win_rate}%`;
            const winTrendEl = document.getElementById('sales-trend-winrate');
            if (winTrendEl) winTrendEl.innerHTML = `<i class="ph-bold ph-trend-up"></i> ${ov.win_rate_trend}`;
            const winNoteEl = document.getElementById('sales-note-winrate');
            if (winNoteEl) winNoteEl.innerHTML = `<i class="ph-fill ph-chats-circle text-indigo-600 text-xs"></i> ${ov.win_rate_note}`;
        }

        // Cập nhật badges số lượng trên 2 tab
        const bQuoteCount = document.getElementById('badge-count-quotes');
        if (bQuoteCount && data.quotations) bQuoteCount.innerText = new Intl.NumberFormat('vi-VN').format(data.quotations.length);
        const bBookingCount = document.getElementById('badge-count-bookings');
        if (bBookingCount && data.bookings) bBookingCount.innerText = new Intl.NumberFormat('vi-VN').format(data.bookings.length);

        // Cập nhật stats con cho Báo giá & Booking (Dashboard riêng từng tab)
        if (data.stats) {
            const qs = data.stats.quotation_stats;
            if (qs) {
                const qNeg = document.getElementById('stat-quote-negotiating');
                if (qNeg) qNeg.innerText = new Intl.NumberFormat('vi-VN').format(qs.negotiating || 0);
                const qPending = document.getElementById('stat-quote-pending');
                if (qPending) qPending.innerText = new Intl.NumberFormat('vi-VN').format(qs.pending_approval || 0);
                const qApp = document.getElementById('stat-quote-approved');
                if (qApp) qApp.innerText = new Intl.NumberFormat('vi-VN').format(qs.approved || 0);
                const qRev = document.getElementById('stat-quote-revenue');
                if (qRev) qRev.innerText = new Intl.NumberFormat('vi-VN').format(qs.expected_revenue || 0) + ' đ';
            }

            const bs = data.stats.booking_stats;
            if (bs) {
                const pEl = document.getElementById('sales-stat-pending-dispatch');
                if (pEl) pEl.innerText = new Intl.NumberFormat('vi-VN').format(bs.pending_dispatch || 0);
                const partEl = document.getElementById('sales-stat-partially-dispatched');
                if (partEl) partEl.innerText = new Intl.NumberFormat('vi-VN').format(bs.partially_dispatched || 0);
                const cEl = document.getElementById('sales-stat-completed');
                if (cEl) cEl.innerText = new Intl.NumberFormat('vi-VN').format(bs.completed || 0);

                const dispContEl = document.getElementById('sales-stat-dispatched-containers');
                if (dispContEl) dispContEl.innerText = new Intl.NumberFormat('vi-VN').format(bs.dispatched_containers || 0);
                const totContEl = document.getElementById('sales-stat-total-containers');
                if (totContEl) totContEl.innerText = new Intl.NumberFormat('vi-VN').format(bs.total_containers || 0);
                const remContEl = document.getElementById('sales-stat-remaining-containers');
                if (remContEl) remContEl.innerText = new Intl.NumberFormat('vi-VN').format(bs.remaining_containers || 0);
            }
        }

        // Render Bookings Table (Tinh gọn, giảm bớt chữ thừa, cân bằng typography)
        const bkBody = document.getElementById('sales-bookings-tbody');
        if (bkBody && data.bookings) {
            bkBody.innerHTML = '';
            data.bookings.forEach(b => {
                const tr = document.createElement('tr');
                tr.className = b.is_urgent 
                    ? 'hover:bg-amber-50/70 bg-amber-50/25 transition-colors' 
                    : 'hover:bg-slate-50 transition-colors';
                
                const statusBadge = b.status === 'PENDING_DISPATCH' 
                    ? '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200 inline-block">Chờ điều xe</span>'
                    : b.status === 'PARTIALLY_DISPATCHED'
                    ? '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase bg-teal-100 text-teal-800 border border-teal-200 inline-block">Đang điều xe</span>'
                    : b.status === 'COMPLETED'
                    ? '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 inline-block">Đã đủ cont</span>'
                    : '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-200 inline-block">Đã hủy</span>';

                const urgentBadge = b.is_urgent ? `
                    <span class="ml-1 px-1.5 py-0.2 rounded text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200 inline-flex items-center gap-0.5">
                        <i class="ph-bold ph-warning-circle text-[11px]"></i> GẤP
                    </span>
                ` : '';

                // Phân loại nhãn dịch vụ gọn gàng
                const svcTag = b.booking_type === 'DOMESTIC' ? 'Nội Địa FTL' : (b.booking_type === 'IMPORT_FCL' ? 'Nhập FCL' : 'Xuất FCL');
                const svcCls = b.booking_type === 'DOMESTIC' ? 'bg-amber-50 text-amber-800 border-amber-200' : (b.booking_type === 'IMPORT_FCL' ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-teal-50 text-teal-800 border-teal-200');

                // Hàm rút gọn địa điểm loại bỏ ngoặc rườm rà
                const cleanLoc = (s) => (s || '-').replace(/\([^)]*\)/g, '').trim();

                tr.innerHTML = `
                    <td class="p-3.5">
                        <div class="flex items-center">
                            <span class="font-black text-slate-900 font-heading text-sm">${b.booking_code}</span>
                            ${urgentBadge}
                        </div>
                        <p class="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                            <i class="ph-bold ph-calendar-blank text-slate-400"></i> ${b.loading_date} · ${b.loading_time}
                        </p>
                    </td>
                    <td class="p-3.5">
                        <p class="font-bold text-slate-900 text-sm truncate max-w-[200px]" title="${b.customer}">${b.customer}</p>
                        <p class="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
                            <span class="px-1.5 py-0.5 rounded font-bold border text-[11px] ${svcCls}">${svcTag}</span>
                            <span class="font-bold text-teal-800 truncate max-w-[120px]">${b.shipping_line}</span>
                        </p>
                    </td>
                    <td class="p-3.5 font-mono text-sm">
                        <p class="font-black text-indigo-900">${b.booking_number || '-'}</p>
                        <p class="text-xs text-slate-400 font-normal truncate max-w-[120px]">${b.vessel_voyage || '-'}</p>
                    </td>
                    <td class="p-3.5">
                        <div class="flex items-center gap-1.5">
                            <span class="px-1.5 py-0.5 rounded font-black text-xs bg-slate-100 text-slate-800 border border-slate-200 uppercase">${b.container_size}</span>
                            <span class="text-sm font-semibold text-slate-800 truncate max-w-[130px]" title="${b.commodity || 'Hàng hóa'}">${b.commodity || 'Hàng hóa'}</span>
                        </div>
                    </td>
                    <td class="p-3.5">
                        <div class="flex items-center space-x-1.5 mb-1">
                            <span class="font-black text-slate-900 text-sm tabular-nums">${b.progress}</span>
                            <div class="w-12 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                <div class="bg-teal-600 h-1.5 rounded-full" style="width: ${b.progress_percent}%"></div>
                            </div>
                        </div>
                        <div>${statusBadge}</div>
                    </td>
                    <td class="p-3.5">
                        <div class="text-[13px] leading-snug space-y-0.5 max-w-[220px]">
                            <p class="truncate text-slate-700"><strong class="text-teal-700 font-bold">1. Lấy:</strong> ${cleanLoc(b.pickup)}</p>
                            <p class="truncate text-slate-900 font-semibold"><strong class="text-slate-900 font-bold">2. Kho:</strong> ${cleanLoc(b.delivery)}</p>
                            ${b.dropoff ? `<p class="truncate text-slate-700"><strong class="text-indigo-700 font-bold">3. Hạ:</strong> ${cleanLoc(b.dropoff)}</p>` : ''}
                        </div>
                    </td>
                    <td class="p-3.5 font-mono text-sm">
                        <p class="font-bold text-rose-700">${b.closing_time || '-'}</p>
                        ${b.si_cutoff ? `<p class="text-[11px] text-slate-400 mt-0.5 font-sans">SI: ${b.si_cutoff}</p>` : ''}
                    </td>
                    <td class="p-3.5 text-right font-black text-slate-900 text-sm tabular-nums">
                        ${new Intl.NumberFormat('vi-VN').format(b.price)} đ
                    </td>
                    <td class="p-3.5 text-center">
                        <div class="flex items-center justify-center space-x-1.5">
                            ${b.status !== 'COMPLETED' && b.status !== 'CANCELLED' ? `
                                <button onclick="dispatchFromBooking(${b.id})" class="px-2.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center gap-1 font-heading" title="Điều xe ngay">
                                    <i class="ph-fill ph-paper-plane-tilt text-xs"></i>
                                    <span>Điều Xe</span>
                                </button>
                            ` : `
                                <span class="px-2 py-1 text-xs text-emerald-700 font-bold flex items-center gap-0.5">
                                    <i class="ph-fill ph-check"></i> Đủ xe
                                </span>
                            `}
                            <!-- 1. Xem chi tiết Booking (Chế độ chỉ đọc) -->
                            <button onclick="openModalBooking(${b.id}, true)" title="Xem chi tiết đơn hàng" 
                                class="p-1.5 rounded-lg bg-slate-100 hover:bg-sky-100 text-slate-600 hover:text-sky-700 transition-colors">
                                <i class="ph-bold ph-eye text-sm"></i>
                            </button>
                            <!-- 2. Sửa Booking (Chế độ chỉnh sửa) -->
                            <button onclick="openModalBooking(${b.id}, false)" title="Hiệu chỉnh đơn hàng" 
                                class="p-1.5 rounded-lg bg-slate-100 hover:bg-teal-100 text-slate-600 hover:text-teal-700 transition-colors">
                                <i class="ph-bold ph-pencil-simple text-sm"></i>
                            </button>
                            <!-- 3. Xóa Booking -->
                            <button onclick="deleteBooking(${b.id})" title="Xóa đơn hàng" 
                                class="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 transition-colors">
                                <i class="ph-bold ph-trash text-sm"></i>
                            </button>
                        </div>
                    </td>
                `;
                bkBody.appendChild(tr);
            });
        }

        // Render Quotations Table
        const tbody = document.getElementById('sales-tbody');
        if (tbody && data.quotations) {
            tbody.innerHTML = '';
            data.quotations.forEach(s => {
                let statusCls = 'bg-teal-100 text-teal-800';
                if (s.status.includes('Đã duyệt')) statusCls = 'bg-emerald-100 text-emerald-800';
                if (s.status.includes('Chờ') || s.status.includes('thương lượng')) statusCls = 'bg-amber-100 text-amber-800';
                if (s.status.includes('Từ chối') || s.status.includes('hết hiệu lực')) statusCls = 'bg-rose-100 text-rose-800';

                const tr = document.createElement('tr');
                tr.className = 'hover:bg-slate-50 transition-colors';
                tr.innerHTML = `
                    <td class="p-3.5 font-black text-indigo-950 font-heading text-sm">${s.code}</td>
                    <td class="p-3.5 font-bold text-slate-900 text-sm">${s.customer}</td>
                    <td class="p-3.5 font-medium text-slate-700 text-[13.5px]">${s.route}</td>
                    <td class="p-3.5 font-semibold text-slate-700 tabular-nums text-sm">${new Intl.NumberFormat('vi-VN').format(s.unit_price)} đ</td>
                    <td class="p-3.5 text-center font-bold text-teal-700 tabular-nums text-sm">${new Intl.NumberFormat('vi-VN').format(s.monthly_trips || 0)} <span class="text-xs text-slate-400 font-normal">chuyến</span></td>
                    <td class="p-3.5 text-right font-black text-emerald-700 tabular-nums font-heading text-sm">${new Intl.NumberFormat('vi-VN').format(s.expected_revenue)} đ</td>
                    <td class="p-3.5">
                        <span class="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider font-heading ${statusCls}">${s.status}</span>
                    </td>
                    <td class="p-3.5 text-center">
                        <div class="flex items-center justify-center space-x-1.5">
                            <!-- 1. Xem chi tiết Báo Giá (Chế độ chỉ đọc) -->
                            <button onclick="openModalQuotation(${s.id}, true)" title="Xem chi tiết báo giá" 
                                class="p-1.5 rounded-lg bg-slate-100 hover:bg-sky-100 text-slate-600 hover:text-sky-700 transition-colors">
                                <i class="ph-bold ph-eye text-sm"></i>
                            </button>
                            <!-- 2. Sửa Báo Giá (Chế độ chỉnh sửa) -->
                            <button onclick="openModalQuotation(${s.id}, false)" title="Chỉnh sửa báo giá" 
                                class="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 transition-colors">
                                <i class="ph-bold ph-pencil-simple text-sm"></i>
                            </button>
                            <!-- 3. Xóa Báo Giá -->
                            <button onclick="deleteQuotation(${s.id})" title="Xóa báo giá" 
                                class="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 transition-colors">
                                <i class="ph-bold ph-trash text-sm"></i>
                            </button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (err) {
        console.error('Error loading sales data:', err);
    }
}

// --- 9. ĐIỀU HƯỚNG TAB & SỰ KIỆN ---
function switchTab(tabId) {
    document.querySelectorAll('.sidebar-item-main').forEach(btn => {
        btn.classList.remove('active');
        const icon = btn.querySelector('i');
        if (icon) icon.className = icon.className.replace('text-teal-300', 'text-slate-400');
    });

    const activeBtn = document.querySelector(`[data-target="${tabId}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
        const icon = activeBtn.querySelector('i');
        if (icon) icon.className = icon.className.replace('text-slate-400', 'text-teal-300');
    }

    document.querySelectorAll('.view').forEach(view => view.classList.add('hidden-view'));
    const targetView = document.getElementById(`view-${tabId}`);
    if (targetView) targetView.classList.remove('hidden-view');

    // Cập nhật trạng thái URL: nếu về dashboard thì giữ nguyên link gốc '/'
    if (window.history && window.history.replaceState) {
        window.history.replaceState(null, null, tabId === 'dashboard' ? window.location.pathname : `#${tabId}`);
    }

    if (tabId === 'dashboard') loadDashboardData();
    if (tabId === 'dieu-van') loadTripsData();
    if (tabId === 'nhan-su') loadHRData();
    if (tabId === 'xe-bai') loadFleetData();
    if (tabId === 'kinh-doanh') loadSalesData();
    if (tabId === 'ke-toan') loadAccountingData();
    if (tabId === 'cai-dat') loadMasterData();
}

function handleSearch(e) {
    if (e.key === 'Enter') {
        const topSearch = document.getElementById('top-search-input');
        const tableSearch = document.getElementById('table-search-input');
        if (topSearch && tableSearch) {
            tableSearch.value = topSearch.value;
        }
        switchTab('dieu-van');
        loadTripsData();
    }
}

let activeBookingsCache = [];

async function loadActiveBookingsForModal(selectedBookingId = null) {
    const sel = document.getElementById('select-booking-order');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Đang tải danh sách Booking từ Sale... --</option>';
    try {
        const res = await fetch('/api/bookings/active/');
        if (!res.ok) throw new Error('Lỗi tải booking');
        activeBookingsCache = await res.json();
        
        sel.innerHTML = '<option value="">-- Chọn Booking / Đơn Hàng Từ Sale (Hoặc Nhập Thủ Công) --</option>';
        activeBookingsCache.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.id;
            opt.innerText = `[${b.booking_code}] ${b.customer_name} | B/L: ${b.booking_number} (${b.container_size} - Còn ${b.remaining_containers} cont) | Kho: ${b.delivery_location}`;
            if (selectedBookingId && String(selectedBookingId) === String(b.id)) {
                opt.selected = true;
            }
            sel.appendChild(opt);
        });

        if (selectedBookingId) {
            onBookingSelected(selectedBookingId);
        }
    } catch (err) {
        console.error('Error loading active bookings:', err);
        sel.innerHTML = '<option value="">-- Lỗi tải danh sách Booking (Nhập thủ công) --</option>';
    }
}

function onBookingSelected(bookingId) {
    if (!bookingId) return;
    const b = activeBookingsCache.find(item => String(item.id) === String(bookingId));
    if (!b) return;

    // Tự động điền 9 trường dữ liệu kế thừa từ Booking của Sale
    const custEl = document.getElementById('inp-customer');
    if (custEl) custEl.value = b.customer_name;
    
    const contTypeEl = document.getElementById('inp-cont-type');
    if (contTypeEl) contTypeEl.value = b.container_size || '40HC';

    const bookingEl = document.getElementById('inp-booking');
    if (bookingEl) bookingEl.value = b.booking_number || '';

    const cutoffEl = document.getElementById('inp-cutoff');
    if (cutoffEl) cutoffEl.value = b.closing_time || '';

    const loadTimeEl = document.getElementById('inp-load-time');
    if (loadTimeEl) loadTimeEl.value = `${b.loading_date_display || ''} - ${b.loading_time || '8H'}`.trim();

    const pickupEl = document.getElementById('inp-pickup');
    if (pickupEl) pickupEl.value = b.pickup_location || '';

    const warehouseEl = document.getElementById('inp-warehouse');
    if (warehouseEl) warehouseEl.value = b.delivery_location || '';

    const dropoffEl = document.getElementById('inp-dropoff');
    if (dropoffEl) dropoffEl.value = b.dropoff_location || '';

    const notesEl = document.getElementById('inp-notes');
    if (notesEl && b.notes) notesEl.value = b.notes;

    // Xóa cảnh báo viền đỏ (nếu có)
    ['inp-customer', 'inp-pickup', 'inp-warehouse'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('input-error');
    });
    ['err-customer', 'err-pickup', 'err-warehouse'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    showToast('success', `Đã kế thừa 9 trường dữ liệu từ Booking [${b.booking_code}] - Khách hàng: ${b.customer_name}`, 'Kế Thừa Thành Công');
}

function dispatchFromBooking(bookingId) {
    openModal('modal-create-trip');
    loadActiveBookingsForModal(bookingId);
}

function openModal(id) { 
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden-view'); 
    initAllNumberInputs();
    if (id === 'modal-create-trip') {
        loadActiveBookingsForModal();
    }
}

function closeModal(id) { 
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden-view'); 
    if (id === 'modal-ocr') resetOcr();
}

// =========================================================================
// 10. PHÂN HỆ QUẢN LÝ KẾ TOÁN & ĐỐI SOÁT CHI PHÍ CHUYẾN XE
// =========================================================================
let accountingDataCache = [];

async function loadAccountingData() {
    const tbody = document.getElementById('acct-tbody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="p-8 text-center text-slate-400 font-medium">
                    <i class="ph ph-spinner-gap animate-spin text-2xl mb-2 inline-block text-emerald-600"></i>
                    <p>Đang tải dữ liệu đối soát chi phí & báo cáo kế toán...</p>
                </td>
            </tr>
        `;
    }

    try {
        const res = await fetch('/api/accounting/');
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
            if (setEl) setEl.innerHTML = `<i class="ph-fill ph-lock-key text-xs"></i> Đã chốt sổ: ${new Intl.NumberFormat('vi-VN').format(st.settled_count)} chuyến`;
            const tripsCountEl = document.getElementById('acct-stat-trips-count');
            if (tripsCountEl) tripsCountEl.innerHTML = `<i class="ph-fill ph-check-circle text-xs"></i> Tính trên ${st.total_trips} chuyến xe phát sinh`;
        }

        // 2. Lưu cache và hiển thị bảng
        accountingDataCache = data.settlements || [];
        renderAccountingTable(accountingDataCache);

    } catch (err) {
        console.error('Lỗi tải dữ liệu kế toán:', err);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="p-8 text-center text-rose-500 font-bold">
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
                <td colspan="9" class="p-8 text-center text-slate-400 font-medium">
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
                <i class="ph-fill ph-lock-key"></i> Đã Chốt Sổ
               </span>`
            : `<span class="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1 font-heading">
                <i class="ph-fill ph-clock-countdown"></i> Chờ Chốt Sổ
               </span>`;

        tr.innerHTML = `
            <td class="p-3.5">
                <p class="font-black text-teal-800 font-heading text-sm cursor-pointer hover:underline" onclick="viewTripDetail('${item.trip_code}')">
                    ${item.trip_code}
                </p>
                <p class="text-xs text-slate-500 font-medium mt-0.5">${item.loading_date || '-'}</p>
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
                        <i class="ph-fill ph-file-text"></i> ${item.invoices_count} HĐ
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
            <td class="p-3.5 text-center">
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
                            <i class="ph-fill ph-lock-key text-xs"></i>
                            <span>Chốt Sổ</span>
                        </button>
                    `}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filterAccountingTable() {
    const query = document.getElementById('acct-search-input')?.value?.toLowerCase().trim() || '';
    const settleFilter = document.getElementById('acct-filter-settle')?.value || 'ALL';

    const filtered = accountingDataCache.filter(item => {
        const matchesQuery = !query || 
            item.trip_code.toLowerCase().includes(query) ||
            item.customer_name.toLowerCase().includes(query) ||
            item.driver_name.toLowerCase().includes(query) ||
            item.license_plate.toLowerCase().includes(query) ||
            (item.sample_invoice && item.sample_invoice.toLowerCase().includes(query));

        const matchesSettle = 
            settleFilter === 'ALL' ||
            (settleFilter === 'SETTLED' && item.is_settled) ||
            (settleFilter === 'PENDING' && !item.is_settled);

        return matchesQuery && matchesSettle;
    });

    renderAccountingTable(filtered);
}

async function toggleSettleTrip(tripCode, isCurrentlySettled) {
    if (isCurrentlySettled) {
        if (!confirm(`Bạn có chắc chắn muốn MỞ KHÓA SỔ KẾ TOÁN cho chuyến xe [${tripCode}]?\nSau khi mở khóa, các khoản chi phí có thể bị sửa đổi hoặc xóa.`)) {
            return;
        }
        try {
            const res = await fetch(`/api/trips/${tripCode}/unsettle-expenses/`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                showToast('warning', data.message, 'Đã Mở Khóa Sổ');
                loadAccountingData();
            } else {
                showToast('danger', data.error || 'Có lỗi xảy ra');
            }
        } catch (err) {
            showToast('danger', 'Lỗi kết nối máy chủ');
        }
    } else {
        if (!confirm(`XÁC NHẬN CHỐT SỔ KẾ TOÁN chuyến xe [${tripCode}]?\nToàn bộ chi phí đã duyệt sẽ được khóa cứng để làm căn cứ quyết toán và hạch toán thuế.`)) {
            return;
        }
        try {
            const res = await fetch(`/api/trips/${tripCode}/settle-expenses/`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                showToast('success', data.message, 'Chốt Sổ Thành Công');
                loadAccountingData();
            } else {
                showToast('danger', data.error || 'Có lỗi xảy ra');
            }
        } catch (err) {
            showToast('danger', 'Lỗi kết nối máy chủ');
        }
    }
}

// ==============================================================================
// 10. PHÂN HỆ CÀI ĐẶT & HỆ THỐNG DANH MỤC (MASTER DATA CONTROLLER)
// ==============================================================================
let currentMasterDataTab = 'driver_tariffs';
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
        const res = await fetch('/api/master-data/summary/');
        const data = await res.json();
        if (data.stats) {
            const s = data.stats;
            const el = id => document.getElementById(id);
            if (el('md-stat-driver-tariffs')) el('md-stat-driver-tariffs').innerText = s.driver_tariffs_count || 0;
            if (el('md-stat-allowances')) el('md-stat-allowances').innerText = s.allowances_count || 0;
            if (el('md-stat-locations')) el('md-stat-locations').innerText = s.locations_count || 0;
            if (el('md-stat-tariffs')) el('md-stat-tariffs').innerText = s.tariffs_count || 0;
            if (el('md-stat-customers')) el('md-stat-customers').innerText = s.customers_count || 0;
            if (el('md-stat-expenses')) el('md-stat-expenses').innerText = s.expense_items_count || 0;
            if (el('md-stat-containers')) el('md-stat-containers').innerText = s.container_types_count || 0;
            if (el('md-stat-vehicles')) el('md-stat-vehicles').innerText = s.vehicles_count || 0;
        }
    } catch (err) {
        console.error('Lỗi tải tóm tắt Cài đặt:', err);
    }
    loadActiveMasterDataTab();
}

function switchMasterDataTab(tabKey) {
    currentMasterDataTab = tabKey;
    masterDataPagination.currentPage = 1;

    document.querySelectorAll('.md-tab-btn').forEach(btn => {
        btn.classList.remove('active', 'border-teal-600', 'text-teal-800');
        btn.classList.add('border-transparent', 'text-slate-500');
    });
    const activeBtn = document.querySelector(`[data-md-tab="${tabKey}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active', 'border-teal-600', 'text-teal-800');
        activeBtn.classList.remove('border-transparent', 'text-slate-500');
    }

    const labels = {
        'driver_tariffs': '+ Thêm Mới Tuyến Lương',
        'allowances': '+ Thêm Mới Phụ Cấp',
        'locations': '+ Thêm Mới Cảng / Kho',
        'tariffs': '+ Thêm Mới Biểu Cước Khách',
        'customers': '+ Thêm Mới Khách Hàng',
        'expenses': '+ Thêm Mới Khoản Chi',
        'containers': '+ Thêm Mới Quy Cách',
        'vehicles': '+ Thêm Mới Phương Tiện'
    };
    const createBtnLabel = document.getElementById('md-create-btn-label');
    if (createBtnLabel) createBtnLabel.innerText = labels[tabKey] || '+ Thêm Mới';

    const searchInput = document.getElementById('md-search-input');
    if (searchInput) searchInput.value = '';

    loadActiveMasterDataTab();
}

function reloadActiveMasterDataTab() {
    loadActiveMasterDataTab();
}

async function loadActiveMasterDataTab() {
    const tableBody = document.getElementById('md-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-400"><i class="ph ph-spinner animate-spin text-2xl mb-2 text-teal-600 block"></i>Đang tải dữ liệu...</td></tr>`;

    const endpoints = {
        'driver_tariffs': '/api/master-data/driver-tariffs/',
        'allowances': '/api/master-data/allowances/',
        'locations': '/api/master-data/locations/',
        'tariffs': '/api/master-data/tariffs/',
        'customers': '/api/master-data/customers/',
        'expenses': '/api/master-data/expense-items/',
        'containers': '/api/master-data/container-types/',
        'vehicles': '/api/master-data/vehicles/'
    };

    try {
        const url = endpoints[currentMasterDataTab];
        if (!url) throw new Error('Không tìm thấy API tương ứng với danh mục này.');
        const res = await fetch(url);
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
        tableBody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-rose-500 font-bold"><i class="ph-bold ph-warning-circle text-2xl mb-2 block"></i>Lỗi tải danh mục: ${err.message || 'Không thể kết nối máy chủ.'}</td></tr>`;
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
        }
        return matchesQuery && matchesSub;
    });

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

function renderMasterDataTable(items, total = items.length) {
    const tableHead = document.getElementById('md-table-head');
    const tableBody = document.getElementById('md-table-body');
    if (!tableHead || !tableBody) return;

    if (total === 0 || items.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-400 font-medium">Không tìm thấy bản ghi nào phù hợp.</td></tr>`;
        return;
    }

    // 1. BIỂU PHÍ LƯƠNG CHUYẾN
    if (currentMasterDataTab === 'driver_tariffs') {
        tableHead.innerHTML = `
            <tr>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Khu Vực Kho</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Tên Tuyến / KCN / Nhà Máy</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Trục Lấy / Hạ Cont Chuẩn</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider text-right sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Lương Chuyến (VNĐ)</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Ghi Chú Nghiệp Vụ</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Trạng Thái</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 select-none">Thao Tác</th>
            </tr>
        `;
        tableBody.innerHTML = items.map(item => `
            <tr class="hover:bg-teal-50/40 transition-colors border-b border-slate-200/70">
                <td class="py-1.5 px-3 border-r border-slate-200/70"><span class="px-2 py-0.2 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">${item.area_group}</span></td>
                <td class="py-1.5 px-3 text-[13px] font-bold text-slate-900 border-r border-slate-200/70">${item.route_name}</td>
                <td class="py-1.5 px-3 text-[12px] text-slate-500 font-medium max-w-xs truncate border-r border-slate-200/70">${item.pickup_drop_area}</td>
                <td class="py-1.5 px-3 text-[13px] font-black text-emerald-700 text-right font-mono tabular-nums border-r border-slate-200/70">${formatMoney(item.salary_rate)}</td>
                <td class="py-1.5 px-3 text-[11.5px] text-amber-700 font-medium border-r border-slate-200/70">${item.notes || '—'}</td>
                <td class="py-1.5 px-3 text-center border-r border-slate-200/70">
                    <span class="px-2 py-0.2 rounded-full text-[10.5px] font-bold ${item.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}">
                        ${item.is_active ? 'ĐANG DÙNG' : 'TẠM NGƯNG'}
                    </span>
                </td>
                <td class="py-1.5 px-3 text-center">
                    <div class="flex items-center justify-center space-x-1">
                        <button onclick="openEditMasterDataModal(${item.id})" class="p-1 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded transition-colors cursor-pointer" title="Chỉnh sửa"><i class="ph-bold ph-pencil-simple text-sm"></i></button>
                        <button onclick="deleteMasterDataItem(${item.id})" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Xóa mềm"><i class="ph-bold ph-trash text-sm"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    // 2. PHỤ CẤP CẢNG XA & KIỂM HÓA
    else if (currentMasterDataTab === 'allowances') {
        tableHead.innerHTML = `
            <tr>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Mã</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Tên Phụ Cấp / Tác Nghiệp</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Phân Loại</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider text-right sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Mức Phụ Cấp (VNĐ)</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Điều Kiện Áp Dụng</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Trạng Thái</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 select-none">Thao Tác</th>
            </tr>
        `;
        tableBody.innerHTML = items.map(item => `
            <tr class="hover:bg-teal-50/40 transition-colors border-b border-slate-200/70">
                <td class="py-1.5 px-3 text-[12px] font-mono font-bold text-teal-800 border-r border-slate-200/70">${item.code}</td>
                <td class="py-1.5 px-3 text-[13px] font-bold text-slate-900 border-r border-slate-200/70">${item.name}</td>
                <td class="py-1.5 px-3 border-r border-slate-200/70"><span class="px-2 py-0.2 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">${item.category_label || item.category}</span></td>
                <td class="py-1.5 px-3 text-[13px] font-black text-emerald-700 text-right font-mono tabular-nums border-r border-slate-200/70">+${formatMoney(item.amount)}</td>
                <td class="py-1.5 px-3 text-[11.5px] text-slate-600 font-medium border-r border-slate-200/70">${item.notes || '—'}</td>
                <td class="py-1.5 px-3 text-center border-r border-slate-200/70">
                    <span class="px-2 py-0.2 rounded-full text-[10.5px] font-bold ${item.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}">
                        ${item.is_active ? 'ĐANG DÙNG' : 'TẠM NGƯNG'}
                    </span>
                </td>
                <td class="py-1.5 px-3 text-center">
                    <div class="flex items-center justify-center space-x-1">
                        <button onclick="openEditMasterDataModal(${item.id})" class="p-1 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded transition-colors cursor-pointer" title="Chỉnh sửa"><i class="ph-bold ph-pencil-simple text-sm"></i></button>
                        <button onclick="deleteMasterDataItem(${item.id})" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Xóa mềm"><i class="ph-bold ph-trash text-sm"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    // 3. ĐỊA ĐIỂM / CẢNG / KHO BÃI
    else if (currentMasterDataTab === 'locations') {
        tableHead.innerHTML = `
            <tr>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Mã Điểm</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Tên Địa Điểm / Cảng / Kho</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Phân Loại</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Địa Chỉ</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Liên Hệ / SĐT</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Trạng Thái</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 select-none">Thao Tác</th>
            </tr>
        `;
        tableBody.innerHTML = items.map(item => `
            <tr class="hover:bg-teal-50/40 transition-colors border-b border-slate-200/70">
                <td class="py-1.5 px-3 text-[12px] font-mono font-bold text-teal-800 border-r border-slate-200/70">${item.code}</td>
                <td class="py-1.5 px-3 text-[13px] font-bold text-slate-900 border-r border-slate-200/70">${item.name}</td>
                <td class="py-1.5 px-3 border-r border-slate-200/70"><span class="px-2 py-0.2 rounded text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">${item.location_type_label || item.location_type}</span></td>
                <td class="py-1.5 px-3 text-[12px] text-slate-600 max-w-xs truncate border-r border-slate-200/70">${item.address || '—'}</td>
                <td class="py-1.5 px-3 text-[11.5px] text-slate-700 font-medium border-r border-slate-200/70">${item.contact_phone || item.contact_person || '—'}</td>
                <td class="py-1.5 px-3 text-center border-r border-slate-200/70">
                    <span class="px-2 py-0.2 rounded-full text-[10.5px] font-bold ${item.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}">
                        ${item.is_active ? 'ĐANG DÙNG' : 'TẠM NGƯNG'}
                    </span>
                </td>
                <td class="py-1.5 px-3 text-center">
                    <div class="flex items-center justify-center space-x-1">
                        <button onclick="openEditMasterDataModal(${item.id})" class="p-1 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded transition-colors cursor-pointer" title="Chỉnh sửa"><i class="ph-bold ph-pencil-simple text-sm"></i></button>
                        <button onclick="deleteMasterDataItem(${item.id})" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Xóa mềm"><i class="ph-bold ph-trash text-sm"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    // 4. BIỂU CƯỚC KHÁCH HÀNG
    else if (currentMasterDataTab === 'tariffs') {
        tableHead.innerHTML = `
            <tr>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Khách Hàng</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Nơi Lấy Cont</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Kho Giao Nhận</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Nơi Hạ Cont</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider text-right sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Đơn Giá Cước (HĐ)</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider text-right sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Định Mức Lương</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 select-none">Thao Tác</th>
            </tr>
        `;
        tableBody.innerHTML = items.map(item => `
            <tr class="hover:bg-teal-50/40 transition-colors border-b border-slate-200/70">
                <td class="py-1.5 px-3 text-[13px] font-bold text-slate-900 border-r border-slate-200/70">${item.customer_name}</td>
                <td class="py-1.5 px-3 text-[12.5px] font-bold text-teal-800 border-r border-slate-200/70">${item.pickup_location}</td>
                <td class="py-1.5 px-3 text-[12.5px] font-bold text-slate-800 border-r border-slate-200/70">${item.delivery_location}</td>
                <td class="py-1.5 px-3 text-[11.5px] font-medium text-slate-500 border-r border-slate-200/70">${item.dropoff_location || 'Hạ bãi'}</td>
                <td class="py-1.5 px-3 text-[13px] font-black text-slate-900 text-right font-mono tabular-nums border-r border-slate-200/70">${formatMoney(item.freight_price)}</td>
                <td class="py-1.5 px-3 text-[13px] font-black text-emerald-700 text-right font-mono tabular-nums border-r border-slate-200/70">${formatMoney(item.driver_trip_pay)}</td>
                <td class="py-1.5 px-3 text-center">
                    <div class="flex items-center justify-center space-x-1">
                        <button onclick="openEditMasterDataModal(${item.id})" class="p-1 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded transition-colors cursor-pointer" title="Chỉnh sửa"><i class="ph-bold ph-pencil-simple text-sm"></i></button>
                        <button onclick="deleteMasterDataItem(${item.id})" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Xóa mềm"><i class="ph-bold ph-trash text-sm"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    // 5. KHÁCH HÀNG
    else if (currentMasterDataTab === 'customers') {
        tableHead.innerHTML = `
            <tr>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Mã Khách</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Tên Khách Hàng / Doanh Nghiệp</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Mã Số Thuế</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Địa Chỉ</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Người Liên Hệ / SĐT</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Số Biểu Cước</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 select-none">Thao Tác</th>
            </tr>
        `;
        tableBody.innerHTML = items.map(item => `
            <tr class="hover:bg-teal-50/40 transition-colors border-b border-slate-200/70">
                <td class="py-1.5 px-3 text-[12px] font-mono font-bold text-teal-800 border-r border-slate-200/70">${item.code}</td>
                <td class="py-1.5 px-3 text-[13px] font-bold text-slate-900 border-r border-slate-200/70">${item.name}</td>
                <td class="py-1.5 px-3 text-[12px] font-mono text-slate-600 border-r border-slate-200/70">${item.tax_code || '—'}</td>
                <td class="py-1.5 px-3 text-[12px] text-slate-600 max-w-xs truncate border-r border-slate-200/70">${item.address || '—'}</td>
                <td class="py-1.5 px-3 text-[11.5px] text-slate-700 font-medium border-r border-slate-200/70">${item.contact_person || item.phone || '—'}</td>
                <td class="py-1.5 px-3 text-center border-r border-slate-200/70"><span class="px-2 py-0.2 bg-slate-100 rounded text-[11px] font-bold text-slate-700">${item.tariffs_count || 0} tuyến</span></td>
                <td class="py-1.5 px-3 text-center">
                    <div class="flex items-center justify-center space-x-1">
                        <button onclick="openEditMasterDataModal(${item.id})" class="p-1 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded transition-colors cursor-pointer" title="Chỉnh sửa"><i class="ph-bold ph-pencil-simple text-sm"></i></button>
                        <button onclick="deleteMasterDataItem(${item.id})" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Xóa mềm"><i class="ph-bold ph-trash text-sm"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    // 6. KHOẢN MỤC CHI PHÍ
    else if (currentMasterDataTab === 'expenses') {
        tableHead.innerHTML = `
            <tr>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Mã Khoản Chi</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Tên Khoản Mục</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Nhóm Chi Phí</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider text-right sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Định Mức Tiền (VNĐ)</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Yêu Cầu HĐĐT</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Ghi Chú</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 select-none">Thao Tác</th>
            </tr>
        `;
        tableBody.innerHTML = items.map(item => `
            <tr class="hover:bg-teal-50/40 transition-colors border-b border-slate-200/70">
                <td class="py-1.5 px-3 text-[12px] font-mono font-bold text-rose-800 border-r border-slate-200/70">${item.code}</td>
                <td class="py-1.5 px-3 text-[13px] font-bold text-slate-900 border-r border-slate-200/70">${item.name}</td>
                <td class="py-1.5 px-3 border-r border-slate-200/70"><span class="px-2 py-0.2 rounded text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">${item.group_type_label || item.group_type}</span></td>
                <td class="py-1.5 px-3 text-[13px] font-black text-slate-900 text-right font-mono tabular-nums border-r border-slate-200/70">${item.default_amount > 0 ? formatMoney(item.default_amount) : 'Theo thực tế'}</td>
                <td class="py-1.5 px-3 text-center border-r border-slate-200/70">
                    <span class="px-2 py-0.2 rounded text-[10.5px] font-bold ${item.requires_invoice ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'}">
                        ${item.requires_invoice ? 'BẮT BUỘC' : 'TÙY CHỌN'}
                    </span>
                </td>
                <td class="py-1.5 px-3 text-[11.5px] text-slate-500 border-r border-slate-200/70">${item.notes || '—'}</td>
                <td class="py-1.5 px-3 text-center">
                    <div class="flex items-center justify-center space-x-1">
                        <button onclick="openEditMasterDataModal(${item.id})" class="p-1 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded transition-colors cursor-pointer" title="Chỉnh sửa"><i class="ph-bold ph-pencil-simple text-sm"></i></button>
                        <button onclick="deleteMasterDataItem(${item.id})" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Xóa mềm"><i class="ph-bold ph-trash text-sm"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    // 7. QUY CÁCH CONT & XE
    else if (currentMasterDataTab === 'containers') {
        tableHead.innerHTML = `
            <tr>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Mã Quy Cách</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Tên Quy Cách / Loại Thùng</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Phân Loại</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Hệ Số TEU</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider text-right sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Tải Trọng Tối Đa (kg)</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider text-right sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Thể Tích (CBM)</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 select-none">Thao Tác</th>
            </tr>
        `;
        tableBody.innerHTML = items.map(item => `
            <tr class="hover:bg-teal-50/40 transition-colors border-b border-slate-200/70">
                <td class="py-1.5 px-3 text-[12.5px] font-mono font-black text-indigo-800 border-r border-slate-200/70">${item.code}</td>
                <td class="py-1.5 px-3 text-[13px] font-bold text-slate-900 border-r border-slate-200/70">${item.name}</td>
                <td class="py-1.5 px-3 border-r border-slate-200/70"><span class="px-2 py-0.2 rounded text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">${item.category_label || item.category}</span></td>
                <td class="py-1.5 px-3 text-center font-bold text-slate-800 font-mono text-[13px] border-r border-slate-200/70">${item.teu_factor > 0 ? item.teu_factor : '—'}</td>
                <td class="py-1.5 px-3 text-[13px] font-bold text-slate-900 text-right font-mono tabular-nums border-r border-slate-200/70">${formatMoney(item.max_payload_kg).replace(' đ', '')} kg</td>
                <td class="py-1.5 px-3 text-[13px] font-bold text-slate-900 text-right font-mono tabular-nums border-r border-slate-200/70">${item.cbm_capacity} m³</td>
                <td class="py-1.5 px-3 text-center">
                    <div class="flex items-center justify-center space-x-1">
                        <button onclick="openEditMasterDataModal(${item.id})" class="p-1 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded transition-colors cursor-pointer" title="Chỉnh sửa"><i class="ph-bold ph-pencil-simple text-sm"></i></button>
                        <button onclick="deleteMasterDataItem(${item.id})" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Xóa mềm"><i class="ph-bold ph-trash text-sm"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    // 8. ĐỘI XE & PHƯƠNG TIỆN
    else if (currentMasterDataTab === 'vehicles') {
        tableHead.innerHTML = `
            <tr>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Biển Số Xe</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Loại Phương Tiện</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Nguồn Sở Hữu</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Hãng Sản Xuất</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Tài Xế Mặc Định</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 border-r border-slate-200/90 select-none">Hạn Đăng Kiểm</th>
                <th class="py-2 px-3 text-[12.5px] font-bold text-slate-700 uppercase tracking-wider text-center sticky top-0 bg-slate-100 z-10 border-b border-slate-300 select-none">Thao Tác</th>
            </tr>
        `;
        tableBody.innerHTML = items.map(item => `
            <tr class="hover:bg-teal-50/40 transition-colors border-b border-slate-200/70">
                <td class="py-1.5 px-3 text-[13px] font-mono font-black text-slate-900 border-r border-slate-200/70">${item.license_plate}</td>
                <td class="py-1.5 px-3 text-[13px] font-bold text-slate-800 border-r border-slate-200/70">${item.vehicle_type_label || item.vehicle_type}</td>
                <td class="py-1.5 px-3 border-r border-slate-200/70">
                    <span class="px-2 py-0.2 rounded-full text-[10.5px] font-bold uppercase tracking-wider font-heading ${item.ownership_type === 'OWNED' ? 'bg-teal-100 text-teal-800 border border-teal-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}">
                        ${item.ownership_type_label || item.ownership_type}
                    </span>
                </td>
                <td class="py-1.5 px-3 text-[11.5px] font-semibold text-slate-600 border-r border-slate-200/70">${item.brand || '—'}</td>
                <td class="py-1.5 px-3 text-[13px] font-bold text-slate-800 border-r border-slate-200/70">${item.driver_name || '—'}</td>
                <td class="py-1.5 px-3 text-[11.5px] text-center font-mono font-bold text-slate-700 border-r border-slate-200/70">${item.registration_expiry}</td>
                <td class="py-1.5 px-3 text-center">
                    <div class="flex items-center justify-center space-x-1">
                        <button onclick="openEditMasterDataModal(${item.id})" class="p-1 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded transition-colors cursor-pointer" title="Chỉnh sửa"><i class="ph-bold ph-pencil-simple text-sm"></i></button>
                        <button onclick="deleteMasterDataItem(${item.id})" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Xóa mềm"><i class="ph-bold ph-trash text-sm"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
}

// Open Create Modal with Dynamic Form Fields
function openCreateMasterDataModal() {
    document.getElementById('md-edit-id').value = '';
    document.getElementById('md-catalog-key').value = currentMasterDataTab;

    const titles = {
        'driver_tariffs': 'Thêm Tuyến Lương Chuyến Mới',
        'allowances': 'Thêm Phụ Cấp / Kiểm Hóa Mới',
        'locations': 'Thêm Cảng / Kho Bãi Mới',
        'tariffs': 'Thêm Biểu Cước Khách Hàng',
        'customers': 'Thêm Khách Hàng Mới',
        'expenses': 'Thêm Khoản Mục Chi Phí',
        'containers': 'Thêm Quy Cách Cont & Xe',
        'vehicles': 'Thêm Phương Tiện Mới'
    };
    document.getElementById('md-modal-title').innerText = titles[currentMasterDataTab] || 'Thêm Mới Bản Ghi';
    document.getElementById('md-modal-subtitle').innerText = 'Khai báo thông tin chuẩn vào hệ thống Cài đặt';

    injectMasterDataModalFields(null);
    document.getElementById('modal-master-data').classList.remove('hidden');
}

// Open Edit Modal with Current Data
function openEditMasterDataModal(id) {
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
        'vehicles': 'Chỉnh Sửa Phương Tiện'
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

    if (currentMasterDataTab === 'driver_tariffs') {
        const areas = ['Khu Vực Củ Chi', 'Khu Vực Long An', 'Khu Vực Tây Ninh', 'Khu Vực Bình Dương', 'Khu Vực Đồng Nai', 'Khu Vực TP.HCM', 'Khu Vực Vũng Tàu', 'Tuyến Đặc Thù'];
        container.innerHTML = `
            <div>
                <label class="app-form-label">Khu Vực Kho <span class="text-rose-500">*</span></label>
                <select id="mdf-area-group" class="app-form-control">
                    ${areas.map(a => `<option value="${a}" ${d.area_group === a ? 'selected' : ''}>${a}</option>`).join('')}
                </select>
            </div>
            <div>
                <label class="app-form-label">Tên Tuyến / KCN / Nhà Máy <span class="text-rose-500">*</span></label>
                <input type="text" id="mdf-route-name" value="${d.route_name || ''}" placeholder="VD: KCN Phước Đông, KCN Bàu Bàng..." class="app-form-control" required>
            </div>
            <div>
                <label class="app-form-label">Mức Lương Chuyến (VNĐ) <span class="text-rose-500">*</span></label>
                <input type="number" id="mdf-salary-rate" value="${d.salary_rate || 600000}" step="10000" class="app-form-control font-mono font-bold" required>
            </div>
            <div>
                <label class="app-form-label">Ghi Chú Điều Kiện Áp Dụng</label>
                <input type="text" id="mdf-notes" value="${d.notes || ''}" placeholder="VD: Lấy/hạ Cát Lái + 50k..." class="app-form-control">
            </div>
        `;
    } else if (currentMasterDataTab === 'allowances') {
        container.innerHTML = `
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="app-form-label">Mã Phụ Cấp <span class="text-rose-500">*</span></label>
                    <input type="text" id="mdf-code" value="${d.code || ''}" placeholder="VD: CANG_HIEP_PHUOC" class="app-form-control uppercase font-mono" required ${d.code ? 'readonly' : ''}>
                </div>
                <div>
                    <label class="app-form-label">Phân Loại</label>
                    <select id="mdf-category" class="app-form-control">
                        <option value="PORT" ${d.category === 'PORT' ? 'selected' : ''}>Phụ Thêm Cảng Xa</option>
                        <option value="INSPECTION" ${d.category === 'INSPECTION' ? 'selected' : ''}>Phụ Thu Kiểm Hóa</option>
                        <option value="OPERATION" ${d.category === 'OPERATION' ? 'selected' : ''}>Phụ Cấp Tác Nghiệp Đặc Thù</option>
                    </select>
                </div>
            </div>
            <div>
                <label class="app-form-label">Tên Phụ Cấp / Tác Nghiệp <span class="text-rose-500">*</span></label>
                <input type="text" id="mdf-name" value="${d.name || ''}" placeholder="VD: Phụ thêm Cảng Cái Mép..." class="app-form-control" required>
            </div>
            <div>
                <label class="app-form-label">Số Tiền Phụ Cấp (VNĐ) <span class="text-rose-500">*</span></label>
                <input type="number" id="mdf-amount" value="${d.amount || 0}" step="10000" class="app-form-control font-mono font-bold" required>
            </div>
            <div>
                <label class="app-form-label">Điều Kiện Áp Dụng</label>
                <input type="text" id="mdf-notes" value="${d.notes || ''}" placeholder="VD: Lấy hoặc hạ cont tại Cảng..." class="app-form-control">
            </div>
        `;
    } else if (currentMasterDataTab === 'locations') {
        container.innerHTML = `
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="app-form-label">Mã Địa Điểm <span class="text-rose-500">*</span></label>
                    <input type="text" id="mdf-code" value="${d.code || ''}" placeholder="VD: CAT_LAI, KHO_WCA..." class="app-form-control uppercase font-mono" required ${d.code ? 'readonly' : ''}>
                </div>
                <div>
                    <label class="app-form-label">Phân Loại</label>
                    <select id="mdf-location-type" class="app-form-control">
                        <option value="PORT" ${d.location_type === 'PORT' ? 'selected' : ''}>Cảng Biển</option>
                        <option value="ICD" ${d.location_type === 'ICD' ? 'selected' : ''}>Cảng Cạn (ICD)</option>
                        <option value="DEPOT" ${d.location_type === 'DEPOT' ? 'selected' : ''}>Bãi Rỗng / Depot</option>
                        <option value="WAREHOUSE" ${d.location_type === 'WAREHOUSE' ? 'selected' : ''}>Kho Hàng / Nhà Máy</option>
                        <option value="YARD" ${d.location_type === 'YARD' ? 'selected' : ''}>Bãi Đỗ Xe Công Ty</option>
                    </select>
                </div>
            </div>
            <div>
                <label class="app-form-label">Tên Địa Điểm <span class="text-rose-500">*</span></label>
                <input type="text" id="mdf-name" value="${d.name || ''}" placeholder="VD: Cảng Cát Lái, Kho WCA Tân Vạn..." class="app-form-control" required>
            </div>
            <div>
                <label class="app-form-label">Địa Chỉ Chi Tiết</label>
                <input type="text" id="mdf-address" value="${d.address || ''}" placeholder="Số nhà, đường, phường, quận/huyện..." class="app-form-control">
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="app-form-label">Tỉnh / Thành Phố</label>
                    <input type="text" id="mdf-province" value="${d.province || 'TP. Hồ Chí Minh'}" class="app-form-control">
                </div>
                <div>
                    <label class="app-form-label">Số Điện Thoại Liên Hệ</label>
                    <input type="text" id="mdf-contact-phone" value="${d.contact_phone || ''}" placeholder="SĐT điều độ cảng/kho..." class="app-form-control font-mono">
                </div>
            </div>
        `;
    } else if (currentMasterDataTab === 'customers') {
        container.innerHTML = `
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="app-form-label">Mã Khách Hàng</label>
                    <input type="text" id="mdf-code" value="${d.code || ''}" placeholder="Tự sinh nếu để trống" class="app-form-control uppercase font-mono" ${d.code ? 'readonly' : ''}>
                </div>
                <div>
                    <label class="app-form-label">Mã Số Thuế</label>
                    <input type="text" id="mdf-tax-code" value="${d.tax_code || ''}" placeholder="MST doanh nghiệp..." class="app-form-control font-mono">
                </div>
            </div>
            <div>
                <label class="app-form-label">Tên Khách Hàng / Công Ty <span class="text-rose-500">*</span></label>
                <input type="text" id="mdf-name" value="${d.name || ''}" placeholder="Tên đầy đủ theo hóa đơn..." class="app-form-control" required>
            </div>
            <div>
                <label class="app-form-label">Địa Chỉ Giao Nhận Hóa Đơn</label>
                <input type="text" id="mdf-address" value="${d.address || ''}" placeholder="Địa chỉ đăng ký kinh doanh..." class="app-form-control">
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="app-form-label">Người Liên Hệ</label>
                    <input type="text" id="mdf-contact-person" value="${d.contact_person || ''}" placeholder="Tên nhân sự phụ trách..." class="app-form-control">
                </div>
                <div>
                    <label class="app-form-label">Số Điện Thoại</label>
                    <input type="text" id="mdf-phone" value="${d.phone || ''}" placeholder="SĐT liên hệ..." class="app-form-control font-mono">
                </div>
            </div>
        `;
    } else if (currentMasterDataTab === 'tariffs') {
        const customers = masterDataCache['customers'] || [];
        container.innerHTML = `
            <div>
                <label class="app-form-label">Khách Hàng <span class="text-rose-500">*</span></label>
                <select id="mdf-customer-id" class="app-form-control" required>
                    ${customers.map(c => `<option value="${c.id}" ${d.customer_id === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
                </select>
            </div>
            <div class="grid grid-cols-3 gap-2">
                <div>
                    <label class="app-form-label">Nơi Lấy <span class="text-rose-500">*</span></label>
                    <input type="text" id="mdf-pickup" value="${d.pickup_location || ''}" placeholder="CÁT LÁI, SPITC..." class="app-form-control uppercase" required>
                </div>
                <div>
                    <label class="app-form-label">Kho Nhận <span class="text-rose-500">*</span></label>
                    <input type="text" id="mdf-delivery" value="${d.delivery_location || ''}" placeholder="KHO WCA, VSIP 2..." class="app-form-control uppercase" required>
                </div>
                <div>
                    <label class="app-form-label">Nơi Hạ Cont</label>
                    <input type="text" id="mdf-dropoff" value="${d.dropoff_location || ''}" placeholder="HẠ BÃI, SOLOG..." class="app-form-control uppercase">
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="app-form-label">Đơn Giá Cước Xuất HĐ (VNĐ) <span class="text-rose-500">*</span></label>
                    <input type="number" id="mdf-price" value="${d.freight_price || 4000000}" step="50000" class="app-form-control font-mono font-bold" required>
                </div>
                <div>
                    <label class="app-form-label">Định Mức Lương Tài Xế (VNĐ) <span class="text-rose-500">*</span></label>
                    <input type="number" id="mdf-pay" value="${d.driver_trip_pay || 600000}" step="50000" class="app-form-control font-mono font-bold text-emerald-700" required>
                </div>
            </div>
        `;
    } else if (currentMasterDataTab === 'expenses') {
        container.innerHTML = `
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="app-form-label">Mã Khoản Chi <span class="text-rose-500">*</span></label>
                    <input type="text" id="mdf-code" value="${d.code || ''}" placeholder="VD: LIFT_ON, TOLL_FEE..." class="app-form-control uppercase font-mono" required ${d.code ? 'readonly' : ''}>
                </div>
                <div>
                    <label class="app-form-label">Nhóm Chi Phí</label>
                    <select id="mdf-group-type" class="app-form-control">
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
                <label class="app-form-label">Tên Khoản Mục Chi Phí <span class="text-rose-500">*</span></label>
                <input type="text" id="mdf-name" value="${d.name || ''}" placeholder="VD: Phí nâng cont, Vé BOT..." class="app-form-control" required>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="app-form-label">Định Mức Tiền Ngầm Định (VNĐ)</label>
                    <input type="number" id="mdf-default-amount" value="${d.default_amount || 0}" step="10000" class="app-form-control font-mono font-bold">
                </div>
                <div class="flex items-center pt-6 space-x-2">
                    <input type="checkbox" id="mdf-requires-invoice" ${d.requires_invoice ? 'checked' : ''} class="w-4 h-4 text-teal-600 rounded">
                    <label for="mdf-requires-invoice" class="text-xs font-bold text-slate-700">Bắt buộc có HĐĐT / Mã tra cứu</label>
                </div>
            </div>
        `;
    } else if (currentMasterDataTab === 'containers') {
        container.innerHTML = `
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="app-form-label">Mã Quy Cách <span class="text-rose-500">*</span></label>
                    <input type="text" id="mdf-code" value="${d.code || ''}" placeholder="VD: 40HC, 20DC, TAI_10T..." class="app-form-control uppercase font-mono font-bold" required ${d.code ? 'readonly' : ''}>
                </div>
                <div>
                    <label class="app-form-label">Phân Loại</label>
                    <select id="mdf-category" class="app-form-control">
                        <option value="CONTAINER" ${d.category === 'CONTAINER' ? 'selected' : ''}>Container Đường Biển</option>
                        <option value="TRUCK" ${d.category === 'TRUCK' ? 'selected' : ''}>Xe Tải Thùng / Đường Bộ</option>
                    </select>
                </div>
            </div>
            <div>
                <label class="app-form-label">Tên Quy Cách / Tên Loại Thùng <span class="text-rose-500">*</span></label>
                <input type="text" id="mdf-name" value="${d.name || ''}" placeholder="VD: Container 40ft Cao (40HC)..." class="app-form-control" required>
            </div>
            <div class="grid grid-cols-3 gap-2">
                <div>
                    <label class="app-form-label">Hệ Số TEU</label>
                    <input type="number" id="mdf-teu" value="${d.teu_factor !== undefined ? d.teu_factor : 2.0}" step="0.25" class="app-form-control font-mono">
                </div>
                <div>
                    <label class="app-form-label">Tải Trọng (kg)</label>
                    <input type="number" id="mdf-payload" value="${d.max_payload_kg || 30000}" step="500" class="app-form-control font-mono">
                </div>
                <div>
                    <label class="app-form-label">Thể Tích (CBM)</label>
                    <input type="number" id="mdf-cbm" value="${d.cbm_capacity || 67}" step="0.5" class="app-form-control font-mono">
                </div>
            </div>
        `;
    } else if (currentMasterDataTab === 'vehicles') {
        container.innerHTML = `
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="app-form-label">Biển Số Xe <span class="text-rose-500">*</span></label>
                    <input type="text" id="mdf-license-plate" value="${d.license_plate || ''}" placeholder="VD: 51H-123.45..." class="app-form-control uppercase font-mono font-black" required ${d.license_plate ? 'readonly' : ''}>
                </div>
                <div>
                    <label class="app-form-label">Nguồn Sở Hữu</label>
                    <select id="mdf-ownership" class="app-form-control">
                        <option value="OWNED" ${d.ownership_type === 'OWNED' ? 'selected' : ''}>Xe Nhà (Đội Xe Công Ty)</option>
                        <option value="SUBCONTRACTOR" ${d.ownership_type === 'SUBCONTRACTOR' ? 'selected' : ''}>Xe Bạn (Thuê Ngoài / 3PL)</option>
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="app-form-label">Loại Phương Tiện</label>
                    <select id="mdf-vehicle-type" class="app-form-control">
                        <option value="TRACTOR" ${d.vehicle_type === 'TRACTOR' ? 'selected' : ''}>Đầu kéo Container</option>
                        <option value="TRUCK_10T" ${d.vehicle_type === 'TRUCK_10T' ? 'selected' : ''}>Xe tải 10 Tấn</option>
                        <option value="TRUCK_2T" ${d.vehicle_type === 'TRUCK_2T' ? 'selected' : ''}>Xe tải 2 Tấn</option>
                        <option value="VAN" ${d.vehicle_type === 'VAN' ? 'selected' : ''}>Xe tải nhỏ / Van</option>
                    </select>
                </div>
                <div>
                    <label class="app-form-label">Hãng Sản Xuất / Dòng Xe</label>
                    <input type="text" id="mdf-brand" value="${d.brand || 'Freightliner'}" placeholder="VD: Freightliner, Hino..." class="app-form-control">
                </div>
            </div>
            <div>
                <label class="app-form-label">Tải Trọng Cho Phép (kg)</label>
                <input type="number" id="mdf-payload" value="${d.payload_capacity_kg || 30000}" step="1000" class="app-form-control font-mono">
            </div>
        `;
    }
}

// Submit Create or Edit Form
async function submitMasterDataForm(e) {
    e.preventDefault();
    const editId = document.getElementById('md-edit-id').value;
    const tabKey = document.getElementById('md-catalog-key').value;
    const isEdit = !!editId;

    const endpoints = {
        'driver_tariffs': isEdit ? `/api/master-data/driver-tariffs/${editId}/` : '/api/master-data/driver-tariffs/',
        'allowances': isEdit ? `/api/master-data/allowances/${editId}/` : '/api/master-data/allowances/',
        'locations': isEdit ? `/api/master-data/locations/${editId}/` : '/api/master-data/locations/',
        'tariffs': isEdit ? `/api/master-data/tariffs/${editId}/` : '/api/master-data/tariffs/',
        'customers': isEdit ? `/api/master-data/customers/${editId}/` : '/api/master-data/customers/',
        'expenses': isEdit ? `/api/master-data/expense-items/${editId}/` : '/api/master-data/expense-items/',
        'containers': isEdit ? `/api/master-data/container-types/${editId}/` : '/api/master-data/container-types/',
        'vehicles': isEdit ? `/api/master-data/vehicles/${editId}/` : '/api/master-data/vehicles/'
    };

    let payload = {};
    if (tabKey === 'driver_tariffs') {
        payload = {
            area_group: document.getElementById('mdf-area-group').value,
            route_name: document.getElementById('mdf-route-name').value,
            salary_rate: parseInt(document.getElementById('mdf-salary-rate').value),
            notes: document.getElementById('mdf-notes').value
        };
    } else if (tabKey === 'allowances') {
        payload = {
            code: document.getElementById('mdf-code').value,
            category: document.getElementById('mdf-category').value,
            name: document.getElementById('mdf-name').value,
            amount: parseInt(document.getElementById('mdf-amount').value),
            notes: document.getElementById('mdf-notes').value
        };
    } else if (tabKey === 'locations') {
        payload = {
            code: document.getElementById('mdf-code').value,
            location_type: document.getElementById('mdf-location-type').value,
            name: document.getElementById('mdf-name').value,
            address: document.getElementById('mdf-address').value,
            province: document.getElementById('mdf-province').value,
            contact_phone: document.getElementById('mdf-contact-phone').value
        };
    } else if (tabKey === 'customers') {
        payload = {
            code: document.getElementById('mdf-code').value,
            tax_code: document.getElementById('mdf-tax-code').value,
            name: document.getElementById('mdf-name').value,
            address: document.getElementById('mdf-address').value,
            contact_person: document.getElementById('mdf-contact-person').value,
            phone: document.getElementById('mdf-phone').value
        };
    } else if (tabKey === 'tariffs') {
        payload = {
            customer_id: document.getElementById('mdf-customer-id').value,
            pickup_location: document.getElementById('mdf-pickup').value,
            delivery_location: document.getElementById('mdf-delivery').value,
            dropoff_location: document.getElementById('mdf-dropoff').value,
            freight_price: parseInt(document.getElementById('mdf-price').value),
            driver_trip_pay: parseInt(document.getElementById('mdf-pay').value)
        };
    } else if (tabKey === 'expenses') {
        payload = {
            code: document.getElementById('mdf-code').value,
            group_type: document.getElementById('mdf-group-type').value,
            name: document.getElementById('mdf-name').value,
            default_amount: parseInt(document.getElementById('mdf-default-amount').value),
            requires_invoice: document.getElementById('mdf-requires-invoice').checked
        };
    } else if (tabKey === 'containers') {
        payload = {
            code: document.getElementById('mdf-code').value,
            category: document.getElementById('mdf-category').value,
            name: document.getElementById('mdf-name').value,
            teu_factor: parseFloat(document.getElementById('mdf-teu').value),
            max_payload_kg: parseInt(document.getElementById('mdf-payload').value),
            cbm_capacity: parseFloat(document.getElementById('mdf-cbm').value)
        };
    } else if (tabKey === 'vehicles') {
        payload = {
            license_plate: document.getElementById('mdf-license-plate').value,
            ownership_type: document.getElementById('mdf-ownership').value,
            vehicle_type: document.getElementById('mdf-vehicle-type').value,
            brand: document.getElementById('mdf-brand').value,
            payload_capacity_kg: parseInt(document.getElementById('mdf-payload').value)
        };
    }

    try {
        const res = await fetch(endpoints[tabKey], {
            method: isEdit ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && (data.success || data.id)) {
            showToast('success', data.message || 'Lưu bản ghi thành công!');
            closeMasterDataModal();
            loadMasterData();
        } else {
            showToast('danger', data.error || 'Có lỗi xảy ra khi lưu dữ liệu!');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ!');
    }
}

// Delete Item (Soft-delete)
async function deleteMasterDataItem(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa bản ghi này khỏi danh mục không?')) return;

    const endpoints = {
        'driver_tariffs': `/api/master-data/driver-tariffs/${id}/`,
        'allowances': `/api/master-data/allowances/${id}/`,
        'locations': `/api/master-data/locations/${id}/`,
        'tariffs': `/api/master-data/tariffs/${id}/`,
        'customers': `/api/master-data/customers/${id}/`,
        'expenses': `/api/master-data/expense-items/${id}/`,
        'containers': `/api/master-data/container-types/${id}/`,
        'vehicles': `/api/master-data/vehicles/${id}/`
    };

    try {
        const res = await fetch(endpoints[currentMasterDataTab], { method: 'DELETE' });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message || 'Đã xóa bản ghi thành công!');
            loadMasterData();
        } else {
            showToast('danger', data.error || 'Không thể xóa bản ghi!');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ!');
    }
}

// =========================================================================
// TIỆN ÍCH GIAO DIỆN: ẨN / HIỆN SIDEBAR & BIỂU ĐỒ DASHBOARD
// =========================================================================

function toggleSidebar() {
    const sidebar = document.querySelector('.app-sidebar');
    const arrowIn = document.getElementById('icon-sidebar-arrow-in');
    const arrowOut = document.getElementById('icon-sidebar-arrow-out');
    if (!sidebar) return;
    sidebar.classList.toggle('collapsed');
    const isCollapsed = sidebar.classList.contains('collapsed');
    if (arrowIn && arrowOut) {
        if (isCollapsed) {
            arrowIn.classList.add('hidden');
            arrowOut.classList.remove('hidden');
        } else {
            arrowIn.classList.remove('hidden');
            arrowOut.classList.add('hidden');
        }
    }
    try {
        localStorage.setItem('bim_sidebar_collapsed', isCollapsed ? 'true' : 'false');
    } catch (e) {}
}

function toggleDashboardCharts() {
    const rowPillars = document.getElementById('dashboard-row-pillars');
    const rowCharts = document.getElementById('dashboard-row-charts');
    const iconToggle = document.getElementById('icon-toggle-charts');
    const textToggle = document.getElementById('text-toggle-charts');
    const iconTableExpand = document.getElementById('icon-table-expand');
    const textTableExpand = document.getElementById('text-table-expand');

    if (!rowPillars || !rowCharts) return;

    const isHidden = rowPillars.classList.contains('hidden');

    if (isHidden) {
        // Hiện lại 2 hàng biểu đồ & trụ cột
        rowPillars.classList.remove('hidden');
        rowCharts.classList.remove('hidden');
        if (iconToggle) iconToggle.className = 'ph ph-eye-slash text-base text-teal-700';
        if (textToggle) textToggle.innerText = 'Ẩn Biểu Đồ';
        if (iconTableExpand) iconTableExpand.className = 'ph ph-arrows-out-simple text-teal-700';
        if (textTableExpand) textTableExpand.innerText = 'Toàn Màn Hình';
        try {
            localStorage.setItem('bim_dashboard_charts_collapsed', 'false');
        } catch (e) {}
    } else {
        // Ẩn 2 hàng biểu đồ để bung toàn màn hình Bảng Kê Hiệu Suất P&L
        rowPillars.classList.add('hidden');
        rowCharts.classList.add('hidden');
        if (iconToggle) iconToggle.className = 'ph ph-eye text-base text-teal-700';
        if (textToggle) textToggle.innerText = 'Hiện Biểu Đồ';
        if (iconTableExpand) iconTableExpand.className = 'ph ph-arrows-in-simple text-teal-700';
        if (textTableExpand) textTableExpand.innerText = 'Thu Gọn Bảng';
        try {
            localStorage.setItem('bim_dashboard_charts_collapsed', 'true');
        } catch (e) {}
    }
}

// Khởi chạy khi DOM sẵn sàng

document.addEventListener('DOMContentLoaded', () => {
    initAllNumberInputs();
    const dateEl = document.getElementById('current-date');
    if (dateEl) {
        dateEl.innerText = new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric' });
    }

    // Khôi phục trạng thái thu gọn Sidebar từ localStorage
    try {
        if (localStorage.getItem('bim_sidebar_collapsed') === 'true') {
            const sidebar = document.querySelector('.app-sidebar');
            const arrowIn = document.getElementById('icon-sidebar-arrow-in');
            const arrowOut = document.getElementById('icon-sidebar-arrow-out');
            if (sidebar) sidebar.classList.add('collapsed');
            if (arrowIn) arrowIn.classList.add('hidden');
            if (arrowOut) arrowOut.classList.remove('hidden');
        }
    } catch (e) {}

    // Khôi phục trạng thái ẩn biểu đồ từ localStorage
    try {
        if (localStorage.getItem('bim_dashboard_charts_collapsed') === 'true') {
            const rowPillars = document.getElementById('dashboard-row-pillars');
            const rowCharts = document.getElementById('dashboard-row-charts');
            const iconToggle = document.getElementById('icon-toggle-charts');
            const textToggle = document.getElementById('text-toggle-charts');
            const iconTableExpand = document.getElementById('icon-table-expand');
            const textTableExpand = document.getElementById('text-table-expand');
            if (rowPillars) rowPillars.classList.add('hidden');
            if (rowCharts) rowCharts.classList.add('hidden');
            if (iconToggle) iconToggle.className = 'ph ph-eye text-base text-teal-700';
            if (textToggle) textToggle.innerText = 'Hiện Biểu Đồ';
            if (iconTableExpand) iconTableExpand.className = 'ph ph-arrows-in-simple text-teal-700';
            if (textTableExpand) textTableExpand.innerText = 'Thu Gọn Bảng';
        }
    } catch (e) {}
    
    // Mặc định luôn hiển thị về Dashboard trang chủ khi vào hệ thống hoặc bấm logo trang chủ
    const hash = window.location.hash ? window.location.hash.replace('#', '') : '';
    const validTabs = ['dashboard', 'kinh-doanh', 'dieu-van', 'xe-bai', 'nhan-su', 'ke-toan', 'hai-quan', 'cai-dat'];
    if (hash && validTabs.includes(hash)) {
        switchTab(hash);
    } else {
        switchTab('dashboard');
    }
});

