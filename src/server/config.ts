import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  MAPS_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
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
  geminiModel: string;
  demoMode: boolean;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid environment variables: ${parsed.error.message}`);
  }

  const data = parsed.data;
  const isDemo =
    Boolean(data.DEMO) ||
    !data.MAPS_API_KEY ||
    data.MAPS_API_KEY.trim() === "" ||
    !data.GEMINI_API_KEY ||
    data.GEMINI_API_KEY.trim() === "";

  return {
    port: data.PORT,
    nodeEnv: data.NODE_ENV,
    mapsApiKey: data.MAPS_API_KEY,
    geminiApiKey: data.GEMINI_API_KEY,
    geminiModel: data.GEMINI_MODEL,
    demoMode: isDemo,
  };
}

export const config = loadConfig();
