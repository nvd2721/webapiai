import Link from "next/link";
import { ArrowRight, Bitcoin, Check, Code2, KeyRound, Layers, ScrollText } from "lucide-react";
import { CodeTabs } from "@/components/code-tabs";
import { HeroPrompt } from "@/components/hero-prompt";
import { getModels } from "@/lib/models";
import { codeSamples } from "@/lib/snippets";
import { formatPrice } from "@/lib/format";
import { site } from "@/lib/site";

const HERO_MODELS = ["claude-sonnet-4-5", "gpt-5", "gemini-2.5-pro", "deepseek-chat", "glm-4.6"];

const VALUES = [
  { word: "Đơn giản", body: "Một key, một base URL, đổi mô hình bằng một dòng." },
  { word: "Minh bạch", body: "Giá công khai, từng request đều có số token và chi phí." },
  { word: "Ổn định", body: "Nhiều kênh cho mỗi mô hình, tự chuyển khi một kênh lỗi." },
  { word: "Tận tâm", body: "Hỗ trợ tiếng Việt qua Telegram và Zalo, cùng múi giờ." },
];

const FAQ = [
  { q: "Tôi có cần thẻ quốc tế không?", a: "Không. Bạn nạp bằng USDT (TRC20 hoặc BEP20) hoặc Bitcoin, từ ví cá nhân hoặc từ sàn. 1 credit = 1 USD." },
  { q: "Giá được tính thế nào?", a: "Theo số token vào và ra của từng request, theo bảng giá mỗi 1 triệu token. Request lỗi không bị trừ tiền." },
  { q: "Dùng với Claude Code, Cursor được không?", a: "Được. Với Claude Code chỉ cần đặt ANTHROPIC_BASE_URL và ANTHROPIC_AUTH_TOKEN. Xem hướng dẫn trong Tài liệu." },
  { q: "Số dư có hết hạn không?", a: "Không. Số dư giữ nguyên cho tới khi bạn dùng hết." },
  { q: "Nội dung prompt có bị lưu không?", a: "Không. Chúng tôi chỉ lưu thông tin tính tiền: mô hình, số token, thời gian." },
];

function Digits({ value }: { value: string }) {
  return (
    <span className="inline-flex gap-1">
      {value.split("").map((c, i) => (
        <span key={i} className="grid h-12 min-w-9 place-items-center rounded-lg border border-border bg-card px-1.5 font-mono text-2xl font-semibold shadow-sm sm:h-14 sm:min-w-10 sm:text-3xl">
          {c}
        </span>
      ))}
    </span>
  );
}

