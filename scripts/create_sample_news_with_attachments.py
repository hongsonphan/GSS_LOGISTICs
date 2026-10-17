import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.stdout.reconfigure(encoding='utf-8')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from django.core.files.base import ContentFile
from django.contrib.auth.models import User
from django.utils import timezone
from apps.collaboration.models.news import CompanyPost, PostCategory, PostAttachment

print("=== TẠO BẢN TIN MẪU CÓ ĐÍNH KÈM FILE PDF, WORD, EXCEL ===")

admin_user = User.objects.filter(is_superuser=True).first()
if not admin_user:
    admin_user = User.objects.first()

category, _ = PostCategory.objects.get_or_create(
    code='REGULATION',
    defaults={
        'name': 'Quy chế & Chỉ thị Điều hành',
        'color': '#0d9488',
        'icon': 'ph-shield-check',
        'order': 1
    }
)

post, created = CompanyPost.objects.get_or_create(
    title='[QUYẾT ĐỊNH 2026] Ban hành Quy chế Vận tải FTL & Tiêu chuẩn Kiểm soát Vận đơn POD',
    defaults={
        'category': category,
        'author': admin_user,
        'summary': 'Chỉ thị từ Ban Giám Đốc về việc thắt chặt kiểm soát chứng từ giao nhận, quy trình nghiệm thu vỏ cont và định mức phụ cấp đội xe.',
        'content': """Kính gửi: Toàn thể Cán bộ - Nhân viên Triền Võ Logistics (BIM Ecosystem),

Nhằm chuẩn hóa toàn diện quy trình vận tải hàng hóa FTL, đảm bảo an toàn pháp lý tuyệt đối cho các hợp đồng vận tải đường bộ và cảng biển, Ban Giám Đốc ban hành Quyết định áp dụng Quy chế Vận tải mới kể từ ngày 01/11/2026.

I. NGUYÊN TẮC VẬN HÀNH BẮT BUỘC:
1. Mọi chuyến xe xuất phát từ bãi hoặc cảng Cát Lái, Cái Mép, Hải Phòng phải có đầy đủ Lệnh điều xe điện tử được duyệt trên hệ thống Bim Logistics Platform.
2. Tài xế bắt buộc chụp ảnh Biên bản bàn giao hàng (POD) có đầy đủ chữ ký, họ tên và dấu tròn của thủ kho nhận hàng trong vòng tối đa 02 giờ sau khi dỡ hàng xong.
3. Không thực hiện thanh toán phụ cấp nếu chứng từ phát sinh hư hỏng, thiếu hụt (OS&D) chưa được lập biên bản bất thường đúng quy định.

II. HỒ SƠ TÀI LIỆU KÈM THEO:
Đề nghị các phòng ban tải về và nghiên cứu kỹ các văn bản chỉ đạo đính kèm dưới đây:
- Quyết định ban hành và Quy chế Vận tải FTL (File PDF ký duyệt).
- Bảng định mức cước & phụ cấp tài xế năm 2026 (File Excel tính toán chi tiết).
- Hướng dẫn quy trình xử lý sự cố OS&D hiện trường (File Word biểu mẫu).

Trân trọng thông báo./.
BAN GIÁM ĐỐC TRIỀN VÕ LOGISTICS""",
        'is_pinned': True,
        'is_urgent': True,
        'target_department': 'ALL',
        'is_published': True,
        'published_at': timezone.now(),
        'view_count': 12,
    }
)

# 1. Tạo file PDF mẫu
pdf_content = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000056 00000 n\n0000000111 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF\n"

# 2. Tạo file Excel (.xlsx) mẫu qua openpyxl
import io
import openpyxl

wb = openpyxl.Workbook()
ws = wb.active
ws.title = "Bảng Định Mức 2026"
ws.append(["MÃ TUYẾN", "TÊN TUYẾN ĐƯỜNG", "CỰ LY (KM)", "ĐỊNH MỨC DẦU (LÍT)", "PHỤ CẤP VÉ CẦU ĐƯỜNG (VNĐ)", "LƯƠNG KHOÁN CHUYẾN"])
ws.append(["T01", "Cát Lái - KCN VSIP 1 (Bình Dương)", 45, 18, 150000, 450000])
ws.append(["T02", "Cái Mép - KCN Nhơn Trạch (Đồng Nai)", 58, 24, 220000, 520000])
ws.append(["T03", "Cát Lái - KCN Sóng Thần", 35, 14, 110000, 380000])
ws.append(["T04", "SP-PSA Cái Mép - KCN Long Hậu", 72, 30, 280000, 680000])
ws.append(["T05", "ICD Phước Long - Tân Cảng Cát Lái", 15, 6, 60000, 250000])

excel_buffer = io.BytesIO()
wb.save(excel_buffer)
excel_bytes = excel_buffer.getvalue()

# 3. Tạo file Word (.docx) mẫu
try:
    import docx
    doc = docx.Document()
    doc.add_heading("QUY TRÌNH XỬ LÝ SỰ CỐ OS&D HIỆN TRƯỜNG", 0)
    doc.add_paragraph("Triền Võ Logistics - Ban Điều Vận & Đội Xe")
    doc.add_paragraph("1. Khi phát hiện hàng hóa bị ướt, móp méo hoặc rách seal, tài xế phải chụp ảnh giữ nguyên hiện trường.")
    doc.add_paragraph("2. Lập Biên bản bất thường có chữ ký xác nhận của đại diện kho nhận và giám sát cảng.")
    doc.add_paragraph("3. Gửi thông báo ngay về hotline Điều độ trong vòng 15 phút.")
    doc_buffer = io.BytesIO()
    doc.save(doc_buffer)
    word_bytes = doc_buffer.getvalue()
except ImportError:
    word_bytes = b"Sample Word Content"

# Xóa attachments cũ nếu có để tạo lại sạch sẽ
post.attachments.all().delete()

# Đính kèm PDF
att_pdf = PostAttachment.objects.create(
    post=post,
    file_name="Quy_che_van_tai_FTL_BIM_Logistics_2026.pdf",
    file_size=len(pdf_content)
)
att_pdf.file.save("Quy_che_van_tai_FTL_BIM_Logistics_2026.pdf", ContentFile(pdf_content))

# Đính kèm Excel
att_xls = PostAttachment.objects.create(
    post=post,
    file_name="Bang_dinh_muc_cuoc_phu_cap_doi_xe_2026.xlsx",
    file_size=len(excel_bytes)
)
att_xls.file.save("Bang_dinh_muc_cuoc_phu_cap_doi_xe_2026.xlsx", ContentFile(excel_bytes))

# Đính kèm Word
att_doc = PostAttachment.objects.create(
    post=post,
    file_name="Huong_dan_quy_trinh_su_co_OSD_hien_truong.docx",
    file_size=len(word_bytes)
)
att_doc.file.save("Huong_dan_quy_trinh_su_co_OSD_hien_truong.docx", ContentFile(word_bytes))

print(f"Đã tạo thành công Bản tin ID={post.id}: {post.title}")
print(f"Số lượng tệp đính kèm: {post.attachments.count()}")
for a in post.attachments.all():
    print(f"  - {a.file_name} ({a.file_size} bytes) -> {a.file.url}")
