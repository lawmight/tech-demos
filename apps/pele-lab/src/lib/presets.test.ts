import { expect, test } from "bun:test";
import { debounce } from "./debounce.ts";
import {
  DEBOUNCE_MS,
  PRESET_IDS,
  VILLAGE_CONNECTORS,
  VILLAGE_DESKS,
  presetById,
  presets,
  quotedLabels,
} from "./presets.ts";

test("preset registry lists flowchart, sequence, state, and agentflow", () => {
  expect(presets.map((preset) => preset.id)).toEqual([...PRESET_IDS]);
  expect(presets.map((preset) => preset.label)).toEqual([
    "Flowchart",
    "Sequence",
    "State",
    "Village agentflow",
  ]);
  expect(DEBOUNCE_MS).toBeLessThanOrEqual(300);
});

test("agentflow names the village desks and two connectors", () => {
  const source = presetById("agentflow").source;
  expect(source.startsWith("agentflow-beta")).toBe(true);
  const labels = quotedLabels(source);
  expect(labels.length).toBeLessThanOrEqual(12);
  expect(new Set(labels)).toEqual(
    new Set([...VILLAGE_DESKS, ...VILLAGE_CONNECTORS]),
  );
  expect(source).not.toMatch(/sk-|api[_-]?key|secret|token/i);
});

test("debounce runs once after the wait", async () => {
  let calls = 0;
  const run = debounce(20, () => {
    calls += 1;
  });
  run();
  run();
  expect(calls).toBe(0);
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(calls).toBe(1);
});
