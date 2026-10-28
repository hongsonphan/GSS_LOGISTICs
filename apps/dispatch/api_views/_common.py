"""Import và hàm dùng chung cho các API phân hệ điều vận (tách từ api_views.py cũ)."""
import datetime
import logging
import os
from core.sequences import next_code
from django.db import models, transaction
from django.db.models import Sum, Count, Q, Avg
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from apps.dispatch.models import DispatchTrip, TripTimelineItem, ShipmentType, TripStatus
from apps.dispatch.timeline_service import sync_trip_10_step_timeline, build_10_step_timeline_spec, get_derived_7_milestones

logger = logging.getLogger(__name__)
from apps.fleet.models import Vehicle, Trailer, VehicleStatus, VehicleType, VehicleOwnership
from apps.personnel.models import Employee, Department, EmployeeRole
from apps.customers.models import Customer, Quotation, QuotationItem, RouteTariff, BookingOrder, BookingStatus, BookingDocument
from apps.billing.models import TripExpense, ExpenseCategory, ApprovalStatus, DriverTripAdvance
from apps.exceptions.models import TripException, ExceptionType, ExceptionSeverity
from apps.documents.models import TripDocument, DocumentType
from django.core.exceptions import ValidationError, ValidationError as DjangoValidationError
from core.workflows import transition_trip, STATUS_LABELS
from core.permissions import (
    check_can_edit_or_delete,
    IsAdminOrDirector,
    IsDispatcher,
    IsAccountant,
    IsDriver,
    IsSalesOrDirector,
    IsCustomsOrDirector,
    CanManageFleet,
    CanViewPayroll,
    IsTripDriverOrDispatcher,
)
import re
from core.validators import validate_uploaded_document, sanitize_filename, format_booking_attachment_filename


def resolve_customer(customer_input):
    """
    Phân giải đối tượng Customer từ chuỗi input:
    Hỗ trợ:
    - Object Customer trực tiếp
    - Customer ID số nguyên (int hoặc str dạng số)
    - Định dạng 'Tên Khách Hàng (Mã Code)' ví dụ: 'ABC (CUST_20260921094535)'
    - Mã Code chính xác: 'CUST_20260921094535'
    - Tên chính xác (iexact)
    - Tên chứa chuỗi (icontains)
    """
    if not customer_input:
        return None

    if isinstance(customer_input, Customer):
        return customer_input

    val = str(customer_input).strip()
    if not val:
        return None

    # Nếu truyền ID số nguyên
    if val.isdigit():
        c = Customer.objects.filter(pk=int(val)).first()
        if c:
            return c

    # Nếu có định dạng "Tên (Mã Code)"
    match = re.match(r'^(.*?)\s*\((.*?)\)$', val)
    if match:
        name_part = match.group(1).strip()
        code_part = match.group(2).strip()
        c = Customer.objects.filter(code__iexact=code_part).first()
        if c:
            return c
        c = Customer.objects.filter(name__iexact=name_part).first()
        if c:
            return c
        c = Customer.objects.filter(code__icontains=code_part).first()
        if c:
            return c
        c = Customer.objects.filter(name__icontains=name_part).first()
        if c:
            return c

    # Thử tìm theo code exact
    c = Customer.objects.filter(code__iexact=val).first()
    if c:
        return c

    # Thử tìm theo name exact
    c = Customer.objects.filter(name__iexact=val).first()
    if c:
        return c

    # Thử tìm theo name icontains
    c = Customer.objects.filter(name__icontains=val).first()
    if c:
        return c

    return None


