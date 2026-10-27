function formatNewsDate(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    } catch (e) {
        return dateStr;
    }
}

/**
 * ==========================================================================
 * BIM LOGISTICS — COLLABORATION MODULE (NEWS, TASKS, IN-APP TEAM CHAT)
 * Kế thừa chuẩn quốc tế từ Bim Ecosystem (Bim_Consulting & Bim_ERP-Solutions)
 * Áp dụng riêng cho Ban Giám Đốc, Quản lý và Cán bộ Nhân viên Văn phòng
 * ==========================================================================
 */

// Global State
let currentNewsList = [];
let currentViewingNewsId = null;
let currentTaskViewMode = 'kanban'; // 'kanban' | 'list'
let currentTaskScope = 'all'; // 'all' | 'my_tasks' | 'assigned_by_me'
let currentViewingTaskId = null;
let officeDirectoryUsers = [];
let collaborationUserPerms = null;

// Chat State
let chatActiveRoomId = null;
let chatLatestMessageId = 0;
let chatPollTimer = null;
let chatSelectedFiles = [];

async function authFetch(url, options = {}) {
    if (typeof fetchWithAuth === 'function') {
        return await fetchWithAuth(url, options);
    }
    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders(options.headers || {}) : (options.headers || {});
    return await fetch(url, { ...options, headers });
}
