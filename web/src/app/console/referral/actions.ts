"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { NewApiError, UnauthorizedError, transferAff } from "@/lib/newapi";
import { getSession } from "@/lib/session";

export type TransferState = { error?: string; ok?: string };

const QUOTA_PER_UNIT = Number(process.env.NEWAPI_QUOTA_PER_UNIT || 500000);

export async function transferAction(_: TransferState, form: FormData): Promise<TransferState> {
  const s = await getSession();
  if (!s) redirect("/login");
  const usd = Math.floor(Number(form.get("amount")) * 100) / 100;
  if (!Number.isFinite(usd) || usd < 1) return { error: "Số tiền chuyển tối thiểu là 1 USD." };
  try {
    await transferAff(s, Math.floor(usd * QUOTA_PER_UNIT));
  } catch (e) {
    if (e instanceof UnauthorizedError) redirect("/auth/expired");
    return { error: e instanceof NewApiError ? e.message : "Không chuyển được, vui lòng thử lại." };
  }
  revalidatePath("/console", "layout");
  return { ok: `Đã chuyển $${usd.toFixed(2)} vào số dư.` };
}
