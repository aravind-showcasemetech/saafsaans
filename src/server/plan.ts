import fs from "node:fs";
import path from "node:path";
import { ACTIONS_BY_ID, type ActionDefinition } from "../shared/actions.js";
import type { NormalisedAirData } from "../shared/air-types.js";
import type { TravelMode } from "../shared/factors.js";
import {
  cleanestAndDirtiestWindows,
  commuteCo2Saved,
  indoorPm25,
  inhalationRate,
  maskSavingRange,
  minPurifierCadr,
  vehicleKmAvoided,
} from "../shared/impact.js";
import type { HouseholdProfile } from "../shared/schemas.js";

// Helper to filter actions applicable to a household
export function filterApplicableActions(
  profile: HouseholdProfile,
  airData: NormalisedAirData,
): ActionDefinition[] {
  const applicable: ActionDefinition[] = [];

  const hasOutdoorExerciser = profile.members.some((m) => (m.outdoorExerciseMinutes ?? 0) > 0);
  const drivesOrRidesCommute = [
    "petrol_car_small",
    "petrol_car",
    "petrol_sedan",
    "diesel_car",
    "diesel_sedan",
    "cng_car",
    "scooter",
    "motorcycle",
    "auto",
  ].includes(profile.commute.mode);

  const commuteDistance = profile.commute.distanceKm ?? 0;
  const isPoorOrWorse = ["Poor", "Very Poor", "Severe"].includes(airData.aqiBand);

  // 1. shift-outdoor-exercise: only if someone exercises outdoors
  if (hasOutdoorExerciser && ACTIONS_BY_ID["shift-outdoor-exercise"]) {
    applicable.push(ACTIONS_BY_ID["shift-outdoor-exercise"]);
  }

  // 2. exercise-indoors: only if someone exercises outdoors and air is Poor or worse
  if (hasOutdoorExerciser && isPoorOrWorse && ACTIONS_BY_ID["exercise-indoors"]) {
    applicable.push(ACTIONS_BY_ID["exercise-indoors"]);
  }

  // 3. shut-windows-peak: applicable if windows are open or open during day
  if (profile.home.windowHabit !== "mostly_shut" && ACTIONS_BY_ID["shut-windows-peak"]) {
    applicable.push(ACTIONS_BY_ID["shut-windows-peak"]);
  }

  // 4. air-house-clean-window: applicable to homes
  if (ACTIONS_BY_ID["air-house-clean-window"]) {
    applicable.push(ACTIONS_BY_ID["air-house-clean-window"]);
  }

  // 5. purifier-bedroom: if they don't have a purifier or have a bedroom
  if (ACTIONS_BY_ID["purifier-bedroom"]) {
    applicable.push(ACTIONS_BY_ID["purifier-bedroom"]);
  }

  // 6. diy-fan-filter: only if they do not have a purifier
  if (!profile.home.hasPurifier && ACTIONS_BY_ID["diy-fan-filter"]) {
    applicable.push(ACTIONS_BY_ID["diy-fan-filter"]);
  }

  // 7. mask-outdoors: if someone commutes outdoors (two-wheeler/walk/cycle/open transit) or exercises outdoors
  if (
    (hasOutdoorExerciser ||
      ["scooter", "motorcycle", "auto", "walk_cycle"].includes(profile.commute.mode)) &&
    ACTIONS_BY_ID["mask-outdoors"]
  ) {
    applicable.push(ACTIONS_BY_ID["mask-outdoors"]);
  }

  // 8. no-mosquito-coil: only if they use coils
  if (profile.home.usesMosquitoCoils && ACTIONS_BY_ID["no-mosquito-coil"]) {
    applicable.push(ACTIONS_BY_ID["no-mosquito-coil"]);
  }

  // 9. incense-outside: only if they use incense
  if (profile.home.usesIncense && ACTIONS_BY_ID["incense-outside"]) {
    applicable.push(ACTIONS_BY_ID["incense-outside"]);
  }

  // 10. cook-with-exhaust: if cooking with gas or frying
  if (
    (profile.home.cookingMethod === "gas" || profile.home.cookingMethod === "lots_of_frying") &&
    ACTIONS_BY_ID["cook-with-exhaust"]
  ) {
    applicable.push(ACTIONS_BY_ID["cook-with-exhaust"]);
  }

  // 11. wet-mop: always applicable advice
  if (ACTIONS_BY_ID["wet-mop"]) {
    applicable.push(ACTIONS_BY_ID["wet-mop"]);
  }

  // 12. metro-not-car: only if someone drives or rides to work and distance > 0
  if (drivesOrRidesCommute && commuteDistance > 0 && ACTIONS_BY_ID["metro-not-car"]) {
    applicable.push(ACTIONS_BY_ID["metro-not-car"]);
  }

  // 13. bus-not-car: only if someone drives or rides to work, distance > 0, and not already picking metro as primary transit swap
  // For transit swaps, carpool/bus/wfh are alternates to metro
  if (drivesOrRidesCommute && commuteDistance > 0 && ACTIONS_BY_ID["bus-not-car"]) {
    applicable.push(ACTIONS_BY_ID["bus-not-car"]);
  }

  // 14. carpool: only if driving a car with fewer than 4 people sharing
  if (
    [
      "petrol_car_small",
      "petrol_car",
      "petrol_sedan",
      "diesel_car",
      "diesel_sedan",
      "cng_car",
    ].includes(profile.commute.mode) &&
    (profile.commute.peopleSharing ?? 1) < 4 &&
    commuteDistance > 0 &&
    ACTIONS_BY_ID.carpool
  ) {
    applicable.push(ACTIONS_BY_ID.carpool);
  }

  // 15. walk-short-trips: if commute is under 2 km
  if (commuteDistance > 0 && commuteDistance <= 2 && ACTIONS_BY_ID["walk-short-trips"]) {
    applicable.push(ACTIONS_BY_ID["walk-short-trips"]);
  }

  // 16. wfh-day: if someone has an office commute
  const hasOfficeWorker = profile.members.some((m) => m.routinePreset === "office_worker");
  if (hasOfficeWorker && drivesOrRidesCommute && commuteDistance > 0 && ACTIONS_BY_ID["wfh-day"]) {
    applicable.push(ACTIONS_BY_ID["wfh-day"]);
  }

  // 17. no-idling: if drives
  if (drivesOrRidesCommute && ACTIONS_BY_ID["no-idling"]) {
    applicable.push(ACTIONS_BY_ID["no-idling"]);
  }

  // 18. no-burning: always applicable advice
  if (ACTIONS_BY_ID["no-burning"]) {
    applicable.push(ACTIONS_BY_ID["no-burning"]);
  }

  return applicable;
}

