#!/usr/bin/env bash
# =============================================================================
# SAO LƯU TỰ ĐỘNG BIM LOGISTICS (chạy trên VPS)
# - CSDL PostgreSQL (pg_dump nén) + thư mục media/ (chứng từ, hợp đồng, ảnh)
# - Giữ KEEP_DAYS ngày gần nhất, tự xoá bản cũ hơn
# Cài lịch chạy 2h sáng mỗi ngày:
#   crontab -e  ->  0 2 * * * /home/ubuntu/BIM_LOGISTICS/scripts/backup_vps.sh >> /home/ubuntu/backups/backup.log 2>&1
# Khôi phục CSDL:
#   gunzip -c db_YYYYmmdd_HHMM.sql.gz | docker exec -i bim_logistics_postgres psql -U bim_logistics_user -d bim_logistics_db
# =============================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/BIM_LOGISTICS}"
BACKUP_DIR="${BACKUP_DIR:-/home/ubuntu/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
DB_CONTAINER="${DB_CONTAINER:-bim_logistics_postgres}"
DB_USER="${DB_USER:-bim_logistics_user}"
DB_NAME="${DB_NAME:-bim_logistics_db}"
STAMP="$(date +%Y%m%d_%H%M)"

mkdir -p "$BACKUP_DIR"
DOCKER="docker"; docker ps >/dev/null 2>&1 || DOCKER="sudo docker"

echo "[$(date '+%F %T')] Bắt đầu sao lưu"
$DOCKER exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner | gzip -9 > "$BACKUP_DIR/db_${STAMP}.sql.gz"
tar -czf "$BACKUP_DIR/media_${STAMP}.tar.gz" -C "$APP_DIR" media

# Kiểm tra bản sao lưu CSDL không rỗng
if [ "$(gunzip -c "$BACKUP_DIR/db_${STAMP}.sql.gz" | head -c 1000 | wc -c)" -lt 100 ]; then
    echo "LỖI: bản sao lưu CSDL rỗng" >&2; exit 1
fi

find "$BACKUP_DIR" -name 'db_*.sql.gz' -mtime +"$KEEP_DAYS" -delete
find "$BACKUP_DIR" -name 'media_*.tar.gz' -mtime +"$KEEP_DAYS" -delete
echo "[$(date '+%F %T')] Xong: $(du -h "$BACKUP_DIR/db_${STAMP}.sql.gz" | cut -f1) CSDL, $(du -h "$BACKUP_DIR/media_${STAMP}.tar.gz" | cut -f1) media"
