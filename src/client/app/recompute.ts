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

  // Calculate transport savings directly from factors
  let co2SavedKgPerDay = 0;
  let co2SavedKgPerWeek = 0;

  const distance = profile.commute.distanceKm ?? 0;
  const trips = profile.commute.tripsPerDay ?? 2;
  const peopleSharing = profile.commute.peopleSharing ?? 1;
  const workingDays = profile.commute.workingDaysPerWeek ?? 5;

  if (activeSwapIds.has("metro-not-car")) {
    const impact = computeDayModelSwapImpact("metro-not-car", profile, hourlyForecast, currentPm25);
    co2SavedKgPerDay += impact.co2SavedKgPerDay ?? 0;
    co2SavedKgPerWeek += impact.co2SavedKgPerWeek ?? 0;
  } else if (activeSwapIds.has("bus-not-car")) {
    const impact = computeDayModelSwapImpact("bus-not-car", profile, hourlyForecast, currentPm25);
    co2SavedKgPerDay += impact.co2SavedKgPerDay ?? 0;
    co2SavedKgPerWeek += impact.co2SavedKgPerWeek ?? 0;
  } else if (activeSwapIds.has("carpool")) {
    const impact = computeDayModelSwapImpact("carpool", profile, hourlyForecast, currentPm25);
    co2SavedKgPerDay += impact.co2SavedKgPerDay ?? 0;
    co2SavedKgPerWeek += impact.co2SavedKgPerWeek ?? 0;
  } else if (activeSwapIds.has("walk-short-trips")) {
    const impact = computeDayModelSwapImpact(
      "walk-short-trips",
      profile,
      hourlyForecast,
      currentPm25,
    );
    co2SavedKgPerDay += impact.co2SavedKgPerDay ?? 0;
    co2SavedKgPerWeek += impact.co2SavedKgPerWeek ?? 0;
  }

  if (activeSwapIds.has("wfh-day")) {
    const impact = computeDayModelSwapImpact("wfh-day", profile, hourlyForecast, currentPm25);
    co2SavedKgPerDay += impact.co2SavedKgPerDay ?? 0;
    co2SavedKgPerWeek += impact.co2SavedKgPerWeek ?? 0;
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
