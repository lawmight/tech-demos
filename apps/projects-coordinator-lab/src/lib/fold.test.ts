import { describe, expect, test } from "bun:test";
import { failureMessage, planMessage, resultMessage, summaryMessage } from "./fold";
import { plan } from "./planner";
import { simulateResult, slugOf, visibleLog, durationFor } from "./work";
import type { Task } from "./types";

const base: Task = {
  id: "t1",
  turn: 1,
  role: "ui",
  title: "UI: add a dark-mode toggle to the settings page",
  status: "done",
  attempt: 1,
  reused: false,
  injectFailure: false,
  elapsed: 11,
  duration: 11,
  progress: 100,
  result: null,
};

describe("folding results back into the thread", () => {
  test("a finished task becomes a coordinator result message with the artifact", () => {
    const result = simulateResult(base);
    expect(result.summary).toBe("Implemented the interface change for dark-mode-toggle-settings.");
    const message = resultMessage({ ...base, result });
    expect(message).toEqual({
      turn: 1,
      author: "coordinator",
      kind: "result",
      role: "ui",
      text: "UI is done. Implemented the interface change for dark-mode-toggle-settings.",
      artifact: result.artifact,
      rules: ["results-return"],
    });
  });

  test("a reused subagent's summary says it built on earlier work", () => {
    expect(simulateResult({ ...base, reused: true }).summary).toBe(
      "Implemented the interface change for dark-mode-toggle-settings, building on its earlier work.",
    );
  });

  test("simulated output is deterministic", () => {
    expect(simulateResult({ ...base, role: "tests", title: "Tests: add a toggle" }).artifact).toBe(
      "toggle.test.ts\n  ok  renders in the default state\n  ok  updates when the control changes\n  ok  restores the saved value on reload\n3 pass, 0 fail",
    );
  });

  test("plan message lists tasks and marks reuse", () => {
    const message = planMessage(plan("Also add a keyboard shortcut", ["ui", "tests"]), 2);
    expect(message.text).toBe(
      [
        "Here is the plan. I don't write code, so each task goes to a subagent.",
        "1. UI: add a keyboard shortcut (reusing the UI subagent)",
        "2. Tests: add a keyboard shortcut (reusing the Tests subagent)",
      ].join("\n"),
    );
  });

  test("failure message differs by retry", () => {
    expect(failureMessage({ ...base, role: "api", attempt: 1 }, true).text).toBe(
      "API failed on attempt 1. I'll re-dispatch it.",
    );
  });

  test("summary lists each task's result", () => {
    const done = { ...base, result: simulateResult(base) };
    expect(summaryMessage(1, [done]).text).toBe(
      "All 1 tasks are done. Everything is in this thread.\nUI: Implemented the interface change for dark-mode-toggle-settings.",
    );
  });

  test("slug and log helpers", () => {
    expect(slugOf("UI: add a keyboard shortcut for the toggle")).toBe("keyboard-shortcut-toggle");
    expect(visibleLog("ui", 0)).toEqual([]);
    expect(visibleLog("tests", 50)).toEqual([
      "Finding the closest existing test file",
      "Writing cases for the happy path",
      "Adding edge cases and a regression case",
    ]);
    expect(visibleLog("docs", 100)).toHaveLength(5);
    expect(durationFor("ui", base.title)).toBe(11);
  });
});
