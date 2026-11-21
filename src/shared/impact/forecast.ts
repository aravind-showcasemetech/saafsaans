// forecast.ts: Cleanest and dirtiest multi-hour windows from an hourly forecast (FACTORS.md section 8).
// Pure functions with no I/O. Results that use a CHOSEN value carry isEstimate: true.

export interface HourlyForecastItem {
  time: string; // ISO 8601 string
  pm25: number;
}

export interface WindowResult {
  startTime: string; // ISO 8601 string
  endTime: string; // ISO 8601 string
  startHour: number; // Asia/Kolkata local hour (0-23)
  endHour: number; // Asia/Kolkata local hour (0-23)
  averagePm25: number;
}

export interface CleanestAndDirtiestWindowsOptions {
  windowSizeHours?: number;
  allowedStartHour?: number; // default 6 (06:00)
  allowedEndHour?: number; // default 21 (21:00)
  date?: string; // "YYYY-MM-DD" in Asia/Kolkata time
}

export interface CleanestAndDirtiestWindowsResult {
  cleanest: WindowResult | null;
  dirtiest: WindowResult | null;
  isEstimate: boolean;
  factorSections: string[];
}

const KOLKATA_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

interface ParsedHour {
  epochMs: number;
  pm25: number;
}

const noWindows = (): CleanestAndDirtiestWindowsResult => ({
  cleanest: null,
  dirtiest: null,
  isEstimate: false,
  factorSections: ["8"],
});

/** Valid hours in time order, negative PM2.5 read as 0, one entry per timestamp. */
function parseHours(hourlyForecast: readonly HourlyForecastItem[]): ParsedHour[] {
  const sorted = hourlyForecast
    .map((item) => ({ epochMs: new Date(item.time).getTime(), pm25: Math.max(0, item.pm25) }))
    .filter((item) => !Number.isNaN(item.epochMs))
    .sort((a, b) => a.epochMs - b.epochMs);
  return sorted.filter((item, i) => i === 0 || sorted[i - 1].epochMs !== item.epochMs);
}

/** Runs of hours exactly one hour apart. */
function consecutiveRuns(hours: ParsedHour[]): ParsedHour[][] {
  const runs: ParsedHour[][] = [];
  for (const item of hours) {
    const run = runs[runs.length - 1];
    if (run && item.epochMs - run[run.length - 1].epochMs === ONE_HOUR_MS) run.push(item);
    else runs.push([item]);
  }
  return runs;
}

/** Asia/Kolkata date (YYYY-MM-DD) and hour (0-23). */
function kolkataTimeInfo(epochMs: number) {
  const kolkataDate = new Date(epochMs + KOLKATA_OFFSET_MS);
  return { dateStr: kolkataDate.toISOString().slice(0, 10), hour: kolkataDate.getUTCHours() };
}

interface WindowRules {
  windowSize: number;
  allowedStartHour: number;
  allowedEndHour: number;
  filterDate?: string;
}

/**
 * The window over these consecutive hours, or null when it is outside the rules. The date filter
 * is matched against the start date in Asia/Kolkata. An hour block starting at local h spans
 * [h, h+1), so each block must satisfy h >= allowedStartHour and h + 1 <= allowedEndHour.
 */
function windowOf(slice: ParsedHour[], rules: WindowRules): WindowResult | null {
  const startInfo = kolkataTimeInfo(slice[0].epochMs);
  if (rules.filterDate && startInfo.dateStr !== rules.filterDate) return null;
  const outside = slice.some((item) => {
    const h = kolkataTimeInfo(item.epochMs).hour;
    return h < rules.allowedStartHour || h + 1 > rules.allowedEndHour;
  });
  if (outside) return null;
  const endEpochMs = slice[slice.length - 1].epochMs + ONE_HOUR_MS;
  const sum = slice.reduce((acc, curr) => acc + curr.pm25, 0);
  return {
    startTime: new Date(slice[0].epochMs).toISOString(),
    endTime: new Date(endEpochMs).toISOString(),
    startHour: startInfo.hour,
    endHour: kolkataTimeInfo(endEpochMs).hour,
    averagePm25: sum / rules.windowSize,
  };
}

/** Every allowed window of windowSize consecutive hours, in time order. */
function candidateWindows(runs: ParsedHour[][], rules: WindowRules): WindowResult[] {
  const candidates: WindowResult[] = [];
  for (const run of runs) {
    for (let i = 0; i <= run.length - rules.windowSize; i++) {
      const window = windowOf(run.slice(i, i + rules.windowSize), rules);
      if (window) candidates.push(window);
    }
  }
  return candidates;
}

/**
 * Finds the cleanest and dirtiest multi-hour window from an hourly forecast.
 * - Works in Asia/Kolkata time (UTC+05:30).
 * - Only uses runs of consecutive hours (no gaps > 1 hour).
 * - Respects allowed local hours (default 06:00 to 21:00) and optional date filter.
 * - Returns window start and end as ISO times.
 */
export function cleanestAndDirtiestWindows(
  hourlyForecast: readonly HourlyForecastItem[],
  options?: CleanestAndDirtiestWindowsOptions | number,
): CleanestAndDirtiestWindowsResult {
  const opts: CleanestAndDirtiestWindowsOptions =
    typeof options === "number" ? { windowSizeHours: options } : (options ?? {});
  const rules: WindowRules = {
    windowSize: Math.max(1, opts.windowSizeHours ?? 3),
    allowedStartHour: opts.allowedStartHour ?? 6,
    allowedEndHour: opts.allowedEndHour ?? 21,
    filterDate: opts.date,
  };

  const candidates = candidateWindows(consecutiveRuns(parseHours(hourlyForecast ?? [])), rules);
  if (candidates.length === 0) return noWindows();

  // The first window wins ties, for both.
  let cleanest = candidates[0];
  let dirtiest = candidates[0];
  for (const cand of candidates) {
    if (cand.averagePm25 < cleanest.averagePm25) cleanest = cand;
    if (cand.averagePm25 > dirtiest.averagePm25) dirtiest = cand;
  }
  return {
    cleanest: { ...cleanest },
    dirtiest: { ...dirtiest },
    isEstimate: false,
    factorSections: ["8"],
  };
}
