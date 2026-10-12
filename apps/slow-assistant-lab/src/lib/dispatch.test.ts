import { describe, expect, test } from "bun:test";
import { callLabel, schedule } from "./dispatch";
import type { Step } from "./types";

describe("schedule", () => {
  test("sequential: every step starts when the previous one ends, all on lane 0", () => {
    const steps: Step[] = [
      { kind: "turn", text: "Checking A Mano first.", durationMs: 9000 },
      {
        kind: "tools",
        calls: [{ tool: "search", args: { query: "A Mano reservations" }, ok: true, result: "found", durationMs: 4000 }],
      },
      { kind: "turn", text: "Trying the form.", durationMs: 9000 },
      {
        kind: "tools",
        calls: [{ tool: "check_availability", args: { restaurant: "A Mano" }, ok: false, result: "rejected", durationMs: 5200 }],
      },
    ];
    expect(schedule(steps)).toEqual([
      { id: "e0", kind: "turn", label: "Checking A Mano first.", ok: true, lane: 0, stepIndex: 0, startMs: 0, endMs: 9000 },
      { id: "e1", kind: "search", label: "search(A Mano reservations)", ok: true, lane: 0, stepIndex: 1, startMs: 9000, endMs: 13000 },
      { id: "e2", kind: "turn", label: "Trying the form.", ok: true, lane: 0, stepIndex: 2, startMs: 13000, endMs: 22000 },
      { id: "e3", kind: "check_availability", label: "check_availability(A Mano)", ok: false, lane: 0, stepIndex: 3, startMs: 22000, endMs: 27200 },
    ]);
  });

  test("parallel: one lane per call, shared start, clock advances by the slowest call", () => {
    const check = (restaurant: string, durationMs: number) => ({
      tool: "check_availability" as const,
      args: { restaurant, party_size: "2" },
      ok: true,
      result: "ok",
      durationMs,
    });
    const steps: Step[] = [
      { kind: "turn", text: "All three at once.", durationMs: 600 },
      { kind: "tools", calls: [check("A Mano", 5200), check("II Borgo", 6000), check("Doppio Zero", 4400)] },
      { kind: "turn", text: "Done.", durationMs: 600 },
      { kind: "tools", calls: [{ tool: "done", args: { summary: "ok" }, ok: true, result: "ok", durationMs: 200 }] },
    ];
    expect(schedule(steps)).toEqual([
      { id: "e0", kind: "turn", label: "All three at once.", ok: true, lane: 0, stepIndex: 0, startMs: 0, endMs: 600 },
      { id: "e1", kind: "check_availability", label: "check_availability(A Mano, 2)", ok: true, lane: 0, stepIndex: 1, startMs: 600, endMs: 5800 },
      { id: "e2", kind: "check_availability", label: "check_availability(II Borgo, 2)", ok: true, lane: 1, stepIndex: 1, startMs: 600, endMs: 6600 },
      { id: "e3", kind: "check_availability", label: "check_availability(Doppio Zero, 2)", ok: true, lane: 2, stepIndex: 1, startMs: 600, endMs: 5000 },
      { id: "e4", kind: "turn", label: "Done.", ok: true, lane: 0, stepIndex: 2, startMs: 6600, endMs: 7200 },
      { id: "e5", kind: "done", label: "done(ok)", ok: true, lane: 0, stepIndex: 3, startMs: 7200, endMs: 7400 },
    ]);
  });

  test("empty plan has no events", () => {
    expect(schedule([])).toEqual([]);
  });
});

describe("callLabel", () => {
  test("tool name with arg values", () => {
    expect(
      callLabel({
        tool: "book",
        args: { restaurant: "Doppio Zero", party_size: "2", time: "19:30", name: "Sam Rivera" },
        ok: true,
        result: "",
        durationMs: 0,
      }),
    ).toBe("book(Doppio Zero, 2, 19:30, Sam Rivera)");
  });
});
