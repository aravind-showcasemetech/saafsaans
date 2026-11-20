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

  const windowSize = Math.max(1, opts.windowSizeHours ?? 3);
  const allowedStartHour = opts.allowedStartHour ?? 6;
  const allowedEndHour = opts.allowedEndHour ?? 21;
  const filterDate = opts.date;

  if (!hourlyForecast || hourlyForecast.length === 0) {
    return {
      cleanest: null,
      dirtiest: null,
      isEstimate: false,
      factorSections: ["8"],
    };
  }

  // Parse and sort items chronologically
  const parsed = hourlyForecast
    .map((item) => ({
      time: item.time,
      epochMs: new Date(item.time).getTime(),
      pm25: Math.max(0, item.pm25),
    }))
    .filter((item) => !Number.isNaN(item.epochMs))
    .sort((a, b) => a.epochMs - b.epochMs);

  if (parsed.length === 0) {
    return {
      cleanest: null,
      dirtiest: null,
      isEstimate: false,
      factorSections: ["8"],
    };
  }

  // Deduplicate identical timestamps if any
  const uniqueItems: typeof parsed = [];
  for (const item of parsed) {
    if (uniqueItems.length === 0 || uniqueItems[uniqueItems.length - 1].epochMs !== item.epochMs) {
      uniqueItems.push(item);
    }
  }

  const KOLKATA_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const ONE_HOUR_MS = 60 * 60 * 1000;

  // Split into consecutive runs where gap between adjacent items is exactly 1 hour
  const consecutiveRuns: (typeof parsed)[] = [];
  let currentRun: typeof parsed = [];

  for (let i = 0; i < uniqueItems.length; i++) {
    const item = uniqueItems[i];
    if (currentRun.length === 0) {
      currentRun.push(item);
    } else {
      const prev = currentRun[currentRun.length - 1];
      if (item.epochMs - prev.epochMs === ONE_HOUR_MS) {
        currentRun.push(item);
      } else {
        consecutiveRuns.push(currentRun);
        currentRun = [item];
      }
    }
  }
  if (currentRun.length > 0) {
    consecutiveRuns.push(currentRun);
  }

  // Helper to extract Asia/Kolkata date string (YYYY-MM-DD) and hour (0-23)
  function getKolkataTimeInfo(epochMs: number) {
    const kolkataDate = new Date(epochMs + KOLKATA_OFFSET_MS);
    const dateStr = kolkataDate.toISOString().slice(0, 10);
    const hour = kolkataDate.getUTCHours();
    return { dateStr, hour };
  }

  interface CandidateWindow {
    startTime: string;
    endTime: string;
    startHour: number;
    endHour: number;
    averagePm25: number;
  }

  const candidates: CandidateWindow[] = [];

  for (const run of consecutiveRuns) {
    if (run.length < windowSize) continue;

    for (let i = 0; i <= run.length - windowSize; i++) {
      const slice = run.slice(i, i + windowSize);
      const startInfo = getKolkataTimeInfo(slice[0].epochMs);
      const endEpochMs = slice[slice.length - 1].epochMs + ONE_HOUR_MS;
      const endInfo = getKolkataTimeInfo(endEpochMs);

      // Check date filter if provided (matched against window start date in Asia/Kolkata)
      if (filterDate && startInfo.dateStr !== filterDate) {
        continue;
      }

      // Check allowed hours. All hours in the window must fall within allowedStartHour..allowedEndHour.
      // An hour block starting at local `h` spans [h, h+1). Thus each block hour must satisfy:
      // h >= allowedStartHour && h + 1 <= allowedEndHour.
      let hoursAllowed = true;
      for (const item of slice) {
        const itemHour = getKolkataTimeInfo(item.epochMs).hour;
        if (itemHour < allowedStartHour || itemHour + 1 > allowedEndHour) {
          hoursAllowed = false;
          break;
        }
      }

      if (!hoursAllowed) continue;

      const sum = slice.reduce((acc, curr) => acc + curr.pm25, 0);
      const avg = sum / windowSize;

      candidates.push({
        startTime: new Date(slice[0].epochMs).toISOString(),
        endTime: new Date(endEpochMs).toISOString(),
        startHour: startInfo.hour,
        endHour: endInfo.hour,
        averagePm25: avg,
      });
    }
  }

  if (candidates.length === 0) {
    return {
      cleanest: null,
      dirtiest: null,
      isEstimate: false,
      factorSections: ["8"],
    };
  }

  let cleanest = candidates[0];
  let dirtiest = candidates[0];

  for (const cand of candidates) {
    if (cand.averagePm25 < cleanest.averagePm25) {
      cleanest = cand;
    }
    if (cand.averagePm25 > dirtiest.averagePm25) {
      dirtiest = cand;
    }
  }

  return {
    cleanest: {
      startTime: cleanest.startTime,
      endTime: cleanest.endTime,
      startHour: cleanest.startHour,
      endHour: cleanest.endHour,
      averagePm25: cleanest.averagePm25,
    },
    dirtiest: {
      startTime: dirtiest.startTime,
      endTime: dirtiest.endTime,
      startHour: dirtiest.startHour,
      endHour: dirtiest.endHour,
      averagePm25: dirtiest.averagePm25,
    },
    isEstimate: false,
    factorSections: ["8"],
  };
}
