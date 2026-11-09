// -----------------------------------------------------------------------------
// DISPATCHER ADVANCE FUND CRUD (VIEW, EDIT, SAVE, PRINT, DELETE)
// -----------------------------------------------------------------------------
function setDispatcherFundFormDisabled(disabled) {
    const fields = ['fund-inp-dispatcher', 'fund-inp-amount', 'fund-inp-date', 'fund-inp-purpose', 'fund-inp-notes'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = disabled;
    });
}

async function viewDispatcherFundDetail(fundId) {
    if (!fundId) return;
    const modal = document.getElementById('modal-dispatcher-fund');
    if (!modal) return;

    try {
        const res = await fetchWithAuth(`/api/accounting/dispatcher-funds/${fundId}/`);
        if (!res.ok) throw new Error('Không thể tải dữ liệu Quỹ Điều Vận');
        const data = await res.json();
        const fund = data.fund;
        currentActiveDispatcherFund = fund;

        const modeInp = document.getElementById('fund-mode');
        if (modeInp) modeInp.value = 'view';
        const editIdInp = document.getElementById('fund-edit-id');
        if (editIdInp) editIdInp.value = fund.id;

        const titleEl = document.getElementById('fund-modal-title');
        if (titleEl) titleEl.innerText = `Quỹ Điều Vận [${fund.code}]`;
        const subEl = document.getElementById('fund-modal-subtitle');
        if (subEl) subEl.innerText = `Nhân viên quản lý quỹ: ${fund.dispatcher_name} • SĐT: ${fund.dispatcher_phone || '-'}`;

        const badgeEl = document.getElementById('fund-modal-badge');
        if (badgeEl) {
            badgeEl.innerText = fund.code;
            badgeEl.classList.remove('hidden');
        }

        // Cập nhật banner trạng thái
        const bannerEl = document.getElementById('fund-detail-banner');
        const bannerIcon = document.getElementById('fund-banner-icon');
        const bannerText = document.getElementById('fund-banner-text');
        const bannerBadge = document.getElementById('fund-banner-status-badge');
        if (bannerEl) {
            bannerEl.classList.remove('hidden');
            if (fund.status === 'APPROVED') {
                bannerEl.className = 'p-3 rounded-xl border flex items-center justify-between text-xs bg-emerald-50 border-emerald-200 text-emerald-900';
                if (bannerIcon) bannerIcon.className = 'ph-bold ph-check-circle text-emerald-600 text-base';
                if (bannerText) bannerText.innerText = 'Quỹ đã duyệt & đang lưu hành giải ngân tạm ứng cho các chuyến xe';
                if (bannerBadge) {
                    bannerBadge.className = 'px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300';
                    bannerBadge.innerText = 'ĐANG LƯU HÀNH';
                }
            } else if (fund.status === 'SETTLED') {
                bannerEl.className = 'p-3 rounded-xl border flex items-center justify-between text-xs bg-slate-50 border-slate-200 text-slate-800';
                if (bannerIcon) bannerIcon.className = 'ph-bold ph-lock-key text-slate-600 text-base';
                if (bannerText) bannerText.innerText = 'Quỹ điều vận đã quyết toán hoàn ứng xong về công ty';
                if (bannerBadge) {
                    bannerBadge.className = 'px-2.5 py-0.5 rounded-full text-[11px] font-black bg-slate-200 text-slate-700 border border-slate-300';
                    bannerBadge.innerText = 'ĐÃ HOÀN ỨNG';
                }
            } else if (fund.status === 'PENDING') {
                bannerEl.className = 'p-3 rounded-xl border flex items-center justify-between text-xs bg-amber-50 border-amber-200 text-amber-900';
                if (bannerIcon) bannerIcon.className = 'ph-bold ph-hourglass-medium text-amber-600 text-base';
                if (bannerText) bannerText.innerText = 'Đề xuất tạm ứng quỹ đang chờ Kế toán / Ban Giám Đốc phê duyệt';
                if (bannerBadge) {
                    bannerBadge.className = 'px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-300';
                    bannerBadge.innerText = 'CHỜ DUYỆT';
                }
            } else {
                bannerEl.className = 'p-3 rounded-xl border flex items-center justify-between text-xs bg-rose-50 border-rose-200 text-rose-900';
                if (bannerIcon) bannerIcon.className = 'ph-bold ph-x-circle text-rose-600 text-base';
                if (bannerText) bannerText.innerText = 'Đề xuất cấp quỹ đã bị từ chối';
                if (bannerBadge) {
                    bannerBadge.className = 'px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-300';
                    bannerBadge.innerText = 'TỪ CHỐI';
                }
            }
        }

        // Điền dữ liệu
        const dispSelect = document.getElementById('fund-inp-dispatcher');
        if (dispSelect) {
            let opt = Array.from(dispSelect.options).find(o => o.value == fund.dispatcher_id);
            if (!opt) {
                opt = new Option(fund.dispatcher_name, fund.dispatcher_id, true, true);
                dispSelect.add(opt);
            }
            dispSelect.value = fund.dispatcher_id;
        }

        const amountInp = document.getElementById('fund-inp-amount');
        if (amountInp) amountInp.value = formatMoneyVND(fund.amount);

        const dateInp = document.getElementById('fund-inp-date');
        if (dateInp) dateInp.value = fund.advance_date;

        const purposeInp = document.getElementById('fund-inp-purpose');
        if (purposeInp) purposeInp.value = fund.purpose || '';

        const notesInp = document.getElementById('fund-inp-notes');
        if (notesInp) notesInp.value = fund.notes || '';

        // Khối tóm tắt dòng tiền quỹ
        const statsBox = document.getElementById('fund-box-money-stats');
        if (statsBox) {
            statsBox.classList.remove('hidden');
            const disEl = document.getElementById('fund-display-disbursed');
            if (disEl) disEl.innerText = formatMoneyVND(fund.disbursed_amount);
            const setEl = document.getElementById('fund-display-settled');
            if (setEl) setEl.innerText = formatMoneyVND(fund.settled_amount);
            const remEl = document.getElementById('fund-display-remaining');
            if (remEl) remEl.innerText = formatMoneyVND(fund.remaining_balance);

            const appByEl = document.getElementById('fund-display-approved-by');
            if (appByEl) appByEl.innerText = fund.approved_by || 'Chờ duyệt';
            const appAtEl = document.getElementById('fund-display-approved-at');
            if (appAtEl) appAtEl.innerText = fund.approved_at || '';
        }

        // Chuyển footer
        const footerCreate = document.getElementById('fund-footer-create');
        if (footerCreate) footerCreate.classList.add('hidden');
        const footerDetail = document.getElementById('fund-footer-detail');
        if (footerDetail) footerDetail.classList.remove('hidden');

        setDispatcherFundFormDisabled(true);
        const btnEdit = document.getElementById('btn-fund-edit');
        if (btnEdit) btnEdit.classList.remove('hidden');
        const btnSave = document.getElementById('btn-fund-save');
        if (btnSave) btnSave.classList.add('hidden');

        modal.classList.remove('hidden');
    } catch (err) {
        showToast('danger', err.message || 'Lỗi khi tải chi tiết Quỹ Điều Vận');
    }
}

