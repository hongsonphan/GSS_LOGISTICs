# -*- coding: utf-8 -*-
"""
Script Chuẩn Hóa Ký Hiệu Hợp Đồng Lao Động & Phụ Lục Hợp Đồng theo quy chuẩn BIM ERP / Bim Logistics:
- Hợp đồng: [Loại hợp đồng].[Năm].[SốTT trong năm]
  Ví dụ: HDLD.2026.0015, HDTV.2026.0016, HDKV.2026.0017
- Phụ lục: [Mã Hợp Đồng].PL[SốTT]
  Ví dụ: HDLD.2026.0015.PL1, HDLD.2026.0015.PL2
"""
import os
import sys
import re

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Setup PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import transaction
from apps.personnel.models import LaborContract, ContractAppendix

def sync_naming():
    print("=" * 100)
    print(" BẮT ĐẦU CHUẨN HÓA KÝ HIỆU HỢP ĐỒNG & PHỤ LỤC THEO QUY CHUẨN BIM ERP")
    print("=" * 100)

    contracts = list(LaborContract.all_objects.all().order_by('sign_date', 'id'))
    if not contracts:
        print("Không có hợp đồng nào trong CSDL.")
        return

    # Nhóm theo năm
    grouped_by_year = {}
    for c in contracts:
        # Xác định năm của hợp đồng
        year = None
        if c.sign_date:
            year = c.sign_date.year
        if not year:
            # Thử trích xuất từ mã cũ
            m_year = re.search(r'(202[0-9])', c.contract_number or '')
            if m_year:
                year = int(m_year.group(1))
            else:
                year = 2026
        
        # Nếu năm 2023 mà tên có 2024 (như HDLD-KT001-2024), ưu tiên năm 2024 ghi trong tên
        m_2024 = re.search(r'-(2024)$', c.contract_number or '')
        if m_2024:
            year = 2024

        if year not in grouped_by_year:
            grouped_by_year[year] = []
        grouped_by_year[year].append(c)

    print(f"Tổng số hợp đồng: {len(contracts)} | Phân bổ các năm: {list(grouped_by_year.keys())}")

    updated_contracts_count = 0
    updated_appendices_count = 0

    with transaction.atomic():
        # Bước 1: Gán mã tạm thời để tránh xung đột unique constraint
        for c in contracts:
            c.contract_number = f"TEMP_{c.id}_{c.contract_number}"
            c.save(update_fields=['contract_number'])

        # Bước 2: Chuẩn hóa theo từng năm
        for year in sorted(grouped_by_year.keys()):
            year_contracts = grouped_by_year[year]
            # Sắp xếp theo id tăng dần
            year_contracts.sort(key=lambda x: x.id)

            seq = 1
            for c in year_contracts:
                prefix = LaborContract.get_contract_type_prefix(c.contract_type)
                new_number = f"{prefix}.{year}.{seq:04d}"
                old_number = c.contract_number.replace(f"TEMP_{c.id}_", "")

                c.contract_number = new_number
                c.save(update_fields=['contract_number'])
                updated_contracts_count += 1
                seq += 1

                print(f" [HĐ] ID: {c.id:<4} | Cũ: {old_number:<28} -> Mới: {new_number:<20} | Nhân viên: {c.employee.full_name} ({c.employee.code})")

                # Cập nhật các phụ lục của hợp đồng này
                apps = list(c.appendices.all().order_by('effective_date', 'id'))
                app_seq = 1
                for app in apps:
                    old_app_num = app.appendix_number
                    new_app_num = f"{new_number}.PL{app_seq}"
                    app.appendix_number = new_app_num
                    app.save(update_fields=['appendix_number'])
                    updated_appendices_count += 1
                    app_seq += 1
                    print(f"   └── [PL] ID: {app.id:<4} | Cũ: {old_app_num:<26} -> Mới: {new_app_num:<24}")

    print("=" * 100)
    print(f" HOÀN TẤT CHUẨN HÓA:")
    print(f"   - Hợp đồng lao động đã chuẩn hóa: {updated_contracts_count}")
    print(f"   - Phụ lục hợp đồng đã chuẩn hóa: {updated_appendices_count}")
    print("=" * 100)

if __name__ == '__main__':
    sync_naming()
