// Module Quản lý Trang Lập Lệnh Điều Động & Phân Bổ Vendor (GSS TMS - Dedicated View)

let mdoActiveBookings = [];
let mdoSubcontractors = [];
let mdoCurrentBooking = null;
let mdoCurrentAllocations = [];

async function openDispatchOrderPage(preselectedBookingId = null, updateHistory = true) {
    // Ẩn tất cả các view khác
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden-view'));
    
    // Mở trang view Lệnh Điều Động
    const orderView = document.getElementById('view-dispatch-order');
    if (orderView) orderView.classList.remove('hidden-view');

    // Ẩn modal cũ nếu còn sót
    const oldModal = document.getElementById('modal-dispatch-order');
    if (oldModal) oldModal.classList.add('hidden');

    // Cập nhật URL sạch trên trình duyệt
    if (updateHistory && window.history && window.history.pushState) {
        const orderPath = preselectedBookingId ? `/dispatch/orders/${preselectedBookingId}` : '/dispatch/orders/new';
        if (window.location.pathname !== orderPath) {
            window.history.pushState({ view: 'dispatch-order', bookingId: preselectedBookingId }, '', orderPath);
        }
    }

    // Reset giao diện
    const resultBox = document.getElementById('mdo-result-box');
    if (resultBox) resultBox.classList.add('hidden');
    const tbody = document.getElementById('mdo-allocations-tbody');
    if (tbody) tbody.innerHTML = '';
    mdoUpdateStats(0, 0);

    // Mặc định ngày hiệu lực
    const today = new Date().toISOString().split('T')[0];
    const next7Days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const fromInp = document.getElementById('mdo-valid-from');
    const toInp = document.getElementById('mdo-valid-to');
    if (fromInp) fromInp.value = today;
    if (toInp) toInp.value = next7Days;

    // Nạp danh sách Nhà xe nếu chưa có
    try {
        const subRes = await fetchWithAuth('/api/master-data/subcontractors/');
        if (subRes.ok) {
            const subData = await subRes.json();
            mdoSubcontractors = (subData.results || subData || []).filter(s => s.is_active !== false);
        }
    } catch (e) {
        console.warn('Không tải được danh sách nhà xe:', e);
    }

    // Nạp danh sách Booking
    const sel = document.getElementById('mdo-select-booking');
    if (sel) {
        sel.innerHTML = '<option value="">-- Đang tải danh sách Booking... --</option>';
        try {
            const res = await fetchWithAuth('/api/bookings/active/');
            if (res.ok) {
                const data = await res.json();
                mdoActiveBookings = data.data || data.results || data || [];
                let html = '<option value="">-- Chọn Booking / Đơn Hàng Cần Lập Lệnh Điều Động --</option>';
                mdoActiveBookings.forEach(b => {
                    const rawCode = b.booking_code || b.booking_number || `BK#${b.id}`;
    const code = rawCode.startsWith("LDD.") ? rawCode : `LDD.${rawCode}`;
                    const cust = b.customer_name || b.customer || 'Khách hàng';
                    const conts = b.total_containers || 1;
                    const route = `${b.pickup_location || 'A'} -> ${b.delivery_location || 'B'}`;
                    html += `<option value="${b.id}">${code} - ${cust} (${conts} cont, ${route})</option>`;
                });
                sel.innerHTML = html;

                if (preselectedBookingId) {
                    sel.value = String(preselectedBookingId);
                    await onDispatchOrderBookingChanged(preselectedBookingId);
                }
            } else {
                sel.innerHTML = '<option value="">-- Không có Booking nào đang chờ điều xe --</option>';
            }
        } catch (e) {
            sel.innerHTML = '<option value="">-- Lỗi tải danh sách Booking --</option>';
        }
    }
}

function backToDispatchOrders() {
    // Ẩn view Lệnh Điều Động
    const orderView = document.getElementById('view-dispatch-order');
    if (orderView) orderView.classList.add('hidden-view');

    // Mở lại view Điều Vận
    const dispatchView = document.getElementById('view-dieu-van');
    if (dispatchView) dispatchView.classList.remove('hidden-view');

    // Chuyển về tab Lệnh Điều Động và làm mới
    if (typeof switchDispatchViewTab === 'function') switchDispatchViewTab('orders');
    if (typeof loadDispatchOrdersTab === 'function') loadDispatchOrdersTab();

    if (window.history && window.history.pushState) {
        window.history.pushState({ tabId: 'dieu-van' }, '', '/dispatch');
    }
}
window.openDispatchOrderPage = openDispatchOrderPage;
window.backToDispatchOrders = backToDispatchOrders;

// Tương thích ngược gọi openDispatchOrderModal
function openDispatchOrderModal(preselectedBookingId = null) {
    return openDispatchOrderPage(preselectedBookingId, true);
}
window.openDispatchOrderModal = openDispatchOrderModal;

function closeDispatchOrderModal() {
    const orderView = document.getElementById('view-dispatch-order');
    if (orderView && !orderView.classList.contains('hidden-view')) {
        orderView.classList.add('hidden-view');
    }
    const oldModal = document.getElementById('modal-dispatch-order');
    if (oldModal) oldModal.classList.add('hidden');
}
window.closeDispatchOrderModal = closeDispatchOrderModal;

async function onDispatchOrderBookingChanged(bookingId) {
    const summaryCard = document.getElementById('mdo-booking-summary');
    const badge = document.getElementById('mdo-booking-badge');
    const headerCode = document.getElementById('mdo-header-order-code');
    const headerBadge = document.getElementById('mdo-header-status-badge');
    const headerCust = document.getElementById('mdo-header-customer');
    const headerType = document.getElementById('mdo-header-type');
    const headerBL = document.getElementById('mdo-header-bl');
    const tbody = document.getElementById('mdo-allocations-tbody');
    if (tbody) tbody.innerHTML = '';

    if (!bookingId) {
        if (summaryCard) summaryCard.classList.add('hidden');
        if (badge) badge.innerText = 'Đang chọn: --';
        if (headerCode) headerCode.innerText = 'LĐĐ: --';
        if (headerBadge) {
            headerBadge.innerText = 'Chờ điều phối';
            headerBadge.className = 'px-2.5 py-0.5 rounded-lg text-xs font-bold font-heading bg-amber-100 text-amber-800 border border-amber-300';
        }
        mdoCurrentBooking = null;
        mdoUpdateStats(0, 0);
        return;
    }

    // Nạp chi tiết Booking từ API để có đầy đủ thông tin chuẩn Lệnh Điều Động
    let b = mdoActiveBookings.find(x => String(x.id) === String(bookingId)) || null;
    try {
        const detailRes = await fetchWithAuth(`/api/bookings/${bookingId}/`);
        if (detailRes.ok) {
            const detailJson = await detailRes.json();
            b = { ...b, ...detailJson };
        }
    } catch (err) {
        console.warn('Không tải được chi tiết booking qua /api/bookings/:', err);
    }

    if (!b) return;
    mdoCurrentBooking = b;

    if (summaryCard) summaryCard.classList.remove('hidden');
    const rawCode = b.booking_code || b.booking_number || `BK#${b.id}`;
    const code = rawCode.startsWith("LDD.") ? rawCode : `LDD.${rawCode}`;
    if (badge) badge.innerText = `Đang chọn: ${code}`;
    if (headerCode) headerCode.innerText = code;
    if (headerCust) headerCust.innerText = b.customer_name || b.customer || '--';
    if (headerType) headerType.innerText = b.booking_type_display || (b.booking_type === 'EXPORT_FCL' ? 'Kéo Cont Xuất Khẩu' : (b.booking_type === 'IMPORT_FCL' ? 'Kéo Cont Nhập Khẩu' : 'Vận Chuyển Nội Địa'));
    if (headerBL) headerBL.innerText = b.booking_number || b.mbl_number || b.booking_code || '--';

    const totalConts = Number(b.total_containers) || 1;
    const dispatchedConts = Number(b.dispatched_containers) || 0;

    if (headerBadge) {
        if (dispatchedConts >= totalConts) {
            headerBadge.innerText = `Đã phân bổ (${dispatchedConts}/${totalConts} cont)`;
            headerBadge.className = 'px-2.5 py-0.5 rounded-lg text-xs font-bold font-heading bg-emerald-100 text-emerald-800 border border-emerald-300';
        } else if (dispatchedConts > 0) {
            headerBadge.innerText = `Đang điều phối (${dispatchedConts}/${totalConts} cont)`;
            headerBadge.className = 'px-2.5 py-0.5 rounded-lg text-xs font-bold font-heading bg-sky-100 text-sky-800 border border-sky-300';
        } else {
            headerBadge.innerText = `Chờ điều phối (0/${totalConts} cont)`;
            headerBadge.className = 'px-2.5 py-0.5 rounded-lg text-xs font-bold font-heading bg-amber-100 text-amber-800 border border-amber-300';
        }
    }

    const setT = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val || '--'; };
    const setH = (id, val) => { const el = document.getElementById(id); if (el) el.innerHTML = val || '--'; };

    // Điền chi tiết Thẻ A (Hồ sơ đơn hàng & Vận đơn)
    setT('mdo-sum-customer', b.customer_name || b.customer);
    setT('mdo-sum-code-bl', `${code} ${b.booking_number ? `(B/L: ${b.booking_number})` : ''}`);
    setT('mdo-sum-type', b.booking_type_display || (b.booking_type === 'EXPORT_FCL' ? 'Kéo Cont Xuất Khẩu' : (b.booking_type === 'IMPORT_FCL' ? 'Kéo Cont Nhập Khẩu' : 'Vận Chuyển Nội Địa')));
    setT('mdo-sum-vessel', (b.shipping_line || '--') + (b.vessel_voyage ? ` / ${b.vessel_voyage}` : ''));
    setT('mdo-sum-cargo', b.commodity || b.actual_cargo_name || 'Hàng tiêu chuẩn');
    setT('mdo-sum-containers', `${totalConts} Cont (${b.container_size || '40HC'})`);
    setT('mdo-sum-price', `${typeof formatNumberVN === 'function' ? formatNumberVN(b.selling_freight_price || 0) : (b.selling_freight_price || 0)} đ`);

    // Điền chi tiết Thẻ B (Lộ trình 3 điểm TMS)
    setT('mdo-sum-pickup', b.pickup_location || 'Cảng Cát Lái');
    setT('mdo-sum-delivery', b.delivery_location || 'Kho khách hàng');
    setT('mdo-sum-dropoff', b.dropoff_location || 'Depot hạ rỗng');
    setT('mdo-sum-route', `${b.pickup_location || 'Điểm 1'} -> ${b.delivery_location || 'Điểm 2'} -> ${b.dropoff_location || 'Điểm 3'}`);

    // Điền chi tiết Thẻ C (Kế hoạch & Hạn lệnh)
    const loadDateStr = b.loading_date ? (typeof formatDateVN === 'function' ? formatDateVN(b.loading_date) : b.loading_date) : '--';
    setT('mdo-sum-loading-date', `${loadDateStr} ${b.loading_time || ''}`);
    const doExpStr = b.do_expiry ? (typeof formatDateVN === 'function' ? formatDateVN(b.do_expiry) : b.do_expiry) : '--';
    setT('mdo-sum-do-expiry', doExpStr);

    const demDays = b.free_time_demurrage || 7;
    const detDays = b.free_time_detention || 7;
    const demExp = b.dem?.expiry ? (typeof formatDateVN === 'function' ? formatDateVN(b.dem.expiry) : b.dem.expiry) : '';
    const detExp = b.det?.expiry ? (typeof formatDateVN === 'function' ? formatDateVN(b.det.expiry) : b.det.expiry) : '';
    setT('mdo-sum-dem', `${demDays} ngày ${demExp ? `(Hạn: ${demExp})` : ''}`);
    setT('mdo-sum-det', `${detDays} ngày ${detExp ? `(Hạn: ${detExp})` : ''}`);

    const notes = [b.destination_notes, b.road_restrictions].filter(Boolean).join(' | ');
    setH('mdo-sum-notes', notes ? `<i class="ph-bold ph-warning text-amber-600 text-xs"></i> <strong class="text-amber-900">Lưu ý:</strong> ${escapeHtml(notes)}` : '<i class="ph-bold ph-check-circle text-teal-600 text-xs"></i> Đường thông thoáng, không có cấm tải.');

    // Nạp ngày hiệu lực mặc định
    const validFromInp = document.getElementById('mdo-valid-from');
    const validToInp = document.getElementById('mdo-valid-to');
    if (validFromInp && b.loading_date) validFromInp.value = b.loading_date;

    // Nạp danh sách các Nhà xe được phân bổ & hiển thị thẻ Link Cổng Nhà Xe
    await mdoReloadAllocationsAndCards(b.id);

    // Nạp danh sách container chi tiết của B/L
    await loadMdoContainers(b.id);
}



