#!/bin/bash
# ==============================================================================
# SCRIPT CẬP NHẬT TỰ ĐỘNG WEBAPP VÀ ĐỒNG BỘ GITHUB CHO BIM LOGISTICS
# ==============================================================================
set -e

MSG="${1:-Update code directly on VPS}"

cd /home/ubuntu/BIM_LOGISTICS

# Đảm bảo git không bị lỗi quyền giữa user opc và ubuntu
git config --global --add safe.directory /home/ubuntu/BIM_LOGISTICS 2>/dev/null || true

# Tự động chọn docker hay sudo docker
if docker compose ps >/dev/null 2>&1; then
    DK="docker compose"
else
    DK="sudo docker compose"
fi

echo "=== [1/3] THU THAP TAI NGUYEN TINH VA KHOI DONG LAI WEBAPP ==="
$DK exec -T web python manage.py collectstatic --noinput
$DK restart web
sleep 2

echo "=== [2/3] COMMIT VA DAY CODE LEN GITHUB ==="
git add -u
git commit -m "$MSG" || echo "Khong co thay doi moi de commit."
git push origin master

echo "=============================================================================="
echo "✓ HOAN TAT: WEBAPP DA CAP NHAT VA GITHUB DA DUOC DONG BO 100%!"
echo "=============================================================================="
