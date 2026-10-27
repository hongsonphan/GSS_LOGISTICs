// Khởi chạy module Collaboration an toàn (kể cả khi DOM đã tải xong)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        initCollaborationChat();
        initBellNotifications();
    });
} else {
    initCollaborationChat();
    initBellNotifications();
}
window.initBellNotifications = initBellNotifications;
window.checkNotificationUnreadCount = checkNotificationUnreadCount;
