import time
from django.core.cache import cache

MASTER_DATA_CACHE_KEY = 'bim_master_data_version'


def get_master_data_version():
    """
    Lấy timestamp phiên bản danh mục hệ thống hiện tại (mili-giây).
    Nếu chưa có, khởi tạo bằng timestamp hiện tại.
    """
    v = cache.get(MASTER_DATA_CACHE_KEY)
    if not v:
        v = int(time.time() * 1000)
        cache.set(MASTER_DATA_CACHE_KEY, v, None)
    return int(v)


def bump_master_data_version():
    """
    Tăng phiên bản danh mục khi có bất kỳ thay đổi nào (thêm/sửa/xóa).
    Tất cả các máy tính / user đang mở ứng dụng sẽ phát hiện và tự động đồng bộ tức thời.
    """
    v = int(time.time() * 1000)
    cache.set(MASTER_DATA_CACHE_KEY, v, None)
    return v


# ---- Phiên bản theo chủ đề dữ liệu nghiệp vụ (điều vận, kinh doanh, kế toán, ...) để các màn hình đang mở tự làm mới ----
TOPIC_KEY = 'bim_sync_topic_%s'
SYNC_TOPICS = ('dispatch', 'sales', 'accounting', 'customs', 'hr', 'fleet')


def bump_topic_version(topic):
    v = int(time.time() * 1000)
    cache.set(TOPIC_KEY % topic, v, None)
    return v


def get_topic_versions():
    cached = cache.get_many([TOPIC_KEY % t for t in SYNC_TOPICS])
    out = {}
    for t in SYNC_TOPICS:
        v = cached.get(TOPIC_KEY % t)
        if not v:
            v = bump_topic_version(t)
        out[t] = int(v)
    return out
