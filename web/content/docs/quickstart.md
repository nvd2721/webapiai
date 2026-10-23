---
title: Bắt đầu nhanh
description: Tạo API key và gửi request đầu tiên trong 3 phút.
order: 1
group: Bắt đầu
---

# Bắt đầu nhanh

{{SITE_NAME}} cho bạn gọi nhiều mô hình AI (GPT, Claude, Gemini, DeepSeek, Qwen…) bằng **một API key**, qua endpoint tương thích chuẩn OpenAI và Anthropic.

## 1. Tạo tài khoản và nạp tiền

1. [Đăng ký]({{SITE_URL}}/register) bằng tên đăng nhập và mật khẩu.
2. Vào **Console → Nạp tiền**, chọn số tiền và đồng coin (USDT TRC20, USDT BEP20 hoặc Bitcoin). 1 credit = 1 USD.
3. Sau khi giao dịch được xác nhận trên blockchain, số dư được cộng tự động. Xem chi tiết ở [Nạp tiền](/docs/topup).

## 2. Tạo API key

Vào **Console → API key → Tạo key**. Key có dạng `sk-...`. Bạn có thể đặt:

- **Hạn mức chi tiêu**: key tự ngừng khi tiêu hết số USD này.
- **Ngày hết hạn**.
- **Danh sách mô hình được dùng** và **IP được phép**.

Giữ key bí mật như mật khẩu. Nếu lộ key, hãy tắt hoặc xóa nó ngay trong Console.

## 3. Gửi request đầu tiên

| Thông số | Giá trị |
| --- | --- |
| Base URL (chuẩn OpenAI) | `{{API_BASE}}/v1` |
| Base URL (chuẩn Anthropic) | `{{API_BASE}}` |
| Xác thực | `Authorization: Bearer sk-...` |

```bash
curl {{API_BASE}}/v1/chat/completions \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-5",
    "messages": [{"role": "user", "content": "Viết một câu chào bằng tiếng Việt"}]
  }'
```

Đổi mô hình chỉ cần đổi giá trị `model`. Danh sách tên mô hình và giá xem ở trang [Mô hình]({{SITE_URL}}/models), hoặc gọi API:

```bash
curl {{API_BASE}}/v1/models -H "Authorization: Bearer $API_KEY"
```

## Tiếp theo

- [Ví dụ Python và JavaScript](/docs/examples): streaming, tool calling, embedding.
- [Dùng với Claude Code](/docs/claude-code) và [Cursor](/docs/cursor).
- [Mã lỗi](/docs/errors) thường gặp và cách xử lý.
