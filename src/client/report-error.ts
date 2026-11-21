// report-error.ts: The one place the browser reports an unexpected error. Every caught error in
// src/client goes through here, so console use stays in a single module (biome noConsole).

/** Logs a caught error with a short description of what was being done. */
export function reportError(context: string, err: unknown): void {
  console.error(context, err);
}
