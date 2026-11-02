"""Chặn các đường quyết toán/mở lại cũ khi chuyến đã nằm trong Phiếu quyết toán, để số liệu luôn nhất quán với phiếu."""
from rest_framework import status
from rest_framework.response import Response

from .models import SettlementVoucher, VoucherStatus


def voucher_codes(trip_ids, party_type, approved_only=False):
    qs = SettlementVoucher.objects.filter(is_deleted=False, party_type=party_type, trips__id__in=list(trip_ids))
    if approved_only:
        qs = qs.filter(status=VoucherStatus.APPROVED)
    return sorted(set(qs.values_list('code', flat=True)))


def guard_response(trip_ids, party_type, settling):
    """Trả về Response 400 nếu thao tác (chốt/mở lại) mâu thuẫn với phiếu quyết toán; ngược lại None."""
    codes = voucher_codes(trip_ids, party_type, approved_only=not settling)
    if not codes:
        return None
    shown = ', '.join(codes[:3])
    if settling:
        msg = f'Chuyến đã nằm trong phiếu quyết toán {shown}. Hãy mở phiếu đó (Kế toán > Quyết toán & Đối soát > Phiếu Quyết Toán) để duyệt, không chốt trực tiếp.'
    else:
        msg = f'Chuyến thuộc phiếu quyết toán đã duyệt {shown}. Hãy "Mở lại" phiếu đó để gỡ quyết toán, không mở lại từng chuyến.'
    return Response({'error': msg}, status=status.HTTP_400_BAD_REQUEST)
