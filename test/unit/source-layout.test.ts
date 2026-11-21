// source-layout.test.ts: Keeps the docs and the source tidy: every src/ and test/ path quoted in the
// README, ARCHITECTURE and SECURITY docs exists, and no TypeScript line in src is over 110
// characters (the source tables in src/shared/factors.ts may be).
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const DOCS = ["README.md", "docs/ARCHITECTURE.md", "SECURITY.md"];

/** src/... and test/... paths in a document; a trailing "*" matches the folder before it. */
function quotedPaths(text: string): string[] {
  const found = text.matchAll(/(?<![\w./-])((?:src|test)\/[\w./*-]*[\w*])/g);
  return [...new Set([...found].map((m) => m[1]))];
}

function exists(p: string): boolean {
  const star = p.indexOf("*");
  const target = star >= 0 ? p.slice(0, star).replace(/\/$/, "") : p;
  return fs.existsSync(path.join(root, target));
}

function tsFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return tsFiles(full);
    return e.name.endsWith(".ts") ? [full] : [];
  });
}

describe("docs and source layout", () => {
  for (const doc of DOCS) {
    it(`every src/ and test/ path quoted in ${doc} exists`, () => {
      const paths = quotedPaths(fs.readFileSync(path.join(root, doc), "utf8"));
      expect(paths.length).toBeGreaterThan(0);
      const missing = paths.filter((p) => !exists(p));
      expect(missing, `Paths in ${doc} that do not exist: ${missing.join(", ")}`).toEqual([]);
    });
  }

  it("finds quoted paths, including folders and globs", () => {
    expect(
      quotedPaths("see `src/shared/impact/` and `src/server/routes/*` or test/unit/a.test.ts."),
    ).toEqual(["src/shared/impact", "src/server/routes/*", "test/unit/a.test.ts"]);
    expect(exists("src/server/routes/*")).toBe(true);
    expect(exists("src/no-such-file.ts")).toBe(false);
  });

  it("no TypeScript line in src is over 110 characters (factors.ts tables excepted)", () => {
    const long = tsFiles(path.join(root, "src"))
      .filter((f) => path.basename(f) !== "factors.ts")
      .flatMap((f) =>
        fs
          .readFileSync(f, "utf8")
          .split(/\r?\n/)
          .flatMap((line, i) =>
            line.length > 110 ? [`${path.relative(root, f)}:${i + 1} (${line.length})`] : [],
          ),
      );
    expect(long, `Lines over 110 characters:\n${long.join("\n")}`).toEqual([]);
  });
});
