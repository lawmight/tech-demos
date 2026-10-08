import { describe, expect, test } from "bun:test";
import { FAST_LEVERS, SLOW_LEVERS } from "./planner";
import { simulate } from "./simulate";
import { SAMPLE_SKILL } from "./skill";
import type { Levers, Metrics } from "./types";
import { DEFAULT_GOAL_TEXT, DEFAULT_WORLD } from "./world";

const run = (levers: Levers, skill = SAMPLE_SKILL) => simulate(DEFAULT_GOAL_TEXT, DEFAULT_WORLD, levers, skill);

describe("simulate default world", () => {
  test("slow books Doppio Zero after 2m 47s of simulated time", () => {
    const r = run(SLOW_LEVERS);
    expect(r.outcome).toEqual({ booked: true, restaurant: "Doppio Zero", time: "19:30", code: "DZ-1930-2" });
    expect(r.metrics).toEqual({ toolCalls: 12, modelTurns: 12, parallelBatches: 0, failedCalls: 4, wallMs: 167400 });
    expect(r.levers).toEqual(SLOW_LEVERS);
    expect(r.goal).toEqual({
      text: DEFAULT_GOAL_TEXT,
      partySize: 2,
      candidates: ["A Mano", "II Borgo", "Doppio Zero"],
    });
    expect(r.timeline.length).toBe(24);
  });

  test("fast books the same table in 16.0s", () => {
    const r = run(FAST_LEVERS);
    expect(r.outcome).toEqual({ booked: true, restaurant: "Doppio Zero", time: "19:30", code: "DZ-1930-2" });
    expect(r.metrics).toEqual({ toolCalls: 5, modelTurns: 3, parallelBatches: 1, failedCalls: 0, wallMs: 16000 });
    expect(r.timeline.length).toBe(8);
  });
});

describe("each lever isolated", () => {
  const cases: Array<[string, Levers, Metrics]> = [
    ["parallel only", { parallel: true, skill: false, fastTurns: false }, { toolCalls: 12, modelTurns: 6, parallelBatches: 3, failedCalls: 4, wallMs: 86200 }],
    ["skill only", { parallel: false, skill: true, fastTurns: false }, { toolCalls: 5, modelTurns: 5, parallelBatches: 0, failedCalls: 0, wallMs: 68800 }],
    ["fast turns only", { parallel: false, skill: false, fastTurns: true }, { toolCalls: 12, modelTurns: 12, parallelBatches: 0, failedCalls: 4, wallMs: 66600 }],
    ["fast minus parallel", { parallel: false, skill: true, fastTurns: true }, { toolCalls: 5, modelTurns: 5, parallelBatches: 0, failedCalls: 0, wallMs: 26800 }],
    ["fast minus skill", { parallel: true, skill: false, fastTurns: true }, { toolCalls: 12, modelTurns: 6, parallelBatches: 3, failedCalls: 4, wallMs: 35800 }],
    ["fast minus fast turns", { parallel: true, skill: true, fastTurns: false }, { toolCalls: 5, modelTurns: 3, parallelBatches: 1, failedCalls: 0, wallMs: 41200 }],
  ];
  for (const [name, levers, metrics] of cases) {
    test(name, () => {
      expect(run(levers).metrics).toEqual(metrics);
    });
  }

  test("skill missing name costs one failed book and one extra turn", () => {
    const skill = SAMPLE_SKILL.replace("restaurant, party_size, time, name", "restaurant, party_size, time");
    expect(run(FAST_LEVERS, skill).metrics).toEqual({
      toolCalls: 6,
      modelTurns: 4,
      parallelBatches: 1,
      failedCalls: 1,
      wallMs: 24600,
    });
  });
});

describe("simulate outcomes", () => {
  test("no open table anywhere", () => {
    const full = { ...DEFAULT_WORLD, restaurants: DEFAULT_WORLD.restaurants.map((r) => ({ ...r, slots: [] })) };
    expect(simulate(DEFAULT_GOAL_TEXT, full, FAST_LEVERS, SAMPLE_SKILL).outcome).toEqual({
      booked: false,
      reason: "no tables tonight at A Mano, II Borgo, Doppio Zero",
    });
  });

  test("party of 4 changes the code", () => {
    const r = simulate("Dinner for 4 at one of: II Borgo, Doppio Zero", DEFAULT_WORLD, FAST_LEVERS, SAMPLE_SKILL);
    expect(r.outcome).toEqual({ booked: true, restaurant: "Doppio Zero", time: "19:30", code: "DZ-1930-4" });
  });
});
