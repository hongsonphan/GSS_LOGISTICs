import datetime
import urllib.parse
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authentication import SessionAuthentication

from core.security import GracefulJWTAuthentication
from core.permissions import IsDispatcherOrAccountant
from apps.customers.models import Customer
from apps.billing.customer_statement_service import (
    get_customer_monthly_statement_data,
    export_customer_monthly_statement_excel
)


class CustomerMonthlyStatementAPIView(APIView):
    """
    API Bảng Kê Vận Chuyển Tháng Đối Soát Với Khách Hàng (Customer Freight Statement).
    Trích xuất đầy đủ 26 cột theo chuẩn kế toán vận tải Triển Võ Logistics.
    """
    authentication_classes = [GracefulJWTAuthentication, SessionAuthentication]
    permission_classes = [IsDispatcherOrAccountant]

    def get(self, request):
        customer_id = request.GET.get('customer_id')
        month = request.GET.get('month')
        year = request.GET.get('year')
        from_date = request.GET.get('from_date')
        to_date = request.GET.get('to_date')
        trip_status = request.GET.get('status', 'ALL')
        vat_rate = request.GET.get('vat_rate', 10)

        if not customer_id:
            # Fallback lấy khách hàng đầu tiên có phát sinh chuyến
            first_cust = Customer.objects.filter(is_deleted=False).first()
            if first_cust:
                customer_id = first_cust.id
            else:
                return Response({
                    'success': False,
                    'error': 'Vui lòng cung cấp mã hoặc ID khách hàng để lập bảng kê.'
                }, status=status.HTTP_400_BAD_REQUEST)

        try:
            data = get_customer_monthly_statement_data(
                customer_id=customer_id,
                month=month,
                year=year,
                from_date=from_date,
                to_date=to_date,
                status=trip_status,
                vat_rate=vat_rate
            )
            return Response({
                'success': True,
                'data': data
            })
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Lỗi tạo bảng kê vận chuyển: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CustomerMonthlyStatementExportExcelAPIView(APIView):
    """
    API Xuất file Excel (.xlsx) Bảng Kê Vận Chuyển Tháng Khách Hàng.
    Khớp 100% định dạng 26 cột, 2 tầng tiêu đề, công thức và chữ ký 2 bên.
    """
    authentication_classes = [GracefulJWTAuthentication, SessionAuthentication]
    permission_classes = [IsDispatcherOrAccountant]

    def get(self, request):
        customer_id = request.GET.get('customer_id')
        month = request.GET.get('month')
        year = request.GET.get('year')
        from_date = request.GET.get('from_date')
        to_date = request.GET.get('to_date')
        trip_status = request.GET.get('status', 'ALL')
        vat_rate = request.GET.get('vat_rate', 10)

        if not customer_id:
            first_cust = Customer.objects.filter(is_deleted=False).first()
            if first_cust:
                customer_id = first_cust.id
            else:
                return Response({'error': 'Chưa chọn khách hàng.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            statement_data = get_customer_monthly_statement_data(
                customer_id=customer_id,
                month=month,
                year=year,
                from_date=from_date,
                to_date=to_date,
                status=trip_status,
                vat_rate=vat_rate
            )

            excel_buffer = export_customer_monthly_statement_excel(statement_data)

            cust_code = statement_data['customer'].get('code') or 'KH'
            period_str = f"Thang_{month}_{year}" if month and year else datetime.date.today().strftime('%Y%m%d')
            raw_filename = f"Bang_Ke_Van_Chuyen_{cust_code}_{period_str}.xlsx"
            ascii_filename = f"Bang_Ke_Van_Chuyen_{cust_code}_{period_str}.xlsx"
            encoded_filename = urllib.parse.quote(raw_filename)

            response = HttpResponse(
                excel_buffer.getvalue(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename="{ascii_filename}"; filename*=UTF-8\'\'{encoded_filename}'
            response['Access-Control-Expose-Headers'] = 'Content-Disposition'
            return response

        except Exception as e:
            return Response({
                'error': f'Lỗi xuất file Excel bảng kê vận chuyển: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
