// location.ts: Step 1 events: place search, use my location, next.
import { escapeHtml } from "../../../shared/escape.js";
import { t } from "../../home/i18n.js";
import { type PlaceSuggestion, fetchPlaceDetails, fetchPlaceSuggestions } from "../api.js";
import { saveLocation } from "../storage.js";
import { draft } from "./state.js";

export function attachStep1(container: HTMLElement, next: () => void): void {
  const searchInput = container.querySelector<HTMLInputElement>("#place-search-input");
  const listbox = container.querySelector<HTMLUListElement>("#place-suggestions-listbox");
  const status = container.querySelector<HTMLElement>("#location-status");
  const sessionToken = `sess_${Math.random().toString(36).substring(2, 9)}`;

  const hideList = () => {
    listbox?.classList.add("hidden");
    searchInput?.setAttribute("aria-expanded", "false");
  };

  if (searchInput && listbox) {
    searchInput.addEventListener("input", async () => {
      const val = searchInput.value.trim();
      if (val.length < 2) return hideList();
      try {
        const suggestions = await fetchPlaceSuggestions(val, sessionToken);
        if (!suggestions?.length) return hideList();
        listbox.innerHTML = suggestions
          .map(
            (s: PlaceSuggestion, i: number) => `
              <li id="opt-${i}" class="combobox-option" role="option" data-id="${escapeHtml(s.placeId)}" data-text="${escapeHtml(s.primaryText)}">
                ${escapeHtml(s.primaryText)}${s.secondaryText ? ` <span class="combobox-meta-text">${escapeHtml(s.secondaryText)}</span>` : ""}
              </li>`,
          )
          .join("");
        listbox.classList.remove("hidden");
        searchInput.setAttribute("aria-expanded", "true");
      } catch {
        hideList();
      }
    });

    listbox.addEventListener("click", async (e) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>(".combobox-option");
      if (!target) return;
      const placeId = target.getAttribute("data-id") || "";
      const text = target.getAttribute("data-text") || "";
      searchInput.value = text;
      hideList();
      try {
        const details = await fetchPlaceDetails(placeId, sessionToken);
        if (details?.location) {
          draft.selectedLocation = {
            name: text,
            lat: Math.round(details.location.lat * 100) / 100,
            lng: Math.round(details.location.lng * 100) / 100,
          };
          saveLocation(draft.selectedLocation);
        }
      } catch (err) {
        console.error("Place details failed", err);
      }
    });
  }

  container.querySelector("#btn-use-location")?.addEventListener("click", () => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Math.round(pos.coords.latitude * 100) / 100;
        const lng = Math.round(pos.coords.longitude * 100) / 100;
        draft.selectedLocation = { name: `${t("setup.myLocation")} (${lat}, ${lng})`, lat, lng };
        if (searchInput) searchInput.value = draft.selectedLocation.name;
        saveLocation(draft.selectedLocation);
      },
      () => {
        if (status) status.textContent = t("setup.locationError");
      },
    );
  });

  container.querySelector("#btn-to-step-2")?.addEventListener("click", () => {
    saveLocation(draft.selectedLocation);
    next();
  });
}
