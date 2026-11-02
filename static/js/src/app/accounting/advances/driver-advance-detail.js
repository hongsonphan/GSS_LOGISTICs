// BIM ACCOUNTING ADVANCES & FUNDS - COMPREHENSIVE CRUD (VIEW, EDIT, SAVE, PRINT, DELETE)
// =============================================================================
let currentActiveDriverAdvance = null;
let currentActiveDispatcherFund = null;

function setDriverAdvanceFormDisabled(disabled) {
    const fields = ['adv-inp-trip', 'adv-inp-driver', 'adv-inp-amount', 'adv-inp-date', 'adv-inp-fund', 'adv-inp-purpose', 'adv-inp-notes'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = disabled;
    });
    const radios = document.querySelectorAll('input[name="adv_source"]');
    radios.forEach(r => r.disabled = disabled);
}

function openDriverAdvanceModal(tripCode = null) {
    const modal = document.getElementById('modal-driver-advance');
    if (!modal) return;
    currentActiveDriverAdvance = null;

    const modeInp = document.getElementById('adv-mode');
    if (modeInp) modeInp.value = 'create';
    const editIdInp = document.getElementById('adv-edit-id');
    if (editIdInp) editIdInp.value = '';

    const titleEl = document.getElementById('adv-modal-title');
    if (titleEl) titleEl.innerText = 'Cấp Tạm Ứng Chuyến Cho Tài Xế';
    const subEl = document.getElementById('adv-modal-subtitle');
    if (subEl) subEl.innerText = 'Trích Quỹ Điều Vận hoặc Công ty chuyển khoản trực tiếp';

    const badgeEl = document.getElementById('adv-modal-badge');
    if (badgeEl) badgeEl.classList.add('hidden');
    const bannerEl = document.getElementById('adv-detail-banner');
    if (bannerEl) bannerEl.classList.add('hidden');
    const sumEl = document.getElementById('adv-box-settlement-summary');
    if (sumEl) sumEl.classList.add('hidden');

    const footerCreate = document.getElementById('adv-footer-create');
    if (footerCreate) footerCreate.classList.remove('hidden');
    const footerDetail = document.getElementById('adv-footer-detail');
    if (footerDetail) footerDetail.classList.add('hidden');

    setDriverAdvanceFormDisabled(false);

    const dateInp = document.getElementById('adv-inp-date');
    if (dateInp) dateInp.value = new Date().toISOString().slice(0, 10);

    const amountInp = document.getElementById('adv-inp-amount');
    if (amountInp) amountInp.value = '1.500.000';

    const purposeInp = document.getElementById('adv-inp-purpose');
    if (purposeInp) purposeInp.value = 'Chi phí cầu đường BOT, nâng hạ cảng, cược vỏ cont, kiểm dịch';

    const notesInp = document.getElementById('adv-inp-notes');
    if (notesInp) notesInp.value = '';

    const srcFund = document.getElementById('adv-src-fund');
    if (srcFund) srcFund.checked = true;
    toggleAdvanceSourceType();

    if (tripCode && accountingAdvancesData && accountingAdvancesData.available_trips) {
        const found = accountingAdvancesData.available_trips.find(t => t.trip_code === tripCode);
        if (found) {
            const tripSelect = document.getElementById('adv-inp-trip');
            if (tripSelect) {
                tripSelect.value = found.id;
                onAdvanceTripChange();
            }
        }
    }
    modal.classList.remove('hidden');
}

