// =========================================================================
// TÍNH NĂNG XUẤT MẪU & NHẬP EXCEL DANH MỤC BAN ĐẦU (MASTER DATA EXPORT/IMPORT)
// =========================================================================

const VALID_IMPORT_CATALOGS = [
    'locations', 'containers', 'expenses', 'driver_tariffs', 'allowances',
    'customers', 'tariffs', 'vehicles', 'trailers', 'shipping_lines',
    'subcontractors', 'opening_balance'
];

async function exportMasterDataTemplate(tabKey) {
    const catalog = tabKey || currentMasterDataTab;
    if (!catalog || !VALID_IMPORT_CATALOGS.includes(catalog)) {
        showToast('warning', 'Danh mục hiện tại không áp dụng file Excel mẫu hàng loạt.', 'Thông Báo');
        return;
    }

    showToast('info', 'Đang tạo và tải file Excel mẫu chuẩn hóa...', 'Đang Xuất File');
    try {
        const res = await fetchWithAuth(`/api/master-data/export-template/?catalog=${encodeURIComponent(catalog)}`);
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Máy chủ phản hồi lỗi ${res.status}`);
        }

        let filename = `Mau_Nhap_${catalog}.xlsx`;
        const disp = res.headers.get('Content-Disposition');
        if (disp && disp.includes('filename=')) {
            const match = disp.match(/filename="?([^";]+)"?/);
            if (match && match[1]) filename = match[1];
        }

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        showToast('success', `Đã tải xuống file mẫu "${filename}" thành công!`, 'Tải Mẫu Thành Công');
    } catch (err) {
        console.error('Lỗi tải mẫu Excel:', err);
        showToast('danger', err.message || 'Không thể tải file mẫu Excel.', 'Lỗi Xuất Mẫu');
    }
}
window.exportMasterDataTemplate = exportMasterDataTemplate;

async function exportMasterDataActualData(tabKey) {
    const catalog = tabKey || currentMasterDataTab;
    if (!catalog || !VALID_IMPORT_CATALOGS.includes(catalog)) {
        showToast('warning', 'Danh mục này không hỗ trợ xuất Excel.', 'Thông Báo');
        return;
    }

    showToast('info', 'Đang xuất toàn bộ dữ liệu danh mục hiện hành...', 'Đang Xuất File');
    try {
        const res = await fetchWithAuth(`/api/master-data/export-data/?catalog=${encodeURIComponent(catalog)}`);
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Máy chủ phản hồi lỗi ${res.status}`);
        }

        let filename = `Xuat_Du_Lieu_${catalog}.xlsx`;
        const disp = res.headers.get('Content-Disposition');
        if (disp && disp.includes('filename=')) {
            const match = disp.match(/filename="?([^";]+)"?/);
            if (match && match[1]) filename = match[1];
        }

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        showToast('success', `Đã xuất dữ liệu "${filename}" thành công!`, 'Xuất Excel Thành Công');
    } catch (err) {
        console.error('Lỗi xuất dữ liệu Excel:', err);
        showToast('danger', err.message || 'Không thể xuất dữ liệu ra Excel.', 'Lỗi');
    }
}
window.exportMasterDataActualData = exportMasterDataActualData;

function openMasterDataImportModal(tabKey) {
    const modal = document.getElementById('modal-master-data-import');
    if (!modal) return;

    const catalog = tabKey || currentMasterDataTab;
    const select = document.getElementById('md-import-catalog-select');
    if (select) {
        if (catalog && VALID_IMPORT_CATALOGS.includes(catalog)) {
            select.value = catalog;
        } else {
            select.value = 'customers';
        }
    }

    clearImportFileInput();

    const statusContainer = document.getElementById('md-import-status-container');
    const loadingEl = document.getElementById('md-import-loading');
    const resultEl = document.getElementById('md-import-result');
    if (statusContainer) statusContainer.classList.add('hidden');
    if (loadingEl) loadingEl.classList.add('hidden');
    if (resultEl) {
        resultEl.classList.add('hidden');
        resultEl.innerHTML = '';
    }

    const submitBtn = document.getElementById('md-import-submit-btn');
    if (submitBtn) submitBtn.disabled = false;

    setupImportDropzone();
    modal.classList.remove('hidden');
}
window.openMasterDataImportModal = openMasterDataImportModal;

