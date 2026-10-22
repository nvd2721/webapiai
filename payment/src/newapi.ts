// Client for the New API admin endpoints (calciumion/new-api v0.13.x).
// Auth: system access token of the root account in "Authorization", plus "New-Api-User: <admin id>".

export interface NewApiUser {
  id: number;
  status: number; // 1 = enabled, 2 = disabled
  quota: number;
}

export interface NewApiClient {
  getUser(userId: number): Promise<NewApiUser | null>;
  addQuota(userId: number, quota: number): Promise<void>;
}

// The call certainly did not change the balance: safe to retry.
export class NewApiDefiniteError extends Error {}
// We cannot tell whether the balance changed (timeout, 5xx, broken response): never retry automatically.
export class NewApiAmbiguousError extends Error {}

export function createNewApiClient(opts: { baseUrl: string; adminToken: string; adminUserId: number; timeoutMs?: number }): NewApiClient {
  const base = opts.baseUrl.replace(/\/+$/, "");
  const timeoutMs = opts.timeoutMs ?? 15000;
  const headers = {
    Authorization: opts.adminToken,
    "New-Api-User": String(opts.adminUserId),
    "content-type": "application/json",
  };

  return {
    async getUser(userId) {
      const res = await fetch(`${base}/api/user/${userId}`, { headers, signal: AbortSignal.timeout(timeoutMs) });
      if (res.status === 404) return null;
      if (res.status === 401 || res.status === 403) throw new Error(`New API auth failed (${res.status})`);
      if (!res.ok) throw new Error(`New API GET user -> ${res.status}`);
      const json: any = await res.json();
      if (json?.success === true) {
        if (!json.data?.id) return null;
        return { id: Number(json.data.id), status: Number(json.data.status), quota: Number(json.data.quota ?? 0) };
      }
      // v0.13 answers 200 {success:false} for a missing user, and for auth problems.
      const msg = String(json?.message ?? "");
      if (/unauthori|token|权限|permission/i.test(msg)) throw new Error(`New API auth failed: ${msg}`);
      return null;
    },

    async addQuota(userId, quota) {
      if (!Number.isSafeInteger(quota) || quota <= 0) throw new NewApiDefiniteError(`invalid quota ${quota}`);
      let res: Response;
      try {
        res = await fetch(`${base}/api/user/manage`, {
          method: "POST",
          headers,
          body: JSON.stringify({ id: userId, action: "add_quota", mode: "add", value: quota }),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (err: any) {
        // Connection never established: the request did not reach New API.
        const code = err?.cause?.code;
        if (code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "EAI_AGAIN") {
          throw new NewApiDefiniteError(`New API unreachable (${code})`);
        }
        throw new NewApiAmbiguousError(`New API request failed: ${err?.message ?? err}`);
      }
      if (res.status >= 500) throw new NewApiAmbiguousError(`New API -> ${res.status}`);
      let json: any;
      try {
        json = await res.json();
      } catch {
        throw new NewApiAmbiguousError(`New API -> ${res.status}, body is not JSON`);
      }
      if (res.status >= 400) throw new NewApiDefiniteError(`New API -> ${res.status}: ${json?.message ?? ""}`);
      if (json?.success !== true) throw new NewApiDefiniteError(`New API refused: ${json?.message ?? "unknown"}`);
    },
  };
}
