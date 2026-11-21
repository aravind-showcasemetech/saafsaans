// hourly.ts: Outdoor PM2.5 by local hour from the forecast, and indoor PM2.5 for an hour at home.
import { WINDOWS_OPEN_DAY_END_HOUR, WINDOWS_OPEN_DAY_START_HOUR } from "../factors.js";
import { indoorPm25 } from "../impact/index.js";
import type { WindowHabit } from "../schemas.js";
import type { HourlyForecastLookup } from "./day-model-types.js";

/**
 * Creates a function to look up outdoor PM2.5 for any local hour 0..23
 * based on hourly forecast (Asia/Kolkata local time).
 */
export function createHourlyForecastLookup(
  hourlyForecast: readonly { time: string; pm25: number }[],
  fallbackPm25: number,
): HourlyForecastLookup {
  const KOLKATA_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const hourMap = new Map<number, number[]>();

  for (const item of hourlyForecast) {
    const epoch = new Date(item.time).getTime();
    if (!Number.isNaN(epoch)) {
      const kolkataDate = new Date(epoch + KOLKATA_OFFSET_MS);
      const h = kolkataDate.getUTCHours();
      const list = hourMap.get(h) ?? [];
      list.push(Math.max(0, item.pm25));
      hourMap.set(h, list);
    }
  }

  return (hour: number): number => {
    const list = hourMap.get(hour);
    if (list && list.length > 0) {
      return list[0]; // First day / closest forecast hour for that local hour
    }
    return Math.max(0, fallbackPm25);
  };
}

/**
 * Computes indoor PM2.5 for a specific hour based on window habit and purifier state.
 * Daytime hours (open_day_shut_night): WINDOWS_OPEN_DAY_START_HOUR to WINDOWS_OPEN_DAY_END_HOUR local time.
 */
export function getIndoorPm25ForHour(
  hour: number,
  outdoorPm25: number,
  windowHabit: WindowHabit,
  options: {
    purifierOnInBedroom?: boolean;
    cadrCfm?: number;
    roomVolumeCuFt?: number;
    forceShutWindows?: boolean;
    isCleanestWindowOpen?: boolean;
  },
): { indoorPm25: number; isEstimate: boolean; factorSections: string[] } {
  let windowsOpen = false;

  if (options.forceShutWindows) {
    windowsOpen = false;
  } else if (options.isCleanestWindowOpen) {
    windowsOpen = true;
  } else if (windowHabit === "mostly_open") {
    windowsOpen = true;
  } else if (windowHabit === "mostly_shut") {
    windowsOpen = false;
  } else if (windowHabit === "open_day_shut_night") {
    windowsOpen = hour >= WINDOWS_OPEN_DAY_START_HOUR && hour < WINDOWS_OPEN_DAY_END_HOUR;
  }

  const cadrCfm = options.purifierOnInBedroom ? options.cadrCfm : undefined;
  const roomVolumeCuFt = options.purifierOnInBedroom ? options.roomVolumeCuFt : undefined;

  const result = indoorPm25(outdoorPm25, {
    windowsOpen,
    cadrCfm,
    roomVolumeCuFt,
  });

  return {
    indoorPm25: result.indoorPm25,
    isEstimate: result.isEstimate,
    factorSections: result.factorSections,
  };
}
