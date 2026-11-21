// home.ts: The home page: guided full-height sections named after the challenge brief
// (DESIGN.md section 7). The hero renders at once; the rest follows when the demo data arrives.
import type { NormalisedAirData } from "../../shared/air-types.js";
import { type DemoHouseholdItem, fetchAirData, fetchDemoHouseholds } from "../app/api.js";
import { capturedLabel, timeOfDay } from "../app/format.js";
import { setPageMeta } from "../app/meta.js";
import { attachCalculator } from "../ui/calculator.js";
import { downloadCleanWindowIcs } from "../ui/calendar.js";
import { type HtmlValue, type SafeHtml, html, setHtml } from "../ui/html.js";
import { attachGuideNav, guideNavHtml } from "../ui/nav.js";
import { attachChrome, renderFooter, renderHeader } from "./chrome.js";
import { t } from "./i18n.js";
import { type HomeModel, buildHomeModel } from "./model.js";
import { setupScrollReveal } from "./motion.js";
import { airSection } from "./sections/air-now.js";
import { alternativesSection } from "./sections/alternatives.js";
import { communitySection } from "./sections/community.js";
import { heroSection } from "./sections/hero.js";
import { impactSection, impactTableHtml } from "./sections/impact.js";
import { indoorSection } from "./sections/indoor.js";
import { methodSection } from "./sections/method.js";
import { nextStepsSection } from "./sections/next-steps.js";
import { routineSection } from "./sections/routine.js";

const KUKATPALLY = { lat: 17.48, lng: 78.41 };

function sectionsHtml(m: HomeModel): SafeHtml[] {
  const airLabel = m.air.isDemo
    ? (capturedLabel(m.air.capturedAt) ?? "")
    : t("hero.updatedAt", { time: timeOfDay(new Date()) });
  return [
    heroSection(m, airLabel),
    airSection(m),
    routineSection(m),
    indoorSection(m),
    alternativesSection(m),
    impactSection(m),
    communitySection(m, window.location.origin),
    methodSection(),
    nextStepsSection(),
  ];
}

function navFromSections(main: HTMLElement): SafeHtml {
  const items = Array.from(main.querySelectorAll<HTMLElement>(".g-section")).map((s) => ({
    id: s.id,
    title: s.dataset.navTitle ?? "",
    stepLabel: s.dataset.stepLabel ?? "",
  }));
  return guideNavHtml(items);
}

function attachSections(root: HTMLElement, m: HomeModel): void {
  attachCalculator(root, "home");
  root.querySelector("#home-ics")?.addEventListener("click", () => {
    if (m.cleanest) downloadCleanWindowIcs(m.cleanest, t("places.Kukatpally, Hyderabad"));
  });
  const toggle = root.querySelector<HTMLInputElement>("#home-impact-toggle");
  const table = root.querySelector<HTMLElement>("#home-impact-table");
  toggle?.addEventListener("change", () => {
    if (table) setHtml(table, impactTableHtml(m, toggle.checked));
  });
}

export async function initHomePage(): Promise<void> {
  const appRoot = document.getElementById("app");
  if (!appRoot) return;
  setPageMeta("home");

  const shell = (main: HtmlValue) => {
    const page = html`<div class="guide"><div class="guide-rail"></div><main id="main" class="guide-main"
      tabindex="-1">${main}</main></div>`;
    setHtml(appRoot, html`${renderHeader()}${page}${renderFooter()}`);
    attachChrome(() => void initHomePage());
  };
  shell(heroSection(null, ""));

  const [air, households] = await Promise.all([
    fetchAirData(KUKATPALLY.lat, KUKATPALLY.lng).catch((): NormalisedAirData | null => null),
    fetchDemoHouseholds().catch((): DemoHouseholdItem[] => []),
  ]);
  const model = air ? buildHomeModel(air, households) : null;
  if (!model) return;

  shell(sectionsHtml(model));
  const main = appRoot.querySelector<HTMLElement>("#main");
  const rail = appRoot.querySelector<HTMLElement>(".guide-rail");
  if (!(main && rail)) return;
  setHtml(rail, navFromSections(main));
  attachGuideNav(appRoot);
  attachSections(appRoot, model);
  setupScrollReveal(appRoot);
}
