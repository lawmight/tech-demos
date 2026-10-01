import { describe, expect, test } from "bun:test";
import { SAMPLE_SKILL } from "./skill";
import { DEFAULT_SAVED, STORAGE_KEY, parseSaved } from "./storage";

const metrics = { toolCalls: 5, modelTurns: 3, parallelBatches: 1, failedCalls: 0, wallMs: 16000 };

describe("parseSaved", () => {
  test("key and defaults", () => {
    expect(STORAGE_KEY).toBe("slow-assistant-lab:v1");
    expect(DEFAULT_SAVED).toEqual({
      goalText: "Book dinner for 2 tonight at one of: A Mano, II Borgo, Doppio Zero",
      skillText: SAMPLE_SKILL,
      levers: { parallel: true, skill: true, fastTurns: true },
      modelMode: "deterministic",
      speed: 20,
      lastMetrics: { slow: null, fast: null },
    });
  });

  test("missing or malformed storage falls back to defaults", () => {
    expect(parseSaved(null)).toEqual(DEFAULT_SAVED);
    expect(parseSaved("{not json")).toEqual(DEFAULT_SAVED);
    expect(parseSaved("[1,2]")).toEqual(DEFAULT_SAVED);
    expect(parseSaved('"text"')).toEqual(DEFAULT_SAVED);
  });

  test("valid fields are kept", () => {
    const raw = JSON.stringify({
      goalText: "Dinner for 4 at one of: A Mano",
      skillText: "# skill: x\n1. go",
      levers: { parallel: false, skill: true, fastTurns: false },
      modelMode: "hf",
      speed: 50,
      lastMetrics: { slow: null, fast: metrics },
    });
    expect(parseSaved(raw)).toEqual({
      goalText: "Dinner for 4 at one of: A Mano",
      skillText: "# skill: x\n1. go",
      levers: { parallel: false, skill: true, fastTurns: false },
      modelMode: "hf",
      speed: 50,
      lastMetrics: { slow: null, fast: metrics },
    });
  });

  test("each invalid field falls back on its own", () => {
    const raw = JSON.stringify({
      goalText: 42,
      skillText: "# skill: kept\n1. go",
      levers: { parallel: "yes", skill: false },
      modelMode: "gpt",
      speed: 33,
      lastMetrics: { slow: { ...metrics, wallMs: "16s" }, fast: metrics },
    });
    expect(parseSaved(raw)).toEqual({
      goalText: DEFAULT_SAVED.goalText,
      skillText: "# skill: kept\n1. go",
      levers: { parallel: true, skill: false, fastTurns: true },
      modelMode: "deterministic",
      speed: 20,
      lastMetrics: { slow: null, fast: metrics },
    });
  });
});
