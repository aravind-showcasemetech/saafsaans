import type {
  HealthRecommendations,
  NormalisedAirData,
  NormalisedHourlyForecastItem,
} from "../shared/air-types.js";
import { aqiBandFromPm25 } from "../shared/impact/index.js";
import { type Config, config } from "./config.js";
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

type CpcbIndex = NonNullable<RawAirQualityResponse["indexes"]>[number];

const VALID_BANDS = [
  "Good",
  "Satisfactory",
  "Moderately polluted",
  "Poor",
  "Very Poor",
  "Severe",
] as const;

const cpcbIndexOf = (item: RawAirQualityResponse) =>
  (item.indexes ?? []).find((idx) => idx.code === "ind_cpcb");

const concentrationOf = (item: RawAirQualityResponse, code: string) =>
  (item.pollutants ?? []).find((p) => p.code === code)?.concentration?.value;

/**
 * The current AQI and band. Without ind_cpcb the band comes from PM2.5 and the AQI is an
 * approximation; a category we do not recognise also falls back to the PM2.5 band.
 */
function currentReading(indCpcb: CpcbIndex | undefined, pm25: number) {
  const fromPm25 = aqiBandFromPm25(pm25).band;
  const aqi = indCpcb?.aqi;
  if (aqi === undefined || aqi === null) {
    return { currentAqi: Math.round(pm25 * 1.5), aqiBand: fromPm25, isApproximate: true };
  }
  // "Satisfactory air quality" -> "satisfactory"
  const category = (indCpcb?.category ?? "")
    .replace(/\s+air\s+quality$/i, "")
    .trim()
    .toLowerCase();
  const aqiBand = VALID_BANDS.find((b) => b.toLowerCase() === category);
  return aqiBand
    ? { currentAqi: aqi, aqiBand, isApproximate: false }
    : { currentAqi: aqi, aqiBand: fromPm25, isApproximate: true };
}

/** One forecast hour, or null when the hour has no time. */
function normaliseForecastHour(
  hourItem: RawAirQualityResponse,
): NormalisedHourlyForecastItem | null {
  if (!hourItem.dateTime) return null;
  const pm25 = concentrationOf(hourItem, "pm25") ?? 0;
  const aqi = cpcbIndexOf(hourItem)?.aqi;
  const missing = aqi === undefined || aqi === null;
  return {
    time: hourItem.dateTime,
    pm25,
    aqi: missing ? Math.round(pm25 * 1.5) : aqi,
    isApproximate: missing,
  };
}

export function normaliseAirQuality(
  current: RawAirQualityResponse,
  forecastHours: RawAirQualityResponse[] = [],
): NormalisedAirData {
  const indCpcb = cpcbIndexOf(current);
  const pm25 = concentrationOf(current, "pm25") ?? 0;
  const { currentAqi, aqiBand, isApproximate } = currentReading(indCpcb, pm25);
  const hourlyForecast = forecastHours
    .map(normaliseForecastHour)
    .filter((h): h is NormalisedHourlyForecastItem => h !== null);

  return {
    currentAqi,
    aqiBand,
    dominantPollutant: indCpcb?.dominantPollutant ?? "pm25",
    pm25,
    pm10: concentrationOf(current, "pm10"),
    healthRecommendations: current.healthRecommendations ?? {},
    hourlyForecast,
    isApproximate,
  };
}

const MAX_FORECAST_PAGES = 10;

/** POSTs to the Air Quality API with a timeout; data is null when the answer is not OK. */
async function postAirQuality(
  fetchFn: typeof fetch,
  path: string,
  apiKey: string,
  body: Record<string, unknown>,
): Promise<{ status: number; data: RawAirQualityResponse | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetchFn(`${AIR_QUALITY_BASE_URL}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) return { status: res.status, data: null };
    return { status: res.status, data: (await res.json()) as RawAirQualityResponse };
  } finally {
    clearTimeout(timeout);
  }
}

/** The 48 hours from the next top of the hour (UTC) after the current reading. */
function forecastPeriod(current: RawAirQualityResponse) {
  const currentDt = current.dateTime ? new Date(current.dateTime) : new Date();
  const startDt = new Date(currentDt.getTime() + 3600 * 1000);
  startDt.setUTCMinutes(0, 0, 0);
  const endDt = new Date(startDt.getTime() + 48 * 3600 * 1000);
  return { startTime: startDt.toISOString(), endTime: endDt.toISOString() };
}

/** Forecast hours, following nextPageToken; stops on an error and keeps what it has. */
async function fetchForecastHours(
  fetchFn: typeof fetch,
  apiKey: string,
  baseBody: Record<string, unknown>,
  period: { startTime: string; endTime: string },
): Promise<RawAirQualityResponse[]> {
  const hours: RawAirQualityResponse[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < MAX_FORECAST_PAGES; page++) {
    const body = { ...baseBody, period, ...(pageToken ? { pageToken } : {}) };
    let data: RawAirQualityResponse | null;
    try {
      data = (await postAirQuality(fetchFn, "forecast:lookup", apiKey, body)).data;
    } catch {
      break;
    }
    if (!data) break;
    const pageHours = data.hourlyForecasts ?? data.hourlyForecast ?? [];
    if (Array.isArray(pageHours)) hours.push(...pageHours);
    pageToken = data.nextPageToken;
    if (!pageToken || hours.length >= 48) break;
  }
  return hours;
}

export async function fetchAirData(
  lat: number,
  lng: number,
  apiKey: string = config.mapsApiKey ?? "",
  fetchFn: typeof fetch = fetch,
  forceReal = false,
  languageCode?: string,
): Promise<NormalisedAirData> {
  if (!(forceReal || (config.mapsLive && apiKey))) {
    // Saved captures: Dwarka, Delhi north of latitude 25, else Kukatpally.
    return lat > 25 ? dwarkaDemoAir : kukatpallyDemoAir;
  }

  const baseBody: Record<string, unknown> = {
    location: { latitude: Math.round(lat * 100) / 100, longitude: Math.round(lng * 100) / 100 },
    extraComputations: [
      "LOCAL_AQI",
      "HEALTH_RECOMMENDATIONS",
      "POLLUTANT_CONCENTRATION",
      "DOMINANT_POLLUTANT_CONCENTRATION",
    ],
    customLocalAqis: [{ regionCode: "IN", aqi: "ind_cpcb" }],
    ...(languageCode ? { languageCode } : {}),
  };

  const current = await postAirQuality(fetchFn, "currentConditions:lookup", apiKey, baseBody);
  if (!current.data) {
    throw new Error(`Air Quality API currentConditions error: ${current.status}`);
  }
  const hours = await fetchForecastHours(fetchFn, apiKey, baseBody, forecastPeriod(current.data));
  return normaliseAirQuality(current.data, hours);
}
/** Air data for a cell under this config: live when Maps is live, else the saved captures. */
export function getAirFor(cfg: Config) {
  return (lat: number, lng: number, languageCode?: string): Promise<NormalisedAirData> =>
    cfg.mapsLive && cfg.mapsApiKey
      ? fetchAirData(lat, lng, cfg.mapsApiKey, fetch, true, languageCode)
      : Promise.resolve(lat > 25 ? dwarkaDemoAir : kukatpallyDemoAir);
}
