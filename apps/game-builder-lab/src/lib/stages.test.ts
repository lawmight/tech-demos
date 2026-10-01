import { describe, expect, test } from "bun:test";
import {
  canView,
  currentStage,
  initialStages,
  PLAN_ITEMS,
  reduceStages,
  stageStatus,
  type StageEvent,
  type StageState,
} from "./stages";

const apply = (events: StageEvent[], from: StageState = initialStages()): StageState =>
  events.reduce(reduceStages, from);

const checkAll: StageEvent[] = PLAN_ITEMS.map((_, index) => ({ type: "toggle-plan", index }));

describe("stage gates", () => {
  test("starts on Brief with every later stage locked", () => {
    const s = initialStages();
    expect(currentStage(s)).toBe("brief");
    expect(stageStatus(s, "brief")).toBe("current");
    expect(stageStatus(s, "plan")).toBe("locked");
    expect(canView(s, "plan")).toBe(false);
  });

  test("viewing a locked stage is ignored", () => {
    const s = apply([{ type: "view", stage: "critic" }]);
    expect(s.viewing).toBe("brief");
  });

  test("locking the brief opens Plan and moves there", () => {
    const s = apply([{ type: "lock-brief" }]);
    expect(s.viewing).toBe("plan");
    expect(stageStatus(s, "brief")).toBe("done");
    expect(stageStatus(s, "plan")).toBe("current");
  });

  test("Playable stays locked until every plan item is checked", () => {
    const partial = apply([{ type: "lock-brief" }, { type: "toggle-plan", index: 0 }]);
    expect(canView(partial, "playable")).toBe(false);
    const full = apply([{ type: "lock-brief" }, ...checkAll]);
    expect(full.viewing).toBe("playable");
    expect(currentStage(full)).toBe("playable");
  });

  test("unchecking a plan item re-locks Playable", () => {
    const full = apply([{ type: "lock-brief" }, ...checkAll]);
    const undone = reduceStages(full, { type: "toggle-plan", index: 2 });
    expect(canView(undone, "playable")).toBe(false);
    expect(undone.viewing).toBe("plan");
  });

  test("a failing capture opens Critic but does not pass it", () => {
    const s = apply([
      { type: "lock-brief" },
      ...checkAll,
      { type: "captured", verdict: { pass: false, score: 0.42 } },
    ]);
    expect(s.viewing).toBe("critic");
    expect(stageStatus(s, "playable")).toBe("done");
    expect(stageStatus(s, "critic")).toBe("current");
  });

  test("a capture taken before the brief is locked leaves later stages locked", () => {
    const s = apply([{ type: "captured", verdict: { pass: true, score: 1 } }]);
    expect(stageStatus(s, "brief")).toBe("current");
    expect(stageStatus(s, "playable")).toBe("locked");
    expect(stageStatus(s, "critic")).toBe("locked");
    expect(s.viewing).toBe("brief");
  });

  test("a passing capture completes all four stages", () => {
    const s = apply([
      { type: "lock-brief" },
      ...checkAll,
      { type: "captured", verdict: { pass: true, score: 1 } },
    ]);
    expect(stageStatus(s, "critic")).toBe("done");
  });

  test("reset-level clears the verdict and returns to Playable", () => {
    const s = apply([
      { type: "lock-brief" },
      ...checkAll,
      { type: "captured", verdict: { pass: true, score: 1 } },
      { type: "reset-level" },
    ]);
    expect(s.verdict).toBeNull();
    expect(s.viewing).toBe("playable");
    expect(stageStatus(s, "critic")).toBe("locked");
  });
});
