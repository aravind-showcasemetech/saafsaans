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
} from "./factors";

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

  for (const b of CPCB_AQI_BANDS) {
    if (safePm25 <= b.pm25Max) {
      return {
        band: b.band,
        healthStatement: b.healthStatement,
        isEstimate: false,
        factorSections: ["1"],
      };
    }
  }

  // Fallback for extreme values (above 500 AQI / 250+ PM2.5)
  const severe = CPCB_AQI_BANDS[CPCB_AQI_BANDS.length - 1];
  return {
    band: severe.band,
    healthStatement: severe.healthStatement,
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

export interface CommuteCo2SavedResult {
  kgCo2SavedPerDay: number;
  kgCo2SavedPerWeek: number;
  kgCo2SavedPerWinter: number;
  isEstimate: boolean;
  factorSections: string[];
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
  let isEstimate = false;
  const factorSections = ["9"];

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

  // Winter duration is CHOSEN (section 9)
  isEstimate = true;

  return {
    kgCo2SavedPerDay: savedPerDay,
    kgCo2SavedPerWeek: savedPerWeek,
    kgCo2SavedPerWinter: savedPerWinter,
    isEstimate,
    factorSections,
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
  hour: number;
  pm25: number;
}

export interface WindowResult {
  startHour: number;
  endHour: number;
  averagePm25: number;
}

export interface CleanestAndDirtiestWindowsResult {
  cleanest: WindowResult | null;
  dirtiest: WindowResult | null;
  isEstimate: boolean;
  factorSections: string[];
}

/**
 * Finds the cleanest and dirtiest multi-hour window (default windowSizeHours = 3)
 * from an hourly forecast.
 * Edge cases: empty forecast, forecast shorter than windowSize.
 */
export function cleanestAndDirtiestWindows(
  hourlyForecast: readonly HourlyForecastItem[],
  windowSizeHours = 3,
): CleanestAndDirtiestWindowsResult {
  if (!hourlyForecast || hourlyForecast.length === 0) {
    return {
      cleanest: null,
      dirtiest: null,
      isEstimate: false,
      factorSections: ["8"],
    };
  }

  const effectiveWindowSize = Math.max(1, Math.min(windowSizeHours, hourlyForecast.length));

  let minAvg = Number.POSITIVE_INFINITY;
  let maxAvg = Number.NEGATIVE_INFINITY;
  let cleanestWin: WindowResult | null = null;
  let dirtiestWin: WindowResult | null = null;

  for (let i = 0; i <= hourlyForecast.length - effectiveWindowSize; i++) {
    const slice = hourlyForecast.slice(i, i + effectiveWindowSize);
    const sum = slice.reduce((acc, curr) => acc + curr.pm25, 0);
    const avg = sum / effectiveWindowSize;

    if (avg < minAvg) {
      minAvg = avg;
      cleanestWin = {
        startHour: slice[0].hour,
        endHour: (slice[slice.length - 1].hour + 1) % 24,
        averagePm25: avg,
      };
    }

    if (avg > maxAvg) {
      maxAvg = avg;
      dirtiestWin = {
        startHour: slice[0].hour,
        endHour: (slice[slice.length - 1].hour + 1) % 24,
        averagePm25: avg,
      };
    }
  }

  return {
    cleanest: cleanestWin,
    dirtiest: dirtiestWin,
    isEstimate: false,
    factorSections: ["8"],
  };
}
