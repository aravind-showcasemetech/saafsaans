// index.ts: The impact model, one module per concern. Every figure a user sees is computed here
// from constants in src/shared/factors.ts (AGENTS.md rule 1). Full precision; the UI rounds.
export * from "./aqi.js";
export * from "./indoor.js";
export * from "./dose.js";
export * from "./purifier.js";
export * from "./transport.js";
export * from "./mask.js";
export * from "./forecast.js";
