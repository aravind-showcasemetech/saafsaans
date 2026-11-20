import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/server/app.js";
import { planCache } from "../../src/server/cache.js";
import { loadConfig } from "../../src/server/config.js";
import { demoHouseholds } from "../../src/server/demo/households.js";
import {
  CONTENT_SECURITY_POLICY,
  SECURITY_HEADERS,
  clientIp,
  createRateLimiter,
} from "../../src/server/security.js";

const profile = {
  ...demoHouseholds["the-reddys"].profile,
  members: demoHouseholds["the-reddys"].profile.members.map((m, i) => ({
    ...m,
    id: `m${i + 1}`,
    nickname: undefined,
  })),
};

function appWith(env: Record<string, string>) {
  return createApp({ config: loadConfig({ DEMO: "1", ...env }), gemini: null });
}

describe("security headers", () => {
  it("sets every header on API, health, static and error responses", async () => {
    const app = appWith({});
    for (const path of ["/healthz", "/api/healthz", "/api/air?lat=999&lng=1", "/no-such-page"]) {
      const res = await app.request(path);
      for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
        expect(res.headers.get(name), `${name} on ${path}`).toBe(value);
      }
    }
  });

  it("uses the exact CSP from the brief and a two year HSTS", () => {
    expect(CONTENT_SECURITY_POLICY).toBe(
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
    );
    expect(SECURITY_HEADERS["Strict-Transport-Security"]).toContain("max-age=63072000");
  });

  it("marks API answers no-store and adds a request id", async () => {
    const res = await appWith({}).request("/api/healthz");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("X-Request-Id")).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("client IP", () => {
  it("ignores X-Forwarded-For when no proxy is trusted", () => {
    expect(clientIp("1.1.1.1", 0, "9.9.9.9")).toBe("9.9.9.9");
  });

  it("takes the entry added by the trusted proxy, not one the client wrote", () => {
    // The client sent "6.6.6.6"; Cloud Run appended the real address "2.2.2.2".
    expect(clientIp("6.6.6.6, 2.2.2.2", 1, "10.0.0.1")).toBe("2.2.2.2");
    expect(clientIp("6.6.6.6, 2.2.2.2, 10.0.0.5", 2, "10.0.0.1")).toBe("2.2.2.2");
  });

  it("falls back to the socket when the header is short or missing", () => {
    expect(clientIp(undefined, 1, "10.0.0.1")).toBe("10.0.0.1");
    expect(clientIp("2.2.2.2", 3, undefined)).toBe("unknown");
  });
});

describe("rate limits", () => {
  it("allows the limit within a minute, then gives the seconds to wait", () => {
    const limiter = createRateLimiter(2);
    expect(limiter.hit("a", 0)).toBe(0);
    expect(limiter.hit("a", 1000)).toBe(0);
    expect(limiter.hit("a", 2000)).toBe(58);
    expect(limiter.hit("b", 2000)).toBe(0);
    expect(limiter.hit("a", 60_001)).toBe(0);
  });

  it("returns 429 with Retry-After on /api once a client passes the API limit", async () => {
    const app = appWith({ RATE_LIMIT_API_PER_MINUTE: "3", TRUSTED_PROXIES: "1" });
    const get = (ip: string) => app.request("/api/healthz", { headers: { "X-Forwarded-For": ip } });
    for (let i = 0; i < 3; i++) expect((await get("2.2.2.2")).status).toBe(200);
    const blocked = await get("2.2.2.2");
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(blocked.headers.get("Content-Security-Policy")).toBe(CONTENT_SECURITY_POLICY);
    // Another client is not affected.
    expect((await get("3.3.3.3")).status).toBe(200);
  });

  it("limits /api/plan more tightly than the rest of /api", async () => {
    planCache.clear();
    const app = appWith({ RATE_LIMIT_AI_PER_MINUTE: "2" });
    const post = () =>
      app.request("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, lat: 17.48, lng: 78.41, lang: "en" }),
      });
    expect((await post()).status).toBe(200);
    expect((await post()).status).toBe(200);
    const blocked = await post();
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).not.toBeNull();
    expect((await app.request("/api/healthz")).status).toBe(200);
  });
});

describe("request logs", () => {
  afterEach(() => vi.restoreAllMocks());

  it("write one JSON line with id, route, status and duration, and never the body", async () => {
    const lines: string[] = [];
    vi.spyOn(console, "log").mockImplementation((line: string) => lines.push(line));
    vi.spyOn(console, "error").mockImplementation((line: string) => lines.push(line));

    const secret = "my son has football at seven";
    await appWith({}).request("/api/refine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile, text: secret, lang: "en" }),
    });

    const request = lines.map((l) => JSON.parse(l)).find((l) => l.event === "request");
    expect(request).toMatchObject({
      level: "info",
      method: "POST",
      route: "/api/refine",
      status: 200,
    });
    expect(request.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(typeof request.durationMs).toBe("number");
    expect(lines.join("\n")).not.toContain(secret);
    expect(lines.join("\n")).not.toContain("17.48");
  });

  it("log the route pattern, not the place id", async () => {
    const lines: string[] = [];
    vi.spyOn(console, "log").mockImplementation((line: string) => lines.push(line));
    vi.spyOn(console, "error").mockImplementation((line: string) => lines.push(line));
    await appWith({}).request("/api/places/ChIJsecretPlaceId");
    expect(lines.join("\n")).not.toContain("ChIJsecretPlaceId");
  });
});
