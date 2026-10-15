import os
import sys
import django
from decimal import Decimal

sys.stdout.reconfigure(encoding='utf-8')
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.personnel.models import (
    TaxBracket, TaxBracketStatus, SalaryDeductionRate,
    PayrollPolicyConfig, PayrollParameter, AllowanceGroup, AllowanceType
)

print("=" * 80)
print("ĐỒNG BỘ CHÍNH SÁCH, BIỂU THUẾ & DANH MỤC THU NHẬP TỪ BIM ERP")
print("Cập nhật theo Luật Thuế TNCN 109/2025/QH15 & Nghị quyết 110/2025/UBTVQH15")
print("=" * 80)

# 1. BIỂU THUẾ TNCN 5 BẬC MỚI (LUẬT 109/2025/QH15 ÁP DỤNG TỪ 01/01/2026)
print("\n>>> 1. Đồng bộ Biểu thuế Lũy tiến 5 bậc mới theo Luật 109/2025/QH15...")
TaxBracket.objects.all().delete()

tax_brackets_data = [
    {
        'bracket_level': 1,
        'min_income': Decimal('0'),
        'max_income': Decimal('10000000'),
        'tax_rate': Decimal('5.00'),
        'quick_subtraction': Decimal('0'),
        'quick_formula': '5% × TNTT',
        'effective_date': '2026-01-01',
        'status': TaxBracketStatus.ACTIVE,
        'legal_basis': 'Luật Thuế Thu nhập Cá nhân 109/2025/QH15, ban hành ngày 10/12/2025.',
        'description': 'Đến 10 triệu đồng/tháng (áp dụng từ 01/01/2026)'
    },
    {
        'bracket_level': 2,
        'min_income': Decimal('10000000'),
        'max_income': Decimal('30000000'),
        'tax_rate': Decimal('10.00'),
        'quick_subtraction': Decimal('500000'),
        'quick_formula': '10% × TNTT - 0.5 triệu',
        'effective_date': '2026-01-01',
        'status': TaxBracketStatus.ACTIVE,
        'legal_basis': 'Luật Thuế Thu nhập Cá nhân 109/2025/QH15, ban hành ngày 10/12/2025.',
        'description': 'Trên 10 triệu đến 30 triệu đồng/tháng'
    },
    {
        'bracket_level': 3,
        'min_income': Decimal('30000000'),
        'max_income': Decimal('60000000'),
        'tax_rate': Decimal('20.00'),
        'quick_subtraction': Decimal('3500000'),
        'quick_formula': '20% × TNTT - 3.5 triệu',
        'effective_date': '2026-01-01',
        'status': TaxBracketStatus.ACTIVE,
        'legal_basis': 'Luật Thuế Thu nhập Cá nhân 109/2025/QH15, ban hành ngày 10/12/2025.',
        'description': 'Trên 30 triệu đến 60 triệu đồng/tháng'
    },
    {
        'bracket_level': 4,
        'min_income': Decimal('60000000'),
        'max_income': Decimal('100000000'),
        'tax_rate': Decimal('30.00'),
        'quick_subtraction': Decimal('9500000'),
        'quick_formula': '30% × TNTT - 9.5 triệu',
        'effective_date': '2026-01-01',
        'status': TaxBracketStatus.ACTIVE,
        'legal_basis': 'Luật Thuế Thu nhập Cá nhân 109/2025/QH15, ban hành ngày 10/12/2025.',
        'description': 'Trên 60 triệu đến 100 triệu đồng/tháng'
    },
    {
        'bracket_level': 5,
        'min_income': Decimal('100000000'),
        'max_income': None,
        'tax_rate': Decimal('35.00'),
        'quick_subtraction': Decimal('14500000'),
        'quick_formula': '35% × TNTT - 14.5 triệu',
        'effective_date': '2026-01-01',
        'status': TaxBracketStatus.ACTIVE,
        'legal_basis': 'Luật Thuế Thu nhập Cá nhân 109/2025/QH15, ban hành ngày 10/12/2025.',
        'description': 'Trên 100 triệu đồng/tháng'
    },
]

