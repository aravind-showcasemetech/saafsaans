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

/**
 * Builds the 24 hourly exposure blocks for a single member under a given set of active swaps.
 */
export function computeMemberDaySchedule(
  member: MemberProfile,
  profile: HouseholdProfile,
  getOutdoorPm25: HourlyForecastLookup,
  cleanestWindow: { startHour: number; endHour: number } | null,
  dirtiestWindow: { startHour: number; endHour: number } | null,
  swapsActive: DayModelSwapsActive = {},
  memberRef = "m1",
): MemberDaySchedule {
  let routineBlocks = buildMemberBaselineRoutine(member);

  // 1. Swap: shift-outdoor-exercise -> move outdoor exercise to the cleanest window
  if (
    swapsActive.shiftOutdoorExercise &&
    cleanestWindow &&
    member.outdoorExerciseMinutes &&
    member.outdoorExerciseMinutes > 0 &&
    member.outdoorExerciseTime
  ) {
    const isHighIntensity =
      member.routinePreset === "school_child" ||
      (member.nickname?.toLowerCase().includes("run") ?? false);
    const activity: ActivityLevel = isHighIntensity ? "high" : "moderate";

    // First remove outdoor exercise from original exercise time (set to home sedentary)
    const [hhStr] = member.outdoorExerciseTime.split(":");
    const origHour = Number.parseInt(hhStr, 10);
    routineBlocks = overlayExerciseOnBlocks(routineBlocks, origHour, "sedentary", "Home", "home");
    // Place exercise at cleanestWindow.startHour
    routineBlocks = overlayExerciseOnBlocks(
      routineBlocks,
      cleanestWindow.startHour,
      activity,
      "Outdoor exercise (shifted)",
      "outdoors",
    );
  }

  // 2. Swap: exercise-indoors -> change outdoor exercise block to home sedentary/moderate
  if (
    swapsActive.exerciseIndoors &&
    member.outdoorExerciseMinutes &&
    member.outdoorExerciseMinutes > 0
  ) {
    routineBlocks = routineBlocks.map((b) => {
      if (b.place === "outdoors" && (b.activity === "high" || b.activity === "moderate")) {
        return { ...b, place: "home" };
      }
      return b;
    });
  }

  // Bedroom purifier sizing / CADR
  const bedroomArea = profile.home.bedroomAreaSqFt;
  const ceilingHeight = profile.home.ceilingHeightFt;
  let bedroomVolumeCuFt: number | undefined;
  if (bedroomArea && ceilingHeight) {
    bedroomVolumeCuFt = bedroomArea * ceilingHeight;
  }
  const cadrCfm =
    profile.home.purifierCadrCfm ??
    (bedroomArea && ceilingHeight
      ? minPurifierCadr(bedroomArea, ceilingHeight).minCadrCfm
      : undefined);

  // Expand into 24 hourly blocks
  const blocks: DayHourBlock[] = [];
  const factorSectionsSet = new Set<string>(["2", "3"]);
  let scheduleIsEstimate = false;

  for (let h = 0; h < 24; h++) {
    const match = routineBlocks.find((b) => h >= b.startHour && h < b.endHour) ?? {
      startHour: h,
      endHour: h + 1,
      place: "home" as const,
      activity: "sedentary" as const,
    };

    const outdoorPm25 = getOutdoorPm25(h);
    const inRate = inhalationRate(member.ageBand, match.activity);
    if (inRate.isEstimate) scheduleIsEstimate = true;
    for (const sec of inRate.factorSections) factorSectionsSet.add(sec);

    let hourPm25 = outdoorPm25;
    let blockIsEstimate = inRate.isEstimate;
    const blockFactorSections = [...inRate.factorSections];

    if (match.place === "home") {
      // Purifier on in bedroom at night:
      // Active if purifierBedroom is true AND this is a sleep hour
      const purifierOnInBedroom = Boolean(
        swapsActive.purifierBedroom && match.activity === "sleep" && cadrCfm && bedroomVolumeCuFt,
      );

      // Windows shut in dirtiest hours:
      const forceShutWindows = Boolean(
        swapsActive.shutWindowsPeak &&
          dirtiestWindow &&
          h >= dirtiestWindow.startHour &&
          h < dirtiestWindow.endHour,
      );

      // Air house clean window:
      const isCleanestWindowOpen = Boolean(
        swapsActive.airHouseCleanWindow &&
          cleanestWindow &&
          h >= cleanestWindow.startHour &&
          h < cleanestWindow.endHour,
      );

      const indoor = getIndoorPm25ForHour(h, outdoorPm25, profile.home.windowHabit, {
        purifierOnInBedroom,
        cadrCfm,
        roomVolumeCuFt: bedroomVolumeCuFt,
        forceShutWindows,
        isCleanestWindowOpen,
      });

      hourPm25 = indoor.indoorPm25;
      if (indoor.isEstimate) blockIsEstimate = true;
      for (const sec of indoor.factorSections) {
        factorSectionsSet.add(sec);
        blockFactorSections.push(sec);
      }
    } else if (match.place === "office_school") {
      // Indoors elsewhere: model with standard closed office/school windows (ratio ~0.808)
      const indoor = indoorPm25(outdoorPm25, { windowsOpen: false });
      hourPm25 = indoor.indoorPm25;
      if (indoor.isEstimate) blockIsEstimate = true;
      for (const sec of indoor.factorSections) {
        factorSectionsSet.add(sec);
        blockFactorSections.push(sec);
      }
    } else if (match.place === "traffic" || match.place === "outdoors") {
      // Outdoor concentration
      hourPm25 = outdoorPm25;

      // Mask outdoors swap:
      // If maskOutdoors is active and member commutes or works outdoors or exercises outdoors
      if (swapsActive.maskOutdoors) {
        // Active reduction average or midpoint for schedule:
        // Mask inward leakage is 7% - 66%, so protection is 34% - 93%.
        // Average protection = (34% + 93%) / 2 = 63.5%
        const maskAvgProtection =
          (MASK_PROTECTION.activeReductionMin + MASK_PROTECTION.activeReductionMax) / 2;
        hourPm25 = outdoorPm25 * (1 - maskAvgProtection);
        factorSectionsSet.add("7");
        blockFactorSections.push("7");
      }
    }

    if (blockIsEstimate) scheduleIsEstimate = true;

    blocks.push({
      hour: h,
      place: match.place,
      activity: match.activity,
      pm25: hourPm25,
      inhalationRateM3PerHour: inRate.rateM3PerHour,
      isEstimate: blockIsEstimate,
      factorSections: Array.from(new Set(blockFactorSections)),
    });
  }

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
