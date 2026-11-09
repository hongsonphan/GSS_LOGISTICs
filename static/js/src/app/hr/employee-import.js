// ==========================================================================
// QUẢN LÝ NHÂN SỰ: NHẬP & XUẤT EXCEL (EMPLOYEE EXCEL IMPORT & EXPORT)
// ==========================================================================
function downloadEmployeeTemplate() {
    window.location.href = '/api/personnel/employees/export-template/';
}

function exportEmployeeData() {
    const dept = document.getElementById('emp-filter-dept')?.value || 'ALL';
    const status = document.getElementById('emp-filter-status')?.value || 'ALL';
    const params = new URLSearchParams();
    if (dept !== 'ALL') params.append('department', dept);
    if (status !== 'ALL') params.append('status', status);
    window.location.href = `/api/personnel/employees/export-data/?${params.toString()}`;
}

function openEmployeeImportModal() {
    const modal = document.getElementById('modal-employee-import');
    if (!modal) return;
    clearEmployeeImportFileInput();
    const resultBox = document.getElementById('emp-import-result-box');
    if (resultBox) {
        resultBox.classList.add('hidden');
        resultBox.innerHTML = '';
    }
    modal.classList.remove('hidden');
}

function closeEmployeeImportModal() {
    const modal = document.getElementById('modal-employee-import');
    if (modal) modal.classList.add('hidden');
}

function handleEmployeeImportFileSelected(input) {
    if (!input || !input.files || input.files.length === 0) {
        clearEmployeeImportFileInput();
        return;
    }
    const file = input.files[0];
    const nameEl = document.getElementById('emp-file-name');
    const sizeEl = document.getElementById('emp-file-size');
    const previewEl = document.getElementById('emp-file-info-preview');
    const promptEl = document.getElementById('emp-dropzone-prompt');

    if (nameEl) nameEl.innerText = file.name;
    if (sizeEl) sizeEl.innerText = `(${(file.size / 1024).toFixed(1)} KB)`;
    if (previewEl) previewEl.classList.remove('hidden');
    if (promptEl) promptEl.classList.add('hidden');
}

function clearEmployeeImportFileInput() {
    const input = document.getElementById('emp-import-file-input');
    if (input) input.value = '';
    const previewEl = document.getElementById('emp-file-info-preview');
    const promptEl = document.getElementById('emp-dropzone-prompt');
    if (previewEl) previewEl.classList.add('hidden');
    if (promptEl) promptEl.classList.remove('hidden');
}

async function submitEmployeeImport(e) {
    e.preventDefault();
    const fileInput = document.getElementById('emp-import-file-input');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        showToast('warning', 'Vui lòng chọn file Excel để nhập danh sách nhân sự!');
        return;
    }

    const file = fileInput.files[0];
    const updateExisting = document.getElementById('emp-import-update-existing')?.checked ?? true;
    const submitBtn = document.getElementById('emp-import-submit-btn');
    const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
    const resultBox = document.getElementById('emp-import-result-box');

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="ph-bold ph-spinner animate-spin text-sm"></i><span>Đang xử lý nhập...</span>';
    }

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('update_existing', updateExisting ? 'true' : 'false');

        const res = await fetchWithAuth('/api/personnel/employees/import/', {
            method: 'POST',
            body: formData
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok && data.success) {
            const created = data.created_count || 0;
            const updated = data.updated_count || 0;
            const skipped = data.skipped_count || 0;
            const errCount = data.error_count || 0;

            showToast('success', `Đã nhập thành công! Thêm mới: ${created}, Cập nhật: ${updated}, Bỏ qua: ${skipped}.`);

            if (resultBox) {
                resultBox.classList.remove('hidden');
                if (errCount > 0) {
                    resultBox.className = 'rounded-xl p-3 text-xs space-y-1.5 border bg-amber-50/70 border-amber-200 text-amber-900';
                    resultBox.innerHTML = `
                        <div class="font-bold flex items-center gap-1.5 text-amber-950">
                            <i class="ph-bold ph-warning text-base text-amber-600"></i>
                            <span>Hoàn thành với cảnh báo (${errCount} dòng lỗi):</span>
                        </div>
                        <ul class="list-disc pl-5 max-h-36 overflow-y-auto space-y-1 font-mono text-[11px] text-amber-900">
                            ${(data.errors || []).map(err => `<li>${escapeHtml(err)}</li>`).join('')}
                        </ul>
                    `;
                } else {
                    resultBox.className = 'rounded-xl p-3 text-xs space-y-1 border bg-emerald-50/70 border-emerald-200 text-emerald-900';
                    resultBox.innerHTML = `
                        <div class="font-bold flex items-center gap-1.5 text-emerald-950">
                            <i class="ph-bold ph-check-circle text-base text-emerald-600"></i>
                            <span>Toàn bộ dữ liệu nhân sự đã được nhập thành công tuyệt đối!</span>
                        </div>
                    `;
                    setTimeout(() => {
                        closeEmployeeImportModal();
                    }, 1500);
                }
            }

            // Tải lại dữ liệu nhân sự trên trang
            if (typeof loadEmployeesData === 'function') {
                loadEmployeesData();
            }
        } else {
            showToast('danger', data.message || 'Lỗi nhập file Excel nhân sự!');
            if (resultBox) {
                resultBox.classList.remove('hidden');
                resultBox.className = 'rounded-xl p-3 text-xs space-y-1.5 border bg-rose-50/70 border-rose-200 text-rose-900';
                resultBox.innerHTML = `
                    <div class="font-bold flex items-center gap-1.5 text-rose-950">
                        <i class="ph-bold ph-x-circle text-base text-rose-600"></i>
                        <span>${escapeHtml(data.message || 'Có lỗi xảy ra khi đọc file')}</span>
                    </div>
                `;
            }
        }
    } catch (err) {
        console.error('Lỗi submitEmployeeImport:', err);
        showToast('danger', 'Lỗi kết nối máy chủ khi nhập file Excel!');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHtml;
        }
    }
}

window.downloadEmployeeTemplate = typeof downloadEmployeeTemplate !== 'undefined' ? downloadEmployeeTemplate : undefined;
window.exportEmployeeData = typeof exportEmployeeData !== 'undefined' ? exportEmployeeData : undefined;
window.openEmployeeImportModal = typeof openEmployeeImportModal !== 'undefined' ? openEmployeeImportModal : undefined;
window.closeEmployeeImportModal = typeof closeEmployeeImportModal !== 'undefined' ? closeEmployeeImportModal : undefined;
window.handleEmployeeImportFileSelected = typeof handleEmployeeImportFileSelected !== 'undefined' ? handleEmployeeImportFileSelected : undefined;
window.clearEmployeeImportFileInput = typeof clearEmployeeImportFileInput !== 'undefined' ? clearEmployeeImportFileInput : undefined;
window.submitEmployeeImport = typeof submitEmployeeImport !== 'undefined' ? submitEmployeeImport : undefined;
