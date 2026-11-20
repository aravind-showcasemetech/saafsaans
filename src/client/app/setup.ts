// setup.ts: Numbered stepper (1 Location, 2 Household)
// Presets so most people tap, not type.
// Saves to localStorage. Nicknames stay in localStorage and are mapped to m1, m2... before sending.

import { escapeHtml } from "../../shared/escape.js";
import type {
  AgeBand,
  CookingMethod,
  HealthSensitivity,
  HouseholdProfile,
  RoutinePreset,
  TravelMode,
  WindowHabit,
} from "../../shared/schemas.js";
import { t } from "../home/i18n.js";
import { type PlaceSuggestion, fetchPlaceDetails, fetchPlaceSuggestions } from "./api.js";
import { placeLabel } from "./format.js";
import { router } from "./router.js";
import {
  type StoredLocation,
  loadHouseholdProfile,
  loadLocation,
  loadNicknames,
  saveHouseholdProfile,
  saveLocation,
  saveNicknames,
} from "./storage.js";

interface MemberDraft {
  ref: string;
  nickname: string;
  ageBand: string;
  sensitivity: string;
  routinePreset: string;
  outdoorExerciseMinutes: number;
  outdoorExerciseTime: string;
}

const DEFAULT_LOCATION: StoredLocation = { name: "Kukatpally, Hyderabad", lat: 17.48, lng: 78.41 };

let currentStep = 1;
let selectedLocation: StoredLocation = DEFAULT_LOCATION;
let householdMembers: MemberDraft[] = [];
let commuteMode = "petrol_car";
let commuteDistanceKm = 12;
let bedroomSqFt = 144;
let ceilingHeightFt = 10;
let windowHabit = "mostly_shut";
let hasPurifier = false;
let cookingMethod = "gas";
let usesIncense = false;
let usesMosquitoCoils = false;

function newMember(n: number, preset: Partial<MemberDraft> = {}): MemberDraft {
  return {
    ref: `m${n}`,
    nickname: t("setup.member", { n }),
    ageBand: "31-40",
    sensitivity: "none",
    routinePreset: "office_worker",
    outdoorExerciseMinutes: 0,
    outdoorExerciseTime: "06:00",
    ...preset,
  };
}

function initFromStored(): void {
  selectedLocation = loadLocation() || DEFAULT_LOCATION;
  const storedProfile = loadHouseholdProfile();
  const storedNicknames = loadNicknames();

  if (!storedProfile || storedProfile.members.length === 0) {
    householdMembers = [
      newMember(1),
      newMember(2, { routinePreset: "work_from_home" }),
      newMember(3, {
        ageBand: "6-10",
        sensitivity: "asthma_copd",
        routinePreset: "school_child",
        outdoorExerciseMinutes: 30,
        outdoorExerciseTime: "17:00",
      }),
      newMember(4, { ageBand: "61-70", routinePreset: "retired", outdoorExerciseMinutes: 60 }),
    ];
    return;
  }

  householdMembers = storedProfile.members.map((m, idx) => ({
    ref: `m${idx + 1}`,
    nickname:
      storedNicknames[`m${idx + 1}`] || storedNicknames[m.id] || t("setup.member", { n: idx + 1 }),
    ageBand: m.ageBand,
    sensitivity: m.sensitivity || "none",
    routinePreset: m.routinePreset,
    outdoorExerciseMinutes: m.outdoorExerciseMinutes || 0,
    outdoorExerciseTime: m.outdoorExerciseTime || "06:00",
  }));
  commuteMode = storedProfile.commute.mode;
  commuteDistanceKm = storedProfile.commute.distanceKm;
  bedroomSqFt = storedProfile.home.bedroomAreaSqFt;
  ceilingHeightFt = storedProfile.home.ceilingHeightFt;
  windowHabit = storedProfile.home.windowHabit;
  hasPurifier = storedProfile.home.hasPurifier;
  cookingMethod = storedProfile.home.cookingMethod;
  usesIncense = storedProfile.home.usesIncense;
  usesMosquitoCoils = storedProfile.home.usesMosquitoCoils;
}

