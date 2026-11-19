// home.ts: Main home page controller assembling the modules.
// Plain TypeScript, follows docs/DESIGN.md sections 1 to 8.

import { type AreaAirItem, computeReddysExamples, fetchAreasAir } from "./data.js";
import { type SupportedLang, getLanguage, setLanguage, t } from "./i18n.js";
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

export async function initHomePage(): Promise<void> {
  const appRoot = document.getElementById("app");
  if (!appRoot) return;

  // Initialize language
  await setLanguage("en");

  // Fetch areas air
  const areas = await fetchAreasAir();
  const kukatpally = areas.find((a) => a.name === "Kukatpally") ?? areas[0];

  const isDemo = kukatpally?.isDemo ?? true;
  const sampleDate = kukatpally?.capturedDate ?? "2026-11-19";
  const timeDisplay = isDemo
    ? `Sample data captured on ${sampleDate}`
    : new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const liveAir = kukatpally
    ? {
        aqi: kukatpally.aqi ?? 92,
        aqiBand: kukatpally.aqiBand ?? "Satisfactory",
        pm25: kukatpally.pm25 ?? 55,
        area: "Kukatpally, Hyderabad",
        time: timeDisplay,
      }
    : null;

  // Hourly forecast synthetic or from kukatpally for Reddys calculation
  const syntheticForecast = [
    { time: "2026-11-20T01:00:00Z", pm25: 65 },
    { time: "2026-11-20T07:00:00Z", pm25: 85 },
    { time: "2026-11-20T10:00:00Z", pm25: 45 },
    { time: "2026-11-20T15:00:00Z", pm25: 35 },
  ];
  const reddyComputed = computeReddysExamples(syntheticForecast, liveAir?.pm25 ?? 55);

  function renderFullPage(): void {
    if (!appRoot) return;
    const headerHtml = renderHeader();
    const heroHtml = renderHero(liveAir);
    const marquee1Html = renderAirMarquee(areas);
    const insightHtml = renderMorningInsight("14:00 to 17:00", "07:00 to 10:00");
    const howItWorksHtml = renderHowItWorks();
    const lensesHtml = renderTwoLenses(
      reddyComputed.protectDoseCut,
      reddyComputed.polluteLessWeeklyCo2,
    );
    const formulasHtml = renderFormulas();
    const communityHtml = renderCommunity(
      reddyComputed.communityHomes,
      reddyComputed.communityTotalWeeklyKg,
    );
    const sourcesHtml = renderSourcesMarqueeAndList();
    const ctaHtml = renderFinalCta();
    const footerHtml = renderFooter();

    appRoot.innerHTML = `
      ${headerHtml}
      <main id="main-content" role="main">
        ${heroHtml}
        ${marquee1Html}
        ${insightHtml}
        ${howItWorksHtml}
        ${lensesHtml}
        ${formulasHtml}
        ${communityHtml}
        ${sourcesHtml}
        ${ctaHtml}
      </main>
      ${footerHtml}
    `;

    // Attach language switcher events
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

    // Setup motion & interactions
    setupHeaderScroll();
    setupScrollReveal();
    setupMarquees();
    setupStickyPanel();
  }

  renderFullPage();
}
