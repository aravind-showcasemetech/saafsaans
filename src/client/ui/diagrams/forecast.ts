// forecast.ts: The hourly PM2.5 forecast as a bar chart, with the cleanest and dirtiest windows
// outlined on the bars and bracketed above them with a label in words. The SVG is aria-hidden;
// the caption and the window lines below it say the same in words.
import type { NormalisedHourlyForecastItem } from "../../../shared/air-types.js";
import type { WindowResult } from "../../../shared/impact/index.js";
import { bandClass, hourLabel, windowText } from "../../app/format.js";
import { t } from "../../home/i18n.js";
import { type SafeHtml, html } from "../html.js";
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
): SafeHtml | "" {
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
  const [left, right, width] = [x1.toFixed(1), x2.toFixed(1), (x2 - x1).toFixed(1)];
  return html`
    <rect class="d-window-${kind}" x="${left}" y="${LABEL_H}" width="${width}" height="${BARS_H}" />
    <path class="d-bracket-${kind}" d="M${left} ${y + 6} V${y} H${right} V${y + 6}" />
    <text class="d-label-${kind}" x="${tx.toFixed(1)}" y="${y - 6}" text-anchor="${anchor}">${label}</text>`;
}

export function forecastChartHtml(
  hourly: readonly NormalisedHourlyForecastItem[],
  cleanest: WindowResult | null,
  dirtiest: WindowResult | null,
  maxHours = 48,
): SafeHtml {
  const hours = hourly.slice(0, maxHours);
  if (hours.length === 0) return html`<p class="muted">${t("today.noWindow")}</p>`;
  const max = Math.max(...hours.map((h) => h.pm25), 1);
  const slot = W / hours.length;

  const bars = hours.map((h, i) => {
    const height = Math.max(2, (h.pm25 / max) * (BARS_H - 10));
    const band = h.aqi === undefined ? "Satisfactory" : bandForAqi(h.aqi);
    const x = (i * slot + 1).toFixed(1);
    const y = (H - height).toFixed(1);
    const width = Math.max(1, slot - 2).toFixed(1);
    const cls = `d-bar ${bandClass(band)}`;
    return html`<rect class="${cls}" x="${x}" y="${y}" width="${width}" height="${height.toFixed(1)}" />`;
  });

  const ticks = hours.map((h, i) =>
    i % 6 === 0 ? html`<span class="tick">${hourLabel(localHour(h.time))}</span>` : "",
  );

  /** A legend line: the colour key, the window's name and its hours in words. */
  const legendLine = (keyClass: string, name: string, w: WindowResult | null) =>
    html`<li><span class="legend-key ${keyClass}" aria-hidden="true"></span>${name}: <strong
      class="tabular-nums">${windowText(w) ?? t("today.noWindow")}</strong></li>`;

  return html`
    <figure class="diagram forecast">
      <figcaption class="diagram-title">${t("forecast.title", {
        hours: hours.length,
        pm: "PM2.5",
      })}</figcaption>
      <svg viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false" class="forecast-svg">
        <line class="d-axis" x1="0" y1="${H - 0.5}" x2="${W}" y2="${H - 0.5}" />
        ${bars}
        ${windowMarker(cleanest, hours, slot, "clean", t("today.cleanest"))}
        ${windowMarker(dirtiest, hours, slot, "dirty", t("today.dirtiest"))}
      </svg>
      <div class="forecast-ticks" aria-hidden="true">${ticks}</div>
      <ul class="forecast-legend">
        ${legendLine("key-clean", t("today.cleanest"), cleanest)}
        ${legendLine("key-dirty", t("today.dirtiest"), dirtiest)}
      </ul>
    </figure>`;
}
