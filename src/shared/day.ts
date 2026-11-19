// day.ts: Household 24-hour day model for SaafSaans.
// Shared between server and client so the browser can recompute when swaps are toggled.
// Follows docs/SPEC.md section 5, docs/FACTORS.md sections 2, 3, 4, 7, 8, and AGENTS.md rule 1.

import {
  type ActivityLevel,
  type AgeBand,
  CIGARETTE_EQUIVALENT_PM25,
  MASK_PROTECTION,
  METRO_SAVING_FRACTION,
  TRANSPORT_CO2_FACTORS,
  type TravelMode,
  WINDOWS_OPEN_DAY_END_HOUR,
  WINDOWS_OPEN_DAY_START_HOUR,
} from "./factors.js";
import {
  type CleanestAndDirtiestWindowsResult,
  cigarettesEquivalent,
  cigarettesForDay,
  cleanestAndDirtiestWindows,
  dailyAverageExposure,
  dailyDose,
  indoorPm25,
  inhalationRate,
} from "./impact.js";
import { buildMemberBaselineRoutine, overlayExerciseOnBlocks } from "./presets.js";
import type { HouseholdProfile, MemberProfile, RoutineBlock, WindowHabit } from "./schemas.js";

export { buildMemberBaselineRoutine, overlayExerciseOnBlocks };

/**
 * Computes percentage dose cut, avoiding division by zero and returning a non-negative number.
 */
export function calculateDoseCutPercentage(baseDoseUg: number, withSwapsDoseUg: number): number {
  if (baseDoseUg <= 0) return 0;
  return Math.max(0, ((baseDoseUg - withSwapsDoseUg) / baseDoseUg) * 100);
}

export type HourlyForecastLookup = (hour: number) => number;

export interface DayHourBlock {
  hour: number; // 0..23
  place: "home" | "office_school" | "traffic" | "outdoors";
  activity: ActivityLevel;
  pm25: number;
  inhalationRateM3PerHour: number;
  isEstimate: boolean;
  factorSections: string[];
}

export interface MemberDaySchedule {
  memberId: string;
  memberRef: string; // m1, m2...
  nickname: string;
  ageBand: AgeBand;
  blocks: DayHourBlock[]; // 24 hourly blocks (0..23)
  totalDoseUg: number;
  avgPm25: number;
  cigarettesForDay: number;
  isEstimate: boolean;
  factorSections: string[];
}

export interface DayModelSwapsActive {
  shiftOutdoorExercise?: boolean;
  exerciseIndoors?: boolean;
  purifierBedroom?: boolean;
  shutWindowsPeak?: boolean;
  airHouseCleanWindow?: boolean;
  maskOutdoors?: boolean; // applied to commute / outdoor work
}

export interface HouseholdDayModelOptions {
  profile: HouseholdProfile;
  hourlyForecast: readonly { time: string; pm25: number }[];
  currentPm25: number;
  swapsActive?: DayModelSwapsActive;
}

export interface MemberDayComparison {
  memberId: string;
  memberRef: string;
  nickname: string;
  baseDoseUg: number;
  withSwapsDoseUg: number;
  doseCutPercentage: number;
  baseAvgExposureUgM3: number;
  withSwapsAvgExposureUgM3: number;
  baseCigarettes: number;
  withSwapsCigarettes: number;
  cigarettesAvoided: number;
  isEstimate: boolean;
  factorSections: string[];
}

export interface SwapMemberImpact {
  memberId: string;
  memberRef: string;
  nickname: string;
  doseCutPercentage: number;
  cigarettesAvoided: number;
  doseSavedUg: number;
  isEstimate: boolean;
  factorSections: string[];
}

export interface SwapImpactResult {
  swapId: string;
  applicable: boolean;
  lens: "protect" | "polluteLess";
  kind: "computed" | "sourcedFact" | "adviceOnly";
  isEstimate: boolean;
  factorSections: string[];
  // For protect swaps:
  memberImpacts?: SwapMemberImpact[];
  maxDoseCutPercentage?: number;
  maxCigarettesAvoided?: number;
  // For mask-outdoors range:
  maskRange?: {
    minPercent: number;
    maxPercent: number;
    unit: string;
  };
  // Sourced fact text or advice:
  factTextKey?: string;
  // Purifier extra info:
  purifierCadrCfm?: number;
  purifierCadrUnit?: string;
  // For pollute-less swaps:
  co2SavedKgPerDay?: number;
  co2SavedKgPerWeek?: number;
  vehicleKmAvoidedPerDay?: number;
}

