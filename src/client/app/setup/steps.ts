// steps.ts: The content of each setup step, and the review in plain sentences.
import { escapeHtml } from "../../../shared/escape.js";
import { t } from "../../home/i18n.js";
import { placeComboboxHtml } from "../../ui/combobox.js";
import { formatIndianNumber, placeLabel } from "../format.js";
import { field, memberCardHtml, numberInput, options, selectInput } from "./fields.js";
import { type StepId, draft } from "./state.js";

const e = escapeHtml;

function locationHtml(): string {
  return `
    ${placeComboboxHtml({
      id: "place-search-input",
      label: t("setup.searchLabel"),
      placeholder: t("setup.searchPlaceholder"),
      whyKey: "setup.why.location",
      value: placeLabel(draft.selectedLocation.name),
    })}
    <p><button id="btn-use-location" class="btn btn-secondary" type="button">${e(t("setup.useLocation"))}</button> <span class="muted small">${e(t("setup.roundedNote"))}</span></p>
    <p id="location-status" class="error-text" role="status"></p>
    <p class="muted small">${e(t("setup.googleNote"))}</p>`;
}

function peopleHtml(): string {
  const canRemove = draft.householdMembers.length > 1;
  return `
    <div id="members-list" class="stack">${draft.householdMembers.map((m, i) => memberCardHtml(m, i, canRemove)).join("")}</div>
    <p><button id="btn-add-member" class="btn btn-secondary" type="button">${e(t("setup.addMember"))}</button></p>`;
}

function travelHtml(): string {
  const modes: Array<[string, string]> = [
    ["petrol_car", t("setup.modePetrolCar")],
    ["petrol_car_small", t("setup.modeSmallCar")],
    ["diesel_car", t("setup.modeDieselCar")],
    ["cng_car", t("setup.modeCngCar")],
    ["scooter", t("setup.modeScooter")],
    ["motorcycle", t("setup.modeMotorcycle")],
    ["auto", t("setup.modeAuto")],
    ["bus", t("setup.modeBus")],
    ["metro", t("setup.modeMetro")],
    ["walk_cycle", t("setup.modeWalk")],
  ];
  return `
    <div class="field-grid">
      ${field("commute-mode-select", t("setup.travelMode"), "setup.why.mode", selectInput("commute-mode-select", "", options(modes, draft.commuteMode)))}
      ${placeComboboxHtml({
        id: "commute-dest-input",
        label: t("setup.destination"),
        placeholder: t("setup.destPlaceholder"),
        whyKey: "setup.why.destination",
        value: draft.destination?.name ?? "",
      })}
      ${field("commute-dist-input", t("setup.distance"), "setup.why.distance", numberInput("commute-dist-input", draft.commuteDistanceKm, 0, 200, 0.1))}
      ${field("commute-days-input", t("setup.days"), "setup.why.days", numberInput("commute-days-input", draft.workingDaysPerWeek, 1, 7))}
      ${field("commute-people-input", t("setup.sharing"), "setup.why.sharing", numberInput("commute-people-input", draft.peopleSharing, 1, 10))}
    </div>
    <div id="route-status" class="route-status" role="status" aria-live="polite"></div>
    <p class="muted small">${e(t("setup.routesNote"))}</p>`;
}

