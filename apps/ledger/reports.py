"""Báo cáo sổ sách từ sổ cái: Bảng cân đối tài khoản / số phát sinh, Sổ nhật ký chung, Sổ cái tài khoản.

Mẫu biểu theo chế độ kế toán của công ty:
- TT133/2016: Bảng cân đối tài khoản mẫu F01-DNN; Sổ Nhật ký chung S03a-DNN; Sổ cái S03b-DNN.
- TT200/2014: Bảng cân đối số phát sinh mẫu S06-DN; Sổ Nhật ký chung S03a-DN; Sổ cái S03b-DN.
- TT99/2025 (thay TT200): giữ tên/ký hiệu các sổ như TT200, ghi theo TT99; cần đối chiếu mẫu ban hành kèm TT99 khi in nộp.
- TT58/2026 (siêu nhỏ): ghi sổ theo mẫu S1..S3b-DNSN, hệ thống chỉ xuất sổ kép dạng tham khảo, không đánh số mẫu.
"""
import io
from collections import defaultdict
from decimal import Decimal

from django.db.models import Q, Sum

from .models import Account, JournalLine
from .charts import DEFAULT_REGIME
from .posting import ensure_chart

ZERO = Decimal('0')

_TT99_REF = 'Thông tư số 99/2025/TT-BTC ngày 27/10/2025 của Bộ Tài chính'
_TT58_REF = 'Thông tư số 58/2026/TT-BTC ngày 25/5/2026 của Bộ Tài chính'

FORMS = {
    'TT99': {
        'trial_balance': ('S06-DN', 'BẢNG CÂN ĐỐI SỐ PHÁT SINH', _TT99_REF),
        'journal': ('S03a-DN', 'SỔ NHẬT KÝ CHUNG', _TT99_REF),
        'account_ledger': ('S03b-DN', 'SỔ CÁI', _TT99_REF),
    },
    'TT58': {
        'trial_balance': ('', 'BẢNG CÂN ĐỐI SỐ PHÁT SINH', _TT58_REF),
        'journal': ('', 'SỔ NHẬT KÝ CHUNG', _TT58_REF),
        'account_ledger': ('', 'SỔ CÁI', _TT58_REF),
    },
    'TT133': {
        'trial_balance': ('F01-DNN', 'BẢNG CÂN ĐỐI TÀI KHOẢN', 'Thông tư số 133/2016/TT-BTC ngày 26/8/2016 của Bộ Tài chính'),
        'journal': ('S03a-DNN', 'SỔ NHẬT KÝ CHUNG', 'Thông tư số 133/2016/TT-BTC ngày 26/8/2016 của Bộ Tài chính'),
        'account_ledger': ('S03b-DNN', 'SỔ CÁI', 'Thông tư số 133/2016/TT-BTC ngày 26/8/2016 của Bộ Tài chính'),
    },
    'TT200': {
        'trial_balance': ('S06-DN', 'BẢNG CÂN ĐỐI SỐ PHÁT SINH', 'Thông tư số 200/2014/TT-BTC ngày 22/12/2014 của Bộ Tài chính'),
        'journal': ('S03a-DN', 'SỔ NHẬT KÝ CHUNG', 'Thông tư số 200/2014/TT-BTC ngày 22/12/2014 của Bộ Tài chính'),
        'account_ledger': ('S03b-DN', 'SỔ CÁI', 'Thông tư số 200/2014/TT-BTC ngày 22/12/2014 của Bộ Tài chính'),
    },
}


def _opening_from_master(company, date_from):
    """Số dư đầu kỳ nhập ở Danh mục số dư đầu kỳ (OpeningBalance) có ngày chốt trước kỳ báo cáo."""
    from apps.master_data.models import OpeningBalance

    result = defaultdict(lambda: ZERO)
    qs = OpeningBalance.objects.filter(company=company, opening_date__lte=date_from)
    for ob in qs:
        debit, credit = Decimal(ob.debit_amount or 0), Decimal(ob.credit_amount or 0)
        if not debit and not credit and ob.amount:
            debit, credit = (Decimal(ob.amount), ZERO) if ob.is_debit else (ZERO, Decimal(ob.amount))
        result[ob.account_code.strip()] += debit - credit
    return result


def _split(net):
    return (net, ZERO) if net >= 0 else (ZERO, -net)


