"""API trang Nhật ký hoạt động: ai đã tạo / sửa / xoá / duyệt phiếu nào, đăng nhập lúc nào.

Nguồn dữ liệu: core.models.AuditLog (ghi tự động bởi core/audit.py) và LoginEvent. Chỉ đọc, không có thao tác ghi / xoá.
Quyền: dòng 'audit_log' trong ma trận (Xem = xem toàn bộ nhật ký của công ty; Xuất = tải CSV, ?export=csv).
"""
import csv
import logging
from datetime import datetime, time, timedelta

from django.apps import apps
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import AuditLog, LoginEvent, get_default_company
from core.permissions import CanViewAuditLog
from core.tenant import company_for_user

logger = logging.getLogger('bim.audit')

MAX_PAGE_SIZE = 100
EXPORT_LIMIT = 5000
SENSITIVE_HINTS = ('password', 'token', 'secret', 'otp')
ACTION_LABELS = {'create': 'Tạo mới', 'update': 'Cập nhật', 'status': 'Đổi trạng thái', 'delete': 'Xoá', 'hard_delete': 'Xoá vĩnh viễn'}
_MODEL_CACHE = {}


def _model_name(label):
    if label not in _MODEL_CACHE:
        try:
            _MODEL_CACHE[label] = str(apps.get_model(label)._meta.verbose_name).capitalize()
        except (LookupError, ValueError):
            _MODEL_CACHE[label] = label
    return _MODEL_CACHE[label]


def _field_label(model_label, attname):
    try:
        model = apps.get_model(model_label)
        name = attname[:-3] if attname.endswith('_id') else attname
        try:
            field = model._meta.get_field(name)
        except Exception:
            field = model._meta.get_field(attname)
        return str(field.verbose_name).capitalize()
    except Exception:
        return attname


def _kind(row):
    """Phân loại để lọc / tô màu: create | update | status | delete | hard_delete."""
    changes = row.changes or {}
    if row.action == 'delete':
        return 'hard_delete' if 'hard_delete' in changes else 'delete'
    if row.action == 'update' and 'status' in changes:
        return 'status'
    return row.action


def _show(value):
    if value is None or value == '':
        return '—'
    if value is True:
        return 'Có'
    if value is False:
        return 'Không'
    return str(value)


def _change_rows(row):
    out = []
    for key, pair in (row.changes or {}).items():
        if key in ('hard_delete',):
            continue
        old, new = (pair + [None, None])[:2] if isinstance(pair, list) else (None, pair)
        if any(h in key.lower() for h in SENSITIVE_HINTS):
            old, new = '***', '***'
        out.append({'field': key, 'label': _field_label(row.model_label, key), 'old': _show(old), 'new': _show(new)})
    return out


def _summary(row, kind):
    labels = [_field_label(row.model_label, k) for k in (row.changes or {}) if k != 'hard_delete']
    if kind == 'status':
        old, new = (row.changes['status'] + [None, None])[:2]
        return f'Trạng thái: {_show(old)} → {_show(new)}'
    if kind == 'update':
        return 'Sửa: ' + ', '.join(labels[:4]) + (f' (+{len(labels) - 4} trường)' if len(labels) > 4 else '')
    if kind == 'create':
        return 'Tạo mới phiếu / bản ghi'
    if kind == 'delete':
        return 'Xoá (đánh dấu đã xoá, vẫn lưu lại để đối chiếu)'
    return 'Xoá vĩnh viễn khỏi cơ sở dữ liệu'


def _scope(qs, company):
    cond = Q(company=company)
    if company is not None and company.pk == get_default_company().pk:
        cond |= Q(company__isnull=True)
    return qs.filter(cond)


def _parse_date(value, end=False):
    try:
        day = datetime.strptime((value or '')[:10], '%Y-%m-%d').date()
    except ValueError:
        return None
    moment = datetime.combine(day + timedelta(days=1) if end else day, time.min)
    return timezone.make_aware(moment)


