"use client";

import { useActionState, useState } from "react";
import { createInvoiceAction, type TopupState } from "@/app/dashboard/topup/actions";

type CoinOpt = { id: string; label: string; network: string; min: number; note: string };
const PRESETS = [10, 20, 50, 100, 200, 500];

export function TopupForm({ coins, max }: { coins: CoinOpt[]; max: number }) {
  const [state, action, pending] = useActionState<TopupState, FormData>(createInvoiceAction, {});
  const [coin, setCoin] = useState(coins[0].id);
  const [amount, setAmount] = useState("20");
  const cur = coins.find((c) => c.id === coin)!;
  const n = Number(amount);
  const tooLow = amount !== "" && n < cur.min;

  return (
    <form action={action} className="card space-y-5 p-5">
      <h2 className="font-semibold">Nạp credit</h2>
      {state.error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{state.error}</div>}

      <div>
        <div className="label">Đồng coin</div>
        <div className="grid gap-2 sm:grid-cols-3">
          {coins.map((c) => (
            <label
              key={c.id}
              className={`cursor-pointer rounded-lg border p-3 text-sm transition-colors ${
                coin === c.id ? "border-accent bg-accent-soft" : "border-border hover:bg-bg-soft"
              }`}
            >
              <input type="radio" name="coin" value={c.id} checked={coin === c.id} onChange={() => setCoin(c.id)} className="sr-only" />
              <div className="font-medium">{c.label}</div>
              <div className="text-xs text-muted">{c.network}</div>
              <div className="mt-1 text-xs text-muted">Từ {c.min} USD</div>
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-muted">{cur.note}</p>
      </div>

      <div>
        <label className="label" htmlFor="amount">
          Số tiền (USD)
        </label>
        <div className="mb-2 flex flex-wrap gap-2">
          {PRESETS.filter((p) => p >= cur.min).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setAmount(String(p))}
              className={`rounded-lg border px-3 py-1.5 text-sm ${n === p ? "border-accent bg-accent-soft text-accent" : "border-border hover:bg-bg-soft"}`}
            >
              ${p}
            </button>
          ))}
        </div>
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
        {tooLow && <p className="mt-1 text-xs text-red-600 dark:text-red-400">Tối thiểu {cur.min} USD với {cur.label} {cur.network}.</p>}
        <p className="mt-1 text-xs text-muted">Bạn nhận {n > 0 ? n.toLocaleString("en-US") : 0} credit. Phí mạng blockchain do ví hoặc sàn của bạn trả.</p>
      </div>

      <button className="btn-primary" disabled={pending || tooLow}>
        {pending ? "Đang tạo hóa đơn…" : "Tạo hóa đơn và thanh toán"}
      </button>
      <p className="text-xs text-muted">
        Bạn sẽ được chuyển tới trang thanh toán có địa chỉ ví và mã QR. Chuyển đúng số coin và <b>đúng mạng</b> ghi trên hóa đơn.
      </p>
    </form>
  );
}