for b in tax_brackets_data:
    TaxBracket.objects.create(**b)
    max_str = f"{b['max_income']:,.0f} đ" if b['max_income'] else "Trở lên"
    print(f"  [+] Bậc {b['bracket_level']}: {b['min_income']:,.0f} đ - {max_str} ({b['tax_rate']}%) | Số trừ nhanh: {b['quick_subtraction']:,.0f} đ | CT: {b['quick_formula']}")

# 2. CHÍNH SÁCH LƯƠNG & GIẢM TRỪ GIA CẢNH (NGHỊ QUYẾT 110/2025/UBTVQH15)
print("\n>>> 2. Cập nhật Chính sách Lương chuẩn theo Nghị quyết 110/2025 & NĐ 73/2024...")
policy = PayrollPolicyConfig.objects.filter(is_active=True).first()
if not policy:
    policy = PayrollPolicyConfig.objects.create()

policy.name = "Chính sách Lương chuẩn 2026 (Bim ERP)"
policy.personal_relief = Decimal('15500000')      # 15.5tr/tháng theo NQ 110/2025
policy.dependent_relief = Decimal('6200000')       # 6.2tr/người/tháng theo NQ 110/2025
policy.standard_working_days = Decimal('26.0')
policy.max_insurance_salary = Decimal('50800000')   # 50.8tr/tháng (20 lần lương cơ sở 2.54tr)
policy.legal_basis = "Nghị quyết số 110/2025/UBTVQH15 & Nghị định 73/2024/NĐ-CP"
policy.effective_date = '2026-01-01'
policy.is_active = True
policy.save()

print(f"  [+] Giảm trừ bản thân: {policy.personal_relief:,.0f} đ/tháng")
print(f"  [+] Giảm trừ người phụ thuộc: {policy.dependent_relief:,.0f} đ/người/tháng")
print(f"  [+] Mức trần đóng BHXH/BHYT: {policy.max_insurance_salary:,.0f} đ/tháng")
print(f"  [+] Ngày công tiêu chuẩn: {policy.standard_working_days} ngày/tháng")
print(f"  [+] Căn cứ pháp lý: {policy.legal_basis}")

# 3. TỶ LỆ TRÍCH NỘP THEO LƯƠNG (LUẬT BHXH 2024 & LUẬT CÔNG ĐOÀN 2024)
print("\n>>> 3. Cập nhật Tỷ lệ trích nộp Bảo hiểm & Công đoàn theo chuẩn Bim ERP...")
rate = SalaryDeductionRate.objects.filter(is_active=True).first()
if not rate:
    rate = SalaryDeductionRate.objects.create()

rate.name = "Quy định trích nộp BHXH, BHYT, BHTN & Công đoàn (Luật BHXH 2024)"
rate.bhxh_employee_rate = Decimal('0.0800')    # 8% hưu trí, tử tuất
rate.bhyt_employee_rate = Decimal('0.0150')    # 1.5% BHYT
rate.bhtn_employee_rate = Decimal('0.0100')    # 1% BHTN
rate.union_employee_rate = Decimal('0.0100')   # 1% Đoàn phí công đoàn (đoàn viên)

rate.bhxh_employer_rate = Decimal('0.1750')    # 17.5% (14% hưu trí + 3% ốm đau thai sản + 0.5% BHTNLĐ)
rate.bhyt_employer_rate = Decimal('0.0300')    # 3% BHYT DN
rate.bhtn_employer_rate = Decimal('0.0100')    # 1% BHTN DN
rate.union_employer_rate = Decimal('0.0200')   # 2% Kinh phí công đoàn DN

rate.description = "Căn cứ Luật BHXH 2024, Luật BHYT và Luật Công đoàn 2024."
rate.effective_date = '2025-07-01'
rate.is_active = True
rate.save()

print(f"  [+] Người lao động đóng: {(rate.bhxh_employee_rate + rate.bhyt_employee_rate + rate.bhtn_employee_rate)*100:.1f}% (+ {rate.union_employee_rate*100:.0f}% ĐPCĐ nếu là đoàn viên)")
print(f"  [+] Doanh nghiệp đóng: {(rate.bhxh_employer_rate + rate.bhyt_employer_rate + rate.bhtn_employer_rate + rate.union_employer_rate)*100:.1f}% (BHXH 17.5% + BHYT 3% + BHTN 1% + KPCĐ 2%)")

