from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from apps.personnel.models import Employee, EmployeeRole, Department
import re

class DriverQuickCreateAPIView(APIView):
    """
    API tạo nhanh tài xế dành riêng cho Điều vận tác nghiệp hiện trường.
    Chỉ yêu cầu: Họ tên & Số điện thoại.
    Tự động sinh mã TX..., gán role DRIVER, phòng ban FLEET.
    Hồ sơ chi tiết (GPLX, CCCD, hợp đồng...) sẽ do Nhân sự bổ sung sau.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from core import access
        user = request.user
        if not (user.is_superuser or access.can(user, 'dispatch', 'create') or access.can(user, 'hr', 'create')
                or (not access.uses_matrix(user) and user.is_staff)):
            return Response({'success': False, 'message': access.denied_message('dispatch', 'create')},
                            status=status.HTTP_403_FORBIDDEN)
        full_name = request.data.get('full_name', '').strip()
        phone_number = request.data.get('phone_number', '').strip()

        if not full_name:
            return Response({
                'success': False,
                'message': 'Vui lòng nhập Họ & Tên tài xế.'
            }, status=status.HTTP_400_BAD_REQUEST)

        if not phone_number:
            return Response({
                'success': False,
                'message': 'Vui lòng nhập Số điện thoại tài xế để nhận lệnh điều xe.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Kiểm tra trùng số điện thoại với tài xế đang hoạt động
        existing_driver = Employee.objects.filter(phone_number=phone_number, is_deleted=False).first()
        if existing_driver:
            return Response({
                'success': True,
                'message': f"Số điện thoại này đã thuộc về Bác tài '{existing_driver.full_name}' ({existing_driver.code}). Đã tự động chọn tài xế này.",
                'data': {
                    'id': existing_driver.id,
                    'code': existing_driver.code,
                    'full_name': existing_driver.full_name,
                    'nickname': existing_driver.nickname or existing_driver.full_name,
                    'phone': existing_driver.phone_number,
                    'label': f"{existing_driver.nickname or existing_driver.full_name} ({existing_driver.code})"
                }
            }, status=status.HTTP_200_OK)

        # Tự động sinh mã TX... theo số tự tăng cao nhất
        existing_codes = Employee.all_objects.filter(code__startswith='TX').values_list('code', flat=True)
        max_num = 0
        for c in existing_codes:
            m = re.match(r'^TX(\d+)$', c)
            if m:
                try:
                    max_num = max(max_num, int(m.group(1)))
                except ValueError:
                    pass

        new_code = f"TX{max_num + 1:03d}"
        
        # Tên gọi tắt (nickname) lấy từ từ cuối của tên
        name_parts = full_name.split()
        short_name = name_parts[-1] if name_parts else full_name

        new_driver = Employee.objects.create(
            code=new_code,
            full_name=full_name,
            nickname=short_name,
            phone_number=phone_number,
            department=Department.FLEET,
            role=EmployeeRole.DRIVER,
            is_active=True
        )

        return Response({
            'success': True,
            'message': f"Đã thêm nhanh tài xế '{new_driver.full_name}' ({new_driver.code}). Nhân sự sẽ bổ sung hồ sơ sau.",
            'data': {
                'id': new_driver.id,
                'code': new_driver.code,
                'full_name': new_driver.full_name,
                'nickname': new_driver.nickname,
                'phone': new_driver.phone_number,
                'label': f"{new_driver.nickname or new_driver.full_name} ({new_driver.code})"
            }
        }, status=status.HTTP_201_CREATED)
