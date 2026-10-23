import { getDoc } from "@/lib/content";
import { notFound } from "next/navigation";

export const metadata = { title: "Nhật ký thay đổi" };

export default async function ChangelogPage() {
  const doc = await getDoc("changelog", "pages");
  if (!doc) notFound();
  return (
    <div className="container-x max-w-3xl py-16">
      <div className="prose-x" dangerouslySetInnerHTML={{ __html: doc.html }} />
    </div>
  );
}
