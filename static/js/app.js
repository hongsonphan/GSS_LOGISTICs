/**
 * ==========================================================================
 * BIM LOGISTICS — FRONTEND APPLICATION LOGIC (TMS & FLEET)
 * ==========================================================================
 */

let currentActiveTripCode = null;
let currentOcrMode = 'phi-ton';

const STATUS_STYLE_MAP = {
    'COMPLETED': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'IN_TRANSIT': 'bg-amber-100 text-amber-800 border-amber-300',
    'UNLOADING': 'bg-orange-100 text-orange-800 border-orange-300',
    'DISPATCHED': 'bg-teal-100 text-teal-800 border-teal-300',
    'ACCEPTED': 'bg-blue-100 text-blue-800 border-blue-300',
    'DRAFT': 'bg-slate-100 text-slate-700 border-slate-300',
};

// --- 1. TẢI DỮ LIỆU BAN GIÁM ĐỐC (P&L, QUỸ, NĂNG SUẤT) ---
async function loadDashboardData() {
    try {
        const res = await fetch('/api/dashboard/');
        const data = await res.json();

        document.getElementById('bgd-cash').innerText = new Intl.NumberFormat('vi-VN').format(data.funds.cash_on_hand) + ' đ';
        document.getElementById('bgd-bank').innerText = new Intl.NumberFormat('vi-VN').format(data.funds.bank_balance) + ' đ';
        document.getElementById('bgd-weekly-pay').innerText = new Intl.NumberFormat('vi-VN').format(data.funds.weekly_planned_expenses) + ' đ';

        document.getElementById('bgd-yesterday-trips').innerText = data.productivity.completed_yesterday;
        document.getElementById('bgd-today-trips').innerText = data.productivity.today_active;
        document.getElementById('bgd-gross-profit').innerText = new Intl.NumberFormat('vi-VN').format(data.productivity.monthly_gross_profit) + ' đ';

        document.getElementById('bgd-fleet-active').innerText = data.fleet.active + ' xe';
        document.getElementById('bgd-fleet-idle').innerText = data.fleet.idle + ' xe';
        document.getElementById('bgd-fleet-maint').innerText = data.fleet.maintenance + ' xe';

        document.getElementById('bgd-hr-active').innerText = data.personnel.active;

        // Render bảng P&L
        const pnlTbody = document.getElementById('bgd-pnl-tbody');
        pnlTbody.innerHTML = '';
        data.trips_pnl.forEach(item => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-teal-50/40 transition-colors';
            tr.innerHTML = `
                <td class="p-4 font-bold text-teal-800 text-sm font-heading">${item.trip_code}</td>
                <td class="p-4 text-sm text-slate-700 font-semibold">${item.customer_route}</td>
                <td class="p-4 text-right text-sm font-medium text-slate-600 tabular-nums">${new Intl.NumberFormat('vi-VN').format(item.revenue)} đ</td>
                <td class="p-4 text-right text-sm font-medium text-rose-500 tabular-nums">-${new Intl.NumberFormat('vi-VN').format(item.expense)} đ</td>
                <td class="p-4 text-right font-black text-emerald-600 tabular-nums font-heading">${new Intl.NumberFormat('vi-VN').format(item.profit)} đ</td>
                <td class="p-4">
                    <div class="flex items-center justify-center space-x-2">
                        <span class="text-sm font-bold text-slate-700 w-12 text-right tabular-nums">${item.margin_percent}%</span>
                        <div class="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div class="h-full bg-emerald-500" style="width: ${Math.min(100, Math.max(0, item.margin_percent))}%"></div>
                        </div>
                    </div>
                </td>
            `;
            pnlTbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error loading dashboard data:', err);
    }
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
        const data = await res.json();

        // Cập nhật stats
        document.getElementById('stat-total-trips').innerText = data.stats.total_trips_monthly;
        document.getElementById('stat-transit').innerText = data.stats.transit_count;
        document.getElementById('stat-pending-expenses').innerText = data.stats.pending_expenses_count;

        const tbody = document.getElementById('trips-tbody');
        tbody.innerHTML = '';

        data.trips.forEach(trip => {
            const typeColor = trip.type_raw === 'IMPORT' ? 'bg-blue-100 text-blue-700' : 
                              trip.type_raw === 'EXPORT' ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700';
            const statusCls = STATUS_STYLE_MAP[trip.status] || 'bg-slate-100 text-slate-700 border-slate-300';

            const tr = document.createElement('tr');
            tr.className = 'hover:bg-teal-50/30 transition-colors cursor-pointer group';
            tr.onclick = () => viewTripDetail(trip.id);
            
            tr.innerHTML = `
                <td class="px-4 py-4">
                    <p class="font-bold text-teal-800 font-heading">${trip.id}</p>
                    <p class="text-[11px] font-semibold text-slate-400 mt-1">${trip.startTime.split(' ')[0]}</p>
                </td>
                <td class="px-4 py-4">
                    <p class="font-bold text-slate-800 truncate max-w-[200px]">${trip.customer}</p>
                </td>
                <td class="px-4 py-4">
                    <p class="font-bold text-slate-800">${trip.container}</p>
                    <p class="text-xs text-slate-500 mt-1 font-medium">B/L: ${trip.booking}</p>
                </td>
                <td class="px-4 py-4">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase mb-1 inline-block font-heading ${typeColor}">${trip.type}</span>
                    <p class="font-semibold text-slate-700 text-xs truncate max-w-[150px]">Hạ: ${trip.dropoff}</p>
                </td>
                <td class="px-4 py-4">
                    <p class="font-semibold text-slate-700 text-[11px] truncate max-w-[180px] mb-1">${trip.route}</p>
                    <p class="text-xs font-bold text-teal-700 bg-teal-50 inline-block px-2 py-0.5 rounded">${trip.driver}</p>
                </td>
                <td class="px-4 py-4">
                    <span class="px-3 py-1.5 rounded-full text-[10px] font-bold border uppercase tracking-wider font-heading ${statusCls}">${trip.status_label}</span>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error loading trips data:', err);
    }
}

// --- 3. XEM CHI TIẾT CHUYẾN XE ---
async function viewTripDetail(tripCode) {
    currentActiveTripCode = tripCode;
    try {
        const res = await fetch(`/api/trips/${tripCode}/`);
        const trip = await res.json();

        document.getElementById('view-dieu-van').classList.add('hidden-view');
        const detailView = document.getElementById('view-trip-detail');
        detailView.classList.remove('hidden-view');

        document.getElementById('detail-id').innerText = trip.id;
        document.getElementById('detail-type').innerText = trip.type;
        document.getElementById('detail-customer').innerText = trip.customer;
        document.getElementById('detail-driver').innerText = trip.driver;
        document.getElementById('detail-cont').innerText = trip.container;
        document.getElementById('detail-booking').innerText = trip.booking;
        document.getElementById('detail-seal').innerText = trip.seal;
        document.getElementById('detail-pickup').innerText = trip.pickup;
        document.getElementById('detail-warehouse').innerText = trip.warehouse;
        document.getElementById('detail-cutoff').innerText = trip.cutoff !== '-' ? `Cắt máng: ${trip.cutoff}` : '';
        document.getElementById('detail-notes').innerText = trip.notes || 'Không có ghi chú';

        document.getElementById('app-title').innerText = trip.route.split('->')[0].trim();

        const statusCls = STATUS_STYLE_MAP[trip.status] || 'bg-slate-100 text-slate-700 border-slate-300';
        const badge = document.getElementById('detail-status-badge');
        badge.className = `px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider font-heading ${statusCls}`;
        badge.innerText = trip.status_label;

        // Render Timeline 10 Bước
        const tContainer = document.getElementById('detail-timeline');
        tContainer.innerHTML = '';
        trip.timeline.forEach(item => {
            let borderClass = 'border-slate-300';
            let dotHtml = '';
            let textClass = 'text-slate-400';
            
            if (item.active) {
                borderClass = 'border-teal-600 ring-4 ring-teal-100';
                dotHtml = '<div class="w-2.5 h-2.5 bg-teal-600 rounded-full animate-pulse"></div>';
                textClass = 'text-teal-700 font-bold';
            } else if (item.done) {
                borderClass = 'border-emerald-500';
                dotHtml = '<div class="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>';
                textClass = 'text-slate-800';
            }

            tContainer.innerHTML += `
                <div class="relative py-1.5 timeline-item">
                    <div class="timeline-line"></div>
                    <div class="absolute left-0 top-[10px] w-5 h-5 rounded-full border-[3px] bg-white flex items-center justify-center z-10 ${borderClass}">
                        ${dotHtml}
                    </div>
                    <div class="pl-10">
                        <p class="font-bold text-[14px] tracking-wide ${textClass}">${item.title}</p>
                        ${item.time ? `<p class="text-[11px] mt-0.5 font-semibold text-slate-500">${item.time}</p>` : ''}
                    </div>
                </div>
            `;
        });

        // Render Expenses & Documents
        const exContainer = document.getElementById('app-expenses-list');
        exContainer.innerHTML = '';
        const docContainer = document.getElementById('detail-documents');
        docContainer.innerHTML = '';

        let allItems = [];
        if (trip.expenses) allItems = allItems.concat(trip.expenses);
        if (trip.documents) allItems = allItems.concat(trip.documents);

        if (allItems.length === 0) {
            exContainer.innerHTML = `
                <div class="flex flex-col items-center justify-center py-6 opacity-50">
                    <i class="ph ph-receipt text-3xl mb-2"></i>
                    <p class="text-sm font-semibold">Chưa có phát sinh/chứng từ</p>
                </div>`;
            docContainer.innerHTML = `<p class="text-sm text-slate-400 italic md:col-span-2">Chưa có chứng từ hoặc chi phí nào được gửi lên từ Tài xế.</p>`;
        } else {
            allItems.forEach(item => {
                if (item.type === 'expense') {
                    const statusHtml = item.status === 'APPROVED' 
                        ? '<span class="text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider mt-1 bg-emerald-100 text-emerald-700 inline-block font-heading">Đã duyệt</span>'
                        : '<span class="text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider mt-1 bg-amber-100 text-amber-800 inline-block font-heading">Chờ duyệt</span>';
                    
                    exContainer.innerHTML += `
                        <div class="flex justify-between items-start pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                            <div>
                                <p class="text-[12px] font-bold text-slate-800 flex items-center">${item.name} <i class="ph-fill ph-camera text-teal-600 ml-1"></i></p>
                                ${statusHtml} <span class="text-[9px] text-slate-400 ml-1">${item.time}</span>
                            </div>
                            <span class="font-black text-rose-600 text-[13px] whitespace-nowrap ml-2 tabular-nums">${new Intl.NumberFormat('vi-VN').format(item.amount)} đ</span>
                        </div>
                    `;

                    docContainer.innerHTML += `
                        <div class="flex items-center p-3 border border-slate-100 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                            <div class="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mr-3 shrink-0"><i class="ph-fill ph-receipt text-xl"></i></div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-bold text-slate-800 truncate">${item.name}</p>
                                <p class="text-[11px] font-semibold text-rose-600 tabular-nums">${new Intl.NumberFormat('vi-VN').format(item.amount)} đ <span class="text-slate-400 font-normal ml-1">• ${item.time}</span></p>
                            </div>
                            <span class="text-xs px-2.5 py-1 bg-amber-100 text-amber-800 rounded-md font-bold font-heading">${item.status}</span>
                        </div>`;
                } else if (item.type === 'document') {
                    exContainer.innerHTML += `
                        <div class="flex justify-between items-start pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                            <div>
                                <p class="text-[12px] font-bold text-emerald-700 flex items-center"><i class="ph-fill ph-file-pdf mr-1"></i> ${item.name}</p>
                                <p class="text-[10px] text-slate-500 mt-0.5">${item.details}</p>
                                <span class="text-[9px] text-slate-400">${item.time}</span>
                            </div>
                            <span class="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded font-heading">Đã gửi Đ.Độ</span>
                        </div>
                    `;

                    docContainer.innerHTML += `
                        <div class="flex items-center p-3 border border-slate-100 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                            <div class="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mr-3 shrink-0"><i class="ph-fill ph-file-text text-xl"></i></div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-bold text-slate-800 truncate">${item.name}</p>
                                <p class="text-[11px] font-medium text-slate-500 truncate">${item.details} <span class="text-slate-400 ml-1">• ${item.time}</span></p>
                            </div>
                            <span class="text-xs px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-md font-bold font-heading">Đã Nghiệm Thu</span>
                        </div>`;
                }
            });
        }

    } catch (err) {
        console.error('Error fetching trip detail:', err);
    }
}

function backToTrips() {
    document.getElementById('view-trip-detail').classList.add('hidden-view');
    document.getElementById('view-dieu-van').classList.remove('hidden-view');
    loadTripsData();
}

// --- 4. TẠO LỆNH ĐIỀU ĐỘNG MỚI (LƯU VÀO DB THẬT) ---
async function submitNewTrip() {
    const customer = document.getElementById('inp-customer').value;
    const type = document.getElementById('inp-type').value;
    const container = document.getElementById('inp-cont').value;
    const booking = document.getElementById('inp-booking').value;
    const seal = document.getElementById('inp-seal').value;
    const cutoff = document.getElementById('inp-cutoff').value;
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
                customer, type, container, booking, seal, cutoff,
                pickup, warehouse, dropoff, driver, notes
            })
        });
        const result = await res.json();
        if (result.success) {
            closeModal('modal-create-trip');
            document.getElementById('form-create-trip').reset();
            loadTripsData();
            alert(result.message);
        } else {
            alert('Lỗi tạo lệnh: ' + (result.error || 'Vui lòng kiểm tra lại thông tin'));
        }
    } catch (err) {
        console.error('Error submitting trip:', err);
        alert('Có lỗi xảy ra khi kết nối máy chủ.');
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
        const amount = document.getElementById('ocr-amount').value;
        const raw_ocr = document.getElementById('ocr-raw-text').innerText;

        const res = await fetch(`/api/trips/${currentActiveTripCode}/expenses/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category, amount, raw_ocr })
        });
        const resData = await res.json();
        if (resData.success) {
            closeModal('modal-ocr');
            viewTripDetail(currentActiveTripCode);
        }
    } else {
        const doc_type = document.getElementById('ocr-doc-type').value;
        const container_no = document.getElementById('ocr-doc-cont').value;
        const seal_no = document.getElementById('ocr-doc-seal').value;

        const res = await fetch(`/api/trips/${currentActiveTripCode}/documents/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ doc_type, container_no, seal_no })
        });
        const resData = await res.json();
        if (resData.success) {
            closeModal('modal-ocr');
            viewTripDetail(currentActiveTripCode);
        }
    }
}

// --- 6. NHÂN SỰ & LƯƠNG ---
async function loadHRData() {
    try {
        const res = await fetch('/api/personnel/');
        const data = await res.json();
        const tbody = document.getElementById('hr-tbody');
        tbody.innerHTML = '';
        data.forEach(nv => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50 transition-colors';
            tr.innerHTML = `
                <td class="p-4 font-bold text-teal-800 font-heading">${nv.code}</td>
                <td class="p-4 font-bold text-slate-800">${nv.name}</td>
                <td class="p-4 text-center font-black text-slate-600 tabular-nums">${nv.trips}</td>
                <td class="p-4 text-right font-medium text-slate-500 tabular-nums">${new Intl.NumberFormat('vi-VN').format(nv.base_salary)} đ</td>
                <td class="p-4 text-right font-bold text-teal-700 tabular-nums">${new Intl.NumberFormat('vi-VN').format(nv.trip_salary)} đ</td>
                <td class="p-4 text-right font-medium text-rose-500 tabular-nums">-${new Intl.NumberFormat('vi-VN').format(nv.advance)} đ</td>
                <td class="p-4 text-right font-black text-emerald-600 tabular-nums font-heading">${new Intl.NumberFormat('vi-VN').format(nv.net_salary)} đ</td>
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
                <td class="p-4 font-black text-slate-800 font-heading">${v.plate}</td>
                <td class="p-4 font-medium text-slate-600">${v.type}</td>
                <td class="p-4 font-bold text-slate-700">${v.driver}</td>
                <td class="p-4 font-medium ${v.is_reg_warning ? 'text-rose-600 font-black' : 'text-slate-600'}">${v.reg_expiry}</td>
                <td class="p-4 font-medium ${v.is_maint_warning ? 'text-amber-600 font-bold' : 'text-slate-600'}">${v.maint_date}</td>
                <td class="p-4">
                    <span class="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider font-heading ${statusCls}">${v.status}</span>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error loading fleet data:', err);
    }
}

