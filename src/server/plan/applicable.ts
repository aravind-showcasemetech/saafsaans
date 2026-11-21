// applicable.ts: Filters action catalogue based on real inputs and profile applicability.
// Follows docs/SPEC.md section 8 and AGENTS.md rule 1 & rule 3.

import { ACTIONS_BY_ID, type ActionDefinition } from "../../shared/actions.js";
import type { NormalisedAirData } from "../../shared/air-types.js";
import type { HouseholdProfile } from "../../shared/schemas.js";

const CAR_MODES = [
  "petrol_car_small",
  "petrol_car",
  "petrol_sedan",
  "diesel_car",
  "diesel_sedan",
  "cng_car",
];
const DRIVE_OR_RIDE_MODES = [...CAR_MODES, "scooter", "motorcycle", "auto"];
const OUTDOOR_COMMUTE_MODES = ["scooter", "motorcycle", "auto", "walk_cycle"];

/** What the rules below need to know about the household and today's air. */
interface Facts {
  profile: HouseholdProfile;
  exercisesOutdoorsWithTime: boolean;
  exercisesOutdoors: boolean;
  drivesOrRides: boolean;
  drivesCar: boolean;
  distanceKm: number;
  isPoorOrWorse: boolean;
  outdoorCommuterOrWorker: boolean;
  hasOfficeWorker: boolean;
}

function factsOf(profile: HouseholdProfile, airData: NormalisedAirData): Facts {
  const { members, commute } = profile;
  return {
    profile,
    exercisesOutdoorsWithTime: members.some(
      (m) => (m.outdoorExerciseMinutes ?? 0) > 0 && Boolean(m.outdoorExerciseTime),
    ),
    exercisesOutdoors: members.some((m) => (m.outdoorExerciseMinutes ?? 0) > 0),
    drivesOrRides: DRIVE_OR_RIDE_MODES.includes(commute.mode),
    drivesCar: CAR_MODES.includes(commute.mode),
    distanceKm: commute.distanceKm ?? 0,
    isPoorOrWorse: ["Poor", "Very Poor", "Severe"].includes(airData.aqiBand),
    outdoorCommuterOrWorker:
      OUTDOOR_COMMUTE_MODES.includes(commute.mode) ||
      members.some((m) => m.routinePreset === "outdoor_worker"),
    hasOfficeWorker: members.some((m) => m.routinePreset === "office_worker"),
  };
}

/**
 * Each catalogue action with the condition under which it applies, in the order offered.
 * air-house-clean-window is not offered by this filter.
 */
const RULES: ReadonlyArray<readonly [string, (f: Facts) => boolean]> = [
  // Someone exercises outdoors and has an exercise time.
  ["shift-outdoor-exercise", (f) => f.exercisesOutdoorsWithTime],
  // Someone exercises outdoors and the air is Poor or worse.
  ["exercise-indoors", (f) => f.exercisesOutdoors && f.isPoorOrWorse],
  ["shut-windows-peak", (f) => f.profile.home.windowHabit !== "mostly_shut"],
  // Bedroom area and ceiling height are known.
  [
    "purifier-bedroom",
    (f) => (f.profile.home.bedroomAreaSqFt ?? 0) > 0 && (f.profile.home.ceilingHeightFt ?? 0) > 0,
  ],
  ["diy-fan-filter", (f) => !f.profile.home.hasPurifier],
  // Two-wheeler, auto, walk or cycle commute, or someone who works outdoors.
  ["mask-outdoors", (f) => f.outdoorCommuterOrWorker],
  ["no-mosquito-coil", (f) => Boolean(f.profile.home.usesMosquitoCoils)],
  ["incense-outside", (f) => Boolean(f.profile.home.usesIncense)],
  [
    "cook-with-exhaust",
    (f) =>
      f.profile.home.cookingMethod === "gas" || f.profile.home.cookingMethod === "lots_of_frying",
  ],
  ["wet-mop", () => true],
  ["metro-not-car", (f) => f.drivesOrRides && f.distanceKm > 0],
  ["bus-not-car", (f) => f.drivesOrRides && f.distanceKm > 0],
  // A car with fewer than four people sharing.
  ["carpool", (f) => f.drivesCar && (f.profile.commute.peopleSharing ?? 1) < 4 && f.distanceKm > 0],
  // A commute of two km or less.
  ["walk-short-trips", (f) => f.distanceKm > 0 && f.distanceKm <= 2],
  ["wfh-day", (f) => f.hasOfficeWorker && f.drivesOrRides && f.distanceKm > 0],
  ["no-idling", (f) => f.drivesOrRides],
  ["no-burning", () => true],
];

export function filterApplicableActions(
  profile: HouseholdProfile,
  airData: NormalisedAirData,
): ActionDefinition[] {
  const facts = factsOf(profile, airData);
  return RULES.filter(([, applies]) => applies(facts))
    .map(([id]) => ACTIONS_BY_ID[id])
    .filter((action): action is ActionDefinition => Boolean(action));
}
