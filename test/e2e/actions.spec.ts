import { expect, openDemoFamily, test } from "./fixtures";

// Each section's primary action does something useful.
test.describe("Home actions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("#air .g-title");
  });

  test("the calendar button downloads today's cleanest hours as .ics", async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.locator("#home-ics").click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^saafsaans-clean-air-\d{4}-\d{2}-\d{2}\.ics$/);
    const body = await (await download.createReadStream()).toArray();
    const ics = Buffer.concat(body).toString("utf8");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("TZID=Asia/Kolkata");
  });

  test("the purifier calculator works out the size step by step", async ({ page }) => {
    await page.locator("#home-length").fill("12");
    await page.locator("#home-width").fill("12");
    await page.locator("#home-height").fill("10");
    await page.locator("#home-calc-go").click();
    const result = page.locator("#home-calc-result");
    await expect(result.locator(".big-number")).toHaveText("120");
    await expect(result.locator(".calc-steps li")).toHaveCount(3);
    await page.locator("#home-height").fill("2");
    await page.locator("#home-height").press("Enter");
    await expect(result).toContainText("6 to 25");
  });

  test("the impact toggle changes each person's numbers", async ({ page }) => {
    const table = page.locator("#home-impact-table");
    const before = await table.innerText();
    await page.locator("#home-impact-toggle").check();
    await expect(table).not.toHaveText(before);
    await expect(table.locator(".is-better").first()).toBeVisible();
  });

  test("navigation actions open the right setup step", async ({ page }) => {
    await page.locator("#air .g-actions a").click();
    await expect(page).toHaveURL(/#\/setup\?step=location/);
    await expect(page.locator("#place-search-input")).toBeVisible();
    await page.goto("/");
    await page.locator("#alternatives .g-actions a").click();
    await expect(page).toHaveURL(/step=travel/);
    await expect(page.locator("#commute-mode-select")).toBeVisible();
  });

  test("Share on WhatsApp carries the society text; Read the sources opens FACTORS.md", async ({
    page,
  }) => {
    const wa = (await page.locator("#home-wa").getAttribute("href")) ?? "";
    expect(wa.startsWith("https://wa.me/?text=")).toBe(true);
    expect(decodeURIComponent(wa)).toContain("Green Meadows");
    await expect(page.locator("#method .g-actions a")).toHaveAttribute(
      "href",
      /docs\/FACTORS\.md$/,
    );
  });

  test("the section list marks the current section and moves focus to it", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator(".g-nav-link[data-target='indoor']").click();
    await expect(page.locator("#indoor-title")).toBeFocused();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator(".g-nav-link[data-target='indoor']")).toHaveAttribute(
      "aria-current",
      "step",
    );
  });
});

test.describe("Today actions", () => {
  test("calendar, calculator, travel, refine and print all work", async ({ page }) => {
    await openDemoFamily(page);
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.locator("#today-ics").click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.ics$/);

    await page.locator("#today-calc-go").click();
    await expect(page.locator("#today-calc-result .big-number")).toBeVisible();

    await page.locator("#open-refine").click();
    await expect(page.locator("#refine-box")).toHaveAttribute("open", "");
    await expect(page.locator("#refine-input")).toBeFocused();

    await expect(page.locator("#btn-print-plan")).toBeVisible();
    const wa = (await page.locator("#whatsapp-share-btn").getAttribute("href")) ?? "";
    expect(wa.startsWith("https://wa.me/?text=")).toBe(true);

    await page.locator("#alternatives .g-actions a").click();
    await expect(page).toHaveURL(/step=travel/);
  });
});