function options(pairs: Array<[string, string]>, selected: string): string {
  return pairs
    .map(
      ([value, label]) =>
        `<option value="${value}" ${value === selected ? "selected" : ""}>${escapeHtml(label)}</option>`,
    )
    .join("");
}

function ageOptions(selected: string): string {
  return options(
    [
      ["under-6", t("setup.ageUnder", { n: 6 })],
      ["6-10", t("setup.ageRange", { min: 6, max: 10 })],
      ["11-15", t("setup.ageRange", { min: 11, max: 15 })],
      ["16-30", t("setup.ageRange", { min: 16, max: 30 })],
      ["31-40", t("setup.ageRange", { min: 31, max: 40 })],
      ["41-60", t("setup.ageRange", { min: 41, max: 60 })],
      ["61-70", t("setup.ageRange", { min: 61, max: 70 })],
      ["71-plus", t("setup.agePlus", { n: 71 })],
    ],
    selected,
  );
}

function field(id: string, label: string, control: string): string {
  return `<div class="col-span-6"><label class="form-label" for="${id}">${label}</label>${control}</div>`;
}

function memberCardHtml(m: MemberDraft, idx: number, canRemove: boolean): string {
  const p = `member-${idx}`;
  return `
    <div class="member-entry-card" data-index="${idx}">
      <div class="member-card-header">
        <h3 class="member-header-title">${t("setup.member", { n: idx + 1 })}</h3>
        ${canRemove ? `<button class="btn-text btn-remove-member" data-index="${idx}" type="button" aria-label="${escapeHtml(t("setup.removeMember", { n: idx + 1 }))}">${t("setup.remove")}</button>` : ""}
      </div>
      <div class="grid-12 grid-gap-12">
        ${field(`${p}-nickname`, t("setup.nickname"), `<input id="${p}-nickname" type="text" class="form-input member-nickname" value="${escapeHtml(m.nickname)}" />`)}
        ${field(`${p}-age`, t("setup.ageGroup"), `<select id="${p}-age" class="form-select member-age">${ageOptions(m.ageBand)}</select>`)}
        ${field(
          `${p}-sens`,
          t("setup.sensitivity"),
          `<select id="${p}-sens" class="form-select member-sensitivity">${options(
            [
              ["none", t("setup.sensNone")],
              ["asthma_copd", t("setup.sensAsthma")],
              ["heart_condition", t("setup.sensHeart")],
              ["pregnancy", t("setup.sensPregnancy")],
            ],
            m.sensitivity,
          )}</select>`,
        )}
        ${field(
          `${p}-routine`,
          t("setup.routine"),
          `<select id="${p}-routine" class="form-select member-routine">${options(
            [
              ["school_child", t("setup.routineSchool")],
              ["office_worker", t("setup.routineOffice")],
              ["work_from_home", t("setup.routineWfh")],
              ["outdoor_worker", t("setup.routineOutdoor")],
              ["retired", t("setup.routineRetired")],
            ],
            m.routinePreset,
          )}</select>`,
        )}
        ${field(`${p}-exmin`, t("setup.exerciseMinutes"), `<input id="${p}-exmin" type="number" min="0" max="240" class="form-input member-exercise-min" value="${m.outdoorExerciseMinutes}" />`)}
        ${field(`${p}-extime`, t("setup.exerciseTime"), `<input id="${p}-extime" type="time" class="form-input member-exercise-time" value="${escapeHtml(m.outdoorExerciseTime)}" />`)}
      </div>
    </div>`;
}

