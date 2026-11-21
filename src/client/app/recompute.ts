// recompute.ts: Pure helper to recompute family totals in the browser when swaps are toggled.
// Follows AGENTS.md rule 1 and SPEC section 5.

import { computeDayModelSwapImpact, computeHouseholdDayComparison } from "../../shared/day.js";
import type { HouseholdProfile } from "../../shared/schemas.js";

export interface RecomputedTotals {
  memberDoses: Array<{
    memberId: string;
    doseCutPercentage: number;
    cigarettesAvoided: number;
  }>;
  householdCo2WeeklyKg: number;
  householdCo2DailyKg: number;
}

export function recomputeHouseholdTotals(params: {
  profile: HouseholdProfile;
  hourlyForecast: Array<{ time: string; pm25: number }>;
  currentPm25: number;
  activeSwapIds: Set<string>;
}): RecomputedTotals {
  const { profile, hourlyForecast, currentPm25, activeSwapIds } = params;

  const comparison = computeHouseholdDayComparison({
    profile,
    hourlyForecast,
    currentPm25,
    swapsActive: {
      shiftOutdoorExercise: activeSwapIds.has("shift-outdoor-exercise"),
      exerciseIndoors: activeSwapIds.has("exercise-indoors"),
      purifierBedroom: activeSwapIds.has("purifier-bedroom"),
      shutWindowsPeak: activeSwapIds.has("shut-windows-peak"),
      airHouseCleanWindow: activeSwapIds.has("air-house-clean-window"),
      maskOutdoors: activeSwapIds.has("mask-outdoors"),
    },
  });

  // Calculate transport savings directly from factors with no double-counting between transit and WFH
  let co2SavedKgPerDay = 0;
  let co2SavedKgPerWeek = 0;

  const workingDays = profile.commute.workingDaysPerWeek ?? 5;

  const hasMetro = activeSwapIds.has("metro-not-car");
  const hasBus = activeSwapIds.has("bus-not-car");
  const hasCarpool = activeSwapIds.has("carpool");
  const hasWalk = activeSwapIds.has("walk-short-trips");
  const hasWfh = activeSwapIds.has("wfh-day");

  // Determine active transit swap (if any)
  let transitSwapId: "metro-not-car" | "bus-not-car" | "carpool" | "walk-short-trips" | null = null;
  if (hasMetro) transitSwapId = "metro-not-car";
  else if (hasBus) transitSwapId = "bus-not-car";
  else if (hasCarpool) transitSwapId = "carpool";
  else if (hasWalk) transitSwapId = "walk-short-trips";

  if (transitSwapId) {
    const transitImpact = computeDayModelSwapImpact(
      transitSwapId,
      profile,
      hourlyForecast,
      currentPm25,
    );
    const dailySaving = transitImpact.co2SavedKgPerDay ?? 0;
    co2SavedKgPerDay += dailySaving;

    // If WFH is also active, transit applies only to the days actually commuted (workingDays - 1)
    const transitDays = hasWfh ? Math.max(0, workingDays - 1) : workingDays;
    co2SavedKgPerWeek += dailySaving * transitDays;
  }

  if (hasWfh) {
    const wfhImpact = computeDayModelSwapImpact("wfh-day", profile, hourlyForecast, currentPm25);
    // WFH avoids 1 full commute day of the original commute mode
    const wfhWeekly = wfhImpact.co2SavedKgPerWeek ?? 0;
    co2SavedKgPerWeek += wfhWeekly;
  }

  return {
    memberDoses: comparison.memberComparisons.map((c) => ({
      memberId: c.memberId,
      doseCutPercentage: c.doseCutPercentage,
      cigarettesAvoided: c.cigarettesAvoided,
    })),
    householdCo2WeeklyKg: co2SavedKgPerWeek,
    householdCo2DailyKg: co2SavedKgPerDay,
  };
}
