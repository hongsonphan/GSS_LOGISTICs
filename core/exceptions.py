import logging
from django.shortcuts import render
from django.http import JsonResponse
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError as DRFValidationError

logger = logging.getLogger(__name__)


def custom_404_view(request, exception=None):
    """
    Xử lý lỗi 404 bảo mật cấp toàn hệ thống (tuân thủ Tiêu chuẩn 6 / 08-security.md):
    - Tuyệt đối không làm lộ URLconf, danh sách endpoint hoặc chi tiết hệ thống.
    - Với API (/api/*): Trả về JSON chuẩn {"success": False, "error_code": "ERR_404", "message": "Tài nguyên không tồn tại."}
    - Với Web / SPA: Render template 404.html sang trọng, bảo mật của GSS TMS.
    """
    if request.path.startswith('/api/'):
        return JsonResponse({
            'success': False,
            'error_code': 'ERR_404',
            'message': 'Đường dẫn API không tồn tại hoặc đã dời đổi.',
            'error': 'Đường dẫn API không tồn tại hoặc đã dời đổi.'
        }, status=404)
    return render(request, '404.html', status=404)


def custom_500_view(request):
    """
    Xử lý lỗi 500 bảo mật:
    - Ẩn toàn bộ traceback / mã nguồn khỏi người dùng.
    - Ghi log bảo mật phía máy chủ.
    - Trả về JSON cho API hoặc render template 404.html với mã lỗi 500.
    """
    if request.path.startswith('/api/'):
        return JsonResponse({
            'success': False,
            'error_code': 'ERR_INTERNAL_SERVER_ERROR',
            'message': 'Đã xảy ra lỗi nội bộ máy chủ. Vui lòng liên hệ quản trị hệ thống.',
            'error': 'Đã xảy ra lỗi nội bộ máy chủ. Vui lòng liên hệ quản trị hệ thống.'
        }, status=500)
    return render(request, '404.html', status=500)


def custom_exception_handler(exc, context):
    """
    Custom Exception Handler cho toàn bộ REST API của GSS_Logistics.
    Tuân thủ Tiêu chuẩn 6 (08-security.md):
    - Ẩn traceback hệ thống đối với người dùng/mobile client.
    - Chuẩn hóa cấu trúc phản hồi lỗi dạng JSON:
      {
          "success": false,
          "error_code": "ERR_...",
          "message": "Thông báo lỗi thân thiện",
          "details": ...
      }
    """
    # Xử lý trường hợp ngoại lệ từ Django Core ValidationError
    if isinstance(exc, DjangoValidationError):
        if hasattr(exc, 'message_dict'):
            detail = exc.message_dict
        elif hasattr(exc, 'messages'):
            detail = exc.messages
        else:
            detail = str(exc)
        exc = DRFValidationError(detail=detail)

    # Tham số số học không hợp lệ (vd. ?customer_id=' hoặc số quá lớn): lỗi của client -> 400, không phải 500
    if isinstance(exc, (ValueError, TypeError, OverflowError)) and (
            'expected a number' in str(exc) or 'too large' in str(exc) or 'invalid literal for int' in str(exc)):
        exc = DRFValidationError(detail='Tham số không hợp lệ.')

    # Gọi handler mặc định của DRF
    response = exception_handler(exc, context)

    # Nếu DRF đã xử lý được exception
    if response is not None:
        error_code = f"ERR_{response.status_code}"
        message = "Yêu cầu không hợp lệ hoặc bị từ chối."

        if isinstance(response.data, dict):
            if 'detail' in response.data:
                message = str(response.data['detail'])
            elif 'error' in response.data:
                message = str(response.data['error'])
            elif 'message' in response.data:
                message = str(response.data['message'])
            else:
                # Nếu có nhiều trường validation
                first_key = next(iter(response.data))
                first_val = response.data[first_key]
                message = f"{first_key}: {first_val[0] if isinstance(first_val, list) else first_val}"
        elif isinstance(response.data, list) and response.data:
            message = str(response.data[0])

        custom_data = {
            'success': False,
            'error_code': error_code,
            'message': message,
            'error': message,
            'details': response.data
        }
        response.data = custom_data
        return response

    # Trường hợp Exception chưa được bắt (Unhandled 500)
    view_name = context.get('view').__class__.__name__ if context.get('view') else 'UnknownView'
    logger.error(f"[SECURITY UNHANDLED EXCEPTION] View: {view_name} - Error: {str(exc)}", exc_info=True)

    return Response({
        'success': False,
        'error_code': 'ERR_INTERNAL_SERVER_ERROR',
        'message': 'Đã xảy ra lỗi nội bộ máy chủ trong quá trình xử lý vận tải. Vui lòng liên hệ quản trị hệ thống.',
        'error': 'Đã xảy ra lỗi nội bộ máy chủ trong quá trình xử lý vận tải. Vui lòng liên hệ quản trị hệ thống.',
        'details': None
    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
