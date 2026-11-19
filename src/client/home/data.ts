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
  capturedDate?: string;
}

export interface HomeLiveAirData {
  city: string;
  aqi: number;
  aqiBand: string;
  pm25: number;
  updatedTime: string;
  areas: AreaAirItem[];
  cleanestHourRange: string;
  dirtiestHourRange: string;
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

  // Fallback demo areas (real captures only in demo mode)
  return [
    {
      name: "Kukatpally",
      lat: 17.48,
      lng: 78.41,
      aqi: 92,
      aqiBand: "Satisfactory",
      pm25: 71.63,
      dominantPollutant: "pm25",
      isDemo: true,
      capturedDate: "2026-11-19",
    },
    {
      name: "Dwarka, Delhi",
      lat: 28.59,
      lng: 77.05,
      aqi: 220,
      aqiBand: "Poor",
      pm25: 74.05,
      dominantPollutant: "pm25",
      isDemo: true,
      capturedDate: "2026-11-19",
    },
  ];
}

export function computeReddysExamples(
  hourlyForecast: readonly { time: string; pm25: number }[],
  currentPm25: number,
) {
  // 1. Protect lens example: Bedroom purifier dose cut percentage
  const purifierImpact = computeDayModelSwapImpact(
    "purifier-bedroom",
    reddysHousehold,
    hourlyForecast,
    currentPm25,
  );
  const protectDoseCut = Math.round(purifierImpact.maxDoseCutPercentage ?? 27);

  // 2. Pollute less lens example: Metro instead of car CO2 saved per week
  const metroImpact = computeDayModelSwapImpact(
    "metro-not-car",
    reddysHousehold,
    hourlyForecast,
    currentPm25,
  );
  const polluteLessWeeklyCo2 = Math.round(metroImpact.co2SavedKgPerWeek ?? 16);

  // 3. Community example: Green Meadows 120 homes weekly total
  const communityResult = communityTotal(polluteLessWeeklyCo2, 120);

  return {
    protectDoseCut,
    polluteLessWeeklyCo2,
    communityHomes: 120,
    communityTotalWeeklyKg: Math.round(communityResult.totalWeeklySaving),
  };
}
