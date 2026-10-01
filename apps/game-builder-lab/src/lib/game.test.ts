import { describe, expect, test } from "bun:test";
import { createGame, isWon, NO_INPUT, platesPressed, step, type GameState, type Inputs } from "./game";
import { COLS, LEVEL, LEVEL_ROWS, ROWS, parseLevel, type Hero } from "./level";
import { solutionInputAt } from "./solution";

const DT = 1 / 60;
const idle: Inputs = { cinder: NO_INPUT, drift: NO_INPUT };

function run(state: GameState, ticks: number, inputs: (tick: number) => Inputs): GameState {
  let s = state;
  for (let t = 0; t < ticks; t++) s = step(s, inputs(t), DT);
  return s;
}

function place(state: GameState, hero: Hero, x: number, y: number): GameState {
  return { ...state, heroes: { ...state.heroes, [hero]: { ...state.heroes[hero], x, y } } };
}

describe("parseLevel", () => {
  test("ships a 48x27 grid with spawns, door, latch and both exits", () => {
    expect(LEVEL_ROWS).toHaveLength(ROWS);
    expect(LEVEL_ROWS.every((r) => r.length === COLS)).toBe(true);
    expect(LEVEL.spawns.cinder).toEqual({ x: 43, y: 476 });
    expect(LEVEL.door).toHaveLength(5);
    expect(LEVEL.exits.cinder).toEqual({ x: 800, y: 320, w: 60, h: 40 });
    expect(LEVEL.exits.drift).toEqual({ x: 880, y: 320, w: 60, h: 40 });
  });

  test("rejects a grid with the wrong shape", () => {
    expect(() => parseLevel(["#"])).toThrow("level needs 27 rows");
    expect(() => parseLevel(LEVEL_ROWS.map((r, i) => (i === 3 ? r.slice(1) : r)))).toThrow(
      "row 3 needs 48 columns",
    );
  });
});

describe("hazards", () => {
  const fromBrine = (hero: Hero) => {
    const start = createGame(LEVEL);
    const brine = LEVEL.hazards.find((h) => h.kills === "cinder");
    if (!brine) throw new Error("no brine");
    return run(place(start, hero, brine.rect.x + 2, brine.rect.y - 4), 10, () => idle);
  };

  test("brine kills Cinder and sends her back to spawn", () => {
    const s = fromBrine("cinder");
    expect(s.deaths).toBe(1);
    expect(s.heroes.cinder.x).toBe(LEVEL.spawns.cinder.x);
  });

  test("brine is safe for Drift", () => {
    const s = fromBrine("drift");
    expect(s.deaths).toBe(0);
    expect(s.heroes.drift.x).toBeGreaterThan(LEVEL.spawns.drift.x);
  });
});

describe("plate and door", () => {
  const plate = LEVEL.plates[0];
  if (!plate) throw new Error("no plate");
  const onPlate = (hero: Hero) => place(createGame(LEVEL), hero, plate.x + 10, plate.y - 20);

  test("a hero standing on the plate opens the door", () => {
    const s = run(onPlate("drift"), 3, () => idle);
    expect(platesPressed(s)).toBe(true);
    expect(s.doorOpen).toBe(true);
  });

  test("the door closes again when the plate is released", () => {
    const pressed = run(onPlate("cinder"), 3, () => idle);
    const released = run(place(pressed, "cinder", 100, 476), 3, () => idle);
    expect(released.doorOpen).toBe(false);
  });

  test("a closed door blocks the way", () => {
    const door = LEVEL.door[0];
    if (!door) throw new Error("no door");
    const start = place(createGame(LEVEL), "drift", door.x - 40, door.y + door.h * 2 - 24);
    const s = run(start, 90, () => ({ ...idle, drift: { left: false, right: true, jump: false } }));
    expect(s.heroes.drift.x + s.heroes.drift.w).toBeLessThanOrEqual(door.x);
  });

  test("touching the lever latches the door open for good", () => {
    const lever = LEVEL.latch;
    const touched = step(place(createGame(LEVEL), "drift", lever.x + 3, lever.y + 40), idle, DT);
    expect(touched.latched).toBe(true);
    const later = run(place(touched, "drift", 100, 476), 5, () => idle);
    expect(later.doorOpen).toBe(true);
  });
});

describe("win condition", () => {
  const atExit = (hero: Hero, s: GameState): GameState => {
    const e = LEVEL.exits[hero];
    return place(s, hero, e.x + 20, e.y + 10);
  };

  test("needs both heroes in their own exit", () => {
    const one = atExit("cinder", createGame(LEVEL));
    expect(isWon(one)).toBe(false);
    expect(isWon(atExit("drift", one))).toBe(true);
  });

  test("a hero in the other hero's exit does not count", () => {
    const swapped = place(
      place(createGame(LEVEL), "cinder", LEVEL.exits.drift.x + 20, LEVEL.exits.drift.y + 10),
      "drift",
      LEVEL.exits.cinder.x + 20,
      LEVEL.exits.cinder.y + 10,
    );
    expect(isWon(swapped)).toBe(false);
  });

  test("the scripted co-op run wins", () => {
    const s = run(createGame(LEVEL), 700, solutionInputAt);
    expect(s.status).toBe("won");
    expect(s.deaths).toBe(0);
  });

  test("Drift alone cannot pass the door", () => {
    const drift = (t: number): Inputs => ({ ...solutionInputAt(t), cinder: NO_INPUT });
    const s = run(createGame(LEVEL), 700, drift);
    expect(s.status).toBe("playing");
    expect(s.latched).toBe(false);
  });
});
