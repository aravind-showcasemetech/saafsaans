import { Hono } from "hono";
import { z } from "zod";
import type { CommuteModesResponse, NormalisedAirData } from "../shared/air-types.js";
import { fetchAirData } from "./air.js";
import { airCache, commuteCache } from "./cache.js";
import { fetchCommuteRoutes } from "./commute.js";
import { fetchPlaceDetails, fetchPlaceSuggestions } from "./places.js";

export const api = new Hono();

// Helper to check coordinates within India roughly:
// Lat: ~6.0 to ~38.0, Lng: ~68.0 to ~98.0
const IndiaLatSchema = z.coerce.number().min(6.0).max(38.0);
const IndiaLngSchema = z.coerce.number().min(68.0).max(98.0);

const AirQuerySchema = z.object({
  lat: IndiaLatSchema,
  lng: IndiaLngSchema,
});

const PlacesQuerySchema = z.object({
  q: z.string().min(1).max(100),
  session: z.string().max(100).optional(),
});

const PlaceDetailsParamsSchema = z.object({
  id: z.string().min(1).max(200),
});

const PlaceDetailsQuerySchema = z.object({
  session: z.string().max(100).optional(),
});

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

// Helper for generating anonymous request ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

// Global 8 KB body limit middleware
api.use(async (c, next) => {
  const contentLength = c.req.header("content-length");
  if (contentLength && Number(contentLength) > 8192) {
    const requestId = generateRequestId();
    console.error(`Request ${requestId} failed: status 413 Payload Too Large`);
    return c.json({ error: "Payload too large", requestId }, 413);
  }
  await next();
});

api.get("/healthz", (c) => {
  return c.json({ status: "ok" });
});

// GET /api/air?lat=&lng=
api.get("/air", async (c) => {
  const requestId = generateRequestId();
  const query = c.req.query();
  const parsed = AirQuerySchema.safeParse(query);

  if (!parsed.success) {
    console.error(`Request ${requestId} failed: status 400 Bad Input`);
    return c.json({ error: "Invalid coordinates", requestId }, 400);
  }

  // Round coordinates to 2 decimal places before any call, cache key or log
  const roundLat = Math.round(parsed.data.lat * 100) / 100;
  const roundLng = Math.round(parsed.data.lng * 100) / 100;

  const cacheKey = `air_${roundLat}_${roundLng}`;
  const cached = airCache.get(cacheKey) as NormalisedAirData | undefined;
  if (cached) {
    return c.json(cached);
  }

  try {
    const airData = await fetchAirData(roundLat, roundLng);
    airCache.set(cacheKey, airData);
    return c.json(airData);
  } catch {
    console.error(`Request ${requestId} failed: status 500 External API Failure`);
    return c.json({ error: "Failed to fetch air quality data", requestId }, 500);
  }
});

// GET /api/places?q=&session=
api.get("/places", async (c) => {
  const requestId = generateRequestId();
  const query = c.req.query();
  const parsed = PlacesQuerySchema.safeParse(query);

  if (!parsed.success) {
    console.error(`Request ${requestId} failed: status 400 Bad Input`);
    return c.json({ error: "Invalid query parameters", requestId }, 400);
  }

  try {
    const suggestions = await fetchPlaceSuggestions(parsed.data.q, parsed.data.session);
    return c.json(suggestions);
  } catch {
    console.error(`Request ${requestId} failed: status 500 External API Failure`);
    return c.json({ error: "Failed to fetch place suggestions", requestId }, 500);
  }
});

// GET /api/places/:id?session=
api.get("/places/:id", async (c) => {
  const requestId = generateRequestId();
  const params = c.req.param();
  const query = c.req.query();

  const parsedParams = PlaceDetailsParamsSchema.safeParse(params);
  const parsedQuery = PlaceDetailsQuerySchema.safeParse(query);

  if (!parsedParams.success || !parsedQuery.success) {
    console.error(`Request ${requestId} failed: status 400 Bad Input`);
    return c.json({ error: "Invalid place id or session token", requestId }, 400);
  }

  try {
    const details = await fetchPlaceDetails(parsedParams.data.id, parsedQuery.data.session);
    return c.json(details);
  } catch {
    console.error(`Request ${requestId} failed: status 500 External API Failure`);
    return c.json({ error: "Failed to fetch place details", requestId }, 500);
  }
});

// POST /api/commute
api.post("/commute", async (c) => {
  const requestId = generateRequestId();
  let rawBody: unknown;

  try {
    rawBody = await c.req.json();
  } catch {
    console.error(`Request ${requestId} failed: status 400 Bad JSON`);
    return c.json({ error: "Invalid JSON body", requestId }, 400);
  }

  const parsed = CommuteBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    console.error(`Request ${requestId} failed: status 400 Bad Input`);
    return c.json({ error: "Invalid origin or destination coordinates", requestId }, 400);
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
    console.error(`Request ${requestId} failed: status 500 External API Failure`);
    return c.json({ error: "Failed to compute commute routes", requestId }, 500);
  }
});
