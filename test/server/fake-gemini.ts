// fake-gemini.ts: A Gemini client for tests. No test calls the real API (AGENTS.md rule 5).
import { vi } from "vitest";
import type { GeminiDeps, GeminiReply, GeminiRequest } from "../../src/server/gemini/client.js";

/** A fake whose generateContent returns the given JSON (or raw text), or throws the given error. */
export function fakeGemini(reply: unknown | { raw: string } | Error): GeminiDeps & {
  calls: GeminiRequest[];
} {
  const calls: GeminiRequest[] = [];
  const generateContent = vi.fn(async (request: GeminiRequest): Promise<GeminiReply> => {
    calls.push(request);
    if (reply instanceof Error) throw reply;
    const text =
      reply && typeof reply === "object" && "raw" in reply
        ? (reply as { raw: string }).raw
        : JSON.stringify(reply);
    return {
      text,
      usageMetadata: { promptTokenCount: 200, candidatesTokenCount: 50, totalTokenCount: 250 },
    };
  });
  return { client: { models: { generateContent } }, model: "test-model", calls };
}