def trial_balance(company, date_from, date_to):
    """Trả về {'rows': [...], 'totals': {...}}. Mỗi dòng có số dư đầu kỳ, phát sinh, số dư cuối kỳ (Nợ/Có)."""
    accounts = ensure_chart(company)
    opening = _opening_from_master(company, date_from)
    for code in opening:
        if code not in accounts:
            accounts[code] = Account.objects.create(company=company, code=code, name=f'Tài khoản {code}', account_type='A')
    base = JournalLine.objects.filter(entry__company=company)
    before = base.filter(entry__entry_date__lt=date_from).values('account__code').annotate(d=Sum('debit'), c=Sum('credit'))
    during = base.filter(entry__entry_date__gte=date_from, entry__entry_date__lte=date_to) \
        .values('account__code').annotate(d=Sum('debit'), c=Sum('credit'))
    open_net = defaultdict(lambda: ZERO, opening)
    for r in before:
        open_net[r['account__code']] += (r['d'] or ZERO) - (r['c'] or ZERO)
    period = {r['account__code']: (r['d'] or ZERO, r['c'] or ZERO) for r in during}

    leaf = {}
    for code in accounts:
        pd, pc = period.get(code, (ZERO, ZERO))
        if open_net.get(code, ZERO) or pd or pc:
            leaf[code] = (open_net.get(code, ZERO), pd, pc)

    # Cộng dồn lên tài khoản cấp 1 (3 chữ số) để trình bày theo mẫu
    agg = defaultdict(lambda: [ZERO, ZERO, ZERO])
    for code, (on, pd, pc) in leaf.items():
        for key in {code, code[:3]}:
            agg[key][0] += on
            agg[key][1] += pd
            agg[key][2] += pc
    rows = []
    totals = dict(opening_debit=ZERO, opening_credit=ZERO, period_debit=ZERO, period_credit=ZERO,
                  closing_debit=ZERO, closing_credit=ZERO)
    for code in sorted(agg):
        on, pd, pc = agg[code]
        od, oc = _split(on)
        cd, cc = _split(on + pd - pc)
        level = 1 if len(code) == 3 else 2
        account = accounts.get(code)
        rows.append(dict(code=code, name=account.name if account else code, level=level,
                         opening_debit=od, opening_credit=oc, period_debit=pd, period_credit=pc,
                         closing_debit=cd, closing_credit=cc))
        if level == 1:
            for k, v in (('opening_debit', od), ('opening_credit', oc), ('period_debit', pd),
                         ('period_credit', pc), ('closing_debit', cd), ('closing_credit', cc)):
                totals[k] += v
    return {'rows': rows, 'totals': totals}


def general_journal(company, date_from, date_to):
    lines = JournalLine.objects.filter(entry__company=company, entry__entry_date__gte=date_from, entry__entry_date__lte=date_to) \
        .select_related('entry', 'account', 'partner', 'employee').order_by('entry__entry_date', 'entry_id', 'id')
    return [dict(date=ln.entry.entry_date, ref=ln.entry.source_ref or ln.entry.code, description=ln.entry.description,
                 memo=ln.memo, account=ln.account.code, debit=ln.debit, credit=ln.credit,
                 partner=(ln.partner.name if ln.partner else (ln.employee.full_name if ln.employee else '')))
            for ln in lines]


def account_ledger(company, account_code, date_from, date_to):
    """Sổ cái một tài khoản (gồm cả tài khoản chi tiết): số dư đầu, từng dòng phát sinh kèm tài khoản đối ứng."""
    match = Q(account__code__startswith=account_code)
    base = JournalLine.objects.filter(match, entry__company=company)
    agg = base.filter(entry__entry_date__lt=date_from).aggregate(d=Sum('debit'), c=Sum('credit'))
    opening = sum((v for k, v in _opening_from_master(company, date_from).items() if k.startswith(account_code)), ZERO)
    opening += (agg['d'] or ZERO) - (agg['c'] or ZERO)
    rows, running = [], opening
    for ln in base.filter(entry__entry_date__gte=date_from, entry__entry_date__lte=date_to) \
            .select_related('entry').order_by('entry__entry_date', 'entry_id', 'id'):
        contra = sorted({o.account.code for o in ln.entry.lines.select_related('account')
                         if not o.account.code.startswith(account_code) and ((o.debit > 0) != (ln.debit > 0))})
        running += ln.debit - ln.credit
        rows.append(dict(date=ln.entry.entry_date, ref=ln.entry.source_ref or ln.entry.code, description=ln.memo or ln.entry.description,
                         contra=', '.join(contra), debit=ln.debit, credit=ln.credit, balance=running))
    return {'opening': opening, 'rows': rows, 'closing': running}


