import fs from "node:fs";
import path from "node:path";
import { Hono } from "hono";
import { api } from "./api.js";

export const app = new Hono();

// Mount api routes
app.route("/api", api);

// Direct /healthz as required by spec and tests
app.get("/healthz", (c) => {
  return c.json({ status: "ok" });
});

// Serve built frontend assets in production if dist/client exists
const clientDist = path.resolve(process.cwd(), "dist/client");

app.get("*", async (c, next) => {
  if (c.req.path.startsWith("/api")) {
    return next();
  }

  if (fs.existsSync(clientDist)) {
    const reqPath = c.req.path === "/" ? "/index.html" : c.req.path;
    const filePath = path.join(clientDist, reqPath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      const mimeTypes: Record<string, string> = {
        ".html": "text/html; charset=UTF-8",
        ".js": "text/javascript; charset=UTF-8",
        ".css": "text/css; charset=UTF-8",
        ".json": "application/json",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".ico": "image/x-icon",
      };
      const contentType = mimeTypes[ext] || "application/octet-stream";
      return new Response(fs.readFileSync(filePath), {
        headers: { "Content-Type": contentType },
      });
    }

    // Fallback to index.html for SPA client
    const indexPath = path.join(clientDist, "index.html");
    if (fs.existsSync(indexPath)) {
      return new Response(fs.readFileSync(indexPath), {
        headers: { "Content-Type": "text/html; charset=UTF-8" },
      });
    }
  }

  return c.text("SaafSaans", 200);
});
