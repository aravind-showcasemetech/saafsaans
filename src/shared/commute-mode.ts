// commute-mode.ts: Which Routes API result fits a household's travel mode, and the notices to show.
// The distance is the Routes API's own figure (src/server/commute.ts); nothing is computed here.
import type { CommuteModesResponse } from "./air-types.js";
import type { TravelMode } from "./schemas.js";

export type RoutesMode = keyof CommuteModesResponse;

const ROUTES_MODE: Record<TravelMode, RoutesMode> = {
  petrol_car_small: "DRIVE",
  petrol_car: "DRIVE",
  petrol_sedan: "DRIVE",
  diesel_car: "DRIVE",
  diesel_sedan: "DRIVE",
  cng_car: "DRIVE",
  auto: "DRIVE",
  scooter: "TWO_WHEELER",
  motorcycle: "TWO_WHEELER",
  bus: "TRANSIT",
  metro: "TRANSIT",
  walk_cycle: "WALK",
};

export function routesModeFor(mode: TravelMode): RoutesMode {
  return ROUTES_MODE[mode] ?? "DRIVE";
}

export interface ChosenRoute {
  routesMode: RoutesMode;
  distanceKm: number;
  /** Google marks two-wheeler and walking routes as beta; the app must say so. */
  isBeta: boolean;
  /** Transit had no route, so the distance is the road distance. */
  roadDistanceFallback: boolean;
}

export function routeForMode(routes: CommuteModesResponse, mode: TravelMode): ChosenRoute {
  const routesMode = routesModeFor(mode);
  const r = routes[routesMode];
  return {
    routesMode,
    distanceKm: r.distanceKm,
    isBeta: r.isBeta,
    roadDistanceFallback: r.fallback === "road-distance",
  };
}
