import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { Marked } from "marked";
import { site } from "./site";

// Markdown pages in /content. Front matter is a tiny "key: value" block between --- lines.

export type Doc = { slug: string; title: string; description: string; order: number; group: string; html: string; headings: { id: string; text: string }[] };

const ROOT = path.join(process.cwd(), "content");

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function render(md: string) {
  const headings: Doc["headings"] = [];
  const marked = new Marked({
    gfm: true,
    renderer: {
      heading({ tokens, depth }) {
        const text = this.parser.parseInline(tokens);
        const plain = text.replace(/<[^>]+>/g, "");
        const id = slugify(plain);
        if (depth === 2) headings.push({ id, text: plain });
        return `<h${depth} id="${id}"><a href="#${id}" class="no-underline">${text}</a></h${depth}>`;
      },
      code({ text, lang }) {
        const label = lang ? `<div class="code-lang">${escapeHtml(lang)}</div>` : "";
        return `<div class="code-block">${label}<pre><code>${escapeHtml(text)}</code></pre></div>`;
      },
    },
  });
  return { html: marked.parse(md, { async: false }) as string, headings };
}

function fill(md: string) {
  return md
    .replaceAll("{{API_BASE}}", site.apiBase)
    .replaceAll("{{SITE_NAME}}", site.name)
    .replaceAll("{{SITE_URL}}", site.url)
    .replaceAll("{{SUPPORT_EMAIL}}", site.supportEmail)
    .replaceAll("{{UPDATED}}", process.env.LEGAL_UPDATED || "22/10/2026");
}

function parse(slug: string, raw: string): Doc {
  let body = raw;
  const meta: Record<string, string> = {};
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (fm) {
    body = raw.slice(fm[0].length);
    for (const line of fm[1].split("\n")) {
      const i = line.indexOf(":");
      if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
  const { html, headings } = render(fill(body));
  return {
    slug,
    title: meta.title || slug,
    description: meta.description || "",
    order: Number(meta.order || 99),
    group: meta.group || "",
    html,
    headings,
  };
}

export async function listDocs(dir = "docs"): Promise<Doc[]> {
  const files = (await fs.readdir(path.join(ROOT, dir))).filter((f) => f.endsWith(".md"));
  const docs = await Promise.all(
    files.map(async (f) => parse(f.replace(/\.md$/, ""), await fs.readFile(path.join(ROOT, dir, f), "utf8"))),
  );
  return docs.sort((a, b) => a.order - b.order);
}

export async function getDoc(slug: string, dir = "docs"): Promise<Doc | null> {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  try {
    return parse(slug, await fs.readFile(path.join(ROOT, dir, `${slug}.md`), "utf8"));
  } catch {
    return null;
  }
}
