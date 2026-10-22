import "server-only";
import { headers } from "next/headers";
import { isDemo } from "./site";
import { mockHandle } from "./mock";
import type { Session } from "./session";
import type {
  ApiEnvelope,
  ApiToken,
  CreateTokenInput,
  LogEntry,
  LogStat,
  LoginUser,
  NewApiUser,
  Page,
  PricingResponse,
  QuotaData,
} from "./newapi-types";

// Server-side client for New API v0.13.x. The browser never calls New API directly:
// every call goes through here with the visitor's New API session cookie, the
// New-Api-User header, and the visitor's real IP (New API rate-limits per IP).

const BASE = (process.env.NEWAPI_URL || "").replace(/\/$/, "");

export class NewApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export class UnauthorizedError extends NewApiError {
  constructor(message = "Phiên đăng nhập đã hết hạn") {
    super(message, 401);
  }
}

// New API answers in English (or Chinese); show Vietnamese for the common cases.
const MESSAGES: [RegExp, string][] = [
  [/username or password is incorrect|用户名或密码错误/i, "Sai tên đăng nhập hoặc mật khẩu, hoặc tài khoản đã bị khóa."],
  [/username already exists|用户名已存在/i, "Tên đăng nhập đã có người dùng."],
  [/'Username' failed on the 'max'/i, "Tên đăng nhập tối đa 20 ký tự."],
  [/'Password' failed on the 'min'/i, "Mật khẩu cần ít nhất 8 ký tự."],
  [/'Password' failed on the 'max'/i, "Mật khẩu tối đa 20 ký tự."],
  [/registration.*(disabled|closed)|注册.*关闭/i, "Hệ thống đang tạm đóng đăng ký."],
  [/too many requests|请求过于频繁|rate limit/i, "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút."],
  [/record not found/i, "Không tìm thấy dữ liệu."],
  [/time span.*month|时间跨度/i, "Khoảng thời gian tối đa là 1 tháng."],
  [/verification code|验证码/i, "Mã xác minh email không đúng hoặc đã hết hạn."],
  [/turnstile/i, "Không qua được bước kiểm tra chống bot."],
  [/name.*too long|名称过长/i, "Tên key quá dài."],
];

export function translateMessage(msg: string): string {
  for (const [re, vi] of MESSAGES) if (re.test(msg)) return vi;
  return msg || "Có lỗi xảy ra, vui lòng thử lại.";
}

async function clientIp(): Promise<string | null> {
  try {
    const h = await headers();
    const xff = h.get("x-forwarded-for");
    if (xff) return xff.split(",")[0].trim();
    return h.get("x-real-ip") || h.get("cf-connecting-ip");
  } catch {
    return null; // outside a request (build time)
  }
}

type CallOpts = {
  method?: string;
  body?: unknown;
  session?: Session | null;
  revalidate?: number | false;
};

type Raw<T> = { envelope: ApiEnvelope<T>; setCookie?: string };

async function call<T>(path: string, opts: CallOpts = {}): Promise<Raw<T>> {
  const method = opts.method || "GET";

  if (isDemo) {
    const r = mockHandle(method, path, opts.body, opts.session?.nc, opts.session?.uid);
    if (r.status === 401) throw new UnauthorizedError();
    const env = r.body as ApiEnvelope<T>;
    if (r.status >= 400 && !env.message) throw new NewApiError(`HTTP ${r.status}`, r.status);
    return { envelope: env, setCookie: r.setCookie };
  }

  const h: Record<string, string> = { Accept: "application/json", "Accept-Language": "en" };
  if (opts.body !== undefined) h["Content-Type"] = "application/json";
  if (opts.session) {
    h["Cookie"] = `session=${opts.session.nc}`;
    h["New-Api-User"] = String(opts.session.uid);
  }
  const ip = await clientIp();
  if (ip) h["X-Forwarded-For"] = ip;

  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: h,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      ...(opts.revalidate === undefined || opts.session
        ? { cache: "no-store" as const }
        : { next: { revalidate: opts.revalidate } }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e) {
    console.error("[newapi] network error", path, e);
    throw new NewApiError("Không kết nối được tới máy chủ API, vui lòng thử lại.", 503);
  }

  if (res.status === 401) throw new UnauthorizedError();
  if (res.status === 429) throw new NewApiError(translateMessage("too many requests"), 429);

  let envelope: ApiEnvelope<T>;
  try {
    envelope = (await res.json()) as ApiEnvelope<T>;
  } catch {
    throw new NewApiError(`Máy chủ API trả về lỗi (HTTP ${res.status}).`, res.status);
  }

  let setCookie: string | undefined;
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const m = c.match(/^session=([^;]+)/);
    if (m) setCookie = m[1];
  }
  return { envelope, setCookie };
}

