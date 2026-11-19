// plan.ts: Facade re-exporting modules from plan/ and helper functions.
import fs from "node:fs";
import path from "node:path";
import { filterApplicableActions } from "./plan/applicable.js";
import { type ComputedSwapItem, computeActionNumbers, getI18nText } from "./plan/compute.js";
import { rankApplicableActions } from "./plan/rank.js";

export {
  filterApplicableActions,
  computeActionNumbers,
  rankApplicableActions,
  type ComputedSwapItem,
  getI18nText,
};

export function getTemplateReason(actionId: string, lang: "en" | "hi" | "te"): string {
  try {
    const filePath = path.resolve(process.cwd(), `src/client/i18n/${lang}.json`);
    if (fs.existsSync(filePath)) {
      const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      if (content.swaps?.[actionId]) {
        return content.swaps[actionId];
      }
    }
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
