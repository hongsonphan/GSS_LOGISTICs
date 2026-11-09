function printSettlementAdvanceVoucher() {
    if (!currentActiveAdvance) {
        showToast('warning', 'Chưa có thông tin phiếu quyết toán');
        return;
    }
    const adv = currentActiveAdvance;
    const actualSpent = document.getElementById('settle-adv-actual-spent')?.value || adv.actual_spent || 0;
    const notes = document.getElementById('settle-adv-notes')?.value || adv.settlement_notes || '';

    const company = window.SYSTEM_COMPANY || {};
    const compName = company.name || 'CÔNG TY TNHH CUNG ỨNG GIẢI PHÁP XANH';
    const compAddress = company.address || 'Hồ Chí Minh, Việt Nam';

    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) {
        alert('Trình duyệt đã chặn cửa sổ in (Pop-up). Vui lòng cho phép mở pop-up.');
        return;
    }

    const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Biên Bản Hoàn Ứng Quyết Toán - ${escapeHtml(adv.code)}</title>
    <style>
        @page { size: A4 portrait; margin: 15mm 18mm; }
        body { font-family: "Times New Roman", Times, serif; font-size: 13pt; line-height: 1.4; color: #111; margin: 0; padding: 20px; }
        .header { display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 15px; }
        .title { text-align: center; font-size: 18pt; font-weight: bold; text-transform: uppercase; margin: 15px 0 5px 0; }
        .sub { text-align: center; font-style: italic; font-size: 11pt; margin-bottom: 20px; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .table td { padding: 6px 4px; }
        .money-box { border: 2px solid #047857; background: #f0fdf4; padding: 12px; border-radius: 6px; margin: 15px 0; }
        .signatures { width: 100%; margin-top: 35px; border-collapse: collapse; text-align: center; }
        .signatures td { vertical-align: top; width: 33%; padding: 4px; font-size: 11pt; }
        @media print { .no-print { display: none !important; } body { padding: 0; } }
    </style>
</head>
<body>
    <div class="no-print" style="margin-bottom: 20px; padding: 10px; background: #f1f5f9; border-radius: 8px; text-align: right;">
        <button onclick="window.print()" style="padding: 8px 18px; background: #047857; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">In Biên Bản (A4)</button>
        <button onclick="window.close()" style="padding: 8px 14px; background: #64748b; color: white; border: none; border-radius: 6px; margin-left: 8px; cursor: pointer;">Đóng</button>
    </div>

    <div class="header">
        <div>
            <div style="font-weight: bold; font-size: 12pt; text-transform: uppercase; color: #047857;">${escapeHtml(compName)}</div>
            <div style="font-size: 10pt;">${escapeHtml(compAddress)}</div>
        </div>
        <div style="text-align: right; font-size: 10pt;">
            <div>Mã phiếu: <strong>${escapeHtml(adv.code)}</strong></div>
            <div>Chuyến: <strong>${escapeHtml(adv.trip_code)}</strong></div>
        </div>
    </div>

    <div class="title">BIÊN BẢN ĐỐI SOÁT & HOÀN ỨNG CHUYẾN XE</div>
    <div class="sub">Ngày ${new Date().toLocaleDateString('vi-VN')}</div>

    <table class="table">
        <tr>
            <td style="font-weight: bold; width: 220px;">Tài xế nhận tạm ứng:</td>
            <td><strong>${escapeHtml(adv.driver_name)}</strong></td>
        </tr>
        <tr>
            <td style="font-weight: bold;">Chuyến xe vận tải:</td>
            <td><strong>${escapeHtml(adv.trip_code)}</strong> - Biển số xe: <strong>${escapeHtml(adv.license_plate)}</strong></td>
        </tr>
        <tr>
            <td style="font-weight: bold;">Khách hàng & Tuyến:</td>
            <td>${escapeHtml(adv.customer_name)}</td>
        </tr>
        <tr>
            <td style="font-weight: bold;">Số tiền đã tạm ứng:</td>
            <td style="font-weight: bold; font-size: 12pt; color: #0f766e;">${formatMoneyVND(adv.amount)}</td>
        </tr>
        <tr>
            <td style="font-weight: bold;">Tổng chi phí thực tế đã chi:</td>
            <td style="font-weight: bold; font-size: 12pt; color: #1e293b;">${formatMoneyVND(actualSpent)}</td>
        </tr>
    </table>

    <div class="money-box">
        <div style="font-weight: bold; font-size: 12pt;">KẾT QUẢ ĐỐI SOÁT HOÀN ỨNG:</div>
        <div style="font-size: 13pt; margin-top: 6px;">
            ${(Number(adv.amount) - Number(String(actualSpent).replace(/\./g, ''))) > 0 ? 
                `Tài xế nộp lại tiền thừa cho công ty: <strong style="color: #1d4ed8;">+${formatMoneyVND(Number(adv.amount) - Number(String(actualSpent).replace(/\./g, '')))}</strong>` : 
                ((Number(adv.amount) - Number(String(actualSpent).replace(/\./g, ''))) < 0 ? 
                    `Công ty chi trả bù thêm cho tài xế: <strong style="color: #b91c1c;">-${formatMoneyVND(Math.abs(Number(adv.amount) - Number(String(actualSpent).replace(/\./g, ''))))}</strong>` : 
                    `<strong style="color: #047857;">Hai bên đối soát khớp đúng 100% (0 đ)</strong>`)}
        </div>
    </div>

    <div style="font-size: 11pt; margin-top: 10px;">
        Ghi chú đối soát: <em>${escapeHtml(notes || 'Đã đối chiếu đủ hóa đơn, vé cầu đường và chứng từ hợp lệ.')}</em>
    </div>

    <table class="signatures">
        <tr>
            <td style="font-weight: bold;">Kế Toán Đối Soát</td>
            <td style="font-weight: bold;">Điều Phối Đội Xe</td>
            <td style="font-weight: bold;">Tài Xế Hoàn Ứng</td>
        </tr>
        <tr>
            <td style="font-style: italic; font-size: 9.5pt;">(Ký, họ tên)</td>
            <td style="font-style: italic; font-size: 9.5pt;">(Ký, họ tên)</td>
            <td style="font-style: italic; font-size: 9.5pt;">(Ký, họ tên)</td>
        </tr>
        <tr style="height: 75px;"><td></td><td></td><td></td></tr>
        <tr>
            <td></td><td></td><td style="font-weight: bold;">${escapeHtml(adv.driver_name)}</td>
        </tr>
    </table>
</body>
</html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
}
window.viewDriverAdvanceDetail = viewDriverAdvanceDetail;
window.enableDriverAdvanceEdit = enableDriverAdvanceEdit;
window.saveDriverAdvanceUpdate = saveDriverAdvanceUpdate;
window.confirmDeleteDriverAdvance = confirmDeleteDriverAdvance;
window.printCurrentDriverAdvance = printCurrentDriverAdvance;
window.printDriverAdvanceVoucher = printDriverAdvanceVoucher;
window.printSettlementAdvanceVoucher = printSettlementAdvanceVoucher;
window.openDriverAdvanceModal = openDriverAdvanceModal;
window.setDriverAdvanceFormDisabled = setDriverAdvanceFormDisabled;
