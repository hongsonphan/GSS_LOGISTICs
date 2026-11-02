"""API sổ sách kế toán (chỉ đọc): bảng cân đối tài khoản, nhật ký chung, sổ cái; xuất Excel theo mẫu của chế độ kế toán (TT99/TT58, TT133/TT200 cũ)."""
import datetime

from django.http import HttpResponse
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import CanUseLedger
from core.tenant import company_for_user

from . import charts, reports
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
    permission_classes = [CanUseLedger]

    def get(self, request):
        company = _company(request)
        reports.ensure_chart(company)
        accounts = Account.objects.filter(company=company).order_by('code')
        return Response({'regime': company.accounting_regime,
                         'accounts': [{'code': a.code, 'name': a.name, 'type': a.account_type} for a in accounts]})


class TrialBalanceAPIView(APIView):
    permission_classes = [CanUseLedger]

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
    permission_classes = [CanUseLedger]

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
    permission_classes = [CanUseLedger]

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


MAPPING_LABELS = {
    'cash': 'Tiền mặt', 'bank': 'Tiền gửi ngân hàng', 'receivable': 'Phải thu khách hàng',
    'vat_in': 'Thuế GTGT đầu vào', 'other_receivable': 'Phải thu khác (chi hộ)', 'advance': 'Tạm ứng',
    'payable': 'Phải trả nhà cung cấp / đối tác', 'vat_out': 'Thuế GTGT đầu ra', 'pit': 'Thuế TNCN',
    'salary': 'Phải trả người lao động', 'union': 'Kinh phí công đoàn', 'social_ins': 'Bảo hiểm xã hội',
    'health_ins': 'Bảo hiểm y tế', 'unemployment_ins': 'Bảo hiểm thất nghiệp', 'revenue': 'Doanh thu cước vận tải',
    'other_income': 'Thu nhập khác', 'cogs': 'Giá vốn (chi phí chuyến khác)', 'fuel': 'Chi phí nhiên liệu',
    'toll': 'Chi phí cầu đường / BOT', 'maintenance': 'Chi phí sửa chữa, bảo dưỡng', 'driver_salary': 'Lương tài xế',
    'admin_salary': 'Lương bộ phận quản lý', 'admin_other': 'Chi phí quản lý khác',
}


def _can_change_regime(user):
    from core import access
    return access.can(user, 'admin', 'edit')


def _prefixes(code, valid):
    return {code[:i] for i in range(3, len(code) + 1) if code[:i] in valid}


def _locked_accounts(company, regime, effective_codes, check_entries=True):
    """Tài khoản không được tắt: đang gán cho nghiệp vụ, đã có bút toán, và các tài khoản cha của chúng."""
    from .models import JournalLine
    valid = {c for c, _n, _k in charts.CHARTS[regime]}
    used = set(effective_codes)
    if check_entries:
        used |= set(JournalLine.objects.filter(entry__company=company, account__code__in=valid)
                    .values_list('account__code', flat=True).distinct())
    locked = set()
    for code in used:
        locked |= _prefixes(code, valid)
    return locked


def _active_accounts(company, regime, effective_codes, saved, check_entries=True):
    valid = {c for c, _n, _k in charts.CHARTS[regime]}
    locked = _locked_accounts(company, regime, effective_codes, check_entries)
    base = {c for c in (saved or []) if c in valid}
    if not base:
        base = {'911'} & valid
    active = base | locked
    # tài khoản con kích hoạt thì tài khoản cha cũng phải kích hoạt
    for c in list(active):
        active |= _prefixes(c, valid)
    return active, locked


def _mapping_payload(company, user, preview=None):
    """preview: chế độ kế toán muốn xem thử (chưa lưu) - hiện danh mục và ánh xạ mặc định của chế độ đó."""
    current = company.accounting_regime or charts.DEFAULT_REGIME
    regime = preview if preview in charts.REGIMES else current
    is_preview = regime != current
    names = {code: name for code, name, _k in charts.CHARTS[regime]}
    overrides = {} if is_preview else (company.ledger_account_overrides or {})
    items = []
    for key, default in charts.ACCOUNT_MAP[regime].items():
        effective = overrides.get(key) or default
        items.append({'key': key, 'label': MAPPING_LABELS.get(key, key), 'default': default,
                      'override': overrides.get(key) or '', 'effective': effective,
                      'effective_name': names.get(effective, '')})
    leaf_codes = [{'code': c, 'name': n} for c, n, _k in charts.CHARTS[regime]
                  if not any(o != c and o.startswith(c) for o, _n, _x in charts.CHARTS[regime])]
    effective_codes = [i['effective'] for i in items]
    saved = [] if is_preview else (company.ledger_active_accounts or [])
    active, locked = _active_accounts(company, regime, effective_codes, saved, check_entries=not is_preview)
    default_active, _ = _active_accounts(company, regime, list(charts.ACCOUNT_MAP[regime].values()), [], check_entries=not is_preview)
    # Chế độ cũ chỉ còn chọn được khi công ty đang dùng
    selectable = [r for r in charts.REGIMES if not charts.REGIME_INFO[r]['legacy'] or r == current]
    return {'regime': regime, 'current_regime': current, 'preview': is_preview, 'regimes': selectable,
            'regime_labels': {r: charts.REGIME_INFO[r]['label'] for r in charts.REGIMES},
            'can_change_regime': _can_change_regime(user),
            'items': items, 'accounts': leaf_codes,
            'active': sorted(active), 'locked': sorted(_locked_accounts(company, regime, [], check_entries=not is_preview)), 'default_active': sorted(default_active),
            'chart': [{'code': c, 'name': n, 'type': k} for c, n, k in sorted(charts.CHARTS[regime], key=lambda r: r[0])]}


