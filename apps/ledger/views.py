"""API sổ sách kế toán (chỉ đọc): bảng cân đối tài khoản, nhật ký chung, sổ cái; xuất Excel theo mẫu TT133/TT200."""
import datetime

from django.http import HttpResponse
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import CanViewFinancialReports
from core.tenant import company_for_user

from . import reports
from .models import Account

XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'


def _company(request):
    return company_for_user(request.user)


def _period(request):
    today = datetime.date.today()
    try:
        date_from = datetime.date.fromisoformat(request.query_params.get('from') or today.replace(day=1).isoformat())
        date_to = datetime.date.fromisoformat(request.query_params.get('to') or today.isoformat())
    except ValueError:
        raise ValidationError({'detail': 'Ngày không hợp lệ, dùng định dạng YYYY-MM-DD'})
    if date_from > date_to:
        raise ValidationError({'detail': 'Ngày bắt đầu phải trước ngày kết thúc'})
    return date_from, date_to


def _xlsx(content, name):
    response = HttpResponse(content, content_type=XLSX)
    response['Content-Disposition'] = f'attachment; filename="{name}"'
    return response


def _num(value):
    return int(value)


class LedgerAccountsAPIView(APIView):
    permission_classes = [CanViewFinancialReports]

    def get(self, request):
        company = _company(request)
        reports.ensure_chart(company)
        accounts = Account.objects.filter(company=company).order_by('code')
        return Response({'regime': company.accounting_regime,
                         'accounts': [{'code': a.code, 'name': a.name, 'type': a.account_type} for a in accounts]})


class TrialBalanceAPIView(APIView):
    permission_classes = [CanViewFinancialReports]

    def get(self, request):
        company = _company(request)
        date_from, date_to = _period(request)
        if request.query_params.get('export') == 'xlsx':
            return _xlsx(reports.trial_balance_xlsx(company, date_from, date_to),
                         f'can-doi-tai-khoan_{date_from:%Y%m%d}_{date_to:%Y%m%d}.xlsx')
        data = reports.trial_balance(company, date_from, date_to)
        rows = [{k: (_num(v) if k not in ('code', 'name', 'level') else v) for k, v in r.items()} for r in data['rows']]
        totals = {k: _num(v) for k, v in data['totals'].items()}
        form = reports.FORMS[company.accounting_regime]['trial_balance']
        return Response({'regime': company.accounting_regime, 'form': form[0], 'title': form[1],
                         'from': date_from, 'to': date_to, 'rows': rows, 'totals': totals})


class GeneralJournalAPIView(APIView):
    permission_classes = [CanViewFinancialReports]

    def get(self, request):
        company = _company(request)
        date_from, date_to = _period(request)
        if request.query_params.get('export') == 'xlsx':
            return _xlsx(reports.general_journal_xlsx(company, date_from, date_to),
                         f'nhat-ky-chung_{date_from:%Y%m%d}_{date_to:%Y%m%d}.xlsx')
        lines = reports.general_journal(company, date_from, date_to)
        return Response({'from': date_from, 'to': date_to,
                         'lines': [{**ln, 'debit': _num(ln['debit']), 'credit': _num(ln['credit'])} for ln in lines]})


class AccountLedgerAPIView(APIView):
    permission_classes = [CanViewFinancialReports]

    def get(self, request, code):
        company = _company(request)
        date_from, date_to = _period(request)
        if not code.isdigit():
            raise ValidationError({'detail': 'Số hiệu tài khoản không hợp lệ'})
        if request.query_params.get('export') == 'xlsx':
            return _xlsx(reports.account_ledger_xlsx(company, code, date_from, date_to),
                         f'so-cai-{code}_{date_from:%Y%m%d}_{date_to:%Y%m%d}.xlsx')
        data = reports.account_ledger(company, code, date_from, date_to)
        return Response({'account': code, 'from': date_from, 'to': date_to, 'opening': _num(data['opening']),
                         'closing': _num(data['closing']),
                         'rows': [{**r, 'debit': _num(r['debit']), 'credit': _num(r['credit']), 'balance': _num(r['balance'])}
                                  for r in data['rows']]})
