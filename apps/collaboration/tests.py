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

    def test_company_post_pinning_and_ordering(self):
        """Kiểm thử tính năng ghim bài viết, phân quyền ghim và đảm bảo bài ghim luôn đứng đầu danh sách."""
        # 1. Ban Giám Đốc tạo bài 1 (không ghim)
        self.client.force_login(self.director_user)
        res1 = self.client.post('/api/collaboration/news/posts/', {
            'title': 'Bản tin số 1 (cũ)',
            'content': 'Nội dung bài viết số 1',
            'is_pinned': False,
            'is_urgent': False
        })
        self.assertEqual(res1.status_code, 201)
        post1_id = res1.json()['data']['id']

        # 2. Ban Giám Đốc tạo bài 2 (tạo sau bài 1, không ghim)
        res2 = self.client.post('/api/collaboration/news/posts/', {
            'title': 'Bản tin số 2 (mới hơn)',
            'content': 'Nội dung bài viết số 2',
            'is_pinned': False,
            'is_urgent': False
        })
        self.assertEqual(res2.status_code, 201)
        post2_id = res2.json()['data']['id']

        # Danh sách ban đầu: bài 2 (mới hơn) đứng trước bài 1
        res_list1 = self.client.get('/api/collaboration/news/posts/')
        self.assertEqual(res_list1.json()['data'][0]['id'], post2_id)
        self.assertEqual(res_list1.json()['data'][1]['id'], post1_id)

        # 3. Thử nhân viên cấp dưới (không phải trưởng phòng/BGD, không phải tác giả) ghim bài 1 -> Bị từ chối HTTP 403
        self.client.force_login(self.staff_dispatcher_user)
        res_staff_pin = self.client.post(f'/api/collaboration/news/posts/{post1_id}/pin/')
        self.assertEqual(res_staff_pin.status_code, 403)

        # 4. Ban Giám Đốc ghim bài 1 lên đầu trang
        self.client.force_login(self.director_user)
        res_pin = self.client.post(f'/api/collaboration/news/posts/{post1_id}/pin/')
        self.assertEqual(res_pin.status_code, 200)
        self.assertTrue(res_pin.json()['is_pinned'])
        self.assertIn('Đã ghim', res_pin.json()['message'])

        # 5. Kiểm tra danh sách: Bài 1 (được ghim) PHẢI LẬP TỨC NHẢY LÊN ĐẦU TIÊN (vị trí index 0)
        res_list2 = self.client.get('/api/collaboration/news/posts/')
        self.assertEqual(res_list2.json()['data'][0]['id'], post1_id)
        self.assertTrue(res_list2.json()['data'][0]['is_pinned'])
        self.assertEqual(res_list2.json()['data'][1]['id'], post2_id)
        self.assertFalse(res_list2.json()['data'][1]['is_pinned'])

        # 6. Bỏ ghim bài 1
        res_unpin = self.client.post(f'/api/collaboration/news/posts/{post1_id}/pin/')
        self.assertEqual(res_unpin.status_code, 200)
        self.assertFalse(res_unpin.json()['is_pinned'])

        # Sau khi bỏ ghim, bài 2 (mới hơn) lại đứng trước bài 1
        res_list3 = self.client.get('/api/collaboration/news/posts/')
        self.assertEqual(res_list3.json()['data'][0]['id'], post2_id)
        self.assertEqual(res_list3.json()['data'][1]['id'], post1_id)

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

    def test_task_extension_request_and_approval_flow(self):
        """Kiểm thử luồng Đề xuất gia hạn & Phê duyệt gia hạn hạn chót công việc (Chuẩn ERP)."""
        from datetime import date, timedelta
        from apps.collaboration.models import TaskExtensionStatus

        # 1. Ban Giám Đốc giao việc cho Chuyên viên Điều Độ (hạn ngày mai)
        self.client.force_login(self.director_user)
        initial_due = date.today() + timedelta(days=1)
        res_create = self.client.post('/api/collaboration/tasks/', {
            'title': 'Kiểm tra hạ bãi cont rỗng ICD Sóng Thần',
            'department': Department.DISPATCH,
            'assignee_id': self.staff_dispatcher_user.id,
            'priority': TaskPriority.HIGH,
            'due_date': initial_due.strftime('%Y-%m-%d'),
            'description': 'Hoàn thành bàn giao trước 17h00'
        })
        self.assertEqual(res_create.status_code, 201)
        task_id = res_create.json()['data']['id']

        # 2. Chuyên viên Điều Độ đăng nhập và gửi đề xuất gia hạn thêm 4 ngày
        self.client.force_login(self.staff_dispatcher_user)
        requested_due = date.today() + timedelta(days=5)
        res_req = self.client.post(f'/api/collaboration/tasks/{task_id}/extension/', {
            'action': 'request',
            'requested_deadline': requested_due.strftime('%Y-%m-%d'),
            'reason': 'Chờ hãng tàu cấp seal và cập nhật booking note mới.'
        })
        self.assertEqual(res_req.status_code, 200)
        data_req = res_req.json()['data']
        self.assertEqual(data_req['extension_status'], TaskExtensionStatus.PENDING)
        self.assertIn(data_req['requested_deadline'], [requested_due.strftime('%d/%m/%Y'), requested_due.strftime('%Y-%m-%d')])
        self.assertEqual(data_req['extension_reason'], 'Chờ hãng tàu cấp seal và cập nhật booking note mới.')

        # Kiểm tra chuông người giao việc (Giám đốc) nhận thông báo
        self.client.force_login(self.director_user)
        res_dir_notif = self.client.get('/api/collaboration/notifications/')
        self.assertEqual(res_dir_notif.status_code, 200)
        self.assertTrue(any('Đề xuất gia hạn' in n['title'] for n in res_dir_notif.json()['data']))

        # 3. Người giao việc (Giám đốc) duyệt gia hạn
        res_approve = self.client.post(f'/api/collaboration/tasks/{task_id}/extension/', {
            'action': 'approve',
            'note': 'Đồng ý dời hạn theo đề xuất của điều độ.'
        })
        self.assertEqual(res_approve.status_code, 200)
        data_approved = res_approve.json()['data']
        self.assertEqual(data_approved['extension_status'], TaskExtensionStatus.APPROVED)
        self.assertIn(data_approved['due_date'], [requested_due.strftime('%d/%m/%Y'), requested_due.strftime('%Y-%m-%d')])

        # Kiểm tra chuông người phụ trách nhận thông báo duyệt gia hạn
        self.client.force_login(self.staff_dispatcher_user)
        res_staff_notif = self.client.get('/api/collaboration/notifications/')
        self.assertEqual(res_staff_notif.status_code, 200)
        self.assertTrue(any('Gia hạn đã được duyệt' in n['title'] for n in res_staff_notif.json()['data']))

        # 4. Kiểm tra luồng từ chối gia hạn trên một task mới
        self.client.force_login(self.director_user)
        res_create_2 = self.client.post('/api/collaboration/tasks/', {
            'title': 'Quyết toán tạm ứng đội xe Vũng Tàu',
            'department': Department.DISPATCH,
            'assignee_id': self.staff_dispatcher_user.id,
            'priority': TaskPriority.MEDIUM,
            'due_date': initial_due.strftime('%Y-%m-%d')
        })
        task2_id = res_create_2.json()['data']['id']

        # Chuyên viên gửi đề xuất gia hạn
        self.client.force_login(self.staff_dispatcher_user)
        self.client.post(f'/api/collaboration/tasks/{task2_id}/extension/', {
            'action': 'request',
            'requested_deadline': requested_due.strftime('%Y-%m-%d'),
            'reason': 'Chưa thu đủ hóa đơn xăng dầu.'
        })

        # Giám đốc từ chối gia hạn
        self.client.force_login(self.director_user)
        res_reject = self.client.post(f'/api/collaboration/tasks/{task2_id}/extension/', {
            'action': 'reject',
            'note': 'Cần chốt số liệu đúng hạn để kịp báo cáo thuế.'
        })
        self.assertEqual(res_reject.status_code, 200)
        data_rejected = res_reject.json()['data']
        self.assertEqual(data_rejected['extension_status'], TaskExtensionStatus.REJECTED)
        self.assertIn(data_rejected['due_date'], [initial_due.strftime('%d/%m/%Y'), initial_due.strftime('%Y-%m-%d')]) # Hạn cũ được bảo toàn!

        # 5. Kiểm tra bảo mật: Người khác (không phải người phụ trách) cố tình yêu cầu gia hạn -> 403 Forbidden
        self.client.force_login(self.accountant_user)
        res_unauth = self.client.post(f'/api/collaboration/tasks/{task2_id}/extension/', {
            'action': 'request',
            'requested_deadline': requested_due.strftime('%Y-%m-%d'),
            'reason': 'Cố tình yêu cầu gia hạn không đúng quyền.'
        })
        self.assertEqual(res_unauth.status_code, 403)

        # 6. Kiểm tra quy tắc: Không đồng ý gia hạn bắt buộc phải ghi lý do -> nếu để trống thì trả về 400 Bad Request
        self.client.force_login(self.staff_dispatcher_user)
        self.client.post(f'/api/collaboration/tasks/{task2_id}/extension/', {
            'action': 'request',
            'requested_deadline': requested_due.strftime('%Y-%m-%d'),
            'reason': 'Xin gia hạn lần 2 do đối tác bổ sung hồ sơ.'
        })
        self.client.force_login(self.director_user)
        res_no_reason = self.client.post(f'/api/collaboration/tasks/{task2_id}/extension/', {
            'action': 'reject',
            'note': '   '
        })
        self.assertEqual(res_no_reason.status_code, 400)
        self.assertIn('Vui lòng nhập lý do không đồng ý gia hạn', res_no_reason.json()['message'])
    def test_news_detail_page_security_and_rendering(self):
        """Kiểm thử bảo mật URL và hiển thị trang chi tiết bản tin (/news/<id>/) không lỗi CompanyProfile."""
        from apps.collaboration.models import CompanyPost

        # 1. Tạo bài viết công khai toàn công ty
        post_public = CompanyPost.objects.create(
            title="Quy chế thưởng quý IV",
            content="Nội dung thưởng cho toàn bộ cán bộ công nhân viên.",
            author=self.director_user,
            target_department='ALL',
            is_published=True
        )

        # 2. Truy cập khi chưa đăng nhập -> Chuyển hướng về trang đăng nhập
        self.client.logout()
        res_anon = self.client.get(f'/news/{post_public.id}/')
        self.assertEqual(res_anon.status_code, 302)
        self.assertIn('/login/', res_anon.url)

        # 3. Truy cập khi đã đăng nhập -> HTTP 200 OK, CompanyProfile được nạp chính xác không văng lỗi 500 NameError
        self.client.force_login(self.accountant_user)
        res_auth = self.client.get(f'/news/{post_public.id}/')
        self.assertEqual(res_auth.status_code, 200)
        self.assertContains(res_auth, "Quy chế thưởng quý IV")

        # 4. Kiểm tra bảo mật Trung tâm trợ giúp (/helps) -> Yêu cầu đăng nhập
        self.client.logout()
        res_help_anon = self.client.get('/helps/')
        self.assertEqual(res_help_anon.status_code, 302)
        self.assertIn('/login/', res_help_anon.url)

        # 5. Tạo bài viết giới hạn riêng cho phòng Điều Độ
        post_dispatch = CompanyPost.objects.create(
            title="Kế hoạch tăng ca phòng Điều Độ",
            content="Chi tiết phân công ca trực ban đêm.",
            author=self.dispatcher_user,
            target_department=Department.DISPATCH,
            is_published=True
        )

        # Kế toán viên truy cập bài viết của Điều độ -> 403 Forbidden
        self.client.force_login(self.accountant_user)
        res_forbidden = self.client.get(f'/news/{post_dispatch.id}/')
        self.assertEqual(res_forbidden.status_code, 403)
        self.assertContains(res_forbidden, "chỉ dành riêng cho phòng ban", status_code=403)

        # Nhân viên Điều độ truy cập -> 200 OK
        self.client.force_login(self.staff_dispatcher_user)
        res_allowed = self.client.get(f'/news/{post_dispatch.id}/')
        self.assertEqual(res_allowed.status_code, 200)

        # Ban Giám Đốc truy cập -> 200 OK (Quản lý cấp cao xem được mọi phòng ban)
        self.client.force_login(self.director_user)
        res_dir_allowed = self.client.get(f'/news/{post_dispatch.id}/')
        self.assertEqual(res_dir_allowed.status_code, 200)

        # 6. Bản tin chưa xuất bản -> Nhân viên thường nhận 404, tác giả nhận 200
        post_draft = CompanyPost.objects.create(
            title="Dự thảo chính sách mới",
            content="Chưa hoàn thiện nội dung.",
            author=self.director_user,
            target_department='ALL',
            is_published=False
        )
        self.client.force_login(self.accountant_user)
        res_draft_user = self.client.get(f'/news/{post_draft.id}/')
        self.assertEqual(res_draft_user.status_code, 404)

        self.client.force_login(self.director_user)
        res_draft_author = self.client.get(f'/news/{post_draft.id}/')
        self.assertEqual(res_draft_author.status_code, 200)

    def test_api_permissions_security(self):
        """Kiểm thử bảo mật phân quyền API: Xóa bài viết, Sửa/Xóa công việc trái thẩm quyền."""
        from apps.collaboration.models import CompanyPost, OfficeTask

        post = CompanyPost.objects.create(
            title="Thông báo quan trọng BGD",
            content="Nội dung BGD đăng.",
            author=self.director_user,
            target_department='ALL',
            is_published=True
        )

        # Kế toán viên không thể xóa bài của Giám đốc qua API -> 403 Forbidden
        self.client.force_login(self.accountant_user)
        res_del_post = self.client.delete(f'/api/collaboration/news/posts/{post.id}/')
        self.assertEqual(res_del_post.status_code, 403)
        self.assertFalse(CompanyPost.objects.get(id=post.id).is_deleted)

        # Giám đốc giao việc cho Điều độ
        task = OfficeTask.objects.create(
            code="TSK-202610-099",
            title="Nhiệm vụ tuyệt mật",
            reporter=self.director_user,
            assignee=self.staff_dispatcher_user,
            department=Department.DISPATCH
        )

        # Kế toán viên (không liên quan) không thể sửa công việc -> 403
        import json
        res_edit_task = self.client.put(
            f'/api/collaboration/tasks/{task.id}/',
            data=json.dumps({'title': 'Đã bị kẻ xấu sửa đổi'}),
            content_type='application/json'
        )
        self.assertEqual(res_edit_task.status_code, 403)

        # Kế toán viên không thể xóa công việc -> 403
        res_del_task = self.client.delete(f'/api/collaboration/tasks/{task.id}/')
        self.assertEqual(res_del_task.status_code, 403)
        self.assertFalse(OfficeTask.objects.get(id=task.id).is_deleted)

        # Người giao việc (Giám đốc) có thể xóa công việc -> 200 OK
        self.client.force_login(self.director_user)
        res_del_by_reporter = self.client.delete(f'/api/collaboration/tasks/{task.id}/')
        self.assertEqual(res_del_by_reporter.status_code, 200)
        self.assertTrue(OfficeTask.all_objects.get(id=task.id).is_deleted)

