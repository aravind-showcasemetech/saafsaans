// request-context.ts: The request environment every route shares (an anonymous request id),
// reading the JSON body, and the check that keeps nicknames in the browser.
import type { Context } from "hono";

/** Hono environment: every request carries an anonymous request id. */
export type AppEnv = { Variables: { requestId: string } };

/** The parsed JSON body, or undefined when the body is not valid JSON. */
export async function readJson(c: Context<AppEnv>): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return undefined;
  }
}

/** True when any member in body.profile.members carries a nickname (they stay in the browser). */
export function hasNickname(body: unknown): boolean {
  const members = (body as { profile?: { members?: unknown } } | null)?.profile?.members;
  if (!Array.isArray(members)) return false;
  return members.some(
    (m) =>
      m !== null && typeof m === "object" && (m as Record<string, unknown>).nickname !== undefined,
  );
}
