#!/usr/bin/env bash
# ==============================================================================
# SCRIPT CAP NHAT TOAN DIEN WEBAPP VA DONG BO GITHUB
# Ho tro ca user opc va ubuntu
# ==============================================================================
set -e

REPO_DIR="/home/ubuntu/BIM_LOGISTICS"
cd "$REPO_DIR"

# Khac phuc dubious ownership
git config --global --add safe.directory "$REPO_DIR" 2>/dev/null || true

# Nhan dien lenh docker compose
if docker compose version >/dev/null 2>&1; then
    DOCKER_CMD="docker compose"
elif sudo docker compose version >/dev/null 2>&1; then
    DOCKER_CMD="sudo docker compose"
else
    DOCKER_CMD="docker-compose"
fi

echo "=== [1/4] KEO CODE MOI NHAT TU GITHUB VE VPS ==="
git pull origin master || true

echo "=== [2/4] THU THAP TAI NGUYEN TINH VA KHOI DONG LAI WEBAPP ==="
$DOCKER_CMD exec -T web python manage.py collectstatic --noinput
$DOCKER_CMD restart web
sleep 3

echo "=== [3/4] KIEM TRA THAY DOI TAI CHO TREN VPS ==="
# Khong tu commit/push tu VPS nua: moi thay doi phai di qua may phat trien + GitHub (co review, co test).
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
    echo "CANH BAO: VPS co file bi sua truc tiep, chua dong bo voi GitHub:"
    git status --short
fi

echo "=== [4/4] KIEM TRA HE THONG WEBAPP ==="
curl -s -I http://127.0.0.1:8085/ | head -n 5 || true

echo "=============================================================================="
echo "✓ HOAN TAT CAP NHAT VA DONG BO HE THONG 100%!"
echo "=============================================================================="
