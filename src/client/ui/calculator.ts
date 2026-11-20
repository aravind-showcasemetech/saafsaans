// calculator.ts: The "What size purifier does my room need?" form, on home and on Today.
// The arithmetic is purifierAdvice (src/shared); this module only reads inputs and shows steps.
import { escapeHtml } from "../../shared/escape.js";
import { ROOM_LIMITS, purifierAdvice } from "../../shared/purifier-calculator.js";
import { formatIndianNumber } from "../app/format.js";
import { t } from "../home/i18n.js";
import { actionButton } from "./section.js";

export interface RoomDefaults {
  lengthFt: number;
  widthFt: number;
  heightFt: number;
}

function numberField(id: string, label: string, value: number, min: number, max: number): string {
  return `
    <div class="field">
      <label class="field-label" for="${id}">${escapeHtml(label)}</label>
      <input class="input" id="${id}" type="number" inputmode="decimal" min="${min}" max="${max}" step="0.5" value="${value}" required />
    </div>`;
}

/** The calculator form. `prefix` keeps ids unique when two calculators share a page. */
export function calculatorHtml(prefix: string, room: RoomDefaults): string {
  return `
    <form class="calc" id="${prefix}-calc" novalidate>
      <fieldset class="calc-fields">
        <legend class="calc-legend">${escapeHtml(t("calc.legend"))}</legend>
        ${numberField(`${prefix}-length`, t("calc.length"), room.lengthFt, ROOM_LIMITS.sideMinFt, ROOM_LIMITS.sideMaxFt)}
        ${numberField(`${prefix}-width`, t("calc.width"), room.widthFt, ROOM_LIMITS.sideMinFt, ROOM_LIMITS.sideMaxFt)}
        ${numberField(`${prefix}-height`, t("calc.height"), room.heightFt, ROOM_LIMITS.heightMinFt, ROOM_LIMITS.heightMaxFt)}
      </fieldset>
      ${actionButton({ label: t("calc.button"), id: `${prefix}-calc-go`, submit: true })}
      <div class="calc-result" id="${prefix}-calc-result" role="status" aria-live="polite">${calculatorResultHtml(room.lengthFt, room.widthFt, room.heightFt)}</div>
    </form>`;
}

/** The worked steps for one room, as HTML. */
export function calculatorResultHtml(lengthFt: number, widthFt: number, heightFt: number): string {
  const r = purifierAdvice(lengthFt, widthFt, heightFt);
  if ("error" in r) {
    return `<p class="calc-error">${escapeHtml(
      t(`calc.error.${r.error}`, {
        min: r.error === "height" ? ROOM_LIMITS.heightMinFt : ROOM_LIMITS.sideMinFt,
        max: r.error === "height" ? ROOM_LIMITS.heightMaxFt : ROOM_LIMITS.sideMaxFt,
      }),
    )}</p>`;
  }
  const n = (v: number, d = 0) => formatIndianNumber(v, d);
  return `
    <p class="calc-answer"><span class="big-number tabular-nums">${n(Math.round(r.minCadrCfm))}</span> ${escapeHtml(t("calc.unitCfm"))}</p>
    <ol class="calc-steps">
      <li>${escapeHtml(t("calc.stepArea", { length: n(lengthFt, 1), width: n(widthFt, 1), area: n(r.areaSqFt, 1) }))}</li>
      <li>${escapeHtml(t("calc.stepTwoThirds", { area: n(r.areaSqFt, 1), cfm: n(r.cadrAtStandardHeightCfm, 1) }))}</li>
      <li>${escapeHtml(t("calc.stepHeight", { height: n(heightFt, 1), cfm: n(r.minCadrCfm, 1), cubic: n(r.minCadrM3PerHour) }))}</li>
    </ol>`;
}

/**
 * Wires the form: the result shows for the default room from the start and updates as the inputs
 * change; the submit button (or Enter) does the same for keyboard users.
 */
export function attachCalculator(root: HTMLElement, prefix: string): void {
  const form = root.querySelector<HTMLFormElement>(`#${prefix}-calc`);
  const out = root.querySelector<HTMLElement>(`#${prefix}-calc-result`);
  if (!form || !out) return;
  const value = (id: string) =>
    Number(root.querySelector<HTMLInputElement>(`#${prefix}-${id}`)?.value ?? Number.NaN);
  const run = () => {
    out.innerHTML = calculatorResultHtml(value("length"), value("width"), value("height"));
  };
  form.addEventListener("input", run);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    run();
  });
}
