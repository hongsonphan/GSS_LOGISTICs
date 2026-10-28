// ==============================================================================
// 9.5b. PHÂN HỆ XEM, SỬA, LƯU & IN PHIẾU THU / CHI TOÀN MÀN HÌNH (DEDICATED FULL-PAGE VIEW)
// URL Chuẩn: /accounting/vouchers/<id_or_code>
// ==============================================================================
let currentActiveFullpageVoucher = null;


function renderFullpageVoucherContent(tx) {
    if (!tx) return;
    const isInflow = tx.transaction_type === 'INFLOW';
    const titleText = isInflow ? 'PHIẾU THU' : 'PHIẾU CHI';
    const topTitleText = isInflow ? 'Phiếu Thu Sổ Quỹ (Mẫu 01-TT BTC)' : 'Phiếu Chi Sổ Quỹ (Mẫu 02-TT BTC)';
    const templateNoText = isInflow ? 'Mẫu số 01 - TT' : 'Mẫu số 02 - TT';
    const debitAcc = isInflow ? (tx.payment_method === 'BANK' ? '1121' : '1111') : '1411 / 331 / 642';
    const creditAcc = isInflow ? '1411 / 131 / 711' : (tx.payment_method === 'BANK' ? '1121' : '1111');
    const partnerLabel = isInflow ? 'Họ tên người nộp tiền:' : 'Họ tên người nhận tiền:';
    const signPartnerRole = isInflow ? 'Người Nộp Tiền' : 'Người Nhận Tiền';
    const reasonLabel = isInflow ? 'Lý do nộp:' : 'Lý do chi:';

    let day = tx.day || '', month = tx.month || '', year = tx.year || '';
    if (!day && tx.transaction_date) {
        const parts = tx.transaction_date.split('/');
        if (parts.length === 3) {
            day = parts[0]; month = parts[1]; year = parts[2];
        }
    }
    if (!day) {
        const now = new Date();
        day = String(now.getDate()).padStart(2, '0');
        month = String(now.getMonth() + 1).padStart(2, '0');
        year = String(now.getFullYear());
    }

    const dateFormattedText = `Ngày ${day} tháng ${month} năm ${year}`;
    const signDateFormattedText = `Ngày ${day}/${month}/${year}`;
    const amountWords = numberToWordsVN(tx.amount);
    const amountFormatted = new Intl.NumberFormat('vi-VN').format(Math.round(tx.amount || 0)) + ' đ';
    const methodFormatted = tx.payment_method === 'BANK' ? 'Chuyển khoản Ngân hàng' : 'Quỹ Tiền mặt';
    const co = getSystemCompanyProfile();
    const compDisplayName = co.short_name || co.company_name || 'Triền Võ Logistics';
    const departmentFormatted = tx.partner_type_label ? `${tx.partner_type_label} - ${compDisplayName}` : `Đội xe vận tải ${compDisplayName}`;
    const reasonFormatted = tx.notes || tx.category_label || (isInflow ? 'Thu hoàn ứng tiền thừa quyết toán gom chuyến' : 'Chi bù vượt ứng quyết toán gom chuyến');
    const attachmentsFormatted = tx.ref_code ? `01 Bảng kê [${tx.ref_code}] & chứng từ gốc` : '01 Bảng kê quyết toán chuyến & chứng từ gốc';

    const topTitleEl = document.getElementById('fullpage-voucher-top-title');
    if (topTitleEl) topTitleEl.innerText = topTitleText;

    const badgeCodeEl = document.getElementById('fullpage-voucher-badge-code');
    if (badgeCodeEl) {
        badgeCodeEl.innerText = tx.code || '-';
        badgeCodeEl.className = isInflow 
            ? 'px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono'
            : 'px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-50 text-rose-800 border border-rose-200 font-mono';
    }

    const copy2Badge = document.getElementById('fullpage-voucher-copy-2-badge');
    if (copy2Badge) {
        copy2Badge.innerText = isInflow ? 'Liên 2: Giao cho người nộp tiền' : 'Liên 2: Giao cho người nhận tiền';
    }

    const setAllAreaClassText = (cls, val) => {
        document.querySelectorAll(`#fullpage-cash-voucher-printable-area .${cls}`).forEach(el => {
            el.innerText = val;
        });
    };

    setAllAreaClassText('v-template-no', templateNoText);
    setAllAreaClassText('v-code', tx.code || '-');
    setAllAreaClassText('v-debit-acc', debitAcc);
    setAllAreaClassText('v-credit-acc', creditAcc);
    setAllAreaClassText('v-title', titleText);
    setAllAreaClassText('v-date', dateFormattedText);
    setAllAreaClassText('v-sign-date', signDateFormattedText);
    setAllAreaClassText('v-partner-label', partnerLabel);
    setAllAreaClassText('v-sign-partner-role', signPartnerRole);
    setAllAreaClassText('v-partner-name', tx.partner_name || 'Tài xế / Đối tác');
    setAllAreaClassText('v-department', departmentFormatted);
    setAllAreaClassText('v-reason-label', reasonLabel);
    setAllAreaClassText('v-reason', reasonFormatted);
    setAllAreaClassText('v-amount', amountFormatted);
    setAllAreaClassText('v-method', methodFormatted);
    setAllAreaClassText('v-amount-words', amountWords);
    setAllAreaClassText('v-received-words', amountWords);
    setAllAreaClassText('v-creator-name', tx.created_by || 'Kế toán viên');
    setAllAreaClassText('v-attachments', attachmentsFormatted);

    syncCompanyProfileToPrintForms();
}

