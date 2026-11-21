// section.ts: The guided section pattern (DESIGN.md section 7) and its building blocks.
// Every section: step label with icon, a heading that says what you get, "What this shows" and
// "What you can do", the content, then one primary action (plus at most one secondary).
import { t } from "../home/i18n.js";
import { type SafeHtml, html, raw } from "./html.js";
import { type IconName, icon } from "./icons.js";

export interface GuideSection {
  id: string;
  /** "Step 2 of 6", or a short label such as "Start here" when there is no number. */
  stepLabel: string;
  icon: IconName;
  title: string;
  shows: string;
  can: string;
  content: SafeHtml;
  actions: SafeHtml;
  /** h1 for the first section on a page, h2 otherwise. */
  level?: 1 | 2;
  className?: string;
}

export function guideSection(s: GuideSection): SafeHtml {
  const h = raw(s.level === 1 ? "h1" : "h2");
  return html`
    <section id="${s.id}" class="g-section reveal-on-scroll ${s.className ?? ""}"
      aria-labelledby="${s.id}-title" data-step-label="${s.stepLabel}" data-nav-title="${s.title}">
      <div class="g-inner">
        <p class="g-step">${icon(s.icon)}<span>${s.stepLabel}</span></p>
        <${h} id="${s.id}-title" class="g-title" tabindex="-1">${s.title}</${h}>
        <dl class="g-lines">
          <div><dt>${t("guide.shows")}</dt><dd>${s.shows}</dd></div>
          <div><dt>${t("guide.can")}</dt><dd>${s.can}</dd></div>
        </dl>
        <div class="g-content">${s.content}</div>
        <div class="g-actions">${s.actions}</div>
      </div>
    </section>`;
}

export interface ButtonOptions {
  label: string;
  href?: string;
  id?: string;
  kind?: "primary" | "secondary";
  icon?: IconName;
  /** Extra classes after the base button classes. */
  extraClass?: string;
  /** Opens the link in a new tab (target="_blank" rel="noopener"). */
  newTab?: boolean;
  /** data-* attributes, as name (without "data-") to value. */
  data?: Record<string, string>;
  /** A form's submit button, so Enter in its fields works too. */
  submit?: boolean;
}

/** A link or button at least 44 by 44 px, with a text label and at most one icon. */
export function actionButton(b: ButtonOptions): SafeHtml {
  const cls = `btn ${b.kind === "secondary" ? "btn-secondary" : "btn-primary"}${
    b.extraClass ? ` ${b.extraClass}` : ""
  }`;
  const inner = html`${b.icon ? icon(b.icon) : ""}<span>${b.label}</span>`;
  const id = b.id ? html` id="${b.id}"` : "";
  const data = [
    ...Object.entries(b.data ?? {}).map(([k, v]) => html` data-${k}="${v}"`),
    b.newTab ? html` target="_blank" rel="noopener"` : "",
  ];
  return b.href
    ? html`<a class="${cls}" href="${b.href}"${id}${data}>${inner}</a>`
    : html`<button type="${b.submit ? "submit" : "button"}" class="${cls}"${id}${data}>${inner}</button>`;
}

/** A short "What is this?" explanation in a native disclosure. */
export function whatIsThis(
  term: "aqi" | "pm25" | "dose" | "cigarettes" | "cadr" | "estimate",
): SafeHtml {
  const name = term === "pm25" ? "PM2.5" : t(`explain.${term}.term`);
  return html`
    <details class="explain">
      <summary>${icon("info")}<span>${t("explain.summary", { term: name })}</span></summary>
      <p>${t(`explain.${term}.body`, { pm: "PM2.5" })}</p>
    </details>`;
}

/** The step label for numbered sections, "Step 2 of 6". */
export function stepLabel(n: number, total: number): string {
  return t("guide.stepOf", { n, total });
}
