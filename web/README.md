# Website (Next.js) cho cổng API AI

Website công khai và bảng điều khiển khách hàng, chạy phía trước **New API v0.13.x** (gateway, tính tiền) và **dịch vụ nạp coin** (USDT/BTC qua NOWPayments).

- Trang công khai: trang chủ, danh sách mô hình (lấy giá trực tiếp từ New API), chi tiết mô hình, bảng giá, 7 trang tài liệu, điều khoản, bảo mật, hoàn tiền.
- Tài khoản: đăng ký, đăng nhập, đăng xuất.
- Bảng điều khiển: tổng quan (số dư, biểu đồ chi tiêu 14 ngày, mô hình dùng nhiều), API key (tạo với hạn mức, hết hạn, giới hạn mô hình và IP; xem, tắt/bật, xóa), lịch sử sử dụng (lọc theo thời gian, key, mô hình), nạp tiền USDT TRC20 / USDT BEP20 / BTC.

## Chạy thử nhanh (chế độ demo, không cần New API)

```bash
npm install
npm run dev
# mở http://localhost:3000, đăng nhập demo / demo1234
```

Khi `NEWAPI_URL` để trống, website dùng dữ liệu giả lập trong bộ nhớ.

## Chạy thật

1. `cp .env.example .env` rồi điền:
   - `NEWAPI_URL`: địa chỉ nội bộ của New API, ví dụ `http://new-api:3000`.
   - `WEB_SESSION_SECRET`: chuỗi ngẫu nhiên, `openssl rand -hex 32`.
   - `PAYMENT_API_URL` và `PAYMENT_API_SECRET`: dịch vụ nạp coin.
   - `SITE_NAME`, `SITE_URL`, `API_BASE_URL`, `SUPPORT_EMAIL`, `SUPPORT_TELEGRAM`, `SUPPORT_ZALO`.
2. Docker: cùng `docker-compose.yml` của thư mục `gateway` (profile `web`, build từ `../web`):

```bash
cd ../gateway && docker compose --profile web up -d --build web
```

   Hoặc tự build: `docker build -t web . && docker run --env-file .env -p 3000:3000 web`.
3. Không dùng Docker: `npm ci && npm run build`, rồi `node .next/standalone/server.js` sau khi chép `.next/static`, `public`, `content` vào `.next/standalone/`.

Các biến cấu hình được đọc lúc chạy (không phải lúc build), nên một image dùng được cho mọi tên miền.

## Cách website nói chuyện với New API

Trình duyệt không bao giờ gọi New API trực tiếp. Website là lớp trung gian (BFF):

- Đăng nhập gọi `POST /api/user/login`, lấy cookie `session` của New API và cất nó trong cookie `aura_session` đã mã hóa (A256GCM), `httpOnly`.
- Mọi lời gọi sau gửi lại cookie đó, header `New-Api-User`, và **IP thật của khách trong `X-Forwarded-For`** (New API giới hạn tốc độ theo IP).
- Khi New API trả 401, khách bị đăng xuất và chuyển về trang đăng nhập.
- Giá: `/api/pricing`, giá vào mỗi 1M token = `model_ratio × 2 × group_ratio`, giá ra = giá vào × `completion_ratio`.
- Tiền: `quota / 500000` = USD (`NEWAPI_QUOTA_PER_UNIT`).

**Chỉ chạy với New API v0.13.x.** Bản v1.0 bỏ cookie `session` và header `New-Api-User`; khi nâng cấp phải sửa `src/lib/newapi.ts` và `src/lib/session.ts`.

## Cấu trúc

```
content/docs/*.md        Tài liệu (Markdown, có front matter title/order/group)
content/legal/*.md       Điều khoản, bảo mật, hoàn tiền (bản nháp, cần luật sư xem)
src/app/(site)/          Trang công khai
src/app/(auth)/          Đăng nhập, đăng ký, server action
src/app/dashboard/       Bảng điều khiển
src/lib/newapi.ts        Client New API (phía server)
src/lib/payment.ts       Client dịch vụ nạp coin
src/lib/mock.ts          Dữ liệu giả lập cho chế độ demo
src/data/model-meta.ts   Context, mô tả từng mô hình (New API không lưu); thêm mô hình mới ở đây
```

## Việc cần làm khi thêm mô hình

1. Bật mô hình và đặt giá trong New API (Settings → Ratio).
2. Thêm context và mô tả vào `src/data/model-meta.ts` (không bắt buộc, chỉ để trang chi tiết đầy đủ hơn).
3. Gán vendor cho mô hình trong New API để hiện đúng tên hãng.

## Giới hạn đã biết

- Số dư tối đa mỗi tài khoản khoảng 4.294 USD (New API lưu quota kiểu số nguyên 32 bit); trang nạp chặn trước.
- Biểu đồ tổng quan lấy từ `/api/data/self`, New API ghi dữ liệu này theo chu kỳ vài phút. Bảng lịch sử thì cập nhật ngay.
- Tài khoản bật xác thực 2 bước chưa đăng nhập được qua website (dùng trang console của New API).
- Giao diện mới có tiếng Việt.