export interface ComputedSwapItem {
  id: string;
  lens: "protect" | "polluteLess";
  kind: "computed" | "sourcedFact" | "adviceOnly";
  title: string;
  factorSections: string[];
  isEstimate: boolean;
  savingNumber?: number;
  savingUnit?: string;
  savingRange?: { min: number; max: number; unit: string };
  factText?: string;
}

export function computeActionNumbers(
  action: ActionDefinition,
  profile: HouseholdProfile,
  airData: NormalisedAirData,
): ComputedSwapItem {
  const base: ComputedSwapItem = {
    id: action.id,
    lens: action.lens,
    kind: action.kind,
    title: action.title,
    factorSections: [...action.factorSections],
    isEstimate: false,
  };

  const outdoorPm25 = airData.pm25;

  switch (action.id) {
    case "shift-outdoor-exercise": {
      // Impact of shifting exercise to cleanest window
      const windows = cleanestAndDirtiestWindows(airData.hourlyForecast);
      const cleanestPm25 = windows.cleanest?.averagePm25 ?? outdoorPm25 * 0.7;
      const member =
        profile.members.find((m) => (m.outdoorExerciseMinutes ?? 0) > 0) ?? profile.members[0];
      const rateInfo = inhalationRate(member.ageBand, "high");
      const durationMin = member.outdoorExerciseMinutes || 60;
      // Exposure avoided in ug = (dirtiest or current - cleanest) * rate * duration
      const currentOrPeakPm25 = windows.dirtiest?.averagePm25 ?? outdoorPm25;
      const savedUg = Math.max(
        0,
        (currentOrPeakPm25 - cleanestPm25) * rateInfo.rateM3PerMin * durationMin,
      );
      return {
        ...base,
        isEstimate: rateInfo.isEstimate,
        savingNumber: Math.round(savedUg * 10) / 10,
        savingUnit: "µg inhaled PM2.5 avoided",
      };
    }

    case "exercise-indoors": {
      const member =
        profile.members.find((m) => (m.outdoorExerciseMinutes ?? 0) > 0) ?? profile.members[0];
      const rateInfo = inhalationRate(member.ageBand, "high");
      const durationMin = member.outdoorExerciseMinutes || 60;
      const inPm25 = indoorPm25(outdoorPm25, {
        windowsOpen: profile.home.windowHabit === "mostly_open",
      });
      const savedUg = Math.max(
        0,
        (outdoorPm25 - inPm25.indoorPm25) * rateInfo.rateM3PerMin * durationMin,
      );
      return {
        ...base,
        isEstimate: true,
        savingNumber: Math.round(savedUg * 10) / 10,
        savingUnit: "µg inhaled PM2.5 avoided",
      };
    }

    case "shut-windows-peak": {
      const openRatio = indoorPm25(outdoorPm25, { windowsOpen: true }).indoorPm25;
      const shutRatio = indoorPm25(outdoorPm25, { windowsOpen: false }).indoorPm25;
      const reduction = Math.max(0, openRatio - shutRatio);
      return {
        ...base,
        isEstimate: true,
        savingNumber: Math.round(reduction * 10) / 10,
        savingUnit: "µg/m³ indoor concentration cut",
      };
    }

    case "air-house-clean-window": {
      const windows = cleanestAndDirtiestWindows(airData.hourlyForecast);
      const diff = Math.max(
        0,
        (windows.dirtiest?.averagePm25 ?? outdoorPm25) -
          (windows.cleanest?.averagePm25 ?? outdoorPm25 * 0.7),
      );
      return {
        ...base,
        isEstimate: false,
        savingNumber: Math.round(diff * 10) / 10,
        savingUnit: "µg/m³ cleaner outdoor air during ventilation",
      };
    }

    case "purifier-bedroom": {
      const area = profile.home.bedroomAreaSqFt ?? 144;
      const height = profile.home.ceilingHeightFt ?? 10;
      const minCadr = minPurifierCadr(area, height);
      return {
        ...base,
        isEstimate: false,
        savingNumber: minCadr.minCadrCfm,
        savingUnit: "cfm minimum CADR for bedroom",
      };
    }

    case "diy-fan-filter": {
      return {
        ...base,
        isEstimate: false,
        factText: "A box fan taped to a HEPA/MERV-13 filter can lower indoor PM2.5 at low cost.",
      };
    }

    case "mask-outdoors": {
      const member = profile.members[0];
      const duration = 60;
      const range = maskSavingRange(outdoorPm25, member.ageBand, "light", duration);
      return {
        ...base,
        isEstimate: range.isEstimate,
        savingRange: {
          min: Math.round(range.minReductionPercent),
          max: Math.round(range.maxReductionPercent),
          unit: "% dose reduction while active",
        },
      };
    }

    case "no-mosquito-coil": {
      return {
        ...base,
        isEstimate: false,
        factText: "Burning 1 mosquito coil releases as much PM2.5 as burning 75 to 137 cigarettes.",
      };
    }

    case "incense-outside": {
      return {
        ...base,
        isEstimate: false,
        factText: "Burning incense indoors can raise PM2.5 up to 197 µg/m³ in an enclosed space.",
      };
    }

    case "cook-with-exhaust": {
      return {
        ...base,
        isEstimate: false,
        factText:
          "Frying without exhaust reaches median 4.5 mg/m³ PM2.5 vs 0.5 mg/m³ with ventilation.",
      };
    }

    case "wet-mop": {
      return {
        ...base,
        isEstimate: false,
        factText: "Wet-mopping traps fine dust without re-suspending particles into breathing air.",
      };
    }

    case "metro-not-car": {
      const co2 = commuteCo2Saved({
        oldMode: profile.commute.mode as TravelMode,
        newMode: "metro",
        distanceKm: profile.commute.distanceKm,
        tripsPerDay: profile.commute.tripsPerDay,
        peopleSharingOld: profile.commute.peopleSharing,
        workingDaysPerWeek: profile.commute.workingDaysPerWeek,
      });
      const km = vehicleKmAvoided(profile.commute.distanceKm, profile.commute.tripsPerDay);
      return {
        ...base,
        isEstimate: co2.isEstimate,
        savingNumber: Math.round(co2.kgCo2SavedPerDay * 100) / 100,
        savingUnit: `kg CO2/day (${Math.round(km.vehicleKmAvoidedPerDay * 10) / 10} vehicle-km avoided)`,
      };
    }

    case "bus-not-car": {
      const co2 = commuteCo2Saved({
        oldMode: profile.commute.mode as TravelMode,
        newMode: "bus",
        distanceKm: profile.commute.distanceKm,
        tripsPerDay: profile.commute.tripsPerDay,
        peopleSharingOld: profile.commute.peopleSharing,
        workingDaysPerWeek: profile.commute.workingDaysPerWeek,
      });
      return {
        ...base,
        isEstimate: co2.isEstimate,
        savingNumber: Math.round(co2.kgCo2SavedPerDay * 100) / 100,
        savingUnit: "kg CO2 saved per day",
      };
    }

    case "carpool": {
      const co2 = commuteCo2Saved({
        oldMode: profile.commute.mode as TravelMode,
        newMode: "carpool",
        distanceKm: profile.commute.distanceKm,
        tripsPerDay: profile.commute.tripsPerDay,
        peopleSharingOld: profile.commute.peopleSharing,
        carpoolTotalPassengers: 3,
        workingDaysPerWeek: profile.commute.workingDaysPerWeek,
      });
      return {
        ...base,
        isEstimate: co2.isEstimate,
        savingNumber: Math.round(co2.kgCo2SavedPerDay * 100) / 100,
        savingUnit: "kg CO2 saved per day (sharing with 3 colleagues)",
      };
    }

    case "walk-short-trips": {
      const co2 = commuteCo2Saved({
        oldMode: profile.commute.mode as TravelMode,
        newMode: "walk_cycle",
        distanceKm: profile.commute.distanceKm,
        tripsPerDay: profile.commute.tripsPerDay,
        peopleSharingOld: profile.commute.peopleSharing,
        workingDaysPerWeek: profile.commute.workingDaysPerWeek,
      });
      return {
        ...base,
        isEstimate: co2.isEstimate,
        savingNumber: Math.round(co2.kgCo2SavedPerDay * 100) / 100,
        savingUnit: "kg CO2 saved per day",
      };
    }

    case "wfh-day": {
      // WFH one day skips 1 day's roundtrip commute entirely
      const km = vehicleKmAvoided(profile.commute.distanceKm, profile.commute.tripsPerDay);
      // In impact.ts, car/two-wheeler factor * distance is the emissions of 1 day commute
      const co2 = commuteCo2Saved({
        oldMode: profile.commute.mode as TravelMode,
        newMode: "walk_cycle", // zero-emission substitute for that day
        distanceKm: profile.commute.distanceKm,
        tripsPerDay: profile.commute.tripsPerDay,
        peopleSharingOld: profile.commute.peopleSharing,
        workingDaysPerWeek: 1,
      });
      return {
        ...base,
        isEstimate: co2.isEstimate,
        savingNumber: Math.round(co2.kgCo2SavedPerDay * 100) / 100,
        savingUnit: `kg CO2 saved per week (${Math.round(km.vehicleKmAvoidedPerDay * 10) / 10} vehicle-km avoided)`,
      };
    }

    case "no-idling": {
      return {
        ...base,
        isEstimate: false,
        factText: "Turning off engines at long stops prevents concentrated local exhaust plumes.",
      };
    }

    case "no-burning": {
      return {
        ...base,
        isEstimate: false,
        factText:
          "Open leaf and waste burning is a major source of toxic winter smoke in neighbourhoods.",
      };
    }

    default:
      return base;
  }
}

