import { randomUUID } from "node:crypto";
import type pg from "pg";
import type { Config } from "./config.js";
import { type Db, withTx } from "./db.js";
import type { NewApiClient } from "./newapi.js";
import { NewApiAmbiguousError } from "./newapi.js";
import type { NowPaymentsClient } from "./nowpayments.js";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export interface Logger {
  info(obj: object, msg?: string): void;
  warn(obj: object, msg?: string): void;
  error(obj: object, msg?: string): void;
}

export interface Deps {
  db: Db;
  config: Config;
  nowpayments: NowPaymentsClient;
  newapi: NewApiClient;
  log: Logger;
}

// NOWPayments payment_status values.
const KNOWN_STATUSES = new Set([
  "waiting", "confirming", "confirmed", "sending", "partially_paid", "finished", "failed", "refunded", "expired",
]);

export interface InvoiceView {
  id: string;
  invoice_url: string | null;
  status: string;
  amount_usd: number;
  coin: string;
  created_at: string;
  credited_usd: number;
}

const INVOICE_SELECT = `
  SELECT i.*,
         COALESCE((SELECT sum(c.amount_usd) FROM credits c WHERE c.invoice_id = i.id AND c.state = 'done'), 0) AS credited_usd
    FROM invoices i`;

function toView(row: any, expireHours: number): InvoiceView {
  let status: string = row.status;
  // NOWPayments sends no IPN for an invoice nobody paid; show it as expired after a while.
  // A late IPN still updates the row, so this is display only.
  if (status === "waiting" && !row.last_payment_id && Date.now() - new Date(row.created_at).getTime() > expireHours * 3600_000) {
    status = "expired";
  }
  return {
    id: row.id,
    invoice_url: row.invoice_url,
    status,
    amount_usd: Number(row.amount_usd),
    coin: row.coin,
    created_at: new Date(row.created_at).toISOString(),
    credited_usd: Number(row.credited_usd ?? 0),
  };
}

export function usdToQuota(amountUsd: number, quotaPerUsd: number): number {
  // amount_usd has 2 decimals; work in cents to avoid float drift.
  const cents = Math.round(amountUsd * 100);
  return (cents * quotaPerUsd) / 100;
}

// ---------- invoices ----------

export async function createInvoice(deps: Deps, input: { userId: number; amountUsd: number; coin: string }): Promise<InvoiceView> {
  const { db, config, nowpayments, newapi, log } = deps;
  const coin = input.coin.toLowerCase();
  const limits = config.COIN_LIMITS[coin];
  if (!limits) throw new HttpError(400, `Unsupported coin. Allowed: ${Object.keys(config.COIN_LIMITS).join(", ")}`);
  const amount = Math.round(input.amountUsd * 100) / 100;
  if (!(amount >= limits.min && amount <= limits.max)) {
    throw new HttpError(400, `Amount for ${coin} must be between ${limits.min} and ${limits.max} USD`);
  }
  if (!Number.isInteger(usdToQuota(amount, config.QUOTA_PER_USD))) throw new HttpError(400, "Invalid amount");

  let user: Awaited<ReturnType<NewApiClient["getUser"]>>;
  try {
    user = await newapi.getUser(input.userId);
  } catch (err: any) {
    log.error({ err: err?.message, userId: input.userId }, "New API user lookup failed");
    throw new HttpError(502, "Account service unavailable, try again later");
  }
  if (!user) throw new HttpError(404, "User not found");
  if (user.status !== 1) throw new HttpError(403, "Account is disabled");
  // New API stores quota as a 32-bit integer: keep balance + unpaid invoices under the cap.
  const pending = await db.query(
    `SELECT coalesce(sum(amount_usd), 0) AS s FROM invoices
      WHERE user_id = $1 AND status IN ('waiting','confirming','confirmed','sending') AND created_at > now() - interval '24 hours'`,
    [input.userId],
  );
  const after = user.quota + usdToQuota(amount + Number(pending.rows[0].s), config.QUOTA_PER_USD);
  if (after > config.MAX_BALANCE_QUOTA) {
    const room = Math.max(0, Math.floor((config.MAX_BALANCE_QUOTA - user.quota) / config.QUOTA_PER_USD - Number(pending.rows[0].s)));
    throw new HttpError(400, `Balance limit reached: you can top up at most ${room} USD now`);
  }

  const open = await db.query(
    `SELECT count(*)::int AS n FROM invoices
      WHERE user_id = $1 AND status IN ('creating','waiting') AND last_payment_id IS NULL
        AND created_at > now() - interval '24 hours'`,
    [input.userId],
  );
  if (open.rows[0].n >= config.MAX_OPEN_INVOICES_PER_USER) {
    throw new HttpError(429, "Too many unpaid invoices, pay or wait for the existing ones");
  }

  const id = randomUUID();
  await db.query(
    `INSERT INTO invoices (id, user_id, amount_usd, coin, status) VALUES ($1, $2, $3, $4, 'creating')`,
    [id, input.userId, amount.toFixed(2), coin],
  );

  const back = `${config.SITE_URL.replace(/\/+$/, "")}/dashboard/topup?invoice=${id}`;
  try {
    const np = await nowpayments.createInvoice({
      priceAmount: amount,
      payCurrency: coin,
      orderId: id,
      orderDescription: `${config.BRAND_NAME} top-up ${amount.toFixed(2)} USD, user ${input.userId}`,
      ipnCallbackUrl: `${config.PUBLIC_URL.replace(/\/+$/, "")}/webhooks/nowpayments`,
      successUrl: back,
      cancelUrl: back,
      feePaidByUser: config.NOWPAYMENTS_FEE_PAID_BY_USER,
    });
    await db.query(
      `UPDATE invoices SET status = 'waiting', np_invoice_id = $2, invoice_url = $3, updated_at = now() WHERE id = $1`,
      [id, np.id, np.invoiceUrl],
    );
  } catch (err: any) {
    log.error({ err: err?.message, invoiceId: id }, "NOWPayments invoice creation failed");
    await db.query(`UPDATE invoices SET status = 'failed', review_note = $2, updated_at = now() WHERE id = $1`, [
      id,
      `create failed: ${String(err?.message ?? err).slice(0, 500)}`,
    ]);
    throw new HttpError(502, "Payment gateway unavailable, try again later");
  }

  log.info({ invoiceId: id, userId: input.userId, amount, coin }, "invoice created");
  return (await getInvoice(deps, id, input.userId))!;
}

