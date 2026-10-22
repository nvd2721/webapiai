import { createHmac, timingSafeEqual } from "node:crypto";

export interface CreateInvoiceInput {
  priceAmount: number;
  payCurrency: string;
  orderId: string;
  orderDescription: string;
  ipnCallbackUrl: string;
  successUrl: string;
  cancelUrl: string;
  feePaidByUser: boolean;
}

export interface NpInvoice {
  id: string;
  invoiceUrl: string;
}

export interface NpPayment {
  paymentId: string;
  paymentStatus: string;
  orderId: string | null;
  priceAmount: number;
  priceCurrency: string;
}

export interface NowPaymentsClient {
  createInvoice(input: CreateInvoiceInput): Promise<NpInvoice>;
  getPayment(paymentId: string): Promise<NpPayment>;
}

export class NowPaymentsError extends Error {}

export function createNowPaymentsClient(opts: { apiKey: string; sandbox: boolean; timeoutMs?: number }): NowPaymentsClient {
  const base = opts.sandbox ? "https://api-sandbox.nowpayments.io/v1" : "https://api.nowpayments.io/v1";
  const timeoutMs = opts.timeoutMs ?? 15000;

  async function call(method: string, path: string, body?: unknown): Promise<any> {
    const res = await fetch(base + path, {
      method,
      headers: { "x-api-key": opts.apiKey, "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await res.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      json = undefined;
    }
    if (!res.ok || json === undefined) {
      throw new NowPaymentsError(`NOWPayments ${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
    }
    return json;
  }

  return {
    async createInvoice(input) {
      const json = await call("POST", "/invoice", {
        price_amount: input.priceAmount,
        price_currency: "usd",
        pay_currency: input.payCurrency,
        order_id: input.orderId,
        order_description: input.orderDescription,
        ipn_callback_url: input.ipnCallbackUrl,
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        is_fee_paid_by_user: input.feePaidByUser,
      });
      if (!json.id || !json.invoice_url) throw new NowPaymentsError(`Unexpected invoice response: ${JSON.stringify(json).slice(0, 300)}`);
      return { id: String(json.id), invoiceUrl: String(json.invoice_url) };
    },
    async getPayment(paymentId) {
      const json = await call("GET", `/payment/${encodeURIComponent(paymentId)}`);
      return {
        paymentId: String(json.payment_id),
        paymentStatus: String(json.payment_status),
        orderId: json.order_id == null ? null : String(json.order_id),
        priceAmount: Number(json.price_amount),
        priceCurrency: String(json.price_currency).toLowerCase(),
      };
    },
  };
}

// NOWPayments signs IPN bodies as HMAC-SHA512(ipnSecret, JSON.stringify(body with keys sorted recursively)).
export function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = sortKeysDeep((value as Record<string, unknown>)[k]);
        return acc;
      }, {});
  }
  return value;
}

export function signIpn(body: unknown, ipnSecret: string): string {
  return createHmac("sha512", ipnSecret).update(JSON.stringify(sortKeysDeep(body))).digest("hex");
}

export function verifyIpnSignature(body: unknown, signature: string | undefined, ipnSecret: string): boolean {
  if (!signature || !/^[0-9a-f]{128}$/i.test(signature)) return false;
  const expected = Buffer.from(signIpn(body, ipnSecret), "hex");
  const given = Buffer.from(signature, "hex");
  return expected.length === given.length && timingSafeEqual(expected, given);
}
