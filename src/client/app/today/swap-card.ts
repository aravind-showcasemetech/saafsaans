// swap-card.ts: One swap: who it helps, what to do, the number, one line explaining the number in
// words ("Grandmother breathes 12% less PM2.5 today"), how we worked it out, and "I'll do this".
// The per-person line comes from computeDayModelSwapImpact, the same model the plan uses.
import { escapeHtml } from "../../../shared/escape.js";
import { getLanguage, t } from "../../home/i18n.js";
import type { PlanSwapItem } from "../api.js";
import { formatIndianNumber, nicknameHtml } from "../format.js";
import { type TodayContext, nameOf } from "./context.js";

const NAME = "\u0000";
const n = (v: number, d = 0) => formatIndianNumber(v, d);

/** A translated line with a nickname placeholder, escaped, then the marked-up nickname put in. */
function withName(key: string, name: string, params: Record<string, string | number>): string {
  return escapeHtml(t(key, { ...params, name: NAME })).replace(NAME, nicknameHtml(name));
}

/** The number explained in words, from the values the plan computed (src/shared on the server). */
export function swapSentence(swap: PlanSwapItem, ctx: TodayContext): string {
  if (swap.kind === "sourcedFact") return escapeHtml(swap.factText ?? "");
  if (swap.kind === "adviceOnly") return escapeHtml(swap.factText ?? t("today.adviceOnly"));
  if (swap.lens === "polluteLess") {
    if (swap.id === "wfh-day")
      return escapeHtml(t("swap.sentenceWeek", { kg: n(swap.co2SavedKgPerWeek ?? 0, 1) }));
    return escapeHtml(
      t("swap.sentenceCo2", {
        day: n(swap.co2SavedKgPerDay ?? 0, 2),
        week: n(swap.co2SavedKgPerWeek ?? 0, 1),
      }),
    );
  }
  if (!swap.best) return "";
  const name = nameOf(ctx, swap.best.memberId);
  if (swap.savingRange) {
    return withName("swap.sentenceMask", name, {
      min: n(swap.savingRange.min),
      max: n(swap.savingRange.max),
      pm: "PM2.5",
    });
  }
  return withName("swap.sentenceProtect", name, {
    percent: n(swap.best.doseCutPercentage),
    pm: "PM2.5",
  });
}

function metricHtml(swap: PlanSwapItem): string {
  if (swap.savingRange) {
    return escapeHtml(
      t("units.maskRange", { min: n(swap.savingRange.min), max: n(swap.savingRange.max) }),
    );
  }
  if (
    swap.kind !== "computed" ||
    swap.savingNumber === undefined ||
    Number.isNaN(swap.savingNumber)
  )
    return "";
  const isPercent = swap.lens === "protect";
  const value = `${n(swap.savingNumber, isPercent ? 0 : 1)}${isPercent ? "%" : ""}`;
  const estimate = swap.isEstimate
    ? ` <span class="tag">${escapeHtml(t("today.estimate"))}</span>`
    : "";
  return `<span class="big-number tabular-nums">${value}</span> <span class="unit">${escapeHtml(t(`units.${swap.id}`))}</span>${estimate}`;
}

export function swapCardHtml(swap: PlanSwapItem, ctx: TodayContext): string {
  const helps = (swap.appliesToMemberIds ?? [])
    .map((id) => nicknameHtml(nameOf(ctx, id)))
    .join(", ");
  const sources = swap.factorSections
    .map((sec) => escapeHtml(t("today.factorLink", { section: sec })))
    .join(", ");
  const metric = metricHtml(swap);
  const checked = ctx.active.has(swap.id);
  return `
    <article class="swap-card${checked ? " is-on" : ""}" data-swap-id="${escapeHtml(swap.id)}" aria-labelledby="swap-${escapeHtml(swap.id)}">
      <h3 class="swap-title" id="swap-${escapeHtml(swap.id)}">${escapeHtml(t(`actions.${swap.id}`, { mask: "N95" }))}</h3>
      ${helps ? `<p class="swap-helps">${t("today.helps", { names: helps })}</p>` : ""}
      ${metric ? `<p class="swap-metric">${metric}</p>` : ""}
      <p class="swap-sentence">${swapSentence(swap, ctx)}</p>
      ${swap.reason ? `<p class="swap-reason muted" lang="${escapeHtml(swap.reasonLang || getLanguage())}">${escapeHtml(swap.reason)}</p>` : ""}
      <details class="explain">
        <summary><span>${escapeHtml(t("today.howWorked"))}</span></summary>
        <p>${escapeHtml(swap.formula || t("today.formulaDefault"))}</p>
        ${sources ? `<p class="muted small">${escapeHtml(t("today.sourcesLabel"))}: <a href="https://github.com/aravind-showcasemetech/saafsaans/blob/main/docs/FACTORS.md" target="_blank" rel="noopener">${sources}</a></p>` : ""}
      </details>
      <label class="toggle">
        <input type="checkbox" class="swap-toggle-cb" data-id="${escapeHtml(swap.id)}" ${checked ? "checked" : ""} />
        <span>${escapeHtml(t("today.doThis"))}</span>
      </label>
    </article>`;
}
