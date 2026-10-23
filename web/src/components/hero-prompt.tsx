"use client";

import { ArrowUp, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const SUGGESTIONS = ["Viết email xin nghỉ phép lịch sự", "Giải thích async/await trong JavaScript", "Tóm tắt ưu nhược điểm của RAG"];

export function HeroPrompt({ models }: { models: { id: string; name: string }[] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [model, setModel] = useState(models[0]?.id || "");
  const go = (t = text) => router.push(`/console/chat?model=${encodeURIComponent(model)}${t.trim() ? `&q=${encodeURIComponent(t.trim())}` : ""}`);

  return (
    <div className="mx-auto mt-10 max-w-2xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go();
        }}
        className="rounded-2xl bg-gradient-to-r from-fg/25 via-fg/5 to-fg/25 p-px shadow-lg"
      >
        <div className="rounded-2xl bg-card p-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                go();
              }
            }}
            rows={2}
            placeholder="Hỏi bất cứ điều gì…"
            className="w-full resize-none bg-transparent px-2 py-1 text-[15px] outline-none placeholder:text-muted"
          />
          <div className="flex items-center justify-between gap-2">
            <select value={model} onChange={(e) => setModel(e.target.value)} className="max-w-56 rounded-lg border border-border bg-bg px-2 py-1.5 text-xs" aria-label="Mô hình">
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <button className="btn-primary px-3 py-1.5 text-xs">
              Thử mô hình <ArrowUp className="size-3.5" />
            </button>
          </div>
        </div>
      </form>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" onClick={() => go(s)} className="badge gap-1 rounded-full px-3 py-1 hover:border-fg/40 hover:text-fg">
            <Sparkles className="size-3" /> {s}
          </button>
        ))}
      </div>
    </div>
  );
}
