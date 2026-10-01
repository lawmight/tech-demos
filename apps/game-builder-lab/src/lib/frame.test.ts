import { describe, expect, test } from "bun:test";
import { capture, compareFrames, rasterize, solvedState } from "./frame";
import { createGame, step, NO_INPUT } from "./game";
import { LEVEL } from "./level";
import { solutionInputAt } from "./solution";

const fresh = () => createGame(LEVEL);

describe("critic", () => {
  test("an untouched level fails with the door and both heroes flagged", () => {
    const c = capture(fresh());
    expect(c.pass).toBe(false);
    const byLabel = Object.fromEntries(c.findings.map((f) => [f.label, f]));
    expect(byLabel["Level geometry"]?.pass).toBe(true);
    expect(byLabel["Door state"]?.note).toBe("door still closed, reference shows it open");
    expect(byLabel["Cinder placement"]?.score).toBe(0);
    expect(byLabel["Drift placement"]?.pass).toBe(false);
    expect(c.diffCells.length).toBeGreaterThan(5);
  });

  test("the solved frame matches its own reference exactly", () => {
    const c = capture(solvedState(fresh()));
    expect(c.pass).toBe(true);
    expect(c.score).toBe(1);
    expect(c.diffCells).toEqual([]);
  });

  test("a real winning run passes the critic", () => {
    let s = fresh();
    for (let t = 0; s.status !== "won" && t < 900; t++) s = step(s, solutionInputAt(t), 1 / 60);
    const c = capture(s);
    expect(s.status).toBe("won");
    expect(c.pass).toBe(true);
    expect(c.score).toBeGreaterThanOrEqual(0.9);
  });

  test("a moved platform shows up as a geometry diff", () => {
    const ref = rasterize(solvedState(fresh()));
    const cap = rasterize(solvedState(fresh()));
    const solid = new Set(cap.solid);
    solid.delete([...solid][100] ?? -1);
    const c = compareFrames(ref, { ...cap, solid });
    expect(c.diffCells).toHaveLength(1);
    expect(c.findings[0]?.score).toBeLessThan(1);
  });

  test("idle stepping keeps a fresh game failing", () => {
    let s = fresh();
    for (let t = 0; t < 60; t++) s = step(s, { cinder: NO_INPUT, drift: NO_INPUT }, 1 / 60);
    expect(capture(s).pass).toBe(false);
  });
});
