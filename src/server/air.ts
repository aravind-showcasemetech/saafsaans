import type {
  HealthRecommendations,
  NormalisedAirData,
  NormalisedHourlyForecastItem,
} from "../shared/air-types.js";
import { aqiBandFromPm25 } from "../shared/impact.js";
import { config } from "./config.js";
import { dwarkaDemoAir, kukatpallyDemoAir } from "./demo/air.js";

const AIR_QUALITY_BASE_URL = "https://airquality.googleapis.com/v1";
const TIMEOUT_MS = 8000;

export interface RawAirQualityResponse {
  dateTime?: string;
  regionCode?: string;
  indexes?: Array<{
    code: string;
    displayName: string;
    aqi?: number;
    aqiDisplay?: string;
    color?: unknown;
    category?: string;
    dominantPollutant?: string;
  }>;
  pollutants?: Array<{
    code: string;
    displayName: string;
    fullName: string;
    concentration?: {
      value: number;
      units: string;
    };
    additionalInfo?: unknown;
  }>;
  healthRecommendations?: HealthRecommendations;
  nextPageToken?: string;
  hourlyForecast?: RawAirQualityResponse[];
  hourlyForecasts?: RawAirQualityResponse[];
}

export function normaliseAirQuality(
  current: RawAirQualityResponse,
  forecastHours: RawAirQualityResponse[] = [],
): NormalisedAirData {
  // Extract ind_cpcb or fallback to any index or PM2.5 calculation
  const indexes = current.indexes ?? [];
  const indCpcb = indexes.find((idx) => idx.code === "ind_cpcb");

  // Extract pollutants
  const pollutants = current.pollutants ?? [];
  const pm25Obj = pollutants.find((p) => p.code === "pm25");
  const pm10Obj = pollutants.find((p) => p.code === "pm10");

  const pm25 = pm25Obj?.concentration?.value ?? 0;
  const pm10 = pm10Obj?.concentration?.value;

  let currentAqi = indCpcb?.aqi;
  let isApproximate = false;

  // Clean category string: e.g. "Satisfactory air quality" -> "Satisfactory"
  let rawCategory = indCpcb?.category ?? "";
  rawCategory = rawCategory.replace(/\s+air\s+quality$/i, "").trim();

  if (currentAqi === undefined || currentAqi === null) {
    // Missing ind_cpcb fallback: compute band from PM2.5 and mark approximate
    const fallbackBand = aqiBandFromPm25(pm25);
    rawCategory = fallbackBand.band;
    currentAqi = Math.round(pm25 * 1.5); // approximate numerical AQI
    isApproximate = true;
  }

  // Ensure category matches our AqiBandNameSchema
  const validBands = [
    "Good",
    "Satisfactory",
    "Moderately polluted",
    "Poor",
    "Very Poor",
    "Severe",
  ] as const;

  let aqiBand = validBands.find((b) => b.toLowerCase() === rawCategory.toLowerCase());
  if (!aqiBand) {
    aqiBand = aqiBandFromPm25(pm25).band;
    isApproximate = true;
  }

  const dominantPollutant = indCpcb?.dominantPollutant ?? "pm25";
  const healthRecs: HealthRecommendations = current.healthRecommendations ?? {};

  // Normalise hourly forecast
  const hourlyForecast: NormalisedHourlyForecastItem[] = [];

  for (const hourItem of forecastHours) {
    const hIndexes = hourItem.indexes ?? [];
    const hCpcb = hIndexes.find((idx) => idx.code === "ind_cpcb");
    const hPollutants = hourItem.pollutants ?? [];
    const hPm25Obj = hPollutants.find((p) => p.code === "pm25");
    const hPm25 = hPm25Obj?.concentration?.value ?? 0;

    let hAqi = hCpcb?.aqi;
    let hApprox = false;

    if (hAqi === undefined || hAqi === null) {
      hAqi = Math.round(hPm25 * 1.5);
      hApprox = true;
    }

    if (hourItem.dateTime) {
      hourlyForecast.push({
        time: hourItem.dateTime,
        pm25: hPm25,
        aqi: hAqi,
        isApproximate: hApprox,
      });
    }
  }

  return {
    currentAqi,
    aqiBand,
    dominantPollutant,
    pm25,
    pm10,
    healthRecommendations: healthRecs,
    hourlyForecast,
    isApproximate,
  };
}

