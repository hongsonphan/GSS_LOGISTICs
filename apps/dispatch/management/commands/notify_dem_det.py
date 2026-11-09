"""Tạo thông báo chuông cho các chuyến GSS sắp/đã quá hạn DEM/DET. Lên lịch chạy mỗi sáng (cron)."""
from django.core.management.base import BaseCommand

from apps.dispatch import gss_alerts
from core.console import safe_text


class Command(BaseCommand):
    help = 'Thông báo hạn DEM/DET sắp hết / quá hạn cho Điều vận (chống trùng).'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Chỉ liệt kê, không tạo thông báo.')

    def handle(self, *args, **opts):
        if opts['dry_run']:
            rows = gss_alerts.pending_alerts()
            for a in rows:
                self.stdout.write(safe_text(f'{a["trip"].trip_code} {a["kind"]} {a["level"]} hạn {a["expiry"]} (còn {a["days_left"]} ngày)'))
            self.stdout.write(safe_text(f'{len(rows)} cảnh báo (dry-run).'))
            return
        res = gss_alerts.notify()
        self.stdout.write(safe_text(f'Cảnh báo: {res["alerts"]}; thông báo mới: {res["created"]}; người nhận: {res["recipients"]}.'))