# 4. DANH MỤC THAM SỐ CHÍNH SÁCH LƯƠNG & THUẾ (PAYROLL PARAMETERS)
print("\n>>> 4. Đồng bộ 20 Tham số chính sách Lương từ Bim ERP (PayrollParameter)...")
parameters_data = [
    ("GT_BANTHAN", "Mức giảm trừ gia cảnh: Bản thân", Decimal("15500000"), "VNĐ / tháng", "Nghị quyết số 110/2025/UBTVQH15, ban hành ngày 17/10/2025", 1),
    ("GT_PHUTHUOC", "Mức giảm trừ gia cảnh: Người phụ thuộc", Decimal("6200000"), "VNĐ / người / tháng", "Nghị quyết số 110/2025/UBTVQH15, ban hành ngày 17/10/2025", 2),
    ("TRAN_BHXH", "Mức trần tiền lương đóng BHXH & BHYT", Decimal("50800000"), "VNĐ / tháng", "Tối đa 20 lần mức lương cơ sở hiện hành theo Nghị định 73/2024/NĐ-CP", 3),
    ("NCC_DEFAULT", "Ngày công chuẩn mặc định hàng tháng", Decimal("26"), "ngày / tháng", "Nội quy Lao động Doanh nghiệp", 4),
    ("WORK_HOURS_PER_DAY", "Số giờ làm việc chuẩn mỗi ngày", Decimal("8"), "giờ / ngày", "Bộ luật Lao động 2019 Điều 105", 5),
    ("OT_WEEKDAY_RATE", "Hệ số làm thêm giờ ngày thường (%)", Decimal("150"), "%", "BLLĐ 2019; NĐ 145/2020/NĐ-CP Điều 97", 6),
    ("OT_WEEKEND_RATE", "Hệ số làm thêm ngày nghỉ hàng tuần (%)", Decimal("200"), "%", "BLLĐ 2019; NĐ 145/2020/NĐ-CP Điều 97", 7),
    ("OT_HOLIDAY_RATE", "Hệ số làm thêm ngày Lễ/Tết (%)", Decimal("300"), "%", "BLLĐ 2019; NĐ 145/2020/NĐ-CP Điều 97", 8),
    ("NIGHTSHIFT_RATE", "Hệ số ca đêm không OT (%)", Decimal("130"), "%", "BLLĐ 2019 Điều 106; NĐ 145/2020", 9),
    ("OT_NIGHT_WD_RATE", "Hệ số OT ca đêm ngày thường (%)", Decimal("200"), "%", " = 150% + 30% + 20%; BLLĐ 2019", 10),
    ("OT_NIGHT_WE_RATE", "Hệ số OT ca đêm ngày nghỉ tuần (%)", Decimal("250"), "%", " = 200% + 30% + 20%; BLLĐ 2019", 11),
    ("OT_NIGHT_HL_RATE", "Hệ số OT ca đêm ngày Lễ/Tết (%)", Decimal("350"), "%", " = 300% + 30% + 20%; BLLĐ 2019", 12),
    ("BHXH_EMP_RATE", "Tỷ lệ BHXH Người lao động đóng (%)", Decimal("8"), "%", "Luật BHXH 2024", 13),
    ("BHYT_EMP_RATE", "Tỷ lệ BHYT Người lao động đóng (%)", Decimal("1.5"), "%", "Luật BHYT 2014 sửa đổi", 14),
    ("BHTN_EMP_RATE", "Tỷ lệ BHTN Người lao động đóng (%)", Decimal("1"), "%", "Luật Việc làm 2013 Điều 57", 15),
    ("BHXH_ER_RATE", "Tỷ lệ BHXH Doanh nghiệp đóng (%)", Decimal("17.5"), "%", "Luật BHXH 2024", 16),
    ("BHYT_ER_RATE", "Tỷ lệ BHYT Doanh nghiệp đóng (%)", Decimal("3"), "%", "Luật BHYT 2014 sửa đổi", 17),
    ("BHTN_ER_RATE", "Tỷ lệ BHTN Doanh nghiệp đóng (%)", Decimal("1"), "%", "Luật Việc làm 2013", 18),
    ("UNION_FEE_RATE", "Tỷ lệ đoàn phí Công đoàn đoàn viên (%)", Decimal("1"), "%", "Luật Công đoàn 2024", 19),
    ("PROBATION_RATE", "Tỷ lệ lương thử việc tối thiểu (%)", Decimal("85"), "%", "BLLĐ 2019 Điều 26 Khoản 3", 20),
]

