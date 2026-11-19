// impact.ts: Pure functions with no I/O for SaafSaans.
// Any result that uses a CHOSEN value carries isEstimate: true and the FACTORS.md sections it used.
// Keep full precision; rounding happens only in the UI.

import {
  AIR_EXCHANGE_OPEN_A,
  AIR_EXCHANGE_SHUT_A,
  type ActivityLevel,
  type AgeBand,
  CADR_MULTIPLIER,
  CFM_TO_M3_PER_HOUR,
  CIGARETTE_EQUIVALENT_PM25,
  CPCB_AQI_BANDS,
  DEPOSITION_RATE_K,
  INHALATION_RATES_M3_PER_MIN,
  MASK_PROTECTION,
  METRO_SAVING_FRACTION,
  PENETRATION_FACTOR_P,
  STANDARD_CEILING_HEIGHT_FT,
  TRANSPORT_CO2_FACTORS,
  type TravelMode,
  WINTER_WEEKS,
} from "./factors.js";

export type AqiBandName =
  | "Good"
  | "Satisfactory"
  | "Moderately polluted"
  | "Poor"
  | "Very Poor"
  | "Severe";

export interface AqiBandResult {
  band: AqiBandName;
  healthStatement: string;
  isEstimate: boolean;
  factorSections: string[];
}

/**
 * Returns the CPCB AQI band and health statement corresponding to a 24-hour PM2.5 concentration.
 * Handled edge cases: exactly on boundaries (e.g. 30, 30.1, 250, 250.1).
 */
export function aqiBandFromPm25(pm25: number): AqiBandResult {
  const safePm25 = Math.max(0, pm25);

  const matched =
    CPCB_AQI_BANDS.find((b: (typeof CPCB_AQI_BANDS)[number]) => safePm25 <= b.pm25Max) ??
    CPCB_AQI_BANDS[CPCB_AQI_BANDS.length - 1];

  return {
    band: matched.band,
    healthStatement: matched.healthStatement,
    isEstimate: false,
    factorSections: ["1"],
  };
}

export interface IndoorRatioResult {
  ratio: number;
  isEstimate: boolean;
  factorSections: string[];
}

export interface IndoorRatioOptions {
  windowsOpen: boolean;
  cadrCfm?: number;
  roomVolumeCuFt?: number;
}

/**
 * Computes the ratio of indoor to outdoor PM2.5 (C_in / C_out) using single-room mass balance:
 * C_in / C_out = (P * a) / (a + k + (CADR_m3h / V_m3))
 * Note that CADR(cfm) / V(cu.ft) * 60 gives CADR in air changes per hour (1/h), which is equivalent
 * to CADR(m3/h) / V(m3).
 */
export function indoorRatio(options: IndoorRatioOptions): IndoorRatioResult {
  const P = PENETRATION_FACTOR_P; // SOURCED (0.97)
  const k = DEPOSITION_RATE_K; // CHOSEN (0.3)
  const a = options.windowsOpen ? AIR_EXCHANGE_OPEN_A : AIR_EXCHANGE_SHUT_A;
  const sections = ["4"];
  // k is always CHOSEN. If windows are open, open air exchange is also CHOSEN.
  const isEstimate = true;

  let cadrLossRate = 0;
  if (
    options.cadrCfm &&
    options.cadrCfm > 0 &&
    options.roomVolumeCuFt &&
    options.roomVolumeCuFt > 0
  ) {
    cadrLossRate = (options.cadrCfm / options.roomVolumeCuFt) * 60;
  }

  const ratio = (P * a) / (a + k + cadrLossRate);

  return {
    ratio,
    isEstimate,
    factorSections: sections,
  };
}

export interface IndoorPm25Result {
  indoorPm25: number;
  ratio: number;
  isEstimate: boolean;
  factorSections: string[];
}

/**
 * Computes indoor PM2.5 given outdoor PM2.5 and room / window / purifier options.
 */
export function indoorPm25(outdoorPm25: number, options: IndoorRatioOptions): IndoorPm25Result {
  const safeOutdoor = Math.max(0, outdoorPm25);
  const ratioRes = indoorRatio(options);
  return {
    indoorPm25: safeOutdoor * ratioRes.ratio,
    ratio: ratioRes.ratio,
    isEstimate: ratioRes.isEstimate,
    factorSections: ratioRes.factorSections,
  };
}

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

export interface MinPurifierCadrResult {
  minCadrCfm: number;
  minCadrM3PerHour: number;
  isEstimate: boolean;
  factorSections: string[];
}

