// render.ts: Pure HTML string renderers for the home page sections.
// Every visible string comes from t() or verified live data.
// No icons, no em/en dashes, no gradients.

import { escapeHtml } from "../../shared/escape.js";
import {
  bandClass,
  bandLabel,
  capturedLabel,
  formatIndianNumber,
  placeLabel,
  windowText,
} from "../app/format.js";
import type { AreaAirItem } from "./data.js";
import { t } from "./i18n.js";

type HourWindow = { startHour: number; endHour: number } | null;

export function renderHeader(): string {
  return `
    <header class="site-header" role="banner">
      <div class="container header-inner">
        <a href="/" class="brand-wordmark">${t("app.title")}</a>
        <div class="header-actions">
          <nav class="lang-switch" aria-label="${t("header.language")}">
            <button class="lang-btn" data-lang="en" lang="en" type="button">English</button>
            <button class="lang-btn" data-lang="hi" lang="hi" type="button">हिन्दी</button>
            <button class="lang-btn" data-lang="te" lang="te" type="button">తెలుగు</button>
          </nav>
          <a href="#/setup" class="btn btn-primary">${t("header.planMyDay")}</a>
        </div>
      </div>
    </header>
  `;
}

export function renderHero(area: AreaAirItem | null, airLabel: string): string {
  const visualContent =
    area && area.aqi !== undefined
      ? `
      <div class="air-card">
        <div class="section-label">${escapeHtml(placeLabel("Kukatpally, Hyderabad"))}</div>
        <div class="air-card-top">
          <span class="air-aqi-number tabular-nums">${formatIndianNumber(area.aqi)}</span>
          <span class="air-band-tag">
            <span class="band-indicator-bar ${bandClass(area.aqiBand)}"></span>
            ${escapeHtml(bandLabel(area.aqiBand))}
          </span>
        </div>
        <div class="air-card-details">
          <div>PM2.5: <span class="tabular-nums">${formatIndianNumber(area.pm25, 1)} µg/m³</span></div>
          <div>${escapeHtml(area.isDemo ? airLabel : t("hero.updatedAt", { time: airLabel }))}</div>
        </div>
      </div>
    `
      : `
      <div class="air-card">
        <div class="hero-loading-text">${t("hero.loadingAir")}</div>
      </div>
    `;

  return `
    <section class="section hero-section reveal-on-scroll" aria-labelledby="hero-title">
      <div class="container grid-12">
        <div class="hero-content">
          <h1 id="hero-title" class="hero-title">${t("hero.title")}</h1>
          <p class="hero-lead">${t("hero.lead")}</p>
          <div class="hero-cta">
            <a href="#/demo" class="btn btn-primary">${t("hero.tryHyderabad")}</a>
            <a href="#/setup" class="btn btn-secondary">${t("hero.setUpHousehold")}</a>
          </div>
        </div>
        <div class="hero-visual">
          ${visualContent}
        </div>
      </div>
    </section>
  `;
}

export function renderAirMarquee(areas: AreaAirItem[]): string {
  const sample = areas.find((a) => a.isDemo);
  const sampleText = sample ? capturedLabel(sample.capturedAt) : null;
  const demoBanner = sampleText
    ? `<div class="marquee-sample-note">${escapeHtml(sampleText)}</div>`
    : "";

  const itemsHtml = areas
    .map(
      (a) => `
      <div class="marquee-item">
        <span class="marquee-item-title">${escapeHtml(placeLabel(a.name))}</span>
        <span class="tabular-nums">${a.aqi === undefined ? "" : formatIndianNumber(a.aqi)}</span>
        <span class="marquee-item-band">(${escapeHtml(bandLabel(a.aqiBand))})</span>
      </div>
    `,
    )
    .join("");

  return `
    <div class="marquee-wrapper" aria-label="${t("marquee.airTitle")}">
      ${demoBanner}
      <div class="marquee-viewport" tabindex="0" role="region" aria-label="${t("marquee.airScrollRegion")}">
        <div class="marquee-track">
          <div class="marquee-items">${itemsHtml}</div>
          <div class="marquee-items" aria-hidden="true">${itemsHtml}</div>
        </div>
      </div>
      <div class="marquee-control">
        <button class="btn-text marquee-toggle-btn" data-pause-text="${t("common.pause")}" data-play-text="${t("common.play")}">
          ${t("common.pause")}
        </button>
      </div>
    </div>
  `;
}

