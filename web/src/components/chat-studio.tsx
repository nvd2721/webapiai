"use client";

import Link from "next/link";
import { ArrowUp, Code2, MessageSquarePlus, Square, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatPrice, formatUsd } from "@/lib/format";
import { CopyButton } from "./copy-button";

type ModelOpt = { id: string; name: string; vendor: string; input: number | null; output: number | null };
type Msg = { role: "user" | "assistant"; content: string; error?: boolean; usage?: { in: number; out: number } };
type Chat = { id: string; title: string; model: string; messages: Msg[]; updated: number };

const STORE = "aura-chats";

function load(): Chat[] {
  try {
    return JSON.parse(localStorage.getItem(STORE) || "[]");
  } catch {
    return [];
  }
}
function save(chats: Chat[]) {
  try {
    localStorage.setItem(STORE, JSON.stringify(chats.slice(0, 50)));
  } catch {}
}

export function ChatStudio({
  models,
  initialModel,
  initialPrompt,
  apiBase,
}: {
  models: ModelOpt[];
  initialModel?: string;
  initialPrompt?: string;
  apiBase: string;
}) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [model, setModel] = useState(models.find((m) => m.id === initialModel)?.id || models[0]?.id || "");
  const [input, setInput] = useState(initialPrompt || "");
  const [busy, setBusy] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const autoSent = useRef(false);

  useEffect(() => setChats(load()), []);
  const chat = chats.find((c) => c.id === current) || null;
  const messages = chat?.messages || [];
  const cur = models.find((m) => m.id === model);

  const lastContent = messages[messages.length - 1]?.content;
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [messages.length, lastContent]);

  // Prompt handed over from the home page: send it once.
  useEffect(() => {
    if (initialPrompt && !autoSent.current && model) {
      autoSent.current = true;
      send(initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (fn: (all: Chat[]) => Chat[]) =>
    setChats((prev) => {
      const next = fn(prev);
      save(next);
      return next;
    });

  async function send(text = input) {
    const content = text.trim();
    if (!content || busy || !model) return;
    setInput("");
    const id = current || crypto.randomUUID();
    const history: Msg[] = [...messages, { role: "user", content }];
    update((all) => [
      { id, title: (chat?.title || content).slice(0, 60), model, messages: [...history, { role: "assistant", content: "" }], updated: Date.now() },
      ...all.filter((c) => c.id !== id),
    ]);
    setCurrent(id);
    setBusy(true);

    const setLast = (patch: (m: Msg) => Msg) =>
      update((all) =>
        all.map((c) => (c.id === id ? { ...c, messages: c.messages.map((m, i) => (i === c.messages.length - 1 ? patch(m) : m)) } : c)),
      );

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: history.filter((m) => !m.error).map(({ role, content }) => ({ role, content })) }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        if (res.status === 401) window.location.href = "/auth/expired";
        setLast((m) => ({ ...m, content: j.error || `Lỗi HTTP ${res.status}`, error: true }));
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          const data = line.replace(/^data:\s?/, "").trim();
          if (!line.startsWith("data:") || !data || data === "[DONE]") continue;
          try {
            const j = JSON.parse(data);
            const delta = j.choices?.[0]?.delta?.content || "";
            if (delta) {
              acc += delta;
              const snapshot = acc;
              setLast((m) => ({ ...m, content: snapshot }));
            }
            if (j.usage) setLast((m) => ({ ...m, usage: { in: j.usage.prompt_tokens || 0, out: j.usage.completion_tokens || 0 } }));
            if (j.error) setLast((m) => ({ ...m, content: j.error.message || "Lỗi từ mô hình", error: true }));
          } catch {}
        }
      }
      if (!acc) setLast((m) => (m.content ? m : { ...m, content: "Mô hình không trả về nội dung.", error: true }));
    } catch (e) {
      if ((e as Error).name !== "AbortError") setLast((m) => ({ ...m, content: "Mất kết nối, vui lòng thử lại.", error: true }));
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  const code = `curl ${apiBase}/v1/chat/completions \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify({ model, messages: messages.filter((m) => !m.error).map(({ role, content }) => ({ role, content })).slice(-6).concat(input ? [{ role: "user", content: input }] : []) }, null, 2).replace(/'/g, "'\\''")}'`;

  const cost = (m: Msg) =>
    m.usage && cur?.input != null && cur.output != null ? (m.usage.in * cur.input + m.usage.out * cur.output) / 1_000_000 : null;

  if (models.length === 0) {
    return <div className="card p-10 text-center text-muted">Tài khoản của bạn chưa được dùng mô hình nào. Liên hệ hỗ trợ.</div>;
  }

  return (
    <div className="card grid h-[calc(100dvh-8rem)] min-h-[520px] overflow-hidden md:grid-cols-[230px_1fr]">
      {/* Conversations */}
      <aside className="hidden flex-col border-r border-border md:flex">
        <div className="p-3">
          <button
            type="button"
            className="btn-secondary w-full"
            onClick={() => {
              setCurrent(null);
              setInput("");
            }}
          >
            <MessageSquarePlus className="size-4" /> Cuộc trò chuyện mới
          </button>
        </div>
        <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
          {chats.map((c) => (
            <div key={c.id} className={`group flex items-center rounded-lg ${c.id === current ? "bg-accent-soft" : "hover:bg-bg-soft"}`}>
              <button
                type="button"
                className="min-w-0 flex-1 truncate px-3 py-2 text-left text-sm"
                onClick={() => {
                  setCurrent(c.id);
                  if (models.some((m) => m.id === c.model)) setModel(c.model);
                }}
              >
                {c.title}
              </button>
              <button
                type="button"
                className="mr-1 hidden rounded p-1 text-muted hover:text-fg group-hover:block"
                aria-label="Xóa"
                onClick={() => {
                  update((all) => all.filter((x) => x.id !== c.id));
                  if (current === c.id) setCurrent(null);
                }}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
          {chats.length === 0 && <p className="px-3 py-2 text-xs text-muted">Lịch sử chat lưu trên trình duyệt này.</p>}
        </div>
      </aside>

      {/* Conversation */}
      <section className="flex min-h-0 flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
          <select value={model} onChange={(e) => setModel(e.target.value)} className="input w-auto max-w-72 py-1.5" aria-label="Mô hình">
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.vendor ? `${m.vendor}: ` : ""}
                {m.name}
              </option>
            ))}
          </select>
          {cur?.input != null && (
            <span className="text-xs text-muted">
              {formatPrice(cur.input)} vào · {formatPrice(cur.output)} ra / 1M token
            </span>
          )}
          <span className="badge ml-auto">Trừ vào số dư</span>
          <button type="button" className={`btn-ghost px-2 py-1 text-xs ${showCode ? "text-fg" : ""}`} onClick={() => setShowCode(!showCode)}>
            <Code2 className="size-4" /> Xem code
          </button>
        </div>

        {showCode && (
          <div className="relative border-b border-border bg-code text-zinc-100">
            <CopyButton value={code} className="absolute top-2 right-2 text-zinc-400 hover:bg-white/10 hover:text-white" />
            <pre className="max-h-56 overflow-auto p-4 font-mono text-xs leading-relaxed">{code}</pre>
          </div>
        )}

        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-6 sm:px-8">
          {messages.length === 0 && (
            <div className="mx-auto mt-16 max-w-md text-center">
              <div className="text-2xl font-semibold tracking-tight">Bạn muốn hỏi gì?</div>
              <p className="mt-2 text-sm text-muted">
                Chat trên web dùng chung số dư với API, tính theo giá token của mô hình.{" "}
                <Link href="/models" className="underline">
                  Xem giá
                </Link>
              </p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
              <div
                className={
                  m.role === "user"
                    ? "max-w-[80%] rounded-2xl bg-accent px-4 py-2.5 text-sm whitespace-pre-wrap text-accent-fg"
                    : `max-w-3xl text-[15px] leading-relaxed ${m.error ? "rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300" : ""}`
                }
              >
                {m.role === "assistant" && !m.content && busy && i === messages.length - 1 ? (
                  <span className="inline-block size-2 animate-pulse rounded-full bg-fg" />
                ) : m.role === "assistant" ? (
                  <Rich text={m.content} />
                ) : (
                  m.content
                )}
                {m.error && m.content.includes("nạp thêm") && (
                  <Link href="/console/topup" className="ml-2 font-medium underline">
                    Nạp tiền
                  </Link>
                )}
                {m.usage && (
                  <div className="mt-2 text-xs text-muted">
                    {m.usage.in.toLocaleString("vi-VN")} token vào · {m.usage.out.toLocaleString("vi-VN")} token ra
                    {cost(m) != null && ` · khoảng ${formatUsd(cost(m)!, { max: 5 })}`}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <form
          className="border-t border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <div className="flex items-end gap-2 rounded-xl border border-border bg-bg p-2 focus-within:border-fg/40">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={2}
              placeholder="Nhập tin nhắn… (Enter để gửi, Shift+Enter xuống dòng)"
              className="max-h-48 flex-1 resize-none bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted"
            />
            {busy ? (
              <button type="button" className="btn-secondary px-2.5" onClick={() => abortRef.current?.abort()} aria-label="Dừng">
                <Square className="size-4" />
              </button>
            ) : (
              <button className="btn-primary px-2.5" disabled={!input.trim()} aria-label="Gửi">
                <ArrowUp className="size-4" />
              </button>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}

// Minimal rendering: fenced code blocks get a code box, everything else keeps its line breaks.
function Rich({ text }: { text: string }) {
  const parts = text.split(/```(\w*)\n?([\s\S]*?)(?:```|$)/g);
  const out: React.ReactNode[] = [];
  for (let i = 0; i < parts.length; i += 3) {
    if (parts[i]) out.push(<span key={i} className="whitespace-pre-wrap">{parts[i]}</span>);
    if (parts[i + 2] !== undefined) {
      out.push(
        <div key={`c${i}`} className="relative my-3 overflow-hidden rounded-lg bg-code text-zinc-100">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-1 text-xs text-zinc-400">
            {parts[i + 1] || "code"}
            <CopyButton value={parts[i + 2]} className="text-zinc-400 hover:bg-white/10 hover:text-white" />
          </div>
          <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed">{parts[i + 2]}</pre>
        </div>,
      );
    }
  }
  return <>{out}</>;
}
