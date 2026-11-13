/**
 * 2. BOOKING / ĐƠN HÀNG: In trực tiếp từ bảng danh sách & từ form chi tiết
 */
function printCurrentBookingSlip() {
    const id = document.getElementById('fullpage-booking-id')?.value;
    if (!id) {
        showToast('warning', 'Vui lòng lưu đơn hàng / booking trước khi in ấn!', 'Thông Báo');
        return;
    }
    openDirectPrintBooking(id);
}
window.printCurrentBookingSlip = printCurrentBookingSlip;

async function openDirectPrintBooking(bookingId) {
    if (!bookingId) return;
    try {
        let b = (rawSalesBookings || []).find(item => item.id == bookingId);
        if (!b) {
            const res = await fetchWithAuth(`/api/bookings/${bookingId}/`);
            if (res.ok) b = await res.json();
        }
        if (!b) throw new Error('Không tìm thấy thông tin booking');

        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) {
            window.print();
            return;
        }

        const co = getSystemCompanyProfile();
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Phiếu Tiếp Nhận Booking - ${b.booking_code || ('BK-' + b.id)}</title>
                <style>
                    @page { 
                        size: A4 portrait; 
                        margin: 15mm 18mm 15mm 18mm; 
                    }
                    *, *::before, *::after { 
                        box-sizing: border-box; 
                    }
                    html, body { 
                        margin: 0; 
                        padding: 0; 
                        background: #ffffff; 
                        color: #0f172a; 
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; 
                        font-size: 13px; 
                        line-height: 1.5; 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important; 
                    }
                    .print-sheet {
                        width: 100%;
                        max-width: 175mm;
                        margin: 0 auto;
                        padding: 10mm 4mm 12mm 4mm;
                        box-sizing: border-box;
                        background: #ffffff;
                    }
                    @media print {
                        @page { 
                            size: A4 portrait; 
                            margin: 15mm 18mm 15mm 18mm; 
                        }
                        html, body { 
                            margin: 0 !important; 
                            padding: 0 !important; 
                            width: 100% !important; 
                            background: #ffffff !important; 
                        }
                        .print-sheet { 
                            width: 100% !important; 
                            max-width: 100% !important; 
                            margin: 0 !important; 
                            padding: 8mm 2mm 10mm 2mm !important; 
                            box-sizing: border-box !important; 
                            page-break-inside: avoid !important; 
                            page-break-after: avoid !important; 
                        }
                    }
                    .header { 
                        display: flex; 
                        justify-content: space-between; 
                        align-items: flex-start; 
                        border-bottom: 2.5px solid #0f766e; 
                        padding-bottom: 12px; 
                        margin-bottom: 20px; 
                    }
                    .title { 
                        text-align: center; 
                        font-size: 18px; 
                        font-weight: 800; 
                        color: #0f766e; 
                        text-transform: uppercase; 
                        letter-spacing: 0.5px;
                        margin: 16px 0 24px 0; 
                    }
                    .meta-table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin-bottom: 24px; 
                        table-layout: fixed; 
                    }
                    .meta-table td { 
                        padding: 8px 12px; 
                        border: 1px solid #cbd5e1; 
                        word-wrap: break-word; 
                        vertical-align: middle;
                        font-size: 13px;
                    }
                    .meta-table td.label { 
                        font-weight: 700; 
                        background: #f8fafc; 
                        width: 22%; 
                        color: #334155; 
                    }
                    .signatures { 
                        display: flex; 
                        justify-content: space-between; 
                        margin-top: 50px; 
                        text-align: center; 
                        page-break-inside: avoid; 
                    }
                    .sig-box { 
                        width: 30%; 
                    }
                    .sig-title { 
                        font-weight: 700; 
                        color: #1e293b;
                        margin-bottom: 75px; 
                    }
                    .footer-note {
                        margin-top: 35px;
                        border-top: 1px dashed #cbd5e1;
                        padding-top: 8px;
                        font-size: 11px;
                        color: #64748b;
                        font-style: italic;
                        display: flex;
                        justify-content: space-between;
                    }
                </style>
            </head>
            <body>
                <div class="print-sheet">
                    <div class="header">
                        <div>
                            <div style="font-size: 16px; font-weight: 800; text-transform: uppercase; color: #0f766e; letter-spacing: 0.5px;">${co.company_name}</div>
                            <div style="font-size: 11.5px; color: #475569; margin-top: 3px;">Đ/c: ${co.address || '—'} • Hotline: ${co.phone || '—'}${co.tax_code ? ` • MST: ${co.tax_code}` : ''}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-weight: 800; font-family: monospace; font-size: 15px; color: #0f766e;">${b.booking_code || ('BK-' + b.id)}</div>
                            <div style="font-size: 11.5px; color: #64748b; margin-top: 3px;">Ngày in: ${new Date().toLocaleDateString('vi-VN')}</div>
                        </div>
                    </div>

                    <div class="title">PHIẾU TIẾP NHẬN ĐƠN HÀNG VẬN TẢI / BOOKING</div>

                    <table class="meta-table">
                        <tr>
                            <td class="label">Khách Hàng:</td>
                            <td style="font-weight: bold; font-size: 14px;">${b.customer_name || b.customer || '-'}</td>
                            <td class="label">Số Booking / PO:</td>
                            <td style="font-family: monospace; font-weight: bold;">${b.booking_number || '-'}</td>
                        </tr>
                        <tr>
                            <td class="label">Phân Loại Dịch Vụ:</td>
                            <td>${b.booking_type_display || (b.booking_type === 'DOMESTIC' ? 'Vận Chuyển Nội Địa' : (b.booking_type === 'IMPORT_FCL' ? 'Kéo Cont Nhập Khẩu' : 'Kéo Cont Xuất Khẩu'))}</td>
                            <td class="label">Hãng Tàu / Tàu:</td>
                            <td>${b.shipping_line || '-'} ${b.vessel_voyage ? ('/ ' + b.vessel_voyage) : ''}</td>
                        </tr>
                        <tr>
                            <td class="label">Loại Cont & Số lượng:</td>
                            <td>${b.container_size || '40HC'} — Số lượng: <strong>${b.total_containers || 1} cont</strong></td>
                            <td class="label">Hàng Hóa / Trọng Lượng:</td>
                            <td>${b.commodity || 'Hàng tổng hợp'}</td>
                        </tr>
                        <tr>
                            <td class="label">Nơi Lấy Rỗng / Hàng:</td>
                            <td colspan="3">${b.pickup_location || '-'}</td>
                        </tr>
                        <tr>
                            <td class="label">Nơi Đóng / Giao Hàng:</td>
                            <td colspan="3" style="font-weight: bold;">${b.delivery_location || '-'}</td>
                        </tr>
                        <tr>
                            <td class="label">Nơi Hạ Bãi / Trả Vỏ:</td>
                            <td colspan="3">${b.dropoff_location || '-'}</td>
                        </tr>
                        <tr>
                            <td class="label">Hẹn Đóng Hàng:</td>
                            <td style="font-weight: bold; color: #0f766e;">${b.loading_date ? (b.loading_date + ' ' + (b.loading_time || '')) : '-'}</td>
                            <td class="label">Hạn Cắt Máng (CY):</td>
                            <td style="font-weight: bold; color: #e11d48;">${b.closing_time || '-'}</td>
                        </tr>
                        <tr>
                            <td class="label">Cước Thỏa Thuận:</td>
                            <td style="font-weight: bold; font-size: 14px; color: #047857;">${new Intl.NumberFormat('vi-VN').format(b.price || 0)} đ</td>
                            <td class="label">Trạng Thái Đơn:</td>
                            <td>${b.status_display || b.status || 'ĐÃ TIẾP NHẬN'}</td>
                        </tr>
                    </table>

                    <div class="signatures">
                        <div class="sig-box">
                            <div class="sig-title">Khách Hàng</div>
                            <div>(Ký & ghi rõ họ tên)</div>
                        </div>
                        <div class="sig-box">
                            <div class="sig-title">Điều Phối Vận Tải</div>
                            <div>(Ký & ghi rõ họ tên)</div>
                        </div>
                        <div class="sig-box">
                            <div class="sig-title">Người Lập Phiếu</div>
                            <div>(Ký & ghi rõ họ tên)</div>
                        </div>
                    </div>

                    <div class="footer-note">
                        <span>* Phiếu tiếp nhận vận tải là căn cứ điều phối và đối chiếu giao nhận hàng hóa.</span>
                        <span>${co.short_name || co.company_name} • Hotline: ${co.phone || '—'}</span>
                    </div>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 300);
    } catch (e) {
        console.error('Lỗi in booking:', e);
        showToast('error', 'Không thể mở lệnh in đơn hàng / booking', 'Lỗi In');
    }
}
window.openDirectPrintBooking = openDirectPrintBooking;

