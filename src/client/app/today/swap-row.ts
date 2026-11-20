// swap-row.ts: One swap row: title, who it helps, the number, why, how we worked it out, toggle.
import { escapeHtml } from "../../../shared/escape.js";
import { getLanguage, t } from "../../home/i18n.js";
import type { PlanSwapItem } from "../api.js";
import { formatIndianNumber, nicknameHtml } from "../format.js";

function swapMetricHtml(swap: PlanSwapItem): string {
  if (swap.savingRange) {
    return t("units.maskRange", {
      min: formatIndianNumber(swap.savingRange.min),
      max: formatIndianNumber(swap.savingRange.max),
    });
  }
  if (swap.kind === "sourcedFact" && swap.factText) return escapeHtml(swap.factText);
  if (swap.kind === "adviceOnly") return "";
  if (swap.savingNumber === undefined || Number.isNaN(swap.savingNumber)) return "";
  const isPercent = swap.lens === "protect";
  const value = formatIndianNumber(swap.savingNumber, isPercent ? 0 : 1);
  const estimate = swap.isEstimate
    ? ` <span class="swap-estimate-badge">(${t("today.estimate")})</span>`
    : "";
  return `${value}${isPercent ? "%" : ""} <span class="swap-unit-subtext">${t(`units.${swap.id}`)}</span>${estimate}`;
}

export function swapRowHtml(
  swap: PlanSwapItem,
  checked: boolean,
  nameOf: (id: string) => string,
): string {
  const lang = getLanguage();
  const helps = (swap.appliesToMemberIds ?? []).map((id) => nicknameHtml(nameOf(id))).join(", ");
  const sources = (swap.factorSections ?? [])
    .map(
      (sec) =>
        `<a href="https://github.com/aravind-showcasemetech/saafsaans/blob/main/docs/FACTORS.md" target="_blank" rel="noopener">${t("today.factorLink", { section: escapeHtml(sec) })}</a>`,
    )
    .join(", ");
  const metric = swapMetricHtml(swap);
  // The plan is requested in the current language, so the reason (Gemini or template) is in it too.
  const reasonLang = swap.reasonLang || lang;
  return `
    <div class="swap-row" data-swap-id="${escapeHtml(swap.id)}">
      <div class="swap-row-header">
        <div class="flex-1">
          <h3 class="swap-title">${escapeHtml(t(`actions.${swap.id}`, { mask: "N95" }))}</h3>
          ${helps ? `<div class="swap-helps-who">${t("today.helps", { names: helps })}</div>` : ""}
        </div>
        <label class="checkbox-label-xs">
          <input type="checkbox" class="swap-toggle-cb" data-id="${escapeHtml(swap.id)}" ${checked ? "checked" : ""} />
          <span>${t("today.doThis")}</span>
        </label>
      </div>
      ${metric ? `<div class="swap-number-tabular">${metric}</div>` : ""}
      ${swap.kind === "adviceOnly" ? `<div class="swap-unit-subtext">${t("today.adviceOnly")}</div>` : ""}
      <p lang="${escapeHtml(reasonLang)}" class="swap-reason-text">${escapeHtml(swap.reason || "")}</p>
      <details class="swap-details">
        <summary>${t("today.howWorked")}</summary>
        <div class="swap-details-content">
          <div>${escapeHtml(swap.formula || t("today.formulaDefault"))}</div>
          ${sources ? `<div class="swap-details-sources">${t("today.sourcesLabel")}: ${sources}</div>` : ""}
        </div>
      </details>
    </div>`;
}
