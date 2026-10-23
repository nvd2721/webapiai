import Link from "next/link";
import { BookOpen, Gift } from "lucide-react";
import { ConsoleNav } from "@/components/console-nav";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { authed, requireSession } from "@/lib/auth";
import { formatUsd, quotaToUsd } from "@/lib/format";
import { getSelf } from "@/lib/newapi";
import { isDemo } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const user = await authed(() => getSelf(session));

  return (
    <div className="min-h-dvh bg-bg-soft">
      {isDemo && <div className="bg-amber-500/15 py-1.5 text-center text-xs text-amber-700 dark:text-amber-300">Chế độ demo: dữ liệu giả lập, chưa nối New API.</div>}
      <header className="sticky top-0 z-30 border-b border-border bg-bg">
        <div className="flex h-14 items-center gap-4 px-4 sm:px-6">
          <Logo href="/" />
          <span className="badge hidden sm:inline-flex">Console</span>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/console/topup" className="hidden rounded-lg border border-border px-3 py-1.5 text-sm sm:block">
              <span className="text-muted">Số dư </span>
              <span className="font-semibold tabular-nums">{formatUsd(quotaToUsd(user.quota))}</span>
            </Link>
            <Link href="/console/topup" className="btn-primary py-1.5">
              Nạp tiền
            </Link>
            <ThemeToggle />
            <UserMenu username={user.display_name || user.username} />
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-6 sm:px-6 md:grid-cols-[210px_1fr]">
        <aside className="md:sticky md:top-20 md:flex md:h-[calc(100dvh-6.5rem)] md:flex-col md:self-start">
          <ConsoleNav />
          <div className="mt-auto hidden space-y-2 pt-6 md:block">
            <Link href="/console/referral" className="card block p-3 text-xs hover:border-fg/40">
              <Gift className="mb-1.5 size-4" />
              <div className="font-medium">Mời bạn bè</div>
              <div className="text-muted">Nhận thêm credit khi bạn bè đăng ký.</div>
            </Link>
            <Link href="/docs" className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted hover:text-fg">
              <BookOpen className="size-4" /> Hướng dẫn
            </Link>
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