export async function getInvoice(deps: Deps, id: string, userId: number): Promise<InvoiceView | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const r = await deps.db.query(`${INVOICE_SELECT} WHERE i.id = $1 AND i.user_id = $2`, [id, userId]);
  return r.rowCount ? toView(r.rows[0], deps.config.INVOICE_EXPIRE_HOURS) : null;
}

export async function listInvoices(deps: Deps, userId: number, limit: number): Promise<InvoiceView[]> {
  const r = await deps.db.query(
    `${INVOICE_SELECT} WHERE i.user_id = $1 AND i.status <> 'creating' ORDER BY i.created_at DESC LIMIT $2`,
    [userId, limit],
  );
  return r.rows.map((row) => toView(row, deps.config.INVOICE_EXPIRE_HOURS));
}

// ---------- IPN ----------

export type IpnOutcome = "ignored_unknown_order" | "ignored_bad_payload" | "status_updated" | "credit_queued" | "already_credited" | "needs_review";

function nextInvoiceStatus(current: string, incoming: string): string {
  // Statuses can arrive out of order. Once finished, only a refund changes it.
  if (current === "finished" && incoming !== "refunded") return current;
  if (current === "refunded") return current;
  return incoming;
}

export async function handleIpn(deps: Deps, body: any): Promise<IpnOutcome> {
  const { db, config, nowpayments, log } = deps;
  const orderId = typeof body?.order_id === "string" ? body.order_id : null;
  const status = typeof body?.payment_status === "string" ? body.payment_status : null;
  const paymentId = body?.payment_id != null ? String(body.payment_id) : null;

  const record = (invoiceId: string | null, outcome: IpnOutcome) =>
    db.query(`INSERT INTO ipn_events (invoice_id, payment_id, status, payload, outcome) VALUES ($1, $2, $3, $4, $5)`, [
      invoiceId, paymentId, status, JSON.stringify(body), outcome,
    ]);

  if (!orderId || !status || !paymentId || !KNOWN_STATUSES.has(status) || !/^[0-9a-f-]{36}$/i.test(orderId)) {
    await record(null, "ignored_bad_payload");
    log.warn({ orderId, status, paymentId }, "IPN with unusable payload");
    return "ignored_bad_payload";
  }

  const known = await db.query(`SELECT 1 FROM invoices WHERE id = $1`, [orderId]);
  if (!known.rowCount) {
    await record(null, "ignored_unknown_order");
    log.warn({ orderId, paymentId }, "IPN for unknown order");
    return "ignored_unknown_order";
  }

  // Before crediting, confirm with NOWPayments directly. If this throws, the caller answers 5xx
  // and NOWPayments retries the IPN later.
  let verified = true;
  if (status === "finished") {
    const p = await nowpayments.getPayment(paymentId);
    verified = p.paymentStatus === "finished" && p.orderId === orderId;
  }

  const outcome = await withTx(db, async (c) => {
    const inv = await c.query(`SELECT * FROM invoices WHERE id = $1 FOR UPDATE`, [orderId]);
    if (!inv.rowCount) return { invoiceId: null, outcome: "ignored_unknown_order" as IpnOutcome };
    const invoice = inv.rows[0];

    await c.query(
      `UPDATE invoices SET status = $2, last_payment_id = $3, pay_amount = $4, actually_paid = $5, pay_currency = $6, updated_at = now()
        WHERE id = $1`,
      [
        invoice.id,
        nextInvoiceStatus(invoice.status, status),
        paymentId,
        numOrNull(body.pay_amount),
        numOrNull(body.actually_paid),
        typeof body.pay_currency === "string" ? body.pay_currency : null,
      ],
    );

    if (status !== "finished") return { invoiceId: invoice.id, outcome: "status_updated" as IpnOutcome };

    const priceOk =
      String(body.price_currency ?? "").toLowerCase() === "usd" &&
      Math.round(Number(body.price_amount) * 100) === Math.round(Number(invoice.amount_usd) * 100);
    if (!verified || !priceOk) {
      const note = !verified ? "finished IPN not confirmed by NOWPayments API" : `price mismatch: IPN ${body.price_amount} ${body.price_currency}`;
      await c.query(`UPDATE invoices SET review_note = $2, updated_at = now() WHERE id = $1`, [invoice.id, note]);
      return { invoiceId: invoice.id, outcome: "needs_review" as IpnOutcome };
    }

    const inserted = await queueCredit(c, {
      idemKey: `np:${paymentId}`,
      invoiceId: invoice.id,
      userId: invoice.user_id,
      amountUsd: Number(invoice.amount_usd),
      quotaPerUsd: config.QUOTA_PER_USD,
      note: `NOWPayments payment ${paymentId}`,
    });
    return { invoiceId: invoice.id, outcome: (inserted ? "credit_queued" : "already_credited") as IpnOutcome };
  });

  await record(outcome.invoiceId, outcome.outcome);
  log.info({ orderId, paymentId, status, outcome: outcome.outcome }, "IPN processed");
  if (outcome.outcome === "credit_queued" || outcome.outcome === "already_credited") {
    // Process right away; the sweeper picks it up if this fails.
    await processDueCredits(deps, outcome.invoiceId!);
  }
  return outcome.outcome;
}

