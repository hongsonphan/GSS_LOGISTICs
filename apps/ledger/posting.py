"""Quy tắc hạch toán tự động: chứng từ nghiệp vụ -> bút toán kép.

Mỗi hàm build_* trả về (ngày, diễn giải, số chứng từ, [dòng]) hoặc None khi chứng từ chưa đủ điều kiện ghi sổ.
Dòng: dict(key|code, debit|credit, partner, employee, trip, memo). `key` là khoá nghiệp vụ trong charts.ACCOUNT_MAP
(tự đổi theo chế độ kế toán TT99/TT58 hoặc TT133/TT200 cũ và ghi đè của công ty); `code` là số hiệu tài khoản cố định.

post_source() ghi đè bút toán cũ của cùng chứng từ nên gọi lại bao nhiêu lần cũng cho cùng kết quả.
"""
import logging
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from . import charts

logger = logging.getLogger(__name__)
ZERO = Decimal('0')


def _d(value):
    return Decimal(value or 0).quantize(Decimal('1'))


def _date(value):
    if value is None:
        return timezone.localdate()
    if hasattr(value, 'hour'):
        return timezone.localtime(value).date() if timezone.is_aware(value) else value.date()
    return value


# ---------------------------------------------------------------- tài khoản

def ensure_chart(company):
    """Tạo hệ thống tài khoản cho công ty theo chế độ kế toán (bỏ qua tài khoản đã có)."""
    from .models import Account

    regime = company.accounting_regime or charts.DEFAULT_REGIME
    existing = {a.code: a for a in Account.objects.filter(company=company)}
    for code, name, kind in sorted(charts.CHARTS[regime], key=lambda r: r[0]):
        if code in existing:
            continue
        parent = None
        for i in range(len(code) - 1, 2, -1):
            parent = existing.get(code[:i])
            if parent:
                break
        existing[code] = Account.objects.create(company=company, code=code, name=name, account_type=kind, parent=parent)
    return existing


class _Accounts:
    def __init__(self, company):
        self.company = company
        self.by_code = ensure_chart(company)

    def get(self, code):
        from .models import Account

        account = self.by_code.get(code)
        if account is None:
            parent = next((self.by_code[code[:i]] for i in range(len(code) - 1, 2, -1) if code[:i] in self.by_code), None)
            account = Account.objects.create(
                company=self.company, code=code, name=f'Tài khoản {code}',
                account_type=(parent.account_type if parent else 'A'), parent=parent)
            self.by_code[code] = account
        return account


# ---------------------------------------------------------------- đối tượng

def _partner_of_customer(customer):
    return getattr(customer, 'partner', None) if customer else None


def _partner_of_sub(sub):
    return getattr(sub, 'partner', None) if sub else None


def _partner_by_name(company, partner_type, name):
    if not name:
        return None, None
    from apps.customers.models import Customer
    from apps.master_data.models import Subcontractor
    from apps.personnel.models import Employee

    if partner_type == 'CUSTOMER':
        c = Customer.objects.filter(name__iexact=name).select_related('partner').first()
        return _partner_of_customer(c), None
    if partner_type == 'SUBCONTRACTOR':
        s = Subcontractor.objects.filter(name__iexact=name).select_related('partner').first()
        return _partner_of_sub(s), None
    if partner_type in ('DRIVER', 'DISPATCHER'):
        return None, Employee.objects.filter(full_name__iexact=name).first()
    return None, None


# ---------------------------------------------------------------- quy tắc