/**
 * Creates a function to look up outdoor PM2.5 for any local hour 0..23
 * based on hourly forecast (Asia/Kolkata local time).
 */
export function createHourlyForecastLookup(
  hourlyForecast: readonly { time: string; pm25: number }[],
  fallbackPm25: number,
): HourlyForecastLookup {
  const KOLKATA_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const hourMap = new Map<number, number[]>();

  for (const item of hourlyForecast) {
    const epoch = new Date(item.time).getTime();
    if (!Number.isNaN(epoch)) {
      const kolkataDate = new Date(epoch + KOLKATA_OFFSET_MS);
      const h = kolkataDate.getUTCHours();
      const list = hourMap.get(h) ?? [];
      list.push(Math.max(0, item.pm25));
      hourMap.set(h, list);
    }
  }

  return (hour: number): number => {
    const list = hourMap.get(hour);
    if (list && list.length > 0) {
      return list[0]; // First day / closest forecast hour for that local hour
    }
    return Math.max(0, fallbackPm25);
  };
}

/**
 * Computes indoor PM2.5 for a specific hour based on window habit and purifier state.
 * Daytime hours (open_day_shut_night): WINDOWS_OPEN_DAY_START_HOUR to WINDOWS_OPEN_DAY_END_HOUR local time.
 */
export function getIndoorPm25ForHour(
  hour: number,
  outdoorPm25: number,
  windowHabit: WindowHabit,
  options: {
    purifierOnInBedroom?: boolean;
    cadrCfm?: number;
    roomVolumeCuFt?: number;
    forceShutWindows?: boolean;
    isCleanestWindowOpen?: boolean;
  },
): { indoorPm25: number; isEstimate: boolean; factorSections: string[] } {
  let windowsOpen = false;

  if (options.forceShutWindows) {
    windowsOpen = false;
  } else if (options.isCleanestWindowOpen) {
    windowsOpen = true;
  } else if (windowHabit === "mostly_open") {
    windowsOpen = true;
  } else if (windowHabit === "mostly_shut") {
    windowsOpen = false;
  } else if (windowHabit === "open_day_shut_night") {
    windowsOpen = hour >= WINDOWS_OPEN_DAY_START_HOUR && hour < WINDOWS_OPEN_DAY_END_HOUR;
  }

  const cadrCfm = options.purifierOnInBedroom ? options.cadrCfm : undefined;
  const roomVolumeCuFt = options.purifierOnInBedroom ? options.roomVolumeCuFt : undefined;

  const result = indoorPm25(outdoorPm25, {
    windowsOpen,
    cadrCfm,
    roomVolumeCuFt,
  });

  return {
    indoorPm25: result.indoorPm25,
    isEstimate: result.isEstimate,
    factorSections: result.factorSections,
  };
}

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
    (bedroomArea && ceilingHeight ? (2 / 3) * bedroomArea * (ceilingHeight / 8) : undefined);

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

/**
 * Runs the full household day model comparing baseline to with-swaps state.
 */
