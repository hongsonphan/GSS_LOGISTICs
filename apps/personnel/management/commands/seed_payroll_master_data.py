import sys
from django.core.management.base import BaseCommand
from apps.personnel.models import (
    TaxBracket, SalaryDeductionRate, PayrollPolicyConfig,
    Employee, LaborContract, ContractType, ContractStatus,
    EmployeeDependent
)
from datetime import date
from decimal import Decimal

class Command(BaseCommand):
    help = "Khoi tao Master Data cho Phan he Quan ly Nhan su & Tien Luong"

    def handle(self, *args, **options):
        # 1. Thue TNCN 7 bac
        brackets_data = [
            (1, 0, 5000000, Decimal('0.05'), 0),
            (2, 5000000, 10000000, Decimal('0.10'), 250000),
            (3, 10000000, 18000000, Decimal('0.15'), 750000),
            (4, 18000000, 32000000, Decimal('0.20'), 1650000),
            (5, 32000000, 52000000, Decimal('0.25'), 3250000),
            (6, 52000000, 80000000, Decimal('0.30'), 5850000),
            (7, 80000000, None, Decimal('0.35'), 9850000),
        ]
        for lvl, min_inc, max_inc, rate, quick in brackets_data:
            TaxBracket.objects.update_or_create(
                bracket_level=lvl,
                defaults={
                    'min_income': min_inc,
                    'max_income': max_inc,
                    'tax_rate': rate,
                    'quick_subtraction': quick,
                }
            )
        self.stdout.write("1. Updated 7 TaxBrackets.")

        # 2. Ty le BHXH
        SalaryDeductionRate.objects.get_or_create(
            name="Quy dinh BHXH Viet Nam 2024-2026",
            defaults={
                'bhxh_employee_rate': Decimal('0.0800'),
                'bhyt_employee_rate': Decimal('0.0150'),
                'bhtn_employee_rate': Decimal('0.0100'),
                'bhxh_employer_rate': Decimal('0.1750'),
                'bhyt_employer_rate': Decimal('0.0300'),
                'bhtn_employer_rate': Decimal('0.0100'),
                'union_employer_rate': Decimal('0.0200'),
                'is_active': True,
            }
        )
        self.stdout.write("2. Updated Insurance Rates (Emp 10.5%, Empr 21.5%, Union 2%).")

        # 3. Chinh sach luong
        PayrollPolicyConfig.objects.get_or_create(
            defaults={
                'personal_relief': Decimal('11000000'),
                'dependent_relief': Decimal('4400000'),
                'standard_working_days': Decimal('26.0'),
                'max_insurance_salary': Decimal('46800000'),
                'is_active': True,
            }
        )
        self.stdout.write("3. Updated Policy Config (Personal: 11M, Dependent: 4.4M, Std days: 26).")

        # 4. Thong tin phap ly & Hop dong
        bank_pool = [
            ("0071001234567", "Vietcombank", "CN Nam Sai Gon"),
            ("1903678901234", "Techcombank", "CN Binh Duong"),
            ("03456789012", "MBBank", "CN Sai Gon"),
            ("6221000123456", "BIDV", "CN Thu Duc"),
        ]
        
        employees = Employee.objects.all()
        for idx, emp in enumerate(employees):
            updated_fields = []
            if not emp.national_id:
                emp.national_id = f"079{180 + idx:03d}00{idx + 1:04d}"
                emp.national_id_date = date(2021, 5, 10)
                emp.national_id_place = "Cuc Canh sat QLHC ve TTXH"
                updated_fields.extend(['national_id', 'national_id_date', 'national_id_place'])
            if not emp.bank_account:
                b_acc, b_name, b_branch = bank_pool[idx % len(bank_pool)]
                emp.bank_account = b_acc
                emp.bank_name = b_name
                emp.bank_branch = b_branch
                emp.bank_beneficiary = emp.full_name.upper()
                updated_fields.extend(['bank_account', 'bank_name', 'bank_branch', 'bank_beneficiary'])
            if not emp.tax_id:
                emp.tax_id = f"80{idx + 1:08d}"
                updated_fields.append('tax_id')
            if not emp.insurance_number:
                emp.insurance_number = f"79{idx + 1:08d}"
                updated_fields.append('insurance_number')
            if not emp.join_date:
                emp.join_date = date(2023, 1, 15)
                updated_fields.append('join_date')
            if not emp.insurance_salary or emp.insurance_salary == 0:
                emp.insurance_salary = Decimal('5000000')
                updated_fields.append('insurance_salary')
            
            if updated_fields:
                emp.save(update_fields=updated_fields)

            # Khoi tao Hop dong lao dong neu chua co
            if not emp.contracts.exists():
                contract_num = f"HDLD-{emp.code}-2024"
                LaborContract.objects.create(
                    contract_number=contract_num,
                    employee=emp,
                    contract_type=ContractType.DEFINITE_TERM,
                    status=ContractStatus.ACTIVE,
                    sign_date=emp.join_date or date(2023, 1, 15),
                    start_date=emp.join_date or date(2023, 1, 15),
                    end_date=date(2026, 12, 31),
                    job_title=emp.get_role_display(),
                    base_salary=emp.base_salary,
                    insurance_salary=emp.insurance_salary,
                    allowance_notes="Phu cap chuyen xe va nang suat"
                )

        self.stdout.write(f"4. Synced legal info and contracts for {employees.count()} employees.")
        self.stdout.write("SUCCESS: Seeded HRM & Payroll Master Data successfully.")
