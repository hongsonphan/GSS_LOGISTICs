from django import template
from decimal import Decimal

register = template.Library()

@register.filter(name='format_money')
def format_money(value):
    """
    Format số tiền hoặc số lượng có dấu phân cách hàng ngàn theo chuẩn Việt Nam.
    Ví dụ:
      1265000 -> 1.265.000
      2000000 -> 2.000.000
      35000   -> 35.000
      0       -> 0
    """
    if value is None or value == '':
        return '0'
    try:
        if isinstance(value, str):
            value = value.strip().replace(',', '')
        num = Decimal(str(value))
        # Làm tròn số nguyên nếu không có phần thập phân
        if num == num.to_integral():
            int_val = int(num)
            return f"{int_val:,}".replace(',', '.')
        else:
            return f"{float(num):,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
    except Exception:
        try:
            val = int(round(float(value)))
            return f"{val:,}".replace(',', '.')
        except Exception:
            return str(value)

@register.filter(name='money_vnd')
def money_vnd(value):
    """Format số tiền kèm đơn vị đ."""
    formatted = format_money(value)
    return f"{formatted} đ"
