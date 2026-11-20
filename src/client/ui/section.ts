// section.ts: The guided section pattern (DESIGN.md section 7) and its building blocks.
// Every section: step label with icon, a heading that says what you get, "What this shows" and
// "What you can do", the content, then one primary action (plus at most one secondary).
import { escapeHtml } from "../../shared/escape.js";
import { t } from "../home/i18n.js";
import { type IconName, icon } from "./icons.js";

export interface GuideSection {
  id: string;
  /** "Step 2 of 6", or a short label such as "Start here" when there is no number. */
  stepLabel: string;
  icon: IconName;
  title: string;
  shows: string;
  can: string;
  content: string;
  actions: string;
  /** h1 for the first section on a page, h2 otherwise. */
  level?: 1 | 2;
  className?: string;
}

export function guideSection(s: GuideSection): string {
  const h = s.level === 1 ? "h1" : "h2";
  return `
    <section id="${s.id}" class="g-section reveal-on-scroll ${s.className ?? ""}" aria-labelledby="${s.id}-title" data-step-label="${escapeHtml(s.stepLabel)}" data-nav-title="${escapeHtml(s.title)}">
      <div class="g-inner">
        <p class="g-step">${icon(s.icon)}<span>${escapeHtml(s.stepLabel)}</span></p>
        <${h} id="${s.id}-title" class="g-title" tabindex="-1">${escapeHtml(s.title)}</${h}>
        <dl class="g-lines">
          <div><dt>${t("guide.shows")}</dt><dd>${escapeHtml(s.shows)}</dd></div>
          <div><dt>${t("guide.can")}</dt><dd>${escapeHtml(s.can)}</dd></div>
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
  attrs?: string;
  /** A form's submit button, so Enter in its fields works too. */
  submit?: boolean;
}

/** A link or button at least 44 by 44 px, with a text label and at most one icon. */
export function actionButton(b: ButtonOptions): string {
  const cls = `btn ${b.kind === "secondary" ? "btn-secondary" : "btn-primary"}`;
  const inner = `${b.icon ? icon(b.icon) : ""}<span>${escapeHtml(b.label)}</span>`;
  const id = b.id ? ` id="${b.id}"` : "";
  const attrs = b.attrs ? ` ${b.attrs}` : "";
  return b.href
    ? `<a class="${cls}" href="${escapeHtml(b.href)}"${id}${attrs}>${inner}</a>`
    : `<button type="${b.submit ? "submit" : "button"}" class="${cls}"${id}${attrs}>${inner}</button>`;
}

/** A short "What is this?" explanation in a native disclosure. */
export function whatIsThis(
  term: "aqi" | "pm25" | "dose" | "cigarettes" | "cadr" | "estimate",
): string {
  return `
    <details class="explain">
      <summary>${icon("info")}<span>${escapeHtml(t("explain.summary", { term: term === "pm25" ? "PM2.5" : t(`explain.${term}.term`) }))}</span></summary>
      <p>${escapeHtml(t(`explain.${term}.body`, { pm: "PM2.5" }))}</p>
    </details>`;
}

/** The step label for numbered sections, "Step 2 of 6". */
export function stepLabel(n: number, total: number): string {
  return t("guide.stepOf", { n, total });
}
