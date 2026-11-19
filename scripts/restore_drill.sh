#!/usr/bin/env bash
# =============================================================================
# DIỄN TẬP KHÔI PHỤC (chạy trên VPS, chỉ đọc với dữ liệu thật)
# - Lấy bản sao lưu CSDL mới nhất, khôi phục vào CSDL tạm gss_restore_drill (cùng container Postgres)
# - So số dòng các bảng chính với CSDL đang chạy, kiểm tra file media nén đọc được
# - Xoá CSDL tạm. Thoát mã khác 0 nếu khôi phục lỗi hoặc dữ liệu lệch bất thường.
# Chạy tay: bash scripts/restore_drill.sh   |  Tự động: .github/workflows/restore-drill.yml (hằng tuần)
# =============================================================================
set -uo pipefail
BACKUP_DIR="${BACKUP_DIR:-/home/ubuntu/backups}"
DB_CONTAINER="${DB_CONTAINER:-gss_logistics_postgres}"
DB_USER="${DB_USER:-gss_logistics_user}"
DB_NAME="${DB_NAME:-gss_logistics_db}"
DRILL_DB="gss_restore_drill"
DOCKER="docker"; docker ps >/dev/null 2>&1 || DOCKER="sudo docker"
PSQL="$DOCKER exec -i $DB_CONTAINER psql -v ON_ERROR_STOP=1 -q -U $DB_USER"

LATEST_DB=$(ls -1t "$BACKUP_DIR"/db_*.sql.gz 2>/dev/null | head -1)
LATEST_MEDIA=$(ls -1t "$BACKUP_DIR"/media_*.tar.gz 2>/dev/null | head -1)
[ -n "$LATEST_DB" ] || { echo "LỖI: không có bản sao lưu CSDL trong $BACKUP_DIR"; exit 1; }
AGE_H=$(( ( $(date +%s) - $(stat -c %Y "$LATEST_DB") ) / 3600 ))
echo "Bản sao lưu mới nhất: $(basename "$LATEST_DB") ($(du -h "$LATEST_DB" | cut -f1), ${AGE_H} giờ trước)"
STATUS=0
[ "$AGE_H" -le 30 ] || { echo "CẢNH BÁO: bản sao lưu cũ hơn 30 giờ — kiểm tra lịch cron sao lưu"; STATUS=2; }

cleanup() { echo "DROP DATABASE IF EXISTS $DRILL_DB;" | $PSQL -d postgres >/dev/null 2>&1; }
trap cleanup EXIT
cleanup
echo "CREATE DATABASE $DRILL_DB;" | $PSQL -d postgres || { echo "LỖI: không tạo được CSDL tạm"; exit 1; }
START=$(date +%s)
if ! gunzip -c "$LATEST_DB" | $PSQL -d "$DRILL_DB" >/dev/null 2>/tmp/restore_drill.err; then
    echo "LỖI: khôi phục thất bại"; tail -5 /tmp/restore_drill.err; exit 1
fi
echo "Khôi phục xong trong $(( $(date +%s) - START )) giây"

printf "%-34s %10s %10s\n" "Bảng" "Sao lưu" "Đang chạy"
for T in dispatch_dispatchtrip dispatch_bookingvendorallocation depot_yard_depotcontainermovement qr_tracking_qrscanlog billing_tripexpense billing_cashtransaction master_data_party customers_quotation \
         personnel_employee fleet_vehicle ledger_journalentry auth_user; do
    B=$(echo "SELECT count(*) FROM $T;" | $PSQL -d "$DRILL_DB" -t -A 2>/dev/null || echo "?")
    L=$(echo "SELECT count(*) FROM $T;" | $PSQL -d "$DB_NAME" -t -A 2>/dev/null || echo "?")
    printf "%-34s %10s %10s\n" "$T" "$B" "$L"
    if [ "$B" = "?" ] || [ "$L" = "?" ]; then STATUS=1; continue; fi
    # Bản sao lưu không được ít hơn dữ liệu hiện tại quá 20% (dữ liệu mới phát sinh sau giờ sao lưu là bình thường)
    if [ "$L" -gt 20 ] && [ $(( B * 100 / L )) -lt 80 ]; then echo "  -> LỆCH BẤT THƯỜNG"; STATUS=1; fi
done
MIG=$(echo "SELECT count(*) FROM django_migrations;" | $PSQL -d "$DRILL_DB" -t -A)
echo "Số migration trong bản sao lưu: $MIG"

