// format.ts: Formatting helpers for SaafSaans numbers and text.

const indianNumberFormatter = new Intl.NumberFormat("en-IN");

/**
 * Format a number using Indian grouping ("en-IN").
 */
export function formatIndianNumber(num: number, maximumFractionDigits?: number): string {
  if (maximumFractionDigits !== undefined) {
    return new Intl.NumberFormat("en-IN", { maximumFractionDigits }).format(num);
  }
  return indianNumberFormatter.format(num);
}
