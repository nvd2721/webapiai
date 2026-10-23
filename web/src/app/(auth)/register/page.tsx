import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth-forms";
import { getSession } from "@/lib/session";

export const metadata = { title: "Đăng ký" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ aff?: string }> }) {
  if (await getSession()) redirect("/console");
  const { aff } = await searchParams;
  return <RegisterForm aff={aff} />;
}
