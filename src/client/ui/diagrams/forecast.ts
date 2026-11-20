// forecast.ts: The hourly PM2.5 forecast as a bar chart, with the cleanest and dirtiest windows
// marked. The SVG is aria-hidden; the caption and the window lines beside it say the same in words.
import type { NormalisedHourlyForecastItem } from "../../../shared/air-types.js";
import { escapeHtml } from "../../../shared/escape.js";
import type { WindowResult } from "../../../shared/impact.js";
import { bandClass, hourLabel, windowText } from "../../app/format.js";
import { t } from "../../home/i18n.js";
import { bandForAqi } from "./bands.js";

const KOLKATA_OFFSET_MS = 5.5 * 3600 * 1000;
const W = 480;
const H = 160;

const localHour = (iso: string) =>
  new Date(new Date(iso).getTime() + KOLKATA_OFFSET_MS).getUTCHours();

export function forecastChartHtml(
  hourly: readonly NormalisedHourlyForecastItem[],
  cleanest: WindowResult | null,
  dirtiest: WindowResult | null,
  maxHours = 48,
): string {
  const hours = hourly.slice(0, maxHours);
  if (hours.length === 0) return `<p class="muted">${escapeHtml(t("today.noWindow"))}</p>`;
  const max = Math.max(...hours.map((h) => h.pm25), 1);
  const slot = W / hours.length;
  const indexOf = (iso: string | undefined) => hours.findIndex((h) => h.time === iso);

  const windowRect = (w: WindowResult | null, cls: string) => {
    if (!w) return "";
    const start = indexOf(w.startTime);
    if (start < 0) return "";
    const span = Math.round(
      (new Date(w.endTime).getTime() - new Date(w.startTime).getTime()) / 3_600_000,
    );
    return `<rect class="${cls}" x="${(start * slot).toFixed(1)}" y="0" width="${(span * slot).toFixed(1)}" height="${H}" />`;
  };

  const bars = hours
    .map((h, i) => {
      const height = Math.max(2, (h.pm25 / max) * (H - 8));
      const band = h.aqi === undefined ? "Satisfactory" : bandForAqi(h.aqi);
      return `<rect class="d-bar ${bandClass(band)}" x="${(i * slot + 1).toFixed(1)}" y="${(H - height).toFixed(1)}" width="${Math.max(1, slot - 2).toFixed(1)}" height="${height.toFixed(1)}" />`;
    })
    .join("");

  const ticks = hours
    .map((h, i) =>
      i % 6 === 0
        ? `<span class="tick" data-col="${i}">${hourLabel(localHour(h.time))}</span>`
        : "",
    )
    .join("");

  return `
    <figure class="diagram forecast">
      <figcaption class="diagram-title">${escapeHtml(t("forecast.title", { hours: hours.length, pm: "PM2.5" }))}</figcaption>
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true" focusable="false" class="forecast-svg">
        ${windowRect(cleanest, "d-window-clean")}${windowRect(dirtiest, "d-window-dirty")}
        <line class="d-axis" x1="0" y1="${H - 0.5}" x2="${W}" y2="${H - 0.5}" />
        ${bars}
      </svg>
      <div class="forecast-ticks" aria-hidden="true" data-cols="${hours.length}">${ticks}</div>
      <ul class="forecast-legend">
        <li><span class="legend-key key-clean" aria-hidden="true"></span>${escapeHtml(t("today.cleanest"))}: <strong class="tabular-nums">${escapeHtml(windowText(cleanest) ?? t("today.noWindow"))}</strong></li>
        <li><span class="legend-key key-dirty" aria-hidden="true"></span>${escapeHtml(t("today.dirtiest"))}: <strong class="tabular-nums">${escapeHtml(windowText(dirtiest) ?? t("today.noWindow"))}</strong></li>
      </ul>
    </figure>`;
}
