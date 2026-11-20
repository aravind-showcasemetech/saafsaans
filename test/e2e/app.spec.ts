import { expect, openDemoFamily, test } from "./fixtures";

test.describe("Flows (DEMO=1)", () => {
  test("the demo family opens Today with its six sections", async ({ page }) => {
    await openDemoFamily(page);
    const ids = await page.$$eval(".g-section", (els) => els.map((e) => e.id));
    expect(ids).toEqual(["air", "routine", "indoor", "alternatives", "impact", "share"]);
    await expect(page.locator("h1")).toHaveText("Your air today");
    await expect(page.locator(".g-nav-link")).toHaveCount(6);
  });

  test("ticking a swap updates the family totals at once", async ({ page }) => {
    await openDemoFamily(page);
    const totals = page.locator("#today-totals");
    const before = await totals.innerText();
    const first = page.locator(".swap-toggle-cb").first();
    await expect(first).toBeChecked();
    await first.uncheck();
    await expect(totals).not.toHaveText(before);
    await expect(first).toBeFocused();
  });

  test("swap cards show numbers, a sentence in words, and no NaN or undefined", async ({
    page,
  }) => {
    await openDemoFamily(page);
    const cards = page.locator(".swap-card");
    expect(await cards.count()).toBeGreaterThan(0);
    for (const text of await cards.allTextContents()) {
      expect(text).not.toMatch(/NaN|undefined|null/);
    }
    const sentences = await page.locator(".swap-sentence").allTextContents();
    expect(sentences.every((s) => s.trim().length > 0)).toBe(true);
    const mask = page.locator(".swap-card[data-swap-id='mask-outdoors']");
    if ((await mask.count()) > 0) expect(await mask.textContent()).toMatch(/34%\s*to\s*93%/);
    const coil = page.locator(".swap-card[data-swap-id='no-mosquito-coil']");
    if ((await coil.count()) > 0)
      expect(await coil.textContent()).toContain("Burning one mosquito coil");
  });

  test("setup: five steps, place by keyboard, review in sentences, then Today", async ({
    page,
  }) => {
    await page.goto("/#/setup");
    const input = page.locator("#place-search-input");
    await input.fill("gachi");
    await expect(page.locator("#place-suggestions-listbox [role=option]").first()).toBeVisible();
    await input.press("ArrowDown");
    await input.press("Enter");
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("saafsaans_location")))
      .toContain('"lat":17.44');

    for (const step of ["people", "travel", "home", "review"]) {
      await page.locator("#btn-step-next").click();
      await expect(page).toHaveURL(new RegExp(`step=${step}`));
    }
    await expect(page.locator(".review-group")).toHaveCount(4);
    await expect(page.locator(".review")).toContainText("Gachibowli, Hyderabad");

    await page.locator(".review-group a[href*='step=travel']").click();
    await expect(page.locator("#commute-dist-input")).toBeVisible();
    await page.locator("#commute-dist-input").fill("999");
    await page.locator("#btn-step-next").click();
    await expect(page.locator("#setup-error")).toContainText("0 to 200");
    await expect(page.locator("#commute-dist-input")).toBeFocused();
    await page.locator("#commute-dist-input").fill("8");
    await page.locator("#btn-step-next").click();
    await page.locator("#btn-step-next").click();
    await expect(page.locator(".review")).toContainText("8 km each way");

    await page.locator("#btn-save-setup").click();
    await expect(page).toHaveURL(/#\/today/);
    await page.waitForSelector(".g-section#share");
    await expect(page.locator("#air .panel-label")).toContainText("Gachibowli, Hyderabad");
  });

  test("Today and Share show the same weekly CO2", async ({ page }) => {
    await openDemoFamily(page);
    const todayCo2 = (await page.locator(".side-col-co2-val").innerText()).trim();
    await page.goto("/#/share");
    await page.waitForSelector("#whatsapp-share-btn");
    await expect(page.locator(".share-wa-preview")).toContainText(`${todayCo2} kg of CO₂`);
    const href = (await page.locator("#whatsapp-share-btn").getAttribute("href")) ?? "";
    expect(href.startsWith("https://wa.me/?text=")).toBe(true);
    expect(decodeURIComponent(href)).not.toMatch(/[—–]/);
  });
});
