// index.ts: The plan engine: which catalogue actions apply, their numbers, the ranker, and the
// template text used when Gemini is off.
export { filterApplicableActions } from "./applicable.js";
export { type ComputedSwapItem, computeActionNumbers } from "./compute.js";
export { rankApplicableActions } from "./rank.js";
export { getTemplateReason, getTemplateSummary } from "./template-text.js";
