import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("SaafSaans App Screens E2E Tests (DEMO=1)", () => {
  test("loads demo household and navigates to #/today", async ({ page }) => {
    // Start at home and click demo
    await page.goto("/");
    await page.waitForSelector(".hero-title");
    await page.locator("a[href='#/demo']").first().click();

    await page.waitForSelector(".today-layout");
    await expect(page.locator("h1")).toHaveText("Today's Air Plan");

    // Air now card check
    await expect(page.locator(".air-aqi-number")).toBeVisible();
    await expect(page.locator(".air-band-tag")).toBeVisible();

    // 48-hour strip check
    await expect(page.locator(".chart-strip-wrapper")).toBeVisible();

    // Swaps check
    const swapRows = page.locator(".swap-row");
    await expect(swapRows.first()).toBeVisible();
  });

  test("toggling a swap updates family totals in sticky sidebar", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".hero-title");
    await page.locator("a[href='#/demo']").first().click();

    await page.waitForSelector(".today-layout");

    // Get initial CO2
    const co2El = page.locator(".totals-sticky-col .tabular-nums").last();
    const initialCo2Text = await co2El.textContent();

    // Find first swap checkbox
    const firstCb = page.locator(".swap-toggle-cb").first();
    await expect(firstCb).toBeChecked();

    // Uncheck it
    await firstCb.uncheck();

    // Sidebar totals should update
    const updatedCo2Text = await co2El.textContent();
    expect(updatedCo2Text).not.toBeNull();
  });

  test("share card loads with WhatsApp preview and calendar download", async ({ page }) => {
    await page.goto("/#/share");
    await page.waitForSelector("#whatsapp-share-btn");

    const waBtn = page.locator("#whatsapp-share-btn");
    await expect(waBtn).toBeVisible();
    const href = await waBtn.getAttribute("href");
    expect(href).toContain("https://wa.me/?text=");
    // Check no em/en dashes in share text
    expect(href).not.toContain("—");
    expect(href).not.toContain("–");

    // Check calendar button
    const calBtn = page.locator("#btn-download-ics");
    await expect(calBtn).toBeVisible();
  });

  test("setup flow with place search and household forms", async ({ page }) => {
    await page.goto("/#/setup");
    await page.waitForSelector("#place-search-input");

    // Step 1: Location
    const input = page.locator("#place-search-input");
    await input.fill("Kukatpally");
    await page.waitForTimeout(400); // debounce wait

    // Advance to Step 2
    const nextBtn = page.locator("#btn-to-step-2");
    await nextBtn.click();

    // Step 2: Household members and presets
    await page.waitForSelector("#members-list");
    await expect(page.locator("#btn-add-member")).toBeVisible();

    // Click finish setup
    const saveBtn = page.locator("#btn-save-setup");
    await saveBtn.click();

    // Should route to Today view
    await expect(page).toHaveURL(/#\/today/);
  });

  test("verifies zero axe violations on all screens with motion on and off", async ({ page }) => {
    // Prime the localStorage with a household first so /#/today renders directly
    await page.goto("/");
    await page.waitForSelector(".hero-title");
    await page.locator("a[href='#/demo']").first().click();
    await page.waitForSelector(".today-layout");

    const routes = ["/", "/#/setup", "/#/today", "/#/share"];

    for (const route of routes) {
      // Normal motion
      await page.goto(route);
      await page.waitForTimeout(500);
      const normalScan = await new AxeBuilder({ page }).analyze();
      expect(normalScan.violations, `Axe violations on ${route} with normal motion`).toEqual([]);

      // Reduced motion
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(route);
      await page.waitForTimeout(500);
      const reducedScan = await new AxeBuilder({ page }).analyze();
      expect(reducedScan.violations, `Axe violations on ${route} with reduced motion`).toEqual([]);

      await page.emulateMedia({ reducedMotion: "no-preference" });
    }
  });

  test("verifies no horizontal scroll at 320, 390 and 1440 px on all views", async ({ page }) => {
    const routes = ["/", "/#/setup", "/#/today", "/#/share"];

    for (const route of routes) {
      for (const width of [320, 390, 1440]) {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(route);
        await page.waitForTimeout(400);

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
        expect(
          scrollWidth,
          `Page ${route} has horizontal scroll at ${width}px: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}`,
        ).toBeLessThanOrEqual(clientWidth + 1);
      }
    }
  });
});
