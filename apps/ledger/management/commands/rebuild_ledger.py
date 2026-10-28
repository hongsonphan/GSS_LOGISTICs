"""Sinh lại toàn bộ sổ cái từ chứng từ nghiệp vụ (an toàn khi chạy lại)."""
from django.core.management.base import BaseCommand, CommandError

from apps.ledger.posting import rebuild
from core.models import Company


class Command(BaseCommand):
    help = 'Sinh lại bút toán tự động cho một hoặc mọi công ty'

    def add_arguments(self, parser):
        parser.add_argument('--company', help='Mã công ty (mặc định: tất cả)')

    def handle(self, *args, **options):
        company = None
        if options.get('company'):
            company = Company.objects.filter(code=options['company']).first()
            if company is None:
                raise CommandError(f"Không có công ty {options['company']}")
        summary = rebuild(company, stdout=self.stdout)
        self.stdout.write(self.style.SUCCESS(f'Hoàn tất: {sum(summary.values())} bút toán.'))
