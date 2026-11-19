import { serve } from "@hono/node-server";
import { app } from "../dist/server/server/app.js";

const PORT = 3009;

async function run() {
  let server;
  try {
    await new Promise((resolve, reject) => {
      server = serve({ fetch: app.fetch, port: PORT }, (info) => {
        resolve(info);
      });
      server.on("error", reject);
    });

    const res = await fetch(`http://localhost:${PORT}/healthz`);
    if (!res.ok) {
      throw new Error(`Expected 200, got ${res.status}`);
    }
    const data = await res.json();
    if (data.status !== "ok") {
      throw new Error(`Expected { status: 'ok' }, got ${JSON.stringify(data)}`);
    }

    console.log("Smoke test passed: server started and /healthz responded with status ok.");
  } finally {
    if (server) {
      server.close();
    }
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Smoke test failed:", err);
    process.exit(1);
  });
