import type { Run, Step } from "./types";

export type LiveCounts = { toolCalls: number; modelTurns: number; parallelBatches: number };

export function liveCounts(run: Pick<Run, "steps" | "timeline">, progressMs: number): LiveCounts {
  const counts: LiveCounts = { toolCalls: 0, modelTurns: 0, parallelBatches: 0 };
  const startedBatches = new Set<number>();
  for (const event of run.timeline) {
    if (event.startMs >= progressMs) continue;
    if (event.kind === "turn") {
      counts.modelTurns += 1;
      continue;
    }
    counts.toolCalls += 1;
    const step = run.steps[event.stepIndex];
    if (step?.kind === "tools" && step.calls.length > 1) startedBatches.add(event.stepIndex);
  }
  counts.parallelBatches = startedBatches.size;
  return counts;
}

export function lastToolResult(steps: Step[], beforeStepIndex: number): string {
  for (let i = beforeStepIndex - 1; i >= 0; i--) {
    const step = steps[i];
    if (step?.kind === "tools") return step.calls.at(-1)?.result ?? "";
  }
  return "";
}
