import pg from "pg";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { migrate } from "../src/db.js";
import { NewApiAmbiguousError, NewApiDefiniteError, type NewApiClient } from "../src/newapi.js";
import { signIpn, type NowPaymentsClient, type NpPayment } from "../src/nowpayments.js";

export const SITE_SECRET = "site-secret-0123456789abcdefghij";
export const ADMIN_SECRET = "admin-secret-0123456789abcdefghi";
export const IPN_SECRET = "ipn-secret-for-tests";

export const config = loadConfig({
  DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgresql://payments:payments@localhost:5432/payments_test",
  PAYMENT_API_SECRET: SITE_SECRET,
  PAYMENT_ADMIN_SECRET: ADMIN_SECRET,
  SITE_URL: "https://site.example",
  PUBLIC_URL: "https://pay.example",
  NOWPAYMENTS_API_KEY: "k",
  NOWPAYMENTS_IPN_SECRET: IPN_SECRET,
  NEWAPI_INTERNAL_URL: "http://new-api:3000",
  NEWAPI_ADMIN_TOKEN: "t",
  NEWAPI_ADMIN_USER_ID: "1",
});

export class FakeNowPayments implements NowPaymentsClient {
  invoices: any[] = [];
  payments = new Map<string, NpPayment>();
  failCreate = false;
  async createInvoice(input: any) {
    if (this.failCreate) throw new Error("np down");
    this.invoices.push(input);
    const id = String(5000 + this.invoices.length);
    return { id, invoiceUrl: `https://nowpayments.io/payment/?iid=${id}` };
  }
  async getPayment(paymentId: string) {
    const p = this.payments.get(paymentId);
    if (!p) throw new Error("payment not found");
    return p;
  }
}

export class FakeNewApi implements NewApiClient {
  users = new Set([42, 43]);
  balances = new Map<number, number>();
  calls = 0;
  failNext: "definite" | "ambiguous" | null = null;
  disabled = new Set<number>();
  async getUser(id: number) {
    if (!this.users.has(id)) return null;
    return { id, status: this.disabled.has(id) ? 2 : 1, quota: this.balances.get(id) ?? 0 };
  }
  async addQuota(id: number, quota: number) {
    this.calls++;
    await new Promise((r) => setTimeout(r, 5));
    const f = this.failNext;
    this.failNext = null;
    if (f === "definite") throw new NewApiDefiniteError("refused");
    if (f === "ambiguous") {
      // Worst case: it actually applied, but we never heard back.
      this.balances.set(id, (this.balances.get(id) ?? 0) + quota);
      throw new NewApiAmbiguousError("timeout");
    }
    this.balances.set(id, (this.balances.get(id) ?? 0) + quota);
  }
}

export async function setup() {
  const db = new pg.Pool({ connectionString: config.DATABASE_URL });
  await db.query("DROP TABLE IF EXISTS ipn_events, credits, invoices, schema_migrations CASCADE");
  await migrate(db);
  const nowpayments = new FakeNowPayments();
  const newapi = new FakeNewApi();
  const deps = { db, config, nowpayments, newapi };
  const app = buildApp(deps, { logger: false });
  await app.ready();
  return { db, app, nowpayments, newapi, deps };
}

export const siteAuth = { authorization: `Bearer ${SITE_SECRET}` };
export const adminAuth = { authorization: `Bearer ${ADMIN_SECRET}` };

export function ipnRequest(body: Record<string, unknown>, secret = IPN_SECRET) {
  return {
    method: "POST" as const,
    url: "/webhooks/nowpayments",
    headers: { "content-type": "application/json", "x-nowpayments-sig": signIpn(body, secret) },
    payload: JSON.stringify(body),
  };
}
