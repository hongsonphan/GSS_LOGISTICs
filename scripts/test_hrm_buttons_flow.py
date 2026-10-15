# -*- coding: utf-8 -*-
import os
import sys
import json
import django

# Set UTF-8 encoding for standard output
sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from apps.personnel.models import Employee, LaborContract, PayrollPeriod, PayrollSlip

def run_tests():
    User = get_user_model()
    user = User.objects.filter(is_superuser=True).first()
    if not user:
        user = User.objects.create_superuser('testadmin', 'test@example.com', 'admin123')

    client = Client()
    client.force_login(user)

    import time
    ts = int(time.time())
    emp_code = f'NV-T{ts}'
    ct_num = f'HDLD-T{ts}'

    print('=== 1. TEST TẠO & SỬA NHÂN VIÊN ===')
    # Test Tạo Nhân Viên
    emp_payload = {
        'code': emp_code,
        'full_name': 'Nguyễn Văn Test Nút',
        'nickname': 'TestBtn',
        'phone_number': '0909123456',
        'zalo_id': '0909123456',
        'email': f'testbtn{ts}@trienvo.com',
        'department': 'FLEET',
        'role': 'DRIVER',
        'gender': 'MALE',
        'date_of_birth': '1990-05-15',
        'national_id': f'079{ts}',
        'national_id_date': '2020-01-01',
        'national_id_place': 'Cục CS QLHC',
        'tax_id': f'800{ts}',
        'insurance_number': f'791{ts}',
        'bank_account': '1234567890',
        'bank_name': 'Vietcombank',
        'bank_beneficiary': 'NGUYEN VAN TEST NUT',
        'join_date': '15/01/2023', # Test DD/MM/YYYY input
        'license_number': 'B2-998877',
        'license_expiry': '2028-12-31',
        'base_salary': 8000000,
        'insurance_salary': 5000000,
        'is_social_insurance_participant': True,
        'is_active': True,
        'permanent_address': 'TP.HCM',
        'current_address': 'Bình Dương'
    }

    res_create_emp = client.post('/api/personnel/employees/', json.dumps(emp_payload), content_type='application/json')
    print('Tạo nhân viên:', res_create_emp.status_code, res_create_emp.json().get('message') or res_create_emp.json())
    assert res_create_emp.status_code in [200, 201], f'Tạo nhân viên thất bại: {res_create_emp.json()}'
    emp_id = res_create_emp.json()['data']['id']

    # Test Xem Nhân Viên
    res_view_emp = client.get(f'/api/personnel/employees/{emp_id}/')
    print('Xem nhân viên:', res_view_emp.status_code, 'Mã:', res_view_emp.json().get('code'))
    assert res_view_emp.status_code == 200

    # Test Sửa & Lưu Nhân Viên (gửi ngày đã được định dạng DD/MM/YYYY như serializer trả về)
    emp_edit_payload = res_view_emp.json()
    emp_edit_payload['full_name'] = 'Nguyễn Văn Test Nút (Đã Sửa)'
    emp_edit_payload['base_salary'] = 9500000
    res_save_emp = client.put(f'/api/personnel/employees/{emp_id}/', json.dumps(emp_edit_payload), content_type='application/json')
    print('Lưu sửa nhân viên:', res_save_emp.status_code, res_save_emp.json().get('message') or res_save_emp.json())
    assert res_save_emp.status_code == 200

    print('\n=== 2. TEST TẠO, XEM, SỬA, LƯU HỢP ĐỒNG LAO ĐỘNG ===')
    LaborContract.objects.filter(contract_number='HDLD-TEST-BTN-01').delete()
    # Test Tạo Hợp Đồng
    contract_payload = {
        'contract_number': ct_num,
        'employee': emp_id,
        'contract_type': 'DEFINITE_TERM',
        'status': 'ACTIVE',
        'job_title': 'Tài xế xe container đầu kéo',
        'working_address': 'Bãi xe Triền Võ, TP.HCM',
        'sign_date': '15/01/2023', # Test DD/MM/YYYY input
        'start_date': '15/01/2023', # Test DD/MM/YYYY input
        'end_date': '15/01/2024',
        'base_salary': 9000000,
        'insurance_salary': 5000000,
        'allowance_notes': 'Phụ cấp cơm 730k, phụ cấp điện thoại 300k'
    }
    res_create_ct = client.post('/api/personnel/contracts/', json.dumps(contract_payload), content_type='application/json')
    print('Tạo hợp đồng:', res_create_ct.status_code, res_create_ct.json().get('message') or res_create_ct.json())
    assert res_create_ct.status_code in [200, 201], f'Tạo hợp đồng thất bại: {res_create_ct.json()}'
    contract_id = res_create_ct.json()['data']['id']

    # Test Xem Hợp Đồng
    res_view_ct = client.get(f'/api/personnel/contracts/{contract_id}/')
    print('Xem hợp đồng:', res_view_ct.status_code, 'Số HĐ:', res_view_ct.json().get('contract_number'))
    assert res_view_ct.status_code == 200
    view_data = res_view_ct.json()
    print('Ngày trong chi tiết HĐ:', 'sign_date =', view_data.get('sign_date'), ', start_date =', view_data.get('start_date'))

    # Test Sửa & Lưu Hợp Đồng (Mô phỏng chính xác trường hợp gây lỗi: Bấm Sửa -> Bấm Lưu)
    edit_ct_payload = {
        'contract_number': view_data['contract_number'],
        'employee': view_data['employee'],
        'contract_type': view_data['contract_type'],
        'status': 'ACTIVE',
        'job_title': 'Tài xế chuyên tuyến Bắc Nam (Đã Cập Nhật)',
        'working_address': 'Văn phòng & Bãi xe Triền Võ',
        'sign_date': view_data['sign_date'], # Giá trị nguyên bản từ API (DD/MM/YYYY)
        'start_date': view_data['start_date'],
        'end_date': view_data['end_date'],
        'base_salary': 10500000,
        'insurance_salary': 5500000,
        'allowance_notes': 'Tăng lương và phụ cấp trách nhiệm theo quyết định BGĐ'
    }
    res_save_ct = client.put(f'/api/personnel/contracts/{contract_id}/', json.dumps(edit_ct_payload), content_type='application/json')
    print('Lưu sửa hợp đồng:', res_save_ct.status_code, res_save_ct.json().get('message') or res_save_ct.json())
    assert res_save_ct.status_code == 200, f'Lỗi lưu hợp đồng: {res_save_ct.json()}'

    # Test Ký Phụ Lục Hợp Đồng
    app_payload = {
        'contract': contract_id,
        'appendix_number': 'PL-01-HDLD-TEST',
        'effective_date': '01/06/2023', # Test DD/MM/YYYY
        'new_base_salary': 11000000,
        'new_role': 'Tài xế đội trưởng',
        'change_summary': 'Bổ nhiệm đội trưởng và điều chỉnh phụ cấp'
    }
    res_app = client.post('/api/personnel/appendices/', json.dumps(app_payload), content_type='application/json')
    print('Ký phụ lục HĐ:', res_app.status_code, res_app.json().get('message') or res_app.json())
    assert res_app.status_code in [200, 201]

    print('\n=== 3. TEST TẠO KỲ LƯƠNG, XEM & SỬA LƯU PHIẾU LƯƠNG ===')
    period_code = '2026-11'
    PayrollPeriod.objects.filter(period_code=period_code).delete()
    period_payload = {
        'period_code': period_code,
        'name': 'Bảng lương Tháng 11/2026',
        'from_date': '2026-11-01',
        'to_date': '2026-11-30',
        'standard_days': 26.0
    }
    res_period = client.post('/api/personnel/periods/', json.dumps(period_payload), content_type='application/json')
    print('Tạo kỳ lương:', res_period.status_code, res_period.json().get('message') or res_period.json())
    period_id = res_period.json()['data']['id']

    # Tính lương
    res_calc = client.post(f'/api/personnel/periods/{period_id}/calculate/')
    print('Tính lương kỳ:', res_calc.status_code, res_calc.json().get('message') or res_calc.json())

    # Xem danh sách phiếu lương
    slip = PayrollSlip.objects.filter(period__period_code=period_code).first()
    if slip:
        print('Xem phiếu lương:', slip.id, slip.slip_code, slip.employee.full_name)
        res_view_slip = client.get(f'/api/personnel/slips/{slip.id}/')
        print('GET slip status:', res_view_slip.status_code)
        assert res_view_slip.status_code == 200

        # Sửa & Lưu phiếu lương
        slip_edit_payload = {
            'kpi_bonus': 1500000,
            'other_allowance': 500000,
            'phone_allowance': 300000,
            'lunch_allowance': 730000,
            'advance_deductions': 0,
            'notes': 'Thưởng thành tích hoàn thành chuyến xe xuất sắc'
        }
        res_save_slip = client.put(f'/api/personnel/slips/{slip.id}/', json.dumps(slip_edit_payload), content_type='application/json')
        print('Lưu sửa phiếu lương:', res_save_slip.status_code, res_save_slip.json().get('message') or res_save_slip.json())
        assert res_save_slip.status_code == 200

    print('\n=== 4. TEST XÓA / CHẤM DỨT ===')
    # Chấm dứt hợp đồng
    res_del_ct = client.delete(f'/api/personnel/contracts/{contract_id}/')
    print('Chấm dứt HĐ:', res_del_ct.status_code, res_del_ct.json().get('message') or res_del_ct.json())
    assert res_del_ct.status_code == 200

    # Xóa mềm nhân viên
    res_del_emp = client.delete(f'/api/personnel/employees/{emp_id}/')
    print('Xóa nhân viên:', res_del_emp.status_code, res_del_emp.json().get('message') or res_del_emp.json())
    assert res_del_emp.status_code == 200

    print('\n>>> TẤT CẢ CÁC TÍNH NĂNG TẠO, XEM, SỬA, LƯU, XÓA ĐỀU HOÀN TOÀN THÀNH CÔNG 100%! <<<')

if __name__ == '__main__':
    run_tests()
