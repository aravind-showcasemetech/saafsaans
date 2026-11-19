import { describe, expect, it } from "vitest";
import { kukatpallyDemoAir } from "../../src/server/demo/air.js";
import { demoHouseholds } from "../../src/server/demo/households.js";
import {
  computeActionNumbers,
  filterApplicableActions,
  rankApplicableActions,
} from "../../src/server/plan.js";
import { cleanestAndDirtiestWindows } from "../../src/shared/impact.js";

describe("Plan Action Filtering and Ranking", () => {
  it("deterministic ranker gives the Reddys shift-outdoor-exercise, purifier-bedroom, no-mosquito-coil and metro-not-car", () => {
    const reddys = demoHouseholds["the-reddys"].profile;
    const applicable = filterApplicableActions(reddys, kukatpallyDemoAir);
    const applicableIds = applicable.map((a) => a.id);

    expect(applicableIds).toContain("shift-outdoor-exercise");
    expect(applicableIds).toContain("purifier-bedroom");
    expect(applicableIds).toContain("no-mosquito-coil");
    expect(applicableIds).toContain("metro-not-car");

    const computed = applicable.map((a) => computeActionNumbers(a, reddys, kukatpallyDemoAir));
    const ranked = rankApplicableActions(computed, reddys);
    const top6Ids = ranked.slice(0, 6).map((a) => a.id);

    expect(top6Ids).toContain("shift-outdoor-exercise");
    expect(top6Ids).toContain("purifier-bedroom");
    expect(top6Ids).toContain("no-mosquito-coil");
    expect(top6Ids).toContain("metro-not-car");
  });
});