export function computeHouseholdDayComparison(options: HouseholdDayModelOptions): {
  baseSchedules: MemberDaySchedule[];
  withSwapsSchedules: MemberDaySchedule[];
  memberComparisons: MemberDayComparison[];
} {
  const { profile, hourlyForecast, currentPm25, swapsActive = {} } = options;
  const getOutdoorPm25 = createHourlyForecastLookup(hourlyForecast, currentPm25);

  const windows = cleanestAndDirtiestWindows(hourlyForecast);
  const cleanest = windows.cleanest
    ? { startHour: windows.cleanest.startHour, endHour: windows.cleanest.endHour }
    : null;
  const dirtiest = windows.dirtiest
    ? { startHour: windows.dirtiest.startHour, endHour: windows.dirtiest.endHour }
    : null;

  const baseSchedules: MemberDaySchedule[] = [];
  const withSwapsSchedules: MemberDaySchedule[] = [];
  const memberComparisons: MemberDayComparison[] = [];

  profile.members.forEach((member, idx) => {
    const memberRef = `m${idx + 1}`;
    const base = computeMemberDaySchedule(
      member,
      profile,
      getOutdoorPm25,
      cleanest,
      dirtiest,
      {},
      memberRef,
    );
    const withSwaps = computeMemberDaySchedule(
      member,
      profile,
      getOutdoorPm25,
      cleanest,
      dirtiest,
      swapsActive,
      memberRef,
    );

    baseSchedules.push(base);
    withSwapsSchedules.push(withSwaps);

    const doseCutPercentage = calculateDoseCutPercentage(base.totalDoseUg, withSwaps.totalDoseUg);

    const cigarettesAvoided = Math.max(0, base.cigarettesForDay - withSwaps.cigarettesForDay);

    const allFactorSections = Array.from(
      new Set([...base.factorSections, ...withSwaps.factorSections]),
    );

    memberComparisons.push({
      memberId: member.id,
      memberRef,
      nickname: member.nickname ?? memberRef,
      baseDoseUg: base.totalDoseUg,
      withSwapsDoseUg: withSwaps.totalDoseUg,
      doseCutPercentage,
      baseAvgExposureUgM3: base.avgPm25,
      withSwapsAvgExposureUgM3: withSwaps.avgPm25,
      baseCigarettes: base.cigarettesForDay,
      withSwapsCigarettes: withSwaps.cigarettesForDay,
      cigarettesAvoided,
      isEstimate: base.isEstimate || withSwaps.isEstimate,
      factorSections: allFactorSections,
    });
  });

  return {
    baseSchedules,
    withSwapsSchedules,
    memberComparisons,
  };
}

/**
 * Computes individual impact for each swap according to the day model and FACTORS.md rules:
 * - shift-outdoor-exercise: compare exercise time with cleanest window
 * - purifier-bedroom: headline numbers are dose cut and cigarettes for people sleeping there; cadr is second line
 * - shut-windows-peak: windows shut in dirtiest hours
 * - mask-outdoors: applies to members commuting or working outdoors for their real time outside, shows range 34%-93%
 */
