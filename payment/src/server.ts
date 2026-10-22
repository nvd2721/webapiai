import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createPool, migrate } from "./db.js";
import { createNewApiClient } from "./newapi.js";
import { createNowPaymentsClient } from "./nowpayments.js";
import { sweep } from "./service.js";

const config = loadConfig();
const db = createPool(config.DATABASE_URL);
await migrate(db);

const deps = {
  db,
  config,
  nowpayments: createNowPaymentsClient({ apiKey: config.NOWPAYMENTS_API_KEY, sandbox: config.NOWPAYMENTS_SANDBOX }),
  newapi: createNewApiClient({
    baseUrl: config.NEWAPI_INTERNAL_URL,
    adminToken: config.NEWAPI_ADMIN_TOKEN,
    adminUserId: config.NEWAPI_ADMIN_USER_ID,
  }),
};
const app = buildApp(deps);

let sweeping = false;
const timer = setInterval(async () => {
  if (sweeping) return;
  sweeping = true;
  try {
    await sweep({ ...deps, log: app.log });
  } catch (err) {
    app.log.error({ err }, "sweep failed");
  } finally {
    sweeping = false;
  }
}, 60_000);

const shutdown = async () => {
  clearInterval(timer);
  await app.close();
  await db.end();
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

await app.listen({ port: config.PORT, host: config.HOST });
