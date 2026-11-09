"""Gán doanh nghiệp mặc định cho các dòng còn trống (ví dụ dữ liệu tạo bằng bulk_create). Chạy an toàn nhiều lần."""
from django.apps import apps
from django.core.management.base import BaseCommand

from core.models import CompanyOwnedModel, get_default_company


class Command(BaseCommand):
    help = 'Gán doanh nghiệp mặc định cho dữ liệu chưa có company'

    def handle(self, *args, **options):
        company = get_default_company()
        total = 0
        for model in apps.get_models():
            if issubclass(model, CompanyOwnedModel):
                n = model._base_manager.filter(company__isnull=True).update(company=company)
                if n:
                    self.stdout.write(f"{model._meta.label}: {n}")
                total += n
        self.stdout.write(self.style.SUCCESS(f"Đã gán {total} dòng cho {company}"))
