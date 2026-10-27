// ==========================================
// THAO TÁC ĐỀ XUẤT GIA HẠN & PHÊ DUYỆT GIA HẠN CÔNG VIỆC
// ==========================================

function openRequestExtensionInline() {
    const form = document.getElementById('task-drawer-request-extension-form');
    if (!form) return;
    form.classList.remove('hidden');
    form.style.display = 'block';

    const inputDate = document.getElementById('ext-input-new-deadline');
    const inputReason = document.getElementById('ext-input-reason');

    if (inputReason) inputReason.value = '';

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDateStr = tomorrow.toISOString().split('T')[0];

    if (inputDate) {
        inputDate.min = minDateStr;
        if (currentTaskDetailData && currentTaskDetailData.due_date) {
            try {
                const cur = new Date(currentTaskDetailData.due_date);
                cur.setDate(cur.getDate() + 3);
                inputDate.value = cur.toISOString().split('T')[0];
            } catch(e) {
                inputDate.value = minDateStr;
            }
        } else {
            inputDate.value = minDateStr;
        }
        inputDate.focus();
    }
}
window.openRequestExtensionInline = openRequestExtensionInline;

function closeRequestExtensionInline() {
    const form = document.getElementById('task-drawer-request-extension-form');
    if (form) {
        form.classList.add('hidden');
        form.style.display = 'none';
    }
}
window.closeRequestExtensionInline = closeRequestExtensionInline;

async function submitTaskExtensionRequest() {
    if (!currentViewingTaskId) return;
    const inputDate = document.getElementById('ext-input-new-deadline');
    const inputReason = document.getElementById('ext-input-reason');

    const requested_deadline = inputDate?.value;
    const reason = inputReason?.value?.trim();

    if (!requested_deadline) {
        showToast('Vui lòng chọn hạn hoàn thành mới đề xuất.', 'warning');
        if (inputDate) inputDate.focus();
        return;
    }
    if (!reason) {
        showToast('Vui lòng nhập lý do đề xuất dời hạn để người giao việc duyệt.', 'warning');
        if (inputReason) inputReason.focus();
        return;
    }

    try {
        const res = await authFetch(`/api/collaboration/tasks/${currentViewingTaskId}/extension/`, {
            method: 'POST',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
                action: 'request',
                requested_deadline,
                reason
            })
        });
        const json = await res.json();
        if (json.success) {
            showToast(json.message || 'Đã gửi đề xuất gia hạn thành công!', 'success');
            closeRequestExtensionInline();
            await openTaskDetailDrawer(currentViewingTaskId);
            if (typeof loadOfficeTasks === 'function') loadOfficeTasks();
            if (typeof checkNotificationUnreadCount === 'function') checkNotificationUnreadCount();
            if (typeof loadDashboardData === 'function') loadDashboardData();
        } else {
            showToast(json.message || 'Không thể gửi đề xuất gia hạn.', 'error');
        }
    } catch (e) {
        console.error('Error requesting task extension:', e);
        showToast('Lỗi kết nối máy chủ.', 'error');
    }
}
window.submitTaskExtensionRequest = submitTaskExtensionRequest;

function toggleRejectExtensionBox(show) {
    const box = document.getElementById('ext-reject-reason-box');
    if (!box) return;
    if (show) {
        box.classList.remove('hidden');
        box.style.display = 'block';
        const input = document.getElementById('ext-reject-reason-input');
        if (input) {
            input.value = '';
            setTimeout(() => input.focus(), 60);
        }
    } else {
        box.classList.add('hidden');
        box.style.display = 'none';
    }
}
window.toggleRejectExtensionBox = toggleRejectExtensionBox;

async function submitRejectTaskExtension() {
    if (!currentViewingTaskId) return;
    const input = document.getElementById('ext-reject-reason-input');
    const note = (input ? input.value : '').trim();
    if (!note) {
        showToast('Vui lòng nhập lý do không đồng ý gia hạn để phản hồi cho người phụ trách.', 'warning');
        if (input) input.focus();
        return;
    }
    await reviewTaskExtension('reject', note);
    toggleRejectExtensionBox(false);
}
window.submitRejectTaskExtension = submitRejectTaskExtension;

async function reviewTaskExtension(action, directNote = '') {
    if (!currentViewingTaskId) return;
    let note = directNote;

    if (action === 'approve') {
        const ok = confirm('XÁC NHẬN ĐỒNG Ý GIA HẠN:\nBạn có chắc chắn muốn phê duyệt dời hạn hoàn thành công việc này sang ngày mới?');
        if (!ok) return;
    }

    try {
        const res = await authFetch(`/api/collaboration/tasks/${currentViewingTaskId}/extension/`, {
            method: 'POST',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
                action,
                note
            })
        });
        const json = await res.json();
        if (json.success) {
            showToast(json.message || 'Đã cập nhật trạng thái gia hạn!', 'success');
            await openTaskDetailDrawer(currentViewingTaskId);
            if (typeof loadOfficeTasks === 'function') loadOfficeTasks();
            if (typeof checkNotificationUnreadCount === 'function') checkNotificationUnreadCount();
            if (typeof loadDashboardData === 'function') loadDashboardData();
        } else {
            showToast(json.message || 'Thao tác không thành công.', 'error');
        }
    } catch (e) {
        console.error('Error reviewing task extension:', e);
        showToast('Lỗi kết nối máy chủ.', 'error');
    }
}
window.reviewTaskExtension = reviewTaskExtension;

async function cancelTaskExtension() {
    if (!currentViewingTaskId) return;
    const ok = confirm('Bạn có chắc chắn muốn thu hồi yêu cầu đề xuất gia hạn này?');
    if (!ok) return;

    try {
        const res = await authFetch(`/api/collaboration/tasks/${currentViewingTaskId}/extension/`, {
            method: 'POST',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ action: 'cancel' })
        });
        const json = await res.json();
        if (json.success) {
            showToast(json.message || 'Đã thu hồi đề xuất gia hạn.', 'info');
            await openTaskDetailDrawer(currentViewingTaskId);
            if (typeof loadOfficeTasks === 'function') loadOfficeTasks();
            if (typeof checkNotificationUnreadCount === 'function') checkNotificationUnreadCount();
            if (typeof loadDashboardData === 'function') loadDashboardData();
        } else {
            showToast(json.message || 'Thao tác không thành công.', 'error');
        }
    } catch (e) {
        console.error('Error cancelling task extension:', e);
        showToast('Lỗi kết nối máy chủ.', 'error');
    }
}
window.cancelTaskExtension = cancelTaskExtension;
