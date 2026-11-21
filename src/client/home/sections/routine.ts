// routine.ts: Home step 2, a low-emission routine: the hourly forecast with its cleanest and
// dirtiest windows, and one person's walk moved to the cleanest window.
import { hourLabel, windowText } from "../../app/format.js";
import { dayHoursHtml } from "../../ui/diagrams/day-hours.js";
import { forecastChartHtml } from "../../ui/diagrams/forecast.js";
import { type SafeHtml, html } from "../../ui/html.js";
import { actionButton, guideSection, stepLabel, whatIsThis } from "../../ui/section.js";
import { t } from "../i18n.js";
import { HOME_STEPS, type HomeModel } from "../model.js";

export function routineSection(m: HomeModel): SafeHtml {
  const w = m.walk;
  const walk = w
    ? dayHoursHtml({ ...w, name: t(`people.${w.role}`) })
    : html`<p class="muted">${t("today.noWindow")}</p>`;
  const walkLine = w
    ? html`<p>${t("home.routine.walkLine", {
        name: t(`people.${w.role}`),
        before: hourLabel(w.beforeHour),
        after: windowText(m.cleanest) ?? "",
      })}</p>`
    : "";
  const content = html`
    ${forecastChartHtml(m.air.hourlyForecast, m.cleanest, m.dirtiest)}
    <div class="two-col">
      <div class="stack">
        <h3 class="list-title">${t("home.routine.whyTitle")}</h3>
        <p>${t("home.routine.why")}</p>
        <p class="muted small">${t("common.source")}: ${t("insight.sourceRef")}</p>
        ${walkLine}
        ${whatIsThis("dose")}
      </div>
      ${walk}
    </div>`;
  return guideSection({
    id: "routine",
    stepLabel: stepLabel(2, HOME_STEPS),
    icon: "clock",
    title: t("home.routine.title"),
    shows: t("home.routine.shows"),
    can: t("home.routine.can"),
    content,
    actions: m.cleanest
      ? actionButton({ label: t("home.routine.action"), id: "home-ics", icon: "calendar" })
      : html``,
  });
}
