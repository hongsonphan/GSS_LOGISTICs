"""Đối chiếu loại xe (danh mục Đội xe) với loại hàng của chuyến (Loại Cont / Xe).

Loại xe là thuộc tính của PHƯƠNG TIỆN (đặt ở Danh mục Đội xe / Xe 3PL); "Loại Cont / Xe" là thuộc tính của CHUYẾN.
Một biển số chỉ nên chở loại hàng phù hợp với loại xe đó: đầu kéo chở container, xe tải chở hàng theo tải trọng.
"""
import re

from .models import VehicleType

_TRUCK_LOAD = re.compile(r'^(?:xe\s*tải\s*)?(\d+)\s*t\s*(\d)?$', re.IGNORECASE)
_TRUCK_CAPACITY_KG = {VehicleType.TRUCK_10T: 10000, VehicleType.TRUCK_2T: 2000}


def parse_load(container_type):
    """-> ('CONTAINER', None) | ('TRUCK', tải trọng kg) | (None, None) nếu không nhận diện được."""
    value = (container_type or '').strip()
    m = _TRUCK_LOAD.match(value)
    if m:
        return 'TRUCK', int(m.group(1)) * 1000 + (int(m.group(2)) * 100 if m.group(2) else 0)
    if re.match(r'^(2x)?\d{2}[a-z]{0,2}\d?$', value, re.IGNORECASE):
        return 'CONTAINER', None
    return None, None


def infer_vehicle_type(container_type):
    """Loại xe gợi ý khi tự tạo bản ghi xe ngoài từ loại hàng của chuyến."""
    kind, kg = parse_load(container_type)
    if kind == 'TRUCK':
        if kg <= 2500:
            return VehicleType.TRUCK_2T
        return VehicleType.TRUCK_10T
    return VehicleType.TRACTOR


def load_mismatch(vehicle, container_type):
    """Trả về câu cảnh báo (str) nếu xe không phù hợp loại hàng, ngược lại ''."""
    if not vehicle:
        return ''
    kind, kg = parse_load(container_type)
    if not kind:
        return ''
    is_tractor = vehicle.vehicle_type == VehicleType.TRACTOR
    label = vehicle.get_vehicle_type_display()
    if kind == 'CONTAINER' and not is_tractor:
        return f'Xe {vehicle.license_plate} là "{label}" nhưng chuyến chở container ({container_type}). Kiểm tra lại biển số hoặc loại xe trong danh mục.'
    if kind == 'TRUCK' and is_tractor:
        return f'Xe {vehicle.license_plate} là "{label}" nhưng chuyến khai báo hàng xe tải ({container_type}). Kiểm tra lại biển số hoặc loại xe trong danh mục.'
    cap = _TRUCK_CAPACITY_KG.get(vehicle.vehicle_type)
    if kind == 'TRUCK' and cap and kg > cap:
        return f'Xe {vehicle.license_plate} ({label}) tải tối đa {cap // 1000}T, không phù hợp hàng {container_type}.'
    return ''
