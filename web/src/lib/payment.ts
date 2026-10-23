import "server-only";
import { mockAddCredit } from "./mock";
import { isDemo, site } from "./site";

// Client for the crypto top-up service (NOWPayments behind it). Server-to-server only:
// the shared secret never reaches the browser.

const BASE = (process.env.PAYMENT_API_URL || process.env.PAYMENT_INTERNAL_URL || "").replace(/\/$/, "");
const SECRET = process.env.PAYMENT_API_SECRET || "";
export const paymentDemo = !BASE;

export type Coin = "usdttrc20" | "usdtbsc" | "btc";

export const COINS: { id: Coin; label: string; network: string; min: number; note: string }[] = [
  { id: "usdttrc20", label: "USDT", network: "TRC20 (Tron)", min: 5, note: "Phí mạng thấp nhất, khuyên dùng" },
  { id: "usdtbsc", label: "USDT", network: "BEP20 (BNB Smart Chain)", min: 5, note: "Phí mạng thấp" },
  { id: "btc", label: "Bitcoin", network: "Bitcoin", min: 20, note: "Xác nhận chậm hơn, phí mạng cao hơn" },
];
// New API stores quota as a 32-bit int: 2^31 / 500000 ≈ 4294 USD max balance per user.
export const MAX_BALANCE = Math.floor(2 ** 31 / Number(process.env.NEWAPI_QUOTA_PER_UNIT || 500000)) - 1;
export const MAX_TOPUP = Math.min(4_000, MAX_BALANCE);

export type InvoiceStatus =
  | "waiting"
  | "confirming"
  | "confirmed"
  | "sending"
  | "partially_paid"
  | "finished"
  | "failed"
  | "refunded"
  | "expired";

export type Invoice = {
  id: string;
  invoice_url: string;
  status: InvoiceStatus;
  amount_usd: number;
  coin: Coin;
  created_at: string;
  credited_usd: number;
};

export const STATUS_LABEL: Record<InvoiceStatus, { label: string; tone: "gray" | "amber" | "green" | "red" }> = {
  waiting: { label: "Chờ thanh toán", tone: "gray" },
  confirming: { label: "Đang xác nhận", tone: "amber" },
  confirmed: { label: "Đã xác nhận", tone: "amber" },
  sending: { label: "Đang xử lý", tone: "amber" },
  partially_paid: { label: "Thanh toán thiếu", tone: "red" },
  finished: { label: "Đã cộng tiền", tone: "green" },
  failed: { label: "Thất bại", tone: "red" },
  refunded: { label: "Đã hoàn", tone: "gray" },
  expired: { label: "Hết hạn", tone: "gray" },
};

export class PaymentError extends Error {}

const demoInvoices: Invoice[] = [];

async function call<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method: init.method || "GET",
      headers: {
        Authorization: `Bearer ${SECRET}`,
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch (e) {
    console.error("[payment] network error", e);
    throw new PaymentError("Không kết nối được dịch vụ nạp tiền, vui lòng thử lại sau.");
  }
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    if (res.status === 401) console.error("[payment] PAYMENT_API_SECRET rejected");
    const limit = json.error?.match(/at most (\d+(?:\.\d+)?) USD/i);
    if (limit) throw new PaymentError(`Số dư đã gần mức tối đa, bạn chỉ nạp thêm được ${limit[1]} USD lúc này.`);
    if (res.status === 403) throw new PaymentError("Tài khoản đang bị khóa, vui lòng liên hệ hỗ trợ.");
    throw new PaymentError(json.error || `Dịch vụ nạp tiền lỗi (HTTP ${res.status}).`);
  }
  return json;
}

export async function createInvoice(userId: number, amountUsd: number, coin: Coin): Promise<Invoice> {
  if (paymentDemo) {
    if (!isDemo) throw new PaymentError("Chưa cấu hình dịch vụ nạp tiền (PAYMENT_API_URL).");
    const inv: Invoice = {
      id: crypto.randomUUID(),
      invoice_url: "",
      status: "finished",
      amount_usd: amountUsd,
      coin,
      created_at: new Date().toISOString(),
      credited_usd: amountUsd,
    };
    inv.invoice_url = `${site.url}/console/topup?invoice=${inv.id}`;
    demoInvoices.unshift(inv);
    mockAddCredit(userId, amountUsd);
    return inv;
  }
  return call<Invoice>("/api/invoices", { method: "POST", body: { user_id: userId, amount_usd: amountUsd, coin } });
}

export async function listInvoices(userId: number, limit = 20): Promise<Invoice[]> {
  if (paymentDemo) return demoInvoices.slice(0, limit);
  const r = await call<{ data: Invoice[] }>(`/api/invoices?user_id=${userId}&limit=${limit}`);
  return r.data || [];
}

export async function getInvoice(userId: number, id: string): Promise<Invoice | null> {
  if (paymentDemo) return demoInvoices.find((i) => i.id === id) || null;
  try {
    return await call<Invoice>(`/api/invoices/${encodeURIComponent(id)}?user_id=${userId}`);
  } catch {
    return null;
  }
}
