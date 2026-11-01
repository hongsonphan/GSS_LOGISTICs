let currentSalesSubTab = 'quotations';

function switchSalesSubTab(tabName) {
    currentSalesSubTab = tabName;
    const tabQuotesBtn = document.getElementById('tab-btn-quotations');
    const tabBookingsBtn = document.getElementById('tab-btn-bookings');
    const subtabQuotes = document.getElementById('subtab-sales-quotations');
    const subtabBookings = document.getElementById('subtab-sales-bookings');
    const roleHint = document.getElementById('sales-tab-role-hint');
    const quoteActions = document.getElementById('sales-quote-top-actions');
    const bookingActions = document.getElementById('sales-booking-top-actions');

    const activeQuotesClass = 'flex-1 md:flex-initial h-10 px-4 rounded-xl text-xs md:text-sm font-bold font-heading flex items-center justify-center space-x-2 transition-all cursor-pointer border-2 border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-2xs box-border';
    const activeBookingsClass = 'flex-1 md:flex-initial h-10 px-4 rounded-xl text-xs md:text-sm font-bold font-heading flex items-center justify-center space-x-2 transition-all cursor-pointer border-2 border-teal-600 bg-teal-50/70 text-teal-900 shadow-2xs box-border';
    const inactiveTabClass = 'flex-1 md:flex-initial h-10 px-4 rounded-xl text-xs md:text-sm font-bold font-heading flex items-center justify-center space-x-2 transition-all cursor-pointer border-2 border-transparent bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-200 box-border';

    if (tabName === 'quotations') {
        if (subtabQuotes) subtabQuotes.classList.remove('hidden');
        if (subtabBookings) subtabBookings.classList.add('hidden');
        if (quoteActions) quoteActions.classList.remove('hidden');
        if (bookingActions) bookingActions.classList.add('hidden');

        if (tabQuotesBtn) {
            tabQuotesBtn.className = activeQuotesClass;
            const icon = tabQuotesBtn.querySelector('i');
            if (icon) icon.className = 'ph-bold ph-handshake text-base text-indigo-600';
            const badge = tabQuotesBtn.querySelector('#badge-count-quotes');
            if (badge) badge.className = 'px-2 py-0.5 rounded-full text-[11px] font-black tabular-nums transition-all border bg-indigo-100 text-indigo-800 border-indigo-200';
        }
        if (tabBookingsBtn) {
            tabBookingsBtn.className = inactiveTabClass;
            const icon = tabBookingsBtn.querySelector('i');
            if (icon) icon.className = 'ph-bold ph-truck text-base text-slate-500';
            const badge = tabBookingsBtn.querySelector('#badge-count-bookings');
            if (badge) badge.className = 'px-2 py-0.5 rounded-full text-[11px] font-black tabular-nums transition-all border bg-slate-100 text-slate-600 border-slate-200';
        }
        if (roleHint) {
            roleHint.innerHTML = 'Phân quyền: <strong class="text-indigo-700">Nhân viên Kinh doanh (NVKD)</strong> — Khảo sát tuyến, chào giá, đàm phán hợp đồng';
        }
        if (!rawSalesQuotations || rawSalesQuotations.length === 0) {
            loadSalesData();
        } else {
            if (typeof applyQuoteFilters === 'function') {
                applyQuoteFilters();
            }
            if (window.BimTableColumnManager) {
                window.BimTableColumnManager.apply('sales-quotations-table');
            }
        }
    } else if (tabName === 'bookings') {
        if (subtabQuotes) subtabQuotes.classList.add('hidden');
        if (subtabBookings) subtabBookings.classList.remove('hidden');
        if (quoteActions) quoteActions.classList.add('hidden');
        if (bookingActions) bookingActions.classList.remove('hidden');

        if (tabBookingsBtn) {
            tabBookingsBtn.className = activeBookingsClass;
            const icon = tabBookingsBtn.querySelector('i');
            if (icon) icon.className = 'ph-bold ph-truck text-base text-teal-600';
            const badge = tabBookingsBtn.querySelector('#badge-count-bookings');
            if (badge) badge.className = 'px-2 py-0.5 rounded-full text-[11px] font-black tabular-nums transition-all border bg-teal-100 text-teal-800 border-teal-200';
        }
        if (tabQuotesBtn) {
            tabQuotesBtn.className = inactiveTabClass;
            const icon = tabQuotesBtn.querySelector('i');
            if (icon) icon.className = 'ph-bold ph-handshake text-base text-slate-500';
            const badge = tabQuotesBtn.querySelector('#badge-count-quotes');
            if (badge) badge.className = 'px-2 py-0.5 rounded-full text-[11px] font-black tabular-nums transition-all border bg-slate-100 text-slate-600 border-slate-200';
        }
        if (roleHint) {
            roleHint.innerHTML = 'Phân quyền: <strong class="text-teal-700">Sale Admin / CS (Chăm sóc Khách hàng)</strong> — Booking hãng tàu, kiểm soát SI/CY cut-off, chuyển giao điều xe';
        }
        if (!rawSalesBookings || rawSalesBookings.length === 0) {
            loadSalesData();
        } else {
            if (typeof applyBookingFilters === 'function') {
                applyBookingFilters();
            }
            if (window.BimTableColumnManager) {
                window.BimTableColumnManager.apply('sales-bookings-table');
            }
        }
    }
}

// --- BỘ LỌC TỪNG CỘT & SẮP XẾP BẢNG BOOKINGS (SALE / CS) ---
let rawSalesBookings = [];
let bookingSortColumn = 'loading_date';
let bookingSortDirection = 'asc'; // 'asc' | 'desc'