CASH_RULES = {
    # INFLOW: Nợ tiền / Có ...
    'FREIGHT_REVENUE': 'receivable',
    'REIMBURSABLE_COLLECTION': 'other_receivable',
    'ADVANCE_REFUND': 'advance',
    'OTHER_INFLOW': 'other_income',
    # OUTFLOW: Nợ ... / Có tiền
    'DISPATCHER_FUND_ADVANCE': 'advance',
    'DRIVER_TRIP_ADVANCE': 'advance',
    'ADVANCE_REIMBURSE': 'advance',
    'SUBCONTRACTOR_PAYMENT': 'payable',
    'FUEL_PAYMENT': 'fuel',
    'ETC_TOPUP': 'toll',
    'VEHICLE_MAINTENANCE': 'maintenance',
    'PAYROLL_SALARY': 'salary',
    'OTHER_OUTFLOW': 'admin_other',
}


def build_cash(tx):
    if tx.is_deleted or _d(tx.amount) <= 0:
        return None
    amount = _d(tx.amount)
    money = 'cash' if tx.payment_method == 'CASH' else 'bank'
    counter = CASH_RULES.get(tx.category, 'other_income' if tx.transaction_type == 'INFLOW' else 'admin_other')
    partner, employee = _partner_by_name(tx.company, tx.partner_type, tx.partner_name)
    trip = None
    if tx.ref_code:
        from apps.dispatch.models import DispatchTrip
        trip = DispatchTrip.objects.filter(trip_code=tx.ref_code).first()
    memo = (tx.notes or tx.get_category_display())[:255]
    common = dict(partner=partner, employee=employee, trip=trip, memo=memo)
    if tx.transaction_type == 'INFLOW':
        lines = [dict(key=money, debit=amount, memo=memo), dict(key=counter, credit=amount, **common)]
    else:
        lines = [dict(key=counter, debit=amount, **common), dict(key=money, credit=amount, memo=memo)]
    return tx.transaction_date, f'{tx.get_transaction_type_display()}: {memo}'[:500], tx.code, lines


def build_trip(trip):
    """Doanh thu chuyến (Nợ 131 / Có 5113) và cước thuê thầu phụ (Nợ 632 / Có 331) khi chuyến hoàn tất."""
    if trip.is_deleted or trip.status != 'COMPLETED':
        return None
    when = _date(trip.actual_end_time or trip.actual_dropoff_at or trip.loading_date or trip.updated_at)
    customer_partner = _partner_of_customer(trip.customer)
    lines = []
    revenue = _d(trip.cached_revenue)
    if revenue > 0:
        lines += [dict(key='receivable', debit=revenue, partner=customer_partner, trip=trip, memo='Doanh thu cước'),
                  dict(key='revenue', credit=revenue, partner=customer_partner, trip=trip, memo='Doanh thu cước')]
    sub_cost = _d(trip.subcontractor_cost)
    if trip.subcontractor_id and sub_cost > 0:
        sub_partner = _partner_of_sub(trip.subcontractor)
        lines += [dict(key='cogs', debit=sub_cost, partner=sub_partner, trip=trip, memo='Cước thuê thầu phụ'),
                  dict(key='payable', credit=sub_cost, partner=sub_partner, trip=trip, memo='Cước thuê thầu phụ')]
    if not lines:
        return None
    return when, f'Hoàn tất chuyến {trip.trip_code}', trip.trip_code, lines


_EXPENSE_KEY = {'TOLL_FEE': 'toll', 'BOT_TOLL': 'toll', 'REPAIR_TIRE': 'maintenance'}


