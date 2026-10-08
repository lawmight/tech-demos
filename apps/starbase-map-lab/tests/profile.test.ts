import { describe, expect, test } from "bun:test";
import { BOOSTER_HEIGHT_M, CATCH_ALTITUDE_M, COUNTDOWN_S, PAD } from "../src/config/profile";
import { haversineM } from "../src/lib/geo";
import { phaseAt, stateAt } from "../src/lib/profile";

const BOUNDARIES = [12, 72, 172, 187, 252, 402, 427, 442];

describe("flight profile", () => {
  test("phase boundaries use the next phase", () => {
    expect(phaseAt(0)).toBe("countdown");
    expect(phaseAt(11.9)).toBe("countdown");
    expect(phaseAt(12)).toBe("liftoff");
    expect(phaseAt(71.9)).toBe("liftoff");
    expect(phaseAt(72)).toBe("max-q");
    expect(phaseAt(171.9)).toBe("max-q");
    expect(phaseAt(172)).toBe("hot-staging");
    expect(phaseAt(186.9)).toBe("hot-staging");
    expect(phaseAt(187)).toBe("boostback");
    expect(phaseAt(251.9)).toBe("boostback");
    expect(phaseAt(252)).toBe("booster-coast");
    expect(phaseAt(401.9)).toBe("booster-coast");
    expect(phaseAt(402)).toBe("landing-burn");
    expect(phaseAt(426.9)).toBe("landing-burn");
    expect(phaseAt(427)).toBe("catch");
    expect(phaseAt(441.9)).toBe("catch");
    expect(phaseAt(442)).toBe("ship-coast");
    expect(phaseAt(551.9)).toBe("ship-coast");
  });

  test("position and altitude stay continuous across phase changes", () => {
    for (const boundary of BOUNDARIES) {
      const before = stateAt(boundary - 0.001);
      const after = stateAt(boundary + 0.001);
      expect(gap(before.ship, after.ship)).toBeLessThan(15);
      expect(gap(before.booster, after.booster)).toBeLessThan(15);
    }
  });

  test("the stack is together at staging and the ship pulls ahead", () => {
    const staging = stateAt(COUNTDOWN_S + 160);
    expect(staging.phase).toBe("hot-staging");
    expect(staging.clock).toBe("T+2:40");
    expect(staging.hotStageFlash).toBe(true);
    expect(staging.booster.enginesOn).toBe(false);
    expect(staging.ship.enginesOn).toBe(true);
    expect(gap(staging.ship, staging.booster)).toBeCloseTo(BOOSTER_HEIGHT_M, 3);
    expect(staging.booster.altitudeM).toBeCloseTo(69_000, 3);
    const later = stateAt(COUNTDOWN_S + 175);
    expect(later.ship.downrangeM).toBeGreaterThan(later.booster.downrangeM);
  });

  test("booster ends on the catch point and stays there", () => {
    const caught = stateAt(COUNTDOWN_S + 420);
    expect(caught.phase).toBe("catch");
    expect(caught.clock).toBe("T+7:00");
    expect(caught.armDeg).toBe(4);
    expect(caught.booster.downrangeM).toBeCloseTo(0, 4);
    expect(Math.abs(caught.booster.altitudeM - 29)).toBeLessThanOrEqual(2);
    expect(caught.booster.altitudeM).toBeCloseTo(CATCH_ALTITUDE_M, 3);
    expect(haversineM(caught.booster, PAD)).toBeLessThanOrEqual(5);
    const held = stateAt(COUNTDOWN_S + 500);
    expect(haversineM(held.booster, PAD)).toBeLessThanOrEqual(5);
    expect(Math.abs(held.booster.altitudeM - 29)).toBeLessThanOrEqual(2);
    expect(held.booster.enginesOn).toBe(false);
  });

  test("ship downrange increases after staging", () => {
    let previous = stateAt(COUNTDOWN_S + 160).ship.downrangeM;
    for (let mission = 165; mission <= 540; mission += 5) {
      const downrange = stateAt(COUNTDOWN_S + mission).ship.downrangeM;
      expect(downrange).toBeGreaterThan(previous);
      previous = downrange;
    }
    const coast = stateAt(COUNTDOWN_S + 530);
    expect(coast.ship.lng).toBeGreaterThan(PAD.lng);
    expect(coast.ship.enginesOn).toBe(false);
  });

  test("scrubber end holds the coast and playback origin is the countdown", () => {
    expect(stateAt(0).phase).toBe("countdown");
    expect(stateAt(0).booster.altitudeM).toBe(0);
    expect(stateAt(0).ship.altitudeM).toBeCloseTo(BOOSTER_HEIGHT_M, 3);
    expect(stateAt(552).phase).toBe("ship-coast");
    expect(stateAt(552).ship.downrangeM).toBeGreaterThan(150_000);
  });
});

function gap(
  a: { eastM: number; northM: number; altitudeM: number },
  b: { eastM: number; northM: number; altitudeM: number },
): number {
  return Math.hypot(a.eastM - b.eastM, a.northM - b.northM, a.altitudeM - b.altitudeM);
}
