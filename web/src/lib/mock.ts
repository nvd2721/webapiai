import "server-only";
import type { ApiToken, LogEntry, PricingItem, PricingResponse, QuotaData } from "./newapi-types";
import { QUOTA_PER_UNIT } from "./format";

// In-memory stand-in for New API, used when NEWAPI_URL is not set ("demo mode").
// Lets the site run with `npm run dev` before the gateway exists. Data resets on restart.

type MockUser = {
  id: number;
  username: string;
  password: string;
  email: string;
  quota: number;
  used_quota: number;
  request_count: number;
  group: string;
  aff_code: string;
};

type Store = { users: MockUser[]; tokens: ApiToken[]; fullKeys: Record<number, string>; logs: LogEntry[]; seq: number };

const VENDORS = [
  { id: 1, name: "OpenAI" },
  { id: 2, name: "Anthropic" },
  { id: 3, name: "Google" },
  { id: 4, name: "DeepSeek" },
  { id: 5, name: "Alibaba" },
  { id: 6, name: "Zhipu" },
  { id: 7, name: "Moonshot" },
  { id: 8, name: "xAI" },
];

// [model, vendor_id, model_ratio, completion_ratio, cache_ratio?] — ratio 1 = $2 per 1M input tokens
const CATALOG: [string, number, number, number, number?][] = [
  ["gpt-5", 1, 0.625, 8, 0.1],
  ["gpt-5-mini", 1, 0.125, 8, 0.1],
  ["gpt-4.1", 1, 1, 4, 0.25],
  ["gpt-4o-mini", 1, 0.075, 4, 0.5],
  ["o4-mini", 1, 0.55, 4, 0.25],
  ["text-embedding-3-small", 1, 0.01, 1],
  ["text-embedding-3-large", 1, 0.065, 1],
  ["claude-opus-4-5", 2, 2.5, 5, 0.1],
  ["claude-sonnet-4-5", 2, 1.5, 5, 0.1],
  ["claude-haiku-4-5", 2, 0.5, 5, 0.1],
  ["gemini-2.5-pro", 3, 0.625, 8, 0.25],
  ["gemini-2.5-flash", 3, 0.15, 8.333, 0.25],
  ["deepseek-chat", 4, 0.135, 4, 0.25],
  ["deepseek-reasoner", 4, 0.275, 4, 0.25],
  ["qwen3-max", 5, 0.6, 5],
  ["qwen-plus", 5, 0.2, 3],
  ["glm-4.6", 6, 0.3, 3.667],
  ["kimi-k2", 7, 0.3, 4.167],
  ["grok-4", 8, 1.5, 5],
];

export function mockPricing(): PricingResponse {
  const data: PricingItem[] = CATALOG.map(([model_name, vendor_id, model_ratio, completion_ratio, cache_ratio]) => ({
    model_name,
    vendor_id,
    quota_type: 0,
    model_ratio,
    model_price: 0,
    completion_ratio,
    cache_ratio,
    enable_groups: ["default"],
    supported_endpoint_types: model_name.startsWith("claude") ? ["openai", "anthropic"] : ["openai"],
  }));
  data.push({
    model_name: "gpt-image-1",
    vendor_id: 1,
    quota_type: 1,
    model_ratio: 0,
    model_price: 0.04,
    completion_ratio: 1,
    enable_groups: ["default"],
    supported_endpoint_types: ["image-generation"],
  });
  return { success: true, data, group_ratio: { default: 1 }, usable_group: { default: "Mặc định" }, vendors: VENDORS };
}

function randKey(len = 48) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function mask(k: string) {
  return `${k.slice(0, 4)}**********${k.slice(-4)}`;
}

