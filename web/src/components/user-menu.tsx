import Link from "next/link";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";
import { CONSOLE_NAV } from "@/lib/nav";

export function UserMenu({ username }: { username: string }) {
  return (
    <div className="group relative">
      <button
        type="button"
        className="grid size-8 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-fg uppercase"
        aria-label="Tài khoản"
      >
        {username.slice(0, 1) || "?"}
      </button>
      <div className="invisible absolute top-full right-0 pt-2 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
        <div className="card w-60 p-1.5 shadow-xl">
          <div className="px-3 py-2">
            <div className="text-sm font-semibold">{username}</div>
            <div className="text-xs text-muted">Tài khoản cá nhân</div>
          </div>
          {CONSOLE_NAV.map((g) => (
            <div key={g.label} className="border-t border-border py-1">
              <div className="px-3 py-1 text-[11px] font-medium tracking-wide text-muted uppercase">{g.label}</div>
              {g.items.map((i) => (
                <Link key={i.href} href={i.href} className="block rounded-md px-3 py-1.5 text-sm hover:bg-bg-soft">
                  {i.label}
                </Link>
              ))}
            </div>
          ))}
          <form action={logoutAction} className="border-t border-border pt-1">
            <button className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm text-muted hover:bg-bg-soft hover:text-fg">
              <LogOut className="size-3.5" /> Đăng xuất
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
