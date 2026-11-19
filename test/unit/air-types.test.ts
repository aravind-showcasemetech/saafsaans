import { describe, expect, it } from "vitest";
import {
  CommuteModesResponseSchema,
  HealthRecommendationsSchema,
  NormalisedAirDataSchema,
  NormalisedHourlyForecastItemSchema,
  RouteInfoSchema,
} from "../../src/shared/air-types";

describe("src/shared/air-types", () => {
  it("validates HealthRecommendationsSchema", () => {
    const valid = HealthRecommendationsSchema.parse({
      generalPopulation: "Limit outdoor exertion",
      elderly: "Stay indoors",
    });
    expect(valid.generalPopulation).toBe("Limit outdoor exertion");
  });

  it("validates NormalisedHourlyForecastItemSchema", () => {
    const item = NormalisedHourlyForecastItemSchema.parse({
      time: "2026-11-19T10:00:00Z",
      pm25: 45.2,
      aqi: 68,
      isApproximate: false,
    });
    expect(item.pm25).toBe(45.2);
    expect(item.isApproximate).toBe(false);
  });

  it("validates NormalisedAirDataSchema", () => {
    const airData = NormalisedAirDataSchema.parse({
      currentAqi: 90,
      aqiBand: "Satisfactory",
      dominantPollutant: "pm25",
      pm25: 40.5,
      pm10: 60.2,
      healthRecommendations: {},
      hourlyForecast: [],
      isApproximate: false,
    });
    expect(airData.currentAqi).toBe(90);
    expect(airData.aqiBand).toBe("Satisfactory");
  });

  it("validates RouteInfoSchema and CommuteModesResponseSchema", () => {
    const route = RouteInfoSchema.parse({
      distanceMeters: 10000,
      durationSeconds: 1200,
      distanceKm: 10,
      durationMinutes: 20,
      isBeta: true,
      fallback: "road-distance",
    });
    expect(route.distanceKm).toBe(10);
    expect(route.fallback).toBe("road-distance");

    const modes = CommuteModesResponseSchema.parse({
      DRIVE: route,
      TWO_WHEELER: route,
      TRANSIT: route,
      WALK: route,
    });
    expect(modes.DRIVE.distanceMeters).toBe(10000);
  });
});
