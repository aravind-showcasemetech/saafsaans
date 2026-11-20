// motion.ts: Minimal and purposeful motion controller following docs/DESIGN.md section 6.

import { formatIndianNumber, windowText } from "../app/format.js";
import { t } from "./i18n.js";

export function setupScrollReveal(): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    for (const el of document.querySelectorAll(".reveal-on-scroll")) {
      el.classList.add("is-visible");
    }
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.15 },
  );

  for (const el of document.querySelectorAll(".reveal-on-scroll")) {
    observer.observe(el);
  }
}

export function setupMarquees(): void {
  const marqueeWrappers = document.querySelectorAll<HTMLElement>(".marquee-wrapper");

  for (const wrapper of marqueeWrappers) {
    const pauseBtn = wrapper.querySelector<HTMLButtonElement>(".marquee-toggle-btn");
    if (!pauseBtn) continue;

    let isPaused = false;

    pauseBtn.addEventListener("click", () => {
      isPaused = !isPaused;
      if (isPaused) {
        wrapper.classList.add("is-paused");
        pauseBtn.textContent = pauseBtn.getAttribute("data-play-text") || t("common.play");
      } else {
        wrapper.classList.remove("is-paused");
        pauseBtn.textContent = pauseBtn.getAttribute("data-pause-text") || t("common.pause");
      }
    });
  }
}

export function setupHeaderScroll(): void {
  const header = document.querySelector<HTMLElement>(".site-header");
  if (!header) return;

  window.addEventListener(
    "scroll",
    () => {
      if (window.scrollY > 20) {
        header.classList.add("scrolled");
      } else {
        header.classList.remove("scrolled");
      }
    },
    { passive: true },
  );
}

export interface StickyPanelData {
  windows: {
    cleanest: { startHour: number; endHour: number } | null;
    dirtiest: { startHour: number; endHour: number } | null;
  };
  reddys: { protectDoseCut: number; purifierCadrCfm: number; polluteLessWeeklyCo2: number };
}

export function setupStickyPanel(data: StickyPanelData): void {
  const stepItems = document.querySelectorAll<HTMLElement>(".step-item");
  const panelContent = document.getElementById("sticky-panel-content");
  if (!stepItems.length || !panelContent) return;

  const none = t("today.noWindow");
  const stepData = [
    {
      title: t("sticky.familyTitle"),
      body: t("sticky.familyBody"),
      detail: t("sticky.familyDetail"),
    },
    {
      title: t("sticky.windowTitle", { window: windowText(data.windows.cleanest) ?? none }),
      body: t("sticky.windowBody", {
        pm: "PM2.5",
        dirtiest: windowText(data.windows.dirtiest) ?? none,
      }),
      detail: t("sticky.windowDetail"),
    },
    {
      title: t("sticky.numbersTitle", { percent: data.reddys.protectDoseCut }),
      body: t("sticky.numbersBody", {
        cfm: formatIndianNumber(data.reddys.purifierCadrCfm),
        kg: formatIndianNumber(data.reddys.polluteLessWeeklyCo2),
      }),
      detail: t("sticky.numbersDetail"),
    },
  ];

  let currentStep = 1;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const stepNum = Number(entry.target.getAttribute("data-step"));
          if (stepNum && stepNum !== currentStep) {
            currentStep = stepNum;
            const step = stepData[currentStep - 1];
            if (step) {
              panelContent.style.opacity = "0";
              setTimeout(() => {
                panelContent.innerHTML = `
                  <h3 class="sticky-panel-title">${step.title}</h3>
                  <p class="sticky-panel-desc">${step.body}</p>
                  <div class="sticky-panel-detail">${step.detail}</div>
                `;
                panelContent.style.opacity = "1";
              }, 200);
            }
          }
        }
      }
    },
    { threshold: 0.5 },
  );

  for (const item of stepItems) {
    observer.observe(item);
  }
}
