"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { MAIN_NAV } from "@/lib/nav";

export function MobileNav({ loggedIn }: { loggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button type="button" className="grid size-8 place-items-center rounded-lg" onClick={() => setOpen(!open)} aria-label="Menu">
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      {open && (
        <div className="absolute inset-x-0 top-14 max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b border-border bg-bg p-4 shadow-lg">
          <nav className="flex flex-col gap-1 text-sm" onClick={() => setOpen(false)}>
            {MAIN_NAV.map((n) =>
              "children" in n ? (
                <div key={n.label} className="py-1">
                  <div className="px-3 py-1 text-xs font-medium text-muted uppercase">{n.label}</div>
                  {n.children.map((c) => (
                    <Link key={c.href} href={c.href} className="block rounded-md px-3 py-2 hover:bg-bg-soft">
                      {c.label}
                    </Link>
                  ))}
                </div>
              ) : (
                <Link key={n.href} href={n.href} className="rounded-md px-3 py-2 hover:bg-bg-soft">
                  {n.label}
                </Link>
              ),
            )}
            <div className="mt-2 flex gap-2">
              {loggedIn ? (
                <Link href="/console" className="btn-primary flex-1">
                  Console
                </Link>
              ) : (
                <>
                  <Link href="/login" className="btn-secondary flex-1">
                    Đăng nhập
                  </Link>
                  <Link href="/register" className="btn-primary flex-1">
                    Bắt đầu miễn phí
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
