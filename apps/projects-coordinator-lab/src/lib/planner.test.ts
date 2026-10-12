import { describe, expect, test } from "bun:test";
import { isCodeRequest, plan, subjectOf } from "./planner";
import { SAMPLE_CODE_REQUEST, SAMPLE_FOLLOWUP, SAMPLE_GOAL } from "./sample";

describe("planner", () => {
  test("sample goal becomes UI, API and Tests tasks on new subagents", () => {
    expect(plan(SAMPLE_GOAL, [])).toEqual({
      declined: false,
      tasks: [
        { role: "ui", title: "UI: add a dark-mode toggle to the settings page", reuse: false },
        { role: "api", title: "State and persistence: add a dark-mode toggle to the settings page", reuse: false },
        { role: "tests", title: "Tests: add a dark-mode toggle to the settings page", reuse: false },
      ],
      rules: ["one-thread"],
    });
  });

  test("follow-up routes to existing UI and Tests subagents and adds no new one", () => {
    expect(plan(SAMPLE_FOLLOWUP, ["ui", "api", "tests"])).toEqual({
      declined: false,
      tasks: [
        { role: "ui", title: "UI: add a keyboard shortcut for the toggle", reuse: true },
        { role: "tests", title: "Tests: add a keyboard shortcut for the toggle", reuse: true },
      ],
      rules: ["reuse"],
    });
  });

  test("a follow-up that fits no existing role spins up only that role", () => {
    const result = plan("Update the docs", ["ui", "api", "tests"]);
    expect(result.tasks).toEqual([{ role: "docs", title: "Docs: update the docs", reuse: false }]);
  });

  test("a direct code request is declined and still delegated", () => {
    expect(plan(SAMPLE_CODE_REQUEST, ["ui", "api", "tests"])).toEqual({
      declined: true,
      tasks: [
        { role: "ui", title: "UI: write the code for the toggle component yourself", reuse: true },
        { role: "tests", title: "Tests: write the code for the toggle component yourself", reuse: true },
      ],
      rules: ["no-code", "reuse"],
    });
  });

  test("a keyword-free goal gets at least two tasks", () => {
    expect(plan("Ship the thing", []).tasks.map((t) => t.role)).toEqual(["api", "tests"]);
  });

  test("a single-keyword initial goal is padded to two tasks", () => {
    expect(plan("Add tests", []).tasks.map((t) => t.role)).toEqual(["api", "tests"]);
  });

  test("code-request detection", () => {
    expect(isCodeRequest("Write a function that sorts users")).toBe(true);
    expect(isCodeRequest("Please implement it yourself")).toBe(true);
    expect(isCodeRequest("Add a dark-mode toggle")).toBe(false);
  });

  test("subject drops filler, trailing tests clause and punctuation", () => {
    expect(subjectOf("Please Add a Login page with tests!")).toBe("add a Login page");
    expect(subjectOf("x".repeat(80))).toBe(`${"x".repeat(63)}…`);
  });
});
