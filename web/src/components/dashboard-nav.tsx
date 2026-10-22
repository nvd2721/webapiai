"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CreditCard, KeyRound, LayoutDashboard, ScrollText } from "lucide-react";

const ITEMS = [
  { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/dashboard/keys", label: "API key", icon: KeyRound },
  { href: "/dashboard/usage", label: "Lịch sử sử dụng", icon: ScrollText },
  { href: "/dashboard/topup", label: "Nạp tiền", icon: CreditCard },
];

export function DashboardNav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {ITEMS.map((i) => {
        const active = i.href === "/dashboard" ? path === i.href : path.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            className={`flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm ${
              active ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-bg-soft hover:text-fg"
            }`}
          >
            <i.icon className="size-4" />
            {i.label}
          </Link>
        );
      })}
      <Link href="/docs" className="flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm text-muted hover:bg-bg-soft hover:text-fg">
        <BookOpen className="size-4" />
        Tài liệu
      </Link>
    </nav>
  );
}