// --- 8. SALE & BÁO GIÁ CRM ---
async function loadSalesData() {
    try {
        const res = await fetch('/api/sales/');
        const data = await res.json();
        const tbody = document.getElementById('sales-tbody');
        tbody.innerHTML = '';
        data.forEach(s => {
            let statusCls = 'bg-teal-100 text-teal-800';
            if (s.status.includes('Đã duyệt')) statusCls = 'bg-emerald-100 text-emerald-800';
            if (s.status.includes('Chờ')) statusCls = 'bg-amber-100 text-amber-800';

            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50 transition-colors';
            tr.innerHTML = `
                <td class="p-4 font-bold text-teal-800 font-heading">${s.code}</td>
                <td class="p-4 font-black text-slate-800">${s.customer}</td>
                <td class="p-4 font-medium text-slate-700">${s.route}</td>
                <td class="p-4 font-bold text-slate-600 tabular-nums">${new Intl.NumberFormat('vi-VN').format(s.unit_price)} đ</td>
                <td class="p-4 text-center font-black text-teal-700 tabular-nums">${s.monthly_trips} <span class="text-xs text-slate-400 font-medium">chuyến</span></td>
                <td class="p-4 text-right font-black text-emerald-600 tabular-nums font-heading">${new Intl.NumberFormat('vi-VN').format(s.expected_revenue)} đ</td>
                <td class="p-4">
                    <span class="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider font-heading ${statusCls}">${s.status}</span>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error loading sales data:', err);
    }
}

// --- 9. ĐIỀU HƯỚNG TAB & SỰ KIỆN ---
function switchTab(tabId) {
    document.querySelectorAll('.sidebar-btn').forEach(btn => {
        btn.classList.remove('bg-teal-700', 'text-white', 'shadow-md', 'shadow-teal-950/40');
        btn.classList.add('hover:bg-slate-800/60', 'hover:text-white', 'text-slate-400');
        const badge = btn.querySelector('span:last-child');
        if (badge) badge.className = 'text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-slate-800 text-slate-500';
    });
    const activeBtn = document.querySelector(`[data-target="${tabId}"]`);
    if (activeBtn) {
        activeBtn.classList.remove('hover:bg-slate-800/60', 'hover:text-white', 'text-slate-400');
        activeBtn.classList.add('bg-teal-700', 'text-white', 'shadow-md', 'shadow-teal-950/40');
        const badge = activeBtn.querySelector('span:last-child');
        if (badge) badge.className = 'text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-teal-900 text-teal-100';
    }

    document.querySelectorAll('.view').forEach(view => view.classList.add('hidden-view'));
    const targetView = document.getElementById(`view-${tabId}`);
    if (targetView) targetView.classList.remove('hidden-view');

    if (tabId === 'dashboard') loadDashboardData();
    if (tabId === 'dieu-van') loadTripsData();
    if (tabId === 'nhan-su') loadHRData();
    if (tabId === 'xe-bai') loadFleetData();
    if (tabId === 'kinh-doanh') loadSalesData();
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

function openModal(id) { 
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden-view'); 
}

function closeModal(id) { 
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden-view'); 
    if (id === 'modal-ocr') resetOcr();
}

// Khởi chạy khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
    const dateEl = document.getElementById('current-date');
    if (dateEl) {
        dateEl.innerText = new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric' });
    }
    switchTab('dieu-van');
});
