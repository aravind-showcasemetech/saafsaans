// motion.ts: The one motion on guided pages (DESIGN.md section 6): each section fades in once as it
// enters the view. With reduced motion, or without JavaScript, everything is simply visible.

export function setupScrollReveal(root: ParentNode = document): void {
  const targets = Array.from(root.querySelectorAll<HTMLElement>(".reveal-on-scroll"));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !("IntersectionObserver" in window)) {
    for (const el of targets) el.classList.add("is-visible");
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.15 },
  );
  for (const el of targets) observer.observe(el);
}
