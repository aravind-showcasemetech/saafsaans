// collect.ts: Reads a step's inputs into the draft when the person moves on, and checks numbers
// against the limits the profile schema accepts. Returns the first problem, or null.
import { type StepId, collectMembers, draft } from "./state.js";

export interface FieldProblem {
  fieldId: string;
  messageKey: string;
  min: number;
  max: number;
}

function readNumber(
  container: HTMLElement,
  id: string,
  min: number,
  max: number,
  optional = false,
): number | null | FieldProblem {
  const raw = container.querySelector<HTMLInputElement>(`#${id}`)?.value.trim() ?? "";
  if (raw === "" && optional) return null;
  const v = Number(raw);
  if (raw === "" || !Number.isFinite(v) || v < min || v > max) {
    return { fieldId: id, messageKey: "setup.errorRange", min, max };
  }
  return v;
}

const isProblem = (v: unknown): v is FieldProblem =>
  typeof v === "object" && v !== null && "fieldId" in v;

export function collectStep(step: StepId, container: HTMLElement): FieldProblem | null {
  const value = (id: string) => container.querySelector<HTMLInputElement>(`#${id}`)?.value ?? "";
  const checked = (id: string) =>
    Boolean(container.querySelector<HTMLInputElement>(`#${id}`)?.checked);

  if (step === "people") {
    collectMembers(container);
    const bad = draft.householdMembers.findIndex(
      (m) => m.outdoorExerciseMinutes < 0 || m.outdoorExerciseMinutes > 240,
    );
    return bad >= 0
      ? { fieldId: `member-${bad}-exmin`, messageKey: "setup.errorRange", min: 0, max: 240 }
      : null;
  }
  if (step === "travel") {
    const distance = readNumber(container, "commute-dist-input", 0, 200);
    const days = readNumber(container, "commute-days-input", 1, 7);
    const people = readNumber(container, "commute-people-input", 1, 10);
    for (const v of [distance, days, people]) if (isProblem(v)) return v;
    draft.commuteMode = value("commute-mode-select") || draft.commuteMode;
    draft.commuteDistanceKm = distance as number;
    draft.workingDaysPerWeek = Math.round(days as number);
    draft.peopleSharing = Math.round(people as number);
    return null;
  }
  if (step === "home") {
    const area = readNumber(container, "bedroom-sqft-input", 20, 2000);
    const height = readNumber(container, "ceiling-height-input", 6, 25);
    const cadr = readNumber(container, "purifier-cadr-input", 1, 2000, true);
    for (const v of [area, height, cadr]) if (isProblem(v)) return v;
    draft.bedroomSqFt = area as number;
    draft.ceilingHeightFt = height as number;
    draft.purifierCadrCfm = cadr as number | null;
    draft.windowHabit = value("window-habit-select") || draft.windowHabit;
    draft.cookingMethod = value("cooking-method-select") || draft.cookingMethod;
    draft.hasPurifier = checked("check-has-purifier");
    draft.usesIncense = checked("check-uses-incense");
    draft.usesMosquitoCoils = checked("check-uses-coils");
  }
  return null;
}