function step1Html(): string {
  return `
    <h2 class="step-title" tabindex="-1">${t("setup.whereTitle")}</h2>
    <p class="step-subtext">${t("setup.whereHelp")}</p>
    <div class="form-group">
      <label for="place-search-input" class="form-label">${t("setup.searchLabel")}</label>
      <div class="combobox-wrapper">
        <input id="place-search-input" type="text" class="form-input" role="combobox" aria-autocomplete="list"
          aria-expanded="false" aria-controls="place-suggestions-listbox"
          placeholder="${escapeHtml(t("setup.searchPlaceholder"))}" value="${escapeHtml(placeLabel(selectedLocation.name))}" />
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

function step2Html(): string {
  const canRemove = householdMembers.length > 1;
  return `
    <h2 class="step-title" tabindex="-1">${t("setup.whoTitle")}</h2>
    <p class="step-subtext">${t("setup.whoHelp")}</p>
    <div id="members-list">${householdMembers.map((m, i) => memberCardHtml(m, i, canRemove)).join("")}</div>
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
          commuteMode,
        )}</select>`,
      )}
      ${field("commute-dist-input", t("setup.distance"), `<input id="commute-dist-input" type="number" min="0" max="100" class="form-input" value="${commuteDistanceKm}" />`)}
    </div>
    <h3 class="section-heading-spaced">${t("setup.homeTitle")}</h3>
    <div class="grid-12 grid-gap-12 section-spacer-24">
      ${field("bedroom-sqft-input", t("setup.bedroomArea"), `<input id="bedroom-sqft-input" type="number" min="50" max="1000" class="form-input" value="${bedroomSqFt}" />`)}
      ${field("ceiling-height-input", t("setup.ceilingHeight"), `<input id="ceiling-height-input" type="number" min="7" max="20" class="form-input" value="${ceilingHeightFt}" />`)}
      ${field(
        "window-habit-select",
        t("setup.windowHabit"),
        `<select id="window-habit-select" class="form-select">${options(
          [
            ["mostly_shut", t("setup.windowShut")],
            ["open_day_shut_night", t("setup.windowDay")],
            ["mostly_open", t("setup.windowOpen")],
          ],
          windowHabit,
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
          cookingMethod,
        )}</select>`,
      )}
    </div>
    <div class="checkbox-group-vertical">
      <label class="checkbox-label-sm"><input type="checkbox" id="check-has-purifier" ${hasPurifier ? "checked" : ""} /><span>${t("setup.hasPurifier")}</span></label>
      <label class="checkbox-label-sm"><input type="checkbox" id="check-uses-incense" ${usesIncense ? "checked" : ""} /><span>${t("setup.incense")}</span></label>
      <label class="checkbox-label-sm"><input type="checkbox" id="check-uses-coils" ${usesMosquitoCoils ? "checked" : ""} /><span>${t("setup.coils")}</span></label>
    </div>
    <div class="stepper-nav-footer">
      <button id="btn-back-step-1" class="btn btn-secondary" type="button">${t("setup.back")}</button>
      <button id="btn-save-setup" class="btn btn-primary" type="button">${t("setup.save")}</button>
    </div>`;
}

function stepperHtml(): string {
  const step = (n: number, label: string) =>
    `<li class="step-indicator ${currentStep === n ? "active" : ""}" ${currentStep === n ? 'aria-current="step"' : ""}><span class="step-number">${n}</span><span>${label}</span></li>`;
  return `<ol class="stepper-header" aria-label="${escapeHtml(t("setup.stepsLabel"))}">${step(1, t("setup.stepLocation"))}${step(2, t("setup.stepHousehold"))}</ol>`;
}

export function renderSetupView(container: HTMLElement): void {
  initFromStored();
  currentStep = 1;

  function render(): void {
    container.innerHTML = `
      <section class="section">
        <div class="container container-setup">
          <h1 class="setup-page-title">${t("setup.title")}</h1>
          ${stepperHtml()}
          <div id="setup-step-content">${currentStep === 1 ? step1Html() : step2Html()}</div>
        </div>
      </section>`;
    if (currentStep === 1) attachStep1(container, () => goTo(2));
    else attachStep2(container, render, () => goTo(1));
  }

  function goTo(step: number): void {
    currentStep = step;
    render();
    container.querySelector<HTMLElement>(".step-title")?.focus();
  }

  render();
}

