# Dịch vụ nạp tiền USDT và Bitcoin của Aura

Dịch vụ nhỏ đứng cạnh New API: tạo hóa đơn trên NOWPayments, nhận IPN khi khách trả xong, kiểm tra chữ ký, rồi cộng số dư cho khách trong New API qua API quản trị. Không sửa code New API.

```
Website Next.js --(server-to-server, Bearer PAYMENT_API_SECRET)--> payment:8080 --> NOWPayments (tạo hóa đơn)
Khách trả coin trên trang NOWPayments --> NOWPayments gửi IPN --> https://pay.tenmien.com/webhooks/nowpayments
payment --(POST /api/user/manage add_quota)--> new-api:3000
```

Tỷ giá: 1 USD = 1 credit = `QUOTA_PER_USD` quota trong New API (mặc định 500000).

## Chống cộng trùng và mất tiền

- Mỗi lần cộng tiền là một dòng trong bảng `credits` với khóa duy nhất `np:<payment_id>`. IPN gửi lại bao nhiêu lần, hay nhiều IPN đến cùng lúc, cũng chỉ cộng một lần.
- Trước khi cộng, dịch vụ hỏi lại NOWPayments (`GET /v1/payment/:id`) để chắc giao dịch đã `finished` và đúng hóa đơn, và so số tiền USD với hóa đơn đã lưu. Sai lệch thì không cộng, hóa đơn được đánh dấu cần xem lại.
- Số tiền cộng lấy từ hóa đơn trong DB của mình, không lấy từ IPN.
- Chỉ trạng thái `finished` mới được cộng. Trả thiếu (`partially_paid`) thì không tự cộng; anh xem rồi cộng tay bằng API quản trị.
- Nếu New API từ chối rõ ràng (ví dụ đang khởi động lại), dịch vụ tự thử lại sau 30 giây, 1 phút, 2 phút... tối đa 10 lần.
- Nếu không biết chắc New API đã cộng hay chưa (hết thời gian chờ, lỗi 5xx, máy chủ tắt giữa chừng), dòng đó chuyển sang `unknown` và **không bao giờ tự thử lại**. Anh xem log New API (Nhật ký, loại "Quản lý") rồi chọn `mark_done` hoặc `retry`.

## API cho website

Mọi request cần header `Authorization: Bearer <PAYMENT_API_SECRET>`. Lỗi luôn có dạng `{"error": "..."}`.

| Method | Đường dẫn | Mô tả |
|---|---|---|
| POST | `/api/invoices` | Body `{"user_id": 42, "amount_usd": 10, "coin": "usdttrc20"}`. Trả 201 `{id, invoice_url, status, amount_usd, coin, created_at, credited_usd}`. Website chuyển khách tới `invoice_url`. |
| GET | `/api/invoices?user_id=42&limit=20` | Lịch sử nạp tiền, mới nhất trước: `{"data": [...]}` |
| GET | `/api/invoices/:id?user_id=42` | Một hóa đơn (404 nếu không thuộc user này) |

Coin: `usdttrc20` và `usdtbsc` từ 5 USD, `btc` từ 20 USD, tối đa 4000 USD (đổi bằng `COIN_LIMITS`). Số dư mỗi tài khoản không vượt quá khoảng 4000 USD vì New API lưu số dư bằng số nguyên 32 bit; tài khoản bị khóa không tạo được hóa đơn. Mỗi khách tối đa 10 hóa đơn chưa trả trong 24 giờ.

Trạng thái: `waiting`, `confirming`, `confirmed`, `sending`, `partially_paid`, `finished`, `failed`, `refunded`, `expired`. Chỉ tin `credited_usd > 0` là tiền đã vào tài khoản. Sau khi trả, khách quay về `SITE_URL/dashboard/topup?invoice=<id>`.

## API quản trị (đối soát)

Header `Authorization: Bearer <PAYMENT_ADMIN_SECRET>`.

```bash
# Các lần cộng cần anh xem
curl -H "Authorization: Bearer $PAYMENT_ADMIN_SECRET" https://pay.tenmien.com/api/admin/credits?state=unknown
curl -H "Authorization: Bearer $PAYMENT_ADMIN_SECRET" https://pay.tenmien.com/api/admin/credits?state=failed
# Đã kiểm tra log New API: tiền đã vào -> mark_done; chưa vào -> retry
curl -X POST -H "Authorization: Bearer $PAYMENT_ADMIN_SECRET" -H 'content-type: application/json' \
  -d '{"action":"mark_done"}' https://pay.tenmien.com/api/admin/credits/12/resolve
# Hóa đơn trả thiếu hoặc lệch số tiền
curl -H "Authorization: Bearer $PAYMENT_ADMIN_SECRET" https://pay.tenmien.com/api/admin/invoices/review
# Cộng tay cho một hóa đơn (mỗi hóa đơn chỉ một lần)
curl -X POST -H "Authorization: Bearer $PAYMENT_ADMIN_SECRET" -H 'content-type: application/json' \
  -d '{"amount_usd": 6, "note": "khách trả thiếu, chấp nhận 6 USD"}' \
  https://pay.tenmien.com/api/admin/invoices/<invoice-id>/manual-credit
```

Nên chặn `/api/admin/*` ở Caddy, chỉ cho IP của anh, hoặc chỉ gọi từ trong VPS.

## Cài đặt

1. **NOWPayments:** đăng ký tài khoản người bán, thêm ví nhận tiền (USDT TRC20, USDT BEP20, BTC), lấy API key, tạo IPN secret trong Store Settings. Bật các coin `usdttrc20`, `usdtbsc`, `btc`.
2. **New API:** đăng nhập tài khoản root, vào Cài đặt cá nhân, tạo access token hệ thống. Điền vào `NEWAPI_ADMIN_TOKEN`, và id tài khoản root (thường là 1) vào `NEWAPI_ADMIN_USER_ID`. Tạo lại token sẽ làm token cũ hết hiệu lực.
3. Chép các biến trong `.env.example` vào `gateway/.env`, điền giá trị.
4. Thư mục này đặt cạnh thư mục `gateway` (`../payment`). Chạy:
   ```bash
   cd gateway && docker compose --profile payment up -d --build payment
   docker logs -f payment
   ```
   Dịch vụ tự tạo bảng khi khởi động. Kiểm tra: `curl https://pay.tenmien.com/healthz`.
5. **Thử trước bằng sandbox:** tạo tài khoản tại account-sandbox.nowpayments.io, đặt `NOWPAYMENTS_SANDBOX=true` và dùng key sandbox, nạp thử 10 USD, xem số dư trong New API tăng 10 USD. Xong thì đổi sang key thật và `NOWPAYMENTS_SANDBOX=false`.

## Phát triển

```bash
npm install
npm test          # cần PostgreSQL; mặc định postgresql://payments:payments@localhost:5432/payments_test (đổi bằng TEST_DATABASE_URL)
npm run dev
```

Mã nguồn: `src/service.ts` (nghiệp vụ), `src/app.ts` (HTTP), `src/nowpayments.ts` (cổng + chữ ký IPN), `src/newapi.ts` (cộng số dư), `migrations/` (bảng `invoices`, `credits`, `ipn_events`).
