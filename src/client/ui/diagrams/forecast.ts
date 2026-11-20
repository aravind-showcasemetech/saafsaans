// forecast.ts: The hourly PM2.5 forecast as a bar chart, with the cleanest and dirtiest windows
// outlined on the bars and bracketed above them with a label in words. The SVG is aria-hidden;
// the caption and the window lines below it say the same in words.
import type { NormalisedHourlyForecastItem } from "../../../shared/air-types.js";
import { escapeHtml } from "../../../shared/escape.js";
import type { WindowResult } from "../../../shared/impact.js";
import { bandClass, hourLabel, windowText } from "../../app/format.js";
import { t } from "../../home/i18n.js";
import { bandForAqi } from "./bands.js";

const KOLKATA_OFFSET_MS = 5.5 * 3600 * 1000;
const W = 480;
// Two label rows, so the two labels never overlap even when the windows are close.
const ROW_H = 24;
const LABEL_H = ROW_H * 2 + 6;
const BARS_H = 150;
const H = LABEL_H + BARS_H;

const localHour = (iso: string) =>
  new Date(new Date(iso).getTime() + KOLKATA_OFFSET_MS).getUTCHours();

/** Outline over the window's bars, and a bracket with a label above them. */
function windowMarker(
  w: WindowResult | null,
  hours: readonly NormalisedHourlyForecastItem[],
  slot: number,
  kind: "clean" | "dirty",
  label: string,
): string {
  if (!w) return "";
  // Match on the instant: the forecast and the window format the same time differently.
  const startMs = new Date(w.startTime).getTime();
  const start = hours.findIndex((h) => new Date(h.time).getTime() === startMs);
  if (start < 0) return "";
  const span = Math.round((new Date(w.endTime).getTime() - startMs) / 3_600_000);
  const x1 = start * slot;
  const x2 = Math.min(W, (start + span) * slot);
  const mid = (x1 + x2) / 2;
  const anchor = mid < 70 ? "start" : mid > W - 70 ? "end" : "middle";
  const tx = anchor === "start" ? x1 : anchor === "end" ? x2 : mid;
  // Cleanest on the top row, dirtiest on the second; each bracket sits under its own label.
  const y = (kind === "clean" ? ROW_H : ROW_H * 2) - 2;
  return `
    <rect class="d-window-${kind}" x="${x1.toFixed(1)}" y="${LABEL_H}" width="${(x2 - x1).toFixed(1)}" height="${BARS_H}" />
    <path class="d-bracket-${kind}" d="M${x1.toFixed(1)} ${y + 6} V${y} H${x2.toFixed(1)} V${y + 6}" />
    <text class="d-label-${kind}" x="${tx.toFixed(1)}" y="${y - 6}" text-anchor="${anchor}">${escapeHtml(label)}</text>`;
}

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

  const bars = hours
    .map((h, i) => {
      const height = Math.max(2, (h.pm25 / max) * (BARS_H - 10));
      const band = h.aqi === undefined ? "Satisfactory" : bandForAqi(h.aqi);
      return `<rect class="d-bar ${bandClass(band)}" x="${(i * slot + 1).toFixed(1)}" y="${(H - height).toFixed(1)}" width="${Math.max(1, slot - 2).toFixed(1)}" height="${height.toFixed(1)}" />`;
    })
    .join("");

  const ticks = hours
    .map((h, i) => (i % 6 === 0 ? `<span class="tick">${hourLabel(localHour(h.time))}</span>` : ""))
    .join("");

  return `
    <figure class="diagram forecast">
      <figcaption class="diagram-title">${escapeHtml(t("forecast.title", { hours: hours.length, pm: "PM2.5" }))}</figcaption>
      <svg viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false" class="forecast-svg">
        <line class="d-axis" x1="0" y1="${H - 0.5}" x2="${W}" y2="${H - 0.5}" />
        ${bars}
        ${windowMarker(cleanest, hours, slot, "clean", t("today.cleanest"))}
        ${windowMarker(dirtiest, hours, slot, "dirty", t("today.dirtiest"))}
      </svg>
      <div class="forecast-ticks" aria-hidden="true">${ticks}</div>
      <ul class="forecast-legend">
        <li><span class="legend-key key-clean" aria-hidden="true"></span>${escapeHtml(t("today.cleanest"))}: <strong class="tabular-nums">${escapeHtml(windowText(cleanest) ?? t("today.noWindow"))}</strong></li>
        <li><span class="legend-key key-dirty" aria-hidden="true"></span>${escapeHtml(t("today.dirtiest"))}: <strong class="tabular-nums">${escapeHtml(windowText(dirtiest) ?? t("today.noWindow"))}</strong></li>
      </ul>
    </figure>`;
}
