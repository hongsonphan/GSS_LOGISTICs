// =============================================================================
// GSS TMS - TRANG LỆNH VẬN CHUYỂN NHÀ XE (DEDICATED FULL-PAGE VIEW)
// Quản lý riêng 1 phiếu phân bổ N container của một nhà xe cụ thể (LVC)
// =============================================================================

let currentTransportOrderId = null;
let currentTransportOrderData = null;
let toSelectedExcelFile = null;

/**
 * Mở toàn màn hình Lệnh Vận Chuyển của một Nhà Xe cụ thể (theo Allocation ID)
 */
async function openTransportOrderPage(allocId, updateHistory = true) {
    if (!allocId) return;
    currentTransportOrderId = allocId;

    // Ẩn tất cả các view khác
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden-view'));

    // Hiển thị view Lệnh Vận Chuyển
    const toView = document.getElementById('view-transport-order');
    if (toView) {
        toView.classList.remove('hidden-view');
    }

    // Scroll lên đầu trang
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Cập nhật URL History
    if (updateHistory && window.history && window.history.pushState) {
        window.history.pushState({ view: 'transport-order', allocId }, '', `?view=transport-order&allocId=${allocId}`);
    }

    // Tải dữ liệu Lệnh Vận Chuyển từ API
    await loadTransportOrderData(allocId);
}

/**
 * Tải chi tiết Lệnh Vận Chuyển qua API /api/vendor-allocations/<id>/
 */
