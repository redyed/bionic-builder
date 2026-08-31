function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function progressForElement(element: HTMLElement): number {
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const range = viewportHeight + rect.height;

  if (range <= 0) {
    return 0;
  }

  return Math.min(1, Math.max(0, (viewportHeight - rect.top) / range));
}

let detach: (() => void) | null = null;

export function initShopfloorScroll(): void {
  // Window listeners outlive a view transition, so drop the previous page's
  // pair before wiring this one up.
  detach?.();
  detach = null;

  const blocks = document.querySelectorAll<HTMLElement>(".shopfloor");
  if (!blocks.length || prefersReducedMotion()) {
    return;
  }

  let ticking = false;

  function update(): void {
    ticking = false;

    blocks.forEach((block) => {
      block.style.setProperty("--p", String(progressForElement(block)));
    });
  }

  function scheduleUpdate(): void {
    if (ticking) {
      return;
    }

    ticking = true;
    requestAnimationFrame(update);
  }

  update();
  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate, { passive: true });

  detach = () => {
    window.removeEventListener("scroll", scheduleUpdate);
    window.removeEventListener("resize", scheduleUpdate);
  };
}

// astro:page-load fires on the initial load and after every client-side swap.
document.addEventListener("astro:page-load", initShopfloorScroll);
