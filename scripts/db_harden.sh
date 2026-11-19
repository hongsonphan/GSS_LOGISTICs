#!/usr/bin/env bash
# =============================================================================
# HẠ QUYỀN CSDL: ứng dụng chạy bằng user thường, không phải superuser (docs/16, S1)
# Image postgres coi POSTGRES_USER là SUPERUSER; nếu web dùng chính user đó thì một lỗi mã có thể đọc/ghi mọi CSDL,
# tạo/xoá vai trò, tắt RLS. Script này (chạy bằng superuser, idempotent):
#   1. tạo user ứng dụng $APP_DB_USER (LOGIN, NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOBYPASSRLS)
#   2. tạo sẵn vai trò gss_rls (RLS) và cấp tư cách thành viên cho user ứng dụng
#   3. chuyển chủ sở hữu CSDL, schema public, bảng, sequence, view, hàm sang user ứng dụng
# Superuser (gss_logistics_user) GIỮ NGUYÊN cho sao lưu/khôi phục; KHÔNG dùng cho web.
#
# Dùng:   APP_DB_PASSWORD='...' bash scripts/db_harden.sh
# Sau đó đặt trong .env:  APP_DB_USER=gss_app  APP_DB_PASSWORD=...   rồi `docker compose up -d web`
# Quay lại: bỏ APP_DB_USER/APP_DB_PASSWORD khỏi .env (web dùng lại superuser); chủ sở hữu mới không ảnh hưởng.
# =============================================================================
set -euo pipefail
DB_CONTAINER="${DB_CONTAINER:-gss_logistics_postgres}"
SUPER_USER="${SUPER_USER:-gss_logistics_user}"
DB_NAME="${DB_NAME:-gss_logistics_db}"
APP_DB_USER="${APP_DB_USER:-gss_app}"
RLS_ROLE="${RLS_ROLE:-gss_rls}"
: "${APP_DB_PASSWORD:?Đặt APP_DB_PASSWORD (mật khẩu mới, khác mật khẩu superuser)}"
case "$APP_DB_USER$RLS_ROLE$DB_NAME" in *[!A-Za-z0-9_]*) echo "LỖI: tên chỉ gồm chữ, số, gạch dưới"; exit 1;; esac
case "$APP_DB_PASSWORD" in *"'"*) echo "LỖI: mật khẩu không được chứa dấu nháy đơn"; exit 1;; esac
[ "$APP_DB_USER" != "$SUPER_USER" ] || { echo "LỖI: user ứng dụng phải khác superuser"; exit 1; }
DOCKER="docker"; docker ps >/dev/null 2>&1 || DOCKER="sudo docker"
PSQL="$DOCKER exec -i $DB_CONTAINER psql -v ON_ERROR_STOP=1 -q -U $SUPER_USER"

echo "1/3 Tạo user '$APP_DB_USER' và vai trò '$RLS_ROLE'"
$PSQL -d postgres <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '$APP_DB_USER') THEN
    CREATE ROLE $APP_DB_USER LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '$RLS_ROLE') THEN
    CREATE ROLE $RLS_ROLE NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT;
  END IF;
END
\$\$;
ALTER ROLE $APP_DB_USER WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD '$APP_DB_PASSWORD';
GRANT $RLS_ROLE TO $APP_DB_USER;
ALTER DATABASE $DB_NAME OWNER TO $APP_DB_USER;
SQL

echo "2/3 Chuyển chủ sở hữu đối tượng trong '$DB_NAME'"
$PSQL -d "$DB_NAME" <<SQL
ALTER SCHEMA public OWNER TO $APP_DB_USER;
DO \$\$
DECLARE r record;
BEGIN
  FOR r IN SELECT quote_ident(schemaname)||'.'||quote_ident(tablename) AS n FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE 'ALTER TABLE '||r.n||' OWNER TO $APP_DB_USER';
  END LOOP;
  FOR r IN SELECT quote_ident(schemaname)||'.'||quote_ident(sequencename) AS n FROM pg_sequences WHERE schemaname = 'public' LOOP
    EXECUTE 'ALTER SEQUENCE '||r.n||' OWNER TO $APP_DB_USER';
  END LOOP;
  FOR r IN SELECT quote_ident(schemaname)||'.'||quote_ident(viewname) AS n FROM pg_views WHERE schemaname = 'public' LOOP
    EXECUTE 'ALTER VIEW '||r.n||' OWNER TO $APP_DB_USER';
  END LOOP;
  FOR r IN SELECT p.oid::regprocedure AS n FROM pg_proc p
           WHERE p.pronamespace = 'public'::regnamespace
             AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e') LOOP
    EXECUTE 'ALTER FUNCTION '||r.n||' OWNER TO $APP_DB_USER';
  END LOOP;
END
\$\$;
SQL

echo "3/3 Kiểm tra"
$PSQL -d postgres -t -A -c "SELECT rolname, rolsuper, rolcreaterole, rolcreatedb, rolbypassrls FROM pg_roles WHERE rolname IN ('$APP_DB_USER','$RLS_ROLE')"
LEFT=$($PSQL -d "$DB_NAME" -t -A -c "SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tableowner <> '$APP_DB_USER'")
[ "$LEFT" = "0" ] || { echo "LỖI: còn $LEFT bảng chưa đổi chủ"; exit 1; }
echo "XONG. Đặt APP_DB_USER=$APP_DB_USER và APP_DB_PASSWORD trong .env rồi khởi động lại web (docker compose up -d web)."
