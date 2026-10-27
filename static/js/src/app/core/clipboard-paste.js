// ==============================================================================
// UNIVERSAL CLIPBOARD IMAGE PASTE SYSTEM (CTRL+V / NÚT DÁN ẢNH TRÊN TOÀN HỆ THỐNG)
// Hỗ trợ: Chat, Nhiệm vụ (Tạo mới & Chi tiết Drawer), Tờ khai Hải quan, 
// Booking (Modal & Fullpage), Chuyến xe (Modal & View), Tin tức, Hóa đơn OCR/Phí phát sinh
// ==============================================================================

function extractImageFromClipboardEvent(e) {
    const clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData || !clipboardData.items) return null;
    for (let i = 0; i < clipboardData.items.length; i++) {
        const item = clipboardData.items[i];
        if (item.type && item.type.startsWith('image/')) {
            const blob = item.getAsFile();
            if (blob) {
                const ext = item.type.split('/')[1] ? item.type.split('/')[1].replace('jpeg', 'jpg') : 'png';
                const now = new Date();
                const pad = n => String(n).padStart(2, '0');
                const timeStr = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
                return new File([blob], `clipboard_${timeStr}.${ext}`, { type: item.type });
            }
        }
    }
    return null;
}

function detectActiveUploadContext() {
    // 1. OCR Camera modal (Hóa đơn, phí phát sinh, vé BOT)
    const ocrModal = document.getElementById('modal-ocr');
    if (ocrModal && !ocrModal.classList.contains('hidden-view') && !ocrModal.classList.contains('hidden')) {
        return 'ocr';
    }

    // 2. Task modal tạo mới
    const createTaskModal = document.getElementById('modal-create-task');
    if (createTaskModal && !createTaskModal.classList.contains('hidden')) {
        return 'create_task';
    }

    // 3. Task Detail Drawer
    const taskDrawer = document.getElementById('task-detail-drawer');
    if (taskDrawer && !taskDrawer.classList.contains('translate-x-full') && !taskDrawer.classList.contains('hidden')) {
        return 'task_detail';
    }

    // 4. Modal Booking
    const bookingModal = document.getElementById('modal-booking');
    if (bookingModal && !bookingModal.classList.contains('hidden')) {
        return 'booking';
    }

    // 5. Booking Fullpage View
    const fullpageBookingFile = document.getElementById('fullpage-booking-order-file');
    if (fullpageBookingFile && fullpageBookingFile.offsetParent !== null) {
        return 'booking';
    }

    // 6. Modal Create Trip
    const tripModal = document.getElementById('modal-create-trip');
    if (tripModal && !tripModal.classList.contains('hidden')) {
        return 'trip';
    }

    // 7. View Create Trip
    const tripFileInp = document.getElementById('inp-booking-file');
    if (tripFileInp && tripFileInp.offsetParent !== null) {
        return 'trip';
    }

    // 8. Modal Customs Declaration
    const custModal = document.getElementById('modal-customs-declaration');
    if (custModal && !custModal.classList.contains('hidden')) {
        return 'customs';
    }

    // 9. View Customs Form
    const custFileInp = document.getElementById('cust-document-file');
    if (custFileInp && custFileInp.offsetParent !== null) {
        return 'customs';
    }

    // 10. View News Form
    const newsFileInp = document.getElementById('create-news-files');
    if (newsFileInp && newsFileInp.offsetParent !== null) {
        return 'news';
    }

    // 11. Chat (Floating Window hoặc Đang focus ô chat)
    const chatFloating = document.getElementById('chat-floating-window');
    if ((chatFloating && !chatFloating.classList.contains('hidden')) ||
        (document.activeElement && (document.activeElement.id === 'chat-message-input' || document.activeElement.closest('#chat-floating-window')))) {
        return 'chat';
    }

    return null;
}

