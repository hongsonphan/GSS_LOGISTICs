"""Chặn lại lỗi cũ: migration (chạy cả khi dựng DB test và khi deploy VPS) xóa dữ liệu vận hành hoặc file media thật."""
import re
from pathlib import Path

from django.conf import settings
from django.test import SimpleTestCase

FORBIDDEN = re.compile(r'purge_operational_data|run_purge|rmtree|MEDIA_ROOT|os\.remove|os\.unlink|\.unlink\(')


class NoDestructiveMigrationsTests(SimpleTestCase):
    def test_migrations_never_purge_data_or_media(self):
        offenders = []
        for path in Path(settings.BASE_DIR).glob('*/**/migrations/*.py'):
            if 'site-packages' in path.parts or 'worktrees' in path.relative_to(settings.BASE_DIR).parts:
                continue
            text = '\n'.join(line for line in path.read_text(encoding='utf-8').splitlines() if not line.lstrip().startswith('#'))
            if FORBIDDEN.search(text):
                offenders.append(str(path.relative_to(settings.BASE_DIR)))
        self.assertEqual(offenders, [])

    def test_tests_use_temp_media_root(self):
        self.assertNotEqual(Path(settings.MEDIA_ROOT).resolve(), (Path(settings.BASE_DIR) / 'media').resolve())
