// refine.ts: The refine box: free text to Gemini, then the plan is made again.
import type { HouseholdProfile } from "../../../shared/schemas.js";
import { getLanguage, t } from "../../home/i18n.js";
import { fetchRefine } from "../api.js";
import { saveHouseholdProfile } from "../storage.js";

export const REFINE_MAX = 500;

export function attachRefine(
  container: HTMLElement,
  profile: HouseholdProfile,
  onUpdated: () => Promise<void>,
): void {
  const input = container.querySelector<HTMLTextAreaElement>("#refine-input");
  const count = container.querySelector<HTMLElement>("#refine-char-count");
  const button = container.querySelector<HTMLButtonElement>("#btn-submit-refine");
  const status = container.querySelector<HTMLElement>("#refine-status");
  if (!input || !count || !button || !status) return;

  input.addEventListener("input", () => {
    count.textContent = t("today.charsLeft", { count: REFINE_MAX - input.value.length });
  });

  button.addEventListener("click", async () => {
    const text = input.value.trim();
    if (!text) return;
    button.disabled = true;
    button.textContent = t("today.updating");
    status.textContent = "";
    try {
      const res = await fetchRefine({ profile, text, lang: getLanguage() });
      if (res?.profile) {
        saveHouseholdProfile(res.profile);
        await onUpdated();
        return;
      }
      status.textContent = t("today.refineError");
    } catch {
      status.textContent = t("today.refineError");
    }
    button.disabled = false;
    button.textContent = t("today.updatePlan");
  });
}
