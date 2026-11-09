import os
import io
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import InMemoryUploadedFile
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

def optimize_and_resize_image(file_obj, max_dimension=1920, quality=85):
    """
    Tự động nén và thu nhỏ ảnh chụp POD/EIR từ điện thoại tài xế:
    - Giữ tỷ lệ khung hình, giới hạn chiều dài/rộng tối đa max_dimension (1920px).
    - Nén JPEG chất lượng cao 85% để đọc rõ chữ ký & mã cont nhưng dung lượng < 1MB.
    """
    ext = os.path.splitext(file_obj.name)[1].lower()
    if ext not in ['.jpg', '.jpeg', '.png']:
        return file_obj

    try:
        file_obj.seek(0)
        img = Image.open(file_obj)

        # Chuyển đổi RGBA sang RGB nếu là JPEG
        if img.mode in ('RGBA', 'P') and ext in ['.jpg', '.jpeg']:
            img = img.convert('RGB')

        # Thu nhỏ nếu kích thước vượt quá max_dimension
        width, height = img.size
        if width > max_dimension or height > max_dimension:
            if width > height:
                new_width = max_dimension
                new_height = int(height * (max_dimension / width))
            else:
                new_height = max_dimension
                new_width = int(width * (max_dimension / height))
            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

        output = io.BytesIO()
        if ext == '.png':
            img.save(output, format='PNG', optimize=True)
            content_type = 'image/png'
        else:
            img.save(output, format='JPEG', quality=quality, optimize=True)
            content_type = 'image/jpeg'

        output.seek(0)
        optimized_file = InMemoryUploadedFile(
            output,
            'file',
            file_obj.name,
            content_type,
            output.getbuffer().nbytes,
            None
        )
        return optimized_file
    except Exception:
        file_obj.seek(0)
        return file_obj

def sanitize_filename(filename):
    """Làm sạch tên file, chống tấn công Directory Traversal (../) và ký tự đặc biệt."""
    base = os.path.basename(filename)
    clean_name = "".join(c for c in base if c.isalnum() or c in "._- ")
    return clean_name or "document"

def format_booking_attachment_filename(file_obj, booking_code):
    """
    Chuẩn hóa và gán mã phiếu (booking_code) vào tên tệp đính kèm:
    Định dạng yêu cầu: [Mã booking]_[Tên file gốc]
    Ví dụ: BK.2610.005_clipboard_20261019_201846.png
    """
    if not file_obj or not hasattr(file_obj, 'name'):
        return file_obj

    import re
    orig_name = sanitize_filename(file_obj.name or '')
    clean_name = re.sub(r'\s+', '_', orig_name).strip()
    if not clean_name:
        clean_name = "booking_document"

    code_str = re.sub(r'\s+', '_', str(booking_code).strip())
    prefix = f"{code_str}_"

    if not clean_name.startswith(prefix):
        new_name = f"{prefix}{clean_name}"
    else:
        new_name = clean_name

    file_obj.name = new_name
    return file_obj


from django.contrib.auth.password_validation import MinimumLengthValidator as _MinLen  # noqa: E402
from django.core.exceptions import ValidationError as _VE  # noqa: E402


class MinimumLengthValidator(_MinLen):
    """Độ dài tối thiểu của mật khẩu, thông báo tiếng Việt (bản dịch Django thiếu dạng số nhiều)."""

    def validate(self, password, user=None):
        if len(password or '') < self.min_length:
            raise _VE(f'Mật khẩu quá ngắn: cần ít nhất {self.min_length} ký tự.', code='password_too_short',
                      params={'min_length': self.min_length})

    def get_help_text(self):
        return f'Mật khẩu cần ít nhất {self.min_length} ký tự.'


ATTACHMENT_ALLOWED_EXTENSIONS = {
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.txt', '.csv', '.zip', '.rar', '.7z',
}
ATTACHMENT_MAX_SIZE_BYTES = 10 * 1024 * 1024


def validate_attachment_files(files, max_size=ATTACHMENT_MAX_SIZE_BYTES):
    """Tệp đính kèm công việc / bản tin / chat: chỉ nhận định dạng văn phòng + ảnh, tối đa 10MB mỗi tệp.
    Chặn HTML/SVG/script (XSS lưu trữ khi mở lại từ /media/) và tệp quá lớn. Trả về thông báo lỗi hoặc None."""
    for f in files:
        ext = os.path.splitext(f.name or '')[1].lower()
        if ext not in ATTACHMENT_ALLOWED_EXTENSIONS:
            return f"Định dạng tệp '{ext or '(không có)'}' không được hỗ trợ."
        if f.size > max_size:
            return f"Tệp '{f.name}' vượt quá giới hạn {max_size // (1024 * 1024)}MB."
    return None


def excel_safe(value):
    """Chống Excel/CSV formula injection: chuỗi bắt đầu bằng = + - @ (hoặc tab/CR) được thêm dấu ' để Excel coi là văn bản."""
    if isinstance(value, str) and value[:1] in ('=', '+', '-', '@', '\t', '\r'):
        return "'" + value
    return value
