// share.ts: The share screen: the WhatsApp message, the "homes taking part" slider (communityTotal),
// the clean air window as a calendar file, and a print view. The clean window and CO2 figure come
// from the same air data and ticked swaps as Today.
import { escapeHtml } from "../../shared/escape.js";
import { cleanestAndDirtiestWindows, communityTotal } from "../../shared/impact.js";
import { getLanguage, t } from "../home/i18n.js";
import { downloadCleanWindowIcs } from "../ui/calendar.js";
import { actionButton, guideSection } from "../ui/section.js";
import { fetchAirData } from "./api.js";
import { formatIndianNumber, placeLabel, windowText } from "./format.js";
import { recomputeHouseholdTotals } from "./recompute.js";
import { planShareText, whatsAppUrl } from "./share-text.js";
import { loadHouseholdProfile, loadLocation, loadPlan, loadToggledSwaps } from "./storage.js";

const DEFAULT_HOMES = 10;
const e = escapeHtml;

function noPlanHtml(): string {
  return guideSection({
    id: "share",
    level: 1,
    stepLabel: t("share.label"),
    icon: "share",
    title: t("share.title"),
    shows: t("share.shows"),
    can: t("share.can"),
    content: `<p>${e(t("share.noPlan"))}</p>`,
    actions: actionButton({ label: t("share.makePlan"), href: "#/setup" }),
  });
}

export async function renderShareView(container: HTMLElement): Promise<void> {
  const profile = loadHouseholdProfile();
  const location = loadLocation();
  const plan = loadPlan();
  if (!(profile && location && plan)) {
    container.innerHTML = noPlanHtml();
    return;
  }

  const airData = await fetchAirData(location.lat, location.lng, getLanguage()).catch(() => null);
  const hourly = airData?.hourlyForecast ?? [];
  const cleanest = cleanestAndDirtiestWindows(hourly).cleanest;
  const swapIds = new Set(plan.swaps.map((s) => s.id));
  const stored = loadToggledSwaps()?.filter((id) => swapIds.has(id));
  const active = new Set<string>(stored ?? swapIds);
  const weeklyCo2 = recomputeHouseholdTotals({
    profile,
    hourlyForecast: hourly,
    currentPm25: airData?.pm25 ?? 0,
    activeSwapIds: active,
  }).householdCo2WeeklyKg;
  const area = placeLabel(location.name);
  const cleanText = windowText(cleanest);
  const waText = planShareText({
    area,
    cleanest,
    swapsChosen: active.size,
    weeklyCo2Kg: weeklyCo2,
    origin: window.location.origin,
  });
  const community = (homes: number) =>
    t("common.kgCo2", {
      value: formatIndianNumber(communityTotal(weeklyCo2, homes).totalWeeklySaving),
    });

  const content = `
    <div class="two-col">
      <div class="stack">
        <h2 class="list-title">${e(t("share.waLabel"))}</h2>
        <pre class="share-wa-preview">${e(waText)}</pre>
      </div>
      <div class="stack">
        <div class="panel">
          <h2 class="list-title">${e(t("share.communityTitle"))}</h2>
          <p class="muted">${e(t("share.communityHelp"))}</p>
          <label for="homes-slider" class="field-label">${e(t("share.homesLabel"))}</label>
          <input id="homes-slider" class="range" type="range" min="1" max="250" value="${DEFAULT_HOMES}" />
          <p><span id="homes-slider-val" class="tabular-nums">${e(t("share.homes", { count: DEFAULT_HOMES }))}</span></p>
          <p aria-live="polite">${e(t("share.weekly"))}: <strong id="community-co2-val" class="tabular-nums">${e(community(DEFAULT_HOMES))}</strong></p>
        </div>
        <div class="panel">
          <h2 class="list-title">${e(t("share.calendarTitle"))}</h2>
          <p class="muted">${cleanText ? e(t("share.calendarHelp", { window: cleanText })) : e(t("share.calendarNone"))}</p>
          ${cleanest ? actionButton({ label: t("share.calendarButton"), id: "btn-download-ics", icon: "calendar", kind: "secondary" }) : ""}
        </div>
      </div>
    </div>
    <p><a href="#/today">${e(t("share.back"))}</a></p>`;

  container.innerHTML = guideSection({
    id: "share",
    level: 1,
    stepLabel: t("share.label"),
    icon: "share",
    title: t("share.title"),
    shows: t("share.shows"),
    can: t("share.can"),
    content,
    actions:
      actionButton({
        label: t("share.waButton"),
        href: whatsAppUrl(waText),
        id: "whatsapp-share-btn",
        icon: "share",
        attrs: 'target="_blank" rel="noopener"',
      }) +
      actionButton({
        label: t("share.print"),
        id: "btn-print-plan",
        icon: "printer",
        kind: "secondary",
      }),
    className: "is-visible",
  });

  const slider = container.querySelector<HTMLInputElement>("#homes-slider");
  slider?.addEventListener("input", () => {
    const homes = Number(slider.value);
    const val = container.querySelector("#homes-slider-val");
    const co2 = container.querySelector("#community-co2-val");
    if (val) val.textContent = t("share.homes", { count: homes });
    if (co2) co2.textContent = community(homes);
  });
  container.querySelector("#btn-download-ics")?.addEventListener("click", () => {
    if (cleanest) downloadCleanWindowIcs(cleanest, area);
  });
  container.querySelector("#btn-print-plan")?.addEventListener("click", () => window.print());
}
