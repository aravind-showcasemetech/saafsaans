// today.ts: Today view (DESIGN.md section 9)
// Air now, the hourly strip, swap rows with toggles, family totals in a polite live region, refine box.
// Every word comes from the i18n dictionaries; every number from src/shared.

import type { NormalisedAirData } from "../../shared/air-types.js";
import { escapeHtml } from "../../shared/escape.js";
import { cleanestAndDirtiestWindows, minPurifierCadr } from "../../shared/impact.js";
import type { HouseholdProfile } from "../../shared/schemas.js";
import { getLanguage, t } from "../home/i18n.js";
import { type PlanResponse, fetchAirData, fetchPlan } from "./api.js";
import { formatIndianNumber, placeLabel, windowText } from "./format.js";
import { recomputeHouseholdTotals } from "./recompute.js";
import { router } from "./router.js";
import {
  type StoredLocation,
  loadHouseholdProfile,
  loadLocation,
  loadNicknames,
  loadToggledSwaps,
  savePlan,
  saveToggledSwaps,
} from "./storage.js";
import { airNowHtml } from "./today/air-now.js";
import { chartHtml } from "./today/chart.js";
import { REFINE_MAX, attachRefine } from "./today/refine.js";
import { errorHtml, loadingHtml } from "./today/states.js";
import { swapRowHtml } from "./today/swap-row.js";
import { totalsHtml } from "./today/totals.js";

export async function renderTodayView(container: HTMLElement): Promise<void> {
  const profile = loadHouseholdProfile();
  const location = loadLocation();
  if (!profile || profile.members.length === 0 || !location) {
    // No household yet: open the demo family instead of inventing one here.
    router.navigate("/demo");
    return;
  }

  container.innerHTML = loadingHtml();

  try {
    const lang = getLanguage();
    const lat = Math.round(location.lat * 100) / 100;
    const lng = Math.round(location.lng * 100) / 100;
    const [airData, planData] = await Promise.all([
      fetchAirData(lat, lng, lang),
      fetchPlan({ profile, lat, lng, lang }),
    ]);
    savePlan(planData);
    renderContent(container, profile, location, loadNicknames(), airData, planData);
  } catch (err: unknown) {
    console.error("Failed to load Today view:", err);
    container.innerHTML = errorHtml();
  }
}

