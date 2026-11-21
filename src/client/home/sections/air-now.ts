// air-now.ts: Home step 1, the air now: what AQI and PM2.5 mean, CPCB's statement for today's band,
// and the six bands as a labelled scale.
import { bandScaleHtml } from "../../ui/diagrams/bands.js";
import { type SafeHtml, html } from "../../ui/html.js";
import { actionButton, guideSection, stepLabel, whatIsThis } from "../../ui/section.js";
import { t } from "../i18n.js";
import { HOME_STEPS, type HomeModel } from "../model.js";

export function airSection(m: HomeModel): SafeHtml {
  const note = t("cpcb.translatedNote") ? `, ${t("cpcb.translatedNote")}` : "";
  const content = html`
    <div class="two-col">
      <div class="stack">
        <p><strong>AQI</strong>: ${t("home.air.aqiLine")}</p>
        ${whatIsThis("aqi")}
        <p><strong>PM2.5</strong>: ${t("home.air.pmLine")}</p>
        ${whatIsThis("pm25")}
        <blockquote class="quote">
          <p>${t(`cpcb.${m.air.aqiBand}`)}</p>
          <footer>${t("cpcb.label")}${note}</footer>
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
