// today.ts: Today view (DESIGN.md section 9)
// Air now, 48-hour strip, swap rows with toggles, sticky side column with polite live-region recomputes.
// Refine box (500 chars).

import type { NormalisedAirData } from "../../shared/air-types.js";
import { escapeHtml } from "../../shared/escape.js";
import { CPCB_AQI_BANDS } from "../../shared/factors.js";
import { cleanestAndDirtiestWindows } from "../../shared/impact.js";
import type { HouseholdProfile } from "../../shared/schemas.js";
import { getLanguage, t } from "../home/i18n.js";
import {
  type PlanResponse,
  type PlanSwapItem,
  fetchAirData,
  fetchPlan,
  fetchRefine,
} from "./api.js";
import { recomputeHouseholdTotals } from "./recompute.js";
import { router } from "./router.js";
import {
  type StoredLocation,
  loadHouseholdProfile,
  loadLocation,
  loadNicknames,
  loadPlan,
  loadToggledSwaps,
  saveHouseholdProfile,
  saveLocation,
  saveNicknames,
  savePlan,
  saveToggledSwaps,
} from "./storage.js";

function getBandClass(band: string): string {
  switch (band.toLowerCase()) {
    case "good":
      return "band-good";
    case "satisfactory":
      return "band-satisfactory";
    case "moderately polluted":
      return "band-moderate";
    case "poor":
      return "band-poor";
    case "very poor":
      return "band-very-poor";
    case "severe":
      return "band-severe";
    default:
      return "band-moderate";
  }
}

