"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, registerAction, type AuthState } from "@/app/(auth)/actions";

function ErrorBox({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{msg}</div>;
}

export function LoginForm({ next, expired }: { next?: string; expired?: boolean }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(loginAction, {});
  return (
    <form action={action} className="card space-y-4 p-6">
      <div>
        <h1 className="text-xl font-semibold">Đăng nhập</h1>
        <p className="mt-1 text-sm text-muted">Chào mừng bạn quay lại.</p>
      </div>
      {expired && !state.error && <div className="rounded-lg bg-bg-soft px-3 py-2 text-sm text-muted">Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.</div>}
      <ErrorBox msg={state.error} />
      <input type="hidden" name="next" value={next || ""} />
      <div>
        <label className="label" htmlFor="username">
          Tên đăng nhập
        </label>
        <input id="username" name="username" className="input" autoComplete="username" defaultValue={state.fields?.username} required autoFocus />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Mật khẩu
        </label>
        <input id="password" name="password" type="password" className="input" autoComplete="current-password" required />
      </div>
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Đang đăng nhập…" : "Đăng nhập"}
      </button>
      <p className="text-center text-sm text-muted">
        Chưa có tài khoản?{" "}
        <Link href="/register" className="font-medium underline">
          Đăng ký
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({ aff }: { aff?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(registerAction, {});
  return (
    <form action={action} className="card space-y-4 p-6">
      <div>
        <h1 className="text-xl font-semibold">Tạo tài khoản</h1>
        <p className="mt-1 text-sm text-muted">Miễn phí. Nạp tiền khi bạn sẵn sàng dùng.</p>
      </div>
      <ErrorBox msg={state.error} />
      <input type="hidden" name="aff" value={aff || ""} />
      <div>
        <label className="label" htmlFor="username">
          Tên đăng nhập
        </label>
        <input
          id="username"
          name="username"
          className="input"
          autoComplete="username"
          defaultValue={state.fields?.username}
          minLength={3}
          maxLength={20}
          pattern="[a-zA-Z0-9_.\-]+"
          title="Chữ không dấu, số, dấu chấm, gạch dưới, gạch ngang"
          required
          autoFocus
        />
        <p className="mt-1 text-xs text-muted">3 đến 20 ký tự, không dấu.</p>
      </div>
      <div>
        <label className="label" htmlFor="email">
          Email <span className="font-normal text-muted">(không bắt buộc)</span>
        </label>
        <input id="email" name="email" type="email" className="input" autoComplete="email" defaultValue={state.fields?.email} />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Mật khẩu
        </label>
        <input id="password" name="password" type="password" className="input" autoComplete="new-password" minLength={8} maxLength={20} required />
        <p className="mt-1 text-xs text-muted">8 đến 20 ký tự.</p>
      </div>
      <div>
        <label className="label" htmlFor="confirm">
          Nhập lại mật khẩu
        </label>
        <input id="confirm" name="confirm" type="password" className="input" autoComplete="new-password" required />
      </div>
      <label className="flex items-start gap-2 text-sm text-muted">
        <input type="checkbox" name="terms" className="mt-0.5 accent-[var(--accent)]" required />
        <span>
          Tôi đồng ý với{" "}
          <Link href="/terms" target="_blank" className="font-medium underline">
            Điều khoản sử dụng
          </Link>{" "}
          và{" "}
          <Link href="/privacy" target="_blank" className="font-medium underline">
            Chính sách bảo mật
          </Link>
          .
        </span>
      </label>
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Đang tạo tài khoản…" : "Tạo tài khoản"}
      </button>
      <p className="text-center text-sm text-muted">
        Đã có tài khoản?{" "}
        <Link href="/login" className="font-medium underline">
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}
