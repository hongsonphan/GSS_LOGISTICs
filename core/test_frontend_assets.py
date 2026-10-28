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
            self.assertIn('tailwindcss v3', css)
            self.assertGreater(len(css), 10000)
        self.assertIn('.bg-teal-600', (ROOT / 'static' / 'css' / 'tailwind.css').read_text(encoding='utf-8'))

    def test_dynamic_classes_safelisted(self):
        css = (ROOT / 'static' / 'css' / 'tailwind.css').read_text(encoding='utf-8')
        for selector in (r'.bg-sky-50\/70', r'.ring-emerald-200\/80', r'.hover\:bg-blue-100:hover', '.bg-purple-500'):
            self.assertIn(selector, css)


class MediaUrlFilterTests(SimpleTestCase):
    def test_media_url(self):
        from core.templatetags.media_tags import media_url
        self.assertEqual(media_url('booking_files/a.pdf'), '/media/booking_files/a.pdf')
        self.assertEqual(media_url('/media/x.png'), '/media/x.png')
        self.assertEqual(media_url('https://cdn/x.png'), 'https://cdn/x.png')
        self.assertEqual(media_url(None), '')
