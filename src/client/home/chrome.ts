// chrome.ts: The header and footer shared by every screen, and the language switch.
import { type SafeHtml, html } from "../ui/html.js";
import { type SupportedLang, getLanguage, setLanguage, t } from "./i18n.js";

export function renderHeader(): SafeHtml {
  return html`
    <a class="skip-link" href="#main" data-skip>${t("a11y.skip")}</a>
    <header class="site-header">
      <div class="container header-inner">
        <a href="/" class="brand-wordmark">${t("app.title")}</a>
        <div class="header-actions">
          <label class="sr-only" for="lang-select">${t("header.language")}</label>
          <select id="lang-select" class="lang-select">
            <option value="en" lang="en">English</option>
            <option value="hi" lang="hi">हिन्दी</option>
            <option value="te" lang="te">తెలుగు</option>
          </select>
          <nav class="lang-switch" aria-label="${t("header.language")}">
            <button class="lang-btn" data-lang="en" lang="en" type="button">English</button>
            <button class="lang-btn" data-lang="hi" lang="hi" type="button">हिन्दी</button>
            <button class="lang-btn" data-lang="te" lang="te" type="button">తెలుగు</button>
          </nav>
          <a href="#/setup" class="btn btn-primary btn-compact header-plan"><span class="label-long">${t(
            "header.planMyDay",
          )}</span><span class="label-short">${t("header.planShort")}</span></a>
        </div>
      </div>
    </header>`;
}

const REPO_URL = "https://github.com/aravind-showcasemetech/saafsaans";

export function renderFooter(): SafeHtml {
  return html`
    <footer class="site-footer">
      <div class="container footer-inner">
        <p><strong>${t("footer.notMedicalAdviceTitle")}:</strong> ${t("footer.notMedicalAdviceText")}</p>
        <p>${t("footer.googleAttribution")}</p>
        <p class="footer-nav">
          <a href="${REPO_URL}" target="_blank" rel="noopener noreferrer">${t("footer.githubRepo")}</a>
          <a href="#/setup">${t("header.planMyDay")}</a>
          <a href="#/demo">${t("hero.tryHyderabad")}</a>
        </p>
      </div>
    </footer>`;
}
/**
 * Marks the current language (buttons, or the menu on phones) and re-renders on a switch. The skip
 * link moves focus to main without changing the hash route.
 */
export function attachChrome(onLanguageChange: () => void): void {
  const current = getLanguage();
  for (const btn of document.querySelectorAll<HTMLButtonElement>(".lang-btn")) {
    const lang = btn.dataset.lang as SupportedLang;
    if (lang === current) {
      btn.classList.add("active");
      btn.setAttribute("aria-current", "true");
    }
    btn.addEventListener("click", async () => {
      await setLanguage(lang);
      onLanguageChange();
    });
  }
  // The compact language menu on phones.
  const select = document.querySelector<HTMLSelectElement>("#lang-select");
  if (select) {
    select.value = current;
    select.addEventListener("change", async () => {
      await setLanguage(select.value as SupportedLang);
      onLanguageChange();
    });
  }
  document.querySelector<HTMLAnchorElement>("[data-skip]")?.addEventListener("click", (e) => {
    e.preventDefault();
    const main = document.getElementById("main");
    main?.focus();
    main?.scrollIntoView();
  });
}
