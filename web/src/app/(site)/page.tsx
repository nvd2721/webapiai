import Link from "next/link";
import { ArrowRight, Bitcoin, Code2, Gauge, KeyRound, Layers, MessagesSquare, ShieldCheck } from "lucide-react";
import { CodeTabs } from "@/components/code-tabs";
import { getModels } from "@/lib/models";
import { codeSamples } from "@/lib/snippets";
import { formatCompact, formatPrice } from "@/lib/format";
import { site } from "@/lib/site";

const FEATURED = ["claude-sonnet-4-5", "gpt-5", "gemini-2.5-pro", "deepseek-chat", "claude-haiku-4-5", "qwen3-max"];

const WHY = [
  {
    icon: Bitcoin,
    title: "Nạp bằng USDT hoặc Bitcoin",
    body: "Không cần thẻ Visa hay Mastercard. Chuyển USDT qua TRC20, BEP20 hoặc BTC, số dư được cộng tự động sau khi giao dịch xác nhận.",
  },
  {
    icon: Layers,
    title: "Một key, mọi mô hình",
    body: "GPT, Claude, Gemini, DeepSeek, Qwen, GLM, Kimi… chỉ cần đổi tên mô hình, không phải mở tài khoản ở từng hãng.",
  },
  {
    icon: Code2,
    title: "Tương thích OpenAI và Anthropic",
    body: "Dùng ngay SDK OpenAI, Anthropic, LangChain, Claude Code, Cursor, n8n, Dify. Chỉ đổi base URL và API key.",
  },
  {
    icon: Gauge,
    title: "Trả theo token, giá công khai",
    body: "Không phí tháng, không hợp đồng. Mỗi request đều ghi rõ số token và chi phí trong bảng điều khiển.",
  },
  {
    icon: KeyRound,
    title: "Kiểm soát từng key",
    body: "Đặt hạn mức chi tiêu, ngày hết hạn, danh sách mô hình và IP được phép cho từng key. Khóa key chỉ với một cú bấm.",
  },
  {
    icon: MessagesSquare,
    title: "Hỗ trợ tiếng Việt",
    body: "Đội ngũ cùng múi giờ, hỗ trợ qua Telegram và Zalo, tài liệu hướng dẫn bằng tiếng Việt.",
  },
];

const FAQ = [
  {
    q: "Tôi có cần thẻ quốc tế không?",
    a: "Không. Bạn nạp bằng USDT (mạng TRC20 hoặc BEP20) hoặc Bitcoin từ ví cá nhân hoặc từ sàn. 1 credit tương đương 1 USD.",
  },
  {
    q: "Giá được tính thế nào?",
    a: "Theo số token vào và ra của từng request, theo bảng giá mỗi 1 triệu token ở trang Bảng giá. Số dư chỉ bị trừ khi request thành công.",
  },
  {
    q: "Tôi có dùng được với Claude Code hoặc Cursor không?",
    a: "Có. Xem hướng dẫn từng bước trong phần Tài liệu. Với Claude Code bạn chỉ cần đặt ANTHROPIC_BASE_URL và ANTHROPIC_AUTH_TOKEN.",
  },
  {
    q: "Số dư có hết hạn không?",
    a: "Không. Số dư được giữ trong tài khoản cho tới khi bạn dùng hết. Chính sách hoàn tiền xem ở trang Chính sách hoàn tiền.",
  },
  {
    q: "Dữ liệu của tôi có bị lưu không?",
    a: "Chúng tôi chỉ lưu thông tin tính tiền (mô hình, số token, thời gian). Nội dung prompt và câu trả lời không được lưu lại.",
  },
];