function closeMasterDataImportModal() {
    const modal = document.getElementById('modal-master-data-import');
    if (modal) modal.classList.add('hidden');
    clearImportFileInput();
}
window.closeMasterDataImportModal = closeMasterDataImportModal;

function onImportCatalogChange(catalogKey) {
    // Dự phòng thay đổi tương tác trong modal
}
window.onImportCatalogChange = onImportCatalogChange;

function downloadSelectedImportTemplate() {
    const select = document.getElementById('md-import-catalog-select');
    const catalog = select ? select.value : currentMasterDataTab;
    exportMasterDataTemplate(catalog);
}
window.downloadSelectedImportTemplate = downloadSelectedImportTemplate;

function handleImportFileSelected(input) {
    const file = input.files && input.files[0];
    const prompt = document.getElementById('md-dropzone-prompt');
    const preview = document.getElementById('md-file-info-preview');
    const nameEl = document.getElementById('md-file-name');
    const sizeEl = document.getElementById('md-file-size');

    if (!file) {
        clearImportFileInput();
        return;
    }

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        showToast('warning', 'Vui lòng chọn tệp định dạng Excel (.xlsx hoặc .xls).', 'Định Dạng Chưa Đúng');
        clearImportFileInput();
        return;
    }

    if (prompt) prompt.classList.add('hidden');
    if (preview) preview.classList.remove('hidden');
    if (nameEl) nameEl.innerText = file.name;
    if (sizeEl) {
        const sizeKb = Math.round(file.size / 1024);
        sizeEl.innerText = `(${sizeKb > 1024 ? (sizeKb / 1024).toFixed(1) + ' MB' : sizeKb + ' KB'})`;
    }
}
window.handleImportFileSelected = handleImportFileSelected;

function clearImportFileInput() {
    const input = document.getElementById('md-import-file-input');
    if (input) input.value = '';
    const prompt = document.getElementById('md-dropzone-prompt');
    const preview = document.getElementById('md-file-info-preview');
    if (prompt) prompt.classList.remove('hidden');
    if (preview) preview.classList.add('hidden');
}
window.clearImportFileInput = clearImportFileInput;

function setupImportDropzone() {
    const dropzone = document.getElementById('md-dropzone');
    if (!dropzone || dropzone._hasDragEvents) return;

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('border-teal-500', 'bg-teal-50/50');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('border-teal-500', 'bg-teal-50/50');
        }, false);
    });

    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files.length > 0) {
            const input = document.getElementById('md-import-file-input');
            if (input) {
                input.files = files;
                handleImportFileSelected(input);
            }
        }
    }, false);

    dropzone._hasDragEvents = true;
}

