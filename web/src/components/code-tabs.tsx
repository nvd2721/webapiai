"use client";

import { useState } from "react";
import { CopyButton } from "./copy-button";

export type CodeSample = { label: string; code: string };

export function CodeTabs({ samples, className = "" }: { samples: CodeSample[]; className?: string }) {
  const [i, setI] = useState(0);
  const cur = samples[i];
  return (
    <div className={`overflow-hidden rounded-xl border border-white/10 bg-code text-zinc-100 shadow-xl ${className}`}>
      <div className="flex items-center justify-between border-b border-white/10 px-2">
        <div className="flex overflow-x-auto">
          {samples.map((s, j) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setI(j)}
              className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-medium transition-colors ${
                i === j ? "border-indigo-400 text-white" : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <CopyButton value={cur.code} className="text-zinc-400 hover:bg-white/10 hover:text-white" />
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed">
        <code>{cur.code}</code>
      </pre>
    </div>
  );
}
