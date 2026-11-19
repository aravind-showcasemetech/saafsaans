import { config } from "./config.js";

const PLACES_BASE_URL = "https://places.googleapis.com/v1";
const TIMEOUT_MS = 8000;

export interface PlaceSuggestion {
  placeId: string;
  text: string;
}

export interface PlaceCoordinates {
  placeId: string;
  latitude: number;
  longitude: number;
  displayName?: string;
}

// Sample demo places for Hyderabad
const demoSuggestions: PlaceSuggestion[] = [
  { placeId: "demo-kukatpally", text: "Kukatpally, Hyderabad, Telangana, India" },
  { placeId: "demo-hitec-city", text: "HITEC City, Hyderabad, Telangana, India" },
  { placeId: "demo-gachibowli", text: "Gachibowli, Hyderabad, Telangana, India" },
  { placeId: "demo-charminar", text: "Charminar, Hyderabad, Telangana, India" },
  { placeId: "demo-dwarka", text: "Dwarka, Delhi, India" },
];

const demoCoordinates: Record<string, PlaceCoordinates> = {
  "demo-kukatpally": {
    placeId: "demo-kukatpally",
    latitude: 17.48,
    longitude: 78.41,
    displayName: "Kukatpally, Hyderabad",
  },
  "demo-hitec-city": {
    placeId: "demo-hitec-city",
    latitude: 17.44,
    longitude: 78.38,
    displayName: "HITEC City, Hyderabad",
  },
  "demo-gachibowli": {
    placeId: "demo-gachibowli",
    latitude: 17.44,
    longitude: 78.35,
    displayName: "Gachibowli, Hyderabad",
  },
  "demo-charminar": {
    placeId: "demo-charminar",
    latitude: 17.36,
    longitude: 78.47,
    displayName: "Charminar, Hyderabad",
  },
  "demo-dwarka": {
    placeId: "demo-dwarka",
    latitude: 28.58,
    longitude: 77.05,
    displayName: "Dwarka, Delhi",
  },
};

export async function fetchPlaceSuggestions(
  query: string,
  sessionToken?: string,
  apiKey: string = config.mapsApiKey ?? "",
  fetchFn: typeof fetch = fetch,
  forceReal = false,
): Promise<PlaceSuggestion[]> {
  if (!forceReal && (config.demoMode || !apiKey)) {
    const qLower = query.toLowerCase();
    const filtered = demoSuggestions.filter((s) => s.text.toLowerCase().includes(qLower));
    return filtered.length > 0 ? filtered : demoSuggestions.slice(0, 3);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const requestBody: Record<string, unknown> = {
      input: query,
      includedRegionCodes: ["IN"],
    };

    if (sessionToken) {
      requestBody.sessionToken = sessionToken;
    }

    const res = await fetchFn(`${PLACES_BASE_URL}/places:autocomplete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Places autocomplete error: ${res.status}`);
    }

    const data = (await res.json()) as {
      suggestions?: Array<{
        placePrediction?: {
          placeId: string;
          text?: { text: string };
        };
      }>;
    };

    const suggestions: PlaceSuggestion[] = [];
    for (const item of data.suggestions ?? []) {
      if (item.placePrediction?.placeId && item.placePrediction.text?.text) {
        suggestions.push({
          placeId: item.placePrediction.placeId,
          text: item.placePrediction.text.text,
        });
      }
    }
    return suggestions;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchPlaceDetails(
  placeId: string,
  sessionToken?: string,
  apiKey: string = config.mapsApiKey ?? "",
  fetchFn: typeof fetch = fetch,
  forceReal = false,
): Promise<PlaceCoordinates> {
  if (!forceReal && (config.demoMode || !apiKey)) {
    const found = demoCoordinates[placeId];
    if (found) return found;
    return {
      placeId,
      latitude: 17.48,
      longitude: 78.41,
      displayName: "Kukatpally, Hyderabad",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    let url = `${PLACES_BASE_URL}/places/${placeId}`;
    if (sessionToken) {
      url += `?sessionToken=${encodeURIComponent(sessionToken)}`;
    }

    const res = await fetchFn(url, {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "location,displayName",
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Places details error: ${res.status}`);
    }

    const data = (await res.json()) as {
      location?: {
        latitude: number;
        longitude: number;
      };
      displayName?: {
        text: string;
      };
    };

    if (!data.location) {
      throw new Error("Places API response missing location");
    }

    return {
      placeId,
      latitude: data.location.latitude,
      longitude: data.location.longitude,
      displayName: data.displayName?.text,
    };
  } finally {
    clearTimeout(timeout);
  }
}
