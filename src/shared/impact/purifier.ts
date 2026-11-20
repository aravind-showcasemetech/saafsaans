// purifier.ts: Minimum purifier CADR for a room (FACTORS.md section 5).
// Pure functions with no I/O. Results that use a CHOSEN value carry isEstimate: true.

import { CADR_MULTIPLIER, CFM_TO_M3_PER_HOUR, STANDARD_CEILING_HEIGHT_FT } from "../factors.js";

export interface MinPurifierCadrResult {
  minCadrCfm: number;
  minCadrM3PerHour: number;
  isEstimate: boolean;
  factorSections: string[];
}

/**
 * AHAM / US EPA purifier CADR rule:
 * CADR (cfm) = 2/3 * room area (sq ft) * (ceiling height (ft) / 8 ft)
 */
export function minPurifierCadr(
  roomAreaSqFt: number,
  ceilingHeightFt: number = STANDARD_CEILING_HEIGHT_FT,
): MinPurifierCadrResult {
  const safeArea = Math.max(0, roomAreaSqFt);
  const safeHeight = Math.max(0, ceilingHeightFt);

  const cfm = CADR_MULTIPLIER * safeArea * (safeHeight / STANDARD_CEILING_HEIGHT_FT);
  const m3PerHour = cfm * CFM_TO_M3_PER_HOUR;

  return {
    minCadrCfm: cfm,
    minCadrM3PerHour: m3PerHour,
    isEstimate: false,
    factorSections: ["5"],
  };
}
