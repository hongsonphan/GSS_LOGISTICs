import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError as DRFValidationError

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    """
    Custom Exception Handler cho toàn bộ REST API của Bim_Logistics.
    Tuân thủ Tiêu chuẩn 6 (SECURITY_AUDIT.md):
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
        'details': None
    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
