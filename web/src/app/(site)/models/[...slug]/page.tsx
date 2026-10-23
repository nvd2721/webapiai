import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowLeftRight, Brain, Code2, Eye, MessageSquare, Wrench } from "lucide-react";
import { ModelCard } from "@/components/model-browser";
import { CodeTabs } from "@/components/code-tabs";
import { CopyButton } from "@/components/copy-button";
import { getModels } from "@/lib/models";
import { codeSamples } from "@/lib/snippets";
import { formatNumber, formatPrice, formatUsd } from "@/lib/format";
import { KIND_LABEL } from "@/data/model-meta";
import { site } from "@/lib/site";

type Props = { params: Promise<{ slug: string[] }> };

async function load(params: Props["params"]) {
  const { slug } = await params;
  const id = slug.map(decodeURIComponent).join("/");
  const all = await getModels();
  const m = all.find((x) => x.id === id);
  return m ? Object.assign(m, { related: all.filter((x) => x.id !== id && x.vendor === m.vendor).slice(0, 4) }) : undefined;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const m = await load(params);
  if (!m) return { title: "Không tìm thấy mô hình" };
  const price = m.perCall ? `${formatUsd(m.callPrice)} mỗi lần gọi` : `${formatPrice(m.input)} vào, ${formatPrice(m.output)} ra mỗi 1M token`;
  return {
    title: `${m.id} API: giá và cách dùng`,
    description: `Gọi ${m.id} của ${m.vendor} qua API tương thích OpenAI. Giá ${price}. Nạp bằng USDT hoặc Bitcoin.`,
  };
}

export default async function ModelPage({ params }: Props) {
  const m = await load(params);
  if (!m) notFound();

  const stats = m.perCall
    ? [{ label: "Giá mỗi lần gọi", value: formatUsd(m.callPrice) }]
    : [
        { label: "Giá vào / 1M token", value: formatPrice(m.input) },
        ...(m.kind === "embedding" ? [] : [{ label: "Giá ra / 1M token", value: formatPrice(m.output) }]),
        ...(m.cacheRead != null ? [{ label: "Đọc cache / 1M token", value: formatPrice(m.cacheRead) }] : []),
        ...(m.context ? [{ label: "Context", value: `${formatNumber(m.context)} token` }] : []),
        ...(m.maxOutput ? [{ label: "Đầu ra tối đa", value: `${formatNumber(m.maxOutput)} token` }] : []),
      ];

  const caps = [
    m.reasoning && { icon: Brain, label: "Suy luận" },
    m.vision && { icon: Eye, label: "Đọc ảnh" },
    m.tools && { icon: Wrench, label: "Gọi hàm (tools)" },
  ].filter(Boolean) as { icon: typeof Brain; label: string }[];

  return (
    <div className="container-x py-12">
      <Link href="/models" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Tất cả mô hình
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{m.name}</h1>
            <span className="badge border-free/40 bg-free/10 text-free">Đang hoạt động</span>
            {m.free && <span className="badge border-free/40 bg-free/10 text-free">Miễn phí</span>}
            {m.discountPct > 0 && <span className="badge border-deal/40 bg-deal/10 text-deal">-{m.discountPct}%</span>}
          </div>
          <div className="mt-1 flex items-center gap-1 font-mono text-sm text-muted">
            {m.id} <CopyButton value={m.id} />
          </div>
          <div className="mt-2 text-sm text-muted">
            {m.vendor} · {KIND_LABEL[m.kind]}
            {m.released && ` · Phát hành ${m.released.split("-").reverse().join("/")}`}
          </div>
          {m.description && <p className="mt-3 max-w-2xl">{m.description}</p>}
          {caps.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {caps.map((c) => (
                <span key={c.label} className="badge gap-1">
                  <c.icon className="size-3.5" /> {c.label}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/compare?m=${encodeURIComponent(m.id)}`} className="btn-secondary">
            <ArrowLeftRight className="size-4" /> So sánh
          </Link>
          {m.kind === "chat" && (
            <a href="#api" className="btn-secondary">
              <Code2 className="size-4" /> Gọi API
            </a>
          )}
          {m.kind === "chat" && (
            <Link href={`/console/chat?model=${encodeURIComponent(m.id)}`} className="btn-primary">
              <MessageSquare className="size-4" /> Chat
            </Link>
          )}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <div className="text-xs text-muted">{s.label}</div>
            <div className="mt-1 font-semibold tabular-nums">{s.value}</div>
          </div>
        ))}
      </div>

      {m.kind === "chat" && (
        <section id="api" className="mt-12 scroll-mt-20">
          <h2 className="text-xl font-semibold">Cách gọi</h2>
          <p className="mt-2 text-sm text-muted">
            Base URL <code className="font-mono">{site.apiBase}/v1</code>, thay <code className="font-mono">sk-...</code> bằng API key của bạn.
          </p>
          <CodeTabs className="mt-4" samples={codeSamples(m.id).filter((s) => s.label !== "Claude Code" || m.id.startsWith("claude"))} />
        </section>
      )}

      <section className="mt-12 max-w-3xl text-sm text-muted">
        <h2 className="mb-2 text-xl font-semibold text-fg">Tính tiền thế nào?</h2>
        {m.perCall ? (
          <p>Mỗi request thành công bị trừ {formatUsd(m.callPrice)}, không phụ thuộc số token.</p>
        ) : (
          <p>
            Chi phí một request = token vào × giá vào + token ra × giá ra, chia cho 1.000.000. Ví dụ 10.000 token vào và 1.000 token ra
            tốn khoảng {formatUsd(((m.input || 0) * 10_000 + (m.output || 0) * 1_000) / 1_000_000, { max: 5 })}.
          </p>
        )}
      </section>

      {m.related.length > 0 && (
        <section className="mt-14">
          <h2 className="text-xl font-semibold">Mô hình khác của {m.vendor}</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {m.related.map((r) => (
              <ModelCard key={r.id} m={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
