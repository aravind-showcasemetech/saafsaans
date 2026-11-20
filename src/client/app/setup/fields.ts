// fields.ts: Form building blocks for setup: options, labelled fields and a member card.
import { escapeHtml } from "../../../shared/escape.js";
import { t } from "../../home/i18n.js";
import type { MemberDraft } from "./state.js";

export function options(pairs: Array<[string, string]>, selected: string): string {
  return pairs
    .map(
      ([value, label]) =>
        `<option value="${value}" ${value === selected ? "selected" : ""}>${escapeHtml(label)}</option>`,
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

export function field(id: string, label: string, control: string): string {
  return `<div class="col-span-6"><label class="form-label" for="${id}">${label}</label>${control}</div>`;
}

export function memberCardHtml(m: MemberDraft, idx: number, canRemove: boolean): string {
  const p = `member-${idx}`;
  return `
    <div class="member-entry-card" data-index="${idx}">
      <div class="member-card-header">
        <h3 class="member-header-title">${t("setup.member", { n: idx + 1 })}</h3>
        ${canRemove ? `<button class="btn-text btn-remove-member" data-index="${idx}" type="button" aria-label="${escapeHtml(t("setup.removeMember", { n: idx + 1 }))}">${t("setup.remove")}</button>` : ""}
      </div>
      <div class="grid-12 grid-gap-12">
        ${field(`${p}-nickname`, t("setup.nickname"), `<input id="${p}-nickname" type="text" class="form-input member-nickname" value="${escapeHtml(m.nickname)}" />`)}
        ${field(`${p}-age`, t("setup.ageGroup"), `<select id="${p}-age" class="form-select member-age">${ageOptions(m.ageBand)}</select>`)}
        ${field(
          `${p}-sens`,
          t("setup.sensitivity"),
          `<select id="${p}-sens" class="form-select member-sensitivity">${options(
            [
              ["none", t("setup.sensNone")],
              ["asthma_copd", t("setup.sensAsthma")],
              ["heart_condition", t("setup.sensHeart")],
              ["pregnancy", t("setup.sensPregnancy")],
            ],
            m.sensitivity,
          )}</select>`,
        )}
        ${field(
          `${p}-routine`,
          t("setup.routine"),
          `<select id="${p}-routine" class="form-select member-routine">${options(
            [
              ["school_child", t("setup.routineSchool")],
              ["office_worker", t("setup.routineOffice")],
              ["work_from_home", t("setup.routineWfh")],
              ["outdoor_worker", t("setup.routineOutdoor")],
              ["retired", t("setup.routineRetired")],
            ],
            m.routinePreset,
          )}</select>`,
        )}
        ${field(`${p}-exmin`, t("setup.exerciseMinutes"), `<input id="${p}-exmin" type="number" min="0" max="240" class="form-input member-exercise-min" value="${m.outdoorExerciseMinutes}" />`)}
        ${field(`${p}-extime`, t("setup.exerciseTime"), `<input id="${p}-extime" type="time" class="form-input member-exercise-time" value="${escapeHtml(m.outdoorExerciseTime)}" />`)}
      </div>
    </div>`;
}
