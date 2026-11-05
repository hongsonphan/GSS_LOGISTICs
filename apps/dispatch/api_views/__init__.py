"""API phân hệ điều vận — tách theo nghiệp vụ. Giữ nguyên đường import cũ `apps.dispatch.api_views.X`."""
from ._common import *  # noqa: F401,F403
from .dashboard import DashboardBGDAPIView, DashboardPivotChartAPIView  # noqa: F401
from .trips import TripListCreateAPIView, TripDetailAPIView  # noqa: F401
from .trip_expenses import TripAddExpenseAPIView, TripExpenseDetailAPIView, TripSettleExpensesAPIView, TripUnsettleExpensesAPIView  # noqa: F401
from .trip_documents import TripAddDocumentAPIView, TripDocumentDetailAPIView  # noqa: F401
from .driver import TripDriverMilestoneAPIView, TripDriverIncidentAPIView  # noqa: F401
from .personnel import PersonnelPayrollAPIView  # noqa: F401
from .fleet import FleetAPIView  # noqa: F401
from .sales import BookingActiveAPIView, BookingPriceLookupAPIView, SalesAPIView, QuotationDetailAPIView, QuotationStatusAPIView  # noqa: F401
from .bookings import BookingOrderDetailAPIView, BookingOrderStatusAPIView, BookingDocumentDeleteAPIView  # noqa: F401
from .customs import CustomsAPIView  # noqa: F401
from .accounting import AccountingAPIView  # noqa: F401
from .vendor import BookingVendorAllocationsAPIView, VendorAllocationDetailAPIView, VendorPortalAPIView  # noqa: F401
