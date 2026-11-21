// translations.ts: Interface text the server sends (template reasons, summaries, sourced facts), read from
// the same dictionaries as the browser. Imported as JSON so they are part of the build.
import en from "../client/i18n/en.json" with { type: "json" };
import hi from "../client/i18n/hi.json" with { type: "json" };
import te from "../client/i18n/te.json" with { type: "json" };

export type Lang = "en" | "hi" | "te";

const DICTIONARIES: Record<Lang, unknown> = { en, hi, te };

function lookup(dict: unknown, keyPath: string): string | undefined {
  let cur: unknown = dict;
  for (const part of keyPath.split(".")) {
    if (!cur || typeof cur !== "object" || !(part in cur)) return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "string" ? cur : undefined;
}

/** The text in the given language, else English, else an empty string. */
export function serverText(keyPath: string, lang: Lang): string {
  return lookup(DICTIONARIES[lang], keyPath) ?? lookup(en, keyPath) ?? "";
}