async function viewCashVoucherDetail(voucherIdentifier, updateHistory = true) {
    if (!voucherIdentifier) return;

    try {
        const res = await fetchWithAuth(`/api/accounting/cashbook/${voucherIdentifier}/`);
        if (!res.ok) throw new Error('Không thể tải chứng từ sổ quỹ');
        const data = await res.json();
        const tx = data.transaction;
        currentActiveFullpageVoucher = tx;

        const voucherCode = tx.code || tx.id;
        const isInflow = tx.transaction_type === 'INFLOW';

        // Cập nhật URL chuẩn: /accounting/vouchers/<code_or_id>
        if (updateHistory && window.history && window.history.pushState) {
            const voucherPath = `/accounting/vouchers/${voucherCode}`;
            if (window.location.pathname !== voucherPath) {
                window.history.pushState({ view: 'cash-voucher-detail', voucherIdentifier: voucherCode }, '', voucherPath);
            }
        }

        // Lưu vết view trước đó
        const currentActiveView = document.querySelector('.view:not(.hidden-view)');
        if (currentActiveView && currentActiveView.id !== 'view-cash-voucher-detail') {
            previousActiveTab = currentActiveView.id.replace('view-', '');
        }

        // Ẩn tất cả views, hiển thị view-cash-voucher-detail
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden-view'));
        const detailView = document.getElementById('view-cash-voucher-detail');
        if (detailView) detailView.classList.remove('hidden-view');

        // Cập nhật Topbar Breadcrumb & Nút Quay Lại Trang Mẹ
        setTopbarFullpageMode({
            backFn: backToAccountingCashbook,
            prefix: 'Tài chính & Kế toán',
            title: isInflow ? `Chi Tiết Phiếu Thu | ${voucherCode}` : `Chi Tiết Phiếu Chi | ${voucherCode}`
        });

        // 1. CẬP NHẬT HEADER TRÊN CÙNG
        const topTitle = document.getElementById('fullpage-voucher-top-title');
        if (topTitle) topTitle.innerText = isInflow ? 'Chi Tiết Phiếu Thu Tiền' : 'Chi Tiết Phiếu Chi Tiền';
        const badgeCode = document.getElementById('fullpage-voucher-badge-code');
        if (badgeCode) {
            badgeCode.innerText = voucherCode;
            badgeCode.className = isInflow 
                ? 'px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono'
                : 'px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-50 text-rose-800 border border-rose-200 font-mono';
        }

        // 2. ẨN TỜ PHÔI IN A4 (Người dùng chỉ xem và làm việc trực tiếp trên Form nhập liệu)
        const printContainer = document.getElementById('fullpage-voucher-printable-container');
        if (printContainer) printContainer.classList.add('hidden');

        // Đồng bộ sẵn dữ liệu vào tờ phôi in ngầm để khi bấm In Phiếu là in được ngay
        renderFullpageVoucherContent(tx);

        // 3. MỞ FORM NHẬP LIỆU CHUẨN ĐỂ XEM VÀ HIỆU CHỈNH TRỰC TIẾP
        const editPanel = document.getElementById('fullpage-voucher-edit-panel');
        if (editPanel) editPanel.classList.remove('hidden');

        const formIcon = document.getElementById('fullpage-voucher-form-icon');
        if (formIcon) formIcon.className = isInflow ? 'ph-bold ph-arrow-down-left text-emerald-700' : 'ph-bold ph-arrow-up-right text-rose-700';
        const formTitle = document.getElementById('fullpage-voucher-form-title');
        if (formTitle) formTitle.innerText = isInflow ? 'Chi Tiết & Hiệu Chỉnh Phiếu Thu' : 'Chi Tiết & Hiệu Chỉnh Phiếu Chi';
        const formSubtitle = document.getElementById('fullpage-voucher-form-subtitle');
        if (formSubtitle) formSubtitle.innerText = 'Xem và chỉnh sửa trực tiếp thông tin phiếu bên dưới, bấm In hoặc Cập Nhật ở chân form';
        const formBadge = document.getElementById('fullpage-voucher-form-badge');
        if (formBadge) {
            formBadge.innerText = 'Xem & Hiệu Chỉnh';
            formBadge.className = 'm-hide text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200';
        }

        // 4. HIỂN THỊ BỘ 4 NÚT THAO TÁC Ở CHÂN FORM
        const btnDelete = document.getElementById('btn-form-delete-voucher');
        if (btnDelete) btnDelete.classList.remove('hidden');
        const btnPrint = document.getElementById('btn-form-print-voucher');
        if (btnPrint) btnPrint.classList.remove('hidden');
        const btnEdit = document.getElementById('btn-form-edit-voucher');
        if (btnEdit) btnEdit.classList.remove('hidden');
        const submitBtnText = document.getElementById('btn-form-submit-voucher-text');
        if (submitBtnText) submitBtnText.innerText = 'Lưu';

        // 5. Điền dữ liệu vào các ô input form
        document.getElementById('edit-voucher-id').value = tx.id || '';
        document.getElementById('edit-voucher-code').value = tx.code || '';
        document.getElementById('edit-voucher-type').value = tx.transaction_type || 'INFLOW';
        document.getElementById('edit-voucher-method').value = tx.payment_method || 'BANK';
        populateEditVoucherCategories(tx.transaction_type || 'INFLOW', tx.category);
        document.getElementById('edit-voucher-amount').value = formatNumberVN(tx.amount || 0);
        document.getElementById('edit-voucher-date').value = tx.transaction_date_iso || '';
        document.getElementById('edit-voucher-ref').value = tx.ref_code || '';
        document.getElementById('edit-voucher-partner-type').value = tx.partner_type || '';
        document.getElementById('edit-voucher-partner-name').value = tx.partner_name || '';
        document.getElementById('edit-voucher-notes').value = tx.notes || '';

        // Ban đầu khóa form ở chế độ Chỉ Xem: Nút Sửa sáng, nút Lưu mờ
        setFullpageVoucherReadOnly(true);

        initAllNumberInputs();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
        console.error('Lỗi tải chi tiết phiếu thu chi:', err);
        showToast('error', 'Không thể tải chứng từ sổ quỹ', 'Lỗi');
        backToAccountingCashbook();
    }
}

