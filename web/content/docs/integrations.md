---
title: n8n, Dify, LangChain
description: Kết nối các nền tảng tự động hóa và framework AI.
order: 5
group: Công cụ
---

# n8n, Dify, LangChain

Bất kỳ công cụ nào cho phép nhập **OpenAI base URL** đều dùng được.

## n8n

1. Tạo credential **OpenAI API**.
2. **API Key**: `sk-...`
3. **Base URL**: `{{API_BASE}}/v1`
4. Trong node **OpenAI Chat Model**, chọn hoặc gõ tay tên mô hình, ví dụ `deepseek-chat`.

## Dify

1. Vào **Settings → Model Provider → OpenAI-API-compatible** và bấm **Add Model**.
2. **Model Name**: ví dụ `claude-sonnet-4-5`
3. **API Key**: `sk-...`
4. **API endpoint URL**: `{{API_BASE}}/v1`

## LangChain (Python)

```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    model="gpt-5-mini",
    base_url="{{API_BASE}}/v1",
    api_key="sk-...",
)
print(llm.invoke("Xin chào").content)
```

## LangChain (JavaScript)

```ts
import { ChatOpenAI } from "@langchain/openai";

const llm = new ChatOpenAI({
  model: "gpt-5-mini",
  apiKey: "sk-...",
  configuration: { baseURL: "{{API_BASE}}/v1" },
});
```