async function submitMasterDataImport(event) {
    if (event) event.preventDefault();

    const select = document.getElementById('md-import-catalog-select');
    const catalog = select ? select.value : currentMasterDataTab;
    const fileInput = document.getElementById('md-import-file-input');
    const file = fileInput && fileInput.files && fileInput.files[0];
    const upsert = document.getElementById('md-import-upsert-checkbox')?.checked ?? true;

    if (!file) {
        showToast('warning', 'Vui lòng chọn tệp Excel trước khi bấm nhập dữ liệu.', 'Chưa Chọn Tệp');
        return;
    }

    const statusContainer = document.getElementById('md-import-status-container');
    const loadingEl = document.getElementById('md-import-loading');
    const resultEl = document.getElementById('md-import-result');
    const submitBtn = document.getElementById('md-import-submit-btn');

    if (statusContainer) statusContainer.classList.remove('hidden');
    if (loadingEl) loadingEl.classList.remove('hidden');
    if (resultEl) {
        resultEl.classList.add('hidden');
        resultEl.innerHTML = '';
    }
    if (submitBtn) submitBtn.disabled = true;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('catalog', catalog);
    formData.append('update_existing', upsert ? 'true' : 'false');

    try {
        const res = await fetchWithAuth('/api/master-data/import/', {
            method: 'POST',
            body: formData
        });

        const data = await res.json().catch(() => ({}));
        if (loadingEl) loadingEl.classList.add('hidden');
        if (submitBtn) submitBtn.disabled = false;

        if (res.ok && data.success) {
            if (resultEl) {
                resultEl.className = 'p-3.5 rounded-xl border text-xs bg-emerald-50 border-emerald-200 text-emerald-900';
                let html = `
                    <div class="flex items-center space-x-2 font-bold mb-1">
                        <i class="ph-bold ph-check-circle text-base text-emerald-600"></i>
                        <span>${escapeHtml(data.message || 'Nhập dữ liệu thành công!')}</span>
                    </div>
                    <div class="text-[11px] text-emerald-800 space-y-0.5 pl-6">
                        <div>• Thêm mới: <strong class="font-bold">${data.created_count || 0}</strong> bản ghi</div>
                        <div>• Cập nhật: <strong class="font-bold">${data.updated_count || 0}</strong> bản ghi</div>
                        ${data.skipped_count ? `<div>• Bỏ qua: <strong class="font-bold">${data.skipped_count}</strong> bản ghi trùng/mẫu</div>` : ''}
                    </div>
                `;

                if (data.errors && data.errors.length > 0) {
                    html += `
                        <div class="mt-2.5 pt-2 border-t border-emerald-200/80">
                            <div class="font-bold text-amber-800 mb-1">Cảnh báo / Lỗi dòng (${data.errors.length}):</div>
                            <ul class="list-disc pl-5 text-[11px] text-amber-900 space-y-0.5 max-h-32 overflow-y-auto">
                                ${data.errors.map(err => `<li>${escapeHtml(err)}</li>`).join('')}
                            </ul>
                        </div>
                    `;
                }

                resultEl.innerHTML = html;
                resultEl.classList.remove('hidden');
            }

            showToast('success', data.message || 'Nhập danh mục từ Excel thành công!', 'Nhập Dữ Liệu Hoàn Tất');

            if (currentMasterDataTab !== catalog) {
                switchMasterDataTab(catalog);
            } else {
                reloadActiveMasterDataTab();
            }
            loadMasterData();
            if (typeof refreshMasterDataLive === 'function') refreshMasterDataLive();

        } else {
            if (resultEl) {
                resultEl.className = 'p-3.5 rounded-xl border text-xs bg-rose-50 border-rose-200 text-rose-900';
                let html = `
                    <div class="flex items-center space-x-2 font-bold mb-1">
                        <i class="ph-bold ph-warning-circle text-base text-rose-600"></i>
                        <span>${escapeHtml(data.message || 'Nhập dữ liệu không thành công!')}</span>
                    </div>
                `;
                if (data.errors && data.errors.length > 0) {
                    html += `
                        <ul class="list-disc pl-5 text-[11px] text-rose-800 space-y-0.5 mt-1.5 max-h-36 overflow-y-auto">
                            ${data.errors.map(err => `<li>${escapeHtml(err)}</li>`).join('')}
                        </ul>
                    `;
                }
                resultEl.innerHTML = html;
                resultEl.classList.remove('hidden');
            }
            showToast('danger', data.message || 'Lỗi nhập dữ liệu từ Excel.', 'Lỗi Nhập Dữ Liệu');
        }
    } catch (err) {
        console.error('Lỗi khi gửi request import:', err);
        if (loadingEl) loadingEl.classList.add('hidden');
        if (submitBtn) submitBtn.disabled = false;
        if (resultEl) {
            resultEl.className = 'p-3.5 rounded-xl border text-xs bg-rose-50 border-rose-200 text-rose-900';
            resultEl.innerHTML = `
                <div class="flex items-center space-x-2 font-bold">
                    <i class="ph-bold ph-warning-circle text-base text-rose-600"></i>
                    <span>Lỗi kết nối máy chủ: ${escapeHtml(err.message || 'Không thể gửi file lên hệ thống')}</span>
                </div>
            `;
            resultEl.classList.remove('hidden');
        }
        showToast('danger', 'Lỗi kết nối máy chủ khi nhập file Excel.', 'Lỗi Kết Nối');
    }
}
window.submitMasterDataImport = submitMasterDataImport;
