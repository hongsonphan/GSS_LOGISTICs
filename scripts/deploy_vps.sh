#!/usr/bin/env bash
# =============================================================================
# TRIỂN KHAI BIM LOGISTICS TRÊN VPS (chạy trong thư mục repo, sau khi đã git pull bản mới)
#   bash scripts/deploy_vps.sh
# Các bước: kiểm tra .env -> sao lưu CSDL + media -> chạy thử trên bản sao CSDL -> cập nhật Nginx (media có kiểm quyền, gzip)
#           -> build lại image -> khởi động (migrate + collectstatic) -> kiểm tra /healthz/
# Nếu web không lên được: tự quay về commit cũ (ghi trong ../BIM_LOGISTICS_rollback_commit.txt).
# =============================================================================
set -euo pipefail
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"
ROLLBACK_FILE="$(dirname "$APP_DIR")/BIM_LOGISTICS_rollback_commit.txt"
SUDO=""; [ "$(id -u)" -ne 0 ] && SUDO="sudo"
if docker compose version >/dev/null 2>&1; then DC="docker compose"; elif $SUDO docker compose version >/dev/null 2>&1; then DC="$SUDO docker compose"; else DC="docker-compose"; fi
step() { echo; echo "=== $* ==="; }

step "1/7 Kiểm tra file .env"
touch .env
env_get() { grep -E "^$1=" .env | tail -1 | cut -d= -f2- || true; }
if [ -z "$(env_get SECRET_KEY)" ]; then
    echo "SECRET_KEY chưa có -> tạo mới (người dùng sẽ phải đăng nhập lại một lần)."
    printf '\nSECRET_KEY=%s\n' "$(python3 -c 'import secrets;print(secrets.token_urlsafe(50))')" >> .env
fi
if [ -z "$(env_get DB_PASSWORD)" ]; then
    echo "LỖI: DB_PASSWORD chưa có trong .env. Không dùng mật khẩu mặc định - hãy đặt DB_PASSWORD rồi chạy lại."
    exit 1
fi
if [ -z "$(env_get HASHIDS_SALT)" ]; then
    echo "HASHIDS_SALT chưa có -> tạo ngẫu nhiên (mã link tra cứu/tài xế không đoán được từ mã nguồn)."
    printf '\nHASHIDS_SALT=%s\n' "$(python3 -c 'import secrets;print(secrets.token_urlsafe(30))')" >> .env
fi
grep -q '^DEBUG=' .env || printf '\nDEBUG=False\n' >> .env
grep -q '^FRONTEND_SPLIT_SCRIPTS=' .env || printf 'FRONTEND_SPLIT_SCRIPTS=false\n' >> .env
grep -q '^SECURE_SSL_REDIRECT=' .env || printf 'SECURE_SSL_REDIRECT=True\n' >> .env
grep -q '^SITE_URL=' .env || printf 'SITE_URL=https://logistics.bim.info.vn\n' >> .env  # link trong email đặt lại mật khẩu

step "2/7 Sao lưu CSDL và media trước khi cập nhật"
bash scripts/backup_vps.sh

step "2b/7 Build image mới và CHẠY THỬ trên bản sao CSDL production (chưa đụng dữ liệu thật)"
$DC build web
PG="$DC exec -T db"
$PG dropdb -U bim_logistics_user --if-exists bim_preflight
$PG createdb -U bim_logistics_user bim_preflight
$PG sh -c 'pg_dump -U bim_logistics_user -d bim_logistics_db --no-owner | psql -q -U bim_logistics_user -d bim_preflight' >/dev/null
if $DC run --rm --no-deps -T -e DB_NAME=bim_preflight web sh -c \
    "python manage.py migrate --noinput && python manage.py assign_default_company && python manage.py sync_trip_data && python manage.py rebuild_ledger && python manage.py migrate_legacy_access && python manage.py check"; then
    echo "Chạy thử trên bản sao CSDL: ĐẠT"
    $PG dropdb -U bim_logistics_user bim_preflight
else
    echo "CHẠY THỬ THẤT BẠI -> DỪNG, hệ thống đang chạy KHÔNG bị thay đổi (CSDL bản sao: bim_preflight để kiểm tra)"
    [ -f "$ROLLBACK_FILE" ] && git checkout -B master "$(cat "$ROLLBACK_FILE")" || true
    exit 1
fi

step "3/7 Cập nhật Nginx: /media/ phải qua Django kiểm quyền, bật gzip"
NGINX_FILE="$($SUDO grep -rl 'server_name logistics.bim.info.vn' /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null | head -1 || true)"
if [ -n "$NGINX_FILE" ]; then
    NGINX_REAL="$($SUDO readlink -f "$NGINX_FILE")"
    $SUDO cp "$NGINX_REAL" "$NGINX_REAL.bak.$(date +%Y%m%d%H%M)"
    $SUDO python3 - "$NGINX_REAL" "$APP_DIR" <<'PY'
