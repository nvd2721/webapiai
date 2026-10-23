import Link from "next/link";
import { InvoiceTable, OPEN_STATUSES } from "@/components/invoices";
import { PageHeader } from "@/components/page-header";
import { authed, requireSession } from "@/lib/auth";
import { formatUsd, quotaToUsd } from "@/lib/format";
import { getSelf } from "@/lib/newapi";
import { listInvoices } from "@/lib/payment";

export const metadata = { title: "Lịch sử nạp" };

export default async function BillingPage() {
  const session = await requireSession();
  const [user, invoices] = await Promise.all([
    authed(() => getSelf(session)),
    listInvoices(session.uid, 100).catch((e) => {
      console.error("[billing] list invoices", e);
      return null;
    }),
  ]);
  const credited = (invoices || []).reduce((a, i) => a + (i.credited_usd || 0), 0);
  const open = (invoices || []).filter((i) => OPEN_STATUSES.includes(i.status)).length;

  const stats = [
    { label: "Số dư", value: formatUsd(quotaToUsd(user.quota)) },
    { label: "Tổng đã nạp", value: invoices ? formatUsd(credited) : "—" },
    { label: "Tổng đã dùng", value: formatUsd(quotaToUsd(user.used_quota)) },
    { label: "Hóa đơn đang chờ", value: invoices ? String(open) : "—" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lịch sử nạp"
        desc="Lịch sử nạp tiền bằng crypto. Chi phí từng request nằm ở Nhật ký request."
        refresh="/console/billing"
        action={
          <Link href="/console/topup" className="btn-primary">
            Nạp tiền
          </Link>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <div className="text-xs text-muted">{s.label}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="card overflow-x-auto">
        <div className="border-b border-border px-4 py-3 font-semibold">Tất cả giao dịch nạp</div>
        <InvoiceTable invoices={invoices} />
      </div>
    </div>
  );
}
