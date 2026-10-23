"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, MessageSquare, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { Model } from "@/lib/models";
import { KIND_LABEL, MODALITY_LABEL } from "@/data/model-meta";
import { formatNumber, formatPrice, formatUsd } from "@/lib/format";

const MAX = 4;

type Row = { label: string; get: (m: Model) => number | string | boolean | null | undefined; best?: "min" | "max"; fmt?: (v: number) => string };
const SECTIONS: { title: string; rows: Row[] }[] = [
  {
    title: "Tổng quan",
    rows: [
      { label: "Hãng", get: (m) => m.vendor },
      { label: "Loại", get: (m) => KIND_LABEL[m.kind] },
      { label: "Đầu vào", get: (m) => m.inputs.map((i) => MODALITY_LABEL[i]).join(", ") },
      { label: "Phát hành", get: (m) => m.released },
    ],
  },
  {
    title: "Giá (USD)",
    rows: [
      { label: "Vào / 1M token", get: (m) => m.input, best: "min", fmt: formatPrice },
      { label: "Ra / 1M token", get: (m) => m.output, best: "min", fmt: formatPrice },
      { label: "Đọc cache / 1M token", get: (m) => m.cacheRead, best: "min", fmt: formatPrice },
      { label: "Mỗi lần gọi", get: (m) => m.callPrice, best: "min", fmt: (v) => formatUsd(v) },
    ],
  },
  {
    title: "Giới hạn",
    rows: [
      { label: "Context", get: (m) => m.context, best: "max", fmt: (v) => `${formatNumber(v)} token` },
      { label: "Đầu ra tối đa", get: (m) => m.maxOutput, best: "max", fmt: (v) => `${formatNumber(v)} token` },
    ],
  },
  {
    title: "Khả năng",
    rows: [
      { label: "Suy luận", get: (m) => !!m.reasoning },
      { label: "Đọc ảnh", get: (m) => !!m.vision },
      { label: "Gọi hàm (tools)", get: (m) => !!m.tools },
      { label: "Chuẩn API", get: (m) => m.endpoints.join(", ") },
    ],
  },
];

function presets(models: Model[]) {
  const chat = models.filter((m) => m.kind === "chat" && !m.perCall);
  const byPrice = [...chat].sort((a, b) => (b.input || 0) - (a.input || 0));
  const pick = (ids: string[]) => ids.filter((id) => models.some((m) => m.id === id));
  const take = (arr: Model[], n = 3) => arr.slice(0, n).map((m) => m.id);
  return [
    { name: "Hàng đầu", desc: "Mô hình mạnh nhất của từng hãng", ids: pick(["claude-opus-4-5", "gpt-5", "gemini-2.5-pro"]).length >= 2 ? pick(["claude-opus-4-5", "gpt-5", "gemini-2.5-pro"]) : take(byPrice) },
    { name: "Rẻ nhất", desc: "Giá vào thấp nhất, không tính mô hình miễn phí", ids: take([...chat].filter((m) => !m.free).sort((a, b) => (a.input || 0) - (b.input || 0))) },
    { name: "Lập trình", desc: "Hợp với Claude Code, Cursor", ids: pick(["claude-sonnet-4-5", "gpt-5", "glm-4.6", "kimi-k2"]).slice(0, 3) },
    { name: "Suy luận", desc: "Mô hình có chế độ suy nghĩ", ids: take(byPrice.filter((m) => m.reasoning)) },
  ].filter((p) => p.ids.length >= 2);
}

