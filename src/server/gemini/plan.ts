import { GoogleGenAI } from "@google/genai";
import { config } from "../config.js";
import {
  type GeminiPlanResponse,
  type anonymiseMembersForGemini,
  isRateLimited,
  safetySettings,
} from "./common.js";

export interface CallGeminiPlanParams {
  anonymisedProfile: {
    members: ReturnType<typeof anonymiseMembersForGemini>;
    commute: unknown;
    home: unknown;
  };
  applicableActions: Array<{
    id: string;
    title: string;
    lens: string;
    kind: string;
  }>;
  aqiBand: string;
  lang: "en" | "hi" | "te";
  geminiClient?: GoogleGenAI;
}

export interface GeminiPlanCallResult {
  data?: GeminiPlanResponse;
  promptTokens?: number;
  candidatesTokens?: number;
  totalTokens?: number;
  latencyMs: number;
  error?: string;
}

export async function callGeminiChoosePlan(
  params: CallGeminiPlanParams,
): Promise<GeminiPlanCallResult> {
  const startTime = Date.now();
  const apiKey = config.geminiApiKey;
  const model = config.geminiModel;

  if (!apiKey || !model) {
    return {
      latencyMs: Date.now() - startTime,
      error: "Gemini not configured",
    };
  }

  if (isRateLimited()) {
    return {
      latencyMs: Date.now() - startTime,
      error: "Rate limit exceeded",
    };
  }

  const client =
    params.geminiClient ?? new GoogleGenAI({ apiKey, httpOptions: { timeout: 15000 } });

  const systemInstruction = `You are SaafSaans, an assistant for urban air quality planning.
Your job is to choose and order up to 6 swaps from the provided list of applicable actions that best fit this family's profile and current air quality band.
Language requirement: You must write in ${
    params.lang === "hi"
      ? "Hindi (Devanagari script)"
      : params.lang === "te"
        ? "Telugu (Telugu script)"
        : "English"
  }.
Rules:
1. Choose ONLY action IDs that appear in the applicable actions list. Do not invent new IDs.
2. Order up to 6 actions by relevance to this family.
3. For each chosen action, write 1-2 plain sentences explaining why it fits this family (max 240 characters).
4. Write a short family summary (max 400 characters).
5. DO NOT include any digits or numbers in your explanations or summary (no arabic numerals 0-9, no devanagari numerals, no telugu numerals). The application calculates and displays all numbers separately.
6. DO NOT provide medical advice or recommend medicines.
7. DO NOT use em dashes (—) or en dashes (–). Use commas, colons or short sentences.`;

  const prompt = JSON.stringify({
    airQualityBand: params.aqiBand,
    household: params.anonymisedProfile,
    applicableActions: params.applicableActions,
  });

  const responseJsonSchema = {
    type: "object",
    properties: {
      swaps: {
        type: "array",
        items: {
          type: "object",
          properties: {
            actionId: { type: "string" },
            reason: { type: "string" },
          },
          required: ["actionId", "reason"],
        },
      },
      familySummary: { type: "string" },
    },
    required: ["swaps", "familySummary"],
  };

  try {
    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseJsonSchema,
        safetySettings,
        temperature: 0.2,
      },
    });

    const latencyMs = Date.now() - startTime;
    const usage = response.usageMetadata;
    const text = response.text;

    if (!text) {
      return {
        latencyMs,
        promptTokens: usage?.promptTokenCount,
        candidatesTokens: usage?.candidatesTokenCount,
        totalTokens: usage?.totalTokenCount,
        error: "Empty model response",
      };
    }

    const parsedJson = JSON.parse(text);

    return {
      data: parsedJson as GeminiPlanResponse,
      latencyMs,
      promptTokens: usage?.promptTokenCount,
      candidatesTokens: usage?.candidatesTokenCount,
      totalTokens: usage?.totalTokenCount,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - startTime;
    return {
      latencyMs,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
