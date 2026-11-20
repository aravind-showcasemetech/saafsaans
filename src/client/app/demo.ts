// demo.ts: Demo family selection.
// Calls GET /api/demo/households, loads the chosen household into storage (nicknames stay in the
// browser) and routes to #/today. "Try a Hyderabad family" opens the Reddys straight away;
// #/demo?select shows the list.

import { escapeHtml } from "../../shared/escape.js";
import { t } from "../home/i18n.js";
import { type DemoHouseholdItem, fetchDemoHouseholds } from "./api.js";
import { placeLabel } from "./format.js";
import { router } from "./router.js";
import { clearToggledSwaps, saveHouseholdProfile, saveLocation, saveNicknames } from "./storage.js";

function householdText(id: string, field: "name" | "description"): string {
  const key = `demoHouseholds.${id}.${field}`;
  const text = t(key);
  return text === key ? id : text;
}

function openHousehold(h: DemoHouseholdItem): void {
  saveLocation(h.location);
  saveHouseholdProfile(h.profile);
  saveNicknames(h.nicknames || {});
  clearToggledSwaps();
  router.navigate("/today");
}

export async function renderDemoSelect(container: HTMLElement): Promise<void> {
  container.innerHTML = `
    <section class="section">
      <div class="container container-narrow">
        <h1 class="page-title">${t("demo.title")}</h1>
        <p class="step-subtext">${t("demo.lead")}</p>
        <div id="demo-households-list">
          <div class="loading-placeholder-line loading-box-140"></div>
          <div class="loading-placeholder-line loading-box-120"></div>
        </div>
      </div>
    </section>`;

  try {
    const list = await fetchDemoHouseholds();
    if (!window.location.hash.includes("select")) {
      const reddys = list.find((h) => h.id === "the-reddys") ?? list[0];
      if (reddys) return openHousehold(reddys);
    }

    const listEl = container.querySelector("#demo-households-list");
    if (!listEl) return;
    listEl.innerHTML = list
      .map((h) => {
        const name = householdText(h.id, "name");
        return `
          <div class="air-card section-spacer-16">
            <div class="section-label">${escapeHtml(placeLabel(h.location.name))}</div>
            <h2 class="card-heading">${escapeHtml(name)}</h2>
            <p class="card-subtext">${escapeHtml(householdText(h.id, "description"))}</p>
            <button class="btn btn-primary btn-select-demo" data-id="${escapeHtml(h.id)}" type="button">${escapeHtml(t("demo.load", { name }))}</button>
          </div>`;
      })
      .join("");

    for (const btn of container.querySelectorAll<HTMLButtonElement>(".btn-select-demo")) {
      btn.addEventListener("click", () => {
        const selected = list.find((h) => h.id === btn.getAttribute("data-id"));
        if (selected) openHousehold(selected);
      });
    }
  } catch (err) {
    console.error("Failed to load demo households", err);
    container.innerHTML = `
      <section class="section">
        <div class="container container-narrow">
          <p class="error-msg" role="alert">${t("demo.error")}</p>
        </div>
      </section>`;
  }
}
