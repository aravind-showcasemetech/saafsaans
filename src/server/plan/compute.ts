// compute.ts: Computes numbers for applicable swaps according to docs/SPEC.md and docs/FACTORS.md.
// Uses src/shared/day.ts for day-model computed actions and avoids invented values.

import type { ActionDefinition } from "../../shared/actions.js";
import type { NormalisedAirData } from "../../shared/air-types.js";
import { computeDayModelSwapImpact } from "../../shared/day.js";
import type { HouseholdProfile } from "../../shared/schemas.js";
import { serverText } from "../text.js";

export interface ComputedSwapItem {
  id: string;
  lens: "protect" | "polluteLess";
  kind: "computed" | "sourcedFact" | "adviceOnly";
  title: string;
  factorSections: string[];
  isEstimate: boolean;
  appliesToMemberIds?: string[];
  appliesToMemberRefs?: string[];
  maxDoseCutPercentage?: number;
  maxCigarettesAvoided?: number;
  savingNumber?: number;
  savingUnit?: string;
  savingRange?: { min: number; max: number; unit: string };
  factText?: string;
  purifierCadrCfm?: number;
  co2SavedKgPerWeek?: number;
  co2SavedKgPerDay?: number;
  best?: { memberId: string; doseCutPercentage: number };
}

type DayImpact = ReturnType<typeof computeDayModelSwapImpact>;

/** The headline unit for Protect swaps whose headline is the largest dose cut. */
const PROTECT_SAVING_UNITS: Readonly<Record<string, string>> = {
  "purifier-bedroom": "% dose cut for people sleeping in bedroom",
  "shift-outdoor-exercise": "% dose cut from moving exercise to cleanest window",
  "exercise-indoors": "% dose cut from exercising indoors",
  "shut-windows-peak": "% dose cut from keeping windows shut in peak hours",
  "air-house-clean-window": "% dose cut from ventilating in cleanest window",
};

/** Who a Protect swap helps, the best cut, and its headline number or mask range. */
function addProtectNumbers(base: ComputedSwapItem, impact: DayImpact): void {
  const members = impact.memberImpacts ?? [];
  if (members.length === 0) return;
  base.appliesToMemberIds = members.map((m) => m.memberId);
  base.appliesToMemberRefs = members.map((m) => m.memberRef);
  base.maxDoseCutPercentage = impact.maxDoseCutPercentage;
  const best = [...members].sort((a, b) => b.doseCutPercentage - a.doseCutPercentage)[0];
  base.best = { memberId: best.memberId, doseCutPercentage: best.doseCutPercentage };
  base.maxCigarettesAvoided = impact.maxCigarettesAvoided;

  const unit = PROTECT_SAVING_UNITS[base.id];
  if (unit) {
    base.savingNumber = impact.maxDoseCutPercentage;
    base.savingUnit = unit;
  }
  if (base.id === "purifier-bedroom") base.purifierCadrCfm = impact.purifierCadrCfm;
  if (base.id === "mask-outdoors" && impact.maskRange) {
    base.savingRange = {
      min: impact.maskRange.minPercent,
      max: impact.maskRange.maxPercent,
      unit: impact.maskRange.unit,
    };
  }
}

/** CO2 saved: a week for a work-from-home day, else a day. */
function addPolluteLessNumbers(base: ComputedSwapItem, impact: DayImpact): void {
  base.co2SavedKgPerDay = impact.co2SavedKgPerDay;
  if (base.id === "wfh-day" && impact.co2SavedKgPerWeek !== undefined) {
    base.savingNumber = impact.co2SavedKgPerWeek;
    base.savingUnit = "kg CO2 saved per week";
    base.co2SavedKgPerWeek = impact.co2SavedKgPerWeek;
  } else if (impact.co2SavedKgPerDay !== undefined) {
    base.savingNumber = impact.co2SavedKgPerDay;
    base.savingUnit = "kg CO2 saved per day";
    base.co2SavedKgPerWeek = impact.co2SavedKgPerWeek;
  }
}

export function computeActionNumbers(
  action: ActionDefinition,
  profile: HouseholdProfile,
  airData: NormalisedAirData,
  lang: "en" | "hi" | "te" = "en",
): ComputedSwapItem {
  const impact = computeDayModelSwapImpact(
    action.id,
    profile,
    airData.hourlyForecast,
    airData.pm25,
  );

  const base: ComputedSwapItem = {
    id: action.id,
    lens: action.lens,
    kind: action.kind,
    title: action.title,
    factorSections:
      impact.factorSections.length > 0 ? impact.factorSections : [...action.factorSections],
    isEstimate: impact.isEstimate,
  };

  // Sourced fact text or advice text from i18n
  if (impact.factTextKey) {
    base.factText = serverText(impact.factTextKey, lang);
  }

  if (action.lens === "protect") addProtectNumbers(base, impact);
  else addPolluteLessNumbers(base, impact);
  return base;
}
