// steps.ts: The stepper and the HTML for step 1 (location) and step 2 (household).
import { escapeHtml } from "../../../shared/escape.js";
import { t } from "../../home/i18n.js";
import { placeLabel } from "../format.js";
import { field, memberCardHtml, options } from "./fields.js";
import { draft } from "./state.js";

export function step1Html(): string {
  return `
    <h2 class="step-title" tabindex="-1">${t("setup.whereTitle")}</h2>
    <p class="step-subtext">${t("setup.whereHelp")}</p>
    <div class="form-group">
      <label for="place-search-input" class="form-label">${t("setup.searchLabel")}</label>
      <div class="combobox-wrapper">
        <input id="place-search-input" type="text" class="form-input" role="combobox" aria-autocomplete="list"
          aria-expanded="false" aria-controls="place-suggestions-listbox"
          placeholder="${escapeHtml(t("setup.searchPlaceholder"))}" value="${escapeHtml(placeLabel(draft.selectedLocation.name))}" />
        <ul id="place-suggestions-listbox" class="combobox-listbox hidden" role="listbox" aria-label="${escapeHtml(t("setup.searchLabel"))}"></ul>
      </div>
      <div class="combobox-meta-row">
        <button id="btn-use-location" class="btn-text" type="button">${t("setup.useLocation")}</button>
        <span class="combobox-meta-text">${t("setup.roundedNote")}</span>
      </div>
      <p id="location-status" class="error-msg" role="status"></p>
    </div>
    <div class="privacy-notice-box">${t("setup.googleNote")}</div>
    <div class="flex-justify-end">
      <button id="btn-to-step-2" class="btn btn-primary" type="button">${t("setup.nextHousehold")}</button>
    </div>`;
}

export function step2Html(): string {
  const canRemove = draft.householdMembers.length > 1;
  return `
    <h2 class="step-title" tabindex="-1">${t("setup.whoTitle")}</h2>
    <p class="step-subtext">${t("setup.whoHelp")}</p>
    <div id="members-list">${draft.householdMembers.map((m, i) => memberCardHtml(m, i, canRemove)).join("")}</div>
    <div class="section-spacer-24">
      <button id="btn-add-member" class="btn btn-secondary" type="button">${t("setup.addMember")}</button>
    </div>
    <h3 class="section-heading-spaced">${t("setup.travelTitle")}</h3>
    <div class="grid-12 grid-gap-12 section-spacer-24">
      ${field(
        "commute-mode-select",
        t("setup.travelMode"),
        `<select id="commute-mode-select" class="form-select">${options(
          [
            ["petrol_car", t("setup.modePetrolCar")],
            ["petrol_car_small", t("setup.modeSmallCar")],
            ["diesel_car", t("setup.modeDieselCar")],
            ["scooter", t("setup.modeScooter")],
            ["motorcycle", t("setup.modeMotorcycle")],
            ["auto", t("setup.modeAuto")],
            ["bus", t("setup.modeBus")],
            ["metro", t("setup.modeMetro")],
            ["walk_cycle", t("setup.modeWalk")],
          ],
          draft.commuteMode,
        )}</select>`,
      )}
      ${field("commute-dist-input", t("setup.distance"), `<input id="commute-dist-input" type="number" min="0" max="100" class="form-input" value="${draft.commuteDistanceKm}" />`)}
    </div>
    <h3 class="section-heading-spaced">${t("setup.homeTitle")}</h3>
    <div class="grid-12 grid-gap-12 section-spacer-24">
      ${field("bedroom-sqft-input", t("setup.bedroomArea"), `<input id="bedroom-sqft-input" type="number" min="50" max="1000" class="form-input" value="${draft.bedroomSqFt}" />`)}
      ${field("ceiling-height-input", t("setup.ceilingHeight"), `<input id="ceiling-height-input" type="number" min="7" max="20" class="form-input" value="${draft.ceilingHeightFt}" />`)}
      ${field(
        "window-habit-select",
        t("setup.windowHabit"),
        `<select id="window-habit-select" class="form-select">${options(
          [
            ["mostly_shut", t("setup.windowShut")],
            ["open_day_shut_night", t("setup.windowDay")],
            ["mostly_open", t("setup.windowOpen")],
          ],
          draft.windowHabit,
        )}</select>`,
      )}
      ${field(
        "cooking-method-select",
        t("setup.cooking"),
        `<select id="cooking-method-select" class="form-select">${options(
          [
            ["gas", t("setup.cookGas")],
            ["induction", t("setup.cookInduction")],
            ["lots_of_frying", t("setup.cookFrying")],
          ],
          draft.cookingMethod,
        )}</select>`,
      )}
    </div>
    <div class="checkbox-group-vertical">
      <label class="checkbox-label-sm"><input type="checkbox" id="check-has-purifier" ${draft.hasPurifier ? "checked" : ""} /><span>${t("setup.hasPurifier")}</span></label>
      <label class="checkbox-label-sm"><input type="checkbox" id="check-uses-incense" ${draft.usesIncense ? "checked" : ""} /><span>${t("setup.incense")}</span></label>
      <label class="checkbox-label-sm"><input type="checkbox" id="check-uses-coils" ${draft.usesMosquitoCoils ? "checked" : ""} /><span>${t("setup.coils")}</span></label>
    </div>
    <div class="stepper-nav-footer">
      <button id="btn-back-step-1" class="btn btn-secondary" type="button">${t("setup.back")}</button>
      <button id="btn-save-setup" class="btn btn-primary" type="button">${t("setup.save")}</button>
    </div>`;
}

export function stepperHtml(): string {
  const step = (n: number, label: string) =>
    `<li class="step-indicator ${draft.currentStep === n ? "active" : ""}" ${draft.currentStep === n ? 'aria-current="step"' : ""}><span class="step-number">${n}</span><span>${label}</span></li>`;
  return `<ol class="stepper-header" aria-label="${escapeHtml(t("setup.stepsLabel"))}">${step(1, t("setup.stepLocation"))}${step(2, t("setup.stepHousehold"))}</ol>`;
}
