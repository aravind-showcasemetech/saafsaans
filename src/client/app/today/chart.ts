// chart.ts: The next 24 hours of PM2.5 as a plain bar chart with local hour labels.
import type { NormalisedAirData } from "../../../shared/air-types.js";
import { escapeHtml } from "../../../shared/escape.js";
import { t } from "../../home/i18n.js";
import { bandClass, formatIndianNumber, hourLabel } from "../format.js";

const KOLKATA_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function chartHtml(hourly: NormalisedAirData["hourlyForecast"]): string {
  const next = hourly.slice(0, 24);
  const maxPm25 = Math.max(...next.map((h) => h.pm25 || 0), 1);
  const bars = next
    .map((h, i) => {
      const localHour = new Date(new Date(h.time).getTime() + KOLKATA_OFFSET_MS).getUTCHours();
      const heightPct = Math.min(100, Math.round(((h.pm25 || 0) / maxPm25) * 100));
      const band = h.aqi === undefined ? "Satisfactory" : bandFromAqi(h.aqi);
      const label = t("today.hourBar", {
        time: hourLabel(localHour),
        pm: "PM2.5",
        value: formatIndianNumber(h.pm25, 1),
      });
      return `
        <div class="chart-bar-col">
          <div class="chart-bar ${bandClass(band)}" data-height="${heightPct}" title="${escapeHtml(label)}"></div>
          <span class="chart-bar-hour">${i % 6 === 0 ? hourLabel(localHour) : ""}</span>
        </div>`;
    })
    .join("");
  return `<div class="chart-strip-track">${bars}</div>`;
}

function bandFromAqi(aqi: number): string {
  if (aqi > 400) return "Severe";
  if (aqi > 300) return "Very Poor";
  if (aqi > 200) return "Poor";
  if (aqi > 100) return "Moderately polluted";
  if (aqi > 50) return "Satisfactory";
  return "Good";
}
