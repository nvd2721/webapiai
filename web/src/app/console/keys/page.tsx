import { PageHeader } from "@/components/page-header";
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
      <PageHeader
        title="API key"
        refresh="/console/keys"
        desc={
          <>
            Dùng key trong header <code className="font-mono">Authorization: Bearer sk-...</code> khi gọi <code className="font-mono">{site.apiBase}/v1</code>. Mỗi ứng
            dụng nên dùng một key riêng.
          </>
        }
      />
      <KeysManager tokens={tokens.items} modelIds={models.map((m) => m.id)} />
    </div>
  );
}
