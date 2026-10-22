import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDoc, listDocs } from "@/lib/content";

type Props = { params: Promise<{ slug?: string[] }> };

const DEFAULT = "quickstart";

async function slugOf(params: Props["params"]) {
  const { slug } = await params;
  if (slug && slug.length > 1) return null;
  return slug?.[0] || DEFAULT;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = await slugOf(params);
  const doc = s ? await getDoc(s) : null;
  return doc ? { title: doc.title, description: doc.description } : {};
}

export default async function DocsPage({ params }: Props) {
  const s = await slugOf(params);
  const doc = s ? await getDoc(s) : null;
  if (!doc) notFound();
  const docs = await listDocs();
  const groups = [...new Set(docs.map((d) => d.group))];
  const idx = docs.findIndex((d) => d.slug === doc.slug);
  const prev = docs[idx - 1];
  const next = docs[idx + 1];
  const href = (slug: string) => (slug === DEFAULT ? "/docs" : `/docs/${slug}`);

  return (
    <div className="container-x grid gap-10 py-10 lg:grid-cols-[220px_1fr_200px]">
      <aside className="lg:sticky lg:top-20 lg:h-[calc(100dvh-6rem)] lg:overflow-y-auto">
        <nav className="flex gap-6 overflow-x-auto pb-2 text-sm lg:flex-col lg:gap-5 lg:pb-0">
          {groups.map((g) => (
            <div key={g} className="min-w-max">
              <div className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{g}</div>
              <ul className="space-y-1">
                {docs
                  .filter((d) => d.group === g)
                  .map((d) => (
                    <li key={d.slug}>
                      <Link
                        href={href(d.slug)}
                        className={`block rounded-md px-2 py-1 ${d.slug === doc.slug ? "bg-accent-soft font-medium text-accent" : "text-muted hover:text-fg"}`}
                      >
                        {d.title}
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <article className="min-w-0">
        <div className="prose-x" dangerouslySetInnerHTML={{ __html: doc.html }} />
        <div className="mt-12 flex justify-between gap-4 border-t border-border pt-6 text-sm">
          {prev ? (
            <Link href={href(prev.slug)} className="text-muted hover:text-fg">
              ← {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={href(next.slug)} className="text-muted hover:text-fg">
              {next.title} →
            </Link>
          )}
        </div>
      </article>

      {doc.headings.length > 1 && (
        <aside className="hidden lg:block">
          <div className="sticky top-20 text-sm">
            <div className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Trong trang này</div>
            <ul className="space-y-1.5">
              {doc.headings.map((h) => (
                <li key={h.id}>
                  <a href={`#${h.id}`} className="text-muted hover:text-fg">
                    {h.text}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      )}
    </div>
  );
}
