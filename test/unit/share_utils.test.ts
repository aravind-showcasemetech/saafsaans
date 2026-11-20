import { describe, expect, it } from "vitest";
import { buildCalendarIcs, buildWhatsAppShareText } from "../../src/client/app/share-utils.js";

describe("share-utils: WhatsApp and iCalendar builders", () => {
  it("builds WhatsApp share text without dashes and with correct parameters", () => {
    const text = buildWhatsAppShareText({
      areaName: "Kukatpally, Hyderabad",
      cleanestStart: "14:00",
      cleanestEnd: "17:00",
      swapsCount: 4,
      co2SavedKgPerWeek: 16,
    });

    expect(text).toContain("Kukatpally, Hyderabad");
    expect(text).toContain("14:00 and 17:00");
    expect(text).toContain("4 actions");
    expect(text).toContain("16 kg of CO2");
    expect(text).not.toContain("—");
    expect(text).not.toContain("–");
  });

  it("builds valid iCalendar (.ics) with Asia/Kolkata timezone", () => {
    const ics = buildCalendarIcs({
      dateIso: "2026-11-20",
      cleanestWindow: { startHour: 14, endHour: 17 },
      areaName: "Kukatpally",
    });

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("TZID:Asia/Kolkata");
    expect(ics).toContain("DTSTART;TZID=Asia/Kolkata:20261120T140000");
    expect(ics).toContain("DTEND;TZID=Asia/Kolkata:20261120T170000");
    expect(ics).toContain("SUMMARY:Clean Air Window in Kukatpally");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).not.toContain("saafsaans.org");
    expect(ics).not.toContain("—");
    expect(ics).not.toContain("–");
  });
});
