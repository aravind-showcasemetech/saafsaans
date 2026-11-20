import { z } from "zod";
import { AqiBandNameSchema } from "./schemas.js";

export const HealthRecommendationsSchema = z.object({
  generalPopulation: z.string().optional(),
  elderly: z.string().optional(),
  lungDiseasePopulation: z.string().optional(),
  heartDiseasePopulation: z.string().optional(),
  athletes: z.string().optional(),
  pregnantWomen: z.string().optional(),
  children: z.string().optional(),
});

export const NormalisedHourlyForecastItemSchema = z.object({
  time: z.string(), // ISO string
  pm25: z.number(),
  aqi: z.number().optional(),
  isApproximate: z.boolean().default(false),
});

export const NormalisedAirDataSchema = z.object({
  currentAqi: z.number(),
  aqiBand: AqiBandNameSchema,
  dominantPollutant: z.string(),
  pm25: z.number(), // ug/m3
  pm10: z.number().optional(), // ug/m3
  healthRecommendations: HealthRecommendationsSchema,
  hourlyForecast: z.array(NormalisedHourlyForecastItemSchema),
  isApproximate: z.boolean().default(false),
  isDemo: z.boolean().optional(),
  capturedAt: z.string().optional(),
});

export type HealthRecommendations = z.infer<typeof HealthRecommendationsSchema>;
export type NormalisedHourlyForecastItem = z.infer<typeof NormalisedHourlyForecastItemSchema>;
export type NormalisedAirData = z.infer<typeof NormalisedAirDataSchema>;

// Commute route types
export const RouteInfoSchema = z.object({
  distanceMeters: z.number(),
  durationSeconds: z.number(),
  distanceKm: z.number(),
  durationMinutes: z.number(),
  isBeta: z.boolean().default(false),
  fallback: z.enum(["none", "road-distance"]).default("none"),
});

export const CommuteModesResponseSchema = z.object({
  DRIVE: RouteInfoSchema,
  TWO_WHEELER: RouteInfoSchema,
  TRANSIT: RouteInfoSchema,
  WALK: RouteInfoSchema,
});

export type RouteInfo = z.infer<typeof RouteInfoSchema>;
export type CommuteModesResponse = z.infer<typeof CommuteModesResponseSchema>;
