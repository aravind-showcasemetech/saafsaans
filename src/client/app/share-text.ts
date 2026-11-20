// share-text.ts: The household's WhatsApp message, in the current language, for Today and Share.
import type { WindowResult } from "../../shared/impact.js";
import { t } from "../home/i18n.js";
import { formatIndianNumber, hourLabel } from "./format.js";
import { buildWhatsAppShareText } from "./share-utils.js";

export function planShareText(params: {
  area: string;
  cleanest: WindowResult | null;
  swapsChosen: number;
  weeklyCo2Kg: number;
  origin: string;
}): string {
  const { area, cleanest, swapsChosen, weeklyCo2Kg, origin } = params;
  return buildWhatsAppShareText([
    t("share.waTitle", { area }),
    cleanest
      ? t("share.waClean", {
          start: hourLabel(cleanest.startHour),
          end: hourLabel(cleanest.endHour),
        })
      : t("share.waNoWindow"),
    t("share.waChoice", { count: swapsChosen, kg: formatIndianNumber(weeklyCo2Kg, 1) }),
    origin ? t("share.waLink", { url: origin }) : t("share.waLinkPlain"),
  ]);
}

export const whatsAppUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
