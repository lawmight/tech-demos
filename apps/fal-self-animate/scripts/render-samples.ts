/**
 * Renders the offline sample assets in ../samples:
 *   - bolt.png                 the still character
 *   - bolt-walk.mp4 / bolt-wave.mp4 / bolt-idle.mp4   2s seamless loops
 *
 * These are procedurally drawn pixel-art stand-ins so the UI works without a FAL_KEY.
 * Requires ffmpeg on PATH. Run: bun run render-samples
 */
import { join } from "node:path";

const GRID = 36; // 32x32 sprite area + 2px padding on each side
const PAD = 2;
const SCALE = 16;
const SIZE = GRID * SCALE;
const FPS = 12;
const FRAMES = 24;
const OUT = join(import.meta.dir, "..", "samples");

type RGB = [number, number, number];
const hex = (h: string): RGB => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

const C = {
  bgTop: hex("#141a33"),
  bgBottom: hex("#0d1226"),
  floor: hex("#1f2a4d"),
  shadow: hex("#070a16"),
  star: hex("#2b3562"),
  outline: hex("#0b1020"),
  body: hex("#4fd1c5"),
  bodyDark: hex("#2c9d93"),
  bodyLight: hex("#9ff5ec"),
  visor: hex("#0f172a"),
  eye: hex("#a5f3fc"),
  eyeDim: hex("#38bdf8"),
  bulb: hex("#f472b6"),
  bulbDim: hex("#be185d"),
  metal: hex("#94a3b8"),
  metalDark: hex("#475569"),
  boot: hex("#1e293b"),
  panel: hex("#fde68a"),
};

class Canvas {
  buf = new Uint8Array(SIZE * SIZE * 3);
  /** offset applied to every draw call; the robot is drawn in a padded 32x32 frame */
  ox = 0;
  oy = 0;
  px(gx: number, gy: number, c: RGB) {
    gx += this.ox;
    gy += this.oy;
    if (gx < 0 || gy < 0 || gx >= GRID || gy >= GRID) return;
    for (let y = gy * SCALE; y < (gy + 1) * SCALE; y++) {
      let i = (y * SIZE + gx * SCALE) * 3;
      for (let x = 0; x < SCALE; x++) {
        this.buf[i++] = c[0];
        this.buf[i++] = c[1];
        this.buf[i++] = c[2];
      }
    }
  }
  rect(x: number, y: number, w: number, h: number, c: RGB) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c);
  }
  /** rectangle with a 1px outline, corners knocked out for a rounded read */
  box(x: number, y: number, w: number, h: number, fill: RGB, rounded = true) {
    this.rect(x, y, w, h, C.outline);
    this.rect(x + 1, y + 1, w - 2, h - 2, fill);
    if (rounded) {
      this.px(x, y, C.bgTop);
      this.px(x + w - 1, y, C.bgTop);
      this.px(x, y + h - 1, C.bgTop);
      this.px(x + w - 1, y + h - 1, C.bgTop);
    }
  }
}

type Preset = "walk" | "wave" | "idle";

function drawBackground(cv: Canvas) {
  const floorY = 30 + PAD;
  cv.rect(0, 0, GRID, floorY, C.bgTop);
  cv.rect(0, floorY, GRID, GRID - floorY, C.bgBottom);
  cv.rect(0, floorY, GRID, 1, C.floor);
  for (const [sx, sy] of [
    [3, 5],
    [31, 7],
    [6, 16],
    [33, 20],
    [26, 2],
    [2, 27],
    [18, 1],
  ])
    cv.px(sx, sy, C.star);
}

