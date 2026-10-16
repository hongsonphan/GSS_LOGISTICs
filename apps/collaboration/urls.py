from django.urls import path
from apps.collaboration.api_views.news_api import (
    PostCategoryListAPIView,
    CompanyPostListCreateAPIView,
    CompanyPostDetailAPIView,
    CompanyPostCommentCreateAPIView,
    CompanyPostPinAPIView
)
from apps.collaboration.api_views.tasks_api import (
    OfficeTaskListCreateAPIView,
    OfficeTaskDetailAPIView,
    OfficeTaskStatusUpdateAPIView,
    OfficeTaskChecklistAPIView,
    OfficeTaskCommentAPIView,
    OfficeTaskAttachmentAPIView,
    OfficeTaskDirectoryAPIView
)
from apps.collaboration.api_views.chat_api import (
    ChatRoomListCreateAPIView,
    ChatMessageListCreateAPIView,
    ChatMarkReadAPIView
)
from apps.collaboration.api_views.notification_api import (
    NotificationListAPIView,
    NotificationMarkReadAPIView,
    NotificationMarkAllReadAPIView
)

urlpatterns = [
    # BẢN TIN CÔNG TY
    path('news/categories/', PostCategoryListAPIView.as_view(), name='collab-news-categories'),
    path('news/posts/', CompanyPostListCreateAPIView.as_view(), name='collab-news-posts'),
    path('news/posts/<int:pk>/', CompanyPostDetailAPIView.as_view(), name='collab-news-post-detail'),
    path('news/posts/<int:pk>/comments/', CompanyPostCommentCreateAPIView.as_view(), name='collab-news-post-comment'),
    path('news/posts/<int:pk>/pin/', CompanyPostPinAPIView.as_view(), name='collab-news-post-pin'),

    # GIAO VIỆC VĂN PHÒNG (TASKS)
    path('tasks/', OfficeTaskListCreateAPIView.as_view(), name='collab-tasks-list-create'),
    path('tasks/directory/', OfficeTaskDirectoryAPIView.as_view(), name='collab-tasks-directory'),
    path('tasks/<int:pk>/', OfficeTaskDetailAPIView.as_view(), name='collab-task-detail'),
    path('tasks/<int:pk>/status/', OfficeTaskStatusUpdateAPIView.as_view(), name='collab-task-status-update'),
    path('tasks/<int:pk>/checklists/', OfficeTaskChecklistAPIView.as_view(), name='collab-task-checklist'),
    path('tasks/<int:pk>/comments/', OfficeTaskCommentAPIView.as_view(), name='collab-task-comment'),
    path('tasks/<int:pk>/attachments/', OfficeTaskAttachmentAPIView.as_view(), name='collab-task-attachment'),

    # CHAT NỘI BỘ VĂN PHÒNG
    path('chat/rooms/', ChatRoomListCreateAPIView.as_view(), name='collab-chat-rooms'),
    path('chat/rooms/<int:room_id>/messages/', ChatMessageListCreateAPIView.as_view(), name='collab-chat-messages'),
    path('chat/rooms/<int:room_id>/mark-read/', ChatMarkReadAPIView.as_view(), name='collab-chat-mark-read'),

    # THÔNG BÁO NỘI BỘ LÊN CHUÔNG (BELL NOTIFICATIONS)
    path('notifications/', NotificationListAPIView.as_view(), name='collab-notifications-list'),
    path('notifications/<int:pk>/mark-read/', NotificationMarkReadAPIView.as_view(), name='collab-notification-mark-read'),
    path('notifications/mark-all-read/', NotificationMarkAllReadAPIView.as_view(), name='collab-notifications-mark-all-read'),
]
