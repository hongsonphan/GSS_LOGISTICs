// ==========================================================================
// 5. PHÂN HỆ: CHUÔNG THÔNG BÁO NỘI BỘ (IN-APP BELL NOTIFICATIONS)
// ==========================================================================

let currentNotificationFilter = 'all'; // 'all' | 'unread'
let currentNotificationsList = [];

function initBellNotifications() {
    checkNotificationUnreadCount();
    // Định kỳ kiểm tra thông báo chuông mỗi 15s
    if (window.bellNotifTimer) clearInterval(window.bellNotifTimer);
    window.bellNotifTimer = setInterval(checkNotificationUnreadCount, 15000);

    // Đóng dropdown khi click ra ngoài
    document.addEventListener('click', function(e) {
        const container = document.getElementById('topbar-notification-container');
        const menu = document.getElementById('notification-dropdown-menu');
        if (container && menu && !container.contains(e.target)) {
            menu.classList.add('hidden');
        }
    });
}

async function checkNotificationUnreadCount() {
    try {
        const res = await authFetch('/api/collaboration/notifications/?limit=1', {
            headers: getAuthHeaders()
        });
        const json = await res.json();
        if (json.success) {
            updateNotificationBadge(json.total_unread);
        }
    } catch (e) {
        // Silent fail
    }
}

function updateNotificationBadge(unreadCount) {
    const badge = document.getElementById('notification-unread-badge');
    const pill = document.getElementById('notification-count-pill');
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
    if (pill) {
        pill.textContent = `${unreadCount} mới`;
    }
}

function toggleNotificationDropdown(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('notification-dropdown-menu');
    if (!menu) return;

    if (menu.classList.contains('hidden')) {
        menu.classList.remove('hidden');
        loadNotifications(currentNotificationFilter);
    } else {
        menu.classList.add('hidden');
    }
}

function filterNotifications(filterMode) {
    currentNotificationFilter = filterMode;
    const tabAll = document.getElementById('notif-tab-all');
    const tabUnread = document.getElementById('notif-tab-unread');

    if (filterMode === 'all') {
        if (tabAll) {
            tabAll.className = 'px-3 py-1.5 border-b-2 border-teal-600 text-teal-800 font-bold transition-colors';
        }
        if (tabUnread) {
            tabUnread.className = 'px-3 py-1.5 border-b-2 border-transparent text-slate-600 hover:text-teal-800 transition-colors';
        }
    } else {
        if (tabAll) {
            tabAll.className = 'px-3 py-1.5 border-b-2 border-transparent text-slate-600 hover:text-teal-800 transition-colors';
        }
        if (tabUnread) {
            tabUnread.className = 'px-3 py-1.5 border-b-2 border-teal-600 text-teal-800 font-bold transition-colors';
        }
    }
    loadNotifications(filterMode);
}

async function loadNotifications(filterMode = 'all') {
    const listEl = document.getElementById('notification-items-list');
    if (!listEl) return;

    listEl.innerHTML = '<div class="p-6 text-center text-xs text-slate-400"><i class="ph ph-spinner ph-spin text-lg mb-1 block"></i>Đang tải thông báo...</div>';

    try {
        const url = filterMode === 'unread' ? '/api/collaboration/notifications/?unread=1' : '/api/collaboration/notifications/';
        const res = await authFetch(url, { headers: getAuthHeaders() });
        const json = await res.json();
        if (!json.success || !json.data) {
            listEl.innerHTML = '<div class="p-6 text-center text-xs text-slate-400">Không thể tải thông báo.</div>';
            return;
        }

        updateNotificationBadge(json.total_unread);
        currentNotificationsList = json.data;

        if (json.data.length === 0) {
            listEl.innerHTML = `
                <div class="p-8 text-center text-xs text-slate-400">
                    <i class="ph ph-bell-simple-slash text-2xl mb-1.5 text-slate-300 block"></i>
                    ${filterMode === 'unread' ? 'Không có thông báo chưa đọc nào.' : 'Chưa có thông báo nào gửi đến bạn.'}
                </div>
            `;
            return;
        }

        listEl.innerHTML = json.data.map(item => {
            let iconClass = 'ph-bold ph-bell bg-slate-100 text-slate-600';
            if (item.notification_type === 'TASK_ASSIGNED') {
                iconClass = 'ph-bold ph-check-square-offset bg-amber-50 text-amber-700 border border-amber-200';
            } else if (item.notification_type === 'TASK_STATUS_CHANGED') {
                iconClass = 'ph-bold ph-arrows-clockwise bg-sky-50 text-sky-700 border border-sky-200';
            } else if (item.notification_type === 'NEWS_URGENT') {
                iconClass = 'ph-bold ph-warning-octagon bg-rose-50 text-rose-700 border border-rose-200';
            } else if (item.notification_type === 'NEWS_NEW') {
                iconClass = 'ph-bold ph-newspaper bg-teal-50 text-teal-700 border border-teal-200';
            } else if (item.notification_type === 'CHAT_MENTION') {
                iconClass = 'ph-bold ph-at bg-indigo-50 text-indigo-700 border border-indigo-200';
            } else if (item.notification_type === 'TASK_EXTENSION_REQUESTED') {
                iconClass = 'ph-bold ph-clock-countdown bg-purple-50 text-purple-700 border border-purple-200';
            } else if (item.notification_type === 'TASK_EXTENSION_REVIEWED') {
                iconClass = 'ph-bold ph-calendar-check bg-emerald-50 text-emerald-700 border border-emerald-200';
            }

            return `
                <div onclick="handleNotificationClick(${item.id}, '${item.target_type}', ${item.target_id || 'null'}, '${escapeHtml(item.link_url || '')}')" 
                    class="p-3.5 flex items-start gap-3 hover:bg-teal-50/50 cursor-pointer transition-colors relative group ${item.is_read ? 'bg-white opacity-85' : 'bg-slate-50/80 font-medium'}">
                    
                    <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm shadow-2xs ${iconClass}">
                        <i class="${iconClass.split(' ')[0]} ${iconClass.split(' ')[1]}"></i>
                    </div>

                    <div class="flex-1 min-w-0 pr-4">
                        <div class="flex items-center justify-between gap-2 mb-0.5">
                            <span class="text-[10px] font-bold uppercase tracking-wider ${item.is_read ? 'text-slate-400' : 'text-teal-800'}">
                                ${escapeHtml(item.type_display || 'Thông báo')}
                            </span>
                            <span class="text-[10px] text-slate-400 shrink-0 font-normal">
                                ${formatTimeAgo(item.created_at)}
                            </span>
                        </div>
                        <h5 class="text-xs font-bold ${item.is_read ? 'text-slate-700' : 'text-slate-900'} leading-snug truncate">
                            ${escapeHtml(item.title)}
                        </h5>
                        <p class="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                            ${escapeHtml(item.message)}
                        </p>
                    </div>

                    ${!item.is_read ? `
                        <span class="w-2 h-2 rounded-full bg-teal-600 shrink-0 absolute right-3 top-4 shadow-2xs" title="Chưa đọc"></span>
                    ` : ''}
                </div>
            `;
        }).join('');

    } catch (e) {
        console.error('Error loading notifications:', e);
        listEl.innerHTML = '<div class="p-6 text-center text-xs text-rose-500">Lỗi kết nối máy chủ.</div>';
    }
}

