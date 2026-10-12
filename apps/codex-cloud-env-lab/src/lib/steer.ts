import type { SteerCommand } from "./types";

const DEFAULT_PLAN = [
  "Read the repository",
  "Sketch the change",
  "Write the implementation",
  "Run the test suite",
  "Publish the result",
] as const;

const TEST_PLAN = [
  "List the existing tests",
  "Add a failing test for the feature",
  "Make the test pass",
  "Publish the test-first result",
] as const;

const APPROACH_B_PLAN = [
  "Drop the first sketch",
  "Design approach B",
  "Implement approach B",
  "Publish the approach B result",
] as const;

export function parseSteer(input: string): SteerCommand | null {
  const text = input.trim().toLowerCase().replace(/\s+/g, " ");
  if (text === "focus on tests" || text === "focus-on-tests") {
    return "focus-on-tests";
  }
  if (text === "stop") {
    return "stop";
  }
  if (text === "continue with approach b" || text === "approach b" || text === "approach-b") {
    return "approach-b";
  }
  return null;
}

export function steerLogLine(command: SteerCommand): string {
  switch (command) {
    case "focus-on-tests":
      return "Phone steer: focus on tests";
    case "stop":
      return "Phone steer: stop";
    case "approach-b":
      return "Phone steer: continue with approach B";
    default: {
      const neverCommand: never = command;
      return neverCommand;
    }
  }
}

export function planLabels(command: SteerCommand | null): readonly string[] {
  switch (command) {
    case null:
    case "stop":
      return DEFAULT_PLAN;
    case "focus-on-tests":
      return TEST_PLAN;
    case "approach-b":
      return APPROACH_B_PLAN;
    default: {
      const neverCommand: never = command;
      return neverCommand;
    }
  }
}
