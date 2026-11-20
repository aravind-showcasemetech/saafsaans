// api.ts: Client API helper calling server endpoints.
// The server validates every reply with the shared Zod schemas before sending it, so the browser
// uses the inferred types only and does not ship Zod (smaller bundle, no eval probe under CSP).

import type { NormalisedAirData } from "../../shared/air-types.js";
import type { PlaceCoordinates, PlaceSuggestion } from "../../shared/place-types.js";
import type { PlanResponse, PlanSwapItem } from "../../shared/plan-schema.js";
import type { HouseholdProfile } from "../../shared/schemas.js";
import type { StoredLocation } from "./storage.js";

export type { PlanSwapItem, PlanResponse, PlaceSuggestion, PlaceCoordinates };

export interface DemoHouseholdItem {
  id: string;
  location: StoredLocation;
  profile: HouseholdProfile;
  nicknames: Record<string, string>;
  /** m1 to its role ("father", "grandmother"), to name demo members in the current language. */
  roles: Record<string, string>;
  homes?: number;
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
  return (await res.json()) as PlaceSuggestion[];
}

export async function fetchPlaceDetails(
  placeId: string,
  session?: string,
): Promise<PlaceCoordinates> {
  const params = new URLSearchParams();
  if (session) params.set("session", session);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`/api/places/${encodeURIComponent(placeId)}${qs}`);
  if (!res.ok) throw new Error(`Place details failed: ${res.status}`);
  return (await res.json()) as PlaceCoordinates;
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
  if (!rawData || typeof rawData !== "object" || !Array.isArray((rawData as PlanResponse).swaps)) {
    throw new Error("Received an invalid plan response from server.");
  }
  return rawData as PlanResponse;
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
