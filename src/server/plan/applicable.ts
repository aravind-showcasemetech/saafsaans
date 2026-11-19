// applicable.ts: Filters action catalogue based on real inputs and profile applicability.
// Follows docs/SPEC.md section 8 and AGENTS.md rule 1 & rule 3.

import { ACTIONS_BY_ID, type ActionDefinition } from "../../shared/actions.js";
import type { NormalisedAirData } from "../../shared/air-types.js";
import type { HouseholdProfile } from "../../shared/schemas.js";

export function filterApplicableActions(
  profile: HouseholdProfile,
  airData: NormalisedAirData,
): ActionDefinition[] {
  const applicable: ActionDefinition[] = [];

  // Check exercisers with actual exercise minutes and time
  const hasOutdoorExerciserWithTime = profile.members.some(
    (m) => (m.outdoorExerciseMinutes ?? 0) > 0 && m.outdoorExerciseTime,
  );
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

  // 1. shift-outdoor-exercise: only if someone exercises outdoors and has an exercise time
  if (hasOutdoorExerciserWithTime && ACTIONS_BY_ID["shift-outdoor-exercise"]) {
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

  // 4. air-house-clean-window: applicable if windows are shut and airing during cleanest window would help
  if (profile.home.windowHabit !== "mostly_open" && ACTIONS_BY_ID["air-house-clean-window"]) {
    // Airing is only applicable if the cleanest window outdoor air is actually cleaner than indoor baseline
    // But if it produces 0 reduction (or windows mostly shut), it is not applicable
    // Notice air-house-clean-window only applies if there is a real benefit
  }

  // 5. purifier-bedroom: applicable if bedroom area and ceiling height are provided
  if (
    profile.home.bedroomAreaSqFt &&
    profile.home.bedroomAreaSqFt > 0 &&
    profile.home.ceilingHeightFt &&
    profile.home.ceilingHeightFt > 0 &&
    ACTIONS_BY_ID["purifier-bedroom"]
  ) {
    applicable.push(ACTIONS_BY_ID["purifier-bedroom"]);
  }

  // 6. diy-fan-filter: only if they do not have a purifier
  if (!profile.home.hasPurifier && ACTIONS_BY_ID["diy-fan-filter"]) {
    applicable.push(ACTIONS_BY_ID["diy-fan-filter"]);
  }

  // 7. mask-outdoors: if someone commutes outdoors (two-wheeler, auto, walk/cycle) or works outdoors
  const hasOutdoorCommuterOrWorker =
    ["scooter", "motorcycle", "auto", "walk_cycle"].includes(profile.commute.mode) ||
    profile.members.some((m) => m.routinePreset === "outdoor_worker");

  if (hasOutdoorCommuterOrWorker && ACTIONS_BY_ID["mask-outdoors"]) {
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

  // 12. metro-not-car
  if (drivesOrRidesCommute && commuteDistance > 0 && ACTIONS_BY_ID["metro-not-car"]) {
    applicable.push(ACTIONS_BY_ID["metro-not-car"]);
  }

  // 13. bus-not-car
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
