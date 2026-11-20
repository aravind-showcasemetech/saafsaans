// household.ts: Step 2 events: add and remove people, save the household and open Today.
import type {
  AgeBand,
  CookingMethod,
  HealthSensitivity,
  HouseholdProfile,
  RoutinePreset,
  TravelMode,
  WindowHabit,
} from "../../../shared/schemas.js";
import { router } from "../router.js";
import { saveHouseholdProfile, saveLocation, saveNicknames } from "../storage.js";
import { collectMembers, draft, newMember } from "./state.js";

export function attachStep2(container: HTMLElement, rerender: () => void, back: () => void): void {
  container.querySelector("#btn-back-step-1")?.addEventListener("click", back);

  container.querySelector("#btn-add-member")?.addEventListener("click", () => {
    collectMembers(container);
    draft.householdMembers.push(newMember(draft.householdMembers.length + 1));
    rerender();
  });

  for (const btn of container.querySelectorAll<HTMLButtonElement>(".btn-remove-member")) {
    btn.addEventListener("click", () => {
      collectMembers(container);
      const idx = Number(btn.getAttribute("data-index"));
      if (draft.householdMembers.length > 1) {
        draft.householdMembers.splice(idx, 1);
        draft.householdMembers.forEach((m, i) => {
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
      members: draft.householdMembers.map((m) => ({
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
    saveNicknames(Object.fromEntries(draft.householdMembers.map((m) => [m.ref, m.nickname])));
    saveLocation(draft.selectedLocation);
    router.navigate("/today");
  });
}
