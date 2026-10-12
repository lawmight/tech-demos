import { describe, expect, test } from "bun:test";
import { formatClock, speedup, summarize } from "./metrics";
import type { Step, TimelineEvent } from "./types";

describe("summarize", () => {
  test("counts calls, turns, parallel batches, failures and wall clock", () => {
    const steps: Step[] = [
      { kind: "turn", text: "a", durationMs: 600 },
      {
        kind: "tools",
        calls: [
          { tool: "check_availability", args: {}, ok: true, result: "", durationMs: 5200 },
          { tool: "check_availability", args: {}, ok: false, result: "", durationMs: 6000 },
          { tool: "check_availability", args: {}, ok: true, result: "", durationMs: 4400 },
        ],
      },
      { kind: "turn", text: "b", durationMs: 600 },
      { kind: "tools", calls: [{ tool: "done", args: {}, ok: true, result: "", durationMs: 200 }] },
    ];
    const timeline: TimelineEvent[] = [
      { id: "e0", kind: "turn", label: "a", ok: true, lane: 0, stepIndex: 0, startMs: 0, endMs: 600 },
      { id: "e1", kind: "check_availability", label: "", ok: true, lane: 0, stepIndex: 1, startMs: 600, endMs: 5800 },
      { id: "e2", kind: "check_availability", label: "", ok: false, lane: 1, stepIndex: 1, startMs: 600, endMs: 6600 },
      { id: "e3", kind: "check_availability", label: "", ok: true, lane: 2, stepIndex: 1, startMs: 600, endMs: 5000 },
      { id: "e4", kind: "turn", label: "b", ok: true, lane: 0, stepIndex: 2, startMs: 6600, endMs: 7200 },
      { id: "e5", kind: "done", label: "", ok: true, lane: 0, stepIndex: 3, startMs: 7200, endMs: 7400 },
    ];
    expect(summarize(steps, timeline)).toEqual({
      toolCalls: 4,
      modelTurns: 2,
      parallelBatches: 1,
      failedCalls: 1,
      wallMs: 7400,
    });
  });

  test("empty run", () => {
    expect(summarize([], [])).toEqual({ toolCalls: 0, modelTurns: 0, parallelBatches: 0, failedCalls: 0, wallMs: 0 });
  });
});

describe("speedup", () => {
  const m = (wallMs: number) => ({ toolCalls: 0, modelTurns: 0, parallelBatches: 0, failedCalls: 0, wallMs });

  test("ratio rounded to one decimal", () => {
    expect(speedup(m(167400), m(16000))).toBe(10.5);
    expect(speedup(m(167400), m(26800))).toBe(6.2);
    expect(speedup(m(460000), m(22000))).toBe(20.9);
  });

  test("zero fast wall clock yields 0 instead of Infinity", () => {
    expect(speedup(m(1000), m(0))).toBe(0);
  });
});

describe("formatClock", () => {
  test("seconds with one decimal under a minute", () => {
    expect(formatClock(0)).toBe("0.0s");
    expect(formatClock(16000)).toBe("16.0s");
    expect(formatClock(16440)).toBe("16.4s");
  });

  test("minutes and zero-padded seconds from a minute up", () => {
    expect(formatClock(59950)).toBe("1m 00s");
    expect(formatClock(65000)).toBe("1m 05s");
    expect(formatClock(167400)).toBe("2m 47s");
    expect(formatClock(460000)).toBe("7m 40s");
  });
});
