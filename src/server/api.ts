// api.ts: The /api routes with body size and per-IP rate limits.
import type { Context } from "hono";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { Config } from "./config.js";
import type { GeminiDeps } from "./gemini/client.js";
import { airRoute } from "./routes/air.js";
import type { AppEnv } from "./routes/common.js";
import { commuteRoute } from "./routes/commute.js";
import { demoRoute } from "./routes/demo.js";
import { placesRoute } from "./routes/places.js";
import { createPlanRoute } from "./routes/plan.js";
import { createRefineRoute } from "./routes/refine.js";
import { createRateLimiter, rateLimit } from "./security.js";

export interface ApiDeps {
  gemini: GeminiDeps | null;
  config: Config;
  /** Resolves the client IP for rate limiting (X-Forwarded-For with trusted hops). */
  ipOf: (c: Context) => string;
}

export function createApi(deps: ApiDeps): Hono<AppEnv> {
  const api = new Hono<AppEnv>();
  // Each app instance has its own limiter state.
  const apiLimiter = createRateLimiter(deps.config.rateLimitApiPerMinute);
  const aiLimiter = createRateLimiter(deps.config.rateLimitAiPerMinute);

  api.use("*", rateLimit(apiLimiter, deps.ipOf, "api"));
  api.use("/plan", rateLimit(aiLimiter, deps.ipOf, "plan"));
  api.use("/refine", rateLimit(aiLimiter, deps.ipOf, "refine"));
  api.use(
    bodyLimit({
      maxSize: 8 * 1024,
      onError: (c) => c.json({ error: "Payload too large", requestId: c.get("requestId") }, 413),
    }),
  );

  api.get("/healthz", (c) => c.json({ status: "ok" }));
  api.route("/", airRoute);
  api.route("/", demoRoute);
  api.route("/", placesRoute);
  api.route("/", commuteRoute);
  api.route("/", createPlanRoute(deps.gemini));
  api.route("/", createRefineRoute(deps.gemini));
  return api;
}
