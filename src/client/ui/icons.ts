// icons.ts: The fixed set of Lucide icons (ISC, see THIRD_PARTY_NOTICES.md), inlined so they take
// currentColor. Always decorative: aria-hidden, and always placed beside a visible text label.
import arrowRight from "../assets/icons/arrow-right.svg?raw";
import bookOpen from "../assets/icons/book-open.svg?raw";
import calendar from "../assets/icons/calendar.svg?raw";
import chartColumn from "../assets/icons/chart-column.svg?raw";
import clock from "../assets/icons/clock.svg?raw";
import house from "../assets/icons/house.svg?raw";
import info from "../assets/icons/info.svg?raw";
import mapPin from "../assets/icons/map-pin.svg?raw";
import printer from "../assets/icons/printer.svg?raw";
import share from "../assets/icons/share-2.svg?raw";
import sun from "../assets/icons/sun.svg?raw";
import trainFront from "../assets/icons/train-front.svg?raw";
import users from "../assets/icons/users.svg?raw";
import wind from "../assets/icons/wind.svg?raw";
import x from "../assets/icons/x.svg?raw";
import { type SafeHtml, raw } from "./html.js";

const ICONS = {
  "arrow-right": arrowRight,
  "book-open": bookOpen,
  calendar,
  "chart-column": chartColumn,
  clock,
  house,
  info,
  "map-pin": mapPin,
  printer,
  share,
  sun,
  "train-front": trainFront,
  users,
  wind,
  x,
} as const;

export type IconName = keyof typeof ICONS;

/** The icon's SVG markup, hidden from assistive technology. The files are ours, so raw() is safe. */
export function icon(name: IconName): SafeHtml {
  return raw(
    ICONS[name].trim().replace("<svg ", '<svg class="icon" aria-hidden="true" focusable="false" '),
  );
}