# Tính toàn vẹn dữ liệu, không chỉ đếm dòng (docs/16, B5)
UNBAL=$(echo "SELECT count(*) FROM (SELECT entry_id FROM ledger_journalline GROUP BY entry_id HAVING sum(debit) <> sum(credit)) x;" | $PSQL -d "$DRILL_DB" -t -A 2>/dev/null || echo "?")
echo "Bút toán không cân Nợ/Có trong bản sao lưu: $UNBAL"
{ [ "$UNBAL" = "0" ]; } || { echo "  -> SAI: sổ cái không cân hoặc không đọc được"; STATUS=1; }
STMT_BAD=$(echo "SELECT count(*) FROM gss_statement s WHERE s.status = 'LOCKED' AND NOT s.is_deleted AND NOT EXISTS (SELECT 1 FROM gss_statementline l WHERE l.statement_id = s.id);" | $PSQL -d "$DRILL_DB" -t -A 2>/dev/null || echo "?")
echo "Bảng kê đã chốt nhưng không có dòng nào: $STMT_BAD"
{ [ "$STMT_BAD" = "0" ]; } || { echo "  -> BẤT THƯỜNG hoặc không kiểm được: xem lại bảng kê"; STATUS=1; }
RLS_TBL=$(echo "SELECT count(*) FROM pg_policies WHERE policyname = 'gss_tenant_isolation';" | $PSQL -d "$DRILL_DB" -t -A)
TRG=$(echo "SELECT count(*) FROM pg_trigger WHERE tgname = 'gss_append_only';" | $PSQL -d "$DRILL_DB" -t -A)
echo "Policy RLS: $RLS_TBL · trigger nhật ký bất biến: $TRG (hai thứ này được dựng lại khi web chạy migrate)"
# Checksum do backup_vps.sh ghi
if [ -f "$LATEST_DB.sha256" ]; then
    if ( cd "$BACKUP_DIR" && sha256sum -c "$(basename "$LATEST_DB").sha256" >/dev/null 2>&1 ); then echo "Checksum CSDL: khớp"; else echo "LỖI: sai checksum CSDL"; STATUS=1; fi
else
    echo "CẢNH BÁO: bản sao lưu CSDL chưa có checksum (.sha256)"; [ "$STATUS" = 0 ] && STATUS=2
fi
if [ -f "$BACKUP_DIR/.last_ok" ]; then
    LAST_AGE=$(( ( $(date +%s) - $(cat "$BACKUP_DIR/.last_ok") ) / 3600 ))
    echo "Lần sao lưu thành công gần nhất (kể cả bản chỉ CSDL): ${LAST_AGE} giờ trước"
    [ "$LAST_AGE" -le 30 ] || { echo "CẢNH BÁO: quá 30 giờ không có lần sao lưu thành công"; [ "$STATUS" = 0 ] && STATUS=2; }
fi
echo "THỜI GIAN KHÔI PHỤC CSDL (RTO thực đo được, chỉ phần CSDL): $(( $(date +%s) - START )) giây"

if [ -n "$LATEST_MEDIA" ]; then
    if tar -tzf "$LATEST_MEDIA" >/dev/null 2>&1; then
        echo "Media: $(basename "$LATEST_MEDIA") đọc được, $(tar -tzf "$LATEST_MEDIA" | grep -vc '/$') tệp"
        # Giải nén thử 3 tệp mẫu, kiểm tra không rỗng
        SAMPLE_DIR="$(mktemp -d)"; trap 'rm -rf "$SAMPLE_DIR"; cleanup' EXIT
        tar -tzf "$LATEST_MEDIA" | grep -v '/$' | head -3 | while read -r M; do
            tar -xzf "$LATEST_MEDIA" -C "$SAMPLE_DIR" "$M" 2>/dev/null
            [ -s "$SAMPLE_DIR/$M" ] || echo "LỖI: tệp mẫu rỗng/không giải nén được: $M"
        done | tee /tmp/restore_drill_media.err
        [ ! -s /tmp/restore_drill_media.err ] || STATUS=1
    else
        echo "LỖI: tệp media nén hỏng"; STATUS=1
    fi
else
    echo "CẢNH BÁO: không có bản sao lưu media"; STATUS=2
fi
[ "$STATUS" = 0 ] && echo "KẾT QUẢ: ĐẠT" || echo "KẾT QUẢ: CẦN XEM LẠI (mã $STATUS)"
exit $STATUS