function mdoAddAllocationRow(subId = null, count = 1, note = '', isExisting = false, vendorLink = '', allocId = null, allocObj = null) {
    const tbody = document.getElementById('mdo-allocations-tbody');
    if (!tbody) return;

    const rowIdx = tbody.children.length + 1;
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 transition-colors'; 
    if (isExisting) {
        tr.dataset.existing = '1';
        if (allocId) tr.dataset.allocId = allocId;
        tr.dataset.origCount = count;
    }

    let subOptions = '<option value="">-- Chọn Nhà xe (Vendor) --</option>';
    mdoSubcontractors.forEach(s => {
        const sel = subId && String(s.id) === String(subId) ? 'selected' : '';
        subOptions += `<option value="${s.id}" ${sel}>${escapeHtml(s.short_name || s.name)}</option>`;
    });

    tr.innerHTML = `
        <td class="p-2.5 text-center font-bold text-slate-500">${rowIdx}</td>
        <td class="p-2.5">
            <select class="mdo-sub-select w-full h-8.5 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800" ${isExisting ? 'disabled' : ''}>
                ${subOptions}
            </select>
            ${isExisting && allocObj ? `
                <div class="flex items-center gap-1.5 mt-1.5 flex-wrap text-xs font-bold ${(allocObj.filled >= allocObj.allocated_containers && allocObj.allocated_containers > 0) ? 'text-emerald-700' : ((allocObj.filled > 0) ? 'text-sky-700' : 'text-amber-700')}">
                    <i class="ph-bold ${(allocObj.filled >= allocObj.allocated_containers && allocObj.allocated_containers > 0) ? 'ph-check-circle' : ((allocObj.filled > 0) ? 'ph-arrows-clockwise' : 'ph-clock')}"></i>
                    <span>${(allocObj.filled >= allocObj.allocated_containers && allocObj.allocated_containers > 0) ? `Đã khai báo đủ (${allocObj.filled}/${allocObj.allocated_containers} xe)` : ((allocObj.filled > 0) ? `Đang khai báo (${allocObj.filled}/${allocObj.allocated_containers} xe)` : `Chờ Vendor khai báo (0/${allocObj.allocated_containers} xe)`)}</span>
                </div>
            ` : ''}
            ${isExisting && vendorLink ? `
                <div class="flex items-center gap-1.5 mt-2 flex-wrap">
                    <a href="${vendorLink}" target="_blank" 
                        class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-300 text-teal-800 text-[11px] font-bold hover:bg-teal-100 transition-colors shadow-2xs"
                        title="Mở Cổng Nhà Xe để xem giao diện khai báo">
                        <i class="ph-bold ph-arrow-square-out text-teal-700"></i> Cổng Nhà Xe
                    </a>
                    <button type="button" onclick="mdoCopyVendorLink('${vendorLink}')" 
                        class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
                        title="Sao chép link gửi Zalo cho nhà xe">
                        <i class="ph-bold ph-copy text-slate-600"></i> Copy Link
                    </button>
                    <button type="button" onclick="printDispatchOrderSlip(mdoCurrentBooking?.id, ${subId})" 
                        class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
                        title="In phiếu lệnh riêng cho nhà xe này (không có cước)">
                        <i class="ph-bold ph-printer text-teal-600"></i> In Phiếu
                    </button>
                </div>
            ` : ''}
        </td>
        <td class="p-2.5 text-center">
            <input type="number" min="1" value="${count}" oninput="mdoRecalcAllocations()" ${isExisting ? 'disabled' : ''}
                class="mdo-count-input w-24 h-8.5 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center text-teal-800 font-heading ${isExisting ? 'bg-slate-100' : ''}">
        </td>
        <td class="p-2.5">
            <input type="text" placeholder="Lưu ý riêng cho nhà xe này..." value="${escapeHtml(note)}"
                class="mdo-note-input w-full h-8.5 px-2.5 bg-white border border-slate-300 rounded-lg text-xs">
        </td>
        <td class="p-2.5 text-center">
            <label class="inline-flex items-center cursor-pointer">
                <input type="checkbox" ${isExisting ? '' : 'checked'} class="mdo-email-chk rounded text-teal-600 focus:ring-teal-500 h-4 w-4">
            </label>
        </td>
        <td class="p-2.5 text-center">
            <button type="button" onclick="mdoRemoveAllocationRow(this)" 
                class="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer" title="${isExisting ? 'Thu hồi phân bổ này' : 'Xóa dòng này'}">
                <i class="ph-bold ph-trash text-sm"></i>
            </button>
        </td>
    `;

    tbody.appendChild(tr);
    mdoRecalcAllocations();
}

