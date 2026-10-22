import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createNewApiClient, NewApiAmbiguousError, NewApiDefiniteError } from "../src/newapi.js";

// Mimics calciumion/new-api v0.13.2: HTTP 200 with {success:false} on errors.
let server: http.Server;
let base = "";
const seen: any[] = [];
let mode: "ok" | "refuse" | "500" | "hang" = "ok";

beforeAll(async () => {
  server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      seen.push({ url: req.url, headers: req.headers, body: body ? JSON.parse(body) : null });
      if (req.headers.authorization !== "root-token" || req.headers["new-api-user"] !== "1") {
        res.writeHead(401).end(JSON.stringify({ success: false, message: "无权进行此操作，access token 无效" }));
        return;
      }
      if (req.url === "/api/user/42") return res.end(JSON.stringify({ success: true, data: { id: 42, username: "a", status: 1, quota: 0 } }));
      if (req.url?.startsWith("/api/user/") && req.method === "GET") return res.end(JSON.stringify({ success: false, message: "record not found" }));
      if (mode === "hang") return;
      if (mode === "500") return res.writeHead(500).end("oops");
      if (mode === "refuse") return res.end(JSON.stringify({ success: false, message: "用户不存在" }));
      res.end(JSON.stringify({ success: true, message: "" }));
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => {
  server.closeAllConnections();
  server.close();
});

describe("New API client", () => {
  const client = () => createNewApiClient({ baseUrl: base, adminToken: "root-token", adminUserId: 1, timeoutMs: 300 });

  it("sends the v0.13 headers and add_quota body", async () => {
    mode = "ok";
    await client().addQuota(42, 5_000_000);
    const last = seen.at(-1);
    expect(last.url).toBe("/api/user/manage");
    expect(last.headers.authorization).toBe("root-token");
    expect(last.headers["new-api-user"]).toBe("1");
    expect(last.body).toEqual({ id: 42, action: "add_quota", mode: "add", value: 5_000_000 });
  });

  it("looks users up", async () => {
    expect(await client().getUser(42)).toEqual({ id: 42, status: 1, quota: 0 });
    expect(await client().getUser(7)).toBeNull();
    const bad = createNewApiClient({ baseUrl: base, adminToken: "wrong", adminUserId: 1 });
    await expect(bad.getUser(42)).rejects.toThrow(/auth/);
  });

  it("classifies failures", async () => {
    mode = "refuse";
    await expect(client().addQuota(42, 1)).rejects.toBeInstanceOf(NewApiDefiniteError);
    mode = "500";
    await expect(client().addQuota(42, 1)).rejects.toBeInstanceOf(NewApiAmbiguousError);
    mode = "hang";
    await expect(client().addQuota(42, 1)).rejects.toBeInstanceOf(NewApiAmbiguousError);
    const down = createNewApiClient({ baseUrl: "http://127.0.0.1:59999", adminToken: "x", adminUserId: 1 });
    await expect(down.addQuota(42, 1)).rejects.toBeInstanceOf(NewApiDefiniteError);
  });
});
