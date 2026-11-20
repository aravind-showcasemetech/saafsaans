// mask.ts: Real-world mask protection, always a range (FACTORS.md section 7).
// Pure functions with no I/O. Results that use a CHOSEN value carry isEstimate: true.

import { type ActivityLevel, type AgeBand, MASK_PROTECTION } from "../factors.js";
import { inhalationRate } from "./dose.js";

export interface MaskSavingRangeResult {
  baseDoseUg: number;
  minSavedUg: number;
  maxSavedUg: number;
  remainingMinUg: number;
  remainingMaxUg: number;
  minReductionPercent: number;
  maxReductionPercent: number;
  isEstimate: boolean;
  factorSections: string[];
}

/**
 * Real-world mask protection range while active (from Cherrie et al. 2018 in Section 7):
 * 34% (loose) to 93% (well-fitted N95).
 */
export function maskSavingRange(
  outdoorPm25: number,
  ageBand: AgeBand | string,
  activity: ActivityLevel,
  durationHours: number,
): MaskSavingRangeResult {
  const rateInfo = inhalationRate(ageBand, activity);
  const dose = Math.max(0, outdoorPm25) * rateInfo.rateM3PerHour * Math.max(0, durationHours);

  const minSaved = dose * MASK_PROTECTION.activeReductionMin; // 34%
  const maxSaved = dose * MASK_PROTECTION.activeReductionMax; // 93%

  const isEstimate = rateInfo.isEstimate;
  const factorSections = ["7"];
  for (const s of rateInfo.factorSections) factorSections.push(s);

  return {
    baseDoseUg: dose,
    minSavedUg: minSaved,
    maxSavedUg: maxSaved,
    remainingMinUg: dose - maxSaved,
    remainingMaxUg: dose - minSaved,
    minReductionPercent: MASK_PROTECTION.activeReductionMin * 100,
    maxReductionPercent: MASK_PROTECTION.activeReductionMax * 100,
    isEstimate,
    factorSections,
  };
}
