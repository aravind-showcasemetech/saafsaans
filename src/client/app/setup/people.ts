// people.ts: The "Who lives here" step: add and remove people, keeping what was typed.
import { collectMembers, draft, newMember } from "./state.js";

export function attachPeople(container: HTMLElement, rerender: () => void): void {
  container.querySelector("#btn-add-member")?.addEventListener("click", () => {
    collectMembers(container);
    draft.householdMembers.push(newMember(draft.householdMembers.length + 1));
    rerender();
  });
  for (const btn of container.querySelectorAll<HTMLButtonElement>(".btn-remove-member")) {
    btn.addEventListener("click", () => {
      collectMembers(container);
      const idx = Number(btn.dataset.index);
      if (draft.householdMembers.length > 1) {
        draft.householdMembers.splice(idx, 1);
        draft.householdMembers.forEach((m, i) => {
          m.ref = `m${i + 1}`;
        });
        rerender();
      }
    });
  }
}
