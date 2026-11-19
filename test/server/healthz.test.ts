import { describe, expect, it } from "vitest";
import { app } from "../../src/server/app.js";

describe("GET /healthz", () => {
  it("returns status ok with 200", async () => {
    const res = await app.request("/healthz");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "ok" });
  });

  it("returns status ok via /api/healthz", async () => {
    const res = await app.request("/api/healthz");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "ok" });
  });
});
