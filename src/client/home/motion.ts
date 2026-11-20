// motion.ts: Minimal and purposeful motion controller following docs/DESIGN.md section 6.

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
        pauseBtn.textContent = pauseBtn.getAttribute("data-play-text") || "Play";
      } else {
        wrapper.classList.remove("is-paused");
        pauseBtn.textContent = pauseBtn.getAttribute("data-pause-text") || "Pause";
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

export function setupStickyPanel(): void {
  const stepItems = document.querySelectorAll<HTMLElement>(".step-item");
  const panelContent = document.getElementById("sticky-panel-content");
  if (!stepItems.length || !panelContent) return;

  const stepData = [
    {
      step: 1,
      title: "The Reddys (Kukatpally)",
      body: "Father (38), Mother (35), Son (9, asthma), Grandmother (68). Morning walk at 6 am, mosquito coil at night, petrol car commute.",
      detail: "1 child with asthma, 1 senior with daily morning walk",
    },
    {
      step: 2,
      title: "Cleanest air window: 14:00 to 17:00",
      body: "Outdoor PM2.5 drops in the afternoon as the atmosphere mixes higher. The dirtiest window is early morning (07:00 to 10:00).",
      detail: "Opposite of grandmother's regular 6 am park walk",
    },
    {
      step: 3,
      title: "Bedroom purifier: 27% dose cut",
      body: "A 120 cfm purifier in the bedroom cuts family overnight exposure. Switching the commute to metro saves 3.26 kg CO2 per day.",
      detail: "All numbers computed live from pure tested formulas",
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
            const data = stepData[currentStep - 1];
            if (data) {
              panelContent.style.opacity = "0";
              setTimeout(() => {
                panelContent.innerHTML = `
                  <h3 class="sticky-panel-title">${data.title}</h3>
                  <p class="sticky-panel-desc">${data.body}</p>
                  <div class="sticky-panel-detail">${data.detail}</div>
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
