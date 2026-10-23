---
title: Dùng với Claude Code
description: Cấu hình Claude Code dùng API key của bạn.
order: 3
group: Công cụ
---

# Dùng với Claude Code

[Claude Code](https://docs.claude.com/en/docs/claude-code/overview) là trợ lý lập trình chạy trong terminal. Bạn có thể trỏ nó sang {{SITE_NAME}} để trả tiền theo token bằng số dư của mình.

## 1. Cài Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

## 2. Đặt biến môi trường

macOS / Linux (thêm vào `~/.zshrc` hoặc `~/.bashrc` để dùng lâu dài):

```bash
export ANTHROPIC_BASE_URL="{{API_BASE}}"
export ANTHROPIC_AUTH_TOKEN="sk-..."   # API key tạo trong Console
export ANTHROPIC_MODEL="claude-sonnet-4-5"
export ANTHROPIC_DEFAULT_HAIKU_MODEL="claude-haiku-4-5"
```

Windows PowerShell:

```powershell
$env:ANTHROPIC_BASE_URL = "{{API_BASE}}"
$env:ANTHROPIC_AUTH_TOKEN = "sk-..."
$env:ANTHROPIC_MODEL = "claude-sonnet-4-5"
```

Hoặc lưu vào file `~/.claude/settings.json`:

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "{{API_BASE}}",
    "ANTHROPIC_AUTH_TOKEN": "sk-...",
    "ANTHROPIC_MODEL": "claude-sonnet-4-5"
  }
}
```

Lưu ý: `ANTHROPIC_BASE_URL` **không** có `/v1` ở cuối.

## 3. Chạy

```bash
cd du-an-cua-ban
claude
```

Gõ `/status` trong Claude Code để kiểm tra base URL đang dùng.

## Mẹo tiết kiệm

- Claude Code gửi nhiều token ngữ cảnh mỗi lượt. Tạo **một key riêng cho Claude Code** và đặt hạn mức chi tiêu để không tiêu quá tay.
- Dùng `claude-haiku-4-5` cho việc nhỏ, `claude-sonnet-4-5` cho việc chính.
- Theo dõi chi phí từng request ở **Console → Lịch sử sử dụng**.

## Lỗi thường gặp

| Lỗi | Cách xử lý |
| --- | --- |
| `401 Invalid API key` | Kiểm tra `ANTHROPIC_AUTH_TOKEN`, key có thể đã bị tắt hoặc xóa. |
| `403 quota` | Số dư hoặc hạn mức của key đã hết, [nạp thêm]({{SITE_URL}}/console/topup). |
| Claude Code vẫn đòi đăng nhập | Bạn đã đăng nhập tài khoản Anthropic trước đó. Chạy `claude logout` rồi mở lại. |
