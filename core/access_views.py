"""API trang Phân quyền: ma trận Chức danh × Phân hệ × Thao tác và ngoại lệ theo người."""
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core import access
from django.utils import timezone

from core.account_security import user_email
from core.models import LoginEvent, RoleAccess, UserAccessOverride
from core.permissions import CanAdministerAccess
from core.tenant import company_for_user

# Ban Giám đốc luôn giữ quyền quản trị phân quyền (tránh tự khoá mất quyền vào trang này)
LOCKED = {'DIRECTOR': {'admin': ['view', 'edit']}}


def _role_label(role):
    from apps.personnel.models import EmployeeRole
    return dict(EmployeeRole.choices).get(role, role)


def _user_row(user, company):
    if hasattr(user, '_bim_access'):
        del user._bim_access
    emp = getattr(user, 'employee', None)
    ov = UserAccessOverride.objects.filter(user=user).first()
    return {
        'id': user.id, 'username': user.username,
        'name': (emp.full_name if emp else (user.get_full_name() or user.username)),
        'code': emp.code if emp else '', 'role': emp.role if emp else '',
        'role_label': _role_label(emp.role) if emp else ('Quản trị hệ thống' if user.is_superuser else 'Chưa gắn hồ sơ nhân viên'),
        'is_superuser': user.is_superuser, 'is_active': user.is_active and (emp.is_active if emp else True),
        'has_employee': emp is not None,
        'allow': access._clean(ov.allow) if ov else {}, 'deny': access._clean(ov.deny) if ov else {},
        'note': ov.note if ov else '',
        'effective': access.effective_grants(user) or {},
        'has_email': bool(user_email(user)),
        'last_login': timezone.localtime(user.last_login).strftime('%H:%M %d/%m/%Y') if user.last_login else '',
        'recent_logins': [{'when': timezone.localtime(e.created_at).strftime('%H:%M %d/%m/%Y'), 'kind': e.get_kind_display(),
                           'ip': e.ip_address, 'new_device': e.new_device}
                          for e in LoginEvent.objects.filter(user=user).order_by('-created_at')[:6]],
    }


def _payload(request):
    company = company_for_user(request.user)
    saved = {r.role: r for r in RoleAccess.objects.filter(company=company)}
    roles = []
    for group, keys in access.ROLE_GROUPS:
        for key in keys:
            row = saved.get(key)
            roles.append({'key': key, 'label': _role_label(key), 'group': group,
                          'grants': access._clean(row.grants) if row else access.default_grants(key),
                          'default': access.default_grants(key), 'customized': bool(row),
                          'locked': LOCKED.get(key, {})})
    User = get_user_model()
    users = User.objects.filter(is_active=True).select_related('employee').order_by('username')
    rows = []
    for u in users:
        emp = getattr(u, 'employee', None)
        if emp is not None and emp.company_id not in (None, company.id):
            continue
        if emp is None and not u.is_superuser and not u.is_staff:
            continue
        rows.append(_user_row(u, company))
    return {
        'modules': [{'key': k, 'label': lbl, 'description': d, 'actions': acts} for k, lbl, d, acts in access.MODULES],
        'actions': [{'key': k, 'label': lbl} for k, lbl in access.ACTIONS],
        'roles': roles, 'users': rows,
        'can_edit': access.can(request.user, 'admin', 'edit'),
    }


class MyAccessAPIView(APIView):
    """Quyền hiệu lực của người đang đăng nhập (giao diện dùng để ẩn menu/nút không được phép)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        grants = access.effective_grants(request.user)
        return Response({'matrix': grants is not None, 'grants': grants or {}, 'is_superuser': request.user.is_superuser})


class AccessMatrixAPIView(APIView):
    permission_classes = [CanAdministerAccess]
    access_actions = {'GET': 'view'}

    def get(self, request):
        return Response(_payload(request))


class RoleAccessAPIView(APIView):
    """PUT: lưu quyền một chức danh. DELETE: khôi phục mặc định."""
    permission_classes = [CanAdministerAccess]
    access_actions = {'PUT': 'edit', 'DELETE': 'edit'}

    def put(self, request, role):
        if role not in access.DEFAULT_MATRIX:
            return Response({'detail': 'Chức danh không hợp lệ'}, status=status.HTTP_400_BAD_REQUEST)
        grants = access._clean(request.data.get('grants') if isinstance(request.data, dict) else None)
        for mod, acts in LOCKED.get(role, {}).items():
            grants[mod] = [a for a in access.MODULE_ACTIONS[mod] if a in set(grants.get(mod, [])) | set(acts)]
        company = company_for_user(request.user)
        row, _ = RoleAccess.objects.get_or_create(company=company, role=role)
        row.grants = grants
        row.updated_by = request.user
        row.save()
        return Response(_payload(request))

    def delete(self, request, role):
        RoleAccess.objects.filter(company=company_for_user(request.user), role=role).delete()
        return Response(_payload(request))


class UserAccessAPIView(APIView):
    """PUT: lưu ngoại lệ (cho thêm / chặn) của một người. DELETE: bỏ mọi ngoại lệ."""
    permission_classes = [CanAdministerAccess]
    access_actions = {'PUT': 'edit', 'DELETE': 'edit'}

    def _user(self, pk):
        return get_user_model().objects.filter(pk=pk).select_related('employee').first()

    def put(self, request, pk):
        user = self._user(pk)
        if user is None or getattr(user, 'employee', None) is None:
            return Response({'detail': 'Chỉ đặt ngoại lệ cho tài khoản có hồ sơ nhân viên'}, status=status.HTTP_400_BAD_REQUEST)
        data = request.data if isinstance(request.data, dict) else {}
        allow, deny = access._clean(data.get('allow')), access._clean(data.get('deny'))
        if user.pk == request.user.pk and 'edit' in deny.get('admin', []):
            return Response({'detail': 'Không thể tự chặn quyền quản trị phân quyền của chính mình'},
                            status=status.HTTP_400_BAD_REQUEST)
        overlap = access._to_set(allow) & access._to_set(deny)
        if overlap:
            return Response({'detail': 'Một quyền không thể vừa cho thêm vừa chặn'}, status=status.HTTP_400_BAD_REQUEST)
        ov, _ = UserAccessOverride.objects.get_or_create(user=user, defaults={'company': company_for_user(user)})
        ov.allow, ov.deny = allow, deny
        ov.note = str(data.get('note') or '')[:255]
        ov.updated_by = request.user
        ov.save()
        return Response(_payload(request))

    def delete(self, request, pk):
        UserAccessOverride.objects.filter(user_id=pk).delete()
        return Response(_payload(request))
