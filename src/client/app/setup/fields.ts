// fields.ts: Form building blocks for setup. Every field has a label and a one-line "Why we ask"
// note, tied to the control with aria-describedby.
import { t } from "../../home/i18n.js";
import { type SafeHtml, html } from "../../ui/html.js";
import type { MemberDraft } from "./state.js";

export function options(pairs: Array<[string, string]>, selected: string): SafeHtml {
  return html`${pairs.map(
    ([v, label]) =>
      html`<option value="${v}" ${v === selected ? "selected" : ""}>${label}</option>`,
  )}`;
}

function ageOptions(selected: string): SafeHtml {
  return options(
    [
      ["under-6", t("setup.ageUnder", { n: 6 })],
      ["6-10", t("setup.ageRange", { min: 6, max: 10 })],
      ["11-15", t("setup.ageRange", { min: 11, max: 15 })],
      ["16-30", t("setup.ageRange", { min: 16, max: 30 })],
      ["31-40", t("setup.ageRange", { min: 31, max: 40 })],
      ["41-60", t("setup.ageRange", { min: 41, max: 60 })],
      ["61-70", t("setup.ageRange", { min: 61, max: 70 })],
      ["71-plus", t("setup.agePlus", { n: 71 })],
    ],
    selected,
  );
}

/** The one-line "Why we ask" note under a control. */
export function whyNote(id: string, whyKey: string): SafeHtml {
  return html`<p class="field-why" id="${id}-why"><span class="why-label">${t(
    "setup.whyLabel",
  )}</span> ${t(whyKey)}</p>`;
}

/**
 * A labelled field with its "Why we ask" note. `control` must carry id="{id}" and
 * aria-describedby="{id}-why".
 */
export function field(id: string, label: string, whyKey: string, control: SafeHtml): SafeHtml {
  return html`
    <div class="field">
      <label class="field-label" for="${id}">${label}</label>
      ${control}
      ${whyNote(id, whyKey)}
    </div>`;
}

export function numberInput(
  id: string,
  value: number | string,
  min: number,
  max: number,
  step = 1,
  extraClass = "",
): SafeHtml {
  const cls = extraClass ? `input ${extraClass}` : "input";
  return html`<input class="${cls}" id="${id}" type="number" inputmode="decimal" min="${min}"
    max="${max}" step="${step}" value="${value}" aria-describedby="${id}-why" />`;
}

/** A text or time input tied to its "Why we ask" note. */
function textInput(
  id: string,
  cls: string,
  type: "text" | "time",
  value: string,
  maxLength?: number,
) {
  const max = maxLength ? html` maxlength="${maxLength}"` : "";
  return html`<input class="input ${cls}" id="${id}" type="${type}"${max} value="${value}"
    aria-describedby="${id}-why" />`;
}

export function selectInput(id: string, cls: string, optionsHtml: SafeHtml): SafeHtml {
  return html`<select class="input ${cls}" id="${id}" aria-describedby="${id}-why">${optionsHtml}</select>`;
}

const SENSITIVITIES: Array<[string, string]> = [
  ["none", "setup.sensNone"],
  ["asthma_copd", "setup.sensAsthma"],
  ["heart_condition", "setup.sensHeart"],
  ["pregnancy", "setup.sensPregnancy"],
];

const ROUTINES: Array<[string, string]> = [
  ["school_child", "setup.routineSchool"],
  ["office_worker", "setup.routineOffice"],
  ["work_from_home", "setup.routineWfh"],
  ["outdoor_worker", "setup.routineOutdoor"],
  ["retired", "setup.routineRetired"],
];

const translated = (pairs: Array<[string, string]>): Array<[string, string]> =>
  pairs.map(([v, key]) => [v, t(key)]);

export function memberCardHtml(m: MemberDraft, idx: number, canRemove: boolean): SafeHtml {
  const p = `member-${idx}`;
  const remove = canRemove
    ? html`<button class="btn btn-secondary btn-remove-member" data-index="${idx}" type="button"
        aria-label="${t("setup.removeMember", { n: idx + 1 })}">${t("setup.remove")}</button>`
    : "";
  return html`
    <fieldset class="member-card panel" data-index="${idx}">
      <legend class="member-legend">${t("setup.member", { n: idx + 1 })}</legend>
      <div class="field-grid">
        ${field(
          `${p}-nickname`,
          t("setup.nickname"),
          "setup.why.nickname",
          textInput(`${p}-nickname`, "member-nickname", "text", m.nickname, 50),
        )}
        ${field(
          `${p}-age`,
          t("setup.ageGroup"),
          "setup.why.age",
          selectInput(`${p}-age`, "member-age", ageOptions(m.ageBand)),
        )}
        ${field(
          `${p}-sens`,
          t("setup.sensitivity"),
          "setup.why.sensitivity",
          selectInput(
            `${p}-sens`,
            "member-sensitivity",
            options(translated(SENSITIVITIES), m.sensitivity),
          ),
        )}
        ${field(
          `${p}-routine`,
          t("setup.routine"),
          "setup.why.routine",
          selectInput(
            `${p}-routine`,
            "member-routine",
            options(translated(ROUTINES), m.routinePreset),
          ),
        )}
        ${field(
          `${p}-exmin`,
          t("setup.exerciseMinutes"),
          "setup.why.exercise",
          numberInput(`${p}-exmin`, m.outdoorExerciseMinutes, 0, 240, 1, "member-exercise-min"),
        )}
        ${field(
          `${p}-extime`,
          t("setup.exerciseTime"),
          "setup.why.exerciseTime",
          textInput(`${p}-extime`, "member-exercise-time", "time", m.outdoorExerciseTime),
        )}
      </div>
      ${remove}
    </fieldset>`;
}
