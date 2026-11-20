// main.ts: SaafSaans client entry point

import "./zod-csp.js";

// Import self-hosted Noto Sans fonts (weights 400, 500, 600 only)
import "@fontsource/noto-sans/400.css";
import "@fontsource/noto-sans/500.css";
import "@fontsource/noto-sans/600.css";

import "@fontsource/noto-sans-devanagari/400.css";
import "@fontsource/noto-sans-devanagari/500.css";
import "@fontsource/noto-sans-devanagari/600.css";

import "@fontsource/noto-sans-telugu/400.css";
import "@fontsource/noto-sans-telugu/500.css";
import "@fontsource/noto-sans-telugu/600.css";

// Import stylesheets in order
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/motion.css";
import "./styles/app.css";

import { renderDemoSelect } from "./app/demo.js";
import { router } from "./app/router.js";
import { renderSetupView } from "./app/setup.js";
import { renderShareView } from "./app/share.js";
import { renderTodayView } from "./app/today.js";
import { initHomePage } from "./home/home.js";
import { type SupportedLang, getLanguage, setLanguage } from "./home/i18n.js";
import { setupHeaderScroll } from "./home/motion.js";
import { renderFooter, renderHeader } from "./home/render.js";

function mountAppShell(appRoot: HTMLElement): HTMLElement {
  const headerHtml = renderHeader();
  const footerHtml = renderFooter();

  appRoot.innerHTML = `
    ${headerHtml}
    <main id="app-content" role="main"></main>
    ${footerHtml}
  `;

  // Attach language switcher events
  const current = getLanguage();
  for (const btn of document.querySelectorAll<HTMLButtonElement>(".lang-btn")) {
    const lang = btn.getAttribute("data-lang") as SupportedLang;
    if (lang === current) {
      btn.classList.add("active");
      btn.setAttribute("aria-current", "true");
    }
    btn.addEventListener("click", async () => {
      await setLanguage(lang);
      // Re-trigger current route to reload with new language
      router.start();
    });
  }

  setupHeaderScroll();

  return document.getElementById("app-content") || appRoot;
}

function startApp(): void {
  const appRoot = document.getElementById("app");
  if (!appRoot) return;

  // Register routes
  router.register("/", () => {
    initHomePage().catch((err) => {
      console.error("Failed to initialize home page", err);
    });
  });

  router.register("/setup", () => {
    const content = mountAppShell(appRoot);
    renderSetupView(content);
  });

  router.register("/today", () => {
    const content = mountAppShell(appRoot);
    renderTodayView(content).catch((err) => {
      console.error("Failed to render Today view", err);
    });
  });

  router.register("/share", () => {
    const content = mountAppShell(appRoot);
    renderShareView(content).catch((err) => {
      console.error("Failed to render Share view", err);
    });
  });

  router.register("/demo", () => {
    const content = mountAppShell(appRoot);
    renderDemoSelect(content).catch((err) => {
      console.error("Failed to render Demo select", err);
    });
  });

  // Start router
  router.start();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startApp);
} else {
  startApp();
}
