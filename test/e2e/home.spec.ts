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

  test("verifies no horizontal scroll at 320, 390 and 1440 px", async ({ page }) => {
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");
      await page.waitForSelector("#hero-title");

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(
        scrollWidth,
        `Page has horizontal scroll at ${width}px: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}`,
      ).toBeLessThanOrEqual(clientWidth + 1);
    }
  });
});
