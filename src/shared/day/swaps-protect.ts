// swaps-protect.ts: Protect swaps computed with the day model (SPEC section 5, FACTORS.md 2 to 8).
// Each swap compares a member's day without and with that one swap.

import { MASK_PROTECTION } from "../factors.js";
import { minPurifierCadr } from "../impact.js";
import type { HouseholdProfile, MemberProfile } from "../schemas.js";
import { computeMemberDaySchedule } from "./schedule.js";
import { calculateDoseCutPercentage } from "./totals.js";
import type {
  DayModelSwapsActive,
  HourlyForecastLookup,
  SwapImpactResult,
  SwapMemberImpact,
} from "./types.js";

type HourWindow = { startHour: number; endHour: number } | null;

export interface ProtectContext {
  profile: HouseholdProfile;
  getOutdoorPm25: HourlyForecastLookup;
  cleanest: HourWindow;
  dirtiest: HourWindow;
}

interface ImpactOptions {
  /** Every member result is an estimate (the indoor model uses a CHOSEN value). */
  alwaysEstimate: boolean;
  /** A FACTORS.md section added to each member's sections. */
  extraSection?: string;
}

interface MemberImpacts {
  impacts: SwapMemberImpact[];
  anyEstimate: boolean;
  /** Sections from every schedule, in the order they were met. */
  scheduleSections: string[];
}

function memberImpacts(
  ctx: ProtectContext,
  include: (m: MemberProfile) => boolean,
  swaps: DayModelSwapsActive,
  opts: ImpactOptions,
): MemberImpacts {
  const impacts: SwapMemberImpact[] = [];
  const scheduleSections: string[] = [];
  let anyEstimate = false;

  ctx.profile.members.forEach((m, idx) => {
    if (!include(m)) return;
    const memberRef = `m${idx + 1}`;
    const schedule = (active: DayModelSwapsActive) =>
      computeMemberDaySchedule(
        m,
        ctx.profile,
        ctx.getOutdoorPm25,
        ctx.cleanest,
        ctx.dirtiest,
        active,
        memberRef,
      );
    const base = schedule({});
    const withSwap = schedule(swaps);
    const estimate = opts.alwaysEstimate || base.isEstimate || withSwap.isEstimate;
    if (base.isEstimate || withSwap.isEstimate) anyEstimate = true;
    scheduleSections.push(...base.factorSections, ...withSwap.factorSections);

    const sections = [...base.factorSections, ...withSwap.factorSections];
    if (opts.extraSection) sections.push(opts.extraSection);

    impacts.push({
      memberId: m.id,
      memberRef,
      nickname: m.nickname ?? memberRef,
      doseCutPercentage: Math.max(
        0,
        calculateDoseCutPercentage(base.totalDoseUg, withSwap.totalDoseUg),
      ),
      cigarettesAvoided: Math.max(0, base.cigarettesForDay - withSwap.cigarettesForDay),
      doseSavedUg: Math.max(0, base.totalDoseUg - withSwap.totalDoseUg),
      isEstimate: estimate,
      factorSections: Array.from(new Set(sections)),
    });
  });

  return { impacts, anyEstimate, scheduleSections };
}

function notApplicable(swapId: string, isEstimate: boolean, sections: string[]): SwapImpactResult {
  return {
    swapId,
    applicable: false,
    lens: "protect",
    kind: "computed",
    isEstimate,
    factorSections: sections,
  };
}

function applicable(
  swapId: string,
  impacts: SwapMemberImpact[],
  isEstimate: boolean,
  sections: Iterable<string>,
  extra: Partial<SwapImpactResult> = {},
): SwapImpactResult {
  return {
    swapId,
    applicable: true,
    lens: "protect",
    kind: "computed",
    isEstimate,
    factorSections: Array.from(new Set(sections)),
    memberImpacts: impacts,
    maxDoseCutPercentage: Math.max(0, ...impacts.map((m) => m.doseCutPercentage)),
    maxCigarettesAvoided: Math.max(0, ...impacts.map((m) => m.cigarettesAvoided)),
    ...extra,
  };
}

const all = () => true;
const exercisesOutdoors = (m: MemberProfile) => (m.outdoorExerciseMinutes ?? 0) > 0;

