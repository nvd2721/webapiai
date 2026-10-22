import Link from "next/link";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { TopupForm } from "@/components/topup-form";
import { authed, requireSession } from "@/lib/auth";
import { formatUsd, quotaToUsd } from "@/lib/format";
import { getSelf } from "@/lib/newapi";
import { COINS, MAX_TOPUP, STATUS_LABEL, getInvoice, listInvoices, type Invoice } from "@/lib/payment";

export const metadata = { title: "Nạp tiền" };

const TONE = {
  gray: "",
  amber: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  red: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
};

function coinLabel(id: string) {
  const c = COINS.find((x) => x.id === id);
  return c ? `${c.label} ${c.network.split(" ")[0]}` : id;
}

function fmtTime(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: process.env.TIMEZONE || "Asia/Ho_Chi_Minh" }).format(new Date(iso));
}

function InvoiceBanner({ inv }: { inv: Invoice }) {
  const done = inv.status === "finished" && inv.credited_usd > 0;
  const bad = ["failed", "expired", "refunded", "partially_paid"].includes(inv.status);
  const Icon = done ? CheckCircle2 : bad ? XCircle : Clock;
  return (
    <div className={`card flex items-start gap-3 p-4 text-sm ${done ? TONE.green : bad ? TONE.red : TONE.amber}`}>
      <Icon className="mt-0.5 size-5 shrink-0" />
      <div>
        <div className="font-medium">
          {done
            ? `Đã cộng ${formatUsd(inv.credited_usd)} vào tài khoản.`
            : bad
              ? `Hóa đơn ${STATUS_LABEL[inv.status].label.toLowerCase()}.`
              : "Đang chờ giao dịch được xác nhận trên blockchain."}
        </div>
        <div className="mt-1 opacity-80">
          {done
            ? "Bạn có thể dùng ngay."
            : bad
              ? "Nếu bạn đã chuyển tiền, liên hệ hỗ trợ kèm mã hóa đơn bên dưới."
              : "USDT thường mất 1 đến 5 phút, Bitcoin 10 đến 60 phút. Tải lại trang để cập nhật."}{" "}
          Mã hóa đơn: <code className="font-mono">{inv.id}</code>
        </div>
        {!done && !bad && inv.invoice_url && (
          <a href={inv.invoice_url} className="mt-2 inline-block font-medium underline">
            Mở lại trang thanh toán
          </a>
        )}
      </div>
    </div>
  );
}

export default async function TopupPage({ searchParams }: { searchParams: Promise<{ invoice?: string }> }) {
  const { invoice } = await searchParams;
  const session = await requireSession();
  const [user, invoices, current] = await Promise.all([
    authed(() => getSelf(session)),
    listInvoices(session.uid).catch((e) => {
      console.error("[topup] list invoices", e);
      return null;
    }),
    invoice ? getInvoice(session.uid, invoice) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nạp tiền</h1>
          <p className="mt-1 text-sm text-muted">
            Nạp bằng USDT hoặc Bitcoin. 1 credit = 1 USD.{" "}
            <Link href="/docs/topup" className="text-accent">
              Hướng dẫn
            </Link>
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted">Số dư hiện tại</div>
          <div className="text-2xl font-semibold tabular-nums">{formatUsd(quotaToUsd(user.quota))}</div>
        </div>
      </div>

      {current && <InvoiceBanner inv={current} />}

      <TopupForm coins={COINS} max={MAX_TOPUP} />

      <div className="card overflow-x-auto">
        <div className="border-b border-border px-4 py-3 font-semibold">Lịch sử nạp</div>
        {invoices === null ? (
          <p className="p-6 text-sm text-muted">Chưa tải được lịch sử nạp, vui lòng thử lại sau.</p>
        ) : (
          <table className="table-x min-w-[640px]">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Đồng coin</th>
                <th className="text-right">Số tiền</th>
                <th className="text-right">Đã cộng</th>
                <th>Trạng thái</th>
                <th>Mã hóa đơn</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((i) => {
                const st = STATUS_LABEL[i.status] || { label: i.status, tone: "gray" as const };
                const open = ["waiting", "confirming", "confirmed", "sending"].includes(i.status);
                return (
                  <tr key={i.id}>
                    <td className="whitespace-nowrap text-muted">{fmtTime(i.created_at)}</td>
                    <td>{coinLabel(i.coin)}</td>
                    <td className="text-right tabular-nums">{formatUsd(i.amount_usd)}</td>
                    <td className="text-right tabular-nums">{i.credited_usd > 0 ? formatUsd(i.credited_usd) : "—"}</td>
                    <td>
                      <span className={`badge ${TONE[st.tone]}`}>{st.label}</span>
                      {open && i.invoice_url && (
                        <a href={i.invoice_url} className="ml-2 text-xs text-accent">
                          Thanh toán
                        </a>
                      )}
                    </td>
                    <td className="font-mono text-xs text-muted">{i.id.slice(0, 8)}</td>
                  </tr>
                );
              })}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted">
                    Chưa có giao dịch nạp nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
