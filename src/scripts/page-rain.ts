const GLYPHS =
  "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホミムメモヤユヨラリルレロワヲﾝ0123456789ABCDEF◂▸/=+*";

const CELL = 14;
const RAIN_MS = 1500;

// Beat 1 holds the veil and rain at full while the swap happens underneath.
// Beat 2 drops both back and lets the page decode through. Beat 3 clears.
const DECODE_AT_MS = 520;
const CLEAR_AT_MS = 1300;
const DECODE_STAGGER_MS = 160;

function glyph(): string {
  return GLYPHS[(Math.random() * GLYPHS.length) | 0];
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

let canvas: HTMLCanvasElement | null = null;
let veil: HTMLElement | null = null;
let route: HTMLElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

let drops: number[] = [];
let viewWidth = 0;
let viewHeight = 0;
let frameHandle = 0;
let runUntil = 0;
let rainStart = 0;
let beatTimers: number[] = [];

function measure(): void {
  if (!canvas || !ctx) {
    return;
  }

  const ratio = Math.min(2, window.devicePixelRatio || 1);
  viewWidth = window.innerWidth;
  viewHeight = window.innerHeight;

  canvas.width = viewWidth * ratio;
  canvas.height = viewHeight * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.font = `500 ${CELL}px "IBM Plex Mono", monospace`;
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

  // The veil supplies the dark ground, so the trail paints the void colour
  // rather than erasing — that is what gives the columns their density.
  ctx.fillStyle = "rgba(10, 12, 18, 0.28)";
  ctx.fillRect(0, 0, viewWidth, viewHeight);

  for (let i = 0; i < drops.length; i += 1) {
    const y = drops[i] * CELL;

    if (y > -CELL && y < viewHeight) {
      ctx.fillStyle = "#c9ffe4";
      ctx.fillText(glyph(), i * CELL, y);
      ctx.fillStyle = "rgba(63, 224, 140, 0.55)";
      ctx.fillText(glyph(), i * CELL, y - CELL);
      ctx.fillStyle = "rgba(79, 216, 255, 0.30)";
      ctx.fillText(glyph(), i * CELL, y - CELL * 3);
    }

    drops[i] += 1.4 + Math.random() * 0.9;

    if (drops[i] * CELL > viewHeight + CELL * 8) {
      drops[i] = -Math.random() * 20;
    }
  }

  if (now < runUntil) {
    frameHandle = requestAnimationFrame(frame);
    return;
  }

  ctx.clearRect(0, 0, viewWidth, viewHeight);
  frameHandle = 0;
}

function decode(element: HTMLElement, delay: number): void {
  const text = element.dataset.decodeText ?? element.textContent ?? "";

  // Cache the real text so a second pass never captures a scrambled frame.
  element.dataset.decodeText = text;

  const characters = text.split("");
  let revealed = -delay / 26;

  // The scramble tail is shorter than the final string, so hold the box open
  // to keep the rest of the page from jumping while the line resolves.
  element.style.minHeight = `${element.getBoundingClientRect().height}px`;

  function step(): void {
    revealed += 0.9;
    const landed = Math.floor(revealed);

    if (landed < 0) {
      element.textContent = "";
      requestAnimationFrame(step);
      return;
    }

    if (landed >= characters.length) {
      element.textContent = text;
      element.style.removeProperty("color");
      element.style.removeProperty("min-height");
      return;
    }

    element.textContent = characters
      .map((character, index) => {
        if (index < landed) return character;
        if (index < landed + 6) return character === " " ? " " : glyph();
        return "";
      })
      .join("");

    element.style.color = "var(--color-gate)";
    requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

function clearBeats(): void {
  beatTimers.forEach((id) => window.clearTimeout(id));
  beatTimers = [];
}

function startRain(path: string): void {
  if (!canvas || !ctx || !veil || prefersReducedMotion()) {
    return;
  }

  clearBeats();
  rainStart = performance.now();
  runUntil = rainStart + RAIN_MS;

  canvas.style.opacity = "1";
  veil.style.opacity = "1";

  if (route) {
    route.textContent = `◂ decoding ${path}`;
    route.style.opacity = "1";
  }

  // Extend the running loop rather than restarting it, so the fall stays
  // continuous across the swap and across rapid navigations.
  if (!frameHandle) {
    measure();
    frameHandle = requestAnimationFrame(frame);
  }
}

function resolveIncoming(): void {
  if (!canvas || !veil || prefersReducedMotion()) {
    return;
  }

  const elapsed = performance.now() - rainStart;

  beatTimers.push(
    window.setTimeout(
      () => {
        document
          .querySelectorAll<HTMLElement>("[data-decode]")
          .forEach((element, index) => decode(element, index * DECODE_STAGGER_MS));

        if (canvas) canvas.style.opacity = "0.45";
        if (veil) veil.style.opacity = "0.35";
      },
      Math.max(0, DECODE_AT_MS - elapsed),
    ),
  );

  beatTimers.push(
    window.setTimeout(
      () => {
        if (canvas) canvas.style.opacity = "0";
        if (veil) veil.style.opacity = "0";
        if (route) route.style.opacity = "0";
      },
      Math.max(0, CLEAR_AT_MS - elapsed),
    ),
  );
}

export function initPageRain(): void {
  canvas = document.getElementById("page-rain") as HTMLCanvasElement | null;
  veil = document.getElementById("page-veil");
  route = document.getElementById("page-route-log");
  ctx = canvas?.getContext("2d") ?? null;

  if (!canvas || !ctx || !veil) {
    return;
  }

  measure();
  window.addEventListener("resize", measure);

  document.addEventListener("astro:before-preparation", (event) => {
    const to = (event as Event & { to?: URL }).to;
    startRain(to ? to.pathname : location.pathname);
  });

  document.addEventListener("astro:after-swap", resolveIncoming);
}

// The overlay elements are persisted across swaps, so bind listeners once.
declare global {
  interface Window {
    __pageRainReady?: boolean;
  }
}

if (!window.__pageRainReady) {
  window.__pageRainReady = true;
  initPageRain();
}
