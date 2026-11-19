import { describe, expect, it } from "vitest";
import { app } from "../../src/server/app.js";
import { kukatpallyDemoAir } from "../../src/server/demo/air.js";
import { demoHouseholds } from "../../src/server/demo/households.js";

describe("Reddys Plan JSON snapshot test", () => {
  it("prints Reddys plan JSON", async () => {
    const reddys = demoHouseholds["the-reddys"];
    const profileWithoutNicknames = {
      ...reddys.profile,
      members: reddys.profile.members.map((m, idx) => ({
        ...m,
        id: `m${idx + 1}`,
        nickname: undefined,
      })),
    };
    const res = await app.request("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile: profileWithoutNicknames,
        lat: reddys.location.lat,
        lng: reddys.location.lng,
        lang: "en",
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    console.log("=== REDDYS_PLAN_JSON_START ===");
    console.log(JSON.stringify(json, null, 2));
    console.log("=== REDDYS_PLAN_JSON_END ===");
  });
});