function attachPastedImage(file, targetType) {
    if (!file) return;

    if (!targetType) {
        targetType = detectActiveUploadContext();
    }

    if (!targetType) {
        showToast('info', 'Đã sao chép ảnh vào bộ nhớ tạm. Hãy mở biểu mẫu hoặc khu vực tệp đính kèm rồi nhấn Ctrl+V để dán.', 'Đã Nhận Ảnh');
        return;
    }

    switch (targetType) {
        case 'chat': {
            if (typeof window.addChatSelectedFile === 'function') {
                window.addChatSelectedFile(file);
                showToast('success', `Đã đính kèm ảnh "${file.name}" vào tin nhắn`, 'Dán Ảnh Thành Công');
            } else if (typeof chatSelectedFiles !== 'undefined') {
                chatSelectedFiles.push(file);
                const preview = document.getElementById('chat-pending-files-preview');
                const text = document.getElementById('chat-pending-files-text');
                if (preview && text) {
                    text.textContent = `Đính kèm: ${chatSelectedFiles.map(f => f.name).join(', ')}`;
                    preview.classList.remove('hidden');
                }
                showToast('success', `Đã đính kèm ảnh "${file.name}" vào tin nhắn`, 'Dán Ảnh Thành Công');
            }
            break;
        }

        case 'booking': {
            const fullpageFileInp = document.getElementById('fullpage-booking-order-file');
            const isFullpage = fullpageFileInp && fullpageFileInp.offsetParent !== null;
            if (isFullpage && typeof fullpageBookingFilesList !== 'undefined') {
                fullpageBookingFilesList.push(file);
                if (typeof renderFullpageBookingFilesList === 'function') renderFullpageBookingFilesList();
                showToast('success', `Đã đính kèm ảnh "${file.name}" vào đơn Booking`, 'Dán Ảnh Thành Công');
            } else if (typeof saleBookingFilesList !== 'undefined') {
                saleBookingFilesList.push(file);
                if (typeof renderSaleBookingFilesList === 'function') renderSaleBookingFilesList();
                showToast('success', `Đã đính kèm ảnh "${file.name}" vào đơn Booking`, 'Dán Ảnh Thành Công');
            }
            break;
        }

        case 'trip': {
            if (typeof tripBookingFilesList !== 'undefined') {
                tripBookingFilesList.push(file);
                if (typeof renderTripBookingFilesList === 'function') renderTripBookingFilesList();
                showToast('success', `Đã đính kèm ảnh "${file.name}" vào chuyến xe`, 'Dán Ảnh Thành Công');
            }
            break;
        }

        case 'customs': {
            const custInp = document.getElementById('cust-document-file');
            if (custInp) {
                try {
                    const dt = new DataTransfer();
                    dt.items.add(file);
                    custInp.files = dt.files;
                    showToast('success', `Đã gán ảnh "${file.name}" vào hồ sơ tờ khai`, 'Dán Ảnh Thành Công');
                } catch (err) {
                    console.error('Không thể gán DataTransfer vào file input tờ khai:', err);
                }
            }
            break;
        }

        case 'task_detail': {
            if (typeof uploadTaskAttachment === 'function') {
                showToast('info', `Đang tải ảnh "${file.name}" lên nhiệm vụ...`, 'Đang Tải Tệp');
                uploadTaskAttachment({ target: { files: [file] } });
            }
            break;
        }

        case 'create_task': {
            if (typeof window.addCreateTaskInitialFile === 'function') {
                window.addCreateTaskInitialFile(file);
                showToast('success', `Đã đính kèm ảnh "${file.name}" vào nhiệm vụ mới`, 'Dán Ảnh Thành Công');
            } else if (typeof createTaskInitialFiles !== 'undefined') {
                createTaskInitialFiles.push(file);
                if (typeof renderCreateTaskInitialFiles === 'function') renderCreateTaskInitialFiles();
                showToast('success', `Đã đính kèm ảnh "${file.name}" vào nhiệm vụ mới`, 'Dán Ảnh Thành Công');
            }
            break;
        }

        case 'news': {
            const newsInp = document.getElementById('create-news-files');
            if (newsInp) {
                try {
                    const dt = new DataTransfer();
                    if (newsInp.files) {
                        for (let i = 0; i < newsInp.files.length; i++) {
                            dt.items.add(newsInp.files[i]);
                        }
                    }
                    dt.items.add(file);
                    newsInp.files = dt.files;
                    showToast('success', `Đã đính kèm ảnh "${file.name}" vào bài viết tin tức`, 'Dán Ảnh Thành Công');
                } catch (err) {
                    console.error('Không thể gán DataTransfer vào file input tin tức:', err);
                }
            }
            break;
        }

        case 'ocr':
        case 'expense': {
            const ocrModal = document.getElementById('modal-ocr');
            if (ocrModal) {
                showToast('info', `Đã nhận ảnh hóa đơn/chứng từ "${file.name}" từ Clipboard, đang quét AI...`, 'Đang Xử Lý Ảnh');
                if (typeof startOcrScan === 'function') {
                    startOcrScan();
                }
            }
            break;
        }

        default:
            console.warn('Chưa xác định được targetType:', targetType);
            break;
    }
}

