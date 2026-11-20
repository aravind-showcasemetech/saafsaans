// location.ts: The location step: the place search and "use my location".
// Coordinates are rounded to 2 decimal places (about 1 km) before they are kept or sent.
import { t } from "../../home/i18n.js";
import { attachPlaceCombobox } from "../../ui/combobox.js";
import { saveLocation } from "../storage.js";
import { draft } from "./state.js";

const round = (n: number) => Math.round(n * 100) / 100;

export function attachLocation(container: HTMLElement): void {
  const input = container.querySelector<HTMLInputElement>("#place-search-input");
  const status = container.querySelector<HTMLElement>("#location-status");

  attachPlaceCombobox(container, "place-search-input", (place) => {
    draft.selectedLocation = place;
    // A new home means any routes worked out from the old one no longer apply.
    draft.routes = null;
    saveLocation(place);
  });

  container.querySelector("#btn-use-location")?.addEventListener("click", () => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = round(pos.coords.latitude);
        const lng = round(pos.coords.longitude);
        draft.selectedLocation = { name: `${t("setup.myLocation")} (${lat}, ${lng})`, lat, lng };
        draft.routes = null;
        if (input) input.value = draft.selectedLocation.name;
        saveLocation(draft.selectedLocation);
      },
      () => {
        if (status) status.textContent = t("setup.locationError");
      },
    );
  });
}
