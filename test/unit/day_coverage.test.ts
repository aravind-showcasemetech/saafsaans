import { describe, expect, it } from "vitest";
import { kukatpallyDemoAir } from "../../src/server/demo/air.js";
import { demoHouseholds } from "../../src/server/demo/households.js";
import {
  computeDayModelSwapImpact,
  computeHouseholdDayComparison,
  createHourlyForecastLookup,
  getIndoorPm25ForHour,
} from "../../src/shared/day.js";
import type { HouseholdProfile, MemberProfile } from "../../src/shared/schemas.js";

describe("src/shared/day.ts comprehensive coverage", () => {
  const reddys = demoHouseholds["the-reddys"].profile;

  it("covers hourly forecast lookup fallback and all routine presets", () => {
    // Empty forecast fallback
    const fallbackLookup = createHourlyForecastLookup([], 75);
    expect(fallbackLookup(5)).toBe(75);

    // Test each routine preset: work_from_home, outdoor_worker, school_child, office_worker, retired
    const presets: MemberProfile["routinePreset"][] = [
      "work_from_home",
      "outdoor_worker",
      "school_child",
      "office_worker",
      "retired",
    ];

    const testMembers: MemberProfile[] = presets.map((preset) => ({
      id: `m-${preset}`,
      nickname: preset,
      ageBand: "31-40",
      sensitivity: "none",
      routinePreset: preset,
      outdoorExerciseMinutes: 30,
      outdoorExerciseTime: "07:00",
    }));

    const profile: HouseholdProfile = {
      ...reddys,
      members: testMembers,
    };

    const comp = computeHouseholdDayComparison({
      profile,
      hourlyForecast: kukatpallyDemoAir.hourlyForecast,
      currentPm25: kukatpallyDemoAir.pm25,
      swapsActive: {
        shiftOutdoorExercise: true,
        exerciseIndoors: true,
        purifierBedroom: true,
        shutWindowsPeak: true,
        airHouseCleanWindow: true,
        maskOutdoors: true,
      },
    });

    expect(comp.baseSchedules.length).toBe(presets.length);
    expect(comp.withSwapsSchedules.length).toBe(presets.length);
  });

  it("covers custom routine blocks", () => {
    const customMember: MemberProfile = {
      id: "m-custom",
      nickname: "Custom User",
      ageBand: "16-30",
      sensitivity: "none",
      routinePreset: "office_worker",
      outdoorExerciseMinutes: 0,
      customRoutine: [
        { startHour: 0, endHour: 8, place: "home", activity: "sleep", label: "Sleep" },
        { startHour: 8, endHour: 18, place: "outdoors", activity: "moderate", label: "Field" },
        { startHour: 18, endHour: 24, place: "home", activity: "sedentary", label: "Evening" },
      ],
    };

    const profile: HouseholdProfile = {
      ...reddys,
      members: [customMember],
    };

    const comp = computeHouseholdDayComparison({
      profile,
      hourlyForecast: kukatpallyDemoAir.hourlyForecast,
      currentPm25: kukatpallyDemoAir.pm25,
    });

    expect(comp.baseSchedules[0].blocks[4].activity).toBe("sleep");
    expect(comp.baseSchedules[0].blocks[10].place).toBe("outdoors");
  });

  it("covers getIndoorPm25ForHour under open_day_shut_night and mostly_open", () => {
    const dayShutRes = getIndoorPm25ForHour(12, 100, "open_day_shut_night", {});
    const nightShutRes = getIndoorPm25ForHour(2, 100, "open_day_shut_night", {});
    const openRes = getIndoorPm25ForHour(12, 100, "mostly_open", {});

    expect(dayShutRes.indoorPm25).toBeGreaterThan(nightShutRes.indoorPm25);
    expect(openRes.indoorPm25).toBeGreaterThan(nightShutRes.indoorPm25);
  });

  it("covers all swaps in computeDayModelSwapImpact including edge cases", () => {
    const allSwaps = [
      "shift-outdoor-exercise",
      "exercise-indoors",
      "purifier-bedroom",
      "shut-windows-peak",
      "air-house-clean-window",
      "mask-outdoors",
      "no-mosquito-coil",
      "incense-outside",
      "cook-with-exhaust",
      "diy-fan-filter",
      "wet-mop",
      "metro-not-car",
      "bus-not-car",
      "carpool",
      "walk-short-trips",
      "wfh-day",
      "no-idling",
      "no-burning",
      "unknown-swap",
    ];

    // Profile with various attributes
    const testProfile: HouseholdProfile = {
      members: [
        {
          id: "m-worker",
          nickname: "Outdoor Worker",
          ageBand: "41-60",
          sensitivity: "asthma_copd",
          routinePreset: "outdoor_worker",
          outdoorExerciseMinutes: 45,
          outdoorExerciseTime: "06:00",
        },
        {
          id: "m-office",
          nickname: "Office Worker",
          ageBand: "31-40",
          sensitivity: "none",
          routinePreset: "office_worker",
          outdoorExerciseMinutes: 0,
        },
      ],
      commute: {
        mode: "scooter",
        distanceKm: 1.5, // <= 2 km for walk-short-trips
        tripsPerDay: 2,
        peopleSharing: 1,
        workingDaysPerWeek: 5,
      },
      home: {
        bedroomAreaSqFt: 120,
        ceilingHeightFt: 9,
        windowHabit: "open_day_shut_night",
        hasPurifier: false,
        cookingMethod: "lots_of_frying",
        usesIncense: true,
        usesMosquitoCoils: true,
        smokerInHouse: false,
      },
    };

    for (const swapId of allSwaps) {
      const res = computeDayModelSwapImpact(
        swapId,
        testProfile,
        kukatpallyDemoAir.hourlyForecast,
        kukatpallyDemoAir.pm25,
      );
      expect(res).toBeDefined();
    }

    // Inapplicable carpool and walk-short-trips (> 2km) and car carpool
    const carProfile: HouseholdProfile = {
      ...testProfile,
      commute: {
        mode: "petrol_car",
        distanceKm: 15,
        tripsPerDay: 2,
        peopleSharing: 1,
        workingDaysPerWeek: 5,
      },
    };
    const carpoolRes = computeDayModelSwapImpact(
      "carpool",
      carProfile,
      kukatpallyDemoAir.hourlyForecast,
      60,
    );
    expect(carpoolRes.applicable).toBe(true);
    const walkRes = computeDayModelSwapImpact(
      "walk-short-trips",
      carProfile,
      kukatpallyDemoAir.hourlyForecast,
      60,
    );
    expect(walkRes.applicable).toBe(false);

    // Purifier true -> diy-fan-filter false
    const purifierProfile: HouseholdProfile = {
      ...testProfile,
      home: { ...testProfile.home, hasPurifier: true },
    };
    const diyRes = computeDayModelSwapImpact(
      "diy-fan-filter",
      purifierProfile,
      kukatpallyDemoAir.hourlyForecast,
      60,
    );
    expect(diyRes.applicable).toBe(false);

    // No coil, no incense, gas cooking
    const cleanHomeProfile: HouseholdProfile = {
      ...testProfile,
      home: {
        ...testProfile.home,
        usesMosquitoCoils: false,
        usesIncense: false,
        cookingMethod: "induction",
      },
    };
    expect(
      computeDayModelSwapImpact(
        "no-mosquito-coil",
        cleanHomeProfile,
        kukatpallyDemoAir.hourlyForecast,
        60,
      ).applicable,
    ).toBe(false);
    expect(
      computeDayModelSwapImpact(
        "incense-outside",
        cleanHomeProfile,
        kukatpallyDemoAir.hourlyForecast,
        60,
      ).applicable,
    ).toBe(false);
    expect(
      computeDayModelSwapImpact(
        "cook-with-exhaust",
        cleanHomeProfile,
        kukatpallyDemoAir.hourlyForecast,
        60,
      ).applicable,
    ).toBe(false);

    // Empty hourly forecast
    expect(
      computeDayModelSwapImpact("shift-outdoor-exercise", testProfile, [], 60).applicable,
    ).toBe(false);
    expect(computeDayModelSwapImpact("shut-windows-peak", testProfile, [], 60).applicable).toBe(
      false,
    );
    expect(
      computeDayModelSwapImpact("air-house-clean-window", testProfile, [], 60).applicable,
    ).toBe(false);
  });
});
