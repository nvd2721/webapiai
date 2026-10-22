import { z } from "zod";

const coinLimit = z.object({ min: z.number().positive(), max: z.number().positive() });

const schema = z.object({
  PORT: z.coerce.number().int().default(8080),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z.string().min(1),

  // Secret shared with the Next.js site (server-to-server calls only).
  PAYMENT_API_SECRET: z.string().min(24),
  // Separate secret for /api/admin/* (reconciliation tools).
  PAYMENT_ADMIN_SECRET: z.string().min(24),

  BRAND_NAME: z.string().min(1).default("Aura"),
  SITE_URL: z.string().url(),
  // Public URL of this service, used to build the IPN callback URL.
  PUBLIC_URL: z.string().url(),

  NOWPAYMENTS_API_KEY: z.string().min(1),
  NOWPAYMENTS_IPN_SECRET: z.string().min(1),
  NOWPAYMENTS_SANDBOX: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
  // Customer pays the gateway fee on top of the invoice amount.
  NOWPAYMENTS_FEE_PAID_BY_USER: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),

  NEWAPI_INTERNAL_URL: z.string().url(),
  NEWAPI_ADMIN_TOKEN: z.string().min(1),
  NEWAPI_ADMIN_USER_ID: z.coerce.number().int().positive(),
  QUOTA_PER_USD: z.coerce.number().int().positive().default(500000),

  // JSON map coin -> {min,max} in USD. Coin codes are NOWPayments tickers.
  COIN_LIMITS: z
    .string()
    .default('{"usdttrc20":{"min":5,"max":4000},"usdtbsc":{"min":5,"max":4000},"btc":{"min":20,"max":4000}}')
    .transform((s) => z.record(coinLimit).parse(JSON.parse(s))),
  // New API keeps users.quota in a 32-bit integer (max 2147483647 ≈ 4294 USD). Stay below it.
  MAX_BALANCE_QUOTA: z.coerce.number().int().positive().max(2147483647).default(2_000_000_000),
  MAX_OPEN_INVOICES_PER_USER: z.coerce.number().int().positive().default(10),
  // A waiting invoice with no payment is shown as expired after this many hours.
  INVOICE_EXPIRE_HOURS: z.coerce.number().positive().default(24),
});

export type Config = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  // The gateway compose file passes PAYMENTS_DATABASE_URL.
  const parsed = schema.safeParse({ DATABASE_URL: env.PAYMENTS_DATABASE_URL, ...env });
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid configuration:\n${issues}`);
  }
  return parsed.data;
}