function enableDispatcherFundEdit() {
    if (!currentActiveDispatcherFund) return;
    const isSettled = currentActiveDispatcherFund.status === 'SETTLED';

    if (isSettled) {
        const notesInp = document.getElementById('fund-inp-notes');
        if (notesInp) notesInp.disabled = false;
        showToast('info', 'Quỹ đã chốt hoàn ứng, bạn chỉ có thể hiệu chỉnh ghi chú');
    } else {
        const fields = ['fund-inp-amount', 'fund-inp-date', 'fund-inp-purpose', 'fund-inp-notes'];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = false;
        });
        showToast('info', 'Đã mở khóa các trường thông tin Quỹ Điều Vận');
    }

    const btnEdit = document.getElementById('btn-fund-edit');
    if (btnEdit) btnEdit.classList.add('hidden');
    const btnSave = document.getElementById('btn-fund-save');
    if (btnSave) btnSave.classList.remove('hidden');
}

async function saveDispatcherFundUpdate() {
    if (!currentActiveDispatcherFund) return;
    const fundId = currentActiveDispatcherFund.id;

    const amountStr = document.getElementById('fund-inp-amount')?.value;
    const advanceDate = document.getElementById('fund-inp-date')?.value;
    const purpose = document.getElementById('fund-inp-purpose')?.value;
    const notes = document.getElementById('fund-inp-notes')?.value;

    const payload = {
        amount: amountStr,
        advance_date: advanceDate,
        purpose: purpose,
        notes: notes
    };

    try {
        const res = await fetchWithAuth(`/api/accounting/dispatcher-funds/${fundId}/`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message || 'Cập nhật Quỹ Điều Vận thành công', 'Lưu Thành Công');
            await viewDispatcherFundDetail(fundId);
            if (typeof loadAccountingAdvancesData === 'function') {
                loadAccountingAdvancesData();
            }
        } else {
            showToast('danger', data.error || 'Không thể cập nhật Quỹ Điều Vận');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

async function confirmDeleteDispatcherFund(fundId = null) {
    const targetId = fundId || (currentActiveDispatcherFund ? currentActiveDispatcherFund.id : null);
    if (!targetId) return;

    if (currentActiveDispatcherFund && currentActiveDispatcherFund.disbursed_amount > 0) {
        showToast('warning', 'Không thể xóa Quỹ Điều Vận đã giải ngân cho các chuyến xe!');
        return;
    }

    const confirmed = await showConfirmModal({
        title: 'Xóa Quỹ Điều Vận',
        message: `Bạn có chắc chắn muốn XÓA Quỹ Tạm Ứng Điều Vận này?

Thao tác này chỉ thực hiện được khi quỹ chưa giải ngân tiền cho chuyến nào.`,
        confirmText: 'Xóa Quỹ',
        cancelText: 'Hủy Bỏ',
        type: 'danger',
        icon: 'ph-bold ph-trash text-2xl'
    });
    if (!confirmed) return;

    try {
        const res = await fetchWithAuth(`/api/accounting/dispatcher-funds/${targetId}/`, {
            method: 'DELETE'
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message || 'Đã xóa Quỹ Điều Vận thành công', 'Xóa Thành Công');
            closeDispatcherFundModal();
            if (typeof loadAccountingAdvancesData === 'function') {
                loadAccountingAdvancesData();
            }
        } else {
            showToast('danger', data.error || 'Không thể xóa Quỹ Điều Vận');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

function printCurrentDispatcherFund() {
    if (currentActiveDispatcherFund) {
        printDispatcherFundVoucher(currentActiveDispatcherFund.id);
    }
}

async function printDispatcherFundVoucher(fundId) {
    if (!fundId) return;
    try {
        const res = await fetchWithAuth(`/api/accounting/dispatcher-funds/${fundId}/`);
        if (!res.ok) throw new Error('Không thể tải Quỹ Điều Vận để in');
        const data = await res.json();
        const fund = data.fund;

        const company = window.SYSTEM_COMPANY || {};
        const compName = company.name || 'CÔNG TY TNHH CUNG ỨNG GIẢI PHÁP XANH';
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
    <title>Phiếu Xuất Quỹ Tạm Ứng Điều Vận - ${escapeHtml(fund.code)}</title>
    <style>
        @page { size: A4 portrait; margin: 15mm 18mm; }
        body { font-family: "Times New Roman", Times, serif; font-size: 13pt; line-height: 1.4; color: #111; margin: 0; padding: 20px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 1px solid #ddd; padding-bottom: 12px; }
        .company-info { font-size: 10pt; line-height: 1.3; }
        .company-name { font-weight: bold; font-size: 12pt; text-transform: uppercase; color: #3730a3; }
        .voucher-title-box { text-align: center; margin: 15px 0 20px 0; }
        .voucher-title { font-size: 18pt; font-weight: bold; text-transform: uppercase; margin: 0; }
        .voucher-sub { font-size: 11pt; font-style: italic; margin-top: 4px; }
        .voucher-meta { text-align: right; font-size: 10pt; }
        .content-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
        .content-table td { padding: 6px 4px; vertical-align: top; }
        .label { font-weight: bold; width: 220px; }
        .money-box { border: 2px dashed #3730a3; background: #eef2ff; padding: 12px 18px; border-radius: 6px; margin: 15px 0 25px 0; }
        .signatures { width: 100%; margin-top: 35px; border-collapse: collapse; text-align: center; }
        .signatures td { vertical-align: top; width: 25%; padding: 4px; font-size: 11pt; }
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
        <button onclick="window.print()" style="padding: 8px 18px; background: #3730a3; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
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
            <div><strong>Mẫu số: 02-TT</strong></div>
            <div style="font-size: 9pt; font-style: italic;">(Ban hành theo TT 200/2014/TT-BTC)</div>
            <div style="margin-top: 4px;">Số: <strong>${escapeHtml(fund.code)}</strong></div>
            <div>Quyển số: QĐV-2026</div>
        </div>
    </div>

    <div class="voucher-title-box">
        <h1 class="voucher-title">PHIẾU XUẤT CẤP QUỸ TẠM ỨNG ĐIỀU VẬN</h1>
        <div class="voucher-sub">Ngày ${fund.advance_date ? fund.advance_date.split('-').reverse().join(' tháng ') : '..... tháng .....'} năm 2026</div>
    </div>

    <table class="content-table">
        <tr>
            <td class="label">Người nhận quỹ / Chức danh:</td>
            <td><strong>${escapeHtml(fund.dispatcher_name)}</strong> - Điều Phối Viên / Trưởng Đội Xe</td>
        </tr>
        <tr>
            <td class="label">Bộ phận công tác:</td>
            <td>Phòng Điều Phối & Quản Lý Đội Xe Vận Tải GSS</td>
        </tr>
        <tr>
            <td class="label">Mục đích cấp quỹ:</td>
            <td>${escapeHtml(fund.purpose || 'Quỹ điều vận tạm ứng chuyến xe, phí BOT, nâng hạ cảng & cược vỏ container')}</td>
        </tr>
        <tr>
            <td class="label">Trạng thái quỹ:</td>
            <td><strong>${escapeHtml(fund.status_label || fund.status)}</strong></td>
        </tr>
    </table>

    <div class="money-box">
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 12pt; font-weight: bold;">Tổng số tiền cấp quỹ:</span>
            <span style="font-size: 16pt; font-weight: bold; color: #3730a3;">${formatMoneyVND(fund.amount)}</span>
        </div>
        <div style="font-style: italic; margin-top: 6px; font-size: 11pt;">
            (Bằng chữ: <em>${escapeHtml(numberToWordsVN(fund.amount))}</em>)
        </div>
    </div>

    <div style="font-size: 11pt; margin-bottom: 10px;">
        Ghi chú đề xuất: <em>${escapeHtml(fund.notes || 'Cấp quỹ lưu động cho bộ phận điều vận theo định mức hàng tháng')}</em>
    </div>

    <table class="signatures">
        <tr>
            <td class="sig-title">Ban Giám Đốc</td>
            <td class="sig-title">Kế Toán Trưởng</td>
            <td class="sig-title">Thủ Quỹ</td>
            <td class="sig-title">Người Nhận Quỹ</td>
        </tr>
        <tr>
            <td class="sig-sub">(Ký, họ tên, đóng dấu)</td>
            <td class="sig-sub">(Ký, họ tên)</td>
            <td class="sig-sub">(Ký, họ tên)</td>
            <td class="sig-sub">(Ký, họ tên)</td>
        </tr>
        <tr class="sig-space">
            <td></td><td></td><td></td><td></td>
        </tr>
        <tr>
            <td style="font-weight: bold;"></td>
            <td style="font-weight: bold;">${escapeHtml(fund.approved_by || '')}</td>
            <td style="font-weight: bold;"></td>
            <td style="font-weight: bold;">${escapeHtml(fund.dispatcher_name)}</td>
        </tr>
    </table>
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
