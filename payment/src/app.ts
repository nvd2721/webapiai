import { timingSafeEqual, createHash } from "node:crypto";
import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import { z } from "zod";
import { verifyIpnSignature } from "./nowpayments.js";
import {
  type Deps, HttpError, createInvoice, getInvoice, handleIpn, listCredits, listInvoices,
  listReviewInvoices, manualCredit, resolveCredit,
} from "./service.js";

function secretMatches(header: string | undefined, secret: string): boolean {
  const m = /^Bearer\s+(.+)$/i.exec(header ?? "");
  if (!m) return false;
  // Hash both sides so lengths match for timingSafeEqual.
  const a = createHash("sha256").update(m[1]).digest();
  const b = createHash("sha256").update(secret).digest();
  return timingSafeEqual(a, b);
}

const userId = z.coerce.number().int().positive();

export function buildApp(deps: Omit<Deps, "log">, opts: { logger?: boolean } = {}): FastifyInstance {
  const app = Fastify({ logger: opts.logger ?? true, bodyLimit: 64 * 1024, trustProxy: true });
  const d: Deps = { ...deps, log: app.log };

  app.setErrorHandler((err: any, _req, reply) => {
    if (err instanceof HttpError) return reply.code(err.status).send({ error: err.message });
    if (err instanceof z.ZodError) {
      return reply.code(400).send({ error: err.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ") });
    }
    if (err.statusCode && err.statusCode < 500) return reply.code(err.statusCode).send({ error: err.message });
    app.log.error({ err }, "unhandled error");
    return reply.code(500).send({ error: "Internal error" });
  });
  app.setNotFoundHandler((_req, reply) => reply.code(404).send({ error: "Not found" }));

  app.get("/healthz", async () => {
    await d.db.query("SELECT 1");
    return { ok: true };
  });

  // ----- called by the Next.js site, server-to-server -----
  app.register(async (site) => {
    site.addHook("onRequest", async (req: FastifyRequest, reply) => {
      if (!secretMatches(req.headers.authorization, d.config.PAYMENT_API_SECRET)) {
        return reply.code(401).send({ error: "Unauthorized" });
      }
    });

    site.post("/api/invoices", async (req, reply) => {
      const body = z
        .object({ user_id: userId, amount_usd: z.number().finite().positive(), coin: z.string().min(1).max(20) })
        .parse(req.body);
      const invoice = await createInvoice(d, { userId: body.user_id, amountUsd: body.amount_usd, coin: body.coin });
      return reply.code(201).send(invoice);
    });

    site.get("/api/invoices", async (req) => {
      const q = z.object({ user_id: userId, limit: z.coerce.number().int().min(1).max(100).default(20) }).parse(req.query);
      return { data: await listInvoices(d, q.user_id, q.limit) };
    });

    site.get("/api/invoices/:id", async (req) => {
      const q = z.object({ user_id: userId }).parse(req.query);
      const { id } = req.params as { id: string };
      const inv = await getInvoice(d, id, q.user_id);
      if (!inv) throw new HttpError(404, "Invoice not found");
      return inv;
    });
  });

  // ----- NOWPayments IPN -----
  app.post("/webhooks/nowpayments", async (req, reply) => {
    const sig = req.headers["x-nowpayments-sig"];
    if (!verifyIpnSignature(req.body, typeof sig === "string" ? sig : undefined, d.config.NOWPAYMENTS_IPN_SECRET)) {
      req.log.warn({ ip: req.ip }, "IPN rejected: bad signature");
      return reply.code(401).send({ error: "Bad signature" });
    }
    // Errors thrown here become 500, so NOWPayments retries the IPN.
    const outcome = await handleIpn(d, req.body);
    return { ok: true, outcome };
  });

  // ----- admin / reconciliation -----
  app.register(async (admin) => {
    admin.addHook("onRequest", async (req, reply) => {
      if (!secretMatches(req.headers.authorization, d.config.PAYMENT_ADMIN_SECRET)) {
        return reply.code(401).send({ error: "Unauthorized" });
      }
    });

    admin.get("/api/admin/credits", async (req) => {
      const q = z
        .object({
          state: z.enum(["pending", "processing", "done", "failed", "unknown"]).optional(),
          limit: z.coerce.number().int().min(1).max(500).default(100),
        })
        .parse(req.query);
      return { data: await listCredits(d, q.state, q.limit) };
    });

    admin.post("/api/admin/credits/:id/resolve", async (req) => {
      const id = z.coerce.number().int().positive().parse((req.params as any).id);
      const { action } = z.object({ action: z.enum(["mark_done", "retry"]) }).parse(req.body);
      await resolveCredit(d, id, action);
      return { ok: true };
    });

    admin.get("/api/admin/invoices/review", async (req) => {
      const q = z.object({ limit: z.coerce.number().int().min(1).max(500).default(100) }).parse(req.query);
      return { data: await listReviewInvoices(d, q.limit) };
    });

    admin.post("/api/admin/invoices/:id/manual-credit", async (req) => {
      const { id } = req.params as { id: string };
      const body = z.object({ amount_usd: z.number().finite().positive(), note: z.string().min(1).max(300) }).parse(req.body);
      await manualCredit(d, id, body.amount_usd, body.note);
      return { ok: true };
    });
  });

  return app;
}
