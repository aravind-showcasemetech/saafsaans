import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// WCAG 2.2 contrast for the theme tokens (docs/DESIGN.md section 5), read from tokens.css so a
// changed token is checked automatically.
const css = fs.readFileSync(path.resolve(process.cwd(), "src/client/styles/tokens.css"), "utf8");
const root = css.slice(css.indexOf(":root {"), css.indexOf("}", css.indexOf(":root {")));

function token(name: string): string {
  const m = root.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`token --${name} not found`);
  return m[1];
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const BACKGROUNDS = ["bg", "surface", "surface-2", "accent-soft"];
const TEXT = ["ink", "ink-2", "accent", "accent-hover"];
const BANDS = [
  "band-good",
  "band-satisfactory",
  "band-moderate",
  "band-poor",
  "band-very-poor",
  "band-severe",
];

describe("WCAG contrast of the theme tokens", () => {
  it("matches hand-checked reference values", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrast("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    expect(contrast("#767676", "#ffffff")).toBeCloseTo(4.54, 2);
  });

  for (const text of TEXT) {
    for (const bg of BACKGROUNDS) {
      it(`--${text} on --${bg} is at least 4.5:1`, () => {
        expect(contrast(token(text), token(bg))).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  it("button text (--on-accent) on --accent and --accent-hover is at least 4.5:1", () => {
    expect(contrast(token("on-accent"), token("accent"))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token("on-accent"), token("accent-hover"))).toBeGreaterThanOrEqual(4.5);
  });

  it("the focus ring (--accent) stands out from every background by at least 3:1", () => {
    for (const bg of BACKGROUNDS)
      expect(contrast(token("accent"), token(bg))).toBeGreaterThanOrEqual(3);
  });

  it("dividers (--rule) are distinguishable from the page but not used for text", () => {
    expect(contrast(token("rule"), token("bg"))).toBeGreaterThan(1.3);
  });

  for (const band of BANDS) {
    it(`--${band} is at least 3:1 against --bg and --surface`, () => {
      expect(contrast(token(band), token("bg"))).toBeGreaterThanOrEqual(3);
      expect(contrast(token(band), token("surface"))).toBeGreaterThanOrEqual(3);
    });
  }

  it("error text (--band-very-poor) is at least 4.5:1 on every background", () => {
    for (const bg of BACKGROUNDS)
      expect(contrast(token("band-very-poor"), token(bg))).toBeGreaterThanOrEqual(4.5);
  });
});
