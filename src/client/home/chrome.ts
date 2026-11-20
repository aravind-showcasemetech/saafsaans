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
          <nav class="lang-switch" aria-label="${escapeHtml(t("header.language"))}">
            <button class="lang-btn" data-lang="en" lang="en" type="button">English</button>
            <button class="lang-btn" data-lang="hi" lang="hi" type="button">हिन्दी</button>
            <button class="lang-btn" data-lang="te" lang="te" type="button">తెలుగు</button>
          </nav>
          <a href="#/setup" class="btn btn-primary btn-compact">${escapeHtml(t("header.planMyDay"))}</a>
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
 * Marks the current language and re-renders on a switch. The skip link moves focus to main
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
  document.querySelector<HTMLAnchorElement>("[data-skip]")?.addEventListener("click", (e) => {
    e.preventDefault();
    const main = document.getElementById("main");
    main?.focus();
    main?.scrollIntoView();
  });
}
