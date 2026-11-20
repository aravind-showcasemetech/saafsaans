// totals.ts: Family totals for today, as a side column on desktop and a slim bar on phones.
import { t } from "../../home/i18n.js";
import { formatIndianNumber, nicknameHtml } from "../format.js";
import type { recomputeHouseholdTotals } from "../recompute.js";

export function totalsHtml(
  totals: ReturnType<typeof recomputeHouseholdTotals>,
  nameOf: (id: string) => string,
  expanded: boolean,
): string {
  const maxDoseCut = totals.memberDoses.length
    ? Math.max(...totals.memberDoses.map((m) => Math.round(m.doseCutPercentage)))
    : 0;
  const weeklyCo2 = formatIndianNumber(totals.householdCo2WeeklyKg, 1);
  const members = totals.memberDoses
    .map(
      (m) => `
      <div class="side-col-member-row">
        <div class="side-col-member-name">${nicknameHtml(nameOf(m.memberId))}</div>
        <div class="side-col-metric-row"><span class="text-ink-2">${t("totals.doseCut")}:</span> <strong class="tabular-nums">${Math.round(m.doseCutPercentage)}%</strong></div>
        <div class="side-col-metric-row-sm"><span class="text-ink-2">${t("totals.cigarettes")}:</span> <strong class="tabular-nums">${formatIndianNumber(m.cigarettesAvoided, 1)}</strong></div>
      </div>`,
    )
    .join("");
  return `
    <h2 class="section-label desktop-only-totals-header">${t("totals.label")}</h2>
    <div class="mobile-only-totals-bar">
      <div class="totals-mobile-bar">
        <div class="totals-mobile-headline">
          <span>${t("totals.doseCut")}: <strong class="tabular-nums">${maxDoseCut}%</strong></span>
          <span>${t("totals.co2Short")}: <strong class="tabular-nums">${weeklyCo2} ${t("totals.perWeek")}</strong></span>
        </div>
        <button type="button" id="btn-toggle-totals-details" class="btn btn-secondary btn-sm" aria-expanded="${expanded}" aria-controls="totals-list">
          ${expanded ? t("totals.hideDetails") : t("totals.details")}
        </button>
      </div>
    </div>
    <div class="side-col-list" id="totals-list">
      ${members}
      <div class="side-col-co2-wrap">
        <div class="side-col-co2-label">${t("totals.co2")}</div>
        <div class="side-col-co2-val tabular-nums">${weeklyCo2} <span class="swap-unit-subtext">${t("totals.perWeek")}</span></div>
      </div>
    </div>`;
}
