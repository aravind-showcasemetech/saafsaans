// calendar.ts: Downloads today's cleanest window as an .ics event (Asia/Kolkata), in the current
// language. Used by the home page, Today and the share screen.
import type { WindowResult } from "../../shared/impact.js";
import { buildCalendarIcs } from "../app/share-utils.js";
import { t } from "../home/i18n.js";

/** The window's date (YYYY-MM-DD) in Asia/Kolkata; a window can fall on the next day. */
export function kolkataDateIso(when: Date): string {
  return new Date(when.getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
}

export function downloadCleanWindowIcs(cleanest: WindowResult, area: string): void {
  const dateIso = kolkataDateIso(new Date(cleanest.startTime));
  const ics = buildCalendarIcs({
    dateIso,
    cleanestWindow: cleanest,
    summary: t("share.icsSummary", { area }),
    description: t("share.icsDescription"),
  });
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `saafsaans-clean-air-${dateIso}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