export default async function HomePage() {
  const models = await getModels();
  const vendors = [...new Set(models.map((m) => m.vendor))];
  const featured = FEATURED.map((id) => models.find((m) => m.id === id)).filter(Boolean) as typeof models;
  const shown = featured.length >= 4 ? featured : models.filter((m) => m.kind === "chat").slice(0, 6);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,var(--accent-soft),transparent)]" />
        <div className="container-x grid items-center gap-12 py-16 md:py-24 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <span className="badge mb-5 gap-1.5 bg-card">
              <ShieldCheck className="size-3.5 text-accent" /> Nạp USDT, Bitcoin · Không cần thẻ
            </span>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Một API key cho <span className="text-accent">mọi mô hình AI</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              Gọi {models.length > 0 ? `${models.length} mô hình` : "hàng chục mô hình"} từ {vendors.length || "nhiều"} hãng qua một
              endpoint tương thích OpenAI và Anthropic. Trả theo token, không phí tháng.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="btn-primary px-5 py-2.5">
                Tạo API key <ArrowRight className="size-4" />
              </Link>
              <Link href="/models" className="btn-secondary px-5 py-2.5">
                Xem mô hình và giá
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-2 font-mono text-sm text-muted">
              <span className="rounded-md border border-border bg-card px-2 py-1">{site.apiBase}/v1</span>
            </div>
          </div>
          <CodeTabs samples={codeSamples()} />
        </div>
      </section>

      {/* Vendors */}
      {vendors.length > 0 && (
        <section className="border-b border-border py-8">
          <div className="container-x flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm font-medium text-muted">
            {vendors.map((v) => (
              <span key={v}>{v}</span>
            ))}
          </div>
        </section>
      )}

      {/* Why */}
      <section className="container-x py-20">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight">Vì sao chọn {site.name}</h2>
          <p className="mt-3 text-muted">Làm cho lập trình viên Việt Nam và châu Á: thanh toán dễ, tích hợp nhanh, hỗ trợ tận tình.</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {WHY.map((w) => (
            <div key={w.title} className="card p-6">
              <w.icon className="size-5 text-accent" />
              <h3 className="mt-4 font-semibold">{w.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{w.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured models */}
      {shown.length > 0 && (
        <section className="border-y border-border bg-bg-soft py-20">
          <div className="container-x">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight">Mô hình nổi bật</h2>
                <p className="mt-3 text-muted">Giá tính bằng USD cho mỗi 1 triệu token.</p>
              </div>
              <Link href="/models" className="btn-secondary">
                Tất cả {models.length} mô hình <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((m) => (
                <Link key={m.id} href={`/models/${m.id}`} className="card group p-5 transition-colors hover:border-accent">
                  <div className="text-xs text-muted">{m.vendor}</div>
                  <div className="mt-1 font-mono text-sm font-semibold group-hover:text-accent">{m.id}</div>
                  <div className="mt-4 flex gap-6 text-sm">
                    <div>
                      <div className="text-xs text-muted">Vào</div>
                      <div className="font-medium">{formatPrice(m.input)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted">Ra</div>
                      <div className="font-medium">{formatPrice(m.output)}</div>
                    </div>
                    {m.context && (
                      <div>
                        <div className="text-xs text-muted">Context</div>
                        <div className="font-medium">{formatCompact(m.context)}</div>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Steps */}
      <section className="container-x py-20">
        <h2 className="text-3xl font-semibold tracking-tight">Bắt đầu trong 3 phút</h2>
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { t: "Tạo tài khoản", d: "Đăng ký bằng tên đăng nhập và mật khẩu, không cần xác minh danh tính." },
            { t: "Nạp USDT hoặc BTC", d: "Chọn số tiền, quét mã QR trên trang thanh toán. Số dư tự cộng khi giao dịch xác nhận." },
            { t: "Tạo key và gọi API", d: "Tạo API key trong bảng điều khiển, đổi base URL trong code là xong." },
          ].map((s, i) => (
            <li key={s.t} className="card p-6">
              <span className="grid size-8 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent">{i + 1}</span>
              <h3 className="mt-4 font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm text-muted">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* FAQ */}
      <section className="container-x pb-8">
        <h2 className="text-3xl font-semibold tracking-tight">Câu hỏi thường gặp</h2>
        <div className="mt-8 divide-y divide-border rounded-xl border border-border">
          {FAQ.map((f) => (
            <details key={f.q} className="group p-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                {f.q}
                <span className="text-muted transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container-x pt-16">
        <div className="card flex flex-col items-start justify-between gap-6 bg-accent-soft p-8 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Sẵn sàng thử?</h2>
            <p className="mt-2 text-muted">Tạo tài khoản miễn phí, nạp từ 5 USDT.</p>
          </div>
          <Link href="/register" className="btn-primary px-5 py-2.5">
            Đăng ký ngay <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
