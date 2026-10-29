from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.contrib.auth.models import Group, Permission, User
from django.db import transaction
from django.db.models import Q

from core.permissions import CanAdministerAccess


class RolesPermissionsAPIView(APIView):
    """
    API Quản lý Phân Quyền & Vai Trò người dùng hệ thống BIM Logistics.
    Chuẩn Django Permission Model kết hợp Group Kế Thừa và Loại Trừ/Bổ Sung Cá Nhân.
    """
    # Chỉ người có quyền Quản trị hệ thống (trước đây mọi tài khoản đăng nhập đều xem được danh sách người dùng/quyền)
    permission_classes = [CanAdministerAccess]
    access_actions = {'POST': 'edit'}

    def _get_categorized_permissions(self):
        """
        Gom nhóm toàn bộ Permissions của hệ thống theo từng Phân Hệ Nghiệp Vụ trực quan.
        """
        all_perms = Permission.objects.select_related('content_type').order_by('content_type__app_label', 'codename')

        module_mapping = {
            'reports': {
                'id': 'reports',
                'name': 'Báo Cáo & Thống Kê (14 Báo Cáo)',
                'icon': 'ph-chart-bar',
                'permissions': []
            },
            'dispatch': {
                'id': 'dispatch',
                'name': 'Điều Vận & Chuyến Xe',
                'icon': 'ph-truck',
                'permissions': []
            },
            'fleet': {
                'id': 'fleet',
                'name': 'Xe & Bãi (Đội Xe)',
                'icon': 'ph-garage',
                'permissions': []
            },
            'customers': {
                'id': 'customers',
                'name': 'Kinh Doanh & Khách Hàng (Booking)',
                'icon': 'ph-handshake',
                'permissions': []
            },
            'billing': {
                'id': 'billing',
                'name': 'Tài Chính & Kế Toán (Thu/Chi)',
                'icon': 'ph-calculator',
                'permissions': []
            },
            'personnel': {
                'id': 'personnel',
                'name': 'Hành Chính & Nhân Sự',
                'icon': 'ph-users',
                'permissions': []
            },
            'customs': {
                'id': 'customs',
                'name': 'Dịch Vụ Hải Quan',
                'icon': 'ph-file-text',
                'permissions': []
            },
            'master_data': {
                'id': 'master_data',
                'name': 'Cài Đặt Hệ Thống & Danh Mục',
                'icon': 'ph-gear',
                'permissions': []
            },
            'system': {
                'id': 'system',
                'name': 'Quản Trị Người Dùng & Phân Quyền',
                'icon': 'ph-shield-check',
                'permissions': []
            }
        }

        # Danh sách app nghiệp vụ trọng tâm
        business_apps = {'reports', 'dispatch', 'fleet', 'customers', 'billing', 'personnel', 'customs', 'master_data', 'auth'}

        for p in all_perms:
            app = p.content_type.app_label
            if app not in business_apps:
                continue

            full_perm_code = f"{app}.{p.codename}"
            perm_dict = {
                'id': p.id,
                'codename': p.codename,
                'full_code': full_perm_code,
                'name': p.name,
                'app_label': app,
            }

            if app == 'reports':
                module_mapping['reports']['permissions'].append(perm_dict)
            elif app == 'dispatch':
                module_mapping['dispatch']['permissions'].append(perm_dict)
            elif app == 'fleet':
                module_mapping['fleet']['permissions'].append(perm_dict)
            elif app == 'customers':
                module_mapping['customers']['permissions'].append(perm_dict)
            elif app == 'billing':
                module_mapping['billing']['permissions'].append(perm_dict)
            elif app == 'personnel':
                module_mapping['personnel']['permissions'].append(perm_dict)
            elif app == 'customs':
                module_mapping['customs']['permissions'].append(perm_dict)
            elif app == 'master_data':
                module_mapping['master_data']['permissions'].append(perm_dict)
            elif app == 'auth':
                module_mapping['system']['permissions'].append(perm_dict)

        # Lọc các module có permissions
        return [m for m in module_mapping.values() if m['permissions']]

    def get(self, request):
        # 1. Danh sách các nhóm vai trò (Roles / Groups)
        # Chuẩn hóa 4 nhóm vai trò chính: Ban Giám Đốc (Admin), Điều Phối Viên, Kế Toán Cước, Quản Lý Nhân Sự
        # Loại trừ hoàn toàn nhóm Tài xế khỏi hệ thống tài khoản
        groups = Group.objects.prefetch_related('permissions__content_type', 'user_set').order_by('id')
        desc_map = {
            'Ban Giám Đốc': 'Quản trị viên tối cao, xem toàn bộ báo cáo doanh thu & chi phí, phê duyệt thanh toán',
            'Điều Phối Viên': 'Lập lệnh điều động, gán xe & tài xế, theo dõi hành trình và cập nhật mốc giao nhận',
            'Kế Toán Cước': 'Đối soát công nợ khách hàng, kiểm duyệt chi phí chuyến, lập phiếu thu chi sổ quỹ',
            'Quản Lý Nhân Sự': 'Quản lý hồ sơ cán bộ nhân viên, tính lương chuyến và tạm ứng cho tài xế',
            'Kinh Doanh': 'Báo giá dịch vụ, quản lý hợp đồng tuyến và tiếp nhận đơn đặt hàng (Booking)',
            'Hải Quan': 'Thủ tục hải quan điện tử, truyền tờ khai thông quan và giám sát bãi cảng',
        }
        roles_data = []
        for g in groups:
            grp_perms = [
                f"{p.content_type.app_label}.{p.codename}" 
                for p in g.permissions.all()
            ]
            roles_data.append({
                'id': g.id,
                'code': f"ROLE_{g.id}",
                'name': g.name,
                'description': desc_map.get(g.name, f'Nhóm vai trò nghiệp vụ: {g.name}'),
                'user_count': g.user_set.filter(is_active=True).exclude(employee__role='DRIVER').count(),
                'permission_count': g.permissions.count(),
                'permission_codes': grp_perms,
                'is_active': True,
            })

        # 2. Danh sách người dùng nội bộ (Users) - Loại trừ Tài xế vì tài xế không dùng tài khoản hệ thống
        users = User.objects.exclude(employee__role='DRIVER').select_related('employee').prefetch_related(
            'groups', 'user_permissions__content_type', 'employee__excluded_permissions__content_type'
        ).order_by('-is_active', 'username')
        users_data = []
        for u in users:
            emp = getattr(u, 'employee', None)
            
            # Tính toán tập quyền hiệu lực thực tế
            effective_perms = list(u.get_all_permissions())
            
            user_specific_perms = [
                f"{p.content_type.app_label}.{p.codename}"
                for p in u.user_permissions.all()
            ]
            
            excluded_perms = []
            if emp and emp.pk:
                excluded_perms = [
                    f"{p.content_type.app_label}.{p.codename}"
                    for p in emp.excluded_permissions.all()
                ]

            users_data.append({
                'id': u.id,
                'username': u.username,
                'full_name': emp.full_name if emp else (u.get_full_name() or u.username),
                'email': u.email,
                'phone': emp.phone_number if emp else '',
                'role_in_employee': emp.get_role_display() if emp else '',
                'is_active': u.is_active,
                'is_staff': u.is_staff,
                'is_superuser': u.is_superuser,
                'groups': list(u.groups.values('id', 'name')),
                'primary_group': u.groups.first().name if u.groups.exists() else 'Chưa gán nhóm',
                'primary_group_id': u.groups.first().id if u.groups.exists() else None,
                'effective_permissions': effective_perms,
                'user_permissions': user_specific_perms,
                'excluded_permissions': excluded_perms,
                'has_custom_permissions': bool(user_specific_perms or excluded_perms),
                'last_login': u.last_login.strftime('%d/%m/%Y %H:%M') if u.last_login else 'Chưa đăng nhập',
                'date_joined': u.date_joined.strftime('%d/%m/%Y') if u.date_joined else ''
            })

        # 3. Phân loại Permissions hệ thống theo Phân hệ
        modules_data = self._get_categorized_permissions()

        # 4. Thống kê tổng quan
        is_current_admin = bool(request.user.is_superuser or (request.user.is_staff and request.user.has_perm('auth.change_user')))
        summary = {
            'total_users': users.count(),
            'active_users': users.filter(is_active=True).count(),
            'total_groups': groups.count(),
            'staff_count': users.filter(is_staff=True).count(),
            'is_current_admin': is_current_admin,
        }

        return Response({
            'success': True,
            'summary': summary,
            'is_current_admin': is_current_admin,
            'roles': roles_data,
            'results': roles_data,
            'items': roles_data,
            'users': users_data,
            'modules': modules_data,
        })

    def post(self, request):
        """
        Cập nhật Phân Quyền cho Người Dùng.
        Hỗ trợ:
        - Gán Nhóm Vai Trò (Group).
        - Tùy biến tập quyền: Thêm quyền riêng hoặc Loại trừ quyền khỏi Nhóm.
        - Bật/tắt trạng thái (is_active, is_staff).
        """
        if not (request.user.is_superuser or (request.user.is_staff and request.user.has_perm('auth.change_user'))):
            return Response(
                {'error': 'Chỉ Quản trị viên hệ thống (Admin) mới có quyền cập nhật phân quyền!'},
                status=status.HTTP_403_FORBIDDEN
            )

        user_id = request.data.get('user_id')
        group_id = request.data.get('group_id')
        is_active = request.data.get('is_active')
        is_staff = request.data.get('is_staff')
        permissions_list = request.data.get('permissions')  # Danh sách permissions mong muốn: ['reports.view_report_pnl', ...]

        if not user_id:
            return Response({'error': 'Thiếu user_id!'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_user = User.objects.select_related('employee').get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'Không tìm thấy người dùng!'}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            # 1. Cập nhật Group (nếu có truyền group_id)
            if group_id is not None:
                if str(group_id).strip() == "" or int(group_id) == 0:
                    target_user.groups.clear()
                else:
                    try:
                        grp = Group.objects.get(id=group_id)
                        target_user.groups.set([grp])
                    except Group.DoesNotExist:
                        return Response({'error': 'Nhóm vai trò không tồn tại!'}, status=status.HTTP_400_BAD_REQUEST)

            # 2. Cập nhật cờ hệ thống
            if is_active is not None:
                target_user.is_active = bool(is_active)
            if is_staff is not None:
                target_user.is_staff = bool(is_staff)

            target_user.save()

            # 3. Xử lý tùy biến quyền riêng lẻ (permissions)
            if permissions_list is not None and isinstance(permissions_list, list):
                # permissions_list là danh sách mong muốn: ví dụ ['reports.view_report_dem_det', ...]
                desired_perms_set = set(str(p).strip() for p in permissions_list if str(p).strip())

                # Lấy tập quyền kế thừa từ các Group hiện tại của user
                group_perms_set = set()
                for grp in target_user.groups.all():
                    for p in grp.permissions.select_related('content_type').all():
                        group_perms_set.add(f"{p.content_type.app_label}.{p.codename}")

                # Quyền bị LOẠI TRỪ (Có trong nhóm nhưng user bị loại bỏ)
                to_exclude_codes = group_perms_set - desired_perms_set
                # Quyền được THÊM RIÊNG (User được cấp thêm ngoài nhóm)
                to_add_codes = desired_perms_set - group_perms_set

                # Query các Permission objects
                all_needed_codes = to_exclude_codes | to_add_codes
                code_to_perm_map = {}
                for p in Permission.objects.filter(
                    Q(content_type__app_label__in=[c.split('.')[0] for c in all_needed_codes])
                ).select_related('content_type'):
                    full = f"{p.content_type.app_label}.{p.codename}"
                    if full in all_needed_codes:
                        code_to_perm_map[full] = p

                # Cập nhật user_permissions (thêm riêng)
                user_perms_objs = [code_to_perm_map[c] for c in to_add_codes if c in code_to_perm_map]
                target_user.user_permissions.set(user_perms_objs)

                # Cập nhật excluded_permissions (loại trừ khỏi nhóm)
                emp = getattr(target_user, 'employee', None)
                if emp and emp.pk:
                    excluded_perms_objs = [code_to_perm_map[c] for c in to_exclude_codes if c in code_to_perm_map]
                    emp.excluded_permissions.set(excluded_perms_objs)

        # Xóa cache permissions của user trong request (nếu có)
        if hasattr(target_user, '_perm_cache'):
            delattr(target_user, '_perm_cache')
        if hasattr(target_user, '_user_perm_cache'):
            delattr(target_user, '_user_perm_cache')
        if hasattr(target_user, '_group_perm_cache'):
            delattr(target_user, '_group_perm_cache')

        return Response({
            'success': True,
            'message': f'Cập nhật thành công phân quyền cho người dùng {target_user.username}',
            'user': {
                'id': target_user.id,
                'username': target_user.username,
                'is_active': target_user.is_active,
                'is_staff': target_user.is_staff,
                'primary_group': target_user.groups.first().name if target_user.groups.exists() else 'Chưa gán nhóm',
                'effective_permissions_count': len(target_user.get_all_permissions())
            }
        })
