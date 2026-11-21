// totals.ts: The household day with and without swaps, compared for each member.
import { cleanestAndDirtiestWindows } from "../impact/index.js";
import type {
  HouseholdDayModelOptions,
  MemberDayComparison,
  MemberDaySchedule,
} from "./day-model-types.js";
import { createHourlyForecastLookup } from "./hourly.js";
import { computeMemberDaySchedule } from "./schedule.js";

/**
 * Computes percentage dose cut, avoiding division by zero and returning a non-negative number.
 */
export function calculateDoseCutPercentage(baseDoseUg: number, withSwapsDoseUg: number): number {
  if (baseDoseUg <= 0) return 0;
  return Math.max(0, ((baseDoseUg - withSwapsDoseUg) / baseDoseUg) * 100);
}

/**
 * Runs the full household day model comparing baseline to with-swaps state.
 */
export function computeHouseholdDayComparison(options: HouseholdDayModelOptions): {
  baseSchedules: MemberDaySchedule[];
  withSwapsSchedules: MemberDaySchedule[];
  memberComparisons: MemberDayComparison[];
} {
  const { profile, hourlyForecast, currentPm25, swapsActive = {} } = options;
  const getOutdoorPm25 = createHourlyForecastLookup(hourlyForecast, currentPm25);

  const windows = cleanestAndDirtiestWindows(hourlyForecast);
  const cleanest = windows.cleanest
    ? { startHour: windows.cleanest.startHour, endHour: windows.cleanest.endHour }
    : null;
  const dirtiest = windows.dirtiest
    ? { startHour: windows.dirtiest.startHour, endHour: windows.dirtiest.endHour }
    : null;

  const baseSchedules: MemberDaySchedule[] = [];
  const withSwapsSchedules: MemberDaySchedule[] = [];
  const memberComparisons: MemberDayComparison[] = [];

  profile.members.forEach((member, idx) => {
    const memberRef = `m${idx + 1}`;
    const base = computeMemberDaySchedule(
      member,
      profile,
      getOutdoorPm25,
      cleanest,
      dirtiest,
      {},
      memberRef,
    );
    const withSwaps = computeMemberDaySchedule(
      member,
      profile,
      getOutdoorPm25,
      cleanest,
      dirtiest,
      swapsActive,
      memberRef,
    );

    baseSchedules.push(base);
    withSwapsSchedules.push(withSwaps);

    const doseCutPercentage = calculateDoseCutPercentage(base.totalDoseUg, withSwaps.totalDoseUg);

    const cigarettesAvoided = Math.max(0, base.cigarettesForDay - withSwaps.cigarettesForDay);

    const allFactorSections = Array.from(
      new Set([...base.factorSections, ...withSwaps.factorSections]),
    );

    memberComparisons.push({
      memberId: member.id,
      memberRef,
      nickname: member.nickname ?? memberRef,
      baseDoseUg: base.totalDoseUg,
      withSwapsDoseUg: withSwaps.totalDoseUg,
      doseCutPercentage,
      baseAvgExposureUgM3: base.avgPm25,
      withSwapsAvgExposureUgM3: withSwaps.avgPm25,
      baseCigarettes: base.cigarettesForDay,
      withSwapsCigarettes: withSwaps.cigarettesForDay,
      cigarettesAvoided,
      isEstimate: base.isEstimate || withSwaps.isEstimate,
      factorSections: allFactorSections,
    });
  });

  return {
    baseSchedules,
    withSwapsSchedules,
    memberComparisons,
  };
}
