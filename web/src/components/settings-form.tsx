"use client";

import { useActionState } from "react";
import { profileAction, type SettingsState } from "@/app/console/settings/actions";

export function SettingsForm({ displayName }: { displayName: string }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(profileAction, {});
  return (
    <form action={action} className="space-y-4">
      {state.error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{state.error}</div>}
      {state.ok && <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">{state.ok}</div>}
      <div>
        <label className="label" htmlFor="display_name">
          Tên hiển thị
        </label>
        <input id="display_name" name="display_name" defaultValue={displayName} maxLength={20} className="input max-w-sm" />
      </div>
      <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="password">
            Mật khẩu mới
          </label>
          <input id="password" name="password" type="password" autoComplete="new-password" className="input" placeholder="Để trống nếu không đổi" />
        </div>
        <div>
          <label className="label" htmlFor="confirm">
            Nhập lại mật khẩu mới
          </label>
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="current">
          Mật khẩu hiện tại
        </label>
        <input id="current" name="current" type="password" autoComplete="current-password" className="input max-w-sm" required />
        <p className="mt-1 text-xs text-muted">Bắt buộc để xác nhận mọi thay đổi.</p>
      </div>
      <button className="btn-primary" disabled={pending}>
        {pending ? "Đang lưu…" : "Lưu thay đổi"}
      </button>
    </form>
  );
}
