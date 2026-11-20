import { describe, expect, it } from "vitest";
import { createApp } from "../../src/server/app.js";
import { kukatpallyDemoAir } from "../../src/server/demo/air.js";
import { demoHouseholds } from "../../src/server/demo/households.js";
import { computeHouseholdDayComparison } from "../../src/shared/day.js";
import { PlanResponseSchema } from "../../src/shared/plan-schema.js";

// The Reddys demo (docs/SPEC.md section 13) on the saved Kukatpally capture, with no model.
describe("The Reddys' plan", () => {
  const reddys = demoHouseholds["the-reddys"];
  const profile = {
    ...reddys.profile,
    members: reddys.profile.members.map((m, idx) => ({
      ...m,
      id: `m${idx + 1}`,
      nickname: undefined,
    })),
  };

  async function plan() {
    const res = await createApp({ gemini: null }).request("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile,
        lat: reddys.location.lat,
        lng: reddys.location.lng,
        lang: "en",
      }),
    });
    expect(res.status).toBe(200);
    return PlanResponseSchema.parse(await res.json());
  }

  it("tells the demo story: move the walk, bedroom purifier, a cleaner commute", async () => {
    const ids = (await plan()).swaps.map((s) => s.id);
    expect(ids).toContain("shift-outdoor-exercise");
    expect(ids).toContain("purifier-bedroom");
    expect(ids.some((id) => ["metro-not-car", "bus-not-car", "carpool"].includes(id))).toBe(true);
    expect(ids.length).toBeLessThanOrEqual(6);
  });

  it("gives every computed swap a number and every protect swap the people it helps", async () => {
    for (const swap of (await plan()).swaps) {
      if (swap.kind === "computed" && swap.id !== "mask-outdoors") {
        expect(swap.savingNumber, swap.id).toBeGreaterThan(0);
      }
      if (swap.lens === "protect" && swap.kind === "computed") {
        expect(swap.appliesToMemberIds?.length, swap.id).toBeGreaterThan(0);
      }
      expect(swap.reason.length).toBeGreaterThan(0);
      expect(swap.reasonSource).toBe("template");
    }
  });

  it("reports each person's dose with exactly the swaps chosen, from the shared day model", async () => {
    const body = await plan();
    const active = new Set(body.swaps.map((s) => s.id));
    const expected = computeHouseholdDayComparison({
      profile,
      hourlyForecast: kukatpallyDemoAir.hourlyForecast,
      currentPm25: kukatpallyDemoAir.pm25,
      swapsActive: {
        shiftOutdoorExercise: active.has("shift-outdoor-exercise"),
        exerciseIndoors: active.has("exercise-indoors"),
        purifierBedroom: active.has("purifier-bedroom"),
        shutWindowsPeak: active.has("shut-windows-peak"),
        airHouseCleanWindow: active.has("air-house-clean-window"),
        maskOutdoors: active.has("mask-outdoors"),
      },
    }).memberComparisons;

    expect(body.memberDoses).toHaveLength(4);
    expect(body.memberDoses).toEqual(expected);
    expect(body.currentAqi).toBe(kukatpallyDemoAir.currentAqi);
    expect(body.isDemo).toBe(true);
    expect(body.capturedAt).toBe(kukatpallyDemoAir.capturedAt);
  });
});
