import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

// axe on every screen, in English, Hindi and Telugu, with motion on and with reduced motion.
const SCREENS = [
  { name: "home", path: "/", ready: ".hero-title" },
  { name: "setup location", path: "/#/setup", ready: "#place-search-input" },
  { name: "setup household", path: "/#/setup", ready: "#members-list", next: "#btn-to-step-2" },
  { name: "today", path: "/#/today", ready: ".swap-row" },
  { name: "share", path: "/#/share", ready: "#whatsapp-share-btn" },
  { name: "demo list", path: "/#/demo?select", ready: ".btn-select-demo" },
];

async function openDemoFamily(page: Page): Promise<void> {
  await page.goto("/");
  await page.waitForSelector(".hero-title");
  await page.locator("a[href='#/demo']").first().click();
  await page.waitForSelector(".swap-row");
}

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
        if (screen.next) await page.locator(screen.next).click();
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
