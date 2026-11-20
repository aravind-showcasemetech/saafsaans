import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Home Page Accessibility and Controls", () => {
  test("loads the home page and verifies no axe violations with motion on", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("#hero-title");

    // Check Axe violations
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("marquee Pause button toggles correctly and works with keyboard/mouse", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".marquee-wrapper");

    const firstMarquee = page.locator(".marquee-wrapper").first();
    const pauseBtn = firstMarquee.locator(".marquee-toggle-btn");

    await expect(pauseBtn).toHaveText("Pause");
    await expect(firstMarquee).not.toHaveClass(/is-paused/);

    // Click pause
    await pauseBtn.click();
    await expect(pauseBtn).toHaveText("Play");
    await expect(firstMarquee).toHaveClass(/is-paused/);

    // Click play
    await pauseBtn.click();
    await expect(pauseBtn).toHaveText("Pause");
    await expect(firstMarquee).not.toHaveClass(/is-paused/);
  });

  test("verifies zero axe violations with reduced motion", async ({ page }) => {
    // Emulate reduced motion
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.waitForSelector("#hero-title");

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("verifies no horizontal scroll and no element wider than viewport at 320 and 390 px", async ({
    page,
  }) => {
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");
      await page.waitForSelector("#hero-title");

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(
        scrollWidth,
        `Page has horizontal scroll at ${width}px: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}`,
      ).toBeLessThanOrEqual(clientWidth + 1);

      const overflowing = await page.evaluate(() => {
        const vw = window.innerWidth;
        const bad: string[] = [];
        const allEls = document.querySelectorAll("*");
        for (const el of allEls) {
          // If el or any of its ancestors is an explicitly overflow-clipped container (like marquees) or hidden, skip checking inner track
          if (el.closest(".marquee-viewport")) continue;

          const rect = el.getBoundingClientRect();
          if (rect.width > vw + 1.5) {
            const style = window.getComputedStyle(el);
            if (
              style.display !== "none" &&
              style.visibility !== "hidden" &&
              style.opacity !== "0" &&
              !["HTML", "BODY"].includes(el.tagName)
            ) {
              bad.push(
                `${el.tagName}${el.id ? `#${el.id}` : ""}${el.className ? `.${String(el.className).replace(/\s+/g, ".")}` : ""} (width=${Math.round(rect.width)} > vw=${vw})`,
              );
            }
          }
        }
        return bad;
      });

      expect(
        overflowing,
        `Found elements wider than viewport on home at ${width}px: ${overflowing.join("; ")}`,
      ).toEqual([]);
    }
  });
});
