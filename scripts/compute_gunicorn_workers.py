"""In ra số worker gunicorn khuyến nghị (2 x số CPU thực sự dùng được + 1).

os.sched_getaffinity() chỉ cho biết tiến trình được chạy trên core nào, KHÔNG thấy
giới hạn quota CPU kiểu `docker run --cpus` / `cpus:` trong docker-compose (cơ chế
CFS quota, không phải cpuset) -> nếu chỉ dùng affinity sẽ đếm nhầm ra số CPU thật
của máy chủ, sinh ra quá nhiều worker khi container bị giới hạn CPU.
Hàm này đọc quota cgroup trước (v2 rồi v1), lấy số nhỏ hơn giữa quota và affinity.
"""
import os


def _cgroup_v2_quota():
    try:
        with open('/sys/fs/cgroup/cpu.max') as f:
            quota, period = f.read().split()
        if quota == 'max':
            return None
        return max(1, int(quota) // int(period))
    except (FileNotFoundError, ValueError):
        return None


def _cgroup_v1_quota():
    try:
        with open('/sys/fs/cgroup/cpu/cpu.cfs_quota_us') as f:
            quota = int(f.read())
        if quota <= 0:
            return None
        with open('/sys/fs/cgroup/cpu/cpu.cfs_period_us') as f:
            period = int(f.read())
        return max(1, quota // period)
    except (FileNotFoundError, ValueError):
        return None


def visible_cpus():
    try:
        affinity = len(os.sched_getaffinity(0))
    except AttributeError:  # không có trên Windows/macOS, chỉ dùng trong Linux container
        affinity = os.cpu_count() or 1
    quota = _cgroup_v2_quota() or _cgroup_v1_quota()
    return min(affinity, quota) if quota else affinity


if __name__ == '__main__':
    print(2 * visible_cpus() + 1)
