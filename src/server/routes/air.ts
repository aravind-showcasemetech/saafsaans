import { Hono } from "hono";
import { z } from "zod";
import type { NormalisedAirData } from "../../shared/air-types.js";
import { fetchAirData } from "../air.js";
import { airCache } from "../cache.js";

export const airRoute = new Hono();

// Helper to check coordinates within India roughly:
// Lat: ~6.0 to ~38.0, Lng: ~68.0 to ~98.0
export const IndiaLatSchema = z.coerce.number().min(6.0).max(38.0);
export const IndiaLngSchema = z.coerce.number().min(68.0).max(98.0);

const AirQuerySchema = z.object({
  lat: IndiaLatSchema,
  lng: IndiaLngSchema,
});

// GET /api/air?lat=...&lng=...
airRoute.get("/air", async (c) => {
  const reqId = c.get("requestId" as never) || "";
  const query = c.req.query();
  const parsed = AirQuerySchema.safeParse(query);

  if (!parsed.success) {
    console.error(`Request ${reqId} failed: status 400 Bad Input`);
    return c.json({ error: "Invalid coordinates", requestId: reqId }, 400);
  }

  // Round coordinates to 2 decimal places before cache check, API call, or logging
  const lat = Math.round(parsed.data.lat * 100) / 100;
  const lng = Math.round(parsed.data.lng * 100) / 100;

  const cacheKey = `air_${lat}_${lng}`;
  const cached = airCache.get(cacheKey) as NormalisedAirData | undefined;
  if (cached) {
    return c.json(cached);
  }

  try {
    const airData = await fetchAirData(lat, lng);
    airCache.set(cacheKey, airData);
    return c.json(airData);
  } catch {
    console.error(`Request ${reqId} failed: status 500 External API Failure`);
    return c.json({ error: "Failed to fetch air quality data", requestId: reqId }, 500);
  }
});
