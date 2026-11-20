// location.ts: Step 1 events: place search (mouse and keyboard), use my location, next.
// Coordinates are rounded to 2 decimal places (about 1 km) before they are kept or sent.
import { escapeHtml } from "../../../shared/escape.js";
import { t } from "../../home/i18n.js";
import { type PlaceSuggestion, fetchPlaceDetails, fetchPlaceSuggestions } from "../api.js";
import { saveLocation } from "../storage.js";
import { draft } from "./state.js";

const round = (n: number) => Math.round(n * 100) / 100;

export function attachStep1(container: HTMLElement, next: () => void): void {
  const searchInput = container.querySelector<HTMLInputElement>("#place-search-input");
  const listbox = container.querySelector<HTMLUListElement>("#place-suggestions-listbox");
  const status = container.querySelector<HTMLElement>("#location-status");
  const sessionToken = `sess_${Math.random().toString(36).substring(2, 9)}`;
  let active = -1;

  const options = () => Array.from(listbox?.querySelectorAll<HTMLElement>("[role=option]") ?? []);

  const hideList = () => {
    listbox?.classList.add("hidden");
    searchInput?.setAttribute("aria-expanded", "false");
    searchInput?.removeAttribute("aria-activedescendant");
    active = -1;
  };

  const highlight = (index: number) => {
    const opts = options();
    if (!searchInput || opts.length === 0) return;
    active = (index + opts.length) % opts.length;
    opts.forEach((o, i) => o.setAttribute("aria-selected", String(i === active)));
    searchInput.setAttribute("aria-activedescendant", opts[active].id);
  };

  const choose = async (option: HTMLElement) => {
    if (!searchInput) return;
    const placeId = option.getAttribute("data-id") || "";
    const text = option.getAttribute("data-text") || "";
    searchInput.value = text;
    hideList();
    try {
      const place = await fetchPlaceDetails(placeId, sessionToken);
      draft.selectedLocation = {
        name: place.displayName || text,
        lat: round(place.latitude),
        lng: round(place.longitude),
      };
      saveLocation(draft.selectedLocation);
    } catch (err) {
      console.error("Place details failed", err);
    }
  };

  if (searchInput && listbox) {
    searchInput.addEventListener("input", async () => {
      const val = searchInput.value.trim();
      if (val.length < 2) return hideList();
      try {
        const suggestions = await fetchPlaceSuggestions(val, sessionToken);
        if (!suggestions.length) return hideList();
        listbox.innerHTML = suggestions
          .map(
            (s: PlaceSuggestion, i: number) =>
              `<li id="opt-${i}" class="combobox-option" role="option" aria-selected="false" data-id="${escapeHtml(s.placeId)}" data-text="${escapeHtml(s.text)}">${escapeHtml(s.text)}</li>`,
          )
          .join("");
        active = -1;
        listbox.classList.remove("hidden");
        searchInput.setAttribute("aria-expanded", "true");
      } catch {
        hideList();
      }
    });

    searchInput.addEventListener("keydown", (e) => {
      const open = !listbox.classList.contains("hidden");
      if (e.key === "ArrowDown" && open) {
        e.preventDefault();
        highlight(active + 1);
      } else if (e.key === "ArrowUp" && open) {
        e.preventDefault();
        highlight(active - 1);
      } else if (e.key === "Enter" && open && active >= 0) {
        e.preventDefault();
        void choose(options()[active]);
      } else if (e.key === "Escape" && open) {
        hideList();
      }
    });

    listbox.addEventListener("click", (e) => {
      const option = (e.target as HTMLElement).closest<HTMLElement>("[role=option]");
      if (option) void choose(option);
    });
  }

  container.querySelector("#btn-use-location")?.addEventListener("click", () => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = round(pos.coords.latitude);
        const lng = round(pos.coords.longitude);
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
