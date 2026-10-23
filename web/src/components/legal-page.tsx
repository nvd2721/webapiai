import { notFound } from "next/navigation";
import { getDoc } from "@/lib/content";

export async function LegalPage({ slug }: { slug: string }) {
  const doc = await getDoc(slug, "legal");
  if (!doc) notFound();
  return (
    <div className="container-x max-w-3xl py-12">
      <div className="prose-x" dangerouslySetInnerHTML={{ __html: doc.html }} />
    </div>
  );
}
