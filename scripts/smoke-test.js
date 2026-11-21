// smoke-test.js: Checks a running SaafSaans: health, security headers, the page, live data routes.
// With SMOKE_URL set (a container or the deployed app) it tests that URL; otherwise it starts the
// built app in this process on a spare port. URL mode needs no installed dependencies.
const PORT = 3009;

async function check(base) {
  const fail = (msg) => {
    throw new Error(msg);
  };

  // /api/healthz works everywhere; Cloud Run reserves /healthz for itself.
  const health = await fetch(`${base}/api/healthz`);
  if (!health.ok) fail(`/api/healthz returned ${health.status}`);
  if ((await health.json()).status !== "ok") fail("/api/healthz did not say ok");

  for (const header of [
    "content-security-policy",
    "strict-transport-security",
    "x-content-type-options",
    "referrer-policy",
    "permissions-policy",
    "cross-origin-opener-policy",
  ]) {
    if (!health.headers.get(header)) fail(`missing ${header} header`);
  }

  const page = await fetch(`${base}/`);
  const html = await page.text();
  if (!(page.ok && html.includes('<div id="app">')))
    fail(`/ did not serve the app (${page.status})`);
  const script = html.match(/src="(\/assets\/index-[\w-]+\.js)"/)?.[1];
  if (!script) fail("no hashed script in index.html");
  const asset = await fetch(`${base}${script}`);
  if (!asset.ok) fail(`${script} returned ${asset.status}`);
  if (!asset.headers.get("cache-control")?.includes("immutable")) fail("assets are not immutable");

  const areas = await fetch(`${base}/api/air/areas`);
  if (!areas.ok) fail(`/api/air/areas returned ${areas.status}`);
  const list = await areas.json();
  if (!Array.isArray(list) || list.length === 0) fail("/api/air/areas returned no areas");

  const demo = await fetch(`${base}/api/demo/households`);
  if (!demo.ok) fail(`/api/demo/households returned ${demo.status}`);

  console.log(`Smoke test passed against ${base}: health, headers, page, assets and data routes.`);
}

async function run() {
  if (process.env.SMOKE_URL) {
    await check(process.env.SMOKE_URL.replace(/\/$/, ""));
    return;
  }
  const { serve } = await import("@hono/node-server");
  const { app } = await import("../dist/server/server/app.js");
  let server;
  try {
    await new Promise((resolve, reject) => {
      server = serve({ fetch: app.fetch, port: PORT }, resolve);
      server.on("error", reject);
    });
    await check(`http://localhost:${PORT}`);
  } finally {
    server?.close();
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Smoke test failed:", err.message);
    process.exit(1);
  });
