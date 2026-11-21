// swaps.ts: The impact of one swap for this household, from the day model and FACTORS.md rules.
import { cleanestAndDirtiestWindows } from "../impact/index.js";
import type { HouseholdProfile } from "../schemas.js";
import type { SwapImpactResult } from "./day-model-types.js";
import { createHourlyForecastLookup } from "./hourly.js";
import { factOrAdviceImpact } from "./swaps-facts.js";
import { protectImpact } from "./swaps-protect.js";
import { transportImpact } from "./swaps-transport.js";

/**
 * Computes the impact of one swap:
 * - shift-outdoor-exercise: compare exercise time with the cleanest window
 * - purifier-bedroom: dose cut and cigarettes for people sleeping there; CADR is the second line
 * - shut-windows-peak: windows shut in the dirtiest hours
 * - mask-outdoors: members commuting or working outdoors, for their real time outside, as a range
 */
export function computeDayModelSwapImpact(
  swapId: string,
  profile: HouseholdProfile,
  hourlyForecast: readonly { time: string; pm25: number }[],
  currentPm25: number,
): SwapImpactResult {
  const windows = cleanestAndDirtiestWindows(hourlyForecast);
  const ctx = {
    profile,
    getOutdoorPm25: createHourlyForecastLookup(hourlyForecast, currentPm25),
    cleanest: windows.cleanest
      ? { startHour: windows.cleanest.startHour, endHour: windows.cleanest.endHour }
      : null,
    dirtiest: windows.dirtiest
      ? { startHour: windows.dirtiest.startHour, endHour: windows.dirtiest.endHour }
      : null,
  };

  return (
    protectImpact(swapId, ctx) ??
    factOrAdviceImpact(swapId, profile) ??
    transportImpact(swapId, profile) ?? {
      swapId,
      applicable: false,
      lens: "protect",
      kind: "adviceOnly",
      isEstimate: false,
      factorSections: [],
    }
  );
}
