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

export function initShopfloorScroll(): void {
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
}

initShopfloorScroll();
