import { describe, expect, it } from "vitest";
import type { CommuteModesResponse } from "../../src/shared/air-types.js";
import { routeForMode, routesModeFor } from "../../src/shared/commute-mode.js";

const route = (km: number, isBeta = false, fallback: "none" | "road-distance" = "none") => ({
  distanceMeters: km * 1000,
  durationSeconds: 600,
  distanceKm: km,
  durationMinutes: 10,
  isBeta,
  fallback,
});

const routes: CommuteModesResponse = {
  DRIVE: route(9.4),
  TWO_WHEELER: route(8.9, true),
  TRANSIT: route(9.4, false, "road-distance"),
  WALK: route(8.2, true, "road-distance"),
};

describe("travel mode to Routes API mode", () => {
  it("maps every car and the auto to DRIVE", () => {
    for (const m of [
      "petrol_car_small",
      "petrol_car",
      "petrol_sedan",
      "diesel_car",
      "diesel_sedan",
      "cng_car",
      "auto",
    ] as const) {
      expect(routesModeFor(m)).toBe("DRIVE");
    }
  });

  it("maps two-wheelers, public transport and walking", () => {
    expect(routesModeFor("scooter")).toBe("TWO_WHEELER");
    expect(routesModeFor("motorcycle")).toBe("TWO_WHEELER");
    expect(routesModeFor("bus")).toBe("TRANSIT");
    expect(routesModeFor("metro")).toBe("TRANSIT");
    expect(routesModeFor("walk_cycle")).toBe("WALK");
  });
});

describe("the route for the household's mode", () => {
  it("uses the Routes API distance for that mode as it is", () => {
    expect(routeForMode(routes, "petrol_car")).toEqual({
      routesMode: "DRIVE",
      distanceKm: 9.4,
      isBeta: false,
      roadDistanceFallback: false,
    });
  });

  it("flags Google's beta modes", () => {
    expect(routeForMode(routes, "scooter").isBeta).toBe(true);
    expect(routeForMode(routes, "scooter").distanceKm).toBe(8.9);
  });

  it("flags the road distance when transit has no route", () => {
    const metro = routeForMode(routes, "metro");
    expect(metro.routesMode).toBe("TRANSIT");
    expect(metro.roadDistanceFallback).toBe(true);
    expect(metro.isBeta).toBe(false);
  });
});
