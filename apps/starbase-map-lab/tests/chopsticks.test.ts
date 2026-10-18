import { describe, expect, test } from "bun:test";
import { armsClosed, chopstickArmDeg } from "../src/lib/chopsticks";

describe("chopsticks", () => {
  test("arms are open before the catch and closed at and after it", () => {
    expect(chopstickArmDeg(-12)).toBe(62);
    expect(chopstickArmDeg(0)).toBe(62);
    expect(chopstickArmDeg(399)).toBe(62);
    expect(chopstickArmDeg(400)).toBe(62);
    expect(chopstickArmDeg(410)).toBeLessThan(62);
    expect(chopstickArmDeg(410)).toBeGreaterThan(4);
    expect(chopstickArmDeg(420)).toBe(4);
    expect(chopstickArmDeg(540)).toBe(4);
    expect(armsClosed(399)).toBe(false);
    expect(armsClosed(420)).toBe(true);
    expect(armsClosed(500)).toBe(true);
  });
});
