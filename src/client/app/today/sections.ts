// sections.ts: Today sections 2 to 6 (DESIGN.md section 8): routine, indoor, alternatives, the impact
// of your choices and sharing. Swaps are grouped by their catalogue category.
import { ACTIONS_BY_ID, type ActionCategory } from "../../../shared/actions.js";
import { t } from "../../home/i18n.js";
import { calculatorHtml } from "../../ui/calculator.js";
import { forecastChartHtml } from "../../ui/diagrams/forecast.js";
import { type SafeHtml, html } from "../../ui/html.js";
import { actionButton, guideSection, stepLabel, whatIsThis } from "../../ui/section.js";
import { placeLabel } from "../format.js";
import { TODAY_STEPS, type TodayContext } from "./context.js";
import { REFINE_MAX } from "./refine.js";
import { swapCardHtml } from "./swap-card.js";

function swapsFor(ctx: TodayContext, category: ActionCategory): SafeHtml {
  const swaps = ctx.plan.swaps.filter((s) => ACTIONS_BY_ID[s.id]?.category === category);
  if (swaps.length === 0) return html`<p class="muted">${t(`todayG.none.${category}`)}</p>`;
  return html`<div class="swap-list">${swaps.map((s) => swapCardHtml(s, ctx))}</div>`;
}

export function routineSection(ctx: TodayContext): SafeHtml {
  const chart = forecastChartHtml(ctx.air.hourlyForecast, ctx.cleanest, ctx.dirtiest);
  return guideSection({
    id: "routine",
    stepLabel: stepLabel(2, TODAY_STEPS),
    icon: "clock",
    title: t("todayG.routine.title"),
    shows: t("todayG.routine.shows"),
    can: t("todayG.routine.can"),
    content: html`${chart}${swapsFor(ctx, "routine")}`,
    actions: ctx.cleanest
      ? actionButton({ label: t("todayG.routine.action"), id: "today-ics", icon: "calendar" })
      : html``,
  });
}

export function indoorSection(ctx: TodayContext): SafeHtml {
  const side = Math.sqrt(ctx.profile.home.bedroomAreaSqFt);
  const room = { lengthFt: side, widthFt: side, heightFt: ctx.profile.home.ceilingHeightFt };
  return guideSection({
    id: "indoor",
    stepLabel: stepLabel(3, TODAY_STEPS),
    icon: "house",
    title: t("todayG.indoor.title"),
    shows: t("todayG.indoor.shows"),
    can: t("todayG.indoor.can"),
    content: html`
      ${swapsFor(ctx, "indoor")}
      <div class="panel">
        <h3 class="list-title">${t("todayG.indoor.calcTitle")}</h3>
        ${whatIsThis("cadr")}
        ${calculatorHtml("today", room)}
      </div>`,
    actions: html`<p class="muted small">${t("home.indoor.actionHint")}</p>`,
  });
}

export function alternativesSection(ctx: TodayContext): SafeHtml {
  return guideSection({
    id: "alternatives",
    stepLabel: stepLabel(4, TODAY_STEPS),
    icon: "train-front",
    title: t("todayG.alt.title"),
    shows: t("todayG.alt.shows"),
    can: t("todayG.alt.can"),
    content: html`${swapsFor(ctx, "alternative")}${whatIsThis("estimate")}`,
    actions: actionButton({
      label: t("todayG.alt.action"),
      href: "#/setup?step=travel",
      icon: "train-front",
    }),
  });
}

/** "Tell us what changed": free text that Gemini turns into profile changes. */
function refineHtml(): SafeHtml {
  return html`
        <details class="refine" id="refine-box">
          <summary><span>${t("today.refineTitle")}</span></summary>
          <p class="muted" id="refine-help">${t("today.refineHelp")}</p>
          <label for="refine-input" class="field-label">${t("today.refineLabel")}</label>
          <textarea id="refine-input" class="input" rows="3" maxlength="${REFINE_MAX}"
            aria-describedby="refine-help refine-char-count"
            placeholder="${t("today.refinePlaceholder")}"></textarea>
          <p id="refine-char-count" class="muted small">${t("today.charsLeft", { count: REFINE_MAX })}</p>
          ${actionButton({ label: t("today.updatePlan"), id: "btn-submit-refine", kind: "secondary" })}
          <p id="refine-status" class="error-text" role="status"></p>
        </details>`;
}

export function impactSection(): SafeHtml {
  const content = html`
    <div class="two-col">
      <div class="stack">
        <div id="today-totals" class="panel" aria-live="polite"></div>
        ${whatIsThis("dose")}
        ${whatIsThis("cigarettes")}
      </div>
      <div class="stack">
        ${refineHtml()}
        <div class="notice">
          <p><strong>${t("today.notMedicalTitle")}</strong> ${t("today.notMedicalText")}</p>
          <p>${t("today.doctor")}</p>
        </div>
      </div>
    </div>`;
  return guideSection({
    id: "impact",
    stepLabel: stepLabel(5, TODAY_STEPS),
    icon: "chart-column",
    title: t("todayG.impact.title"),
    shows: t("todayG.impact.shows"),
    can: t("todayG.impact.can"),
    content,
    actions: actionButton({
      label: t("todayG.impact.action"),
      id: "open-refine",
      kind: "secondary",
    }),
  });
}

export function shareSection(ctx: TodayContext, waUrl: string): SafeHtml {
  return guideSection({
    id: "share",
    stepLabel: stepLabel(6, TODAY_STEPS),
    icon: "share",
    title: t("todayG.share.title"),
    shows: t("todayG.share.shows"),
    can: t("todayG.share.can"),
    content: html`
      <p>${t("todayG.share.line", { area: placeLabel(ctx.location.name) })}</p>
      <p><a href="#/share">${t("todayG.share.more")}</a></p>`,
    actions: html`${actionButton({
      label: t("share.waButton"),
      href: waUrl,
      icon: "share",
      id: "whatsapp-share-btn",
      newTab: true,
    })}${actionButton({
      label: t("todayG.share.print"),
      id: "btn-print-plan",
      icon: "printer",
      kind: "secondary",
    })}`,
  });
}
