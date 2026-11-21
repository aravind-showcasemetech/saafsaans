// demo.ts: Demo family selection.
// Calls GET /api/demo/households, loads the chosen household into storage (nicknames stay in the
// browser) and routes to #/today. "Try a Hyderabad family" opens the Reddys straight away;
// #/demo?select shows the list.

import { escapeHtml } from "../../shared/escape.js";
import { t } from "../home/i18n.js";
import { reportError } from "../report-error.js";
import { actionButton, guideSection } from "../ui/section.js";
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
  const page = (content: string) =>
    guideSection({
      id: "demo",
      level: 1,
      stepLabel: t("demo.label"),
      icon: "users",
      title: t("demo.title"),
      shows: t("demo.shows"),
      can: t("demo.lead"),
      content,
      actions: actionButton({
        label: t("hero.setUpHousehold"),
        href: "#/setup",
        kind: "secondary",
      }),
      className: "is-visible",
    });
  container.innerHTML = page(
    `<p class="muted" role="status">${escapeHtml(t("today.loading"))}</p>`,
  );

  try {
    const list = await fetchDemoHouseholds();
    if (!window.location.hash.includes("select")) {
      const reddys = list.find((h) => h.id === "the-reddys") ?? list[0];
      if (reddys) return openHousehold(reddys);
    }
    const cards = list
      .map((h) => {
        const name = householdText(h.id, "name");
        return `
          <article class="panel" aria-labelledby="demo-${escapeHtml(h.id)}">
            <p class="muted small">${escapeHtml(placeLabel(h.location.name))}</p>
            <h2 class="list-title" id="demo-${escapeHtml(h.id)}">${escapeHtml(name)}</h2>
            <p>${escapeHtml(householdText(h.id, "description"))}</p>
            ${actionButton({ label: t("demo.load", { name }), attrs: `data-id="${escapeHtml(h.id)}"`, kind: "primary" }).replace('class="btn btn-primary"', 'class="btn btn-primary btn-select-demo"')}
          </article>`;
      })
      .join("");
    container.innerHTML = page(`<div class="two-col">${cards}</div>`);
    for (const btn of container.querySelectorAll<HTMLButtonElement>(".btn-select-demo")) {
      btn.addEventListener("click", () => {
        const selected = list.find((h) => h.id === btn.dataset.id);
        if (selected) openHousehold(selected);
      });
    }
  } catch (err) {
    reportError("Failed to load demo households", err);
    container.innerHTML = page(
      `<p class="error-text" role="alert">${escapeHtml(t("demo.error"))}</p>`,
    );
  }
}
