import { describe, expect, test } from "bun:test";
import { LOOP_LENGTH_S } from "../src/config/profile";
import { advance, clampScrub, formatClock, wrapLoop } from "../src/lib/timeline";

describe("timeline", () => {
  test("loop wrap sends the end back to the countdown", () => {
    expect(LOOP_LENGTH_S).toBe(552);
    expect(wrapLoop(0, 552)).toBe(0);
    expect(wrapLoop(552, 552)).toBe(0);
    expect(wrapLoop(553.5, 552)).toBe(1.5);
    expect(wrapLoop(-1, 552)).toBe(551);
  });

  test("scrub clamps to the closed loop", () => {
    expect(clampScrub(-20, 552)).toBe(0);
    expect(clampScrub(0, 552)).toBe(0);
    expect(clampScrub(160.5, 552)).toBe(160.5);
    expect(clampScrub(552, 552)).toBe(552);
    expect(clampScrub(900, 552)).toBe(552);
    expect(clampScrub(Number.NaN, 552)).toBe(0);
  });

  test("speed scales dt and pause holds t", () => {
    expect(advance(10, 1, 1, false, 552)).toBe(11);
    expect(advance(10, 1, 5, false, 552)).toBe(15);
    expect(advance(10, 2, 20, false, 552)).toBe(50);
    expect(advance(10, 4, 1, true, 552)).toBe(10);
    expect(advance(540, 1, 20, false, 552)).toBe(8);
  });

  test("clock labels countdown and the public-style marks", () => {
    expect(formatClock(-12)).toBe("T-0:12");
    expect(formatClock(0)).toBe("T+0:00");
    expect(formatClock(160)).toBe("T+2:40");
    expect(formatClock(420)).toBe("T+7:00");
    expect(formatClock(510)).toBe("T+8:30");
  });
});
