// air-now.ts: Today section 1, "Your air today": AQI, band in words, main pollutant, CPCB's
// statement and Google's advice for each person (labelled as Google's).
import type { HealthRecommendations } from "../../../shared/air-types.js";
import type { MemberProfile } from "../../../shared/schemas.js";
import { getLanguage, t } from "../../home/i18n.js";
import { bandScaleHtml } from "../../ui/diagrams/bands.js";
import { type SafeHtml, html } from "../../ui/html.js";
import { actionButton, guideSection, stepLabel, whatIsThis } from "../../ui/section.js";
import {
  bandClass,
  bandLabel,
  capturedLabel,
  formatIndianNumber,
  nicknameHtml,
  placeLabel,
} from "../format.js";
import { TODAY_STEPS, type TodayContext, nameOf } from "./context.js";

/** Google's advice for the group this member belongs to. */
function googleAdviceFor(member: MemberProfile, recs: HealthRecommendations | undefined): string {
  const general = recs?.generalPopulation ?? "";
  if (member.sensitivity === "asthma_copd" && recs?.lungDiseasePopulation)
    return recs.lungDiseasePopulation;
  if (member.sensitivity === "heart_condition" && recs?.heartDiseasePopulation)
    return recs.heartDiseasePopulation;
  if (member.sensitivity === "pregnancy" && recs?.pregnantWomen) return recs.pregnantWomen;
  if (member.ageBand === "under-6" || member.ageBand === "6-10") return recs?.children || general;
  if (member.ageBand === "61-70" || member.ageBand === "71-plus") return recs?.elderly || general;
  return general;
}

/** Google's advice for each person: in hi and te, saved English advice sits in a closed disclosure. */
function googleAdviceHtml(ctx: TodayContext): SafeHtml {
  const { air } = ctx;
  const items = ctx.profile.members.map(
    (m) =>
      html`<li><strong>${nicknameHtml(nameOf(ctx, m.id))}:</strong> ${googleAdviceFor(
        m,
        air.healthRecommendations,
      )}</li>`,
  );
  // Saved demo data has Google's advice in English; in hi and te it is marked lang="en".
  const english = /^[\x20-\x7E’]*$/.test(air.healthRecommendations?.generalPopulation ?? "");
  return getLanguage() !== "en" && english
    ? html`<details class="explain"><summary><span>${t("today.googleEnglishSummary")}</span></summary><ul
        class="advice-list" lang="en">${items}</ul></details>`
    : html`<h2 class="list-title">${t("today.googleHeading")}</h2><ul class="advice-list">${items}</ul>`;
}

/** The AQI, its band in words, the main pollutant and its concentration. */
function airNowPanel(ctx: TodayContext): SafeHtml {
  const { air } = ctx;
  const sample = air.isDemo ? capturedLabel(air.capturedAt) : null;
  const pollutant =
    (air.dominantPollutant || "pm25").toLowerCase() === "pm25"
      ? "PM2.5"
      : air.dominantPollutant.toUpperCase();
  const place = `${placeLabel(ctx.location.name)}${sample ? ` · ${sample}` : ""}`;
  const pm25 = formatIndianNumber(air.pm25, 1);
  return html`
        <div class="panel air-now">
          <p class="panel-label">${place}</p>
          <p class="air-now-row"><span class="big-number tabular-nums">${formatIndianNumber(
            air.currentAqi,
          )}</span><span class="aqi-word">AQI</span></p>
          <p class="band-name"><span class="band-swatch ${bandClass(air.aqiBand)}"
            aria-hidden="true"></span>${bandLabel(air.aqiBand)}</p>
          <p class="muted small">${t("today.mainPollutant")}: <strong>${pollutant}</strong>
            (${pm25} µg/m³)</p>
        </div>`;
}

export function airTodaySection(ctx: TodayContext): SafeHtml {
  const { air } = ctx;
  const translated = getLanguage() === "en" ? "" : `, ${t("cpcb.translatedNote")}`;
  const content = html`
    <div class="two-col">
      <div class="stack">
        ${airNowPanel(ctx)}
        <blockquote class="quote">
          <p>${t(`cpcb.${air.aqiBand}`)}</p>
          <footer>${t("cpcb.label")}${translated}</footer>
        </blockquote>
        ${whatIsThis("aqi")}
        ${whatIsThis("pm25")}
      </div>
      <div class="stack">
        ${googleAdviceHtml(ctx)}
        <p class="muted small">${t("today.googleDisclaimer")}</p>
        ${bandScaleHtml(air.aqiBand)}
      </div>
    </div>`;
  return guideSection({
    id: "air",
    level: 1,
    stepLabel: stepLabel(1, TODAY_STEPS),
    icon: "map-pin",
    title: t("todayG.air.title"),
    shows: t("todayG.air.shows"),
    can: t("todayG.air.can"),
    content,
    actions: actionButton({
      label: t("todayG.air.action"),
      href: "#/setup?step=location",
      icon: "map-pin",
    }),
  });
}
