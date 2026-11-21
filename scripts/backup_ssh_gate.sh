#!/usr/bin/env bash
# =============================================================================
# CỔNG SSH HẠN CHẾ cho khoá kéo sao lưu về máy local (chạy trên VPS qua authorized_keys `command=`).
# Khoá chỉ làm được: liệt kê thư mục sao lưu, đọc/tải/băm các file db_*/media_* (+ .sha256) và yêu cầu tạo bản mới.
# Mọi lệnh khác bị từ chối, nên máy local bị lộ cũng không có shell trên VPS.
# Cài: copy file này tới /home/ubuntu/gss_backup_gate.sh (chmod 700), thêm vào ~/.ssh/authorized_keys:
#   command="/home/ubuntu/gss_backup_gate.sh",restrict ssh-ed25519 AAAA... gss-backup-pull@local
# =============================================================================
set -euo pipefail
DIR="${GSS_BACKUP_DIR:-/home/ubuntu/backups_gss}"
APP="${GSS_APP_DIR:-/home/ubuntu/GSS_LOGISTICS}"
CMD="${SSH_ORIGINAL_COMMAND:-}"
NAME='(db_[0-9]{8}_[0-9]{4}\.sql\.gz|media_[0-9]{8}_[0-9]{4}\.tar\.gz)(\.sha256)?'
deny() { echo "gss_backup_gate: lệnh không được phép" >&2; exit 126; }

if [ "$CMD" = "ls -1 '$DIR'" ]; then
    exec ls -1 "$DIR"
elif [[ "$CMD" =~ ^cat\ \'$DIR/($NAME)\'$ ]]; then
    exec cat -- "$DIR/${BASH_REMATCH[1]}"
elif [[ "$CMD" =~ ^sha256sum\ \'$DIR/($NAME)\'$ ]]; then
    cd "$DIR" && exec sha256sum -- "${BASH_REMATCH[1]}"
elif [[ "$CMD" =~ ^scp\ (-[a-z]+\ )*(--\ )?$DIR/($NAME)$ ]]; then
    exec scp -f -- "$DIR/${BASH_REMATCH[3]}"
elif [ "$CMD" = "run-backup" ]; then
    cd "$APP" && BACKUP_DIR="$DIR" BACKUP_MODE=full exec bash scripts/backup_vps.sh
fi
deny
