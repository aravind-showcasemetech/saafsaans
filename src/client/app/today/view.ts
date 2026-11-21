// view.ts: Today, the same guided pattern as the home page (DESIGN.md section 8): your air, your
// routine, indoor air hacks, sustainable alternatives, the impact of your choices, sharing.
// Every word comes from the i18n dictionaries; every number from src/shared.
import { cleanestAndDirtiestWindows } from "../../../shared/impact/index.js";
import { getLanguage } from "../../home/i18n.js";
import { setupScrollReveal } from "../../home/motion.js";
import { reportError } from "../../report-error.js";
import { attachCalculator } from "../../ui/calculator.js";
import { downloadCleanWindowIcs } from "../../ui/calendar.js";
import { html, setHtml } from "../../ui/html.js";
import { attachGuideNav, guideNavHtml } from "../../ui/nav.js";
import { fetchAirData, fetchPlan } from "../api.js";
import { placeLabel } from "../format.js";
import { recomputeHouseholdTotals } from "../recompute.js";
import { router } from "../router.js";
import { planShareText, whatsAppUrl } from "../share-text.js";
import {
  loadHouseholdProfile,
  loadLocation,
  loadNicknames,
  loadToggledSwaps,
  savePlan,
  saveToggledSwaps,
} from "../storage.js";
import { airTodaySection } from "./air-now.js";
import { type TodayContext, nameOf } from "./context.js";
import { errorHtml, loadingHtml } from "./loading-error.js";
import { attachRefine } from "./refine.js";
import {
  alternativesSection,
  impactSection,
  indoorSection,
  routineSection,
  shareSection,
} from "./sections.js";
import { totalsHtml } from "./totals.js";

export async function renderTodayView(container: HTMLElement): Promise<void> {
  const profile = loadHouseholdProfile();
  const location = loadLocation();
  if (!profile || profile.members.length === 0 || !location) {
    // No household yet: open the demo family instead of inventing one here.
    router.navigate("/demo");
    return;
  }
  setHtml(container, loadingHtml());

  try {
    const lang = getLanguage();
    const lat = Math.round(location.lat * 100) / 100;
    const lng = Math.round(location.lng * 100) / 100;
    const [air, plan] = await Promise.all([
      fetchAirData(lat, lng, lang),
      fetchPlan({ profile, lat, lng, lang }),
    ]);
    savePlan(plan);
    const { cleanest, dirtiest } = cleanestAndDirtiestWindows(air.hourlyForecast);
    const ids = new Set(plan.swaps.map((s) => s.id));
    const stored = loadToggledSwaps()?.filter((id) => ids.has(id));
    const ctx: TodayContext = {
      profile,
      location,
      nicknames: loadNicknames(),
      air,
      plan,
      cleanest,
      dirtiest,
      active: new Set(stored ?? ids),
    };
    renderContent(container, ctx);
  } catch (err: unknown) {
    reportError("Failed to load Today view:", err);
    setHtml(container, errorHtml());
  }
}

function weeklyCo2(ctx: TodayContext): ReturnType<typeof recomputeHouseholdTotals> {
  return recomputeHouseholdTotals({
    profile: ctx.profile,
    hourlyForecast: ctx.air.hourlyForecast,
    currentPm25: ctx.air.pm25,
    activeSwapIds: ctx.active,
  });
}

function renderContent(container: HTMLElement, ctx: TodayContext): void {
  const area = placeLabel(ctx.location.name);
  let totals = weeklyCo2(ctx);
  const shareUrl = () =>
    whatsAppUrl(
      planShareText({
        area,
        cleanest: ctx.cleanest,
        swapsChosen: ctx.active.size,
        weeklyCo2Kg: totals.householdCo2WeeklyKg,
        origin: window.location.origin,
      }),
    );
  const sections = [
    airTodaySection(ctx),
    routineSection(ctx),
    indoorSection(ctx),
    alternativesSection(ctx),
    impactSection(),
    shareSection(ctx, shareUrl()),
  ];
  setHtml(
    container,
    html`<div class="guide"><div class="guide-rail"></div><div
      class="guide-main today-layout">${sections}</div></div>`,
  );

  const rail = container.querySelector<HTMLElement>(".guide-rail");
  if (rail) {
    const items = Array.from(container.querySelectorAll<HTMLElement>(".g-section")).map((s) => ({
      id: s.id,
      title: s.dataset.navTitle ?? "",
      stepLabel: s.dataset.stepLabel ?? "",
    }));
    setHtml(rail, guideNavHtml(items));
  }
  attachGuideNav(container);
  setupScrollReveal(container);
  attachCalculator(container, "today");

  const totalsBox = container.querySelector<HTMLElement>("#today-totals");
  const wa = container.querySelector<HTMLAnchorElement>("#whatsapp-share-btn");
  const renderTotals = () => {
    if (totalsBox)
      setHtml(
        totalsBox,
        totalsHtml(totals, (id) => nameOf(ctx, id), ctx.active.size),
      );
    if (wa) wa.href = shareUrl();
  };
  renderTotals();

  for (const cb of container.querySelectorAll<HTMLInputElement>(".swap-toggle-cb")) {
    cb.addEventListener("change", () => {
      const id = cb.dataset.id;
      if (!id) return;
      if (cb.checked) ctx.active.add(id);
      else ctx.active.delete(id);
      cb.closest(".swap-card")?.classList.toggle("is-on", cb.checked);
      saveToggledSwaps(Array.from(ctx.active));
      totals = weeklyCo2(ctx);
      renderTotals();
    });
  }

  container.querySelector("#today-ics")?.addEventListener("click", () => {
    if (ctx.cleanest) downloadCleanWindowIcs(ctx.cleanest, area);
  });
  container.querySelector("#btn-print-plan")?.addEventListener("click", () => window.print());
  container.querySelector("#open-refine")?.addEventListener("click", () => {
    const box = container.querySelector<HTMLDetailsElement>("#refine-box");
    if (!box) return;
    box.open = true;
    box.querySelector<HTMLTextAreaElement>("#refine-input")?.focus();
  });
  attachRefine(container, ctx.profile, () => renderTodayView(container));
}
