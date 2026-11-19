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
  function getFlattenedKeys(obj: Record<string, unknown>, prefix = ""): string[] {
    let keys: string[] = [];
    for (const [k, v] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === "object" && !Array.isArray(v)) {
        keys = keys.concat(getFlattenedKeys(v as Record<string, unknown>, fullKey));
      } else {
        keys.push(fullKey);
      }
    }
    return keys;
  }

  it("ensures all i18n keys in en.json exist in hi.json and te.json", () => {
    const enPath = path.resolve(process.cwd(), "src/client/i18n/en.json");
    const hiPath = path.resolve(process.cwd(), "src/client/i18n/hi.json");
    const tePath = path.resolve(process.cwd(), "src/client/i18n/te.json");

    const enObj = JSON.parse(fs.readFileSync(enPath, "utf-8"));
    const hiObj = JSON.parse(fs.readFileSync(hiPath, "utf-8"));
    const teObj = JSON.parse(fs.readFileSync(tePath, "utf-8"));

    const enKeys = getFlattenedKeys(enObj).sort();
    const hiKeys = new Set(getFlattenedKeys(hiObj));
    const teKeys = new Set(getFlattenedKeys(teObj));

    const missingInHi = enKeys.filter((k) => !hiKeys.has(k));
    const missingInTe = enKeys.filter((k) => !teKeys.has(k));

    expect(missingInHi, `Missing keys in hi.json: ${missingInHi.join(", ")}`).toEqual([]);
    expect(missingInTe, `Missing keys in te.json: ${missingInTe.join(", ")}`).toEqual([]);
  });

  it("fails if any i18n string outside facts and sources contains a digit", () => {
    const langs = ["en", "hi", "te"];
    const violations: string[] = [];

    function checkDigits(obj: Record<string, unknown>, lang: string, prefix = "") {
      for (const [k, v] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${k}` : k;
        if (
          fullKey.startsWith("facts.") ||
          fullKey.startsWith("sources.") ||
          fullKey.endsWith(".sourceRef")
        ) {
          continue;
        }
        if (v && typeof v === "object" && !Array.isArray(v)) {
          checkDigits(v as Record<string, unknown>, lang, fullKey);
        } else if (typeof v === "string") {
          if (/\p{Nd}/u.test(v)) {
            violations.push(`${lang}:${fullKey} contains digit -> "${v}"`);
          }
        }
      }
    }

    for (const lang of langs) {
      const filePath = path.resolve(process.cwd(), `src/client/i18n/${lang}.json`);
      const dict = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      checkDigits(dict, lang);
    }

    expect(
      violations,
      `Found digits in i18n strings outside facts and sources:\n${violations.join("\n")}`,
    ).toEqual([]);
  });
});
