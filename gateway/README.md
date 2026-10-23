# Gateway API AI (New API)

Lõi gateway kiểu ZenMux: một API key gọi mọi mô hình, trừ tiền theo token. Dùng [New API](https://github.com/QuantumNous/new-api) bản `v0.13.2` **nguyên bản** (không sửa code, nên không phát sinh nghĩa vụ công khai mã nguồn AGPLv3), chạy bằng Docker Compose trên một VPS.

```
Khách ──HTTPS──► Caddy ─┬─ api.DOMAIN      ─► new-api:3000  (/v1, /v1/messages, /v1beta)
                        ├─ console.DOMAIN  ─► new-api:3000  (bảng điều khiển)
                        ├─ pay.DOMAIN      ─► payment:8080  (chỉ /webhooks/*, /healthz)
                        └─ DOMAIN          ─► web:3000      (website Next.js, nếu chạy cùng VPS)
new-api ─► postgres (DB newapi + DB payments), redis
```

| Thư mục | Nội dung |
|---|---|
| `docker-compose.yml` | New API, PostgreSQL 16, Redis 7, Caddy 2 (HTTPS tự động); profile `payment`, `web`, `monitoring` |
| `.env.example` | Mẫu biến môi trường |
| `caddy/Caddyfile` | Reverse proxy, tắt bộ đệm để stream mượt, timeout 10 phút |
| `postgres/init/` | Tạo DB `payments` cho dịch vụ nạp tiền |
| `config/*.example.*` | Mẫu kênh nhà cung cấp, bảng giá, cài đặt hệ thống |
| `scripts/newapi_admin.py` | Nạp cấu hình vào New API qua API quản trị |
| `scripts/backup.sh` | Sao lưu database mỗi ngày, đẩy lên Cloudflare R2 |
| `docs/INTEGRATION.md` | Hợp đồng API cho dịch vụ nạp tiền và website |

## 1. Chuẩn bị

- VPS Ubuntu 24.04, 4 vCPU, 8 GB RAM, đặt ở Singapore.
- Tên miền trên Cloudflare. Tạo 4 bản ghi A trỏ về IP VPS: `api`, `console`, `pay` và tên miền gốc (nếu website chạy trên VPS). **Để tất cả ở chế độ DNS only (đám mây xám).** Proxy Cloudflare cắt kết nối sau 100 giây, các mô hình suy luận lâu sẽ lỗi 524; Caddy cũng cần nhận trực tiếp cổng 80/443 để lấy chứng chỉ.
- Mở firewall cổng 22, 80, 443 (TCP) và 443 (UDP).

```bash
# Cài Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker

# Đặt mã nguồn vào /opt (giữ cấu trúc thư mục gateway/, payment/, web/ cạnh nhau)
sudo mkdir -p /opt && sudo chown $USER /opt
git clone <repo của anh> /opt/app && cd /opt/app/gateway
```

## 2. Cấu hình và khởi động

**Cách nhanh:** `sudo ./scripts/install.sh` làm hết mục này (cài Docker, mở firewall, hỏi tên miền để tạo `.env`, sinh mật khẩu, kiểm tra DNS, khởi động và chờ New API sẵn sàng). Chạy lại an toàn. Sau đó làm tiếp từ đoạn "Mở `https://console.DOMAIN`" bên dưới.

**Cách thủ công:**

```bash
cp .env.example .env
nano .env                      # sửa BRAND_NAME, *_DOMAIN, ACME_EMAIL
./scripts/gen-secrets.sh       # tự sinh mật khẩu DB, Redis, SESSION_SECRET...
docker compose up -d
docker compose ps              # new-api, postgres, redis phải "healthy"
```

Mở `https://console.DOMAIN`, trang khởi tạo hiện ra: tạo tài khoản **root** với mật khẩu mạnh, **không** bật "chế độ tự dùng" hay "chế độ demo". Sau đó bật 2FA cho root (Cài đặt cá nhân).

Lấy token quản trị: console → Cài đặt cá nhân → **Tạo system access token**. Dán vào `.env`:

```
NEWAPI_ADMIN_TOKEN=<token vừa tạo>
NEWAPI_ADMIN_USER_ID=1
```

Kiểm tra:

```bash
python3 scripts/newapi_admin.py check
# OK: đăng nhập là root (id 1, role 100)
```

## 3. Cài đặt hệ thống, kênh, bảng giá

```bash
cp config/settings.example.json config/settings.json
cp config/channels.example.json config/channels.json
cp config/pricing.example.csv   config/pricing.csv
```

**Cài đặt** (`config/settings.json`): nhóm giá `default` / `vip` / `reseller`, bật tự tắt kênh lỗi, thử lại 3 lần, tiền tặng khi đăng ký lấy từ `TRIAL_CREDIT_USD`, nút Nạp tiền trỏ về `https://PAY_DOMAIN`.

```bash
python3 scripts/newapi_admin.py options
```

**Kênh** (`config/channels.json`): mỗi key nhà cung cấp là một kênh. Thay `REPLACE_ME` bằng key thật (kênh còn `REPLACE_ME` sẽ bị bỏ qua). Nhiều key cho cùng model: đặt cùng `priority`, chia tải theo `weight`; kênh dự phòng đặt `priority` thấp hơn.

```bash
python3 scripts/newapi_admin.py channels --dry-run
python3 scripts/newapi_admin.py channels
python3 scripts/newapi_admin.py test-channels
```

Kênh mới có hiệu lực sau tối đa 60 giây (chu kỳ đồng bộ bộ nhớ đệm). Kênh đã có (trùng tên) không bị ghi đè; sửa trong console → Kênh.

**Bảng giá** (`config/pricing.csv`, xuất được từ Google Sheet): nhập **giá vốn** USD mỗi 1 triệu token và **% lãi**; script tự tính giá bán. Model tính theo lượt (ảnh, video) điền cột `per_request_usd`. Giá trong file mẫu chỉ để minh họa, phải thay bằng giá vốn thật.

```bash
python3 scripts/newapi_admin.py pricing --dry-run   # xem giá bán trước
python3 scripts/newapi_admin.py pricing
```

Model chưa có giá sẽ bị New API từ chối hoặc tính theo giá mặc định, nên mỗi model trong kênh đều phải có một dòng trong `pricing.csv`.

## 4. Chạy thử trước khi mời khách

1. Đăng ký một tài khoản thường ở console, cộng thử tiền: `python3 scripts/newapi_admin.py credit <user_id> 5`
2. Tạo API key ở console → Token, gọi thử:

```bash
curl https://api.DOMAIN/v1/chat/completions \
  -H "Authorization: Bearer sk-..." -H "Content-Type: application/json" \
  -d '{"model":"claude-haiku-4-5","messages":[{"role":"user","content":"xin chào"}],"stream":true}'
```

3. Dùng với Claude Code: `ANTHROPIC_BASE_URL=https://api.DOMAIN ANTHROPIC_AUTH_TOKEN=sk-... claude`
4. Gửi khoảng 20 request, so số token và tiền bị trừ (console → Nhật ký) với trang thống kê của nhà cung cấp.

Đã kiểm chứng trên bản dựng thử: cộng $10 qua API quản trị, gọi `gpt-4o-mini` qua Caddy với 1 triệu token vào và 1 triệu token ra theo giá bán $0.18 và $0.72, số dư giảm đúng $0.90.

## 5. Bật dịch vụ nạp tiền, website, giám sát

```bash
# Dịch vụ nạp tiền (mã nguồn ở ../payment): điền NOWPAYMENTS_* trong .env trước
docker compose --profile payment up -d --build

# Website Next.js chạy cùng VPS (bỏ qua nếu dùng Vercel)
docker compose --profile web up -d --build

# Uptime Kuma, mở bằng: ssh -L 3001:127.0.0.1:3001 user@vps rồi vào http://localhost:3001
docker compose --profile monitoring up -d
```

Trong Uptime Kuma nên tạo: HTTP `https://api.DOMAIN/api/status` (từ khóa `"success":true`), HTTP `https://pay.DOMAIN/healthz`, và gắn thông báo Telegram.

Nếu volume Postgres đã tồn tại trước khi có `postgres/init/01-payments.sh`, tạo DB payments thủ công:

```bash
set -a; . ./.env; set +a
docker compose exec -T postgres psql -U newapi -d newapi \
  -c "CREATE ROLE payments LOGIN PASSWORD '$PAYMENTS_DB_PASSWORD';" \
  -c "CREATE DATABASE payments OWNER payments;"
```

## 6. Sao lưu

```bash
sudo apt install -y rclone && rclone config     # tạo remote tới Cloudflare R2 (loại S3, provider Cloudflare)
# đặt RCLONE_REMOTE=r2:<bucket>/gateway trong .env
./scripts/backup.sh                             # chạy thử
crontab -e
# 15 3 * * * /opt/app/gateway/scripts/backup.sh >> /var/log/gateway-backup.log 2>&1
```

Khôi phục: `gunzip -c gateway-XXXX.sql.gz | docker compose exec -T postgres psql -U newapi -d postgres`

Ngoài database, hãy cất bản sao `.env` ở nơi an toàn (trình quản lý mật khẩu).

## 7. Vận hành hằng ngày

| Việc | Lệnh |
|---|---|
| Xem log | `docker compose logs -f new-api` |
| Khởi động lại | `docker compose restart new-api` |
| Cộng tiền tay khi hỗ trợ khách | `python3 scripts/newapi_admin.py credit <user_id> <usd>` |
| Đổi giá | sửa `config/pricing.csv` rồi `newapi_admin.py pricing` |
| Đổi nhóm khách sang vip / đại lý | console → Người dùng → sửa → Nhóm |
| Mở console nội bộ không qua Internet | `ssh -L 3000:127.0.0.1:3000 user@vps` |

## 8. Bảo mật

- Chỉ Caddy mở cổng ra Internet; New API (3000) và Uptime Kuma (3001) chỉ nghe trên 127.0.0.1; Postgres và Redis không mở cổng.
- Bật 2FA cho root, không dùng root để thử nghiệm.
- Key nhà cung cấp chỉ admin thấy; không để khách thấy trang Kênh.
- Bật xác minh email và Turnstile khi mở đăng ký công khai (báo trước cho website vì luồng đăng ký thay đổi).
- Số dư mỗi tài khoản tối đa khoảng $4 294 (giới hạn kiểu số của New API).

## 9. Nâng cấp New API

Đổi `NEWAPI_VERSION` trong `.env`, chạy `./scripts/backup.sh`, rồi `docker compose pull new-api && docker compose up -d new-api`. Các bản `v0.13.x` mới hơn nâng cấp được bình thường. **Không lên `v1.0.x`** khi website và dịch vụ nạp tiền chưa được sửa: bản này đổi toàn bộ cách đăng nhập và token quản trị (chi tiết trong `docs/INTEGRATION.md`, mục 6).
