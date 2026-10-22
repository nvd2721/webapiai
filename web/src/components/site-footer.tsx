import Link from "next/link";
import { site } from "@/lib/site";
import { Logo } from "./logo";

export function SiteFooter() {
  const cols = [
    {
      title: "Sản phẩm",
      links: [
        { href: "/models", label: "Mô hình" },
        { href: "/pricing", label: "Bảng giá" },
        { href: "/dashboard", label: "Bảng điều khiển" },
      ],
    },
    {
      title: "Tài liệu",
      links: [
        { href: "/docs", label: "Bắt đầu nhanh" },
        { href: "/docs/claude-code", label: "Dùng với Claude Code" },
        { href: "/docs/cursor", label: "Dùng với Cursor" },
        { href: "/docs/errors", label: "Mã lỗi" },
      ],
    },
    {
      title: "Pháp lý",
      links: [
        { href: "/terms", label: "Điều khoản sử dụng" },
        { href: "/privacy", label: "Chính sách bảo mật" },
        { href: "/refund", label: "Chính sách hoàn tiền" },
      ],
    },
  ];
  return (
    <footer className="mt-24 border-t border-border bg-bg-soft">
      <div className="container-x grid gap-10 py-12 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted">{site.tagline}</p>
          <div className="space-y-1 text-sm text-muted">
            <p>
              Email: <a className="hover:text-fg" href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>
            </p>
            {site.telegram && (
              <p>
                Telegram: <a className="hover:text-fg" href={site.telegram}>{site.telegram.replace(/^https?:\/\//, "")}</a>
              </p>
            )}
            {site.zalo && (
              <p>
                Zalo: <a className="hover:text-fg" href={site.zalo}>Nhóm hỗ trợ</a>
              </p>
            )}
          </div>
        </div>
        {cols.map((c) => (
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
      <div className="border-t border-border">
        <div className="container-x py-5 text-xs text-muted">
          © {new Date().getFullYear()} {site.companyName || site.name}. Tên và logo các mô hình thuộc về chủ sở hữu tương ứng.
        </div>
      </div>
    </footer>
  );
}
