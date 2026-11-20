// data.ts: Live air data fetching and computed Reddy family examples for the home page.
// Strictly computes all numbers from src/shared/impact.ts, src/shared/day.ts and src/shared/factors.ts.

import { computeDayModelSwapImpact } from "../../shared/day.js";
import { communityTotal } from "../../shared/impact.js";
import type { HouseholdProfile } from "../../shared/schemas.js";

export interface AreaAirItem {
  name: string;
  lat: number;
  lng: number;
  aqi?: number;
  aqiBand: string;
  pm25: number;
  dominantPollutant: string;
  isDemo?: boolean;
  capturedAt?: string;
}

// Reddy family profile definition matching docs/SPEC.md section 13
export const reddysHousehold: HouseholdProfile = {
  members: [
    {
      id: "m-father",
      nickname: "Father",
      ageBand: "31-40",
      sensitivity: "none",
      routinePreset: "office_worker",
      outdoorExerciseMinutes: 0,
    },
    {
      id: "m-mother",
      nickname: "Mother",
      ageBand: "31-40",
      sensitivity: "none",
      routinePreset: "work_from_home",
      outdoorExerciseMinutes: 0,
    },
    {
      id: "m-son",
      nickname: "Son (9)",
      ageBand: "6-10",
      sensitivity: "asthma_copd",
      routinePreset: "school_child",
      outdoorExerciseMinutes: 30,
      outdoorExerciseTime: "17:00",
    },
    {
      id: "m-grandmother",
      nickname: "Grandmother (68)",
      ageBand: "61-70",
      sensitivity: "none",
      routinePreset: "retired",
      outdoorExerciseMinutes: 45,
      outdoorExerciseTime: "06:00",
    },
  ],
  commute: {
    mode: "petrol_car",
    distanceKm: 12,
    tripsPerDay: 2,
    peopleSharing: 1,
    workingDaysPerWeek: 5,
  },
  home: {
    bedroomAreaSqFt: 144, // 12x12 ft
    ceilingHeightFt: 10,
    windowHabit: "open_day_shut_night",
    hasPurifier: false,
    cookingMethod: "gas",
    usesIncense: true,
    usesMosquitoCoils: true,
    smokerInHouse: false,
  },
};

export async function fetchAreasAir(): Promise<AreaAirItem[]> {
  try {
    const res = await fetch("/api/air/areas");
    if (res.ok) {
      return (await res.json()) as AreaAirItem[];
    }
  } catch (e) {
    console.error("Failed to fetch areas air data", e);
  }
  // No invented readings: with no data the hero shows its loading line and the marquee is empty.
  return [];
}

export interface ReddysExamples {
  protectDoseCut: number;
  purifierCadrCfm: number;
  polluteLessWeeklyCo2: number;
  communityHomes: number;
  communityTotalWeeklyKg: number;
}

export function computeReddysExamples(
  hourlyForecast: readonly { time: string; pm25: number }[],
  currentPm25: number,
): ReddysExamples {
  // 1. Protect lens example: bedroom purifier dose cut percentage and its minimum size
  const purifierImpact = computeDayModelSwapImpact(
    "purifier-bedroom",
    reddysHousehold,
    hourlyForecast,
    currentPm25,
  );

  // 2. Pollute less lens example: metro instead of car, CO2 saved per week
  const metroImpact = computeDayModelSwapImpact(
    "metro-not-car",
    reddysHousehold,
    hourlyForecast,
    currentPm25,
  );
  const polluteLessWeeklyCo2 = Math.round(metroImpact.co2SavedKgPerWeek ?? 0);

  // 3. Community example: Green Meadows, 120 homes, weekly total
  const communityHomes = 120;
  const communityResult = communityTotal(polluteLessWeeklyCo2, communityHomes);

  return {
    protectDoseCut: Math.round(purifierImpact.maxDoseCutPercentage ?? 0),
    purifierCadrCfm: Math.round(purifierImpact.purifierCadrCfm ?? 0),
    polluteLessWeeklyCo2,
    communityHomes,
    communityTotalWeeklyKg: Math.round(communityResult.totalWeeklySaving),
  };
}
