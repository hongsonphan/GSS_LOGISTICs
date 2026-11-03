import logging
from django.db import transaction
from django.db.models.signals import post_save, post_delete
from apps.master_data.version import bump_master_data_version

logger = logging.getLogger('bim.master_data')

_CONNECTED = False


def connect_master_data_signals():
    """
    Tự động theo dõi mọi thay đổi trên các Model danh mục cốt lõi.
    Bất kỳ thao tác thêm, sửa, xóa nào (từ Web, Django Admin, Excel import hay API)
    đều tự động tăng phiên bản danh mục để toàn bộ client đồng bộ tức thời.
    """
    global _CONNECTED
    if _CONNECTED:
        return
    _CONNECTED = True

    from apps.master_data.models import (
        Location, ContainerType, ShippingLine, Subcontractor, DriverSalaryTariff,
        ExpenseItem, DriverAllowanceCatalog, SubcontractorDriver, OpeningBalance, CompanyProfile
    )
    from apps.customers.models import Customer, RouteTariff
    from apps.fleet.models import Vehicle, Trailer
    from apps.personnel.models import Employee

    models_to_watch = [
        Location, ContainerType, ShippingLine, Subcontractor, DriverSalaryTariff,
        Customer, Vehicle, Trailer, Employee,
        ExpenseItem, DriverAllowanceCatalog, SubcontractorDriver, OpeningBalance, CompanyProfile, RouteTariff
    ]

    def _on_master_data_changed(sender, **kwargs):
        new_version = bump_master_data_version()
        logger.debug(f"[MasterData Sync] Signal từ {sender.__name__} -> bump version lên {new_version}")
        # Tăng thêm một lần SAU khi giao dịch commit: nếu client đã tải lại giữa lúc bump đầu và lúc commit
        # (nhận dữ liệu cũ), version mới buộc nó tải lại để thấy bản ghi vừa tạo.
        transaction.on_commit(bump_master_data_version)

    for m in models_to_watch:
        post_save.connect(_on_master_data_changed, sender=m, weak=False)
        post_delete.connect(_on_master_data_changed, sender=m, weak=False)