async function pasteImageFromClipboard(targetType) {
    try {
        if (!targetType) {
            targetType = detectActiveUploadContext();
        }
        if (!targetType) {
            showToast('info', 'Vui lòng mở một biểu mẫu hoặc khu vực tải tệp trước khi dán ảnh.', 'Chưa Chọn Vị Trí Dán');
            return;
        }

        if (!navigator.clipboard || !navigator.clipboard.read) {
            showToast('warning', 'Trình duyệt chưa hỗ trợ đọc clipboard tự động qua nút bấm. Bạn vui lòng nhấn tổ hợp phím Ctrl + V để dán trực tiếp.', 'Dùng Phím Tắt Ctrl+V');
            return;
        }

        const items = await navigator.clipboard.read();
        let foundImage = false;
        for (const item of items) {
            const imageType = item.types.find(t => t.startsWith('image/'));
            if (imageType) {
                foundImage = true;
                const blob = await item.getType(imageType);
                const ext = imageType.split('/')[1] ? imageType.split('/')[1].replace('jpeg', 'jpg') : 'png';
                const now = new Date();
                const pad = n => String(n).padStart(2, '0');
                const timeStr = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
                const file = new File([blob], `clipboard_${timeStr}.${ext}`, { type: imageType });
                attachPastedImage(file, targetType);
                break;
            }
        }
        if (!foundImage) {
            showToast('warning', 'Không tìm thấy hình ảnh nào trong bộ nhớ tạm (Clipboard). Vui lòng chụp ảnh màn hình (PrintScreen / Win+Shift+S) rồi thử lại.', 'Clipboard Trống');
        }
    } catch (err) {
        console.warn('Lỗi khi đọc clipboard qua navigator.clipboard.read():', err);
        showToast('warning', 'Không thể truy cập bộ nhớ tạm. Hãy nhấn phím Ctrl + V tại biểu mẫu để dán ảnh trực tiếp.', 'Phím Tắt Ctrl+V');
    }
}

// Bắt sự kiện Paste toàn cục: Khi người dùng bấm Ctrl+V ở bất kỳ đâu, nếu có ảnh thì tự động đính kèm
window.addEventListener('paste', function(e) {
    const file = extractImageFromClipboardEvent(e);
    if (!file) return; // Nếu không có ảnh, để trình duyệt dán văn bản bình thường

    const targetType = detectActiveUploadContext();
    if (!targetType) return; // Nếu không nằm trong form/modal nào có upload ảnh, để mặc định

    e.preventDefault();
    attachPastedImage(file, targetType);
});

window.pasteImageFromClipboard = pasteImageFromClipboard;
window.extractImageFromClipboardEvent = extractImageFromClipboardEvent;
window.detectActiveUploadContext = detectActiveUploadContext;
window.attachPastedImage = attachPastedImage;
