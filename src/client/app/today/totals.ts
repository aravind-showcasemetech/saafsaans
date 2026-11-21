// totals.ts: Family totals for today in section 5: each person's dose cut and cigarettes' worth
// avoided, and household CO2 avoided a week, recomputed in the browser as swaps are ticked.
import { t } from "../../home/i18n.js";
import { type SafeHtml, html } from "../../ui/html.js";
import { formatIndianNumber, nicknameHtml } from "../format.js";
import type { recomputeHouseholdTotals } from "../recompute.js";

export function totalsHtml(
  totals: ReturnType<typeof recomputeHouseholdTotals>,
  nameOf: (id: string) => string,
  ticked: number,
): SafeHtml {
  const rows = totals.memberDoses.map(
    (m) => html`
      <tr>
        <th scope="row">${nicknameHtml(nameOf(m.memberId))}</th>
        <td class="tabular-nums${m.doseCutPercentage > 0 ? " is-better" : ""}">${Math.round(
          m.doseCutPercentage,
        )}%</td>
        <td class="tabular-nums">${formatIndianNumber(m.cigarettesAvoided, 1)}</td>
      </tr>`,
  );
  const co2 = formatIndianNumber(totals.householdCo2WeeklyKg, 1);
  return html`
    <h3 class="list-title">${t("totals.label")}</h3>
    <p class="muted small">${t("todayG.impact.ticked", { count: ticked })}</p>
    <table class="data-table" id="totals-list">
      <thead><tr><th scope="col">${t("home.impact.person")}</th><th scope="col">${t(
        "totals.doseCut",
      )}</th><th scope="col">${t("totals.cigarettes")}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="muted small totals-note">${t("totals.indoorNote")}</p>
    <p class="co2-total">${t("totals.co2")}: <span
      class="big-number tabular-nums side-col-co2-val">${co2}</span> <span
      class="unit">${t("totals.perWeek")}</span></p>`;
}
