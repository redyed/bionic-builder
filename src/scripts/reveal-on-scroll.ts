function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function initRevealOnScroll(): void {
  const elements = document.querySelectorAll<HTMLElement>(".reveal-on-scroll");

  if (!elements.length) {
    return;
  }

  if (prefersReducedMotion()) {
    elements.forEach((element) => element.classList.add("is-revealed"));
    return;
  }

  const seen = new WeakSet<HTMLElement>();

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        const element = entry.target as HTMLElement;
        if (seen.has(element)) {
          return;
        }

        seen.add(element);
        element.classList.add("is-revealed");
        observer.unobserve(element);
      });
    },
    { threshold: 0.18, rootMargin: "0px 0px -6% 0px" },
  );

  elements.forEach((element) => observer.observe(element));
}

// astro:page-load fires on the initial load and after every client-side swap.
document.addEventListener("astro:page-load", initRevealOnScroll);
