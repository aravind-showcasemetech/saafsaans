// travel.ts: The "How you travel" step. Choosing "Where do you go?" asks the Routes API (through
// /api/commute) for the distance by each mode and fills in the one-way distance for the chosen
// mode, with Google's beta notice for two-wheeler and walking routes and a note when transit had
// no route. Typing the distance by hand always works.
import { routeForMode } from "../../../shared/commute-mode.js";
import { escapeHtml } from "../../../shared/escape.js";
import type { TravelMode } from "../../../shared/schemas.js";
import { t } from "../../home/i18n.js";
import { attachPlaceCombobox } from "../../ui/combobox.js";
import { fetchCommuteRoutes } from "../api.js";
import { formatIndianNumber } from "../format.js";
import { draft } from "./state.js";

export function attachTravel(container: HTMLElement): void {
  const mode = container.querySelector<HTMLSelectElement>("#commute-mode-select");
  const distance = container.querySelector<HTMLInputElement>("#commute-dist-input");
  const status = container.querySelector<HTMLElement>("#route-status");
  if (!mode || !distance || !status) return;

  /** Fills the distance for the selected mode from the routes already fetched. */
  const apply = () => {
    if (!draft.routes) return;
    const r = routeForMode(draft.routes, mode.value as TravelMode);
    const km = Math.round(r.distanceKm * 10) / 10;
    distance.value = String(km);
    const lines = [
      t("setup.route.filled", {
        mode: t(`setup.route.mode.${r.routesMode}`),
        km: formatIndianNumber(km, 1),
      }),
    ];
    if (r.isBeta) lines.push(t("setup.route.beta"));
    if (r.roadDistanceFallback) lines.push(t("setup.route.roadFallback"));
    status.innerHTML = lines.map((l) => `<p>${escapeHtml(l)}</p>`).join("");
  };

  attachPlaceCombobox(container, "commute-dest-input", async (place) => {
    draft.destination = place;
    status.innerHTML = `<p>${escapeHtml(t("setup.route.loading"))}</p>`;
    try {
      const origin = { lat: draft.selectedLocation.lat, lng: draft.selectedLocation.lng };
      draft.routes = await fetchCommuteRoutes(origin, { lat: place.lat, lng: place.lng });
      apply();
    } catch {
      draft.routes = null;
      status.innerHTML = `<p class="error-text">${escapeHtml(t("setup.route.error"))}</p>`;
    }
  });

  mode.addEventListener("change", apply);
  // Coming back to this step: show the routes already worked out for the current mode.
  if (draft.routes) apply();
}
