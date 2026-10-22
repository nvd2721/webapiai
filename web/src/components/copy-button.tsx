"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyButton({ value, label, className = "" }: { value: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          // Clipboard blocked (http, iframe): leave the text selectable instead.
        }
      }}
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted transition-colors hover:bg-bg-soft hover:text-fg ${className}`}
      aria-label={label || "Sao chép"}
    >
      {done ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {label && <span>{done ? "Đã chép" : label}</span>}
    </button>
  );
}
