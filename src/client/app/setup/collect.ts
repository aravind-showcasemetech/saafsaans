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

const inputValue = (container: HTMLElement, id: string) =>
  container.querySelector<HTMLInputElement>(`#${id}`)?.value ?? "";
const isChecked = (container: HTMLElement, id: string) =>
  Boolean(container.querySelector<HTMLInputElement>(`#${id}`)?.checked);

/** Step 2: the members, with exercise minutes between 0 and 240. */
function collectPeople(container: HTMLElement): FieldProblem | null {
  collectMembers(container);
  const bad = draft.householdMembers.findIndex(
    (m) => m.outdoorExerciseMinutes < 0 || m.outdoorExerciseMinutes > 240,
  );
  return bad >= 0
    ? { fieldId: `member-${bad}-exmin`, messageKey: "setup.errorRange", min: 0, max: 240 }
    : null;
}

/** Step 3: the commute mode, distance, working days and people sharing. */
function collectTravel(container: HTMLElement): FieldProblem | null {
  const distance = readNumber(container, "commute-dist-input", 0, 200);
  if (isProblem(distance)) return distance;
  const days = readNumber(container, "commute-days-input", 1, 7);
  if (isProblem(days)) return days;
  const people = readNumber(container, "commute-people-input", 1, 10);
  if (isProblem(people)) return people;
  draft.commuteMode = inputValue(container, "commute-mode-select") || draft.commuteMode;
  draft.commuteDistanceKm = distance ?? 0;
  draft.workingDaysPerWeek = Math.round(days ?? 0);
  draft.peopleSharing = Math.round(people ?? 0);
  return null;
}

/** Step 4: the bedroom, the optional purifier rating and the home's habits. */
function collectHome(container: HTMLElement): FieldProblem | null {
  const area = readNumber(container, "bedroom-sqft-input", 20, 2000);
  if (isProblem(area)) return area;
  const height = readNumber(container, "ceiling-height-input", 6, 25);
  if (isProblem(height)) return height;
  const cadr = readNumber(container, "purifier-cadr-input", 1, 2000, true);
  if (isProblem(cadr)) return cadr;
  draft.bedroomSqFt = area ?? 0;
  draft.ceilingHeightFt = height ?? 0;
  draft.purifierCadrCfm = cadr;
  draft.windowHabit = inputValue(container, "window-habit-select") || draft.windowHabit;
  draft.cookingMethod = inputValue(container, "cooking-method-select") || draft.cookingMethod;
  draft.hasPurifier = isChecked(container, "check-has-purifier");
  draft.usesIncense = isChecked(container, "check-uses-incense");
  draft.usesMosquitoCoils = isChecked(container, "check-uses-coils");
  return null;
}

const COLLECTORS: Partial<Record<StepId, (container: HTMLElement) => FieldProblem | null>> = {
  people: collectPeople,
  travel: collectTravel,
  home: collectHome,
};

/** Reads one step into the draft; steps without inputs to check return null. */
export function collectStep(step: StepId, container: HTMLElement): FieldProblem | null {
  return COLLECTORS[step]?.(container) ?? null;
}
