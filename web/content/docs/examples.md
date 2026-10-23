---
title: Ví dụ Python và JavaScript
description: Gọi API bằng SDK OpenAI, streaming, tool calling và embedding.
order: 2
group: Bắt đầu
---

# Ví dụ Python và JavaScript

Mọi SDK tương thích OpenAI đều dùng được, chỉ cần đổi `base_url` và `api_key`.

## Python

```bash
pip install openai
```

```python
import os
from openai import OpenAI

client = OpenAI(
    base_url="{{API_BASE}}/v1",
    api_key=os.environ["API_KEY"],
)

resp = client.chat.completions.create(
    model="gpt-5-mini",
    messages=[
        {"role": "system", "content": "Bạn là trợ lý trả lời ngắn gọn."},
        {"role": "user", "content": "Thủ đô của Việt Nam là gì?"},
    ],
)
print(resp.choices[0].message.content)
print(resp.usage)  # số token vào/ra của request
```

## JavaScript / TypeScript

```bash
npm install openai
```

```ts
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "{{API_BASE}}/v1",
  apiKey: process.env.API_KEY,
});

const resp = await client.chat.completions.create({
  model: "deepseek-chat",
  messages: [{ role: "user", content: "Giải thích REST API trong 3 câu" }],
});
console.log(resp.choices[0].message.content);
```

## Streaming

Câu trả lời được trả về từng đoạn, phù hợp cho giao diện chat.

```python
stream = client.chat.completions.create(
    model="claude-sonnet-4-5",
    messages=[{"role": "user", "content": "Kể một câu chuyện ngắn"}],
    stream=True,
    stream_options={"include_usage": True},
)
for chunk in stream:
    if chunk.choices and chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)
```

## Tool calling (gọi hàm)

```python
tools = [{
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": "Lấy thời tiết hiện tại của một thành phố",
        "parameters": {
            "type": "object",
            "properties": {"city": {"type": "string"}},
            "required": ["city"],
        },
    },
}]

resp = client.chat.completions.create(
    model="gpt-5-mini",
    messages=[{"role": "user", "content": "Hà Nội hôm nay thế nào?"}],
    tools=tools,
)
print(resp.choices[0].message.tool_calls)
```

## Embedding

```python
emb = client.embeddings.create(
    model="text-embedding-3-small",
    input=["Xin chào", "Tạm biệt"],
)
print(len(emb.data[0].embedding))
```

## SDK Anthropic

Các mô hình Claude cũng gọi được theo chuẩn Anthropic Messages API:

```python
import anthropic

client = anthropic.Anthropic(
    base_url="{{API_BASE}}",
    api_key=os.environ["API_KEY"],
)
msg = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Xin chào Claude"}],
)
print(msg.content[0].text)
```
