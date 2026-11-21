// trip.ts: "Same trip, two ways": one commute by car and by metro, with the vehicle-km taken off
// the road and the CO2 avoided a day, a week and a winter (FACTORS.md section 9).
import { formatIndianNumber } from "../../app/format.js";
import { t } from "../../home/i18n.js";
import { type SafeHtml, html } from "../html.js";
import { fact } from "./fact-list.js";

export interface TripComparison {
  from: string;
  to: string;
  carKgPerDay: number;
  metroKgPerDay: number;
  kmAvoidedPerDay: number;
  savedKgPerDay: number;
  savedKgPerWeek: number;
  savedKgPerWinter: number;
  isEstimate: boolean;
}

export function tripDiagramHtml(c: TripComparison): SafeHtml {
  const n = (v: number, d = 1) => formatIndianNumber(v, d);
  const kgCo2 = (value: number, d = 1) => t("common.kgCo2", { value: n(value, d) });
  return html`
    <figure class="diagram trip">
      <figcaption class="diagram-title">${t("trip.title", { from: c.from, to: c.to })}</figcaption>
      <svg viewBox="0 0 320 110" aria-hidden="true" focusable="false" class="trip-svg">
        <circle class="d-stop" cx="16" cy="55" r="8" /><circle class="d-stop" cx="304" cy="55" r="8" />
        <path class="d-car" d="M24 47 C110 10 210 10 296 47" />
        <path class="d-metro" d="M24 63 C110 100 210 100 296 63" />
      </svg>
      <dl class="facts-grid">
        ${fact(t("trip.byCar"), t("trip.kgDay", { kg: n(c.carKgPerDay, 2) }), { legend: "key-dirty" })}
        ${fact(t("trip.byMetro"), t("trip.kgDay", { kg: n(c.metroKgPerDay, 2) }), {
          legend: "key-clean",
        })}
        ${fact(t("trip.kmOff"), t("trip.km", { km: n(c.kmAvoidedPerDay, 0) }))}
      </dl>
      <dl class="facts-grid saved">
        ${fact(t("trip.perDay"), kgCo2(c.savedKgPerDay, 2), { key: true })}
        ${fact(t("trip.perWeek"), kgCo2(c.savedKgPerWeek))}
        ${fact(t("trip.perWinter"), kgCo2(c.savedKgPerWinter, 0))}
      </dl>
      ${c.isEstimate ? html`<p class="muted">${t("trip.estimate")}</p>` : ""}
    </figure>`;
}
