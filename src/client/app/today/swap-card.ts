// swap-card.ts: One swap: who it helps, what to do, the number, one line explaining the number in
// words ("Grandmother breathes 12% less PM2.5 today"), how we worked it out, and "I'll do this".
// The per-person line comes from computeDayModelSwapImpact, the same model the plan uses.
import { getLanguage, t } from "../../home/i18n.js";
import { type SafeHtml, html, htmlWithSlot } from "../../ui/html.js";
import type { PlanSwapItem } from "../api.js";
import { formatIndianNumber, nicknameHtml } from "../format.js";
import { type TodayContext, nameOf } from "./context.js";

const NAME = "\u0000";
const n = (v: number, d = 0) => formatIndianNumber(v, d);
const FACTORS_URL = "https://github.com/aravind-showcasemetech/saafsaans/blob/main/docs/FACTORS.md";

/** A translated line with a nickname placeholder, escaped, then the marked-up nickname put in. */
function withName(key: string, name: string, params: Record<string, string | number>): SafeHtml {
  return htmlWithSlot(t(key, { ...params, name: NAME }), NAME, nicknameHtml(name));
}

/** The number explained in words, from the values the plan computed (src/shared on the server). */
export function swapSentence(swap: PlanSwapItem, ctx: TodayContext): SafeHtml {
  if (swap.kind === "sourcedFact") return html`${swap.factText ?? ""}`;
  if (swap.kind === "adviceOnly") return html`${swap.factText ?? t("today.adviceOnly")}`;
  if (swap.lens === "polluteLess") {
    if (swap.id === "wfh-day")
      return html`${t("swap.sentenceWeek", { kg: n(swap.co2SavedKgPerWeek ?? 0, 1) })}`;
    return html`${t("swap.sentenceCo2", {
      day: n(swap.co2SavedKgPerDay ?? 0, 2),
      week: n(swap.co2SavedKgPerWeek ?? 0, 1),
    })}`;
  }
  if (!swap.best) return html``;
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

function metricHtml(swap: PlanSwapItem): SafeHtml | "" {
  if (swap.savingRange) {
    return html`${t("units.maskRange", { min: n(swap.savingRange.min), max: n(swap.savingRange.max) })}`;
  }
  if (
    swap.kind !== "computed" ||
    swap.savingNumber === undefined ||
    Number.isNaN(swap.savingNumber)
  )
    return "";
  const isPercent = swap.lens === "protect";
  const value = `${n(swap.savingNumber, isPercent ? 0 : 1)}${isPercent ? "%" : ""}`;
  const estimate = swap.isEstimate ? html` <span class="tag">${t("today.estimate")}</span>` : "";
  return html`<span class="big-number tabular-nums">${value}</span> <span class="unit">${t(
    `units.${swap.id}`,
  )}</span>${estimate}`;
}

/** The nicknames a swap helps, comma separated. */
function helpsHtml(swap: PlanSwapItem, ctx: TodayContext): SafeHtml | "" {
  const names = (swap.appliesToMemberIds ?? []).map((id) => nicknameHtml(nameOf(ctx, id)));
  if (names.length === 0) return "";
  const list = html`${names.flatMap((name, i) => (i === 0 ? [name] : [", ", name]))}`;
  return html`<p class="swap-helps">${htmlWithSlot(t("today.helps", { names: NAME }), NAME, list)}</p>`;
}

export function swapCardHtml(swap: PlanSwapItem, ctx: TodayContext): SafeHtml {
  const sources = swap.factorSections
    .map((sec) => t("today.factorLink", { section: sec }))
    .join(", ");
  const metric = metricHtml(swap);
  const checked = ctx.active.has(swap.id);
  const title = t(`actions.${swap.id}`, { mask: "N95" });
  const reason = swap.reason
    ? html`<p class="swap-reason muted" lang="${swap.reasonLang || getLanguage()}">${swap.reason}</p>`
    : "";
  const sourcesLine = sources
    ? html`<p class="muted small">${t("today.sourcesLabel")}: <a href="${FACTORS_URL}" target="_blank"
        rel="noopener">${sources}</a></p>`
    : "";
  return html`
    <article class="swap-card${checked ? " is-on" : ""}" data-swap-id="${swap.id}"
      aria-labelledby="swap-${swap.id}">
      <h3 class="swap-title" id="swap-${swap.id}">${title}</h3>
      ${helpsHtml(swap, ctx)}
      ${metric ? html`<p class="swap-metric">${metric}</p>` : ""}
      <p class="swap-sentence">${swapSentence(swap, ctx)}</p>
      ${reason}
      <details class="explain">
        <summary><span>${t("today.howWorked")}</span></summary>
        <p>${swap.formula || t("today.formulaDefault")}</p>
        ${sourcesLine}
      </details>
      <label class="toggle">
        <input type="checkbox" class="swap-toggle-cb" data-id="${swap.id}" ${checked ? "checked" : ""} />
        <span>${t("today.doThis")}</span>
      </label>
    </article>`;
}
