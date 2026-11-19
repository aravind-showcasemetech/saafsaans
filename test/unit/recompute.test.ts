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
});
