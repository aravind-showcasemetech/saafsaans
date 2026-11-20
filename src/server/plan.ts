// plan.ts: Facade re-exporting modules from plan/ and the template text helpers.
import { filterApplicableActions } from "./plan/applicable.js";
import { type ComputedSwapItem, computeActionNumbers } from "./plan/compute.js";
import { rankApplicableActions } from "./plan/rank.js";
import { type Lang, serverText } from "./text.js";

export {
  filterApplicableActions,
  computeActionNumbers,
  rankApplicableActions,
  type ComputedSwapItem,
};

/** The template reason for a swap in this language (used when Gemini is off or its text is rejected). */
export function getTemplateReason(actionId: string, lang: Lang): string {
  return (
    serverText(`swaps.${actionId}`, lang) ||
    "Recommended action based on your household routine and local air conditions."
  );
}

/** The template family summary in this language. */
export function getTemplateSummary(lang: Lang): string {
  return (
    serverText("summary.default", lang) ||
    "Personalised air quality actions for your household routines and local forecast."
  );
}
