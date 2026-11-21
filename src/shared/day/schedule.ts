// schedule.ts: One member's 24 hourly exposure blocks under a set of active swaps.
import { type ActivityLevel, CIGARETTE_EQUIVALENT_PM25, MASK_PROTECTION } from "../factors.js";
import {
  cigarettesForDay,
  dailyAverageExposure,
  dailyDose,
  indoorPm25,
  inhalationRate,
  minPurifierCadr,
} from "../impact.js";
import { buildMemberBaselineRoutine, overlayExerciseOnBlocks } from "../presets.js";
import type { HouseholdProfile, MemberProfile } from "../schemas.js";
import { getIndoorPm25ForHour } from "./hourly.js";
import type {
  DayHourBlock,
  DayModelSwapsActive,
  HourlyForecastLookup,
  MemberDaySchedule,
} from "./types.js";

type Window = { startHour: number; endHour: number } | null;
type RoutineBlock = ReturnType<typeof buildMemberBaselineRoutine>[number];

const inWindow = (h: number, w: Window) => Boolean(w && h >= w.startHour && h < w.endHour);

// Mask inward leakage is 7% - 66%, so protection is 34% - 93%; the schedule uses the midpoint,
// (34% + 93%) / 2 = 63.5% (FACTORS.md section 7).
const MASK_MIDPOINT_PROTECTION =
  (MASK_PROTECTION.activeReductionMin + MASK_PROTECTION.activeReductionMax) / 2;

/** The member's routine after the exercise swaps: shifted to the cleanest window, or indoors. */
function routineWithSwaps(
  member: MemberProfile,
  cleanestWindow: Window,
  swapsActive: DayModelSwapsActive,
): RoutineBlock[] {
  let routineBlocks = buildMemberBaselineRoutine(member);
  const exercisesOutdoors = (member.outdoorExerciseMinutes ?? 0) > 0;

  // shift-outdoor-exercise: move outdoor exercise to the cleanest window
  if (
    swapsActive.shiftOutdoorExercise &&
    cleanestWindow &&
    exercisesOutdoors &&
    member.outdoorExerciseTime
  ) {
    const isHighIntensity =
      member.routinePreset === "school_child" ||
      (member.nickname?.toLowerCase().includes("run") ?? false);
    const activity: ActivityLevel = isHighIntensity ? "high" : "moderate";
    // First remove outdoor exercise from the original time (home, sedentary), then place it.
    const origHour = Number.parseInt(member.outdoorExerciseTime.split(":")[0], 10);
    routineBlocks = overlayExerciseOnBlocks(routineBlocks, origHour, "sedentary", "Home", "home");
    routineBlocks = overlayExerciseOnBlocks(
      routineBlocks,
      cleanestWindow.startHour,
      activity,
      "Outdoor exercise (shifted)",
      "outdoors",
    );
  }

  // exercise-indoors: outdoor exercise blocks move home
  if (swapsActive.exerciseIndoors && exercisesOutdoors) {
    routineBlocks = routineBlocks.map((b) => {
      if (b.place === "outdoors" && (b.activity === "high" || b.activity === "moderate")) {
        return { ...b, place: "home" };
      }
      return b;
    });
  }
  return routineBlocks;
}

/** Bedroom volume and the purifier CADR: the one entered, else the AHAM minimum for the room. */
function bedroomOf(profile: HouseholdProfile) {
  const area = profile.home.bedroomAreaSqFt;
  const height = profile.home.ceilingHeightFt;
  return {
    bedroomVolumeCuFt: area && height ? area * height : undefined,
    cadrCfm:
      profile.home.purifierCadrCfm ??
      (area && height ? minPurifierCadr(area, height).minCadrCfm : undefined),
  };
}

interface HourContext {
  profile: HouseholdProfile;
  swapsActive: DayModelSwapsActive;
  cleanestWindow: Window;
  dirtiestWindow: Window;
  cadrCfm: number | undefined;
  bedroomVolumeCuFt: number | undefined;
}

interface HourAir {
  pm25: number;
  isEstimate: boolean;
  factorSections: readonly string[];
}

