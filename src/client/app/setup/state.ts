// state.ts: What the person has entered so far, kept across the five setup steps, and the profile
// built from it. Nicknames stay in the browser; members are sent as m1, m2...
import type {
  AgeBand,
  CookingMethod,
  HealthSensitivity,
  HouseholdProfile,
  RoutinePreset,
  TravelMode,
  WindowHabit,
} from "../../../shared/schemas.js";
import { t } from "../../home/i18n.js";
import {
  type StoredLocation,
  clearToggledSwaps,
  loadHouseholdProfile,
  loadLocation,
  loadNicknames,
  saveHouseholdProfile,
  saveLocation,
  saveNicknames,
} from "../storage.js";

export const STEPS = ["location", "people", "travel", "home", "review"] as const;
export type StepId = (typeof STEPS)[number];

export interface MemberDraft {
  ref: string;
  nickname: string;
  ageBand: string;
  sensitivity: string;
  routinePreset: string;
  outdoorExerciseMinutes: number;
  outdoorExerciseTime: string;
}

export const DEFAULT_LOCATION: StoredLocation = {
  name: "Kukatpally, Hyderabad",
  lat: 17.48,
  lng: 78.41,
};

export const draft = {
  loaded: false,
  selectedLocation: DEFAULT_LOCATION,
  householdMembers: [] as MemberDraft[],
  commuteMode: "petrol_car",
  commuteDistanceKm: 12,
  workingDaysPerWeek: 5,
  peopleSharing: 1,
  bedroomSqFt: 144,
  ceilingHeightFt: 10,
  windowHabit: "mostly_shut",
  hasPurifier: false,
  /** CADR in cfm if the household knows it; null means "work it out". */
  purifierCadrCfm: null as number | null,
  cookingMethod: "gas",
  usesIncense: false,
  usesMosquitoCoils: false,
};

export function newMember(n: number, preset: Partial<MemberDraft> = {}): MemberDraft {
  return {
    ref: `m${n}`,
    nickname: t("setup.member", { n }),
    ageBand: "31-40",
    sensitivity: "none",
    routinePreset: "office_worker",
    outdoorExerciseMinutes: 0,
    outdoorExerciseTime: "06:00",
    ...preset,
  };
}

/** Loads the saved household once per visit to setup, or a starting household of four. */
export function initFromStored(): void {
  if (draft.loaded) return;
  draft.loaded = true;
  draft.selectedLocation = loadLocation() || DEFAULT_LOCATION;
  const stored = loadHouseholdProfile();
  const nicknames = loadNicknames();
  if (!stored || stored.members.length === 0) {
    draft.householdMembers = [
      newMember(1),
      newMember(2, { routinePreset: "work_from_home" }),
      newMember(3, {
        ageBand: "6-10",
        sensitivity: "asthma_copd",
        routinePreset: "school_child",
        outdoorExerciseMinutes: 30,
        outdoorExerciseTime: "17:00",
      }),
      newMember(4, { ageBand: "61-70", routinePreset: "retired", outdoorExerciseMinutes: 60 }),
    ];
    return;
  }
  draft.householdMembers = stored.members.map((m, idx) => ({
    ref: `m${idx + 1}`,
    nickname: nicknames[`m${idx + 1}`] || nicknames[m.id] || t("setup.member", { n: idx + 1 }),
    ageBand: m.ageBand,
    sensitivity: m.sensitivity || "none",
    routinePreset: m.routinePreset,
    outdoorExerciseMinutes: m.outdoorExerciseMinutes || 0,
    outdoorExerciseTime: m.outdoorExerciseTime || "06:00",
  }));
  const c = stored.commute;
  Object.assign(draft, {
    commuteMode: c.mode,
    commuteDistanceKm: c.distanceKm,
    workingDaysPerWeek: c.workingDaysPerWeek,
    peopleSharing: c.peopleSharing,
  });
  const h = stored.home;
  Object.assign(draft, {
    bedroomSqFt: h.bedroomAreaSqFt,
    ceilingHeightFt: h.ceilingHeightFt,
    windowHabit: h.windowHabit,
    hasPurifier: h.hasPurifier,
    purifierCadrCfm: h.hasPurifier && h.purifierCadrCfm ? h.purifierCadrCfm : null,
    cookingMethod: h.cookingMethod,
    usesIncense: h.usesIncense,
    usesMosquitoCoils: h.usesMosquitoCoils,
  });
}

/** Copies what the person typed into the member drafts, so add, remove and Back keep their edits. */
export function collectMembers(container: HTMLElement): void {
  container.querySelectorAll<HTMLElement>(".member-card").forEach((card, idx) => {
    const m = draft.householdMembers[idx];
    if (!m) return;
    const get = (sel: string) => card.querySelector<HTMLInputElement>(sel)?.value;
    m.nickname = get(".member-nickname") || t("setup.member", { n: idx + 1 });
    m.ageBand = get(".member-age") || "31-40";
    m.sensitivity = get(".member-sensitivity") || "none";
    m.routinePreset = get(".member-routine") || "office_worker";
    m.outdoorExerciseMinutes = Number(get(".member-exercise-min")) || 0;
    m.outdoorExerciseTime = get(".member-exercise-time") || "06:00";
  });
}

export function buildProfile(): HouseholdProfile {
  return {
    members: draft.householdMembers.map((m) => ({
      id: m.ref,
      ageBand: m.ageBand as AgeBand,
      sensitivity: m.sensitivity as HealthSensitivity,
      routinePreset: m.routinePreset as RoutinePreset,
      outdoorExerciseMinutes: m.outdoorExerciseMinutes,
      outdoorExerciseTime: m.outdoorExerciseTime,
    })),
    commute: {
      mode: draft.commuteMode as TravelMode,
      distanceKm: draft.commuteDistanceKm,
      tripsPerDay: 2,
      peopleSharing: draft.peopleSharing,
      workingDaysPerWeek: draft.workingDaysPerWeek,
    },
    home: {
      bedroomAreaSqFt: draft.bedroomSqFt,
      ceilingHeightFt: draft.ceilingHeightFt,
      windowHabit: draft.windowHabit as WindowHabit,
      hasPurifier: draft.hasPurifier,
      purifierCadrCfm:
        draft.hasPurifier && draft.purifierCadrCfm ? draft.purifierCadrCfm : undefined,
      cookingMethod: draft.cookingMethod as CookingMethod,
      usesIncense: draft.usesIncense,
      usesMosquitoCoils: draft.usesMosquitoCoils,
      smokerInHouse: false,
    },
  };
}

/** Saves the household, nicknames and place; the next visit to setup starts from them. */
export function saveAll(): void {
  saveHouseholdProfile(buildProfile());
  saveNicknames(Object.fromEntries(draft.householdMembers.map((m) => [m.ref, m.nickname])));
  saveLocation(draft.selectedLocation);
  clearToggledSwaps();
  draft.loaded = false;
}
