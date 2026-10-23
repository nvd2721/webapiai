#!/usr/bin/env bash
# Sao lưu mọi database (newapi + payments) bằng pg_dumpall, nén, giữ N ngày,
# rồi đẩy lên Cloudflare R2 nếu có RCLONE_REMOTE. Đặt cron chạy mỗi ngày:
#   15 3 * * * /opt/gateway/scripts/backup.sh >> /var/log/gateway-backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a

BACKUP_DIR=${BACKUP_DIR:-/var/backups/gateway}
KEEP=${BACKUP_KEEP_DAYS:-30}
mkdir -p "$BACKUP_DIR"
file="$BACKUP_DIR/gateway-$(date +%Y%m%d-%H%M%S).sql.gz"

notify() {
  [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ] || return 0
  curl -fsS -m 10 "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d chat_id="$TELEGRAM_CHAT_ID" --data-urlencode text="$1" >/dev/null || true
}
trap 'notify "❌ Sao lưu gateway thất bại trên $(hostname)"' ERR

docker compose exec -T postgres pg_dumpall -U newapi | gzip -9 > "$file.tmp"
mv "$file.tmp" "$file"
echo "$(date -Is) đã tạo $file ($(du -h "$file" | cut -f1))"

find "$BACKUP_DIR" -name 'gateway-*.sql.gz' -mtime +"$KEEP" -delete

if [ -n "${RCLONE_REMOTE:-}" ]; then
  rclone copy "$file" "$RCLONE_REMOTE" --quiet
  rclone delete "$RCLONE_REMOTE" --min-age "${KEEP}d" --quiet || true
  echo "$(date -Is) đã đẩy lên $RCLONE_REMOTE"
fi