for code, name, val, unit, basis, ord_val in parameters_data:
    p_obj, _ = PayrollParameter.objects.update_or_create(
        code=code,
        defaults={
            'name': name,
            'value': val,
            'unit': unit,
            'legal_basis': basis,
            'effective_date': '2026-01-01',
            'is_active': True,
            'order': ord_val
        }
    )
    print(f"  [+] [{p_obj.code}] {p_obj.name}: {p_obj.value:,.0f} {p_obj.unit}")

# 5. BẢNG PHỤ CẤP, TRỢ CẤP & PHÚC LỢI (ALLOWANCE GROUPS & TYPES TỪ BIM ERP)
print("\n>>> 5. Đồng bộ Bảng Phụ cấp, Trợ cấp & Phúc lợi từ Bim ERP...")

# Nhóm I: Phụ cấp lương (ghi HĐLĐ, đóng BHXH)
g1, _ = AllowanceGroup.objects.update_or_create(
    code="PHU_CAP_LUONG",
    defaults={
        'name': "BẢNG I - PHỤ CẤP LƯƠNG (Có ghi trong HĐLĐ, Có đóng BHXH)",
        'description': "Các khoản phụ cấp theo chức danh, vị trí công tác hoặc điều kiện làm việc",
        'order': 1,
        'is_active': True
    }
)
allowances_g1 = [
    ("Pc_Trach_Nhiem", "Phụ cấp trách nhiệm", "ALLOWANCE", Decimal("500000"), Decimal("500000"), Decimal("1000000"), True, True, "Điều 103 Bộ luật Lao động 2019"),
    ("Pc_Chuc_Vu", "Phụ cấp chức vụ", "ALLOWANCE", Decimal("300000"), Decimal("300000"), Decimal("600000"), True, True, "Quy chế Thu nhập Công ty; HĐLĐ"),
    ("Pc_Tham_Nien", "Phụ cấp thâm niên", "ALLOWANCE", Decimal("200000"), Decimal("200000"), Decimal("500000"), True, True, "Quy chế Thâm niên Doanh nghiệp"),
]
for code, name, cat, def_amt, l1, l2, is_ins, is_tax, basis in allowances_g1:
    AllowanceType.objects.update_or_create(
        code=code,
        defaults={
            'group': g1, 'name': name, 'category': cat, 'default_amount': def_amt,
            'level_1_amount': l1, 'level_2_amount': l2, 'is_insurance_applicable': is_ins,
            'is_taxable': is_tax, 'legal_basis': basis, 'is_active': True
        }
    )
    print(f"  [+] Nhóm I: [{code}] {name} (BHXH={is_ins}, TNCN={is_tax})")

