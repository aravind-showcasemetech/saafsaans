import { Hono } from "hono";
import { z } from "zod";
import { fetchPlaceDetails, fetchPlaceSuggestions } from "../places.js";

export const placesRoute = new Hono();

const PlacesQuerySchema = z.object({
  q: z.string().min(1).max(100),
  session: z.string().max(100).optional(),
});

// Place ids: accept only letters, digits, "-" and "_" (Zod regex)
const PlaceDetailsParamsSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-zA-Z0-9\-_]+$/),
});

const PlaceDetailsQuerySchema = z.object({
  session: z.string().max(100).optional(),
});

// GET /api/places?q=...&session=...
placesRoute.get("/places", async (c) => {
  const reqId = c.get("requestId" as never) || "";
  const query = c.req.query();
  const parsed = PlacesQuerySchema.safeParse(query);

  if (!parsed.success) {
    console.error(`Request ${reqId} failed: status 400 Bad Input`);
    return c.json({ error: "Invalid query parameters", requestId: reqId }, 400);
  }

  try {
    const results = await fetchPlaceSuggestions(parsed.data.q, parsed.data.session);
    return c.json(results);
  } catch {
    console.error(`Request ${reqId} failed: status 500 External API Failure`);
    return c.json({ error: "Failed to fetch place suggestions", requestId: reqId }, 500);
  }
});

// GET /api/places/:id?session=...
placesRoute.get("/places/:id", async (c) => {
  const reqId = c.get("requestId" as never) || "";
  const paramParsed = PlaceDetailsParamsSchema.safeParse({ id: c.req.param("id") });
  if (!paramParsed.success) {
    console.error(`Request ${reqId} failed: status 400 Bad Input`);
    return c.json({ error: "Invalid place id", requestId: reqId }, 400);
  }

  const queryParsed = PlaceDetailsQuerySchema.safeParse(c.req.query());
  const sessionToken = queryParsed.success ? queryParsed.data.session : undefined;

  try {
    const place = await fetchPlaceDetails(paramParsed.data.id, sessionToken);
    if (!place) {
      console.error(`Request ${reqId} failed: status 404 Place Not Found`);
      return c.json({ error: "Place not found", requestId: reqId }, 404);
    }
    return c.json(place);
  } catch {
    console.error(`Request ${reqId} failed: status 500 External API Failure`);
    return c.json({ error: "Failed to fetch place details", requestId: reqId }, 500);
  }
});