async function loadTransportOrderData(allocId) {
    const tbody = document.getElementById('to-containers-tbody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="12" class="p-8 text-center text-slate-400 font-medium"><i class="ph-bold ph-spinner animate-spin text-xl text-teal-600 mr-2"></i>Đang tải dữ liệu Lệnh Vận Chuyển...</td></tr>';
    }

    try {
        const res = await fetch(`/api/vendor-allocations/${allocId}/`, {
            headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
        });
        const json = await res.json();
        if (!json.success || !json.data) {
            throw new Error(json.message || 'Không thể tải thông tin Lệnh Vận Chuyển.');
        }

        currentTransportOrderData = json.data;
        renderTransportOrderView(currentTransportOrderData);
    } catch (err) {
        console.error('Lỗi tải Lệnh Vận Chuyển:', err);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="12" class="p-8 text-center text-rose-500 font-medium">Lỗi nạp dữ liệu: ${toEsc(err.message)}</td></tr>`;
        }
        if (typeof showToast === 'function') {
            showToast('error', `Không thể tải Lệnh Vận Chuyển: ${err.message}`, 'Lỗi Tải Dữ Liệu');
        }
    }
}

/**
 * Render toàn bộ dữ liệu lên giao diện
 */
function renderTransportOrderView(data) {
    const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = (val !== null && val !== undefined && val !== '') ? val : '---';
    };

    const rows = data.rows || [];
    const filled = data.filled || 0;
    const total = data.allocated_containers || rows.length || 0;
    const remaining = Math.max(0, total - filled);

    // 1. Header Bar
    const lvcCode = data.allocation_code || data.transport_order_code || (data.booking_code ? `DD.001.${data.booking_code}` : 'DD.--');
    setText('to-header-code', lvcCode);
    setText('to-header-vendor', data.subcontractor);
    setText('to-header-customer', data.customer);
    setText('to-header-booking', data.booking_code);
    setText('to-header-bl', data.bill_of_lading);

    // Badge trạng thái trên Header
    const badgeEl = document.getElementById('to-header-status-badge');
    if (badgeEl) {
        if (remaining <= 0) {
            badgeEl.className = 'px-2.5 py-0.5 rounded-md text-xs font-bold border uppercase tracking-wider font-heading whitespace-nowrap bg-emerald-50 text-emerald-800 border-emerald-300';
            badgeEl.innerText = `Đã gán đủ (${filled}/${total} xe)`;
        } else if (filled === 0) {
            badgeEl.className = 'px-2.5 py-0.5 rounded-md text-xs font-bold border uppercase tracking-wider font-heading whitespace-nowrap bg-rose-50 text-rose-800 border-rose-300';
            badgeEl.innerText = `Chưa gán xe (còn ${remaining}/${total})`;
        } else {
            badgeEl.className = 'px-2.5 py-0.5 rounded-md text-xs font-bold border uppercase tracking-wider font-heading whitespace-nowrap bg-amber-50 text-amber-800 border-amber-300';
            badgeEl.innerText = `Gán chưa hết (còn ${remaining}/${total})`;
        }
    }

    // 2. Thông tin Lộ trình & Đơn hàng
    setText('to-info-pickup', data.pickup_location || 'Cảng / Depot');
    setText('to-info-delivery', data.delivery_location || 'Kho khách hàng');
    setText('to-info-dropoff', data.dropoff_location || 'Depot rỗng');
    setText('to-info-cont-type', data.container_type || '20GP');
    setText('to-info-cargo', data.cargo_name || 'Hàng bách hóa');
    setText('to-info-shipping-line', data.shipping_line || '---');
    setText('to-info-link-expiry', data.expires_at ? toFmtDate(data.expires_at) : 'Không giới hạn');

    // Hạn định thời gian: Đủ 2 dòng DEM và DET
    const demDays = data.free_time_demurrage || 7;
    const detDays = data.free_time_detention || 7;
    const demExp = data.dem_expiry ? ` (Hạn: ${data.dem_expiry})` : '';
    const detExp = data.det_expiry ? ` (Hạn: ${data.det_expiry})` : '';
    setText('to-info-dem', `${demDays} ngày miễn phí${demExp}`);
    setText('to-info-det', `${detDays} ngày miễn phí${detExp}`);
    setText('to-info-cutoff', data.closing_time || data.si_cutoff || 'Theo quy tắc');

    // 3. Bốn Thẻ KPI
    let runningCount = 0;
    let doneCount = 0;
    rows.forEach(r => {
        const st = (r.step_status || '').toUpperCase();
        if (st === 'RUNNING' || st === 'ON_WAY' || st === 'DELIVERING' || st === 'IN_PROGRESS') runningCount++;
        else if (st === 'COMPLETED' || st === 'POD_RETURNED' || st === 'EMPTY_RETURNED' || st === 'DONE') doneCount++;
    });

    setText('to-kpi-total', `${total} Cont`);
    setText('to-kpi-total-sub', `100% định mức ${data.subcontractor}`);
    setText('to-kpi-unallocated', `${remaining} Cont`);
    setText('to-kpi-running', `${runningCount} Xe`);
    setText('to-kpi-done', `${doneCount} Cont`);

    // 4. Bảng danh sách Container
    setText('to-table-counter', `Đang hiển thị: ${rows.length}/${total} container`);
    setText('to-table-footer-status', `Tiến độ: ${filled}/${total} cont đã gán xe • Còn ${remaining} cont`);

    const tbody = document.getElementById('to-containers-tbody');
    if (!tbody) return;

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="12" class="p-8 text-center text-slate-400 font-medium">Phiếu chia ${total} container cho nhà xe ${toEsc(data.subcontractor)}. Hiện chưa có dữ liệu container.</td></tr>`;
        return;
    }

    tbody.innerHTML = rows.map((r, i) => {
        const hasTrip = !!r.trip_id;
        const cNum = r.container_number || '';
        const bl = r.bill_of_lading || data.bill_of_lading || '';
        const seal = r.seal_number || '';
        const plate = r.license_plate || '';
        const trailer = r.trailer_plate || '';
        const dName = r.driver_name || '';
        const dPhone = r.driver_phone || '';
        const tCode = r.trip_code || '';
        const statusLabel = r.step_status_display || r.step_status || (hasTrip ? 'Đã gán xe' : 'Chờ gán xe');

        let statusBadge = '';
        if (hasTrip) {
            statusBadge = `
                <div class="inline-flex items-center gap-1 text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    <i class="ph-bold ph-check-circle"></i>
                    <span>${toEsc(statusLabel)}</span>
                </div>
                ${tCode ? `<div class="mt-1"><button type="button" onclick="viewTripDetail('${toEsc(tCode)}')" class="font-mono font-bold text-xs text-teal-700 hover:text-teal-950 hover:underline inline-flex items-center gap-0.5"><i class="ph-bold ph-arrow-square-out text-[10px]"></i>${toEsc(tCode)}</button></div>` : ''}
            `;
        } else {
            statusBadge = `
                <div class="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    <i class="ph-bold ph-hourglass-medium"></i>
                    <span>Chờ gán xe</span>
                </div>
            `;
        }

        return `
            <tr class="hover:bg-teal-50/20 transition-colors ${hasTrip ? '' : 'bg-amber-50/10'}">
                <td class="p-3 font-mono font-bold text-slate-400 text-center">${r.line_no || (i + 1)}</td>
                <td class="p-3">
                    <div class="font-mono font-bold text-slate-900 text-xs">${cNum ? toEsc(cNum) : '<span class="text-slate-400 italic">Theo lệnh B/L</span>'}</div>
                </td>
                <td class="p-3">
                    <div class="font-mono font-bold text-slate-800 text-xs">${bl ? toEsc(bl) : '<span class="text-slate-300">---</span>'}</div>
                </td>
                <td class="p-3 text-center">
                    <span class="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-700 border border-slate-200">${toEsc(data.container_type || '20GP')}</span>
                </td>
                <td class="p-3">
                    <div class="font-mono text-slate-700 text-xs">${seal ? toEsc(seal) : '<span class="text-slate-300">---</span>'}</div>
                </td>
                <td class="p-3">
                    <div class="text-slate-800 text-xs font-medium">${toEsc(r.delivery_location || data.delivery_location || 'Kho khách hàng')}</div>
                </td>
                <td class="p-3">
                    ${plate ? `<span class="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-xs">${toEsc(plate)}</span>` : '<span class="text-amber-800 italic text-xs">--Chờ gán--</span>'}
                </td>
                <td class="p-3">
                    ${trailer ? `<span class="font-mono font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-xs">${toEsc(trailer)}</span>` : '<span class="text-slate-400">---</span>'}
                </td>
                <td class="p-3">
                    <div class="font-bold text-slate-800 text-xs">${dName ? toEsc(dName) : '<span class="text-amber-800 italic text-xs">--Chưa gán--</span>'}</div>
                </td>
                <td class="p-3">
                    <div class="font-mono text-slate-600 text-xs">${dPhone ? toEsc(dPhone) : '<span class="text-slate-400">---</span>'}</div>
                </td>
                <td class="p-3 text-center">
                    ${statusBadge}
                </td>
                <td class="p-3 text-center whitespace-nowrap">
                    <div class="inline-flex items-center gap-1.5 justify-center">
                        ${hasTrip && tCode ? `
                            <button type="button" onclick="viewTripDetail('${toEsc(tCode)}')" class="px-2 py-1 rounded bg-white hover:bg-teal-50 border border-teal-600 text-teal-800 font-bold text-xs inline-flex items-center gap-1 cursor-pointer shadow-2xs" title="Xem chi tiết chuyến xe">
                                <i class="ph-bold ph-eye"></i> Xem
                            </button>
                            <button type="button" onclick="printTripSheet('${toEsc(tCode)}')" class="px-2 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs inline-flex items-center gap-1 cursor-pointer shadow-2xs" title="In phiếu vận chuyển">
                                <i class="ph-bold ph-printer"></i> In
                            </button>
                        ` : `
                            <button type="button" onclick="toOpenVendorPortal()" class="px-2.5 py-1 rounded bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs inline-flex items-center gap-1 cursor-pointer shadow-2xs" title="Gán xe/tài trên Cổng Nhà Xe">
                                <i class="ph-bold ph-plus"></i> Gán xe
                            </button>
                        `}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Tải lại dữ liệu của Lệnh Vận Chuyển hiện tại
 */
function refreshTransportOrderPage() {
    if (currentTransportOrderId) {
        loadTransportOrderData(currentTransportOrderId);
    }
}

/**
 * Quay lại danh sách Điều Vận (Tab 2: Phân bổ & gán xe)
 */
function backToAllocations() {
    // Ẩn view Lệnh Vận Chuyển
    const toView = document.getElementById('view-transport-order');
    if (toView) toView.classList.add('hidden-view');

    // Mở lại view Điều Vận chính
    if (typeof switchTab === 'function') {
        switchTab('dieu-van', false);
    } else {
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden-view'));
        const dispatchView = document.getElementById('view-dieu-van');
        if (dispatchView) dispatchView.classList.remove('hidden-view');
    }

    // Đảm bảo kích hoạt đúng Tab 2: "Phân bổ & gán xe"
    if (typeof switchDispatchViewTab === 'function') {
        switchDispatchViewTab('allocations');
    }
    if (typeof loadAllocationsTab === 'function') {
        loadAllocationsTab();
    } else if (typeof loadVendorAdminTab === 'function') {
        loadVendorAdminTab(false);
    }

    // Cập nhật URL sạch: /dispatch
    if (window.history && window.history.pushState) {
        window.history.pushState({ tabId: 'dieu-van', subTab: 'allocations' }, '', '/dispatch');
    }
}

// -----------------------------------------------------------------------------
// NHẬP EXCEL MODAL CHUẨN 2 BƯỚC
// -----------------------------------------------------------------------------

function toOpenExcelModal(allocId) {
    if (allocId) currentTransportOrderId = allocId;
    if (!currentTransportOrderId) return;
    const modal = document.getElementById('modal-to-excel');
    if (!modal) return;

    const subEl = document.getElementById('modal-to-excel-sub');
    if (subEl && currentTransportOrderData) {
        const lvcCode = currentTransportOrderData.transport_order_code || `LVC.${currentTransportOrderData.booking_code || ''} - ${currentTransportOrderData.subcontractor}`;
        subEl.innerText = `${lvcCode} (${currentTransportOrderData.allocated_containers || 0} container)`;
    }

    // Reset form
    toSelectedExcelFile = null;
    const fileInput = document.getElementById('to-excel-file-input');
    if (fileInput) fileInput.value = '';
    const fileNameEl = document.getElementById('to-excel-file-name');
    if (fileNameEl) fileNameEl.innerText = 'Bấm vào đây để chọn file Excel (.xlsx)';
    const submitBtn = document.getElementById('btn-to-excel-submit');
    if (submitBtn) submitBtn.disabled = true;
    const msgEl = document.getElementById('to-excel-status-msg');
    if (msgEl) {
        msgEl.classList.add('hidden');
        msgEl.innerHTML = '';
    }

    modal.classList.remove('hidden');
}

function toCloseExcelModal() {
    const modal = document.getElementById('modal-to-excel');
    if (modal) modal.classList.add('hidden');
}

/**
 * Bước 1: Tải file Excel mẫu của phiếu này
 */
function toDownloadExcelTemplate() {
    if (!currentTransportOrderId) return;
    window.location.href = `/api/vendor-allocations/${currentTransportOrderId}/excel/`;
    if (typeof showToast === 'function') {
        showToast('info', 'Đang tải file Excel mẫu danh sách container...', 'Xuất File Excel');
    }
}

/**
 * Bước 2: Bắt sự kiện chọn file Excel
 */
function toHandleExcelFileSelected(input) {
    const submitBtn = document.getElementById('btn-to-excel-submit');
    const fileNameEl = document.getElementById('to-excel-file-name');
    const msgEl = document.getElementById('to-excel-status-msg');
    if (msgEl) msgEl.classList.add('hidden');

    if (input.files && input.files[0]) {
        toSelectedExcelFile = input.files[0];
        if (fileNameEl) {
            fileNameEl.innerHTML = `<span class="text-emerald-700 font-bold">${toEsc(toSelectedExcelFile.name)}</span> (${Math.round(toSelectedExcelFile.size / 1024)} KB)`;
        }
        if (submitBtn) submitBtn.disabled = false;
    } else {
        toSelectedExcelFile = null;
        if (fileNameEl) fileNameEl.innerText = 'Bấm vào đây để chọn file Excel (.xlsx)';
        if (submitBtn) submitBtn.disabled = true;
    }
}

/**
 * Bước 2b: Gửi file Excel lên server
 */
async function toSubmitExcelUpload() {
    if (!currentTransportOrderId || !toSelectedExcelFile) return;

    const submitBtn = document.getElementById('btn-to-excel-submit');
    const msgEl = document.getElementById('to-excel-status-msg');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="ph-bold ph-spinner animate-spin text-sm"></i> Đang nạp...';
    }

    const formData = new FormData();
    formData.append('file', toSelectedExcelFile);

    try {
        const res = await fetch(`/api/vendor-allocations/${currentTransportOrderId}/excel/`, {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': toGetCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        const json = await res.json();
        if (!res.ok || json.error) {
            throw new Error(json.error || json.message || 'Lỗi khi nạp file Excel.');
        }

        // Thành công
        const saved = json.saved_rows || (json.rows ? json.rows.length : 0);
        if (msgEl) {
            msgEl.className = 'text-xs font-semibold p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 block';
            msgEl.innerHTML = `<i class="ph-bold ph-check-circle mr-1 text-base text-emerald-600"></i> Nạp thành công! Đã ghi nhận thông tin phương tiện cho các container.`;
        }

        if (typeof showToast === 'function') {
            showToast('success', `Đã cập nhật dữ liệu thành công từ file Excel.`, 'Nhập Excel Thành Công');
        }

        // Tự động đóng modal sau 1.5s và nạp lại trang
        setTimeout(() => {
            toCloseExcelModal();
            loadTransportOrderData(currentTransportOrderId);
            if (typeof loadVendorAdminTab === 'function') {
                loadVendorAdminTab(false);
            }
        }, 1200);

    } catch (err) {
        console.error('Lỗi nạp Excel:', err);
        if (msgEl) {
            msgEl.className = 'text-xs font-semibold p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 block';
            msgEl.innerHTML = `<i class="ph-bold ph-warning-circle mr-1 text-base text-rose-600"></i> Lỗi: ${toEsc(err.message)}`;
        }
        if (typeof showToast === 'function') {
            showToast('error', `Lỗi nạp Excel: ${err.message}`, 'Thất Bại');
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="ph-bold ph-check text-sm"></i> Nạp Dữ Liệu Lên Hệ Thống';
        }
    }
}

// -----------------------------------------------------------------------------
// TIỆN ÍCH & THAO TÁC KHÁC
// -----------------------------------------------------------------------------

function toShareVendorZalo() {
    if (currentTransportOrderId && typeof vaShareVendorBatchZalo === 'function') {
        vaShareVendorBatchZalo(currentTransportOrderId);
    }
}

function toOpenVendorPortal() {
    if (currentTransportOrderData && currentTransportOrderData.vendor_link) {
        window.open(currentTransportOrderData.vendor_link, '_blank');
    } else {
        if (typeof showToast === 'function') {
            showToast('warning', 'Không tìm thấy đường link Cổng Nhà Xe hợp lệ.', 'Chưa Có Link');
        }
    }
}

function toPrintTransportOrder() {
    window.print();
}

function toEsc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toFmtDate(dtStr) {
    if (!dtStr) return '---';
    try {
        const d = new Date(dtStr);
        if (isNaN(d.getTime())) return dtStr;
        const pad = n => String(n).padStart(2, '0');
        return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
        return dtStr;
    }
}

function toGetCsrfToken() {
    const match = document.cookie.match(/csrftoken=([^;]+)/);
    return match ? match[1] : '';
}

// Xuất các hàm ra phạm vi toàn cục window
window.openTransportOrderPage = openTransportOrderPage;
window.refreshTransportOrderPage = refreshTransportOrderPage;
window.backToAllocations = backToAllocations;
window.toOpenExcelModal = toOpenExcelModal;
window.toCloseExcelModal = toCloseExcelModal;
window.toDownloadExcelTemplate = toDownloadExcelTemplate;
window.toHandleExcelFileSelected = toHandleExcelFileSelected;
window.toSubmitExcelUpload = toSubmitExcelUpload;
window.toShareVendorZalo = toShareVendorZalo;
window.toOpenVendorPortal = toOpenVendorPortal;
window.toPrintTransportOrder = toPrintTransportOrder;
