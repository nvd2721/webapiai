"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CreditCard, Gift, KeyRound, LayoutDashboard, MessageSquare, ReceiptText, ScrollText, Settings } from "lucide-react";
import { CONSOLE_NAV } from "@/lib/nav";

const ICONS = {
  chat: MessageSquare,
  overview: LayoutDashboard,
  logs: ScrollText,
  usage: BarChart3,
  keys: KeyRound,
  topup: CreditCard,
  billing: ReceiptText,
  referral: Gift,
  settings: Settings,
} as const;

export function ConsoleNav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col md:gap-4">
      {CONSOLE_NAV.map((g) => (
        <div key={g.label} className="flex gap-1 md:flex-col">
          <div className="hidden px-3 pb-1 text-[11px] font-medium tracking-wide text-muted uppercase md:block">{g.label}</div>
          {g.items.map((i) => {
            const Icon = ICONS[i.icon as keyof typeof ICONS];
            const active = i.href === "/console" ? path === i.href : path.startsWith(i.href);
            return (
              <Link
                key={i.href}
                href={i.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm whitespace-nowrap ${
                  active ? "bg-accent-soft font-medium text-fg" : "text-muted hover:bg-bg-soft hover:text-fg"
                }`}
              >
                <Icon className="size-4" />
                {i.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
