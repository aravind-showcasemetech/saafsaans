// main.ts: SaafSaans client entry point

// Self-hosted fonts: Latin, Devanagari and Telugu subsets only, woff2, loaded when used.
import "./styles/fonts.css";

// Stylesheets in order
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/diagrams.css";
import "./styles/motion.css";
import "./styles/print.css";

import { renderDemoSelect } from "./app/demo.js";
import { setPageMeta } from "./app/meta.js";
import { router } from "./app/router.js";
import { renderSetupView } from "./app/setup.js";
import { renderShareView } from "./app/share.js";
import { renderTodayView } from "./app/today.js";
import { attachChrome, renderFooter, renderHeader } from "./home/chrome.js";
import { initHomePage } from "./home/home.js";
import { initLanguage } from "./home/i18n.js";
import { reportError } from "./report-error.js";

/** Header, main and footer for the app screens; returns main. */
function mountAppShell(appRoot: HTMLElement): HTMLElement {
  appRoot.innerHTML = `${renderHeader()}<main id="main" class="app-main" tabindex="-1"></main>${renderFooter()}`;
  attachChrome(() => router.start());
  return document.getElementById("main") || appRoot;
}

async function startApp(): Promise<void> {
  const appRoot = document.getElementById("app");
  if (!appRoot) return;

  // Register routes
  router.register("/", () => {
    initHomePage().catch((err) => {
      reportError("Failed to initialize home page", err);
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
      reportError("Failed to render Today view", err);
    });
  });

  router.register("/share", () => {
    setPageMeta("share");
    const content = mountAppShell(appRoot);
    renderShareView(content).catch((err) => {
      reportError("Failed to render Share view", err);
    });
  });

  router.register("/demo", () => {
    setPageMeta("demo");
    const content = mountAppShell(appRoot);
    renderDemoSelect(content).catch((err) => {
      reportError("Failed to render Demo select", err);
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
