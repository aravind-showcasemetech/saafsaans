// view.ts: Five full-height steps: Location, Who lives here, How you travel, Your home, Review.
// Each step is its own address (#/setup?step=travel), ends with Back and Next, and keeps what was
// typed. The review lists everything in plain sentences with an Edit button per group.
import { t } from "../../home/i18n.js";
import { html, setHtml } from "../../ui/html.js";
import type { IconName } from "../../ui/icons.js";
import { actionButton, guideSection, stepLabel } from "../../ui/section.js";
import { router } from "../router.js";
import { collectStep } from "./collect.js";
import { attachLocation } from "./location.js";
import { attachPeople } from "./people.js";
import { STEPS, type StepId, initFromStored, saveAll } from "./state.js";
import { stepContent } from "./steps.js";
import { attachTravel } from "./travel.js";

const ICONS: Record<StepId, IconName> = {
  location: "map-pin",
  people: "users",
  travel: "train-front",
  home: "house",
  review: "arrow-right",
};

function currentStep(): StepId {
  const hash = window.location.hash;
  const q = new URLSearchParams(hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "");
  const step = q.get("step") as StepId | null;
  return step && (STEPS as readonly string[]).includes(step) ? step : "location";
}

function goTo(step: StepId): void {
  window.location.hash = `#/setup?step=${step}`;
}

export function renderSetupView(container: HTMLElement): void {
  initFromStored();
  const step = currentStep();
  const index = STEPS.indexOf(step);
  const prev = STEPS[index - 1];
  const next = STEPS[index + 1];

  const back = prev
    ? actionButton({ label: t("setup.back"), id: "btn-step-back", kind: "secondary" })
    : "";
  const forward = next
    ? actionButton({ label: t("setup.next"), id: "btn-step-next", icon: "arrow-right" })
    : actionButton({ label: t("setup.seePlan"), id: "btn-save-setup", icon: "arrow-right" });

  const section = guideSection({
    id: `setup-${step}`,
    level: 1,
    stepLabel: stepLabel(index + 1, STEPS.length),
    icon: ICONS[step],
    title: t(`setupG.${step}.title`),
    shows: t(`setupG.${step}.shows`),
    can: t(`setupG.${step}.can`),
    content: html`${stepContent(step)}<p id="setup-error" class="error-text" role="alert"></p>`,
    actions: html`${back}${forward}`,
    className: "setup-step is-visible",
  });
  setHtml(container, section);

  if (step === "location") attachLocation(container);
  if (step === "people") attachPeople(container, () => renderSetupView(container));
  if (step === "travel") attachTravel(container);

  const error = container.querySelector<HTMLElement>("#setup-error");
  const leave = (target: () => void) => {
    const problem = collectStep(step, container);
    if (problem) {
      if (error) error.textContent = t(problem.messageKey, { min: problem.min, max: problem.max });
      container.querySelector<HTMLElement>(`#${problem.fieldId}`)?.focus();
      return;
    }
    target();
  };

  container
    .querySelector("#btn-step-back")
    ?.addEventListener("click", () => leave(() => prev && goTo(prev)));
  container
    .querySelector("#btn-step-next")
    ?.addEventListener("click", () => leave(() => next && goTo(next)));
  container.querySelector("#btn-save-setup")?.addEventListener("click", () => {
    saveAll();
    router.navigate("/today");
  });
  container.querySelector<HTMLElement>(".g-title")?.focus({ preventScroll: true });
}
