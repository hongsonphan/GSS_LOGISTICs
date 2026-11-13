#!/usr/bin/env bash
# =============================================================================
# KHÔI PHỤC GSS LOGISTICS TỪ BẢN SAO LƯU (chạy trên VPS) - THAO TÁC GHI ĐÈ DỮ LIỆU THẬT
# Dùng:  bash scripts/restore_vps.sh [db_YYYYmmdd_HHMM.sql.gz] [media_YYYYmmdd_HHMM.tar.gz]
#   - Không truyền tên file: dùng bản mới nhất trong BACKUP_DIR.
#   - Tự sao lưu "pre_restore" trạng thái hiện tại trước khi ghi đè, dừng web trong lúc khôi phục.
#   - Phải gõ đúng tên CSDL để xác nhận (hoặc đặt ASSUME_YES=1 trong kịch bản tự động).
# =============================================================================
set -euo pipefail
APP_DIR="${APP_DIR:-/home/ubuntu/GSS_LOGISTICS}"
BACKUP_DIR="${BACKUP_DIR:-/home/ubuntu/backups}"
DB_CONTAINER="${DB_CONTAINER:-gss_logistics_postgres}"
WEB_CONTAINER="${WEB_CONTAINER:-gss_logistics_web}"
DB_USER="${DB_USER:-gss_logistics_user}"
DB_NAME="${DB_NAME:-gss_logistics_db}"
DOCKER="docker"; docker ps >/dev/null 2>&1 || DOCKER="sudo docker"
PSQL="$DOCKER exec -i $DB_CONTAINER psql -v ON_ERROR_STOP=1 -q -U $DB_USER"

DB_FILE="${1:-$(ls -1t "$BACKUP_DIR"/db_*.sql.gz 2>/dev/null | head -1)}"
MEDIA_FILE="${2:-}"
[ -n "$DB_FILE" ] || { echo "LỖI: không tìm thấy bản sao lưu CSDL"; exit 1; }
[ -f "$DB_FILE" ] || DB_FILE="$BACKUP_DIR/$DB_FILE"
[ -f "$DB_FILE" ] || { echo "LỖI: không có file $DB_FILE"; exit 1; }
gunzip -t "$DB_FILE" || { echo "LỖI: file sao lưu hỏng"; exit 1; }

echo "Sẽ GHI ĐÈ CSDL '$DB_NAME' bằng $(basename "$DB_FILE")${MEDIA_FILE:+ và media bằng $MEDIA_FILE}."
if [ "${ASSUME_YES:-0}" != "1" ]; then
    read -r -p "Gõ tên CSDL ($DB_NAME) để xác nhận: " ANSWER
    [ "$ANSWER" = "$DB_NAME" ] || { echo "Đã huỷ."; exit 1; }
fi

STAMP="$(date +%Y%m%d_%H%M)"
mkdir -p "$BACKUP_DIR"
echo "1/5 Sao lưu trạng thái hiện tại -> pre_restore_${STAMP}.sql.gz"
$DOCKER exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner | gzip -9 > "$BACKUP_DIR/pre_restore_${STAMP}.sql.gz"

echo "2/5 Dừng web"
$DOCKER stop "$WEB_CONTAINER" >/dev/null 2>&1 || true

echo "3/5 Khôi phục CSDL"
echo "DROP DATABASE IF EXISTS ${DB_NAME}_restoring;" | $PSQL -d postgres
echo "CREATE DATABASE ${DB_NAME}_restoring;" | $PSQL -d postgres
if gunzip -c "$DB_FILE" | $PSQL -d "${DB_NAME}_restoring" >/dev/null; then
    echo "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname IN ('$DB_NAME') AND pid <> pg_backend_pid();" | $PSQL -d postgres >/dev/null
    echo "DROP DATABASE $DB_NAME;" | $PSQL -d postgres
    echo "ALTER DATABASE ${DB_NAME}_restoring RENAME TO $DB_NAME;" | $PSQL -d postgres
else
    echo "LỖI: khôi phục thất bại, CSDL đang chạy KHÔNG bị thay đổi."
    echo "DROP DATABASE IF EXISTS ${DB_NAME}_restoring;" | $PSQL -d postgres || true
    $DOCKER start "$WEB_CONTAINER" >/dev/null 2>&1 || true
    exit 1
fi

if [ -n "$MEDIA_FILE" ]; then
    [ -f "$MEDIA_FILE" ] || MEDIA_FILE="$BACKUP_DIR/$MEDIA_FILE"
    echo "4/5 Khôi phục media (giữ bản cũ ở media.pre_restore_${STAMP})"
    [ -d "$APP_DIR/media" ] && mv "$APP_DIR/media" "$APP_DIR/media.pre_restore_${STAMP}"
    tar -xzf "$MEDIA_FILE" -C "$APP_DIR"
else
    echo "4/5 Bỏ qua media (không truyền file media)"
fi

echo "5/5 Bật lại web (tự migrate)"
$DOCKER start "$WEB_CONTAINER" >/dev/null
echo "Xong. Nếu cần quay lại: gunzip -c $BACKUP_DIR/pre_restore_${STAMP}.sql.gz | ... (xem docs/11-runbook.md mục 7)."
