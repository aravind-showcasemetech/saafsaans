// impact.ts: Home step 5, the impact of your choices: the Reddys' per-person cigarettes' worth and
// dose cut, with and without the bedroom purifier.
import { formatIndianNumber } from "../../app/format.js";
import { type SafeHtml, html } from "../../ui/html.js";
import { actionButton, guideSection, stepLabel, whatIsThis } from "../../ui/section.js";
import { t } from "../i18n.js";
import { HOME_STEPS, type HomeModel, reddysTotals } from "../model.js";

const n = (v: number, d = 0) => formatIndianNumber(v, d);

/** The Reddys' per-person table, with or without the bedroom purifier. */
export function impactTableHtml(m: HomeModel, swapOn: boolean): SafeHtml {
  const rows = reddysTotals(m, swapOn).map(
    (p) => html`
      <tr>
        <th scope="row">${t(`people.${m.reddys.roles[p.memberId] ?? "adult"}`)}</th>
        <td class="tabular-nums">${n(p.withSwapsCigarettes, 1)}</td>
        <td class="tabular-nums${p.doseCutPercentage > 0 ? " is-better" : ""}">${t("impact.cut", {
          percent: n(p.doseCutPercentage),
        })}</td>
      </tr>`,
  );
  return html`
    <table class="data-table">
      <caption>${t(swapOn ? "home.impact.captionOn" : "home.impact.captionOff")}</caption>
      <thead><tr><th scope="col">${t("home.impact.person")}</th><th scope="col">${t(
        "totals.cigarettes",
      )}</th><th scope="col">${t("totals.doseCut")}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

export function impactSection(m: HomeModel): SafeHtml {
  const content = html`
    <div class="two-col">
      <div class="stack">
        <p>${t("home.impact.intro")}</p>
        <label class="toggle">
          <input type="checkbox" id="home-impact-toggle" />
          <span>${t("home.impact.toggle")}</span>
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
