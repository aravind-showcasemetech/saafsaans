// swaps-transport.ts: Pollute less swaps: CO2 avoided and vehicle-km off the road (FACTORS.md section 9).
import { METRO_SAVING_FRACTION, TRANSPORT_CO2_FACTORS, type TravelMode } from "../factors.js";
import type { HouseholdProfile } from "../schemas.js";
import type { SwapImpactResult } from "./types.js";

/** The pollute less swap for this id, or null when the id is not a transport swap. */
export function transportImpact(
  swapId: string,
  profile: HouseholdProfile,
): SwapImpactResult | null {
  switch (swapId) {
    case "metro-not-car":
    case "bus-not-car":
    case "carpool":
    case "walk-short-trips":
    case "wfh-day": {
      const mode = profile.commute.mode as TravelMode;
      const distance = profile.commute.distanceKm ?? 0;
      const trips = profile.commute.tripsPerDay ?? 2;
      const peopleSharing = profile.commute.peopleSharing ?? 1;
      const workingDays = profile.commute.workingDaysPerWeek ?? 5;

      const isMotorized = [
        "petrol_car_small",
        "petrol_car",
        "petrol_sedan",
        "diesel_car",
        "diesel_sedan",
        "cng_car",
        "scooter",
        "motorcycle",
        "auto",
      ].includes(mode);

      if (!isMotorized || distance <= 0) {
        return {
          swapId,
          applicable: false,
          lens: "polluteLess",
          kind: "computed",
          isEstimate: false,
          factorSections: ["9"],
        };
      }

      let oldFactor = 0;
      if (mode in TRANSPORT_CO2_FACTORS) {
        oldFactor = TRANSPORT_CO2_FACTORS[mode as keyof typeof TRANSPORT_CO2_FACTORS].kgCo2PerKm;
      }
      const oldCo2PerPersonKm = oldFactor / Math.max(1, peopleSharing);

      let savedCo2PerPersonKm = 0;
      let isEstimate = false;
      let vehicleKmAvoidedPerDay = distance * trips;

      if (swapId === "metro-not-car") {
        savedCo2PerPersonKm = oldCo2PerPersonKm * METRO_SAVING_FRACTION;
        isEstimate = true; // operator's approximate claim
      } else if (swapId === "bus-not-car") {
        const busPaxFactor = TRANSPORT_CO2_FACTORS.bus.kgCo2PerKm; // 0.015161
        savedCo2PerPersonKm = Math.max(0, oldCo2PerPersonKm - busPaxFactor);
      } else if (swapId === "carpool") {
        const isCar = [
          "petrol_car_small",
          "petrol_car",
          "petrol_sedan",
          "diesel_car",
          "diesel_sedan",
          "cng_car",
        ].includes(mode);
        if (!isCar || peopleSharing >= 4) {
          return {
            swapId,
            applicable: false,
            lens: "polluteLess",
            kind: "computed",
            isEstimate: false,
            factorSections: ["9"],
          };
        }
        const carpoolPax = 3; // sharing with 2 others = 3 pax total
        const newCo2PerPersonKm = oldFactor / carpoolPax;
        savedCo2PerPersonKm = Math.max(0, oldCo2PerPersonKm - newCo2PerPersonKm);
        vehicleKmAvoidedPerDay = (distance * trips * (carpoolPax - 1)) / carpoolPax;
      } else if (swapId === "walk-short-trips") {
        if (distance > 2) {
          return {
            swapId,
            applicable: false,
            lens: "polluteLess",
            kind: "computed",
            isEstimate: false,
            factorSections: ["9"],
          };
        }
        savedCo2PerPersonKm = oldCo2PerPersonKm;
      } else if (swapId === "wfh-day") {
        const hasOfficeWorker = profile.members.some((m) => m.routinePreset === "office_worker");
        if (!hasOfficeWorker) {
          return {
            swapId,
            applicable: false,
            lens: "polluteLess",
            kind: "computed",
            isEstimate: false,
            factorSections: ["9"],
          };
        }
        // 1 day a week avoided
        const dailySaved = distance * trips * oldCo2PerPersonKm;
        const weeklySaved = dailySaved * 1; // 1 WFH day
        return {
          swapId,
          applicable: true,
          lens: "polluteLess",
          kind: "computed",
          isEstimate: false,
          factorSections: ["9"],
          co2SavedKgPerDay: dailySaved,
          co2SavedKgPerWeek: weeklySaved,
          vehicleKmAvoidedPerDay: distance * trips,
        };
      }

      const co2SavedPerDay = distance * trips * savedCo2PerPersonKm;
      const co2SavedPerWeek = co2SavedPerDay * workingDays;

      return {
        swapId,
        applicable: true,
        lens: "polluteLess",
        kind: "computed",
        isEstimate,
        factorSections: ["9"],
        co2SavedKgPerDay: co2SavedPerDay,
        co2SavedKgPerWeek: co2SavedPerWeek,
        vehicleKmAvoidedPerDay,
      };
    }
    default:
      return null;
  }
}