async function handleNotificationClick(notifId, targetType, targetId, linkUrl) {
    // 1. Đánh dấu đã đọc
    try {
        await authFetch(`/api/collaboration/notifications/${notifId}/mark-read/`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        checkNotificationUnreadCount();
    } catch (e) {
        console.error('Error marking read:', e);
    }

    // 2. Đóng dropdown chuông
    const menu = document.getElementById('notification-dropdown-menu');
    if (menu) menu.classList.add('hidden');

    // 3. Điều hướng an toàn & thông minh
    if (targetType === 'NEWS' && targetId) {
        if (typeof showView === 'function') {
            showView('view-ban-tin');
            if (typeof openNewsDetailModal === 'function') {
                openNewsDetailModal(targetId);
            }
        } else {
            window.location.href = linkUrl || `/news/${targetId}/`;
        }
    } else if (targetType === 'TASK' && targetId) {
        if (typeof showView === 'function') {
            showView('view-giao-viec');
            if (typeof openTaskDetailDrawer === 'function') {
                openTaskDetailDrawer(targetId);
            }
        } else {
            window.location.href = `/tasks/#task-${targetId}`;
        }
    } else if (targetType === 'CHAT') {
        toggleChatWindow();
    } else if (linkUrl) {
        // Bảo mật URL: Chặn Open Redirect sang domain ngoài, chỉ hỗ trợ relative link (# hoặc /)
        if (linkUrl.startsWith('#')) {
            const viewId = linkUrl.substring(1);
            if (typeof showView === 'function') {
                showView(viewId === 'tasks' ? 'view-giao-viec' : (viewId === 'news' ? 'view-ban-tin' : viewId));
            } else {
                window.location.href = `/${linkUrl}`;
            }
        } else if (linkUrl.startsWith('/tasks')) {
            if (typeof showView === 'function') {
                showView('view-giao-viec');
                if (targetId && typeof openTaskDetailDrawer === 'function') {
                    openTaskDetailDrawer(targetId);
                }
            } else {
                window.location.href = linkUrl;
            }
        } else if (linkUrl.startsWith('/news')) {
            if (typeof showView === 'function' && targetId) {
                showView('view-ban-tin');
                if (typeof openNewsDetailModal === 'function') {
                    openNewsDetailModal(targetId);
                }
            } else {
                window.location.href = linkUrl;
            }
        } else if (linkUrl.startsWith('/') && !linkUrl.startsWith('//')) {
            window.location.href = linkUrl;
        }
    }
}

async function markAllNotificationsAsRead() {
    try {
        const res = await authFetch('/api/collaboration/notifications/mark-all-read/', {
            method: 'POST',
            headers: getAuthHeaders()
        });
        const json = await res.json();
        if (json.success) {
            updateNotificationBadge(0);
            loadNotifications(currentNotificationFilter);
            if (typeof showToast === 'function') {
                showToast('success', 'Đã đánh dấu tất cả thông báo là đã đọc.');
            }
        }
    } catch (e) {
        console.error('Error marking all read:', e);
    }
}
