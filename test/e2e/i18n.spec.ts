import type { Page } from "@playwright/test";
import { expect, openDemoFamily, test } from "./fixtures";

// Words kept as written in every language (AGENTS.md rule 7 and the brand wordmark).
const ALLOWLIST = [
  "SaafSaans",
  "AQI",
  "PM2.5",
  "CO2",
  "CO₂",
  "CPCB",
  "Google",
  "Gemini",
  "WhatsApp",
  "metro",
  "purifier",
];

const SCRIPTS = { hi: "Devanagari", te: "Telugu" } as const;

/** Share of letters on screen in the target script, ignoring nicknames, numbers and the allowlist. */
async function scriptShare(page: Page, script: string): Promise<{ share: number; sample: string }> {
  return page.evaluate(
    ({ script, allowlist }) => {
      // Count every section, including those content-visibility skips until they are near the screen.
      for (const el of document.querySelectorAll<HTMLElement>("*")) {
        if (getComputedStyle(el).contentVisibility === "auto")
          el.style.contentVisibility = "visible";
      }
      const clone = document.body.cloneNode(true) as HTMLElement;
      for (const el of clone.querySelectorAll(".nickname, script, style")) el.remove();
      document.body.appendChild(clone);
      clone.style.position = "absolute";
      let text = clone.innerText;
      clone.remove();
      for (const word of allowlist) {
        text = text.split(new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")).join(" ");
      }
      const target = text.match(new RegExp(`\\p{Script=${script}}`, "gu"))?.length ?? 0;
      const latin = text.match(/\p{Script=Latin}/gu)?.length ?? 0;
      const latinWords = Array.from(new Set(text.match(/\p{Script=Latin}+/gu) ?? [])).slice(0, 40);
      return { share: target / Math.max(1, target + latin), sample: latinWords.join(" ") };
    },
    { script, allowlist: ALLOWLIST },
  );
}

for (const lang of ["hi", "te"] as const) {
  test.describe(`Every screen reads in ${lang}`, () => {
    const screens = [
      { name: "home", path: `/?lang=${lang}`, ready: "#air .g-title" },
      { name: "setup", path: `/#/setup?lang=${lang}`, ready: "#place-search-input" },
      { name: "today", path: `/#/today?lang=${lang}`, ready: ".swap-card" },
      { name: "share", path: `/#/share?lang=${lang}`, ready: "#whatsapp-share-btn" },
    ];

    for (const screen of screens) {
      test(`${screen.name} is at least 60% ${SCRIPTS[lang]} script`, async ({ page }) => {
        await openDemoFamily(page);
        await page.goto(screen.path);
        await page.waitForSelector(screen.ready);
        await expect(page.locator("html")).toHaveAttribute("lang", lang);

        const { share, sample } = await scriptShare(page, SCRIPTS[lang]);
        expect(
          share,
          `${screen.name} in ${lang}: ${Math.round(share * 100)}% ${SCRIPTS[lang]}. Latin words: ${sample}`,
        ).toBeGreaterThanOrEqual(0.6);
      });
    }
  });
}
