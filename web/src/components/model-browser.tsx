"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftRight, ChevronDown, PanelLeft, RotateCcw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { Model } from "@/lib/models";
import { KIND_LABEL, MODALITY_LABEL, type Modality, type ModelKind } from "@/data/model-meta";
import { formatCompact, formatPrice, formatUsd } from "@/lib/format";
import { CopyButton } from "./copy-button";

type Sort = "vendor" | "newest" | "name" | "price-asc" | "price-desc" | "context";
type Deal = "all" | "discounted" | "free";

const SORTS: Record<Sort, string> = {
  vendor: "Theo hãng",
  newest: "Mới nhất",
  name: "Tên (A-Z)",
  "price-asc": "Giá tăng dần",
  "price-desc": "Giá giảm dần",
  context: "Context dài nhất",
};
const CONTEXT_STEPS = [0, 4_000, 16_000, 32_000, 64_000, 128_000, 256_000, 1_000_000];
const PROTOCOL_LABEL: Record<string, string> = { openai: "OpenAI", anthropic: "Anthropic", gemini: "Gemini", "image-generation": "Tạo ảnh", embeddings: "Embedding" };

function price(m: Model) {
  return m.perCall ? (m.callPrice ?? 0) : (m.input ?? 0);
}

export function ModelBrowser({ models }: { models: Model[] }) {
  const sp = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState(sp.get("q") || "");
  const [kind, setKind] = useState<ModelKind | "all">((sp.get("kind") as ModelKind) || "all");
  const [deal, setDeal] = useState<Deal>((sp.get("deal") as Deal) || "all");
  const [sort, setSort] = useState<Sort>("vendor");
  const [vendors, setVendors] = useState<string[]>([]);
  const [inputs, setInputs] = useState<Modality[]>([]);
  const [protocols, setProtocols] = useState<string[]>([]);
  const [minCtx, setMinCtx] = useState(0);
  const [reasoning, setReasoning] = useState<"any" | "yes" | "no">("any");
  const [sidebar, setSidebar] = useState(true);
  const [picked, setPicked] = useState<string[]>([]);

  const allVendors = useMemo(() => [...new Set(models.map((m) => m.vendor))].sort(), [models]);
  const allProtocols = useMemo(() => [...new Set(models.flatMap((m) => m.endpoints))].sort(), [models]);
  const allInputs = useMemo(() => [...new Set(models.flatMap((m) => m.inputs))] as Modality[], [models]);

  // Everything except the kind tab, so tab counts reflect the other filters.
  const base = useMemo(() => {
    const term = q.trim().toLowerCase();
    return models.filter(
      (m) =>
        (!term || m.id.toLowerCase().includes(term) || m.vendor.toLowerCase().includes(term) || m.description?.toLowerCase().includes(term)) &&
        (deal === "all" || (deal === "free" ? m.free : m.discountPct > 0)) &&
        (vendors.length === 0 || vendors.includes(m.vendor)) &&
        (inputs.length === 0 || inputs.every((i) => m.inputs.includes(i))) &&
        (protocols.length === 0 || protocols.some((p) => m.endpoints.includes(p))) &&
        (minCtx === 0 || (m.context || 0) >= minCtx) &&
        (reasoning === "any" || !!m.reasoning === (reasoning === "yes")),
    );
  }, [models, q, deal, vendors, inputs, protocols, minCtx, reasoning]);

  const kinds = useMemo(() => {
    const c = new Map<ModelKind, number>();
    for (const m of base) c.set(m.kind, (c.get(m.kind) || 0) + 1);
    return c;
  }, [base]);

  const list = useMemo(() => {
    const r = base.filter((m) => kind === "all" || m.kind === kind);
    const by: Record<Sort, (a: Model, b: Model) => number> = {
      vendor: (a, b) => a.vendor.localeCompare(b.vendor) || a.id.localeCompare(b.id),
      newest: (a, b) => (b.released || "").localeCompare(a.released || ""),
      name: (a, b) => a.id.localeCompare(b.id),
      "price-asc": (a, b) => price(a) - price(b),
      "price-desc": (a, b) => price(b) - price(a),
      context: (a, b) => (b.context || 0) - (a.context || 0),
    };
    return r.sort(by[sort]);
  }, [base, kind, sort]);

  const resetAll = () => {
    setVendors([]);
    setInputs([]);
    setProtocols([]);
    setMinCtx(0);
    setReasoning("any");
  };
  const toggle = <T,>(arr: T[], v: T, set: (x: T[]) => void) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <div className="mt-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn-secondary px-2.5" onClick={() => setSidebar(!sidebar)} title="Ẩn/hiện bộ lọc" aria-label="Ẩn/hiện bộ lọc">
          <PanelLeft className="size-4" />
        </button>
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input className="input pl-9" placeholder="Tìm mô hình…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input w-auto" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sắp xếp">
          {Object.entries(SORTS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <div className="flex rounded-lg border border-border p-0.5 text-sm">
          {(
            [
              ["all", "Tất cả"],
              ["discounted", "Giảm giá"],
              ["free", "Miễn phí"],
            ] as [Deal, string][]
          ).map(([k, v]) => (
            <button
              key={k}
              type="button"
              onClick={() => setDeal(k)}
              className={`rounded-md px-3 py-1.5 ${deal === k ? "bg-accent text-accent-fg" : "text-muted hover:text-fg"}`}
            >
              {v}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => router.push(`/compare${picked.length ? `?m=${picked.map(encodeURIComponent).join(",")}` : ""}`)}
        >
          <ArrowLeftRight className="size-4" /> So sánh{picked.length > 0 && ` (${picked.length})`}
        </button>
      </div>

      {/* Kind tabs */}
      <div className="sticky top-14 z-20 -mx-4 mt-4 flex gap-1 overflow-x-auto border-b border-border bg-bg/90 px-4 backdrop-blur sm:mx-0 sm:px-0">
        {(["all", ...(Object.keys(KIND_LABEL) as ModelKind[]).filter((k) => kinds.has(k))] as (ModelKind | "all")[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`-mb-px border-b-2 px-3 py-2.5 text-sm whitespace-nowrap ${kind === k ? "border-fg font-medium" : "border-transparent text-muted hover:text-fg"}`}
          >
            {k === "all" ? "Tất cả" : KIND_LABEL[k]} <span className="text-xs text-muted">{k === "all" ? base.length : kinds.get(k)}</span>
          </button>
        ))}
      </div>

      <div className={`mt-6 grid gap-6 ${sidebar ? "lg:grid-cols-[240px_1fr]" : ""}`}>
        {sidebar && (
          <aside className="space-y-1 text-sm lg:sticky lg:top-28 lg:max-h-[calc(100dvh-8rem)] lg:self-start lg:overflow-y-auto">
            <FilterGroup title="Loại đầu vào" active={inputs.length > 0} onReset={() => setInputs([])}>
              {allInputs.map((i) => (
                <Check key={i} label={MODALITY_LABEL[i]} checked={inputs.includes(i)} onChange={() => toggle(inputs, i, setInputs)} />
              ))}
            </FilterGroup>
            <FilterGroup title="Context tối thiểu" active={minCtx > 0} onReset={() => setMinCtx(0)}>
              <input
                type="range"
                min={0}
                max={CONTEXT_STEPS.length - 1}
                value={CONTEXT_STEPS.indexOf(minCtx)}
                onChange={(e) => setMinCtx(CONTEXT_STEPS[Number(e.target.value)])}
                className="w-full accent-[var(--fg)]"
                aria-label="Context tối thiểu"
              />
              <div className="flex justify-between text-xs text-muted">
                <span>Mọi mức</span>
                <span className="font-medium text-fg">{minCtx ? `≥ ${formatCompact(minCtx)}` : "—"}</span>
                <span>1M</span>
              </div>
            </FilterGroup>
            <FilterGroup title="Hãng" active={vendors.length > 0} onReset={() => setVendors([])}>
              {allVendors.map((v) => (
                <Check key={v} label={v} checked={vendors.includes(v)} onChange={() => toggle(vendors, v, setVendors)} />
              ))}
            </FilterGroup>
            {allProtocols.length > 1 && (
              <FilterGroup title="Chuẩn API" active={protocols.length > 0} onReset={() => setProtocols([])}>
                {allProtocols.map((p) => (
                  <Check key={p} label={PROTOCOL_LABEL[p] || p} checked={protocols.includes(p)} onChange={() => toggle(protocols, p, setProtocols)} />
                ))}
              </FilterGroup>
            )}
            <FilterGroup title="Suy luận" active={reasoning !== "any"} onReset={() => setReasoning("any")}>
              {(
                [
                  ["any", "Tất cả"],
                  ["yes", "Có suy luận"],
                  ["no", "Không suy luận"],
                ] as const
              ).map(([k, v]) => (
                <label key={k} className="flex cursor-pointer items-center gap-2 py-1">
                  <input type="radio" name="reasoning" checked={reasoning === k} onChange={() => setReasoning(k)} className="accent-[var(--fg)]" />
                  <span className={reasoning === k ? "font-medium" : "text-muted"}>{v}</span>
                </label>
              ))}
            </FilterGroup>
            <button type="button" onClick={resetAll} className="btn-ghost mt-2 w-full justify-start px-2 text-xs">
              <RotateCcw className="size-3.5" /> Bỏ mọi bộ lọc
            </button>
          </aside>
        )}

        <div>
          <div className="mb-3 text-sm text-muted">{list.length} mô hình</div>
          <div className={`grid gap-3 ${sidebar ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3"}`}>
            {list.map((m) => (
              <ModelCard key={m.id} m={m} picked={picked.includes(m.id)} onPick={() => toggle(picked, m.id, setPicked)} />
            ))}
          </div>
          {list.length === 0 && <div className="card p-10 text-center text-sm text-muted">Không có mô hình nào khớp bộ lọc.</div>}
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ title, active, onReset, children }: { title: string; active: boolean; onReset: () => void; children: React.ReactNode }) {
  return (
    <details open className="group border-b border-border py-2">
      <summary className="flex cursor-pointer list-none items-center justify-between py-1 font-medium [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span className="flex items-center gap-1">
          {active && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onReset();
              }}
              className="rounded p-0.5 text-muted hover:text-fg"
              aria-label={`Bỏ lọc ${title}`}
            >
              <RotateCcw className="size-3" />
            </button>
          )}
          <ChevronDown className="size-4 text-muted transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <div className="pt-1 pb-1">{children}</div>
    </details>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 py-1">
      <input type="checkbox" checked={checked} onChange={onChange} className="accent-[var(--fg)]" />
      <span className={checked ? "font-medium" : "text-muted"}>{label}</span>
    </label>
  );
}

