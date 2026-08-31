const GLYPHS =
  "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ0123456789ABCDEF◂▸/=+*";

const CELL = 14;
const RAIN_MS = 1500;
const FADE_MS = 360;
const DECODE_STAGGER_MS = 160;
const MS_PER_CHAR = 18;

function glyph(): string {
  return GLYPHS[(Math.random() * GLYPHS.length) | 0];
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let drops: number[] = [];
let viewWidth = 0;
let viewHeight = 0;
let frameHandle = 0;
let runUntil = 0;

function measure(): void {
  if (!canvas || !ctx) {
    return;
  }

  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  viewWidth = window.innerWidth;
  viewHeight = window.innerHeight;

  canvas.width = Math.floor(viewWidth * ratio);
  canvas.height = Math.floor(viewHeight * ratio);
  canvas.style.width = `${viewWidth}px`;
  canvas.style.height = `${viewHeight}px`;

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.font = '500 14px "IBM Plex Mono", ui-monospace, monospace';
  ctx.textBaseline = "top";

  const columns = Math.ceil(viewWidth / CELL);
  if (drops.length !== columns) {
    drops = Array.from({ length: columns }, () => -Math.random() * 24);
  }
}

function frame(now: number): void {
  if (!ctx || !canvas) {
    return;
  }

  // Erase rather than paint the void: the canvas sits above the page, so a
  // filled trail would compound into an opaque wash over the content.
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
  ctx.fillRect(0, 0, viewWidth, viewHeight);
  ctx.globalCompositeOperation = "source-over";

  const raining = now < runUntil;

  if (raining) {
    for (let i = 0; i < drops.length; i += 1) {
      const x = i * CELL;
      const y = drops[i] * CELL;

      ctx.fillStyle = "#c9ffe4";
      ctx.fillText(glyph(), x, y);
      ctx.fillStyle = "rgba(63, 224, 140, 0.55)";
      ctx.fillText(glyph(), x, y - CELL);
      ctx.fillStyle = "rgba(79, 216, 255, 0.3)";
      ctx.fillText(glyph(), x, y - CELL * 3);

      drops[i] += 1.4 + Math.random() * 0.9;

      if (drops[i] * CELL > viewHeight + 112) {
        drops[i] = -Math.random() * 20;
      }
    }
  }

  if (raining || now < runUntil + FADE_MS) {
    frameHandle = requestAnimationFrame(frame);
    return;
  }

  ctx.clearRect(0, 0, viewWidth, viewHeight);
  canvas.classList.remove("is-active");
  frameHandle = 0;
}

function startRain(duration: number): void {
  if (!canvas || !ctx || prefersReducedMotion()) {
    return;
  }

  runUntil = Math.max(runUntil, performance.now() + duration);
  canvas.classList.add("is-active");

  // Extend the existing loop instead of restarting it, so the rain reads as one
  // continuous fall across the swap.
  if (!frameHandle) {
    measure();
    frameHandle = requestAnimationFrame(frame);
  }
}

function logRoute(line: string): void {
  const log = document.getElementById("page-route-log");
  if (!log || prefersReducedMotion()) {
    return;
  }

  log.textContent = line;
  log.classList.add("is-active");

  window.setTimeout(() => log.classList.remove("is-active"), RAIN_MS);
}

function decode(element: HTMLElement, delay: number): void {
  const text = element.dataset.decodeText ?? element.textContent ?? "";

  // Cache the real text so a second pass never captures a scrambled frame.
  element.dataset.decodeText = text;

  const characters = [...text];
  const start = performance.now() + delay;
  element.style.color = "var(--color-gate)";

  function step(now: number): void {
    const landed = Math.max(0, Math.floor((now - start) / MS_PER_CHAR));

    if (landed >= characters.length) {
      element.textContent = text;
      element.style.removeProperty("color");
      return;
    }

    // Every unlanded slot still renders a glyph, so the line keeps its length
    // and the block never reflows mid-decode.
    element.textContent = characters
      .map((character, index) =>
        index < landed || character === " " ? character : glyph(),
      )
      .join("");

    requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

function decodeIncoming(): void {
  const targets = document.querySelectorAll<HTMLElement>("[data-decode]");

  if (prefersReducedMotion()) {
    targets.forEach((element) => {
      const text = element.dataset.decodeText;
      if (text) {
        element.textContent = text;
      }
    });
    return;
  }

  targets.forEach((element, index) => decode(element, index * DECODE_STAGGER_MS));
}

export function initPageRain(): void {
  canvas = document.getElementById("page-rain") as HTMLCanvasElement | null;
  ctx = canvas?.getContext("2d") ?? null;

  if (!canvas || !ctx) {
    return;
  }

  measure();
  window.addEventListener("resize", measure);

  document.addEventListener("astro:before-preparation", (event) => {
    const to = (event as Event & { to?: URL }).to;
    startRain(RAIN_MS);
    logRoute(`▸ GET ${to ? to.pathname : location.pathname}`);
  });

  document.addEventListener("astro:after-swap", () => {
    logRoute(`◂ 200 ${location.pathname}`);
    decodeIncoming();
  });
}

// The canvas is persisted across swaps, so bind the listeners exactly once.
declare global {
  interface Window {
    __pageRainReady?: boolean;
  }
}

if (!window.__pageRainReady) {
  window.__pageRainReady = true;
  initPageRain();
}
