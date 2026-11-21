import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/server/app.js";
import { airCache, commuteCache } from "../../src/server/cache.js";
import { fetchCommuteRoutes } from "../../src/server/commute.js";
import { loadConfig } from "../../src/server/config.js";
import { kukatpallyDemoAir } from "../../src/server/demo/air.js";
import { geminiFromConfig } from "../../src/server/gemini/client.js";
import { getTemplateReason, getTemplateSummary } from "../../src/server/plan/index.js";

// No Maps key in tests, so every route answers from the saved captures and demo data.
const app = createApp({ config: loadConfig({ DEMO: "1" }), gemini: null });

afterEach(() => {
  airCache.clear();
  commuteCache.clear();
});

describe("GET /api/air and /api/air/areas", () => {
  it("returns the saved capture with its capture time, then serves it from the cache", async () => {
    const first = await app.request("/api/air?lat=17.481&lng=78.409&lang=hi");
    expect(first.status).toBe(200);
    const body = await first.json();
    expect(body.isDemo).toBe(true);
    expect(body.capturedAt).toBe(kukatpallyDemoAir.capturedAt);
    expect(body.currentAqi).toBe(kukatpallyDemoAir.currentAqi);
    expect(body.hourlyForecast.length).toBe(kukatpallyDemoAir.hourlyForecast.length);

    const second = await app.request("/api/air?lat=17.48&lng=78.41&lang=hi");
    expect(await second.json()).toEqual(body);
  });

  it("rejects a language other than en, hi or te", async () => {
    expect((await app.request("/api/air?lat=17.48&lng=78.41&lang=fr")).status).toBe(400);
  });

  it("lists the saved areas with band and capture time when maps are not live", async () => {
    const res = await app.request("/api/air/areas");
    expect(res.status).toBe(200);
    const areas = await res.json();
    expect(areas.map((a: { name: string }) => a.name)).toEqual(["Kukatpally", "Dwarka, Delhi"]);
    for (const a of areas) {
      expect(a.isDemo).toBe(true);
      expect(a.capturedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(typeof a.aqi).toBe("number");
    }
    expect(await (await app.request("/api/air/areas")).json()).toEqual(areas);
  });
});

describe("GET /api/demo/households", () => {
  it("returns five households with anonymous member ids and nicknames kept apart", async () => {
    const list = await (await app.request("/api/demo/households")).json();
    expect(list.map((h: { id: string }) => h.id)).toEqual([
      "the-reddys",
      "ayesha-and-karthik",
      "the-khans",
      "green-meadows",
      "the-sharmas",
    ]);
    for (const h of list) {
      h.profile.members.forEach((m: Record<string, unknown>, i: number) => {
        expect(m.id).toBe(`m${i + 1}`);
        expect(m).not.toHaveProperty("nickname");
        expect(typeof h.nicknames[`m${i + 1}`]).toBe("string");
      });
    }
  });
});

describe("GET /api/places", () => {
  it("suggests matching demo places, or the first few when nothing matches", async () => {
    const match = await (await app.request("/api/places?q=gachi")).json();
    expect(match).toEqual([
      { placeId: "demo-gachibowli", text: "Gachibowli, Hyderabad, Telangana, India" },
    ]);
    const none = await (await app.request("/api/places?q=zzzz")).json();
    expect(none).toHaveLength(3);
  });

  it("returns place details rounded to about one km, and rejects odd ids", async () => {
    const place = await (await app.request("/api/places/demo-dwarka?session=abc")).json();
    expect(place).toMatchObject({ latitude: 28.58, longitude: 77.05 });
    expect((await app.request("/api/places/bad%20id!")).status).toBe(400);
  });
});

describe("POST /api/commute", () => {
  const post = (body: string) =>
    app.request("/api/commute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

  it("returns distances for each mode and caches them by rounded cell", async () => {
    const body = JSON.stringify({
      origin: { lat: 17.4812, lng: 78.4123 },
      destination: { lat: 17.4433, lng: 78.3771 },
    });
    const res = await post(body);
    expect(res.status).toBe(200);
    const routes = await res.json();
    expect(Object.keys(routes)).toEqual(["DRIVE", "TWO_WHEELER", "TRANSIT", "WALK"]);
    expect(routes.TWO_WHEELER.isBeta).toBe(true);
    expect(await (await post(body)).json()).toEqual(routes);
  });

  it("rejects bad JSON", async () => {
    expect((await post("{not json")).status).toBe(400);
  });
});

describe("fetchCommuteRoutes against a fake Routes API", () => {
  it("uses each mode's route and falls back to the road distance when one is missing", async () => {
    const fetchFn = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const mode = JSON.parse(String(init?.body)).travelMode;
      if (mode === "DRIVE") {
        return new Response(
          JSON.stringify({ routes: [{ distanceMeters: 8000, duration: "960s" }] }),
        );
      }
      if (mode === "TWO_WHEELER") return new Response("nope", { status: 500 });
      if (mode === "TRANSIT") return new Response(JSON.stringify({ routes: [] }));
      throw new Error("network down");
    }) as unknown as typeof fetch;

    const routes = await fetchCommuteRoutes(
      { lat: 17.4812, lng: 78.4123 },
      { lat: 17.4433, lng: 78.3771 },
      "test-key",
      fetchFn,
      true,
    );

    expect(routes.DRIVE).toMatchObject({ distanceKm: 8, durationMinutes: 16, fallback: "none" });
    expect(routes.TWO_WHEELER).toMatchObject({
      distanceKm: 8,
      isBeta: true,
      fallback: "road-distance",
    });
    expect(routes.TRANSIT).toMatchObject({ distanceKm: 8, fallback: "road-distance" });
    expect(routes.WALK).toMatchObject({ distanceKm: 8, isBeta: true, fallback: "road-distance" });

    // Coordinates are rounded before they leave the server, and the key goes in a header only.
    const [url, init] = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).not.toContain("test-key");
    expect(JSON.parse(String(init.body)).origin.location.latLng).toEqual({
      latitude: 17.48,
      longitude: 78.41,
    });
  });
});

describe("template text and Gemini configuration", () => {
  it("falls back to English and then to a generic sentence for template reasons", () => {
    expect(getTemplateReason("wet-mop", "te")).toMatch(/\p{Script=Telugu}/u);
    expect(getTemplateReason("no-such-action", "hi")).toMatch(/household routine/);
    expect(getTemplateSummary("hi")).toMatch(/\p{Script=Devanagari}/u);
  });

  it("builds a Gemini client only when a key and model are set and demo mode is off", () => {
    expect(
      geminiFromConfig(loadConfig({ DEMO: "1", GEMINI_API_KEY: "k", GEMINI_MODEL: "m" })),
    ).toBeNull();
    expect(geminiFromConfig(loadConfig({ GEMINI_API_KEY: "k" }))).toBeNull();
    const live = geminiFromConfig(loadConfig({ GEMINI_API_KEY: "k", GEMINI_MODEL: "m" }));
    expect(live?.model).toBe("m");
    expect(typeof live?.client.models.generateContent).toBe("function");
  });
});
