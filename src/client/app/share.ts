// share.ts: Share card view
// WhatsApp text preview and wa.me link, homes taking part slider with communityTotal,
// clean air window calendar download (.ics, Asia/Kolkata), and print view.
// The clean window and CO2 figure are computed from the same air data and swaps as Today.

import { escapeHtml } from "../../shared/escape.js";
import { cleanestAndDirtiestWindows, communityTotal } from "../../shared/impact.js";
import { getLanguage, t } from "../home/i18n.js";
import { fetchAirData } from "./api.js";
import { formatIndianNumber, hourLabel, placeLabel, windowText } from "./format.js";
import { recomputeHouseholdTotals } from "./recompute.js";
import { buildCalendarIcs, buildWhatsAppShareText } from "./share-utils.js";
import { loadHouseholdProfile, loadLocation, loadPlan, loadToggledSwaps } from "./storage.js";

const DEFAULT_HOMES = 10;

function noPlanHtml(): string {
  return `
    <section class="section">
      <div class="container container-narrow">
        <h1 class="page-title">${t("share.title")}</h1>
        <p class="page-lead">${t("share.noPlan")}</p>
        <a href="#/setup" class="btn btn-primary">${t("share.makePlan")}</a>
      </div>
    </section>`;
}

/** Today's date (YYYY-MM-DD) in Asia/Kolkata. */
function kolkataDateIso(when: Date): string {
  return new Date(when.getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
}

export async function renderShareView(container: HTMLElement): Promise<void> {
  const profile = loadHouseholdProfile();
  const location = loadLocation();
  const plan = loadPlan();
  if (!profile || !location || !plan) {
    container.innerHTML = noPlanHtml();
    return;
  }

  const airData = await fetchAirData(location.lat, location.lng, getLanguage()).catch(() => null);
  const hourly = airData?.hourlyForecast ?? [];
  const cleanest = cleanestAndDirtiestWindows(hourly).cleanest;
  const swapIds = new Set(plan.swaps.map((s) => s.id));
  const stored = loadToggledSwaps()?.filter((id) => swapIds.has(id));
  const activeSwapIds = new Set<string>(stored ?? swapIds);
  const totals = recomputeHouseholdTotals({
    profile,
    hourlyForecast: hourly,
    currentPm25: airData?.pm25 ?? 0,
    activeSwapIds,
  });
  const weeklyCo2 = totals.householdCo2WeeklyKg;
  const weeklyText = formatIndianNumber(weeklyCo2, 1);
  const area = placeLabel(location.name);
  const cleanText = windowText(cleanest);
  const origin = window.location.origin;

  const waText = buildWhatsAppShareText([
    t("share.waTitle", { area }),
    cleanest
      ? t("share.waClean", {
          start: hourLabel(cleanest.startHour),
          end: hourLabel(cleanest.endHour),
        })
      : t("share.waNoWindow"),
    t("share.waChoice", { count: activeSwapIds.size, kg: weeklyText }),
    origin ? t("share.waLink", { url: origin }) : t("share.waLinkPlain"),
  ]);
  const waUrl = `https://wa.me/?text=${encodeURIComponent(waText)}`;
  const communityText = (homes: number) =>
    t("common.kgCo2", {
      value: formatIndianNumber(communityTotal(weeklyCo2, homes).totalWeeklySaving),
    });

  container.innerHTML = `
    <section class="section">
      <div class="container container-narrow">
        <div class="header-nav-wrap"><a href="#/today" class="btn-text">${t("share.back")}</a></div>
        <h1 class="page-title">${t("share.title")}</h1>
        <p class="page-lead">${t("share.lead")}</p>

        <div class="air-card section-spacer-32">
          <h2 class="section-label">${t("share.waLabel")}</h2>
          <pre class="share-wa-preview">${escapeHtml(waText)}</pre>
          <a id="whatsapp-share-btn" href="${escapeHtml(waUrl)}" target="_blank" rel="noopener" class="btn btn-primary">${t("share.waButton")}</a>
        </div>

        <div class="air-card section-spacer-32">
          <div class="section-label">${t("share.communityLabel")}</div>
          <h2 class="card-heading">${t("share.communityTitle")}</h2>
          <p class="card-subtext">${t("share.communityHelp")}</p>
          <div class="slider-control-row">
            <label for="homes-slider" class="sr-only">${t("share.homesLabel")}</label>
            <input id="homes-slider" type="range" min="1" max="250" value="${DEFAULT_HOMES}" class="slider-input-flex" />
            <span id="homes-slider-val" class="tabular-nums slider-val-badge">${t("share.homes", { count: DEFAULT_HOMES })}</span>
          </div>
          <div class="slider-summary-row" aria-live="polite">
            <span class="slider-summary-label">${t("share.weekly")}:</span>
            <strong id="community-co2-val" class="tabular-nums slider-summary-val">${communityText(DEFAULT_HOMES)}</strong>
          </div>
        </div>

        <div class="air-card section-spacer-32">
          <div class="section-label">${t("share.calendarLabel")}</div>
          <h2 class="card-heading">${t("share.calendarTitle")}</h2>
          <p class="card-subtext">${cleanText ? t("share.calendarHelp", { window: escapeHtml(cleanText) }) : t("share.calendarNone")}</p>
          <button id="btn-download-ics" class="btn btn-secondary" type="button" ${cleanest ? "" : "disabled"}>${t("share.calendarButton")}</button>
        </div>

        <div class="print-action-wrap">
          <button id="btn-print-plan" class="btn btn-secondary" type="button">${t("share.print")}</button>
        </div>
      </div>
    </section>`;

  const slider = container.querySelector<HTMLInputElement>("#homes-slider");
  const sliderVal = container.querySelector<HTMLElement>("#homes-slider-val");
  const co2Val = container.querySelector<HTMLElement>("#community-co2-val");
  slider?.addEventListener("input", () => {
    const homes = Number(slider.value);
    if (sliderVal) sliderVal.textContent = t("share.homes", { count: homes });
    if (co2Val) co2Val.textContent = communityText(homes);
  });

  container.querySelector("#btn-download-ics")?.addEventListener("click", () => {
    if (!cleanest) return;
    // The window can fall tomorrow, so date the event from the window itself.
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
  });

  container.querySelector("#btn-print-plan")?.addEventListener("click", () => window.print());
}
