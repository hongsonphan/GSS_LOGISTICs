from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.contrib.auth.models import User
from django.contrib.auth import update_session_auth_hash

class CurrentUserAPIView(APIView):
    """API lấy và cập nhật thông tin định danh & hồ sơ cá nhân của người dùng đang đăng nhập."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        employee = getattr(user, 'employee', None)
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
            'groups': list(user.groups.values_list('name', flat=True)),
            'permissions': list(user.get_all_permissions()),
            'employee': {
                'code': employee.code,
                'full_name': employee.full_name,
                'nickname': employee.nickname,
                'phone_number': employee.phone_number,
                'role': employee.role,
                'role_label': employee.get_role_display(),
                'department': employee.department,
                'department_label': employee.get_department_display(),
            } if employee else None
        })

    def patch(self, request):
        """Cập nhật thông tin cài đặt hồ sơ cá nhân của người dùng (Tên, Email, Số điện thoại, Đổi mật khẩu)."""
        user = request.user
        employee = getattr(user, 'employee', None)
        data = request.data or {}

        full_name = data.get('full_name')
        email = data.get('email')
        phone_number = data.get('phone_number')
        old_password = data.get('old_password')
        new_password = data.get('new_password')

        # 1. Cập nhật Họ và tên
        if full_name is not None:
            full_name = str(full_name).strip()
            if not full_name:
                return Response({'error': 'Họ và tên không được để trống.'}, status=status.HTTP_400_BAD_REQUEST)
            if employee:
                employee.full_name = full_name
                employee.save(update_fields=['full_name', 'updated_at'])
            user.first_name = full_name
            user.save(update_fields=['first_name'])

        # 2. Cập nhật Email
        if email is not None:
            email = str(email).strip()
            if email:
                if User.objects.filter(email__iexact=email).exclude(pk=user.pk).exists():
                    return Response({'error': 'Địa chỉ email này đã được sử dụng bởi tài khoản khác.'}, status=status.HTTP_400_BAD_REQUEST)
            user.email = email
            user.save(update_fields=['email'])

        # 3. Cập nhật Số điện thoại
        if phone_number is not None and employee:
            phone_number = str(phone_number).strip()
            employee.phone_number = phone_number
            employee.save(update_fields=['phone_number', 'updated_at'])

        # 4. Đổi mật khẩu (nếu có yêu cầu)
        if new_password:
            if not old_password:
                return Response({'error': 'Vui lòng nhập mật khẩu hiện tại để đổi mật khẩu mới.'}, status=status.HTTP_400_BAD_REQUEST)
            if not user.check_password(old_password):
                return Response({'error': 'Mật khẩu hiện tại không chính xác.'}, status=status.HTTP_400_BAD_REQUEST)
            if len(new_password) < 6:
                return Response({'error': 'Mật khẩu mới phải có tối thiểu 6 ký tự.'}, status=status.HTTP_400_BAD_REQUEST)
            user.set_password(new_password)
            user.save()
            update_session_auth_hash(request, user)

        display_name = employee.full_name if employee else (user.get_full_name() or user.username)

        return Response({
            'message': 'Đã cập nhật cài đặt hồ sơ cá nhân thành công!',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'full_name': display_name,
                'phone_number': employee.phone_number if employee else '',
                'code': employee.code if employee else '',
                'role_label': employee.get_role_display() if employee else 'Quản trị viên',
                'department_label': employee.get_department_display() if employee else '',
            }
        }, status=status.HTTP_200_OK)
