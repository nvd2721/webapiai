import Link from "next/link";
import { authed, requireSession } from "@/lib/auth";
import { formatDateTime, formatNumber, formatUsd, quotaToUsd } from "@/lib/format";
import { listLogs, listTokens, logStat } from "@/lib/newapi";

export const metadata = { title: "Lịch sử sử dụng" };

const RANGES = { "1": "24 giờ", "7": "7 ngày", "30": "30 ngày", all: "Tất cả" } as const;
const TYPES = { "2": "Sử dụng API", "1": "Nạp tiền", "5": "Lỗi", "0": "Tất cả" } as const;
const TYPE_LABEL: Record<number, string> = { 1: "Nạp tiền", 2: "Sử dụng", 3: "Quản trị", 4: "Hệ thống", 5: "Lỗi", 6: "Hoàn tiền" };
const PAGE_SIZE = 20;

type SP = { range?: string; type?: string; model?: string; key?: string; p?: string };

export default async function UsagePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const range = (sp.range && sp.range in RANGES ? sp.range : "7") as keyof typeof RANGES;
  const type = (sp.type && sp.type in TYPES ? sp.type : "2") as keyof typeof TYPES;
  const page = Math.max(1, Number(sp.p) || 1);
  const now = Math.floor(Date.now() / 1000);
  const query = {
    type: Number(type),
    model: sp.model?.trim() || "",
    token: sp.key || "",
    start: range === "all" ? 0 : now - Number(range) * 86400,
    end: range === "all" ? 0 : now,
  };

  const session = await requireSession();
  const [logs, stat, tokens] = await authed(() =>
    Promise.all([
      listLogs(session, { ...query, page, size: PAGE_SIZE }),
      logStat(session, { ...query, type: 2 }).catch(() => null),
      listTokens(session, 1, 100).catch(() => ({ items: [] })),
    ]),
  );
  const pages = Math.max(1, Math.ceil(logs.total / PAGE_SIZE));
  const href = (patch: Partial<SP>) => {
    const p = new URLSearchParams({ range, type, model: query.model, key: query.token, p: String(page), ...patch } as Record<string, string>);
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    return `/dashboard/usage?${p}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lịch sử sử dụng</h1>
        <p className="mt-1 text-sm text-muted">Từng request kèm số token và chi phí. Nội dung prompt không được lưu.</p>
      </div>

      <form className="card flex flex-wrap items-end gap-3 p-4" action="/dashboard/usage">
        <div>
          <label className="label text-xs" htmlFor="range">
            Thời gian
          </label>
          <select id="range" name="range" defaultValue={range} className="input w-32">
            {Object.entries(RANGES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label text-xs" htmlFor="type">
            Loại
          </label>
          <select id="type" name="type" defaultValue={type} className="input w-36">
            {Object.entries(TYPES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label text-xs" htmlFor="key">
            API key
          </label>
          <select id="key" name="key" defaultValue={query.token} className="input w-40">
            <option value="">Tất cả key</option>
            {tokens.items.map((t) => (
              <option key={t.id} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label text-xs" htmlFor="model">
            Mô hình
          </label>
          <input id="model" name="model" defaultValue={query.model} className="input w-44" placeholder="ví dụ claude" />
        </div>
        <button className="btn-secondary">Lọc</button>
        {stat && (
          <div className="ml-auto text-right">
            <div className="text-xs text-muted">Tổng chi phí ({RANGES[range].toLowerCase()})</div>
            <div className="text-lg font-semibold tabular-nums">{formatUsd(quotaToUsd(stat.quota))}</div>
          </div>
        )}
      </form>

      <div className="card overflow-x-auto">
        <table className="table-x min-w-[860px]">
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>Key</th>
              <th>Mô hình</th>
              <th className="text-right">Token vào</th>
              <th className="text-right">Token ra</th>
              <th className="text-right">Chi phí</th>
              <th className="text-right">Thời gian xử lý</th>
            </tr>
          </thead>
          <tbody>
            {logs.items.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap text-muted">{formatDateTime(l.created_at)}</td>
                {l.type === 2 ? (
                  <>
                    <td>{l.token_name || "—"}</td>
                    <td className="font-mono text-xs">
                      {l.model_name}
                      {l.is_stream && <span className="ml-1.5 badge">stream</span>}
                    </td>
                    <td className="text-right tabular-nums">{formatNumber(l.prompt_tokens)}</td>
                    <td className="text-right tabular-nums">{formatNumber(l.completion_tokens)}</td>
                  </>
                ) : (
                  <td colSpan={4}>
                    <span className="badge mr-2">{TYPE_LABEL[l.type] || l.type}</span>
                    <span className="text-muted">{l.content || l.model_name}</span>
                  </td>
                )}
                <td className={`text-right tabular-nums ${l.type === 1 ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                  {l.quota ? `${l.type === 1 ? "+" : ""}${formatUsd(quotaToUsd(l.quota))}` : "—"}
                </td>
                <td className="text-right text-muted tabular-nums">{l.type === 2 ? `${l.use_time}s` : ""}</td>
              </tr>
            ))}
            {logs.items.length === 0 && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-muted">
                  Không có dữ liệu trong khoảng thời gian này.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">
            Trang {page} / {pages} · {formatNumber(logs.total)} bản ghi
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link className="btn-secondary" href={href({ p: String(page - 1) })}>
                ← Trước
              </Link>
            ) : (
              <span className="btn-secondary opacity-50">← Trước</span>
            )}
            {page < pages ? (
              <Link className="btn-secondary" href={href({ p: String(page + 1) })}>
                Sau →
              </Link>
            ) : (
              <span className="btn-secondary opacity-50">Sau →</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
