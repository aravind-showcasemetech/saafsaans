// totals.ts: Family totals for today in section 5: each person's dose cut and cigarettes' worth
// avoided, and household CO2 avoided a week, recomputed in the browser as swaps are ticked.
import { escapeHtml } from "../../../shared/escape.js";
import { t } from "../../home/i18n.js";
import { formatIndianNumber, nicknameHtml } from "../format.js";
import type { recomputeHouseholdTotals } from "../recompute.js";

export function totalsHtml(
  totals: ReturnType<typeof recomputeHouseholdTotals>,
  nameOf: (id: string) => string,
  ticked: number,
): string {
  const rows = totals.memberDoses
    .map(
      (m) => `
      <tr>
        <th scope="row">${nicknameHtml(nameOf(m.memberId))}</th>
        <td class="tabular-nums${m.doseCutPercentage > 0 ? " is-better" : ""}">${Math.round(m.doseCutPercentage)}%</td>
        <td class="tabular-nums">${formatIndianNumber(m.cigarettesAvoided, 1)}</td>
      </tr>`,
    )
    .join("");
  return `
    <h3 class="list-title">${escapeHtml(t("totals.label"))}</h3>
    <p class="muted small">${escapeHtml(t("todayG.impact.ticked", { count: ticked }))}</p>
    <table class="data-table" id="totals-list">
      <thead><tr><th scope="col">${escapeHtml(t("home.impact.person"))}</th><th scope="col">${escapeHtml(t("totals.doseCut"))}</th><th scope="col">${escapeHtml(t("totals.cigarettes"))}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="co2-total">${escapeHtml(t("totals.co2"))}: <span class="big-number tabular-nums side-col-co2-val">${formatIndianNumber(totals.householdCo2WeeklyKg, 1)}</span> <span class="unit">${escapeHtml(t("totals.perWeek"))}</span></p>`;
}
