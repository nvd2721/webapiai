import { ChatStudio } from "@/components/chat-studio";
import { authed, requireSession } from "@/lib/auth";
import { getModels } from "@/lib/models";
import { getUserModels } from "@/lib/newapi";
import { site } from "@/lib/site";

export const metadata = { title: "Chat" };

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ model?: string; q?: string }> }) {
  const { model, q } = await searchParams;
  const session = await requireSession();
  const [allowed, models] = await Promise.all([authed(() => getUserModels(session)), getModels()]);
  const priced = new Map(models.map((m) => [m.id, m]));
  const options = allowed
    .filter((id) => (priced.get(id)?.kind ?? "chat") === "chat")
    .map((id) => {
      const m = priced.get(id);
      return { id, name: m?.name || id, vendor: m?.vendor || "", input: m?.input ?? null, output: m?.output ?? null };
    })
    .sort((a, b) => a.vendor.localeCompare(b.vendor) || a.id.localeCompare(b.id));
  return <ChatStudio models={options} initialModel={model} initialPrompt={q} apiBase={site.apiBase} />;
}
