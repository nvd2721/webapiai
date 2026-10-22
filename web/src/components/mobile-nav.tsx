"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export function MobileNav({ items, loggedIn }: { items: { href: string; label: string }[]; loggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="ml-auto md:hidden">
      <button type="button" className="btn-ghost px-2" onClick={() => setOpen(!open)} aria-label="Menu">
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      {open && (
        <div className="absolute inset-x-0 top-14 border-b border-border bg-bg p-4 shadow-lg">
          <nav className="flex flex-col gap-1" onClick={() => setOpen(false)}>
            {items.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-md px-3 py-2 text-sm hover:bg-bg-soft">
                {n.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-2">
              {loggedIn ? (
                <Link href="/dashboard" className="btn-primary flex-1">
                  Bảng điều khiển
                </Link>
              ) : (
                <>
                  <Link href="/login" className="btn-secondary flex-1">
                    Đăng nhập
                  </Link>
                  <Link href="/register" className="btn-primary flex-1">
                    Đăng ký
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