export function CompareView({ models }: { models: Model[] }) {
  const sp = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const ids = (sp.get("m") || "").split(",").filter((id) => models.some((m) => m.id === id)).slice(0, MAX);
  const chosen = ids.map((id) => models.find((m) => m.id === id)!);
  const [highlight, setHighlight] = useState(true);
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  const options = useMemo(
    () => models.filter((m) => !ids.includes(m.id) && m.id.toLowerCase().includes(q.toLowerCase())).slice(0, 30),
    [models, ids, q],
  );
  const set = (next: string[]) => router.replace(`${path}${next.length ? `?m=${next.map(encodeURIComponent).join(",")}` : ""}`, { scroll: false });

  if (chosen.length === 0) {
    return (
      <div className="mt-8">
        <h2 className="text-sm font-medium text-muted">Bộ so sánh có sẵn</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {presets(models).map((p) => (
            <button key={p.name} type="button" onClick={() => set(p.ids)} className="card p-5 text-left transition-colors hover:border-fg/40">
              <div className="font-semibold">{p.name}</div>
              <div className="mt-1 text-sm text-muted">{p.desc}</div>
              <div className="mt-3 space-y-0.5 font-mono text-xs text-muted">
                {p.ids.map((id) => (
                  <div key={id}>{id}</div>
                ))}
              </div>
            </button>
          ))}
        </div>
        <div className="mt-8">
          <Picker open={adding} setOpen={setAdding} q={q} setQ={setQ} options={options} onPick={(id) => set([id])} />
        </div>
      </div>
    );
  }

  const cell = (r: Row, m: Model) => {
    const v = r.get(m);
    if (typeof v === "boolean") return v ? <Check className="size-4" /> : <span className="text-muted">—</span>;
    if (v == null || v === "") return <span className="text-muted">—</span>;
    if (typeof v === "number") return r.fmt ? r.fmt(v) : v;
    return v;
  };
  const isBest = (r: Row, m: Model) => {
    if (!highlight || !r.best || chosen.length < 2) return false;
    const vals = chosen.map((x) => r.get(x)).filter((v): v is number => typeof v === "number");
    const v = r.get(m);
    if (typeof v !== "number" || vals.length < 2) return false;
    return v === (r.best === "min" ? Math.min(...vals) : Math.max(...vals));
  };

  return (
    <div className="mt-8">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={highlight} onChange={(e) => setHighlight(e.target.checked)} className="accent-[var(--fg)]" />
          Tô đậm giá trị tốt nhất
        </label>
        <button type="button" className="btn-ghost ml-auto text-xs" onClick={() => set([])}>
          Xóa tất cả
        </button>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="w-44 p-4" />
              {chosen.map((m) => (
                <th key={m.id} className="p-4 text-left align-top font-normal">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs text-muted">{m.vendor}</div>
                      <Link href={`/models/${m.id}`} className="font-semibold hover:underline">
                        {m.name}
                      </Link>
                      <div className="font-mono text-xs text-muted">{m.id}</div>
                    </div>
                    <button type="button" className="text-muted hover:text-fg" onClick={() => set(ids.filter((x) => x !== m.id))} aria-label={`Bỏ ${m.id}`}>
                      <X className="size-4" />
                    </button>
                  </div>
                  <Link href={`/console/chat?model=${encodeURIComponent(m.id)}`} className="btn-secondary mt-3 py-1 text-xs">
                    <MessageSquare className="size-3.5" /> Chat
                  </Link>
                </th>
              ))}
              {chosen.length < MAX && (
                <th className="p-4 align-top">
                  <Picker open={adding} setOpen={setAdding} q={q} setQ={setQ} options={options} onPick={(id) => set([...ids, id])} />
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {SECTIONS.map((sec) => (
              <FragmentRows key={sec.title} title={sec.title} cols={chosen.length + (chosen.length < MAX ? 1 : 0)}>
                {sec.rows.map((r) => (
                  <tr key={r.label} className="border-b border-border last:border-0">
                    <td className="p-4 text-muted">{r.label}</td>
                    {chosen.map((m) => (
                      <td key={m.id} className={`p-4 tabular-nums ${isBest(r, m) ? "font-semibold text-free" : ""}`}>
                        {cell(r, m)}
                      </td>
                    ))}
                    {chosen.length < MAX && <td />}
                  </tr>
                ))}
              </FragmentRows>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FragmentRows({ title, cols, children }: { title: string; cols: number; children: React.ReactNode }) {
  return (
    <>
      <tr className="bg-bg-soft">
        <td colSpan={cols + 1} className="px-4 py-2 text-xs font-semibold tracking-wide text-muted uppercase">
          {title}
        </td>
      </tr>
      {children}
    </>
  );
}

function Picker({
  open,
  setOpen,
  q,
  setQ,
  options,
  onPick,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  q: string;
  setQ: (v: string) => void;
  options: Model[];
  onPick: (id: string) => void;
}) {
  return (
    <div className="relative">
      <button type="button" className="btn-secondary" onClick={() => setOpen(!open)}>
        <Plus className="size-4" /> Thêm mô hình
      </button>
      {open && (
        <div className="card absolute z-30 mt-2 w-72 p-2 text-left shadow-xl">
          <input autoFocus className="input mb-2" placeholder="Tìm mô hình…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="max-h-72 overflow-y-auto">
            {options.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onPick(m.id);
                  setOpen(false);
                  setQ("");
                }}
                className="block w-full rounded-md px-2 py-1.5 text-left hover:bg-bg-soft"
              >
                <div className="text-sm">{m.name}</div>
                <div className="font-mono text-xs text-muted">{m.id}</div>
              </button>
            ))}
            {options.length === 0 && <div className="p-2 text-sm text-muted">Không tìm thấy.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
