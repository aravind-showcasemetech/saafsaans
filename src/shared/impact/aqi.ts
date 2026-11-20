// aqi.ts: India's National AQI band for a PM2.5 level (FACTORS.md section 1).
// Pure functions with no I/O. Results that use a CHOSEN value carry isEstimate: true.

import { CPCB_AQI_BANDS } from "../factors.js";

export type AqiBandName =
  | "Good"
  | "Satisfactory"
  | "Moderately polluted"
  | "Poor"
  | "Very Poor"
  | "Severe";

export interface AqiBandResult {
  band: AqiBandName;
  healthStatement: string;
  isEstimate: boolean;
  factorSections: string[];
}

/**
 * Returns the CPCB AQI band and health statement corresponding to a 24-hour PM2.5 concentration.
 * Handled edge cases: exactly on boundaries (e.g. 30, 30.1, 250, 250.1).
 */
export function aqiBandFromPm25(pm25: number): AqiBandResult {
  const safePm25 = Math.max(0, pm25);

  const matched =
    CPCB_AQI_BANDS.find((b: (typeof CPCB_AQI_BANDS)[number]) => safePm25 <= b.pm25Max) ??
    CPCB_AQI_BANDS[CPCB_AQI_BANDS.length - 1];

  return {
    band: matched.band,
    healthStatement: matched.healthStatement,
    isEstimate: false,
    factorSections: ["1"],
  };
}
