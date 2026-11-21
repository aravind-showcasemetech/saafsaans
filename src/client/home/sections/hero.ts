// hero.ts: Home "Start here": what the app does, what you get, and Kukatpally's air right now.
// With no data yet it keeps the same layout and shows a loading line in the panel.
import { bandClass, bandLabel, formatIndianNumber } from "../../app/format.js";
import { type SafeHtml, html } from "../../ui/html.js";
import { actionButton, guideSection } from "../../ui/section.js";
import { t } from "../i18n.js";
import type { HomeModel } from "../model.js";

const n = (v: number, d = 0) => formatIndianNumber(v, d);

function airPanel(m: HomeModel | null, airLabel: string): SafeHtml {
  if (!m) return html`<p class="muted" role="status">${t("hero.loadingAir")}</p>`;
  const band = m.air.aqiBand;
  return html`
        <p class="air-now-row"><span class="big-number tabular-nums">${n(
          m.air.currentAqi,
        )}</span><span class="aqi-word">AQI</span></p>
        <p class="band-name"><span class="band-swatch ${bandClass(band)}"
          aria-hidden="true"></span>${bandLabel(band)}</p>
        <p class="band-meaning">${t(`cpcb.${band}`)}</p>
        <p class="muted small">PM2.5: <span class="tabular-nums">${n(m.air.pm25, 1)} µg/m³</span>
          · ${airLabel}</p>`;
}

export function heroSection(m: HomeModel | null, airLabel: string): SafeHtml {
  const content = html`
    <div class="hero-grid">
      <div>
        <p class="lead">${t("home.hero.lead")}</p>
        <p class="list-title">${t("home.hero.getTitle")}</p>
        <ul class="get-list">
          <li>${t("home.hero.get1")}</li>
          <li>${t("home.hero.get2")}</li>
          <li>${t("home.hero.get3")}</li>
        </ul>
      </div>
      <div class="panel air-now" aria-labelledby="hero-air-title">
        <p class="panel-label" id="hero-air-title">${t("home.hero.airTitle")}</p>${airPanel(m, airLabel)}
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
    actions: html`${actionButton({
      label: t("hero.tryHyderabad"),
      href: "#/demo",
      icon: "users",
    })}${actionButton({ label: t("hero.setUpHousehold"), href: "#/setup", kind: "secondary" })}`,
    className: "hero",
  });
}
