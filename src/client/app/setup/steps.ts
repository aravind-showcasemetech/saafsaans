// steps.ts: The content of each setup step, and the review in plain sentences.
import { t } from "../../home/i18n.js";
import { placeComboboxHtml } from "../../ui/combobox.js";
import { type SafeHtml, html } from "../../ui/html.js";
import { formatIndianNumber, placeLabel } from "../format.js";
import { field, memberCardHtml, numberInput, options, selectInput, whyNote } from "./fields.js";
import { type MemberDraft, type StepId, draft } from "./state.js";

function locationHtml(): SafeHtml {
  return html`
    ${placeComboboxHtml({
      id: "place-search-input",
      label: t("setup.searchLabel"),
      placeholder: t("setup.searchPlaceholder"),
      whyKey: "setup.why.location",
      value: placeLabel(draft.selectedLocation.name),
    })}
    <p><button id="btn-use-location" class="btn btn-secondary" type="button">${t(
      "setup.useLocation",
    )}</button> <span class="muted small">${t("setup.roundedNote")}</span></p>
    <p id="location-status" class="error-text" role="status"></p>
    <p class="muted small">${t("setup.googleNote")}</p>`;
}

function peopleHtml(): SafeHtml {
  const canRemove = draft.householdMembers.length > 1;
  const cards = draft.householdMembers.map((m, i) => memberCardHtml(m, i, canRemove));
  return html`
    <div id="members-list" class="stack">${cards}</div>
    <p><button id="btn-add-member" class="btn btn-secondary" type="button">${t(
      "setup.addMember",
    )}</button></p>`;
}

const MODES: Array<[string, string]> = [
  ["petrol_car", "setup.modePetrolCar"],
  ["petrol_car_small", "setup.modeSmallCar"],
  ["diesel_car", "setup.modeDieselCar"],
  ["cng_car", "setup.modeCngCar"],
  ["scooter", "setup.modeScooter"],
  ["motorcycle", "setup.modeMotorcycle"],
  ["auto", "setup.modeAuto"],
  ["bus", "setup.modeBus"],
  ["metro", "setup.modeMetro"],
  ["walk_cycle", "setup.modeWalk"],
];

/** A labelled number field on its own step, with the field's id as the input's id. */
function numberField(
  id: string,
  labelKey: string,
  whyKey: string,
  value: number | string,
  min: number,
  max: number,
  step = 1,
): SafeHtml {
  return field(id, t(labelKey), whyKey, numberInput(id, value, min, max, step));
}

function travelHtml(): SafeHtml {
  const modes = options(
    MODES.map(([v, key]) => [v, t(key)]),
    draft.commuteMode,
  );
  const distance = numberField(
    "commute-dist-input",
    "setup.distance",
    "setup.why.distance",
    draft.commuteDistanceKm,
    0,
    200,
    0.1,
  );
  const days = numberField(
    "commute-days-input",
    "setup.days",
    "setup.why.days",
    draft.workingDaysPerWeek,
    1,
    7,
  );
  const sharing = numberField(
    "commute-people-input",
    "setup.sharing",
    "setup.why.sharing",
    draft.peopleSharing,
    1,
    10,
  );
  return html`
    <div class="field-grid">
      ${field(
        "commute-mode-select",
        t("setup.travelMode"),
        "setup.why.mode",
        selectInput("commute-mode-select", "", modes),
      )}
      ${placeComboboxHtml({
        id: "commute-dest-input",
        label: t("setup.destination"),
        placeholder: t("setup.destPlaceholder"),
        whyKey: "setup.why.destination",
        value: draft.destination?.name ?? "",
      })}
      ${distance}
      ${days}
      ${sharing}
    </div>
    <div id="route-status" class="route-status" role="status" aria-live="polite"></div>
    <p class="muted small">${t("setup.routesNote")}</p>`;
}

/** A yes or no question as a checkbox, with its "Why we ask" note. */
function checkField(id: string, on: boolean, labelKey: string, whyKey: string): SafeHtml {
  return html`
    <div class="field">
      <label class="toggle"><input type="checkbox" id="${id}" ${on ? "checked" : ""}
        aria-describedby="${id}-why" /><span>${t(labelKey)}</span></label>
      ${whyNote(id, whyKey)}
    </div>`;
}