function shiftOutdoorExercise(ctx: ProtectContext, swapId: string): SwapImpactResult {
  // Must have someone who exercises outdoors, an exercise time, and a cleanest window.
  const include = (m: MemberProfile) => exercisesOutdoors(m) && Boolean(m.outdoorExerciseTime);
  if (!(ctx.profile.members.some(include) && ctx.cleanest)) {
    return notApplicable(swapId, false, ["2", "8"]);
  }
  const r = memberImpacts(ctx, include, { shiftOutdoorExercise: true }, { alwaysEstimate: false });
  return applicable(swapId, r.impacts, r.anyEstimate, ["2", "3", "8", ...r.scheduleSections]);
}

function exerciseIndoors(ctx: ProtectContext, swapId: string): SwapImpactResult {
  if (!ctx.profile.members.some(exercisesOutdoors)) {
    return notApplicable(swapId, true, ["2", "4"]);
  }
  const r = memberImpacts(
    ctx,
    exercisesOutdoors,
    { exerciseIndoors: true },
    { alwaysEstimate: true },
  );
  return applicable(swapId, r.impacts, true, ["2", "3", "4"]);
}

function purifierBedroom(ctx: ProtectContext, swapId: string): SwapImpactResult {
  // Needs the bedroom area and ceiling height; nothing is guessed.
  const area = ctx.profile.home.bedroomAreaSqFt;
  const height = ctx.profile.home.ceilingHeightFt;
  if (!(area && height && area > 0 && height > 0)) {
    return notApplicable(swapId, true, ["2", "3", "4", "5"]);
  }
  const cadrCfm = ctx.profile.home.purifierCadrCfm ?? minPurifierCadr(area, height).minCadrCfm;
  const r = memberImpacts(
    ctx,
    all,
    { purifierBedroom: true },
    { alwaysEstimate: true, extraSection: "5" },
  );
  return applicable(swapId, r.impacts, true, ["2", "3", "4", "5"], {
    purifierCadrCfm: cadrCfm,
    purifierCadrUnit: "cfm minimum CADR",
  });
}

function shutWindowsPeak(ctx: ProtectContext, swapId: string): SwapImpactResult {
  if (ctx.profile.home.windowHabit === "mostly_shut" || !ctx.dirtiest) {
    return notApplicable(swapId, true, ["4", "8"]);
  }
  const r = memberImpacts(ctx, all, { shutWindowsPeak: true }, { alwaysEstimate: true });
  return applicable(swapId, r.impacts, true, ["2", "3", "4", "8"]);
}

function airHouseCleanWindow(ctx: ProtectContext, swapId: string): SwapImpactResult {
  if (!ctx.cleanest) return notApplicable(swapId, false, ["4", "8"]);
  const r = memberImpacts(ctx, all, { airHouseCleanWindow: true }, { alwaysEstimate: true });
  return applicable(swapId, r.impacts, true, ["2", "3", "4", "8"]);
}

function maskOutdoors(ctx: ProtectContext, swapId: string): SwapImpactResult {
  // Applies to members who commute on an open vehicle or on foot, or who work outdoors,
  // for their real time outside, and is always shown as a range.
  const { profile } = ctx;
  const outdoorCommute = ["scooter", "motorcycle", "auto", "walk_cycle"].includes(
    profile.commute.mode,
  );
  const include = (m: MemberProfile) =>
    m.routinePreset === "outdoor_worker" ||
    (outdoorCommute && (m.routinePreset === "office_worker" || m.routinePreset === "school_child"));
  if (!profile.members.some(include)) return notApplicable(swapId, false, ["2", "7"]);

  const r = memberImpacts(
    ctx,
    include,
    { maskOutdoors: true },
    { alwaysEstimate: false, extraSection: "7" },
  );
  return applicable(swapId, r.impacts, r.anyEstimate, ["2", "3", "7"], {
    maskRange: {
      minPercent: MASK_PROTECTION.activeReductionMin * 100, // 34%
      maxPercent: MASK_PROTECTION.activeReductionMax * 100, // 93%
      unit: "% dose reduction while active",
    },
  });
}

const PROTECT_SWAPS: Record<string, (ctx: ProtectContext, swapId: string) => SwapImpactResult> = {
  "shift-outdoor-exercise": shiftOutdoorExercise,
  "exercise-indoors": exerciseIndoors,
  "purifier-bedroom": purifierBedroom,
  "shut-windows-peak": shutWindowsPeak,
  "air-house-clean-window": airHouseCleanWindow,
  "mask-outdoors": maskOutdoors,
};

/** The computed protect swap for this id, or null when the id is not one of them. */
export function protectImpact(swapId: string, ctx: ProtectContext): SwapImpactResult | null {
  const compute = PROTECT_SWAPS[swapId];
  return compute ? compute(ctx, swapId) : null;
}
