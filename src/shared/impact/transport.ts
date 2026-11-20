// transport.ts: CO2 avoided, vehicle-km off the road and community totals (FACTORS.md section 9).
// Pure functions with no I/O. Results that use a CHOSEN value carry isEstimate: true.

import {
  METRO_SAVING_FRACTION,
  TRANSPORT_CO2_FACTORS,
  type TravelMode,
  WINTER_WEEKS,
} from "../factors.js";

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
