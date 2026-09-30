import { expect, test } from "bun:test";
import { reduceTask, startTask } from "./machine";
import { clearState, loadState, parseState, saveState, type StorageLike } from "./persist";
import { sampleEnvironment } from "./sample";

function memoryStorage(): StorageLike {
  const items = new Map<string, string>();
  return {
    getItem(key) {
      return items.get(key) ?? null;
    },
    setItem(key, value) {
      items.set(key, value);
    },
    removeItem(key) {
      items.delete(key);
    },
  };
}

test("a closed in-progress task reloads from storage", () => {
  const storage = memoryStorage();
  let task = startTask({
    id: "task-1",
    environment: sampleEnvironment(),
    title: "Implement feature X",
  });
  task = reduceTask(task, { type: "close-laptop" });
  task = reduceTask(task, { type: "tick" });
  const state = { environments: [sampleEnvironment()], task };
  saveState(storage, state);
  expect(loadState(storage)).toEqual(state);
  expect(loadState(storage)?.task?.laptop).toBe("closed");
  expect(loadState(storage)?.task?.phase).toEqual({ kind: "booting", index: 1 });
});

test("corrupt storage and reset yield no state", () => {
  const storage = memoryStorage();
  expect(parseState(null)).toBeNull();
  expect(parseState("nope")).toBeNull();
  expect(parseState('{"environments":[{}],"task":null}')).toBeNull();
  saveState(storage, { environments: [sampleEnvironment()], task: null });
  clearState(storage);
  expect(loadState(storage)).toBeNull();
});
