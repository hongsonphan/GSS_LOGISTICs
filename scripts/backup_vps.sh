#!/usr/bin/env bash
# =============================================================================
# SAO LƯU TỰ ĐỘNG GSS LOGISTICS (chạy trên VPS)
# - CSDL PostgreSQL (pg_dump nén) + thư mục media/ (chứng từ, hợp đồng, ảnh)
# - Ghi checksum sha256 cho từng bản; file local chỉ chủ sở hữu đọc được (umask 077)
# - Bản SAO NGOÀI MÁY CHỦ (docs/16, B1/B2): nếu đặt OFFSITE_REMOTE + BACKUP_AGE_RECIPIENT thì mã hoá bằng age
#   rồi đẩy lên nơi lưu qua rclone. Đã đặt mà lỗi -> script thoát mã khác 0 (không im lặng bỏ qua).
# - Giữ KEEP_DAYS ngày gần nhất, tự xoá bản cũ hơn
#
# Biến môi trường (đặt trong crontab hoặc /home/ubuntu/backups/.backup.env, file được source nếu có):
#   BACKUP_MODE=full|db        full (mặc định) = CSDL + media; db = chỉ CSDL (chạy dày, giảm RPO)
#   OFFSITE_REMOTE=remote:duong/dan   remote rclone đã cấu hình (S3-tương thích, SFTP, ổ khác...)
#   BACKUP_AGE_RECIPIENT=age1...      khoá CÔNG KHAI age; khoá riêng cất ở nơi khác, KHÔNG để trên VPS
#   OFFSITE_KEEP_DAYS=60              giữ bao lâu ở nơi lưu ngoài (mặc định 60)
# Lịch gợi ý (deploy_vps.sh cài sẵn):
#   0 2 * * *      backup_vps.sh                     (đầy đủ)
#   15 6,10,14,18,22 * * *  BACKUP_MODE=db backup_vps.sh   (chỉ CSDL, RPO <= 4 giờ)
# Khôi phục: bash scripts/restore_vps.sh  (xem docs/16-data-security-dr.md mục 4)
# =============================================================================
set -euo pipefail
umask 077

APP_DIR="${APP_DIR:-/home/ubuntu/GSS_LOGISTICS}"
BACKUP_DIR="${BACKUP_DIR:-/home/ubuntu/backups}"
[ -f "$BACKUP_DIR/.backup.env" ] && . "$BACKUP_DIR/.backup.env"
KEEP_DAYS="${KEEP_DAYS:-14}"
DB_CONTAINER="${DB_CONTAINER:-gss_logistics_postgres}"
DB_USER="${DB_USER:-gss_logistics_user}"
DB_NAME="${DB_NAME:-gss_logistics_db}"
BACKUP_MODE="${BACKUP_MODE:-full}"
OFFSITE_REMOTE="${OFFSITE_REMOTE:-}"
BACKUP_AGE_RECIPIENT="${BACKUP_AGE_RECIPIENT:-}"
OFFSITE_KEEP_DAYS="${OFFSITE_KEEP_DAYS:-60}"
STAMP="$(date +%Y%m%d_%H%M)"

mkdir -p "$BACKUP_DIR"; chmod 700 "$BACKUP_DIR"
DOCKER="docker"; docker ps >/dev/null 2>&1 || DOCKER="sudo docker"

echo "[$(date '+%F %T')] Bắt đầu sao lưu (chế độ: $BACKUP_MODE)"
DB_FILE="$BACKUP_DIR/db_${STAMP}.sql.gz"
$DOCKER exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner | gzip -9 > "$DB_FILE"
FILES=("$DB_FILE")
if [ "$BACKUP_MODE" = "full" ]; then
    MEDIA_FILE="$BACKUP_DIR/media_${STAMP}.tar.gz"
    tar -czf "$MEDIA_FILE" -C "$APP_DIR" media
    FILES+=("$MEDIA_FILE")
fi

