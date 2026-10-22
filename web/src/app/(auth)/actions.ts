"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { NewApiError, login, logout, register } from "@/lib/newapi";
import { clearSession, getSession, setSession } from "@/lib/session";

export type AuthState = { error?: string; fields?: Record<string, string> };

const username = z
  .string()
  .trim()
  .min(3, "Tên đăng nhập cần ít nhất 3 ký tự.")
  .max(20, "Tên đăng nhập tối đa 20 ký tự.")
  .regex(/^[a-zA-Z0-9_.-]+$/, "Tên đăng nhập chỉ gồm chữ không dấu, số, dấu chấm, gạch dưới, gạch ngang.");
const password = z.string().min(8, "Mật khẩu cần ít nhất 8 ký tự.").max(20, "Mật khẩu tối đa 20 ký tự.");

function safeNext(next: FormDataEntryValue | null) {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard";
}

async function signIn(u: string, p: string) {
  const { user, nc } = await login(u, p);
  await setSession({ uid: user.id, username: user.username, nc });
}

export async function loginAction(_: AuthState, form: FormData): Promise<AuthState> {
  const fields = { username: String(form.get("username") || "") };
  const parsed = z.object({ username: z.string().trim().min(1, "Nhập tên đăng nhập."), password: z.string().min(1, "Nhập mật khẩu.") }).safeParse({
    username: form.get("username"),
    password: form.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };
  try {
    await signIn(parsed.data.username, parsed.data.password);
  } catch (e) {
    return { error: e instanceof NewApiError ? e.message : "Có lỗi xảy ra, vui lòng thử lại.", fields };
  }
  redirect(safeNext(form.get("next")));
}

export async function registerAction(_: AuthState, form: FormData): Promise<AuthState> {
  const fields = { username: String(form.get("username") || ""), email: String(form.get("email") || "") };
  const parsed = z
    .object({
      username,
      password,
      confirm: z.string(),
      email: z.union([z.literal(""), z.email("Email không hợp lệ.")]),
      terms: z.literal("on", { error: "Bạn cần đồng ý với Điều khoản sử dụng." }),
    })
    .refine((d) => d.password === d.confirm, { message: "Hai mật khẩu không khớp." })
    .safeParse({
      username: form.get("username"),
      password: form.get("password"),
      confirm: form.get("confirm"),
      email: form.get("email") || "",
      terms: form.get("terms"),
    });
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };

  const { username: u, password: p, email } = parsed.data;
  const aff = String(form.get("aff") || "").trim();
  try {
    await register({ username: u, password: p, ...(email ? { email } : {}), ...(aff ? { aff_code: aff } : {}) });
    await signIn(u, p);
  } catch (e) {
    return { error: e instanceof NewApiError ? e.message : "Có lỗi xảy ra, vui lòng thử lại.", fields };
  }
  redirect("/dashboard?welcome=1");
}

export async function logoutAction() {
  const s = await getSession();
  if (s) await logout(s);
  await clearSession();
  redirect("/");
}