function populateEditVoucherCategories(type, selectedCategory = '') {
    const catSelect = document.getElementById('edit-voucher-category');
    if (!catSelect) return;
    if (type === 'INFLOW') {
        catSelect.innerHTML = `
            <option value="FREIGHT_REVENUE">Thu cước vận tải từ khách hàng</option>
            <option value="REIMBURSABLE_COLLECTION">Thu hồi chi hộ (Debit Note)</option>
            <option value="ADVANCE_REFUND">Thu hoàn ứng tiền thừa (Tài xế/Điều vận)</option>
            <option value="OTHER_INFLOW">Thu khác</option>
        `;
    } else {
        catSelect.innerHTML = `
            <option value="DISPATCHER_FUND_ADVANCE">Chi tạm ứng Quỹ Điều vận</option>
            <option value="DRIVER_TRIP_ADVANCE">Chi tạm ứng Chuyến xe (Tài xế)</option>
            <option value="ADVANCE_REIMBURSE">Chi bù vượt ứng (Hoàn ứng tài xế)</option>
            <option value="SUBCONTRACTOR_PAYMENT">Chi thanh toán Thầu phụ / Xe bạn</option>
            <option value="FUEL_PAYMENT">Chi mua xăng dầu</option>
            <option value="ETC_TOPUP">Chi nạp tiền tài khoản BOT/ETC</option>
            <option value="VEHICLE_MAINTENANCE">Chi bảo dưỡng sửa xe</option>
            <option value="OTHER_OUTFLOW">Chi phí khác</option>
        `;
    }
    if (selectedCategory) {
        catSelect.value = selectedCategory;
    }
}

