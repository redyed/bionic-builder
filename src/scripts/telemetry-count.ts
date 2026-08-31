function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function formatCount(value: number, decimals: number): string {
  if (decimals > 0) {
    return value.toFixed(decimals);
  }

  return Math.round(value).toString();
}

export function animateCount(element: HTMLElement, duration = 920): void {
  const end = Number.parseFloat(element.dataset.count ?? "");
  const decimals = Number.parseInt(element.dataset.countDecimals ?? "0", 10);
  const prefix = element.dataset.countPrefix ?? "";
  const suffix = element.dataset.countSuffix ?? "";

  if (!Number.isFinite(end)) {
    return;
  }

  const start = performance.now();

  function frame(now: number): void {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - (1 - progress) ** 3;
    const current = end * eased;

    element.textContent = `${prefix}${formatCount(current, decimals)}${suffix}`;

    if (progress < 1) {
      requestAnimationFrame(frame);
    }
  }

  requestAnimationFrame(frame);
}

export function startCountUp(element: HTMLElement, delay = 0): void {
  const prefix = element.dataset.countPrefix ?? "";
  const suffix = element.dataset.countSuffix ?? "";
  const decimals = Number.parseInt(element.dataset.countDecimals ?? "0", 10);

  const start = () => {
    element.textContent = `${prefix}${formatCount(0, decimals)}${suffix}`;
    animateCount(element);
  };

  if (delay > 0) {
    window.setTimeout(start, delay);
  } else {
    start();
  }
}

export function initTelemetryCount(): void {
  if (prefersReducedMotion()) {
    return;
  }

  const elements = document.querySelectorAll<HTMLElement>("[data-count]");
  if (!elements.length) {
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

        const delay = Number.parseInt(element.dataset.countDelay ?? "0", 10);
        startCountUp(element, delay);
        observer.unobserve(element);
      });
    },
    { threshold: 0.55, rootMargin: "0px 0px -8% 0px" },
  );

  elements.forEach((element) => {
    if (!element.closest(".ledger-row")) {
      observer.observe(element);
    }
  });
}

export function initLedgerPrint(): void {
  const rows = document.querySelectorAll<HTMLElement>(".ledger-row");
  if (!rows.length) {
    return;
  }

  if (prefersReducedMotion()) {
    rows.forEach((row) => row.classList.add("is-in"));
    return;
  }

  const seen = new WeakSet<HTMLElement>();

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        const row = entry.target as HTMLElement;
        if (seen.has(row)) {
          return;
        }

        seen.add(row);
        row.classList.add("is-in");

        const counter = row.querySelector<HTMLElement>("[data-count]");
        if (counter) {
          startCountUp(counter);
        }

        observer.unobserve(row);
      });
    },
    { threshold: 0.4 },
  );

  rows.forEach((row) => observer.observe(row));
}

initTelemetryCount();
initLedgerPrint();
