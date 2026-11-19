// api.ts: Client API helper calling server endpoints.

import type { NormalisedAirData } from "../../shared/air-types.js";
import type { HouseholdProfile } from "../../shared/schemas.js";
import type { StoredLocation } from "./storage.js";

export interface DemoHouseholdItem {
  id: string;
  location: StoredLocation;
  profile: HouseholdProfile;
  nicknames: Record<string, string>;
}

export interface PlaceSuggestion {
  placeId: string;
  primaryText: string;
  secondaryText?: string;
}

export interface PlaceDetails {
  placeId: string;
  formattedAddress: string;
  displayName: string;
  location: {
    lat: number;
    lng: number;
  };
}

export interface CommuteResult {
  distanceKm: number;
  durationMinutes: number;
  mode: string;
}

export interface PlanSwapItem {
  id: string;
  title: string;
  affectedMembers?: string[];
  number: number;
  unit: string;
  isEstimate: boolean;
  reason: string;
  reasonLang: string;
  formula: string;
  factorsSection: string;
}

export interface PlanResponse {
  headline?: string;
  swaps: PlanSwapItem[];
  communityTotal?: number;
  airQuality?: NormalisedAirData;
}

export async function fetchDemoHouseholds(): Promise<DemoHouseholdItem[]> {
  const res = await fetch("/api/demo/households");
  if (!res.ok) throw new Error(`Demo households failed: ${res.status}`);
  return res.json() as Promise<DemoHouseholdItem[]>;
}

export async function fetchPlaceSuggestions(
  query: string,
  session?: string,
): Promise<PlaceSuggestion[]> {
  const params = new URLSearchParams({ q: query });
  if (session) params.set("session", session);
  const res = await fetch(`/api/places?${params.toString()}`);
  if (!res.ok) throw new Error(`Places query failed: ${res.status}`);
  return res.json() as Promise<PlaceSuggestion[]>;
}

export async function fetchPlaceDetails(placeId: string, session?: string): Promise<PlaceDetails> {
  const params = new URLSearchParams();
  if (session) params.set("session", session);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`/api/places/${placeId}${qs}`);
  if (!res.ok) throw new Error(`Place details failed: ${res.status}`);
  return res.json() as Promise<PlaceDetails>;
}

export async function fetchCommuteDistance(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
): Promise<CommuteResult> {
  const res = await fetch("/api/commute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ origin, destination }),
  });
  if (!res.ok) throw new Error(`Commute failed: ${res.status}`);
  return res.json() as Promise<CommuteResult>;
}

export async function fetchAirData(lat: number, lng: number): Promise<NormalisedAirData> {
  const res = await fetch(`/api/air?lat=${lat}&lng=${lng}`);
  if (!res.ok) throw new Error(`Air data failed: ${res.status}`);
  return res.json() as Promise<NormalisedAirData>;
}

export async function fetchPlan(params: {
  profile: HouseholdProfile;
  lat: number;
  lng: number;
  lang: string;
}): Promise<PlanResponse> {
  const res = await fetch("/api/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const errData = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errData.error || `Plan failed with status ${res.status}`);
  }
  return res.json() as Promise<PlanResponse>;
}

export async function fetchRefine(params: {
  profile: HouseholdProfile;
  text: string;
  lang: string;
}): Promise<{ explanation?: string; profile?: HouseholdProfile }> {
  const res = await fetch("/api/refine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const errData = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errData.error || `Refine failed with status ${res.status}`);
  }
  return res.json() as Promise<{
    explanation?: string;
    profile?: HouseholdProfile;
  }>;
}
