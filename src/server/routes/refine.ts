import { Hono } from "hono";
import { z } from "zod";
import { HouseholdProfileSchema } from "../../shared/schemas.js";
import { config } from "../config.js";
import { callGeminiRefineProfile } from "../gemini.js";

export const refineRoute = new Hono();

const RefineBodySchema = z.object({
  profile: HouseholdProfileSchema,
  text: z.string().min(1).max(500),
  lang: z.enum(["en", "hi", "te"]).default("en"),
});

refineRoute.post("/refine", async (c) => {
  const reqId = c.get("requestId" as never) || "";
  let rawBody: unknown;

  try {
    rawBody = await c.req.json();
  } catch {
    console.error(`Request ${reqId} failed: status 400 Bad JSON`);
    return c.json({ error: "Invalid JSON body", requestId: reqId }, 400);
  }

  const parsed = RefineBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    console.error(`Request ${reqId} failed: status 400 Bad Input`);
    return c.json({ error: "Invalid refine input", requestId: reqId }, 400);
  }

  const { profile, text, lang } = parsed.data;

  let latencyMs = 0;
  let promptTokens: number | undefined;
  let candidatesTokens: number | undefined;
  let totalTokens: number | undefined;
  let source = "fallback";

  let updatedProfile = profile;

  if (config.geminiLive || process.env.NODE_ENV === "test") {
    const refineResult = await callGeminiRefineProfile({
      currentProfile: profile,
      refineText: text,
      lang,
    });

    latencyMs = refineResult.latencyMs;
    promptTokens = refineResult.promptTokens;
    candidatesTokens = refineResult.candidatesTokens;
    totalTokens = refineResult.totalTokens;

    if (refineResult.updatedProfile) {
      // Re-validate the whole profile with Zod, reject anything outside schema, never change location
      const revalidated = HouseholdProfileSchema.safeParse(refineResult.updatedProfile);
      if (revalidated.success) {
        // Ensure location/places cannot be changed
        updatedProfile = {
          ...revalidated.data,
          commute: {
            ...revalidated.data.commute,
            startPlace: profile.commute.startPlace,
            endPlace: profile.commute.endPlace,
          },
        };
        source = "gemini";
      }
    }
  }

  console.log(
    `[REFINE] reqId=${reqId} src=${source} latencyMs=${latencyMs} promptTokens=${promptTokens ?? 0} candidateTokens=${candidatesTokens ?? 0} totalTokens=${totalTokens ?? 0}`,
  );

  return c.json({
    profile: updatedProfile,
    source,
  });
});