export async function fetchAirData(
  lat: number,
  lng: number,
  apiKey: string = config.mapsApiKey ?? "",
  fetchFn: typeof fetch = fetch,
  forceReal = false,
): Promise<NormalisedAirData> {
  if (!forceReal && (config.demoMode || !apiKey)) {
    // If near Dwarka / Delhi (lat > 25)
    if (lat > 25) {
      return dwarkaDemoAir;
    }
    return kukatpallyDemoAir;
  }

  const roundedLat = Math.round(lat * 100) / 100;
  const roundedLng = Math.round(lng * 100) / 100;

  const requestBody = {
    location: {
      latitude: roundedLat,
      longitude: roundedLng,
    },
    extraComputations: [
      "LOCAL_AQI",
      "HEALTH_RECOMMENDATIONS",
      "POLLUTANT_CONCENTRATION",
      "DOMINANT_POLLUTANT_CONCENTRATION",
    ],
    customLocalAqis: [
      {
        regionCode: "IN",
        aqi: "ind_cpcb",
      },
    ],
  };

  // 1. Fetch current conditions
  const currentController = new AbortController();
  const currentTimeout = setTimeout(() => currentController.abort(), TIMEOUT_MS);

  let currentResponse: RawAirQualityResponse;
  try {
    const res = await fetchFn(`${AIR_QUALITY_BASE_URL}/currentConditions:lookup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
      },
      body: JSON.stringify(requestBody),
      signal: currentController.signal,
    });
    if (!res.ok) {
      throw new Error(`Air Quality API currentConditions error: ${res.status}`);
    }
    currentResponse = (await res.json()) as RawAirQualityResponse;
  } finally {
    clearTimeout(currentTimeout);
  }

  // 2. Fetch forecast (next 48 hours; follow nextPageToken)
  // forecast:lookup starts at next hour and supports 48 hours via period { startTime, endTime }
  const currentDt = currentResponse.dateTime ? new Date(currentResponse.dateTime) : new Date();
  // Next top of the hour in UTC
  const startDt = new Date(currentDt.getTime() + 3600 * 1000);
  startDt.setUTCMinutes(0, 0, 0);
  const endDt = new Date(startDt.getTime() + 48 * 3600 * 1000);

  const allForecastHours: RawAirQualityResponse[] = [];
  let pageToken: string | undefined = undefined;
  let pagesFetched = 0;
  const MAX_PAGES = 10;

  do {
    const forecastController = new AbortController();
    const forecastTimeout = setTimeout(() => forecastController.abort(), TIMEOUT_MS);

    const forecastBody: Record<string, unknown> = {
      location: requestBody.location,
      extraComputations: [
        "LOCAL_AQI",
        "HEALTH_RECOMMENDATIONS",
        "POLLUTANT_CONCENTRATION",
        "DOMINANT_POLLUTANT_CONCENTRATION",
      ],
      customLocalAqis: requestBody.customLocalAqis,
      period: {
        startTime: startDt.toISOString(),
        endTime: endDt.toISOString(),
      },
    };

    if (pageToken) {
      forecastBody.pageToken = pageToken;
    }

    try {
      const res = await fetchFn(`${AIR_QUALITY_BASE_URL}/forecast:lookup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
        },
        body: JSON.stringify(forecastBody),
        signal: forecastController.signal,
      });

      if (!res.ok) {
        break; // stop on forecast error, keep whatever we got
      }

      const forecastData = (await res.json()) as RawAirQualityResponse;
      const hours = forecastData.hourlyForecasts ?? forecastData.hourlyForecast ?? [];
      if (Array.isArray(hours)) {
        allForecastHours.push(...hours);
      }
      pageToken = forecastData.nextPageToken;
      pagesFetched++;
    } catch {
      break;
    } finally {
      clearTimeout(forecastTimeout);
    }
  } while (pageToken && pagesFetched < MAX_PAGES && allForecastHours.length < 48);

  return normaliseAirQuality(currentResponse, allForecastHours);
}
