// air-now.ts: Today section 1, "Your air today": AQI, band in words, main pollutant, CPCB's
// statement and Google's advice for each person (labelled as Google's).
import type { HealthRecommendations } from "../../../shared/air-types.js";
import { escapeHtml } from "../../../shared/escape.js";
import type { MemberProfile } from "../../../shared/schemas.js";
import { getLanguage, t } from "../../home/i18n.js";
import { bandScaleHtml } from "../../ui/diagrams/bands.js";
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

export function airTodaySection(ctx: TodayContext): string {
  const { air } = ctx;
  const lang = getLanguage();
  const e = escapeHtml;
  const sample = air.isDemo ? capturedLabel(air.capturedAt) : null;
  const pollutant =
    (air.dominantPollutant || "pm25").toLowerCase() === "pm25"
      ? "PM2.5"
      : e(air.dominantPollutant.toUpperCase());
  const items = ctx.profile.members
    .map(
      (m) =>
        `<li><strong>${nicknameHtml(nameOf(ctx, m.id))}:</strong> ${e(googleAdviceFor(m, air.healthRecommendations))}</li>`,
    )
    .join("");
  // Saved demo data has Google's advice in English; in hi and te it sits in a closed disclosure marked lang="en".
  const english = /^[\x20-\x7E’]*$/.test(air.healthRecommendations?.generalPopulation ?? "");
  const google =
    lang !== "en" && english
      ? `<details class="explain"><summary><span>${e(t("today.googleEnglishSummary"))}</span></summary><ul class="advice-list" lang="en">${items}</ul></details>`
      : `<h2 class="list-title">${e(t("today.googleHeading"))}</h2><ul class="advice-list">${items}</ul>`;
  const content = `
    <div class="two-col">
      <div class="stack">
        <div class="panel air-now">
          <p class="panel-label">${e(placeLabel(ctx.location.name))}${sample ? ` · ${e(sample)}` : ""}</p>
          <p class="air-now-row"><span class="big-number tabular-nums">${formatIndianNumber(air.currentAqi)}</span><span class="aqi-word">AQI</span></p>
          <p class="band-name"><span class="band-swatch ${bandClass(air.aqiBand)}" aria-hidden="true"></span>${e(bandLabel(air.aqiBand))}</p>
          <p class="muted small">${e(t("today.mainPollutant"))}: <strong>${pollutant}</strong> (${formatIndianNumber(air.pm25, 1)} µg/m³)</p>
        </div>
        <blockquote class="quote">
          <p>${e(t(`cpcb.${air.aqiBand}`))}</p>
          <footer>${e(t("cpcb.label"))}${lang === "en" ? "" : `, ${e(t("cpcb.translatedNote"))}`}</footer>
        </blockquote>
        ${whatIsThis("aqi")}
        ${whatIsThis("pm25")}
      </div>
      <div class="stack">
        ${google}
        <p class="muted small">${e(t("today.googleDisclaimer"))}</p>
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
