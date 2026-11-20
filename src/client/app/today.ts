// today.ts: Today view (DESIGN.md section 9)
// Air now, the hourly strip, swap rows with toggles, family totals in a polite live region, refine box.
// Every word comes from the i18n dictionaries; every number from src/shared.

import type { HealthRecommendations, NormalisedAirData } from "../../shared/air-types.js";
import { escapeHtml } from "../../shared/escape.js";
import { cleanestAndDirtiestWindows, minPurifierCadr } from "../../shared/impact.js";
import type { HouseholdProfile, MemberProfile } from "../../shared/schemas.js";
import { getLanguage, t } from "../home/i18n.js";
import {
  type PlanResponse,
  type PlanSwapItem,
  fetchAirData,
  fetchPlan,
  fetchRefine,
} from "./api.js";
import {
  bandClass,
  bandLabel,
  capturedLabel,
  formatIndianNumber,
  hourLabel,
  placeLabel,
  windowText,
} from "./format.js";
import { recomputeHouseholdTotals } from "./recompute.js";
import { router } from "./router.js";
import {
  type StoredLocation,
  loadHouseholdProfile,
  loadLocation,
  loadNicknames,
  loadToggledSwaps,
  saveHouseholdProfile,
  savePlan,
  saveToggledSwaps,
} from "./storage.js";

const KOLKATA_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const REFINE_MAX = 500;

function nicknameHtml(name: string): string {
  return `<span class="nickname">${escapeHtml(name)}</span>`;
}

function loadingHtml(): string {
  return `
    <section class="section">
      <div class="container">
        <div class="section-spacer-32">
          <div class="loading-placeholder-line loading-box-title"></div>
          <div class="loading-placeholder-line short"></div>
        </div>
        <div class="today-layout">
          <div class="main-col">
            <div class="loading-placeholder-line loading-box-140"></div>
            <div class="loading-placeholder-line loading-box-120"></div>
          </div>
          <div class="side-col"><div class="loading-placeholder-line loading-box-200"></div></div>
        </div>
      </div>
    </section>`;
}

function errorHtml(): string {
  return `
    <section class="section">
      <div class="container container-error">
        <h1 class="error-title">${t("today.loadErrorTitle")}</h1>
        <p class="error-desc">${t("today.loadErrorDesc")}</p>
        <a href="#/setup" class="btn btn-secondary">${t("today.reviewSetup")}</a>
      </div>
    </section>`;
}

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

/** Google's advice for the group this member belongs to. */
function googleAdviceFor(member: MemberProfile, recs: HealthRecommendations | undefined): string {
  const general = recs?.generalPopulation ?? "";
  if (member.sensitivity === "asthma_copd" && recs?.lungDiseasePopulation)
    return recs.lungDiseasePopulation;
  if (member.sensitivity === "heart_condition" && recs?.heartDiseasePopulation)
    return recs.heartDiseasePopulation;
  if (member.sensitivity === "pregnancy" && recs?.pregnantWomen) return recs.pregnantWomen;
  if (member.ageBand === "under-6" || member.ageBand === "6-10") return recs?.children || general;
  if (member.ageBand === "61-70" || member.ageBand === "71-plus") return recs?.elderly || general;
  return general;
}

