// index.ts: The Gemini integration: the client, guards around it, and the plan and refine calls.
export {
  resetRateLimiterForTesting,
  isRateLimited,
  sanitizeModelText,
  containsDigit,
  anonymiseMembersForGemini,
  GeminiPlanResponseSchema,
  type GeminiPlanResponse,
  safetySettings,
} from "./guards.js";

export {
  type GeminiClient,
  type GeminiDeps,
  type GeminiReply,
  geminiFromConfig,
} from "./client.js";

export {
  callGeminiChoosePlan,
  type CallGeminiPlanParams,
  type GeminiPlanCallResult,
} from "./plan.js";

export {
  callGeminiRefineProfile,
  type CallGeminiRefineParams,
  type GeminiRefineCallResult,
} from "./refine.js";