function attachStep1(container: HTMLElement, next: () => void): void {
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
          selectedLocation = {
            name: text,
            lat: Math.round(details.location.lat * 100) / 100,
            lng: Math.round(details.location.lng * 100) / 100,
          };
          saveLocation(selectedLocation);
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
        selectedLocation = { name: `${t("setup.myLocation")} (${lat}, ${lng})`, lat, lng };
        if (searchInput) searchInput.value = selectedLocation.name;
        saveLocation(selectedLocation);
      },
      () => {
        if (status) status.textContent = t("setup.locationError");
      },
    );
  });

  container.querySelector("#btn-to-step-2")?.addEventListener("click", () => {
    saveLocation(selectedLocation);
    next();
  });
}

function attachStep2(container: HTMLElement, rerender: () => void, back: () => void): void {
  container.querySelector("#btn-back-step-1")?.addEventListener("click", back);

  container.querySelector("#btn-add-member")?.addEventListener("click", () => {
    collectMembers(container);
    householdMembers.push(newMember(householdMembers.length + 1));
    rerender();
  });

  for (const btn of container.querySelectorAll<HTMLButtonElement>(".btn-remove-member")) {
    btn.addEventListener("click", () => {
      collectMembers(container);
      const idx = Number(btn.getAttribute("data-index"));
      if (householdMembers.length > 1) {
        householdMembers.splice(idx, 1);
        householdMembers.forEach((m, i) => {
          m.ref = `m${i + 1}`;
        });
        rerender();
      }
    });
  }

  container.querySelector("#btn-save-setup")?.addEventListener("click", () => {
    collectMembers(container);
    const value = (id: string) => container.querySelector<HTMLInputElement>(`#${id}`)?.value;
    const checked = (id: string) =>
      Boolean(container.querySelector<HTMLInputElement>(`#${id}`)?.checked);

    const profile: HouseholdProfile = {
      members: householdMembers.map((m) => ({
        id: m.ref, // sent as m1, m2... without nickname
        ageBand: m.ageBand as AgeBand,
        sensitivity: m.sensitivity as HealthSensitivity,
        routinePreset: m.routinePreset as RoutinePreset,
        outdoorExerciseMinutes: m.outdoorExerciseMinutes,
        outdoorExerciseTime: m.outdoorExerciseTime,
      })),
      commute: {
        mode: (value("commute-mode-select") || "petrol_car") as TravelMode,
        distanceKm: Number(value("commute-dist-input")) || 12,
        tripsPerDay: 2,
        peopleSharing: 1,
        workingDaysPerWeek: 5,
      },
      home: {
        bedroomAreaSqFt: Number(value("bedroom-sqft-input")) || 144,
        ceilingHeightFt: Number(value("ceiling-height-input")) || 10,
        windowHabit: (value("window-habit-select") || "mostly_shut") as WindowHabit,
        hasPurifier: checked("check-has-purifier"),
        purifierCadrCfm: 120,
        cookingMethod: (value("cooking-method-select") || "gas") as CookingMethod,
        usesIncense: checked("check-uses-incense"),
        usesMosquitoCoils: checked("check-uses-coils"),
        smokerInHouse: false,
      },
    };

    saveHouseholdProfile(profile);
    saveNicknames(Object.fromEntries(householdMembers.map((m) => [m.ref, m.nickname])));
    saveLocation(selectedLocation);
    router.navigate("/today");
  });
}

/** Copies what the person typed into the member drafts, so add and remove keep their edits. */
function collectMembers(container: HTMLElement): void {
  container.querySelectorAll<HTMLElement>(".member-entry-card").forEach((card, idx) => {
    const m = householdMembers[idx];
    if (!m) return;
    const get = (sel: string) => card.querySelector<HTMLInputElement>(sel)?.value;
    m.nickname = get(".member-nickname") || t("setup.member", { n: idx + 1 });
    m.ageBand = get(".member-age") || "31-40";
    m.sensitivity = get(".member-sensitivity") || "none";
    m.routinePreset = get(".member-routine") || "office_worker";
    m.outdoorExerciseMinutes = Number(get(".member-exercise-min")) || 0;
    m.outdoorExerciseTime = get(".member-exercise-time") || "06:00";
  });
}
