import { describe, expect, test } from "bun:test";
import { centerIn, moveAndCollide, overlaps, type Body } from "./physics";
import type { Rect } from "./level";

const floor: Rect = { x: 0, y: 100, w: 400, h: 20 };
const body = (over: Partial<Body> = {}): Body => ({
  x: 10,
  y: 76,
  w: 14,
  h: 24,
  vx: 0,
  vy: 0,
  onGround: true,
  ...over,
});

describe("moveAndCollide", () => {
  test("lands on a floor and reports ground contact", () => {
    const next = moveAndCollide(body({ y: 60, vy: 300, onGround: false }), [floor], 0.1);
    expect(next.y).toBe(76);
    expect(next.vy).toBe(0);
    expect(next.onGround).toBe(true);
  });

  test("stops against a wall taller than a step", () => {
    const wall: Rect = { x: 50, y: 60, w: 20, h: 40 };
    const next = moveAndCollide(body({ x: 30, vx: 170 }), [floor, wall], 0.2);
    expect(next.x).toBe(36);
    expect(next.vx).toBe(0);
  });

  test("walks up a 20px step but not a 40px one", () => {
    const step20: Rect = { x: 50, y: 80, w: 100, h: 20 };
    const step40: Rect = { x: 50, y: 60, w: 100, h: 40 };
    const up = moveAndCollide(body({ x: 30, vx: 170 }), [floor, step20], 0.2);
    expect(up.y).toBe(56);
    expect(up.x).toBeCloseTo(64);
    const blocked = moveAndCollide(body({ x: 30, vx: 170 }), [floor, step40], 0.2);
    expect(blocked.x).toBe(36);
    expect(blocked.y).toBe(76);
  });

  test("bumps its head on a ceiling", () => {
    const ceiling: Rect = { x: 0, y: 20, w: 400, h: 20 };
    const next = moveAndCollide(body({ vy: -500, onGround: false }), [floor, ceiling], 0.1);
    expect(next.y).toBe(40);
    expect(next.vy).toBe(0);
  });
});

describe("rect helpers", () => {
  test("overlaps ignores touching edges", () => {
    expect(overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 })).toBe(false);
    expect(overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 9, y: 0, w: 10, h: 10 })).toBe(true);
  });

  test("centerIn tests the body center", () => {
    const zone: Rect = { x: 100, y: 100, w: 40, h: 40 };
    expect(centerIn({ x: 93, y: 100, w: 14, h: 24 }, zone)).toBe(true);
    expect(centerIn({ x: 60, y: 100, w: 14, h: 24 }, zone)).toBe(false);
  });
});
