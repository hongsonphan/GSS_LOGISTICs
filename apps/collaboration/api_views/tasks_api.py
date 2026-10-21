from datetime import date
from rest_framework import views, status, permissions
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q
from django.contrib.auth import get_user_model
from apps.collaboration.models import (
    OfficeTask, TaskPriority, TaskStatus, TaskChecklist,
    TaskComment, TaskAttachment, TaskActivityLog, Notification, NotificationType
)
from apps.collaboration.serializers import (
    OfficeTaskListSerializer, OfficeTaskDetailSerializer,
    TaskChecklistSerializer, TaskCommentSerializer, TaskAttachmentSerializer
)
from apps.personnel.models import Department, Employee

User = get_user_model()


def generate_task_code():
    """Tự động sinh mã công việc dạng TSK.YYYYMM.XXX (chuẩn dấu chấm, 3 chữ số)."""
    today = date.today()
    ym = today.strftime('%Y%m')
    prefix = f"TSK.{ym}."
    max_num = 0
    task_codes = OfficeTask.all_objects.filter(
        Q(code__startswith=prefix) | Q(code__startswith=f"TSK-{ym}-")
    ).values_list('code', flat=True)

    for c in task_codes:
        try:
            parts = c.replace('-', '.').split('.')
            if len(parts) >= 3 and parts[-1].isdigit():
                num = int(parts[-1])
                if num > max_num:
                    max_num = num
        except Exception:
            pass

    new_num = max_num + 1
    return f"{prefix}{new_num:03d}"


