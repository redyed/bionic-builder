const GLYPHS =
  "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホミムメモヤユヨラリルレロワヲﾝ0123456789ABCDEF◂▸/=+*";

const CELL = 14;
const RAIN_MS = 1500;

// Beat 1 holds the veil and rain at full while the swap happens underneath.
// Beat 2 drops both back and lets the page decode through. Beat 3 clears.
const DECODE_AT_MS = 520;
const CLEAR_AT_MS = 1300;
const DECODE_STAGGER_MS = 160;

// A long article has enough blocks that the design's stagger would still be
// unwinding seconds later, so scrolling down would land in scrambled copy.
const MAX_CASCADE_MS = 1800;

function glyph(): string {
  return GLYPHS[(Math.random() * GLYPHS.length) | 0];
}

function normalize(path: string): string {
  return path.replace(/\/$/, "") || "/";
}

// The homepage runs its own boot sequence on arrival, so the rain is scoped to
// departures from it rather than firing on every swap.
function leavingHome(from: URL | undefined, to: URL | undefined): boolean {
  if (!from || !to) {
    return false;
  }

  return normalize(from.pathname) === "/" && normalize(to.pathname) !== "/";
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
let armed = false;

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

// A decode target keeps its element's text nodes, so links, <strong>, and the
// telemetry spans survive: rewriting textContent would flatten them away.
interface Target {
  element: HTMLElement;
  nodes: Text[];
  originals: string[];
  length: number;
}

const SCRAMBLE = 6;

function snapshot(element: HTMLElement): Target {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    nodes.push(node as Text);
  }

  const originals = nodes.map((node) => node.nodeValue ?? "");

  return {
    element,
    nodes,
    originals,
    length: originals.reduce((sum, value) => sum + value.length, 0),
  };
}

// Characters before the cursor are final and those past the scramble window
// are not drawn yet, so only the few in between are rebuilt each frame.
function paint(target: Target, landed: number): void {
  let cursor = 0;

  for (let i = 0; i < target.nodes.length; i += 1) {
    const original = target.originals[i];
    const local = landed - cursor;
    let value: string;

    if (local >= original.length) {
      value = original;
    } else if (local + SCRAMBLE <= 0) {
      value = "";
    } else {
      const kept = Math.max(0, local);
      const end = Math.min(original.length, local + SCRAMBLE);
      let noise = "";

      for (let j = kept; j < end; j += 1) {
        noise += original[j] === " " ? " " : glyph();
      }

      value = original.slice(0, kept) + noise;
    }

    if (target.nodes[i].nodeValue !== value) {
      target.nodes[i].nodeValue = value;
    }

    cursor += original.length;
  }
}

function decode(target: Target, delay: number): void {
  // Drive the reveal from elapsed time, not a per-frame counter: a throttled
  // or slow frame rate would otherwise stretch the decode past the curtain.
  // Hold the design's cadence, but never overrun the clear beat.
  const cadenceMs = (target.length / 0.9) * 16.7;
  const budgetMs = Math.max(240, CLEAR_AT_MS - DECODE_AT_MS - delay);
  const durationMs = Math.min(cadenceMs, budgetMs);
  const startAt = performance.now() + delay;

  function step(now: number): void {
    const landed = Math.floor(((now - startAt) / durationMs) * target.length);

    if (landed >= target.length) {
      paint(target, target.length);
      target.element.style.removeProperty("color");
      target.element.style.removeProperty("min-height");
      return;
    }

    paint(target, landed);
    requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

// Every block of copy in the main column, in document order. Blocks holding
// other blocks are skipped so no text is claimed twice.
function collectTargets(): HTMLElement[] {
  const main = document.getElementById("main");
  if (!main) {
    return [];
  }

  const candidates = main.querySelectorAll<HTMLElement>(
    "[data-decode], p, h1, h2, h3, h4, li, blockquote",
  );

  return [...candidates].filter(
    (element) =>
      !element.querySelector("p, h1, h2, h3, h4, li, blockquote") &&
      (element.textContent ?? "").trim().length > 0,
  );
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
  if (!armed || !canvas || !veil || prefersReducedMotion()) {
    return;
  }

  armed = false;

  const elements = collectTargets();

  // Read every box before writing to any of them, so locking the heights open
  // costs one layout pass instead of one per block.
  const boxes = elements.map((element) => element.getBoundingClientRect());
  const onScreen = boxes.filter((box) => box.top < window.innerHeight).length;

  // The swapped-in DOM carries its real text, so blank the targets the moment
  // the swap lands. Waiting for the beat would show each finished line first
  // and then visibly un-write it.
  const targets = elements.map((element, index) => {
    const target = snapshot(element);
    element.style.minHeight = `${boxes[index].height}px`;
    element.style.color = "var(--color-gate)";
    paint(target, -SCRAMBLE);
    return target;
  });

  // Compress the stagger so everything on screen still starts inside the
  // window; copy below the fold trails on afterwards, unseen.
  const span = CLEAR_AT_MS - DECODE_AT_MS;
  const stagger = Math.min(
    DECODE_STAGGER_MS,
    span / Math.max(1, onScreen),
    MAX_CASCADE_MS / Math.max(1, targets.length),
  );

  const elapsed = performance.now() - rainStart;

  beatTimers.push(
    window.setTimeout(
      () => {
        targets.forEach((target, index) => decode(target, index * stagger));

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
    const { from, to } = event as Event & { from?: URL; to?: URL };

    armed = leavingHome(from, to);
    if (armed && to) {
      startRain(normalize(to.pathname));
    }
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