export async function renderTodayView(container: HTMLElement): Promise<void> {
  let profile = loadHouseholdProfile();
  let location: StoredLocation = loadLocation() || {
    name: "Kukatpally, Hyderabad",
    lat: 17.48,
    lng: 78.41,
  };
  let nicknames = loadNicknames();

  if (!profile || profile.members.length === 0) {
    // Default to the Reddys demo family if visiting directly
    location = { name: "Kukatpally, Hyderabad", lat: 17.48, lng: 78.41 };
    profile = {
      members: [
        {
          id: "m1",
          ageBand: "31-40",
          sensitivity: "none",
          routinePreset: "office_worker",
          outdoorExerciseMinutes: 0,
        },
        {
          id: "m2",
          ageBand: "31-40",
          sensitivity: "none",
          routinePreset: "work_from_home",
          outdoorExerciseMinutes: 0,
        },
        {
          id: "m3",
          ageBand: "6-10",
          sensitivity: "asthma_copd",
          routinePreset: "school_child",
          outdoorExerciseMinutes: 30,
          outdoorExerciseTime: "17:00",
        },
        {
          id: "m4",
          ageBand: "61-70",
          sensitivity: "none",
          routinePreset: "retired",
          outdoorExerciseMinutes: 60,
          outdoorExerciseTime: "06:00",
        },
      ],
      commute: {
        mode: "petrol_car",
        distanceKm: 12,
        tripsPerDay: 2,
        peopleSharing: 1,
        workingDaysPerWeek: 5,
      },
      home: {
        bedroomAreaSqFt: 144,
        ceilingHeightFt: 10,
        windowHabit: "mostly_shut",
        hasPurifier: false,
        purifierCadrCfm: 120,
        cookingMethod: "gas",
        usesIncense: true,
        usesMosquitoCoils: true,
        smokerInHouse: false,
      },
    };
    nicknames = { m1: "Father", m2: "Mother", m3: "Son (9)", m4: "Grandmother (68)" };
    saveHouseholdProfile(profile);
    saveLocation(location);
    saveNicknames(nicknames);
  }

  // Placeholder lines loading state
  container.innerHTML = `
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
            <div class="loading-placeholder-line loading-box-80"></div>
          </div>
          <div class="side-col">
            <div class="loading-placeholder-line loading-box-200"></div>
          </div>
        </div>
      </div>
    </section>
  `;

  try {
    const lang = getLanguage();
    // Ensure coordinates are sent rounded to 2 decimal places
    const lat = Math.round(location.lat * 100) / 100;
    const lng = Math.round(location.lng * 100) / 100;

    const [airData, planData] = await Promise.all([
      fetchAirData(lat, lng, lang),
      fetchPlan({ profile, lat, lng, lang }),
    ]);

    savePlan(planData);
    renderContent(container, profile, location, nicknames, airData, planData);
  } catch (err: unknown) {
    const errorObj = err as Error;
    console.error("Failed to load Today view:", errorObj);
    container.innerHTML = `
      <section class="section">
        <div class="container container-error">
          <h1 class="error-title">Could not load plan</h1>
          <p class="error-desc">
            ${escapeHtml(errorObj.message || "An error occurred while fetching air data.")}
          </p>
          <a href="#/setup" class="btn btn-secondary">Review setup</a>
        </div>
      </section>
    `;
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
  const currentLang = getLanguage();
  const cpcbBand = CPCB_AQI_BANDS.find(
    (b) => b.band.toLowerCase() === airData.aqiBand.toLowerCase(),
  );
  let cpcbStatement = cpcbBand?.healthStatement || "";
  if (currentLang === "hi") {
    switch (cpcbBand?.band) {
      case "Good":
        cpcbStatement = "न्यूनतम प्रभाव (translated from CPCB)";
        break;
      case "Satisfactory":
        cpcbStatement = "संवेदनशील लोगों को सांस लेने में हल्की परेशानी हो सकती है। (translated from CPCB)";
        break;
      case "Moderately polluted":
        cpcbStatement =
          "फेफड़ों की बीमारी (जैसे अस्थमा) वाले लोगों को सांस लेने में परेशानी, और दिल की बीमारी वाले लोगों, बच्चों और बुजुर्गों को परेशानी हो सकती है। (translated from CPCB)";
        break;
      case "Poor":
        cpcbStatement =
          "लंबे समय तक रहने पर लोगों को सांस लेने में परेशानी, और दिल की बीमारी वाले लोगों को परेशानी हो सकती है। (translated from CPCB)";
        break;
      case "Very Poor":
        cpcbStatement =
          "लंबे समय तक रहने पर लोगों को सांस की बीमारी हो सकती है। फेफड़ों और दिल की बीमारी वाले लोगों में असर अधिक स्पष्ट हो सकता है। (translated from CPCB)";
        break;
      case "Severe":
        cpcbStatement =
          "स्वस्थ लोगों पर भी श्वसन संबंधी प्रभाव पड़ सकते हैं और फेफड़ों/दिल की बीमारी वाले लोगों पर गंभीर स्वास्थ्य प्रभाव पड़ सकते हैं। हल्की शारीरिक गतिविधि के दौरान भी स्वास्थ्य प्रभाव महसूस हो सकते हैं। (translated from CPCB)";
        break;
      default:
        cpcbStatement = `${cpcbStatement} (translated from CPCB)`;
    }
  } else if (currentLang === "te") {
    switch (cpcbBand?.band) {
      case "Good":
        cpcbStatement = "కనిష్ట ప్రభావం (translated from CPCB)";
        break;
      case "Satisfactory":
        cpcbStatement = "సున్నితమైన వ్యక్తులకు శ్వాస తీసుకోవడంలో స్వల్ప అసౌకర్యం కలగవచ్చు. (translated from CPCB)";
        break;
      case "Moderately polluted":
        cpcbStatement =
          "ఆస్తమా వంటి ఊపిరితిత్తుల వ్యాధి ఉన్నవారికి శ్వాస తీసుకోవడంలో అసౌకర్యం, మరియు గుండె జబ్బులు ఉన్నవారికి, పిల్లలకు మరియు వృద్ధులకు అసౌకర్యం కలగవచ్చు. (translated from CPCB)";
        break;
      case "Poor":
        cpcbStatement =
          "ఎక్కువసేపు బహిర్గతమైతే శ్వాస తీసుకోవడంలో అసౌకర్యం, మరియు గుండె జబ్బులు ఉన్నవారికి అసౌకర్యం కలగవచ్చు. (translated from CPCB)";
        break;
      case "Very Poor":
        cpcbStatement =
          "ఎక్కువసేపు బహిర్గతమైతే శ్వాసకోశ వ్యాధి రావచ్చు. ఊపిరితిత్తులు మరియు గుండె జబ్బులు ఉన్నవారిలో ప్రభావం ఎక్కువగా ఉండవచ్చు. (translated from CPCB)";
        break;
      case "Severe":
        cpcbStatement =
          "ఆరోగ్యవంతమైన వ్యక్తులపై కూడా శ్వాసకోశ ప్రభావాలు మరియు ఊపిరితిత్తులు/గుండె జబ్బులు ఉన్నవారిపై తీవ్రమైన ఆరోగ్య ప్రభావాలు కలగవచ్చు. తేలికపాటి శారీరక శ్రమ సమయంలో కూడా ఆరోగ్య ప్రభావాలు అనుభవించవచ్చు. (translated from CPCB)";
        break;
      default:
        cpcbStatement = `${cpcbStatement} (translated from CPCB)`;
    }
  }

  // 48-Hour Strip
  const hourly = airData.hourlyForecast || [];
  const windows = cleanestAndDirtiestWindows(hourly);
  const cleanestText = windows.cleanest
    ? `${String(windows.cleanest.startHour).padStart(2, "0")}:00 to ${String(windows.cleanest.endHour).padStart(2, "0")}:00`
    : "14:00 to 17:00";
  const dirtiestText = windows.dirtiest
    ? `${String(windows.dirtiest.startHour).padStart(2, "0")}:00 to ${String(windows.dirtiest.endHour).padStart(2, "0")}:00`
    : "07:00 to 10:00";

  // Swaps list
  const initialSwaps = planData.swaps || [];
  const storedToggles = loadToggledSwaps();
  const activeSwapIds = new Set<string>(storedToggles || initialSwaps.map((s) => s.id));

  function getMemberName(idOrRef: string): string {
    return nicknames[idOrRef] || idOrRef;
  }

  const isDemo = Boolean(planData.isDemo || airData.isDemo);
  const capturedDate = planData.capturedDate || airData.capturedDate || "2026-11-19";

  function renderView(): void {
    // Recompute live totals
    const totals = recomputeHouseholdTotals({
      profile,
      hourlyForecast: hourly,
      currentPm25: airData.pm25,
      activeSwapIds,
    });

    // 48-hour bar chart
    const maxPm25 = Math.max(...hourly.map((h) => h.pm25 || 0), 100);
    const barsHtml = hourly
      .slice(0, 24)
      .map((h, i: number) => {
        const heightPct = Math.min(100, Math.round(((h.pm25 || 0) / maxPm25) * 100));
        const colorClass = getBandClass(
          h.aqi
            ? h.aqi > 200
              ? "Poor"
              : h.aqi > 100
                ? "Moderately polluted"
                : "Satisfactory"
            : "Satisfactory",
        );
        const hourLabel = i % 4 === 0 ? `${i}:00` : "";
        return `
          <div class="chart-bar-col">
            <div class="chart-bar ${colorClass}" data-height="${heightPct}" title="${escapeHtml(h.time)}: ${h.pm25} µg/m³"></div>
            <span class="chart-bar-hour">${hourLabel}</span>
          </div>
        `;
      })
      .join("");

    const maxDoseCut = totals.memberDoses.length
      ? Math.max(...totals.memberDoses.map((m) => Math.round(m.doseCutPercentage)))
      : 0;
    const weeklyCo2 = Math.round(totals.householdCo2WeeklyKg * 10) / 10;

    container.innerHTML = `
      <section class="section today-section">
        <div class="container">
          <!-- Top area header -->
          <div class="header-actions-wrap">
            <div>
              <div class="section-label">${escapeHtml(location.name)}</div>
              <h1 class="today-page-title">Today's air plan</h1>
            </div>
            <div>
              <a href="#/share" class="btn btn-secondary">Share plan</a>
            </div>
          </div>

          <div class="today-layout">
            <!-- Main column -->
            <div class="main-col">
              <!-- Air now card -->
              <div class="air-card section-spacer-24">
                <div class="section-label">
                  Air now${isDemo ? ` <span class="demo-badge-wrap">Sample data captured on ${escapeHtml(capturedDate)}</span>` : ""}
                </div>
                <div class="air-card-top">
                  <span class="air-aqi-number tabular-nums">${airData.currentAqi}</span>
                  <span class="air-band-tag">
                    <span class="band-indicator-bar ${getBandClass(airData.aqiBand)}"></span>
                    ${escapeHtml(airData.aqiBand)}
                  </span>
                </div>
                <div class="air-card-main-pollutant">
                  Main pollutant: <strong>${(airData.dominantPollutant || "pm2.5").toLowerCase() === "pm25" ? "PM2.5" : escapeHtml(airData.dominantPollutant.toUpperCase())}</strong> (${airData.pm25} µg/m³)
                </div>
                <div class="air-card-cpcb-stmt">
                  <strong>CPCB health statement:</strong> "${escapeHtml(cpcbStatement)}"
                </div>

                <!-- Google advice per member group -->
                <div class="air-card-google-section">
                  <div class="air-card-google-heading">
                    ${
                      currentLang !== "en" &&
                      (
                        !airData.healthRecommendations?.generalPopulation ||
                          /^[A-Za-z0-9\s.,'’"()-]+$/.test(
                            airData.healthRecommendations.generalPopulation,
                          )
                      )
                        ? "Google's advice (in English)"
                        : "Google health advice for your household members"
                    }
                  </div>
                  <ul class="air-card-google-list">
                    ${profile.members
                      .map((m) => {
                        const name = getMemberName(m.id);
                        let advice = airData.healthRecommendations?.generalPopulation || "";
                        if (
                          m.sensitivity === "asthma_copd" &&
                          airData.healthRecommendations?.lungDiseasePopulation
                        ) {
                          advice = airData.healthRecommendations.lungDiseasePopulation;
                        } else if (
                          m.sensitivity === "heart_condition" &&
                          airData.healthRecommendations?.heartDiseasePopulation
                        ) {
                          advice = airData.healthRecommendations.heartDiseasePopulation;
                        } else if (
                          m.sensitivity === "pregnancy" &&
                          airData.healthRecommendations?.pregnantWomen
                        ) {
                          advice = airData.healthRecommendations.pregnantWomen;
                        } else if (m.ageBand === "under-6" || m.ageBand === "6-10") {
                          advice = airData.healthRecommendations?.children || advice;
                        } else if (m.ageBand === "61-70" || m.ageBand === "71-plus") {
                          advice = airData.healthRecommendations?.elderly || advice;
                        }

                        return `
                          <li class="air-card-google-item">
                            <strong>${escapeHtml(name)}:</strong> ${escapeHtml(advice)}
                          </li>
                        `;
                      })
                      .join("")}
                  </ul>
                  <div class="air-card-disclaimer">
                    Health advice labelled from Google Air Quality API. Not medical advice.
                  </div>
                </div>
              </div>

              <!-- 48-Hour Strip -->
              <div class="section-spacer-32">
                <div class="section-label">Hourly forecast (next 24 to 48 hours)</div>
                <div class="chart-strip-wrapper">
                  <div class="chart-strip-track">
                    ${barsHtml}
                  </div>
                </div>
                <div class="chart-bar-clean-dirt-wrap">
                  <div>Cleanest window: <strong class="tabular-nums text-ink">${escapeHtml(cleanestText)}</strong></div>
                  <div>Dirtiest window: <strong class="tabular-nums text-ink">${escapeHtml(dirtiestText)}</strong></div>
                </div>
              </div>

              <!-- Swaps Section -->
              <div class="section-spacer-32">
                <h2 class="section-heading">Recommended swaps</h2>
                <div id="swaps-list">
                  ${initialSwaps
                    .map((swap) => {
                      const isChecked = activeSwapIds.has(swap.id);
                      const helpsWho = (swap.appliesToMemberIds || [])
                        .map((id: string) => getMemberName(id))
                        .join(", ");

                      const factorLinks = (swap.factorSections || [])
                        .map(
                          (sec: string) =>
                            `<a href="https://github.com/aravind-showcasemetech/saafsaans/blob/main/docs/FACTORS.md#section-${sec}" target="_blank" rel="noopener">FACTORS.md §${sec}</a>`,
                        )
                        .join(", ");

                      let renderMetric = "";
                      if (swap.id === "mask-outdoors" || swap.savingRange) {
                        const minVal = swap.savingRange?.min ?? 34;
                        const maxVal = swap.savingRange?.max ?? 93;
                        const unitVal = swap.savingRange?.unit ?? "%";
                        renderMetric = `${minVal}% to ${maxVal}${unitVal}`;
                      } else if (swap.kind === "sourcedFact" && swap.factText) {
                        renderMetric = escapeHtml(swap.factText);
                      } else if (swap.kind === "adviceOnly") {
                        renderMetric = "";
                      } else if (
                        swap.savingNumber !== undefined &&
                        !Number.isNaN(swap.savingNumber)
                      ) {
                        const numVal = Math.round(swap.savingNumber * 10) / 10;
                        const estText = swap.isEstimate
                          ? ` <span class="swap-estimate-badge">(Estimate)</span>`
                          : "";
                        renderMetric = `${numVal} <span class="swap-unit-subtext">${escapeHtml(swap.savingUnit || "")}</span>${estText}`;
                      }

                      return `
                        <div class="swap-row" data-swap-id="${escapeHtml(swap.id)}">
                          <div class="swap-row-header">
                            <div class="flex-1">
                              <h3 class="swap-title">${escapeHtml(swap.title)}</h3>
                              ${
                                helpsWho
                                  ? `<div class="swap-helps-who">Helps: ${escapeHtml(helpsWho)}</div>`
                                  : ""
                              }
                            </div>
                            <label class="checkbox-label-xs">
                              <input type="checkbox" class="swap-toggle-cb" data-id="${escapeHtml(swap.id)}" ${isChecked ? "checked" : ""} />
                              <span>I'll do this</span>
                            </label>
                          </div>

                          ${
                            renderMetric
                              ? `<div class="swap-number-tabular">${renderMetric}</div>`
                              : ""
                          }

                          <p lang="${escapeHtml(swap.reasonLang || currentLang)}" class="swap-reason-text">
                            ${escapeHtml(swap.reason || "")}
                          </p>

                          <details class="swap-details">
                            <summary>How we worked this out</summary>
                            <div class="swap-details-content">
                              <div>Formula: ${escapeHtml(swap.formula || "Calculated with pure day-model functions from tested factors.")}</div>
                              ${factorLinks ? `<div class="swap-details-sources">Sources: ${factorLinks}</div>` : ""}
                            </div>
                          </details>
                        </div>
                      `;
                    })
                    .join("")}
                </div>
              </div>

              <!-- Indoor Kit -->
              <div class="air-card section-spacer-32">
                <div class="section-label">Indoor kit</div>
                <h3 class="card-heading">Indoor air quality hacks</h3>
                <ul class="indoor-hacks-list">
                  <li>Bedroom purifier: AHAM rule requires minimum CADR <strong>${Math.round(((profile.home.bedroomAreaSqFt * 2) / 3) * (profile.home.ceilingHeightFt / 8))} CFM</strong> for your bedroom volume.</li>
                  <li>Airing your home: Best time to open windows is during the afternoon clean air window (<strong>${escapeHtml(cleanestText)}</strong>).</li>
                  <li>Keep windows tightly shut during morning inversion hours (<strong>${escapeHtml(dirtiestText)}</strong>).</li>
                  <li>Wet-mop floors instead of dry sweeping to remove dust without stirring up fine particles.</li>
                </ul>
              </div>

              <!-- Fixed Health Warning & Advice -->
              <div class="health-warning-box">
                <p class="health-warning-p1">
                  <strong>Not medical advice.</strong> SaafSaans is an urban environmental planning assistant.
                </p>
                <p>
                  See a doctor if you experience breathlessness, chest pain, or wheezing that does not settle.
                </p>
              </div>

              <!-- Refine Box (500 chars) -->
              <div class="refine-container">
                <h3 class="refine-heading">Refine your routine</h3>
                <p class="refine-subtext">
                  Tell Gemini about any schedule change (e.g. "my son has football at 7 am on Saturdays").
                </p>
                <textarea
                  id="refine-input"
                  class="form-textarea"
                  rows="3"
                  maxlength="500"
                  placeholder="Describe your routine change..."
                ></textarea>
                <div class="refine-footer">
                  <span id="refine-char-count" class="char-count-text">500 characters remaining</span>
                  <button id="btn-submit-refine" class="btn btn-secondary" type="button">Update plan</button>
                </div>
              </div>
            </div>

            <!-- Sticky Side Column: Family Totals -->
            <div class="side-col">
              <aside class="totals-sticky-col" aria-label="Family Totals" aria-live="polite">
                <div class="section-label desktop-only-totals-header">Family totals today</div>

                <!-- Slim mobile totals bar (DESIGN.md section 9) -->
                <div class="mobile-only-totals-bar">
                  <div class="totals-mobile-bar">
                    <div class="totals-mobile-headline">
                      <span>Dose cut: <strong class="tabular-nums">${maxDoseCut}%</strong></span>
                      <span>CO2: <strong class="tabular-nums">${weeklyCo2} kg/wk</strong></span>
                    </div>
                    <button type="button" id="btn-toggle-totals-details" class="btn btn-secondary btn-sm" aria-expanded="false">
                      Details
                    </button>
                  </div>
                </div>

                <div class="side-col-list">
                  ${totals.memberDoses
                    .map((m) => {
                      const name = getMemberName(m.memberId);
                      return `
                        <div class="side-col-member-row">
                          <div class="side-col-member-name">${escapeHtml(name)}</div>
                          <div class="side-col-metric-row">
                            <span class="text-ink-2">Dose cut:</span>
                            <strong class="tabular-nums">${Math.round(m.doseCutPercentage)}%</strong>
                          </div>
                          <div class="side-col-metric-row-sm">
                            <span class="text-ink-2">Cigarettes avoided:</span>
                            <strong class="tabular-nums">${Math.round(m.cigarettesAvoided * 10) / 10}</strong>
                          </div>
                        </div>
                      `;
                    })
                    .join("")}

                  <div class="side-col-co2-wrap">
                    <div class="side-col-co2-label">Household CO2 avoided</div>
                    <div class="side-col-co2-val tabular-nums">
                      ${Math.round(totals.householdCo2WeeklyKg * 10) / 10} <span class="swap-unit-subtext">kg / week</span>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>
    `;

    attachEvents();
  }

  function attachEvents(): void {
    // Apply chart bar heights programmatically to keep CSS CSP compliant with zero inline style attributes
    for (const bar of container.querySelectorAll<HTMLElement>(".chart-bar[data-height]")) {
      const h = bar.getAttribute("data-height");
      if (h) {
        bar.style.height = `${h}%`;
      }
    }

    // Checkbox toggles
    for (const cb of container.querySelectorAll<HTMLInputElement>(".swap-toggle-cb")) {
      cb.addEventListener("change", () => {
        const id = cb.getAttribute("data-id");
        if (id) {
          if (cb.checked) {
            activeSwapIds.add(id);
          } else {
            activeSwapIds.delete(id);
          }
          saveToggledSwaps(Array.from(activeSwapIds));
          renderView();
        }
      });
    }

    // Mobile totals details toggle
    const toggleDetailsBtn = container.querySelector<HTMLButtonElement>(
      "#btn-toggle-totals-details",
    );
    const totalsStickyCol = container.querySelector<HTMLElement>(".totals-sticky-col");
    if (toggleDetailsBtn && totalsStickyCol) {
      toggleDetailsBtn.addEventListener("click", () => {
        const isExpanded = totalsStickyCol.classList.toggle("is-expanded");
        toggleDetailsBtn.setAttribute("aria-expanded", isExpanded ? "true" : "false");
        toggleDetailsBtn.textContent = isExpanded ? "Hide details" : "Details";
      });
    }

    // Refine box
    const refineInput = container.querySelector<HTMLTextAreaElement>("#refine-input");
    const charCount = container.querySelector<HTMLElement>("#refine-char-count");
    const btnRefine = container.querySelector<HTMLButtonElement>("#btn-submit-refine");

    if (refineInput && charCount) {
      refineInput.addEventListener("input", () => {
        const remaining = 500 - refineInput.value.length;
        charCount.textContent = `${remaining} characters remaining`;
      });
    }

    if (btnRefine && refineInput) {
      btnRefine.addEventListener("click", async () => {
        const text = refineInput.value.trim();
        if (!text) return;

        btnRefine.disabled = true;
        btnRefine.textContent = "Updating...";

        try {
          const refineRes = await fetchRefine({
            profile,
            text,
            lang: getLanguage(),
          });

          if (refineRes?.profile) {
            saveHouseholdProfile(refineRes.profile);
            renderTodayView(container);
          }
        } catch (err: unknown) {
          const errorObj = err as Error;
          alert(`Refine error: ${errorObj.message || "Could not update plan"}`);
          btnRefine.disabled = false;
          btnRefine.textContent = "Update plan";
        }
      });
    }
  }

  renderView();
}