async function viewDriverAdvanceDetail(advanceId) {
    if (!advanceId) return;
    const modal = document.getElementById('modal-driver-advance');
    if (!modal) return;

    try {
        const res = await fetchWithAuth(`/api/accounting/driver-advances/${advanceId}/`);
        if (!res.ok) throw new Error('Không thể tải dữ liệu phiếu tạm ứng');
        const data = await res.json();
        const adv = data.advance;
        currentActiveDriverAdvance = adv;

        const modeInp = document.getElementById('adv-mode');
        if (modeInp) modeInp.value = 'view';
        const editIdInp = document.getElementById('adv-edit-id');
        if (editIdInp) editIdInp.value = adv.id;

        const titleEl = document.getElementById('adv-modal-title');
        if (titleEl) titleEl.innerText = `Phiếu Tạm Ứng [${adv.code}]`;
        const subEl = document.getElementById('adv-modal-subtitle');
        if (subEl) subEl.innerText = `Chuyến: ${adv.trip_code} • Xe: ${adv.license_plate} • Tài xế: ${adv.driver_name}`;

        const badgeEl = document.getElementById('adv-modal-badge');
        if (badgeEl) {
            badgeEl.innerText = adv.code;
            badgeEl.classList.remove('hidden');
        }

        // Cập nhật banner trạng thái
        const bannerEl = document.getElementById('adv-detail-banner');
        const bannerIcon = document.getElementById('adv-banner-icon');
        const bannerText = document.getElementById('adv-banner-text');
        const bannerBadge = document.getElementById('adv-banner-status-badge');
        if (bannerEl) {
            bannerEl.classList.remove('hidden');
            if (adv.status === 'SETTLED') {
                bannerEl.className = 'p-3 rounded-xl border flex items-center justify-between text-xs bg-emerald-50 border-emerald-200 text-emerald-900';
                if (bannerIcon) bannerIcon.className = 'ph-bold ph-check-circle text-emerald-600 text-base';
                if (bannerText) bannerText.innerText = 'Phiếu tạm ứng đã hoàn tất quyết toán & chốt sổ sổ quỹ';
                if (bannerBadge) {
                    bannerBadge.className = 'px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300';
                    bannerBadge.innerText = 'ĐÃ HOÀN ỨNG';
                }
            } else {
                bannerEl.className = 'p-3 rounded-xl border flex items-center justify-between text-xs bg-amber-50 border-amber-200 text-amber-900';
                if (bannerIcon) bannerIcon.className = 'ph-bold ph-hourglass-medium text-amber-600 text-base';
                if (bannerText) bannerText.innerText = 'Phiếu đang tạm ứng lưu hành (Chờ chuyến xe kết thúc để quyết toán)';
                if (bannerBadge) {
                    bannerBadge.className = 'px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-300';
                    bannerBadge.innerText = 'ĐANG TẠM ỨNG';
                }
            }
        }

        // Điền dữ liệu vào form
        const tripSelect = document.getElementById('adv-inp-trip');
        if (tripSelect) {
            // Đảm bảo option chuyến xe có mặt
            let opt = Array.from(tripSelect.options).find(o => o.value == adv.trip_id);
            if (!opt) {
                opt = new Option(`[${adv.trip_code}] ${adv.route_name || ''} - ${adv.license_plate}`, adv.trip_id, true, true);
                tripSelect.add(opt);
            }
            tripSelect.value = adv.trip_id;
        }

        const drvSelect = document.getElementById('adv-inp-driver');
        if (drvSelect) {
            let opt = Array.from(drvSelect.options).find(o => o.value == adv.driver_id);
            if (!opt) {
                opt = new Option(adv.driver_name, adv.driver_id, true, true);
                drvSelect.add(opt);
            }
            drvSelect.value = adv.driver_id;
        }

        const amountInp = document.getElementById('adv-inp-amount');
        if (amountInp) amountInp.value = formatMoneyVND(adv.amount);

        const dateInp = document.getElementById('adv-inp-date');
        if (dateInp) dateInp.value = adv.advance_date;

        const purposeInp = document.getElementById('adv-inp-purpose');
        if (purposeInp) purposeInp.value = adv.purpose || '';

        const notesInp = document.getElementById('adv-inp-notes');
        if (notesInp) notesInp.value = adv.notes || '';

        // Nguồn tiền
        if (adv.advance_source === 'DISPATCHER_FUND') {
            const rFund = document.getElementById('adv-src-fund');
            if (rFund) rFund.checked = true;
            const fundSelect = document.getElementById('adv-inp-fund');
            if (fundSelect && adv.dispatcher_fund_id) {
                let opt = Array.from(fundSelect.options).find(o => o.value == adv.dispatcher_fund_id);
                if (!opt) {
                    opt = new Option(`[${adv.fund_code}] Quỹ Điều Vận`, adv.dispatcher_fund_id, true, true);
                    fundSelect.add(opt);
                }
                fundSelect.value = adv.dispatcher_fund_id;
            }
        } else {
            const rDirect = document.getElementById('adv-src-direct');
            if (rDirect) rDirect.checked = true;
        }
        toggleAdvanceSourceType();

        // Khối tóm tắt quyết toán nếu đã settled
        const sumBox = document.getElementById('adv-box-settlement-summary');
        if (sumBox) {
            if (adv.status === 'SETTLED') {
                sumBox.classList.remove('hidden');
                const spentEl = document.getElementById('adv-display-actual-spent');
                if (spentEl) spentEl.innerText = formatMoneyVND(adv.actual_spent);

                const diffLabel = document.getElementById('adv-display-diff-label');
                const diffVal = document.getElementById('adv-display-diff-val');
                if (diffVal) {
                    if (adv.settlement_diff_type === 'DRIVER_REFUND') {
                        if (diffLabel) diffLabel.innerText = 'Tài xế đã nộp lại tiền thừa:';
                        diffVal.innerText = `+${formatMoneyVND(adv.refund_amount)}`;
                        diffVal.className = 'font-black tabular-nums font-mono text-sm text-blue-700';
                    } else if (adv.settlement_diff_type === 'COMPANY_REIMBURSE') {
                        if (diffLabel) diffLabel.innerText = 'Công ty đã chi trả bù cho tài xế:';
                        diffVal.innerText = `-${formatMoneyVND(adv.reimburse_amount)}`;
                        diffVal.className = 'font-black tabular-nums font-mono text-sm text-rose-700';
                    } else {
                        if (diffLabel) diffLabel.innerText = 'Kết quả đối soát:';
                        diffVal.innerText = 'Khớp đúng 100% (0 đ)';
                        diffVal.className = 'font-black tabular-nums font-mono text-sm text-emerald-700';
                    }
                }

                const settledByEl = document.getElementById('adv-display-settled-by');
                if (settledByEl) settledByEl.innerText = adv.settled_by || 'Kế toán';
                const settledAtEl = document.getElementById('adv-display-settled-at');
                if (settledAtEl) settledAtEl.innerText = adv.settled_at || '';
            } else {
                sumBox.classList.add('hidden');
            }
        }

        // Chuyển footer sang cụm chi tiết: Xóa | In, Sửa, Lưu, Đóng
        const footerCreate = document.getElementById('adv-footer-create');
        if (footerCreate) footerCreate.classList.add('hidden');
        const footerDetail = document.getElementById('adv-footer-detail');
        if (footerDetail) footerDetail.classList.remove('hidden');

        // Mặc định ở chế độ xem: Khóa form, ẩn nút Lưu, hiện nút Sửa
        setDriverAdvanceFormDisabled(true);
        const btnEdit = document.getElementById('btn-adv-edit');
        if (btnEdit) btnEdit.classList.remove('hidden');
        const btnSave = document.getElementById('btn-adv-save');
        if (btnSave) btnSave.classList.add('hidden');

        modal.classList.remove('hidden');
    } catch (err) {
        showToast('danger', err.message || 'Lỗi khi tải chi tiết phiếu tạm ứng');
    }
}

