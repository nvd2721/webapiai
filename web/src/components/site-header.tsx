import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { getSession } from "@/lib/session";
import { MAIN_NAV } from "@/lib/nav";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import { SearchButton } from "./search-button";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

export async function SiteHeader() {
  const session = await getSession();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur">
      <div className="container-x flex h-14 items-center gap-6">
        <Logo />
        <nav className="hidden items-center gap-0.5 lg:flex">
          {MAIN_NAV.map((n) =>
            "children" in n ? (
              <div key={n.label} className="group relative">
                <button type="button" className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-muted hover:text-fg">
                  {n.label}
                  <ChevronDown className="size-3.5 transition-transform group-focus-within:rotate-180 group-hover:rotate-180" />
                </button>
                <div className="invisible absolute top-full left-0 pt-2 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                  <div className="card w-72 p-1.5 shadow-xl">
                    {n.children.map((c) => (
                      <Link key={c.href} href={c.href} className="block rounded-lg px-3 py-2 hover:bg-bg-soft">
                        <div className="text-sm font-medium">{c.label}</div>
                        {c.desc && <div className="text-xs text-muted">{c.desc}</div>}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <Link key={n.href} href={n.href} className="rounded-md px-3 py-1.5 text-sm text-muted hover:text-fg">
                {n.label}
              </Link>
            ),
          )}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <SearchButton />
          <ThemeToggle />
          <div className="ml-2 hidden items-center gap-2 lg:flex">
            {session ? (
              <>
                <Link href="/console" className="btn-secondary py-1.5">
                  Console
                </Link>
                <UserMenu username={session.username} />
              </>
            ) : (
              <>
                <Link href="/login" className="btn-ghost py-1.5">
                  Đăng nhập
                </Link>
                <Link href="/register" className="btn-primary py-1.5">
                  Bắt đầu miễn phí
                </Link>
              </>
            )}
          </div>
          <MobileNav loggedIn={!!session} />
        </div>
      </div>
    </header>
  );
}