def build_trip_expense(exp):
    """Chi phí chuyến đã duyệt: tài xế chi từ tạm ứng (Có 141) hoặc thầu phụ chi hộ (Có 331)."""
    if exp.is_deleted or exp.status not in ('APPROVED', 'SETTLED') or _d(exp.amount) <= 0:
        return None
    trip = exp.trip
    amount = _d(exp.amount)
    memo = (exp.notes or exp.get_category_display())[:255]
    customer_partner = _partner_of_customer(getattr(trip, 'customer', None))
    if exp.expense_payer_type == 'SUB_OBH':
        credit = dict(key='payable', credit=amount, partner=_partner_of_sub(getattr(trip, 'subcontractor', None)), trip=trip, memo=memo)
    else:
        credit = dict(key='advance', credit=amount, employee=exp.driver, trip=trip, memo=memo)
    on_behalf = exp.is_on_behalf_of_customer or exp.expense_payer_type in ('TVL_OBH', 'SUB_OBH')
    if on_behalf:
        debits = [dict(key='other_receivable', debit=amount, partner=customer_partner, trip=trip, memo=f'Chi hộ khách: {memo}')]
    elif not exp.company_borne:
        debits = [dict(key='other_receivable', debit=amount, employee=exp.driver, trip=trip, memo=f'Tài xế chịu: {memo}')]
    else:
        tax = _d(exp.tax_amount)
        tax = tax if ZERO < tax < amount else ZERO
        debits = [dict(key=_EXPENSE_KEY.get(exp.category, 'cogs'), debit=amount - tax, trip=trip, memo=memo)]
        if tax:
            debits.append(dict(key='vat_in', debit=tax, trip=trip, memo=f'VAT {exp.invoice_number or ""}'.strip()))
    when = _date(exp.approved_at or exp.created_at)
    return when, f'Chi phí chuyến {trip.trip_code}: {memo}'[:500], f'{trip.trip_code}/CP{exp.pk}', debits + [credit]


# Tỷ lệ phân bổ bảo hiểm phía doanh nghiệp (17,5% BHXH, 3% BHYT, 1% BHTN trên tổng 21,5%)
_EMPLOYER_SPLIT = (('social_ins', Decimal('17.5')), ('health_ins', Decimal('3')), ('unemployment_ins', Decimal('1')))


def build_payroll(period):
    """Bảng lương đã chốt: ghi nhận chi phí lương, các khoản trích theo lương và khấu trừ."""
    if period.is_deleted or period.status not in ('LOCKED', 'PAID'):
        return None
    lines = []
    for slip in period.slips.filter(is_deleted=False).select_related('employee'):
        emp = slip.employee
        expense_key = 'driver_salary' if emp.role == 'DRIVER' else 'admin_salary'
        name = emp.full_name
        gross = _d(slip.gross_income)
        if gross > 0:
            lines += [dict(key=expense_key, debit=gross, employee=emp, memo=f'Lương {name}'),
                      dict(key='salary', credit=gross, employee=emp, memo=f'Lương {name}')]
        for key, amount, label in (
            ('social_ins', slip.bhxh_employee, 'BHXH NLĐ'), ('health_ins', slip.bhyt_employee, 'BHYT NLĐ'),
            ('unemployment_ins', slip.bhtn_employee, 'BHTN NLĐ'), ('union', slip.union_fee_employee, 'Đoàn phí'),
            ('pit', slip.pit_amount, 'Thuế TNCN'), ('advance', slip.advance_deductions, 'Trừ tạm ứng'),
            ('other_income', slip.other_deductions, 'Khấu trừ khác'),
        ):
            amount = _d(amount)
            if amount > 0:
                lines += [dict(key='salary', debit=amount, employee=emp, memo=f'{label} {name}'),
                          dict(key=key, credit=amount, employee=emp, memo=f'{label} {name}')]
        employer = _d(slip.total_insurance_employer)
        if employer > 0:
            total_rate = sum(r for _k, r in _EMPLOYER_SPLIT)
            allocated = ZERO
            for i, (key, rate) in enumerate(_EMPLOYER_SPLIT):
                part = employer - allocated if i == len(_EMPLOYER_SPLIT) - 1 else (employer * rate / total_rate).quantize(Decimal('1'))
                allocated += part
                if part > 0:
                    lines += [dict(key=expense_key, debit=part, employee=emp, memo=f'BH DN đóng {name}'),
                              dict(key=key, credit=part, employee=emp, memo=f'BH DN đóng {name}')]
        union_er = _d(slip.union_fee_employer)
        if union_er > 0:
            lines += [dict(key=expense_key, debit=union_er, employee=emp, memo=f'KPCĐ {name}'),
                      dict(key='union', credit=union_er, employee=emp, memo=f'KPCĐ {name}')]
    if not lines:
        return None
    return period.to_date, f'Hạch toán {period.name}'[:500], period.period_code, lines


