// dose.ts: Breathing rates, inhaled dose, 24-hour average and cigarettes' worth (FACTORS.md sections 2 and 3).
// Pure functions with no I/O. Results that use a CHOSEN value carry isEstimate: true.

import {
  type ActivityLevel,
  type AgeBand,
  CIGARETTE_EQUIVALENT_PM25,
  INHALATION_RATES_M3_PER_MIN,
} from "../factors.js";

export interface InhalationRateResult {
  rateM3PerHour: number;
  rateM3PerMin: number;
  isEstimate: boolean;
  factorSections: string[];
}

/**
 * Inhalation rate in m3 per hour (and per min) for a given age band and activity level.
 * Falls back safely to 31-40 band if unknown age band is supplied.
 */
export function inhalationRate(
  ageBand: AgeBand | string,
  activity: ActivityLevel,
): InhalationRateResult {
  const meta =
    INHALATION_RATES_M3_PER_MIN[ageBand as AgeBand] ?? INHALATION_RATES_M3_PER_MIN["31-40"];

  const ratePerMin = meta.ratesPerMinute[activity] ?? meta.ratesPerMinute.sedentary;
  const ratePerHour = ratePerMin * 60;

  return {
    rateM3PerHour: ratePerHour,
    rateM3PerMin: ratePerMin,
    isEstimate: meta.status === "CHOSEN" || !INHALATION_RATES_M3_PER_MIN[ageBand as AgeBand],
    factorSections: ["2"],
  };
}

export interface ExposureBlock {
  concentrationUgM3: number;
  durationHours: number;
  ageBand: AgeBand | string;
  activity: ActivityLevel;
}

export interface DailyDoseResult {
  doseUg: number;
  isEstimate: boolean;
  factorSections: string[];
}

/**
 * Computes daily inhaled dose (ug) across an array of exposure blocks:
 * sum(concentration * rate_m3_per_hour * duration_hours)
 */
export function dailyDose(blocks: readonly ExposureBlock[]): DailyDoseResult {
  let totalDose = 0;
  let isEstimate = false;
  const factorSections = new Set<string>();

  for (const block of blocks) {
    const rateInfo = inhalationRate(block.ageBand, block.activity);
    if (rateInfo.isEstimate) isEstimate = true;
    for (const s of rateInfo.factorSections) factorSections.add(s);

    const blockDose =
      Math.max(0, block.concentrationUgM3) *
      rateInfo.rateM3PerHour *
      Math.max(0, block.durationHours);
    totalDose += blockDose;
  }

  return {
    doseUg: totalDose,
    isEstimate,
    factorSections: Array.from(factorSections),
  };
}

export interface DailyAverageExposureBlock {
  concentrationUgM3: number;
  durationHours: number;
}

export interface DailyAverageExposureResult {
  averageConcentrationUgM3: number;
  totalHours: number;
  isEstimate: boolean;
  factorSections: string[];
}

/**
 * Time-weighted average PM2.5 concentration over 24 hours (or supplied total hours):
 * sum(concentration * duration) / sum(duration)
 */
export function dailyAverageExposure(
  blocks: readonly DailyAverageExposureBlock[],
): DailyAverageExposureResult {
  let totalWeighted = 0;
  let totalHours = 0;

  for (const b of blocks) {
    const h = Math.max(0, b.durationHours);
    totalWeighted += Math.max(0, b.concentrationUgM3) * h;
    totalHours += h;
  }

  const avg = totalHours > 0 ? totalWeighted / totalHours : 0;

  return {
    averageConcentrationUgM3: avg,
    totalHours,
    isEstimate: false,
    factorSections: [],
  };
}

export interface CigarettesEquivalentResult {
  cigarettes: number;
  isEstimate: boolean;
  factorSections: string[];
}

export interface CigarettesForDayFailure {
  cigarettes: null;
  reason: string;
  isEstimate: boolean;
  factorSections: string[];
}

export type CigarettesForDayResult =
  | (CigarettesEquivalentResult & { reason?: undefined })
  | CigarettesForDayFailure;

/**
 * Berkeley Earth cigarette equivalence:
 * 1 cigarette per day = 22 ug/m3 PM2.5 24-hour average exposure.
 */
export function cigarettesEquivalent(averageExposureUgM3: number): CigarettesEquivalentResult {
  const safeAvg = Math.max(0, averageExposureUgM3);
  return {
    cigarettes: safeAvg / CIGARETTE_EQUIVALENT_PM25,
    isEstimate: false,
    factorSections: ["3"],
  };
}

/**
 * Berkeley Earth cigarette equivalence for a full day:
 * Returns null with a reason unless the exposure blocks add up to exactly 24 hours.
 */
export function cigarettesForDay(
  blocks: readonly DailyAverageExposureBlock[],
): CigarettesForDayResult {
  let totalHours = 0;
  for (const b of blocks) {
    totalHours += Math.max(0, b.durationHours);
  }

  // Floating point check: exactly 24 hours (within small epsilon)
  if (Math.abs(totalHours - 24) > 1e-6) {
    return {
      cigarettes: null,
      reason: `Exposure blocks must sum to exactly 24 hours; received ${totalHours} hours.`,
      isEstimate: false,
      factorSections: ["3"],
    };
  }

  const avg = dailyAverageExposure(blocks).averageConcentrationUgM3;
  return cigarettesEquivalent(avg);
}
