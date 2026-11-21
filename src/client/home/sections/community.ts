// community.ts: Home step 6, sharing with your community: a housing society's weekly CO2 total
// and a ready WhatsApp message.
import { formatIndianNumber } from "../../app/format.js";
import { buildWhatsAppShareText } from "../../app/share-builders.js";
import { type SafeHtml, html } from "../../ui/html.js";
import { actionButton, guideSection, stepLabel } from "../../ui/section.js";
import { t } from "../i18n.js";
import { HOME_STEPS, type HomeModel } from "../model.js";

const n = (v: number, d = 0) => formatIndianNumber(v, d);

export function communitySection(m: HomeModel, origin: string): SafeHtml {
  const cm = m.community;
  const name = t("demoHouseholds.green-meadows.name");
  const waText = cm
    ? buildWhatsAppShareText([
        t("home.community.waTitle", { society: name }),
        t("home.community.waLine", { homes: n(cm.homes), kg: n(cm.weeklyKgTotal) }),
        t("share.waLink", { url: origin }),
      ])
    : "";
  const content = cm
    ? html`
    <div class="panel society">
      <p class="panel-label">${name}</p>
      <p><span class="big-number tabular-nums">${t("common.kgCo2", { value: n(cm.weeklyKgTotal) })}</span></p>
      <p>${t("home.community.line", { homes: n(cm.homes), perHome: n(cm.weeklyKgPerHome, 1) })}</p>
      <p class="muted small">${t("home.community.burning")}</p>
    </div>`
    : html``;
  const share = cm
    ? actionButton({
        label: t("share.waButton"),
        href: `https://wa.me/?text=${encodeURIComponent(waText)}`,
        icon: "share",
        id: "home-wa",
        newTab: true,
      })
    : "";
  return guideSection({
    id: "community",
    stepLabel: stepLabel(6, HOME_STEPS),
    icon: "share",
    title: t("home.community.title"),
    shows: t("home.community.shows"),
    can: t("home.community.can"),
    content,
    actions: html`${share}${actionButton({
      label: t("hero.setUpHousehold"),
      href: "#/setup",
      kind: "secondary",
    })}`,
  });
}
