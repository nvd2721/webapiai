import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { signIpn, verifyIpnSignature } from "../src/nowpayments.js";
import { sweep, usdToQuota } from "../src/service.js";
import { adminAuth, ipnRequest, setup, siteAuth } from "./helpers.js";

let t: Awaited<ReturnType<typeof setup>>;
beforeEach(async () => {
  t = await setup();
});
afterEach(async () => {
  await t.app.close();
  await t.db.end();
});

async function newInvoice(amount = 10, coin = "usdttrc20", user = 42) {
  const res = await t.app.inject({ method: "POST", url: "/api/invoices", headers: siteAuth, payload: { user_id: user, amount_usd: amount, coin } });
  expect(res.statusCode).toBe(201);
  return res.json();
}

function ipn(invoiceId: string, status: string, extra: Record<string, unknown> = {}) {
  return {
    payment_id: 777001,
    invoice_id: 5001,
    payment_status: status,
    pay_address: "TXYZ",
    price_amount: 10,
    price_currency: "usd",
    pay_amount: 10.05,
    actually_paid: status === "finished" ? 10.05 : 0,
    pay_currency: "usdttrc20",
    order_id: invoiceId,
    order_description: "Top-up",
    outcome_amount: 9.9,
    outcome_currency: "usdttrc20",
    fee: { currency: "usdttrc20", depositFee: 0.1, serviceFee: 0.05, withdrawalFee: 0 },
    ...extra,
  };
}

function markFinishedAtGateway(invoiceId: string, paymentId = "777001") {
  t.nowpayments.payments.set(paymentId, { paymentId, paymentStatus: "finished", orderId: invoiceId, priceAmount: 10, priceCurrency: "usd" });
}

describe("signature", () => {
  it("is independent of key order and rejects tampering", () => {
    const a = { b: 1, a: { d: 2, c: [{ z: 1, y: 2 }] } };
    const b = { a: { c: [{ y: 2, z: 1 }], d: 2 }, b: 1 };
    const sig = signIpn(a, "s");
    expect(signIpn(b, "s")).toBe(sig);
    expect(verifyIpnSignature(b, sig, "s")).toBe(true);
    expect(verifyIpnSignature({ ...b, b: 2 }, sig, "s")).toBe(false);
    expect(verifyIpnSignature(b, sig, "other")).toBe(false);
    expect(verifyIpnSignature(b, undefined, "s")).toBe(false);
  });
  it("converts USD to quota exactly", () => {
    expect(usdToQuota(10, 500000)).toBe(5_000_000);
    expect(usdToQuota(12.34, 500000)).toBe(6_170_000);
  });
});

describe("invoices API", () => {
  it("requires the site secret", async () => {
    const res = await t.app.inject({ method: "GET", url: "/api/invoices?user_id=42" });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: "Unauthorized" });
  });

  it("validates coin, amount and user", async () => {
    const post = (payload: object) => t.app.inject({ method: "POST", url: "/api/invoices", headers: siteAuth, payload });
    expect((await post({ user_id: 42, amount_usd: 10, coin: "doge" })).statusCode).toBe(400);
    expect((await post({ user_id: 42, amount_usd: 4, coin: "usdttrc20" })).statusCode).toBe(400);
    expect((await post({ user_id: 42, amount_usd: 10, coin: "btc" })).statusCode).toBe(400);
    expect((await post({ user_id: 42, amount_usd: 4001, coin: "usdtbsc" })).statusCode).toBe(400);
    const missing = await post({ user_id: 999, amount_usd: 10, coin: "usdttrc20" });
    expect(missing.statusCode).toBe(404);
    expect(missing.json().error).toBe("User not found");
  });

  it("refuses disabled accounts and keeps the balance under New API's int32 cap", async () => {
    const post = (payload: object) => t.app.inject({ method: "POST", url: "/api/invoices", headers: siteAuth, payload });
    t.newapi.disabled.add(43);
    expect((await post({ user_id: 43, amount_usd: 10, coin: "usdttrc20" })).statusCode).toBe(403);
    t.newapi.balances.set(42, 3900 * 500000);
    await newInvoice(50);
    const res = await post({ user_id: 42, amount_usd: 100, coin: "usdttrc20" });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toContain("at most 50 USD");
  });

  it("creates an invoice with the agreed redirect and IPN URLs", async () => {
    const inv = await newInvoice(25, "BTC");
    expect(inv).toMatchObject({ status: "waiting", amount_usd: 25, coin: "btc", credited_usd: 0 });
    expect(inv.invoice_url).toContain("nowpayments.io");
    const sent = t.nowpayments.invoices[0];
    expect(sent.orderId).toBe(inv.id);
    expect(sent.successUrl).toBe(`https://site.example/dashboard/topup?invoice=${inv.id}`);
    expect(sent.ipnCallbackUrl).toBe("https://pay.example/webhooks/nowpayments");

    const list = await t.app.inject({ method: "GET", url: "/api/invoices?user_id=42", headers: siteAuth });
    expect(list.json().data).toHaveLength(1);
    const own = await t.app.inject({ method: "GET", url: `/api/invoices/${inv.id}?user_id=42`, headers: siteAuth });
    expect(own.statusCode).toBe(200);
    const other = await t.app.inject({ method: "GET", url: `/api/invoices/${inv.id}?user_id=43`, headers: siteAuth });
    expect(other.statusCode).toBe(404);
  });

  it("returns 502 and hides the invoice when NOWPayments is down", async () => {
    t.nowpayments.failCreate = true;
    const res = await t.app.inject({ method: "POST", url: "/api/invoices", headers: siteAuth, payload: { user_id: 42, amount_usd: 10, coin: "usdttrc20" } });
    expect(res.statusCode).toBe(502);
    const list = await t.app.inject({ method: "GET", url: "/api/invoices?user_id=42", headers: siteAuth });
    expect(list.json().data[0].status).toBe("failed");
  });

  it("limits open invoices per user", async () => {
    for (let i = 0; i < 10; i++) await newInvoice();
    const res = await t.app.inject({ method: "POST", url: "/api/invoices", headers: siteAuth, payload: { user_id: 42, amount_usd: 10, coin: "usdttrc20" } });
    expect(res.statusCode).toBe(429);
  });
});

