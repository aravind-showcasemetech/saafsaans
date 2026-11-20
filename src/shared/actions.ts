// actions.ts: The 18 actions from SPEC section 8.
// Each action has its lens (protect | polluteLess), kind (computed | sourcedFact | adviceOnly),
// category (routine | indoor | alternative, for grouping on Today),
// and the inputs its calculation needs.

export type ActionLens = "protect" | "polluteLess";

export type ActionKind = "computed" | "sourcedFact" | "adviceOnly";

/** Which part of the challenge brief an action answers; used only to group swaps on Today. */
export type ActionCategory = "routine" | "indoor" | "alternative";

export interface ActionDefinition {
  readonly id: string;
  readonly lens: ActionLens;
  readonly kind: ActionKind;
  readonly category: ActionCategory;
  readonly title: string;
  readonly description: string;
  readonly calculationInputs: readonly string[];
  readonly factorSections: readonly string[];
}

export const ACTIONS: readonly ActionDefinition[] = [
  // 1. shift-outdoor-exercise
  {
    id: "shift-outdoor-exercise",
    lens: "protect",
    kind: "computed",
    category: "routine",
    title: "Move outdoor exercise to the cleanest window",
    description: "Move the walk, run or yoga to the cleanest window today.",
    calculationInputs: ["forecast", "ageBand", "activityLevel", "durationMinutes"],
    factorSections: ["2", "8"],
  },
  // 2. exercise-indoors
  {
    id: "exercise-indoors",
    lens: "protect",
    kind: "computed",
    category: "routine",
    title: "Exercise indoors on Poor or worse days",
    description: "Move strenuous exercise indoors when outdoor air is Poor or worse.",
    calculationInputs: ["outdoorPm25", "indoorModel", "ageBand", "durationMinutes"],
    factorSections: ["2", "4"],
  },
  // 3. shut-windows-peak
  {
    id: "shut-windows-peak",
    lens: "protect",
    kind: "computed",
    category: "indoor",
    title: "Keep windows shut in the dirtiest hours",
    description: "Keep windows closed during morning and evening pollution spikes.",
    calculationInputs: ["windowHabit", "outdoorPm25", "roomVolume"],
    factorSections: ["4", "8"],
  },
  // 4. air-house-clean-window
  {
    id: "air-house-clean-window",
    lens: "protect",
    kind: "computed",
    category: "routine",
    title: "Air the house in the cleanest window",
    description: "Ventilate the home during afternoon hours when outdoor air is cleanest.",
    calculationInputs: ["forecast", "windowHabit", "indoorModel"],
    factorSections: ["4", "8"],
  },
  // 5. purifier-bedroom
  {
    id: "purifier-bedroom",
    lens: "protect",
    kind: "computed",
    category: "indoor",
    title: "Run a bedroom air purifier at night",
    description: "Run an appropriately sized air purifier in the bedroom while sleeping.",
    calculationInputs: ["roomAreaSqFt", "ceilingHeightFt", "cadrCfm", "outdoorPm25", "hoursAsleep"],
    factorSections: ["2", "3", "4", "5"],
  },
  // 6. diy-fan-filter
  {
    id: "diy-fan-filter",
    lens: "protect",
    kind: "adviceOnly",
    category: "indoor",
    title: "DIY fan-and-filter box",
    description: "Attach a HEPA/MERV-13 filter to a standard box fan as an affordable alternative.",
    calculationInputs: [],
    factorSections: [],
  },
  // 7. mask-outdoors
  {
    id: "mask-outdoors",
    lens: "protect",
    kind: "computed",
    category: "routine",
    title: "Wear a well-fitted N95 mask outdoors",
    description: "Wear an N95 respirator for the commute or prolonged outdoor activity.",
    calculationInputs: ["outdoorPm25", "ageBand", "activityLevel", "durationMinutes"],
    factorSections: ["2", "7"],
  },
  // 8. no-mosquito-coil
  {
    id: "no-mosquito-coil",
    lens: "protect",
    kind: "sourcedFact",
    category: "indoor",
    title: "Switch from mosquito coils to nets or plug-ins",
    description:
      "Burning one mosquito coil releases as much PM2.5 as burning 75 to 137 cigarettes.",
    calculationInputs: [],
    factorSections: ["6"],
  },
  // 9. incense-outside
  {
    id: "incense-outside",
    lens: "protect",
    kind: "sourcedFact",
    category: "indoor",
    title: "Light incense outside or near an open window",
    description: "Burning incense indoors can raise PM2.5 to 197 µg/m³ in an enclosed space.",
    calculationInputs: [],
    factorSections: ["6"],
  },
  // 10. cook-with-exhaust
  {
    id: "cook-with-exhaust",
    lens: "protect",
    kind: "sourcedFact",
    category: "indoor",
    title: "Use an exhaust fan and lids while cooking",
    description:
      "Frying without ventilation reaches median 4.5 mg/m³ PM2.5 vs 0.5 mg/m³ with exhaust.",
    calculationInputs: [],
    factorSections: ["6"],
  },
  // 11. wet-mop
  {
    id: "wet-mop",
    lens: "protect",
    kind: "adviceOnly",
    category: "indoor",
    title: "Wet-mop floors instead of dry sweeping",
    description:
      "Dry sweeping stirs up fine dust into breathing air; wet-mopping keeps particles trapped.",
    calculationInputs: [],
    factorSections: ["6"],
  },
  // 12. metro-not-car
  {
    id: "metro-not-car",
    lens: "polluteLess",
    kind: "computed",
    category: "alternative",
    title: "Take the metro instead of driving",
    description: "Switch your commute from car or two-wheeler to the metro.",
    calculationInputs: [
      "commuteMode",
      "distanceKm",
      "tripsPerDay",
      "peopleSharing",
      "workingDaysPerWeek",
    ],
    factorSections: ["9"],
  },
  // 13. bus-not-car
  {
    id: "bus-not-car",
    lens: "polluteLess",
    kind: "computed",
    category: "alternative",
    title: "Take the bus instead of driving",
    description: "Switch your commute from personal car or two-wheeler to city bus transit.",
    calculationInputs: [
      "commuteMode",
      "distanceKm",
      "tripsPerDay",
      "peopleSharing",
      "workingDaysPerWeek",
    ],
    factorSections: ["9"],
  },
  // 14. carpool
  {
    id: "carpool",
    lens: "polluteLess",
    kind: "computed",
    category: "alternative",
    title: "Carpool with colleagues or neighbours",
    description: "Share car rides to divide fuel consumption and emissions across passengers.",
    calculationInputs: [
      "commuteMode",
      "distanceKm",
      "tripsPerDay",
      "carpoolPassengers",
      "workingDaysPerWeek",
    ],
    factorSections: ["9"],
  },
  // 15. walk-short-trips
  {
    id: "walk-short-trips",
    lens: "polluteLess",
    kind: "computed",
    category: "alternative",
    title: "Walk or cycle short trips under 2 km",
    description:
      "Replace short motor vehicle trips with walking or cycling during clean-air windows.",
    calculationInputs: ["commuteMode", "distanceKm", "tripsPerDay", "workingDaysPerWeek"],
    factorSections: ["9"],
  },
  // 16. wfh-day
  {
    id: "wfh-day",
    lens: "polluteLess",
    kind: "computed",
    category: "alternative",
    title: "Work from home one day a week",
    description:
      "Eliminate a day's round-trip commute to cut weekly vehicle emissions and exposure.",
    calculationInputs: ["commuteMode", "distanceKm", "tripsPerDay", "peopleSharing"],
    factorSections: ["9"],
  },
  // 17. no-idling
  {
    id: "no-idling",
    lens: "polluteLess",
    kind: "adviceOnly",
    category: "alternative",
    title: "Switch off the engine at long signals",
    description:
      "Turn off your engine during prolonged stops to eliminate pointless toxic exhaust.",
    calculationInputs: [],
    factorSections: [],
  },
  // 18. no-burning
  {
    id: "no-burning",
    lens: "polluteLess",
    kind: "adviceOnly",
    category: "alternative",
    title: "Never burn leaves or waste; report fires",
    description:
      "Refuse to burn garden leaves or garbage, and report open burning to municipal authorities.",
    calculationInputs: [],
    factorSections: [],
  },
] as const;

export const ACTIONS_BY_ID = Object.fromEntries(ACTIONS.map((a) => [a.id, a])) as Record<
  string,
  ActionDefinition
>;
