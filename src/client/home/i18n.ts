// i18n.ts: Language state and dictionary lookup for SaafSaans.
// Follows AGENTS.md rule 7.

import enDict from "../i18n/en.json";
import hiDict from "../i18n/hi.json";
import teDict from "../i18n/te.json";

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

let currentLang: SupportedLang = getInitialLanguage();
if (typeof document !== "undefined") {
  document.documentElement.lang = currentLang;
}

const dictionaries: Record<SupportedLang, Record<string, unknown>> = {
  en: enDict as Record<string, unknown>,
  hi: hiDict as Record<string, unknown>,
  te: teDict as Record<string, unknown>,
};

export async function setLanguage(lang: SupportedLang): Promise<void> {
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
export function syncLanguageFromUrl(): void {
  const lang = langFromUrl();
  if (lang && lang !== currentLang) void setLanguage(lang);
}

export function getLanguage(): SupportedLang {
  return currentLang;
}

export function t(keyPath: string, params?: Record<string, string | number>): string {
  const dict = dictionaries[currentLang] ?? dictionaries.en;
  if (!dict) return keyPath;

  const parts = keyPath.split(".");
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in cur) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      // Fallback to English if missing in currentLang
      if (currentLang !== "en" && dictionaries.en) {
        let enCur: unknown = dictionaries.en;
        for (const ep of parts) {
          if (enCur && typeof enCur === "object" && ep in enCur) {
            enCur = (enCur as Record<string, unknown>)[ep];
          } else {
            return keyPath;
          }
        }
        cur = typeof enCur === "string" ? enCur : keyPath;
        break;
      }
      return keyPath;
    }
  }

  let text = typeof cur === "string" ? cur : keyPath;
  if (params) {
    for (const [paramKey, paramVal] of Object.entries(params)) {
      text = text.replaceAll(`{${paramKey}}`, String(paramVal));
    }
  }
  return text;
}
