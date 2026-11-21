// storage.ts: Safe localStorage wrapper. Reads and writes go through two helpers that catch
// errors (private windows, full or blocked storage). Nicknames stay in the browser.

import type { HouseholdProfile } from "../../shared/schemas.js";
import { reportError } from "../report-error.js";
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

/** The parsed value stored under key, or null when it is missing or cannot be read. */
function readStored<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (err) {
    reportError(`Failed to read ${key} from localStorage`, err);
    return null;
  }
}

/** Stores value under key as JSON; a failure is reported and otherwise ignored. */
function writeStored(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    reportError(`Failed to save ${key} to localStorage`, err);
  }
}

export function saveHouseholdProfile(profile: HouseholdProfile): void {
  writeStored(PROFILE_KEY, profile);
}

export function loadHouseholdProfile(): HouseholdProfile | null {
  return readStored<HouseholdProfile>(PROFILE_KEY);
}

export function saveLocation(location: StoredLocation): void {
  writeStored(LOCATION_KEY, location);
}

export function loadLocation(): StoredLocation | null {
  return readStored<StoredLocation>(LOCATION_KEY);
}

export function saveNicknames(nicknames: Record<string, string>): void {
  writeStored(NICKNAMES_KEY, nicknames);
}

export function loadNicknames(): Record<string, string> {
  return readStored<Record<string, string>>(NICKNAMES_KEY) ?? {};
}

export function savePlan(plan: PlanResponse): void {
  writeStored(PLAN_KEY, plan);
}

export function loadPlan(): PlanResponse | null {
  return readStored<PlanResponse>(PLAN_KEY);
}

export function saveToggledSwaps(swapIds: string[]): void {
  writeStored(TOGGLES_KEY, swapIds);
}

export function loadToggledSwaps(): string[] | null {
  return readStored<string[]>(TOGGLES_KEY);
}

/** Forgets the toggles, so a newly opened household starts with every swap on. */
export function clearToggledSwaps(): void {
  try {
    localStorage.removeItem(TOGGLES_KEY);
  } catch (err) {
    reportError("Failed to clear toggles in localStorage", err);
  }
}
