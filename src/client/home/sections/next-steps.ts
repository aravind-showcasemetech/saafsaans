// next-steps.ts: The home page's last section: try the demo family or set up your own household.
import { type SafeHtml, html } from "../../ui/html.js";
import { actionButton, guideSection } from "../../ui/section.js";
import { t } from "../i18n.js";

export function nextStepsSection(): SafeHtml {
  return guideSection({
    id: "next",
    stepLabel: t("home.final.label"),
    icon: "arrow-right",
    title: t("finalCta.title"),
    shows: t("home.final.shows"),
    can: t("home.final.can"),
    content: html`<p class="lead">${t("finalCta.desc")}</p>`,
    actions: html`${actionButton({
      label: t("hero.tryHyderabad"),
      href: "#/demo",
      icon: "users",
    })}${actionButton({ label: t("hero.setUpHousehold"), href: "#/setup", kind: "secondary" })}`,
  });
}
