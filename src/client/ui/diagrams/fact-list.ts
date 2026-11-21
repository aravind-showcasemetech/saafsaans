// fact-list.ts: One term and value in the list beside a diagram, with an optional legend key.
// The key fact is set larger, so the result reads first.
import { type SafeHtml, html } from "../html.js";

export interface FactOptions {
  /** A legend swatch class (key-before, key-clean, ...) shown before the term. */
  legend?: string;
  /** The headline fact: highlighted and set as a big number. */
  key?: boolean;
}

export function fact(term: string, value: string, opts: FactOptions = {}): SafeHtml {
  const legend = opts.legend
    ? html`<span class="legend-key ${opts.legend}" aria-hidden="true"></span>`
    : "";
  const div = opts.key ? html`<div class="is-key">` : html`<div>`;
  const dd = opts.key ? "big-number tabular-nums" : "tabular-nums";
  return html`${div}<dt>${legend}${term}</dt><dd class="${dd}">${value}</dd></div>`;
}
