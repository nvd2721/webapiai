# Hợp đồng tích hợp gateway (New API v0.13.2)

Tài liệu cho dịch vụ nạp tiền và website Next.js. Mọi thông tin dưới đây đã đối chiếu với mã nguồn tag `v0.13.2` của QuantumNous/new-api. Nâng cấp New API lên bản khác phải đọc lại mục "Khi nâng cấp" ở cuối.

## 1. Mạng và địa chỉ

| Ai gọi | Địa chỉ | Ghi chú |
|---|---|---|
| Khách (SDK, Claude Code, Cursor) | `https://API_DOMAIN/v1` | OpenAI `/v1/chat/completions`, `/v1/responses`, `/v1/embeddings`, `/v1/images/generations`; Anthropic `POST /v1/messages`; Gemini `/v1beta/models/{model}:generateContent` |
| Khách (trình duyệt) | `https://CONSOLE_DOMAIN` | Console gốc của New API: đăng ký, tạo key, log, ví |
| Dịch vụ nội bộ | `http://new-api:3000` | Trong docker network tên `gateway` |
| Script trên VPS | `http://127.0.0.1:3000` | Cổng chỉ mở cho localhost |

Dự án compose khác tham gia mạng bằng:

```yaml
networks:
  gateway:
    external: true
```

Caddy đã định tuyến sẵn `https://PAY_DOMAIN` → `payment:8080` và `https://WEB_DOMAIN` → `web:3000` (service bật bằng profile `payment`, `web`).

## 2. Đơn vị tiền

- 1 USD = **500 000 quota** (`QuotaPerUnit`, mặc định, không đổi).
- `ModelRatio` 1 = $2 cho 1 triệu token đầu vào. Giá ra = giá vào × `CompletionRatio`. Giá cache = giá vào × `CacheRatio`. Model tính theo lượt dùng `ModelPrice` (USD mỗi lượt).
- Giá cuối mà khách trả = giá model × `GroupRatio` của nhóm khách (`default` 1, `vip` 0.9, `reseller` 0.8, xem `config/settings.example.json`).
- **Giới hạn cứng:** cột `users.quota` là số nguyên 32 bit, tối đa 2 147 483 647 quota ≈ **$4 294** mỗi tài khoản. Dịch vụ nạp tiền phải chặn mọi giao dịch làm số dư vượt khoảng $4 000.

## 3. Xác thực quản trị (dịch vụ nạp tiền, script)

Tài khoản root đăng nhập console → Cài đặt cá nhân → tạo **system access token**. Bản v0.13.2 chỉ có một token loại này cho mỗi tài khoản, không có scope; tạo lại token sẽ vô hiệu token cũ.

Mọi request quản trị gửi hai header:

```
Authorization: <NEWAPI_ADMIN_TOKEN>
New-Api-User: <NEWAPI_ADMIN_USER_ID>
```

`New-Api-User` là bắt buộc ở v0.13.2 và phải trùng id của chủ token.

**Mọi lỗi nghiệp vụ trả HTTP 200 với `{"success": false, "message": "..."}`.** Luôn kiểm tra trường `success`.

## 4. API cho dịch vụ nạp tiền

### Cộng tiền

```http
POST http://new-api:3000/api/user/manage
Content-Type: application/json

{"id": 42, "action": "add_quota", "mode": "add", "value": 10000000}
```

- `value` = USD thực nhận × 500 000, số nguyên dương. Ví dụ $20 → `10000000`.
- Thành công: `{"success": true, ...}`. New API ghi một dòng log loại "quản lý" vào lịch sử của khách.
- **Không idempotent.** Gọi hai lần là cộng hai lần. Dịch vụ nạp tiền phải khóa theo mã hóa đơn (ghi trạng thái `crediting` trong DB của mình trong cùng giao dịch, rồi mới gọi API, rồi đánh dấu `credited`).
- `mode` còn có `subtract` (trừ, dùng khi hoàn tiền) và `override` (không dùng).

### Tra cứu người dùng

```http
GET /api/user/42                         → data: {id, username, email, quota, used_quota, group, status, ...}
GET /api/user/search?keyword=<username|email>&p=1&page_size=10
                                          → data: {items: [...], total, page, page_size}
```

`status` 1 = hoạt động, 2 = bị khóa. Không cộng tiền cho tài khoản bị khóa.

### Database riêng

`postgres/init/01-payments.sh` tạo role và database `payments` khi volume Postgres còn trống:

```
PAYMENTS_DATABASE_URL=postgresql://payments:${PAYMENTS_DB_PASSWORD}@postgres:5432/payments
```

Biến này được compose truyền sẵn vào service `payment`, cùng `NEWAPI_INTERNAL_URL=http://new-api:3000`, `PORT=8080`, `PUBLIC_URL=https://PAY_DOMAIN`, `SITE_URL=https://WEB_DOMAIN` và toàn bộ `.env` (gồm `NEWAPI_ADMIN_TOKEN`, `NEWAPI_ADMIN_USER_ID`, `PAYMENT_API_SECRET`, `PAYMENT_ADMIN_SECRET`, `NOWPAYMENTS_*`, `QUOTA_PER_USD`).

