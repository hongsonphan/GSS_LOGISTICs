import os
import sys
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from apps.dispatch.models import DispatchTrip
from apps.customers.models import Customer, Quotation, BookingOrder
from apps.personnel.models import Employee
from apps.fleet.models import Vehicle
from apps.billing.models import CashTransaction, TripExpense, DispatcherAdvanceFund, DriverTripAdvance
from apps.customs.models import CustomsDeclaration
from apps.master_data.models import Location, ExpenseItem, ContainerType

print('=== DATABASE COUNTS ===')
print('Customers:', Customer.objects.count())
print('Quotations:', Quotation.objects.count())
print('BookingOrders:', BookingOrder.objects.count())
print('DispatchTrips:', DispatchTrip.objects.count())
print('Employees:', Employee.objects.count())
print('Vehicles:', Vehicle.objects.count())
print('CashTransactions:', CashTransaction.objects.count())
print('TripExpenses:', TripExpense.objects.count())
print('CustomsDeclarations:', CustomsDeclaration.objects.count())
print('Locations:', Location.objects.count())
print('ExpenseItems:', ExpenseItem.objects.count())
print('ContainerTypes:', ContainerType.objects.count())