/**
 * AHAM / US EPA purifier CADR rule:
 * CADR (cfm) = 2/3 * room area (sq ft) * (ceiling height (ft) / 8 ft)
 */
export function minPurifierCadr(
  roomAreaSqFt: number,
  ceilingHeightFt: number = STANDARD_CEILING_HEIGHT_FT,
): MinPurifierCadrResult {
  const safeArea = Math.max(0, roomAreaSqFt);
  const safeHeight = Math.max(0, ceilingHeightFt);

  const cfm = CADR_MULTIPLIER * safeArea * (safeHeight / STANDARD_CEILING_HEIGHT_FT);
  const m3PerHour = cfm * CFM_TO_M3_PER_HOUR;

  return {
    minCadrCfm: cfm,
    minCadrM3PerHour: m3PerHour,
    isEstimate: false,
    factorSections: ["5"],
  };
}

export interface CommuteCo2SavedOptions {
  oldMode: TravelMode;
  newMode: "metro" | "bus" | "walk_cycle" | "carpool";
  distanceKm: number;
  peopleSharingOld?: number;
  carpoolTotalPassengers?: number;
  tripsPerDay?: number;
  workingDaysPerWeek?: number;
}

export interface CommuteEstimateFlags {
  isEstimateDay: boolean;
  isEstimateWeek: boolean;
  isEstimateWinter: boolean;
}

export interface CommuteCo2SavedResult {
  kgCo2SavedPerDay: number;
  kgCo2SavedPerWeek: number;
  kgCo2SavedPerWinter: number;
  isEstimate: boolean;
  factorSections: string[];
  isEstimateDay: boolean;
  isEstimateWeek: boolean;
  isEstimateWinter: boolean;
  factorSectionsDay: string[];
  factorSectionsWeek: string[];
  factorSectionsWinter: string[];
  factorSectionsByPeriod: {
    day: string[];
    week: string[];
    winter: string[];
  };
}

/**
 * Calculates commute CO2 saved per day, per week (working days) and per winter (17 weeks).
 */
export function commuteCo2Saved(options: CommuteCo2SavedOptions): CommuteCo2SavedResult {
  const distance = Math.max(0, options.distanceKm);
  const trips = options.tripsPerDay ?? 1;
  const daysPerWeek = options.workingDaysPerWeek ?? 5;
  const peopleSharing = Math.max(1, options.peopleSharingOld ?? 1);

  let oldFactor = 0;
  if (options.oldMode in TRANSPORT_CO2_FACTORS) {
    oldFactor =
      TRANSPORT_CO2_FACTORS[options.oldMode as keyof typeof TRANSPORT_CO2_FACTORS].kgCo2PerKm;
  }

  const oldCo2PerPersonKm = oldFactor / peopleSharing;
  let savedPerPersonKm = 0;

  // Metro savings is an estimate based on Hyderabad Metro's approximate 97% claim (section 9).
  // Other modes (bus, walk_cycle, carpool) use sourced factors from section 9.
  const isMetro = options.newMode === "metro";
  const isEstimateDay = isMetro;
  const isEstimateWeek = isMetro;
  // Per-winter figure is always an estimate because 17 weeks is CHOSEN (section 9).
  const isEstimateWinter = true;

  if (options.newMode === "walk_cycle") {
    savedPerPersonKm = oldCo2PerPersonKm;
  } else if (options.newMode === "metro") {
    // 97% less than car / two wheeler
    savedPerPersonKm = oldCo2PerPersonKm * METRO_SAVING_FRACTION;
  } else if (options.newMode === "bus") {
    const busPaxFactor = TRANSPORT_CO2_FACTORS.bus.kgCo2PerKm; // 0.015161
    savedPerPersonKm = Math.max(0, oldCo2PerPersonKm - busPaxFactor);
  } else if (options.newMode === "carpool") {
    const carpoolPax = Math.max(2, options.carpoolTotalPassengers ?? 3);
    const newCo2PerPersonKm = oldFactor / carpoolPax;
    savedPerPersonKm = Math.max(0, oldCo2PerPersonKm - newCo2PerPersonKm);
  }

  const savedPerDay = distance * trips * savedPerPersonKm;
  const savedPerWeek = savedPerDay * daysPerWeek;
  const savedPerWinter = savedPerWeek * WINTER_WEEKS; // WINTER_WEEKS is CHOSEN

  // Overall result isEstimate is true if any figure is an estimate
  const isEstimate = true;

  return {
    kgCo2SavedPerDay: savedPerDay,
    kgCo2SavedPerWeek: savedPerWeek,
    kgCo2SavedPerWinter: savedPerWinter,
    isEstimate,
    factorSections: ["9"],
    isEstimateDay,
    isEstimateWeek,
    isEstimateWinter,
    factorSectionsDay: ["9"],
    factorSectionsWeek: ["9"],
    factorSectionsWinter: ["9"],
    factorSectionsByPeriod: {
      day: ["9"],
      week: ["9"],
      winter: ["9"],
    },
  };
}

