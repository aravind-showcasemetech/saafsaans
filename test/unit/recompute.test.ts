import { describe, expect, it } from "vitest";
import { recomputeHouseholdTotals } from "../../src/client/app/recompute.js";
import { kukatpallyDemoAir } from "../../src/server/demo/air.js";
import { demoHouseholds } from "../../src/server/demo/households.js";

describe("recomputeHouseholdTotals: browser toggle recompute", () => {
  const reddys = demoHouseholds["the-reddys"].profile;

  it("computes 0 savings when no swaps are active", () => {
    const totals = recomputeHouseholdTotals({
      profile: reddys,
      hourlyForecast: kukatpallyDemoAir.hourlyForecast,
      currentPm25: kukatpallyDemoAir.pm25,
      activeSwapIds: new Set(),
    });

    for (const m of totals.memberDoses) {
      expect(m.doseCutPercentage).toBe(0);
      expect(m.cigarettesAvoided).toBe(0);
    }
    expect(totals.householdCo2WeeklyKg).toBe(0);
  });

  it("recomputes dose cut and cigarettes avoided when purifier is toggled", () => {
    const totals = recomputeHouseholdTotals({
      profile: reddys,
      hourlyForecast: kukatpallyDemoAir.hourlyForecast,
      currentPm25: kukatpallyDemoAir.pm25,
      activeSwapIds: new Set(["purifier-bedroom"]),
    });

    const father = totals.memberDoses.find((m) => m.memberId === "m-father");
    expect(father).toBeDefined();
    expect(father?.doseCutPercentage).toBeGreaterThan(20);
    expect(father?.cigarettesAvoided).toBeGreaterThan(0.3);
  });

  it("recomputes transport CO2 when metro is toggled", () => {
    const totals = recomputeHouseholdTotals({
      profile: reddys,
      hourlyForecast: kukatpallyDemoAir.hourlyForecast,
      currentPm25: kukatpallyDemoAir.pm25,
      activeSwapIds: new Set(["metro-not-car"]),
    });

    expect(totals.householdCo2WeeklyKg).toBeGreaterThan(15);
  });

  it("handles commute overlap when both metro-not-car and wfh-day are chosen without double counting", () => {
    // Reddys: 12 km * 2 trips = 24 km/day. Mode = petrol_car (0.14 kg CO2/km).
    // Car commute = 24 * 0.14 = 3.36 kg CO2/day.
    // Metro saves 97%: 3.36 * 0.97 = 3.2592 kg CO2/day.
    // Over 5 working days:
    // Metro alone (5 days): 3.2592 * 5 = 16.296 kg/week.
    // WFH alone (1 day): 3.36 * 1 = 3.36 kg/week.
    // Overlap: when both chosen, metro applies for 4 days (4 * 3.2592 = 13.0368)
    // plus 1 WFH day (3.36) = 16.3968 kg/week (~16.4 kg), NOT 19.656 kg/week (~19.7 kg).
    const totals = recomputeHouseholdTotals({
      profile: reddys,
      hourlyForecast: kukatpallyDemoAir.hourlyForecast,
      currentPm25: kukatpallyDemoAir.pm25,
      activeSwapIds: new Set(["metro-not-car", "wfh-day"]),
    });

    const rounded = Math.round(totals.householdCo2WeeklyKg * 10) / 10;
    expect(rounded).toBe(16.4);
    expect(rounded).not.toBe(19.7);
  });
});
