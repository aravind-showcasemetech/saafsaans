// presets.ts: Routine presets and default schedules for household members.
// Follows docs/SPEC.md section 6 and docs/FACTORS.md section 2.

import type { ActivityLevel } from "./factors.js";
import type { MemberProfile, RoutineBlock } from "./schemas.js";

/**
 * Generates the baseline 24-hour routine blocks (hours 0..23) for a member based on routine preset
 * and any explicit outdoorExerciseTime/Minutes.
 */
export function buildMemberBaselineRoutine(member: MemberProfile): RoutineBlock[] {
  // If custom routine is provided and covers hours, use it or adapt it
  if (member.customRoutine && member.customRoutine.length > 0) {
    return member.customRoutine;
  }

  // Activity mapping per FACTORS.md section 2:
  // sleep -> sleep
  // at home -> sedentary
  // office -> sedentary
  // school -> light
  // in traffic -> sedentary
  // walking/cycling -> light for commute, moderate for walk
  // running, sport -> high
  // outdoor work -> light, or moderate for physical labour

  const blocks: RoutineBlock[] = [];

  // Default preset schedules (24 hours):
  switch (member.routinePreset) {
    case "school_child":
      // 21:00 - 07:00 sleep
      // 07:00 - 08:00 home (sedentary)
      // 08:00 - 09:00 traffic (sedentary)
      // 09:00 - 15:00 school (light)
      // 15:00 - 16:00 traffic (sedentary)
      // 16:00 - 21:00 home (sedentary)
      blocks.push(
        { startHour: 0, endHour: 7, place: "home", activity: "sleep", label: "Sleep" },
        {
          startHour: 7,
          endHour: 8,
          place: "home",
          activity: "sedentary",
          label: "Morning at home",
        },
        {
          startHour: 8,
          endHour: 9,
          place: "traffic",
          activity: "sedentary",
          label: "School commute",
        },
        { startHour: 9, endHour: 15, place: "office_school", activity: "light", label: "School" },
        {
          startHour: 15,
          endHour: 16,
          place: "traffic",
          activity: "sedentary",
          label: "Return commute",
        },
        {
          startHour: 16,
          endHour: 21,
          place: "home",
          activity: "sedentary",
          label: "Evening at home",
        },
        { startHour: 21, endHour: 24, place: "home", activity: "sleep", label: "Sleep" },
      );
      break;

    case "office_worker":
      // 22:00 - 06:30 sleep
      // 06:30 - 08:30 home (sedentary)
      // 08:30 - 09:30 traffic (sedentary)
      // 09:30 - 18:00 office (sedentary)
      // 18:00 - 19:00 traffic (sedentary)
      // 19:00 - 22:00 home (sedentary)
      blocks.push(
        { startHour: 0, endHour: 7, place: "home", activity: "sleep", label: "Sleep" },
        {
          startHour: 7,
          endHour: 9,
          place: "home",
          activity: "sedentary",
          label: "Morning at home",
        },
        {
          startHour: 9,
          endHour: 10,
          place: "traffic",
          activity: "sedentary",
          label: "Office commute",
        },
        {
          startHour: 10,
          endHour: 18,
          place: "office_school",
          activity: "sedentary",
          label: "Office",
        },
        {
          startHour: 18,
          endHour: 19,
          place: "traffic",
          activity: "sedentary",
          label: "Return commute",
        },
        {
          startHour: 19,
          endHour: 23,
          place: "home",
          activity: "sedentary",
          label: "Evening at home",
        },
        { startHour: 23, endHour: 24, place: "home", activity: "sleep", label: "Sleep" },
      );
      break;

    case "work_from_home":
      // 23:00 - 07:00 sleep
      // 07:00 - 23:00 home (sedentary)
      blocks.push(
        { startHour: 0, endHour: 7, place: "home", activity: "sleep", label: "Sleep" },
        { startHour: 7, endHour: 23, place: "home", activity: "sedentary", label: "Home / Work" },
        { startHour: 23, endHour: 24, place: "home", activity: "sleep", label: "Sleep" },
      );
      break;

    case "outdoor_worker":
      // 22:00 - 06:00 sleep
      // 06:00 - 08:00 home
      // 08:00 - 18:00 outdoors (light or moderate physical labour per FACTORS.md section 2)
      // 18:00 - 22:00 home
      blocks.push(
        { startHour: 0, endHour: 6, place: "home", activity: "sleep", label: "Sleep" },
        {
          startHour: 6,
          endHour: 8,
          place: "home",
          activity: "sedentary",
          label: "Morning at home",
        },
        { startHour: 8, endHour: 18, place: "outdoors", activity: "light", label: "Outdoor work" },
        {
          startHour: 18,
          endHour: 22,
          place: "home",
          activity: "sedentary",
          label: "Evening at home",
        },
        { startHour: 22, endHour: 24, place: "home", activity: "sleep", label: "Sleep" },
      );
      break;

    case "retired":
      // 22:00 - 06:00 sleep
      // 06:00 - 22:00 home (sedentary)
      blocks.push(
        { startHour: 0, endHour: 6, place: "home", activity: "sleep", label: "Sleep" },
        { startHour: 6, endHour: 22, place: "home", activity: "sedentary", label: "Home" },
        { startHour: 22, endHour: 24, place: "home", activity: "sleep", label: "Sleep" },
      );
      break;
  }

  // If outdoor exercise minutes are specified, inject outdoor exercise block at its actual time
  const exerciseMinutes = member.outdoorExerciseMinutes ?? 0;
  if (exerciseMinutes > 0 && member.outdoorExerciseTime) {
    const [hhStr] = member.outdoorExerciseTime.split(":");
    const exerciseHour = Number.parseInt(hhStr, 10);
    if (!Number.isNaN(exerciseHour) && exerciseHour >= 0 && exerciseHour < 24) {
      // Walk = moderate, run/sport = high per FACTORS.md section 2
      const isHighIntensity =
        member.routinePreset === "school_child" ||
        (member.nickname?.toLowerCase().includes("run") ?? false);
      const activity: ActivityLevel = isHighIntensity ? "high" : "moderate";

      return overlayExerciseOnBlocks(blocks, exerciseHour, activity, "Outdoor exercise");
    }
  }

  return blocks;
}

export function overlayExerciseOnBlocks(
  blocks: RoutineBlock[],
  hour: number,
  activity: ActivityLevel,
  label: string,
  place: "home" | "office_school" | "traffic" | "outdoors" = "outdoors",
): RoutineBlock[] {
  // Convert 24 hourly blocks, overlay the 1 hour, and merge adjacent identical blocks
  const hourly = new Array(24).fill(null).map((_, h) => {
    const match = blocks.find((b) => h >= b.startHour && h < b.endHour);
    if (match) {
      return { place: match.place, activity: match.activity, label: match.label };
    }
    return { place: "home" as const, activity: "sedentary" as const, label: "Home" };
  });

  hourly[hour] = { place, activity, label };

  // Re-compress into RoutineBlocks
  const result: RoutineBlock[] = [];
  let curStart = 0;
  for (let h = 1; h <= 24; h++) {
    const prev = hourly[h - 1];
    const curr = h < 24 ? hourly[h] : null;
    if (!curr || curr.place !== prev.place || curr.activity !== prev.activity) {
      result.push({
        startHour: curStart,
        endHour: h,
        place: prev.place,
        activity: prev.activity,
        label: prev.label,
      });
      curStart = h;
    }
  }
  return result;
}
