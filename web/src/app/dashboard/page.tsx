import Link from "next/link";
import { ArrowRight, PartyPopper } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { UsageChart, type DayPoint } from "@/components/usage-chart";
import { authed, requireSession } from "@/lib/auth";
import { formatCompact, formatNumber, formatUsd, quotaToUsd } from "@/lib/format";
import { getSelf, logStat, usageData } from "@/lib/newapi";
import { site } from "@/lib/site";

export const metadata = { title: "Tổng quan" };

const DAYS = 14;
const TZ = process.env.TIMEZONE || "Asia/Ho_Chi_Minh";

function dayKey(unix: number) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(unix * 1000));
}

export default async function Overview({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams;
  const session = await requireSession();
  const now = Math.floor(Date.now() / 1000);
  const start = now - DAYS * 86400;
  const [user, buckets, week] = await authed(() =>
    Promise.all([
      getSelf(session),
      usageData(session, start, now).catch(() => []),
      logStat(session, { type: 2, start: now - 7 * 86400, end: now }).catch(() => null),
    ]),
  );

  // Daily series for the chart.
  const days = new Map<string, DayPoint>();
  for (let i = DAYS - 1; i >= 0; i--) {
    const k = dayKey(now - i * 86400);
    days.set(k, { label: k.slice(8, 10) + "/" + k.slice(5, 7), usd: 0, requests: 0 });
  }
  const byModel = new Map<string, { usd: number; requests: number; tokens: number }>();
  for (const b of buckets) {
    const d = days.get(dayKey(b.created_at));
    if (d) {
      d.usd += quotaToUsd(b.quota);
      d.requests += b.count;
    }
    const m = byModel.get(b.model_name) || { usd: 0, requests: 0, tokens: 0 };
    m.usd += quotaToUsd(b.quota);
    m.requests += b.count;
    m.tokens += b.token_used;
    byModel.set(b.model_name, m);
  }
  const series = [...days.values()];
  const top = [...byModel.entries()].sort((a, b) => b[1].usd - a[1].usd).slice(0, 6);
  const total14 = series.reduce((a, d) => a + d.usd, 0);

  const stats = [
    { label: "Số dư", value: formatUsd(quotaToUsd(user.quota)), href: "/dashboard/topup", cta: "Nạp tiền" },
    { label: "Chi tiêu 7 ngày", value: week ? formatUsd(quotaToUsd(week.quota)) : "—" },
    { label: "Tổng đã dùng", value: formatUsd(quotaToUsd(user.used_quota)) },
    { label: "Tổng số request", value: formatNumber(user.request_count) },
  ];

  return (
    <div className="space-y-6">
      {welcome && (
        <div className="card flex items-start gap-3 border-accent/40 bg-accent-soft p-4 text-sm">
          <PartyPopper className="mt-0.5 size-5 shrink-0 text-accent" />
          <div>
            <div className="font-medium">Tài khoản đã sẵn sàng!</div>
            <div className="mt-1 text-muted">
              Bước tiếp theo: <Link href="/dashboard/topup" className="text-accent">nạp tiền</Link> rồi{" "}
              <Link href="/dashboard/keys" className="text-accent">tạo API key</Link>.
            </div>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Xin chào, {user.display_name || user.username}</h1>
        <p className="mt-1 text-sm text-muted">Tổng quan tài khoản và chi tiêu của bạn.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <div className="text-xs text-muted">{s.label}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{s.value}</div>
            {s.href && (
              <Link href={s.href} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent">
                {s.cta} <ArrowRight className="size-3" />
              </Link>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="card p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Chi tiêu {DAYS} ngày qua</h2>
            <span className="text-sm text-muted tabular-nums">{formatUsd(total14)}</span>
          </div>
          <div className="mt-4">
            <UsageChart data={series} />
          </div>
          <p className="mt-2 text-xs text-muted">Biểu đồ cập nhật sau vài phút. Chi tiết từng request ở Lịch sử sử dụng.</p>
        </div>
        <div className="card p-5">
          <h2 className="font-semibold">Mô hình dùng nhiều</h2>
          {top.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Chưa có dữ liệu sử dụng.</p>
          ) : (
            <table className="table-x mt-3">
              <thead>
                <tr>
                  <th className="!px-0">Mô hình</th>
                  <th className="text-right">Token</th>
                  <th className="!pr-0 text-right">Chi phí</th>
                </tr>
              </thead>
              <tbody>
                {top.map(([name, m]) => (
                  <tr key={name}>
                    <td className="!px-0 font-mono text-xs">{name}</td>
                    <td className="text-right text-muted tabular-nums">{formatCompact(m.tokens)}</td>
                    <td className="!pr-0 text-right tabular-nums">{formatUsd(m.usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold">Kết nối nhanh</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-xs text-muted">Base URL (chuẩn OpenAI)</div>
            <div className="mt-1 flex items-center justify-between rounded-lg border border-border bg-bg px-3 py-2 font-mono text-sm">
              {site.apiBase}/v1 <CopyButton value={`${site.apiBase}/v1`} />
            </div>
          </div>
          <div>
            <div className="text-xs text-muted">Base URL (chuẩn Anthropic, Claude Code)</div>
            <div className="mt-1 flex items-center justify-between rounded-lg border border-border bg-bg px-3 py-2 font-mono text-sm">
              {site.apiBase} <CopyButton value={site.apiBase} />
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/dashboard/keys" className="btn-primary">
            Tạo API key
          </Link>
          <Link href="/docs" className="btn-secondary">
            Đọc hướng dẫn
          </Link>
        </div>
      </div>
    </div>
  );
}
