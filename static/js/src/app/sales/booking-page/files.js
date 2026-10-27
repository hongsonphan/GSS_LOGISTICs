// ==============================================================================
// 8.1. DEDICATED FULL-PAGE BOOKING VIEW (SALE & BOOKING | TẠO BOOKING)
// ==============================================================================
let fullpageBookingFilesList = [];
let fullpageBookingExistingDocs = [];
let currentActiveFullpageBooking = null;

function handleFullpageBookingFilesSelect(input) {
    if (!input || !input.files || input.files.length === 0) return;

    for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        if (file.size > 10 * 1024 * 1024) {
            showToast('warning', `File "${file.name}" vượt quá 10MB. Vui lòng chọn file nhẹ hơn.`, 'File Quá Dung Lượng');
            continue;
        }
        const isDuplicate = fullpageBookingFilesList.some(f => f.name === file.name && f.size === file.size);
        if (!isDuplicate) {
            fullpageBookingFilesList.push(file);
        }
    }
    input.value = '';
    renderFullpageBookingFilesList();
}

function removeFullpageBookingNewFile(index) {
    if (index >= 0 && index < fullpageBookingFilesList.length) {
        fullpageBookingFilesList.splice(index, 1);
        renderFullpageBookingFilesList();
    }
}

async function deleteFullpageBookingExistingDoc(docId) {
    const bookingId = document.getElementById('fullpage-booking-id')?.value;
    if (!bookingId || !docId) {
        fullpageBookingExistingDocs = fullpageBookingExistingDocs.filter(d => d.id !== docId);
        renderFullpageBookingFilesList();
        return;
    }

    const confirmed = await showConfirmModal({
        title: 'Xóa Tài Liệu Booking',
        message: 'Bạn có chắc chắn muốn xóa tài liệu này khỏi Booking không?\n\nThao tác sẽ gỡ bỏ tệp đính kèm khỏi hệ thống.',
        confirmText: 'Xác Nhận Xóa',
        cancelText: 'Huỷ bỏ',
        type: 'danger',
        icon: 'ph-bold ph-trash text-2xl'
    });
    if (!confirmed) return;

    try {
        const res = await fetchWithAuth(`/api/bookings/${bookingId}/documents/${docId}/`, {
            method: 'DELETE'
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || data.error || 'Lỗi khi xóa tài liệu');

        fullpageBookingExistingDocs = fullpageBookingExistingDocs.filter(d => d.id !== docId);
        renderFullpageBookingFilesList();
        showToast('success', 'Đã xóa tài liệu đính kèm', 'Thành Công');
    } catch (err) {
        console.error('Lỗi xóa document:', err);
        showToast('error', err.message || 'Không thể xóa tài liệu đính kèm', 'Lỗi');
    }
}

function renderFullpageBookingFilesList() {
    const listArea = document.getElementById('fullpage-booking-order-files-list');
    const summary = document.getElementById('fullpage-booking-order-files-summary');
    if (!listArea) return;

    let itemsHtml = '';
    const totalCount = fullpageBookingExistingDocs.length + fullpageBookingFilesList.length;

    fullpageBookingExistingDocs.forEach(doc => {
        const isPdf = (doc.name || doc.url || '').toLowerCase().endsWith('.pdf');
        const docName = doc.name || doc.file_name || 'Tài liệu Booking';
        const docUrl = doc.url || doc.file_url || '#';
        const hasValidUrl = docUrl && docUrl !== '#';

        itemsHtml += `
            <div class="flex items-center justify-between p-2 rounded-lg bg-teal-50 hover:bg-teal-100/60 border border-teal-200 shadow-2xs text-xs transition-colors group">
                <a ${hasValidUrl ? `href="${docUrl}" target="_blank" rel="noopener noreferrer"` : ''} 
                   class="flex items-center space-x-2 truncate pr-2 flex-1 cursor-pointer no-underline" 
                   title="Nhấn để mở / tải file: ${docName}">
                    <i class="${isPdf ? 'ph-bold ph-file-pdf text-rose-600' : 'ph-bold ph-file-image text-teal-600'} text-base shrink-0 group-hover:scale-110 transition-transform"></i>
                    <div class="truncate">
                        <p class="font-bold text-teal-900 group-hover:text-teal-700 group-hover:underline truncate font-mono text-[11px]" title="${docName}">${docName}</p>
                        <span class="text-[10px] text-teal-700 font-medium">${doc.size_formatted ? `(${doc.size_formatted})` : '(Đã lưu)'} · <span class="text-teal-600 underline">Bấm để mở</span></span>
                    </div>
                </a>
                <div class="flex items-center space-x-1 shrink-0">
                    ${hasValidUrl ? `
                        <a href="${docUrl}" target="_blank" rel="noopener noreferrer" 
                            class="p-1.5 rounded-md text-teal-700 hover:text-white hover:bg-teal-600 transition-colors shadow-xs" title="Mở file trong tab mới">
                            <i class="ph-bold ph-arrow-square-out text-sm"></i>
                        </a>
                    ` : ''}
                    ${doc.id ? `
                        <button type="button" onclick="deleteFullpageBookingExistingDoc(${doc.id})" 
                            class="p-1.5 rounded-md text-rose-600 hover:text-white hover:bg-rose-600 transition-colors shadow-xs" title="Xóa tài liệu này">
                            <i class="ph-bold ph-trash text-sm"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    });

    fullpageBookingFilesList.forEach((file, idx) => {
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        const sizeKb = (file.size / 1024).toFixed(0);
        const sizeStr = file.size >= 1024 * 1024 ? `${sizeMb} MB` : `${sizeKb} KB`;
        let tempUrl = '';
        try {
            tempUrl = URL.createObjectURL(file);
        } catch (e) {
            tempUrl = '';
        }

        itemsHtml += `
            <div class="flex items-center justify-between p-2 rounded-lg bg-amber-50 hover:bg-amber-100/60 border border-amber-200 shadow-2xs text-xs transition-colors group">
                ${tempUrl ? `
                    <a href="${tempUrl}" target="_blank" rel="noopener noreferrer" 
                       class="flex items-center space-x-2 truncate pr-2 flex-1 cursor-pointer no-underline" 
                       title="Xem trước file: ${file.name}">
                        <i class="${isPdf ? 'ph-bold ph-file-pdf text-rose-600' : 'ph-bold ph-file-image text-amber-600'} text-base shrink-0 group-hover:scale-110 transition-transform"></i>
                        <div class="truncate">
                            <p class="font-bold text-amber-900 group-hover:text-amber-700 group-hover:underline truncate font-mono text-[11px]" title="${file.name}">${file.name}</p>
                            <span class="text-[10px] text-amber-700 font-semibold font-mono">(${sizeStr} - Chờ lưu) · <span class="underline">Xem trước</span></span>
                        </div>
                    </a>
                ` : `
                    <div class="flex items-center space-x-2 truncate pr-2 flex-1">
                        <i class="${isPdf ? 'ph-bold ph-file-pdf text-rose-600' : 'ph-bold ph-file-image text-amber-600'} text-base shrink-0"></i>
                        <div class="truncate">
                            <p class="font-bold text-amber-900 truncate font-mono text-[11px]" title="${file.name}">${file.name}</p>
                            <span class="text-[10px] text-amber-700 font-semibold font-mono">(${sizeStr} - Chờ lưu)</span>
                        </div>
                    </div>
                `}
                <div class="flex items-center space-x-1 shrink-0">
                    ${tempUrl ? `
                        <a href="${tempUrl}" target="_blank" rel="noopener noreferrer" 
                            class="p-1.5 rounded-md text-amber-700 hover:text-white hover:bg-amber-600 transition-colors shadow-xs" title="Xem trước file">
                            <i class="ph-bold ph-eye text-sm"></i>
                        </a>
                    ` : ''}
                    <button type="button" onclick="removeFullpageBookingNewFile(${idx})" 
                        class="p-1.5 rounded-md text-rose-600 hover:text-white hover:bg-rose-600 transition-colors shadow-xs shrink-0" title="Hủy tệp này">
                        <i class="ph-bold ph-x text-sm"></i>
                    </button>
                </div>
            </div>
        `;
    });

    listArea.innerHTML = itemsHtml;
    if (summary) {
        if (totalCount === 0) {
            summary.innerHTML = '<i class="ph ph-info text-teal-600"></i> Chưa có tệp nào được đính kèm';
            summary.className = 'text-xs text-slate-500 italic mb-2';
        } else {
            summary.innerHTML = `<i class="ph-bold ph-check-circle text-teal-600"></i> Đã chọn <strong>${totalCount}</strong> tệp đính kèm (${fullpageBookingExistingDocs.length} tệp đã lưu, ${fullpageBookingFilesList.length} tệp mới)`;
            summary.className = 'text-xs text-teal-800 font-medium mb-2';
        }
    }
}

function clearFullpageBookingFileSelection() {
    fullpageBookingFilesList = [];
    fullpageBookingExistingDocs = [];
    const input = document.getElementById('fullpage-booking-order-file');
    if (input) input.value = '';
    renderFullpageBookingFilesList();
}
