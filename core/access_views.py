"""API trang Phân quyền 3 tầng: Nhóm → Chức danh → Người (xem core/access.py)."""
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core import access
from core.account_security import user_email
from core.models import AccessGroup, LoginEvent, RoleAccess, UserAccessOverride
from core.permissions import CanAdministerAccess
from core.tenant import company_for_user, users_of_company


def _role_label(role):
    from apps.personnel.models import EmployeeRole
    return dict(EmployeeRole.choices).get(role, role)


def _bad(msg):
    return Response({'detail': msg}, status=status.HTTP_400_BAD_REQUEST)


def _user_row(user, company):
    if hasattr(user, '_bim_access'):
        del user._bim_access
    emp = getattr(user, 'employee', None)
    ov = UserAccessOverride.objects.filter(user=user).first()
    position_group = access.position_config(company, emp.role)[0] if emp else ''
    return {
        'id': user.id, 'username': user.username,
        'name': (emp.full_name if emp else (user.get_full_name() or user.username)),
        'code': emp.code if emp else '', 'role': emp.role if emp else '',
        'role_label': _role_label(emp.role) if emp else ('Quản trị hệ thống' if user.is_superuser else 'Chưa gắn hồ sơ nhân viên'),
        'position_group': position_group,
        'is_superuser': user.is_superuser, 'is_active': user.is_active,
        'has_employee': emp is not None,
        'groups': [g for g in dict.fromkeys((ov.groups if ov else []) + access.user_group_keys(user)) if g in access.available_group_keys()],
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
    saved_groups = {g.key: g for g in AccessGroup.objects.filter(company=company)}
    saved_roles = {r.role: r for r in RoleAccess.objects.filter(company=company)}
    User = get_user_model()
    users = users_of_company(company, User.objects.filter(is_active=True)).select_related('employee').order_by('username')
    rows = []
    for u in users:
        emp = getattr(u, 'employee', None)
        if emp is not None and emp.company_id not in (None, company.id):
            continue
        if emp is None and not u.is_superuser and not u.is_staff:
            continue
        rows.append(_user_row(u, company))

    groups = []
    for g in access.available_groups():
        key = g['key']
        groups.append({'key': key, 'label': g['label'], 'description': g['description'], 'icon': g['icon'],
                       'grants': access.group_grants(company, key),
                       'default': access._with_locked(key, access.default_group_grants(key)),
                       'customized': key in saved_groups, 'locked': access.LOCKED_GROUP_GRANTS.get(key, {})})
    roles = []
    for key in access.ROLE_ORDER:
        group, add, remove = access.position_config(company, key)
        d_group, d_add, d_remove = access.default_position(key)
        roles.append({'key': key, 'label': _role_label(key), 'group': group, 'add': add, 'remove': remove,
                      'default_group': d_group, 'default_add': d_add, 'default_remove': d_remove,
                      'customized': key in saved_roles, 'grants': access.role_grants(company, key)})
    return {
        'modules': [{'key': k, 'label': lbl, 'description': d, 'actions': acts} for k, lbl, d, acts in access.MODULES],
        'actions': [{'key': k, 'label': lbl} for k, lbl in access.ACTIONS],
        'groups': groups, 'roles': roles, 'users': rows,
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


class GroupAccessAPIView(APIView):
    """PUT: lưu quyền đầy đủ của một nhóm. DELETE: khôi phục mặc định."""
    permission_classes = [CanAdministerAccess]
    access_actions = {'PUT': 'edit', 'DELETE': 'edit'}

    def put(self, request, key):
        if key not in access.available_group_keys():
            return _bad('Nhóm không hợp lệ')
        grants = access._with_locked(key, access._clean(request.data.get('grants') if isinstance(request.data, dict) else None))
        row, _ = AccessGroup.objects.get_or_create(company=company_for_user(request.user), key=key)
        row.grants, row.updated_by = grants, request.user
        row.save()
        return Response(_payload(request))

    def delete(self, request, key):
        AccessGroup.objects.filter(company=company_for_user(request.user), key=key).delete()
        return Response(_payload(request))


class RoleAccessAPIView(APIView):
    """PUT: chức danh thuộc nhóm nào, thêm / bớt quyền gì so với nhóm. DELETE: khôi phục mặc định."""
    permission_classes = [CanAdministerAccess]
    access_actions = {'PUT': 'edit', 'DELETE': 'edit'}

    def put(self, request, role):
        if role not in access.POSITIONS:
            return _bad('Chức danh không hợp lệ')
        data = request.data if isinstance(request.data, dict) else {}
        group = data.get('group', '') or ''
        if group and group not in access.available_group_keys():
            return _bad('Nhóm không hợp lệ')
        add, remove = access._clean(data.get('add')), access._clean(data.get('remove'))
        if access._to_set(add) & access._to_set(remove):
            return _bad('Một quyền không thể vừa thêm vừa bớt')
        company = company_for_user(request.user)
        base = access._to_set(access.group_grants(company, group))
        add = access._from_set(access._to_set(add) - base)          # chỉ lưu phần thực sự thêm
        remove = access._from_set(access._to_set(remove) & base)    # chỉ lưu phần thực sự bớt
        if role == 'DIRECTOR' and 'edit' in remove.get('admin', []):
            return _bad('Giám đốc luôn giữ quyền quản trị phân quyền')
        row, _ = RoleAccess.objects.get_or_create(company=company, role=role)
        row.group, row.add, row.remove, row.updated_by = group, add, remove, request.user
        row.save()
        return Response(_payload(request))

    def delete(self, request, role):
        RoleAccess.objects.filter(company=company_for_user(request.user), role=role).delete()
        return Response(_payload(request))


class UserAccessAPIView(APIView):
    """PUT: nhóm bổ sung + ngoại lệ (cho thêm / chặn) của một người. DELETE: bỏ hết, chỉ còn quyền chức danh."""
    permission_classes = [CanAdministerAccess]
    access_actions = {'PUT': 'edit', 'DELETE': 'edit'}

    def _user(self, pk):
        return users_of_company(company_for_user(self.request.user), get_user_model().objects.filter(pk=pk)).select_related('employee').first()

    def put(self, request, pk):
        user = self._user(pk)
        if user is None or getattr(user, 'employee', None) is None:
            return _bad('Chỉ phân quyền cho tài khoản có hồ sơ nhân viên')
        data = request.data if isinstance(request.data, dict) else {}
        valid = access.available_group_keys()
        groups = [g for g in (data.get('groups') or []) if g in valid]
        allow, deny = access._clean(data.get('allow')), access._clean(data.get('deny'))
        if user.pk == request.user.pk and 'edit' in deny.get('admin', []):
            return _bad('Không thể tự chặn quyền quản trị phân quyền của chính mình')
        if access._to_set(allow) & access._to_set(deny):
            return _bad('Một quyền không thể vừa cho thêm vừa chặn')
        ov, _ = UserAccessOverride.objects.get_or_create(user=user, defaults={'company': company_for_user(user)})
        ov.groups, ov.allow, ov.deny = list(dict.fromkeys(groups)), allow, deny
        ov.note = str(data.get('note') or '')[:255]
        ov.updated_by = request.user
        ov.save()
        self._sync_django_groups(user, ov.groups)
        return Response(_payload(request))

    @staticmethod
    def _sync_django_groups(user, keys):
        """Thành viên nhóm thật (bảng Nhóm của Django) khớp với các nhóm vừa chọn, giữ nguyên nhóm chính theo chức danh."""
        from django.contrib.auth.models import Group
        if getattr(user, 'employee', None) is None:
            return
        company = company_for_user(user)
        primary = access.position_config(company, user.employee.role)[0]
        wanted = set(keys) | ({primary} if primary else set())
        pks = [g['pk'] for g in access.available_groups() if g['key'] in wanted and g['pk']]
        user.groups.set(Group.objects.filter(pk__in=pks))

    def delete(self, request, pk):
        if self._user(pk) is None:
            return _bad('Không tìm thấy tài khoản trong doanh nghiệp của bạn')
        user = self._user(pk)
        UserAccessOverride.objects.filter(user_id=pk).delete()
        self._sync_django_groups(user, [])
        return Response(_payload(request))