import re, sys
path, app = sys.argv[1], sys.argv[2]
s = open(path, encoding='utf-8').read()
media_block = re.compile(r"\n[ \t]*location /media/ \{.*?\n[ \t]*\}\n", re.S)
protected = (f"\n    location /protected-media/ {{\n        internal;\n        alias {app}/media/;\n"
             "        add_header Cache-Control \"private, max-age=3600\";\n    }\n")
if "location /protected-media/" not in s:
    s, n = media_block.subn(protected, s, count=1)
    if n == 0:
        s = s.replace("    location / {", protected.lstrip("\n") + "\n    location / {", 1)
if "gzip on;" not in s:
    gz = ("    gzip on;\n    gzip_comp_level 5;\n    gzip_min_length 1024;\n    gzip_proxied any;\n    gzip_vary on;\n"
          "    gzip_types text/plain text/css text/javascript application/javascript application/json application/xml image/svg+xml;\n\n")
    s = s.replace("    location / {", gz + "    location / {", 1)
open(path, "w", encoding="utf-8").write(s)
PY
    if $SUDO nginx -t; then
        $SUDO systemctl reload nginx
        grep -q '^MEDIA_USE_X_ACCEL=' .env && sed -i 's/^MEDIA_USE_X_ACCEL=.*/MEDIA_USE_X_ACCEL=true/' .env || printf 'MEDIA_USE_X_ACCEL=true\n' >> .env
        echo "Nginx đã cập nhật: $NGINX_REAL (bản cũ: .bak.*)"
    else
        echo "Cấu hình Nginx mới lỗi -> khôi phục bản cũ"; $SUDO cp "$(ls -t "$NGINX_REAL".bak.* | head -1)" "$NGINX_REAL"; $SUDO nginx -t && $SUDO systemctl reload nginx
        grep -q '^MEDIA_USE_X_ACCEL=' .env || printf 'MEDIA_USE_X_ACCEL=false\n' >> .env
    fi
else
    echo "Không tìm thấy file Nginx của logistics.bim.info.vn -> bỏ qua (xem mẫu scripts/nginx_bim_logistics.conf)"
fi

step "4/7 Quyền thư mục cho container chạy bằng user thường (UID 1000)"
mkdir -p media staticfiles
$SUDO chown -R 1000:1000 media staticfiles
# .env: chủ là user triển khai (ghi), nhóm UID 1000 của container (chỉ đọc), người khác không đọc được
$SUDO chown "$(id -un)":1000 .env && $SUDO chmod 640 .env

step "5/7 Khởi động bản mới (tự migrate + collectstatic)"
$DC up -d web

step "6/7 Kiểm tra hệ thống"
ok=""
for i in $(seq 1 30); do
    if curl -fsS -H "Host: logistics.bim.info.vn" -H "X-Forwarded-Proto: https" http://127.0.0.1:8085/healthz/ >/dev/null 2>&1; then ok=1; break; fi
    sleep 4
done
# Nginx dạng container gọi qua cầu nối docker0 (172.17.0.1): kiểm tra cả đường này
if [ -n "$ok" ] && ip -4 addr show docker0 >/dev/null 2>&1; then
    curl -fsS -m 10 -H "Host: logistics.bim.info.vn" -H "X-Forwarded-Proto: https" http://172.17.0.1:8085/healthz/ >/dev/null 2>&1 || { echo "Không gọi được qua 172.17.0.1:8085 (đường Nginx dùng)"; ok=""; }
fi
if [ -z "$ok" ]; then
    echo "WEB KHÔNG LÊN -> quay về bản cũ"; $DC logs --tail 80 web || true
    if [ -f "$ROLLBACK_FILE" ]; then git checkout -B master "$(cat "$ROLLBACK_FILE")"; $DC build web; $DC up -d web; fi
    exit 1
fi
$DC exec -T web python manage.py assign_default_company
$DC exec -T web python manage.py sync_trip_data
$DC exec -T web python manage.py rebuild_ledger
# Chuyển sang ma trận phân quyền không làm ai mất quyền cũ (chỉ chạy cho tài khoản chưa có bản ghi ngoại lệ)
$DC exec -T web python manage.py migrate_legacy_access

step "7/7 Lịch sao lưu hằng ngày (2h sáng)"
CRON_LINE="0 2 * * * $APP_DIR/scripts/backup_vps.sh >> /home/ubuntu/backups/backup.log 2>&1"
( crontab -l 2>/dev/null | grep -v 'scripts/backup_vps.sh' ; echo "$CRON_LINE" ) | crontab -
echo "HOÀN TẤT: $(git rev-parse --short HEAD) đang chạy, /healthz/ OK"
