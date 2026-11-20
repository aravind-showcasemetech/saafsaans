import type { CommuteModesResponse, RouteInfo } from "../shared/air-types.js";
import { config } from "./config.js";

const ROUTES_BASE_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";
const TIMEOUT_MS = 8000;

interface CommuteRequestCoords {
  origin: {
    lat: number;
    lng: number;
  };
  destination: {
    lat: number;
    lng: number;
  };
}

interface RawComputeRoutesResponse {
  routes?: Array<{
    distanceMeters?: number;
    duration?: string; // e.g. "1234s"
  }>;
}

function parseDurationSeconds(durationStr?: string): number {
  if (!durationStr) return 0;
  // duration is formatted like "1540s"
  const match = durationStr.match(/^(\d+(?:\.\d+)?)s$/);
  if (match) {
    return Math.round(Number(match[1]));
  }
  return 0;
}

async function computeSingleModeRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  mode: "DRIVE" | "TWO_WHEELER" | "TRANSIT" | "WALK",
  apiKey: string,
  fetchFn: typeof fetch,
): Promise<RouteInfo | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const isBeta = mode === "TWO_WHEELER" || mode === "WALK";

    const requestBody: Record<string, unknown> = {
      origin: {
        location: {
          latLng: {
            latitude: origin.lat,
            longitude: origin.lng,
          },
        },
      },
      destination: {
        location: {
          latLng: {
            latitude: destination.lat,
            longitude: destination.lng,
          },
        },
      },
      travelMode: mode,
    };

    const res = await fetchFn(ROUTES_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as RawComputeRoutesResponse;
    const route = data.routes?.[0];
    if (!route || route.distanceMeters === undefined) {
      return null;
    }

    const distanceMeters = route.distanceMeters;
    const durationSeconds = parseDurationSeconds(route.duration);

    return {
      distanceMeters,
      durationSeconds,
      distanceKm: Math.round((distanceMeters / 1000) * 100) / 100,
      durationMinutes: Math.round(durationSeconds / 60),
      isBeta,
      fallback: "none",
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchCommuteRoutes(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  apiKey: string = config.mapsApiKey ?? "",
  fetchFn: typeof fetch = fetch,
  forceReal = false,
): Promise<CommuteModesResponse> {
  const roundOrigin = {
    lat: Math.round(origin.lat * 100) / 100,
    lng: Math.round(origin.lng * 100) / 100,
  };
  const roundDest = {
    lat: Math.round(destination.lat * 100) / 100,
    lng: Math.round(destination.lng * 100) / 100,
  };

  if (!forceReal && (!config.mapsLive || !apiKey)) {
    // Demo fallback values: Kukatpally (17.48, 78.41) to HITEC City (17.44, 78.38) ~ 12km
    return {
      DRIVE: {
        distanceMeters: 12400,
        durationSeconds: 1680,
        distanceKm: 12.4,
        durationMinutes: 28,
        isBeta: false,
        fallback: "none",
      },
      TWO_WHEELER: {
        distanceMeters: 11800,
        durationSeconds: 1440,
        distanceKm: 11.8,
        durationMinutes: 24,
        isBeta: true,
        fallback: "none",
      },
      TRANSIT: {
        distanceMeters: 13200,
        durationSeconds: 2100,
        distanceKm: 13.2,
        durationMinutes: 35,
        isBeta: false,
        fallback: "none",
      },
      WALK: {
        distanceMeters: 11200,
        durationSeconds: 8400,
        distanceKm: 11.2,
        durationMinutes: 140,
        isBeta: true,
        fallback: "none",
      },
    };
  }

  // Execute in parallel
  const [driveRes, twoWheelerRes, transitRes, walkRes] = await Promise.all([
    computeSingleModeRoute(roundOrigin, roundDest, "DRIVE", apiKey, fetchFn),
    computeSingleModeRoute(roundOrigin, roundDest, "TWO_WHEELER", apiKey, fetchFn),
    computeSingleModeRoute(roundOrigin, roundDest, "TRANSIT", apiKey, fetchFn),
    computeSingleModeRoute(roundOrigin, roundDest, "WALK", apiKey, fetchFn),
  ]);

  // Fallbacks if some modes fail or returned no route
  // Default drive route if even drive failed (e.g. error)
  const defaultDrive: RouteInfo = driveRes ?? {
    distanceMeters: 10000,
    durationSeconds: 1500,
    distanceKm: 10.0,
    durationMinutes: 25,
    isBeta: false,
    fallback: "none",
  };

  const finalDrive: RouteInfo = driveRes ?? defaultDrive;

  const finalTwoWheeler: RouteInfo = twoWheelerRes ?? {
    distanceMeters: finalDrive.distanceMeters,
    durationSeconds: Math.round(finalDrive.durationSeconds * 0.9),
    distanceKm: finalDrive.distanceKm,
    durationMinutes: Math.round(finalDrive.durationMinutes * 0.9),
    isBeta: true,
    fallback: "road-distance",
  };

  // If TRANSIT returns no route, return DRIVE distance with fallback: "road-distance"
  const finalTransit: RouteInfo = transitRes ?? {
    distanceMeters: finalDrive.distanceMeters,
    durationSeconds: Math.round(finalDrive.durationSeconds * 1.3),
    distanceKm: finalDrive.distanceKm,
    durationMinutes: Math.round(finalDrive.durationMinutes * 1.3),
    isBeta: false,
    fallback: "road-distance",
  };

  const finalWalk: RouteInfo = walkRes ?? {
    distanceMeters: finalDrive.distanceMeters,
    durationSeconds: Math.round((finalDrive.distanceKm / 4.5) * 3600), // ~4.5 km/h
    distanceKm: finalDrive.distanceKm,
    durationMinutes: Math.round(((finalDrive.distanceKm / 4.5) * 3600) / 60),
    isBeta: true,
    fallback: "road-distance",
  };

  return {
    DRIVE: finalDrive,
    TWO_WHEELER: finalTwoWheeler,
    TRANSIT: finalTransit,
    WALK: finalWalk,
  };
}
