// plan.ts: Gemini chooses and explains swaps from the applicable catalogue (SPEC section 7).
// The reply is validated with Zod; anything that does not match is treated as a failed call.

import { type GeminiDeps, type GeminiUsage, usageOf } from "./client.js";
import {
  type GeminiPlanResponse,
  GeminiPlanResponseSchema,
  type anonymiseMembersForGemini,
  isRateLimited,
  safetySettings,
} from "./common.js";

export interface CallGeminiPlanParams {
  gemini: GeminiDeps;
  anonymisedProfile: {
    members: ReturnType<typeof anonymiseMembersForGemini>;
    commute: unknown;
    home: unknown;
  };
  applicableActions: Array<{ id: string; title: string; lens: string; kind: string }>;
  aqiBand: string;
  lang: "en" | "hi" | "te";
}

export interface GeminiPlanCallResult extends GeminiUsage {
  data?: GeminiPlanResponse;
  latencyMs: number;
  error?: string;
}

const LANGUAGE_NAMES = {
  en: "English",
  hi: "Hindi (Devanagari script)",
  te: "Telugu (Telugu script)",
} as const;

const RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    swaps: {
      type: "array",
      items: {
        type: "object",
        properties: { actionId: { type: "string" }, reason: { type: "string" } },
        required: ["actionId", "reason"],
      },
    },
    familySummary: { type: "string" },
  },
  required: ["swaps", "familySummary"],
};

function systemInstruction(lang: CallGeminiPlanParams["lang"]): string {
  return `You are SaafSaans, an assistant for urban air quality planning.
Your job is to choose and order up to 6 swaps from the provided list of applicable actions that best fit this family's profile and current air quality band.
Language requirement: You must write in ${LANGUAGE_NAMES[lang]}.
Rules:
1. Choose ONLY action IDs that appear in the applicable actions list. Do not invent new IDs.
2. Order up to 6 actions by relevance to this family.
3. For each chosen action, write 1-2 plain sentences explaining why it fits this family (max 240 characters).
4. Write a short family summary (max 400 characters).
5. DO NOT include any digits or numbers in your explanations or summary (no arabic numerals 0-9, no devanagari numerals, no telugu numerals). The application calculates and displays all numbers separately.
6. DO NOT provide medical or health advice or recommend medicines.
7. DO NOT use em dashes or en dashes. Use commas, colons or short sentences.`;
}

export async function callGeminiChoosePlan(
  params: CallGeminiPlanParams,
): Promise<GeminiPlanCallResult> {
  const startTime = Date.now();
  if (isRateLimited()) {
    return { latencyMs: 0, error: "Rate limit exceeded" };
  }

  try {
    const reply = await params.gemini.client.models.generateContent({
      model: params.gemini.model,
      contents: JSON.stringify({
        airQualityBand: params.aqiBand,
        household: params.anonymisedProfile,
        applicableActions: params.applicableActions,
      }),
      config: {
        systemInstruction: systemInstruction(params.lang),
        responseMimeType: "application/json",
        responseJsonSchema: RESPONSE_JSON_SCHEMA,
        safetySettings,
        temperature: 0.2,
      },
    });
    const latencyMs = Date.now() - startTime;
    const usage = usageOf(reply);
    if (!reply.text) return { latencyMs, ...usage, error: "Empty model response" };

    const parsed = GeminiPlanResponseSchema.safeParse(JSON.parse(reply.text));
    if (!parsed.success) return { latencyMs, ...usage, error: "Model reply failed validation" };
    return { data: parsed.data, latencyMs, ...usage };
  } catch (err: unknown) {
    return {
      latencyMs: Date.now() - startTime,
      error: err instanceof Error ? err.name : "Model call failed",
    };
  }
}
