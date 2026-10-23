"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { Model } from "@/lib/models";
import { KIND_LABEL, type ModelKind } from "@/data/model-meta";
import { formatCompact, formatPrice, formatUsd } from "@/lib/format";
import { CopyButton } from "./copy-button";

type Sort = "name" | "input" | "output" | "context";

export function ModelExplorer({ models }: { models: Model[] }) {
  const [q, setQ] = useState("");
  const [vendor, setVendor] = useState("");
  const [kind, setKind] = useState<ModelKind | "">("");
  const [sort, setSort] = useState<Sort>("name");

  const vendors = useMemo(() => [...new Set(models.map((m) => m.vendor))].sort(), [models]);
  const kinds = useMemo(() => [...new Set(models.map((m) => m.kind))], [models]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const r = models.filter(
      (m) =>
        (!term || m.id.toLowerCase().includes(term) || m.vendor.toLowerCase().includes(term)) &&
        (!vendor || m.vendor === vendor) &&
        (!kind || m.kind === kind),
    );
    const num = (v: number | null | undefined) => (v == null ? Infinity : v);
    if (sort === "input") r.sort((a, b) => num(a.input ?? a.callPrice) - num(b.input ?? b.callPrice));
    if (sort === "output") r.sort((a, b) => num(a.output) - num(b.output));
    if (sort === "context") r.sort((a, b) => (b.context || 0) - (a.context || 0));
    return r;
  }, [models, q, vendor, kind, sort]);

  if (models.length === 0) {
    return <div className="card mt-8 p-10 text-center text-muted">Chưa tải được danh sách mô hình, vui lòng thử lại sau.</div>;
  }

  return (
    <div className="mt-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input className="input pl-9" placeholder="Tìm mô hình, ví dụ claude, gpt, deepseek…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input md:w-44" value={vendor} onChange={(e) => setVendor(e.target.value)} aria-label="Hãng">
          <option value="">Tất cả hãng</option>
          {vendors.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <select className="input md:w-40" value={kind} onChange={(e) => setKind(e.target.value as ModelKind | "")} aria-label="Loại">
          <option value="">Mọi loại</option>
          {kinds.map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </select>
        <select className="input md:w-44" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sắp xếp">
          <option value="name">Sắp theo hãng</option>
          <option value="input">Giá vào thấp nhất</option>
          <option value="output">Giá ra thấp nhất</option>
          <option value="context">Context dài nhất</option>
        </select>
      </div>

      <div className="card mt-4 overflow-x-auto">
        <table className="table-x min-w-[720px]">
          <thead>
            <tr>
              <th>Mô hình</th>
              <th>Hãng</th>
              <th>Loại</th>
              <th className="text-right">Giá vào / 1M</th>
              <th className="text-right">Giá ra / 1M</th>
              <th className="text-right">Context</th>
            </tr>
          </thead>
          <tbody>
            {list.map((m) => (
              <tr key={m.id} className="hover:bg-bg-soft">
                <td>
                  <div className="flex items-center gap-1">
                    <Link href={`/models/${m.id}`} className="font-mono text-[13px] font-medium hover:text-accent">
                      {m.id}
                    </Link>
                    <CopyButton value={m.id} />
                  </div>
                </td>
                <td className="text-muted">{m.vendor}</td>
                <td>
                  <span className="badge">{KIND_LABEL[m.kind]}</span>
                </td>
                {m.perCall ? (
                  <td colSpan={2} className="text-right">
                    {formatUsd(m.callPrice)} <span className="text-muted">/ lần gọi</span>
                  </td>
                ) : (
                  <>
                    <td className="text-right tabular-nums">{formatPrice(m.input)}</td>
                    <td className="text-right tabular-nums">{m.kind === "embedding" ? "—" : formatPrice(m.output)}</td>
                  </>
                )}
                <td className="text-right text-muted tabular-nums">{m.context ? formatCompact(m.context) : "—"}</td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-muted">
                  Không có mô hình nào khớp bộ lọc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
