---
title: Mã lỗi
description: Mã lỗi HTTP thường gặp và cách xử lý.
order: 7
group: Tham khảo
---

# Mã lỗi

Lỗi trả về theo định dạng chuẩn OpenAI:

```json
{
  "error": {
    "message": "Mô tả lỗi (request id: ...)",
    "type": "new_api_error",
    "code": "model_not_found"
  }
}
```

Khi liên hệ hỗ trợ, hãy gửi kèm **request id** trong thông báo lỗi.

| Mã HTTP | Ý nghĩa | Cách xử lý |
| --- | --- | --- |
| 400 | Request sai định dạng hoặc tham số không hợp lệ | Kiểm tra JSON, tên tham số, `max_tokens` vượt giới hạn mô hình. |
| 401 | API key sai, đã bị xóa hoặc chưa gửi | Kiểm tra header `Authorization: Bearer sk-...`. |
| 403 | Hết số dư, hết hạn mức của key, key hết hạn, mô hình hoặc IP không được phép | Nạp thêm tiền hoặc chỉnh cài đặt key trong Console. |
| 404 | Sai đường dẫn | Base URL chuẩn OpenAI phải kết thúc bằng `/v1`. |
| 429 | Gửi quá nhiều request trong thời gian ngắn | Chờ rồi thử lại, dùng exponential backoff. |
| 500 | Lỗi nội bộ | Thử lại; nếu lặp lại, gửi request id cho hỗ trợ. |
| 502, 504 | Nhà cung cấp gốc lỗi hoặc quá thời gian | Thử lại sau vài giây. Hệ thống tự chuyển kênh khi có thể. |
| 503 `model_not_found` | Tên mô hình sai hoặc tạm thời không có kênh | Kiểm tra tên ở trang [Mô hình]({{SITE_URL}}/models). |

## Thử lại an toàn

```python
import time
from openai import OpenAI, APIStatusError

def call_with_retry(fn, retries=3):
    for i in range(retries):
        try:
            return fn()
        except APIStatusError as e:
            if e.status_code in (429, 500, 502, 503, 504) and i < retries - 1:
                time.sleep(2 ** i)
                continue
            raise
```

Bạn **không** bị trừ tiền với request lỗi.
