#!/bin/bash
# ==============================================================================
# SCRIPT CẬP NHẬT TỰ ĐỘNG WEBAPP VÀ ĐỒNG BỘ GITHUB CHO BIM LOGISTICS
# ==============================================================================
set -e

MSG="${1:-Update code directly on VPS}"

cd /home/ubuntu/BIM_LOGISTICS

echo "=== [1/3] THU THAP TAI NGUYEN TINH VA KHOI DONG LAI WEBAPP ==="
docker compose exec -T web python manage.py collectstatic --noinput
docker compose restart web

echo "=== [2/3] KIEM TRA TRANG THAI WEBAPP ==="
curl -s -I http://127.0.0.1:8085/login/ | grep -E "HTTP/|Server:"

echo "=== [3/3] COMMIT VA DAY CODE LEN GITHUB ==="
git add -u
git commit -m "$MSG" || echo "Khong co thay doi moi de commit."
git push origin master

echo "=============================================================================="
echo "✓ HOAN TAT: WEBAPP DA CAP NHAT VA GITHUB DA DUOC DONG BO 100%!"
echo "=============================================================================="