class OfficeTaskListCreateAPIView(views.APIView):
    """Lấy danh sách công việc (dạng List hoặc Kanban) và tạo công việc mới."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        view_mode = request.GET.get('view', 'kanban') # 'kanban' hoặc 'list'
        scope = request.GET.get('scope', 'all') # 'all', 'my_tasks', 'assigned_by_me'
        dept = request.GET.get('department')
        priority = request.GET.get('priority')
        status_param = request.GET.get('status')
        overdue = request.GET.get('overdue')
        search = request.GET.get('search')

        qs = OfficeTask.objects.select_related(
            'assignee', 'reporter', 'related_trip', 'related_customer', 'related_vehicle'
        ).prefetch_related('checklists', 'comments')

        # Lọc phạm vi
        if scope == 'my_tasks':
            qs = qs.filter(Q(assignee=request.user) | Q(followers=request.user)).distinct()
        elif scope == 'assigned_by_me':
            qs = qs.filter(reporter=request.user)

        # Lọc phòng ban
        if dept and dept != 'ALL':
            qs = qs.filter(department=dept)

        # Lọc độ ưu tiên
        if priority:
            qs = qs.filter(priority=priority)

        # Lọc trạng thái
        if status_param:
            qs = qs.filter(status=status_param)

        # Lọc quá hạn
        if overdue == '1':
            today = timezone.now().date()
            qs = qs.filter(due_date__lt=today).exclude(status__in=[TaskStatus.DONE, TaskStatus.CANCELLED])

        # Tìm kiếm theo từ khóa
        if search:
            qs = qs.filter(
                Q(code__icontains=search) |
                Q(title__icontains=search) |
                Q(description__icontains=search)
            )

        qs = qs.select_related(
            'assignee', 'reporter', 'related_trip', 'related_customer', 'related_vehicle'
        ).prefetch_related(
            'followers__employee', 'assignee__employee', 'reporter__employee', 'checklists'
        )

        if view_mode == 'kanban':
            # Gom nhóm theo 4 cột chuẩn quốc tế
            kanban_data = {
                TaskStatus.TODO: [],
                TaskStatus.IN_PROGRESS: [],
                TaskStatus.REVIEW: [],
                TaskStatus.DONE: [],
            }
            serializer = OfficeTaskListSerializer(qs.order_by('-priority', 'due_date'), many=True)
            for item in serializer.data:
                st = item['status']
                if st in kanban_data:
                    kanban_data[st].append(item)
                elif st == TaskStatus.CANCELLED:
                    # Cho vào DONE hoặc bỏ qua
                    pass

            return Response({
                'success': True,
                'view': 'kanban',
                'columns': kanban_data,
                'counts': {
                    'todo': len(kanban_data[TaskStatus.TODO]),
                    'in_progress': len(kanban_data[TaskStatus.IN_PROGRESS]),
                    'review': len(kanban_data[TaskStatus.REVIEW]),
                    'done': len(kanban_data[TaskStatus.DONE]),
                    'total': qs.count(),
                }
            })
        else:
            tasks = qs.order_by('-priority', 'due_date')[:100]
            serializer = OfficeTaskListSerializer(tasks, many=True)
            return Response({
                'success': True,
                'view': 'list',
                'data': serializer.data,
                'total': qs.count()
            })

    def post(self, request):
        data = request.data
        title = data.get('title', '').strip()
        if not title:
            return Response({'success': False, 'message': 'Tên công việc không được để trống.'}, status=status.HTTP_400_BAD_REQUEST)

        assignee_id = data.get('assignee_id') or None
        target_employee = Employee.objects.filter(user_id=assignee_id).first() if assignee_id else None
        reporter_employee = getattr(request.user, 'employee', None)

        # Kiểm tra nguyên tắc phân quyền giao việc (Cấp trên giao việc cấp dưới)
        if not request.user.is_superuser:
            if not reporter_employee:
                return Response({
                    'success': False,
                    'message': 'Chỉ nhân sự nội bộ thuộc hệ thống mới được thực hiện giao việc.'
                }, status=status.HTTP_403_FORBIDDEN)

            if target_employee:
                # 1. Cấm giao việc cho Ban Giám Đốc
                if target_employee.hierarchy_level >= 100 and reporter_employee.hierarchy_level < 100:
                    return Response({
                        'success': False,
                        'message': 'Bạn không thể giao việc cho Ban Giám Đốc. Vui lòng gửi báo cáo hoặc tờ trình đề xuất.'
                    }, status=status.HTTP_403_FORBIDDEN)

                # 2. Cấm cấp dưới giao việc cho cấp trên
                if reporter_employee.hierarchy_level < target_employee.hierarchy_level:
                    return Response({
                        'success': False,
                        'message': f'Theo quy định điều hành nội bộ, cấp dưới ({reporter_employee.full_name}) không được giao việc cho cấp trên ({target_employee.full_name}).'
                    }, status=status.HTTP_403_FORBIDDEN)

                # 3. Nhân viên chuyên viên thường (hierarchy_level < 50): chỉ được tự tạo việc cho chính mình
                if reporter_employee.hierarchy_level < 50 and reporter_employee.id != target_employee.id:
                    return Response({
                        'success': False,
                        'message': 'Nhân viên chuyên viên chỉ được tự tạo việc cá nhân để theo dõi tiến độ, không được giao việc cho người khác.'
                    }, status=status.HTTP_403_FORBIDDEN)

                # 4. Kiểm tra thẩm quyền quản lý của Trưởng phòng
                if not reporter_employee.can_assign_task_to(target_employee):
                    return Response({
                        'success': False,
                        'message': f'Bạn không có thẩm quyền giao việc cho nhân sự ngoài bộ phận quản lý ({target_employee.full_name} - {target_employee.get_department_display()}).'
                    }, status=status.HTTP_403_FORBIDDEN)

        code = generate_task_code()
        department = data.get('department') or Department.DISPATCH
        priority = data.get('priority') or TaskPriority.MEDIUM
        due_date = data.get('due_date') or None
        start_date = data.get('start_date') or timezone.now().date()
        description = data.get('description', '')

        task = OfficeTask.objects.create(
            code=code,
            title=title,
            description=description,
            department=department,
            priority=priority,
            status=TaskStatus.TODO,
            reporter=request.user,
            assignee_id=assignee_id,
            start_date=start_date,
            due_date=due_date,
            related_trip_id=data.get('related_trip_id') or None,
            related_customer_id=data.get('related_customer_id') or None,
            related_vehicle_id=data.get('related_vehicle_id') or None,
        )

        # Followers (Người liên quan / theo dõi chung)
        followers_ids = data.get('followers_ids', [])
        if isinstance(followers_ids, (int, str)) and followers_ids:
            followers_ids = [followers_ids]
        if followers_ids and isinstance(followers_ids, list):
            clean_ids = [int(fid) for fid in followers_ids if str(fid).isdigit()]
            if clean_ids:
                task.followers.set(clean_ids)

        # Checklists khởi tạo nếu có
        checklists = data.get('checklists', [])
        if isinstance(checklists, list):
            for idx, item in enumerate(checklists):
                c_title = item if isinstance(item, str) else item.get('title')
                if c_title:
                    TaskChecklist.objects.create(task=task, title=c_title, order=idx)

        # Ghi Activity Log
        TaskActivityLog.objects.create(
            task=task,
            user=request.user,
            action="Tạo công việc",
            description=f"Khởi tạo công việc [{task.code}] {task.title}"
        )

        reporter_name = reporter_employee.full_name if reporter_employee else request.user.username

        # Thông báo đẩy lên chuông người được giao việc
        if task.assignee and task.assignee != request.user:
            if hasattr(task.due_date, 'strftime'):
                due_str = f" • Hạn: {task.due_date.strftime('%d/%m/%Y')}"
            elif task.due_date:
                due_str = f" • Hạn: {task.due_date}"
            else:
                due_str = ""
            Notification.objects.create(
                recipient=task.assignee,
                sender=request.user,
                notification_type=NotificationType.TASK_ASSIGNED,
                title=f"Bạn được giao công việc mới: {task.code}",
                message=f"{reporter_name} đã giao cho bạn: '{task.title}'{due_str}",
                target_type='TASK',
                target_id=task.id,
                link_url=f"/tasks/#task-{task.id}"
            )

        # Thông báo đẩy lên chuông cho Người liên quan / theo dõi chung
        for follower in task.followers.exclude(id=request.user.id):
            Notification.objects.create(
                recipient=follower,
                sender=request.user,
                notification_type=NotificationType.TASK_ASSIGNED,
                title=f"Bạn được thêm theo dõi công việc: {task.code}",
                message=f"{reporter_name} đã thêm bạn vào danh sách theo dõi chung: '{task.title}'",
                target_type='TASK',
                target_id=task.id,
                link_url=f"/tasks/#task-{task.id}"
            )

        serializer = OfficeTaskDetailSerializer(task)
        return Response({'success': True, 'data': serializer.data, 'message': f'Đã tạo công việc {task.code} thành công.'}, status=status.HTTP_201_CREATED)


class OfficeTaskDetailAPIView(views.APIView):
    """Xem chi tiết, cập nhật và xóa công việc."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            task = OfficeTask.objects.select_related(
                'assignee', 'reporter', 'related_trip', 'related_customer', 'related_vehicle'
            ).prefetch_related(
                'checklists', 'comments__author', 'attachments', 'activities__user', 'followers'
            ).get(pk=pk, is_deleted=False)
        except OfficeTask.DoesNotExist:
            return Response({'success': False, 'message': 'Không tìm thấy công việc.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = OfficeTaskDetailSerializer(task)
        return Response({'success': True, 'data': serializer.data})

    def put(self, request, pk):
        try:
            task = OfficeTask.objects.get(pk=pk, is_deleted=False)
        except OfficeTask.DoesNotExist:
            return Response({'success': False, 'message': 'Không tìm thấy công việc.'}, status=status.HTTP_404_NOT_FOUND)

        employee = getattr(request.user, 'employee', None)
        is_own_dept_head = employee and employee.is_department_head and (employee.department == task.department)
        can_edit = (
            request.user.is_superuser or
            (task.reporter == request.user) or
            (task.assignee == request.user) or
            is_own_dept_head or
            (employee and employee.hierarchy_level >= 80)
        )
        if not can_edit:
            return Response({'success': False, 'message': 'Bạn không có quyền chỉnh sửa công việc này.'}, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        changes = []

        if 'title' in data and data['title'] != task.title:
            changes.append(f"Tiêu đề: {task.title} ➔ {data['title']}")
            task.title = data['title']

        if 'description' in data:
            task.description = data['description']

        if 'priority' in data and data['priority'] != task.priority:
            changes.append(f"Độ ưu tiên: {task.get_priority_display()} ➔ {data['priority']}")
            task.priority = data['priority']

        if 'assignee_id' in data:
            new_assignee_id = data['assignee_id'] or None
            if new_assignee_id != (task.assignee_id):
                old_name = task.assignee_name
                task.assignee_id = new_assignee_id
                changes.append(f"Người thực hiện: {old_name} ➔ {task.assignee_name}")

        if 'due_date' in data:
            task.due_date = data['due_date'] or None

        if 'department' in data:
            task.department = data['department']

        if 'progress_percent' in data:
            try:
                task.progress_percent = int(data['progress_percent'])
            except Exception:
                pass

        task.save()

        if changes:
            TaskActivityLog.objects.create(
                task=task,
                user=request.user,
                action="Cập nhật thông tin",
                description="; ".join(changes)
            )

        serializer = OfficeTaskDetailSerializer(task)
        return Response({'success': True, 'data': serializer.data, 'message': 'Cập nhật công việc thành công.'})

    def delete(self, request, pk):
        try:
            task = OfficeTask.objects.get(pk=pk, is_deleted=False)
        except OfficeTask.DoesNotExist:
            return Response({'success': False, 'message': 'Công việc không tồn tại.'}, status=status.HTTP_404_NOT_FOUND)

        employee = getattr(request.user, 'employee', None)
        is_own_dept_head = employee and employee.is_department_head and (employee.department == task.department)
        can_delete = (
            request.user.is_superuser or
            (task.reporter == request.user) or
            is_own_dept_head or
            (employee and employee.hierarchy_level >= 80)
        )
        if not can_delete:
            return Response({
                'success': False,
                'message': 'Bạn không có quyền xóa công việc này. Chỉ người giao việc hoặc Trưởng phòng mới có quyền xóa.'
            }, status=status.HTTP_403_FORBIDDEN)

        task.delete() # Soft delete
        return Response({'success': True, 'message': f'Đã xóa công việc {task.code}.'})


class OfficeTaskStatusUpdateAPIView(views.APIView):
    """Cập nhật trạng thái nhanh (Kéo thả trên bảng Kanban)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        new_status = request.data.get('status')
        if new_status not in TaskStatus.values:
            return Response({'success': False, 'message': 'Trạng thái không hợp lệ.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            task = OfficeTask.objects.get(pk=pk, is_deleted=False)
        except OfficeTask.DoesNotExist:
            return Response({'success': False, 'message': 'Không tìm thấy công việc.'}, status=status.HTTP_404_NOT_FOUND)

        old_status_disp = task.get_status_display()
        task.status = new_status
        if new_status == TaskStatus.DONE:
            task.completed_at = timezone.now()
            task.progress_percent = 100
        elif new_status == TaskStatus.IN_PROGRESS and task.progress_percent == 0:
            task.progress_percent = 25

        task.save(update_fields=['status', 'completed_at', 'progress_percent'])

        TaskActivityLog.objects.create(
            task=task,
            user=request.user,
            action="Đổi trạng thái",
            description=f"Chuyển từ [{old_status_disp}] sang [{task.get_status_display()}]"
        )

        # Thông báo cho người giao việc (reporter) nếu người thực hiện cập nhật
        if task.reporter and task.reporter != request.user:
            emp = getattr(request.user, 'employee', None)
            actor_name = emp.full_name if emp else request.user.username
            Notification.objects.create(
                recipient=task.reporter,
                sender=request.user,
                notification_type=NotificationType.TASK_STATUS_CHANGED,
                title=f"Cập nhật tiến độ: {task.code}",
                message=f"{actor_name} đã chuyển việc '{task.title}' sang [{task.get_status_display()}] (Tiến độ: {task.progress_percent}%)",
                target_type='TASK',
                target_id=task.id,
                link_url=f"/tasks/#task-{task.id}"
            )

        return Response({
            'success': True,
            'task_id': task.id,
            'status': task.status,
            'progress_percent': task.progress_percent,
            'message': f'Đã chuyển trạng thái sang {task.get_status_display()}'
        })


class OfficeTaskChecklistAPIView(views.APIView):
    """Thêm và hoàn tất mục kiểm tra checklist subtask."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        title = request.data.get('title', '').strip()
        if not title:
            return Response({'success': False, 'message': 'Nội dung checklist không được để trống.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            task = OfficeTask.objects.get(pk=pk, is_deleted=False)
        except OfficeTask.DoesNotExist:
            return Response({'success': False, 'message': 'Không tìm thấy công việc.'}, status=status.HTTP_404_NOT_FOUND)

        order = task.checklists.filter(is_deleted=False).count()
        item = TaskChecklist.objects.create(
            task=task,
            title=title,
            order=order
        )
        task.recalculate_progress()

        serializer = TaskChecklistSerializer(item)
        return Response({'success': True, 'data': serializer.data, 'progress_percent': task.progress_percent}, status=status.HTTP_201_CREATED)

    def patch(self, request, pk):
        """Toggle trạng thái hoàn tất của checklist item."""
        item_id = request.data.get('item_id')
        try:
            item = TaskChecklist.objects.get(id=item_id, task_id=pk, is_deleted=False)
        except TaskChecklist.DoesNotExist:
            return Response({'success': False, 'message': 'Không tìm thấy mục kiểm tra.'}, status=status.HTTP_404_NOT_FOUND)

        item.is_completed = not item.is_completed
        item.completed_at = timezone.now() if item.is_completed else None
        item.completed_by = request.user if item.is_completed else None
        item.save()

        item.task.recalculate_progress()

        return Response({
            'success': True,
            'is_completed': item.is_completed,
            'progress_percent': item.task.progress_percent,
            'status': item.task.status
        })

    def delete(self, request, pk):
        item_id = request.data.get('item_id') or request.GET.get('item_id')
        try:
            item = TaskChecklist.objects.get(id=item_id, task_id=pk)
            item.delete()
            task = OfficeTask.objects.get(pk=pk)
            task.recalculate_progress()
            return Response({'success': True, 'progress_percent': task.progress_percent})
        except TaskChecklist.DoesNotExist:
            return Response({'success': False, 'message': 'Không tìm thấy mục kiểm tra.'}, status=status.HTTP_404_NOT_FOUND)


class OfficeTaskCommentAPIView(views.APIView):
    """Thêm thảo luận vào công việc."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        content = request.data.get('content', '').strip()
        if not content:
            return Response({'success': False, 'message': 'Nội dung bình luận không được rỗng.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            task = OfficeTask.objects.get(pk=pk, is_deleted=False)
        except OfficeTask.DoesNotExist:
            return Response({'success': False, 'message': 'Không tìm thấy công việc.'}, status=status.HTTP_404_NOT_FOUND)

        comment = TaskComment.objects.create(
            task=task,
            author=request.user,
            content=content
        )

        TaskActivityLog.objects.create(
            task=task,
            user=request.user,
            action="Bình luận",
            description=f"Đã gửi ý kiến: {content[:40]}..."
        )

        serializer = TaskCommentSerializer(comment)
        return Response({'success': True, 'data': serializer.data}, status=status.HTTP_201_CREATED)


class OfficeTaskAttachmentAPIView(views.APIView):
    """Đính kèm tệp lên công việc."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            task = OfficeTask.objects.get(pk=pk, is_deleted=False)
        except OfficeTask.DoesNotExist:
            return Response({'success': False, 'message': 'Không tìm thấy công việc.'}, status=status.HTTP_404_NOT_FOUND)

        files = request.FILES.getlist('files')
        created_attachments = []
        for f in files:
            att = TaskAttachment.objects.create(
                task=task,
                file=f,
                original_name=f.name,
                file_size=f.size,
                uploaded_by=request.user
            )
            created_attachments.append(att)

        TaskActivityLog.objects.create(
            task=task,
            user=request.user,
            action="Đính kèm tệp",
            description=f"Đã tải lên {len(created_attachments)} tệp tài liệu"
        )

        serializer = TaskAttachmentSerializer(created_attachments, many=True)
        return Response({'success': True, 'data': serializer.data}, status=status.HTTP_201_CREATED)


class OfficeTaskDirectoryAPIView(views.APIView):
    """Lấy danh bạ nhân sự văn phòng và danh sách phòng ban để chọn khi giao việc."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        departments = [{'code': choice[0], 'name': choice[1]} for choice in Department.choices]
        
        # Chỉ lấy nhân viên có tài khoản đăng nhập (văn phòng / quản lý)
        employees = Employee.objects.filter(
            is_deleted=False,
            user__isnull=False
        ).select_related('user').order_by('department', 'full_name')

        current_emp = getattr(request.user, 'employee', None)
        is_super = request.user.is_superuser or (current_emp and current_emp.hierarchy_level >= 100)

        users_data = []
        assignable_users = []

        for emp in employees:
            can_assign = False
            if is_super:
                can_assign = True
            elif current_emp:
                can_assign = current_emp.can_assign_task_to(emp)

            item = {
                'user_id': emp.user.id,
                'username': emp.user.username,
                'full_name': emp.full_name,
                'employee_code': emp.code,
                'department': emp.department,
                'department_name': emp.get_department_display(),
                'role': emp.get_role_display(),
                'hierarchy_level': emp.hierarchy_level,
                'is_department_head': emp.is_department_head,
                'can_assign': can_assign
            }
            users_data.append(item)
            if can_assign:
                assignable_users.append(item)

        return Response({
            'success': True,
            'departments': departments,
            'office_users': users_data,
            'assignable_users': assignable_users,
            'current_user_permission': {
                'hierarchy_level': 100 if is_super else (current_emp.hierarchy_level if current_emp else 0),
                'is_department_head': bool(current_emp and current_emp.is_department_head),
                'can_post_news': bool(is_super or (current_emp and current_emp.can_post_news())),
                'can_assign_others': bool(is_super or (current_emp and current_emp.hierarchy_level >= 50))
            }
        })



class OfficeTaskExtensionAPIView(views.APIView):
    """
    Quản lý luồng Đề xuất gia hạn và Phê duyệt gia hạn hạn chót công việc (Chuẩn ERP Bim Logistics).
    - action = 'request': CHỈ Người phụ trách công việc (Assignee) mới có quyền yêu cầu gia hạn kèm lý do.
    - action = 'approve': Người giao việc (Reporter) hoặc Admin duyệt dời hạn chót.
    - action = 'reject': Người giao việc (Reporter) hoặc Admin từ chối đề xuất dời hạn (bắt buộc ghi lý do).
    - action = 'cancel': Người phụ trách hủy yêu cầu khi đang chờ duyệt.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            task = OfficeTask.objects.select_related(
                'assignee', 'reporter'
            ).prefetch_related('followers').get(pk=pk, is_deleted=False)
        except OfficeTask.DoesNotExist:
            return Response({'success': False, 'message': 'Không tìm thấy công việc.'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action')
        user = request.user
        current_emp = getattr(user, 'employee', None)
        is_admin = user.is_superuser or (current_emp and current_emp.hierarchy_level >= 100)
        is_reporter = (task.reporter_id == user.id) or is_admin
        # CHỈ Người phụ trách công việc mới được quyền yêu cầu gia hạn
        is_assignee = (task.assignee_id == user.id)

        # 1. YÊU CẦU GIA HẠN (CHỈ DÀNH CHO NGƯỜI PHỤ TRÁCH)
        if action == 'request':
            if not is_assignee:
                return Response({
                    'success': False, 
                    'message': 'Chỉ Người phụ trách công việc này mới có quyền yêu cầu gia hạn.'
                }, status=status.HTTP_403_FORBIDDEN)

            requested_deadline_str = request.data.get('requested_deadline')
            reason = (request.data.get('reason') or '').strip()

            if not requested_deadline_str:
                return Response({'success': False, 'message': 'Vui lòng chọn hạn hoàn thành mới đề xuất.'}, status=status.HTTP_400_BAD_REQUEST)
            if not reason:
                return Response({'success': False, 'message': 'Vui lòng nhập lý do đề xuất gia hạn để người giao việc phê duyệt.'}, status=status.HTTP_400_BAD_REQUEST)

            try:
                from datetime import datetime
                new_date = datetime.strptime(requested_deadline_str[:10], '%Y-%m-%d').date()
            except Exception:
                return Response({'success': False, 'message': 'Định dạng ngày hạn không hợp lệ (YYYY-MM-DD).'}, status=status.HTTP_400_BAD_REQUEST)

            old_due = task.due_date.strftime('%d/%m/%Y') if task.due_date else 'Không có'
            new_due = new_date.strftime('%d/%m/%Y')

            from apps.collaboration.models import TaskExtensionStatus
            task.extension_status = TaskExtensionStatus.PENDING
            task.requested_deadline = new_date
            task.extension_reason = reason
            task.extension_requested_at = timezone.now()
            task.extension_requested_by = user
            task.extension_reviewed_at = None
            task.extension_reviewed_by = None
            task.extension_review_note = ''
            task.save(update_fields=[
                'extension_status', 'requested_deadline', 'extension_reason',
                'extension_requested_at', 'extension_requested_by',
                'extension_reviewed_at', 'extension_reviewed_by', 'extension_review_note'
            ])

            # Ghi Activity Log
            TaskActivityLog.objects.create(
                task=task,
                user=user,
                action="Đề xuất gia hạn",
                description=f"Đề xuất dời hạn từ {old_due} sang {new_due}. Lý do: {reason}"
            )

            # Gửi Notification lên chuông Người giao việc
            if task.reporter:
                emp_name = current_emp.full_name if current_emp else user.username
                Notification.objects.create(
                    recipient=task.reporter,
                    sender=user,
                    notification_type=NotificationType.TASK_EXTENSION_REQUESTED,
                    title=f"Đề xuất gia hạn: [{task.code}]",
                    message=f"{emp_name} yêu cầu gia hạn công việc '{task.title}' đến ngày {new_due}. Lý do: {reason}",
                    target_type="TASK",
                    target_id=task.id,
                    link_url=f"/tasks/#task-{task.id}"
                )

            serializer = OfficeTaskDetailSerializer(task)
            return Response({
                'success': True,
                'message': f'Đã gửi đề xuất gia hạn đến ngày {new_due} thành công. Vui lòng chờ người giao việc phê duyệt.',
                'data': serializer.data
            })

        # 2. DUYỆT GIA HẠN (ĐỒNG Ý - DÀNH CHO NGƯỜI GIAO VIỆC HOẶC ADMIN)
        elif action == 'approve':
            if not is_reporter:
                return Response({'success': False, 'message': 'Chỉ người giao việc hoặc Quản lý cấp cao mới có quyền duyệt gia hạn.'}, status=status.HTTP_403_FORBIDDEN)

            from apps.collaboration.models import TaskExtensionStatus
            if task.extension_status != TaskExtensionStatus.PENDING or not task.requested_deadline:
                return Response({'success': False, 'message': 'Công việc hiện không có đề xuất gia hạn nào đang chờ duyệt.'}, status=status.HTTP_400_BAD_REQUEST)

            note = (request.data.get('note') or '').strip()
            old_due = task.due_date.strftime('%d/%m/%Y') if task.due_date else 'Không có'
            new_due = task.requested_deadline.strftime('%d/%m/%Y')

            task.due_date = task.requested_deadline
            task.extension_status = TaskExtensionStatus.APPROVED
            task.extension_reviewed_at = timezone.now()
            task.extension_reviewed_by = user
            task.extension_review_note = note
            task.save(update_fields=[
                'due_date', 'extension_status', 'extension_reviewed_at',
                'extension_reviewed_by', 'extension_review_note'
            ])

            desc = f"Đã duyệt gia hạn hạn chót từ {old_due} sang {new_due}."
            if note:
                desc += f" Ghi chú: {note}"
            TaskActivityLog.objects.create(
                task=task,
                user=user,
                action="Duyệt gia hạn",
                description=desc
            )

            # Gửi Notification lên chuông Người phụ trách
            if task.assignee:
                reviewer_name = current_emp.full_name if current_emp else user.username
                Notification.objects.create(
                    recipient=task.assignee,
                    sender=user,
                    notification_type=NotificationType.TASK_EXTENSION_REVIEWED,
                    title=f"Gia hạn đã được duyệt: [{task.code}]",
                    message=f"{reviewer_name} đã đồng ý dời hạn công việc '{task.title}' sang ngày {new_due}." + (f" Ghi chú: {note}" if note else ""),
                    target_type="TASK",
                    target_id=task.id,
                    link_url=f"/tasks/#task-{task.id}"
                )

            serializer = OfficeTaskDetailSerializer(task)
            return Response({
                'success': True,
                'message': f'Đã phê duyệt gia hạn công việc đến ngày {new_due}.',
                'data': serializer.data
            })

        # 3. TỪ CHỐI GIA HẠN (KHÔNG ĐỒNG Ý - BẮT BUỘC GHI LÝ DO)
        elif action == 'reject':
            if not is_reporter:
                return Response({'success': False, 'message': 'Chỉ người giao việc hoặc Quản lý cấp cao mới có quyền từ chối gia hạn.'}, status=status.HTTP_403_FORBIDDEN)

            from apps.collaboration.models import TaskExtensionStatus
            if task.extension_status != TaskExtensionStatus.PENDING:
                return Response({'success': False, 'message': 'Công việc hiện không có đề xuất gia hạn nào đang chờ duyệt.'}, status=status.HTTP_400_BAD_REQUEST)

            note = (request.data.get('note') or '').strip()
            if not note:
                return Response({
                    'success': False, 
                    'message': 'Vui lòng nhập lý do không đồng ý gia hạn để phản hồi cho người phụ trách.'
                }, status=status.HTTP_400_BAD_REQUEST)

            task.extension_status = TaskExtensionStatus.REJECTED
            task.extension_reviewed_at = timezone.now()
            task.extension_reviewed_by = user
            task.extension_review_note = note
            task.save(update_fields=[
                'extension_status', 'extension_reviewed_at',
                'extension_reviewed_by', 'extension_review_note'
            ])

            desc = f"Từ chối đề xuất gia hạn hạn chót. Lý do: {note}"
            TaskActivityLog.objects.create(
                task=task,
                user=user,
                action="Từ chối gia hạn",
                description=desc
            )

            # Gửi Notification lên chuông Người phụ trách
            if task.assignee:
                reviewer_name = current_emp.full_name if current_emp else user.username
                Notification.objects.create(
                    recipient=task.assignee,
                    sender=user,
                    notification_type=NotificationType.TASK_EXTENSION_REVIEWED,
                    title=f"Từ chối gia hạn: [{task.code}]",
                    message=f"{reviewer_name} không đồng ý dời hạn công việc '{task.title}'. Lý do: {note}",
                    target_type="TASK",
                    target_id=task.id,
                    link_url=f"/tasks/#task-{task.id}"
                )

            serializer = OfficeTaskDetailSerializer(task)
            return Response({
                'success': True,
                'message': 'Đã từ chối đề xuất gia hạn. Hạn chót ban đầu vẫn được giữ nguyên.',
                'data': serializer.data
            })

        # 4. HỦY ĐỀ XUẤT GIA HẠN (DÀNH CHO NGƯỜI PHỤ TRÁCH)
        elif action == 'cancel':
            from apps.collaboration.models import TaskExtensionStatus
            if task.extension_status != TaskExtensionStatus.PENDING:
                return Response({'success': False, 'message': 'Không có đề xuất gia hạn nào đang chờ để hủy.'}, status=status.HTTP_400_BAD_REQUEST)

            task.extension_status = TaskExtensionStatus.NONE
            task.requested_deadline = None
            task.save(update_fields=['extension_status', 'requested_deadline'])

            TaskActivityLog.objects.create(
                task=task,
                user=user,
                action="Hủy đề xuất gia hạn",
                description="Người gửi đã tự thu hồi yêu cầu đề xuất gia hạn."
            )

            # Gửi Notification lên chuông Người giao việc nếu có
            if task.reporter:
                emp_name = current_emp.full_name if current_emp else user.username
                Notification.objects.create(
                    recipient=task.reporter,
                    sender=user,
                    notification_type=NotificationType.TASK_STATUS_CHANGED,
                    title=f"Hủy yêu cầu gia hạn: [{task.code}]",
                    message=f"{emp_name} đã thu hồi yêu cầu gia hạn công việc '{task.title}'.",
                    target_type="TASK",
                    target_id=task.id,
                    link_url=f"/tasks/#task-{task.id}"
                )

            serializer = OfficeTaskDetailSerializer(task)
            return Response({
                'success': True,
                'message': 'Đã thu hồi đề xuất gia hạn.',
                'data': serializer.data
            })

        return Response({'success': False, 'message': 'Hành động không hợp lệ (chấp nhận: request, approve, reject, cancel).'}, status=status.HTTP_400_BAD_REQUEST)

