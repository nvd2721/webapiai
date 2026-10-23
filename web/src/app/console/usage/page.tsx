import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { UsageChart, type DayPoint } from "@/components/usage-chart";
import { authed, requireSession } from "@/lib/auth";
import { formatCompact, formatNumber, formatUsd, quotaToUsd } from "@/lib/format";
import { usageData } from "@/lib/newapi";

export const metadata = { title: "Sử dụng và chi phí" };

const RANGES = [7, 14, 30] as const;
const TZ = process.env.TIMEZONE || "Asia/Ho_Chi_Minh";

function dayKey(unix: number) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(unix * 1000));
}

export default async function UsagePage({ searchParams }: { searchParams: Promise<{ days?: string; model?: string }> }) {
  const sp = await searchParams;
  const days = RANGES.find((d) => String(d) === sp.days) || 14;
  const session = await requireSession();
  const now = Math.floor(Date.now() / 1000);
  // New API caps /api/data/self at one month.
  const buckets = await authed(() => usageData(session, now - days * 86400, now));
  const filtered = sp.model ? buckets.filter((b) => b.model_name === sp.model) : buckets;

  const series = new Map<string, DayPoint>();
  for (let i = days - 1; i >= 0; i--) {
    const k = dayKey(now - i * 86400);
    series.set(k, { label: `${k.slice(8, 10)}/${k.slice(5, 7)}`, usd: 0, requests: 0 });
  }
  const byModel = new Map<string, { usd: number; requests: number; tokens: number }>();
  let usd = 0,
    requests = 0,
    tokens = 0;
  for (const b of filtered) {
    const d = series.get(dayKey(b.created_at));
    const v = quotaToUsd(b.quota);
    if (d) {
      d.usd += v;
      d.requests += b.count;
    }
    usd += v;
    requests += b.count;
    tokens += b.token_used;
  }
  for (const b of buckets) {
    const m = byModel.get(b.model_name) || { usd: 0, requests: 0, tokens: 0 };
    m.usd += quotaToUsd(b.quota);
    m.requests += b.count;
    m.tokens += b.token_used;
    byModel.set(b.model_name, m);
  }
  const models = [...byModel.entries()].sort((a, b) => b[1].usd - a[1].usd);
  const totalAll = models.reduce((a, [, m]) => a + m.usd, 0);
  const href = (p: { days?: number; model?: string | null }) => {
    const q = new URLSearchParams();
    q.set("days", String(p.days ?? days));
    const model = p.model === undefined ? sp.model : p.model;
    if (model) q.set("model", model);
    return `/console/usage?${q}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sử dụng và chi phí"
        desc="Thống kê theo ngày và theo mô hình. Số liệu cập nhật sau vài phút."
        refresh={href({})}
        action={
          <div className="flex rounded-lg border border-border bg-bg p-0.5 text-sm">
            {RANGES.map((d) => (
              <Link key={d} href={href({ days: d })} className={`rounded-md px-3 py-1.5 ${d === days ? "bg-accent text-accent-fg" : "text-muted hover:text-fg"}`}>
                {d} ngày
              </Link>
            ))}
          </div>
        }
      />

      {sp.model && (
        <div className="flex items-center gap-2 text-sm">
          Đang lọc: <span className="badge font-mono">{sp.model}</span>
          <Link href={href({ model: null })} className="text-muted underline">
            Bỏ lọc
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Chi phí", formatUsd(usd)],
          ["Số request", formatNumber(requests)],
          ["Token", formatCompact(tokens)],
          ["Chi phí trung bình / request", requests ? formatUsd(usd / requests, { max: 5 }) : "—"],
        ].map(([l, v]) => (
          <div key={l} className="card p-4">
            <div className="text-xs text-muted">{l}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{v}</div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h2 className="font-semibold">Chi phí theo ngày</h2>
        <div className="mt-4">
          <UsageChart data={[...series.values()]} />
        </div>
      </div>

      <div className="card overflow-x-auto">
        <div className="border-b border-border px-4 py-3 font-semibold">Theo mô hình</div>
        <table className="table-x min-w-[640px]">
          <thead>
            <tr>
              <th>Mô hình</th>
              <th className="text-right">Request</th>
              <th className="text-right">Token</th>
              <th className="text-right">Chi phí</th>
              <th className="w-48">Tỷ trọng</th>
            </tr>
          </thead>
          <tbody>
            {models.map(([name, m]) => (
              <tr key={name} className={sp.model === name ? "bg-bg-soft" : ""}>
                <td>
                  <Link href={href({ model: name })} className="font-mono text-xs hover:underline">
                    {name}
                  </Link>
                </td>
                <td className="text-right tabular-nums">{formatNumber(m.requests)}</td>
                <td className="text-right tabular-nums">{formatCompact(m.tokens)}</td>
                <td className="text-right tabular-nums">{formatUsd(m.usd)}</td>
                <td>
                  <div className="h-1.5 rounded-full bg-bg-soft">
                    <div className="h-1.5 rounded-full bg-fg" style={{ width: `${totalAll ? (m.usd / totalAll) * 100 : 0}%` }} />
                  </div>
                </td>
              </tr>
            ))}
            {models.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-muted">
                  Chưa có dữ liệu trong {days} ngày qua.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
