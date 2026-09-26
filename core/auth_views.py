from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

class CurrentUserAPIView(APIView):
    """API lấy thông tin định danh và phân quyền của người dùng đang đăng nhập."""
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
            'employee': {
                'code': employee.code,
                'full_name': employee.full_name,
                'nickname': employee.nickname,
                'role': employee.role,
                'role_label': employee.get_role_display(),
                'department': employee.department,
                'department_label': employee.get_department_display(),
            } if employee else None
        })
