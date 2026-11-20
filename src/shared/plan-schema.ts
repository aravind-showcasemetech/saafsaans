import { z } from "zod";
import { HealthRecommendationsSchema } from "./air-types.js";
import { AqiBandNameSchema } from "./schemas.js";

export const PlanSwapItemSchema = z.object({
  id: z.string(),
  lens: z.enum(["protect", "polluteLess"]),
  kind: z.enum(["computed", "sourcedFact", "adviceOnly"]),
  title: z.string(),
  savingNumber: z.number().optional(),
  savingUnit: z.string().optional(),
  savingRange: z
    .object({
      min: z.number(),
      max: z.number(),
      unit: z.string(),
    })
    .optional(),
  factText: z.string().optional(),
  isEstimate: z.boolean().default(false),
  factorSections: z.array(z.string()).default([]),
  purifierCadrCfm: z.number().optional(),
  appliesToMemberIds: z.array(z.string()).optional(),
  reason: z.string().default(""),
  reasonSource: z.enum(["gemini", "template"]).default("template"),
  reasonLang: z.string().optional(),
  formula: z.string().optional(),
});

export const MemberDoseComparisonSchema = z.object({
  memberId: z.string(),
  memberRef: z.string(),
  nickname: z.string().optional(),
  baseDoseUg: z.number(),
  withSwapsDoseUg: z.number(),
  doseCutPercentage: z.number(),
  baseAvgExposureUgM3: z.number(),
  withSwapsAvgExposureUgM3: z.number(),
  baseCigarettes: z.number(),
  withSwapsCigarettes: z.number(),
  cigarettesAvoided: z.number(),
  isEstimate: z.boolean(),
  factorSections: z.array(z.string()),
});

export const PlanResponseSchema = z.object({
  source: z.enum(["gemini", "fallback", "demo"]).default("fallback"),
  summary: z.string().default(""),
  swaps: z.array(PlanSwapItemSchema),
  currentAqi: z.number(),
  aqiBand: AqiBandNameSchema,
  cpcbHealthStatement: z.string(),
  googleHealthAdvice: HealthRecommendationsSchema.default({}),
  memberDoses: z.array(MemberDoseComparisonSchema).default([]),
  headline: z.string().optional(),
  communityTotal: z.number().optional(),
  isDemo: z.boolean().optional(),
  capturedAt: z.string().optional(),
});

export type PlanSwapItem = z.infer<typeof PlanSwapItemSchema>;
export type MemberDoseComparison = z.infer<typeof MemberDoseComparisonSchema>;
export type PlanResponse = z.infer<typeof PlanResponseSchema>;
