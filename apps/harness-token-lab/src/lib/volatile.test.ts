import { describe, expect, test } from "bun:test";
import { detectVolatile } from "./volatile";

describe("detectVolatile", () => {
  test("an ISO date and the 'today is' phrase are both date matches", () => {
    expect(detectVolatile("Today is 2026-09-25.")).toEqual([
      { kind: "date", match: "2026-09-25" },
      { kind: "date", match: "Today is" },
    ]);
  });

  test("a month-name date is a date match", () => {
    expect(detectVolatile("Generated on September 25, 2026")).toEqual([
      { kind: "date", match: "September 25, 2026" },
    ]);
  });

  test("a clock time near the word time is a time match", () => {
    expect(detectVolatile("Current time: 14:05 UTC")).toEqual([{ kind: "time", match: "14:05 UTC" }]);
  });

  test("a clock time without a time word is ignored", () => {
    expect(detectVolatile("Ratio 14:05 applies")).toEqual([]);
  });

  test("a bare UUID gives kind uuid", () => {
    expect(detectVolatile("Ticket 8c1f3b2e-5d4a-4c7b-9e2f-1a6d8b3c4e5f")).toEqual([
      { kind: "uuid", match: "8c1f3b2e-5d4a-4c7b-9e2f-1a6d8b3c4e5f" },
    ]);
  });

  test("a labeled request id gives kind id", () => {
    expect(detectVolatile("Request ID: req_7QmZ2kX9pL4vN8tR3sW6yB")).toEqual([
      { kind: "id", match: "Request ID: req_7QmZ2kX9pL4vN8tR3sW6yB" },
    ]);
  });

  test("environment fields give kind env, one per line", () => {
    expect(detectVolatile("OS: Linux\nShell: bash\nWorking directory: /workspace")).toEqual([
      { kind: "env", match: "OS: Linux" },
      { kind: "env", match: "Shell: bash" },
      { kind: "env", match: "Working directory: /workspace" },
    ]);
  });

  test("Branch: main gives repo-state", () => {
    expect(detectVolatile("Branch: main")).toEqual([{ kind: "repo-state", match: "Branch: main" }]);
  });

  test("a labeled user email gives kind user", () => {
    expect(detectVolatile("User: tom@example.com")).toEqual([{ kind: "user", match: "User: tom@example.com" }]);
  });

  test("skill, subagent, and rules lists are flagged", () => {
    expect(detectVolatile("## Available skills\n- a\n## Subagents\n- b\nUser rules loaded: 3")).toEqual([
      { kind: "skills-list", match: "Available skills" },
      { kind: "subagents-list", match: "## Subagents" },
      { kind: "rules-list", match: "User rules" },
    ]);
  });

  test("plain instruction text returns an empty array", () => {
    expect(detectVolatile("Read the file before editing it.")).toEqual([]);
    expect(detectVolatile("Work on the branch the developer gives you and run `git status` before you report.")).toEqual([]);
  });
});
