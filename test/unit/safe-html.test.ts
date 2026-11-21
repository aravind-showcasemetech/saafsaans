import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SafeHtml, html, htmlWithSlot, raw, setHtml } from "../../src/client/ui/html.js";

describe("html tagged template", () => {
  it("escapes every interpolated string and number", () => {
    const name = `<img src=x onerror="alert('x')"> & co`;
    expect(html`<p title="${name}">${name}</p>`.value).toBe(
      '<p title="&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt; &amp; co">' +
        "&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt; &amp; co</p>",
    );
    expect(html`<b>${42}</b>`.value).toBe("<b>42</b>");
  });

  it("keeps the literal parts of the template as written", () => {
    expect(html`<a href="#/setup">Set up</a>`.value).toBe('<a href="#/setup">Set up</a>');
  });

  it("inserts nested html as is, without escaping it twice", () => {
    const inner = html`<span class="nickname">${"Amma & Appa"}</span>`;
    expect(html`<p>${inner}</p>`.value).toBe(
      '<p><span class="nickname">Amma &amp; Appa</span></p>',
    );
  });

  it("joins arrays, escaping text items and keeping html items", () => {
    const items = ["<one>", html`<li>two</li>`, 3];
    expect(html`<ul>${items}</ul>`.value).toBe("<ul>&lt;one&gt;<li>two</li>3</ul>");
    expect(html`<ul>${[["a", ["<b>"]]]}</ul>`.value).toBe("<ul>a&lt;b&gt;</ul>");
    expect(html`<ul>${[]}</ul>`.value).toBe("<ul></ul>");
  });

  it("renders null, undefined and false as nothing, but keeps 0 and empty strings", () => {
    expect(html`[${null}][${undefined}][${false}]`.value).toBe("[][][]");
    expect(html`[${0}][${""}]`.value).toBe("[0][]");
    const on = false;
    expect(html`<li>${on && html`<b>on</b>`}</li>`.value).toBe("<li></li>");
  });

  it("returns SafeHtml, so the result can be nested again", () => {
    expect(html`x`).toBeInstanceOf(SafeHtml);
    expect(html`${html`${html`<i>deep</i>`}`}`.value).toBe("<i>deep</i>");
  });
});

describe("raw, htmlWithSlot and setHtml", () => {
  it("raw marks trusted markup as safe without changing it", () => {
    expect(html`<div>${raw("<svg></svg>")}</div>`.value).toBe("<div><svg></svg></div>");
  });

  it("htmlWithSlot escapes the text and puts the markup in the slot", () => {
    const out = htmlWithSlot("\u0000 & <you> breathe less", "\u0000", html`<span>Amma</span>`);
    expect(out.value).toBe("<span>Amma</span> &amp; &lt;you&gt; breathe less");
  });

  it("setHtml assigns the markup to innerHTML", () => {
    const el = { innerHTML: "" } as unknown as Element;
    setHtml(el, html`<p>${"<hi>"}</p>`);
    expect(el.innerHTML).toBe("<p>&lt;hi&gt;</p>");
  });
});

describe("innerHTML only in html.ts", () => {
  function tsFiles(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) return tsFiles(full);
      return e.name.endsWith(".ts") ? [full] : [];
    });
  }

  it("fails if innerHTML or insertAdjacentHTML appears in src/client outside ui/html.ts", () => {
    const clientDir = path.resolve(process.cwd(), "src/client");
    const allowed = path.join(clientDir, "ui", "html.ts");
    const offenders = tsFiles(clientDir)
      .filter((f) => f !== allowed)
      .filter((f) => /innerHTML|insertAdjacentHTML/.test(fs.readFileSync(f, "utf8")))
      .map((f) => path.relative(process.cwd(), f));
    expect(offenders, `Use setHtml from src/client/ui/html.ts in: ${offenders.join(", ")}`).toEqual(
      [],
    );
  });
});
