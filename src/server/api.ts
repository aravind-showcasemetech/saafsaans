import crypto from "node:crypto";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import type { CommuteModesResponse, NormalisedAirData } from "../shared/air-types.js";
import { HouseholdProfileSchema } from "../shared/schemas.js";
import { fetchAirData } from "./air.js";
import { airCache, commuteCache, planCache } from "./cache.js";
import { fetchCommuteRoutes } from "./commute.js";
import { config } from "./config.js";
import {
  anonymiseMembersForGemini,
  callGeminiChoosePlan,
  callGeminiRefineProfile,
  containsDigit,
  sanitizeModelText,
} from "./gemini.js";
import { fetchPlaceDetails, fetchPlaceSuggestions } from "./places.js";
import {
  computeActionNumbers,
  filterApplicableActions,
  getTemplateReason,
  getTemplateSummary,
  rankApplicableActions,
} from "./plan.js";

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

const PlanBodySchema = z.object({
  profile: HouseholdProfileSchema,
  lat: IndiaLatSchema,
  lng: IndiaLngSchema,
  lang: z.enum(["en", "hi", "te"]).default("en"),
});

const RefineBodySchema = z.object({
  profile: HouseholdProfileSchema,
  text: z.string().min(1).max(500),
  lang: z.enum(["en", "hi", "te"]).default("en"),
});

// Helper for generating anonymous request ID using crypto.randomUUID()
function generateRequestId(): string {
  return crypto.randomUUID();
}

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

