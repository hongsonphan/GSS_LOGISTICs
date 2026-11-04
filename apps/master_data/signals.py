import logging
from django.db import transaction
from django.db.models.signals import post_save, post_delete
from apps.master_data.version import bump_master_data_version, bump_topic_version

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


# Model nghiệp vụ -> chủ đề đồng bộ. Mọi thêm/sửa/xóa (Web, API, Admin, import) đều tăng phiên bản chủ đề,
# các màn hình đang mở thấy phiên bản đổi sẽ tự tải lại danh sách (core/live-sync.js).
TOPIC_MODELS = {
    'dispatch': ['dispatch.DispatchTrip', 'dispatch.TripTimelineItem', 'dispatch.TripContainer', 'documents.TripDocument', 'exceptions.TripException'],
    'sales': ['customers.Quotation', 'customers.QuotationItem', 'customers.BookingOrder', 'customers.BookingDocument'],
    'accounting': ['billing.TripExpense', 'billing.DispatcherAdvanceFund', 'billing.DriverTripAdvance', 'billing.CashTransaction',
                   'billing.CustomerInvoice', 'billing.SubcontractorSettlement', 'billing.DriverPayrollSettlement', 'billing.DebitNote',
                   'billing.SettlementVoucher', 'billing.SettlementVoucherPayment', 'ledger.JournalEntry'],
    'customs': ['customs.CustomsDeclaration'],
    'hr': ['personnel.Employee', 'personnel.LaborContract', 'personnel.DailyAttendance', 'personnel.MonthlyAttendanceSummary',
           'personnel.PayrollPeriod', 'personnel.PayrollSlip'],
    'fleet': ['fleet.Vehicle', 'fleet.Trailer'],
}
_TOPICS_CONNECTED = False


def connect_live_sync_signals():
    global _TOPICS_CONNECTED
    if _TOPICS_CONNECTED:
        return
    _TOPICS_CONNECTED = True
    from django.apps import apps

    def make_handler(topic):
        def _handler(sender, **kwargs):
            # sau khi commit để client tải lại chắc chắn thấy bản ghi mới; bump ngay để không phụ thuộc vào commit
            bump_topic_version(topic)
            transaction.on_commit(lambda: bump_topic_version(topic))
        return _handler

    for topic, labels in TOPIC_MODELS.items():
        handler = make_handler(topic)
        for label in labels:
            try:
                model = apps.get_model(label)
            except LookupError:
                logger.warning('[LiveSync] Không tìm thấy model %s', label)
                continue
            post_save.connect(handler, sender=model, weak=False, dispatch_uid=f'live-sync-save-{label}')
            post_delete.connect(handler, sender=model, weak=False, dispatch_uid=f'live-sync-del-{label}')
