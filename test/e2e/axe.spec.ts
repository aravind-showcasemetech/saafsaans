import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, openDemoFamily, test } from "./fixtures";

// axe on every screen, in English, Hindi and Telugu, with motion on and with reduced motion.
const SCREENS = [
  { name: "home", path: "/", ready: "#air .g-title" },
  { name: "setup location", path: "/#/setup?step=location", ready: "#place-search-input" },
  { name: "setup people", path: "/#/setup?step=people", ready: "#members-list" },
  { name: "setup travel", path: "/#/setup?step=travel", ready: "#commute-mode-select" },
  { name: "setup home", path: "/#/setup?step=home", ready: "#bedroom-sqft-input" },
  { name: "setup review", path: "/#/setup?step=review", ready: ".review" },
  { name: "today", path: "/#/today", ready: ".swap-card" },
  { name: "share", path: "/#/share", ready: "#whatsapp-share-btn" },
  { name: "demo list", path: "/#/demo?select", ready: ".btn-select-demo" },
];

/** Sections skipped by content-visibility have no layout; show them so axe checks them too. */
async function showAllSections(page: Page): Promise<void> {
  await page.evaluate(() => {
    for (const el of document.querySelectorAll<HTMLElement>("*")) {
      if (getComputedStyle(el).contentVisibility === "auto") el.style.contentVisibility = "visible";
      if (el.classList.contains("reveal-on-scroll")) el.classList.add("is-visible");
    }
  });
}

for (const lang of ["en", "hi", "te"] as const) {
  for (const motion of ["no-preference", "reduce"] as const) {
    test(`axe: every screen in ${lang} with motion ${motion}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: motion });
      await openDemoFamily(page);
      for (const screen of SCREENS) {
        const sep = screen.path.includes("?") ? "&" : "?";
        await page.goto(`${screen.path}${screen.path.includes("#") ? sep : "?"}lang=${lang}`);
        await page.waitForSelector(screen.ready);
        await expect(page.locator("html")).toHaveAttribute("lang", lang);
        await showAllSections(page);
        await page.waitForTimeout(400); // let fades finish
        const scan = await new AxeBuilder({ page }).analyze();
        const summary = scan.violations.map(
          (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
        );
        expect(summary, `axe on ${screen.name} (${lang}, motion ${motion})`).toEqual([]);
      }
    });
  }
}
