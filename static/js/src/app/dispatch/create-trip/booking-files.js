// --- XỬ LÝ ĐÍNH KÈM FILE BOOKING / LỆNH CẤP RỖNG (TRIP DISPATCH & SALE) ---
let currentInheritedBookingFile = null;
let tripBookingFilesList = [];
let saleBookingFilesList = [];
let saleBookingExistingDocs = [];
let currentEditingBookingId = null;


function syncBookingClosingTime() {
    const d = document.getElementById('booking-closing-date')?.value;
    const t = document.getElementById('booking-closing-time-val')?.value || '17:00';
    const hidden = document.getElementById('booking-closing-time');
    if (hidden) {
        hidden.value = d ? `${d} ${t}` : '';
    }
}

function setBookingClosingTime(timeStr) {
    const el = document.getElementById('booking-closing-time-val');
    if (el) el.value = timeStr;
    syncBookingClosingTime();
}

function syncBookingSiTime() {
    const d = document.getElementById('booking-si-date')?.value;
    const t = document.getElementById('booking-si-time-val')?.value || '12:00';
    const hidden = document.getElementById('booking-si-cutoff');
    if (hidden) {
        hidden.value = d ? `${d} ${t}` : '';
    }
}

function setBookingSiTime(timeStr) {
    const el = document.getElementById('booking-si-time-val');
    if (el) el.value = timeStr;
    syncBookingSiTime();
}

function syncTripCutoff() {
    const d = document.getElementById('inp-cutoff-date')?.value;
    const t = document.getElementById('inp-cutoff-time')?.value || '17:00';
    const hidden = document.getElementById('inp-cutoff');
    if (hidden) {
        hidden.value = d ? `${d} ${t}` : '';
    }
}

function setTripCutoffTime(timeStr) {
    const el = document.getElementById('inp-cutoff-time');
    if (el) el.value = timeStr;
    syncTripCutoff();
}

function parseAndSetDateTimeFields(rawStr, dateInputId, timeInputId, hiddenInputId, defaultTime = '17:00') {
    const dateEl = document.getElementById(dateInputId);
    const timeEl = document.getElementById(timeInputId);
    const hiddenEl = document.getElementById(hiddenInputId);
    if (!rawStr || typeof rawStr !== 'string') {
        if (dateEl) dateEl.value = '';
        if (timeEl) timeEl.value = defaultTime;
        if (hiddenEl) hiddenEl.value = '';
        return;
    }
    const val = rawStr.trim();
    if (hiddenEl) hiddenEl.value = val;

    let foundDate = '';
    let foundTime = defaultTime;

    // Check ISO date YYYY-MM-DD
    const isoDateMatch = val.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (isoDateMatch) {
        foundDate = isoDateMatch[1];
    } else {
        // Check VN date DD/MM/YYYY or DD/MM
        const vnDateMatch = val.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/);
        if (vnDateMatch) {
            const day = String(vnDateMatch[1]).padStart(2, '0');
            const month = String(vnDateMatch[2]).padStart(2, '0');
            const year = vnDateMatch[3] ? vnDateMatch[3] : new Date().getFullYear();
            foundDate = `${year}-${month}-${day}`;
        }
    }

    // Check Time HH:MM (có thể kèm AM/PM) or HHhMM or HHh
    const timeAmPmMatch = val.match(/\b(\d{1,2}):(\d{2})(?::\d{2})?\s*([aApP][mM])?\b/i);
    if (timeAmPmMatch) {
        let hhNum = parseInt(timeAmPmMatch[1], 10);
        const mmNum = parseInt(timeAmPmMatch[2], 10);
        const ampm = timeAmPmMatch[3] ? timeAmPmMatch[3].toUpperCase() : null;
        if (ampm === 'PM' && hhNum < 12) {
            hhNum += 12;
        } else if (ampm === 'AM' && hhNum === 12) {
            hhNum = 0;
        }
        if (hhNum >= 0 && hhNum <= 23 && mmNum >= 0 && mmNum <= 59) {
            foundTime = `${String(hhNum).padStart(2, '0')}:${String(mmNum).padStart(2, '0')}`;
        }
    } else {
        const hourOnlyMatch = val.match(/\b(\d{1,2})h(?:(\d{2}))?\b/i);
        if (hourOnlyMatch) {
            const hh = String(hourOnlyMatch[1]).padStart(2, '0');
            const mm = hourOnlyMatch[2] ? String(hourOnlyMatch[2]).padStart(2, '0') : '00';
            foundTime = `${hh}:${mm}`;
        }
    }

    if (dateEl && foundDate) dateEl.value = foundDate;
    if (timeEl && foundTime) timeEl.value = foundTime;

    if (dateEl && dateEl.value && timeEl && timeEl.value) {
        if (hiddenEl) hiddenEl.value = `${dateEl.value} ${timeEl.value}`;
    }
}

// 1. Quản lý file đính kèm cho Lệnh điều động (Trip modal)
function handleBookingFilesSelect(input) {
    if (!input || !input.files || input.files.length === 0) return;
    
    for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        if (file.size > 5 * 1024 * 1024) {
            showToast('warning', `File "${file.name}" vượt quá 5MB. Vui lòng chọn file nhẹ hơn.`, 'File Quá Dung Lượng');
            continue;
        }
        // Tránh trùng tên & kích thước
        const isDuplicate = tripBookingFilesList.some(f => f.name === file.name && f.size === file.size);
        if (!isDuplicate) {
            tripBookingFilesList.push(file);
        }
    }
    input.value = '';
    renderTripBookingFilesList();
}