async function mdoRemoveAllocationRow(btn) {
    const tr = btn.closest('tr');
    if (!tr) return;
    if (tr.dataset.existing === '1' && tr.dataset.allocId) {
        if (!confirm('Bạn có chắc chắn muốn thu hồi lệnh phân bổ này của Nhà xe?')) return;
        try {
            const res = await fetchWithAuth(`/api/vendor-allocations/${tr.dataset.allocId}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'revoke' })
            });
            const out = await res.json();
            if (res.ok && out.success) {
                showToast('success', 'Đã thu hồi phân bổ thành công!');
                tr.remove();
                mdoRecalcAllocations();
            } else {
                showToast('danger', out.message || 'Không thể thu hồi phân bổ.');
            }
        } catch (e) {
            showToast('danger', 'Lỗi kết nối khi thu hồi: ' + e.message);
        }
    } else {
        tr.remove();
        mdoRecalcAllocations();
    }
}
window.mdoRemoveAllocationRow = mdoRemoveAllocationRow;



function mdoRecalcAllocations() {

    const total = mdoCurrentBooking ? (Number(mdoCurrentBooking.total_containers) || 1) : 0;

    const inputs = document.querySelectorAll('.mdo-count-input');

    let allocated = 0;

    inputs.forEach(inp => {

        allocated += Number(inp.value) || 0;

    });

    const remaining = total - allocated;

    mdoUpdateStats(allocated, remaining);

}



function mdoUpdateStats(allocated, remaining) {

    const aEl = document.getElementById('mdo-stat-allocated');

    const rEl = document.getElementById('mdo-stat-remaining');

    if (aEl) aEl.innerText = allocated;

    if (rEl) {

        rEl.innerText = remaining;

        rEl.className = remaining < 0 ? 'text-rose-600 font-black' : (remaining === 0 ? 'text-emerald-600 font-black' : 'text-amber-700 font-bold');

    }

}



async function submitDispatchOrderAllocation() {
    if (!mdoCurrentBooking) {
        showToast('warning', 'Vui lòng chọn Booking trước khi phát lệnh.');
        return;
    }

    const rows = document.querySelectorAll('#mdo-allocations-tbody tr');
    if (!rows.length) {
        showToast('warning', 'Vui lòng thêm ít nhất một Nhà xe để phân bổ container.');
        return;
    }

    const newAllocations = [];
    let hasError = false;

    rows.forEach((tr, i) => {
        if (tr.dataset.existing === '1') {
            // Dòng phân bổ đã có trong CSDL
            return;
        }
        const subId = tr.querySelector('.mdo-sub-select')?.value;
        const count = Number(tr.querySelector('.mdo-count-input')?.value) || 0;
        const note = tr.querySelector('.mdo-note-input')?.value || '';
        const sendEmail = !!tr.querySelector('.mdo-email-chk')?.checked;

        if (!subId) {
            showToast('danger', `Dòng #${i + 1}: Vui lòng chọn Nhà xe.`);
            hasError = true;
            return;
        }
        if (count < 1) {
            showToast('danger', `Dòng #${i + 1}: Số container phân bổ phải lớn hơn 0.`);
            hasError = true;
            return;
        }

        newAllocations.push({ subcontractor_id: Number(subId), allocated_containers: count, note, send_email: sendEmail });
    });

    if (hasError) return;

    const bookingId = mdoCurrentBooking.id;

    // Nếu không có dòng phân bổ mới cần tạo (ví dụ đã chia đủ từ trước)
    if (newAllocations.length === 0) {
        showToast('success', 'Lệnh điều động đã được xác nhận phát hành thành công cho các Nhà xe đối tác!', 'Phát Lệnh Thành Công');
        try {
            const allocRes = await fetchWithAuth(`/api/bookings/${bookingId}/vendor-allocations/`);
            if (allocRes.ok) {
                const allocJson = await allocRes.json();
                const allocData = allocJson.data || {};
                const existingAllocs = allocData.allocations || [];
                mdoCurrentAllocations = existingAllocs;
                mdoRenderPrintVendorMenu();
                if (existingAllocs.length > 0) {
                    const generatedLinks = existingAllocs.map(a => {
                        const link = a.vendor_link || `${window.location.origin}/vendor/${a.token || ''}/`;
                        const subName = escapeHtml(a.subcontractor || 'Nhà xe');
                        return `
                            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 flex-wrap">
                                <div>
                                    <span class="font-bold text-teal-900">${subName}</span> 
                                    <span class="text-slate-500 font-sans text-xs">(${a.allocated_containers} cont):</span>
                                    <a href="${link}" target="_blank" class="text-teal-700 underline font-mono text-xs ml-1 hover:text-teal-900">${link}</a>
                                </div>
                                <div class="flex items-center gap-1.5">
                                    <a href="${link}" target="_blank" class="px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors">
                                        <i class="ph-bold ph-arrow-square-out"></i> Mở Cổng Nhà Xe
                                    </a>
                                    <button type="button" onclick="mdoCopyVendorLink('${link}')" class="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer">
                                        <i class="ph-bold ph-copy"></i> Copy Link
                                    </button>
                                    <button type="button" onclick="printDispatchOrderSlip(mdoCurrentBooking?.id, ${a.subcontractor_id})" class="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer">
                                        <i class="ph-bold ph-printer text-teal-600"></i> In Phiếu
                                    </button>
                                </div>
                            </div>
                        `;
                    });
                    const resultBox = document.getElementById('mdo-result-box');
                    const linksList = document.getElementById('mdo-links-list');
                    if (resultBox && linksList) {
                        resultBox.classList.remove('hidden');
                        linksList.innerHTML = generatedLinks.join('');
                    }
                }
            }
        } catch (e) {
            console.warn(e);
        }
        if (typeof loadDispatchOrdersTab === 'function') loadDispatchOrdersTab();
        return;
    }

    const btns = [document.getElementById('mdo-btn-submit'), document.getElementById('mdo-btn-submit-top')];
    btns.forEach(b => { if (b) b.disabled = true; });

    try {
        const generatedLinks = [];
        let successCount = 0;

        for (const alloc of newAllocations) {
            const res = await fetchWithAuth(`/api/bookings/${bookingId}/vendor-allocations/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(alloc)
            });
            const out = await res.json();
            if (res.ok && out.success) {
                successCount++;
                const link = out.link || (out.data && out.data.vendor_link) || `${window.location.origin}/vendor/token/`;
                const subName = escapeHtml(out.data?.subcontractor || 'Nhà xe');
                const emailMsg = out.email ? (out.email.sent ? ' <span class="text-emerald-600 text-xs">[Đã gửi email]</span>' : ` <span class="text-amber-600 text-xs">[Email: ${out.email.message}]</span>`) : '';
                generatedLinks.push(`
                    <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 flex-wrap">
                        <div>
                            <span class="font-bold text-teal-900">${subName}</span> 
                            <span class="text-slate-500 font-sans text-xs">(${alloc.allocated_containers} cont):</span>
                            <a href="${link}" target="_blank" class="text-teal-700 underline font-mono text-xs ml-1 hover:text-teal-900">${link}</a>
                            ${emailMsg}
                        </div>
                        <div class="flex items-center gap-1.5">
                            <a href="${link}" target="_blank" class="px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors">
                                <i class="ph-bold ph-arrow-square-out"></i> Mở Cổng Nhà Xe
                            </a>
                            <button type="button" onclick="mdoCopyVendorLink('${link}')" class="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer">
                                <i class="ph-bold ph-copy"></i> Copy Link
                            </button>
                            <button type="button" onclick="printDispatchOrderSlip(mdoCurrentBooking?.id, ${alloc.subcontractor_id})" class="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer">
                                <i class="ph-bold ph-printer text-teal-600"></i> In Phiếu
                            </button>
                        </div>
                    </div>
                `);
            } else {
                showToast('danger', out.message || 'Lỗi khi chia cont.');
            }
        }

        if (successCount > 0) {
            showToast('success', `Đã phát lệnh điều động thành công cho ${successCount} nhà xe!`, 'Phát Lệnh Thành Công');
            const resultBox = document.getElementById('mdo-result-box');
            const linksList = document.getElementById('mdo-links-list');
            if (resultBox && linksList) {
                resultBox.classList.remove('hidden');
                linksList.innerHTML = generatedLinks.join('');
            }
            if (typeof loadTripsData === 'function') loadTripsData();
            if (typeof loadDispatchOrdersTab === 'function') loadDispatchOrdersTab();
            await onDispatchOrderBookingChanged(bookingId);
        }
    } catch (e) {
        showToast('danger', 'Lỗi kết nối khi phát lệnh: ' + e.message);
    } finally {
        btns.forEach(b => { if (b) b.disabled = false; });
    }
}



function mdoDownloadExcelTemplate() {

    window.open('/api/vendor-allocations/template/excel/', '_blank');

}



function mdoUploadExcel(file) {

    if (!file) return;

    showToast('info', `Đang đọc file Excel: ${file.name}...`);

    // Upload Excel xử lý phân bổ

}



window.openDispatchOrderModal = openDispatchOrderModal;

window.closeDispatchOrderModal = closeDispatchOrderModal;

window.onDispatchOrderBookingChanged = onDispatchOrderBookingChanged;

window.mdoAddAllocationRow = mdoAddAllocationRow;

window.mdoRecalcAllocations = mdoRecalcAllocations;

window.submitDispatchOrderAllocation = submitDispatchOrderAllocation;

window.mdoDownloadExcelTemplate = mdoDownloadExcelTemplate;

window.mdoUploadExcel = mdoUploadExcel;





// -------------------------------------------------------------

// Quản lý Tabs & Danh Sách Lệnh Điều Động Theo B/L (GSS TMS)

// -------------------------------------------------------------

var currentDispatchTab = 'orders';
var currentOrderGroup = 'ALL';
var allDispatchBookings = [];
var loadedVcContainers = [];
var vcSearchTimeout = null;

function switchDispatchViewTab(tab) {
    currentDispatchTab = tab;
    const btnOrders = document.getElementById('btn-dispatch-tab-orders');
    const btnVc = document.getElementById('btn-dispatch-tab-vendor-containers');
    const btnTrips = document.getElementById('btn-dispatch-tab-trips');

    const ordersView = document.getElementById('dispatch-orders-view');
    const vcView = document.getElementById('dispatch-vendor-containers-view');
    const tripsView = document.getElementById('dispatch-trips-view');

    const activeCls = 'flex-1 md:flex-initial h-10 px-4 rounded-xl text-xs md:text-sm font-bold font-heading flex items-center justify-center space-x-2 transition-all cursor-pointer border-2 border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-2xs box-border';
    const inactiveCls = 'flex-1 md:flex-initial h-10 px-4 rounded-xl text-xs md:text-sm font-bold font-heading flex items-center justify-center space-x-2 transition-all cursor-pointer border-2 border-transparent bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-200 box-border';

    // Reset buttons & icons
    if (btnOrders) {
        btnOrders.className = inactiveCls;
        const ic = btnOrders.querySelector('i');
        if (ic) ic.className = 'ph-bold ph-newspaper text-base text-slate-500';
    }
    if (btnVc) {
        btnVc.className = inactiveCls;
        const ic = btnVc.querySelector('i');
        if (ic) ic.className = 'ph-bold ph-stack text-base text-slate-500';
    }
    if (btnTrips) {
        btnTrips.className = inactiveCls;
        const ic = btnTrips.querySelector('i');
        if (ic) ic.className = 'ph-bold ph-navigation-arrow text-base text-slate-500';
    }

    // Reset views
    if (ordersView) { ordersView.classList.add('hidden'); ordersView.classList.remove('flex'); }
    if (vcView) { vcView.classList.add('hidden'); vcView.classList.remove('flex'); }
    if (tripsView) { tripsView.classList.add('hidden'); tripsView.classList.remove('flex'); }

    if (tab === 'orders') {
        if (btnOrders) {
            btnOrders.className = activeCls;
            const ic = btnOrders.querySelector('i');
            if (ic) ic.className = 'ph-bold ph-newspaper text-base text-indigo-600';
        }
        if (ordersView) { ordersView.classList.remove('hidden'); ordersView.classList.add('flex'); }
        loadDispatchOrdersTab();
    } else if (tab === 'vendor-containers') {
        if (btnVc) {
            btnVc.className = activeCls;
            const ic = btnVc.querySelector('i');
            if (ic) ic.className = 'ph-bold ph-stack text-base text-indigo-600';
        }
        if (vcView) { vcView.classList.remove('hidden'); vcView.classList.add('flex'); }
        loadVendorContainersTab();
    } else {
        if (btnTrips) {
            btnTrips.className = activeCls;
            const ic = btnTrips.querySelector('i');
            if (ic) ic.className = 'ph-bold ph-navigation-arrow text-base text-indigo-600';
        }
        if (tripsView) { tripsView.classList.remove('hidden'); tripsView.classList.add('flex'); }
        if (typeof loadTripsData === 'function') loadTripsData();
    }
}

function filterOrderGroup(group) {
    currentOrderGroup = group || 'ALL';
    const btnAll = document.getElementById('filter-order-mode-all');
    const btnPending = document.getElementById('filter-order-mode-pending');
    const btnDispatched = document.getElementById('filter-order-mode-dispatched');

    const activePill = 'px-2.5 py-1 rounded-md bg-white text-teal-900 shadow-2xs font-bold transition-all cursor-pointer';
    const inactivePill = 'px-2.5 py-1 rounded-md text-slate-600 hover:text-slate-900 font-semibold transition-all cursor-pointer';

    if (btnAll) btnAll.className = (group === 'ALL') ? activePill : inactivePill;
    if (btnPending) btnPending.className = (group === 'PENDING') ? activePill + ' flex items-center gap-1' : inactivePill + ' flex items-center gap-1';
    if (btnDispatched) btnDispatched.className = (group === 'DISPATCHED') ? activePill + ' flex items-center gap-1' : inactivePill + ' flex items-center gap-1';

    renderDispatchOrdersTable();
}

function renderDispatchOrdersTable() {
    const tbody = document.getElementById('dispatch-orders-tbody');
    if (!tbody) return;

    let filtered = allDispatchBookings || [];
    if (currentOrderGroup === 'PENDING') {
        filtered = filtered.filter(b => !Boolean(b.is_fully_dispatched || (Number(b.allocated_containers || 0) >= (Number(b.total_containers) || 1)) || ((Number(b.dispatched_containers) || 0) >= (Number(b.total_containers) || 1))));
    } else if (currentOrderGroup === 'DISPATCHED') {
        filtered = filtered.filter(b => Boolean(b.is_fully_dispatched || (Number(b.allocated_containers || 0) >= (Number(b.total_containers) || 1)) || ((Number(b.dispatched_containers) || 0) >= (Number(b.total_containers) || 1))));
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="p-8 text-center text-slate-400 font-medium">Không tìm thấy Lệnh Điều Động / Booking nào phù hợp với bộ lọc hiện tại.</td></tr>`;
        return;
    }

    let html = '';
    filtered.forEach((b, idx) => {
        const rawCode = b.booking_code || `BK#${b.id}`;
        const total = Number(b.total_containers) || 1;
        const dispatched = Number(b.dispatched_containers) || 0;
        const remaining = total - dispatched;
        const isDispatched = Boolean(b.is_fully_dispatched || (Number(b.allocated_containers || 0) >= total) || (dispatched >= total));

        // Chuẩn hóa mã phiếu: Đã điều độ thì LDD.BK..., chưa điều độ thì BK...
        const codeDisplay = isDispatched 
            ? (rawCode.startsWith("LDD.") ? rawCode : `LDD.${rawCode}`) 
            : rawCode;

        const codeBadge = isDispatched 
            ? `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono">ĐÃ ĐIỀU ĐỘ</span>`
            : `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold font-mono">CHỜ ĐIỀU ĐỘ</span>`;

        const bl = b.booking_number ? `<span class="text-slate-500 font-mono text-[11px] block">B/L: ${b.booking_number}</span>` : '';
        const cust = b.customer_name || b.customer || 'Khách hàng';
        const route = `<div class="truncate max-w-xs" title="${b.pickup_location || ''} -> ${b.delivery_location || ''} -> ${b.dropoff_location || ''}">${b.pickup_location || 'Cảng/Depot'} &rarr; ${b.delivery_location || 'Kho khách'} &rarr; ${b.dropoff_location || 'Depot'}</div>`;
        const conts = `<strong class="text-teal-700 font-bold">${total}</strong> <span class="text-slate-500 text-[11px]">Cont (${b.container_size || '40HC'})</span>`;

        let allocProgress = '';
        if (isDispatched) {
            allocProgress = `<span class="text-emerald-700 font-bold flex items-center gap-1"><i class="ph-bold ph-check-circle"></i> Đã chia ${dispatched}/${total} cont</span>`;
        } else if (dispatched > 0) {
            allocProgress = `<span class="text-amber-700 font-bold flex items-center gap-1"><i class="ph-bold ph-arrows-split"></i> Đã chia ${dispatched}/${total} (Còn ${remaining})</span>`;
        } else {
            allocProgress = `<span class="text-rose-700 font-bold flex items-center gap-1"><i class="ph-bold ph-clock"></i> Chưa phân bổ (${total} cont)</span>`;
        }

        const demDet = `<span class="text-slate-600 block text-[11px]">DEM: ${b.free_time_demurrage || 7}d | DET: ${b.free_time_detention || 7}d</span>`;

        let statusText = isDispatched ? 'Đã phát lệnh' : 'Chờ điều phối';
        let statusColor = isDispatched ? 'text-emerald-700' : 'text-amber-700';
        let statusIcon = isDispatched ? 'ph-check-circle' : 'ph-clock';

        html += `
        <tr class="hover:bg-teal-50/40 transition-colors">
            <td class="p-2.5 text-center text-slate-400 font-mono text-[11px]">${idx + 1}</td>
            <td class="p-2.5">
                <div class="flex items-center gap-1.5 flex-wrap">
                    <strong class="text-teal-950 font-bold font-mono text-xs">${codeDisplay}</strong>
                    ${codeBadge}
                </div>
                ${bl}
            </td>
            <td class="p-2.5 font-bold text-slate-800">${cust}</td>
            <td class="p-2.5 text-slate-700 text-xs">${route}</td>
            <td class="p-2.5 text-center">${conts}</td>
            <td class="p-2.5">${allocProgress}</td>
            <td class="p-2.5 text-center">${demDet}</td>
            <td class="p-2.5 text-center">
                <span class="inline-flex items-center gap-1 text-xs font-bold ${statusColor}">
                    <i class="ph-bold ${statusIcon}"></i>
                    <span>${statusText}</span>
                </span>
            </td>
            <td class="p-2.5 text-center">
                <div class="inline-flex items-center gap-1.5 justify-center">
                    <button type="button" onclick="openDispatchOrderPage(${b.id})" 
                        class="px-2.5 py-1 bg-transparent hover:bg-teal-600 text-teal-700 hover:text-white border border-teal-600 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                        title="Xem chi tiết, lập lệnh & điều phối container cho nhà xe">
                        <i class="ph-bold ph-eye"></i>
                        <span>Xem</span>
                    </button>
                    <button type="button" onclick="printDispatchOrderSlip(${b.id})" 
                        class="px-2.5 py-1 bg-transparent hover:bg-slate-700 text-slate-700 hover:text-white border border-slate-600 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                        title="In Phiếu Lệnh Điều Vận">
                        <i class="ph-bold ph-printer"></i>
                        <span>In</span>
                    </button>
                </div>
            </td>
        </tr>`;
    });

    tbody.innerHTML = html;
}

async function loadDispatchOrdersTab() {
    const tbody = document.getElementById('dispatch-orders-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="9" class="p-6 text-center text-slate-400">Đang tải danh sách Kế Hoạch Điều Độ...</td></tr>';

    try {
        const res = await fetchWithAuth('/api/bookings/active/');
        if (!res.ok) throw new Error('Không thể tải danh sách Lệnh Điều Động');
        const data = await res.json();
        allDispatchBookings = data.data || data.results || data || [];

        // Thống kê phân nhóm
        const totalCount = allDispatchBookings.length;
        const pendingCount = allDispatchBookings.filter(b => !Boolean(b.is_fully_dispatched || (Number(b.allocated_containers || 0) >= (Number(b.total_containers) || 1)) || ((Number(b.dispatched_containers) || 0) >= (Number(b.total_containers) || 1)))).length;
        const dispatchedCount = allDispatchBookings.filter(b => Boolean(b.is_fully_dispatched || (Number(b.allocated_containers || 0) >= (Number(b.total_containers) || 1)) || ((Number(b.dispatched_containers) || 0) >= (Number(b.total_containers) || 1)))).length;

        const elAll = document.getElementById('count-orders-all');
        const elPending = document.getElementById('count-orders-pending');
        const elDispatched = document.getElementById('count-orders-dispatched');
        const elTabBadge = document.getElementById('tab-orders-badge');

        if (elAll) elAll.innerText = totalCount;
        if (elPending) elPending.innerText = pendingCount;
        if (elDispatched) elDispatched.innerText = dispatchedCount;
        if (elTabBadge) elTabBadge.innerText = totalCount;

        renderDispatchOrdersTable();
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="9" class="p-6 text-center text-rose-500 font-bold">Lỗi khi tải Lệnh Điều Động: ${e.message}</td></tr>`;
    }
}

// -------------------------------------------------------------
// TAB 2: VENDOR PHÂN BỔ & GÁN XE (THEO TỪNG CONTAINER)
// -------------------------------------------------------------
async function loadVendorContainersTab() {
    const tbody = document.getElementById('dispatch-vendor-containers-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="10" class="p-6 text-center text-slate-400">Đang tải danh sách Container & Tiến độ Vendor...</td></tr>';

    const vendorSel = document.getElementById('filter-vc-vendor');
    const statusSel = document.getElementById('filter-vc-status');
    const searchInp = document.getElementById('filter-vc-search');

    const vId = vendorSel ? vendorSel.value : '';
    const stVal = statusSel ? statusSel.value : 'ALL';
    const qVal = searchInp ? searchInp.value.trim() : '';

    let url = '/api/dispatch/vendor-containers/?';
    if (vId) url += `vendor_id=${encodeURIComponent(vId)}&`;
    if (stVal && stVal !== 'ALL') url += `status=${encodeURIComponent(stVal)}&`;
    if (qVal) url += `q=${encodeURIComponent(qVal)}&`;

    try {
        const res = await fetchWithAuth(url);
        if (!res.ok) throw new Error('Không thể tải dữ liệu Container');
        const resData = await res.json();
        const rows = resData.data || [];
        const stats = resData.stats || {};
        loadedVcContainers = rows;

        // Cập nhật thanh KPI Mini
        const elTotal = document.getElementById('vc-stat-total');
        const elUnassigned = document.getElementById('vc-stat-unassigned');
        const elWaiting = document.getElementById('vc-stat-waiting');
        const elAssigned = document.getElementById('vc-stat-assigned');
        const elInTransit = document.getElementById('vc-stat-intransit');
        const elCompleted = document.getElementById('vc-stat-completed');
        const elTabVcBadge = document.getElementById('tab-vc-badge');

        if (elTotal) elTotal.innerText = stats.total || 0;
        if (elUnassigned) elUnassigned.innerText = stats.unassigned || 0;
        if (elWaiting) elWaiting.innerText = stats.waiting_vehicle || 0;
        if (elAssigned) elAssigned.innerText = stats.assigned || 0;
        if (elInTransit) elInTransit.innerText = stats.in_transit || 0;
        if (elCompleted) elCompleted.innerText = stats.completed || 0;
        if (elTabVcBadge) elTabVcBadge.innerText = stats.total || 0;

        // Cập nhật Dropdown Nhà xe nếu chưa có
        if (vendorSel && vendorSel.options.length <= 1) {
            const vendorMap = new Map();
            rows.forEach(r => {
                if (r.vendor_id && !vendorMap.has(r.vendor_id)) {
                    vendorMap.set(r.vendor_id, r.vendor_short || r.vendor_name);
                }
            });
            vendorMap.forEach((vName, vIdVal) => {
                const opt = document.createElement('option');
                opt.value = vIdVal;
                opt.innerText = vName;
                vendorSel.appendChild(opt);
            });
        }

        if (rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="p-8 text-center text-slate-400 font-medium">Không tìm thấy Container nào phù hợp với bộ lọc.</td></tr>';
            return;
        }

        let html = '';
        rows.forEach((r, idx) => {
            const contDisplay = `
                <div>
                    <strong class="font-mono text-slate-900 font-bold text-xs select-all">${r.container_number}</strong>
                    <div class="text-[11px] text-slate-500 font-mono mt-0.5">
                        <span class="font-bold text-teal-800 bg-teal-50 px-1 py-0.2 rounded border border-teal-200">${r.container_type}</span>
                        ${r.seal_number && r.seal_number !== '--' ? `<span>· Seal: ${r.seal_number}</span>` : ''}
                        ${r.gross_weight_kg ? `<span>· ${(r.gross_weight_kg / 1000).toFixed(1)}T</span>` : ''}
                    </div>
                </div>
            `;

            const lddDisplay = `
                <div>
                    <span class="font-mono text-xs font-bold text-teal-950">${r.dispatch_order_code}</span>
                    <div class="text-xs text-slate-700 font-semibold truncate max-w-[180px]" title="${r.customer_name}">${r.customer_name}</div>
                    <div class="text-[11px] text-slate-500 truncate max-w-[180px]" title="${r.pickup_location} -> ${r.delivery_location} -> ${r.dropoff_location}">
                        ${r.pickup_location} &rarr; ${r.delivery_location}
                    </div>
                </div>
            `;

            let vendorDisplay = '';
            if (r.vendor_id) {
                vendorDisplay = `
                    <div>
                        <span class="px-2 py-0.5 rounded-md bg-teal-50 text-teal-900 border border-teal-200 font-bold text-xs inline-flex items-center gap-1">
                            <i class="ph-bold ph-buildings"></i> ${r.vendor_short || r.vendor_name}
                        </span>
                        <div class="text-[11px] text-slate-400 font-mono mt-0.5">${r.vendor_code ? `Mã: ${r.vendor_code}` : ''}</div>
                    </div>
                `;
            } else {
                vendorDisplay = `
                    <span class="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs inline-flex items-center gap-1">
                        <i class="ph-bold ph-warning-circle"></i> Chưa phân bổ
                    </span>
                `;
            }

            // Phiếu Vận Chuyển (VC)
            let vcDisplay = '';
            if (r.trip_code) {
                vcDisplay = `
                    <div class="text-center">
                        <span class="px-2.5 py-1 rounded-lg bg-teal-100 text-teal-950 font-mono font-bold text-xs border border-teal-300 shadow-2xs inline-block">
                            ${r.trip_code}
                        </span>
                        ${r.step_status_display ? `<div class="text-[10px] text-teal-700 font-semibold mt-0.5">${r.step_status_display}</div>` : ''}
                    </div>
                `;
            } else {
                vcDisplay = `
                    <div class="text-center text-amber-700 font-semibold text-xs flex items-center justify-center gap-1">
                        <i class="ph-bold ph-hourglass-medium text-amber-500"></i>
                        <span>Chưa gán xe</span>
                    </div>
                `;
            }

            // Phương tiện
            let vehicleDisplay = '';
            if (r.tractor_plate && r.tractor_plate !== '--') {
                vehicleDisplay = `
                    <div>
                        <div class="font-bold font-mono text-slate-800 text-xs">${r.tractor_plate}</div>
                        ${r.trailer_plate && r.trailer_plate !== '--' ? `<div class="text-[11px] font-mono text-slate-500">Moóc: ${r.trailer_plate}</div>` : ''}
                    </div>
                `;
            } else {
                vehicleDisplay = `<span class="text-slate-400 italic text-[11px]">Chưa điều xe</span>`;
            }

            // Tài xế
            let driverDisplay = '';
            if (r.driver_name && r.driver_name !== '--') {
                driverDisplay = `
                    <div>
                        <div class="font-bold text-slate-800 text-xs">${r.driver_name}</div>
                        ${r.driver_phone && r.driver_phone !== '--' ? `<a href="tel:${r.driver_phone}" class="text-[11px] font-mono text-teal-700 hover:underline flex items-center gap-1"><i class="ph-bold ph-phone"></i> ${r.driver_phone}</a>` : ''}
                    </div>
                `;
            } else {
                driverDisplay = `<span class="text-slate-400 italic text-[11px]">Chưa gán tài</span>`;
            }

            // Tình trạng vận hành
            let statusBadge = '';
            if (r.status_code === 'UNASSIGNED') {
                statusBadge = `
                    <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center gap-1.5 shadow-2xs">
                        <span class="w-2 h-2 rounded-full bg-rose-600"></span> Chưa giao Nhà xe
                    </span>
                `;
            } else if (r.status_code === 'WAITING_VEHICLE') {
                statusBadge = `
                    <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1.5 shadow-2xs">
                        <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> Chờ Vendor gán xe
                    </span>
                `;
            } else if (r.status_code === 'ASSIGNED') {
                statusBadge = `
                    <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300 inline-flex items-center gap-1.5 shadow-2xs">
                        <span class="w-2 h-2 rounded-full bg-blue-600"></span> Đã gán xe (Chờ chạy)
                    </span>
                `;
            } else if (r.status_code === 'IN_TRANSIT') {
                statusBadge = `
                    <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 inline-flex items-center gap-1.5 shadow-2xs">
                        <span class="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span> Đang trên tuyến
                    </span>
                `;
            } else if (r.status_code === 'EMPTY_RETURNING') {
                statusBadge = `
                    <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300 inline-flex items-center gap-1.5 shadow-2xs">
                        <span class="w-2 h-2 rounded-full bg-purple-600"></span> Đang hạ bãi rỗng
                    </span>
                `;
            } else {
                statusBadge = `
                    <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 inline-flex items-center gap-1.5 shadow-2xs">
                        <i class="ph-bold ph-check-circle text-emerald-600"></i> Đã hoàn thành
                    </span>
                `;
            }

            const freeTime = `
                <div class="text-center text-[11px] text-slate-600">
                    <div>DEM: <strong class="text-slate-800">${r.dem_free_days || 7}d</strong></div>
                    <div>DET: <strong class="text-teal-700">${r.det_free_days || 7}d</strong></div>
                </div>
            `;

            // Thao tác
            let actions = `
                <div class="inline-flex items-center gap-1 justify-center">
                    <button type="button" onclick="openDispatchOrderPage(${r.booking_id})"
                        class="px-2 py-1 bg-white hover:bg-teal-50 text-teal-700 border border-teal-300 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                        title="Xem Lệnh Điều Động / Phân Bổ">
                        <i class="ph-bold ph-eye"></i> <span>Xem</span>
                    </button>
            `;
            if (r.status_code === 'WAITING_VEHICLE') {
                actions += `
                    <button type="button" onclick="remindVendorZalo('${r.vendor_short || r.vendor_name}', '${r.container_number}', '${r.dispatch_order_code}', '${r.portal_token || ''}')"
                        class="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                        title="Gửi nhắc nhở Vendor qua Zalo / Copy thông điệp">
                        <i class="ph-bold ph-chat-teardrop-dots"></i> <span>Nhắc</span>
                    </button>
                `;
            }
            actions += `</div>`;

            html += `
                <tr class="hover:bg-teal-50/30 transition-colors">
                    <td class="p-2.5 text-center text-slate-400 font-mono text-[11px]">${idx + 1}</td>
                    <td class="p-2.5">${contDisplay}</td>
                    <td class="p-2.5">${lddDisplay}</td>
                    <td class="p-2.5">${vendorDisplay}</td>
                    <td class="p-2.5 text-center">${vcDisplay}</td>
                    <td class="p-2.5">${vehicleDisplay}</td>
                    <td class="p-2.5">${driverDisplay}</td>
                    <td class="p-2.5 text-center">${statusBadge}</td>
                    <td class="p-2.5 text-center">${freeTime}</td>
                    <td class="p-2.5 text-center">${actions}</td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="10" class="p-6 text-center text-rose-500 font-bold">Lỗi khi tải danh sách Container: ${e.message}</td></tr>`;
    }
}

function quickFilterVcStatus(st) {
    const statusSel = document.getElementById('filter-vc-status');
    if (statusSel) statusSel.value = st;
    loadVendorContainersTab();
}

function debounceVendorContainersSearch() {
    clearTimeout(vcSearchTimeout);
    const searchInp = document.getElementById('filter-vc-search');
    const clearBtn = document.getElementById('btn-clear-vc-search');
    if (clearBtn && searchInp) {
        if (searchInp.value.trim()) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
    }
    vcSearchTimeout = setTimeout(() => {
        loadVendorContainersTab();
    }, 300);
}

function clearVcSearch() {
    const searchInp = document.getElementById('filter-vc-search');
    const clearBtn = document.getElementById('btn-clear-vc-search');
    if (searchInp) searchInp.value = '';
    if (clearBtn) clearBtn.classList.add('hidden');
    loadVendorContainersTab();
}

function remindVendorZalo(vendorName, contNumber, lddCode, token) {
    const link = token ? `${window.location.origin}/vendor/${token}/` : `${window.location.origin}/vendor/`;
    const msg = `[GSS TMS] Kính gửi Quý Nhà Xe ${vendorName},\nLô hàng ${lddCode} có container ${contNumber} hiện đang CHỜ ĐIỀU XE.\nKính nhờ Quý Nhà Xe truy cập Cổng Khai Báo gán Đầu kéo & Tài xế để kịp tiến độ lấy cont:\n👉 ${link}\nXin cảm ơn!`;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(msg.replace(/\\n/g, '\n'));
        if (typeof showToast === 'function') {
            showToast('success', `Đã sao chép nội dung nhắc nhở ${vendorName} vào bộ nhớ tạm để gửi Zalo!`);
        } else {
            alert(`Đã sao chép nội dung gửi Zalo cho ${vendorName}:\n\n` + msg.replace(/\\n/g, '\n'));
        }
    } else {
        alert(msg.replace(/\\n/g, '\n'));
    }
}

window.switchDispatchViewTab = switchDispatchViewTab;
window.filterOrderGroup = filterOrderGroup;
window.loadDispatchOrdersTab = loadDispatchOrdersTab;
window.loadVendorContainersTab = loadVendorContainersTab;
window.quickFilterVcStatus = quickFilterVcStatus;
window.debounceVendorContainersSearch = debounceVendorContainersSearch;
window.clearVcSearch = clearVcSearch;
window.remindVendorZalo = remindVendorZalo;



let mdoLoadedContainers = [];
let mdoSelectedContIds = new Set();

function toggleMdoFullscreen() {
    const dialog = document.getElementById('modal-dispatch-order-dialog');
    const icon = document.getElementById('icon-mdo-fullscreen');
    if (!dialog) return;
    const isFull = dialog.classList.contains('mdo-fullscreen');
    if (isFull) {
        dialog.classList.remove('mdo-fullscreen', 'fixed', 'inset-0', 'w-screen', 'h-screen', 'rounded-none', 'z-[60]');
        dialog.classList.add('w-full', 'max-w-[97vw]', 'h-[95vh]', 'rounded-2xl');
        if (icon) icon.className = 'ph-bold ph-corners-out text-base';
    } else {
        dialog.classList.remove('w-full', 'max-w-[97vw]', 'h-[95vh]', 'rounded-2xl');
        dialog.classList.add('mdo-fullscreen', 'fixed', 'inset-0', 'w-screen', 'h-screen', 'rounded-none', 'z-[60]');
        if (icon) icon.className = 'ph-bold ph-corners-in text-base';
    }
}
window.toggleMdoFullscreen = toggleMdoFullscreen;

async function loadMdoContainers(bookingId) {
    const tbody = document.getElementById('mdo-containers-tbody');
    const badge = document.getElementById('mdo-containers-count-badge');
    const bulkSelect = document.getElementById('mdo-bulk-vendor-select');
    if (!tbody) return;

    if (bulkSelect) {
        let optHtml = '<option value="">-- Chọn Nhà xe phụ trách --</option>';
        mdoSubcontractors.forEach(s => {
            optHtml += `<option value="${s.id}">${escapeHtml(s.short_name || s.name)}</option>`;
        });
        bulkSelect.innerHTML = optHtml;
    }

    tbody.innerHTML = '<tr><td colspan="12" class="p-4 text-center text-slate-400">Đang tải danh sách container...</td></tr>';
    mdoSelectedContIds.clear();
    mdoUpdateSelectedBadge();

    try {
        const res = await fetchWithAuth(`/api/gss/bookings/${bookingId}/containers/`);
        if (!res.ok) throw new Error('Không thể tải container');
        const json = await res.json();

        let conts = [];
        if (Array.isArray(json)) {
            conts = json;
        } else if (json && typeof json === 'object') {
            const d = json.data !== undefined ? json.data : json;
            if (Array.isArray(d)) {
                conts = d;
            } else if (d && typeof d === 'object') {
                if (Array.isArray(d.containers)) conts = d.containers;
                else if (Array.isArray(d.results)) conts = d.results;
                else if (Array.isArray(d.items)) conts = d.items;
            }
        }
        if (!Array.isArray(conts)) conts = [];
        mdoLoadedContainers = conts;

        mdoFilterContainers();

    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="12" class="p-4 text-center text-rose-500 font-bold">Lỗi tải container: ${e.message}</td></tr>`;
    }
}

function mdoGetContainerStatusInfo(c) {
    const subName = c.vendor || c.subcontractor_name || (c.subcontractor ? (c.subcontractor.short_name || c.subcontractor.name) : '');
    const hasVendor = !!(c.vendor || c.vendor_id || c.subcontractor_id || c.allocation_id || subName);
    const step = (c.step_status || '').toUpperCase();
    const rawStepLabel = (c.step_label || '').trim();
    const hasPlate = !!(c.tractor_plate || c.assigned_vehicle_plate);

    const STATUS_STYLE = {
        ARRIVED_AT_PICKUP:   { icon: 'ph-map-pin',            cls: 'text-sky-700',     label: 'Đã đến nơi nhận' },
        LOADED_ON_VEHICLE:   { icon: 'ph-package',            cls: 'text-indigo-700',  label: 'Đã lên xe (Nhận cont/hàng)' },
        ARRIVED_AT_DELIVERY: { icon: 'ph-navigation-arrow',   cls: 'text-violet-700',  label: 'Đã đến nơi giao' },
        UNLOADED:            { icon: 'ph-check-square',       cls: 'text-cyan-700',    label: 'Đã hạ xe / Giao xong' },
        RETURNING_EMPTY:     { icon: 'ph-arrow-u-down-left',  cls: 'text-orange-700',  label: 'Đang đi hạ rỗng' },
    };

    if (!hasVendor && !c.trip_code) {
        return {
            code: 'UNASSIGNED',
            hasVendor: false,
            label: 'Chưa phân bổ',
            badgeHtml: '<span class="inline-flex items-center gap-1 text-xs font-medium text-slate-500"><i class="ph-bold ph-clock text-slate-400"></i> Chưa phân bổ</span>'
        };
    }

    if (step === 'CANCELLED') {
        return {
            code: 'CANCELLED',
            hasVendor,
            label: 'Đã hủy',
            badgeHtml: '<span class="inline-flex items-center gap-1 text-xs font-bold text-rose-700"><i class="ph-bold ph-x-circle"></i> Đã hủy</span>'
        };
    }

    if (step === 'EMPTY_RETURNED') {
        return {
            code: 'EMPTY_RETURNED',
            hasVendor,
            label: 'Đã hạ rỗng (Hoàn tất)',
            badgeHtml: '<span class="inline-flex items-center gap-1 text-xs font-bold text-emerald-700"><i class="ph-bold ph-check-circle"></i> Đã hạ rỗng (Hoàn tất)</span>'
        };
    }

    if (STATUS_STYLE[step]) {
        const stCfg = STATUS_STYLE[step];
        const lbl = rawStepLabel || stCfg.label;
        return {
            code: step,
            isInTransit: true,
            hasVendor,
            label: lbl,
            badgeHtml: `<span class="inline-flex items-center gap-1 text-xs font-bold ${stCfg.cls}"><i class="ph-bold ${stCfg.icon}"></i> ${escapeHtml(lbl)}</span>`
        };
    }

    if (c.trip_code || step === 'READY' || rawStepLabel === 'Sẵn sàng') {
        const lbl = (rawStepLabel && rawStepLabel !== 'Sẵn sàng') ? rawStepLabel : 'Đã Phát lệnh Điều độ';
        return {
            code: 'READY',
            hasVendor,
            label: lbl,
            badgeHtml: `<span class="inline-flex items-center gap-1 text-xs font-bold text-teal-700"><i class="ph-bold ph-file-text"></i> ${escapeHtml(lbl)}</span>`
        };
    }

    return {
        code: 'ASSIGNED',
        hasVendor,
        label: 'Đã giao cho Nhà xe',
        badgeHtml: '<span class="inline-flex items-center gap-1 text-xs font-bold text-amber-700"><i class="ph-bold ph-user-check"></i> Đã giao cho Nhà xe</span>'
    };
}

function mdoFilterContainers() {
    const tbody = document.getElementById('mdo-containers-tbody');
    const countBadge = document.getElementById('mdo-containers-count-badge');
    if (!tbody) return;

    const query = (document.getElementById('mdo-cont-filter-search')?.value || '').trim().toLowerCase();
    const rawFilter = document.getElementById('mdo-cont-filter-status')?.value || 'ALL';
    const filterMap = { WAITING_VEHICLE: 'ASSIGNED', ASSIGNED_VEHICLE: 'ASSIGNED', DISPATCHED: 'READY' };
    const statusFilter = filterMap[rawFilter] || rawFilter;

    let filtered = mdoLoadedContainers.filter(c => {
        const st = mdoGetContainerStatusInfo(c);

        if (statusFilter === 'UNASSIGNED' && st.code !== 'UNASSIGNED') return false;
        if (statusFilter === 'ASSIGNED' && st.code !== 'ASSIGNED') return false;
        if (statusFilter === 'READY' && st.code !== 'READY') return false;
        if (statusFilter === 'IN_TRANSIT' && !st.isInTransit) return false;
        if (['ARRIVED_AT_PICKUP', 'LOADED_ON_VEHICLE', 'ARRIVED_AT_DELIVERY', 'UNLOADED', 'RETURNING_EMPTY', 'EMPTY_RETURNED', 'CANCELLED'].includes(statusFilter)) {
            if (st.code !== statusFilter) return false;
        }

        if (!query) return true;
        const text = [
            c.container_number,
            c.seal_number,
            c.vendor,
            c.vendor_code,
            c.subcontractor_name,
            c.tractor_plate,
            c.driver_name,
            c.delivery_address,
            c.container_type,
            c.trip_code,
            st.label
        ].filter(Boolean).join(' ').toLowerCase();
        return text.includes(query);
    });

    if (countBadge) {
        countBadge.innerText = `Hiển thị: ${filtered.length} / ${mdoLoadedContainers.length} container`;
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" class="p-6 text-center text-slate-400 font-medium">Không tìm thấy container nào phù hợp bộ lọc.</td></tr>';
        return;
    }

    const b = mdoCurrentBooking || {};
    let html = '';

    filtered.forEach((c, idx) => {
        const isChecked = mdoSelectedContIds.has(String(c.id));
        const subName = c.vendor || c.subcontractor_name || (c.subcontractor ? (c.subcontractor.short_name || c.subcontractor.name) : '');
        const currentSubId = c.vendor_id || c.subcontractor_id || (c.subcontractor ? c.subcontractor.id : '') || (c.allocation ? c.allocation.subcontractor_id : '');
        const isLocked = ['ARRIVED_AT_PICKUP', 'LOADED_ON_VEHICLE', 'ARRIVED_AT_DELIVERY', 'UNLOADED', 'RETURNING_EMPTY', 'EMPTY_RETURNED'].includes(c.step_status);

        let vendorSelectHtml = '';
        if (isLocked) {
            vendorSelectHtml = `<div class="font-bold text-slate-700 text-xs flex items-center gap-1.5" title="Container đang chạy, đã khóa đổi nhà xe"><i class="ph-bold ph-lock-key text-teal-700"></i> ${escapeHtml(subName || 'Chưa phân bổ')}</div>`;
        } else {
            let subOptions = '<option value="">-- Chưa phân bổ --</option>';
            mdoSubcontractors.forEach(s => {
                const sel = (currentSubId && String(s.id) === String(currentSubId)) || (subName && (s.short_name === subName || s.name === subName)) ? 'selected' : '';
                subOptions += `<option value="${s.id}" ${sel}>${escapeHtml(s.short_name || s.name)}</option>`;
            });
            vendorSelectHtml = `
                <select onchange="mdoChangeSingleContainerVendor(${c.id}, this.value)" 
                    class="w-full h-8 px-2 bg-white hover:bg-teal-50/50 border border-slate-300 hover:border-teal-500 focus:border-teal-600 rounded-lg text-xs font-bold text-teal-900 outline-none transition-colors cursor-pointer"
                    title="Đổi nhà xe trực tiếp cho container này">
                    ${subOptions}
                </select>
            `;
        }

        let actionBtn = '';
        if (currentSubId || subName) {
            if (!isLocked) {
                actionBtn = `
                    <button type="button" onclick="mdoUnassignSingleContainer(${c.id})" 
                        class="px-2 py-1 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-300 rounded-lg text-xs font-bold transition-colors cursor-pointer" 
                        title="Bỏ phân bổ nhà xe cho container này">
                        <i class="ph-bold ph-x text-xs"></i> Bỏ Gán
                    </button>
                `;
            } else {
                actionBtn = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200" title="Chuyến xe đang/đã chạy trên hành trình, không thể bỏ gán"><i class="ph-bold ph-lock-simple text-xs text-slate-500"></i> Đang chạy</span>`;
            }
        } else {
            actionBtn = `<span class="text-slate-400 text-xs italic">--</span>`;
        }

        const driverVehicle = (c.tractor_plate || c.assigned_vehicle_plate || c.driver_name || c.assigned_driver_name)
            ? `<span class="text-teal-900 font-bold font-mono">${escapeHtml(c.tractor_plate || c.assigned_vehicle_plate || '--')}</span> · <span class="text-slate-700 font-medium">${escapeHtml(c.driver_name || c.assigned_driver_name || '--')}</span>`
            : '<span class="text-slate-400 italic">Chờ Vendor gán</span>';

        const statusBadge = mdoGetContainerStatusInfo(c).badgeHtml;

        const vgm = c.gross_weight_kg ? (typeof formatNumberVN === 'function' ? formatNumberVN(c.gross_weight_kg) + ' kg' : c.gross_weight_kg + ' kg') : (c.vgm_weight || '--');
        const deliveryLoc = c.delivery_address || b.delivery_location || '--';
        const dropoffLoc = b.dropoff_location || '--';
        const demDetStr = c.dem_expiry ? (typeof formatDateVN === 'function' ? formatDateVN(c.dem_expiry) : c.dem_expiry) : (b.loading_date ? (typeof formatDateVN === 'function' ? formatDateVN(b.loading_date) : b.loading_date) : '--');

        // Cảnh báo số container sai chuẩn ISO 6346
        const isoWarning = (c.iso_valid === false) ? ' <span class="text-amber-600 text-[10px] font-bold">(Sai ISO)</span>' : '';

        html += `
        <tr class="hover:bg-teal-50/30 transition-colors ${isChecked ? 'bg-teal-50/50' : ''}">
            <td class="p-2.5 text-center">
                <input type="checkbox" class="mdo-cont-cb rounded text-teal-600 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed" value="${c.id}" ${isChecked ? 'checked' : ''} ${isLocked ? 'disabled title="Container đang chạy trên đường, không thể chọn hàng loạt"' : 'onchange="mdoOnContCheckChange(this)"'}>
            </td>
            <td class="p-2.5 text-center text-slate-400 font-mono text-[11px]">${idx + 1}</td>
            <td class="p-2.5 font-bold font-mono text-teal-950">
                ${escapeHtml(c.container_number || '--')}${isoWarning}
            </td>
            <td class="p-2.5 text-center font-bold text-slate-700">${escapeHtml(c.container_type || b.container_size || '40HC')}</td>
            <td class="p-2.5 font-mono text-slate-700">${escapeHtml(c.seal_number || '--')}</td>
            <td class="p-2.5 text-center text-slate-700 font-mono">${vgm}</td>
            <td class="p-2.5 text-slate-700 truncate max-w-[160px]" title="${escapeHtml(deliveryLoc)}">${escapeHtml(deliveryLoc)}</td>
            <td class="p-2.5 text-slate-700 truncate max-w-[160px]" title="${escapeHtml(dropoffLoc)}">${escapeHtml(dropoffLoc)}</td>
            <td class="p-2.5 text-center font-mono text-slate-700">${demDetStr}</td>
            <td class="p-2.5 min-w-[160px]">${vendorSelectHtml}</td>
            <td class="p-2.5 text-xs">${driverVehicle}</td>
            <td class="p-2.5 text-center">${statusBadge}</td>
            <td class="p-2.5 text-center">${actionBtn}</td>
        </tr>`;
    });

    tbody.innerHTML = html;
}
window.mdoFilterContainers = mdoFilterContainers;

function mdoUpdateSelectedBadge() {
    const el = document.getElementById('mdo-cont-selected-count');
    if (el) el.innerText = `Đã chọn: ${mdoSelectedContIds.size} cont`;
}

function mdoToggleSelectAllConts(master) {
    const cbs = document.querySelectorAll('.mdo-cont-cb:not(:disabled)');
    cbs.forEach(cb => {
        cb.checked = master.checked;
        if (master.checked) mdoSelectedContIds.add(String(cb.value));
        else mdoSelectedContIds.delete(String(cb.value));
    });
    mdoUpdateSelectedBadge();
}

function mdoOnContCheckChange(cb) {
    if (cb.checked) mdoSelectedContIds.add(String(cb.value));
    else mdoSelectedContIds.delete(String(cb.value));
    mdoUpdateSelectedBadge();

    const master = document.getElementById('mdo-select-all-conts');
    if (master) {
        const cbs = document.querySelectorAll('.mdo-cont-cb');
        master.checked = cbs.length > 0 && Array.from(cbs).every(c => c.checked);
    }
}

async function mdoAssignBulkContainers() {
    if (!mdoCurrentBooking) {
        showToast('warning', 'Vui lòng chọn Booking trước!');
        return;
    }
    const vendorId = document.getElementById('mdo-bulk-vendor-select')?.value;
    if (!vendorId) {
        showToast('warning', 'Vui lòng chọn Nhà xe (Vendor) cần gán!');
        return;
    }
    const ids = Array.from(mdoSelectedContIds).filter(id => {
        const c = mdoLoadedContainers.find(x => String(x.id) === String(id));
        return !(c && ['ARRIVED_AT_PICKUP', 'LOADED_ON_VEHICLE', 'ARRIVED_AT_DELIVERY', 'UNLOADED', 'RETURNING_EMPTY', 'EMPTY_RETURNED'].includes(c.step_status));
    });
    if (ids.length === 0) {
        showToast('warning', 'Các container đã chọn đang trong quá trình chạy thực tế hoặc chưa chọn container nào khả dụng!');
        return;
    }

    try {
        const res = await fetchWithAuth(`/api/gss/bookings/${mdoCurrentBooking.id}/containers/assign/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                container_ids: ids,
                subcontractor_id: vendorId
            })
        });
        const out = await res.json();
        if (res.ok && out.success) {
            showToast('success', `Đã giao thành công ${out.assigned_count || ids.length} cont cho Nhà xe!`);
            await loadMdoContainers(mdoCurrentBooking.id);
            await onDispatchOrderBookingChanged(mdoCurrentBooking.id);
            if (typeof loadDispatchOrdersTab === 'function') loadDispatchOrdersTab();
        } else {
            showToast('danger', out.message || 'Lỗi khi gán container cho Nhà xe.');
        }
    } catch (e) {
        showToast('danger', 'Lỗi kết nối: ' + e.message);
    }
}

async function mdoUnassignBulkContainers() {
    if (!mdoCurrentBooking) {
        showToast('warning', 'Vui lòng chọn Booking trước!');
        return;
    }
    const ids = Array.from(mdoSelectedContIds).filter(id => {
        const c = mdoLoadedContainers.find(x => String(x.id) === String(id));
        return !(c && ['ARRIVED_AT_PICKUP', 'LOADED_ON_VEHICLE', 'ARRIVED_AT_DELIVERY', 'UNLOADED', 'RETURNING_EMPTY', 'EMPTY_RETURNED'].includes(c.step_status));
    });
    if (ids.length === 0) {
        showToast('warning', 'Các container đã chọn đang chạy trên đường, không thể bỏ phân bổ!');
        return;
    }

    try {
        const res = await fetchWithAuth(`/api/gss/bookings/${mdoCurrentBooking.id}/containers/assign/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                container_ids: ids,
                subcontractor_id: ""
            })
        });
        const out = await res.json();
        if (res.ok && out.success) {
            showToast('success', `Đã bỏ phân bổ ${ids.length} cont!`);
            await loadMdoContainers(mdoCurrentBooking.id);
            await onDispatchOrderBookingChanged(mdoCurrentBooking.id);
            if (typeof loadDispatchOrdersTab === 'function') loadDispatchOrdersTab();
        } else {
            showToast('danger', out.message || 'Lỗi khi bỏ phân bổ container.');
        }
    } catch (e) {
        showToast('danger', 'Lỗi kết nối: ' + e.message);
    }
}
window.mdoUnassignBulkContainers = mdoUnassignBulkContainers;



