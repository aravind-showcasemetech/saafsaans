import { describe, expect, it } from "vitest";
import {
  buildCalendarIcs,
  buildWhatsAppShareText,
  escapeIcsText,
} from "../../src/client/app/share-builders.js";

describe("share-builders: WhatsApp and iCalendar builders", () => {
  it("joins translated lines with blank lines, drops empty lines and replaces dashes", () => {
    const text = buildWhatsAppShareText([
      "SaafSaans air plan for Kukatpally, Hyderabad",
      "The cleanest air today is between 14:00 and 17:00.",
      "",
      "Our household chose 4 swaps — and avoids 16 kg of CO₂ a week.",
    ]);

    expect(text).toBe(
      "SaafSaans air plan for Kukatpally, Hyderabad\n\nThe cleanest air today is between 14:00 and 17:00.\n\nOur household chose 4 swaps , and avoids 16 kg of CO₂ a week.",
    );
    expect(text).not.toMatch(/[—–]/);
  });

  it("escapes iCalendar text values", () => {
    expect(escapeIcsText("a, b; c\\d\ne")).toBe("a\\, b\\; c\\\\d\\ne");
  });

  it("builds valid iCalendar (.ics) with Asia/Kolkata timezone", () => {
    const ics = buildCalendarIcs({
      dateIso: "2026-11-20",
      cleanestWindow: { startHour: 14, endHour: 17 },
      summary: "Clean air hours in Kukatpally, Hyderabad",
      description: "Best time for walks",
      now: new Date("2026-11-20T08:00:00Z"),
    });

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("TZID:Asia/Kolkata");
    expect(ics).toContain("DTSTAMP:20261120T080000Z");
    expect(ics).toContain("DTSTART;TZID=Asia/Kolkata:20261120T140000");
    expect(ics).toContain("DTEND;TZID=Asia/Kolkata:20261120T170000");
    expect(ics).toContain("SUMMARY:Clean air hours in Kukatpally\\, Hyderabad");
    expect(ics).toContain("DESCRIPTION:Best time for walks");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics.split("\r\n").length).toBeGreaterThan(10);
  });

  it("writes an end at hour 24 as midnight on the next day", () => {
    const ics = buildCalendarIcs({
      dateIso: "2026-11-30",
      cleanestWindow: { startHour: 21, endHour: 24 },
      summary: "s",
      description: "d",
    });
    expect(ics).toContain("DTEND;TZID=Asia/Kolkata:20261201T000000");
  });
});
