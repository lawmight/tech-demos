import {
  HERO_SIZE,
  HEROES,
  type Hero,
  type Level,
  type Rect,
} from "./level";
import {
  GRAVITY,
  JUMP_SPEED,
  MAX_FALL,
  MOVE_SPEED,
  centerIn,
  moveAndCollide,
  overlaps,
  type Body,
} from "./physics";

export interface Input {
  left: boolean;
  right: boolean;
  jump: boolean;
}

export type Inputs = Record<Hero, Input>;

export const NO_INPUT: Input = { left: false, right: false, jump: false };

export interface GameState {
  level: Level;
  heroes: Record<Hero, Body>;
  latched: boolean;
  doorOpen: boolean;
  deaths: number;
  status: "playing" | "won";
}

function spawnBody(level: Level, hero: Hero): Body {
  const { x, y } = level.spawns[hero];
  return { x, y, ...HERO_SIZE, vx: 0, vy: 0, onGround: false };
}

export function createGame(level: Level): GameState {
  return {
    level,
    heroes: {
      cinder: spawnBody(level, "cinder"),
      drift: spawnBody(level, "drift"),
    },
    latched: false,
    doorOpen: false,
    deaths: 0,
    status: "playing",
  };
}

export function platesPressed(state: GameState): boolean {
  return state.level.plates.some((p) => HEROES.some((h) => overlaps(state.heroes[h], p)));
}

function doorHeldByHero(state: GameState): boolean {
  return state.level.door.some((d) => HEROES.some((h) => overlaps(state.heroes[h], d)));
}

export function isWon(state: GameState): boolean {
  return HEROES.every((h) => centerIn(state.heroes[h], state.level.exits[h]));
}

function steer(body: Body, input: Input): Body {
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const vy = input.jump && body.onGround ? -JUMP_SPEED : body.vy;
  return { ...body, vx: dir * MOVE_SPEED, vy };
}

export function step(state: GameState, inputs: Inputs, dt: number): GameState {
  if (state.status === "won") return state;
  const { level } = state;
  const solids: Rect[] = state.doorOpen ? level.solids : [...level.solids, ...level.door];

  let deaths = state.deaths;
  const heroes = { ...state.heroes };
  for (const hero of HEROES) {
    const steered = steer(heroes[hero], inputs[hero]);
    const falling = { ...steered, vy: Math.min(steered.vy + GRAVITY * dt, MAX_FALL) };
    const moved = moveAndCollide(falling, solids, dt);
    const killed = level.hazards.some((h) => h.kills === hero && overlaps(moved, h.rect));
    if (killed) deaths += 1;
    heroes[hero] = killed ? spawnBody(level, hero) : moved;
  }

  const next: GameState = { ...state, heroes, deaths };
  const latched = state.latched || HEROES.some((h) => overlaps(heroes[h], level.latch));
  const doorOpen = platesPressed(next) || latched || doorHeldByHero(next);
  const settled: GameState = { ...next, latched, doorOpen };
  return isWon(settled) ? { ...settled, status: "won" } : settled;
}