function Feature({ title, body, points, visual, flip }: { title: string; body: string; points: string[]; visual: React.ReactNode; flip?: boolean }) {
  return (
    <div className="grid items-center gap-10 py-14 md:grid-cols-2 md:gap-16">
      <div className={flip ? "md:order-2" : ""}>
        <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h3>
        <p className="mt-3 text-muted">{body}</p>
        <ul className="mt-5 space-y-2 text-sm">
          {points.map((p) => (
            <li key={p} className="flex gap-2">
              <Check className="mt-0.5 size-4 shrink-0" /> {p}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl border border-border bg-bg-soft p-6 sm:p-8">{visual}</div>
    </div>
  );
}

export default async function HomePage() {
  const models = await getModels();
  const vendors = [...new Set(models.map((m) => m.vendor))];
  const chat = models.filter((m) => m.kind === "chat");
  const heroModels = [...HERO_MODELS.map((id) => chat.find((m) => m.id === id)).filter((m) => !!m), ...chat.filter((m) => !HERO_MODELS.includes(m.id))]
    .slice(0, 12)
    .map((m) => ({ id: m.id, name: m.name }));
  const sample = chat.slice(0, 5);
  const freeCount = models.filter((m) => m.free).length;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(50%_60%_at_50%_0%,var(--accent-soft),transparent)]" />
        <div className="container-x pt-20 pb-16 text-center sm:pt-28">
          <h1 className="mx-auto max-w-4xl text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-6xl">
            Một API key.
            <br />
            Mọi mô hình AI.
            <br />
            <span className="text-muted">Nạp bằng USDT, Bitcoin.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted">
            Gọi GPT, Claude, Gemini, DeepSeek và hơn thế nữa qua một endpoint tương thích OpenAI và Anthropic. Trả theo token, không phí tháng.
          </p>
          {heroModels.length > 0 && <HeroPrompt models={heroModels} />}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/register" className="btn-primary px-5 py-2.5">
              Tạo API key <ArrowRight className="size-4" />
            </Link>
            <Link href="/models" className="btn-secondary px-5 py-2.5">
              Xem mô hình
            </Link>
            <Link href="/docs" className="btn-secondary px-5 py-2.5">
              Đọc tài liệu
            </Link>
          </div>
        </div>
      </section>

      {/* Counters */}
      <section className="container-x">
        <div className="grid gap-6 rounded-2xl border border-border p-6 sm:grid-cols-2 sm:p-8 lg:grid-cols-4">
          {[
            { v: String(models.length), l: "mô hình sẵn sàng" },
            { v: String(vendors.length), l: "hãng AI" },
            { v: String(freeCount), l: "mô hình miễn phí" },
            { v: "0", l: "USD phí hằng tháng" },
          ].map((s) => (
            <div key={s.l} className="text-center">
              <Digits value={s.v} />
              <div className="mt-2 text-sm text-muted">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Vendor strip */}
      {vendors.length > 0 && (
        <section className="mt-14 overflow-hidden border-y border-border py-6 [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
          <div className="flex w-max animate-[marquee_40s_linear_infinite] gap-14 text-lg font-semibold text-muted">
            {[...vendors, ...vendors, ...vendors, ...vendors].map((v, i) => (
              <span key={i}>{v}</span>
            ))}
          </div>
        </section>
      )}

      {/* Why */}
      <section className="container-x pt-20">
        <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">Vì sao chọn {site.name}?</h2>
        <div className="divide-y divide-border">
          <Feature
            title="Một key cho mọi mô hình"
            body="Không phải mở tài khoản và nạp tiền ở từng hãng. Đổi mô hình chỉ bằng cách đổi tên trong trường model."
            points={["Chuẩn OpenAI và Anthropic", "Nhiều kênh cho mỗi mô hình, tự chuyển khi lỗi", "Thêm mô hình mới liên tục"]}
            visual={
              <div className="space-y-2">
                {sample.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm">
                    <span className="font-mono text-xs">&quot;model&quot;: &quot;{m.id}&quot;</span>
                    <span className="text-xs text-muted">{formatPrice(m.input)} / 1M</span>
                  </div>
                ))}
              </div>
            }
          />
          <Feature
            flip
            title="Nạp bằng USDT hoặc Bitcoin"
            body="Không cần thẻ Visa hay Mastercard. Quét mã QR, số dư được cộng tự động sau khi giao dịch được xác nhận trên blockchain."
            points={["USDT TRC20, BEP20 và Bitcoin", "Nạp từ 5 USD", "1 credit = 1 USD, số dư không hết hạn"]}
            visual={
              <div className="mx-auto max-w-xs rounded-xl border border-border bg-card p-5 text-sm shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Hóa đơn nạp</span>
                  <Bitcoin className="size-5 text-muted" />
                </div>
                <div className="mt-4 space-y-2 text-muted">
                  <div className="flex justify-between">
                    <span>Số tiền</span>
                    <span className="text-fg">20 USD</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Đồng coin</span>
                    <span className="text-fg">USDT · TRC20</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Nhận</span>
                    <span className="text-fg">20 credit</span>
                  </div>
                </div>
                <div className="mt-4 grid aspect-square place-items-center rounded-lg bg-[repeating-conic-gradient(var(--fg)_0_25%,transparent_0_50%)] bg-[length:16px_16px] opacity-80" />
              </div>
            }
          />
          <Feature
            title="Chạy được với công cụ bạn đang dùng"
            body="Claude Code, Cursor, Cline, n8n, Dify, LangChain và mọi SDK tương thích OpenAI."
            points={["Hướng dẫn tiếng Việt từng bước", "Không cần sửa code, chỉ đổi base URL", "Streaming, tool calling, embedding"]}
            visual={
              <pre className="overflow-x-auto rounded-xl bg-code p-5 font-mono text-[13px] leading-relaxed text-zinc-100">
                {`export ANTHROPIC_BASE_URL="${site.apiBase}"
export ANTHROPIC_AUTH_TOKEN="sk-..."
claude`}
              </pre>
            }
          />
          <Feature
            flip
            title="Kiểm soát chi phí từng key"
            body="Mỗi ứng dụng một key, mỗi key một hạn mức. Không lo một lỗi vòng lặp đốt hết số dư."
            points={["Hạn mức chi tiêu và ngày hết hạn", "Giới hạn mô hình và IP được dùng", "Tắt key ngay lập tức khi bị lộ"]}
            visual={
              <div className="space-y-2 text-sm">
                {[
                  ["Claude Code", "12,40 / 50 USD", 25],
                  ["Chatbot web", "3,10 / 10 USD", 31],
                  ["Thử nghiệm", "0,85 / 2 USD", 42],
                ].map(([n, v, p]) => (
                  <div key={n as string} className="rounded-lg border border-border bg-card p-3">
                    <div className="flex justify-between">
                      <span className="font-medium">
                        <KeyRound className="mr-1.5 inline size-3.5" />
                        {n}
                      </span>
                      <span className="text-xs text-muted">{v}</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-bg-soft">
                      <div className="h-1.5 rounded-full bg-fg" style={{ width: `${p}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            }
          />
          <Feature
            title="Minh bạch từng request"
            body="Nhật ký ghi rõ mô hình, số token vào/ra và chi phí của từng lần gọi. Request lỗi không bị trừ tiền."
            points={["Lọc theo key, mô hình, thời gian", "Biểu đồ chi tiêu theo ngày", "Không lưu nội dung prompt"]}
            visual={
              <div className="overflow-hidden rounded-xl border border-border bg-card text-xs">
                {[
                  ["claude-sonnet-4-5", "12.408 / 1.203", "$0,0553"],
                  ["deepseek-chat", "3.120 / 845", "$0,0013"],
                  ["gpt-5-mini", "8.002 / 2.110", "$0,0062"],
                  ["gemini-2.5-flash", "1.530 / 402", "$0,0015"],
                ].map(([m, t, c]) => (
                  <div key={m} className="flex items-center justify-between border-b border-border px-3 py-2.5 last:border-0">
                    <span className="flex items-center gap-1.5 font-mono">
                      <ScrollText className="size-3.5 text-muted" />
                      {m}
                    </span>
                    <span className="text-muted">{t}</span>
                    <span className="font-medium">{c}</span>
                  </div>
                ))}
              </div>
            }
          />
        </div>
      </section>

      {/* Values */}
      <section className="border-y border-border bg-bg-soft py-20">
        <div className="container-x grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v, i) => (
            <div key={v.word}>
              <div className="text-xs text-muted">0{i + 1}</div>
              <div className="mt-2 text-3xl font-semibold tracking-tight">{v.word}</div>
              <p className="mt-2 text-sm text-muted">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="container-x pt-20">
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

      {/* Final CTA */}
      <section className="container-x pt-20">
        <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">Bắt đầu ngay hôm nay</h2>
        <div className="mt-10 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <div className="card flex flex-col p-7">
            <Layers className="size-6" />
            <h3 className="mt-4 text-xl font-semibold">Dùng qua Chat</h3>
            <p className="mt-2 text-sm text-muted">Trò chuyện với mọi mô hình ngay trên web, trừ cùng số dư với API. Không cần cài gì.</p>
            <Link href="/console/chat" className="btn-primary mt-auto w-fit">
              Mở Chat <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="card p-7">
            <Code2 className="size-6" />
            <h3 className="mt-4 text-xl font-semibold">Dùng qua API</h3>
            <p className="mt-2 mb-4 text-sm text-muted">Đổi base URL trong code hiện có là xong.</p>
            <CodeTabs samples={codeSamples()} />
          </div>
        </div>
      </section>
    </>
  );
}
