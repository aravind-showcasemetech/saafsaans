import type { Page } from "@playwright/test";
import { expect, openDemoFamily, test } from "./fixtures";

const WIDTHS = [1440, 390, 320];

async function openPage(page: Page, name: "home" | "today"): Promise<void> {
  if (name === "home") {
    await page.goto("/");
    await page.waitForSelector("#air .g-title");
  } else {
    await openDemoFamily(page);
  }
  // Lay out every section (content-visibility skips off-screen ones) so sizes are real.
  await page.evaluate(() => {
    for (const el of document.querySelectorAll<HTMLElement>(".g-section")) {
      el.style.contentVisibility = "visible";
      el.classList.add("is-visible");
    }
  });
}

for (const name of ["home", "today"] as const) {
  for (const width of WIDTHS) {
    test(`${name} at ${width} px: every section is at least one screen tall and nothing is cut off`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await openPage(page, name);
      const report = await page.evaluate(() => {
        const vh = window.innerHeight;
        const vw = document.documentElement.clientWidth;
        const sections = Array.from(document.querySelectorAll<HTMLElement>(".g-section")).map(
          (s) => ({
            id: s.id,
            height: s.getBoundingClientRect().height,
            clipped: s.scrollHeight > s.clientHeight + 1 || s.scrollWidth > s.clientWidth + 1,
          }),
        );
        const wide = Array.from(document.querySelectorAll<HTMLElement>("main *"))
          .filter((el) => el.getBoundingClientRect().width > vw + 1)
          .map((el) => `${el.tagName}.${el.className}`);
        return { vh, sections, wide, pageScroll: document.documentElement.scrollWidth > vw + 1 };
      });
      expect(report.sections.length).toBeGreaterThan(5);
      for (const s of report.sections) {
        expect(s.height, `${s.id} height`).toBeGreaterThanOrEqual(report.vh - 1);
        expect(s.clipped, `${s.id} clipped`).toBe(false);
      }
      expect(report.wide, "elements wider than the screen").toEqual([]);
      expect(report.pageScroll, "horizontal page scroll").toBe(false);
    });
  }

  test(`${name}: icons are hidden and beside text; diagrams have a text alternative`, async ({
    page,
  }) => {
    await openPage(page, name);
    const problems = await page.evaluate(() => {
      const out: string[] = [];
      for (const svg of document.querySelectorAll<SVGElement>("svg.icon")) {
        if (svg.getAttribute("aria-hidden") !== "true") out.push("icon without aria-hidden");
        const holder = svg.parentElement;
        if (!holder || (holder.textContent ?? "").trim().length === 0)
          out.push("icon with no text beside it");
      }
      for (const svg of document.querySelectorAll<SVGElement>("svg:not(.icon)")) {
        const hidden = svg.getAttribute("aria-hidden") === "true";
        const named = svg.getAttribute("role") === "img" && svg.querySelector("title");
        if (!hidden && !named)
          out.push(`diagram without a text alternative: ${svg.getAttribute("class")}`);
      }
      for (const fig of document.querySelectorAll("figure")) {
        if (!fig.querySelector("figcaption")?.textContent?.trim())
          out.push("figure without a caption");
      }
      for (const img of document.querySelectorAll("img")) {
        if (!img.hasAttribute("alt")) out.push("img without alt");
      }
      return out;
    });
    expect(problems).toEqual([]);
  });

  test(`${name}: every section has the guided shape and a large enough primary action`, async ({
    page,
  }) => {
    await openPage(page, name);
    const sections = page.locator(".g-section");
    const count = await sections.count();
    for (let i = 0; i < count; i++) {
      const s = sections.nth(i);
      await expect(s.locator(".g-step")).toHaveCount(1);
      await expect(s.locator(".g-title")).toHaveCount(1);
      await expect(s.locator(".g-lines dt")).toHaveCount(2);
    }
    const sizes = await page.$$eval(".g-actions .btn, .calc .btn", (els) =>
      els.map((el) => el.getBoundingClientRect()).map((r) => [r.width, r.height]),
    );
    for (const [w, h] of sizes) {
      // Half a pixel for sub-pixel layout (43.9998 is a 44 px box mid-transition).
      expect(w).toBeGreaterThanOrEqual(43.5);
      expect(h).toBeGreaterThanOrEqual(43.5);
    }
  });
}