function onEditVoucherTypeChange() {
    const type = document.getElementById('edit-voucher-type')?.value;
    populateEditVoucherCategories(type);
    if (currentActiveFullpageVoucher) {
        currentActiveFullpageVoucher.transaction_type = type;
        renderFullpageVoucherContent(currentActiveFullpageVoucher);
    }
}

function onEditVoucherMethodChange() {
    const method = document.getElementById('edit-voucher-method')?.value;
    if (currentActiveFullpageVoucher) {
        currentActiveFullpageVoucher.payment_method = method;
        renderFullpageVoucherContent(currentActiveFullpageVoucher);
    }
}

function updateLiveVoucherAmount(val) {
    const num = parseNumberVN(val);
    if (currentActiveFullpageVoucher) {
        currentActiveFullpageVoucher.amount = num;
        renderFullpageVoucherContent(currentActiveFullpageVoucher);
    }
}

function updateLiveVoucherDate(isoDate) {
    if (currentActiveFullpageVoucher && isoDate) {
        const parts = isoDate.split('-');
        if (parts.length === 3) {
            currentActiveFullpageVoucher.year = parts[0];
            currentActiveFullpageVoucher.month = parts[1];
            currentActiveFullpageVoucher.day = parts[2];
            currentActiveFullpageVoucher.transaction_date = `${parts[2]}/${parts[1]}/${parts[0]}`;
            renderFullpageVoucherContent(currentActiveFullpageVoucher);
        }
    }
}

function updateLiveVoucherPartnerName(val) {
    if (currentActiveFullpageVoucher) {
        currentActiveFullpageVoucher.partner_name = val;
        renderFullpageVoucherContent(currentActiveFullpageVoucher);
    }
}

function updateLiveVoucherPartnerType(val) {
    if (currentActiveFullpageVoucher) {
        currentActiveFullpageVoucher.partner_type = val;
        renderFullpageVoucherContent(currentActiveFullpageVoucher);
    }
}

function updateLiveVoucherRef(val) {
    if (currentActiveFullpageVoucher) {
        currentActiveFullpageVoucher.ref_code = val;
        renderFullpageVoucherContent(currentActiveFullpageVoucher);
    }
}

function updateLiveVoucherReason(val) {
    if (currentActiveFullpageVoucher) {
        currentActiveFullpageVoucher.notes = val;
        renderFullpageVoucherContent(currentActiveFullpageVoucher);
    }
}

function setFullpageVoucherReadOnly(isReadOnly) {
    const fields = [
        'edit-voucher-type', 'edit-voucher-method', 'edit-voucher-category',
        'edit-voucher-amount', 'edit-voucher-date', 'edit-voucher-ref',
        'edit-voucher-partner-type', 'edit-voucher-partner-name', 'edit-voucher-notes'
    ];
    fields.forEach(fid => {
        const el = document.getElementById(fid);
        if (!el) return;
        if (isReadOnly) {
            el.disabled = true;
            el.classList.add('bg-slate-50', 'cursor-not-allowed');
        } else {
            el.disabled = false;
            el.classList.remove('bg-slate-50', 'cursor-not-allowed');
        }
    });

    const editBtn = document.getElementById('btn-form-edit-voucher');
    const submitBtn = document.getElementById('btn-form-submit-voucher');
    const formBadge = document.getElementById('fullpage-voucher-form-badge');

    if (isReadOnly) {
        if (editBtn) {
            editBtn.classList.remove('hidden', 'opacity-50', 'pointer-events-none');
            editBtn.disabled = false;
        }
        if (submitBtn) {
            submitBtn.classList.add('opacity-50', 'pointer-events-none', 'cursor-not-allowed');
            submitBtn.disabled = true;
        }
        if (formBadge) {
            formBadge.innerText = 'Chế độ: Đang Xem';
            formBadge.className = 'm-hide text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200';
        }
    } else {
        if (editBtn) {
            editBtn.classList.add('opacity-50', 'pointer-events-none');
            editBtn.disabled = true;
        }
        if (submitBtn) {
            submitBtn.classList.remove('opacity-50', 'pointer-events-none', 'cursor-not-allowed');
            submitBtn.disabled = false;
        }
        if (formBadge) {
            formBadge.innerText = 'Chế độ: Đang Chỉnh Sửa';
            formBadge.className = 'm-hide text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200';
        }
    }
}

