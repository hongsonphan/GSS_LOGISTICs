#!/usr/bin/env bash
# ==============================================================================
# BIM LOGISTICS — AUTOMATED PRODUCTION DEPLOYMENT & HEALTH CHECK SCRIPT
# Hệ sinh thái BIM Ecosystem - Triền Võ Logistics
# ==============================================================================
set -e

echo "=== [1/6] KIỂM TRA MÔI TRƯỜNG & GIT REPO ==="
git status

echo "=== [2/6] KIỂM TRA FRONTEND: app.js KHỚP MÃ NGUỒN & CÚ PHÁP ==="
python3 scripts/build_app_js.py --check
if command -v node >/dev/null 2>&1; then
    node --check static/js/app.js
    echo "✓ Cú pháp JavaScript hợp lệ."
else
    echo "⚠ Bỏ qua kiểm tra cú pháp do môi trường chưa cài Node.js."
fi

echo "=== [3/6] CẬP NHẬT DATABASE MIGRATIONS ==="
python manage.py migrate --noinput

echo "=== [4/6] TẬP HỢP TÀI NGUYÊN TĨNH (COLLECTSTATIC) ==="
python manage.py collectstatic --noinput

echo "=== [5/6] CHẠY BỘ KIỂM THỬ HỒI QUY (REGRESSION SUITE) ==="
python manage.py test --keepdb

echo "=== [6/6] ĐỒNG BỘ TIẾN ĐỘ & SẴN SÀNG KHỞI CHẠY GUNICORN ==="
python manage.py resync_timelines

echo "=============================================================================="
echo "✓ HỆ THỐNG BIM LOGISTICS ĐÃ SẴN SÀNG VẬN HÀNH 100% CHUẨN PRODUCTION!"
echo "=============================================================================="
