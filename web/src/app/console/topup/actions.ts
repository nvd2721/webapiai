"use server";

import { redirect } from "next/navigation";
import { COINS, MAX_BALANCE, MAX_TOPUP, PaymentError, createInvoice, type Coin } from "@/lib/payment";
import { getSession } from "@/lib/session";
import { NewApiError, UnauthorizedError, getSelf } from "@/lib/newapi";
import { quotaToUsd } from "@/lib/format";

export type TopupState = { error?: string };

export async function createInvoiceAction(_: TopupState, form: FormData): Promise<TopupState> {
  const s = await getSession();
  if (!s) redirect("/login");
  const coin = COINS.find((c) => c.id === form.get("coin"));
  if (!coin) return { error: "Chọn đồng coin." };
  const amount = Math.round(Number(form.get("amount")) * 100) / 100;
  if (!Number.isFinite(amount) || amount < coin.min) return { error: `Số tiền tối thiểu với ${coin.label} ${coin.network} là ${coin.min} USD.` };
  if (amount > MAX_TOPUP) return { error: `Số tiền tối đa mỗi lần là ${MAX_TOPUP.toLocaleString("vi-VN")} USD.` };

  let url: string;
  try {
    const balance = quotaToUsd((await getSelf(s)).quota);
    if (balance + amount > MAX_BALANCE) {
      return { error: `Số dư tối đa mỗi tài khoản là ${MAX_BALANCE.toLocaleString("vi-VN")} USD. Bạn nạp thêm được tối đa ${Math.floor(MAX_BALANCE - balance)} USD.` };
    }
    const inv = await createInvoice(s.uid, amount, coin.id as Coin);
    url = inv.invoice_url;
  } catch (e) {
    if (e instanceof UnauthorizedError) redirect("/auth/expired");
    return { error: e instanceof PaymentError || e instanceof NewApiError ? e.message : "Không tạo được hóa đơn, vui lòng thử lại." };
  }
  redirect(url);
}
