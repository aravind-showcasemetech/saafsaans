// i18n.ts: Language state and dictionary lookup for SaafSaans.
// Follows AGENTS.md rule 7.

import enDict from "../i18n/en.json";
import hiDict from "../i18n/hi.json";
import teDict from "../i18n/te.json";

export type SupportedLang = "en" | "hi" | "te";

const STORAGE_KEY = "saafsaans_lang";

function getInitialLanguage(): SupportedLang {
  if (typeof window !== "undefined") {
    // Check URL search param (?lang=te or ?lang=hi)
    const urlParams = new URLSearchParams(window.location.search);
    const langParam = urlParams.get("lang");
    if (langParam === "hi" || langParam === "te" || langParam === "en") {
      try {
        localStorage.setItem(STORAGE_KEY, langParam);
      } catch {}
      return langParam;
    }

    // Check localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "hi" || stored === "te" || stored === "en") {
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
  }
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
