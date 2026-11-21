// purifier-calculator.ts: "What size purifier does my room need?" from a room's length, width and
// ceiling height in feet, using minPurifierCadr (FACTORS.md section 5). No new formula: each step
// below is the AHAM rule applied with the shared constants.
import { STANDARD_CEILING_HEIGHT_FT } from "./factors.js";
import { minPurifierCadr } from "./impact/index.js";

export const ROOM_LIMITS = {
  sideMinFt: 4,
  sideMaxFt: 60,
  heightMinFt: 6,
  heightMaxFt: 25,
} as const;

export interface PurifierAdvice {
  areaSqFt: number;
  /** Two thirds of the area: the CADR for a room with the standard 8 ft ceiling. */
  cadrAtStandardHeightCfm: number;
  /** The minimum CADR for this ceiling height, in cfm and in m³/h. */
  minCadrCfm: number;
  minCadrM3PerHour: number;
  isEstimate: boolean;
  factorSections: string[];
}

export type PurifierInputError = "length" | "width" | "height";

/** The advice, or which input is missing or out of range. */
export function purifierAdvice(
  lengthFt: number,
  widthFt: number,
  heightFt: number,
): PurifierAdvice | { error: PurifierInputError } {
  const side = (v: number) =>
    Number.isFinite(v) && v >= ROOM_LIMITS.sideMinFt && v <= ROOM_LIMITS.sideMaxFt;
  if (!side(lengthFt)) return { error: "length" };
  if (!side(widthFt)) return { error: "width" };
  if (
    !Number.isFinite(heightFt) ||
    heightFt < ROOM_LIMITS.heightMinFt ||
    heightFt > ROOM_LIMITS.heightMaxFt
  ) {
    return { error: "height" };
  }

  const areaSqFt = lengthFt * widthFt;
  const atStandard = minPurifierCadr(areaSqFt, STANDARD_CEILING_HEIGHT_FT);
  const result = minPurifierCadr(areaSqFt, heightFt);
  return {
    areaSqFt,
    cadrAtStandardHeightCfm: atStandard.minCadrCfm,
    minCadrCfm: result.minCadrCfm,
    minCadrM3PerHour: result.minCadrM3PerHour,
    isEstimate: result.isEstimate,
    factorSections: result.factorSections,
  };
}
