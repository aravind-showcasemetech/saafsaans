import { HarmBlockThreshold, HarmCategory } from "@google/genai";
import { z } from "zod";
import type { HouseholdProfile } from "../../shared/schemas.js";
import { config } from "../config.js";

// Rate limiter state for GEMINI_MAX_PER_MINUTE
let callTimestamps: number[] = [];

export function resetRateLimiterForTesting(): void {
  callTimestamps = [];
}

export function isRateLimited(now = Date.now(), maxPerMinute = config.geminiMaxPerMinute): boolean {
  const oneMinuteAgo = now - 60000;
  callTimestamps = callTimestamps.filter((ts) => ts > oneMinuteAgo);
  if (callTimestamps.length >= maxPerMinute) {
    return true;
  }
  callTimestamps.push(now);
  return false;
}

// Text sanitiser: replace em and en dashes with a comma, strip HTML
export function sanitizeModelText(text: string): string {
  if (!text) return "";
  return text
    .replace(/[\u2014\u2013]/g, ", ")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Check if string contains any digits (\p{Nd})
export function containsDigit(text: string): boolean {
  return /\p{Nd}/u.test(text);
}

// Zod schema for Plan output from Gemini
export const GeminiPlanResponseSchema = z.object({
  swaps: z.array(
    z.object({
      actionId: z.string(),
      reason: z.string().max(240),
    }),
  ),
  familySummary: z.string().max(400),
});

export type GeminiPlanResponse = z.infer<typeof GeminiPlanResponseSchema>;

// Safety settings for Gemini
export const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// Helper to prepare structured, anonymised member profile for Gemini
export function anonymiseMembersForGemini(members: HouseholdProfile["members"]) {
  return members.map((m, idx) => ({
    memberRef: `m${idx + 1}`,
    ageBand: m.ageBand,
    sensitivity: m.sensitivity,
    routinePreset: m.routinePreset,
    outdoorExerciseMinutes: m.outdoorExerciseMinutes,
    outdoorExerciseTime: m.outdoorExerciseTime,
  }));
}
