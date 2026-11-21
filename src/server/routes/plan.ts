import crypto from "node:crypto";
import { Hono } from "hono";
import { z } from "zod";
import type { NormalisedAirData } from "../../shared/air-types.js";
import { computeHouseholdDayComparison } from "../../shared/day/index.js";
import { CPCB_AQI_BANDS } from "../../shared/factors.js";
import { type PlanResponse, PlanResponseSchema } from "../../shared/plan-schema.js";
import { type HouseholdProfile, HouseholdProfileSchema } from "../../shared/schemas.js";
import { getAirFor } from "../air.js";
import { airCache, planCache } from "../cache.js";
import type { Config } from "../config.js";
import type { GeminiDeps } from "../gemini/client.js";
import { logEvent } from "../log.js";
import { computeActionNumbers, filterApplicableActions } from "../plan/index.js";
import type { Lang } from "../translations.js";
import { IndiaLatSchema, IndiaLngSchema } from "./air.js";
import { choosePlan, swapResponse } from "./plan-choose.js";
import { type AppEnv, hasNickname, readJson } from "./request-context.js";

const PlanBodySchema = z.object({
  profile: HouseholdProfileSchema,
  lat: IndiaLatSchema,
  lng: IndiaLngSchema,
  lang: z.enum(["en", "hi", "te"]).default("en"),
});

async function airFor(
  getAir: ReturnType<typeof getAirFor>,
  lat: number,
  lng: number,
): Promise<NormalisedAirData> {
  const key = `air_${lat}_${lng}`;
  const cached = airCache.get(key) as NormalisedAirData | undefined;
  if (cached) return cached;
  const air = await getAir(lat, lng);
  airCache.set(key, air);
  return air;
}

/** The plan carries this cell's AQI and forecast, so the cell is part of the key. */
function planKeyFor(parts: Record<string, unknown>): string {
  return `plan_${crypto.createHash("sha256").update(JSON.stringify(parts)).digest("hex")}`;
}

/** Which day-model swaps are switched on, for the household totals. */
function activeSwapFlags(active: Set<string>) {
  return {
    shiftOutdoorExercise: active.has("shift-outdoor-exercise"),
    exerciseIndoors: active.has("exercise-indoors"),
    purifierBedroom: active.has("purifier-bedroom"),
    shutWindowsPeak: active.has("shut-windows-peak"),
    airHouseCleanWindow: active.has("air-house-clean-window"),
    maskOutdoors: active.has("mask-outdoors"),
  };
}

interface BuildPlanInput {
  gemini: GeminiDeps | null;
  config: Config;
  profile: HouseholdProfile;
  airData: NormalisedAirData;
  lang: Lang;
  requestId: string;
}

/** The plan for one household and cell: swaps, reasons, member doses and health text. */
async function buildPlan(input: BuildPlanInput): Promise<PlanResponse> {
  const { gemini, config, profile, airData, lang, requestId } = input;
  const applicable = filterApplicableActions(profile, airData);
  const computed = new Map(
    applicable.map((act) => [act.id, computeActionNumbers(act, profile, airData, lang)]),
  );
  const { chosen, summary, fromModel } = await choosePlan({
    gemini,
    profile,
    applicable,
    computed,
    aqiBand: airData.aqiBand,
    lang,
    requestId,
  });

  const swaps = chosen.flatMap((pick) => {
    const item = computed.get(pick.actionId);
    return item ? [swapResponse(item, pick, fromModel, lang)] : [];
  });

  const day = computeHouseholdDayComparison({
    profile,
    hourlyForecast: airData.hourlyForecast,
    currentPm25: airData.pm25,
    swapsActive: activeSwapFlags(new Set(swaps.map((s) => s.id))),
  });
  const band = CPCB_AQI_BANDS.find((b) => b.band === airData.aqiBand) ?? CPCB_AQI_BANDS[2];

  return PlanResponseSchema.parse({
    source: config.demoMode ? "demo" : fromModel ? "gemini" : "fallback",
    summary,
    swaps,
    currentAqi: airData.currentAqi,
    aqiBand: airData.aqiBand,
    cpcbHealthStatement: band.healthStatement,
    googleHealthAdvice: airData.healthRecommendations ?? {},
    memberDoses: day.memberComparisons,
    isDemo: !config.mapsLive,
    capturedAt: config.mapsLive ? undefined : airData.capturedAt,
  });
}

/** POST /plan: catalogue filter, numbers from src/shared, Gemini picks and explains (or the ranker). */
export function createPlanRoute(gemini: GeminiDeps | null, config: Config): Hono<AppEnv> {
  const route = new Hono<AppEnv>();
  const getAir = getAirFor(config);

  route.post("/plan", async (c) => {
    const requestId = c.get("requestId");
    const raw = await readJson(c);
    if (raw === undefined) return c.json({ error: "Invalid JSON body", requestId }, 400);

    const parsed = PlanBodySchema.safeParse(raw);
    if (!parsed.success) return c.json({ error: "Invalid plan input", requestId }, 400);
    // Nicknames never leave the browser.
    if (hasNickname(raw))
      return c.json({ error: "Nickname field is not permitted", requestId }, 400);

    const { profile, lang } = parsed.data;
    const lat = Math.round(parsed.data.lat * 100) / 100;
    const lng = Math.round(parsed.data.lng * 100) / 100;

    let airData: NormalisedAirData;
    try {
      airData = await airFor(getAir, lat, lng);
    } catch {
      logEvent("error", "air_fetch_failed", { requestId });
      return c.json({ error: "Failed to fetch air quality data", requestId }, 500);
    }

    const planKey = planKeyFor({ profile, lat, lng, aqiBand: airData.aqiBand, lang });
    const cachedPlan = planCache.get(planKey);
    if (cachedPlan) return c.json(cachedPlan);

    const body = await buildPlan({ gemini, config, profile, airData, lang, requestId });
    planCache.set(planKey, body);
    return c.json(body);
  });

  return route;
}
