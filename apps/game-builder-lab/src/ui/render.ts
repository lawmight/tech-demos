import { cellRectOf } from "../lib/frame";
import { COLS, HEROES, ROWS, TILE, type Hero, type Rect } from "../lib/level";
import type { GameState } from "../lib/game";
import { platesPressed } from "../lib/game";

export const CANVAS_W = COLS * TILE;
export const CANVAS_H = ROWS * TILE;

export type ArtStyle = "game" | "blueprint";

const PALETTE = {
  sky: ["#1b1f3a", "#0f1226"],
  solid: "#3b4270",
  solidTop: "#6b74b8",
  brine: "#2ec4d6",
  ash: "#ff7a3d",
  plate: "#f2c14e",
  door: "#a06cd5",
  lever: "#7be495",
  cinder: "#ff8a3d",
  drift: "#35c7d9",
  exitGlow: { cinder: "rgba(255,138,61,0.35)", drift: "rgba(53,199,217,0.35)" },
} as const;

const BLUEPRINT = {
  bg: "#e9edf5",
  grid: "#c9d1e3",
  solid: "#9aa6c6",
  hazard: "#c4cad8",
  accent: "#7d88a8",
  line: "#5b6688",
} as const;

function fillRect(ctx: CanvasRenderingContext2D, r: Rect, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(r.x, r.y, r.w, r.h);
}

