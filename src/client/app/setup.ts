// setup.ts: Numbered stepper (1 Location, 2 Household)
// Presets so most people tap, not type.
// Validates with shared Zod schemas, saves to localStorage.
// Nicknames stay in localStorage and are mapped to m1, m2... before sending.

import { escapeHtml } from "../../shared/escape.js";
import type {
  AgeBand,
  CookingMethod,
  HealthSensitivity,
  HouseholdProfile,
  MemberProfile,
  RoutinePreset,
  TravelMode,
  WindowHabit,
} from "../../shared/schemas.js";
import { t } from "../home/i18n.js";
import { type PlaceSuggestion, fetchPlaceDetails, fetchPlaceSuggestions } from "./api.js";
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

let currentStep = 1;
let selectedLocation: StoredLocation = loadLocation() || {
  name: "Kukatpally, Hyderabad",
  lat: 17.48,
  lng: 78.41,
};

let householdMembers: Array<{
  ref: string;
  nickname: string;
  ageBand: string;
  sensitivity: string;
  routinePreset: string;
  outdoorExerciseMinutes: number;
  outdoorExerciseTime: string;
}> = [];

let commuteMode = "petrol_car";
let commuteDistanceKm = 12;
let bedroomSqFt = 144;
let ceilingHeightFt = 10;
let windowHabit = "mostly_shut";
let hasPurifier = false;
let purifierCadrCfm = 120;
let cookingMethod = "gas";
let usesIncense = false;
let usesMosquitoCoils = false;

function initFromStored(): void {
  const storedProfile = loadHouseholdProfile();
  const storedNicknames = loadNicknames();

  if (storedProfile && storedProfile.members.length > 0) {
    householdMembers = storedProfile.members.map((m, idx) => {
      const ref = `m${idx + 1}`;
      return {
        ref,
        nickname: storedNicknames[ref] || storedNicknames[m.id] || `Member ${idx + 1}`,
        ageBand: m.ageBand,
        sensitivity: m.sensitivity || "none",
        routinePreset: m.routinePreset,
        outdoorExerciseMinutes: m.outdoorExerciseMinutes || 0,
        outdoorExerciseTime: m.outdoorExerciseTime || "06:00",
      };
    });
    commuteMode = storedProfile.commute.mode;
    commuteDistanceKm = storedProfile.commute.distanceKm;
    bedroomSqFt = storedProfile.home.bedroomAreaSqFt;
    ceilingHeightFt = storedProfile.home.ceilingHeightFt;
    windowHabit = storedProfile.home.windowHabit;
    hasPurifier = storedProfile.home.hasPurifier;
    purifierCadrCfm = storedProfile.home.purifierCadrCfm || 120;
    cookingMethod = storedProfile.home.cookingMethod;
    usesIncense = storedProfile.home.usesIncense;
    usesMosquitoCoils = storedProfile.home.usesMosquitoCoils;
  } else {
    // Default 4-member profile
    householdMembers = [
      {
        ref: "m1",
        nickname: "Father",
        ageBand: "31-40",
        sensitivity: "none",
        routinePreset: "office_worker",
        outdoorExerciseMinutes: 0,
        outdoorExerciseTime: "06:00",
      },
      {
        ref: "m2",
        nickname: "Mother",
        ageBand: "31-40",
        sensitivity: "none",
        routinePreset: "work_from_home",
        outdoorExerciseMinutes: 0,
        outdoorExerciseTime: "06:00",
      },
      {
        ref: "m3",
        nickname: "Son (9)",
        ageBand: "6-10",
        sensitivity: "asthma_copd",
        routinePreset: "school_child",
        outdoorExerciseMinutes: 30,
        outdoorExerciseTime: "17:00",
      },
      {
        ref: "m4",
        nickname: "Grandmother (68)",
        ageBand: "61-70",
        sensitivity: "none",
        routinePreset: "retired",
        outdoorExerciseMinutes: 60,
        outdoorExerciseTime: "06:00",
      },
    ];
  }
}