def build_invoice(inv):
    """Hoá đơn cước đã phát hành: ghi nhận thuế GTGT đầu ra (doanh thu đã ghi theo từng chuyến)."""
    if inv.is_deleted or inv.status in ('DRAFT', 'CANCELLED'):
        return None
    vat = _d(inv.vat_amount)
    if vat <= 0:
        return None
    partner = _partner_of_customer(inv.customer)
    lines = [dict(key='receivable', debit=vat, partner=partner, memo='Thuế GTGT đầu ra'),
             dict(key='vat_out', credit=vat, partner=partner, memo='Thuế GTGT đầu ra')]
    return inv.issue_date, f'Hoá đơn {inv.code}', inv.code, lines


def build_settlement(v):
    """Phiếu quyết toán đã duyệt / đã quyết toán: ghi nhận phần PHÁT SINH kế toán nhập trên bảng kê đối soát.

    Cước, chi hộ và chi phí đã có chứng từ riêng (chuyến, khoản chi) nên không ghi lại; chỉ ghi phần chênh lệch do đối soát:
    - Khách hàng: phụ phí / điều chỉnh tăng (giảm) doanh thu và công nợ phải thu (Nợ 131 / Có 5113).
    - Tài xế: chi phí phát sinh được duyệt làm tăng (giảm) chi phí và trừ vào tạm ứng (Nợ 632 / Có 141).
    - Đối tác 3PL: phụ phí / khấu trừ làm tăng (giảm) giá vốn và công nợ phải trả (Nợ 632 / Có 331).
    """
    if v.is_deleted or v.status not in ('APPROVED', 'SETTLED'):
        return None
    adjustment = sum(int(line.get('adjustment') or 0) for line in (v.lines or []))
    if adjustment == 0:
        return None
    amount = _d(abs(adjustment))
    increase = adjustment > 0
    company = _company_of(v)
    memo = f'Phát sinh đối soát {v.code}'[:255]
    if v.party_type == 'CUSTOMER':
        partner, _employee = _partner_by_name(company, 'CUSTOMER', v.party_name)
        debit, credit = dict(key='receivable', partner=partner), dict(key='revenue', partner=partner)
    elif v.party_type == 'DRIVER':
        from apps.personnel.models import Employee
        employee = Employee.objects.filter(pk=v.party_ref).first() if str(v.party_ref).isdigit() else None
        debit, credit = dict(key='cogs'), dict(key='advance', employee=employee)
    else:
        from apps.master_data.models import Subcontractor
        sub = Subcontractor.objects.filter(pk=v.party_ref).select_related('partner').first() if str(v.party_ref).isdigit() else None
        partner = _partner_of_sub(sub)
        debit, credit = dict(key='cogs'), dict(key='payable', partner=partner)
    if increase:
        lines = [dict(debit, debit=amount, memo=memo), dict(credit, credit=amount, memo=memo)]
    else:
        # điều chỉnh giảm: đảo bút toán
        lines = [dict(credit, debit=amount, memo=memo), dict(debit, credit=amount, memo=memo)]
    when = _date(v.approved_at or v.created_at)
    return when, f'Phát sinh đối soát {v.code}'[:500], f'{v.code}/PS', lines


# ---------------------------------------------------------------- nguồn chứng từ

def _sources():
    from apps.billing.models import CashTransaction, CustomerInvoice, SettlementVoucher, TripExpense
    from apps.dispatch.models import DispatchTrip
    from apps.personnel.models import PayrollPeriod
    from apps.gss.models import Statement
    from apps.gss.statements import build_ledger as build_gss_statement

    return {
        'cash': (CashTransaction, build_cash),
        'trip': (DispatchTrip, build_trip),
        'trip_expense': (TripExpense, build_trip_expense),
        'payroll': (PayrollPeriod, build_payroll),
        'invoice': (CustomerInvoice, build_invoice),
        'settlement': (SettlementVoucher, build_settlement),
        'gss_statement': (Statement, build_gss_statement),
    }


