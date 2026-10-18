import { COLS, HEROES, ROWS, TILE, type Hero, type Rect } from "./level";
import { createGame, type GameState } from "./game";

export const LAYERS = [
  "solid",
  "brine",
  "ash",
  "plate",
  "latch",
  "door",
  "exitCinder",
  "exitDrift",
  "cinder",
  "drift",
] as const;
export type Layer = (typeof LAYERS)[number];

/** A tile-resolution description of a frame: which cells each layer occupies. */
export type Frame = Record<Layer, ReadonlySet<number>>;

const cellIndex = (col: number, row: number): number => row * COLS + col;

function cellsOf(rect: Rect): number[] {
  const c0 = Math.max(0, Math.floor(rect.x / TILE));
  const c1 = Math.min(COLS - 1, Math.ceil((rect.x + rect.w) / TILE) - 1);
  const r0 = Math.max(0, Math.floor(rect.y / TILE));
  const r1 = Math.min(ROWS - 1, Math.ceil((rect.y + rect.h) / TILE) - 1);
  const out: number[] = [];
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) out.push(cellIndex(c, r));
  return out;
}

function centerCell(rect: Rect): number {
  const col = Math.min(COLS - 1, Math.max(0, Math.floor((rect.x + rect.w / 2) / TILE)));
  const row = Math.min(ROWS - 1, Math.max(0, Math.floor((rect.y + rect.h / 2) / TILE)));
  return cellIndex(col, row);
}

function unionCells(rects: readonly Rect[]): Set<number> {
  return new Set(rects.flatMap(cellsOf));
}

export function cellRectOf(index: number): Rect {
  return { x: (index % COLS) * TILE, y: Math.floor(index / COLS) * TILE, w: TILE, h: TILE };
}

export function rasterize(state: GameState): Frame {
  const { level } = state;
  const hazard = (kills: Hero) => level.hazards.filter((h) => h.kills === kills).map((h) => h.rect);
  return {
    solid: unionCells(level.solids),
    brine: unionCells(hazard("cinder")),
    ash: unionCells(hazard("drift")),
    plate: unionCells(level.plates),
    latch: unionCells([level.latch]),
    door: state.doorOpen ? new Set() : unionCells(level.door),
    exitCinder: unionCells([level.exits.cinder]),
    exitDrift: unionCells([level.exits.drift]),
    cinder: new Set([centerCell(state.heroes.cinder)]),
    drift: new Set([centerCell(state.heroes.drift)]),
  };
}

/** The brief's target frame: door open, both heroes standing in their exits. */
export function solvedState(base: GameState): GameState {
  const fresh = createGame(base.level);
  const heroes = { ...fresh.heroes };
  for (const hero of HEROES) {
    const exit = base.level.exits[hero];
    const body = heroes[hero];
    heroes[hero] = {
      ...body,
      x: exit.x + (exit.w - body.w) / 2,
      y: exit.y + exit.h - body.h,
    };
  }
  return { ...fresh, heroes, latched: true, doorOpen: true, status: "won" };
}

export interface Finding {
  label: string;
  score: number;
  pass: boolean;
  note: string;
}

export interface Critique {
  score: number;
  pass: boolean;
  findings: Finding[];
  diffCells: number[];
}

const PASS_AT = 0.9;

function iou(a: ReadonlySet<number>, b: ReadonlySet<number>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let both = 0;
  for (const cell of a) if (b.has(cell)) both += 1;
  return both / (a.size + b.size - both);
}

function containment(inner: ReadonlySet<number>, zone: ReadonlySet<number>): number {
  if (inner.size === 0) return 0;
  let inside = 0;
  for (const cell of inner) if (zone.has(cell)) inside += 1;
  return inside / inner.size;
}

function merged(frame: Frame, layers: readonly Layer[]): Set<number> {
  const stride = COLS * ROWS;
  return new Set(layers.flatMap((l) => [...frame[l]].map((cell) => LAYERS.indexOf(l) * stride + cell)));
}

const GEOMETRY: readonly Layer[] = ["solid", "brine", "ash", "plate", "latch", "exitCinder", "exitDrift"];

function finding(label: string, score: number, ok: string, bad: string): Finding {
  return { label, score, pass: score >= PASS_AT, note: score >= PASS_AT ? ok : bad };
}

/** Mock critic: compares a capture against the reference, layer by layer. */
export function compareFrames(ref: Frame, cap: Frame): Critique {
  const door = iou(ref.door, cap.door);
  const placement = (hero: Hero, label: string): Finding => {
    const mine = hero === "cinder" ? cap.cinder : cap.drift;
    const zone = hero === "cinder" ? ref.exitCinder : ref.exitDrift;
    return finding(
      label,
      containment(mine, zone),
      "standing in the exit",
      "not at the exit yet",
    );
  };
  const findings: Finding[] = [
    finding("Level geometry", iou(merged(ref, GEOMETRY), merged(cap, GEOMETRY)), "matches the reference", "layout drifted from the reference"),
    finding("Door state", door, "open, as in the reference", "door still closed, reference shows it open"),
    placement("cinder", "Cinder placement"),
    placement("drift", "Drift placement"),
  ];

  const diff = new Set<number>();
  for (const layer of [...GEOMETRY, "door"] as const) {
    for (const cell of ref[layer]) if (!cap[layer].has(cell)) diff.add(cell);
    for (const cell of cap[layer]) if (!ref[layer].has(cell)) diff.add(cell);
  }
  for (const [mine, zone] of [
    [cap.cinder, ref.exitCinder],
    [cap.drift, ref.exitDrift],
  ] as const) {
    for (const cell of mine) if (!zone.has(cell)) diff.add(cell);
  }

  const score = findings.reduce((sum, f) => sum + f.score, 0) / findings.length;
  return { score, pass: findings.every((f) => f.pass), findings, diffCells: [...diff].sort((a, b) => a - b) };
}

export function capture(state: GameState): Critique {
  return compareFrames(rasterize(solvedState(state)), rasterize(state));
}
