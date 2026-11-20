import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

// The Routes API is mocked: /api/commute answers with fixed distances, so no test calls Google.
const route = (km: number, isBeta = false, fallback: "none" | "road-distance" = "none") => ({
  distanceMeters: km * 1000,
  durationSeconds: 900,
  distanceKm: km,
  durationMinutes: 15,
  isBeta,
  fallback,
});

async function mockCommute(page: Page, ok = true): Promise<string[]> {
  const bodies: string[] = [];
  await page.route("**/api/commute", async (r) => {
    bodies.push(r.request().postData() ?? "");
    if (!ok)
      return r.fulfill({ status: 500, contentType: "application/json", body: '{"error":"x"}' });
    return r.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        DRIVE: route(9.43),
        TWO_WHEELER: route(8.91, true),
        TRANSIT: route(9.43, false, "road-distance"),
        WALK: route(8.2, true, "road-distance"),
      }),
    });
  });
  return bodies;
}

async function chooseDestination(page: Page): Promise<void> {
  await page.goto("/#/setup?step=travel");
  const input = page.locator("#commute-dest-input");
  await input.fill("hitec");
  await expect(page.locator("#commute-dest-input-listbox [role=option]").first()).toBeVisible();
  await input.press("ArrowDown");
  await expect(input).toHaveAttribute("aria-activedescendant", "commute-dest-input-opt-0");
  await input.press("Enter");
}

test.describe("Commute distance from the Routes API", () => {
  test("fills the distance for the mode, with Google's beta and road-distance notes", async ({
    page,
  }) => {
    const bodies = await mockCommute(page);
    await chooseDestination(page);

    const distance = page.locator("#commute-dist-input");
    const status = page.locator("#route-status");
    await expect(distance).toHaveValue("9.4"); // petrol car: DRIVE
    await expect(status).toContainText("Distance by car from Google Maps: 9.4 km each way.");
    await expect(status).not.toContainText("beta");

    // Coordinates leave the browser rounded to about 1 km.
    const sent = JSON.parse(bodies[0]);
    expect(sent.origin).toEqual({ lat: 17.48, lng: 78.41 });
    expect(sent.destination).toEqual({ lat: 17.44, lng: 78.38 });

    await page.locator("#commute-mode-select").selectOption("scooter");
    await expect(distance).toHaveValue("8.9");
    await expect(status).toContainText("two-wheeler");
    await expect(status).toContainText("Google lists two-wheeler and walking routes as beta");

    await page.locator("#commute-mode-select").selectOption("metro");
    await expect(distance).toHaveValue("9.4");
    await expect(status).toContainText(
      "No public transport route was found, so this is the road distance.",
    );

    // The filled distance is kept, and the review names the destination.
    await page.locator("#btn-step-next").click();
    await page.locator("#btn-step-next").click();
    await expect(page.locator(".review")).toContainText("9.4 km each way");
    await expect(page.locator(".review")).toContainText("You go to HITEC City, Hyderabad.");
  });

  test("falls back to typing the distance when the route cannot be measured", async ({ page }) => {
    await mockCommute(page, false);
    await chooseDestination(page);
    await expect(page.locator("#route-status")).toContainText("Please type the distance yourself.");
    await page.locator("#commute-dist-input").fill("6");
    await page.locator("#btn-step-next").click();
    await page.locator("#btn-step-next").click();
    await expect(page.locator(".review")).toContainText("6 km each way");
  });

  test("the travel step reads in Telugu", async ({ page }) => {
    await mockCommute(page);
    await page.goto("/#/setup?step=travel&lang=te");
    await expect(page.locator("label[for='commute-dest-input']")).toContainText("మీరు ఎక్కడికి వెళ్తారు?");
  });
});
