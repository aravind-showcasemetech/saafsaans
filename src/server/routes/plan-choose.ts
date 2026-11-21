// plan-choose.ts: Which swaps a plan shows and why. Gemini picks ids from the applicable
// catalogue and explains them (AGENTS.md rule 2); without a usable reply the ranker decides.
// Every number on a swap comes from computeActionNumbers, never from the model.
import type { ActionDefinition } from "../../shared/actions.js";
import type { HouseholdProfile } from "../../shared/schemas.js";
import type { GeminiDeps } from "../gemini/client.js";
import {
  anonymiseMembersForGemini,
  commuteForGemini,
  containsDigit,
  sanitizeModelText,
} from "../gemini/common.js";
import type { GeminiPlanResponse } from "../gemini/common.js";
import { callGeminiChoosePlan } from "../gemini/plan.js";
import { logEvent } from "../log.js";
import {
  type ComputedSwapItem,
  getTemplateReason,
  getTemplateSummary,
  rankApplicableActions,
} from "../plan.js";
import type { Lang } from "../text.js";

export const MAX_SWAPS = 6;

type Chosen = { actionId: string; reason?: string };

export interface ChoosePlanInput {
  gemini: GeminiDeps | null;
  profile: HouseholdProfile;
  applicable: ActionDefinition[];
  computed: Map<string, ComputedSwapItem>;
  aqiBand: string;
  lang: Lang;
  requestId: string;
}

/** Only ids from the applicable catalogue, no repeats, at most six. */
function validPicks(swaps: Chosen[], computed: Map<string, ComputedSwapItem>): Chosen[] {
  const seen = new Set<string>();
  const out: Chosen[] = [];
  for (const swap of swaps) {
    if (computed.has(swap.actionId) && !seen.has(swap.actionId) && seen.size < MAX_SWAPS) {
      seen.add(swap.actionId);
      out.push(swap);
    }
  }
  return out;
}

/** Asks Gemini to pick and explain; place names and nicknames are never sent. */
async function askGemini(
  input: ChoosePlanInput,
  gemini: GeminiDeps,
): Promise<GeminiPlanResponse | null> {
  const { profile, applicable, aqiBand, lang, requestId } = input;
  const result = await callGeminiChoosePlan({
    gemini,
    anonymisedProfile: {
      members: anonymiseMembersForGemini(profile.members),
      commute: commuteForGemini(profile.commute),
      home: profile.home,
    },
    applicableActions: applicable.map((a) => ({
      id: a.id,
      title: a.title,
      lens: a.lens,
      kind: a.kind,
    })),
    aqiBand,
    lang,
  });
  logEvent("info", "gemini_plan", {
    requestId,
    ok: Boolean(result.data),
    latencyMs: result.latencyMs,
    totalTokens: result.totalTokens,
  });
  return result.data ?? null;
}

/** The chosen swaps, the family summary, and whether Gemini made the choice. */
export async function choosePlan(
  input: ChoosePlanInput,
): Promise<{ chosen: Chosen[]; summary: string; fromModel: boolean }> {
  const reply = input.gemini ? await askGemini(input, input.gemini) : null;
  const picks = reply ? validPicks(reply.swaps, input.computed) : [];
  if (reply && picks.length > 0) {
    const modelSummary = sanitizeModelText(reply.familySummary);
    const summary =
      modelSummary && !containsDigit(modelSummary)
        ? modelSummary.slice(0, 400)
        : getTemplateSummary(input.lang);
    return { chosen: picks, summary, fromModel: true };
  }
  const ranked = rankApplicableActions(Array.from(input.computed.values()), input.profile);
  return {
    chosen: ranked.slice(0, MAX_SWAPS).map((item) => ({ actionId: item.id })),
    summary: getTemplateSummary(input.lang),
    fromModel: false,
  };
}

/** One swap as the plan sends it: the computed numbers plus a model or template reason. */
export function swapResponse(item: ComputedSwapItem, pick: Chosen, fromModel: boolean, lang: Lang) {
  const modelReason = pick.reason ? sanitizeModelText(pick.reason) : "";
  const useModel = fromModel && modelReason !== "" && !containsDigit(modelReason);
  return {
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
    best: item.best,
    co2SavedKgPerDay: item.co2SavedKgPerDay,
    co2SavedKgPerWeek: item.co2SavedKgPerWeek,
    reason: useModel ? modelReason.slice(0, 240) : getTemplateReason(item.id, lang),
    reasonSource: useModel ? ("gemini" as const) : ("template" as const),
    reasonLang: lang,
  };
}
