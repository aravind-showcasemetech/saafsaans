// home.ts: Main home page controller assembling the modules.
// Plain TypeScript, follows docs/DESIGN.md sections 1 to 8.
// The insight windows and the Reddys' examples come from the Kukatpally forecast and src/shared.

import type { NormalisedAirData } from "../../shared/air-types.js";
import { cleanestAndDirtiestWindows } from "../../shared/impact.js";
import { fetchAirData } from "../app/api.js";
import { capturedLabel, timeOfDay } from "../app/format.js";
import { setPageMeta } from "../app/meta.js";
import { type AreaAirItem, computeReddysExamples, fetchAreasAir } from "./data.js";
import { type SupportedLang, getLanguage, setLanguage } from "./i18n.js";
import { setupHeaderScroll, setupMarquees, setupScrollReveal, setupStickyPanel } from "./motion.js";
import {
  renderAirMarquee,
  renderCommunity,
  renderFinalCta,
  renderFooter,
  renderFormulas,
  renderHeader,
  renderHero,
  renderHowItWorks,
  renderMorningInsight,
  renderSourcesMarqueeAndList,
  renderTwoLenses,
} from "./render.js";

const KUKATPALLY = { lat: 17.48, lng: 78.41 };

export async function initHomePage(): Promise<void> {
  const appRoot = document.getElementById("app");
  if (!appRoot) return;

  const [areas, forecastAir] = await Promise.all([
    fetchAreasAir(),
    fetchAirData(KUKATPALLY.lat, KUKATPALLY.lng).catch((): NormalisedAirData | null => null),
  ]);
  const kukatpally: AreaAirItem | undefined = areas.find((a) => a.name === "Kukatpally");
  const hourly = forecastAir?.hourlyForecast ?? [];
  const windows = cleanestAndDirtiestWindows(hourly);
  const reddys = computeReddysExamples(hourly, forecastAir?.pm25 ?? kukatpally?.pm25 ?? 0);
  const loadedAt = new Date();

  function renderFullPage(): void {
    if (!appRoot) return;
    setPageMeta("home");
    // One clear label: sample data shows when it was captured, live data shows when it loaded.
    const airLabel = kukatpally?.isDemo
      ? (capturedLabel(kukatpally.capturedAt) ?? "")
      : timeOfDay(loadedAt);
    appRoot.innerHTML = `
      ${renderHeader()}
      <main id="main-content">
        ${renderHero(kukatpally ?? null, airLabel)}
        ${renderAirMarquee(areas)}
        ${renderMorningInsight(windows.cleanest, windows.dirtiest)}
        ${renderHowItWorks()}
        ${renderTwoLenses(reddys.protectDoseCut, reddys.polluteLessWeeklyCo2)}
        ${renderFormulas()}
        ${renderCommunity(reddys.communityHomes, reddys.communityTotalWeeklyKg)}
        ${renderSourcesMarqueeAndList()}
        ${renderFinalCta()}
      </main>
      ${renderFooter()}`;

    const current = getLanguage();
    for (const btn of document.querySelectorAll<HTMLButtonElement>(".lang-btn")) {
      const lang = btn.getAttribute("data-lang") as SupportedLang;
      if (lang === current) {
        btn.classList.add("active");
        btn.setAttribute("aria-current", "true");
      }
      btn.addEventListener("click", async () => {
        await setLanguage(lang);
        renderFullPage();
      });
    }

    setupHeaderScroll();
    setupScrollReveal();
    setupMarquees();
    setupStickyPanel({ windows, reddys });
  }

  renderFullPage();
}