# ---------------------------------------------------------------- Excel

def _company_header(company):
    from apps.master_data.models import CompanyProfile

    profile = CompanyProfile.objects.filter(company=company).first() or CompanyProfile.objects.first()
    name = (profile.company_name if profile else '') or company.name
    address = profile.address if profile else ''
    tax = (profile.tax_code if profile else '') or company.tax_code
    return name, address, tax


def _sheet_header(ws, company, kind, date_from, date_to, ncols):
    from openpyxl.styles import Alignment, Font

    ws.page_setup.orientation = 'landscape'
    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    regime = company.accounting_regime or DEFAULT_REGIME
    form, title, circular = FORMS[regime][kind]
    name, address, tax = _company_header(company)
    last = ws.cell(row=1, column=ncols).column_letter
    ws['A1'] = f'Đơn vị: {name}'
    ws['A2'] = f'Địa chỉ: {address}'
    ws['A3'] = f'Mã số thuế: {tax}'
    for r in (1, 2, 3):
        ws.cell(row=r, column=1).font = Font(bold=(r == 1))
    mid = max(ncols - 3, 1)
    if form:
        ws.cell(row=1, column=mid, value=f'Mẫu số {form}').font = Font(bold=True)
    ws.cell(row=2, column=mid, value=f'(Theo {circular})').font = Font(italic=True, size=9)
    ws.merge_cells(f'A5:{last}5')
    ws['A5'] = title
    ws['A5'].font = Font(bold=True, size=14)
    ws['A5'].alignment = Alignment(horizontal='center')
    ws.merge_cells(f'A6:{last}6')
    ws['A6'] = f'Từ ngày {date_from:%d/%m/%Y} đến ngày {date_to:%d/%m/%Y}'
    ws['A6'].alignment = Alignment(horizontal='center')
    ws.merge_cells(f'A7:{last}7')
    ws['A7'] = 'Đơn vị tính: Đồng'
    ws['A7'].alignment = Alignment(horizontal='right')
    ws['A7'].font = Font(italic=True)
    return 9