window.switchDispatchViewTab = switchDispatchViewTab;

window.loadDispatchOrdersTab = loadDispatchOrdersTab;

window.loadMdoContainers = loadMdoContainers;

window.mdoToggleSelectAllConts = mdoToggleSelectAllConts;

window.mdoOnContCheckChange = mdoOnContCheckChange;

window.mdoAssignBulkContainers = mdoAssignBulkContainers;


function openBookingDetail(bookingId) {
    closeDispatchOrderModal();
    if (typeof viewBookingDetail === 'function') {
        viewBookingDetail(bookingId, true);
    }
}
window.openBookingDetail = openBookingDetail;

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('modal-dispatch-order');
        if (modal && !modal.classList.contains('hidden')) {
            closeDispatchOrderModal();
        }
    }
});


function mdoRenderPrintVendorMenu() {
    const listEl = document.getElementById('mdo-print-vendor-list');
    if (!listEl) return;
    if (!mdoCurrentAllocations || mdoCurrentAllocations.length === 0) {
        listEl.innerHTML = '<div class="px-3.5 py-2 text-xs text-slate-400 italic">Chưa phân bổ cho nhà xe nào</div>';
        return;
    }
    listEl.innerHTML = mdoCurrentAllocations.map(a => `
        <button type="button" onclick="printDispatchOrderSlip(mdoCurrentBooking?.id, ${a.subcontractor_id}); mdoTogglePrintVendorDropdown(false);" 
            class="w-full text-left px-3.5 py-2 hover:bg-teal-50 text-xs font-bold text-slate-700 hover:text-teal-900 flex items-center justify-between transition-colors cursor-pointer">
            <span class="flex items-center gap-1.5"><i class="ph-bold ph-printer text-teal-600"></i> ${escapeHtml(a.subcontractor || 'Nhà xe')}</span>
            <span class="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">${a.allocated_containers} cont</span>
        </button>
    `).join('');
}
window.mdoRenderPrintVendorMenu = mdoRenderPrintVendorMenu;

