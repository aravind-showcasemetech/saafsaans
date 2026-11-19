// share.ts: Share card view
// WhatsApp text preview and wa.me link (no dashes), homes taking part slider with communityTotal,
// clean-air window calendar download (.ics, Asia/Kolkata), and print view.

import { communityTotal } from "../../shared/impact.js";
import { getLanguage } from "../home/i18n.js";
import { buildCalendarIcs, buildWhatsAppShareText } from "./share-utils.js";
import { loadHouseholdProfile, loadLocation, loadPlan, loadToggledSwaps } from "./storage.js";

export function renderShareView(container: HTMLElement): void {
  const profile = loadHouseholdProfile();
  const location = loadLocation() || { name: "Kukatpally, Hyderabad", lat: 17.48, lng: 78.41 };
  const plan = loadPlan();
  const toggles = loadToggledSwaps() || [];

  const weeklyCo2PerHome = 16; // kg
  let homesCount = 10;

  function render(): void {
    const community = communityTotal(weeklyCo2PerHome, homesCount);
    const cleanestStart = "14:00";
    const cleanestEnd = "17:00";

    const waText = buildWhatsAppShareText({
      areaName: location.name,
      cleanestStart,
      cleanestEnd,
      swapsCount: toggles.length > 0 ? toggles.length : 4,
      co2SavedKgPerWeek: weeklyCo2PerHome,
    });

    const waUrl = `https://wa.me/?text=${encodeURIComponent(waText)}`;

    container.innerHTML = `
      <section class="section">
        <div class="container" style="max-width: 680px;">
          <div style="margin-bottom: var(--space-24);">
            <a href="#/today" class="btn-text">← Back to Today</a>
          </div>

          <h1 style="font-size: var(--text-2xl); font-weight: 600; margin-bottom: var(--space-8);">
            Share Your Household Air Plan
          </h1>
          <p style="color: var(--ink-2); margin-bottom: var(--space-32); font-size: var(--text-sm);">
            Share low-emission daily routines with your housing society, apartment group or family.
          </p>

          <!-- WhatsApp Share Card -->
          <div class="air-card" style="margin-bottom: var(--space-32);">
            <div class="section-label">WhatsApp message preview</div>
            <pre style="white-space: pre-wrap; font-family: inherit; font-size: var(--text-sm); background-color: var(--paper); padding: var(--space-16); border-radius: var(--radius); margin-top: var(--space-8); margin-bottom: var(--space-16); border: 1px solid var(--rule);">${waText}</pre>
            <a id="whatsapp-share-btn" href="${waUrl}" target="_blank" rel="noopener" class="btn btn-primary">Share on WhatsApp</a>
          </div>

          <!-- Community Multiplier Slider -->
          <div class="air-card" style="margin-bottom: var(--space-32);">
            <div class="section-label">Collective action multiplier</div>
            <h2 style="font-size: var(--text-md); margin-top: 4px; margin-bottom: var(--space-8);">
              Homes taking part in your society
            </h2>
            <p style="font-size: var(--text-xs); color: var(--ink-2); margin-bottom: var(--space-16);">
              Move the slider to see weekly emissions avoided if families in your neighbourhood take part.
            </p>

            <div style="display: flex; align-items: center; gap: var(--space-16); margin-bottom: var(--space-16);">
              <label for="homes-slider" class="sr-only" style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); border: 0;">Number of homes taking part</label>
              <input
                id="homes-slider"
                type="range"
                min="1"
                max="250"
                value="${homesCount}"
                aria-label="Homes taking part in your society"
                style="flex: 1;"
              />
              <span id="homes-slider-val" class="tabular-nums" style="font-weight: 600; font-size: var(--text-lg); min-width: 60px;">
                ${homesCount} homes
              </span>
            </div>

            <div style="border-top: 1px solid var(--rule); padding-top: var(--space-12); display: flex; justify-content: space-between; align-items: baseline;">
              <span style="font-size: var(--text-sm); color: var(--ink-2);">Weekly avoided road emissions:</span>
              <strong id="community-co2-val" class="tabular-nums" style="font-size: var(--text-xl); color: var(--accent);">
                ${Math.round(community.totalWeeklySaving)} kg CO2
              </strong>
            </div>
          </div>

          <!-- Calendar Download -->
          <div class="air-card" style="margin-bottom: var(--space-32);">
            <div class="section-label">Calendar integration</div>
            <h2 style="font-size: var(--text-md); margin-top: 4px; margin-bottom: var(--space-8);">
              Download Clean Air Windows (.ics)
            </h2>
            <p style="font-size: var(--text-xs); color: var(--ink-2); margin-bottom: var(--space-16);">
              Add today's clean-air window (14:00 to 17:00) to Google Calendar or Apple Calendar.
            </p>
            <button id="btn-download-ics" class="btn btn-secondary" type="button">Download .ics file</button>
          </div>

          <!-- Print View -->
          <div style="text-align: center; margin-top: var(--space-32);">
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