# Nhóm II: Trợ cấp (sự kiện, thai sản, ốm đau)
g2, _ = AllowanceGroup.objects.update_or_create(
    code="TRO_CAP",
    defaults={
        'name': "BẢNG II - TRỢ CẤP (Theo quy định pháp luật & Sự kiện)",
        'description': "Các khoản trợ cấp không có tính chất lương thường xuyên",
        'order': 2,
        'is_active': True
    }
)
allowances_g2 = [
    ("Pc_Thuong_Ln", "Tiền thưởng theo Điều 104 Bộ luật Lao động", "SUBSIDY", Decimal("500000"), Decimal("500000"), Decimal("1000000"), False, True, "Điều 104 BLLĐ 2019"),
    ("Pc_Sang_Kien", "Tiền thưởng sáng kiến, cải tiến kỹ thuật", "SUBSIDY", Decimal("300000"), Decimal("300000"), Decimal("500000"), False, True, "Điều 104 BLLĐ 2019"),
    ("Pc_Hieu_Hy", "Trợ cấp Hiếu, Hỷ, Sinh nhật", "SUBSIDY", Decimal("300000"), Decimal("300000"), Decimal("500000"), False, False, "Công văn 1198/BHXH-CĐBHXH"),
    ("Pc_Tnld", "Trợ cấp tai nạn lao động, bệnh nghề nghiệp", "SUBSIDY", Decimal("1000000"), Decimal("1000000"), Decimal("2000000"), False, False, "Điều 38 Luật ATVSLĐ 2015"),
    ("Pc_Hoan_Canh", "Trợ cấp khó khăn đột xuất, thiên tai", "SUBSIDY", Decimal("500000"), Decimal("500000"), Decimal("1000000"), False, False, "Công văn 1198/BHXH-CĐBHXH"),
    ("Pc_Ve_Tau_Xe", "Hỗ trợ vé tàu xe đi lại dịp Lễ, Tết", "SUBSIDY", Decimal("500000"), Decimal("500000"), Decimal("1000000"), False, False, "Công văn 1198/BHXH-CĐBHXH"),
    ("Pc_Tien_Cong_Tac", "Phụ cấp lưu trú, tiếp khách, công tác phí", "SUBSIDY", Decimal("500000"), Decimal("500000"), Decimal("800000"), False, False, "Thông tư 40/2017/TT-BTC"),
]
for code, name, cat, def_amt, l1, l2, is_ins, is_tax, basis in allowances_g2:
    AllowanceType.objects.update_or_create(
        code=code,
        defaults={
            'group': g2, 'name': name, 'category': cat, 'default_amount': def_amt,
            'level_1_amount': l1, 'level_2_amount': l2, 'is_insurance_applicable': is_ins,
            'is_taxable': is_tax, 'legal_basis': basis, 'is_active': True
        }
    )
    print(f"  [+] Nhóm II: [{code}] {name} (BHXH={is_ins}, TNCN={is_tax})")

# Nhóm III: Hỗ trợ & Phúc lợi khoán không đóng BHXH
g3, _ = AllowanceGroup.objects.update_or_create(
    code="HO_TRO_PHUC_LOI",
    defaults={
        'name': "BẢNG III - HỖ TRỢ & PHÚC LỢI (Khoán chi không đóng BHXH)",
        'description': "Các khoản hỗ trợ sinh hoạt đời sống cho người lao động",
        'order': 3,
        'is_active': True
    }
)
allowances_g3 = [
    ("Pc_An_Trua", "Tiền ăn giữa ca / ăn trưa khoán", "SUPPORT", Decimal("730000"), Decimal("730000"), Decimal("730000"), False, False, "Mục 2.6 Khoản 2 Điều 6 Thông tư 78/2014/TT-BTC"),
    ("Pc_Xang_Xe", "Hỗ trợ xăng xe, đi lại hiện trường", "SUPPORT", Decimal("300000"), Decimal("300000"), Decimal("500000"), False, False, "Khoản 2 Điều 6 Thông tư 111/2013/TT-BTC"),
    ("Pc_Dien_Thoai", "Hỗ trợ tiền điện thoại liên lạc công việc", "SUPPORT", Decimal("200000"), Decimal("200000"), Decimal("300000"), False, False, "Khoản 2 Điều 6 Thông tư 111/2013/TT-BTC"),
    ("Pc_Nha_O", "Hỗ trợ tiền nhà ở, thuê nhà trọ", "SUPPORT", Decimal("1000000"), Decimal("1000000"), Decimal("1500000"), False, True, "Công văn 1198/BHXH-CĐBHXH"),
    ("Pc_Giu_Tre", "Hỗ trợ giữ trẻ, nuôi con nhỏ (< 6 tuổi)", "SUPPORT", Decimal("500000"), Decimal("500000"), Decimal("500000"), False, False, "Khoản 4 Điều 30 Thông tư 59/2015/TT-BLĐTBXH"),
]
for code, name, cat, def_amt, l1, l2, is_ins, is_tax, basis in allowances_g3:
    AllowanceType.objects.update_or_create(
        code=code,
        defaults={
            'group': g3, 'name': name, 'category': cat, 'default_amount': def_amt,
            'level_1_amount': l1, 'level_2_amount': l2, 'is_insurance_applicable': is_ins,
            'is_taxable': is_tax, 'legal_basis': basis, 'is_active': True
        }
    )
    print(f"  [+] Nhóm III: [{code}] {name} (BHXH={is_ins}, TNCN={is_tax})")

print("\n🎉 HOÀN TẤT ĐỒNG BỘ 100% CHÍNH SÁCH, BIỂU THUẾ & DANH MỤC THU NHẬP TỪ BIM ERP!")
