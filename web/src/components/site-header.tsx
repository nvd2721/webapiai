import Link from "next/link";
import { getSession } from "@/lib/session";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";

export const NAV = [
  { href: "/models", label: "Mô hình" },
  { href: "/pricing", label: "Bảng giá" },
  { href: "/docs", label: "Tài liệu" },
];

export async function SiteHeader() {
  const session = await getSession();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur">
      <div className="container-x flex h-14 items-center gap-6">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-md px-3 py-1.5 text-sm text-muted hover:text-fg">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          {session ? (
            <Link href="/dashboard" className="btn-primary">
              Bảng điều khiển
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">
                Đăng nhập
              </Link>
              <Link href="/register" className="btn-primary">
                Đăng ký
              </Link>
            </>
          )}
        </div>
        <MobileNav items={NAV} loggedIn={!!session} />
      </div>
    </header>
  );
}
