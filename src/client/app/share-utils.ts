// share-utils.ts: Pure WhatsApp text and iCalendar builders with unit tests.
// No em or en dashes, Asia/Kolkata timezone.

export interface CleanAirWindow {
  startHour: number; // 0..23
  endHour: number; // 1..24
  averagePm25?: number;
}

/**
 * Builds clean, dash-free WhatsApp message text.
 */
export function buildWhatsAppShareText(params: {
  areaName: string;
  cleanestStart: string; // e.g. "14:00"
  cleanestEnd: string; // e.g. "17:00"
  swapsCount: number;
  co2SavedKgPerWeek: number;
  originUrl?: string;
}): string {
  const { areaName, cleanestStart, cleanestEnd, swapsCount, co2SavedKgPerWeek, originUrl } = params;
  const url =
    originUrl ||
    (typeof window !== "undefined" && window.location?.origin ? window.location.origin : "");
  const lines = [
    `SaafSaans air plan for ${areaName}:`,
    `Cleanest air window today is between ${cleanestStart} and ${cleanestEnd}.`,
    `Our household chose ${swapsCount} actions, avoiding ${co2SavedKgPerWeek} kg of CO2 weekly.`,
    url ? `Get your family plan at ${url}` : "Get your family plan with SaafSaans",
  ];
  return lines.join("\n\n");
}

/**
 * Generates an RFC 5545 iCalendar string (.ics) for clean air windows in Asia/Kolkata timezone.
 */
export function buildCalendarIcs(params: {
  dateIso: string; // YYYY-MM-DD
  cleanestWindow: CleanAirWindow;
  areaName: string;
}): string {
  const { dateIso, cleanestWindow, areaName } = params;
  const cleanDate = dateIso.replace(/-/g, "");

  const pad = (n: number) => String(n).padStart(2, "0");
  const dtStart = `${cleanDate}T${pad(cleanestWindow.startHour)}0000`;
  const dtEnd = `${cleanDate}T${pad(cleanestWindow.endHour)}0000`;

  const now = `${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  const uid = `saafsaans-clean-air-${cleanDate}-${cleanestWindow.startHour}-${randomSuffix}`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SaafSaans//Smog Planner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VTIMEZONE",
    "TZID:Asia/Kolkata",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:+0530",
    "TZOFFSETTO:+0530",
    "TZNAME:IST",
    "DTSTART:19700101T000000",
    "END:STANDARD",
    "END:VTIMEZONE",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART;TZID=Asia/Kolkata:${dtStart}`,
    `DTEND;TZID=Asia/Kolkata:${dtEnd}`,
    `SUMMARY:Clean Air Window in ${areaName}`,
    "DESCRIPTION:Safest time for outdoor walks, errands or airing rooms according to live air forecast.",
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
