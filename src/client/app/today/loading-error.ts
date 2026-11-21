// loading-error.ts: The Today screen while loading and when the plan cannot be loaded.
import { t } from "../../home/i18n.js";
import { type SafeHtml, html } from "../../ui/html.js";
import { actionButton } from "../../ui/section.js";

export function loadingHtml(): SafeHtml {
  return html`
    <section class="g-section" aria-labelledby="today-loading-title">
      <div class="g-inner">
        <h1 id="today-loading-title" class="g-title">${t("today.title")}</h1>
        <p class="muted" role="status">${t("today.loading")}</p>
      </div>
    </section>`;
}

export function errorHtml(): SafeHtml {
  return html`
    <section class="g-section" aria-labelledby="today-error-title">
      <div class="g-inner">
        <h1 id="today-error-title" class="g-title">${t("today.loadErrorTitle")}</h1>
        <p>${t("today.loadErrorDesc")}</p>
        <div class="g-actions">${actionButton({ label: t("today.reviewSetup"), href: "#/setup" })}</div>
      </div>
    </section>`;
}
