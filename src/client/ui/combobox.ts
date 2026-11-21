// combobox.ts: An accessible place search (ARIA combobox and listbox): type to search Places, then
// pick with the mouse or with ArrowUp, ArrowDown, Enter and Escape. Used for where you live and
// where you go. Coordinates are rounded to 2 decimal places (about 1 km) before they are kept.
import { type PlaceSuggestion, fetchPlaceDetails, fetchPlaceSuggestions } from "../app/api.js";
import { t } from "../home/i18n.js";
import { reportError } from "../report-error.js";
import { type SafeHtml, html, setHtml } from "./html.js";

export interface ChosenPlace {
  name: string;
  lat: number;
  lng: number;
}

const round = (n: number) => Math.round(n * 100) / 100;

function optionHtml(id: string, s: PlaceSuggestion, i: number): SafeHtml {
  return html`<li id="${id}-opt-${i}" class="combobox-option" role="option" aria-selected="false"
    data-id="${s.placeId}" data-text="${s.text}">${s.text}</li>`;
}

export function placeComboboxHtml(o: {
  id: string;
  label: string;
  placeholder: string;
  whyKey: string;
  value: string;
}): SafeHtml {
  return html`
    <div class="field">
      <label for="${o.id}" class="field-label">${o.label}</label>
      <div class="combobox">
        <input id="${o.id}" type="text" class="input" role="combobox" aria-autocomplete="list"
          aria-expanded="false" aria-controls="${o.id}-listbox" aria-describedby="${o.id}-why"
          autocomplete="off" placeholder="${o.placeholder}" value="${o.value}" />
        <ul id="${o.id}-listbox" class="combobox-list hidden" role="listbox" aria-label="${o.label}"></ul>
      </div>
      <p class="field-why" id="${o.id}-why"><span class="why-label">${t("setup.whyLabel")}</span> ${t(
        o.whyKey,
      )}</p>
    </div>`;
}

export function attachPlaceCombobox(
  container: HTMLElement,
  id: string,
  onChoose: (place: ChosenPlace) => void | Promise<void>,
): void {
  const input = container.querySelector<HTMLInputElement>(`#${id}`);
  const listbox = container.querySelector<HTMLUListElement>(`#${id}-listbox`);
  if (!(input && listbox)) return;
  const session = `sess_${Math.random().toString(36).substring(2, 9)}`;
  let active = -1;

  const options = () => Array.from(listbox.querySelectorAll<HTMLElement>("[role=option]"));
  const hide = () => {
    listbox.classList.add("hidden");
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    active = -1;
  };
  const highlight = (index: number) => {
    const opts = options();
    if (opts.length === 0) return;
    active = (index + opts.length) % opts.length;
    opts.forEach((o, i) => o.setAttribute("aria-selected", String(i === active)));
    input.setAttribute("aria-activedescendant", opts[active].id);
  };
  const choose = async (option: HTMLElement) => {
    const text = option.dataset.text ?? "";
    input.value = text;
    hide();
    try {
      const place = await fetchPlaceDetails(option.dataset.id ?? "", session);
      await onChoose({
        name: place.displayName || text,
        lat: round(place.latitude),
        lng: round(place.longitude),
      });
    } catch (err) {
      reportError("Place details failed", err);
    }
  };

  input.addEventListener("input", async () => {
    const val = input.value.trim();
    if (val.length < 2) return hide();
    try {
      const suggestions = await fetchPlaceSuggestions(val, session);
      if (!suggestions.length) return hide();
      setHtml(listbox, html`${suggestions.map((s, i) => optionHtml(id, s, i))}`);
      active = -1;
      listbox.classList.remove("hidden");
      input.setAttribute("aria-expanded", "true");
    } catch {
      hide();
    }
  });

  input.addEventListener("keydown", (e) => {
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
      hide();
    }
  });

  listbox.addEventListener("click", (e) => {
    const option = (e.target as HTMLElement).closest<HTMLElement>("[role=option]");
    if (option) void choose(option);
  });
}
