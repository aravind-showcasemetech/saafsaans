import { Hono } from "hono";

export const api = new Hono();

api.get("/healthz", (c) => {
  return c.json({ status: "ok" });
});
