// fixtures.ts: Every e2e test fails on any Content Security Policy violation on any screen.
import { test as base, expect } from "@playwright/test";

export const test = base.extend<{ cspGuard: undefined }>({
  cspGuard: [
    async ({ page }, use) => {
      const violations: string[] = [];
      page.on("console", (msg) => {
        if (/Content Security Policy|Refused to (load|apply|execute|connect)/i.test(msg.text())) {
          violations.push(msg.text());
        }
      });
      await page.exposeFunction("__reportCsp", (text: string) => violations.push(text));
      await page.addInitScript(() => {
        document.addEventListener("securitypolicyviolation", (e) => {
          const report = (window as unknown as { __reportCsp: (t: string) => void }).__reportCsp;
          report(`${e.violatedDirective} blocked ${e.blockedURI || "inline"}`);
        });
      });

      await use(undefined);

      expect(violations, `CSP violations:\n${violations.join("\n")}`).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** Opens the home page, then the demo family's Today, as a visitor would. */
export async function openDemoFamily(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/");
  await page.waitForSelector("#start .g-title");
  await page.locator("a[href='#/demo']").first().click();
  await page.waitForSelector(".swap-card");
}
