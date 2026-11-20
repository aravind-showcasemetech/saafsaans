// screenshots.mjs: Saves every home and Today section at 1440 and 390 px as compressed JPEGs in
// docs/screenshots/. Run against the built app in demo mode:
//   DEMO=1 PORT=3100 node dist/server/server/server.js   (in another terminal)
//   node scripts/screenshots.mjs [baseUrl] [outDir]
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3100";
const outDir = process.argv[3] ?? "docs/screenshots";
const widths = [1440, 390];
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
for (const width of widths) {
  // bypassCSP lets the script hide the sticky header and progress line so they do not cover sections.
  const page = await browser.newPage({
    viewport: { width, height: width > 600 ? 900 : 844 },
    bypassCSP: true,
  });
  await page.emulateMedia({ reducedMotion: "reduce" });

  for (const [name, url, ready] of [
    ["home", `${base}/`, ".g-section#air"],
    ["today", `${base}/#/demo`, ".swap-card"],
  ]) {
    await page.goto(url);
    await page.waitForSelector(ready);
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: ".site-header,.g-progress{position:static!important}" });
    const ids = await page.$$eval(".g-section", (els) => els.map((e) => e.id));
    for (const id of ids) {
      const section = page.locator(`#${id}`);
      await section.scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);
      const file = path.join(outDir, `${name}-${id}-${width}.jpg`);
      await section.screenshot({ path: file, type: "jpeg", quality: 62 });
    }
  }
  await page.close();
}
await browser.close();

const files = fs.readdirSync(outDir).filter((f) => f.endsWith(".jpg"));
const sizes = files.map((f) => fs.statSync(path.join(outDir, f)).size);
console.log(
  `${files.length} screenshots, largest ${Math.round(Math.max(...sizes) / 1024)} KB, total ${Math.round(sizes.reduce((a, b) => a + b, 0) / 1024)} KB`,
);
