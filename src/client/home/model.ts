// model.ts: Every number the home page shows, computed from src/shared with the demo data
// (the Reddys and Green Meadows from /api/demo/households, the saved Kukatpally forecast).
// Nothing is typed in; there are no new formulas here.
import type { NormalisedAirData } from "../../shared/air-types.js";
import {
  calculateDoseCutPercentage,
  computeDayModelSwapImpact,
  computeHouseholdDayComparison,
  computeMemberDaySchedule,
  createHourlyForecastLookup,
} from "../../shared/day.js";
import {
  type WindowResult,
  cleanestAndDirtiestWindows,
  communityTotal,
  commuteCo2Saved,
  indoorRatio,
  minPurifierCadr,
  vehicleKmAvoided,
} from "../../shared/impact.js";
import type { HouseholdProfile } from "../../shared/schemas.js";
import type { DemoHouseholdItem } from "../app/api.js";
import type { RoomShares } from "../ui/diagrams/room.js";

const KOLKATA_OFFSET_MS = 5.5 * 3600 * 1000;

export interface HomeModel {
  air: NormalisedAirData;
  cleanest: WindowResult | null;
  dirtiest: WindowResult | null;
  reddys: DemoHouseholdItem;
  walk: {
    role: string;
    hourlyPm25: number[];
    hourlyAqi: (number | undefined)[];
    beforeHour: number;
    afterHour: number;
    doseBeforeUg: number;
    doseAfterUg: number;
    cutPercent: number;
  } | null;
  room: RoomShares;
  bedroom: { lengthFt: number; widthFt: number; heightFt: number };
  trip: {
    carKgPerDay: number;
    metroKgPerDay: number;
    kmAvoidedPerDay: number;
    savedKgPerDay: number;
    savedKgPerWeek: number;
    savedKgPerWinter: number;
    isEstimate: boolean;
  };
  community: { homes: number; weeklyKgPerHome: number; weeklyKgTotal: number } | null;
}

function windowHours(w: WindowResult | null) {
  return w ? { startHour: w.startHour, endHour: w.endHour } : null;
}

function walkShift(
  profile: HouseholdProfile,
  roles: Record<string, string>,
  air: NormalisedAirData,
  cleanest: WindowResult | null,
  dirtiest: WindowResult | null,
): HomeModel["walk"] {
  const idx = profile.members.findIndex(
    (m) => (m.outdoorExerciseMinutes ?? 0) > 0 && m.outdoorExerciseTime,
  );
  if (idx < 0 || !cleanest) return null;
  const member = profile.members[idx];
  const lookup = createHourlyForecastLookup(air.hourlyForecast, air.pm25);
  const schedule = (shift: boolean) =>
    computeMemberDaySchedule(
      member,
      profile,
      lookup,
      windowHours(cleanest),
      windowHours(dirtiest),
      { shiftOutdoorExercise: shift },
      `m${idx + 1}`,
    );
  const before = schedule(false);
  const after = schedule(true);
  const aqiByHour: (number | undefined)[] = Array(24).fill(undefined);
  for (const h of air.hourlyForecast) {
    const hour = new Date(new Date(h.time).getTime() + KOLKATA_OFFSET_MS).getUTCHours();
    if (aqiByHour[hour] === undefined) aqiByHour[hour] = h.aqi;
  }
  return {
    role: roles[member.id] ?? "adult",
    hourlyPm25: Array.from({ length: 24 }, (_, h) => lookup(h)),
    hourlyAqi: aqiByHour,
    beforeHour: Number.parseInt(member.outdoorExerciseTime ?? "6", 10),
    afterHour: cleanest.startHour,
    doseBeforeUg: before.totalDoseUg,
    doseAfterUg: after.totalDoseUg,
    cutPercent: calculateDoseCutPercentage(before.totalDoseUg, after.totalDoseUg),
  };
}

export function buildHomeModel(
  air: NormalisedAirData,
  households: DemoHouseholdItem[],
): HomeModel | null {
  const reddys = households.find((h) => h.id === "the-reddys");
  if (!reddys) return null;
  const { profile } = reddys;
  const { cleanest, dirtiest } = cleanestAndDirtiestWindows(air.hourlyForecast);

  const area = profile.home.bedroomAreaSqFt;
  const height = profile.home.ceilingHeightFt;
  const side = Math.sqrt(area);
  const cadrCfm = minPurifierCadr(area, height).minCadrCfm;
  const room: RoomShares = {
    windowsOpen: indoorRatio({ windowsOpen: true }).ratio,
    windowsShut: indoorRatio({ windowsOpen: false }).ratio,
    shutWithPurifier: indoorRatio({ windowsOpen: false, cadrCfm, roomVolumeCuFt: area * height })
      .ratio,
  };

  const c = profile.commute;
  const trip = {
    oldMode: c.mode,
    distanceKm: c.distanceKm,
    tripsPerDay: c.tripsPerDay,
    peopleSharingOld: c.peopleSharing,
    workingDaysPerWeek: c.workingDaysPerWeek,
  };
  // A walked trip avoids the whole car trip, so its saving is the car's own CO2.
  const car = commuteCo2Saved({ ...trip, newMode: "walk_cycle" });
  const metro = commuteCo2Saved({ ...trip, newMode: "metro" });

  const meadows = households.find((h) => h.id === "green-meadows");
  let community: HomeModel["community"] = null;
  if (meadows?.homes) {
    const weekly =
      computeDayModelSwapImpact("carpool", meadows.profile, air.hourlyForecast, air.pm25)
        .co2SavedKgPerWeek ?? 0;
    community = {
      homes: meadows.homes,
      weeklyKgPerHome: weekly,
      weeklyKgTotal: communityTotal(weekly, meadows.homes).totalWeeklySaving,
    };
  }

  return {
    air,
    cleanest,
    dirtiest,
    reddys,
    walk: walkShift(profile, reddys.roles, air, cleanest, dirtiest),
    room,
    bedroom: { lengthFt: side, widthFt: side, heightFt: height },
    trip: {
      carKgPerDay: car.kgCo2SavedPerDay,
      metroKgPerDay: car.kgCo2SavedPerDay - metro.kgCo2SavedPerDay,
      kmAvoidedPerDay: vehicleKmAvoided(c.distanceKm, c.tripsPerDay, c.workingDaysPerWeek)
        .vehicleKmAvoidedPerDay,
      savedKgPerDay: metro.kgCo2SavedPerDay,
      savedKgPerWeek: metro.kgCo2SavedPerWeek,
      savedKgPerWinter: metro.kgCo2SavedPerWinter,
      isEstimate: metro.isEstimateDay,
    },
    community,
  };
}

/** The Reddys' per-person day with and without the bedroom purifier, for the impact section. */
export function reddysTotals(model: HomeModel, swapOn: boolean) {
  return computeHouseholdDayComparison({
    profile: model.reddys.profile,
    hourlyForecast: model.air.hourlyForecast,
    currentPm25: model.air.pm25,
    swapsActive: { purifierBedroom: swapOn },
  }).memberComparisons;
}
