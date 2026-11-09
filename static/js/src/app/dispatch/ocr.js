let currentOcrSelectedFile = null;

function switchOcrFormMode(mode) {
    currentOcrMode = mode;
    const tabExpense = document.getElementById('tab-ocr-mode-expense');
    const tabDoc = document.getElementById('tab-ocr-mode-doc');
    const formExpense = document.getElementById('ocr-form-expense');
    const formDoc = document.getElementById('ocr-form-document');
    const titleEl = document.getElementById('ocr-modal-title');
    const subEl = document.getElementById('ocr-upload-sub');
    const submitBtnText = document.getElementById('btn-submit-ocr-text');

    if (mode === 'phi-ton') {
        if (tabExpense) {
            tabExpense.className = 'flex-1 py-2 px-3 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 bg-white text-teal-800 shadow-2xs font-bold font-heading';
        }
        if (tabDoc) {
            tabDoc.className = 'flex-1 py-2 px-3 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 text-slate-600 hover:text-slate-900 font-bold font-heading';
        }
        if (formExpense) formExpense.classList.remove('hidden-view');
        if (formDoc) formDoc.classList.add('hidden-view');
        if (titleEl) titleEl.innerText = 'Cập Nhật Chi Phí Phát Sinh';
        if (subEl) subEl.innerText = 'Đính kèm hóa đơn điện tử, vé cầu đường BOT hoặc biên lai';
        if (submitBtnText) submitBtnText.innerText = 'Lưu Khoản Chi Phí';
    } else {
        if (tabDoc) {
            tabDoc.className = 'flex-1 py-2 px-3 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 bg-white text-teal-800 shadow-2xs font-bold font-heading';
        }
        if (tabExpense) {
            tabExpense.className = 'flex-1 py-2 px-3 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 text-slate-600 hover:text-slate-900 font-bold font-heading';
        }
        if (formExpense) formExpense.classList.add('hidden-view');
        if (formDoc) formDoc.classList.remove('hidden-view');
        if (titleEl) titleEl.innerText = 'Nghiệm Thu Chứng Từ Vận Tải';
        if (subEl) subEl.innerText = 'Đính kèm phiếu EIR hạ cont hoặc biên bản giao nhận có ký POD';
        if (submitBtnText) submitBtnText.innerText = 'Nghiệm Thu Chứng Từ';

        const contVal = document.getElementById('detail-cont');
        const sealVal = document.getElementById('detail-seal');
        const ocrCont = document.getElementById('ocr-doc-cont');
        const ocrSeal = document.getElementById('ocr-doc-seal');
        if (contVal && ocrCont && !ocrCont.value) ocrCont.value = contVal.innerText !== '-' ? contVal.innerText : '';
        if (sealVal && ocrSeal && !ocrSeal.value) ocrSeal.value = sealVal.innerText !== '-' ? sealVal.innerText : '';
    }
}

function openOcrApp(mode) {
    clearOcrSelectedFile();
    switchOcrFormMode(mode || 'phi-ton');
    openModal('modal-ocr');
}

function handleOcrFileSelected(input) {
    if (!input || !input.files || input.files.length === 0) return;
    const file = input.files[0];
    currentOcrSelectedFile = file;

    const previewContainer = document.getElementById('ocr-preview-container');
    const filenameEl = document.getElementById('ocr-preview-filename');
    const filesizeEl = document.getElementById('ocr-preview-filesize');
    const iconEl = document.getElementById('ocr-preview-icon');

    if (previewContainer) previewContainer.classList.remove('hidden');
    if (filenameEl) filenameEl.innerText = file.name;
    if (filesizeEl) {
        const sizeKb = Math.round(file.size / 1024);
        filesizeEl.innerText = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;
    }
    if (iconEl) {
        if (file.type && file.type.includes('pdf')) {
            iconEl.className = 'ph-bold ph-file-pdf text-rose-600 text-xl shrink-0';
        } else {
            iconEl.className = 'ph-bold ph-file-image text-teal-600 text-xl shrink-0';
        }
    }
}

function clearOcrSelectedFile() {
    currentOcrSelectedFile = null;
    const input = document.getElementById('ocr-file-input');
    if (input) input.value = '';
    const previewContainer = document.getElementById('ocr-preview-container');
    if (previewContainer) previewContainer.classList.add('hidden');
}

function resetOcr() {
    clearOcrSelectedFile();
}

function startOcrScan() {
    // Graceful backward compatibility stub
    console.log('Digital document intake active');
}

