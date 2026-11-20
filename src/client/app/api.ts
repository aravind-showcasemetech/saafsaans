// api.ts: Client API helper calling server endpoints.

import type { NormalisedAirData } from "../../shared/air-types.js";
import {
  type PlanResponse,
  PlanResponseSchema,
  type PlanSwapItem,
} from "../../shared/plan-schema.js";
import type { HouseholdProfile } from "../../shared/schemas.js";
import type { StoredLocation } from "./storage.js";

export type { PlanSwapItem, PlanResponse };

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

export async function fetchAirData(
  lat: number,
  lng: number,
  lang = "en",
): Promise<NormalisedAirData> {
  const res = await fetch(`/api/air?lat=${lat}&lng=${lng}&lang=${encodeURIComponent(lang)}`);
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
  const rawData = await res.json();
  const parsed = PlanResponseSchema.safeParse(rawData);
  if (!parsed.success) {
    console.error("Plan response failed schema validation:", parsed.error);
    throw new Error("Received an invalid plan response from server.");
  }
  return parsed.data;
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
