// meta.ts: The page title and meta description for each screen, in the current language.
import { t } from "../home/i18n.js";

export type Screen = "home" | "setup" | "today" | "share" | "demo";

export function setPageMeta(screen: Screen): void {
  document.title = t(`meta.${screen}Title`);
  let description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (!description) {
    description = document.createElement("meta");
    description.name = "description";
    document.head.appendChild(description);
  }
  description.content = t(`meta.${screen}Description`);
}
