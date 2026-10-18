import { NO_INPUT, type Input, type Inputs } from "./game";
import type { Hero } from "./level";

/** A held key combination: L, R and J for left, right and jump. */
export interface Segment {
  ticks: number;
  keys: string;
}

/** Cinder holds the plate while Drift climbs through the door to the lever, then Cinder follows. */
export const SOLUTION: Record<Hero, readonly Segment[]> = {
  cinder: [
    { ticks: 170, keys: "R" },
    { ticks: 100, keys: "" },
    { ticks: 200, keys: "RJ" },
    { ticks: 80, keys: "R" },
  ],
  drift: [
    { ticks: 300, keys: "RJ" },
    { ticks: 60, keys: "R" },
    { ticks: 20, keys: "RJ" },
    { ticks: 60, keys: "R" },
  ],
};

function toInput(keys: string): Input {
  return { left: keys.includes("L"), right: keys.includes("R"), jump: keys.includes("J") };
}

export function solutionInputAt(tick: number): Inputs {
  const pick = (segments: readonly Segment[]): Input => {
    let remaining = tick;
    for (const s of segments) {
      if (remaining < s.ticks) return toInput(s.keys);
      remaining -= s.ticks;
    }
    return NO_INPUT;
  };
  return { cinder: pick(SOLUTION.cinder), drift: pick(SOLUTION.drift) };
}