export function renderSetupView(container: HTMLElement): void {
  initFromStored();
  currentStep = 1;

  function render(): void {
    container.innerHTML = `
      <section class="section">
        <div class="container container-setup">
          <h1 class="setup-page-title">
            Set up your household
          </h1>
          <div class="stepper-header" role="tablist">
            <div class="step-indicator ${currentStep === 1 ? "active" : ""}" role="tab" aria-selected="${currentStep === 1}">
              <span class="step-number">1</span>
              <span>1 Location</span>
            </div>
            <div class="step-indicator ${currentStep === 2 ? "active" : ""}" role="tab" aria-selected="${currentStep === 2}">
              <span class="step-number">2</span>
              <span>2 Household</span>
            </div>
          </div>

          <div id="setup-step-content">
            ${currentStep === 1 ? renderStep1Location() : renderStep2Household()}
          </div>
        </div>
      </section>
    `;

    attachEvents();
  }

  function renderStep1Location(): string {
    return `
      <h2 class="step-title">Where do you live?</h2>
      <p class="step-subtext">
        Forecasts, routes and clean air windows are calculated for this place.
      </p>

      <div class="form-group">
        <label for="place-search-input" class="form-label">Search city area or locality</label>
        <div class="combobox-wrapper">
          <input
            id="place-search-input"
            type="text"
            class="form-input"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded="false"
            aria-controls="place-suggestions-listbox"
            placeholder="e.g. Kukatpally, Kondapur, Dwarka"
            value="${escapeHtml(selectedLocation.name)}"
          />
          <ul id="place-suggestions-listbox" class="combobox-listbox hidden" role="listbox"></ul>
        </div>
        <div class="combobox-meta-row">
          <button id="btn-use-location" class="btn-text" type="button">Use my location</button>
          <span class="combobox-meta-text">Coordinates rounded to 2 decimals (~1 km)</span>
        </div>
      </div>

      <div class="privacy-notice-box">
        Powered by Google Maps Platform
      </div>

      <div class="flex-justify-end">
        <button id="btn-to-step-2" class="btn btn-primary" type="button">Next: Household</button>
      </div>
    `;
  }

  function renderStep2Household(): string {
    return `
      <h2 class="step-title">Who is at home?</h2>
      <p class="step-subtext">
        Add family members, routines, travel mode and bedroom details.
      </p>

      <div id="members-list">
        ${householdMembers
          .map(
            (m, idx) => `
          <div class="member-entry-card" data-index="${idx}">
            <div class="member-card-header">
              <span class="member-header-title">Member ${idx + 1}</span>
              ${
                householdMembers.length > 1
                  ? `<button class="btn-text btn-remove-member" data-index="${idx}" type="button">Remove</button>`
                  : ""
              }
            </div>
            <div class="grid-12 grid-gap-12">
              <div class="col-span-6">
                <label class="form-label">Nickname (stored in browser only)</label>
                <input type="text" class="form-input member-nickname" data-index="${idx}" value="${escapeHtml(m.nickname)}" />
              </div>
              <div class="col-span-6">
                <label class="form-label">Age group</label>
                <select class="form-select member-age" data-index="${idx}">
                  <option value="under-6" ${m.ageBand === "under-6" ? "selected" : ""}>Under 6</option>
                  <option value="6-10" ${m.ageBand === "6-10" ? "selected" : ""}>6 to 10</option>
                  <option value="11-15" ${m.ageBand === "11-15" ? "selected" : ""}>11 to 15</option>
                  <option value="16-30" ${m.ageBand === "16-30" ? "selected" : ""}>16 to 30</option>
                  <option value="31-40" ${m.ageBand === "31-40" ? "selected" : ""}>31 to 40</option>
                  <option value="41-60" ${m.ageBand === "41-60" ? "selected" : ""}>41 to 60</option>
                  <option value="61-70" ${m.ageBand === "61-70" ? "selected" : ""}>61 to 70</option>
                  <option value="71-plus" ${m.ageBand === "71-plus" ? "selected" : ""}>71+</option>
                </select>
              </div>
              <div class="col-span-6">
                <label class="form-label">Sensitivity</label>
                <select class="form-select member-sensitivity" data-index="${idx}">
                  <option value="none" ${m.sensitivity === "none" ? "selected" : ""}>None</option>
                  <option value="asthma_copd" ${m.sensitivity === "asthma_copd" ? "selected" : ""}>Asthma or COPD</option>
                  <option value="heart_condition" ${m.sensitivity === "heart_condition" ? "selected" : ""}>Heart condition</option>
                  <option value="pregnancy" ${m.sensitivity === "pregnancy" ? "selected" : ""}>Pregnancy</option>
                </select>
              </div>
              <div class="col-span-6">
                <label class="form-label">Routine preset</label>
                <select class="form-select member-routine" data-index="${idx}">
                  <option value="school_child" ${m.routinePreset === "school_child" ? "selected" : ""}>School child</option>
                  <option value="office_worker" ${m.routinePreset === "office_worker" ? "selected" : ""}>Office worker</option>
                  <option value="work_from_home" ${m.routinePreset === "work_from_home" ? "selected" : ""}>Works from home</option>
                  <option value="outdoor_worker" ${m.routinePreset === "outdoor_worker" ? "selected" : ""}>Outdoor worker</option>
                  <option value="retired" ${m.routinePreset === "retired" ? "selected" : ""}>Retired</option>
                </select>
              </div>
              <div class="col-span-6">
                <label class="form-label">Outdoor exercise (min)</label>
                <input type="number" min="0" max="240" class="form-input member-exercise-min" data-index="${idx}" value="${m.outdoorExerciseMinutes}" />
              </div>
              <div class="col-span-6">
                <label class="form-label">Exercise time</label>
                <input type="text" placeholder="HH:mm (e.g. 06:00)" class="form-input member-exercise-time" data-index="${idx}" value="${escapeHtml(m.outdoorExerciseTime)}" />
              </div>
            </div>
          </div>
        `,
          )
          .join("")}
      </div>

      <div class="section-spacer-24">
        <button id="btn-add-member" class="btn btn-secondary" type="button">+ Add family member</button>
      </div>

      <h3 class="section-heading-spaced">Travel & Commute</h3>
      <div class="grid-12 grid-gap-12 section-spacer-24">
        <div class="col-span-6">
          <label class="form-label">Main travel mode</label>
          <select id="commute-mode-select" class="form-select">
            <option value="petrol_car" ${commuteMode === "petrol_car" ? "selected" : ""}>Petrol car</option>
            <option value="petrol_car_small" ${commuteMode === "petrol_car_small" ? "selected" : ""}>Small petrol car</option>
            <option value="diesel_car" ${commuteMode === "diesel_car" ? "selected" : ""}>Diesel car</option>
            <option value="scooter" ${commuteMode === "scooter" ? "selected" : ""}>Scooter</option>
            <option value="motorcycle" ${commuteMode === "motorcycle" ? "selected" : ""}>Motorcycle</option>
            <option value="auto" ${commuteMode === "auto" ? "selected" : ""}>Auto-rickshaw</option>
            <option value="bus" ${commuteMode === "bus" ? "selected" : ""}>City bus</option>
            <option value="metro" ${commuteMode === "metro" ? "selected" : ""}>Metro</option>
            <option value="walk_cycle" ${commuteMode === "walk_cycle" ? "selected" : ""}>Walk or cycle</option>
          </select>
        </div>
        <div class="col-span-6">
          <label class="form-label">One-way distance (km)</label>
          <input id="commute-dist-input" type="number" min="0" max="100" class="form-input" value="${commuteDistanceKm}" />
        </div>
      </div>

      <h3 class="section-heading-spaced">Home & Bedroom</h3>
      <div class="grid-12 grid-gap-12 section-spacer-24">
        <div class="col-span-6">
          <label class="form-label">Bedroom area (sq ft)</label>
          <input id="bedroom-sqft-input" type="number" min="50" max="1000" class="form-input" value="${bedroomSqFt}" />
        </div>
        <div class="col-span-6">
          <label class="form-label">Ceiling height (ft)</label>
          <input id="ceiling-height-input" type="number" min="7" max="20" class="form-input" value="${ceilingHeightFt}" />
        </div>
        <div class="col-span-6">
          <label class="form-label">Window habit</label>
          <select id="window-habit-select" class="form-select">
            <option value="mostly_shut" ${windowHabit === "mostly_shut" ? "selected" : ""}>Mostly shut</option>
            <option value="open_day_shut_night" ${windowHabit === "open_day_shut_night" ? "selected" : ""}>Open day, shut night</option>
            <option value="mostly_open" ${windowHabit === "mostly_open" ? "selected" : ""}>Mostly open</option>
          </select>
        </div>
        <div class="col-span-6">
          <label class="form-label">Cooking method</label>
          <select id="cooking-method-select" class="form-select">
            <option value="gas" ${cookingMethod === "gas" ? "selected" : ""}>LPG gas</option>
            <option value="induction" ${cookingMethod === "induction" ? "selected" : ""}>Induction / Electric</option>
            <option value="lots_of_frying" ${cookingMethod === "lots_of_frying" ? "selected" : ""}>Frequent deep frying</option>
          </select>
        </div>
      </div>

      <div class="checkbox-group-vertical">
        <label class="checkbox-label-sm">
          <input type="checkbox" id="check-has-purifier" ${hasPurifier ? "checked" : ""} />
          <span>Already have an air purifier</span>
        </label>
        <label class="checkbox-label-sm">
          <input type="checkbox" id="check-uses-incense" ${usesIncense ? "checked" : ""} />
          <span>Light agarbatti (incense) indoors</span>
        </label>
        <label class="checkbox-label-sm">
          <input type="checkbox" id="check-uses-coils" ${usesMosquitoCoils ? "checked" : ""} />
          <span>Use mosquito coils at night</span>
        </label>
      </div>

      <div class="stepper-nav-footer">
        <button id="btn-back-step-1" class="btn btn-secondary" type="button">Back</button>
        <button id="btn-save-setup" class="btn btn-primary" type="button">Save and see my plan</button>
      </div>
    `;
  }

  function attachEvents(): void {
    if (currentStep === 1) {
      const searchInput = container.querySelector<HTMLInputElement>("#place-search-input");
      const listbox = container.querySelector<HTMLUListElement>("#place-suggestions-listbox");
      const btnUseLoc = container.querySelector<HTMLButtonElement>("#btn-use-location");
      const btnNext = container.querySelector<HTMLButtonElement>("#btn-to-step-2");

      const sessionToken = `sess_${Math.random().toString(36).substring(2, 9)}`;

      if (searchInput && listbox) {
        searchInput.addEventListener("input", async () => {
          const val = searchInput.value.trim();
          if (val.length < 2) {
            listbox.classList.add("hidden");
            searchInput.setAttribute("aria-expanded", "false");
            return;
          }

          try {
            const suggestions = await fetchPlaceSuggestions(val, sessionToken);
            if (suggestions && suggestions.length > 0) {
              listbox.innerHTML = suggestions
                .map(
                  (s: PlaceSuggestion, i: number) => `
                <li id="opt-${i}" class="combobox-option" role="option" data-id="${escapeHtml(s.placeId)}" data-text="${escapeHtml(s.primaryText)}">
                  ${escapeHtml(s.primaryText)}${s.secondaryText ? ` <span class="combobox-meta-text">${escapeHtml(s.secondaryText)}</span>` : ""}
                </li>
              `,
                )
                .join("");
              listbox.classList.remove("hidden");
              searchInput.setAttribute("aria-expanded", "true");
            } else {
              listbox.classList.add("hidden");
              searchInput.setAttribute("aria-expanded", "false");
            }
          } catch {
            listbox.classList.add("hidden");
          }
        });

        listbox.addEventListener("click", async (e) => {
          const target = (e.target as HTMLElement).closest(".combobox-option") as HTMLElement;
          if (target) {
            const placeId = target.getAttribute("data-id") || "";
            const text = target.getAttribute("data-text") || "";
            searchInput.value = text;
            listbox.classList.add("hidden");
            searchInput.setAttribute("aria-expanded", "false");

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
          }
        });
      }

      if (btnUseLoc) {
        btnUseLoc.addEventListener("click", () => {
          if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const lat = Math.round(pos.coords.latitude * 100) / 100;
                const lng = Math.round(pos.coords.longitude * 100) / 100;
                selectedLocation = {
                  name: `Location (${lat}, ${lng})`,
                  lat,
                  lng,
                };
                if (searchInput) searchInput.value = selectedLocation.name;
                saveLocation(selectedLocation);
              },
              (err) => {
                console.error("Geolocation failed", err);
                alert("Could not access location. Please search for your area.");
              },
            );
          }
        });
      }

      if (btnNext) {
        btnNext.addEventListener("click", () => {
          saveLocation(selectedLocation);
          currentStep = 2;
          render();
        });
      }
    } else if (currentStep === 2) {
      const btnBack = container.querySelector<HTMLButtonElement>("#btn-back-step-1");
      const btnAdd = container.querySelector<HTMLButtonElement>("#btn-add-member");
      const btnSave = container.querySelector<HTMLButtonElement>("#btn-save-setup");

      if (btnBack) {
        btnBack.addEventListener("click", () => {
          currentStep = 1;
          render();
        });
      }

      if (btnAdd) {
        btnAdd.addEventListener("click", () => {
          const nextIdx = householdMembers.length + 1;
          householdMembers.push({
            ref: `m${nextIdx}`,
            nickname: `Member ${nextIdx}`,
            ageBand: "31-40",
            sensitivity: "none",
            routinePreset: "office_worker",
            outdoorExerciseMinutes: 0,
            outdoorExerciseTime: "06:00",
          });
          render();
        });
      }

      for (const btnRem of container.querySelectorAll<HTMLButtonElement>(".btn-remove-member")) {
        btnRem.addEventListener("click", () => {
          const idx = Number(btnRem.getAttribute("data-index"));
          if (householdMembers.length > 1) {
            householdMembers.splice(idx, 1);
            householdMembers.forEach((m, i) => {
              m.ref = `m${i + 1}`;
            });
            render();
          }
        });
      }

      if (btnSave) {
        btnSave.addEventListener("click", () => {
          // Collect member inputs
          const nicknamesMap: Record<string, string> = {};

          container.querySelectorAll(".member-entry-card").forEach((card, idx) => {
            const nickInput = card.querySelector<HTMLInputElement>(".member-nickname");
            const ageSelect = card.querySelector<HTMLSelectElement>(".member-age");
            const sensSelect = card.querySelector<HTMLSelectElement>(".member-sensitivity");
            const routSelect = card.querySelector<HTMLSelectElement>(".member-routine");
            const exMinInput = card.querySelector<HTMLInputElement>(".member-exercise-min");
            const exTimeInput = card.querySelector<HTMLInputElement>(".member-exercise-time");

            if (householdMembers[idx]) {
              householdMembers[idx].nickname = nickInput?.value || `Member ${idx + 1}`;
              householdMembers[idx].ageBand = ageSelect?.value || "31-40";
              householdMembers[idx].sensitivity = sensSelect?.value || "none";
              householdMembers[idx].routinePreset = routSelect?.value || "office_worker";
              householdMembers[idx].outdoorExerciseMinutes = Number(exMinInput?.value) || 0;
              householdMembers[idx].outdoorExerciseTime = exTimeInput?.value || "06:00";

              nicknamesMap[householdMembers[idx].ref] = householdMembers[idx].nickname;
            }
          });

          // Commute and home inputs
          const cMode = container.querySelector<HTMLSelectElement>("#commute-mode-select");
          const cDist = container.querySelector<HTMLInputElement>("#commute-dist-input");
          const bSqft = container.querySelector<HTMLInputElement>("#bedroom-sqft-input");
          const cHeight = container.querySelector<HTMLInputElement>("#ceiling-height-input");
          const wHabit = container.querySelector<HTMLSelectElement>("#window-habit-select");
          const cookMethod = container.querySelector<HTMLSelectElement>("#cooking-method-select");
          const hasPur = container.querySelector<HTMLInputElement>("#check-has-purifier");
          const useInc = container.querySelector<HTMLInputElement>("#check-uses-incense");
          const useCoil = container.querySelector<HTMLInputElement>("#check-uses-coils");

          const profileToSend: HouseholdProfile = {
            members: householdMembers.map((m) => ({
              id: m.ref, // sent as m1, m2... without nickname
              ageBand: m.ageBand as AgeBand,
              sensitivity: m.sensitivity as HealthSensitivity,
              routinePreset: m.routinePreset as RoutinePreset,
              outdoorExerciseMinutes: m.outdoorExerciseMinutes,
              outdoorExerciseTime: m.outdoorExerciseTime,
            })),
            commute: {
              mode: (cMode?.value || "petrol_car") as TravelMode,
              distanceKm: Number(cDist?.value) || 12,
              tripsPerDay: 2,
              peopleSharing: 1,
              workingDaysPerWeek: 5,
            },
            home: {
              bedroomAreaSqFt: Number(bSqft?.value) || 144,
              ceilingHeightFt: Number(cHeight?.value) || 10,
              windowHabit: (wHabit?.value || "mostly_shut") as WindowHabit,
              hasPurifier: Boolean(hasPur?.checked),
              purifierCadrCfm: 120,
              cookingMethod: (cookMethod?.value || "gas") as CookingMethod,
              usesIncense: Boolean(useInc?.checked),
              usesMosquitoCoils: Boolean(useCoil?.checked),
              smokerInHouse: false,
            },
          };

          // Save to localStorage
          saveHouseholdProfile(profileToSend);
          saveNicknames(nicknamesMap);
          saveLocation(selectedLocation);

          // Route to today
          router.navigate("/today");
        });
      }
    }
  }

  render();
}