export function ModelCard({ m, picked, onPick }: { m: Model; picked?: boolean; onPick?: () => void }) {
  return (
    <div className={`card group relative flex flex-col p-4 transition-colors hover:border-fg/40 ${picked ? "border-fg" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/models/${m.id}`} className="font-semibold hover:underline">
            <span className="text-muted">{m.vendor}: </span>
            {m.name}
          </Link>
          <div className="mt-0.5 flex items-center gap-1 font-mono text-xs text-muted">
            {m.id} <CopyButton value={m.id} className="px-1 py-0.5" />
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          {m.free && <span className="badge border-free/40 bg-free/10 text-free">Miễn phí</span>}
          {m.discountPct > 0 && <span className="badge border-deal/40 bg-deal/10 text-deal">-{m.discountPct}%</span>}
        </div>
      </div>
      {m.description && <p className="mt-2 line-clamp-2 text-sm text-muted">{m.description}</p>}
      <div className="mt-2 flex flex-wrap gap-1">
        <span className="badge">{KIND_LABEL[m.kind]}</span>
        {m.inputs
          .filter((i) => i !== "text")
          .map((i) => (
            <span key={i} className="badge">
              {MODALITY_LABEL[i]}
            </span>
          ))}
        {m.reasoning && <span className="badge">Suy luận</span>}
        {m.tools && <span className="badge">Tools</span>}
      </div>
      <div className="mt-auto grid grid-cols-4 gap-2 pt-4 text-xs">
        {m.perCall ? (
          <Stat label="Mỗi lần gọi" value={formatUsd(m.callPrice)} wide />
        ) : (
          <>
            <Stat label="Vào / 1M" value={formatPrice(m.input)} green={m.discountPct > 0} />
            <Stat label="Ra / 1M" value={m.kind === "embedding" ? "—" : formatPrice(m.output)} green={m.discountPct > 0} />
          </>
        )}
        <Stat label="Context" value={m.context ? formatCompact(m.context) : "—"} />
        <Stat label="Ra tối đa" value={m.maxOutput ? formatCompact(m.maxOutput) : "—"} />
      </div>
      {onPick && (
        <label className="absolute right-4 bottom-4 hidden cursor-pointer items-center gap-1 text-xs text-muted group-hover:flex has-checked:flex">
          <input type="checkbox" checked={!!picked} onChange={onPick} className="accent-[var(--fg)]" /> So sánh
        </label>
      )}
    </div>
  );
}

function Stat({ label, value, green, wide }: { label: string; value: string; green?: boolean; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <div className="text-muted">{label}</div>
      <div className={`mt-0.5 font-medium tabular-nums ${green ? "text-free" : ""}`}>{value}</div>
    </div>
  );
}
