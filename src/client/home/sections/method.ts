// method.ts: Home step 7, how the numbers are worked out: Gemini picks and explains, tested code
// computes, and the sources every figure comes from.
import { type SafeHtml, html } from "../../ui/html.js";
import { actionButton, guideSection, stepLabel, whatIsThis } from "../../ui/section.js";
import { t } from "../i18n.js";
import { HOME_STEPS } from "../model.js";

const FACTORS_URL = "https://github.com/aravind-showcasemetech/saafsaans/blob/main/docs/FACTORS.md";
const SOURCES = ["cpcb", "epa", "berkeley", "aham", "ghg", "cea", "cse", "google"];

export function methodSection(): SafeHtml {
  const sources = SOURCES.map((k) => html`<li>${t(`sources.${k}`)}</li>`);
  const content = html`
    <div class="two-col">
      <div class="stack">
        <p class="key-line">${t("home.method.ai")}</p>
        <p>${t("home.method.code")}</p>
        <p>${t("home.method.estimates")}</p>
        ${whatIsThis("estimate")}
      </div>
      <div class="stack">
        <h3 class="list-title">${t("sources.title")}</h3>
        <ul class="source-list">${sources}</ul>
      </div>
    </div>`;
  return guideSection({
    id: "method",
    stepLabel: stepLabel(7, HOME_STEPS),
    icon: "book-open",
    title: t("home.method.title"),
    shows: t("home.method.shows"),
    can: t("home.method.can"),
    content,
    actions: actionButton({
      label: t("home.method.action"),
      href: FACTORS_URL,
      icon: "book-open",
      newTab: true,
    }),
  });
}
