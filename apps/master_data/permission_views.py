from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.contrib.auth.models import Group, Permission, User
from django.db import transaction

class RolesPermissionsAPIView(APIView):
    """
    API Quản lý Phân Quyền & Vai Trò người dùng hệ thống BIM Logistics.
    Khai thác trực tiếp Group, Permission và User từ django.contrib.auth.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # 1. Danh sách các nhóm vai trò (Roles / Groups)
        groups = Group.objects.all().prefetch_related('permissions', 'user_set').order_by('name')
        roles_data = []
        for g in groups:
            roles_data.append({
                'id': g.id,
                'name': g.name,
                'user_count': g.user_set.filter(is_active=True).count(),
                'permission_count': g.permissions.count(),
                'permissions': list(g.permissions.values('id', 'codename', 'name'))[:10]  # mẫu 10 quyền tiêu biểu
            })

        # 2. Danh sách người dùng nội bộ (Users)
        users = User.objects.all().select_related('employee').prefetch_related('groups').order_by('-is_active', 'username')
        users_data = []
        for u in users:
            emp = getattr(u, 'employee', None)
            users_data.append({
                'id': u.id,
                'username': u.username,
                'full_name': emp.full_name if emp else (u.get_full_name() or u.username),
                'email': u.email,
                'phone': emp.phone_number if emp else '',
                'role_in_employee': emp.get_role_display() if emp else '',
                'is_active': u.is_active,
                'is_staff': u.is_staff,
                'is_superuser': u.is_superuser,
                'groups': list(u.groups.values('id', 'name')),
                'primary_group': u.groups.first().name if u.groups.exists() else 'Chưa gán nhóm',
                'primary_group_id': u.groups.first().id if u.groups.exists() else None,
                'last_login': u.last_login.strftime('%d/%m/%Y %H:%M') if u.last_login else 'Chưa đăng nhập',
                'date_joined': u.date_joined.strftime('%d/%m/%Y') if u.date_joined else ''
            })

        # 3. Thống kê tổng quan
        is_current_admin = bool(request.user.is_superuser or (request.user.is_staff and request.user.has_perm('auth.change_user')))
        summary = {
            'total_users': users.count(),
            'active_users': users.filter(is_active=True).count(),
            'total_groups': groups.count(),
            'staff_count': users.filter(is_staff=True).count(),
            'is_current_admin': is_current_admin,
        }

        return Response({
            'success': True,
            'summary': summary,
            'is_current_admin': is_current_admin,
            'roles': roles_data,
            'users': users_data,
        })

    def post(self, request):
        """
        Cập nhật Nhóm vai trò (Group) hoặc Trạng thái (is_active) của người dùng.
        Chỉ cho phép Quản trị viên tối cao (is_superuser) hoặc Ban Giám Đốc quản trị thao tác.
        """
        if not (request.user.is_superuser or (request.user.is_staff and request.user.has_perm('auth.change_user'))):
            return Response(
                {'error': 'Chỉ Quản trị viên hệ thống (Admin) mới có quyền cập nhật phân quyền!'},
                status=status.HTTP_403_FORBIDDEN
            )

        user_id = request.data.get('user_id')
        group_id = request.data.get('group_id')
        is_active = request.data.get('is_active')
        is_staff = request.data.get('is_staff')

        if not user_id:
            return Response({'error': 'Thiếu user_id!'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'Không tìm thấy người dùng!'}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            if group_id is not None:
                if str(group_id).strip() == "" or int(group_id) == 0:
                    target_user.groups.clear()
                else:
                    try:
                        grp = Group.objects.get(id=group_id)
                        target_user.groups.set([grp])
                    except Group.DoesNotExist:
                        return Response({'error': 'Nhóm vai trò không tồn tại!'}, status=status.HTTP_400_BAD_REQUEST)

            if is_active is not None:
                target_user.is_active = bool(is_active)

            if is_staff is not None:
                target_user.is_staff = bool(is_staff)

            target_user.save()

        return Response({
            'success': True,
            'message': f'Cập nhật thành công người dùng {target_user.username}',
            'user': {
                'id': target_user.id,
                'username': target_user.username,
                'is_active': target_user.is_active,
                'is_staff': target_user.is_staff,
                'primary_group': target_user.groups.first().name if target_user.groups.exists() else 'Chưa gán nhóm'
            }
        })
