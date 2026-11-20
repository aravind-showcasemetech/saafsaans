// nav.ts: Where you are on a guided page (DESIGN.md section 7). On desktop a sticky, text-only
// list of the section names, the current one in --accent; on phones a slim "Step 3 of 6: ..." line.
import { escapeHtml } from "../../shared/escape.js";
import { t } from "../home/i18n.js";

export interface NavItem {
  id: string;
  title: string;
  stepLabel: string;
}

/** The two navigation elements; place them before the sections. */
export function guideNavHtml(items: NavItem[]): string {
  const links = items
    .map(
      (it) =>
        `<li><a class="g-nav-link" href="#${it.id}" data-target="${it.id}"><span class="g-nav-step">${escapeHtml(it.stepLabel)}</span><span>${escapeHtml(it.title)}</span></a></li>`,
    )
    .join("");
  const first = items[0];
  return `
    <nav class="g-nav" aria-label="${escapeHtml(t("guide.navLabel"))}"><ol>${links}</ol></nav>
    <p class="g-progress" aria-hidden="true">${first ? escapeHtml(`${first.stepLabel}: ${first.title}`) : ""}</p>`;
}

/**
 * Keeps the current section marked as the reader scrolls, and makes the links scroll within the
 * page without changing the hash route (#/today stays #/today).
 */
export function attachGuideNav(root: HTMLElement): void {
  const links = Array.from(root.querySelectorAll<HTMLAnchorElement>(".g-nav-link"));
  const progress = root.querySelector<HTMLElement>(".g-progress");
  const sections = links
    .map((a) => document.getElementById(a.dataset.target ?? ""))
    .filter((s): s is HTMLElement => s !== null);

  for (const link of links) {
    link.addEventListener("click", (e) => {
      const target = document.getElementById(link.dataset.target ?? "");
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ block: "start" });
      target.querySelector<HTMLElement>(".g-title")?.focus({ preventScroll: true });
    });
  }

  const mark = (id: string) => {
    for (const a of links) {
      if (a.dataset.target === id) a.setAttribute("aria-current", "step");
      else a.removeAttribute("aria-current");
    }
    const section = document.getElementById(id);
    if (progress && section) {
      progress.textContent = `${section.dataset.stepLabel}: ${section.dataset.navTitle}`;
    }
  };

  if (sections[0]) mark(sections[0].id);
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((e) => e.isIntersecting);
      if (visible.length > 0) mark((visible[0].target as HTMLElement).id);
    },
    { rootMargin: "-45% 0px -50% 0px" },
  );
  for (const s of sections) observer.observe(s);
}
