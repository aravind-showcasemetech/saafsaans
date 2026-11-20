// main.ts: SaafSaans client entry point

// Self-hosted fonts: Latin, Devanagari and Telugu subsets only, woff2, loaded when used.
import "./styles/fonts.css";

// Import stylesheets in order
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/motion.css";
import "./styles/app.css";

import { renderDemoSelect } from "./app/demo.js";
import { setPageMeta } from "./app/meta.js";
import { router } from "./app/router.js";
import { renderSetupView } from "./app/setup.js";
import { renderShareView } from "./app/share.js";
import { renderTodayView } from "./app/today.js";
import { initHomePage } from "./home/home.js";
import { type SupportedLang, getLanguage, initLanguage, setLanguage } from "./home/i18n.js";
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

async function startApp(): Promise<void> {
  const appRoot = document.getElementById("app");
  if (!appRoot) return;

  // Register routes
  router.register("/", () => {
    initHomePage().catch((err) => {
      console.error("Failed to initialize home page", err);
    });
  });

  router.register("/setup", () => {
    setPageMeta("setup");
    const content = mountAppShell(appRoot);
    renderSetupView(content);
  });

  router.register("/today", () => {
    setPageMeta("today");
    const content = mountAppShell(appRoot);
    renderTodayView(content).catch((err) => {
      console.error("Failed to render Today view", err);
    });
  });

  router.register("/share", () => {
    setPageMeta("share");
    const content = mountAppShell(appRoot);
    renderShareView(content).catch((err) => {
      console.error("Failed to render Share view", err);
    });
  });

  router.register("/demo", () => {
    setPageMeta("demo");
    const content = mountAppShell(appRoot);
    renderDemoSelect(content).catch((err) => {
      console.error("Failed to render Demo select", err);
    });
  });

  // Load the chosen language's dictionary before the first screen renders.
  await initLanguage();
  router.start();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => void startApp());
} else {
  void startApp();
}
