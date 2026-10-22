---
title: Dùng với Cursor
description: Thêm API key vào Cursor và các trình soạn thảo khác.
order: 4
group: Công cụ
---

# Dùng với Cursor

## Cursor

1. Mở **Cursor Settings → Models**.
2. Ở mục **OpenAI API Key**, dán API key `sk-...` của bạn.
3. Bật **Override OpenAI Base URL** và nhập:

```text
{{API_BASE}}/v1
```

4. Bấm **Verify**. Sau đó thêm tên mô hình bạn muốn dùng (ví dụ `claude-sonnet-4-5`, `gpt-5`, `deepseek-chat`) bằng nút **+ Add model**.

Lưu ý: một số tính năng của Cursor (Tab, Apply) luôn dùng mô hình riêng của Cursor, không đi qua key của bạn.

## Cline / Roo Code (VS Code)

- **API Provider**: OpenAI Compatible
- **Base URL**: `{{API_BASE}}/v1`
- **API Key**: `sk-...`
- **Model ID**: ví dụ `claude-sonnet-4-5`

## Continue

Trong `~/.continue/config.yaml`:

```yaml
models:
  - name: Claude Sonnet
    provider: openai
    model: claude-sonnet-4-5
    apiBase: {{API_BASE}}/v1
    apiKey: sk-...
```