class LedgerMappingAPIView(APIView):
    """Xem/sửa ánh xạ nghiệp vụ -> tài khoản của công ty (ghi đè mặc định theo chế độ kế toán)."""
    permission_classes = [CanUseLedger]

    def get(self, request):
        company = _company(request)
        return Response(_mapping_payload(company, request.user, request.query_params.get('regime')))

    def put(self, request):
        from django.db import transaction

        from .posting import rebuild
        company = _company(request)
        data = request.data if isinstance(request.data, dict) else {}
        regime = data.get('regime') or company.accounting_regime or charts.DEFAULT_REGIME
        if regime not in charts.REGIMES:
            raise ValidationError({'regime': 'Chế độ kế toán không hợp lệ'})
        if charts.REGIME_INFO[regime]['legacy'] and regime != company.accounting_regime:
            raise ValidationError({'regime': 'Chế độ kế toán cũ không còn áp dụng, chọn TT99 hoặc TT58'})
        if regime != company.accounting_regime and not _can_change_regime(request.user):
            raise ValidationError({'regime': 'Chỉ Ban Giám Đốc / quản trị được đổi chế độ kế toán'})
        raw = data.get('overrides') or {}
        if not isinstance(raw, dict):
            raise ValidationError({'overrides': 'Sai định dạng'})
        valid_codes = {c for c, _n, _k in charts.CHARTS[regime]}
        overrides, errors = {}, {}
        for key, code in raw.items():
            code = str(code or '').strip()
            if key not in charts.ACCOUNT_MAP[regime]:
                errors[key] = 'Nghiệp vụ không tồn tại'
            elif not code or code == charts.ACCOUNT_MAP[regime][key]:
                continue
            elif code not in valid_codes:
                errors[key] = f'Tài khoản {code} không có trong hệ thống tài khoản {regime}'
            else:
                overrides[key] = code
        if errors:
            raise ValidationError({'overrides': errors})
        # Tài khoản kích hoạt: chỉ cập nhật khi gửi lên; đổi chế độ thì quay về mặc định. Tài khoản đang dùng luôn được giữ.
        valid_all = {c for c, _n, _k in charts.CHARTS[regime]}
        if 'active_accounts' in data:
            raw_active = data.get('active_accounts') or []
            if not isinstance(raw_active, list):
                raise ValidationError({'active_accounts': 'Sai định dạng'})
            unknown = [c for c in raw_active if str(c) not in valid_all]
            if unknown:
                raise ValidationError({'active_accounts': f'Tài khoản không có trong hệ thống {regime}: {", ".join(map(str, unknown[:5]))}'})
            saved_active = [str(c) for c in raw_active]
        elif regime != company.accounting_regime:
            saved_active = []
        else:
            saved_active = list(company.ledger_active_accounts or [])
        effective_codes = [overrides.get(k) or d for k, d in charts.ACCOUNT_MAP[regime].items()]
        active, _locked = _active_accounts(company, regime, effective_codes, saved_active)
        saved_active = sorted(active) if saved_active else []
        with transaction.atomic():
            company.accounting_regime = regime
            company.ledger_account_overrides = overrides
            company.ledger_active_accounts = saved_active
            company.save(update_fields=['accounting_regime', 'ledger_account_overrides', 'ledger_active_accounts'])
            summary = rebuild(company) if data.get('rebuild', True) else {}
            Account.objects.filter(company=company).update(is_active=False)
            Account.objects.filter(company=company, code__in=active).update(is_active=True)
        payload = _mapping_payload(company, request.user)
        payload['rebuilt'] = sum(summary.values())
        return Response(payload)
