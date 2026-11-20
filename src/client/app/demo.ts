// demo.ts: Demo family selection handler.
// Calls GET /api/demo/households, loads selected demo household into storage,
// maps nicknames back in client storage, and routes directly to #/today.

import { escapeHtml } from "../../shared/escape.js";
import { type DemoHouseholdItem, fetchDemoHouseholds } from "./api.js";
import { router } from "./router.js";
import { saveHouseholdProfile, saveLocation, saveNicknames } from "./storage.js";

interface DemoItemWithMeta extends DemoHouseholdItem {
  name?: string;
  description?: string;
}

export async function renderDemoSelect(container: HTMLElement): Promise<void> {
  container.innerHTML = `
    <section class="section">
      <div class="container container-narrow">
        <h1 class="page-title">
          Try a demo household
        </h1>
        <p class="step-subtext">
          Choose a pre-configured real household to explore the personalized smog plan immediately.
        </p>

        <div id="demo-households-list">
          <div class="loading-placeholder-line loading-box-140"></div>
          <div class="loading-placeholder-line loading-box-120"></div>
        </div>
      </div>
    </section>
  `;

  try {
    const list = (await fetchDemoHouseholds()) as DemoItemWithMeta[];
    const listEl = container.querySelector("#demo-households-list");
    if (!listEl) return;

    listEl.innerHTML = list
      .map(
        (h) => `
        <div class="air-card section-spacer-16 cursor-pointer" data-id="${escapeHtml(h.id)}">
          <div class="section-label">${escapeHtml(h.location.name)}</div>
          <h3 class="card-heading">${escapeHtml(h.name || h.id)}</h3>
          <p class="card-subtext">${escapeHtml(h.description || "")}</p>
          <button class="btn btn-primary btn-select-demo" data-id="${escapeHtml(h.id)}" type="button">Load ${escapeHtml(h.name || h.id)}</button>
        </div>
      `,
      )
      .join("");

    for (const btn of container.querySelectorAll<HTMLButtonElement>(".btn-select-demo")) {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const selected = list.find((h) => h.id === id);
        if (selected) {
          saveLocation(selected.location);
          saveHouseholdProfile(selected.profile);
          saveNicknames(selected.nicknames || {});
          router.navigate("/today");
        }
      });
    }

    // If "the-reddys" is first, clicking the card directly selects it
    const reddys = list.find((h) => h.id === "the-reddys") || list[0];
    if (reddys && !window.location.hash.includes("select")) {
      // Auto select the reddys if clicked "Try a Hyderabad family" from home
      saveLocation(reddys.location);
      saveHouseholdProfile(reddys.profile);
      saveNicknames(reddys.nicknames || {});
      router.navigate("/today");
    }
  } catch (err) {
    console.error("Failed to load demo households", err);
    container.innerHTML = `
      <section class="section">
        <div class="container container-narrow">
          <p class="error-msg">Could not load demo households. Please try again.</p>
        </div>
      </section>
    `;
  }
}