function mdoTogglePrintVendorDropdown(forceState = null) {
    const menu = document.getElementById('mdo-print-vendor-menu');
    if (!menu) return;
    if (forceState !== null) {
        if (forceState) menu.classList.remove('hidden');
        else menu.classList.add('hidden');
    } else {
        menu.classList.toggle('hidden');
    }
}
window.mdoTogglePrintVendorDropdown = mdoTogglePrintVendorDropdown;

document.addEventListener('click', function(e) {
    if (!e.target.closest('#mdo-print-vendor-wrapper')) {
        mdoTogglePrintVendorDropdown(false);
    }
});

function mdoCopyVendorLink(link) {
    if (!link) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(() => {
            showToast('success', 'Đã sao chép link Cổng Nhà Xe vào clipboard để gửi Zalo/SMS!');
        }).catch(() => {
            prompt('Sao chép liên kết Cổng Nhà Xe:', link);
        });
    } else {
        prompt('Sao chép liên kết Cổng Nhà Xe:', link);
    }
}
window.mdoCopyVendorLink = mdoCopyVendorLink;

function printDispatchOrderSlip(bookingId = null, vendorId = null) {
    const bId = bookingId 
        || (typeof mdoCurrentBooking !== 'undefined' && mdoCurrentBooking?.id) 
        || (typeof currentActiveFullpageBooking !== 'undefined' && currentActiveFullpageBooking?.id)
        || document.getElementById('fullpage-booking-id')?.value
        || document.getElementById('mdo-booking-select')?.value;
    if (!bId) {
        showToast('warning', 'Vui lòng chọn hoặc lưu booking trước khi in lệnh.');
        return;
    }
    let url = `/api/gss/bookings/${bId}/dispatch-order/`;
    if (vendorId) {
        url += `?vendor=${encodeURIComponent(vendorId)}`;
    }
    window.open(url, '_blank', 'noopener');
}
window.printDispatchOrderSlip = printDispatchOrderSlip;