function enableFullpageVoucherEdit() {
    setFullpageVoucherReadOnly(false);
    const amountInput = document.getElementById('edit-voucher-amount');
    if (amountInput) amountInput.focus();
    showToast('info', 'Đã chuyển sang chế độ Sửa Phiếu. Bạn có thể thay đổi thông tin và bấm "Lưu".', 'Chế Độ Sửa');
}


async function saveFullpageVoucher() {
    const id = document.getElementById('edit-voucher-id')?.value;
    const isNew = !id;

    const type = document.getElementById('edit-voucher-type')?.value;
    const method = document.getElementById('edit-voucher-method')?.value;
    const category = document.getElementById('edit-voucher-category')?.value;
    const amountVal = parseNumberVN(document.getElementById('edit-voucher-amount')?.value);
    const dateVal = document.getElementById('edit-voucher-date')?.value;
    const refCode = document.getElementById('edit-voucher-ref')?.value?.trim();
    const partnerType = document.getElementById('edit-voucher-partner-type')?.value;
    const partnerName = document.getElementById('edit-voucher-partner-name')?.value?.trim();
    const notes = document.getElementById('edit-voucher-notes')?.value?.trim();

    if (!amountVal || amountVal <= 0) {
        showToast('warning', 'Số tiền giao dịch phải lớn hơn 0 đ!', 'Cảnh Báo');
        return;
    }

    try {
        const url = isNew ? '/api/accounting/cashbook/' : `/api/accounting/cashbook/${id}/`;
        const methodHttp = isNew ? 'POST' : 'PUT';

        const payload = {
            transaction_type: type,
            payment_method: method,
            category: category,
            amount: amountVal,
            transaction_date: dateVal,
            ref_code: refCode,
            partner_type: partnerType,
            partner_name: partnerName,
            notes: notes
        };

        const res = await fetchWithAuth(url, {
            method: methodHttp,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok && data.success) {
            const returnedId = data.transaction_id || (data.transaction ? data.transaction.id : id);
            showToast('success', data.message || (isNew ? 'Lập phiếu mới thành công!' : 'Cập nhật phiếu thành công!'), 'Thành Công');
            
            // Đồng bộ dữ liệu bảng Sổ Quỹ
            loadCashBookData();

            // Chuyển sang màn hình xem chi tiết phiếu vừa lập / sửa kèm phôi in A4
            if (returnedId) {
                viewCashVoucherDetail(returnedId, true);
            } else {
                backToAccountingCashbook();
            }
        } else {
            showToast('danger', data.error || 'Có lỗi xảy ra khi lưu', 'Lỗi Lưu Phiếu');
        }
    } catch (err) {
        console.error('Lỗi lưu chứng từ:', err);
        showToast('danger', 'Lỗi kết nối máy chủ', 'Lỗi');
    }
}

/**
 * Xóa mềm phiếu thu / chi sổ quỹ (Soft-delete có Modal xác nhận)
 */
function confirmDeleteCashVoucher() {
    const id = document.getElementById('edit-voucher-id')?.value;
    const code = document.getElementById('edit-voucher-code')?.value || id;
    if (!id) {
        showToast('warning', 'Không xác định được chứng từ cần xóa!', 'Thông Báo');
        return;
    }

    const tType = document.getElementById('edit-voucher-type')?.value;
    const typeLabel = tType === 'OUTFLOW' ? 'Phiếu Chi' : 'Phiếu Thu';

    showConfirmModal(
        `Xác nhận xóa ${typeLabel} [${code}]?`,
        `Thao tác này sẽ xóa mềm chứng từ ${code} khỏi sổ quỹ và tự động hoàn trả số dư quỹ tương ứng. Bạn có chắc chắn muốn tiếp tục?`,
        async () => {
            try {
                const res = await fetchWithAuth(`/api/accounting/cashbook/${id}/`, {
                    method: 'DELETE'
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    showToast('success', data.message || `Đã xóa chứng từ [${code}] thành công!`, 'Đã Xóa');
                    // Tải lại bảng sổ quỹ và quay lại màn hình Sổ Quỹ
                    await loadCashBookData();
                    backToAccountingCashbook();
                } else {
                    showToast('danger', data.error || 'Không thể xóa chứng từ!', 'Lỗi Xóa Phiếu');
                }
            } catch (err) {
                console.error('Lỗi xóa chứng từ:', err);
                showToast('danger', 'Lỗi kết nối máy chủ khi xóa phiếu', 'Lỗi');
            }
        }
    );
}

/**
 * Mở trang Form riêng biệt để lập Phiếu Thu / Phiếu Chi mới (Không cần bản preview in kèm theo)
 */
function openCreateCashVoucherPage(defaultType = 'INFLOW') {
    const isInflow = defaultType === 'INFLOW';
    const todayIso = new Date().toISOString().slice(0, 10);
    const parts = todayIso.split('-');
    const nowDay = parts[2], nowMonth = parts[1], nowYear = parts[0];

    // Cập nhật URL chuẩn cho chế độ tạo mới: /accounting/vouchers/new?type=...
    if (window.history && window.history.pushState) {
        const createPath = `/accounting/vouchers/new?type=${defaultType.toLowerCase()}`;
        if (window.location.pathname !== '/accounting/vouchers/new') {
            window.history.pushState({ view: 'cash-voucher-create', defaultType }, '', createPath);
        }
    }

    // Ghi nhớ view trước đó
    const currentActiveView = document.querySelector('.view:not(.hidden-view)');
    if (currentActiveView && currentActiveView.id !== 'view-cash-voucher-detail') {
        previousActiveTab = currentActiveView.id.replace('view-', '');
    }

    // Ẩn tất cả view, mở view-cash-voucher-detail
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden-view'));
    const detailView = document.getElementById('view-cash-voucher-detail');
    if (detailView) detailView.classList.remove('hidden-view');

    // Cập nhật Topbar Breadcrumb & Nút Quay Lại Trang Mẹ
    setTopbarFullpageMode({
        backFn: backToAccountingCashbook,
        prefix: 'Tài chính & Kế toán',
        title: isInflow ? 'Lập Phiếu Thu Mới' : 'Lập Phiếu Chi Mới'
    });

    // 1. ẨN HOÀN TOÀN TỜ PHÔI IN A4 KHI LẬP PHIẾU MỚI (Form thuần túy theo yêu cầu)
    const printContainer = document.getElementById('fullpage-voucher-printable-container');
    if (printContainer) printContainer.classList.add('hidden');

    // 2. ẨN CÁC NÚT XEM/IN CỦA TOOLBAR TRÊN CÙNG
    const viewActions = document.getElementById('fullpage-voucher-view-actions');
    if (viewActions) viewActions.classList.add('hidden');

    // Cập nhật tiêu đề Top Toolbar
    const topTitleEl = document.getElementById('fullpage-voucher-top-title');
    if (topTitleEl) topTitleEl.innerText = isInflow ? 'Lập Phiếu Thu Mới (Tiền Vào Quỹ)' : 'Lập Phiếu Chi Mới (Tiền Ra Khỏi Quỹ)';
    const badgeCodeEl = document.getElementById('fullpage-voucher-badge-code');
    if (badgeCodeEl) {
        badgeCodeEl.innerText = isInflow ? 'PHIẾU THU MỚI' : 'PHIẾU CHI MỚI';
        badgeCodeEl.className = isInflow 
            ? 'px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono'
            : 'px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-50 text-rose-800 border border-rose-200 font-mono';
    }

    // 3. HIỂN THỊ FORM NHẬP LIỆU CHUẨN
    const editPanel = document.getElementById('fullpage-voucher-edit-panel');
    if (editPanel) editPanel.classList.remove('hidden');

    // Cập nhật Header & Subtitle của Form
    const formIcon = document.getElementById('fullpage-voucher-form-icon');
    if (formIcon) formIcon.className = isInflow ? 'ph-bold ph-arrow-down-left text-emerald-700' : 'ph-bold ph-arrow-up-right text-rose-700';
    const formTitle = document.getElementById('fullpage-voucher-form-title');
    if (formTitle) formTitle.innerText = isInflow ? 'Mẫu Lập Phiếu Thu Tiền' : 'Mẫu Lập Phiếu Chi Tiền';
    const formSubtitle = document.getElementById('fullpage-voucher-form-subtitle');
    if (formSubtitle) formSubtitle.innerText = 'Nhập thông tin giao dịch quỹ bên dưới, các nút thao tác nằm ở chân form';
    const formBadge = document.getElementById('fullpage-voucher-form-badge');
    if (formBadge) {
        formBadge.innerText = 'Tạo Phiếu Mới';
        formBadge.className = isInflow 
            ? 'm-hide text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200'
            : 'm-hide text-xs font-bold text-rose-800 bg-rose-50 px-3 py-1 rounded-full border border-rose-200';
    }

    // 4. Ở chế độ TẠO MỚI: Chỉ hiển thị nút "Lưu Phiếu" bên phải (Ẩn các nút Xóa và In)
    const btnDelete = document.getElementById('btn-form-delete-voucher');
    if (btnDelete) btnDelete.classList.add('hidden');
    const btnPrint = document.getElementById('btn-form-print-voucher');
    if (btnPrint) btnPrint.classList.add('hidden');
    const submitBtnText = document.getElementById('btn-form-submit-voucher-text');
    if (submitBtnText) submitBtnText.innerText = 'Lưu';

    // Nạp dữ liệu mặc định vào form
    document.getElementById('edit-voucher-id').value = '';
    document.getElementById('edit-voucher-code').value = '';
    document.getElementById('edit-voucher-type').value = defaultType;
    document.getElementById('edit-voucher-method').value = 'BANK';
    populateEditVoucherCategories(defaultType);
    document.getElementById('edit-voucher-amount').value = '';
    document.getElementById('edit-voucher-date').value = todayIso;
    document.getElementById('edit-voucher-ref').value = '';
    document.getElementById('edit-voucher-partner-type').value = '';
    document.getElementById('edit-voucher-partner-name').value = '';
    document.getElementById('edit-voucher-notes').value = '';

    initAllNumberInputs();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Nút In riêng ngoài màn hình chính Sổ Quỹ: Nạp và mở hộp thoại in native trực tiếp khổ A4 mà KHÔNG chuyển trang
 */
async function openDirectPrintCashVoucher(voucherIdentifier) {
    if (!voucherIdentifier) return;
    try {
        const res = await fetchWithAuth(`/api/accounting/cashbook/${voucherIdentifier}/`);
        if (!res.ok) throw new Error('Không thể tải chứng từ sổ quỹ để in');
        const data = await res.json();
        const tx = data.transaction;
        if (!tx) throw new Error('Không có dữ liệu chứng từ');

        // Nạp dữ liệu vào modal in ẩn #cash-voucher-printable-area
        const isInflow = tx.transaction_type === 'INFLOW';
        const titleText = isInflow ? 'PHIẾU THU' : 'PHIẾU CHI';
        const topTitleText = isInflow ? 'Phiếu Thu Sổ Quỹ (Mẫu 01-TT BTC)' : 'Phiếu Chi Sổ Quỹ (Mẫu 02-TT BTC)';
        const templateNoText = isInflow ? 'Mẫu số 01 - TT' : 'Mẫu số 02 - TT';
        const debitAcc = isInflow ? (tx.payment_method === 'BANK' ? '1121' : '1111') : '1411 / 331 / 642';
        const creditAcc = isInflow ? '1411 / 131 / 711' : (tx.payment_method === 'BANK' ? '1121' : '1111');
        const partnerLabel = isInflow ? 'Họ tên người nộp tiền:' : 'Họ tên người nhận tiền:';
        const signPartnerRole = isInflow ? 'Người Nộp Tiền' : 'Người Nhận Tiền';
        const reasonLabel = isInflow ? 'Lý do nộp:' : 'Lý do chi:';

        let day = tx.day || '', month = tx.month || '', year = tx.year || '';
        if (!day && tx.transaction_date) {
            const parts = tx.transaction_date.split('/');
            if (parts.length === 3) {
                day = parts[0]; month = parts[1]; year = parts[2];
            }
        }
        if (!day) {
            const now = new Date();
            day = String(now.getDate()).padStart(2, '0');
            month = String(now.getMonth() + 1).padStart(2, '0');
            year = String(now.getFullYear());
        }

        const dateFormattedText = `Ngày ${day} tháng ${month} năm ${year}`;
        const signDateFormattedText = `Ngày ${day}/${month}/${year}`;
        const amountWords = numberToWordsVN(tx.amount);
        const amountFormatted = new Intl.NumberFormat('vi-VN').format(Math.round(tx.amount || 0)) + ' đ';
        const methodFormatted = tx.payment_method === 'BANK' ? 'Chuyển khoản Ngân hàng' : 'Quỹ Tiền mặt';
        const co = getSystemCompanyProfile();
        const compDisplayName = co.short_name || co.company_name || 'Triền Võ Logistics';
        const departmentFormatted = tx.partner_type_label ? `${tx.partner_type_label} - ${compDisplayName}` : `Đội xe vận tải ${compDisplayName}`;
        const reasonFormatted = tx.notes || tx.category_label || (isInflow ? 'Thu hoàn ứng tiền thừa quyết toán gom chuyến' : 'Chi bù vượt ứng quyết toán gom chuyến');
        const attachmentsFormatted = tx.ref_code ? `01 Bảng kê [${tx.ref_code}] & chứng từ gốc` : '01 Bảng kê quyết toán chuyến & chứng từ gốc';

        const setAreaClassText = (cls, val) => {
            document.querySelectorAll(`#cash-voucher-printable-area .${cls}`).forEach(el => {
                el.innerText = val;
            });
        };

        const modalTitle = document.getElementById('voucher-modal-top-title');
        if (modalTitle) modalTitle.innerText = topTitleText;
        const footerCode = document.getElementById('print-v-footer-code');
        if (footerCode) footerCode.innerText = tx.code || '-';
        const copy2Badge = document.getElementById('voucher-copy-2-badge');
        if (copy2Badge) copy2Badge.innerText = isInflow ? 'Liên 2: Giao cho người nộp tiền' : 'Liên 2: Giao cho người nhận tiền';

        setAreaClassText('v-template-no', templateNoText);
        setAreaClassText('v-code', tx.code || '-');
        setAreaClassText('v-debit-acc', debitAcc);
        setAreaClassText('v-credit-acc', creditAcc);
        setAreaClassText('v-title', titleText);
        setAreaClassText('v-date', dateFormattedText);
        setAreaClassText('v-sign-date', signDateFormattedText);
        setAreaClassText('v-partner-label', partnerLabel);
        setAreaClassText('v-sign-partner-role', signPartnerRole);
        setAreaClassText('v-partner-name', tx.partner_name || 'Tài xế / Đối tác');
        setAreaClassText('v-department', departmentFormatted);
        setAreaClassText('v-reason-label', reasonLabel);
        setAreaClassText('v-reason', reasonFormatted);
        setAreaClassText('v-amount', amountFormatted);
        setAreaClassText('v-method', methodFormatted);
        setAreaClassText('v-amount-words', amountWords);
        setAreaClassText('v-received-words', amountWords);
        setAreaClassText('v-creator-name', tx.created_by || 'Kế toán viên');
        setAreaClassText('v-attachments', attachmentsFormatted);

        syncCompanyProfileToPrintForms();
        setVoucherPrintMode('dual');

        // Bật class in ấn trực tiếp và gọi window.print() ngay tại trang Sổ Quỹ mà KHÔNG đổi view
        document.body.classList.add('is-printing-voucher');
        document.body.classList.remove('is-printing-quotation', 'is-printing-report');
        window.print();
    } catch (e) {
        console.error('Lỗi in nhanh phiếu:', e);
        showToast('danger', 'Không thể mở lệnh in nhanh chứng từ', 'Lỗi In Phiếu');
    }
}

function printCurrentFormVoucher() {
    const id = document.getElementById('edit-voucher-id')?.value;
    if (id) {
        openDirectPrintCashVoucher(id);
    } else {
        showToast('warning', 'Vui lòng lưu phiếu trước khi in ấn!', 'Thông Báo');
    }
}


function backToAccountingCashbook() {
    const detailView = document.getElementById('view-cash-voucher-detail');
    if (detailView) detailView.classList.add('hidden-view');

    resetTopbarStandardMode('ke-toan');
    switchTab('ke-toan', true);
}

window.viewCashVoucherDetail = viewCashVoucherDetail;
window.openDirectPrintCashVoucher = openDirectPrintCashVoucher;
window.openCreateCashVoucherPage = openCreateCashVoucherPage;
window.printCurrentFormVoucher = printCurrentFormVoucher;
window.confirmDeleteCashVoucher = confirmDeleteCashVoucher;
window.backToAccountingCashbook = backToAccountingCashbook;
window.enableFullpageVoucherEdit = enableFullpageVoucherEdit;
window.saveFullpageVoucher = saveFullpageVoucher;
window.onEditVoucherTypeChange = onEditVoucherTypeChange;
window.onEditVoucherMethodChange = onEditVoucherMethodChange;
window.updateLiveVoucherAmount = updateLiveVoucherAmount;
window.updateLiveVoucherDate = updateLiveVoucherDate;
window.updateLiveVoucherPartnerName = updateLiveVoucherPartnerName;
window.updateLiveVoucherPartnerType = updateLiveVoucherPartnerType;
window.updateLiveVoucherRef = updateLiveVoucherRef;
window.updateLiveVoucherReason = updateLiveVoucherReason;
