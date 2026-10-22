// New API stores money as "quota". 1 USD = QUOTA_PER_UNIT quota (500000 by default).
export const QUOTA_PER_UNIT = Number(process.env.NEWAPI_QUOTA_PER_UNIT || 500000);

export function quotaToUsd(quota: number): number {
  return quota / QUOTA_PER_UNIT;
}

export function usdToQuota(usd: number): number {
  return Math.round(usd * QUOTA_PER_UNIT);
}

export function formatUsd(value: number | null | undefined, opts: { min?: number; max?: number } = {}): string {
  if (value == null || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  const max = opts.max ?? (abs !== 0 && abs < 0.01 ? 6 : abs < 1 ? 4 : 2);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: opts.min ?? 2,
    maximumFractionDigits: Math.max(max, opts.min ?? 2),
  }).format(value);
}

export function formatPrice(per1M: number | null | undefined): string {
  if (per1M == null) return "—";
  if (per1M === 0) return "Miễn phí";
  return formatUsd(per1M, { min: 2, max: per1M < 0.1 ? 4 : 2 });
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n);
}

export function formatCompact(n: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function formatDateTime(unixSeconds: number): string {
  if (!unixSeconds || unixSeconds < 0) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: process.env.TIMEZONE || "Asia/Ho_Chi_Minh",
  }).format(new Date(unixSeconds * 1000));
}

export function formatDate(unixSeconds: number): string {
  if (!unixSeconds || unixSeconds < 0) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeZone: process.env.TIMEZONE || "Asia/Ho_Chi_Minh",
  }).format(new Date(unixSeconds * 1000));
}