function numOrNull(v: unknown): string | null {
  const n = Number(v);
  return v == null || !Number.isFinite(n) ? null : String(v);
}

// ---------- crediting ----------

async function queueCredit(
  c: pg.PoolClient,
  x: { idemKey: string; invoiceId: string; userId: number; amountUsd: number; quotaPerUsd: number; note: string },
): Promise<boolean> {
  const r = await c.query(
    `INSERT INTO credits (idem_key, invoice_id, user_id, amount_usd, quota, note)
     VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (idem_key) DO NOTHING`,
    [x.idemKey, x.invoiceId, x.userId, x.amountUsd.toFixed(2), usdToQuota(x.amountUsd, x.quotaPerUsd), x.note],
  );
  return r.rowCount === 1;
}

const MAX_ATTEMPTS = 10;
const INT32_MAX = 2147483647;

// Claims due credits one by one and calls New API. A credit is marked 'processing' in its own
// committed transaction before the call, so a crash mid-call leaves it 'processing' (later moved
// to 'unknown' for a human), never re-sent automatically. That is the guarantee against double credit.
export async function processDueCredits(deps: Deps, invoiceId?: string): Promise<number> {
  let processed = 0;
  for (;;) {
    const claimed = await withTx(deps.db, async (c) => {
      const r = await c.query(
        `SELECT * FROM credits
          WHERE state IN ('pending','failed') AND attempts < $1 AND next_attempt_at <= now()
            ${invoiceId ? "AND invoice_id = $2" : ""}
          ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED`,
        invoiceId ? [MAX_ATTEMPTS, invoiceId] : [MAX_ATTEMPTS],
      );
      if (!r.rowCount) return null;
      await c.query(`UPDATE credits SET state = 'processing', attempts = attempts + 1, updated_at = now() WHERE id = $1`, [r.rows[0].id]);
      return r.rows[0];
    });
    if (!claimed) return processed;
    processed++;
    await sendCredit(deps, claimed);
  }
}

