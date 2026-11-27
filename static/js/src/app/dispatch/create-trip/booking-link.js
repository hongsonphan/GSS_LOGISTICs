let activeBookingsCache = [];

async function loadActiveBookingsForModal(selectedBookingId = null) {
    const sel = document.getElementById('select-booking-order');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Đang tải danh sách Booking từ Sale... --</option>';
    try {
        const res = await fetchWithAuth('/api/bookings/active/');
        if (!res.ok) throw new Error('Lỗi tải booking');
        activeBookingsCache = await res.json();
        
        renderBookingOrderOptions(activeBookingsCache, selectedBookingId);

        if (selectedBookingId) {
            onBookingSelected(selectedBookingId);
        }
    } catch (err) {
        console.error('Error loading active bookings:', err);
        sel.innerHTML = '<option value="">-- Lỗi tải danh sách Booking (Nhập thủ công) --</option>';
    }
}

function onBookingSelected(bookingId) {
    if (!bookingId) {
        const fileInput = document.getElementById('inp-booking-file');
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            clearBookingFileSelection();
        }
        return;
    }
    const b = activeBookingsCache.find(item => String(item.id) === String(bookingId));
    if (!b) return;

    // Tự động điền 9 trường dữ liệu kế thừa từ Booking của Sale
    const custEl = document.getElementById('inp-customer');
    if (custEl) setSelectValueCaseInsensitive(custEl, b.customer_name);
    
    const contTypeEl = document.getElementById('inp-cont-type');
    if (contTypeEl) setSelectValueCaseInsensitive(contTypeEl, b.container_size || '40HC');

    const bookingEl = document.getElementById('inp-booking');
    if (bookingEl) bookingEl.value = b.booking_number || '';

    if (b.closing_time) {
        parseAndSetDateTimeFields(b.closing_time, 'inp-cutoff-date', 'inp-cutoff-time', 'inp-cutoff', '17:00');
    } else {
        const cutoffEl = document.getElementById('inp-cutoff');
        if (cutoffEl) cutoffEl.value = '';
    }

    const loadTimeEl = document.getElementById('inp-load-time');
    if (loadTimeEl) loadTimeEl.value = `${b.loading_date_display || ''} - ${b.loading_time || '08:00'}`.trim();

    const pickupEl = document.getElementById('inp-pickup');
    if (pickupEl) setSelectValueCaseInsensitive(pickupEl, b.pickup_location);

    const warehouseEl = document.getElementById('inp-warehouse');
    if (warehouseEl) setSelectValueCaseInsensitive(warehouseEl, b.delivery_location);

    const dropoffEl = document.getElementById('inp-dropoff');
    if (dropoffEl) setSelectValueCaseInsensitive(dropoffEl, b.dropoff_location);

    const notesEl = document.getElementById('inp-notes');
    if (notesEl && b.notes) notesEl.value = b.notes;

    if (b.free_time_detention) {
        const detEl = document.getElementById('inp-det-free-days');
        if (detEl) {
            detEl.value = b.free_time_detention;
            onFreeDaysChange();
        }
    }
    if (b.free_time_demurrage) {
        const demEl = document.getElementById('inp-dem-free-days');
        if (demEl) demEl.value = b.free_time_demurrage;
    }

    // Tự động kế thừa file Booking / Lệnh cấp rỗng nếu có
    if (b.booking_file_url) {
        showInheritedBookingFile(b.booking_file_url, b.booking_file_name || `Booking_${b.booking_number}`);
    } else {
        const fileInput = document.getElementById('inp-booking-file');
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            clearBookingFileSelection();
        }
    }

    // Xóa cảnh báo viền đỏ (nếu có)
    ['inp-customer', 'inp-pickup', 'inp-warehouse'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('input-error');
    });
    ['err-customer', 'err-pickup', 'err-warehouse'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    showToast('success', `Đã kế thừa 9 trường dữ liệu và file booking từ [${b.booking_code}] - Khách hàng: ${b.customer_name}`, 'Kế Thừa Thành Công');
}


// =========================================================================
// CÁC HÀM XỬ LÝ BOOKING PRICE & SEARCH & QUYẾT TOÁN KHÁCH HÀNG (v4.7.5)
// =========================================================================

function renderBookingOrderOptions(bookingsList, selectedBookingId = null) {
    const selects = document.querySelectorAll('#select-booking-order');
    selects.forEach(sel => {
        sel.innerHTML = '<option value="">-- Chọn Booking / Đơn Hàng Đang Chờ Điều Xe (Hoặc Nhập Thủ Công) --</option>';
        (bookingsList || []).forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.id;
            opt.innerText = `[${b.booking_code}] ${b.customer_name} | B/L: ${b.booking_number} (${b.container_size} - Còn ${b.remaining_containers} cont) | Kho: ${b.delivery_location}`;
            if (selectedBookingId && String(selectedBookingId) === String(b.id)) {
                opt.selected = true;
            }
            sel.appendChild(opt);
        });
    });
}

function filterBookingOrderOptions(query) {
    const q = (query || '').toLowerCase().trim();
    const clearBtn1 = document.getElementById('btn-clear-booking-search');
    const clearBtn2 = document.getElementById('modal-btn-clear-booking-search');
    if (clearBtn1) clearBtn1.classList.toggle('hidden', !q);
    if (clearBtn2) clearBtn2.classList.toggle('hidden', !q);

    if (!q) {
        renderBookingOrderOptions(activeBookingsCache);
        return;
    }

    const filtered = (activeBookingsCache || []).filter(b => {
        const cust = (b.customer_name || '').toLowerCase();
        const code = (b.booking_code || '').toLowerCase();
        const num = (b.booking_number || '').toLowerCase();
        const deliv = (b.delivery_location || '').toLowerCase();
        const pick = (b.pickup_location || '').toLowerCase();
        return cust.includes(q) || code.includes(q) || num.includes(q) || deliv.includes(q) || pick.includes(q);
    });

    renderBookingOrderOptions(filtered);
    if (filtered.length === 1) {
        const sel = document.getElementById('select-booking-order');
        if (sel) {
            sel.value = filtered[0].id;
            onBookingSelected(filtered[0].id);
        }
    }
}

function clearBookingOrderSearch() {
    const inp1 = document.getElementById('search-booking-order');
    const inp2 = document.getElementById('modal-search-booking-order');
    if (inp1) inp1.value = '';
    if (inp2) inp2.value = '';
    filterBookingOrderOptions('');
}
