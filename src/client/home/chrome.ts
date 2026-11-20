// chrome.ts: The header and footer shared by every screen, and the language switch.
import { escapeHtml } from "../../shared/escape.js";
import { type SupportedLang, getLanguage, setLanguage, t } from "./i18n.js";

export function renderHeader(): string {
  return `
    <a class="skip-link" href="#main" data-skip>${escapeHtml(t("a11y.skip"))}</a>
    <header class="site-header">
      <div class="container header-inner">
        <a href="/" class="brand-wordmark">${escapeHtml(t("app.title"))}</a>
        <div class="header-actions">
          <label class="sr-only" for="lang-select">${escapeHtml(t("header.language"))}</label>
          <select id="lang-select" class="lang-select">
            <option value="en" lang="en">English</option>
            <option value="hi" lang="hi">हिन्दी</option>
            <option value="te" lang="te">తెలుగు</option>
          </select>
          <nav class="lang-switch" aria-label="${escapeHtml(t("header.language"))}">
            <button class="lang-btn" data-lang="en" lang="en" type="button">English</button>
            <button class="lang-btn" data-lang="hi" lang="hi" type="button">हिन्दी</button>
            <button class="lang-btn" data-lang="te" lang="te" type="button">తెలుగు</button>
          </nav>
          <a href="#/setup" class="btn btn-primary btn-compact header-plan"><span class="label-long">${escapeHtml(t("header.planMyDay"))}</span><span class="label-short">${escapeHtml(t("header.planShort"))}</span></a>
        </div>
      </div>
    </header>`;
}

export function renderFooter(): string {
  return `
    <footer class="site-footer">
      <div class="container footer-inner">
        <p><strong>${escapeHtml(t("footer.notMedicalAdviceTitle"))}:</strong> ${escapeHtml(t("footer.notMedicalAdviceText"))}</p>
        <p>${escapeHtml(t("footer.googleAttribution"))}</p>
        <p class="footer-nav">
          <a href="https://github.com/aravind-showcasemetech/saafsaans" target="_blank" rel="noopener noreferrer">${escapeHtml(t("footer.githubRepo"))}</a>
          <a href="#/setup">${escapeHtml(t("header.planMyDay"))}</a>
          <a href="#/demo">${escapeHtml(t("hero.tryHyderabad"))}</a>
        </p>
      </div>
    </footer>`;
}

/**
 * Marks the current language (buttons, or the menu on phones) and re-renders on a switch. The skip link moves focus to main
 * without changing the hash route.
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