/** Calls an endpoint and unwraps {success, data}; throws NewApiError on success=false. */
async function get<T>(path: string, opts: CallOpts = {}): Promise<T> {
  const { envelope } = await call<T>(path, opts);
  if (!envelope.success) throw new NewApiError(translateMessage(envelope.message));
  return envelope.data;
}

// Older New API builds return a bare array instead of a Page object.
function asPage<T>(data: Page<T> | T[] | null): Page<T> {
  if (!data) return { page: 1, page_size: 0, total: 0, items: [] };
  if (Array.isArray(data)) return { page: 1, page_size: data.length, total: data.length, items: data };
  return { ...data, items: data.items || [] };
}

// ---------- Public ----------

export async function getPricing(): Promise<PricingResponse> {
  if (isDemo) return mockHandle("GET", "/api/pricing", undefined).body as PricingResponse;
  const { envelope } = await call<PricingResponse["data"]>("/api/pricing", { revalidate: 300 });
  return envelope as unknown as PricingResponse;
}

// ---------- Auth ----------

export async function login(username: string, password: string): Promise<{ user: LoginUser; nc: string }> {
  const { envelope, setCookie } = await call<LoginUser & { require_2fa?: boolean }>("/api/user/login", {
    method: "POST",
    body: { username, password },
  });
  if (!envelope.success) throw new NewApiError(translateMessage(envelope.message));
  if (envelope.data?.require_2fa) {
    throw new NewApiError("Tài khoản này bật xác thực 2 bước, vui lòng đăng nhập ở trang quản trị.");
  }
  if (!setCookie) throw new NewApiError("Máy chủ API không trả về phiên đăng nhập.", 502);
  return { user: envelope.data, nc: setCookie };
}

export async function register(input: { username: string; password: string; email?: string; aff_code?: string }) {
  await get<null>("/api/user/register", { method: "POST", body: input });
}

export async function logout(session: Session) {
  try {
    await call("/api/user/logout", { session });
  } catch {
    // Session may already be gone on New API's side; we drop ours anyway.
  }
}

// ---------- Account ----------

export function getSelf(session: Session) {
  return get<NewApiUser>("/api/user/self", { session });
}

// ---------- API keys ----------

export async function listTokens(session: Session, page = 1, size = 50) {
  return asPage(await get<Page<ApiToken> | ApiToken[]>(`/api/token/?p=${page}&page_size=${size}&size=${size}`, { session }));
}

export async function createToken(session: Session, input: CreateTokenInput) {
  await get<null>("/api/token/", { method: "POST", body: input, session });
}

/** Full key with the "sk-" prefix. */
export async function revealTokenKey(session: Session, id: number): Promise<string> {
  const data = await get<{ key: string }>(`/api/token/${id}/key`, { method: "POST", session });
  return data.key.startsWith("sk-") ? data.key : `sk-${data.key}`;
}

export async function setTokenStatus(session: Session, id: number, status: 1 | 2) {
  await get<ApiToken>("/api/token/?status_only=true", { method: "PUT", body: { id, status }, session });
}

export async function deleteToken(session: Session, id: number) {
  await get<null>(`/api/token/${id}`, { method: "DELETE", session });
}

// ---------- Usage ----------

export type LogQuery = {
  page?: number;
  size?: number;
  type?: number;
  model?: string;
  token?: string;
  start?: number;
  end?: number;
};

function logParams(q: LogQuery) {
  const p = new URLSearchParams({
    p: String(q.page || 1),
    page_size: String(q.size || 20),
    type: String(q.type || 0),
    model_name: q.model || "",
    token_name: q.token || "",
    start_timestamp: q.start ? String(q.start) : "",
    end_timestamp: q.end ? String(q.end) : "",
  });
  return p.toString();
}

export async function listLogs(session: Session, q: LogQuery = {}) {
  return asPage(await get<Page<LogEntry> | LogEntry[]>(`/api/log/self?${logParams(q)}`, { session }));
}

export function logStat(session: Session, q: LogQuery = {}) {
  return get<LogStat>(`/api/log/self/stat?${logParams(q)}`, { session });
}

/** Hourly usage buckets. New API limits the span to one month. */
export async function usageData(session: Session, start: number, end: number) {
  return (await get<QuotaData[] | null>(`/api/data/self?start_timestamp=${start}&end_timestamp=${end}`, { session })) || [];
}
