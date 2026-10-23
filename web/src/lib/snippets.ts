import { site } from "./site";

export function codeSamples(model = "claude-sonnet-4-5", key = "sk-...") {
  const base = `${site.apiBase}/v1`;
  return [
    {
      label: "cURL",
      code: `curl ${base}/chat/completions \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${model}",
    "messages": [{"role": "user", "content": "Xin chào!"}]
  }'`,
    },
    {
      label: "Python",
      code: `from openai import OpenAI

client = OpenAI(
    base_url="${base}",
    api_key="${key}",
)

resp = client.chat.completions.create(
    model="${model}",
    messages=[{"role": "user", "content": "Xin chào!"}],
)
print(resp.choices[0].message.content)`,
    },
    {
      label: "Node.js",
      code: `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${base}",
  apiKey: "${key}",
});

const resp = await client.chat.completions.create({
  model: "${model}",
  messages: [{ role: "user", content: "Xin chào!" }],
});
console.log(resp.choices[0].message.content);`,
    },
    {
      label: "Claude Code",
      code: `export ANTHROPIC_BASE_URL="${site.apiBase}"
export ANTHROPIC_AUTH_TOKEN="${key}"
export ANTHROPIC_MODEL="${model.startsWith("claude") ? model : "claude-sonnet-4-5"}"

claude`,
    },
  ];
}