function removeTripBookingFile(index) {
    if (index >= 0 && index < tripBookingFilesList.length) {
        tripBookingFilesList.splice(index, 1);
        renderTripBookingFilesList();
    }
}

function renderTripBookingFilesList() {
    const area = document.getElementById('booking-files-list-area');
    const summary = document.getElementById('booking-file-summary');
    if (!area) return;

    let itemsHtml = '';
    let totalCount = tripBookingFilesList.length;

    // Nếu có file kế thừa từ booking cha
    if (currentInheritedBookingFile && currentInheritedBookingFile.url) {
        totalCount += 1;
        const isPdf = currentInheritedBookingFile.url.toLowerCase().endsWith('.pdf');
        itemsHtml += `
            <div class="flex items-center justify-between p-2 rounded-lg bg-teal-50 border border-teal-200 text-xs">
                <div class="flex items-center space-x-2 truncate pr-2">
                    <i class="${isPdf ? 'ph-bold ph-file-pdf text-rose-600' : 'ph-bold ph-file-image text-teal-600'} text-base shrink-0"></i>
                    <div class="truncate">
                        <p class="font-bold text-teal-900 truncate" title="${currentInheritedBookingFile.name || 'File Booking'}">${currentInheritedBookingFile.name || 'File Booking'}</p>
                        <span class="text-[10px] text-teal-700 italic font-medium">(Kế thừa từ Booking)</span>
                    </div>
                </div>
                <div class="flex items-center space-x-1 shrink-0">
                    <a href="${currentInheritedBookingFile.url}" target="_blank" rel="noopener noreferrer" 
                        class="p-1 rounded text-teal-700 hover:text-teal-900 hover:bg-teal-100 transition-colors" title="Mở xem file">
                        <i class="ph-bold ph-arrow-square-out text-sm"></i>
                    </a>
                    <button type="button" onclick="removeInheritedBookingFile()" 
                        class="p-1 rounded text-rose-600 hover:text-rose-800 hover:bg-rose-50 transition-colors" title="Gỡ bỏ file kế thừa">
                        <i class="ph-bold ph-trash text-sm"></i>
                    </button>
                </div>
            </div>
        `;
    }

    tripBookingFilesList.forEach((file, idx) => {
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        const sizeKb = (file.size / 1024).toFixed(0);
        const sizeStr = file.size >= 1024 * 1024 ? `${sizeMb} MB` : `${sizeKb} KB`;
        const tempUrl = URL.createObjectURL(file);

        itemsHtml += `
            <div class="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 shadow-2xs text-xs">
                <div class="flex items-center space-x-2 truncate pr-2">
                    <i class="${isPdf ? 'ph-bold ph-file-pdf text-rose-600' : 'ph-bold ph-file-image text-blue-600'} text-base shrink-0"></i>
                    <div class="truncate">
                        <p class="font-bold text-slate-800 truncate" title="${file.name}">${file.name}</p>
                        <span class="text-[10px] text-slate-400 font-medium">(${sizeStr})</span>
                    </div>
                </div>
                <div class="flex items-center space-x-1 shrink-0">
                    <a href="${tempUrl}" target="_blank" rel="noopener noreferrer" 
                        class="p-1 rounded text-blue-700 hover:text-blue-900 hover:bg-blue-50 transition-colors" title="Xem trước">
                        <i class="ph-bold ph-eye text-sm"></i>
                    </a>
                    <button type="button" onclick="removeTripBookingFile(${idx})" 
                        class="p-1 rounded text-rose-600 hover:text-rose-800 hover:bg-rose-50 transition-colors" title="Xóa file">
                        <i class="ph-bold ph-trash text-sm"></i>
                    </button>
                </div>
            </div>
        `;
    });

    area.innerHTML = itemsHtml;
    if (summary) {
        if (totalCount > 0) {
            summary.innerHTML = `<i class="ph-bold ph-check-circle text-emerald-600"></i> <strong class="text-emerald-800">${totalCount}</strong> tệp đính kèm`;
        } else {
            summary.innerHTML = `<i class="ph ph-info text-blue-500"></i> Chưa có tệp nào được đính kèm (hoặc kế thừa từ Booking)`;
        }
    }
}

function clearBookingFileSelection() {
    const input = document.getElementById('inp-booking-file');
    if (input) input.value = '';
    tripBookingFilesList = [];
    currentInheritedBookingFile = null;
    renderTripBookingFilesList();
}

function showInheritedBookingFile(fileUrl, fileName) {
    if (!fileUrl) {
        currentInheritedBookingFile = null;
    } else {
        currentInheritedBookingFile = { url: fileUrl, name: fileName || 'File_Booking_Dinh_Kem' };
    }
    renderTripBookingFilesList();
}

function removeInheritedBookingFile() {
    currentInheritedBookingFile = null;
    renderTripBookingFilesList();
    showToast('info', 'Đã gỡ bỏ file đính kèm kế thừa từ Booking.');
}
