// i18n.ts: Language state and dictionary lookup for SaafSaans.
// Follows AGENTS.md rule 7. English ships with the page; Hindi and Telugu load when chosen.

import enDict from "../i18n/en.json";

export type SupportedLang = "en" | "hi" | "te";

const STORAGE_KEY = "saafsaans_lang";

function isSupported(value: string | null): value is SupportedLang {
  return value === "en" || value === "hi" || value === "te";
}

/** Reads ?lang= from the query string or from the hash route (#/today?lang=te). */
export function langFromUrl(): SupportedLang | null {
  if (typeof window === "undefined") return null;
  const fromSearch = new URLSearchParams(window.location.search).get("lang");
  if (isSupported(fromSearch)) return fromSearch;
  const hash = window.location.hash;
  const hashQuery = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
  const fromHash = new URLSearchParams(hashQuery).get("lang");
  return isSupported(fromHash) ? fromHash : null;
}

function getInitialLanguage(): SupportedLang {
  if (typeof window !== "undefined") {
    const langParam = langFromUrl();
    if (langParam) {
      try {
        localStorage.setItem(STORAGE_KEY, langParam);
      } catch {}
      return langParam;
    }

    // Check localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (isSupported(stored)) {
        return stored;
      }
    } catch {}
  }
  return "en";
}

type Dictionary = Record<string, unknown>;

const dictionaries: Partial<Record<SupportedLang, Dictionary>> = { en: enDict as Dictionary };

const loaders: Record<Exclude<SupportedLang, "en">, () => Promise<{ default: unknown }>> = {
  hi: () => import("../i18n/hi.json"),
  te: () => import("../i18n/te.json"),
};

async function loadDictionary(lang: SupportedLang): Promise<void> {
  if (lang === "en" || dictionaries[lang]) return;
  dictionaries[lang] = (await loaders[lang]()).default as Dictionary;
}

// Starts in English until initLanguage() has loaded the chosen dictionary.
let currentLang: SupportedLang = "en";

/** Loads and applies the language from the URL or the stored choice. Call before the first render. */
export async function initLanguage(): Promise<void> {
  await setLanguage(getInitialLanguage());
}

export async function setLanguage(lang: SupportedLang): Promise<void> {
  await loadDictionary(lang);
  currentLang = lang;
  if (typeof document !== "undefined") {
    document.documentElement.lang = lang;
  }
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {}
    rewriteUrlLang(lang);
  }
}

/** Keeps any ?lang= in the URL in step with the chosen language, without a navigation. */
function rewriteUrlLang(lang: SupportedLang): void {
  const url = new URL(window.location.href);
  let changed = false;
  if (url.searchParams.has("lang")) {
    url.searchParams.set("lang", lang);
    changed = true;
  }
  const hashQueryAt = url.hash.indexOf("?");
  if (hashQueryAt >= 0) {
    const params = new URLSearchParams(url.hash.slice(hashQueryAt + 1));
    if (params.has("lang")) {
      params.set("lang", lang);
      url.hash = `${url.hash.slice(0, hashQueryAt)}?${params.toString()}`;
      changed = true;
    }
  }
  if (changed) window.history.replaceState(null, "", url);
}

/** Applies ?lang= from the URL, if present, as the current language. */
export async function syncLanguageFromUrl(): Promise<void> {
  const lang = langFromUrl();
  if (lang && lang !== currentLang) await setLanguage(lang);
}

export function getLanguage(): SupportedLang {
  return currentLang;
}

/** The value at a dotted key path, or undefined when any part of the path is missing. */
function lookup(dict: unknown, parts: string[]): unknown {
  let cur = dict;
  for (const p of parts) {
    if (!(cur && typeof cur === "object" && p in cur)) return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function fillParams(text: string, params: Record<string, string | number>): string {
  let out = text;
  for (const [paramKey, paramVal] of Object.entries(params)) {
    out = out.replaceAll(`{${paramKey}}`, String(paramVal));
  }
  return out;
}

export function t(keyPath: string, params?: Record<string, string | number>): string {
  const dict = dictionaries[currentLang] ?? enDict;
  if (!dict) return keyPath;

  const parts = keyPath.split(".");
  let found = lookup(dict, parts);
  // A key missing in Hindi or Telugu falls back to English.
  if (found === undefined && currentLang !== "en" && dictionaries.en) {
    found = lookup(dictionaries.en, parts);
  }
  const text = typeof found === "string" ? found : keyPath;
  return params ? fillParams(text, params) : text;
}
