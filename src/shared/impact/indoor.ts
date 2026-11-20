// indoor.ts: Indoor PM2.5 from outdoor PM2.5, single-room mass balance (FACTORS.md section 4).
// Pure functions with no I/O. Results that use a CHOSEN value carry isEstimate: true.

import {
  AIR_EXCHANGE_OPEN_A,
  AIR_EXCHANGE_SHUT_A,
  DEPOSITION_RATE_K,
  PENETRATION_FACTOR_P,
} from "../factors.js";

export interface IndoorRatioResult {
  ratio: number;
  isEstimate: boolean;
  factorSections: string[];
}

export interface IndoorRatioOptions {
  windowsOpen: boolean;
  cadrCfm?: number;
  roomVolumeCuFt?: number;
}

/**
 * Computes the ratio of indoor to outdoor PM2.5 (C_in / C_out) using single-room mass balance:
 * C_in / C_out = (P * a) / (a + k + (CADR_m3h / V_m3))
 * Note that CADR(cfm) / V(cu.ft) * 60 gives CADR in air changes per hour (1/h), which is equivalent
 * to CADR(m3/h) / V(m3).
 */
export function indoorRatio(options: IndoorRatioOptions): IndoorRatioResult {
  const P = PENETRATION_FACTOR_P; // SOURCED (0.97)
  const k = DEPOSITION_RATE_K; // CHOSEN (0.3)
  const a = options.windowsOpen ? AIR_EXCHANGE_OPEN_A : AIR_EXCHANGE_SHUT_A;
  const sections = ["4"];
  // k is always CHOSEN. If windows are open, open air exchange is also CHOSEN.
  const isEstimate = true;

  let cadrLossRate = 0;
  if (
    options.cadrCfm &&
    options.cadrCfm > 0 &&
    options.roomVolumeCuFt &&
    options.roomVolumeCuFt > 0
  ) {
    cadrLossRate = (options.cadrCfm / options.roomVolumeCuFt) * 60;
  }

  const ratio = (P * a) / (a + k + cadrLossRate);

  return {
    ratio,
    isEstimate,
    factorSections: sections,
  };
}

export interface IndoorPm25Result {
  indoorPm25: number;
  ratio: number;
  isEstimate: boolean;
  factorSections: string[];
}

/**
 * Computes indoor PM2.5 given outdoor PM2.5 and room / window / purifier options.
 */
export function indoorPm25(outdoorPm25: number, options: IndoorRatioOptions): IndoorPm25Result {
  const safeOutdoor = Math.max(0, outdoorPm25);
  const ratioRes = indoorRatio(options);
  return {
    indoorPm25: safeOutdoor * ratioRes.ratio,
    ratio: ratioRes.ratio,
    isEstimate: ratioRes.isEstimate,
    factorSections: ratioRes.factorSections,
  };
}
