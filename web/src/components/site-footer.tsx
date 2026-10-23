import Link from "next/link";
import { site } from "@/lib/site";
import { Logo } from "./logo";

const COLS = [
  {
    title: "Sản phẩm",
    links: [
      { href: "/models", label: "Mô hình" },
      { href: "/compare", label: "So sánh mô hình" },
      { href: "/pricing", label: "Bảng giá" },
      { href: "/console/chat", label: "Chat thử" },
      { href: "/console", label: "Console" },
    ],
  },
  {
    title: "Công ty",
    links: [
      { href: "/about", label: "Giới thiệu" },
      { href: "/support", label: "Hỗ trợ" },
      { href: "/terms", label: "Điều khoản sử dụng" },
      { href: "/privacy", label: "Chính sách bảo mật" },
      { href: "/refund", label: "Chính sách hoàn tiền" },
    ],
  },
  {
    title: "Tài nguyên",
    links: [
      { href: "/docs", label: "Tài liệu" },
      { href: "/docs/claude-code", label: "Dùng với Claude Code" },
      { href: "/docs/topup", label: "Hướng dẫn nạp tiền" },
      { href: "/docs/errors", label: "Mã lỗi" },
      { href: "/changelog", label: "Nhật ký thay đổi" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 overflow-hidden border-t border-border">
      <div className="container-x grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm text-muted">{site.tagline}</p>
          <div className="flex flex-wrap gap-2 text-xs">
            {site.telegram && (
              <a href={site.telegram} className="badge hover:text-fg">
                Telegram
              </a>
            )}
            {site.zalo && (
              <a href={site.zalo} className="badge hover:text-fg">
                Zalo
              </a>
            )}
            <a href={`mailto:${site.supportEmail}`} className="badge hover:text-fg">
              {site.supportEmail}
            </a>
          </div>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <h3 className="mb-3 text-sm font-semibold">{c.title}</h3>
            <ul className="space-y-2 text-sm text-muted">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-fg">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="container-x flex flex-wrap justify-between gap-2 border-t border-border py-5 text-xs text-muted">
        <span>
          © {new Date().getFullYear()} {site.companyName || site.name}. Tên và logo các mô hình thuộc về chủ sở hữu tương ứng.
        </span>
        <span>Thanh toán bằng USDT và Bitcoin</span>
      </div>
      <div aria-hidden className="pointer-events-none select-none text-center leading-[0.8] font-semibold tracking-tighter text-fg/[0.06]" style={{ fontSize: "clamp(6rem, 24vw, 22rem)" }}>
        {site.name}
      </div>
    </footer>
  );
}
