"""Số phiên bản danh mục: tăng mỗi khi dữ liệu danh mục thay đổi để giao diện đang mở (của mọi người dùng)
tự tải lại các ô chọn và bảng danh mục, không cần F5.

Lưu trong cache dùng chung giữa các tiến trình (DatabaseCache khi chạy thật). Danh mục có cột company tính riêng
theo công ty; danh mục dùng chung (không có company) tính vào khoá chung, ai cũng nhận.
"""
import time

from django.core.cache import cache
from django.db.models.signals import post_delete, post_save

_PREFIX = 'md-revision:'


def _key(company_id):
    return f'{_PREFIX}{company_id or 0}'


def bump(company_id=None):
    cache.set(_key(company_id), time.time_ns(), None)


def current(company_id):
    return f'{cache.get(_key(0)) or 0}.{cache.get(_key(company_id)) or 0}'


def _on_change(sender, instance, **kwargs):
    bump(getattr(instance, 'company_id', None))


def connect():
    from apps.customers.models import Customer, RouteTariff
    from apps.fleet.models import Trailer, Vehicle
    from apps.master_data.models import (
        CompanyProfile, ContainerType, DriverAllowanceCatalog, DriverSalaryTariff, ExpenseItem, Location,
        OpeningBalance, ShippingLine, Subcontractor, SubcontractorDriver,
    )
    from apps.personnel.models import Employee
    for model in (Location, ContainerType, ExpenseItem, ShippingLine, Subcontractor, SubcontractorDriver, DriverSalaryTariff,
                  DriverAllowanceCatalog, OpeningBalance, CompanyProfile, Customer, RouteTariff, Vehicle, Trailer, Employee):
        post_save.connect(_on_change, sender=model, dispatch_uid=f'md-rev-save-{model.__name__}')
        post_delete.connect(_on_change, sender=model, dispatch_uid=f'md-rev-del-{model.__name__}')
