import { describe, expect, test } from "bun:test";
import { lastToolResult, liveCounts } from "./playback";
import { FAST_LEVERS, SLOW_LEVERS } from "./planner";
import { simulate } from "./simulate";
import { SAMPLE_SKILL } from "./skill";
import { DEFAULT_GOAL_TEXT, DEFAULT_WORLD } from "./world";

const fast = simulate(DEFAULT_GOAL_TEXT, DEFAULT_WORLD, FAST_LEVERS, SAMPLE_SKILL);
const slow = simulate(DEFAULT_GOAL_TEXT, DEFAULT_WORLD, SLOW_LEVERS, SAMPLE_SKILL);

describe("liveCounts", () => {
  test("nothing has started at 0 ms", () => {
    expect(liveCounts(fast, 0)).toEqual({ toolCalls: 0, modelTurns: 0, parallelBatches: 0 });
  });

  test("the parallel batch counts once all three checks start", () => {
    expect(liveCounts(fast, 700)).toEqual({ toolCalls: 3, modelTurns: 1, parallelBatches: 1 });
  });

  test("a call counts only after its start, not at its start", () => {
    expect(liveCounts(slow, 9000)).toEqual({ toolCalls: 0, modelTurns: 1, parallelBatches: 0 });
    expect(liveCounts(slow, 9001)).toEqual({ toolCalls: 1, modelTurns: 1, parallelBatches: 0 });
  });

  test("end of run matches the final metrics", () => {
    expect(liveCounts(fast, 16000)).toEqual({ toolCalls: 5, modelTurns: 3, parallelBatches: 1 });
    expect(liveCounts(slow, 167400)).toEqual({ toolCalls: 12, modelTurns: 12, parallelBatches: 0 });
  });
});

describe("lastToolResult", () => {
  test("result of the last call before a step", () => {
    expect(lastToolResult(fast.steps, 0)).toBe("");
    expect(lastToolResult(fast.steps, 2)).toBe("available: 19:30");
    expect(lastToolResult(fast.steps, 4)).toBe("confirmed DZ-1930-2");
  });
});
