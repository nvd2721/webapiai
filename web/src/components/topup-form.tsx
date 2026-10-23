"use client";

import { useActionState, useState } from "react";
import { Bitcoin, CircleDollarSign } from "lucide-react";
import { createInvoiceAction, type TopupState } from "@/app/console/topup/actions";

type CoinOpt = { id: string; label: string; network: string; min: number; note: string };
const PRESETS = [10, 25, 50, 100];

// Two-column top-up: amount and coin on the left, order summary on the right.
export function TopupForm({ coins, max, balance }: { coins: CoinOpt[]; max: number; balance: number }) {
  const [state, action, pending] = useActionState<TopupState, FormData>(createInvoiceAction, {});
  const [coin, setCoin] = useState(coins[0].id);
  const [amount, setAmount] = useState("25");
  const [custom, setCustom] = useState(false);
  const cur = coins.find((c) => c.id === coin)!;
  const n = Number(amount) || 0;
  const tooLow = amount !== "" && n < cur.min;
  const usd = (v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div className="card space-y-6 p-5">
        {state.error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{state.error}</div>}

        <div>
          <div className="label">Số tiền nạp</div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setCustom(false);
                  setAmount(String(p));
                }}
                className={`rounded-lg border px-3 py-3 text-sm font-semibold tabular-nums transition-colors ${
                  !custom && n === p ? "border-fg bg-fg text-bg" : "border-border hover:bg-bg-soft"
                }`}
              >
                ${p}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCustom(true)}
              className={`rounded-lg border px-3 py-3 text-sm font-semibold transition-colors ${custom ? "border-fg bg-fg text-bg" : "border-border hover:bg-bg-soft"}`}
            >
              Tùy chọn
            </button>
          </div>
          <div className={custom ? "mt-3" : "sr-only"}>
            <label className="label text-xs" htmlFor="amount">
              Nhập số USD
            </label>
            <input
              id="amount"
              name="amount"
              type="number"
              min={cur.min}
              max={max}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input max-w-48"
              required
            />
          </div>
          {tooLow && <p className="mt-2 text-xs text-red-600 dark:text-red-400">Tối thiểu {cur.min} USD với {cur.label} {cur.network}.</p>}
        </div>

        <div>
          <div className="label">Phương thức thanh toán</div>
          <div className="grid gap-2 sm:grid-cols-3">
            {coins.map((c) => {
              const Icon = c.id.startsWith("btc") ? Bitcoin : CircleDollarSign;
              return (
                <label
                  key={c.id}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-sm transition-colors ${
                    coin === c.id ? "border-fg ring-1 ring-fg" : "border-border hover:bg-bg-soft"
                  }`}
                >
                  <input type="radio" name="coin" value={c.id} checked={coin === c.id} onChange={() => setCoin(c.id)} className="sr-only" />
                  <Icon className="mt-0.5 size-4 shrink-0" />
                  <span>
                    <span className="block font-medium">{c.label}</span>
                    <span className="block text-xs text-muted">{c.network}</span>
                    <span className="block text-xs text-muted">Từ {c.min} USD</span>
                  </span>
                </label>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted">{cur.note}</p>
        </div>
      </div>

      <div className="card h-fit space-y-4 p-5 lg:sticky lg:top-20">
        <h2 className="font-semibold">Tóm tắt</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Bạn trả</dt>
            <dd className="font-semibold tabular-nums">{usd(n)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Phí nạp</dt>
            <dd className="tabular-nums">$0.00</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Thanh toán bằng</dt>
            <dd>
              {cur.label} {cur.network.split(" ")[0]}
            </dd>
          </div>
          <div className="flex justify-between border-t border-border pt-2">
            <dt className="text-muted">Bạn nhận</dt>
            <dd className="text-lg font-semibold tabular-nums">{usd(n)} credit</dd>
          </div>
          <div className="flex justify-between text-xs">
            <dt className="text-muted">Số dư sau khi nạp</dt>
            <dd className="tabular-nums">{usd(balance + n)}</dd>
          </div>
        </dl>
        <button className="btn-primary w-full" disabled={pending || tooLow || n <= 0}>
          {pending ? "Đang tạo hóa đơn…" : "Tiếp tục thanh toán"}
        </button>
        <ul className="list-disc space-y-1 pl-4 text-xs text-muted">
          <li>Trang hóa đơn hiển thị địa chỉ ví và mã QR để bạn chuyển tiền.</li>
          <li>
            Chuyển đúng số coin và <b>đúng mạng</b> ghi trên hóa đơn. Phí mạng do ví hoặc sàn của bạn trả.
          </li>
          <li>Credit được cộng tự động khi giao dịch đủ xác nhận. Credit không hết hạn.</li>
        </ul>
      </div>
    </form>
  );
}
