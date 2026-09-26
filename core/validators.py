import os
from django.core.exceptions import ValidationError
from PIL import Image

ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf']
MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024  # 5MB chuẩn Logistics

# Magic byte signatures
MAGIC_BYTES = {
    'jpeg': [b'\xff\xd8\xff'],
    'png': [b'\x89PNG\r\n\x1a\n', b'\x89\x50\x4e\x47'],
    'pdf': [b'%PDF'],
}

def validate_uploaded_document(file_obj, max_size=MAX_UPLOAD_SIZE_BYTES):
    """
    Xác thực tệp chứng từ tải lên (POD, EIR, hóa đơn) theo Tiêu chuẩn 7 & 8 (SECURITY_AUDIT.md):
    1. Giới hạn kích thước tối đa 5MB.
    2. Chống giả mạo đuôi tệp: Kiểm tra chữ ký Magic Bytes.
    3. Xác thực tính toàn vẹn hình ảnh bằng Pillow (đối với ảnh).
    """
    if not file_obj:
        raise ValidationError("Không tìm thấy tệp tải lên.")

    # 1. Kiểm tra kích thước
    if file_obj.size > max_size:
        max_mb = max_size / (1024 * 1024)
        raise ValidationError(f"Dung lượng tệp vượt quá giới hạn cho phép ({max_mb:.0f}MB). Vui lòng nén hoặc chụp lại ảnh.")

    # 2. Kiểm tra phần mở rộng tệp
    ext = os.path.splitext(file_obj.name)[1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise ValidationError(
            f"Định dạng tệp '{ext}' không được hỗ trợ. Chỉ chấp nhận các định dạng chứng từ an toàn: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}."
        )

    # 3. Kiểm tra Magic Bytes
    initial_pos = file_obj.tell()
    header = file_obj.read(32)
    file_obj.seek(initial_pos)

    is_valid_magic = False
    if ext in ['.jpg', '.jpeg']:
        is_valid_magic = any(header.startswith(sig) for sig in MAGIC_BYTES['jpeg'])
    elif ext == '.png':
        is_valid_magic = any(header.startswith(sig) for sig in MAGIC_BYTES['png'])
    elif ext == '.pdf':
        is_valid_magic = any(header.startswith(sig) for sig in MAGIC_BYTES['pdf'])

    if not is_valid_magic:
        raise ValidationError("Nội dung tệp không hợp lệ hoặc bị nghi ngờ là mã độc giả dạng định dạng ảnh.")

    # 4. Kiểm tra cấu trúc hình ảnh hợp lệ nếu là ảnh
    if ext in ['.jpg', '.jpeg', '.png']:
        try:
            file_obj.seek(initial_pos)
            image = Image.open(file_obj)
            image.verify()
            file_obj.seek(initial_pos)
        except Exception:
            raise ValidationError("Tệp ảnh bị lỗi cấu trúc, không thể mở hoặc đọc được.")

    return True

def sanitize_filename(filename):
    """Làm sạch tên file, chống tấn công Directory Traversal (../) và ký tự đặc biệt."""
    base = os.path.basename(filename)
    clean_name = "".join(c for c in base if c.isalnum() or c in "._- ")
    return clean_name or "document"
