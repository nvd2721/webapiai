"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { NewApiError, UnauthorizedError, createToken, deleteToken, listTokens, revealTokenKey, setTokenStatus } from "@/lib/newapi";
import { getSession } from "@/lib/session";
import { usdToQuota } from "@/lib/format";

export type KeyResult = { ok?: boolean; error?: string; key?: string; name?: string };

async function run<T>(fn: (s: NonNullable<Awaited<ReturnType<typeof getSession>>>) => Promise<T>): Promise<T | { error: string }> {
  const s = await getSession();
  if (!s) redirect("/login");
  try {
    return await fn(s);
  } catch (e) {
    if (e instanceof UnauthorizedError) redirect("/auth/expired");
    return { error: e instanceof NewApiError ? e.message : "Có lỗi xảy ra, vui lòng thử lại." };
  }
}

const schema = z.object({
  name: z.string().trim().min(1, "Đặt tên cho key.").max(30, "Tên key tối đa 30 ký tự."),
  limit: z.union([z.literal(""), z.coerce.number().positive("Hạn mức phải lớn hơn 0.").max(100_000)]),
  expiry: z.enum(["never", "7", "30", "90", "365"]),
  models: z.array(z.string()),
  ips: z.string().max(2000),
});

export async function createKeyAction(_: KeyResult, form: FormData): Promise<KeyResult> {
  const parsed = schema.safeParse({
    name: form.get("name"),
    limit: form.get("limit") || "",
    expiry: form.get("expiry") || "never",
    models: form.getAll("models").map(String),
    ips: String(form.get("ips") || ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const ips = d.ips
    .split(/[\s,]+/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (ips.some((ip) => !/^[0-9a-fA-F:.]+(\/\d{1,3})?$/.test(ip))) return { error: "Danh sách IP không hợp lệ." };

  const r = await run(async (s) => {
    await createToken(s, {
      name: d.name,
      remain_quota: d.limit === "" ? 0 : usdToQuota(d.limit),
      unlimited_quota: d.limit === "",
      expired_time: d.expiry === "never" ? -1 : Math.floor(Date.now() / 1000) + Number(d.expiry) * 86400,
      model_limits_enabled: d.models.length > 0,
      model_limits: d.models.join(","),
      allow_ips: ips.join("\n"),
      group: "",
    });
    // New API does not return the new key; find it (newest first) and reveal it once.
    const page = await listTokens(s, 1, 20);
    const created = [...page.items].sort((a, b) => b.id - a.id).find((t) => t.name === d.name);
    const key = created ? await revealTokenKey(s, created.id) : undefined;
    return { ok: true, key, name: d.name };
  });
  revalidatePath("/console/keys");
  return r;
}

export async function revealKeyAction(id: number): Promise<KeyResult> {
  return run(async (s) => ({ ok: true, key: await revealTokenKey(s, id) }));
}

export async function toggleKeyAction(id: number, enable: boolean): Promise<KeyResult> {
  const r = await run(async (s) => {
    await setTokenStatus(s, id, enable ? 1 : 2);
    return { ok: true };
  });
  revalidatePath("/console/keys");
  return r;
}

export async function deleteKeyAction(id: number): Promise<KeyResult> {
  const r = await run(async (s) => {
    await deleteToken(s, id);
    return { ok: true };
  });
  revalidatePath("/console/keys");
  return r;
}
