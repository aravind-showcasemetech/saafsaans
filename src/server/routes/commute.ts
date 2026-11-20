import { Hono } from "hono";
import { z } from "zod";
import type { CommuteModesResponse } from "../../shared/air-types.js";
import { commuteCache } from "../cache.js";
import { fetchCommuteRoutes } from "../commute.js";
import { logEvent } from "../log.js";
import { IndiaLatSchema, IndiaLngSchema } from "./air.js";
import type { AppEnv } from "./common.js";

export const commuteRoute = new Hono<AppEnv>();

const CommuteBodySchema = z.object({
  origin: z.object({
    lat: IndiaLatSchema,
    lng: IndiaLngSchema,
  }),
  destination: z.object({
    lat: IndiaLatSchema,
    lng: IndiaLngSchema,
  }),
});

// POST /api/commute
commuteRoute.post("/commute", async (c) => {
  const reqId = c.get("requestId");
  let rawBody: unknown;

  try {
    rawBody = await c.req.json();
  } catch {
    logEvent("warn", "bad_json", { requestId: reqId, status: 400 });
    return c.json({ error: "Invalid JSON body", requestId: reqId }, 400);
  }

  const parsed = CommuteBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    logEvent("warn", "bad_input", { requestId: reqId, status: 400 });
    return c.json({ error: "Invalid origin or destination coordinates", requestId: reqId }, 400);
  }

  const origin = {
    lat: Math.round(parsed.data.origin.lat * 100) / 100,
    lng: Math.round(parsed.data.origin.lng * 100) / 100,
  };
  const destination = {
    lat: Math.round(parsed.data.destination.lat * 100) / 100,
    lng: Math.round(parsed.data.destination.lng * 100) / 100,
  };

  const cacheKey = `commute_${origin.lat}_${origin.lng}_${destination.lat}_${destination.lng}`;
  const cached = commuteCache.get(cacheKey) as CommuteModesResponse | undefined;
  if (cached) {
    return c.json(cached);
  }

  try {
    const routes = await fetchCommuteRoutes(origin, destination);
    commuteCache.set(cacheKey, routes);
    return c.json(routes);
  } catch {
    logEvent("error", "external_api_failure", { requestId: reqId, status: 500 });
    return c.json({ error: "Failed to compute commute routes", requestId: reqId }, 500);
  }
});
