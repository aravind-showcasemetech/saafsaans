// demo.ts: Demo family selection.
// Calls GET /api/demo/households, loads the chosen household into storage (nicknames stay in the
// browser) and routes to #/today. "Try a Hyderabad family" opens the Reddys straight away;
// #/demo?select shows the list.

import { t } from "../home/i18n.js";
import { reportError } from "../report-error.js";
import { type SafeHtml, html, setHtml } from "../ui/html.js";
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

function householdCard(h: DemoHouseholdItem): SafeHtml {
  const name = householdText(h.id, "name");
  return html`
          <article class="panel" aria-labelledby="demo-${h.id}">
            <p class="muted small">${placeLabel(h.location.name)}</p>
            <h2 class="list-title" id="demo-${h.id}">${name}</h2>
            <p>${householdText(h.id, "description")}</p>
            ${actionButton({
              label: t("demo.load", { name }),
              data: { id: h.id },
              kind: "primary",
              extraClass: "btn-select-demo",
            })}
          </article>`;
}

export async function renderDemoSelect(container: HTMLElement): Promise<void> {
  const page = (content: SafeHtml) =>
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
  setHtml(container, page(html`<p class="muted" role="status">${t("today.loading")}</p>`));

  try {
    const list = await fetchDemoHouseholds();
    if (!window.location.hash.includes("select")) {
      const reddys = list.find((h) => h.id === "the-reddys") ?? list[0];
      if (reddys) return openHousehold(reddys);
    }
    setHtml(container, page(html`<div class="two-col">${list.map(householdCard)}</div>`));
    for (const btn of container.querySelectorAll<HTMLButtonElement>(".btn-select-demo")) {
      btn.addEventListener("click", () => {
        const selected = list.find((h) => h.id === btn.dataset.id);
        if (selected) openHousehold(selected);
      });
    }
  } catch (err) {
    reportError("Failed to load demo households", err);
    setHtml(container, page(html`<p class="error-text" role="alert">${t("demo.error")}</p>`));
  }
}
