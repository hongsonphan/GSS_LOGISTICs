# Chạy GSS local: PostgreSQL trong Docker (cổng 5437) + Django trên máy host (cổng 8088).
#   .\scripts\run_local.ps1            # khởi động DB, migrate, chạy server
#   .\scripts\run_local.ps1 -Seed      # thêm: cấu hình GSS + dữ liệu minh họa + tài khoản gss_admin
param([switch]$Seed, [int]$Port = 8088)
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)

$env:DEBUG = 'True'
if (-not $env:SECRET_KEY) { $env:SECRET_KEY = 'local-dev-key-not-for-prod' }
$env:DB_ENGINE = 'django.db.backends.postgresql'
$env:DB_HOST = '127.0.0.1'
$env:DB_PORT = '5437'
$env:DB_NAME = 'gss_local_db'
$env:DB_USER = 'gss_local_user'
$pw = if ($env:GSS_LOCAL_DB_PASSWORD) { $env:GSS_LOCAL_DB_PASSWORD } else { 'gss_local_dev_only' }
$env:DB_PASSWORD = $pw
$env:GSS_LOCAL_DB_PASSWORD = $pw
$env:PYTHONIOENCODING = 'utf-8'

docker compose -f docker-compose.local.yml up -d --wait
if ($LASTEXITCODE -ne 0) { throw 'Không khởi động được PostgreSQL trong Docker.' }

python manage.py migrate
if ($Seed) { python manage.py seed_gss_demo --create-admin }
python manage.py runserver $Port
