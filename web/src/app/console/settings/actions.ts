"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { NewApiError, UnauthorizedError, updateSelf } from "@/lib/newapi";
import { getSession } from "@/lib/session";

export type SettingsState = { error?: string; ok?: string };

export async function profileAction(_: SettingsState, form: FormData): Promise<SettingsState> {
  const s = await getSession();
  if (!s) redirect("/login");
  const current = String(form.get("current") || "");
  const displayName = String(form.get("display_name") || "").trim();
  const password = String(form.get("password") || "");
  const confirm = String(form.get("confirm") || "");
  if (!current) return { error: "Nhập mật khẩu hiện tại để lưu thay đổi." };
  if (displayName.length > 20) return { error: "Tên hiển thị tối đa 20 ký tự." };
  if (password) {
    if (password.length < 8 || password.length > 20) return { error: "Mật khẩu mới cần từ 8 đến 20 ký tự." };
    if (password !== confirm) return { error: "Hai lần nhập mật khẩu mới không khớp." };
  }
  if (!displayName && !password) return { error: "Không có gì để thay đổi." };
  try {
    await updateSelf(s, { original_password: current, ...(displayName ? { display_name: displayName } : {}), ...(password ? { password } : {}) });
  } catch (e) {
    if (e instanceof UnauthorizedError) redirect("/auth/expired");
    return { error: e instanceof NewApiError ? e.message : "Không lưu được, vui lòng thử lại." };
  }
  revalidatePath("/console", "layout");
  return { ok: password ? "Đã lưu. Lần đăng nhập sau dùng mật khẩu mới." : "Đã lưu thay đổi." };
}
