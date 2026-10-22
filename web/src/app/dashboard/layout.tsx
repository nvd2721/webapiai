import Link from "next/link";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";
import { DashboardNav } from "@/components/dashboard-nav";
import { Logo } from "@/components/logo";
import { authed, requireSession } from "@/lib/auth";
import { formatUsd, quotaToUsd } from "@/lib/format";
import { getSelf } from "@/lib/newapi";
import { isDemo } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const user = await authed(() => getSelf(session));

  return (
    <div className="min-h-dvh bg-bg-soft">
      {isDemo && (
        <div className="bg-amber-500/15 py-1.5 text-center text-xs text-amber-700 dark:text-amber-300">Chế độ demo: dữ liệu giả lập, chưa nối New API.</div>
      )}
      <header className="sticky top-0 z-30 border-b border-border bg-bg">
        <div className="flex h-14 items-center gap-4 px-4 sm:px-6">
          <Logo href="/" />
          <div className="ml-auto flex items-center gap-3">
            <Link href="/dashboard/topup" className="hidden rounded-lg border border-border px-3 py-1.5 text-sm sm:block">
              <span className="text-muted">Số dư </span>
              <span className="font-semibold tabular-nums">{formatUsd(quotaToUsd(user.quota))}</span>
            </Link>
            <span className="hidden text-sm text-muted md:inline">{user.display_name || user.username}</span>
            <form action={logoutAction}>
              <button className="btn-ghost px-2" title="Đăng xuất" aria-label="Đăng xuất">
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 md:grid-cols-[200px_1fr]">
        <aside className="md:sticky md:top-20 md:self-start">
          <DashboardNav />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
