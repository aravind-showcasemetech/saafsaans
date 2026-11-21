// app.ts: Builds the Hono app: request ids and logs, security headers, compression,
// caching rules, the API, and the built front end from dist/client.
import crypto from "node:crypto";
import fs from "node:fs";
import { getConnInfo } from "@hono/node-server/conninfo";
import { serveStatic } from "@hono/node-server/serve-static";
import { type Context, Hono } from "hono";
import { compress } from "hono/compress";
import { matchedRoutes } from "hono/route";
import { createApi } from "./api.js";
import { type Config, config as defaultConfig } from "./config.js";
import { type GeminiDeps, geminiFromConfig } from "./gemini/client.js";
import { logEvent } from "./log.js";
import type { AppEnv } from "./routes/request-context.js";
import { clientIp, securityHeaders } from "./security.js";

const CLIENT_DIST = "./dist/client";

export interface AppDeps {
  config?: Config;
  /** null turns Gemini off (template text); omit to build the real client from config. */
  gemini?: GeminiDeps | null;
}

function socketAddress(c: Context): string | undefined {
  try {
    return getConnInfo(c).remote.address;
  } catch {
    return undefined; // app.request() in tests has no socket
  }
}

/** The matched route pattern (never the raw path, which can carry ids); "static" for files. */
function routeLabel(c: Context): string {
  const handlers = matchedRoutes(c).filter((r) => r.method !== "ALL");
  return handlers.length > 0 ? handlers[handlers.length - 1].path : "static";
}

export function createApp(deps: AppDeps = {}): Hono<AppEnv> {
  const cfg = deps.config ?? defaultConfig;
  const gemini = deps.gemini === undefined ? geminiFromConfig(cfg) : deps.gemini;
  const ipOf = (c: Context) =>
    clientIp(c.req.header("x-forwarded-for"), cfg.trustedProxies, socketAddress(c));

  const app = new Hono<AppEnv>();

  // Request id and one structured log line per request: no bodies, keys or user text.
  app.use("*", async (c, next) => {
    const requestId = crypto.randomUUID();
    c.set("requestId", requestId);
    const start = performance.now();
    await next();
    c.header("X-Request-Id", requestId);
    logEvent(c.res.status >= 500 ? "error" : "info", "request", {
      requestId,
      method: c.req.method,
      route: routeLabel(c),
      status: c.res.status,
      durationMs: Math.round(performance.now() - start),
    });
  });

  app.use("*", securityHeaders());
  app.use("*", compress());

  // Hashed build assets never change; HTML and API answers are never stored.
  app.use("*", async (c, next) => {
    await next();
    const type = c.res.headers.get("Content-Type") ?? "";
    if (c.req.path.startsWith("/assets/") && c.res.status === 200) {
      c.res.headers.set("Cache-Control", "public, max-age=31536000, immutable");
    } else if (
      c.req.path.startsWith("/api") ||
      c.req.path === "/healthz" ||
      type.includes("text/html") ||
      type.includes("application/json")
    ) {
      c.res.headers.set("Cache-Control", "no-store");
    } else if (c.res.status === 200) {
      c.res.headers.set("Cache-Control", "public, max-age=86400");
    }
  });

  app.route("/api", createApi({ gemini, config: cfg, ipOf }));
  app.get("/healthz", (c) => c.json({ status: "ok" }));

  // The built front end, when there is one. Tests and the API alone run without a build; then
  // there is one JSON warning instead of serveStatic's plain-text one on every request.
  if (fs.existsSync(`${CLIENT_DIST}/index.html`)) {
    app.get("/", serveStatic({ path: `${CLIENT_DIST}/index.html` }));
    app.use("/*", serveStatic({ root: CLIENT_DIST }));
  } else {
    logEvent("warn", "client_build_missing", { path: CLIENT_DIST });
  }
  app.notFound((c) =>
    c.req.path.startsWith("/api")
      ? c.json({ error: "Not found", requestId: c.get("requestId") }, 404)
      : c.text("Not found", 404),
  );

  return app;
}

export const app = createApp();