def _page_args(request):
    try:
        page = max(int(request.query_params.get('page', 1)), 1)
    except ValueError:
        page = 1
    try:
        size = min(max(int(request.query_params.get('page_size', 30)), 1), MAX_PAGE_SIZE)
    except ValueError:
        size = 30
    return page, size


def _display_names(usernames):
    """username -> họ tên nhân viên (nếu tài khoản gắn hồ sơ nhân viên)."""
    User = get_user_model()
    out = {}
    for u in User.objects.filter(username__in=usernames).select_related('employee'):
        emp = getattr(u, 'employee', None)
        out[u.username] = (emp.full_name if emp else (u.get_full_name() or u.username))
    return out


def _csv_response(name, header, rows):
    resp = HttpResponse(content_type='text/csv; charset=utf-8')
    resp['Content-Disposition'] = f'attachment; filename="{name}-{timezone.localtime():%Y%m%d-%H%M}.csv"'
    resp.write('﻿')   # Excel đọc đúng tiếng Việt
    writer = csv.writer(resp)
    writer.writerow(header)
    writer.writerows(rows)
    return resp


def _fmt(dt):
    return timezone.localtime(dt).strftime('%H:%M:%S %d/%m/%Y')


class AuditLogListAPIView(APIView):
    """GET /api/audit/logs/?q=&actor=&kind=&model=&date_from=&date_to=&object_id=&page=&page_size=[&export=csv]"""
    permission_classes = [CanViewAuditLog]   # GET = Xem; GET ?export=csv = Xuất (core.access.action_for)

    def get(self, request):
        company = company_for_user(request.user)
        qs = _scope(AuditLog.objects.all(), company)
        p = request.query_params
        if p.get('actor'):
            qs = qs.filter(actor_label=p['actor'])
        if p.get('model'):
            qs = qs.filter(model_label=p['model'])
        if p.get('object_id'):
            qs = qs.filter(object_id=p['object_id'])
        kind = p.get('kind')
        if kind == 'create':
            qs = qs.filter(action='create')
        elif kind == 'status':
            qs = qs.filter(action='update', changes__has_key='status')
        elif kind == 'update':
            qs = qs.filter(action='update').exclude(changes__has_key='status')
        elif kind == 'delete':
            qs = qs.filter(action='delete').exclude(changes__has_key='hard_delete')
        elif kind == 'hard_delete':
            qs = qs.filter(action='delete', changes__has_key='hard_delete')
        start, end = _parse_date(p.get('date_from')), _parse_date(p.get('date_to'), end=True)
        if start:
            qs = qs.filter(created_at__gte=start)
        if end:
            qs = qs.filter(created_at__lt=end)
        q = (p.get('q') or '').strip()
        if q:
            qs = qs.filter(Q(object_repr__icontains=q) | Q(object_id__icontains=q) | Q(actor_label__icontains=q) | Q(model_label__icontains=q))

        if p.get('export'):
            rows = list(qs.select_related('actor')[:EXPORT_LIMIT])
            names = _display_names({r.actor_label for r in rows})
            data = []
            for r in rows:
                k = _kind(r)
                detail = '; '.join(f"{c['label']}: {c['old']} → {c['new']}" for c in _change_rows(r))
                data.append([_fmt(r.created_at), r.actor_label, names.get(r.actor_label, ''), ACTION_LABELS[k], _model_name(r.model_label),
                             r.object_repr, r.object_id, r.ip_address, detail])
            return _csv_response('nhat-ky-hoat-dong', ['Thời gian', 'Tài khoản', 'Họ tên', 'Hành động', 'Loại', 'Đối tượng', 'Mã nội bộ', 'IP', 'Chi tiết thay đổi'], data)

        page, size = _page_args(request)
        total = qs.count()
        rows = list(qs[(page - 1) * size: page * size])
        names = _display_names({r.actor_label for r in rows})
        results = []
        for r in rows:
            k = _kind(r)
            results.append({
                'id': r.id, 'when': _fmt(r.created_at), 'actor': r.actor_label, 'actor_name': names.get(r.actor_label, ''),
                'ip': r.ip_address, 'kind': k, 'kind_label': ACTION_LABELS[k], 'model': r.model_label, 'model_name': _model_name(r.model_label),
                'object_id': r.object_id, 'object_repr': r.object_repr, 'summary': _summary(r, k), 'changes': _change_rows(r),
            })
        payload = {'count': total, 'page': page, 'page_size': size, 'results': results}
        if p.get('with_filters'):
            base = _scope(AuditLog.objects.all(), company)
            actors = list(base.order_by().values_list('actor_label', flat=True).distinct()[:300])
            models = list(base.order_by().values_list('model_label', flat=True).distinct()[:300])
            actor_names = _display_names(set(actors))
            payload['filters'] = {
                'actors': sorted(({'key': a, 'label': (f'{actor_names[a]} ({a})' if a in actor_names and actor_names[a] != a else a)} for a in actors if a),
                                 key=lambda x: x['label'].lower()),
                'models': sorted(({'key': m, 'label': _model_name(m)} for m in models if m), key=lambda x: x['label'].lower()),
                'kinds': [{'key': k, 'label': v} for k, v in ACTION_LABELS.items()],
            }
        return Response(payload)


