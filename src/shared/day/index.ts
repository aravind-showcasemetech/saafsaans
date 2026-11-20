// index.ts: The household 24-hour day model, shared by server and browser so the browser can
// recompute when swaps are toggled. Follows docs/SPEC.md section 5 and docs/FACTORS.md 2 to 8.
export { buildMemberBaselineRoutine, overlayExerciseOnBlocks } from "../presets.js";
export { createHourlyForecastLookup, getIndoorPm25ForHour } from "./hourly.js";
export { computeMemberDaySchedule } from "./schedule.js";
export { computeDayModelSwapImpact } from "./swaps.js";
export { calculateDoseCutPercentage, computeHouseholdDayComparison } from "./totals.js";
export type * from "./types.js";
