#!/usr/bin/env bash
# Cài gateway lên VPS Ubuntu mới bằng một lệnh (chạy trong thư mục gateway/):
#   sudo ./scripts/install.sh
# Việc script làm: cài Docker, bật firewall (22, 80, 443), hỏi tên miền để tạo .env,
# sinh mật khẩu, kiểm tra DNS đã trỏ về VPS, khởi động stack và chờ New API sẵn sàng.
# Chạy lại an toàn: bước nào đã xong sẽ được bỏ qua.
set -euo pipefail
cd "$(dirname "$0")/.."

[ "$(id -u)" = 0 ] || { echo "Hãy chạy bằng sudo"; exit 1; }
say() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }

say "1/6 Cài Docker"
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi
docker compose version >/dev/null || { echo "Thiếu docker compose plugin"; exit 1; }
if [ -n "${SUDO_USER:-}" ] && ! id -nG "$SUDO_USER" | grep -qw docker; then
  usermod -aG docker "$SUDO_USER"
  echo "Đã thêm $SUDO_USER vào nhóm docker (đăng nhập lại để dùng docker không cần sudo)"
fi

say "2/6 Firewall"
if command -v ufw >/dev/null; then
  ufw allow 22/tcp >/dev/null
  ufw allow 80/tcp >/dev/null
  ufw allow 443/tcp >/dev/null
  ufw allow 443/udp >/dev/null
  ufw --force enable >/dev/null
  ufw status | head -8
else
  echo "Không có ufw, hãy tự mở cổng 22, 80, 443 ở firewall của nhà cung cấp VPS"
fi

say "3/6 Tạo .env"
if [ ! -f .env ]; then
  cp .env.example .env
  read -rp "Tên thương hiệu (ví dụ Aura): " brand
  read -rp "Tên miền gốc (ví dụ myapi.com): " domain
  read -rp "Email nhận thông báo chứng chỉ SSL: " email
  sed -i \
    -e "s|^BRAND_NAME=.*|BRAND_NAME=${brand}|" \
    -e "s|^SITE_NAME=.*|SITE_NAME=${brand}|" \
    -e "s|^API_DOMAIN=.*|API_DOMAIN=api.${domain}|" \
    -e "s|^CONSOLE_DOMAIN=.*|CONSOLE_DOMAIN=console.${domain}|" \
    -e "s|^PAY_DOMAIN=.*|PAY_DOMAIN=pay.${domain}|" \
    -e "s|^WEB_DOMAIN=.*|WEB_DOMAIN=${domain}|" \
    -e "s|^ACME_EMAIL=.*|ACME_EMAIL=${email}|" \
    -e "s|^SUPPORT_EMAIL=.*|SUPPORT_EMAIL=${email}|" \
    -e "s|example\.com|${domain}|g" \
    .env
else
  echo ".env đã có, giữ nguyên"
fi
./scripts/gen-secrets.sh
[ -n "${SUDO_USER:-}" ] && chown "$SUDO_USER" .env

say "4/6 Kiểm tra DNS"
set -a; . ./.env; set +a
myip=$(curl -fsS -4 -m 10 https://api.ipify.org || echo "?")
echo "IP của VPS: $myip"
bad=0
for host in "$API_DOMAIN" "$CONSOLE_DOMAIN" "$PAY_DOMAIN" "$WEB_DOMAIN"; do
  ip=$(getent ahostsv4 "$host" | awk 'NR==1{print $1}' || true)
  if [ "$ip" = "$myip" ]; then
    echo "  OK   $host → $ip"
  else
    echo "  SAI  $host → ${ip:-không phân giải được} (cần trỏ A record về $myip, Cloudflare để DNS only)"
    bad=1
  fi
done
if [ "$bad" = 1 ]; then
  read -rp "DNS chưa đúng, Caddy sẽ chưa lấy được chứng chỉ cho tên miền sai. Vẫn tiếp tục? [y/N] " ok
  [ "${ok:-N}" = y ] || exit 1
fi

say "5/6 Khởi động stack"
mkdir -p data/new-api logs/new-api
docker compose pull
docker compose up -d

say "6/6 Chờ New API sẵn sàng"
for _ in $(seq 1 60); do
  if curl -fsS -m 3 http://127.0.0.1:3000/api/status 2>/dev/null | grep -q '"success":true'; then
    docker compose ps --format 'table {{.Name}}\t{{.Status}}'
    cat <<EOF

Xong. Việc tiếp theo:
  1. Mở https://${CONSOLE_DOMAIN} , tạo tài khoản root (KHÔNG bật chế độ tự dùng / demo), bật 2FA.
  2. Cài đặt cá nhân → tạo system access token → dán vào NEWAPI_ADMIN_TOKEN trong .env
  3. python3 scripts/newapi_admin.py check
  4. Làm tiếp mục 3 của README: options, channels, pricing.
EOF
    exit 0
  fi
  sleep 5
done
echo "New API chưa lên sau 5 phút. Xem log: docker compose logs new-api"
exit 1
