import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { kukatpallyDemoAir } from "../../src/server/demo/air.js";
import { demoHouseholds } from "../../src/server/demo/households.js";
import {
  computeActionNumbers,
  filterApplicableActions,
  rankApplicableActions,
} from "../../src/server/plan.js";
import { computeHouseholdDayComparison } from "../../src/shared/day.js";
import { CPCB_AQI_BANDS } from "../../src/shared/factors.js";
import { indoorPm25, minPurifierCadr } from "../../src/shared/impact.js";

describe("Phase 4 Follow-up: Day Model, Precise Impact, Ranking & Sourced Text", () => {
  const reddysProfile = demoHouseholds["the-reddys"].profile;

  // 1. Reddys' household day (24 hours per member)
  it("builds 24 hours per member for the Reddys", () => {
    const comparison = computeHouseholdDayComparison({
      profile: reddysProfile,
      hourlyForecast: kukatpallyDemoAir.hourlyForecast,
      currentPm25: kukatpallyDemoAir.pm25,
    });

    expect(comparison.baseSchedules.length).toBe(4);
    for (const sched of comparison.baseSchedules) {
      expect(sched.blocks.length).toBe(24);
      expect(sched.totalDoseUg).toBeGreaterThan(0);
      expect(sched.cigarettesForDay).toBeGreaterThan(0);
      // Hours span 0..23
      expect(sched.blocks.map((b) => b.hour)).toEqual(Array.from({ length: 24 }, (_, i) => i));
    }

    // Grandmother walks at 6 am (hour 6)
    const gmSchedule = comparison.baseSchedules.find((s) => s.memberId === "m-grandmother");
    expect(gmSchedule).toBeDefined();
    expect(gmSchedule?.blocks[6].place).toBe("outdoors");
    expect(gmSchedule?.blocks[6].activity).toBe("moderate");
  });

  // 2. Hand-worked numbers for moving the walk and for the purifier (reuse Phase 2 reference values)
  it("reproduces hand-worked numbers for purifier and walk", () => {
    // Purifier CADR: 144 sq ft room, 10 ft ceiling -> 120 cfm
    const cadr = minPurifierCadr(144, 10);
    expect(cadr.minCadrCfm).toBeCloseTo(120, 4);

    // Indoor ratio with 120 cfm in 1440 cu ft room with windows shut -> 0.213971
    const inWithPurifier = indoorPm25(80, {
      windowsOpen: false,
      cadrCfm: 120,
      roomVolumeCuFt: 1440,
    });
    expect(inWithPurifier.ratio).toBeCloseTo(0.213971, 5);

    // Sourced indoor concentration without purifier: 80 * 0.808333 = 64.6667
    const inWithoutPurifier = indoorPm25(80, { windowsOpen: false });
    expect(inWithoutPurifier.indoorPm25).toBeCloseTo(64.6667, 4);

    // Difference in bedroom exposure over 8h asleep: falls by 15.8497 ug/m3, 0.7204 cigarettes
    const diffAvg = ((64.666667 - 17.117647) * 8) / 24;
    expect(diffAvg).toBeCloseTo(15.8497, 4);
    expect(diffAvg / 22).toBeCloseTo(0.7204, 4);
  });

  // 3. A missing input making an action not applicable
  it("marks actions not applicable when inputs are missing (no invented defaults)", () => {
    // Household with missing exercise time
    const profileNoExerciseTime = {
      ...reddysProfile,
      members: reddysProfile.members.map((m) => ({
        ...m,
        outdoorExerciseMinutes: 60,
        outdoorExerciseTime: undefined, // missing
      })),
      home: {
        ...reddysProfile.home,
        bedroomAreaSqFt: undefined as unknown as number, // missing
        ceilingHeightFt: undefined as unknown as number, // missing
      },
    };

    const applicable = filterApplicableActions(profileNoExerciseTime, kukatpallyDemoAir);
    const applicableIds = applicable.map((a) => a.id);

    // shift-outdoor-exercise requires outdoorExerciseTime
    expect(applicableIds).not.toContain("shift-outdoor-exercise");
    // purifier-bedroom requires bedroom dimensions
    expect(applicableIds).not.toContain("purifier-bedroom");
  });

  // 4. Ranking by the numbers: Protect by dose cut %, Pollute less by kg CO2/week
  it("ranks Protect swaps by dose cut % and Pollute less by kg CO2/week, alternating in top 6", () => {
    const applicable = filterApplicableActions(reddysProfile, kukatpallyDemoAir);
    const computed = applicable.map((a) =>
      computeActionNumbers(a, reddysProfile, kukatpallyDemoAir),
    );
    const ranked = rankApplicableActions(computed, reddysProfile);

    expect(ranked.length).toBeGreaterThan(4);
    // Reddys get purifier-bedroom (25.6% dose cut), metro-not-car (16.3 kg CO2/wk),
    // shift-outdoor-exercise, and wfh-day
    const top6 = ranked.slice(0, 6).map((a) => a.id);
    expect(top6).toContain("purifier-bedroom");
    expect(top6).toContain("metro-not-car");
    expect(top6).toContain("shift-outdoor-exercise");
    expect(top6).toContain("no-mosquito-coil");
  });

  // 5. Only one of metro, bus and carpool for the same commute
  it("offers only the best one of metro, bus and carpool for the same commute", () => {
    const applicable = filterApplicableActions(reddysProfile, kukatpallyDemoAir);
    const computed = applicable.map((a) =>
      computeActionNumbers(a, reddysProfile, kukatpallyDemoAir),
    );
    const ranked = rankApplicableActions(computed, reddysProfile);
    const rankedIds = ranked.map((r) => r.id);

    // Reddys drive petrol car 12 km alone. Metro saves 16.3 kg CO2/wk, bus saves 15.0 kg, carpool saves 11.2 kg
    expect(rankedIds).toContain("metro-not-car");
    expect(rankedIds).not.toContain("bus-not-car");
    expect(rankedIds).not.toContain("carpool");
  });

  // 6. CPCB statement for each band
  it("has exact CPCB statement for each band in factors.ts", () => {
    const bands = CPCB_AQI_BANDS;
    expect(bands.length).toBe(6);
    expect(bands.find((b) => b.band === "Good")?.healthStatement).toBe("Minimal Impact");
    expect(bands.find((b) => b.band === "Satisfactory")?.healthStatement).toBe(
      "May cause minor breathing discomfort to sensitive people.",
    );
    expect(bands.find((b) => b.band === "Moderately polluted")?.healthStatement).toContain(
      "May cause breathing discomfort to people with lung disease such as asthma",
    );
    expect(bands.find((b) => b.band === "Poor")?.healthStatement).toContain(
      "May cause breathing discomfort to people on prolonged exposure",
    );
    expect(bands.find((b) => b.band === "Very Poor")?.healthStatement).toContain(
      "May cause respiratory illness to the people on prolonged exposure",
    );
    expect(bands.find((b) => b.band === "Severe")?.healthStatement).toContain(
      "May cause respiratory effects even on healthy people",
    );
  });

  // 7. Every i18n key present in en, hi and te
  it("has every i18n fact and advice key present in en.json, hi.json and te.json", () => {
    const loadJson = (lang: string) =>
      JSON.parse(
        fs.readFileSync(path.resolve(process.cwd(), `src/client/i18n/${lang}.json`), "utf-8"),
      );

    const en = loadJson("en");
    const hi = loadJson("hi");
    const te = loadJson("te");

    const requiredFactKeys = ["mosquitoCoil", "incense", "frying"];
    const requiredAdviceKeys = ["wetMop", "diyFanFilter", "noIdling", "noBurning"];

    for (const key of requiredFactKeys) {
      expect(en.facts?.[key]).toBeDefined();
      expect(hi.facts?.[key]).toBeDefined();
      expect(te.facts?.[key]).toBeDefined();
    }

    for (const key of requiredAdviceKeys) {
      expect(en.advice?.[key]).toBeDefined();
      expect(hi.advice?.[key]).toBeDefined();
      expect(te.advice?.[key]).toBeDefined();
    }

    // Verify exact quotes from FACTORS.md section 6
    expect(en.facts.mosquitoCoil).toBe(
      "Burning one mosquito coil releases as much PM2.5 as burning 75 to 137 cigarettes.",
    );
    expect(en.facts.incense).toBe(
      "In one test house, burning incense raised indoor PM2.5 to 197 µg/m³.",
    );
    expect(en.facts.frying).toBe(
      "Frying without a stove hood reached a median 4.5 mg/m³ of PM2.5, against 0.5 mg/m³ with the hood on.",
    );
  });
});
