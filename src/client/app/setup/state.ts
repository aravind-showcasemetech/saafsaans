// state.ts: What the person has entered so far, shared by the setup steps.
import { t } from "../../home/i18n.js";
import {
  type StoredLocation,
  loadHouseholdProfile,
  loadLocation,
  loadNicknames,
} from "../storage.js";

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
  currentStep: 1,
  selectedLocation: DEFAULT_LOCATION,
  householdMembers: [] as MemberDraft[],
  commuteMode: "petrol_car",
  commuteDistanceKm: 12,
  bedroomSqFt: 144,
  ceilingHeightFt: 10,
  windowHabit: "mostly_shut",
  hasPurifier: false,
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

export function initFromStored(): void {
  draft.selectedLocation = loadLocation() || DEFAULT_LOCATION;
  const storedProfile = loadHouseholdProfile();
  const storedNicknames = loadNicknames();

  if (!storedProfile || storedProfile.members.length === 0) {
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

  draft.householdMembers = storedProfile.members.map((m, idx) => ({
    ref: `m${idx + 1}`,
    nickname:
      storedNicknames[`m${idx + 1}`] || storedNicknames[m.id] || t("setup.member", { n: idx + 1 }),
    ageBand: m.ageBand,
    sensitivity: m.sensitivity || "none",
    routinePreset: m.routinePreset,
    outdoorExerciseMinutes: m.outdoorExerciseMinutes || 0,
    outdoorExerciseTime: m.outdoorExerciseTime || "06:00",
  }));
  draft.commuteMode = storedProfile.commute.mode;
  draft.commuteDistanceKm = storedProfile.commute.distanceKm;
  draft.bedroomSqFt = storedProfile.home.bedroomAreaSqFt;
  draft.ceilingHeightFt = storedProfile.home.ceilingHeightFt;
  draft.windowHabit = storedProfile.home.windowHabit;
  draft.hasPurifier = storedProfile.home.hasPurifier;
  draft.cookingMethod = storedProfile.home.cookingMethod;
  draft.usesIncense = storedProfile.home.usesIncense;
  draft.usesMosquitoCoils = storedProfile.home.usesMosquitoCoils;
}

/** Copies what the person typed into the member drafts, so add and remove keep their edits. */
export function collectMembers(container: HTMLElement): void {
  container.querySelectorAll<HTMLElement>(".member-entry-card").forEach((card, idx) => {
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