function populateBookingFilterDropdowns(bookings) {
    if (!bookings || !Array.isArray(bookings)) return;

    // 1. Dropdown Khách hàng
    const custSelect = document.getElementById('filter-bk-customer');
    if (custSelect) {
        const currentVal = custSelect.value || '';
        const customers = [...new Set(bookings.map(b => (b.customer || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
        let html = '<option value="">-- Tất cả Khách hàng --</option>';
        customers.forEach(c => {
            html += `<option value="${escapeHtml(c)}" ${c.toLowerCase() === currentVal.toLowerCase() ? 'selected' : ''}>${escapeHtml(c)}</option>`;
        });
        custSelect.innerHTML = html;
        if (currentVal && customers.some(c => c.toLowerCase() === currentVal.toLowerCase())) {
            custSelect.value = currentVal;
        }
    }

    // 2. Dropdown Hãng tàu
    const shipSelect = document.getElementById('filter-bk-shipping-line');
    if (shipSelect) {
        const currentVal = shipSelect.value || '';
        const shippingLines = [...new Set(bookings.map(b => (b.shipping_line || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
        let html = '<option value="">-- Tất cả Hãng tàu --</option>';
        shippingLines.forEach(s => {
            html += `<option value="${escapeHtml(s)}" ${s.toLowerCase() === currentVal.toLowerCase() ? 'selected' : ''}>${escapeHtml(s)}</option>`;
        });
        shipSelect.innerHTML = html;
        if (currentVal && shippingLines.some(s => s.toLowerCase() === currentVal.toLowerCase())) {
            shipSelect.value = currentVal;
        }
    }

    // 3. Dropdown Loại Cont
    const sizeSelect = document.getElementById('filter-bk-cont-size');
    if (sizeSelect) {
        const currentVal = sizeSelect.value || '';
        const sizes = [...new Set(bookings.map(b => (b.container_size || '').trim()).filter(Boolean))].sort();
        let html = '<option value="">-- Tất cả Loại Cont --</option>';
        sizes.forEach(s => {
            html += `<option value="${escapeHtml(s)}" ${s.toUpperCase() === currentVal.toUpperCase() ? 'selected' : ''}>Cont ${escapeHtml(s)}</option>`;
        });
        sizeSelect.innerHTML = html;
        if (currentVal && sizes.some(s => s.toUpperCase() === currentVal.toUpperCase())) {
            sizeSelect.value = currentVal;
        }
    }
}

function toggleBookingSort(column) {
    if (bookingSortColumn === column) {
        bookingSortDirection = bookingSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        bookingSortColumn = column;
        bookingSortDirection = (column === 'loading_date' || column === 'closing_time') ? 'asc' : 'desc';
    }
    applyBookingFilters();
}

function resetBookingFilters() {
    const cust = document.getElementById('filter-bk-customer');
    if (cust) cust.value = '';
    const ship = document.getElementById('filter-bk-shipping-line');
    if (ship) ship.value = '';
    const size = document.getElementById('filter-bk-cont-size');
    if (size) size.value = '';
    const status = document.getElementById('filter-bk-status');
    if (status) status.value = '';
    const search = document.getElementById('filter-bk-search');
    if (search) search.value = '';
    const clearBtn = document.getElementById('btn-clear-bk-search');
    if (clearBtn) clearBtn.classList.add('hidden');

    bookingSortColumn = 'loading_date';
    bookingSortDirection = 'asc';
    applyBookingFilters();
}

function clearBookingSearch() {
    const search = document.getElementById('filter-bk-search');
    if (search) search.value = '';
    const clearBtn = document.getElementById('btn-clear-bk-search');
    if (clearBtn) clearBtn.classList.add('hidden');
    applyBookingFilters();
}

function applyBookingFilters() {
    if (!rawSalesBookings) rawSalesBookings = [];
    if (!Array.isArray(rawSalesBookings)) rawSalesBookings = [];

    const filterCust = document.getElementById('filter-bk-customer')?.value?.trim().toLowerCase() || '';
    const filterShip = document.getElementById('filter-bk-shipping-line')?.value?.trim().toLowerCase() || '';
    const filterSize = document.getElementById('filter-bk-cont-size')?.value?.trim().toUpperCase() || '';
    const filterStatus = document.getElementById('filter-bk-status')?.value?.trim() || '';
    const filterSearch = document.getElementById('filter-bk-search')?.value?.trim().toLowerCase() || '';

    const clearBtn = document.getElementById('btn-clear-bk-search');
    if (clearBtn) {
        if (filterSearch) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
    }

    // Tiến hành lọc
    let list = rawSalesBookings.filter(b => {
        if (!b) return false;
        if (filterCust && (b.customer || '').trim().toLowerCase() !== filterCust) return false;
        if (filterShip && (b.shipping_line || '').trim().toLowerCase() !== filterShip) return false;
        if (filterSize && (b.container_size || '').trim().toUpperCase() !== filterSize) return false;

        if (filterStatus) {
            if (filterStatus === 'URGENT') {
                if (!b.is_urgent) return false;
            } else if (filterStatus === 'DROP_HOOK') {
                if (!b.has_drop_hook) return false;
            } else if (b.status !== filterStatus) {
                return false;
            }
        }

        if (filterSearch) {
            const combinedText = [
                b.booking_code,
                b.booking_number,
                b.customer,
                b.shipping_line,
                b.vessel_voyage,
                b.pickup,
                b.delivery,
                b.dropoff,
                b.commodity,
                b.vehicles,
                b.trip_codes,
                b.vendors,
                b.drivers
            ].filter(Boolean).join(' ').toLowerCase();

            if (!combinedText.includes(filterSearch)) return false;
        }

        return true;
    });

    // Cập nhật số đếm
    const filteredCountEl = document.getElementById('booking-filtered-count');
    if (filteredCountEl) filteredCountEl.innerText = list.length;
    const totalCountEl = document.getElementById('booking-total-count');
    if (totalCountEl) totalCountEl.innerText = rawSalesBookings.length;

    window.rawSalesBookingsFiltered = list;
    // Sắp xếp
    list.sort((a, b) => {
        let valA, valB;
        if (bookingSortColumn === 'booking_code') {
            const cmp = (a.booking_code || '').toString().localeCompare((b.booking_code || '').toString(), 'vi', { numeric: true });
            return bookingSortDirection === 'asc' ? cmp : -cmp;
        }

        if (bookingSortColumn === 'loading_date') {
            valA = a.loading_date_iso || a.loading_date || '';
            valB = b.loading_date_iso || b.loading_date || '';
            const cmp = valA.localeCompare(valB);
            return bookingSortDirection === 'asc' ? cmp : -cmp;
        }

        if (bookingSortColumn === 'price') {
            valA = parseFloat(a.price) || 0;
            valB = parseFloat(b.price) || 0;
            return bookingSortDirection === 'asc' ? valA - valB : valB - valA;
        }

        if (bookingSortColumn === 'progress_percent') {
            valA = parseFloat(a.progress_percent) || 0;
            valB = parseFloat(b.progress_percent) || 0;
            return bookingSortDirection === 'asc' ? valA - valB : valB - valA;
        }

        // Mặc định so sánh chuỗi / ngày giờ
        valA = (a[bookingSortColumn] || '').toString();
        valB = (b[bookingSortColumn] || '').toString();
        const cmp = valA.localeCompare(valB, 'vi');
        return bookingSortDirection === 'asc' ? cmp : -cmp;
    });

    // Cập nhật visual icons trên thead
    const sortIcons = {
        'booking_code': document.getElementById('sort-icon-booking_code'),
        'loading_date': document.getElementById('sort-icon-loading_date'),
        'progress_percent': document.getElementById('sort-icon-progress_percent'),
        'closing_time': document.getElementById('sort-icon-closing_time'),
        'price': document.getElementById('sort-icon-price')
    };

    Object.entries(sortIcons).forEach(([col, icon]) => {
        if (!icon) return;
        if (col === bookingSortColumn) {
            icon.className = bookingSortDirection === 'asc' 
                ? 'ph-bold ph-arrow-up text-teal-700 text-xs font-black' 
                : 'ph-bold ph-arrow-down text-teal-700 text-xs font-black';
        } else {
            icon.className = 'ph-bold ph-arrows-down-up text-slate-400 text-xs';
        }
    });

    renderBookingsTable(list);
    if (window.BimTableColumnManager) {
        window.BimTableColumnManager.apply('sales-bookings-table');
    }
}

function renderBookingsTable(bookings) {
    const bkBody = document.getElementById('sales-bookings-tbody');
    if (!bkBody) return;
    bkBody.innerHTML = '';

    if (!bookings || bookings.length === 0) {
        bkBody.innerHTML = `
            <tr>
                <td colspan="10" class="p-8 text-center text-slate-400 italic">
                    <div class="flex flex-col items-center justify-center space-y-2">
                        <i class="ph-bold ph-magnifying-glass text-3xl text-slate-300"></i>
                        <p class="font-medium text-sm">Không tìm thấy đơn hàng / booking nào phù hợp với bộ lọc hiện tại.</p>
                        <button type="button" onclick="resetBookingFilters()" class="text-xs text-teal-700 hover:text-teal-900 font-bold underline">
                            Đặt lại toàn bộ bộ lọc
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    bookings.forEach((b, idx) => {
        const tr = document.createElement('tr');
        tr.className = b.is_urgent 
            ? 'hover:bg-amber-50/70 bg-amber-50/25 transition-colors' 
            : 'hover:bg-slate-50 transition-colors';
        
        const statusBadge = b.status === 'PENDING_DISPATCH' 
            ? '<span class="text-xs font-semibold text-amber-700 whitespace-nowrap">Chờ điều xe</span>'
            : b.status === 'PARTIALLY_DISPATCHED'
            ? '<span class="text-xs font-semibold text-teal-700 whitespace-nowrap">Đang điều xe</span>'
            : b.status === 'COMPLETED'
            ? '<span class="text-xs font-semibold text-emerald-700 whitespace-nowrap">Đã đủ cont</span>'
            : '<span class="text-xs font-semibold text-rose-700 whitespace-nowrap">Đã hủy</span>';

        const urgentBadge = b.is_urgent ? `
            <span class="ml-1 text-[11px] font-bold text-rose-700 uppercase inline-flex items-center gap-0.5">
                <i class="ph-bold ph-warning-circle"></i> GẤP
            </span>
        ` : '';

        const dropHookBadge = b.has_drop_hook ? `
            <span class="ml-1 text-[11px] font-bold text-amber-700 uppercase inline-flex items-center gap-0.5" title="Có ${b.drop_hook_count} cont chạy chế độ cắt kéo (đổi tài)">
                <i class="ph-bold ph-arrows-split"></i> Cắt Kéo (${b.drop_hook_count})
            </span>
        ` : '';

        // Phân loại nhãn dịch vụ gọn gàng
        const svcTag = b.booking_type === 'DOMESTIC' ? 'Nội Địa FTL' : (b.booking_type === 'IMPORT_FCL' ? 'Nhập FCL' : 'Xuất FCL');
        const svcCls = b.booking_type === 'DOMESTIC' ? 'bg-amber-50 text-amber-800 border-amber-200' : (b.booking_type === 'IMPORT_FCL' ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-teal-50 text-teal-800 border-teal-200');

        // Hàm rút gọn địa điểm loại bỏ ngoặc rườm rà
        const cleanLoc = (s) => (s || '-').replace(/\([^)]*\)/g, '').trim();

        tr.innerHTML = `
            <td class="p-3.5 text-center font-mono text-xs font-bold text-slate-500 tabular-nums select-none border-r border-slate-200/70 w-12">
                ${idx + 1}
            </td>
            <td class="p-3.5 whitespace-nowrap">
                <div class="flex items-center flex-wrap gap-1">
                    <span class="font-bold text-slate-900 font-heading font-mono text-sm">${escapeHtml(formatCodeCompact(b.booking_code))}</span>
                    ${urgentBadge}
                    ${dropHookBadge}
                </div>
            </td>
            <td class="p-3.5 whitespace-nowrap">
                <div class="flex flex-col">
                    <p class="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <i class="ph-bold ph-calendar-blank text-slate-400 text-xs shrink-0"></i>
                        <span>${b.loading_date}</span>
                    </p>
                    ${b.loading_time ? `<p class="text-xs text-slate-500 font-medium mt-0.5 pl-4">${formatTimeString(b.loading_time)}</p>` : ''}
                </div>
            </td>
            <td class="p-3.5">
                <p class="font-bold text-slate-900 text-sm truncate max-w-[200px]" title="${escapeHtml(b.customer)}">${escapeHtml(b.customer)}</p>
                <p class="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1.5 truncate">
                    <span class="font-bold text-teal-800">${svcTag}</span>
                    ${b.shipping_line ? `<span class="text-slate-300">·</span><span class="font-medium text-slate-600 truncate max-w-[120px]">${escapeHtml(b.shipping_line)}</span>` : ''}
                </p>
            </td>
            <td class="p-3.5 font-mono">
                <p class="font-bold text-indigo-950 text-sm truncate max-w-[150px] font-mono">${escapeHtml(b.booking_number || '-')}</p>
                <p class="text-xs text-slate-500 font-medium truncate max-w-[150px] mt-0.5 font-sans">${escapeHtml(b.vessel_voyage || '-')}</p>
            </td>
            <td class="p-3.5">
                <div class="flex flex-col">
                    <p class="font-bold text-slate-900 text-sm">Cont ${escapeHtml(b.container_size)}</p>
                    <p class="text-xs text-slate-500 font-medium truncate max-w-[140px] mt-0.5" title="${escapeHtml(b.commodity || 'Hàng hóa')}">${escapeHtml(b.commodity || 'Hàng hóa')}</p>
                </div>
            </td>
            <td class="p-3.5">
                <div class="flex items-center space-x-1.5 mb-1">
                    <span class="font-bold text-slate-900 text-sm tabular-nums">${b.progress}</span>
                    <div class="w-12 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div class="bg-teal-600 h-1.5 rounded-full" style="width: ${b.progress_percent}%"></div>
                    </div>
                </div>
                <div>${statusBadge}</div>
            </td>
            <td class="p-3.5">
                <div class="text-sm leading-snug space-y-0.5 max-w-[230px]">
                    <p class="truncate text-slate-700"><strong class="text-teal-700 font-bold">1. Lấy:</strong> ${cleanLoc(b.pickup)}</p>
                    <p class="truncate text-slate-900 font-bold"><strong class="text-slate-900 font-bold">2. Kho:</strong> ${cleanLoc(b.delivery)}</p>
                    ${b.dropoff ? `<p class="truncate text-slate-700"><strong class="text-indigo-700 font-bold">3. Hạ:</strong> ${cleanLoc(b.dropoff)}</p>` : ''}
                </div>
            </td>
            <td class="p-3.5 font-mono">
                <p class="font-bold text-rose-700 text-sm">${b.closing_time || '-'}</p>
                ${b.si_cutoff ? `<p class="text-xs text-slate-500 mt-0.5 font-sans">SI: ${b.si_cutoff}</p>` : ''}
            </td>
            <td class="p-3.5 text-right font-black text-slate-900 text-sm tabular-nums">
                ${new Intl.NumberFormat('vi-VN').format(b.price)} đ
            </td>
            <td class="p-3.5 text-center">
                <div class="inline-flex items-center gap-1.5 justify-center">
                    <!-- 1. Xem Booking (Toàn màn hình) -->
                    <button type="button" onclick="openModalBooking(${b.id}, true)" 
                        class="px-2.5 py-1 bg-transparent hover:bg-teal-600 text-teal-700 hover:text-white border border-teal-600 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                        title="Xem chi tiết, Sửa, Lưu & Xóa đơn hàng">
                        <i class="ph-bold ph-eye"></i>
                        <span>Xem</span>
                    </button>
                    <!-- 2. In nhanh Booking khổ A4 -->
                    <button type="button" onclick="openDirectPrintBooking(${b.id})" 
                        class="px-2.5 py-1 bg-transparent hover:bg-slate-700 text-slate-700 hover:text-white border border-slate-600 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                        title="In nhanh phiếu Booking khổ A4">
                        <i class="ph-bold ph-printer"></i>
                        <span>In</span>
                    </button>
                </div>
            </td>
        `;
        bkBody.appendChild(tr);
    });

    if (window.BimTableFooter) {
        const totalBookingPrice = bookings.reduce((sum, b) => sum + (Number(b.price) || 0), 0);
        window.BimTableFooter.render('sales-bookings-table', {
            cells: [
                { text: 'TỔNG', align: 'center', class: 'font-black text-slate-900 font-heading' },
                { html: `<span class="text-teal-800 font-extrabold">${bookings.length}</span> đơn hàng booking`, colspan: 8, class: 'text-slate-700' },
                { html: `<span class="text-slate-900 font-black tabular-nums font-heading">${new Intl.NumberFormat('vi-VN').format(totalBookingPrice)} đ</span>`, align: 'right' },
                { text: '', align: 'center' }
            ]
        });
    }
}

async function loadSalesData() {
    try {
        const quotePeriod = document.getElementById('quote-filter-period')?.value || 'all';
        const bookingPeriod = document.getElementById('booking-filter-period')?.value || 'this_month';

        const params = new URLSearchParams();
        params.append('quote_period', quotePeriod);
        if (quotePeriod !== 'all') {
            const qRange = getDateRangeForPeriod(quotePeriod);
            params.append('quote_from_date', qRange.fromDate);
            params.append('quote_to_date', qRange.toDate);
        }

        params.append('booking_period', bookingPeriod);
        if (bookingPeriod !== 'all') {
            const bRange = getDateRangeForPeriod(bookingPeriod);
            params.append('booking_from_date', bRange.fromDate);
            params.append('booking_to_date', bRange.toDate);
        }

        // Tương thích ngược
        const activePeriod = (currentSalesSubTab === 'quotations') ? quotePeriod : bookingPeriod;
        if (activePeriod !== 'all') {
            const actRange = getDateRangeForPeriod(activePeriod);
            params.append('from_date', actRange.fromDate);
            params.append('to_date', actRange.toDate);
        }

        const res = await fetchWithAuth(`/api/sales/?${params.toString()}`);
        if (!res.ok) throw new Error('Lỗi tải dữ liệu kinh doanh');
        const data = await res.json();

        // Cập nhật Cụm 5 Chỉ Số Kinh Doanh Tái Cấu Trúc:
        // DOANH THU THỰC HIỆN | DOANH THU DỰ KIẾN | TỔNG ĐƠN HÀNG | SỐ ĐƠN GẤP | TỶ LỆ CHỐT BÁO GIÁ
        if (data.overview_metrics) {
            const ov = data.overview_metrics;

            // Thẻ 1: DOANH THU THỰC HIỆN
            const earnedEl = document.getElementById('sales-overview-earned');
            if (earnedEl) earnedEl.innerText = new Intl.NumberFormat('vi-VN').format(ov.earned_revenue || 0) + ' đ';
            const earnedTrendEl = document.getElementById('sales-trend-earned');
            if (earnedTrendEl) earnedTrendEl.innerHTML = `<i class="ph-bold ph-check-circle"></i> ${ov.earned_revenue_trend || 'Đã Giao Nhận'}`;
            const earnedNoteEl = document.getElementById('sales-note-earned');
            if (earnedNoteEl) earnedNoteEl.innerHTML = `<i class="ph-bold ph-arrows-left-right text-teal-600 text-xs"></i> ${ov.earned_revenue_note || 'Chuyến xe đã hoàn tất'}`;

            // Thẻ 2: DOANH THU DỰ KIẾN
            const revEl = document.getElementById('sales-overview-revenue');
            if (revEl) revEl.innerText = new Intl.NumberFormat('vi-VN').format(ov.expected_revenue !== undefined ? ov.expected_revenue : ov.revenue_monthly) + ' đ';
            const revTrendEl = document.getElementById('sales-trend-revenue');
            if (revTrendEl) revTrendEl.innerHTML = `<i class="ph-bold ph-file-text"></i> ${ov.expected_revenue_trend || ov.revenue_trend || 'Hợp Đồng Đã Ký'}`;
            const revNoteEl = document.getElementById('sales-note-revenue');
            if (revNoteEl) revNoteEl.innerHTML = `<i class="ph-bold ph-check-circle text-indigo-600 text-xs"></i> ${ov.expected_revenue_note || ov.revenue_note || 'Tuyến cước đã duyệt ký kết'}`;

            // Thẻ 3: TỔNG ĐƠN HÀNG
            const bkEl = document.getElementById('sales-overview-bookings');
            if (bkEl) bkEl.innerText = `${new Intl.NumberFormat('vi-VN').format(ov.total_bookings || 0)} Đơn hàng`;
            const bkTrendEl = document.getElementById('sales-trend-bookings');
            if (bkTrendEl) bkTrendEl.innerHTML = `<i class="ph-bold ph-truck"></i> ${ov.booking_trend}`;
            const bkNoteEl = document.getElementById('sales-note-bookings');
            if (bkNoteEl) bkNoteEl.innerHTML = `<i class="ph-bold ph-truck text-sky-600 text-xs"></i> ${ov.booking_note}`;

            // Thẻ 4: SỐ ĐƠN GẤP
            const urgentEl = document.getElementById('sales-overview-urgent');
            if (urgentEl) urgentEl.innerText = `${new Intl.NumberFormat('vi-VN').format(ov.urgent_bookings || 0)} Đơn`;
            const urgentTrendEl = document.getElementById('sales-trend-urgent');
            if (urgentTrendEl) urgentTrendEl.innerHTML = `<i class="ph-bold ph-clock-countdown"></i> ${ov.urgent_trend || 'Cần Xử Lý'}`;
            const urgentNoteEl = document.getElementById('sales-note-urgent');
            if (urgentNoteEl) urgentNoteEl.innerHTML = `<i class="ph-bold ph-warning-circle text-rose-600 text-xs"></i> ${ov.urgent_note || 'Đóng hàng trong 48h'}`;

            // Thẻ 5: TỶ LỆ CHỐT BÁO GIÁ
            const winEl = document.getElementById('sales-overview-winrate');
            if (winEl) winEl.innerText = `${ov.win_rate}%`;
            const winTrendEl = document.getElementById('sales-trend-winrate');
            if (winTrendEl) winTrendEl.innerHTML = `<i class="ph-bold ph-handshake"></i> ${ov.win_rate_trend}`;
            const winNoteEl = document.getElementById('sales-note-winrate');
            if (winNoteEl) winNoteEl.innerHTML = `<i class="ph-bold ph-chats-circle text-emerald-600 text-xs"></i> ${ov.win_rate_note}`;
        }

        // Cập nhật badges số lượng trên 2 tab
        const bQuoteCount = document.getElementById('badge-count-quotes');
        if (bQuoteCount && data.quotations) bQuoteCount.innerText = new Intl.NumberFormat('vi-VN').format(data.quotations.length);
        const bBookingCount = document.getElementById('badge-count-bookings');
        if (bBookingCount && data.bookings) bBookingCount.innerText = new Intl.NumberFormat('vi-VN').format(data.bookings.length);

        // Cập nhật stats con cho Báo giá & Booking (Dashboard riêng từng tab 5 thẻ)
        if (data.stats) {
            const fmtMoney = (v) => new Intl.NumberFormat('vi-VN').format(Math.round(v || 0)) + ' đ';
            const fmtNum = (v) => new Intl.NumberFormat('vi-VN').format(Math.round(v || 0));

            // 1. Dãy 5 Thẻ BÁO GIÁ & HỢP ĐỒNG KHÁCH HÀNG:
            // [ĐÃ KÝ HỢP ĐỒNG | CHỜ KÝ HỢP ĐỒNG | ĐANG ĐÀM PHÁN | ĐÃ GỬI BÁO GIÁ | TỪ CHỐI]
            const qs = data.stats.quotation_stats;
            if (qs) {
                const qSigned = qs.signed || { revenue: qs.expected_revenue || 0, routes: qs.approved || 0, count: qs.approved || 0 };
                const qPending = qs.pending || { revenue: 0, routes: qs.pending_approval || 0, count: qs.pending_approval || 0 };
                const qNeg = qs.negotiating || { revenue: 0, routes: qs.negotiating_count || 0, count: qs.negotiating_count || 0 };
                const qSent = qs.sent || { revenue: 0, routes: 0, count: 0 };
                const qRej = qs.rejected || { revenue: 0, routes: qs.rejected_count || 0, count: qs.rejected_count || 0 };

                // Thẻ 1: ĐÃ GỬI BÁO GIÁ (qSent)
                const sentMain = document.getElementById('stat-quote-sent-main');
                if (sentMain) sentMain.innerText = fmtMoney(qSent.revenue);
                const sentRev = document.getElementById('stat-quote-sent-rev');
                if (sentRev) sentRev.innerText = fmtMoney(qSent.revenue);
                const sentRoutes = document.getElementById('stat-quote-sent-routes');
                if (sentRoutes) sentRoutes.innerText = fmtNum(qSent.routes);
                const sentTrips = document.getElementById('stat-quote-sent-trips');
                if (sentTrips) sentTrips.innerText = fmtNum(qSent.trips || 0);
                const sentCount = document.getElementById('stat-quote-sent-count');
                if (sentCount) sentCount.innerText = fmtNum(qSent.count || 0);

                // Thẻ 2: ĐANG ĐÀM PHÁN (qNeg)
                const nMain = document.getElementById('stat-quote-negotiating-main');
                if (nMain) nMain.innerText = fmtMoney(qNeg.revenue);
                const nRev = document.getElementById('stat-quote-negotiating-rev');
                if (nRev) nRev.innerText = fmtMoney(qNeg.revenue);
                const nRoutes = document.getElementById('stat-quote-negotiating-routes');
                if (nRoutes) nRoutes.innerText = fmtNum(qNeg.routes);
                const nTrips = document.getElementById('stat-quote-negotiating-trips');
                if (nTrips) nTrips.innerText = fmtNum(qNeg.trips || 0);
                const nCount = document.getElementById('stat-quote-negotiating-count');
                if (nCount) nCount.innerText = fmtNum(qNeg.count || 0);

                // Thẻ 3: CHỜ KÝ HỢP ĐỒNG (qPending)
                const pMain = document.getElementById('stat-quote-pending-main');
                if (pMain) pMain.innerText = fmtMoney(qPending.revenue);
                const pRev = document.getElementById('stat-quote-pending-rev');
                if (pRev) pRev.innerText = fmtMoney(qPending.revenue);
                const pRoutes = document.getElementById('stat-quote-pending-routes');
                if (pRoutes) pRoutes.innerText = fmtNum(qPending.routes);
                const pTrips = document.getElementById('stat-quote-pending-trips');
                if (pTrips) pTrips.innerText = fmtNum(qPending.trips || 0);
                const pCount = document.getElementById('stat-quote-pending-count');
                if (pCount) pCount.innerText = fmtNum(qPending.count || 0);

                // Thẻ 4: ĐÃ KÝ HỢP ĐỒNG (qSigned)
                const sMain = document.getElementById('stat-quote-signed-main');
                if (sMain) sMain.innerText = fmtMoney(qSigned.revenue);
                const sRev = document.getElementById('stat-quote-signed-rev');
                if (sRev) sRev.innerText = fmtMoney(qSigned.revenue);
                const sRoutes = document.getElementById('stat-quote-signed-routes');
                if (sRoutes) sRoutes.innerText = fmtNum(qSigned.routes);
                const sTrips = document.getElementById('stat-quote-signed-trips');
                if (sTrips) sTrips.innerText = fmtNum(qSigned.trips || 0);
                const sCount = document.getElementById('stat-quote-signed-count');
                if (sCount) sCount.innerText = fmtNum(qSigned.count || 0);

                // Thẻ 5: TỪ CHỐI / HUỶ (qRej)
                const rMain = document.getElementById('stat-quote-rejected-main');
                if (rMain) rMain.innerText = fmtMoney(qRej.revenue);
                const rRev = document.getElementById('stat-quote-rejected-rev');
                if (rRev) rRev.innerText = fmtMoney(qRej.revenue);
                const rRoutes = document.getElementById('stat-quote-rejected-routes');
                if (rRoutes) rRoutes.innerText = fmtNum(qRej.routes);
                const rTrips = document.getElementById('stat-quote-rejected-trips');
                if (rTrips) rTrips.innerText = fmtNum(qRej.trips || 0);
                const rCount = document.getElementById('stat-quote-rejected-count');
                if (rCount) rCount.innerText = fmtNum(qRej.count || 0);

                // Tương thích ngược các element cũ nếu còn tồn tại
                const oldNeg = document.getElementById('stat-quote-negotiating');
                if (oldNeg) oldNeg.innerText = fmtNum(qNeg.count);
                const oldPending = document.getElementById('stat-quote-pending');
                if (oldPending) oldPending.innerText = fmtNum(qPending.count);
                const oldApp = document.getElementById('stat-quote-approved');
                if (oldApp) oldApp.innerText = fmtNum(qSigned.count);
                const oldRev = document.getElementById('stat-quote-revenue');
                if (oldRev) oldRev.innerText = fmtMoney(qs.expected_revenue || qSigned.revenue);
            }

            // 2. Dãy 5 Thẻ BOOKING / ĐƠN ĐẶT HÀNG:
            // [CHỜ ĐIỀU XE | ĐANG ĐIỀU XE | ĐƠN GẤP | CHẠY CẮT KÉO | ĐÃ HOÀN TẤT]
            const bs = data.stats.booking_stats;
            if (bs) {
                const bkPend = bs.pending_dispatch_group || { count: bs.pending_dispatch || 0, total_trips: 0, total_containers: 0, completed_containers: 0, uncompleted_containers: 0 };
                const bkDisp = bs.partially_dispatched_group || { count: bs.partially_dispatched || 0, total_trips: 0, total_containers: 0, completed_containers: 0, uncompleted_containers: 0 };
                const bkUrg = bs.urgent_group || { count: 0, total_trips: 0, total_containers: 0, completed_containers: 0, uncompleted_containers: 0 };
                const bkHook = bs.drop_hook_group || { count: 0, total_trips: 0, total_containers: 0, completed_containers: 0, uncompleted_containers: 0 };
                const bkDone = bs.completed_group || { count: bs.completed || 0, total_trips: 0, total_containers: 0, completed_containers: 0, uncompleted_containers: 0 };

                // Thẻ 1: CHỜ ĐIỀU XE
                const pEl = document.getElementById('sales-stat-pending-dispatch');
                if (pEl) pEl.innerText = fmtNum(bkPend.count);
                const pTotal = document.getElementById('sales-stat-pending-total-conts');
                if (pTotal) pTotal.innerText = fmtNum(bkPend.total_containers);
                const pDone = document.getElementById('sales-stat-pending-completed-conts');
                if (pDone) pDone.innerText = fmtNum(bkPend.completed_containers);
                const pUncompleted = document.getElementById('sales-stat-pending-uncompleted-conts');
                if (pUncompleted) pUncompleted.innerText = fmtNum(bkPend.uncompleted_containers);
                // Fallbacks cũ
                const pTripsConts = document.getElementById('sales-stat-pending-trips-conts');
                if (pTripsConts) pTripsConts.innerText = `${fmtNum(bkPend.total_trips)} Chuyến / ${fmtNum(bkPend.total_containers)} Cont`;
                const pDoneOld = document.getElementById('sales-stat-pending-completed');
                if (pDoneOld) pDoneOld.innerText = `${fmtNum(bkPend.completed_containers)} Cont`;
                const pUncompletedOld = document.getElementById('sales-stat-pending-uncompleted');
                if (pUncompletedOld) pUncompletedOld.innerText = `${fmtNum(bkPend.uncompleted_containers)} Cont`;

                // Thẻ 2: ĐANG ĐIỀU XE
                const partEl = document.getElementById('sales-stat-partially-dispatched');
                if (partEl) partEl.innerText = fmtNum(bkDisp.count);
                const partTotal = document.getElementById('sales-stat-dispatching-total-conts');
                if (partTotal) partTotal.innerText = fmtNum(bkDisp.total_containers);
                const partDone = document.getElementById('sales-stat-dispatching-completed-conts');
                if (partDone) partDone.innerText = fmtNum(bkDisp.completed_containers);
                const partUncompleted = document.getElementById('sales-stat-dispatching-uncompleted-conts');
                if (partUncompleted) partUncompleted.innerText = fmtNum(bkDisp.uncompleted_containers);
                // Fallbacks cũ
                const partTripsConts = document.getElementById('sales-stat-dispatching-trips-conts');
                if (partTripsConts) partTripsConts.innerText = `${fmtNum(bkDisp.total_trips)} Chuyến / ${fmtNum(bkDisp.total_containers)} Cont`;
                const partDoneOld = document.getElementById('sales-stat-dispatching-completed');
                if (partDoneOld) partDoneOld.innerText = `${fmtNum(bkDisp.completed_containers)} Cont`;
                const partUncompletedOld = document.getElementById('sales-stat-dispatching-uncompleted');
                if (partUncompletedOld) partUncompletedOld.innerText = `${fmtNum(bkDisp.uncompleted_containers)} Cont`;

                // Thẻ 3: CHẠY CẮT KÉO
                const hookCount = document.getElementById('sales-stat-drop-hook-count');
                if (hookCount) hookCount.innerText = fmtNum(bkHook.count);
                const hookTotal = document.getElementById('sales-stat-drop-hook-total-conts');
                if (hookTotal) hookTotal.innerText = fmtNum(bkHook.total_containers);
                const hookDone = document.getElementById('sales-stat-drop-hook-completed-conts');
                if (hookDone) hookDone.innerText = fmtNum(bkHook.completed_containers);
                const hookUncompleted = document.getElementById('sales-stat-drop-hook-uncompleted-conts');
                if (hookUncompleted) hookUncompleted.innerText = fmtNum(bkHook.uncompleted_containers);
                // Fallbacks cũ
                const hookTripsConts = document.getElementById('sales-stat-drop-hook-trips-conts');
                if (hookTripsConts) hookTripsConts.innerText = `${fmtNum(bkHook.total_trips)} Chuyến / ${fmtNum(bkHook.total_containers)} Cont`;
                const hookDoneOld = document.getElementById('sales-stat-drop-hook-completed');
                if (hookDoneOld) hookDoneOld.innerText = `${fmtNum(bkHook.completed_containers)} Cont`;
                const hookUncompletedOld = document.getElementById('sales-stat-drop-hook-uncompleted');
                if (hookUncompletedOld) hookUncompletedOld.innerText = `${fmtNum(bkHook.uncompleted_containers)} Cont`;

                // Thẻ 4: ĐƠN GẤP
                const urgCount = document.getElementById('sales-stat-urgent-count');
                if (urgCount) urgCount.innerText = fmtNum(bkUrg.count);
                const urgTotal = document.getElementById('sales-stat-urgent-total-conts');
                if (urgTotal) urgTotal.innerText = fmtNum(bkUrg.total_containers);
                const urgDone = document.getElementById('sales-stat-urgent-completed-conts');
                if (urgDone) urgDone.innerText = fmtNum(bkUrg.completed_containers);
                const urgUncompleted = document.getElementById('sales-stat-urgent-uncompleted-conts');
                if (urgUncompleted) urgUncompleted.innerText = fmtNum(bkUrg.uncompleted_containers);
                // Fallbacks cũ
                const urgTripsConts = document.getElementById('sales-stat-urgent-trips-conts');
                if (urgTripsConts) urgTripsConts.innerText = `${fmtNum(bkUrg.total_trips)} Chuyến / ${fmtNum(bkUrg.total_containers)} Cont`;
                const urgDoneOld = document.getElementById('sales-stat-urgent-completed');
                if (urgDoneOld) urgDoneOld.innerText = `${fmtNum(bkUrg.completed_containers)} Cont`;
                const urgUncompletedOld = document.getElementById('sales-stat-urgent-uncompleted');
                if (urgUncompletedOld) urgUncompletedOld.innerText = `${fmtNum(bkUrg.uncompleted_containers)} Cont`;

                // Thẻ 5: ĐÃ HOÀN TẤT
                const cEl = document.getElementById('sales-stat-completed');
                if (cEl) cEl.innerText = fmtNum(bkDone.count);
                const cTotal = document.getElementById('sales-stat-completed-total-conts');
                if (cTotal) cTotal.innerText = fmtNum(bkDone.total_containers);
                const cDone = document.getElementById('sales-stat-completed-completed-conts');
                if (cDone) cDone.innerText = fmtNum(bkDone.completed_containers);
                const cUncompleted = document.getElementById('sales-stat-completed-uncompleted-conts');
                if (cUncompleted) cUncompleted.innerText = '0';
                // Fallbacks cũ
                const cTripsConts = document.getElementById('sales-stat-completed-trips-conts');
                if (cTripsConts) cTripsConts.innerText = `${fmtNum(bkDone.total_trips)} Chuyến / ${fmtNum(bkDone.total_containers)} Cont`;
                const cDoneOld = document.getElementById('sales-stat-completed-done');
                if (cDoneOld) cDoneOld.innerText = `${fmtNum(bkDone.completed_containers)} Cont`;
                const cUncompletedOld = document.getElementById('sales-stat-completed-uncompleted');
                if (cUncompletedOld) cUncompletedOld.innerText = '0 Cont';
            }
        }

        // Cập nhật danh sách Bookings với bộ lọc & sắp xếp theo ngày/cột
        rawSalesBookings = data.bookings || data.items || data.results || (Array.isArray(data) ? data : []);
        populateBookingFilterDropdowns(rawSalesBookings);
        applyBookingFilters();

        // Cập nhật danh sách Báo Giá Tuyến Cước với bộ lọc & sắp xếp
        rawSalesQuotations = data.quotations || [];
        populateQuoteFilterDropdowns(rawSalesQuotations);
        applyQuoteFilters();
    } catch (err) {
        console.error('Error loading sales data:', err);
    }
}

// --- BỘ LỌC & SẮP XẾP BẢNG BÁO GIÁ TUYẾN CƯỚC (CRM) ---
let rawSalesQuotations = [];
let quoteSortColumn = null;
let quoteSortDirection = 'asc';

function populateQuoteFilterDropdowns(quotes) {
    if (!quotes || !Array.isArray(quotes)) return;
    const custSelect = document.getElementById('filter-quote-customer');
    if (custSelect) {
        const curVal = custSelect.value;
        const customers = [...new Set(quotes.map(q => (q.customer || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
        custSelect.innerHTML = '<option value="">-- Tất cả Khách hàng --</option>' + 
            customers.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
        if (customers.includes(curVal)) custSelect.value = curVal;
    }
}

function clearQuoteSearch() {
    const input = document.getElementById('filter-quote-search');
    if (input) input.value = '';
    const clearBtn = document.getElementById('btn-clear-quote-search');
    if (clearBtn) clearBtn.classList.add('hidden');
    applyQuoteFilters();
}

function resetQuoteFilters() {
    const cust = document.getElementById('filter-quote-customer');
    if (cust) cust.value = '';
    const status = document.getElementById('filter-quote-status');
    if (status) status.value = '';
    const search = document.getElementById('filter-quote-search');
    if (search) search.value = '';
    const clearBtn = document.getElementById('btn-clear-quote-search');
    if (clearBtn) clearBtn.classList.add('hidden');

    quoteSortColumn = null;
    quoteSortDirection = 'asc';
    applyQuoteFilters();
}

function toggleQuoteSort(col) {
    if (quoteSortColumn === col) {
        quoteSortDirection = quoteSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        quoteSortColumn = col;
        quoteSortDirection = 'asc';
    }
    applyQuoteFilters();
}

function applyQuoteFilters() {
    if (!rawSalesQuotations || !Array.isArray(rawSalesQuotations)) return;

    const filterCust = document.getElementById('filter-quote-customer')?.value?.trim().toLowerCase() || '';
    const filterStatus = document.getElementById('filter-quote-status')?.value?.trim().toLowerCase() || '';
    const filterSearch = document.getElementById('filter-quote-search')?.value?.trim().toLowerCase() || '';

    const clearBtn = document.getElementById('btn-clear-quote-search');
    if (clearBtn) {
        if (filterSearch) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
    }

    let list = rawSalesQuotations.filter(q => {
        if (filterCust && (q.customer || '').toLowerCase() !== filterCust) return false;
        
        if (filterStatus) {
            const rawStatus = (q.status_raw || '').toUpperCase();
            const st = (q.status || '').toLowerCase();
            const filterUpper = filterStatus.toUpperCase();
            const filterLower = filterStatus.toLowerCase();
            const matchesRaw = (rawStatus === filterUpper) || 
                               (filterUpper === 'REJECTED' && ['REJECTED', 'EXPIRED'].includes(rawStatus));
            const matchesText = st.includes(filterLower);
            if (!matchesRaw && !matchesText) return false;
        }

        if (filterSearch) {
            const combinedText = [
                q.code,
                q.created_at,
                q.customer,
                q.route,
                q.status,
                q.unit_price,
                q.monthly_trips,
                q.expected_revenue
            ].filter(Boolean).join(' ').toLowerCase();

            if (!combinedText.includes(filterSearch)) return false;
        }

        return true;
    });

    // Cập nhật số đếm
    const filteredCountEl = document.getElementById('quote-filtered-count');
    if (filteredCountEl) filteredCountEl.innerText = list.length;
    const totalCountEl = document.getElementById('quote-total-count');
    if (totalCountEl) totalCountEl.innerText = rawSalesQuotations.length;

    // Sắp xếp
    if (quoteSortColumn) {
        list.sort((a, b) => {
            let valA = a[quoteSortColumn];
            let valB = b[quoteSortColumn];

            if (quoteSortColumn === 'created_at') {
                const parseDate = (dStr) => {
                    if (!dStr) return 0;
                    const parts = dStr.split('/');
                    if (parts.length === 3) {
                        return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
                    }
                    const t = new Date(dStr).getTime();
                    return isNaN(t) ? 0 : t;
                };
                const timeA = parseDate(valA);
                const timeB = parseDate(valB);
                return quoteSortDirection === 'asc' ? timeA - timeB : timeB - timeA;
            }

            if (['unit_price', 'monthly_trips', 'expected_revenue'].includes(quoteSortColumn)) {
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
                return quoteSortDirection === 'asc' ? valA - valB : valB - valA;
            }

            valA = (valA || '').toString();
            valB = (valB || '').toString();
            const cmp = valA.localeCompare(valB, 'vi');
            return quoteSortDirection === 'asc' ? cmp : -cmp;
        });
    }

    // Cập nhật icons thead
    const sortCols = ['code', 'created_at', 'customer', 'route', 'unit_price', 'monthly_trips', 'expected_revenue', 'status'];
    sortCols.forEach(col => {
        const iconEl = document.getElementById(`sort-icon-quote-${col}`);
        if (iconEl) {
            if (quoteSortColumn === col) {
                iconEl.className = quoteSortDirection === 'asc' 
                    ? 'ph-bold ph-arrow-up text-indigo-600 text-xs' 
                    : 'ph-bold ph-arrow-down text-indigo-600 text-xs';
            } else {
                iconEl.className = 'ph-bold ph-arrows-down-up text-slate-400 text-xs';
            }
        }
    });

    renderQuotationsTable(list);
}

function renderQuotationsTable(quotations) {
    const tbody = document.getElementById('sales-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!quotations || quotations.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center py-10 text-slate-400">
                    <div class="flex flex-col items-center justify-center">
                        <i class="ph ph-magnifying-glass text-3xl mb-2 text-slate-300"></i>
                        <p class="font-medium text-sm text-slate-500">Không tìm thấy báo giá nào phù hợp với bộ lọc</p>
                        <p class="text-xs text-slate-400 mt-1">Thử đổi điều kiện lọc hoặc bấm "Đặt lại"</p>
                        <button onclick="resetQuoteFilters()" class="mt-2.5 px-3 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors">
                            Đặt lại bộ lọc
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    quotations.forEach((s, idx) => {
        let statusCls = 'text-slate-700 font-semibold';
        const stRaw = (s.status_raw || '').toUpperCase();
        const stText = (s.status || '').toLowerCase();
        if (stRaw === 'APPROVED' || stText.includes('đã ký')) {
            statusCls = 'text-emerald-700 font-semibold';
        } else if (stRaw === 'PENDING_APPROVAL' || stText.includes('chờ ký')) {
            statusCls = 'text-indigo-700 font-semibold';
        } else if (stRaw === 'NEGOTIATING' || stText.includes('đàm phán') || stText.includes('thương lượng')) {
            statusCls = 'text-amber-700 font-semibold';
        } else if (stRaw === 'SENT' || stText.includes('đã gửi')) {
            statusCls = 'text-sky-700 font-semibold';
        } else if (['REJECTED', 'EXPIRED'].includes(stRaw) || stText.includes('từ chối') || stText.includes('hủy')) {
            statusCls = 'text-rose-700 font-semibold';
        }

        const hasMultiRoutes = (s.items_count && s.items_count > 1) || (s.items && s.items.length > 1);
        const routeCount = s.items_count || (s.items ? s.items.length : 1);
        const isFuelAdj = s.pricing_method === 'FUEL_ADJUSTED';

        let routeDisplay = escapeHtml(s.route);
        if (hasMultiRoutes) {
            routeDisplay = `
                <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="font-bold text-slate-900">${escapeHtml(s.route)}</span>
                    <span class="text-indigo-700 font-semibold text-xs">+${routeCount - 1} tuyến khác</span>
                </div>
            `;
        }

        let methodBadge = '';
        if (isFuelAdj) {
            methodBadge = `<span class="text-amber-800 font-semibold text-xs">Giá Dầu</span>`;
        }

        const quoteHash = s.hashid || s.id;
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition-colors';
        tr.innerHTML = `
            <td class="p-3.5 text-center font-mono text-xs font-bold text-slate-500 tabular-nums select-none border-r border-slate-200/70 w-12">
                ${idx + 1}
            </td>
            <td class="p-3.5 font-black text-indigo-950 font-heading text-sm">
                <div class="flex flex-col">
                    <a href="/sales/quotations/${quoteHash}" onclick="event.preventDefault(); viewQuotationDetail('${quoteHash}');" 
                        class="hover:text-teal-700 hover:underline transition-colors cursor-pointer" title="Mở trang toàn màn hình: /sales/quotations/${quoteHash}">
                        ${formatCodeCompact(s.code)}
                    </a>
                    ${methodBadge ? `<div class="mt-0.5">${methodBadge}</div>` : ''}
                </div>
            </td>
            <td class="p-3.5 text-center whitespace-nowrap text-xs font-semibold text-slate-700">${escapeHtml(s.created_at || '-')}</td>
            <td class="p-3.5 font-bold text-slate-900 text-sm">${escapeHtml(s.customer)}</td>
            <td class="p-3.5 font-medium text-slate-700 text-[13px]">${routeDisplay}</td>
            <td class="p-3.5 font-semibold text-slate-700 tabular-nums text-sm text-right">${new Intl.NumberFormat('vi-VN').format(s.unit_price)} đ</td>
            <td class="p-3.5 text-center font-bold text-teal-700 tabular-nums text-sm">${new Intl.NumberFormat('vi-VN').format(s.monthly_trips || 0)} <span class="text-xs text-slate-400 font-normal">chuyến</span></td>
            <td class="p-3.5 text-right font-black text-emerald-700 tabular-nums font-heading text-sm">${new Intl.NumberFormat('vi-VN').format(s.expected_revenue)} đ</td>
            <td class="p-3.5 whitespace-nowrap">
                <span class="text-xs ${statusCls}">${escapeHtml(s.status)}</span>
            </td>
            <td class="p-3.5 text-center">
                <div class="inline-flex items-center gap-1.5 justify-center">
                    <!-- 1. Xem Báo Giá (Toàn màn hình) -->
                    <button type="button" onclick="viewQuotationDetail('${quoteHash}')" 
                        class="px-2.5 py-1 bg-transparent hover:bg-teal-600 text-teal-700 hover:text-white border border-teal-600 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                        title="Xem chi tiết, Sửa, Lưu & Xóa báo giá">
                        <i class="ph-bold ph-eye"></i>
                        <span>Xem</span>
                    </button>
                    <!-- 2. In nhanh Báo Giá khổ A4 -->
                    <button type="button" onclick="openDirectPrintQuotation('${quoteHash}')" 
                        class="px-2.5 py-1 bg-transparent hover:bg-slate-700 text-slate-700 hover:text-white border border-slate-600 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                        title="In nhanh Báo giá khổ A4">
                        <i class="ph-bold ph-printer"></i>
                        <span>In</span>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (window.BimTableFooter) {
        const totalQuoteTrips = quotations.reduce((sum, q) => sum + (Number(q.monthly_trips) || 0), 0);
        const totalQuoteExpRev = quotations.reduce((sum, q) => sum + (Number(q.expected_revenue) || 0), 0);
        window.BimTableFooter.render('sales-quotations-table', {
            cells: [
                { text: 'TỔNG', align: 'center', class: 'font-black text-slate-900 font-heading' },
                { html: `<span class="text-indigo-900 font-extrabold">${quotations.length}</span> bản báo giá CRM`, colspan: 5, class: 'text-slate-700' },
                { html: `<span class="text-teal-700 font-bold tabular-nums">${new Intl.NumberFormat('vi-VN').format(totalQuoteTrips)} chuyến</span>`, align: 'center' },
                { html: `<span class="text-emerald-700 font-black tabular-nums font-heading">${new Intl.NumberFormat('vi-VN').format(totalQuoteExpRev)} đ</span>`, align: 'right' },
                { text: '', align: 'center', colspan: 2 }
            ]
        });
    }
}

function handleBookingSortChange(sortVal) {
    if (!sortVal) {
        bookingSortColumn = 'booking_code';
        bookingSortDirection = 'desc';
    } else if (sortVal === 'code_asc') {
        bookingSortColumn = 'booking_code';
        bookingSortDirection = 'asc';
    } else if (sortVal === 'code_desc') {
        bookingSortColumn = 'booking_code';
        bookingSortDirection = 'desc';
    } else if (sortVal === 'customer_asc') {
        bookingSortColumn = 'customer';
        bookingSortDirection = 'asc';
    } else if (sortVal === 'loading_date_desc') {
        bookingSortColumn = 'loading_date';
        bookingSortDirection = 'desc';
    } else if (sortVal === 'loading_date_asc') {
        bookingSortColumn = 'loading_date';
        bookingSortDirection = 'asc';
    } else if (sortVal === 'progress_desc') {
        bookingSortColumn = 'progress_percent';
        bookingSortDirection = 'desc';
    } else if (sortVal === 'price_desc') {
        bookingSortColumn = 'price';
        bookingSortDirection = 'desc';
    }
    applyBookingFilters();
}
window.handleBookingSortChange = handleBookingSortChange;

function handleQuoteSortChange(sortVal) {
    if (!sortVal) {
        quoteSortColumn = 'created_at';
        quoteSortDirection = 'desc';
    } else if (sortVal === 'code_asc') {
        quoteSortColumn = 'code';
        quoteSortDirection = 'asc';
    } else if (sortVal === 'code_desc') {
        quoteSortColumn = 'code';
        quoteSortDirection = 'desc';
    } else if (sortVal === 'customer_asc') {
        quoteSortColumn = 'customer';
        quoteSortDirection = 'asc';
    } else if (sortVal === 'created_at_desc') {
        quoteSortColumn = 'created_at';
        quoteSortDirection = 'desc';
    } else if (sortVal === 'created_at_asc') {
        quoteSortColumn = 'created_at';
        quoteSortDirection = 'asc';
    } else if (sortVal === 'revenue_desc') {
        quoteSortColumn = 'expected_revenue';
        quoteSortDirection = 'desc';
    } else if (sortVal === 'price_desc') {
        quoteSortColumn = 'unit_price';
        quoteSortDirection = 'desc';
    }
    applyQuoteFilters();
}
window.handleQuoteSortChange = handleQuoteSortChange;
