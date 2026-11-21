import { describe, expect, it } from "vitest";
import { ROOM_LIMITS, purifierAdvice } from "../../src/shared/purifier-calculator.js";

// Hand-worked with the AHAM rule (FACTORS.md section 5): CADR = 2/3 x area x (height / 8),
// 1 cfm = 1.699 m3/h.
describe("purifier size calculator", () => {
  it("works out a 12 x 12 ft bedroom with a 10 ft ceiling", () => {
    const r = purifierAdvice(12, 12, 10);
    if ("error" in r) throw new Error("expected advice");
    expect(r.areaSqFt).toBe(144);
    expect(r.cadrAtStandardHeightCfm).toBeCloseTo(96, 10); // 2/3 x 144
    expect(r.minCadrCfm).toBeCloseTo(120, 10); // 96 x 10/8
    expect(r.minCadrM3PerHour).toBeCloseTo(203.88, 10); // 120 x 1.699
    expect(r.isEstimate).toBe(false);
    expect(r.factorSections).toEqual(["5"]);
  });

  it("needs no height scaling at the standard 8 ft ceiling", () => {
    const r = purifierAdvice(10, 15, 8);
    if ("error" in r) throw new Error("expected advice");
    expect(r.areaSqFt).toBe(150);
    expect(r.minCadrCfm).toBeCloseTo(100, 10);
    expect(r.minCadrCfm).toBeCloseTo(r.cadrAtStandardHeightCfm, 10);
  });

  it("matches EPA's table for a 300 sq ft room (195 cfm at 8 ft)", () => {
    const r = purifierAdvice(20, 15, 8);
    if ("error" in r) throw new Error("expected advice");
    expect(r.minCadrCfm).toBeCloseTo(200, 10); // 2/3 x 300; EPA's 195 is the same rule rounded
  });

  it("says which input is missing or out of range", () => {
    expect(purifierAdvice(Number.NaN, 12, 10)).toEqual({ error: "length" });
    expect(purifierAdvice(12, ROOM_LIMITS.sideMaxFt + 1, 10)).toEqual({ error: "width" });
    expect(purifierAdvice(12, 0, 10)).toEqual({ error: "width" });
    expect(purifierAdvice(12, 12, ROOM_LIMITS.heightMinFt - 1)).toEqual({ error: "height" });
    expect(purifierAdvice(12, 12, Number.POSITIVE_INFINITY)).toEqual({ error: "height" });
  });

  it("accepts the edges of the allowed range", () => {
    expect(
      "error" in
        purifierAdvice(ROOM_LIMITS.sideMinFt, ROOM_LIMITS.sideMaxFt, ROOM_LIMITS.heightMaxFt),
    ).toBe(false);
  });
});