# Kiểm tra: gzip nguyên vẹn, có nội dung, có dấu hiệu kết thúc dump hợp lệ
gzip -t "$DB_FILE" || { echo "LỖI: bản sao lưu CSDL hỏng (gzip)" >&2; exit 1; }
if [ "$(gunzip -c "$DB_FILE" | head -c 1000 | wc -c)" -lt 100 ]; then
    echo "LỖI: bản sao lưu CSDL rỗng" >&2; exit 1
fi
gunzip -c "$DB_FILE" | tail -n 5 | grep -q 'PostgreSQL database dump complete' \
    || { echo "LỖI: bản sao lưu CSDL không có dòng kết thúc (dump bị cắt dở)" >&2; exit 1; }
[ -z "${MEDIA_FILE:-}" ] || tar -tzf "$MEDIA_FILE" >/dev/null || { echo "LỖI: bản sao lưu media hỏng" >&2; exit 1; }

# Checksum (dùng khi khôi phục và khi đối chiếu bản ngoài máy chủ)
for f in "${FILES[@]}"; do ( cd "$BACKUP_DIR" && sha256sum "$(basename "$f")" > "$(basename "$f").sha256" ); done

# Bản sao ngoài máy chủ, mã hoá
if [ -n "$OFFSITE_REMOTE" ] || [ -n "$BACKUP_AGE_RECIPIENT" ]; then
    [ -n "$OFFSITE_REMOTE" ] && [ -n "$BACKUP_AGE_RECIPIENT" ] \
        || { echo "LỖI: phải đặt ĐỦ OFFSITE_REMOTE và BACKUP_AGE_RECIPIENT (không đẩy bản chưa mã hoá ra ngoài)" >&2; exit 1; }
    command -v age >/dev/null || { echo "LỖI: chưa cài age (apt install age)" >&2; exit 1; }
    command -v rclone >/dev/null || { echo "LỖI: chưa cài rclone" >&2; exit 1; }
    for f in "${FILES[@]}"; do
        age -r "$BACKUP_AGE_RECIPIENT" -o "$f.age" "$f"
        ( cd "$BACKUP_DIR" && sha256sum "$(basename "$f").age" > "$(basename "$f").age.sha256" )
        rclone copyto "$f.age" "$OFFSITE_REMOTE/$(basename "$f").age"
        rclone copyto "$f.age.sha256" "$OFFSITE_REMOTE/$(basename "$f").age.sha256"
        # đối chiếu bản đã lên nơi lưu ngoài có đúng checksum
        # (tải lại và băm: tốn băng thông nhưng đúng với mọi loại nơi lưu, kể cả loại không có băm sẵn)
        [ "$(rclone cat "$OFFSITE_REMOTE/$(basename "$f").age" | sha256sum | cut -d' ' -f1)" \
          = "$(cut -d' ' -f1 "$f.age.sha256")" ] \
            || { echo "LỖI: checksum bản ngoài máy chủ không khớp: $(basename "$f").age" >&2; rm -f "$f.age" "$f.age.sha256"; exit 1; }
        rm -f "$f.age" "$f.age.sha256"
    done
    rclone delete "$OFFSITE_REMOTE" --min-age "${OFFSITE_KEEP_DAYS}d" || echo "CẢNH BÁO: không dọn được bản cũ ngoài máy chủ" >&2
    echo "Đã đẩy bản mã hoá lên $OFFSITE_REMOTE"
else
    echo "CẢNH BÁO: chưa cấu hình bản sao NGOÀI máy chủ (OFFSITE_REMOTE/BACKUP_AGE_RECIPIENT) - mất VPS là mất cả bản sao lưu" >&2
fi

find "$BACKUP_DIR" \( -name 'db_*.sql.gz*' -o -name 'media_*.tar.gz*' \) -mtime +"$KEEP_DAYS" -delete
echo "$(date +%s)" > "$BACKUP_DIR/.last_ok"
echo "[$(date '+%F %T')] Xong: $(du -h "$DB_FILE" | cut -f1) CSDL${MEDIA_FILE:+, $(du -h "$MEDIA_FILE" | cut -f1) media}"
