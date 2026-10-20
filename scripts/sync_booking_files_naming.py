import os
import sys
import re
import django

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.conf import settings
from apps.customers.models import BookingOrder, BookingDocument
from core.validators import sanitize_filename

def sync_all_booking_files():
    print("=== DONG BO HOA TEN CHUNG TU BOOKING [MA BOOKING]_[TEN FILE] ===")
    media_root = str(settings.MEDIA_ROOT)

    # 1. Quét BookingDocument
    docs = BookingDocument.objects.select_related('booking').all()
    print(f"Tong so BookingDocument: {docs.count()}")
    updated_count = 0
    
    for doc in docs:
        b_code = doc.booking.booking_code.strip()
        prefix = f"{b_code}_"
        
        # Xác định tên gốc
        curr_name = doc.file_name or (os.path.basename(doc.file.name) if doc.file else 'document')
        clean_name = re.sub(r'\s+', '_', sanitize_filename(curr_name))
        
        # Nếu tên là generic như 'booking_document' hoặc 'File Booking', lấy lại từ file.name
        if clean_name in ['booking_document', 'booking_file', 'File_Booking', 'document']:
            if doc.file and doc.file.name:
                clean_name = re.sub(r'\s+', '_', sanitize_filename(os.path.basename(doc.file.name)))

        if not clean_name.startswith(prefix):
            new_display_name = f"{prefix}{clean_name}"
        else:
            new_display_name = clean_name
            
        # Đổi tên file vật lý nếu có
        if doc.file and doc.file.name:
            old_path = os.path.join(media_root, doc.file.name)
            dir_name = os.path.dirname(doc.file.name)
            old_base = os.path.basename(doc.file.name)
            if not old_base.startswith(prefix):
                new_base = f"{prefix}{re.sub(r'\s+', '_', sanitize_filename(old_base))}"
                new_rel_path = os.path.join(dir_name, new_base).replace('\\', '/')
                new_full_path = os.path.join(media_root, new_rel_path)
                
                if os.path.exists(old_path) and not os.path.exists(new_full_path):
                    os.rename(old_path, new_full_path)
                    doc.file.name = new_rel_path
                elif os.path.exists(new_full_path):
                    doc.file.name = new_rel_path
                    
        doc.file_name = new_display_name
        doc.save(update_fields=['file_name', 'file'])
        updated_count += 1
        print(f"  [Doc ID {doc.id}] Da dong bo ten moi: {new_display_name}")

    # 2. Quét BookingOrder có booking_file nhưng chưa có BookingDocument
    bookings_with_file = BookingOrder.objects.exclude(booking_file='').exclude(booking_file__isnull=True)
    print(f"Tong so BookingOrder co booking_file: {bookings_with_file.count()}")
    
    for bk in bookings_with_file:
        b_code = bk.booking_code.strip()
        prefix = f"{b_code}_"
        
        # Đổi tên file vật lý của booking_file nếu chưa có prefix
        if bk.booking_file and bk.booking_file.name:
            old_path = os.path.join(media_root, bk.booking_file.name)
            dir_name = os.path.dirname(bk.booking_file.name)
            old_base = os.path.basename(bk.booking_file.name)
            if not old_base.startswith(prefix):
                new_base = f"{prefix}{re.sub(r'\s+', '_', sanitize_filename(old_base))}"
                new_rel_path = os.path.join(dir_name, new_base).replace('\\', '/')
                new_full_path = os.path.join(media_root, new_rel_path)
                
                if os.path.exists(old_path) and not os.path.exists(new_full_path):
                    os.rename(old_path, new_full_path)
                    bk.booking_file.name = new_rel_path
                    bk.save(update_fields=['booking_file'])
                elif os.path.exists(new_full_path):
                    bk.booking_file.name = new_rel_path
                    bk.save(update_fields=['booking_file'])

        # Nếu chưa có BookingDocument nào thì tự động tạo 1 doc kế thừa
        if not bk.documents.filter(is_deleted=False).exists():
            base_name = os.path.basename(bk.booking_file.name)
            try:
                f_size = bk.booking_file.size
            except Exception:
                f_size = 0
            BookingDocument.objects.create(
                booking=bk,
                file=bk.booking_file,
                file_name=base_name,
                file_size=f_size
            )
            print(f"  [Booking {bk.booking_code}] Tu dong dong bo BookingDocument cho file goc: {base_name}")

    print(f"=== HOAN TAT DONG BO! Da cap nhat {updated_count} chung tu ===")

if __name__ == '__main__':
    sync_all_booking_files()
