// log.ts: Structured JSON logs, one line per event.
// Callers pass ids, routes, statuses, durations and reason codes only: never request bodies,
// API keys, profile data, coordinates or user text (AGENTS.md rules 3 and 4).

export type LogLevel = "info" | "warn" | "error";

export type LogFields = Record<string, string | number | boolean | undefined>;

export function logEvent(level: LogLevel, event: string, fields: LogFields = {}): void {
  const line = JSON.stringify({ time: new Date().toISOString(), level, event, ...fields });
  if (level === "error") console.error(line);
  else console.log(line);
}