export interface VehicleKmAvoidedResult {
  vehicleKmAvoidedPerDay: number;
  vehicleKmAvoidedPerWeek: number;
  isEstimate: boolean;
  factorSections: string[];
}

/**
 * Direct vehicle-km taken off the road.
 * For private vehicle switch to metro/bus/walk_cycle or WFH, it's the direct vehicle km avoided.
 */
export function vehicleKmAvoided(
  distanceKm: number,
  tripsPerDay = 1,
  workingDaysPerWeek = 5,
): VehicleKmAvoidedResult {
  const safeDistance = Math.max(0, distanceKm);
  const perDay = safeDistance * Math.max(0, tripsPerDay);
  const perWeek = perDay * Math.max(0, workingDaysPerWeek);

  return {
    vehicleKmAvoidedPerDay: perDay,
    vehicleKmAvoidedPerWeek: perWeek,
    isEstimate: false,
    factorSections: ["9"],
  };
}

export interface CommunityTotalResult {
  totalWeeklySaving: number;
  homesCount: number;
  isEstimate: boolean;
  factorSections: string[];
}

/**
 * Community share card calculation: weekly household savings * homes taking part.
 */
export function communityTotal(
  householdWeeklySaving: number,
  homesCount: number,
): CommunityTotalResult {
  const safeHomes = Math.max(0, Math.floor(homesCount));
  const safeSaving = Math.max(0, householdWeeklySaving);

  return {
    totalWeeklySaving: safeSaving * safeHomes,
    homesCount: safeHomes,
    isEstimate: false,
    factorSections: ["9"],
  };
}

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

export interface HourlyForecastItem {
  time: string; // ISO 8601 string
  pm25: number;
}

export interface WindowResult {
  startTime: string; // ISO 8601 string
  endTime: string; // ISO 8601 string
  startHour: number; // Asia/Kolkata local hour (0-23)
  endHour: number; // Asia/Kolkata local hour (0-23)
  averagePm25: number;
}

export interface CleanestAndDirtiestWindowsOptions {
  windowSizeHours?: number;
  allowedStartHour?: number; // default 6 (06:00)
  allowedEndHour?: number; // default 21 (21:00)
  date?: string; // "YYYY-MM-DD" in Asia/Kolkata time
}

export interface CleanestAndDirtiestWindowsResult {
  cleanest: WindowResult | null;
  dirtiest: WindowResult | null;
  isEstimate: boolean;
  factorSections: string[];
}

/**
 * Finds the cleanest and dirtiest multi-hour window from an hourly forecast.
 * - Works in Asia/Kolkata time (UTC+05:30).
 * - Only uses runs of consecutive hours (no gaps > 1 hour).
 * - Respects allowed local hours (default 06:00 to 21:00) and optional date filter.
 * - Returns window start and end as ISO times.
 */
