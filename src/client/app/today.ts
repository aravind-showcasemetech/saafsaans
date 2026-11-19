// today.ts: Today view (DESIGN.md section 9)
// Air now, 48-hour strip, swap rows with toggles, sticky side column with polite live-region recomputes.
// Refine box (500 chars).

import type { NormalisedAirData } from "../../shared/air-types.js";
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

function getBandColor(band: string): string {
  switch (band.toLowerCase()) {
    case "good":
      return "var(--band-good)";
    case "satisfactory":
      return "var(--band-satisfactory)";
    case "moderately polluted":
      return "var(--band-moderate)";
    case "poor":
      return "var(--band-poor)";
    case "very poor":
      return "var(--band-very-poor)";
    case "severe":
      return "var(--band-severe)";
    default:
      return "var(--band-moderate)";
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
        <div style="margin-bottom: var(--space-32);">
          <div class="loading-placeholder-line" style="width: 240px; height: 28px;"></div>
          <div class="loading-placeholder-line short"></div>
        </div>
        <div class="today-layout">
          <div class="main-col">
            <div class="loading-placeholder-line" style="height: 140px; width: 100%;"></div>
            <div class="loading-placeholder-line" style="height: 120px; width: 100%; margin-top: 16px;"></div>
            <div class="loading-placeholder-line" style="height: 80px; width: 100%; margin-top: 16px;"></div>
          </div>
          <div class="side-col">
            <div class="loading-placeholder-line" style="height: 200px; width: 100%;"></div>
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
      fetchAirData(lat, lng),
      fetchPlan({ profile, lat, lng, lang }),
    ]);

    savePlan(planData);
    renderContent(container, profile, location, nicknames, airData, planData);
  } catch (err: unknown) {
    const errorObj = err as Error;
    console.error("Failed to load Today view:", errorObj);
    container.innerHTML = `
      <section class="section">
        <div class="container" style="max-width: 600px;">
          <h1 style="font-size: var(--text-lg); margin-bottom: var(--space-8);">Could not load plan</h1>
          <p style="color: var(--ink-2); margin-bottom: var(--space-16);">
            ${errorObj.message || "An error occurred while fetching air data."}
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
  const cpcbStatement = cpcbBand?.healthStatement || "";

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
        const color = getBandColor(
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
            <div class="chart-bar" style="height: ${heightPct}%; background-color: ${color};" title="${h.time}: ${h.pm25} µg/m³"></div>
            <span class="chart-bar-hour">${hourLabel}</span>
          </div>
        `;
      })
      .join("");

    container.innerHTML = `
      <section class="section" style="padding-top: var(--space-48);">
        <div class="container">
          <!-- Top area header -->
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: var(--space-24); flex-wrap: wrap; gap: var(--space-8);">
            <div>
              <div class="section-label">${location.name}</div>
              <h1 style="font-size: var(--text-2xl); font-weight: 600;">Today's Air Plan</h1>
            </div>
            <div>
              <a href="#/share" class="btn btn-secondary">Share plan</a>
            </div>
          </div>

          <div class="today-layout">
            <!-- Main column -->
            <div class="main-col">
              <!-- Air now card -->
              <div class="air-card" style="margin-bottom: var(--space-24);">
                <div class="section-label">Air now</div>
                <div class="air-card-top">
                  <span class="air-aqi-number tabular-nums">${airData.currentAqi}</span>
                  <span class="air-band-tag">
                    <span class="band-indicator-bar" style="background-color: ${getBandColor(airData.aqiBand)};"></span>
                    ${airData.aqiBand}
                  </span>
                </div>
                <div style="font-size: var(--text-sm); margin-top: var(--space-8); color: var(--ink);">
                  Main pollutant: <strong>${(airData.dominantPollutant || "PM2.5").toUpperCase()}</strong> (${airData.pm25} µg/m³)
                </div>
                <div style="margin-top: var(--space-12); font-size: var(--text-sm); color: var(--ink-2); line-height: 1.4;">
                  <strong>CPCB health statement:</strong> "${cpcbStatement}"
                </div>

                <!-- Google advice per member group -->
                <div style="margin-top: var(--space-16); padding-top: var(--space-12); border-top: 1px solid var(--rule);">
                  <div style="font-size: 11px; text-transform: uppercase; color: var(--ink-2); letter-spacing: 0.05em; margin-bottom: var(--space-8);">
                    Google health advice for your household members
                  </div>
                  <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: var(--space-8);">
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
                          <li style="font-size: var(--text-xs); color: var(--ink);">
                            <strong>${name}:</strong> ${advice}
                          </li>
                        `;
                      })
                      .join("")}
                  </ul>
                  <div style="font-size: 10px; color: var(--ink-2); margin-top: var(--space-8);">
                    Health advice labelled from Google Air Quality API. Not medical advice.
                  </div>
                </div>
              </div>

              <!-- 48-Hour Strip -->
              <div style="margin-bottom: var(--space-32);">
                <div class="section-label">Hourly forecast (next 24 to 48 hours)</div>
                <div class="chart-strip-wrapper">
                  <div class="chart-strip-track">
                    ${barsHtml}
                  </div>
                </div>
                <div style="display: flex; gap: var(--space-24); font-size: var(--text-xs); color: var(--ink-2);">
                  <div>Cleanest window: <strong class="tabular-nums" style="color: var(--ink);">${cleanestText}</strong></div>
                  <div>Dirtiest window: <strong class="tabular-nums" style="color: var(--ink);">${dirtiestText}</strong></div>
                </div>
              </div>

              <!-- Swaps Section -->
              <div style="margin-bottom: var(--space-32);">
                <h2 style="font-size: var(--text-lg); margin-bottom: var(--space-16);">Recommended Swaps</h2>
                <div id="swaps-list">
                  ${initialSwaps
                    .map((swap) => {
                      const isChecked = activeSwapIds.has(swap.id);
                      const helpsWho = (swap.affectedMembers || [])
                        .map((id: string) => getMemberName(id))
                        .join(", ");

                      const factorLinks = swap.factorsSection
                        ? `<a href="https://github.com/google/saafsaans/blob/main/docs/FACTORS.md#section-${swap.factorsSection}" target="_blank" rel="noopener">FACTORS.md §${swap.factorsSection}</a>`
                        : "";

                      return `
                        <div class="swap-row" data-swap-id="${swap.id}">
                          <div class="swap-row-header">
                            <div style="flex: 1;">
                              <h3 style="font-size: var(--text-md); margin-top: 2px;">${swap.title}</h3>
                              ${
                                helpsWho
                                  ? `<div style="font-size: var(--text-xs); color: var(--accent); margin-top: 2px;">Helps: ${helpsWho}</div>`
                                  : ""
                              }
                            </div>
                            <label style="display: flex; align-items: center; gap: var(--space-8); font-size: var(--text-xs); cursor: pointer; white-space: nowrap;">
                              <input type="checkbox" class="swap-toggle-cb" data-id="${swap.id}" ${isChecked ? "checked" : ""} />
                              <span>I'll do this</span>
                            </label>
                          </div>

                          <div class="swap-number-tabular">
                            ${Math.round(swap.number * 10) / 10} <span style="font-size: var(--text-xs); font-weight: 400; color: var(--ink-2);">${swap.unit || ""}</span>
                            ${swap.isEstimate ? `<span style="font-size: 11px; font-weight: 400; color: var(--ink-2); margin-left: 4px;">(Estimate)</span>` : ""}
                          </div>

                          <p lang="${swap.reasonLang || currentLang}" style="font-size: var(--text-xs); color: var(--ink-2); margin-top: var(--space-8);">
                            ${swap.reason || ""}
                          </p>

                          <details class="swap-details">
                            <summary>How we worked this out</summary>
                            <div style="margin-top: var(--space-8);">
                              <div>Formula: ${swap.formula || "Calculated with pure day-model functions from tested factors."}</div>
                              ${factorLinks ? `<div style="margin-top: 4px;">Sources: ${factorLinks}</div>` : ""}
                            </div>
                          </details>
                        </div>
                      `;
                    })
                    .join("")}
                </div>
              </div>

              <!-- Indoor Kit -->
              <div class="air-card" style="margin-bottom: var(--space-32);">
                <div class="section-label">Indoor kit</div>
                <h3 style="font-size: var(--text-md); margin-bottom: var(--space-8);">Indoor Air Quality Hacks</h3>
                <ul style="font-size: var(--text-xs); color: var(--ink); line-height: 1.6; padding-left: var(--space-16);">
                  <li>Bedroom purifier: AHAM rule requires minimum CADR <strong>${Math.round(((profile.home.bedroomAreaSqFt * 2) / 3) * (profile.home.ceilingHeightFt / 8))} CFM</strong> for your bedroom volume.</li>
                  <li>Airing your home: Best time to open windows is during the afternoon clean air window (<strong>${cleanestText}</strong>).</li>
                  <li>Keep windows tightly shut during morning inversion hours (<strong>${dirtiestText}</strong>).</li>
                  <li>Wet-mop floors with water instead of dry sweeping to trap particles without resuspending dust.</li>
                </ul>
              </div>

              <!-- Fixed Health Warning & Advice -->
              <div style="border-top: 1px solid var(--rule); padding-top: var(--space-16); margin-bottom: var(--space-32); font-size: var(--text-xs); color: var(--ink-2);">
                <p style="margin-bottom: var(--space-4);">
                  <strong>Not medical advice.</strong> SaafSaans is an urban environmental planning assistant.
                </p>
                <p>
                  See a doctor if you experience breathlessness, chest pain, or wheezing that does not settle.
                </p>
              </div>

              <!-- Refine Box (500 chars) -->
              <div class="refine-section" style="border: 1px solid var(--rule); border-radius: var(--radius); padding: var(--space-16); background-color: var(--surface);">
                <h3 style="font-size: var(--text-md); margin-bottom: var(--space-8);">Refine your routine</h3>
                <p style="font-size: var(--text-xs); color: var(--ink-2); margin-bottom: var(--space-12);">
                  Tell Gemini about any schedule change (e.g. "my son has football at 7 am on Saturdays").
                </p>
                <textarea
                  id="refine-input"
                  class="form-textarea"
                  rows="3"
                  maxlength="500"
                  placeholder="Describe your routine change..."
                ></textarea>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: var(--space-8);">
                  <span id="refine-char-count" style="font-size: 11px; color: var(--ink-2);">500 characters remaining</span>
                  <button id="btn-submit-refine" class="btn btn-secondary" type="button">Update plan</button>
                </div>
              </div>
            </div>

            <!-- Sticky Side Column: Family Totals -->
            <div class="side-col">
              <aside class="totals-sticky-col" aria-label="Family Totals" aria-live="polite">
                <div class="section-label">Family totals today</div>

                <div style="margin-top: var(--space-16); display: flex; flex-direction: column; gap: var(--space-16);">
                  ${totals.memberDoses
                    .map((m) => {
                      const name = getMemberName(m.memberId);
                      return `
                        <div style="border-bottom: 1px solid var(--rule); padding-bottom: var(--space-8);">
                          <div style="font-weight: 500; font-size: var(--text-sm);">${name}</div>
                          <div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: var(--text-xs);">
                            <span style="color: var(--ink-2);">Dose cut:</span>
                            <strong class="tabular-nums">${Math.round(m.doseCutPercentage)}%</strong>
                          </div>
                          <div style="display: flex; justify-content: space-between; margin-top: 2px; font-size: var(--text-xs);">
                            <span style="color: var(--ink-2);">Cigarettes avoided:</span>
                            <strong class="tabular-nums">${Math.round(m.cigarettesAvoided * 10) / 10}</strong>
                          </div>
                        </div>
                      `;
                    })
                    .join("")}

                  <div style="padding-top: var(--space-4);">
                    <div style="font-size: var(--text-xs); color: var(--ink-2);">Household CO2 avoided</div>
                    <div style="font-size: var(--text-xl); font-weight: 600; margin-top: 2px;" class="tabular-nums">
                      ${Math.round(totals.householdCo2WeeklyKg * 10) / 10} <span style="font-size: var(--text-xs); font-weight: 400; color: var(--ink-2);">kg / week</span>
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