describe("IPN and crediting", () => {
  it("rejects a bad signature", async () => {
    const inv = await newInvoice();
    const res = await t.app.inject(ipnRequest(ipn(inv.id, "finished"), "wrong-secret"));
    expect(res.statusCode).toBe(401);
    expect(t.newapi.calls).toBe(0);
  });

  it("credits once on finished, even with duplicate and concurrent IPNs", async () => {
    const inv = await newInvoice();
    markFinishedAtGateway(inv.id);
    await t.app.inject(ipnRequest(ipn(inv.id, "confirming")));
    const results = await Promise.all([1, 2, 3, 4, 5].map(() => t.app.inject(ipnRequest(ipn(inv.id, "finished")))));
    results.forEach((r) => expect(r.statusCode).toBe(200));
    await t.app.inject(ipnRequest(ipn(inv.id, "finished")));
    await sweep({ ...t.deps, log: t.app.log });

    expect(t.newapi.calls).toBe(1);
    expect(t.newapi.balances.get(42)).toBe(5_000_000);
    const got = await t.app.inject({ method: "GET", url: `/api/invoices/${inv.id}?user_id=42`, headers: siteAuth });
    expect(got.json()).toMatchObject({ status: "finished", credited_usd: 10 });
  });

  it("never downgrades a finished invoice", async () => {
    const inv = await newInvoice();
    markFinishedAtGateway(inv.id);
    await t.app.inject(ipnRequest(ipn(inv.id, "finished")));
    await t.app.inject(ipnRequest(ipn(inv.id, "confirming")));
    const got = await t.app.inject({ method: "GET", url: `/api/invoices/${inv.id}?user_id=42`, headers: siteAuth });
    expect(got.json().status).toBe("finished");
  });

  it("does not credit when the NOWPayments API does not confirm the payment", async () => {
    const inv = await newInvoice();
    t.nowpayments.payments.set("777001", { paymentId: "777001", paymentStatus: "confirming", orderId: inv.id, priceAmount: 10, priceCurrency: "usd" });
    const res = await t.app.inject(ipnRequest(ipn(inv.id, "finished")));
    expect(res.json().outcome).toBe("needs_review");
    expect(t.newapi.calls).toBe(0);
  });

  it("answers 500 so NOWPayments retries when its API is unreachable", async () => {
    const inv = await newInvoice();
    const res = await t.app.inject(ipnRequest(ipn(inv.id, "finished")));
    expect(res.statusCode).toBe(500);
    expect(t.newapi.calls).toBe(0);
  });

  it("does not credit on price mismatch", async () => {
    const inv = await newInvoice();
    markFinishedAtGateway(inv.id);
    const res = await t.app.inject(ipnRequest(ipn(inv.id, "finished", { price_amount: 1000 })));
    expect(res.json().outcome).toBe("needs_review");
    expect(t.newapi.calls).toBe(0);
    const review = await t.app.inject({ method: "GET", url: "/api/admin/invoices/review", headers: adminAuth });
    expect(review.json().data).toHaveLength(1);
  });

  it("ignores unknown orders without failing", async () => {
    const res = await t.app.inject(ipnRequest(ipn("00000000-0000-4000-8000-000000000000", "finished")));
    expect(res.statusCode).toBe(200);
    expect(res.json().outcome).toBe("ignored_unknown_order");
  });

  it("retries a definite New API failure", async () => {
    const inv = await newInvoice();
    markFinishedAtGateway(inv.id);
    t.newapi.failNext = "definite";
    await t.app.inject(ipnRequest(ipn(inv.id, "finished")));
    expect(t.newapi.balances.get(42)).toBeUndefined();
    await t.db.query("UPDATE credits SET next_attempt_at = now()");
    await sweep({ ...t.deps, log: t.app.log });
    expect(t.newapi.balances.get(42)).toBe(5_000_000);
  });

  it("parks an ambiguous New API result for a human and never re-sends it automatically", async () => {
    const inv = await newInvoice();
    markFinishedAtGateway(inv.id);
    t.newapi.failNext = "ambiguous";
    await t.app.inject(ipnRequest(ipn(inv.id, "finished")));
    await t.app.inject(ipnRequest(ipn(inv.id, "finished")));
    await sweep({ ...t.deps, log: t.app.log });
    expect(t.newapi.calls).toBe(1);

    const unknown = await t.app.inject({ method: "GET", url: "/api/admin/credits?state=unknown", headers: adminAuth });
    const credit = unknown.json().data[0];
    expect(credit.state).toBe("unknown");
    // Admin checks New API logs, sees the quota landed, marks it done.
    const r = await t.app.inject({ method: "POST", url: `/api/admin/credits/${credit.id}/resolve`, headers: adminAuth, payload: { action: "mark_done" } });
    expect(r.statusCode).toBe(200);
    expect(t.newapi.balances.get(42)).toBe(5_000_000);
    const got = await t.app.inject({ method: "GET", url: `/api/invoices/${inv.id}?user_id=42`, headers: siteAuth });
    expect(got.json().credited_usd).toBe(10);
  });

  it("marks credits stuck in processing as unknown", async () => {
    const inv = await newInvoice();
    await t.db.query(
      `INSERT INTO credits (idem_key, invoice_id, user_id, amount_usd, quota, state, updated_at)
       VALUES ('np:1', $1, 42, 10, 5000000, 'processing', now() - interval '10 minutes')`,
      [inv.id],
    );
    await sweep({ ...t.deps, log: t.app.log });
    const r = await t.db.query("SELECT state FROM credits");
    expect(r.rows[0].state).toBe("unknown");
    expect(t.newapi.calls).toBe(0);
  });

  it("holds a credit that would overflow New API's int32 balance instead of retrying it", async () => {
    const inv = await newInvoice();
    markFinishedAtGateway(inv.id);
    t.newapi.balances.set(42, 2_145_000_000);
    await t.app.inject(ipnRequest(ipn(inv.id, "finished")));
    await t.db.query("UPDATE credits SET next_attempt_at = now()");
    await sweep({ ...t.deps, log: t.app.log });
    expect(t.newapi.calls).toBe(0);
    const r = await t.db.query("SELECT state, last_error FROM credits");
    expect(r.rows[0].state).toBe("failed");
    expect(r.rows[0].last_error).toContain("limit");
    // Customer spends down, admin retries.
    t.newapi.balances.set(42, 0);
    const res = await t.app.inject({ method: "POST", url: `/api/admin/credits/${(await t.db.query("SELECT id FROM credits")).rows[0].id}/resolve`, headers: adminAuth, payload: { action: "retry" } });
    expect(res.statusCode).toBe(200);
    expect(t.newapi.balances.get(42)).toBe(5_000_000);
  });

  it("allows one manual credit per invoice (partial payment)", async () => {
    const inv = await newInvoice();
    await t.app.inject(ipnRequest(ipn(inv.id, "partially_paid", { actually_paid: 6 })));
    const post = () =>
      t.app.inject({ method: "POST", url: `/api/admin/invoices/${inv.id}/manual-credit`, headers: adminAuth, payload: { amount_usd: 6, note: "underpaid" } });
    expect((await post()).statusCode).toBe(200);
    expect((await post()).statusCode).toBe(409);
    expect(t.newapi.balances.get(42)).toBe(3_000_000);
  });

  it("protects admin routes with the admin secret", async () => {
    const res = await t.app.inject({ method: "GET", url: "/api/admin/credits", headers: siteAuth });
    expect(res.statusCode).toBe(401);
  });
});
