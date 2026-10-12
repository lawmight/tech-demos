import { describe, expect, test } from "bun:test";
import { hasWork, initialState, isTurnSettled, reduce, tick, currentTask, MAX_ATTEMPTS } from "./dispatch";
import { SAMPLE_CODE_REQUEST, SAMPLE_FOLLOWUP, SAMPLE_GOAL } from "./sample";
import type { LabState } from "./types";

function run(state: LabState, ticks: number): LabState {
  let next = state;
  for (let i = 0; i < ticks; i++) next = tick(next);
  return next;
}

function settle(state: LabState): LabState {
  let next = state;
  for (let i = 0; i < 100 && hasWork(next); i++) next = tick(next);
  return next;
}

const statuses = (s: LabState) => s.tasks.map((t) => `${t.role}:${t.status}`);

describe("dispatch state machine", () => {
  test("sending a goal posts the user message and plan, and queues three tasks", () => {
    const s = reduce(initialState(), { type: "send", text: SAMPLE_GOAL });
    expect(s.messages.map((m) => [m.id, m.author, m.kind])).toEqual([
      ["m1", "user", "goal"],
      ["m2", "coordinator", "plan"],
    ]);
    expect(statuses(s)).toEqual(["ui:queued", "api:queued", "tests:queued"]);
    expect(s.agents).toEqual([
      { role: "ui", runs: 1 },
      { role: "api", runs: 1 },
      { role: "tests", runs: 1 },
    ]);
  });

  test("concurrency of two leaves the third task queued, then it starts", () => {
    const s0 = reduce(initialState(), { type: "send", text: SAMPLE_GOAL });
    expect(statuses(run(s0, 1))).toEqual(["ui:running", "api:running", "tests:queued"]);
    expect(statuses(run(s0, 8))).toEqual(["ui:running", "api:done", "tests:running"]);
    expect(statuses(run(s0, 12))).toEqual(["ui:done", "api:done", "tests:running"]);
  });

  test("progress advances by elapsed over duration and is capped at 100", () => {
    const s = run(reduce(initialState(), { type: "send", text: SAMPLE_GOAL }), 3);
    const ui = s.tasks[0];
    expect(ui).toMatchObject({ role: "ui", status: "running", elapsed: 2, duration: 11, progress: 18 });
  });

  test("the full loop folds every result into the one thread and summarizes once", () => {
    const s = settle(reduce(initialState(), { type: "send", text: SAMPLE_GOAL }));
    expect(statuses(s)).toEqual(["ui:done", "api:done", "tests:done"]);
    expect(s.messages.map((m) => m.kind)).toEqual(["goal", "plan", "result", "result", "result", "summary"]);
    expect(s.messages[5]?.text.split("\n")[0]).toBe("All 3 tasks are done. Everything is in this thread.");
    expect(s.summarized).toEqual([1]);
    expect(tick(s)).toEqual(s);
  });

  test("a follow-up reuses existing subagents in the same thread", () => {
    const first = settle(reduce(initialState(), { type: "send", text: SAMPLE_GOAL }));
    const s = reduce(first, { type: "send", text: SAMPLE_FOLLOWUP });
    expect(s.turns).toBe(2);
    expect(s.agents).toEqual([
      { role: "ui", runs: 2 },
      { role: "api", runs: 1 },
      { role: "tests", runs: 2 },
    ]);
    expect(s.tasks.slice(3).map((t) => [t.id, t.role, t.reused])).toEqual([
      ["t4", "ui", true],
      ["t5", "tests", true],
    ]);
    expect(s.messages[first.messages.length]).toMatchObject({ kind: "followup", turn: 2 });
    const done = settle(s);
    expect(done.summarized).toEqual([1, 2]);
    expect(currentTask(done, "ui")?.id).toBe("t4");
  });

  test("a direct code request is declined in the thread and delegated", () => {
    const s = reduce(initialState(), { type: "send", text: SAMPLE_CODE_REQUEST });
    expect(s.messages[1]).toMatchObject({ kind: "decline", rules: ["no-code", "one-thread"] });
    expect(s.tasks.length).toBeGreaterThanOrEqual(2);
  });

  test("blank messages are ignored", () => {
    const s = initialState();
    expect(reduce(s, { type: "send", text: "   " })).toBe(s);
  });

  test("failure injection fails the API task at 60%, then the coordinator re-dispatches it", () => {
    const armed = reduce(initialState(), { type: "settings", patch: { failure: true } });
    const s0 = reduce(armed, { type: "send", text: SAMPLE_GOAL });
    expect(s0.tasks.map((t) => [t.role, t.injectFailure])).toEqual([
      ["ui", false],
      ["api", true],
      ["tests", false],
    ]);
    const failed = run(s0, 6);
    expect(failed.tasks[1]).toMatchObject({ status: "failed", attempt: 1, progress: 60 });
    expect(failed.messages.at(-1)).toMatchObject({
      kind: "failure",
      text: "API failed on attempt 1. I'll re-dispatch it.",
    });
    expect(statuses(failed)).toEqual(["ui:running", "api:failed", "tests:running"]);
    const retried = tick(failed);
    expect(retried.tasks[1]).toMatchObject({ status: "queued", attempt: 2, progress: 0, injectFailure: false });
    expect(retried.messages.at(-1)).toMatchObject({ kind: "retry", text: "Re-dispatched API for attempt 2." });
    const end = settle(retried);
    expect(statuses(end)).toEqual(["ui:done", "api:done", "tests:done"]);
    expect(end.summarized).toEqual([1]);
  });

  test("a task that fails on its last attempt is reported, not retried", () => {
    const s0 = reduce(initialState(), { type: "send", text: SAMPLE_GOAL });
    const doomed: LabState = {
      ...s0,
      tasks: s0.tasks.map((t) =>
        t.role === "api" ? { ...t, status: "running", attempt: MAX_ATTEMPTS, injectFailure: true } : t,
      ),
    };
    const s = settle(doomed);
    expect(s.tasks[1]).toMatchObject({ status: "failed", attempt: 2 });
    expect(isTurnSettled(s, 1)).toBe(true);
    expect(s.messages.find((m) => m.kind === "failure")?.text).toBe(
      "API failed after 2 attempts. I'm reporting it instead of retrying again.",
    );
    expect(s.messages.at(-1)?.text.split("\n")[0]).toBe("2 of 3 tasks are done. 1 failed.");
  });

  test("reset clears the thread but keeps settings", () => {
    const armed = reduce(initialState(), { type: "settings", patch: { failure: true, speed: 4 } });
    const s = reduce(reduce(armed, { type: "send", text: SAMPLE_GOAL }), { type: "reset" });
    expect(s).toEqual({ ...initialState(), settings: { failure: true, autoplay: true, speed: 4 } });
  });
});
