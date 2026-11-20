import { Hono } from "hono";
import { z } from "zod";
import { HouseholdProfileSchema } from "../../shared/schemas.js";
import type { GeminiDeps } from "../gemini/client.js";
import { callGeminiRefineProfile } from "../gemini/refine.js";
import { logEvent } from "../log.js";
import { type AppEnv, hasNickname, readJson } from "./common.js";

const RefineBodySchema = z.object({
  profile: HouseholdProfileSchema,
  text: z.string().min(1).max(500),
  lang: z.enum(["en", "hi", "te"]).default("en"),
});

/** POST /refine: Gemini turns free text into profile changes; without Gemini the profile is unchanged. */
export function createRefineRoute(gemini: GeminiDeps | null): Hono<AppEnv> {
  const route = new Hono<AppEnv>();

  route.post("/refine", async (c) => {
    const requestId = c.get("requestId");
    const raw = await readJson(c);
    if (raw === undefined) return c.json({ error: "Invalid JSON body", requestId }, 400);

    const parsed = RefineBodySchema.safeParse(raw);
    if (!parsed.success) return c.json({ error: "Invalid refine input", requestId }, 400);
    // Nicknames never leave the browser.
    if (hasNickname(raw))
      return c.json({ error: "Nickname field is not permitted", requestId }, 400);

    const { profile, text, lang } = parsed.data;
    if (!gemini) return c.json({ profile, source: "fallback" });

    const result = await callGeminiRefineProfile({
      gemini,
      currentProfile: profile,
      refineText: text,
      lang,
    });
    logEvent("info", "gemini_refine", {
      requestId,
      ok: Boolean(result.updatedProfile),
      latencyMs: result.latencyMs,
      totalTokens: result.totalTokens,
    });
    if (!result.updatedProfile) return c.json({ profile, source: "fallback" });

    // The model may never move the household: places always come from the request.
    const updated = {
      ...result.updatedProfile,
      commute: {
        ...result.updatedProfile.commute,
        startPlace: profile.commute.startPlace,
        endPlace: profile.commute.endPlace,
      },
    };
    return c.json({ profile: updated, source: "gemini" });
  });

  return route;
}
