// sections-b.ts: Home sections 4 to 8: sustainable alternatives, the impact of your choices,
// sharing with your community, how the numbers are worked out, and the final call to action.
import { escapeHtml } from "../../shared/escape.js";
import { formatIndianNumber, placeLabel } from "../app/format.js";
import { buildWhatsAppShareText } from "../app/share-utils.js";
import { tripDiagramHtml } from "../ui/diagrams/trip.js";
import { actionButton, guideSection, stepLabel, whatIsThis } from "../ui/section.js";
import { t } from "./i18n.js";
import { type HomeModel, reddysTotals } from "./model.js";
import { HOME_STEPS } from "./sections-a.js";

const n = (v: number, d = 0) => formatIndianNumber(v, d);
const e = escapeHtml;
const FACTORS_URL = "https://github.com/aravind-showcasemetech/saafsaans/blob/main/docs/FACTORS.md";

export function alternativesSection(m: HomeModel): string {
  const c = m.reddys.profile.commute;
  const content = `
    ${tripDiagramHtml({ ...m.trip, from: placeLabel(c.startPlace ?? ""), to: placeLabel(c.endPlace ?? "") })}
    ${whatIsThis("estimate")}`;
  return guideSection({
    id: "alternatives",
    stepLabel: stepLabel(4, HOME_STEPS),
    icon: "train-front",
    title: t("home.alt.title"),
    shows: t("home.alt.shows"),
    can: t("home.alt.can"),
    content,
    actions: actionButton({
      label: t("home.alt.action"),
      href: "#/setup?step=travel",
      icon: "train-front",
    }),
  });
}

/** The Reddys' per-person table, with or without the bedroom purifier. */
export function impactTableHtml(m: HomeModel, swapOn: boolean): string {
  const rows = reddysTotals(m, swapOn)
    .map(
      (p) => `
      <tr>
        <th scope="row">${e(t(`people.${m.reddys.roles[p.memberId] ?? "adult"}`))}</th>
        <td class="tabular-nums">${n(p.withSwapsCigarettes, 1)}</td>
        <td class="tabular-nums${p.doseCutPercentage > 0 ? " is-better" : ""}">${e(t("impact.cut", { percent: n(p.doseCutPercentage) }))}</td>
      </tr>`,
    )
    .join("");
  return `
    <table class="data-table">
      <caption>${e(t(swapOn ? "home.impact.captionOn" : "home.impact.captionOff"))}</caption>
      <thead><tr><th scope="col">${e(t("home.impact.person"))}</th><th scope="col">${e(t("totals.cigarettes"))}</th><th scope="col">${e(t("totals.doseCut"))}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

export function impactSection(m: HomeModel): string {
  const content = `
    <div class="two-col">
      <div class="stack">
        <p>${e(t("home.impact.intro"))}</p>
        <label class="toggle">
          <input type="checkbox" id="home-impact-toggle" />
          <span>${e(t("home.impact.toggle"))}</span>
        </label>
        ${whatIsThis("cigarettes")}
      </div>
      <div id="home-impact-table" aria-live="polite">${impactTableHtml(m, false)}</div>
    </div>`;
  return guideSection({
    id: "impact",
    stepLabel: stepLabel(5, HOME_STEPS),
    icon: "chart-column",
    title: t("home.impact.title"),
    shows: t("home.impact.shows"),
    can: t("home.impact.can"),
    content,
    actions: actionButton({ label: t("home.impact.action"), href: "#/setup", icon: "users" }),
  });
}

export function communitySection(m: HomeModel, origin: string): string {
  const cm = m.community;
  const name = t("demoHouseholds.green-meadows.name");
  const waText = cm
    ? buildWhatsAppShareText([
        t("home.community.waTitle", { society: name }),
        t("home.community.waLine", { homes: n(cm.homes), kg: n(cm.weeklyKgTotal) }),
        t("share.waLink", { url: origin }),
      ])
    : "";
  const content = cm
    ? `
    <div class="panel society">
      <p class="panel-label">${e(name)}</p>
      <p><span class="big-number tabular-nums">${e(t("common.kgCo2", { value: n(cm.weeklyKgTotal) }))}</span></p>
      <p>${e(t("home.community.line", { homes: n(cm.homes), perHome: n(cm.weeklyKgPerHome, 1) }))}</p>
      <p class="muted small">${e(t("home.community.burning"))}</p>
    </div>`
    : "";
  return guideSection({
    id: "community",
    stepLabel: stepLabel(6, HOME_STEPS),
    icon: "share",
    title: t("home.community.title"),
    shows: t("home.community.shows"),
    can: t("home.community.can"),
    content,
    actions:
      (cm
        ? actionButton({
            label: t("share.waButton"),
            href: `https://wa.me/?text=${encodeURIComponent(waText)}`,
            icon: "share",
            id: "home-wa",
            attrs: 'target="_blank" rel="noopener"',
          })
        : "") +
      actionButton({ label: t("hero.setUpHousehold"), href: "#/setup", kind: "secondary" }),
  });
}

export function methodSection(): string {
  const sources = ["cpcb", "epa", "berkeley", "aham", "ghg", "cea", "cse", "google"]
    .map((k) => `<li>${e(t(`sources.${k}`))}</li>`)
    .join("");
  const content = `
    <div class="two-col">
      <div class="stack">
        <p class="key-line">${e(t("home.method.ai"))}</p>
        <p>${e(t("home.method.code"))}</p>
        <p>${e(t("home.method.estimates"))}</p>
        ${whatIsThis("estimate")}
      </div>
      <div class="stack">
        <h3 class="list-title">${e(t("sources.title"))}</h3>
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
      attrs: 'target="_blank" rel="noopener"',
    }),
  });
}

export function finalSection(): string {
  return guideSection({
    id: "next",
    stepLabel: t("home.final.label"),
    icon: "arrow-right",
    title: t("finalCta.title"),
    shows: t("home.final.shows"),
    can: t("home.final.can"),
    content: `<p class="lead">${e(t("finalCta.desc"))}</p>`,
    actions:
      actionButton({ label: t("hero.tryHyderabad"), href: "#/demo", icon: "users" }) +
      actionButton({ label: t("hero.setUpHousehold"), href: "#/setup", kind: "secondary" }),
  });
}
