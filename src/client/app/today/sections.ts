// sections.ts: Today sections 2 to 6 (DESIGN.md section 8): routine, indoor, alternatives, the impact
// of your choices and sharing. Swaps are grouped by their catalogue category.
import { ACTIONS_BY_ID, type ActionCategory } from "../../../shared/actions.js";
import { escapeHtml } from "../../../shared/escape.js";
import { t } from "../../home/i18n.js";
import { calculatorHtml } from "../../ui/calculator.js";
import { forecastChartHtml } from "../../ui/diagrams/forecast.js";
import { actionButton, guideSection, stepLabel, whatIsThis } from "../../ui/section.js";
import { placeLabel } from "../format.js";
import { TODAY_STEPS, type TodayContext } from "./context.js";
import { REFINE_MAX } from "./refine.js";
import { swapCardHtml } from "./swap-card.js";

const e = escapeHtml;

function swapsFor(ctx: TodayContext, category: ActionCategory): string {
  const swaps = ctx.plan.swaps.filter((s) => ACTIONS_BY_ID[s.id]?.category === category);
  if (swaps.length === 0) return `<p class="muted">${e(t(`todayG.none.${category}`))}</p>`;
  return `<div class="swap-list">${swaps.map((s) => swapCardHtml(s, ctx)).join("")}</div>`;
}

export function routineSection(ctx: TodayContext): string {
  return guideSection({
    id: "routine",
    stepLabel: stepLabel(2, TODAY_STEPS),
    icon: "clock",
    title: t("todayG.routine.title"),
    shows: t("todayG.routine.shows"),
    can: t("todayG.routine.can"),
    content: `${forecastChartHtml(ctx.air.hourlyForecast, ctx.cleanest, ctx.dirtiest)}${swapsFor(ctx, "routine")}`,
    actions: ctx.cleanest
      ? actionButton({ label: t("todayG.routine.action"), id: "today-ics", icon: "calendar" })
      : "",
  });
}

export function indoorSection(ctx: TodayContext): string {
  const side = Math.sqrt(ctx.profile.home.bedroomAreaSqFt);
  return guideSection({
    id: "indoor",
    stepLabel: stepLabel(3, TODAY_STEPS),
    icon: "house",
    title: t("todayG.indoor.title"),
    shows: t("todayG.indoor.shows"),
    can: t("todayG.indoor.can"),
    content: `
      ${swapsFor(ctx, "indoor")}
      <div class="panel">
        <h3 class="list-title">${e(t("todayG.indoor.calcTitle"))}</h3>
        ${whatIsThis("cadr")}
        ${calculatorHtml("today", { lengthFt: side, widthFt: side, heightFt: ctx.profile.home.ceilingHeightFt })}
      </div>`,
    actions: `<p class="muted small">${e(t("home.indoor.actionHint"))}</p>`,
  });
}

export function alternativesSection(ctx: TodayContext): string {
  return guideSection({
    id: "alternatives",
    stepLabel: stepLabel(4, TODAY_STEPS),
    icon: "train-front",
    title: t("todayG.alt.title"),
    shows: t("todayG.alt.shows"),
    can: t("todayG.alt.can"),
    content: `${swapsFor(ctx, "alternative")}${whatIsThis("estimate")}`,
    actions: actionButton({
      label: t("todayG.alt.action"),
      href: "#/setup?step=travel",
      icon: "train-front",
    }),
  });
}

export function impactSection(): string {
  const content = `
    <div class="two-col">
      <div class="stack">
        <div id="today-totals" class="panel" aria-live="polite"></div>
        ${whatIsThis("dose")}
        ${whatIsThis("cigarettes")}
      </div>
      <div class="stack">
        <details class="refine" id="refine-box">
          <summary><span>${e(t("today.refineTitle"))}</span></summary>
          <p class="muted" id="refine-help">${e(t("today.refineHelp"))}</p>
          <label for="refine-input" class="field-label">${e(t("today.refineLabel"))}</label>
          <textarea id="refine-input" class="input" rows="3" maxlength="${REFINE_MAX}" aria-describedby="refine-help refine-char-count" placeholder="${e(t("today.refinePlaceholder"))}"></textarea>
          <p id="refine-char-count" class="muted small">${e(t("today.charsLeft", { count: REFINE_MAX }))}</p>
          ${actionButton({ label: t("today.updatePlan"), id: "btn-submit-refine", kind: "secondary" })}
          <p id="refine-status" class="error-text" role="status"></p>
        </details>
        <div class="notice">
          <p><strong>${e(t("today.notMedicalTitle"))}</strong> ${e(t("today.notMedicalText"))}</p>
          <p>${e(t("today.doctor"))}</p>
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

export function shareSection(ctx: TodayContext, waUrl: string): string {
  return guideSection({
    id: "share",
    stepLabel: stepLabel(6, TODAY_STEPS),
    icon: "share",
    title: t("todayG.share.title"),
    shows: t("todayG.share.shows"),
    can: t("todayG.share.can"),
    content: `
      <p>${e(t("todayG.share.line", { area: placeLabel(ctx.location.name) }))}</p>
      <p><a href="#/share">${e(t("todayG.share.more"))}</a></p>`,
    actions:
      actionButton({
        label: t("share.waButton"),
        href: waUrl,
        icon: "share",
        id: "whatsapp-share-btn",
        attrs: 'target="_blank" rel="noopener"',
      }) +
      actionButton({
        label: t("todayG.share.print"),
        id: "btn-print-plan",
        icon: "printer",
        kind: "secondary",
      }),
  });
}
