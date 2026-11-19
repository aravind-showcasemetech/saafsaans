// storage.ts: Safe localStorage wrapper with try/catch.
// Keeps nicknames in the browser so they never leave client storage.

import type { HouseholdProfile } from "../../shared/schemas.js";
import type { PlanResponse } from "./api.js";

const PROFILE_KEY = "saafsaans_profile";
const LOCATION_KEY = "saafsaans_location";
const NICKNAMES_KEY = "saafsaans_nicknames";
const PLAN_KEY = "saafsaans_plan";
const TOGGLES_KEY = "saafsaans_toggled_swaps";

export interface StoredLocation {
  name: string;
  lat: number;
  lng: number;
}

export function saveHouseholdProfile(profile: HouseholdProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.error("Failed to save profile to localStorage", err);
  }
}

export function loadHouseholdProfile(): HouseholdProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error("Failed to load profile from localStorage", err);
    return null;
  }
}

export function saveLocation(location: StoredLocation): void {
  try {
    localStorage.setItem(LOCATION_KEY, JSON.stringify(location));
  } catch (err) {
    console.error("Failed to save location to localStorage", err);
  }
}

export function loadLocation(): StoredLocation | null {
  try {
    const raw = localStorage.getItem(LOCATION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error("Failed to load location from localStorage", err);
    return null;
  }
}

export function saveNicknames(nicknames: Record<string, string>): void {
  try {
    localStorage.setItem(NICKNAMES_KEY, JSON.stringify(nicknames));
  } catch (err) {
    console.error("Failed to save nicknames to localStorage", err);
  }
}

export function loadNicknames(): Record<string, string> {
  try {
    const raw = localStorage.getItem(NICKNAMES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error("Failed to load nicknames from localStorage", err);
    return {};
  }
}

export function savePlan(plan: PlanResponse): void {
  try {
    localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
  } catch (err) {
    console.error("Failed to save plan to localStorage", err);
  }
}

export function loadPlan(): PlanResponse | null {
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error("Failed to load plan from localStorage", err);
    return null;
  }
}

export function saveToggledSwaps(swapIds: string[]): void {
  try {
    localStorage.setItem(TOGGLES_KEY, JSON.stringify(swapIds));
  } catch (err) {
    console.error("Failed to save toggles to localStorage", err);
  }
}

export function loadToggledSwaps(): string[] | null {
  try {
    const raw = localStorage.getItem(TOGGLES_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error("Failed to load toggles from localStorage", err);
    return null;
  }
}