function chartHtml(hourly: NormalisedAirData["hourlyForecast"]): string {
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

function swapMetricHtml(swap: PlanSwapItem): string {
  if (swap.savingRange) {
    return t("units.maskRange", {
      min: formatIndianNumber(swap.savingRange.min),
      max: formatIndianNumber(swap.savingRange.max),
    });
  }
  if (swap.kind === "sourcedFact" && swap.factText) return escapeHtml(swap.factText);
  if (swap.kind === "adviceOnly") return "";
  if (swap.savingNumber === undefined || Number.isNaN(swap.savingNumber)) return "";
  const isPercent = swap.lens === "protect";
  const value = formatIndianNumber(swap.savingNumber, isPercent ? 0 : 1);
  const estimate = swap.isEstimate
    ? ` <span class="swap-estimate-badge">(${t("today.estimate")})</span>`
    : "";
  return `${value}${isPercent ? "%" : ""} <span class="swap-unit-subtext">${t(`units.${swap.id}`)}</span>${estimate}`;
}

function swapRowHtml(swap: PlanSwapItem, checked: boolean, nameOf: (id: string) => string): string {
  const lang = getLanguage();
  const helps = (swap.appliesToMemberIds ?? []).map((id) => nicknameHtml(nameOf(id))).join(", ");
  const sources = (swap.factorSections ?? [])
    .map(
      (sec) =>
        `<a href="https://github.com/aravind-showcasemetech/saafsaans/blob/main/docs/FACTORS.md" target="_blank" rel="noopener">${t("today.factorLink", { section: escapeHtml(sec) })}</a>`,
    )
    .join(", ");
  const metric = swapMetricHtml(swap);
  // The plan is requested in the current language, so the reason (Gemini or template) is in it too.
  const reasonLang = swap.reasonLang || lang;
  return `
    <div class="swap-row" data-swap-id="${escapeHtml(swap.id)}">
      <div class="swap-row-header">
        <div class="flex-1">
          <h3 class="swap-title">${escapeHtml(t(`actions.${swap.id}`, { mask: "N95" }))}</h3>
          ${helps ? `<div class="swap-helps-who">${t("today.helps", { names: helps })}</div>` : ""}
        </div>
        <label class="checkbox-label-xs">
          <input type="checkbox" class="swap-toggle-cb" data-id="${escapeHtml(swap.id)}" ${checked ? "checked" : ""} />
          <span>${t("today.doThis")}</span>
        </label>
      </div>
      ${metric ? `<div class="swap-number-tabular">${metric}</div>` : ""}
      ${swap.kind === "adviceOnly" ? `<div class="swap-unit-subtext">${t("today.adviceOnly")}</div>` : ""}
      <p lang="${escapeHtml(reasonLang)}" class="swap-reason-text">${escapeHtml(swap.reason || "")}</p>
      <details class="swap-details">
        <summary>${t("today.howWorked")}</summary>
        <div class="swap-details-content">
          <div>${escapeHtml(swap.formula || t("today.formulaDefault"))}</div>
          ${sources ? `<div class="swap-details-sources">${t("today.sourcesLabel")}: ${sources}</div>` : ""}
        </div>
      </details>
    </div>`;
}

function airNowHtml(
  profile: HouseholdProfile,
  airData: NormalisedAirData,
  planData: PlanResponse,
  nameOf: (id: string) => string,
): string {
  const lang = getLanguage();
  const sample = planData.isDemo || airData.isDemo ? capturedLabel(airData.capturedAt) : null;
  const pollutant =
    (airData.dominantPollutant || "pm25").toLowerCase() === "pm25"
      ? "PM2.5"
      : escapeHtml(airData.dominantPollutant.toUpperCase());
  const note =
    lang === "en" ? "" : ` <span class="swap-unit-subtext">(${t("cpcb.translatedNote")})</span>`;
  const items = profile.members
    .map((m) => {
      const advice = googleAdviceFor(m, airData.healthRecommendations);
      return `<li class="air-card-google-item"><strong>${nicknameHtml(nameOf(m.id))}:</strong> ${escapeHtml(advice)}</li>`;
    })
    .join("");
  // In demo data Google's advice is in English; in hi and te it sits in a closed disclosure marked lang="en".
  const adviceIsEnglish = /^[\x20-\x7E’]*$/.test(
    airData.healthRecommendations?.generalPopulation ?? "",
  );
  const googleBlock =
    lang !== "en" && adviceIsEnglish
      ? `<details class="air-card-google-section"><summary class="air-card-google-heading">${t("today.googleEnglishSummary")}</summary><ul class="air-card-google-list" lang="en">${items}</ul></details>`
      : `<div class="air-card-google-section"><div class="air-card-google-heading">${t("today.googleHeading")}</div><ul class="air-card-google-list">${items}</ul></div>`;
  return `
    <div class="air-card section-spacer-24">
      <h2 class="section-label">${t("today.airNow")}${sample ? ` <span class="demo-badge-wrap">${escapeHtml(sample)}</span>` : ""}</h2>
      <div class="air-card-top">
        <span class="air-aqi-number tabular-nums">${formatIndianNumber(airData.currentAqi)}</span>
        <span class="air-band-tag">
          <span class="band-indicator-bar ${bandClass(airData.aqiBand)}"></span>
          ${escapeHtml(bandLabel(airData.aqiBand))}
        </span>
      </div>
      <div class="air-card-main-pollutant">${t("today.mainPollutant")}: <strong>${pollutant}</strong> (${formatIndianNumber(airData.pm25, 1)} µg/m³)</div>
      <div class="air-card-cpcb-stmt"><strong>${t("cpcb.label")}:</strong> "${escapeHtml(t(`cpcb.${airData.aqiBand}`))}"${note}</div>
      ${googleBlock}
      <div class="air-card-disclaimer">${t("today.googleDisclaimer")}</div>
    </div>`;
}

function totalsHtml(
  totals: ReturnType<typeof recomputeHouseholdTotals>,
  nameOf: (id: string) => string,
  expanded: boolean,
): string {
  const maxDoseCut = totals.memberDoses.length
    ? Math.max(...totals.memberDoses.map((m) => Math.round(m.doseCutPercentage)))
    : 0;
  const weeklyCo2 = formatIndianNumber(totals.householdCo2WeeklyKg, 1);
  const members = totals.memberDoses
    .map(
      (m) => `
      <div class="side-col-member-row">
        <div class="side-col-member-name">${nicknameHtml(nameOf(m.memberId))}</div>
        <div class="side-col-metric-row"><span class="text-ink-2">${t("totals.doseCut")}:</span> <strong class="tabular-nums">${Math.round(m.doseCutPercentage)}%</strong></div>
        <div class="side-col-metric-row-sm"><span class="text-ink-2">${t("totals.cigarettes")}:</span> <strong class="tabular-nums">${formatIndianNumber(m.cigarettesAvoided, 1)}</strong></div>
      </div>`,
    )
    .join("");
  return `
    <h2 class="section-label desktop-only-totals-header">${t("totals.label")}</h2>
    <div class="mobile-only-totals-bar">
      <div class="totals-mobile-bar">
        <div class="totals-mobile-headline">
          <span>${t("totals.doseCut")}: <strong class="tabular-nums">${maxDoseCut}%</strong></span>
          <span>${t("totals.co2Short")}: <strong class="tabular-nums">${weeklyCo2} ${t("totals.perWeek")}</strong></span>
        </div>
        <button type="button" id="btn-toggle-totals-details" class="btn btn-secondary btn-sm" aria-expanded="${expanded}" aria-controls="totals-list">
          ${expanded ? t("totals.hideDetails") : t("totals.details")}
        </button>
      </div>
    </div>
    <div class="side-col-list" id="totals-list">
      ${members}
      <div class="side-col-co2-wrap">
        <div class="side-col-co2-label">${t("totals.co2")}</div>
        <div class="side-col-co2-val tabular-nums">${weeklyCo2} <span class="swap-unit-subtext">${t("totals.perWeek")}</span></div>
      </div>
    </div>`;
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

  attachRefine(container, profile);
}

function attachRefine(container: HTMLElement, profile: HouseholdProfile): void {
  const input = container.querySelector<HTMLTextAreaElement>("#refine-input");
  const count = container.querySelector<HTMLElement>("#refine-char-count");
  const button = container.querySelector<HTMLButtonElement>("#btn-submit-refine");
  const status = container.querySelector<HTMLElement>("#refine-status");
  if (!input || !count || !button || !status) return;

  input.addEventListener("input", () => {
    count.textContent = t("today.charsLeft", { count: REFINE_MAX - input.value.length });
  });

  button.addEventListener("click", async () => {
    const text = input.value.trim();
    if (!text) return;
    button.disabled = true;
    button.textContent = t("today.updating");
    status.textContent = "";
    try {
      const res = await fetchRefine({ profile, text, lang: getLanguage() });
      if (res?.profile) {
        saveHouseholdProfile(res.profile);
        await renderTodayView(container);
        return;
      }
      status.textContent = t("today.refineError");
    } catch {
      status.textContent = t("today.refineError");
    }
    button.disabled = false;
    button.textContent = t("today.updatePlan");
  });
}
