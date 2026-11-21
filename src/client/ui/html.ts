// html.ts: Safe HTML by default. Views build markup with the html`...` tag, which escapes every
// interpolated value unless it is already SafeHtml; setHtml is the only place in src/client that
// assigns innerHTML (test/unit/safe-html.test.ts fails on any other use).
import { escapeHtml } from "../../shared/escape.js";

/** Markup that is safe to insert as is: built by html`...` or vouched for with raw(). */
export class SafeHtml {
  constructor(readonly value: string) {}
}

/** What a template may interpolate. null, undefined and false render nothing. */
export type HtmlValue =
  | string
  | number
  | SafeHtml
  | null
  | undefined
  | false
  | readonly HtmlValue[];

function render(value: HtmlValue): string {
  if (value === null || value === undefined || value === false) return "";
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(render).join("");
  return escapeHtml(value);
}

/** Builds SafeHtml: text and numbers are escaped, SafeHtml is kept, arrays are joined. */
export function html(strings: TemplateStringsArray, ...values: HtmlValue[]): SafeHtml {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += render(values[i]) + strings[i + 1];
  return new SafeHtml(out);
}

/** Marks markup our own code built (the SVG diagrams) as safe. Never pass user or model text. */
export function raw(trusted: string): SafeHtml {
  return new SafeHtml(trusted);
}

/**
 * Escaped text with its first `slot` placeholder replaced by markup: for a translated sentence that
 * wraps a marked-up nickname ("{name} breathes 12% less").
 */
export function htmlWithSlot(text: string, slot: string, markup: SafeHtml): SafeHtml {
  return new SafeHtml(escapeHtml(text).replace(escapeHtml(slot), markup.value));
}

/** Replaces an element's content. The only innerHTML assignment in src/client. */
export function setHtml(el: Element, content: SafeHtml): void {
  el.innerHTML = content.value;
}