export function cleanestAndDirtiestWindows(
  hourlyForecast: readonly HourlyForecastItem[],
  options?: CleanestAndDirtiestWindowsOptions | number,
): CleanestAndDirtiestWindowsResult {
  const opts: CleanestAndDirtiestWindowsOptions =
    typeof options === "number" ? { windowSizeHours: options } : (options ?? {});

  const windowSize = Math.max(1, opts.windowSizeHours ?? 3);
  const allowedStartHour = opts.allowedStartHour ?? 6;
  const allowedEndHour = opts.allowedEndHour ?? 21;
  const filterDate = opts.date;

  if (!hourlyForecast || hourlyForecast.length === 0) {
    return {
      cleanest: null,
      dirtiest: null,
      isEstimate: false,
      factorSections: ["8"],
    };
  }

  // Parse and sort items chronologically
  const parsed = hourlyForecast
    .map((item) => ({
      time: item.time,
      epochMs: new Date(item.time).getTime(),
      pm25: Math.max(0, item.pm25),
    }))
    .filter((item) => !Number.isNaN(item.epochMs))
    .sort((a, b) => a.epochMs - b.epochMs);

  if (parsed.length === 0) {
    return {
      cleanest: null,
      dirtiest: null,
      isEstimate: false,
      factorSections: ["8"],
    };
  }

  // Deduplicate identical timestamps if any
  const uniqueItems: typeof parsed = [];
  for (const item of parsed) {
    if (uniqueItems.length === 0 || uniqueItems[uniqueItems.length - 1].epochMs !== item.epochMs) {
      uniqueItems.push(item);
    }
  }

  const KOLKATA_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const ONE_HOUR_MS = 60 * 60 * 1000;

  // Split into consecutive runs where gap between adjacent items is exactly 1 hour
  const consecutiveRuns: (typeof parsed)[] = [];
  let currentRun: typeof parsed = [];

  for (let i = 0; i < uniqueItems.length; i++) {
    const item = uniqueItems[i];
    if (currentRun.length === 0) {
      currentRun.push(item);
    } else {
      const prev = currentRun[currentRun.length - 1];
      if (item.epochMs - prev.epochMs === ONE_HOUR_MS) {
        currentRun.push(item);
      } else {
        consecutiveRuns.push(currentRun);
        currentRun = [item];
      }
    }
  }
  if (currentRun.length > 0) {
    consecutiveRuns.push(currentRun);
  }

  // Helper to extract Asia/Kolkata date string (YYYY-MM-DD) and hour (0-23)
  function getKolkataTimeInfo(epochMs: number) {
    const kolkataDate = new Date(epochMs + KOLKATA_OFFSET_MS);
    const dateStr = kolkataDate.toISOString().slice(0, 10);
    const hour = kolkataDate.getUTCHours();
    return { dateStr, hour };
  }

  interface CandidateWindow {
    startTime: string;
    endTime: string;
    startHour: number;
    endHour: number;
    averagePm25: number;
  }

  const candidates: CandidateWindow[] = [];

  for (const run of consecutiveRuns) {
    if (run.length < windowSize) continue;

    for (let i = 0; i <= run.length - windowSize; i++) {
      const slice = run.slice(i, i + windowSize);
      const startInfo = getKolkataTimeInfo(slice[0].epochMs);
      const endEpochMs = slice[slice.length - 1].epochMs + ONE_HOUR_MS;
      const endInfo = getKolkataTimeInfo(endEpochMs);

      // Check date filter if provided (matched against window start date in Asia/Kolkata)
      if (filterDate && startInfo.dateStr !== filterDate) {
        continue;
      }

      // Check allowed hours. All hours in the window must fall within allowedStartHour..allowedEndHour.
      // An hour block starting at local `h` spans [h, h+1). Thus each block hour must satisfy:
      // h >= allowedStartHour && h + 1 <= allowedEndHour.
      let hoursAllowed = true;
      for (const item of slice) {
        const itemHour = getKolkataTimeInfo(item.epochMs).hour;
        if (itemHour < allowedStartHour || itemHour + 1 > allowedEndHour) {
          hoursAllowed = false;
          break;
        }
      }

      if (!hoursAllowed) continue;

      const sum = slice.reduce((acc, curr) => acc + curr.pm25, 0);
      const avg = sum / windowSize;

      candidates.push({
        startTime: new Date(slice[0].epochMs).toISOString(),
        endTime: new Date(endEpochMs).toISOString(),
        startHour: startInfo.hour,
        endHour: endInfo.hour,
        averagePm25: avg,
      });
    }
  }

  if (candidates.length === 0) {
    return {
      cleanest: null,
      dirtiest: null,
      isEstimate: false,
      factorSections: ["8"],
    };
  }

  let cleanest = candidates[0];
  let dirtiest = candidates[0];

  for (const cand of candidates) {
    if (cand.averagePm25 < cleanest.averagePm25) {
      cleanest = cand;
    }
    if (cand.averagePm25 > dirtiest.averagePm25) {
      dirtiest = cand;
    }
  }

  return {
    cleanest: {
      startTime: cleanest.startTime,
      endTime: cleanest.endTime,
      startHour: cleanest.startHour,
      endHour: cleanest.endHour,
      averagePm25: cleanest.averagePm25,
    },
    dirtiest: {
      startTime: dirtiest.startTime,
      endTime: dirtiest.endTime,
      startHour: dirtiest.startHour,
      endHour: dirtiest.endHour,
      averagePm25: dirtiest.averagePm25,
    },
    isEstimate: false,
    factorSections: ["8"],
  };
}
