"""Biến dùng chung cho template: menu được phép theo ma trận phân quyền (core/access.py)."""
import json

from core import access


def _legacy_menu(user):
    has = user.has_perm
    reports = [p for p in user.get_all_permissions() if p.startswith('reports.view_')]
    return {
        'sales': has('customers.view_bookingorder') or has('customers.view_customer'),
        'dispatch': has('dispatch.view_dispatchtrip'), 'fleet': has('fleet.view_vehicle'),
        'hr': has('personnel.view_employee'),
        'accounting': has('billing.view_cashtransaction') or has('billing.view_debitnote'),
        'customs': has('customs.view_customsdeclaration'), 'reports': bool(reports),
        'settings': has('auth.change_user') or has('master_data.view_portwarehouse') or has('master_data.view_commodity'),
        'access_admin': False,
    }


def access_menu(request):
    user = getattr(request, 'user', None)
    if user is None or not user.is_authenticated:
        return {'menu': {}, 'access_json': 'null'}
    return {**_menu(user), 'access_json': json.dumps(access.effective_grants(user))}


def _menu(user):
    if user.is_superuser:
        return {'menu': {k: True for k in ('sales', 'dispatch', 'fleet', 'hr', 'accounting', 'customs', 'reports',
                                           'settings', 'access_admin')}}
    if not access.uses_matrix(user):
        return {'menu': _legacy_menu(user)}
    v = lambda m, a='view': access.allowed(user, m, a)
    return {'menu': {
        'sales': v('sales'), 'dispatch': v('dispatch'), 'fleet': v('fleet'), 'customs': v('customs'),
        'hr': v('hr') or v('payroll'),
        'accounting': v('accounting') or v('advances') or v('ledger'),
        'reports': v('reports_ops') or v('reports_fin'),
        'settings': v('master_data', 'create') or v('master_data', 'edit') or v('admin'),
        'access_admin': v('admin'),
    }}
