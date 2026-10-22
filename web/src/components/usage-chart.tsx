import { formatUsd } from "@/lib/format";

export type DayPoint = { label: string; usd: number; requests: number };

// Plain SVG bar chart, rendered on the server.
export function UsageChart({ data }: { data: DayPoint[] }) {
  const max = Math.max(...data.map((d) => d.usd), 0);
  const W = 640;
  const H = 180;
  const pad = { l: 44, r: 8, t: 10, b: 24 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const bw = iw / Math.max(data.length, 1);
  const ticks = max > 0 ? [0, max / 2, max] : [0];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Chi tiêu theo ngày">
      {ticks.map((t) => {
        const y = pad.t + ih - (max ? (t / max) * ih : 0);
        return (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="var(--border)" strokeDasharray={t === 0 ? undefined : "3 3"} />
            <text x={pad.l - 6} y={y + 3} textAnchor="end" fontSize="10" fill="var(--muted)">
              {formatUsd(t)}
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const h = max ? (d.usd / max) * ih : 0;
        const x = pad.l + i * bw + bw * 0.18;
        return (
          <g key={d.label}>
            <rect x={x} y={pad.t + ih - h} width={bw * 0.64} height={Math.max(h, d.usd > 0 ? 1.5 : 0)} rx="3" fill="var(--accent)">
              <title>{`${d.label}: ${formatUsd(d.usd)} · ${d.requests} request`}</title>
            </rect>
            {(data.length <= 14 || i % 2 === 0) && (
              <text x={x + bw * 0.32} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--muted)">
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
