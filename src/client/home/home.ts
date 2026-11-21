// home.ts: The home page: guided full-height sections named after the challenge brief
// (DESIGN.md section 7). The hero renders at once; the rest follows when the demo data arrives.
import type { NormalisedAirData } from "../../shared/air-types.js";
import { type DemoHouseholdItem, fetchAirData, fetchDemoHouseholds } from "../app/api.js";
import { capturedLabel, timeOfDay } from "../app/format.js";
import { setPageMeta } from "../app/meta.js";
import { attachCalculator } from "../ui/calculator.js";
import { downloadCleanWindowIcs } from "../ui/calendar.js";
import { attachGuideNav, guideNavHtml } from "../ui/nav.js";
import { attachChrome, renderFooter, renderHeader } from "./chrome.js";
import { t } from "./i18n.js";
import { type HomeModel, buildHomeModel } from "./model.js";
import { setupScrollReveal } from "./motion.js";
import { airSection, heroSection, indoorSection, routineSection } from "./sections-a.js";
import {
  alternativesSection,
  communitySection,
  finalSection,
  impactSection,
  impactTableHtml,
  methodSection,
} from "./sections-b.js";

const KUKATPALLY = { lat: 17.48, lng: 78.41 };

function sectionsHtml(m: HomeModel): string {
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
    finalSection(),
  ].join("");
}

function navFromSections(main: HTMLElement): string {
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
    if (table) table.innerHTML = impactTableHtml(m, toggle.checked);
  });
}

export async function initHomePage(): Promise<void> {
  const appRoot = document.getElementById("app");
  if (!appRoot) return;
  setPageMeta("home");

  const shell = (main: string) => {
    appRoot.innerHTML = `${renderHeader()}<div class="guide"><div class="guide-rail"></div><main id="main" class="guide-main" tabindex="-1">${main}</main></div>${renderFooter()}`;
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
  rail.innerHTML = navFromSections(main);
  attachGuideNav(appRoot);
  attachSections(appRoot, model);
  setupScrollReveal(appRoot);
}
