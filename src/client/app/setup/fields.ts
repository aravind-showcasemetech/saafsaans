// fields.ts: Form building blocks for setup. Every field has a label and a one-line "Why we ask"
// note, tied to the control with aria-describedby.
import { escapeHtml } from "../../../shared/escape.js";
import { t } from "../../home/i18n.js";
import type { MemberDraft } from "./state.js";

const e = escapeHtml;

export function options(pairs: Array<[string, string]>, selected: string): string {
  return pairs
    .map(
      ([v, label]) =>
        `<option value="${v}" ${v === selected ? "selected" : ""}>${e(label)}</option>`,
    )
    .join("");
}

function ageOptions(selected: string): string {
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

/**
 * A labelled field with its "Why we ask" note. `control` must carry id="{id}" and
 * aria-describedby="{id}-why".
 */
export function field(id: string, label: string, whyKey: string, control: string): string {
  return `
    <div class="field">
      <label class="field-label" for="${id}">${e(label)}</label>
      ${control}
      <p class="field-why" id="${id}-why"><span class="why-label">${e(t("setup.whyLabel"))}</span> ${e(t(whyKey))}</p>
    </div>`;
}

export function numberInput(
  id: string,
  value: number | string,
  min: number,
  max: number,
  step = 1,
): string {
  return `<input class="input" id="${id}" type="number" inputmode="decimal" min="${min}" max="${max}" step="${step}" value="${value}" aria-describedby="${id}-why" />`;
}

export function selectInput(id: string, cls: string, html: string): string {
  return `<select class="input ${cls}" id="${id}" aria-describedby="${id}-why">${html}</select>`;
}

export function memberCardHtml(m: MemberDraft, idx: number, canRemove: boolean): string {
  const p = `member-${idx}`;
  return `
    <fieldset class="member-card panel" data-index="${idx}">
      <legend class="member-legend">${e(t("setup.member", { n: idx + 1 }))}</legend>
      <div class="field-grid">
        ${field(`${p}-nickname`, t("setup.nickname"), "setup.why.nickname", `<input class="input member-nickname" id="${p}-nickname" type="text" maxlength="50" value="${e(m.nickname)}" aria-describedby="${p}-nickname-why" />`)}
        ${field(`${p}-age`, t("setup.ageGroup"), "setup.why.age", selectInput(`${p}-age`, "member-age", ageOptions(m.ageBand)))}
        ${field(
          `${p}-sens`,
          t("setup.sensitivity"),
          "setup.why.sensitivity",
          selectInput(
            `${p}-sens`,
            "member-sensitivity",
            options(
              [
                ["none", t("setup.sensNone")],
                ["asthma_copd", t("setup.sensAsthma")],
                ["heart_condition", t("setup.sensHeart")],
                ["pregnancy", t("setup.sensPregnancy")],
              ],
              m.sensitivity,
            ),
          ),
        )}
        ${field(
          `${p}-routine`,
          t("setup.routine"),
          "setup.why.routine",
          selectInput(
            `${p}-routine`,
            "member-routine",
            options(
              [
                ["school_child", t("setup.routineSchool")],
                ["office_worker", t("setup.routineOffice")],
                ["work_from_home", t("setup.routineWfh")],
                ["outdoor_worker", t("setup.routineOutdoor")],
                ["retired", t("setup.routineRetired")],
              ],
              m.routinePreset,
            ),
          ),
        )}
        ${field(`${p}-exmin`, t("setup.exerciseMinutes"), "setup.why.exercise", numberInput(`${p}-exmin`, m.outdoorExerciseMinutes, 0, 240).replace('class="input"', 'class="input member-exercise-min"'))}
        ${field(`${p}-extime`, t("setup.exerciseTime"), "setup.why.exerciseTime", `<input class="input member-exercise-time" id="${p}-extime" type="time" value="${e(m.outdoorExerciseTime)}" aria-describedby="${p}-extime-why" />`)}
      </div>
      ${canRemove ? `<button class="btn btn-secondary btn-remove-member" data-index="${idx}" type="button" aria-label="${e(t("setup.removeMember", { n: idx + 1 }))}">${e(t("setup.remove"))}</button>` : ""}
    </fieldset>`;
}
