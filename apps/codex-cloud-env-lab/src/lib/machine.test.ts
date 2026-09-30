import { expect, test } from "bun:test";
import { reduceTask, startTask, taskSeed, taskStatusLabel } from "./machine";
import { sampleEnvironment } from "./sample";
import type { CloudTask, EnvironmentRecipe } from "./types";

const SUMMARY =
  "Done: Implement feature X in Codex demo workspace. The cloud task finished the default plan. Dependencies came from the saved recipe.";

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

test("start records the saved environment and a stable seed", () => {
  const task = sampleTask();
  expect(taskSeed("env-sample", "Implement feature X")).toBe(3940832929);
  expect(task.environmentId).toBe("env-sample");
  expect(task.environmentName).toBe("Codex demo workspace");
  expect(task.seed).toBe(3940832929);
  expect(task.laptop).toBe("open");
  expect(task.phase).toEqual({ kind: "booting", index: 0 });
  expect(task.log).toEqual(["Boot 1/4: Pulling recipe Codex demo workspace"]);
  expect(taskStatusLabel(task)).toBe("Booting environment");
});

test("a second environment boots under its own name", () => {
  const second: EnvironmentRecipe = {
    ...sampleEnvironment(),
    id: "env-2",
    name: "Fast bun workspace",
    dependencies: ["bun@1.2.0"],
  };
  const task = startTask({
    id: "task-2",
    environment: second,
    title: "Implement feature X",
  });
  expect(task.environmentId).toBe("env-2");
  expect(task.seed).toBe(1462562769);
  expect(task.log[0]).toBe("Boot 1/4: Pulling recipe Fast bun workspace");
  const installing = ticks(task, 1);
  expect(installing.log.at(-1)).toBe("Boot 2/4: Installing dependencies: bun@1.2.0");
});

test("closing the laptop does not stop the cloud task", () => {
  let task = reduceTask(sampleTask(), { type: "close-laptop" });
  expect(task.laptop).toBe("closed");
  expect(task.phase).toEqual({ kind: "booting", index: 0 });
  expect(task.log.at(-1)).toBe("Laptop closed. The cloud task keeps running.");
  expect(reduceTask(task, { type: "close-laptop" })).toEqual(task);

  let guard = 0;
  while (task.phase.kind !== "done") {
    task = reduceTask(task, { type: "tick" });
    guard += 1;
    if (guard > 20) {
      throw new Error("cloud task did not finish");
    }
  }

  expect(task.laptop).toBe("closed");
  expect(task.phase).toEqual({ kind: "done", summary: SUMMARY });
  expect(task.log).toContain("Boot 2/4: Installing dependencies: bun@1.2.0, typescript@5.6.3");
  expect(task.log).toContain("Boot 3/4: Running setup script");
  expect(task.log).toContain("Boot 4/4: Environment ready");
  expect(task.log).toContain("Queued: Implement feature X");
  expect(task.log).toContain("Work: Read the repository");
  expect(task.log).toContain("Work: Publish the result");
  expect(task.log.at(-1)).toBe(SUMMARY);
  expect(taskStatusLabel(task)).toBe("Done");
  expect(reduceTask(task, { type: "tick" })).toEqual(task);
});

test("opening the laptop returns to the same phase", () => {
  const closed = ticks(reduceTask(sampleTask(), { type: "close-laptop" }), 1);
  expect(closed.phase).toEqual({ kind: "booting", index: 1 });
  const opened = reduceTask(closed, { type: "open-laptop" });
  expect(opened.laptop).toBe("open");
  expect(opened.phase).toEqual({ kind: "booting", index: 1 });
  expect(opened.log.at(-1)).toBe("Laptop open. Same cloud task.");
  expect(reduceTask(opened, { type: "open-laptop" })).toEqual(opened);
});

test("queued then running labels follow the boot", () => {
  const queued = ticks(sampleTask(), 4);
  expect(queued.phase.kind).toBe("running");
  expect(taskStatusLabel(queued)).toBe("Queued");
  const running = ticks(queued, 1);
  expect(running.log.at(-1)).toBe("Work: Read the repository");
  expect(taskStatusLabel(running)).toBe("Running");
});
