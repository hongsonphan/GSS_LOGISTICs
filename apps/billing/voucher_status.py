"""Trạng thái "đã lưu quyết toán (chờ duyệt)" của chuyến xe, dùng cho các báo cáo."""
from apps.billing.models import SettlementVoucher, VoucherStatus

SAVED_LABEL = 'Đối soát (chờ duyệt)'


def draft_voucher_codes(party_type, trips):
    """{id chuyến: mã phiếu nháp} của các phiếu quyết toán đã lưu nhưng chưa duyệt, theo loại đối tượng.

    trips: queryset DispatchTrip hoặc danh sách id chuyến.
    """
    ids = trips.values('id') if hasattr(trips, 'values') else list(trips)
    through = SettlementVoucher.trips.through
    rows = through.objects.filter(
        dispatchtrip_id__in=ids, settlementvoucher__party_type=party_type,
        settlementvoucher__status=VoucherStatus.DRAFT, settlementvoucher__reconciled_at__isnull=False,
        settlementvoucher__is_deleted=False,
    ).values_list('dispatchtrip_id', 'settlementvoucher__code')
    return {trip_id: code for trip_id, code in rows}
