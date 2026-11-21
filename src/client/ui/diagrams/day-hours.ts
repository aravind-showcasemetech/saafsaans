// day-hours.ts: "Your day in hours": one person's outdoor walk moved from its usual hour to the
// cleanest window, over the day's hourly PM2.5. The SVG is aria-hidden; the list beside it gives
// the hours and the dose before, after and the cut, all computed by src/shared.
import { bandClass, formatIndianNumber, hourLabel } from "../../app/format.js";
import { t } from "../../home/i18n.js";
import { type SafeHtml, html } from "../html.js";
import { bandForAqi } from "./bands.js";
import { fact } from "./fact-list.js";

export interface WalkShift {
  name: string;
  /** Outdoor PM2.5 for each local hour 0 to 23. */
  hourlyPm25: number[];
  hourlyAqi?: (number | undefined)[];
  beforeHour: number;
  afterHour: number;
  doseBeforeUg: number;
  doseAfterUg: number;
  cutPercent: number;
}

const W = 480;

export function dayHoursHtml(s: WalkShift): SafeHtml {
  const max = Math.max(...s.hourlyPm25, 1);
  const slot = W / 24;
  const cells = s.hourlyPm25.map((pm, h) => {
    const height = Math.max(2, (pm / max) * 56);
    const aqi = s.hourlyAqi?.[h];
    const cls = aqi === undefined ? "band-satisfactory" : bandClass(bandForAqi(aqi));
    const x = (h * slot + 1).toFixed(1);
    const y = (80 - height).toFixed(1);
    const w = (slot - 2).toFixed(1);
    return html`<rect class="d-bar ${cls}" x="${x}" y="${y}" width="${w}" height="${height.toFixed(1)}" />`;
  });
  const marker = (hour: number, cls: string, y: number) => {
    const x = (hour * slot + slot / 2).toFixed(1);
    const line = html`<line class="${cls}" x1="${x}" y1="12" x2="${x}" y2="88" />`;
    return html`${line}<circle class="${cls}-dot" cx="${x}" cy="${y}" r="7" />`;
  };
  const n = (v: number) => formatIndianNumber(v);
  const ticks = [0, 6, 12, 18].map((h) => html`<span class="tick">${hourLabel(h)}</span>`);
  return html`
    <figure class="diagram day-hours">
      <figcaption class="diagram-title">${t("dayHours.title", { name: s.name })}</figcaption>
      <svg viewBox="0 0 ${W} 100" aria-hidden="true" focusable="false" class="day-hours-svg">
        <line class="d-axis" x1="0" y1="80.5" x2="${W}" y2="80.5" />
        ${cells}
        ${marker(s.beforeHour, "d-before", 18)}
        ${marker(s.afterHour, "d-after", 18)}
      </svg>
      <div class="forecast-ticks" aria-hidden="true">${ticks}</div>
      <dl class="facts-grid">
        ${fact(
          t("dayHours.before", { time: hourLabel(s.beforeHour) }),
          t("dayHours.dose", { ug: n(s.doseBeforeUg) }),
          { legend: "key-before" },
        )}
        ${fact(
          t("dayHours.after", { time: hourLabel(s.afterHour) }),
          t("dayHours.dose", { ug: n(s.doseAfterUg) }),
          { legend: "key-after" },
        )}
        ${fact(t("dayHours.cut"), t("dayHours.cutValue", { percent: n(s.cutPercent) }), { key: true })}
      </dl>
    </figure>`;
}
