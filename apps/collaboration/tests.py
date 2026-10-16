from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.personnel.models import Employee, Department, EmployeeRole
from apps.collaboration.models import (
    PostCategory, CompanyPost, PostComment, PostReadStatus,
    OfficeTask, TaskPriority, TaskStatus, TaskChecklist, TaskComment, TaskActivityLog,
    RoomType, ChatRoom, ChatParticipant, ChatMessage, Notification, NotificationType
)

User = get_user_model()


class CollaborationTestSuite(TestCase):
    """Bộ kiểm thử tích hợp toàn diện cho phân hệ Bản tin, Giao việc và Chat nội bộ."""

    def setUp(self):
        self.client = Client()

        # Tạo tài khoản Ban Giám Đốc
        self.director_user = User.objects.create_user(
            username='director_test',
            password='Password123!',
            first_name='Võ',
            last_name='Triền'
        )
        self.director_emp = Employee.objects.create(
            user=self.director_user,
            code='BGD01',
            full_name='Võ Triền',
            department=Department.MANAGEMENT,
            role=EmployeeRole.DIRECTOR,
            is_department_head=True,
            phone_number='0901111111'
        )

        # Tạo tài khoản Trưởng phòng Điều Vận
        self.dispatcher_user = User.objects.create_user(
            username='dispatcher_test',
            password='Password123!',
            first_name='Nguyễn',
            last_name='Điều Độ'
        )
        self.dispatcher_emp = Employee.objects.create(
            user=self.dispatcher_user,
            code='DD01',
            full_name='Nguyễn Điều Độ',
            department=Department.DISPATCH,
            role=EmployeeRole.DISPATCHER,
            is_department_head=True,
            phone_number='0902222222'
        )

        # Tạo tài khoản Chuyên viên Điều độ (Cấp dưới)
        self.staff_dispatcher_user = User.objects.create_user(
            username='staff_dispatcher_test',
            password='Password123!',
            first_name='Phạm',
            last_name='Điều Độ Viên'
        )
        self.staff_dispatcher_emp = Employee.objects.create(
            user=self.staff_dispatcher_user,
            code='DD02',
            full_name='Phạm Điều Độ Viên',
            department=Department.DISPATCH,
            role=EmployeeRole.DISPATCHER,
            is_department_head=False,
            phone_number='0902222223'
        )

        # Tạo tài khoản Kế toán trưởng
        self.accountant_user = User.objects.create_user(
            username='accountant_test',
            password='Password123!',
            first_name='Trần',
            last_name='Kế Toán'
        )
        self.accountant_emp = Employee.objects.create(
            user=self.accountant_user,
            code='KT01',
            full_name='Trần Kế Toán',
            department=Department.ACCOUNTING,
            role=EmployeeRole.ACCOUNTANT,
            is_department_head=True,
            phone_number='0903333333'
        )

        # Tạo tài khoản Hành chính Nhân sự
        self.hr_user = User.objects.create_user(
            username='hr_test',
            password='Password123!',
            first_name='Lê',
            last_name='Nhân Sự'
        )
        self.hr_emp = Employee.objects.create(
            user=self.hr_user,
            code='NS01',
            full_name='Lê Nhân Sự',
            department=Department.HR,
            role=EmployeeRole.ACCOUNTANT,
            is_department_head=True,
            phone_number='0904444444'
        )

    # ----------------------------------------------------
    # 1. KIỂM THỬ BẢN TIN CÔNG TY
    # ----------------------------------------------------
    def test_company_news_lifecycle(self):
        """Kiểm thử chu trình đăng, ghim, xem chi tiết và bình luận bản tin công ty."""
        self.client.force_login(self.director_user)

        # 1. Lấy danh mục
        res_cat = self.client.get('/api/collaboration/news/categories/')
        self.assertEqual(res_cat.status_code, 200)
        self.assertTrue(len(res_cat.json()['data']) >= 4)
        cat_id = res_cat.json()['data'][0]['id']

        # 2. Đăng bản tin
        post_data = {
            'title': 'Thông báo triển khai kế hoạch vận tải Quý 4/2026',
            'category_id': cat_id,
            'summary': 'Tập trung cao độ cho mùa cao điểm xuất nhập khẩu container.',
            'content': 'Toàn thể cán bộ nhân viên văn phòng tuân thủ nghiêm ngặt quy trình SOP.',
            'is_pinned': True,
            'is_urgent': True,
            'target_department': 'ALL'
        }
        res_create = self.client.post('/api/collaboration/news/posts/', post_data)
        self.assertEqual(res_create.status_code, 201)
        post_id = res_create.json()['data']['id']

        # 3. Kế toán xem chi tiết bản tin
        self.client.force_login(self.accountant_user)
        res_detail = self.client.get(f'/api/collaboration/news/posts/{post_id}/')
        self.assertEqual(res_detail.status_code, 200)
        self.assertEqual(res_detail.json()['data']['view_count'], 1)
        self.assertTrue(res_detail.json()['data']['is_read'])

        # 4. Kế toán bình luận
        res_comment = self.client.post(f'/api/collaboration/news/posts/{post_id}/comments/', {
            'content': 'Phòng Kế toán đã nắm thông tin và sẵn sàng đối soát cước nhanh.'
        })
        self.assertEqual(res_comment.status_code, 201)

        # 5. Kiểm tra danh sách hiển thị
        res_list = self.client.get('/api/collaboration/news/posts/')
        self.assertEqual(res_list.status_code, 200)
        self.assertEqual(len(res_list.json()['data']), 1)
        self.assertEqual(res_list.json()['data'][0]['comments_count'], 1)

    # ----------------------------------------------------
    # 2. KIỂM THỬ GIAO VIỆC VĂN PHÒNG (JIRA/ASANA)
    # ----------------------------------------------------
    def test_office_tasks_jira_lifecycle(self):
        """Kiểm thử giao việc, cập nhật checklist, tính % tiến độ và kéo thả trạng thái Kanban."""
        self.client.force_login(self.director_user)

        # 1. Ban Giám Đốc giao việc cho Điều độ viên
        task_data = {
            'title': 'Hoàn tất đối soát biểu cước Cát Lái - VSIP',
            'department': Department.DISPATCH,
            'priority': TaskPriority.HIGH,
            'assignee_id': self.dispatcher_user.id,
            'due_date': '2026-10-30',
            'description': 'Rà soát toàn bộ chi phí nâng hạ và vé BOT tuyến VSIP.',
            'checklists': [
                'Tổng hợp danh sách chuyến TVL',
                'Kiểm tra hóa đơn nâng hạ cont',
                'Ký duyệt biên bản đối soát'
            ]
        }
        res_create = self.client.post('/api/collaboration/tasks/', task_data, content_type='application/json')
        self.assertEqual(res_create.status_code, 201)
        task_info = res_create.json()['data']
        task_id = task_info['id']
        self.assertTrue(task_info['code'].startswith('TSK.'))
        self.assertEqual(len(task_info['checklists']), 3)

        # 2. Lấy danh sách Kanban
        res_kanban = self.client.get('/api/collaboration/tasks/?view=kanban')
        self.assertEqual(res_kanban.status_code, 200)
        self.assertEqual(res_kanban.json()['counts']['todo'], 1)

        # 3. Điều độ viên nhận việc: Chuyển sang IN_PROGRESS
        self.client.force_login(self.dispatcher_user)
        res_status = self.client.post(f'/api/collaboration/tasks/{task_id}/status/', {
            'status': TaskStatus.IN_PROGRESS
        })
        self.assertEqual(res_status.status_code, 200)

        # 4. Tích hoàn thành 2 mục checklist -> tự động tính lại % tiến độ
        task_obj = OfficeTask.objects.get(id=task_id)
        c1, c2, c3 = task_obj.checklists.all()[:3]

        res_check1 = self.client.patch(
            f'/api/collaboration/tasks/{task_id}/checklists/',
            {'item_id': c1.id},
            content_type='application/json'
        )
        self.assertEqual(res_check1.status_code, 200)
        self.assertEqual(res_check1.json()['progress_percent'], 33)

        res_check2 = self.client.patch(
            f'/api/collaboration/tasks/{task_id}/checklists/',
            {'item_id': c2.id},
            content_type='application/json'
        )
        self.assertEqual(res_check2.status_code, 200)
        self.assertEqual(res_check2.json()['progress_percent'], 66)

        # 5. Bình luận trao đổi
        res_task_comment = self.client.post(f'/api/collaboration/tasks/{task_id}/comments/', {
            'content': 'Đã hoàn thành 2/3 bước kiểm tra, đang chờ bản gốc phiếu EIR.'
        })
        self.assertEqual(res_task_comment.status_code, 201)

        # 6. Hoàn tất toàn bộ -> chuyển sang DONE
        res_done = self.client.post(f'/api/collaboration/tasks/{task_id}/status/', {
            'status': TaskStatus.DONE
        })
        self.assertEqual(res_done.status_code, 200)
        self.assertEqual(res_done.json()['progress_percent'], 100)

    # ----------------------------------------------------
    # 3. KIỂM THỬ CHAT NỘI BỘ VĂN PHÒNG (TEAM CHAT)
    # ----------------------------------------------------
    def test_in_app_chat_lifecycle(self):
        """Kiểm thử phòng chat, gửi tin nhắn, polling cache và chat 1-1."""
        self.client.force_login(self.dispatcher_user)

        # 1. Lấy danh sách phòng chat (hệ thống tự tạo các kênh mặc định)
        res_rooms = self.client.get('/api/collaboration/chat/rooms/')
        self.assertEqual(res_rooms.status_code, 200)
        rooms = res_rooms.json()['data']
        self.assertTrue(len(rooms) > 0)
        all_hands_room = rooms[0]

        # 2. Gửi tin nhắn vào kênh chung
        res_send = self.client.post(f'/api/collaboration/chat/rooms/{all_hands_room["id"]}/messages/', {
            'content': 'Chào cả nhà, sáng nay cảng Cát Lái kẹt cầu B, các chuyến dời giờ qua 10h nhé!'
        })
        self.assertEqual(res_send.status_code, 201)
        msg_id = res_send.json()['data']['id']

        # 3. Kế toán viên polling tin nhắn mới qua after_id
        self.client.force_login(self.accountant_user)
        res_poll = self.client.get(f'/api/collaboration/chat/rooms/{all_hands_room["id"]}/messages/?after_id=0')
        self.assertEqual(res_poll.status_code, 200)
        self.assertEqual(len(res_poll.json()['messages']), 1)
        self.assertEqual(res_poll.json()['latest_id'], msg_id)

        # 4. Kế toán khởi tạo chat 1-1 với Điều độ viên
        res_direct = self.client.post('/api/collaboration/chat/rooms/', {
            'target_user_id': self.dispatcher_user.id
        })
        self.assertEqual(res_direct.status_code, 201)
        direct_room_id = res_direct.json()['data']['id']

        # 5. Gửi tin nhắn riêng
        res_direct_msg = self.client.post(f'/api/collaboration/chat/rooms/{direct_room_id}/messages/', {
            'content': 'Anh chuyển em mã số phiếu chi tạm ứng chuyến Cát Lái nhé.'
        })
        self.assertEqual(res_direct_msg.status_code, 201)

    # ----------------------------------------------------
    # 4. KIỂM THỬ BẢO MẬT & CÁCH LY TÀI XẾ
    # ----------------------------------------------------
    def test_driver_isolation_and_unauthenticated(self):
        """Đảm bảo tài xế và khách vãng lai không thể thâm nhập dữ liệu văn phòng nội bộ."""
        # Khách vãng lai chưa đăng nhập
        self.client.logout()
        res_unauth_news = self.client.get('/api/collaboration/news/posts/')
        self.assertEqual(res_unauth_news.status_code, 401)

        res_unauth_tasks = self.client.get('/api/collaboration/tasks/')
        self.assertEqual(res_unauth_tasks.status_code, 401)

        res_unauth_chat = self.client.get('/api/collaboration/chat/rooms/')
        self.assertEqual(res_unauth_chat.status_code, 401)

        # Danh bạ giao việc chỉ hiển thị nhân viên có tài khoản văn phòng (user__isnull=False)
        self.client.force_login(self.dispatcher_user)
        res_dir = self.client.get('/api/collaboration/tasks/directory/')
        self.assertEqual(res_dir.status_code, 200)
        office_user_ids = [u['user_id'] for u in res_dir.json()['office_users']]
        self.assertIn(self.dispatcher_user.id, office_user_ids)
        self.assertIn(self.accountant_user.id, office_user_ids)

    # ----------------------------------------------------
    # 5. KIỂM THỬ PHÂN QUYỀN ĐĂNG BẢN TIN & GIAO VIỆC CẤP TRÊN - CẤP DƯỚI
    # ----------------------------------------------------
    def test_create_news_and_task_delegation_permissions(self):
        """Kiểm tra chi tiết tính năng phân quyền: chỉ HR / Trưởng phòng / BGD được đăng tin; cấp trên mới được giao việc cấp dưới."""
        # 1. Chuyên viên thường đăng bản tin -> Bị từ chối 403 Forbidden
        self.client.force_login(self.staff_dispatcher_user)
        res_staff_news = self.client.post('/api/collaboration/news/posts/', {
            'title': 'Đề xuất đổi lịch trực bãi xe',
            'summary': 'Đề xuất đổi ca',
            'content': 'Tôi muốn xin đổi ca làm việc',
            'target_department': 'DISPATCH'
        })
        self.assertEqual(res_staff_news.status_code, 403)
        self.assertIn('Chỉ Ban Giám Đốc, Hành chính Nhân sự hoặc Trưởng các phòng ban', res_staff_news.json()['message'])

        # 2. Trưởng phòng Điều Vận đăng bản tin -> Thành công 201 Created
        self.client.force_login(self.dispatcher_user)
        res_leader_news = self.client.post('/api/collaboration/news/posts/', {
            'title': 'Cảnh báo triều cường ngập đường Huỳnh Tấn Phát',
            'summary': 'Xe ra vào Cảng Tân Thuận cần chú ý khung giờ ngập lúc 17h00.',
            'content': 'Đề nghị các bác tài chủ động đổi lộ trình sang cầu Phú Mỹ.',
            'target_department': 'DISPATCH',
            'is_urgent': True
        })
        self.assertEqual(res_leader_news.status_code, 201)
        created_post_id = res_leader_news.json()['data']['id']
        self.assertTrue(res_leader_news.json()['data']['is_urgent'])

        # 3. Hành chính Nhân sự đăng bản tin chính sách -> Thành công 201 Created
        self.client.force_login(self.hr_user)
        res_hr_news = self.client.post('/api/collaboration/news/posts/', {
            'title': 'Thông báo khám sức khỏe định kỳ cho toàn thể CBNV',
            'summary': 'Lịch khám sức khỏe tại Bệnh viện Quận 7',
            'content': 'Toàn thể nhân sự văn phòng và tài xế tham gia đúng lịch.',
            'target_department': 'ALL'
        })
        self.assertEqual(res_hr_news.status_code, 201)

        # 4. Kiểm tra phân quyền giao việc: Cấp dưới cố giao việc cho cấp trên -> Bị từ chối 403 Forbidden
        self.client.force_login(self.staff_dispatcher_user)
        # 4a. Chuyên viên cố giao việc cho Trưởng phòng của mình
        res_sub_to_sup = self.client.post('/api/collaboration/tasks/', {
            'title': 'Yêu cầu ký duyệt tờ khai',
            'department': Department.DISPATCH,
            'assignee_id': self.dispatcher_user.id
        }, content_type='application/json')
        self.assertEqual(res_sub_to_sup.status_code, 403)
        self.assertIn('không được giao việc cho cấp trên', res_sub_to_sup.json()['message'])

        # 4b. Chuyên viên thường tự tạo việc cho chính mình (Self-task) -> Thành công 201
        res_self_task = self.client.post('/api/collaboration/tasks/', {
            'title': 'Ghi chép sổ theo dõi cont lạnh tồn bãi',
            'department': Department.DISPATCH,
            'priority': TaskPriority.LOW,
            'assignee_id': self.staff_dispatcher_user.id
        }, content_type='application/json')
        self.assertEqual(res_self_task.status_code, 201)

        # 5. Trưởng phòng cố giao việc ngược lên Ban Giám Đốc -> Bị từ chối 403 Forbidden
        self.client.force_login(self.dispatcher_user)
        res_sup_to_bgd = self.client.post('/api/collaboration/tasks/', {
            'title': 'Phê duyệt hạn mức dầu Quý 4',
            'department': Department.MANAGEMENT,
            'assignee_id': self.director_user.id
        }, content_type='application/json')
        self.assertEqual(res_sup_to_bgd.status_code, 403)
        self.assertIn('Bạn không thể giao việc cho Ban Giám Đốc', res_sup_to_bgd.json()['message'])

        # 6. Trưởng phòng giao việc cho Chuyên viên cấp dưới trong phòng -> Thành công 201
        res_assign_sub = self.client.post('/api/collaboration/tasks/', {
            'title': 'Kiểm tra lệnh giao hàng điện tử eDO hãng tàu Maersk',
            'department': Department.DISPATCH,
            'priority': TaskPriority.HIGH,
            'assignee_id': self.staff_dispatcher_user.id,
            'due_date': '2026-10-31',
            'description': 'Lấy mã eDO và gửi lệnh cho tài xế Bụi 94.',
            'checklists': ['Tải file eDO PDF', 'Đối chiếu số container', 'Gửi Zalo cho tài xế']
        }, content_type='application/json')
        self.assertEqual(res_assign_sub.status_code, 201)
        task_data = res_assign_sub.json()['data']
        self.assertEqual(task_data['reporter_info']['id'], self.dispatcher_user.id)
        self.assertEqual(task_data['assignee_info']['id'], self.staff_dispatcher_user.id)

        # 7. Trưởng phòng Điều Vận gửi yêu cầu phối hợp ngang hàng cho Kế toán trưởng -> Thành công 201
        res_cross_dept = self.client.post('/api/collaboration/tasks/', {
            'title': 'Chi hộ phí nâng hạ cont bãi rỗng Phú Hữu',
            'department': Department.ACCOUNTING,
            'priority': TaskPriority.HIGH,
            'assignee_id': self.accountant_user.id,
            'due_date': '2026-10-28',
            'description': 'Lái xe Bụi 94 cần chi hộ 650.000đ tiền nâng cont rỗng.'
        }, content_type='application/json')
        self.assertEqual(res_cross_dept.status_code, 201)

        # 8. Ban Giám Đốc giao việc toàn quyền cho bất kỳ ai -> Thành công 201
        self.client.force_login(self.director_user)
        res_bgd_assign = self.client.post('/api/collaboration/tasks/', {
            'title': 'Chỉ thị chuẩn bị hồ sơ thầu logistics Vinamilk',
            'department': Department.DISPATCH,
            'priority': TaskPriority.URGENT,
            'assignee_id': self.dispatcher_user.id
        }, content_type='application/json')
        self.assertEqual(res_bgd_assign.status_code, 201)

    # ----------------------------------------------------
    # 6. KIỂM THỬ CHUÔNG THÔNG BÁO TỰ ĐỘNG (BELL NOTIFICATIONS)
    # ----------------------------------------------------
    def test_bell_notifications_lifecycle(self):
        """Kiểm thử tính năng chuông thông báo cá nhân: tự động phát sinh khi được giao việc, đổi tiến độ, và đăng bản tin mới."""
        # 1. Ban Giám Đốc giao việc cho Chuyên viên điều độ
        self.client.force_login(self.director_user)
        res_task = self.client.post('/api/collaboration/tasks/', {
            'title': 'Kiểm tra container lạnh quá hạn bãi Cát Lái',
            'department': Department.DISPATCH,
            'priority': TaskPriority.HIGH,
            'assignee_id': self.staff_dispatcher_user.id,
            'due_date': '2026-11-05'
        }, content_type='application/json')
        self.assertEqual(res_task.status_code, 201)
        task_id = res_task.json()['data']['id']

        # 2. Kiểm tra chuông của Chuyên viên điều độ nhận được thông báo TASK_ASSIGNED
        self.client.force_login(self.staff_dispatcher_user)
        res_notif = self.client.get('/api/collaboration/notifications/')
        self.assertEqual(res_notif.status_code, 200)
        self.assertEqual(res_notif.json()['total_unread'], 1)
        notif_item = res_notif.json()['data'][0]
        self.assertEqual(notif_item['notification_type'], NotificationType.TASK_ASSIGNED)
        self.assertIn('Bạn được giao công việc mới', notif_item['title'])
        notif_id = notif_item['id']

        # 3. Đánh dấu đã đọc 1 thông báo
        res_mark = self.client.post(f'/api/collaboration/notifications/{notif_id}/mark-read/')
        self.assertEqual(res_mark.status_code, 200)
        self.assertEqual(res_mark.json()['total_unread'], 0)

        # 4. Chuyên viên điều độ đổi trạng thái sang DONE -> Chuông của Ban Giám Đốc nhận được TASK_STATUS_CHANGED
        res_status = self.client.post(f'/api/collaboration/tasks/{task_id}/status/', {
            'status': TaskStatus.DONE
        })
        self.assertEqual(res_status.status_code, 200)

        self.client.force_login(self.director_user)
        res_bgd_notif = self.client.get('/api/collaboration/notifications/')
        self.assertEqual(res_bgd_notif.status_code, 200)
        self.assertTrue(res_bgd_notif.json()['total_unread'] >= 1)
        bgd_item = res_bgd_notif.json()['data'][0]
        self.assertEqual(bgd_item['notification_type'], NotificationType.TASK_STATUS_CHANGED)
        self.assertIn('Cập nhật tiến độ', bgd_item['title'])

        # 5. Ban Giám Đốc đăng Bản tin khẩn cấp -> Chuông của các nhân sự nhận thông báo NEWS_URGENT
        res_post = self.client.post('/api/collaboration/news/posts/', {
            'title': 'Cảnh báo bão đổ bộ khu vực Cái Mép - Thị Vải',
            'summary': 'Tạm dừng hạ bãi cont rỗng từ 18h00',
            'content': 'Toàn thể đội xe và bãi chủ động phương án chằng buộc container.',
            'target_department': 'ALL',
            'is_urgent': True
        })
        self.assertEqual(res_post.status_code, 201)

        # Kiểm tra chuông của Kế toán viên có thông báo Bản tin mới
        self.client.force_login(self.accountant_user)
        res_kt_notif = self.client.get('/api/collaboration/notifications/')
        self.assertEqual(res_kt_notif.status_code, 200)
        news_notif = [n for n in res_kt_notif.json()['data'] if n['notification_type'] == NotificationType.NEWS_URGENT]
        self.assertTrue(len(news_notif) >= 1)

        # 6. Kiểm tra tính năng Đánh dấu đã đọc tất cả
        res_mark_all = self.client.post('/api/collaboration/notifications/mark-all-read/')
        self.assertEqual(res_mark_all.status_code, 200)
        self.assertEqual(res_mark_all.json()['total_unread'], 0)


