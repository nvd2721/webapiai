"use client";

import { useActionState } from "react";
import { transferAction, type TransferState } from "@/app/console/referral/actions";

export function AffTransferForm({ available }: { available: number }) {
  const [state, action, pending] = useActionState<TransferState, FormData>(transferAction, {});
  const max = Math.floor(available * 100) / 100;
  return (
    <form action={action} className="space-y-3">
      {state.error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{state.error}</div>}
      {state.ok && <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">{state.ok}</div>}
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="label text-xs" htmlFor="amount">
            Số USD muốn chuyển
          </label>
          <input id="amount" name="amount" type="number" min={1} max={max || 1} step="0.01" defaultValue={max >= 1 ? max : ""} className="input w-40" required />
        </div>
        <button className="btn-primary" disabled={pending || max < 1}>
          {pending ? "Đang chuyển…" : "Chuyển vào số dư"}
        </button>
      </div>
      <p className="text-xs text-muted">{max < 1 ? "Cần ít nhất 1 USD thưởng để chuyển." : "Tối thiểu 1 USD mỗi lần."}</p>
    </form>
  );
}
