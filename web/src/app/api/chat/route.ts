import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { isDemo } from "@/lib/site";

// Studio chat: streams New API's playground endpoint (/pg/chat/completions), which bills the
// logged-in user's balance through their session, so no API key is needed in the browser.

const BASE = (process.env.NEWAPI_URL || "").replace(/\/$/, "");

type Msg = { role: "system" | "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });

  let body: { model?: string; messages?: Msg[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request không hợp lệ." }, { status: 400 });
  }
  const model = String(body.model || "");
  const messages = (body.messages || [])
    .filter((m) => ["system", "user", "assistant"].includes(m.role) && typeof m.content === "string")
    .slice(-50);
  if (!model || messages.length === 0) return NextResponse.json({ error: "Thiếu mô hình hoặc nội dung." }, { status: 400 });

  if (isDemo) return demoStream(model, messages);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "";
  let upstream: Response;
  try {
    upstream = await fetch(`${BASE}/pg/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session=${session.nc}`,
        "New-Api-User": String(session.uid),
        ...(ip ? { "X-Forwarded-For": ip } : {}),
      },
      body: JSON.stringify({ model, messages, stream: true, stream_options: { include_usage: true } }),
      signal: req.signal,
    });
  } catch {
    return NextResponse.json({ error: "Không kết nối được tới máy chủ API." }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    let msg = `Lỗi HTTP ${upstream.status}`;
    try {
      const j = JSON.parse(text);
      msg = j.error?.message || j.message || msg;
    } catch {}
    if (/额度不足|insufficient|quota/i.test(msg)) msg = "Số dư không đủ. Vui lòng nạp thêm để tiếp tục.";
    if (upstream.status === 401) msg = "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.";
    return NextResponse.json({ error: msg.replace(/\s*\(request id:[^)]*\)/, "") }, { status: upstream.status });
  }

  return new Response(upstream.body, {
    headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" },
  });
}

function demoStream(model: string, messages: Msg[]) {
  const last = messages[messages.length - 1]?.content || "";
  const reply = `(Chế độ demo, ${model}) Bạn vừa hỏi: "${last.slice(0, 120)}". Khi nối New API thật, câu trả lời của mô hình sẽ hiện ở đây và chi phí được trừ vào số dư của bạn.`;
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(c) {
      for (const w of reply.split(/(?<=\s)/)) {
        c.enqueue(enc.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: w } }] })}\n\n`));
        await new Promise((r) => setTimeout(r, 25));
      }
      c.enqueue(enc.encode(`data: ${JSON.stringify({ choices: [], usage: { prompt_tokens: last.length, completion_tokens: reply.length } })}\n\n`));
      c.enqueue(enc.encode("data: [DONE]\n\n"));
      c.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8" } });
}