Caddy chỉ mở `https://PAY_DOMAIN/webhooks/*` và `/healthz` ra Internet; mọi đường dẫn khác trả 404. Website gọi `/api/invoices*` qua `http://payment:8080` (biến `PAYMENT_INTERNAL_URL` trong service `web`) kèm `PAYMENT_API_SECRET`.

### Nút "Nạp tiền" trong console

`newapi_admin.py options` đặt `TopUpLink = https://PAY_DOMAIN`, nên trang Ví của console hiện nút dẫn sang dịch vụ nạp tiền. Dịch vụ nạp tiền tự lo việc xác định khách (ví dụ đăng nhập lại bằng tài khoản New API qua `/api/user/login`, hoặc website truyền sang).

## 5. API cho website Next.js (BFF)

Website gọi New API phía máy chủ bằng phiên đăng nhập của chính khách, không dùng token admin.

### Phiên đăng nhập

- `POST /api/user/register` `{"username","password","email"?, "aff_code"?}`. Username tối đa 20 ký tự, mật khẩu 8 đến 20 ký tự.
- `POST /api/user/login` `{"username","password"}` → `data` là user (có `id`), kèm `Set-Cookie: session=...` (cookie Gin, `SameSite=Strict`, không `Secure`). Giữ cookie này phía server.
- Nếu khách bật 2FA, login trả `data.require_2fa = true`; tiếp theo gọi `POST /api/user/login/2fa`.
- Mọi request sau: gửi lại cookie `session` **và** header `New-Api-User: <user id>`.

### Endpoint dùng nhiều

| Việc | Endpoint |
|---|---|
| Thông tin, số dư | `GET /api/user/self` (`quota`, `used_quota`, `group`, `aff_code`) |
| Model khách được dùng | `GET /api/user/models` |
| Danh sách key | `GET /api/token/?p=1&page_size=20` (key bị che) |
| Lấy key đầy đủ | `POST /api/token/{id}/key` → `data.key` (thêm tiền tố `sk-` khi hiển thị) |
| Tạo key | `POST /api/token/` `{"name","remain_quota","unlimited_quota","expired_time":-1,"model_limits_enabled","model_limits":"a,b","allow_ips":"","group":""}` |
| Sửa / xóa key | `PUT /api/token/` (kèm `id`), `DELETE /api/token/{id}` |
| Log từng request | `GET /api/log/self?p=1&page_size=20&type=2` (type 2 = tiêu thụ) |
| Thống kê theo ngày | `GET /api/data/self?start_timestamp=&end_timestamp=` |
| Lịch sử nạp | `GET /api/user/topup/self` (chỉ ghi nạp qua cổng có sẵn của New API; nạp coin xem ở dịch vụ nạp tiền) |
| Bảng giá công khai | `GET /api/pricing` (không cần đăng nhập) → `data[]` gồm `model_name`, `quota_type` (0 theo token, 1 theo lượt), `model_ratio`, `completion_ratio`, `cache_ratio`, `model_price`, `enable_groups`, `supported_endpoint_types`; cùng `group_ratio` |
| Trạng thái hệ thống | `GET /api/status` (không cần đăng nhập) |

Đổi giá sang USD cho 1 triệu token: `giá vào = model_ratio × 2 × group_ratio`, `giá ra = giá vào × completion_ratio`; model theo lượt: `model_price × group_ratio` USD.

### Giới hạn tốc độ theo IP

New API giới hạn theo IP khách: đăng nhập, đăng ký, lấy key đầy đủ 20 lần mỗi 20 phút; API web 120 lần mỗi 3 phút (đặt trong `.env`). New API tin header `X-Forwarded-For`, nên **BFF phải chuyển tiếp IP thật của khách trong `X-Forwarded-For`**, nếu không mọi khách dùng chung một hạn mức và bị chặn hàng loạt.

### Cài đặt mặc định website đang dựa vào

Đăng ký và đăng nhập bằng mật khẩu bật; xác minh email tắt; Turnstile tắt. Gateway sẽ báo trước nếu đổi một trong các cài đặt này.

## 6. Khi nâng cấp New API

Nhánh `main` và các bản `v1.0.0-rc.*` (tháng 10/2026) thay cookie `session` bằng access token JWT 15 phút cộng refresh cookie, bỏ header `New-Api-User`, xóa `/api/user/token`, và đưa token quản trị dạng `nap_...` có scope. Khi chuyển sang v1.0, website phải đổi cách giữ phiên và dịch vụ nạp tiền phải dùng PAT có scope `user:write`. Đừng đổi `NEWAPI_VERSION` khi chưa cập nhật hai dịch vụ này.
