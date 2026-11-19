import { describe, expect, it } from "vitest";
import { ACTIONS, ACTIONS_BY_ID } from "../../src/shared/actions";
import {
  CPCB_AQI_BANDS,
  INHALATION_RATES_M3_PER_MIN,
  TRANSPORT_CO2_FACTORS,
} from "../../src/shared/factors";
import {
  CommuteProfileSchema,
  HomeProfileSchema,
  HouseholdProfileSchema,
  MemberProfileSchema,
  PlanOutputSchema,
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

  it("validates plan output schema", () => {
    const mockPlan = {
      currentAqi: 150,
      aqiBand: "Moderately polluted",
      cpcbHealthStatement: "May cause breathing discomfort...",
      cleanestWindow: {
        startHour: 14,
        endHour: 17,
        averagePm25: 45,
      },
      dirtiestWindow: {
        startHour: 7,
        endHour: 10,
        averagePm25: 110,
      },
      swaps: [
        {
          actionId: "metro-not-car",
          lens: "polluteLess",
          kind: "computed",
          title: "Take metro",
          explanation: "Saves 4.3 kg CO2",
          isEstimate: true,
          factorSections: ["9"],
          savingNumber: 4.35,
          savingUnit: "kg CO2",
        },
      ],
      memberDoses: [
        {
          memberId: "m1",
          name: "Grandmother",
          baseDoseUg: 93.6,
          withSwapsDoseUg: 46.8,
          doseCutPercentage: 50,
          baseAvgExposureUgM3: 65,
          withSwapsAvgExposureUgM3: 50,
          cigarettesAvoided: 0.68,
          isEstimate: true,
          factorSections: ["2", "3"],
        },
      ],
      householdEmissions: {
        co2SavedKgPerDay: 4.35,
        co2SavedKgPerWeek: 21.73,
        co2SavedKgPerWinter: 369.38,
        vehicleKmAvoidedPerDay: 32,
        isEstimate: true,
        factorSections: ["9"],
      },
      communitySummary: {
        homesParticipating: 10,
        weeklyCo2SavedKg: 217.3,
      },
    };

    const parsed = PlanOutputSchema.safeParse(mockPlan);
    expect(parsed.success).toBe(true);
  });
});
