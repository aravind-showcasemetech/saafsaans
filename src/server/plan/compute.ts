// compute.ts: Computes numbers for applicable swaps according to docs/SPEC.md and docs/FACTORS.md.
// Uses src/shared/day.ts for day-model computed actions and avoids invented values.

import fs from "node:fs";
import path from "node:path";
import type { ActionDefinition } from "../../shared/actions.js";
import type { NormalisedAirData } from "../../shared/air-types.js";
import { computeDayModelSwapImpact } from "../../shared/day.js";
import type { HouseholdProfile } from "../../shared/schemas.js";

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
    base.factText = getI18nText(impact.factTextKey, lang);
  }

  if (action.lens === "protect") {
    if (impact.memberImpacts && impact.memberImpacts.length > 0) {
      base.appliesToMemberIds = impact.memberImpacts.map((m) => m.memberId);
      base.appliesToMemberRefs = impact.memberImpacts.map((m) => m.memberRef);
      base.maxDoseCutPercentage = impact.maxDoseCutPercentage;
      base.maxCigarettesAvoided = impact.maxCigarettesAvoided;

      if (action.id === "purifier-bedroom") {
        // Headline numbers: dose cut and cigarettes avoided
        base.savingNumber = impact.maxDoseCutPercentage;
        base.savingUnit = "% dose cut for people sleeping in bedroom";
        base.purifierCadrCfm = impact.purifierCadrCfm;
      } else if (action.id === "mask-outdoors" && impact.maskRange) {
        base.savingRange = {
          min: impact.maskRange.minPercent,
          max: impact.maskRange.maxPercent,
          unit: impact.maskRange.unit,
        };
      } else if (action.id === "shift-outdoor-exercise") {
        base.savingNumber = impact.maxDoseCutPercentage;
        base.savingUnit = "% dose cut from moving exercise to cleanest window";
      } else if (action.id === "exercise-indoors") {
        base.savingNumber = impact.maxDoseCutPercentage;
        base.savingUnit = "% dose cut from exercising indoors";
      } else if (action.id === "shut-windows-peak") {
        base.savingNumber = impact.maxDoseCutPercentage;
        base.savingUnit = "% dose cut from keeping windows shut in peak hours";
      } else if (action.id === "air-house-clean-window") {
        base.savingNumber = impact.maxDoseCutPercentage;
        base.savingUnit = "% dose cut from ventilating in cleanest window";
      }
    }
  } else if (action.lens === "polluteLess") {
    if (action.id === "wfh-day" && impact.co2SavedKgPerWeek !== undefined) {
      base.savingNumber = impact.co2SavedKgPerWeek;
      base.savingUnit = "kg CO2 saved per week";
      base.co2SavedKgPerWeek = impact.co2SavedKgPerWeek;
    } else if (impact.co2SavedKgPerDay !== undefined) {
      base.savingNumber = impact.co2SavedKgPerDay;
      base.savingUnit = "kg CO2 saved per day";
      base.co2SavedKgPerWeek = impact.co2SavedKgPerWeek;
    }
  }

  return base;
}

export function getI18nText(keyPath: string, lang: "en" | "hi" | "te"): string {
  try {
    const filePath = path.resolve(process.cwd(), `src/client/i18n/${lang}.json`);
    const content = fs.existsSync(filePath)
      ? JSON.parse(fs.readFileSync(filePath, "utf-8"))
      : JSON.parse(
          fs.readFileSync(path.resolve(process.cwd(), "src/client/i18n/en.json"), "utf-8"),
        );

    const parts = keyPath.split(".");
    let curr: unknown = content;
    for (const p of parts) {
      if (curr && typeof curr === "object" && p in curr) {
        curr = (curr as Record<string, unknown>)[p];
      } else {
        return "";
      }
    }
    return typeof curr === "string" ? curr : "";
  } catch {
    return "";
  }
}
