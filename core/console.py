"""In ra console an toàn: Windows (cp1252) không in được tiếng Việt, tự chuyển sang không dấu thay vì lỗi."""
import sys
import unicodedata


def safe_text(text):
    enc = getattr(sys.stdout, 'encoding', None) or 'ascii'
    try:
        text.encode(enc)
        return text
    except (UnicodeEncodeError, LookupError):
        text = text.replace('đ', 'd').replace('Đ', 'D')
        return unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode()
