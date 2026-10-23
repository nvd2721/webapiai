import Link from "next/link";
import { InvoiceBanner, InvoiceTable } from "@/components/invoices";
import { PageHeader } from "@/components/page-header";
import { TopupForm } from "@/components/topup-form";
import { authed, requireSession } from "@/lib/auth";
import { formatUsd, quotaToUsd } from "@/lib/format";
import { getSelf } from "@/lib/newapi";
import { COINS, MAX_TOPUP, getInvoice, listInvoices } from "@/lib/payment";

export const metadata = { title: "Nạp tiền" };

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
  const balance = quotaToUsd(user.quota);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nạp tiền"
        desc={
          <>
            Nạp bằng USDT hoặc Bitcoin, 1 credit = 1 USD, không phí nạp.{" "}
            <Link href="/docs/topup" className="font-medium underline">
              Hướng dẫn
            </Link>
          </>
        }
        action={
          <div className="text-right">
            <div className="text-xs text-muted">Số dư hiện tại</div>
            <div className="text-2xl font-semibold tabular-nums">{formatUsd(balance)}</div>
          </div>
        }
      />

      {current && <InvoiceBanner inv={current} />}

      <TopupForm coins={COINS} max={MAX_TOPUP} balance={balance} />

      <div className="card overflow-x-auto">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="font-semibold">Giao dịch gần đây</span>
          <Link href="/console/billing" className="text-sm font-medium underline">
            Xem tất cả
          </Link>
        </div>
        <InvoiceTable invoices={invoices && invoices.slice(0, 5)} />
      </div>
    </div>
  );
}