function seed(): Store {
  const now = Math.floor(Date.now() / 1000);
  const store: Store = { users: [], tokens: [], fullKeys: {}, logs: [], seq: 100 };
  store.users.push({
    id: 1,
    username: "demo",
    password: "demo1234",
    email: "demo@example.com",
    quota: Math.round(12.5 * QUOTA_PER_UNIT),
    used_quota: 0,
    request_count: 0,
    group: "default",
    aff_code: "DEMO",
  });
  for (const [id, name] of [
    [1, "Claude Code"],
    [2, "Backend chatbot"],
  ] as const) {
    const k = randKey();
    store.fullKeys[id] = k;
    store.tokens.push({
      id,
      user_id: 1,
      key: mask(k),
      status: 1,
      name,
      created_time: now - 86400 * (10 - id),
      accessed_time: now - 3600 * id,
      expired_time: -1,
      remain_quota: id === 2 ? 5 * QUOTA_PER_UNIT : 0,
      unlimited_quota: id === 1,
      model_limits_enabled: false,
      model_limits: "",
      allow_ips: "",
      used_quota: 0,
      group: "",
    });
  }
  // A week of fake usage.
  const pricing = mockPricing().data.filter((p) => p.quota_type === 0 && !p.model_name.includes("embedding"));
  const pick = ["claude-sonnet-4-5", "claude-haiku-4-5", "gpt-5-mini", "deepseek-chat", "gemini-2.5-flash"];
  let r = 42;
  const rnd = () => ((r = (r * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  for (let i = 0; i < 160; i++) {
    const model = pick[Math.floor(rnd() * pick.length)];
    const p = pricing.find((x) => x.model_name === model)!;
    const prompt = Math.floor(800 + rnd() * 20000);
    const completion = Math.floor(100 + rnd() * 2500);
    const quota = Math.round((prompt + completion * p.completion_ratio) * p.model_ratio);
    const tok = rnd() > 0.35 ? store.tokens[0] : store.tokens[1];
    store.logs.push({
      id: i + 1,
      created_at: now - Math.floor(rnd() * 7 * 86400),
      type: 2,
      content: "",
      token_name: tok.name,
      model_name: model,
      quota,
      prompt_tokens: prompt,
      completion_tokens: completion,
      use_time: Math.floor(1 + rnd() * 20),
      is_stream: rnd() > 0.3,
    });
    tok.used_quota += quota;
    store.users[0].used_quota += quota;
    store.users[0].request_count += 1;
  }
  store.logs.push({
    id: 999,
    created_at: now - 6 * 86400,
    type: 1,
    content: "Nạp 20 USD qua USDT TRC20",
    token_name: "",
    model_name: "",
    quota: 20 * QUOTA_PER_UNIT,
    prompt_tokens: 0,
    completion_tokens: 0,
    use_time: 0,
    is_stream: false,
  });
  store.logs.sort((a, b) => b.created_at - a.created_at);
  return store;
}

const g = globalThis as unknown as { __auraMock?: Store };
function db(): Store {
  if (!g.__auraMock) g.__auraMock = seed();
  return g.__auraMock;
}

type Result = { status: number; body: unknown; setCookie?: string };
const ok = (data?: unknown): Result => ({ status: 200, body: { success: true, message: "", data } });
const fail = (message: string, status = 200): Result => ({ status, body: { success: false, message } });

function publicUser(u: MockUser) {
  return {
    id: u.id,
    username: u.username,
    display_name: u.username,
    email: u.email,
    role: 1,
    status: 1,
    group: u.group,
    quota: u.quota,
    used_quota: u.used_quota,
    request_count: u.request_count,
    aff_code: u.aff_code,
    aff_count: 0,
    aff_quota: 0,
  };
}

export function mockHandle(method: string, path: string, body: unknown, sessionCookie?: string, uidHeader?: number): Result {
  const s = db();
  const url = new URL(path, "http://mock");
  const p = url.pathname.replace(/\/$/, "");
  const q = url.searchParams;
  const b = (body || {}) as Record<string, unknown>;

  if (p === "/api/status") return ok({ quota_per_unit: QUOTA_PER_UNIT, system_name: "Demo" });
  if (p === "/api/pricing") return { status: 200, body: mockPricing() };

  if (p === "/api/user/login" && method === "POST") {
    const u = s.users.find((x) => x.username === b.username && x.password === b.password);
    if (!u) return fail("Username or password is incorrect, or user has been banned");
    return { ...ok({ id: u.id, username: u.username, display_name: u.username, role: 1, status: 1, group: u.group }), setCookie: `mock-${u.id}` };
  }
  if (p === "/api/user/register" && method === "POST") {
    if (s.users.some((x) => x.username === b.username)) return fail("Username already exists or has been deleted");
    s.users.push({
      id: s.users.length + 1,
      username: String(b.username),
      password: String(b.password),
      email: String(b.email || ""),
      quota: 0,
      used_quota: 0,
      request_count: 0,
      group: "default",
      aff_code: randKey(4),
    });
    return ok();
  }

  // Everything below needs a session.
  const uid = sessionCookie?.startsWith("mock-") ? Number(sessionCookie.slice(5)) : 0;
  const user = s.users.find((x) => x.id === uid);
  if (!user) return fail("Unauthorized, not logged in and no access token provided", 401);
  if (uidHeader !== uid) return fail("Unauthorized, New-Api-User does not match logged in user", 401);

  if (p === "/api/user/logout") return ok();
  if (p === "/api/user/self") return ok(publicUser(user));

  if (p === "/api/token" && method === "GET") {
    const items = s.tokens.filter((t) => t.user_id === uid).sort((a, b) => b.id - a.id);
    const page = Number(q.get("p") || 1);
    const size = Number(q.get("size") || 20);
    return ok({ page, page_size: size, total: items.length, items: items.slice((page - 1) * size, page * size) });
  }
  if (p === "/api/token" && method === "POST") {
    const k = randKey();
    const id = ++s.seq;
    s.fullKeys[id] = k;
    s.tokens.push({
      id,
      user_id: uid,
      key: mask(k),
      status: 1,
      name: String(b.name || ""),
      created_time: Math.floor(Date.now() / 1000),
      accessed_time: Math.floor(Date.now() / 1000),
      expired_time: Number(b.expired_time ?? -1),
      remain_quota: Number(b.remain_quota || 0),
      unlimited_quota: Boolean(b.unlimited_quota),
      model_limits_enabled: Boolean(b.model_limits_enabled),
      model_limits: String(b.model_limits || ""),
      allow_ips: String(b.allow_ips || ""),
      used_quota: 0,
      group: String(b.group || ""),
    });
    return ok();
  }
  if (p === "/api/token" && method === "PUT") {
    const t = s.tokens.find((x) => x.id === Number(b.id) && x.user_id === uid);
    if (!t) return fail("record not found");
    if (q.get("status_only")) t.status = Number(b.status);
    else Object.assign(t, b, { id: t.id, user_id: uid, key: t.key });
    return ok(t);
  }
  const keyMatch = p.match(/^\/api\/token\/(\d+)\/key$/);
  if (keyMatch && method === "POST") {
    const t = s.tokens.find((x) => x.id === Number(keyMatch[1]) && x.user_id === uid);
    if (!t) return fail("record not found");
    return ok({ key: s.fullKeys[t.id] });
  }
  const delMatch = p.match(/^\/api\/token\/(\d+)$/);
  if (delMatch && method === "DELETE") {
    const i = s.tokens.findIndex((x) => x.id === Number(delMatch[1]) && x.user_id === uid);
    if (i < 0) return fail("record not found");
    s.tokens.splice(i, 1);
    return ok();
  }

  const myLogs = () => {
    const type = Number(q.get("type") || 0);
    const start = Number(q.get("start_timestamp") || 0);
    const end = Number(q.get("end_timestamp") || 0);
    const model = q.get("model_name") || "";
    const token = q.get("token_name") || "";
    return (uid === 1 ? s.logs : []).filter(
      (l) =>
        (!type || l.type === type) &&
        (!start || l.created_at >= start) &&
        (!end || l.created_at <= end) &&
        (!model || l.model_name.includes(model)) &&
        (!token || l.token_name === token),
    );
  };
  if (p === "/api/log/self") {
    const items = myLogs();
    const page = Number(q.get("p") || 1);
    const size = Number(q.get("page_size") || 20);
    return ok({ page, page_size: size, total: items.length, items: items.slice((page - 1) * size, page * size) });
  }
  if (p === "/api/log/self/stat") {
    return ok({ quota: myLogs().filter((l) => l.type === 2).reduce((a, l) => a + l.quota, 0), rpm: 0, tpm: 0 });
  }
  if (p === "/api/data/self") {
    const start = Number(q.get("start_timestamp") || 0);
    const end = Number(q.get("end_timestamp") || Infinity);
    const buckets = new Map<string, QuotaData>();
    for (const l of uid === 1 ? s.logs : []) {
      if (l.type !== 2 || l.created_at < start || l.created_at > end) continue;
      const hour = l.created_at - (l.created_at % 3600);
      const key = `${l.model_name}|${hour}`;
      const bkt = buckets.get(key) || { model_name: l.model_name, created_at: hour, count: 0, quota: 0, token_used: 0 };
      bkt.count += 1;
      bkt.quota += l.quota;
      bkt.token_used += l.prompt_tokens + l.completion_tokens;
      buckets.set(key, bkt);
    }
    return ok([...buckets.values()]);
  }

  return fail(`Mock: ${method} ${p} not implemented`, 404);
}

export function mockAddCredit(uid: number, usd: number) {
  const u = db().users.find((x) => x.id === uid);
  if (u) u.quota += Math.round(usd * QUOTA_PER_UNIT);
}
