#!/usr/bin/env bash
# Điền mật khẩu ngẫu nhiên vào mọi dòng "=CHANGE_ME" trong .env. Chạy lại an toàn:
# giá trị đã điền sẽ không bị ghi đè.
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] || cp .env.example .env

changed=0
while IFS= read -r key; do
  secret=$(openssl rand -hex 32)
  sed -i.bak "s|^${key}=CHANGE_ME$|${key}=${secret}|" .env
  echo "Đã tạo ${key}"
  changed=1
done < <(grep -E '^[A-Z_]+=CHANGE_ME$' .env | cut -d= -f1)
rm -f .env.bak
chmod 600 .env

[ "$changed" = 1 ] || echo "Không có giá trị CHANGE_ME nào, giữ nguyên .env"
echo "Hãy sao lưu .env ở nơi an toàn (chứa mật khẩu DB và bí mật phiên đăng nhập)."
