import type { Metrics, Step, TimelineEvent } from "./types";

export function summarize(steps: Step[], timeline: TimelineEvent[]): Metrics {
  const metrics: Metrics = { toolCalls: 0, modelTurns: 0, parallelBatches: 0, failedCalls: 0, wallMs: 0 };
  for (const step of steps) {
    switch (step.kind) {
      case "turn":
        metrics.modelTurns += 1;
        break;
      case "tools":
        metrics.toolCalls += step.calls.length;
        metrics.failedCalls += step.calls.filter((call) => !call.ok).length;
        if (step.calls.length > 1) metrics.parallelBatches += 1;
        break;
      default: {
        const never: never = step;
        throw new Error(`Unknown step ${JSON.stringify(never)}`);
      }
    }
  }
  metrics.wallMs = Math.max(0, ...timeline.map((event) => event.endMs));
  return metrics;
}

export function speedup(slow: Metrics, fast: Metrics): number {
  if (fast.wallMs <= 0) return 0;
  return Math.round((slow.wallMs / fast.wallMs) * 10) / 10;
}

export function formatClock(ms: number): string {
  const tenths = Math.round(ms / 100);
  if (tenths < 600) return `${(tenths / 10).toFixed(1)}s`;
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
}
