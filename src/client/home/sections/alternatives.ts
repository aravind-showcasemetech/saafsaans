// alternatives.ts: Home step 4, sustainable alternatives: the Reddys' commute by car and by metro,
// with the CO2 avoided a day, a week and a winter.
import { placeLabel } from "../../app/format.js";
import { tripDiagramHtml } from "../../ui/diagrams/trip.js";
import { type SafeHtml, html } from "../../ui/html.js";
import { actionButton, guideSection, stepLabel, whatIsThis } from "../../ui/section.js";
import { t } from "../i18n.js";
import { HOME_STEPS, type HomeModel } from "../model.js";

export function alternativesSection(m: HomeModel): SafeHtml {
  const c = m.reddys.profile.commute;
  const trip = tripDiagramHtml({
    ...m.trip,
    from: placeLabel(c.startPlace ?? ""),
    to: placeLabel(c.endPlace ?? ""),
  });
  const content = html`
    ${trip}
    ${whatIsThis("estimate")}`;
  return guideSection({
    id: "alternatives",
    stepLabel: stepLabel(4, HOME_STEPS),
    icon: "train-front",
    title: t("home.alt.title"),
    shows: t("home.alt.shows"),
    can: t("home.alt.can"),
    content,
    actions: actionButton({
      label: t("home.alt.action"),
      href: "#/setup?step=travel",
      icon: "train-front",
    }),
  });
}