/** PM2.5 at home this hour: purifier at night, windows shut at peak, or aired when cleanest. */
function homeHourAir(h: number, activity: string, outdoorPm25: number, ctx: HourContext): HourAir {
  const { swapsActive } = ctx;
  const indoor = getIndoorPm25ForHour(h, outdoorPm25, ctx.profile.home.windowHabit, {
    purifierOnInBedroom: Boolean(
      swapsActive.purifierBedroom && activity === "sleep" && ctx.cadrCfm && ctx.bedroomVolumeCuFt,
    ),
    cadrCfm: ctx.cadrCfm,
    roomVolumeCuFt: ctx.bedroomVolumeCuFt,
    forceShutWindows: Boolean(swapsActive.shutWindowsPeak) && inWindow(h, ctx.dirtiestWindow),
    isCleanestWindowOpen:
      Boolean(swapsActive.airHouseCleanWindow) && inWindow(h, ctx.cleanestWindow),
  });
  return {
    pm25: indoor.indoorPm25,
    isEstimate: indoor.isEstimate,
    factorSections: indoor.factorSections,
  };
}

/** PM2.5 the member breathes this hour, by place. */
function hourAir(h: number, block: RoutineBlock, outdoorPm25: number, ctx: HourContext): HourAir {
  if (block.place === "home") return homeHourAir(h, block.activity, outdoorPm25, ctx);
  if (block.place === "office_school") {
    // Indoors elsewhere: standard closed office or school windows (ratio ~0.808)
    const indoor = indoorPm25(outdoorPm25, { windowsOpen: false });
    return {
      pm25: indoor.indoorPm25,
      isEstimate: indoor.isEstimate,
      factorSections: indoor.factorSections,
    };
  }
  const outside = block.place === "traffic" || block.place === "outdoors";
  if (outside && ctx.swapsActive.maskOutdoors) {
    return {
      pm25: outdoorPm25 * (1 - MASK_MIDPOINT_PROTECTION),
      isEstimate: false,
      factorSections: ["7"],
    };
  }
  return { pm25: outdoorPm25, isEstimate: false, factorSections: [] };
}

/**
 * Builds the 24 hourly exposure blocks for a single member under a given set of active swaps.
 */
export function computeMemberDaySchedule(
  member: MemberProfile,
  profile: HouseholdProfile,
  getOutdoorPm25: HourlyForecastLookup,
  cleanestWindow: Window,
  dirtiestWindow: Window,
  swapsActive: DayModelSwapsActive = {},
  memberRef = "m1",
): MemberDaySchedule {
  const routineBlocks = routineWithSwaps(member, cleanestWindow, swapsActive);
  const ctx: HourContext = {
    profile,
    swapsActive,
    cleanestWindow,
    dirtiestWindow,
    ...bedroomOf(profile),
  };

  const blocks: DayHourBlock[] = Array.from({ length: 24 }, (_, h) => {
    const block: RoutineBlock = routineBlocks.find((b) => h >= b.startHour && h < b.endHour) ?? {
      startHour: h,
      endHour: h + 1,
      place: "home",
      activity: "sedentary",
    };
    const inRate = inhalationRate(member.ageBand, block.activity);
    const air = hourAir(h, block, getOutdoorPm25(h), ctx);
    return {
      hour: h,
      place: block.place,
      activity: block.activity,
      pm25: air.pm25,
      inhalationRateM3PerHour: inRate.rateM3PerHour,
      isEstimate: inRate.isEstimate || air.isEstimate,
      factorSections: Array.from(new Set([...inRate.factorSections, ...air.factorSections])),
    };
  });
  const factorSectionsSet = new Set<string>(["2", "3", ...blocks.flatMap((b) => b.factorSections)]);
  const scheduleIsEstimate = blocks.some((b) => b.isEstimate);
  // Calculate day's dose and 24h average exposure
  const doseInputs = blocks.map((b) => ({
    concentrationUgM3: b.pm25,
    durationHours: 1,
    ageBand: member.ageBand,
    activity: b.activity,
  }));
  const doseResult = dailyDose(doseInputs);

  const avgExposureInputs = blocks.map((b) => ({
    concentrationUgM3: b.pm25,
    durationHours: 1,
  }));
  const avgResult = dailyAverageExposure(avgExposureInputs);

  // Cigarettes for day = 24-hour average exposure / CIGARETTE_EQUIVALENT_PM25 (FACTORS.md section 3)
  const cigarettesResult = cigarettesForDay(avgExposureInputs);
  const cigarettes =
    cigarettesResult.cigarettes !== null
      ? cigarettesResult.cigarettes
      : avgResult.averageConcentrationUgM3 / CIGARETTE_EQUIVALENT_PM25;

  return {
    memberId: member.id,
    memberRef,
    nickname: member.nickname ?? memberRef,
    ageBand: member.ageBand,
    blocks,
    totalDoseUg: doseResult.doseUg,
    avgPm25: avgResult.averageConcentrationUgM3,
    cigarettesForDay: cigarettes,
    isEstimate: scheduleIsEstimate || doseResult.isEstimate || avgResult.isEstimate,
    factorSections: Array.from(factorSectionsSet),
  };
}
