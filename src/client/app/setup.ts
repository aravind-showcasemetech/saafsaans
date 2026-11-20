// setup.ts: Numbered stepper (1 Location, 2 Household). Presets so most people tap, not type.
// Saves to localStorage. Nicknames stay in localStorage and are mapped to m1, m2... before sending.
import { t } from "../home/i18n.js";
import { attachStep2 } from "./setup/household.js";
import { attachStep1 } from "./setup/location.js";
import { draft, initFromStored } from "./setup/state.js";
import { step1Html, step2Html, stepperHtml } from "./setup/steps.js";

export function renderSetupView(container: HTMLElement): void {
  initFromStored();
  draft.currentStep = 1;

  function render(): void {
    container.innerHTML = `
      <section class="section">
        <div class="container container-setup">
          <h1 class="setup-page-title">${t("setup.title")}</h1>
          ${stepperHtml()}
          <div id="setup-step-content">${draft.currentStep === 1 ? step1Html() : step2Html()}</div>
        </div>
      </section>`;
    if (draft.currentStep === 1) attachStep1(container, () => goTo(2));
    else attachStep2(container, render, () => goTo(1));
  }

  function goTo(step: number): void {
    draft.currentStep = step;
    render();
    container.querySelector<HTMLElement>(".step-title")?.focus();
  }

  render();
}
