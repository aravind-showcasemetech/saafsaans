import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function getAllFiles(dir: string, ext = [".ts", ".html", ".json", ".css"]): string[] {
  let files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== "dist" && entry.name !== ".git") {
        files = files.concat(getAllFiles(fullPath, ext));
      }
    } else if (ext.some((e) => entry.name.endsWith(e))) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("Design enforcement: no em or en dashes", () => {
  it("ensures no em dash (—) or en dash (–) appears in index.html, src/client/** or i18n files", () => {
    const filesToCheck: string[] = [];
    const indexHtml = path.resolve(process.cwd(), "index.html");
    if (fs.existsSync(indexHtml)) filesToCheck.push(indexHtml);

    const clientDir = path.resolve(process.cwd(), "src/client");
    if (fs.existsSync(clientDir)) {
      filesToCheck.push(...getAllFiles(clientDir));
    }

    const emDash = "—";
    const enDash = "–";

    const violations: string[] = [];

    for (const file of filesToCheck) {
      const content = fs.readFileSync(file, "utf-8");
      if (content.includes(emDash) || content.includes(enDash)) {
        violations.push(path.relative(process.cwd(), file));
      }
    }

    expect(
      violations,
      `Found em or en dashes in the following files: ${violations.join(", ")}`,
    ).toEqual([]);
  });
});

describe("i18n key consistency", () => {
  type Dict = Record<string, unknown>;

  /** Every leaf of a dictionary as [dotted key, value]. */
  function leaves(obj: Dict, prefix = ""): Array<[string, unknown]> {
    return Object.entries(obj).flatMap(([k, v]): Array<[string, unknown]> => {
      const fullKey = prefix ? `${prefix}.${k}` : k;
      return v && typeof v === "object" && !Array.isArray(v)
        ? leaves(v as Dict, fullKey)
        : [[fullKey, v]];
    });
  }

  /** Every string leaf as [dotted key, text]. */
  const stringLeaves = (obj: Dict) =>
    leaves(obj).filter((e): e is [string, string] => typeof e[1] === "string");

  const readDict = (lang: string): Dict =>
    JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), `src/client/i18n/${lang}.json`), "utf-8"),
    );

  it("ensures all i18n keys in en.json exist in hi.json and te.json", () => {
    const enKeys = leaves(readDict("en"))
      .map(([k]) => k)
      .sort();
    const hiKeys = new Set(leaves(readDict("hi")).map(([k]) => k));
    const teKeys = new Set(leaves(readDict("te")).map(([k]) => k));

    const missingInHi = enKeys.filter((k) => !hiKeys.has(k));
    const missingInTe = enKeys.filter((k) => !teKeys.has(k));

    expect(missingInHi, `Missing keys in hi.json: ${missingInHi.join(", ")}`).toEqual([]);
    expect(missingInTe, `Missing keys in te.json: ${missingInTe.join(", ")}`).toEqual([]);
  });

  it("verifies placeholders match across all three languages", () => {
    const placeholders = (str: string) => (str.match(/\{([a-zA-Z0-9_]+)\}/g) || []).sort();
    const en = stringLeaves(readDict("en"));
    for (const lang of ["hi", "te"]) {
      const target = new Map(stringLeaves(readDict(lang)));
      for (const [key, text] of en) {
        expect(
          placeholders(target.get(key) ?? ""),
          `Placeholders mismatch in ${lang}:${key}`,
        ).toEqual(placeholders(text));
      }
    }
  });

  it("verifies script usage: every hi value contains Devanagari and every te value contains Telugu script", () => {
    const allowedEnglishOnlyKeys = new Set([
      "app.title",
      "app.tagline",
      "facts.mosquitoCoil",
      "facts.incense",
      "facts.frying",
      "insight.sourceRef",
    ]);
    const scripts: Array<[string, RegExp]> = [
      ["hi", /\p{Script=Devanagari}/u],
      ["te", /\p{Script=Telugu}/u],
    ];
    for (const [lang, regex] of scripts) {
      for (const [key, text] of stringLeaves(readDict(lang))) {
        if (allowedEnglishOnlyKeys.has(key)) continue;
        expect(
          regex.test(text),
          `${lang}.json key "${key}" lacks expected script -> "${text}"`,
        ).toBe(true);
      }
    }
  });

  it("fails if any i18n string outside facts and sources contains a digit", () => {
    const exempt = (key: string) =>
      key.startsWith("facts.") || key.startsWith("sources.") || key.endsWith(".sourceRef");
    const violations = ["en", "hi", "te"].flatMap((lang) =>
      stringLeaves(readDict(lang))
        .filter(([key, text]) => !exempt(key) && /\p{Nd}/u.test(text))
        .map(([key, text]) => `${lang}:${key} contains digit -> "${text}"`),
    );

    expect(
      violations,
      `Found digits in i18n strings outside facts and sources:\n${violations.join("\n")}`,
    ).toEqual([]);
  });
});
