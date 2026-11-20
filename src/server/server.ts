import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { config } from "./config.js";
import { logEvent } from "./log.js";

serve({ fetch: app.fetch, port: config.port }, (info) => {
  logEvent("info", "server_started", { port: info.port });
});
