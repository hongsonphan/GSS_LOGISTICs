"""Hải quan (tổng hợp)."""
from ._common import *  # noqa: F401,F403

class CustomsAPIView(APIView):
    """API Thủ tục Hải quan phân luồng."""
    permission_classes = [IsCustomsOrDirector]
    def get(self, request):
        return Response({
            'green_lane': 85,
            'yellow_lane': 12,
            'red_lane': 3,
            'status': 'Đã kết nối với hệ thống Hải quan ECUS/VNACCS'
        })