function drawRobot(cv: Canvas, preset: Preset, t: number) {
  const s = Math.sin(2 * Math.PI * t);
  const s2 = Math.sin(4 * Math.PI * t);

  // whole-body vertical offset (negative = up)
  let bob = 0;
  if (preset === "walk") bob = -Math.round(Math.abs(s) * 1.4);
  if (preset === "idle") bob = -Math.round((s + 1) * 0.75);
  if (preset === "wave") bob = -Math.round((s2 + 1) * 0.5);

  // legs: how far each foot is lifted
  let liftL = 0;
  let liftR = 0;
  if (preset === "walk") {
    liftL = Math.max(0, Math.round(s * 3));
    liftR = Math.max(0, Math.round(-s * 3));
  }

  // arm swing (walk) or wave
  let armL = 0;
  let armR = 0;
  if (preset === "walk") {
    armL = Math.round(-s * 2);
    armR = Math.round(s * 2);
  }
  if (preset === "idle") {
    armL = armR = Math.round((s + 1) * 0.5);
  }

  const blink =
    preset === "idle" ? t > 0.42 && t < 0.5 : preset === "wave" ? t > 0.7 && t < 0.76 : false;

  // ground shadow shrinks when the body is higher
  const shadowW = 10 + bob;
  cv.rect(16 - Math.floor(shadowW / 2), 30, shadowW, 1, C.shadow);

  const y0 = bob; // everything below is offset by bob

  // legs + boots (drawn first so the body overlaps)
  const legTop = 23 + y0;
  cv.box(12, legTop, 3, 6 - liftL, C.metal, false);
  cv.rect(11, legTop + 5 - liftL, 4, 2 - Math.min(liftL, 1), C.boot);
  cv.box(17, legTop, 3, 6 - liftR, C.metal, false);
  cv.rect(17, legTop + 5 - liftR, 4, 2 - Math.min(liftR, 1), C.boot);
  // hip line
  cv.rect(12, legTop, 8, 1, C.outline);

  // body
  cv.box(11, 14 + y0, 10, 10, C.body);
  cv.rect(12, 15 + y0, 1, 8, C.bodyLight);
  cv.rect(19, 15 + y0, 1, 8, C.bodyDark);
  // chest panel with a blinking light
  cv.rect(14, 17 + y0, 4, 3, C.visor);
  cv.px(15, 18 + y0, t < 0.5 ? C.panel : C.bulbDim);
  cv.px(16, 18 + y0, C.eyeDim);

  // left arm (viewer's left)
  cv.box(8, 15 + y0 + armL, 3, 7, C.bodyDark, false);
  cv.rect(8, 21 + y0 + armL, 3, 1, C.metalDark);

  // right arm: waving or hanging
  if (preset === "wave") {
    const handX = 24 + Math.round(s2 * 1.5);
    // upper arm angled out and up
    cv.rect(21, 15 + y0, 4, 3, C.outline);
    cv.rect(22, 16 + y0, 2, 1, C.bodyDark);
    // forearm vertical from shoulder to above the head
    cv.rect(handX, 8 + y0, 3, 8, C.outline);
    cv.rect(handX + 1, 9 + y0, 1, 6, C.bodyDark);
    // hand
    cv.box(handX - 1, 6 + y0, 5, 3, C.metal, false);
    cv.px(handX, 5 + y0, C.metal);
    cv.px(handX + 2, 5 + y0, C.metal);
    cv.px(handX + 1, 5 + y0, C.metal);
  } else {
    cv.box(21, 15 + y0 + armR, 3, 7, C.bodyDark, false);
    cv.rect(21, 21 + y0 + armR, 3, 1, C.metalDark);
  }

  // neck
  cv.rect(14, 13 + y0, 4, 1, C.metalDark);

  // head
  cv.box(10, 4 + y0, 12, 10, C.body);
  cv.rect(11, 5 + y0, 10, 1, C.bodyLight);
  // visor
  cv.rect(11, 6 + y0, 10, 5, C.visor);
  // eyes
  const glow = preset === "idle" && (s + 1) / 2 > 0.6 ? C.eye : C.eyeDim;
  if (blink) {
    cv.rect(13, 8 + y0, 2, 1, glow);
    cv.rect(17, 8 + y0, 2, 1, glow);
  } else {
    cv.rect(13, 7 + y0, 2, 2, glow);
    cv.rect(17, 7 + y0, 2, 2, glow);
    cv.px(13, 7 + y0, C.eye);
    cv.px(17, 7 + y0, C.eye);
  }
  // mouth
  if (preset === "wave") {
    cv.px(14, 10 + y0, C.eyeDim);
    cv.rect(15, 11 + y0, 2, 1, C.eyeDim);
    cv.px(17, 10 + y0, C.eyeDim);
    cv.rect(11, 11 + y0, 10, 1, C.visor); // keep visor bottom clean above mouth row
    cv.rect(15, 11 + y0, 2, 1, C.eyeDim);
  } else {
    cv.rect(14, 10 + y0, 4, 1, C.eyeDim);
  }
  // ear bolts
  cv.rect(9, 7 + y0, 1, 3, C.metalDark);
  cv.rect(22, 7 + y0, 1, 3, C.metalDark);

  // antenna
  cv.rect(15, 2 + y0, 2, 2, C.metalDark);
  const bulbOn = preset === "idle" ? (s2 + 1) / 2 > 0.5 : t % 0.5 < 0.25;
  cv.box(14, 0 + y0, 4, 3, bulbOn ? C.bulb : C.bulbDim, true);
}

function renderFrame(preset: Preset, t: number): Uint8Array {
  const cv = new Canvas();
  drawBackground(cv);
  cv.ox = PAD;
  cv.oy = PAD;
  drawRobot(cv, preset, t);
  return cv.buf;
}

async function ffmpeg(args: string[], frames: Uint8Array[]) {
  const proc = Bun.spawn(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", ...args], {
    stdin: "pipe",
    stdout: "inherit",
    stderr: "inherit",
  });
  for (const f of frames) proc.stdin.write(f);
  await proc.stdin.end();
  const code = await proc.exited;
  if (code !== 0) throw new Error(`ffmpeg exited with ${code}`);
}

const rawIn = ["-f", "rawvideo", "-pix_fmt", "rgb24", "-s", `${SIZE}x${SIZE}`];

// still: idle pose at t = 0
await ffmpeg(
  [...rawIn, "-i", "-", "-frames:v", "1", join(OUT, "bolt.png")],
  [renderFrame("idle", 0)],
);
console.log("wrote samples/bolt.png");

for (const preset of ["walk", "wave", "idle"] as Preset[]) {
  const frames: Uint8Array[] = [];
  for (let i = 0; i < FRAMES; i++) frames.push(renderFrame(preset, i / FRAMES));
  const out = join(OUT, `bolt-${preset}.mp4`);
  await ffmpeg(
    [
      ...rawIn,
      "-r",
      String(FPS),
      "-i",
      "-",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "16",
      "-preset",
      "slow",
      "-movflags",
      "+faststart",
      out,
    ],
    frames,
  );
  console.log(`wrote samples/bolt-${preset}.mp4`);
}
