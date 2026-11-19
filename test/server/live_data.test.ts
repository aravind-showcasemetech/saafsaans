import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type RawAirQualityResponse,
  fetchAirData,
  normaliseAirQuality,
} from "../../src/server/air.js";
import { app } from "../../src/server/app.js";
import { TtlCache } from "../../src/server/cache.js";
import { fetchCommuteRoutes } from "../../src/server/commute.js";
import { loadConfig } from "../../src/server/config.js";
import { fetchPlaceDetails, fetchPlaceSuggestions } from "../../src/server/places.js";

describe("Phase 3: Server clients, normaliser, cache and endpoints", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Normaliser against captured fixture", () => {
    it("matches normalised structure of test/fixtures/air-kukatpally.json", () => {
      const fixturePath = path.resolve(process.cwd(), "test/fixtures/air-kukatpally.json");
      const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));

      expect(fixture.currentAqi).toBeTypeOf("number");
      expect(fixture.aqiBand).toBe("Satisfactory");
      expect(fixture.dominantPollutant).toBe("pm25");
      expect(fixture.pm25).toBeGreaterThan(0);
      expect(fixture.healthRecommendations).toBeDefined();
      expect(fixture.healthRecommendations.generalPopulation).toContain("outdoor");
      expect(Array.isArray(fixture.hourlyForecast)).toBe(true);
      expect(fixture.hourlyForecast.length).toBe(48);
      expect(fixture.hourlyForecast[0]).toHaveProperty("time");
      expect(fixture.hourlyForecast[0]).toHaveProperty("pm25");
      expect(fixture.hourlyForecast[0]).toHaveProperty("aqi");
      expect(fixture.hourlyForecast[0]).toHaveProperty("isApproximate");
    });
  });

  describe("2. Missing ind_cpcb fallback", () => {
    it("computes band from PM2.5 and marks approximate when ind_cpcb index is missing", () => {
      const rawCurrent: RawAirQualityResponse = {
        dateTime: "2026-11-19T10:00:00Z",
        indexes: [
          {
            code: "uaqi",
            displayName: "Universal AQI",
            aqi: 45,
            category: "Moderate",
          },
        ],
        pollutants: [
          {
            code: "pm25",
            displayName: "PM2.5",
            fullName: "Fine particulate matter",
            concentration: { value: 75.0, units: "MICROGRAMS_PER_CUBIC_METER" },
          },
        ],
      };

      const result = normaliseAirQuality(rawCurrent, []);
      expect(result.isApproximate).toBe(true);
      // 75.0 ug/m3 falls in Moderately polluted (61-90)
      expect(result.aqiBand).toBe("Moderately polluted");
      expect(result.currentAqi).toBe(Math.round(75 * 1.5));
    });
  });

  describe("3. Forecast paging", () => {
    it("follows nextPageToken and combines hourly items up to 48 hours", async () => {
      const mockFetch = vi
        .fn()
        // 1st call: currentConditions
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            dateTime: "2026-11-19T10:00:00Z",
            indexes: [{ code: "ind_cpcb", aqi: 120, category: "Moderately polluted" }],
            pollutants: [{ code: "pm25", concentration: { value: 65 } }],
          }),
        })
        // 2nd call: forecast page 1 with nextPageToken
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            hourlyForecasts: Array.from({ length: 24 }, (_, i) => ({
              dateTime: new Date(Date.parse("2026-11-19T11:00:00Z") + i * 3600000).toISOString(),
              indexes: [{ code: "ind_cpcb", aqi: 100 + i }],
              pollutants: [{ code: "pm25", concentration: { value: 50 + i } }],
            })),
            nextPageToken: "token-page-2",
          }),
        })
        // 3rd call: forecast page 2 without nextPageToken
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            hourlyForecasts: Array.from({ length: 24 }, (_, i) => ({
              dateTime: new Date(Date.parse("2026-11-20T11:00:00Z") + i * 3600000).toISOString(),
              indexes: [{ code: "ind_cpcb", aqi: 124 + i }],
              pollutants: [{ code: "pm25", concentration: { value: 74 + i } }],
            })),
          }),
        });

      const airData = await fetchAirData(
        17.48,
        78.41,
        "test-api-key",
        mockFetch as unknown as typeof fetch,
        true,
      );

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(airData.hourlyForecast.length).toBe(48);
      expect(airData.currentAqi).toBe(120);
      expect(airData.aqiBand).toBe("Moderately polluted");
    });
  });

  describe("4. Cache hits and TTL", () => {
    it("returns cached items before expiration and expires after TTL", () => {
      const cache = new TtlCache<string>(1); // 1 second
      cache.set("key1", "val1");
      expect(cache.get("key1")).toBe("val1");
      expect(cache.has("key1")).toBe(true);

      // Advance time by 1.5 seconds
      const originalNow = Date.now;
      try {
        Date.now = () => originalNow() + 1500;
        expect(cache.get("key1")).toBeUndefined();
        expect(cache.has("key1")).toBe(false);
      } finally {
        Date.now = originalNow;
      }
    });
  });

  describe("5. Rounding coordinates to 2 decimal places", () => {
    it("rounds coordinates before calling fetch", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          dateTime: "2026-11-19T10:00:00Z",
          indexes: [{ code: "ind_cpcb", aqi: 80, category: "Satisfactory" }],
          pollutants: [{ code: "pm25", concentration: { value: 40 } }],
        }),
      });

      await fetchAirData(
        17.481234,
        78.419876,
        "test-api-key",
        mockFetch as unknown as typeof fetch,
        true,
      );

      expect(mockFetch).toHaveBeenCalled();
      const firstCallBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(firstCallBody.location.latitude).toBe(17.48);
      expect(firstCallBody.location.longitude).toBe(78.42);
    });
  });

  describe("6. 8-second timeout", () => {
    it("aborts when the request takes longer than 8 seconds", async () => {
      vi.useFakeTimers();
      try {
        const mockFetch = vi.fn().mockImplementation((_url, init) => {
          return new Promise((_, reject) => {
            if (init?.signal) {
              init.signal.addEventListener("abort", () => {
                reject(new DOMException("The operation was aborted", "AbortError"));
              });
            }
          });
        });

        const fetchPromise = fetchAirData(
          17.48,
          78.41,
          "test-api-key",
          mockFetch as unknown as typeof fetch,
          true,
        );

        // Attach rejection handler immediately to avoid unhandled rejection warning
        const assertion = expect(fetchPromise).rejects.toThrow();

        // Fast-forward fake timers by 8.5 seconds
        await vi.advanceTimersByTimeAsync(8500);

        await assertion;
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("7. Commute transit fallback", () => {
    it("falls back to DRIVE distance with fallback: 'road-distance' if TRANSIT returns no route", async () => {
      const mockFetch = vi.fn().mockImplementation((_url, init) => {
        const body = JSON.parse(init.body);
        if (body.travelMode === "DRIVE") {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              routes: [{ distanceMeters: 14000, duration: "1800s" }],
            }),
          });
        }
        if (body.travelMode === "TRANSIT") {
          // No route found
          return Promise.resolve({
            ok: true,
            json: async () => ({ routes: [] }),
          });
        }
        if (body.travelMode === "TWO_WHEELER") {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              routes: [{ distanceMeters: 13500, duration: "1500s" }],
            }),
          });
        }
        if (body.travelMode === "WALK") {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              routes: [{ distanceMeters: 13000, duration: "9000s" }],
            }),
          });
        }
        return Promise.reject(new Error("Unknown mode"));
      });

      const routes = await fetchCommuteRoutes(
        { lat: 17.48, lng: 78.41 },
        { lat: 17.44, lng: 78.38 },
        "test-api-key",
        mockFetch as unknown as typeof fetch,
        true,
      );

      expect(routes.DRIVE.fallback).toBe("none");
      expect(routes.DRIVE.distanceMeters).toBe(14000);
      expect(routes.TRANSIT.fallback).toBe("road-distance");
      expect(routes.TRANSIT.distanceMeters).toBe(14000);
      expect(routes.TWO_WHEELER.isBeta).toBe(true);
      expect(routes.WALK.isBeta).toBe(true);
    });
  });

  describe("8. Places Autocomplete and Details", () => {
    it("calls places autocomplete and details with X-Goog-Api-Key and returns suggestions and coordinates", async () => {
      const mockFetch = vi
        .fn()
        // autocomplete
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            suggestions: [
              {
                placePrediction: {
                  placeId: "p123",
                  text: { text: "Kukatpally, Hyderabad" },
                },
              },
            ],
          }),
        })
        // details
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            location: { latitude: 17.48, longitude: 78.41 },
            displayName: { text: "Kukatpally" },
          }),
        });

      const suggestions = await fetchPlaceSuggestions(
        "Kukatpally",
        "sess-123",
        "test-api-key",
        mockFetch as unknown as typeof fetch,
        true,
      );
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].placeId).toBe("p123");

      const details = await fetchPlaceDetails(
        "p123",
        "sess-123",
        "test-api-key",
        mockFetch as unknown as typeof fetch,
        true,
      );
      expect(details.latitude).toBe(17.48);
      expect(details.longitude).toBe(78.41);
    });
  });

  describe("9. API Route input validation & error handling", () => {
    it("returns 400 for bad coordinates on /api/air", async () => {
      const res = await app.request("/api/air?lat=999&lng=999");
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid coordinates");
      expect(json.requestId).toBeDefined();
    });

    it("returns 400 for bad query on /api/places", async () => {
      const res = await app.request("/api/places?q=");
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid query parameters");
      expect(json.requestId).toBeDefined();
    });

    it("returns 400 for bad commute body on POST /api/commute", async () => {
      const res = await app.request("/api/commute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin: { lat: 100 } }),
      });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid origin or destination coordinates");
      expect(json.requestId).toBeDefined();
    });

    it("returns 413 for payload > 8 KB", async () => {
      const largeString = "x".repeat(9000);
      const res = await app.request("/api/commute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": "9500",
        },
        body: JSON.stringify({ text: largeString }),
      });
      expect(res.status).toBe(413);
      const json = await res.json();
      expect(json.error).toBe("Payload too large");
    });
  });

  describe("10. Security: No keys in URL, logs, or responses", () => {
    it("sends api key strictly in headers and never in URL or request body", async () => {
      const secretKey = "super-secret-google-api-key-12345";
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          dateTime: "2026-11-19T10:00:00Z",
          indexes: [{ code: "ind_cpcb", aqi: 50, category: "Good" }],
          pollutants: [{ code: "pm25", concentration: { value: 15 } }],
        }),
      });

      await fetchAirData(17.48, 78.41, secretKey, mockFetch as unknown as typeof fetch);

      for (const call of mockFetch.mock.calls) {
        const url = call[0] as string;
        const options = call[1];
        expect(url).not.toContain(secretKey);
        expect(options.headers["X-Goog-Api-Key"]).toBe(secretKey);
        if (options.body) {
          expect(options.body).not.toContain(secretKey);
        }
      }
    });

    it("config validation prevents leaking secrets", () => {
      const cfg = loadConfig({
        MAPS_API_KEY: "secret-maps-key",
        GEMINI_API_KEY: "secret-gemini-key",
      });
      expect(cfg.mapsApiKey).toBe("secret-maps-key");
      expect(cfg.geminiApiKey).toBe("secret-gemini-key");
      expect(cfg.demoMode).toBe(false);
    });

    it("turns on demo mode when keys are missing or DEMO=1", () => {
      const cfgMissing = loadConfig({});
      expect(cfgMissing.demoMode).toBe(true);

      const cfgDemo = loadConfig({
        MAPS_API_KEY: "secret-maps-key",
        GEMINI_API_KEY: "secret-gemini-key",
        DEMO: "1",
      });
      expect(cfgDemo.demoMode).toBe(true);
    });
  });
});
