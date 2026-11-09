// ==========================================================================
// 4. HELPER UTILITIES
// ==========================================================================

function getPriorityBadgeClass(priority) {
    switch (priority) {
        case 'URGENT': return 'bg-rose-100 text-rose-800 border border-rose-200';
        case 'HIGH': return 'bg-orange-100 text-orange-800 border border-orange-200';
        case 'MEDIUM': return 'bg-sky-100 text-sky-800 border border-sky-200';
        case 'LOW': return 'bg-slate-100 text-slate-700 border border-slate-200';
        default: return 'bg-slate-100 text-slate-700';
    }
}

function getPriorityText(priority) {
    switch (priority) {
        case 'URGENT': return 'Khẩn cấp';
        case 'HIGH': return 'Cao';
        case 'MEDIUM': return 'Bình thường';
        case 'LOW': return 'Thấp';
        default: return priority;
    }
}

function getStatusBadgeClass(status) {
    switch (status) {
        case 'DONE': return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
        case 'REVIEW': return 'bg-amber-100 text-amber-800 border border-amber-200';
        case 'IN_PROGRESS': return 'bg-sky-100 text-sky-800 border border-sky-200';
        case 'TODO': return 'bg-slate-100 text-slate-700 border border-slate-200';
        default: return 'bg-slate-100 text-slate-700';
    }
}

function getStatusText(status) {
    switch (status) {
        case 'DONE': return 'Hoàn thành';
        case 'REVIEW': return 'Chờ nghiệm thu';
        case 'IN_PROGRESS': return 'Đang làm';
        case 'TODO': return 'Cần làm';
        case 'CANCELLED': return 'Đã hủy';
        default: return status;
    }
}

function formatDateDMY(dStr) {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dStr;
}

function parseDateFlexible(dateStr) {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;
    if (typeof dateStr === 'string') {
        const str = dateStr.trim();
        // Kiểm tra định dạng DD/MM/YYYY HH:mm[:ss] hoặc DD/MM/YYYY
        const dmyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
        if (dmyMatch) {
            const day = parseInt(dmyMatch[1], 10);
            const month = parseInt(dmyMatch[2], 10) - 1;
            const year = parseInt(dmyMatch[3], 10);
            const hour = parseInt(dmyMatch[4] || 0, 10);
            const minute = parseInt(dmyMatch[5] || 0, 10);
            const second = parseInt(dmyMatch[6] || 0, 10);
            const parsed = new Date(year, month, day, hour, minute, second);
            if (!isNaN(parsed.getTime())) return parsed;
        }
        // Thử parse Date thông thường (hỗ trợ ISO YYYY-MM-DDTHH:mm:ssZ)
        const d = new Date(str);
        if (!isNaN(d.getTime())) return d;
    }
    return null;
}

function formatDateTime(isoStr) {

    if (!isoStr) return '';
    const d = parseDateFlexible(isoStr);
    if (!d) return isoStr;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
window.formatDateTime = formatDateTime;
window.formatDateTimeDMY = formatDateTime;

function formatTimeOnly(isoStr) {
    if (!isoStr) return '';
    // Nếu là string có dạng time HH:mm
    if (typeof isoStr === 'string') {
        const timeMatch = isoStr.match(/\b(\d{1,2}:\d{2})(?::\d{2})?\b/);
        if (timeMatch) {
            return timeMatch[1];
        }
    }
    const d = parseDateFlexible(isoStr);
    if (!d) return '';
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatTimeAgo(isoStr) {
    if (!isoStr) return '';
    const d = parseDateFlexible(isoStr);
    if (!d) return '';
    const diffMs = Date.now() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}
