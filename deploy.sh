#!/usr/bin/env bash
# ==============================================================================
# BIM LOGISTICS — AUTOMATED PRODUCTION DEPLOYMENT & HEALTH CHECK SCRIPT
# Hệ sinh thái BIM Ecosystem - Triền Võ Logistics
# ==============================================================================
set -e

echo "=== [1/6] KIỂM TRA MÔI TRƯỜNG & GIT REPO ==="
git status

echo "=== [2/6] KIỂM TRA CÚ PHÁP JAVASCRIPT FRONTEND ==="
if command -v node >/dev/null 2>&1; then
    node -c static/js/app.js
    node -c static/js/column_manager.js
    echo "✓ Cú pháp JavaScript hợp lệ 100%."
else
    echo "⚠ Bỏ qua node check do môi trường chưa cài Node.js."
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