function homeHtml(): string {
  const check = (id: string, on: boolean, labelKey: string, whyKey: string) => `
    <div class="field">
      <label class="toggle"><input type="checkbox" id="${id}" ${on ? "checked" : ""} aria-describedby="${id}-why" /><span>${e(t(labelKey))}</span></label>
      <p class="field-why" id="${id}-why"><span class="why-label">${e(t("setup.whyLabel"))}</span> ${e(t(whyKey))}</p>
    </div>`;
  return `
    <div class="field-grid">
      ${field("bedroom-sqft-input", t("setup.bedroomArea"), "setup.why.area", numberInput("bedroom-sqft-input", draft.bedroomSqFt, 20, 2000))}
      ${field("ceiling-height-input", t("setup.ceilingHeight"), "setup.why.height", numberInput("ceiling-height-input", draft.ceilingHeightFt, 6, 25, 0.5))}
      ${field(
        "window-habit-select",
        t("setup.windowHabit"),
        "setup.why.windows",
        selectInput(
          "window-habit-select",
          "",
          options(
            [
              ["mostly_shut", t("setup.windowShut")],
              ["open_day_shut_night", t("setup.windowDay")],
              ["mostly_open", t("setup.windowOpen")],
            ],
            draft.windowHabit,
          ),
        ),
      )}
      ${field(
        "cooking-method-select",
        t("setup.cooking"),
        "setup.why.cooking",
        selectInput(
          "cooking-method-select",
          "",
          options(
            [
              ["gas", t("setup.cookGas")],
              ["induction", t("setup.cookInduction")],
              ["lots_of_frying", t("setup.cookFrying")],
            ],
            draft.cookingMethod,
          ),
        ),
      )}
    </div>
    ${check("check-has-purifier", draft.hasPurifier, "setup.hasPurifier", "setup.why.purifier")}
    ${field("purifier-cadr-input", t("setup.purifierCadr"), "setup.why.cadr", numberInput("purifier-cadr-input", draft.purifierCadrCfm ?? "", 0, 2000))}
    ${check("check-uses-incense", draft.usesIncense, "setup.incense", "setup.why.incense")}
    ${check("check-uses-coils", draft.usesMosquitoCoils, "setup.coils", "setup.why.coils")}`;
}

function reviewGroup(step: StepId, titleKey: string, lines: string[]): string {
  return `
    <div class="review-group panel">
      <h2 class="list-title">${e(t(titleKey))}</h2>
      <ul class="review-lines">${lines.map((l) => `<li>${l}</li>`).join("")}</ul>
      <a class="btn btn-secondary" href="#/setup?step=${step}" aria-label="${e(t("setup.editGroup", { group: t(titleKey) }))}">${e(t("setup.edit"))}</a>
    </div>`;
}

function reviewHtml(): string {
  const yes = (v: boolean) => t(v ? "setup.review.yes" : "setup.review.no");
  const people = draft.householdMembers.map(
    (m) =>
      `<span class="nickname">${e(m.nickname)}</span>: ${e(t("setup.review.person", { age: t(`setup.reviewAge.${m.ageBand}`), routine: t(`setup.reviewRoutine.${m.routinePreset}`), health: t(`setup.reviewHealth.${m.sensitivity}`) }))}${m.outdoorExerciseMinutes > 0 ? ` ${e(t("setup.review.exercise", { minutes: formatIndianNumber(m.outdoorExerciseMinutes), time: m.outdoorExerciseTime }))}` : ""}`,
  );
  return `
    <div class="review stack">
      ${reviewGroup("location", "setup.stepLocation", [e(t("setup.review.place", { place: placeLabel(draft.selectedLocation.name) }))])}
      ${reviewGroup("people", "setup.stepHousehold", people)}
      ${reviewGroup("travel", "setup.stepTravel", [
        e(
          t("setup.review.travel", {
            mode: t(`setup.reviewMode.${draft.commuteMode}`),
            km: formatIndianNumber(draft.commuteDistanceKm, 1),
            days: draft.workingDaysPerWeek,
            people: draft.peopleSharing,
          }),
        ),
        ...(draft.destination
          ? [e(t("setup.review.destination", { place: draft.destination.name }))]
          : []),
      ])}
      ${reviewGroup("home", "setup.stepHome", [
        e(
          t("setup.review.room", {
            area: formatIndianNumber(draft.bedroomSqFt),
            height: formatIndianNumber(draft.ceilingHeightFt, 1),
          }),
        ),
        e(t("setup.review.windows", { habit: t(`setup.reviewWindows.${draft.windowHabit}`) })),
        e(t("setup.review.purifier", { answer: yes(draft.hasPurifier) })),
        e(
          t("setup.review.sources", {
            incense: yes(draft.usesIncense),
            coils: yes(draft.usesMosquitoCoils),
          }),
        ),
      ])}
    </div>`;
}

export function stepContent(step: StepId): string {
  switch (step) {
    case "location":
      return locationHtml();
    case "people":
      return peopleHtml();
    case "travel":
      return travelHtml();
    case "home":
      return homeHtml();
    default:
      return reviewHtml();
  }
}
