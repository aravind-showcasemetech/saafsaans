import { describe, expect, it } from "vitest";
import { ACTIONS, ACTIONS_BY_ID } from "../../src/shared/actions";
import { escapeHtml } from "../../src/shared/escape";
import {
  CPCB_AQI_BANDS,
  INHALATION_RATES_M3_PER_MIN,
  TRANSPORT_CO2_FACTORS,
} from "../../src/shared/factors";
import { PlanResponseSchema } from "../../src/shared/plan-schema";
import {
  CommuteProfileSchema,
  HouseholdProfileSchema,
  MemberProfileSchema,
} from "../../src/shared/schemas";

describe("src/shared/factors", () => {
  it("defines CPCB bands with correct status and properties", () => {
    expect(CPCB_AQI_BANDS.length).toBe(6);
    expect(CPCB_AQI_BANDS[0].band).toBe("Good");
    expect(CPCB_AQI_BANDS[5].band).toBe("Severe");
  });

  it("defines all inhalation rate age bands with section 2", () => {
    const bands = [
      "under-6",
      "6-10",
      "11-15",
      "16-30",
      "31-40",
      "41-60",
      "61-70",
      "71-plus",
    ] as const;
    for (const b of bands) {
      expect(INHALATION_RATES_M3_PER_MIN[b]).toBeDefined();
      expect(INHALATION_RATES_M3_PER_MIN[b].section).toBe("2");
      expect(INHALATION_RATES_M3_PER_MIN[b].ratesPerMinute.sedentary).toBeGreaterThan(0);
    }
  });

  it("defines transport factors with section 9", () => {
    expect(TRANSPORT_CO2_FACTORS.petrol_car.kgCo2PerKm).toBe(0.14);
    expect(TRANSPORT_CO2_FACTORS.bus.kgCo2PerKm).toBe(0.015161);
  });
});

describe("src/shared/actions", () => {
  it("contains exactly 18 actions from SPEC section 8", () => {
    expect(ACTIONS.length).toBe(18);
  });

  it("indexes all actions by ID", () => {
    expect(Object.keys(ACTIONS_BY_ID).length).toBe(18);
    expect(ACTIONS_BY_ID["metro-not-car"]).toBeDefined();
    expect(ACTIONS_BY_ID["shift-outdoor-exercise"].lens).toBe("protect");
    expect(ACTIONS_BY_ID["metro-not-car"].lens).toBe("polluteLess");
  });

  it("validates kinds of all 18 actions", () => {
    const kinds = new Set(ACTIONS.map((a) => a.kind));
    expect(kinds.has("computed")).toBe(true);
    expect(kinds.has("sourcedFact")).toBe(true);
    expect(kinds.has("adviceOnly")).toBe(true);
  });
});

describe("src/shared/schemas", () => {
  it("validates a complete household profile", () => {
    const raw = {
      members: [
        {
          id: "m1",
          nickname: "Grandmother",
          ageBand: "61-70",
          sensitivity: "asthma_copd",
          routinePreset: "retired",
          outdoorExerciseMinutes: 45,
          outdoorExerciseTime: "06:00",
        },
      ],
      commute: {
        mode: "petrol_car",
        distanceKm: 32,
        tripsPerDay: 2,
        workingDaysPerWeek: 5,
      },
      home: {
        bedroomAreaSqFt: 144,
        ceilingHeightFt: 10,
        windowHabit: "mostly_shut",
        hasPurifier: true,
        purifierCadrCfm: 120,
      },
    };

    const parsed = HouseholdProfileSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
  });

  it("fails on invalid ageBand or negative distance", () => {
    const badMember = {
      id: "m1",
      ageBand: "invalid-band",
      routinePreset: "retired",
    };
    expect(MemberProfileSchema.safeParse(badMember).success).toBe(false);

    const badCommute = {
      distanceKm: -10,
    };
    expect(CommuteProfileSchema.safeParse(badCommute).success).toBe(false);
  });

  it("escapes HTML in nicknames and user inputs (XSS safety)", () => {
    const maliciousNickname = "<img src=x onerror=alert(1)>";
    const escaped = escapeHtml(maliciousNickname);
    expect(escaped).toBe("&lt;img src=x onerror=alert(1)&gt;");
    expect(escaped).not.toContain("<");
    expect(escaped).not.toContain(">");
  });

  it("validates PlanResponseSchema correctly", () => {
    const validPlan = {
      source: "demo",
      summary: "Plan summary",
      currentAqi: 92,
      aqiBand: "Satisfactory",
      cpcbHealthStatement: "Minor discomfort",
      googleHealthAdvice: {},
      memberDoses: [],
      swaps: [
        {
          id: "mask-outdoors",
          lens: "protect",
          kind: "computed",
          title: "Wear an N95 mask outdoors",
          savingRange: { min: 34, max: 93, unit: "%" },
          isEstimate: false,
          factorSections: ["7"],
          reason: "Wear a mask",
          reasonSource: "template",
        },
      ],
    };
    const parsed = PlanResponseSchema.safeParse(validPlan);
    expect(parsed.success).toBe(true);
  });
});
