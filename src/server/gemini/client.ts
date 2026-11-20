// client.ts: The Gemini client the routes are given. Built from config in production;
// tests pass a fake with the same generateContent shape, so no test calls the real API.

import { GoogleGenAI } from "@google/genai";
import type { Config } from "../config.js";

export interface GeminiReply {
  text?: string;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

export interface GeminiRequest {
  model: string;
  contents: string;
  config: Record<string, unknown>;
}

export interface GeminiClient {
  models: { generateContent(request: GeminiRequest): Promise<GeminiReply> };
}

/** A client plus the model id from GEMINI_MODEL (AGENTS.md rule 10). */
export interface GeminiDeps {
  client: GeminiClient;
  model: string;
}

/** Real client when Gemini is configured and not in demo mode; otherwise null (template text). */
export function geminiFromConfig(cfg: Config): GeminiDeps | null {
  if (!cfg.geminiLive || !cfg.geminiApiKey || !cfg.geminiModel) return null;
  const client = new GoogleGenAI({ apiKey: cfg.geminiApiKey, httpOptions: { timeout: 15000 } });
  return { client: client as unknown as GeminiClient, model: cfg.geminiModel };
}

export interface GeminiUsage {
  promptTokens?: number;
  candidatesTokens?: number;
  totalTokens?: number;
}

export function usageOf(reply: GeminiReply): GeminiUsage {
  return {
    promptTokens: reply.usageMetadata?.promptTokenCount,
    candidatesTokens: reply.usageMetadata?.candidatesTokenCount,
    totalTokens: reply.usageMetadata?.totalTokenCount,
  };
}