// POST /api/plan
api.post("/plan", async (c) => {
  const requestId = generateRequestId();
  let rawBody: unknown;

  try {
    rawBody = await c.req.json();
  } catch {
    console.error(`Request ${requestId} failed: status 400 Bad JSON`);
    return c.json({ error: "Invalid JSON body", requestId }, 400);
  }

  const parsed = PlanBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    console.error(`Request ${requestId} failed: status 400 Bad Input`);
    return c.json({ error: "Invalid plan input", requestId }, 400);
  }

  const { profile, lat, lng, lang } = parsed.data;
  const roundLat = Math.round(lat * 100) / 100;
  const roundLng = Math.round(lng * 100) / 100;

  // 1. Get air data for the rounded cell (cached)
  const airCacheKey = `air_${roundLat}_${roundLng}`;
  let airData = airCache.get(airCacheKey) as NormalisedAirData | undefined;
  if (!airData) {
    try {
      airData = await fetchAirData(roundLat, roundLng);
      airCache.set(airCacheKey, airData);
    } catch {
      console.error(`Request ${requestId} failed: status 500 Air API Failure`);
      return c.json({ error: "Failed to fetch air quality data", requestId }, 500);
    }
  }

  // Check plan cache (30 minutes by hash of profile, AQI band, and language)
  const planHash = crypto
    .createHash("sha256")
    .update(JSON.stringify({ profile, aqiBand: airData.aqiBand, lang }))
    .digest("hex");
  const planCacheKey = `plan_${planHash}`;
  const cachedPlan = planCache.get(planCacheKey);
  if (cachedPlan) {
    return c.json(cachedPlan);
  }

  // 2. Filter applicable actions & compute numbers before any model call
  const applicableActions = filterApplicableActions(profile, airData);
  const computedMap = new Map(
    applicableActions.map((act) => [act.id, computeActionNumbers(act, profile, airData)]),
  );

  let planSource: "gemini" | "fallback" | "demo" = config.demoMode ? "demo" : "fallback";
  let promptTokens: number | undefined;
  let candidatesTokens: number | undefined;
  let totalTokens: number | undefined;
  let latencyMs = 0;

  let chosenOrder: Array<{ actionId: string; reason?: string }> = [];
  let summary = getTemplateSummary(lang);

  // 3. If Gemini is live (or mocked in test) and not demo mode, call Gemini
  if (config.geminiLive || process.env.NODE_ENV === "test") {
    const anonymisedMembers = anonymiseMembersForGemini(profile.members);
    const result = await callGeminiChoosePlan({
      anonymisedProfile: {
        members: anonymisedMembers,
        commute: profile.commute,
        home: profile.home,
      },
      applicableActions: applicableActions.map((a) => ({
        id: a.id,
        title: a.title,
        lens: a.lens,
        kind: a.kind,
      })),
      aqiBand: airData.aqiBand,
      lang,
    });

    latencyMs = result.latencyMs;
    promptTokens = result.promptTokens;
    candidatesTokens = result.candidatesTokens;
    totalTokens = result.totalTokens;

    if (result.data) {
      // Validate reply: drop unknown or inapplicable ids and duplicates, keep at most 6
      const seenIds = new Set<string>();
      for (const swap of result.data.swaps) {
        if (computedMap.has(swap.actionId) && !seenIds.has(swap.actionId) && seenIds.size < 6) {
          seenIds.add(swap.actionId);
          chosenOrder.push(swap);
        }
      }

      if (chosenOrder.length > 0) {
        planSource = config.demoMode ? "demo" : "gemini";
      }

      if (result.data.familySummary) {
        let cleanSummary = sanitizeModelText(result.data.familySummary);
        if (containsDigit(cleanSummary)) {
          cleanSummary = getTemplateSummary(lang);
        }
        summary = cleanSummary.slice(0, 400);
      }
    }
  }

  // Log request id, source, latency and token counts only, never text
  console.log(
    `[PLAN] reqId=${requestId} src=${planSource} latencyMs=${latencyMs} promptTokens=${promptTokens ?? 0} candidateTokens=${candidatesTokens ?? 0} totalTokens=${totalTokens ?? 0}`,
  );

  // Fallback if Gemini was off, failed, over cap, or returned empty/invalid
  if (chosenOrder.length === 0) {
    planSource = config.demoMode ? "demo" : "fallback";
    const ranked = rankApplicableActions(Array.from(computedMap.values()));
    chosenOrder = ranked.slice(0, 6).map((item) => ({ actionId: item.id }));
    summary = getTemplateSummary(lang);
  }

  // Build response swaps
  const swaps = chosenOrder
    .map((chosen) => {
      const computed = computedMap.get(chosen.actionId);
      if (!computed) {
        return null;
      }
      let reason = chosen.reason ? sanitizeModelText(chosen.reason) : "";
      let reasonSource: "gemini" | "template" = "gemini";

      if (!reason || containsDigit(reason) || (planSource !== "gemini" && planSource !== "demo")) {
        reason = getTemplateReason(chosen.actionId, lang);
        reasonSource = "template";
      } else {
        reason = reason.slice(0, 240);
      }

      return {
        id: computed.id,
        lens: computed.lens,
        kind: computed.kind,
        title: computed.title,
        savingNumber: computed.savingNumber,
        savingUnit: computed.savingUnit,
        savingRange: computed.savingRange,
        factText: computed.factText,
        isEstimate: computed.isEstimate,
        factorSections: computed.factorSections,
        reason,
        reasonSource,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  const responseBody = {
    source: planSource,
    summary,
    swaps,
    currentAqi: airData.currentAqi,
    aqiBand: airData.aqiBand,
    cpcbHealthStatement: airData.healthRecommendations?.generalPopulation ?? "",
  };

  planCache.set(planCacheKey, responseBody);
  return c.json(responseBody);
});

// POST /api/refine
api.post("/api/refine", async (c) => {
  return c.redirect("/refine");
});

api.post("/refine", async (c) => {
  const requestId = generateRequestId();
  let rawBody: unknown;

  try {
    rawBody = await c.req.json();
  } catch {
    console.error(`Request ${requestId} failed: status 400 Bad JSON`);
    return c.json({ error: "Invalid JSON body", requestId }, 400);
  }

  const parsed = RefineBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    console.error(`Request ${requestId} failed: status 400 Bad Input`);
    return c.json({ error: "Invalid refine input", requestId }, 400);
  }

  const { profile, text, lang } = parsed.data;

  let latencyMs = 0;
  let promptTokens: number | undefined;
  let candidatesTokens: number | undefined;
  let totalTokens: number | undefined;
  let source = "fallback";

  let updatedProfile = profile;

  if (config.geminiLive || process.env.NODE_ENV === "test") {
    const refineResult = await callGeminiRefineProfile({
      currentProfile: profile,
      refineText: text,
      lang,
    });

    latencyMs = refineResult.latencyMs;
    promptTokens = refineResult.promptTokens;
    candidatesTokens = refineResult.candidatesTokens;
    totalTokens = refineResult.totalTokens;

    if (refineResult.updatedProfile) {
      // Re-validate the whole profile with Zod, reject anything outside schema, never change location
      const revalidated = HouseholdProfileSchema.safeParse(refineResult.updatedProfile);
      if (revalidated.success) {
        // Ensure location/places cannot be changed
        updatedProfile = {
          ...revalidated.data,
          commute: {
            ...revalidated.data.commute,
            startPlace: profile.commute.startPlace,
            endPlace: profile.commute.endPlace,
          },
        };
        source = "gemini";
      }
    }
  }

  console.log(
    `[REFINE] reqId=${requestId} src=${source} latencyMs=${latencyMs} promptTokens=${promptTokens ?? 0} candidateTokens=${candidatesTokens ?? 0} totalTokens=${totalTokens ?? 0}`,
  );

  return c.json({
    profile: updatedProfile,
    source,
  });
});
