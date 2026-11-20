// trip.ts: "Same trip, two ways": one commute by car and by metro, with the vehicle-km taken off
// the road and the CO2 avoided a day, a week and a winter (FACTORS.md section 9).
import { escapeHtml } from "../../../shared/escape.js";
import { formatIndianNumber } from "../../app/format.js";
import { t } from "../../home/i18n.js";

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

export function tripDiagramHtml(c: TripComparison): string {
  const n = (v: number, d = 1) => formatIndianNumber(v, d);
  return `
    <figure class="diagram trip">
      <figcaption class="diagram-title">${escapeHtml(t("trip.title", { from: c.from, to: c.to }))}</figcaption>
      <svg viewBox="0 0 320 110" aria-hidden="true" focusable="false" class="trip-svg">
        <circle class="d-stop" cx="16" cy="55" r="8" /><circle class="d-stop" cx="304" cy="55" r="8" />
        <path class="d-car" d="M24 47 C110 10 210 10 296 47" />
        <path class="d-metro" d="M24 63 C110 100 210 100 296 63" />
      </svg>
      <dl class="facts-grid">
        <div><dt><span class="legend-key key-dirty" aria-hidden="true"></span>${escapeHtml(t("trip.byCar"))}</dt><dd class="tabular-nums">${escapeHtml(t("trip.kgDay", { kg: n(c.carKgPerDay, 2) }))}</dd></div>
        <div><dt><span class="legend-key key-clean" aria-hidden="true"></span>${escapeHtml(t("trip.byMetro"))}</dt><dd class="tabular-nums">${escapeHtml(t("trip.kgDay", { kg: n(c.metroKgPerDay, 2) }))}</dd></div>
        <div><dt>${escapeHtml(t("trip.kmOff"))}</dt><dd class="tabular-nums">${escapeHtml(t("trip.km", { km: n(c.kmAvoidedPerDay, 0) }))}</dd></div>
      </dl>
      <dl class="facts-grid saved">
        <div class="is-key"><dt>${escapeHtml(t("trip.perDay"))}</dt><dd class="big-number tabular-nums">${escapeHtml(t("common.kgCo2", { value: n(c.savedKgPerDay, 2) }))}</dd></div>
        <div><dt>${escapeHtml(t("trip.perWeek"))}</dt><dd class="tabular-nums">${escapeHtml(t("common.kgCo2", { value: n(c.savedKgPerWeek) }))}</dd></div>
        <div><dt>${escapeHtml(t("trip.perWinter"))}</dt><dd class="tabular-nums">${escapeHtml(t("common.kgCo2", { value: n(c.savedKgPerWinter, 0) }))}</dd></div>
      </dl>
      ${c.isEstimate ? `<p class="muted">${escapeHtml(t("trip.estimate"))}</p>` : ""}
    </figure>`;
}
