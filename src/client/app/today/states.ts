// states.ts: The Today screen while loading and when the plan cannot be loaded.
import { t } from "../../home/i18n.js";

export function loadingHtml(): string {
  return `
    <section class="section">
      <div class="container">
        <div class="section-spacer-32">
          <div class="loading-placeholder-line loading-box-title"></div>
          <div class="loading-placeholder-line short"></div>
        </div>
        <div class="today-layout">
          <div class="main-col">
            <div class="loading-placeholder-line loading-box-140"></div>
            <div class="loading-placeholder-line loading-box-120"></div>
          </div>
          <div class="side-col"><div class="loading-placeholder-line loading-box-200"></div></div>
        </div>
      </div>
    </section>`;
}

export function errorHtml(): string {
  return `
    <section class="section">
      <div class="container container-error">
        <h1 class="error-title">${t("today.loadErrorTitle")}</h1>
        <p class="error-desc">${t("today.loadErrorDesc")}</p>
        <a href="#/setup" class="btn btn-secondary">${t("today.reviewSetup")}</a>
      </div>
    </section>`;
}
