import { expect, openDemoFamily, test } from "./fixtures";

test.describe("Chart window markers", () => {
  test("home and Today outline and label the cleanest and dirtiest windows on the chart", async ({
    page,
  }) => {
    for (const open of [
      async () => {
        await page.goto("/");
        await page.waitForSelector("#routine .forecast-svg");
      },
      async () => openDemoFamily(page),
    ]) {
      await open();
      const chart = page.locator(".forecast").first();
      await expect(chart.locator(".d-window-clean")).toHaveCount(1);
      await expect(chart.locator(".d-window-dirty")).toHaveCount(1);
      await expect(chart.locator(".d-bracket-clean")).toHaveCount(1);
      await expect(chart.locator(".d-label-clean")).toHaveText("Cleanest hours");
      await expect(chart.locator(".d-label-dirty")).toHaveText("Dirtiest hours");
      // The outline sits over real bars: it has width, and the legend words match the labels.
      const width = Number(await chart.locator(".d-window-clean").getAttribute("width"));
      expect(width).toBeGreaterThan(0);
      await expect(chart.locator(".forecast-legend")).toContainText("Cleanest hours");
    }
  });
});

test.describe("Instant purifier result", () => {
  test("shows the default room's size on load and updates as the inputs change", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForSelector("#home-calc-result");
    const result = page.locator("#home-calc-result");
    // The Reddys' 12 by 12 ft bedroom with a 10 ft ceiling: 2/3 x 144 x 10/8 = 120 cfm.
    await expect(result.locator(".big-number")).toHaveText("120");
    await page.locator("#home-width").fill("15"); // 2/3 x 180 x 10/8 = 150
    await expect(result.locator(".big-number")).toHaveText("150");
    await page.locator("#home-height").fill("8"); // 2/3 x 180 = 120
    await expect(result.locator(".big-number")).toHaveText("120");
    await expect(page.locator("#home-calc-go")).toBeVisible();
  });
});

test.describe("Compact phone header", () => {
  for (const width of [390, 320]) {
    for (const lang of ["en", "hi", "te"]) {
      test(`${width} px, ${lang}: wordmark, language menu and plan button on one row`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(`/?lang=${lang}`);
        await page.waitForSelector("#start .g-title");
        const boxes = await page.evaluate(() => {
          const box = (sel: string) => {
            const el = document.querySelector<HTMLElement>(sel);
            if (!el || el.offsetParent === null) return null;
            const r = el.getBoundingClientRect();
            return { top: r.top, bottom: r.bottom, right: r.right };
          };
          return {
            brand: box(".brand-wordmark"),
            select: box("#lang-select"),
            plan: box(".header-plan"),
            buttons: box(".lang-switch"),
            header: box(".site-header"),
            vw: document.documentElement.clientWidth,
          };
        });
        expect(boxes.select, "language menu shown").not.toBeNull();
        expect(boxes.buttons, "language buttons hidden").toBeNull();
        const rows = [boxes.brand, boxes.select, boxes.plan].map((b) => b?.top ?? -1);
        const tallest = Math.max(
          ...[boxes.brand, boxes.select, boxes.plan].map((b) => (b?.bottom ?? 0) - (b?.top ?? 0)),
        );
        // One row: every item starts within one item's height of the others, and none spills off screen.
        expect(Math.max(...rows) - Math.min(...rows)).toBeLessThan(tallest);
        expect(boxes.plan?.right ?? 0).toBeLessThanOrEqual(boxes.vw);
        expect((boxes.header?.bottom ?? 0) - (boxes.header?.top ?? 0)).toBeLessThan(80);
      });
    }
  }

  test("the language menu switches the page language", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto("/");
    await page.waitForSelector("#start .g-title");
    await page.locator("#lang-select").selectOption("te");
    await expect(page.locator("html")).toHaveAttribute("lang", "te");
    await expect(page.locator("#lang-select")).toHaveValue("te");
  });
});

test.describe("Family totals note", () => {
  test("explains that indoor smoke swaps are shown with sourced figures", async ({ page }) => {
    await openDemoFamily(page);
    const note = page.locator("#today-totals .totals-note");
    await expect(note).toHaveText(
      "Indoor smoke changes (coil, incense, cooking) are shown with their sourced figures, not as a dose percentage.",
    );
    // It sits directly under the totals table.
    const follows = await page.evaluate(
      () =>
        document
          .querySelector("#totals-list")
          ?.nextElementSibling?.classList.contains("totals-note") ?? false,
    );
    expect(follows).toBe(true);
  });
});