/**
 * Xác nhận xóa booking đang mở trong form chi tiết (Chuẩn BIM Logistics - Soft Delete)
 */
async function confirmDeleteCurrentBooking() {
    const id = document.getElementById('fullpage-booking-id')?.value;
    if (!id) {
        showToast('warning', 'Chưa có đơn hàng nào được lưu để xóa!', 'Thông Báo');
        return;
    }
    let bookingNumber = '';
    const numInput = document.getElementById('fullpage-booking-number');
    if (numInput && numInput.value) bookingNumber = ` (${numInput.value})`;

    const confirmed = await showConfirmModal({
        title: 'Hủy / Xóa Đơn Hàng',
        message: `Bạn có chắc chắn muốn xóa / hủy đơn hàng${bookingNumber} này không?\n\nDữ liệu lịch sử sẽ được bảo lưu an toàn (Soft-Delete).`,
        confirmText: 'Xác Nhận Xóa',
        cancelText: 'Hủy bỏ',
        type: 'danger',
        icon: 'ph-bold ph-trash text-2xl'
    });
    if (!confirmed) return;

    try {
        const res = await fetchWithAuth(`/api/bookings/${id}/`, {
            method: 'DELETE'
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || data.error || data.detail || 'Lỗi khi xóa đơn hàng');

        showToast('success', data.message || 'Đã xóa / hủy đơn hàng thành công!', 'Thành Công');
        if (typeof loadSalesData === 'function') loadSalesData();
        if (typeof loadActiveBookingsForModal === 'function') loadActiveBookingsForModal();
        if (typeof backToBookings === 'function') backToBookings();
    } catch (err) {
        console.error('Error deleting booking:', err);
        showToast('error', err.message || 'Không thể xóa đơn hàng / booking', 'Lỗi');
    }
}
window.confirmDeleteCurrentBooking = confirmDeleteCurrentBooking;
