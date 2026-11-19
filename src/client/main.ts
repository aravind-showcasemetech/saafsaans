// main.ts: SaafSaans client entry point

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

import { initHomePage } from "./home/home.js";

// Initialize application
document.addEventListener("DOMContentLoaded", () => {
  initHomePage().catch((err) => {
    console.error("Failed to initialize home page", err);
  });
});
