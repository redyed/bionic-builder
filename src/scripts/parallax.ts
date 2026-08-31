type ParallaxLayer = HTMLElement & { _parallaxSpeed?: number };

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isMobileViewport(): boolean {
  return window.matchMedia("(max-width: 767px)").matches;
}

function updateParallaxRoots(roots: NodeListOf<HTMLElement>, intensity: number): void {
  roots.forEach((root) => {
    const height = root.offsetHeight;
    const rect = root.getBoundingClientRect();

    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      return;
    }

    const viewportRatio =
      (rect.top + height * 0.5 - window.innerHeight * 0.5) / window.innerHeight;
    const scrollProgress = Math.max(0, Math.min(1, (-rect.top) / Math.max(height * 0.75, 1)));
    const blend = scrollProgress * 0.65 + viewportRatio * 0.35;
    const maxPx = Math.min(height * 0.18, 120) * intensity;

    root.querySelectorAll<ParallaxLayer>("[data-parallax-speed]").forEach((layer) => {
      const speed = layer._parallaxSpeed ?? Number.parseFloat(layer.dataset.parallaxSpeed ?? "1");
      layer._parallaxSpeed = speed;
      const y = blend * maxPx * speed;
      layer.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
    });
  });
}

function updateParallaxImages(images: NodeListOf<HTMLImageElement>, intensity: number): void {
  images.forEach((image) => {
    const container = image.closest<HTMLElement>("[data-parallax-image]");
    if (!container) {
      return;
    }

    const rect = container.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      return;
    }

    const speed = Number.parseFloat(image.dataset.parallaxSpeed ?? "1");
    const scrollProgress = Math.max(
      0,
      Math.min(1, (window.innerHeight - rect.top) / (window.innerHeight + rect.height)),
    );
    const viewportRatio =
      (rect.top + rect.height * 0.5 - window.innerHeight * 0.5) / window.innerHeight;
    const blend = scrollProgress * 0.7 + viewportRatio * 0.3;
    const maxPx = 64 * intensity;
    const y = (blend - 0.5) * 2 * maxPx * speed;

    image.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0) scale(1.08)`;
  });
}

export function initParallax(): void {
  if (prefersReducedMotion()) {
    return;
  }

  const roots = document.querySelectorAll<HTMLElement>("[data-parallax-root]");
  const images = document.querySelectorAll<HTMLImageElement>("[data-parallax-image-target]");

  if (!roots.length && !images.length) {
    return;
  }

  let intensity = isMobileViewport() ? 0.65 : 1;
  let ticking = false;

  const update = () => {
    ticking = false;
    updateParallaxRoots(roots, intensity);
    updateParallaxImages(images, intensity);
  };

  const requestUpdate = () => {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  };

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobileQuery = window.matchMedia("(max-width: 767px)");

  const onMotionChange = () => {
    if (prefersReducedMotion()) {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      roots.forEach((root) => {
        root.querySelectorAll<HTMLElement>("[data-parallax-speed]").forEach((layer) => {
          layer.style.transform = "";
        });
      });
      images.forEach((image) => {
        image.style.transform = "";
      });
      return;
    }

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });
    requestUpdate();
  };

  const onViewportChange = () => {
    intensity = isMobileViewport() ? 0.65 : 1;
    requestUpdate();
  };

  motionQuery.addEventListener("change", onMotionChange);
  mobileQuery.addEventListener("change", onViewportChange);

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate, { passive: true });
  update();
}

initParallax();