def calculate_dem_det_status(trip):
    """Tính toán thời hạn và trạng thái Free-time DEM/DET của container."""
    import datetime
    from django.utils import timezone
    today = timezone.localdate() if hasattr(timezone, 'localdate') else datetime.date.today()
    
    det_info = {
        'badge': 'NONE',
        'status': 'NONE',
        'label': 'Chưa đặt hạn DET',
        'days_left': None,
        'days_remaining': None,
        'color': 'slate',
        'is_overdue': False
    }
    if trip.det_expiry_date:
        delta = (trip.det_expiry_date - today).days
        det_info['days_left'] = delta
        det_info['days_remaining'] = delta
        if delta < 0:
            det_info = {
                'badge': 'OVERDUE',
                'status': 'OVERDUE',
                'label': f"Quá hạn DET {abs(delta)} ngày",
                'days_left': delta,
                'days_remaining': delta,
                'color': 'rose',
                'is_overdue': True
            }
        elif delta == 0:
            det_info = {
                'badge': 'TODAY',
                'status': 'TODAY',
                'label': "Hết hạn DET hôm nay",
                'days_left': 0,
                'days_remaining': 0,
                'color': 'rose',
                'is_overdue': True
            }
        elif delta == 1:
            det_info = {
                'badge': 'WARNING',
                'status': 'WARNING',
                'label': "Hết hạn DET ngày mai",
                'days_left': 1,
                'days_remaining': 1,
                'color': 'amber',
                'is_overdue': False
            }
        elif delta <= 2:
            det_info = {
                'badge': 'ATTENTION',
                'status': 'ATTENTION',
                'label': f"Còn {delta} ngày DET",
                'days_left': delta,
                'days_remaining': delta,
                'color': 'amber',
                'is_overdue': False
            }
        else:
            det_info = {
                'badge': 'SAFE',
                'status': 'SAFE',
                'label': f"Còn {delta} ngày DET",
                'days_left': delta,
                'days_remaining': delta,
                'color': 'emerald',
                'is_overdue': False
            }
    return det_info

def normalize_shipment_type(shipment_type):
    st = str(shipment_type or '').strip().upper()
    if 'IMPORT' in st or 'NHẬP' in st or 'NHAP' in st:
        return 'HÀNG NHẬP', 'IMPORT'
    elif 'EXPORT' in st or 'XUẤT' in st or 'XUAT' in st:
        return 'HÀNG XUẤT', 'EXPORT'
    elif 'DOMESTIC' in st or 'NỘI ĐỊA' in st or 'NOI DIA' in st:
        return 'NỘI ĐỊA', 'DOMESTIC'
    return 'NỘI ĐỊA', 'DOMESTIC'

def get_trip_by_code_or_hash(trip_identifier, select_related_fields=None):
    """Truy vấn chuyến xe an toàn bằng cả trip_code gốc, driver_token hoặc HashID bảo mật (Tiêu chuẩn 10)."""
    from core.security import decode_driver_hashid, decode_trip_hashid
    qs = DispatchTrip.objects
    if select_related_fields:
        qs = qs.select_related(*select_related_fields)

    if not trip_identifier:
        return None

    # 1. Khớp chính xác driver_token hiện tại (Capability Token Cổng Tài Xế Mobile)
    trip = qs.filter(driver_token=trip_identifier).first()
    if trip:
        return trip

    # 2. Khớp trip_code nội bộ
    trip_by_code = qs.filter(trip_code=trip_identifier).first()
    if trip_by_code:
        return trip_by_code

    # 3. Decode trip_hashid (Internal web portal)
    decoded_trip_id = decode_trip_hashid(trip_identifier)
    if decoded_trip_id:
        trip = qs.filter(id=decoded_trip_id).first()
        if trip:
            return trip

    # 4. Fallback cho legacy driver_hashid (chỉ chấp nhận nếu trip chưa có driver_token riêng biệt)
    decoded_drv_id = decode_driver_hashid(trip_identifier)
    if decoded_drv_id:
        legacy_trip = qs.filter(id=decoded_drv_id).first()
        if legacy_trip and (not legacy_trip.driver_token or legacy_trip.driver_token == trip_identifier):
            return legacy_trip

    return None


# Xuất mọi tên (kể cả tên bắt đầu bằng "_") cho các module con dùng `from ._common import *`
__all__ = [_n for _n in dir() if not _n.startswith("__")]
