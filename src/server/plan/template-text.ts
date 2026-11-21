// template-text.ts: The reason and family summary shown when Gemini is off or its text is rejected.
import { type Lang, serverText } from "../translations.js";

/** The template reason for a swap in this language. */
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
