// format.ts: Formatting helpers for SaafSaans numbers, hours, bands and places.
// Every word comes from the i18n dictionaries; numbers use Indian grouping.

import { getLanguage, t } from "../home/i18n.js";
import { type SafeHtml, html } from "../ui/html.js";

/** Format a number using Indian grouping ("en-IN"). */
export function formatIndianNumber(num: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits }).format(num);
}

/** "06:00" style label for a local hour (0 to 24). */
export function hourLabel(hour: number): string {
  return `${String(hour % 24).padStart(2, "0")}:00`;
}

/** "14:00 to 17:00" in the current language, or null when there is no window. */
export function windowText(window: { startHour: number; endHour: number } | null): string | null {
  if (!window) return null;
  return t("common.range", { start: hourLabel(window.startHour), end: hourLabel(window.endHour) });
}

/** CPCB band name in the current language. */
export function bandLabel(band: string): string {
  return t(`bands.${band}`);
}

/** CSS class for the small band colour bar. */
export function bandClass(band: string): string {
  const classes: Record<string, string> = {
    Good: "band-good",
    Satisfactory: "band-satisfactory",
    "Moderately polluted": "band-moderate",
    Poor: "band-poor",
    "Very Poor": "band-very-poor",
    Severe: "band-severe",
  };
  return classes[band] ?? "band-moderate";
}

/** Place name in the current language when we have one, else as given. */
export function placeLabel(name: string): string {
  const key = `places.${name}`;
  const translated = t(key);
  return translated === key ? name : translated;
}

function locale(): string {
  return { en: "en-IN", hi: "hi-IN", te: "te-IN" }[getLanguage()];
}

/** "Sample data captured on 19 November 2026" from an ISO time, in the current language. */
export function capturedLabel(capturedAt: string | undefined): string | null {
  if (!capturedAt) return null;
  const when = new Date(capturedAt);
  if (Number.isNaN(when.getTime())) return null;
  const date = new Intl.DateTimeFormat(locale(), {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(when);
  return t("sample.capturedOn", { date });
}

/** Local time of day ("17:05") in Asia/Kolkata. */
export function timeOfDay(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

/** A nickname, marked so tests can tell user data from interface text. */
export function nicknameHtml(name: string): SafeHtml {
  return html`<span class="nickname">${name}</span>`;
}
