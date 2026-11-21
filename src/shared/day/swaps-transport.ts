// swaps-transport.ts: Pollute less swaps: CO2 avoided and vehicle-km off the road (FACTORS.md section 9).
import { METRO_SAVING_FRACTION, TRANSPORT_CO2_FACTORS, type TravelMode } from "../factors.js";
import type { HouseholdProfile } from "../schemas.js";
import type { SwapImpactResult } from "./day-model-types.js";

const CAR_MODES = [
  "petrol_car_small",
  "petrol_car",
  "petrol_sedan",
  "diesel_car",
  "diesel_sedan",
  "cng_car",
];
const MOTORISED_MODES = [...CAR_MODES, "scooter", "motorcycle", "auto"];
const TRANSPORT_SWAP_IDS = new Set([
  "metro-not-car",
  "bus-not-car",
  "carpool",
  "walk-short-trips",
  "wfh-day",
]);

function notApplicable(swapId: string): SwapImpactResult {
  return {
    swapId,
    applicable: false,
    lens: "polluteLess",
    kind: "computed",
    isEstimate: false,
    factorSections: ["9"],
  };
}

/** The commute as the formulas need it, with the current mode's CO2 per person-km. */
function commuteOf(profile: HouseholdProfile) {
  const mode = profile.commute.mode as TravelMode;
  const peopleSharing = profile.commute.peopleSharing ?? 1;
  const oldFactor =
    mode in TRANSPORT_CO2_FACTORS
      ? TRANSPORT_CO2_FACTORS[mode as keyof typeof TRANSPORT_CO2_FACTORS].kgCo2PerKm
      : 0;
  return {
    mode,
    distance: profile.commute.distanceKm ?? 0,
    trips: profile.commute.tripsPerDay ?? 2,
    peopleSharing,
    workingDays: profile.commute.workingDaysPerWeek ?? 5,
    oldFactor,
    oldCo2PerPersonKm: oldFactor / Math.max(1, peopleSharing),
  };
}

type Commute = ReturnType<typeof commuteOf>;

interface CommuteSaving {
  savedCo2PerPersonKm: number;
  isEstimate: boolean;
  vehicleKmAvoidedPerDay: number;
}

/** CO2 saved per person-km for a swap on every commuting day, or null when it does not apply. */
function commuteSaving(swapId: string, c: Commute): CommuteSaving | null {
  const allTripsKm = c.distance * c.trips;
  switch (swapId) {
    case "metro-not-car":
      // The operator's approximate claim, so an estimate.
      return {
        savedCo2PerPersonKm: c.oldCo2PerPersonKm * METRO_SAVING_FRACTION,
        isEstimate: true,
        vehicleKmAvoidedPerDay: allTripsKm,
      };
    case "bus-not-car":
      return {
        savedCo2PerPersonKm: Math.max(
          0,
          c.oldCo2PerPersonKm - TRANSPORT_CO2_FACTORS.bus.kgCo2PerKm,
        ),
        isEstimate: false,
        vehicleKmAvoidedPerDay: allTripsKm,
      };
    case "carpool": {
      if (!CAR_MODES.includes(c.mode) || c.peopleSharing >= 4) return null;
      const carpoolPax = 3; // sharing with 2 others = 3 pax total
      const newCo2PerPersonKm = c.oldFactor / carpoolPax;
      return {
        savedCo2PerPersonKm: Math.max(0, c.oldCo2PerPersonKm - newCo2PerPersonKm),
        isEstimate: false,
        vehicleKmAvoidedPerDay: (c.distance * c.trips * (carpoolPax - 1)) / carpoolPax,
      };
    }
    case "walk-short-trips":
      if (c.distance > 2) return null;
      return {
        savedCo2PerPersonKm: c.oldCo2PerPersonKm,
        isEstimate: false,
        vehicleKmAvoidedPerDay: allTripsKm,
      };
    default:
      return null;
  }
}

/** One work-from-home day a week avoids one day of the current commute. */
function wfhImpact(swapId: string, c: Commute, profile: HouseholdProfile): SwapImpactResult {
  const hasOfficeWorker = profile.members.some((m) => m.routinePreset === "office_worker");
  if (!hasOfficeWorker) return notApplicable(swapId);
  const dailySaved = c.distance * c.trips * c.oldCo2PerPersonKm;
  return {
    swapId,
    applicable: true,
    lens: "polluteLess",
    kind: "computed",
    isEstimate: false,
    factorSections: ["9"],
    co2SavedKgPerDay: dailySaved,
    co2SavedKgPerWeek: dailySaved, // 1 WFH day
    vehicleKmAvoidedPerDay: c.distance * c.trips,
  };
}

/** The pollute less swap for this id, or null when the id is not a transport swap. */
export function transportImpact(
  swapId: string,
  profile: HouseholdProfile,
): SwapImpactResult | null {
  if (!TRANSPORT_SWAP_IDS.has(swapId)) return null;
  const c = commuteOf(profile);
  if (!MOTORISED_MODES.includes(c.mode) || c.distance <= 0) return notApplicable(swapId);
  if (swapId === "wfh-day") return wfhImpact(swapId, c, profile);

  const saving = commuteSaving(swapId, c);
  if (!saving) return notApplicable(swapId);
  const co2SavedPerDay = c.distance * c.trips * saving.savedCo2PerPersonKm;
  return {
    swapId,
    applicable: true,
    lens: "polluteLess",
    kind: "computed",
    isEstimate: saving.isEstimate,
    factorSections: ["9"],
    co2SavedKgPerDay: co2SavedPerDay,
    co2SavedKgPerWeek: co2SavedPerDay * c.workingDays,
    vehicleKmAvoidedPerDay: saving.vehicleKmAvoidedPerDay,
  };
}
