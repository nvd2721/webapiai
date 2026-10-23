"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Quick model search: Ctrl/Cmd+K or the icon, then Enter jumps to /models?q=.
export function SearchButton() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="grid size-8 place-items-center rounded-lg text-muted hover:bg-bg-soft hover:text-fg"
        aria-label="Tìm mô hình"
        title="Tìm mô hình (Ctrl K)"
      >
        <Search className="size-4" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 p-4 pt-[15vh]" onClick={() => setOpen(false)}>
          <form
            className="card mx-auto flex max-w-lg items-center gap-2 px-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              setOpen(false);
              router.push(`/models${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
            }}
          >
            <Search className="size-4 text-muted" />
            <input
              ref={ref}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm mô hình, ví dụ claude, deepseek, gpt…"
              className="h-12 flex-1 bg-transparent text-sm outline-none"
            />
            <kbd className="badge">Enter</kbd>
          </form>
        </div>
      )}
    </>
  );
}
