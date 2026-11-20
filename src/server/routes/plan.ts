import crypto from "node:crypto";
import { Hono } from "hono";
import { z } from "zod";
import type { NormalisedAirData } from "../../shared/air-types.js";
import { computeHouseholdDayComparison } from "../../shared/day.js";
import { CPCB_AQI_BANDS } from "../../shared/factors.js";
import { type PlanResponse, PlanResponseSchema } from "../../shared/plan-schema.js";
import { HouseholdProfileSchema } from "../../shared/schemas.js";
import { getAirFor } from "../air.js";
import { airCache, planCache } from "../cache.js";
import type { Config } from "../config.js";
import type { GeminiDeps } from "../gemini/client.js";
import { anonymiseMembersForGemini, containsDigit, sanitizeModelText } from "../gemini/common.js";
import { callGeminiChoosePlan } from "../gemini/plan.js";
import { logEvent } from "../log.js";
import {
  computeActionNumbers,
  filterApplicableActions,
  getTemplateReason,
  getTemplateSummary,
  rankApplicableActions,
} from "../plan.js";
import { IndiaLatSchema, IndiaLngSchema } from "./air.js";
import { type AppEnv, hasNickname, readJson } from "./common.js";

const MAX_SWAPS = 6;

const PlanBodySchema = z.object({
  profile: HouseholdProfileSchema,
  lat: IndiaLatSchema,
  lng: IndiaLngSchema,
  lang: z.enum(["en", "hi", "te"]).default("en"),
});

type Lang = z.infer<typeof PlanBodySchema>["lang"];
type Chosen = { actionId: string; reason?: string };

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

    // The plan carries this cell's AQI and forecast, so the cell is part of the key.
    const planKey = `plan_${crypto
      .createHash("sha256")
      .update(JSON.stringify({ profile, lat, lng, aqiBand: airData.aqiBand, lang }))
      .digest("hex")}`;
    const cachedPlan = planCache.get(planKey);
    if (cachedPlan) return c.json(cachedPlan);

    const applicable = filterApplicableActions(profile, airData);
    const computed = new Map(
      applicable.map((act) => [act.id, computeActionNumbers(act, profile, airData, lang)]),
    );

    let chosen: Chosen[] = [];
    let summary = getTemplateSummary(lang);
    let fromModel = false;

    if (gemini) {
      const result = await callGeminiChoosePlan({
        gemini,
        anonymisedProfile: {
          members: anonymiseMembersForGemini(profile.members),
          commute: profile.commute,
          home: profile.home,
        },
        applicableActions: applicable.map((a) => ({
          id: a.id,
          title: a.title,
          lens: a.lens,
          kind: a.kind,
        })),
        aqiBand: airData.aqiBand,
        lang,
      });
      logEvent("info", "gemini_plan", {
        requestId,
        ok: Boolean(result.data),
        latencyMs: result.latencyMs,
        totalTokens: result.totalTokens,
      });

      if (result.data) {
        // Only ids from the applicable catalogue, no repeats, at most six (AGENTS.md rule 2).
        const seen = new Set<string>();
        for (const swap of result.data.swaps) {
          if (computed.has(swap.actionId) && !seen.has(swap.actionId) && seen.size < MAX_SWAPS) {
            seen.add(swap.actionId);
            chosen.push(swap);
          }
        }
        fromModel = chosen.length > 0;
        const modelSummary = sanitizeModelText(result.data.familySummary);
        if (fromModel && modelSummary && !containsDigit(modelSummary)) {
          summary = modelSummary.slice(0, 400);
        }
      }
    }

    if (!fromModel) {
      chosen = rankApplicableActions(Array.from(computed.values()), profile)
        .slice(0, MAX_SWAPS)
        .map((item) => ({ actionId: item.id }));
    }

    const swaps = chosen.flatMap((pick) => {
      const item = computed.get(pick.actionId);
      if (!item) return [];
      const modelReason = pick.reason ? sanitizeModelText(pick.reason) : "";
      const useModel = fromModel && modelReason !== "" && !containsDigit(modelReason);
      return [
        {
          id: item.id,
          lens: item.lens,
          kind: item.kind,
          title: item.title,
          savingNumber: item.savingNumber,
          savingUnit: item.savingUnit,
          savingRange: item.savingRange,
          factText: item.factText,
          isEstimate: item.isEstimate,
          factorSections: item.factorSections,
          purifierCadrCfm: item.purifierCadrCfm,
          appliesToMemberIds: item.appliesToMemberIds,
          reason: useModel ? modelReason.slice(0, 240) : getTemplateReason(item.id, lang as Lang),
          reasonSource: useModel ? ("gemini" as const) : ("template" as const),
          reasonLang: lang,
        },
      ];
    });

    const active = new Set(swaps.map((s) => s.id));
    const day = computeHouseholdDayComparison({
      profile,
      hourlyForecast: airData.hourlyForecast,
      currentPm25: airData.pm25,
      swapsActive: {
        shiftOutdoorExercise: active.has("shift-outdoor-exercise"),
        exerciseIndoors: active.has("exercise-indoors"),
        purifierBedroom: active.has("purifier-bedroom"),
        shutWindowsPeak: active.has("shut-windows-peak"),
        airHouseCleanWindow: active.has("air-house-clean-window"),
        maskOutdoors: active.has("mask-outdoors"),
      },
    });
    const band = CPCB_AQI_BANDS.find((b) => b.band === airData.aqiBand) ?? CPCB_AQI_BANDS[2];

    const body: PlanResponse = PlanResponseSchema.parse({
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
    planCache.set(planKey, body);
    return c.json(body);
  });

  return route;
}