export function renderMorningInsight(
  cleanestWindow: HourWindow,
  dirtiestWindow: HourWindow,
): string {
  const none = t("today.noWindow");
  const cleanest = windowText(cleanestWindow) ?? none;
  const dirtiest = windowText(dirtiestWindow) ?? none;
  const pad = (h: number) => `${String(h % 24).padStart(2, "0")}:00`;
  const explanation = cleanestWindow
    ? t("insight.explanation", {
        cleanestStart: pad(cleanestWindow.startHour),
        cleanestEnd: pad(cleanestWindow.endHour),
      })
    : "";

  return `
    <section class="section reveal-on-scroll" aria-labelledby="insight-title">
      <div class="container">
        <div class="section-header">
          <div class="section-label">${t("insight.label")}</div>
          <h2 id="insight-title" class="section-title">${t("insight.title")}</h2>
          <p class="section-desc">${t("insight.desc")}</p>
        </div>
        <div class="insight-card">
          <p class="insight-summary-lead">
            ${explanation}
          </p>
          <div class="insight-windows">
            <div>
              <div class="window-block-title">${t("insight.cleanestTitle")}</div>
              <div class="window-block-hours tabular-nums">${cleanest}</div>
              <div class="insight-pill-note">${t("insight.cleanestNote")}</div>
            </div>
            <div>
              <div class="window-block-title">${t("insight.dirtiestTitle")}</div>
              <div class="window-block-hours tabular-nums">${dirtiest}</div>
              <div class="insight-pill-note">${t("insight.dirtiestNote")}</div>
            </div>
          </div>
          <div class="insight-meta-note">
            ${t("common.source")}: ${t("insight.sourceRef")}
          </div>
        </div>
      </div>
    </section>
  `;
}