async function sendCredit(deps: Deps, credit: any): Promise<void> {
  const { db, newapi, log } = deps;
  try {
    // users.quota is int32 in New API: an overflowing add fails there anyway. Check first and park the
    // credit for a human instead of burning retries (the customer can spend down, then admin retries).
    const user = await newapi.getUser(credit.user_id);
    if (!user) throw new Error(`New API user ${credit.user_id} not found`);
    if (user.quota + Number(credit.quota) > INT32_MAX) {
      await db.query(
        `UPDATE credits SET state = 'failed', attempts = $2, last_error = $3, updated_at = now() WHERE id = $1`,
        [credit.id, MAX_ATTEMPTS, `balance would exceed New API limit (quota ${user.quota} + ${credit.quota})`],
      );
      log.error({ creditId: credit.id, userId: credit.user_id }, "credit held: balance limit");
      return;
    }
    await newapi.addQuota(credit.user_id, Number(credit.quota));
    await db.query(`UPDATE credits SET state = 'done', last_error = NULL, done_at = now(), updated_at = now() WHERE id = $1`, [credit.id]);
    log.info({ creditId: credit.id, userId: credit.user_id, amountUsd: credit.amount_usd }, "balance credited");
  } catch (err: any) {
    const message = String(err?.message ?? err).slice(0, 1000);
    if (err instanceof NewApiAmbiguousError) {
      await db.query(`UPDATE credits SET state = 'unknown', last_error = $2, updated_at = now() WHERE id = $1`, [credit.id, message]);
      log.error({ creditId: credit.id, err: message }, "credit result unknown, needs manual check");
    } else {
      const attempts = Number(credit.attempts) + 1;
      const delaySec = Math.min(3600, 30 * 2 ** (attempts - 1));
      await db.query(
        `UPDATE credits SET state = 'failed', last_error = $2, next_attempt_at = now() + make_interval(secs => $3), updated_at = now() WHERE id = $1`,
        [credit.id, message, delaySec],
      );
      log.warn({ creditId: credit.id, attempts, err: message }, "credit failed, will retry");
    }
  }
}

// Called periodically: retries failed credits and flags credits stuck in 'processing' (crash mid-call).
export async function sweep(deps: Deps): Promise<void> {
  const stuck = await deps.db.query(
    `UPDATE credits SET state = 'unknown', last_error = coalesce(last_error, '') || ' [stuck in processing]', updated_at = now()
      WHERE state = 'processing' AND updated_at < now() - interval '5 minutes' RETURNING id`,
  );
  if (stuck.rowCount) deps.log.error({ ids: stuck.rows.map((r) => r.id) }, "credits stuck in processing marked unknown");
  await processDueCredits(deps);
}

// ---------- admin ----------

export async function listCredits(deps: Deps, state: string | undefined, limit: number) {
  const r = await deps.db.query(
    `SELECT c.*, i.status AS invoice_status FROM credits c JOIN invoices i ON i.id = c.invoice_id
      ${state ? "WHERE c.state = $2" : ""} ORDER BY c.id DESC LIMIT $1`,
    state ? [limit, state] : [limit],
  );
  return r.rows;
}

export async function listReviewInvoices(deps: Deps, limit: number) {
  const r = await deps.db.query(
    `${INVOICE_SELECT} WHERE i.review_note IS NOT NULL OR i.status = 'partially_paid' ORDER BY i.updated_at DESC LIMIT $1`,
    [limit],
  );
  return r.rows;
}

// Admin decided after checking New API logs: the credit did land ('mark_done') or did not ('retry').
export async function resolveCredit(deps: Deps, id: number, action: "mark_done" | "retry"): Promise<void> {
  const r = await deps.db.query(
    action === "mark_done"
      ? `UPDATE credits SET state = 'done', done_at = now(), updated_at = now() WHERE id = $1 AND state IN ('unknown','failed') RETURNING id`
      : `UPDATE credits SET state = 'pending', attempts = 0, next_attempt_at = now(), updated_at = now() WHERE id = $1 AND state IN ('unknown','failed') RETURNING id`,
    [id],
  );
  if (!r.rowCount) throw new HttpError(409, "Credit not found or not in unknown/failed state");
  if (action === "retry") await processDueCredits(deps);
}

// Manual credit for an invoice (e.g. customer underpaid and you accept the partial amount). One per invoice.
export async function manualCredit(deps: Deps, invoiceId: string, amountUsd: number, note: string): Promise<void> {
  const amount = Math.round(amountUsd * 100) / 100;
  if (!(amount > 0)) throw new HttpError(400, "amount_usd must be positive");
  const queued = await withTx(deps.db, async (c) => {
    const inv = await c.query(`SELECT * FROM invoices WHERE id = $1 FOR UPDATE`, [invoiceId]);
    if (!inv.rowCount) throw new HttpError(404, "Invoice not found");
    return queueCredit(c, {
      idemKey: `manual:${invoiceId}`,
      invoiceId,
      userId: inv.rows[0].user_id,
      amountUsd: amount,
      quotaPerUsd: deps.config.QUOTA_PER_USD,
      note: `manual: ${note}`.slice(0, 500),
    });
  });
  if (!queued) throw new HttpError(409, "This invoice already has a manual credit");
  await processDueCredits(deps, invoiceId);
}
