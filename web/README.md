# Website (Next.js) cho cổng API AI

Website công khai và bảng điều khiển khách hàng, chạy phía trước **New API v0.13.x** (gateway, tính tiền) và **dịch vụ nạp coin** (USDT/BTC qua NOWPayments).

Bố cục và phong cách (đen trắng, sáng/tối) theo cấu trúc ZenMux, thương hiệu Aura.

- Khung chung: thanh thông báo (`ANNOUNCEMENT`), header có menu thả xuống, tìm kiếm Ctrl/Cmd K, đổi sáng/tối, menu tài khoản; footer 3 cột.
- Trang công khai: trang chủ, `/models` (tìm kiếm, 6 kiểu sắp xếp, Tất cả/Giảm giá/Miễn phí, tab loại, bộ lọc đầu vào/context/hãng/giao thức/suy luận, chọn để so sánh), chi tiết mô hình, `/compare` (tối đa 4 mô hình, bộ chọn sẵn), `/pricing` dạng tab (Tổng quan, Trả theo dùng, Ưu đãi), giới thiệu, hỗ trợ, nhật ký thay đổi, tài liệu, điều khoản.
- Nhãn **Miễn phí** chỉ hiện khi giá thật trong New API bằng 0. Nhãn giảm giá chỉ hiện khi `listInput` trong `model-meta.ts` được điền.
- Console (`/console`, đường cũ `/dashboard` tự chuyển hướng): Chat (gọi mô hình ngay trên web, trừ vào số dư qua `/pg/chat/completions` của New API), Tổng quan, Nhật ký request, Sử dụng và chi phí, API key, Nạp tiền (2 cột, USDT TRC20 / USDT BEP20 / BTC), Lịch sử nạp, Mời bạn (link giới thiệu, chuyển thưởng vào số dư), Cài đặt (tên hiển thị, đổi mật khẩu).

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
src/app/console/         Console (cần đăng nhập)
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
- Chưa có (New API v0.13 không hỗ trợ hoặc cần dữ liệu thật): gói thuê bao, đăng nhập GitHub/Google, biểu đồ uptime/độ trễ, bảng xếp hạng, đánh giá khách hàng, bảo hiểm request, tổ chức/nhóm.
