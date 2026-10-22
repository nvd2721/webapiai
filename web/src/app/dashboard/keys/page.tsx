import { KeysManager } from "@/components/keys-manager";
import { authed, requireSession } from "@/lib/auth";
import { getModels } from "@/lib/models";
import { listTokens } from "@/lib/newapi";
import { site } from "@/lib/site";

export const metadata = { title: "API key" };

export default async function KeysPage() {
  const session = await requireSession();
  const [tokens, models] = await Promise.all([authed(() => listTokens(session, 1, 100)), getModels()]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">API key</h1>
        <p className="mt-1 text-sm text-muted">
          Dùng key trong header <code className="font-mono">Authorization: Bearer sk-...</code> khi gọi <code className="font-mono">{site.apiBase}/v1</code>. Mỗi
          ứng dụng nên dùng một key riêng.
        </p>
      </div>
      <KeysManager tokens={tokens.items} modelIds={models.map((m) => m.id)} />
    </div>
  );
}