def source_type_of(instance):
    for name, (model, _builder) in _sources().items():
        if isinstance(instance, model):
            return name
    return None


def _all_manager(model):
    return getattr(model, 'all_objects', model._default_manager)


def _company_of(instance):
    from core.models import get_default_company

    company = getattr(instance, 'company', None)
    return company or get_default_company()


@transaction.atomic
def post(source_type, instance, accounts=None):
    """Sinh (hoặc xoá) bút toán cho một chứng từ. Trả về JournalEntry hoặc None."""
    from .models import JournalEntry, JournalLine

    _model, builder = _sources()[source_type]
    company = _company_of(instance)
    existing = JournalEntry.objects.filter(company=company, source_type=source_type, source_id=str(instance.pk))
    result = builder(instance)
    if result is None:
        existing.delete()
        return None
    when, description, ref, lines = result
    accounts = accounts or _Accounts(company)
    entry = existing.first()
    if entry is None:
        entry = JournalEntry(company=company, source_type=source_type, source_id=str(instance.pk))
    entry.entry_date = when
    entry.description = description
    entry.source_ref = ref or ''
    entry.code = (ref or f'BT{instance.pk}')[:30]
    entry.is_auto = True
    entry.save()
    entry.lines.all().delete()
    objs = []
    for line in lines:
        code = line.get('code') or charts.resolve(company, line['key'])
        objs.append(JournalLine(
            entry=entry, account=accounts.get(code), debit=_d(line.get('debit')), credit=_d(line.get('credit')),
            partner=line.get('partner'), employee=line.get('employee'), trip=line.get('trip'), memo=line.get('memo', '')[:255]))
    JournalLine.objects.bulk_create(objs)
    entry.check_balanced()
    return entry


def remove(source_type, instance):
    from .models import JournalEntry

    JournalEntry.objects.filter(source_type=source_type, source_id=str(instance.pk)).delete()


def safe_post(source_type, pk):
    """Gọi từ signal sau khi giao dịch nghiệp vụ đã commit; lỗi sổ cái không bao giờ làm hỏng nghiệp vụ."""
    if not getattr(settings, 'LEDGER_AUTO_POST', True):
        return
    model, _builder = _sources()[source_type]
    try:
        instance = _all_manager(model).filter(pk=pk).first()
        if instance is None:
            from .models import JournalEntry
            JournalEntry.objects.filter(source_type=source_type, source_id=str(pk)).delete()
        else:
            post(source_type, instance)
    except Exception:  # pragma: no cover - chỉ ghi log
        logger.exception('Không ghi được sổ cái cho %s #%s', source_type, pk)


def rebuild(company=None, stdout=None):
    """Sinh lại toàn bộ bút toán tự động từ chứng từ nghiệp vụ. Trả về {loại: số bút toán}."""
    from core.models import Company

    from .models import JournalEntry

    companies = [company] if company else list(Company.objects.all())
    summary = {}
    for comp in companies:
        accounts = _Accounts(comp)
        for source_type, (model, _builder) in _sources().items():
            kept = set()
            count = 0
            qs = _all_manager(model).filter(company=comp)
            for instance in qs.iterator(chunk_size=500):
                entry = post(source_type, instance, accounts)
                if entry:
                    kept.add(entry.pk)
                    count += 1
            JournalEntry.objects.filter(company=comp, source_type=source_type).exclude(pk__in=kept).delete()
            summary[f'{comp.code}:{source_type}'] = count
            if stdout:
                stdout.write(f'{comp.code} {source_type}: {count} bút toán')
    return summary
