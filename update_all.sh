#!/usr/bin/env bash
# ĐÃ VÔ HIỆU HOÁ (bảo mật). Script cũ này chạy migrate/restart thẳng trên CSDL thật, không sao lưu, không chạy thử, không quay về khi lỗi.
# Cách triển khai DUY NHẤT: local -> GitHub (CI xanh) -> VPS, qua workflow "Deploy VPS" (GitHub > Actions > Run workflow),
# hoặc trên VPS: cd /home/ubuntu/GSS_LOGISTICS && git fetch origin master && git merge --ff-only origin/master && bash scripts/deploy_vps.sh
# Xem CLAUDE.md mục "Triển khai" và docs/15-deployment-guide.md.
echo "Script này đã bị vô hiệu hoá. Dùng workflow 'Deploy VPS' hoặc scripts/deploy_vps.sh (xem docs/15-deployment-guide.md)." >&2
exit 1