function renderContent(
  container: HTMLElement,
  profile: HouseholdProfile,
  location: StoredLocation,
  nicknames: Record<string, string>,
  airData: NormalisedAirData,
  planData: PlanResponse,
): void {
  const hourly = airData.hourlyForecast || [];
  const windows = cleanestAndDirtiestWindows(hourly);
  const cleanestText = windowText(windows.cleanest) ?? t("today.noWindow");
  const dirtiestText = windowText(windows.dirtiest) ?? t("today.noWindow");
  const swaps = planData.swaps || [];
  const swapIds = new Set(swaps.map((s) => s.id));
  const stored = loadToggledSwaps()?.filter((id) => swapIds.has(id));
  const activeSwapIds = new Set<string>(stored ?? swapIds);
  const nameOf = (id: string): string => nicknames[id] || id;
  const purifierCfm = Math.round(
    minPurifierCadr(profile.home.bedroomAreaSqFt, profile.home.ceilingHeightFt).minCadrCfm,
  );
  let expanded = false;

  container.innerHTML = `
    <section class="section today-section">
      <div class="container">
        <div class="header-actions-wrap">
          <div>
            <div class="section-label">${escapeHtml(placeLabel(location.name))}</div>
            <h1 class="today-page-title">${t("today.title")}</h1>
          </div>
          <div><a href="#/share" class="btn btn-secondary">${t("today.share")}</a></div>
        </div>
        <div class="today-layout">
          <div class="main-col">
            ${airNowHtml(profile, airData, planData, nameOf)}
            <div class="section-spacer-32">
              <h2 class="section-label">${t("today.forecastLabel")}</h2>
              <div class="chart-strip-wrapper" role="img" aria-label="${escapeHtml(`${t("today.forecastHelp")} ${t("today.cleanest")}: ${cleanestText}. ${t("today.dirtiest")}: ${dirtiestText}.`)}">
                ${chartHtml(hourly)}
              </div>
              <div class="chart-bar-clean-dirt-wrap">
                <div>${t("today.cleanest")}: <strong class="tabular-nums text-ink">${escapeHtml(cleanestText)}</strong></div>
                <div>${t("today.dirtiest")}: <strong class="tabular-nums text-ink">${escapeHtml(dirtiestText)}</strong></div>
              </div>
            </div>
            <div class="section-spacer-32">
              <h2 class="section-heading">${t("today.swapsHeading")}</h2>
              <div id="swaps-list">${swaps.map((s) => swapRowHtml(s, activeSwapIds.has(s.id), nameOf)).join("")}</div>
            </div>
            <div class="air-card section-spacer-32">
              <div class="section-label">${t("today.indoorLabel")}</div>
              <h2 class="card-heading">${t("today.indoorTitle")}</h2>
              <ul class="indoor-hacks-list">
                <li>${t("today.indoorPurifier", { cfm: formatIndianNumber(purifierCfm) })}</li>
                <li>${t("today.indoorAiring", { window: escapeHtml(cleanestText) })}</li>
                <li>${t("today.indoorShut", { window: escapeHtml(dirtiestText) })}</li>
                <li>${t("today.indoorMop")}</li>
              </ul>
            </div>
            <div class="health-warning-box">
              <p class="health-warning-p1"><strong>${t("today.notMedicalTitle")}</strong> ${t("today.notMedicalText")}</p>
              <p>${t("today.doctor")}</p>
            </div>
            <div class="refine-container">
              <h2 class="refine-heading">${t("today.refineTitle")}</h2>
              <p class="refine-subtext" id="refine-help">${t("today.refineHelp")}</p>
              <label for="refine-input" class="sr-only">${t("today.refineLabel")}</label>
              <textarea id="refine-input" class="form-textarea" rows="3" maxlength="${REFINE_MAX}" aria-describedby="refine-help refine-char-count" placeholder="${escapeHtml(t("today.refinePlaceholder"))}"></textarea>
              <div class="refine-footer">
                <span id="refine-char-count" class="char-count-text">${t("today.charsLeft", { count: REFINE_MAX })}</span>
                <button id="btn-submit-refine" class="btn btn-secondary" type="button">${t("today.updatePlan")}</button>
              </div>
              <p id="refine-status" class="error-msg" role="status"></p>
            </div>
          </div>
          <div class="side-col">
            <aside class="totals-sticky-col" aria-label="${t("totals.label")}" aria-live="polite"></aside>
          </div>
        </div>
      </div>
    </section>`;

  for (const bar of container.querySelectorAll<HTMLElement>(".chart-bar[data-height]")) {
    bar.style.height = `${bar.getAttribute("data-height")}%`;
  }

  const aside = container.querySelector<HTMLElement>(".totals-sticky-col");
  function renderTotals(): void {
    if (!aside) return;
    const totals = recomputeHouseholdTotals({
      profile,
      hourlyForecast: hourly,
      currentPm25: airData.pm25,
      activeSwapIds,
    });
    aside.innerHTML = totalsHtml(totals, nameOf, expanded);
    aside.classList.toggle("is-expanded", expanded);
    aside.querySelector("#btn-toggle-totals-details")?.addEventListener("click", () => {
      expanded = !expanded;
      renderTotals();
      aside.querySelector<HTMLButtonElement>("#btn-toggle-totals-details")?.focus();
    });
  }
  renderTotals();

  for (const cb of container.querySelectorAll<HTMLInputElement>(".swap-toggle-cb")) {
    cb.addEventListener("change", () => {
      const id = cb.getAttribute("data-id");
      if (!id) return;
      if (cb.checked) activeSwapIds.add(id);
      else activeSwapIds.delete(id);
      saveToggledSwaps(Array.from(activeSwapIds));
      renderTotals();
    });
  }

  attachRefine(container, profile, () => renderTodayView(container));
}