class LoginEventListAPIView(APIView):
    """GET /api/audit/logins/?q=&kind=&date_from=&date_to=&page=&page_size=[&export=csv]"""
    permission_classes = [CanViewAuditLog]   # GET = Xem; GET ?export=csv = Xuất (core.access.action_for)

    def get(self, request):
        company = company_for_user(request.user)
        from core.tenant import users_of_company
        users = users_of_company(company)
        qs = LoginEvent.objects.filter(Q(user__in=users) | Q(user__isnull=True))
        p = request.query_params
        if p.get('kind') in dict(LoginEvent.KIND_CHOICES):
            qs = qs.filter(kind=p['kind'])
        start, end = _parse_date(p.get('date_from')), _parse_date(p.get('date_to'), end=True)
        if start:
            qs = qs.filter(created_at__gte=start)
        if end:
            qs = qs.filter(created_at__lt=end)
        q = (p.get('q') or '').strip()
        if q:
            qs = qs.filter(Q(username__icontains=q) | Q(ip_address__icontains=q))
        kind_labels = dict(LoginEvent.KIND_CHOICES)

        def row(e, names):
            return {'id': e.id, 'when': _fmt(e.created_at), 'username': e.username, 'name': names.get(e.username, ''),
                    'kind': e.kind, 'kind_label': kind_labels.get(e.kind, e.kind), 'ip': e.ip_address,
                    'user_agent': e.user_agent, 'new_device': e.new_device}

        if p.get('export'):
            rows = list(qs[:EXPORT_LIMIT])
            names = _display_names({e.username for e in rows})
            data = [[_fmt(e.created_at), e.username, names.get(e.username, ''), kind_labels.get(e.kind, e.kind), e.ip_address,
                     'Có' if e.new_device else '', e.user_agent] for e in rows]
            return _csv_response('nhat-ky-dang-nhap', ['Thời gian', 'Tài khoản', 'Họ tên', 'Sự kiện', 'IP', 'Thiết bị mới', 'Trình duyệt'], data)

        page, size = _page_args(request)
        total = qs.count()
        rows = list(qs[(page - 1) * size: page * size])
        names = _display_names({e.username for e in rows})
        payload = {'count': total, 'page': page, 'page_size': size, 'results': [row(e, names) for e in rows]}
        if p.get('with_filters'):
            payload['filters'] = {'kinds': [{'key': k, 'label': v} for k, v in LoginEvent.KIND_CHOICES]}
        return Response(payload)