export function renderHowItWorks(): string {
  return `
    <section class="section reveal-on-scroll" aria-labelledby="how-it-works-title">
      <div class="container">
        <div class="section-header">
          <div class="section-label">${t("howItWorks.label")}</div>
          <h2 id="how-it-works-title" class="section-title">${t("howItWorks.title")}</h2>
          <p class="section-desc">${t("howItWorks.desc")}</p>
        </div>
        <div class="how-it-works-layout">
          <div class="sticky-panel-col">
            <div class="sticky-panel">
              <div class="section-label">${t("howItWorks.exampleLabel")}</div>
              <div id="sticky-panel-content" class="sticky-panel-content">
                <h3 class="sticky-panel-title">${t("sticky.familyTitle")}</h3>
                <p class="sticky-panel-desc">${t("sticky.familyBody")}</p>
                <div class="sticky-panel-detail">${t("sticky.familyDetail")}</div>
              </div>
            </div>
          </div>
          <div class="steps-list">
            <div class="step-item" data-step="1">
              <div class="step-num">${t("common.step", { n: 1 })}</div>
              <h3 class="step-title">${t("howItWorks.step1Title")}</h3>
              <p class="step-body">${t("howItWorks.step1Body")}</p>
            </div>
            <div class="step-item" data-step="2">
              <div class="step-num">${t("common.step", { n: 2 })}</div>
              <h3 class="step-title">${t("howItWorks.step2Title")}</h3>
              <p class="step-body">${t("howItWorks.step2Body")}</p>
            </div>
            <div class="step-item" data-step="3">
              <div class="step-num">${t("common.step", { n: 3 })}</div>
              <h3 class="step-title">${t("howItWorks.step3Title")}</h3>
              <p class="step-body">${t("howItWorks.step3Body")}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

export function renderTwoLenses(protectCut: number, polluteSaved: number): string {
  return `
    <section class="section reveal-on-scroll" aria-labelledby="lenses-title">
      <div class="container">
        <div class="section-header">
          <div class="section-label">${t("lenses.label")}</div>
          <h2 id="lenses-title" class="section-title">${t("lenses.title")}</h2>
          <p class="section-desc">${t("lenses.desc")}</p>
        </div>
        <div class="lenses-grid">
          <div class="lens-card">
            <h3 class="lens-title">${t("lenses.protectTitle")}</h3>
            <p class="lens-desc">${t("lenses.protectDesc")}</p>
            <div class="lens-stat tabular-nums">${protectCut}%</div>
            <p class="lens-example">${t("lenses.protectExample", { percent: protectCut })}</p>
          </div>
          <div class="lens-card">
            <h3 class="lens-title">${t("lenses.polluteTitle")}</h3>
            <p class="lens-desc">${t("lenses.polluteDesc")}</p>
            <div class="lens-stat tabular-nums">${t("common.kg", { value: formatIndianNumber(polluteSaved) })}</div>
            <p class="lens-example">${t("lenses.polluteExample", { amount: polluteSaved })}</p>
          </div>
        </div>
      </div>
    </section>
  `;
}

export function renderFormulas(): string {
  return `
    <section class="section reveal-on-scroll" aria-labelledby="formulas-title">
      <div class="container">
        <div class="section-header">
          <div class="section-label">${t("formulas.label")}</div>
          <h2 id="formulas-title" class="section-title">${t("formulas.title")}</h2>
          <p class="section-desc">${t("formulas.desc")}</p>
        </div>
        <div class="formula-grid">
          <div class="formula-card">
            <h3>${t("formulas.massBalanceTitle")}</h3>
            <div class="formula-code">C_in = P * a * C_out / (a + k + CADR / V)</div>
            <p class="formula-desc">${t("formulas.massBalanceDesc")}</p>
          </div>
          <div class="formula-card">
            <h3>${t("formulas.doseTitle")}</h3>
            <div class="formula-code">Dose = sum(Concentration * InhalationRate * Hours)</div>
            <p class="formula-desc">${t("formulas.doseDesc")}</p>
          </div>
          <div class="formula-card">
            <h3>${t("formulas.purifierTitle")}</h3>
            <div class="formula-code">CADR (cfm) = 2/3 * Area (sq ft) * (CeilingHeight / 8)</div>
            <p class="formula-desc">${t("formulas.purifierDesc")}</p>
          </div>
          <div class="formula-card">
            <h3>${t("formulas.cigsTitle")}</h3>
            <div class="formula-code">Cigarettes = 24-hour Average Exposure / 22</div>
            <p class="formula-desc">${t("formulas.cigsDesc")}</p>
          </div>
        </div>
        <div class="ai-plain-box">
          <p class="ai-plain-text">${t("formulas.aiPlainLine")}</p>
        </div>
      </div>
    </section>
  `;
}

export function renderCommunity(homes: number, weeklyTotal: number): string {
  return `
    <section class="section reveal-on-scroll" aria-labelledby="community-title">
      <div class="container">
        <div class="section-header">
          <div class="section-label">${t("community.label")}</div>
          <h2 id="community-title" class="section-title">${t("community.title")}</h2>
          <p class="section-desc">${t("community.desc")}</p>
        </div>
        <div class="community-card">
          <h3 class="community-society-title">${t("community.societyName")}</h3>
          <p class="community-society-story">
            ${t("community.societyStory")}
          </p>
          <div class="community-stat tabular-nums">${t("common.kgCo2", { value: formatIndianNumber(weeklyTotal) })}</div>
          <p class="community-society-note">
            ${t("community.societyResult")} (${formatIndianNumber(homes)} ${t("community.homesWord")})
          </p>
        </div>
      </div>
    </section>
  `;
}

export function renderSourcesMarqueeAndList(): string {
  const sources = [
    { key: "cpcb", url: "https://cpcb.nic.in" },
    { key: "epa", url: "https://www.epa.gov" },
    { key: "berkeley", url: "https://berkeleyearth.org" },
    { key: "aham", url: "https://ahamverifide.org" },
    { key: "ghg", url: "https://indiaghgp.org" },
    { key: "cea", url: "https://cea.nic.in" },
    { key: "cse", url: "https://www.cseindia.org" },
    { key: "google", url: "https://developers.google.com/maps/documentation/air-quality" },
  ].map((s) => ({ name: t(`sources.${s.key}`), url: s.url }));

  const marqueeItems = sources
    .map(
      (s) => `
      <div class="marquee-item">
        <span class="marquee-item-title">${s.name}</span>
      </div>
    `,
    )
    .join("");

  const listItems = sources
    .map(
      (s) => `
      <li class="sources-list-item">
        <a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.name}</a>
      </li>
    `,
    )
    .join("");

  return `
    <section class="section reveal-on-scroll" aria-labelledby="sources-title">
      <div class="container">
        <div class="section-header">
          <div class="section-label">${t("sources.label")}</div>
          <h2 id="sources-title" class="section-title">${t("sources.title")}</h2>
        </div>
      </div>
      <div class="marquee-wrapper sources-marquee-wrap" aria-label="${t("marquee.sourcesTitle")}">
        <div class="marquee-viewport" tabindex="0" role="region" aria-label="${t("marquee.sourcesScrollRegion")}">
          <div class="marquee-track">
            <div class="marquee-items">${marqueeItems}</div>
            <div class="marquee-items" aria-hidden="true">${marqueeItems}</div>
          </div>
        </div>
        <div class="marquee-control">
          <button class="btn-text marquee-toggle-btn" data-pause-text="${t("common.pause")}" data-play-text="${t("common.play")}">
            ${t("common.pause")}
          </button>
        </div>
      </div>
      <div class="container">
        <ul class="sources-list">
          ${listItems}
        </ul>
      </div>
    </section>
  `;
}

export function renderFinalCta(): string {
  return `
    <section class="section final-cta-section reveal-on-scroll" aria-labelledby="final-cta-title">
      <div class="container final-cta-container">
        <h2 id="final-cta-title" class="section-title final-cta-title">${t("finalCta.title")}</h2>
        <p class="section-desc final-cta-desc">${t("finalCta.desc")}</p>
        <div class="hero-cta">
          <a href="#/demo" class="btn btn-primary">${t("hero.tryHyderabad")}</a>
          <a href="#/setup" class="btn btn-secondary">${t("hero.setUpHousehold")}</a>
        </div>
      </div>
    </section>
  `;
}

export function renderFooter(): string {
  return `
    <footer class="site-footer" role="contentinfo">
      <div class="container footer-inner">
        <div>
          <strong class="footer-disclaimer-title">${t("footer.notMedicalAdviceTitle")}:</strong>
          ${t("footer.notMedicalAdviceText")}
        </div>
        <div>
          ${t("footer.googleAttribution")}
        </div>
        <div class="footer-nav">
          <a href="https://github.com/aravind-showcasemetech/saafsaans" target="_blank" rel="noopener noreferrer">${t("footer.githubRepo")}</a>
          <a href="#/setup">${t("header.planMyDay")}</a>
          <a href="#/demo">${t("hero.tryHyderabad")}</a>
        </div>
      </div>
    </footer>
  `;
}
