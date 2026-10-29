"""Chuyển sang ma trận phân quyền mà KHÔNG ai mất quyền đang có.

Với mỗi tài khoản có hồ sơ nhân viên (chưa có bản ghi ngoại lệ): tính quyền theo quy tắc cũ (vai trò viết cứng +
nhóm/quyền Django cấp trong trang admin + menu bên trái) và so với quyền chức danh mới. Phần quy tắc cũ cho mà
chức danh mới không cho được ghi thành ngoại lệ "Cho phép thêm" để Ban Giám đốc rà lại trên trang Phân quyền.
Chạy lại an toàn: người đã có bản ghi ngoại lệ được bỏ qua.
"""
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.test import RequestFactory

from core import access
from core import permissions as P
from core.models import UserAccessOverride
from core.tenant import company_for_user

LEGACY = {
    'dispatch': P.LegacyIsDispatcher, 'accounting': P.LegacyIsAccountant, 'sales': P.LegacyIsSalesOrDirector,
    'advances': P.LegacyIsDispatcherOrAccountant, 'customs': P.LegacyIsCustomsOrDirector, 'fleet': P.LegacyCanManageFleet,
    'payroll': P.LegacyCanViewPayroll, 'reports_fin': P.LegacyCanViewFinancialReports,
    'ledger': P.LegacyCanViewFinancialReports, 'reports_ops': P.LegacyCanViewOperationalReports,
    'master_data': P.LegacyCanManageMasterData, 'admin': P.LegacyIsAdminOrDirector,
}
METHODS = {'view': 'GET', 'export': 'GET', 'create': 'POST', 'approve': 'POST', 'edit': 'PUT', 'delete': 'DELETE'}
# Quyền Django dùng để hiện menu trái trước đây -> quyền Xem phân hệ
MENU_PERMS = {
    'sales': ['customers.view_bookingorder', 'customers.view_customer'], 'dispatch': ['dispatch.view_dispatchtrip'],
    'fleet': ['fleet.view_vehicle'], 'hr': ['personnel.view_employee'],
    'accounting': ['billing.view_cashtransaction', 'billing.view_debitnote'], 'customs': ['customs.view_customsdeclaration'],
    'reports_fin': ['reports.view_financial_report'], 'reports_ops': ['reports.view_operational_report'],
    'master_data': ['auth.change_user', 'master_data.view_portwarehouse', 'master_data.view_commodity'],
}


class _View:
    kwargs = {}


def legacy_grants(user):
    from apps.personnel.models import EmployeeRole
    rf = RequestFactory()
    pairs = set()
    for module, cls in LEGACY.items():
        for action in access.MODULE_ACTIONS[module]:
            req = getattr(rf, METHODS[action].lower())('/')
            req.user = user
            try:
                if cls().has_permission(req, _View()):
                    pairs.add((module, action))
            except Exception:  # noqa: BLE001 — quy tắc cũ lỗi thì coi như không có quyền
                pass
    for module, perms in MENU_PERMS.items():
        if any(user.has_perm(p) for p in perms):
            pairs.add((module, 'view'))
    emp = getattr(user, 'employee', None)
    # Quy tắc cũ cho mọi tài khoản "staff" sửa hồ sơ nhân sự -> không giữ (lộ CCCD, ngân hàng); chỉ giữ theo chức danh
    if emp and emp.role in (EmployeeRole.DIRECTOR, EmployeeRole.ACCOUNTANT):
        pairs |= {('hr', a) for a in ('view', 'create', 'edit', 'delete', 'export')}
    return pairs


class Command(BaseCommand):
    help = 'Giữ nguyên quyền cũ khi chuyển sang ma trận phân quyền (ghi ngoại lệ Cho phép thêm).'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Chỉ in kết quả, không ghi')

    def handle(self, *args, **opts):
        dry = opts.get('dry_run')
        User = get_user_model()
        done = 0
        for user in User.objects.filter(is_active=True, is_superuser=False).select_related('employee'):
            emp = getattr(user, 'employee', None)
            if emp is None or UserAccessOverride.objects.filter(user=user).exists():
                continue
            new = access._to_set(access.role_grants(company_for_user(user), emp.role))
            extra = legacy_grants(user) - new
            if dry:
                self.stdout.write(f'[thử] {user.username} ({emp.role}): giữ thêm {sorted(extra)}')
                done += 1
                continue
            UserAccessOverride.objects.create(
                user=user, company=company_for_user(user), allow=access._from_set(extra), deny={},
                note='[Chuyển đổi tự động] Giữ quyền đã có trước khi áp dụng ma trận phân quyền' if extra else
                     '[Chuyển đổi tự động] Quyền chức danh đã bao trùm quyền cũ')
            done += 1
            if extra:
                self.stdout.write(f'{user.username} ({emp.role}): giữ thêm {sorted(extra)}')
        self.stdout.write(f'Đã chuyển đổi {done} tài khoản')
