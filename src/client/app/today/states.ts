// states.ts: The Today screen while loading and when the plan cannot be loaded.
import { escapeHtml } from "../../../shared/escape.js";
import { t } from "../../home/i18n.js";
import { actionButton } from "../../ui/section.js";

export function loadingHtml(): string {
  return `
    <section class="g-section" aria-labelledby="today-loading-title">
      <div class="g-inner">
        <h1 id="today-loading-title" class="g-title">${escapeHtml(t("today.title"))}</h1>
        <p class="muted" role="status">${escapeHtml(t("today.loading"))}</p>
      </div>
    </section>`;
}

export function errorHtml(): string {
  return `
    <section class="g-section" aria-labelledby="today-error-title">
      <div class="g-inner">
        <h1 id="today-error-title" class="g-title">${escapeHtml(t("today.loadErrorTitle"))}</h1>
        <p>${escapeHtml(t("today.loadErrorDesc"))}</p>
        <div class="g-actions">${actionButton({ label: t("today.reviewSetup"), href: "#/setup" })}</div>
      </div>
    </section>`;
}
