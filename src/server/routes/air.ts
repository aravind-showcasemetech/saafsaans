import { Hono } from "hono";
import { z } from "zod";
import type { NormalisedAirData } from "../../shared/air-types.js";
import { getAirFor } from "../air.js";
import { airCache } from "../cache.js";
import type { Config } from "../config.js";
import { logEvent } from "../log.js";
import type { AppEnv } from "./request-context.js";

// Helper to check coordinates within India roughly:
// Lat: ~6.0 to ~38.0, Lng: ~68.0 to ~98.0
export const IndiaLatSchema = z.coerce.number().min(6.0).max(38.0);
export const IndiaLngSchema = z.coerce.number().min(68.0).max(98.0);

const AirQuerySchema = z.object({
  lat: IndiaLatSchema,
  lng: IndiaLngSchema,
  lang: z.enum(["en", "hi", "te"]).optional(),
});

export const FIXED_AREAS = [
  { name: "Kukatpally", lat: 17.48, lng: 78.41 },
  { name: "Gachibowli", lat: 17.44, lng: 78.35 },
  { name: "HITEC City", lat: 17.45, lng: 78.38 },
  { name: "Kondapur", lat: 17.46, lng: 78.35 },
  { name: "Banjara Hills", lat: 17.41, lng: 78.44 },
  { name: "Sanathnagar", lat: 17.46, lng: 78.44 },
  { name: "Secunderabad", lat: 17.44, lng: 78.5 },
  { name: "Charminar", lat: 17.36, lng: 78.47 },
  { name: "Dwarka, Delhi", lat: 28.59, lng: 77.05 },
] as const;

export const DEMO_AREAS = [
  { name: "Kukatpally", lat: 17.48, lng: 78.41 },
  { name: "Dwarka, Delhi", lat: 28.59, lng: 77.05 },
] as const;

/** GET /air/areas and GET /air, answering from live data or the saved captures per config. */
export function createAirRoute(config: Config): Hono<AppEnv> {
  const airRoute = new Hono<AppEnv>();
  const getAir = getAirFor(config);

  // GET /api/air/areas
  airRoute.get("/air/areas", async (c) => {
    const reqId = c.get("requestId");
    const isDemo = !config.mapsLive;
    const cacheKey = isDemo ? "air_areas_list_demo" : "air_areas_list";
    const cached = airCache.get(cacheKey);
    if (cached) {
      return c.json(cached);
    }

    const areasToFetch = isDemo ? DEMO_AREAS : FIXED_AREAS;

    try {
      const results = await Promise.all(
        areasToFetch.map(async (area) => {
          const areaCacheKey = `air_${area.lat}_${area.lng}`;
          let airData = airCache.get(areaCacheKey) as NormalisedAirData | undefined;
          if (!airData) {
            airData = await getAir(area.lat, area.lng);
            airCache.set(areaCacheKey, airData);
          }
          return {
            name: area.name,
            lat: area.lat,
            lng: area.lng,
            aqi: airData.currentAqi,
            aqiBand: airData.aqiBand,
            pm25: airData.pm25,
            dominantPollutant: airData.dominantPollutant,
            isApproximate: airData.isApproximate,
            isDemo,
            capturedAt: isDemo ? airData.capturedAt : undefined,
          };
        }),
      );

      airCache.set(cacheKey, results, 30 * 60);
      return c.json(results);
    } catch {
      logEvent("error", "areas_api_failure", { requestId: reqId, status: 500 });
      return c.json({ error: "Failed to fetch area air quality data", requestId: reqId }, 500);
    }
  });
  airRoute.get("/air", async (c) => {
    const reqId = c.get("requestId");
    const query = c.req.query();
    const parsed = AirQuerySchema.safeParse(query);

    if (!parsed.success) {
      logEvent("warn", "bad_input", { requestId: reqId, status: 400 });
      return c.json({ error: "Invalid coordinates", requestId: reqId }, 400);
    }

    // Round coordinates to 2 decimal places before cache check, API call, or logging
    const lat = Math.round(parsed.data.lat * 100) / 100;
    const lng = Math.round(parsed.data.lng * 100) / 100;
    const lang = parsed.data.lang || "en";

    const cacheKey = `air_${lat}_${lng}_${lang}`;
    const cached = airCache.get(cacheKey) as NormalisedAirData | undefined;
    if (cached) {
      return c.json(cached);
    }

    try {
      const airData = await getAir(lat, lng, lang !== "en" ? lang : undefined);
      const withDemo = {
        ...airData,
        isDemo: !config.mapsLive,
        capturedAt: config.mapsLive ? undefined : airData.capturedAt,
      };
      airCache.set(cacheKey, withDemo);
      return c.json(withDemo);
    } catch {
      logEvent("error", "external_api_failure", { requestId: reqId, status: 500 });
      return c.json({ error: "Failed to fetch air quality data", requestId: reqId }, 500);
    }
  });

  return airRoute;
}