// Deterministic ranking order:
// Rank computed actions by impact, then sourced facts, then advice only.
// For a family with urgent indoor sources or specific exposures, we prioritize major impact swaps
// across both Protect and Pollute less lenses.
export function rankApplicableActions(items: ComputedSwapItem[]): ComputedSwapItem[] {
  // We want the most impactful actions across Protect and Pollute Less to be represented in the top 6:
  // Protect: shift-outdoor-exercise, purifier-bedroom, shut-windows-peak
  // Pollute less: metro-not-car, bus-not-car, carpool, wfh-day
  // Sourced indoor facts: no-mosquito-coil, incense-outside, cook-with-exhaust
  const priorityOrder: Record<string, number> = {
    "shift-outdoor-exercise": 100,
    "purifier-bedroom": 90,
    "no-mosquito-coil": 85,
    "metro-not-car": 80,
    "incense-outside": 75,
    "bus-not-car": 70,
    "cook-with-exhaust": 65,
    carpool: 60,
    "wfh-day": 55,
    "shut-windows-peak": 50,
    "air-house-clean-window": 45,
    "mask-outdoors": 40,
    "exercise-indoors": 35,
    "walk-short-trips": 30,
    "wet-mop": 20,
    "no-idling": 15,
    "diy-fan-filter": 10,
    "no-burning": 5,
  };

  return [...items].sort((a, b) => {
    const pA = priorityOrder[a.id] ?? 0;
    const pB = priorityOrder[b.id] ?? 0;
    return pB - pA;
  });
}

// Load template text for swaps
export function getTemplateReason(actionId: string, lang: "en" | "hi" | "te"): string {
  try {
    const filePath = path.resolve(process.cwd(), `src/client/i18n/${lang}.json`);
    if (fs.existsSync(filePath)) {
      const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      if (content.swaps?.[actionId]) {
        return content.swaps[actionId];
      }
    }
    // Fallback to en.json
    const enPath = path.resolve(process.cwd(), "src/client/i18n/en.json");
    if (fs.existsSync(enPath)) {
      const content = JSON.parse(fs.readFileSync(enPath, "utf-8"));
      if (content.swaps?.[actionId]) {
        return content.swaps[actionId];
      }
    }
  } catch {
    // Ignore error
  }
  return "Recommended action based on your household routine and local air conditions.";
}

export function getTemplateSummary(lang: "en" | "hi" | "te"): string {
  try {
    const filePath = path.resolve(process.cwd(), `src/client/i18n/${lang}.json`);
    if (fs.existsSync(filePath)) {
      const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      if (content.summary?.default) {
        return content.summary.default;
      }
    }
  } catch {
    // Ignore error
  }
  return "Personalised air quality actions for your household routines and local forecast.";
}
