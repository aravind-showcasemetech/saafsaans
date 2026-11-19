import crypto from "node:crypto";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { airRoute } from "./routes/air.js";
import { commuteRoute } from "./routes/commute.js";
import { placesRoute } from "./routes/places.js";
import { planRoute } from "./routes/plan.js";
import { refineRoute } from "./routes/refine.js";

export const api = new Hono();

// Helper for generating anonymous request ID using crypto.randomUUID()
export function generateRequestId(): string {
  return crypto.randomUUID();
}

// Attach requestId to context
api.use("*", async (c, next) => {
  const reqId = generateRequestId();
  c.set("requestId" as never, reqId as never);
  await next();
});

// Global 8 KB body limit middleware via Hono built-in bodyLimit
api.use(
  bodyLimit({
    maxSize: 8 * 1024,
    onError: (c) => {
      const requestId = generateRequestId();
      console.error(`Request ${requestId} failed: status 413 Payload Too Large`);
      return c.json({ error: "Payload too large", requestId }, 413);
    },
  }),
);

api.get("/healthz", (c) => {
  return c.json({ status: "ok" });
});

// Mount modular sub-routes
api.route("/", airRoute);
api.route("/", placesRoute);
api.route("/", commuteRoute);
api.route("/", planRoute);
api.route("/", refineRoute);

// Backward compatibility redirects / aliases
api.post("/api/plan", async (c) => c.redirect("/plan", 307));
api.post("/api/refine", async (c) => c.redirect("/refine", 307));
