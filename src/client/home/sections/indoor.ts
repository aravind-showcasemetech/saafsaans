// indoor.ts: Home step 3, indoor air hacks: how outdoor air gets into a room, sourced indoor smoke
// facts, and the purifier size calculator for the Reddys' bedroom.
import { formatIndianNumber } from "../../app/format.js";
import { calculatorHtml } from "../../ui/calculator.js";
import { roomDiagramHtml } from "../../ui/diagrams/room.js";
import { type SafeHtml, html } from "../../ui/html.js";
import { guideSection, stepLabel, whatIsThis } from "../../ui/section.js";
import { t } from "../i18n.js";
import { HOME_STEPS, type HomeModel } from "../model.js";

const n = (v: number, d = 0) => formatIndianNumber(v, d);

export function indoorSection(m: HomeModel): SafeHtml {
  const b = m.bedroom;
  const calcTitle = t("home.indoor.calcTitle", {
    length: n(b.lengthFt),
    width: n(b.widthFt),
    height: n(b.heightFt),
  });
  const content = html`
    <div class="two-col">
      <div class="stack">
        ${roomDiagramHtml(m.room)}
        <p>${t("home.indoor.roomLine")}</p>
      </div>
      <div class="stack">
        <h3 class="list-title">${t("home.indoor.factsTitle")}</h3>
        <ul class="fact-list">
          <li>${t("facts.mosquitoCoil")}</li>
          <li>${t("facts.incense")}</li>
          <li>${t("facts.frying")}</li>
        </ul>
        <h3 class="list-title">${calcTitle}</h3>
        ${whatIsThis("cadr")}
        ${calculatorHtml("home", b)}
      </div>
    </div>`;
  return guideSection({
    id: "indoor",
    stepLabel: stepLabel(3, HOME_STEPS),
    icon: "house",
    title: t("home.indoor.title"),
    shows: t("home.indoor.shows"),
    can: t("home.indoor.can"),
    content,
    actions: html`<p class="muted small">${t("home.indoor.actionHint")}</p>`,
  });
}
