// share-builders.ts: Pure WhatsApp text and iCalendar builders with unit tests.
// Callers pass translated text; these functions only assemble it. No em or en dashes.

const DASHES = new RegExp(`[${String.fromCharCode(0x2014, 0x2013)}]`, "g");

export interface CleanAirWindow {
  startHour: number; // 0..23
  endHour: number; // 1..24
}

/** Joins translated lines into one WhatsApp message, with a blank line between them. */
export function buildWhatsAppShareText(lines: readonly string[]): string {
  return lines
    .map((line) => line.replace(DASHES, ",").trim())
    .filter((line) => line.length > 0)
    .join("\n\n");
}

/** Escapes text for an iCalendar TEXT value (RFC 5545 section 3.3.11). */
export function escapeIcsText(text: string): string {
  return text
    .replace(DASHES, ",")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function icsLocalTime(dateIso: string, hour: number): string {
  // Hour 24 is midnight at the start of the next day.
  const day = new Date(`${dateIso}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + Math.floor(hour / 24));
  const date = day.toISOString().slice(0, 10).replace(/-/g, "");
  return `${date}T${String(hour % 24).padStart(2, "0")}0000`;
}

/** Generates an RFC 5545 iCalendar string (.ics) for one clean air window in Asia/Kolkata time. */
export function buildCalendarIcs(params: {
  dateIso: string; // YYYY-MM-DD
  cleanestWindow: CleanAirWindow;
  summary: string;
  description: string;
  now?: Date;
}): string {
  const { dateIso, cleanestWindow, summary, description } = params;
  const stamp = `${(params.now ?? new Date()).toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
  const start = icsLocalTime(dateIso, cleanestWindow.startHour);
  const uid = `saafsaans-clean-air-${start}-${Math.random().toString(36).substring(2, 10)}`;

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
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=Asia/Kolkata:${start}`,
    `DTEND;TZID=Asia/Kolkata:${icsLocalTime(dateIso, cleanestWindow.endHour)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
