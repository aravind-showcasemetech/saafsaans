// air-now.ts: The Air now card: AQI, band, main pollutant, CPCB statement and Google's advice.
import type { HealthRecommendations, NormalisedAirData } from "../../../shared/air-types.js";
import { escapeHtml } from "../../../shared/escape.js";
import type { HouseholdProfile, MemberProfile } from "../../../shared/schemas.js";
import { getLanguage, t } from "../../home/i18n.js";
import type { PlanResponse } from "../api.js";
import {
  bandClass,
  bandLabel,
  capturedLabel,
  formatIndianNumber,
  nicknameHtml,
} from "../format.js";

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

export function airNowHtml(
  profile: HouseholdProfile,
  airData: NormalisedAirData,
  planData: PlanResponse,
  nameOf: (id: string) => string,
): string {
  const lang = getLanguage();
  const sample = planData.isDemo || airData.isDemo ? capturedLabel(airData.capturedAt) : null;
  const pollutant =
    (airData.dominantPollutant || "pm25").toLowerCase() === "pm25"
      ? "PM2.5"
      : escapeHtml(airData.dominantPollutant.toUpperCase());
  const note =
    lang === "en" ? "" : ` <span class="swap-unit-subtext">(${t("cpcb.translatedNote")})</span>`;
  const items = profile.members
    .map((m) => {
      const advice = googleAdviceFor(m, airData.healthRecommendations);
      return `<li class="air-card-google-item"><strong>${nicknameHtml(nameOf(m.id))}:</strong> ${escapeHtml(advice)}</li>`;
    })
    .join("");
  // In demo data Google's advice is in English; in hi and te it sits in a closed disclosure marked lang="en".
  const adviceIsEnglish = /^[\x20-\x7E’]*$/.test(
    airData.healthRecommendations?.generalPopulation ?? "",
  );
  const googleBlock =
    lang !== "en" && adviceIsEnglish
      ? `<details class="air-card-google-section"><summary class="air-card-google-heading">${t("today.googleEnglishSummary")}</summary><ul class="air-card-google-list" lang="en">${items}</ul></details>`
      : `<div class="air-card-google-section"><div class="air-card-google-heading">${t("today.googleHeading")}</div><ul class="air-card-google-list">${items}</ul></div>`;
  return `
    <div class="air-card section-spacer-24">
      <h2 class="section-label">${t("today.airNow")}${sample ? ` <span class="demo-badge-wrap">${escapeHtml(sample)}</span>` : ""}</h2>
      <div class="air-card-top">
        <span class="air-aqi-number tabular-nums">${formatIndianNumber(airData.currentAqi)}</span>
        <span class="air-band-tag">
          <span class="band-indicator-bar ${bandClass(airData.aqiBand)}"></span>
          ${escapeHtml(bandLabel(airData.aqiBand))}
        </span>
      </div>
      <div class="air-card-main-pollutant">${t("today.mainPollutant")}: <strong>${pollutant}</strong> (${formatIndianNumber(airData.pm25, 1)} µg/m³)</div>
      <div class="air-card-cpcb-stmt"><strong>${t("cpcb.label")}:</strong> "${escapeHtml(t(`cpcb.${airData.aqiBand}`))}"${note}</div>
      ${googleBlock}
      <div class="air-card-disclaimer">${t("today.googleDisclaimer")}</div>
    </div>`;
}
