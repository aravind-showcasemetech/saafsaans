// share.ts: Share card view
// WhatsApp text preview and wa.me link (no dashes), homes taking part slider with communityTotal,
// clean-air window calendar download (.ics, Asia/Kolkata), and print view.

import { escapeHtml } from "../../shared/escape.js";
import { communityTotal } from "../../shared/impact.js";
import { getLanguage } from "../home/i18n.js";
import { recomputeHouseholdTotals } from "./recompute.js";
import { buildCalendarIcs, buildWhatsAppShareText } from "./share-utils.js";
import { loadHouseholdProfile, loadLocation, loadPlan, loadToggledSwaps } from "./storage.js";

export function renderShareView(container: HTMLElement): void {
  const profile = loadHouseholdProfile();
  const location = loadLocation() || { name: "Kukatpally, Hyderabad", lat: 17.48, lng: 78.41 };
  const plan = loadPlan();
  const initialSwaps = plan?.swaps || [];
  const storedToggles = loadToggledSwaps();
  const activeSwapIds = new Set<string>(storedToggles || initialSwaps.map((s) => s.id));

  // Compute exact CO2 number aligned with Today screen
  let weeklyCo2PerHome = 16.4;
  if (profile) {
    const hourly = plan ? [{ time: "2026-11-20T00:00:00Z", pm25: plan.currentAqi }] : [];
    const totals = recomputeHouseholdTotals({
      profile,
      hourlyForecast: hourly,
      currentPm25: plan?.currentAqi ?? 55,
      activeSwapIds,
    });
    weeklyCo2PerHome = Math.round(totals.householdCo2WeeklyKg * 10) / 10;
  }

  let homesCount = 10;

  function render(): void {
    const community = communityTotal(weeklyCo2PerHome, homesCount);
    const cleanestStart = "14:00";
    const cleanestEnd = "17:00";

    const waText = buildWhatsAppShareText({
      areaName: location.name,
      cleanestStart,
      cleanestEnd,
      swapsCount: activeSwapIds.size > 0 ? activeSwapIds.size : 4,
      co2SavedKgPerWeek: weeklyCo2PerHome,
      originUrl: typeof window !== "undefined" ? window.location?.origin : undefined,
    });

    const waUrl = `https://wa.me/?text=${encodeURIComponent(waText)}`;

    container.innerHTML = `
      <section class="section">
        <div class="container container-narrow">
          <div class="header-nav-wrap">
            <a href="#/today" class="btn-text">Back to Today</a>
          </div>

          <h1 class="page-title">
            Share your household air plan
          </h1>
          <p class="page-lead">
            Share low-emission daily routines with your housing society, apartment group or family.
          </p>

          <!-- WhatsApp Share Card -->
          <div class="air-card section-spacer-32">
            <div class="section-label">WhatsApp message preview</div>
            <pre class="share-wa-preview">${escapeHtml(waText)}</pre>
            <a id="whatsapp-share-btn" href="${escapeHtml(waUrl)}" target="_blank" rel="noopener" class="btn btn-primary">Share on WhatsApp</a>
          </div>

          <!-- Community Multiplier Slider -->
          <div class="air-card section-spacer-32">
            <div class="section-label">Collective action multiplier</div>
            <h2 class="card-heading">
              Homes taking part in your society
            </h2>
            <p class="card-subtext">
              Move the slider to see weekly emissions avoided if families in your neighbourhood take part.
            </p>

            <div class="slider-control-row">
              <label for="homes-slider" class="sr-only">Number of homes taking part</label>
              <input
                id="homes-slider"
                type="range"
                min="1"
                max="250"
                value="${homesCount}"
                aria-label="Homes taking part in your society"
                class="slider-input-flex"
              />
              <span id="homes-slider-val" class="tabular-nums slider-val-badge">
                ${homesCount} homes
              </span>
            </div>

            <div class="slider-summary-row">
              <span class="slider-summary-label">Weekly avoided road emissions:</span>
              <strong id="community-co2-val" class="tabular-nums slider-summary-val">
                ${Math.round(community.totalWeeklySaving)} kg CO2
              </strong>
            </div>
          </div>

          <!-- Calendar Download -->
          <div class="air-card section-spacer-32">
            <div class="section-label">Calendar integration</div>
            <h2 class="card-heading">
              Download clean air windows (.ics)
            </h2>
            <p class="card-subtext">
              Add today's clean-air window (14:00 to 17:00) to Google Calendar or Apple Calendar.
            </p>
            <button id="btn-download-ics" class="btn btn-secondary" type="button">Download .ics file</button>
          </div>

          <!-- Print View -->
          <div class="print-action-wrap">
            <button id="btn-print-plan" class="btn btn-secondary" type="button">Print this plan</button>
          </div>
        </div>
      </section>
    `;

    attachEvents();
  }

  function attachEvents(): void {
    const slider = container.querySelector<HTMLInputElement>("#homes-slider");
    const sliderVal = container.querySelector<HTMLElement>("#homes-slider-val");
    const co2Val = container.querySelector<HTMLElement>("#community-co2-val");
    const btnIcs = container.querySelector<HTMLButtonElement>("#btn-download-ics");
    const btnPrint = container.querySelector<HTMLButtonElement>("#btn-print-plan");

    if (slider && sliderVal && co2Val) {
      slider.addEventListener("input", () => {
        homesCount = Number(slider.value);
        sliderVal.textContent = `${homesCount} homes`;
        const comm = communityTotal(weeklyCo2PerHome, homesCount);
        co2Val.textContent = `${Math.round(comm.totalWeeklySaving)} kg CO2`;
      });
    }

    if (btnIcs) {
      btnIcs.addEventListener("click", () => {
        const todayStr = new Date().toISOString().split("T")[0];
        const icsContent = buildCalendarIcs({
          dateIso: todayStr,
          cleanestWindow: { startHour: 14, endHour: 17 },
          areaName: location.name,
        });

        const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `saafsaans-clean-air-${todayStr}.ics`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }

    if (btnPrint) {
      btnPrint.addEventListener("click", () => {
        window.print();
      });
    }
  }

  render();
}