def _signatures(ws, row, ncols):
    from openpyxl.styles import Alignment, Font

    row += 2
    cols = [2, max(3, ncols // 2 + 1), ncols - 1]
    for col, (title, hint) in zip(cols, [('Người lập biểu', '(Ký, họ tên)'), ('Kế toán trưởng', '(Ký, họ tên)'),
                                         ('Người đại diện theo pháp luật', '(Ký, họ tên, đóng dấu)')]):
        ws.cell(row=row, column=col, value=title).font = Font(bold=True)
        ws.cell(row=row + 1, column=col, value=hint).font = Font(italic=True, size=9)
        for r in (row, row + 1):
            ws.cell(row=r, column=col).alignment = Alignment(horizontal='center')


def _table(ws, start_row, headers, rows, widths, money_cols):
    from openpyxl.styles import Alignment, Border, Font, PatternFill, Side

    thin = Side(style='thin', color='999999')
    border = Border(left=thin, right=thin, top=thin, bottom=thin)
    fill = PatternFill('solid', fgColor='E8EEF7')
    r = start_row
    for header_row in headers:
        for c, value in enumerate(header_row, 1):
            cell = ws.cell(row=r, column=c, value=value)
            cell.font = Font(bold=True)
            cell.fill = fill
            cell.border = border
            cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        r += 1
    for row in rows:
        bold = row.pop('_bold', False)
        for c, value in enumerate(row['values'], 1):
            cell = ws.cell(row=r, column=c, value=value)
            cell.border = border
            if c in money_cols:
                cell.number_format = '#,##0;(#,##0);""'
            if bold:
                cell.font = Font(bold=True)
        r += 1
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[ws.cell(row=1, column=i).column_letter].width = w
    return r


def trial_balance_xlsx(company, date_from, date_to):
    from openpyxl import Workbook

    data = trial_balance(company, date_from, date_to)
    wb = Workbook()
    ws = wb.active
    ws.title = 'Can doi tai khoan'
    row = _sheet_header(ws, company, 'trial_balance', date_from, date_to, 8)
    headers = [
        ['Số hiệu tài khoản', 'Tên tài khoản', 'Số dư đầu kỳ', '', 'Số phát sinh trong kỳ', '', 'Số dư cuối kỳ', ''],
        ['', '', 'Nợ', 'Có', 'Nợ', 'Có', 'Nợ', 'Có'],
        ['A', 'B', '1', '2', '3', '4', '5', '6'],
    ]
    body = [{'values': [r['code'], r['name'], r['opening_debit'], r['opening_credit'], r['period_debit'], r['period_credit'],
                        r['closing_debit'], r['closing_credit']], '_bold': r['level'] == 1} for r in data['rows']]
    t = data['totals']
    body.append({'values': ['', 'Tổng cộng', t['opening_debit'], t['opening_credit'], t['period_debit'], t['period_credit'],
                            t['closing_debit'], t['closing_credit']], '_bold': True})
    end = _table(ws, row, headers, body, [12, 44, 16, 16, 16, 16, 16, 16], {3, 4, 5, 6, 7, 8})
    for rng in (f'A{row}:A{row + 1}', f'B{row}:B{row + 1}', f'C{row}:D{row}', f'E{row}:F{row}', f'G{row}:H{row}'):
        ws.merge_cells(rng)
    _signatures(ws, end, 8)
    return _save(wb)


def general_journal_xlsx(company, date_from, date_to):
    from openpyxl import Workbook

    lines = general_journal(company, date_from, date_to)
    wb = Workbook()
    ws = wb.active
    ws.title = 'Nhat ky chung'
    row = _sheet_header(ws, company, 'journal', date_from, date_to, 8)
    headers = [['Ngày ghi sổ', 'Số hiệu chứng từ', 'Diễn giải', 'Đối tượng', 'Số hiệu TK', 'Số phát sinh Nợ', 'Số phát sinh Có', 'Ghi chú']]
    body = [{'values': [ln['date'].strftime('%d/%m/%Y'), ln['ref'], ln['memo'] or ln['description'], ln['partner'], ln['account'],
                        ln['debit'], ln['credit'], '']} for ln in lines]
    body.append({'values': ['', '', 'Cộng phát sinh', '', '', sum((ln['debit'] for ln in lines), ZERO),
                            sum((ln['credit'] for ln in lines), ZERO), ''], '_bold': True})
    end = _table(ws, row, headers, body, [12, 18, 46, 26, 10, 16, 16, 12], {6, 7})
    _signatures(ws, end, 8)
    return _save(wb)


def account_ledger_xlsx(company, account_code, date_from, date_to):
    from openpyxl import Workbook

    data = account_ledger(company, account_code, date_from, date_to)
    account = Account.objects.filter(company=company, code=account_code).first()
    wb = Workbook()
    ws = wb.active
    ws.title = f'So cai {account_code}'
    row = _sheet_header(ws, company, 'account_ledger', date_from, date_to, 7)
    ws.cell(row=row - 1, column=1, value=f'Tài khoản: {account_code} - {account.name if account else ""}')
    headers = [['Ngày ghi sổ', 'Số hiệu chứng từ', 'Diễn giải', 'TK đối ứng', 'Nợ', 'Có', 'Số dư']]
    body = [{'values': ['', '', 'Số dư đầu kỳ', '', '', '', data['opening']], '_bold': True}]
    body += [{'values': [r['date'].strftime('%d/%m/%Y'), r['ref'], r['description'], r['contra'], r['debit'], r['credit'], r['balance']]}
             for r in data['rows']]
    body.append({'values': ['', '', 'Cộng phát sinh', '', sum((r['debit'] for r in data['rows']), ZERO),
                            sum((r['credit'] for r in data['rows']), ZERO), ''], '_bold': True})
    body.append({'values': ['', '', 'Số dư cuối kỳ', '', '', '', data['closing']], '_bold': True})
    end = _table(ws, row, headers, body, [12, 18, 46, 14, 16, 16, 18], {5, 6, 7})
    _signatures(ws, end, 7)
    return _save(wb)


def _save(wb):
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
