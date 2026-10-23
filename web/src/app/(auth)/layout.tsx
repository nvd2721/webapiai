import Link from "next/link";
import { Logo } from "@/components/logo";
import { isDemo } from "@/lib/site";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg-soft">
      <header className="container-x flex h-14 items-center">
        <Logo />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-10 pb-20 sm:pt-16">
        <div className="w-full max-w-sm">
          {isDemo && (
            <div className="mb-4 rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              Chế độ demo: đăng nhập bằng <b>demo</b> / <b>demo1234</b>.
            </div>
          )}
          {children}
        </div>
      </main>
      <footer className="pb-6 text-center text-xs text-muted">
        <Link href="/terms" className="hover:text-fg">
          Điều khoản
        </Link>{" "}
        ·{" "}
        <Link href="/privacy" className="hover:text-fg">
          Bảo mật
        </Link>
      </footer>
    </div>
  );
}
