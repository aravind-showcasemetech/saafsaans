import crypto from "node:crypto";
import { Hono } from "hono";
import { z } from "zod";
import type { NormalisedAirData } from "../../shared/air-types.js";
import { computeHouseholdDayComparison } from "../../shared/day.js";
import { CPCB_AQI_BANDS } from "../../shared/factors.js";
import { HouseholdProfileSchema } from "../../shared/schemas.js";
import { fetchAirData } from "../air.js";
import { airCache, planCache } from "../cache.js";
import { config } from "../config.js";
import {
  anonymiseMembersForGemini,
  callGeminiChoosePlan,
  containsDigit,
  sanitizeModelText,
} from "../gemini.js";
import {
  computeActionNumbers,
  filterApplicableActions,
  getTemplateReason,
  getTemplateSummary,
  rankApplicableActions,
} from "../plan.js";
import { IndiaLatSchema, IndiaLngSchema } from "./air.js";

export const planRoute = new Hono();

const PlanBodySchema = z.object({
  profile: HouseholdProfileSchema,
  lat: IndiaLatSchema,
  lng: IndiaLngSchema,
  lang: z.enum(["en", "hi", "te"]).default("en"),
});

planRoute.post("/plan", async (c) => {
  const reqId = c.get("requestId" as never) || "";
  let rawBody: unknown;

  try {
    rawBody = await c.req.json();
  } catch {
    console.error(`Request ${reqId} failed: status 400 Bad JSON`);
    return c.json({ error: "Invalid JSON body", requestId: reqId }, 400);
  }

  const parsed = PlanBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    console.error(`Request ${reqId} failed: status 400 Bad Input`);
    return c.json({ error: "Invalid plan input", requestId: reqId }, 400);
  }

  // Reject nickname field to ensure nicknames never leave the browser
  const rawRecord =
    typeof rawBody === "object" && rawBody !== null ? (rawBody as Record<string, unknown>) : null;
  const rawProfile =
    typeof rawRecord?.profile === "object" && rawRecord.profile !== null
      ? (rawRecord.profile as Record<string, unknown>)
      : null;
  if (Array.isArray(rawProfile?.members)) {
    for (const m of rawProfile.members) {
      if (
        m &&
        typeof m === "object" &&
        "nickname" in m &&
        (m as Record<string, unknown>).nickname !== undefined
      ) {
        console.error(`Request ${reqId} failed: status 400 Nickname field rejected`);
        return c.json({ error: "Nickname field is not permitted", requestId: reqId }, 400);
      }
    }
  }

  const { profile, lat, lng, lang } = parsed.data;
  const roundLat = Math.round(lat * 100) / 100;
  const roundLng = Math.round(lng * 100) / 100;

  // 1. Get air data for the cell
  const airCacheKey = `air_${roundLat}_${roundLng}`;
  let airData = airCache.get(airCacheKey) as NormalisedAirData | undefined;
  if (!airData) {
    try {
      airData = await fetchAirData(roundLat, roundLng);
      airCache.set(airCacheKey, airData);
    } catch {
      console.error(`Request ${reqId} failed: status 500 Air API Failure`);
      return c.json({ error: "Failed to fetch air quality data", requestId: reqId }, 500);
    }
  }

  // Check plan cache
  const planHash = crypto
    .createHash("sha256")
    .update(JSON.stringify({ profile, aqiBand: airData.aqiBand, lang }))
    .digest("hex");
  const planCacheKey = `plan_${planHash}`;
  const cachedPlan = planCache.get(planCacheKey);
  if (cachedPlan) {
    return c.json(cachedPlan);
  }

  // 2. Filter applicable actions & compute numbers
  const applicableActions = filterApplicableActions(profile, airData);
  const computedList = applicableActions.map((act) =>
    computeActionNumbers(act, profile, airData, lang),
  );
  const computedMap = new Map(computedList.map((c) => [c.id, c]));

  let planSource: "gemini" | "fallback" | "demo" = config.demoMode ? "demo" : "fallback";
  let promptTokens: number | undefined;
  let candidatesTokens: number | undefined;
  let totalTokens: number | undefined;
  let latencyMs = 0;

  let chosenOrder: Array<{ actionId: string; reason?: string }> = [];
  let summary = getTemplateSummary(lang);

  // 3. Call Gemini if enabled
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

  console.log(
    `[PLAN] reqId=${reqId} src=${planSource} latencyMs=${latencyMs} promptTokens=${promptTokens ?? 0} candidateTokens=${candidatesTokens ?? 0} totalTokens=${totalTokens ?? 0}`,
  );

  // Fallback to deterministic ranker if needed
  if (chosenOrder.length === 0) {
    planSource = config.demoMode ? "demo" : "fallback";
    const ranked = rankApplicableActions(Array.from(computedMap.values()), profile);
    chosenOrder = ranked.slice(0, 6).map((item) => ({ actionId: item.id }));
    summary = getTemplateSummary(lang);
  }

  // Build swaps
  const swaps = chosenOrder
    .map((chosen) => {
      const computed = computedMap.get(chosen.actionId);
      if (!computed) return null;

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
        purifierCadrCfm: computed.purifierCadrCfm,
        appliesToMemberIds: computed.appliesToMemberIds,
        reason,
        reasonSource,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  // Active swaps for full day model calculation
  const activeSwapIds = new Set(swaps.map((s) => s.id));
  const dayComparison = computeHouseholdDayComparison({
    profile,
    hourlyForecast: airData.hourlyForecast,
    currentPm25: airData.pm25,
    swapsActive: {
      shiftOutdoorExercise: activeSwapIds.has("shift-outdoor-exercise"),
      exerciseIndoors: activeSwapIds.has("exercise-indoors"),
      purifierBedroom: activeSwapIds.has("purifier-bedroom"),
      shutWindowsPeak: activeSwapIds.has("shut-windows-peak"),
      airHouseCleanWindow: activeSwapIds.has("air-house-clean-window"),
      maskOutdoors: activeSwapIds.has("mask-outdoors"),
    },
  });

  // CPCB band health statement
  const matchedBand = CPCB_AQI_BANDS.find((b) => b.band === airData.aqiBand) ?? CPCB_AQI_BANDS[2];
  const cpcbHealthStatement = matchedBand.healthStatement;

  const responseBody = {
    source: planSource,
    summary,
    swaps,
    currentAqi: airData.currentAqi,
    aqiBand: airData.aqiBand,
    cpcbHealthStatement,
    googleHealthAdvice: airData.healthRecommendations ?? {},
    memberDoses: dayComparison.memberComparisons,
  };

  planCache.set(planCacheKey, responseBody);
  return c.json(responseBody);
});
