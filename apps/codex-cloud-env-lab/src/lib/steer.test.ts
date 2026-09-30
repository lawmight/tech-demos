import { expect, test } from "bun:test";
import { reduceTask, startTask } from "./machine";
import { parseSteer } from "./steer";
import { sampleEnvironment } from "./sample";
import type { CloudTask } from "./types";

const TEST_SUMMARY =
  "Done: Implement feature X in Codex demo workspace. The phone steer focused the rest of the run on tests. Dependencies came from the saved recipe.";

const APPROACH_SUMMARY =
  "Done: Implement feature X in Codex demo workspace. The phone steer switched the rest of the run to approach B. Dependencies came from the saved recipe.";

const STOPPED_SUMMARY =
  "Stopped: Implement feature X in Codex demo workspace. The phone steer halted the cloud task. Dependencies came from the saved recipe.";

function sampleTask(): CloudTask {
  return startTask({
    id: "task-1",
    environment: sampleEnvironment(),
    title: "Implement feature X",
  });
}

function ticks(task: CloudTask, count: number): CloudTask {
  let current = task;
  for (let i = 0; i < count; i += 1) {
    current = reduceTask(current, { type: "tick" });
  }
  return current;
}

test("parseSteer accepts the phone commands and rejects unknown text", () => {
  expect(parseSteer("focus on tests")).toBe("focus-on-tests");
  expect(parseSteer("  STOP ")).toBe("stop");
  expect(parseSteer("continue with approach B")).toBe("approach-b");
  expect(parseSteer("approach b")).toBe("approach-b");
  expect(parseSteer("ship it")).toBeNull();
});

test("focus on tests replaces the remaining steps and the summary", () => {
  const afterFirstStep = ticks(sampleTask(), 5);
  expect(afterFirstStep.log.at(-1)).toBe("Step 1/5: Read the repository");

  const steered = reduceTask(afterFirstStep, { type: "steer", command: "focus-on-tests" });
  expect(steered.phase).toEqual({
    kind: "running",
    index: 1,
    steer: "focus-on-tests",
    plan: [
      { label: "Read the repository" },
      { label: "List the existing tests" },
      { label: "Add a failing test for the feature" },
      { label: "Make the test pass" },
      { label: "Publish the test-first result" },
    ],
  });
  expect(steered.log.at(-1)).toBe("Phone steer: focus on tests");
  expect(reduceTask(steered, { type: "steer", command: "focus-on-tests" })).toEqual(steered);

  const next = reduceTask(steered, { type: "tick" });
  expect(next.log.at(-1)).toBe("Step 2/5: List the existing tests");

  let done = next;
  let guard = 0;
  while (done.phase.kind !== "done") {
    done = reduceTask(done, { type: "tick" });
    guard += 1;
    if (guard > 10) {
      throw new Error("steered task did not finish");
    }
  }
  expect(done.phase).toEqual({ kind: "done", summary: TEST_SUMMARY });
  expect(done.log).toContain("Step 5/5: Publish the test-first result");
  expect(done.log).not.toContain("Step 2/5: Sketch the change");
});

test("a steer during boot changes the plan that runs after the laptop closes", () => {
  let task = reduceTask(sampleTask(), { type: "close-laptop" });
  task = reduceTask(task, { type: "steer", command: "approach-b" });
  expect(task.laptop).toBe("closed");
  expect(task.pendingSteer).toBe("approach-b");
  expect(task.phase).toEqual({ kind: "booting", index: 0 });
  expect(reduceTask(task, { type: "steer", command: "approach-b" })).toEqual(task);

  const queued = ticks(task, 4);
  expect(queued.laptop).toBe("closed");
  expect(queued.pendingSteer).toBeNull();
  expect(queued.phase).toEqual({
    kind: "running",
    index: 0,
    steer: "approach-b",
    plan: [
      { label: "Drop the first sketch" },
      { label: "Design approach B" },
      { label: "Implement approach B" },
      { label: "Publish the approach B result" },
    ],
  });

  const firstStep = reduceTask(queued, { type: "tick" });
  expect(firstStep.log.at(-1)).toBe("Step 1/4: Drop the first sketch");

  let done = firstStep;
  let guard = 0;
  while (done.phase.kind !== "done") {
    done = reduceTask(done, { type: "tick" });
    guard += 1;
    if (guard > 10) {
      throw new Error("approach B did not finish");
    }
  }
  expect(done.laptop).toBe("closed");
  expect(done.phase).toEqual({ kind: "done", summary: APPROACH_SUMMARY });
});

test("stop halts a closed laptop and ignores later ticks", () => {
  const closed = reduceTask(sampleTask(), { type: "close-laptop" });
  const stopped = reduceTask(closed, { type: "steer", command: "stop" });
  expect(stopped.laptop).toBe("closed");
  expect(stopped.phase).toEqual({ kind: "stopped", summary: STOPPED_SUMMARY });
  expect(stopped.log.at(-1)).toBe(STOPPED_SUMMARY);
  expect(reduceTask(stopped, { type: "tick" })).toEqual(stopped);
  expect(reduceTask(stopped, { type: "steer", command: "focus-on-tests" })).toEqual(stopped);
});
