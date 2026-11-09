"""Sổ cái kế toán kép: hệ thống tài khoản theo công ty, bút toán và dòng bút toán.

Bút toán được sinh tự động từ chứng từ nghiệp vụ (phiếu thu/chi, chuyến xe, chi phí chuyến, bảng lương, hoá đơn)
và luôn cân bằng Nợ = Có. Mỗi chứng từ nguồn ứng với tối đa một bút toán tự động (source_type + source_id),
nên có thể sinh lại bất cứ lúc nào mà không trùng lặp.
"""
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models

from core.models import CompanyOwnedModel, TimeStampedModel


class AccountType(models.TextChoices):
    ASSET = 'A', 'Tài sản'
    LIABILITY = 'L', 'Nợ phải trả'
    EQUITY = 'E', 'Vốn chủ sở hữu'
    REVENUE = 'R', 'Doanh thu, thu nhập'
    EXPENSE = 'X', 'Chi phí'
    RESULT = 'Z', 'Xác định kết quả'


class Account(CompanyOwnedModel, TimeStampedModel):
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=255)
    account_type = models.CharField(max_length=1, choices=AccountType.choices)
    parent = models.ForeignKey('self', on_delete=models.PROTECT, null=True, blank=True, related_name='children')
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['company_id', 'code']
        verbose_name = 'Tài khoản kế toán'
        verbose_name_plural = 'Hệ thống tài khoản'
        constraints = [models.UniqueConstraint(fields=['company', 'code'], name='uniq_ledger_account_company_code')]

    def __str__(self):
        return f"{self.code} - {self.name}"


class JournalEntry(CompanyOwnedModel, TimeStampedModel):
    code = models.CharField(max_length=30, db_index=True)
    entry_date = models.DateField(db_index=True)
    description = models.CharField(max_length=500, blank=True)
    source_type = models.CharField(max_length=40, blank=True, db_index=True,
                                   help_text='Loại chứng từ nguồn (cash, trip, trip_expense, invoice) hoặc trống nếu nhập tay')
    source_id = models.CharField(max_length=40, blank=True)
    source_ref = models.CharField(max_length=100, blank=True, help_text='Số chứng từ gốc để hiển thị (PT-..., mã chuyến...)')
    is_auto = models.BooleanField(default=True)

    class Meta:
        ordering = ['-entry_date', '-id']
        verbose_name = 'Bút toán'
        verbose_name_plural = 'Sổ nhật ký chung'
        constraints = [
            models.UniqueConstraint(fields=['company', 'source_type', 'source_id'],
                                    condition=~models.Q(source_type=''), name='uniq_ledger_entry_source'),
        ]
        indexes = [models.Index(fields=['company', 'entry_date'])]

    def __str__(self):
        return f"{self.code} {self.entry_date} {self.description[:40]}"

    def totals(self):
        agg = self.lines.aggregate(d=models.Sum('debit'), c=models.Sum('credit'))
        return agg['d'] or Decimal('0'), agg['c'] or Decimal('0')

    def check_balanced(self):
        debit, credit = self.totals()
        if debit != credit:
            raise ValidationError(f'Bút toán {self.code} không cân: Nợ {debit} ≠ Có {credit}')


class JournalLine(models.Model):
    entry = models.ForeignKey(JournalEntry, on_delete=models.CASCADE, related_name='lines')
    account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name='lines')
    debit = models.DecimalField(max_digits=16, decimal_places=0, default=0)
    credit = models.DecimalField(max_digits=16, decimal_places=0, default=0)
    partner = models.ForeignKey('master_data.Party', on_delete=models.SET_NULL, null=True, blank=True, related_name='journal_lines')
    employee = models.ForeignKey('personnel.Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='journal_lines')
    trip = models.ForeignKey('dispatch.DispatchTrip', on_delete=models.SET_NULL, null=True, blank=True, related_name='journal_lines')
    memo = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['entry_id', 'id']
        verbose_name = 'Dòng bút toán'
        verbose_name_plural = 'Dòng bút toán'
        constraints = [
            models.CheckConstraint(condition=models.Q(debit__gte=0) & models.Q(credit__gte=0), name='ledger_line_non_negative'),
            models.CheckConstraint(condition=~(models.Q(debit__gt=0) & models.Q(credit__gt=0)), name='ledger_line_one_side'),
        ]