export function computeDayModelSwapImpact(
  swapId: string,
  profile: HouseholdProfile,
  hourlyForecast: readonly { time: string; pm25: number }[],
  currentPm25: number,
): SwapImpactResult {
  const getOutdoorPm25 = createHourlyForecastLookup(hourlyForecast, currentPm25);
  const windows = cleanestAndDirtiestWindows(hourlyForecast);
  const cleanest = windows.cleanest
    ? { startHour: windows.cleanest.startHour, endHour: windows.cleanest.endHour }
    : null;
  const dirtiest = windows.dirtiest
    ? { startHour: windows.dirtiest.startHour, endHour: windows.dirtiest.endHour }
    : null;

  // Protect swaps
  switch (swapId) {
    case "shift-outdoor-exercise": {
      // Must have someone who exercises outdoors, outdoorExerciseTime, and a cleanest window
      const exercisers = profile.members.filter(
        (m) => (m.outdoorExerciseMinutes ?? 0) > 0 && m.outdoorExerciseTime,
      );
      if (exercisers.length === 0 || !cleanest) {
        return {
          swapId,
          applicable: false,
          lens: "protect",
          kind: "computed",
          isEstimate: false,
          factorSections: ["2", "8"],
        };
      }

      const memberImpacts: SwapMemberImpact[] = [];
      let isEstimate = false;
      const factorSections = new Set<string>(["2", "3", "8"]);

      for (let idx = 0; idx < profile.members.length; idx++) {
        const m = profile.members[idx];
        const memberRef = `m${idx + 1}`;
        if ((m.outdoorExerciseMinutes ?? 0) > 0 && m.outdoorExerciseTime) {
          const base = computeMemberDaySchedule(
            m,
            profile,
            getOutdoorPm25,
            cleanest,
            dirtiest,
            {},
            memberRef,
          );
          const withSwap = computeMemberDaySchedule(
            m,
            profile,
            getOutdoorPm25,
            cleanest,
            dirtiest,
            { shiftOutdoorExercise: true },
            memberRef,
          );

          const doseCut = calculateDoseCutPercentage(base.totalDoseUg, withSwap.totalDoseUg);
          const cigsAvoided = Math.max(0, base.cigarettesForDay - withSwap.cigarettesForDay);
          const doseSaved = Math.max(0, base.totalDoseUg - withSwap.totalDoseUg);

          if (base.isEstimate || withSwap.isEstimate) isEstimate = true;
          for (const s of [...base.factorSections, ...withSwap.factorSections])
            factorSections.add(s);

          memberImpacts.push({
            memberId: m.id,
            memberRef,
            nickname: m.nickname ?? memberRef,
            doseCutPercentage: Math.max(0, doseCut),
            cigarettesAvoided: cigsAvoided,
            doseSavedUg: doseSaved,
            isEstimate: base.isEstimate || withSwap.isEstimate,
            factorSections: Array.from(
              new Set([...base.factorSections, ...withSwap.factorSections]),
            ),
          });
        }
      }

      const maxDoseCut = Math.max(0, ...memberImpacts.map((m) => m.doseCutPercentage));
      const maxCigs = Math.max(0, ...memberImpacts.map((m) => m.cigarettesAvoided));

      return {
        swapId,
        applicable: true,
        lens: "protect",
        kind: "computed",
        isEstimate,
        factorSections: Array.from(factorSections),
        memberImpacts,
        maxDoseCutPercentage: maxDoseCut,
        maxCigarettesAvoided: maxCigs,
      };
    }

    case "exercise-indoors": {
      const exercisers = profile.members.filter((m) => (m.outdoorExerciseMinutes ?? 0) > 0);
      if (exercisers.length === 0) {
        return {
          swapId,
          applicable: false,
          lens: "protect",
          kind: "computed",
          isEstimate: true,
          factorSections: ["2", "4"],
        };
      }

      const memberImpacts: SwapMemberImpact[] = [];
      const isEstimate = true;
      const factorSections = new Set<string>(["2", "3", "4"]);

      profile.members.forEach((m, idx) => {
        const memberRef = `m${idx + 1}`;
        if ((m.outdoorExerciseMinutes ?? 0) > 0) {
          const base = computeMemberDaySchedule(
            m,
            profile,
            getOutdoorPm25,
            cleanest,
            dirtiest,
            {},
            memberRef,
          );
          const withSwap = computeMemberDaySchedule(
            m,
            profile,
            getOutdoorPm25,
            cleanest,
            dirtiest,
            { exerciseIndoors: true },
            memberRef,
          );

          const doseCut = calculateDoseCutPercentage(base.totalDoseUg, withSwap.totalDoseUg);
          const cigsAvoided = Math.max(0, base.cigarettesForDay - withSwap.cigarettesForDay);
          const doseSaved = Math.max(0, base.totalDoseUg - withSwap.totalDoseUg);

          memberImpacts.push({
            memberId: m.id,
            memberRef,
            nickname: m.nickname ?? memberRef,
            doseCutPercentage: Math.max(0, doseCut),
            cigarettesAvoided: cigsAvoided,
            doseSavedUg: doseSaved,
            isEstimate: true,
            factorSections: Array.from(
              new Set([...base.factorSections, ...withSwap.factorSections]),
            ),
          });
        }
      });

      const maxDoseCut = Math.max(0, ...memberImpacts.map((m) => m.doseCutPercentage));
      const maxCigs = Math.max(0, ...memberImpacts.map((m) => m.cigarettesAvoided));

      return {
        swapId,
        applicable: true,
        lens: "protect",
        kind: "computed",
        isEstimate: true,
        factorSections: Array.from(factorSections),
        memberImpacts,
        maxDoseCutPercentage: maxDoseCut,
        maxCigarettesAvoided: maxCigs,
      };
    }

    case "purifier-bedroom": {
      // Must have bedroomAreaSqFt and ceilingHeightFt without guessing
      const area = profile.home.bedroomAreaSqFt;
      const height = profile.home.ceilingHeightFt;
      if (!area || !height || area <= 0 || height <= 0) {
        return {
          swapId,
          applicable: false,
          lens: "protect",
          kind: "computed",
          isEstimate: true,
          factorSections: ["2", "3", "4", "5"],
        };
      }

      // CADR cfm = 2/3 * area * (height / 8)
      const cadrCfm = profile.home.purifierCadrCfm ?? (2 / 3) * area * (height / 8);

      const memberImpacts: SwapMemberImpact[] = [];
      const isEstimate = true; // Uses indoor model (k=0.3 is CHOSEN)
      const factorSections = new Set<string>(["2", "3", "4", "5"]);

      profile.members.forEach((m, idx) => {
        const memberRef = `m${idx + 1}`;
        const base = computeMemberDaySchedule(
          m,
          profile,
          getOutdoorPm25,
          cleanest,
          dirtiest,
          {},
          memberRef,
        );
        const withSwap = computeMemberDaySchedule(
          m,
          profile,
          getOutdoorPm25,
          cleanest,
          dirtiest,
          { purifierBedroom: true },
          memberRef,
        );

        const doseCut = calculateDoseCutPercentage(base.totalDoseUg, withSwap.totalDoseUg);
        const cigsAvoided = Math.max(0, base.cigarettesForDay - withSwap.cigarettesForDay);
        const doseSaved = Math.max(0, base.totalDoseUg - withSwap.totalDoseUg);

        memberImpacts.push({
          memberId: m.id,
          memberRef,
          nickname: m.nickname ?? memberRef,
          doseCutPercentage: Math.max(0, doseCut),
          cigarettesAvoided: cigsAvoided,
          doseSavedUg: doseSaved,
          isEstimate: true,
          factorSections: Array.from(
            new Set([...base.factorSections, ...withSwap.factorSections, "5"]),
          ),
        });
      });

      const maxDoseCut = Math.max(0, ...memberImpacts.map((m) => m.doseCutPercentage));
      const maxCigs = Math.max(0, ...memberImpacts.map((m) => m.cigarettesAvoided));

      return {
        swapId,
        applicable: true,
        lens: "protect",
        kind: "computed",
        isEstimate: true,
        factorSections: Array.from(factorSections),
        memberImpacts,
        maxDoseCutPercentage: maxDoseCut,
        maxCigarettesAvoided: maxCigs,
        purifierCadrCfm: cadrCfm,
        purifierCadrUnit: "cfm minimum CADR",
      };
    }

    case "shut-windows-peak": {
      if (profile.home.windowHabit === "mostly_shut" || !dirtiest) {
        return {
          swapId,
          applicable: false,
          lens: "protect",
          kind: "computed",
          isEstimate: true,
          factorSections: ["4", "8"],
        };
      }

      const memberImpacts: SwapMemberImpact[] = [];
      const isEstimate = true; // indoor model isEstimate
      const factorSections = new Set<string>(["2", "3", "4", "8"]);

      profile.members.forEach((m, idx) => {
        const memberRef = `m${idx + 1}`;
        const base = computeMemberDaySchedule(
          m,
          profile,
          getOutdoorPm25,
          cleanest,
          dirtiest,
          {},
          memberRef,
        );
        const withSwap = computeMemberDaySchedule(
          m,
          profile,
          getOutdoorPm25,
          cleanest,
          dirtiest,
          { shutWindowsPeak: true },
          memberRef,
        );

        const doseCut = calculateDoseCutPercentage(base.totalDoseUg, withSwap.totalDoseUg);
        const cigsAvoided = Math.max(0, base.cigarettesForDay - withSwap.cigarettesForDay);
        const doseSaved = Math.max(0, base.totalDoseUg - withSwap.totalDoseUg);

        memberImpacts.push({
          memberId: m.id,
          memberRef,
          nickname: m.nickname ?? memberRef,
          doseCutPercentage: Math.max(0, doseCut),
          cigarettesAvoided: cigsAvoided,
          doseSavedUg: doseSaved,
          isEstimate: true,
          factorSections: Array.from(new Set([...base.factorSections, ...withSwap.factorSections])),
        });
      });

      const maxDoseCut = Math.max(0, ...memberImpacts.map((m) => m.doseCutPercentage));
      const maxCigs = Math.max(0, ...memberImpacts.map((m) => m.cigarettesAvoided));

      return {
        swapId,
        applicable: true,
        lens: "protect",
        kind: "computed",
        isEstimate: true,
        factorSections: Array.from(factorSections),
        memberImpacts,
        maxDoseCutPercentage: maxDoseCut,
        maxCigarettesAvoided: maxCigs,
      };
    }

    case "air-house-clean-window": {
      if (!cleanest) {
        return {
          swapId,
          applicable: false,
          lens: "protect",
          kind: "computed",
          isEstimate: false,
          factorSections: ["4", "8"],
        };
      }

      const memberImpacts: SwapMemberImpact[] = [];
      const isEstimate = true;
      const factorSections = new Set<string>(["2", "3", "4", "8"]);

      profile.members.forEach((m, idx) => {
        const memberRef = `m${idx + 1}`;
        const base = computeMemberDaySchedule(
          m,
          profile,
          getOutdoorPm25,
          cleanest,
          dirtiest,
          {},
          memberRef,
        );
        const withSwap = computeMemberDaySchedule(
          m,
          profile,
          getOutdoorPm25,
          cleanest,
          dirtiest,
          { airHouseCleanWindow: true },
          memberRef,
        );

        const doseCut = calculateDoseCutPercentage(base.totalDoseUg, withSwap.totalDoseUg);
        const cigsAvoided = Math.max(0, base.cigarettesForDay - withSwap.cigarettesForDay);
        const doseSaved = Math.max(0, base.totalDoseUg - withSwap.totalDoseUg);

        memberImpacts.push({
          memberId: m.id,
          memberRef,
          nickname: m.nickname ?? memberRef,
          doseCutPercentage: Math.max(0, doseCut),
          cigarettesAvoided: cigsAvoided,
          doseSavedUg: doseSaved,
          isEstimate: true,
          factorSections: Array.from(new Set([...base.factorSections, ...withSwap.factorSections])),
        });
      });

      const maxDoseCut = Math.max(0, ...memberImpacts.map((m) => m.doseCutPercentage));
      const maxCigs = Math.max(0, ...memberImpacts.map((m) => m.cigarettesAvoided));

      return {
        swapId,
        applicable: true,
        lens: "protect",
        kind: "computed",
        isEstimate: true,
        factorSections: Array.from(factorSections),
        memberImpacts,
        maxDoseCutPercentage: maxDoseCut,
        maxCigarettesAvoided: maxCigs,
      };
    }

    case "mask-outdoors": {
      // The mask applies to the member who commutes or works outdoors, for their real time outside, and shows a range.
      const isOutdoorCommute = ["scooter", "motorcycle", "auto", "walk_cycle"].includes(
        profile.commute.mode,
      );
      const outdoorCommuters = isOutdoorCommute
        ? profile.members.filter(
            (m) => m.routinePreset === "office_worker" || m.routinePreset === "school_child",
          )
        : [];
      const outdoorWorkers = profile.members.filter((m) => m.routinePreset === "outdoor_worker");

      const affectedSet = new Set<string>();
      for (const m of [...outdoorCommuters, ...outdoorWorkers]) {
        affectedSet.add(m.id);
      }

      if (affectedSet.size === 0) {
        return {
          swapId,
          applicable: false,
          lens: "protect",
          kind: "computed",
          isEstimate: false,
          factorSections: ["2", "7"],
        };
      }

      const memberImpacts: SwapMemberImpact[] = [];
      let isEstimate = false;
      const factorSections = new Set<string>(["2", "3", "7"]);

      profile.members.forEach((m, idx) => {
        const memberRef = `m${idx + 1}`;
        if (affectedSet.has(m.id)) {
          const base = computeMemberDaySchedule(
            m,
            profile,
            getOutdoorPm25,
            cleanest,
            dirtiest,
            {},
            memberRef,
          );
          const withSwap = computeMemberDaySchedule(
            m,
            profile,
            getOutdoorPm25,
            cleanest,
            dirtiest,
            { maskOutdoors: true },
            memberRef,
          );

          const doseCut = calculateDoseCutPercentage(base.totalDoseUg, withSwap.totalDoseUg);
          const cigsAvoided = Math.max(0, base.cigarettesForDay - withSwap.cigarettesForDay);
          const doseSaved = Math.max(0, base.totalDoseUg - withSwap.totalDoseUg);

          if (base.isEstimate || withSwap.isEstimate) isEstimate = true;

          memberImpacts.push({
            memberId: m.id,
            memberRef,
            nickname: m.nickname ?? memberRef,
            doseCutPercentage: Math.max(0, doseCut),
            cigarettesAvoided: cigsAvoided,
            doseSavedUg: doseSaved,
            isEstimate: base.isEstimate || withSwap.isEstimate,
            factorSections: Array.from(
              new Set([...base.factorSections, ...withSwap.factorSections, "7"]),
            ),
          });
        }
      });

      const maxDoseCut = Math.max(0, ...memberImpacts.map((m) => m.doseCutPercentage));
      const maxCigs = Math.max(0, ...memberImpacts.map((m) => m.cigarettesAvoided));

      return {
        swapId,
        applicable: true,
        lens: "protect",
        kind: "computed",
        isEstimate,
        factorSections: Array.from(factorSections),
        memberImpacts,
        maxDoseCutPercentage: maxDoseCut,
        maxCigarettesAvoided: maxCigs,
        maskRange: {
          minPercent: MASK_PROTECTION.activeReductionMin * 100, // 34%
          maxPercent: MASK_PROTECTION.activeReductionMax * 100, // 93%
          unit: "% dose reduction while active",
        },
      };
    }

    // Sourced facts and advice only
    case "no-mosquito-coil": {
      if (!profile.home.usesMosquitoCoils) {
        return {
          swapId,
          applicable: false,
          lens: "protect",
          kind: "sourcedFact",
          isEstimate: false,
          factorSections: ["6"],
        };
      }
      return {
        swapId,
        applicable: true,
        lens: "protect",
        kind: "sourcedFact",
        isEstimate: false,
        factorSections: ["6"],
        factTextKey: "facts.mosquitoCoil",
      };
    }

    case "incense-outside": {
      if (!profile.home.usesIncense) {
        return {
          swapId,
          applicable: false,
          lens: "protect",
          kind: "sourcedFact",
          isEstimate: false,
          factorSections: ["6"],
        };
      }
      return {
        swapId,
        applicable: true,
        lens: "protect",
        kind: "sourcedFact",
        isEstimate: false,
        factorSections: ["6"],
        factTextKey: "facts.incense",
      };
    }

    case "cook-with-exhaust": {
      if (profile.home.cookingMethod !== "gas" && profile.home.cookingMethod !== "lots_of_frying") {
        return {
          swapId,
          applicable: false,
          lens: "protect",
          kind: "sourcedFact",
          isEstimate: false,
          factorSections: ["6"],
        };
      }
      return {
        swapId,
        applicable: true,
        lens: "protect",
        kind: "sourcedFact",
        isEstimate: false,
        factorSections: ["6"],
        factTextKey: "facts.frying",
      };
    }

    case "diy-fan-filter": {
      if (profile.home.hasPurifier) {
        return {
          swapId,
          applicable: false,
          lens: "protect",
          kind: "adviceOnly",
          isEstimate: false,
          factorSections: [],
        };
      }
      return {
        swapId,
        applicable: true,
        lens: "protect",
        kind: "adviceOnly",
        isEstimate: false,
        factorSections: [],
        factTextKey: "advice.diyFanFilter",
      };
    }

    case "wet-mop": {
      return {
        swapId,
        applicable: true,
        lens: "protect",
        kind: "adviceOnly",
        isEstimate: false,
        factorSections: ["6"],
        factTextKey: "advice.wetMop",
      };
    }

    // Pollute less swaps
    case "metro-not-car":
    case "bus-not-car":
    case "carpool":
    case "walk-short-trips":
    case "wfh-day": {
      const mode = profile.commute.mode as TravelMode;
      const distance = profile.commute.distanceKm ?? 0;
      const trips = profile.commute.tripsPerDay ?? 2;
      const peopleSharing = profile.commute.peopleSharing ?? 1;
      const workingDays = profile.commute.workingDaysPerWeek ?? 5;

      const isMotorized = [
        "petrol_car_small",
        "petrol_car",
        "petrol_sedan",
        "diesel_car",
        "diesel_sedan",
        "cng_car",
        "scooter",
        "motorcycle",
        "auto",
      ].includes(mode);

      if (!isMotorized || distance <= 0) {
        return {
          swapId,
          applicable: false,
          lens: "polluteLess",
          kind: "computed",
          isEstimate: false,
          factorSections: ["9"],
        };
      }

      let oldFactor = 0;
      if (mode in TRANSPORT_CO2_FACTORS) {
        oldFactor = TRANSPORT_CO2_FACTORS[mode as keyof typeof TRANSPORT_CO2_FACTORS].kgCo2PerKm;
      }
      const oldCo2PerPersonKm = oldFactor / Math.max(1, peopleSharing);

      let savedCo2PerPersonKm = 0;
      let isEstimate = false;
      let vehicleKmAvoidedPerDay = distance * trips;

      if (swapId === "metro-not-car") {
        savedCo2PerPersonKm = oldCo2PerPersonKm * METRO_SAVING_FRACTION;
        isEstimate = true; // operator's approximate claim
      } else if (swapId === "bus-not-car") {
        const busPaxFactor = TRANSPORT_CO2_FACTORS.bus.kgCo2PerKm; // 0.015161
        savedCo2PerPersonKm = Math.max(0, oldCo2PerPersonKm - busPaxFactor);
      } else if (swapId === "carpool") {
        const isCar = [
          "petrol_car_small",
          "petrol_car",
          "petrol_sedan",
          "diesel_car",
          "diesel_sedan",
          "cng_car",
        ].includes(mode);
        if (!isCar || peopleSharing >= 4) {
          return {
            swapId,
            applicable: false,
            lens: "polluteLess",
            kind: "computed",
            isEstimate: false,
            factorSections: ["9"],
          };
        }
        const carpoolPax = 3; // sharing with 2 others = 3 pax total
        const newCo2PerPersonKm = oldFactor / carpoolPax;
        savedCo2PerPersonKm = Math.max(0, oldCo2PerPersonKm - newCo2PerPersonKm);
        vehicleKmAvoidedPerDay = (distance * trips * (carpoolPax - 1)) / carpoolPax;
      } else if (swapId === "walk-short-trips") {
        if (distance > 2) {
          return {
            swapId,
            applicable: false,
            lens: "polluteLess",
            kind: "computed",
            isEstimate: false,
            factorSections: ["9"],
          };
        }
        savedCo2PerPersonKm = oldCo2PerPersonKm;
      } else if (swapId === "wfh-day") {
        const hasOfficeWorker = profile.members.some((m) => m.routinePreset === "office_worker");
        if (!hasOfficeWorker) {
          return {
            swapId,
            applicable: false,
            lens: "polluteLess",
            kind: "computed",
            isEstimate: false,
            factorSections: ["9"],
          };
        }
        // 1 day a week avoided
        const dailySaved = distance * trips * oldCo2PerPersonKm;
        const weeklySaved = dailySaved * 1; // 1 WFH day
        return {
          swapId,
          applicable: true,
          lens: "polluteLess",
          kind: "computed",
          isEstimate: false,
          factorSections: ["9"],
          co2SavedKgPerDay: dailySaved,
          co2SavedKgPerWeek: weeklySaved,
          vehicleKmAvoidedPerDay: distance * trips,
        };
      }

      const co2SavedPerDay = distance * trips * savedCo2PerPersonKm;
      const co2SavedPerWeek = co2SavedPerDay * workingDays;

      return {
        swapId,
        applicable: true,
        lens: "polluteLess",
        kind: "computed",
        isEstimate,
        factorSections: ["9"],
        co2SavedKgPerDay: co2SavedPerDay,
        co2SavedKgPerWeek: co2SavedPerWeek,
        vehicleKmAvoidedPerDay,
      };
    }

    case "no-idling": {
      const isDriver = [
        "petrol_car_small",
        "petrol_car",
        "petrol_sedan",
        "diesel_car",
        "diesel_sedan",
        "cng_car",
        "scooter",
        "motorcycle",
        "auto",
      ].includes(profile.commute.mode);
      if (!isDriver) {
        return {
          swapId,
          applicable: false,
          lens: "polluteLess",
          kind: "adviceOnly",
          isEstimate: false,
          factorSections: [],
        };
      }
      return {
        swapId,
        applicable: true,
        lens: "polluteLess",
        kind: "adviceOnly",
        isEstimate: false,
        factorSections: [],
        factTextKey: "advice.noIdling",
      };
    }

    case "no-burning": {
      return {
        swapId,
        applicable: true,
        lens: "polluteLess",
        kind: "adviceOnly",
        isEstimate: false,
        factorSections: [],
        factTextKey: "advice.noBurning",
      };
    }

    default:
      return {
        swapId,
        applicable: false,
        lens: "protect",
        kind: "adviceOnly",
        isEstimate: false,
        factorSections: [],
      };
  }
}
