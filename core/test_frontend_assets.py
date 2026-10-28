from pathlib import Path

from django.conf import settings
from django.test import SimpleTestCase

ROOT = Path(settings.BASE_DIR)


class TailwindBuildTests(SimpleTestCase):
    def test_no_tailwind_cdn_in_templates(self):
        offenders = [str(p) for p in (ROOT / 'templates').rglob('*.html') if 'cdn.tailwindcss.com' in p.read_text(encoding='utf-8')]
        self.assertEqual(offenders, [])

    def test_built_css_present(self):
        for name in ('tailwind.css', 'tailwind-help.css'):
            css = (ROOT / 'static' / 'css' / name).read_text(encoding='utf-8')
            self.assertIn('.bg-teal-600', css)
            self.assertGreater(len(css), 10000)

    def test_dynamic_classes_safelisted(self):
        css = (ROOT / 'static' / 'css' / 'tailwind.css').read_text(encoding='utf-8')
        for selector in (r'.bg-sky-50\/70', r'.ring-emerald-200\/80', r'.hover\:bg-blue-100:hover', '.bg-purple-500'):
            self.assertIn(selector, css)