function drawBackground(ctx: CanvasRenderingContext2D, style: ArtStyle): void {
  if (style === "blueprint") {
    ctx.fillStyle = BLUEPRINT.bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.strokeStyle = BLUEPRINT.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= CANVAS_W; x += TILE * 2) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, CANVAS_H);
    }
    for (let y = 0; y <= CANVAS_H; y += TILE * 2) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(CANVAS_W, y + 0.5);
    }
    ctx.stroke();
    return;
  }
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  grad.addColorStop(0, PALETTE.sky[0]);
  grad.addColorStop(1, PALETTE.sky[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  for (let i = 0; i < 40; i++) {
    const x = (i * 197) % CANVAS_W;
    const y = (i * 89) % (CANVAS_H - 120);
    ctx.fillRect(x, y, 2, 2);
  }
}

function drawSolids(ctx: CanvasRenderingContext2D, state: GameState, style: ArtStyle): void {
  for (const s of state.level.solids) {
    if (style === "blueprint") {
      fillRect(ctx, s, BLUEPRINT.solid);
      continue;
    }
    fillRect(ctx, s, PALETTE.solid);
    fillRect(ctx, { x: s.x, y: s.y, w: s.w, h: 3 }, PALETTE.solidTop);
  }
}

function drawHazards(ctx: CanvasRenderingContext2D, state: GameState, style: ArtStyle, time: number): void {
  for (const h of state.level.hazards) {
    const color = style === "blueprint" ? BLUEPRINT.hazard : h.kills === "cinder" ? PALETTE.brine : PALETTE.ash;
    ctx.fillStyle = color;
    ctx.globalAlpha = style === "blueprint" ? 1 : 0.85;
    const wobble = style === "blueprint" ? 0 : Math.sin(time * 3 + h.rect.x * 0.2) * 2;
    ctx.fillRect(h.rect.x, h.rect.y + 4 + wobble, h.rect.w, h.rect.h - 4 - wobble);
    ctx.globalAlpha = 1;
    if (style === "blueprint") {
      ctx.strokeStyle = h.kills === "cinder" ? "#4aa3b5" : "#d98a5f";
      ctx.strokeRect(h.rect.x + 0.5, h.rect.y + 4.5, h.rect.w - 1, h.rect.h - 5);
    }
  }
}

function drawExits(ctx: CanvasRenderingContext2D, state: GameState, style: ArtStyle): void {
  for (const hero of HEROES) {
    const e = state.level.exits[hero];
    if (style === "blueprint") {
      ctx.strokeStyle = BLUEPRINT.line;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(e.x + 1.5, e.y + 1.5, e.w - 3, e.h - 3);
      ctx.setLineDash([]);
      continue;
    }
    fillRect(ctx, e, PALETTE.exitGlow[hero]);
    ctx.strokeStyle = hero === "cinder" ? PALETTE.cinder : PALETTE.drift;
    ctx.lineWidth = 2;
    ctx.strokeRect(e.x + 1, e.y + 1, e.w - 2, e.h - 2);
  }
}

function drawMechanisms(ctx: CanvasRenderingContext2D, state: GameState, style: ArtStyle): void {
  const pressed = platesPressed(state);
  for (const p of state.level.plates) {
    const color = style === "blueprint" ? BLUEPRINT.accent : PALETTE.plate;
    ctx.fillStyle = color;
    ctx.globalAlpha = pressed ? 1 : 0.7;
    ctx.fillRect(p.x, p.y + (pressed ? 3 : 0), p.w, p.h - (pressed ? 3 : 0));
    ctx.globalAlpha = 1;
  }

  const l = state.level.latch;
  const postX = l.x + l.w / 2 - 2;
  ctx.fillStyle = style === "blueprint" ? BLUEPRINT.accent : "#59608f";
  ctx.fillRect(postX, l.y + l.h - 56, 4, 56);
  ctx.fillStyle = style === "blueprint" ? BLUEPRINT.line : state.latched ? PALETTE.lever : "#c9566b";
  ctx.beginPath();
  ctx.arc(postX + 2, l.y + l.h - 58, 7, 0, Math.PI * 2);
  ctx.fill();

  for (const d of state.level.door) {
    if (state.doorOpen) {
      ctx.strokeStyle = style === "blueprint" ? BLUEPRINT.line : "rgba(160,108,213,0.6)";
      ctx.setLineDash([3, 4]);
      ctx.strokeRect(d.x + 0.5, d.y + 0.5, d.w - 1, d.h - 1);
      ctx.setLineDash([]);
    } else {
      fillRect(ctx, d, style === "blueprint" ? BLUEPRINT.line : PALETTE.door);
      fillRect(ctx, { x: d.x + 4, y: d.y, w: 2, h: d.h }, "rgba(255,255,255,0.25)");
    }
  }
}

function drawHero(ctx: CanvasRenderingContext2D, state: GameState, hero: Hero, style: ArtStyle, active: boolean): void {
  const b = state.heroes[hero];
  const color = hero === "cinder" ? PALETTE.cinder : PALETTE.drift;
  if (style === "blueprint") {
    ctx.fillStyle = BLUEPRINT.accent;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(hero === "cinder" ? "C" : "D", b.x + b.w / 2, b.y + 16);
    return;
  }
  if (active) {
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x - 3, b.y - 3, b.w + 6, b.h + 6);
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(b.x, b.y + 4, b.w, b.h - 4, 5);
  ctx.fill();
  ctx.beginPath();
  if (hero === "cinder") {
    ctx.moveTo(b.x + 1, b.y + 6);
    ctx.lineTo(b.x + b.w / 2, b.y - 5);
    ctx.lineTo(b.x + b.w - 1, b.y + 6);
  } else {
    ctx.moveTo(b.x + 2, b.y + 6);
    ctx.quadraticCurveTo(b.x + b.w / 2, b.y - 8, b.x + b.w - 2, b.y + 6);
  }
  ctx.closePath();
  ctx.fill();
  const look = Math.sign(b.vx) * 1.5;
  ctx.fillStyle = "#fff";
  ctx.fillRect(b.x + 3 + look, b.y + 10, 3, 4);
  ctx.fillRect(b.x + 8 + look, b.y + 10, 3, 4);
  ctx.fillStyle = "#12142a";
  ctx.fillRect(b.x + 4 + look, b.y + 11, 1.5, 2.5);
  ctx.fillRect(b.x + 9 + look, b.y + 11, 1.5, 2.5);
}

export interface DrawOptions {
  style: ArtStyle;
  time?: number;
  activeHero?: Hero | null;
  diffCells?: readonly number[];
}

export function drawGame(ctx: CanvasRenderingContext2D, state: GameState, opts: DrawOptions): void {
  const { style, time = 0, activeHero = null, diffCells = [] } = opts;
  drawBackground(ctx, style);
  drawSolids(ctx, state, style);
  drawHazards(ctx, state, style, time);
  drawExits(ctx, state, style);
  drawMechanisms(ctx, state, style);
  for (const hero of HEROES) drawHero(ctx, state, hero, style, hero === activeHero);
  if (diffCells.length > 0) {
    ctx.fillStyle = "rgba(255,59,92,0.55)";
    for (const cell of diffCells) {
      const r = cellRectOf(cell);
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }
  }
}

export function renderToDataUrl(state: GameState, opts: DrawOptions): string {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d canvas is not available");
  drawGame(ctx, state, opts);
  return canvas.toDataURL("image/png");
}
