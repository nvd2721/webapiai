import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth-forms";
import { getSession } from "@/lib/session";

export const metadata = { title: "Đăng nhập" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; expired?: string }> }) {
  const sp = await searchParams;
  if (!sp.expired && (await getSession())) redirect("/console");
  return <LoginForm next={sp.next} expired={!!sp.expired} />;
}
