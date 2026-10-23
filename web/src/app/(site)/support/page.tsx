import { Mail, MessageCircle, Send } from "lucide-react";
import Link from "next/link";
import { site } from "@/lib/site";

export const metadata = { title: "Hỗ trợ" };

export default function SupportPage() {
  const channels = [
    site.telegram && { icon: Send, name: "Telegram", desc: "Nhanh nhất, phản hồi trong giờ làm việc", href: site.telegram, cta: "Mở Telegram" },
    site.zalo && { icon: MessageCircle, name: "Zalo", desc: "Nhóm hỗ trợ tiếng Việt", href: site.zalo, cta: "Mở Zalo" },
    { icon: Mail, name: "Email", desc: site.supportEmail, href: `mailto:${site.supportEmail}`, cta: "Gửi email" },
  ].filter(Boolean) as { icon: typeof Mail; name: string; desc: string; href: string; cta: string }[];
  return (
    <div className="container-x max-w-4xl py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Hỗ trợ</h1>
      <p className="mt-4 text-muted">
        Khi báo lỗi API, hãy gửi kèm <b>request id</b> trong thông báo lỗi. Khi hỏi về nạp tiền, gửi kèm <b>mã hóa đơn</b>.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {channels.map((c) => (
          <a key={c.name} href={c.href} className="card p-6 transition-colors hover:border-fg/40">
            <c.icon className="size-6" />
            <div className="mt-4 font-semibold">{c.name}</div>
            <div className="mt-1 text-sm break-all text-muted">{c.desc}</div>
            <div className="mt-4 text-sm font-medium">{c.cta} →</div>
          </a>
        ))}
      </div>
      <div className="card mt-10 p-6 text-sm">
        Câu hỏi thường gặp về tích hợp và lỗi có sẵn trong{" "}
        <Link href="/docs" className="underline">
          Tài liệu
        </Link>{" "}
        và trang{" "}
        <Link href="/docs/errors" className="underline">
          Mã lỗi
        </Link>
        .
      </div>
    </div>
  );
}
