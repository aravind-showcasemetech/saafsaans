import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  MAPS_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),
  GEMINI_MAX_PER_MINUTE: z.coerce.number().default(10),
  DEMO: z
    .enum(["0", "1"])
    .optional()
    .transform((val) => val === "1"),
});

export type Config = {
  port: number;
  nodeEnv: "development" | "test" | "production";
  mapsApiKey?: string;
  geminiApiKey?: string;
  geminiModel?: string;
  geminiMaxPerMinute: number;
  demoMode: boolean;
  mapsLive: boolean;
  geminiLive: boolean;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid environment variables: ${parsed.error.message}`);
  }

  const data = parsed.data;
  const isDemo = Boolean(data.DEMO);

  const mapsApiKey = data.MAPS_API_KEY?.trim() || undefined;
  const geminiApiKey = data.GEMINI_API_KEY?.trim() || undefined;
  const geminiModel = data.GEMINI_MODEL?.trim() || undefined;

  // Split demo mode:
  // Maps data is live when MAPS_API_KEY is set, Gemini is live when both key and model are set,
  // and DEMO=1 turns both off.
  const mapsLive = !isDemo && Boolean(mapsApiKey);
  const geminiLive = !isDemo && Boolean(geminiApiKey && geminiModel);

  return {
    port: data.PORT,
    nodeEnv: data.NODE_ENV,
    mapsApiKey,
    geminiApiKey,
    geminiModel,
    geminiMaxPerMinute: data.GEMINI_MAX_PER_MINUTE,
    demoMode: isDemo,
    mapsLive,
    geminiLive,
  };
}

export const config = loadConfig();
