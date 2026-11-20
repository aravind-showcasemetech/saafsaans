// schemas.ts: Zod schemas for the household profile. The plan reply is in plan-schema.ts.
import { z } from "zod";

export const AgeBandSchema = z.enum([
  "under-6",
  "6-10",
  "11-15",
  "16-30",
  "31-40",
  "41-60",
  "61-70",
  "71-plus",
]);

export const HealthSensitivitySchema = z.enum([
  "none",
  "asthma_copd",
  "heart_condition",
  "pregnancy",
]);

export const RoutinePresetSchema = z.enum([
  "school_child",
  "office_worker",
  "work_from_home",
  "outdoor_worker",
  "retired",
]);

export const ActivityLevelSchema = z.enum(["sleep", "sedentary", "light", "moderate", "high"]);

export const RoutineBlockPlaceSchema = z.enum(["home", "office_school", "traffic", "outdoors"]);

export const RoutineBlockSchema = z.object({
  startHour: z.number().int().min(0).max(23),
  endHour: z.number().int().min(1).max(24),
  place: RoutineBlockPlaceSchema,
  activity: ActivityLevelSchema,
  label: z.string().max(100).optional(),
});

export const MemberProfileSchema = z.object({
  id: z.string(),
  nickname: z.string().max(50).optional(),
  ageBand: AgeBandSchema,
  sensitivity: HealthSensitivitySchema.default("none"),
  routinePreset: RoutinePresetSchema,
  outdoorExerciseMinutes: z.number().min(0).max(1440).default(0),
  outdoorExerciseTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(), // HH:mm
  customRoutine: z.array(RoutineBlockSchema).optional(),
});

export const TravelModeSchema = z.enum([
  "petrol_car_small",
  "petrol_car",
  "petrol_sedan",
  "diesel_car",
  "diesel_sedan",
  "cng_car",
  "scooter",
  "motorcycle",
  "auto",
  "bus",
  "metro",
  "walk_cycle",
]);

export const CommuteProfileSchema = z.object({
  mode: TravelModeSchema.default("petrol_car"),
  distanceKm: z.number().min(0).max(200).default(0), // one-way
  tripsPerDay: z.number().min(0).max(10).default(2), // usually 2 (round trip)
  peopleSharing: z.number().int().min(1).max(10).default(1),
  workingDaysPerWeek: z.number().int().min(1).max(7).default(5),
  startPlace: z.string().max(100).optional(),
  endPlace: z.string().max(100).optional(),
});

export const WindowHabitSchema = z.enum(["mostly_open", "open_day_shut_night", "mostly_shut"]);

export const CookingMethodSchema = z.enum(["gas", "induction", "lots_of_frying"]);

export const HomeProfileSchema = z.object({
  bedroomAreaSqFt: z.number().min(20).max(2000).default(144), // default 12x12 = 144 sq ft
  ceilingHeightFt: z.number().min(6).max(25).default(10), // default 10 ft
  windowHabit: WindowHabitSchema.default("mostly_shut"),
  hasPurifier: z.boolean().default(false),
  purifierCadrCfm: z.number().min(0).max(2000).optional(),
  cookingMethod: CookingMethodSchema.default("gas"),
  usesIncense: z.boolean().default(false),
  usesMosquitoCoils: z.boolean().default(false),
  smokerInHouse: z.boolean().default(false),
});

export const HouseholdProfileSchema = z.object({
  members: z.array(MemberProfileSchema).min(1).max(20),
  commute: CommuteProfileSchema.prefault({}),
  home: HomeProfileSchema.prefault({}),
});

export const AqiBandNameSchema = z.enum([
  "Good",
  "Satisfactory",
  "Moderately polluted",
  "Poor",
  "Very Poor",
  "Severe",
]);

export type AgeBand = z.infer<typeof AgeBandSchema>;
export type HealthSensitivity = z.infer<typeof HealthSensitivitySchema>;
export type RoutinePreset = z.infer<typeof RoutinePresetSchema>;
export type ActivityLevel = z.infer<typeof ActivityLevelSchema>;
export type MemberProfile = z.infer<typeof MemberProfileSchema>;
export type TravelMode = z.infer<typeof TravelModeSchema>;
export type WindowHabit = z.infer<typeof WindowHabitSchema>;
export type CookingMethod = z.infer<typeof CookingMethodSchema>;
export type RoutineBlock = z.infer<typeof RoutineBlockSchema>;
export type HouseholdProfile = z.infer<typeof HouseholdProfileSchema>;
