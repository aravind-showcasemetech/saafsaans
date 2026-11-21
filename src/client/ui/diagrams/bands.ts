// bands.ts: The six CPCB bands as a labelled scale, with today's band marked in words.
// Ranges come from CPCB_AQI_BANDS (FACTORS.md section 1); colour is only an extra signal.
import { CPCB_AQI_BANDS } from "../../../shared/factors.js";
import { bandClass, bandLabel, formatIndianNumber } from "../../app/format.js";
import { t } from "../../home/i18n.js";
import { type SafeHtml, html } from "../html.js";

/** The band an hourly AQI falls in, from the CPCB breakpoints. */
export function bandForAqi(aqi: number): string {
  return (CPCB_AQI_BANDS.find((b) => aqi <= b.aqiMax) ?? CPCB_AQI_BANDS[CPCB_AQI_BANDS.length - 1])
    .band;
}

export function bandScaleHtml(todayBand: string): SafeHtml {
  const items = CPCB_AQI_BANDS.map((b) => {
    const today = b.band === todayBand;
    const range = t("common.range", {
      start: formatIndianNumber(b.aqiMin),
      end: formatIndianNumber(b.aqiMax),
    });
    return html`
      <li class="band-step${today ? " is-today" : ""}"${today ? html` aria-current="true"` : ""}>
        <span class="band-swatch ${bandClass(b.band)}" aria-hidden="true"></span>
        <span class="band-step-name">${bandLabel(b.band)}</span>
        <span class="band-step-range tabular-nums">${range}</span>
        ${today ? html`<span class="band-step-today">${t("bandScale.today")}</span>` : ""}
      </li>`;
  });
  return html`
    <figure class="band-scale">
      <figcaption class="diagram-title">${t("bandScale.title")}</figcaption>
      <ol class="band-steps">${items}</ol>
    </figure>`;
}
