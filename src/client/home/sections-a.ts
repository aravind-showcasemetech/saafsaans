// sections-a.ts: Home sections 0 to 3: hero, the air now, a low-emission routine, indoor air hacks.
// Every number comes from the home model (src/shared with the demo data).
import { escapeHtml } from "../../shared/escape.js";
import { bandClass, bandLabel, formatIndianNumber, hourLabel, windowText } from "../app/format.js";
import { calculatorHtml } from "../ui/calculator.js";
import { bandScaleHtml } from "../ui/diagrams/bands.js";
import { dayHoursHtml } from "../ui/diagrams/day-hours.js";
import { forecastChartHtml } from "../ui/diagrams/forecast.js";
import { roomDiagramHtml } from "../ui/diagrams/room.js";
import { actionButton, guideSection, stepLabel, whatIsThis } from "../ui/section.js";
import { t } from "./i18n.js";
import type { HomeModel } from "./model.js";

export const HOME_STEPS = 7;
const n = (v: number, d = 0) => formatIndianNumber(v, d);
const e = escapeHtml;

/** The hero; with no data yet it keeps the same layout and shows a loading line in the panel. */
export function heroSection(m: HomeModel | null, airLabel: string): string {
  const band = m?.air.aqiBand ?? "";
  const panel = m
    ? `
        <p class="air-now-row"><span class="big-number tabular-nums">${n(m.air.currentAqi)}</span><span class="aqi-word">AQI</span></p>
        <p class="band-name"><span class="band-swatch ${bandClass(band)}" aria-hidden="true"></span>${e(bandLabel(band))}</p>
        <p class="band-meaning">${e(t(`cpcb.${band}`))}</p>
        <p class="muted small">PM2.5: <span class="tabular-nums">${n(m.air.pm25, 1)} µg/m³</span> · ${e(airLabel)}</p>`
    : `<p class="muted" role="status">${e(t("hero.loadingAir"))}</p>`;
  const content = `
    <div class="hero-grid">
      <div>
        <p class="lead">${e(t("home.hero.lead"))}</p>
        <p class="list-title">${e(t("home.hero.getTitle"))}</p>
        <ul class="get-list">
          <li>${e(t("home.hero.get1"))}</li>
          <li>${e(t("home.hero.get2"))}</li>
          <li>${e(t("home.hero.get3"))}</li>
        </ul>
      </div>
      <div class="panel air-now" aria-labelledby="hero-air-title">
        <p class="panel-label" id="hero-air-title">${e(t("home.hero.airTitle"))}</p>${panel}
      </div>
    </div>`;
  return guideSection({
    id: "start",
    level: 1,
    stepLabel: t("home.hero.label"),
    icon: "wind",
    title: t("home.hero.title"),
    shows: t("home.hero.shows"),
    can: t("home.hero.can"),
    content,
    actions:
      actionButton({ label: t("hero.tryHyderabad"), href: "#/demo", icon: "users" }) +
      actionButton({ label: t("hero.setUpHousehold"), href: "#/setup", kind: "secondary" }),
    className: "hero",
  });
}

export function airSection(m: HomeModel): string {
  const content = `
    <div class="two-col">
      <div class="stack">
        <p><strong>AQI</strong>: ${e(t("home.air.aqiLine"))}</p>
        ${whatIsThis("aqi")}
        <p><strong>PM2.5</strong>: ${e(t("home.air.pmLine"))}</p>
        ${whatIsThis("pm25")}
        <blockquote class="quote">
          <p>${e(t(`cpcb.${m.air.aqiBand}`))}</p>
          <footer>${e(t("cpcb.label"))}${t("cpcb.translatedNote") ? `, ${e(t("cpcb.translatedNote"))}` : ""}</footer>
        </blockquote>
      </div>
      ${bandScaleHtml(m.air.aqiBand)}
    </div>`;
  return guideSection({
    id: "air",
    stepLabel: stepLabel(1, HOME_STEPS),
    icon: "map-pin",
    title: t("home.air.title"),
    shows: t("home.air.shows"),
    can: t("home.air.can"),
    content,
    actions: actionButton({
      label: t("home.air.action"),
      href: "#/setup?step=location",
      icon: "map-pin",
    }),
  });
}

export function routineSection(m: HomeModel): string {
  const w = m.walk;
  const walk = w
    ? dayHoursHtml({ ...w, name: t(`people.${w.role}`) })
    : `<p class="muted">${e(t("today.noWindow"))}</p>`;
  const content = `
    ${forecastChartHtml(m.air.hourlyForecast, m.cleanest, m.dirtiest)}
    <div class="two-col">
      <div class="stack">
        <h3 class="list-title">${e(t("home.routine.whyTitle"))}</h3>
        <p>${e(t("home.routine.why"))}</p>
        <p class="muted small">${e(t("common.source"))}: ${e(t("insight.sourceRef"))}</p>
        ${w ? `<p>${e(t("home.routine.walkLine", { name: t(`people.${w.role}`), before: hourLabel(w.beforeHour), after: windowText(m.cleanest) ?? "" }))}</p>` : ""}
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
      : "",
  });
}

export function indoorSection(m: HomeModel): string {
  const b = m.bedroom;
  const content = `
    <div class="two-col">
      <div class="stack">
        ${roomDiagramHtml(m.room)}
        <p>${e(t("home.indoor.roomLine"))}</p>
      </div>
      <div class="stack">
        <h3 class="list-title">${e(t("home.indoor.factsTitle"))}</h3>
        <ul class="fact-list">
          <li>${e(t("facts.mosquitoCoil"))}</li>
          <li>${e(t("facts.incense"))}</li>
          <li>${e(t("facts.frying"))}</li>
        </ul>
        <h3 class="list-title">${e(t("home.indoor.calcTitle", { length: n(b.lengthFt), width: n(b.widthFt), height: n(b.heightFt) }))}</h3>
        ${whatIsThis("cadr")}
        ${calculatorHtml("home", b)}
      </div>
    </div>`;
  return guideSection({
    id: "indoor",
    stepLabel: stepLabel(3, HOME_STEPS),
    icon: "house",
    title: t("home.indoor.title"),
    shows: t("home.indoor.shows"),
    can: t("home.indoor.can"),
    content,
    actions: `<p class="muted small">${e(t("home.indoor.actionHint"))}</p>`,
  });
}