async function submitOcrData() {
    if (!currentActiveTripCode) {
        showToast('warning', 'Vui lòng chọn chuyến xe trước khi cập nhật');
        return;
    }

    const btnSubmit = document.getElementById('btn-submit-ocr');
    if (btnSubmit) btnSubmit.disabled = true;

    try {
        if (currentOcrMode === 'phi-ton') {
            const category = document.getElementById('ocr-expense-type') ? document.getElementById('ocr-expense-type').value : 'TOLL_FEE';
            const amountStr = document.getElementById('ocr-amount') ? document.getElementById('ocr-amount').value : '0';
            const amount = typeof parseNumberVN === 'function' ? parseNumberVN(amountStr) : (parseInt(amountStr.replace(/[^0-9]/g, ''), 10) || 0);
            const invoiceNumber = document.getElementById('ocr-expense-inv-no') ? document.getElementById('ocr-expense-inv-no').value.trim() : '';
            const lookupCode = document.getElementById('ocr-expense-lookup-code') ? document.getElementById('ocr-expense-lookup-code').value.trim() : '';
            const notes = document.getElementById('ocr-expense-notes') ? document.getElementById('ocr-expense-notes').value.trim() : '';

            if (!amount || amount <= 0) {
                showToast('warning', 'Vui lòng nhập số tiền chi phí hợp lệ (> 0 đ)');
                if (btnSubmit) btnSubmit.disabled = false;
                return;
            }

            const formData = new FormData();
            formData.append('category', category);
            formData.append('amount', amount);
            if (invoiceNumber) formData.append('invoice_number', invoiceNumber);
            if (lookupCode) formData.append('invoice_lookup_code', lookupCode);
            if (notes) formData.append('notes', notes);
            if (currentOcrSelectedFile) {
                formData.append('receipt_image', currentOcrSelectedFile);
            }

            const res = await fetchWithAuth(`/api/trips/${currentActiveTripCode}/expenses/`, {
                method: 'POST',
                body: formData
            });

            const resData = await res.json();
            if (res.ok && resData.success) {
                closeModal('modal-ocr');
                clearOcrSelectedFile();
                if (typeof viewTripDetail === 'function') viewTripDetail(currentActiveTripCode);
                showToast('success', resData.message || 'Đã ghi nhận chi phí thành công', 'Chi phí phát sinh');
            } else {
                showToast('danger', resData.message || resData.error || resData.detail || 'Lỗi khi lưu khoản chi phí.');
            }
        } else {
            const docType = document.getElementById('ocr-doc-type') ? document.getElementById('ocr-doc-type').value : 'Phiếu EIR Hạ Cont';
            const contNo = document.getElementById('ocr-doc-cont') ? document.getElementById('ocr-doc-cont').value.trim() : '';
            const sealNo = document.getElementById('ocr-doc-seal') ? document.getElementById('ocr-doc-seal').value.trim() : '';

            const formData = new FormData();
            formData.append('doc_type', docType);
            if (contNo) formData.append('container_no', contNo);
            if (sealNo) formData.append('seal_no', sealNo);
            if (currentOcrSelectedFile) {
                formData.append('file', currentOcrSelectedFile);
            }

            const res = await fetchWithAuth(`/api/trips/${currentActiveTripCode}/documents/`, {
                method: 'POST',
                body: formData
            });

            const resData = await res.json();
            if (res.ok && resData.success) {
                closeModal('modal-ocr');
                clearOcrSelectedFile();
                if (typeof viewTripDetail === 'function') viewTripDetail(currentActiveTripCode);
                showToast('success', resData.message || 'Đã nghiệm thu chứng từ thành công', 'Chứng từ vận tải');
            } else {
                showToast('danger', resData.message || resData.error || resData.detail || 'Lỗi khi lưu chứng từ hoàn tất.');
            }
        }
    } catch (err) {
        console.error('Error submitting document/expense data:', err);
        showToast('danger', 'Đã xảy ra lỗi khi kết nối máy chủ.');
    } finally {
        if (btnSubmit) btnSubmit.disabled = false;
    }
}


window.confirmDispatcherMilestone = async function(step) {
    if (!currentActiveTripCode) return;
    const stepNum = parseInt(step, 10);
    let milestoneCode = 'ACCEPTED_TRIP';
    if (stepNum === 1 || stepNum === 2) milestoneCode = 'ACCEPTED_TRIP';
    else if (stepNum === 3) milestoneCode = 'DEPARTED';
    else if (stepNum === 4) milestoneCode = 'CONTAINER_PICKED';
    else if (stepNum === 5) milestoneCode = 'APPROACHING_WAREHOUSE';
    else if (stepNum === 6) milestoneCode = 'ARRIVED_WAREHOUSE';
    else if (stepNum === 7) milestoneCode = 'START_UNLOADING';
    else if (stepNum === 8) milestoneCode = 'FINISHED_UNLOADING';
    else if (stepNum === 9) milestoneCode = 'DEPART_TO_DROPOFF';
    else if (stepNum >= 10) milestoneCode = 'DROPOFF_COMPLETED';

    if (typeof driverReportMilestone === 'function') {
        await driverReportMilestone(milestoneCode);
    }
};