function homeHtml(): SafeHtml {
  const windows = options(
    [
      ["mostly_shut", t("setup.windowShut")],
      ["open_day_shut_night", t("setup.windowDay")],
      ["mostly_open", t("setup.windowOpen")],
    ],
    draft.windowHabit,
  );
  const cooking = options(
    [
      ["gas", t("setup.cookGas")],
      ["induction", t("setup.cookInduction")],
      ["lots_of_frying", t("setup.cookFrying")],
    ],
    draft.cookingMethod,
  );
  return html`
    <div class="field-grid">
      ${numberField("bedroom-sqft-input", "setup.bedroomArea", "setup.why.area", draft.bedroomSqFt, 20, 2000)}
      ${numberField(
        "ceiling-height-input",
        "setup.ceilingHeight",
        "setup.why.height",
        draft.ceilingHeightFt,
        6,
        25,
        0.5,
      )}
      ${field(
        "window-habit-select",
        t("setup.windowHabit"),
        "setup.why.windows",
        selectInput("window-habit-select", "", windows),
      )}
      ${field(
        "cooking-method-select",
        t("setup.cooking"),
        "setup.why.cooking",
        selectInput("cooking-method-select", "", cooking),
      )}
    </div>
    ${checkField("check-has-purifier", draft.hasPurifier, "setup.hasPurifier", "setup.why.purifier")}
    ${numberField(
      "purifier-cadr-input",
      "setup.purifierCadr",
      "setup.why.cadr",
      draft.purifierCadrCfm ?? "",
      0,
      2000,
    )}
    ${checkField("check-uses-incense", draft.usesIncense, "setup.incense", "setup.why.incense")}
    ${checkField("check-uses-coils", draft.usesMosquitoCoils, "setup.coils", "setup.why.coils")}`;
}

function reviewGroup(step: StepId, titleKey: string, lines: SafeHtml[]): SafeHtml {
  const editLabel = t("setup.editGroup", { group: t(titleKey) });
  return html`
    <div class="review-group panel">
      <h2 class="list-title">${t(titleKey)}</h2>
      <ul class="review-lines">${lines.map((l) => html`<li>${l}</li>`)}</ul>
      <a class="btn btn-secondary" href="#/setup?step=${step}"
        aria-label="${editLabel}">${t("setup.edit")}</a>
    </div>`;
}

/** One person in plain words: nickname, age, routine, health and outdoor exercise. */
function personLine(m: MemberDraft): SafeHtml {
  const person = t("setup.review.person", {
    age: t(`setup.reviewAge.${m.ageBand}`),
    routine: t(`setup.reviewRoutine.${m.routinePreset}`),
    health: t(`setup.reviewHealth.${m.sensitivity}`),
  });
  const exercise =
    m.outdoorExerciseMinutes > 0
      ? ` ${t("setup.review.exercise", {
          minutes: formatIndianNumber(m.outdoorExerciseMinutes),
          time: m.outdoorExerciseTime,
        })}`
      : "";
  return html`<span class="nickname">${m.nickname}</span>: ${person}${exercise}`;
}

function reviewHtml(): SafeHtml {
  const yes = (v: boolean) => t(v ? "setup.review.yes" : "setup.review.no");
  const line = (text: string) => html`${text}`;
  const travel = [
    line(
      t("setup.review.travel", {
        mode: t(`setup.reviewMode.${draft.commuteMode}`),
        km: formatIndianNumber(draft.commuteDistanceKm, 1),
        days: draft.workingDaysPerWeek,
        people: draft.peopleSharing,
      }),
    ),
    ...(draft.destination
      ? [line(t("setup.review.destination", { place: draft.destination.name }))]
      : []),
  ];
  const home = [
    line(
      t("setup.review.room", {
        area: formatIndianNumber(draft.bedroomSqFt),
        height: formatIndianNumber(draft.ceilingHeightFt, 1),
      }),
    ),
    line(t("setup.review.windows", { habit: t(`setup.reviewWindows.${draft.windowHabit}`) })),
    line(t("setup.review.purifier", { answer: yes(draft.hasPurifier) })),
    line(
      t("setup.review.sources", {
        incense: yes(draft.usesIncense),
        coils: yes(draft.usesMosquitoCoils),
      }),
    ),
  ];
  const place = line(t("setup.review.place", { place: placeLabel(draft.selectedLocation.name) }));
  return html`
    <div class="review stack">
      ${reviewGroup("location", "setup.stepLocation", [place])}
      ${reviewGroup("people", "setup.stepHousehold", draft.householdMembers.map(personLine))}
      ${reviewGroup("travel", "setup.stepTravel", travel)}
      ${reviewGroup("home", "setup.stepHome", home)}
    </div>`;
}

export function stepContent(step: StepId): SafeHtml {
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