function enableDriverAdvanceEdit() {
    if (!currentActiveDriverAdvance) return;
    const isSettled = currentActiveDriverAdvance.status === 'SETTLED';

    if (isSettled) {
        // Đã hoàn ứng: chỉ cho phép sửa ghi chú
        const notesInp = document.getElementById('adv-inp-notes');
        if (notesInp) notesInp.disabled = false;
        showToast('info', 'Phiếu đã chốt hoàn ứng, bạn chỉ có thể hiệu chỉnh ghi chú');
    } else {
        // Đang tạm ứng: mở khóa số tiền, ngày, mục đích, ghi chú
        const fields = ['adv-inp-amount', 'adv-inp-date', 'adv-inp-purpose', 'adv-inp-notes'];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = false;
        });
        showToast('info', 'Đã mở khóa các trường thông tin để chỉnh sửa');
    }

    const btnEdit = document.getElementById('btn-adv-edit');
    if (btnEdit) btnEdit.classList.add('hidden');
    const btnSave = document.getElementById('btn-adv-save');
    if (btnSave) btnSave.classList.remove('hidden');
}

async function saveDriverAdvanceUpdate() {
    if (!currentActiveDriverAdvance) return;
    const advanceId = currentActiveDriverAdvance.id;

    const amountStr = document.getElementById('adv-inp-amount')?.value;
    const advanceDate = document.getElementById('adv-inp-date')?.value;
    const purpose = document.getElementById('adv-inp-purpose')?.value;
    const notes = document.getElementById('adv-inp-notes')?.value;

    const payload = {
        amount: amountStr,
        advance_date: advanceDate,
        purpose: purpose,
        notes: notes
    };

    try {
        const res = await fetchWithAuth(`/api/accounting/driver-advances/${advanceId}/`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message || 'Cập nhật phiếu tạm ứng thành công', 'Lưu Thành Công');
            // Cập nhật lại chế độ xem
            await viewDriverAdvanceDetail(advanceId);
            if (typeof loadAccountingAdvancesData === 'function') {
                loadAccountingAdvancesData();
            }
        } else {
            showToast('danger', data.error || 'Không thể cập nhật phiếu tạm ứng');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

async function confirmDeleteDriverAdvance(advanceId = null) {
    const targetId = advanceId || (currentActiveDriverAdvance ? currentActiveDriverAdvance.id : null);
    if (!targetId) return;

    if (currentActiveDriverAdvance && currentActiveDriverAdvance.status === 'SETTLED') {
        showToast('warning', 'Không thể xóa phiếu tạm ứng đã được quyết toán hoàn ứng chốt sổ!');
        return;
    }

    const confirmed = await showConfirmModal({
        title: 'Xóa Phiếu Tạm Ứng Chuyến',
        message: `Bạn có chắc chắn muốn XÓA VĨNH VIỄN phiếu tạm ứng này?

Số tiền tạm ứng sẽ được hoàn lại vào Quỹ Điều Vận / trừ khỏi chuyến xe.`,
        confirmText: 'Xóa Phiếu',
        cancelText: 'Hủy Bỏ',
        type: 'danger',
        icon: 'ph-bold ph-trash text-2xl'
    });
    if (!confirmed) return;

    try {
        const res = await fetchWithAuth(`/api/accounting/driver-advances/${targetId}/`, {
            method: 'DELETE'
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message || 'Đã xóa phiếu tạm ứng thành công', 'Xóa Thành Công');
            closeDriverAdvanceModal();
            if (typeof loadAccountingAdvancesData === 'function') {
                loadAccountingAdvancesData();
            }
        } else {
            showToast('danger', data.error || 'Không thể xóa phiếu tạm ứng');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

function printCurrentDriverAdvance() {
    if (currentActiveDriverAdvance) {
        printDriverAdvanceVoucher(currentActiveDriverAdvance.id);
    }
}

async function printDriverAdvanceVoucher(advanceId) {
    if (!advanceId) return;
    try {
        const res = await fetchWithAuth(`/api/accounting/driver-advances/${advanceId}/`);
        if (!res.ok) throw new Error('Không thể tải phiếu để in');
        const data = await res.json();
        const adv = data.advance;

        const company = window.SYSTEM_COMPANY || {};
        const compName = company.name || 'CÔNG TY TNHH VẬN TẢI & GIAO NHẬN TRIỀN VÕ';
        const compAddress = company.address || 'Hồ Chí Minh, Việt Nam';
        const compTax = company.tax_code || '0318000000';
        const compPhone = company.phone || '0900.000.000';

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
    <title>Phiếu Chi Tạm Ứng - ${escapeHtml(adv.code)}</title>
    <style>
        @page { size: A4 portrait; margin: 15mm 18mm; }
        body { font-family: "Times New Roman", Times, serif; font-size: 13pt; line-height: 1.4; color: #111; margin: 0; padding: 20px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 1px solid #ddd; padding-bottom: 12px; }
        .company-info { font-size: 10pt; line-height: 1.3; }
        .company-name { font-weight: bold; font-size: 12pt; text-transform: uppercase; color: #0f766e; }
        .voucher-title-box { text-align: center; margin: 15px 0 20px 0; }
        .voucher-title { font-size: 18pt; font-weight: bold; text-transform: uppercase; margin: 0; }
        .voucher-sub { font-size: 11pt; font-style: italic; margin-top: 4px; }
        .voucher-meta { text-align: right; font-size: 10pt; }
        .content-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
        .content-table td { padding: 6px 4px; vertical-align: top; }
        .label { font-weight: bold; width: 220px; }
        .dots { border-bottom: 1px dotted #999; }
        .money-box { border: 2px dashed #0f766e; background: #f0fdfa; padding: 12px 18px; border-radius: 6px; margin: 15px 0 25px 0; }
        .signatures { width: 100%; margin-top: 35px; border-collapse: collapse; text-align: center; }
        .signatures td { vertical-align: top; width: 20%; padding: 4px; font-size: 11pt; }
        .sig-title { font-weight: bold; }
        .sig-sub { font-style: italic; font-size: 9.5pt; color: #555; }
        .sig-space { height: 75px; }
        @media print {
            .no-print { display: none !important; }
            body { padding: 0; }
        }
    </style>
</head>
<body>
    <div class="no-print" style="margin-bottom: 20px; padding: 10px; background: #f1f5f9; border-radius: 8px; text-align: right;">
        <button onclick="window.print()" style="padding: 8px 18px; background: #0f766e; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
            In Phiếu (Print A4)
        </button>
        <button onclick="window.close()" style="padding: 8px 14px; background: #64748b; color: white; border: none; border-radius: 6px; margin-left: 8px; cursor: pointer;">
            Đóng
        </button>
    </div>

    <div class="header">
        <div class="company-info">
            <div class="company-name">${escapeHtml(compName)}</div>
            <div>Địa chỉ: ${escapeHtml(compAddress)}</div>
            <div>Mã số thuế: ${escapeHtml(compTax)} | Điện thoại: ${escapeHtml(compPhone)}</div>
        </div>
        <div class="voucher-meta">
            <div><strong>Mẫu số: 02-TT / C40-BB</strong></div>
            <div style="font-size: 9pt; font-style: italic;">(Ban hành theo TT 200/2014/TT-BTC)</div>
            <div style="margin-top: 4px;">Số: <strong>${escapeHtml(adv.code)}</strong></div>
            <div>Quyển số: TUTX-2026</div>
        </div>
    </div>

    <div class="voucher-title-box">
        <h1 class="voucher-title">PHIẾU CHI TẠM ỨNG CHUYẾN XE</h1>
        <div class="voucher-sub">Ngày ${adv.advance_date ? adv.advance_date.split('-').reverse().join(' tháng ') : '..... tháng .....'} năm 2026</div>
    </div>

    <table class="content-table">
        <tr>
            <td class="label">Họ và tên người nhận tiền:</td>
            <td><strong>${escapeHtml(adv.driver_name)}</strong> ${adv.driver_phone ? `(SĐT: ${escapeHtml(adv.driver_phone)})` : ''}</td>
        </tr>
        <tr>
            <td class="label">Bộ phận / Vị trí:</td>
            <td>Đội xe vận tải đường bộ - Tài xế điều khiển phương tiện</td>
        </tr>
        <tr>
            <td class="label">Chuyến xe thực hiện:</td>
            <td><strong style="color: #0f766e;">${escapeHtml(adv.trip_code)}</strong> - Biển số xe: <strong>${escapeHtml(adv.license_plate || '-')}</strong></td>
        </tr>
        <tr>
            <td class="label">Khách hàng & Tuyến đường:</td>
            <td>${escapeHtml(adv.customer_name || 'Khách hàng')} - Tuyến: ${escapeHtml(adv.route_name || '-')}</td>
        </tr>
        <tr>
            <td class="label">Nguồn tiền tạm ứng:</td>
            <td>${adv.advance_source === 'DISPATCHER_FUND' ? `Trích Quỹ Điều Vận (${escapeHtml(adv.fund_code || 'QĐV')})` : 'Công ty chi chuyển khoản trực tiếp'}</td>
        </tr>
        <tr>
            <td class="label">Lý do tạm ứng:</td>
            <td>${escapeHtml(adv.purpose || 'Chi phí cầu đường BOT, vé cảng, nâng hạ, cược vỏ cont, kiểm dịch phát sinh chuyến xe')}</td>
        </tr>
    </table>

    <div class="money-box">
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 12pt; font-weight: bold;">Số tiền tạm ứng:</span>
            <span style="font-size: 16pt; font-weight: bold; color: #0f766e;">${formatMoneyVND(adv.amount)}</span>
        </div>
        <div style="font-style: italic; margin-top: 6px; font-size: 11pt;">
            (Bằng chữ: <em>${escapeHtml(numberToWordsVN(adv.amount))}</em>)
        </div>
    </div>

    <div style="font-size: 11pt; margin-bottom: 10px;">
        Ghi chú / Chứng từ kèm theo: <em>${escapeHtml(adv.notes || 'Biên nhận tạm ứng theo chuyến xe')}</em>
    </div>

    <table class="signatures">
        <tr>
            <td class="sig-title">Giám Đốc</td>
            <td class="sig-title">Kế Toán Trưởng</td>
            <td class="sig-title">Thủ Quỹ</td>
            <td class="sig-title">Điều Phối Viên</td>
            <td class="sig-title">Người Nhận Tiền</td>
        </tr>
        <tr>
            <td class="sig-sub">(Ký, họ tên, đóng dấu)</td>
            <td class="sig-sub">(Ký, họ tên)</td>
            <td class="sig-sub">(Ký, họ tên)</td>
            <td class="sig-sub">(Ký, họ tên)</td>
            <td class="sig-sub">(Ký, họ tên)</td>
        </tr>
        <tr class="sig-space">
            <td></td><td></td><td></td><td></td><td></td>
        </tr>
        <tr>
            <td style="font-weight: bold;"></td>
            <td style="font-weight: bold;"></td>
            <td style="font-weight: bold;"></td>
            <td style="font-weight: bold;"></td>
            <td style="font-weight: bold;">${escapeHtml(adv.driver_name)}</td>
        </tr>
    </table>

    <div style="margin-top: 35px; border-top: 1px dashed #bbb; padding-top: 8px; font-size: 9.5pt; font-style: italic; color: #666; text-align: center;">
        Tài xế có trách nhiệm thu thập đầy đủ hóa đơn GTGT / vé điện tử và hoàn ứng quyết toán trong vòng 24 giờ sau khi kết thúc chuyến xe.
    </div>
</body>
</html>
        `;

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
    } catch (err) {
        showToast('danger', err.message || 'Lỗi khi in phiếu');
    }
}