async function mdoRevokeCurrentAllocations() {
    if (!mdoCurrentBooking) return;
    if (!mdoCurrentAllocations || mdoCurrentAllocations.length === 0) {
        showToast('info', 'Booking này hiện chưa có phân bổ nào để thu hồi.');
        return;
    }
    if (!confirm('Bạn có chắc chắn muốn thu hồi toàn bộ phân bổ của booking này không? Các link của nhà xe sẽ bị vô hiệu hóa.')) {
        return;
    }
    try {
        let count = 0;
        for (const a of mdoCurrentAllocations) {
            const res = await fetchWithAuth(`/api/vendor-allocations/${a.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'revoke' })
            });
            if (res.ok) count++;
        }
        showToast('success', `Đã thu hồi thành công ${count} phân bổ của Nhà xe!`);
        await onDispatchOrderBookingChanged(mdoCurrentBooking.id);
        if (typeof loadDispatchOrdersTab === 'function') loadDispatchOrdersTab();
    } catch (e) {
        showToast('danger', 'Lỗi khi thu hồi phân bổ: ' + e.message);
    }
}
window.mdoRevokeCurrentAllocations = mdoRevokeCurrentAllocations;

function mdoRenderVendorCards(allocations, totalConts = 0) {
    const container = document.getElementById('mdo-vendor-cards-list');
    if (!container) return;
    if (!allocations || allocations.length === 0) {
        container.innerHTML = `
            <div class="col-span-full p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <i class="ph-bold ph-info text-amber-500 text-base"></i>
                    <span>Chưa có Nhà xe nào được gán cho Lệnh Điều Động này. Hãy tick chọn container bên dưới và gán cho Nhà xe.</span>
                </div>
            </div>
        `;
        mdoUpdateStats(0, totalConts);
        return;
    }

    let allocatedTotal = 0;
    const cardsHtml = allocations.map(a => {
        allocatedTotal += Number(a.allocated_containers) || 0;
        const subName = escapeHtml(a.subcontractor || 'Nhà xe');
        const link = a.vendor_link || `${window.location.origin}/vendor/${a.token || ''}/`;
        const filled = Number(a.filled) || 0;
        const count = Number(a.allocated_containers) || 0;
        const isFilledAll = count > 0 && filled >= count;
        const statusText = isFilledAll 
            ? `<span class="text-emerald-700 font-bold flex items-center gap-1"><i class="ph-bold ph-check-circle"></i> Đã gán đủ (${filled}/${count} xe)</span>`
            : (filled > 0 
                ? `<span class="text-sky-700 font-bold flex items-center gap-1"><i class="ph-bold ph-clock"></i> Đang gán (${filled}/${count} xe)</span>`
                : `<span class="text-amber-700 font-bold flex items-center gap-1"><i class="ph-bold ph-clock"></i> Chờ Nhà xe gán xe (0/${count})</span>`);

        return `
            <div class="p-4 rounded-2xl bg-gradient-to-br from-white to-slate-50/70 border border-teal-200 shadow-2xs hover:shadow-sm transition-all space-y-3">
                <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-2.5">
                        <div class="w-9 h-9 rounded-xl bg-teal-100/70 border border-teal-300 text-teal-800 flex items-center justify-center font-black shrink-0">
                            <i class="ph-bold ph-truck text-lg"></i>
                        </div>
                        <div>
                            <h4 class="font-bold text-slate-900 text-xs font-heading tracking-tight flex items-center gap-1.5">
                                <span>${subName}</span>
                                <span class="text-[11px] font-black text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded-md border border-teal-200">
                                    ${count} Cont
                                </span>
                            </h4>
                            <div class="text-[11px] mt-0.5">${statusText}</div>
                        </div>
                    </div>
                </div>

                <!-- Cụm nút thao tác Cổng Nhà Xe & In Phiếu -->
                <div class="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
                    <a href="${link}" target="_blank" 
                        class="btn-keep-solid inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white text-xs font-bold transition-all shadow-2xs"
                        title="Mở trực tiếp Cổng Nhà Xe trên tab mới">
                        <i class="ph-bold ph-arrow-square-out text-sm text-teal-200"></i>
                        <span>Mở Cổng Nhà Xe</span>
                    </a>
                    <button type="button" onclick="mdoCopyVendorLink('${link}')" 
                        class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                        title="Sao chép link bảo mật để gửi Zalo / SMS cho nhà xe">
                        <i class="ph-bold ph-copy text-slate-500"></i>
                        <span>Copy Link</span>
                    </button>
                    <button type="button" onclick="printDispatchOrderSlip(mdoCurrentBooking?.id, ${a.subcontractor_id})" 
                        class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                        title="In phiếu lệnh riêng cho nhà xe này (không hiện cước)">
                        <i class="ph-bold ph-printer text-teal-700"></i>
                        <span>In Phiếu</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = cardsHtml;
    mdoUpdateStats(allocatedTotal, Math.max(0, totalConts - allocatedTotal));
}
window.mdoRenderVendorCards = mdoRenderVendorCards;

async function mdoReloadAllocationsAndCards(bookingId) {
    const totalConts = mdoCurrentBooking ? (Number(mdoCurrentBooking.total_containers) || 1) : 1;
    try {
        const allocRes = await fetchWithAuth(`/api/bookings/${bookingId}/vendor-allocations/`);
        if (allocRes.ok) {
            const allocJson = await allocRes.json();
            const allocData = allocJson.data || {};
            const existingAllocs = allocData.allocations || [];
            mdoCurrentAllocations = existingAllocs;
            mdoRenderVendorCards(existingAllocs, totalConts);
            mdoRenderPrintVendorMenu();
        } else {
            mdoRenderVendorCards([], totalConts);
        }
    } catch (e) {
        mdoRenderVendorCards([], totalConts);
    }
}
window.mdoReloadAllocationsAndCards = mdoReloadAllocationsAndCards;

async function mdoChangeSingleContainerVendor(containerId, vendorId) {
    if (!mdoCurrentBooking) return;
    const cont = (mdoLoadedContainers || []).find(c => String(c.id) === String(containerId));
    if (cont && ['ARRIVED_AT_PICKUP', 'LOADED_ON_VEHICLE', 'ARRIVED_AT_DELIVERY', 'UNLOADED', 'RETURNING_EMPTY', 'EMPTY_RETURNED'].includes(cont.step_status)) {
        showToast('warning', 'Container đang trong hành trình chạy thực tế, không thể thay đổi nhà xe hoặc bỏ gán!');
        await loadMdoContainers(mdoCurrentBooking.id);
        return;
    }
    if (cont && (cont.step_status === 'READY' || cont.trip_code)) {
        const actionText = vendorId ? 'đổi nhà xe cho' : 'bỏ gán';
        const ok = confirm(`Container ${cont.container_number || ''} đã phát lệnh điều độ. Việc ${actionText} container này sẽ hủy chuyến điều độ tương ứng. Bạn có chắc chắn muốn tiếp tục?`);
        if (!ok) {
            await loadMdoContainers(mdoCurrentBooking.id);
            return;
        }
    }
    try {
        const res = await fetchWithAuth(`/api/gss/bookings/${mdoCurrentBooking.id}/containers/assign/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                container_ids: [containerId],
                subcontractor_id: vendorId || null
            })
        });
        const out = await res.json();
        if (res.ok && out.success) {
            showToast('success', out.message || 'Đã cập nhật nhà xe cho container.');
            await loadMdoContainers(mdoCurrentBooking.id);
            await mdoReloadAllocationsAndCards(mdoCurrentBooking.id);
            if (typeof loadDispatchOrdersTab === 'function') loadDispatchOrdersTab();
        } else {
            showToast('danger', out.message || 'Không thể cập nhật nhà xe.');
            await loadMdoContainers(mdoCurrentBooking.id);
        }
    } catch (e) {
        showToast('danger', 'Lỗi kết nối: ' + e.message);
    }
}
window.mdoChangeSingleContainerVendor = mdoChangeSingleContainerVendor;

function mdoUnassignSingleContainer(containerId) {
    return mdoChangeSingleContainerVendor(containerId, null);
}
window.mdoUnassignSingleContainer = mdoUnassignSingleContainer;

// =========================================================================
// CHẾ ĐỘ TOÀN MÀN HÌNH (FULLSCREEN) CHO BẢNG CONTAINER ĐIỀU ĐỘNG (CHUẨN BOOKING)
// =========================================================================
let isMdoTableFullscreen = false;
window.isMdoTableFullscreen = isMdoTableFullscreen;

function toggleMdoContainersTableExpand() {
    const section = document.getElementById('mdo-containers-section') || document.getElementById('mdo-modal-containers-section');
    const tableWrap = document.getElementById('mdo-containers-table-wrapper') || document.getElementById('mdo-modal-containers-table-wrapper');
    const text = document.getElementById('text-mdo-expand-table') || document.getElementById('text-mdo-modal-expand-table');
    const icon = document.getElementById('icon-mdo-expand-table') || document.getElementById('icon-mdo-modal-expand-table');
    if (!section) return;

    isMdoTableFullscreen = !isMdoTableFullscreen;
    window.isMdoTableFullscreen = isMdoTableFullscreen;

    if (isMdoTableFullscreen) {
        section.classList.add('fixed', 'inset-0', 'z-[80]', 'bg-white', 'p-6', 'overflow-hidden', 'flex', 'flex-col', 'm-0', 'rounded-none', 'shadow-2xl');
        section.style.height = '100vh';
        section.style.maxHeight = '100vh';
        document.body.classList.add('overflow-hidden');
        if (icon) icon.className = 'ph-bold ph-corners-in text-sm text-teal-700';
        if (text) text.innerText = 'Thu Gọn (Esc)';
        if (tableWrap) {
            tableWrap.classList.remove('max-h-[500px]', 'max-h-[460px]', 'max-h-80');
            tableWrap.classList.add('flex-1', 'overflow-y-auto', 'max-h-[calc(100vh-210px)]');
        }
        if (typeof showToast === 'function') {
            showToast('info', 'Đã mở rộng toàn màn hình. Nhấn phím Esc hoặc nút Thu Gọn để trở lại.');
        }
    } else {
        section.classList.remove('fixed', 'inset-0', 'z-[80]', 'z-50', 'bg-white', 'p-6', 'overflow-hidden', 'flex', 'flex-col', 'm-0', 'rounded-none', 'shadow-2xl');
        section.style.height = '';
        section.style.maxHeight = '';
        document.body.classList.remove('overflow-hidden');
        if (icon) icon.className = 'ph-bold ph-corners-out text-sm text-teal-600';
        if (text) text.innerText = 'Toàn Màn Hình';
        if (tableWrap) {
            tableWrap.classList.remove('flex-1', 'max-h-[calc(100vh-210px)]');
            if (section.id === 'mdo-modal-containers-section') {
                tableWrap.classList.add('max-h-80');
            } else {
                tableWrap.classList.add('max-h-[500px]');
            }
        }
    }
}
window.toggleMdoContainersTableExpand = toggleMdoContainersTableExpand;

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && isMdoTableFullscreen) {
        toggleMdoContainersTableExpand();
    }
});
